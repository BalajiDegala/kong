'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import type { TableColumn } from '@/components/table/types'
import { deleteTask } from '@/actions/tasks'
import { CreateTaskDialog } from '@/components/apex/create-task-dialog'
import { EditTaskDialog } from '@/components/apex/edit-task-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { useEntityData } from '@/hooks/use-entity-data'
import { asText } from '@/lib/fields'

type LinkedEntityType = 'asset' | 'shot' | 'sequence'

interface EntityTasksPanelProps {
  projectId: string
  entityType: LinkedEntityType
  entityId: string
}

type TaskRow = Record<string, unknown> & { id: number | string }

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

export function EntityTasksPanel({
  projectId,
  entityType,
  entityId,
}: EntityTasksPanelProps) {
  const [rawTasks, setRawTasks] = useState<TaskRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null)

  useEffect(() => {
    if (!projectId || !entityId) return
    void loadTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, entityType, entityId])

  async function loadTasks() {
    try {
      setIsLoading(true)
      const supabase = createClient()
      const parsedId = Number(entityId)
      const idFilter = Number.isNaN(parsedId) ? entityId : parsedId

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .eq('entity_type', entityType)
        .eq('entity_id', idFilter)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRawTasks((data || []) as TaskRow[])
    } catch (error) {
      console.error(`Error loading ${entityType} tasks:`, error)
      setRawTasks([])
    } finally {
      setIsLoading(false)
    }
  }

  function refreshTasks() {
    if (!projectId || !entityId) return
    void loadTasks()
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

  async function onCellUpdate(
    row: Record<string, unknown>,
    column: TableColumn,
    value: unknown
  ) {
    await handleCellUpdate(row, column, value)
    const rowId = String(row.id)
    setRawTasks((prev) =>
      prev.map((t) =>
        String(t.id) === rowId ? { ...t, [column.id]: value } : t
      )
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
        itemName={asText(selectedTask?.name)}
        onConfirm={handleDeleteConfirm}
      />

      <div className="flex h-full min-h-0 flex-col p-6">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            Loading tasks...
          </div>
        ) : data.length === 0 ? (
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
              data={data}
              entityType={`tasks_${entityType}`}
              groupBy="department_label"
              onAdd={() => setShowCreateDialog(true)}
              onEdit={(row) => handleEdit(row as TaskRow)}
              onDelete={(row) => handleDelete(row as TaskRow)}
              onCellUpdate={onCellUpdate}
            />
          </div>
        )}
      </div>
    </>
  )
}
