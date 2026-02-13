-- ============================================================================
-- KONG: Align DB schema with CSV schema definitions
-- Generated: 2026-02-10T13:55:45Z
-- Source CSV dir: /dd/ayon/git/kong/images/schema
--
-- This migration is designed to be safe to re-run:
-- - Uses ALTER TABLE ... ADD COLUMN IF NOT EXISTS
-- - Does NOT drop tables or data
-- - Uses conservative Postgres types (TEXT / JSONB unless clearly inferable)
--
-- Execution: Supabase SQL Editor (recommended) or psql inside Kubernetes
-- ============================================================================

-- ============================================================================
-- 0) Polymorphic Entity Constraints
-- ============================================================================

-- NOTE: Constraints are added NOT VALID to avoid failing the migration if legacy rows contain unexpected values.
--       They are still enforced for new/updated rows. Optionally validate later after cleanup:
--         ALTER TABLE public.tasks VALIDATE CONSTRAINT tasks_entity_type_check;
--         ALTER TABLE public.versions VALIDATE CONSTRAINT versions_entity_type_check;
--         ALTER TABLE public.notes VALIDATE CONSTRAINT notes_entity_type_check;
--         ALTER TABLE public.published_files VALIDATE CONSTRAINT published_files_entity_type_check;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_entity_type_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_entity_type_check
  CHECK (entity_type IN ('asset', 'shot', 'sequence', 'project')) NOT VALID;

ALTER TABLE public.versions DROP CONSTRAINT IF EXISTS versions_entity_type_check;
ALTER TABLE public.versions
  ADD CONSTRAINT versions_entity_type_check
  CHECK (entity_type IN ('asset', 'shot', 'sequence')) NOT VALID;

ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS notes_entity_type_check;
ALTER TABLE public.notes
  ADD CONSTRAINT notes_entity_type_check
  CHECK (entity_type IN ('task', 'asset', 'shot', 'sequence', 'version', 'project', 'published_file')) NOT VALID;

ALTER TABLE public.published_files DROP CONSTRAINT IF EXISTS published_files_entity_type_check;
ALTER TABLE public.published_files
  ADD CONSTRAINT published_files_entity_type_check
  CHECK (entity_type IN ('asset', 'shot', 'sequence', 'task', 'version', 'note', 'project')) NOT VALID;

-- ============================================================================
-- ASSETS (from asset.csv)
-- ============================================================================

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS asset_sequence text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS asset_shot text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS cached_display_name text,
  ADD COLUMN IF NOT EXISTS cc text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS creative_brief text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS dd_client_name text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS episodes text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS filmstrip_thumbnail_url text,
  ADD COLUMN IF NOT EXISTS id integer,
  ADD COLUMN IF NOT EXISTS image_source_entity text,
  ADD COLUMN IF NOT EXISTS keep boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS levels text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS linked_projects text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS mocap_takes text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS notes text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS open_notes text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS open_notes_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outsource boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_assets text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS project_id integer,
  ADD COLUMN IF NOT EXISTS published_file_links text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS review_versions_link text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS sequence_id integer REFERENCES public.sequences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sequences text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS sequences_assets text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS shot_id integer REFERENCES public.shots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shots text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS shots_assets text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS sub_assets text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS tasks text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS task_template text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_blur_hash text,
  ADD COLUMN IF NOT EXISTS asset_type text,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendor_groups text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS version_link text[] DEFAULT '{}'::text[];

-- ============================================================================
-- SEQUENCES (from sequence.csv)
-- ============================================================================

ALTER TABLE public.sequences
  ADD COLUMN IF NOT EXISTS assets text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS ayon_id text,
  ADD COLUMN IF NOT EXISTS ayon_sync_status text,
  ADD COLUMN IF NOT EXISTS cached_display_name text,
  ADD COLUMN IF NOT EXISTS cc text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cuts text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS dd_client_name text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS episode text,
  ADD COLUMN IF NOT EXISTS filmstrip_thumbnail_url text,
  ADD COLUMN IF NOT EXISTS id integer,
  ADD COLUMN IF NOT EXISTS image_source_entity text,
  ADD COLUMN IF NOT EXISTS notes text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS open_notes text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS open_notes_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plates text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS project_id integer,
  ADD COLUMN IF NOT EXISTS published_file_links text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS scenes text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS shots text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS tasks text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS task_template text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_blur_hash text,
  ADD COLUMN IF NOT EXISTS sequence_type text,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendor_groups text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS version_link text[] DEFAULT '{}'::text[];

-- ============================================================================
-- SHOTS (from shots.csv)
-- ============================================================================

