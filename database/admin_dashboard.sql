-- =====================================================
-- ADMIN GOVERNANCE DASHBOARD — SQL Views & RPC
-- =====================================================
-- Run in Supabase SQL Editor. Admin-only access enforced.
-- =====================================================

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON subscriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);

-- (applied_at index already exists from previous migration)

-- =====================================================
-- 1. VIEW: analytics_admin_revenue
-- =====================================================
DROP VIEW IF EXISTS analytics_admin_revenue CASCADE;
CREATE OR REPLACE VIEW analytics_admin_revenue AS
SELECT
  COUNT(*) FILTER (WHERE is_active = TRUE AND end_date >= NOW()) AS active_subscriptions_count,
  COUNT(*) FILTER (
    WHERE is_active = TRUE
    AND end_date >= NOW()
    AND end_date <= NOW() + INTERVAL '7 days'
  ) AS expiring_within_7_days_count,
  COALESCE(SUM(
    CASE
      WHEN is_active = TRUE AND end_date >= NOW() THEN
        CASE plan_type
          WHEN 'job_slot_basic' THEN 100
          WHEN 'job_slot_pro' THEN 300
          WHEN 'resume_search' THEN 500
          ELSE 0
        END
      ELSE 0
    END
  ), 0) AS total_revenue,
  COALESCE(SUM(CASE WHEN plan_type = 'job_slot_basic' AND is_active = TRUE AND end_date >= NOW() THEN 100 ELSE 0 END), 0) AS revenue_basic,
  COALESCE(SUM(CASE WHEN plan_type = 'job_slot_pro' AND is_active = TRUE AND end_date >= NOW() THEN 300 ELSE 0 END), 0) AS revenue_pro,
  COALESCE(SUM(CASE WHEN plan_type = 'resume_search' AND is_active = TRUE AND end_date >= NOW() THEN 500 ELSE 0 END), 0) AS revenue_resume
FROM public.subscriptions;

-- =====================================================
-- 2. VIEW: analytics_admin_system_stats
-- =====================================================
DROP VIEW IF EXISTS analytics_admin_system_stats CASCADE;
CREATE OR REPLACE VIEW analytics_admin_system_stats AS
SELECT
  (SELECT COUNT(*) FROM public.organizations) AS total_organizations,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'employer') AS total_employers,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'agency') AS total_agencies,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'candidate') AS total_candidates,
  (SELECT COUNT(*) FROM public.jobs) AS total_jobs,
  (SELECT COUNT(*) FROM public.applications) AS total_applications;

-- =====================================================
-- 3. VIEW: analytics_growth_trend
-- =====================================================
DROP VIEW IF EXISTS analytics_growth_trend CASCADE;
CREATE OR REPLACE VIEW analytics_growth_trend AS
SELECT
  months.month,
  COALESCE(u.new_users, 0) AS new_users,
  COALESCE(j.new_jobs, 0) AS new_jobs,
  COALESCE(s.new_subscriptions, 0) AS new_subscriptions
FROM (
  SELECT DISTINCT DATE_TRUNC('month', d)::DATE AS month
  FROM generate_series(
    NOW() - INTERVAL '11 months',
    NOW(),
    '1 month'
  ) d
) months
LEFT JOIN (
  SELECT DATE_TRUNC('month', created_at)::DATE AS month, COUNT(*) AS new_users
  FROM public.profiles
  GROUP BY 1
) u ON u.month = months.month
LEFT JOIN (
  SELECT DATE_TRUNC('month', created_at)::DATE AS month, COUNT(*) AS new_jobs
  FROM public.jobs
  GROUP BY 1
) j ON j.month = months.month
LEFT JOIN (
  SELECT DATE_TRUNC('month', created_at)::DATE AS month, COUNT(*) AS new_subscriptions
  FROM public.subscriptions
  GROUP BY 1
) s ON s.month = months.month
ORDER BY months.month ASC;

-- =====================================================
-- 4. RPC: get_admin_dashboard_data
-- =====================================================
-- Returns all dashboard data in one call. Admin-only.

