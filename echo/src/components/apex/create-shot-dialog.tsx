'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { createShot } from '@/actions/shots'
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

interface CreateShotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  defaultSequenceId?: string | number
  lockSequence?: boolean
}

type SequenceOption = {
  id: number
  code?: string | null
  name?: string | null
}

type MultiSelectOption = {
  value: string
  label: string
}

const STATUS_FALLBACK_VALUES = ['pending', 'ip', 'review', 'approved', 'on_hold']

const labelClass = 'pt-2 text-sm font-semibold text-foreground/80'
const inputClass =
  'border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:ring-sky-500/30'
const selectClass =
  'w-full border-border bg-card text-foreground focus:border-sky-500 focus:ring-sky-500/30'

function asText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function normalizeCodeToken(value: string): string {
  return value.trim().replace(/\s+/g, '_').toUpperCase()
}

function resolveSequenceCode(sequenceId: string, sequenceOptions: SequenceOption[]): string {
  if (!sequenceId || sequenceId === 'none') return ''
  const matched = sequenceOptions.find((sequence) => String(sequence.id) === sequenceId)
  return normalizeCodeToken(asText(matched?.code))
}

function buildShotCode(sequenceCode: string, shotToken: string): string {
  if (!shotToken) return ''
  if (!sequenceCode) return shotToken
  if (shotToken.startsWith(sequenceCode)) return shotToken
  return `${sequenceCode}${shotToken}`
}

function formatSequenceOptionLabel(sequence: SequenceOption): string {
  const code = asText(sequence.code).trim()
  return code || asText(sequence.name).trim() || String(sequence.id)
}

