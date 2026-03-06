-- =====================================================
-- INTERVIEW SCHEDULING SYSTEM
-- =====================================================
-- Adds interview response fields and RPCs for scheduling/responding.

-- 1) Extend interviews table
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS candidate_response TEXT;

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS meeting_link TEXT;

UPDATE public.interviews
SET candidate_response = 'pending'
WHERE candidate_response IS NULL;

ALTER TABLE public.interviews
  ALTER COLUMN candidate_response SET DEFAULT 'pending';

DO $$
BEGIN
  ALTER TABLE public.interviews DROP CONSTRAINT IF EXISTS chk_interviews_candidate_response;
  ALTER TABLE public.interviews DROP CONSTRAINT IF EXISTS interviews_candidate_response_check;
  ALTER TABLE public.interviews
    ADD CONSTRAINT chk_interviews_candidate_response
    CHECK (candidate_response IN ('pending', 'accepted', 'declined'));
END $$;

-- 2) Avoid duplicate candidate notifications when scheduling via RPC
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
  IF current_setting('app.skip_interview_insert_notification', true) = '1' THEN
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

-- 3) RPC: schedule_interview
DROP FUNCTION IF EXISTS public.schedule_interview(UUID, TEXT, TIMESTAMPTZ, UUID);
DROP FUNCTION IF EXISTS public.schedule_interview(UUID, TEXT, TIMESTAMPTZ, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.schedule_interview(
  p_application_id UUID,
  p_round TEXT,
  p_scheduled_at TIMESTAMPTZ,
  p_interviewer_id UUID,
  p_meeting_link TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interview_id UUID;
  v_user_id UUID;
  v_user_role TEXT;
  v_user_org_id UUID;
  v_candidate_id UUID;
  v_candidate_name TEXT;
  v_interviewer_name TEXT;
  v_job_title TEXT;
  v_job_org_id UUID;
BEGIN
  v_user_id := auth.uid();
  v_user_role := public.get_user_role();
  v_user_org_id := public.get_user_org_id();

  IF v_user_id IS NULL OR v_user_role IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Not authenticated';
  END IF;

  IF v_user_role NOT IN ('employer', 'agency', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN: Role "%" cannot schedule interviews', v_user_role;
  END IF;

  IF COALESCE(BTRIM(p_round), '') = '' THEN
    RAISE EXCEPTION 'INVALID_ROUND: Round is required';
  END IF;

  IF p_interviewer_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_INTERVIEWER: Interviewer is required';
  END IF;

  SELECT
    a.candidate_id,
    cp.full_name,
    j.title,
    j.organization_id,
    ip.full_name
  INTO
    v_candidate_id,
    v_candidate_name,
    v_job_title,
    v_job_org_id,
    v_interviewer_name
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  LEFT JOIN public.profiles cp ON cp.id = a.candidate_id
  LEFT JOIN public.profiles ip ON ip.id = p_interviewer_id
  WHERE a.id = p_application_id;

  IF v_candidate_id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Application not found';
  END IF;

  IF v_user_role <> 'admin' AND v_job_org_id IS DISTINCT FROM v_user_org_id THEN
    RAISE EXCEPTION 'FORBIDDEN: Cannot schedule interviews for another organization';
  END IF;

  IF v_user_role <> 'admin' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = p_interviewer_id
        AND p.organization_id = v_user_org_id
    ) THEN
      RAISE EXCEPTION 'INVALID_INTERVIEWER: Interviewer must belong to your organization';
    END IF;
  END IF;

  -- Skip trigger-based candidate notification for this insert; RPC sends both notifications.
  PERFORM set_config('app.skip_interview_insert_notification', '1', true);

  INSERT INTO public.interviews (
    application_id,
    round,
    scheduled_at,
    interviewer_id,
    status,
    candidate_response,
    meeting_link
  )
  VALUES (
    p_application_id,
    p_round,
    p_scheduled_at,
    p_interviewer_id,
    'scheduled',
    'pending',
    NULLIF(BTRIM(p_meeting_link), '')
  )
  RETURNING id INTO v_interview_id;

  PERFORM public.create_notification(
    v_candidate_id,
    'Interview Scheduled',
    FORMAT(
      'Your %s interview for %s is scheduled for %s.',
      INITCAP(p_round),
      COALESCE(NULLIF(v_job_title, ''), 'this role'),
      TO_CHAR(p_scheduled_at, 'Mon DD, YYYY HH24:MI TZ')
    ),
    'interviews'
  );

  PERFORM public.create_notification(
    p_interviewer_id,
    'New Interview Assigned',
    FORMAT(
      '%s has a %s interview for %s on %s.',
      COALESCE(NULLIF(v_candidate_name, ''), 'A candidate'),
      INITCAP(p_round),
      COALESCE(NULLIF(v_job_title, ''), 'a role'),
      TO_CHAR(p_scheduled_at, 'Mon DD, YYYY HH24:MI TZ')
    ),
    'interviews'
  );

  RETURN v_interview_id;
END;
$$;

REVOKE ALL ON FUNCTION public.schedule_interview(UUID, TEXT, TIMESTAMPTZ, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.schedule_interview(UUID, TEXT, TIMESTAMPTZ, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.schedule_interview(UUID, TEXT, TIMESTAMPTZ, UUID, TEXT) TO authenticated;

-- 4) RPC: respond_to_interview (candidate accept/decline)
DROP FUNCTION IF EXISTS public.respond_to_interview(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.respond_to_interview(
  p_interview_id UUID,
  p_response TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_interviewer_id UUID;
  v_candidate_name TEXT;
  v_job_title TEXT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Not authenticated';
  END IF;

  IF p_response NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'INVALID_RESPONSE: Must be accepted or declined';
  END IF;

  UPDATE public.interviews i
  SET candidate_response = p_response
  FROM public.applications a
  WHERE i.id = p_interview_id
    AND a.id = i.application_id
    AND a.candidate_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FORBIDDEN: You cannot respond to this interview';
  END IF;

  SELECT
    i.interviewer_id,
    p.full_name,
    j.title
  INTO
    v_interviewer_id,
    v_candidate_name,
    v_job_title
  FROM public.interviews i
  JOIN public.applications a ON a.id = i.application_id
  LEFT JOIN public.profiles p ON p.id = a.candidate_id
  JOIN public.jobs j ON j.id = a.job_id
  WHERE i.id = p_interview_id;

  IF v_interviewer_id IS NOT NULL THEN
    PERFORM public.create_notification(
      v_interviewer_id,
      'Interview Response Updated',
      FORMAT(
        '%s %s the interview for %s.',
        COALESCE(NULLIF(v_candidate_name, ''), 'A candidate'),
        p_response,
        COALESCE(NULLIF(v_job_title, ''), 'this role')
      ),
      'interviews'
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_interview(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.respond_to_interview(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.respond_to_interview(UUID, TEXT) TO authenticated;
