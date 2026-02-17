# Apex Entity UI Rollout Plan

## Goal
Create a repeatable rollout template so every Apex entity page has the same behavior for inline editing, dropdown-based relations, local thumbnail upload, dynamic status/tag options, and consistent entity identity rules.

## Baseline Completed
1. `assets`, `sequences`, `shots`, and `tasks` are live with create, inline update, and delete flows.
2. `sequences` and `shots` are aligned to the identity model with code immutability enforced in UI and server update actions.
3. `tasks` now uses runtime status/tag options, relation dropdowns, direct `department` pipeline mapping, and aligned create/edit dialogs (with local thumbnail upload).

## Verification Snapshot (Checked: 2026-02-16)
1. `assets`: Mostly aligned to rollout goals. Dynamic status/tag options, relation dropdowns, inline updates, link columns, and create/edit thumbnail upload are in place. Remaining policy gap: `code` is still editable in `edit-asset-dialog` and `updateAsset`; decide if asset code should be immutable after create.
2. `sequences`: Aligned. Dynamic status/tags, relation multiselects, link columns, create/edit parity, local thumbnail upload, and immutable `code` are all present.
3. `shots`: Aligned. Dynamic status/tags, relation multiselects, link columns, create/edit parity, local thumbnail upload, and immutable `code` are all present.
4. `tasks`: Aligned for current sprint scope. Dynamic status/tags, dropdown editors for key relations, direct `department` pipeline selection, create/edit parity, local thumbnail upload, and immutable `entity_type`/`entity_id` on update are present.

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

## Next Entities To Apply (Remaining)
1. `notes`
2. `assets` follow-up: finalize code immutability policy (keep editable or lock after create)

## Notes Rollout Plan (Remaining)
1. Scope files:
`src/app/(dashboard)/apex/[projectId]/notes/page.tsx`
`src/components/apex/create-note-dialog.tsx`
`src/actions/notes.ts`
2. Current state:
Code-aware labels and URL mapping are already implemented for `asset`, `shot`, `sequence`, `task`, `version`, and `published_file`.
`project` note links currently rely on fallback mapping.
Status options are already dynamic from `listStatusNames('note')` in page + create dialog.
3. Remaining gaps:
No explicit edit dialog path (`onEdit`) exists; page is inline-edit + create-only today.
`published_file` links currently route to list (`/published-files`) rather than a record-specific destination.
Entity relink immutability policy is not explicit in `updateNote` (`entity_type`/`entity_id` are not denied).
4. Implementation steps:
Decide edit model: keep inline-only or add `edit-note-dialog`; avoid maintaining two partial models.
If adding edit dialog, match create dialog layout and preserve attachment workflow.
Define final destination behavior for `published_file` references (detail route if available, otherwise explicit list-link labeling).
If relink should be blocked after create, deny `entity_type` and `entity_id` in `updateNote`.
5. Done criteria:
Edit model is explicit and consistent (inline-only or dialog parity).
All entity links resolve to intentional targets with clear labels.
Status remains dropdown-based from runtime `status` table.

## Published Files Rollout Plan
1. Scope files:
`src/app/(dashboard)/apex/[projectId]/published-files/page.tsx`
`src/app/(dashboard)/apex/[projectId]/assets/[assetId]/publishes/page.tsx`
`src/app/(dashboard)/apex/[projectId]/shots/[shotId]/publishes/page.tsx`
`src/app/(dashboard)/apex/[projectId]/sequences/[sequenceId]/publishes/page.tsx`
`src/app/(dashboard)/apex/[projectId]/tasks/[taskId]/publishes/page.tsx`
`src/app/(dashboard)/apex/[projectId]/versions/[versionId]/publishes/page.tsx`
`src/components/apex/create-published-file-dialog.tsx`
`src/components/apex/edit-published-file-dialog.tsx`
`src/actions/published-files.ts`
2. Current gaps:
None for this rollout scope.
3. Completed in this pass:
Page status now uses runtime `listStatusNames('published_file')` with `select`.
Page tags now use runtime `listTagNames()` with `multiselect`.
Create dialog status options now come from runtime `status` table (no hardcoded-only list).
Create dialog tags now use runtime `tags` options via multiselect dropdown.
Added `EditPublishedFileDialog` and wired `onEdit` on the page for right-click edit parity.
Added `EditPublishedFileDialog` and wired `onEdit` on scoped publish-list subpages (`asset`, `shot`, `sequence`, `task`, `version`).
`updatePublishedFile` now enforces immutability for `code`, `entity_type`, and `entity_id`.
4. Implementation steps:
None for current rollout scope.
5. Done criteria:
No hardcoded status values remain.
Status/tags are runtime-driven and editable via select/multiselect.
Edit path is explicit and consistent with create flow.

