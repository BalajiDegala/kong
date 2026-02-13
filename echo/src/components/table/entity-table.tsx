'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import { TableToolbar } from './table-toolbar'
import type { TableColumn, TableSort } from './types'
import { createClient } from '@/lib/supabase/client'
import { getEntitySchema, type EntityKey, type SchemaField } from '@/lib/schema'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const DATE_ONLY_VALUE = /^\d{4}-\d{2}-\d{2}$/
let userTablePreferencesAvailable: boolean | null = null

function isMissingUserTablePreferencesTable(error: any): boolean {
  if (!error) return false
  const code = String(error.code || '')
  const message = String(error.message || '').toLowerCase()
  const details = String(error.details || '').toLowerCase()
  return (
    code === 'PGRST205' ||
    message.includes('user_table_preferences') ||
    details.includes('user_table_preferences') ||
    message.includes('does not exist')
  )
}

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function inferTemporalKind(column: TableColumn): 'date' | 'datetime' | null {
  if (column.type === 'date' || column.editor === 'date') return 'date'
  if (column.type === 'datetime' || column.editor === 'datetime') return 'datetime'

  const id = column.id.toLowerCase()
  if (id.endsWith('_at')) return 'datetime'
  if (id === 'date_viewed' || id.endsWith('_time')) return 'datetime'
  if (id.includes('date')) return 'date'
  return null
}

function toDateInputValue(rawValue: any): string {
  if (rawValue === null || rawValue === undefined || rawValue === '') return ''
  if (typeof rawValue === 'string' && DATE_ONLY_VALUE.test(rawValue)) return rawValue
  const parsed = new Date(rawValue)
  if (Number.isNaN(parsed.getTime())) return ''
  return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`
}

function toDateTimeLocalInputValue(rawValue: any): string {
  if (rawValue === null || rawValue === undefined || rawValue === '') return ''
  const parsed = new Date(rawValue)
  if (Number.isNaN(parsed.getTime())) return ''
  return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}T${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`
}

function resolveInputType(column: TableColumn): React.HTMLInputTypeAttribute {
  const temporal = inferTemporalKind(column)
  if (temporal === 'date') return 'date'
  if (temporal === 'datetime') return 'datetime-local'

  if (column.editor === 'color' || column.type === 'color') return 'color'
  if (column.editor === 'url' || column.type === 'url') return 'url'
  if (column.editor === 'number' || column.type === 'number') return 'number'

  return 'text'
}

const NON_EDITABLE_SCHEMA_COLUMNS = new Set([
  'id',
  'project_id',
  'entity_type',
  'entity_id',
  'created_by',
  'updated_by',
  'author_id',
  'artist_id',
  'published_by',
  'created_at',
  'updated_at',
])

function listToString(value: any) {
  return Array.isArray(value) ? value.join(', ') : ''
}

function stringToList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function isLikelyUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function unknownToStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    return stringToList(value)
  }
  return []
}

function resolveSchemaEntityKey(entityType: string): EntityKey | null {
  const normalized = entityType.toLowerCase()

  if (
    normalized.startsWith('publishes') ||
    normalized.startsWith('published_files') ||
    normalized.startsWith('published-files')
  ) {
    return 'published_file'
  }
  if (normalized === 'published_file') return 'published_file'
  if (normalized.startsWith('assets')) return 'asset'
  if (normalized === 'asset') return 'asset'
  if (normalized.startsWith('shots')) return 'shot'
  if (normalized === 'shot') return 'shot'
  if (normalized.startsWith('sequences')) return 'sequence'
  if (normalized === 'sequence') return 'sequence'
  if (normalized.startsWith('tasks')) return 'task'
  if (normalized === 'task') return 'task'
  if (normalized.startsWith('versions')) return 'version'
  if (normalized === 'version') return 'version'
  if (normalized.startsWith('notes')) return 'note'
  if (normalized === 'note') return 'note'

  return null
}

function inferSchemaColumnType(field: SchemaField): TableColumn['type'] {
  const dataType = field.dataType.toLowerCase()

  if (dataType === 'checkbox') return 'boolean'
  if (dataType === 'date') return 'date'
  if (dataType === 'date_time') return 'datetime'
  if (
    dataType === 'number' ||
    dataType === 'float' ||
    dataType === 'duration' ||
    dataType === 'percent'
  ) {
    return 'number'
  }
  if (dataType === 'serializable') return 'json'
  if (dataType === 'url') return 'url'
  if (dataType === 'color') return 'color'
  if (dataType === 'status_list') return 'status'
  if (dataType === 'image') {
    if (field.column?.includes('thumbnail')) return 'thumbnail'
    return 'url'
  }

  return 'text'
}

function inferSchemaColumnEditor(
  field: SchemaField,
  editable: boolean
): TableColumn['editor'] | undefined {
  if (!editable) return undefined
  const dataType = field.dataType.toLowerCase()

  if (dataType === 'checkbox') return 'checkbox'
  if (dataType === 'date') return 'date'
  if (dataType === 'date_time') return 'datetime'
  if (
    dataType === 'number' ||
    dataType === 'float' ||
    dataType === 'duration' ||
    dataType === 'percent'
  ) {
    return 'number'
  }
  if (dataType === 'url') return 'url'
  if (dataType === 'color') return 'color'
  if (dataType === 'serializable') return 'textarea'
  if (/description|content|notes|comments|brief/i.test(field.name)) return 'textarea'

  return 'text'
}

interface RuntimeSchemaFieldRow {
  column_name?: string | null
  name?: string | null
  code?: string | null
  data_type?: string | null
  field_type?: string | null
}

function isMissingRuntimeSchema(error: any): boolean {
  if (!error) return false
  const code = String(error.code || '')
  const message = String(error.message || '').toLowerCase()
  const details = String(error.details || '').toLowerCase()
  return (
    code === 'PGRST205' ||
    message.includes('schema_field_runtime_v') ||
    details.includes('schema_field_runtime_v') ||
    message.includes('does not exist')
  )
}

