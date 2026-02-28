-- =====================================================
-- APPLICATION STATUS WORKFLOW — SQL Migration
-- =====================================================
-- Run this in your Supabase SQL Editor.
-- Implements: status constraint, transition RPC, audit log
-- =====================================================

-- =====================================================
-- 1. ENSURE updated_at COLUMN
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.applications ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- =====================================================
-- 2. STATUS CONSTRAINT (prevent invalid statuses)
-- =====================================================
-- Drop existing constraint if any, then add
DO $$
BEGIN
  ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS chk_application_status;
  ALTER TABLE public.applications ADD CONSTRAINT chk_application_status
    CHECK (status IN (
      'applied',
      'agency_shortlisted',
      'hr_shortlisted',
      'technical_shortlisted',
      'interview',
      'offer',
      'hired',
      'rejected'
    ));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Constraint may already exist or status values conflict. Check your data.';
END $$;

-- =====================================================
-- 3. AUDIT LOG TABLE: application_status_history
-- =====================================================
CREATE TABLE IF NOT EXISTS public.application_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_history_app_id ON application_status_history(application_id);
CREATE INDEX IF NOT EXISTS idx_status_history_changed_at ON application_status_history(changed_at);

ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

-- RLS: users can view history for applications they can see
DROP POLICY IF EXISTS "view_status_history" ON application_status_history;
CREATE POLICY "view_status_history"
  ON application_status_history FOR SELECT
  USING (
    public.get_user_role() IN ('employer', 'agency', 'admin')
  );

-- =====================================================
-- 4. RPC: update_application_status
-- =====================================================
-- Enforces transition rules per role:
--   agency:    applied → agency_shortlisted
--   employer:  agency_shortlisted/applied → hr_shortlisted
--              hr_shortlisted → technical_shortlisted
--              interview → offer
--              offer → hired
--              any → rejected
--   expert:    technical_shortlisted → interview
--              any → rejected
--   admin:     any → any

DROP FUNCTION IF EXISTS public.update_application_status(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.update_application_status(
  p_app_id UUID,
  p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
  v_user_role TEXT;
  v_user_id UUID;
  v_allowed BOOLEAN := FALSE;
BEGIN
  -- Get current user info
  v_user_id := auth.uid();
  v_user_role := public.get_user_role();

  IF v_user_id IS NULL OR v_user_role IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Not authenticated';
  END IF;

  -- Validate new_status is valid
  IF p_new_status NOT IN ('applied','agency_shortlisted','hr_shortlisted','technical_shortlisted','interview','offer','hired','rejected') THEN
    RAISE EXCEPTION 'INVALID_STATUS: "%" is not a valid status', p_new_status;
  END IF;

  -- Get current status
  SELECT status INTO v_current_status
  FROM public.applications
  WHERE id = p_app_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Application not found';
  END IF;

  -- Cannot change if already in terminal state
  IF v_current_status IN ('hired', 'rejected') AND v_user_role != 'admin' THEN
    RAISE EXCEPTION 'TERMINAL_STATUS: Application is already %', v_current_status;
  END IF;

  -- No-op if same status
  IF v_current_status = p_new_status THEN
    RETURN jsonb_build_object('success', TRUE, 'message', 'Status unchanged');
  END IF;

  -- ===== TRANSITION RULES =====

  -- Admin can do anything
  IF v_user_role = 'admin' THEN
    v_allowed := TRUE;

  -- Agency: applied → agency_shortlisted ONLY
  ELSIF v_user_role = 'agency' THEN
    IF v_current_status = 'applied' AND p_new_status = 'agency_shortlisted' THEN
      v_allowed := TRUE;
    END IF;

  -- Employer: multiple transitions
  ELSIF v_user_role = 'employer' THEN
    -- applied/agency_shortlisted → hr_shortlisted
    IF v_current_status IN ('applied', 'agency_shortlisted') AND p_new_status = 'hr_shortlisted' THEN
      v_allowed := TRUE;
    -- hr_shortlisted → technical_shortlisted
    ELSIF v_current_status = 'hr_shortlisted' AND p_new_status = 'technical_shortlisted' THEN
      v_allowed := TRUE;
    -- interview → offer
    ELSIF v_current_status = 'interview' AND p_new_status = 'offer' THEN
      v_allowed := TRUE;
    -- offer → hired
    ELSIF v_current_status = 'offer' AND p_new_status = 'hired' THEN
      v_allowed := TRUE;
    -- any → rejected
    ELSIF p_new_status = 'rejected' THEN
      v_allowed := TRUE;
    END IF;

  -- Expert / Technical reviewer: technical_shortlisted → interview
  ELSIF v_user_role = 'expert' THEN
    IF v_current_status = 'technical_shortlisted' AND p_new_status = 'interview' THEN
      v_allowed := TRUE;
    ELSIF p_new_status = 'rejected' THEN
      v_allowed := TRUE;
    END IF;

  END IF;

  -- Check permission
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'FORBIDDEN: Role "%" cannot transition from "%" to "%"', v_user_role, v_current_status, p_new_status;
  END IF;

  -- ===== PERFORM UPDATE =====
  UPDATE public.applications
  SET status = p_new_status,
      updated_at = NOW()
  WHERE id = p_app_id;

  -- ===== AUDIT LOG =====
  INSERT INTO public.application_status_history (application_id, old_status, new_status, changed_by)
  VALUES (p_app_id, v_current_status, p_new_status, v_user_id);

  RETURN jsonb_build_object(
    'success', TRUE,
    'old_status', v_current_status,
    'new_status', p_new_status,
    'changed_by', v_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_application_status(UUID, TEXT) TO authenticated;

-- =====================================================
-- 5. REVOKE DIRECT UPDATE ON STATUS (optional extra safety)
-- =====================================================
-- This removes any existing UPDATE policies that would let
-- users directly .update() the status column. New updates
-- must go through the RPC function.
-- Note: If you need to keep other UPDATE policies for
-- non-status columns, you may need to adjust these.

-- Uncomment the following to remove direct update access:
-- DROP POLICY IF EXISTS "employer_update_applications" ON applications;
-- DROP POLICY IF EXISTS "agency_update_applications" ON applications;
-- The RPC with SECURITY DEFINER bypasses RLS anyway.
