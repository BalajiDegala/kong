'use client'

import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Loader2, Pencil, Upload, X } from 'lucide-react'
import { updateAsset } from '@/actions/assets'
import { updatePlaylist } from '@/actions/playlists'
import { updateSequence } from '@/actions/sequences'
import { updateShot } from '@/actions/shots'
import { updateTask } from '@/actions/tasks'
import { updateVersion } from '@/actions/versions'
import { formatDateLikeForDisplay } from '@/lib/date-display'
import type { EntityInfoField } from '@/lib/apex/entity-info-fields'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type ApexEntityType =
  | 'shot'
  | 'asset'
  | 'sequence'
  | 'task'
  | 'version'
  | 'playlist'

type FieldValue = string | number | boolean | string[] | null

interface EntityInfoPanelProps {
  entityType: ApexEntityType
  entityId: string | number
  projectId: string
  title: string
  fields: EntityInfoField[]
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function normalizeText(value: unknown): string | null {
  const trimmed = asText(value).trim()
  return trimmed || null
}

function normalizeNumber(value: unknown): number | null {
  const raw = asText(value).trim()
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isNaN(parsed) ? null : parsed
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  const raw = asText(value).trim().toLowerCase()
  if (!raw) return false
  return raw === 'true' || raw === '1' || raw === 'yes'
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asText(item).trim())
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function normalizeFieldValue(field: EntityInfoField, value: unknown): FieldValue {
  if (field.type === 'number') return normalizeNumber(value)
  if (field.type === 'boolean') return normalizeBoolean(value)
  if (field.type === 'multiselect') return toStringArray(value)
  return normalizeText(value)
}

function buildFieldValueMap(fields: EntityInfoField[]): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {}
  for (const field of fields) {
    out[field.id] =
      field.type === 'multiselect'
        ? toStringArray(field.value)
        : ((field.value as FieldValue) ?? null)
  }
  return out
}

function formatFieldValue(field: EntityInfoField, value: FieldValue): string {
  if (value === null || value === undefined || value === '') return 'No Value'
  if (field.type === 'boolean') return value ? 'Yes' : 'No'
  if (field.type === 'multiselect') {
    const selected = toStringArray(value)
    if (selected.length === 0) return 'No Value'
    if (!field.options || field.options.length === 0) return selected.join(', ')
    const labelByValue = new Map(field.options.map((option) => [option.value, option.label]))
    return selected.map((item) => labelByValue.get(item) || item).join(', ')
  }
  if (field.type === 'select' && field.options?.length) {
    const selected = asText(value).trim()
    if (!selected) return 'No Value'
    const match = field.options.find((option) => option.value === selected)
    return match?.label || selected
  }
  if (typeof value === 'string') {
    const formattedDate = formatDateLikeForDisplay(value)
    if (formattedDate) return formattedDate
  }
  return String(value)
}

function toDateInputValue(value: FieldValue): string {
  const raw = asText(value).trim()
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toDateTimeInputValue(value: FieldValue): string {
  const raw = asText(value).trim()
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return raw
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  const hours = String(parsed.getHours()).padStart(2, '0')
  const minutes = String(parsed.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function areFieldValuesEqual(
  field: EntityInfoField,
  left: FieldValue,
  right: FieldValue
): boolean {
  if (field.type === 'multiselect') {
    return JSON.stringify(toStringArray(left)) === JSON.stringify(toStringArray(right))
  }
  return Object.is(left, right)
}

function isThumbnailField(field: EntityInfoField): boolean {
  const key = String(field.column || field.id).toLowerCase()
  return key === 'thumbnail_url' || key.includes('thumbnail')
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })
}

async function optimizeThumbnailDataUrl(file: File): Promise<string> {
  const rawDataUrl = await fileToDataUrl(file)
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Invalid image file'))
    img.src = rawDataUrl
  })

  const maxSide = 256
  const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1)
  const width = Math.max(1, Math.round(img.width * ratio))
  const height = Math.max(1, Math.round(img.height * ratio))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Failed to process image')
  context.drawImage(img, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', 0.84)
}

