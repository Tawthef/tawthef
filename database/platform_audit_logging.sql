-- =====================================================
-- PLATFORM AUDIT LOGGING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created_at
  ON public.audit_logs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at
  ON public.audit_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs(entity_type, entity_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (public.get_user_role() = 'admin');

GRANT SELECT ON public.audit_logs TO authenticated;

DROP FUNCTION IF EXISTS public.log_audit_event(UUID, UUID, TEXT, TEXT, UUID, JSONB);
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id UUID,
  p_org_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_metadata JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  IF COALESCE(BTRIM(p_action), '') = '' THEN
    RETURN NULL;
  END IF;

  IF COALESCE(BTRIM(p_entity_type), '') = '' THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.audit_logs (
    user_id,
    organization_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  VALUES (
    p_user_id,
    p_org_id,
    BTRIM(p_action),
    BTRIM(p_entity_type),
    p_entity_id,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit_event(UUID, UUID, TEXT, TEXT, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_audit_event(UUID, UUID, TEXT, TEXT, UUID, JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.log_audit_event(UUID, UUID, TEXT, TEXT, UUID, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit_event(UUID, UUID, TEXT, TEXT, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_audit_event(UUID, UUID, TEXT, TEXT, UUID, JSONB) TO authenticated;

-- =====================================================
-- Trigger helpers
-- =====================================================

CREATE OR REPLACE FUNCTION public.audit_job_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM public.log_audit_event(
      COALESCE(auth.uid(), NULLIF((to_jsonb(NEW)->>'created_by'), '')::UUID),
      NEW.organization_id,
      'job_created',
      'job',
      NEW.id,
      jsonb_build_object(
        'job_title', NEW.title,
        'status', NEW.status
      )
    );
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_candidate_applied()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT j.organization_id
    INTO v_org_id
  FROM public.jobs j
  WHERE j.id = NEW.job_id;

  BEGIN
    PERFORM public.log_audit_event(
      COALESCE(NULLIF((to_jsonb(NEW)->>'submitted_by'), '')::UUID, NEW.candidate_id, auth.uid()),
      v_org_id,
      'candidate_applied',
      'application',
      NEW.id,
      jsonb_build_object(
        'application_id', NEW.id,
        'job_id', NEW.job_id,
        'candidate_id', NEW.candidate_id,
        'status', NEW.status
      )
    );
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_candidate_shortlisted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('agency_shortlisted', 'hr_shortlisted', 'technical_shortlisted', 'employer_review') THEN
    RETURN NEW;
  END IF;

  SELECT j.organization_id
    INTO v_org_id
  FROM public.jobs j
  WHERE j.id = NEW.job_id;

  BEGIN
    PERFORM public.log_audit_event(
      auth.uid(),
      v_org_id,
      'candidate_shortlisted',
      'application',
      NEW.id,
      jsonb_build_object(
        'application_id', NEW.id,
        'job_id', NEW.job_id,
        'candidate_id', NEW.candidate_id,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_interview_scheduled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_candidate_id UUID;
  v_job_id UUID;
BEGIN
  SELECT j.organization_id, a.candidate_id, a.job_id
    INTO v_org_id, v_candidate_id, v_job_id
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  WHERE a.id = NEW.application_id;

  BEGIN
    PERFORM public.log_audit_event(
      COALESCE(auth.uid(), NEW.interviewer_id),
      v_org_id,
      'interview_scheduled',
      'interview',
      NEW.id,
      jsonb_build_object(
        'interview_id', NEW.id,
        'application_id', NEW.application_id,
        'candidate_id', v_candidate_id,
        'job_id', v_job_id,
        'round', NEW.round,
        'scheduled_at', NEW.scheduled_at
      )
    );
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_offer_sent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_candidate_id UUID;
  v_job_id UUID;
  v_should_log BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'INSERT' AND COALESCE(NEW.status, '') = 'sent' THEN
    v_should_log := TRUE;
  ELSIF TG_OP = 'UPDATE'
    AND NEW.status IS DISTINCT FROM OLD.status
    AND COALESCE(NEW.status, '') = 'sent' THEN
    v_should_log := TRUE;
  END IF;

  IF NOT v_should_log THEN
    RETURN NEW;
  END IF;

  SELECT j.organization_id, a.candidate_id, a.job_id
    INTO v_org_id, v_candidate_id, v_job_id
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  WHERE a.id = NEW.application_id;

  BEGIN
    PERFORM public.log_audit_event(
      COALESCE(NEW.created_by, auth.uid()),
      v_org_id,
      'offer_sent',
      'offer',
      NEW.id,
      jsonb_build_object(
        'offer_id', NEW.id,
        'application_id', NEW.application_id,
        'candidate_id', v_candidate_id,
        'job_id', v_job_id,
        'salary', NEW.salary,
        'currency', NEW.currency,
        'status', NEW.status
      )
    );
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_offer_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_candidate_id UUID;
  v_job_id UUID;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status <> 'accepted' THEN
    RETURN NEW;
  END IF;

  SELECT j.organization_id, a.candidate_id, a.job_id
    INTO v_org_id, v_candidate_id, v_job_id
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  WHERE a.id = NEW.application_id;

  BEGIN
    PERFORM public.log_audit_event(
      COALESCE(auth.uid(), v_candidate_id),
      v_org_id,
      'offer_accepted',
      'offer',
      NEW.id,
      jsonb_build_object(
        'offer_id', NEW.id,
        'application_id', NEW.application_id,
        'candidate_id', v_candidate_id,
        'job_id', v_job_id,
        'status', NEW.status,
        'responded_at', NEW.responded_at
      )
    );
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_job_created ON public.jobs;
CREATE TRIGGER trg_audit_job_created
AFTER INSERT ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.audit_job_created();

DROP TRIGGER IF EXISTS trg_audit_candidate_applied ON public.applications;
CREATE TRIGGER trg_audit_candidate_applied
AFTER INSERT ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.audit_candidate_applied();

DROP TRIGGER IF EXISTS trg_audit_candidate_shortlisted ON public.applications;
CREATE TRIGGER trg_audit_candidate_shortlisted
AFTER UPDATE OF status ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.audit_candidate_shortlisted();

DROP TRIGGER IF EXISTS trg_audit_interview_scheduled ON public.interviews;
CREATE TRIGGER trg_audit_interview_scheduled
AFTER INSERT ON public.interviews
FOR EACH ROW
EXECUTE FUNCTION public.audit_interview_scheduled();

DROP TRIGGER IF EXISTS trg_audit_offer_sent ON public.offers;
CREATE TRIGGER trg_audit_offer_sent
AFTER INSERT OR UPDATE OF status ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.audit_offer_sent();

DROP TRIGGER IF EXISTS trg_audit_offer_accepted ON public.offers;
CREATE TRIGGER trg_audit_offer_accepted
AFTER UPDATE OF status ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.audit_offer_accepted();
