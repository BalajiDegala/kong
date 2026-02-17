# Apex Projects UI And Data Plan

## Scope
This plan covers `/apex` and all project subpages under `/apex/[projectId]`, with shared work centered on `EntityTable` and `TableToolbar`.

## Goals
1. Fix core usability issues in Projects and project subpages.
2. Make table behavior user-centric and persistent per user.
3. Improve scalability for large datasets.
4. Add import/export workflows needed for production use.

## Progress Snapshot (2026-02-16)
Completed:
1. Apex top navigation + project submenu added.
2. Main page naming aligned to `Apex / Project Excel`.
3. Grid view restricted to main `/apex` projects page.
4. Project navigation changed to name-click only (grid/list).
5. Inline project thumbnail upload added in grid and list.
6. Project card thumbnail rendering fixed (full-cover image).
7. Default grouping removed from core project subpages.
8. Preferences foundation expanded for page-scoped per-user persistence:
   `column_order`, `column_widths`, `visible_columns`, `sort`, `group_by`, `view_mode`, `grid_card_size`
   with graceful fallback when extended DB columns are unavailable.
9. Grid card size slider added for `/apex` projects grid and wired to persistence.
10. Filters redesigned to add-only fields: key filters by default, extra filters via dropdown, and removable filter fields.
11. Table list header set to sticky within table scroller for better visibility while scrolling.
12. Pinned/frozen columns implemented in list view with per-page persistence and pin/unpin controls in Fields menu.
13. Client-side pagination added with page-size selector, page navigation, and visible range footer summary.
14. CSV export added in shared table with options for current page, filtered rows, and selected rows.
15. CSV import wizard added in shared table with upload, delimiter detection, header parsing, column mapping, and preview.
16. Row multi-select added for grid/list with select-page, select-filtered, clear, and optional bulk delete action hook.
17. `/apex` projects page wired for CSV import and bulk delete using existing project actions.
18. Top-level project subpages wired for CSV import + bulk delete:
    `assets`, `sequences`, `shots`, `tasks`, `versions`, `notes`, `published-files`, `playlists`.
19. Bulk field update controls added for selected rows in shared table (status/tags/assignee and other editable columns via `onCellUpdate`).
20. CSV import dialog redesigned to a 4-step wizard UI (Add data, Map columns, Specify ID, Preview) with AYON-style horizontal mapping rows.
21. Scroll-layout refactor applied: table pages now use split zones (toolbar/filter header fixed, table viewport scrollable, pagination footer fixed) with page-level horizontal scroll disabled.

Next:
1. Extend CSV import/bulk delete handlers to nested subpages (entity detail children pages).
2. Add role-safe guardrails and confirmation flows for high-impact bulk updates.
3. Move large pages from client pagination to server range/count queries.

## Priority Order
1. P0: Fix project grid cards not responding.
2. P0: Remove forced default grouping on pages and set group default to none.
3. P0: Restrict grid view to main `/apex` page only.
4. P1: Table preferences expansion and persistence in DB (per user).
5. P1: Filter UX redesign (add-only filters, not all visible by default).
6. P1: Sticky header and pinned columns support.
7. P1: Pagination (client + server query path).
8. P1: CSV export.
9. P1: CSV import with column mapping and validation.
10. P2: Bulk row selection and bulk actions.
11. P2: Project grid thumbnail upload + grid size control persistence.
12. P2: Remaining UI visibility/readability improvements and placeholder page completion.

## Workstream A: Immediate Fixes
1. Keep project navigation on project name click only (no card/thumbnail click navigation).
2. Verify thumbnail upload interactions in both grid and list stay inline-edit friendly.
3. Remove `groupBy` props currently hardcoded on project and subpages.
4. Keep default sort/group UI state as `None`.
5. Keep deterministic data fetch ordering at query layer unless changed explicitly later.
6. Disable grid toggle for non-project pages.

## Workstream B: Table Preference Model
1. Extend `user_table_preferences` payload to include `sort`, `group_by`, `grid_card_size`, `active_filter_fields`, and `active_filters`.
2. Add page-scope key to avoid preference collision between pages sharing same `entityType`.
3. Keep localStorage fallback for offline/temporary fallback only.
4. Ensure preferences restore correctly after login and browser restart.

## Workstream C: Filters Redesign
1. Show only key default filters initially (status/type/step/assignee based on page).
2. Add `Add Filter` dropdown to append additional filter fields.
3. Render only selected filter chips/controls.
4. Allow remove/reset per filter and clear-all action.
5. Provide mobile-friendly filter drawer/popover.

## Workstream D: Projects Grid Improvements
1. Keep grid mode only for `/apex`.
2. Add thumbnail upload action directly from project card.
3. Add grid card size slider for `/apex`.
4. Persist card size in DB preference and local fallback.

## Workstream E: Pagination, Export, Import
1. Add pagination controls and page-size selector.
2. Move list pages to paginated Supabase queries (`range`) with total count.
3. Add CSV export for selected rows, filtered rows, and full result.
4. Add CSV import wizard end-to-end.
5. Parse file and infer delimiter/header.
6. Map CSV columns to entity fields.
7. Validate required fields and type conversions.
8. Preview before commit.
9. Import with success/error report and downloadable failures.
10. Save mapping presets per entity and user.

## Workstream F: Bulk Actions And Usability
1. Add row selection column and select-all.
2. Add bulk action bar for delete/status/tag updates (role-safe).
3. Improve default table readability (density control wired to UI).
4. Normalize status color rendering to handle lowercase values.

## Workstream G: Placeholder/Incomplete Pages
1. Replace placeholder activity/history panels with real data-backed views.
2. Complete project overview widgets currently marked placeholder.

## Acceptance Criteria
1. Project cards on `/apex` are clickable and consistently navigate.
2. No project or project-subpage is grouped by default.
3. Non-project subpages do not expose grid/list toggle.
4. User preference state restores after page reload and login.
5. Filters are opt-in via add-filter; all filters are not auto-rendered.
6. Sticky header stays visible while scrolling table body.
7. Pagination works with large datasets without full-table render lag.
8. CSV export and CSV import mapping flow work end-to-end.
9. Bulk select and bulk actions work safely and predictably.

## Execution Notes
1. Implement shared table changes first, then roll them into pages.
2. Roll out in small PR-sized steps to reduce regression risk.
3. Add focused tests for parser/mapping logic and table-state persistence.
4. Validate with real large project data before final rollout.
