import type { MyTasksBucket, DateFilterBucket, FilterOption } from '@/lib/fields'

export type MyTasksDateGroupId =
  | 'overdue'
  | 'today'
  | 'this_week'
  | 'later'
  | 'no_end_date'

export interface MyTaskRow extends Record<string, unknown> {
  id: number
  project_id: number | null
  name?: string | null
  entity_type?: string | null
  entity_id?: number | null
  entity_code?: string | null
  entity_name?: string | null
  entity_status?: string | null
  entity_description?: string | null
  entity_thumbnail_url?: string | null
  entity_sequence_label?: string | null
  status?: string | null
  priority?: string | null
  assigned_to?: string | null
  due_date?: string | null
  start_date?: string | null
  end_date?: string | null
  updated_at?: string | null
  project_label: string
  entity_type_display: string
  entity_link_label: string
  entity_link_path: string | null
  department: string | null
  department_label: string
  step_name: string
  assignee_name: string
  my_tasks_bucket: MyTasksBucket
}

export interface MyTasksDateGroup {
  id: MyTasksDateGroupId
  label: string
  tasks: MyTaskRow[]
}

/** Reuse DateFilterBucket from the unified field system */
export type MyTasksDateFilterBucket = DateFilterBucket

export interface MyTasksFilterState {
  status: string[]
  pipeline_step: string[]
  assigned_to: string[]
  link: string[]
  start_date: MyTasksDateFilterBucket[]
  end_date: MyTasksDateFilterBucket[]
  due_date: MyTasksDateFilterBucket[]
}

export type MyTasksFilterKey = keyof MyTasksFilterState

/** Reuse FilterOption from the unified field system */
export type MyTasksFilterOption = FilterOption

export interface MyTasksFilterSection {
  key: MyTasksFilterKey
  label: string
  options: MyTasksFilterOption[]
}

export interface MyTasksSavedFilterRow {
  id: number
  name: string
  is_default: boolean
  filter_payload: Partial<MyTasksFilterState> | null
  sort_payload: Record<string, unknown> | null
}
