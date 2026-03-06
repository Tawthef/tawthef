-- =====================================================
-- CANDIDATE PROFILE STRENGTH METER
-- =====================================================
-- Run in Supabase SQL Editor

DROP FUNCTION IF EXISTS public.calculate_profile_strength(UUID);
CREATE OR REPLACE FUNCTION public.calculate_profile_strength(
  p_candidate_id UUID
)
RETURNS TABLE (
  percentage INTEGER,
  missing_sections TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_full_name TEXT;
  v_location TEXT;
  v_skills TEXT[];
  v_years_experience NUMERIC;
  v_education TEXT[];
  v_resume_url TEXT;
  v_percentage INTEGER := 0;
  v_missing_sections TEXT[] := '{}'::TEXT[];
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Not authenticated';
  END IF;

  SELECT p.role
    INTO v_user_role
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF p_candidate_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_CANDIDATE: candidate_id is required';
  END IF;

  IF v_user_id <> p_candidate_id AND v_user_role <> 'admin' THEN
    RAISE EXCEPTION 'FORBIDDEN: Cannot access another candidate profile strength';
  END IF;

  SELECT
    p.full_name,
    cp.location,
    cp.skills,
    cp.years_experience,
    cp.education,
    cp.resume_url
  INTO
    v_full_name,
    v_location,
    v_skills,
    v_years_experience,
    v_education,
    v_resume_url
  FROM public.profiles p
  LEFT JOIN public.candidate_profiles cp
    ON cp.candidate_id = p.id
  WHERE p.id = p_candidate_id
    AND p.role = 'candidate';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Candidate profile not found';
  END IF;

  -- Section 1: personal_info (20%)
  IF COALESCE(BTRIM(v_full_name), '') <> ''
     AND COALESCE(BTRIM(v_location), '') <> '' THEN
    v_percentage := v_percentage + 20;
  ELSE
    v_missing_sections := array_append(v_missing_sections, 'personal_info');
  END IF;

  -- Section 2: skills (20%)
  IF COALESCE(array_length(v_skills, 1), 0) > 0 THEN
    v_percentage := v_percentage + 20;
  ELSE
    v_missing_sections := array_append(v_missing_sections, 'skills');
  END IF;

  -- Section 3: experience (20%)
  IF COALESCE(v_years_experience, 0) > 0 THEN
    v_percentage := v_percentage + 20;
  ELSE
    v_missing_sections := array_append(v_missing_sections, 'experience');
  END IF;

  -- Section 4: education (20%)
  IF COALESCE(array_length(v_education, 1), 0) > 0 THEN
    v_percentage := v_percentage + 20;
  ELSE
    v_missing_sections := array_append(v_missing_sections, 'education');
  END IF;

  -- Section 5: cv_uploaded (20%)
  IF COALESCE(BTRIM(v_resume_url), '') <> '' THEN
    v_percentage := v_percentage + 20;
  ELSE
    v_missing_sections := array_append(v_missing_sections, 'cv_uploaded');
  END IF;

  RETURN QUERY
  SELECT v_percentage, v_missing_sections;
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_profile_strength(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.calculate_profile_strength(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.calculate_profile_strength(UUID) TO authenticated;
