'use client'

import Link from 'next/link'
import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Loader2, RefreshCw, Save, SlidersHorizontal } from 'lucide-react'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import { EntityTable } from '@/components/table/entity-table'
import type { TableColumn, TableSort } from '@/components/table/types'
import { createClient } from '@/lib/supabase/client'
import { getEntityColumns, getEntitySchema, type EntityKey, type SchemaField } from '@/lib/schema'
import { getCustomPage, updateCustomPage, type CustomPageRow } from '@/actions/custom-pages'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

type RuntimeEntityConfig = {
  table: string
  entityType: string
  label: string
  schemaKey: EntityKey | null
  defaultColumns: string[]
}

type FilterQueryLike = {
  eq: (column: string, value: unknown) => FilterQueryLike
  neq: (column: string, value: unknown) => FilterQueryLike
  gt: (column: string, value: unknown) => FilterQueryLike
  gte: (column: string, value: unknown) => FilterQueryLike
  lt: (column: string, value: unknown) => FilterQueryLike
  lte: (column: string, value: unknown) => FilterQueryLike
  ilike: (column: string, value: string) => FilterQueryLike
  in: (column: string, values: unknown[]) => FilterQueryLike
  contains: (column: string, value: unknown) => FilterQueryLike
  overlaps: (column: string, values: unknown[]) => FilterQueryLike
  is: (column: string, value: unknown) => FilterQueryLike
  order: (column: string, options: { ascending: boolean }) => FilterQueryLike
}

const DEFAULT_LIMIT = 500
const MAX_LIMIT = 2000
const FILTER_OPERATOR_OPTIONS = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not Equals' },
  { value: 'ilike', label: 'Contains' },
  { value: 'in', label: 'In List' },
]

