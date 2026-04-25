-- Candidate Sharing System
-- Allows recruiters (employers/agencies) to share candidate profiles
-- with external clients via secure, time-limited tokens.

CREATE TABLE IF NOT EXISTS candidate_shares (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token           TEXT        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  candidate_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shared_by       UUID        NOT NULL REFERENCES auth.users(id),
  job_id          UUID        REFERENCES jobs(id) ON DELETE SET NULL,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days',
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  view_count      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE candidate_shares ENABLE ROW LEVEL SECURITY;

-- Only members of the same org can manage shares
CREATE POLICY "org members manage shares"
  ON candidate_shares
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_candidate_shares_token ON candidate_shares(token);
CREATE INDEX IF NOT EXISTS idx_candidate_shares_candidate ON candidate_shares(candidate_id);

-- -----------------------------------------------------------------------
-- RPC: get_candidate_share_profile
-- Public (SECURITY DEFINER) — no auth required. Validates token and
-- returns full candidate profile as JSONB, increments view_count.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_candidate_share_profile(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share     candidate_shares%ROWTYPE;
  v_result    JSONB;
BEGIN
  SELECT * INTO v_share
  FROM candidate_shares
  WHERE token = p_token
    AND is_active = true
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE candidate_shares
  SET view_count = view_count + 1
  WHERE id = v_share.id;

  SELECT jsonb_build_object(
    'full_name',          p.full_name,
    'avatar_url',         p.avatar_url,
    'summary',            cr.summary,
    'skills',             cr.skills,
    'experience',         cr.experience_json,
    'education',          cr.education_json,
    'projects',           cr.projects_json,
    'certifications',     cr.certifications_json,
    'years_experience',   cp.years_experience,
    'location',           cp.location,
    'job_title',          (cp.job_titles)[1],
    'languages',          cp.languages,
    'expires_at',         v_share.expires_at,
    'shared_by_name',     sp.full_name,
    'organization_name',  o.name
  ) INTO v_result
  FROM profiles p
  LEFT JOIN candidate_resumes   cr ON cr.candidate_id = p.id
  LEFT JOIN candidate_profiles  cp ON cp.candidate_id = p.id
  LEFT JOIN profiles            sp ON sp.id = v_share.shared_by
  LEFT JOIN organizations        o ON o.id  = v_share.organization_id
  WHERE p.id = v_share.candidate_id;

  RETURN v_result;
END;
$$;

-- Grant public (anon) access so the share page works without login
GRANT EXECUTE ON FUNCTION get_candidate_share_profile(TEXT) TO anon;

-- -----------------------------------------------------------------------
-- RPC: create_candidate_share
-- Authenticated recruiter only. Inserts a share record and returns token.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_candidate_share(
  p_candidate_id  UUID,
  p_job_id        UUID    DEFAULT NULL,
  p_expires_days  INTEGER DEFAULT 30
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
  FROM profiles
  WHERE id = auth.uid();

  IF v_org_id IS NULL OR v_role NOT IN ('employer', 'agency', 'admin') THEN
    RAISE EXCEPTION 'Only recruiters can share candidates';
  END IF;

  IF v_role != 'admin' AND NOT EXISTS (
    SELECT 1
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    WHERE a.candidate_id = p_candidate_id
      AND (p_job_id IS NULL OR a.job_id = p_job_id)
      AND (
        j.organization_id = v_org_id
        OR a.agency_id = v_org_id
      )
  ) THEN
    RAISE EXCEPTION 'Candidate is not available to this recruiter';
  END IF;

  INSERT INTO candidate_shares (
    candidate_id,
    organization_id,
    shared_by,
    job_id,
    expires_at
  )
  VALUES (
    p_candidate_id,
    v_org_id,
    auth.uid(),
    p_job_id,
    now() + (p_expires_days || ' days')::INTERVAL
  )
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$$;

-- -----------------------------------------------------------------------
-- RPC: revoke_candidate_share
-- Deactivates a share so the link stops working immediately.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION revoke_candidate_share(p_share_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id FROM profiles WHERE id = auth.uid();

  UPDATE candidate_shares
  SET is_active = false
  WHERE id = p_share_id
    AND organization_id = v_org_id;
END;
$$;
