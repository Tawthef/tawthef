-- =====================================================
-- SUBSCRIPTION & USAGE CONTROL SYSTEM
-- =====================================================
-- Run this in your Supabase SQL Editor.
-- Prerequisites: organizations table, profiles table with role column,
--   public.get_user_role() and public.get_user_org_id() functions.
--
-- NOTE: This script handles the case where a subscriptions table
-- already exists from pricing_schema.sql. It adds missing columns
-- and creates RPC functions that work with the updated schema.
-- =====================================================

-- =====================================================
-- 1. ALTER EXISTING SUBSCRIPTIONS TABLE (add missing columns)
-- =====================================================

-- Add plan_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'plan_type'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN plan_type TEXT;
  END IF;
END $$;

-- Add is_active column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Add usage_limit column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'usage_limit'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN usage_limit INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add usage_used column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'usage_used'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN usage_used INTEGER DEFAULT 0;
  END IF;
END $$;

-- Backfill plan_type from plans table for existing rows (if plan_id exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'plan_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'plans'
  ) THEN
    UPDATE public.subscriptions s
    SET plan_type = CASE
      WHEN p.slug = 'starter-job-slot' THEN 'job_slot_basic'
      WHEN p.slug = 'growth-job-slots' THEN 'job_slot_pro'
      WHEN p.slug = 'resume-search' THEN 'resume_search'
      ELSE p.type
    END
    FROM public.plans p
    WHERE s.plan_id = p.id
      AND s.plan_type IS NULL;
  END IF;
END $$;

-- Backfill is_active from status for existing rows
UPDATE public.subscriptions
SET is_active = (status = 'active' AND end_date >= NOW())
WHERE is_active IS NULL;

-- Backfill usage_limit from remaining_slots + plans.job_slots for existing rows
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'remaining_slots'
  ) THEN
    UPDATE public.subscriptions
    SET usage_limit = COALESCE(remaining_slots, 0),
        usage_used = 0
    WHERE usage_limit = 0 OR usage_limit IS NULL;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_subs_plan_type ON public.subscriptions(plan_type);
CREATE INDEX IF NOT EXISTS idx_subs_is_active ON public.subscriptions(is_active);

-- =====================================================
-- 2. JOB_SLOTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.job_slots (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  total_slots INTEGER DEFAULT 0,
  used_slots INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ
);

-- =====================================================
-- 3. ROW LEVEL SECURITY POLICIES
-- =====================================================

ALTER TABLE public.job_slots ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies (drop existing ones first to avoid conflicts)
DO $$ BEGIN
  DROP POLICY IF EXISTS "org_view_own_subscriptions" ON public.subscriptions;
  DROP POLICY IF EXISTS "admin_view_all_subscriptions" ON public.subscriptions;
  DROP POLICY IF EXISTS "admin_manage_subscriptions" ON public.subscriptions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "org_view_own_subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    organization_id = public.get_user_org_id()
    AND public.get_user_role() IN ('employer', 'agency')
  );

CREATE POLICY "admin_view_all_subscriptions"
  ON public.subscriptions FOR SELECT
  USING (public.get_user_role() = 'admin');

CREATE POLICY "admin_manage_subscriptions"
  ON public.subscriptions FOR ALL
  USING (public.get_user_role() = 'admin');

-- Job Slots policies
DROP POLICY IF EXISTS "org_view_own_job_slots" ON public.job_slots;
CREATE POLICY "org_view_own_job_slots"
  ON public.job_slots FOR SELECT
  USING (
    organization_id = public.get_user_org_id()
    AND public.get_user_role() IN ('employer', 'agency')
  );

DROP POLICY IF EXISTS "admin_view_all_job_slots" ON public.job_slots;
CREATE POLICY "admin_view_all_job_slots"
  ON public.job_slots FOR SELECT
  USING (public.get_user_role() = 'admin');

-- =====================================================
-- 4. RPC: check_active_subscription
-- =====================================================

