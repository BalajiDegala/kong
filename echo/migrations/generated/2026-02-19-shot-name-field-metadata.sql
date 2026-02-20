-- ============================================================================
-- KONG: Shot Name Field Metadata Alignment
-- Date: 2026-02-19
--
-- Purpose:
-- - Ensure shots.name is represented by a dedicated field code `shot_name`
-- - Ensure shot tables render label as "Shot Name" instead of generic "Name"
-- ============================================================================

BEGIN;

INSERT INTO public.schema_fields (
  code,
  name,
  data_type,
  field_type,
  description,
  is_active
)
VALUES (
  'shot_name',
  'Shot Name',
  'text',
  'permanent',
  'Primary display name for shot entities.',
  true
)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  data_type = EXCLUDED.data_type,
  field_type = EXCLUDED.field_type,
  description = EXCLUDED.description,
  is_active = true,
  updated_at = now();

INSERT INTO public.schema_field_entities (
  field_id,
  entity_type,
  table_name,
  column_name,
  required,
  visible_by_default,
  display_order,
  is_active
)
SELECT
  sf.id,
  'shot',
  'shots',
  'name',
  false,
  true,
  1000,
  true
FROM public.schema_fields sf
WHERE sf.code = 'shot_name'
ON CONFLICT (entity_type, column_name) DO UPDATE
SET
  field_id = EXCLUDED.field_id,
  table_name = EXCLUDED.table_name,
  is_active = true,
  updated_at = now();

COMMIT;
