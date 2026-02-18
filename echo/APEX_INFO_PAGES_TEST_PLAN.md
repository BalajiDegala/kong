# Apex Info Pages Parity + Edit Test Plan

## Objective
Make all Apex `Info` subpages consistent with schema fields, include missing fields (for example `Ayon ID` on Version), and add per-field pencil editing on the Info page UI.

Checked on: 2026-02-17

## Scope
1. `echo/src/app/(dashboard)/apex/[projectId]/assets/[assetId]/info/page.tsx`
2. `echo/src/app/(dashboard)/apex/[projectId]/sequences/[sequenceId]/info/page.tsx`
3. `echo/src/app/(dashboard)/apex/[projectId]/shots/[shotId]/info/page.tsx`
4. `echo/src/app/(dashboard)/apex/[projectId]/tasks/[taskId]/info/page.tsx`
5. `echo/src/app/(dashboard)/apex/[projectId]/versions/[versionId]/info/page.tsx`
6. `echo/src/app/(dashboard)/apex/[projectId]/playlists/[playlistId]/info/page.tsx`

## Current Gaps
1. Each Info page uses a hard-coded `fields` list, so it drifts from schema/runtime fields.
2. Version Info does not expose `Ayon ID`, even though schema has `version.ayon_id` in `echo/src/lib/schema/schema.generated.ts`.
3. Info rows are read-only today; there is no per-row pencil edit action.
4. ID label is currently generic (`Id`), not aligned with the expected field naming (`Ayon ID` where applicable).
5. Field controls are not aligned with requested UX:
No search.
No "show selected fields only" toggle.
Show all relevant fields in a simple list-style info panel.

## UX Requirements (Requested)
1. Keep the Info page visual style simple like existing AYON reference.
2. Show all fields in the page list (no field-search/filter UI).
3. Show a pencil icon on each editable row.
4. Keep non-editable rows visible but without edit affordance.

## Technical Direction
1. Build one shared Info renderer component:
`echo/src/components/apex/entity-info-panel.tsx`
2. Build shared field mapping helpers so Info pages are schema-driven:
`echo/src/lib/apex/entity-info-fields.ts`
3. Reuse existing safe editability constraints from header logic:
`echo/src/lib/apex/entity-header-fields.ts`
4. Reuse existing entity update server actions:
`updateAsset`, `updateSequence`, `updateShot`, `updateTask`, `updateVersion`, `updatePlaylist`.

## Implementation Plan
1. Field parity layer
Create a schema-driven field builder for each entity (`asset`, `sequence`, `shot`, `task`, `version`, `playlist`) with:
- Raw column-backed fields from schema/runtime.
- Manual display fields for relation labels (`project`, `sequence`, `shot`, `artist`, `task`, etc.) as read-only.
- Explicit support for `Ayon ID` (`ayon_id`) wherever schema includes it.

2. Unified Info row model
Standardize each Info row as:
- `id`
- `label`
- `type` (`text | number | boolean | readonly | textarea`)
- `value`
- `editable`
- `column` (for write-back)

3. Inline edit UI
In shared panel component:
- Show label/value rows.
- If editable, show pencil icon (same interaction model as header/table style).
- Support Enter to save for text/number, checkbox for boolean, Escape to cancel.
- Show inline loading spinner and error feedback per row.

4. Save behavior
- Patch only one field at a time.
- Use entity-specific server action.
- Optimistic local value update; rollback on API error.

5. Replace duplicated page code
- Keep each `info/page.tsx` responsible for data fetch and auth/redirect.
- Move rendering/edit logic into shared component.

## Test Plan
### A. Parity Validation (All Entities)
1. Open each Info page and verify row count is not limited to older hard-coded subset.
2. Confirm `Ayon ID` row appears for entities with `ayon_id` in schema:
- assets
- sequences
- shots
- tasks
- versions
3. Confirm playlist page excludes `Ayon ID` if schema/table does not include it.
4. Confirm no relation-object rows show `[object Object]`.

### B. Editability Validation
1. Editable text field (example: description/status) shows pencil and saves.
2. Editable number field saves and re-renders correctly.
3. Editable boolean field toggles and saves.
4. Non-editable fields (IDs, system-owned, computed, relation-only display rows) show no pencil.
5. Invalid value handling:
- Save failure restores previous value.
- Error message is visible and non-blocking.

### C. UX Validation
1. Info page remains simple list layout (matching reference style).
2. No search input in Info page.
3. No field visibility selector in Info page.
4. All rows are visible by default (subject to schema + safe exclusions).

### D. Regression Validation
1. Header region still works (jump dropdown, thumbnail, header edits).
2. Info page edits do not break activity/history/versions tabs.
3. Navigation between entities preserves stable Info rendering.

## Acceptance Criteria
1. Version Info includes `Ayon ID`.
2. All Info pages use shared rendering/edit pattern.
3. Per-field pencil editing exists for editable fields on every Info page.
4. No search/filter controls on Info page.
5. Lint passes for all touched files.

## Rollout Sequence
1. Implement shared model + component.
2. Migrate Version Info first (highest-priority parity issue).
3. Migrate Task, Shot, Asset, Sequence, Playlist.
4. Run parity + edit QA checklist.
5. Capture final verification notes in this file.

## Risks / Open Questions
1. Label source for ID:
Should final UI show `Ayon ID`, `ID`, or both when both columns exist?
2. Date/time editing policy:
Keep read-only for first pass, or enable date-picker edits immediately?
3. Relation fields:
Should relation display rows remain read-only in Info page, with relation edits done in table/dialog only?
