-- =====================================================
-- INVITE CODE SYSTEM
-- =====================================================
-- Run this in the Supabase SQL editor after the core auth/profile/subscription
-- scripts. Invite codes can grant either fixed recruiter job slots or a
-- temporary full-access recruiter subscription.

CREATE TABLE IF NOT EXISTS public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('job_slots', 'full_access')),
  value INTEGER NOT NULL CHECK (value > 0),
  expires_at TIMESTAMPTZ,
  usage_limit INTEGER NOT NULL DEFAULT 1 CHECK (usage_limit > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Legacy compatibility for environments that already used the previous schema.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invite_codes' AND column_name = 'type'
  ) THEN
    ALTER TABLE public.invite_codes ADD COLUMN type TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invite_codes' AND column_name = 'value'
  ) THEN
    ALTER TABLE public.invite_codes ADD COLUMN value INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invite_codes' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.invite_codes ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invite_codes' AND column_name = 'usage_limit'
  ) THEN
    ALTER TABLE public.invite_codes ADD COLUMN usage_limit INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invite_codes' AND column_name = 'used_count'
  ) THEN
    ALTER TABLE public.invite_codes ADD COLUMN used_count INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invite_codes' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.invite_codes ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invite_codes' AND column_name = 'plan_type'
  ) THEN
    ALTER TABLE public.invite_codes ALTER COLUMN plan_type DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invite_codes' AND column_name = 'free_job_slots'
  ) THEN
    ALTER TABLE public.invite_codes ALTER COLUMN free_job_slots DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invite_codes' AND column_name = 'valid_from'
  ) THEN
    ALTER TABLE public.invite_codes ALTER COLUMN valid_from DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invite_codes' AND column_name = 'valid_until'
  ) THEN
    ALTER TABLE public.invite_codes ALTER COLUMN valid_until DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invite_codes' AND column_name = 'max_uses'
  ) THEN
    ALTER TABLE public.invite_codes ALTER COLUMN max_uses DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invite_codes' AND column_name = 'plan_type'
  ) THEN
    EXECUTE $sql$
      UPDATE public.invite_codes
      SET
        type = COALESCE(
          type,
          CASE
            WHEN plan_type IN ('job_slot_basic', 'job_slot_pro', 'job_slot_invite') THEN 'job_slots'
            ELSE 'full_access'
          END
        ),
        value = COALESCE(
          value,
          CASE
            WHEN plan_type = 'job_slot_basic' THEN 1
            WHEN plan_type = 'job_slot_pro' THEN GREATEST(COALESCE(free_job_slots, 10), 10)
            WHEN plan_type = 'job_slot_invite' THEN GREATEST(COALESCE(free_job_slots, 1), 1)
            ELSE 30
          END
        ),
        expires_at = COALESCE(expires_at, valid_until),
        usage_limit = COALESCE(usage_limit, max_uses, 1),
        used_count = COALESCE(used_count, 0),
        created_at = COALESCE(created_at, NOW())
      WHERE
        type IS NULL
        OR value IS NULL
        OR usage_limit IS NULL
        OR expires_at IS NULL
        OR created_at IS NULL
    $sql$;
  ELSE
    UPDATE public.invite_codes
    SET
      type = COALESCE(type, 'job_slots'),
      value = COALESCE(value, 1),
      usage_limit = COALESCE(usage_limit, 1),
      used_count = COALESCE(used_count, 0),
      created_at = COALESCE(created_at, NOW())
    WHERE
      type IS NULL
      OR value IS NULL
      OR usage_limit IS NULL
      OR created_at IS NULL;
  END IF;
END $$;

UPDATE public.invite_codes
SET
  type = COALESCE(type, 'job_slots'),
  value = COALESCE(value, 1),
  usage_limit = COALESCE(usage_limit, 1),
  used_count = COALESCE(used_count, 0),
  created_at = COALESCE(created_at, NOW());

