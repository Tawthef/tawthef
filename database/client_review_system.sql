-- Client Job Review Sheet System
-- Allows recruiters to share a table of submitted candidates with external clients
-- via a secure, time-limited token link.

CREATE TABLE IF NOT EXISTS client_review_links (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token           TEXT        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  job_id          UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by      UUID        NOT NULL REFERENCES auth.users(id),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days',
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  view_count      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE client_review_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members manage review links"
  ON client_review_links
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_client_review_links_token ON client_review_links(token);
CREATE INDEX IF NOT EXISTS idx_client_review_links_job   ON client_review_links(job_id);

-- -----------------------------------------------------------------------
-- RPC: create_client_review_link
-- Authenticated recruiter only. Creates a review link for a job.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_client_review_link(
  p_job_id       UUID,
  p_expires_days INTEGER DEFAULT 30
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_role   TEXT;
  v_token  TEXT;
BEGIN
  SELECT organization_id, role INTO v_org_id, v_role
  FROM profiles WHERE id = auth.uid();

  IF v_org_id IS NULL OR v_role NOT IN ('employer', 'agency', 'admin') THEN
    RAISE EXCEPTION 'Only recruiters can generate client review links';
  END IF;

  IF v_role != 'admin' AND NOT EXISTS (
    SELECT 1
    FROM jobs j
    WHERE j.id = p_job_id
      AND j.organization_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'Job is not available to this recruiter';
  END IF;

  INSERT INTO client_review_links (job_id, organization_id, created_by, expires_at)
  VALUES (p_job_id, v_org_id, auth.uid(), now() + (p_expires_days || ' days')::INTERVAL)
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$$;

-- -----------------------------------------------------------------------
-- RPC: get_client_review_sheet
-- Public (SECURITY DEFINER, anon access). Validates token and returns
-- job details + all submitted candidates as JSONB.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_client_review_sheet(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link   client_review_links%ROWTYPE;
  v_result JSONB;
BEGIN
  SELECT * INTO v_link
  FROM client_review_links
  WHERE token = p_token
    AND is_active = true
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE client_review_links SET view_count = view_count + 1 WHERE id = v_link.id;

  SELECT jsonb_build_object(
    'job_title',        j.title,
    'organization_name', o.name,
    'expires_at',       v_link.expires_at,
    'shared_by_name',   sp.full_name,
    'candidates',       COALESCE(
      (
        WITH ordered_candidates AS (
          SELECT
            ROW_NUMBER() OVER (ORDER BY a.applied_at) AS sr_no,
            p.full_name,
            j2.title                                  AS position_name,
            cp.location,
            cp.years_experience,
            cp.education,
            cp.skills,
            cr.certifications_json,
            ag.name                                   AS agency_name,
            a.applied_at
          FROM applications a
          JOIN profiles p           ON p.id  = a.candidate_id
          JOIN jobs j2              ON j2.id = a.job_id
          LEFT JOIN candidate_profiles cp ON cp.candidate_id = a.candidate_id
          LEFT JOIN candidate_resumes  cr ON cr.candidate_id = a.candidate_id
          LEFT JOIN organizations      ag ON ag.id = a.agency_id
          WHERE a.job_id = v_link.job_id
            AND a.status != 'rejected'
        )
        SELECT jsonb_agg(
          jsonb_build_object(
            'sr_no',            oc.sr_no,
            'full_name',        oc.full_name,
            'position_name',    oc.position_name,
            'location',         oc.location,
            'years_experience', oc.years_experience,
            'education',        oc.education,
            'skills',           oc.skills,
            'certifications',   oc.certifications_json,
            'agency_name',      oc.agency_name,
            'submitted_at',     oc.applied_at
          )
          ORDER BY oc.applied_at
        )
        FROM ordered_candidates oc
      ),
      '[]'::jsonb
    )
  ) INTO v_result
  FROM jobs j
  LEFT JOIN organizations  o  ON o.id  = j.organization_id
  LEFT JOIN profiles       sp ON sp.id = v_link.created_by
  WHERE j.id = v_link.job_id;

  RETURN v_result;
END;
$$;

-- Grant anon access so the public review page works without login
GRANT EXECUTE ON FUNCTION get_client_review_sheet(TEXT) TO anon;

-- -----------------------------------------------------------------------
-- RPC: revoke_client_review_link
-- Deactivates a link immediately.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION revoke_client_review_link(p_link_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id FROM profiles WHERE id = auth.uid();

  UPDATE client_review_links
  SET is_active = false
  WHERE id = p_link_id
    AND organization_id = v_org_id;
END;
$$;