const SCHEMA_ENTITY_CONFIG: Record<string, RuntimeEntityConfig> = {
  tasks: {
    table: 'tasks',
    entityType: 'tasks',
    label: 'Tasks',
    schemaKey: 'task',
    defaultColumns: [
      'name',
      'status',
      'project_id',
      'entity_type',
      'entity_id',
      'assigned_to',
      'start_date',
      'due_date',
      'updated_at',
    ],
  },
  task: {
    table: 'tasks',
    entityType: 'tasks',
    label: 'Tasks',
    schemaKey: 'task',
    defaultColumns: [
      'name',
      'status',
      'project_id',
      'entity_type',
      'entity_id',
      'assigned_to',
      'start_date',
      'due_date',
      'updated_at',
    ],
  },
  published_files: {
    table: 'published_files',
    entityType: 'published_files',
    label: 'Published Files',
    schemaKey: 'published_file',
    defaultColumns: [
      'code',
      'name',
      'status',
      'project_id',
      'entity_type',
      'entity_id',
      'file_type',
      'published_by',
      'created_at',
    ],
  },
  'published-files': {
    table: 'published_files',
    entityType: 'published_files',
    label: 'Published Files',
    schemaKey: 'published_file',
    defaultColumns: [
      'code',
      'name',
      'status',
      'project_id',
      'entity_type',
      'entity_id',
      'file_type',
      'published_by',
      'created_at',
    ],
  },
  published_file: {
    table: 'published_files',
    entityType: 'published_files',
    label: 'Published Files',
    schemaKey: 'published_file',
    defaultColumns: [
      'code',
      'name',
      'status',
      'project_id',
      'entity_type',
      'entity_id',
      'file_type',
      'published_by',
      'created_at',
    ],
  },
  publishes: {
    table: 'published_files',
    entityType: 'published_files',
    label: 'Published Files',
    schemaKey: 'published_file',
    defaultColumns: [
      'code',
      'name',
      'status',
      'project_id',
      'entity_type',
      'entity_id',
      'file_type',
      'published_by',
      'created_at',
    ],
  },
  versions: {
    table: 'versions',
    entityType: 'versions',
    label: 'Versions',
    schemaKey: 'version',
    defaultColumns: [
      'code',
      'name',
      'status',
      'project_id',
      'entity_type',
      'entity_id',
      'version_number',
      'created_by',
      'created_at',
    ],
  },
  version: {
    table: 'versions',
    entityType: 'versions',
    label: 'Versions',
    schemaKey: 'version',
    defaultColumns: [
      'code',
      'name',
      'status',
      'project_id',
      'entity_type',
      'entity_id',
      'version_number',
      'created_by',
      'created_at',
    ],
  },
  assets: {
    table: 'assets',
    entityType: 'assets',
    label: 'Assets',
    schemaKey: 'asset',
    defaultColumns: ['name', 'code', 'status', 'project_id', 'asset_type', 'updated_at'],
  },
  asset: {
    table: 'assets',
    entityType: 'assets',
    label: 'Assets',
    schemaKey: 'asset',
    defaultColumns: ['name', 'code', 'status', 'project_id', 'asset_type', 'updated_at'],
  },
  sequences: {
    table: 'sequences',
    entityType: 'sequences',
    label: 'Sequences',
    schemaKey: 'sequence',
    defaultColumns: ['name', 'code', 'status', 'project_id', 'updated_at'],
  },
  sequence: {
    table: 'sequences',
    entityType: 'sequences',
    label: 'Sequences',
    schemaKey: 'sequence',
    defaultColumns: ['name', 'code', 'status', 'project_id', 'updated_at'],
  },
  shots: {
    table: 'shots',
    entityType: 'shots',
    label: 'Shots',
    schemaKey: 'shot',
    defaultColumns: ['name', 'code', 'status', 'project_id', 'sequence_id', 'updated_at'],
  },
  shot: {
    table: 'shots',
    entityType: 'shots',
    label: 'Shots',
    schemaKey: 'shot',
    defaultColumns: ['name', 'code', 'status', 'project_id', 'sequence_id', 'updated_at'],
  },
  notes: {
    table: 'notes',
    entityType: 'notes',
    label: 'Notes',
    schemaKey: 'note',
    defaultColumns: ['subject', 'status', 'project_id', 'entity_type', 'entity_id', 'created_at'],
  },
  note: {
    table: 'notes',
    entityType: 'notes',
    label: 'Notes',
    schemaKey: 'note',
    defaultColumns: ['subject', 'status', 'project_id', 'entity_type', 'entity_id', 'created_at'],
  },
  playlists: {
    table: 'playlists',
    entityType: 'playlists',
    label: 'Playlists',
    schemaKey: null,
    defaultColumns: ['name', 'code', 'status', 'project_id', 'created_at', 'updated_at'],
  },
}

function asText(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return String(value)
}

function asInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number.parseInt(trimmed, 10)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function parseProjectIdsCsv(value: string): number[] {
  return uniqueStrings(value.split(',').map((entry) => entry.trim()))
    .map((entry) => Number.parseInt(entry, 10))
    .filter((entry) => Number.isFinite(entry) && entry > 0)
}

function stringifyFilterValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((entry) => asText(entry).trim()).filter(Boolean).join(', ')
  }
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return asText(value)
}

function parseFilterInputValue(rawValue: string, operator: string): unknown {
  const trimmed = rawValue.trim()
  if (!trimmed) return null
  if (operator === 'in') {
    return trimmed
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const numeric = Number(trimmed)
    if (Number.isFinite(numeric)) return numeric
  }
  if (trimmed.toLowerCase() === 'true') return true
  if (trimmed.toLowerCase() === 'false') return false
  return trimmed
}

function normalizeEntityConfig(rawEntityType: unknown): RuntimeEntityConfig | null {
  const key = asText(rawEntityType).trim().toLowerCase()
  if (!key) return null
  return SCHEMA_ENTITY_CONFIG[key] || null
}