-- Drop existing function to avoid parameter name conflicts
DROP FUNCTION IF EXISTS public.check_active_subscription(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.check_active_subscription(
  p_org_id UUID,
  p_plan TEXT
)
RETURNS TABLE(is_valid BOOLEAN, remaining_days INTEGER, remaining_usage INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub RECORD;
BEGIN
  -- First, expire any stale subs for this org
  UPDATE public.subscriptions
  SET is_active = FALSE
  WHERE organization_id = p_org_id
    AND is_active = TRUE
    AND end_date < NOW();

  -- Find the best active subscription matching the plan
  SELECT
    s.id,
    s.end_date,
    s.usage_limit,
    s.usage_used,
    s.is_active
  INTO v_sub
  FROM public.subscriptions s
  WHERE s.organization_id = p_org_id
    AND s.plan_type = p_plan
    AND s.is_active = TRUE
    AND s.end_date >= NOW()
  ORDER BY s.end_date DESC
  LIMIT 1;

  IF v_sub IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 0;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    TRUE,
    EXTRACT(DAY FROM (v_sub.end_date - NOW()))::INTEGER,
    (v_sub.usage_limit - v_sub.usage_used)::INTEGER;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_active_subscription(UUID, TEXT) TO authenticated;

-- =====================================================
-- 5. RPC: consume_job_slot
-- =====================================================

-- Drop existing function to avoid parameter name conflicts
DROP FUNCTION IF EXISTS public.consume_job_slot(UUID);

CREATE OR REPLACE FUNCTION public.consume_job_slot(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub RECORD;
BEGIN
  -- Expire stale subscriptions first
  UPDATE public.subscriptions
  SET is_active = FALSE
  WHERE organization_id = p_org_id
    AND is_active = TRUE
    AND end_date < NOW();

  -- Check for active job slot subscription (basic or pro)
  SELECT id, usage_limit, usage_used, end_date
  INTO v_sub
  FROM public.subscriptions
  WHERE organization_id = p_org_id
    AND plan_type IN ('job_slot_basic', 'job_slot_pro')
    AND is_active = TRUE
    AND end_date >= NOW()
    AND usage_used < usage_limit
  ORDER BY end_date ASC
  LIMIT 1;

  IF v_sub IS NULL THEN
    RAISE EXCEPTION 'NO_AVAILABLE_SLOTS: No active job slot subscription with remaining slots found.';
  END IF;

  -- Increment usage on the subscription
  UPDATE public.subscriptions
  SET usage_used = usage_used + 1
  WHERE id = v_sub.id;

  -- Upsert job_slots summary row
  INSERT INTO public.job_slots (organization_id, total_slots, used_slots, expires_at)
  VALUES (p_org_id, v_sub.usage_limit, 1, v_sub.end_date)
  ON CONFLICT (organization_id)
  DO UPDATE SET
    used_slots = public.job_slots.used_slots + 1,
    total_slots = GREATEST(public.job_slots.total_slots, v_sub.usage_limit),
    expires_at = GREATEST(public.job_slots.expires_at, v_sub.end_date);

  RETURN jsonb_build_object(
    'success', TRUE,
    'remaining', (v_sub.usage_limit - v_sub.usage_used - 1)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_job_slot(UUID) TO authenticated;

-- =====================================================
-- 6. RPC: has_resume_access
-- =====================================================

-- Drop existing function to avoid parameter name conflicts
DROP FUNCTION IF EXISTS public.has_resume_access(UUID);

CREATE OR REPLACE FUNCTION public.has_resume_access(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Expire stale subscriptions first
  UPDATE public.subscriptions
  SET is_active = FALSE
  WHERE organization_id = p_org_id
    AND is_active = TRUE
    AND end_date < NOW();

  RETURN EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE organization_id = p_org_id
      AND plan_type = 'resume_search'
      AND is_active = TRUE
      AND end_date >= NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_resume_access(UUID) TO authenticated;

-- =====================================================
-- 7. EXPIRY: Batch function (call via cron / pg_cron)
-- =====================================================

CREATE OR REPLACE FUNCTION public.expire_stale_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE public.subscriptions
  SET is_active = FALSE
  WHERE is_active = TRUE
    AND end_date < NOW();
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- =====================================================
-- 8. ADMIN STATS VIEW (for monitoring page)
-- =====================================================

CREATE OR REPLACE VIEW public.admin_subscription_stats AS
SELECT
  s.id,
  s.organization_id,
  o.name AS organization_name,
  s.plan_type,
  s.is_active,
  s.start_date,
  s.end_date,
  s.usage_limit,
  s.usage_used,
  s.created_at,
  EXTRACT(DAY FROM (s.end_date - NOW()))::INTEGER AS days_remaining
FROM public.subscriptions s
LEFT JOIN public.organizations o ON o.id = s.organization_id;

-- =====================================================
-- NOTES
-- =====================================================
-- 1. This script safely adds columns to the existing subscriptions table
-- 2. Existing data is backfilled (plan_type from plans.slug, is_active from status)
-- 3. Set up pg_cron to run expire_stale_subscriptions() periodically:
--    SELECT cron.schedule('expire-subs', '0 * * * *', 'SELECT public.expire_stale_subscriptions()');
