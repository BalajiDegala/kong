'use client'

import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Upload, X } from 'lucide-react'
import { updateTask } from '@/actions/tasks'
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

interface EditTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: any
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
const selectClass =
  'w-full border-zinc-700 bg-zinc-900 text-zinc-100 focus:border-sky-500 focus:ring-sky-500/30'

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

function parseUnknownList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asText(item).trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return parseList(value)
  }

  return []
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
  const optionLabelByValue = new Map(options.map((option) => [option.value, option.label]))
  const selectedLabel = values
    .map((value) => optionLabelByValue.get(value) || value)
    .join(', ')

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
            {values.length > 0 ? selectedLabel : placeholder}
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

function buildExtraFieldState(task: any): Record<string, unknown> {
  if (!task) return {}

  const exclude = new Set([
    'id',
    'project_id',
    'project',
    'project_label',
    'name',
    'entity_type',
    'entity_id',
    'entity_display',
    'entity_name',
    'entity_code',
    'entity_type_display',
    'step_name',
    'department',
    'department_label',
    'assignee_name',
    'step_id',
    'assigned_to',
    'reviewer',
    'ayon_assignees',
    'start_date',
    'end_date',
    'status',
    'priority',
    'tags',
    'due_date',
    'task_template',
    'thumbnail_url',
    'thumbnail_blur_hash',
    'description',
    'created_at',
    'updated_at',
    'created_by',
    'updated_by',
  ])

  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(task)) {
    if (exclude.has(key)) continue
    if (value === undefined) continue
    next[key] = value
  }
  return next
}

