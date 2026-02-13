'use client'

import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createStatus, deleteStatus, updateStatus } from '@/actions/statuses'
import { EntityTable } from '@/components/table/entity-table'
import type { TableColumn } from '@/components/table/types'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Flag, Plus, Pencil, Trash2 } from 'lucide-react'

const STATUS_TABLE_CANDIDATES = ['statuses', 'status'] as const
const STATUS_ENTITY_TYPES_TABLE = 'status_entity_types'

type RowRecord = Record<string, unknown>

type StatusSemanticKeys = {
  id: string
  name: string
  shortCode: string | null
  icon: string | null
  backgroundColor: string | null
  lockedBySystem: string | null
  entityType: string | null
  sortOrder: string | null
  createdBy: string | null
  updatedBy: string | null
  createdAt: string | null
  updatedAt: string | null
}

type StatusTableRow = RowRecord & {
  _status_id: number
  _status_ids: number[]
  _raw: RowRecord
  _entity_types: string[]
  status_name: string
  short_code: string
  background_color: string
  icon_value: string
  locked_by_system: boolean
  entity_types_label: string
  sort_order: unknown
  created_by_value: string
  updated_by_value: string
  created_at_value: unknown
  updated_at_value: unknown
}

const ENTITY_TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'project', label: 'Project' },
  { value: 'asset', label: 'Asset' },
  { value: 'sequence', label: 'Sequence' },
  { value: 'shot', label: 'Shot' },
  { value: 'task', label: 'Task' },
  { value: 'version', label: 'Version' },
  { value: 'note', label: 'Note' },
  { value: 'published_file', label: 'Published File' },
]
const ENTITY_TYPE_MULTI_OPTIONS = ENTITY_TYPE_OPTIONS.filter(
  (option) => option.value !== 'all'
)

function resolveColumn(columns: Set<string>, candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (columns.has(candidate)) return candidate
  }
  return null
}

function collectColumns(rows: RowRecord[]): Set<string> {
  const columns = new Set<string>()
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    for (const key of Object.keys(row)) {
      columns.add(key)
    }
  }
  return columns
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function toStatusCode(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function asBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y'
}

function normalizeEntityTypes(values: string[]): string[] {
  const cleaned = values
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  const unique = Array.from(new Set(cleaned))
  if (unique.includes('all')) return ['all']
  return unique.length > 0 ? unique : ['all']
}

function parseEntityTypeInput(value: unknown): string[] {
  if (Array.isArray(value)) {
    return normalizeEntityTypes(value.map((item) => asText(item)))
  }
  return normalizeEntityTypes(asText(value).split(','))
}

function getStatusIds(row: RowRecord | null | undefined): number[] {
  if (!row) return []

  const rawIds = row._status_ids
  if (Array.isArray(rawIds)) {
    return rawIds
      .map((value) => Number(value))
      .filter((value) => !Number.isNaN(value))
  }

  const id = Number(row._status_id)
  if (Number.isNaN(id)) return []
  return [id]
}

function isMissingTableError(error: unknown): boolean {
  if (!error) return false
  const errorRecord = error as Record<string, unknown>
  const code = String(errorRecord.code || '')
  const message = String(errorRecord.message || '').toLowerCase()
  const details = String(errorRecord.details || '').toLowerCase()
  return (
    code === 'PGRST205' ||
    message.includes('could not find the table') ||
    (message.includes('relation') && message.includes('does not exist')) ||
    details.includes('does not exist')
  )
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (!error || typeof error !== 'object') return ''
  const message = (error as Record<string, unknown>).message
  return typeof message === 'string' ? message : ''
}

