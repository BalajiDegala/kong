-- Check storage bucket CORS configuration
SELECT
  name,
  public,
  allowed_mime_types
FROM storage.buckets
WHERE name IN ('post-media', 'note-attachments');

-- Check notes table RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'notes';

-- Check if user can insert into notes table (test query)
-- This will show what the RLS policy is checking
EXPLAIN (VERBOSE, FORMAT JSON)
INSERT INTO notes (entity_type, entity_id, content, author_id, created_by, status)
VALUES ('post', 1, 'test', auth.uid(), auth.uid(), 'open');
