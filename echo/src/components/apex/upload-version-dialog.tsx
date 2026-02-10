'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createVersion, uploadVersionFile } from '@/actions/versions'
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
import { Upload } from 'lucide-react'

interface UploadVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
}

const ENTITY_TYPES = [
  { value: 'asset', label: 'Asset' },
  { value: 'shot', label: 'Shot' },
]

export function UploadVersionDialog({ open, onOpenChange, projectId }: UploadVersionDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [assets, setAssets] = useState<any[]>([])
  const [shots, setShots] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])

  const [formData, setFormData] = useState({
    code: '',
    version_number: 1,
    description: '',
    entity_type: '' as '' | 'asset' | 'shot',
    entity_id: '',
    task_id: '',
  })

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, projectId])

  async function loadData() {
    const supabase = createClient()

    // Load assets
    const { data: assetsData } = await supabase
      .from('assets')
      .select('id, name, code')
      .eq('project_id', projectId)
      .order('name')

    setAssets(assetsData || [])

    // Load shots
    const { data: shotsData } = await supabase
      .from('shots')
      .select('id, name, code')
      .eq('project_id', projectId)
      .order('code')

    setShots(shotsData || [])

    // Load tasks
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('id, name, entity_type, entity_id')
      .eq('project_id', projectId)
      .order('name')

    setTasks(tasksData || [])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // Auto-generate code from filename if not set
      if (!formData.code) {
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
        setFormData({ ...formData, code: nameWithoutExt })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setUploadProgress(0)

    if (!selectedFile) {
      setError('Please select a file to upload')
      setIsLoading(false)
      return
    }

    if (!formData.entity_type || !formData.entity_id) {
      setError('Please select an entity to link this version to')
      setIsLoading(false)
      return
    }

    try {
      // Upload file first
      setUploadProgress(25)
      const uploadResult = await uploadVersionFile(selectedFile, projectId)

      if (uploadResult.error) throw new Error(uploadResult.error)

      setUploadProgress(75)

      // Create version record
      const result = await createVersion({
        project_id: projectId,
        entity_type: formData.entity_type,
        entity_id: formData.entity_id,
        task_id: formData.task_id || undefined,
        code: formData.code,
        version_number: formData.version_number,
        description: formData.description || undefined,
        file_path: uploadResult.data?.path,
        movie_url: uploadResult.data?.publicUrl,
      })

      if (result.error) throw new Error(result.error)

      setUploadProgress(100)

      // Reset form
      setFormData({
        code: '',
        version_number: 1,
        description: '',
        entity_type: '',
        entity_id: '',
        task_id: '',
      })
      setSelectedFile(null)

      onOpenChange(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload version')
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
    }
  }

  const entities =
    formData.entity_type === 'asset' ? assets :
    formData.entity_type === 'shot' ? shots :
    formData.entity_type === 'task' ? tasks :
    []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Version</DialogTitle>
          <DialogDescription>
            Upload a new version of your work and link it to an entity.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-500">
                {error}
              </div>
            )}

            {/* File Upload */}
            <div className="grid gap-2">
              <Label htmlFor="file">File *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileSelect}
                  accept="image/*,video/*,.pdf,.zip"
                  disabled={isLoading}
                  className="cursor-pointer"
                />
                {selectedFile && (
                  <span className="text-sm text-zinc-400">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                )}
              </div>
              {selectedFile && (
                <p className="text-xs text-zinc-500">Selected: {selectedFile.name}</p>
              )}
            </div>

            {/* Entity Selection */}
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="entity_type">Link To *</Label>
                  <Select
                    value={formData.entity_type}
                    onValueChange={(value: any) => {
                      setFormData({ ...formData, entity_type: value, entity_id: '', task_id: '' })
                    }}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTITY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.entity_type && (
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

            {/* Version Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="code">Version Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., v001"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="version_number">Version Number *</Label>
                <Input
                  id="version_number"
                  type="number"
                  min="1"
                  value={formData.version_number}
                  onChange={(e) => setFormData({ ...formData, version_number: parseInt(e.target.value) })}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the changes in this version..."
                rows={3}
                disabled={isLoading}
              />
            </div>

            {/* Upload Progress */}
            {uploadProgress > 0 && (
              <div className="grid gap-2">
                <div className="h-2 w-full rounded-full bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-center text-zinc-400">Uploading... {uploadProgress}%</p>
              </div>
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
            <Button type="submit" disabled={isLoading}>
              <Upload className="mr-2 h-4 w-4" />
              {isLoading ? 'Uploading...' : 'Upload Version'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
