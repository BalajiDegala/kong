-- ============================================================================
-- KONG: Unified Field System Migration
-- Date: 2026-02-18
-- Depends on: 2026-02-12-fields-foundation.sql
--
-- Purpose:
-- 1. Fix task deletion (missing RLS UPDATE/DELETE policies)
-- 2. Fix task update RLS (missing UPDATE policy)
-- 3. Add computed_field_definitions table for formula-based fields
-- 4. Add entity_link_definitions table for entity relationship mapping
-- 5. Add field_groups table for field categorization
-- 6. Add custom_data JSONB column to all entity tables
-- 7. Add DB trigger for auto-computing shot cut fields
-- 8. Add DB trigger for auto-computing task duration
-- 9. Seed computed field definitions for shots and tasks
-- 10. Seed entity link definitions for all entities
-- 11. Seed field groups for organization
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: RLS POLICY FIXES
-- Moved to separate migration: 2026-02-18-fix-rls-policies-all-entities.sql
-- Run that migration FIRST — it fixes tasks, playlists, published_files,
-- playlist_items, playlist_shares, project_members, and 10+ other tables.
-- ============================================================================

-- ============================================================================
-- PART 2: COMPUTED FIELD DEFINITIONS TABLE
-- Stores formulas for auto-calculated fields (duration, cut_duration, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.computed_field_definitions (
  id bigserial PRIMARY KEY,
  entity_type text NOT NULL,
  field_code text NOT NULL,
  formula_type text NOT NULL DEFAULT 'arithmetic',
  formula_expression text NOT NULL,
  depends_on text[] NOT NULL DEFAULT '{}'::text[],
  result_data_type text NOT NULL DEFAULT 'number',
  is_persisted boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT computed_field_definitions_entity_field_key
    UNIQUE (entity_type, field_code),
  CONSTRAINT computed_field_definitions_formula_type_check
    CHECK (formula_type IN ('arithmetic', 'date_diff', 'frame', 'conditional', 'concat')),
  CONSTRAINT computed_field_definitions_result_type_check
    CHECK (result_data_type IN ('number', 'float', 'text', 'date', 'duration', 'checkbox'))
);

CREATE INDEX IF NOT EXISTS idx_computed_field_defs_entity
  ON public.computed_field_definitions (entity_type, is_active);

ALTER TABLE public.computed_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY computed_field_defs_select_authenticated
  ON public.computed_field_definitions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY computed_field_defs_alpha_write
  ON public.computed_field_definitions
  FOR ALL
  TO authenticated
  USING (public.schema_can_manage_fields())
  WITH CHECK (public.schema_can_manage_fields());

GRANT SELECT ON public.computed_field_definitions TO authenticated;

-- ============================================================================
-- PART 3: ENTITY LINK DEFINITIONS TABLE
-- Maps which fields link to which target entities (replaces hardcoded maps).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.entity_link_definitions (
  id bigserial PRIMARY KEY,
  source_entity text NOT NULL,
  field_code text NOT NULL,
  target_entity text NOT NULL,
  target_table text NOT NULL,
  target_value_column text NOT NULL DEFAULT 'id',
  target_display_columns text[] NOT NULL DEFAULT '{name}'::text[],
  display_format text,
  is_searchable boolean NOT NULL DEFAULT true,
  search_column text DEFAULT 'name',
  link_type text NOT NULL DEFAULT 'single',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entity_link_defs_source_field_key
    UNIQUE (source_entity, field_code),
  CONSTRAINT entity_link_defs_link_type_check
    CHECK (link_type IN ('single', 'multi', 'polymorphic'))
);

CREATE INDEX IF NOT EXISTS idx_entity_link_defs_source
  ON public.entity_link_definitions (source_entity);

CREATE INDEX IF NOT EXISTS idx_entity_link_defs_target
  ON public.entity_link_definitions (target_entity);

ALTER TABLE public.entity_link_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY entity_link_defs_select_authenticated
  ON public.entity_link_definitions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY entity_link_defs_alpha_write
  ON public.entity_link_definitions
  FOR ALL
  TO authenticated
  USING (public.schema_can_manage_fields())
  WITH CHECK (public.schema_can_manage_fields());

GRANT SELECT ON public.entity_link_definitions TO authenticated;

-- ============================================================================
-- PART 4: FIELD GROUPS TABLE
-- Organizes fields into categories (Identity, Scheduling, Cut/Frames, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.field_groups (
  id bigserial PRIMARY KEY,
  entity_type text NOT NULL,
  group_name text NOT NULL,
  group_code text NOT NULL,
  display_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT field_groups_entity_code_key
    UNIQUE (entity_type, group_code)
);

CREATE INDEX IF NOT EXISTS idx_field_groups_entity
  ON public.field_groups (entity_type, display_order);

ALTER TABLE public.field_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY field_groups_select_authenticated
  ON public.field_groups
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY field_groups_alpha_write
  ON public.field_groups
  FOR ALL
  TO authenticated
  USING (public.schema_can_manage_fields())
  WITH CHECK (public.schema_can_manage_fields());

GRANT SELECT ON public.field_groups TO authenticated;

-- Add group_id to schema_field_entities (links fields to groups)
ALTER TABLE public.schema_field_entities
  ADD COLUMN IF NOT EXISTS group_id bigint REFERENCES public.field_groups(id) ON DELETE SET NULL;

-- ============================================================================
-- PART 5: CUSTOM DATA JSONB COLUMN
-- Allows user-created custom fields to store data without DDL changes.
-- ============================================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS custom_data jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.shots
  ADD COLUMN IF NOT EXISTS custom_data jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS custom_data jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.sequences
  ADD COLUMN IF NOT EXISTS custom_data jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.versions
  ADD COLUMN IF NOT EXISTS custom_data jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS custom_data jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.published_files
  ADD COLUMN IF NOT EXISTS custom_data jsonb NOT NULL DEFAULT '{}'::jsonb;

-- GIN indexes for efficient JSONB queries on custom_data
CREATE INDEX IF NOT EXISTS idx_tasks_custom_data ON public.tasks USING gin (custom_data);
CREATE INDEX IF NOT EXISTS idx_shots_custom_data ON public.shots USING gin (custom_data);
CREATE INDEX IF NOT EXISTS idx_assets_custom_data ON public.assets USING gin (custom_data);
CREATE INDEX IF NOT EXISTS idx_sequences_custom_data ON public.sequences USING gin (custom_data);
CREATE INDEX IF NOT EXISTS idx_versions_custom_data ON public.versions USING gin (custom_data);
CREATE INDEX IF NOT EXISTS idx_notes_custom_data ON public.notes USING gin (custom_data);
CREATE INDEX IF NOT EXISTS idx_published_files_custom_data ON public.published_files USING gin (custom_data);

-- ============================================================================
-- PART 6: SHOT CUT FIELDS — AUTO-COMPUTATION TRIGGER
--
-- Shots already have:  cut_duration GENERATED ALWAYS AS ((cut_out - cut_in) + 1) STORED
-- But head_duration, tail_duration, working_duration are NOT computed.
-- This trigger auto-calculates them when cut fields change.
--
-- Frame layout:
-- |--- head_duration ---|-------- cut_duration --------|--- tail_duration ---|
-- head_in          cut_in                          cut_out             tail_out
-- |<---------------------- working_duration ------------------------------>|
-- ============================================================================

CREATE OR REPLACE FUNCTION public.compute_shot_frame_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- head_duration = cut_in - head_in
  IF NEW.head_in IS NOT NULL AND NEW.cut_in IS NOT NULL THEN
    NEW.head_duration := NEW.cut_in - NEW.head_in;
  ELSE
    NEW.head_duration := NULL;
  END IF;

  -- tail_duration = tail_out - cut_out
  IF NEW.tail_out IS NOT NULL AND NEW.cut_out IS NOT NULL THEN
    NEW.tail_duration := NEW.tail_out - NEW.cut_out;
  ELSE
    NEW.tail_duration := NULL;
  END IF;

  -- working_duration = tail_out - head_in + 1
  IF NEW.head_in IS NOT NULL AND NEW.tail_out IS NOT NULL THEN
    NEW.working_duration := NEW.tail_out - NEW.head_in + 1;
  ELSIF NEW.cut_in IS NOT NULL AND NEW.cut_out IS NOT NULL THEN
    -- Fallback: use cut range if no handles
    NEW.working_duration := NEW.cut_out - NEW.cut_in + 1;
  ELSE
    NEW.working_duration := NULL;
  END IF;

  -- raw_ fields mirror the inputs for audit/override tracking
  NEW.raw_cut_in := NEW.cut_in;
  NEW.raw_cut_out := NEW.cut_out;
  NEW.raw_head_in := NEW.head_in;
  NEW.raw_tail_out := NEW.tail_out;
  NEW.raw_head_duration := NEW.head_duration;
  NEW.raw_tail_duration := NEW.tail_duration;
  NEW.raw_cut_duration := CASE
    WHEN NEW.cut_in IS NOT NULL AND NEW.cut_out IS NOT NULL
    THEN NEW.cut_out - NEW.cut_in + 1
    ELSE NULL
  END;

  -- Build human-readable cut_summary
  IF NEW.cut_in IS NOT NULL AND NEW.cut_out IS NOT NULL THEN
    NEW.cut_summary := format(
      'Cut: %sf | Head: %sf | Tail: %sf | Working: %sf',
      coalesce((NEW.cut_out - NEW.cut_in + 1)::text, '-'),
      coalesce(NEW.head_duration::text, '-'),
      coalesce(NEW.tail_duration::text, '-'),
      coalesce(NEW.working_duration::text, '-')
    );
  ELSE
    NEW.cut_summary := NULL;
  END IF;

  -- Build duration_summary (total frame range info)
  IF NEW.head_in IS NOT NULL AND NEW.tail_out IS NOT NULL THEN
    NEW.duration_summary := format(
      'Frames %s-%s (%s total)',
      NEW.head_in,
      NEW.tail_out,
      NEW.tail_out - NEW.head_in + 1
    );
  ELSIF NEW.cut_in IS NOT NULL AND NEW.cut_out IS NOT NULL THEN
    NEW.duration_summary := format(
      'Cut %s-%s (%s frames)',
      NEW.cut_in,
      NEW.cut_out,
      NEW.cut_out - NEW.cut_in + 1
    );
  ELSE
    NEW.duration_summary := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop old trigger if exists, then create
DROP TRIGGER IF EXISTS compute_shot_frames ON public.shots;
CREATE TRIGGER compute_shot_frames
  BEFORE INSERT OR UPDATE OF cut_in, cut_out, head_in, tail_out
  ON public.shots
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_shot_frame_fields();

-- ============================================================================
-- PART 7: TASK DURATION — AUTO-COMPUTATION TRIGGER
--
-- When start_date and end_date change, auto-calculate duration (working days).
-- When bid changes and time_logged exists, compute time_logged_of_bid.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.compute_task_duration_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_start date;
  v_end date;
  v_days integer := 0;
  v_current date;
  v_dow integer;
BEGIN
  v_start := NEW.start_date;
  v_end := COALESCE(NEW.end_date, NEW.due_date);

  -- Calculate working days between start and end (exclude weekends)
  IF v_start IS NOT NULL AND v_end IS NOT NULL AND v_end >= v_start THEN
    v_current := v_start;
    WHILE v_current <= v_end LOOP
      v_dow := EXTRACT(ISODOW FROM v_current)::integer;
      IF v_dow <= 5 THEN  -- Monday(1) through Friday(5)
        v_days := v_days + 1;
      END IF;
      v_current := v_current + interval '1 day';
    END LOOP;
    NEW.duration := v_days;
  ELSIF v_start IS NULL OR v_end IS NULL THEN
    -- Don't clear duration if user manually set it
    -- Only auto-compute when both dates are present
    NULL;
  END IF;

  -- Compute time_logged ratio against bid
  IF NEW.bid IS NOT NULL AND NEW.bid > 0 AND NEW.time_logged IS NOT NULL THEN
    NEW.time_logged_of_bid := ROUND((NEW.time_logged / NEW.bid) * 100, 1);
  END IF;

  -- Compute over/under bid
  IF NEW.bid IS NOT NULL AND NEW.time_logged IS NOT NULL THEN
    NEW.time_logged_over_under_bid := NEW.time_logged - NEW.bid;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS compute_task_duration ON public.tasks;
CREATE TRIGGER compute_task_duration
  BEFORE INSERT OR UPDATE OF start_date, end_date, due_date, bid, time_logged
  ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_task_duration_fields();

-- ============================================================================
-- PART 8: VERSION FRAME COUNT — AUTO-COMPUTATION TRIGGER
-- Compute frame_count from first_frame and last_frame.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.compute_version_frame_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- frame_count = last_frame - first_frame + 1
  IF NEW.first_frame IS NOT NULL AND NEW.last_frame IS NOT NULL THEN
    NEW.frame_count := NEW.last_frame - NEW.first_frame + 1;
  END IF;

  -- Build frame_range string "1001-1150"
  IF NEW.first_frame IS NOT NULL AND NEW.last_frame IS NOT NULL THEN
    NEW.frame_range := format('%s-%s', NEW.first_frame, NEW.last_frame);
  END IF;

  -- Compute duration from frame_count and frame_rate
  IF NEW.frame_count IS NOT NULL AND NEW.frame_rate IS NOT NULL AND NEW.frame_rate > 0 THEN
    NEW.uploaded_movie_duration := ROUND((NEW.frame_count::double precision / NEW.frame_rate)::numeric, 3)::double precision;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS compute_version_frames ON public.versions;
CREATE TRIGGER compute_version_frames
  BEFORE INSERT OR UPDATE OF first_frame, last_frame, frame_rate
  ON public.versions
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_version_frame_fields();

-- ============================================================================
-- PART 9: SEED COMPUTED FIELD DEFINITIONS
-- These records document what's auto-computed and are read by the UI.
-- ============================================================================

INSERT INTO public.computed_field_definitions
  (entity_type, field_code, formula_type, formula_expression, depends_on, result_data_type, is_persisted, description)
VALUES
  -- Shot cut fields
  ('shot', 'cut_duration', 'frame', '{cut_out} - {cut_in} + 1', '{cut_in,cut_out}', 'number', true,
   'Number of frames in the editorial cut range'),
  ('shot', 'head_duration', 'frame', '{cut_in} - {head_in}', '{head_in,cut_in}', 'number', true,
   'Handle frames before cut (head)'),
  ('shot', 'tail_duration', 'frame', '{tail_out} - {cut_out}', '{cut_out,tail_out}', 'number', true,
   'Handle frames after cut (tail)'),
  ('shot', 'working_duration', 'frame', '{tail_out} - {head_in} + 1', '{head_in,tail_out}', 'number', true,
   'Total frame range being worked on including handles'),
  ('shot', 'cut_summary', 'concat', 'Cut: {cut_duration}f | Head: {head_duration}f | Tail: {tail_duration}f | Working: {working_duration}f',
   '{cut_in,cut_out,head_in,tail_out}', 'text', true,
   'Human-readable summary of all cut/frame durations'),
  ('shot', 'duration_summary', 'concat', 'Frames {head_in}-{tail_out} ({working_duration} total)',
   '{head_in,tail_out}', 'text', true,
   'Human-readable total frame range'),

  -- Task duration fields
  ('task', 'duration', 'date_diff', '{end_date} - {start_date} (working days)', '{start_date,end_date}', 'duration', true,
   'Working days between start and end date (excludes weekends)'),
  ('task', 'time_logged_of_bid', 'arithmetic', '({time_logged} / {bid}) * 100', '{bid,time_logged}', 'float', true,
   'Percentage of bid hours logged'),
  ('task', 'time_logged_over_under_bid', 'arithmetic', '{time_logged} - {bid}', '{bid,time_logged}', 'float', true,
   'Hours over or under the bid estimate'),

  -- Version frame fields
  ('version', 'frame_count', 'frame', '{last_frame} - {first_frame} + 1', '{first_frame,last_frame}', 'number', true,
   'Total number of frames'),
  ('version', 'frame_range', 'concat', '{first_frame}-{last_frame}', '{first_frame,last_frame}', 'text', true,
   'Frame range as string'),
  ('version', 'uploaded_movie_duration', 'arithmetic', '{frame_count} / {frame_rate}', '{frame_count,frame_rate}', 'float', true,
   'Duration in seconds calculated from frame count and rate')
ON CONFLICT (entity_type, field_code) DO UPDATE SET
  formula_expression = EXCLUDED.formula_expression,
  depends_on = EXCLUDED.depends_on,
  description = EXCLUDED.description,
  updated_at = now();

-- ============================================================================
-- PART 10: SEED ENTITY LINK DEFINITIONS
-- Documents which fields link to which entities — replaces hardcoded maps.
-- ============================================================================

INSERT INTO public.entity_link_definitions
  (source_entity, field_code, target_entity, target_table, target_value_column, target_display_columns, display_format, is_searchable, search_column, link_type)
VALUES
  -- Task links
  ('task', 'assigned_to', 'profile', 'profiles', 'id', '{id,display_name,full_name,email}', '{display_name}', true, 'display_name', 'single'),
  ('task', 'reviewer', 'profile', 'profiles', 'id', '{id,display_name,full_name}', '{display_name}', true, 'display_name', 'multi'),
  ('task', 'ayon_assignees', 'profile', 'profiles', 'id', '{id,display_name,full_name}', '{display_name}', true, 'display_name', 'multi'),
  ('task', 'cc', 'profile', 'profiles', 'id', '{id,display_name,full_name}', '{display_name}', true, 'display_name', 'multi'),
  ('task', 'created_by', 'profile', 'profiles', 'id', '{id,display_name,full_name}', '{display_name}', true, 'display_name', 'single'),
  ('task', 'updated_by', 'profile', 'profiles', 'id', '{id,display_name,full_name}', '{display_name}', true, 'display_name', 'single'),
  ('task', 'client_approved_by', 'profile', 'profiles', 'id', '{id,display_name,full_name}', '{display_name}', true, 'display_name', 'single'),
  ('task', 'step_id', 'pipeline_step', 'steps', 'id', '{id,name,code,department_id}', '{name}', true, 'name', 'single'),
  ('task', 'project_id', 'project', 'projects', 'id', '{id,name,code}', '{code} - {name}', true, 'name', 'single'),
  ('task', 'milestone_id', 'milestone', 'milestones', 'id', '{id,name}', '{name}', true, 'name', 'single'),

  -- Shot links
  ('shot', 'sequence_id', 'sequence', 'sequences', 'id', '{id,name,code}', '{code} - {name}', true, 'name', 'single'),
  ('shot', 'created_by', 'profile', 'profiles', 'id', '{id,display_name,full_name}', '{display_name}', true, 'display_name', 'single'),
  ('shot', 'updated_by', 'profile', 'profiles', 'id', '{id,display_name,full_name}', '{display_name}', true, 'display_name', 'single'),
  ('shot', 'project_id', 'project', 'projects', 'id', '{id,name,code}', '{code} - {name}', true, 'name', 'single'),

  -- Asset links
  ('asset', 'sequence_id', 'sequence', 'sequences', 'id', '{id,name,code}', '{code} - {name}', true, 'name', 'single'),
  ('asset', 'shot_id', 'shot', 'shots', 'id', '{id,name,code}', '{code} - {name}', true, 'name', 'single'),
  ('asset', 'created_by', 'profile', 'profiles', 'id', '{id,display_name,full_name}', '{display_name}', true, 'display_name', 'single'),
  ('asset', 'updated_by', 'profile', 'profiles', 'id', '{id,display_name,full_name}', '{display_name}', true, 'display_name', 'single'),
  ('asset', 'project_id', 'project', 'projects', 'id', '{id,name,code}', '{code} - {name}', true, 'name', 'single'),

  -- Sequence links
  ('sequence', 'created_by', 'profile', 'profiles', 'id', '{id,display_name,full_name}', '{display_name}', true, 'display_name', 'single'),
  ('sequence', 'updated_by', 'profile', 'profiles', 'id', '{id,display_name,full_name}', '{display_name}', true, 'display_name', 'single'),
  ('sequence', 'project_id', 'project', 'projects', 'id', '{id,name,code}', '{code} - {name}', true, 'name', 'single'),

  -- Version links
  ('version', 'artist_id', 'profile', 'profiles', 'id', '{id,display_name,full_name}', '{display_name}', true, 'display_name', 'single'),
  ('version', 'created_by', 'profile', 'profiles', 'id', '{id,display_name,full_name}', '{display_name}', true, 'display_name', 'single'),
  ('version', 'updated_by', 'profile', 'profiles', 'id', '{id,display_name,full_name}', '{display_name}', true, 'display_name', 'single'),
  ('version', 'task_id', 'task', 'tasks', 'id', '{id,name,cached_display_name}', '{cached_display_name}', true, 'name', 'single'),
  ('version', 'project_id', 'project', 'projects', 'id', '{id,name,code}', '{code} - {name}', true, 'name', 'single'),

  -- Note links
  ('note', 'author_id', 'profile', 'profiles', 'id', '{id,display_name,full_name}', '{display_name}', true, 'display_name', 'single'),
  ('note', 'created_by', 'profile', 'profiles', 'id', '{id,display_name,full_name}', '{display_name}', true, 'display_name', 'single'),
  ('note', 'updated_by', 'profile', 'profiles', 'id', '{id,display_name,full_name}', '{display_name}', true, 'display_name', 'single'),
  ('note', 'task_id', 'task', 'tasks', 'id', '{id,name,cached_display_name}', '{cached_display_name}', true, 'name', 'single'),
  ('note', 'project_id', 'project', 'projects', 'id', '{id,name,code}', '{code} - {name}', true, 'name', 'single'),
  ('note', 'parent_note_id', 'note', 'notes', 'id', '{id,subject}', '{subject}', true, 'subject', 'single'),

  -- Published file links
  ('published_file', 'published_by', 'profile', 'profiles', 'id', '{id,display_name,full_name}', '{display_name}', true, 'display_name', 'single'),
  ('published_file', 'task_id', 'task', 'tasks', 'id', '{id,name,cached_display_name}', '{cached_display_name}', true, 'name', 'single'),
  ('published_file', 'version_id', 'version', 'versions', 'id', '{id,code,version_number}', '{code} v{version_number}', true, 'code', 'single'),
  ('published_file', 'project_id', 'project', 'projects', 'id', '{id,name,code}', '{code} - {name}', true, 'name', 'single')
ON CONFLICT (source_entity, field_code) DO UPDATE SET
  target_entity = EXCLUDED.target_entity,
  target_table = EXCLUDED.target_table,
  target_display_columns = EXCLUDED.target_display_columns,
  display_format = EXCLUDED.display_format,
  link_type = EXCLUDED.link_type,
  updated_at = now();

-- ============================================================================
-- PART 11: SEED FIELD GROUPS
-- ============================================================================

INSERT INTO public.field_groups (entity_type, group_name, group_code, display_order)
VALUES
  -- Task groups
  ('task', 'Identity', 'identity', 10),
  ('task', 'Relationships', 'relationships', 20),
  ('task', 'Assignment', 'assignment', 30),
  ('task', 'Scheduling', 'scheduling', 40),
  ('task', 'Status & Tracking', 'status_tracking', 50),
  ('task', 'Approval', 'approval', 60),
  ('task', 'Media', 'media', 70),
  ('task', 'System', 'system', 80),
  ('task', 'Integration', 'integration', 90),
  ('task', 'Custom', 'custom', 100),

  -- Shot groups
  ('shot', 'Identity', 'identity', 10),
  ('shot', 'Relationships', 'relationships', 20),
  ('shot', 'Cut & Frames', 'cut_frames', 30),
  ('shot', 'Status & Tracking', 'status_tracking', 40),
  ('shot', 'Delivery', 'delivery', 50),
  ('shot', 'Media', 'media', 60),
  ('shot', 'System', 'system', 70),
  ('shot', 'Integration', 'integration', 80),
  ('shot', 'Custom', 'custom', 90),

  -- Asset groups
  ('asset', 'Identity', 'identity', 10),
  ('asset', 'Relationships', 'relationships', 20),
  ('asset', 'Status & Tracking', 'status_tracking', 30),
  ('asset', 'Media', 'media', 40),
  ('asset', 'System', 'system', 50),
  ('asset', 'Integration', 'integration', 60),
  ('asset', 'Custom', 'custom', 70),

  -- Sequence groups
  ('sequence', 'Identity', 'identity', 10),
  ('sequence', 'Relationships', 'relationships', 20),
  ('sequence', 'Status & Tracking', 'status_tracking', 30),
  ('sequence', 'Media', 'media', 40),
  ('sequence', 'System', 'system', 50),
  ('sequence', 'Integration', 'integration', 60),
  ('sequence', 'Custom', 'custom', 70),

  -- Version groups
  ('version', 'Identity', 'identity', 10),
  ('version', 'Relationships', 'relationships', 20),
  ('version', 'Frames & Media', 'frames_media', 30),
  ('version', 'Status & Approval', 'status_approval', 40),
  ('version', 'System', 'system', 50),
  ('version', 'Integration', 'integration', 60),
  ('version', 'Custom', 'custom', 70),

  -- Note groups
  ('note', 'Identity', 'identity', 10),
  ('note', 'Relationships', 'relationships', 20),
  ('note', 'Status', 'status', 30),
  ('note', 'System', 'system', 40),
  ('note', 'Custom', 'custom', 50),

  -- Published File groups
  ('published_file', 'Identity', 'identity', 10),
  ('published_file', 'Relationships', 'relationships', 20),
  ('published_file', 'File Info', 'file_info', 30),
  ('published_file', 'System', 'system', 40),
  ('published_file', 'Custom', 'custom', 50)
ON CONFLICT (entity_type, group_code) DO NOTHING;

-- ============================================================================
-- PART 12: RUNTIME VIEW — Enhanced with computed fields and entity links
-- Extends schema_field_runtime_v to include computed field info.
-- ============================================================================

-- DROP first because CREATE OR REPLACE cannot add/reorder columns
-- in an existing view (PostgreSQL limitation).
DROP VIEW IF EXISTS public.schema_field_runtime_v;

CREATE VIEW public.schema_field_runtime_v AS
SELECT
  sfe.entity_type,
  sfe.table_name,
  sfe.column_name,
  sfe.required,
  sfe.visible_by_default,
  sfe.display_order,
  sfe.is_active AS entity_active,
  -- Original columns (keep same positions for backward compat)
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
  sf.updated_at,
  -- New: field group info
  sfe.group_id,
  fg.group_name,
  fg.group_code,
  -- New: computed field info (NULL if not computed)
  cfd.formula_type AS computed_formula_type,
  cfd.formula_expression AS computed_formula,
  cfd.depends_on AS computed_depends_on,
  cfd.result_data_type AS computed_result_type,
  cfd.is_persisted AS computed_is_persisted,
  -- New: entity link info (NULL if not a link field)
  eld.target_entity AS link_target_entity,
  eld.target_table AS link_target_table,
  eld.target_display_columns AS link_display_columns,
  eld.display_format AS link_display_format,
  eld.link_type
FROM public.schema_field_entities sfe
JOIN public.schema_fields sf ON sf.id = sfe.field_id
LEFT JOIN public.field_groups fg ON fg.id = sfe.group_id
LEFT JOIN public.computed_field_definitions cfd
  ON cfd.entity_type = sfe.entity_type
  AND cfd.field_code = sfe.column_name
  AND cfd.is_active = true
LEFT JOIN public.entity_link_definitions eld
  ON eld.source_entity = sfe.entity_type
  AND eld.field_code = sfe.column_name
WHERE sf.is_active = true
  AND sfe.is_active = true;

-- Re-grant after recreating the view
GRANT SELECT ON public.schema_field_runtime_v TO authenticated;

-- ============================================================================
-- PART 13: GRANTS FOR NEW FUNCTIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.compute_shot_frame_fields() TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_task_duration_fields() TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_version_frame_fields() TO authenticated;

COMMIT;
