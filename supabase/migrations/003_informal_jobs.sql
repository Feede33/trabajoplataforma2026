-- ==============================================================================
-- Migration 003: Empleos Informales / Avisos Clasificados Directos
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.informal_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    cargo TEXT NOT NULL,
    rubro TEXT NOT NULL DEFAULT 'General',
    zona TEXT, -- Opcional: solo si el aviso la menciona
    horario TEXT, -- Opcional: solo si el aviso lo menciona
    descripcion TEXT NOT NULL,
    whatsapp TEXT, -- Canal WhatsApp
    telefono TEXT, -- Canal Teléfono / Llamada
    email TEXT, -- Canal Correo electrónico
    direccion TEXT, -- Presentarse en dirección física
    contacto_whatsapp TEXT, -- Retrocompatibilidad
    contacto_indicaciones TEXT,
    salario TEXT,
    raw_text TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Si la tabla ya existía, agregar las columnas si faltan
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'informal_jobs' AND column_name = 'whatsapp') THEN
        ALTER TABLE public.informal_jobs ADD COLUMN whatsapp TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'informal_jobs' AND column_name = 'telefono') THEN
        ALTER TABLE public.informal_jobs ADD COLUMN telefono TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'informal_jobs' AND column_name = 'email') THEN
        ALTER TABLE public.informal_jobs ADD COLUMN email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'informal_jobs' AND column_name = 'direccion') THEN
        ALTER TABLE public.informal_jobs ADD COLUMN direccion TEXT;
    END IF;
    -- Asegurar que zona y contacto_whatsapp sean NULLables si se crearon con NOT NULL
    ALTER TABLE public.informal_jobs ALTER COLUMN zona DROP NOT NULL;
    ALTER TABLE public.informal_jobs ALTER COLUMN contacto_whatsapp DROP NOT NULL;
END $$;

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

-- 2. Inserción permitida
DROP POLICY IF EXISTS "Enable insert for informal jobs" ON public.informal_jobs;
CREATE POLICY "Enable insert for informal jobs"
    ON public.informal_jobs FOR INSERT
    WITH CHECK (true);

-- 3. Actualización permitida
DROP POLICY IF EXISTS "Enable update for informal jobs" ON public.informal_jobs;
CREATE POLICY "Enable update for informal jobs"
    ON public.informal_jobs FOR UPDATE
    USING (true);
