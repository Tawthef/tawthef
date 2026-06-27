# Supabase → Prisma Schema Inventory

**Status:** Inventory complete — Prisma models pending full design review (future unit)  
**Source:** All 33 SQL files in `database/`  
**Target:** Cloud SQL PostgreSQL 16, region me-central1

---

## Migration Notes

- All `auth.users(id)` foreign keys map to a `User` model in Prisma backed by Google Cloud Identity Platform UIDs (preserved as the same UUIDs)
- All `gen_random_uuid()` / `uuid_generate_v4()` defaults map to `@default(uuid())`
- All `NOW()` defaults map to `@default(now())`
- Supabase RLS policies are **not** migrated to Prisma — Cloud SQL uses IAM-based access control + NestJS guards
- Supabase RPCs (`SECURITY DEFINER` functions) become NestJS service methods
- Supabase Realtime subscriptions become Pub/Sub events in GCP
- `TIMESTAMPTZ` → `DateTime @db.Timestamptz` in Prisma
- `JSONB` → `Json` in Prisma
- `TEXT[]` → `String[]` in Prisma (PostgreSQL array)
- `UUID` PK → `String @id @db.Uuid` or use `@default(uuid())`

---

## Core User & Organization Tables

### `auth.users` (Supabase-managed → Identity Platform)
- Not in Supabase schema files; managed by Supabase Auth
- GCP replacement: Google Cloud Identity Platform
- UID format: same UUID as existing `auth.users.id` (invariant #24)
- **Prisma strategy:** `User` model with `id String @id @db.Uuid`

### `profiles`
**Source:** `profile_trigger.sql`, `role_security.sql`, `oauth_candidate_profile_schema.sql`, `admin_users_management_enhancements.sql`, `share_banner_onboarding.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | FK → auth.users(id) |
| `full_name` | TEXT | |
| `role` | TEXT | `candidate`, `employer`, `agency`, `expert`, `admin` |
| `organization_id` | UUID | FK → organizations(id) |
| `recruiter_type` | TEXT | `employer` \| `agency` (subset of role) |
| `status` | TEXT | `active` \| `suspended` |
| `email` | TEXT | synced from auth.users |
| `avatar_url` | TEXT | |
| `share_banner_shown` | BOOLEAN | NOT NULL DEFAULT false |
| `verification_status` | TEXT | `pending` \| `verified` \| `rejected` |
| `verification_documents` | TEXT[] | Storage signed-URL references |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**RPC/triggers:** `handle_new_user()` AFTER INSERT on auth.users; `apply_signup_invite_code()` AFTER INSERT on profiles; `guard_recruiter_verification_profile_update()`

### `organizations`
**Source:** `profile_trigger.sql`, `fix_employer_organizations.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT | |
| `type` | TEXT | `employer` \| `agency` |
| `created_at` | TIMESTAMPTZ | |

---

## Jobs & Applications

### `jobs`
**Source:** `role_security.sql`, `public_job_marketplace.sql`, various

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `organization_id` | UUID | FK → organizations(id) |
| `title` | TEXT | |
| `description` | TEXT | |
| `status` | TEXT | `open` \| others |
| `skills` | JSONB/TEXT[] | queried with `&&` operator |
| `keywords` | JSONB/TEXT[] | |
| `location` | TEXT | |
| `salary_min` | NUMERIC | |
| `salary_max` | NUMERIC | |
| `salary_range` | TEXT | display text |
| `experience_level` | TEXT | |
| `job_type` | TEXT | |
| `created_by` | UUID | FK → auth.users(id) |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Triggers:** `audit_job_created()`, `log_job_created_activity()`

### `applications`
**Source:** `role_security.sql`, `application_workflow.sql`, `analytics_schema.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `job_id` | UUID | FK → jobs(id) |
| `candidate_id` | UUID | FK → auth.users(id) |
| `agency_id` | UUID | FK → organizations(id) (nullable) |
| `submitted_by` | UUID | FK → auth.users(id) (nullable) |
| `status` | TEXT | `applied`, `agency_shortlisted`, `hr_shortlisted`, `technical_shortlisted`, `interview`, `offer`, `hired`, `rejected` |
| `applied_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**RPC:** `update_application_status(UUID, TEXT)` — enforces transition rules per role

### `application_status_history`
**Source:** `application_workflow.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `application_id` | UUID | FK → applications(id) ON DELETE CASCADE |
| `old_status` | TEXT | |
| `new_status` | TEXT | |
| `changed_by` | UUID | FK → auth.users(id) |
| `changed_at` | TIMESTAMPTZ | |

---

## Candidate Profile & Resume Tables

### `candidate_profiles`
**Source:** `cv_parsing_schema.sql`, `talent_search_schema.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `candidate_id` | UUID | FK → auth.users(id) |
| `skills` | TEXT[] | GIN indexed |
| `keywords` | TEXT[] | GIN indexed |
| `job_titles` | TEXT[] | GIN indexed |
| `years_experience` | NUMERIC | |
| `location` | TEXT | |
| `education` | TEXT[] | |
| `resume_url` | TEXT | signed URL (private bucket) |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `candidate_resumes`
**Source:** `candidate_resumes_schema.sql`, `candidate_sharing_system.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `candidate_id` | UUID | FK → auth.users(id) |
| `file_name` | TEXT | |
| `file_url` | TEXT | signed URL (private bucket: candidate_resumes) |
| `file_size` | BIGINT | bytes |
| `summary` | TEXT | AI-parsed |
| `skills` | TEXT[] | AI-parsed |
| `experience_json` | JSONB | structured work history |
| `education_json` | JSONB | structured education |
| `projects_json` | JSONB | |
| `certifications_json` | JSONB | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `candidate_job_scores`
**Source:** `cv_parsing_schema.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `candidate_id` | UUID | FK → auth.users(id) |
| `job_id` | UUID | FK → jobs(id) |
| `score` | NUMERIC | 0–100 |
| `updated_at` | TIMESTAMPTZ | |

---

## Subscription & Billing Tables

### `plans`
**Source:** `pricing_schema.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT | |
| `slug` | TEXT UNIQUE | `starter-job-slot`, `growth-job-slots`, `resume-search` |
| `type` | TEXT | `job_posting` \| `resume_access` |
| `price` | DECIMAL(10,2) | USD |
| `duration_days` | INTEGER | |
| `job_slots` | INTEGER | |
| `features` | JSONB | |
| `is_active` | BOOLEAN | |
| `created_at` | TIMESTAMPTZ | |

### `subscriptions`
**Source:** `pricing_schema.sql`, `subscription_system.sql`, `stripe_subscriptions.sql`, `invite_code_system.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `organization_id` | UUID | FK → organizations(id) |
| `plan_id` | UUID | FK → plans(id) |
| `status` | TEXT | `active` \| `expired` \| `cancelled` |
| `plan_type` | TEXT | `job_slot_basic`, `job_slot_pro`, `job_slot_invite`, `resume_search`, `full_access` |
| `is_active` | BOOLEAN | |
| `start_date` | TIMESTAMPTZ | |
| `end_date` | TIMESTAMPTZ | |
| `remaining_slots` | INTEGER | |
| `usage_limit` | INTEGER | |
| `usage_used` | INTEGER | |
| `invite_code_id` | UUID | FK → invite_codes(id) (nullable) |
| `granted_job_slots` | INTEGER | |
| `stripe_customer_id` | TEXT | |
| `stripe_subscription_id` | TEXT | |
| `stripe_price_id` | TEXT | |
| `billing_status` | TEXT | `active`, `canceled`, `past_due`, `pending` |
| `auto_renew` | BOOLEAN | |
| `stripe_session_id` | TEXT | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `job_posting_slots`
**Source:** `pricing_schema.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `subscription_id` | UUID | FK → subscriptions(id) |
| `job_id` | UUID | FK → jobs(id) (nullable) |
| `status` | TEXT | `available` \| `consumed` \| `released` |
| `consumed_at` | TIMESTAMPTZ | |
| `released_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |

### `resume_access`
**Source:** `pricing_schema.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `organization_id` | UUID | FK → organizations(id) |
| `subscription_id` | UUID | FK → subscriptions(id) |
| `start_date` | TIMESTAMPTZ | |
| `end_date` | TIMESTAMPTZ | |
| `is_active` | BOOLEAN | |
| `created_at` | TIMESTAMPTZ | |

### `job_slots`
**Source:** `subscription_system.sql`

| Column | Type | Notes |
|---|---|---|
| `organization_id` | UUID PK | FK → organizations(id) |
| `total_slots` | INTEGER | |
| `used_slots` | INTEGER | |
| `expires_at` | TIMESTAMPTZ | |

---

## Invite Code System

### `invite_codes`
**Source:** `invite_code_system.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `code` | TEXT UNIQUE | normalized to UPPER(BTRIM) |
| `type` | TEXT | `job_slots` \| `full_access` |
| `value` | INTEGER | slots count or access days |
| `expires_at` | TIMESTAMPTZ | |
| `usage_limit` | INTEGER | |
| `used_count` | INTEGER | |
| `created_at` | TIMESTAMPTZ | |

**RPC:** `validate_invite_code(TEXT, TEXT)` — callable by anon; `redeem_invite_code(UUID, TEXT)` — service_role only

---

## Interview & Offer Tables

### `interviews`
**Source:** `notifications_system.sql` (trigger refs), `interview_scheduling_system.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `application_id` | UUID | FK → applications(id) |
| `round` | TEXT | e.g. `hr`, `technical` |
| `scheduled_at` | TIMESTAMPTZ | |
| `interviewer_id` | UUID | FK → auth.users(id) |
| `status` | TEXT | `scheduled`, others |
| `candidate_response` | TEXT | `pending` \| `accepted` \| `declined` |
| `meeting_link` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

**RPC:** `schedule_interview(UUID, TEXT, TIMESTAMPTZ, UUID, TEXT)`, `respond_to_interview(UUID, TEXT)`

### `offers`
**Source:** `notifications_system.sql` (trigger refs), `platform_audit_logging.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `application_id` | UUID | FK → applications(id) |
| `status` | TEXT | `sent` \| `accepted` \| others |
| `salary` | NUMERIC | |
| `currency` | TEXT | |
| `created_by` | UUID | FK → auth.users(id) |
| `sent_at` | TIMESTAMPTZ | |
| `responded_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |

---

## Communication Tables

### `notifications`
**Source:** `notifications_system.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID | FK → auth.users(id) |
| `title` | TEXT | |
| `message` | TEXT | |
| `type` | TEXT | `applications`, `interviews`, `offers`, `messages`, `system` |
| `is_read` | BOOLEAN | DEFAULT false |
| `created_at` | TIMESTAMPTZ | |

Added to `supabase_realtime` publication.

### `messages`
**Source:** `messages_system.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `sender_id` | UUID | FK → auth.users(id) |
| `receiver_id` | UUID | FK → auth.users(id) |
| `message` | TEXT | |
| `is_read` | BOOLEAN | DEFAULT false |
| `created_at` | TIMESTAMPTZ | |

Constraints: non-empty message, no self-message. Added to `supabase_realtime`.

---

## Audit & Activity Logging

### `audit_logs`
**Source:** `platform_audit_logging.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID | FK → auth.users(id) (nullable) |
| `organization_id` | UUID | FK → organizations(id) (nullable) |
| `action` | TEXT | e.g. `job_created`, `candidate_applied` |
| `entity_type` | TEXT | e.g. `job`, `application` |
| `entity_id` | UUID | |
| `metadata` | JSONB | |
| `created_at` | TIMESTAMPTZ | |

Admin-only SELECT. RPC: `log_audit_event()` service_role + authenticated.

### `activity_logs`
**Source:** `hiring_activity_timeline.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `organization_id` | UUID | FK → organizations(id) |
| `user_id` | UUID | FK → auth.users(id) (nullable) |
| `action_type` | TEXT | |
| `entity_type` | TEXT | |
| `entity_id` | UUID | |
| `description` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

Visible to org members (employer/agency) and admins. `log_activity()` is service_role only.

---

## Talent & Collaboration Tables

### `talent_pools`
**Source:** `talent_pools_system.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `organization_id` | UUID | FK → organizations(id) |
| `name` | TEXT | NOT EMPTY constraint |
| `created_at` | TIMESTAMPTZ | |

### `talent_pool_candidates`
**Source:** `talent_pools_system.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `pool_id` | UUID | FK → talent_pools(id) |
| `candidate_id` | UUID | FK → auth.users(id) |
| `created_at` | TIMESTAMPTZ | |

Unique: `(pool_id, candidate_id)`

---

## Sharing & Client Review

### `candidate_shares`
**Source:** `candidate_sharing_system.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `token` | TEXT UNIQUE | random hex (48 chars) |
| `candidate_id` | UUID | FK → auth.users(id) |
| `organization_id` | UUID | FK → organizations(id) |
| `shared_by` | UUID | FK → auth.users(id) |
| `job_id` | UUID | FK → jobs(id) (nullable) |
| `expires_at` | TIMESTAMPTZ | DEFAULT now() + 30 days |
| `is_active` | BOOLEAN | |
| `view_count` | INTEGER | |
| `created_at` | TIMESTAMPTZ | |

RPC: `get_candidate_share_profile(TEXT)` — anon accessible (public share page)

### `client_review_links`
**Source:** `client_review_system.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `token` | TEXT UNIQUE | random hex (48 chars) |
| `job_id` | UUID | FK → jobs(id) |
| `organization_id` | UUID | FK → organizations(id) |
| `created_by` | UUID | FK → auth.users(id) |
| `expires_at` | TIMESTAMPTZ | DEFAULT now() + 30 days |
| `is_active` | BOOLEAN | |
| `view_count` | INTEGER | |
| `created_at` | TIMESTAMPTZ | |

RPC: `get_client_review_sheet(TEXT)` — anon accessible (public review page)

---

## Analytics Views (not tables)

| View | Purpose |
|---|---|
| `analytics_hiring_funnel` | Status counts per job, per org |
| `analytics_time_to_hire` | Avg/min/max days to hire per month |
| `analytics_agency_performance` | Agency submission → hire conversion |
| `analytics_job_progress` | Funnel counts per job |
| `analytics_job_timeline` | Daily application counts per job |
| `analytics_admin_revenue` | Subscription revenue by plan type |
| `analytics_admin_system_stats` | Platform-wide totals |
| `analytics_growth_trend` | Monthly users/jobs/subscriptions (12 months) |
| `admin_subscription_stats` | Per-subscription detail view |
| `candidate_job_matches` | Skill-match score per candidate-job pair |

**Prisma strategy:** Views are read via raw queries or migrated to NestJS service methods using Prisma's `$queryRaw`.

---

## Helper Functions (become NestJS services)

| RPC | Becomes |
|---|---|
| `get_user_role()` | Auth guard reading from JWT claim |
| `get_user_org_id()` | Auth guard reading from profiles |
| `check_active_subscription(org_id, plan)` | SubscriptionService.checkActive() |
| `consume_job_slot(org_id)` | SubscriptionService.consumeSlot() |
| `has_resume_access(org_id)` | SubscriptionService.hasResumeAccess() |
| `search_candidates(skills, keywords, min_exp)` | CandidateService.search() |
| `get_candidate_job_matches(candidate_id)` | CandidateService.getMatches() |
| `update_application_status(app_id, status)` | ApplicationService.updateStatus() |
| `schedule_interview(...)` | InterviewService.schedule() |
| `respond_to_interview(id, response)` | InterviewService.respond() |
| `get_admin_dashboard_data()` | AdminService.getDashboard() |
| `get_job_progress(job_id)` | JobService.getProgress() |
| `create_notification(...)` | NotificationService.create() |
| `send_message(receiver, message)` | MessageService.send() |
| `log_audit_event(...)` | AuditService.log() |
| `log_activity(...)` | ActivityService.log() |
| `validate_invite_code(code, role)` | InviteCodeService.validate() |
| `redeem_invite_code(user_id, code)` | InviteCodeService.redeem() |
| `calculate_profile_strength(candidate_id)` | ProfileService.getStrength() |
| `get_candidate_timeline(app_id)` | ApplicationService.getTimeline() |
| `get_public_jobs(...)` | JobService.getPublicJobs() (anon) |
| `create_candidate_share(...)` | SharingService.createCandidateShare() |
| `create_client_review_link(...)` | SharingService.createReviewLink() |

---

## Storage Buckets (Supabase → Cloud Storage)

| Bucket | Access | Prisma Impact |
|---|---|---|
| `avatars` | Public | Store URL directly in profiles.avatar_url |
| `recruiter_documents` | **Private** | Store object path; generate signed URLs per request |
| `candidate_resumes` | **Private** | Store object path in candidate_resumes.file_url; signed URLs only |
| `candidate_verification_documents` | **Private** | Store object path; signed URLs only |

---

## Table Count Summary

| Category | Tables |
|---|---|
| Core user/org | profiles, organizations |
| Jobs/applications | jobs, applications, application_status_history |
| Candidate | candidate_profiles, candidate_resumes, candidate_job_scores |
| Subscriptions/billing | plans, subscriptions, job_posting_slots, resume_access, job_slots |
| Invite codes | invite_codes |
| Interviews/offers | interviews, offers |
| Communication | notifications, messages |
| Audit/activity | audit_logs, activity_logs |
| Talent & collaboration | talent_pools, talent_pool_candidates |
| Sharing | candidate_shares, client_review_links |
| **Total** | **24 tables** |
