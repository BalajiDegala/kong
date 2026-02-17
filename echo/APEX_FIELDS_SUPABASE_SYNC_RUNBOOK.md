# Apex Fields + Supabase Sync Runbook

## Goal
Align Apex table behavior with Fields metadata so inline edit works consistently on root pages and subpages, without duplicate columns.

## Scope (Current Priority)
1. `tasks` root + subpages:
`/apex/[projectId]/tasks`
`/apex/[projectId]/shots/[shotId]/tasks`
`/apex/[projectId]/assets/[assetId]/tasks`
`/apex/[projectId]/sequences/[sequenceId]/tasks`
2. Shared table behavior (`EntityTable`) for runtime schema editors.
3. Fields metadata + Supabase migration sync (`schema_fields`, `schema_field_entities`, `schema_field_runtime_v`).

## Implementation Status (Code: 2026-02-16)
1. Task root + subpages now use direct `department` as the inline editable pipeline column.
2. Task create/edit dialogs now save `department` (with `step_id` compatibility handled server-side).
3. `reviewer` and `ayon_assignees` are wired as people multiselect in table + dialogs.
4. `assigned_to` update auto-defaults `ayon_assignees` locally and server-side.
5. Runtime dedupe now suppresses `step_id` when `department` is present and suppresses `template_task` when `task_template` exists.
6. Remaining work is primarily Supabase metadata/data migration (choice sets, data types, and cleanup of legacy field links).

## Locked Decisions (2026-02-16)
1. Pipeline step model will migrate to direct `department` field (not `step_id`).
2. `reviewer` supports multiple reviewers.
3. When `assigned_to` changes, `ayon_assignees` should auto-default to the same person.
4. Canonical template field is `task_template` only (`template_task` should be removed/deactivated from UI).
5. `ayon_sync_status` must be boolean checkbox.

## Confirmed Root Cause
1. Nested task pages use display columns (`step_name`, `assignee_name`) while runtime schema injects real editable columns (`step_id`, `assigned_to`), so both appear in column picker.
2. Some columns are hardcoded as text editors (`reviewer`, `task_template`, etc.), so Fields data type changes do not fully reflect in inline edit.
3. Runtime editor inference currently does not auto-map:
`status_list -> select`
`list -> select`
`multi_entity -> multiselect`
4. `display_order` defaults to `1000` by design in schema RPCs; it is a sort priority for field order per entity link (not a bug).

## Target Behavior
1. `assigned_to`: single-select from `profiles` (people).
2. `reviewer`: people selector (multi-select if column remains `multi_entity`).
3. `ayon_assignees`: people selector (multi-select).
4. `department` (direct): select from `departments` entity.
5. `ayon_sync_status`: checkbox (`boolean`) if business rule is true/false only.
6. `task_template`: list dropdown if field data type is `list` + choice set is attached.
7. No duplicate user-facing columns (single canonical column per concept).

## Implementation Plan
### Phase 1: UI Dedup + Canonical Columns
1. Replace nested task page alias columns with canonical IDs:
`step_name` -> `department` (with formatter label)
`assignee_name` -> `assigned_to` (with formatter label)
2. Keep computed display only as formatter, not separate visible column.
3. Apply same column spec across root + three subpages.

### Phase 2: People/Department Option Wiring
1. Load `profiles` once per page and build options for:
`assigned_to`, `reviewer`, `ayon_assignees`.
2. Load `departments` and use department labels for task linkage.
3. Ensure parse/format handles both UUID arrays and comma strings for legacy rows.
4. Keep `assigned_to -> ayon_assignees` default sync in server update path.

### Phase 3: Runtime Editor Inference Hardening
1. Update `EntityTable.inferSchemaColumnEditor`:
`status_list -> select`
`list -> select`
`multi_entity -> multiselect`
2. Add runtime option binding rules:
`status_list` => `listStatusNames(entity)`
`tags` / tag-like fields => `listTagNames()`
3. Keep explicit page options only where entity-specific source is required (people/steps).

### Phase 4: Thumbnail Parity
1. Ensure add/edit dialogs support thumbnail upload for all thumbnail-bearing entities.
2. Add inline thumbnail upload flow in table cell (or explicit row action) for `thumbnail_url`.
3. Start with tasks, versions, published files; then apply to notes/assets/shots/sequences where needed.

### Phase 5: Fields + Supabase Metadata Sync
1. Run audit SQL (below).
2. Correct field data types (`status`, `tags`, `reviewer`, `ayon_assignees`, `ayon_sync_status`, `task_template`) using RPC migration path.
3. Re-check `schema_field_runtime_v` after each correction.
4. Regenerate schema snapshot if needed.

