'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { listStatusNames } from '@/lib/status/options'
import { listTagNames } from '@/lib/tags/options'
import { EntityTable } from '@/components/table/entity-table'
import type { TableColumn } from '@/components/table/types'
import { deleteTask, updateTask } from '@/actions/tasks'
import { CreateTaskDialog } from '@/components/apex/create-task-dialog'
import { EditTaskDialog } from '@/components/apex/edit-task-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'

type LinkedEntityType = 'asset' | 'shot' | 'sequence'

interface EntityTasksPanelProps {
  projectId: string
  entityType: LinkedEntityType
  entityId: string
}

type TaskRow = Record<string, unknown> & {
  id: number | string
  step_name?: string
  department?: string | null
  department_label?: string
  assignee_name?: string
  ayon_assignees?: string[]
}

interface TaskUser {
  id: string
  display_name?: string | null
  full_name?: string | null
  email?: string | null
}

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

export function EntityTasksPanel({
  projectId,
  entityType,
  entityId,
}: EntityTasksPanelProps) {
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [departments, setDepartments] = useState<Array<{ id: number; name: string; code?: string | null }>>([])
  const [users, setUsers] = useState<TaskUser[]>([])
  const [statusNames, setStatusNames] = useState<string[]>([])
  const [tagNames, setTagNames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null)

  const loadTasks = useCallback(async (
    projId: string,
    nextEntityType: LinkedEntityType,
    rawEntityId: string
  ) => {
    try {
      setIsLoading(true)
      const supabase = createClient()
      const parsedEntityId = Number(rawEntityId)
      const normalizedEntityId = Number.isNaN(parsedEntityId) ? rawEntityId : parsedEntityId

      const [tasksResult, usersResult, departmentsResult, nextStatusNames, nextTagNames] =
        await Promise.all([
          supabase
            .from('tasks')
            .select(
              `
              *,
              step:steps(id, name, code, department_id, department:departments(id, name, code)),
              assigned_profile:profiles!tasks_assigned_to_fkey(id, display_name, full_name, email),
              project:projects(id, code, name)
            `
            )
            .eq('project_id', projId)
            .eq('entity_type', nextEntityType)
            .eq('entity_id', normalizedEntityId)
            .order('created_at', { ascending: false }),
          supabase.from('profiles').select('id, display_name, full_name, email').order('full_name'),
          supabase.from('departments').select('id, name, code').order('name'),
          listStatusNames('task'),
          listTagNames(),
        ])

      if (tasksResult.error) throw tasksResult.error
      if (usersResult.error) throw usersResult.error
      if (departmentsResult.error) throw departmentsResult.error

      setUsers((usersResult.data || []) as TaskUser[])
      setDepartments(
        (departmentsResult.data || []) as Array<{
          id: number
          name: string
          code?: string | null
        }>
      )
      setStatusNames(uniqueSorted(nextStatusNames))
      setTagNames(uniqueSorted(nextTagNames))

      const departmentLabelById = new Map<string, string>()
      for (const department of departmentsResult.data || []) {
        const key = asText(department.id).trim()
        if (!key) continue
        const label =
          asText(department.code).trim() ||
          asText(department.name).trim() ||
          key
        departmentLabelById.set(key, label)
      }

      const tableData: TaskRow[] = (tasksResult.data || []).map((task) => ({
        ...task,
        department: (() => {
          const direct = asText(task.department).trim()
          if (direct) return direct
          const fromStep = asText(task.step?.department_id).trim()
          return fromStep || null
        })(),
        department_label: (() => {
          const direct = asText(task.department).trim()
          if (direct) {
            return (
              departmentLabelById.get(direct) ||
              asText(task.step?.department?.code).trim() ||
              asText(task.step?.department?.name).trim() ||
              direct
            )
          }
          const fromStep = asText(task.step?.department_id).trim()
          if (!fromStep) {
            return asText(task.step?.name).trim() || 'No Department'
          }
          return (
            departmentLabelById.get(fromStep) ||
            asText(task.step?.department?.code).trim() ||
            asText(task.step?.department?.name).trim() ||
            asText(task.step?.name).trim() ||
            fromStep
          )
        })(),
        reviewer: parseListValue(task.reviewer),
        ayon_assignees: parseListValue(task.ayon_assignees),
        ayon_sync_status: toBooleanLike(task.ayon_sync_status),
        cc: parseListValue(task.cc),
        tags: parseListValue(task.tags),
        versions: parseListValue(task.versions),
        step_name: task.step?.name || 'No Step',
        assignee_name:
          task.assigned_profile?.display_name ||
          task.assigned_profile?.full_name ||
          task.assigned_profile?.email ||
          'Unassigned',
        project_label: task.project ? task.project.code || task.project.name : '',
      }))

      setTasks(tableData)
    } catch (error) {
      console.error(`Error loading ${entityType} tasks:`, error)
      setTasks([])
      setDepartments([])
      setUsers([])
      setStatusNames([])
      setTagNames([])
    } finally {
      setIsLoading(false)
    }
  }, [entityType])

  useEffect(() => {
    if (!projectId || !entityId) return
    void loadTasks(projectId, entityType, entityId)
  }, [projectId, entityType, entityId, loadTasks])

  function refreshTasks() {
    if (!projectId || !entityId) return
    void loadTasks(projectId, entityType, entityId)
  }

  async function handleCellUpdate(
    row: TaskRow,
    column: TableColumn,
    value: unknown
  ) {
    const result = await updateTask(String(row.id), { [column.id]: value }, { revalidate: false })
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
          next.assignee_name = userKey
            ? assigneeNameById.get(userKey) || 'Unknown'
            : 'Unassigned'
          next.ayon_assignees = userKey ? [userKey] : []
        }
        return next
      })
    )
  }

  function handleEdit(task: TaskRow) {
    setSelectedTask(task)
    setShowEditDialog(true)
  }

  function handleDelete(task: TaskRow) {
    setSelectedTask(task)
    setShowDeleteDialog(true)
  }

  async function handleDeleteConfirm() {
    if (!selectedTask) return { error: 'No task selected' }
    return deleteTask(String(selectedTask.id), projectId)
  }

  const assigneeNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const user of users) {
      const key = asText(user.id).trim()
      if (!key) continue
      const label =
        asText(user.display_name).trim() ||
        asText(user.full_name).trim() ||
        asText(user.email).trim() ||
        key
      map.set(key, label)
    }
    return map
  }, [users])

  const departmentLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const department of departments) {
      const key = asText(department.id).trim()
      if (!key) continue
      const label =
        asText(department.code).trim() ||
        asText(department.name).trim() ||
        key
      map.set(key, label)
    }
    return map
  }, [departments])

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

  const assigneeSelectOptions = useMemo(
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

  const listToString = (value: unknown) => parseListValue(value).join(', ')
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
        linkHref: (row: Record<string, unknown>) => `/apex/${projectId}/tasks/${row.id}`,
      },
      {
        id: 'department',
        label: 'Pipeline Step',
        type: 'text',
        width: '160px',
        editable: true,
        editor: 'select',
        options: departmentOptions,
        formatValue: (value: unknown, row: Record<string, unknown>) => {
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
      { id: 'description', label: 'Description', type: 'text', editable: true, editor: 'textarea' },
      {
        id: 'status',
        label: 'Status',
        type: 'status',
        width: '100px',
        editable: true,
        editor: 'select',
        options: statusOptions,
      },
      {
        id: 'assigned_to',
        label: 'Assigned To',
        type: 'text',
        width: '170px',
        editable: true,
        editor: 'select',
        options: assigneeSelectOptions,
        formatValue: (value: unknown, row: Record<string, unknown>) => {
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
        width: '180px',
        editable: true,
        editor: 'multiselect',
        options: peopleMultiOptions,
        formatValue: listToPeopleString,
        parseValue: (value: unknown) => parseListValue(value),
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
        parseValue: (value: unknown) => parseListValue(value),
      },
      {
        id: 'ayon_sync_status',
        label: 'Ayon Sync Status',
        type: 'boolean',
        width: '160px',
        editable: true,
        editor: 'checkbox',
      },
      { id: 'start_date', label: 'Start Date', type: 'date', width: '120px', editable: true, editor: 'date' },
      { id: 'end_date', label: 'End Date', type: 'date', width: '120px', editable: true, editor: 'date' },
      { id: 'bid', label: 'Bid', type: 'number', width: '80px', editable: true, editor: 'number' },
      { id: 'duration', label: 'Duration', type: 'number', width: '90px', editable: true, editor: 'number' },
      { id: 'bid_breakdown', label: 'Bid Breakdown', type: 'text', width: '160px', editable: true, editor: 'text' },
      { id: 'casting', label: 'Casting', type: 'text', width: '120px', editable: true, editor: 'text' },
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
      { id: 'ddna_bid', label: 'DDNA Bid', type: 'text', width: '120px', editable: true, editor: 'text' },
      { id: 'ddna_id', label: 'DDNA ID#', type: 'text', width: '120px', editable: true, editor: 'text' },
      { id: 'ddna_to', label: 'DDNA TO#', type: 'text', width: '120px', editable: true, editor: 'text' },
      { id: 'due_date', label: 'Due Date', type: 'date', width: '120px', editable: true, editor: 'date' },
      { id: 'gantt_bar_color', label: 'Gantt Bar Color', type: 'text', width: '140px', editable: true, editor: 'text' },
      { id: 'id', label: 'Id', type: 'text', width: '80px' },
      { id: 'inventory_date', label: 'Inventory Date', type: 'date', width: '140px', editable: true, editor: 'date' },
      { id: 'milestone', label: 'Milestone', type: 'text', width: '140px', editable: true, editor: 'checkbox' },
      { id: 'priority', label: 'Priority', type: 'text', width: '90px', editable: true, editor: 'text' },
      { id: 'notes', label: 'Notes', type: 'text', width: '160px', editable: true, editor: 'textarea' },
      { id: 'prod_comments', label: 'Prod Comments', type: 'text', width: '160px', editable: true, editor: 'textarea' },
      { id: 'project_label', label: 'Project', type: 'text', width: '120px' },
      { id: 'proposed_start_date', label: 'Proposed Start Date', type: 'date', width: '160px', editable: true, editor: 'date' },
      { id: 'publish_version_number', label: 'Publish Version Number', type: 'text', width: '180px', editable: true, editor: 'text' },
      {
        id: 'tags',
        label: 'Tags',
        type: 'text',
        width: '160px',
        editable: true,
        editor: 'multiselect',
        options: tagOptions,
        formatValue: listToString,
        parseValue: (value: unknown) => parseListValue(value),
      },
      { id: 'task_complexity', label: 'Task Complexity', type: 'text', width: '140px', editable: true, editor: 'text' },
      { id: 'task_template', label: 'Task Template', type: 'text', width: '160px', editable: true, editor: 'text' },
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
    ],
    [
      assigneeNameById,
      assigneeSelectOptions,
      departmentLabelById,
      departmentOptions,
      listToPeopleString,
      peopleMultiOptions,
      projectId,
      statusOptions,
      tagOptions,
    ]
  )

  return (
    <>
      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) refreshTasks()
        }}
        projectId={projectId}
        defaultEntityType={entityType}
        defaultEntityId={entityId}
        lockEntity
      />

      <EditTaskDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) refreshTasks()
        }}
        task={selectedTask}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        itemName={String(selectedTask?.name || '')}
        onConfirm={handleDeleteConfirm}
      />

      <div className="flex h-full min-h-0 flex-col p-6">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-md border border-border bg-background/70 p-6">
            <h3 className="text-sm font-semibold text-foreground">Tasks</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              No tasks linked to this {entityType} yet.
            </p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-black transition hover:bg-primary"
            >
              Add Task
            </button>
          </div>
        ) : (
          <div className="min-h-0 flex-1">
            <EntityTable
              columns={columns}
              data={tasks}
              entityType={`tasks_${entityType}`}
              groupBy="department_label"
              onAdd={() => setShowCreateDialog(true)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onCellUpdate={handleCellUpdate}
            />
          </div>
        )}
      </div>
    </>
  )
}
