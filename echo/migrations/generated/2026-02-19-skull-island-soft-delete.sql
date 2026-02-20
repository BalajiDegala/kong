-- ============================================================
-- SKULL ISLAND: Soft-Delete / Trash System
-- Date: 2026-02-19
-- Description: Adds soft-delete columns to all core entity tables,
--   creates RPC functions for trash/restore/permanent-delete,
--   and a unified query function for the Skull Island page.
-- ============================================================

-- 1. Add soft-delete columns to all core entity tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'projects', 'assets', 'sequences', 'shots',
    'tasks', 'versions', 'notes', 'playlists'
  ]
  LOOP
    EXECUTE format('
      ALTER TABLE %I
        ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
    ', tbl);

    -- Index for finding trashed items quickly (Skull Island page)
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_%I_deleted_at
      ON %I(deleted_at DESC) WHERE deleted_at IS NOT NULL;
    ', tbl, tbl);

    -- Partial index for active-only queries (most common path)
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_%I_active
      ON %I(id) WHERE deleted_at IS NULL;
    ', tbl, tbl);
  END LOOP;
END $$;


-- ============================================================
-- 2. RPC: Trash an entity (soft-delete)
-- ============================================================
CREATE OR REPLACE FUNCTION trash_entity(
  p_entity_type text,
  p_entity_id bigint
) RETURNS jsonb AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  CASE p_entity_type
    WHEN 'project' THEN
      UPDATE projects SET deleted_at = v_now, deleted_by = v_user_id
        WHERE id = p_entity_id AND deleted_at IS NULL;
      -- Cascade: trash all children in this project
      UPDATE assets SET deleted_at = v_now, deleted_by = v_user_id
        WHERE project_id = p_entity_id AND deleted_at IS NULL;
      UPDATE sequences SET deleted_at = v_now, deleted_by = v_user_id
        WHERE project_id = p_entity_id AND deleted_at IS NULL;
      UPDATE shots SET deleted_at = v_now, deleted_by = v_user_id
        WHERE project_id = p_entity_id AND deleted_at IS NULL;
      UPDATE tasks SET deleted_at = v_now, deleted_by = v_user_id
        WHERE project_id = p_entity_id AND deleted_at IS NULL;
      UPDATE versions SET deleted_at = v_now, deleted_by = v_user_id
        WHERE project_id = p_entity_id AND deleted_at IS NULL;
      UPDATE notes SET deleted_at = v_now, deleted_by = v_user_id
        WHERE project_id = p_entity_id AND deleted_at IS NULL;
      UPDATE playlists SET deleted_at = v_now, deleted_by = v_user_id
        WHERE project_id = p_entity_id AND deleted_at IS NULL;

    WHEN 'asset' THEN
      UPDATE assets SET deleted_at = v_now, deleted_by = v_user_id
        WHERE id = p_entity_id AND deleted_at IS NULL;

    WHEN 'sequence' THEN
      UPDATE sequences SET deleted_at = v_now, deleted_by = v_user_id
        WHERE id = p_entity_id AND deleted_at IS NULL;

    WHEN 'shot' THEN
      UPDATE shots SET deleted_at = v_now, deleted_by = v_user_id
        WHERE id = p_entity_id AND deleted_at IS NULL;

    WHEN 'task' THEN
      UPDATE tasks SET deleted_at = v_now, deleted_by = v_user_id
        WHERE id = p_entity_id AND deleted_at IS NULL;

    WHEN 'version' THEN
      UPDATE versions SET deleted_at = v_now, deleted_by = v_user_id
        WHERE id = p_entity_id AND deleted_at IS NULL;

    WHEN 'note' THEN
      UPDATE notes SET deleted_at = v_now, deleted_by = v_user_id
        WHERE id = p_entity_id AND deleted_at IS NULL;
      -- Cascade: trash child notes (replies)
      UPDATE notes SET deleted_at = v_now, deleted_by = v_user_id
        WHERE parent_note_id = p_entity_id AND deleted_at IS NULL;

    WHEN 'playlist' THEN
      UPDATE playlists SET deleted_at = v_now, deleted_by = v_user_id
        WHERE id = p_entity_id AND deleted_at IS NULL;

    ELSE
      RAISE EXCEPTION 'Unknown entity type: %', p_entity_type;
  END CASE;

  RETURN jsonb_build_object(
    'success', true,
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'deleted_at', v_now
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 3. RPC: Restore an entity from Skull Island
-- ============================================================
CREATE OR REPLACE FUNCTION restore_entity(
  p_entity_type text,
  p_entity_id bigint
) RETURNS jsonb AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_project_id bigint;
  v_deleted_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  CASE p_entity_type
    WHEN 'project' THEN
      SELECT deleted_at INTO v_deleted_at FROM projects WHERE id = p_entity_id;
      IF v_deleted_at IS NULL THEN
        RAISE EXCEPTION 'Entity is not trashed';
      END IF;
      -- Restore project
      UPDATE projects SET deleted_at = NULL, deleted_by = NULL WHERE id = p_entity_id;
      -- Restore children trashed at the same time (within 2-second window)
      UPDATE assets SET deleted_at = NULL, deleted_by = NULL
        WHERE project_id = p_entity_id
        AND deleted_at BETWEEN v_deleted_at - interval '2 seconds' AND v_deleted_at + interval '2 seconds';
      UPDATE sequences SET deleted_at = NULL, deleted_by = NULL
        WHERE project_id = p_entity_id
        AND deleted_at BETWEEN v_deleted_at - interval '2 seconds' AND v_deleted_at + interval '2 seconds';
      UPDATE shots SET deleted_at = NULL, deleted_by = NULL
        WHERE project_id = p_entity_id
        AND deleted_at BETWEEN v_deleted_at - interval '2 seconds' AND v_deleted_at + interval '2 seconds';
      UPDATE tasks SET deleted_at = NULL, deleted_by = NULL
        WHERE project_id = p_entity_id
        AND deleted_at BETWEEN v_deleted_at - interval '2 seconds' AND v_deleted_at + interval '2 seconds';
      UPDATE versions SET deleted_at = NULL, deleted_by = NULL
        WHERE project_id = p_entity_id
        AND deleted_at BETWEEN v_deleted_at - interval '2 seconds' AND v_deleted_at + interval '2 seconds';
      UPDATE notes SET deleted_at = NULL, deleted_by = NULL
        WHERE project_id = p_entity_id
        AND deleted_at BETWEEN v_deleted_at - interval '2 seconds' AND v_deleted_at + interval '2 seconds';
      UPDATE playlists SET deleted_at = NULL, deleted_by = NULL
        WHERE project_id = p_entity_id
        AND deleted_at BETWEEN v_deleted_at - interval '2 seconds' AND v_deleted_at + interval '2 seconds';

    WHEN 'asset' THEN
      SELECT project_id INTO v_project_id FROM assets WHERE id = p_entity_id;
      IF EXISTS (SELECT 1 FROM projects WHERE id = v_project_id AND deleted_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Cannot restore: parent project is trashed. Restore the project first.';
      END IF;
      UPDATE assets SET deleted_at = NULL, deleted_by = NULL WHERE id = p_entity_id;

    WHEN 'sequence' THEN
      SELECT project_id INTO v_project_id FROM sequences WHERE id = p_entity_id;
      IF EXISTS (SELECT 1 FROM projects WHERE id = v_project_id AND deleted_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Cannot restore: parent project is trashed. Restore the project first.';
      END IF;
      UPDATE sequences SET deleted_at = NULL, deleted_by = NULL WHERE id = p_entity_id;

    WHEN 'shot' THEN
      SELECT project_id INTO v_project_id FROM shots WHERE id = p_entity_id;
      IF EXISTS (SELECT 1 FROM projects WHERE id = v_project_id AND deleted_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Cannot restore: parent project is trashed. Restore the project first.';
      END IF;
      UPDATE shots SET deleted_at = NULL, deleted_by = NULL WHERE id = p_entity_id;

    WHEN 'task' THEN
      SELECT project_id INTO v_project_id FROM tasks WHERE id = p_entity_id;
      IF EXISTS (SELECT 1 FROM projects WHERE id = v_project_id AND deleted_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Cannot restore: parent project is trashed. Restore the project first.';
      END IF;
      UPDATE tasks SET deleted_at = NULL, deleted_by = NULL WHERE id = p_entity_id;

    WHEN 'version' THEN
      SELECT project_id INTO v_project_id FROM versions WHERE id = p_entity_id;
      IF EXISTS (SELECT 1 FROM projects WHERE id = v_project_id AND deleted_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Cannot restore: parent project is trashed. Restore the project first.';
      END IF;
      UPDATE versions SET deleted_at = NULL, deleted_by = NULL WHERE id = p_entity_id;

    WHEN 'note' THEN
      SELECT project_id, deleted_at INTO v_project_id, v_deleted_at FROM notes WHERE id = p_entity_id;
      IF EXISTS (SELECT 1 FROM projects WHERE id = v_project_id AND deleted_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Cannot restore: parent project is trashed. Restore the project first.';
      END IF;
      UPDATE notes SET deleted_at = NULL, deleted_by = NULL WHERE id = p_entity_id;
      -- Restore cascade-trashed child notes
      IF v_deleted_at IS NOT NULL THEN
        UPDATE notes SET deleted_at = NULL, deleted_by = NULL
          WHERE parent_note_id = p_entity_id
          AND deleted_at BETWEEN v_deleted_at - interval '2 seconds' AND v_deleted_at + interval '2 seconds';
      END IF;

    WHEN 'playlist' THEN
      SELECT project_id INTO v_project_id FROM playlists WHERE id = p_entity_id;
      IF EXISTS (SELECT 1 FROM projects WHERE id = v_project_id AND deleted_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Cannot restore: parent project is trashed. Restore the project first.';
      END IF;
      UPDATE playlists SET deleted_at = NULL, deleted_by = NULL WHERE id = p_entity_id;

    ELSE
      RAISE EXCEPTION 'Unknown entity type: %', p_entity_type;
  END CASE;

  RETURN jsonb_build_object(
    'success', true,
    'entity_type', p_entity_type,
    'entity_id', p_entity_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 4. RPC: Permanently delete an entity (hard delete)
-- ============================================================
CREATE OR REPLACE FUNCTION permanently_delete_entity(
  p_entity_type text,
  p_entity_id bigint
) RETURNS jsonb AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_file_path text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  CASE p_entity_type
    WHEN 'project' THEN
      DELETE FROM projects WHERE id = p_entity_id AND deleted_at IS NOT NULL;
    WHEN 'asset' THEN
      DELETE FROM assets WHERE id = p_entity_id AND deleted_at IS NOT NULL;
    WHEN 'sequence' THEN
      DELETE FROM sequences WHERE id = p_entity_id AND deleted_at IS NOT NULL;
    WHEN 'shot' THEN
      DELETE FROM shots WHERE id = p_entity_id AND deleted_at IS NOT NULL;
    WHEN 'task' THEN
      DELETE FROM tasks WHERE id = p_entity_id AND deleted_at IS NOT NULL;
    WHEN 'version' THEN
      -- Get file_path before deleting so caller can clean up storage
      SELECT file_path INTO v_file_path FROM versions WHERE id = p_entity_id AND deleted_at IS NOT NULL;
      DELETE FROM versions WHERE id = p_entity_id AND deleted_at IS NOT NULL;
    WHEN 'note' THEN
      DELETE FROM notes WHERE id = p_entity_id AND deleted_at IS NOT NULL;
    WHEN 'playlist' THEN
      DELETE FROM playlists WHERE id = p_entity_id AND deleted_at IS NOT NULL;
    ELSE
      RAISE EXCEPTION 'Unknown entity type: %', p_entity_type;
  END CASE;

  RETURN jsonb_build_object(
    'success', true,
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'file_path', v_file_path
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 5. RPC: Get trashed entities for Skull Island page
-- ============================================================
CREATE OR REPLACE FUNCTION get_trashed_entities(
  p_entity_type text DEFAULT NULL,
  p_project_id bigint DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
) RETURNS TABLE (
  id bigint,
  entity_type text,
  name text,
  code text,
  project_id bigint,
  project_name text,
  deleted_at timestamptz,
  deleted_by uuid,
  deleted_by_name text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH trashed AS (
    -- Projects
    SELECT
      pr.id::bigint AS id,
      'project'::text AS entity_type,
      pr.name::text AS name,
      pr.code::text AS code,
      pr.id::bigint AS project_id,
      pr.name::text AS project_name,
      pr.deleted_at::timestamptz AS deleted_at,
      pr.deleted_by::uuid AS deleted_by
    FROM projects pr
    WHERE pr.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'project')
      AND (p_project_id IS NULL OR pr.id::bigint = p_project_id)

    UNION ALL

    -- Assets
    SELECT
      a.id::bigint AS id,
      'asset'::text AS entity_type,
      a.name::text AS name,
      a.code::text AS code,
      a.project_id::bigint AS project_id,
      p.name::text AS project_name,
      a.deleted_at::timestamptz AS deleted_at,
      a.deleted_by::uuid AS deleted_by
    FROM assets a
    JOIN projects p ON p.id = a.project_id
    WHERE a.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'asset')
      AND (p_project_id IS NULL OR a.project_id::bigint = p_project_id)

    UNION ALL

    -- Sequences
    SELECT
      s.id::bigint AS id,
      'sequence'::text AS entity_type,
      s.name::text AS name,
      s.code::text AS code,
      s.project_id::bigint AS project_id,
      p.name::text AS project_name,
      s.deleted_at::timestamptz AS deleted_at,
      s.deleted_by::uuid AS deleted_by
    FROM sequences s
    JOIN projects p ON p.id = s.project_id
    WHERE s.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'sequence')
      AND (p_project_id IS NULL OR s.project_id::bigint = p_project_id)

    UNION ALL

    -- Shots
    SELECT
      sh.id::bigint AS id,
      'shot'::text AS entity_type,
      sh.name::text AS name,
      sh.code::text AS code,
      sh.project_id::bigint AS project_id,
      p.name::text AS project_name,
      sh.deleted_at::timestamptz AS deleted_at,
      sh.deleted_by::uuid AS deleted_by
    FROM shots sh
    JOIN projects p ON p.id = sh.project_id
    WHERE sh.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'shot')
      AND (p_project_id IS NULL OR sh.project_id::bigint = p_project_id)

    UNION ALL

    -- Tasks (tasks has no code column)
    SELECT
      t.id::bigint AS id,
      'task'::text AS entity_type,
      t.name::text AS name,
      NULL::text AS code,
      t.project_id::bigint AS project_id,
      p.name::text AS project_name,
      t.deleted_at::timestamptz AS deleted_at,
      t.deleted_by::uuid AS deleted_by
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'task')
      AND (p_project_id IS NULL OR t.project_id::bigint = p_project_id)

    UNION ALL

    -- Versions (use code as display name)
    SELECT
      v.id::bigint AS id,
      'version'::text AS entity_type,
      v.code::text AS name,
      v.code::text AS code,
      v.project_id::bigint AS project_id,
      p.name::text AS project_name,
      v.deleted_at::timestamptz AS deleted_at,
      v.deleted_by::uuid AS deleted_by
    FROM versions v
    JOIN projects p ON p.id = v.project_id
    WHERE v.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'version')
      AND (p_project_id IS NULL OR v.project_id::bigint = p_project_id)

    UNION ALL

    -- Notes
    SELECT
      n.id::bigint AS id,
      'note'::text AS entity_type,
      n.subject::text AS name,
      NULL::text AS code,
      n.project_id::bigint AS project_id,
      p.name::text AS project_name,
      n.deleted_at::timestamptz AS deleted_at,
      n.deleted_by::uuid AS deleted_by
    FROM notes n
    JOIN projects p ON p.id = n.project_id
    WHERE n.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'note')
      AND (p_project_id IS NULL OR n.project_id::bigint = p_project_id)

    UNION ALL

    -- Playlists
    SELECT
      pl.id::bigint AS id,
      'playlist'::text AS entity_type,
      pl.name::text AS name,
      pl.code::text AS code,
      pl.project_id::bigint AS project_id,
      p.name::text AS project_name,
      pl.deleted_at::timestamptz AS deleted_at,
      pl.deleted_by::uuid AS deleted_by
    FROM playlists pl
    JOIN projects p ON p.id = pl.project_id
    WHERE pl.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'playlist')
      AND (p_project_id IS NULL OR pl.project_id::bigint = p_project_id)
  )
  SELECT
    t.id::bigint AS id,
    t.entity_type::text AS entity_type,
    t.name::text AS name,
    t.code::text AS code,
    t.project_id::bigint AS project_id,
    t.project_name::text AS project_name,
    t.deleted_at::timestamptz AS deleted_at,
    t.deleted_by::uuid AS deleted_by,
    COALESCE(prof.full_name, prof.display_name, prof.email)::text AS deleted_by_name
  FROM trashed t
  LEFT JOIN profiles prof ON prof.id = t.deleted_by
  WHERE (
    p_search IS NULL
    OR p_search = ''
    OR t.name ILIKE '%' || p_search || '%'
    OR t.code ILIKE '%' || p_search || '%'
  )
  ORDER BY t.deleted_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;
