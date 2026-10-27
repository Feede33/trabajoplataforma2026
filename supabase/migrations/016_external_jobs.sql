-- ==============================================================================
-- Migration 016: Support external aggregated jobs in jobs table
-- ==============================================================================

-- Permitir que empresa_id sea NULL si es una oferta externa agregada
ALTER TABLE public.jobs ALTER COLUMN empresa_id DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'es_externo') THEN
        ALTER TABLE public.jobs ADD COLUMN es_externo BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'url_postulacion_externa') THEN
        ALTER TABLE public.jobs ADD COLUMN url_postulacion_externa TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'empresa_nombre') THEN
        ALTER TABLE public.jobs ADD COLUMN empresa_nombre TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'empresa_logo') THEN
        ALTER TABLE public.jobs ADD COLUMN empresa_logo TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'fuente') THEN
        ALTER TABLE public.jobs ADD COLUMN fuente TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_jobs_es_externo ON public.jobs(es_externo);
