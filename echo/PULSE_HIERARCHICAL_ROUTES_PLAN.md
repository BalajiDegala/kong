# Pulse Hierarchical Routes - Implementation Plan

## 📋 Overview

Reorganize Pulse to follow the same hierarchical structure as Apex for better data organization, performance, and UX consistency.

---

## 🎯 Goals

1. **Better Organization**: Posts scoped to specific entities (projects, sequences, shots, tasks)
2. **Performance**: API calls filter by context, reducing data transfer
3. **Consistency**: Match Apex's proven hierarchical pattern
4. **Scalability**: Handle thousands of posts efficiently with entity-scoped queries
5. **URL Shareability**: Clean, semantic URLs that map to entity hierarchy

---

## 📐 Current vs. Proposed Structure

### Current Structure ❌
```
/pulse                          - Global feed (ALL posts, slow with scale)
/apex/[projectId]/pulse         - Project feed (mixed into Apex routes)
/pulse/post/[postId]            - Individual post detail
```

**Problems:**
- Global feed loads ALL posts → slow with thousands of posts
- No sequence/shot/task scoping
- Pulse routes mixed with Apex
- No clear hierarchy

### Proposed Structure ✅
```
/pulse                                              - Global feed (inbox/all posts)
/pulse/project/[projectId]                          - Project-specific feed
/pulse/project/[projectId]/sequence/[sequenceId]    - Sequence-specific feed
/pulse/project/[projectId]/shot/[shotId]            - Shot-specific feed
/pulse/project/[projectId]/task/[taskId]            - Task-specific feed
/pulse/post/[postId]                                - Individual post detail (unchanged)
```

**Benefits:**
- ✅ Hierarchical scoping (like Apex)
- ✅ Fast, context-aware queries
- ✅ Clean, semantic URLs
- ✅ Easy navigation drill-down
- ✅ Matches user mental model

---

## 🗂️ Route Structure Details

### 1. Global Feed
**Route:** `/pulse`
**Query:** All posts (with pagination)
**Use Case:** Company-wide activity stream, personal inbox

```typescript
// All posts (global visibility or user has access)
.from('posts')
.select('*')
.order('created_at', { ascending: false })
.limit(20)
```

### 2. Project Feed
**Route:** `/pulse/project/[projectId]`
**Query:** Posts associated with project
**Use Case:** All activity in Project X

```typescript
// Via post_projects junction table
.from('post_projects')
.select('post_id')
.eq('project_id', projectId)
```

### 3. Sequence Feed
**Route:** `/pulse/project/[projectId]/sequence/[sequenceId]`
**Query:** Posts associated with sequence
**Use Case:** All activity in Sequence 010

```typescript
// Via post_sequences junction table
.from('post_sequences')
.select('post_id')
.eq('sequence_id', sequenceId)
```

### 4. Shot Feed
**Route:** `/pulse/project/[projectId]/shot/[shotId]`
**Query:** Posts associated with shot
**Use Case:** All activity for SHOT-010

```typescript
// Via post_shots junction table
.from('post_shots')
.select('post_id')
.eq('shot_id', shotId)
```

### 5. Task Feed
**Route:** `/pulse/project/[projectId]/task/[taskId]`
**Query:** Posts associated with task
**Use Case:** All activity for Animation task on SHOT-010

```typescript
// Via post_tasks junction table
.from('post_tasks')
.select('post_id')
.eq('task_id', taskId)
```

---

## 🏗️ Implementation Steps

### Phase 1: Create Route Structure ✅

#### Step 1.1: Create Project Feed Route
**File:** `src/app/(dashboard)/pulse/project/[projectId]/page.tsx`

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectPulseFeedPage } from './project-pulse-feed-page'

export default async function ProjectPulsePage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { projectId } = await params

  // Fetch project details
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, code')
    .eq('id', projectId)
    .single()

  if (!project) {
    redirect('/pulse')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <ProjectPulseFeedPage
      projectId={projectId}
      project={project}
      currentUserId={user.id}
      profile={profile}
    />
  )
}
```

#### Step 1.2: Create Project Feed Client Component
**File:** `src/app/(dashboard)/pulse/project/[projectId]/project-pulse-feed-page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { FolderOpen } from 'lucide-react'
import { SimplePostComposer } from '@/components/pulse/simple-post-composer'
import { PostFeed } from '@/components/pulse/post-feed'

