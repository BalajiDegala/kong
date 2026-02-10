'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createAsset } from '@/actions/assets'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

interface CreateAssetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
}

const ASSET_TYPES = [
  { value: 'character', label: 'Character' },
  { value: 'prop', label: 'Prop' },
  { value: 'environment', label: 'Environment' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'fx', label: 'FX' },
  { value: 'matte_painting', label: 'Matte Painting' },
]

export function CreateAssetDialog({ open, onOpenChange, projectId }: CreateAssetDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sequences, setSequences] = useState<any[]>([])
  const [shots, setShots] = useState<any[]>([])

  const parseList = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    asset_type: 'prop',
    description: '',
    client_name: '',
    dd_client_name: '',
    keep: false,
    outsource: false,
    sequence_id: 'none',
    shot_id: 'none',
    shots: '',
    vendor_groups: '',
    sub_assets: '',
    tags: '',
    task_template: '',
    parent_assets: '',
    sequences: '',
  })

  useEffect(() => {
    if (open) {
      loadSequences()
      loadShots()
    }
  }, [open])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const result = await createAsset({
        project_id: projectId,
        name: formData.name,
        code: formData.code,
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
      })

      if (result.error) throw new Error(result.error)

      // Reset form and close
      setFormData({
        name: '',
        code: '',
        asset_type: 'prop',
        description: '',
        client_name: '',
        dd_client_name: '',
        keep: false,
        outsource: false,
        sequence_id: 'none',
        shot_id: 'none',
        shots: '',
        vendor_groups: '',
        sub_assets: '',
        tags: '',
        task_template: '',
        parent_assets: '',
        sequences: '',
      })
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Asset</DialogTitle>
          <DialogDescription>
            Add a new asset to this project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-500">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="name">Asset Name *</Label>
              <Input
                id="name"
                placeholder="Wooden Barrel"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="code">Asset Code *</Label>
              <Input
                id="code"
                placeholder="prop_barrel_01"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-zinc-500">
                Unique code (e.g., "prop_barrel_01", "char_hero")
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="asset_type">Asset Type *</Label>
              <Select
                value={formData.asset_type}
                onValueChange={(value) => setFormData({ ...formData, asset_type: value })}
                disabled={isLoading}
              >
                <SelectTrigger>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sequence">Sequence</Label>
                <Select
                  value={formData.sequence_id}
                  onValueChange={(value) => setFormData({ ...formData, sequence_id: value })}
                  disabled={isLoading}
                >
                  <SelectTrigger id="sequence">
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

              <div className="grid gap-2">
                <Label htmlFor="shot">Shot</Label>
                <Select
                  value={formData.shot_id}
                  onValueChange={(value) => setFormData({ ...formData, shot_id: value })}
                  disabled={isLoading}
                >
                  <SelectTrigger id="shot">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="client_name">Client Name</Label>
                <Input
                  id="client_name"
                  placeholder="Client"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dd_client_name">DD Client Name</Label>
                <Input
                  id="dd_client_name"
                  placeholder="DD Client"
                  value={formData.dd_client_name}
                  onChange={(e) => setFormData({ ...formData, dd_client_name: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  checked={formData.keep}
                  onChange={(e) => setFormData({ ...formData, keep: e.target.checked })}
                  disabled={isLoading}
                  className="h-4 w-4 rounded border border-zinc-700 bg-zinc-900"
                />
                Keep
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-200">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="shots">Shots (comma separated)</Label>
                <Input
                  id="shots"
                  placeholder="SH010, SH020"
                  value={formData.shots}
                  onChange={(e) => setFormData({ ...formData, shots: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="vendor_groups">Vendor Groups</Label>
                <Input
                  id="vendor_groups"
                  placeholder="Vendor A, Vendor B"
                  value={formData.vendor_groups}
                  onChange={(e) => setFormData({ ...formData, vendor_groups: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sub_assets">Sub Assets</Label>
                <Input
                  id="sub_assets"
                  placeholder="Sub asset 1, Sub asset 2"
                  value={formData.sub_assets}
                  onChange={(e) => setFormData({ ...formData, sub_assets: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  placeholder="tag1, tag2"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="task_template">Task Template</Label>
                <Input
                  id="task_template"
                  placeholder="Template A"
                  value={formData.task_template}
                  onChange={(e) => setFormData({ ...formData, task_template: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="parent_assets">Parent Assets</Label>
                <Input
                  id="parent_assets"
                  placeholder="Parent A, Parent B"
                  value={formData.parent_assets}
                  onChange={(e) => setFormData({ ...formData, parent_assets: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sequences">Sequences</Label>
              <Input
                id="sequences"
                placeholder="SEQ01, SEQ02"
                value={formData.sequences}
                onChange={(e) => setFormData({ ...formData, sequences: e.target.value })}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the asset..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Asset'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