function listToString(values: string[]): string {
  return values.join(', ')
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

export function CreateShotDialog({
  open,
  onOpenChange,
  projectId,
  defaultSequenceId,
  lockSequence = false,
}: CreateShotDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sequences, setSequences] = useState<SequenceOption[]>([])
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
    sequence_id: defaultSequenceId ? String(defaultSequenceId) : 'none',
    name: '',
    description: '',
    task_template: '',
    status: 'pending',
    tags: [] as string[],
    shot_type: '',
    cut_in: '',
    cut_out: '',
    client_name: '',
    dd_client_name: '',
    thumbnail_blur_hash: '',
  })

  const shotToken = useMemo(() => normalizeCodeToken(formData.name), [formData.name])
  const selectedSequenceCode = useMemo(
    () => resolveSequenceCode(formData.sequence_id, sequences),
    [formData.sequence_id, sequences]
  )
  const derivedShotCode = useMemo(
    () => buildShotCode(selectedSequenceCode, shotToken),
    [selectedSequenceCode, shotToken]
  )

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
    .is('deleted_at', null)
    .maybeSingle()
    setProjectLabel(data?.code || data?.name || projectId)
  }, [projectId])

  const loadSequences = useCallback(async () => {
    const supabase = createClient()
  const { data, error } = await supabase
    .from('sequences')
    .select('id, code, name')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('code')
    if (error) {
      console.error('Failed to load sequences:', error)
      setSequences([])
      return
    }
    setSequences((data || []) as SequenceOption[])
  }, [projectId])

  const loadStatusAndTags = useCallback(async () => {
    try {
      const [statuses, tags] = await Promise.all([listStatusNames('shot'), listTagNames()])
      setStatusNames(statuses)
      setTagNames(tags)
    } catch (loadError) {
      console.error('Failed to load shot status/tag options:', loadError)
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
    void loadSequences()
    void loadStatusAndTags()
  }, [loadProject, loadSequences, loadStatusAndTags, open])

  useEffect(() => {
    if (!open) return
    if (!defaultSequenceId) return
    setFormData((prev) => ({ ...prev, sequence_id: String(defaultSequenceId) }))
  }, [open, defaultSequenceId])

  useEffect(() => {
    if (open) return
    setThumbnailDataUrl(null)
    setThumbnailFileName('')
  }, [open])

  useEffect(() => {
    if (!open) return
    if (!autoClientName && !autoDdClientName) return

    setFormData((previous) => {
      let changed = false
      const next = { ...previous }

      if (autoClientName && previous.client_name !== derivedShotCode) {
        next.client_name = derivedShotCode
        changed = true
      }

      if (autoDdClientName && previous.dd_client_name !== derivedShotCode) {
        next.dd_client_name = derivedShotCode
        changed = true
      }

      return changed ? next : previous
    })
  }, [autoClientName, autoDdClientName, derivedShotCode, open])

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
      if (!formData.sequence_id || formData.sequence_id === 'none') {
        throw new Error('Please select a sequence')
      }

      const normalizedName = formData.name.trim()
      const normalizedCode = derivedShotCode

      if (!normalizedName) {
        throw new Error('Shot name is required')
      }
      if (!normalizedCode) {
        throw new Error('Shot code could not be generated')
      }

      const result = await createShot({
        project_id: projectId,
        sequence_id: formData.sequence_id,
        name: normalizedName,
        code: normalizedCode,
        thumbnail_url: thumbnailDataUrl || null,
        thumbnail_blur_hash: formData.thumbnail_blur_hash.trim() || null,
        description: formData.description || null,
        task_template: formData.task_template || null,
        status: formData.status || 'pending',
        tags: formData.tags,
        shot_type: formData.shot_type || null,
        cut_in: formData.cut_in.trim() ? Number.parseInt(formData.cut_in, 10) : undefined,
        cut_out: formData.cut_out.trim() ? Number.parseInt(formData.cut_out, 10) : undefined,
        client_name: formData.client_name.trim() || normalizedCode,
        dd_client_name: formData.dd_client_name.trim() || normalizedCode,
        ...extraFields,
      })

      if (result.error) throw new Error(result.error)

      setFormData({
        sequence_id: defaultSequenceId ? String(defaultSequenceId) : 'none',
        name: '',
        description: '',
        task_template: '',
        status: 'pending',
        tags: [],
        shot_type: '',
        cut_in: '',
        cut_out: '',
        client_name: '',
        dd_client_name: '',
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
      setError(err instanceof Error ? err.message : 'Failed to create shot')
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
              Create a new Shot
            </DialogTitle>
            <DialogDescription className="sr-only">
              Create a new shot and assign it to a sequence.
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {sequences.length === 0 ? (
              <div className="rounded-md border border-primary/20 bg-primary/10 p-3 text-sm text-primary/80">
                No sequences found. Create a sequence first.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[120px_1fr] items-start gap-3">
                  <Label htmlFor="name" className={labelClass}>
                    Shot Name:
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      const nextName = e.target.value
                      const nextCode = buildShotCode(
                        resolveSequenceCode(formData.sequence_id, sequences),
                        normalizeCodeToken(nextName)
                      )
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

                <div className="grid grid-cols-[120px_1fr] items-start gap-3">
                  <Label htmlFor="sequence_id" className={labelClass}>
                    Sequence:
                  </Label>
                  <Select
                    value={formData.sequence_id}
                    onValueChange={(value) => {
                      const nextCode = buildShotCode(
                        resolveSequenceCode(value, sequences),
                        normalizeCodeToken(formData.name)
                      )
                      setFormData((previous) => ({
                        ...previous,
                        sequence_id: value,
                        client_name: autoClientName ? nextCode : previous.client_name,
                        dd_client_name: autoDdClientName ? nextCode : previous.dd_client_name,
                      }))
                    }}
                    disabled={isLoading || lockSequence}
                  >
                    <SelectTrigger id="sequence_id" className={selectClass}>
                      <SelectValue placeholder="Select a sequence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select a sequence</SelectItem>
                      {sequences.map((sequence) => (
                        <SelectItem key={sequence.id} value={String(sequence.id)}>
                          {formatSequenceOptionLabel(sequence)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="task_template" className={labelClass}>
                    Task Template:
                  </Label>
                  <Input
                    id="task_template"
                    value={formData.task_template}
                    onChange={(e) =>
                      setFormData({ ...formData, task_template: e.target.value })
                    }
                    disabled={isLoading}
                    className={inputClass}
                  />
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
                    <div className="grid grid-cols-[120px_1fr] items-start gap-3">
                      <Label htmlFor="code" className={labelClass}>
                        Shot Code:
                      </Label>
                      <div>
                        <Input
                          id="code"
                          value={derivedShotCode}
                          readOnly
                          disabled
                          className={inputClass}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Generated from sequence code + shot name and fixed after create.
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

                    <div className="grid grid-cols-[120px_1fr] items-start gap-3">
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

                    <div className="grid grid-cols-[120px_1fr] items-start gap-3">
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

                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="cut_in" className="text-sm font-medium text-foreground/70">
                          Cut In
                        </Label>
                        <Input
                          id="cut_in"
                          type="number"
                          value={formData.cut_in}
                          onChange={(e) => setFormData({ ...formData, cut_in: e.target.value })}
                          disabled={isLoading}
                          className={inputClass}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cut_out" className="text-sm font-medium text-foreground/70">
                          Cut Out
                        </Label>
                        <Input
                          id="cut_out"
                          type="number"
                          value={formData.cut_out}
                          onChange={(e) => setFormData({ ...formData, cut_out: e.target.value })}
                          disabled={isLoading}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="shot_type" className="text-sm font-medium text-foreground/70">
                          Type
                        </Label>
                        <Input
                          id="shot_type"
                          value={formData.shot_type}
                          onChange={(e) => setFormData({ ...formData, shot_type: e.target.value })}
                          disabled={isLoading}
                          className={inputClass}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="client_name" className="text-sm font-medium text-foreground/70">
                          Client Name
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
                    </div>

                    <div className="grid grid-cols-[120px_1fr] items-start gap-3">
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

                    <SchemaExtraFields
                      entity="shot"
                      values={extraFields}
                      onChange={setExtraFields}
                      disabled={isLoading}
                      title="More schema fields"
                      excludeColumns={new Set([
                        'sequence_id',
                        'name',
                        'code',
                        'description',
                        'task_template',
                        'status',
                        'tags',
                        'shot_type',
                        'cut_in',
                        'cut_out',
                        'client_name',
                        'dd_client_name',
                        'thumbnail_url',
                        'thumbnail_blur_hash',
                      ])}
                    />
                  </div>
                )}
              </>
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
                disabled={isLoading || sequences.length === 0}
                className="bg-sky-600 text-white hover:bg-sky-500"
              >
                {isLoading ? 'Creating...' : 'Create Shot'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
