# Tawthef Progress Tracker

Update this file after every meaningful implementation change.

Last contextual refresh: 2026-06-26

## Current Phase

Production platform under active incremental development.

The application already contains substantial candidate, recruiter, admin, AI, verification, pipeline, and dashboard functionality. Current work is focused on polishing onboarding and aligning the implementation with the detailed client workflow without breaking existing behavior.

## Current Goal

Finalize the candidate onboarding share banner so that:

- The design matches the approved reference more closely.
- Spacing is professional.
- Avatar positioning is stable.
- The thin inner white curved outline is correct.
- Mobile preview matches the desktop composition.
- Export remains exactly 1200 × 1200.
- Preview and export match.
- Existing first-login, avatar, download, caption-copy, LinkedIn, and `share_banner_shown` behavior remains functional.

## Completed

### Architecture and Foundation

- React 18 + TypeScript + Vite frontend
- TailwindCSS and shadcn/ui
- React Query data layer
- Supabase Auth, PostgreSQL, Storage, Realtime, RPC, and RLS
- Netlify deployment
- Netlify Functions where required
- npm-only project rule

### Authentication

- Email/password
- Google OAuth for candidates
- Role-based registration
- Protected routes
- Role-protected routes

### Dashboards

- Candidate dashboard
- Employer dashboard
- Agency dashboard
- Admin dashboard
- Shared dashboard UI
- Reusable KPI cards
- Activity timeline
- Charts
- Quick actions
- Empty states
- Realtime data

### Admin Dashboard

- Total candidates
- Total recruiters
- Active jobs
- Applications submitted
- New registrations
- Subscription summary
- Most active candidates
- Most active recruiters
- Real Supabase data
- No production mock metrics

### Candidate Profile

- Profile completion
- Resume upload
- Skills
- Experience
- Education
- Profile strength
- Missing-section guidance
- AI resume parsing

### Candidate Hiring Timeline

- Candidate timeline RPC
- Interview timeline
- Offer timeline
- Automatic refresh
- Timeline component
- Candidate profile integration
- Job pipeline modal integration

### Recruiter Verification

- Recruiter document upload
- Supabase Storage integration
- `verification_status`
- Pending, verified, and rejected statuses
- Admin approval
- Verified badge
- Job posting blocked until verified
- Resume search blocked until verified

### Job Pipeline

- Kanban pipeline
- Applicants
- Shortlisted
- Interview
- Offer
- Hired
- Drag and drop
- Realtime updates
- Recruiter-only behavior

### Audit Logs

- `audit_logs`
- Relevant triggers
- Admin actions
- Job creation
- Applications
- Interviews
- Offers
- Search/filter foundation

### Invite Codes

- Recruiter invite codes
- Temporary plans
- Free plans
- Validation
- Onboarding integration
- Admin invite management
- Billing and job-slot integration foundation

### Onboarding Share Banner

- `/welcome/share`
- First-login redirect
- 1200 × 1200 export
- PNG download
- Caption copy
- LinkedIn sharing
- Referral caption text
- Profile image upload
- Profile avatar support
- `share_banner_shown`
- White logo
- Removed “Welcome to Tawthef”
- Larger typography
- White border and curved-outline foundation
- Responsive preview foundation

### Admin Modules

- Dashboard
- Audit Logs
- Invite Codes
- Recruiter Verification
- Users foundation
- Recruiters / Organizations
- Jobs
- Subscriptions
- Analytics foundation

### Public

- Public job marketplace
- Job details
- Candidate application flow

### AI

- Resume parsing
- Resume Builder / CV Builder
- Profile summary
- Achievement generation
- Candidate ranking
- Candidate-job matching
- Profile strength
- Smart job recommendations
- OpenAI-only provider rule

## In Progress

### Onboarding Share Banner

Remaining visual work:

- Match reference composition more closely
- Improve spacing
- Improve avatar positioning
- Improve inner white curved outline
- Verify long names and roles
- Ensure mobile preview is a scaled version of the same composition
- Confirm exported image matches preview exactly

### Landing Page

- Replace skeleton/placeholder product previews
- Collect real platform screenshots
- Build responsive product carousel
- Candidate, recruiter, admin, pipeline, and AI-ranking showcase
- Do not present unfinished modules as completed

### Admin

- Complete Users Management
- Continue Analytics completion

## Next Up

