'use client'

import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Upload, X } from 'lucide-react'
import { updateVersion } from '@/actions/versions'
import { createClient } from '@/lib/supabase/client'
import { listStatusNames } from '@/lib/status/options'
import { listTagNames } from '@/lib/tags/options'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SchemaExtraFields } from '@/components/schema/schema-extra-fields'

interface EditVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  version: any
}

type MultiSelectOption = {
  value: string
  label: string
}

const STATUS_FALLBACK_VALUES = ['pending', 'ip', 'review', 'approved', 'on_hold']

const labelClass = 'pt-2 text-sm font-semibold text-zinc-200'
const inputClass =
  'border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-400 focus:border-sky-500 focus:ring-sky-500/30'
const selectClass =
  'w-full border-zinc-700 bg-zinc-900 text-zinc-100 focus:border-sky-500 focus:ring-sky-500/30'

function asText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function parseUnknownList(value: unknown): string[] {
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

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  )
}

function toNullableText(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function toNullableNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isNaN(parsed) ? null : parsed
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })
}

async function optimizeThumbnailDataUrl(file: File) {
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
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to process image')
  ctx.drawImage(img, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', 0.84)
}

function buildExtraFieldState(version: any): Record<string, unknown> {
  if (!version) return {}

  const exclude = new Set([
    'id',
    'project_id',
    'entity_type',
    'entity_id',
    'task_id',
    'task',
    'task_label',
    'artist_id',
    'artist',
    'artist_label',
    'project',
    'project_label',
    'code',
    'version_number',
    'description',
    'status',
    'tags',
    'link',
    'thumbnail_url',
    'thumbnail_blur_hash',
    'created_at',
    'updated_at',
    'created_by',
    'updated_by',
  ])

  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(version)) {
    if (exclude.has(key)) continue
    if (value === undefined) continue
    next[key] = value
  }
  return next
}

