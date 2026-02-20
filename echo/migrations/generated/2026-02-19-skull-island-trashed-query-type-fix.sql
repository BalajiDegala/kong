-- Skull Island hotfix #3:
-- Ensure get_trashed_entities query columns exactly match RETURNS TABLE types.

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

    -- Versions
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
