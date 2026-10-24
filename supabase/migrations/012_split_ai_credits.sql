-- ==============================================================================
-- Migration 012: Separación de créditos de IA entre Publicación de Clasificados y Chat de IA
-- ==============================================================================

-- 1. Agregar columnas específicas para consultas de Claude y ChatGPT en ai_credits
ALTER TABLE public.ai_credits
    ADD COLUMN IF NOT EXISTS balance_claude  INT NOT NULL DEFAULT 0 CHECK (balance_claude >= 0),
    ADD COLUMN IF NOT EXISTS balance_chatgpt INT NOT NULL DEFAULT 0 CHECK (balance_chatgpt >= 0);

-- 2. Funciones para consumir y devolver créditos específicos de Claude y ChatGPT
CREATE OR REPLACE FUNCTION public.consume_claude_credit(p_user UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.ai_credits
    SET balance_claude = balance_claude - 1, updated_at = now()
    WHERE user_id = p_user AND balance_claude > 0;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.refund_claude_credit(p_user UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.ai_credits
    SET balance_claude = balance_claude + 1, updated_at = now()
    WHERE user_id = p_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.consume_chatgpt_credit(p_user UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.ai_credits
    SET balance_chatgpt = balance_chatgpt - 1, updated_at = now()
    WHERE user_id = p_user AND balance_chatgpt > 0;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.refund_chatgpt_credit(p_user UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.ai_credits
    SET balance_chatgpt = balance_chatgpt + 1, updated_at = now()
    WHERE user_id = p_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Permisos para funciones de consumo
REVOKE ALL ON FUNCTION public.consume_claude_credit(UUID)  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_claude_credit(UUID)   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_chatgpt_credit(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_chatgpt_credit(UUID)  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.consume_claude_credit(UUID)  TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_claude_credit(UUID)   TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_chatgpt_credit(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_chatgpt_credit(UUID)  TO service_role;

-- 3. Actualizar fulfill_order para acreditar al saldo correspondiente según el producto comprado
CREATE OR REPLACE FUNCTION public.fulfill_order(p_order UUID, p_payment TEXT, p_amount NUMERIC)
RETURNS TEXT AS $$
DECLARE
    o public.orders%ROWTYPE;
BEGIN
    SELECT * INTO o FROM public.orders WHERE id = p_order FOR UPDATE;

    IF NOT FOUND THEN
        RETURN 'not_found';
    END IF;
    IF o.status = 'paid' THEN
        RETURN 'already_paid';
    END IF;
    IF p_amount < o.amount_uyu THEN
        RETURN 'amount_mismatch';
    END IF;

    UPDATE public.orders SET status = 'paid', mp_payment_id = p_payment, paid_at = now() WHERE id = o.id;

    IF o.kind = 'plan' THEN
        INSERT INTO public.subscriptions (user_id, plan, avisos_mes_limite, current_period_end)
        VALUES (o.user_id, o.product, o.avisos_mes_limite, now() + make_interval(days => o.dias))
        ON CONFLICT (user_id) DO UPDATE SET
            plan = EXCLUDED.plan,
            avisos_mes_limite = EXCLUDED.avisos_mes_limite,
            current_period_end = GREATEST(public.subscriptions.current_period_end, now()) + make_interval(days => o.dias),
            updated_at = now();
    ELSIF o.product = 'candidato_claude' THEN
        INSERT INTO public.ai_credits (user_id, balance, balance_claude, balance_chatgpt)
        VALUES (o.user_id, 0, o.creditos, 0)
        ON CONFLICT (user_id) DO UPDATE SET
            balance_claude = COALESCE(public.ai_credits.balance_claude, 0) + o.creditos,
            updated_at = now();
    ELSIF o.product = 'candidato_chatgpt' THEN
        INSERT INTO public.ai_credits (user_id, balance, balance_claude, balance_chatgpt)
        VALUES (o.user_id, 0, 0, o.creditos)
        ON CONFLICT (user_id) DO UPDATE SET
            balance_chatgpt = COALESCE(public.ai_credits.balance_chatgpt, 0) + o.creditos,
            updated_at = now();
    ELSE
        -- Paquetes de publicación de clasificados (creditos_5, creditos_20)
        INSERT INTO public.ai_credits (user_id, balance, balance_claude, balance_chatgpt)
        VALUES (o.user_id, o.creditos, 0, 0)
        ON CONFLICT (user_id) DO UPDATE SET
            balance = COALESCE(public.ai_credits.balance, 0) + o.creditos,
            updated_at = now();
    END IF;

    RETURN 'ok';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
