-- =====================================================
-- 0. SCHEMA MIGRATION (Fix Missing Columns)
-- =====================================================
-- Fix: 'updated_at' column was missing, causing errors in views.

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'updated_at') THEN
    ALTER TABLE applications ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for applications table
DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at
BEFORE UPDATE ON applications
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- =====================================================
-- ANALYTICS VIEWS
-- =====================================================
-- Added DROP VIEW ... CASCADE to handle column changes

-- 1. HIRING FUNNEL VIEW (Base View)
DROP VIEW IF EXISTS analytics_hiring_funnel CASCADE;
CREATE OR REPLACE VIEW analytics_hiring_funnel AS
SELECT 
  j.organization_id,
  j.id as job_id,
  a.status as stage,
  COUNT(a.id) as candidate_count
FROM applications a
JOIN jobs j ON a.job_id = j.id
GROUP BY j.organization_id, j.id, a.status;

-- 2. TIME TO HIRE VIEW
DROP VIEW IF EXISTS analytics_time_to_hire CASCADE;
CREATE OR REPLACE VIEW analytics_time_to_hire AS
SELECT
  j.organization_id,
  j.id as job_id,
  TO_CHAR(a.updated_at, 'YYYY-MM') as hire_month,
  COUNT(a.id) as hires_count,
  ROUND(AVG(EXTRACT(EPOCH FROM (a.updated_at - a.applied_at))/86400)::numeric, 1) as avg_days_to_hire,
  MIN(EXTRACT(EPOCH FROM (a.updated_at - a.applied_at))/86400)::numeric as min_days,
  MAX(EXTRACT(EPOCH FROM (a.updated_at - a.applied_at))/86400)::numeric as max_days
FROM applications a
JOIN jobs j ON a.job_id = j.id
WHERE a.status IN ('hired', 'offer_accepted')
GROUP BY j.organization_id, j.id, TO_CHAR(a.updated_at, 'YYYY-MM');

-- 3. AGENCY PERFORMANCE VIEW
DROP VIEW IF EXISTS analytics_agency_performance CASCADE;
CREATE OR REPLACE VIEW analytics_agency_performance AS
SELECT
  j.organization_id as employer_org_id,
  a.agency_id,
  TO_CHAR(a.applied_at, 'YYYY-MM') as month,
  COUNT(a.id) as candidates_submitted,
  COUNT(CASE WHEN a.status IN ('agency_shortlisted') THEN 1 END) as shortlisted_count,
  COUNT(CASE WHEN a.status IN ('employer_review', 'technical_approved', 'interview_completed', 'offer_sent', 'offer_accepted', 'hired') THEN 1 END) as employer_approved,
  COUNT(CASE WHEN a.status IN ('offer_accepted', 'hired') THEN 1 END) as hired_count
FROM applications a
JOIN jobs j ON a.job_id = j.id
WHERE a.agency_id IS NOT NULL
GROUP BY j.organization_id, a.agency_id, TO_CHAR(a.applied_at, 'YYYY-MM');

-- =====================================================
-- RPC FUNCTIONS (Called by Frontend)
-- =====================================================
-- FIX: Added DROP FUNCTION IF EXISTS to handle return type changes

-- Function: get_hiring_funnel_analytics
DROP FUNCTION IF EXISTS get_hiring_funnel_analytics();
CREATE OR REPLACE FUNCTION get_hiring_funnel_analytics()
RETURNS TABLE (
  organization_id UUID,
  job_id UUID,
  stage TEXT,
  stage_order INT,
  candidate_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.organization_id,
    v.job_id,
    v.stage,
    CASE 
      WHEN v.stage = 'applied' THEN 1
      WHEN v.stage = 'agency_shortlisted' THEN 2
      WHEN v.stage = 'employer_review' THEN 3
      WHEN v.stage = 'technical_approved' THEN 4
      WHEN v.stage = 'interview_completed' THEN 5
      WHEN v.stage = 'offer_sent' THEN 6
      WHEN v.stage = 'offer_accepted' THEN 7
      WHEN v.stage = 'hired' THEN 7
      ELSE 99
    END as stage_order,
    v.candidate_count
  FROM analytics_hiring_funnel v
  WHERE 
    v.organization_id = public.get_user_org_id() -- Only show for current user's org
    OR public.get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function: get_time_to_hire_analytics
DROP FUNCTION IF EXISTS get_time_to_hire_analytics();
CREATE OR REPLACE FUNCTION get_time_to_hire_analytics()
RETURNS TABLE (
  organization_id UUID,
  job_id UUID,
  hire_month TEXT,
  hires_count BIGINT,
  avg_days_to_hire NUMERIC,
  min_days NUMERIC,
  max_days NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM analytics_time_to_hire v
  WHERE 
    v.organization_id = public.get_user_org_id()
    OR public.get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function: get_agency_performance_analytics
DROP FUNCTION IF EXISTS get_agency_performance_analytics();
CREATE OR REPLACE FUNCTION get_agency_performance_analytics()
RETURNS TABLE (
  employer_org_id UUID,
  agency_id UUID,
  month TEXT,
  candidates_submitted BIGINT,
  shortlisted_count BIGINT,
  employer_approved BIGINT,
  hired_count BIGINT,
  conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.employer_org_id,
    v.agency_id,
    v.month,
    v.candidates_submitted,
    v.shortlisted_count,
    v.employer_approved,
    v.hired_count,
    CASE 
      WHEN v.candidates_submitted > 0 THEN ROUND((v.hired_count::numeric / v.candidates_submitted::numeric) * 100, 1)
      ELSE 0
    END as conversion_rate
  FROM analytics_agency_performance v
  WHERE 
    v.employer_org_id = public.get_user_org_id() -- As Employer
    OR v.agency_id = public.get_user_org_id() -- As Agency
    OR public.get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
