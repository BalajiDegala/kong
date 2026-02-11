'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { createAsset } from '@/actions/assets'
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

interface CreateAssetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  defaultSequenceId?: string | number
  defaultShotId?: string | number
  lockSequence?: boolean
  lockShot?: boolean
}

const ASSET_TYPES = [
  { value: 'character', label: 'Character' },
  { value: 'prop', label: 'Prop' },
  { value: 'environment', label: 'Environment' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'fx', label: 'FX' },
  { value: 'matte_painting', label: 'Matte Painting' },
]

const labelClass = 'pt-2 text-sm font-semibold text-zinc-200'
const inputClass =
  'border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-400 focus:border-sky-500 focus:ring-sky-500/30'
const selectClass = 'w-full border-zinc-700 bg-zinc-900 text-zinc-100 focus:border-sky-500 focus:ring-sky-500/30'

function parseList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function CreateAssetDialog({
  open,
  onOpenChange,
  projectId,
  defaultSequenceId,
  defaultShotId,
  lockSequence = false,
  lockShot = false,
}: CreateAssetDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sequences, setSequences] = useState<any[]>([])
  const [shots, setShots] = useState<any[]>([])
  const [projectLabel, setProjectLabel] = useState(projectId)
  const [showMoreFields, setShowMoreFields] = useState(false)
  const [extraFields, setExtraFields] = useState<Record<string, any>>({})

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    asset_type: 'prop',
    description: '',
    client_name: '',
    dd_client_name: '',
    keep: false,
    outsource: false,
    sequence_id: defaultSequenceId ? String(defaultSequenceId) : 'none',
    shot_id: defaultShotId ? String(defaultShotId) : 'none',
    shots: '',
    vendor_groups: '',
    sub_assets: '',
    tags: '',
    task_template: '',
    parent_assets: '',
    sequences: '',
  })

  useEffect(() => {
    if (!open) return
    setShowMoreFields(false)
    loadSequences()
    loadShots()
    loadProject()
  }, [open, projectId])

  useEffect(() => {
    if (!open) return
    setFormData((prev) => ({
      ...prev,
      sequence_id: defaultSequenceId ? String(defaultSequenceId) : prev.sequence_id,
      shot_id: defaultShotId ? String(defaultShotId) : prev.shot_id,
    }))
  }, [open, defaultSequenceId, defaultShotId])

  async function loadSequences() {
    const supabase = createClient()
    const { data } = await supabase
      .from('sequences')
      .select('id, code, name')
      .eq('project_id', projectId)
      .order('code')
    setSequences(data || [])
  }

  async function loadShots() {
    const supabase = createClient()
    const { data } = await supabase
      .from('shots')
      .select('id, code, name')
      .eq('project_id', projectId)
      .order('code')
    setShots(data || [])
  }

  async function loadProject() {
    const supabase = createClient()
    const { data } = await supabase
      .from('projects')
      .select('name, code')
      .eq('id', projectId)
      .maybeSingle()

    if (!data) {
      setProjectLabel(projectId)
      return
    }

    const label = data.code || data.name || projectId
    setProjectLabel(label)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const normalizedName = formData.name.trim()
      const normalizedCode = (formData.code.trim() || normalizedName).trim()

      if (!normalizedName) {
        throw new Error('Asset name is required')
      }
      if (!normalizedCode) {
        throw new Error('Asset code could not be generated')
      }

      const result = await createAsset({
        project_id: projectId,
        name: normalizedName,
        code: normalizedCode,
        asset_type: formData.asset_type,
        description: formData.description,
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
        shots: parseList(formData.shots),
        vendor_groups: parseList(formData.vendor_groups),
        sub_assets: parseList(formData.sub_assets),
        tags: parseList(formData.tags),
        task_template: formData.task_template || null,
        parent_assets: parseList(formData.parent_assets),
        sequences: parseList(formData.sequences),
        ...extraFields,
      })

      if (result.error) throw new Error(result.error)

      setFormData({
        name: '',
        code: '',
        asset_type: 'prop',
        description: '',
        client_name: '',
        dd_client_name: '',
        keep: false,
        outsource: false,
        sequence_id: defaultSequenceId ? String(defaultSequenceId) : 'none',
        shot_id: defaultShotId ? String(defaultShotId) : 'none',
        shots: '',
        vendor_groups: '',
        sub_assets: '',
        tags: '',
        task_template: '',
        parent_assets: '',
        sequences: '',
      })
      setExtraFields({})
      setShowMoreFields(false)
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create asset')
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
              Create a new Asset
            </DialogTitle>
            <DialogDescription className="sr-only">
              Create a new asset for this project.
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
              <Label htmlFor="task_template" className={labelClass}>
                Task Template:
              </Label>
              <div>
                <Input
                  id="task_template"
                  placeholder="Template A"
                  value={formData.task_template}
                  onChange={(e) => setFormData({ ...formData, task_template: e.target.value })}
                  disabled={isLoading}
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-zinc-400">
                  Choose a task template to automatically add tasks to this asset.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[110px_1fr] items-start gap-3">
              <Label htmlFor="project_label" className={labelClass}>
                Project:
              </Label>
              <Input
                id="project_label"
                value={projectLabel}
                readOnly
                className={inputClass}
              />
            </div>

            <div className="pl-[110px]">
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
                <div className="grid grid-cols-[110px_1fr] items-start gap-3">
                  <Label htmlFor="code" className={labelClass}>
                    Asset Code:
                  </Label>
                  <div>
                    <Input
                      id="code"
                      placeholder="Auto from name if empty"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      disabled={isLoading}
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-zinc-400">
                      If blank, code is generated from asset name.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-[110px_1fr] items-start gap-3">
                  <Label htmlFor="sequence" className={labelClass}>
                    Sequence:
                  </Label>
                  <Select
                    value={formData.sequence_id}
                    onValueChange={(value) => setFormData({ ...formData, sequence_id: value })}
                    disabled={isLoading || lockSequence}
                  >
                    <SelectTrigger id="sequence" className={selectClass}>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {sequences.map((seq) => (
                        <SelectItem key={seq.id} value={seq.id.toString()}>
                          {seq.code} - {seq.name}
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
                    disabled={isLoading || lockShot}
                  >
                    <SelectTrigger id="shot" className={selectClass}>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {shots.map((shot) => (
                        <SelectItem key={shot.id} value={shot.id.toString()}>
                          {shot.code} - {shot.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="client_name" className="text-sm font-medium text-zinc-300">
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
                    <Label htmlFor="dd_client_name" className="text-sm font-medium text-zinc-300">
                      DD Client Name
                    </Label>
                    <Input
                      id="dd_client_name"
                      value={formData.dd_client_name}
                      onChange={(e) => setFormData({ ...formData, dd_client_name: e.target.value })}
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={formData.keep}
                      onChange={(e) => setFormData({ ...formData, keep: e.target.checked })}
                      disabled={isLoading}
                      className="h-4 w-4 rounded border border-zinc-700 bg-zinc-900"
                    />
                    Keep
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={formData.outsource}
                      onChange={(e) => setFormData({ ...formData, outsource: e.target.checked })}
                      disabled={isLoading}
                      className="h-4 w-4 rounded border border-zinc-700 bg-zinc-900"
                    />
                    Outsource
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="shots" className="text-sm font-medium text-zinc-300">
                      Shots
                    </Label>
                    <Input
                      id="shots"
                      placeholder="SH010, SH020"
                      value={formData.shots}
                      onChange={(e) => setFormData({ ...formData, shots: e.target.value })}
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="vendor_groups" className="text-sm font-medium text-zinc-300">
                      Vendor Groups
                    </Label>
                    <Input
                      id="vendor_groups"
                      placeholder="Vendor A, Vendor B"
                      value={formData.vendor_groups}
                      onChange={(e) => setFormData({ ...formData, vendor_groups: e.target.value })}
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="sub_assets" className="text-sm font-medium text-zinc-300">
                      Sub Assets
                    </Label>
                    <Input
                      id="sub_assets"
                      placeholder="Sub asset 1, Sub asset 2"
                      value={formData.sub_assets}
                      onChange={(e) => setFormData({ ...formData, sub_assets: e.target.value })}
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tags" className="text-sm font-medium text-zinc-300">
                      Tags
                    </Label>
                    <Input
                      id="tags"
                      placeholder="tag1, tag2"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="parent_assets" className="text-sm font-medium text-zinc-300">
                      Parent Assets
                    </Label>
                    <Input
                      id="parent_assets"
                      placeholder="Parent A, Parent B"
                      value={formData.parent_assets}
                      onChange={(e) => setFormData({ ...formData, parent_assets: e.target.value })}
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sequences" className="text-sm font-medium text-zinc-300">
                      Sequences
                    </Label>
                    <Input
                      id="sequences"
                      placeholder="SEQ01, SEQ02"
                      value={formData.sequences}
                      onChange={(e) => setFormData({ ...formData, sequences: e.target.value })}
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </div>
                </div>

                <SchemaExtraFields
                  entity="asset"
                  values={extraFields}
                  onChange={setExtraFields}
                  disabled={isLoading}
                  title="More schema fields"
                  excludeColumns={new Set([
                    'name',
                    'description',
                    'client_name',
                    'dd_client_name',
                    'keep',
                    'outsource',
                    'sequence_id',
                    'shot_id',
                    'shots',
                    'vendor_groups',
                    'sub_assets',
                    'tags',
                    'task_template',
                    'parent_assets',
                    'sequences',
                    'asset_type',
                    'thumbnail_url',
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
                {isLoading ? 'Creating...' : 'Create Asset'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