export default function StatusPage() {
  const [statuses, setStatuses] = useState<RowRecord[]>([])
  const [hasStatusEntityTypesMapping, setHasStatusEntityTypesMapping] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [resolvedTable, setResolvedTable] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editStatusRow, setEditStatusRow] = useState<RowRecord | null>(null)
  const [deleteStatusRow, setDeleteStatusRow] = useState<RowRecord | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    row: RowRecord
  } | null>(null)

  useEffect(() => {
    void loadStatusData()
  }, [])

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

  async function loadStatusData() {
    try {
      setIsLoading(true)
      const supabase = createClient()

      let rows: RowRecord[] = []
      let tableName: string | null = null
      let lastError: unknown = null

      for (const table of STATUS_TABLE_CANDIDATES) {
        const result = await supabase.from(table).select('*')
        if (!result.error) {
          rows = result.data || []
          tableName = table
          break
        }

        lastError = result.error
        if (!isMissingTableError(result.error)) {
          throw result.error
        }
      }

      if (!tableName) {
        setStatuses([])
        setHasStatusEntityTypesMapping(false)
        setResolvedTable(null)
        setLoadError(
          errorMessage(lastError) ||
            'Statuses table was not found. Apply the status schema migration first.'
        )
        return
      }

      const entityTypesByStatusId = new Map<number, string[]>()
      let mappingAvailable = true
      const entityTypeResult = await supabase
        .from(STATUS_ENTITY_TYPES_TABLE)
        .select('status_id, entity_type')

      if (entityTypeResult.error) {
        if (!isMissingTableError(entityTypeResult.error)) {
          throw entityTypeResult.error
        }
        mappingAvailable = false
      } else {
        for (const item of entityTypeResult.data || []) {
          const statusId = Number(item.status_id)
          if (Number.isNaN(statusId)) continue
          const entityType = asText(item.entity_type).trim().toLowerCase()
          if (!entityType) continue
          const list = entityTypesByStatusId.get(statusId) || []
          list.push(entityType)
          entityTypesByStatusId.set(statusId, list)
        }
      }

      rows.sort((a, b) => {
        const aLabel = asText(a?.name || a?.status_name || a?.code || a?.id).toLowerCase()
        const bLabel = asText(b?.name || b?.status_name || b?.code || b?.id).toLowerCase()
        return aLabel.localeCompare(bLabel)
      })

      const rowsWithEntityTypes = rows.map((row) => {
        const statusId = Number(row.id)
        const mappedTypes = Number.isNaN(statusId)
          ? []
          : entityTypesByStatusId.get(statusId) || []
        const fallbackType = asText(row.entity_type).trim().toLowerCase()
        const entityTypes =
          mappedTypes.length > 0
            ? normalizeEntityTypes(mappedTypes)
            : normalizeEntityTypes(fallbackType ? [fallbackType] : ['all'])

        return {
          ...row,
          _entity_types: entityTypes,
        }
      })

      setStatuses(rowsWithEntityTypes)
      setHasStatusEntityTypesMapping(mappingAvailable)
      setResolvedTable(tableName)
      setLoadError('')
    } catch (error: unknown) {
      console.error('Failed to load statuses:', error)
      setStatuses([])
      setHasStatusEntityTypesMapping(false)
      setResolvedTable(null)
      setLoadError(
        error instanceof Error ? error.message : 'Failed to load statuses'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const keys = useMemo<StatusSemanticKeys>(() => {
    const columns = collectColumns(statuses)

    return {
      id: resolveColumn(columns, ['id']) || 'id',
      name: resolveColumn(columns, ['name', 'status_name']) || 'name',
      shortCode: resolveColumn(columns, ['code', 'short_code']),
      icon: resolveColumn(columns, ['icon']),
      backgroundColor: resolveColumn(columns, ['color', 'background_color']),
      lockedBySystem: resolveColumn(columns, ['locked_by_system', 'is_system_locked', 'is_default']),
      entityType: resolveColumn(columns, ['entity_type']),
      sortOrder: resolveColumn(columns, ['sort_order', 'order', 'order_index']),
      createdBy: resolveColumn(columns, ['created_by']),
      updatedBy: resolveColumn(columns, ['updated_by']),
      createdAt: resolveColumn(columns, ['created_at', 'date_created']),
      updatedAt: resolveColumn(columns, ['updated_at', 'date_updated']),
    }
  }, [statuses])

  const statusRows = useMemo<StatusTableRow[]>(() => {
    const normalizedRows: StatusTableRow[] = statuses.map((row) => {
      const statusId = Number(row?.[keys.id])
      const entityTypes =
        row._entity_types && Array.isArray(row._entity_types)
          ? normalizeEntityTypes(row._entity_types.map((item) => asText(item)))
          : normalizeEntityTypes([
              keys.entityType ? asText(row?.[keys.entityType]) : 'all',
            ])

      return {
        ...row,
        _status_id: statusId,
        _status_ids: Number.isNaN(statusId) ? [] : [statusId],
        _raw: row,
        _entity_types: entityTypes,
        status_name: asText(row?.[keys.name]) || '—',
        short_code: keys.shortCode ? asText(row?.[keys.shortCode]) : '',
        background_color: keys.backgroundColor ? asText(row?.[keys.backgroundColor]) : '',
        icon_value: keys.icon ? asText(row?.[keys.icon]) : '',
        locked_by_system: keys.lockedBySystem ? asBoolean(row?.[keys.lockedBySystem]) : false,
        entity_types_label: entityTypes.join(', '),
        sort_order: keys.sortOrder ? row?.[keys.sortOrder] : null,
        created_by_value: keys.createdBy ? asText(row?.[keys.createdBy]) : '',
        updated_by_value: keys.updatedBy ? asText(row?.[keys.updatedBy]) : '',
        created_at_value: keys.createdAt ? row?.[keys.createdAt] : null,
        updated_at_value: keys.updatedAt ? row?.[keys.updatedAt] : null,
      }
    })

    const grouped = new Map<string, StatusTableRow>()
    for (const row of normalizedRows) {
      const groupKey = `${row.short_code.trim().toLowerCase()}::${row.status_name.trim().toLowerCase()}`
      const existing = grouped.get(groupKey)

      if (!existing) {
        grouped.set(groupKey, row)
        continue
      }

      const mergedEntityTypes = normalizeEntityTypes([
        ...existing._entity_types,
        ...row._entity_types,
      ])
      const mergedStatusIds = Array.from(
        new Set([...existing._status_ids, ...row._status_ids])
      )

      const existingSort = Number(existing.sort_order)
      const incomingSort = Number(row.sort_order)
      const nextSortOrder =
        !Number.isNaN(incomingSort) && (Number.isNaN(existingSort) || incomingSort < existingSort)
          ? row.sort_order
          : existing.sort_order

      grouped.set(groupKey, {
        ...existing,
        _status_id: mergedStatusIds[0] ?? existing._status_id,
        _status_ids: mergedStatusIds,
        _entity_types: mergedEntityTypes,
        entity_types_label: mergedEntityTypes.join(', '),
        sort_order: nextSortOrder,
        locked_by_system: existing.locked_by_system || row.locked_by_system,
        background_color: existing.background_color || row.background_color,
        icon_value: existing.icon_value || row.icon_value,
      })
    }

    return Array.from(grouped.values()).sort((a, b) => {
      const aKey = `${a.status_name.toLowerCase()}::${a.short_code.toLowerCase()}`
      const bKey = `${b.status_name.toLowerCase()}::${b.short_code.toLowerCase()}`
      return aKey.localeCompare(bKey)
    })
  }, [statuses, keys])

  const columns = useMemo<TableColumn[]>(
    () => [
      {
        id: 'status_name',
        label: 'Status Name',
        type: 'text',
        width: '220px',
        editable: true,
        editor: 'text',
      },
      {
        id: 'short_code',
        label: 'Short Code',
        type: 'text',
        width: '130px',
        editable: true,
        editor: 'text',
      },
      {
        id: 'background_color',
        label: 'Background Color',
        type: 'color',
        width: '130px',
        editable: true,
        editor: 'color',
      },
      {
        id: 'icon_value',
        label: 'Icon',
        type: 'text',
        width: '150px',
        editable: true,
        editor: 'text',
      },
      {
        id: 'locked_by_system',
        label: 'Locked by System',
        type: 'boolean',
        width: '170px',
        editable: true,
        editor: 'checkbox',
      },
      {
        id: 'entity_types_label',
        label: 'Entity Types',
        type: 'text',
        width: '190px',
        editable: true,
        editor: 'multiselect',
        options: ENTITY_TYPE_OPTIONS.map((option) => ({
          value: option.value,
          label: option.value === 'all' ? 'All entities' : option.label,
        })),
        formatValue: (value) => parseEntityTypeInput(value).join(', '),
        parseValue: (value) => parseEntityTypeInput(value),
      },
      {
        id: 'sort_order',
        label: 'Order',
        type: 'number',
        width: '100px',
        editable: Boolean(keys.sortOrder),
        editor: 'number',
      },
      { id: 'created_by_value', label: 'Created by', type: 'text', width: '180px' },
      { id: 'created_at_value', label: 'Date Created', type: 'datetime', width: '180px' },
      { id: 'updated_by_value', label: 'Updated by', type: 'text', width: '180px' },
      { id: 'updated_at_value', label: 'Date Updated', type: 'datetime', width: '180px' },
    ],
    [keys.sortOrder]
  )

  async function handleInlineCellUpdate(row: RowRecord, column: TableColumn, value: unknown) {
    const statusIds = getStatusIds(row)
    if (statusIds.length === 0) {
      throw new Error('Invalid status id')
    }

    const payload: Record<string, unknown> = {}
    const localPatch: Record<string, unknown> = {}
    if (column.id === 'status_name') {
      const nextValue = asText(value)
      payload.name = nextValue
      localPatch[keys.name] = nextValue
    } else if (column.id === 'short_code') {
      const nextValue = asText(value) || null
      payload.code = nextValue
      if (keys.shortCode) {
        localPatch[keys.shortCode] = nextValue
      }
    } else if (column.id === 'background_color') {
      const nextValue = asText(value) || null
      payload.background_color = nextValue
      if (keys.backgroundColor) {
        localPatch[keys.backgroundColor] = nextValue
      }
    } else if (column.id === 'icon_value') {
      const nextValue = asText(value) || null
      payload.icon = nextValue
      if (keys.icon) {
        localPatch[keys.icon] = nextValue
      }
    } else if (column.id === 'locked_by_system') {
      const nextValue = Boolean(value)
      payload.locked_by_system = nextValue
      if (keys.lockedBySystem) {
        localPatch[keys.lockedBySystem] = nextValue
      }
    } else if (column.id === 'sort_order') {
      const nextValue = value === null || value === '' ? null : Number(value)
      payload.sort_order = nextValue
      if (keys.sortOrder) {
        localPatch[keys.sortOrder] = nextValue
      }
    } else if (column.id === 'entity_types_label') {
      const nextValue = parseEntityTypeInput(value)
      payload.entity_types = nextValue
      payload.entity_type = nextValue.length === 1 ? nextValue[0] : 'all'
      localPatch._entity_types = nextValue
      if (keys.entityType) {
        localPatch[keys.entityType] = payload.entity_type
      }
    } else {
      return
    }

    for (const statusId of statusIds) {
      const result = await updateStatus(statusId, payload)
      if (result.error) {
        throw new Error(result.error)
      }
    }

    setStatuses((previous) =>
      previous.map((statusRow) => {
        const statusId = Number(statusRow?.[keys.id])
        if (!statusIds.includes(statusId)) {
          return statusRow
        }
        return {
          ...statusRow,
          ...localPatch,
        }
      })
    )
  }

  function openEditDialog(row: RowRecord) {
    setEditStatusRow(row)
  }

  function openDeleteDialog(row: RowRecord) {
    setDeleteStatusRow(row)
  }

  function handleRowContextMenu(row: RowRecord, event: MouseEvent<HTMLTableRowElement>) {
    event.preventDefault()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      row,
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-400">Loading statuses...</p>
      </div>
    )
  }

  return (
    <>
      <StatusDialog
        key={`status-create-${showCreateDialog ? 'open' : 'closed'}`}
        mode="create"
        open={showCreateDialog}
        keys={keys}
        hasEntityTypeMapping={hasStatusEntityTypesMapping}
        onSaved={loadStatusData}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) void loadStatusData()
        }}
      />

      <StatusDialog
        key={`status-edit-${editStatusRow ? asText(editStatusRow[keys.id]) : 'none'}-${Boolean(editStatusRow) ? 'open' : 'closed'}`}
        mode="edit"
        open={Boolean(editStatusRow)}
        statusRow={editStatusRow}
        keys={keys}
        hasEntityTypeMapping={hasStatusEntityTypesMapping}
        onSaved={loadStatusData}
        onOpenChange={(open) => {
          if (!open) setEditStatusRow(null)
        }}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteStatusRow)}
        onOpenChange={(open) => {
          if (!open) setDeleteStatusRow(null)
        }}
        title="Delete Status"
        description="This will remove this status and all grouped entity-type variants."
        itemName={String(deleteStatusRow?.status_name || 'Status')}
        onConfirm={async () => {
          const statusIds = getStatusIds(deleteStatusRow)
          if (statusIds.length === 0) {
            return { error: 'Invalid status id' }
          }

          for (const statusId of statusIds) {
            const result = await deleteStatus(statusId)
            if (result.error) return result
          }

          return { success: true }
        }}
      />

      <div className="flex h-full flex-col">
        <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-zinc-400" />
              <h2 className="text-lg font-semibold text-zinc-100">Status</h2>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                {statusRows.length}
              </span>
            </div>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
            >
              <Plus className="h-4 w-4" />
              Add Status
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loadError ? (
            <div className="rounded-md border border-red-900/60 bg-red-950/20 p-4">
              <p className="text-sm font-medium text-red-300">Unable to load statuses</p>
              <p className="mt-1 text-xs text-red-200/80">{loadError}</p>
            </div>
          ) : statusRows.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Flag className="mx-auto mb-4 h-12 w-12 text-zinc-700" />
                <h3 className="mb-2 text-lg font-semibold text-zinc-100">No statuses yet</h3>
                <p className="mb-4 text-sm text-zinc-400">
                  Create status rows to define pipeline state options.
                </p>
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
                >
                  Create First Status
                </button>
              </div>
            </div>
          ) : (
            <EntityTable
              columns={columns}
              data={statusRows}
              entityType={resolvedTable || 'statuses'}
              onAdd={() => setShowCreateDialog(true)}
              onRowContextMenu={handleRowContextMenu}
              onCellUpdate={handleInlineCellUpdate}
              cellEditTrigger="icon"
            />
          )}
        </div>
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
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-zinc-100 transition hover:bg-zinc-800"
              onClick={() => {
                openEditDialog(contextMenu.row)
                setContextMenu(null)
              }}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-red-400 transition hover:bg-zinc-800"
              onClick={() => {
                openDeleteDialog(contextMenu.row)
                setContextMenu(null)
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

function StatusDialog({
  mode,
  open,
  onOpenChange,
  onSaved,
  keys,
  hasEntityTypeMapping,
  statusRow,
}: {
  mode: 'create' | 'edit'
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void | Promise<void>
  keys: StatusSemanticKeys
  hasEntityTypeMapping: boolean
  statusRow?: RowRecord | null
}) {
  const row = statusRow || {}
  const rowName = mode === 'edit' ? asText(row?.[keys.name]) : ''
  const rowCode =
    mode === 'edit' && keys.shortCode ? asText(row?.[keys.shortCode]) : ''
  const rowColor =
    mode === 'edit' && keys.backgroundColor ? asText(row?.[keys.backgroundColor]) : ''
  const rowIcon = mode === 'edit' && keys.icon ? asText(row?.[keys.icon]) : ''
  const rowLocked =
    mode === 'edit' && keys.lockedBySystem ? asBoolean(row?.[keys.lockedBySystem]) : false
  const rowEntityTypesRaw =
    mode === 'edit' && Array.isArray(row._entity_types)
      ? row._entity_types.map((item) => asText(item))
      : mode === 'edit' && keys.entityType
        ? [asText(row?.[keys.entityType])]
        : []
  const rowEntityTypes = normalizeEntityTypes(rowEntityTypesRaw)
  const rowSort = mode === 'edit' && keys.sortOrder ? asText(row?.[keys.sortOrder]) : ''
  const fallbackCode = rowName ? toStatusCode(rowName) : ''
  const fallbackColor = '#6b7280'
  const resolvedColor = isValidColor(rowColor) ? rowColor : fallbackColor

  const [name, setName] = useState(rowName)
  const [shortCode, setShortCode] = useState(rowCode || fallbackCode)
  const [backgroundColor, setBackgroundColor] = useState(resolvedColor)
  const [icon, setIcon] = useState(rowIcon)
  const [lockedBySystem, setLockedBySystem] = useState(rowLocked)
  const [entityTypes, setEntityTypes] = useState<string[]>(rowEntityTypes)
  const [sortOrder, setSortOrder] = useState(rowSort)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleEntityType(type: string, checked: boolean) {
    setEntityTypes((prev) => {
      if (type === 'all') {
        return checked ? ['all'] : ['all']
      }

      const next = new Set(prev)
      if (checked) {
        next.delete('all')
        next.add(type)
      } else {
        next.delete(type)
      }

      const values = Array.from(next)
      return values.length > 0 ? values : ['all']
    })
  }

  async function handleSave() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Status name is required')
      return
    }

    const parsedOrder = sortOrder.trim() === '' ? null : Number.parseInt(sortOrder, 10)
    if (parsedOrder !== null && Number.isNaN(parsedOrder)) {
      setError('Sort order must be a valid number')
      return
    }

    const payload = {
      name: trimmedName,
      code: shortCode.trim() || toStatusCode(trimmedName),
      background_color: backgroundColor.trim() || null,
      icon: icon.trim() || null,
      locked_by_system: lockedBySystem,
      entity_type: entityTypes.length === 1 ? entityTypes[0] : 'all',
      entity_types: entityTypes,
      sort_order: parsedOrder,
    }

    setIsSaving(true)
    setError('')

    const statusIds = getStatusIds(statusRow)
    let result: { error?: string | undefined } | null = null

    if (mode === 'create') {
      result = await createStatus(payload)
    } else {
      const primaryStatusId = statusIds[0] ?? Number(statusRow?.[keys.id])
      if (Number.isNaN(primaryStatusId)) {
        setIsSaving(false)
        setError('Invalid status id')
        return
      }

      result = await updateStatus(primaryStatusId, payload)
      if (!result.error && statusIds.length > 1) {
        for (const duplicateId of statusIds.slice(1)) {
          const deleteResult = await deleteStatus(duplicateId)
          if (deleteResult.error) {
            result = { error: deleteResult.error }
            break
          }
        }
      }
    }

    setIsSaving(false)
    if (result?.error) {
      setError(result.error)
      return
    }

    await onSaved()
    onOpenChange(false)
  }

  const title = mode === 'create' ? 'Create Status' : 'Edit Status'
  const description =
    mode === 'create'
      ? 'Add a new status row based on the status.csv schema.'
      : 'Update status fields and values.'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden border-zinc-800 bg-zinc-900 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <Flag className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto pr-1">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Status Name</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="In Progress"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Short Code</label>
              <input
                type="text"
                value={shortCode}
                onChange={(event) => setShortCode(event.target.value)}
                placeholder="ip"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">
                Background Color
              </label>
              <input
                type="color"
                value={backgroundColor}
                onChange={(event) => setBackgroundColor(event.target.value)}
                className="h-[38px] w-full rounded-md border border-zinc-700 bg-zinc-800 px-1.5 py-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Icon</label>
              <input
                type="text"
                value={icon}
                onChange={(event) => setIcon(event.target.value)}
                placeholder="icon_hourglass"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">
                Entity Types (multi-select)
              </label>
              <div className="space-y-2 rounded-md border border-zinc-700 bg-zinc-800 p-2">
                <label className="flex items-center gap-2 text-xs text-zinc-200">
                  <input
                    type="checkbox"
                    checked={entityTypes.includes('all')}
                    onChange={(event) => toggleEntityType('all', event.target.checked)}
                    className="h-3.5 w-3.5 rounded border border-zinc-700 bg-zinc-900"
                  />
                  All entities
                </label>

                <div className="grid grid-cols-2 gap-1.5">
                  {ENTITY_TYPE_MULTI_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 text-xs text-zinc-300"
                    >
                      <input
                        type="checkbox"
                        checked={entityTypes.includes(option.value)}
                        disabled={entityTypes.includes('all')}
                        onChange={(event) =>
                          toggleEntityType(option.value, event.target.checked)
                        }
                        className="h-3.5 w-3.5 rounded border border-zinc-700 bg-zinc-900 disabled:opacity-40"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
              {!hasEntityTypeMapping ? (
                <p className="mt-1 text-[11px] text-amber-300">
                  Multi-entity persistence requires the `status_entity_types` table from the SQL migration.
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Sort Order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                placeholder="10"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
            <label className="flex items-center gap-2 pt-7 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={lockedBySystem}
                onChange={(event) => setLockedBySystem(event.target.checked)}
                className="h-4 w-4 rounded border border-zinc-700 bg-zinc-900"
              />
              Locked by System
            </label>
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:border-zinc-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black transition hover:bg-amber-400 disabled:opacity-50"
            >
              {isSaving
                ? mode === 'create'
                  ? 'Creating...'
                  : 'Saving...'
                : mode === 'create'
                  ? 'Create Status'
                  : 'Save Changes'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function isValidColor(value: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
}
