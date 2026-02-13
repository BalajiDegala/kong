-- ============================================================================
-- KONG: Fields Data Type Sync
-- Date: 2026-02-13
--
-- Purpose:
-- - Allow changing schema field data_type from UI while keeping physical columns in sync.
-- - Perform safe best-effort casting for existing values when column types are changed.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.schema_sql_type_for_data_type(p_data_type text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_type text := public.schema_normalize_data_type(p_data_type);
BEGIN
  CASE v_type
    WHEN 'checkbox' THEN RETURN 'boolean';
    WHEN 'date' THEN RETURN 'date';
    WHEN 'date_time' THEN RETURN 'timestamptz';
    WHEN 'number' THEN RETURN 'integer';
    WHEN 'float' THEN RETURN 'double precision';
    WHEN 'duration' THEN RETURN 'numeric';
    WHEN 'percent' THEN RETURN 'numeric';
    WHEN 'serializable' THEN RETURN 'jsonb';
    WHEN 'multi_entity' THEN RETURN 'text[]';
    ELSE RETURN 'text';
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.schema_default_expression_for_data_type(p_data_type text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_type text := public.schema_normalize_data_type(p_data_type);
BEGIN
  CASE v_type
    WHEN 'checkbox' THEN RETURN 'false';
    WHEN 'multi_entity' THEN RETURN '''{}''::text[]';
    ELSE RETURN NULL;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.schema_try_parse_boolean(p_value text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text := lower(trim(coalesce(p_value, '')));
BEGIN
  IF v = '' THEN
    RETURN NULL;
  END IF;

  IF v = ANY (ARRAY['1', 'true', 't', 'yes', 'y', 'on']) THEN
    RETURN true;
  END IF;

  IF v = ANY (ARRAY['0', 'false', 'f', 'no', 'n', 'off']) THEN
    RETURN false;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.schema_try_parse_date(p_value text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text := trim(coalesce(p_value, ''));
BEGIN
  IF v = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    RETURN v::date;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.schema_try_parse_timestamptz(p_value text)
RETURNS timestamptz
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text := trim(coalesce(p_value, ''));
BEGIN
  IF v = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    RETURN v::timestamptz;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.schema_try_parse_integer(p_value text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text := trim(coalesce(p_value, ''));
BEGIN
  IF v = '' THEN
    RETURN NULL;
  END IF;

  IF v ~ '^[-+]?[0-9]+$' THEN
    BEGIN
      RETURN v::integer;
    EXCEPTION WHEN others THEN
      RETURN NULL;
    END;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.schema_try_parse_double(p_value text)
RETURNS double precision
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text := trim(coalesce(p_value, ''));
BEGIN
  IF v = '' THEN
    RETURN NULL;
  END IF;

  IF v ~ '^[-+]?([0-9]+([.][0-9]*)?|[.][0-9]+)([eE][-+]?[0-9]+)?$' THEN
    BEGIN
      RETURN v::double precision;
    EXCEPTION WHEN others THEN
      RETURN NULL;
    END;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.schema_try_parse_numeric(p_value text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text := trim(coalesce(p_value, ''));
BEGIN
  IF v = '' THEN
    RETURN NULL;
  END IF;

  IF v ~ '^[-+]?([0-9]+([.][0-9]*)?|[.][0-9]+)([eE][-+]?[0-9]+)?$' THEN
    BEGIN
      RETURN v::numeric;
    EXCEPTION WHEN others THEN
      RETURN NULL;
    END;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.schema_try_parse_jsonb(p_value text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text := trim(coalesce(p_value, ''));
BEGIN
  IF v = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    RETURN v::jsonb;
  EXCEPTION WHEN others THEN
    RETURN to_jsonb(v);
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.schema_try_parse_text_array(p_value text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text := trim(coalesce(p_value, ''));
BEGIN
  IF v = '' THEN
    RETURN NULL;
  END IF;

  IF left(v, 1) = '[' THEN
    BEGIN
      RETURN ARRAY(SELECT jsonb_array_elements_text(v::jsonb));
    EXCEPTION WHEN others THEN
      -- fall through to other parsing methods
    END;
  END IF;

  IF left(v, 1) = '{' AND right(v, 1) = '}' THEN
    BEGIN
      RETURN v::text[];
    EXCEPTION WHEN others THEN
      -- fall through to CSV parsing
    END;
  END IF;

  RETURN ARRAY(
    SELECT item
    FROM (
      SELECT nullif(trim(raw_item), '') AS item
      FROM unnest(regexp_split_to_array(v, '\s*,\s*')) AS raw(raw_item)
    ) items
    WHERE item IS NOT NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.schema_change_field_data_type(
  p_field_id bigint,
  p_data_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid;
  v_field public.schema_fields%ROWTYPE;
  v_new_data_type text;
  v_sql_type text;
  v_default_expression text;
  v_using_expression text;
  v_mapping record;
BEGIN
  v_actor := public.schema_require_field_admin();
  v_new_data_type := public.schema_normalize_data_type(p_data_type);

  SELECT *
  INTO v_field
  FROM public.schema_fields sf
  WHERE sf.id = p_field_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Field % not found', p_field_id;
  END IF;

  IF v_field.data_type = v_new_data_type THEN
    RETURN;
  END IF;

  v_sql_type := public.schema_sql_type_for_data_type(v_new_data_type);
  v_default_expression := public.schema_default_expression_for_data_type(v_new_data_type);

  FOR v_mapping IN
    SELECT
      sfe.table_name,
      sfe.column_name
    FROM public.schema_field_entities sfe
    WHERE sfe.field_id = p_field_id
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = v_mapping.table_name
        AND c.column_name = v_mapping.column_name
    ) THEN
      CONTINUE;
    END IF;

    CASE v_new_data_type
      WHEN 'checkbox' THEN
        v_using_expression := format(
          'public.schema_try_parse_boolean(%1$I::text)',
          v_mapping.column_name
        );
      WHEN 'date' THEN
        v_using_expression := format(
          'public.schema_try_parse_date(%1$I::text)',
          v_mapping.column_name
        );
      WHEN 'date_time' THEN
        v_using_expression := format(
          'public.schema_try_parse_timestamptz(%1$I::text)',
          v_mapping.column_name
        );
      WHEN 'number' THEN
        v_using_expression := format(
          'public.schema_try_parse_integer(%1$I::text)',
          v_mapping.column_name
        );
      WHEN 'float' THEN
        v_using_expression := format(
          'public.schema_try_parse_double(%1$I::text)',
          v_mapping.column_name
        );
      WHEN 'duration' THEN
        v_using_expression := format(
          'public.schema_try_parse_numeric(%1$I::text)',
          v_mapping.column_name
        );
      WHEN 'percent' THEN
        v_using_expression := format(
          'public.schema_try_parse_numeric(%1$I::text)',
          v_mapping.column_name
        );
      WHEN 'serializable' THEN
        v_using_expression := format(
          'public.schema_try_parse_jsonb(%1$I::text)',
          v_mapping.column_name
        );
      WHEN 'multi_entity' THEN
        v_using_expression := format(
          'public.schema_try_parse_text_array(%1$I::text)',
          v_mapping.column_name
        );
      ELSE
        v_using_expression := format('%1$I::text', v_mapping.column_name);
    END CASE;

    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT',
      v_mapping.table_name,
      v_mapping.column_name
    );

    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN %I TYPE %s USING %s',
      v_mapping.table_name,
      v_mapping.column_name,
      v_sql_type,
      v_using_expression
    );

    IF v_default_expression IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT %s',
        v_mapping.table_name,
        v_mapping.column_name,
        v_default_expression
      );
    END IF;
  END LOOP;

  UPDATE public.schema_fields sf
  SET
    data_type = v_new_data_type,
    choice_set_id = CASE
      WHEN v_new_data_type IN ('list', 'status_list') THEN sf.choice_set_id
      ELSE NULL
    END,
    updated_by = v_actor,
    updated_at = now()
  WHERE sf.id = p_field_id;

  INSERT INTO public.schema_change_log (action, field_id, actor_id, payload)
  VALUES (
    'change_field_data_type',
    p_field_id,
    v_actor,
    jsonb_build_object(
      'code', v_field.code,
      'old_data_type', v_field.data_type,
      'new_data_type', v_new_data_type
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.schema_change_field_data_type(bigint, text) TO authenticated;

COMMIT;
