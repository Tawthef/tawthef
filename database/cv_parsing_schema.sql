-- =====================================================
-- CV PARSING & RANKING SCHEMA (v3 - Hook Compatible)
-- =====================================================

-- 0. ENSURE DEPENDENCIES
-- Ensure jobs table has a 'skills' column for matching
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'skills') THEN
    ALTER TABLE jobs ADD COLUMN skills TEXT[] DEFAULT '{}';
  END IF;
END $$;


-- 1. CANDIDATE PROFILES (Parsed Data)
CREATE TABLE IF NOT EXISTS candidate_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  resume_url TEXT,
  parsed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- AI Extracted Fields
  skills TEXT[], 
  job_titles TEXT[],
  years_experience NUMERIC DEFAULT 0, -- Matches hook 'years_experience'
  keywords TEXT[], -- Matches hook
  education_level TEXT,
  languages TEXT[],
  
  -- Raw Text
  raw_text TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(candidate_id)
);

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


-- 2. CANDIDATE JOB SCORES (Ranking)
CREATE TABLE IF NOT EXISTS candidate_job_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Scores (0-100)
  overall_score NUMERIC CHECK (overall_score >= 0 AND overall_score <= 100),
  skill_match_score NUMERIC CHECK (skill_match_score >= 0 AND skill_match_score <= 100),
  experience_score NUMERIC CHECK (experience_score >= 0 AND experience_score <= 100),
  keyword_score NUMERIC CHECK (keyword_score >= 0 AND keyword_score <= 100),
  
  -- Explanation
  matched_skills TEXT[],
  missing_skills TEXT[],
  ai_explanation TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(job_id, candidate_id)
);

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


-- 3. FUNCTION TO CALCULATE MATCH SCORE
CREATE OR REPLACE FUNCTION calculate_job_match_score(
  p_job_id UUID,
  p_candidate_id UUID
) RETURNS VOID AS $$
DECLARE
  v_job_skills TEXT[];
  v_candidate_skills TEXT[];
  v_candidate_exp NUMERIC;
  
  v_skill_score NUMERIC := 0;
  v_exp_score NUMERIC := 0;
  v_final_score NUMERIC := 0;
  
  v_matched_skills TEXT[] := '{}';
  v_missing_skills TEXT[] := '{}';
  v_all_matched_skills TEXT[];
  v_all_missing_skills TEXT[];
  v_intersect_count INT := 0;
BEGIN
  -- Get Data
  SELECT skills INTO v_job_skills FROM jobs WHERE id = p_job_id;
  SELECT skills, years_experience INTO v_candidate_skills, v_candidate_exp FROM candidate_profiles WHERE candidate_id = p_candidate_id;
  
  -- Defaults
  v_job_skills := COALESCE(v_job_skills, '{}');
  v_candidate_skills := COALESCE(v_candidate_skills, '{}');
  v_candidate_exp := COALESCE(v_candidate_exp, 0);

  -- Skill Match
  IF array_length(v_job_skills, 1) > 0 THEN
      -- In Postgres, we can do array intersection
      SELECT ARRAY(
        SELECT UNNEST(v_job_skills) 
        INTERSECT 
        SELECT UNNEST(v_candidate_skills)
      ) INTO v_all_matched_skills;
      
      SELECT ARRAY(
        SELECT UNNEST(v_job_skills) 
        EXCEPT 
        SELECT UNNEST(v_candidate_skills)
      ) INTO v_all_missing_skills;
      
      v_intersect_count := array_length(v_all_matched_skills, 1);
      IF v_intersect_count IS NULL THEN v_intersect_count := 0; END IF;
      
      v_skill_score := (v_intersect_count::numeric / array_length(v_job_skills, 1)::numeric) * 100;
      v_matched_skills := v_all_matched_skills;
      v_missing_skills := v_all_missing_skills;
  ELSE
      v_skill_score := 0; 
  END IF;

  -- Experience Score (Cap at 5 years)
  IF v_candidate_exp >= 5 THEN
      v_exp_score := 100;
  ELSE
      v_exp_score := (v_candidate_exp / 5.0) * 100;
  END IF;

  -- Final Score
  v_final_score := (v_skill_score * 0.7) + (v_exp_score * 0.3);

  -- Insert
  INSERT INTO candidate_job_scores (
    job_id, candidate_id, overall_score, skill_match_score, experience_score, matched_skills, missing_skills
  ) VALUES (
    p_job_id, p_candidate_id, v_final_score, v_skill_score, v_exp_score, v_matched_skills, v_missing_skills
  )
  ON CONFLICT (job_id, candidate_id) DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    skill_match_score = EXCLUDED.skill_match_score,
    experience_score = EXCLUDED.experience_score,
    matched_skills = EXCLUDED.matched_skills,
    missing_skills = EXCLUDED.missing_skills,
    updated_at = NOW();

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. TRIGGER ON APPLICATION
-- Automatically calculate score when a candidate applies
CREATE OR REPLACE FUNCTION on_application_created()
RETURNS TRIGGER AS $$
BEGIN
  -- We only calculate if the candidate profile exists
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
