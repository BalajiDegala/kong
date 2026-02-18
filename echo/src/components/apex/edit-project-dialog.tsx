'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateProject } from '@/actions/projects'
import { listTagNames, parseTagsValue } from '@/lib/tags/options'
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

interface EditProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: {
    id: string | number
    name?: string | null
    code?: string | null
    description?: string | null
    status?: string | null
    tags?: unknown
  } | null
}

export function EditProjectDialog({ open, onOpenChange, project }: EditProjectDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTags, setIsLoadingTags] = useState(false)
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: project?.name || '',
    code: project?.code || '',
    description: project?.description || '',
    status: project?.status || 'active',
    tags: parseTagsValue(project?.tags),
  })

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        code: project.code || '',
        description: project.description || '',
        status: project.status || 'active',
        tags: parseTagsValue(project.tags),
      })
    }
  }, [project])

  useEffect(() => {
    if (!open) return
    void loadTags()
    void loadStatuses()
  }, [open])

  const tagOptions = useMemo(
    () => Array.from(new Set([...availableTags, ...formData.tags])).sort((a, b) => a.localeCompare(b)),
    [availableTags, formData.tags]
  )
  const statusOptions = useMemo(
    () => Array.from(new Set([...availableStatuses, formData.status])).filter(Boolean),
    [availableStatuses, formData.status]
  )

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
        if (!previous.status && statuses.length > 0) {
          return { ...previous, status: statuses[0] }
        }
        return previous
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
    if (!project?.id) {
      setError('Invalid project selected')
      return
    }
    setIsLoading(true)
    setError(null)

    try {
      const result = await updateProject(String(project.id), formData)

      if (result.error) throw new Error(result.error)

      onOpenChange(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update project details.
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
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                maxLength={10}
                required
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(statusOptions.length > 0 ? statusOptions : ['active']).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <div className="grid gap-2">
              <Label>Tags</Label>
              {isLoadingTags ? (
                <p className="text-xs text-muted-foreground">Loading tags...</p>
              ) : tagOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No tags found. Create tags on the Tags page first.</p>
              ) : (
                <div className="max-h-36 space-y-2 overflow-y-auto rounded-md border border-border p-2">
                  {tagOptions.map((tag) => (
                    <label key={tag} className="flex items-center gap-2 text-sm text-foreground/80">
                      <input
                        type="checkbox"
                        checked={formData.tags.includes(tag)}
                        onChange={() => toggleTag(tag)}
                        disabled={isLoading}
                        className="h-4 w-4 rounded border border-border bg-card"
                      />
                      <span>{tag}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Select one or more tags from the Tags page.</p>
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
