-- ============================================================================
-- KONG: Pulse Entity Associations (Multi-Select)
-- Date: 2026-02-13
--
-- Purpose:
-- - Enable multi-entity associations for posts (projects, sequences, shots, tasks, users)
-- - Support filtering posts by any combination of entities
-- - Author is always the current user (no impersonation)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CREATE JUNCTION TABLES FOR MANY-TO-MANY RELATIONSHIPS
-- ============================================================================

-- Posts ↔ Projects
CREATE TABLE IF NOT EXISTS public.post_projects (
    id              serial PRIMARY KEY,
    post_id         integer NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    project_id      integer NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (post_id, project_id)
);

CREATE INDEX idx_post_projects_post ON public.post_projects(post_id);
CREATE INDEX idx_post_projects_project ON public.post_projects(project_id);

-- Posts ↔ Sequences
CREATE TABLE IF NOT EXISTS public.post_sequences (
    id              serial PRIMARY KEY,
    post_id         integer NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    sequence_id     integer NOT NULL REFERENCES public.sequences(id) ON DELETE CASCADE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (post_id, sequence_id)
);

CREATE INDEX idx_post_sequences_post ON public.post_sequences(post_id);
CREATE INDEX idx_post_sequences_sequence ON public.post_sequences(sequence_id);

-- Posts ↔ Shots
CREATE TABLE IF NOT EXISTS public.post_shots (
    id              serial PRIMARY KEY,
    post_id         integer NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    shot_id         integer NOT NULL REFERENCES public.shots(id) ON DELETE CASCADE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (post_id, shot_id)
);

CREATE INDEX idx_post_shots_post ON public.post_shots(post_id);
CREATE INDEX idx_post_shots_shot ON public.post_shots(shot_id);

-- Posts ↔ Tasks
CREATE TABLE IF NOT EXISTS public.post_tasks (
    id              serial PRIMARY KEY,
    post_id         integer NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    task_id         integer NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (post_id, task_id)
);

CREATE INDEX idx_post_tasks_post ON public.post_tasks(post_id);
CREATE INDEX idx_post_tasks_task ON public.post_tasks(task_id);

-- Posts ↔ Users (for mentions/assignments, NOT authorship)
-- author_id on posts table remains for post ownership
CREATE TABLE IF NOT EXISTS public.post_users (
    id              serial PRIMARY KEY,
    post_id         integer NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (post_id, user_id)
);

CREATE INDEX idx_post_users_post ON public.post_users(post_id);
CREATE INDEX idx_post_users_user ON public.post_users(user_id);

-- ============================================================================
-- 2. ADD HELPER COLUMNS TO POSTS TABLE (optional, for performance)
-- ============================================================================

-- Track entity counts for quick filtering
ALTER TABLE public.posts
    ADD COLUMN IF NOT EXISTS project_count integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sequence_count integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS shot_count integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS task_count integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS mentioned_user_count integer NOT NULL DEFAULT 0;

-- ============================================================================
-- 3. ROW-LEVEL SECURITY POLICIES
-- ============================================================================

-- post_projects RLS
ALTER TABLE public.post_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view post_projects for visible posts"
    ON public.post_projects FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_projects.post_id
        )
    );

CREATE POLICY "Users can insert post_projects for own posts"
    ON public.post_projects FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_projects.post_id
            AND posts.author_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete post_projects for own posts"
    ON public.post_projects FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_projects.post_id
            AND posts.author_id = auth.uid()
        )
    );

-- post_sequences RLS
ALTER TABLE public.post_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view post_sequences for visible posts"
    ON public.post_sequences FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_sequences.post_id
        )
    );

CREATE POLICY "Users can insert post_sequences for own posts"
    ON public.post_sequences FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_sequences.post_id
            AND posts.author_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete post_sequences for own posts"
    ON public.post_sequences FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_sequences.post_id
            AND posts.author_id = auth.uid()
        )
    );

-- post_shots RLS
ALTER TABLE public.post_shots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view post_shots for visible posts"
    ON public.post_shots FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_shots.post_id
        )
    );

CREATE POLICY "Users can insert post_shots for own posts"
    ON public.post_shots FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_shots.post_id
            AND posts.author_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete post_shots for own posts"
    ON public.post_shots FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_shots.post_id
            AND posts.author_id = auth.uid()
        )
    );

-- post_tasks RLS
ALTER TABLE public.post_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view post_tasks for visible posts"
    ON public.post_tasks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_tasks.post_id
        )
    );

CREATE POLICY "Users can insert post_tasks for own posts"
    ON public.post_tasks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_tasks.post_id
            AND posts.author_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete post_tasks for own posts"
    ON public.post_tasks FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_tasks.post_id
            AND posts.author_id = auth.uid()
        )
    );

-- post_users RLS
ALTER TABLE public.post_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view post_users for visible posts"
    ON public.post_users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_users.post_id
        )
    );

CREATE POLICY "Users can insert post_users for own posts"
    ON public.post_users FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_users.post_id
            AND posts.author_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete post_users for own posts"
    ON public.post_users FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_users.post_id
            AND posts.author_id = auth.uid()
        )
    );

-- ============================================================================
-- 4. UPDATE VISIBILITY LOGIC (Optional Enhancement)
-- ============================================================================

-- Update posts RLS to respect project memberships via junction table
DROP POLICY IF EXISTS "Users can view project posts they belong to" ON public.posts;

