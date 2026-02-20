'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { createPublishedFile } from '@/actions/published-files'
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

interface CreatePublishedFileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  defaultEntityType?: 'shot' | 'sequence' | 'asset' | 'task' | 'version' | 'note' | 'project'
  defaultEntityId?: string | number
  defaultTaskId?: string | number
  defaultVersionId?: string | number
  lockEntity?: boolean
}

const DEFAULT_STATUS_VALUES = ['pending', 'ip', 'review', 'approved', 'on_hold']

const labelClass = 'pt-2 text-sm font-semibold text-foreground/80'
const inputClass =
  'border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:ring-sky-500/30'
const selectClass = 'w-full border-border bg-card text-foreground focus:border-sky-500 focus:ring-sky-500/30'

type MultiSelectOption = {
  value: string
  label: string
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b))
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
          <span className="truncate text-left">{values.length > 0 ? values.join(', ') : placeholder}</span>
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

export function CreatePublishedFileDialog({
  open,
  onOpenChange,
  projectId,
  defaultEntityType,
  defaultEntityId,
  defaultTaskId,
  defaultVersionId,
  lockEntity = false,
}: CreatePublishedFileDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projectLabel, setProjectLabel] = useState(projectId)
  const [showMoreFields, setShowMoreFields] = useState(false)
  const [assets, setAssets] = useState<any[]>([])
  const [shots, setShots] = useState<any[]>([])
  const [sequences, setSequences] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [versions, setVersions] = useState<any[]>([])
  const [statusNames, setStatusNames] = useState<string[]>([])
  const [tagNames, setTagNames] = useState<string[]>([])
  const [extraFields, setExtraFields] = useState<Record<string, any>>({})
  const [formData, setFormData] = useState<{
    code: string
    name: string
    description: string
    status: string
    file_type: string
    file_path: string
    link: string
    entity_type: '' | 'shot' | 'sequence' | 'asset' | 'task' | 'version' | 'note' | 'project'
    entity_id: string
    task_id: string
    version_id: string
    tags: string[]
  }>({
    code: '',
    name: '',
    description: '',
    status: 'pending',
    file_type: '',
    file_path: '',
    link: '',
    entity_type: defaultEntityType ?? '',
    entity_id: defaultEntityId ? String(defaultEntityId) : '',
    task_id: defaultTaskId ? String(defaultTaskId) : '',
    version_id: defaultVersionId ? String(defaultVersionId) : '',
    tags: [],
  })

  useEffect(() => {
    if (!open) return
    setShowMoreFields(false)
    loadData()
    setFormData((prev) => ({
      ...prev,
      entity_type: defaultEntityType ?? '',
      entity_id: defaultEntityId ? String(defaultEntityId) : '',
      task_id: defaultTaskId ? String(defaultTaskId) : '',
      version_id: defaultVersionId ? String(defaultVersionId) : '',
      tags: [],
    }))
  }, [open, defaultEntityType, defaultEntityId, defaultTaskId, defaultVersionId, projectId])

  async function loadData() {
    const supabase = createClient()

    const [
      { data: assetsData },
      { data: shotsData },
      { data: sequencesData },
      { data: notesData },
      { data: tasksData },
      { data: versionsData },
      { data: projectData },
      statuses,
      tags,
    ] = await Promise.all([
      supabase
        .from('assets')
        .select('id, name, code')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('name'),
      supabase
        .from('shots')
        .select('id, name, code')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('code'),
      supabase
        .from('sequences')
        .select('id, name, code')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('code'),
      supabase
        .from('notes')
        .select('id, subject')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200),
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

    setAssets(assetsData || [])
    setShots(shotsData || [])
    setSequences(sequencesData || [])
    setNotes(notesData || [])
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
    const currentStatus = formData.status.trim()
    if (currentStatus) values.add(currentStatus)
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

  const entities =
    formData.entity_type === 'asset'
      ? assets
      : formData.entity_type === 'shot'
        ? shots
        : formData.entity_type === 'sequence'
          ? sequences
          : formData.entity_type === 'note'
            ? notes
            : formData.entity_type === 'task'
              ? tasks
              : formData.entity_type === 'version'
                ? versions
                : []

  const filteredTasks =
    formData.entity_type && formData.entity_type !== 'task' && formData.entity_id
      ? tasks.filter(
          (task) =>
            task.entity_type === formData.entity_type &&
            task.entity_id === Number(formData.entity_id)
        )
      : []

  const filteredVersions =
    formData.entity_type && formData.entity_type !== 'version' && formData.entity_id
      ? versions.filter(
          (version) =>
            version.entity_type === formData.entity_type &&
            version.entity_id === Number(formData.entity_id)
        )
      : []

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (!formData.code.trim()) {
        throw new Error('Published File Name is required')
      }
      if (!formData.entity_type) {
        throw new Error('Please select Entity Type in More fields')
      }
      if (!formData.entity_id) {
        throw new Error('Please select Entity in More fields')
      }
      if (!formData.file_path && !formData.link) {
        throw new Error('Please provide Path (or Link) in More fields')
      }

      const result = await createPublishedFile({
        project_id: projectId,
        code: formData.code.trim(),
        name: formData.name || undefined,
        description: formData.description || undefined,
        status: formData.status || undefined,
        file_type: formData.file_type || undefined,
        file_path: formData.file_path || undefined,
        link: formData.link || undefined,
        entity_type: formData.entity_type as any,
        entity_id: formData.entity_id,
        task_id: formData.task_id || undefined,
        version_id: formData.version_id || undefined,
        tags: formData.tags,
        ...extraFields,
      })

      if (result.error) throw new Error(result.error)

      setFormData({
        code: '',
        name: '',
        description: '',
        status: 'pending',
        file_type: '',
        file_path: '',
        link: '',
        entity_type: defaultEntityType ?? '',
        entity_id: defaultEntityId ? String(defaultEntityId) : '',
        task_id: defaultTaskId ? String(defaultTaskId) : '',
        version_id: defaultVersionId ? String(defaultVersionId) : '',
        tags: [],
      })
      setExtraFields({})
      setShowMoreFields(false)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create published file')
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
              Create a new Published File
            </DialogTitle>
            <DialogDescription className="sr-only">
              Create a new published file and link it to an entity.
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
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                disabled={isLoading}
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
                    <Label htmlFor="published-file-type" className="text-sm font-medium text-foreground/70">
                      File Type
                    </Label>
                    <Input
                      id="published-file-type"
                      value={formData.file_type}
                      onChange={(e) =>
                        setFormData({ ...formData, file_type: e.target.value })
                      }
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[130px_1fr] items-start gap-3">
                  <Label htmlFor="published-tags" className={labelClass}>
                    Tags:
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
                  <Label htmlFor="published-entity-type" className={labelClass}>
                    Entity Type:
                  </Label>
                  <Select
                    value={formData.entity_type || 'none'}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        entity_type: value === 'none' ? '' : (value as any),
                        entity_id: value === 'project' ? projectId : '',
                        task_id: '',
                        version_id: '',
                      })
                    }
                    disabled={isLoading || lockEntity}
                  >
                    <SelectTrigger id="published-entity-type" className={selectClass}>
                      <SelectValue placeholder="Select entity type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select entity type</SelectItem>
                      <SelectItem value="shot">Shot</SelectItem>
                      <SelectItem value="sequence">Sequence</SelectItem>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                      <SelectItem value="version">Version</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-[130px_1fr] items-start gap-3">
                  <Label htmlFor="published-entity-id" className={labelClass}>
                    Entity:
                  </Label>
                  <Select
                    value={formData.entity_id || 'none'}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        entity_id: value === 'none' ? '' : value,
                        task_id: '',
                        version_id: '',
                      })
                    }
                    disabled={
                      isLoading ||
                      lockEntity ||
                      !formData.entity_type ||
                      formData.entity_type === 'project'
                    }
                  >
                    <SelectTrigger id="published-entity-id" className={selectClass}>
                      <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select entity</SelectItem>
                      {entities.map((entity) => (
                        <SelectItem key={entity.id} value={String(entity.id)}>
                          {entity.code
                            ? `${entity.code}${entity.name ? ` - ${entity.name}` : ''}`
                            : entity.subject || entity.name || `#${entity.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      disabled={isLoading || !formData.entity_id || formData.entity_type === 'task'}
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
                      disabled={isLoading || !formData.entity_id}
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
                    'file_type',
                    'file_path',
                    'link',
                    'version_number',
                    'task_id',
                    'version_id',
                    'tags',
                    'thumbnail_url',
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
                {isLoading ? 'Creating...' : 'Create Published File'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
