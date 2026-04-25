-- =====================================================
-- RESUME SEARCH FEATURE
-- =====================================================
-- Run in Supabase SQL Editor

-- Drop both the old version of this function AND the competing overload from
-- talent_search_schema.sql so only one search_candidates exists in the DB.
DROP FUNCTION IF EXISTS public.search_candidates(TEXT[], TEXT[], INTEGER);
DROP FUNCTION IF EXISTS public.search_candidates(TEXT, TEXT[], TEXT, INTEGER, INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.search_candidates(
  p_skills TEXT[],
  p_keywords TEXT[],
  p_min_experience INTEGER
)
RETURNS TABLE (
  candidate_id UUID,
  full_name TEXT,
  location TEXT,
  skills TEXT[],
  years_experience NUMERIC,
  resume_url TEXT,
  match_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  v_role := public.get_user_role();
  IF v_role NOT IN ('employer', 'agency', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN QUERY
  WITH normalized AS (
    SELECT
      pr.id AS candidate_id,
      pr.full_name,
      cp.location,
      COALESCE(cp.skills, '{}'::TEXT[]) AS profile_skills,
      COALESCE(cp.keywords, '{}'::TEXT[]) AS profile_keywords,
      COALESCE(cp.years_experience, 0) AS profile_years_experience,
      cp.resume_url,
      COALESCE(p_skills, '{}'::TEXT[]) AS search_skills,
      COALESCE(p_keywords, '{}'::TEXT[]) AS search_keywords
    FROM public.profiles pr
    LEFT JOIN public.candidate_profiles cp ON cp.candidate_id = pr.id
    WHERE pr.role = 'candidate'
  ),
  scored AS (
    SELECT
      n.*,
      ARRAY(
        SELECT LOWER(skill)
        FROM unnest(n.profile_skills) skill
        INTERSECT
        SELECT LOWER(skill)
        FROM unnest(n.search_skills) skill
      ) AS matched_skills
    FROM normalized n
  )
  SELECT
    s.candidate_id,
    s.full_name,
    s.location,
    s.profile_skills AS skills,
    s.profile_years_experience AS years_experience,
    s.resume_url,
    CASE
      WHEN COALESCE(array_length(s.search_skills, 1), 0) = 0 THEN 0::NUMERIC
      ELSE ROUND(
        (COALESCE(array_length(s.matched_skills, 1), 0)::NUMERIC / array_length(s.search_skills, 1)::NUMERIC) * 100,
        2
      )
    END AS match_score
  FROM scored s
  WHERE (p_min_experience IS NULL OR s.profile_years_experience >= p_min_experience)
    AND (
      COALESCE(array_length(s.search_keywords, 1), 0) = 0
      OR EXISTS (
        SELECT 1
        FROM unnest(s.profile_keywords) profile_kw
        JOIN unnest(s.search_keywords) search_kw
          ON LOWER(profile_kw) = LOWER(search_kw)
      )
    )
  ORDER BY match_score DESC, s.profile_years_experience DESC, s.full_name ASC
  LIMIT 200;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_candidates(TEXT[], TEXT[], INTEGER) TO authenticated;

DROP FUNCTION IF EXISTS public.invite_candidate_to_job(UUID, UUID);
CREATE OR REPLACE FUNCTION public.invite_candidate_to_job(
  p_candidate_id UUID,
  p_job_id UUID
)
RETURNS TABLE (
  application_id UUID,
  status TEXT,
  created BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_org_id UUID;
  v_has_agency_id BOOLEAN;
  v_has_submitted_by BOOLEAN;
  v_app_id UUID;
  v_app_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  v_role := public.get_user_role();
  v_org_id := public.get_user_org_id();

  IF v_role NOT IN ('employer', 'agency', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = p_job_id
      AND (
        v_role = 'admin'
        OR j.organization_id = v_org_id
      )
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN_JOB';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_candidate_id
      AND p.role = 'candidate'
  ) THEN
    RAISE EXCEPTION 'INVALID_CANDIDATE';
  END IF;

  SELECT a.id, a.status
  INTO v_app_id, v_app_status
  FROM public.applications a
  WHERE a.job_id = p_job_id
    AND a.candidate_id = p_candidate_id
  ORDER BY a.applied_at DESC
  LIMIT 1;

  IF v_app_id IS NOT NULL THEN
    RETURN QUERY SELECT v_app_id, v_app_status, FALSE;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applications'
      AND column_name = 'agency_id'
  ) INTO v_has_agency_id;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applications'
      AND column_name = 'submitted_by'
  ) INTO v_has_submitted_by;

  IF v_has_agency_id AND v_has_submitted_by THEN
    INSERT INTO public.applications (job_id, candidate_id, status, agency_id, submitted_by)
    VALUES (
      p_job_id,
      p_candidate_id,
      'applied',
      CASE WHEN v_role = 'agency' THEN v_org_id ELSE NULL END,
      auth.uid()
    )
    RETURNING id, applications.status INTO v_app_id, v_app_status;
  ELSIF v_has_agency_id THEN
    INSERT INTO public.applications (job_id, candidate_id, status, agency_id)
    VALUES (
      p_job_id,
      p_candidate_id,
      'applied',
      CASE WHEN v_role = 'agency' THEN v_org_id ELSE NULL END
    )
    RETURNING id, applications.status INTO v_app_id, v_app_status;
  ELSIF v_has_submitted_by THEN
    INSERT INTO public.applications (job_id, candidate_id, status, submitted_by)
    VALUES (
      p_job_id,
      p_candidate_id,
      'applied',
      auth.uid()
    )
    RETURNING id, applications.status INTO v_app_id, v_app_status;
  ELSE
    INSERT INTO public.applications (job_id, candidate_id, status)
    VALUES (p_job_id, p_candidate_id, 'applied')
    RETURNING id, applications.status INTO v_app_id, v_app_status;
  END IF;

  RETURN QUERY SELECT v_app_id, v_app_status, TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_candidate_to_job(UUID, UUID) TO authenticated;
