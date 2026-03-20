-- =====================================================
-- RECRUITER VERIFICATION SYSTEM
-- =====================================================
-- Run this in Supabase SQL Editor.
-- Adds recruiter verification fields to profiles, provisions a storage
-- bucket for uploaded documents, and exposes an admin-only RPC to update
-- recruiter verification status.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'verification_status'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN verification_status TEXT DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'verification_documents'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN verification_documents TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
END $$;

UPDATE public.profiles
SET verification_status = 'pending'
WHERE role IN ('employer', 'agency')
  AND COALESCE(verification_status, '') = '';

UPDATE public.profiles
SET verification_documents = ARRAY[]::TEXT[]
WHERE verification_documents IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN verification_status SET DEFAULT 'pending';

ALTER TABLE public.profiles
  ALTER COLUMN verification_documents SET DEFAULT ARRAY[]::TEXT[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_verification_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_verification_status_check
      CHECK (verification_status IN ('pending', 'verified', 'rejected'));
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('recruiter_documents', 'recruiter_documents', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Recruiters upload own verification documents" ON storage.objects;
CREATE POLICY "Recruiters upload own verification documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'recruiter_documents'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND public.get_user_role() IN ('employer', 'agency')
  );

DROP POLICY IF EXISTS "Recruiters update own verification documents" ON storage.objects;
CREATE POLICY "Recruiters update own verification documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'recruiter_documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::TEXT
      OR public.get_user_role() = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'recruiter_documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::TEXT
      OR public.get_user_role() = 'admin'
    )
  );

DROP POLICY IF EXISTS "Recruiters delete own verification documents" ON storage.objects;
CREATE POLICY "Recruiters delete own verification documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'recruiter_documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::TEXT
      OR public.get_user_role() = 'admin'
    )
  );

DROP POLICY IF EXISTS "Authenticated users view recruiter verification documents" ON storage.objects;
CREATE POLICY "Authenticated users view recruiter verification documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'recruiter_documents');

DROP FUNCTION IF EXISTS public.set_recruiter_verification_status(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.guard_recruiter_verification_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.get_user_role() = 'admin' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() <> OLD.id THEN
    NEW.verification_status := OLD.verification_status;
    NEW.verification_documents := OLD.verification_documents;
    RETURN NEW;
  END IF;

  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NEW.verification_status = 'pending' AND COALESCE(OLD.verification_status, 'pending') IN ('pending', 'rejected') THEN
      RETURN NEW;
    END IF;

    NEW.verification_status := OLD.verification_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_recruiter_verification_profile_update ON public.profiles;
CREATE TRIGGER trg_guard_recruiter_verification_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_recruiter_verification_profile_update();

CREATE OR REPLACE FUNCTION public.set_recruiter_verification_status(
  p_profile_id UUID,
  p_status TEXT
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF public.get_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'ADMIN_ONLY';
  END IF;

  IF p_status NOT IN ('pending', 'verified', 'rejected') THEN
    RAISE EXCEPTION 'INVALID_VERIFICATION_STATUS';
  END IF;

  UPDATE public.profiles
  SET verification_status = p_status
  WHERE id = p_profile_id
    AND role IN ('employer', 'agency')
  RETURNING * INTO v_profile;

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'RECRUITER_PROFILE_NOT_FOUND';
  END IF;

  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_recruiter_verification_status(UUID, TEXT) TO authenticated;
