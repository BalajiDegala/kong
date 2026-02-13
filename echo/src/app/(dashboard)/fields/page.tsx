'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  addFieldToEntity,
  bootstrapSchemaFields,
  createChoiceSet,
  createSchemaField,
  deactivateSchemaField,
  listChoiceSets,
  listSchemaFields,
  updateSchemaFieldMeta,
} from '@/actions/fields'
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
import { FileSpreadsheet, Plus, RefreshCw } from 'lucide-react'

type ChoiceSetItem = {
  id: number
  choice_set_id: number
  value: string
  label: string
  color?: string | null
  sort_order: number
  is_active: boolean
}

type ChoiceSet = {
  id: number
  name: string
  description?: string | null
  is_active: boolean
  items: ChoiceSetItem[]
}

type RuntimeFieldRow = {
  field_id: number
  entity_type: string
  table_name: string
  column_name: string
  required: boolean
  visible_by_default: boolean
  display_order: number
  code: string
  name: string
  data_type: string
  field_type: string
  description?: string | null
  default_value?: any
  choice_set_id?: number | null
  field_active: boolean
  updated_at?: string | null
}

type AggregatedFieldRow = {
  id: number
  field_id: number
  name: string
  code: string
  data_type: string
  field_type: string
  description: string
  choice_set_id: number | null
  choice_set_name: string
  entities: string[]
  entities_label: string
  entity_count: number
  required_default: boolean
  visible_by_default: boolean
  display_order: number
  active_status: 'Active' | 'Inactive'
  updated_at: string | null
}

const ENTITY_OPTIONS = [
  { value: 'asset', label: 'Asset' },
  { value: 'sequence', label: 'Sequence' },
  { value: 'shot', label: 'Shot' },
  { value: 'task', label: 'Task' },
  { value: 'version', label: 'Version' },
  { value: 'note', label: 'Note' },
  { value: 'published_file', label: 'Published File' },
  { value: 'project', label: 'Project' },
  { value: 'department', label: 'Department' },
  { value: 'person', label: 'Person' },
]

const DATA_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'list', label: 'List' },
  { value: 'status_list', label: 'Status List' },
  { value: 'number', label: 'Number' },
  { value: 'float', label: 'Float' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
  { value: 'date_time', label: 'Date and Time' },
  { value: 'entity', label: 'Entity' },
  { value: 'multi_entity', label: 'Multi-Entity' },
  { value: 'image', label: 'Image' },
  { value: 'url', label: 'URL' },
  { value: 'color', label: 'Color' },
  { value: 'serializable', label: 'JSON/Serializable' },
  { value: 'duration', label: 'Duration' },
  { value: 'percent', label: 'Percent' },
]

const FIELD_TYPE_OPTIONS = [
  { value: 'dynamic', label: 'Dynamic' },
  { value: 'permanent', label: 'Permanent' },
  { value: 'custom', label: 'Custom' },
  { value: 'system_owned', label: 'System Owned' },
]

function slugifyFieldCode(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return slug.replace(/_+/g, '_')
}

function formatEntityList(values: string[]) {
  if (values.length === 0) return '—'
  if (values.length <= 2) {
    return values.map((value) => ENTITY_OPTIONS.find((item) => item.value === value)?.label || value).join(', ')
  }

  const first = ENTITY_OPTIONS.find((item) => item.value === values[0])?.label || values[0]
  const second = ENTITY_OPTIONS.find((item) => item.value === values[1])?.label || values[1]
  return `${first}, ${second} +${values.length - 2} more`
}

function parseChoiceItems(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [rawValue, rawLabel] = line.includes('|')
        ? line.split('|', 2)
        : [line, line]
      const value = rawValue.trim()
      const label = (rawLabel || rawValue).trim() || value
      return {
        value,
        label,
        sort_order: (index + 1) * 10,
      }
    })
    .filter((item) => item.value.length > 0)
}

function toIsoDate(value: string | null | undefined) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

