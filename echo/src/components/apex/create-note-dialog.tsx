'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createNote } from '@/actions/notes'
import { uploadNoteAttachment } from '@/actions/attachments'
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

interface CreateNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
}

const ENTITY_TYPES = [
  { value: 'asset', label: 'Asset' },
  { value: 'shot', label: 'Shot' },
]

export function CreateNoteDialog({ open, onOpenChange, projectId }: CreateNoteDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [shots, setShots] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])

  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    entity_type: '' as '' | 'asset' | 'shot',
    entity_id: '',
    task_id: '',
    status: 'open',
  })

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, projectId])

  async function loadData() {
    const supabase = createClient()

    // Load assets
    const { data: assetsData, error: assetsError } = await supabase
      .from('assets')
      .select('id, name, code')
      .eq('project_id', projectId)
      .order('name')

    if (assetsError) console.error('Error loading assets:', assetsError)
    setAssets(assetsData || [])

    // Load shots
    const { data: shotsData, error: shotsError } = await supabase
      .from('shots')
      .select('id, name, code')
      .eq('project_id', projectId)
      .order('code')

    if (shotsError) console.error('Error loading shots:', shotsError)
    setShots(shotsData || [])

    // Load tasks
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('id, name, entity_type, entity_id')
      .eq('project_id', projectId)
      .order('name')

    if (tasksError) console.error('Error loading tasks:', tasksError)
    console.log('Loaded tasks:', tasksData)
    setTasks(tasksData || [])
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
        status: formData.status,
      })

      if (result.error) throw new Error(result.error)

      // Upload attachments if any
      if (selectedFiles.length > 0 && result.data?.id) {
        for (const file of selectedFiles) {
          const attachResult = await uploadNoteAttachment(file, result.data.id.toString())
          if (attachResult.error) {
            console.error('Error uploading attachment:', attachResult.error)
          }
        }
      }

      // Reset form
      setFormData({
        subject: '',
        content: '',
        entity_type: '',
        entity_id: '',
        task_id: '',
        status: 'open',
      })
      setSelectedFiles([])

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
    entityType === 'asset' ? assets :
    entityType === 'shot' ? shots :
    entityType === 'task' ? tasks :
    []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Note</DialogTitle>
          <DialogDescription>
            Add a comment or feedback to this project.
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
              <Label htmlFor="subject">Subject (Optional)</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Feedback on animation"
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="content">Note *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your note here..."
                rows={5}
                required
                disabled={isLoading}
              />
            </div>

            {/* File Attachments */}
            <div className="grid gap-2">
              <Label htmlFor="attachments">Attachments (Optional)</Label>
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
                className="cursor-pointer"
              />
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-md bg-zinc-800 px-2 py-1 text-xs"
                    >
                      <span className="text-zinc-300">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== index))}
                        className="text-zinc-500 hover:text-zinc-300"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="entity_type">Link To (Optional)</Label>
                  <Select
                    value={formData.entity_type}
                    onValueChange={(value: any) => {
                      setFormData({ ...formData, entity_type: value, entity_id: '', task_id: '' })
                    }}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
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
                </div>

                {formData.entity_type && formData.entity_type !== 'none' && (
                  <div className="grid gap-2">
                    <Label htmlFor="entity_id">
                      Select {formData.entity_type.charAt(0).toUpperCase() + formData.entity_type.slice(1)} *
                    </Label>
                    <Select
                      value={formData.entity_id}
                      onValueChange={(value) => setFormData({ ...formData, entity_id: value, task_id: '' })}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {entities.map((entity) => (
                          <SelectItem key={entity.id} value={entity.id.toString()}>
                            {entity.code ? `${entity.code} - ${entity.name}` : entity.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Task selector - only show when entity is selected */}
              {formData.entity_id && (
                <div className="grid gap-2">
                  <Label htmlFor="task_id">Task (Optional)</Label>
                  <Select
                    value={formData.task_id || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, task_id: value === 'none' ? '' : value })}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {tasks
                        .filter((task) =>
                          task.entity_type === formData.entity_type &&
                          task.entity_id === parseInt(formData.entity_id)
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
              {isLoading ? 'Creating...' : 'Create Note'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
