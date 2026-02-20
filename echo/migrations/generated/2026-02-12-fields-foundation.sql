-- ============================================================================
-- KONG: Fields Foundation (Phase 1)
-- Baseline validated against: supabase/supabase-kubernetes/charts/kong212.sql
-- Date: 2026-02-12
--
-- Purpose:
-- - Introduce DB-backed field metadata so schema can be managed from UI later.
-- - Provide safe, role-gated functions to add columns to entity tables.
-- - Keep operations additive and non-destructive (no drop column in v1).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) Choice sets for list/status-like field types
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.schema_choice_sets (
  id bigserial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.schema_choice_set_items (
  id bigserial PRIMARY KEY,
  choice_set_id bigint NOT NULL REFERENCES public.schema_choice_sets(id) ON DELETE CASCADE,
  value text NOT NULL,
  label text NOT NULL,
  color text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schema_choice_set_items_choice_set_value_key UNIQUE (choice_set_id, value)
);

-- ----------------------------------------------------------------------------
-- 2) Field definitions and per-entity mapping
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.schema_fields (
  id bigserial PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  data_type text NOT NULL,
  field_type text NOT NULL DEFAULT 'dynamic',
  description text,
  default_value jsonb,
  choice_set_id bigint REFERENCES public.schema_choice_sets(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schema_fields_code_format_check CHECK (code ~ '^[a-z][a-z0-9_]{0,62}$'),
  CONSTRAINT schema_fields_data_type_check CHECK (
    data_type = ANY (
      ARRAY[
        'calculated'::text,
        'checkbox'::text,
        'color'::text,
        'currency'::text,
        'date'::text,
        'date_time'::text,
        'duration'::text,
        'entity'::text,
        'file_link'::text,
        'float'::text,
        'footage'::text,
        'image'::text,
        'list'::text,
        'multi_entity'::text,
        'number'::text,
        'password'::text,
        'percent'::text,
        'query'::text,
        'serializable'::text,
        'status_list'::text,
        'summary'::text,
        'text'::text,
        'timecode'::text,
        'url'::text,
        'url_template'::text
      ]
    )
  ),
  CONSTRAINT schema_fields_field_type_check CHECK (
    field_type = ANY (
      ARRAY[
        'dynamic'::text,
        'permanent'::text,
        'system_owned'::text,
        'custom'::text
      ]
    )
  )
);

CREATE TABLE IF NOT EXISTS public.schema_field_entities (
  id bigserial PRIMARY KEY,
  field_id bigint NOT NULL REFERENCES public.schema_fields(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  table_name text NOT NULL,
  column_name text NOT NULL,
  required boolean NOT NULL DEFAULT false,
  visible_by_default boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 1000,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schema_field_entities_field_entity_key UNIQUE (field_id, entity_type),
  CONSTRAINT schema_field_entities_entity_column_key UNIQUE (entity_type, column_name)
);

CREATE TABLE IF NOT EXISTS public.schema_field_link_targets (
  id bigserial PRIMARY KEY,
  field_id bigint NOT NULL REFERENCES public.schema_fields(id) ON DELETE CASCADE,
  target_entity_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schema_field_link_targets_field_target_key UNIQUE (field_id, target_entity_type)
);

CREATE TABLE IF NOT EXISTS public.schema_change_log (
  id bigserial PRIMARY KEY,
  action text NOT NULL,
  field_id bigint REFERENCES public.schema_fields(id) ON DELETE SET NULL,
  choice_set_id bigint REFERENCES public.schema_choice_sets(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3) Indexes
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_schema_fields_active ON public.schema_fields (is_active);
CREATE INDEX IF NOT EXISTS idx_schema_fields_data_type ON public.schema_fields (data_type);
CREATE INDEX IF NOT EXISTS idx_schema_field_entities_entity ON public.schema_field_entities (entity_type, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_schema_field_entities_table_column ON public.schema_field_entities (table_name, column_name);
CREATE INDEX IF NOT EXISTS idx_schema_choice_set_items_choice_set ON public.schema_choice_set_items (choice_set_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_schema_change_log_created_at ON public.schema_change_log (created_at DESC);

-- ----------------------------------------------------------------------------
-- 4) Updated_at triggers
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_schema_choice_sets_updated_at') THEN
    CREATE TRIGGER update_schema_choice_sets_updated_at
      BEFORE UPDATE ON public.schema_choice_sets
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_schema_choice_set_items_updated_at') THEN
    CREATE TRIGGER update_schema_choice_set_items_updated_at
      BEFORE UPDATE ON public.schema_choice_set_items
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_schema_fields_updated_at') THEN
    CREATE TRIGGER update_schema_fields_updated_at
      BEFORE UPDATE ON public.schema_fields
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_schema_field_entities_updated_at') THEN
    CREATE TRIGGER update_schema_field_entities_updated_at
      BEFORE UPDATE ON public.schema_field_entities
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 5) RLS + Policies
-- ----------------------------------------------------------------------------

ALTER TABLE public.schema_choice_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_choice_set_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_field_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_field_link_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_change_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.schema_can_manage_fields()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.active = true
      AND lower(coalesce(p.role, '')) = 'alpha'
  );
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'schema_choice_sets' AND policyname = 'schema_choice_sets_select_authenticated'
  ) THEN
    CREATE POLICY schema_choice_sets_select_authenticated
      ON public.schema_choice_sets
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'schema_choice_sets' AND policyname = 'schema_choice_sets_alpha_write'
  ) THEN
    CREATE POLICY schema_choice_sets_alpha_write
      ON public.schema_choice_sets
      FOR ALL
      TO authenticated
      USING (public.schema_can_manage_fields())
      WITH CHECK (public.schema_can_manage_fields());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'schema_choice_set_items' AND policyname = 'schema_choice_set_items_select_authenticated'
  ) THEN
    CREATE POLICY schema_choice_set_items_select_authenticated
      ON public.schema_choice_set_items
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'schema_choice_set_items' AND policyname = 'schema_choice_set_items_alpha_write'
  ) THEN
    CREATE POLICY schema_choice_set_items_alpha_write
      ON public.schema_choice_set_items
      FOR ALL
      TO authenticated
      USING (public.schema_can_manage_fields())
      WITH CHECK (public.schema_can_manage_fields());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'schema_fields' AND policyname = 'schema_fields_select_authenticated'
  ) THEN
    CREATE POLICY schema_fields_select_authenticated
      ON public.schema_fields
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'schema_fields' AND policyname = 'schema_fields_alpha_write'
  ) THEN
    CREATE POLICY schema_fields_alpha_write
      ON public.schema_fields
      FOR ALL
      TO authenticated
      USING (public.schema_can_manage_fields())
      WITH CHECK (public.schema_can_manage_fields());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'schema_field_entities' AND policyname = 'schema_field_entities_select_authenticated'
  ) THEN
    CREATE POLICY schema_field_entities_select_authenticated
      ON public.schema_field_entities
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'schema_field_entities' AND policyname = 'schema_field_entities_alpha_write'
  ) THEN
    CREATE POLICY schema_field_entities_alpha_write
      ON public.schema_field_entities
      FOR ALL
      TO authenticated
      USING (public.schema_can_manage_fields())
      WITH CHECK (public.schema_can_manage_fields());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'schema_field_link_targets' AND policyname = 'schema_field_link_targets_select_authenticated'
  ) THEN
    CREATE POLICY schema_field_link_targets_select_authenticated
      ON public.schema_field_link_targets
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'schema_field_link_targets' AND policyname = 'schema_field_link_targets_alpha_write'
  ) THEN
    CREATE POLICY schema_field_link_targets_alpha_write
      ON public.schema_field_link_targets
      FOR ALL
      TO authenticated
      USING (public.schema_can_manage_fields())
      WITH CHECK (public.schema_can_manage_fields());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'schema_change_log' AND policyname = 'schema_change_log_alpha_select'
  ) THEN
    CREATE POLICY schema_change_log_alpha_select
      ON public.schema_change_log
      FOR SELECT
      TO authenticated
      USING (public.schema_can_manage_fields());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'schema_change_log' AND policyname = 'schema_change_log_alpha_write'
  ) THEN
    CREATE POLICY schema_change_log_alpha_write
      ON public.schema_change_log
      FOR ALL
      TO authenticated
      USING (public.schema_can_manage_fields())
      WITH CHECK (public.schema_can_manage_fields());
  END IF;
