-- =====================================================
-- TALENT POOLS SYSTEM
-- =====================================================
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.talent_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_talent_pools_name_not_empty CHECK (LENGTH(BTRIM(name)) > 0)
);

CREATE TABLE IF NOT EXISTS public.talent_pool_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES public.talent_pools(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_talent_pool_candidates UNIQUE (pool_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_talent_pools_org_created_at
  ON public.talent_pools(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_talent_pool_candidates_pool_created_at
  ON public.talent_pool_candidates(pool_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_talent_pool_candidates_candidate
  ON public.talent_pool_candidates(candidate_id);

ALTER TABLE public.talent_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_pool_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organization members read pools" ON public.talent_pools;
CREATE POLICY "Organization members read pools"
  ON public.talent_pools
  FOR SELECT
  USING (
    organization_id = (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Organization members create pools" ON public.talent_pools;
CREATE POLICY "Organization members create pools"
  ON public.talent_pools
  FOR INSERT
  WITH CHECK (
    organization_id = (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Organization members update pools" ON public.talent_pools;
CREATE POLICY "Organization members update pools"
  ON public.talent_pools
  FOR UPDATE
  USING (
    organization_id = (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id = (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Organization members delete pools" ON public.talent_pools;
CREATE POLICY "Organization members delete pools"
  ON public.talent_pools
  FOR DELETE
  USING (
    organization_id = (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Organization members read pool candidates" ON public.talent_pool_candidates;
CREATE POLICY "Organization members read pool candidates"
  ON public.talent_pool_candidates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.talent_pools tp
      WHERE tp.id = talent_pool_candidates.pool_id
        AND tp.organization_id = (
          SELECT p.organization_id
          FROM public.profiles p
          WHERE p.id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Organization members add pool candidates" ON public.talent_pool_candidates;
CREATE POLICY "Organization members add pool candidates"
  ON public.talent_pool_candidates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.talent_pools tp
      WHERE tp.id = talent_pool_candidates.pool_id
        AND tp.organization_id = (
          SELECT p.organization_id
          FROM public.profiles p
          WHERE p.id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Organization members remove pool candidates" ON public.talent_pool_candidates;
CREATE POLICY "Organization members remove pool candidates"
  ON public.talent_pool_candidates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.talent_pools tp
      WHERE tp.id = talent_pool_candidates.pool_id
        AND tp.organization_id = (
          SELECT p.organization_id
          FROM public.profiles p
          WHERE p.id = auth.uid()
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.talent_pools TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.talent_pool_candidates TO authenticated;

DROP FUNCTION IF EXISTS public.create_talent_pool(TEXT);
CREATE OR REPLACE FUNCTION public.create_talent_pool(
  p_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_org_id UUID;
  v_pool_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Not authenticated';
  END IF;

  IF COALESCE(BTRIM(p_name), '') = '' THEN
    RAISE EXCEPTION 'INVALID_NAME: Pool name is required';
  END IF;

  SELECT p.role, p.organization_id
    INTO v_user_role, v_org_id
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF v_user_role NOT IN ('employer', 'agency', 'admin') OR v_org_id IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: Only organization recruiters can create pools';
  END IF;

  INSERT INTO public.talent_pools (organization_id, name)
  VALUES (v_org_id, BTRIM(p_name))
  RETURNING id INTO v_pool_id;

  RETURN v_pool_id;
END;
$$;

DROP FUNCTION IF EXISTS public.rename_talent_pool(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.rename_talent_pool(
  p_pool_id UUID,
  p_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Not authenticated';
  END IF;

  IF p_pool_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_POOL: Pool is required';
  END IF;

  IF COALESCE(BTRIM(p_name), '') = '' THEN
    RAISE EXCEPTION 'INVALID_NAME: Pool name is required';
  END IF;

  SELECT p.role, p.organization_id
    INTO v_user_role, v_org_id
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF v_user_role NOT IN ('employer', 'agency', 'admin') OR v_org_id IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: Only organization recruiters can rename pools';
  END IF;

  UPDATE public.talent_pools
  SET name = BTRIM(p_name)
  WHERE id = p_pool_id
    AND organization_id = v_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Pool not found';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.delete_talent_pool(UUID);
CREATE OR REPLACE FUNCTION public.delete_talent_pool(
  p_pool_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Not authenticated';
  END IF;

  IF p_pool_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_POOL: Pool is required';
  END IF;

  SELECT p.role, p.organization_id
    INTO v_user_role, v_org_id
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF v_user_role NOT IN ('employer', 'agency', 'admin') OR v_org_id IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: Only organization recruiters can delete pools';
  END IF;

  DELETE FROM public.talent_pools
  WHERE id = p_pool_id
    AND organization_id = v_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Pool not found';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.add_candidate_to_talent_pool(UUID, UUID);
CREATE OR REPLACE FUNCTION public.add_candidate_to_talent_pool(
  p_pool_id UUID,
  p_candidate_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_org_id UUID;
  v_candidate_role TEXT;
  v_row_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Not authenticated';
  END IF;

  IF p_pool_id IS NULL OR p_candidate_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_INPUT: Pool and candidate are required';
  END IF;

  SELECT p.role, p.organization_id
    INTO v_user_role, v_org_id
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF v_user_role NOT IN ('employer', 'agency', 'admin') OR v_org_id IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: Only organization recruiters can add candidates';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.talent_pools tp
    WHERE tp.id = p_pool_id
      AND tp.organization_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Pool is not accessible';
  END IF;

  SELECT p.role
    INTO v_candidate_role
  FROM public.profiles p
  WHERE p.id = p_candidate_id;

  IF v_candidate_role IS DISTINCT FROM 'candidate' THEN
    RAISE EXCEPTION 'INVALID_CANDIDATE: Only candidate users can be added to pools';
  END IF;

  INSERT INTO public.talent_pool_candidates (pool_id, candidate_id)
  VALUES (p_pool_id, p_candidate_id)
  ON CONFLICT (pool_id, candidate_id) DO NOTHING
  RETURNING id INTO v_row_id;

  IF v_row_id IS NULL THEN
    SELECT tpc.id
      INTO v_row_id
    FROM public.talent_pool_candidates tpc
    WHERE tpc.pool_id = p_pool_id
      AND tpc.candidate_id = p_candidate_id
    LIMIT 1;
  END IF;

  RETURN v_row_id;
END;
$$;

DROP FUNCTION IF EXISTS public.remove_candidate_from_talent_pool(UUID, UUID);
CREATE OR REPLACE FUNCTION public.remove_candidate_from_talent_pool(
  p_pool_id UUID,
  p_candidate_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Not authenticated';
  END IF;

  IF p_pool_id IS NULL OR p_candidate_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_INPUT: Pool and candidate are required';
  END IF;

  SELECT p.role, p.organization_id
    INTO v_user_role, v_org_id
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF v_user_role NOT IN ('employer', 'agency', 'admin') OR v_org_id IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: Only organization recruiters can remove candidates';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.talent_pools tp
    WHERE tp.id = p_pool_id
      AND tp.organization_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Pool is not accessible';
  END IF;

  DELETE FROM public.talent_pool_candidates
  WHERE pool_id = p_pool_id
    AND candidate_id = p_candidate_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_talent_pool(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_talent_pool(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_talent_pool(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.rename_talent_pool(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rename_talent_pool(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.rename_talent_pool(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_talent_pool(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_talent_pool(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_talent_pool(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.add_candidate_to_talent_pool(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_candidate_to_talent_pool(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.add_candidate_to_talent_pool(UUID, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.remove_candidate_from_talent_pool(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_candidate_from_talent_pool(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.remove_candidate_from_talent_pool(UUID, UUID) TO authenticated;
