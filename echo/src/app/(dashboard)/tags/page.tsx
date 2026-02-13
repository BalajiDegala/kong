'use client'

import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createTag, deleteTag, listTagUsageCounts, updateTag } from '@/actions/tags'
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
import { Tag, Plus, Pencil, Trash2 } from 'lucide-react'

const TAG_TABLE_CANDIDATES = ['tags', 'tag'] as const

type RowRecord = Record<string, unknown>

type TagSemanticKeys = {
  id: string
  name: string
  usageCount: string | null
  color: string | null
  description: string | null
  createdBy: string | null
  updatedBy: string | null
  createdAt: string | null
  updatedAt: string | null
}

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

function isValidColor(value: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
}

function toTagUsageKey(value: unknown): string {
  return asText(value).trim().toLowerCase()
}

export default function TagsPage() {
  const [tags, setTags] = useState<RowRecord[]>([])
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [resolvedTable, setResolvedTable] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editTagRow, setEditTagRow] = useState<RowRecord | null>(null)
  const [deleteTagRow, setDeleteTagRow] = useState<RowRecord | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    row: RowRecord
  } | null>(null)

  useEffect(() => {
    void loadTagsData()
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

  async function loadTagsData() {
    try {
      setIsLoading(true)
      const supabase = createClient()

      let rows: RowRecord[] = []
      let tableName: string | null = null
      let lastError: unknown = null

      for (const table of TAG_TABLE_CANDIDATES) {
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
        setTags([])
        setResolvedTable(null)
        setLoadError(
          errorMessage(lastError) ||
            'Tags table was not found. Create the tags table before using this page.'
        )
        return
      }

      rows.sort((a, b) => {
        const aLabel = asText(a?.name || a?.tag_name || a?.id).toLowerCase()
        const bLabel = asText(b?.name || b?.tag_name || b?.id).toLowerCase()
        return aLabel.localeCompare(bLabel)
      })

      const usageResult = await listTagUsageCounts()
      if (usageResult.error) {
        console.error('Failed to compute tag usage counts:', usageResult.error)
        setUsageCounts({})
      } else {
        setUsageCounts(usageResult.data || {})
      }

      setTags(rows)
      setResolvedTable(tableName)
      setLoadError('')
    } catch (error: unknown) {
      console.error('Failed to load tags:', error)
      setTags([])
      setUsageCounts({})
      setResolvedTable(null)
      setLoadError(error instanceof Error ? error.message : 'Failed to load tags')
    } finally {
      setIsLoading(false)
    }
  }

  const keys = useMemo<TagSemanticKeys>(() => {
    const columns = collectColumns(tags)

    return {
      id: resolveColumn(columns, ['id']) || 'id',
      name: resolveColumn(columns, ['name', 'tag_name']) || 'name',
      usageCount: resolveColumn(columns, ['usage_count', 'uses']),
      color: resolveColumn(columns, ['color']),
      description: resolveColumn(columns, ['description']),
      createdBy: resolveColumn(columns, ['created_by']),
      updatedBy: resolveColumn(columns, ['updated_by']),
      createdAt: resolveColumn(columns, ['created_at', 'date_created']),
      updatedAt: resolveColumn(columns, ['updated_at', 'date_updated']),
    }
  }, [tags])

  const tagRows = useMemo(
    () =>
      tags.map((row) => {
        const tagId = Number(row?.[keys.id])
        return {
          ...row,
          _tag_id: tagId,
          _raw: row,
          tag_name: asText(row?.[keys.name]) || '—',
          usage_count:
            usageCounts[toTagUsageKey(row?.[keys.name])] ??
            (keys.usageCount ? Number(row?.[keys.usageCount] || 0) : 0),
          color_value: keys.color ? asText(row?.[keys.color]) : '',
          description_value: keys.description ? asText(row?.[keys.description]) : '',
          created_by_value: keys.createdBy ? asText(row?.[keys.createdBy]) : '',
          updated_by_value: keys.updatedBy ? asText(row?.[keys.updatedBy]) : '',
          created_at_value: keys.createdAt ? row?.[keys.createdAt] : null,
          updated_at_value: keys.updatedAt ? row?.[keys.updatedAt] : null,
        }
      }),
    [tags, keys, usageCounts]
  )

  const columns = useMemo<TableColumn[]>(
    () => [
      {
        id: 'tag_name',
        label: 'Tag Name',
        type: 'text',
        width: '240px',
        editable: true,
        editor: 'text',
      },
      {
        id: 'usage_count',
        label: 'Usage Count',
        type: 'number',
        width: '130px',
        editable: false,
      },
      {
        id: 'color_value',
        label: 'Color',
        type: 'color',
        width: '120px',
        editable: Boolean(keys.color),
        editor: 'color',
      },
      {
        id: 'description_value',
        label: 'Description',
        type: 'text',
        width: '260px',
        editable: Boolean(keys.description),
        editor: 'text',
      },
      { id: 'created_by_value', label: 'Created by', type: 'text', width: '180px' },
      { id: 'created_at_value', label: 'Date Created', type: 'datetime', width: '180px' },
      { id: 'updated_by_value', label: 'Updated by', type: 'text', width: '180px' },
      { id: 'updated_at_value', label: 'Date Updated', type: 'datetime', width: '180px' },
    ],
    [keys.color, keys.description]
  )

  async function handleInlineCellUpdate(row: RowRecord, column: TableColumn, value: unknown) {
    const tagId = Number(row?._tag_id)
    if (Number.isNaN(tagId)) {
      throw new Error('Invalid tag id')
    }

    const payload: Record<string, unknown> = {}
    const localPatch: Record<string, unknown> = {}
    if (column.id === 'tag_name') {
      const nextValue = asText(value)
      payload.name = nextValue
      localPatch[keys.name] = nextValue
    } else if (column.id === 'color_value') {
      const nextValue = asText(value) || null
      payload.color = nextValue
      if (keys.color) {
        localPatch[keys.color] = nextValue
      }
    } else if (column.id === 'description_value') {
      const nextValue = asText(value) || null
      payload.description = nextValue
      if (keys.description) {
        localPatch[keys.description] = nextValue
      }
    } else {
      return
    }

    const result = await updateTag(tagId, payload)
    if (result.error) {
      throw new Error(result.error)
    }

    setTags((previous) =>
      previous.map((tagRow) => {
        const currentTagId = Number(tagRow?.[keys.id])
        if (currentTagId !== tagId) {
          return tagRow
        }
        return {
          ...tagRow,
          ...localPatch,
        }
      })
    )
  }

  function openEditDialog(row: RowRecord) {
    setEditTagRow((row as any)?._raw || row)
  }

  function openDeleteDialog(row: RowRecord) {
    setDeleteTagRow(row)
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
        <p className="text-zinc-400">Loading tags...</p>
      </div>
    )
  }

  return (
    <>
      <TagDialog
        key={`tags-create-${showCreateDialog ? 'open' : 'closed'}`}
        mode="create"
        open={showCreateDialog}
        keys={keys}
        onSaved={loadTagsData}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) void loadTagsData()
        }}
      />

      <TagDialog
        key={`tags-edit-${editTagRow ? asText(editTagRow[keys.id]) : 'none'}-${Boolean(editTagRow) ? 'open' : 'closed'}`}
        mode="edit"
        open={Boolean(editTagRow)}
        keys={keys}
        tagRow={editTagRow}
        onSaved={loadTagsData}
        onOpenChange={(open) => {
          if (!open) setEditTagRow(null)
        }}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteTagRow)}
        onOpenChange={(open) => {
          if (!open) setDeleteTagRow(null)
        }}
        title="Delete Tag"
        description="This will remove the tag row."
        itemName={String(deleteTagRow?.tag_name || 'Tag')}
        onConfirm={async () => {
          const tagId = Number(deleteTagRow?._tag_id)
          if (Number.isNaN(tagId)) {
            return { error: 'Invalid tag id' }
          }
          return deleteTag(tagId)
        }}
      />

      <div className="flex h-full flex-col">
        <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-zinc-400" />
              <h2 className="text-lg font-semibold text-zinc-100">Tags</h2>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                {tags.length}
              </span>
            </div>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
            >
              <Plus className="h-4 w-4" />
              Add Tag
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loadError ? (
            <div className="rounded-md border border-red-900/60 bg-red-950/20 p-4">
              <p className="text-sm font-medium text-red-300">Unable to load tags</p>
              <p className="mt-1 text-xs text-red-200/80">{loadError}</p>
            </div>
          ) : tags.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Tag className="mx-auto mb-4 h-12 w-12 text-zinc-700" />
                <h3 className="mb-2 text-lg font-semibold text-zinc-100">No tags yet</h3>
                <p className="mb-4 text-sm text-zinc-400">Create tags to classify entities.</p>
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
                >
                  Create First Tag
                </button>
              </div>
            </div>
          ) : (
            <EntityTable
              columns={columns}
              data={tagRows}
              entityType={resolvedTable || 'tags'}
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

function TagDialog({
  mode,
  open,
  onOpenChange,
  onSaved,
  keys,
  tagRow,
}: {
  mode: 'create' | 'edit'
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void | Promise<void>
  keys: TagSemanticKeys
  tagRow?: RowRecord | null
}) {
  const row = tagRow || {}
  const rowName = mode === 'edit' ? asText(row?.[keys.name]) : ''
  const rowColor = mode === 'edit' && keys.color ? asText(row?.[keys.color]) : ''
  const rowDescription =
    mode === 'edit' && keys.description ? asText(row?.[keys.description]) : ''

  const [name, setName] = useState(rowName)
  const [color, setColor] = useState(isValidColor(rowColor) ? rowColor : '#6b7280')
  const [description, setDescription] = useState(rowDescription)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Tag name is required')
      return
    }

    const payload = {
      name: trimmedName,
      color: color.trim() || null,
      description: description.trim() || null,
    }

    setIsSaving(true)
    setError('')

    const tagId = Number(tagRow?.[keys.id])
    const result =
      mode === 'create'
        ? await createTag(payload)
        : Number.isNaN(tagId)
          ? { error: 'Invalid tag id' }
          : await updateTag(tagId, payload)

    setIsSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    await onSaved()
    onOpenChange(false)
  }

  const title = mode === 'create' ? 'Create Tag' : 'Edit Tag'
  const descriptionText =
    mode === 'create'
      ? 'Add a tag row based on the tags.csv schema.'
      : 'Update tag fields and values.'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden border-zinc-800 bg-zinc-900 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <Tag className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">{descriptionText}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto pr-1">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Tag Name</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="main"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Color</label>
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-[38px] w-full rounded-md border border-zinc-700 bg-zinc-800 px-1.5 py-1"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="Optional tag description"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
            />
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
                  ? 'Create Tag'
                  : 'Save Changes'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
