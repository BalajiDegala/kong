# Session Summary - February 6, 2026

## Overview
This session focused on completing the Notes system, implementing Versions & File Uploads, and establishing consistent patterns for entity linking across the platform.

## Major Accomplishments

### 1. Fixed Notes System
**Problem:** Notes had multiple schema and functionality issues
**Solution:**
- Added missing columns: `created_by`, `status`, `task_id`
- Added foreign key constraint: `notes_created_by_fkey` (references profiles)
- Created complete RLS policies for notes table
- Added project membership check (user must be member via `project_members` table)
- Fixed profiles table: added `full_name` and `email` columns

**Files Changed:**
- `/dd/ayon/git/kong/echo/migration-add-created-by-notes.sql`
- `/dd/ayon/git/kong/echo/migration-notes-rls-policies.sql`
- `/dd/ayon/git/kong/echo/fix-profiles-columns.sql`
- `/dd/ayon/git/kong/echo/src/components/apex/create-note-dialog.tsx`
- `/dd/ayon/git/kong/echo/src/actions/notes.ts`

### 2. Implemented Versions & File Uploads
**Features:**
- Upload files (images, videos, PDFs, ZIPs) to Supabase Storage
- Link versions to assets or shots
- View/play uploaded files in modal viewer
- Download functionality
- Version metadata (code, version number, description, status)

**Database:**
- Versions table already existed with proper schema
- Added missing columns: `file_path`, `created_by`
- Created storage bucket: `versions` (50MB limit)
- Added RLS policies for versions table and storage

**Files Created:**
- `/dd/ayon/git/kong/echo/src/actions/versions.ts` - Server actions
- `/dd/ayon/git/kong/echo/src/components/apex/upload-version-dialog.tsx` - Upload UI
- `/dd/ayon/git/kong/echo/src/components/apex/version-viewer.tsx` - Media viewer
- `/dd/ayon/git/kong/echo/src/app/(dashboard)/apex/[projectId]/versions/page.tsx` - Versions page
- `/dd/ayon/git/kong/echo/setup-versions-storage.sql` - Database setup

### 3. Standardized Entity Linking Pattern
**Pattern Established:**
- Primary link: Asset OR Shot (required)
- Optional link: Task within that asset/shot
- Applies to: Notes, Versions

**Database Constraints:**
- `notes.entity_type`: CHECK constraint allows only 'asset' or 'shot'
- `versions.entity_type`: CHECK constraint allows only 'asset' or 'shot'
- Both tables have `task_id` column (nullable, references tasks table)

**Implementation:**
- Updated CreateNoteDialog and UploadVersionDialog
- Added task selector that filters tasks by selected entity
- Tasks load with `entity_type` and `entity_id` for filtering

**Files Changed:**
- `/dd/ayon/git/kong/echo/update-notes-schema.sql`
- `/dd/ayon/git/kong/echo/src/components/apex/create-note-dialog.tsx`
- `/dd/ayon/git/kong/echo/src/components/apex/upload-version-dialog.tsx`
- `/dd/ayon/git/kong/echo/src/actions/notes.ts`
- `/dd/ayon/git/kong/echo/src/actions/versions.ts`

### 4. Implemented Note Attachments
**Features:**
- Attach multiple images/PDFs to notes
- File upload in create note dialog
- Storage bucket: `note-attachments` (10MB limit)
- Server actions for upload/delete
- Preview chips with remove option

**Database:**
- Used existing `attachments` table (columns: id, note_id, file_name, file_size, file_type, storage_path, thumbnail_url, created_by, created_at)
- Created RLS policies for attachments table
- Created storage bucket with policies

**Files Created:**
- `/dd/ayon/git/kong/echo/src/actions/attachments.ts` - Upload/delete actions
- `/dd/ayon/git/kong/echo/setup-note-attachments.sql` - Database setup

**Files Changed:**
- `/dd/ayon/git/kong/echo/src/components/apex/create-note-dialog.tsx` - Added file upload

