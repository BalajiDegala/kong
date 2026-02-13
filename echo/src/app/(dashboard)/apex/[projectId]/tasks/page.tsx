'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { listStatusNames } from '@/lib/status/options'
import { listTagNames } from '@/lib/tags/options'
import { EntityTable } from '@/components/table/entity-table'
import { CreateTaskDialog } from '@/components/apex/create-task-dialog'
import { EditTaskDialog } from '@/components/apex/edit-task-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import { deleteTask, updateTask } from '@/actions/tasks'
import type { TableColumn } from '@/components/table/types'
import { ListTodo, Plus } from 'lucide-react'

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

function asText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function parseListValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asText(item).trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b))
}

export default function TasksPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState<string>('')
  const [tasks, setTasks] = useState<any[]>([])
  const [steps, setSteps] = useState<Array<{ id: number; name: string }>>([])
  const [users, setUsers] = useState<Array<{ id: string; full_name?: string | null; email?: string | null }>>([])
  const [statusNames, setStatusNames] = useState<string[]>([])
  const [tagNames, setTagNames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cellError, setCellError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId)
      void refreshProjectData(p.projectId)
    })
  }, [params])

  async function refreshProjectData(projId: string) {
    if (!projId) return
    await Promise.all([loadTasks(projId), loadTaskOptions(projId)])
  }

  async function loadTaskOptions(projId: string) {
    try {
      const supabase = createClient()
      const [stepsResult, usersResult, nextTags, nextStatuses] = await Promise.all([
        supabase.from('steps').select('id, name').order('sort_order'),
        supabase.from('profiles').select('id, full_name, email').order('full_name'),
        listTagNames(),
        listStatusNames('task'),
      ])

      if (stepsResult.error) throw stepsResult.error
      if (usersResult.error) throw usersResult.error

      setSteps((stepsResult.data || []) as Array<{ id: number; name: string }>)
      setUsers(
        (usersResult.data || []) as Array<{ id: string; full_name?: string | null; email?: string | null }>
      )
      setTagNames(uniqueSorted(nextTags))
      setStatusNames(uniqueSorted(nextStatuses))
    } catch (error) {
      console.error('Error loading task options:', error)
      setSteps([])
      setUsers([])
      setTagNames([])
      setStatusNames([])
    }
  }

  async function loadTasks(projId: string) {
    try {
      setIsLoading(true)
      setCellError(null)
      const supabase = createClient()

      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select('*, steps(name, code), project:projects(id, code, name)')
        .eq('project_id', projId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading tasks:', error)
        setTasks([])
        return
      }

      const assetIds =
        tasksData
          ?.filter((item) => item.entity_type === 'asset')
          .map((item) => item.entity_id)
          .filter(Boolean) || []
      const shotIds =
        tasksData
          ?.filter((item) => item.entity_type === 'shot')
          .map((item) => item.entity_id)
          .filter(Boolean) || []
      const sequenceIds =
        tasksData
          ?.filter((item) => item.entity_type === 'sequence')
          .map((item) => item.entity_id)
          .filter(Boolean) || []
      const assignedUserIds = Array.from(
        new Set((tasksData || []).map((item) => item.assigned_to).filter(Boolean))
      )

      let assetsById: Record<number, any> = {}
      let shotsById: Record<number, any> = {}
      let sequencesById: Record<number, any> = {}
      let assigneesById: Record<string, any> = {}

      if (assetIds.length > 0) {
        const { data } = await supabase.from('assets').select('id, name, code').in('id', assetIds)
        assetsById = (data || []).reduce(
          (acc, row) => ({ ...acc, [row.id]: row }),
          {} as Record<number, any>
        )
      }

      if (shotIds.length > 0) {
        const { data } = await supabase.from('shots').select('id, name, code').in('id', shotIds)
        shotsById = (data || []).reduce(
          (acc, row) => ({ ...acc, [row.id]: row }),
          {} as Record<number, any>
        )
      }

      if (sequenceIds.length > 0) {
        const { data } = await supabase.from('sequences').select('id, name, code').in('id', sequenceIds)
        sequencesById = (data || []).reduce(
          (acc, row) => ({ ...acc, [row.id]: row }),
          {} as Record<number, any>
        )
      }

      if (assignedUserIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', assignedUserIds)
        assigneesById = (data || []).reduce(
          (acc, row) => ({ ...acc, [row.id]: row }),
          {} as Record<string, any>
        )
      }

      const tableData = (tasksData || []).map((task) => {
        let entityName = 'N/A'
        let entityCode = '-'

        if (task.entity_type === 'asset' && task.entity_id) {
          const entity = assetsById[task.entity_id]
          entityName = entity?.name || 'Unknown Asset'
          entityCode = entity?.code || '-'
        } else if (task.entity_type === 'shot' && task.entity_id) {
          const entity = shotsById[task.entity_id]
          entityName = entity?.name || 'Unknown Shot'
          entityCode = entity?.code || '-'
        } else if (task.entity_type === 'sequence' && task.entity_id) {
          const entity = sequencesById[task.entity_id]
          entityName = entity?.name || 'Unknown Sequence'
          entityCode = entity?.code || '-'
        }

        const assignee = task.assigned_to ? assigneesById[task.assigned_to] : null
        const entityType = asText(task.entity_type) || 'unknown'
        const stepName = asText(task.steps?.name).trim() || 'No Step'

        return {
          ...task,
          reviewer: parseListValue(task.reviewer),
          cc: parseListValue(task.cc),
          tags: parseListValue(task.tags),
          versions: parseListValue(task.versions),
          entity_name: entityName,
          entity_code: entityCode,
          entity_display: `${task.name} (${entityCode})`,
          entity_type_display: entityType.charAt(0).toUpperCase() + entityType.slice(1),
          step_name: stepName,
          assignee_name: assignee?.full_name || assignee?.email || 'Unassigned',
          project_label: task.project ? task.project.code || task.project.name : '',
        }
      })

      setTasks(tableData)
    } catch (error) {
      console.error('Error loading tasks:', error)
      setTasks([])
    } finally {
      setIsLoading(false)
    }
  }

  const stepNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const step of steps) {
      const id = asText(step.id).trim()
      if (!id) continue
      map.set(id, step.name || id)
    }
    return map
  }, [steps])

  const assigneeNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const user of users) {
      const id = asText(user.id).trim()
      if (!id) continue
      const label = asText(user.full_name).trim() || asText(user.email).trim() || id
      map.set(id, label)
    }
    return map
  }, [users])

  const stepOptions = useMemo(
    () =>
      steps.map((step) => ({
        value: asText(step.id),
        label: step.name || asText(step.id),
      })),
    [steps]
  )

  const assigneeOptions = useMemo(
    () => [
      { value: '', label: 'Unassigned' },
      ...users.map((user) => ({
        value: user.id,
        label: asText(user.full_name).trim() || asText(user.email).trim() || user.id,
      })),
    ],
    [users]
  )

  const statusOptions = useMemo(() => {
    const values = new Set<string>()
    for (const status of statusNames) {
      const normalized = status.trim()
      if (normalized) values.add(normalized)
    }
    for (const task of tasks) {
      const normalized = asText(task.status).trim()
      if (normalized) values.add(normalized)
    }
    return Array.from(values).map((value) => ({ value, label: value }))
  }, [statusNames, tasks])

  const tagOptions = useMemo(() => {
    const values = new Set<string>()
    for (const tag of tagNames) {
      const normalized = tag.trim()
      if (normalized) values.add(normalized)
    }
    for (const task of tasks) {
      for (const tag of parseListValue(task.tags)) {
        values.add(tag)
      }
    }
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value }))
  }, [tagNames, tasks])

  function handleEdit(task: any) {
    setSelectedTask(task)
    setShowEditDialog(true)
  }

  function handleDelete(task: any) {
    setSelectedTask(task)
    setShowDeleteDialog(true)
  }

  async function handleDeleteConfirm() {
    if (!selectedTask) return { error: 'No task selected' }
    return await deleteTask(selectedTask.id, projectId)
  }

  async function handleCellUpdate(row: any, column: TableColumn, value: any) {
    setCellError(null)
    const result = await updateTask(row.id, { [column.id]: value }, { revalidate: false, projectId })
    if (result.error) {
      throw new Error(result.error)
    }

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== row.id) return task
        const next = { ...task, [column.id]: value }

        if (column.id === 'step_id') {
          const stepKey = asText(value).trim()
          next.step_name = stepNameById.get(stepKey) || 'No Step'
        }
        if (column.id === 'assigned_to') {
          const userKey = asText(value).trim()
          next.assignee_name = userKey ? assigneeNameById.get(userKey) || 'Unknown' : 'Unassigned'
        }

        return next
      })
    )
  }

  const listToString = (value: any) =>
    Array.isArray(value) ? value.join(', ') : ''
  const stringToList = (value: string) => parseListValue(value)

  const columns = useMemo<TableColumn[]>(
    () => [
      {
        id: 'name',
        label: 'Task Name',
        type: 'link',
        width: '200px',
        editable: true,
        editor: 'text',
        linkHref: (row: any) => `/apex/${projectId}/tasks/${row.id}`,
      },
      {
        id: 'step_id',
        label: 'Pipeline Step',
        type: 'text',
        width: '160px',
        editable: true,
        editor: 'select',
        options: stepOptions,
        formatValue: (value: any, row: any) => {
          const key = asText(value).trim()
          if (!key) return asText(row.step_name).trim() || '-'
          return stepNameById.get(key) || asText(row.step_name).trim() || key
        },
        parseValue: (value: string) => {
          const normalized = value.trim()
          if (!normalized) return null
          const parsed = Number(normalized)
          return Number.isNaN(parsed) ? normalized : parsed
        },
      },
      {
        id: 'status',
        label: 'Status',
        type: 'status',
        width: '130px',
        editable: true,
        editor: 'select',
        options: statusOptions,
      },
      {
        id: 'priority',
        label: 'Priority',
        type: 'text',
        width: '110px',
        editable: true,
        editor: 'select',
        options: PRIORITY_OPTIONS,
      },
      {
        id: 'assigned_to',
        label: 'Assigned To',
        type: 'text',
        width: '170px',
        editable: true,
        editor: 'select',
        options: assigneeOptions,
        formatValue: (value: any, row: any) => {
          const key = asText(value).trim()
          if (!key) return 'Unassigned'
          return assigneeNameById.get(key) || asText(row.assignee_name).trim() || key
        },
        parseValue: (value: string) => {
          const normalized = value.trim()
          return normalized || null
        },
      },
      {
        id: 'reviewer',
        label: 'Reviewer',
        type: 'text',
        width: '160px',
        editable: true,
        editor: 'text',
        formatValue: listToString,
        parseValue: stringToList,
      },
      {
        id: 'tags',
        label: 'Tags',
        type: 'text',
        width: '180px',
        editable: true,
        editor: 'multiselect',
        options: tagOptions,
        formatValue: listToString,
        parseValue: (value: any) => parseListValue(value),
      },
      { id: 'description', label: 'Description', type: 'text', editable: true, editor: 'textarea' },
      { id: 'start_date', label: 'Start Date', type: 'date', width: '120px', editable: true, editor: 'date' },
      { id: 'end_date', label: 'End Date', type: 'date', width: '120px', editable: true, editor: 'date' },
      { id: 'due_date', label: 'Due Date', type: 'date', width: '120px', editable: true, editor: 'date' },
      {
        id: 'cc',
        label: 'Cc',
        type: 'text',
        width: '120px',
        editable: true,
        editor: 'text',
        formatValue: listToString,
        parseValue: stringToList,
      },
      { id: 'task_template', label: 'Task Template', type: 'text', width: '160px', editable: true, editor: 'text' },
      { id: 'task_complexity', label: 'Task Complexity', type: 'text', width: '140px', editable: true, editor: 'text' },
      { id: 'bid', label: 'Bid', type: 'number', width: '80px', editable: true, editor: 'number' },
      { id: 'duration', label: 'Duration', type: 'number', width: '90px', editable: true, editor: 'number' },
      { id: 'bid_breakdown', label: 'Bid Breakdown', type: 'text', width: '160px', editable: true, editor: 'text' },
      { id: 'casting', label: 'Casting', type: 'text', width: '120px', editable: true, editor: 'text' },
      { id: 'ddna_bid', label: 'DDNA Bid', type: 'text', width: '120px', editable: true, editor: 'text' },
      { id: 'ddna_id', label: 'DDNA ID#', type: 'text', width: '120px', editable: true, editor: 'text' },
      { id: 'ddna_to', label: 'DDNA TO#', type: 'text', width: '120px', editable: true, editor: 'text' },
      { id: 'gantt_bar_color', label: 'Gantt Bar Color', type: 'text', width: '140px', editable: true, editor: 'text' },
      { id: 'inventory_date', label: 'Inventory Date', type: 'date', width: '140px', editable: true, editor: 'date' },
      { id: 'milestone', label: 'Milestone', type: 'text', width: '140px', editable: true, editor: 'checkbox' },
      { id: 'notes', label: 'Notes', type: 'text', width: '160px', editable: true, editor: 'textarea' },
      { id: 'prod_comments', label: 'Prod Comments', type: 'text', width: '170px', editable: true, editor: 'textarea' },
      { id: 'project_label', label: 'Project', type: 'text', width: '120px' },
      { id: 'proposed_start_date', label: 'Proposed Start Date', type: 'date', width: '170px', editable: true, editor: 'date' },
      { id: 'publish_version_number', label: 'Publish Version Number', type: 'text', width: '180px', editable: true, editor: 'text' },
      { id: 'thumbnail_url', label: 'Thumbnail', type: 'thumbnail', width: '80px' },
      {
        id: 'versions',
        label: 'Versions',
        type: 'text',
        width: '160px',
        editable: true,
        editor: 'text',
        formatValue: listToString,
        parseValue: stringToList,
      },
      { id: 'id', label: 'Id', type: 'text', width: '80px' },
    ],
    [projectId, stepOptions, stepNameById, statusOptions, assigneeOptions, assigneeNameById, tagOptions]
  )

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-400">Loading tasks...</p>
      </div>
    )
  }

  return (
    <>
      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) void refreshProjectData(projectId)
        }}
        projectId={projectId}
      />

      <EditTaskDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) void refreshProjectData(projectId)
        }}
        task={selectedTask}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        itemName={selectedTask?.entity_display || ''}
        onConfirm={handleDeleteConfirm}
      />

      <ApexPageShell
        title="Tasks"
        action={
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </button>
        }
      >
        {cellError && (
          <div className="mb-4 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {cellError}
          </div>
        )}

        {tasks.length === 0 ? (
          <ApexEmptyState
            icon={<ListTodo className="h-12 w-12" />}
            title="No tasks yet"
            description="Create your first task to start tracking work."
            action={
              <button
                onClick={() => setShowCreateDialog(true)}
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
              >
                Create First Task
              </button>
            }
          />
        ) : (
          <EntityTable
            columns={columns}
            data={tasks}
            entityType="tasks"
            onAdd={() => setShowCreateDialog(true)}
            groupBy="step_name"
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCellUpdate={handleCellUpdate}
            onCellUpdateError={setCellError}
          />
        )}
      </ApexPageShell>
    </>
  )
}
