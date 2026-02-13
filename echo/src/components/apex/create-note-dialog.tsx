'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X } from 'lucide-react'
import { createNote } from '@/actions/notes'
import { uploadNoteAttachment } from '@/actions/attachments'
import { createClient } from '@/lib/supabase/client'
import { listStatusNames } from '@/lib/status/options'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
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

interface CreateNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  defaultEntityType?: '' | 'asset' | 'shot' | 'sequence' | 'task' | 'version'
  defaultEntityId?: string | number
  defaultTaskId?: string | number
  lockEntity?: boolean
}

const ENTITY_TYPES = [
  { value: 'asset', label: 'Asset' },
  { value: 'shot', label: 'Shot' },
  { value: 'sequence', label: 'Sequence' },
  { value: 'task', label: 'Task' },
  { value: 'version', label: 'Version' },
]

const labelClass = 'pt-2 text-sm font-medium text-zinc-300'
const inputClass =
  'border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-400 focus:border-sky-500 focus:ring-sky-500/30'
const selectClass = 'w-full border-zinc-700 bg-zinc-900 text-zinc-100 focus:border-sky-500 focus:ring-sky-500/30'
const STATUS_FALLBACK_VALUES = ['open', 'pending', 'review', 'closed']

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

export function CreateNoteDialog({
  open,
  onOpenChange,
  projectId,
  defaultEntityType,
  defaultEntityId,
  defaultTaskId,
  lockEntity = false,
}: CreateNoteDialogProps) {
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
  const [extraFields, setExtraFields] = useState<Record<string, any>>({})
  const [showMoreFields, setShowMoreFields] = useState(false)

  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    entity_type: (defaultEntityType ?? '') as '' | 'asset' | 'shot' | 'sequence' | 'task' | 'version',
    entity_id: defaultEntityId ? String(defaultEntityId) : '',
    task_id: defaultTaskId ? String(defaultTaskId) : '',
    status: 'open',
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

  useEffect(() => {
    if (!open) return
    setShowMoreFields(false)
    loadData()
  }, [open, projectId])

  useEffect(() => {
    if (!open) return
    setFormData((prev) => ({
      ...prev,
      entity_type: (defaultEntityType ?? prev.entity_type) as '' | 'asset' | 'shot' | 'sequence' | 'task' | 'version',
      entity_id: defaultEntityId ? String(defaultEntityId) : prev.entity_id,
      task_id: defaultTaskId ? String(defaultTaskId) : prev.task_id,
    }))
  }, [open, defaultEntityType, defaultEntityId, defaultTaskId])

  async function loadData() {
    const supabase = createClient()

    const [
      assetsResult,
      shotsResult,
      tasksResult,
      sequencesResult,
      versionsResult,
      statuses,
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
        .from('tasks')
        .select('id, name, entity_type, entity_id')
        .eq('project_id', projectId)
        .order('name'),
      supabase
        .from('sequences')
        .select('id, name, code')
        .eq('project_id', projectId)
        .order('code'),
      supabase
        .from('versions')
        .select('id, code, version_number, entity_type, entity_id')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),
      listStatusNames('note'),
    ])

    setAssets(assetsResult.data || [])
    setShots(shotsResult.data || [])
    setTasks(tasksResult.data || [])
    setSequences(sequencesResult.data || [])
    setVersions(versionsResult.data || [])
    setStatusNames(uniqueSorted(statuses))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!formData.content.trim()) {
      setError('Please enter note content')
      setIsLoading(false)
      return
    }

    try {
      const result = await createNote({
        project_id: projectId,
        subject: formData.subject || undefined,
        content: formData.content,
        entity_type: formData.entity_type || undefined,
        entity_id: formData.entity_id || undefined,
        task_id: formData.task_id || undefined,
        status: formData.status || 'open',
        f_to: parseList(formData.f_to),
        note_type: formData.note_type || null,
        links: parseList(formData.links),
        ...extraFields,
      })

      if (result.error) throw new Error(result.error)

      if (selectedFiles.length > 0 && result.data?.id) {
        for (const file of selectedFiles) {
          const attachResult = await uploadNoteAttachment(file, result.data.id.toString())
          if (attachResult.error) {
            console.error('Error uploading attachment:', attachResult.error)
          }
        }
      }

      setFormData({
        subject: '',
        content: '',
        entity_type: defaultEntityType ?? '',
        entity_id: defaultEntityId ? String(defaultEntityId) : '',
        task_id: defaultTaskId ? String(defaultTaskId) : '',
        status: 'open',
        f_to: '',
        note_type: '',
        links: '',
      })
      setSelectedFiles([])
      setExtraFields({})
      setShowMoreFields(false)
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note')
    } finally {
      setIsLoading(false)
    }
  }

  const entityType = formData.entity_type as string
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] w-full max-w-4xl overflow-hidden border-zinc-800 bg-zinc-950 p-0 text-zinc-100"
      >
        <form onSubmit={handleSubmit} className="flex max-h-[90vh] flex-col">
          <div className="border-b border-zinc-800 px-6 py-4">
            <DialogTitle className="whitespace-nowrap text-2xl font-semibold leading-tight text-zinc-100">
              Create a new Note
            </DialogTitle>
            <DialogDescription className="sr-only">
              Create a new note and attach files if needed.
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
              <div className="rounded-sm border border-zinc-800 bg-zinc-900/30 p-3">
                <div className="mb-3 flex items-center justify-between border-b border-zinc-800 pb-2">
                  <div className="flex items-center gap-4 text-sm text-zinc-300">
                    <button type="button" className="flex items-center gap-1 text-sky-400">
                      <Upload className="h-4 w-4" />
                      Upload
                    </button>
                  </div>
                  <button type="button" className="text-zinc-400 hover:text-zinc-100">
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
                        className="flex items-center gap-2 rounded-sm border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
                      >
                        <span>{file.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedFiles(selectedFiles.filter((_, fileIndex) => fileIndex !== index))
                          }
                          className="text-zinc-400 hover:text-zinc-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="mt-3 text-sm text-zinc-400">
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
                className="text-sm text-zinc-300 transition hover:text-zinc-100"
              >
                {showMoreFields ? 'Hide more fields...' : 'More fields...'}
              </button>
            </div>

            {showMoreFields && (
              <div className="space-y-4 rounded-md border border-zinc-800 bg-zinc-900/30 p-4">
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
                  <Label htmlFor="entity_type" className={labelClass}>
                    Link To:
                  </Label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Select
                      value={formData.entity_type || 'none'}
                      onValueChange={(value: any) => {
                        const nextType = value === 'none' ? '' : value
                        setFormData({ ...formData, entity_type: nextType, entity_id: '', task_id: '' })
                      }}
                      disabled={isLoading || lockEntity}
                    >
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
                      <Select
                        value={formData.entity_id || 'none'}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            entity_id: value === 'none' ? '' : value,
                            task_id: '',
                          })
                        }
                        disabled={isLoading || lockEntity}
                      >
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
                      <div className="flex h-9 items-center rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-400">
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
                {isLoading ? 'Creating...' : 'Create Note'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