### 5. Version Viewer
**Features:**
- Modal viewer for uploaded versions
- Image lightbox display
- Video player with controls
- PDF iframe viewer
- Download functionality
- Navigation between versions (prev/next arrows)
- Signed URLs for secure private storage access

**Files Created:**
- `/dd/ayon/git/kong/echo/src/components/apex/version-viewer.tsx`

**Files Changed:**
- `/dd/ayon/git/kong/echo/src/app/(dashboard)/apex/[projectId]/versions/page.tsx` - Added viewer integration

## Technical Issues Resolved

### Project Membership
**Problem:** User couldn't create notes due to RLS violation
**Cause:** User not added to `project_members` table
**Solution:** Created SQL to add user as 'lead' role
**Valid Roles:** 'lead', 'member', 'viewer' (NOT 'alpha', 'admin', etc.)
**File:** `/dd/ayon/git/kong/echo/fix-add-user-to-projects.sql`

### Entity Type Constraints
**Discovery:** Database uses check constraints for valid values
- `project_members.role`: 'lead', 'member', 'viewer'
- `notes.entity_type`: 'asset', 'shot'
- `versions.entity_type`: 'asset', 'shot'

**Pattern:** Always check constraints before implementing features

### Task Linking Bug in Versions
**Problem:** Task dropdown was empty in versions upload dialog
**Cause:** Loading tasks without `entity_type` and `entity_id` fields
**Solution:** Updated query to include these fields for filtering
**Lesson:** When filtering data client-side, ensure all filter fields are fetched

## Key Architectural Patterns

### Supabase Client Pattern
- Browser: `createClient()` from `@/lib/supabase/client`
- Server: `await createClient()` from `@/lib/supabase/server`
- Never store clients in globals

### RLS Policy Pattern
```sql
-- SELECT: View in projects user is member of
CREATE POLICY "policy_name"
ON table_name FOR SELECT TO authenticated
USING (
  project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
);

-- INSERT: Create in projects user is member of
CREATE POLICY "policy_name"
ON table_name FOR INSERT TO authenticated
WITH CHECK (
  project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
);
```

### Storage Bucket Pattern
- Private buckets (public = false)
- Signed URLs for access (1-hour expiry)
- RLS policies on storage.objects
- File size limits (10MB for attachments, 50MB for versions)
- Allowed MIME types specified

### Dialog Pattern
- Create dialog with form
- Server actions for mutations
- Client-side validation
- Refresh router after success
- Reset form on close

### Entity Linking Pattern
1. Select entity type (asset/shot)
2. Select specific entity
3. Optionally select task within entity
4. Filter tasks by `entity_type` and `entity_id`

## Current System State

### Implemented Features
✅ Projects (CRUD)
✅ Assets (CRUD)
✅ Shots (CRUD)
✅ Tasks (CRUD with entity linking)
✅ Notes (CRUD with attachments and entity linking)
✅ Versions (Upload, View, with entity linking)
✅ Version Viewer (Images, Videos, PDFs)
✅ Note Attachments (Multiple files per note)

### Database Tables in Use
- `profiles` - User profiles (with full_name, email)
- `projects` - Project management
- `project_members` - Project membership (roles: lead/member/viewer)
- `sequences` - Shot grouping
- `assets` - Asset management
- `shots` - Shot management
- `steps` - Pipeline steps
- `tasks` - Task management (linked to assets/shots)
- `notes` - Comments/feedback (linked to assets/shots, optional task)
- `versions` - File uploads (linked to assets/shots, optional task)
- `attachments` - Note attachments

### Storage Buckets
- `versions` - Version files (50MB limit)
- `note-attachments` - Note attachments (10MB limit)

## Known Issues & Limitations

### Note Attachments Display
**Status:** Upload works, but notes page doesn't display attachments yet
**Next Step:** Update notes page to fetch and display attached images
**Query Needed:**
```typescript
const { data } = await supabase
  .from('notes')
  .select(`
    *,
    created_by_profile:profiles!notes_created_by_fkey(full_name, email),
    attachments(id, file_name, storage_path, file_type)
  `)
```