function toRuntimeSchemaField(row: RuntimeSchemaFieldRow): SchemaField | null {
  const columnName =
    typeof row.column_name === 'string' ? row.column_name.trim() : ''
  if (!columnName) return null

  const fieldName = typeof row.name === 'string' && row.name.trim()
    ? row.name.trim()
    : columnName
  const dataType = typeof row.data_type === 'string' && row.data_type.trim()
    ? row.data_type.trim().toLowerCase()
    : 'text'
  const fieldType = typeof row.field_type === 'string' && row.field_type.trim()
    ? row.field_type.trim().toLowerCase()
    : 'dynamic'
  const code =
    typeof row.code === 'string' && row.code.trim()
      ? row.code.trim().toLowerCase()
      : columnName

  return {
    name: fieldName,
    dataType,
    fieldType,
    code,
    column: columnName,
    pgType: null,
    defaultSql: null,
    virtual: false,
  }
}

function buildSchemaColumn(field: SchemaField): TableColumn | null {
  if (!field.column || field.virtual) return null

  const editable =
    field.fieldType !== 'system_owned' &&
    !NON_EDITABLE_SCHEMA_COLUMNS.has(field.column)

  const column: TableColumn = {
    id: field.column,
    label: field.name,
    type: inferSchemaColumnType(field),
    width: '160px',
    editable,
  }

  const editor = inferSchemaColumnEditor(field, editable)
  if (editor) {
    column.editor = editor
  }

  if (field.dataType.toLowerCase() === 'multi_entity') {
    column.formatValue = listToString
    column.parseValue = stringToList
  }

  return column
}

function shouldSkipSchemaColumn(field: SchemaField, existing: Set<string>): boolean {
  const column = field.column
  if (!column) return false
  if (!column.endsWith('_id')) return false

  const base = column.slice(0, -3)
  if (!base) return false

  // If a human-readable label column is already explicitly configured
  // (e.g. sequence_label), hide the raw numeric/UUID id schema column.
  return existing.has(`${base}_label`)
}

function withSchemaColumns(
  columns: TableColumn[],
  entityType: string,
  runtimeFields: SchemaField[] = []
): TableColumn[] {
  const schemaEntity = resolveSchemaEntityKey(entityType)
  if (!schemaEntity) return columns

  const existing = new Set(columns.map((column) => column.id))
  const schemaColumns: TableColumn[] = []
  const schema = getEntitySchema(schemaEntity)
  const mergedFields = [...schema.fields, ...runtimeFields]

  for (const field of mergedFields) {
    const column = buildSchemaColumn(field)
    if (!column) continue
    if (existing.has(column.id)) continue
    if (shouldSkipSchemaColumn(field, existing)) continue
    schemaColumns.push(column)
    existing.add(column.id)
  }

  return [...columns, ...schemaColumns]
}

function buildVisibleColumnSet(
  allColumns: TableColumn[],
  savedVisible?: string[],
  savedOrder?: string[]
): Set<string> {
  const allIds = allColumns.map((column) => column.id)
  const allowed = new Set(allIds)
  const knownAtSave = new Set<string>([...(savedVisible || []), ...(savedOrder || [])])

  if (!savedVisible || savedVisible.length === 0) {
    return new Set(allIds)
  }

  const next = new Set(savedVisible.filter((id) => allowed.has(id)))
  for (const id of allIds) {
    if (!knownAtSave.has(id)) {
      next.add(id)
    }
  }
  return next
}

interface EntityTableProps {
  columns: TableColumn[]
  data: any[]
  groupBy?: string
  entityType?: string
  onRowClick?: (row: any) => void
  onRowContextMenu?: (row: any, event: React.MouseEvent<HTMLTableRowElement>) => void
  onEdit?: (row: any) => void
  onDelete?: (row: any) => void
  onAdd?: () => void
  onCellUpdate?: (row: any, column: TableColumn, value: any) => Promise<void> | void
  onCellUpdateError?: (message: string) => void
  cellEditTrigger?: 'double_click' | 'icon' | 'both'
  rowActions?: (row: any) => RowActionItem[]
  showToolbar?: boolean
  showFiltersPanel?: boolean
  emptyState?: React.ReactNode
}

type RowActionItem = {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'destructive'
}

