'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createTask } from '@/actions/tasks'
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

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
}

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'ip', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'on_hold', label: 'On Hold' },
]

export function CreateTaskDialog({ open, onOpenChange, projectId }: CreateTaskDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assets, setAssets] = useState<any[]>([])
  const [shots, setShots] = useState<any[]>([])
  const [steps, setSteps] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  const [formData, setFormData] = useState({
    name: '',
    entity_type: 'asset' as 'asset' | 'shot',
    entity_id: '',
    step_id: '',
    assigned_to: '',
    status: 'pending',
    priority: 'medium',
    due_date: '',
    description: '',
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

    // Load steps
    const { data: stepsData } = await supabase
      .from('steps')
      .select('id, name, code')
      .order('sort_order')

    setSteps(stepsData || [])

    // Load users
    const { data: usersData } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name')

    setUsers(usersData || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!formData.entity_id || !formData.step_id) {
      setError('Please select an entity and step')
      setIsLoading(false)
      return
    }

    try {
      const result = await createTask({
        project_id: projectId,
        ...formData,
      })

      if (result.error) throw new Error(result.error)

      // Reset form
      setFormData({
        name: '',
        entity_type: 'asset',
        entity_id: '',
        step_id: '',
        assigned_to: '',
        status: 'pending',
        priority: 'medium',
        due_date: '',
        description: '',
      })

      onOpenChange(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setIsLoading(false)
    }
  }

  const entities = formData.entity_type === 'asset' ? assets : shots

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>
            Assign a task to an asset or shot.
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
              <Label htmlFor="name">Task Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Model cleanup, Animation polish"
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="entity_type">Entity Type *</Label>
                <Select
                  value={formData.entity_type}
                  onValueChange={(value: 'asset' | 'shot') => {
                    setFormData({ ...formData, entity_type: value, entity_id: '' })
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="shot">Shot</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="entity_id">
                  {formData.entity_type === 'asset' ? 'Asset' : 'Shot'} *
                </Label>
                <Select
                  value={formData.entity_id}
                  onValueChange={(value) => setFormData({ ...formData, entity_id: value })}
                  disabled={isLoading}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id.toString()}>
                        {entity.code} - {entity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="step_id">Pipeline Step *</Label>
              <Select
                value={formData.step_id}
                onValueChange={(value) => setFormData({ ...formData, step_id: value })}
                disabled={isLoading}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select step..." />
                </SelectTrigger>
                <SelectContent>
                  {steps.map((step) => (
                    <SelectItem key={step.id} value={step.id.toString()}>
                      {step.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="assigned_to">Assign To</Label>
              <Select
                value={formData.assigned_to || 'unassigned'}
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value === 'unassigned' ? '' : value })}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                    {STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                disabled={isLoading}
              />
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
              {isLoading ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
