'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { listStatusNames } from '@/lib/status/options'
import { updateTask } from '@/actions/tasks'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import { ActivityFeed } from '@/components/apex/activity-feed'
import { EntityNotesPanel } from '@/components/apex/entity-notes-panel'
import { EntityTasksPanel } from '@/components/apex/entity-tasks-panel'
import { HistoryTable } from '@/components/apex/history-table'
import { EntityTable } from '@/components/table/entity-table'
import type { TableColumn } from '@/components/table/types'
import { getMyTasksBucket } from '@/lib/tasks/my-tasks-buckets'
import { getEntityActivity, getEntityHistory } from '@/lib/supabase/queries'
import { MyTasksFilterDrawer } from '@/components/my-tasks/my-tasks-filter-drawer'
import { MyTasksLeftQueue } from '@/components/my-tasks/my-tasks-left-queue'
import { MyTasksRightContext } from '@/components/my-tasks/my-tasks-right-context'
import type {
  MyTaskRow,
  MyTasksDateFilterBucket,
  MyTasksFilterKey,
  MyTasksFilterOption,
  MyTasksFilterSection,
  MyTasksFilterState,
  MyTasksSavedFilterRow,
} from '@/components/my-tasks/my-tasks-types'
import { Check, ChevronDown, Filter, ListTodo, Search } from 'lucide-react'

type RowRecord = Record<string, unknown>

type TaskUser = {
  id: string
  display_name?: string | null
  full_name?: string | null
  email?: string | null
}

type DepartmentOption = {
  id: number
  name: string
  code?: string | null
}

