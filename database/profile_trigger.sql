-- =====================================================
-- PROFILE AUTO-CREATION TRIGGER
-- =====================================================
-- This trigger automatically creates a profile when a new user signs up
-- Guarantees no user can exist without a profile and valid role

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role TEXT;
  org_id UUID;
  org_name TEXT;
BEGIN
  -- Extract role from metadata, default to 'candidate'
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'candidate');
  
  -- Validate role
  IF user_role NOT IN ('candidate', 'employer', 'agency', 'admin') THEN
    user_role := 'candidate';
  END IF;
  
  -- If recruiter (employer or agency), create organization
  IF user_role IN ('employer', 'agency') THEN
    -- Get company name from metadata
    org_name := COALESCE(
      NEW.raw_user_meta_data->>'company_name',
      NEW.raw_user_meta_data->>'full_name' || '''s Organization',
      'Unnamed Organization'
    );
    
    -- Create organization
    INSERT INTO public.organizations (
      name,
      type,
      created_at
    )
    VALUES (
      org_name,
      user_role,
      NOW()
    )
    RETURNING id INTO org_id;
  END IF;
  
  -- Create profile
  INSERT INTO public.profiles (
    id,
    full_name,
    role,
    organization_id,
    created_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    user_role,
    org_id,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = COALESCE(EXCLUDED.role, profiles.role),
    organization_id = COALESCE(EXCLUDED.organization_id, profiles.organization_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- PROFILE VALIDATION CONSTRAINTS
-- =====================================================

-- Ensure role is always valid
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'valid_role' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT valid_role 
    CHECK (role IN ('candidate', 'employer', 'agency', 'admin'));
  END IF;
END $$;

-- =====================================================
-- FIX EXISTING BROKEN ACCOUNTS
-- =====================================================

-- Fix users without profiles (create default candidate profiles)
INSERT INTO profiles (id, role, created_at)
SELECT 
  au.id,
  'candidate',
  NOW()
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Fix existing profiles without roles
UPDATE profiles
SET role = 'candidate'
WHERE role IS NULL OR role = '';

-- Fix existing profiles with invalid roles
UPDATE profiles
SET role = 'candidate'
WHERE role NOT IN ('candidate', 'employer', 'agency', 'admin');

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has valid profile
CREATE OR REPLACE FUNCTION public.has_valid_profile(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
      AND role IS NOT NULL
      AND role IN ('candidate', 'employer', 'agency', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- NOTES
-- =====================================================
-- 1. Run this in Supabase SQL Editor
-- 2. Trigger will auto-create profiles for all new signups
-- 3. Existing broken accounts are fixed automatically
-- 4. Role defaults to 'candidate' if not specified or invalid
-- 5. Organizations are auto-created for recruiters
