import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDateLikeForDisplay } from '@/lib/date-display'

export default async function TaskInfoPage({
  params,
}: {
  params: Promise<{ projectId: string; taskId: string }>
}) {
  const { projectId, taskId } = await params
  const supabase = await createClient()

  const { data: task } = await supabase
    .from('tasks')
    .select(
      `
      *,
      step:steps(id, name, code),
      project:projects(id, code, name),
      created_by_profile:profiles!tasks_created_by_fkey(id, display_name, full_name),
      assigned_profile:profiles!tasks_assigned_to_fkey(id, display_name, full_name)
    `
    )
    .eq('id', taskId)
    .eq('project_id', projectId)
    .single()

  if (!task) {
    redirect(`/apex/${projectId}/tasks`)
  }

  const fields = [
    { label: 'Task Name', value: task.name },
    { label: 'Status', value: task.status },
    { label: 'Priority', value: task.priority },
    { label: 'Step', value: task.step?.name },
    { label: 'Assigned To', value: task.assigned_profile?.display_name || task.assigned_profile?.full_name },
    { label: 'Reviewer', value: Array.isArray(task.reviewer) ? task.reviewer.join(', ') : task.reviewer },
    { label: 'Description', value: task.description },
    { label: 'Start Date', value: task.start_date },
    { label: 'End Date', value: task.end_date },
    { label: 'Due Date', value: task.due_date },
    { label: 'Duration', value: task.duration },
    { label: 'Bid', value: task.bid },
    { label: 'Bid Breakdown', value: task.bid_breakdown },
    { label: 'Buffer days', value: task.buffer_days },
    { label: 'Buffer days2', value: task.buffer_days2 },
    { label: 'Casting', value: task.casting },
    { label: 'Cc', value: Array.isArray(task.cc) ? task.cc.join(', ') : task.cc },
    { label: 'DDNA Bid', value: task.ddna_bid },
    { label: 'DDNA ID#', value: task.ddna_id },
    { label: 'DDNA TO#', value: task.ddna_to },
    { label: 'Dependency Violation', value: task.dependency_violation },
    { label: 'Dept. End Date', value: task.dept_end_date },
    { label: 'Downstream Dependency', value: task.downstream_dependency },
    { label: 'Gantt Bar Color', value: task.gantt_bar_color },
    { label: 'Inventory Date', value: task.inventory_date },
    { label: 'Milestone', value: task.milestone },
    { label: 'Notes', value: task.notes },
    { label: 'Prod Comments', value: task.prod_comments },
    { label: 'Proposed Start Date', value: task.proposed_start_date },
    { label: 'Publish Version Number', value: task.publish_version_number },
    { label: 'Tags', value: Array.isArray(task.tags) ? task.tags.join(', ') : task.tags },
    { label: 'Task Complexity', value: task.task_complexity },
    { label: 'Task Template', value: task.task_template },
    { label: 'Thumbnail', value: task.thumbnail_url },
    { label: 'Versions', value: Array.isArray(task.versions) ? task.versions.join(', ') : task.versions },
    { label: 'Pipeline Step Color', value: task.pipeline_step_color },
    { label: 'Project', value: task.project?.code || task.project?.name },
    { label: 'Created By', value: task.created_by_profile?.display_name || task.created_by_profile?.full_name },
    { label: 'Created At', value: task.created_at },
    { label: 'Updated At', value: task.updated_at },
    { label: 'Id', value: task.id },
  ]

  return (
    <div className="p-6">
      <div className="rounded-md border border-zinc-800 bg-zinc-950/70">
        <div className="border-b border-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-100">
          Task Info
        </div>
        <div className="divide-y divide-zinc-800">
          {fields.map((field) => {
            const formattedDate = formatDateLikeForDisplay(field.value)
            const value = formattedDate ?? field.value
            const hasValue = value !== null && value !== undefined && value !== ''
            const display = hasValue ? String(value) : '-'

            return (
              <div key={field.label} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-zinc-400">{field.label}</span>
                <span className="max-w-[60%] truncate text-zinc-100" title={display}>
                  {display}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
