-- =============================================================================
-- Migration: Enhance activity_events table for field-level tracking
-- Date: 2026-02-16
-- =============================================================================

-- Add field-tracking columns to existing activity_events table
ALTER TABLE public.activity_events
  ADD COLUMN IF NOT EXISTS attribute_name text,
  ADD COLUMN IF NOT EXISTS old_value jsonb,
  ADD COLUMN IF NOT EXISTS new_value jsonb,
  ADD COLUMN IF NOT EXISTS field_data_type text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS session_id text;

-- Index for history page queries (field-level changes per entity)
CREATE INDEX IF NOT EXISTS idx_activity_entity_attribute
  ON public.activity_events (entity_type, entity_id, attribute_name);

-- Index for event log filtering (project-wide queries)
CREATE INDEX IF NOT EXISTS idx_activity_project_type_time
  ON public.activity_events (project_id, event_type, created_at DESC);

-- RLS policy: allow authenticated users to insert their own activity events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'activity_events'
      AND policyname = 'Authenticated users can insert activity'
  ) THEN
    CREATE POLICY "Authenticated users can insert activity"
      ON public.activity_events FOR INSERT TO authenticated
      WITH CHECK (actor_id = auth.uid());
  END IF;
END $$;
