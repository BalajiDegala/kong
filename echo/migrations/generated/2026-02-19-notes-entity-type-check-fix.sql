-- Hotfix: align notes.entity_type constraint with app behavior.
-- Supports both Apex-linked notes (including sequence) and Pulse comments (post).

ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS notes_entity_type_check;
ALTER TABLE public.notes
  ADD CONSTRAINT notes_entity_type_check
  CHECK (
    entity_type IN (
      'task',
      'asset',
      'shot',
      'sequence',
      'version',
      'project',
      'published_file',
      'post'
    )
  ) NOT VALID;

-- Optional after cleanup:
-- ALTER TABLE public.notes VALIDATE CONSTRAINT notes_entity_type_check;
