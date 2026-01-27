-- =====================================================
-- TALENT SEARCH SCHEMA
-- =====================================================

-- 1. ENHANCE CANDIDATE PROFILES TABLE
-- Ensure we have all necessary columns and indexes for high-performance search

-- Add columns if they don't exist (Idempotent)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidate_profiles' AND column_name = 'location') THEN
    ALTER TABLE candidate_profiles ADD COLUMN location TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidate_profiles' AND column_name = 'education') THEN
    ALTER TABLE candidate_profiles ADD COLUMN education TEXT[];
  END IF;
  
   -- Ensure job_titles is there (it was in previous schema but good to double check)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidate_profiles' AND column_name = 'job_titles') THEN
     ALTER TABLE candidate_profiles ADD COLUMN job_titles TEXT[];
  END IF;

END $$;

-- Add GIN Indexes for fast array searching
CREATE INDEX IF NOT EXISTS idx_candidate_skills ON candidate_profiles USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_candidate_keywords ON candidate_profiles USING GIN (keywords);
CREATE INDEX IF NOT EXISTS idx_candidate_job_titles ON candidate_profiles USING GIN (job_titles);
CREATE INDEX IF NOT EXISTS idx_candidate_location ON candidate_profiles USING btree (location);


-- 2. SEARCH CANDIDATES RPC FUNCTION
-- Weighted ranking algorithm

DROP FUNCTION IF EXISTS search_candidates;
CREATE OR REPLACE FUNCTION search_candidates(
  p_query TEXT DEFAULT NULL,
  p_skills TEXT[] DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_min_experience INT DEFAULT NULL,
  p_max_experience INT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
) RETURNS TABLE (
  id UUID,
  candidate_id UUID,
  full_name TEXT, 
  job_titles TEXT[],
  skills TEXT[],
  years_experience NUMERIC,
  location TEXT,
  education TEXT[],
  resume_url TEXT,
  match_score FLOAT,
  total_count BIGINT
) AS $$
DECLARE
  v_query_terms TEXT[];
BEGIN
  -- Normalize query into array of terms for naive matching if needed
  -- For this implementation, we rely on specific filters + partial text match
  
  RETURN QUERY
  WITH filtered_candidates AS (
    SELECT 
      cp.id,
      cp.candidate_id,
      p.full_name,
      cp.job_titles,
      cp.skills,
      cp.years_experience,
      cp.location,
      cp.education,
      cp.resume_url,
      -- Calculate Match Score
      (
        -- 1. Skill Match (40%)
        COALESCE(
          (SELECT COUNT(*) FROM UNNEST(cp.skills) s WHERE s = ANY(p_skills))::float / NULLIF(array_length(p_skills, 1), 0), 0
        ) * 40
        +
        -- 2. Location Match (10%)
        CASE 
          WHEN p_location IS NOT NULL AND cp.location ILIKE '%' || p_location || '%' THEN 10 
          ELSE 0 
        END
        +
        -- 3. Experience Match (20%)
        CASE
            WHEN p_min_experience IS NOT NULL AND cp.years_experience >= p_min_experience THEN 20
            ELSE 0
        END
        +
        -- 4. Text Query Match (Job Titles/Keywords) (30%)
        CASE 
          WHEN p_query IS NOT NULL AND (
            array_to_string(cp.job_titles, ' ') ILIKE '%' || p_query || '%' OR
            array_to_string(cp.keywords, ' ') ILIKE '%' || p_query || '%'
          ) THEN 30
          ELSE 0
        END
      )::float AS score
    FROM candidate_profiles cp
    JOIN profiles p ON cp.candidate_id = p.id
    WHERE 
      -- Apply strict filters first (WHERE clause)
      (p_min_experience IS NULL OR cp.years_experience >= p_min_experience)
      AND
      (p_max_experience IS NULL OR cp.years_experience <= p_max_experience)
      AND
      (p_location IS NULL OR cp.location ILIKE '%' || p_location || '%')
      AND
      (p_skills IS NULL OR cp.skills && p_skills) -- Overlap operator: true if any skill matches
  )
  SELECT 
    fc.id,
    fc.candidate_id,
    fc.full_name,
    fc.job_titles,
    fc.skills,
    fc.years_experience,
    fc.location,
    fc.education,
    fc.resume_url,
    fc.score as match_score,
    (SELECT COUNT(*) FROM filtered_candidates) as total_count
  FROM filtered_candidates fc
  ORDER BY fc.score DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. RESUME ACCESS CHECK POLICY HELPER
-- Function to check if a user has resume search access (subscription)
CREATE OR REPLACE FUNCTION has_resume_access(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Placeholder: Check for active subscription with plan_id 'resume_search' or similar
  -- For now, returning TRUE for testing, or check profiles role
  RETURN EXISTS (
    SELECT 1 FROM subscriptions s
    JOIN profiles p ON p.organization_id = s.organization_id
    WHERE p.id = user_id 
    AND s.status = 'active'
    -- AND s.plan_id = 'resume_search' -- Uncomment when plans are strictly defined
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
