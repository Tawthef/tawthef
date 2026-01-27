-- =====================================================
-- ROLE-BASED ACCESS CONTROL (RLS) POLICIES
-- =====================================================
-- FIX: Switched helper functions to 'public' schema to avoid 'permission denied for schema auth'
-- =====================================================

-- Enable RLS on all critical tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Utility function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Utility function to get current user's organization_id
CREATE OR REPLACE FUNCTION public.get_user_org_id() RETURNS uuid AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Grant access to these functions
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_org_id() TO authenticated;

-- =====================================================
-- 1. PROFILES
-- =====================================================
DROP POLICY IF EXISTS "Users view their own profile" ON profiles;
CREATE POLICY "Users view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update their own profile" ON profiles;
CREATE POLICY "Users update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Recruiters view candidates" ON profiles;
CREATE POLICY "Recruiters view candidates" ON profiles
  FOR SELECT USING (
    (public.get_user_role() IN ('employer', 'agency') AND role = 'candidate')
    OR
    public.get_user_role() = 'admin' -- Admins see all
  );

-- =====================================================
-- 2. ORGANIZATIONS
-- =====================================================
DROP POLICY IF EXISTS "View own organization" ON organizations;
CREATE POLICY "View own organization" ON organizations
  FOR SELECT USING (
    id = public.get_user_org_id() 
    OR 
    public.get_user_role() = 'admin'
  );

-- =====================================================
-- 3. JOBS
-- =====================================================
-- READ: 
DROP POLICY IF EXISTS "View Jobs" ON jobs;
CREATE POLICY "View Jobs" ON jobs
  FOR SELECT USING (
    (public.get_user_role() = 'candidate' AND status = 'open')
    OR
    (organization_id = public.get_user_org_id()) -- Employer/Agency seeing their own jobs
    OR
    (public.get_user_role() = 'admin')
  );

-- WRITE (Insert/Update/Delete):
DROP POLICY IF EXISTS "Manage Jobs" ON jobs;
CREATE POLICY "Manage Jobs" ON jobs
  FOR ALL USING (
    organization_id = public.get_user_org_id()
    AND
    public.get_user_role() IN ('employer', 'agency')
  );

-- =====================================================
-- 4. APPLICATIONS
-- =====================================================
-- READ:
DROP POLICY IF EXISTS "View Applications" ON applications;
CREATE POLICY "View Applications" ON applications
  FOR SELECT USING (
    (candidate_id = auth.uid()) -- Own application
    OR
    (EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = applications.job_id 
      AND jobs.organization_id = public.get_user_org_id()
    )) -- Application to a job owned by user's org
    OR
    (public.get_user_role() = 'admin')
  );

-- INSERT:
DROP POLICY IF EXISTS "Create Application" ON applications;
CREATE POLICY "Create Application" ON applications
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'candidate'
    AND
    candidate_id = auth.uid()
  );

-- UPDATE:
DROP POLICY IF EXISTS "Update Application Status" ON applications;
CREATE POLICY "Update Application Status" ON applications
  FOR UPDATE USING (
     EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = applications.job_id 
      AND jobs.organization_id = public.get_user_org_id()
    )
  );
