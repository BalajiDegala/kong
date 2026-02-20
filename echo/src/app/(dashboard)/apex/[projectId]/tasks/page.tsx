'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { CreateTaskDialog } from '@/components/apex/create-task-dialog'
import { EditTaskDialog } from '@/components/apex/edit-task-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import { createTask, deleteTask } from '@/actions/tasks'
import { useEntityData } from '@/hooks/use-entity-data'
import { asText, parseTextArray } from '@/lib/fields'
import type { TableColumn } from '@/components/table/types'
import { ListTodo, Plus } from 'lucide-react'

type TaskRow = Record<string, unknown> & { id: string | number }

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

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
  const [rawTasks, setRawTasks] = useState<TaskRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cellError, setCellError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null)

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId)
      void loadTasks(p.projectId)
    })
  }, [params])

  async function loadTasks(projId: string) {
    try {
      setIsLoading(true)
      setCellError(null)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRawTasks((data || []) as TaskRow[])
    } catch (error) {
      console.error('Error loading tasks:', error)
      setRawTasks([])
    } finally {
      setIsLoading(false)
    }
  }

  const columnOverrides = useMemo<Record<string, Partial<TableColumn>>>(() => ({
    name: {
      label: 'Task Name',
      type: 'link',
      linkHref: (row: Record<string, unknown>) => `/apex/${projectId}/tasks/${row.id}`,
    },
    priority: {
      editable: true,
      editor: 'select',
      options: PRIORITY_OPTIONS,
    },
  }), [projectId])

  const { data, columns, handleCellUpdate } = useEntityData({
    entity: 'task',
    rows: rawTasks,
    projectId,
    columnOverrides,
  })

  function refreshProjectData() {
    if (!projectId) return
    void loadTasks(projectId)
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
    return await deleteTask(String(selectedTask.id), projectId)
  }

  async function handleBulkDelete(rows: TaskRow[]) {
    const failures: string[] = []
    for (const row of rows) {
      const rowId = asText(row?.id).trim()
      if (!rowId) continue
      const result = await deleteTask(rowId, projectId)
      if (result?.error) {
        failures.push(`${asText(row?.name).trim() || rowId}: ${result.error}`)
      }
    }
    refreshProjectData()
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

    const supabase = createClient()
    const { data: departments } = await supabase
      .from('departments')
      .select('id, name, code')

    const departmentLookup = new Map<string, string>()
    for (const dept of (departments || []) as Array<{ id: number; name: string; code?: string | null }>) {
      const id = asText(dept.id).trim()
      if (!id) continue
      departmentLookup.set(id, id)
      const code = asText(dept.code).trim().toLowerCase()
      if (code) departmentLookup.set(code, id)
      const name = asText(dept.name).trim().toLowerCase()
      if (name) departmentLookup.set(name, id)
    }

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index]
      const name = asText(row.name).trim()
      const entityType = normalizeTaskEntityType(row.entity_type)
      const entityId = asText(row.entity_id).trim()

      if (!name || !entityType || !entityId) {
        failed.push({ row: index + 2, message: 'name, entity_type, and entity_id are required.' })
        continue
      }

      const rawDepartment =
        asText(row.department).trim() ||
        asText(row.department_id).trim() ||
        asText(row.department_label).trim()
      const resolvedDepartment =
        departmentLookup.get(rawDepartment) ||
        departmentLookup.get(rawDepartment.toLowerCase()) ||
        rawDepartment ||
        undefined

      try {
        const result = await createTask({
          ...(row as Record<string, unknown>),
          project_id: projectId,
          name,
          entity_type: entityType,
          entity_id: entityId,
          department: resolvedDepartment,
          step_id: asText(row.step_id).trim() || undefined,
          assigned_to: asText(row.assigned_to).trim() || undefined,
          status: asText(row.status).trim() || undefined,
          priority: asText(row.priority).trim() || undefined,
          due_date: asText(row.due_date).trim() || undefined,
          description: asText(row.description).trim() || undefined,
          reviewer: parseTextArray(row.reviewer),
          ayon_assignees: parseTextArray(row.ayon_assignees),
          cc: parseTextArray(row.cc),
          tags: parseTextArray(row.tags),
          versions: parseTextArray(row.versions),
        })

        if (result?.error) throw new Error(result.error)
        imported += 1
      } catch (error) {
        failed.push({
          row: index + 2,
          message: error instanceof Error ? error.message : 'Failed to import task row.',
        })
      }
    }

    refreshProjectData()
    return { imported, failed }
  }

  async function onCellUpdate(
    row: Record<string, unknown>,
    column: TableColumn,
    value: unknown
  ) {
    setCellError(null)
    await handleCellUpdate(row, column, value)
    const rowId = String(row.id)
    setRawTasks((prev) =>
      prev.map((t) =>
        String(t.id) === rowId ? { ...t, [column.id]: value } : t
      )
    )
  }

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
          if (!open) refreshProjectData()
        }}
        projectId={projectId}
      />

      <EditTaskDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) refreshProjectData()
        }}
        task={selectedTask}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        itemName={asText(selectedTask?.name)}
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

        {data.length === 0 ? (
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
            data={data}
            entityType="tasks"
            csvExportFilename="apex-tasks"
            onCsvImport={handleCsvImport}
            onBulkDelete={(rows) => handleBulkDelete(rows as TaskRow[])}
            onAdd={() => setShowCreateDialog(true)}
            onEdit={(row) => handleEdit(row as TaskRow)}
            onDelete={(row) => handleDelete(row as TaskRow)}
            onCellUpdate={onCellUpdate}
            onCellUpdateError={setCellError}
          />
        )}
      </ApexPageShell>
    </>
  )
}
