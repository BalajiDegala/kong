-- ShotGrid-style custom pages foundation.
-- Supports user-owned pages, global/project visibility, and per-user favorites.

create table if not exists public.custom_pages (
  id bigserial primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text null,
  entity_type text not null,
  scope_type text not null check (scope_type in ('global', 'project', 'multi_project')),
  project_id integer null references public.projects(id) on delete cascade,
  project_ids integer[] not null default '{}'::integer[],
  visibility text not null default 'private'
    check (visibility in ('private', 'shared_project', 'shared_global')),
  definition jsonb not null default '{}'::jsonb,
  default_state jsonb not null default '{}'::jsonb,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint custom_pages_project_scope_check check (
    (scope_type <> 'project') or (project_id is not null)
  )
);

create index if not exists idx_custom_pages_owner_id
  on public.custom_pages(owner_id);

create index if not exists idx_custom_pages_project_id
  on public.custom_pages(project_id);

create index if not exists idx_custom_pages_scope_type
  on public.custom_pages(scope_type);

create index if not exists idx_custom_pages_visibility
  on public.custom_pages(visibility);

create index if not exists idx_custom_pages_project_ids_gin
  on public.custom_pages using gin(project_ids);

create index if not exists idx_custom_pages_updated_at
  on public.custom_pages(updated_at desc);

create table if not exists public.custom_page_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  custom_page_id bigint not null references public.custom_pages(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, custom_page_id)
);

create index if not exists idx_custom_page_favorites_user_position
  on public.custom_page_favorites(user_id, position, custom_page_id);

alter table public.custom_pages enable row level security;
alter table public.custom_page_favorites enable row level security;

drop policy if exists custom_pages_select_visible on public.custom_pages;
create policy custom_pages_select_visible
  on public.custom_pages
  for select
  using (
    auth.uid() = owner_id
    or visibility = 'shared_global'
    or (
      visibility = 'shared_project'
      and exists (
        select 1
        from public.project_members pm
        where pm.user_id = auth.uid()
          and (
            (custom_pages.project_id is not null and pm.project_id = custom_pages.project_id)
            or pm.project_id = any(custom_pages.project_ids)
          )
      )
    )
  );

drop policy if exists custom_pages_insert_own on public.custom_pages;
create policy custom_pages_insert_own
  on public.custom_pages
  for insert
  with check (
    auth.uid() = owner_id
    and (
      scope_type <> 'project'
      or (
        project_id is not null
        and exists (
          select 1
          from public.project_members pm
          where pm.user_id = auth.uid()
            and pm.project_id = custom_pages.project_id
        )
      )
    )
    and (
      visibility <> 'shared_project'
      or exists (
        select 1
        from public.project_members pm
        where pm.user_id = auth.uid()
          and (
            (custom_pages.project_id is not null and pm.project_id = custom_pages.project_id)
            or pm.project_id = any(custom_pages.project_ids)
          )
      )
    )
    and (
      visibility <> 'shared_global'
      or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and coalesce(p.role, '') in ('lead', 'alpha', 'admin')
      )
    )
  );

drop policy if exists custom_pages_update_own on public.custom_pages;
create policy custom_pages_update_own
  on public.custom_pages
  for update
  using (auth.uid() = owner_id)
  with check (
    auth.uid() = owner_id
    and (
      scope_type <> 'project'
      or (
        project_id is not null
        and exists (
          select 1
          from public.project_members pm
          where pm.user_id = auth.uid()
            and pm.project_id = custom_pages.project_id
        )
      )
    )
    and (
      visibility <> 'shared_project'
      or exists (
        select 1
        from public.project_members pm
        where pm.user_id = auth.uid()
          and (
            (custom_pages.project_id is not null and pm.project_id = custom_pages.project_id)
            or pm.project_id = any(custom_pages.project_ids)
          )
      )
    )
    and (
      visibility <> 'shared_global'
      or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and coalesce(p.role, '') in ('lead', 'alpha', 'admin')
      )
    )
  );

drop policy if exists custom_pages_delete_own on public.custom_pages;
create policy custom_pages_delete_own
  on public.custom_pages
  for delete
  using (auth.uid() = owner_id);

drop policy if exists custom_page_favorites_select_own on public.custom_page_favorites;
create policy custom_page_favorites_select_own
  on public.custom_page_favorites
  for select
  using (auth.uid() = user_id);

drop policy if exists custom_page_favorites_insert_own on public.custom_page_favorites;
create policy custom_page_favorites_insert_own
  on public.custom_page_favorites
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.custom_pages cp
      where cp.id = custom_page_favorites.custom_page_id
        and (
          cp.owner_id = auth.uid()
          or cp.visibility = 'shared_global'
          or (
            cp.visibility = 'shared_project'
            and exists (
              select 1
              from public.project_members pm
              where pm.user_id = auth.uid()
                and (
                  (cp.project_id is not null and pm.project_id = cp.project_id)
                  or pm.project_id = any(cp.project_ids)
                )
            )
          )
        )
    )
  );

drop policy if exists custom_page_favorites_update_own on public.custom_page_favorites;
create policy custom_page_favorites_update_own
  on public.custom_page_favorites
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists custom_page_favorites_delete_own on public.custom_page_favorites;
create policy custom_page_favorites_delete_own
  on public.custom_page_favorites
  for delete
  using (auth.uid() = user_id);

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'update_updated_at_column'
      and pg_function_is_visible(oid)
  ) and not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_custom_pages_set_updated_at'
  ) then
    create trigger trg_custom_pages_set_updated_at
      before update on public.custom_pages
      for each row
      execute function public.update_updated_at_column();
  end if;

  if exists (
    select 1
    from pg_proc
    where proname = 'update_updated_at_column'
      and pg_function_is_visible(oid)
  ) and not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_custom_page_favorites_set_updated_at'
  ) then
    create trigger trg_custom_page_favorites_set_updated_at
      before update on public.custom_page_favorites
      for each row
      execute function public.update_updated_at_column();
  end if;
end $$;
