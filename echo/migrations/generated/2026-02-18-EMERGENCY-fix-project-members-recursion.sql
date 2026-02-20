-- ============================================================================
-- EMERGENCY FIX: project_members infinite recursion
--
-- Run this FIRST in Supabase SQL Editor before anything else.
-- It drops ALL existing policies on project_members and recreates
-- only non-recursive ones.
-- ============================================================================

-- Step 1: Drop EVERY policy on project_members (catch-all approach)
-- We use DO block to dynamically drop all policies regardless of name
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'project_members'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.project_members', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END;
$$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Step 3: Create SECURITY DEFINER helper (bypasses RLS — no recursion)
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

-- Step 4: Create ONLY non-recursive policies

-- SELECT: open to all authenticated users (USING true = no subquery = no recursion)
CREATE POLICY "Authenticated users can view project members"
  ON public.project_members
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: leads/alphas only (SECURITY DEFINER function avoids recursion)
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

-- Step 5: Verify — this should show exactly 4 policies, none recursive
SELECT policyname, cmd, permissive, roles, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'project_members'
ORDER BY cmd;