function MultiSelectDropdown({
  id,
  values,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  id: string
  values: string[]
  options: MultiSelectOption[]
  placeholder: string
  disabled?: boolean
  onChange: (nextValues: string[]) => void
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition ${
            disabled
              ? 'cursor-not-allowed border-zinc-800 bg-zinc-900/50 text-zinc-500'
              : 'border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-600'
          }`}
        >
          <span className="truncate text-left">
            {values.length > 0 ? values.join(', ') : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-zinc-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)] max-w-[min(540px,70vw)] border-zinc-700 bg-zinc-900 text-zinc-100"
      >
        {options.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-zinc-500">No options available</p>
        ) : (
          options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={values.includes(option.value)}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(checked) => {
                const isChecked = checked === true
                if (isChecked) {
                  if (values.includes(option.value)) return
                  onChange([...values, option.value])
                  return
                }
                onChange(values.filter((item) => item !== option.value))
              }}
              className="text-zinc-100 focus:bg-zinc-800 focus:text-zinc-100"
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function EditVersionDialog({ open, onOpenChange, projectId, version }: EditVersionDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMoreFields, setShowMoreFields] = useState(false)
  const [projectLabel, setProjectLabel] = useState(projectId)
  const [tasks, setTasks] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [statusNames, setStatusNames] = useState<string[]>([])
  const [tagNames, setTagNames] = useState<string[]>([])
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null)
  const [thumbnailFileName, setThumbnailFileName] = useState('')
  const [extraFields, setExtraFields] = useState<Record<string, unknown>>({})

  const [formData, setFormData] = useState({
    code: '',
    version_number: '',
    description: '',
    artist_id: '',
    link: '',
    task_id: '',
    status: 'pending',
    tags: [] as string[],
    thumbnail_blur_hash: '',
    entity_type: '',
    entity_id: '',
  })

  useEffect(() => {
    if (!open || !version) return

    setFormData({
      code: asText(version.code),
      version_number: asText(version.version_number),
      description: asText(version.description),
      artist_id: asText(version.artist_id),
      link: asText(version.link),
      task_id: asText(version.task_id),
      status: asText(version.status) || 'pending',
      tags: parseUnknownList(version.tags),
      thumbnail_blur_hash: asText(version.thumbnail_blur_hash),
      entity_type: asText(version.entity_type),
      entity_id: asText(version.entity_id),
    })
    setThumbnailDataUrl(asText(version.thumbnail_url).trim() || null)
    setThumbnailFileName('')
    setExtraFields(buildExtraFieldState(version))
    setError(null)
    setShowMoreFields(false)
    void loadData()
  }, [open, projectId, version])

  async function loadData() {
    const supabase = createClient()
    const [{ data: tasksData }, { data: usersData }, { data: projectData }, statuses, tags] =
      await Promise.all([
        supabase
          .from('tasks')
          .select('id, name, entity_type, entity_id')
          .eq('project_id', projectId)
          .order('name'),
        supabase.from('profiles').select('id, full_name, email').order('full_name'),
        supabase
          .from('projects')
          .select('name, code')
          .eq('id', projectId)
          .maybeSingle(),
        listStatusNames('version'),
        listTagNames(),
      ])

    setTasks(tasksData || [])
    setUsers(usersData || [])
    setProjectLabel(projectData?.code || projectData?.name || projectId)
    setStatusNames(uniqueSorted(statuses))
    setTagNames(uniqueSorted(tags))
  }

  const statusOptions = useMemo(() => {
    const values = new Set<string>()
    for (const status of statusNames) {
      const normalized = status.trim()
      if (normalized) values.add(normalized)
    }
    const current = formData.status.trim()
    if (current) values.add(current)
    if (values.size === 0) {
      for (const fallback of STATUS_FALLBACK_VALUES) values.add(fallback)
    }
    return Array.from(values)
  }, [formData.status, statusNames])

  const tagOptions = useMemo<MultiSelectOption[]>(() => {
    const values = new Set<string>()
    for (const tag of tagNames) {
      const normalized = tag.trim()
      if (normalized) values.add(normalized)
    }
    for (const tag of formData.tags) {
      const normalized = tag.trim()
      if (normalized) values.add(normalized)
    }
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value }))
  }, [formData.tags, tagNames])

  const filteredTasks = useMemo(() => {
    if (!formData.entity_type || !formData.entity_id) return tasks
    return tasks.filter(
      (task) =>
        task.entity_type === formData.entity_type &&
        task.entity_id === Number.parseInt(formData.entity_id, 10)
    )
  }, [formData.entity_id, formData.entity_type, tasks])

  const linkedEntityLabel = useMemo(() => {
    if (!formData.entity_type || !formData.entity_id) return 'Unlinked'
    return `${formData.entity_type} #${formData.entity_id}`
  }, [formData.entity_id, formData.entity_type])

  const handleThumbnailFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Thumbnail must be an image file')
      return
    }

    try {
      const optimized = await optimizeThumbnailDataUrl(file)
      setThumbnailDataUrl(optimized)
      setThumbnailFileName(file.name)
      setError(null)
    } catch (thumbnailError) {
      setError(thumbnailError instanceof Error ? thumbnailError.message : 'Failed to process thumbnail')
    } finally {
      event.target.value = ''
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!version?.id) return
    setIsLoading(true)
    setError(null)

    try {
      const result = await updateVersion(
        String(version.id),
        {
          version_number: toNullableNumber(formData.version_number),
          description: toNullableText(formData.description),
          artist_id: toNullableText(formData.artist_id),
          link: toNullableText(formData.link),
          task_id: toNullableNumber(formData.task_id),
          status: toNullableText(formData.status),
          tags: formData.tags,
          thumbnail_url: thumbnailDataUrl || null,
          thumbnail_blur_hash: toNullableText(formData.thumbnail_blur_hash),
          ...extraFields,
        },
        { projectId }
      )

      if (result.error) throw new Error(result.error)

      onOpenChange(false)
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to update version')
    } finally {
      setIsLoading(false)
    }
  }

  if (!version) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden border-zinc-800 bg-zinc-950 p-0 text-zinc-100"
      >
        <form onSubmit={handleSubmit} className="flex max-h-[90vh] flex-col">
          <div className="border-b border-zinc-800 px-6 py-4">
            <DialogTitle className="whitespace-nowrap text-2xl font-semibold leading-tight text-zinc-100">
              Edit Version
            </DialogTitle>
            <DialogDescription className="sr-only">
              Edit version metadata.
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="code" className={labelClass}>
                Version Name:
              </Label>
              <Input id="code" value={formData.code} readOnly className={inputClass} />
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="description" className={labelClass}>
                Description:
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="artist_id" className={labelClass}>
                Artist:
              </Label>
              <Select
                value={formData.artist_id || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, artist_id: value === 'none' ? '' : value })
                }
                disabled={isLoading}
              >
                <SelectTrigger id="artist_id" className={selectClass}>
                  <SelectValue placeholder="Select artist" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="link" className={labelClass}>
                Link:
              </Label>
              <Input
                id="link"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="task_id" className={labelClass}>
                Task:
              </Label>
              <Select
                value={formData.task_id || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, task_id: value === 'none' ? '' : value })
                }
                disabled={isLoading}
              >
                <SelectTrigger id="task_id" className={selectClass}>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {filteredTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id.toString()}>
                      {task.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="project_label" className={labelClass}>
                Project:
              </Label>
              <Input id="project_label" value={projectLabel} readOnly className={inputClass} />
            </div>

            <div className="pl-[120px]">
              <button
                type="button"
                onClick={() => setShowMoreFields((prev) => !prev)}
                className="inline-flex items-center gap-1 text-sm text-zinc-300 transition hover:text-zinc-100"
              >
                More fields
                <ChevronDown
                  className={`h-4 w-4 transition ${showMoreFields ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {showMoreFields && (
              <div className="space-y-4 rounded-md border border-zinc-800 bg-zinc-900/30 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="status" className="text-sm font-medium text-zinc-300">
                      Status
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="status" className={selectClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tags" className="text-sm font-medium text-zinc-300">
                      Tags
                    </Label>
                    <MultiSelectDropdown
                      id="tags"
                      values={formData.tags}
                      options={tagOptions}
                      placeholder="Select tags"
                      disabled={isLoading}
                      onChange={(nextTags) => setFormData({ ...formData, tags: nextTags })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[120px_1fr] items-start gap-3">
                  <Label htmlFor="version_number" className={labelClass}>
                    Version Number:
                  </Label>
                  <Input
                    id="version_number"
                    type="number"
                    min="1"
                    value={formData.version_number}
                    onChange={(e) => setFormData({ ...formData, version_number: e.target.value })}
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-[120px_1fr] items-start gap-3">
                  <Label htmlFor="entity_link" className={labelClass}>
                    Link:
                  </Label>
                  <Input id="entity_link" value={linkedEntityLabel} readOnly className={inputClass} />
                </div>

                <div className="grid grid-cols-[120px_1fr] items-start gap-3">
                  <Label htmlFor="thumbnail_file" className={labelClass}>
                    Thumbnail:
                  </Label>
                  <div className="space-y-3">
                    <label
                      htmlFor="thumbnail_file"
                      className="flex min-h-20 cursor-pointer items-center justify-center rounded-md border border-dashed border-zinc-700 bg-zinc-900 px-4 py-4 text-center transition hover:border-zinc-500"
                    >
                      <div className="flex items-center gap-2 text-sm text-zinc-300">
                        <Upload className="h-4 w-4" />
                        <span>{thumbnailFileName || 'Upload thumbnail image'}</span>
                      </div>
                    </label>
                    <Input
                      id="thumbnail_file"
                      type="file"
                      accept="image/*"
                      disabled={isLoading}
                      className="sr-only"
                      onChange={handleThumbnailFileChange}
                    />

                    {thumbnailDataUrl ? (
                      <div className="space-y-2">
                        <img
                          src={thumbnailDataUrl}
                          alt="Thumbnail preview"
                          className="h-24 w-24 rounded-md border border-zinc-700 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setThumbnailDataUrl(null)
                            setThumbnailFileName('')
                          }}
                          className="inline-flex items-center gap-1 text-xs text-zinc-300 transition hover:text-zinc-100"
                        >
                          <X className="h-3 w-3" />
                          Clear thumbnail
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-[120px_1fr] items-start gap-3">
                  <Label htmlFor="thumbnail_blur_hash" className={labelClass}>
                    Blur Hash:
                  </Label>
                  <Input
                    id="thumbnail_blur_hash"
                    value={formData.thumbnail_blur_hash}
                    onChange={(e) => setFormData({ ...formData, thumbnail_blur_hash: e.target.value })}
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>

                <SchemaExtraFields
                  entity="version"
                  values={extraFields}
                  onChange={setExtraFields}
                  disabled={isLoading}
                  title="More schema fields"
                  excludeColumns={new Set([
                    'code',
                    'version_number',
                    'description',
                    'artist_id',
                    'status',
                    'tags',
                    'link',
                    'task_id',
                    'entity_type',
                    'entity_id',
                    'movie_url',
                    'file_path',
                    'uploaded_movie',
                    'frames_path',
                    'thumbnail_url',
                    'thumbnail_blur_hash',
                  ])}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end border-t border-zinc-800 px-6 py-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-900/30"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-sky-600 text-white hover:bg-sky-500"
              >
                {isLoading ? 'Saving...' : 'Save Version'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
