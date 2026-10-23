-- ==============================================================================
-- Migration 007: Suscripciones, créditos de IA, órdenes de pago y límites
-- Requiere haber ejecutado antes las migraciones 005 y 006.
-- ==============================================================================

-- ── 0. Asegurar columna is_admin y corregir función is_admin() ────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 1. Cerrar escritura abierta en informal_jobs ───────────────────────────────
-- Antes cualquiera (incluso sin sesión) podía insertar o modificar avisos.
-- Ahora solo el servidor (service role) escribe, tras verificar admin o créditos.
DROP POLICY IF EXISTS "Enable insert for informal jobs" ON public.informal_jobs;
DROP POLICY IF EXISTS "Enable update for informal jobs" ON public.informal_jobs;

-- ── 2. Tablas ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
    user_id            UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan               TEXT NOT NULL CHECK (plan IN ('mensual', 'anual')),
    avisos_mes_limite  INT  NOT NULL CHECK (avisos_mes_limite > 0),
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_credits (
    user_id    UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance    INT  NOT NULL DEFAULT 0 CHECK (balance >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product           TEXT NOT NULL,
    kind              TEXT NOT NULL CHECK (kind IN ('plan', 'credits')),
    amount_uyu        NUMERIC(10,2) NOT NULL CHECK (amount_uyu > 0),   -- total cobrado, con IVA
    dias              INT,
    avisos_mes_limite INT,
    creditos          INT,
    status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    mp_payment_id     TEXT UNIQUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    paid_at           TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);

-- Contador de avisos CREADOS por mes (borrar un aviso no devuelve el cupo)
CREATE TABLE IF NOT EXISTS public.job_usage (
    user_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    periodo  DATE NOT NULL,
    creados  INT  NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, periodo)
);

-- ── 3. RLS: cada usuario solo LEE lo suyo; nadie escribe desde el navegador ───
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credits    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_usage     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own subscription" ON public.subscriptions;
CREATE POLICY "Read own subscription" ON public.subscriptions
    FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Read own credits" ON public.ai_credits;
CREATE POLICY "Read own credits" ON public.ai_credits
    FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Read own orders" ON public.orders;
CREATE POLICY "Read own orders" ON public.orders
    FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Read own usage" ON public.job_usage;
CREATE POLICY "Read own usage" ON public.job_usage
    FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- Sin políticas de INSERT/UPDATE/DELETE: solo el servidor (service role) escribe.

-- ── 4. Límite mensual de avisos formales (se aplica en la base de datos) ──────
-- Plan gratis: 2 avisos por mes. Con suscripción vigente: el límite de su plan.
-- Admin: sin límite. Solo cuentas 'empresa' pueden publicar avisos formales.
CREATE OR REPLACE FUNCTION public.enforce_job_quota()
RETURNS TRIGGER AS $$
DECLARE
    v_uid     UUID := auth.uid();
    v_role    TEXT;
    v_admin   BOOLEAN;
    v_limit   INT;
    v_periodo DATE := (date_trunc('month', now() AT TIME ZONE 'America/Montevideo'))::date;
    v_used    INT;
BEGIN
    -- Inserciones desde el servidor o el SQL Editor (sin usuario) no se limitan
    IF v_uid IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT role, COALESCE(is_admin, false) INTO v_role, v_admin
    FROM public.profiles WHERE id = v_uid;

    IF v_admin THEN
        RETURN NEW;
    END IF;

    IF v_role IS DISTINCT FROM 'empresa' THEN
        RAISE EXCEPTION 'ROLE_NOT_ALLOWED: solo las cuentas de empresa pueden publicar empleos';
    END IF;

    SELECT avisos_mes_limite INTO v_limit
    FROM public.subscriptions
    WHERE user_id = v_uid AND current_period_end > now();

    IF v_limit IS NULL THEN
        v_limit := 2; -- Plan gratuito (debe coincidir con FREE_AVISOS_MES en lib/billing.ts)
    END IF;

    INSERT INTO public.job_usage (user_id, periodo, creados)
    VALUES (v_uid, v_periodo, 1)
    ON CONFLICT (user_id, periodo)
    DO UPDATE SET creados = public.job_usage.creados + 1
    RETURNING creados INTO v_used;

    IF v_used > v_limit THEN
        -- Esta excepción revierte también el incremento del contador
        RAISE EXCEPTION 'QUOTA_EXCEEDED: alcanzaste el límite de % avisos de este mes', v_limit;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_enforce_job_quota ON public.jobs;
CREATE TRIGGER trg_enforce_job_quota
    BEFORE INSERT ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_job_quota();

-- ── 5. Acreditar una orden pagada (atómico e idempotente) ─────────────────────
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
            -- Si renueva antes de vencer, los días se suman al período vigente
            current_period_end = GREATEST(public.subscriptions.current_period_end, now()) + make_interval(days => o.dias),
            updated_at = now();
    ELSE
        INSERT INTO public.ai_credits (user_id, balance)
        VALUES (o.user_id, o.creditos)
        ON CONFLICT (user_id) DO UPDATE SET
            balance = public.ai_credits.balance + o.creditos,
            updated_at = now();
    END IF;

    RETURN 'ok';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 6. Consumir / devolver un crédito de IA ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.consume_ai_credit(p_user UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.ai_credits SET balance = balance - 1, updated_at = now() WHERE user_id = p_user AND balance > 0;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.refund_ai_credit(p_user UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.ai_credits SET balance = balance + 1, updated_at = now() WHERE user_id = p_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Estas funciones solo las puede ejecutar el servidor, nunca un usuario desde el navegador
REVOKE ALL ON FUNCTION public.fulfill_order(UUID, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_ai_credit(UUID)            FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_ai_credit(UUID)             FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_order(UUID, TEXT, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_ai_credit(UUID)            TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_ai_credit(UUID)             TO service_role;