type ActivityEventRow = {
  id: number
  event_type: string
  entity_type: string
  entity_id: number
  attribute_name?: string | null
  old_value?: unknown
  new_value?: unknown
  description?: string | null
  session_id?: string | null
  created_at: string
  actor?: {
    id: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

type HistoryEventRow = {
  id: number
  attribute_name: string | null
  old_value: unknown
  new_value: unknown
  description?: string | null
  created_at: string
  actor?: {
    id: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

type RelatedEntity = {
  name: string
  code: string
  status?: string | null
  description?: string | null
  thumbnail_url?: string | null
  sequence_label?: string | null
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

type MyTasksSortField =
  | 'due_date'
  | 'start_date'
  | 'status'
  | 'project_label'
  | 'name'
  | 'updated_at'

type MyTasksSortDirection = 'asc' | 'desc'

type MyTasksDetailTab =
  | 'activity'
  | 'info'
  | 'tasks'
  | 'notes'
  | 'versions'
  | 'publishes'
  | 'assets'
  | 'history'

type MyTasksSavedSortPayload = {
  sort_field?: unknown
  sort_direction?: unknown
  search_query?: unknown
  active_preset_id?: unknown
}

const SORT_FIELD_OPTIONS: Array<{ value: MyTasksSortField; label: string }> = [
  { value: 'due_date', label: 'End Date' },
  { value: 'start_date', label: 'Start Date' },
  { value: 'status', label: 'Status' },
  { value: 'project_label', label: 'Project' },
  { value: 'name', label: 'Task Name' },
  { value: 'updated_at', label: 'Date Updated' },
]

const DETAIL_TABS: Array<{ id: MyTasksDetailTab; label: string }> = [
  { id: 'activity', label: 'Activity' },
  { id: 'info', label: 'Info' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'notes', label: 'Notes' },
  { id: 'versions', label: 'Versions' },
  { id: 'publishes', label: 'Publishes' },
  { id: 'assets', label: 'Assets' },
  { id: 'history', label: 'History' },
]

const DATE_FILTER_OPTIONS: Array<{ value: MyTasksDateFilterBucket; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'future', label: 'Future' },
  { value: 'older', label: 'Older' },
  { value: 'no_date', label: 'No Date' },
]

const PRESET_FILTERS = [
  { id: 'unfinished_tasks', label: 'Unfinished Tasks' },
  { id: 'due_this_week', label: 'Due This Week' },
  { id: 'no_end_date', label: 'No End Date' },
]

const EMPTY_FILTER_STATE: MyTasksFilterState = {
  status: [],
  pipeline_step: [],
  assigned_to: [],
  link: [],
  start_date: [],
  end_date: [],
  due_date: [],
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function asRecord(value: unknown): RowRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as RowRecord
}

function toIdKey(value: unknown): string {
  return asText(value).trim()
}

function toNumericId(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

function titleCase(value: string): string {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return ''
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

function compareByDueDateThenUpdated(a: MyTaskRow, b: MyTaskRow): number {
  const aDue = Date.parse(asText(a.due_date))
  const bDue = Date.parse(asText(b.due_date))

  if (!Number.isNaN(aDue) && !Number.isNaN(bDue) && aDue !== bDue) {
    return aDue - bDue
  }
  if (!Number.isNaN(aDue) && Number.isNaN(bDue)) return -1
  if (Number.isNaN(aDue) && !Number.isNaN(bDue)) return 1

  const aUpdated = Date.parse(asText(a.updated_at))
  const bUpdated = Date.parse(asText(b.updated_at))
  if (!Number.isNaN(aUpdated) && !Number.isNaN(bUpdated) && aUpdated !== bUpdated) {
    return bUpdated - aUpdated
  }

  return asText(a.name).localeCompare(asText(b.name))
}

function cloneFilterState(state: MyTasksFilterState): MyTasksFilterState {
  return {
    status: [...state.status],
    pipeline_step: [...state.pipeline_step],
    assigned_to: [...state.assigned_to],
    link: [...state.link],
    start_date: [...state.start_date],
    end_date: [...state.end_date],
    due_date: [...state.due_date],
  }
}

function isSortField(value: string): value is MyTasksSortField {
  return SORT_FIELD_OPTIONS.some((option) => option.value === value)
}

function isSortDirection(value: string): value is MyTasksSortDirection {
  return value === 'asc' || value === 'desc'
}

function isMissingUserTaskFiltersTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const record = error as { code?: unknown; message?: unknown; details?: unknown }
  const code = String(record.code || '').toUpperCase()
  const message = String(record.message || '').toLowerCase()
  const details = String(record.details || '').toLowerCase()
  return (
    code === 'PGRST205' ||
    message.includes('user_task_filters') ||
    details.includes('user_task_filters') ||
    message.includes('does not exist')
  )
}

function normalizeDateFilterValues(value: unknown): MyTasksDateFilterBucket[] {
  if (!Array.isArray(value)) return []
  const next: MyTasksDateFilterBucket[] = []
  for (const raw of value) {
    const normalized = asText(raw).trim().toLowerCase()
    if (!normalized) continue
    if (!DATE_FILTER_OPTIONS.some((option) => option.value === normalized)) continue
    if (!next.includes(normalized as MyTasksDateFilterBucket)) {
      next.push(normalized as MyTasksDateFilterBucket)
    }
  }
  return next
}

function normalizeFilterState(value: unknown): MyTasksFilterState {
  const record = asRecord(value)
  if (!record) return cloneFilterState(EMPTY_FILTER_STATE)

  const textList = (raw: unknown) =>
    Array.isArray(raw)
      ? Array.from(
          new Set(
            raw
              .map((item) => asText(item).trim())
              .filter((item) => item.length > 0)
          )
        )
      : []

  return {
    status: textList(record.status),
    pipeline_step: textList(record.pipeline_step),
    assigned_to: textList(record.assigned_to),
    link: textList(record.link),
    start_date: normalizeDateFilterValues(record.start_date),
    end_date: normalizeDateFilterValues(record.end_date),
    due_date: normalizeDateFilterValues(record.due_date),
  }
}

function countActiveFilters(state: MyTasksFilterState): number {
  return (
    state.status.length +
    state.pipeline_step.length +
    state.assigned_to.length +
    state.link.length +
    state.start_date.length +
    state.end_date.length +
    state.due_date.length
  )
}

function toggleFilterValue(
  state: MyTasksFilterState,
  key: MyTasksFilterKey,
  value: string
): MyTasksFilterState {
  const current = state[key]
  const exists = current.includes(value as never)
  const nextValues = exists
    ? current.filter((item) => item !== (value as never))
    : [...current, value as never]

  return {
    ...state,
    [key]: nextValues,
  }
}

function toDateOnly(value: unknown): Date | null {
  const raw = asText(value).trim()
  if (!raw) return null

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

function toDayNumber(date: Date): number {
  return Math.floor(date.getTime() / (24 * 60 * 60 * 1000))
}

function toDateFilterBucket(value: unknown, nowDate: Date = new Date()): MyTasksDateFilterBucket {
  const parsed = toDateOnly(value)
  if (!parsed) return 'no_date'

  const today = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate())
  const dayDiff = toDayNumber(parsed) - toDayNumber(today)

  if (dayDiff === 0) return 'today'
  if (dayDiff === -1) return 'yesterday'
  if (dayDiff === 1) return 'tomorrow'

  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const nextWeekStart = new Date(weekStart)
  nextWeekStart.setDate(weekStart.getDate() + 7)
  const prevWeekStart = new Date(weekStart)
  prevWeekStart.setDate(weekStart.getDate() - 7)

  if (parsed >= weekStart && parsed < nextWeekStart) return 'this_week'
  if (parsed >= prevWeekStart && parsed < weekStart) return 'last_week'
  if (parsed >= nextWeekStart) return 'future'
  return 'older'
}

function matchesDateFilter(
  value: unknown,
  selectedBuckets: MyTasksDateFilterBucket[]
): boolean {
  if (selectedBuckets.length === 0) return true
  const bucket = toDateFilterBucket(value)
  return selectedBuckets.includes(bucket)
}

function stringMatchesFilter(raw: unknown, selectedValues: string[]): boolean {
  if (selectedValues.length === 0) return true
  const normalized = asText(raw).trim()
  return selectedValues.includes(normalized)
}

function taskMatchesFilterState(task: MyTaskRow, filters: MyTasksFilterState): boolean {
  if (!stringMatchesFilter(task.status, filters.status)) return false
  if (!stringMatchesFilter(task.department_label, filters.pipeline_step)) return false
  if (!stringMatchesFilter(task.assignee_name, filters.assigned_to)) return false
  if (!stringMatchesFilter(task.entity_link_label, filters.link)) return false
  if (!matchesDateFilter(task.start_date, filters.start_date)) return false
  if (!matchesDateFilter(task.end_date, filters.end_date)) return false
  if (!matchesDateFilter(task.due_date, filters.due_date)) return false
  return true
}

function taskMatchesSearch(task: MyTaskRow, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true

  const values = [
    task.name,
    task.project_label,
    task.entity_link_label,
    task.status,
    task.department_label,
    task.assignee_name,
  ]

  return values.some((value) => asText(value).toLowerCase().includes(normalized))
}

function compareTextValue(a: unknown, b: unknown): number {
  return asText(a).localeCompare(asText(b))
}

function compareDateValue(a: unknown, b: unknown): number {
  const aTime = Date.parse(asText(a))
  const bTime = Date.parse(asText(b))
  if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) return aTime - bTime
  if (!Number.isNaN(aTime) && Number.isNaN(bTime)) return -1
  if (Number.isNaN(aTime) && !Number.isNaN(bTime)) return 1
  return 0
}

function sortTaskRows(
  rows: MyTaskRow[],
  field: MyTasksSortField,
  direction: MyTasksSortDirection
): MyTaskRow[] {
  const factor = direction === 'asc' ? 1 : -1
  const next = [...rows]

  return next.sort((a, b) => {
    let compared = 0

    if (field === 'due_date') {
      compared = compareDateValue(a.due_date, b.due_date)
    } else if (field === 'start_date') {
      compared = compareDateValue(a.start_date, b.start_date)
    } else if (field === 'updated_at') {
      compared = compareDateValue(a.updated_at, b.updated_at)
    } else if (field === 'status') {
      compared = compareTextValue(a.status, b.status)
    } else if (field === 'project_label') {
      compared = compareTextValue(a.project_label, b.project_label)
    } else {
      compared = compareTextValue(a.name, b.name)
    }

    if (compared !== 0) return compared * factor
    return compareByDueDateThenUpdated(a, b)
  })
}

function buildTextFilterOptions(
  rows: MyTaskRow[],
  readValue: (task: MyTaskRow) => string
): MyTasksFilterOption[] {
  const byValue = new Map<string, number>()
  for (const row of rows) {
    const value = readValue(row).trim()
    if (!value) continue
    byValue.set(value, (byValue.get(value) || 0) + 1)
  }

  return Array.from(byValue.entries())
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

function buildDateFilterOptions(
  rows: MyTaskRow[],
  readValue: (task: MyTaskRow) => unknown
): MyTasksFilterOption[] {
  const byBucket = new Map<MyTasksDateFilterBucket, number>()
  for (const option of DATE_FILTER_OPTIONS) {
    byBucket.set(option.value, 0)
  }

  for (const row of rows) {
    const bucket = toDateFilterBucket(readValue(row))
    byBucket.set(bucket, (byBucket.get(bucket) || 0) + 1)
  }

  const options: MyTasksFilterOption[] = []
  for (const option of DATE_FILTER_OPTIONS) {
    const count = byBucket.get(option.value) || 0
    if (count === 0) continue
    options.push({
      value: option.value,
      label: option.label,
      count,
    })
  }
  return options
}

function resolveEntityPath(
  projectId: number | null,
  entityType: string,
  entityId: string
): string | null {
  if (!projectId || !entityId) return null

  if (entityType === 'asset') return `/apex/${projectId}/assets/${entityId}`
  if (entityType === 'shot') return `/apex/${projectId}/shots/${entityId}`
  if (entityType === 'sequence') return `/apex/${projectId}/sequences/${entityId}`
  if (entityType === 'project') return `/apex/${projectId}`

  return null
}

function userDisplayName(user: TaskUser): string {
  return (
    asText(user.display_name).trim() ||
    asText(user.full_name).trim() ||
    asText(user.email).trim() ||
    user.id
  )
}

function sameEntity(a: MyTaskRow, b: MyTaskRow): boolean {
  return (
    toIdKey(a.project_id) === toIdKey(b.project_id) &&
    asText(a.entity_type).trim() === asText(b.entity_type).trim() &&
    toIdKey(a.entity_id) === toIdKey(b.entity_id)
  )
}

export default function MyTasksPage() {
  const [currentUserId, setCurrentUserId] = useState('')
  const [tasks, setTasks] = useState<MyTaskRow[]>([])
  const [users, setUsers] = useState<TaskUser[]>([])
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [statusNames, setStatusNames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cellError, setCellError] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [sortField, setSortField] = useState<MyTasksSortField>('due_date')
  const [sortDirection, setSortDirection] = useState<MyTasksSortDirection>('asc')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterState, setFilterState] = useState<MyTasksFilterState>(
    cloneFilterState(EMPTY_FILTER_STATE)
  )
  const [savedFilters, setSavedFilters] = useState<MyTasksSavedFilterRow[]>([])
  const [savedFiltersAvailable, setSavedFiltersAvailable] = useState(true)
  const [activeSavedFilterId, setActiveSavedFilterId] = useState<number | null>(null)
  const [activePresetId, setActivePresetId] = useState<string | null>(null)
  const [savedFiltersError, setSavedFiltersError] = useState<string | null>(null)
  const [activeDetailTab, setActiveDetailTab] = useState<MyTasksDetailTab>('tasks')
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [activityRows, setActivityRows] = useState<ActivityEventRow[]>([])
  const [historyRows, setHistoryRows] = useState<HistoryEventRow[]>([])
  const [versionRows, setVersionRows] = useState<RowRecord[]>([])
  const [publishRows, setPublishRows] = useState<RowRecord[]>([])
  const [assetRows, setAssetRows] = useState<RowRecord[]>([])
  const detailCacheRef = useRef<Record<string, unknown[]>>({})

  const loadMyTasks = useCallback(async () => {
    try {
      setIsLoading(true)
      setCellError(null)

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.id) {
        setCurrentUserId('')
        setTasks([])
        setUsers([])
        setDepartments([])
        setStatusNames([])
        setSelectedTaskId(null)
        setSavedFilters([])
        setSavedFiltersAvailable(true)
        setActiveSavedFilterId(null)
        setActivePresetId(null)
        setSavedFiltersError(null)
        return
      }

      setCurrentUserId(user.id)

      const [tasksResult, usersResult, departmentsResult, nextStatusNames] =
        await Promise.all([
          supabase
            .from('tasks')
            .select(
              '*, step:steps(name, code, department_id, department:departments(id, name, code)), project:projects(id, code, name)'
            )
            .eq('assigned_to', user.id),
          supabase
            .from('profiles')
            .select('id, display_name, full_name, email')
            .order('display_name'),
          supabase.from('departments').select('id, name, code').order('name'),
          listStatusNames('task'),
        ])

      if (tasksResult.error) throw tasksResult.error
      if (usersResult.error) throw usersResult.error
      if (departmentsResult.error) throw departmentsResult.error

      const taskRows = (tasksResult.data || []) as RowRecord[]
      const userRows = (usersResult.data || []) as TaskUser[]
      const departmentRows = (departmentsResult.data || []) as DepartmentOption[]

      const assigneeNameById = new Map<string, string>()
      for (const taskUser of userRows) {
        const key = toIdKey(taskUser.id)
        if (!key) continue
        assigneeNameById.set(key, userDisplayName(taskUser))
      }

      const assetIds: number[] = []
      const shotIds: number[] = []
      const sequenceIds: number[] = []
      for (const task of taskRows) {
        const entityType = asText(task.entity_type).trim().toLowerCase()
        const entityId = toNumericId(task.entity_id)
        if (!entityId) continue
        if (entityType === 'asset') assetIds.push(entityId)
        if (entityType === 'shot') shotIds.push(entityId)
        if (entityType === 'sequence') sequenceIds.push(entityId)
      }

      const uniqueAssetIds = Array.from(new Set(assetIds))
      const uniqueShotIds = Array.from(new Set(shotIds))
      const uniqueSequenceIds = Array.from(new Set(sequenceIds))

      const [assetsResult, shotsResult, sequencesResult] = await Promise.all([
        uniqueAssetIds.length > 0
          ? supabase
              .from('assets')
              .select(
                'id, name, code, status, description, thumbnail_url, sequence:sequences(code, name), shot:shots(code, name)'
              )
              .in('id', uniqueAssetIds)
          : Promise.resolve({ data: [], error: null }),
        uniqueShotIds.length > 0
          ? supabase
              .from('shots')
              .select('id, name, code, status, description, thumbnail_url, sequence:sequences(code, name)')
              .in('id', uniqueShotIds)
          : Promise.resolve({ data: [], error: null }),
        uniqueSequenceIds.length > 0
          ? supabase
              .from('sequences')
              .select('id, name, code, status, description, thumbnail_url')
              .in('id', uniqueSequenceIds)
          : Promise.resolve({ data: [], error: null }),
      ])

      if (assetsResult.error) throw assetsResult.error
      if (shotsResult.error) throw shotsResult.error
      if (sequencesResult.error) throw sequencesResult.error

      const assetsById = new Map<string, RelatedEntity>()
      const shotsById = new Map<string, RelatedEntity>()
      const sequencesById = new Map<string, RelatedEntity>()

      for (const asset of (assetsResult.data || []) as RowRecord[]) {
        const key = toIdKey(asset.id)
        if (!key) continue
        const sequence = asRecord(asset.sequence)
        const shot = asRecord(asset.shot)
        const sequenceLabel = [
          asText(sequence?.code).trim(),
          asText(sequence?.name).trim(),
        ]
          .filter(Boolean)
          .join(' - ')
        const shotLabel = [
          asText(shot?.code).trim(),
          asText(shot?.name).trim(),
        ]
          .filter(Boolean)
          .join(' - ')

        assetsById.set(key, {
          name: asText(asset.name).trim(),
          code: asText(asset.code).trim(),
          status: asText(asset.status).trim() || null,
          description: asText(asset.description).trim() || null,
          thumbnail_url: asText(asset.thumbnail_url).trim() || null,
          sequence_label: sequenceLabel || shotLabel || null,
        })
      }

      for (const shot of (shotsResult.data || []) as RowRecord[]) {
        const key = toIdKey(shot.id)
        if (!key) continue
        const sequence = asRecord(shot.sequence)
        const sequenceLabel = [
          asText(sequence?.code).trim(),
          asText(sequence?.name).trim(),
        ]
          .filter(Boolean)
          .join(' - ')

        shotsById.set(key, {
          name: asText(shot.name).trim(),
          code: asText(shot.code).trim(),
          status: asText(shot.status).trim() || null,
          description: asText(shot.description).trim() || null,
          thumbnail_url: asText(shot.thumbnail_url).trim() || null,
          sequence_label: sequenceLabel || null,
        })
      }

      for (const sequence of (sequencesResult.data || []) as RowRecord[]) {
        const key = toIdKey(sequence.id)
        if (!key) continue
        sequencesById.set(key, {
          name: asText(sequence.name).trim(),
          code: asText(sequence.code).trim(),
          status: asText(sequence.status).trim() || null,
          description: asText(sequence.description).trim() || null,
          thumbnail_url: asText(sequence.thumbnail_url).trim() || null,
        })
      }

      const normalizedTasks: MyTaskRow[] = taskRows.map((task) => {
        const project = asRecord(task.project)
        const step = asRecord(task.step)
        const stepDepartment = asRecord(step?.department)
        const projectId = toNumericId(task.project_id)
        const entityType = asText(task.entity_type).trim().toLowerCase()
        const entityIdKey = toIdKey(task.entity_id)

        const projectCode = asText(project?.code).trim()
        const projectName = asText(project?.name).trim()
        const projectLabel =
          projectCode || projectName || asText(task.project_id).trim() || '-'

        const directDepartment = asText(task.department).trim()
        const stepDepartmentId = asText(step?.department_id).trim()
        const department = directDepartment || stepDepartmentId || null
        const departmentLabel =
          asText(stepDepartment?.code).trim() ||
          asText(stepDepartment?.name).trim() ||
          department ||
          'No Department'

        let entityName = ''
        let entityCode = ''
        let entityStatus: string | null = null
        let entityDescription: string | null = null
        let entityThumbnailUrl: string | null = null
        let entitySequenceLabel: string | null = null
        if (entityType === 'asset') {
          const entity = assetsById.get(entityIdKey)
          entityName = entity?.name || 'Unknown Asset'
          entityCode = entity?.code || ''
          entityStatus = entity?.status || null
          entityDescription = entity?.description || null
          entityThumbnailUrl = entity?.thumbnail_url || null
          entitySequenceLabel = entity?.sequence_label || null
        } else if (entityType === 'shot') {
          const entity = shotsById.get(entityIdKey)
          entityName = entity?.name || 'Unknown Shot'
          entityCode = entity?.code || ''
          entityStatus = entity?.status || null
          entityDescription = entity?.description || null
          entityThumbnailUrl = entity?.thumbnail_url || null
          entitySequenceLabel = entity?.sequence_label || null
        } else if (entityType === 'sequence') {
          const entity = sequencesById.get(entityIdKey)
          entityName = entity?.name || 'Unknown Sequence'
          entityCode = entity?.code || ''
          entityStatus = entity?.status || null
          entityDescription = entity?.description || null
          entityThumbnailUrl = entity?.thumbnail_url || null
        } else if (entityType === 'project') {
          entityName = projectName || 'Project'
          entityCode = projectCode
        }

        const entityLinkLabel =
          `${entityCode ? `${entityCode} - ` : ''}${entityName || '-'}`.trim()

        const assignedTo = asText(task.assigned_to).trim()
        const assigneeName = assignedTo
          ? assigneeNameById.get(assignedTo) || assignedTo
          : 'Unassigned'

        return {
          ...task,
          id: Number(task.id),
          project_id: projectId,
          entity_type: entityType || null,
          entity_id: toNumericId(task.entity_id),
          entity_code: entityCode || null,
          entity_name: entityName || null,
          entity_status: entityStatus,
          entity_description: entityDescription,
          entity_thumbnail_url: entityThumbnailUrl,
          entity_sequence_label: entitySequenceLabel,
          project_label: projectLabel,
          entity_type_display: titleCase(entityType || 'unknown'),
          entity_link_label: entityLinkLabel || '-',
          entity_link_path: resolveEntityPath(projectId, entityType, entityIdKey),
          department,
          department_label: departmentLabel,
          step_name: asText(step?.name).trim() || 'No Step',
          assignee_name: assigneeName,
          my_tasks_bucket: getMyTasksBucket(task.status),
        }
      })

      setTasks(normalizedTasks)
      setUsers(userRows)
      setDepartments(departmentRows)
      setStatusNames(nextStatusNames)
      setSortField('due_date')
      setSortDirection('asc')
      setSearchQuery('')
      setFilterState(cloneFilterState(EMPTY_FILTER_STATE))
      setActiveSavedFilterId(null)
      setActivePresetId(null)
      setSavedFiltersError(null)
      setActiveDetailTab('tasks')
      detailCacheRef.current = {}
    } catch (error) {
      console.error('Error loading My Tasks:', error)
      setTasks([])
      setUsers([])
      setDepartments([])
      setStatusNames([])
      setSelectedTaskId(null)
      setSavedFilters([])
      setActiveDetailTab('tasks')
      detailCacheRef.current = {}
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMyTasks()
  }, [loadMyTasks])

  const loadSavedFilters = useCallback(async (userId: string) => {
    if (!userId) {
      setSavedFilters([])
      setSavedFiltersAvailable(true)
      return
    }

    const supabase = createClient()
    const result = await supabase
      .from('user_task_filters')
      .select('id, name, is_default, filter_payload, sort_payload')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })

    if (result.error) {
      if (isMissingUserTaskFiltersTable(result.error)) {
        setSavedFiltersAvailable(false)
        setSavedFilters([])
        setSavedFiltersError(null)
        return
      }

      console.error('Failed to load saved my task filters:', result.error)
      setSavedFiltersAvailable(true)
      setSavedFilters([])
      setSavedFiltersError('Unable to load saved filters.')
      return
    }

    const rows = ((result.data || []) as RowRecord[]).map((row) => ({
      id: Number(row.id),
      name: asText(row.name).trim() || `Filter ${asText(row.id).trim()}`,
      is_default: Boolean(row.is_default),
      filter_payload: normalizeFilterState(row.filter_payload),
      sort_payload: asRecord(row.sort_payload) || null,
    }))

    setSavedFiltersAvailable(true)
    setSavedFilters(rows)
    setSavedFiltersError(null)
  }, [])

  useEffect(() => {
    if (!currentUserId) {
      setSavedFilters([])
      setSavedFiltersAvailable(true)
      return
    }
    void loadSavedFilters(currentUserId)
  }, [currentUserId, loadSavedFilters])

  const assigneeNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const user of users) {
      const key = toIdKey(user.id)
      if (!key) continue
      map.set(key, userDisplayName(user))
    }
    return map
  }, [users])

  const departmentLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const department of departments) {
      const key = toIdKey(department.id)
      if (!key) continue
      const label =
        asText(department.code).trim() ||
        asText(department.name).trim() ||
        key
      map.set(key, label)
    }
    return map
  }, [departments])

  const statusOptions = useMemo(() => {
    const values = new Set<string>()
    for (const name of statusNames) {
      const normalized = name.trim()
      if (normalized) values.add(normalized)
    }
    for (const task of tasks) {
      const normalized = asText(task.status).trim()
      if (normalized) values.add(normalized)
    }
    return Array.from(values).map((value) => ({ value, label: value }))
  }, [statusNames, tasks])

  const departmentOptions = useMemo(
    () =>
      departments.map((department) => ({
        value: toIdKey(department.id),
        label:
          asText(department.code).trim() ||
          asText(department.name).trim() ||
          toIdKey(department.id),
      })),
    [departments]
  )

  const assigneeOptions = useMemo(
    () => [
      { value: '', label: 'Unassigned' },
      ...users.map((user) => ({
        value: user.id,
        label: userDisplayName(user),
      })),
    ],
    [users]
  )

  const filterSections = useMemo<MyTasksFilterSection[]>(() => {
    const statusCounts = new Map<string, number>()
    for (const row of tasks) {
      const value = asText(row.status).trim()
      if (!value) continue
      statusCounts.set(value, (statusCounts.get(value) || 0) + 1)
    }

    const statusOptions: MyTasksFilterOption[] = Array.from(statusCounts.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label))

    for (const status of statusNames) {
      const normalized = status.trim()
      if (!normalized) continue
      if (statusOptions.some((option) => option.value === normalized)) continue
      statusOptions.push({
        value: normalized,
        label: normalized,
        count: 0,
      })
    }

    statusOptions.sort((a, b) => a.label.localeCompare(b.label))

    return [
      {
        key: 'status',
        label: 'Status',
        options: statusOptions.filter((option) => option.count > 0),
      },
      {
        key: 'pipeline_step',
        label: 'Pipeline Step',
        options: buildTextFilterOptions(tasks, (task) => asText(task.department_label)),
      },
      {
        key: 'assigned_to',
        label: 'Assigned To',
        options: buildTextFilterOptions(tasks, (task) => asText(task.assignee_name)),
      },
      {
        key: 'link',
        label: 'Link',
        options: buildTextFilterOptions(tasks, (task) => asText(task.entity_link_label)),
      },
      {
        key: 'start_date',
        label: 'Start Date',
        options: buildDateFilterOptions(tasks, (task) => task.start_date),
      },
      {
        key: 'end_date',
        label: 'End Date',
        options: buildDateFilterOptions(tasks, (task) => task.end_date),
      },
      {
        key: 'due_date',
        label: 'Due Date',
        options: buildDateFilterOptions(tasks, (task) => task.due_date),
      },
    ]
  }, [statusNames, tasks])

  const filterCount = useMemo(() => countActiveFilters(filterState), [filterState])

  const visibleTasks = useMemo(() => {
    const filtered = tasks
      .filter((task) => taskMatchesFilterState(task, filterState))
      .filter((task) => taskMatchesSearch(task, searchQuery))

    return sortTaskRows(filtered, sortField, sortDirection)
  }, [filterState, searchQuery, sortField, sortDirection, tasks])

  useEffect(() => {
    if (visibleTasks.length === 0) {
      setSelectedTaskId(null)
      return
    }

    if (!selectedTaskId) {
      setSelectedTaskId(visibleTasks[0].id)
      return
    }

    const exists = visibleTasks.some((task) => task.id === selectedTaskId)
    if (!exists) {
      setSelectedTaskId(visibleTasks[0].id)
    }
  }, [selectedTaskId, visibleTasks])

  const selectedTask = useMemo(
    () => visibleTasks.find((task) => task.id === selectedTaskId) || null,
    [selectedTaskId, visibleTasks]
  )

  const rightPaneTasks = useMemo(() => {
    if (!selectedTask) return visibleTasks
    const rows = visibleTasks.filter((task) => sameEntity(task, selectedTask))
    if (rows.length > 0) return rows
    return [selectedTask]
  }, [selectedTask, visibleTasks])

  const selectedEntityType = useMemo(
    () => asText(selectedTask?.entity_type).trim().toLowerCase(),
    [selectedTask]
  )
  const selectedEntityId = useMemo(
    () => asText(selectedTask?.entity_id).trim(),
    [selectedTask]
  )
  const selectedEntityProjectId = useMemo(
    () => asText(selectedTask?.project_id).trim(),
    [selectedTask]
  )

  useEffect(() => {
    setDetailError(null)
    if (!selectedTask || activeDetailTab === 'tasks' || activeDetailTab === 'notes' || activeDetailTab === 'info') {
      return
    }

    const cacheKey = `${activeDetailTab}:${selectedEntityType}:${selectedEntityId}:${selectedEntityProjectId}`
    if (detailCacheRef.current[cacheKey]) {
      const cached = detailCacheRef.current[cacheKey]
      if (activeDetailTab === 'activity') setActivityRows(cached as ActivityEventRow[])
      if (activeDetailTab === 'history') setHistoryRows(cached as HistoryEventRow[])
      if (activeDetailTab === 'versions') setVersionRows(cached as RowRecord[])
      if (activeDetailTab === 'publishes') setPublishRows(cached as RowRecord[])
      if (activeDetailTab === 'assets') setAssetRows(cached as RowRecord[])
      return
    }

    let active = true

    async function loadDetailTab() {
      if (!selectedEntityType || !selectedEntityId) return

      try {
        setDetailLoading(true)
        setDetailError(null)
        const supabase = createClient()
        const numericEntityId = Number(selectedEntityId)
        const entityIdValue = Number.isNaN(numericEntityId) ? selectedEntityId : numericEntityId
        const numericProjectId = Number(selectedEntityProjectId)
        const projectIdValue = Number.isNaN(numericProjectId)
          ? selectedEntityProjectId
          : numericProjectId

        if (activeDetailTab === 'activity') {
          const events = (await getEntityActivity(
            supabase,
            selectedEntityType,
            selectedEntityId
          )) as ActivityEventRow[]
          if (!active) return
          setActivityRows(events || [])
          detailCacheRef.current[cacheKey] = events || []
          return
        }

        if (activeDetailTab === 'history') {
          const events = (await getEntityHistory(
            supabase,
            selectedEntityType,
            selectedEntityId
          )) as HistoryEventRow[]
          if (!active) return
          setHistoryRows(events || [])
          detailCacheRef.current[cacheKey] = events || []
          return
        }

        if (activeDetailTab === 'versions') {
          const { data, error } = await supabase
            .from('versions')
            .select(
              `
              *,
              task:tasks(id, name),
              artist:profiles!versions_artist_id_fkey(id, display_name, full_name),
              created_by_profile:profiles!versions_created_by_fkey(id, display_name, full_name),
              project:projects(id, code, name)
            `
            )
            .eq('project_id', projectIdValue)
            .eq('entity_type', selectedEntityType)
            .eq('entity_id', entityIdValue)
            .order('created_at', { ascending: false })

          if (error) throw error
          const normalized: RowRecord[] =
            (data || []).map((version) => ({
              ...version,
              task_label: version.task?.name || '',
              artist_label:
                version.artist?.display_name ||
                version.artist?.full_name ||
                version.created_by_profile?.display_name ||
                version.created_by_profile?.full_name ||
                '',
              project_label: version.project ? version.project.code || version.project.name : '',
            })) || []

          if (!active) return
          setVersionRows(normalized)
          detailCacheRef.current[cacheKey] = normalized
          return
        }

        if (activeDetailTab === 'publishes') {
          const { data, error } = await supabase
            .from('published_files')
            .select(
              `
              *,
              task:tasks(id, name),
              version:versions(id, code),
              project:projects(id, code, name),
              published_by_profile:profiles!published_files_published_by_fkey(id, display_name, full_name)
            `
            )
            .eq('project_id', projectIdValue)
            .eq('entity_type', selectedEntityType)
            .eq('entity_id', entityIdValue)
            .order('created_at', { ascending: false })

          if (error) throw error
          const normalized: RowRecord[] =
            (data || []).map((publish) => ({
              ...publish,
              link: publish.link || publish.file_path || '',
              task_label: publish.task?.name || '',
              version_label: publish.version?.code || '',
              created_by_label:
                publish.published_by_profile?.display_name ||
                publish.published_by_profile?.full_name ||
                '',
              project_label: publish.project ? publish.project.code || publish.project.name : '',
            })) || []

          if (!active) return
          setPublishRows(normalized)
          detailCacheRef.current[cacheKey] = normalized
          return
        }

        if (activeDetailTab === 'assets') {
          let assetQuery = supabase
            .from('assets')
            .select(
              `
              *,
              project:projects!assets_project_id_fkey(id, code, name),
              sequence:sequences!assets_sequence_id_fkey(id, code, name),
              shot:shots!assets_shot_id_fkey(id, code, name)
            `
            )

          if (selectedEntityType === 'asset') {
            assetQuery = assetQuery.eq('id', entityIdValue)
          } else if (selectedEntityType === 'shot') {
            assetQuery = assetQuery.eq('shot_id', entityIdValue)
          } else if (selectedEntityType === 'sequence') {
            assetQuery = assetQuery.eq('sequence_id', entityIdValue)
          } else if (selectedEntityType === 'project') {
            assetQuery = assetQuery.eq('project_id', projectIdValue)
          } else {
            if (!active) return
            setAssetRows([])
            detailCacheRef.current[cacheKey] = []
            return
          }

          const { data, error } = await assetQuery.order('created_at', { ascending: false })
          if (error) throw error

          const normalized: RowRecord[] =
            (data || []).map((asset) => ({
              ...asset,
              project_label: asset.project ? asset.project.code || asset.project.name : '',
              sequence_label: asset.sequence
                ? `${asset.sequence.code} - ${asset.sequence.name}`
                : '',
              shot_label: asset.shot ? `${asset.shot.code} - ${asset.shot.name}` : '',
            })) || []

          if (!active) return
          setAssetRows(normalized)
          detailCacheRef.current[cacheKey] = normalized
        }
      } catch (error) {
        if (!active) return
        console.error('Failed to load My Tasks detail tab:', error)
        setDetailError('Failed to load tab data.')
      } finally {
        if (active) setDetailLoading(false)
      }
    }

    void loadDetailTab()
    return () => {
      active = false
    }
  }, [
    activeDetailTab,
    selectedEntityId,
    selectedEntityProjectId,
    selectedEntityType,
    selectedTask,
  ])

  const columns = useMemo<TableColumn[]>(
    () => [
      {
        id: 'name',
        label: 'Task Name',
        type: 'link',
        width: '240px',
        linkHref: (row) => {
          const projectId = toIdKey((row as MyTaskRow).project_id)
          const taskId = toIdKey((row as MyTaskRow).id)
          if (!projectId || !taskId) return ''
          return `/apex/${projectId}/tasks/${taskId}`
        },
      },
      { id: 'project_label', label: 'Project', type: 'text', width: '150px' },
      {
        id: 'entity_link_label',
        label: 'Linked Entity',
        type: 'link',
        width: '220px',
        linkHref: (row) => asText((row as MyTaskRow).entity_link_path).trim(),
      },
      {
        id: 'department',
        label: 'Pipeline Step',
        type: 'text',
        width: '170px',
        editable: true,
        editor: 'select',
        options: departmentOptions,
        formatValue: (value, row) => {
          const key = asText(value).trim()
          if (!key) return asText((row as MyTaskRow).department_label).trim() || 'No Department'
          return (
            departmentLabelById.get(key) ||
            asText((row as MyTaskRow).department_label).trim() ||
            key
          )
        },
        parseValue: (value) => value.trim() || null,
      },
      {
        id: 'status',
        label: 'Status',
        type: 'status',
        width: '140px',
        editable: true,
        editor: 'select',
        options: statusOptions,
      },
      {
        id: 'priority',
        label: 'Priority',
        type: 'text',
        width: '120px',
        editable: true,
        editor: 'select',
        options: PRIORITY_OPTIONS,
      },
      {
        id: 'assigned_to',
        label: 'Assigned To',
        type: 'text',
        width: '180px',
        editable: true,
        editor: 'select',
        options: assigneeOptions,
        formatValue: (value, row) => {
          const key = asText(value).trim()
          if (!key) return 'Unassigned'
          return assigneeNameById.get(key) || asText((row as MyTaskRow).assignee_name).trim() || key
        },
        parseValue: (value) => value.trim() || null,
      },
      { id: 'due_date', label: 'Due Date', type: 'date', width: '140px', editable: true, editor: 'date' },
      { id: 'start_date', label: 'Start Date', type: 'date', width: '140px', editable: true, editor: 'date' },
      { id: 'end_date', label: 'End Date', type: 'date', width: '140px', editable: true, editor: 'date' },
      { id: 'updated_at', label: 'Updated', type: 'datetime', width: '170px' },
    ],
    [
      assigneeNameById,
      assigneeOptions,
      departmentLabelById,
      departmentOptions,
      statusOptions,
    ]
  )

  const versionColumns = useMemo<TableColumn[]>(
    () => [
      { id: 'thumbnail_url', label: 'Thumbnail', type: 'thumbnail', width: '88px' },
      {
        id: 'code',
        label: 'Version Name',
        type: 'link',
        width: '220px',
        linkHref: (row) => {
          const id = asText((row as RowRecord).id).trim()
          const projectId = selectedEntityProjectId
          if (!projectId || !id) return ''
          return `/apex/${projectId}/versions/${id}`
        },
      },
      { id: 'status', label: 'Status', type: 'status', width: '120px' },
      { id: 'task_label', label: 'Task', type: 'text', width: '180px' },
      { id: 'artist_label', label: 'Artist', type: 'text', width: '180px' },
      { id: 'description', label: 'Description', type: 'text', width: '340px' },
      { id: 'created_at', label: 'Date Created', type: 'datetime', width: '180px' },
    ],
    [selectedEntityProjectId]
  )

  const publishColumns = useMemo<TableColumn[]>(
    () => [
      { id: 'thumbnail_url', label: 'Thumbnail', type: 'thumbnail', width: '88px' },
      { id: 'code', label: 'Published File Name', type: 'text', width: '220px' },
      { id: 'file_type', label: 'Type', type: 'text', width: '160px' },
      { id: 'status', label: 'Status', type: 'status', width: '120px' },
      { id: 'task_label', label: 'Task', type: 'text', width: '180px' },
      { id: 'version_label', label: 'Version', type: 'text', width: '180px' },
      { id: 'link', label: 'Link', type: 'text', width: '260px' },
      { id: 'created_by_label', label: 'Created by', type: 'text', width: '180px' },
      { id: 'created_at', label: 'Date Created', type: 'datetime', width: '180px' },
    ],
    []
  )

  const assetColumns = useMemo<TableColumn[]>(
    () => [
      { id: 'thumbnail_url', label: 'Thumbnail', type: 'thumbnail', width: '88px' },
      {
        id: 'name',
        label: 'Asset Name',
        type: 'link',
        width: '220px',
        linkHref: (row) => {
          const id = asText((row as RowRecord).id).trim()
          const projectId = selectedEntityProjectId
          if (!projectId || !id) return ''
          return `/apex/${projectId}/assets/${id}`
        },
      },
      { id: 'asset_type', label: 'Type', type: 'text', width: '140px' },
      { id: 'status', label: 'Status', type: 'status', width: '120px' },
      { id: 'project_label', label: 'Project', type: 'text', width: '160px' },
      { id: 'sequence_label', label: 'Sequence', type: 'text', width: '180px' },
      { id: 'shot_label', label: 'Shot', type: 'text', width: '180px' },
      { id: 'updated_at', label: 'Updated', type: 'datetime', width: '180px' },
    ],
    [selectedEntityProjectId]
  )

  function clearAllDrawerFilters() {
    setFilterState(cloneFilterState(EMPTY_FILTER_STATE))
    setSearchQuery('')
    setActiveSavedFilterId(null)
    setActivePresetId(null)
  }

  function handleToggleDrawerOption(key: MyTasksFilterKey, value: string) {
    setFilterState((previous) => toggleFilterValue(previous, key, value))
    setActiveSavedFilterId(null)
    setActivePresetId(null)
  }

  function applyPresetFilter(presetId: string) {
    const next = cloneFilterState(EMPTY_FILTER_STATE)

    if (presetId === 'unfinished_tasks') {
      const unfinishedStatuses = Array.from(
        new Set(
          tasks
            .filter((task) => task.my_tasks_bucket !== 'done')
            .map((task) => asText(task.status).trim())
            .filter(Boolean)
        )
      )
      next.status = unfinishedStatuses
    } else if (presetId === 'due_this_week') {
      next.due_date = ['this_week']
    } else if (presetId === 'no_end_date') {
      next.end_date = ['no_date']
    }

    setFilterState(next)
    setActivePresetId(presetId)
    setActiveSavedFilterId(null)
    setFiltersOpen(false)
  }

  async function saveCurrentFilter(name: string) {
    if (!currentUserId || !savedFiltersAvailable) return
    setSavedFiltersError(null)

    const supabase = createClient()
    const insertResult = await supabase
      .from('user_task_filters')
      .insert({
        user_id: currentUserId,
        name,
        is_default: false,
        filter_payload: filterState,
        sort_payload: {
          sort_field: sortField,
          sort_direction: sortDirection,
          search_query: searchQuery,
          active_preset_id: activePresetId,
        },
      })
      .select('id, name, is_default, filter_payload, sort_payload')
      .single()

    if (insertResult.error) {
      if (isMissingUserTaskFiltersTable(insertResult.error)) {
        setSavedFiltersAvailable(false)
        setSavedFiltersError('Saved filters table not found. Run migration first.')
        return
      }

      const errorCode = asText((insertResult.error as { code?: unknown }).code).trim()
      if (errorCode === '23505') {
        setSavedFiltersError('A saved filter with this name already exists.')
      } else {
        setSavedFiltersError('Failed to save filter.')
      }
      return
    }

    const row = insertResult.data as RowRecord
    const normalized: MyTasksSavedFilterRow = {
      id: Number(row.id),
      name: asText(row.name).trim() || name,
      is_default: Boolean(row.is_default),
      filter_payload: normalizeFilterState(row.filter_payload),
      sort_payload: asRecord(row.sort_payload) || null,
    }

    setSavedFilters((previous) =>
      [...previous, normalized].sort((a, b) => a.name.localeCompare(b.name))
    )
    setActiveSavedFilterId(normalized.id)
    setActivePresetId(null)
  }

  async function deleteSavedFilter(filter: MyTasksSavedFilterRow) {
    if (!currentUserId || !savedFiltersAvailable) return
    const confirmDelete = window.confirm(`Delete saved filter "${filter.name}"?`)
    if (!confirmDelete) return

    setSavedFiltersError(null)
    const supabase = createClient()
    const result = await supabase
      .from('user_task_filters')
      .delete()
      .eq('id', filter.id)
      .eq('user_id', currentUserId)

    if (result.error) {
      if (isMissingUserTaskFiltersTable(result.error)) {
        setSavedFiltersAvailable(false)
        setSavedFiltersError('Saved filters table not found. Run migration first.')
        return
      }
      setSavedFiltersError('Failed to delete saved filter.')
      return
    }

    setSavedFilters((previous) => previous.filter((item) => item.id !== filter.id))
    if (activeSavedFilterId === filter.id) {
      setActiveSavedFilterId(null)
    }
  }

  function applySavedFilter(filter: MyTasksSavedFilterRow) {
    setFilterState(normalizeFilterState(filter.filter_payload))

    const sortPayload = asRecord(filter.sort_payload) as MyTasksSavedSortPayload | null
    const nextSortField = asText(sortPayload?.sort_field).trim()
    if (isSortField(nextSortField)) {
      setSortField(nextSortField)
    } else {
      const legacySortMode = asText((sortPayload as Record<string, unknown> | null)?.sort_mode).trim()
      if (legacySortMode === 'due_asc' || legacySortMode === 'due_desc') {
        setSortField('due_date')
        setSortDirection(legacySortMode === 'due_desc' ? 'desc' : 'asc')
      } else if (legacySortMode === 'updated_desc' || legacySortMode === 'updated_asc') {
        setSortField('updated_at')
        setSortDirection(legacySortMode === 'updated_desc' ? 'desc' : 'asc')
      } else if (legacySortMode === 'name_asc' || legacySortMode === 'name_desc') {
        setSortField('name')
        setSortDirection(legacySortMode === 'name_desc' ? 'desc' : 'asc')
      }
    }

    const nextSortDirection = asText(sortPayload?.sort_direction).trim()
    if (isSortDirection(nextSortDirection)) {
      setSortDirection(nextSortDirection)
    }

    setSearchQuery(asText(sortPayload?.search_query))

    const nextPresetId = asText(sortPayload?.active_preset_id).trim()
    setActivePresetId(nextPresetId || null)

    setActiveSavedFilterId(filter.id)
    setFiltersOpen(false)
  }

  async function handleCellUpdate(row: MyTaskRow, column: TableColumn, value: unknown) {
    setCellError(null)

    const taskId = toIdKey(row.id)
    if (!taskId) return
    const projectId = toIdKey(row.project_id)

    const result = await updateTask(
      taskId,
      { [column.id]: value },
      { revalidate: false, projectId: projectId || undefined }
    )
    if (result.error) {
      throw new Error(result.error)
    }

    setTasks((previous) => {
      const nextRows: MyTaskRow[] = []

      for (const task of previous) {
        if (task.id !== row.id) {
          nextRows.push(task)
          continue
        }

        const nextTask: MyTaskRow = { ...task, [column.id]: value }

        if (column.id === 'status') {
          nextTask.my_tasks_bucket = getMyTasksBucket(value)
        }

        if (column.id === 'department') {
          const departmentKey = asText(value).trim()
          nextTask.department_label = departmentKey
            ? departmentLabelById.get(departmentKey) || departmentKey
            : 'No Department'
        }

        if (column.id === 'assigned_to') {
          const assignedTo = asText(value).trim()
          nextTask.assignee_name = assignedTo
            ? assigneeNameById.get(assignedTo) || assignedTo
            : 'Unassigned'

          if (currentUserId && assignedTo !== currentUserId) {
            continue
          }
        }

        nextRows.push(nextTask)
      }

      return nextRows
    })
  }

  const sortFieldLabel = useMemo(
    () =>
      SORT_FIELD_OPTIONS.find((option) => option.value === sortField)?.label || 'Sort',
    [sortField]
  )

  const infoRows = useMemo(
    () => [
      { label: 'Project', value: asText(selectedTask?.project_label).trim() || '-' },
      { label: 'Entity Type', value: asText(selectedTask?.entity_type_display).trim() || '-' },
      { label: 'Entity', value: asText(selectedTask?.entity_link_label).trim() || '-' },
      { label: 'Task Name', value: asText(selectedTask?.name).trim() || '-' },
      { label: 'Task Status', value: asText(selectedTask?.status).trim() || '-' },
      { label: 'Pipeline Step', value: asText(selectedTask?.department_label).trim() || '-' },
      { label: 'Assigned To', value: asText(selectedTask?.assignee_name).trim() || '-' },
      { label: 'Start Date', value: asText(selectedTask?.start_date).trim() || '-' },
      { label: 'Due Date', value: asText(selectedTask?.due_date).trim() || '-' },
      { label: 'End Date', value: asText(selectedTask?.end_date).trim() || '-' },
      { label: 'Sequence', value: asText(selectedTask?.entity_sequence_label).trim() || '-' },
      { label: 'Updated', value: asText(selectedTask?.updated_at).trim() || '-' },
    ],
    [selectedTask]
  )

  const supportsEntityTasksPanel =
    selectedEntityType === 'asset' ||
    selectedEntityType === 'shot' ||
    selectedEntityType === 'sequence'
  const supportsEntityNotesPanel =
    supportsEntityTasksPanel || selectedEntityType === 'task'

  function renderRightPaneContent() {
    if (!selectedTask) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
          Select a task from the left list to view details.
        </div>
      )
    }

    if (detailError) {
      return (
        <div className="m-3 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          {detailError}
        </div>
      )
    }

    if (activeDetailTab === 'tasks') {
      if (supportsEntityTasksPanel && selectedEntityProjectId && selectedEntityId) {
        return (
          <EntityTasksPanel
            projectId={selectedEntityProjectId}
            entityType={selectedEntityType as 'asset' | 'shot' | 'sequence'}
            entityId={selectedEntityId}
          />
        )
      }

      return (
        <div className="p-3">
          <EntityTable
            columns={columns}
            data={rightPaneTasks}
            entityType="tasks"
            preferenceScope="my_tasks"
            showToolbar={false}
            onCellUpdate={handleCellUpdate}
            onCellUpdateError={setCellError}
            onRowClick={(row) => setSelectedTaskId(Number((row as MyTaskRow).id))}
          />
        </div>
      )
    }

    if (activeDetailTab === 'notes') {
      if (supportsEntityNotesPanel && selectedEntityProjectId && selectedEntityId) {
        return (
          <EntityNotesPanel
            projectId={selectedEntityProjectId}
            entityType={selectedEntityType as 'asset' | 'shot' | 'sequence' | 'task'}
            entityId={selectedEntityId}
          />
        )
      }

      return (
        <div className="p-6 text-sm text-zinc-500">
          Notes are not available for this entity type.
        </div>
      )
    }

    if (activeDetailTab === 'info') {
      return (
        <div className="p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {infoRows.map((row) => (
              <div key={row.label} className="rounded-md border border-zinc-800 bg-zinc-950/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{row.label}</p>
                <p className="mt-1 text-sm text-zinc-200">{row.value}</p>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (detailLoading) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
          Loading {activeDetailTab}...
        </div>
      )
    }

    if (activeDetailTab === 'activity') {
      return (
        <div className="p-6">
          <ActivityFeed events={activityRows} />
        </div>
      )
    }

    if (activeDetailTab === 'history') {
      return (
        <div className="p-6">
          <HistoryTable events={historyRows} />
        </div>
      )
    }

    if (activeDetailTab === 'versions') {
      return (
        <div className="p-3">
          <EntityTable
            columns={versionColumns}
            data={versionRows}
            entityType="versions_my_tasks"
            preferenceScope="my_tasks_versions"
            showToolbar={false}
          />
        </div>
      )
    }

    if (activeDetailTab === 'publishes') {
      return (
        <div className="p-3">
          <EntityTable
            columns={publishColumns}
            data={publishRows}
            entityType="publishes_my_tasks"
            preferenceScope="my_tasks_publishes"
            showToolbar={false}
          />
        </div>
      )
    }

    if (activeDetailTab === 'assets') {
      return (
        <div className="p-3">
          <EntityTable
            columns={assetColumns}
            data={assetRows}
            entityType="assets_my_tasks"
            preferenceScope="my_tasks_assets"
            showToolbar={false}
          />
        </div>
      )
    }

    return null
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-400">Loading My Tasks...</p>
      </div>
    )
  }

  return (
    <ApexPageShell title="My Tasks">
      {cellError ? (
        <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {cellError}
        </div>
      ) : null}
      {savedFiltersError ? (
        <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          {savedFiltersError}
        </div>
      ) : null}

      {tasks.length === 0 ? (
        <ApexEmptyState
          icon={<ListTodo className="h-12 w-12" />}
          title="No assigned tasks"
          description="Tasks assigned to you across projects will appear here."
        />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSortMenuOpen((previous) => !previous)}
                className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500"
              >
                Sort
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {sortMenuOpen ? (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-30 cursor-default"
                    onClick={() => setSortMenuOpen(false)}
                    aria-label="Close sort menu"
                  />
                  <div className="absolute left-0 top-full z-40 mt-2 w-64 rounded-md border border-zinc-800 bg-zinc-950 p-2 shadow-2xl">
                    <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Sort
                    </p>
                    <div className="space-y-0.5">
                      {SORT_FIELD_OPTIONS.map((option) => {
                        const selected = sortField === option.value
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setSortField(option.value)
                              setSortMenuOpen(false)
                              setActiveSavedFilterId(null)
                              setActivePresetId(null)
                            }}
                            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-900"
                          >
                            <span>{option.label}</span>
                            {selected ? <Check className="h-3.5 w-3.5 text-amber-300" /> : null}
                          </button>
                        )
                      })}
                    </div>
                    <div className="my-2 border-t border-zinc-800" />
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSortDirection('asc')
                          setSortMenuOpen(false)
                          setActiveSavedFilterId(null)
                          setActivePresetId(null)
                        }}
                        className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-900"
                      >
                        <span>Ascending</span>
                        {sortDirection === 'asc' ? <Check className="h-3.5 w-3.5 text-amber-300" /> : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSortDirection('desc')
                          setSortMenuOpen(false)
                          setActiveSavedFilterId(null)
                          setActivePresetId(null)
                        }}
                        className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-900"
                      >
                        <span>Descending</span>
                        {sortDirection === 'desc' ? <Check className="h-3.5 w-3.5 text-amber-300" /> : null}
                      </button>
                    </div>
                  </div>
                </>
              ) : null}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((previous) => !previous)}
                  className={`inline-flex items-center gap-1 rounded border px-2.5 py-1.5 text-sm transition ${
                    filtersOpen
                      ? 'border-amber-500 bg-amber-500/15 text-amber-200'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500'
                  }`}
                >
                  <Filter className="h-3.5 w-3.5" />
                  Filter {filterCount > 0 ? `(${filterCount})` : ''}
                </button>
                <MyTasksFilterDrawer
                  open={filtersOpen}
                  onClose={() => setFiltersOpen(false)}
                  filterCount={filterCount}
                  filterState={filterState}
                  sections={filterSections}
                  onToggleOption={handleToggleDrawerOption}
                  onClearAll={clearAllDrawerFilters}
                  presets={PRESET_FILTERS}
                  activePresetId={activePresetId}
                  onApplyPreset={applyPresetFilter}
                  savedFilters={savedFilters}
                  activeSavedFilterId={activeSavedFilterId}
                  onApplySavedFilter={applySavedFilter}
                  onDeleteSavedFilter={deleteSavedFilter}
                  onSaveCurrentFilter={saveCurrentFilter}
                  savedFiltersAvailable={savedFiltersAvailable}
                />
              </div>

              <p className="hidden text-xs text-zinc-500 sm:block">{sortFieldLabel}</p>
            </div>

            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                  setActiveSavedFilterId(null)
                  setActivePresetId(null)
                }}
                placeholder="Search My Tasks..."
                className="w-full rounded border border-zinc-700 bg-zinc-900 py-1.5 pl-8 pr-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {visibleTasks.length === 0 ? (
            <ApexEmptyState
              icon={<ListTodo className="h-12 w-12" />}
              title="No tasks found"
              description="Try changing filters or search."
            />
          ) : (
            <div className="grid min-h-[72vh] grid-cols-1 gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/70">
                <MyTasksLeftQueue
                  tasks={visibleTasks}
                  selectedTaskId={selectedTask?.id || null}
                  onSelectTask={(task) => setSelectedTaskId(task.id)}
                />
              </div>

              <div className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/70">
                <MyTasksRightContext
                  task={selectedTask}
                  tabs={DETAIL_TABS}
                  activeTab={activeDetailTab}
                  onTabChange={(tabId) => setActiveDetailTab(tabId as MyTasksDetailTab)}
                />
                <div className="h-[calc(72vh-9.5rem)] overflow-y-auto">
                  {renderRightPaneContent()}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </ApexPageShell>
  )
}
