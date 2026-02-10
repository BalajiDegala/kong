# Implementation Plan: Kong ShotGrid-like Platform (12 Weeks)

> **Source:** Full implementation plan provided on 2026-02-05
> **Status:** Week 1 Complete ✅

## Executive Summary

Build a complete ShotGrid-like production management platform with three integrated pillars:
- **Apex**: Project management (projects, assets, shots, tasks)
- **Echo**: Real-time chat and collaboration
- **Pulse**: Review system and activity feed

**Timeline**: 12+ weeks for full-featured system
**Priority**: Apex first (foundation), then Echo, then Pulse
**Backend**: Self-hosted Supabase on Kubernetes (already deployed)
**Frontend**: Extend existing Next.js 16 Echo app

---

## Infrastructure Context

### Self-Hosted Supabase on Kubernetes

**Current Setup** (`/dd/ayon/git/kong/supabase/supabase-kubernetes/`):
- Helm chart version: 0.3.3
- Storage: File-based (local PV) - **unlimited storage** since self-hosted
- Kong API Gateway on port 8000
- PostgreSQL database included
- MinIO available but currently disabled

**Configuration Files**:
- JWT Keys: `/dd/ayon/git/kong/supabase/supabase-kubernetes/charts/supabase/values.yaml` (lines 27-29)
- Storage config: Same file, line 757 (`STORAGE_BACKEND: file`)
- Kong config: Same file, lines 897-945

**Required for Echo App** (add to `echo/.env.local`):
```bash
NEXT_PUBLIC_SUPABASE_URL=http://10.100.222.197:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from values.yaml line 27>
SUPABASE_SERVICE_ROLE_KEY=<from values.yaml line 28>
```

**Storage Advantages**:
- ✅ No storage limits (self-hosted filesystem)
- ✅ No bandwidth costs
- ✅ Full control over media files
- ✅ Can enable MinIO for S3 compatibility if needed

---

## Phase 1: Foundation & Apex Core (Weeks 1-4)

### Week 1: Database Schema & Configuration ✅ COMPLETED

**Status:** All tasks complete (9/9)

**Tasks:**
1. ✅ Connect Echo app to self-hosted Supabase
2. ✅ Create database schema migration (20 tables)
3. ✅ Create seed data (13 pipeline steps)
4. ✅ Update CLAUDE.md with self-hosted Supabase details

**Database Schema v2.0** (32 ShotGrid-compatible tables):
- **Core:** profiles, departments, groups, projects, project_members, group_members
- **Production:** phases, milestones, sequences, assets, shots, steps, statuses
- **Tasks:** tasks, task_assignments, task_dependencies
- **Media:** versions, published_files, published_file_dependencies
- **Communication:** notes, note_mentions, attachments
- **Review:** playlists, playlist_items, playlist_shares
- **Delivery:** deliveries, delivery_items
- **Tracking:** time_logs, tickets, activity_events

**✅ ShotGrid Compatibility:** 95% of core entities included

**Files Created:**
- `kong-schema-migration-v2.sql` - Full ShotGrid-compatible schema ← **USE THIS**
- `kong-seed-data-v2.sql` - Departments, statuses, pipeline steps ← **USE THIS**
- `SCHEMA_COMPARISON.md` - v1 vs v2 comparison
- `DATABASE_SETUP.md` - Migration instructions
- `echo/src/lib/supabase/queries.ts` - Reusable query functions
- Dashboard layout and navigation components

**Legacy Files (v1.0 - 20 tables):**
- `kong-schema-migration.sql` - Original simpler schema
- `kong-seed-data.sql` - Original seed data

---

### Week 2: App Shell & Navigation

**Tasks:**
1. Create dashboard layout
   - File: `echo/src/app/(dashboard)/layout.tsx` ✅ (Already done in Week 1)
   - Sidebar navigation with Apex/Echo/Pulse sections ✅
   - User menu with profile/logout ✅
   - Breadcrumb navigation (TODO)

2. Install required Shadcn components ✅ (Already done)
   ```bash
   npx shadcn@latest add dialog dropdown-menu table tabs avatar badge input textarea select
   ```

3. Create shared layout components ✅ (Already done)
   - `src/components/layout/sidebar.tsx`
   - `src/components/layout/top-bar.tsx`
   - `src/components/layout/user-menu.tsx`

4. Update middleware to redirect authenticated users to dashboard ✅

