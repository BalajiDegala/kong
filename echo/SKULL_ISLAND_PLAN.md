# Skull Island - Trash & Recovery System

> *"Where deleted entities go to rest... until you need them back."*

Kong's trash/recycle bin system, inspired by ShotGrid's retire/revive pattern but tailored to our Supabase + Next.js architecture.

---

## 1. Overview

**Skull Island** is a centralized trash system where all deleted entities (projects, assets, shots, sequences, tasks, versions, notes, playlists) are soft-deleted and recoverable. Users can browse deleted items, restore them, or permanently destroy them.

### Core Principles

| Principle | Description |
|---|---|
| **Soft-delete by default** | No entity is ever hard-deleted on first action. All deletes set a `deleted_at` timestamp. |
| **Full restore** | Any trashed entity can be revived to its original state with all links intact. |
| **Permanent delete** | Admin-only action to truly destroy data (with storage cleanup). |
| **Cascade awareness** | Trashing a project trashes all its children. Restoring a project restores all its children. |
| **Zero query leakage** | Soft-deleted entities never appear in normal queries — enforced at the database level via RLS or views. |

---

## 2. Entities Covered

### Phase 1 — Core Production Entities
These are the most commonly deleted and most valuable to recover:

| Entity | Table | Current Delete | Cascade Children |
|---|---|---|---|
| **Projects** | `projects` | Hard delete | assets, sequences, shots, tasks, versions, notes, playlists, etc. |
| **Assets** | `assets` | Hard delete | None (linked notes/versions use entity_type+entity_id) |
| **Sequences** | `sequences` | Hard delete | shots.sequence_id → SET NULL |
| **Shots** | `shots` | Hard delete | assets.shot_id → SET NULL |
| **Tasks** | `tasks` | Hard delete | notes.task_id → SET NULL, versions.task_id → SET NULL |
| **Versions** | `versions` | Hard delete | annotations → CASCADE, playlist_items → CASCADE |
| **Notes** | `notes` | Hard delete | attachments → CASCADE, child notes → CASCADE |
| **Playlists** | `playlists` | Hard delete | playlist_items → CASCADE, playlist_shares → CASCADE |

### Phase 2 — Supporting Entities (future)
- Published files, deliveries, tickets, milestones
- Custom pages (already has `is_archived` — could be unified)

---

## 3. Database Changes

### 3.1 New Columns on Each Entity Table

Add to **all Phase 1 tables** (`projects`, `assets`, `sequences`, `shots`, `tasks`, `versions`, `notes`, `playlists`):

```sql
ALTER TABLE assets ADD COLUMN deleted_at timestamptz DEFAULT NULL;
ALTER TABLE assets ADD COLUMN deleted_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Repeat for: projects, sequences, shots, tasks, versions, notes, playlists
```

**Index for performance** (queries will always filter on `deleted_at`):

```sql
CREATE INDEX idx_assets_deleted_at ON assets(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_assets_active ON assets(id) WHERE deleted_at IS NULL;

-- Repeat for all tables
```

### 3.2 RLS Policy Updates

The cleanest approach: **modify existing RLS policies** to automatically exclude soft-deleted rows from normal queries, and create separate policies for Skull Island access.

**Option A — RLS-level filtering (Recommended):**

Update every SELECT policy to include `AND deleted_at IS NULL`:

```sql
-- Example: assets SELECT policy
DROP POLICY IF EXISTS "select_assets" ON assets;
CREATE POLICY "select_assets" ON assets FOR SELECT USING (
  deleted_at IS NULL
  AND project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
);

-- New policy: allow reading trashed items (for Skull Island page)
CREATE POLICY "select_trashed_assets" ON assets FOR SELECT USING (
  deleted_at IS NOT NULL
  AND project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
);
```

> **Why RLS over views?** RLS keeps the enforcement at the database level — no chance of a query accidentally leaking trashed items. Views would add complexity and require rewriting all Supabase client queries.

**Option B — Application-level filtering (Simpler but less safe):**