export function EntityTable({
  columns,
  data,
  groupBy,
  entityType = 'projects',
  onRowClick,
  onRowContextMenu,
  onEdit,
  onDelete,
  onAdd,
  onCellUpdate,
  onCellUpdateError,
  cellEditTrigger = 'icon',
  rowActions,
  showToolbar = true,
  showFiltersPanel = true,
  emptyState,
}: EntityTableProps) {
  const [runtimeSchemaFields, setRuntimeSchemaFields] = useState<SchemaField[]>([])

  useEffect(() => {
    let isActive = true
    const schemaEntity = resolveSchemaEntityKey(entityType)
    if (!schemaEntity) {
      setRuntimeSchemaFields([])
      return () => {
        isActive = false
      }
    }

    async function loadRuntimeFields() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('schema_field_runtime_v')
        .select('column_name, name, code, data_type, field_type')
        .eq('entity_type', schemaEntity)
        .eq('field_active', true)
        .eq('entity_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })

      if (!isActive) return

      if (error) {
        if (!isMissingRuntimeSchema(error)) {
          console.error(`Failed to load runtime schema for table ${entityType}:`, error)
        }
        setRuntimeSchemaFields([])
        return
      }

      const next: SchemaField[] = []
      const seen = new Set<string>()
      for (const row of (data || []) as RuntimeSchemaFieldRow[]) {
        const field = toRuntimeSchemaField(row)
        if (!field?.column) continue
        if (seen.has(field.column)) continue
        seen.add(field.column)
        next.push(field)
      }
      setRuntimeSchemaFields(next)
    }

    loadRuntimeFields()
    return () => {
      isActive = false
    }
  }, [entityType])

  const reportCellUpdateError = (error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to update cell. Please try again.'
    console.error('Failed to update cell:', error)
    onCellUpdateError?.(message)
  }

  const resolvedColumns = useMemo(
    () => withSchemaColumns(columns, entityType, runtimeSchemaFields),
    [columns, entityType, runtimeSchemaFields]
  )

  const [view, setView] = useState<'grid' | 'list'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [sort, setSort] = useState<TableSort | null>(null)
  const [groupById, setGroupById] = useState<string | null>(groupBy ?? null)
  const [density, setDensity] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [expandedFilterColumns, setExpandedFilterColumns] = useState<Set<string>>(
    () => new Set()
  )
  const [editingCell, setEditingCell] = useState<{
    rowId: number | string
    columnId: string
  } | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const [draftListValue, setDraftListValue] = useState<string[]>([])
  const [multiselectOpen, setMultiselectOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(resolvedColumns.map((column) => column.id))
  )
  const [columnOrder, setColumnOrder] = useState<string[]>(
    () => resolvedColumns.map((column) => column.id)
  )
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const resizeRef = useRef<{
    id: string
    startX: number
    startWidth: number
  } | null>(null)
  const [prefsReady, setPrefsReady] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Record<string, Set<string>>>(
    {}
  )
  const [profileNamesById, setProfileNamesById] = useState<Record<string, string>>({})
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    actions: RowActionItem[]
  } | null>(null)

  useEffect(() => {
    setGroupById(groupBy ?? null)
  }, [groupBy])

  useEffect(() => {
    if (!contextMenu) return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null)
      }
    }
    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('keydown', onEscape)
    }
  }, [contextMenu])

  useEffect(() => {
    setColumnOrder((prev) => {
      const next = prev.filter((id) =>
        resolvedColumns.some((column) => column.id === id)
      )
      const missing = resolvedColumns
        .map((column) => column.id)
        .filter((id) => !next.includes(id))
      return [...next, ...missing]
    })
  }, [resolvedColumns])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const storageKey = `kong.table.${entityType}`
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as {
        columnOrder?: string[]
        columnWidths?: Record<string, number>
        visibleColumns?: string[]
      }
      if (parsed.columnOrder?.length) {
        setColumnOrder(parsed.columnOrder)
      }
      if (parsed.columnWidths) {
        setColumnWidths(parsed.columnWidths)
      }
      setVisibleColumns(
        buildVisibleColumnSet(
          resolvedColumns,
          parsed.visibleColumns,
          parsed.columnOrder
        )
      )
    } catch {
      // ignore invalid storage
    }
  }, [entityType, resolvedColumns])

  useEffect(() => {
    if (!prefsReady) return
    if (typeof window === 'undefined') return
    const storageKey = `kong.table.${entityType}`
    const payload = {
      columnOrder,
      columnWidths,
      visibleColumns: Array.from(visibleColumns),
    }
    window.localStorage.setItem(storageKey, JSON.stringify(payload))
  }, [columnOrder, columnWidths, visibleColumns, entityType])

  useEffect(() => {
    let isActive = true

    async function loadPreferences() {
      setPrefsReady(false)
      if (userTablePreferencesAvailable === false) {
        if (isActive) setPrefsReady(true)
        return
      }
      const supabase = createClient()
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData.user?.id
      if (!userId) {
        if (isActive) setPrefsReady(true)
        return
      }

      const { data, error } = await supabase
        .from('user_table_preferences')
        .select('column_order, column_widths, visible_columns')
        .eq('user_id', userId)
        .eq('entity_type', entityType)
        .maybeSingle()

      if (!isActive) return
      if (error) {
        if (isMissingUserTablePreferencesTable(error)) {
          userTablePreferencesAvailable = false
        }
        if (isActive) setPrefsReady(true)
        return
      }
      userTablePreferencesAvailable = true

      if (data) {
        if (Array.isArray(data.column_order)) {
          setColumnOrder(data.column_order)
        }
        if (data.column_widths && typeof data.column_widths === 'object') {
          setColumnWidths(data.column_widths)
        }
        setVisibleColumns(
          buildVisibleColumnSet(
            resolvedColumns,
            Array.isArray(data.visible_columns) ? data.visible_columns : undefined,
            Array.isArray(data.column_order) ? data.column_order : undefined
          )
        )
      }
      if (isActive) setPrefsReady(true)
    }

    loadPreferences()
    return () => {
      isActive = false
    }
  }, [entityType, resolvedColumns])

  useEffect(() => {
    if (!prefsReady) return
    let timeout: NodeJS.Timeout | null = null

    async function savePreferences() {
      if (userTablePreferencesAvailable === false) return
      const supabase = createClient()
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData.user?.id
      if (!userId) return

      const { error } = await supabase.from('user_table_preferences').upsert(
        {
          user_id: userId,
          entity_type: entityType,
          column_order: columnOrder,
          column_widths: columnWidths,
          visible_columns: Array.from(visibleColumns),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,entity_type' }
      )

      if (isMissingUserTablePreferencesTable(error)) {
        userTablePreferencesAvailable = false
      }
    }

    timeout = setTimeout(() => {
      savePreferences()
    }, 600)

    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [columnOrder, columnWidths, visibleColumns, entityType])

  useEffect(() => {
    setColumnWidths((prev) => {
      const next = { ...prev }
      resolvedColumns.forEach((column) => {
        if (next[column.id] !== undefined) return
        if (column.width) {
          const numeric = Number.parseInt(column.width, 10)
          if (!Number.isNaN(numeric)) {
            next[column.id] = numeric
          }
        }
      })
      return next
    })
  }, [resolvedColumns])

  const orderedColumns = useMemo(() => {
    const map = new Map(resolvedColumns.map((column) => [column.id, column]))
    const ordered = columnOrder
      .map((id) => map.get(id))
      .filter(Boolean) as TableColumn[]
    const remaining = resolvedColumns.filter(
      (column) => !columnOrder.includes(column.id)
    )
    return [...ordered, ...remaining]
  }, [resolvedColumns, columnOrder])

  const displayColumns = useMemo(
    () => orderedColumns.filter((column) => visibleColumns.has(column.id)),
    [orderedColumns, visibleColumns]
  )

  const peopleRefColumnIds = useMemo(
    () =>
      resolvedColumns
        .filter((column) => {
          const id = column.id.toLowerCase()
          return id === 'created_by' || id === 'updated_by' || id.endsWith('_by')
        })
        .map((column) => column.id),
    [resolvedColumns]
  )

  const peopleRefIds = useMemo(() => {
    if (peopleRefColumnIds.length === 0) return []
    const ids = new Set<string>()
    for (const row of data) {
      for (const columnId of peopleRefColumnIds) {
        const rawValue = row?.[columnId]
        if (typeof rawValue !== 'string') continue
        const normalized = rawValue.trim()
        if (!normalized || !isLikelyUuid(normalized)) continue
        ids.add(normalized.toLowerCase())
      }
    }
    return Array.from(ids)
  }, [data, peopleRefColumnIds])

  useEffect(() => {
    if (peopleRefIds.length === 0) return
    const missingIds = peopleRefIds.filter((id) => !profileNamesById[id])
    if (missingIds.length === 0) return

    let active = true
    async function loadProfileNames() {
      const supabase = createClient()
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, display_name, full_name, email')
        .in('id', missingIds)

      if (!active) return
      if (error) {
        console.error('Failed to load profile names for table references:', error)
        return
      }

      const nextMap: Record<string, string> = {}
      for (const profile of profiles || []) {
        const id = typeof profile.id === 'string' ? profile.id.toLowerCase() : ''
        if (!id) continue
        const displayName =
          typeof profile.display_name === 'string' && profile.display_name.trim()
            ? profile.display_name.trim()
            : typeof profile.full_name === 'string' && profile.full_name.trim()
              ? profile.full_name.trim()
              : typeof profile.email === 'string' && profile.email.trim()
                ? profile.email.trim()
                : id
        nextMap[id] = displayName
      }

      if (Object.keys(nextMap).length === 0) return
      setProfileNamesById((previous) => ({ ...previous, ...nextMap }))
    }

    loadProfileNames()
    return () => {
      active = false
    }
  }, [peopleRefIds, profileNamesById])

  const filterableColumns = useMemo(() => {
    return resolvedColumns.filter((column) => {
      const values = new Set(
        data
          .map((row) => row[column.id])
          .filter((value) => value !== null && value !== undefined)
          .map((value) => String(value))
      )
      return values.size > 0 && values.size <= 12
    })
  }, [resolvedColumns, data])

  const filterOptions = useMemo(() => {
    const options: Record<string, string[]> = {}
    filterableColumns.forEach((column) => {
      const values = Array.from(
        new Set(
          data
            .map((row) => row[column.id])
            .filter((value) => value !== null && value !== undefined)
            .map((value) => String(value))
        )
      ).sort()
      options[column.id] = values
    })
    return options
  }, [data, filterableColumns])

  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return data.filter((row) => {
      const matchesQuery = query
        ? displayColumns.some((column) =>
            String(row[column.id] ?? '')
              .toLowerCase()
              .includes(query)
          )
        : true

      if (!matchesQuery) return false

      return Object.entries(activeFilters).every(([columnId, values]) => {
        if (!values.size) return true
        return values.has(String(row[columnId] ?? ''))
      })
    })
  }, [activeFilters, data, displayColumns, searchQuery])

  const sortedData = useMemo(() => {
    if (!sort) return filteredData

    const sorted = [...filteredData]
    sorted.sort((a, b) => {
      const aValue = a[sort.id]
      const bValue = b[sort.id]

      if (aValue === bValue) return 0
      if (aValue === undefined || aValue === null) return 1
      if (bValue === undefined || bValue === null) return -1

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sort.direction === 'asc' ? aValue - bValue : bValue - aValue
      }

      const aDate = Date.parse(aValue)
      const bDate = Date.parse(bValue)
      if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
        return sort.direction === 'asc' ? aDate - bDate : bDate - aDate
      }

      const aText = String(aValue).toLowerCase()
      const bText = String(bValue).toLowerCase()
      if (aText < bText) return sort.direction === 'asc' ? -1 : 1
      if (aText > bText) return sort.direction === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [filteredData, sort])

  const groupedData = useMemo<Record<string, any[]>>(() => {
    if (!groupById) {
      return { All: sortedData }
    }

    return sortedData.reduce<Record<string, any[]>>((acc, item) => {
      const groupKey = item[groupById] || 'Ungrouped'
      if (!acc[groupKey]) {
        acc[groupKey] = []
      }
      acc[groupKey].push(item)
      return acc
    }, {})
  }, [groupById, sortedData])

  const groupKeys = useMemo(() => Object.keys(groupedData), [groupedData])
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    setExpandedGroups(new Set(groupKeys))
  }, [groupKeys])

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey)
    } else {
      newExpanded.add(groupKey)
    }
    setExpandedGroups(newExpanded)
  }

  const toggleColumn = (columnId: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      return next
    })
  }

  const handleDragStart = (columnId: string) => {
    setDraggedColumnId(columnId)
  }

  const handleDrop = (targetId: string) => {
    if (!draggedColumnId || draggedColumnId === targetId) return
    setColumnOrder((prev) => {
      const next = [...prev]
      const fromIndex = next.indexOf(draggedColumnId)
      const toIndex = next.indexOf(targetId)
      if (fromIndex === -1 || toIndex === -1) return prev
      next.splice(fromIndex, 1)
      next.splice(toIndex, 0, draggedColumnId)
      return next
    })
    setDraggedColumnId(null)
  }

  const handleResizeStart = (columnId: string, event: React.MouseEvent) => {
    event.preventDefault()
    const currentWidth =
      columnWidths[columnId] ??
      (event.currentTarget.parentElement as HTMLElement | null)?.offsetWidth ??
      120
    resizeRef.current = {
      id: columnId,
      startX: event.clientX,
      startWidth: currentWidth,
    }
    const handleMove = (moveEvent: MouseEvent) => {
      if (!resizeRef.current) return
      const delta = moveEvent.clientX - resizeRef.current.startX
      const nextWidth = Math.max(80, resizeRef.current.startWidth + delta)
      setColumnWidths((prev) => ({ ...prev, [resizeRef.current!.id]: nextWidth }))
    }
    const handleUp = () => {
      resizeRef.current = null
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  const clearFilters = () => {
    setActiveFilters({})
  }

  const toggleFilterValue = (columnId: string, value: string) => {
    setActiveFilters((prev) => {
      const next = { ...prev }
      const set = new Set(next[columnId] ?? [])
      if (set.has(value)) {
        set.delete(value)
      } else {
        set.add(value)
      }
      next[columnId] = set
      return next
    })
  }

  const toggleFilterExpand = (columnId: string) => {
    setExpandedFilterColumns((prev) => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      return next
    })
  }

  const startEditing = (row: any, column: TableColumn) => {
    if (!onCellUpdate || !column.editable || column.editor === 'checkbox') return
    const rawValue = row[column.id]

    if (column.editor === 'multiselect') {
      const initialValues = unknownToStringList(rawValue)
      setDraftListValue(initialValues)
      setDraftValue(initialValues.join(', '))
      setMultiselectOpen(true)
      setEditingCell({ rowId: row.id, columnId: column.id })
      return
    }

    if (column.editor === 'select') {
      setDraftValue(rawValue === null || rawValue === undefined ? '' : String(rawValue))
      setEditingCell({ rowId: row.id, columnId: column.id })
      return
    }

    const temporal = inferTemporalKind(column)
    if (temporal === 'date') {
      setDraftValue(toDateInputValue(rawValue))
      setEditingCell({ rowId: row.id, columnId: column.id })
      return
    }
    if (temporal === 'datetime') {
      setDraftValue(toDateTimeLocalInputValue(rawValue))
      setEditingCell({ rowId: row.id, columnId: column.id })
      return
    }

    const formatted = column.formatValue
      ? column.formatValue(rawValue, row)
      : Array.isArray(rawValue)
        ? rawValue.join(', ')
        : rawValue ?? ''
    setDraftValue(String(formatted ?? ''))
    setEditingCell({ rowId: row.id, columnId: column.id })
  }

  const cancelEditing = () => {
    setEditingCell(null)
    setDraftValue('')
    setDraftListValue([])
    setMultiselectOpen(false)
  }

  const commitEditing = async () => {
    if (!editingCell || !onCellUpdate) return
    const row = data.find((item) => item.id === editingCell.rowId)
    const column = resolvedColumns.find((col) => col.id === editingCell.columnId)
    if (!row || !column) {
      cancelEditing()
      return
    }

    let nextValue: any = draftValue
    if (column.editor === 'multiselect') {
      nextValue = [...draftListValue]
      if (column.parseValue) {
        nextValue = column.parseValue(nextValue, row)
      }
    } else if (column.parseValue) {
      nextValue = column.parseValue(draftValue, row)
    } else {
      const inputType = resolveInputType(column)
      if (inputType === 'number') {
        if (draftValue.trim() === '') {
          nextValue = null
        } else {
          const parsed = Number(draftValue)
          nextValue = Number.isNaN(parsed) ? null : parsed
        }
      } else if (inputType === 'date') {
        nextValue = draftValue.trim() === '' ? null : draftValue
      } else if (inputType === 'datetime-local') {
        if (draftValue.trim() === '') {
          nextValue = null
        } else {
          const parsed = new Date(draftValue)
          nextValue = Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
        }
      }
    }

    try {
      await onCellUpdate(row, column, nextValue)
      cancelEditing()
    } catch (error) {
      reportCellUpdateError(error)
    }
  }

  const filterCount = Object.values(activeFilters).reduce(
    (total, set) => total + set.size,
    0
  )

  const densityClasses =
    density === 0
      ? { header: 'px-1.5 py-1 text-[10px]', cell: 'px-1.5 py-1 text-xs' }
      : density === 2
        ? { header: 'px-2.5 py-2.5 text-[11px]', cell: 'px-2.5 py-2.5 text-sm' }
        : { header: 'px-2 py-1.5 text-[10px]', cell: 'px-2 py-1.5 text-xs' }

  const renderCell = (column: TableColumn, value: any, row: any) => {
    const columnIdLower = column.id.toLowerCase()
    if (
      typeof value === 'string' &&
      value.trim() &&
      (columnIdLower === 'created_by' ||
        columnIdLower === 'updated_by' ||
        columnIdLower.endsWith('_by'))
    ) {
      const profileName = profileNamesById[value.trim().toLowerCase()]
      if (profileName) {
        return <span className="text-zinc-100">{profileName}</span>
      }
    }

    if (column.editable && column.editor === 'checkbox' && onCellUpdate) {
      return (
        <label
          className="flex items-center gap-2"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={async (event) => {
              event.stopPropagation()
              try {
                await onCellUpdate(row, column, event.target.checked)
              } catch (error) {
                reportCellUpdateError(error)
              }
            }}
            className="h-4 w-4 rounded border border-zinc-700 bg-zinc-900"
          />
          <span className="text-xs text-zinc-100">{value ? 'Yes' : 'No'}</span>
        </label>
      )
    }

    switch (column.type) {
      case 'date': {
        if (value === null || value === undefined || value === '') {
          return <span className="text-zinc-500">-</span>
        }
        const normalized = toDateInputValue(value)
        if (!normalized) {
          return <span className="text-zinc-100">{String(value)}</span>
        }
        const parsed = new Date(`${normalized}T00:00:00`)
        return (
          <span className="text-zinc-100" title={parsed.toLocaleDateString()}>
            {parsed.toLocaleDateString()}
          </span>
        )
      }
      case 'datetime': {
        if (value === null || value === undefined || value === '') {
          return <span className="text-zinc-500">-</span>
        }
        const parsed = new Date(value)
        if (Number.isNaN(parsed.getTime())) {
          return <span className="text-zinc-100">{String(value)}</span>
        }
        return (
          <span className="text-zinc-100" title={parsed.toLocaleString()}>
            {parsed.toLocaleString()}
          </span>
        )
      }
      case 'thumbnail':
        return (
          <div className="flex items-center justify-center">
            {value ? (
              <img
                src={value}
                alt=""
                className="h-10 w-10 rounded object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded bg-zinc-800 text-xs text-zinc-500">
                Upload
              </div>
            )}
          </div>
        )
      case 'link':
        if (column.linkHref) {
          const href = column.linkHref(row)
          if (!href) {
            if (value === null || value === undefined || value === '') {
              return <span className="text-zinc-500">-</span>
            }
            return <span className="text-zinc-100">{String(value)}</span>
          }
          return (
            <Link
              href={href}
              className="text-amber-400 transition hover:text-amber-300"
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              {value}
            </Link>
          )
        }
        return (
          <a
            href="#"
            className="text-amber-400 transition hover:text-amber-300"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            {value}
          </a>
        )
      case 'status':
        return (
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                value === 'Active' ? 'bg-green-500' : 'bg-zinc-500'
              }`}
            />
            <span>{value}</span>
          </div>
        )
      case 'pipeline':
        return (
          <div className="flex gap-1">
            {(value || []).map((status: any, i: number) => (
              <div
                key={i}
                className="h-6 w-4 cursor-pointer rounded transition hover:opacity-80"
                style={{ backgroundColor: status.color || '#6b7280' }}
                title={status.step}
              />
            ))}
          </div>
        )
      case 'url': {
        if (value === null || value === undefined || value === '') {
          return <span className="text-zinc-500">-</span>
        }
        const href = String(value)
        return (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-amber-400 transition hover:text-amber-300"
            onClick={(e) => e.stopPropagation()}
          >
            {href}
          </a>
        )
      }
      case 'color': {
        if (value === null || value === undefined || value === '') {
          return <span className="text-zinc-500">-</span>
        }
        const display = String(value)
        return (
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-sm border border-zinc-700"
              style={{ backgroundColor: display }}
              title={display}
            />
            <span className="text-zinc-100">{display}</span>
          </div>
        )
      }
      case 'boolean': {
        if (value === null || value === undefined || value === '') {
          return <span className="text-zinc-500">-</span>
        }
        return <span className="text-zinc-100">{Boolean(value) ? 'Yes' : 'No'}</span>
      }
      case 'json': {
        if (value === null || value === undefined || value === '') {
          return <span className="text-zinc-500">-</span>
        }
        const display = typeof value === 'string' ? value : JSON.stringify(value)
        return (
          <span className="max-w-[240px] truncate text-zinc-100" title={display}>
            {display}
          </span>
        )
      }
      default: {
        if (value === null || value === undefined || value === '') {
          return <span className="text-zinc-500">-</span>
        }

        const formatted =
          typeof column.formatValue === 'function'
            ? column.formatValue(value, row)
            : value

        const temporal = inferTemporalKind(column)
        if (temporal === 'date') {
          const normalized = toDateInputValue(formatted)
          if (normalized) {
            const parsed = new Date(`${normalized}T00:00:00`)
            return (
              <span className="text-zinc-100" title={parsed.toLocaleDateString()}>
                {parsed.toLocaleDateString()}
              </span>
            )
          }
        } else if (temporal === 'datetime') {
          const parsed = new Date(formatted)
          if (!Number.isNaN(parsed.getTime())) {
            return (
              <span className="text-zinc-100" title={parsed.toLocaleString()}>
                {parsed.toLocaleString()}
              </span>
            )
          }
        }

        if (Array.isArray(formatted)) {
          const display = formatted.join(', ')
          return (
            <span className="max-w-[240px] truncate text-zinc-100" title={display}>
              {display || '-'}
            </span>
          )
        }

        if (typeof formatted === 'boolean') {
          return <span className="text-zinc-100">{formatted ? 'Yes' : 'No'}</span>
        }

        if (typeof formatted === 'object') {
          const display = JSON.stringify(formatted)
          return (
            <span className="max-w-[240px] truncate text-zinc-100" title={display}>
              {display}
            </span>
          )
        }

        const display = String(formatted)
        return (
          <span className="max-w-[240px] truncate text-zinc-100" title={display}>
            {display}
          </span>
        )
      }
    }
  }

  const resolveRowActions = (row: any): RowActionItem[] => {
    const actions: RowActionItem[] = []

    if (onEdit) {
      actions.push({
        label: 'Edit',
        onClick: () => onEdit(row),
      })
    } else if (onCellUpdate) {
      const editableColumn = displayColumns.find(
        (column) => column.editable && column.editor !== 'checkbox'
      )
      if (editableColumn) {
        actions.push({
          label: 'Edit',
          onClick: () => startEditing(row, editableColumn),
        })
      }
    }

    if (onDelete) {
      actions.push({
        label: 'Delete',
        onClick: () => onDelete(row),
        variant: 'destructive',
      })
    }

    if (rowActions) {
      actions.push(...rowActions(row))
    }

    return actions
  }

  const openBuiltInContextMenu = (
    row: any,
    event: React.MouseEvent<HTMLElement>
  ) => {
    const actions = resolveRowActions(row)
    if (actions.length === 0) return
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      actions,
    })
  }

  const handleListRowContextMenu = (
    row: any,
    event: React.MouseEvent<HTMLTableRowElement>
  ) => {
    setContextMenu(null)
    if (onRowContextMenu) {
      onRowContextMenu(row, event)
      return
    }
    openBuiltInContextMenu(row, event)
  }

  const handleGridCardContextMenu = (
    row: any,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (onRowContextMenu) return
    openBuiltInContextMenu(row, event)
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {showToolbar && (
        <TableToolbar
          entityType={entityType}
          columns={resolvedColumns}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleColumn}
          onAdd={onAdd}
          onViewChange={setView}
          sort={sort}
          onSortChange={setSort}
          groupBy={groupById}
          onGroupByChange={setGroupById}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterCount={filterCount}
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen((prev) => !prev)}
          onCloseFilters={() => setFiltersOpen(false)}
          filtersPanel={
            showFiltersPanel && filterableColumns.length > 0 ? (
              <div className="absolute left-0 top-full z-30 mt-2 hidden w-72 lg:block">
                <div className="rounded-md border border-zinc-800 bg-zinc-950/95 p-3 text-sm text-zinc-200 shadow-lg">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
                    <span>Filters</span>
                    <button
                      onClick={clearFilters}
                      className="text-[10px] uppercase tracking-[0.2em] text-amber-400 hover:text-amber-300"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="mt-3 space-y-4">
                    {filterableColumns.map((column) => (
                      <div key={column.id}>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                          {column.label}
                        </p>
                        <div className="mt-2 space-y-2">
                          {(filterOptions[column.id] ?? [])
                            .slice(
                              0,
                              expandedFilterColumns.has(column.id) ? undefined : 5
                            )
                            .map((value) => (
                              <label
                                key={value}
                                className="flex items-center gap-2 text-xs text-zinc-300"
                              >
                                <input
                                  type="checkbox"
                                  checked={activeFilters[column.id]?.has(value) ?? false}
                                  onChange={() => toggleFilterValue(column.id, value)}
                                  className="h-3 w-3 rounded border border-zinc-700 bg-zinc-900"
                                />
                                <span>{value}</span>
                              </label>
                            ))}
                          {(filterOptions[column.id]?.length ?? 0) > 5 && (
                            <button
                              type="button"
                              onClick={() => toggleFilterExpand(column.id)}
                              className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-200"
                            >
                              {expandedFilterColumns.has(column.id)
                                ? 'Show less'
                                : 'Show more'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null
          }
        />
      )}

      <div className="flex flex-1">
        <div className="relative flex-1">
          <div className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/70 shadow-sm">
            <div className="overflow-x-auto">
              {view === 'grid' ? (
                <div
                  className={`grid gap-4 p-3 ${
                    entityType === 'projects'
                      ? 'bg-zinc-950 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
                      : 'sm:grid-cols-2 xl:grid-cols-3'
                  }`}
                >
                  {sortedData.length === 0 && emptyState ? (
                    <div className="col-span-full rounded-md border border-zinc-800 bg-zinc-950/40 p-8">
                      {emptyState}
                    </div>
                  ) : null}
                  {sortedData.map((row, index) => {
                    if (entityType === 'projects') {
                      const thumb = row.thumbnail_url
                      const name = row.name || 'Untitled'
                      return (
                        <button
                          key={row.id || index}
                          className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 text-left shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition hover:border-zinc-700"
                          onClick={() => onRowClick?.(row)}
                          onContextMenu={(event) => handleGridCardContextMenu(row, event)}
                        >
                          <div className="flex aspect-square w-full items-center justify-center bg-zinc-900 text-xs text-zinc-500">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-zinc-400 underline">Upload Thumbnail</span>
                            )}
                          </div>
                          <div className="border-t border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-300">
                            <span className="underline">{name}</span>
                          </div>
                        </button>
                      )
                    }

                    return (
                      <button
                        key={row.id || index}
                        className="flex flex-col gap-2 rounded-md border border-zinc-800 bg-zinc-950/60 p-3 text-left transition hover:border-zinc-700 hover:bg-zinc-900"
                        onClick={() => onRowClick?.(row)}
                        onContextMenu={(event) => handleGridCardContextMenu(row, event)}
                      >
                        {displayColumns.slice(0, 3).map((column) => (
                          <div key={column.id}>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                              {column.label}
                            </p>
                            <div className="mt-1 text-sm text-zinc-100">
                              {renderCell(column, row[column.id], row)}
                            </div>
                          </div>
                        ))}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <table className="w-max table-auto">
                  <thead className="border-b border-zinc-800 bg-zinc-950">
                    <tr>
                      {groupById && <th className="w-8" />}
                      {displayColumns.map((column) => (
                        <th
                          key={column.id}
                          draggable
                          onDragStart={() => handleDragStart(column.id)}
                          onDragEnd={() => setDraggedColumnId(null)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => handleDrop(column.id)}
                          className={`${densityClasses.header} cursor-grab select-none text-left font-semibold uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-200`}
                          style={{
                            width: columnWidths[column.id] ?? column.width,
                            minWidth: 80,
                          }}
                        >
                          <div className="relative flex items-center justify-between gap-2">
                            <span>{column.label}</span>
                            <span
                              role="separator"
                              onMouseDown={(event) => handleResizeStart(column.id, event)}
                              className="absolute -right-2 top-0 h-full w-3 cursor-col-resize"
                            />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.length === 0 && emptyState ? (
                      <tr className="border-b border-zinc-800">
                        <td
                          colSpan={
                            displayColumns.length + (groupById ? 1 : 0)
                          }
                          className="px-6 py-16"
                        >
                          {emptyState}
                        </td>
                      </tr>
                    ) : null}
                    {sortedData.length > 0 && groupKeys.map((groupKey) => {
                      const isExpanded = !groupById || expandedGroups.has(groupKey)

                      return (
                        <React.Fragment key={groupKey}>
                          {groupById && (
                            <tr className="border-b border-zinc-800 bg-zinc-950">
                              <td
                                colSpan={displayColumns.length + 1}
                                className="px-2.5 py-2 text-sm cursor-pointer hover:bg-zinc-900"
                                onClick={() => toggleGroup(groupKey)}
                              >
                                <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                  {groupKey} ({groupedData[groupKey].length})
                                </div>
                              </td>
                            </tr>
                          )}
                          {isExpanded &&
                            groupedData[groupKey].map((row, rowIndex) => (
                              <tr
                                key={row.id || rowIndex}
                                className="cursor-pointer border-b border-zinc-800 transition hover:bg-zinc-900"
                                onClick={() => onRowClick?.(row)}
                                onContextMenu={(event) => handleListRowContextMenu(row, event)}
                              >
                                {groupById && <td className="w-8" />}
                                {displayColumns.map((column) => (
                                  // Cell edit affordance can be icon-only, double-click, or both.
                                  <td
                                    key={column.id}
                                    className={`${densityClasses.cell}`}
                                    style={{
                                      width: columnWidths[column.id] ?? column.width,
                                      minWidth: 80,
                                    }}
                                    onDoubleClick={(event) => {
                                      const useDoubleClick =
                                        cellEditTrigger === 'double_click' ||
                                        cellEditTrigger === 'both'
                                      if (!useDoubleClick) return
                                      event.stopPropagation()
                                      startEditing(row, column)
                                    }}
                                  >
                                     {editingCell?.rowId === row.id &&
                                    editingCell?.columnId === column.id &&
                                    column.editable &&
                                    onCellUpdate &&
                                    column.editor !== 'checkbox' ? (
                                      column.editor === 'multiselect' ? (
                                        <div
                                          className="relative w-full"
                                          onClick={(event) => event.stopPropagation()}
                                        >
                                          <DropdownMenu
                                            modal={false}
                                            open={multiselectOpen}
                                            onOpenChange={(open) => {
                                              if (!open) {
                                                cancelEditing()
                                                return
                                              }
                                              setMultiselectOpen(true)
                                            }}
                                          >
                                            <DropdownMenuTrigger asChild>
                                              <button
                                                type="button"
                                                onMouseDown={(event) => event.preventDefault()}
                                                onClick={(event) => event.stopPropagation()}
                                                className="flex w-full items-center justify-between rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-left text-xs text-zinc-100"
                                              >
                                                <span className="truncate">
                                                  {draftListValue.length > 0
                                                    ? draftListValue.join(', ')
                                                    : `Select ${column.label.toLowerCase()}`}
                                                </span>
                                                <ChevronDown
                                                  className={`h-3.5 w-3.5 text-zinc-400 transition ${
                                                    multiselectOpen ? 'rotate-180' : ''
                                                  }`}
                                                />
                                              </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                              align="start"
                                              sideOffset={4}
                                              className="w-[var(--radix-dropdown-menu-trigger-width)] max-w-[min(540px,70vw)] border-zinc-700 bg-zinc-900 text-zinc-100"
                                              onCloseAutoFocus={(event) => {
                                                event.preventDefault()
                                              }}
                                            >
                                              {(column.options ?? []).length === 0 ? (
                                                <p className="px-2 py-1.5 text-xs text-zinc-500">
                                                  No options
                                                </p>
                                              ) : (
                                                (column.options ?? []).map((option) => (
                                                  <DropdownMenuCheckboxItem
                                                    key={option.value}
                                                    checked={draftListValue.includes(option.value)}
                                                    onSelect={(event) => event.preventDefault()}
                                                    onCheckedChange={(checked) => {
                                                      const isChecked = checked === true
                                                      const nextValues = isChecked
                                                        ? draftListValue.includes(option.value)
                                                          ? draftListValue
                                                          : [...draftListValue, option.value]
                                                        : draftListValue.filter(
                                                            (item) => item !== option.value
                                                          )

                                                      setDraftListValue(nextValues)
                                                      setDraftValue(nextValues.join(', '))

                                                      Promise.resolve(
                                                        onCellUpdate(
                                                          row,
                                                          column,
                                                          column.parseValue
                                                            ? column.parseValue(nextValues, row)
                                                            : nextValues
                                                        )
                                                      ).catch((error) => {
                                                        reportCellUpdateError(error)
                                                      })
                                                    }}
                                                    className="text-zinc-100 focus:bg-zinc-800 focus:text-zinc-100"
                                                  >
                                                    {option.label}
                                                  </DropdownMenuCheckboxItem>
                                                ))
                                              )}
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      ) : column.editor === 'textarea' ? (
                                        <textarea
                                          value={draftValue}
                                          onChange={(event) =>
                                            setDraftValue(event.target.value)
                                          }
                                          onBlur={commitEditing}
                                          onKeyDown={(event) => {
                                            if (event.key === 'Escape') {
                                              event.stopPropagation()
                                              cancelEditing()
                                            }
                                          }}
                                          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
                                          rows={3}
                                          autoFocus
                                        />
                                      ) : column.editor === 'select' ? (
                                        <select
                                          value={draftValue}
                                          onChange={async (event) => {
                                            try {
                                              setDraftValue(event.target.value)
                                              await onCellUpdate(
                                                row,
                                                column,
                                                column.parseValue
                                                  ? column.parseValue(event.target.value, row)
                                                  : event.target.value
                                              )
                                              cancelEditing()
                                            } catch (error) {
                                              reportCellUpdateError(error)
                                            }
                                          }}
                                          onBlur={cancelEditing}
                                          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
                                          autoFocus
                                        >
                                          {(column.options ?? []).map((option) => (
                                            <option key={option.value} value={option.value}>
                                              {option.label}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <input
                                          type={resolveInputType(column)}
                                          value={draftValue}
                                          onChange={(event) =>
                                            setDraftValue(event.target.value)
                                          }
                                          step={
                                            resolveInputType(column) === 'number' ? 'any' : undefined
                                          }
                                          onBlur={commitEditing}
                                          onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                              event.preventDefault()
                                              commitEditing()
                                            }
                                            if (event.key === 'Escape') {
                                              event.stopPropagation()
                                              cancelEditing()
                                            }
                                          }}
                                          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
                                          autoFocus
                                        />
                                      )
                                    ) : (
                                      <div className="group/cell relative min-h-[18px]">
                                        {renderCell(column, row[column.id], row)}

                                        {(cellEditTrigger === 'icon' || cellEditTrigger === 'both') &&
                                        column.editable &&
                                        onCellUpdate &&
                                        column.editor !== 'checkbox' ? (
                                          <button
                                            type="button"
                                            aria-label={`Edit ${column.label}`}
                                            title={`Edit ${column.label}`}
                                            onClick={(event) => {
                                              event.preventDefault()
                                              event.stopPropagation()
                                              startEditing(row, column)
                                            }}
                                            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-sm p-1 text-zinc-500 opacity-0 transition hover:bg-zinc-800 hover:text-zinc-200 group-hover/cell:opacity-100"
                                          >
                                            <Pencil className="h-3.5 w-3.5" />
                                          </button>
                                        ) : null}
                                      </div>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="border-t border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400" />
          </div>
        </div>

        {null}
      </div>

      {contextMenu ? (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setContextMenu(null)}
          onContextMenu={(event) => {
            event.preventDefault()
            setContextMenu(null)
          }}
        >
          <div
            className="absolute min-w-[180px] rounded-md border border-zinc-700 bg-zinc-900 p-1 shadow-2xl"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(event) => event.stopPropagation()}
          >
            {contextMenu.actions.map((action, index) => (
              <button
                key={`${action.label}-${index}`}
                type="button"
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition hover:bg-zinc-800 ${
                  action.variant === 'destructive' ? 'text-red-400' : 'text-zinc-100'
                }`}
                onClick={() => {
                  action.onClick()
                  setContextMenu(null)
                }}
              >
                {action.icon ? <span className="h-4 w-4">{action.icon}</span> : null}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