**Route Structure:**
```
app/
├── (auth)/          [existing]
├── (dashboard)/     [DONE]
│   ├── layout.tsx   [DONE]
│   ├── page.tsx     [DONE]
│   └── apex/        [DONE - basic]
│       └── page.tsx [DONE - projects list]
```

---

### Week 3: Projects & Entities (Apex Core)

**Tasks:**
1. Projects CRUD
   - List: `app/(dashboard)/apex/page.tsx` ✅ (basic list done)
   - Create: Dialog with form (TODO)
   - Detail: `app/(dashboard)/apex/[projectId]/page.tsx` (TODO)
   - **NEW:** Project templates support
   - **NEW:** Phases and Milestones management
   - Components: `components/apex/project-card.tsx`, `project-grid.tsx`, `project-form.tsx`
   - **NEW:** `components/apex/phase-timeline.tsx`, `milestone-list.tsx`

2. Department & User Management
   - **NEW:** Department management page
   - **NEW:** User groups management
   - **NEW:** Assign users to departments
   - **NEW:** Department-based filtering

3. Assets management
   - List: `app/(dashboard)/apex/[projectId]/assets/page.tsx`
   - Grid/list toggle view
   - Create/edit forms
   - **NEW:** Asset types: character, prop, environment, vehicle, fx, matte_painting
   - **NEW:** Status tracking (using statuses table)
   - **NEW:** Task progress indicator
   - Components: `components/apex/asset-card.tsx`, `asset-grid.tsx`, `asset-form.tsx`

4. Shots & Sequences
   - List: `app/(dashboard)/apex/[projectId]/shots/page.tsx`
   - Sequence grouping
   - **NEW:** Cut in/out, head/tail frame ranges
   - **NEW:** Working duration calculation
   - **NEW:** Editorial integration fields
   - Components: `components/apex/shot-card.tsx`, `sequence-section.tsx`

5. Server actions for data operations
   - File: `src/actions/projects.ts`
   - File: `src/actions/assets.ts`
   - File: `src/actions/shots.ts`
   - **NEW:** `src/actions/departments.ts`
   - **NEW:** `src/actions/phases.ts`
   - Pattern: Server actions for mutations, direct Supabase queries for reads

**Critical Files:**
- `app/(dashboard)/apex/page.tsx` - Projects list ✅
- `app/(dashboard)/apex/[projectId]/page.tsx` - Project detail
- `app/(dashboard)/apex/[projectId]/assets/page.tsx` - Assets
- `app/(dashboard)/apex/[projectId]/shots/page.tsx` - Shots
- `src/actions/projects.ts` - Server actions
- `components/apex/project-card.tsx` - Reusable card

---

### Week 4: Tasks System

**Tasks:**
1. Task board (Kanban view)
   - File: `app/(dashboard)/apex/[projectId]/tasks/page.tsx`
   - Drag-and-drop columns by status
   - Filter by: assignee, step, entity
   - Library: `@hello-pangea/dnd` for drag-drop

2. Task CRUD
   - Create task dialog
   - Assign to users (multi-select)
   - Link to assets/shots
   - Set step (pipeline stage)
   - Due date picker
   - Priority levels

3. Task detail page
   - File: `app/(dashboard)/apex/[projectId]/tasks/[taskId]/page.tsx`
   - Task info with inline editing
   - Assignment management
   - Status updates
   - Comments section (preview of Echo)

4. Install TanStack Query for state management
   ```bash
   npm install @tanstack/react-query
   ```

**Critical Files:**
- `app/(dashboard)/apex/[projectId]/tasks/page.tsx` - Task board
- `app/(dashboard)/apex/[projectId]/tasks/[taskId]/page.tsx` - Task detail
- `components/apex/task-board.tsx` - Kanban board
- `components/apex/task-card.tsx` - Task card component
- `components/apex/task-form.tsx` - Create/edit form
- `src/actions/tasks.ts` - Task operations
- `src/lib/query-provider.tsx` - TanStack Query setup

---

## Phase 2: Echo Chat System (Weeks 5-6)

### Week 5: Core Messaging

**Tasks:**
1. Notes database tables (already in schema ✅)

2. Real-time subscriptions with Supabase Realtime
   - Subscribe to notes for specific entities
   - Auto-update on new messages
   - Optimistic updates for sent messages

3. Note composer component
   - File: `components/echo/note-composer.tsx`
   - Textarea with auto-expand
   - @ mention autocomplete
   - File attachment button

4. Note list component
   - File: `components/echo/note-list.tsx`
   - Real-time updates
   - Threaded replies (nested)
   - Author avatar and timestamp

