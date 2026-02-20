# Status Page Updates (February 20, 2026)

## Scope
This document records the recent Status page updates in Kong (`/status`).

## Completed Updates

1. Bulk delete support
- Added multi-select delete handling on Status table.
- Supports deleting grouped status variants (`_status_ids`) in one action.
- Single-delete and bulk-delete now use shared delete logic.

2. Immediate list refresh after delete
- After successful delete, Status data reloads immediately.
- Manual browser refresh is no longer required.

3. CSV import on Status page
- Added `onCsvImport` wiring to Status table.
- Added `csvExportFilename="statuses"`.
- Import parser supports:
  - `status_name` / `name` / `status`
  - `short_code` / `code`
  - `background_color` / `color`
  - `icon` / `icon_value`
  - `entity_types` / `entity_types_label` / `entity_type`
  - `sort_order` / `order` / `order_index`
  - `locked_by_system` / `is_system_locked` / `is_locked` / `is_default`

4. Import CSV availability on empty table
- Status page now renders `EntityTable` even when there are no rows.
- Empty-state UI is passed via `emptyState` prop.
- Result: toolbar actions like `Import CSV` are visible on empty state.

5. Icon selection improvements
- Added icon library/preset set (20+ options) in Status dialog.
- Added icon preview in dialog.
- Added icon rendering in table row display.
- Added icon token normalization + alias matching.

6. Entity-type multi-select fix
- Fixed `All entities` toggle behavior so users can uncheck `all` and select individual entity types.

7. Layout cleanup
- Removed blank space under entity types by adjusting dialog layout.
- Icon picker changed to line-by-line horizontal grid.

8. Runtime fix in `EntityTable`
- Fixed `onBulkDeleteConfirm is not defined` by destructuring prop in `EntityTable` function args.

## Core Files Touched
- `echo/src/app/(dashboard)/status/page.tsx`
- `echo/src/components/table/entity-table.tsx`

