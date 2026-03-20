-- =====================================================
-- ADMIN USERS MANAGEMENT ENHANCEMENTS
-- =====================================================
-- Run in Supabase SQL Editor.
-- Adds admin-safe status updates for the users management module.
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_user_status(
  p_user_id UUID,
  p_new_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'FORBIDDEN: Admin access required';
  END IF;

  IF p_new_status NOT IN ('active', 'suspended') THEN
    RAISE EXCEPTION 'INVALID_STATUS: Status must be active or suspended';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'FORBIDDEN: Cannot change your own account status';
  END IF;

  UPDATE public.profiles
  SET status = p_new_status
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: User not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_status(UUID, TEXT) TO authenticated;
