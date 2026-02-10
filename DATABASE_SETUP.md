# Kong Platform Database Setup

This guide explains how to apply the database migrations to your self-hosted Supabase instance.

## Prerequisites

- Self-hosted Supabase running on Kubernetes
- PostgreSQL access (via Supabase SQL Editor or direct psql connection)
- At least one user created via Supabase Auth

## Step 1: Apply Schema Migration

The `kong-schema-migration.sql` file creates all necessary tables, indexes, RLS policies, and triggers.

### Option A: Using Supabase Dashboard (Recommended)

1. Access your Supabase Studio dashboard at `http://10.100.222.197:8000`
2. Navigate to SQL Editor
3. Copy the contents of `kong-schema-migration.sql`
4. Paste into the SQL Editor
5. Click "Run" to execute

### Option B: Using psql Command Line

```bash
# Port-forward the PostgreSQL service (if needed)
kubectl port-forward svc/demo-postgresql 5432:5432

# Apply migration
psql -h localhost -p 5432 -U postgres -d postgres -f kong-schema-migration.sql

# Enter password when prompted (from values.yaml: your-super-secret-and-long-postgres-password)
```

### Verify Schema Creation

After running the migration, verify tables were created:

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('projects', 'assets', 'shots', 'tasks', 'notes', 'versions')
ORDER BY table_name;

-- Should return 6+ tables
```

## Step 2: Apply Seed Data

The `kong-seed-data.sql` file populates pipeline steps and helper functions.

### Apply Seed Data

Using Supabase Dashboard:
1. Open SQL Editor
2. Copy contents of `kong-seed-data.sql`
3. Paste and run

Using psql:
```bash
psql -h localhost -p 5432 -U postgres -d postgres -f kong-seed-data.sql
```

### Verify Seed Data

```sql
-- Check pipeline steps were created
SELECT code, name, entity_type, sort_order
FROM public.steps
ORDER BY sort_order;

-- Should return 13 steps (model, texture, rig, anim, etc.)
```

## Step 3: Create Your First User and Project

### 3.1 Create User Profile

After a user signs up via Supabase Auth, create their profile:

```sql
-- Replace the UUID with the actual auth.users.id
INSERT INTO public.profiles (id, email, display_name, role, active)
VALUES (
  'USER_UUID_FROM_AUTH_USERS',
  'user@company.com',
  'John Doe',
  'alpha', -- 'alpha', 'beta', or 'member'
  true
);
```

### 3.2 Create First Project

```sql
-- Create project
INSERT INTO public.projects (code, name, description, status, color, created_by)
VALUES (
  'DEMO',
  'Demo Project',
  'First project for testing Kong platform',
  'active',
  '#3B82F6',
  'USER_UUID_FROM_AUTH_USERS'
)
RETURNING id;

-- Add user as project lead (replace PROJECT_ID with id from above)
INSERT INTO public.project_members (project_id, user_id, role)
VALUES (
  PROJECT_ID,
  'USER_UUID_FROM_AUTH_USERS',
  'lead'
);
```

### 3.3 Create Test Data (Optional)

```sql
-- Create an asset
INSERT INTO public.assets (project_id, code, name, asset_type, status, created_by)
VALUES (
  PROJECT_ID,
  'CHAR_001',
  'Main Character',
  'character',
  'in_progress',
  'USER_UUID_FROM_AUTH_USERS'
);

-- Create a sequence
INSERT INTO public.sequences (project_id, code, name, status)
VALUES (PROJECT_ID, 'SQ010', 'Opening Sequence', 'active')
RETURNING id;

-- Create a shot (replace SEQUENCE_ID with id from above)
INSERT INTO public.shots (
  project_id,
  sequence_id,
  code,
  name,
  status,
  frame_start,
  frame_end,
  created_by
)
VALUES (
  PROJECT_ID,
  SEQUENCE_ID,
  'SQ010_SH0010',
  'Opening Shot',
  'in_progress',
  1001,
  1120,
  'USER_UUID_FROM_AUTH_USERS'
);
```

## Step 4: Set Up Storage Buckets (Optional but Recommended)

For file uploads (avatars, attachments, versions), create Supabase Storage buckets:

### Create Buckets via SQL

```sql
-- Avatars (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Project media (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-media', 'project-media', false)
ON CONFLICT (id) DO NOTHING;

-- Attachments (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Versions (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('versions', 'versions', false)
ON CONFLICT (id) DO NOTHING;
```

### Or Create via Supabase Dashboard

1. Go to Storage section
2. Click "New Bucket"
3. Create buckets with names: `avatars`, `project-media`, `attachments`, `versions`
4. Set `avatars` as public, others as private

## Troubleshooting

### Error: "relation already exists"

If you see this error, tables already exist. To reset:

```sql
-- WARNING: This deletes ALL data
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Then re-run migrations
```

### Error: "permission denied for schema public"

Grant proper permissions:

```sql
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

### RLS Policies Not Working

Check if RLS is enabled:

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables
```

## Next Steps

After database setup is complete:

1. ✅ Schema created
2. ✅ Seed data loaded
3. ✅ First user profile created
4. ✅ First project created

Now you can:
- Start building the Echo app dashboard UI (Week 2)
- Test creating projects, assets, shots via SQL
- Verify RLS policies work correctly

## Useful Queries

### Check User's Projects

```sql
SELECT p.*
FROM public.projects p
JOIN public.project_members pm ON pm.project_id = p.id
WHERE pm.user_id = 'USER_UUID';
```

### Check Activity Feed

```sql
SELECT
  ae.*,
  pr.display_name as actor_name
FROM public.activity_events ae
JOIN public.profiles pr ON pr.id = ae.actor_id
WHERE ae.project_id = PROJECT_ID
ORDER BY ae.created_at DESC
LIMIT 20;
```

### Check Pipeline Steps

```sql
SELECT * FROM public.steps ORDER BY sort_order;
```

## Schema Summary

**Total Tables Created:** 20

### Core Tables
- `profiles` - User profiles
- `projects` - Projects
- `project_members` - Project membership

### Apex (Projects)
- `sequences` - Shot sequences
- `assets` - Assets (characters, props, etc.)
- `shots` - Shots in sequences
- `steps` - Pipeline steps
- `tasks` - Tasks for assets/shots
- `task_assignments` - Task assignees
- `task_dependencies` - Task dependencies

### Echo (Chat)
- `notes` - Comments and messages
- `note_mentions` - @ mentions
- `attachments` - File attachments

### Pulse (Reviews)
- `versions` - Version uploads
- `playlists` - Review playlists
- `playlist_items` - Versions in playlists
- `playlist_shares` - External sharing links
- `activity_events` - Activity feed

All tables include:
- ✅ Row Level Security (RLS) policies
- ✅ Indexes for performance
- ✅ Foreign key constraints
- ✅ Automatic timestamp updates