function toTitleCaseColumn(columnId: string): string {
  return columnId
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function mapSchemaFieldToColumnType(field: SchemaField): TableColumn['type'] {
  const dataType = field.dataType.toLowerCase()
  if (dataType === 'checkbox') return 'boolean'
  if (dataType === 'date') return 'date'
  if (dataType === 'date_time') return 'datetime'
  if (dataType === 'number' || dataType === 'float' || dataType === 'duration' || dataType === 'percent') {
    return 'number'
  }
  if (dataType === 'url') return 'url'
  if (dataType === 'status_list') return 'status'
  if (dataType === 'serializable') return 'json'
  return 'text'
}

function mapDefaultDataTypeForColumn(columnId: string): TableColumn['type'] {
  const lower = columnId.toLowerCase()
  if (lower.endsWith('_at') || lower.includes('datetime')) return 'datetime'
  if (lower.includes('date')) return 'date'
  if (
    lower.endsWith('_id') ||
    lower === 'id' ||
    lower.includes('count') ||
    lower.includes('number') ||
    lower.includes('size')
  ) {
    return 'number'
  }
  if (lower.includes('url') || lower.includes('link') || lower.includes('path')) return 'url'
  if (lower.startsWith('is_') || lower.startsWith('has_')) return 'boolean'
  if (lower === 'status') return 'status'
  return 'text'
}

function buildInitialColumns(config: RuntimeEntityConfig, rows: Record<string, unknown>[]): TableColumn[] {
  if (config.schemaKey) {
    const schema = getEntitySchema(config.schemaKey)
    const fieldByColumn = new Map<string, SchemaField>()
    for (const field of schema.fields) {
      if (field.virtual || !field.column) continue
      fieldByColumn.set(field.column, field)
    }

    const preferred = uniqueStrings(config.defaultColumns)
    const fallback = schema.fields
      .filter((field) => !field.virtual && field.column)
      .map((field) => field.column as string)
    const candidateColumns = uniqueStrings([...preferred, ...fallback])

    const columns: TableColumn[] = []
    for (const columnId of candidateColumns) {
      const field = fieldByColumn.get(columnId)
      if (!field) continue
      columns.push({
        id: columnId,
        label: field.name || toTitleCaseColumn(columnId),
        type: mapSchemaFieldToColumnType(field),
      })
      if (columns.length >= 16) break
    }

    return columns
  }

  const rowColumns =
    rows.length > 0
      ? Object.keys(rows[0]).filter((columnId) => !columnId.startsWith('_'))
      : []

  const candidates = uniqueStrings([...config.defaultColumns, ...rowColumns])
  return candidates.slice(0, 16).map((columnId) => ({
    id: columnId,
    label: toTitleCaseColumn(columnId),
    type: mapDefaultDataTypeForColumn(columnId),
  }))
}

function isSortDirection(value: unknown): value is 'asc' | 'desc' {
  return value === 'asc' || value === 'desc'
}

function normalizeSortPreference(
  value: unknown,
  allowedColumnIds: Set<string>
): TableSort | null {
  if (!value) return null

  let raw: unknown = value
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return null
    if (trimmed.includes(':')) {
      const [idPart, dirPart] = trimmed.split(':')
      const id = asText(idPart).trim()
      const direction = asText(dirPart).trim().toLowerCase()
      if (!id || !allowedColumnIds.has(id) || !isSortDirection(direction)) return null
      return { id, direction }
    }

    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        raw = JSON.parse(trimmed)
      } catch {
        return null
      }
    } else {
      return null
    }
  }

  if (!raw || typeof raw !== 'object') return null
  const sortRecord = raw as Record<string, unknown>
  const id = asText(sortRecord.id).trim()
  const direction = asText(sortRecord.direction).trim().toLowerCase()
  if (!id || !allowedColumnIds.has(id) || !isSortDirection(direction)) return null
  return { id, direction }
}

function normalizeGroupPreference(
  value: unknown,
  allowedColumnIds: Set<string>
): string | null {
  const next = asText(value).trim()
  if (!next) return null
  return allowedColumnIds.has(next) ? next : null
}

