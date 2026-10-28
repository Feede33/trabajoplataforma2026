-- Tabla para almacenar mensajes de contacto recibidos desde /contacto
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  destinatario TEXT NOT NULL DEFAULT 'postulauysoporte@gmail.com',
  estado TEXT NOT NULL DEFAULT 'recibido',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Permitir inserción anónima o autenticada
CREATE POLICY "Permitir insercion de mensajes de contacto"
  ON public.contact_messages
  FOR INSERT
  WITH CHECK (true);

-- Permitir lectura únicamente a admins y service role
CREATE POLICY "Permitir lectura a service_role y admins"
  ON public.contact_messages
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.is_admin = true OR profiles.role = 'admin')
    )
  );