export default function FieldsPage() {
  const [runtimeRows, setRuntimeRows] = useState<RuntimeFieldRow[]>([])
  const [choiceSets, setChoiceSets] = useState<ChoiceSet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showCreateChoiceSetDialog, setShowCreateChoiceSetDialog] = useState(false)
  const [editRow, setEditRow] = useState<AggregatedFieldRow | null>(null)
  const [deactivateRow, setDeactivateRow] = useState<AggregatedFieldRow | null>(null)

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    try {
      setIsLoading(true)
      setError(null)

      const [fieldsResult, choiceSetsResult] = await Promise.all([
        listSchemaFields(),
        listChoiceSets(),
      ])

      if (fieldsResult.error) throw new Error(fieldsResult.error)
      if (choiceSetsResult.error) throw new Error(choiceSetsResult.error)

      setRuntimeRows((fieldsResult.data || []) as RuntimeFieldRow[])
      setChoiceSets((choiceSetsResult.data || []) as ChoiceSet[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fields')
    } finally {
      setIsLoading(false)
    }
  }

  const fieldRows = useMemo<AggregatedFieldRow[]>(() => {
    const choiceSetById = new Map<number, ChoiceSet>()
    for (const choiceSet of choiceSets) {
      choiceSetById.set(Number(choiceSet.id), choiceSet)
    }

    const grouped = new Map<number, AggregatedFieldRow>()
    const requiredCount = new Map<number, number>()
    const visibleCount = new Map<number, number>()
    const mappingCount = new Map<number, number>()
    const entitySets = new Map<number, Set<string>>()

    for (const raw of runtimeRows) {
      const fieldId = Number(raw.field_id)
      if (Number.isNaN(fieldId)) continue

      if (!grouped.has(fieldId)) {
        const choiceSetId = raw.choice_set_id ? Number(raw.choice_set_id) : null
        const choiceSetName =
          choiceSetId && choiceSetById.has(choiceSetId)
            ? choiceSetById.get(choiceSetId)!.name
            : ''

        grouped.set(fieldId, {
          id: fieldId,
          field_id: fieldId,
          name: String(raw.name || ''),
          code: String(raw.code || raw.column_name || ''),
          data_type: String(raw.data_type || 'text'),
          field_type: String(raw.field_type || 'dynamic'),
          description: String(raw.description || ''),
          choice_set_id: choiceSetId,
          choice_set_name: choiceSetName,
          entities: [],
          entities_label: '',
          entity_count: 0,
          required_default: false,
          visible_by_default: true,
          display_order: Number.isFinite(Number(raw.display_order))
            ? Number(raw.display_order)
            : 1000,
          active_status: raw.field_active ? 'Active' : 'Inactive',
          updated_at: toIsoDate(raw.updated_at),
        })
      }

      if (!entitySets.has(fieldId)) {
        entitySets.set(fieldId, new Set())
      }
      entitySets.get(fieldId)!.add(String(raw.entity_type))

      requiredCount.set(
        fieldId,
        (requiredCount.get(fieldId) || 0) + (raw.required ? 1 : 0)
      )
      visibleCount.set(
        fieldId,
        (visibleCount.get(fieldId) || 0) + (raw.visible_by_default ? 1 : 0)
      )
      mappingCount.set(fieldId, (mappingCount.get(fieldId) || 0) + 1)

      const existing = grouped.get(fieldId)!
      const rawOrder = Number(raw.display_order)
      if (!Number.isNaN(rawOrder)) {
        existing.display_order = Math.min(existing.display_order, rawOrder)
      }
      const updated = toIsoDate(raw.updated_at)
      if (updated && (!existing.updated_at || updated > existing.updated_at)) {
        existing.updated_at = updated
      }
    }

    const rows = Array.from(grouped.values()).map((row) => {
      const set = entitySets.get(row.field_id) || new Set<string>()
      const entities = Array.from(set).sort()
      const totalMappings = mappingCount.get(row.field_id) || 0
      const visibleMappings = visibleCount.get(row.field_id) || 0

      return {
        ...row,
        entities,
        entity_count: entities.length,
        entities_label: formatEntityList(entities),
        required_default: (requiredCount.get(row.field_id) || 0) > 0,
        visible_by_default: totalMappings === 0 ? true : visibleMappings === totalMappings,
      }
    })

    rows.sort((a, b) => {
      const byName = a.name.localeCompare(b.name)
      if (byName !== 0) return byName
      return a.field_id - b.field_id
    })

    return rows
  }, [choiceSets, runtimeRows])

  const columns = useMemo<TableColumn[]>(
    () => [
      {
        id: 'name',
        label: 'Field Name',
        type: 'text',
        width: '220px',
        editable: true,
        editor: 'text',
      },
      { id: 'code', label: 'Field Code', type: 'text', width: '180px' },
      {
        id: 'data_type',
        label: 'Data Type',
        type: 'text',
        width: '130px',
      },
      {
        id: 'field_type',
        label: 'Field Type',
        type: 'text',
        width: '120px',
        editable: true,
        editor: 'select',
        options: FIELD_TYPE_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label,
        })),
      },
      {
        id: 'entities_label',
        label: 'Entity Type(s)',
        type: 'text',
        width: '240px',
      },
      {
        id: 'choice_set_name',
        label: 'List Name',
        type: 'text',
        width: '180px',
      },
      {
        id: 'required_default',
        label: 'Required',
        type: 'boolean',
        width: '100px',
      },
      {
        id: 'visible_by_default',
        label: 'Visible',
        type: 'boolean',
        width: '100px',
      },
      {
        id: 'display_order',
        label: 'Order',
        type: 'number',
        width: '90px',
      },
      {
        id: 'active_status',
        label: 'Status',
        type: 'status',
        width: '110px',
        editable: true,
        editor: 'select',
        options: [
          { value: 'Active', label: 'Active' },
          { value: 'Inactive', label: 'Inactive' },
        ],
      },
      {
        id: 'description',
        label: 'Description',
        type: 'text',
        width: '260px',
        editable: true,
        editor: 'textarea',
      },
      {
        id: 'updated_at',
        label: 'Updated',
        type: 'datetime',
        width: '190px',
      },
    ],
    []
  )

  async function handleCellUpdate(row: any, column: TableColumn, value: any) {
    const fieldId = Number(row?.field_id)
    if (Number.isNaN(fieldId)) return

    const patch: Record<string, any> = {}
    const localPatch: Partial<RuntimeFieldRow> = {}
    if (column.id === 'name') {
      const nextName = String(value || '').trim()
      if (!nextName) throw new Error('Field name is required')
      patch.name = nextName
      localPatch.name = nextName
    } else if (column.id === 'field_type') {
      const nextValue = String(value || 'dynamic').trim().toLowerCase()
      patch.field_type = nextValue
      localPatch.field_type = nextValue
    } else if (column.id === 'description') {
      const nextValue = String(value || '')
      patch.description = nextValue
      localPatch.description = nextValue
    } else if (column.id === 'active_status') {
      const nextValue = String(value || '').toLowerCase() === 'active'
      patch.is_active = nextValue
      localPatch.field_active = nextValue
    } else {
      return
    }

    const result = await updateSchemaFieldMeta(fieldId, patch)
    if (result.error) {
      throw new Error(result.error)
    }

    const nowIso = new Date().toISOString()
    setRuntimeRows((previous) =>
      previous.map((runtimeRow) =>
        Number(runtimeRow.field_id) === fieldId
          ? {
              ...runtimeRow,
              ...localPatch,
              updated_at: nowIso,
            }
          : runtimeRow
      )
    )
  }

  async function handleSyncExistingColumns() {
    setIsSyncing(true)
    setError(null)
    try {
      const result = await bootstrapSchemaFields(null)
      if (result.error) throw new Error(result.error)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync columns')
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-400">Loading fields...</p>
      </div>
    )
  }

  return (
    <>
      <CreateFieldDialog
        open={showCreateDialog}
        choiceSets={choiceSets}
        onSaved={loadData}
        onOpenChange={(open) => setShowCreateDialog(open)}
      />

      <CreateChoiceSetDialog
        open={showCreateChoiceSetDialog}
        onSaved={loadData}
        onOpenChange={(open) => setShowCreateChoiceSetDialog(open)}
      />

      <EditFieldDialog
        open={Boolean(editRow)}
        field={editRow}
        choiceSets={choiceSets}
        onSaved={loadData}
        onOpenChange={(open) => {
          if (!open) setEditRow(null)
        }}
      />

      <DeleteConfirmDialog
        open={Boolean(deactivateRow)}
        onOpenChange={(open) => {
          if (!open) setDeactivateRow(null)
        }}
        title="Deactivate Field"
        description="This will hide the field from runtime schema views. It will not drop database columns."
        itemName={deactivateRow?.name || 'Field'}
        onConfirm={async () => {
          if (!deactivateRow?.field_id) return { error: 'Missing field id' }
          const result = await deactivateSchemaField(
            deactivateRow.field_id,
            'Deactivated from Fields page'
          )
          if (result.error) return { error: result.error }
          await loadData()
          return { success: true }
        }}
      />

      <div className="flex h-full flex-col">
        <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-zinc-400" />
              <h2 className="text-lg font-semibold text-zinc-100">Fields</h2>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                {fieldRows.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncExistingColumns}
                disabled={isSyncing}
                className="flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:border-zinc-600 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync Existing Columns
              </button>
              <button
                onClick={() => setShowCreateChoiceSetDialog(true)}
                className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:border-zinc-600"
              >
                Add List
              </button>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
              >
                <Plus className="h-4 w-4" />
                Add Field
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {error ? (
            <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          ) : null}

          {fieldRows.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <FileSpreadsheet className="mx-auto mb-4 h-12 w-12 text-zinc-700" />
                <h3 className="mb-2 text-lg font-semibold text-zinc-100">No fields yet</h3>
                <p className="mb-4 text-sm text-zinc-400">
                  Create your first custom field and attach it to one or more entities.
                </p>
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
                >
                  Create First Field
                </button>
              </div>
            </div>
          ) : (
            <EntityTable
              columns={columns}
              data={fieldRows}
              entityType="fields"
              onAdd={() => setShowCreateDialog(true)}
              onEdit={(row) => setEditRow(row as AggregatedFieldRow)}
              onDelete={(row) => setDeactivateRow(row as AggregatedFieldRow)}
              onCellUpdate={handleCellUpdate}
              cellEditTrigger="icon"
            />
          )}
        </div>
      </div>
    </>
  )
}

function CreateChoiceSetDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void | Promise<void>
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [itemsText, setItemsText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setName('')
    setDescription('')
    setItemsText('')
    setError('')
    setIsSaving(false)
  }, [open])

  async function handleSave() {
    if (!name.trim()) {
      setError('List name is required')
      return
    }

    setIsSaving(true)
    setError('')
    const result = await createChoiceSet({
      name: name.trim(),
      description: description.trim() || null,
      items: parseChoiceItems(itemsText),
    })
    setIsSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    await onSaved()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden border-zinc-800 bg-zinc-900 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Create List</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Define reusable list choices for list/status fields.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">List Name</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
              placeholder="Task Type"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Description</label>
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              List Choices
            </label>
            <textarea
              rows={8}
              value={itemsText}
              onChange={(event) => setItemsText(event.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
              placeholder={'In Progress\nDone\nBlocked|Blocked by Dependency'}
            />
            <p className="mt-1 text-xs text-zinc-500">
              One option per line. Use `value|Label` for custom labels.
            </p>
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
              {isSaving ? 'Creating...' : 'Create List'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CreateFieldDialog({
  open,
  onOpenChange,
  onSaved,
  choiceSets,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void | Promise<void>
  choiceSets: ChoiceSet[]
}) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [codeTouched, setCodeTouched] = useState(false)
  const [dataType, setDataType] = useState('text')
  const [fieldType, setFieldType] = useState('dynamic')
  const [description, setDescription] = useState('')
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set())
  const [linkTargetEntities, setLinkTargetEntities] = useState<Set<string>>(new Set())
  const [required, setRequired] = useState(false)
  const [visibleByDefault, setVisibleByDefault] = useState(true)
  const [displayOrder, setDisplayOrder] = useState('1000')
  const [choiceSetId, setChoiceSetId] = useState('')
  const [newChoiceSetName, setNewChoiceSetName] = useState('')
  const [newChoiceSetDescription, setNewChoiceSetDescription] = useState('')
  const [newChoiceSetItems, setNewChoiceSetItems] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const isChoiceType = dataType === 'list' || dataType === 'status_list'
  const isLinkType = dataType === 'entity' || dataType === 'multi_entity'

  useEffect(() => {
    if (!open) return
    setName('')
    setCode('')
    setCodeTouched(false)
    setDataType('text')
    setFieldType('dynamic')
    setDescription('')
    setSelectedEntities(new Set())
    setLinkTargetEntities(new Set())
    setRequired(false)
    setVisibleByDefault(true)
    setDisplayOrder('1000')
    setChoiceSetId('')
    setNewChoiceSetName('')
    setNewChoiceSetDescription('')
    setNewChoiceSetItems('')
    setIsSaving(false)
    setError('')
  }, [open])

  function toggleEntity(setter: (value: Set<string>) => void, current: Set<string>, value: string) {
    const next = new Set(current)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setter(next)
  }

  async function handleCreate() {
    const nextName = name.trim()
    const nextCode = (codeTouched ? code : slugifyFieldCode(name)).trim().toLowerCase()
    if (!nextName) {
      setError('Field name is required')
      return
    }
    if (!nextCode) {
      setError('Field code is required')
      return
    }

    const entities = Array.from(selectedEntities)
    if (entities.length === 0) {
      setError('Select at least one entity type')
      return
    }

    const parsedOrder = Number.parseInt(displayOrder, 10)
    if (Number.isNaN(parsedOrder)) {
      setError('Display order must be a number')
      return
    }

    setIsSaving(true)
    setError('')

    let nextChoiceSetId: number | null = choiceSetId ? Number(choiceSetId) : null
    if (isChoiceType && newChoiceSetName.trim()) {
      const createdChoiceSet = await createChoiceSet({
        name: newChoiceSetName.trim(),
        description: newChoiceSetDescription.trim() || null,
        items: parseChoiceItems(newChoiceSetItems),
      })
      if (createdChoiceSet.error || !createdChoiceSet.data) {
        setIsSaving(false)
        setError(createdChoiceSet.error || 'Failed to create list')
        return
      }
      nextChoiceSetId = createdChoiceSet.data.choice_set_id
    }

    const result = await createSchemaField({
      name: nextName,
      code: nextCode,
      data_type: dataType,
      field_type: fieldType as any,
      description: description.trim() || null,
      choice_set_id: nextChoiceSetId,
      entities,
      required,
      visible_by_default: visibleByDefault,
      display_order: parsedOrder,
      link_target_entities: isLinkType ? Array.from(linkTargetEntities) : [],
    })

    setIsSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }

    await onSaved()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden border-zinc-800 bg-zinc-900 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Create Field</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Add a new field and attach it to one or more entities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Field Name</label>
              <input
                type="text"
                value={name}
                onChange={(event) => {
                  const next = event.target.value
                  setName(next)
                  if (!codeTouched) {
                    setCode(slugifyFieldCode(next))
                  }
                }}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
                placeholder="Task Template"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Field Code</label>
              <input
                type="text"
                value={code}
                onChange={(event) => {
                  setCodeTouched(true)
                  setCode(event.target.value.toLowerCase())
                }}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
                placeholder="task_template"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Data Type</label>
              <select
                value={dataType}
                onChange={(event) => setDataType(event.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none"
              >
                {DATA_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Field Type</label>
              <select
                value={fieldType}
                onChange={(event) => setFieldType(event.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none"
              >
                {FIELD_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
              placeholder="Optional field description"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-200">
              <input
                type="checkbox"
                checked={required}
                onChange={(event) => setRequired(event.target.checked)}
                className="h-4 w-4 rounded border border-zinc-700 bg-zinc-900"
              />
              Required by default
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-200">
              <input
                type="checkbox"
                checked={visibleByDefault}
                onChange={(event) => setVisibleByDefault(event.target.checked)}
                className="h-4 w-4 rounded border border-zinc-700 bg-zinc-900"
              />
              Visible by default
            </label>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Display Order</label>
              <input
                type="number"
                value={displayOrder}
                onChange={(event) => setDisplayOrder(event.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Restrict to Entity Type(s)
            </label>
            <div className="grid grid-cols-2 gap-2 rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
              {ENTITY_OPTIONS.map((entity) => (
                <label key={entity.value} className="flex items-center gap-2 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    checked={selectedEntities.has(entity.value)}
                    onChange={() =>
                      toggleEntity(setSelectedEntities, selectedEntities, entity.value)
                    }
                    className="h-4 w-4 rounded border border-zinc-700 bg-zinc-900"
                  />
                  {entity.label}
                </label>
              ))}
            </div>
          </div>

          {isLinkType ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Link Target Entity Type(s)
              </label>
              <div className="grid grid-cols-2 gap-2 rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
                {ENTITY_OPTIONS.map((entity) => (
                  <label key={entity.value} className="flex items-center gap-2 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      checked={linkTargetEntities.has(entity.value)}
                      onChange={() =>
                        toggleEntity(
                          setLinkTargetEntities,
                          linkTargetEntities,
                          entity.value
                        )
                      }
                      className="h-4 w-4 rounded border border-zinc-700 bg-zinc-900"
                    />
                    {entity.label}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {isChoiceType ? (
            <div className="space-y-3 rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Existing List
                </label>
                <select
                  value={choiceSetId}
                  onChange={(event) => setChoiceSetId(event.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none"
                >
                  <option value="">None</option>
                  {choiceSets
                    .filter((choiceSet) => choiceSet.is_active)
                    .map((choiceSet) => (
                      <option key={choiceSet.id} value={choiceSet.id}>
                        {choiceSet.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="border-t border-zinc-800 pt-3">
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Or create a new list
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newChoiceSetName}
                    onChange={(event) => setNewChoiceSetName(event.target.value)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
                    placeholder="List name"
                  />
                  <input
                    type="text"
                    value={newChoiceSetDescription}
                    onChange={(event) => setNewChoiceSetDescription(event.target.value)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
                    placeholder="Description (optional)"
                  />
                </div>
                <textarea
                  rows={5}
                  value={newChoiceSetItems}
                  onChange={(event) => setNewChoiceSetItems(event.target.value)}
                  className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
                  placeholder={'In Progress\nDone\nBlocked|Blocked by Dependency'}
                />
              </div>
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:border-zinc-600"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isSaving}
              className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black transition hover:bg-amber-400 disabled:opacity-50"
            >
              {isSaving ? 'Creating...' : 'Create Field'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EditFieldDialog({
  open,
  onOpenChange,
  onSaved,
  field,
  choiceSets,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void | Promise<void>
  field: AggregatedFieldRow | null
  choiceSets: ChoiceSet[]
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dataType, setDataType] = useState('text')
  const [fieldType, setFieldType] = useState('dynamic')
  const [isActive, setIsActive] = useState(true)
  const [choiceSetId, setChoiceSetId] = useState('')
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set())
  const [entityToAdd, setEntityToAdd] = useState('')
  const [required, setRequired] = useState(false)
  const [visibleByDefault, setVisibleByDefault] = useState(true)
  const [displayOrder, setDisplayOrder] = useState('1000')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const isChoiceType = dataType === 'list' || dataType === 'status_list'

  const originalEntities = useMemo(
    () => new Set(field?.entities || []),
    [field]
  )

  useEffect(() => {
    if (!open || !field) return
    setName(field.name || '')
    setDescription(field.description || '')
    setDataType(field.data_type || 'text')
    setFieldType(field.field_type || 'dynamic')
    setIsActive(field.active_status === 'Active')
    setChoiceSetId(field.choice_set_id ? String(field.choice_set_id) : '')
    setSelectedEntities(new Set(field.entities))
    setEntityToAdd('')
    setRequired(Boolean(field.required_default))
    setVisibleByDefault(Boolean(field.visible_by_default))
    setDisplayOrder(String(field.display_order || 1000))
    setError('')
    setIsSaving(false)
  }, [field, open])

  function addEntityFromDropdown() {
    const nextEntity = entityToAdd.trim().toLowerCase()
    if (!nextEntity || selectedEntities.has(nextEntity)) return

    setSelectedEntities((prev) => {
      const next = new Set(prev)
      next.add(nextEntity)
      return next
    })
    setEntityToAdd('')
  }

  function removeEntity(value: string) {
    if (originalEntities.has(value)) return

    setSelectedEntities((prev) => {
      const next = new Set(prev)
      next.delete(value)
      return next
    })
  }

  async function handleSave() {
    if (!field) return
    const nextName = name.trim()
    if (!nextName) {
      setError('Field name is required')
      return
    }

    const parsedOrder = Number.parseInt(displayOrder, 10)
    if (Number.isNaN(parsedOrder)) {
      setError('Display order must be a number')
      return
    }

    if (selectedEntities.size === 0) {
      setError('Select at least one entity type')
      return
    }

    setIsSaving(true)
    setError('')

    const patch: Record<string, unknown> = {
      name: nextName,
      description: description.trim() || '',
      data_type: dataType,
      field_type: fieldType,
      is_active: isActive,
      choice_set_id: isChoiceType ? (choiceSetId ? Number(choiceSetId) : null) : null,
    }

    const updateResult = await updateSchemaFieldMeta(field.field_id, patch)
    if (updateResult.error) {
      setIsSaving(false)
      setError(updateResult.error)
      return
    }

    const addEntities = Array.from(selectedEntities).filter(
      (entity) => !originalEntities.has(entity)
    )
    for (const entity of addEntities) {
      const addResult = await addFieldToEntity(field.field_id, entity, {
        required,
        visible_by_default: visibleByDefault,
        display_order: parsedOrder,
      })
      if (addResult.error) {
        setIsSaving(false)
        setError(addResult.error)
        return
      }
    }

    setIsSaving(false)
    await onSaved()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden border-zinc-800 bg-zinc-900 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Edit Field</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Update field metadata and attach it to additional entities.
          </DialogDescription>
        </DialogHeader>

        {field ? (
          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">Field Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">Field Code</label>
                <input
                  type="text"
                  value={field.code}
                  readOnly
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">Data Type</label>
                <select
                  value={dataType}
                  onChange={(event) => setDataType(event.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none"
                >
                  {DATA_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">Field Type</label>
                <select
                  value={fieldType}
                  onChange={(event) => setFieldType(event.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none"
                >
                  {FIELD_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
              />
            </div>

            {isChoiceType ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">List Name</label>
                <select
                  value={choiceSetId}
                  onChange={(event) => setChoiceSetId(event.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none"
                >
                  <option value="">None</option>
                  {choiceSets
                    .filter((choiceSet) => choiceSet.is_active)
                    .map((choiceSet) => (
                      <option key={choiceSet.id} value={choiceSet.id}>
                        {choiceSet.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : null}

            <div className="grid grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-4 w-4 rounded border border-zinc-700 bg-zinc-900"
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(event) => setRequired(event.target.checked)}
                  className="h-4 w-4 rounded border border-zinc-700 bg-zinc-900"
                />
                Required (for new links)
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  checked={visibleByDefault}
                  onChange={(event) => setVisibleByDefault(event.target.checked)}
                  className="h-4 w-4 rounded border border-zinc-700 bg-zinc-900"
                />
                Visible (for new links)
              </label>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">
                Display Order (for new links)
              </label>
              <input
                type="number"
                value={displayOrder}
                onChange={(event) => setDisplayOrder(event.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Entity Type(s)
              </label>
              <div className="space-y-3 rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="flex items-center gap-2">
                  <select
                    value={entityToAdd}
                    onChange={(event) => setEntityToAdd(event.target.value)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none"
                  >
                    <option value="">Select entity type</option>
                    {ENTITY_OPTIONS.map((entity) => (
                      <option
                        key={entity.value}
                        value={entity.value}
                        disabled={selectedEntities.has(entity.value)}
                      >
                        {entity.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addEntityFromDropdown}
                    disabled={!entityToAdd || selectedEntities.has(entityToAdd)}
                    className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:border-zinc-600 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {Array.from(selectedEntities)
                    .sort()
                    .map((entityType) => {
                      const label =
                        ENTITY_OPTIONS.find((entity) => entity.value === entityType)?.label ||
                        entityType
                      const isOriginal = originalEntities.has(entityType)

                      return (
                        <button
                          key={entityType}
                          type="button"
                          onClick={() => removeEntity(entityType)}
                          disabled={isOriginal}
                          className={`rounded-full border px-3 py-1 text-xs ${
                            isOriginal
                              ? 'border-zinc-700 bg-zinc-800 text-zinc-200'
                              : 'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:border-amber-400'
                          } disabled:cursor-not-allowed disabled:opacity-70`}
                        >
                          {label}
                          {isOriginal ? '' : ' ×'}
                        </button>
                      )
                    })}
                  {selectedEntities.size === 0 ? (
                    <span className="text-xs text-zinc-500">No entity types selected</span>
                  ) : null}
                </div>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Existing entity links cannot be removed in v1. Add new entity types from the dropdown.
              </p>
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
                disabled={isSaving}
                className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black transition hover:bg-amber-400 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Field'}
              </button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