1. Finish and regression-test the onboarding share banner.
2. Audit repository and deployed Supabase schema against the client workflow.
3. Build the landing-page screenshot carousel with real images.
4. Complete Admin Users Management.
5. Confirm English-assessment business rules before schema design.
6. Confirm candidate-verification business rules before schema/storage design.
7. Strengthen subscription entitlement enforcement for candidate database access.
8. Add recruiter share banner.
9. Add referral tracking.
10. Activate Stripe only after client approval.
11. Expand analytics, reporting, notification center, billing, and platform settings.

## Open Questions

### English Assessment

- Is the assessment mandatory or optional?
- Is 50 questions final?
- What is the time limit?
- How often can candidates retake it?
- Are previous attempts visible?
- What score boundaries map to each level?
- Are questions manually managed, AI-assisted, or both?
- Which sections are required at launch?
- What anti-cheating measures are required?
- What detail can recruiters see?
- Does the candidate receive a downloadable result or certificate?

### Candidate Verification

- Who performs verification: admin, expert, or external provider?
- Which categories launch first?
- Who pays?
- Can recruiters request verification?
- Is candidate consent required for recruiter requests?
- What are the exact statuses?
- Can verification expire?
- Who can view or download reports?
- What documents are required?
- What is the resubmission/appeal process?
- What private Storage bucket and retention rules will be used?

### Expert Role

- Is the expert a verification reviewer, CV reviewer, coach, test evaluator, interviewer, or a combination?
- Are experts internal or external?
- What records may experts access?
- Is an expert dashboard required?
- Are expert services paid?

### Recruiter Organizations

- Can a user belong to multiple organizations?
- Can an organization contain multiple users?
- Which organization-level roles and permissions are required?
- How should agency client-company jobs be represented?

### Subscriptions and Billing

- Final plan names and prices
- Monthly/yearly/credit model
- Candidate-profile view or contact-credit rules
- Grace-period behavior
- Add-ons
- Credit rollover
- Payment methods beyond Stripe
- Tax and invoice requirements

### Candidate Privacy

- Default profile visibility
- Whether contact details require candidate consent
- Whether candidates see recruiter profile views
- Candidate organization-blocking behavior
- Data export and deletion requirements
- Data/document retention period

### Interviews and Offers

- Calendar/meeting integrations
- Interview scorecards
- Rescheduling rules
- Offer acceptance and signature requirements
- Offer version history
- Post-hire onboarding scope
- Auto-close rules when vacancies are filled

### Referral Program

- Who can refer
- What event counts as success
- Reward rules
- Fraud controls
- Referral link/QR requirements

## Architecture Decisions

1. **[UPDATED 2026-06-26]** Tawthef is migrating incrementally to NestJS (apps/api) + Google Cloud Run + Cloud SQL + Identity Platform + Cloud Storage. The current React/Supabase/Netlify application remains the working production system during migration. No big-bang replacement is allowed.
2. React Query hooks remain the only application data-fetching pattern for the frontend.
3. Employer and agency remain distinct roles but appear as Recruiters in the UI.
4. The `organizations` table will not be renamed.
5. `profiles.id` must match an existing `auth.users.id`.
6. Recruiter verification and candidate verification are separate domains.
7. Recruiter verification and subscription entitlement are separate access checks.
8. OpenAI remains the only approved AI provider.
9. Stripe remains implemented but inactive until client approval.
10. Existing working modules must be extended surgically.
11. Client workflow defines product direction, but unresolved business rules must be confirmed before irreversible implementation.
12. NestJS is approved as the backend framework. The backend is a modular monolith; no microservices.
13. Authentication, database, storage, realtime, and payments must each be migrated separately and approved individually.
14. Supabase remains fully active for all domains until each domain's replacement is live and verified in production.
15. npm workspaces are the required repository structure. Package manager remains npm only.
16. The React frontend stays at the repository root (Option A). Moving it to `apps/web` is a separate future unit requiring explicit approval.
17. New server-side features go into `apps/api`, not into new Netlify Functions.

## Session Notes

- The detailed client workflow introduces or confirms English assessment, optional candidate verification, paid recruiter database access, recruiter review of CV/English/verification, and expanded admin operations.
- Existing documentation previously simplified roles to candidate/recruiter/admin. Project context now preserves the actual roles: candidate, employer, agency, admin, and expert.
- Architecture migration to NestJS + GCP approved 2026-06-26. Context files updated to reflect approved direction.
- Before implementing English assessment or candidate verification, perform a repository/schema gap audit and resolve the open questions above.
- After every implementation unit, add the date, scope, files changed, verification performed, build result, and remaining risk below.

## Implementation Log

### 2026-06-26 — Repository Audit

