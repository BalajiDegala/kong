'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { updatePublishedFile } from '@/actions/published-files'
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

interface EditPublishedFileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  publishedFile: any
}

type MultiSelectOption = {
  value: string
  label: string
}

const DEFAULT_STATUS_VALUES = ['pending', 'ip', 'review', 'approved', 'on_hold']

const labelClass = 'pt-2 text-sm font-semibold text-foreground/80'
const inputClass =
  'border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:ring-sky-500/30'
const selectClass =
  'w-full border-border bg-card text-foreground focus:border-sky-500 focus:ring-sky-500/30'

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

function buildExtraFieldState(publishedFile: any): Record<string, unknown> {
  if (!publishedFile) return {}

  const exclude = new Set([
    'id',
    'project_id',
    'code',
    'name',
    'description',
    'status',
    'file_type',
    'file_path',
    'link',
    'entity_type',
    'entity_id',
    'task_id',
    'task',
    'task_label',
    'version_id',
    'version',
    'version_label',
    'version_number',
    'tags',
    'thumbnail_url',
    'project',
    'project_label',
    'published_by',
    'published_by_profile',
    'created_by_label',
    'created_at',
    'updated_at',
    'created_by',
    'updated_by',
  ])

  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(publishedFile)) {
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
              ? 'cursor-not-allowed border-border bg-card/50 text-muted-foreground'
              : 'border-border bg-card text-foreground hover:border-border'
          }`}
        >
          <span className="truncate text-left">
            {values.length > 0 ? values.join(', ') : placeholder}
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

export function EditPublishedFileDialog({
  open,
  onOpenChange,
  projectId,
  publishedFile,
}: EditPublishedFileDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMoreFields, setShowMoreFields] = useState(false)
  const [projectLabel, setProjectLabel] = useState(projectId)
  const [tasks, setTasks] = useState<any[]>([])
  const [versions, setVersions] = useState<any[]>([])
  const [statusNames, setStatusNames] = useState<string[]>([])
  const [tagNames, setTagNames] = useState<string[]>([])
  const [extraFields, setExtraFields] = useState<Record<string, unknown>>({})

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    status: 'pending',
    file_type: '',
    file_path: '',
    link: '',
    task_id: '',
    version_id: '',
    version_number: '',
    tags: [] as string[],
    entity_type: '',
    entity_id: '',
  })

  useEffect(() => {
    if (!open || !publishedFile) return

    setFormData({
      code: asText(publishedFile.code),
      name: asText(publishedFile.name),
      description: asText(publishedFile.description),
      status: asText(publishedFile.status) || 'pending',
      file_type: asText(publishedFile.file_type),
      file_path: asText(publishedFile.file_path),
      link: asText(publishedFile.link || publishedFile.file_path),
      task_id: asText(publishedFile.task_id),
      version_id: asText(publishedFile.version_id),
      version_number: asText(publishedFile.version_number),
      tags: parseUnknownList(publishedFile.tags),
      entity_type: asText(publishedFile.entity_type),
      entity_id: asText(publishedFile.entity_id),
    })
    setExtraFields(buildExtraFieldState(publishedFile))
    setError(null)
    setShowMoreFields(false)
    void loadData()
  }, [open, projectId, publishedFile])

  async function loadData() {
    const supabase = createClient()
    const [{ data: tasksData }, { data: versionsData }, { data: projectData }, statuses, tags] =
      await Promise.all([
        supabase
          .from('tasks')
          .select('id, name, entity_type, entity_id')
          .eq('project_id', projectId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        supabase
          .from('versions')
          .select('id, code, version_number, entity_type, entity_id')
          .eq('project_id', projectId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        supabase
          .from('projects')
          .select('name, code')
          .eq('id', projectId)
          .is('deleted_at', null)
          .maybeSingle(),
        listStatusNames('published_file'),
        listTagNames(),
      ])

    setTasks(tasksData || [])
    setVersions(versionsData || [])
    setProjectLabel(projectData?.code || projectData?.name || projectId)
    setStatusNames(uniqueSorted(statuses))
    setTagNames(uniqueSorted(tags))
  }

  const statusOptions = useMemo(() => {
    const values = new Set<string>(DEFAULT_STATUS_VALUES)
    for (const status of statusNames) {
      const normalized = status.trim()
      if (normalized) values.add(normalized)
    }
    const current = formData.status.trim()
    if (current) values.add(current)
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value }))
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

  const filteredTasks =
    formData.entity_type && formData.entity_type !== 'task' && formData.entity_id
      ? tasks.filter(
          (task) =>
            task.entity_type === formData.entity_type &&
            task.entity_id === Number(formData.entity_id)
        )
      : tasks

  const filteredVersions =
    formData.entity_type && formData.entity_type !== 'version' && formData.entity_id
      ? versions.filter(
          (version) =>
            version.entity_type === formData.entity_type &&
            version.entity_id === Number(formData.entity_id)
        )
      : versions

  const linkedEntityLabel = useMemo(() => {
    if (!formData.entity_type || !formData.entity_id) return 'Unlinked'
    if (formData.entity_type === 'project') return projectLabel
    if (formData.entity_type === 'task') {
      const task = tasks.find((item) => asText(item.id) === formData.entity_id)
      return task ? task.name : `task #${formData.entity_id}`
    }
    if (formData.entity_type === 'version') {
      const version = versions.find((item) => asText(item.id) === formData.entity_id)
      if (version) {
        return `${version.code || `#${version.id}`}${version.version_number ? ` v${version.version_number}` : ''}`
      }
      return `version #${formData.entity_id}`
    }
    return `${formData.entity_type} #${formData.entity_id}`
  }, [formData.entity_id, formData.entity_type, projectLabel, tasks, versions])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!publishedFile?.id) return
    setIsLoading(true)
    setError(null)

    try {
      if (!formData.file_path.trim() && !formData.link.trim()) {
        throw new Error('Please provide Path (or Link)')
      }

      const result = await updatePublishedFile(
        String(publishedFile.id),
        {
          name: toNullableText(formData.name),
          description: toNullableText(formData.description),
          status: toNullableText(formData.status),
          file_type: toNullableText(formData.file_type),
          file_path: toNullableText(formData.file_path),
          link: toNullableText(formData.link),
          task_id: toNullableNumber(formData.task_id),
          version_id: toNullableNumber(formData.version_id),
          version_number: toNullableNumber(formData.version_number),
          tags: formData.tags,
          ...extraFields,
        },
        { projectId }
      )

      if (result.error) throw new Error(result.error)

      onOpenChange(false)
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to update published file')
    } finally {
      setIsLoading(false)
    }
  }

  if (!publishedFile) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden border-border bg-background p-0 text-foreground"
      >
        <form onSubmit={handleSubmit} className="flex max-h-[90vh] flex-col">
          <div className="border-b border-border px-6 py-4">
            <DialogTitle className="whitespace-nowrap text-2xl font-semibold leading-tight text-foreground">
              Edit Published File
            </DialogTitle>
            <DialogDescription className="sr-only">
              Edit published file details.
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-[130px_1fr] items-start gap-3">
              <Label htmlFor="published-code" className={labelClass}>
                Published File Name:
              </Label>
              <Input
                id="published-code"
                value={formData.code}
                readOnly
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[130px_1fr] items-start gap-3">
              <Label htmlFor="published-description" className={labelClass}>
                Description:
              </Label>
              <Textarea
                id="published-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
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
                  <Label htmlFor="published-name" className={labelClass}>
                    Display Name:
                  </Label>
                  <Input
                    id="published-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="published-status" className="text-sm font-medium text-foreground/70">
                      Status
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="published-status" className={selectClass}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="published-tags" className="text-sm font-medium text-foreground/70">
                      Tags
                    </Label>
                    <MultiSelectDropdown
                      id="published-tags"
                      values={formData.tags}
                      options={tagOptions}
                      placeholder="Select tags"
                      disabled={isLoading}
                      onChange={(nextTags) => setFormData({ ...formData, tags: nextTags })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="published-file-type" className="text-sm font-medium text-foreground/70">
                      File Type
                    </Label>
                    <Input
                      id="published-file-type"
                      value={formData.file_type}
                      onChange={(e) => setFormData({ ...formData, file_type: e.target.value })}
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="published-version-number" className="text-sm font-medium text-foreground/70">
                      Version Number
                    </Label>
                    <Input
                      id="published-version-number"
                      value={formData.version_number}
                      onChange={(e) => setFormData({ ...formData, version_number: e.target.value })}
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[130px_1fr] items-start gap-3">
                  <Label htmlFor="published-file-path" className={labelClass}>
                    Path:
                  </Label>
                  <Input
                    id="published-file-path"
                    value={formData.file_path}
                    onChange={(e) => setFormData({ ...formData, file_path: e.target.value })}
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-[130px_1fr] items-start gap-3">
                  <Label htmlFor="published-link" className={labelClass}>
                    Link:
                  </Label>
                  <Input
                    id="published-link"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-[130px_1fr] items-start gap-3">
                  <Label htmlFor="published-entity" className={labelClass}>
                    Entity Link:
                  </Label>
                  <Input
                    id="published-entity"
                    value={linkedEntityLabel}
                    readOnly
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="published-task-id" className="text-sm font-medium text-foreground/70">
                      Task
                    </Label>
                    <Select
                      value={formData.task_id || 'none'}
                      onValueChange={(value) =>
                        setFormData({ ...formData, task_id: value === 'none' ? '' : value })
                      }
                      disabled={isLoading || formData.entity_type === 'task'}
                    >
                      <SelectTrigger id="published-task-id" className={selectClass}>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {filteredTasks.map((task) => (
                          <SelectItem key={task.id} value={String(task.id)}>
                            {task.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="published-version-id" className="text-sm font-medium text-foreground/70">
                      Version
                    </Label>
                    <Select
                      value={formData.version_id || 'none'}
                      onValueChange={(value) =>
                        setFormData({ ...formData, version_id: value === 'none' ? '' : value })
                      }
                      disabled={isLoading}
                    >
                      <SelectTrigger id="published-version-id" className={selectClass}>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {filteredVersions.map((version) => (
                          <SelectItem key={version.id} value={String(version.id)}>
                            {version.code
                              ? `${version.code}${version.version_number ? ` v${version.version_number}` : ''}`
                              : `#${version.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <SchemaExtraFields
                  entity="published_file"
                  values={extraFields}
                  onChange={setExtraFields}
                  disabled={isLoading}
                  title="More schema fields"
                  excludeColumns={new Set([
                    'code',
                    'name',
                    'description',
                    'status',
                    'tags',
                    'file_type',
                    'file_path',
                    'link',
                    'entity_type',
                    'entity_id',
                    'task_id',
                    'version_id',
                    'version_number',
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
                {isLoading ? 'Saving...' : 'Save Published File'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
