'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { createSequence } from '@/actions/sequences'
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

interface CreateSequenceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
}

const STATUS_FALLBACK_VALUES = ['active', 'pending', 'ip', 'review', 'approved', 'on_hold']

const labelClass = 'pt-2 text-sm font-semibold text-foreground/80'
const inputClass =
  'border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:ring-sky-500/30'
const selectClass =
  'w-full border-border bg-card text-foreground focus:border-sky-500 focus:ring-sky-500/30'

type MultiSelectOption = {
  value: string
  label: string
}

function normalizeCodeToken(value: string): string {
  return value.trim().replace(/\s+/g, '_').toUpperCase()
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

function listToString(values: string[]): string {
  return values.join(', ')
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
              ? 'cursor-not-allowed border-border bg-card/50 text-muted-foreground'
              : 'border-border bg-card text-foreground hover:border-border'
          }`}
        >
          <span className="truncate text-left">
            {values.length > 0 ? listToString(values) : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)] max-w-[min(540px,70vw)] border-border bg-card text-foreground"
      >
        {options.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">No options available</p>
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
              className="text-foreground focus:bg-accent focus:text-foreground"
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function CreateSequenceDialog({
  open,
  onOpenChange,
  projectId,
}: CreateSequenceDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projectLabel, setProjectLabel] = useState(projectId)
  const [statusNames, setStatusNames] = useState<string[]>([])
  const [tagNames, setTagNames] = useState<string[]>([])
  const [showMoreFields, setShowMoreFields] = useState(false)
  const [extraFields, setExtraFields] = useState<Record<string, unknown>>({})
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null)
  const [thumbnailFileName, setThumbnailFileName] = useState('')
  const [autoClientName, setAutoClientName] = useState(true)
  const [autoDdClientName, setAutoDdClientName] = useState(true)

  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    dd_client_name: '',
    description: '',
    task_template: '',
    status: 'active',
    sequence_type: '',
    tags: [] as string[],
    thumbnail_blur_hash: '',
  })

  const sequenceCode = useMemo(() => normalizeCodeToken(formData.name), [formData.name])

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
      .map((tag) => ({ value: tag, label: tag }))
  }, [formData.tags, tagNames])

  const loadProject = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('projects')
      .select('name, code')
      .eq('id', projectId)
      .maybeSingle()
    setProjectLabel(data?.code || data?.name || projectId)
  }, [projectId])

  const loadStatusOptions = useCallback(async () => {
    try {
      const [statuses, tags] = await Promise.all([listStatusNames('sequence'), listTagNames()])
      setStatusNames(statuses)
      setTagNames(tags)
    } catch (loadError) {
      console.error('Failed to load sequence statuses:', loadError)
      setStatusNames([])
      setTagNames([])
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setShowMoreFields(false)
    setAutoClientName(true)
    setAutoDdClientName(true)
    void loadProject()
    void loadStatusOptions()
  }, [loadProject, loadStatusOptions, open])

  useEffect(() => {
    if (open) return
    setThumbnailDataUrl(null)
    setThumbnailFileName('')
  }, [open])

  async function handleThumbnailSelect(file: File | null) {
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
      const optimized = await optimizeThumbnailDataUrl(file)
      setThumbnailDataUrl(optimized)
      setThumbnailFileName(file.name)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to process thumbnail')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const normalizedName = formData.name.trim()
      const normalizedCode = sequenceCode

      if (!normalizedName) {
        throw new Error('Sequence name is required')
      }
      if (!normalizedCode) {
        throw new Error('Sequence code could not be generated')
      }

      const result = await createSequence({
        project_id: projectId,
        name: normalizedName,
        code: normalizedCode,
        thumbnail_url: thumbnailDataUrl || null,
        thumbnail_blur_hash: formData.thumbnail_blur_hash.trim() || null,
        client_name: formData.client_name.trim() || normalizedCode,
        dd_client_name: formData.dd_client_name.trim() || normalizedCode,
        description: formData.description || null,
        task_template: formData.task_template || null,
        sequence_type: formData.sequence_type || null,
        status: formData.status || 'active',
        tags: formData.tags,
        ...extraFields,
      })

      if (result.error) throw new Error(result.error)

      setFormData({
        name: '',
        client_name: '',
        dd_client_name: '',
        description: '',
        task_template: '',
        status: 'active',
        sequence_type: '',
        tags: [],
        thumbnail_blur_hash: '',
      })
      setAutoClientName(true)
      setAutoDdClientName(true)
      setExtraFields({})
      setThumbnailDataUrl(null)
      setThumbnailFileName('')
      setShowMoreFields(false)
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sequence')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden border-border bg-background p-0 text-foreground"
      >
        <form onSubmit={handleSubmit} className="flex max-h-[90vh] flex-col">
          <div className="border-b border-border px-6 py-4">
            <DialogTitle className="whitespace-nowrap text-2xl font-semibold leading-tight text-foreground">
              Create a new Sequence
            </DialogTitle>
            <DialogDescription className="sr-only">
              Create a new sequence for this project.
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-[130px_1fr] items-start gap-3">
              <Label htmlFor="name" className={labelClass}>
                Sequence Name:
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  const nextName = e.target.value
                  const nextCode = normalizeCodeToken(nextName)
                  setFormData((previous) => ({
                    ...previous,
                    name: nextName,
                    client_name: autoClientName ? nextCode : previous.client_name,
                    dd_client_name: autoDdClientName ? nextCode : previous.dd_client_name,
                  }))
                }}
                required
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[130px_1fr] items-start gap-3">
              <Label htmlFor="client_name" className={labelClass}>
                Client Name:
              </Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) => {
                  const nextValue = e.target.value
                  setAutoClientName(nextValue.trim().length === 0)
                  setFormData({ ...formData, client_name: nextValue })
                }}
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[130px_1fr] items-start gap-3">
              <Label htmlFor="dd_client_name" className={labelClass}>
                DD Client Name:
              </Label>
              <Input
                id="dd_client_name"
                value={formData.dd_client_name}
                onChange={(e) => {
                  const nextValue = e.target.value
                  setAutoDdClientName(nextValue.trim().length === 0)
                  setFormData({ ...formData, dd_client_name: nextValue })
                }}
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[130px_1fr] items-start gap-3">
              <Label htmlFor="project_label" className={labelClass}>
                Project:
              </Label>
              <Input id="project_label" value={projectLabel} readOnly className={inputClass} />
            </div>

            <div className="pl-[130px]">
              <button
                type="button"
                onClick={() => setShowMoreFields((prev) => !prev)}
                className="inline-flex items-center gap-1 text-sm text-foreground/70 transition hover:text-foreground"
              >
                More fields
                <ChevronDown
                  className={`h-4 w-4 transition ${showMoreFields ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {showMoreFields && (
              <div className="space-y-4 rounded-md border border-border bg-card/30 p-4">
                <div className="grid grid-cols-[130px_1fr] items-start gap-3">
                  <Label htmlFor="code" className={labelClass}>
                    Sequence Code:
                  </Label>
                  <div>
                    <Input
                      id="code"
                      value={sequenceCode}
                      readOnly
                      disabled
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Generated from sequence name and fixed after create.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label className="text-sm font-medium text-foreground/70">Thumbnail</Label>
                    <div className="flex items-center gap-3 rounded-md border border-border bg-card/40 p-2">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-accent">
                        {thumbnailDataUrl ? (
                          <img src={thumbnailDataUrl} alt="" className="h-12 w-12 object-cover" />
                        ) : (
                          <span className="text-xs text-muted-foreground">No Img</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => void handleThumbnailSelect(e.target.files?.[0] || null)}
                          className="w-full text-xs text-foreground/70 file:mr-3 file:rounded file:border-0 file:bg-accent file:px-2 file:py-1 file:text-xs file:text-foreground/80 hover:file:bg-secondary"
                          disabled={isLoading}
                        />
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {thumbnailFileName || 'Optional'}
                        </p>
                      </div>
                      {thumbnailDataUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            setThumbnailDataUrl(null)
                            setThumbnailFileName('')
                          }}
                          className="rounded-md border border-border px-2 py-1 text-xs text-foreground/70 hover:border-border"
                          disabled={isLoading}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="thumbnail_blur_hash" className="text-sm font-medium text-foreground/70">
                      Thumbnail Hash
                    </Label>
                    <Input
                      id="thumbnail_blur_hash"
                      value={formData.thumbnail_blur_hash}
                      onChange={(e) =>
                        setFormData({ ...formData, thumbnail_blur_hash: e.target.value })
                      }
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[130px_1fr] items-start gap-3">
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

                <div className="grid grid-cols-[130px_1fr] items-start gap-3">
                  <Label htmlFor="task_template" className={labelClass}>
                    Task Template:
                  </Label>
                  <Input
                    id="task_template"
                    value={formData.task_template}
                    onChange={(e) => setFormData({ ...formData, task_template: e.target.value })}
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-[130px_1fr] items-start gap-3">
                  <Label htmlFor="sequence_type" className={labelClass}>
                    Type:
                  </Label>
                  <Input
                    id="sequence_type"
                    value={formData.sequence_type}
                    onChange={(e) => setFormData({ ...formData, sequence_type: e.target.value })}
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-[130px_1fr] items-start gap-3">
                  <Label htmlFor="status" className={labelClass}>
                    Status:
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

                <div className="grid grid-cols-[130px_1fr] items-start gap-3">
                  <Label htmlFor="tags" className={labelClass}>
                    Tags:
                  </Label>
                  <MultiSelectDropdown
                    id="tags"
                    values={formData.tags}
                    options={tagOptions}
                    placeholder="Select tags"
                    disabled={isLoading}
                    onChange={(nextValues) => setFormData({ ...formData, tags: nextValues })}
                  />
                </div>

                <SchemaExtraFields
                  entity="sequence"
                  values={extraFields}
                  onChange={setExtraFields}
                  disabled={isLoading}
                  title="More schema fields"
                  excludeColumns={new Set([
                    'name',
                    'description',
                    'client_name',
                    'dd_client_name',
                    'task_template',
                    'status',
                    'sequence_type',
                    'tags',
                    'thumbnail_url',
                    'thumbnail_blur_hash',
                  ])}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end border-t border-border px-6 py-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="border-border bg-card text-foreground/80 hover:bg-card/30"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-sky-600 text-white hover:bg-sky-500"
              >
                {isLoading ? 'Creating...' : 'Create Sequence'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
