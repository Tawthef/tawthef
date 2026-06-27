# Tawthef Project Overview

## Overview

Tawthef is a production SaaS recruitment platform connecting candidates with employers and recruitment agencies. It combines candidate profiles, AI-assisted CV creation, job discovery and applications, recruiter candidate search, hiring pipelines, interviews, offers, subscriptions, recruiter verification, candidate assessment, optional candidate verification, messaging, notifications, analytics, and administration in one platform.

The platform serves five system roles:

- Candidate
- Employer
- Agency
- Admin
- Expert

In the user interface, employers and agencies are collectively displayed as **Recruiters**. The underlying database table remains `organizations`.

## Product Goals

1. Give candidates a professional, structured path from registration to hiring.
2. Help verified recruiters discover, evaluate, contact, and hire suitable candidates efficiently.
3. Provide trustworthy candidate information through English assessment and optional verification services.
4. Use AI to assist CV creation, matching, ranking, summaries, and recommendations without replacing human decisions.
5. Provide administrators with reliable controls, auditability, analytics, subscriptions, verification operations, and platform governance.
6. Migrate to a secure, scalable Google Cloud architecture with NestJS as the custom backend, incrementally replacing Supabase-managed services without disrupting the live application.

## Core Candidate Journey

1. Candidate registers using email/password or supported candidate OAuth.
2. Candidate creates and completes a professional profile.
3. Candidate uploads a resume and optionally uses AI parsing and the AI CV Builder.
4. Candidate completes the free English assessment when available.
5. Candidate uploads documents and may request optional candidate verification.
6. Candidate searches for suitable jobs and applies.
7. Candidate receives realtime application, interview, offer, and hiring updates.
8. Candidate attends interviews and reviews offers.
9. Candidate accepts or rejects an offer and proceeds to hiring/onboarding where supported.

## Core Recruiter Journey

1. Employer or agency registers.
2. Recruiter completes organization onboarding and provides an invite code when required.
3. Recruiter selects or receives a subscription, trial, or temporary plan.
4. Recruiter uploads organization verification documents.
5. Admin reviews and approves or rejects recruiter verification.
6. Verified and entitled recruiter posts jobs.
7. Recruiter receives and reviews applications.
8. Recruiter searches the candidate database when entitled.
9. Recruiter evaluates profiles, AI CVs, English results, verification badges, and match information.
10. Recruiter shortlists candidates, schedules interviews, creates offers, and marks successful hires.

## Core Admin Journey

1. Admin monitors platform KPIs and activity.
2. Admin manages users, recruiters, jobs, subscriptions, and invite codes.
3. Admin reviews recruiter verification requests.
4. Admin reviews candidate verification operations when implemented.
5. Admin monitors English-test records and content when implemented.
6. Admin audits important platform actions.
7. Admin uses reports and analytics to monitor growth, engagement, and recruitment outcomes.

## Existing Major Capabilities

### Authentication and Access

- Supabase Auth
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
- Real Supabase data
- KPI cards
- Charts
- Activity timelines
- Quick actions
- Loading and empty states
- Realtime updates

### Candidate

- Candidate profile
- Profile completion and strength
- Resume upload
- AI resume parsing
- AI CV Builder
- Skills
- Experience
- Education
- Smart job recommendations
- Candidate hiring timeline
- Interview and offer timeline integration

### Recruiter

- Recruiter verification
- Job posting restrictions until verified
- Candidate database search restrictions until verified
- Job pipeline Kanban
- Applicants, shortlisted, interview, offer, and hired stages
- Drag and drop
- Realtime updates
- Candidate ranking and matching
- Messaging
- Interview scheduling
- Notifications

### Admin

- Dashboard
- Audit logs
- Invite-code management
- Recruiter verification
- Users foundation
- Recruiters / organizations
- Jobs
- Subscriptions
- Analytics foundation

### Public

- Job marketplace
- Job details
- Candidate application flow
- Candidate onboarding share banner

## Client Workflow Requirements

The client-provided workflow defines these major product areas:

- Candidate dashboard
- Guided AI CV Builder
- Free online English assessment
- Optional candidate verification service
- Paid recruiter candidate-database access
- Recruiter job and application workflow
- Candidate profile snapshot for recruiter review
- Admin user, job, package, verification, test, notification, reporting, and security operations