ALTER TABLE public.invite_codes ALTER COLUMN type SET DEFAULT 'job_slots';
ALTER TABLE public.invite_codes ALTER COLUMN value SET DEFAULT 1;
ALTER TABLE public.invite_codes ALTER COLUMN usage_limit SET DEFAULT 1;
ALTER TABLE public.invite_codes ALTER COLUMN used_count SET DEFAULT 0;
ALTER TABLE public.invite_codes ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.invite_codes ALTER COLUMN type SET NOT NULL;
ALTER TABLE public.invite_codes ALTER COLUMN value SET NOT NULL;
ALTER TABLE public.invite_codes ALTER COLUMN usage_limit SET NOT NULL;
ALTER TABLE public.invite_codes ALTER COLUMN used_count SET NOT NULL;
ALTER TABLE public.invite_codes ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'invite_codes_type_check'
  ) THEN
    ALTER TABLE public.invite_codes
      ADD CONSTRAINT invite_codes_type_check
      CHECK (type IN ('job_slots', 'full_access'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'invite_codes_value_check'
  ) THEN
    ALTER TABLE public.invite_codes
      ADD CONSTRAINT invite_codes_value_check
      CHECK (value > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'invite_codes_usage_limit_check'
  ) THEN
    ALTER TABLE public.invite_codes
      ADD CONSTRAINT invite_codes_usage_limit_check
      CHECK (usage_limit > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'invite_codes_used_count_check'
  ) THEN
    ALTER TABLE public.invite_codes
      ADD CONSTRAINT invite_codes_used_count_check
      CHECK (used_count >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invite_codes_expires_at ON public.invite_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_invite_codes_usage ON public.invite_codes(used_count, usage_limit);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'invite_code_id'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD COLUMN invite_code_id UUID REFERENCES public.invite_codes(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'granted_job_slots'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD COLUMN granted_job_slots INTEGER DEFAULT 0;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_invite_code_org
  ON public.subscriptions(organization_id, invite_code_id)
  WHERE invite_code_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.normalize_invite_code(p_code TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT UPPER(BTRIM(COALESCE(p_code, '')));
$$;

CREATE OR REPLACE FUNCTION public.normalize_invite_code_row()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.code := public.normalize_invite_code(NEW.code);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_invite_code ON public.invite_codes;
CREATE TRIGGER trg_normalize_invite_code
  BEFORE INSERT OR UPDATE ON public.invite_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_invite_code_row();

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_view_invite_codes" ON public.invite_codes;
CREATE POLICY "admin_view_invite_codes"
  ON public.invite_codes FOR SELECT
  USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "admin_insert_invite_codes" ON public.invite_codes;
CREATE POLICY "admin_insert_invite_codes"
  ON public.invite_codes FOR INSERT
  WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "admin_update_invite_codes" ON public.invite_codes;
CREATE POLICY "admin_update_invite_codes"
  ON public.invite_codes FOR UPDATE
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

DROP FUNCTION IF EXISTS public.validate_invite_code(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.validate_invite_code(
  p_code TEXT,
  p_role TEXT DEFAULT NULL
)
RETURNS TABLE(
  is_valid BOOLEAN,
  reason TEXT,
  code TEXT,
  type TEXT,
  value INTEGER,
  expires_at TIMESTAMPTZ,
  usage_limit INTEGER,
  used_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code public.invite_codes%ROWTYPE;
  v_reason TEXT;
BEGIN
  IF COALESCE(BTRIM(p_code), '') = '' THEN
    RETURN QUERY
    SELECT FALSE, 'Invalid or expired invite code', NULL::TEXT, NULL::TEXT, NULL::INTEGER, NULL::TIMESTAMPTZ, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  IF p_role IS NOT NULL AND p_role NOT IN ('employer', 'agency') THEN
    RETURN QUERY
    SELECT FALSE, 'Invalid or expired invite code', NULL::TEXT, NULL::TEXT, NULL::INTEGER, NULL::TIMESTAMPTZ, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  SELECT *
  INTO v_code
  FROM public.invite_codes
  WHERE code = public.normalize_invite_code(p_code);

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT FALSE, 'Invalid or expired invite code', NULL::TEXT, NULL::TEXT, NULL::INTEGER, NULL::TIMESTAMPTZ, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < NOW() THEN
    v_reason := 'Invalid or expired invite code';
  ELSIF v_code.used_count >= v_code.usage_limit THEN
    v_reason := 'Invalid or expired invite code';
  ELSE
    v_reason := NULL;
  END IF;

  RETURN QUERY
  SELECT
    v_reason IS NULL,
    COALESCE(v_reason, 'Invite code is valid.'),
    v_code.code,
    v_code.type,
    v_code.value,
    v_code.expires_at,
    v_code.usage_limit,
    v_code.used_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_invite_code(TEXT, TEXT) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.redeem_invite_code(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.redeem_invite_code(
  p_user_id UUID,
  p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_code public.invite_codes%ROWTYPE;
  v_plan_id UUID;
  v_plan_job_slots INTEGER;
  v_plan_duration_days INTEGER;
  v_plan_slug TEXT;
  v_subscription_id UUID;
  v_subscription_end_date TIMESTAMPTZ;
  v_usage_limit INTEGER;
BEGIN
  IF p_user_id IS NULL OR COALESCE(BTRIM(p_code), '') = '' THEN
    RETURN jsonb_build_object('applied', FALSE, 'reason', 'missing_invite_code');
  END IF;

  SELECT id, role, organization_id
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;

  IF v_profile.role NOT IN ('employer', 'agency') THEN
    RAISE EXCEPTION 'INVITE_CODE_REQUIRES_RECRUITER_ROLE';
  END IF;

  IF v_profile.organization_id IS NULL THEN
    RAISE EXCEPTION 'INVITE_CODE_REQUIRES_ORGANIZATION';
  END IF;

  SELECT *
  INTO v_code
  FROM public.invite_codes
  WHERE code = public.normalize_invite_code(p_code)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVITE_CODE_NOT_FOUND';
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < NOW() THEN
    RAISE EXCEPTION 'INVITE_CODE_EXPIRED';
  END IF;

  IF v_code.used_count >= v_code.usage_limit THEN
    RAISE EXCEPTION 'INVITE_CODE_EXHAUSTED';
  END IF;

  SELECT id
  INTO v_subscription_id
  FROM public.subscriptions
  WHERE organization_id = v_profile.organization_id
    AND invite_code_id = v_code.id
  LIMIT 1;

  IF v_subscription_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'applied', FALSE,
      'reason', 'already_redeemed',
      'subscription_id', v_subscription_id
    );
  END IF;

  v_plan_slug := CASE
    WHEN v_code.type = 'job_slots' AND v_code.value <= 1 THEN 'starter-job-slot'
    ELSE 'growth-job-slots'
  END;

  SELECT id, COALESCE(job_slots, 0), COALESCE(duration_days, 30)
  INTO v_plan_id, v_plan_job_slots, v_plan_duration_days
  FROM public.plans
  WHERE slug = v_plan_slug
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'INVITE_PLAN_NOT_FOUND';
  END IF;

  IF v_code.type = 'job_slots' THEN
    v_usage_limit := GREATEST(v_code.value, 1);
    v_subscription_end_date := NOW() + make_interval(days => GREATEST(v_plan_duration_days, 1));
  ELSE
    v_usage_limit := GREATEST(v_plan_job_slots, 1);
    v_subscription_end_date := NOW() + make_interval(days => GREATEST(v_code.value, 1));
  END IF;

  INSERT INTO public.subscriptions (
    organization_id,
    plan_id,
    status,
    start_date,
    end_date,
    remaining_slots,
    created_at,
    updated_at,
    plan_type,
    is_active,
    usage_limit,
    usage_used,
    invite_code_id,
    granted_job_slots
  )
  VALUES (
    v_profile.organization_id,
    v_plan_id,
    'active',
    NOW(),
    v_subscription_end_date,
    v_usage_limit,
    NOW(),
    NOW(),
    CASE WHEN v_code.type = 'job_slots' THEN 'job_slot_invite' ELSE 'full_access' END,
    TRUE,
    v_usage_limit,
    0,
    v_code.id,
    v_usage_limit
  )
  RETURNING id INTO v_subscription_id;

  UPDATE public.invite_codes
  SET used_count = used_count + 1
  WHERE id = v_code.id;

  INSERT INTO public.job_slots (organization_id, total_slots, used_slots, expires_at)
  VALUES (v_profile.organization_id, v_usage_limit, 0, v_subscription_end_date)
  ON CONFLICT (organization_id)
  DO UPDATE SET
    total_slots = GREATEST(public.job_slots.total_slots, EXCLUDED.total_slots),
    expires_at = GREATEST(public.job_slots.expires_at, EXCLUDED.expires_at);

  RETURN jsonb_build_object(
    'applied', TRUE,
    'subscription_id', v_subscription_id,
    'invite_code_id', v_code.id,
    'type', v_code.type,
    'value', v_code.value,
    'usage_limit', v_usage_limit
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_invite_code(UUID, TEXT) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_signup_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite_code TEXT;
BEGIN
  IF NEW.role NOT IN ('employer', 'agency') THEN
    RETURN NEW;
  END IF;

  SELECT raw_user_meta_data ->> 'invite_code'
  INTO v_invite_code
  FROM auth.users
  WHERE id = NEW.id;

  IF COALESCE(BTRIM(v_invite_code), '') = '' THEN
    RETURN NEW;
  END IF;

  PERFORM public.redeem_invite_code(NEW.id, v_invite_code);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_signup_invite_code ON public.profiles;
CREATE TRIGGER trg_apply_signup_invite_code
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_signup_invite_code();

DROP FUNCTION IF EXISTS public.check_active_subscription(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.check_active_subscription(
  p_org_id UUID,
  p_plan TEXT
)
RETURNS TABLE(is_valid BOOLEAN, remaining_days INTEGER, remaining_usage INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub RECORD;
BEGIN
  UPDATE public.subscriptions
  SET is_active = FALSE
  WHERE organization_id = p_org_id
    AND is_active = TRUE
    AND end_date < NOW();

  SELECT
    s.id,
    s.end_date,
    s.usage_limit,
    s.usage_used
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
    GREATEST(v_sub.usage_limit - v_sub.usage_used, 0)::INTEGER;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_active_subscription(UUID, TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.consume_job_slot(UUID);

CREATE OR REPLACE FUNCTION public.consume_job_slot(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub RECORD;
BEGIN
  UPDATE public.subscriptions
  SET is_active = FALSE
  WHERE organization_id = p_org_id
    AND is_active = TRUE
    AND end_date < NOW();

  SELECT id, usage_limit, usage_used, end_date
  INTO v_sub
  FROM public.subscriptions
  WHERE organization_id = p_org_id
    AND plan_type IN ('job_slot_basic', 'job_slot_pro', 'job_slot_invite', 'full_access')
    AND is_active = TRUE
    AND end_date >= NOW()
    AND usage_used < usage_limit
  ORDER BY end_date ASC
  LIMIT 1;

  IF v_sub IS NULL THEN
    RAISE EXCEPTION 'NO_AVAILABLE_SLOTS: No active job slot subscription with remaining slots found.';
  END IF;

  UPDATE public.subscriptions
  SET usage_used = usage_used + 1
  WHERE id = v_sub.id;

  INSERT INTO public.job_slots (organization_id, total_slots, used_slots, expires_at)
  VALUES (p_org_id, v_sub.usage_limit, 1, v_sub.end_date)
  ON CONFLICT (organization_id)
  DO UPDATE SET
    used_slots = public.job_slots.used_slots + 1,
    total_slots = GREATEST(public.job_slots.total_slots, v_sub.usage_limit),
    expires_at = GREATEST(public.job_slots.expires_at, v_sub.end_date);

  RETURN jsonb_build_object(
    'success', TRUE,
    'remaining', GREATEST(v_sub.usage_limit - v_sub.usage_used - 1, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_job_slot(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.has_resume_access(UUID);

CREATE OR REPLACE FUNCTION public.has_resume_access(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.subscriptions
  SET is_active = FALSE
  WHERE organization_id = p_org_id
    AND is_active = TRUE
    AND end_date < NOW();

  RETURN EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE organization_id = p_org_id
      AND plan_type IN ('resume_search', 'full_access')
      AND is_active = TRUE
      AND end_date >= NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_resume_access(UUID) TO authenticated;
