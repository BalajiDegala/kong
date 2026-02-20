-- ============================================================================
-- KONG: Fix RLS Policies — All Entity Tables
-- Date: 2026-02-18
--
-- AUDIT RESULTS:
-- ┌─────────────────────────┬─────┬────────┬────────┬────────┬────────┬──────────────┐
-- │ Table                   │ RLS │ SELECT │ INSERT │ UPDATE │ DELETE │ Status       │
-- ├─────────────────────────┼─────┼────────┼────────┼────────┼────────┼──────────────┤
-- │ assets                  │ YES │   ✓    │   ✓    │   ✓    │   ✓    │ OK           │
-- │ sequences               │ YES │   ✓    │   ✓    │   ✓    │   ✓    │ OK           │
-- │ shots                   │ YES │   ✓    │   ✓    │   ✓    │   ✓    │ OK           │
-- │ notes                   │ YES │   ✓    │   ✓    │   ✓    │   ✓    │ OK           │
-- │ versions                │ YES │   ✓    │   ✓    │   ✓    │   ✓    │ OK           │
-- │ tasks                   │ YES │   ✓    │   ✓    │   ✗    │   ✗    │ FIXED HERE   │
-- │ published_files         │ YES │   ✓    │   ✗    │   ✗    │   ✗    │ FIXED HERE   │
-- │ playlists               │ YES │   ✓    │   ✗    │   ✗    │   ✗    │ FIXED HERE   │
-- │ playlist_items          │ YES │   ✗    │   ✗    │   ✗    │   ✗    │ FIXED HERE   │
-- │ playlist_shares         │ YES │   ✗    │   ✗    │   ✗    │   ✗    │ FIXED HERE   │
-- │ project_members         │  ✗  │   ✓    │   -    │   -    │   -    │ FIXED HERE   │
-- │ task_assignments        │ YES │   ✗    │   ✗    │   ✗    │   ✗    │ FIXED HERE   │
-- │ task_dependencies       │ YES │   ✗    │   ✗    │   ✗    │   ✗    │ FIXED HERE   │
-- │ published_file_deps     │ YES │   ✗    │   ✗    │   ✗    │   ✗    │ FIXED HERE   │
-- │ note_mentions           │ YES │   ✗    │   ✗    │   ✗    │   ✗    │ FIXED HERE   │
-- │ delivery_items          │ YES │   ✗    │   ✗    │   ✗    │   ✗    │ FIXED HERE   │
-- │ group_members           │ YES │   ✗    │   ✗    │   ✗    │   ✗    │ FIXED HERE   │
-- └─────────────────────────┴─────┴────────┴────────┴────────┴────────┴──────────────┘
--
-- All policies use the project-member pattern:
--   project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
--
-- For junction tables without project_id, we join through the parent entity.
-- ============================================================================

BEGIN;

-- ============================================================================
-- HELPER: Reusable project-membership check function
-- Avoids repeating the subquery in every policy.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.project_id = p_project_id
      AND pm.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_project_member(integer) TO authenticated;


-- ============================================================================
-- 1. TASKS — Add UPDATE + DELETE
-- Already has: SELECT (2 policies), INSERT (1 policy)
-- Missing: UPDATE, DELETE
-- ============================================================================

DROP POLICY IF EXISTS "Allow authenticated users to update tasks" ON public.tasks;
CREATE POLICY "Allow authenticated users to update tasks"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Allow authenticated users to delete tasks" ON public.tasks;
CREATE POLICY "Allow authenticated users to delete tasks"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 2. PUBLISHED_FILES — Add INSERT + UPDATE + DELETE
-- Already has: SELECT (project-based)
-- Missing: INSERT, UPDATE, DELETE
-- ============================================================================

DROP POLICY IF EXISTS "Users can create published files in their projects" ON public.published_files;
CREATE POLICY "Users can create published files in their projects"
  ON public.published_files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update published files in their projects" ON public.published_files;
CREATE POLICY "Users can update published files in their projects"
  ON public.published_files
  FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete published files in their projects" ON public.published_files;