function normalizeVisibilityList(
  value: unknown,
  allowedColumnIds: Set<string>,
  fallback: string[]
): string[] {
  if (!Array.isArray(value)) {
    return fallback.filter((columnId) => allowedColumnIds.has(columnId))
  }
  const normalized = uniqueStrings(value.map((entry) => asText(entry)))
  const filtered = normalized.filter((columnId) => allowedColumnIds.has(columnId))
  return filtered.length > 0 ? filtered : fallback.filter((columnId) => allowedColumnIds.has(columnId))
}

function normalizeColumnOrder(
  value: unknown,
  allowedColumnIds: Set<string>,
  fallback: string[]
): string[] {
  const preferred = Array.isArray(value)
    ? uniqueStrings(value.map((entry) => asText(entry))).filter((columnId) => allowedColumnIds.has(columnId))
    : []

  const next = [...preferred]
  for (const columnId of fallback) {
    if (!allowedColumnIds.has(columnId)) continue
    if (next.includes(columnId)) continue
    next.push(columnId)
  }
  return next
}

function normalizeLimit(definition: Record<string, unknown>): number {
  const direct = asInt(definition.limit)
  if (direct !== null) {
    return Math.max(1, Math.min(MAX_LIMIT, direct))
  }
  return DEFAULT_LIMIT
}

function hasDefinitionOrderBy(definition: Record<string, unknown>): boolean {
  const orderBy = asRecord(definition.order_by)
  const column = asText(orderBy.column).trim()
  return Boolean(column)
}

function normalizeFilterOperator(value: unknown): string {
  return asText(value).trim().toLowerCase() || 'eq'
}

function normalizeEditorFilterOperator(value: unknown): string {
  const normalized = normalizeFilterOperator(value)
  if (normalized === 'eq' || normalized === 'neq' || normalized === 'ilike' || normalized === 'in') {
    return normalized
  }
  return 'eq'
}

function applyDefinitionFilters<T extends FilterQueryLike>(
  query: T,
  definition: Record<string, unknown>,
  allowedColumnIds: Set<string>
): T {
  let next: FilterQueryLike = query

  const projectId = asInt(definition.project_id)
  if (projectId !== null && allowedColumnIds.has('project_id')) {
    next = next.eq('project_id', projectId)
  }

  const projectIdsRaw = Array.isArray(definition.project_ids) ? definition.project_ids : []
  const projectIds = uniqueStrings(projectIdsRaw.map((value) => asText(value)))
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value) && value > 0)
  if (projectIds.length > 0 && allowedColumnIds.has('project_id')) {
    next = next.in('project_id', projectIds)
  }

  const filters = Array.isArray(definition.filters) ? definition.filters : []
  for (const filterRaw of filters) {
    const filter = asRecord(filterRaw)
    const column = asText(filter.column).trim()
    if (!column || !allowedColumnIds.has(column)) continue

    const op = normalizeFilterOperator(filter.op || filter.operator)
    const value = filter.value

    if (op === 'eq') {
      next = next.eq(column, value)
      continue
    }
    if (op === 'neq') {
      next = next.neq(column, value)
      continue
    }
    if (op === 'gt') {
      next = next.gt(column, value)
      continue
    }
    if (op === 'gte') {
      next = next.gte(column, value)
      continue
    }
    if (op === 'lt') {
      next = next.lt(column, value)
      continue
    }
    if (op === 'lte') {
      next = next.lte(column, value)
      continue
    }
    if (op === 'ilike') {
      const pattern = asText(value).trim()
      if (!pattern) continue
      next = next.ilike(column, pattern.includes('%') ? pattern : `%${pattern}%`)
      continue
    }
    if (op === 'in' && Array.isArray(value) && value.length > 0) {
      next = next.in(column, value)
      continue
    }
    if ((op === 'contains' || op === 'cs') && value !== undefined) {
      next = next.contains(column, value)
      continue
    }
    if ((op === 'overlaps' || op === 'ov') && Array.isArray(value) && value.length > 0) {
      next = next.overlaps(column, value)
      continue
    }
    if (op === 'is') {
      next = next.is(column, value)
      continue
    }
  }

  const orderBy = asRecord(definition.order_by)
  const orderByColumn = asText(orderBy.column).trim()
  if (orderByColumn && allowedColumnIds.has(orderByColumn)) {
    const ascending = asText(orderBy.direction).trim().toLowerCase() !== 'desc'
    next = next.order(orderByColumn, { ascending })
  }

  return next as T
}

