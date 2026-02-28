-- =====================================================
-- ADMIN USER MANAGEMENT
-- =====================================================
-- Run in Supabase SQL Editor.
-- Enables super admin to manage user roles.
-- =====================================================

-- RPC: List all users with their roles (admin only)
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  organization_name TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'FORBIDDEN: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    u.email,
    p.full_name,
    p.role,
    o.name AS organization_name,
    p.created_at,
    u.last_sign_in_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.organizations o ON o.id = p.organization_id
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;


-- RPC: Update a user's role (admin only)
CREATE OR REPLACE FUNCTION public.update_user_role(
  p_user_id UUID,
  p_new_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only admin can call this
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'FORBIDDEN: Admin access required';
  END IF;

  -- Validate role
  IF p_new_role NOT IN ('candidate', 'employer', 'agency', 'expert', 'admin') THEN
    RAISE EXCEPTION 'INVALID_ROLE: Role must be one of candidate, employer, agency, expert, admin';
  END IF;

  -- Cannot demote yourself
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'FORBIDDEN: Cannot change your own role';
  END IF;

  UPDATE public.profiles
  SET role = p_new_role, updated_at = NOW()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: User not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_role(UUID, TEXT) TO authenticated;
