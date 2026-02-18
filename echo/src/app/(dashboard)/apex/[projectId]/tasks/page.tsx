'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { listStatusNames } from '@/lib/status/options'
import { listTagNames } from '@/lib/tags/options'
import { EntityTable } from '@/components/table/entity-table'
import { CreateTaskDialog } from '@/components/apex/create-task-dialog'
import { EditTaskDialog } from '@/components/apex/edit-task-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import { createTask, deleteTask, updateTask } from '@/actions/tasks'
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

function toBooleanLike(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  const normalized = asText(value).trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on'
}

function normalizeTaskEntityType(
  value: unknown
): 'asset' | 'shot' | 'sequence' | 'project' | null {
  const normalized = asText(value).trim().toLowerCase()
  if (
    normalized === 'asset' ||
    normalized === 'shot' ||
    normalized === 'sequence' ||
    normalized === 'project'
  ) {
    return normalized
  }
  return null
}

export default function TasksPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState<string>('')
  const [tasks, setTasks] = useState<any[]>([])
  const [departments, setDepartments] = useState<Array<{ id: number; name: string; code?: string | null }>>([])
  const [users, setUsers] = useState<
    Array<{ id: string; display_name?: string | null; full_name?: string | null; email?: string | null }>
  >([])
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
    await Promise.all([loadTasks(projId), loadTaskOptions()])
  }

  async function loadTaskOptions() {
    try {
      const supabase = createClient()
      const [usersResult, departmentsResult, nextTags, nextStatuses] = await Promise.all([
        supabase.from('profiles').select('id, display_name, full_name, email').order('full_name'),
        supabase.from('departments').select('id, name, code').order('name'),
        listTagNames(),
        listStatusNames('task'),
      ])

      if (usersResult.error) throw usersResult.error
      if (departmentsResult.error) throw departmentsResult.error

      setUsers(
        (usersResult.data || []) as Array<{
          id: string
          display_name?: string | null
          full_name?: string | null
          email?: string | null
        }>
      )
      setDepartments(
        (departmentsResult.data || []) as Array<{ id: number; name: string; code?: string | null }>
      )
      setTagNames(uniqueSorted(nextTags))
      setStatusNames(uniqueSorted(nextStatuses))
    } catch (error) {
      console.error('Error loading task options:', error)
      setUsers([])
      setDepartments([])
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
        .select('*, step:steps(name, code, department_id, department:departments(id, name, code)), project:projects(id, code, name)')
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
          .select('id, display_name, full_name, email')
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
        const stepName = asText(task.step?.name).trim() || 'No Step'
        const directDepartment = asText(task.department).trim()
        const stepDepartment = asText(task.step?.department_id).trim()
        const effectiveDepartment = directDepartment || stepDepartment || null
        const departmentLabel =
          asText(task.step?.department?.code).trim() ||
          asText(task.step?.department?.name).trim() ||
          (effectiveDepartment ? effectiveDepartment : 'No Department')

        return {
          ...task,
          reviewer: parseListValue(task.reviewer),
          ayon_assignees: parseListValue(task.ayon_assignees),
          ayon_sync_status: toBooleanLike(task.ayon_sync_status),
          cc: parseListValue(task.cc),
          tags: parseListValue(task.tags),
          versions: parseListValue(task.versions),
          entity_name: entityName,
          entity_code: entityCode,
          entity_display: `${task.name} (${entityCode})`,
          entity_type_display: entityType.charAt(0).toUpperCase() + entityType.slice(1),
          department: effectiveDepartment,
          department_label: departmentLabel,
          step_name: stepName,
          assignee_name:
            assignee?.display_name || assignee?.full_name || assignee?.email || 'Unassigned',
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

  const departmentLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const department of departments) {
      const id = asText(department.id).trim()
      if (!id) continue
      const label =
        asText(department.code).trim() ||
        asText(department.name).trim() ||
        id
      map.set(id, label)
    }
    return map
  }, [departments])

  const assigneeNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const user of users) {
      const id = asText(user.id).trim()
      if (!id) continue
      const label =
        asText(user.display_name).trim() ||
        asText(user.full_name).trim() ||
        asText(user.email).trim() ||
        id
      map.set(id, label)
    }
    return map
  }, [users])

  const departmentOptions = useMemo(
    () =>
      departments.map((department) => ({
        value: asText(department.id),
        label:
          asText(department.code).trim() ||
          asText(department.name).trim() ||
          asText(department.id),
      })),
    [departments]
  )

  const assigneeOptions = useMemo(
    () => [
      { value: '', label: 'Unassigned' },
      ...users.map((user) => ({
        value: user.id,
        label:
          asText(user.display_name).trim() ||
          asText(user.full_name).trim() ||
          asText(user.email).trim() ||
          user.id,
      })),
    ],
    [users]
  )

  const peopleMultiOptions = useMemo(
    () =>
      users.map((user) => ({
        value: user.id,
        label:
          asText(user.display_name).trim() ||
          asText(user.full_name).trim() ||
          asText(user.email).trim() ||
          user.id,
      })),
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

        if (column.id === 'department') {
          const departmentKey = asText(value).trim()
          next.department_label = departmentKey
            ? departmentLabelById.get(departmentKey) || departmentKey
            : 'No Department'
        }
        if (column.id === 'assigned_to') {
          const userKey = asText(value).trim()
          next.assignee_name = userKey ? assigneeNameById.get(userKey) || 'Unknown' : 'Unassigned'
          next.ayon_assignees = userKey ? [userKey] : []
        }

        return next
      })
    )
  }

  async function handleBulkDelete(rows: any[]) {
    const failures: string[] = []

    for (const row of rows) {
      const rowId = asText(row?.id).trim()
      if (!rowId) continue
      const result = await deleteTask(rowId, projectId)
      if (result?.error) {
        failures.push(`${asText(row?.name).trim() || rowId}: ${result.error}`)
      }
    }

    await refreshProjectData(projectId)

    if (failures.length > 0) {
      const preview = failures.slice(0, 3).join('; ')
      throw new Error(
        failures.length > 3 ? `${preview}; and ${failures.length - 3} more` : preview
      )
    }
  }

  async function handleCsvImport(rows: Record<string, unknown>[]) {
    const failed: Array<{ row: number; message: string }> = []
    let imported = 0

    const departmentLookup = new Map<string, string>()
    for (const department of departments) {
      const id = asText(department.id).trim()
      if (!id) continue
      departmentLookup.set(id, id)
      const code = asText(department.code).trim().toLowerCase()
      if (code) departmentLookup.set(code, id)
      const name = asText(department.name).trim().toLowerCase()
      if (name) departmentLookup.set(name, id)
    }

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index]
      const name = asText(row.name).trim()
      const entityType = normalizeTaskEntityType(row.entity_type)
      const entityId = asText(row.entity_id).trim()

      if (!name || !entityType || !entityId) {
        failed.push({
          row: index + 2,
          message: 'name, entity_type, and entity_id are required.',
        })
        continue
      }

      const rawDepartment =
        asText(row.department).trim() ||
        asText(row.department_id).trim() ||
        asText(row.department_label).trim()
      const normalizedDepartment = rawDepartment.toLowerCase()
      const resolvedDepartment =
        departmentLookup.get(rawDepartment) ||
        departmentLookup.get(normalizedDepartment) ||
        rawDepartment ||
        undefined
      const stepId = asText(row.step_id).trim() || undefined

      try {
        const result = await createTask({
          ...(row as Record<string, unknown>),
          project_id: projectId,
          name,
          entity_type: entityType,
          entity_id: entityId,
          department: resolvedDepartment,
          step_id: stepId,
          assigned_to: asText(row.assigned_to).trim() || undefined,
          status: asText(row.status).trim() || undefined,
          priority: asText(row.priority).trim() || undefined,
          due_date: asText(row.due_date).trim() || undefined,
          description: asText(row.description).trim() || undefined,
          reviewer: parseListValue(row.reviewer),
          ayon_assignees: parseListValue(row.ayon_assignees),
          cc: parseListValue(row.cc),
          tags: parseListValue(row.tags),
          versions: parseListValue(row.versions),
        })

        if (result?.error) {
          throw new Error(result.error)
        }
        imported += 1
      } catch (error) {
        failed.push({
          row: index + 2,
          message: error instanceof Error ? error.message : 'Failed to import task row.',
        })
      }
    }

    await refreshProjectData(projectId)
    return { imported, failed }
  }

  const listToString = (value: any) =>
    Array.isArray(value) ? value.join(', ') : ''
  const listToPeopleString = useCallback(
    (value: unknown) =>
      parseListValue(value)
        .map((item) => {
          const key = asText(item).trim()
          if (!key) return ''
          return assigneeNameById.get(key) || key
        })
        .filter(Boolean)
        .join(', '),
    [assigneeNameById]
  )
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
        id: 'department',
        label: 'Pipeline Step',
        type: 'text',
        width: '160px',
        editable: true,
        editor: 'select',
        options: departmentOptions,
        formatValue: (value: any, row: any) => {
          const key = asText(value).trim()
          if (!key) return asText(row.department_label).trim() || 'No Department'
          return (
            departmentLabelById.get(key) ||
            asText(row.department_label).trim() ||
            asText(row.step_name).trim() ||
            key
          )
        },
        parseValue: (value: string) => value.trim() || null,
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
        editor: 'multiselect',
        options: peopleMultiOptions,
        formatValue: listToPeopleString,
        parseValue: (value: any) => parseListValue(value),
      },
      {
        id: 'ayon_assignees',
        label: 'Ayon Assignees',
        type: 'text',
        width: '200px',
        editable: true,
        editor: 'multiselect',
        options: peopleMultiOptions,
        formatValue: listToPeopleString,
        parseValue: (value: any) => parseListValue(value),
      },
      {
        id: 'ayon_sync_status',
        label: 'Ayon Sync Status',
        type: 'boolean',
        width: '160px',
        editable: true,
        editor: 'checkbox',
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
    [
      projectId,
      departmentOptions,
      departmentLabelById,
      statusOptions,
      assigneeOptions,
      assigneeNameById,
      listToPeopleString,
      peopleMultiOptions,
      tagOptions,
    ]
  )

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading tasks...</p>
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
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-black transition hover:bg-primary"
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
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-black transition hover:bg-primary"
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
            csvExportFilename="apex-tasks"
            onCsvImport={handleCsvImport}
            onBulkDelete={handleBulkDelete}
            onAdd={() => setShowCreateDialog(true)}
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
