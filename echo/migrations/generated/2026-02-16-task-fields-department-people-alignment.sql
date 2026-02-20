-- ============================================================================
-- KONG: Task Fields Department + People Alignment
-- Date: 2026-02-16
--
-- Purpose:
-- 1) Make `department` the canonical task pipeline field (direct department link)
-- 2) Keep `step_id` only as legacy compatibility metadata
-- 3) Ensure reviewer/ayon_assignees are multi-value and people-linked
-- 4) Ensure ayon_sync_status is checkbox/boolean-aligned
-- 5) Ensure task_template is canonical (list-based), template_task is deactivated
--
-- Safe to re-run (idempotent where possible).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- A) Ensure direct department column exists on tasks
-- ----------------------------------------------------------------------------
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS department text;

-- ----------------------------------------------------------------------------
-- B) Backfill department from existing step_id
-- ----------------------------------------------------------------------------
UPDATE public.tasks t
SET department = s.department_id::text
FROM public.steps s
WHERE t.step_id = s.id
  AND (t.department IS NULL OR btrim(t.department) = '')
  AND s.department_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- C) Backfill step_id from department where missing (compatibility)
-- ----------------------------------------------------------------------------
UPDATE public.tasks t
SET step_id = (
  SELECT st.id
  FROM public.steps st
  WHERE st.department_id::text = t.department
  ORDER BY COALESCE(st.sort_order, 1000), st.id
  LIMIT 1
)
WHERE t.step_id IS NULL
  AND NULLIF(btrim(t.department), '') IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.steps st
    WHERE st.department_id::text = t.department
  );

-- ----------------------------------------------------------------------------
-- D) Align schema metadata and field links
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_department_field_id bigint;
  v_assigned_to_field_id bigint;
  v_reviewer_field_id bigint;
  v_ayon_assignees_field_id bigint;
  v_ayon_sync_status_field_id bigint;
  v_task_template_field_id bigint;
  v_task_template_choice_set_id bigint;