ALTER TABLE public.shots
  ADD COLUMN IF NOT EXISTS assets text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS ayon_id text,
  ADD COLUMN IF NOT EXISTS ayon_sync_status text,
  ADD COLUMN IF NOT EXISTS cached_display_name text,
  ADD COLUMN IF NOT EXISTS cc text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS comp_note text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cut_duration integer,
  ADD COLUMN IF NOT EXISTS cut_in integer,
  ADD COLUMN IF NOT EXISTS cut_order integer,
  ADD COLUMN IF NOT EXISTS cut_out integer,
  ADD COLUMN IF NOT EXISTS cut_summary text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS dd_client_name text,
  ADD COLUMN IF NOT EXISTS dd_location text,
  ADD COLUMN IF NOT EXISTS delivery_date date,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS duration_summary text,
  ADD COLUMN IF NOT EXISTS filmstrip_thumbnail_url text,
  ADD COLUMN IF NOT EXISTS head_duration integer,
  ADD COLUMN IF NOT EXISTS head_in integer,
  ADD COLUMN IF NOT EXISTS head_out integer,
  ADD COLUMN IF NOT EXISTS id integer,
  ADD COLUMN IF NOT EXISTS image_source_entity text,
  ADD COLUMN IF NOT EXISTS next_review date,
  ADD COLUMN IF NOT EXISTS notes text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS open_notes text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS open_notes_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_shots text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS plates text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS project_id integer,
  ADD COLUMN IF NOT EXISTS published_file_links text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS raw_cut_duration integer,
  ADD COLUMN IF NOT EXISTS raw_cut_in integer,
  ADD COLUMN IF NOT EXISTS raw_cut_out integer,
  ADD COLUMN IF NOT EXISTS raw_head_duration integer,
  ADD COLUMN IF NOT EXISTS raw_head_in integer,
  ADD COLUMN IF NOT EXISTS raw_head_out integer,
  ADD COLUMN IF NOT EXISTS raw_tail_duration integer,
  ADD COLUMN IF NOT EXISTS raw_tail_in integer,
  ADD COLUMN IF NOT EXISTS raw_tail_out integer,
  ADD COLUMN IF NOT EXISTS seq_shot text,
  ADD COLUMN IF NOT EXISTS sequence_id integer,
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS shot_notes text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS sub_shots text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS tail_duration integer,
  ADD COLUMN IF NOT EXISTS tail_in integer,
  ADD COLUMN IF NOT EXISTS tail_out integer,
  ADD COLUMN IF NOT EXISTS target_date date,
  ADD COLUMN IF NOT EXISTS tasks text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS task_template text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_blur_hash text,
  ADD COLUMN IF NOT EXISTS turnover integer,
  ADD COLUMN IF NOT EXISTS shot_type text,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendor_groups text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS version_link text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS working_duration integer;

-- ============================================================================
-- TASKS (from task.csv)
-- ============================================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS ayon_assignees text,
  ADD COLUMN IF NOT EXISTS ayon_id text,
  ADD COLUMN IF NOT EXISTS ayon_sync_status text,
  ADD COLUMN IF NOT EXISTS bid numeric,
  ADD COLUMN IF NOT EXISTS bid_breakdown text,
  ADD COLUMN IF NOT EXISTS cached_display_name text,
  ADD COLUMN IF NOT EXISTS casting text,
  ADD COLUMN IF NOT EXISTS cc text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS ddna_bid numeric,
  ADD COLUMN IF NOT EXISTS ddna_id integer,
  ADD COLUMN IF NOT EXISTS ddna_to text,
  ADD COLUMN IF NOT EXISTS dependency_violation boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS downstream_dependency text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS duration numeric,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS filmstrip_thumbnail_url text,
  ADD COLUMN IF NOT EXISTS gantt_bar_color text,
  ADD COLUMN IF NOT EXISTS id integer,
  ADD COLUMN IF NOT EXISTS image_source_entity text,
  ADD COLUMN IF NOT EXISTS implicit boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS inventory_date date,
  ADD COLUMN IF NOT EXISTS milestone boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes_links text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS open_notes text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS open_notes_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS step_id integer,
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS prod_comments text,
  ADD COLUMN IF NOT EXISTS project_id integer,
  ADD COLUMN IF NOT EXISTS proposed_start_date date,
  ADD COLUMN IF NOT EXISTS publish_version_number integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviewer text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS review_versions_task text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS schedule_change_comments text,
  ADD COLUMN IF NOT EXISTS sibling_tasks text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS sort_order integer,
  ADD COLUMN IF NOT EXISTS split_durations jsonb,
  ADD COLUMN IF NOT EXISTS splits jsonb,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS task_complexity text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS task_template text,
  ADD COLUMN IF NOT EXISTS template_task text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_blur_hash text,
  ADD COLUMN IF NOT EXISTS time_logged numeric,
  ADD COLUMN IF NOT EXISTS time_logged_of_bid numeric,
  ADD COLUMN IF NOT EXISTS time_logged_over_under_bid numeric,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS upstream_dependency text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS versions text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS workload_assignee_count integer;

-- ============================================================================
-- VERSIONS (from version.csv)
-- ============================================================================

