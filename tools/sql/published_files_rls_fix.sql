-- published_files RLS fix
-- Run in Supabase SQL Editor against your active database.

alter table public.published_files enable row level security;

drop policy if exists "Users can view published files in their projects" on public.published_files;
drop policy if exists "Users can create published files in their projects" on public.published_files;
drop policy if exists "Users can update published files in their projects" on public.published_files;
drop policy if exists "Users can delete published files in their projects" on public.published_files;

create policy "Users can view published files in their projects"
on public.published_files
for select
to authenticated
using (
  project_id in (
    select pm.project_id
    from public.project_members pm
    where pm.user_id = auth.uid()
  )
);

create policy "Users can create published files in their projects"
on public.published_files
for insert
to authenticated
with check (
  project_id in (
    select pm.project_id
    from public.project_members pm
    where pm.user_id = auth.uid()
  )
  and published_by = auth.uid()
);

create policy "Users can update published files in their projects"
on public.published_files
for update
to authenticated
using (
  project_id in (
    select pm.project_id
    from public.project_members pm
    where pm.user_id = auth.uid()
  )
)
with check (
  project_id in (
    select pm.project_id
    from public.project_members pm
    where pm.user_id = auth.uid()
  )
);

create policy "Users can delete published files in their projects"
on public.published_files
for delete
to authenticated
using (
  project_id in (
    select pm.project_id
    from public.project_members pm
    where pm.user_id = auth.uid()
  )
);
