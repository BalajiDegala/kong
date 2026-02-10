'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createShot } from '@/actions/shots'
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

interface CreateShotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
}

export function CreateShotDialog({ open, onOpenChange, projectId }: CreateShotDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sequences, setSequences] = useState<any[]>([])

  const [formData, setFormData] = useState({
    sequence_id: '',
    name: '',
    code: '',
    description: '',
    cut_in: '',
    cut_out: '',
  })

  useEffect(() => {
    if (open) {
      loadSequences()
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (!formData.sequence_id) {
        throw new Error('Please select a sequence')
      }

      const result = await createShot({
        project_id: projectId,
        sequence_id: formData.sequence_id,
        name: formData.name,
        code: formData.code,
        description: formData.description,
        cut_in: formData.cut_in ? parseInt(formData.cut_in) : undefined,
        cut_out: formData.cut_out ? parseInt(formData.cut_out) : undefined,
      })

      if (result.error) throw new Error(result.error)

      setFormData({ sequence_id: '', name: '', code: '', description: '', cut_in: '', cut_out: '' })
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shot')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Shot</DialogTitle>
          <DialogDescription>
            Add a new shot to a sequence.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-500">
                {error}
              </div>
            )}

            {sequences.length === 0 ? (
              <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-600">
                No sequences found. Please create a sequence first.
              </div>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="sequence">Sequence *</Label>
                  <Select
                    value={formData.sequence_id}
                    onValueChange={(value) => {
                      console.log('Selected sequence:', value)
                      setFormData({ ...formData, sequence_id: value })
                    }}
                    disabled={isLoading}
                    required
                  >
                    <SelectTrigger id="sequence">
                      <SelectValue placeholder="Select a sequence" />
                    </SelectTrigger>
                    <SelectContent>
                      {sequences.map((seq) => (
                        <SelectItem key={seq.id} value={seq.id.toString()}>
                          {seq.code} - {seq.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="name">Shot Name *</Label>
                  <Input
                    id="name"
                    placeholder="Opening Shot"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="code">Shot Code *</Label>
                  <Input
                    id="code"
                    placeholder="0010"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                  <p className="text-xs text-zinc-500">
                    Shot number (e.g., "0010", "0020"). Will be converted to uppercase.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cut_in">Cut In Frame</Label>
                    <Input
                      id="cut_in"
                      type="number"
                      placeholder="1001"
                      value={formData.cut_in}
                      onChange={(e) => setFormData({ ...formData, cut_in: e.target.value })}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cut_out">Cut Out Frame</Label>
                    <Input
                      id="cut_out"
                      type="number"
                      placeholder="1120"
                      value={formData.cut_out}
                      onChange={(e) => setFormData({ ...formData, cut_out: e.target.value })}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the shot..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    disabled={isLoading}
                  />
                </div>
              </>
            )}
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
            <Button type="submit" disabled={isLoading || sequences.length === 0}>
              {isLoading ? 'Creating...' : 'Create Shot'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