- Performed complete repository audit for monorepo migration safety.
- Documented current architecture, Supabase dependency map, Netlify dependency map, and migration risks.
- Identified `bun.lockb` (tracked in git, from first commit, Bun used during scaffolding — not active) and `deno.lock` (auto-generated by Netlify CLI edge bootstrap — not active user Deno code).
- Recommended and approved Option A: keep frontend at root, add `apps/api` only.
- No files changed during audit.

### 2026-06-26 — Unit 1: Monorepo Foundation + NestJS Health API

**Scope:** Add npm workspaces to root package.json; create minimal NestJS API under `apps/api`; expose `GET /health`.

**Files created:**
- `apps/api/package.json`
- `apps/api/tsconfig.json`
- `apps/api/tsconfig.build.json`
- `apps/api/nest-cli.json`
- `apps/api/.gitignore`
- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/health/health.module.ts`
- `apps/api/src/health/health.controller.ts`

**Files modified:**
- `package.json` — added `workspaces` field and `api:dev`, `api:build`, `api:start` scripts
- `context/architecture.md` — updated to reflect approved NestJS + GCP migration direction
- `context/progress-tracker.md` — updated architecture decisions and implementation log

**Files not changed:** `src/`, `public/`, `index.html`, `vite.config.ts`, `tailwind.config.ts`, `tsconfig.app.json`, `netlify.toml`, `netlify/functions/`, all Supabase config, all existing routes.

**Health endpoint:** `GET http://localhost:4000/health` → `{ "status": "ok", "service": "tawthef-api" }`

**Build result:** See verification section above.

**Remaining risks:**
- `bun.lockb` and `deno.lock` remain in git. Neither is actively used. Deletion awaiting explicit approval.
- Netlify build with workspaces not yet tested in a real Netlify preview deploy. The root `npm run build` script is unchanged and Netlify reads from the root, so no regression is expected — but a preview deploy is recommended before the next unit.
- `packages/` directory does not exist yet (only listed in workspaces pattern). npm ignores missing workspace globs gracefully.
- No Node version pinned (`.nvmrc` absent). Current local Node: 22.12.0. Recommend adding `.nvmrc` in a follow-up.

### 2026-06-27 — Unit 1.1: Monorepo Stabilization and Netlify Compatibility Verification

**Scope:** Verify Netlify compatibility post-workspaces; pin Node.js version; track context files in git; run clean-install verification; establish git checkpoint.

**Files created:**
- `.nvmrc` — Node.js 22 LTS

**Files modified:**
- `CLAUDE.md` — added required prefix, Code Structure section, NestJS/GCP deployment note, updated commands
- `AGENTS.md` — updated to expanded project-rules format (pre-existing change from /init, included in checkpoint)
- `context/progress-tracker.md` — Unit 1.1 log entry added

**Files now tracked (previously untracked):**
- `context/architecture.md`, `context/progress-tracker.md`, `context/project-overview.md`, `context/ui-context.md`, `context/code-standards.md`, `context/ai-workflow-rules.md`
- `apps/api/**` (all source files; `dist/` excluded by `apps/api/.gitignore`)

**Git checkpoint:** commit `aeab013` — "chore: establish NestJS monorepo foundation"

**Netlify local build result:** PASS — `npm run netlify:build` completed in 13.3s. All 7 Netlify Functions bundled. Frontend built. No workspace-related errors.

**Clean install:** `npm ci` blocked on Windows by VSCode/IDE holding native `.node` (SWC) and `.exe` (esbuild) binaries in memory. This is a Windows dev environment limitation. `npm install` confirmed clean (no changes). Netlify CI (Linux) will run `npm ci` without this constraint.

**Node version:** Pinned to Node.js 22 LTS via `.nvmrc`. All dependencies (Vite 5, NestJS 10, TypeScript 5.8) are compatible. Netlify respects `.nvmrc` automatically.

**Deploy Preview:** READY FOR USER TO TRIGGER — see instructions in Unit 1.1 report.

**Remaining risks:**
- Netlify Deploy Preview not yet triggered. A preview deploy is required before Unit 2 to confirm workspace + Netlify Functions compatibility in the real build environment.
- `bun.lockb` (tracked, from scaffolding) and `deno.lock` (tracked, Netlify CLI artifact) remain in git. Neither is actively used. Deletion awaiting explicit approval.
- `packages/` workspace pattern has no directory yet — npm handles this gracefully.
- `@nestjs/core` <=11.1.17 has a moderate injection vulnerability in the CLI build chain. Does not affect the health-only runtime. Schedule an upgrade to NestJS 11 as a dedicated unit.
