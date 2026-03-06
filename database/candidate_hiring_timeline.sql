-- =====================================================
-- CANDIDATE HIRING TIMELINE RPC
-- =====================================================
-- Returns normalized hiring timeline events for one application.

DROP FUNCTION IF EXISTS public.get_candidate_timeline(UUID);

CREATE OR REPLACE FUNCTION public.get_candidate_timeline(
  p_application_id UUID
)
RETURNS TABLE (
  event_key TEXT,
  event_title TEXT,
  event_order INTEGER,
  event_timestamp TIMESTAMPTZ,
  is_completed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_user_org_id UUID;

  v_candidate_id UUID;
  v_job_org_id UUID;
  v_status TEXT;
  v_applied_at TIMESTAMPTZ;
  v_updated_at TIMESTAMPTZ;

  v_shortlisted_at TIMESTAMPTZ;
  v_interview_scheduled_at TIMESTAMPTZ;
  v_offer_sent_at TIMESTAMPTZ;
  v_offer_accepted_at TIMESTAMPTZ;
  v_hired_at TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  v_user_role := public.get_user_role();
  v_user_org_id := public.get_user_org_id();

  IF v_user_id IS NULL OR v_user_role IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT
    a.candidate_id,
    j.organization_id,
    a.status,
    a.applied_at,
    a.updated_at
  INTO
    v_candidate_id,
    v_job_org_id,
    v_status,
    v_applied_at,
    v_updated_at
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  WHERE a.id = p_application_id;

  IF v_candidate_id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Application not found';
  END IF;

  IF v_user_role = 'candidate' AND v_user_id <> v_candidate_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_user_role IN ('employer', 'agency', 'expert') AND v_user_org_id IS DISTINCT FROM v_job_org_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_user_role NOT IN ('candidate', 'employer', 'agency', 'admin', 'expert') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_status IN (
    'agency_shortlisted',
    'employer_review',
    'hr_shortlisted',
    'technical_shortlisted',
    'interview',
    'offer',
    'hired'
  ) THEN
    v_shortlisted_at := COALESCE(v_updated_at, v_applied_at);
  END IF;

  SELECT MIN(COALESCE(i.created_at, i.scheduled_at))
  INTO v_interview_scheduled_at
  FROM public.interviews i
  WHERE i.application_id = p_application_id;

  IF v_interview_scheduled_at IS NULL AND v_status IN ('interview', 'offer', 'hired') THEN
    v_interview_scheduled_at := v_updated_at;
  END IF;

  SELECT MIN(COALESCE(o.sent_at, o.created_at))
  INTO v_offer_sent_at
  FROM public.offers o
  WHERE o.application_id = p_application_id;

  IF v_offer_sent_at IS NULL AND v_status IN ('offer', 'hired') THEN
    v_offer_sent_at := v_updated_at;
  END IF;

  SELECT MIN(COALESCE(o.responded_at, o.created_at))
  INTO v_offer_accepted_at
  FROM public.offers o
  WHERE o.application_id = p_application_id
    AND o.status = 'accepted';

  IF v_status = 'hired' THEN
    v_hired_at := COALESCE(v_updated_at, v_applied_at);
  END IF;

  RETURN QUERY
  SELECT
    t.event_key,
    t.event_title,
    t.event_order,
    t.event_timestamp,
    (t.event_timestamp IS NOT NULL) AS is_completed
  FROM (
    VALUES
      ('applied'::TEXT, 'Applied'::TEXT, 1, v_applied_at),
      ('shortlisted'::TEXT, 'Shortlisted'::TEXT, 2, v_shortlisted_at),
      ('interview_scheduled'::TEXT, 'Interview Scheduled'::TEXT, 3, v_interview_scheduled_at),
      ('offer_sent'::TEXT, 'Offer Sent'::TEXT, 4, v_offer_sent_at),
      ('offer_accepted'::TEXT, 'Offer Accepted'::TEXT, 5, v_offer_accepted_at),
      ('hired'::TEXT, 'Hired'::TEXT, 6, v_hired_at)
  ) AS t(event_key, event_title, event_order, event_timestamp)
  ORDER BY t.event_order;
END;
$$;

REVOKE ALL ON FUNCTION public.get_candidate_timeline(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_candidate_timeline(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_candidate_timeline(UUID) TO authenticated;
