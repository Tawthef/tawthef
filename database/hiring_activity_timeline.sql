-- =====================================================
-- HIRING ACTIVITY TIMELINE
-- =====================================================
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_org_created_at
  ON public.activity_logs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
  ON public.activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type
  ON public.activity_logs(action_type);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs
  FOR SELECT
  USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Organization recruiters can view activity logs" ON public.activity_logs;
CREATE POLICY "Organization recruiters can view activity logs"
  ON public.activity_logs
  FOR SELECT
  USING (
    public.get_user_role() IN ('employer', 'agency')
    AND organization_id = public.get_user_org_id()
  );

GRANT SELECT ON public.activity_logs TO authenticated;

DROP FUNCTION IF EXISTS public.log_activity(UUID, UUID, TEXT, TEXT, UUID, TEXT);
CREATE OR REPLACE FUNCTION public.log_activity(
  p_org_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_description TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  IF p_org_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF COALESCE(BTRIM(p_action), '') = '' THEN
    RETURN NULL;
  END IF;

  IF COALESCE(BTRIM(p_entity_type), '') = '' THEN
    RETURN NULL;
  END IF;

  IF COALESCE(BTRIM(p_description), '') = '' THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.activity_logs (
    organization_id,
    user_id,
    action_type,
    entity_type,
    entity_id,
    description
  )
  VALUES (
    p_org_id,
    p_user_id,
    BTRIM(p_action),
    BTRIM(p_entity_type),
    p_entity_id,
    BTRIM(p_description)
  )
  RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_activity(UUID, UUID, TEXT, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_activity(UUID, UUID, TEXT, TEXT, UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.log_activity(UUID, UUID, TEXT, TEXT, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.log_activity(UUID, UUID, TEXT, TEXT, UUID, TEXT) TO service_role;

-- =====================================================
-- Trigger helpers
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_job_created_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_title TEXT;
BEGIN
  v_job_title := COALESCE(NULLIF(BTRIM(NEW.title), ''), 'Untitled job');

  BEGIN
    PERFORM public.log_activity(
      NEW.organization_id,
      COALESCE(auth.uid(), (to_jsonb(NEW)->>'created_by')::UUID),
      'job_posted',
      'job',
      NEW.id,
      FORMAT('Job posted: %s.', v_job_title)
    );
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_candidate_applied_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_job_title TEXT;
  v_candidate_name TEXT;
BEGIN
  SELECT
    j.organization_id,
    COALESCE(NULLIF(BTRIM(j.title), ''), 'a role'),
    COALESCE(NULLIF(BTRIM(p.full_name), ''), 'A candidate')
  INTO
    v_org_id,
    v_job_title,
    v_candidate_name
  FROM public.jobs j
  LEFT JOIN public.profiles p ON p.id = NEW.candidate_id
  WHERE j.id = NEW.job_id;

  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM public.log_activity(
      v_org_id,
      COALESCE((to_jsonb(NEW)->>'submitted_by')::UUID, NEW.candidate_id, auth.uid()),
      'application',
      'application',
      NEW.id,
      FORMAT('%s applied for %s.', v_candidate_name, v_job_title)
    );
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_candidate_shortlisted_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_job_title TEXT;
  v_candidate_name TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('agency_shortlisted', 'hr_shortlisted', 'technical_shortlisted') THEN
    RETURN NEW;
  END IF;

  SELECT
    j.organization_id,
    COALESCE(NULLIF(BTRIM(j.title), ''), 'a role'),
    COALESCE(NULLIF(BTRIM(p.full_name), ''), 'A candidate')
  INTO
    v_org_id,
    v_job_title,
    v_candidate_name
  FROM public.jobs j
  LEFT JOIN public.profiles p ON p.id = NEW.candidate_id
  WHERE j.id = NEW.job_id;

  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM public.log_activity(
      v_org_id,
      COALESCE(auth.uid(), (to_jsonb(NEW)->>'submitted_by')::UUID),
      'application',
      'application',
      NEW.id,
      FORMAT('%s was shortlisted for %s.', v_candidate_name, v_job_title)
    );
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_interview_scheduled_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_job_title TEXT;
  v_candidate_name TEXT;
BEGIN
  SELECT
    j.organization_id,
    COALESCE(NULLIF(BTRIM(j.title), ''), 'a role'),
    COALESCE(NULLIF(BTRIM(p.full_name), ''), 'A candidate')
  INTO
    v_org_id,
    v_job_title,
    v_candidate_name
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  LEFT JOIN public.profiles p ON p.id = a.candidate_id
  WHERE a.id = NEW.application_id;

  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM public.log_activity(
      v_org_id,
      COALESCE(auth.uid(), NEW.interviewer_id),
      'interview',
      'interview',
      NEW.id,
      FORMAT('Interview scheduled for %s (%s).', v_candidate_name, v_job_title)
    );
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_offer_sent_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_job_title TEXT;
  v_candidate_name TEXT;
BEGIN
  IF COALESCE(NEW.status, '') <> 'sent' THEN
    RETURN NEW;
  END IF;

  SELECT
    j.organization_id,
    COALESCE(NULLIF(BTRIM(j.title), ''), 'a role'),
    COALESCE(NULLIF(BTRIM(p.full_name), ''), 'A candidate')
  INTO
    v_org_id,
    v_job_title,
    v_candidate_name
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  LEFT JOIN public.profiles p ON p.id = a.candidate_id
  WHERE a.id = NEW.application_id;

  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM public.log_activity(
      v_org_id,
      COALESCE(NEW.created_by, auth.uid()),
      'offer',
      'offer',
      NEW.id,
      FORMAT('Offer sent to %s for %s.', v_candidate_name, v_job_title)
    );
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_offer_accepted_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_candidate_id UUID;
  v_job_title TEXT;
  v_candidate_name TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status <> 'accepted' THEN
    RETURN NEW;
  END IF;

  SELECT
    j.organization_id,
    a.candidate_id,
    COALESCE(NULLIF(BTRIM(j.title), ''), 'a role'),
    COALESCE(NULLIF(BTRIM(p.full_name), ''), 'A candidate')
  INTO
    v_org_id,
    v_candidate_id,
    v_job_title,
    v_candidate_name
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  LEFT JOIN public.profiles p ON p.id = a.candidate_id
  WHERE a.id = NEW.application_id;

  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM public.log_activity(
      v_org_id,
      COALESCE(auth.uid(), v_candidate_id),
      'offer',
      'offer',
      NEW.id,
      FORMAT('%s accepted the offer for %s.', v_candidate_name, v_job_title)
    );
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_job_created_activity ON public.jobs;
CREATE TRIGGER trg_log_job_created_activity
AFTER INSERT ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.log_job_created_activity();

DROP TRIGGER IF EXISTS trg_log_candidate_applied_activity ON public.applications;
CREATE TRIGGER trg_log_candidate_applied_activity
AFTER INSERT ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.log_candidate_applied_activity();

DROP TRIGGER IF EXISTS trg_log_candidate_shortlisted_activity ON public.applications;
CREATE TRIGGER trg_log_candidate_shortlisted_activity
AFTER UPDATE OF status ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.log_candidate_shortlisted_activity();

DROP TRIGGER IF EXISTS trg_log_interview_scheduled_activity ON public.interviews;
CREATE TRIGGER trg_log_interview_scheduled_activity
AFTER INSERT ON public.interviews
FOR EACH ROW
EXECUTE FUNCTION public.log_interview_scheduled_activity();

DROP TRIGGER IF EXISTS trg_log_offer_sent_activity ON public.offers;
CREATE TRIGGER trg_log_offer_sent_activity
AFTER INSERT ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.log_offer_sent_activity();

DROP TRIGGER IF EXISTS trg_log_offer_accepted_activity ON public.offers;
CREATE TRIGGER trg_log_offer_accepted_activity
AFTER UPDATE OF status ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.log_offer_accepted_activity();
