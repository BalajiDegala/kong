# Troubleshooting Guide

Common issues and their solutions for Kong platform development.

## Database Issues

### "new row violates row-level security policy"

**Cause:** User doesn't have permission via RLS policies

**Check:**
1. Is user in `project_members` table for this project?
```sql
SELECT * FROM project_members WHERE user_id = (SELECT id FROM auth.users WHERE email = 'balajid@d2.com');
```

2. Does table have RLS policies?
```sql
SELECT * FROM pg_policies WHERE tablename = 'table_name';
```

**Fix:**
- Add user to project_members with 'lead' role
- Create missing RLS policies

### "Could not find the 'column_name' column in the schema cache"

**Cause:** Column doesn't exist in database

**Check:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'table_name' AND column_name = 'column_name';
```

**Fix:**
- Add missing column via migration
- Check if column was created but not in expected table

### "violates check constraint"

**Cause:** Value doesn't match CHECK constraint allowed values

**Check constraint values:**
```sql
SELECT pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'table_name' AND con.contype = 'c';
```

**Common constraints:**
- `project_members.role`: Must be 'lead', 'member', or 'viewer'
- `notes.entity_type`: Must be 'asset' or 'shot'
- `versions.entity_type`: Must be 'asset' or 'shot'

### "Could not find a relationship between 'table_a' and 'table_b'"

**Cause:** Foreign key doesn't exist or has wrong name

**Check foreign keys:**
```sql
SELECT con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'table_name' AND con.contype = 'f';
```

**Fix:**
- Create foreign key with expected name
- For Supabase joins, FK name must match: `table_column_fkey`

## UI Issues

### "Task dropdown is empty"

**Cause:** Tasks not loaded with required fields for filtering

**Check:** Tasks query must include:
```typescript
.select('id, name, entity_type, entity_id')
```

**Filter logic:**
```typescript
tasks.filter(t =>
  t.entity_type === formData.entity_type &&
  t.entity_id === parseInt(formData.entity_id)
)
```

### "Can't upload files"

**Check:**
1. Storage bucket exists and has correct policies
2. File size within limit (10MB for attachments, 50MB for versions)
3. MIME type is allowed
4. User has INSERT policy on storage.objects

### "Can't view uploaded files"

**Check:**
1. Using signed URLs (not public URLs for private buckets)
2. Signed URL not expired (default 1 hour)
3. User has SELECT policy on storage.objects

## Authentication Issues

### "Not authenticated" error

**Check:**
1. User is logged in
2. Session cookie is valid
3. Middleware is running correctly

### "User not in project"

**Cause:** User not added to `project_members` table

**Fix:**
```sql
INSERT INTO project_members (project_id, user_id, role)
VALUES (project_id, user_id, 'lead');
```

## Common Patterns

### Always Check First
1. ✅ Check constraints before implementing
2. ✅ Verify column exists
3. ✅ Check RLS policies
4. ✅ Confirm user in project_members
5. ✅ Load all required fields for filtering

### Foreign Key Naming
Supabase expects: `{table}_{column}_fkey`
- Example: `notes_created_by_fkey`
- Example: `versions_created_by_fkey`

### RLS Policy Template
```sql
-- SELECT
CREATE POLICY "Users can view X in their projects"
ON table_name FOR SELECT TO authenticated
USING (
  project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
);

-- INSERT
CREATE POLICY "Users can create X in their projects"
ON table_name FOR INSERT TO authenticated
WITH CHECK (
  project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
);
```

### Storage Policy Template
```sql
CREATE POLICY "Users can view files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'bucket_name' AND auth.role() = 'authenticated');

CREATE POLICY "Users can upload files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'bucket_name' AND auth.role() = 'authenticated');
```

## Debug Checklist

When a feature isn't working:

1. **Check browser console** - Most errors show here
2. **Check database schema** - Verify tables/columns exist
3. **Check RLS policies** - Most common issue
4. **Check constraints** - Ensure values are allowed
5. **Check project membership** - User must be member
6. **Check foreign keys** - Verify relationships exist
7. **Check queries** - Ensure all needed fields are selected
8. **Check storage** - Verify bucket and policies exist

## Useful SQL Queries

### Check if user is project member
```sql
SELECT pm.*, p.name
FROM project_members pm
JOIN projects p ON p.id = pm.project_id
WHERE pm.user_id = (SELECT id FROM auth.users WHERE email = 'balajid@d2.com');
```

### List all RLS policies for a table
```sql
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'table_name';
```

### List all constraints for a table
```sql
SELECT con.conname, con.contype, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'table_name';
```

### List storage buckets
```sql
SELECT id, name, public, file_size_limit FROM storage.buckets;
```

### List columns for a table
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'table_name'
ORDER BY ordinal_position;
```
