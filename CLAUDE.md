# Agent Instructions

Read this entire file before starting any task.

This project is a **React + TypeScript + Supabase SaaS platform** for recruitment (Tawthef).

It includes:

- Candidate dashboards
- Recruiter dashboards
- Admin panel
- Real-time analytics
- Subscription system
- AI features (CV parsing, ranking, etc.)

Agents must follow architecture, data rules, and UI consistency strictly.

---

# Karpathy Skills

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# Execution Model

How Karpathy Skills and gstack work together in this project.

- Always apply Karpathy principles **before** using any gstack skill — think and simplify first, then execute.
- Prefer the simplest viable solution before reaching for `/autoplan` or writing code.
- Avoid over-engineering during gstack workflows — if a plan grows beyond 5 steps, stop and ask whether the problem can be reframed.
- If a plan becomes complex, invoke `/office-hours` to pressure-test the approach before proceeding.
- The sequence is: **Think → Simplify → Plan → Build → Review → Test → Ship**.

---

# gstack

Fast headless browser for QA, testing, and site dogfooding.

**Rule:** Use `/browse` from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

## Workflow

```
Think → Plan → Build → Review → Test → Ship
```

## Recommended Commands

| Command | Purpose |
|---|---|
| `/office-hours` | Clarify the problem before coding |
| `/autoplan` | Generate a reviewed implementation plan |
| `/review` | Validate code before landing |
| `/qa` | Test behavior in the browser, fix bugs found |
| `/ship` | Finalize, bump version, commit, push |

## Additional Useful Commands

| Command | Purpose |
|---|---|
| `/browse` | Headless browser — navigate, interact, screenshot |
| `/investigate` | Systematic root-cause debugging |
| `/health` | Run type check, lint, and tests in one pass |
| `/design-review` | Visual QA — spacing, hierarchy, mobile issues |
| `/canary` | Post-deploy monitoring for console errors / regressions |
| `/context-save` | Save session state before stopping work |
| `/context-restore` | Resume from a saved session state |

---

# Project Architecture

Frontend

- React (Vite)
- TypeScript
- TailwindCSS
- React Query

Backend

- Supabase (Auth + Database + Storage + Realtime)

---

# Package Manager

Use **npm only**

Do NOT use pnpm, yarn, or bun.

---

# Environment Variables

Required in `.env.local`

VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

Rules:

- Never hardcode credentials
- Never expose service_role keys in frontend
- Only use anon key in client

---

# Database Architecture (Supabase)

Core tables:

profiles  
candidate_profiles  
organizations  
jobs  
applications  
subscriptions  
invite_codes  
audit_logs  

Rules:

- profiles.id MUST match auth.users.id
- Never insert into profiles manually without auth user
- Always create user via Supabase Auth first

---

# Authentication Rules

- Supabase Auth is the source of truth
- profiles table extends user data
- Roles:

candidate  
recruiter  
admin  

Never assume role — always read from profiles.role

---

# Data Fetching Rules

Use **React Query**

Rules:

- Always use hooks (useJobs, useApplications, etc.)
- Do not fetch directly inside components
- Use staleTime: 60000 minimum
- Use realtime subscriptions where needed

---

# Real-Time Rules

Use Supabase subscriptions for:

- jobs
- applications
- admin dashboard metrics

Always invalidate React Query on change.

---

# UI Architecture

Pages:

/dashboard (role-based)
/dashboard/admin
/dashboard/recruiter
/dashboard/candidate

Shared components must live in:

/src/components

Never duplicate UI components.

---

# Dashboard Rules

All dashboards must show **real data from Supabase**

Never use mock data in production.

Admin dashboard must include:

- Total candidates
- Total recruiters
- Active jobs
- Applications
- New users
- Subscription summary
- Most active candidates
- Most active recruiters

---

# Users Management Rules

Admin must be able to:

- Filter users by role
- Activate / suspend users
- Reset password
- Assign roles
- View user activity

All actions must be logged in audit_logs.

---

# Recruiter System Rules

Recruiters include:

- Employers
- Agencies

Recruiters must:

- Be verified before posting jobs
- Upload documents
- Be approved by admin

verification_status:

pending  
verified  
rejected  

---

# Job Management Rules

Admin can:

- View all jobs
- Edit jobs
- Delete jobs
- Filter (Active / Expired / Flagged)

Recruiters:

- Cannot post jobs if not verified
- Are limited by subscription or invite code

---

# Invite Code System

Invite codes can:

- Unlock free plans
- Provide temporary access
- Control onboarding

Rules:

- Validate before signup
- Show clear error messages
- Apply benefits after signup

---

# Subscription Rules

Manage:

- Recruiter plans
- Job posting limits
- Candidate database access

Subscription affects:

- job slots
- features access

---

# Analytics Rules

Admin analytics must include:

- Candidate growth
- Job trends
- Applications volume
- Recruiter activity
- Engagement metrics

Data must come from real DB queries or RPC.

---

# Audit Logging Rules

All important actions must be logged:

- Admin actions
- Job creation/updates
- Candidate access
- Login activity

Use audit_logs table + triggers.

---

# Storage Rules (Supabase)

Buckets:

avatars → profile images  
recruiter_documents → verification files  

Rules:

- Always use correct bucket name
- Ensure RLS policies allow upload
- Store public URLs in DB

---

# Banner Sharing System (Viral Growth)

On first login:

- Redirect to /welcome/share
- Generate banner (1200x1200)

Banner includes:

- Name
- Role
- Profile image
- CTA

Rules:

- Must be visually professional
- Must match brand colors
- Must support download + share

---

# Image & UI Rules

- Use consistent spacing
- Avoid overflow issues (especially mobile)
- Always test mobile + desktop
- Maintain visual hierarchy

---

# Mobile Optimization Rules

- Reduce scrolling
- Use grids where possible
- Ensure no content overflow
- Maintain aspect ratios

---

# Error Handling Rules

Never silently fail.

Always show:

- loading state
- error state
- empty state

---

# Debugging Rules

When debugging data:

console.log relevant fields:

- user id
- role
- query response
- Supabase errors

Never assume DB structure.

---

# Development Rules

Before implementing:

- Check DB schema
- Verify Supabase response
- Reuse existing hooks/components

---

# Safe Refactoring Rules

- Do NOT break existing dashboards
- Do NOT change DB schema without migration
- Do NOT remove working features
- Keep UI consistent

---

# Commands

Install:

npm install

Run:

npm run dev

Type check:

npx tsc --noEmit

Build:

npm run build

---

# Deployment

Frontend: Netlify  
Backend: Supabase  

---

# Self-Correcting Rules Engine

This file evolves over time.

When a mistake happens:

Add a new rule below.

Format:

N. [CATEGORY] Always/Never do X — because Y.

Categories:

STYLE  
CODE  
ARCH  
DATA  
UX  
PROCESS  
TOOL  
OTHER  

Rules:

- Never delete rules
- Newer rule overrides older
- Always read rules before coding

---

# Learned Rules

<!-- New rules are appended below this line. Do not edit above this section. -->

1. [DATA] Never insert into profiles without existing auth.users record — causes foreign key errors.
2. [CODE] Always use Supabase client from central config — avoid multiple instances.
3. [UX] Never ship UI with skeleton-only state — always replace with real data or meaningful fallback.
4. [ARCH] Always use React Query hooks for data — prevents inconsistent fetching logic.
5. [STYLE] Maintain consistent dashboard card layout — avoid redesigning per page.
6. [DATA] Never insert demo data into production tables — use separate seed scripts only.