This workflow is the product vision. Existing functionality must be audited against it before assuming a module is complete.

## Product Features

### Candidate Profiles and CV

- Personal and professional profile
- Skills, education, and experience
- Resume upload
- AI parsing
- AI-assisted professional summary and achievements
- AI CV generation
- Candidate review and editing
- CV availability for applications and authorized recruiter review

### English Assessment

Planned client requirement:

- Free for candidates
- Online
- 50 questions, subject to final confirmation
- Multiple choice
- Automatically scored
- Result added to the candidate profile
- Recruiter-visible result where authorized
- Reading, grammar, vocabulary, and basic comprehension
- Basic, Intermediate, High Intermediate, and Advanced levels

Final attempt limits, timing, question management, anti-cheating measures, and score boundaries remain product decisions to confirm before implementation.

### Candidate Verification

Planned optional service:

- Identity verification
- Education verification
- Experience verification
- Professional certification verification
- Other documents
- Request
- Document review
- Source check
- Quality review
- Report issuance
- Profile status or badge

Candidate verification must remain separate from recruiter verification.

### Jobs and Applications

- Public job discovery
- Job details
- Candidate applications
- Recruiter job management
- Application pipeline
- Shortlisting
- Interviews
- Offers
- Hiring

### Recruiter Candidate Database

Paid and permission-controlled service:

- Candidate search and filters
- Candidate profile review
- CV availability
- English-level visibility
- Candidate-verification visibility
- Shortlists or talent pools
- Contact or invitation actions
- AI-assisted matching and ranking

Access must depend on recruiter verification, subscription entitlement, candidate visibility, RLS, and audit rules.

### Billing and Access

- Subscription plans
- Job slots
- Candidate database access
- Invite-code benefits
- Temporary access
- Free plans
- Stripe integration present but not activated without client approval

### Sharing and Growth

- First-login candidate share banner
- 1200 × 1200 PNG
- Profile image
- Name and role
- Download
- Caption copy
- LinkedIn sharing
- Referral wording
- Recruiter banner planned
- Referral tracking planned

## In Scope

- Existing React/Vite/Supabase application (must remain operational throughout migration)
- Candidate, recruiter, admin, and approved expert workflows
- Supabase Auth, Database, Storage, Realtime, RPC, and RLS (active source of truth until each domain's GCP replacement is verified)
- NestJS modular monolith API (`apps/api`) on Google Cloud Run
- Incremental GCP migration: Firebase Hosting, Cloud Run, Cloud SQL, Identity Platform, Cloud Storage
- OpenAI-powered recruitment assistance
- Responsive web experience
- Real production data
- Audited administrative operations
- Incremental implementation of the client workflow

## Out of Scope Unless Explicitly Approved

- Next.js
- Replacing React Query
- Replacing OpenAI
- Native mobile applications
- Unapproved payment activation
- Unapproved identity or background-check vendors
- Automated final hiring decisions without human control
- Large rewrites of working features
- Production mock data
- Big-bang Supabase replacement (each domain must be migrated and verified independently)

## Current Priority

1. Finalize the onboarding share banner.
2. Audit the current repository and Supabase schema against the client workflow.
3. Replace landing-page placeholders with real platform screenshots.
4. Complete Admin Users Management.
5. Plan English assessment and candidate verification using confirmed requirements.
6. Connect recruiter database access to verification and subscription entitlements.
7. Add recruiter sharing and referral tracking.
8. Activate Stripe only after client approval.
9. Expand analytics, reporting, notifications, billing, and settings.
10. Execute GCP migration incrementally: each domain (database, identity, storage, realtime, payments) in separate approved units; existing system must remain operational throughout.

## Success Criteria

1. Existing working flows remain functional after each release.
2. Every screen uses real data from the active source system.
3. Data fetching is implemented through React Query hooks.
4. Authorization is enforced through RLS, RPC, secure functions, or existing secure boundaries.
5. Candidate and recruiter journeys are understandable end to end.
6. Preview and exported onboarding banner remain visually consistent.
7. Recruiter database access cannot be used without the required verification and entitlement.
8. Candidate private information is not exposed outside approved visibility rules.
9. Important administrative and recruitment actions are auditable.
10. `npm run build` passes after each implementation unit.
11. GCP migration units do not break existing Supabase-powered functionality; each domain replacement passes its own independent verification gate before cutover.
