'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { updateAsset } from '@/actions/assets'
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

interface EditAssetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  asset: AssetLike | null
}

type SequenceOption = {
  id: number
  code?: string | null
  name?: string | null
}

type ShotOption = {
  id: number
  code?: string | null
  name?: string | null
  sequence_id?: number | null
  sequence?: { code?: string | null } | null
}

type AssetFormState = {
  name: string
  code: string
  thumbnail_blur_hash: string
  asset_type: string
  description: string
  status: string
  client_name: string
  dd_client_name: string
  keep: boolean
  outsource: boolean
  sequence_id: string
  shot_id: string
  shots: string[]
  vendor_groups: string
  sub_assets: string
  tags: string[]
  task_template: string
  parent_assets: string
  sequences: string[]
}

type MultiSelectOption = {
  value: string
  label: string
}

type AssetLike = Record<string, unknown> & {
  project_id?: string | number | null
  project_label?: string | null
  project?: { code?: string | null; name?: string | null } | null
}

const ASSET_TYPES = [
  { value: 'character', label: 'Character' },
  { value: 'prop', label: 'Prop' },
  { value: 'environment', label: 'Environment' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'fx', label: 'FX' },
  { value: 'matte_painting', label: 'Matte Painting' },
]

const FALLBACK_STATUS_VALUES = ['pending', 'ip', 'review', 'approved', 'on_hold']

const labelClass = 'pt-2 text-sm font-semibold text-foreground/80'
const inputClass =
  'border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:ring-sky-500/30'
const selectClass =
  'w-full border-border bg-card text-foreground focus:border-sky-500 focus:ring-sky-500/30'

function asText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function parseStringList(value: string): string[] {
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
    return parseStringList(value)
  }

  return []
}

function listToString(values: string[]): string {
  return values.join(', ')
}

function formatSequenceEntityCode(
  sequence: { code?: unknown; name?: unknown } | null | undefined
): string {
  if (!sequence) return ''
  const code = asText(sequence.code).trim()
  if (code) return code
  return asText(sequence.name).trim()
}

