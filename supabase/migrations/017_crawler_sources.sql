-- ==============================================================================
-- Migration 017: Fuentes de monitoreo continuo para el Deep Crawler
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.crawler_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    empresa_hint TEXT,
    rubro_default TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    max_jobs_per_run INTEGER NOT NULL DEFAULT 8,
    ultima_ejecucion TIMESTAMPTZ,
    total_publicadas INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.crawler_sources ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública
DROP POLICY IF EXISTS "Crawler sources viewable by everyone" ON public.crawler_sources;
CREATE POLICY "Crawler sources viewable by everyone"
    ON public.crawler_sources FOR SELECT USING (true);

-- Política de modificación para administradores (o service_role)
DROP POLICY IF EXISTS "Admins can manage crawler sources" ON public.crawler_sources;
CREATE POLICY "Admins can manage crawler sources"
    ON public.crawler_sources FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
    );
