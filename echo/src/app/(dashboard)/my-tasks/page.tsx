'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateTask } from '@/actions/tasks'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import { ActivityFeed } from '@/components/apex/activity-feed'
import { EntityNotesPanel } from '@/components/apex/entity-notes-panel'
import { EntityTasksPanel } from '@/components/apex/entity-tasks-panel'
import { HistoryTable } from '@/components/apex/history-table'
import { EntityTable } from '@/components/table/entity-table'
import type { TableColumn } from '@/components/table/types'
import {
  asText,
  toIdKey,
  toNumericId,
  titleCase,
  getMyTasksBucket,
  matchesDateFilter,
  matchesStringFilter,
  buildTextFilterOptions,
  buildDateFilterOptions,
} from '@/lib/fields'
import { resolveEntityLinks, getResolvedEntityData } from '@/lib/fields/entity-resolver'
import { enrichRows } from '@/lib/fields/row-enricher'
import { loadAllFieldOptions } from '@/lib/fields/options-loader'
import type { EntityResolutionMap } from '@/lib/fields/types'
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function asRecord(value: unknown): RowRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as RowRecord
}

function compareByDueDateThenUpdated(a: MyTaskRow, b: MyTaskRow): number {
  const aDue = Date.parse(asText(a.due_date))
  const bDue = Date.parse(asText(b.due_date))
  if (!Number.isNaN(aDue) && !Number.isNaN(bDue) && aDue !== bDue) return aDue - bDue
  if (!Number.isNaN(aDue) && Number.isNaN(bDue)) return -1
  if (Number.isNaN(aDue) && !Number.isNaN(bDue)) return 1
  const aUpdated = Date.parse(asText(a.updated_at))
  const bUpdated = Date.parse(asText(b.updated_at))
  if (!Number.isNaN(aUpdated) && !Number.isNaN(bUpdated) && aUpdated !== bUpdated) return bUpdated - aUpdated
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
      ? Array.from(new Set(raw.map((item) => asText(item).trim()).filter((item) => item.length > 0)))
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
    state.status.length + state.pipeline_step.length + state.assigned_to.length +
    state.link.length + state.start_date.length + state.end_date.length + state.due_date.length
  )
}

function toggleFilterValue(state: MyTasksFilterState, key: MyTasksFilterKey, value: string): MyTasksFilterState {
  const current = state[key]
  const exists = current.includes(value as never)
  const nextValues = exists ? current.filter((item) => item !== (value as never)) : [...current, value as never]
  return { ...state, [key]: nextValues }
}

function taskMatchesFilterState(task: MyTaskRow, filters: MyTasksFilterState): boolean {
  if (!matchesStringFilter(task.status, filters.status)) return false
  if (!matchesStringFilter(task.department_label, filters.pipeline_step)) return false
  if (!matchesStringFilter(task.assignee_name, filters.assigned_to)) return false
  if (!matchesStringFilter(task.entity_link_label, filters.link)) return false
  if (!matchesDateFilter(task.start_date, filters.start_date)) return false
  if (!matchesDateFilter(task.end_date, filters.end_date)) return false
  if (!matchesDateFilter(task.due_date, filters.due_date)) return false
  return true
}

function taskMatchesSearch(task: MyTaskRow, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  const values = [task.name, task.project_label, task.entity_link_label, task.status, task.department_label, task.assignee_name]
  return values.some((value) => asText(value).toLowerCase().includes(normalized))
}

function compareTextValue(a: unknown, b: unknown): number { return asText(a).localeCompare(asText(b)) }

function compareDateValue(a: unknown, b: unknown): number {
  const aTime = Date.parse(asText(a))
  const bTime = Date.parse(asText(b))
  if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) return aTime - bTime
  if (!Number.isNaN(aTime) && Number.isNaN(bTime)) return -1
  if (Number.isNaN(aTime) && !Number.isNaN(bTime)) return 1
  return 0
}