ALTER TABLE public.versions
  ADD COLUMN IF NOT EXISTS artist_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ayon_id text,
  ADD COLUMN IF NOT EXISTS ayon_product_id text,
  ADD COLUMN IF NOT EXISTS ayon_sync_status text,
  ADD COLUMN IF NOT EXISTS ayon_version_id text,
  ADD COLUMN IF NOT EXISTS cached_display_name text,
  ADD COLUMN IF NOT EXISTS client_approved boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_approved_by text,
  ADD COLUMN IF NOT EXISTS client_version_name text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cuts text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS date_viewed timestamptz,
  ADD COLUMN IF NOT EXISTS deliveries text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS editorial_qc text,
  ADD COLUMN IF NOT EXISTS filmstrip_thumbnail_url text,
  ADD COLUMN IF NOT EXISTS first_frame integer,
  ADD COLUMN IF NOT EXISTS flagged boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS frame_count integer,
  ADD COLUMN IF NOT EXISTS frame_range text,
  ADD COLUMN IF NOT EXISTS frame_rate double precision,
  ADD COLUMN IF NOT EXISTS frames_aspect_ratio double precision,
  ADD COLUMN IF NOT EXISTS frames_have_slate boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS id integer,
  ADD COLUMN IF NOT EXISTS image_source_entity text,
  ADD COLUMN IF NOT EXISTS last_frame integer,
  ADD COLUMN IF NOT EXISTS link text,
  ADD COLUMN IF NOT EXISTS media_center_import_time timestamptz,
  ADD COLUMN IF NOT EXISTS movie_aspect_ratio double precision,
  ADD COLUMN IF NOT EXISTS movie_has_slate boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS nuke_script text,
  ADD COLUMN IF NOT EXISTS open_notes text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS open_notes_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS otio_playable text,
  ADD COLUMN IF NOT EXISTS frames_path text,
  ADD COLUMN IF NOT EXISTS path_to_geometry text,
  ADD COLUMN IF NOT EXISTS movie_url text,
  ADD COLUMN IF NOT EXISTS playlists text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS project_id integer,
  ADD COLUMN IF NOT EXISTS published_files text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS send_exrs boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_clip text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS task_id integer,
  ADD COLUMN IF NOT EXISTS tasks text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS task_template text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_blur_hash text,
  ADD COLUMN IF NOT EXISTS translation_type text,
  ADD COLUMN IF NOT EXISTS version_type text,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS uploaded_movie text,
  ADD COLUMN IF NOT EXISTS uploaded_movie_audio_offset double precision,
  ADD COLUMN IF NOT EXISTS uploaded_movie_duration double precision,
  ADD COLUMN IF NOT EXISTS uploaded_movie_image text,
  ADD COLUMN IF NOT EXISTS uploaded_movie_mp4 text,
  ADD COLUMN IF NOT EXISTS uploaded_movie_transcoding_status integer,
  ADD COLUMN IF NOT EXISTS uploaded_movie_webm text,
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS viewed_status text;

-- ============================================================================
-- NOTES (from note.csv)
-- ============================================================================

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS attachments text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ayon_id text,
  ADD COLUMN IF NOT EXISTS ayon_sync_status text,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS cached_display_name text,
  ADD COLUMN IF NOT EXISTS cc text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS client_approved boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_note boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_note_id integer,
  ADD COLUMN IF NOT EXISTS composition text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS filmstrip_thumbnail_url text,
  ADD COLUMN IF NOT EXISTS id integer,
  ADD COLUMN IF NOT EXISTS image_source_entity text,
  ADD COLUMN IF NOT EXISTS links text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS notes_app_context_entity text,
  ADD COLUMN IF NOT EXISTS otio_playable text,
  ADD COLUMN IF NOT EXISTS playlist text,
  ADD COLUMN IF NOT EXISTS project_id integer,
  ADD COLUMN IF NOT EXISTS publish_status text,
  ADD COLUMN IF NOT EXISTS read_unread text,
  ADD COLUMN IF NOT EXISTS replies text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS reply_content text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS suppress_email_notification boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS tasks text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_blur_hash text,
  ADD COLUMN IF NOT EXISTS f_to text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS note_type text,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ============================================================================
-- PUBLISHED_FILES (from publishfile.csv)
-- ============================================================================

ALTER TABLE public.published_files
  ADD COLUMN IF NOT EXISTS ayon_representation_id text,
  ADD COLUMN IF NOT EXISTS cached_display_name text,
  ADD COLUMN IF NOT EXISTS client_version integer,
  ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS downstream_published_files text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS element text,
  ADD COLUMN IF NOT EXISTS filmstrip_thumbnail_url text,
  ADD COLUMN IF NOT EXISTS id integer,
  ADD COLUMN IF NOT EXISTS image_source_entity text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS output text,
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS path_cache text,
  ADD COLUMN IF NOT EXISTS path_cache_storage text,
  ADD COLUMN IF NOT EXISTS path_to_source text,
  ADD COLUMN IF NOT EXISTS project_id integer,
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS file_type text,
  ADD COLUMN IF NOT EXISTS snapshot_id integer,
  ADD COLUMN IF NOT EXISTS snapshot_type text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS submission_notes text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS target_name text,
  ADD COLUMN IF NOT EXISTS task_id integer,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_blur_hash text,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS upstream_published_files text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS version_id integer,
  ADD COLUMN IF NOT EXISTS version_number integer;

