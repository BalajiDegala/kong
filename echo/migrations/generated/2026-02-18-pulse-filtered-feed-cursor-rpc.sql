-- ============================================================================
-- KONG: Pulse Filtered Feed Cursor RPC
-- Date: 2026-02-18
--
-- Purpose:
-- - Move filtered feed matching to database-side evaluation
-- - Support cursor pagination (id DESC) without offset scans
-- - Include user filter against both post author and post_users mentions
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_filtered_posts_cursor(
  p_project_ids integer[] DEFAULT NULL,
  p_sequence_ids integer[] DEFAULT NULL,
  p_shot_ids integer[] DEFAULT NULL,
  p_task_ids integer[] DEFAULT NULL,
  p_user_ids uuid[] DEFAULT NULL,
  p_cursor_id integer DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id integer,
  author_id uuid
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    p.id,
    p.author_id
  FROM public.posts p
  WHERE
    (p_cursor_id IS NULL OR p.id < p_cursor_id)
    AND
    (
      COALESCE(array_length(p_project_ids, 1), 0) = 0
      OR EXISTS (
        SELECT 1
        FROM public.post_projects pp
        WHERE pp.post_id = p.id
          AND pp.project_id = ANY(p_project_ids)
      )
    )
    AND
    (
      COALESCE(array_length(p_sequence_ids, 1), 0) = 0
      OR EXISTS (
        SELECT 1
        FROM public.post_sequences ps
        WHERE ps.post_id = p.id
          AND ps.sequence_id = ANY(p_sequence_ids)
      )
    )
    AND
    (
      COALESCE(array_length(p_shot_ids, 1), 0) = 0
      OR EXISTS (
        SELECT 1
        FROM public.post_shots psh
        WHERE psh.post_id = p.id
          AND psh.shot_id = ANY(p_shot_ids)
      )
    )
    AND
    (
      COALESCE(array_length(p_task_ids, 1), 0) = 0
      OR EXISTS (
        SELECT 1
        FROM public.post_tasks pt
        WHERE pt.post_id = p.id
          AND pt.task_id = ANY(p_task_ids)
      )
    )
    AND
    (
      COALESCE(array_length(p_user_ids, 1), 0) = 0
      OR p.author_id = ANY(p_user_ids)
      OR EXISTS (
        SELECT 1
        FROM public.post_users pu
        WHERE pu.post_id = p.id
          AND pu.user_id = ANY(p_user_ids)
      )
    )
  ORDER BY p.id DESC
  LIMIT GREATEST(COALESCE(p_limit, 20), 1) + 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_filtered_posts_cursor(
  integer[], integer[], integer[], integer[], uuid[], integer, integer
) TO authenticated, service_role;

COMMIT;
