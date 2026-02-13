# Apply Pulse Entity Associations Migration

## Option 1: Using Supabase Dashboard (Recommended)

1. Open Supabase Dashboard: http://10.100.222.197:8000
2. Go to SQL Editor
3. Copy the contents of:
   `/dd/ayon/git/kong/echo/migrations&fixes/generated/2026-02-13-pulse-entity-associations.sql`
4. Paste into SQL Editor
5. Click "Run"

## Option 2: Using psql (if available on your machine)

```bash
# From any machine with psql installed:
psql -h 10.100.222.197 -p 5432 -U supabase_admin -d kong \
  -f /dd/ayon/git/kong/echo/migrations&fixes/generated/2026-02-13-pulse-entity-associations.sql
```

## Verification

After running the migration, check that these tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'post_%'
ORDER BY table_name;
```

Expected output:
- post_media
- post_projects
- post_reactions
- post_sequences
- post_shots
- post_tasks
- post_users

## Testing

1. Refresh your Pulse page: http://localhost:3000/pulse
2. You should now see:
   - All existing posts in the global feed
   - Filter bar at the top
   - Tag button in post composer
3. Create a new post with entity tags
4. Filter posts by entities

## Troubleshooting

If you still see "Failed to load posts":
- Check browser console for specific error messages
- Verify migration ran successfully (no errors in SQL output)
- Check RLS policies are enabled: `SELECT * FROM posts LIMIT 1;` (should work)
