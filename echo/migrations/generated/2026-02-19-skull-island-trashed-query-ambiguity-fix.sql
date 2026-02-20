-- Skull Island hotfix #2:
-- Resolve "column reference name is ambiguous" by redefining
-- get_trashed_entities as a SQL function (no PL/pgSQL output-variable conflicts).

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
      pr.id,
      'project'::text AS entity_type,
      pr.name AS name,
      pr.code AS code,
      pr.id AS project_id,
      pr.name AS project_name,
      pr.deleted_at,
      pr.deleted_by
    FROM projects pr
    WHERE pr.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'project')
      AND (p_project_id IS NULL OR pr.id = p_project_id)

    UNION ALL

    -- Assets
    SELECT
      a.id,
      'asset'::text AS entity_type,
      a.name AS name,
      a.code AS code,
      a.project_id,
      p.name AS project_name,
      a.deleted_at,
      a.deleted_by
    FROM assets a
    JOIN projects p ON p.id = a.project_id
    WHERE a.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'asset')
      AND (p_project_id IS NULL OR a.project_id = p_project_id)

    UNION ALL

    -- Sequences
    SELECT
      s.id,
      'sequence'::text AS entity_type,
      s.name AS name,
      s.code AS code,
      s.project_id,
      p.name AS project_name,
      s.deleted_at,
      s.deleted_by
    FROM sequences s
    JOIN projects p ON p.id = s.project_id
    WHERE s.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'sequence')
      AND (p_project_id IS NULL OR s.project_id = p_project_id)

    UNION ALL

    -- Shots
    SELECT
      sh.id,
      'shot'::text AS entity_type,
      sh.name AS name,
      sh.code AS code,
      sh.project_id,
      p.name AS project_name,
      sh.deleted_at,
      sh.deleted_by
    FROM shots sh
    JOIN projects p ON p.id = sh.project_id
    WHERE sh.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'shot')
      AND (p_project_id IS NULL OR sh.project_id = p_project_id)

    UNION ALL

    -- Tasks (tasks has no code column)
    SELECT
      t.id,
      'task'::text AS entity_type,
      t.name AS name,
      NULL::text AS code,
      t.project_id,
      p.name AS project_name,
      t.deleted_at,
      t.deleted_by
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'task')
      AND (p_project_id IS NULL OR t.project_id = p_project_id)

    UNION ALL

    -- Versions (use code as display name)
    SELECT
      v.id,
      'version'::text AS entity_type,
      v.code AS name,
      v.code AS code,
      v.project_id,
      p.name AS project_name,
      v.deleted_at,
      v.deleted_by
    FROM versions v
    JOIN projects p ON p.id = v.project_id
    WHERE v.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'version')
      AND (p_project_id IS NULL OR v.project_id = p_project_id)

    UNION ALL

    -- Notes
    SELECT
      n.id,
      'note'::text AS entity_type,
      n.subject AS name,
      NULL::text AS code,
      n.project_id,
      p.name AS project_name,
      n.deleted_at,
      n.deleted_by
    FROM notes n
    JOIN projects p ON p.id = n.project_id
    WHERE n.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'note')
      AND (p_project_id IS NULL OR n.project_id = p_project_id)

    UNION ALL

    -- Playlists
    SELECT
      pl.id,
      'playlist'::text AS entity_type,
      pl.name AS name,
      pl.code AS code,
      pl.project_id,
      p.name AS project_name,
      pl.deleted_at,
      pl.deleted_by
    FROM playlists pl
    JOIN projects p ON p.id = pl.project_id
    WHERE pl.deleted_at IS NOT NULL
      AND (p_entity_type IS NULL OR p_entity_type = 'playlist')
      AND (p_project_id IS NULL OR pl.project_id = p_project_id)
  )
  SELECT
    t.id,
    t.entity_type,
    t.name,
    t.code,
    t.project_id,
    t.project_name,
    t.deleted_at,
    t.deleted_by,
    prof.full_name AS deleted_by_name
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
