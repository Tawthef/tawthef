-- =====================================================
-- CANDIDATE RESUMES (AI CV BUILDER)
-- =====================================================
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.candidate_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT,
  skills TEXT[] DEFAULT '{}',
  experience_json JSONB DEFAULT '[]'::jsonb,
  education_json JSONB DEFAULT '[]'::jsonb,
  projects_json JSONB DEFAULT '[]'::jsonb,
  certifications_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_resumes_candidate_id
  ON public.candidate_resumes(candidate_id);

ALTER TABLE public.candidate_resumes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Candidates manage own resumes" ON public.candidate_resumes;
CREATE POLICY "Candidates manage own resumes"
  ON public.candidate_resumes
  FOR ALL
  USING (auth.uid() = candidate_id)
  WITH CHECK (auth.uid() = candidate_id);

DROP POLICY IF EXISTS "Admins view all resumes" ON public.candidate_resumes;
CREATE POLICY "Admins view all resumes"
  ON public.candidate_resumes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION public.set_candidate_resumes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_candidate_resumes_updated_at ON public.candidate_resumes;
CREATE TRIGGER trg_candidate_resumes_updated_at
BEFORE UPDATE ON public.candidate_resumes
FOR EACH ROW
EXECUTE FUNCTION public.set_candidate_resumes_updated_at();
