-- =====================================================
-- STRIPE BILLING COLUMNS
-- =====================================================
-- Run in Supabase SQL Editor AFTER subscription_system.sql
-- Prices are in USD: job_slot_basic=$100, job_slot_pro=$300, resume_search=$500
-- =====================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='stripe_customer_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN stripe_customer_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='stripe_subscription_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN stripe_subscription_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='stripe_price_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN stripe_price_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='billing_status') THEN
    ALTER TABLE public.subscriptions ADD COLUMN billing_status TEXT DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='auto_renew') THEN
    ALTER TABLE public.subscriptions ADD COLUMN auto_renew BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='stripe_session_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN stripe_session_id TEXT;
  END IF;
END $$;

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer  ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_session   ON public.subscriptions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_status   ON public.subscriptions(billing_status);

-- RPC: Get billing summary for admin (used by AdminOverview)
CREATE OR REPLACE FUNCTION public.get_billing_summary()
RETURNS TABLE (
  total_paid_revenue NUMERIC,
  active_paid_count  BIGINT,
  canceled_count     BIGINT,
  past_due_count     BIGINT,
  pending_count      BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE
      WHEN s.plan_type = 'job_slot_basic'  THEN 100   -- $100 USD
      WHEN s.plan_type = 'job_slot_pro'    THEN 300   -- $300 USD
      WHEN s.plan_type = 'resume_search'   THEN 500   -- $500 USD
      ELSE 0 END), 0)::NUMERIC                                      AS total_paid_revenue,
    COUNT(*) FILTER (WHERE s.billing_status = 'active')             AS active_paid_count,
    COUNT(*) FILTER (WHERE s.billing_status = 'canceled')           AS canceled_count,
    COUNT(*) FILTER (WHERE s.billing_status = 'past_due')           AS past_due_count,
    COUNT(*) FILTER (WHERE s.billing_status = 'pending' OR s.billing_status IS NULL) AS pending_count
  FROM public.subscriptions s;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_billing_summary() TO authenticated;