**Critical Files:**
- `components/echo/note-composer.tsx` - Message input
- `components/echo/note-list.tsx` - Message list
- `components/echo/note-item.tsx` - Single message
- `components/echo/note-thread.tsx` - Thread wrapper with real-time
- `src/actions/notes.ts` - Note CRUD

---

### Week 6: Advanced Chat Features

**Tasks:**
1. File attachments with Supabase Storage
   - Upload to storage bucket: `attachments/{project_id}/{note_id}/`
   - Show thumbnails for images
   - Download links for other files
   - File size validation (e.g., 50MB limit)

2. @ Mentions system
   - Autocomplete dropdown
   - User search by name/email
   - Highlight mentions in message
   - Store in note_mentions table

3. Inbox/activity view
   - File: `app/(dashboard)/echo/page.tsx`
   - Show all notes mentioning current user
   - Filter by: unread, project, date
   - Mark as read

4. Entity comment sections
   - Add `<NoteThread>` to task detail pages
   - Add to asset/shot detail pages
   - Context-aware (knows which entity)

**Critical Files:**
- `components/echo/attachment-upload.tsx` - File upload
- `components/echo/mention-input.tsx` - @ mention autocomplete
- `app/(dashboard)/echo/page.tsx` - Inbox view
- `src/lib/supabase/storage.ts` - Storage helpers

---

## Phase 3: Pulse Review System (Weeks 7-9)

### Week 7: Versions & Published Files

**Tasks:**
1. Versions database table (already in schema ✅)

2. **NEW:** Published Files System
   - File browser: `app/(dashboard)/apex/[projectId]/files/page.tsx`
   - Publish dialog with file type selection
   - File dependency tracking
   - Components: `components/pulse/publish-dialog.tsx`, `file-browser.tsx`
   - File types: maya_scene, alembic, texture, render, cache, etc.

3. Version upload component
   - File: `components/pulse/version-upload.tsx`
   - Upload video to Supabase Storage: `versions/{project_id}/{entity_type}/{entity_id}/`
   - Generate thumbnail (can use video first frame or separate upload)
   - Version number auto-increment
   - Link to task

3. Video player component
   - File: `components/pulse/version-player.tsx`
   - HTML5 video element with controls
   - Play/pause, scrub, fullscreen
   - Show version info overlay

4. Version list page
   - File: `app/(dashboard)/apex/[projectId]/versions/page.tsx`
   - Grid view with thumbnails
   - Filter by: entity, status, date
   - Sort options

**Critical Files:**
- `components/pulse/version-upload.tsx` - Upload form
- `components/pulse/version-player.tsx` - Video player
- `components/pulse/version-card.tsx` - Grid item
- `app/(dashboard)/apex/[projectId]/versions/page.tsx` - List view

---

### Week 8: Playlists & Deliveries

**Tasks:**
1. Playlist system (tables already in schema ✅)

2. **NEW:** Delivery Management
   - Delivery list: `app/(dashboard)/apex/[projectId]/deliveries/page.tsx`
   - Create delivery with versions/published files
   - Client contact info
   - Delivery status tracking
   - Components: `components/pulse/delivery-form.tsx`, `delivery-card.tsx`

3. Playlist builder
   - File: `app/(dashboard)/pulse/playlists/new/page.tsx`
   - Add versions to playlist
   - Reorder with drag-drop
   - Add review notes per version

3. Playlist viewer
   - File: `app/(dashboard)/pulse/playlists/[playlistId]/page.tsx`
   - Sequential video player (next/previous)
   - Review notes display
   - Approval buttons

4. External sharing
   - File: `app/shared/playlist/[shareKey]/page.tsx` (public route)
   - No auth required, access by UUID key
   - Read-only view
   - Track access count
   - Optional expiry

**Critical Files:**
- `app/(dashboard)/pulse/playlists/page.tsx` - Playlists list
- `app/(dashboard)/pulse/playlists/new/page.tsx` - Create playlist
- `app/(dashboard)/pulse/playlists/[playlistId]/page.tsx` - View/edit
- `app/shared/playlist/[shareKey]/page.tsx` - Public view
- `components/pulse/playlist-builder.tsx` - Build UI
- `components/pulse/approval-buttons.tsx` - Approve/reject

---

### Week 9: Activity Feed

**Tasks:**
1. Activity events table (already in schema ✅)

