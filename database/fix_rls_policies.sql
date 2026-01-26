-- =====================================================
-- FIX RLS POLICIES FOR PROFILES TABLE
-- =====================================================
-- This fixes the infinite recursion issue in RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Organizations can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Organizations can insert own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Organizations can view own resume access" ON resume_access;
DROP POLICY IF EXISTS "Organizations can insert own resume access" ON resume_access;

-- Recreate policies without recursion
-- Subscriptions: Use auth.uid() directly instead of subquery
CREATE POLICY "Users can view own organization subscriptions"
  ON subscriptions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own organization subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Resume Access: Use auth.uid() directly
CREATE POLICY "Users can view own organization resume access"
  ON resume_access FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own organization resume access"
  ON resume_access FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- ENSURE PROFILES TABLE HAS PROPER POLICIES
-- =====================================================

-- Enable RLS if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing profile policies to recreate them properly
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile (for trigger)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- NOTES
-- =====================================================
-- Run this script in Supabase SQL Editor to fix RLS policies
-- This will resolve the "infinite recursion" error
