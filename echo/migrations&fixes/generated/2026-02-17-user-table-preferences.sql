-- Shared table preference persistence used by EntityTable.
-- Keeps localStorage fallback but enables cross-session/user persistence.

create table if not exists public.user_table_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null,
  column_order text[] not null default '{}'::text[],
  column_widths jsonb not null default '{}'::jsonb,
  visible_columns text[] not null default '{}'::text[],
  sort jsonb null,
  group_by text null,
  view_mode text null check (view_mode in ('grid', 'list')),
  grid_card_size integer null check (grid_card_size between 120 and 640),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, entity_type)
);

alter table public.user_table_preferences
  add column if not exists sort jsonb null;

alter table public.user_table_preferences
  add column if not exists group_by text null;

alter table public.user_table_preferences
  add column if not exists view_mode text null;

alter table public.user_table_preferences
  add column if not exists grid_card_size integer null;

alter table public.user_table_preferences
  add column if not exists created_at timestamptz not null default now();

alter table public.user_table_preferences
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_user_table_preferences_user_id
  on public.user_table_preferences(user_id);

create unique index if not exists uq_user_table_preferences_user_entity
  on public.user_table_preferences(user_id, entity_type);

alter table public.user_table_preferences enable row level security;

drop policy if exists user_table_preferences_select_own on public.user_table_preferences;
create policy user_table_preferences_select_own
  on public.user_table_preferences
  for select
  using (auth.uid() = user_id);

drop policy if exists user_table_preferences_insert_own on public.user_table_preferences;
create policy user_table_preferences_insert_own
  on public.user_table_preferences
  for insert
  with check (auth.uid() = user_id);

drop policy if exists user_table_preferences_update_own on public.user_table_preferences;
create policy user_table_preferences_update_own
  on public.user_table_preferences
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists user_table_preferences_delete_own on public.user_table_preferences;
create policy user_table_preferences_delete_own
  on public.user_table_preferences
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
    where tgname = 'trg_user_table_preferences_set_updated_at'
  ) then
    create trigger trg_user_table_preferences_set_updated_at
      before update on public.user_table_preferences
      for each row
      execute function public.update_updated_at_column();
  end if;
end $$;
