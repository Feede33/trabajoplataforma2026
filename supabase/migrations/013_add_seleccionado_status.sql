-- Migration 013: Add 'seleccionado' status to applications check constraint
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_estado_check;
ALTER TABLE public.applications ADD CONSTRAINT applications_estado_check 
  CHECK (estado IN ('pendiente', 'visto', 'entrevista', 'seleccionado', 'rechazado'));
