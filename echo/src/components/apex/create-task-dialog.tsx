'use client'

import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Upload, X } from 'lucide-react'
import { createTask } from '@/actions/tasks'
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

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  defaultEntityType?: 'asset' | 'shot' | 'sequence'
  defaultEntityId?: string | number
  lockEntity?: boolean
}

type MultiSelectOption = {
  value: string
  label: string
}

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const STATUS_FALLBACK_VALUES = ['pending', 'ip', 'review', 'approved', 'on_hold']

const labelClass = 'pt-2 text-sm font-semibold text-zinc-200'
const inputClass =
  'border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-400 focus:border-sky-500 focus:ring-sky-500/30'
const selectClass = 'w-full border-zinc-700 bg-zinc-900 text-zinc-100 focus:border-sky-500 focus:ring-sky-500/30'

function asText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function parseList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  )
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

export function CreateTaskDialog({
  open,
  onOpenChange,
  projectId,
  defaultEntityType,
  defaultEntityId,
  lockEntity = false,
}: CreateTaskDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assets, setAssets] = useState<any[]>([])
  const [shots, setShots] = useState<any[]>([])
  const [sequences, setSequences] = useState<any[]>([])
  const [steps, setSteps] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [statusNames, setStatusNames] = useState<string[]>([])
  const [tagNames, setTagNames] = useState<string[]>([])
  const [projectLabel, setProjectLabel] = useState(projectId)
  const [showMoreFields, setShowMoreFields] = useState(false)
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null)
  const [thumbnailFileName, setThumbnailFileName] = useState('')
  const [extraFields, setExtraFields] = useState<Record<string, any>>({})

  const [formData, setFormData] = useState({
    name: '',
    entity_type: (defaultEntityType ?? 'asset') as 'asset' | 'shot' | 'sequence',
    entity_id: defaultEntityId ? String(defaultEntityId) : '',
    step_id: '',
    assigned_to: '',
    reviewer: '',
    start_date: '',
    end_date: '',
    status: 'pending',
    priority: 'medium',
    tags: [] as string[],
    due_date: '',
    task_template: '',
    thumbnail_blur_hash: '',
    description: '',
  })

  const statusOptions = useMemo(() => {
    const values = new Set<string>()
    for (const item of statusNames) {
      const normalized = item.trim()
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
    for (const item of tagNames) {
      const normalized = item.trim()
      if (normalized) values.add(normalized)
    }
    for (const item of formData.tags) {
      const normalized = item.trim()
      if (normalized) values.add(normalized)
    }
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value }))
  }, [formData.tags, tagNames])

  useEffect(() => {
    if (!open) return
    setShowMoreFields(false)
    void loadData()
  }, [open, projectId])

  useEffect(() => {
    if (!open) return
    setFormData((prev) => ({
      ...prev,
      entity_type: (defaultEntityType ?? prev.entity_type) as 'asset' | 'shot' | 'sequence',
      entity_id: defaultEntityId ? String(defaultEntityId) : prev.entity_id,
    }))
  }, [open, defaultEntityType, defaultEntityId])

  async function loadData() {
    try {
      const supabase = createClient()
      const [
        assetsResult,
        shotsResult,
        sequencesResult,
        stepsResult,
        usersResult,
        projectResult,
        nextStatuses,
        nextTags,
      ] = await Promise.all([
        supabase
          .from('assets')
          .select('id, name, code')
          .eq('project_id', projectId)
          .order('name'),
        supabase
          .from('shots')
          .select('id, name, code')
          .eq('project_id', projectId)
          .order('code'),
        supabase
          .from('sequences')
          .select('id, name, code')
          .eq('project_id', projectId)
          .order('code'),
        supabase.from('steps').select('id, name').order('sort_order'),
        supabase.from('profiles').select('id, full_name, email').order('full_name'),
        supabase
          .from('projects')
          .select('name, code')
          .eq('id', projectId)
          .maybeSingle(),
        listStatusNames('task'),
        listTagNames(),
      ])

      if (assetsResult.error) throw assetsResult.error
      if (shotsResult.error) throw shotsResult.error
      if (sequencesResult.error) throw sequencesResult.error
      if (stepsResult.error) throw stepsResult.error
      if (usersResult.error) throw usersResult.error
      if (projectResult.error) throw projectResult.error

      setAssets(assetsResult.data || [])
      setShots(shotsResult.data || [])
      setSequences(sequencesResult.data || [])
      setSteps(stepsResult.data || [])
      setUsers(usersResult.data || [])
      setStatusNames(uniqueSorted(nextStatuses))
      setTagNames(uniqueSorted(nextTags))
      setProjectLabel(projectResult.data?.code || projectResult.data?.name || projectId)
    } catch (loadError) {
      console.error('Failed to load task dialog options:', loadError)
      setAssets([])
      setShots([])
      setSequences([])
      setSteps([])
      setUsers([])
      setStatusNames([])
      setTagNames([])
      setProjectLabel(projectId)
    }
  }

  const entities =
    formData.entity_type === 'asset'
      ? assets
      : formData.entity_type === 'shot'
        ? shots
        : sequences

  const linkedEntity = entities.find(
    (entity) => entity.id?.toString() === formData.entity_id
  )
  const linkedEntityLabel = linkedEntity
    ? `${linkedEntity.code || ''}${linkedEntity.name ? ` - ${linkedEntity.name}` : ''}`.trim()
    : ''

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!formData.entity_id || !formData.step_id) {
      setError('Please set Link and Pipeline Step')
      setIsLoading(false)
      return
    }

    try {
      const result = await createTask({
        project_id: projectId,
        name: formData.name.trim(),
        entity_type: formData.entity_type,
        entity_id: formData.entity_id,
        step_id: formData.step_id,
        assigned_to: formData.assigned_to || undefined,
        reviewer: parseList(formData.reviewer),
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        status: formData.status,
        priority: formData.priority,
        tags: formData.tags,
        due_date: formData.due_date || undefined,
        task_template: formData.task_template || null,
        thumbnail_url: thumbnailDataUrl || undefined,
        thumbnail_blur_hash: formData.thumbnail_blur_hash || undefined,
        description: formData.description || undefined,
        ...extraFields,
      })

      if (result.error) throw new Error(result.error)

      setFormData({
        name: '',
        entity_type: defaultEntityType ?? 'asset',
        entity_id: defaultEntityId ? String(defaultEntityId) : '',
        step_id: '',
        assigned_to: '',
        reviewer: '',
        start_date: '',
        end_date: '',
        status: 'pending',
        priority: 'medium',
        tags: [],
        due_date: '',
        task_template: '',
        thumbnail_blur_hash: '',
        description: '',
      })
      setThumbnailDataUrl(null)
      setThumbnailFileName('')
      setExtraFields({})
      setShowMoreFields(false)
      onOpenChange(false)
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create task')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden border-zinc-800 bg-zinc-950 p-0 text-zinc-100"
      >
        <form onSubmit={handleSubmit} className="flex max-h-[90vh] flex-col">
          <div className="border-b border-zinc-800 px-6 py-4">
            <DialogTitle className="whitespace-nowrap text-2xl font-semibold leading-tight text-zinc-100">
              Create a new Task
            </DialogTitle>
            <DialogDescription className="sr-only">
              Create a new task and link it to an entity.
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="name" className={labelClass}>
                Task Name:
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="link_entity" className={labelClass}>
                Link:
              </Label>
              {lockEntity ? (
                <Input
                  id="link_entity"
                  value={linkedEntityLabel || `${formData.entity_type} #${formData.entity_id || '-'}`}
                  readOnly
                  className={inputClass}
                />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <Select
                    value={formData.entity_type}
                    onValueChange={(value: 'asset' | 'shot' | 'sequence') =>
                      setFormData({ ...formData, entity_type: value, entity_id: '' })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className={selectClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="shot">Shot</SelectItem>
                      <SelectItem value="sequence">Sequence</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={formData.entity_id || 'none'}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        entity_id: value === 'none' ? '' : value,
                      })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className={selectClass}>
                      <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select entity</SelectItem>
                      {entities.map((entity) => (
                        <SelectItem key={entity.id} value={entity.id.toString()}>
                          {entity.code} - {entity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="step_id" className={labelClass}>
                Pipeline Step:
              </Label>
              <Select
                value={formData.step_id || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, step_id: value === 'none' ? '' : value })
                }
                disabled={isLoading}
              >
                <SelectTrigger id="step_id" className={selectClass}>
                  <SelectValue placeholder="Select step" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select step</SelectItem>
                  {steps.map((step) => (
                    <SelectItem key={step.id} value={step.id.toString()}>
                      {step.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="assigned_to" className={labelClass}>
                Assigned To:
              </Label>
              <Select
                value={formData.assigned_to || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, assigned_to: value === 'none' ? '' : value })
                }
                disabled={isLoading}
              >
                <SelectTrigger id="assigned_to" className={selectClass}>
                  <SelectValue placeholder="Unassigned" />
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
              <Label htmlFor="reviewer" className={labelClass}>
                Reviewer:
              </Label>
              <Input
                id="reviewer"
                value={formData.reviewer}
                onChange={(e) => setFormData({ ...formData, reviewer: e.target.value })}
                placeholder="Comma separated reviewers"
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="start_date" className={labelClass}>
                Start Date:
              </Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="end_date" className={labelClass}>
                End Date:
              </Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
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
                    <Label htmlFor="priority" className="text-sm font-medium text-zinc-300">
                      Priority
                    </Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData({ ...formData, priority: value })}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="priority" className={selectClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value}>
                            {priority.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                    onChange={(nextTags) => setFormData({ ...formData, tags: nextTags })}
                  />
                </div>

                <div className="grid grid-cols-[120px_1fr] items-start gap-3">
                  <Label htmlFor="due_date" className={labelClass}>
                    Due Date:
                  </Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
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
                  <Label htmlFor="task_thumbnail" className={labelClass}>
                    Thumbnail:
                  </Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label
                        htmlFor="task_thumbnail"
                        className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Upload Thumbnail
                      </label>
                      <input
                        id="task_thumbnail"
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailFileChange}
                        disabled={isLoading}
                        className="hidden"
                      />
                      {thumbnailDataUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setThumbnailDataUrl(null)
                            setThumbnailFileName('')
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-800"
                        >
                          <X className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      )}
                    </div>

                    {thumbnailDataUrl ? (
                      <div className="flex items-center gap-3 rounded-md border border-zinc-800 bg-zinc-900 p-2">
                        <img
                          src={thumbnailDataUrl}
                          alt="Task thumbnail preview"
                          className="h-14 w-14 rounded object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm text-zinc-200">
                            {thumbnailFileName || 'thumbnail.jpg'}
                          </p>
                          <p className="text-xs text-zinc-500">Stored as optimized local data URL</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">No thumbnail selected.</p>
                    )}
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

                <div className="grid grid-cols-[120px_1fr] items-start gap-3">
                  <Label htmlFor="description" className={labelClass}>
                    Description:
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={4}
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>

                <SchemaExtraFields
                  entity="task"
                  values={extraFields}
                  onChange={setExtraFields}
                  disabled={isLoading}
                  title="More schema fields"
                  excludeColumns={new Set([
                    'name',
                    'assigned_to',
                    'reviewer',
                    'step_id',
                    'priority',
                    'due_date',
                    'description',
                    'status',
                    'start_date',
                    'end_date',
                    'task_template',
                    'thumbnail_url',
                    'thumbnail_blur_hash',
                    'tags',
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
                {isLoading ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
