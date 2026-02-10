'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { CreateTaskDialog } from '@/components/apex/create-task-dialog'
import { EditTaskDialog } from '@/components/apex/edit-task-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { deleteTask, updateTask } from '@/actions/tasks'
import { Plus } from 'lucide-react'

export default function TasksPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState<string>('')
  const [tasks, setTasks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const listToString = (value: any) =>
    Array.isArray(value) ? value.join(', ') : ''
  const stringToList = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId)
      loadTasks(p.projectId)
    })
  }, [params])

  async function loadTasks(projId: string) {
    try {
      setIsLoading(true)
      const supabase = createClient()

      // Get all tasks
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

      // Get entity IDs grouped by type
      const assetIds = tasksData?.filter(t => t.entity_type === 'asset').map(t => t.entity_id).filter(Boolean) || []
      const shotIds = tasksData?.filter(t => t.entity_type === 'shot').map(t => t.entity_id).filter(Boolean) || []
      const assignedUserIds = [...new Set(tasksData?.map(t => t.assigned_to).filter(Boolean) || [])]

      // Fetch assets
      let assetsMap: Record<number, any> = {}
      if (assetIds.length > 0) {
        const { data: assets } = await supabase
          .from('assets')
          .select('id, name, code')
          .in('id', assetIds)
        assetsMap = (assets || []).reduce((acc, a) => {
          acc[a.id] = a
          return acc
        }, {} as Record<number, any>)
      }

      // Fetch shots
      let shotsMap: Record<number, any> = {}
      if (shotIds.length > 0) {
        const { data: shots } = await supabase
          .from('shots')
          .select('id, name, code')
          .in('id', shotIds)
        shotsMap = (shots || []).reduce((acc, s) => {
          acc[s.id] = s
          return acc
        }, {} as Record<number, any>)
      }

      // Fetch assignees
      let assigneeMap: Record<string, any> = {}
      if (assignedUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', assignedUserIds)
        assigneeMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p
          return acc
        }, {} as Record<string, any>)
      }

      // Transform data for table
      const tableData = (tasksData || []).map((task) => {
        let entityName = 'N/A'
        let entityCode = '-'

        if (task.entity_type === 'asset' && task.entity_id) {
          const asset = assetsMap[task.entity_id]
          entityName = asset?.name || 'Unknown Asset'
          entityCode = asset?.code || '-'
        } else if (task.entity_type === 'shot' && task.entity_id) {
          const shot = shotsMap[task.entity_id]
          entityName = shot?.name || 'Unknown Shot'
          entityCode = shot?.code || '-'
        }

        const entityType = task.entity_type || 'unknown'
        const assignee = task.assigned_to ? assigneeMap[task.assigned_to] : null

        return {
          ...task,
          entity_name: entityName,
          entity_code: entityCode,
          entity_display: `${task.name} (${entityCode})`,
          entity_type_display: entityType.charAt(0).toUpperCase() + entityType.slice(1),
          step_name: task.steps?.name || 'No Step',
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

  async function handleCellUpdate(row: any, column: any, value: any) {
    const result = await updateTask(row.id, { [column.id]: value }, { revalidate: false })
    if (result.error) {
      throw new Error(result.error)
    }
    setTasks((prev) =>
      prev.map((task) =>
        task.id === row.id ? { ...task, [column.id]: value } : task
      )
    )
  }

  const columns = [
    {
      id: 'name',
      label: 'Task Name',
      type: 'link' as const,
      width: '200px',
      editable: true,
      editor: 'text' as const,
      linkHref: (row: any) => `/apex/${projectId}/tasks/${row.id}`,
    },
    { id: 'step_name', label: 'Pipeline Step', type: 'text' as const, width: '140px' },
    { id: 'link', label: 'Link', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
    { id: 'description', label: 'Description', type: 'text' as const, editable: true, editor: 'textarea' as const },
    { id: 'status', label: 'Status', type: 'status' as const, width: '80px', editable: true, editor: 'text' as const },
    { id: 'assignee_name', label: 'Assigned To', type: 'text' as const, width: '150px' },
    { id: 'reviewer', label: 'Reviewer', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
    { id: 'start_date', label: 'Start Date', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
    { id: 'end_date', label: 'End Date', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
    { id: 'bid', label: 'Bid', type: 'number' as const, width: '80px', editable: true, editor: 'text' as const },
    { id: 'duration', label: 'Duration', type: 'number' as const, width: '90px', editable: true, editor: 'text' as const },
    { id: 'bid_breakdown', label: 'Bid Breakdown', type: 'text' as const, width: '160px', editable: true, editor: 'text' as const },
    { id: 'buffer_days', label: 'Buffer days', type: 'number' as const, width: '110px', editable: true, editor: 'text' as const },
    { id: 'buffer_days2', label: 'Buffer days2', type: 'number' as const, width: '120px', editable: true, editor: 'text' as const },
    { id: 'casting', label: 'Casting', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
    { id: 'cc', label: 'Cc', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
    { id: 'ddna_bid', label: 'DDNA Bid', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
    { id: 'ddna_id', label: 'DDNA ID#', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
    { id: 'ddna_to', label: 'DDNA TO#', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
    { id: 'due_date', label: 'Due Date', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
    { id: 'gantt_bar_color', label: 'Gantt Bar Color', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
    { id: 'id', label: 'Id', type: 'text' as const, width: '80px' },
    { id: 'inventory_date', label: 'Inventory Date', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
    { id: 'milestone', label: 'Milestone', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
    { id: 'priority', label: 'Priority', type: 'text' as const, width: '90px', editable: true, editor: 'text' as const },
    { id: 'notes', label: 'Notes', type: 'text' as const, width: '160px', editable: true, editor: 'textarea' as const },
    { id: 'prod_comments', label: 'Prod Comments', type: 'text' as const, width: '160px', editable: true, editor: 'textarea' as const },
    { id: 'project_label', label: 'Project', type: 'text' as const, width: '120px' },
    { id: 'proposed_start_date', label: 'Proposed Start Date', type: 'text' as const, width: '160px', editable: true, editor: 'text' as const },
    { id: 'publish_version_number', label: 'Publish Version Number', type: 'text' as const, width: '180px', editable: true, editor: 'text' as const },
    {
      id: 'tags',
      label: 'Tags',
      type: 'text' as const,
      width: '160px',
      editable: true,
      editor: 'text' as const,
      formatValue: listToString,
      parseValue: stringToList,
    },
    { id: 'task_complexity', label: 'Task Complexity', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
    { id: 'task_template', label: 'Task Template', type: 'text' as const, width: '160px', editable: true, editor: 'text' as const },
    { id: 'thumbnail_url', label: 'Thumbnail', type: 'thumbnail' as const, width: '80px' },
    {
      id: 'versions',
      label: 'Versions',
      type: 'text' as const,
      width: '160px',
      editable: true,
      editor: 'text' as const,
      formatValue: listToString,
      parseValue: stringToList,
    },
    { id: 'workload', label: 'Workload', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
  ]

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
          if (!open) loadTasks(projectId)
        }}
        projectId={projectId}
      />

      <EditTaskDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) loadTasks(projectId)
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

      <div className="flex h-full flex-col">
        <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-100">Tasks</h2>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {tasks.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6">
              <div className="text-center">
                <p className="mb-2 text-zinc-400">No tasks yet</p>
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="text-sm text-amber-400 hover:text-amber-300"
                >
                  Create your first task
                </button>
              </div>
            </div>
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
            />
          )}
        </div>
      </div>
    </>
  )
}