interface ProjectPulseFeedPageProps {
  projectId: string
  project: { id: number; name: string; code: string }
  currentUserId: string
  profile: { id: string; display_name: string; avatar_url: string | null } | null
}

export function ProjectPulseFeedPage({
  projectId,
  project,
  currentUserId,
  profile,
}: ProjectPulseFeedPageProps) {
  const [refreshKey, setRefreshKey] = useState(0)

  const handlePostCreated = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FolderOpen className="h-5 w-5 text-blue-400" />
          <h1 className="text-lg font-semibold text-zinc-100">
            {project.code || project.name}
          </h1>
          <span className="text-sm text-zinc-500">/ Pulse</span>
        </div>
        <p className="text-sm text-zinc-500">
          Activity feed for {project.name}
        </p>
      </div>

      {/* Composer - auto-tag with projectId */}
      <div className="mb-6">
        <SimplePostComposer
          authorProfile={profile || undefined}
          onPostCreated={handlePostCreated}
          defaultProjectIds={[parseInt(projectId)]}
        />
      </div>

      {/* Feed - filtered by project */}
      <PostFeed
        key={refreshKey}
        filters={{ projectIds: [parseInt(projectId)] }}
        currentUserId={currentUserId}
      />
    </div>
  )
}
```

#### Step 1.3: Repeat for Sequence, Shot, Task Routes

Similar structure for:
- `src/app/(dashboard)/pulse/project/[projectId]/sequence/[sequenceId]/page.tsx`
- `src/app/(dashboard)/pulse/project/[projectId]/shot/[shotId]/page.tsx`
- `src/app/(dashboard)/pulse/project/[projectId]/task/[taskId]/page.tsx`

---

### Phase 2: Update PostFeed Component

#### Step 2.1: Enhance Filter Support
**File:** `src/components/pulse/post-feed.tsx`

Current filters work via junction tables, but we need to optimize queries:

```typescript
// Instead of fetching all posts then filtering:
const posts = await supabase.from('posts').select('*')
const filtered = posts.filter(post => /* check junction tables */)

// Use direct junction table queries:
const { data: postIds } = await supabase
  .from('post_projects')
  .select('post_id')
  .eq('project_id', projectId)

const posts = await supabase
  .from('posts')
  .select('*')
  .in('id', postIds.map(p => p.post_id))
```

#### Step 2.2: Add Context Breadcrumbs
**File:** `src/components/pulse/pulse-breadcrumbs.tsx` (NEW)

```typescript
export function PulseBreadcrumbs({
  project,
  sequence,
  shot,
  task,
}: {
  project?: { id: number; name: string; code: string }
  sequence?: { id: number; name: string }
  shot?: { id: number; name: string }
  task?: { id: number; name: string }
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-400">
      <Link href="/pulse">Pulse</Link>
      {project && (
        <>
          <span>/</span>
          <Link href={`/pulse/project/${project.id}`}>
            {project.code || project.name}
          </Link>
        </>
      )}
      {sequence && (
        <>
          <span>/</span>
          <Link href={`/pulse/project/${project.id}/sequence/${sequence.id}`}>
            {sequence.name}
          </Link>
        </>
      )}
      {shot && (
        <>
          <span>/</span>
          <Link href={`/pulse/project/${project.id}/shot/${shot.id}`}>
            {shot.name}
          </Link>
        </>
      )}
      {task && (
        <>
          <span>/</span>
          <span className="text-zinc-300">{task.name}</span>
        </>
      )}
    </div>
  )
}
```

---

### Phase 3: Update SimplePostComposer

#### Step 3.1: Auto-tag Based on Context
**File:** `src/components/pulse/simple-post-composer.tsx`

Add default entity props:

```typescript
interface SimplePostComposerProps {
  authorProfile?: { id: string; display_name: string; avatar_url: string | null }
  onPostCreated?: () => void

  // NEW: Auto-tag defaults based on route context
  defaultProjectIds?: number[]
  defaultSequenceIds?: number[]
  defaultShotIds?: number[]
  defaultTaskIds?: number[]
}
```

When creating post from `/pulse/project/123/shot/456`:
- Auto-tag with project=123, shot=456
- User can remove tags or add more
- Posts are automatically scoped to the current context

---

### Phase 4: Add Navigation Links

#### Step 4.1: Update Entity Tags to Link to Scoped Feeds
**File:** `src/components/pulse/post-card.tsx`

Instead of filtering the current feed, clicking a tag navigates to the scoped feed:

```typescript
// Current: Click tag → filter current feed
onClick={() => onEntityClick('shot', shot.id)}

