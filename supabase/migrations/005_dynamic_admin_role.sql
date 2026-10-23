-- ==============================================================================
-- Migration 005: Rol de Administrador Dinámico en Base de Datos (Supabase)
-- ==============================================================================

-- 1. Agregar columna is_admin a la tabla profiles si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'is_admin'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- 2. Permitir 'admin' en la restricción de roles de profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('empresa', 'candidato', 'admin'));

-- 3. Crear índice para consultas rápidas de administradores
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;

-- 4. Función de seguridad en Postgres para verificar si el usuario autenticado es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() 
          AND (is_admin = true OR role = 'admin' OR email = 'nicodelcerro33@gmail.com')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger de protección: evitar que un usuario regular se autoproclame admin desde la app
CREATE OR REPLACE FUNCTION public.protect_admin_privileges()
RETURNS TRIGGER AS $$
BEGIN
    -- Si intentan cambiar is_admin a true o role a 'admin'
    IF (NEW.is_admin = true AND (OLD.is_admin IS DISTINCT FROM true))
       OR (NEW.role = 'admin' AND (OLD.role IS DISTINCT FROM 'admin')) THEN
        -- Si la llamada viene del cliente web (rol authenticated) y el que ejecuta NO es ya admin
        IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
            NEW.is_admin := OLD.is_admin;
            NEW.role := OLD.role;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_admin_privileges ON public.profiles;
CREATE TRIGGER trg_protect_admin_privileges
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_admin_privileges();

-- 6. Actualizar las Políticas RLS para usar la función dinámica is_admin()
DROP POLICY IF EXISTS "Admin delete for informal jobs" ON public.informal_jobs;
DROP POLICY IF EXISTS "Enable delete for informal jobs" ON public.informal_jobs;

CREATE POLICY "Admin delete for informal jobs"
    ON public.informal_jobs FOR DELETE
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Empresa or admin can delete jobs" ON public.jobs;
DROP POLICY IF EXISTS "Enable delete for all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Empresa can delete own jobs" ON public.jobs;

CREATE POLICY "Empresa or admin can delete jobs"
    ON public.jobs FOR DELETE
    TO authenticated
    USING (
        auth.uid() = empresa_id 
        OR public.is_admin()
    );