Add `.is('deleted_at', null)` to every query. Simpler to implement but risks leaks if any query misses the filter.

**Recommendation:** Use **Option A (RLS)** for production safety. The Skull Island page will use a separate RPC or a query hint to access trashed records.

### 3.3 RPC Functions for Skull Island

```sql
-- Get all trashed entities across types for a user
CREATE OR REPLACE FUNCTION get_trashed_entities(
  p_entity_type text DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  entity_type text,
  name text,
  project_id uuid,
  project_name text,
  deleted_at timestamptz,
  deleted_by uuid,
  deleted_by_name text,
  metadata jsonb
) AS $$
BEGIN
  -- Union query across all entity tables where deleted_at IS NOT NULL
  -- Filter by entity_type and project_id if provided
  -- Order by deleted_at DESC (most recently deleted first)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Soft-delete an entity
CREATE OR REPLACE FUNCTION trash_entity(
  p_entity_type text,
  p_entity_id uuid
) RETURNS void AS $$
BEGIN
  -- Set deleted_at = now(), deleted_by = auth.uid()
  -- If entity_type = 'project', cascade to all children
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore an entity
CREATE OR REPLACE FUNCTION restore_entity(
  p_entity_type text,
  p_entity_id uuid
) RETURNS void AS $$
BEGIN
  -- Set deleted_at = NULL, deleted_by = NULL
  -- If entity_type = 'project', restore all children
  -- If restoring a child, verify parent is not trashed
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permanently delete (admin only)
CREATE OR REPLACE FUNCTION permanently_delete_entity(
  p_entity_type text,
  p_entity_id uuid
) RETURNS void AS $$
BEGIN
  -- Verify caller is admin/manager
  -- Hard DELETE from table (cascades will handle children)
  -- Storage cleanup for versions with files
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 4. Server Action Changes

### 4.1 Modify Existing Delete Actions

Every `delete*` function changes from hard-delete to soft-delete:

**Before (current):**
```typescript
// src/actions/assets.ts
export async function deleteAsset(assetId: string, projectId: string) {
  const { error } = await supabase.from('assets').delete().eq('id', assetId)
  logEntityDeleted('asset', assetId, projectId, oldData)
}
```

**After:**
```typescript
export async function deleteAsset(assetId: string, projectId: string) {
  const { error } = await supabase
    .from('assets')
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq('id', assetId)

  logEntityTrashed('asset', assetId, projectId, oldData)
}
```

### 4.2 New Server Actions File

Create `src/actions/skull-island.ts`:

```typescript
'use server'

// Restore a trashed entity
export async function restoreEntity(entityType: string, entityId: string) {
  // Auth check
  // Call restore_entity RPC
  // Log activity: logEntityRestored(entityType, entityId, ...)
  // revalidatePath
}

// Permanently delete (admin only)
export async function permanentlyDeleteEntity(entityType: string, entityId: string) {
  // Auth check — must be admin/manager
  // If version with file, delete from storage first
  // Call permanently_delete_entity RPC
  // Log activity: logEntityPermanentlyDeleted(entityType, entityId, ...)
  // revalidatePath
}

// Get trashed entities (with filtering)
export async function getTrashedEntities(options: {
  entityType?: string
  projectId?: string
  limit?: number
  offset?: number
}) {
  // Call get_trashed_entities RPC
}
```

### 4.3 Files to Modify

Each of these server action files needs its `delete*` function updated:

| File | Functions to Modify |
|---|---|
| `src/actions/assets.ts` | `deleteAsset` |
| `src/actions/shots.ts` | `deleteShot` |
| `src/actions/sequences.ts` | `deleteSequence` |
| `src/actions/tasks.ts` | `deleteTask` |
| `src/actions/versions.ts` | `deleteVersion` (special: defer storage cleanup) |
| `src/actions/notes.ts` | `deleteNote` |
| `src/actions/playlists.ts` | `deletePlaylist` |
| `src/actions/projects.ts` | `deleteProject` (cascade: trash all children) |

---

## 5. Query Changes

### 5.1 If Using RLS Approach (Recommended)

**Minimal changes needed.** Existing queries will automatically exclude trashed items because the RLS policy adds `deleted_at IS NULL`. No code changes to existing pages.

The only new queries are for the Skull Island page itself, which will use the `get_trashed_entities` RPC.

### 5.2 If Using Application-Level Filtering

Every query across the app would need `.is('deleted_at', null)`:

```typescript
// Every page that lists entities
const { data } = await supabase
  .from('assets')
  .select('*')
  .eq('project_id', projectId)
  .is('deleted_at', null)  // <-- Must add everywhere