// New: Click tag → navigate to shot feed
onClick={() => router.push(`/pulse/project/${projectId}/shot/${shot.id}`)}
```

#### Step 4.2: Add "View in Pulse" Links from Apex
**File:** `src/app/(dashboard)/apex/[projectId]/shots/[shotId]/page.tsx`

Add link in shot detail:
```typescript
<Link href={`/pulse/project/${projectId}/shot/${shotId}`}>
  View Activity Feed →
</Link>
```

---

## 🔄 Migration Path

### Option A: Gradual Migration (Recommended)
1. ✅ Keep `/pulse` (global feed) working
2. ✅ Add new routes `/pulse/project/...` alongside existing
3. ✅ Update links to use new routes
4. ✅ Remove old `/apex/[projectId]/pulse` route
5. ✅ Add redirects from old → new routes

### Option B: Big Bang Migration
1. Create all new routes
2. Update all links at once
3. Deploy

**Recommendation:** Option A for safety

---

## 📊 Performance Impact

### Before (Current)
```
Global feed: SELECT * FROM posts ORDER BY created_at DESC LIMIT 20
→ Loads all posts, then filters in app
→ Slow with 10,000+ posts
```

### After (Hierarchical)
```
Project feed:
  SELECT post_id FROM post_projects WHERE project_id = 123
  SELECT * FROM posts WHERE id IN (post_ids) ORDER BY created_at DESC LIMIT 20
→ Only loads posts for that project
→ Fast even with 100,000+ total posts
```

**Expected Improvement:**
- 🚀 80-90% reduction in data transfer for scoped feeds
- 🚀 Sub-100ms query times (vs. 1-2s for global feed)
- 🚀 Better scalability with growth

---

## 🎨 UI/UX Improvements

### 1. Breadcrumb Navigation
```
Pulse / Project XYZ / Sequence 010 / Shot 010-020
```

### 2. Quick Jump Menu
```
[Current: SHOT-010-020 ▼]
  ↳ View all project posts
  ↳ View sequence posts
  ↳ View related shots
  ↳ View global feed