CREATE POLICY "Users can delete published files in their projects"
  ON public.published_files
  FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 3. PLAYLISTS — Add INSERT + UPDATE + DELETE
-- Already has: SELECT (project-based)
-- Missing: INSERT, UPDATE, DELETE
-- This is the exact error: "new row violates row-level security policy for table playlists"
-- ============================================================================

DROP POLICY IF EXISTS "Users can create playlists in their projects" ON public.playlists;
CREATE POLICY "Users can create playlists in their projects"
  ON public.playlists
  FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update playlists in their projects" ON public.playlists;
CREATE POLICY "Users can update playlists in their projects"
  ON public.playlists
  FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete playlists in their projects" ON public.playlists;
CREATE POLICY "Users can delete playlists in their projects"
  ON public.playlists
  FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 4. PLAYLIST_ITEMS — Add ALL 4 policies (currently ZERO — blocks everything)
-- No project_id column — join through playlists table.
-- ============================================================================

DROP POLICY IF EXISTS "Users can view playlist items" ON public.playlist_items;
CREATE POLICY "Users can view playlist items"
  ON public.playlist_items
  FOR SELECT
  TO authenticated
  USING (
    playlist_id IN (
      SELECT p.id FROM public.playlists p
      JOIN public.project_members pm ON pm.project_id = p.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can add playlist items" ON public.playlist_items;
CREATE POLICY "Users can add playlist items"
  ON public.playlist_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    playlist_id IN (
      SELECT p.id FROM public.playlists p
      JOIN public.project_members pm ON pm.project_id = p.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update playlist items" ON public.playlist_items;
CREATE POLICY "Users can update playlist items"
  ON public.playlist_items
  FOR UPDATE
  TO authenticated
  USING (
    playlist_id IN (
      SELECT p.id FROM public.playlists p
      JOIN public.project_members pm ON pm.project_id = p.project_id
      WHERE pm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    playlist_id IN (
      SELECT p.id FROM public.playlists p
      JOIN public.project_members pm ON pm.project_id = p.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete playlist items" ON public.playlist_items;
CREATE POLICY "Users can delete playlist items"
  ON public.playlist_items
  FOR DELETE
  TO authenticated
  USING (
    playlist_id IN (
      SELECT p.id FROM public.playlists p
      JOIN public.project_members pm ON pm.project_id = p.project_id
      WHERE pm.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 5. PLAYLIST_SHARES — Add ALL 4 policies (currently ZERO — blocks everything)
-- No project_id column — join through playlists table.
-- ============================================================================

DROP POLICY IF EXISTS "Users can view playlist shares" ON public.playlist_shares;
CREATE POLICY "Users can view playlist shares"
  ON public.playlist_shares
  FOR SELECT
  TO authenticated
  USING (
    playlist_id IN (
      SELECT p.id FROM public.playlists p
      JOIN public.project_members pm ON pm.project_id = p.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create playlist shares" ON public.playlist_shares;
CREATE POLICY "Users can create playlist shares"
  ON public.playlist_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (
    playlist_id IN (
      SELECT p.id FROM public.playlists p
      JOIN public.project_members pm ON pm.project_id = p.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update playlist shares" ON public.playlist_shares;
CREATE POLICY "Users can update playlist shares"
  ON public.playlist_shares
  FOR UPDATE
  TO authenticated
  USING (
    playlist_id IN (
      SELECT p.id FROM public.playlists p
      JOIN public.project_members pm ON pm.project_id = p.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete playlist shares" ON public.playlist_shares;
CREATE POLICY "Users can delete playlist shares"
  ON public.playlist_shares
  FOR DELETE
  TO authenticated
  USING (
    playlist_id IN (
      SELECT p.id FROM public.playlists p
      JOIN public.project_members pm ON pm.project_id = p.project_id
      WHERE pm.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 6. PROJECT_MEMBERS — Enable RLS + add policies
--
-- CRITICAL: project_members is special because:
--   a) Almost every other table's RLS uses:
--      "project_id IN (SELECT ... FROM project_members WHERE user_id = auth.uid())"
--   b) So policies ON project_members CANNOT query project_members (infinite recursion)
--   c) Write policies use a SECURITY DEFINER function to bypass RLS for the check
--   d) SELECT is open to all authenticated users (membership data is not sensitive,
--      and the People page + all other RLS subqueries depend on reading it)
-- ============================================================================

-- Helper: check if current user is lead/alpha in a project (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_project_lead(p_project_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
      AND role IN ('lead', 'alpha')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_project_lead(integer) TO authenticated;

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start clean (prevents duplicates/conflicts)
DROP POLICY IF EXISTS "Leads can manage project members" ON public.project_members;
DROP POLICY IF EXISTS "Project members can view own memberships" ON public.project_members;
DROP POLICY IF EXISTS "Project members can view co-members" ON public.project_members;
DROP POLICY IF EXISTS "Authenticated users can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Allow authenticated users to view project members" ON public.project_members;
DROP POLICY IF EXISTS "Leads can add project members" ON public.project_members;
DROP POLICY IF EXISTS "Leads can update project members" ON public.project_members;
DROP POLICY IF EXISTS "Leads can delete project members" ON public.project_members;

-- SELECT: open to all authenticated (no recursion risk)
CREATE POLICY "Authenticated users can view project members"
  ON public.project_members
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: leads/alphas only (uses SECURITY DEFINER function to avoid recursion)
CREATE POLICY "Leads can add project members"
  ON public.project_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_project_lead(project_id));

-- UPDATE: leads/alphas only
CREATE POLICY "Leads can update project members"
  ON public.project_members
  FOR UPDATE
  TO authenticated
  USING (public.is_project_lead(project_id))
  WITH CHECK (public.is_project_lead(project_id));

-- DELETE: leads/alphas only
CREATE POLICY "Leads can delete project members"
  ON public.project_members
  FOR DELETE
  TO authenticated
  USING (public.is_project_lead(project_id));


-- ============================================================================
-- 7. TASK_ASSIGNMENTS — Add ALL 4 policies (currently ZERO)
-- No project_id — join through tasks table.
-- ============================================================================

DROP POLICY IF EXISTS "Users can view task assignments" ON public.task_assignments;
CREATE POLICY "Users can view task assignments"
  ON public.task_assignments
  FOR SELECT
  TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create task assignments" ON public.task_assignments;
CREATE POLICY "Users can create task assignments"
  ON public.task_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update task assignments" ON public.task_assignments;
CREATE POLICY "Users can update task assignments"
  ON public.task_assignments
  FOR UPDATE
  TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete task assignments" ON public.task_assignments;
CREATE POLICY "Users can delete task assignments"
  ON public.task_assignments
  FOR DELETE
  TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 8. TASK_DEPENDENCIES — Add ALL 4 policies (currently ZERO)
-- No project_id — join through tasks table.
-- ============================================================================

DROP POLICY IF EXISTS "Users can view task dependencies" ON public.task_dependencies;
CREATE POLICY "Users can view task dependencies"
  ON public.task_dependencies
  FOR SELECT
  TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create task dependencies" ON public.task_dependencies;
CREATE POLICY "Users can create task dependencies"
  ON public.task_dependencies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update task dependencies" ON public.task_dependencies;
CREATE POLICY "Users can update task dependencies"
  ON public.task_dependencies
  FOR UPDATE
  TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete task dependencies" ON public.task_dependencies;
CREATE POLICY "Users can delete task dependencies"
  ON public.task_dependencies
  FOR DELETE
  TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 9. NOTE_MENTIONS — Add ALL 4 policies (currently ZERO)
-- No project_id — join through notes table.
-- ============================================================================

DROP POLICY IF EXISTS "Users can view note mentions" ON public.note_mentions;
CREATE POLICY "Users can view note mentions"
  ON public.note_mentions
  FOR SELECT
  TO authenticated
  USING (
    note_id IN (
      SELECT n.id FROM public.notes n
      JOIN public.project_members pm ON pm.project_id = n.project_id
      WHERE pm.user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can create note mentions" ON public.note_mentions;
CREATE POLICY "Users can create note mentions"
  ON public.note_mentions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    note_id IN (
      SELECT n.id FROM public.notes n
      JOIN public.project_members pm ON pm.project_id = n.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update note mentions" ON public.note_mentions;
CREATE POLICY "Users can update note mentions"
  ON public.note_mentions
  FOR UPDATE
  TO authenticated
  USING (
    note_id IN (
      SELECT n.id FROM public.notes n
      JOIN public.project_members pm ON pm.project_id = n.project_id
      WHERE pm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    note_id IN (
      SELECT n.id FROM public.notes n
      JOIN public.project_members pm ON pm.project_id = n.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete note mentions" ON public.note_mentions;
CREATE POLICY "Users can delete note mentions"
  ON public.note_mentions
  FOR DELETE
  TO authenticated
  USING (
    note_id IN (
      SELECT n.id FROM public.notes n
      JOIN public.project_members pm ON pm.project_id = n.project_id
      WHERE pm.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 10. PUBLISHED_FILE_DEPENDENCIES — Add ALL 4 policies (currently ZERO)
-- No project_id — join through published_files table.
-- ============================================================================

DROP POLICY IF EXISTS "Users can view published file deps" ON public.published_file_dependencies;
CREATE POLICY "Users can view published file deps"
  ON public.published_file_dependencies
  FOR SELECT
  TO authenticated
  USING (
    published_file_id IN (
      SELECT pf.id FROM public.published_files pf
      JOIN public.project_members pm ON pm.project_id = pf.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create published file deps" ON public.published_file_dependencies;
CREATE POLICY "Users can create published file deps"
  ON public.published_file_dependencies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    published_file_id IN (
      SELECT pf.id FROM public.published_files pf
      JOIN public.project_members pm ON pm.project_id = pf.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete published file deps" ON public.published_file_dependencies;
CREATE POLICY "Users can delete published file deps"
  ON public.published_file_dependencies
  FOR DELETE
  TO authenticated
  USING (
    published_file_id IN (
      SELECT pf.id FROM public.published_files pf
      JOIN public.project_members pm ON pm.project_id = pf.project_id
      WHERE pm.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 11. DELIVERY_ITEMS — Add ALL 4 policies (currently ZERO)
-- No project_id — join through deliveries table.
-- ============================================================================

DROP POLICY IF EXISTS "Users can view delivery items" ON public.delivery_items;
CREATE POLICY "Users can view delivery items"
  ON public.delivery_items
  FOR SELECT
  TO authenticated
  USING (
    delivery_id IN (
      SELECT d.id FROM public.deliveries d
      JOIN public.project_members pm ON pm.project_id = d.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create delivery items" ON public.delivery_items;
CREATE POLICY "Users can create delivery items"
  ON public.delivery_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    delivery_id IN (
      SELECT d.id FROM public.deliveries d
      JOIN public.project_members pm ON pm.project_id = d.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update delivery items" ON public.delivery_items;
CREATE POLICY "Users can update delivery items"
  ON public.delivery_items
  FOR UPDATE
  TO authenticated
  USING (
    delivery_id IN (
      SELECT d.id FROM public.deliveries d
      JOIN public.project_members pm ON pm.project_id = d.project_id
      WHERE pm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    delivery_id IN (
      SELECT d.id FROM public.deliveries d
      JOIN public.project_members pm ON pm.project_id = d.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete delivery items" ON public.delivery_items;
CREATE POLICY "Users can delete delivery items"
  ON public.delivery_items
  FOR DELETE
  TO authenticated
  USING (
    delivery_id IN (
      SELECT d.id FROM public.deliveries d
      JOIN public.project_members pm ON pm.project_id = d.project_id
      WHERE pm.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 12. GROUP_MEMBERS — Add ALL 4 policies (currently ZERO)
-- Global table (not project-scoped) — authenticated users can manage.
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view group members" ON public.group_members;
CREATE POLICY "Authenticated users can view group members"
  ON public.group_members
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage group members" ON public.group_members;
CREATE POLICY "Authenticated users can manage group members"
  ON public.group_members
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ============================================================================
-- 13. DELIVERIES — Add missing UPDATE + DELETE
-- Has: SELECT (project-based)
-- Checking if INSERT exists...
-- ============================================================================

-- INSERT if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'deliveries'
      AND policyname LIKE '%insert%' OR policyname LIKE '%create%'
  ) THEN
    CREATE POLICY "Users can create deliveries in their projects"
      ON public.deliveries
      FOR INSERT
      TO authenticated
      WITH CHECK (
        project_id IN (
          SELECT pm.project_id FROM public.project_members pm
          WHERE pm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can update deliveries in their projects" ON public.deliveries;
CREATE POLICY "Users can update deliveries in their projects"
  ON public.deliveries
  FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete deliveries in their projects" ON public.deliveries;
CREATE POLICY "Users can delete deliveries in their projects"
  ON public.deliveries
  FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 14. TICKETS — Add missing UPDATE + DELETE
-- Has: SELECT (project-based)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tickets'
      AND cmd = 'i'
  ) THEN
    CREATE POLICY "Users can create tickets in their projects"
      ON public.tickets
      FOR INSERT
      TO authenticated
      WITH CHECK (
        project_id IN (
          SELECT pm.project_id FROM public.project_members pm
          WHERE pm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can update tickets in their projects" ON public.tickets;
CREATE POLICY "Users can update tickets in their projects"
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete tickets in their projects" ON public.tickets;
CREATE POLICY "Users can delete tickets in their projects"
  ON public.tickets
  FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 15. TIME_LOGS — Add missing INSERT + UPDATE + DELETE
-- Has: SELECT (project-based)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'time_logs'
      AND cmd = 'i'
  ) THEN
    CREATE POLICY "Users can create time logs in their projects"
      ON public.time_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (
        project_id IN (
          SELECT pm.project_id FROM public.project_members pm
          WHERE pm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can update time logs in their projects" ON public.time_logs;
CREATE POLICY "Users can update time logs in their projects"
  ON public.time_logs
  FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete time logs in their projects" ON public.time_logs;
CREATE POLICY "Users can delete time logs in their projects"
  ON public.time_logs
  FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 16. MILESTONES + PHASES — Add missing write policies
-- Both have: SELECT (project-based)
-- ============================================================================

DO $$
BEGIN
  -- Milestones INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'milestones' AND cmd = 'i'
  ) THEN
    CREATE POLICY "Users can create milestones"
      ON public.milestones FOR INSERT TO authenticated
      WITH CHECK (project_id IN (
        SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
      ));
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can update milestones" ON public.milestones;
CREATE POLICY "Users can update milestones"
  ON public.milestones FOR UPDATE TO authenticated
  USING (project_id IN (
    SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
  ))
  WITH CHECK (project_id IN (
    SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete milestones" ON public.milestones;
CREATE POLICY "Users can delete milestones"
  ON public.milestones FOR DELETE TO authenticated
  USING (project_id IN (
    SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
  ));

-- Phases
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'phases' AND cmd = 'i'
  ) THEN
    CREATE POLICY "Users can create phases"
      ON public.phases FOR INSERT TO authenticated
      WITH CHECK (project_id IN (
        SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
      ));
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can update phases" ON public.phases;
CREATE POLICY "Users can update phases"
  ON public.phases FOR UPDATE TO authenticated
  USING (project_id IN (
    SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
  ))
  WITH CHECK (project_id IN (
    SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete phases" ON public.phases;
CREATE POLICY "Users can delete phases"
  ON public.phases FOR DELETE TO authenticated
  USING (project_id IN (
    SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
  ));


COMMIT;
