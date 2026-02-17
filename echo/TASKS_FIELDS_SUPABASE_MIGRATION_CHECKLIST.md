# Tasks Fields -> Supabase Migration Checklist

## Purpose
Use this file after finishing Fields-page metadata edits, then run the matching SQL updates in Supabase so Apex task UI behavior stays consistent.

## Locked Rules
1. `department` is the canonical pipeline field (direct department link).
2. `reviewer` is multi-select (people).
3. `assigned_to` defaults `ayon_assignees` to the same person.
4. `task_template` is canonical (`template_task` should be hidden/deactivated).
5. `ayon_sync_status` is boolean checkbox.

## Step 1: Audit Current Field Metadata
```sql
select
  sf.id as field_id,
  sf.code,
  sf.name,
  sf.data_type,
  sf.choice_set_id,
  array_agg(distinct sfe.entity_type order by sfe.entity_type) as entities,
  array_agg(distinct sfe.column_name order by sfe.column_name) as columns
from public.schema_fields sf
left join public.schema_field_entities sfe on sfe.field_id = sf.id
where sf.code in (
  'department',
  'pipeline_step',
  'step_id',
  'assigned_to',
  'reviewer',
  'ayon_assignees',
  'ayon_sync_status',
  'task_template',
  'template_task',
  'status',
  'tags'
)
group by sf.id, sf.code, sf.name, sf.data_type, sf.choice_set_id
order by sf.code, sf.id;
```

## Step 2: Apply Required Field-Type Fixes (Task Entity)
Run with the correct `field_id` values from Step 1.

```sql
-- reviewer -> multi_entity
select public.schema_change_field_data_type(<reviewer_field_id>, 'multi_entity');

-- ayon_assignees -> multi_entity
select public.schema_change_field_data_type(<ayon_assignees_field_id>, 'multi_entity');

-- ayon_sync_status -> checkbox
select public.schema_change_field_data_type(<ayon_sync_status_field_id>, 'checkbox');

-- task_template -> list
select public.schema_change_field_data_type(<task_template_field_id>, 'list');
```

If `task_template` becomes `list`, assign a choice set:
```sql
update public.schema_fields
set choice_set_id = <choice_set_id>
where id = <task_template_field_id>;
```

## Step 3: Department Migration (Data Backfill)
Backfill direct task `department` from legacy `step_id`:

```sql
update public.tasks t
set department = s.department_id::text
from public.steps s
where t.step_id = s.id
  and (t.department is null or btrim(t.department) = '')
  and s.department_id is not null;
```

## Step 4: Normalize Existing Task Data
Normalize legacy values so new UI editors behave correctly.

```sql
-- Run this only if reviewer is already text[]:
update public.tasks
set reviewer = (
  select coalesce(array_agg(trim(value)), '{}')
  from unnest(coalesce(reviewer, '{}')) as value
  where trim(value) <> ''
)
where reviewer is not null;

-- Run this only if ayon_assignees is already text[]:
update public.tasks
set ayon_assignees = (
  select coalesce(array_agg(trim(value)), '{}')
  from unnest(coalesce(ayon_assignees, '{}')) as value
  where trim(value) <> ''
)
where ayon_assignees is not null;

-- normalize boolean-like values for checkbox migration
update public.tasks
set ayon_sync_status = case
  when lower(coalesce(ayon_sync_status, '')) in ('true', '1', 'yes', 'on') then 'true'
  else 'false'
end;
```

## Step 5: Runtime Verification
```sql
select
  field_id,
  entity_type,
  column_name,
  code,
  data_type,
  field_type,
  display_order,
  required,
  visible_by_default
from public.schema_field_runtime_v
where entity_type = 'task'
order by display_order, name;
```

Expected checks:
1. `department` is present for `task`.
2. `reviewer` and `ayon_assignees` are `multi_entity`.
3. `ayon_sync_status` is `checkbox`.
4. `task_template` is `list` with non-null `choice_set_id`.
5. `template_task` is deactivated or not linked to `task`.

## Step 6: UI Regression Smoke
1. Root: `/apex/[projectId]/tasks`
2. Subpages:
`/apex/[projectId]/shots/[shotId]/tasks`
`/apex/[projectId]/assets/[assetId]/tasks`
`/apex/[projectId]/sequences/[sequenceId]/tasks`

Confirm:
1. No duplicate pipeline/assignee/template columns.
2. Pipeline Step edits via department dropdown.
3. Reviewer/Ayon Assignees use people multiselect.
4. Assigned To change auto-defaults Ayon Assignees.
5. Ayon Sync Status edits as checkbox.
