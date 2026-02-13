'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { listTagNames } from '@/lib/tags/options'
import { listStatusNames } from '@/lib/status/options'
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

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTags, setIsLoadingTags] = useState(false)
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    status: 'active',
    tags: [] as string[],
  })

  useEffect(() => {
    if (!open) return
    void loadTags()
    void loadStatuses()
  }, [open])

  async function loadTags() {
    try {
      setIsLoadingTags(true)
      setAvailableTags(await listTagNames())
    } catch (err) {
      console.error('Failed to load tags:', err)
      setAvailableTags([])
    } finally {
      setIsLoadingTags(false)
    }
  }

  async function loadStatuses() {
    try {
      setIsLoadingStatuses(true)
      const statuses = await listStatusNames('project')
      setAvailableStatuses(statuses)
      setFormData((previous) => {
        if (statuses.length === 0) return previous
        if (statuses.includes(previous.status)) return previous
        return {
          ...previous,
          status: statuses[0],
        }
      })
    } catch (err) {
      console.error('Failed to load statuses:', err)
      setAvailableStatuses([])
    } finally {
      setIsLoadingStatuses(false)
    }
  }

  function toggleTag(tag: string) {
    setFormData((previous) => {
      const hasTag = previous.tags.includes(tag)
      return {
        ...previous,
        tags: hasTag
          ? previous.tags.filter((item) => item !== tag)
          : [...previous.tags, tag],
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create project
      const { error: projectError } = await supabase
        .from('projects')
        .insert({
          name: formData.name,
          code: formData.code.toUpperCase(),
          description: formData.description || null,
          tags: formData.tags,
          status: formData.status || 'active',
          created_by: user.id,
        })
        .select()
        .single()

      if (projectError) throw projectError

      // Close dialog and refresh
      setFormData({
        name: '',
        code: '',
        description: '',
        status: 'active',
        tags: [],
      })
      onOpenChange(false)
      router.refresh()

      // Optionally navigate to the new project
      // router.push(`/apex/${project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Add a new project to organize your production work.
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
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                placeholder="My Awesome Project"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="code">Project Code *</Label>
              <Input
                id="code"
                placeholder="MAP"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                maxLength={10}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-zinc-500">Short code (for example: MAP, PROJ01). Will be converted to uppercase.</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the project..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
                disabled={isLoading || isLoadingStatuses}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {(availableStatuses.length > 0 ? availableStatuses : ['active']).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Tags</Label>
              {isLoadingTags ? (
                <p className="text-xs text-zinc-500">Loading tags...</p>
              ) : availableTags.length === 0 ? (
                <p className="text-xs text-zinc-500">No tags found. Create tags on the Tags page first.</p>
              ) : (
                <div className="max-h-36 space-y-2 overflow-y-auto rounded-md border border-zinc-800 p-2">
                  {availableTags.map((tag) => (
                    <label key={tag} className="flex items-center gap-2 text-sm text-zinc-200">
                      <input
                        type="checkbox"
                        checked={formData.tags.includes(tag)}
                        onChange={() => toggleTag(tag)}
                        disabled={isLoading}
                        className="h-4 w-4 rounded border border-zinc-600 bg-zinc-900"
                      />
                      <span>{tag}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-zinc-500">Select one or more tags from the Tags page.</p>
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
              {isLoading ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
