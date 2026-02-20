# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kong is a workflow management platform for production (VFX/animation) built on Supabase. Three product pillars:
- **Apex** (Projects): Project management — sequences, assets, shots, tasks, pipeline steps
- **Echo** (Chat): Team communication 
- **Pulse** (Reviews): Versions, playlists, activity feed 

The UI follows ShotGrid patterns — horizontal tabs per project, entity tables with grouping/sorting, and widget dashboards. See `UI_ARCHITECTURE_SHOTGRID.md` for detailed layout specs.

## Development Commands

All commands run from the `echo/` directory:

```bash
npm install          # Install dependencies
npm run dev          # Dev server at http://localhost:3000
npm run build        # Production build — ALWAYS run after code changes to verify no errors
npm run lint         # ESLint (v9 flat config)
npm run schema:audit # Audit entity pages against schema columns (Python)
```

No test framework is configured yet. Use `npm run build` to catch type errors and broken imports.

## Architecture

### Tech Stack
- **Next.js 16** with App Router, React 19 (async Server Components by default)
- **Tailwind CSS v4** with PostCSS (no tailwind.config file — v4 uses `@tailwindcss/postcss` plugin only)
- **Supabase** (self-hosted on Kubernetes at `http://10.100.222.197:8000`)
- **Shadcn/ui** components, **Lucide** icons

### Code Patterns

**Always use async/await, never callbacks.**

**Supabase Client — three contexts, never store in globals:**
- `src/lib/supabase/client.ts` — browser (client components)
- `src/lib/supabase/server.ts` — server (Server Components, route handlers)
- `src/lib/supabase/middleware.ts` — middleware (session/cookie management). Must return the original `supabaseResponse` to maintain cookie sync.

**Server Actions** (`src/actions/*.ts`): Each entity type has a `'use server'` file with CRUD operations. Pattern: create Supabase server client → verify auth → query → `revalidatePath()` → return `{ data }` or `{ error }`.

**Reusable Queries** (`src/lib/supabase/queries.ts`): Functions that accept a `SupabaseClient` parameter for use in both server and client contexts. All respect RLS policies.

**Schema System** (`src/lib/schema/`): Generated schema definitions drive entity tables and server actions.
- `schema.generated.ts` — auto-generated entity/field definitions
- `getEntitySchema(entity)` — get schema for an entity
- `pickEntityColumns(entity, input, { deny })` — filter form data to valid columns (used in all server actions to safely extract fields)
- `getEntityColumns(entity)` — get valid column names as a Set

**Entity Table System** (`src/components/table/`): Schema-driven `EntityTable` component with column persistence (saved to `user_table_preferences` table with localStorage fallback), inline editing, drag-and-drop column reordering, resizing, grouping, filtering, and sorting. Used across all entity pages.

**Component conventions:**
- Server Components by default; add `'use client'` only when needed
- Shadcn/ui primitives in `components/ui/`
- Feature components in `components/apex/`, `components/echo/`, `components/pulse/`
- Layout components in `components/layout/` (Sidebar, TopBar, GlobalNav, UserMenu, ProjectTabs)

### Route Structure

```
app/(dashboard)/              # Auth-protected layout with GlobalNav
  apex/page.tsx               # Projects list
  apex/[projectId]/layout.tsx # Project detail with horizontal tab navigation
  apex/[projectId]/           # Overview, assets, sequences, shots, tasks, notes, versions, playlists
  departments/                # Department management
  inbox/, my-tasks/, people/  # Global pages
app/auth/                     # Login, OAuth callback, error
```

### Authentication
- Middleware (`src/middleware.ts`) enforces Supabase auth + optional allowlist check
- Never modify cookie behavior in middleware without understanding `@supabase/ssr` implications
- Dashboard routes require authentication

## Database

### Schema
- **Current schema**: `/dd/ayon/git/kong/supabase/supabase-kubernetes/charts/kong2173.sql`

### Critical Constraints (CHECK constraints — will reject invalid values)
- `notes.entity_type` and `versions.entity_type`: `'asset'`, `'shot'`

Query constraints before implementing features:
```sql
SELECT pg_get_constraintdef(con.oid) FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'table_name' AND con.contype = 'c';
```

### Entity Linking Pattern
Notes and versions link to entities via `entity_type` ('asset'|'shot') + `entity_id`, with optional `task_id`.

### Storage Buckets
- `versions` — 500MB limit (images, videos, PDFs, ZIPs)
- `note-attachments` — 100MB limit (images, PDFs)

## Environment

`echo/.env.local` requires:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

JWT keys sourced from `supabase/supabase-kubernetes/charts/supabase/values.yaml` (lines 27-29).

## Reference Documentation
- `TROUBLESHOOTING.md` — Common issues and debug queries
- `NEXT_SESSION_START.md` — Quick start guide
- `UI_ARCHITECTURE_SHOTGRID.md` — UI layout patterns (horizontal tabs, entity tables)
- `SESSION_SUMMARY_2026-02-06.md` — Latest session context
