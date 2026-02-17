-- Check recent notes (comments) with their attachments
SELECT
  n.id as note_id,
  n.content,
  n.entity_type,
  n.entity_id as post_id,
  n.created_at,
  a.id as attachment_id,
  a.file_name,
  a.storage_path,
  a.file_size
FROM notes n
LEFT JOIN attachments a ON a.note_id = n.id
WHERE n.entity_type = 'post'
ORDER BY n.created_at DESC
LIMIT 10;

-- Check if attachments exist at all
SELECT COUNT(*) as total_attachments FROM attachments;

-- Check recent attachments
SELECT * FROM attachments ORDER BY created_at DESC LIMIT 5;
