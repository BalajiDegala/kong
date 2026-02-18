# Apex Info + Header Fix Plan (2026-02-17)

## Objective
Stabilize Info and entity-detail header behavior so it matches table-page editing semantics and AYON-like UX:
- No duplicate/ambiguous fields
- Correct editor types (`select`, `multiselect`, `number`, `date`, `datetime`, `boolean`)
- Correct display values (project names instead of raw IDs)
- Task pipeline step editable from department dropdown
- Consistent Info page controls (search + configure columns)

## Issues Reported
1. Task Info shows duplicate/overlapping "Assigned To" style entries.
2. Dropdown fields (`status`, `department`, `assigned_to`, `reviewer`, `tags`) degraded to text editing in places.
3. Task header shows `Step` but is not editable as pipeline step.
4. Project shows numeric value (for example `1`) where project name is expected.
5. Date and number fields are treated as text.
6. Dropdown presentation width/UX is inconsistent.
7. Info pages need search + configure columns.

## Root-Cause Areas
1. Shared field schema lacked explicit editor metadata for some column types.
2. Manual display fields and auto fields can coexist with duplicate meaning.
3. Task header used a read-only `step` display field instead of editable `department`.
4. Info pages included relation IDs (`project_id`) that conflict with display fields (`project_display`).
5. Shared components didn’t expose typed renderers for all field classes.

## Execution Plan
1. **Typed options parity**
- Keep/extend shared option loader for `status`, `tags`, `department`, `assigned_to`, `reviewer`, `ayon_assignees`.
- Apply option map consistently in all entity header layouts and all Info pages.

2. **Field type parity**
- Extend shared inferred types to include `date` and `datetime`.
- Ensure number/date/datetime renderers use proper input controls.

3. **Task header pipeline step fix**
- Replace read-only task `step` display with editable `department` field labeled `Pipeline Step`.
- Backed by department option list.

4. **Duplicate + unused field cleanup**
- Remove duplicate semantic rows where editable field already exists.
- Keep display-only row only when there is no equivalent editable field.
- Prefer meaningful display rows (project/artist/task labels) and suppress conflicting raw relation IDs.

5. **Project label correctness**
- Exclude `project_id` from Info-page field sets when `project_display` is present.
- Ensure `Project` shows name/code label.

6. **Info-page controls**
- Add `Fields` popover with search + checkbox visibility toggle (localStorage persisted).
- Keep current simple row layout while adding this control.

7. **Dropdown UX consistency**
- Normalize select widths in header + info editors to avoid oversized/awkward native dropdown rendering.

8. **Validation**
- Lint all touched files.
- Manual checks across:
  - Tasks Info/Header
  - Versions Info/Header
  - Assets, Shots, Sequences, Playlists Info/Header
- Verify:
  - Dropdown fields stay dropdowns
  - No duplicate "Assigned To"/Project rows
  - Date/number editors behave correctly
  - Pipeline step editable from department list in task header

## Acceptance Criteria
1. No duplicate semantic fields on Info pages for key columns.
2. Task header pipeline step editable via department dropdown.
3. Project displays name/code, not raw numeric project ID.
4. Dates and numbers use typed inputs.
5. Info pages have working search + configure columns.
6. Header and Info pages use consistent per-field edit UX.