function sortTaskRows(rows: MyTaskRow[], field: MyTasksSortField, direction: MyTasksSortDirection): MyTaskRow[] {
  const factor = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    let compared = 0
    if (field === 'due_date') compared = compareDateValue(a.due_date, b.due_date)
    else if (field === 'start_date') compared = compareDateValue(a.start_date, b.start_date)
    else if (field === 'updated_at') compared = compareDateValue(a.updated_at, b.updated_at)
    else if (field === 'status') compared = compareTextValue(a.status, b.status)
    else if (field === 'project_label') compared = compareTextValue(a.project_label, b.project_label)
    else compared = compareTextValue(a.name, b.name)
    if (compared !== 0) return compared * factor
    return compareByDueDateThenUpdated(a, b)
  })
}

function sameEntity(a: MyTaskRow, b: MyTaskRow): boolean {
  return (
    toIdKey(a.project_id) === toIdKey(b.project_id) &&
    asText(a.entity_type).trim() === asText(b.entity_type).trim() &&
    toIdKey(a.entity_id) === toIdKey(b.entity_id)
  )
}

/**
 * Map an enriched row (from useEntityData / enrichRows) to MyTaskRow shape
 * so child components (MyTasksLeftQueue, MyTasksRightContext) work without changes.
 */
function toMyTaskRow(enriched: RowRecord, resolutionMap: EntityResolutionMap): MyTaskRow {
  const projectId = toNumericId(enriched.project_id)
  const entityType = asText(enriched.entity_type).trim().toLowerCase()
  const entityId = asText(enriched.entity_id).trim()

  // Try to get sequence label from entity data for shots/assets
  let entitySequenceLabel: string | null = null
  const entityData = entityId
    ? getResolvedEntityData(entityId, resolutionMap, entityType)
    : null
  if (entityData && entityData.sequence_id) {
    // The sequence_id may have been resolved by the entity resolver
    const sequenceId = asText(entityData.sequence_id).trim()
    const seqLabel =
      resolutionMap.get('entity_id')?.get(`sequence:${sequenceId}`) ||
      resolutionMap.get('entity_id')?.get(sequenceId)
    if (seqLabel) entitySequenceLabel = seqLabel
  }

  return {
    ...enriched,
    id: Number(enriched.id),
    project_id: projectId,
    entity_type: entityType || null,
    entity_id: toNumericId(enriched.entity_id),
    entity_code: asText(enriched.entity_code).trim() || null,
    entity_name: asText(enriched.entity_name).trim() || null,
    entity_status: asText(enriched.entity_status).trim() || null,
    entity_description: asText(enriched.entity_description).trim() || null,
    entity_thumbnail_url: asText(enriched.entity_thumbnail_url).trim() || null,
    entity_sequence_label: entitySequenceLabel,
    project_label: asText(enriched.project_id_label).trim() || asText(enriched.project_id).trim() || '-',
    entity_type_display: asText(enriched.entity_type_display).trim() || titleCase(entityType || 'unknown'),
    entity_link_label: asText(enriched.entity_link_label).trim() || '-',
    entity_link_path: asText(enriched.entity_link_path).trim() || null,
    department: asText(enriched.department).trim() || null,
    department_label: asText(enriched.department_label).trim() || 'No Department',
    step_name: asText(enriched.step_id_label).trim() || 'No Step',
    assignee_name: asText(enriched.assigned_to_label).trim() || 'Unassigned',
    my_tasks_bucket: getMyTasksBucket(enriched.status),
  }
}

// ===========================================================================
// Component
// ===========================================================================

