'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateShot } from '@/actions/shots'
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

interface EditShotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shot: any
}

const SHOT_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'ip', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'on_hold', label: 'On Hold' },
]

export function EditShotDialog({ open, onOpenChange, shot }: EditShotDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    code: shot?.code || '',
    description: shot?.description || '',
    status: shot?.status || 'pending',
    cut_in: shot?.cut_in || '',
    cut_out: shot?.cut_out || '',
  })

  useEffect(() => {
    if (shot) {
      setFormData({
        code: shot.code || '',
        description: shot.description || '',
        status: shot.status || 'pending',
        cut_in: shot.cut_in || '',
        cut_out: shot.cut_out || '',
      })
    }
  }, [shot])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const result = await updateShot(shot.id, {
        code: formData.code,
        description: formData.description,
        status: formData.status,
        cut_in: formData.cut_in ? Number(formData.cut_in) : undefined,
        cut_out: formData.cut_out ? Number(formData.cut_out) : undefined,
      })

      if (result.error) throw new Error(result.error)

      onOpenChange(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update shot')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Shot</DialogTitle>
          <DialogDescription>
            Update shot details.
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
              <Label htmlFor="code">Shot Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHOT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cut_in">Cut In</Label>
                <Input
                  id="cut_in"
                  type="number"
                  value={formData.cut_in}
                  onChange={(e) => setFormData({ ...formData, cut_in: e.target.value })}
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cut_out">Cut Out</Label>
                <Input
                  id="cut_out"
                  type="number"
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
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
