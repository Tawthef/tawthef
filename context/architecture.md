# Tawthef Architecture Context

## Stack

### Current Production Stack (Active)

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Application UI and client-side routing |
| UI | TailwindCSS + shadcn/ui | Design system and reusable components |
| Server state | React Query | Fetching, caching, invalidation, mutations, and async states |
| Identity | Supabase Auth | Registration, login, OAuth, sessions, and user identity |
| Database | Supabase PostgreSQL | Relational data, constraints, indexes, and transactional state |
| Authorization | Supabase RLS + RPC | Row-level access, business rules, and secure data operations |
| Files | Supabase Storage | Avatars, recruiter verification documents, and approved future private files |
| Realtime | Supabase Realtime | Live jobs, applications, interviews, messages, notifications, and dashboards |
| AI | OpenAI through approved secure boundary | Resume parsing, CV generation, ranking, matching, summaries, and achievements |
| Hosting | Netlify | Frontend deployment |
| Server-side edge tasks | Netlify Functions | Existing approved secret-bearing or server-only operations |
| Package manager | npm | Dependency and script management |

### Approved Target Stack (Migration In Progress)

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Unchanged during migration |
| API | NestJS modular monolith | Incremental backend layer; replaces Netlify Functions over time |
| Database | Cloud SQL (PostgreSQL) | Replaces Supabase PostgreSQL after migration |
| Identity | Google Cloud Identity Platform | Replaces Supabase Auth after migration |
| Files | Google Cloud Storage | Replaces Supabase Storage after migration |
| Background jobs | Cloud Tasks + Cloud Scheduler | Replaces ad-hoc Netlify Functions for async work |
| Events | Pub/Sub | Decouples services for async workflows |
| Batch | Cloud Run Jobs | Replaces Netlify Functions for heavy batch operations |
| Secrets | Secret Manager | Replaces environment-variable secrets management |
| Frontend hosting | Firebase Hosting | Replaces Netlify for the React/Vite SPA (SPA rewrites, global CDN, native Identity Platform integration) |
| API hosting | Google Cloud Run | Hosts the NestJS modular monolith and async job runners |
| Observability | Cloud Logging and Monitoring | Replaces ad-hoc logging |
| Repository structure | npm workspaces monorepo | `apps/api`, `packages/` (frontend stays at repository root) |

## Migration Principles

- The current React/Supabase/Netlify application is the working production system and must remain operational throughout the migration.
- Migration is incremental. No big-bang replacement is allowed.
- Supabase (Auth, Database, Storage, Realtime, RLS, RPC) remains fully active until its replacement has been independently implemented, tested, and approved for each domain.
- Authentication, database, storage, realtime, and payment must each be migrated separately in confirmed units.
- The NestJS API is a modular monolith. Do not introduce microservices.
- No existing working functionality may be removed or disabled until its replacement is live and verified.
- Stripe remains inactive until explicitly approved by the client. Do not activate payment flows.
- npm is the only package manager. Never use pnpm, yarn, or bun.

## Current Repository Structure

```
tawthef/                          ← git root = repository root
├── src/                          ← React frontend (all application code)
├── public/                       ← Static assets
├── netlify/functions/            ← Serverless functions (OpenAI, Polar, Stripe)
├── database/                     ← SQL migration scripts (applied via Supabase SQL editor)
├── context/                      ← Authoritative project documentation
├── apps/
│   └── api/                      ← NestJS API (Unit 1 and forward)
├── packages/                     ← (reserved for shared packages)
├── index.html                    ← Vite entry point
├── package.json                  ← Root workspace package
├── netlify.toml                  ← Netlify deployment config (unchanged during Option A)
└── vite.config.ts                ← Vite config
```

The React frontend currently lives at the repository root (Option A migration approach). Moving the frontend into `apps/web` is a separate future unit requiring explicit approval.

## System Boundaries

Approved code locations:

- `src/pages/` — route-level composition only (React frontend)
- `src/components/` — reusable presentational and shared application components
- `src/components/ui/` — shadcn-generated or shared primitive UI components
- `src/hooks/` — React Query hooks, mutations, and realtime-aware server-state orchestration
- `src/lib/` — central Supabase client, query keys, helpers, validation, and shared utilities
- `netlify/functions/` — existing approved server-only integrations (do not add new functions here; use `apps/api` instead)
- `apps/api/src/` — NestJS modules, controllers, services
- `database/` — SQL migration scripts for Supabase (applied manually)
- `context/` — authoritative project documentation

Do not add new Netlify Functions for new features. New server-side work goes into `apps/api`.

## Core Data Model

Primary tables currently include:

- `profiles`
- `candidate_profiles`
- `organizations`
- `jobs`
- `applications`
- `interviews`
- `offers`
- `subscriptions`
- `messages`
- `notifications`
- `audit_logs`
- `invite_codes`

Additional tables may exist. Always inspect the deployed schema and repository migrations before making assumptions.

## Identity Model

Current: Supabase Auth is the identity source of truth.

- `profiles.id` must equal `auth.users.id`.
- A profile must never be created without an Auth user.
- User role is stored in trusted profile data and must not be inferred from routes or UI.
- Existing registration triggers or onboarding functions must be preserved unless the task explicitly requires a compatible migration.

Target (not yet implemented): Google Cloud Identity Platform.

Do not migrate authentication until Cloud SQL, Cloud Storage, and the NestJS data layer are confirmed ready.

Roles:

- `candidate`
- `employer`
- `agency`
- `admin`
- `expert`

UI grouping:

- `employer` + `agency` = Recruiters
- Database representation continues to use `organizations`

## Organization Model

- Recruiters operate through `organizations`.
- Do not rename the table.
- Organization membership and ownership rules must be inspected before extending team behavior.
- Recruiter verification and subscription entitlement are separate conditions.

## Access-Control Layers

Current (Supabase):

1. Authenticated user exists (Supabase Auth).
2. Profile exists and is active.
3. Role is allowed.
4. Organization membership or ownership is valid.
5. Recruiter verification is valid.
6. Subscription, invite, trial, slot, or feature entitlement is valid.
7. Candidate visibility permits access.
8. Record ownership or relationship permits the operation.

The frontend may explain access state but must not be the enforcement boundary.

## React Query Model

- All application data is accessed through hooks.
- Query keys are centralized and stable.
- Default feature `staleTime` is at least 60 seconds unless documented otherwise.
- Mutations invalidate all affected queries.
- Optimistic updates are allowed only when rollback is safe and existing patterns support it.
- Realtime subscriptions invalidate or reconcile caches.
- Hooks expose loading, error, empty, and data states predictably.

## Realtime Model

Use realtime only for workflows where immediate synchronization matters or where it already exists:

- Jobs
- Applications
- Interviews
- Offers when applicable
- Messages
- Notifications
- Candidate/recruiter pipeline views
- Admin metrics where currently implemented

Requirements:

- One scoped subscription per required channel.
- Clean up subscriptions.
- Prevent duplicate listeners.
- Filter by user, organization, job, or relationship when possible.
- Do not expose unauthorized payloads.
- Invalidate minimal relevant query keys.

## Storage Model

### `avatars`

Stores user profile images.

Rules:

- Ownership must be enforced.
- Replace and delete operations must not affect another user.
- Store durable path metadata where existing code expects it.
- Public URL use is acceptable only if the bucket is intentionally public.

### `recruiter_documents`

Stores recruiter verification documents.

Rules:

- Treat as sensitive.
- Prefer private access and signed URLs.
- Recruiters access their own organization documents.
- Authorized admins access documents for review.
- Public anonymous access is prohibited.

### Candidate Documents

The client workflow requires candidate verification documents, but the final bucket, access model, retention, and expert/admin workflow must be approved before implementation. Do not silently reuse `recruiter_documents`.

## AI Boundary

- OpenAI is the only approved AI provider.
- API credentials must never be placed in Vite client code.
- AI calls use the existing secure function pattern (currently Netlify Functions; future NestJS endpoints).
- Inputs and outputs must respect privacy and retention requirements.
- Candidate-facing generated content must remain reviewable.
- Ranking and matching outputs must be explainable enough for human review where the UI presents a score.
- AI must not make an irreversible hiring decision.
- Protected personal attributes must not be ranking inputs.

