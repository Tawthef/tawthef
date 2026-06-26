# Tawthef AI Development Workflow Rules

## Approach

Build Tawthef incrementally using a specification-driven, production-safe workflow.

The context files define:

- What the product is
- What architecture is allowed
- What UI system must be preserved
- What coding standards apply
- What is currently complete
- What remains uncertain
- What should be implemented next

Do not infer missing business behavior from the client workflow image alone. The image defines product direction, not every database rule, permission, price, status transition, or edge case.

## Required Sequence

Use:

**Think → Simplify → Plan → Build → Review → Test → Ship**

Before code:

1. Read every context file.
2. Read the relevant existing code.
3. Inspect related Supabase migrations, types, policies, and RPCs.
4. Identify the smallest safe feature unit.
5. State assumptions.
6. Add unresolved requirements to `progress-tracker.md`.
7. Define success criteria.

## Scoping Rules

- Work on one feature unit at a time.
- Prefer small, end-to-end increments.
- Do not combine unrelated UI, schema, billing, and AI changes.
- Do not rewrite a complete page when a focused component change is sufficient.
- Do not add a database migration for a visual-only task.
- Do not refactor adjacent modules merely because they could be improved.
- If a unit requires more than five major implementation steps, determine whether it should be split.

## When Work Must Be Split

Split a task when it combines:

- Database schema and an unrelated redesign
- Multiple unrelated routes
- Recruiter and candidate workflows with different permissions
- Recruiter verification and candidate verification
- Subscription enforcement and payment-provider activation
- AI prompt changes and unrelated dashboard changes
- Landing-page marketing and core application behavior
- More than one independent RLS domain
- Behavior not confirmed by product requirements

## Handling Missing Requirements

Never invent:

- Subscription prices
- Billing cycles
- Credit consumption rules
- English-test retake policy
- English-test score thresholds
- Candidate-verification pricing
- Candidate-verification expiry
- Expert responsibilities
- Candidate profile visibility rules
- Recruiter team permissions
- Offer acceptance legal effect
- Onboarding workflow
- Referral rewards
- Stripe activation date

When a requirement is missing:

1. Add it under **Open Questions** in `progress-tracker.md`.
2. Explain the safe options.
3. Ask for a decision before implementing behavior that would be expensive to reverse.

## Repository-First Rule

Before changing a feature:

- Search for existing pages, components, hooks, query keys, types, RPCs, migrations, policies, and tests.
- Reuse the existing implementation.
- Do not create a parallel version.
- Do not assume names from the documentation are exact code paths.
- The repository and deployed schema are the implementation truth; context files are the product and architectural truth.

When they conflict, stop and report the conflict.

## Database-First Safety

Before any schema or policy change:

1. Inspect current tables and columns.
2. Inspect generated types.
3. Inspect existing migrations.
4. Inspect RLS policies.
5. Identify production-data impact.
6. Create a new migration.
7. Include rollback or mitigation notes for risky changes.
8. Test with allowed and denied roles.
9. Update architecture/progress documentation.

## Protected Files and Areas

Do not modify unless directly required:

- Generated shadcn primitives
- Third-party package internals
- Historical applied migrations
- Central Supabase client
- Working authentication guards
- Working React Query hooks unrelated to the task
- Production environment configuration
- Stripe activation flags
- Unrelated CLAUDE/context rules

## Feature Unit Template

For every meaningful unit, define:

### Goal

One outcome.

### Scope

Files and behavior included.

### Non-goals

What is intentionally excluded.

### Assumptions

Only verified assumptions.

### Success Criteria

Observable checks.

### Verification

Commands and browser/database checks.

### Report

- Root cause or requirement
- Files changed
- Database changes
- Security/RLS impact
- Tests performed
- Build result
- Remaining risks
- Progress-tracker update

## Required Quality Gates

Before moving to another unit:

1. The current unit works end to end.
2. No architecture invariant was violated.
3. No production mock data was introduced.
4. React Query patterns remain consistent.
5. RLS and entitlement checks are secure.
6. Loading, error, empty, and success states exist.
7. Mobile and desktop behavior is checked.
8. Relevant tests pass.
9. `npm run build` passes.
10. `context/progress-tracker.md` is updated.

## Browser QA

Use the project’s available browser QA tooling.

Check:

- Happy path
- Permission-denied path
- Empty data
- Loading behavior
- Recoverable failure
- Mobile width
- Desktop width
- Console errors
- Realtime duplication
- Navigation and refresh
- Session restoration where relevant

For visual tasks, compare screenshots before and after.

## Share Banner Workflow

For onboarding share-banner work:

1. Preserve current route and first-login behavior.
2. Identify one visual issue at a time.
3. Use a single composition source for preview and export.
4. Verify 1200 × 1200 export dimensions.
5. Check uploaded avatar and fallback avatar.
6. Check long and short names.
7. Check candidate roles with varying lengths.
8. Check desktop and mobile preview.
9. Verify download, caption copy, and LinkedIn flow.
10. Confirm `share_banner_shown` behavior remains correct.

Do not mix banner polishing with referral database implementation.

## Landing Page Workflow

For product showcase work:

1. Use real application screenshots.
2. Confirm each shown feature exists.
3. Optimize assets.
4. Preserve screenshot legibility.
5. Add accessible carousel controls.
6. Respect reduced motion.
7. Verify mobile behavior.
8. Do not insert production mock metrics.

## English Assessment Workflow

Do not implement until the following are confirmed or intentionally designed:

- Required or optional
- Number of questions
- Time limit
- Retake policy
- Score thresholds
- Question categories
- Randomization
- Attempt history visibility
- Recruiter-visible detail
- Admin question-management model
- Anti-cheating requirements
- Candidate consent and privacy

Then split work:

1. Schema and RLS
2. Admin question management
3. Candidate attempt experience
4. Secure scoring
5. Candidate profile result
6. Recruiter visibility
7. Analytics and audit

## Candidate Verification Workflow

Keep separate from recruiter verification.

Confirm:

- Verification categories
- Who initiates
- Who pays
- Candidate consent
- Reviewer role
- Document storage
- Statuses
- Report visibility
- Expiry
- Appeals/resubmission
- Audit requirements

Then split work:

1. Schema/status model
2. Private storage and RLS
3. Candidate request/upload
4. Expert/admin review queue
5. Quality review
6. Report and profile badge
7. Recruiter-authorized visibility
8. Billing integration, only after rules are approved

## Subscription and Candidate Database Access

Treat as separate layers:

- Recruiter identity
- Organization membership
- Recruiter verification
- Subscription/plan entitlement
- Feature limits
- Candidate visibility
- Audit logging

Do not activate Stripe merely to enforce plans. Existing plans, invite codes, trials, or administrative grants can be enforced independently.

## AI Feature Workflow

For every OpenAI feature:

1. Confirm the existing secure call boundary.
2. Define input and output schema.
3. Minimize personal data sent.
4. Validate output.
5. Provide human review.
6. Handle timeout, rate limit, and invalid output.
7. Prevent duplicate chargeable requests.
8. Audit privacy-safe metadata where needed.
9. Test without exposing secrets.
10. Do not switch providers.

## Documentation Sync

Update:

- `project-overview.md` when product scope changes
- `architecture.md` when boundaries, storage, roles, or invariants change
- `ui-context.md` when shared design rules change
- `code-standards.md` when implementation conventions change
- `progress-tracker.md` after every meaningful unit
- `CLAUDE.md` learned rules when a repeatable mistake or constraint is discovered

Do not update documents merely to create noise. Documentation changes must reflect real decisions or progress.