export default function MyTasksPage() {
  const [currentUserId, setCurrentUserId] = useState('')
  const [tasks, setTasks] = useState<MyTaskRow[]>([])
  const [resolutionMap, setResolutionMap] = useState<EntityResolutionMap>(new Map())
  const [statusNames, setStatusNames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cellError, setCellError] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [sortField, setSortField] = useState<MyTasksSortField>('due_date')
  const [sortDirection, setSortDirection] = useState<MyTasksSortDirection>('asc')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterState, setFilterState] = useState<MyTasksFilterState>(cloneFilterState(EMPTY_FILTER_STATE))
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

  // -------------------------------------------------------------------------
  // Options from field system (used for columns + filter sections)
  // -------------------------------------------------------------------------
  const [fieldOptions, setFieldOptions] = useState<Record<string, Array<{ value: string; label: string }>>>({})

  const loadMyTasks = useCallback(async () => {
    try {
      setIsLoading(true)
      setCellError(null)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user?.id) {
        setCurrentUserId('')
        setTasks([])
        setResolutionMap(new Map())
        setFieldOptions({})
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

      // Fetch raw tasks + load options + resolve entities in parallel
      const [tasksResult, loadedOptions, loadedStatusNames] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .eq('assigned_to', user.id)
          .is('deleted_at', null),
        loadAllFieldOptions(supabase, 'task'),
        (async () => {
          const { data } = await supabase
            .from('statuses')
            .select('name')
            .or('entity_type.eq.task,entity_type.is.null')
            .order('sort_order', { ascending: true })
          return (data || []).map((s) => asText((s as RowRecord).name).trim()).filter(Boolean)
        })(),
      ])

      if (tasksResult.error) throw tasksResult.error
      const rawRows = (tasksResult.data || []) as RowRecord[]

      // Resolve entity links using the field system (replaces ~120 lines of manual resolution)
      const loadedResolution = rawRows.length > 0
        ? await resolveEntityLinks(supabase, 'task', rawRows, { crossProject: true })
        : new Map() as EntityResolutionMap

      // Enrich rows using the field system
      const enriched = enrichRows('task', rawRows, loadedResolution)

      // Map to MyTaskRow shape for child components
      const normalizedTasks = enriched.map((row) => toMyTaskRow(row, loadedResolution))

      setTasks(normalizedTasks)
      setResolutionMap(loadedResolution)
      setFieldOptions(loadedOptions)
      setStatusNames(loadedStatusNames)
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
      setResolutionMap(new Map())
      setFieldOptions({})
      setStatusNames([])
      setSelectedTaskId(null)
      setSavedFilters([])
      setActiveDetailTab('tasks')
      detailCacheRef.current = {}
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void loadMyTasks() }, [loadMyTasks])

  const loadSavedFilters = useCallback(async (userId: string) => {
    if (!userId) { setSavedFilters([]); setSavedFiltersAvailable(true); return }
    const supabase = createClient()
    const result = await supabase
      .from('user_task_filters')
      .select('id, name, is_default, filter_payload, sort_payload')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })

    if (result.error) {
      if (isMissingUserTaskFiltersTable(result.error)) {
        setSavedFiltersAvailable(false); setSavedFilters([]); setSavedFiltersError(null); return
      }
      console.error('Failed to load saved my task filters:', result.error)
      setSavedFiltersAvailable(true); setSavedFilters([]); setSavedFiltersError('Unable to load saved filters.')
      return
    }

    const rows = ((result.data || []) as RowRecord[]).map((row) => ({
      id: Number(row.id),
      name: asText(row.name).trim() || `Filter ${asText(row.id).trim()}`,
      is_default: Boolean(row.is_default),
      filter_payload: normalizeFilterState(row.filter_payload),
      sort_payload: asRecord(row.sort_payload) || null,
    }))
    setSavedFiltersAvailable(true); setSavedFilters(rows); setSavedFiltersError(null)
  }, [])

  useEffect(() => {
    if (!currentUserId) { setSavedFilters([]); setSavedFiltersAvailable(true); return }
    void loadSavedFilters(currentUserId)
  }, [currentUserId, loadSavedFilters])

  // -------------------------------------------------------------------------
  // Options derived from field system + loaded data
  // -------------------------------------------------------------------------
  const statusOptions = useMemo(() => {
    const values = new Set<string>()
    for (const name of statusNames) { const n = name.trim(); if (n) values.add(n) }
    for (const task of tasks) { const n = asText(task.status).trim(); if (n) values.add(n) }
    return Array.from(values).map((v) => ({ value: v, label: v }))
  }, [statusNames, tasks])

  const departmentOptions = useMemo(
    () => fieldOptions.department || [],
    [fieldOptions]
  )

  const assigneeOptions = useMemo(
    () => [{ value: '', label: 'Unassigned' }, ...(fieldOptions.assigned_to || [])],
    [fieldOptions]
  )

  const departmentLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const opt of departmentOptions) { if (opt.value) map.set(opt.value, opt.label) }
    return map
  }, [departmentOptions])

  const assigneeNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const opt of fieldOptions.assigned_to || []) { if (opt.value) map.set(opt.value, opt.label) }
    return map
  }, [fieldOptions])

  // -------------------------------------------------------------------------
  // Columns
  // -------------------------------------------------------------------------
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
          return departmentLabelById.get(key) || asText((row as MyTaskRow).department_label).trim() || key
        },
        parseValue: (value) => value.trim() || null,
      },
      { id: 'status', label: 'Status', type: 'status', width: '140px', editable: true, editor: 'select', options: statusOptions },
      { id: 'priority', label: 'Priority', type: 'text', width: '120px', editable: true, editor: 'select', options: PRIORITY_OPTIONS },
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
    [assigneeNameById, assigneeOptions, departmentLabelById, departmentOptions, statusOptions]
  )

  // -------------------------------------------------------------------------
  // Filter sections
  // -------------------------------------------------------------------------
  const filterSections = useMemo<MyTasksFilterSection[]>(() => {
    const statusCounts = new Map<string, number>()
    for (const row of tasks) {
      const value = asText(row.status).trim()
      if (value) statusCounts.set(value, (statusCounts.get(value) || 0) + 1)
    }
    const statusOpts: MyTasksFilterOption[] = Array.from(statusCounts.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label))

    for (const status of statusNames) {
      const normalized = status.trim()
      if (!normalized || statusOpts.some((o) => o.value === normalized)) continue
      statusOpts.push({ value: normalized, label: normalized, count: 0 })
    }
    statusOpts.sort((a, b) => a.label.localeCompare(b.label))

    return [
      { key: 'status', label: 'Status', options: statusOpts.filter((o) => o.count > 0) },
      { key: 'pipeline_step', label: 'Pipeline Step', options: buildTextFilterOptions(tasks, (t) => asText(t.department_label)) },
      { key: 'assigned_to', label: 'Assigned To', options: buildTextFilterOptions(tasks, (t) => asText(t.assignee_name)) },
      { key: 'link', label: 'Link', options: buildTextFilterOptions(tasks, (t) => asText(t.entity_link_label)) },
      { key: 'start_date', label: 'Start Date', options: buildDateFilterOptions(tasks, (t) => t.start_date) },
      { key: 'end_date', label: 'End Date', options: buildDateFilterOptions(tasks, (t) => t.end_date) },
      { key: 'due_date', label: 'Due Date', options: buildDateFilterOptions(tasks, (t) => t.due_date) },
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
    if (visibleTasks.length === 0) { setSelectedTaskId(null); return }
    if (!selectedTaskId) { setSelectedTaskId(visibleTasks[0].id); return }
    const exists = visibleTasks.some((task) => task.id === selectedTaskId)
    if (!exists) setSelectedTaskId(visibleTasks[0].id)
  }, [selectedTaskId, visibleTasks])

  const selectedTask = useMemo(
    () => visibleTasks.find((task) => task.id === selectedTaskId) || null,
    [selectedTaskId, visibleTasks]
  )

  const rightPaneTasks = useMemo(() => {
    if (!selectedTask) return visibleTasks
    const rows = visibleTasks.filter((task) => sameEntity(task, selectedTask))
    return rows.length > 0 ? rows : [selectedTask]
  }, [selectedTask, visibleTasks])

  const selectedEntityType = useMemo(() => asText(selectedTask?.entity_type).trim().toLowerCase(), [selectedTask])
  const selectedEntityId = useMemo(() => asText(selectedTask?.entity_id).trim(), [selectedTask])
  const selectedEntityProjectId = useMemo(() => asText(selectedTask?.project_id).trim(), [selectedTask])

  // -------------------------------------------------------------------------
  // Detail tab loading
  // -------------------------------------------------------------------------
  useEffect(() => {
    setDetailError(null)
    if (!selectedTask || activeDetailTab === 'tasks' || activeDetailTab === 'notes' || activeDetailTab === 'info') return

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
        const projectIdValue = Number.isNaN(numericProjectId) ? selectedEntityProjectId : numericProjectId

        if (activeDetailTab === 'activity') {
          const events = (await getEntityActivity(supabase, selectedEntityType, selectedEntityId)) as ActivityEventRow[]
          if (!active) return
          setActivityRows(events || [])
          detailCacheRef.current[cacheKey] = events || []
          return
        }
        if (activeDetailTab === 'history') {
          const events = (await getEntityHistory(supabase, selectedEntityType, selectedEntityId)) as HistoryEventRow[]
          if (!active) return
          setHistoryRows(events || [])
          detailCacheRef.current[cacheKey] = events || []
          return
        }
        if (activeDetailTab === 'versions') {
          const { data, error } = await supabase
            .from('versions')
            .select('*, task:tasks(id, name), artist:profiles!versions_artist_id_fkey(id, display_name, full_name), created_by_profile:profiles!versions_created_by_fkey(id, display_name, full_name), project:projects(id, code, name)')
            .eq('project_id', projectIdValue)
            .eq('entity_type', selectedEntityType)
            .eq('entity_id', entityIdValue)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
          if (error) throw error
          const normalized: RowRecord[] = (data || []).map((version) => ({
            ...version,
            task_label: version.task?.name || '',
            artist_label: version.artist?.display_name || version.artist?.full_name || version.created_by_profile?.display_name || version.created_by_profile?.full_name || '',
            project_label: version.project ? version.project.code || version.project.name : '',
          }))
          if (!active) return
          setVersionRows(normalized)
          detailCacheRef.current[cacheKey] = normalized
          return
        }
        if (activeDetailTab === 'publishes') {
          const { data, error } = await supabase
            .from('published_files')
            .select('*, task:tasks(id, name), version:versions(id, code), project:projects(id, code, name), published_by_profile:profiles!published_files_published_by_fkey(id, display_name, full_name)')
            .eq('project_id', projectIdValue)
            .eq('entity_type', selectedEntityType)
            .eq('entity_id', entityIdValue)
            .order('created_at', { ascending: false })
          if (error) throw error
          const normalized: RowRecord[] = (data || []).map((publish) => ({
            ...publish,
            link: publish.link || publish.file_path || '',
            task_label: publish.task?.name || '',
            version_label: publish.version?.code || '',
            created_by_label: publish.published_by_profile?.display_name || publish.published_by_profile?.full_name || '',
            project_label: publish.project ? publish.project.code || publish.project.name : '',
          }))
          if (!active) return
          setPublishRows(normalized)
          detailCacheRef.current[cacheKey] = normalized
          return
        }
        if (activeDetailTab === 'assets') {
          let assetQuery = supabase
            .from('assets')
            .select('*, project:projects!assets_project_id_fkey(id, code, name), sequence:sequences!assets_sequence_id_fkey(id, code, name), shot:shots!assets_shot_id_fkey(id, code, name)')
          if (selectedEntityType === 'asset') assetQuery = assetQuery.eq('id', entityIdValue)
          else if (selectedEntityType === 'shot') assetQuery = assetQuery.eq('shot_id', entityIdValue)
          else if (selectedEntityType === 'sequence') assetQuery = assetQuery.eq('sequence_id', entityIdValue)
          else if (selectedEntityType === 'project') assetQuery = assetQuery.eq('project_id', projectIdValue)
          else { if (!active) return; setAssetRows([]); detailCacheRef.current[cacheKey] = []; return }

          const { data, error } = await assetQuery
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
          if (error) throw error
          const normalized: RowRecord[] = (data || []).map((asset) => ({
            ...asset,
            project_label: asset.project ? asset.project.code || asset.project.name : '',
            sequence_label: asset.sequence ? `${asset.sequence.code} - ${asset.sequence.name}` : '',
            shot_label: asset.shot ? `${asset.shot.code} - ${asset.shot.name}` : '',
          }))
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
    return () => { active = false }
  }, [activeDetailTab, selectedEntityId, selectedEntityProjectId, selectedEntityType, selectedTask])

  // -------------------------------------------------------------------------
  // Detail tab columns
  // -------------------------------------------------------------------------
  const versionColumns = useMemo<TableColumn[]>(
    () => [
      { id: 'thumbnail_url', label: 'Thumbnail', type: 'thumbnail', width: '88px' },
      {
        id: 'code', label: 'Version Name', type: 'link', width: '220px',
        linkHref: (row) => {
          const id = asText((row as RowRecord).id).trim()
          return id && selectedEntityProjectId ? `/apex/${selectedEntityProjectId}/versions/${id}` : ''
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
        id: 'name', label: 'Asset Name', type: 'link', width: '220px',
        linkHref: (row) => {
          const id = asText((row as RowRecord).id).trim()
          return id && selectedEntityProjectId ? `/apex/${selectedEntityProjectId}/assets/${id}` : ''
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

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------
  function clearAllDrawerFilters() {
    setFilterState(cloneFilterState(EMPTY_FILTER_STATE))
    setSearchQuery('')
    setActiveSavedFilterId(null)
    setActivePresetId(null)
  }

  function handleToggleDrawerOption(key: MyTasksFilterKey, value: string) {
    setFilterState((prev) => toggleFilterValue(prev, key, value))
    setActiveSavedFilterId(null)
    setActivePresetId(null)
  }

  function applyPresetFilter(presetId: string) {
    const next = cloneFilterState(EMPTY_FILTER_STATE)
    if (presetId === 'unfinished_tasks') {
      next.status = Array.from(new Set(tasks.filter((t) => t.my_tasks_bucket !== 'done').map((t) => asText(t.status).trim()).filter(Boolean)))
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
        sort_payload: { sort_field: sortField, sort_direction: sortDirection, search_query: searchQuery, active_preset_id: activePresetId },
      })
      .select('id, name, is_default, filter_payload, sort_payload')
      .single()

    if (insertResult.error) {
      if (isMissingUserTaskFiltersTable(insertResult.error)) {
        setSavedFiltersAvailable(false); setSavedFiltersError('Saved filters table not found. Run migration first.'); return
      }
      const errorCode = asText((insertResult.error as { code?: unknown }).code).trim()
      setSavedFiltersError(errorCode === '23505' ? 'A saved filter with this name already exists.' : 'Failed to save filter.')
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
    setSavedFilters((prev) => [...prev, normalized].sort((a, b) => a.name.localeCompare(b.name)))
    setActiveSavedFilterId(normalized.id)
    setActivePresetId(null)
  }

  async function deleteSavedFilter(filter: MyTasksSavedFilterRow) {
    if (!currentUserId || !savedFiltersAvailable) return
    const confirmDelete = window.confirm(`Delete saved filter "${filter.name}"?`)
    if (!confirmDelete) return
    setSavedFiltersError(null)
    const supabase = createClient()
    const result = await supabase.from('user_task_filters').delete().eq('id', filter.id).eq('user_id', currentUserId)
    if (result.error) {
      if (isMissingUserTaskFiltersTable(result.error)) {
        setSavedFiltersAvailable(false); setSavedFiltersError('Saved filters table not found. Run migration first.'); return
      }
      setSavedFiltersError('Failed to delete saved filter.'); return
    }
    setSavedFilters((prev) => prev.filter((item) => item.id !== filter.id))
    if (activeSavedFilterId === filter.id) setActiveSavedFilterId(null)
  }

  function applySavedFilter(filter: MyTasksSavedFilterRow) {
    setFilterState(normalizeFilterState(filter.filter_payload))
    const sortPayload = asRecord(filter.sort_payload) as MyTasksSavedSortPayload | null
    const nextSortField = asText(sortPayload?.sort_field).trim()
    if (isSortField(nextSortField)) {
      setSortField(nextSortField)
    } else {
      const legacySortMode = asText((sortPayload as Record<string, unknown> | null)?.sort_mode).trim()
      if (legacySortMode === 'due_asc' || legacySortMode === 'due_desc') { setSortField('due_date'); setSortDirection(legacySortMode === 'due_desc' ? 'desc' : 'asc') }
      else if (legacySortMode === 'updated_desc' || legacySortMode === 'updated_asc') { setSortField('updated_at'); setSortDirection(legacySortMode === 'updated_desc' ? 'desc' : 'asc') }
      else if (legacySortMode === 'name_asc' || legacySortMode === 'name_desc') { setSortField('name'); setSortDirection(legacySortMode === 'name_desc' ? 'desc' : 'asc') }
    }
    const nextSortDirection = asText(sortPayload?.sort_direction).trim()
    if (isSortDirection(nextSortDirection)) setSortDirection(nextSortDirection)
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

    const result = await updateTask(taskId, { [column.id]: value }, { revalidate: false, projectId: projectId || undefined })
    if (result.error) throw new Error(result.error)

    setTasks((previous) => {
      const nextRows: MyTaskRow[] = []
      for (const task of previous) {
        if (task.id !== row.id) { nextRows.push(task); continue }
        const nextTask: MyTaskRow = { ...task, [column.id]: value }
        if (column.id === 'status') nextTask.my_tasks_bucket = getMyTasksBucket(value)
        if (column.id === 'department') {
          const departmentKey = asText(value).trim()
          nextTask.department_label = departmentKey ? departmentLabelById.get(departmentKey) || departmentKey : 'No Department'
        }
        if (column.id === 'assigned_to') {
          const assignedTo = asText(value).trim()
          nextTask.assignee_name = assignedTo ? assigneeNameById.get(assignedTo) || assignedTo : 'Unassigned'
          if (currentUserId && assignedTo !== currentUserId) continue
        }
        nextRows.push(nextTask)
      }
      return nextRows
    })
  }

  const sortFieldLabel = useMemo(
    () => SORT_FIELD_OPTIONS.find((o) => o.value === sortField)?.label || 'Sort',
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

  const supportsEntityTasksPanel = selectedEntityType === 'asset' || selectedEntityType === 'shot' || selectedEntityType === 'sequence'
  const supportsEntityNotesPanel = supportsEntityTasksPanel || selectedEntityType === 'task'

  // -------------------------------------------------------------------------
  // Right pane content
  // -------------------------------------------------------------------------
  function renderRightPaneContent() {
    if (!selectedTask) {
      return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Select a task from the left list to view details.</div>
    }
    if (detailError) {
      return <div className="m-3 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{detailError}</div>
    }

    if (activeDetailTab === 'tasks') {
      if (supportsEntityTasksPanel && selectedEntityProjectId && selectedEntityId) {
        return <EntityTasksPanel projectId={selectedEntityProjectId} entityType={selectedEntityType as 'asset' | 'shot' | 'sequence'} entityId={selectedEntityId} />
      }
      return (
        <div className="h-full p-3">
          <EntityTable columns={columns} data={rightPaneTasks} entityType="tasks" preferenceScope="my_tasks" showToolbar={false} onCellUpdate={handleCellUpdate} onCellUpdateError={setCellError} onRowClick={(row) => setSelectedTaskId(Number((row as MyTaskRow).id))} />
        </div>
      )
    }

    if (activeDetailTab === 'notes') {
      if (supportsEntityNotesPanel && selectedEntityProjectId && selectedEntityId) {
        return <EntityNotesPanel projectId={selectedEntityProjectId} entityType={selectedEntityType as 'asset' | 'shot' | 'sequence' | 'task'} entityId={selectedEntityId} />
      }
      return <div className="flex h-full items-center p-6 text-sm text-muted-foreground">Notes are not available for this entity type.</div>
    }

    if (activeDetailTab === 'info') {
      return (
        <div className="h-full overflow-y-auto p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {infoRows.map((row) => (
              <div key={row.label} className="rounded-md border border-border bg-background/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{row.label}</p>
                <p className="mt-1 text-sm text-foreground/80">{row.value}</p>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (detailLoading) {
      return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading {activeDetailTab}...</div>
    }

    if (activeDetailTab === 'activity') return <div className="h-full overflow-y-auto p-6"><ActivityFeed events={activityRows} /></div>
    if (activeDetailTab === 'history') return <div className="h-full overflow-y-auto p-6"><HistoryTable events={historyRows} /></div>
    if (activeDetailTab === 'versions') return <div className="h-full p-3"><EntityTable columns={versionColumns} data={versionRows} entityType="versions_my_tasks" preferenceScope="my_tasks_versions" showToolbar={false} /></div>
    if (activeDetailTab === 'publishes') return <div className="h-full p-3"><EntityTable columns={publishColumns} data={publishRows} entityType="publishes_my_tasks" preferenceScope="my_tasks_publishes" showToolbar={false} /></div>
    if (activeDetailTab === 'assets') return <div className="h-full p-3"><EntityTable columns={assetColumns} data={assetRows} entityType="assets_my_tasks" preferenceScope="my_tasks_assets" showToolbar={false} /></div>

    return null
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><p className="text-muted-foreground">Loading My Tasks...</p></div>
  }

  return (
    <ApexPageShell title="My Tasks">
      {cellError ? <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{cellError}</div> : null}
      {savedFiltersError ? <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-primary">{savedFiltersError}</div> : null}

      {tasks.length === 0 ? (
        <ApexEmptyState icon={<ListTodo className="h-12 w-12" />} title="No assigned tasks" description="Tasks assigned to you across projects will appear here." />
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <div className="mb-3 shrink-0 flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex items-center gap-2">
              <button type="button" onClick={() => setSortMenuOpen((prev) => !prev)} className="inline-flex items-center gap-1 rounded border border-border bg-card px-2.5 py-1.5 text-sm text-foreground/80 transition hover:border-border">
                Sort
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {sortMenuOpen ? (
                <>
                  <button type="button" className="fixed inset-0 z-30 cursor-default" onClick={() => setSortMenuOpen(false)} aria-label="Close sort menu" />
                  <div className="absolute left-0 top-full z-40 mt-2 w-64 rounded-md border border-border bg-background p-2 shadow-2xl">
                    <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sort</p>
                    <div className="space-y-0.5">
                      {SORT_FIELD_OPTIONS.map((option) => (
                        <button key={option.value} type="button" onClick={() => { setSortField(option.value); setSortMenuOpen(false); setActiveSavedFilterId(null); setActivePresetId(null) }} className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-foreground/80 hover:bg-card">
                          <span>{option.label}</span>
                          {sortField === option.value ? <Check className="h-3.5 w-3.5 text-primary/80" /> : null}
                        </button>
                      ))}
                    </div>
                    <div className="my-2 border-t border-border" />
                    <div className="space-y-0.5">
                      <button type="button" onClick={() => { setSortDirection('asc'); setSortMenuOpen(false); setActiveSavedFilterId(null); setActivePresetId(null) }} className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-foreground/80 hover:bg-card">
                        <span>Ascending</span>
                        {sortDirection === 'asc' ? <Check className="h-3.5 w-3.5 text-primary/80" /> : null}
                      </button>
                      <button type="button" onClick={() => { setSortDirection('desc'); setSortMenuOpen(false); setActiveSavedFilterId(null); setActivePresetId(null) }} className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-foreground/80 hover:bg-card">
                        <span>Descending</span>
                        {sortDirection === 'desc' ? <Check className="h-3.5 w-3.5 text-primary/80" /> : null}
                      </button>
                    </div>
                  </div>
                </>
              ) : null}

              <div className="relative">
                <button type="button" onClick={() => setFiltersOpen((prev) => !prev)} className={`inline-flex items-center gap-1 rounded border px-2.5 py-1.5 text-sm transition ${filtersOpen ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-card text-foreground/80 hover:border-border'}`}>
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

              <p className="hidden text-xs text-muted-foreground sm:block">{sortFieldLabel}</p>
            </div>

            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(event) => { setSearchQuery(event.target.value); setActiveSavedFilterId(null); setActivePresetId(null) }}
                placeholder="Search My Tasks..."
                className="w-full rounded border border-border bg-card py-1.5 pl-8 pr-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {visibleTasks.length === 0 ? (
            <ApexEmptyState icon={<ListTodo className="h-12 w-12" />} title="No tasks found" description="Try changing filters or search." />
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
              <div className="h-full overflow-hidden rounded-md border border-border bg-background/70">
                <MyTasksLeftQueue tasks={visibleTasks} selectedTaskId={selectedTask?.id || null} onSelectTask={(task) => setSelectedTaskId(task.id)} />
              </div>
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-background/70">
                <MyTasksRightContext task={selectedTask} tabs={DETAIL_TABS} activeTab={activeDetailTab} onTabChange={(tabId) => setActiveDetailTab(tabId as MyTasksDetailTab)} />
                <div className="min-h-0 flex-1">{renderRightPaneContent()}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </ApexPageShell>
  )
}