BEGIN
  -- Department field definition (global by code).
  SELECT sf.id
  INTO v_department_field_id
  FROM public.schema_fields sf
  WHERE sf.code = 'department'
  ORDER BY sf.id
  LIMIT 1;

  IF v_department_field_id IS NULL THEN
    INSERT INTO public.schema_fields (
      code,
      name,
      data_type,
      field_type,
      description,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      'department',
      'Department',
      'entity',
      'dynamic',
      'Direct department link for task pipeline',
      true,
      now(),
      now()
    )
    RETURNING id INTO v_department_field_id;
  END IF;

  -- Prevent unique(field_id, entity_type) conflicts for legacy links.
  DELETE FROM public.schema_field_entities sfe
  WHERE sfe.entity_type = 'task'
    AND sfe.field_id = v_department_field_id
    AND sfe.column_name <> 'department';

  -- Ensure task -> department runtime mapping exists and is active.
  INSERT INTO public.schema_field_entities (
    field_id,
    entity_type,
    table_name,
    column_name,
    required,
    visible_by_default,
    display_order,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    v_department_field_id,
    'task',
    'tasks',
    'department',
    false,
    true,
    120,
    true,
    now(),
    now()
  )
  ON CONFLICT (entity_type, column_name)
  DO UPDATE
  SET
    field_id = EXCLUDED.field_id,
    required = EXCLUDED.required,
    visible_by_default = EXCLUDED.visible_by_default,
    display_order = LEAST(public.schema_field_entities.display_order, EXCLUDED.display_order),
    is_active = true,
    updated_at = now();

  -- Legacy pipeline field should not be active in runtime UI for task.
  UPDATE public.schema_field_entities sfe
  SET
    is_active = false,
    updated_at = now()
  WHERE sfe.entity_type = 'task'
    AND sfe.column_name = 'step_id';

  -- Canonical template field is task_template; template_task should be inactive.
  UPDATE public.schema_field_entities sfe
  SET
    is_active = false,
    updated_at = now()
  WHERE sfe.entity_type = 'task'
    AND sfe.column_name = 'template_task';

  UPDATE public.schema_field_entities sfe
  SET
    is_active = true,
    updated_at = now()
  WHERE sfe.entity_type = 'task'
    AND sfe.column_name = 'task_template';

  -- Resolve task field ids by runtime column link.
  SELECT sf.id
  INTO v_assigned_to_field_id
  FROM public.schema_fields sf
  JOIN public.schema_field_entities sfe ON sfe.field_id = sf.id
  WHERE sfe.entity_type = 'task'
    AND sfe.column_name = 'assigned_to'
  ORDER BY sf.id
  LIMIT 1;

  SELECT sf.id
  INTO v_reviewer_field_id
  FROM public.schema_fields sf
  JOIN public.schema_field_entities sfe ON sfe.field_id = sf.id
  WHERE sfe.entity_type = 'task'
    AND sfe.column_name = 'reviewer'
  ORDER BY sf.id
  LIMIT 1;

  SELECT sf.id
  INTO v_ayon_assignees_field_id
  FROM public.schema_fields sf
  JOIN public.schema_field_entities sfe ON sfe.field_id = sf.id
  WHERE sfe.entity_type = 'task'
    AND sfe.column_name = 'ayon_assignees'
  ORDER BY sf.id
  LIMIT 1;

  SELECT sf.id
  INTO v_ayon_sync_status_field_id
  FROM public.schema_fields sf
  JOIN public.schema_field_entities sfe ON sfe.field_id = sf.id
  WHERE sfe.entity_type = 'task'
    AND sfe.column_name = 'ayon_sync_status'
  ORDER BY sf.id
  LIMIT 1;

  SELECT sf.id
  INTO v_task_template_field_id
  FROM public.schema_fields sf
  JOIN public.schema_field_entities sfe ON sfe.field_id = sf.id
  WHERE sfe.entity_type = 'task'
    AND sfe.column_name = 'task_template'
  ORDER BY sf.id
  LIMIT 1;

  -- Link targets for entity/multi-entity fields.
  IF v_department_field_id IS NOT NULL THEN
    INSERT INTO public.schema_field_link_targets (field_id, target_entity_type, created_at)
    VALUES (v_department_field_id, 'department', now())
    ON CONFLICT (field_id, target_entity_type) DO NOTHING;
  END IF;

  IF v_assigned_to_field_id IS NOT NULL THEN
    INSERT INTO public.schema_field_link_targets (field_id, target_entity_type, created_at)
    VALUES (v_assigned_to_field_id, 'person', now())
    ON CONFLICT (field_id, target_entity_type) DO NOTHING;
  END IF;

  IF v_reviewer_field_id IS NOT NULL THEN
    INSERT INTO public.schema_field_link_targets (field_id, target_entity_type, created_at)
    VALUES (v_reviewer_field_id, 'person', now())
    ON CONFLICT (field_id, target_entity_type) DO NOTHING;
  END IF;

  IF v_ayon_assignees_field_id IS NOT NULL THEN
    INSERT INTO public.schema_field_link_targets (field_id, target_entity_type, created_at)
    VALUES (v_ayon_assignees_field_id, 'person', now())
    ON CONFLICT (field_id, target_entity_type) DO NOTHING;
  END IF;

  -- Update field metadata directly (SQL Viewer safe, no auth.uid dependency).
  IF v_department_field_id IS NOT NULL THEN
    UPDATE public.schema_fields sf
    SET data_type = 'entity', updated_at = now()
    WHERE sf.id = v_department_field_id;
  END IF;

  IF v_reviewer_field_id IS NOT NULL THEN
    UPDATE public.schema_fields sf
    SET data_type = 'multi_entity', updated_at = now()
    WHERE sf.id = v_reviewer_field_id;
  END IF;

  IF v_ayon_assignees_field_id IS NOT NULL THEN
    UPDATE public.schema_fields sf
    SET data_type = 'multi_entity', updated_at = now()
    WHERE sf.id = v_ayon_assignees_field_id;
  END IF;

  IF v_ayon_sync_status_field_id IS NOT NULL THEN
    UPDATE public.schema_fields sf
    SET data_type = 'checkbox', updated_at = now()
    WHERE sf.id = v_ayon_sync_status_field_id;
  END IF;

  IF v_task_template_field_id IS NOT NULL THEN
    UPDATE public.schema_fields sf
    SET data_type = 'list', updated_at = now()
    WHERE sf.id = v_task_template_field_id;
  END IF;

  -- Ensure task_template has a choice set for list dropdown behavior.
  IF v_task_template_field_id IS NOT NULL THEN
    SELECT sf.choice_set_id
    INTO v_task_template_choice_set_id
    FROM public.schema_fields sf
    WHERE sf.id = v_task_template_field_id;

    IF v_task_template_choice_set_id IS NULL THEN
      SELECT cs.id
      INTO v_task_template_choice_set_id
      FROM public.schema_choice_sets cs
      WHERE lower(cs.name) IN ('task template', 'task templates')
      ORDER BY cs.id
      LIMIT 1;

      IF v_task_template_choice_set_id IS NULL THEN
        INSERT INTO public.schema_choice_sets (
          name,
          description,
          is_system,
          is_active,
          created_at,
          updated_at
        )
        VALUES (
          'Task Template',
          'Auto-generated task template list',
          false,
          true,
          now(),
          now()
        )
        RETURNING id INTO v_task_template_choice_set_id;
      END IF;

      UPDATE public.schema_fields sf
      SET
        choice_set_id = v_task_template_choice_set_id,
        updated_at = now()
      WHERE sf.id = v_task_template_field_id;
    END IF;

    -- Seed list items from existing task values (if any).
    INSERT INTO public.schema_choice_set_items (
      choice_set_id,
      value,
      label,
      sort_order,
      is_active,
      created_at,
      updated_at
    )
    SELECT
      v_task_template_choice_set_id,
      src.value,
      src.value,
      src.sort_order,
      true,
      now(),
      now()
    FROM (
      SELECT
        value,
        row_number() OVER (ORDER BY value) * 10 AS sort_order
      FROM (
        SELECT DISTINCT btrim(t.task_template) AS value
        FROM public.tasks t
        WHERE NULLIF(btrim(t.task_template), '') IS NOT NULL
      ) d
    ) src
    ON CONFLICT (choice_set_id, value)
    DO UPDATE
    SET
      label = EXCLUDED.label,
      is_active = true,
      updated_at = now();
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- E) Data cleanup for reviewer / ayon_assignees / ayon_sync_status
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_reviewer_type text;
  v_ayon_assignees_type text;
  v_ayon_sync_status_type text;
  v_has_parse_array boolean;
  v_has_parse_boolean boolean;
