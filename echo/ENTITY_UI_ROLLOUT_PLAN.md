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
1. `tasks` (current sprint)
2. `notes` (current sprint)
3. `versions` (next sprint)

## Tasks Rollout Plan (Current Sprint)
1. Scope files:
`src/app/(dashboard)/apex/[projectId]/tasks/page.tsx`
`src/components/apex/create-task-dialog.tsx`
`src/components/apex/edit-task-dialog.tsx`
`src/actions/tasks.ts`
2. Current gaps to close:
Task status and tags are still mostly free-text in page/dialogs.
Task page does not expose relation editors as dropdowns for all editable relations.
Edit dialog is not aligned with create dialog layout and does not expose schema extra fields.
Local thumbnail upload flow is not wired for task dialogs.
3. Implementation steps:
Load `status` options with `listStatusNames('task')` and feed into table/dialog `select` controls.
Load tag options with `listTagNames()` and use `multiselect` for `tags`.
Normalize table editors for `step_id`, `assigned_to`, `priority`, `status`, `reviewer`, and list fields (`cc`, `tags`, `versions`).
Keep `entity_type` and `entity_id` immutable in update payloads; only allow relink where explicitly designed.
Align `edit-task-dialog` UI structure with create dialog (scroll container, same field grouping, same visual style).
Add `SchemaExtraFields entity="task"` in edit dialog to match create behavior.
Add optional local thumbnail upload helper in create/edit, persisting `thumbnail_url` and optional `thumbnail_blur_hash`.
4. Done criteria:
Task inline edit uses dropdowns/multiselect where applicable and saves without full reload.
Create and edit task dialogs expose equivalent fields and schema extra fields.
Status and tag options come from runtime tables, not hardcoded constants.
Runtime custom fields created from `/fields` are visible and writable in task table/dialogs.

## Notes Rollout Plan (Current Sprint)
1. Scope files:
`src/app/(dashboard)/apex/[projectId]/notes/page.tsx`
`src/components/apex/create-note-dialog.tsx`
`src/actions/notes.ts`
2. Current gaps to close:
Notes table link label currently uses `entity_type #id` instead of business code labels.
Notes status is free-text in dialog and table, not driven by `status` table.
Linked entity URL coverage is partial (only asset/shot paths currently resolved in page mapping).
No dedicated edit note dialog parity plan exists yet.
3. Implementation steps:
Build entity label map from related tables (`assets`, `shots`, `sequences`, `tasks`, `versions`) and render code-first labels.
Resolve link URLs for all supported note entity targets under `/apex/[projectId]/...`.
Load `status` options with `listStatusNames('note')` and use dropdowns in table/dialog.
Keep existing attachment upload flow in create dialog and preserve link-to-entity selectors.
Decide edit model and keep one path only: inline-only plus create dialog enhancements, or add full `edit-note-dialog`.
If inline-only is chosen, ensure all required editable fields are covered and validated there.
4. Done criteria:
Notes page shows disambiguated, clickable entity references using code-aware labels.
Status editing is dropdown-based and sourced from runtime status data.
Create note dialog keeps attachments and relation selectors while using normalized status/options.
Runtime custom fields created from `/fields` are visible and writable in notes table/dialogs.

## Runtime Custom Field Contract (Tasks and Notes)
1. Use `pickEntityColumnsForWrite` in server actions so writes accept runtime schema columns from `schema_field_runtime_v`.
2. Keep `SchemaExtraFields` enabled in create/edit dialogs so optional runtime fields are user-selectable.
3. Ensure table columns merge static schema plus runtime schema for `tasks` and `notes`.
4. Treat system columns (`id`, `project_id`, `created_at`, `updated_at`, ownership fields) as non-editable regardless of runtime metadata.

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

## Manual QA For Tasks and Notes
1. Create one task and one note with only required fields; confirm row appears without page reload.
2. Create one task and one note using runtime custom fields from `/fields`; confirm values persist in DB and UI.
3. Update status and tags inline for task and note; confirm dropdown options come from `status`/`tags` tables.
4. For notes, link each supported entity type and confirm label/URL resolves to the expected detail page.
5. Reopen create/edit dialogs and verify previously saved values, especially arrays and dates, round-trip correctly.
