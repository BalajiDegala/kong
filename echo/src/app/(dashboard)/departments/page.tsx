'use client'

import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  createDepartment,
  deleteDepartment,
  updateDepartment,
} from '@/actions/departments'
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
import { Building2, Plus, Pencil, Trash2, ImagePlus } from 'lucide-react'

type DepartmentSemanticKeys = {
  id: string
  name: string
  shortName: string | null
  type: string | null
  status: string | null
  color: string | null
  order: string | null
  tags: string | null
  thumbnailUrl: string | null
  createdAt: string | null
  updatedAt: string | null
}

function resolveColumn(columns: Set<string>, candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (columns.has(candidate)) return candidate
  }
  return null
}

function collectColumns(rows: any[]): Set<string> {
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

function toPersonDisplayName(profile: any): string {
  const fullName = `${profile?.firstname || ''} ${profile?.lastname || ''}`.trim()
  return profile?.display_name || fullName || profile?.email || 'Unknown'
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })
}

async function optimizeImageDataUrl(file: File) {
  const rawDataUrl = await fileToDataUrl(file)
  const img = new Image()

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Invalid image file'))
    img.src = rawDataUrl
  })

  const maxSide = 512
  const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1)
  const width = Math.max(1, Math.round(img.width * ratio))
  const height = Math.max(1, Math.round(img.height * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to process image')
  ctx.drawImage(img, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', 0.86)
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editDepartmentRow, setEditDepartmentRow] = useState<any | null>(null)
  const [deleteDepartmentRow, setDeleteDepartmentRow] = useState<any | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    row: any
  } | null>(null)

  useEffect(() => {
    void loadDepartmentData()
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

  async function loadDepartmentData() {
    try {
      setIsLoading(true)
      const supabase = createClient()

      const [departmentsResult, profilesResult] = await Promise.all([
        supabase.from('departments').select('*'),
        supabase
          .from('profiles')
          .select('id, display_name, firstname, lastname, email, department_id, active')
          .eq('active', true),
      ])

      if (departmentsResult.error) throw departmentsResult.error
      if (profilesResult.error) throw profilesResult.error

      const departmentRows = [...(departmentsResult.data || [])]
      const peopleRows = profilesResult.data || []

      departmentRows.sort((a, b) => {
        const aLabel = asText(a?.name || a?.code || a?.id).toLowerCase()
        const bLabel = asText(b?.name || b?.code || b?.id).toLowerCase()
        return aLabel.localeCompare(bLabel)
      })

      setDepartments(departmentRows)
      setProfiles(peopleRows)
    } catch (error) {
      console.error('Failed to load departments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const keys = useMemo<DepartmentSemanticKeys>(() => {
    const columns = collectColumns(departments)

    return {
      id: resolveColumn(columns, ['id']) || 'id',
      name: resolveColumn(columns, ['name', 'department_name']) || 'name',
      shortName: resolveColumn(columns, ['code', 'short_name', 'department_short_name']),
      type: resolveColumn(columns, ['department_type', 'type']),
      status: resolveColumn(columns, ['status']),
      color: resolveColumn(columns, ['color']),
      order: resolveColumn(columns, ['order', 'order_index', 'sort_order']),
      tags: resolveColumn(columns, ['tags']),
      thumbnailUrl: resolveColumn(columns, ['thumbnail_url', 'thumbnail']),
      createdAt: resolveColumn(columns, ['created_at', 'date_created']),
      updatedAt: resolveColumn(columns, ['updated_at', 'date_updated']),
    }
  }, [departments])

  const peopleByDepartment = useMemo(() => {
    const map = new Map<number, string[]>()

    for (const profile of profiles) {
      const departmentId = Number(profile?.department_id)
      if (Number.isNaN(departmentId)) continue

      if (!map.has(departmentId)) {
        map.set(departmentId, [])
      }
      map.get(departmentId)!.push(toPersonDisplayName(profile))
    }

    for (const entry of map.values()) {
      entry.sort((a, b) => a.localeCompare(b))
    }

    return map
  }, [profiles])

  const departmentRows = useMemo(
    () =>
      departments.map((row) => {
        const departmentId = Number(row?.[keys.id])
        const people = Number.isNaN(departmentId)
          ? []
          : peopleByDepartment.get(departmentId) || []

        const peoplePreview =
          people.length === 0
            ? 'No people linked'
            : people.length <= 2
              ? people.join(', ')
              : `${people.slice(0, 2).join(', ')} +${people.length - 2} more`

        const statusValue = keys.status ? asText(row?.[keys.status]).trim() : ''
        const statusLabel = statusValue || 'Active'
        const tagsRaw = keys.tags ? row?.[keys.tags] : null
        const tagsLabel = Array.isArray(tagsRaw)
          ? tagsRaw.join(', ')
          : asText(tagsRaw)

        return {
          ...row,
          _department_id: departmentId,
          _raw: row,
          department_name: asText(row?.[keys.name]) || '—',
          department_short_name: keys.shortName ? asText(row?.[keys.shortName]) : '',
          department_type: keys.type ? asText(row?.[keys.type]) : '',
          status_label: statusLabel,
          color_value: keys.color ? row?.[keys.color] : null,
          order_value: keys.order ? row?.[keys.order] : null,
          tags_label: tagsLabel,
          thumbnail_value: keys.thumbnailUrl ? row?.[keys.thumbnailUrl] : null,
          people_count: people.length,
          people_preview: peoplePreview,
          created_at_value: keys.createdAt ? row?.[keys.createdAt] : null,
          updated_at_value: keys.updatedAt ? row?.[keys.updatedAt] : null,
        }
      }),
    [departments, keys, peopleByDepartment]
  )

  const columns = useMemo<TableColumn[]>(
    () => [
      {
        id: 'department_name',
        label: 'Department Name',
        type: 'text',
        width: '220px',
        editable: true,
        editor: 'text',
      },
      {
        id: 'department_short_name',
        label: 'Department Short Name',
        type: 'text',
        width: '190px',
        editable: true,
        editor: 'text',
      },
      {
        id: 'department_type',
        label: 'Department Type',
        type: 'text',
        width: '160px',
        editable: true,
        editor: 'text',
      },
      {
        id: 'status_label',
        label: 'Status',
        type: 'status',
        width: '120px',
        editable: true,
        editor: 'select',
        options: [
          { value: 'Active', label: 'Active' },
          { value: 'Inactive', label: 'Inactive' },
          { value: 'Hold', label: 'Hold' },
        ],
      },
      { id: 'people_count', label: 'People', type: 'number', width: '100px' },
      { id: 'people_preview', label: 'People Preview', type: 'text', width: '260px' },
      {
        id: 'order_value',
        label: 'Order',
        type: 'number',
        width: '100px',
        editable: true,
        editor: 'number',
      },
      {
        id: 'color_value',
        label: 'Color',
        type: 'color',
        width: '110px',
        editable: true,
        editor: 'color',
      },
      {
        id: 'tags_label',
        label: 'Tags',
        type: 'text',
        width: '200px',
        editable: true,
        editor: 'text',
      },
      { id: 'thumbnail_value', label: 'Thumbnail', type: 'thumbnail', width: '120px' },
      { id: 'created_at_value', label: 'Date Created', type: 'datetime', width: '190px' },
      { id: 'updated_at_value', label: 'Date Updated', type: 'datetime', width: '190px' },
    ],
    []
  )

  async function handleInlineCellUpdate(row: any, column: TableColumn, value: any) {
    const departmentId = Number(row?._department_id)
    if (Number.isNaN(departmentId)) {
      throw new Error('Invalid department id')
    }

    const payload: Record<string, any> = {}
    const localPatch: Record<string, any> = {}
    if (column.id === 'department_name') {
      const nextValue = asText(value)
      payload.name = nextValue
      localPatch[keys.name] = nextValue
    } else if (column.id === 'department_short_name') {
      const nextValue = asText(value) || null
      payload.short_name = nextValue
      if (keys.shortName) {
        localPatch[keys.shortName] = nextValue
      }
    } else if (column.id === 'department_type') {
      const nextValue = asText(value) || null
      payload.department_type = nextValue
      if (keys.type) {
        localPatch[keys.type] = nextValue
      }
    } else if (column.id === 'status_label') {
      const nextValue = asText(value) || null
      payload.status = nextValue
      if (keys.status) {
        localPatch[keys.status] = nextValue
      }
    } else if (column.id === 'order_value') {
      const nextValue = value === null || value === '' ? null : Number(value)
      payload.order = nextValue
      if (keys.order) {
        localPatch[keys.order] = nextValue
      }
    } else if (column.id === 'color_value') {
      const nextValue = asText(value) || null
      payload.color = nextValue
      if (keys.color) {
        localPatch[keys.color] = nextValue
      }
    } else if (column.id === 'tags_label') {
      const nextValue = asText(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
      payload.tags = nextValue
      if (keys.tags) {
        localPatch[keys.tags] = nextValue
      }
    } else {
      return
    }

    const result = await updateDepartment(departmentId, payload)
    if (result.error) {
      throw new Error(result.error)
    }

    setDepartments((previous) =>
      previous.map((departmentRow) => {
        const currentDepartmentId = Number(departmentRow?.[keys.id])
        if (currentDepartmentId !== departmentId) {
          return departmentRow
        }
        return {
          ...departmentRow,
          ...localPatch,
        }
      })
    )
  }

  function openEditDialog(row: any) {
    setEditDepartmentRow(row?._raw || row)
  }

  function openDeleteDialog(row: any) {
    setDeleteDepartmentRow(row)
  }

  function handleRowContextMenu(row: any, event: MouseEvent<HTMLTableRowElement>) {
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
        <p className="text-zinc-400">Loading departments...</p>
      </div>
    )
  }

  return (
    <>
      <DepartmentDialog
        mode="create"
        open={showCreateDialog}
        keys={keys}
        onSaved={loadDepartmentData}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) void loadDepartmentData()
        }}
      />

      <DepartmentDialog
        mode="edit"
        open={Boolean(editDepartmentRow)}
        keys={keys}
        department={editDepartmentRow}
        onSaved={loadDepartmentData}
        onOpenChange={(open) => {
          if (!open) setEditDepartmentRow(null)
        }}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteDepartmentRow)}
        onOpenChange={(open) => {
          if (!open) setDeleteDepartmentRow(null)
        }}
        title="Delete Department"
        description="This will remove the department. Reassign linked people before deleting."
        itemName={deleteDepartmentRow?.department_name || 'Department'}
        onConfirm={async () => {
          const departmentId = Number(deleteDepartmentRow?._department_id)
          if (Number.isNaN(departmentId)) {
            return { error: 'Invalid department id' }
          }
          return deleteDepartment(departmentId)
        }}
      />

      <div className="flex h-full flex-col">
        <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-zinc-400" />
              <h2 className="text-lg font-semibold text-zinc-100">Departments</h2>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                {departments.length}
              </span>
            </div>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
            >
              <Plus className="h-4 w-4" />
              Add Department
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {departments.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Building2 className="mx-auto mb-4 h-12 w-12 text-zinc-700" />
                <h3 className="mb-2 text-lg font-semibold text-zinc-100">
                  No departments yet
                </h3>
                <p className="mb-4 text-sm text-zinc-400">
                  Create departments to organize people and pipeline access.
                </p>
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
                >
                  Create First Department
                </button>
              </div>
            </div>
          ) : (
            <EntityTable
              columns={columns}
              data={departmentRows}
              entityType="departments"
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

function DepartmentDialog({
  mode,
  open,
  onOpenChange,
  onSaved,
  keys,
  department,
}: {
  mode: 'create' | 'edit'
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void | Promise<void>
  keys: DepartmentSemanticKeys
  department?: any | null
}) {
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [departmentType, setDepartmentType] = useState('')
  const [status, setStatus] = useState('Active')
  const [color, setColor] = useState('#f59e0b')
  const [orderValue, setOrderValue] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null)
  const [thumbnailFileName, setThumbnailFileName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return

    const row = department || {}
    const rowName = asText(row?.[keys.name])
    const rowShortName = keys.shortName ? asText(row?.[keys.shortName]) : ''
    const rowType = keys.type ? asText(row?.[keys.type]) : ''
    const rowStatus = keys.status ? asText(row?.[keys.status]) : ''
    const rowColor = keys.color ? asText(row?.[keys.color]) : ''
    const rowOrder = keys.order ? asText(row?.[keys.order]) : ''
    const rowTagsRaw = keys.tags ? row?.[keys.tags] : null
    const rowTags = Array.isArray(rowTagsRaw)
      ? rowTagsRaw.join(', ')
      : asText(rowTagsRaw)
    const rowThumbnail = keys.thumbnailUrl ? asText(row?.[keys.thumbnailUrl]) : ''

    setName(mode === 'edit' ? rowName : '')
    setShortName(mode === 'edit' ? rowShortName : '')
    setDepartmentType(mode === 'edit' ? rowType : '')
    setStatus(mode === 'edit' ? rowStatus || 'Active' : 'Active')
    setColor(mode === 'edit' ? rowColor || '#f59e0b' : '#f59e0b')
    setOrderValue(mode === 'edit' ? rowOrder : '')
    setTagsText(mode === 'edit' ? rowTags : '')
    setThumbnailDataUrl(mode === 'edit' ? rowThumbnail || null : null)
    setThumbnailFileName('')
    setError('')
    setIsSaving(false)
  }, [department, keys, mode, open])

  async function handleThumbnailSelect(file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Thumbnail must be an image file')
      return
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('Thumbnail image is too large (max 12MB before compression)')
      return
    }

    try {
      const optimized = await optimizeImageDataUrl(file)
      setThumbnailDataUrl(optimized)
      setThumbnailFileName(file.name)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to process thumbnail')
    }
  }

  async function handleSave() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Department name is required')
      return
    }

    const parsedOrder =
      orderValue.trim() === '' ? null : Number.parseInt(orderValue, 10)
    if (parsedOrder !== null && Number.isNaN(parsedOrder)) {
      setError('Order must be a valid number')
      return
    }

    const payload = {
      name: trimmedName,
      short_name: shortName.trim() || null,
      department_type: departmentType.trim() || null,
      status: status.trim() || null,
      color: color.trim() || null,
      order: parsedOrder,
      tags: tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      thumbnail_url: thumbnailDataUrl || null,
    }

    setIsSaving(true)
    setError('')

    const result =
      mode === 'create'
        ? await createDepartment(payload)
        : await updateDepartment(Number(department?.[keys.id]), payload)

    setIsSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    await onSaved()
    onOpenChange(false)
  }

  const title = mode === 'create' ? 'Create Department' : 'Edit Department'
  const description =
    mode === 'create'
      ? 'Create a department using the current schema fields.'
      : 'Update department fields and linked metadata.'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden border-zinc-800 bg-zinc-900 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <Building2 className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto pr-1">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              Department Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Animation"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">
                Department Short Name
              </label>
              <input
                type="text"
                value={shortName}
                onChange={(event) => setShortName(event.target.value)}
                placeholder="anim"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">
                Department Type
              </label>
              <input
                type="text"
                value={departmentType}
                onChange={(event) => setDepartmentType(event.target.value)}
                placeholder="production"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Status</label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Hold">Hold</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Order</label>
              <input
                type="number"
                value={orderValue}
                onChange={(event) => setOrderValue(event.target.value)}
                placeholder="10"
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
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Tags</label>
            <input
              type="text"
              value={tagsText}
              onChange={(event) => setTagsText(event.target.value)}
              placeholder="character, animation, keying"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Thumbnail</label>
            <div className="flex items-center gap-3 rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-md bg-zinc-800">
                {thumbnailDataUrl ? (
                  <img src={thumbnailDataUrl} alt="" className="h-14 w-14 object-cover" />
                ) : (
                  <ImagePlus className="h-4 w-4 text-zinc-500" />
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    void handleThumbnailSelect(event.target.files?.[0] || null)
                  }
                  className="w-full text-xs text-zinc-300 file:mr-3 file:rounded file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-xs file:text-zinc-200 hover:file:bg-zinc-700"
                />
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {thumbnailFileName || 'Upload from local'}
                </p>
              </div>
              {thumbnailDataUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    setThumbnailDataUrl(null)
                    setThumbnailFileName('')
                  }}
                  className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 transition hover:border-zinc-600"
                >
                  Remove
                </button>
              ) : null}
            </div>
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
                  ? 'Create Department'
                  : 'Save Changes'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
