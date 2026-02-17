# My Tasks ShotGrid-Style Plan

## Goal
Build `/my-tasks` to match the ShotGrid-style workflow shown in reference screenshots:
- Left queue list (date-grouped task cards)
- Right detail workspace (context header + tasks table)
- Filter drawer with saved filters
- Fast inline updates without full page reload

## Locked Decisions
1. `My Tasks` includes only tasks where `assigned_to = current user`.
2. `Active / Upcoming / Done` is status-based (not date-based).

## Current State
1. `/my-tasks` now has a working table implementation with:
   - Assigned-only loading
   - Project scope filter
   - Status bucket tabs
   - Inline edit for key fields
2. Implemented to date:
   - Left queue pane with date-grouped task cards
   - Right context header + tabs strip (`Tasks` active)
   - Split-view selection sync between queue and table
   - Custom top controls: sort, filter drawer, search
   - Filter drawer sections: `Status`, `Pipeline Step`, `Assigned To`, `Link`, `Start Date`, `End Date`, `Due Date`
   - Presets: `Unfinished Tasks`, `Due This Week`, `No End Date`
   - Saved filter CRUD wiring against `public.user_task_filters`
3. Remaining:
   - Optional Gantt strip
   - Optional `+ Task` quick create on `/my-tasks`
   - Optional route-linked context tabs (currently visual tabs)

## Target UX (Phase End State)
1. Top bar: `Sort`, `Filter`, `+ Task`, search.
2. Left pane:
   - Grouped sections: `Overdue`, `Today`, `This Week`, `No End Date`, `Later`.
   - Row card with checkbox/thumb/status dot/task summary.
3. Right pane:
   - Entity context header (shot/asset/sequence/project details).
   - Tab row: `Activity`, `Info`, `Tasks`, `Notes`, `Versions`, `Publishes`, `Assets`, `History`.
   - Tasks table with inline edit and table controls.
4. Filter drawer:
   - Sections: `Status`, `Pipeline Step`, `Assigned To`, `Link`, `Start Date`, `End Date`.
   - Saved filters per user.

## Architecture
### Route
1. Keep route at `echo/src/app/(dashboard)/my-tasks/page.tsx`.
2. Split into feature components under `echo/src/components/my-tasks/`.

### Proposed Components
1. `echo/src/components/my-tasks/my-tasks-page-shell.tsx`
2. `echo/src/components/my-tasks/my-tasks-left-queue.tsx`
3. `echo/src/components/my-tasks/my-tasks-right-context.tsx`
4. `echo/src/components/my-tasks/my-tasks-filter-drawer.tsx`
5. `echo/src/components/my-tasks/my-tasks-saved-filters.tsx`
6. `echo/src/components/my-tasks/my-tasks-types.ts`
7. `echo/src/components/my-tasks/my-tasks-utils.ts`

### Data Helpers
1. `echo/src/lib/tasks/my-tasks-buckets.ts` (already added)
2. Add query helper:
   - `echo/src/lib/supabase/queries.ts`
   - `getMyTasksWithContext(supabase, userId, options)`

## Data Model and Query Plan
1. Base query:
   - `tasks` where `assigned_to = user.id`
   - join `project`, `step`, `department`
2. Related entity hydration:
   - batch lookup by `entity_type/entity_id` for `assets/shots/sequences`
3. Compute client fields:
   - `my_tasks_bucket` from status
   - `left_queue_date_group` from `due_date`
   - `entity_link_path`, `entity_link_label`
4. Sorting default:
   - `due_date asc`, then `updated_at desc`.

## Saved Filters (SQL Plan)
Run in SQL editor after review:

```sql
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

create unique index if not exists uq_user_task_filters_user_name
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
```

## Implementation Phases
## Phase 1: Split View Foundation
1. Refactor `echo/src/app/(dashboard)/my-tasks/page.tsx` into shell + left/right panes.
2. Keep existing table behavior as right pane baseline.
3. Add selected-task state synced between left and right panes.

## Phase 2: Left Queue (ShotGrid-like)
1. Build date-grouped queue list component.
2. Add row meta: status color, task name, link code, due range.
3. Clicking queue row sets selected task and scrolls right table to match.

## Phase 3: Filter Drawer + Saved Filters
1. Add filter drawer UI and sectioned filter groups.
2. Add CRUD for saved filters (`user_task_filters`).
3. Add quick filter presets:
   - `Unfinished Tasks`
   - `Due This Week`
   - `No End Date`

## Phase 4: Context Header + Tabs
1. Add selected entity context card in right pane top.
2. Add tabs row with placeholders first, then wire existing route links.
3. Keep `Tasks` tab active in `/my-tasks`.

## Phase 5: Optional Gantt Strip
1. Add lightweight timeline strip in right table region.
2. Start with read-only bars from `start_date/end_date/due_date`.
3. Keep this optional behind a feature toggle if needed.

## File-by-File Execution Checklist
1. `echo/src/app/(dashboard)/my-tasks/page.tsx`
2. `echo/src/components/my-tasks/my-tasks-page-shell.tsx`
3. `echo/src/components/my-tasks/my-tasks-left-queue.tsx`
4. `echo/src/components/my-tasks/my-tasks-right-context.tsx`
5. `echo/src/components/my-tasks/my-tasks-filter-drawer.tsx`
6. `echo/src/components/my-tasks/my-tasks-saved-filters.tsx`
7. `echo/src/components/my-tasks/my-tasks-types.ts`
8. `echo/src/components/my-tasks/my-tasks-utils.ts`
9. `echo/src/lib/supabase/queries.ts`
10. `echo/src/lib/tasks/my-tasks-buckets.ts` (already present)
11. `echo/src/actions/tasks.ts` (only if additional update fields are needed)

## QA Matrix
1. Assigned-only visibility:
   - tasks assigned to me visible
   - tasks assigned to others hidden
2. Reassignment behavior:
   - if reassigned away from me, row disappears immediately
3. Tab transitions:
   - status update moves row between `Active/Upcoming/Done`
4. Project scope:
   - `All Projects` and single project counts match visible rows
5. Filter drawer:
   - each section filters correctly
   - saved filter create/apply/delete works
6. Inline edit:
   - status, assignee, pipeline step, dates save without full reload
7. Date readability:
   - table shows simplified date/time formatting

## Recommended Delivery Order
1. Phase 1 + 2 together (usable ShotGrid-like core).
2. Phase 3 (filter drawer + saved filters).
3. Phase 4 (context header/tabs).
4. Phase 5 optional.

## Definition of Done
1. `/my-tasks` visually and behaviorally follows the provided ShotGrid references.
2. Assigned-only rule is enforced.
3. Status-based `Active/Upcoming/Done` tabs are stable.
4. Saved filters are persisted per user.
5. Inline editing remains fast and reliable.