BEGIN
  SELECT to_regprocedure('public.schema_try_parse_text_array(text)') IS NOT NULL
  INTO v_has_parse_array;
  SELECT to_regprocedure('public.schema_try_parse_boolean(text)') IS NOT NULL
  INTO v_has_parse_boolean;

  SELECT c.udt_name
  INTO v_reviewer_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'tasks'
    AND c.column_name = 'reviewer';

  IF v_reviewer_type IN ('text', 'varchar') THEN
    IF v_has_parse_array THEN
      EXECUTE $sql$
        ALTER TABLE public.tasks
        ALTER COLUMN reviewer TYPE text[]
        USING COALESCE(public.schema_try_parse_text_array(reviewer), '{}'::text[])
      $sql$;
    ELSE
      EXECUTE $sql$
        ALTER TABLE public.tasks
        ALTER COLUMN reviewer TYPE text[]
        USING CASE
          WHEN reviewer IS NULL OR btrim(reviewer) = '' THEN '{}'::text[]
          ELSE regexp_split_to_array(reviewer, '\s*,\s*')
        END
      $sql$;
    END IF;
  END IF;

  SELECT c.udt_name
  INTO v_ayon_assignees_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'tasks'
    AND c.column_name = 'ayon_assignees';

  IF v_ayon_assignees_type IN ('text', 'varchar') THEN
    IF v_has_parse_array THEN
      EXECUTE $sql$
        ALTER TABLE public.tasks
        ALTER COLUMN ayon_assignees TYPE text[]
        USING COALESCE(public.schema_try_parse_text_array(ayon_assignees), '{}'::text[])
      $sql$;
    ELSE
      EXECUTE $sql$
        ALTER TABLE public.tasks
        ALTER COLUMN ayon_assignees TYPE text[]
        USING CASE
          WHEN ayon_assignees IS NULL OR btrim(ayon_assignees) = '' THEN '{}'::text[]
          ELSE regexp_split_to_array(ayon_assignees, '\s*,\s*')
        END
      $sql$;
    END IF;
  END IF;

  SELECT c.udt_name
  INTO v_ayon_sync_status_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'tasks'
    AND c.column_name = 'ayon_sync_status';

  IF v_ayon_sync_status_type IN ('text', 'varchar') THEN
    IF v_has_parse_boolean THEN
      EXECUTE $sql$
        ALTER TABLE public.tasks
        ALTER COLUMN ayon_sync_status TYPE boolean
        USING COALESCE(public.schema_try_parse_boolean(ayon_sync_status), false)
      $sql$;
    ELSE
      EXECUTE $sql$
        ALTER TABLE public.tasks
        ALTER COLUMN ayon_sync_status TYPE boolean
        USING CASE
          WHEN lower(COALESCE(ayon_sync_status, '')) IN ('1', 'true', 't', 'yes', 'y', 'on') THEN true
          ELSE false
        END
      $sql$;
    END IF;
  END IF;

  -- Final normalization after type conversion.
  SELECT c.udt_name
  INTO v_reviewer_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'tasks'
    AND c.column_name = 'reviewer';

  IF v_reviewer_type = '_text' THEN
    UPDATE public.tasks t
    SET reviewer = COALESCE((
      SELECT array_agg(v.item)
      FROM (
        SELECT DISTINCT btrim(item) AS item
        FROM unnest(COALESCE(t.reviewer, '{}'::text[])) AS u(item)
        WHERE NULLIF(btrim(item), '') IS NOT NULL
        ORDER BY btrim(item)
      ) v
    ), '{}'::text[])
    WHERE t.reviewer IS NOT NULL;
  END IF;

  SELECT c.udt_name
  INTO v_ayon_assignees_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'tasks'
    AND c.column_name = 'ayon_assignees';

  IF v_ayon_assignees_type = '_text' THEN
    UPDATE public.tasks t
    SET ayon_assignees = COALESCE((
      SELECT array_agg(v.item)
      FROM (
        SELECT DISTINCT btrim(item) AS item
        FROM unnest(COALESCE(t.ayon_assignees, '{}'::text[])) AS u(item)
        WHERE NULLIF(btrim(item), '') IS NOT NULL
        ORDER BY btrim(item)
      ) v
    ), '{}'::text[])
    WHERE t.ayon_assignees IS NOT NULL;
  END IF;

  SELECT c.udt_name
  INTO v_ayon_sync_status_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'tasks'
    AND c.column_name = 'ayon_sync_status';

  IF v_ayon_sync_status_type = 'bool' THEN
    UPDATE public.tasks t
    SET ayon_sync_status = COALESCE(t.ayon_sync_status, false)
    WHERE t.ayon_sync_status IS NULL;
  END IF;
END
$$;

COMMIT;

-- ----------------------------------------------------------------------------
-- Optional verification queries (run manually after migration)
-- ----------------------------------------------------------------------------
-- select field_id, entity_type, column_name, code, data_type, field_type, display_order, required, visible_by_default
-- from public.schema_field_runtime_v
-- where entity_type = 'task'
-- order by display_order, name;
--
-- select id, department, step_id, reviewer, ayon_assignees, ayon_sync_status, task_template
-- from public.tasks
-- order by id desc
-- limit 50;