END
$$;

GRANT SELECT ON public.schema_choice_sets TO authenticated;
GRANT SELECT ON public.schema_choice_set_items TO authenticated;
GRANT SELECT ON public.schema_fields TO authenticated;
GRANT SELECT ON public.schema_field_entities TO authenticated;
GRANT SELECT ON public.schema_field_link_targets TO authenticated;
GRANT SELECT ON public.schema_change_log TO authenticated;

-- ----------------------------------------------------------------------------
-- 6) Helper functions for controlled DDL
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.schema_require_field_admin()
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.schema_can_manage_fields() THEN
    RAISE EXCEPTION 'Only alpha users can manage schema fields';
  END IF;

  RETURN v_actor;
END;
$$;

CREATE OR REPLACE FUNCTION public.schema_entity_table_name(p_entity_type text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_entity text := lower(trim(coalesce(p_entity_type, '')));
BEGIN
  CASE v_entity
    WHEN 'asset' THEN RETURN 'assets';
    WHEN 'sequence' THEN RETURN 'sequences';
    WHEN 'shot' THEN RETURN 'shots';
    WHEN 'task' THEN RETURN 'tasks';
    WHEN 'version' THEN RETURN 'versions';
    WHEN 'note' THEN RETURN 'notes';
    WHEN 'published_file' THEN RETURN 'published_files';
    WHEN 'project' THEN RETURN 'projects';
    WHEN 'department' THEN RETURN 'departments';
    WHEN 'person' THEN RETURN 'profiles';
    WHEN 'profile' THEN RETURN 'profiles';
    ELSE RETURN NULL;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.schema_normalize_data_type(p_data_type text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_type text := lower(trim(coalesce(p_data_type, '')));
BEGIN
  IF v_type = ANY (
    ARRAY[
      'calculated',
      'checkbox',
      'color',
      'currency',
      'date',
      'date_time',
      'duration',
      'entity',
      'file_link',
      'float',
      'footage',
      'image',
      'list',
      'multi_entity',
      'number',
      'password',
      'percent',
      'query',
      'serializable',
      'status_list',
      'summary',
      'text',
      'timecode',
      'url',
      'url_template'
    ]
  ) THEN
    RETURN v_type;
  END IF;

  RETURN 'text';
END;
$$;

CREATE OR REPLACE FUNCTION public.schema_column_definition_for_data_type(p_data_type text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_type text := public.schema_normalize_data_type(p_data_type);
BEGIN
  CASE v_type
    WHEN 'checkbox' THEN RETURN 'boolean DEFAULT false';
    WHEN 'date' THEN RETURN 'date';
    WHEN 'date_time' THEN RETURN 'timestamptz';
    WHEN 'number' THEN RETURN 'integer';
    WHEN 'float' THEN RETURN 'double precision';
    WHEN 'duration' THEN RETURN 'numeric';
    WHEN 'percent' THEN RETURN 'numeric';
    WHEN 'serializable' THEN RETURN 'jsonb';
    WHEN 'multi_entity' THEN RETURN 'text[] DEFAULT ''{}''::text[]';
    ELSE RETURN 'text';
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.schema_data_type_from_db_column(p_data_type text, p_udt_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_data_type text := lower(trim(coalesce(p_data_type, '')));
  v_udt_name text := lower(trim(coalesce(p_udt_name, '')));
BEGIN
  IF v_data_type = 'array' AND v_udt_name = '_text' THEN RETURN 'multi_entity'; END IF;
  IF v_data_type = 'boolean' THEN RETURN 'checkbox'; END IF;
  IF v_data_type = 'date' THEN RETURN 'date'; END IF;
  IF v_data_type = 'timestamp with time zone' OR v_data_type = 'timestamp without time zone' THEN RETURN 'date_time'; END IF;
  IF v_data_type = 'integer' OR v_data_type = 'bigint' OR v_data_type = 'smallint' THEN RETURN 'number'; END IF;
  IF v_data_type = 'numeric' OR v_data_type = 'double precision' OR v_data_type = 'real' THEN RETURN 'float'; END IF;
  IF v_data_type = 'jsonb' THEN RETURN 'serializable'; END IF;
  RETURN 'text';
END;
$$;

CREATE OR REPLACE FUNCTION public.schema_validate_field_code(p_code text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_code text := lower(trim(coalesce(p_code, '')));
BEGIN
  IF v_code = '' THEN
    RAISE EXCEPTION 'Field code is required';
  END IF;

  IF v_code !~ '^[a-z][a-z0-9_]{0,62}$' THEN
    RAISE EXCEPTION 'Invalid field code. Use lowercase letters, numbers, underscore, and start with a letter.';
  END IF;

  IF v_code = ANY (
    ARRAY[
      'id',
      'project_id',
      'entity_type',
      'entity_id',
      'created_at',
      'updated_at',
      'created_by',
      'updated_by'
    ]
  ) THEN
    RAISE EXCEPTION 'Field code % is reserved', v_code;
  END IF;

  RETURN v_code;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7) Managed schema mutation functions
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.schema_create_choice_set(
  p_name text,
  p_description text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid;
  v_name text;
  v_choice_set_id bigint;
  v_item jsonb;
  v_value text;
  v_label text;
  v_color text;
  v_sort integer := 0;
BEGIN
  v_actor := public.schema_require_field_admin();
  v_name := nullif(trim(p_name), '');

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Choice set name is required';
  END IF;

  INSERT INTO public.schema_choice_sets (
    name,
    description,
    created_by,
    updated_by
  )
  VALUES (
    v_name,
    nullif(trim(coalesce(p_description, '')), ''),
    v_actor,
    v_actor
  )
  ON CONFLICT (name)
  DO UPDATE SET
    description = EXCLUDED.description,
    updated_by = v_actor,
    updated_at = now(),
    is_active = true
  RETURNING id INTO v_choice_set_id;

  IF p_items IS NOT NULL THEN
    IF jsonb_typeof(p_items) <> 'array' THEN
      RAISE EXCEPTION 'Choice set items must be a JSON array';
    END IF;

    DELETE FROM public.schema_choice_set_items
    WHERE choice_set_id = v_choice_set_id;

    FOR v_item IN
      SELECT value
      FROM jsonb_array_elements(p_items) AS x(value)
    LOOP
      v_sort := v_sort + 10;
      v_value := NULL;
      v_label := NULL;
      v_color := NULL;

      IF jsonb_typeof(v_item) = 'string' THEN
        v_value := nullif(trim(both '"' from v_item::text), '');
        v_label := v_value;
      ELSIF jsonb_typeof(v_item) = 'object' THEN
        v_value := nullif(trim(v_item ->> 'value'), '');
        v_label := nullif(trim(coalesce(v_item ->> 'label', v_value)), '');
        v_color := nullif(trim(v_item ->> 'color'), '');

        IF v_item ? 'sort_order' THEN
          BEGIN
            v_sort := (v_item ->> 'sort_order')::integer;
          EXCEPTION WHEN others THEN
            -- keep auto-incremented v_sort
          END;
        END IF;
      END IF;

      IF v_value IS NULL THEN
        CONTINUE;
      END IF;

      IF v_label IS NULL THEN
        v_label := v_value;
      END IF;

      INSERT INTO public.schema_choice_set_items (
        choice_set_id,
        value,
        label,
        color,
        sort_order,
        created_by,
        updated_by
      )
      VALUES (
        v_choice_set_id,
        v_value,
        v_label,
        v_color,
        v_sort,
        v_actor,
        v_actor
      )
      ON CONFLICT (choice_set_id, value)
      DO UPDATE SET
        label = EXCLUDED.label,
        color = EXCLUDED.color,
        sort_order = EXCLUDED.sort_order,
        is_active = true,
        updated_by = v_actor,
        updated_at = now();
    END LOOP;
  END IF;

  INSERT INTO public.schema_change_log (action, choice_set_id, actor_id, payload)
  VALUES (
    'create_choice_set',
    v_choice_set_id,
    v_actor,
    jsonb_build_object('name', v_name)
  );

  RETURN v_choice_set_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.schema_create_field(
  p_name text,
  p_code text,
  p_data_type text,
  p_field_type text DEFAULT 'dynamic',
  p_description text DEFAULT NULL,
  p_default_value jsonb DEFAULT NULL,
  p_choice_set_id bigint DEFAULT NULL,
  p_entities text[] DEFAULT ARRAY[]::text[],
  p_required boolean DEFAULT false,
  p_visible_by_default boolean DEFAULT true,
  p_display_order integer DEFAULT 1000,
  p_link_target_entities text[] DEFAULT ARRAY[]::text[]
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid;
  v_name text;
  v_code text;
  v_data_type text;
  v_field_type text;
  v_field_id bigint;
  v_entity_type text;
  v_table_name text;
  v_column_def text;
  v_exists boolean;
BEGIN
  v_actor := public.schema_require_field_admin();
  v_name := nullif(trim(p_name), '');
  v_code := public.schema_validate_field_code(p_code);
  v_data_type := public.schema_normalize_data_type(p_data_type);
  v_field_type := coalesce(nullif(lower(trim(coalesce(p_field_type, ''))), ''), 'dynamic');

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Field name is required';
  END IF;

  IF v_field_type <> ALL (ARRAY['dynamic', 'permanent', 'system_owned', 'custom']) THEN
    RAISE EXCEPTION 'Unsupported field type: %', v_field_type;
  END IF;

  IF coalesce(array_length(p_entities, 1), 0) = 0 THEN
    RAISE EXCEPTION 'At least one entity is required';
  END IF;

  IF p_choice_set_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.schema_choice_sets cs
      WHERE cs.id = p_choice_set_id
        AND cs.is_active = true
    ) THEN
      RAISE EXCEPTION 'Choice set % not found or inactive', p_choice_set_id;
    END IF;
  END IF;

  INSERT INTO public.schema_fields (
    code,
    name,
    data_type,
    field_type,
    description,
    default_value,
    choice_set_id,
    created_by,
    updated_by
  )
  VALUES (
    v_code,
    v_name,
    v_data_type,
    v_field_type,
    nullif(trim(coalesce(p_description, '')), ''),
    p_default_value,
    p_choice_set_id,
    v_actor,
    v_actor
  )
  RETURNING id INTO v_field_id;

  v_column_def := public.schema_column_definition_for_data_type(v_data_type);

  FOR v_entity_type IN
    SELECT DISTINCT lower(trim(x))
    FROM unnest(p_entities) AS x
    WHERE nullif(trim(x), '') IS NOT NULL
  LOOP
    v_table_name := public.schema_entity_table_name(v_entity_type);

    IF v_table_name IS NULL THEN
      RAISE EXCEPTION 'Unsupported entity type: %', v_entity_type;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = v_table_name
        AND c.column_name = v_code
    )
    INTO v_exists;

    IF NOT v_exists THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS %I %s',
        v_table_name,
        v_code,
        v_column_def
      );
    END IF;

    INSERT INTO public.schema_field_entities (
      field_id,
      entity_type,
      table_name,
      column_name,
      required,
      visible_by_default,
      display_order,
      is_active,
      created_by,
      updated_by
    )
    VALUES (
      v_field_id,
      v_entity_type,
      v_table_name,
      v_code,
      p_required,
      p_visible_by_default,
      coalesce(p_display_order, 1000),
      true,
      v_actor,
      v_actor
    )
    ON CONFLICT (field_id, entity_type)
    DO UPDATE SET
      required = EXCLUDED.required,
      visible_by_default = EXCLUDED.visible_by_default,
      display_order = EXCLUDED.display_order,
      is_active = true,
      updated_by = v_actor,
      updated_at = now();
  END LOOP;

  IF p_link_target_entities IS NOT NULL THEN
    INSERT INTO public.schema_field_link_targets (field_id, target_entity_type)
    SELECT
      v_field_id,
      lower(trim(x))
    FROM unnest(p_link_target_entities) AS x
    WHERE nullif(trim(x), '') IS NOT NULL
    ON CONFLICT (field_id, target_entity_type) DO NOTHING;
  END IF;

  INSERT INTO public.schema_change_log (action, field_id, actor_id, payload)
  VALUES (
    'create_field',
    v_field_id,
    v_actor,
    jsonb_build_object(
      'code', v_code,
      'name', v_name,
      'data_type', v_data_type,
      'field_type', v_field_type,
      'entities', p_entities
    )
  );

  RETURN v_field_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.schema_add_field_to_entity(
  p_field_id bigint,
  p_entity_type text,
  p_required boolean DEFAULT false,
  p_visible_by_default boolean DEFAULT true,
  p_display_order integer DEFAULT 1000
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid;
  v_field public.schema_fields%ROWTYPE;
  v_entity_type text;
  v_table_name text;
  v_column_def text;
  v_exists boolean;
BEGIN
  v_actor := public.schema_require_field_admin();
  v_entity_type := lower(trim(coalesce(p_entity_type, '')));

  SELECT *
  INTO v_field
  FROM public.schema_fields sf
  WHERE sf.id = p_field_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Field % not found', p_field_id;
  END IF;

  IF v_field.is_active = false THEN
    RAISE EXCEPTION 'Field % is inactive', p_field_id;
  END IF;

  v_table_name := public.schema_entity_table_name(v_entity_type);
  IF v_table_name IS NULL THEN
    RAISE EXCEPTION 'Unsupported entity type: %', v_entity_type;
  END IF;

  v_column_def := public.schema_column_definition_for_data_type(v_field.data_type);

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = v_table_name
      AND c.column_name = v_field.code
  )
  INTO v_exists;

  IF NOT v_exists THEN
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS %I %s',
      v_table_name,
      v_field.code,
      v_column_def
    );
  END IF;

  INSERT INTO public.schema_field_entities (
    field_id,
    entity_type,
    table_name,
    column_name,
    required,
    visible_by_default,
    display_order,
    is_active,
    created_by,
    updated_by
  )
  VALUES (
    p_field_id,
    v_entity_type,
    v_table_name,
    v_field.code,
    p_required,
    p_visible_by_default,
    coalesce(p_display_order, 1000),
    true,
    v_actor,
    v_actor
  )
  ON CONFLICT (field_id, entity_type)
  DO UPDATE SET
    required = EXCLUDED.required,
    visible_by_default = EXCLUDED.visible_by_default,
    display_order = EXCLUDED.display_order,
    is_active = true,
    updated_by = v_actor,
    updated_at = now();

  INSERT INTO public.schema_change_log (action, field_id, actor_id, payload)
  VALUES (
    'add_field_to_entity',
    p_field_id,
    v_actor,
    jsonb_build_object('entity_type', v_entity_type)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.schema_update_field_meta(
  p_field_id bigint,
  p_patch jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid;
  v_name text;
  v_description text;
  v_field_type text;
  v_choice_set_id bigint;
  v_is_active boolean;
BEGIN
  v_actor := public.schema_require_field_admin();

  IF NOT EXISTS (SELECT 1 FROM public.schema_fields sf WHERE sf.id = p_field_id) THEN
    RAISE EXCEPTION 'Field % not found', p_field_id;
  END IF;

  IF p_patch IS NULL THEN
    p_patch := '{}'::jsonb;
  END IF;

  IF p_patch ? 'name' THEN
    v_name := nullif(trim(p_patch ->> 'name'), '');
    IF v_name IS NULL THEN
      RAISE EXCEPTION 'Field name cannot be empty';
    END IF;
  END IF;

  IF p_patch ? 'description' THEN
    v_description := nullif(trim(p_patch ->> 'description'), '');
  END IF;

  IF p_patch ? 'field_type' THEN
    v_field_type := nullif(lower(trim(p_patch ->> 'field_type')), '');
    IF v_field_type IS NULL OR v_field_type <> ALL (ARRAY['dynamic', 'permanent', 'system_owned', 'custom']) THEN
      RAISE EXCEPTION 'Unsupported field type: %', p_patch ->> 'field_type';
    END IF;
  END IF;

  IF p_patch ? 'choice_set_id' THEN
    IF coalesce(nullif(trim(p_patch ->> 'choice_set_id'), ''), '') = '' THEN
      v_choice_set_id := NULL;
    ELSE
      v_choice_set_id := (p_patch ->> 'choice_set_id')::bigint;
      IF NOT EXISTS (
        SELECT 1
        FROM public.schema_choice_sets cs
        WHERE cs.id = v_choice_set_id
          AND cs.is_active = true
      ) THEN
        RAISE EXCEPTION 'Choice set % not found or inactive', v_choice_set_id;
      END IF;
    END IF;
  END IF;

  IF p_patch ? 'is_active' THEN
    v_is_active := (p_patch ->> 'is_active')::boolean;
  END IF;

  UPDATE public.schema_fields sf
  SET
    name = CASE WHEN p_patch ? 'name' THEN v_name ELSE sf.name END,
    description = CASE WHEN p_patch ? 'description' THEN v_description ELSE sf.description END,
    field_type = CASE WHEN p_patch ? 'field_type' THEN v_field_type ELSE sf.field_type END,
    default_value = CASE WHEN p_patch ? 'default_value' THEN p_patch -> 'default_value' ELSE sf.default_value END,
    choice_set_id = CASE WHEN p_patch ? 'choice_set_id' THEN v_choice_set_id ELSE sf.choice_set_id END,
    is_active = CASE WHEN p_patch ? 'is_active' THEN v_is_active ELSE sf.is_active END,
    updated_by = v_actor,
    updated_at = now()
  WHERE sf.id = p_field_id;

  IF p_patch ? 'is_active' THEN
    UPDATE public.schema_field_entities sfe
    SET
      is_active = v_is_active,
      updated_by = v_actor,
      updated_at = now()
    WHERE sfe.field_id = p_field_id;
  END IF;

  INSERT INTO public.schema_change_log (action, field_id, actor_id, payload)
  VALUES (
    'update_field_meta',
    p_field_id,
    v_actor,
    p_patch
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.schema_deactivate_field(
  p_field_id bigint,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid;
BEGIN
  v_actor := public.schema_require_field_admin();

  IF NOT EXISTS (SELECT 1 FROM public.schema_fields sf WHERE sf.id = p_field_id) THEN
    RAISE EXCEPTION 'Field % not found', p_field_id;
  END IF;

  UPDATE public.schema_fields sf
  SET
    is_active = false,
    updated_by = v_actor,
    updated_at = now()
  WHERE sf.id = p_field_id;

  UPDATE public.schema_field_entities sfe
  SET
    is_active = false,
    updated_by = v_actor,
    updated_at = now()
  WHERE sfe.field_id = p_field_id;

  INSERT INTO public.schema_change_log (action, field_id, actor_id, payload)
  VALUES (
    'deactivate_field',
    p_field_id,
    v_actor,
    jsonb_build_object('reason', nullif(trim(coalesce(p_reason, '')), ''))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.schema_bootstrap_table_columns(
  p_entity_type text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid;
  v_target_entity text := nullif(lower(trim(coalesce(p_entity_type, ''))), '');
  v_entity record;
  v_col record;
  v_field_id bigint;
  v_data_type text;
  v_count integer := 0;
BEGIN
  v_actor := public.schema_require_field_admin();

  FOR v_entity IN
    SELECT *
    FROM (
      VALUES
        ('asset'::text, 'assets'::text),
        ('sequence'::text, 'sequences'::text),
        ('shot'::text, 'shots'::text),
        ('task'::text, 'tasks'::text),
        ('version'::text, 'versions'::text),
        ('note'::text, 'notes'::text),
        ('published_file'::text, 'published_files'::text),
        ('project'::text, 'projects'::text),
        ('department'::text, 'departments'::text),
        ('person'::text, 'profiles'::text)
    ) AS entities(entity_type, table_name)
  LOOP
    IF v_target_entity IS NOT NULL AND v_entity.entity_type <> v_target_entity THEN
      CONTINUE;
    END IF;

    FOR v_col IN
      SELECT
        c.column_name,
        c.data_type,
        c.udt_name
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = v_entity.table_name
        AND c.column_name <> ALL (
          ARRAY[
            'id',
            'project_id',
            'entity_type',
            'entity_id',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by'
          ]
        )
      ORDER BY c.ordinal_position
    LOOP
      IF EXISTS (
        SELECT 1
        FROM public.schema_field_entities sfe
        WHERE sfe.entity_type = v_entity.entity_type
          AND sfe.column_name = v_col.column_name
      ) THEN
        CONTINUE;
      END IF;

      v_data_type := public.schema_data_type_from_db_column(v_col.data_type, v_col.udt_name);

      INSERT INTO public.schema_fields (
        code,
        name,
        data_type,
        field_type,
        description,
        is_active,
        created_by,
        updated_by
      )
      VALUES (
        v_col.column_name,
        initcap(replace(v_col.column_name, '_', ' ')),
        v_data_type,
        'dynamic',
        'Bootstrapped from existing DB column',
        true,
        v_actor,
        v_actor
      )
      ON CONFLICT (code)
      DO UPDATE SET
        updated_by = v_actor,
        updated_at = now()
      RETURNING id INTO v_field_id;

      INSERT INTO public.schema_field_entities (
        field_id,
        entity_type,
        table_name,
        column_name,
        required,
        visible_by_default,
        display_order,
        is_active,
        created_by,
        updated_by
      )
      VALUES (
        v_field_id,
        v_entity.entity_type,
        v_entity.table_name,
        v_col.column_name,
        false,
        true,
        1000,
        true,
        v_actor,
        v_actor
      )
      ON CONFLICT (field_id, entity_type)
      DO UPDATE SET
        is_active = true,
        updated_by = v_actor,
        updated_at = now();

      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  INSERT INTO public.schema_change_log (action, actor_id, payload)
  VALUES (
    'bootstrap_fields',
    v_actor,
    jsonb_build_object('entity_type', v_target_entity, 'inserted_or_linked', v_count)
  );

  RETURN v_count;
END;
$$;

-- ----------------------------------------------------------------------------
-- 8) Runtime views
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.schema_field_runtime_v AS
SELECT
  sfe.entity_type,
  sfe.table_name,
  sfe.column_name,
  sfe.required,
  sfe.visible_by_default,
  sfe.display_order,
  sfe.is_active AS entity_active,
  sf.id AS field_id,
  sf.code,
  sf.name,
  sf.data_type,
  sf.field_type,
  sf.description,
  sf.default_value,
  sf.choice_set_id,
  sf.is_active AS field_active,
  sf.created_at,
  sf.updated_at
FROM public.schema_field_entities sfe
JOIN public.schema_fields sf ON sf.id = sfe.field_id
WHERE sf.is_active = true
  AND sfe.is_active = true;

GRANT SELECT ON public.schema_field_runtime_v TO authenticated;

-- ----------------------------------------------------------------------------
-- 9) Grants for RPC calls
-- ----------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.schema_create_choice_set(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.schema_create_field(text, text, text, text, text, jsonb, bigint, text[], boolean, boolean, integer, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.schema_add_field_to_entity(bigint, text, boolean, boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.schema_update_field_meta(bigint, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.schema_deactivate_field(bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.schema_bootstrap_table_columns(text) TO authenticated;

COMMIT;
