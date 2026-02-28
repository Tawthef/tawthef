-- =====================================================
-- JOB PROGRESS REPORT — SQL Views & RPC
-- =====================================================
-- Run this in your Supabase SQL Editor.
-- Prerequisites: jobs and applications tables must exist.
-- =====================================================

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications(applied_at);



-- =====================================================
-- 1. VIEW: analytics_job_progress
-- =====================================================
-- Aggregated status counts per job

DROP VIEW IF EXISTS analytics_job_progress CASCADE;
CREATE OR REPLACE VIEW analytics_job_progress AS
SELECT
  a.job_id,
  j.organization_id,
  COUNT(a.id) AS total_applications,
  COUNT(CASE WHEN a.status = 'agency_shortlisted' THEN 1 END) AS agency_shortlisted_count,
  COUNT(CASE WHEN a.status IN ('hr_shortlisted', 'employer_review') THEN 1 END) AS hr_shortlisted_count,
  COUNT(CASE WHEN a.status IN ('technical_shortlisted', 'technical_approved') THEN 1 END) AS technical_shortlisted_count,
  COUNT(CASE WHEN a.status IN ('interview', 'interviewed', 'interview_completed') THEN 1 END) AS interview_count,
  COUNT(CASE WHEN a.status IN ('offer', 'offered', 'offer_sent', 'offer_accepted') THEN 1 END) AS offer_count,
  COUNT(CASE WHEN a.status = 'hired' THEN 1 END) AS hired_count,
  COUNT(CASE WHEN a.status = 'rejected' THEN 1 END) AS rejected_count
FROM applications a
JOIN jobs j ON a.job_id = j.id
GROUP BY a.job_id, j.organization_id;

-- =====================================================
-- 2. VIEW: analytics_job_timeline
-- =====================================================
-- Daily application counts per job

DROP VIEW IF EXISTS analytics_job_timeline CASCADE;
CREATE OR REPLACE VIEW analytics_job_timeline AS
SELECT
  a.job_id,
  j.organization_id,
  DATE(a.applied_at) AS application_date,
  COUNT(a.id) AS count_per_day
FROM applications a
JOIN jobs j ON a.job_id = j.id
GROUP BY a.job_id, j.organization_id, DATE(a.applied_at);

-- =====================================================
-- 3. RPC: get_job_progress
-- =====================================================
-- Returns progress data for a specific job.
-- Enforces org-level access: employer/agency see own org, admin sees all.

DROP FUNCTION IF EXISTS public.get_job_progress(UUID);

CREATE OR REPLACE FUNCTION public.get_job_progress(p_job_id UUID)
RETURNS TABLE(
  job_id UUID,
  total_applications BIGINT,
  agency_shortlisted_count BIGINT,
  hr_shortlisted_count BIGINT,
  technical_shortlisted_count BIGINT,
  interview_count BIGINT,
  offer_count BIGINT,
  hired_count BIGINT,
  rejected_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.job_id,
    v.total_applications,
    v.agency_shortlisted_count,
    v.hr_shortlisted_count,
    v.technical_shortlisted_count,
    v.interview_count,
    v.offer_count,
    v.hired_count,
    v.rejected_count
  FROM analytics_job_progress v
  WHERE v.job_id = p_job_id
    AND (
      v.organization_id = public.get_user_org_id()
      OR public.get_user_role() = 'admin'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_job_progress(UUID) TO authenticated;

-- =====================================================
-- 4. RPC: get_job_timeline
-- =====================================================
-- Returns daily application counts for a specific job.

DROP FUNCTION IF EXISTS public.get_job_timeline(UUID);

CREATE OR REPLACE FUNCTION public.get_job_timeline(p_job_id UUID)
RETURNS TABLE(
  application_date DATE,
  count_per_day BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.application_date,
    v.count_per_day
  FROM analytics_job_timeline v
  WHERE v.job_id = p_job_id
    AND (
      v.organization_id = public.get_user_org_id()
      OR public.get_user_role() = 'admin'
    )
  ORDER BY v.application_date ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_job_timeline(UUID) TO authenticated;
