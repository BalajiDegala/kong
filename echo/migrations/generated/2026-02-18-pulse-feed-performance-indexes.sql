-- ============================================================================
-- KONG: Pulse Feed Performance Indexes
-- Date: 2026-02-18
--
-- Purpose:
-- - Speed up filtered Pulse feed queries at high post volume
-- - Add composite indexes for filter-first lookup on post association tables
-- - Add stable sort/support indexes for feed pagination by time/author
-- ============================================================================

BEGIN;

-- Feed sort helper (useful for created_at keyset pagination variants).
CREATE INDEX IF NOT EXISTS idx_posts_created_id_desc
  ON public.posts (created_at DESC, id DESC);

-- Helps user-specific scans (author filters + descending fetch).
CREATE INDEX IF NOT EXISTS idx_posts_author_id_desc
  ON public.posts (author_id, id DESC);

-- Filter-first association indexes (entity -> post lookup).
CREATE INDEX IF NOT EXISTS idx_post_projects_project_post
  ON public.post_projects (project_id, post_id);

CREATE INDEX IF NOT EXISTS idx_post_sequences_sequence_post
  ON public.post_sequences (sequence_id, post_id);

CREATE INDEX IF NOT EXISTS idx_post_shots_shot_post
  ON public.post_shots (shot_id, post_id);

CREATE INDEX IF NOT EXISTS idx_post_tasks_task_post
  ON public.post_tasks (task_id, post_id);

CREATE INDEX IF NOT EXISTS idx_post_users_user_post
  ON public.post_users (user_id, post_id);

COMMIT;