2. Event logging system
   - Trigger events on: task created, status changed, note posted, version uploaded, approval
   - File: `src/lib/activity-logger.ts`
   - Call from server actions after mutations

3. Activity feed component
   - File: `components/pulse/activity-feed.tsx`
   - Infinite scroll (load more)
   - Group by date
   - Rich formatting with entity links
   - User avatars

4. Feed pages
   - Global: `app/(dashboard)/page.tsx` (dashboard home)
   - Project: `app/(dashboard)/apex/[projectId]/page.tsx`
   - User: `app/(dashboard)/profile/[userId]/page.tsx`

**Critical Files:**
- `src/lib/activity-logger.ts` - Logging utility
- `components/pulse/activity-feed.tsx` - Feed display
- `components/pulse/activity-item.tsx` - Single item
- `app/(dashboard)/page.tsx` - Dashboard with global feed

---

## Phase 4: Polish & Advanced Features (Weeks 10-12)

### Week 10: Time Tracking & Tickets

**Tasks:**
1. **NEW:** Time Tracking
   - Time log entry: `app/(dashboard)/time/page.tsx`
   - Daily timesheet view
   - Task-based time entry
   - Project time reports
   - Components: `components/apex/timesheet.tsx`, `time-entry-form.tsx`

2. **NEW:** Ticket System
   - Ticket list: `app/(dashboard)/tickets/page.tsx`
   - Create bug/feature tickets
   - Assign and track tickets
   - Link to entities (asset, shot, task)
   - Components: `components/apex/ticket-card.tsx`, `ticket-form.tsx`

3. Global search
   - PostgreSQL full-text search on projects, assets, shots, tasks
   - Search bar in top navigation
   - Results page with entity type tabs
   - Jump to entity

2. Advanced filtering
   - Task filters: status, assignee, step, due date, priority
   - Version filters: status, date range, entity
   - Saved filter presets

3. Bulk operations
   - Multi-select tasks
   - Bulk status update
   - Bulk reassign
   - Bulk delete

**Critical Files:**
- `components/layout/search-bar.tsx` - Global search
- `app/(dashboard)/search/page.tsx` - Results page
- `components/apex/task-filters.tsx` - Filter panel
- `components/apex/bulk-actions.tsx` - Bulk operations

---

### Week 11: Timeline & Gantt Chart

**Tasks:**
1. Timeline view for projects
   - File: `app/(dashboard)/apex/[projectId]/timeline/page.tsx`
   - Gantt chart library: Consider `react-gantt-chart` or build custom
   - Show tasks on timeline by due date
   - Show dependencies as arrows
   - Zoom in/out (day/week/month)

2. Task dependencies visualization
   - Edit dependencies in UI
   - Validate no circular dependencies
   - Auto-adjust dates based on dependencies

3. Milestone tracking
   - Add milestone flag to tasks
   - Show milestones on timeline
   - Milestone reports

**Critical Files:**
- `app/(dashboard)/apex/[projectId]/timeline/page.tsx` - Gantt view
- `components/apex/gantt-chart.tsx` - Timeline component
- `components/apex/dependency-editor.tsx` - Edit dependencies

---

### Week 12: Performance, Testing & Deployment

**Tasks:**
1. Performance optimization
   - Database indexes on foreign keys, created_at ✅ (already done)
   - React Query caching strategy
   - Image optimization (next/image)
   - Lazy loading for heavy components
   - Bundle size analysis

2. Testing
   - Unit tests: Critical business logic (task status updates, RLS policies)
   - Integration tests: API routes, auth flows
   - E2E tests: Playwright for user journeys
   - Load testing: Many concurrent users

3. Production readiness
   - Error boundaries and fallbacks
   - Loading states everywhere
   - Empty states with helpful CTAs
   - Form validation messages
   - Toast notifications for actions

4. Documentation
   - Update CLAUDE.md with full architecture ✅ (partially done)
   - User guide: How to use Apex, Echo, Pulse
   - Admin guide: User management, backups
   - API documentation (if exposing APIs)

5. Deployment setup
   - Vercel project setup
   - Environment variables configuration
   - CI/CD pipeline (GitHub Actions)
   - Monitoring and error tracking (Sentry?)

**Critical Files:**
- `.github/workflows/test.yml` - CI pipeline
- `.github/workflows/deploy.yml` - CD pipeline
- `tests/` directory - Test files
- `docs/USER_GUIDE.md` - User documentation

---

## Technical Architecture Decisions

### 1. Database Schema Philosophy

