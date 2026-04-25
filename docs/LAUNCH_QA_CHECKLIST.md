# Tawthef Launch QA Checklist

Run this before exposing the platform to real users.

## Required Commands

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run netlify:build`
- `npm audit --audit-level=high`

## Environment

- Netlify has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Netlify has `SUPABASE_SERVICE_ROLE_KEY` for serverless functions only.
- Netlify has `OPENAI_API_KEY` for CV and summary generation.
- Netlify has `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, and all `POLAR_PRODUCT_*` IDs.
- Supabase Auth redirect URLs include production and Netlify preview URLs.
- Supabase Storage buckets required by the app exist: `avatars` and `resumes`.
- Public buckets and signed URL rules match the data being exposed.

## Database

- Apply SQL scripts in `database/` to staging first.
- Confirm new SQL scripts are applied: `candidate_sharing_system.sql` and `client_review_system.sql`.
- Confirm RLS is enabled on core tables: `profiles`, `organizations`, `jobs`, `applications`, `interviews`, `offers`, `messages`, `notifications`, `subscriptions`.
- Confirm `profiles.id` rows are created from Supabase Auth users only.
- Confirm no demo data was inserted into production.

## Role QA

- Candidate can register, complete setup, edit profile, build CV, apply to a public job, view applications, receive notifications, and sign out.
- Employer can register, complete recruiter setup, create a job, view pipeline, review candidates, generate a client review link, and purchase a plan.
- Agency can register, submit candidates, manage submissions, create talent pools, share a candidate link, and view relevant dashboards.
- Admin can access only admin routes, manage users, manage recruiters, manage jobs, review audit logs, review billing, and update platform settings.
- Non-admin users cannot access any `/dashboard/admin/*` route.

## Public Link QA

- Expired candidate share link shows the unavailable state.
- Revoked candidate share link shows the unavailable state.
- Valid candidate share link does not expose candidate email.
- Valid client review link does not expose raw CV URLs.
- A recruiter cannot create a candidate share for an unrelated candidate.
- A recruiter cannot create a client review link for a job outside their recruiter account.

## Payment QA

- Pricing page blocks candidates from purchase.
- Recruiter checkout opens Polar checkout.
- Polar webhook activates the matching subscription.
- Payment cancel route renders correctly.
- Payment success route renders correctly.
- Billing page reflects active subscriptions after webhook processing.

## AI QA

- CV parse works with `OPENAI_API_KEY` configured.
- CV parse fallback works when OpenAI returns an error.
- Summary generation works with auth.
- Achievement generation works with auth.
- AI errors show user-visible failure messages.

## Browser QA

- Landing page works on mobile, tablet, and desktop.
- Register/login/account setup work on mobile.
- Dashboard navigation works for every role.
- Tables remain usable on mobile or provide horizontal scrolling.
- No public page logs sensitive data to the console.

## Launch Decision

Launch only when all required commands pass and every P0 checklist item above is verified on staging.
