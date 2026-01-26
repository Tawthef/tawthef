-- Pricing & Packages System Database Schema
-- This file contains the SQL schema for the recruiter pricing system
-- Run this in your Supabase SQL editor to create the necessary tables

-- =====================================================
-- 1. PLANS TABLE
-- =====================================================
-- Stores available package definitions

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('job_posting', 'resume_access')),
  price DECIMAL(10,2) NOT NULL,
  duration_days INTEGER NOT NULL,
  job_slots INTEGER DEFAULT 0,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data for plans
INSERT INTO plans (name, slug, type, price, duration_days, job_slots, features) VALUES
('Starter Job Slot', 'starter-job-slot', 'job_posting', 100, 30, 1, 
  '["1 active job posting", "Full applicant tracking", "Candidate shortlisting"]'::jsonb),
('Growth Job Slots', 'growth-job-slots', 'job_posting', 300, 90, 10, 
  '["10 active job posting slots", "Full analytics & reports", "Agency collaboration"]'::jsonb),
('Resume Search', 'resume-search', 'resume_access', 500, 30, 0, 
  '["Search qualified candidates", "View CV/Resume profiles", "Filter by skills, experience, keywords"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 2. SUBSCRIPTIONS TABLE
-- =====================================================
-- Tracks active subscriptions for each organization

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  remaining_slots INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);

-- =====================================================
-- 3. JOB POSTING SLOTS TABLE (Optional - for detailed tracking)
-- =====================================================
-- Tracks individual slot usage

CREATE TABLE IF NOT EXISTS job_posting_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'consumed', 'released')),
  consumed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_slots_subscription ON job_posting_slots(subscription_id);
CREATE INDEX IF NOT EXISTS idx_job_slots_job ON job_posting_slots(job_id);

-- =====================================================
-- 4. RESUME ACCESS TABLE
-- =====================================================
-- Tracks resume search access periods

CREATE TABLE IF NOT EXISTS resume_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resume_access_org ON resume_access(organization_id);
CREATE INDEX IF NOT EXISTS idx_resume_access_active ON resume_access(is_active);
CREATE INDEX IF NOT EXISTS idx_resume_access_end_date ON resume_access(end_date);

-- =====================================================
-- 5. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Plans: Public read access
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are viewable by everyone"
  ON plans FOR SELECT
  USING (is_active = true);

-- Subscriptions: Organizations can only see their own
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Organizations can insert own subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Resume Access: Organizations can only see their own
ALTER TABLE resume_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations can view own resume access"
  ON resume_access FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Organizations can insert own resume access"
  ON resume_access FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Job Posting Slots: Organizations can view their own
ALTER TABLE job_posting_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations can view own job slots"
  ON job_posting_slots FOR SELECT
  USING (
    subscription_id IN (
      SELECT id FROM subscriptions WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- =====================================================
-- 6. FUNCTIONS (Optional - for automated expiration)
-- =====================================================

-- Function to expire subscriptions
CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET status = 'expired'
  WHERE status = 'active'
    AND end_date < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to deactivate resume access
CREATE OR REPLACE FUNCTION deactivate_resume_access()
RETURNS void AS $$
BEGIN
  UPDATE resume_access
  SET is_active = false
  WHERE is_active = true
    AND end_date < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. Run this script in Supabase SQL Editor
-- 2. Ensure 'organizations' and 'jobs' tables exist first
-- 3. For production, set up cron jobs to run expiration functions
-- 4. Consider adding triggers for automatic slot management