```

### 3. Entity Sidebar (Future)
```
┌─────────────┬──────────────────┐
│ Feed        │  Post Content    │
│             │                  │
│ Related:    │  [Post 1]        │
│ • SHOT-010  │  [Post 2]        │
│ • SHOT-020  │  [Post 3]        │
│ • SEQ-010   │                  │
└─────────────┴──────────────────┘
```

---

## 🧪 Testing Plan

### Test Cases

1. **Navigation Tests**
   - [ ] Navigate from global → project → sequence → shot
   - [ ] Breadcrumbs update correctly
   - [ ] Back button works
   - [ ] Direct URL access works

2. **Data Scoping Tests**
   - [ ] Project feed shows only project posts
   - [ ] Sequence feed shows only sequence posts
   - [ ] Shot feed shows only shot posts
   - [ ] Task feed shows only task posts

3. **Creation Tests**
   - [ ] Post created from project feed auto-tags project
   - [ ] Post created from shot feed auto-tags project + shot
   - [ ] Manual tags still work
   - [ ] Posts appear in correct scoped feeds

4. **Performance Tests**
   - [ ] Project feed loads < 200ms
   - [ ] Pagination works
   - [ ] Real-time updates work

5. **Permission Tests**
   - [ ] Users only see posts from projects they're members of
   - [ ] RLS policies respected
   - [ ] Private posts don't leak

---

## 📝 Files to Create/Modify

### New Files (9 files)
```
src/app/(dashboard)/pulse/project/[projectId]/page.tsx
src/app/(dashboard)/pulse/project/[projectId]/project-pulse-feed-page.tsx
src/app/(dashboard)/pulse/project/[projectId]/sequence/[sequenceId]/page.tsx
src/app/(dashboard)/pulse/project/[projectId]/sequence/[sequenceId]/sequence-pulse-feed-page.tsx
src/app/(dashboard)/pulse/project/[projectId]/shot/[shotId]/page.tsx
src/app/(dashboard)/pulse/project/[projectId]/shot/[shotId]/shot-pulse-feed-page.tsx
src/app/(dashboard)/pulse/project/[projectId]/task/[taskId]/page.tsx
src/app/(dashboard)/pulse/project/[projectId]/task/[taskId]/task-pulse-feed-page.tsx
src/components/pulse/pulse-breadcrumbs.tsx
```

### Modified Files (3 files)
```
src/components/pulse/post-feed.tsx - Optimize queries
src/components/pulse/simple-post-composer.tsx - Add default tags
src/components/pulse/post-card.tsx - Update tag links
```

### Files to Remove (1 file)
```
src/app/(dashboard)/apex/[projectId]/pulse/page.tsx - Move to /pulse/project/...
```

---

## 🚀 Implementation Timeline

### Week 1: Foundation
- [ ] Create route structure for project feed
- [ ] Update PostFeed queries
- [ ] Test project scoping

### Week 2: Expand Hierarchy
- [ ] Add sequence/shot/task routes
- [ ] Add breadcrumbs
- [ ] Update composer with auto-tags

### Week 3: Polish & Migrate
- [ ] Update all links to new routes
- [ ] Remove old routes
- [ ] Add redirects
- [ ] Test thoroughly

---

## 🎯 Success Metrics

- ✅ All scoped feeds load < 200ms
- ✅ Users can navigate hierarchy easily
- ✅ URLs are shareable and bookmarkable
- ✅ No performance degradation with scale
- ✅ Consistent UX with Apex

---

## 🔗 Related Documents

- `PULSE_IMPROVEMENTS_2026-02-13.md` - Current Pulse features
- `PULSE_PHASE2_SUMMARY.md` - Phase 2 completion summary
- `UI_ARCHITECTURE_SHOTGRID.md` - UI patterns reference

---

## 📊 Implementation Status

### ✅ Completed (2026-02-16)

**Phase 1A: Shareable Post URLs** ✅
- [x] Created `/pulse/post/[postId]` route with full post detail
- [x] Added entity breadcrumbs (Pulse / Project / Sequence / Shot / Task)
- [x] Added "Copy Link" button with clipboard functionality
- [x] Breadcrumbs are clickable and link to scoped feeds (routes to be created)
- [x] Success notification on copy ("Copied!" with green checkmark)

**Files Modified:**
- `src/app/(dashboard)/pulse/post/[postId]/page.tsx` - Fetch entity associations
- `src/app/(dashboard)/pulse/post/[postId]/post-detail-page.tsx` - Breadcrumbs + Copy Link

**Testing:** Post detail pages now show context and have shareable URLs that work!

**Phase 1B: Hierarchical Browsing Routes** ✅ **COMPLETED**
- [x] Created `/pulse/project/[projectId]/posts` route
- [x] Created `/pulse/project/[projectId]/sequence/[seqId]/posts` route
- [x] Created `/pulse/project/[projectId]/shot/[shotId]/posts` route
- [x] Created `/pulse/project/[projectId]/task/[taskId]/posts` route
- [x] Updated SimplePostComposer to accept default entity IDs
- [x] Auto-tagging works (posts created from scoped feeds inherit context)
- [x] Breadcrumb navigation works across all levels

**Files Created:**
- 8 new route files (page.tsx + client component for each route)
- All routes tested and building successfully

### 🚧 In Progress

**Phase 2: Copy Link in Feed Views** ✅ **COMPLETED**
- [x] Added Copy Link button to PostCard component
- [x] Positioned next to timestamp in post header
- [x] Shows "Copied!" confirmation for 2 seconds
- [x] Works from all feed views

**Files Modified:**
- `src/components/pulse/post-card.tsx` - Added Copy Link functionality

**Phase 3: Auto-tagging** ✅ **COMPLETED**
- [x] SimplePostComposer accepts defaultProjectIds, defaultSequenceIds, defaultShotIds, defaultTaskIds
- [x] Posts created from scoped feeds auto-tag with context
- [x] Merges manual selections with defaults (no duplicates)

**Files Modified:**
- `src/components/pulse/simple-post-composer.tsx` - Auto-tagging support

### 📋 Remaining (Future Enhancements)

**Phase 4: Polish & Optimization**
- [ ] Entity sidebar showing related posts
- [ ] Quick jump menu for navigation
- [ ] Performance optimization for large datasets
- [ ] Saved filter presets
- [ ] Analytics dashboard

---

**Status:** In Progress - Implementing hierarchical browsing routes
**Priority:** High (scalability issue)
**Estimated Effort:** 2-3 weeks
**Started:** 2026-02-16