### Task Linking to Notes (Deferred)
**Status:** Can link notes to assets/shots, but not directly to tasks as primary entity
**Reason:** Database constraint limits entity_type to 'asset' or 'shot'
**Current Solution:** Use task_id field to optionally link to task within entity
**Note:** User mentioned this would be addressed in "phase 2" planning

## Next Steps (Phase 2)

### 1. Display Note Attachments
- Update notes page to fetch attachments
- Display thumbnails in notes feed
- Generate signed URLs for viewing
- Add lightbox for full-size view

### 2. Drawing Annotations (Major Feature)
**Goal:** ShotGrid-style markup on versions
**Features:**
- Draw shapes, arrows, text on images/videos
- Mark specific frames in videos
- Save annotations as separate images
- Auto-create notes with annotated images attached
- Collaborative markup tools

**Technical Requirements:**
- Canvas-based drawing library (e.g., Fabric.js, Konva)
- Frame extraction for videos
- Annotation data structure (coordinates, shapes, text)
- New table: `annotations` or store in versions
- Integration with notes system

### 3. Remaining Roadmap Features
- Playlists - Review playlists for client feedback
- Activity Feed - Real-time activity tracking
- User Management - Add/remove team members
- Search & Filters - Global search
- Notifications - Real-time updates and @mentions

## User Account Info
- Email: balajid@d2.com
- Role: lead (admin level)
- Must be in `project_members` table for each project

## Important File Locations

### Schema & Migrations
- Main schema: `/dd/ayon/git/kong/kong-schema-migration-v2.sql`
- Migrations folder: `/dd/ayon/git/kong/echo/` (various migration-*.sql files)

### Application Code
- Actions: `/dd/ayon/git/kong/echo/src/actions/`
- Components: `/dd/ayon/git/kong/echo/src/components/apex/`
- Pages: `/dd/ayon/git/kong/echo/src/app/(dashboard)/apex/[projectId]/`

### Documentation
- Start here: `/dd/ayon/git/kong/START_HERE.md`
- UI patterns: `/dd/ayon/git/kong/UI_ARCHITECTURE_SHOTGRID.md`
- Project guide: `/dd/ayon/git/kong/CLAUDE.md`
- Memory: `/dd/home/balajid/.claude/projects/-dd-ayon-git-kong/memory/MEMORY.md`

## Migration Files Created This Session
1. `migration-add-created-by-notes.sql` - Added created_by, status columns to notes
2. `migration-notes-rls-policies.sql` - RLS policies for notes
3. `fix-add-user-to-projects.sql` - Add user to project_members
4. `fix-profiles-columns.sql` - Add full_name, email to profiles
5. `verify-and-fix-fk.sql` - Fixed notes_created_by_fkey constraint
6. `update-notes-schema.sql` - Added task_id, entity_type constraint to notes
7. `add-file-path-to-versions.sql` - Added file_path, created_by to versions
8. `setup-versions-storage.sql` - Storage bucket and RLS for versions
9. `setup-note-attachments.sql` - Storage bucket and RLS for attachments

## Tips for Future Sessions

### Always Check First
1. Run CHECK queries for constraints before implementing
2. Check if columns exist before adding
3. Verify RLS policies exist
4. Check project membership for the user

### Common Patterns
- Entity linking: asset/shot + optional task
- RLS: project membership check required
- Storage: private buckets with signed URLs
- Roles: lead/member/viewer (not alpha/admin)

### When Things Break
1. Check RLS policies (most common issue)
2. Check project_members table
3. Check foreign key constraints
4. Check entity_type constraints
5. Look at browser console for detailed errors

## Session Statistics
- Duration: ~3 hours
- Files created: 15+
- Migration files: 9
- Features completed: 3 major (Notes fixes, Versions, Attachments)
- Issues resolved: 10+