export function EntityInfoPanel(props: EntityInfoPanelProps) {
  const fieldIds = useMemo(() => props.fields.map((field) => field.id), [props.fields])
  const defaultVisible = useMemo(() => new Set(fieldIds), [fieldIds])
  const storageKey = useMemo(
    () => `apex:info-panel:visible-fields:${props.projectId}:${props.entityType}`,
    [props.projectId, props.entityType]
  )

  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>(() =>
    buildFieldValueMap(props.fields)
  )
  const [persistedFieldValues, setPersistedFieldValues] = useState<Record<string, FieldValue>>(
    () => buildFieldValueMap(props.fields)
  )
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [visibleFieldIds, setVisibleFieldIds] = useState<Set<string>>(
    () => new Set(defaultVisible)
  )
  const [fieldSearchQuery, setFieldSearchQuery] = useState('')
  const [visibilityLoaded, setVisibilityLoaded] = useState(false)

  useEffect(() => {
    const next = buildFieldValueMap(props.fields)
    setFieldValues(next)
    setPersistedFieldValues(next)
  }, [props.fields])

  useEffect(() => {
    if (!editingFieldId) return
    const exists = props.fields.some((field) => field.id === editingFieldId)
    if (!exists) setEditingFieldId(null)
  }, [editingFieldId, props.fields])

  useEffect(() => {
    if (typeof window === 'undefined') {
      setVisibleFieldIds(new Set(defaultVisible))
      setVisibilityLoaded(true)
      return
    }

    const fallback = new Set(defaultVisible)
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) {
        setVisibleFieldIds(fallback)
        setVisibilityLoaded(true)
        return
      }

      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        setVisibleFieldIds(fallback)
        setVisibilityLoaded(true)
        return
      }

      const allowed = new Set(fieldIds)
      const next = new Set<string>()
      for (const entry of parsed) {
        const id = asText(entry).trim()
        if (!id || !allowed.has(id)) continue
        next.add(id)
      }
      setVisibleFieldIds(next.size > 0 ? next : fallback)
    } catch {
      setVisibleFieldIds(fallback)
    } finally {
      setVisibilityLoaded(true)
    }
  }, [defaultVisible, fieldIds, storageKey])

  useEffect(() => {
    if (!visibilityLoaded) return
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, JSON.stringify(Array.from(visibleFieldIds)))
  }, [visibilityLoaded, visibleFieldIds, storageKey])

  const filteredConfigFields = useMemo(() => {
    const query = fieldSearchQuery.trim().toLowerCase()
    if (!query) return props.fields
    return props.fields.filter((field) => {
      return (
        field.id.toLowerCase().includes(query) || field.label.toLowerCase().includes(query)
      )
    })
  }, [fieldSearchQuery, props.fields])

  const visibleFields = useMemo(() => {
    return props.fields.filter((field) => visibleFieldIds.has(field.id))
  }, [props.fields, visibleFieldIds])

  async function applyEntityPatch(patch: Record<string, unknown>) {
    if (props.entityType === 'shot') {
      return await updateShot(String(props.entityId), patch, {
        revalidate: false,
        projectId: props.projectId,
      })
    }
    if (props.entityType === 'asset') {
      return await updateAsset(String(props.entityId), patch, {
        revalidate: false,
        projectId: props.projectId,
      })
    }
    if (props.entityType === 'sequence') {
      return await updateSequence(String(props.entityId), patch, {
        revalidate: false,
        projectId: props.projectId,
      })
    }
    if (props.entityType === 'task') {
      return await updateTask(String(props.entityId), patch, {
        revalidate: false,
        projectId: props.projectId,
      })
    }
    if (props.entityType === 'version') {
      return await updateVersion(String(props.entityId), patch, {
        revalidate: false,
        projectId: props.projectId,
      })
    }
    if (props.entityType === 'playlist') {
      return await updatePlaylist(
        String(props.entityId),
        patch as {
          name?: string
          code?: string
          description?: string | null
          locked?: boolean
        },
        {
          revalidate: false,
          projectId: props.projectId,
        }
      )
    }
    return { error: 'Unsupported entity type' }
  }

  function beginEdit(fieldId: string) {
    setError(null)
    setEditingFieldId(fieldId)
  }

  function toggleVisibleField(fieldId: string, checked: boolean) {
    setVisibleFieldIds((previous) => {
      const next = new Set(previous)
      if (checked) {
        next.add(fieldId)
      } else {
        next.delete(fieldId)
      }
      return next
    })
  }

  function cancelEdit(fieldId: string) {
    setFieldValues((previous) => ({
      ...previous,
      [fieldId]: persistedFieldValues[fieldId] ?? null,
    }))
    setEditingFieldId((previous) => (previous === fieldId ? null : previous))
  }

  async function commitField(fieldId: string, override?: FieldValue) {
    const field = props.fields.find((item) => item.id === fieldId)
    if (!field || !field.editable || !field.column) return

    const draftValue = override ?? fieldValues[field.id] ?? null
    const previousValue = persistedFieldValues[field.id] ?? null
    const nextComparable = normalizeFieldValue(field, draftValue)
    const previousComparable = normalizeFieldValue(field, previousValue)

    if (areFieldValuesEqual(field, nextComparable, previousComparable)) return

    setSavingKey(field.id)
    setError(null)
    try {
      const result = await applyEntityPatch({
        [field.column]: nextComparable,
      })

      if (result?.error) {
        setError(result.error)
        setFieldValues((previous) => ({ ...previous, [field.id]: previousValue }))
        return
      }

      setPersistedFieldValues((previous) => ({
        ...previous,
        [field.id]: nextComparable,
      }))
      setFieldValues((previous) => ({
        ...previous,
        [field.id]: nextComparable,
      }))
    } finally {
      setSavingKey(null)
    }
  }

  function saveAndClose(fieldId: string) {
    void commitField(fieldId)
    setEditingFieldId((previous) => (previous === fieldId ? null : previous))
  }

  async function handleThumbnailUpload(
    field: EntityInfoField,
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] || null
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Thumbnail must be an image file')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Thumbnail image is too large (max 8MB before compression)')
      return
    }

    try {
      const optimizedDataUrl = await optimizeThumbnailDataUrl(file)
      setFieldValues((previous) => ({
        ...previous,
        [field.id]: optimizedDataUrl,
      }))
      await commitField(field.id, optimizedDataUrl)
      setEditingFieldId(null)
    } catch (thumbnailError) {
      setError(
        thumbnailError instanceof Error
          ? thumbnailError.message
          : 'Failed to process thumbnail'
      )
    }
  }

  async function clearThumbnail(fieldId: string) {
    setFieldValues((previous) => ({
      ...previous,
      [fieldId]: null,
    }))
    await commitField(fieldId, null)
    setEditingFieldId(null)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-foreground">{props.title}</div>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-8 items-center rounded-sm border border-border px-3 text-xs text-foreground/75 transition hover:bg-card hover:text-foreground"
            >
              Fields
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 border-border bg-card">
            <DropdownMenuLabel>Visible Fields</DropdownMenuLabel>
            <div className="px-2 pb-2">
              <input
                type="text"
                placeholder="Search fields..."
                value={fieldSearchQuery}
                onChange={(event) => setFieldSearchQuery(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
                className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <DropdownMenuSeparator />
            <div className="max-h-64 overflow-y-auto">
              {filteredConfigFields.map((field) => (
                <DropdownMenuCheckboxItem
                  key={field.id}
                  checked={visibleFieldIds.has(field.id)}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={(checked) =>
                    toggleVisibleField(field.id, checked === true)
                  }
                >
                  {field.label}
                </DropdownMenuCheckboxItem>
              ))}
              {filteredConfigFields.length === 0 ? (
                <p className="px-2 py-2 text-xs text-muted-foreground">No matching fields</p>
              ) : null}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 border-y border-border/70 bg-background">
        <div className="divide-y divide-border/70">
          {visibleFields.map((field) => {
            const value = fieldValues[field.id] ?? null
            const canEdit = Boolean(field.editable && field.column && field.type !== 'readonly')
            const isEditing = editingFieldId === field.id
            const isSaving = savingKey === field.id
            const isThumbnail = isThumbnailField(field)
            const thumbnailSrc = typeof value === 'string' ? value.trim() : ''

            return (
              <div
                key={field.id}
                className="grid grid-cols-[170px_minmax(0,1fr)] items-start gap-3 px-4 py-2.5 text-sm"
              >
                <span className="pt-1 text-muted-foreground">{field.label}</span>

                {!canEdit || !isEditing ? (
                  isThumbnail ? (
                    <div className="group/value relative inline-flex w-fit items-start gap-2">
                      <div className="h-24 w-40 overflow-hidden rounded border border-border/70 bg-muted/20">
                        {thumbnailSrc ? (
                          <img
                            src={thumbnailSrc}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center px-2 text-xs text-muted-foreground">
                            No Thumbnail
                          </div>
                        )}
                      </div>

                      <div className="mt-0.5 flex items-center gap-1">
                        {isSaving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        ) : null}
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => beginEdit(field.id)}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-transparent text-muted-foreground opacity-0 transition group-hover/value:opacity-100 group-focus-within/value:opacity-100 hover:border-border hover:bg-muted/20 hover:text-foreground"
                            aria-label={`Edit ${field.label}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="group/value inline-flex max-w-full items-start gap-2">
                      <span className="whitespace-pre-wrap break-words text-foreground">
                        {formatFieldValue(field, value)}
                      </span>

                      <div className="mt-0.5 flex items-center gap-1">
                        {isSaving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        ) : null}
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => beginEdit(field.id)}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-transparent text-muted-foreground opacity-0 transition group-hover/value:opacity-100 group-focus-within/value:opacity-100 hover:border-border hover:bg-muted/20 hover:text-foreground"
                            aria-label={`Edit ${field.label}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                ) : isThumbnail ? (
                  <div className="space-y-2">
                    <div className="h-24 w-40 overflow-hidden rounded border border-border/70 bg-muted/20">
                      {thumbnailSrc ? (
                        <img
                          src={thumbnailSrc}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center px-2 text-xs text-muted-foreground">
                          No Thumbnail
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1 rounded-sm border border-border px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-foreground/75 transition hover:text-foreground">
                        <Upload className="h-3 w-3" />
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => void handleThumbnailUpload(field, event)}
                        />
                      </label>

                      {thumbnailSrc ? (
                        <button
                          type="button"
                          onClick={() => void clearThumbnail(field.id)}
                          className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-foreground/75 transition hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                          Clear
                        </button>
                      ) : null}

                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      ) : null}
                    </div>
                  </div>
                ) : field.type === 'boolean' ? (
                  <label className="flex items-center gap-2 text-foreground">
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(event) => {
                        const nextValue = event.target.checked
                        setFieldValues((previous) => ({
                          ...previous,
                          [field.id]: nextValue,
                        }))
                        void commitField(field.id, nextValue)
                        setEditingFieldId(null)
                      }}
                      className="h-4 w-4 rounded border border-border bg-background"
                    />
                    <span>{Boolean(value) ? 'Yes' : 'No'}</span>
                  </label>
                ) : field.type === 'select' ? (
                  <Select
                    value={asText(value).trim() || '__empty__'}
                    onValueChange={(nextValue) => {
                      const normalized = nextValue === '__empty__' ? '' : nextValue
                      setFieldValues((previous) => ({
                        ...previous,
                        [field.id]: normalized,
                      }))
                      void commitField(field.id, normalized)
                      setEditingFieldId(null)
                    }}
                  >
                    <SelectTrigger className="h-8 w-full rounded-sm border-border bg-background text-sm text-foreground">
                      <SelectValue placeholder="No Value" />
                    </SelectTrigger>
                    <SelectContent align="start" className="max-h-72 w-72">
                      <SelectItem value="__empty__">No Value</SelectItem>
                      {(field.options || []).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === 'multiselect' ? (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex min-h-8 w-full items-center justify-between rounded-sm border border-border bg-background px-2 py-1.5 text-left text-sm text-foreground"
                      >
                        <span className="truncate">
                          {formatFieldValue(field, value)}
                        </span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-64 w-72 overflow-y-auto">
                      {(field.options || []).map((option) => {
                        const selectedValues = toStringArray(fieldValues[field.id] ?? null)
                        const checked = selectedValues.includes(option.value)
                        return (
                          <DropdownMenuCheckboxItem
                            key={option.value}
                            checked={checked}
                            onSelect={(event) => event.preventDefault()}
                            onCheckedChange={(nextChecked) => {
                              const current = toStringArray(fieldValues[field.id] ?? null)
                              const next = nextChecked
                                ? Array.from(new Set([...current, option.value]))
                                : current.filter((entry) => entry !== option.value)
                              setFieldValues((previous) => ({
                                ...previous,
                                [field.id]: next,
                              }))
                              void commitField(field.id, next)
                            }}
                          >
                            {option.label}
                          </DropdownMenuCheckboxItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={asText(value)}
                    onChange={(event) =>
                      setFieldValues((previous) => ({
                        ...previous,
                        [field.id]: event.target.value,
                      }))
                    }
                    onBlur={() => saveAndClose(field.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        cancelEdit(field.id)
                      }
                    }}
                    rows={3}
                    autoFocus
                    placeholder={field.placeholder || 'No Value'}
                    className="w-full resize-y rounded-sm border border-border bg-background px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                ) : (
                  <input
                    type={
                      field.type === 'number'
                        ? 'number'
                        : field.type === 'date'
                          ? 'date'
                          : field.type === 'datetime'
                            ? 'datetime-local'
                            : 'text'
                    }
                    value={
                      field.type === 'date'
                        ? toDateInputValue(value)
                        : field.type === 'datetime'
                          ? toDateTimeInputValue(value)
                          : asText(value)
                    }
                    onChange={(event) =>
                      setFieldValues((previous) => ({
                        ...previous,
                        [field.id]: event.target.value,
                      }))
                    }
                    onBlur={() => saveAndClose(field.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        cancelEdit(field.id)
                        return
                      }
                      if (event.key !== 'Enter') return
                      event.preventDefault()
                      saveAndClose(field.id)
                    }}
                    autoFocus
                    placeholder={field.placeholder || 'No Value'}
                    className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                )}
              </div>
            )
          })}
          {visibleFields.length === 0 ? (
            <div className="px-4 py-3 text-xs text-muted-foreground">
              No fields selected. Use Fields to configure this page.
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      ) : null}
    </div>
  )
}
