-- ==============================================================================
-- Migration 006: Corregir políticas de DELETE para usar is_admin dinámico
-- En vez del email hardcodeado, consultar la columna is_admin de profiles
-- ==============================================================================

-- ── informal_jobs ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin delete for informal jobs" ON public.informal_jobs;

CREATE POLICY "Admin delete for informal jobs"
    ON public.informal_jobs FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND is_admin = true
        )
    );

-- ── jobs ───────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Empresa or admin can delete jobs" ON public.jobs;
DROP POLICY IF EXISTS "Empresa can delete own jobs" ON public.jobs;

CREATE POLICY "Empresa or admin can delete jobs"
    ON public.jobs FOR DELETE
    TO authenticated
    USING (
        auth.uid() = empresa_id
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND is_admin = true
        )
    );
