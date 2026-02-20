'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Paperclip, Upload, X } from 'lucide-react'
import { createVersion } from '@/actions/versions'
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

interface UploadVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  defaultEntityType?: '' | 'asset' | 'shot' | 'sequence'
  defaultEntityId?: string | number
  defaultTaskId?: string | number
  lockEntity?: boolean
}

type MultiSelectOption = {
  value: string
  label: string
}

type EntityOption = {
  id: number
  name: string
  code?: string | null
}

type TaskOption = {
  id: number
  name: string
  entity_type: string | null
  entity_id: number | null
}

type UserOption = {
  id: string
  full_name: string | null
  email: string | null
}

const ENTITY_TYPES = [
  { value: 'asset', label: 'Asset' },
  { value: 'shot', label: 'Shot' },
  { value: 'sequence', label: 'Sequence' },
]

const STATUS_FALLBACK_VALUES = ['pending', 'ip', 'review', 'approved', 'on_hold']
const ALLOWED_MOVIE_MIME_TYPES = new Set(['video/mp4', 'video/quicktime'])
const ALLOWED_MOVIE_EXTENSIONS = new Set(['mp4', 'mov'])

const labelClass = 'pt-2 text-sm font-semibold text-foreground/80'
const inputClass =
  'border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:ring-sky-500/30'
const selectClass =
  'w-full border-border bg-card text-foreground focus:border-sky-500 focus:ring-sky-500/30'

function uniqueSorted(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b))
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

async function captureVideoThumbnailDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement('video')
    let settled = false

    const cleanup = () => {
      window.clearTimeout(timeoutId)
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(objectUrl)
    }

    const fail = (message: string) => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error(message))
    }

    const succeed = (value: string) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(value)
    }

    const captureFrame = () => {
      const sourceWidth = video.videoWidth || 0
      const sourceHeight = video.videoHeight || 0
      if (sourceWidth <= 0 || sourceHeight <= 0) {
        fail('Failed to read video frame')
        return
      }

      try {
        const maxSide = 256
        const ratio = Math.min(maxSide / sourceWidth, maxSide / sourceHeight, 1)
        const width = Math.max(1, Math.round(sourceWidth * ratio))
        const height = Math.max(1, Math.round(sourceHeight * ratio))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          fail('Failed to process video frame')
          return
        }
        ctx.drawImage(video, 0, 0, width, height)
        succeed(canvas.toDataURL('image/jpeg', 0.84))
      } catch {
        fail('Failed to process video frame')
      }
    }

    const captureFromMiddleFrame = () => {
      const duration = Number.isFinite(video.duration) ? Number(video.duration) : 0
      const targetTime =
        duration > 0 ? Math.max(0, Math.min(duration / 2, Math.max(duration - 0.05, 0))) : 0

      if (targetTime <= 0) {
        if (video.readyState >= 2) {
          captureFrame()
          return
        }
        video.addEventListener('loadeddata', captureFrame, { once: true })
        return
      }

      video.addEventListener('seeked', captureFrame, { once: true })
      try {
        video.currentTime = targetTime
      } catch {
        if (video.readyState >= 2) {
          captureFrame()
          return
        }
        video.addEventListener('loadeddata', captureFrame, { once: true })
      }
    }

    const timeoutId = window.setTimeout(() => {
      fail('Timed out while generating thumbnail')
    }, 10000)

    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.addEventListener('loadedmetadata', captureFromMiddleFrame, { once: true })
    video.addEventListener('error', () => fail('Invalid video file'), { once: true })
    video.src = objectUrl
    video.load()
  })
}

