'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { createTask } from '@/actions/tasks'
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

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  defaultEntityType?: 'asset' | 'shot' | 'sequence'
  defaultEntityId?: string | number
  lockEntity?: boolean
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

export function CreateTaskDialog({
  open,
  onOpenChange,
  projectId,
  defaultEntityType,
  defaultEntityId,
  lockEntity = false,
}: CreateTaskDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assets, setAssets] = useState<any[]>([])
  const [shots, setShots] = useState<any[]>([])
  const [sequences, setSequences] = useState<any[]>([])
  const [steps, setSteps] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [projectLabel, setProjectLabel] = useState(projectId)
  const [showMoreFields, setShowMoreFields] = useState(false)
  const [extraFields, setExtraFields] = useState<Record<string, any>>({})

  const [formData, setFormData] = useState({
    name: '',
    entity_type: (defaultEntityType ?? 'asset') as 'asset' | 'shot' | 'sequence',
    entity_id: defaultEntityId ? String(defaultEntityId) : '',
    step_id: '',
    assigned_to: '',
    reviewer: '',
    start_date: '',
    end_date: '',
    status: 'pending',
    priority: 'medium',
    due_date: '',
    task_template: '',
    description: '',
  })

  useEffect(() => {
    if (!open) return
    setShowMoreFields(false)
    loadData()
  }, [open, projectId])

  useEffect(() => {
    if (!open) return
    setFormData((prev) => ({
      ...prev,
      entity_type: (defaultEntityType ?? prev.entity_type) as 'asset' | 'shot' | 'sequence',
      entity_id: defaultEntityId ? String(defaultEntityId) : prev.entity_id,
    }))
  }, [open, defaultEntityType, defaultEntityId])

  async function loadData() {
    const supabase = createClient()

    const [{ data: assetsData }, { data: shotsData }, { data: sequencesData }] =
      await Promise.all([
        supabase
          .from('assets')
          .select('id, name, code')
          .eq('project_id', projectId)
          .order('name'),
        supabase
          .from('shots')
          .select('id, name, code')
          .eq('project_id', projectId)
          .order('code'),
        supabase
          .from('sequences')
          .select('id, name, code')
          .eq('project_id', projectId)
          .order('code'),
      ])

    const [{ data: stepsData }, { data: usersData }, { data: projectData }] =
      await Promise.all([
        supabase.from('steps').select('id, name').order('sort_order'),
        supabase.from('profiles').select('id, full_name, email').order('full_name'),
        supabase
          .from('projects')
          .select('name, code')
          .eq('id', projectId)
          .maybeSingle(),
      ])

    setAssets(assetsData || [])
    setShots(shotsData || [])
    setSequences(sequencesData || [])
    setSteps(stepsData || [])
    setUsers(usersData || [])
    setProjectLabel(projectData?.code || projectData?.name || projectId)
  }

  const entities =
    formData.entity_type === 'asset'
      ? assets
      : formData.entity_type === 'shot'
        ? shots
        : sequences

  const linkedEntity = entities.find(
    (entity) => entity.id?.toString() === formData.entity_id
  )
  const linkedEntityLabel = linkedEntity
    ? `${linkedEntity.code || ''}${linkedEntity.name ? ` - ${linkedEntity.name}` : ''}`.trim()
    : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!formData.entity_id || !formData.step_id) {
      setError('Please set Link and Pipeline Step')
      setIsLoading(false)
      return
    }

    try {
      const result = await createTask({
        project_id: projectId,
        name: formData.name.trim(),
        entity_type: formData.entity_type,
        entity_id: formData.entity_id,
        step_id: formData.step_id,
        assigned_to: formData.assigned_to || undefined,
        reviewer: parseList(formData.reviewer),
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date || undefined,
        task_template: formData.task_template || null,
        description: formData.description || undefined,
        ...extraFields,
      })

      if (result.error) throw new Error(result.error)

      setFormData({
        name: '',
        entity_type: defaultEntityType ?? 'asset',
        entity_id: defaultEntityId ? String(defaultEntityId) : '',
        step_id: '',
        assigned_to: '',
        reviewer: '',
        start_date: '',
        end_date: '',
        status: 'pending',
        priority: 'medium',
        due_date: '',
        task_template: '',
        description: '',
      })
      setExtraFields({})
      setShowMoreFields(false)
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
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
              Create a new Task
            </DialogTitle>
            <DialogDescription className="sr-only">
              Create a new task and link it to an entity.
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="name" className={labelClass}>
                Task Name:
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

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="link_entity" className={labelClass}>
                Link:
              </Label>
              {lockEntity ? (
                <Input
                  id="link_entity"
                  value={linkedEntityLabel || `${formData.entity_type} #${formData.entity_id || '-'}`}
                  readOnly
                  className={inputClass}
                />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <Select
                    value={formData.entity_type}
                    onValueChange={(value: 'asset' | 'shot' | 'sequence') =>
                      setFormData({ ...formData, entity_type: value, entity_id: '' })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className={selectClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="shot">Shot</SelectItem>
                      <SelectItem value="sequence">Sequence</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={formData.entity_id || 'none'}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        entity_id: value === 'none' ? '' : value,
                      })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className={selectClass}>
                      <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select entity</SelectItem>
                      {entities.map((entity) => (
                        <SelectItem key={entity.id} value={entity.id.toString()}>
                          {entity.code} - {entity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="step_id" className={labelClass}>
                Pipeline Step:
              </Label>
              <Select
                value={formData.step_id || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, step_id: value === 'none' ? '' : value })
                }
                disabled={isLoading}
              >
                <SelectTrigger id="step_id" className={selectClass}>
                  <SelectValue placeholder="Select step" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select step</SelectItem>
                  {steps.map((step) => (
                    <SelectItem key={step.id} value={step.id.toString()}>
                      {step.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="assigned_to" className={labelClass}>
                Assigned To:
              </Label>
              <Select
                value={formData.assigned_to || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, assigned_to: value === 'none' ? '' : value })
                }
                disabled={isLoading}
              >
                <SelectTrigger id="assigned_to" className={selectClass}>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="reviewer" className={labelClass}>
                Reviewer:
              </Label>
              <Input
                id="reviewer"
                value={formData.reviewer}
                onChange={(e) => setFormData({ ...formData, reviewer: e.target.value })}
                placeholder="Comma separated reviewers"
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="start_date" className={labelClass}>
                Start Date:
              </Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="end_date" className={labelClass}>
                End Date:
              </Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="project_label" className={labelClass}>
                Project:
              </Label>
              <Input id="project_label" value={projectLabel} readOnly className={inputClass} />
            </div>

            <div className="pl-[120px]">
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="status" className="text-sm font-medium text-zinc-300">
                      Status
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
                        {STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="priority" className="text-sm font-medium text-zinc-300">
                      Priority
                    </Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData({ ...formData, priority: value })}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="priority" className={selectClass}>
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

                <div className="grid grid-cols-[120px_1fr] items-start gap-3">
                  <Label htmlFor="due_date" className={labelClass}>
                    Due Date:
                  </Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-[120px_1fr] items-start gap-3">
                  <Label htmlFor="task_template" className={labelClass}>
                    Task Template:
                  </Label>
                  <Input
                    id="task_template"
                    value={formData.task_template}
                    onChange={(e) =>
                      setFormData({ ...formData, task_template: e.target.value })
                    }
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-[120px_1fr] items-start gap-3">
                  <Label htmlFor="description" className={labelClass}>
                    Description:
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={4}
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>

                <SchemaExtraFields
                  entity="task"
                  values={extraFields}
                  onChange={setExtraFields}
                  disabled={isLoading}
                  title="More schema fields"
                  excludeColumns={new Set([
                    'name',
                    'assigned_to',
                    'reviewer',
                    'step_id',
                    'priority',
                    'due_date',
                    'description',
                    'status',
                    'start_date',
                    'end_date',
                    'task_template',
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
                {isLoading ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