function buildStorageSeedPayload(
  page: CustomPageRow,
  allowedColumnIds: Set<string>,
  baseColumnIds: string[]
) {
  const defaultState = asRecord(page.default_state)
  const fallbackVisible = baseColumnIds.filter((columnId) => allowedColumnIds.has(columnId))
  const visibleColumns = normalizeVisibilityList(
    defaultState.visible_columns,
    allowedColumnIds,
    fallbackVisible
  )
  const columnOrder = normalizeColumnOrder(
    defaultState.column_order,
    allowedColumnIds,
    visibleColumns
  )
  const sort = normalizeSortPreference(defaultState.sort, allowedColumnIds)
  const groupBy =
    normalizeGroupPreference(defaultState.group_by, allowedColumnIds) ||
    normalizeGroupPreference(defaultState.groupBy, allowedColumnIds)

  return {
    columnOrder,
    columnWidths:
      defaultState.column_widths && typeof defaultState.column_widths === 'object'
        ? defaultState.column_widths
        : {},
    visibleColumns,
    sort,
    groupBy,
    view: 'list',
    pageSize: Math.max(25, Math.min(250, asInt(defaultState.page_size) || 50)),
    pinnedColumns: Array.isArray(defaultState.pinned_columns)
      ? uniqueStrings(defaultState.pinned_columns.map((value) => asText(value))).filter((columnId) =>
          allowedColumnIds.has(columnId)
        )
      : [],
    activeFilterColumns: Array.isArray(defaultState.active_filter_columns)
      ? uniqueStrings(defaultState.active_filter_columns.map((value) => asText(value))).filter((columnId) =>
          allowedColumnIds.has(columnId)
        )
      : [],
    activeFilters:
      defaultState.active_filters && typeof defaultState.active_filters === 'object'
        ? defaultState.active_filters
        : {},
  }
}

