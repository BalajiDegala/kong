# Apex Entity UI Rollout Plan

## Goal
Create a repeatable rollout template so every Apex entity page has the same behavior for inline editing, dropdown-based relations, local thumbnail upload, dynamic status/tag options, and consistent entity identity rules.

## Baseline Completed
1. `assets` page is the current reference implementation.
2. `sequences` page has been aligned to the same model.
3. `shots` page is now aligned to the same model.

## Entity Identity Rules (Mandatory)
1. Every entity must expose both a human name and a stable code when applicable.
2. Cross-entity references must use business code labels in UI, not raw IDs and not ambiguous names.
3. Sequence code is generated from sequence name on create and is permanent (not editable later).
4. Shot code is generated as `SEQUENCE_CODE + SHOT_TOKEN` on create and is permanent (not editable later).
5. `client_name` and `dd_client_name` default to generated code values but remain user-editable.
6. Server actions must enforce code immutability even if a client sends code updates.

## What "Done" Means For Any Entity
1. Table columns only show user-facing values, not raw IDs.
2. Relationship fields use inline dropdowns (`select` or `multiselect`) with options loaded from real entity tables.
3. Tags and status values are dynamic and sourced from `tags` and `status` tables.
4. Inline edits save without full page re-render.
5. Create and Edit dialogs support local thumbnail image upload (no thumbnail URL input).
6. Edit dialog layout matches create dialog style with scrollable content.
7. Entity link columns are usable (`open_notes`, `tasks`, etc.) and count columns are visible where applicable.
8. Schema/Data check panels are removed where not needed.
9. Name and code are both visible where needed (`Sequence Name` + `Sequence Code`, `Shot Name` + `Shot Code`).
10. Code fields are read-only in UI and immutable in server update actions.

## Shared Implementation Pattern
1. Page file:
Add normalized row typing, option loaders, and `handleCellUpdate` mapping.
Use table column definitions with `editor: 'select'` or `editor: 'multiselect'`.
Map relation arrays with parse/format helpers.
2. Dialog files:
Use aligned create/edit form layouts.
Use local thumbnail upload with client-side compression.
Persist `thumbnail_url` from uploaded data URL and optional `thumbnail_blur_hash`.
3. Data-source rules:
Statuses come from `listStatusNames('<entity_type>')`.
Tags come from `listTagNames()`.
Entity relations come from table lookups filtered by `project_id`.
4. Code-display and immutability rules:
Show business codes (example: shot as `SEQCODE + SHOTCODE`) instead of internal IDs.
When related entity names can collide, always display the disambiguated code.
Sequence code is generated from sequence name and cannot be edited after create.
Shot code is generated from sequence code + shot token and cannot be edited after create.
Client-facing aliases (`client_name`, `dd_client_name`) default from code but can be changed manually.

## Sequence Rollout Notes (Applied)
1. Dynamic status dropdown from `status` table for entity type `sequence`.
2. Dynamic tags multiselect from `tags` table.
3. Shots and assets relations exposed as multiselect with code-based display.
4. `open_notes` and `tasks` rendered as navigable links with count visibility.
5. `thumbnail_blur_hash` editable and local thumbnail upload enabled in create/edit dialogs.

## Next Entities To Apply
1. `tasks`
2. `versions`
3. `notes` (if relation dropdowns are required)

## Rollout Checklist Per Entity
1. Update page columns and inline editors.
2. Add option loaders for all relation fields.
3. Normalize read/write format for arrays and status values.
4. Align create dialog with local thumbnail upload behavior.
5. Align edit dialog with create dialog layout and scrolling.
6. Wire link columns for notes/tasks/history if available.
7. Enforce code immutability in server update actions (`deny` code in update payload).
8. Ensure create flow generates code defaults and client/DD name defaults.
9. Run lint on changed files and validate one full create-edit-inline flow manually.

## Validation Script (Example)
Run lint against only changed files:
`npm run lint -- 'src/app/(dashboard)/apex/[projectId]/<entity>/page.tsx' 'src/components/apex/create-<entity>-dialog.tsx' 'src/components/apex/edit-<entity>-dialog.tsx'`
