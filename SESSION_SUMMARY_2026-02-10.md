# Kong Platform - Session Summary (2026-02-10)

## Summary
Built ShotGrid-style schema + UI for Assets, Sequences, Shots, Tasks, Versions (Playlists shell already present), with inline edit and link navigation. Removed all `ayon_*` fields from new schema work as requested.

## Database Migrations (run on Supabase)
Run these (safe to re-run; all `ADD COLUMN IF NOT EXISTS`):
1. `echo/migrations&fixes/migration-add-asset-custom-fields.sql`
2. `echo/migrations&fixes/migration-add-sequence-custom-fields.sql` (updated, no `ayon_*`)
3. `echo/migrations&fixes/migration-add-shot-custom-fields.sql` (new)
4. `echo/migrations&fixes/migration-add-task-custom-fields.sql` (new)
5. `echo/migrations&fixes/migration-add-version-custom-fields.sql` (new)

Removed `ayon_*` from:
- `echo/migrations&fixes/migration-add-sequence-custom-fields.sql`
- `echo/migrations&fixes/migration-add-project-shotgrid-columns.sql`

## Key UI Updates
### List Pages (ShotGrid tables + inline edit)
- `echo/src/app/(dashboard)/apex/[projectId]/assets/page.tsx`
- `echo/src/app/(dashboard)/apex/[projectId]/sequences/page.tsx`
- `echo/src/app/(dashboard)/apex/[projectId]/shots/page.tsx`
- `echo/src/app/(dashboard)/apex/[projectId]/tasks/page.tsx`
- `echo/src/app/(dashboard)/apex/[projectId]/versions/page.tsx`

### Detail Info Tabs (expanded fields)
- `echo/src/app/(dashboard)/apex/[projectId]/sequences/[sequenceId]/info/page.tsx`
- `echo/src/app/(dashboard)/apex/[projectId]/shots/[shotId]/info/page.tsx`
- `echo/src/app/(dashboard)/apex/[projectId]/tasks/[taskId]/info/page.tsx`
- `echo/src/app/(dashboard)/apex/[projectId]/versions/[versionId]/info/page.tsx`

### Navigation
Clicking Asset/Sequence/Shot/Task/Version names now opens the detail pages.

## Server Actions Updated
Added new fields + `{ revalidate: false }` support for inline edit:
- `echo/src/actions/sequences.ts`
- `echo/src/actions/shots.ts`
- `echo/src/actions/tasks.ts`
- `echo/src/actions/versions.ts`

## Notes
- Multi-entity link fields are stored as `text[]` for now (per current plan).
- All `ayon_*` columns removed from UI/migrations as requested.

## Next Steps (future sessions)
1. Build **detail tab tables** (Tasks/Shots/Assets/Versions/Publishes/Notes) to match screenshots.
2. Add **inline edit** inside those tab tables.
3. Extend **create/edit dialogs** for new custom fields (sequence/shot/task/version).
4. Optionally add **drop migration** to remove existing `ayon_*` columns from DB if they were created earlier.