export default function CustomPageRuntime({
  params,
}: {
  params: Promise<{ pageId: string }>
}) {
  const [resolvedPageId, setResolvedPageId] = useState<number | null>(null)
  const [page, setPage] = useState<CustomPageRow | null>(null)
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [columns, setColumns] = useState<TableColumn[]>([])
  const [config, setConfig] = useState<RuntimeEntityConfig | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSavingDefaults, setIsSavingDefaults] = useState(false)
  const [reloadVersion, setReloadVersion] = useState(0)
  const [configureOpen, setConfigureOpen] = useState(false)
  const [isSavingDefinition, setIsSavingDefinition] = useState(false)
  const [queryProjectId, setQueryProjectId] = useState('')
  const [queryProjectIdsCsv, setQueryProjectIdsCsv] = useState('')
  const [queryFilterColumn, setQueryFilterColumn] = useState('')
  const [queryFilterOperator, setQueryFilterOperator] = useState('eq')
  const [queryFilterValue, setQueryFilterValue] = useState('')
  const [queryOrderByColumn, setQueryOrderByColumn] = useState('')
  const [queryOrderDirection, setQueryOrderDirection] = useState<'asc' | 'desc'>('desc')
  const [queryLimit, setQueryLimit] = useState(String(DEFAULT_LIMIT))

  useEffect(() => {
    params.then((value) => {
      const parsed = Number.parseInt(value.pageId, 10)
      setResolvedPageId(Number.isNaN(parsed) ? null : parsed)
    })
  }, [params])

  useEffect(() => {
    let active = true

    async function load() {
      if (resolvedPageId === null) {
        setLoading(false)
        setError('Invalid custom page id.')
        return
      }

      setLoading(true)
      setError(null)

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!active) return
      setCurrentUserId(user?.id || null)

      const pageResult = await getCustomPage(resolvedPageId)
      if (!active) return
      if (pageResult.error || !pageResult.data) {
        setPage(null)
        setRows([])
        setColumns([])
        setConfig(null)
        setError(pageResult.error || 'Custom page not found.')
        setLoading(false)
        return
      }

      const nextPage = pageResult.data
      const nextConfig = normalizeEntityConfig(nextPage.entity_type)
      if (!nextConfig) {
        setPage(nextPage)
        setRows([])
        setColumns([])
        setConfig(null)
        setError(`Unsupported entity type "${nextPage.entity_type}" for runtime page.`)
        setLoading(false)
        return
      }

      let query = supabase.from(nextConfig.table).select('*')
      const allowedColumnIds =
        nextConfig.schemaKey !== null
          ? getEntityColumns(nextConfig.schemaKey)
          : new Set<string>(nextConfig.defaultColumns)

      const definition = asRecord(nextPage.definition)
      query = applyDefinitionFilters(query, definition, allowedColumnIds)

      if (!hasDefinitionOrderBy(definition) && allowedColumnIds.has('updated_at')) {
        query = query.order('updated_at', { ascending: false })
      } else if (!hasDefinitionOrderBy(definition) && allowedColumnIds.has('created_at')) {
        query = query.order('created_at', { ascending: false })
      }

      const limit = normalizeLimit(definition)
      query = query.range(0, limit - 1)

      const { data, error: dataError } = await query
      if (!active) return
      if (dataError) {
        setPage(nextPage)
        setRows([])
        setColumns([])
        setConfig(nextConfig)
        setError(dataError.message)
        setLoading(false)
        return
      }

      const normalizedRows = ((data || []) as Record<string, unknown>[]).map((row) => ({ ...row }))
      const initialColumns = buildInitialColumns(nextConfig, normalizedRows)

      setPage(nextPage)
      setConfig(nextConfig)
      setRows(normalizedRows)
      setColumns(initialColumns)
      setLoading(false)
    }

    void load()
    return () => {
      active = false
    }
  }, [reloadVersion, resolvedPageId])

  const preferenceScope = useMemo(
    () => (page ? `custom_page:${page.id}` : ''),
    [page]
  )

  useLayoutEffect(() => {
    if (!page || !config || !preferenceScope) return

    const allowedColumnIds =
      config.schemaKey !== null
        ? getEntityColumns(config.schemaKey)
        : new Set<string>(columns.map((column) => column.id))

    const baseColumnIds = columns.map((column) => column.id)
    const payload = buildStorageSeedPayload(page, allowedColumnIds, baseColumnIds)
    const storageKey = `kong.table.${preferenceScope}`

    try {
      const existing = window.localStorage.getItem(storageKey)
      if (!existing) {
        window.localStorage.setItem(storageKey, JSON.stringify(payload))
      }
    } catch {
      // ignore local storage failures
    }
  }, [columns, config, page, preferenceScope])

  const canSaveDefaults = Boolean(page && currentUserId && page.owner_id === currentUserId)
  const canConfigureQuery = canSaveDefaults
  const filterColumnOptions = useMemo(() => {
    if (!config) return []
    if (config.schemaKey) {
      return getEntitySchema(config.schemaKey).fields
        .filter((field) => !field.virtual && field.column)
        .map((field) => ({
          value: field.column as string,
          label: field.name || toTitleCaseColumn(field.column as string),
        }))
    }
    return columns.map((column) => ({ value: column.id, label: column.label }))
  }, [columns, config])

  function openConfigureQuery() {
    if (!page) return
    const definition = asRecord(page.definition)
    const firstFilter = Array.isArray(definition.filters) ? asRecord(definition.filters[0]) : {}
    const orderBy = asRecord(definition.order_by)
    const parsedProjectId = asInt(definition.project_id)
    const parsedProjectIds = Array.isArray(definition.project_ids)
      ? definition.project_ids
          .map((entry) => asInt(entry))
          .filter((entry): entry is number => entry !== null && entry > 0)
      : []

    setQueryProjectId(parsedProjectId === null ? '' : String(parsedProjectId))
    setQueryProjectIdsCsv(parsedProjectIds.join(', '))
    setQueryFilterColumn(asText(firstFilter.column).trim())
    setQueryFilterOperator(normalizeEditorFilterOperator(firstFilter.op || firstFilter.operator))
    setQueryFilterValue(stringifyFilterValue(firstFilter.value))
    setQueryOrderByColumn(asText(orderBy.column).trim())
    setQueryOrderDirection(asText(orderBy.direction).trim().toLowerCase() === 'asc' ? 'asc' : 'desc')
    setQueryLimit(String(normalizeLimit(definition)))
    setConfigureOpen(true)
  }

  async function handleSaveDefinition() {
    if (!page) return
    setIsSavingDefinition(true)
    setError(null)

    const definition: Record<string, unknown> = {
      limit: Math.max(1, Math.min(MAX_LIMIT, Number.parseInt(queryLimit.trim(), 10) || DEFAULT_LIMIT)),
    }

    const parsedProjectId = Number.parseInt(queryProjectId.trim(), 10)
    if (Number.isFinite(parsedProjectId) && parsedProjectId > 0) {
      definition.project_id = parsedProjectId
    }

    const parsedProjectIds = parseProjectIdsCsv(queryProjectIdsCsv)
    if (parsedProjectIds.length > 0) {
      definition.project_ids = parsedProjectIds
    }

    const filterColumn = queryFilterColumn.trim()
    const normalizedOperator = normalizeEditorFilterOperator(queryFilterOperator)
    const filterValue = parseFilterInputValue(queryFilterValue, normalizedOperator)
    if (filterColumn && filterValue !== null) {
      definition.filters = [
        {
          column: filterColumn,
          op: normalizedOperator,
          value: filterValue,
        },
      ]
    }

    const orderByColumn = queryOrderByColumn.trim()
    if (orderByColumn) {
      definition.order_by = {
        column: orderByColumn,
        direction: queryOrderDirection,
      }
    }

    const result = await updateCustomPage(page.id, { definition })
    setIsSavingDefinition(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setConfigureOpen(false)
    if (result.data) {
      setPage(result.data)
    }
    setReloadVersion((previous) => previous + 1)
  }

  function handleRefreshData() {
    setReloadVersion((previous) => previous + 1)
  }

  async function handleSaveDefaults() {
    if (!page || !preferenceScope) return
    setIsSavingDefaults(true)
    setError(null)

    let payload: Record<string, unknown> | null = null
    try {
      const storageKey = `kong.table.${preferenceScope}`
      const raw = window.localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          payload = parsed as Record<string, unknown>
        }
      }
    } catch {
      payload = null
    }

    if (!payload) {
      setIsSavingDefaults(false)
      setError('No local page state found to save.')
      return
    }

    const result = await updateCustomPage(page.id, { default_state: payload })
    setIsSavingDefaults(false)

    if (result.error) {
      setError(result.error)
      return
    }

    if (result.data) {
      setPage(result.data)
    }
  }

  if (loading) {
    return (
      <ApexPageShell title="Custom Page">
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading custom page...
        </div>
      </ApexPageShell>
    )
  }

  if (!page || !config) {
    return (
      <ApexPageShell title="Custom Page">
        <ApexEmptyState
          icon={<AlertTriangle className="h-10 w-10" />}
          title="Page unavailable"
          description={error || 'Unable to load this custom page.'}
          action={
            <Link
              href="/pages"
              className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm text-foreground/80 transition hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to All Pages
            </Link>
          }
        />
      </ApexPageShell>
    )
  }

  const rowCount = rows.length
  const datasetLabel = config.label

  return (
    <>
      <ApexPageShell
        title={page.name}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/pages"
              className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm text-foreground/80 transition hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              All Pages
            </Link>
            <button
              type="button"
              onClick={handleRefreshData}
              className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm text-foreground/80 transition hover:text-foreground"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </button>
            {canConfigureQuery ? (
              <button
                type="button"
                onClick={openConfigureQuery}
                className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm text-foreground/80 transition hover:text-foreground"
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Configure Query
              </button>
            ) : null}
            {canSaveDefaults ? (
              <button
                type="button"
                onClick={() => void handleSaveDefaults()}
                disabled={isSavingDefaults}
                className="inline-flex items-center rounded-md border border-primary/50 px-3 py-2 text-sm text-primary/90 transition hover:text-primary disabled:opacity-70"
              >
                {isSavingDefaults ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Defaults
              </button>
            ) : null}
          </div>
        }
      >
        {error ? (
          <div className="mb-4 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-300">
            {error}
          </div>
        ) : null}

        <div className="mb-4 rounded-md border border-border bg-card/20 px-4 py-3 text-xs text-muted-foreground">
          {datasetLabel} • {rowCount} rows • visibility: {page.visibility} • scope: {page.scope_type}
        </div>

        <EntityTable
          columns={columns}
          data={rows}
          entityType={config.entityType}
          preferenceScope={preferenceScope}
          csvExportFilename={`custom-page-${page.slug || page.id}`}
          groupBy={normalizeGroupPreference(
            asRecord(page.default_state).group_by || asRecord(page.default_state).groupBy,
            new Set(columns.map((column) => column.id))
          )}
        />
      </ApexPageShell>

      <Dialog open={configureOpen} onOpenChange={setConfigureOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-full max-w-2xl border-border bg-background p-0 text-foreground"
        >
          <div className="border-b border-border px-6 py-4">
            <DialogTitle className="text-2xl font-semibold text-foreground">
              Configure Query
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Update scope filters, dataset limit, and query ordering for this custom page.
            </DialogDescription>
          </div>

          <div className="space-y-4 px-6 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block text-foreground/80">Project ID (single)</span>
                <input
                  type="number"
                  min={1}
                  value={queryProjectId}
                  onChange={(event) => setQueryProjectId(event.target.value)}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="7"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1.5 block text-foreground/80">Project IDs (comma-separated)</span>
                <input
                  type="text"
                  value={queryProjectIdsCsv}
                  onChange={(event) => setQueryProjectIdsCsv(event.target.value)}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="7, 9, 12"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="mb-1.5 block text-foreground/80">Filter Column</span>
                <select
                  value={queryFilterColumn}
                  onChange={(event) => setQueryFilterColumn(event.target.value)}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">None</option>
                  {filterColumnOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1.5 block text-foreground/80">Operator</span>
                <select
                  value={queryFilterOperator}
                  onChange={(event) => setQueryFilterOperator(event.target.value)}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {FILTER_OPERATOR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1.5 block text-foreground/80">Filter Value</span>
                <input
                  type="text"
                  value={queryFilterValue}
                  onChange={(event) => setQueryFilterValue(event.target.value)}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder={queryFilterOperator === 'in' ? 'anim, comp' : 'anim'}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1.5 block text-foreground/80">Order By</span>
                <select
                  value={queryOrderByColumn}
                  onChange={(event) => setQueryOrderByColumn(event.target.value)}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Default</option>
                  {filterColumnOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1.5 block text-foreground/80">Direction</span>
                <select
                  value={queryOrderDirection}
                  onChange={(event) =>
                    setQueryOrderDirection(event.target.value === 'asc' ? 'asc' : 'desc')
                  }
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="desc">Desc</option>
                  <option value="asc">Asc</option>
                </select>
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1.5 block text-foreground/80">Row Limit</span>
              <input
                type="number"
                min={1}
                max={MAX_LIMIT}
                value={queryLimit}
                onChange={(event) => setQueryLimit(event.target.value)}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-3">
            <button
              type="button"
              onClick={() => setConfigureOpen(false)}
              className="rounded-md border border-border px-3 py-2 text-sm text-foreground/80 transition hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSaveDefinition()}
              disabled={isSavingDefinition}
              className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-black transition hover:bg-primary disabled:opacity-70"
            >
              {isSavingDefinition ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Query
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