## Audit Model

Important actions are recorded in `audit_logs`, either through triggers, RPCs, secure functions, or existing audited services.

Examples:

- Authentication and relevant security events
- Admin actions
- Recruiter verification decisions
- Job creation and material updates
- Applications and status changes
- Interview scheduling and updates
- Offer creation and updates
- Candidate profile access where required
- Subscription or entitlement changes
- Invite-code use
- Candidate-verification decisions when implemented

Audit records must not contain secrets or unnecessary document contents.

## Deployment Model

Current (unchanged during migration):

- Netlify hosts the Vite frontend.
- Supabase hosts Auth, PostgreSQL, Storage, Realtime, and RPC.
- Existing Netlify Functions support approved server-side work.
- npm is the only package manager.
- Environment variables are configured outside source control.
- Stripe remains inactive until client approval.

Target (future, incremental):

- Firebase Hosting serves the React/Vite frontend (SPA rewrites, global CDN).
- Google Cloud Run hosts the NestJS API and async job runners.
- Cloud SQL (PostgreSQL) hosts application data.
- Google Cloud Identity Platform handles authentication.
- Google Cloud Storage handles files.
- Cloud Tasks, Pub/Sub, Cloud Scheduler, and Cloud Run Jobs handle async work.
- Secret Manager handles secrets.
- Three GCP projects: tawthef-dev (development), tawthef-staging (pre-production, anonymized data only), tawthef-prod (production).
- Preferred region: me-central1.

## Architectural Invariants

1. `profiles.id` always matches an existing `auth.users.id` (Supabase Auth period).
2. No direct production mock data.
3. No data fetching directly inside page or feature components.
4. No RLS bypass from browser code.
5. No service-role key in frontend bundles.
6. No renaming of `organizations`.
7. Employer and agency remain distinct database roles but are grouped as Recruiters in UI.
8. Recruiter verification and candidate verification remain separate domains.
9. Recruiter verification and subscription entitlement remain separate access checks.
10. OpenAI remains the only AI provider.
11. Existing working features are extended surgically, not rewritten.
12. Database changes use new migrations; historical migrations are not edited.
13. Realtime changes cannot introduce duplicate subscriptions.
14. Every mutation invalidates or reconciles affected React Query data.
15. Important operations remain auditable.
16. Private candidate and verification data is not publicly exposed.
17. Stripe is not activated without client approval.
18. Each meaningful implementation unit updates `context/progress-tracker.md`.
19. NestJS is approved as the backend framework for `apps/api`.
20. Migration of each domain (auth, database, storage, realtime, payments) must be approved separately before implementation begins.
21. No big-bang Supabase replacement. Supabase remains active until each domain's replacement is verified in production.
22. Firebase Hosting serves the frontend; Cloud Run serves the NestJS API. Cloud Run does not host the frontend.
23. Three GCP projects: tawthef-dev, tawthef-staging, tawthef-prod. Preferred region: me-central1. Verify Cloud Tasks and Cloud Scheduler availability in me-central1 before provisioning; Pub/Sub push subscriptions are the approved fallback.
24. Identity Platform UIDs are the existing Supabase `auth.users.id` UUIDs preserved directly. No mapping table is needed. Password migration attempts bcrypt hash import via the Identity Platform `importUsers` API first; forced password reset is the fallback only.
25. Cloud Run uses the native Cloud SQL connector (Unix socket). PgBouncer is optional and must not be added unless explicitly approved.
26. `recruiter_documents`, `candidate_resumes`, and `candidate_verification_documents` are private. All three buckets use signed URLs. Never generate public URLs for private buckets. `avatars` may remain public only if the bucket is intentionally configured as public.
27. Staging environments use anonymized data only. No real PII in tawthef-dev or tawthef-staging.
28. No new work begins on Netlify Functions or Netlify Deploy Preview during the GCP migration. New server-side features go into `apps/api`.
