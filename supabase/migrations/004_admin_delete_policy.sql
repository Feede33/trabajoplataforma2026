-- ==============================================================================
-- Migration 004: Políticas de Eliminación Seguras para Administración
-- ==============================================================================

-- Eliminar políticas abiertas inseguras
DROP POLICY IF EXISTS "Enable delete for informal jobs" ON public.informal_jobs;
DROP POLICY IF EXISTS "Admin delete for informal jobs" ON public.informal_jobs;

-- Solo permitir DELETE en informal_jobs si el usuario autenticado es el administrador
CREATE POLICY "Admin delete for informal jobs"
    ON public.informal_jobs FOR DELETE
    TO authenticated
    USING (
        (auth.jwt() ->> 'email') = 'nicodelcerro33@gmail.com'
    );

-- En la tabla jobs: una empresa solo puede borrar sus propios empleos, o el admin cualquiera
DROP POLICY IF EXISTS "Enable delete for all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Empresa can delete own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Empresa or admin can delete jobs" ON public.jobs;

CREATE POLICY "Empresa or admin can delete jobs"
    ON public.jobs FOR DELETE
    TO authenticated
    USING (
        auth.uid() = empresa_id 
        OR (auth.jwt() ->> 'email') = 'nicodelcerro33@gmail.com'
    );