## Versions Rollout Plan
1. Scope files:
`src/app/(dashboard)/apex/[projectId]/versions/page.tsx`
`src/app/(dashboard)/apex/[projectId]/assets/[assetId]/versions/page.tsx`
`src/app/(dashboard)/apex/[projectId]/shots/[shotId]/versions/page.tsx`
`src/app/(dashboard)/apex/[projectId]/tasks/[taskId]/versions/page.tsx`
`src/app/(dashboard)/apex/[projectId]/playlists/[playlistId]/versions/page.tsx`
`src/components/apex/upload-version-dialog.tsx`
`src/components/apex/edit-version-dialog.tsx`
`src/actions/versions.ts`
2. Current gaps:
None for this rollout scope.
3. Completed in this pass:
Table status now uses runtime `listStatusNames('version')` with `select`.
Table tags now use runtime `listTagNames()` with `multiselect`.
Version `code` is now immutable post-create (`updateVersion` denies `code`, and code is read-only in table UI).
Added `EditVersionDialog` and wired `onEdit` on the page for right-click edit parity.
Added `EditVersionDialog` and wired `onEdit` on scoped version-list subpages (`asset`, `shot`, `task`, `playlist`).
Added local thumbnail upload + `thumbnail_blur_hash` handling in both create (`UploadVersionDialog`) and edit dialogs.
Upload/create dialog now includes runtime status select and runtime tags multiselect.
4. Implementation steps:
None for current rollout scope.
5. Done criteria:
Status/tags are runtime-driven with dropdown/multiselect editing.
Version edit flow has clear create-vs-edit separation with UI parity.
Code immutability policy is explicit and enforced.

## Runtime Custom Field Contract
1. Keep `pickEntityColumnsForWrite` in server actions so writes accept runtime schema columns from `schema_field_runtime_v`.
2. Keep `SchemaExtraFields` enabled in create/edit dialogs where schema extensibility is required.
3. Keep table rendering via `EntityTable` schema merge (base schema + runtime fields).
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

## Manual QA For Remaining Entities
1. Notes: create one note for each supported target entity type and confirm label + URL resolution.
2. Notes: update note status inline and confirm dropdown options come from `status` table.
3. Published Files: create + inline edit one row and verify status/tags behavior after runtime-option rollout.
4. Versions: upload one version, edit post-create fields, and verify create/edit flow separation after rollout.
5. For every updated entity, reopen dialogs and verify arrays, links, and dates round-trip without full page reload.

## Status/Tags Metadata Remediation Plan (Supabase + UI)
1. Why this section exists:
`status` and `tags` can still behave like free text when runtime metadata (`schema_fields` / `schema_field_runtime_v`) says `text` or when a page bypasses runtime editors. This causes drift between Fields setup and Apex table behavior.
2. Source of truth contract:
`status` field data type must be `status_list` for each entity (`task`, `note`, `published_file`, `version`, `shot`, `asset`, `sequence`) where status is used.
`tags` field data type must be `multi_entity` (stored as `text[]`) and rendered with runtime tag options from `tags` table.
If `tags` remains `text`, table/editor behavior regresses to plain text entry.
3. Supabase audit query (run first):
```sql
select
  sf.id,
  sf.code,
  sf.name,
  sf.data_type,
  array_agg(distinct sfe.entity_type order by sfe.entity_type) as entities
from public.schema_fields sf
left join public.schema_field_entities sfe on sfe.field_id = sf.id
where sf.code in ('status', 'tags')
group by sf.id, sf.code, sf.name, sf.data_type
order by sf.code, sf.id;
```
4. Supabase correction steps:
For each `status` field row that is not `status_list`, run `schema_change_field_data_type(field_id, 'status_list')`.
For each `tags` field row that is not `multi_entity`, run `schema_change_field_data_type(field_id, 'multi_entity')`.
After data-type changes, re-check `schema_field_runtime_v` to confirm `data_type` is updated for all linked entity types.
If multiple duplicate `status` or `tags` field definitions exist, consolidate to one canonical definition per code and keep entity mappings in `schema_field_entities`.
5. UI hardening tasks (prevent future drift):
In `EntityTable` runtime schema mapping, ensure `status_list` resolves to `select` editor automatically.
In `EntityTable` runtime schema mapping, ensure `multi_entity` resolves to `multiselect` editor automatically.
Keep `status` options sourced from `listStatusNames('<entity>')` and `tags` from `listTagNames()` in entity pages/dialogs until runtime option binding is fully generic.
6. Known drift backlog from latest sweep (outside current notes/publishes/versions pass):
`src/app/(dashboard)/apex/[projectId]/assets/[assetId]/shots/page.tsx`: `status` still uses text editor.
`src/app/(dashboard)/apex/[projectId]/sequences/[sequenceId]/shots/page.tsx`: `status` still uses text editor.
`src/app/(dashboard)/apex/[projectId]/sequences/[sequenceId]/assets/page.tsx`: `tags` still uses text editor.
`src/app/(dashboard)/apex/[projectId]/shots/[shotId]/assets/page.tsx`: `tags` still uses text editor.
7. Execution order:
Phase 1: Fix Supabase metadata (`status`/`tags`) and verify `schema_field_runtime_v`.
Phase 2: Patch remaining page-level editor drift from backlog above.
Phase 3: Run QA matrix for root and nested pages (`/tasks`, `/notes`, `/publishes`, `/versions`, `/shots`, `/assets`).
Phase 4: Capture a one-page regression checklist and keep it in this file.
8. Exit criteria:
Fields page shows `status` as `Status List` and `tags` as `Multi-Entity` for all intended entities.
Right-click inline edit shows dropdown/multiselect behavior (not text box) for `status` and `tags` on all root and nested pages.
Create/Edit dialogs and inline edit all use the same option sets for `status` and `tags`.