```

This is error-prone and not recommended.

---

## 6. UI — Skull Island Page

### 6.1 Route

```
app/(dashboard)/skull-island/page.tsx
```

### 6.2 Navigation

Add to `global-nav.tsx` navItems:

```typescript
{ id: 'skull-island', label: 'Skull Island', href: '/skull-island', icon: Skull }
```

Using the `Skull` icon from Lucide (it exists!).

### 6.3 Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  💀 Skull Island                                                │
│  ───────────────────────────────────────────────────────────────│
│                                                                 │
│  [Entity Type ▾]  [Project ▾]  [Date Range ▾]  [Search...]     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ☐ │ Type    │ Name          │ Project    │ Deleted     │ By ││
│  │───│─────────│───────────────│────────────│─────────────│────││
│  │ ☐ │ Shot    │ SH010         │ Project X  │ 2 hours ago │ AJ ││
│  │ ☐ │ Asset   │ hero_char     │ Project X  │ 1 day ago   │ MK ││
│  │ ☐ │ Task    │ Animation     │ Project Y  │ 3 days ago  │ RS ││
│  │ ☐ │ Version │ hero_v003.exr │ Project X  │ 1 week ago  │ AJ ││
│  │ ☐ │ Project │ Test Project  │ —          │ 2 weeks ago │ MK ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  [Restore Selected]  [Permanently Delete]                       │
│                                                                 │
│  Showing 5 of 23 trashed items                    [Load More]   │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Key UI Features

1. **Entity type filter dropdown** — Filter by: All, Projects, Assets, Sequences, Shots, Tasks, Versions, Notes, Playlists
2. **Project filter dropdown** — Filter by project (show all projects including trashed ones)
3. **Date range filter** — Quick filters: Today, This Week, This Month, All Time
4. **Search** — Search by entity name within trashed items
5. **Bulk selection** — Checkbox column for bulk restore/delete
6. **Restore button** — Restores selected items (with confirmation dialog)
7. **Permanently Delete button** — Admin-only, with strong confirmation dialog ("Type entity name to confirm")
8. **Relative timestamps** — "2 hours ago", "3 days ago" etc.
9. **Deleted by** — Show who deleted the item (avatar + name)
10. **Click to preview** — Click a row to see a read-only preview of the entity's data before deciding to restore

### 6.5 Confirmation Dialogs

**Restore:**
```
┌─────────────────────────────────────┐
│  Restore 3 items?                   │
│                                     │
│  • Shot "SH010" → Project X        │
│  • Asset "hero_char" → Project X   │
│  • Task "Animation" → Project Y    │
│                                     │
│  These items will be restored to    │
│  their original locations.          │
│                                     │
│  [Cancel]  [Restore]               │
└─────────────────────────────────────┘
```

**Permanent Delete:**
```
┌─────────────────────────────────────────┐
│  ⚠️ Permanently delete 2 items?        │
│                                         │
│  This action CANNOT be undone.          │
│  All data will be destroyed forever.    │
│                                         │
│  Type "DELETE" to confirm:              │
│  [____________]                         │
│                                         │
│  [Cancel]  [Delete Forever]             │
└─────────────────────────────────────────┘
```

### 6.6 Context Menu Integration

Add "Send to Skull Island" to entity right-click menus and EntityTable action menus across all entity pages:

```
Right-click on entity row:
├── Edit
├── Duplicate
├── ─────────
├── 💀 Send to Skull Island
└── ─────────
```

---

## 7. Cascade Behavior

### 7.1 Trash Cascades

| When You Trash... | Also Gets Trashed | Rationale |
|---|---|---|
| **Project** | All assets, sequences, shots, tasks, versions, notes, playlists in that project | Project is the container — trashing it trashes everything inside |
| **Sequence** | Nothing (shots keep their sequence_id but remain visible) | Shots exist independently; they just lose their grouping |
| **Shot** | Nothing (linked tasks/versions/notes remain) | Tasks/versions/notes link via entity_type+entity_id; they should remain accessible if linked to other entities too |
| **Asset** | Nothing | Same as shot |
| **Task** | Nothing | Versions/notes linked to this task keep their task_id but remain visible |
| **Version** | Nothing | Annotations and playlist_items will be hidden by the version being gone |
| **Note** | Child notes (replies) | A reply without its parent makes no sense |
| **Playlist** | Nothing | Playlist items reference versions; the versions remain |

### 7.2 Restore Cascades

| When You Restore... | Also Gets Restored | Pre-conditions |
|---|---|---|
| **Project** | All children that were trashed at the same time (same `deleted_at` timestamp window) | N/A |
| **Shot/Asset** | Nothing | Parent project must not be trashed |
| **Task** | Nothing | Parent project must not be trashed |
| **Version** | Nothing | Parent project must not be trashed |
| **Note** | Child notes that were cascade-trashed | Parent entity must not be trashed |

### 7.3 Restore Validation

Before restoring, check:
- **Parent project exists and is not trashed** — Can't restore a shot to a trashed project
- **Referenced entity exists** — If restoring a version linked to a shot, the shot should exist (warn if it doesn't, but allow restore anyway)

---

## 8. Activity Logging

New event types for `activity_events`:

| Event | Description |
|---|---|
| `*_trashed` | Entity sent to Skull Island (e.g., `asset_trashed`) |
| `*_restored` | Entity restored from Skull Island (e.g., `shot_restored`) |
| `*_permanently_deleted` | Entity permanently destroyed (e.g., `version_permanently_deleted`) |

These supplement the existing `*_created`, `*_updated`, `*_deleted` events.

---

## 9. Storage Handling

**Critical for versions with files:**

| Action | Storage Behavior |
|---|---|
| **Trash a version** | File stays in storage (not deleted) |
| **Restore a version** | File still in storage — nothing to do |
| **Permanently delete a version** | Delete file from `versions` bucket |

This is a change from the current behavior where `deleteVersion` immediately removes the file from storage.

---

## 10. Permissions

| Action | Who Can Do It |
|---|---|
| **Send to Skull Island** | Any project member (same as current delete permissions) |
| **View Skull Island** | Any authenticated user (sees only items from their projects) |
| **Restore from Skull Island** | Any project member for that entity's project |
| **Permanently Delete** | Admin/Manager role only |

---

## 11. Implementation Phases

### Phase 1 — Database Foundation (Migration)
1. Add `deleted_at` and `deleted_by` columns to all 8 entity tables
2. Create partial indexes for performance
3. Update RLS SELECT policies to exclude `deleted_at IS NOT NULL`
4. Create new RLS policies for Skull Island access
5. Create RPC functions (`trash_entity`, `restore_entity`, `permanently_delete_entity`, `get_trashed_entities`)

### Phase 2 — Server Actions
1. Modify all 8 `delete*` server actions to soft-delete
2. Special handling for `deleteVersion` (keep file in storage)
3. Special handling for `deleteProject` (cascade to children)
4. Create `src/actions/skull-island.ts` with restore/permanent-delete actions
5. Add new activity event types

### Phase 3 — Skull Island Page
1. Create route: `app/(dashboard)/skull-island/page.tsx`
2. Build the page with entity type filter, project filter, search, date range
3. Build the trashed entities table with bulk selection
4. Add restore confirmation dialog
5. Add permanent delete confirmation dialog (with type-to-confirm)
6. Add to GlobalNav

### Phase 4 — Context Menu Integration
1. Replace "Delete" with "Send to Skull Island" in EntityTable action menus
2. Add skull icon and updated wording across all entity pages
3. Add toast notifications: "Shot SH010 sent to Skull Island. [Undo]"
4. Undo = immediate restore (within a few seconds)

### Phase 5 — Polish & Edge Cases
1. Handle orphaned references (version's parent shot is trashed)
2. Add empty state for Skull Island ("No items in the trash")
3. Add retention indicator (optional: "Items older than 90 days may be auto-deleted")
4. Handle the archived project edge case (entities in archived projects hidden from Skull Island, with a toggle to show)

---

## 12. Migration SQL (Phase 1 — Ready to Execute)

```sql
-- ============================================================
-- SKULL ISLAND: Soft-Delete System Migration
-- ============================================================

