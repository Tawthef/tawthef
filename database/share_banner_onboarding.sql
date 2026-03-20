-- =====================================================
-- SHARE BANNER FIRST-LOGIN GATE
-- =====================================================
-- Run in Supabase SQL Editor.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'share_banner_shown'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN share_banner_shown BOOLEAN;
  END IF;
END $$;

UPDATE public.profiles
SET share_banner_shown = TRUE
WHERE share_banner_shown IS NULL;

ALTER TABLE public.profiles
ALTER COLUMN share_banner_shown SET DEFAULT FALSE;

ALTER TABLE public.profiles
ALTER COLUMN share_banner_shown SET NOT NULL;

