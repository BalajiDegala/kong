'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Paperclip } from 'lucide-react'
import { createVersion, uploadVersionFile } from '@/actions/versions'
import { createClient } from '@/lib/supabase/client'
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

interface UploadVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  defaultEntityType?: '' | 'asset' | 'shot' | 'sequence'
  defaultEntityId?: string | number
  defaultTaskId?: string | number
  lockEntity?: boolean
}

const ENTITY_TYPES = [
  { value: 'asset', label: 'Asset' },
  { value: 'shot', label: 'Shot' },
  { value: 'sequence', label: 'Sequence' },
]

const labelClass = 'pt-2 text-sm font-semibold text-zinc-200'
const inputClass =
  'border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-400 focus:border-sky-500 focus:ring-sky-500/30'
const selectClass = 'w-full border-zinc-700 bg-zinc-900 text-zinc-100 focus:border-sky-500 focus:ring-sky-500/30'

export function UploadVersionDialog({
  open,
  onOpenChange,
  projectId,
  defaultEntityType,
  defaultEntityId,
  defaultTaskId,
  lockEntity = false,
}: UploadVersionDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [projectLabel, setProjectLabel] = useState(projectId)
  const [showMoreFields, setShowMoreFields] = useState(false)
  const [extraFields, setExtraFields] = useState<Record<string, any>>({})

  const [assets, setAssets] = useState<any[]>([])
  const [shots, setShots] = useState<any[]>([])
  const [sequences, setSequences] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  const [formData, setFormData] = useState({
    code: '',
    version_number: 1,
    description: '',
    artist_id: '',
    link: '',
    entity_type: (defaultEntityType ?? '') as '' | 'asset' | 'shot' | 'sequence',
    entity_id: defaultEntityId ? String(defaultEntityId) : '',
    task_id: defaultTaskId ? String(defaultTaskId) : '',
  })

  useEffect(() => {
    if (!open) return
    setShowMoreFields(false)
    loadData()
  }, [open, projectId])

  useEffect(() => {
    if (!open) return
    setFormData((prev) => ({
      ...prev,
      entity_type: (defaultEntityType ?? prev.entity_type) as '' | 'asset' | 'shot' | 'sequence',
      entity_id: defaultEntityId ? String(defaultEntityId) : prev.entity_id,
      task_id: defaultTaskId ? String(defaultTaskId) : prev.task_id,
    }))
  }, [open, defaultEntityType, defaultEntityId, defaultTaskId])

  async function loadData() {
    const supabase = createClient()

    const [
      { data: assetsData },
      { data: shotsData },
      { data: sequencesData },
      { data: tasksData },
      { data: usersData },
      { data: projectData },
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
    ])

    setAssets(assetsData || [])
    setShots(shotsData || [])
    setSequences(sequencesData || [])
    setTasks(tasksData || [])
    setUsers(usersData || [])
    setProjectLabel(projectData?.code || projectData?.name || projectId)
  }

  const entities =
    formData.entity_type === 'asset'
      ? assets
      : formData.entity_type === 'shot'
        ? shots
        : formData.entity_type === 'sequence'
          ? sequences
          : []

  const filteredTasks = useMemo(() => {
    if (!formData.entity_type || !formData.entity_id) return tasks
    return tasks.filter(
      (task) =>
        task.entity_type === formData.entity_type &&
        task.entity_id === Number.parseInt(formData.entity_id, 10)
    )
  }, [tasks, formData.entity_type, formData.entity_id])

  const handleFileSelect = (file: File | null) => {
    if (!file) return
    setSelectedFile(file)
    if (!formData.code) {
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, '')
      setFormData((prev) => ({ ...prev, code: nameWithoutExt }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setUploadProgress(0)

    if (!selectedFile) {
      setError('Please upload a movie file')
      setIsLoading(false)
      return
    }
    if (!formData.code.trim()) {
      setError('Version Name is required')
      setIsLoading(false)
      return
    }
    if (!formData.entity_type || !formData.entity_id) {
      setError('Please set Link (Entity Type and Entity) in More fields')
      setIsLoading(false)
      return
    }

    try {
      setUploadProgress(25)
      const uploadResult = await uploadVersionFile(selectedFile, projectId)
      if (uploadResult.error) throw new Error(uploadResult.error)

      setUploadProgress(75)
      const result = await createVersion({
        project_id: projectId,
        entity_type: formData.entity_type,
        entity_id: formData.entity_id,
        task_id: formData.task_id || undefined,
        code: formData.code.trim(),
        version_number: formData.version_number,
        description: formData.description || undefined,
        movie_url: uploadResult.data?.publicUrl,
        file_path: uploadResult.data?.path,
        artist_id: formData.artist_id || null,
        link: formData.link || null,
        uploaded_movie: uploadResult.data?.publicUrl || null,
        ...extraFields,
      })

      if (result.error) throw new Error(result.error)

      setUploadProgress(100)
      setFormData({
        code: '',
        version_number: 1,
        description: '',
        artist_id: '',
        link: '',
        entity_type: defaultEntityType ?? '',
        entity_id: defaultEntityId ? String(defaultEntityId) : '',
        task_id: defaultTaskId ? String(defaultTaskId) : '',
      })
      setSelectedFile(null)
      setExtraFields({})
      setShowMoreFields(false)
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create version')
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
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
              Create Versions
            </DialogTitle>
            <DialogDescription className="sr-only">
              Upload media and create a new version.
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="file" className={labelClass}>
                Uploaded Movie:
              </Label>
              <div>
                <label
                  htmlFor="file"
                  className="flex min-h-24 cursor-pointer items-center justify-center rounded-md border border-dashed border-zinc-700 bg-zinc-900 px-4 py-6 text-center transition hover:border-zinc-500"
                >
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Paperclip className="h-4 w-4" />
                    <span>
                      {selectedFile
                        ? selectedFile.name
                        : 'Drag and drop files here or click to browse'}
                    </span>
                  </div>
                </label>
                <Input
                  id="file"
                  type="file"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  accept="image/*,video/*,.pdf,.zip"
                  disabled={isLoading}
                  className="sr-only"
                />
              </div>
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
              <Label htmlFor="code" className={labelClass}>
                Version Name:
              </Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
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
                <div className="grid grid-cols-[120px_1fr] items-start gap-3">
                  <Label htmlFor="entity_type" className={labelClass}>
                    Entity Type:
                  </Label>
                  <Select
                    value={formData.entity_type || 'none'}
                    onValueChange={(value: any) => {
                      const nextType = value === 'none' ? '' : value
                      setFormData({ ...formData, entity_type: nextType, entity_id: '', task_id: '' })
                    }}
                    disabled={isLoading || lockEntity}
                  >
                    <SelectTrigger id="entity_type" className={selectClass}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select type</SelectItem>
                      {ENTITY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-[120px_1fr] items-start gap-3">
                  <Label htmlFor="entity_id" className={labelClass}>
                    Entity:
                  </Label>
                  <Select
                    value={formData.entity_id || 'none'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, entity_id: value === 'none' ? '' : value })
                    }
                    disabled={isLoading || lockEntity}
                  >
                    <SelectTrigger id="entity_id" className={selectClass}>
                      <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select entity</SelectItem>
                      {entities.map((entity) => (
                        <SelectItem key={entity.id} value={entity.id.toString()}>
                          {entity.code ? `${entity.code} - ${entity.name}` : entity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        version_number: Number.parseInt(e.target.value || '1', 10),
                      })
                    }
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
                    'link',
                    'task_id',
                    'movie_url',
                    'file_path',
                    'uploaded_movie',
                    'frames_path',
                    'thumbnail_url',
                  ])}
                />
              </div>
            )}

            {uploadProgress > 0 ? (
              <div className="grid gap-2">
                <div className="h-2 w-full rounded-full bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-sky-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-center text-xs text-zinc-400">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            ) : null}
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
                {isLoading ? 'Creating...' : 'Create Version'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