export function EditTaskDialog({ open, onOpenChange, task }: EditTaskDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [statusNames, setStatusNames] = useState<string[]>([])
  const [tagNames, setTagNames] = useState<string[]>([])
  const [projectLabel, setProjectLabel] = useState('')
  const [showMoreFields, setShowMoreFields] = useState(false)
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null)
  const [thumbnailFileName, setThumbnailFileName] = useState('')
  const [extraFields, setExtraFields] = useState<Record<string, unknown>>({})

  const [formData, setFormData] = useState({
    department: '',
    assigned_to: '',
    reviewer: [] as string[],
    ayon_assignees: [] as string[],
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

  const userOptions = useMemo<MultiSelectOption[]>(
    () =>
      users.map((user) => ({
        value: user.id,
        label:
          asText(user.display_name).trim() ||
          asText(user.full_name).trim() ||
          asText(user.email).trim() ||
          user.id,
      })),
    [users]
  )

  useEffect(() => {
    if (!open || !task) return

    setFormData({
      department: asText(task.department || task.step?.department_id),
      assigned_to: asText(task.assigned_to),
      reviewer: parseUnknownList(task.reviewer),
      ayon_assignees: parseUnknownList(task.ayon_assignees),
      start_date: asText(task.start_date),
      end_date: asText(task.end_date),
      status: asText(task.status) || 'pending',
      priority: asText(task.priority) || 'medium',
      tags: parseUnknownList(task.tags),
      due_date: asText(task.due_date),
      task_template: asText(task.task_template),
      thumbnail_blur_hash: asText(task.thumbnail_blur_hash),
      description: asText(task.description),
    })
    setThumbnailDataUrl(asText(task.thumbnail_url).trim() || null)
    setThumbnailFileName('')
    setExtraFields(buildExtraFieldState(task))
    setShowMoreFields(false)
    void loadData(task)
  }, [open, task])

  useEffect(() => {
    if (open) return
    setThumbnailFileName('')
    setExtraFields({})
  }, [open])

  async function loadData(currentTask: any) {
    try {
      const supabase = createClient()
      const [departmentsResult, usersResult, statusesResult, tagsResult] = await Promise.all([
        supabase
          .from('departments')
          .select('id, name, code')
          .order('name'),
        supabase.from('profiles').select('id, display_name, full_name, email').order('full_name'),
        listStatusNames('task'),
        listTagNames(),
      ])

      if (departmentsResult.error) throw departmentsResult.error
      if (usersResult.error) throw usersResult.error

      setDepartments(departmentsResult.data || [])
      setUsers(usersResult.data || [])
      setStatusNames(uniqueSorted(statusesResult))
      setTagNames(uniqueSorted(tagsResult))
    } catch (loadError) {
      console.error('Failed to load task edit options:', loadError)
      setDepartments([])
      setUsers([])
      setStatusNames([])
      setTagNames([])
    }

    const directLabel = asText(currentTask.project_label).trim()
    if (directLabel) {
      setProjectLabel(directLabel)
      return
    }

    const projectId = asText(currentTask.project_id).trim()
    if (!projectId) {
      setProjectLabel('')
      return
    }

    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('projects')
        .select('name, code')
        .eq('id', projectId)
        .maybeSingle()
      setProjectLabel(data?.code || data?.name || projectId)
    } catch {
      setProjectLabel(projectId)
    }
  }

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
    if (!task?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await updateTask(task.id, {
        department: formData.department || null,
        assigned_to: formData.assigned_to || null,
        reviewer: formData.reviewer,
        ayon_assignees: formData.ayon_assignees,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        status: formData.status,
        priority: formData.priority,
        tags: formData.tags,
        due_date: formData.due_date || null,
        task_template: formData.task_template || null,
        thumbnail_url: thumbnailDataUrl || null,
        thumbnail_blur_hash: formData.thumbnail_blur_hash || null,
        description: formData.description || null,
        ...extraFields,
      })

      if (result.error) throw new Error(result.error)

      onOpenChange(false)
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to update task')
    } finally {
      setIsLoading(false)
    }
  }

  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden border-zinc-800 bg-zinc-950 p-0 text-zinc-100"
      >
        <form onSubmit={handleSubmit} className="flex max-h-[90vh] flex-col">
          <div className="border-b border-zinc-800 px-6 py-4">
            <DialogTitle className="whitespace-nowrap text-2xl font-semibold leading-tight text-zinc-100">
              Edit Task
            </DialogTitle>
            <DialogDescription className="sr-only">
              Update task details and assignment.
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="task_name" className={labelClass}>
                Task Name:
              </Label>
              <Input id="task_name" value={asText(task.name)} readOnly className={inputClass} />
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="task_entity" className={labelClass}>
                Link:
              </Label>
              <Input id="task_entity" value={asText(task.entity_display)} readOnly className={inputClass} />
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="department" className={labelClass}>
                Pipeline Step:
              </Label>
              <Select
                value={formData.department || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, department: value === 'none' ? '' : value })
                }
                disabled={isLoading}
              >
                <SelectTrigger id="department" className={selectClass}>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select department</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id.toString()}>
                      {asText(department.code).trim() ||
                        asText(department.name).trim() ||
                        asText(department.id)}
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
                onValueChange={(value) => {
                  const nextAssignedTo = value === 'none' ? '' : value
                  setFormData((prev) => {
                    const shouldSyncAyon =
                      prev.ayon_assignees.length === 0 ||
                      (prev.assigned_to &&
                        prev.ayon_assignees.length === 1 &&
                        prev.ayon_assignees[0] === prev.assigned_to)
                    return {
                      ...prev,
                      assigned_to: nextAssignedTo,
                      ayon_assignees: shouldSyncAyon
                        ? nextAssignedTo
                          ? [nextAssignedTo]
                          : []
                        : prev.ayon_assignees,
                    }
                  })
                }}
                disabled={isLoading}
              >
                <SelectTrigger id="assigned_to" className={selectClass}>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {asText(user.display_name).trim() || user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="reviewer" className={labelClass}>
                Reviewer:
              </Label>
              <MultiSelectDropdown
                id="reviewer"
                values={formData.reviewer}
                options={userOptions}
                placeholder="Select reviewers"
                disabled={isLoading}
                onChange={(nextReviewer) =>
                  setFormData({ ...formData, reviewer: nextReviewer })
                }
              />
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="ayon_assignees" className={labelClass}>
                Ayon Assignees:
              </Label>
              <MultiSelectDropdown
                id="ayon_assignees"
                values={formData.ayon_assignees}
                options={userOptions}
                placeholder="Select Ayon assignees"
                disabled={isLoading}
                onChange={(nextAyonAssignees) =>
                  setFormData({ ...formData, ayon_assignees: nextAyonAssignees })
                }
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
                <ChevronDown className={`h-4 w-4 transition ${showMoreFields ? 'rotate-180' : ''}`} />
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
                    onChange={(e) => setFormData({ ...formData, task_template: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    'ayon_assignees',
                    'department',
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
                {isLoading ? 'Saving...' : 'Save Task'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