async function uploadVersionFileFromClient(file: File, projectId: string) {
  const supabase = createClient()
  const timestamp = Date.now()
  const sanitizedFileName = file.name.replace(/\s+/g, '_')
  const filePath = `${projectId}/${timestamp}_${sanitizedFileName}`

  const { data, error } = await supabase.storage
    .from('versions')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    return { error: error.message }
  }

  return {
    data: {
      path: data.path,
      fullPath: data.fullPath,
    },
  }
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
  const [extraFields, setExtraFields] = useState<Record<string, unknown>>({})
  const [statusNames, setStatusNames] = useState<string[]>([])
  const [tagNames, setTagNames] = useState<string[]>([])
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null)
  const [thumbnailFileName, setThumbnailFileName] = useState('')
  const thumbnailCaptureRequestRef = useRef(0)

  const [assets, setAssets] = useState<EntityOption[]>([])
  const [shots, setShots] = useState<EntityOption[]>([])
  const [sequences, setSequences] = useState<EntityOption[]>([])
  const [tasks, setTasks] = useState<TaskOption[]>([])
  const [users, setUsers] = useState<UserOption[]>([])

  const [formData, setFormData] = useState({
    code: '',
    version_number: 1,
    description: '',
    artist_id: '',
    link: '',
    status: 'pending',
    tags: [] as string[],
    thumbnail_blur_hash: '',
    entity_type: (defaultEntityType ?? '') as '' | 'asset' | 'shot' | 'sequence',
    entity_id: defaultEntityId ? String(defaultEntityId) : '',
    task_id: defaultTaskId ? String(defaultTaskId) : '',
  })

  useEffect(() => {
    if (!open) return
    setShowMoreFields(false)
    void loadData()
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
        .from('tasks')
        .select('id, name, entity_type, entity_id')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('name'),
      supabase.from('profiles').select('id, full_name, email').order('full_name'),
      supabase
        .from('projects')
        .select('name, code')
        .eq('id', projectId)
        .is('deleted_at', null)
        .maybeSingle(),
      listStatusNames('version'),
      listTagNames(),
    ])

    setAssets(assetsData || [])
    setShots(shotsData || [])
    setSequences(sequencesData || [])
    setTasks(tasksData || [])
    setUsers(usersData || [])
    setProjectLabel(projectData?.code || projectData?.name || projectId)
    setStatusNames(uniqueSorted(statuses))
    setTagNames(uniqueSorted(tags))
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

  const handleFileSelect = async (file: File | null) => {
    if (!file) return

    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    const mimeAllowed = ALLOWED_MOVIE_MIME_TYPES.has(file.type.toLowerCase())
    const extensionAllowed = ALLOWED_MOVIE_EXTENSIONS.has(extension)

    if (!mimeAllowed && !extensionAllowed) {
      setSelectedFile(null)
      setError('Only MP4 and MOV files are supported for version uploads')
      return
    }

    setError(null)
    setSelectedFile(file)
    setThumbnailDataUrl(null)
    setThumbnailFileName('')

    const requestId = thumbnailCaptureRequestRef.current + 1
    thumbnailCaptureRequestRef.current = requestId

    if (!formData.code) {
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, '')
      setFormData((prev) => ({ ...prev, code: nameWithoutExt }))
    }

    try {
      const autoThumbnail = await captureVideoThumbnailDataUrl(file)
      if (thumbnailCaptureRequestRef.current !== requestId) return
      setThumbnailDataUrl(autoThumbnail)
      setThumbnailFileName('Auto-generated from video')
    } catch (thumbnailError) {
      if (thumbnailCaptureRequestRef.current !== requestId) return
      console.warn(
        'Failed to auto-generate thumbnail from uploaded video:',
        thumbnailError
      )
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
      thumbnailCaptureRequestRef.current += 1
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
    setUploadProgress(0)

    if (!selectedFile) {
      setError('Please upload an MP4 or MOV file')
      setIsLoading(false)
      return
    }
    {
      const extension = selectedFile.name.split('.').pop()?.toLowerCase() || ''
      const mimeAllowed = ALLOWED_MOVIE_MIME_TYPES.has(selectedFile.type.toLowerCase())
      const extensionAllowed = ALLOWED_MOVIE_EXTENSIONS.has(extension)
      if (!mimeAllowed && !extensionAllowed) {
        setError('Only MP4 and MOV files are supported for version uploads')
        setIsLoading(false)
        return
      }
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
      let effectiveThumbnailDataUrl = thumbnailDataUrl
      if (!effectiveThumbnailDataUrl) {
        try {
          effectiveThumbnailDataUrl = await captureVideoThumbnailDataUrl(selectedFile)
          setThumbnailDataUrl(effectiveThumbnailDataUrl)
          setThumbnailFileName('Auto-generated from video')
        } catch (thumbnailError) {
          console.warn(
            'Failed to auto-generate thumbnail before creating version:',
            thumbnailError
          )
        }
      }

      setUploadProgress(25)
      const uploadResult = await uploadVersionFileFromClient(selectedFile, projectId)
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
        movie_url: uploadResult.data?.path,
        file_path: uploadResult.data?.path,
        artist_id: formData.artist_id || null,
        link: formData.link || null,
        status: formData.status || undefined,
        tags: formData.tags,
        thumbnail_url: effectiveThumbnailDataUrl || undefined,
        thumbnail_blur_hash: formData.thumbnail_blur_hash.trim() || undefined,
        uploaded_movie: uploadResult.data?.path || null,
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
        status: 'pending',
        tags: [],
        thumbnail_blur_hash: '',
        entity_type: defaultEntityType ?? '',
        entity_id: defaultEntityId ? String(defaultEntityId) : '',
        task_id: defaultTaskId ? String(defaultTaskId) : '',
      })
      setSelectedFile(null)
      setThumbnailDataUrl(null)
      setThumbnailFileName('')
      thumbnailCaptureRequestRef.current += 1
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
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden border-border bg-background p-0 text-foreground"
      >
        <form onSubmit={handleSubmit} className="flex max-h-[90vh] flex-col">
          <div className="border-b border-border px-6 py-4">
            <DialogTitle className="whitespace-nowrap text-2xl font-semibold leading-tight text-foreground">
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
                  className="flex min-h-24 cursor-pointer items-center justify-center rounded-md border border-dashed border-border bg-card px-4 py-6 text-center transition hover:border-border"
                >
                  <div className="flex items-center gap-2 text-foreground/70">
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
                  onChange={(e) => void handleFileSelect(e.target.files?.[0] || null)}
                  accept=".mp4,.mov,video/mp4,video/quicktime"
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
                  <Label htmlFor="entity_type" className={labelClass}>
                    Entity Type:
                  </Label>
                  <Select
                    value={formData.entity_type || 'none'}
                    onValueChange={(value: string) => {
                      const nextType: '' | 'asset' | 'shot' | 'sequence' =
                        value === 'none' ? '' : (value as 'asset' | 'shot' | 'sequence')
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="status" className="text-sm font-medium text-foreground/70">
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
                    <Label htmlFor="tags" className="text-sm font-medium text-foreground/70">
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

                <div className="grid grid-cols-[120px_1fr] items-start gap-3">
                  <Label htmlFor="thumbnail_file" className={labelClass}>
                    Thumbnail:
                  </Label>
                  <div className="space-y-3">
                    <label
                      htmlFor="thumbnail_file"
                      className="flex min-h-20 cursor-pointer items-center justify-center rounded-md border border-dashed border-border bg-card px-4 py-4 text-center transition hover:border-border"
                    >
                      <div className="flex items-center gap-2 text-sm text-foreground/70">
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
                          className="h-24 w-24 rounded-md border border-border object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            thumbnailCaptureRequestRef.current += 1
                            setThumbnailDataUrl(null)
                            setThumbnailFileName('')
                          }}
                          className="inline-flex items-center gap-1 text-xs text-foreground/70 transition hover:text-foreground"
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
                    'link',
                    'task_id',
                    'status',
                    'tags',
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

            {uploadProgress > 0 ? (
              <div className="grid gap-2">
                <div className="h-2 w-full rounded-full bg-accent">
                  <div
                    className="h-2 rounded-full bg-sky-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            ) : null}
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
                {isLoading ? 'Creating...' : 'Create Version'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
