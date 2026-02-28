-- =====================================================
-- CV PARSING & RANKING SCHEMA (v4 - Production)
-- =====================================================
-- Run in Supabase SQL Editor.
-- Upgrades existing schema with education, location,
-- and production-grade match scoring.
-- =====================================================

-- 0. ENSURE DEPENDENCIES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'skills') THEN
    ALTER TABLE jobs ADD COLUMN skills TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- 1. CANDIDATE PROFILES TABLE
CREATE TABLE IF NOT EXISTS candidate_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  resume_url TEXT,
  parsed_at TIMESTAMP WITH TIME ZONE,
  -- AI Extracted Fields
  skills TEXT[],
  job_titles TEXT[],
  years_experience NUMERIC DEFAULT 0,
  keywords TEXT[],
  education TEXT[],
  location TEXT,
  education_level TEXT,
  languages TEXT[],
  -- Raw Text
  raw_text TEXT,
  resume_text TEXT,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(candidate_id)
);

-- Add columns if table already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidate_profiles' AND column_name = 'education') THEN
    ALTER TABLE candidate_profiles ADD COLUMN education TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidate_profiles' AND column_name = 'location') THEN
    ALTER TABLE candidate_profiles ADD COLUMN location TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidate_profiles' AND column_name = 'resume_text') THEN
    ALTER TABLE candidate_profiles ADD COLUMN resume_text TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidate_profiles' AND column_name = 'job_titles') THEN
    ALTER TABLE candidate_profiles ADD COLUMN job_titles TEXT[];
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_skills ON candidate_profiles USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_keywords ON candidate_profiles USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_job_titles ON candidate_profiles USING GIN(job_titles);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_candidate_id ON candidate_profiles(candidate_id);

-- RLS
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Candidates view own parsed profile" ON candidate_profiles;
CREATE POLICY "Candidates view own parsed profile" ON candidate_profiles
  FOR SELECT USING (auth.uid() = candidate_id);

DROP POLICY IF EXISTS "Candidates update own parsed profile" ON candidate_profiles;
CREATE POLICY "Candidates update own parsed profile" ON candidate_profiles
  FOR UPDATE USING (auth.uid() = candidate_id);

DROP POLICY IF EXISTS "Candidates insert own parsed profile" ON candidate_profiles;
CREATE POLICY "Candidates insert own parsed profile" ON candidate_profiles
  FOR INSERT WITH CHECK (auth.uid() = candidate_id);

DROP POLICY IF EXISTS "Recruiters view all candidate profiles" ON candidate_profiles;
CREATE POLICY "Recruiters view all candidate profiles" ON candidate_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('employer', 'agency', 'admin'))
  );

-- =====================================================
-- 2. CANDIDATE JOB SCORES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS candidate_job_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Scores (0-100)
  overall_score NUMERIC CHECK (overall_score >= 0 AND overall_score <= 100),
  skill_match_score NUMERIC CHECK (skill_match_score >= 0 AND skill_match_score <= 100),
  title_match_score NUMERIC DEFAULT 0,
  experience_score NUMERIC CHECK (experience_score >= 0 AND experience_score <= 100),
  location_score NUMERIC DEFAULT 0,
  freshness_score NUMERIC DEFAULT 0,
  keyword_score NUMERIC CHECK (keyword_score >= 0 AND keyword_score <= 100),
  -- Explanation
  matched_skills TEXT[],
  missing_skills TEXT[],
  ai_explanation TEXT,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id, candidate_id)
);

-- Add new columns if table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidate_job_scores' AND column_name = 'title_match_score') THEN
    ALTER TABLE candidate_job_scores ADD COLUMN title_match_score NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidate_job_scores' AND column_name = 'location_score') THEN
    ALTER TABLE candidate_job_scores ADD COLUMN location_score NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidate_job_scores' AND column_name = 'freshness_score') THEN
    ALTER TABLE candidate_job_scores ADD COLUMN freshness_score NUMERIC DEFAULT 0;
  END IF;
END $$;

-- RLS
ALTER TABLE candidate_job_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recruiters view scores for their jobs" ON candidate_job_scores;
CREATE POLICY "Recruiters view scores for their jobs" ON candidate_job_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = candidate_job_scores.job_id
      AND jobs.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 3. MATCH SCORE FUNCTION (Production Weights)
-- =====================================================
-- Weights: Skill 40%, Title 25%, Experience 20%, Location 10%, Freshness 5%

CREATE OR REPLACE FUNCTION calculate_job_match_score(
  p_job_id UUID,
  p_candidate_id UUID
) RETURNS VOID AS $$
DECLARE
  v_job RECORD;
  v_candidate RECORD;

  v_skill_score NUMERIC := 0;
  v_title_score NUMERIC := 0;
  v_exp_score NUMERIC := 0;
  v_loc_score NUMERIC := 0;
  v_fresh_score NUMERIC := 0;
  v_final_score NUMERIC := 0;

  v_matched_skills TEXT[] := '{}';
  v_missing_skills TEXT[] := '{}';
  v_intersect_count INT := 0;
  v_title_intersect INT := 0;
