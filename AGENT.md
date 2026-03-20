# Agent Instructions

Read this entire file before starting any task.

This project is a **production-grade recruitment platform called Tawthef**.  
It uses **Supabase + React + Vite + TypeScript + Tailwind + shadcn/ui**.

Agents must follow the architecture and rules defined below to avoid breaking
existing functionality.

---

# Self-Correcting Rules Engine

This file contains a growing ruleset that improves over time.

At session start, read the entire "Learned Rules" section before doing anything.

## How it works

When the user corrects you or you make a mistake, immediately append a new rule
to the "Learned Rules" section at the bottom of this file.

Rules are numbered sequentially and written as clear, imperative instructions.

Format:

N. [CATEGORY] Never/Always do X - because Y.

Categories:

STYLE  
CODE  
ARCH  
TOOL  
PROCESS  
DATA  
UX  
OTHER  

Before starting any task, scan all rules below for relevant constraints.

If two rules conflict, the higher-numbered rule wins.

Never delete rules. If a rule becomes obsolete, append a new rule that supersedes it.

---

# Project Overview

Platform Name:

Tawthef

Purpose:

AI-powered recruitment platform connecting candidates and recruiters.

User roles:

Candidate  
Employer  
Recruitment Agency  
Admin  

Recruiters consist of:

Employer  
Recruitment Agency

Terminology rule:

UI must use **Recruiters** instead of Organizations.

Database still uses the table name:

organizations

---

# Technology Stack

Frontend

React  
Vite  
TypeScript  
TailwindCSS  
shadcn/ui  

Backend

Supabase  
PostgreSQL  
Supabase Auth  
Supabase Storage  
Supabase Realtime  
Supabase RPC

AI

OpenAI APIs

Deployment

Netlify

Package Manager

npm

---

# Architecture

The platform uses a **Supabase-first architecture**.

No custom backend server exists.

All backend functionality must use:

Supabase queries  
Supabase RPC  
Supabase RLS  
Supabase Realtime

Never create:

Express servers  
Next.js API routes  
Custom REST backends

---

# Folder Structure (Important)

Typical structure:

src/
components/
hooks/
pages/
lib/
context/


Agents must follow the existing structure.

Do not create new root architecture patterns.

---

# Database Structure

Core tables include:

profiles  
organizations  
jobs  
applications  
interviews  
offers  
subscriptions  
notifications  
messages  
audit_logs  

Rules:

profiles.id must always match auth.users.id.

Profiles must never be created with random UUIDs.

Users must be created via Supabase Auth first.

---

# Data Fetching

Always use:

React Query

Never fetch data directly inside components.

All queries must live inside hooks.

Examples:

useJobs  
useApplications  
useCandidateDashboard  
useEmployerDashboard  
useAgencyDashboard  
useAdminDashboard

Recommended configuration:

staleTime: 60000

---

# Realtime Updates

Realtime must be used where possible.

Use Supabase realtime subscriptions for:

applications  
jobs  
interviews  
messages  
notifications

When events occur, invalidate React Query caches.

Example:

queryClient.invalidateQueries()

---

# UI Rules

Never introduce new UI frameworks.

Allowed:

shadcn/ui  
Tailwind

Not allowed:

Material UI  
Bootstrap  
Chakra UI

Always reuse existing components when possible.

Examples:

DashboardStatCard  
Table  
Dialog  
Badge  
Card

---

# Terminology Rules

UI terminology:

Recruiters = Employers + Recruitment Agencies

Never display the term:

Organizations

Use:

Recruiters

Database table remains:

organizations

---

# Admin Dashboard Modules

Admin dashboard includes:

Users Management  
Recruiters Management  
Jobs Management  
Subscriptions  
Analytics  
Audit Logs  
Recruiter Verification  
Notifications Management  
Billing  
Platform Settings

Agents must extend existing modules instead of rebuilding them.

---

# AI Features

AI features currently include:

AI CV Builder  
AI Candidate Ranking  
AI Matching  
AI Insights  

All AI features must currently use:

OpenAI APIs

Future providers may be added later.

---

# Demo Data Rules

Never insert demo or seed data automatically into production tables.

If test data is required, create a separate SQL seed script.

Never mutate live data without user instruction.

---

# Deployment Rules

Platform is deployed using:

Netlify

Netlify Functions are used for serverless tasks.

Agents must not introduce incompatible deployment tools.

Do not add:

Docker  
Custom Node servers  
Serverless frameworks outside Netlify

---

# Code Modification Rules

Always extend existing code instead of rewriting large files.

Avoid deleting existing functionality.

Focus on incremental improvements.

Do not change working UI layout unless requested.

---

# Security Rules

Respect Supabase Row Level Security (RLS).

Never bypass RLS logic.

Admin routes must always be protected with:

RoleProtectedRoute

Allowed roles must be defined explicitly.

---

# Error Handling

Never silently ignore errors.

Always implement:

loading states  
error states  
fallback UI

Example:

Skeleton loaders  
ErrorState components

---

# Performance

All data queries must be optimized.

Use:

pagination  
limits  
count queries

Avoid fetching large datasets.

---

# Learned Rules

<!-- New rules are appended below this line. Do not edit above this section. -->

1. [TOOL] Always use npm as the package manager because the project is configured with npm.

2. [ARCH] Never create custom backend servers (Express, Nest, etc.) because the backend is fully handled by Supabase.

3. [DATA] Profiles must always reference auth.users IDs because profiles.id has a foreign key constraint.

4. [ARCH] Never rename database tables or columns; only add migrations.

5. [STYLE] Always use React + Tailwind + shadcn/ui; never introduce new UI frameworks.

6. [PROCESS] Always extend existing components instead of rewriting them.

7. [DATA] Never insert demo data automatically into production databases.

8. [ARCH] All AI features must use OpenAI APIs for now.

9. [CODE] Always use React Query for data fetching instead of direct fetch calls.

10. [UX] UI terminology must use "Recruiters" instead of "Organizations" while keeping the database schema unchanged.
