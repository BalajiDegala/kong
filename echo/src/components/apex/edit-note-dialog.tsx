'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Upload, X } from 'lucide-react'
import { updateNote } from '@/actions/notes'
import { uploadNoteAttachment } from '@/actions/attachments'
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

interface EditNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  note: any
}

const ENTITY_TYPES = [
  { value: 'asset', label: 'Asset' },
  { value: 'shot', label: 'Shot' },
  { value: 'sequence', label: 'Sequence' },
  { value: 'task', label: 'Task' },
  { value: 'version', label: 'Version' },
]

const labelClass = 'pt-2 text-sm font-medium text-foreground/70'
const inputClass =
  'border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:ring-sky-500/30'
const selectClass =
  'w-full border-border bg-card text-foreground focus:border-sky-500 focus:ring-sky-500/30'
const STATUS_FALLBACK_VALUES = ['open', 'pending', 'review', 'closed']

type MultiSelectOption = {
  value: string
  label: string
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseUnknownList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
  }
  if (typeof value === 'string') return parseList(value)
  return []
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  )
}

function buildExtraFieldState(note: any): Record<string, unknown> {
  if (!note) return {}

  const exclude = new Set([
    'id',
    'project_id',
    'subject',
    'content',
    'status',
    'tags',
    'entity_type',
    'entity_id',
    'task_id',
    'f_to',
    'note_type',
    'links',
    'author_id',
    'created_by',
    'updated_by',
    'created_at',
    'updated_at',
    'created_by_profile',
    'attachments',
    'attachment_rows',
    'attachments_count',
    'attachments_display',
    'attachments_preview_url',
    'author_label',
    'link_label',
    'link_url',
    'entity_label',
    'entity_url',
    'note_url',
    'note_link_label',
    'task_label',
    'task_url',
    'links_label',
    'links_full_label',
    'links_url',
    'links_resolved',
    'project_label',
  ])

  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(note)) {
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

export function EditNoteDialog({ open, onOpenChange, projectId, note }: EditNoteDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [shots, setShots] = useState<any[]>([])
  const [sequences, setSequences] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [versions, setVersions] = useState<any[]>([])
  const [statusNames, setStatusNames] = useState<string[]>([])
  const [tagNames, setTagNames] = useState<string[]>([])
  const [extraFields, setExtraFields] = useState<Record<string, unknown>>({})
  const [showMoreFields, setShowMoreFields] = useState(false)

  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    entity_type: '' as '' | 'asset' | 'shot' | 'sequence' | 'task' | 'version',
    entity_id: '',
    task_id: '',
    status: 'open',
    tags: [] as string[],
    f_to: '',
    note_type: '',
    links: '',
  })

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

  useEffect(() => {
    if (!open || !note) return

    const nextEntityType = asText(note.entity_type).trim()
    setFormData({
      subject: asText(note.subject),
      content: asText(note.content),
      entity_type:
        nextEntityType === 'asset' ||
        nextEntityType === 'shot' ||
        nextEntityType === 'sequence' ||
        nextEntityType === 'task' ||
        nextEntityType === 'version'
          ? nextEntityType
          : '',
      entity_id: asText(note.entity_id),
      task_id: asText(note.task_id),
      status: asText(note.status) || 'open',
      tags: parseUnknownList(note.tags),
      f_to: parseUnknownList(note.f_to).join(', '),
      note_type: asText(note.note_type),
      links: parseUnknownList(note.links).join(', '),
    })
    setExtraFields(buildExtraFieldState(note))
    setSelectedFiles([])
    setShowMoreFields(false)
    void loadData()
  }, [open, note, projectId])

  async function loadData() {
    const supabase = createClient()

    const [
      assetsResult,
      shotsResult,
      tasksResult,
      sequencesResult,
      versionsResult,
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
        .from('tasks')
        .select('id, name, entity_type, entity_id')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('name'),
      supabase
        .from('sequences')
        .select('id, name, code')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('code'),
      supabase
        .from('versions')
        .select('id, code, version_number, entity_type, entity_id')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      listStatusNames('note'),
      listTagNames(),
    ])

    setAssets(assetsResult.data || [])
    setShots(shotsResult.data || [])
    setTasks(tasksResult.data || [])
    setSequences(sequencesResult.data || [])
    setVersions(versionsResult.data || [])
    setStatusNames(uniqueSorted(statuses))
    setTagNames(uniqueSorted(tags))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!note?.id) return

    setIsLoading(true)
    setError(null)

    if (!formData.content.trim()) {
      setError('Please enter note content')
      setIsLoading(false)
      return
    }

    try {
      const result = await updateNote(note.id.toString(), {
        subject: formData.subject || undefined,
        content: formData.content,
        status: formData.status || 'open',
        tags: formData.tags,
        f_to: parseList(formData.f_to),
        note_type: formData.note_type || null,
        links: parseList(formData.links),
        ...extraFields,
      })

      if (result.error) throw new Error(result.error)

      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const attachResult = await uploadNoteAttachment(file, note.id.toString())
          if (attachResult.error) {
            console.error('Error uploading attachment:', attachResult.error)
          }
        }
      }

      onOpenChange(false)
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to update note')
    } finally {
      setIsLoading(false)
    }
  }

  const entityType = formData.entity_type
  const entities =
    entityType === 'asset'
      ? assets
      : entityType === 'shot'
        ? shots
        : entityType === 'task'
          ? tasks
          : entityType === 'sequence'
            ? sequences
            : entityType === 'version'
              ? versions
              : []

  if (!note) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] w-full max-w-4xl overflow-hidden border-border bg-background p-0 text-foreground"
      >
        <form onSubmit={handleSubmit} className="flex max-h-[90vh] flex-col">
          <div className="border-b border-border px-6 py-4">
            <DialogTitle className="whitespace-nowrap text-2xl font-semibold leading-tight text-foreground">
              Edit Note
            </DialogTitle>
            <DialogDescription className="sr-only">
              Edit note details and attachments.
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-[95px_1fr] items-start gap-3">
              <Label htmlFor="links" className={labelClass}>
                Links:
              </Label>
              <Input
                id="links"
                value={formData.links}
                onChange={(e) => setFormData({ ...formData, links: e.target.value })}
                placeholder="Comma separated links or references"
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[95px_1fr] items-start gap-3">
              <div />
              <div className="rounded-sm border border-border bg-card/30 p-3">
                <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-4 text-sm text-foreground/70">
                    <button type="button" className="flex items-center gap-1 text-sky-400">
                      <Upload className="h-4 w-4" />
                      Upload
                    </button>
                  </div>
                  <button type="button" className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <Input
                  id="attachments"
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    setSelectedFiles(files)
                  }}
                  disabled={isLoading}
                  className={inputClass}
                />

                {selectedFiles.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center gap-2 rounded-sm border border-border bg-accent px-2 py-1 text-xs text-foreground/80"
                      >
                        <span>{file.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedFiles(selectedFiles.filter((_, fileIndex) => fileIndex !== index))
                          }
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="mt-3 text-sm text-muted-foreground">
                  [+] Add more files, or drag and drop!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[95px_1fr] items-start gap-3">
              <Label htmlFor="f_to" className={labelClass}>
                To:
              </Label>
              <Input
                id="f_to"
                value={formData.f_to}
                onChange={(e) => setFormData({ ...formData, f_to: e.target.value })}
                placeholder="Comma separated recipients"
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[95px_1fr] items-start gap-3">
              <Label htmlFor="subject" className={labelClass}>
                Subject:
              </Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Note subject"
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[95px_1fr] items-start gap-3">
              <Label htmlFor="note_type" className={labelClass}>
                Type:
              </Label>
              <Input
                id="note_type"
                value={formData.note_type}
                onChange={(e) => setFormData({ ...formData, note_type: e.target.value })}
                placeholder="Note type"
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div className="pl-[95px]">
              <button
                type="button"
                onClick={() => setShowMoreFields((prev) => !prev)}
                className="text-sm text-foreground/70 transition hover:text-foreground"
              >
                {showMoreFields ? 'Hide more fields...' : 'More fields...'}
              </button>
            </div>

            {showMoreFields && (
              <div className="space-y-4 rounded-md border border-border bg-card/30 p-4">
                <div className="grid grid-cols-[95px_1fr] items-start gap-3">
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

                <div className="grid grid-cols-[95px_1fr] items-start gap-3">
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

                <div className="grid grid-cols-[95px_1fr] items-start gap-3">
                  <Label htmlFor="entity_type" className={labelClass}>
                    Link To:
                  </Label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Select value={formData.entity_type || 'none'} disabled>
                      <SelectTrigger id="entity_type" className={selectClass}>
                        <SelectValue placeholder="Entity type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {ENTITY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {formData.entity_type ? (
                      <Select value={formData.entity_id || 'none'} disabled>
                        <SelectTrigger className={selectClass}>
                          <SelectValue placeholder="Select entity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {entities.map((entity) => (
                            <SelectItem key={entity.id} value={entity.id.toString()}>
                              {entity.code
                                ? `${entity.code}${entity.version_number ? ` v${entity.version_number}` : ''}${entity.name ? ` - ${entity.name}` : ''}`
                                : entity.name || `#${entity.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex h-9 items-center rounded-md border border-border bg-card px-3 text-sm text-muted-foreground">
                        Select an entity type first
                      </div>
                    )}
                  </div>
                </div>

                {formData.entity_id && formData.entity_type !== 'task' && (
                  <div className="grid grid-cols-[95px_1fr] items-start gap-3">
                    <Label htmlFor="task_id" className={labelClass}>
                      Task:
                    </Label>
                    <Select value={formData.task_id || 'none'} disabled>
                      <SelectTrigger id="task_id" className={selectClass}>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {tasks
                          .filter(
                            (task) =>
                              task.entity_type === formData.entity_type &&
                              task.entity_id === Number.parseInt(formData.entity_id, 10)
                          )
                          .map((task) => (
                            <SelectItem key={task.id} value={task.id.toString()}>
                              {task.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <SchemaExtraFields
                  entity="note"
                  values={extraFields}
                  onChange={setExtraFields}
                  disabled={isLoading}
                  title="More schema fields"
                  excludeColumns={new Set([
                    'subject',
                    'content',
                    'status',
                    'tags',
                    'entity_type',
                    'entity_id',
                    'task_id',
                    'thumbnail_url',
                    'links',
                    'f_to',
                    'note_type',
                  ])}
                />
              </div>
            )}

            <div className="grid grid-cols-[95px_1fr] items-start gap-3">
              <Label htmlFor="content" className={labelClass}>
                Note:
              </Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your note..."
                rows={7}
                required
                disabled={isLoading}
                className={inputClass}
              />
            </div>
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
                {isLoading ? 'Saving...' : 'Save Note'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