function formatShotEntityCode(shotCode: unknown, sequenceCode?: unknown): string {
  const shot = asText(shotCode).trim()
  const sequence = asText(sequenceCode).trim()
  if (!shot) return ''
  if (!sequence) return shot
  if (shot.toLowerCase().startsWith(sequence.toLowerCase())) return shot
  return `${sequence}${shot}`
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

function buildFormState(asset: AssetLike | null | undefined): AssetFormState {
  return {
    name: asText(asset?.name),
    code: asText(asset?.code),
    thumbnail_blur_hash: asText(asset?.thumbnail_blur_hash),
    asset_type: asText(asset?.asset_type) || 'character',
    description: asText(asset?.description),
    status: asText(asset?.status) || 'pending',
    client_name: asText(asset?.client_name),
    dd_client_name: asText(asset?.dd_client_name),
    keep: Boolean(asset?.keep),
    outsource: Boolean(asset?.outsource),
    sequence_id: asset?.sequence_id ? String(asset.sequence_id) : 'none',
    shot_id: asset?.shot_id ? String(asset.shot_id) : 'none',
    shots: parseUnknownList(asset?.shots),
    vendor_groups: parseUnknownList(asset?.vendor_groups).join(', '),
    sub_assets: parseUnknownList(asset?.sub_assets).join(', '),
    tags: parseUnknownList(asset?.tags),
    task_template: asText(asset?.task_template),
    parent_assets: parseUnknownList(asset?.parent_assets).join(', '),
    sequences: parseUnknownList(asset?.sequences),
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

export function EditAssetDialog({ open, onOpenChange, asset }: EditAssetDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sequences, setSequences] = useState<SequenceOption[]>([])
  const [shots, setShots] = useState<ShotOption[]>([])
  const [tagNames, setTagNames] = useState<string[]>([])
  const [statusNames, setStatusNames] = useState<string[]>([])
  const [projectLabel, setProjectLabel] = useState('')
  const [showMoreFields, setShowMoreFields] = useState(false)
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null)
  const [thumbnailFileName, setThumbnailFileName] = useState('')
  const [formData, setFormData] = useState<AssetFormState>(() => buildFormState(asset))

  const statusOptions = useMemo(() => {
    const values = new Set<string>()
    for (const status of statusNames) {
      const normalized = status.trim()
      if (normalized) values.add(normalized)
    }
    const current = formData.status.trim()
    if (current) values.add(current)
    if (values.size === 0) {
      for (const fallback of FALLBACK_STATUS_VALUES) values.add(fallback)
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

  const shotCodeOptions = useMemo<MultiSelectOption[]>(() => {
    const values = new Set<string>()
    for (const shot of shots) {
      const normalized = formatShotEntityCode(shot.code, shot.sequence?.code)
      if (normalized) values.add(normalized)
    }
    for (const code of formData.shots) {
      const normalized = code.trim()
      if (normalized) values.add(normalized)
    }
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((code) => ({ value: code, label: code }))
  }, [formData.shots, shots])

  const sequenceCodeOptions = useMemo<MultiSelectOption[]>(() => {
    const values = new Set<string>()
    for (const sequence of sequences) {
      const normalized = formatSequenceEntityCode(sequence)
      if (normalized) values.add(normalized)
    }
    for (const code of formData.sequences) {
      const normalized = code.trim()
      if (normalized) values.add(normalized)
    }
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((code) => ({ value: code, label: code }))
  }, [formData.sequences, sequences])

  const selectedSequenceId = useMemo(() => {
    const parsed = Number(formData.sequence_id)
    return Number.isNaN(parsed) ? null : parsed
  }, [formData.sequence_id])

  const shotSelectOptions = useMemo(() => {
    if (selectedSequenceId === null) return shots
    const filtered = shots.filter((shot) => shot.sequence_id === selectedSequenceId)
    if (filtered.length > 0) return filtered
    return shots
  }, [selectedSequenceId, shots])

  useEffect(() => {
    if (!open || !asset) return
    setFormData(buildFormState(asset))
    setThumbnailDataUrl(asText(asset.thumbnail_url).trim() || null)
    setThumbnailFileName('')
  }, [asset, open])

  const loadProjectLabel = useCallback(
    async (projectId: string, currentAsset: AssetLike | null) => {
      const fromRow = asText(currentAsset?.project_label).trim()
      if (fromRow) {
        setProjectLabel(fromRow)
        return
      }
      const fromProject =
        asText(currentAsset?.project?.code).trim() ||
        asText(currentAsset?.project?.name).trim()
      if (fromProject) {
        setProjectLabel(fromProject)
        return
      }

      const supabase = createClient()
      const { data } = await supabase
        .from('projects')
        .select('name, code')
        .eq('id', projectId)
        .is('deleted_at', null)
        .maybeSingle()
      if (!data) {
        setProjectLabel(projectId)
        return
      }
      const label = asText(data.code).trim() || asText(data.name).trim() || projectId
      setProjectLabel(label)
    },
    []
  )

  const loadFormOptions = useCallback(async (projectId: string) => {
    try {
      const supabase = createClient()
      const [sequenceResult, shotResult, tagResult, statusResult] = await Promise.all([
        supabase
          .from('sequences')
          .select('id, code, name')
          .eq('project_id', projectId)
          .is('deleted_at', null)
          .order('code'),
        supabase
          .from('shots')
          .select('id, code, name, sequence_id, sequence:sequences!shots_sequence_id_fkey(code)')
          .eq('project_id', projectId)
          .is('deleted_at', null)
          .order('code'),
        listTagNames(),
        listStatusNames('asset'),
      ])

      if (sequenceResult.error) throw sequenceResult.error
      if (shotResult.error) throw shotResult.error

      setSequences((sequenceResult.data || []) as SequenceOption[])
      setShots((shotResult.data || []) as ShotOption[])
      setTagNames(tagResult)
      setStatusNames(statusResult)
    } catch (loadError) {
      console.error('Failed to load asset options:', loadError)
      setSequences([])
      setShots([])
      setTagNames([])
      setStatusNames([])
    }
  }, [])

  useEffect(() => {
    if (open && asset?.project_id) {
      const projectId = asText(asset.project_id).trim()
      if (!projectId) return
      setShowMoreFields(false)
      void loadFormOptions(projectId)
      void loadProjectLabel(projectId, asset)
      return
    }
    setProjectLabel('')
  }, [asset, loadFormOptions, loadProjectLabel, open])

  useEffect(() => {
    if (open) return
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
    if (!asset?.id) {
      setError('Invalid asset selected')
      return
    }
    setIsLoading(true)
    setError(null)

    try {
      const result = await updateAsset(String(asset.id), {
        name: formData.name,
        code: formData.code,
        thumbnail_url: thumbnailDataUrl || null,
        thumbnail_blur_hash: formData.thumbnail_blur_hash.trim() || null,
        asset_type: formData.asset_type,
        description: formData.description,
        status: formData.status,
        client_name: formData.client_name || null,
        dd_client_name: formData.dd_client_name || null,
        keep: formData.keep,
        outsource: formData.outsource,
        sequence_id:
          formData.sequence_id && formData.sequence_id !== 'none'
            ? Number(formData.sequence_id)
            : null,
        shot_id:
          formData.shot_id && formData.shot_id !== 'none'
            ? Number(formData.shot_id)
            : null,
        shots: formData.shots,
        vendor_groups: parseStringList(formData.vendor_groups),
        sub_assets: parseStringList(formData.sub_assets),
        tags: formData.tags,
        task_template: formData.task_template || null,
        parent_assets: parseStringList(formData.parent_assets),
        sequences: formData.sequences,
      })

      if (result.error) throw new Error(result.error)

      onOpenChange(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update asset')
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
              Update Asset
            </DialogTitle>
            <DialogDescription className="sr-only">
              Update asset details.
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-[110px_1fr] items-start gap-3">
              <Label htmlFor="name" className={labelClass}>
                Asset Name:
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

            <div className="grid grid-cols-[110px_1fr] items-start gap-3">
              <Label htmlFor="description" className={labelClass}>
                Description:
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[110px_1fr] items-start gap-3">
              <Label htmlFor="asset_type" className={labelClass}>
                Type:
              </Label>
              <Select
                value={formData.asset_type}
                onValueChange={(value) => setFormData({ ...formData, asset_type: value })}
                disabled={isLoading}
              >
                <SelectTrigger id="asset_type" className={selectClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-[110px_1fr] items-start gap-3">
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

            <div className="grid grid-cols-[110px_1fr] items-start gap-3">
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

            <div className="grid grid-cols-[110px_1fr] items-start gap-3">
              <Label htmlFor="project_label" className={labelClass}>
                Project:
              </Label>
              <Input id="project_label" value={projectLabel} readOnly className={inputClass} />
            </div>

            <div className="pl-[110px]">
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

            {showMoreFields ? (
              <div className="space-y-4 rounded-md border border-border bg-card/30 p-4">
                <div className="grid grid-cols-[110px_1fr] items-start gap-3">
                  <Label htmlFor="code" className={labelClass}>
                    Asset Code:
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

                <div className="grid grid-cols-[110px_1fr] items-start gap-3">
                  <Label htmlFor="sequence" className={labelClass}>
                    Sequence:
                  </Label>
                  <Select
                    value={formData.sequence_id}
                    onValueChange={(value) => {
                      setFormData((prev) => {
                        if (value === 'none' || prev.shot_id === 'none') {
                          return { ...prev, sequence_id: value }
                        }
                        const nextSequenceId = Number(value)
                        if (Number.isNaN(nextSequenceId)) {
                          return { ...prev, sequence_id: value }
                        }
                        const currentShot = shots.find((shot) => String(shot.id) === prev.shot_id)
                        const shouldClearShot =
                          Boolean(currentShot?.sequence_id) &&
                          currentShot?.sequence_id !== nextSequenceId
                        return {
                          ...prev,
                          sequence_id: value,
                          shot_id: shouldClearShot ? 'none' : prev.shot_id,
                        }
                      })
                    }}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="sequence" className={selectClass}>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {sequences.map((seq) => (
                        <SelectItem key={seq.id} value={String(seq.id)}>
                          {formatSequenceEntityCode(seq)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-[110px_1fr] items-start gap-3">
                  <Label htmlFor="shot" className={labelClass}>
                    Shot:
                  </Label>
                  <Select
                    value={formData.shot_id}
                    onValueChange={(value) => setFormData({ ...formData, shot_id: value })}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="shot" className={selectClass}>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {shotSelectOptions.map((shot) => (
                        <SelectItem key={shot.id} value={String(shot.id)}>
                          {formatShotEntityCode(shot.code, shot.sequence?.code)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="client_name" className="text-sm font-medium text-foreground/70">
                      Client Name
                    </Label>
                    <Input
                      id="client_name"
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dd_client_name" className="text-sm font-medium text-foreground/70">
                      DD Client Name
                    </Label>
                    <Input
                      id="dd_client_name"
                      value={formData.dd_client_name}
                      onChange={(e) =>
                        setFormData({ ...formData, dd_client_name: e.target.value })
                      }
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm text-foreground/70">
                    <input
                      type="checkbox"
                      checked={formData.keep}
                      onChange={(e) => setFormData({ ...formData, keep: e.target.checked })}
                      disabled={isLoading}
                      className="h-4 w-4 rounded border border-border bg-card"
                    />
                    Keep
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground/70">
                    <input
                      type="checkbox"
                      checked={formData.outsource}
                      onChange={(e) => setFormData({ ...formData, outsource: e.target.checked })}
                      disabled={isLoading}
                      className="h-4 w-4 rounded border border-border bg-card"
                    />
                    Outsource
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="shots" className="text-sm font-medium text-foreground/70">
                      Shots
                    </Label>
                    <MultiSelectDropdown
                      id="shots"
                      values={formData.shots}
                      options={shotCodeOptions}
                      placeholder="Select shots"
                      disabled={isLoading}
                      onChange={(nextValues) => setFormData({ ...formData, shots: nextValues })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="vendor_groups" className="text-sm font-medium text-foreground/70">
                      Vendor Groups
                    </Label>
                    <Input
                      id="vendor_groups"
                      value={formData.vendor_groups}
                      onChange={(e) =>
                        setFormData({ ...formData, vendor_groups: e.target.value })
                      }
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="sub_assets" className="text-sm font-medium text-foreground/70">
                      Sub Assets
                    </Label>
                    <Input
                      id="sub_assets"
                      value={formData.sub_assets}
                      onChange={(e) => setFormData({ ...formData, sub_assets: e.target.value })}
                      disabled={isLoading}
                      className={inputClass}
                    />
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
                      onChange={(nextValues) => setFormData({ ...formData, tags: nextValues })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="parent_assets" className="text-sm font-medium text-foreground/70">
                      Parent Assets
                    </Label>
                    <Input
                      id="parent_assets"
                      value={formData.parent_assets}
                      onChange={(e) =>
                        setFormData({ ...formData, parent_assets: e.target.value })
                      }
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sequences" className="text-sm font-medium text-foreground/70">
                      Sequences
                    </Label>
                    <MultiSelectDropdown
                      id="sequences"
                      values={formData.sequences}
                      options={sequenceCodeOptions}
                      placeholder="Select sequences"
                      disabled={isLoading}
                      onChange={(nextValues) =>
                        setFormData({ ...formData, sequences: nextValues })
                      }
                    />
                  </div>
                </div>
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
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