## Supabase Audit SQL
```sql
-- 1) Inspect task-related field definitions
select
  sf.id,
  sf.code,
  sf.name,
  sf.data_type,
  sf.choice_set_id,
  array_agg(distinct sfe.entity_type order by sfe.entity_type) as entities,
  array_agg(distinct sfe.column_name order by sfe.column_name) as columns
from public.schema_fields sf
left join public.schema_field_entities sfe on sfe.field_id = sf.id
where sf.code in (
  'assigned_to',
  'reviewer',
  'ayon_assignees',
  'ayon_sync_status',
  'pipeline_step',
  'step_id',
  'department',
  'task_template',
  'template_task',
  'status',
  'tags'
)
group by sf.id, sf.code, sf.name, sf.data_type, sf.choice_set_id
order by sf.code, sf.id;
```

```sql
-- 2) Inspect runtime projection for task
select
  field_id,
  entity_type,
  column_name,
  code,
  name,
  data_type,
  field_type,
  display_order,
  required,
  visible_by_default
from public.schema_field_runtime_v
where entity_type = 'task'
order by display_order, name;
```

```sql
-- 3) Optional: detect duplicate semantic fields by code for task
select
  sf.code,
  count(*) as defs
from public.schema_fields sf
join public.schema_field_entities sfe on sfe.field_id = sf.id
where sfe.entity_type = 'task'
group by sf.code
having count(*) > 1
order by sf.code;
```

## Supabase Update SQL Template
```sql
-- Use after confirming target field_id
select public.schema_change_field_data_type(<field_id>, '<new_data_type>');
```

Examples:
1. `status -> status_list`
2. `tags -> multi_entity`
3. `reviewer -> multi_entity`
4. `ayon_assignees -> multi_entity`
5. `ayon_sync_status -> checkbox`
6. `task_template -> list` (and attach `choice_set_id`)

## Migration Sequence (Supabase SQL)
```sql
-- A) Add/activate direct department field on task (if missing)
-- Preferred metadata route: create field in Fields page with:
-- code=department, data_type=entity, entity=task, link target=department.

-- B) Backfill department from existing step_id relation (one-time)
-- (Assumes tasks.department exists as text and stores department id text)
update public.tasks t
set department = s.department_id::text
from public.steps s
where t.step_id = s.id
  and (t.department is null or btrim(t.department) = '')
  and s.department_id is not null;

-- C) Reviewer should be multi-value (text[] after migration)
-- Run through RPC after finding reviewer field_id:
-- select public.schema_change_field_data_type(<reviewer_field_id>, 'multi_entity');

-- D) Ayon assignees should be multi-value (text[])
-- select public.schema_change_field_data_type(<ayon_assignees_field_id>, 'multi_entity');

-- E) Convert ayon_sync_status to checkbox
-- select public.schema_change_field_data_type(<ayon_sync_status_field_id>, 'checkbox');

-- F) Convert task_template to list and attach choice set
-- select public.schema_change_field_data_type(<task_template_field_id>, 'list');
-- then update schema_fields.choice_set_id for that field_id.
```

## Post-Migration Cleanup
1. Hide/deactivate `template_task` mapping for `task` in Fields metadata.
2. Hide/deprecate `step_id`/pipeline-step UI column in tasks pages once department flow is stable.
3. Keep DB `step_id` temporarily for rollback compatibility; remove only after sign-off.

## Why `display_order = 1000`?
1. It is the default fallback sort order for newly linked fields.
2. Lower values show earlier in runtime field ordering.
3. `1000` is used to avoid accidental top-priority placement when adding new fields.
4. You can set specific priorities (for example `10`, `20`, `30`) for curated field order.

## Behavior Rules
1. Updating `assigned_to` auto-sets `ayon_assignees` to `[assigned_to]` unless `ayon_assignees` is explicitly provided in the same update.
2. User can still manually edit `ayon_assignees` later.
3. `reviewer` and `ayon_assignees` UI should always render as people multiselect.
4. `task_template` list must not stay unbound:
If `choice_set_id` is null, create/select a list in Fields page before rollout sign-off.

## Done Criteria
1. No duplicate columns in table toolbar for tasks pages and subpages.
2. Inline edit uses dropdown/multiselect for people, step, status, tags, task template list.
3. Fields page data type changes are reflected in Apex table editors.
4. Supabase metadata and UI behavior stay in sync after refresh.
