# Tawthef Code Standards

## General Engineering Rules

- Keep modules focused and small.
- Fix root causes rather than layering workarounds.
- Preserve working behavior.
- Avoid speculative abstractions.
- Match the existing code style.
- Do not combine unrelated changes.
- Remove only unused code introduced by the current task.
- Every implementation unit must have explicit success criteria.

## TypeScript

- Use TypeScript throughout application code.
- Preserve strictness configured by the repository.
- Avoid `any`.
- Prefer generated Supabase database types for frontend queries; prefer Prisma-generated types for NestJS (Cloud SQL) code.
- Define narrow interfaces for derived UI data.
- Treat external input and database JSON as unknown until validated.
- Avoid unsafe type assertions.
- Model nullable database fields honestly.
- Use discriminated unions for multi-state workflows when appropriate.
- Do not duplicate enums that already have a trusted source.

## React

- Use function components.
- Keep route components focused on composition.
- Keep server-state logic out of presentational components.
- Avoid effects for data fetching.
- Avoid storing React Query data in duplicate local state.
- Use memoization only when a measured or clear rendering need exists.
- Clean up effects, timers, object URLs, and realtime subscriptions.
- Preserve accessibility for custom interactive elements.
- Do not use array indexes as keys when stable identifiers exist.

## React Query

- All application data fetching uses hooks.
- Do not call Supabase directly inside pages or feature components.
- Use centralized query keys.
- Use `staleTime: 60000` minimum unless documented otherwise.
- Mutations must invalidate or update all affected queries.
- Handle mutation errors visibly.
- Prevent duplicate submissions.
- Use `enabled` for queries that depend on auth or required identifiers.
- Do not run unauthorized queries while auth state is unresolved.
- Realtime subscriptions should invalidate minimal relevant keys.
- Avoid excessive broad invalidation when targeted invalidation is reliable.

## Supabase Queries

- Use the central Supabase client.
- Select only required fields where practical.
- Handle `{ data, error }` explicitly.
- Never ignore Supabase errors.
- Do not assume a relationship or column exists; inspect generated types/migrations.
- Avoid N+1 query patterns.
- Use RPC for secure multi-step or aggregate operations where appropriate.
- Do not place service-role credentials in client code.
- Do not bypass RLS.
- Use database constraints for invariants that must remain true under concurrency.

## Authentication

- Supabase Auth is the identity source of truth during the migration period; Google Cloud Identity Platform is the approved replacement (migration not yet started).
- `profiles.id` must match `auth.users.id`.
- Read roles from trusted profile data.
- Do not infer authorization from URL paths.
- Do not create profiles manually without an Auth user.
- Preserve existing auth guards and first-login behavior.
- Do not expose authenticated pages before role/profile loading is resolved.

## Authorization

Before protected mutations, enforce applicable checks at a secure boundary:

- Authentication
- Active profile status
- Role
- Ownership
- Organization membership
- Recruiter verification
- Subscription entitlement
- Candidate visibility
- Record relationship

Do not treat disabled UI as authorization.

## Database Migrations

- Use new timestamped migrations.
- Never edit a migration already applied to shared environments.
- Make migrations idempotent where appropriate and safe.
- Include constraints and indexes needed by the feature.
- Review RLS for every new table.
- Review grants and function security for every new RPC.
- Document data backfills.
- Avoid destructive changes without a rollback/data-preservation plan.
- Verify migrations against existing production data assumptions.

## RLS

Every new or changed table must have explicit RLS analysis.

Confirm:

- Who can select?
- Who can insert?
- Who can update?
- Who can delete?
- Which organization or owner relationship applies?
- Which admin access is required?
- Whether private documents need signed URL access?
- Whether realtime publication exposes unauthorized rows?

Do not use a permissive policy as a temporary production fix.

## RPC and Database Functions

- Use RPC for secure transactional operations, aggregates, timelines, and entitlement checks when appropriate.
- Set function security deliberately.
- Use stable parameter names and typed return shapes.
- Validate caller identity inside security-definer functions.
- Minimize privileges.
- Audit important outcomes.
- Avoid returning private fields the caller does not need.

## Netlify Functions

Existing Netlify Functions remain active and must not be broken. Do not add new Netlify Functions for new features — use `apps/api` (NestJS) instead.

Existing functions cover:

- OpenAI API calls
- Existing Stripe integration
- Email or other approved secret-bearing integrations
- Administrative Auth operations that cannot safely run in the browser

