-- Fix employer/agency profiles that have no organization_id
-- Reads company_name from auth.users metadata (the original signup value)
-- then creates a matching organization and links the profile.

DO $$
DECLARE
  p              RECORD;
  new_org_id     UUID;
  meta_company   TEXT;
  meta_fullname  TEXT;
  org_name       TEXT;
BEGIN
  FOR p IN
    SELECT pr.id, pr.full_name, pr.role
    FROM   public.profiles pr
    WHERE  pr.role IN ('employer', 'agency')
      AND  pr.organization_id IS NULL
  LOOP
    -- Pull original metadata from auth.users
    SELECT
      raw_user_meta_data->>'company_name',
      raw_user_meta_data->>'full_name'
    INTO meta_company, meta_fullname
    FROM auth.users
    WHERE id = p.id;

    org_name := COALESCE(
      NULLIF(TRIM(meta_company), ''),
      NULLIF(TRIM(meta_fullname), '') || '''s Company',
      NULLIF(TRIM(p.full_name), '') || '''s Company',
      'Unknown Company'
    );

    INSERT INTO public.organizations (name, type, created_at)
    VALUES (org_name, p.role, NOW())
    RETURNING id INTO new_org_id;

    UPDATE public.profiles
    SET organization_id = new_org_id
    WHERE id = p.id;

    RAISE NOTICE 'Fixed profile % (%) → org "%" (%)', p.id, p.role, org_name, new_org_id;
  END LOOP;
END;
$$;
