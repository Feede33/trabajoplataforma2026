-- Migration 015: Add cv_text to profiles and AI pre-calculated evaluation columns to applications
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cv_text TEXT;

-- Columnas para guardar el análisis y porcentaje de IA pre-calculado por postulación
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS ai_match_score INTEGER;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS ai_badge_label TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS ai_strengths TEXT[];
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS ai_evaluated_at TIMESTAMPTZ;

-- Índice para ordenar postulaciones por puntaje de IA instantáneamente
CREATE INDEX IF NOT EXISTS idx_applications_ai_match_score ON public.applications(job_id, ai_match_score DESC NULLS LAST);
