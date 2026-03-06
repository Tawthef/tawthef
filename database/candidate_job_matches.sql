-- =====================================================
-- SMART JOB RECOMMENDATIONS (Candidate)
-- =====================================================
-- Run in Supabase SQL Editor

DROP VIEW IF EXISTS public.candidate_job_matches;
CREATE VIEW public.candidate_job_matches AS
WITH base AS (
  SELECT
    cp.candidate_id,
    j.id AS job_id,
    COALESCE(cp.skills, '{}'::text[]) AS candidate_skills,
    COALESCE(j.skills, '{}'::text[]) AS job_keywords
  FROM public.candidate_profiles cp
  JOIN public.jobs j ON j.status = 'open'
),
calc AS (
  SELECT
    b.candidate_id,
    b.job_id,
    b.job_keywords,
    ARRAY(
      SELECT LOWER(skill)
      FROM unnest(b.job_keywords) skill
      INTERSECT
      SELECT LOWER(skill)
      FROM unnest(b.candidate_skills) skill
    ) AS matched_skills,
    ARRAY(
      SELECT LOWER(skill)
      FROM unnest(b.job_keywords) skill
      EXCEPT
      SELECT LOWER(skill)
      FROM unnest(b.candidate_skills) skill
    ) AS missing_skills
  FROM base b
)
SELECT
  c.candidate_id,
  c.job_id,
  CASE
    WHEN COALESCE(array_length(c.job_keywords, 1), 0) = 0 THEN 0::numeric
    ELSE ROUND(
      (COALESCE(array_length(c.matched_skills, 1), 0)::numeric / array_length(c.job_keywords, 1)::numeric) * 100,
      2
    )
  END AS match_score,
  COALESCE(c.matched_skills, '{}'::text[]) AS matched_skills,
  COALESCE(c.missing_skills, '{}'::text[]) AS missing_skills
FROM calc c;

DROP FUNCTION IF EXISTS public.get_candidate_job_matches(UUID);
CREATE OR REPLACE FUNCTION public.get_candidate_job_matches(p_candidate_id UUID)
RETURNS TABLE (
  job_id UUID,
  title TEXT,
  organization_name TEXT,
  match_score NUMERIC,
  matched_skills TEXT[],
  missing_skills TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF auth.uid() <> p_candidate_id AND NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN QUERY
  SELECT
    m.job_id,
    j.title,
    COALESCE(o.name, 'Unknown Company') AS organization_name,
    m.match_score,
    m.matched_skills,
    m.missing_skills
  FROM public.candidate_job_matches m
  JOIN public.jobs j ON j.id = m.job_id
  LEFT JOIN public.organizations o ON o.id = j.organization_id
  WHERE m.candidate_id = p_candidate_id
    AND j.status = 'open'
  ORDER BY m.match_score DESC, j.created_at DESC
  LIMIT 10;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_candidate_job_matches(UUID) TO authenticated;
