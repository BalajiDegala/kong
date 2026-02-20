-- =============================================================================
-- Migration: Link annotations to notes for version review traceability
-- Date: 2026-02-17
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'annotations'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'annotations'
        AND column_name = 'note_id'
    ) THEN
      ALTER TABLE public.annotations
        ADD COLUMN note_id integer;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'annotations_note_id_fkey'
    ) THEN
      ALTER TABLE public.annotations
        ADD CONSTRAINT annotations_note_id_fkey
        FOREIGN KEY (note_id)
        REFERENCES public.notes(id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'annotations'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_annotations_note_id ON public.annotations(note_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_annotations_version_frame_status ON public.annotations(version_id, frame_number, status)';
  END IF;
END $$;
