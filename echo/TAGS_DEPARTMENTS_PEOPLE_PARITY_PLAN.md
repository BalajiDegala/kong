# Rollout Plan: Tags, Departments, People Parity

## Goal
Apply the same UX parity implemented on `/status` to:
- `/tags`
- `/departments`
- `/people`

Focus items:
- Bulk delete
- CSV import
- Import CSV availability when table is empty
- Icon logic (where entity schema has icon-like field)
- Immediate UI refresh after delete/import

## Current Gap Summary

1. Tags (`echo/src/app/(dashboard)/tags/page.tsx`)
- Uses custom empty-state branch instead of `EntityTable.emptyState`.
- No `onBulkDelete` wiring.
- No `onCsvImport` wiring.
- Context-menu single delete exists.

2. Departments (`echo/src/app/(dashboard)/departments/page.tsx`)
- Uses custom empty-state branch instead of `EntityTable.emptyState`.
- No `onBulkDelete` wiring.
- No `onCsvImport` wiring.
- Context-menu single delete exists.

3. People (`echo/src/app/(dashboard)/people/page.tsx`)
- Uses custom empty-state branch instead of `EntityTable.emptyState`.
- No `onBulkDelete` wiring.
- No `onCsvImport` wiring.
- Context-menu single delete exists.

## Implementation Plan

### Phase 1: Shared Behavior Pattern
1. Create a shared local pattern in each page:
- `delete<Entity>Ids(...)`
- `handleBulkDelete(rows)`
- `handleCsvImport(rows)`
- `emptyState` JSX block passed into `EntityTable`

2. Ensure post-mutation refresh:
- Call page loader after successful delete/import.
- Keep local counters in sync.

### Phase 2: Page-by-Page Wiring

1. Tags page
- File: `echo/src/app/(dashboard)/tags/page.tsx`
- Add:
  - `onBulkDelete={(rows) => ...}`
  - `onCsvImport={handleCsvImport}`
  - `csvExportFilename="tags"`
  - `emptyState={...}`
- Remove separate `tags.length === 0` render branch.

2. Departments page
- File: `echo/src/app/(dashboard)/departments/page.tsx`
- Add:
  - `onBulkDelete={(rows) => ...}`
  - `onCsvImport={handleCsvImport}`
  - `csvExportFilename="departments"`
  - `emptyState={...}`
- Remove separate `departments.length === 0` render branch.

3. People page
- File: `echo/src/app/(dashboard)/people/page.tsx`
- Add:
  - `onBulkDelete={(rows) => ...}`
  - `onCsvImport={handleCsvImport}`
  - `csvExportFilename="people"`
  - `emptyState={...}`
- Remove separate `profiles.length === 0` render branch.

### Phase 3: Icon Logic Parity
1. Tags
- If icon column exists in schema/table:
  - Add icon picker + preview similar to Status dialog.
  - Render icon in table column with fallback.

2. Departments
- If icon column exists:
  - Same as above.
- If only thumbnail exists:
  - Keep thumbnail flow; no artificial icon field.

3. People
- Prefer avatar (thumbnail) workflow.
- Add icon picker only if people schema has explicit icon field.

## CSV Import Field Mapping Targets

1. Tags
- `name`, `code`, `color`, `icon`, `entity_type`, `sort_order`, `locked_by_system` (if present).

2. Departments
- `name`, `code`, `description`, `thumbnail_url`, `color` (if present), `status` (if present).

3. People
- `display_name`, `firstname`, `lastname`, `email`, `department`, `active`, `avatar_url`, role/access fields where supported.

## Acceptance Criteria

1. Bulk delete
- Multi-select delete works on all 3 pages.
- Selection clears after successful bulk delete.
- No manual refresh required.

2. CSV import
- `Import CSV` visible on all 3 pages.
- Works when table has zero rows.
- Row-level validation errors are returned and surfaced.

3. Empty state behavior
- `EntityTable` is always rendered (except hard load-error cases).
- Custom empty UI appears through `emptyState` prop.

4. Icons
- If icon field exists, user can select from preset icon list and preview.
- Table displays icon consistently.

## Execution Order

1. Tags parity
2. Departments parity
3. People parity
4. Icon enhancements only where schema supports icon columns
5. Final cross-page QA pass

