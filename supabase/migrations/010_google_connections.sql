-- Conexión de Gmail por usuario (envío de postulaciones por correo desde el chat de IA).
-- El refresh token se guarda cifrado desde el servidor. Sin políticas RLS: solo accede el service role.
create table if not exists public.google_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  refresh_token_enc text not null,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_connections enable row level security;
-- (intencionalmente sin policies: ni el cliente anon ni usuarios autenticados pueden leer los tokens)
