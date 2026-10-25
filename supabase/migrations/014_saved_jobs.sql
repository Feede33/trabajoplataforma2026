-- Migration 014: Saved Jobs (Bookmarks) for Candidates
-- Allows candidates to bookmark/save jobs to review or apply later

CREATE TABLE IF NOT EXISTS public.saved_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    candidato_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_saved_job_candidato UNIQUE (job_id, candidato_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_jobs_candidato_id ON public.saved_jobs(candidato_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job_id ON public.saved_jobs(job_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

-- Candidatos can view their own saved jobs
DROP POLICY IF EXISTS "Candidatos can view own saved jobs" ON public.saved_jobs;
CREATE POLICY "Candidatos can view own saved jobs"
    ON public.saved_jobs FOR SELECT USING (auth.uid() = candidato_id);

-- Candidatos can insert their own saved jobs
DROP POLICY IF EXISTS "Candidatos can insert own saved jobs" ON public.saved_jobs;
CREATE POLICY "Candidatos can insert own saved jobs"
    ON public.saved_jobs FOR INSERT WITH CHECK (auth.uid() = candidato_id);

-- Candidatos can delete their own saved jobs
DROP POLICY IF EXISTS "Candidatos can delete own saved jobs" ON public.saved_jobs;
CREATE POLICY "Candidatos can delete own saved jobs"
    ON public.saved_jobs FOR DELETE USING (auth.uid() = candidato_id);