-- 1. Add soft-delete columns to all entity tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'projects', 'assets', 'sequences', 'shots',
    'tasks', 'versions', 'notes', 'playlists'
  ]
  LOOP
    EXECUTE format('
      ALTER TABLE %I
        ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
    ', tbl);

    -- Index for finding trashed items quickly
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_%I_deleted_at
      ON %I(deleted_at) WHERE deleted_at IS NOT NULL;
    ', tbl, tbl);

    -- Index for filtering active items (most queries)
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_%I_active
      ON %I(id) WHERE deleted_at IS NULL;
    ', tbl, tbl);
  END LOOP;
END $$;

-- 2. RPC: Trash an entity (soft-delete)
CREATE OR REPLACE FUNCTION trash_entity(
  p_entity_type text,
  p_entity_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Soft-delete the entity
  CASE p_entity_type
    WHEN 'project' THEN
      UPDATE projects SET deleted_at = v_now, deleted_by = v_user_id WHERE id = p_entity_id AND deleted_at IS NULL;
      -- Cascade: trash all children in the project
      UPDATE assets SET deleted_at = v_now, deleted_by = v_user_id WHERE project_id = p_entity_id AND deleted_at IS NULL;
      UPDATE sequences SET deleted_at = v_now, deleted_by = v_user_id WHERE project_id = p_entity_id AND deleted_at IS NULL;
      UPDATE shots SET deleted_at = v_now, deleted_by = v_user_id WHERE project_id = p_entity_id AND deleted_at IS NULL;
      UPDATE tasks SET deleted_at = v_now, deleted_by = v_user_id WHERE project_id = p_entity_id AND deleted_at IS NULL;
      UPDATE versions SET deleted_at = v_now, deleted_by = v_user_id WHERE project_id = p_entity_id AND deleted_at IS NULL;
      UPDATE notes SET deleted_at = v_now, deleted_by = v_user_id WHERE project_id = p_entity_id AND deleted_at IS NULL;
      UPDATE playlists SET deleted_at = v_now, deleted_by = v_user_id WHERE project_id = p_entity_id AND deleted_at IS NULL;
    WHEN 'asset' THEN
      UPDATE assets SET deleted_at = v_now, deleted_by = v_user_id WHERE id = p_entity_id AND deleted_at IS NULL;
    WHEN 'sequence' THEN
      UPDATE sequences SET deleted_at = v_now, deleted_by = v_user_id WHERE id = p_entity_id AND deleted_at IS NULL;
    WHEN 'shot' THEN
      UPDATE shots SET deleted_at = v_now, deleted_by = v_user_id WHERE id = p_entity_id AND deleted_at IS NULL;
    WHEN 'task' THEN
      UPDATE tasks SET deleted_at = v_now, deleted_by = v_user_id WHERE id = p_entity_id AND deleted_at IS NULL;
    WHEN 'version' THEN
      UPDATE versions SET deleted_at = v_now, deleted_by = v_user_id WHERE id = p_entity_id AND deleted_at IS NULL;
    WHEN 'note' THEN
      UPDATE notes SET deleted_at = v_now, deleted_by = v_user_id WHERE id = p_entity_id AND deleted_at IS NULL;
      -- Cascade: trash child notes (replies)
      UPDATE notes SET deleted_at = v_now, deleted_by = v_user_id WHERE parent_note_id = p_entity_id AND deleted_at IS NULL;
    WHEN 'playlist' THEN
      UPDATE playlists SET deleted_at = v_now, deleted_by = v_user_id WHERE id = p_entity_id AND deleted_at IS NULL;
    ELSE
      RAISE EXCEPTION 'Unknown entity type: %', p_entity_type;
  END CASE;

  v_result := jsonb_build_object('success', true, 'entity_type', p_entity_type, 'entity_id', p_entity_id, 'deleted_at', v_now);
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC: Restore an entity
CREATE OR REPLACE FUNCTION restore_entity(
  p_entity_type text,
  p_entity_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_project_id uuid;
  v_deleted_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the entity's project_id and deleted_at for cascade restore
  CASE p_entity_type
    WHEN 'project' THEN
      SELECT deleted_at INTO v_deleted_at FROM projects WHERE id = p_entity_id;
      -- Restore project
      UPDATE projects SET deleted_at = NULL, deleted_by = NULL WHERE id = p_entity_id;
      -- Restore children that were trashed at the same time (within 1 second window)
      UPDATE assets SET deleted_at = NULL, deleted_by = NULL WHERE project_id = p_entity_id AND deleted_at BETWEEN v_deleted_at - interval '1 second' AND v_deleted_at + interval '1 second';
      UPDATE sequences SET deleted_at = NULL, deleted_by = NULL WHERE project_id = p_entity_id AND deleted_at BETWEEN v_deleted_at - interval '1 second' AND v_deleted_at + interval '1 second';
      UPDATE shots SET deleted_at = NULL, deleted_by = NULL WHERE project_id = p_entity_id AND deleted_at BETWEEN v_deleted_at - interval '1 second' AND v_deleted_at + interval '1 second';
      UPDATE tasks SET deleted_at = NULL, deleted_by = NULL WHERE project_id = p_entity_id AND deleted_at BETWEEN v_deleted_at - interval '1 second' AND v_deleted_at + interval '1 second';
      UPDATE versions SET deleted_at = NULL, deleted_by = NULL WHERE project_id = p_entity_id AND deleted_at BETWEEN v_deleted_at - interval '1 second' AND v_deleted_at + interval '1 second';
      UPDATE notes SET deleted_at = NULL, deleted_by = NULL WHERE project_id = p_entity_id AND deleted_at BETWEEN v_deleted_at - interval '1 second' AND v_deleted_at + interval '1 second';
      UPDATE playlists SET deleted_at = NULL, deleted_by = NULL WHERE project_id = p_entity_id AND deleted_at BETWEEN v_deleted_at - interval '1 second' AND v_deleted_at + interval '1 second';
    WHEN 'asset' THEN
      SELECT project_id INTO v_project_id FROM assets WHERE id = p_entity_id;
      IF EXISTS (SELECT 1 FROM projects WHERE id = v_project_id AND deleted_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Cannot restore: parent project is trashed';
      END IF;
      UPDATE assets SET deleted_at = NULL, deleted_by = NULL WHERE id = p_entity_id;
    WHEN 'sequence' THEN
      SELECT project_id INTO v_project_id FROM sequences WHERE id = p_entity_id;
      IF EXISTS (SELECT 1 FROM projects WHERE id = v_project_id AND deleted_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Cannot restore: parent project is trashed';
      END IF;
      UPDATE sequences SET deleted_at = NULL, deleted_by = NULL WHERE id = p_entity_id;
    WHEN 'shot' THEN
      SELECT project_id INTO v_project_id FROM shots WHERE id = p_entity_id;
      IF EXISTS (SELECT 1 FROM projects WHERE id = v_project_id AND deleted_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Cannot restore: parent project is trashed';
      END IF;
      UPDATE shots SET deleted_at = NULL, deleted_by = NULL WHERE id = p_entity_id;
    WHEN 'task' THEN
      SELECT project_id INTO v_project_id FROM tasks WHERE id = p_entity_id;
      IF EXISTS (SELECT 1 FROM projects WHERE id = v_project_id AND deleted_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Cannot restore: parent project is trashed';
      END IF;
      UPDATE tasks SET deleted_at = NULL, deleted_by = NULL WHERE id = p_entity_id;
    WHEN 'version' THEN
      SELECT project_id INTO v_project_id FROM versions WHERE id = p_entity_id;
      IF EXISTS (SELECT 1 FROM projects WHERE id = v_project_id AND deleted_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Cannot restore: parent project is trashed';
      END IF;
      UPDATE versions SET deleted_at = NULL, deleted_by = NULL WHERE id = p_entity_id;
    WHEN 'note' THEN
      SELECT project_id, deleted_at INTO v_project_id, v_deleted_at FROM notes WHERE id = p_entity_id;
      IF EXISTS (SELECT 1 FROM projects WHERE id = v_project_id AND deleted_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Cannot restore: parent project is trashed';
      END IF;
      UPDATE notes SET deleted_at = NULL, deleted_by = NULL WHERE id = p_entity_id;
      -- Restore cascade-trashed child notes
      UPDATE notes SET deleted_at = NULL, deleted_by = NULL WHERE parent_note_id = p_entity_id AND deleted_at BETWEEN v_deleted_at - interval '1 second' AND v_deleted_at + interval '1 second';
    WHEN 'playlist' THEN
      SELECT project_id INTO v_project_id FROM playlists WHERE id = p_entity_id;
      IF EXISTS (SELECT 1 FROM projects WHERE id = v_project_id AND deleted_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Cannot restore: parent project is trashed';
      END IF;
      UPDATE playlists SET deleted_at = NULL, deleted_by = NULL WHERE id = p_entity_id;
    ELSE
      RAISE EXCEPTION 'Unknown entity type: %', p_entity_type;
  END CASE;

  RETURN jsonb_build_object('success', true, 'entity_type', p_entity_type, 'entity_id', p_entity_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: Get trashed entities
CREATE OR REPLACE FUNCTION get_trashed_entities(
  p_entity_type text DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
) RETURNS TABLE (
  id uuid,
  entity_type text,
  name text,
  code text,
  project_id uuid,
  project_name text,
  deleted_at timestamptz,
  deleted_by uuid,
  deleted_by_name text
) AS $$
BEGIN
  RETURN QUERY
  WITH trashed AS (
    -- Assets
    SELECT a.id, 'asset'::text as entity_type, a.name, a.code, a.project_id, p.name as project_name, a.deleted_at, a.deleted_by
    FROM assets a JOIN projects p ON p.id = a.project_id
    WHERE a.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'asset')
      AND (p_project_id IS NULL OR a.project_id = p_project_id)
      AND a.project_id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid())

    UNION ALL

    -- Sequences
    SELECT s.id, 'sequence'::text, s.name, s.code, s.project_id, p.name, s.deleted_at, s.deleted_by
    FROM sequences s JOIN projects p ON p.id = s.project_id
    WHERE s.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'sequence')
      AND (p_project_id IS NULL OR s.project_id = p_project_id)
      AND s.project_id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid())

    UNION ALL

    -- Shots
    SELECT sh.id, 'shot'::text, sh.name, sh.code, sh.project_id, p.name, sh.deleted_at, sh.deleted_by
    FROM shots sh JOIN projects p ON p.id = sh.project_id
    WHERE sh.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'shot')
      AND (p_project_id IS NULL OR sh.project_id = p_project_id)
      AND sh.project_id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid())

    UNION ALL

    -- Tasks
    SELECT t.id, 'task'::text, t.name, t.code, t.project_id, p.name, t.deleted_at, t.deleted_by
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'task')
      AND (p_project_id IS NULL OR t.project_id = p_project_id)
      AND t.project_id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid())

    UNION ALL

    -- Versions
    SELECT v.id, 'version'::text, v.name, v.code, v.project_id, p.name, v.deleted_at, v.deleted_by
    FROM versions v JOIN projects p ON p.id = v.project_id
    WHERE v.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'version')
      AND (p_project_id IS NULL OR v.project_id = p_project_id)
      AND v.project_id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid())

    UNION ALL

    -- Notes
    SELECT n.id, 'note'::text, n.subject as name, NULL::text as code, n.project_id, p.name, n.deleted_at, n.deleted_by
    FROM notes n JOIN projects p ON p.id = n.project_id
    WHERE n.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'note')
      AND (p_project_id IS NULL OR n.project_id = p_project_id)
      AND n.project_id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid())

    UNION ALL

    -- Playlists
    SELECT pl.id, 'playlist'::text, pl.name, pl.code, pl.project_id, p.name, pl.deleted_at, pl.deleted_by
    FROM playlists pl JOIN projects p ON p.id = pl.project_id
    WHERE pl.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'playlist')
      AND (p_project_id IS NULL OR pl.project_id = p_project_id)
      AND pl.project_id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid())

    UNION ALL

    -- Projects
    SELECT pr.id, 'project'::text, pr.name, pr.code, pr.id as project_id, pr.name as project_name, pr.deleted_at, pr.deleted_by
    FROM projects pr
    WHERE pr.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'project')
      AND (p_project_id IS NULL OR pr.id = p_project_id)
      AND pr.id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid())
  )
  SELECT
    trashed.id,
    trashed.entity_type,
    trashed.name,
    trashed.code,
    trashed.project_id,
    trashed.project_name,
    trashed.deleted_at,
    trashed.deleted_by,
    prof.full_name as deleted_by_name
  FROM trashed
  LEFT JOIN profiles prof ON prof.id = trashed.deleted_by
  WHERE (p_search IS NULL OR trashed.name ILIKE '%' || p_search || '%' OR trashed.code ILIKE '%' || p_search || '%')
  ORDER BY trashed.deleted_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 13. File Inventory (All Files to Create or Modify)

