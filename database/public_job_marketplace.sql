-- =====================================================
-- PUBLIC JOB MARKETPLACE
-- =====================================================
-- Run in Supabase SQL Editor

DROP FUNCTION IF EXISTS public.get_public_jobs(TEXT, TEXT[], TEXT[], TEXT, NUMERIC, NUMERIC, TEXT, TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.get_public_jobs(
  p_title TEXT DEFAULT NULL,
  p_skills TEXT[] DEFAULT NULL,
  p_keywords TEXT[] DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_salary_min NUMERIC DEFAULT NULL,
  p_salary_max NUMERIC DEFAULT NULL,
  p_experience_level TEXT DEFAULT NULL,
  p_job_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 60,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  organization_name TEXT,
  organization_type TEXT,
  location TEXT,
  salary_min NUMERIC,
  salary_max NUMERIC,
  salary_range_text TEXT,
  experience_level TEXT,
  job_type TEXT,
  required_skills TEXT[],
  keywords TEXT[],
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH normalized AS (
    SELECT
      j.id,
      j.title,
      j.description,
      COALESCE(o.name, 'Unknown Company') AS organization_name,
      NULLIF(BTRIM(COALESCE(to_jsonb(o)->>'type', '')), '') AS organization_type,
      NULLIF(BTRIM(COALESCE(to_jsonb(j)->>'location', '')), '') AS location,
      CASE
        WHEN COALESCE(to_jsonb(j)->>'salary_min', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
        THEN (to_jsonb(j)->>'salary_min')::NUMERIC
        ELSE NULL
      END AS salary_min,
      CASE
        WHEN COALESCE(to_jsonb(j)->>'salary_max', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
        THEN (to_jsonb(j)->>'salary_max')::NUMERIC
        ELSE NULL
      END AS salary_max,
      NULLIF(BTRIM(COALESCE(to_jsonb(j)->>'salary_range', to_jsonb(j)->>'salary', '')), '') AS salary_range_text,
      NULLIF(
        BTRIM(
          COALESCE(
            to_jsonb(j)->>'experience_level',
            to_jsonb(j)->>'experience',
            ''
          )
        ),
        ''
      ) AS experience_level,
      NULLIF(
        BTRIM(
          COALESCE(
            to_jsonb(j)->>'job_type',
            to_jsonb(j)->>'employment_type',
            ''
          )
        ),
        ''
      ) AS job_type,
      COALESCE(
        ARRAY(
          SELECT BTRIM(value)
          FROM jsonb_array_elements_text(COALESCE(to_jsonb(j)->'skills', '[]'::JSONB)) AS value
          WHERE BTRIM(value) <> ''
        ),
        '{}'::TEXT[]
      ) AS required_skills,
      COALESCE(
        ARRAY(
          SELECT BTRIM(value)
          FROM jsonb_array_elements_text(COALESCE(to_jsonb(j)->'keywords', '[]'::JSONB)) AS value
          WHERE BTRIM(value) <> ''
        ),
        '{}'::TEXT[]
      ) AS keywords,
      j.created_at
    FROM public.jobs j
    LEFT JOIN public.organizations o ON o.id = j.organization_id
    WHERE j.status = 'open'
  )
  SELECT
    n.id,
    n.title,
    n.description,
    n.organization_name,
    n.organization_type,
    n.location,
    n.salary_min,
    n.salary_max,
    n.salary_range_text,
    n.experience_level,
    n.job_type,
    n.required_skills,
    n.keywords,
    n.created_at
  FROM normalized n
  WHERE
    (COALESCE(BTRIM(p_title), '') = '' OR LOWER(n.title) LIKE '%' || LOWER(BTRIM(p_title)) || '%')
    AND (COALESCE(BTRIM(p_location), '') = '' OR LOWER(COALESCE(n.location, '')) LIKE '%' || LOWER(BTRIM(p_location)) || '%')
    AND (COALESCE(BTRIM(p_experience_level), '') = '' OR LOWER(COALESCE(n.experience_level, '')) = LOWER(BTRIM(p_experience_level)))
    AND (COALESCE(BTRIM(p_job_type), '') = '' OR LOWER(COALESCE(n.job_type, '')) = LOWER(BTRIM(p_job_type)))
    AND (
      p_salary_min IS NULL
      OR COALESCE(n.salary_max, n.salary_min) IS NULL
      OR COALESCE(n.salary_max, n.salary_min) >= p_salary_min
    )
    AND (
      p_salary_max IS NULL
      OR COALESCE(n.salary_min, n.salary_max) IS NULL
      OR COALESCE(n.salary_min, n.salary_max) <= p_salary_max
    )
    AND (
      COALESCE(array_length(p_skills, 1), 0) = 0
      OR NOT EXISTS (
        SELECT 1
        FROM unnest(p_skills) AS req
        WHERE COALESCE(BTRIM(req), '') <> ''
          AND NOT EXISTS (
            SELECT 1
            FROM unnest(n.required_skills) AS skill
            WHERE LOWER(skill) LIKE '%' || LOWER(BTRIM(req)) || '%'
          )
      )
    )
    AND (
      COALESCE(array_length(p_keywords, 1), 0) = 0
      OR NOT EXISTS (
        SELECT 1
        FROM unnest(p_keywords) AS req
        WHERE COALESCE(BTRIM(req), '') <> ''
          AND NOT EXISTS (
            SELECT 1
            FROM unnest(n.keywords) AS kw
            WHERE LOWER(kw) LIKE '%' || LOWER(BTRIM(req)) || '%'
          )
      )
    )
  ORDER BY n.created_at DESC
  LIMIT GREATEST(1, COALESCE(p_limit, 60))
  OFFSET GREATEST(0, COALESCE(p_offset, 0));
END;
$$;

DROP FUNCTION IF EXISTS public.get_public_job_by_id(UUID);
CREATE OR REPLACE FUNCTION public.get_public_job_by_id(
  p_job_id UUID
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  organization_name TEXT,
  organization_type TEXT,
  location TEXT,
  salary_min NUMERIC,
  salary_max NUMERIC,
  salary_range_text TEXT,
  experience_level TEXT,
  job_type TEXT,
  required_skills TEXT[],
  keywords TEXT[],
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    j.title,
    j.description,
    COALESCE(o.name, 'Unknown Company') AS organization_name,
    NULLIF(BTRIM(COALESCE(to_jsonb(o)->>'type', '')), '') AS organization_type,
    NULLIF(BTRIM(COALESCE(to_jsonb(j)->>'location', '')), '') AS location,
    CASE
      WHEN COALESCE(to_jsonb(j)->>'salary_min', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
      THEN (to_jsonb(j)->>'salary_min')::NUMERIC
      ELSE NULL
    END AS salary_min,
    CASE
      WHEN COALESCE(to_jsonb(j)->>'salary_max', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
      THEN (to_jsonb(j)->>'salary_max')::NUMERIC
      ELSE NULL
    END AS salary_max,
    NULLIF(BTRIM(COALESCE(to_jsonb(j)->>'salary_range', to_jsonb(j)->>'salary', '')), '') AS salary_range_text,
    NULLIF(
      BTRIM(
        COALESCE(
          to_jsonb(j)->>'experience_level',
          to_jsonb(j)->>'experience',
          ''
        )
      ),
      ''
    ) AS experience_level,
    NULLIF(
      BTRIM(
        COALESCE(
          to_jsonb(j)->>'job_type',
          to_jsonb(j)->>'employment_type',
          ''
        )
      ),
      ''
    ) AS job_type,
    COALESCE(
      ARRAY(
        SELECT BTRIM(value)
        FROM jsonb_array_elements_text(COALESCE(to_jsonb(j)->'skills', '[]'::JSONB)) AS value
        WHERE BTRIM(value) <> ''
      ),
      '{}'::TEXT[]
    ) AS required_skills,
    COALESCE(
      ARRAY(
        SELECT BTRIM(value)
        FROM jsonb_array_elements_text(COALESCE(to_jsonb(j)->'keywords', '[]'::JSONB)) AS value
        WHERE BTRIM(value) <> ''
      ),
      '{}'::TEXT[]
    ) AS keywords,
    j.created_at
  FROM public.jobs j
  LEFT JOIN public.organizations o ON o.id = j.organization_id
  WHERE j.id = p_job_id
    AND j.status = 'open'
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_jobs(TEXT, TEXT[], TEXT[], TEXT, NUMERIC, NUMERIC, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_jobs(TEXT, TEXT[], TEXT[], TEXT, NUMERIC, NUMERIC, TEXT, TEXT, INTEGER, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.get_public_jobs(TEXT, TEXT[], TEXT[], TEXT, NUMERIC, NUMERIC, TEXT, TEXT, INTEGER, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_jobs(TEXT, TEXT[], TEXT[], TEXT, NUMERIC, NUMERIC, TEXT, TEXT, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_jobs(TEXT, TEXT[], TEXT[], TEXT, NUMERIC, NUMERIC, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.get_public_job_by_id(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_job_by_id(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.get_public_job_by_id(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_job_by_id(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_job_by_id(UUID) TO authenticated;
