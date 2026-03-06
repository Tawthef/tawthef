-- =====================================================
-- REAL-TIME NOTIFICATIONS SYSTEM
-- =====================================================
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_is_read
  ON public.notifications(user_id, is_read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;

DROP FUNCTION IF EXISTS public.create_notification(UUID, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_USER_ID';
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    p_user_id,
    COALESCE(NULLIF(BTRIM(p_title), ''), 'Notification'),
    COALESCE(p_message, ''),
    COALESCE(NULLIF(BTRIM(p_type), ''), 'system')
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.notify_application_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_job_title TEXT;
  v_candidate_name TEXT;
  v_recipient_id UUID;
BEGIN
  SELECT j.organization_id, j.title
    INTO v_org_id, v_job_title
  FROM public.jobs j
  WHERE j.id = NEW.job_id;

  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.full_name
    INTO v_candidate_name
  FROM public.profiles p
  WHERE p.id = NEW.candidate_id;

  FOR v_recipient_id IN
    SELECT p.id
    FROM public.profiles p
    WHERE p.organization_id = v_org_id
      AND p.role IN ('employer', 'agency', 'admin')
  LOOP
    PERFORM public.create_notification(
      v_recipient_id,
      'New Application Submitted',
      FORMAT(
        '%s applied for %s.',
        COALESCE(NULLIF(v_candidate_name, ''), 'A candidate'),
        COALESCE(NULLIF(v_job_title, ''), 'a job')
      ),
      'applications'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_candidate_shortlisted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_title TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('agency_shortlisted', 'hr_shortlisted', 'technical_shortlisted') THEN
    RETURN NEW;
  END IF;

  SELECT j.title
    INTO v_job_title
  FROM public.jobs j
  WHERE j.id = NEW.job_id;

  PERFORM public.create_notification(
    NEW.candidate_id,
    'You Were Shortlisted',
    FORMAT(
      'Your application for %s moved to %s.',
      COALESCE(NULLIF(v_job_title, ''), 'this role'),
      INITCAP(REPLACE(NEW.status, '_', ' '))
    ),
    'applications'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_interview_scheduled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_id UUID;
  v_job_title TEXT;
BEGIN
  SELECT a.candidate_id, j.title
    INTO v_candidate_id, v_job_title
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  WHERE a.id = NEW.application_id;

  IF v_candidate_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.create_notification(
    v_candidate_id,
    'Interview Scheduled',
    FORMAT(
      'Your %s interview for %s is scheduled for %s.',
      INITCAP(COALESCE(NEW.round::TEXT, 'next')),
      COALESCE(NULLIF(v_job_title, ''), 'this role'),
      TO_CHAR(NEW.scheduled_at, 'Mon DD, YYYY HH24:MI TZ')
    ),
    'interviews'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_offer_sent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_id UUID;
  v_job_title TEXT;
BEGIN
  IF COALESCE(NEW.status, '') <> 'sent' THEN
    RETURN NEW;
  END IF;

  SELECT a.candidate_id, j.title
    INTO v_candidate_id, v_job_title
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  WHERE a.id = NEW.application_id;

  IF v_candidate_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.create_notification(
    v_candidate_id,
    'Offer Sent',
    FORMAT(
      'You received an offer for %s.',
      COALESCE(NULLIF(v_job_title, ''), 'this role')
    ),
    'offers'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_offer_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_job_title TEXT;
  v_candidate_name TEXT;
  v_recipient_id UUID;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status <> 'accepted' THEN
    RETURN NEW;
  END IF;

  SELECT j.organization_id, j.title, p.full_name
    INTO v_org_id, v_job_title, v_candidate_name
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  LEFT JOIN public.profiles p ON p.id = a.candidate_id
  WHERE a.id = NEW.application_id;

  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  FOR v_recipient_id IN
    SELECT pr.id
    FROM public.profiles pr
    WHERE pr.organization_id = v_org_id
      AND pr.role IN ('employer', 'agency', 'admin')
  LOOP
    PERFORM public.create_notification(
      v_recipient_id,
      'Offer Accepted',
      FORMAT(
        '%s accepted the offer for %s.',
        COALESCE(NULLIF(v_candidate_name, ''), 'A candidate'),
        COALESCE(NULLIF(v_job_title, ''), 'a role')
      ),
      'offers'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_application_submitted ON public.applications;
CREATE TRIGGER trg_notify_application_submitted
AFTER INSERT ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_application_submitted();

DROP TRIGGER IF EXISTS trg_notify_candidate_shortlisted ON public.applications;
CREATE TRIGGER trg_notify_candidate_shortlisted
AFTER UPDATE OF status ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_candidate_shortlisted();

DROP TRIGGER IF EXISTS trg_notify_interview_scheduled ON public.interviews;
CREATE TRIGGER trg_notify_interview_scheduled
AFTER INSERT ON public.interviews
FOR EACH ROW
EXECUTE FUNCTION public.notify_interview_scheduled();

DROP TRIGGER IF EXISTS trg_notify_offer_sent ON public.offers;
CREATE TRIGGER trg_notify_offer_sent
AFTER INSERT ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.notify_offer_sent();

DROP TRIGGER IF EXISTS trg_notify_offer_accepted ON public.offers;
CREATE TRIGGER trg_notify_offer_accepted
AFTER UPDATE OF status ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.notify_offer_accepted();

DO $$
BEGIN
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
  EXCEPTION
    WHEN undefined_object THEN
      NULL;
  END;
END $$;