BEGIN
  -- Get job data
  SELECT skills, title, location INTO v_job FROM jobs WHERE id = p_job_id;

  -- Get candidate data
  SELECT skills, job_titles, years_experience, location, parsed_at
  INTO v_candidate
  FROM candidate_profiles WHERE candidate_id = p_candidate_id;

  -- ===== SKILL MATCH (40%) =====
  IF v_job.skills IS NOT NULL AND array_length(v_job.skills, 1) > 0
     AND v_candidate.skills IS NOT NULL AND array_length(v_candidate.skills, 1) > 0 THEN
    SELECT ARRAY(
      SELECT LOWER(UNNEST(v_job.skills))
      INTERSECT
      SELECT LOWER(UNNEST(v_candidate.skills))
    ) INTO v_matched_skills;

    SELECT ARRAY(
      SELECT LOWER(UNNEST(v_job.skills))
      EXCEPT
      SELECT LOWER(UNNEST(v_candidate.skills))
    ) INTO v_missing_skills;

    v_intersect_count := COALESCE(array_length(v_matched_skills, 1), 0);
    v_skill_score := (v_intersect_count::numeric / array_length(v_job.skills, 1)::numeric) * 100;
  END IF;

  -- ===== TITLE MATCH (25%) =====
  IF v_candidate.job_titles IS NOT NULL AND array_length(v_candidate.job_titles, 1) > 0
     AND v_job.title IS NOT NULL THEN
    SELECT COUNT(*) INTO v_title_intersect
    FROM UNNEST(v_candidate.job_titles) AS t
    WHERE LOWER(v_job.title) LIKE '%' || LOWER(t) || '%'
       OR LOWER(t) LIKE '%' || LOWER(v_job.title) || '%';

    IF v_title_intersect > 0 THEN
      v_title_score := LEAST(100, v_title_intersect * 50);
    END IF;
  END IF;

  -- ===== EXPERIENCE MATCH (20%) =====
  IF COALESCE(v_candidate.years_experience, 0) >= 5 THEN
    v_exp_score := 100;
  ELSE
    v_exp_score := (COALESCE(v_candidate.years_experience, 0) / 5.0) * 100;
  END IF;

  -- ===== LOCATION MATCH (10%) =====
  IF v_job.location IS NOT NULL AND v_candidate.location IS NOT NULL THEN
    IF LOWER(v_job.location) = LOWER(v_candidate.location) THEN
      v_loc_score := 100;
    ELSIF LOWER(v_job.location) LIKE '%' || LOWER(v_candidate.location) || '%'
       OR LOWER(v_candidate.location) LIKE '%' || LOWER(v_job.location) || '%' THEN
      v_loc_score := 60;
    END IF;
  END IF;

  -- ===== FRESHNESS (5%) =====
  IF v_candidate.parsed_at IS NOT NULL THEN
    IF v_candidate.parsed_at >= NOW() - INTERVAL '30 days' THEN
      v_fresh_score := 100;
    ELSIF v_candidate.parsed_at >= NOW() - INTERVAL '90 days' THEN
      v_fresh_score := 60;
    ELSIF v_candidate.parsed_at >= NOW() - INTERVAL '180 days' THEN
      v_fresh_score := 30;
    ELSE
      v_fresh_score := 10;
    END IF;
  END IF;

  -- ===== WEIGHTED FINAL SCORE =====
  v_final_score := (v_skill_score * 0.40)
                  + (v_title_score * 0.25)
                  + (v_exp_score   * 0.20)
                  + (v_loc_score   * 0.10)
                  + (v_fresh_score * 0.05);

  -- Upsert
  INSERT INTO candidate_job_scores (
    job_id, candidate_id,
    overall_score, skill_match_score, title_match_score,
    experience_score, location_score, freshness_score,
    matched_skills, missing_skills
  ) VALUES (
    p_job_id, p_candidate_id,
    v_final_score, v_skill_score, v_title_score,
    v_exp_score, v_loc_score, v_fresh_score,
    v_matched_skills, v_missing_skills
  )
  ON CONFLICT (job_id, candidate_id) DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    skill_match_score = EXCLUDED.skill_match_score,
    title_match_score = EXCLUDED.title_match_score,
    experience_score = EXCLUDED.experience_score,
    location_score = EXCLUDED.location_score,
    freshness_score = EXCLUDED.freshness_score,
    matched_skills = EXCLUDED.matched_skills,
    missing_skills = EXCLUDED.missing_skills,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. TRIGGER: Auto-score on application create
-- =====================================================
CREATE OR REPLACE FUNCTION on_application_created()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM candidate_profiles WHERE candidate_id = NEW.candidate_id) THEN
    PERFORM calculate_job_match_score(NEW.job_id, NEW.candidate_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_score ON applications;
CREATE TRIGGER trigger_calculate_score
AFTER INSERT ON applications
FOR EACH ROW
EXECUTE PROCEDURE on_application_created();

-- =====================================================
-- 5. GRANT EXECUTE
-- =====================================================
GRANT EXECUTE ON FUNCTION calculate_job_match_score(UUID, UUID) TO authenticated;
