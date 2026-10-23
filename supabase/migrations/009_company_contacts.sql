-- ==============================================================================
-- Migration 009: Directorio de Contactos Directos de Empresas (WhatsApp)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.company_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'Limpieza',
    zona TEXT,
    nota TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_company_contacts_activo ON public.company_contacts(activo);
CREATE INDEX IF NOT EXISTS idx_company_contacts_categoria ON public.company_contacts(categoria);
CREATE INDEX IF NOT EXISTS idx_company_contacts_whatsapp ON public.company_contacts(whatsapp);
CREATE INDEX IF NOT EXISTS idx_company_contacts_created_at ON public.company_contacts(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.company_contacts ENABLE ROW LEVEL SECURITY;

-- 1. Lectura pública para cualquier visitante
DROP POLICY IF EXISTS "Company contacts are viewable by everyone" ON public.company_contacts;
CREATE POLICY "Company contacts are viewable by everyone"
    ON public.company_contacts FOR SELECT
    USING (activo = true);

-- 2. Inserción permitida
DROP POLICY IF EXISTS "Enable insert for company contacts" ON public.company_contacts;
CREATE POLICY "Enable insert for company contacts"
    ON public.company_contacts FOR INSERT
    WITH CHECK (true);

-- 3. Actualización permitida
DROP POLICY IF EXISTS "Enable update for company contacts" ON public.company_contacts;
CREATE POLICY "Enable update for company contacts"
    ON public.company_contacts FOR UPDATE
    USING (true);

-- 4. Eliminación permitida
DROP POLICY IF EXISTS "Enable delete for company contacts" ON public.company_contacts;
CREATE POLICY "Enable delete for company contacts"
    ON public.company_contacts FOR DELETE
    USING (true);
