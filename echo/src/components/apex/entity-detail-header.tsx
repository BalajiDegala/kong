'use client'

import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2, Pencil, Upload, X } from 'lucide-react'
import { updateAsset } from '@/actions/assets'
import { updatePlaylist } from '@/actions/playlists'
import { updateSequence } from '@/actions/sequences'
import { updateShot } from '@/actions/shots'
import { updateTask } from '@/actions/tasks'
import { updateVersion } from '@/actions/versions'
import { formatDateLikeForDisplay } from '@/lib/date-display'
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

type HeaderFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multiselect'
  | 'readonly'
type HeaderFieldValue = string | number | boolean | string[] | null

interface HeaderFieldOption {
  value: string
  label: string
}

export interface EntityDetailHeaderField {
  id: string
  label: string
  type: HeaderFieldType
  value: HeaderFieldValue
  editable?: boolean
  column?: string
  placeholder?: string
  options?: HeaderFieldOption[]
}

export interface EntitySwitchOption {
  id: string | number
  label: string
}

interface EntityDetailHeaderProps {
  entityType: ApexEntityType
  entityPlural: string
  entityId: string | number
  projectId: string
  title: string
  badge?: string | null
  description?: string | null
  descriptionColumn?: string | null
  thumbnailUrl?: string | null
  thumbnailColumn?: string | null
  thumbnailPlaceholder?: string
  switchOptions: EntitySwitchOption[]
  tabPaths: string[]
  fields: EntityDetailHeaderField[]
  defaultVisibleFieldIds: string[]
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function normalizeText(value: unknown): string | null {
  const trimmed = asText(value).trim()
  return trimmed ? trimmed : null
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

function normalizeFieldValue(
  type: HeaderFieldType,
  value: HeaderFieldValue
): string | number | boolean | string[] | null {
  if (type === 'number') return normalizeNumber(value)
  if (type === 'boolean') return normalizeBoolean(value)
  if (type === 'multiselect') return toStringArray(value)
  return normalizeText(value)
}

function areFieldValuesEqual(
  type: HeaderFieldType,
  left: string | number | boolean | string[] | null,
  right: string | number | boolean | string[] | null
): boolean {
  if (type === 'multiselect') {
    return JSON.stringify(toStringArray(left)) === JSON.stringify(toStringArray(right))
  }
  return Object.is(left, right)
}

function formatFieldValue(field: EntityDetailHeaderField, value: HeaderFieldValue): string {
  if (value === null || value === undefined || value === '') return '-'
  if (field.type === 'boolean') return value ? 'Yes' : 'No'
  if (field.type === 'multiselect') {
    const selected = toStringArray(value)
    if (selected.length === 0) return '-'
    if (!field.options || field.options.length === 0) return selected.join(', ')
    const labelByValue = new Map(field.options.map((option) => [option.value, option.label]))
    return selected.map((item) => labelByValue.get(item) || item).join(', ')
  }
  if (field.type === 'select' && field.options?.length) {
    const selected = asText(value).trim()
    if (!selected) return '-'
    const match = field.options.find((option) => option.value === selected)
    return match?.label || selected
  }
  if (typeof value === 'string') {
    const formattedDate = formatDateLikeForDisplay(value)
    if (formattedDate) return formattedDate
  }
  return String(value)
}

function toDateInputValue(value: HeaderFieldValue): string {
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

function toDateTimeInputValue(value: HeaderFieldValue): string {
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

function buildFieldValueMap(
  fields: EntityDetailHeaderField[]
): Record<string, HeaderFieldValue> {
  const values: Record<string, HeaderFieldValue> = {}
  for (const field of fields) {
    values[field.id] =
      field.type === 'multiselect' ? toStringArray(field.value) : field.value
  }
  return values
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

export function EntityDetailHeader(props: EntityDetailHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  const fieldIds = useMemo(() => props.fields.map((field) => field.id), [props.fields])
  const defaultVisible = useMemo(() => {
    const allowed = new Set(fieldIds)
    const selected = props.defaultVisibleFieldIds.filter((id) => allowed.has(id))
    return selected.length > 0 ? selected : fieldIds
  }, [fieldIds, props.defaultVisibleFieldIds])

  const storageKey = useMemo(
    () => `apex:detail-header:visible-fields:${props.projectId}:${props.entityType}`,
    [props.projectId, props.entityType]
  )

  const [fieldValues, setFieldValues] = useState<Record<string, HeaderFieldValue>>(() =>
    buildFieldValueMap(props.fields)
  )
  const [persistedFieldValues, setPersistedFieldValues] = useState<
    Record<string, HeaderFieldValue>
  >(() => buildFieldValueMap(props.fields))
  const [descriptionValue, setDescriptionValue] = useState<string>(
    asText(props.description)
  )
  const [persistedDescriptionValue, setPersistedDescriptionValue] = useState<string>(
    asText(props.description)
  )
  const [thumbnailValue, setThumbnailValue] = useState<string | null>(
    normalizeText(props.thumbnailUrl)
  )
  const [persistedThumbnailValue, setPersistedThumbnailValue] = useState<string | null>(
    normalizeText(props.thumbnailUrl)
  )
  const [visibleFieldIds, setVisibleFieldIds] = useState<Set<string>>(
    () => new Set(defaultVisible)
  )
  const [visibilityLoaded, setVisibilityLoaded] = useState(false)
  const [fieldSearchQuery, setFieldSearchQuery] = useState('')
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingDescription, setEditingDescription] = useState(false)
  const [editingThumbnail, setEditingThumbnail] = useState(false)
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)

  useEffect(() => {
    const next = buildFieldValueMap(props.fields)
    setFieldValues(next)
    setPersistedFieldValues(next)
  }, [props.fields])

  useEffect(() => {
    if (!editingFieldId) return
    const stillExists = props.fields.some((field) => field.id === editingFieldId)
    if (stillExists) return
    setEditingFieldId(null)
  }, [editingFieldId, props.fields])

  useEffect(() => {
    const nextDescription = asText(props.description)
    setDescriptionValue(nextDescription)
    setPersistedDescriptionValue(nextDescription)
  }, [props.description])

  useEffect(() => {
    const nextThumbnail = normalizeText(props.thumbnailUrl)
    setThumbnailValue(nextThumbnail)
    setPersistedThumbnailValue(nextThumbnail)
  }, [props.thumbnailUrl])

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
      const nextVisible = new Set<string>()
      for (const id of parsed) {
        const normalized = asText(id).trim()
        if (!normalized || !allowed.has(normalized)) continue
        nextVisible.add(normalized)
      }
      setVisibleFieldIds(nextVisible.size > 0 ? nextVisible : fallback)
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

  const tabPaths = props.tabPaths
  const currentTab = useMemo(() => {
    const base = `/apex/${props.projectId}/${props.entityPlural}/${props.entityId}`
    if (!pathname.startsWith(base)) {
      return tabPaths.includes('activity') ? 'activity' : (tabPaths[0] ?? '')
    }
    const suffix = pathname.slice(base.length).replace(/^\/+/, '')
    const candidate = suffix.split('/')[0] || ''
    if (candidate && tabPaths.includes(candidate)) return candidate
    return tabPaths.includes('activity') ? 'activity' : (tabPaths[0] ?? '')
  }, [pathname, props.entityId, props.entityPlural, props.projectId, tabPaths])

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

  async function commitDescription() {
    if (!props.descriptionColumn) return
    const nextComparable = normalizeText(descriptionValue)
    const previousComparable = normalizeText(persistedDescriptionValue)
    if (Object.is(nextComparable, previousComparable)) return

    setSavingKey('description')
    setError(null)
    try {
      const result = await applyEntityPatch({
        [props.descriptionColumn]: nextComparable,
      })
      if (result?.error) {
        setError(result.error)
        setDescriptionValue(persistedDescriptionValue)
        return
      }
      setPersistedDescriptionValue(descriptionValue)
    } finally {
      setSavingKey(null)
    }
  }

  async function commitField(fieldId: string, override?: HeaderFieldValue) {
    const field = props.fields.find((item) => item.id === fieldId)
    if (!field || !field.editable || !field.column) return

    const draftValue = override ?? fieldValues[fieldId] ?? null
    const previousValue = persistedFieldValues[fieldId] ?? null
    const nextComparable = normalizeFieldValue(field.type, draftValue)
    const previousComparable = normalizeFieldValue(field.type, previousValue)
    if (areFieldValuesEqual(field.type, nextComparable, previousComparable)) return

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
      setFieldValues((previous) => ({ ...previous, [field.id]: nextComparable }))
    } finally {
      setSavingKey(null)
    }
  }

  async function commitThumbnail(nextValue: string | null) {
    if (!props.thumbnailColumn) return
    const nextComparable = normalizeText(nextValue)
    const previousComparable = normalizeText(persistedThumbnailValue)
    if (Object.is(nextComparable, previousComparable)) return

    setSavingKey('thumbnail')
    setError(null)
    try {
      const result = await applyEntityPatch({
        [props.thumbnailColumn]: nextComparable,
      })
      if (result?.error) {
        setError(result.error)
        setThumbnailValue(persistedThumbnailValue)
        return
      }
      setPersistedThumbnailValue(nextComparable)
      setThumbnailValue(nextComparable)
    } finally {
      setSavingKey(null)
    }
  }

  async function handleThumbnailChange(event: ChangeEvent<HTMLInputElement>) {
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
      setThumbnailValue(optimizedDataUrl)
      await commitThumbnail(optimizedDataUrl)
    } catch (thumbnailError) {
      setError(
        thumbnailError instanceof Error
          ? thumbnailError.message
          : 'Failed to process thumbnail'
      )
    }
  }

  function handleEntitySwitch(nextEntityId: string) {
    if (nextEntityId === String(props.entityId)) return
    const fallbackTab = tabPaths.includes('activity') ? 'activity' : (tabPaths[0] ?? '')
    const nextTab = tabPaths.includes(currentTab) ? currentTab : fallbackTab
    const suffix = nextTab ? `/${nextTab}` : ''
    router.push(`/apex/${props.projectId}/${props.entityPlural}/${nextEntityId}${suffix}`)
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

  function beginFieldEdit(fieldId: string) {
    setError(null)
    setEditingFieldId(fieldId)
  }

  function cancelFieldEdit(fieldId: string) {
    setFieldValues((previous) => ({
      ...previous,
      [fieldId]: persistedFieldValues[fieldId] ?? null,
    }))
    setEditingFieldId((previous) => (previous === fieldId ? null : previous))
  }

  function saveFieldAndClose(fieldId: string) {
    void commitField(fieldId)
    setEditingFieldId((previous) => (previous === fieldId ? null : previous))
  }

  function saveDescriptionAndClose() {
    void commitDescription()
    setEditingDescription(false)
  }

  return (
    <div className="border-b border-border bg-background px-6 py-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:gap-8">
        <div className="w-full xl:w-[300px] xl:flex-shrink-0">
          <div className="group/thumb relative overflow-hidden rounded-md border border-border bg-card">
            <div className="aspect-[16/9] w-full">
              {thumbnailValue ? (
                <img
                  src={thumbnailValue}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  {props.thumbnailPlaceholder || 'No Thumbnail'}
                </div>
              )}
            </div>

            {props.thumbnailColumn ? (
              <button
                type="button"
                onClick={() => setEditingThumbnail((previous) => !previous)}
                className={`absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-sm border transition ${
                  editingThumbnail
                    ? 'border-primary/70 bg-background text-primary'
                    : 'border-border/80 bg-background/90 text-foreground/70 opacity-0 group-hover/thumb:opacity-100 group-focus-within/thumb:opacity-100 hover:text-foreground'
                }`}
                aria-label={editingThumbnail ? 'Stop editing thumbnail' : 'Edit thumbnail'}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          {editingThumbnail && props.thumbnailColumn ? (
            <div className="mt-2 flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-sm border border-border px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-foreground/70 transition hover:border-border hover:text-foreground">
                <Upload className="h-3 w-3" />
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleThumbnailChange}
                />
              </label>
              {thumbnailValue ? (
                <button
                  type="button"
                  onClick={() => void commitThumbnail(null)}
                  className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-foreground/70 transition hover:border-border hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              ) : null}
              {savingKey === 'thumbnail' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-2xl font-semibold text-foreground">{props.title}</h3>
                {props.badge ? (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-foreground/80">
                    {props.badge}
                  </span>
                ) : null}
                {savingKey === 'description' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : null}
              </div>

              {props.descriptionColumn && editingDescription ? (
                <textarea
                  value={descriptionValue}
                  onChange={(event) => setDescriptionValue(event.target.value)}
                  onBlur={saveDescriptionAndClose}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setDescriptionValue(persistedDescriptionValue)
                      setEditingDescription(false)
                      return
                    }
                    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                      event.preventDefault()
                      saveDescriptionAndClose()
                    }
                  }}
                  placeholder="No description"
                  rows={2}
                  autoFocus
                  className="mt-2 w-full min-w-[260px] resize-y rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              ) : (
                <div className="group/desc mt-1 flex items-start gap-2">
                  <p className="text-sm text-muted-foreground">
                    {normalizeText(descriptionValue) || 'No description'}
                  </p>
                  {props.descriptionColumn ? (
                    <button
                      type="button"
                      onClick={() => setEditingDescription(true)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-transparent text-muted-foreground opacity-0 transition group-hover/desc:opacity-100 group-focus-within/desc:opacity-100 hover:border-border hover:bg-card hover:text-foreground"
                      aria-label="Edit description"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={String(props.entityId)}
                onValueChange={handleEntitySwitch}
              >
                <SelectTrigger className="h-9 min-w-[220px] rounded-sm border-border bg-background text-sm text-foreground/80">
                  <SelectValue placeholder="Jump to..." />
                </SelectTrigger>
                <SelectContent align="end">
                  {props.switchOptions.map((option) => (
                    <SelectItem key={String(option.id)} value={String(option.id)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center rounded-sm border border-border px-3 text-sm text-foreground/70 transition hover:bg-card hover:text-foreground"
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
                      <p className="px-2 py-2 text-xs text-muted-foreground">
                        No matching fields
                      </p>
                    ) : null}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

            </div>
          </div>

          {visibleFields.length > 0 ? (
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-5">
              {visibleFields.map((field) => {
                const value = fieldValues[field.id] ?? null
                const isSaving = savingKey === field.id
                const canEdit = Boolean(field.editable && field.column && field.type !== 'readonly')
                const isFieldEditing = editingFieldId === field.id
                return (
                  <div key={field.id} className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {field.label}
                      </p>
                      {isSaving ? (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      ) : null}
                    </div>

                    {!canEdit || !isFieldEditing ? (
                      <div className="group/value inline-flex max-w-full items-start gap-1.5">
                        <p className="text-sm text-foreground/90">
                          {formatFieldValue(field, value)}
                        </p>
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => beginFieldEdit(field.id)}
                            className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-sm border border-transparent text-muted-foreground opacity-0 transition group-hover/value:opacity-100 group-focus-within/value:opacity-100 hover:border-border hover:bg-card hover:text-foreground"
                            aria-label={`Edit ${field.label}`}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        ) : null}
                      </div>
                    ) : field.type === 'boolean' ? (
                      <label className="flex items-center gap-2 text-sm text-foreground">
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
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent align="start" className="max-h-72 w-72">
                          <SelectItem value="__empty__">-</SelectItem>
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
                        onBlur={() => saveFieldAndClose(field.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') {
                            cancelFieldEdit(field.id)
                          }
                        }}
                        rows={2}
                        autoFocus
                        placeholder={field.placeholder || '-'}
                        className="w-full resize-y rounded-sm border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                        onBlur={() => saveFieldAndClose(field.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') {
                            cancelFieldEdit(field.id)
                            return
                          }
                          if (event.key !== 'Enter') return
                          event.preventDefault()
                          saveFieldAndClose(field.id)
                        }}
                        autoFocus
                        placeholder={field.placeholder || '-'}
                        className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No fields selected. Use Fields to configure this header.
            </p>
          )}
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-xs text-red-400">{error}</p>
      ) : null}
    </div>
  )
}