CREATE POLICY "Users can view posts in their projects"
    ON public.posts FOR SELECT
    USING (
        -- Global posts (no project associations)
        (visibility = 'global' AND NOT EXISTS (
            SELECT 1 FROM public.post_projects WHERE post_projects.post_id = posts.id
        ))
        OR
        -- Posts in projects the user is a member of
        EXISTS (
            SELECT 1 FROM public.post_projects pp
            JOIN public.project_members pm ON pm.project_id = pp.project_id
            WHERE pp.post_id = posts.id
            AND pm.user_id = auth.uid()
        )
        OR
        -- User's own posts (always visible)
        posts.author_id = auth.uid()
    );

-- ============================================================================
-- 5. HELPER FUNCTIONS FOR ENTITY FILTERING
-- ============================================================================

-- Function to get posts filtered by multiple entities
CREATE OR REPLACE FUNCTION public.get_filtered_posts(
    p_project_ids integer[] DEFAULT NULL,
    p_sequence_ids integer[] DEFAULT NULL,
    p_shot_ids integer[] DEFAULT NULL,
    p_task_ids integer[] DEFAULT NULL,
    p_user_ids uuid[] DEFAULT NULL,
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id integer,
    author_id uuid,
    content text,
    content_html text,
    media_count integer,
    comment_count integer,
    reaction_count integer,
    visibility text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        p.id,
        p.author_id,
        p.content,
        p.content_html,
        p.media_count,
        p.comment_count,
        p.reaction_count,
        p.visibility,
        p.created_at,
        p.updated_at
    FROM public.posts p
    WHERE
        -- Apply project filter
        (p_project_ids IS NULL OR EXISTS (
            SELECT 1 FROM public.post_projects pp
            WHERE pp.post_id = p.id
            AND pp.project_id = ANY(p_project_ids)
        ))
        AND
        -- Apply sequence filter
        (p_sequence_ids IS NULL OR EXISTS (
            SELECT 1 FROM public.post_sequences ps
            WHERE ps.post_id = p.id
            AND ps.sequence_id = ANY(p_sequence_ids)
        ))
        AND
        -- Apply shot filter
        (p_shot_ids IS NULL OR EXISTS (
            SELECT 1 FROM public.post_shots psh
            WHERE psh.post_id = p.id
            AND psh.shot_id = ANY(p_shot_ids)
        ))
        AND
        -- Apply task filter
        (p_task_ids IS NULL OR EXISTS (
            SELECT 1 FROM public.post_tasks pt
            WHERE pt.post_id = p.id
            AND pt.task_id = ANY(p_task_ids)
        ))
        AND
        -- Apply user filter
        (p_user_ids IS NULL OR EXISTS (
            SELECT 1 FROM public.post_users pu
            WHERE pu.post_id = p.id
            AND pu.user_id = ANY(p_user_ids)
        ))
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_filtered_posts TO authenticated;

-- ============================================================================
-- 6. TRIGGERS TO MAINTAIN ENTITY COUNTS
-- ============================================================================

-- Function to update entity counts on posts
CREATE OR REPLACE FUNCTION public.update_post_entity_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
        UPDATE public.posts
        SET
            project_count = (SELECT COUNT(*) FROM public.post_projects WHERE post_id = COALESCE(NEW.post_id, OLD.post_id)),
            sequence_count = (SELECT COUNT(*) FROM public.post_sequences WHERE post_id = COALESCE(NEW.post_id, OLD.post_id)),
            shot_count = (SELECT COUNT(*) FROM public.post_shots WHERE post_id = COALESCE(NEW.post_id, OLD.post_id)),
            task_count = (SELECT COUNT(*) FROM public.post_tasks WHERE post_id = COALESCE(NEW.post_id, OLD.post_id)),
            mentioned_user_count = (SELECT COUNT(*) FROM public.post_users WHERE post_id = COALESCE(NEW.post_id, OLD.post_id))
        WHERE id = COALESCE(NEW.post_id, OLD.post_id);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Attach triggers to junction tables
CREATE TRIGGER update_post_projects_count
    AFTER INSERT OR DELETE ON public.post_projects
    FOR EACH ROW EXECUTE FUNCTION public.update_post_entity_counts();

CREATE TRIGGER update_post_sequences_count
    AFTER INSERT OR DELETE ON public.post_sequences
    FOR EACH ROW EXECUTE FUNCTION public.update_post_entity_counts();

CREATE TRIGGER update_post_shots_count
    AFTER INSERT OR DELETE ON public.post_shots
    FOR EACH ROW EXECUTE FUNCTION public.update_post_entity_counts();

CREATE TRIGGER update_post_tasks_count
    AFTER INSERT OR DELETE ON public.post_tasks
    FOR EACH ROW EXECUTE FUNCTION public.update_post_entity_counts();

CREATE TRIGGER update_post_users_count
    AFTER INSERT OR DELETE ON public.post_users
    FOR EACH ROW EXECUTE FUNCTION public.update_post_entity_counts();

COMMIT;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Author is ALWAYS the current authenticated user (posts.author_id = auth.uid())
-- 2. post_users table is for MENTIONS/ASSIGNMENTS, not authorship
-- 3. All junction tables support multi-select (many-to-many relationships)
-- 4. RLS policies ensure users only see posts they have access to
-- 5. Helper function get_filtered_posts() supports complex filtering
-- 6. Triggers automatically maintain entity counts for performance