### New Files
| File | Purpose |
|---|---|
| `echo/migrations&fixes/generated/2026-02-XX-skull-island-soft-delete.sql` | Database migration |
| `echo/src/actions/skull-island.ts` | Server actions for restore/permanent delete |
| `echo/src/app/(dashboard)/skull-island/page.tsx` | Skull Island page |
| `echo/src/components/skull-island/trashed-entities-table.tsx` | Table component for trashed items |
| `echo/src/components/skull-island/restore-dialog.tsx` | Restore confirmation dialog |
| `echo/src/components/skull-island/permanent-delete-dialog.tsx` | Permanent delete confirmation |

### Modified Files
| File | Change |
|---|---|
| `echo/src/actions/assets.ts` | `deleteAsset` → soft-delete |
| `echo/src/actions/shots.ts` | `deleteShot` → soft-delete |
| `echo/src/actions/sequences.ts` | `deleteSequence` → soft-delete |
| `echo/src/actions/tasks.ts` | `deleteTask` → soft-delete |
| `echo/src/actions/versions.ts` | `deleteVersion` → soft-delete (keep storage file) |
| `echo/src/actions/notes.ts` | `deleteNote` → soft-delete |
| `echo/src/actions/playlists.ts` | `deletePlaylist` → soft-delete |
| `echo/src/actions/projects.ts` | `deleteProject` → soft-delete with cascade |
| `echo/src/components/layout/global-nav.tsx` | Add Skull Island nav item |
| `echo/src/components/table/entity-table.tsx` | Update delete action label/icon |

---

## 14. Open Questions

1. **Auto-purge policy?** — Should items in Skull Island be automatically permanently deleted after X days (e.g., 90 days)? ShotGrid keeps them forever, but that increases storage costs.
2. **Notification on trash?** — Should other project members be notified when someone trashes an entity? (e.g., "AJ trashed Shot SH010")
3. **Undo toast duration?** — How long should the "Undo" toast stay visible after trashing? (Suggestion: 10 seconds)
4. **Published files?** — Include `published_files` in Phase 1 or defer to Phase 2?
5. **Skull Island icon in sidebar or top nav only?** — Currently planning top nav. Should it also appear in project-level tabs?
