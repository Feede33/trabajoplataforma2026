-- ==============================================================================
-- Schema Initialization for Next.js 14 + Supabase Job Board Platform
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('empresa', 'candidato')),
    nombre TEXT,
    email TEXT,
    avatar_url TEXT,
    bio TEXT,
    ubicacion TEXT,
    cv_url TEXT,
    website TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. JOBS TABLE
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    rubro TEXT NOT NULL,
    zona TEXT NOT NULL,
    modalidad TEXT NOT NULL CHECK (modalidad IN ('presencial', 'remoto', 'hibrido')),
    tipo_contrato TEXT NOT NULL CHECK (tipo_contrato IN ('full-time', 'part-time', 'freelance', 'pasantia')),
    salario_rango TEXT,
    estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'cerrado', 'borrador')),
    slug TEXT NOT NULL UNIQUE,
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    candidato_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mensaje TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'visto', 'entrevista', 'rechazado')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_job_candidato UNIQUE (job_id, candidato_id)
);

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_jobs_empresa_id ON public.jobs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_jobs_estado ON public.jobs(estado);
CREATE INDEX IF NOT EXISTS idx_jobs_rubro ON public.jobs(rubro);
CREATE INDEX IF NOT EXISTS idx_jobs_zona ON public.jobs(zona);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidato_id ON public.applications(candidato_id);

-- 6. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
    ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Jobs Policies
DROP POLICY IF EXISTS "Activo jobs are viewable by everyone, and empresa view own" ON public.jobs;
CREATE POLICY "Activo jobs are viewable by everyone, and empresa view own"
    ON public.jobs FOR SELECT USING (estado = 'activo' OR auth.uid() = empresa_id);

DROP POLICY IF EXISTS "Empresa can insert own jobs" ON public.jobs;
CREATE POLICY "Empresa can insert own jobs"
    ON public.jobs FOR INSERT WITH CHECK (auth.uid() = empresa_id);

DROP POLICY IF EXISTS "Empresa can update own jobs" ON public.jobs;
CREATE POLICY "Empresa can update own jobs"
    ON public.jobs FOR UPDATE USING (auth.uid() = empresa_id) WITH CHECK (auth.uid() = empresa_id);

DROP POLICY IF EXISTS "Empresa can delete own jobs" ON public.jobs;
CREATE POLICY "Empresa can delete own jobs"
    ON public.jobs FOR DELETE USING (auth.uid() = empresa_id);

-- Applications Policies
DROP POLICY IF EXISTS "Candidatos can view own applications" ON public.applications;
CREATE POLICY "Candidatos can view own applications"
    ON public.applications FOR SELECT USING (auth.uid() = candidato_id);

DROP POLICY IF EXISTS "Candidatos can insert own applications" ON public.applications;
CREATE POLICY "Candidatos can insert own applications"
    ON public.applications FOR INSERT WITH CHECK (auth.uid() = candidato_id);

DROP POLICY IF EXISTS "Empresas can view applications for their jobs" ON public.applications;
CREATE POLICY "Empresas can view applications for their jobs"
    ON public.applications FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE public.jobs.id = public.applications.job_id
              AND public.jobs.empresa_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Empresas can update applications for their jobs" ON public.applications;
CREATE POLICY "Empresas can update applications for their jobs"
    ON public.applications FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE public.jobs.id = public.applications.job_id
              AND public.jobs.empresa_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE public.jobs.id = public.applications.job_id
              AND public.jobs.empresa_id = auth.uid()
        )
    );

-- 7. FUNCTIONS & TRIGGERS
-- Trigger to auto-create profile on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, nombre, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'candidato')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_new_user();

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS set_jobs_updated_at ON public.jobs;
CREATE TRIGGER set_jobs_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();