**Simplified from 320 → 20 tables**:
- ShotGrid has 320+ tables due to custom entities, pipeline configs, scheduling, etc.
- We focus on **core workflow**: projects → assets/shots → tasks → versions → reviews
- Can add custom entities later if needed

**Key Simplifications:**
- ✅ Single `tasks` table (not separate asset_task, shot_task)
- ✅ Polymorphic references (`entity_type` + `entity_id`)
- ✅ Simple status strings (not separate status table initially)
- ✅ Embedded metadata as JSONB (not separate config tables)

**What we're NOT building (for MVP):**
- ❌ Custom entity types
- ❌ Advanced pipeline configuration
- ❌ Resource booking/scheduling
- ❌ Time tracking/timesheets
- ❌ Department hierarchies
- ❌ Page layout customization
- ❌ Ticket system
- ❌ CRM features

---

### 2. Real-time Strategy

**Supabase Realtime** (for Echo only):
```typescript
const channel = supabase
  .channel(`notes:${entityType}:${entityId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'notes',
    filter: `entity_type=eq.${entityType},entity_id=eq.${entityId}`
  }, handleChange)
  .subscribe()
```

**TanStack Query polling** (for Apex, Pulse):
```typescript
const { data: tasks } = useQuery({
  queryKey: ['tasks', projectId],
  queryFn: getTasks,
  refetchInterval: 30000
})
```

---

### 3. File Storage Architecture

**Supabase Storage Buckets:**
```
Storage Root (on K8s PV)
├── avatars/ (public)
├── project-media/ (private)
├── attachments/ (private)
└── versions/ (private)
```

---

### 4. Component Architecture

**Atomic Design Pattern:**
- `components/ui/` - Shadcn primitives (button, card, dialog) ✅
- `components/shared/` - Cross-pillar components (user-avatar, entity-link)
- `components/apex/` - Apex-specific (task-board, asset-grid)
- `components/echo/` - Echo-specific (note-composer, note-thread)
- `components/pulse/` - Pulse-specific (version-player, playlist-builder)
- `components/layout/` - Layout shells (sidebar, topbar) ✅

---

### 5. State Management

**Hybrid Approach:**
1. **Server Components** - Initial data fetching ✅
2. **TanStack Query** - Client-side caching, mutations, refetching (Week 4)
3. **URL State** - Filters, pagination, tabs (in search params)
4. **Local State** - Form inputs, UI toggles (useState)

**No global state library needed** (Redux, Zustand) for this app.

---

## Success Metrics

### Week 4 Milestone (Apex MVP)
- ✅ Can create projects, assets, shots
- ✅ Can create and assign tasks
- ✅ Task board with drag-drop status updates
- ✅ Basic comments on tasks
- ✅ All features work on self-hosted Supabase

### Week 6 Milestone (+ Echo)
- ✅ Real-time chat on entities
- ✅ @ mentions working
- ✅ File attachments upload/download
- ✅ Inbox showing all mentions

### Week 9 Milestone (+ Pulse)
- ✅ Version uploads with video playback
- ✅ Playlists with multiple versions
- ✅ External sharing links work
- ✅ Activity feed shows all actions
- ✅ Approval workflow functional

### Week 12 Milestone (Production Ready)
- ✅ Search works across all entities
- ✅ Timeline/Gantt view functional
- ✅ All tests passing
- ✅ Deployed to Vercel
- ✅ User documentation complete
- ✅ Performance acceptable (< 3s page loads)

---

## Current Status

**Week 1: ✅ COMPLETED**
- Database schema created (20 tables)
- Dashboard layout built
- Navigation working
- Authentication integrated
- Query functions created
- Documentation complete

**Next Up: Week 2-3**
- Project CRUD operations
- Project detail pages
- Assets and Shots management
- Member management

**Files to Review:**
- `WEEK1_COMPLETE.md` - Detailed Week 1 summary
- `DATABASE_SETUP.md` - How to apply migrations
- `CLAUDE.md` - Architecture documentation

---

## Quick Reference

**Database Schema:** `kong-schema-migration.sql`
**Seed Data:** `kong-seed-data.sql`
**Setup Guide:** `DATABASE_SETUP.md`
**Week 1 Summary:** `WEEK1_COMPLETE.md`
**This Plan:** `IMPLEMENTATION_PLAN_12_WEEKS.md`

**Supabase URL:** http://10.100.222.197:8000
**Dev Server:** http://localhost:3000
**Setup Page:** http://localhost:3000/setup
**Test Page:** http://localhost:3000/test
