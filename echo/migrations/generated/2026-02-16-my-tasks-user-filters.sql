-- My Tasks saved filters (ShotGrid-style filter drawer presets per user)

create table if not exists public.user_task_filters (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  filter_payload jsonb not null default '{}'::jsonb,
  sort_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_task_filters_user_id
  on public.user_task_filters(user_id);

create unique index if not exists uq_user_task_filters_user_name_ci
  on public.user_task_filters(user_id, lower(name));

alter table public.user_task_filters enable row level security;

drop policy if exists user_task_filters_select_own on public.user_task_filters;
create policy user_task_filters_select_own
  on public.user_task_filters
  for select
  using (auth.uid() = user_id);

drop policy if exists user_task_filters_insert_own on public.user_task_filters;
create policy user_task_filters_insert_own
  on public.user_task_filters
  for insert
  with check (auth.uid() = user_id);

drop policy if exists user_task_filters_update_own on public.user_task_filters;
create policy user_task_filters_update_own
  on public.user_task_filters
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists user_task_filters_delete_own on public.user_task_filters;
create policy user_task_filters_delete_own
  on public.user_task_filters
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
    where tgname = 'trg_user_task_filters_set_updated_at'
  ) then
    create trigger trg_user_task_filters_set_updated_at
      before update on public.user_task_filters
      for each row
      execute function public.update_updated_at_column();
  end if;
end $$;