DROP FUNCTION IF EXISTS public.get_admin_dashboard_data();

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
  v_revenue RECORD;
  v_stats RECORD;
  v_growth JSONB;
  v_expiring JSONB;
  v_recent_jobs JSONB;
  v_recent_hires JSONB;
  v_recent_subs JSONB;
BEGIN
  v_role := public.get_user_role();

  IF v_role != 'admin' THEN
    RAISE EXCEPTION 'FORBIDDEN: Admin access required';
  END IF;

  -- Revenue data
  SELECT * INTO v_revenue FROM analytics_admin_revenue;

  -- System stats
  SELECT * INTO v_stats FROM analytics_admin_system_stats;

  -- Growth trend (last 12 months)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month', TO_CHAR(g.month, 'Mon YYYY'),
      'new_users', g.new_users,
      'new_jobs', g.new_jobs,
      'new_subscriptions', g.new_subscriptions
    )
  ), '[]'::jsonb) INTO v_growth
  FROM analytics_growth_trend g;

  -- Expiring subscriptions (within 30 days)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'organization_name', o.name,
      'plan_type', s.plan_type,
      'end_date', s.end_date,
      'days_remaining', EXTRACT(DAY FROM (s.end_date - NOW()))::INTEGER,
      'is_active', s.is_active
    ) ORDER BY s.end_date ASC
  ), '[]'::jsonb) INTO v_expiring
  FROM public.subscriptions s
  LEFT JOIN public.organizations o ON o.id = s.organization_id
  WHERE s.is_active = TRUE
    AND s.end_date >= NOW()
    AND s.end_date <= NOW() + INTERVAL '30 days';

  -- Recent jobs (last 10)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', j.id,
      'title', j.title,
      'organization_name', o.name,
      'created_at', j.created_at,
      'status', j.status
    ) ORDER BY j.created_at DESC
  ), '[]'::jsonb) INTO v_recent_jobs
  FROM (
    SELECT * FROM public.jobs ORDER BY created_at DESC LIMIT 10
  ) j
  LEFT JOIN public.organizations o ON o.id = j.organization_id;

  -- Recent hires (last 10)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'candidate_name', p.full_name,
      'job_title', jb.title,
      'organization_name', org.name,
      'hired_at', a.updated_at
    ) ORDER BY a.updated_at DESC
  ), '[]'::jsonb) INTO v_recent_hires
  FROM (
    SELECT * FROM public.applications WHERE status = 'hired' ORDER BY updated_at DESC LIMIT 10
  ) a
  LEFT JOIN public.profiles p ON p.id = a.candidate_id
  LEFT JOIN public.jobs jb ON jb.id = a.job_id
  LEFT JOIN public.organizations org ON org.id = jb.organization_id;

  -- Recent subscriptions (last 10)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'organization_name', o.name,
      'plan_type', s.plan_type,
      'start_date', s.start_date,
      'end_date', s.end_date,
      'is_active', s.is_active
    ) ORDER BY s.created_at DESC
  ), '[]'::jsonb) INTO v_recent_subs
  FROM (
    SELECT * FROM public.subscriptions ORDER BY created_at DESC LIMIT 10
  ) s
  LEFT JOIN public.organizations o ON o.id = s.organization_id;

  RETURN jsonb_build_object(
    'revenue', jsonb_build_object(
      'total_revenue', v_revenue.total_revenue,
      'revenue_basic', v_revenue.revenue_basic,
      'revenue_pro', v_revenue.revenue_pro,
      'revenue_resume', v_revenue.revenue_resume,
      'active_subscriptions', v_revenue.active_subscriptions_count,
      'expiring_soon', v_revenue.expiring_within_7_days_count
    ),
    'stats', jsonb_build_object(
      'total_organizations', v_stats.total_organizations,
      'total_employers', v_stats.total_employers,
      'total_agencies', v_stats.total_agencies,
      'total_candidates', v_stats.total_candidates,
      'total_jobs', v_stats.total_jobs,
      'total_applications', v_stats.total_applications
    ),
    'growth', v_growth,
    'expiring_subscriptions', v_expiring,
    'recent_jobs', v_recent_jobs,
    'recent_hires', v_recent_hires,
    'recent_subscriptions', v_recent_subs
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_data() TO authenticated;