Rules:

- Validate authentication.
- Validate role and ownership.
- Validate request body.
- Never trust client-supplied user IDs or organization IDs without verification.
- Do not log secrets or document contents.
- Return consistent error shapes.
- Keep functions narrowly scoped.

## NestJS API

New server-side work goes into `apps/api/src/`.

- Use NestJS modules, controllers, and services.
- Inject dependencies via the NestJS DI container; keep controllers thin.
- Prefer Prisma-generated types once Cloud SQL is the active database.
- Do not place service-role, Cloud SQL credentials, or GCP service account keys in client code.
- Never trust client-supplied user IDs or organization IDs without verification.
- Validate authentication before accessing protected resources.
- Return consistent error shapes.
- Do not add new Netlify Functions for features that belong in `apps/api`.

## OpenAI

- OpenAI only.
- Keep API keys server-side.
- Validate inputs.
- Limit payload size.
- Avoid sending unnecessary personal information.
- Use structured output where existing patterns support it.
- Treat output as untrusted until parsed and validated.
- Allow candidate review of generated CV content.
- Do not invent credentials or experience.
- Do not rank on protected attributes.
- Log only privacy-safe operational metadata.

## Error Handling

Never silently fail.

Every user-facing async workflow must expose:

- Loading
- Error
- Empty
- Success

Error messages should:

- Be understandable
- Avoid leaking internals
- Provide a recovery action where possible
- Preserve entered data
- Distinguish validation, permission, entitlement, network, and server errors where useful

Development logging may include:

- Current authenticated user ID
- Role
- Safe query parameters
- Supabase error metadata
- Query response shape

Do not log access tokens, resumes, verification documents, passwords, or sensitive personal information.

## UI and Styling

- Reuse shared components.
- Use Tailwind and existing design tokens.
- Avoid new hardcoded colors.
- Keep card spacing and status styles consistent.
- Avoid overflow.
- Test desktop and mobile.
- Use semantic HTML.
- Preserve focus and keyboard behavior.
- Respect reduced-motion preferences.
- Do not modify unrelated shadcn primitives.

## Forms and Validation

- Use the existing form and validation approach.
- Validate client-side for usability and server-side/database-side for security.
- Trim and normalize values where appropriate.
- Prevent duplicate submissions.
- Keep server errors mapped to the relevant field or form message.
- Never trust hidden fields for ownership or role.

## Files and Storage

- Verify bucket existence and exact name.
- Enforce ownership with Storage RLS.
- Use unique, predictable object paths.
- Validate file type and size.
- Do not trust filename extensions alone.
- Revoke object URLs.
- Delete replaced files only after the replacement succeeds.
- Use signed URLs for private documents.
- Do not store large binary content in PostgreSQL.

## Realtime

- Scope subscriptions.
- Clean them up.
- Prevent duplicates.
- Invalidate or reconcile React Query cache.
- Avoid reloading entire applications.
- Confirm RLS and publication behavior.
- Do not subscribe before required user/organization context is available.

## Audit Logging

Audit important actions, including:

- Admin mutations
- Verification decisions
- Job creation and material updates
- Application status changes
- Interviews
- Offers
- Subscription and entitlement changes
- Invite-code use
- Sensitive candidate-profile access where required

Audit records should include actor, action, entity, timestamp, and safe metadata.

## File Organization

Follow existing repository structure. Typical guidance:

- `src/components/` — reusable components
- `src/components/ui/` — shared primitives
- `src/hooks/` — React Query and mutation hooks
- `src/lib/` — clients and helpers
- `src/features/` — feature-owned code when the repository uses this pattern
- `src/types/` — shared types
- `netlify/functions/` — existing narrow server-only handlers (do not add new ones)
- `apps/api/src/` — NestJS modules, controllers, services for new server-side work
- `supabase/migrations/` — schema and policy changes (historical; Prisma takes over after Cloud SQL cutover)
- `context/` — project documentation

Do not reorganize the repository unless explicitly requested.

## Verification Checklist

Before completing a unit:

1. Requested behavior works.
2. Existing adjacent behavior still works.
3. Loading, error, empty, and success states are handled.
4. Role and RLS behavior is correct.
5. Realtime behavior does not duplicate.
6. Mobile and desktop are checked.
7. `npx tsc --noEmit` passes when configured.
8. Relevant lint/tests pass when available.
9. `npm run build` passes.
10. `context/progress-tracker.md` is updated.
