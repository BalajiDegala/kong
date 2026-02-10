# Next Session Quick Start

## Read These First
1. **SESSION_SUMMARY_2026-02-10.md** - Latest schema/UI work
2. **TROUBLESHOOTING.md** - Common issues and fixes
3. **MEMORY.md** - Critical patterns and constraints

## Current State (Feb 10, 2026)

### ✅ Fully Working
- ShotGrid-style list tables for Assets/Sequences/Shots/Tasks/Versions
- Inline edit on list tables (no page refresh)
- Detail pages + info tabs for Sequences/Shots/Tasks/Versions
- Asset detail pages + tabs

### ⚠️ Needs Completion
**Detail Tab Tables**
Build the ShotGrid-style tab tables for:
- Sequence: Tasks, Shots, Assets, Notes
- Shot: Tasks, Versions, Publishes, Assets, Notes, History
- Task: Versions, Notes, Publishes
- Version: Activity/Notes (if needed)

**Dialogs**
Extend create/edit dialogs for new custom fields.

### 🚀 Next Major Feature
**Wire up tab tables + inline edit**

## Before You Start

### 1. Verify User Setup
```sql
-- Check user exists in project_members
SELECT pm.*, p.name
FROM project_members pm
JOIN projects p ON p.id = pm.project_id
WHERE pm.user_id = (SELECT id FROM auth.users WHERE email = 'balajid@d2.com');
```

If empty, add user:
```sql
INSERT INTO project_members (project_id, user_id, role)
SELECT id, (SELECT id FROM auth.users WHERE email = 'balajid@d2.com'), 'lead'
FROM projects;
```

### 2. Check Database State
```sql
-- Verify key tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('projects', 'assets', 'shots', 'tasks', 'notes', 'versions', 'attachments')
ORDER BY tablename;

-- Should return 7 tables
```

### 3. Check Storage Buckets
```sql
SELECT id, name, file_size_limit
FROM storage.buckets
WHERE name IN ('versions', 'note-attachments');

-- Should return 2 buckets
```

## Key Commands

### Start Dev Server
```bash
cd /dd/ayon/git/kong/echo
npm run dev
```

### Access Application
- URL: http://localhost:3000
- Login: balajid@d2.com
- Supabase: http://10.100.222.197:8000

### Run SQL Migrations
Use Supabase Dashboard SQL Editor or:
```bash
kubectl port-forward svc/demo-postgresql 5432:5432
psql -h localhost -p 5432 -U postgres -d postgres -f migration_file.sql
```

### Required migrations to run (local Supabase)
1. `echo/migrations&fixes/migration-add-asset-custom-fields.sql`
2. `echo/migrations&fixes/migration-add-sequence-custom-fields.sql`
3. `echo/migrations&fixes/migration-add-shot-custom-fields.sql`
4. `echo/migrations&fixes/migration-add-task-custom-fields.sql`
5. `echo/migrations&fixes/migration-add-version-custom-fields.sql`

## Critical Reminders

### Database Constraints
Always check constraints first!
```sql
SELECT pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'table_name' AND con.contype = 'c';
```

### Role Values
- ✅ Use: 'lead', 'member', 'viewer'
- ❌ Never: 'alpha', 'admin', 'beta'

### Entity Linking
- Primary: asset OR shot (required)
- Optional: task within that entity
- Both notes and versions follow this pattern

### Supabase Clients
- Browser: `createClient()` from client.ts
- Server: `await createClient()` from server.ts
- Never store in globals

## File Locations

### Application Code
```
/dd/ayon/git/kong/echo/src/
├── actions/              # Server actions
│   ├── notes.ts
│   ├── versions.ts
│   ├── attachments.ts
│   └── tasks.ts
├── components/apex/      # Feature components
│   ├── create-note-dialog.tsx
│   ├── upload-version-dialog.tsx
│   ├── version-viewer.tsx
│   └── ...
└── app/(dashboard)/apex/[projectId]/  # Pages
    ├── notes/page.tsx
    ├── versions/page.tsx
    ├── tasks/page.tsx
    └── ...
```

### Documentation
```
/dd/ayon/git/kong/
├── SESSION_SUMMARY_2026-02-06.md  # Latest session
├── TROUBLESHOOTING.md              # Common issues
├── CLAUDE.md                       # Project overview
├── START_HERE.md                   # Project intro
└── UI_ARCHITECTURE_SHOTGRID.md    # UI patterns
```

### Migrations
```
/dd/ayon/git/kong/echo/
├── migration-*.sql          # Various migrations
├── setup-*.sql              # Setup scripts
└── check-*.sql              # Diagnostic queries
```

## Common Issues & Quick Fixes

### "RLS violation"
```sql
-- Add user to project
INSERT INTO project_members (project_id, user_id, role)
VALUES (1, 'user-uuid', 'lead');
```

### "Column doesn't exist"
Check schema, create migration to add column

### "Check constraint violated"
Query constraint, use allowed values only

### "Can't find relationship"
Create foreign key with correct name pattern

## Recommended Next Steps

1. **Build tab tables** to match screenshots (Sequence/Shot/Task/Version tabs)
2. **Add inline edit** inside those tab tables
3. **Extend dialogs** for new custom fields
4. **Optional:** add a drop migration if you want to remove existing `ayon_*` columns from DB

## Questions to Ask User

Before starting, ask:
1. What's the priority - finish attachments display or new feature?
2. Any bugs or issues discovered since last session?
3. Should we start planning Phase 2 annotations?
4. Any specific ShotGrid features to implement next?

## Success Checklist

At end of session:
- ✅ All tests pass
- ✅ No console errors
- ✅ Updated SESSION_SUMMARY
- ✅ Updated MEMORY.md if needed
- ✅ Created migration files
- ✅ Documented any new patterns
