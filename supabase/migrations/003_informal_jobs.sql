-- ==============================================================================
-- Migration 003: Empleos Informales / Avisos Directos de WhatsApp
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.informal_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    cargo TEXT NOT NULL,
    rubro TEXT NOT NULL DEFAULT 'Comercio y Gastronomía',
    zona TEXT NOT NULL,
    horario TEXT,
    descripcion TEXT NOT NULL,
    contacto_whatsapp TEXT NOT NULL,
    contacto_indicaciones TEXT,
    salario TEXT,
    raw_text TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_informal_jobs_activo ON public.informal_jobs(activo);
CREATE INDEX IF NOT EXISTS idx_informal_jobs_zona ON public.informal_jobs(zona);
CREATE INDEX IF NOT EXISTS idx_informal_jobs_rubro ON public.informal_jobs(rubro);
CREATE INDEX IF NOT EXISTS idx_informal_jobs_created_at ON public.informal_jobs(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.informal_jobs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS:
-- 1. Lectura pública para cualquier visitante
DROP POLICY IF EXISTS "Informal jobs are viewable by everyone" ON public.informal_jobs;
CREATE POLICY "Informal jobs are viewable by everyone"
    ON public.informal_jobs FOR SELECT
    USING (activo = true);

-- 2. Inserción permitida (para el publicador IA o formularios)
DROP POLICY IF EXISTS "Enable insert for informal jobs" ON public.informal_jobs;
CREATE POLICY "Enable insert for informal jobs"
    ON public.informal_jobs FOR INSERT
    WITH CHECK (true);

-- 3. Actualización para administradores o creadores
DROP POLICY IF EXISTS "Enable update for informal jobs" ON public.informal_jobs;
CREATE POLICY "Enable update for informal jobs"
    ON public.informal_jobs FOR UPDATE
    USING (true);
