# Tags, Departments, People Updates (February 20, 2026)

## Scope
This document records completed parity updates for:
- `/tags`
- `/departments`
- `/people`

## Completed Updates

1. Bulk delete support
- Added `onBulkDelete` wiring on all 3 pages.
- Added shared delete helpers per page (`deleteTagIds`, `deleteDepartmentIds`, `deleteUserIds`).
- Single delete and bulk delete now follow the same deletion path.

2. Immediate refresh after delete
- Each page now reloads data after successful delete operations.
- No manual browser refresh required to see removed rows.

3. CSV import support
- Added `onCsvImport` wiring on all 3 pages.
- Added CSV export filename wiring:
  - `tags`
  - `departments`
  - `people`
- Added row-level validation and failure reporting from import handlers.

4. Import CSV visible on empty tables
- Removed separate `length === 0` render branches.
- `EntityTable` is now always rendered for these pages.
- Empty-state UI is passed via `emptyState`, so toolbar actions (including Import CSV) remain available when no rows exist.

5. Soft-deleted projects excluded from People project options
- Updated people page projects query to exclude soft-deleted projects from the dropdown (`deleted_at IS NULL`).

6. Runtime stability fix
- `EntityTable` now correctly destructures `onBulkDeleteConfirm` in props.
- Fixes runtime error: `onBulkDeleteConfirm is not defined`.

## Files Updated
- `echo/src/app/(dashboard)/tags/page.tsx`
- `echo/src/app/(dashboard)/departments/page.tsx`
- `echo/src/app/(dashboard)/people/page.tsx`
- `echo/src/components/table/entity-table.tsx`
- `echo/TAGS_DEPARTMENTS_PEOPLE_PARITY_PLAN.md`
- `echo/STATUS_PAGE_UPDATES_2026-02-20.md`
