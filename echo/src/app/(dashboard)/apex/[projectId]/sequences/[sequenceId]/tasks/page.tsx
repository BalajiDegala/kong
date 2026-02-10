'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { updateTask } from '@/actions/tasks'

export default function SequenceTasksPage({
  params,
}: {
  params: Promise<{ projectId: string; sequenceId: string }>
}) {
  const [projectId, setProjectId] = useState('')
  const [sequenceId, setSequenceId] = useState('')
  const [tasks, setTasks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const listToString = (value: any) => (Array.isArray(value) ? value.join(', ') : '')
  const stringToList = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId)
      setSequenceId(p.sequenceId)
      loadTasks(p.projectId, p.sequenceId)
    })
  }, [params])

  async function loadTasks(projId: string, seqId: string) {
    try {
      setIsLoading(true)
      const supabase = createClient()
      const sequenceIdNum = Number(seqId)

      const { data: shotsData, error: shotsError } = await supabase
        .from('shots')
        .select('id')
        .eq('project_id', projId)
        .eq('sequence_id', Number.isNaN(sequenceIdNum) ? seqId : sequenceIdNum)

      if (shotsError) {
        console.error('Error loading sequence shots:', shotsError)
        setTasks([])
        return
      }

      const shotIds = (shotsData || []).map((shot) => shot.id)
      if (shotIds.length === 0) {
        setTasks([])
        return
      }

      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          step:steps(id, name, code),
          assigned_profile:profiles!tasks_assigned_to_fkey(id, display_name, full_name, email),
          project:projects(id, code, name)
        `
        )
        .eq('project_id', projId)
        .eq('entity_type', 'shot')
        .in('entity_id', shotIds)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading sequence tasks:', error)
        setTasks([])
        return
      }

      const tableData = (tasksData || []).map((task) => ({
        ...task,
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
      console.error('Error loading sequence tasks:', error)
      setTasks([])
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCellUpdate(row: any, column: any, value: any) {
    const result = await updateTask(row.id, { [column.id]: value }, { revalidate: false })
    if (result.error) {
      throw new Error(result.error)
    }
    setTasks((prev) =>
      prev.map((task) => (task.id === row.id ? { ...task, [column.id]: value } : task))
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

  return (
    <div className="p-6">
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
          Loading tasks...
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-md border border-zinc-800 bg-zinc-950/70 p-6">
          <h3 className="text-sm font-semibold text-zinc-100">Tasks</h3>
          <p className="mt-2 text-sm text-zinc-400">No tasks linked to this sequence yet.</p>
        </div>
      ) : (
        <EntityTable
          columns={columns}
          data={tasks}
          entityType="tasks_sequence"
          groupBy="step_name"
          onCellUpdate={handleCellUpdate}
        />
      )}
    </div>
  )
}
