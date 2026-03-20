-- =====================================================
-- OAUTH CANDIDATE PROFILE FIELDS
-- =====================================================
-- Run in Supabase SQL Editor.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

UPDATE public.profiles AS p
SET
  email = COALESCE(p.email, au.email),
  avatar_url = COALESCE(
    p.avatar_url,
    au.raw_user_meta_data->>'avatar_url',
    au.raw_user_meta_data->>'picture'
  )
FROM auth.users AS au
WHERE au.id = p.id
  AND (
    p.email IS NULL
    OR p.avatar_url IS NULL
  );

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

