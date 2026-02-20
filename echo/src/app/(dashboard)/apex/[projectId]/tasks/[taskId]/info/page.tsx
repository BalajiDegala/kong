import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntityInfoPanel } from '@/components/apex/entity-info-panel'
import { buildEntityInfoFields } from '@/lib/apex/entity-info-fields'
import { applyFieldOptionMap, loadEntityFieldOptionMap } from '@/lib/apex/entity-field-options'

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
    .is('deleted_at', null)
    .single()

  if (!task) {
    redirect(`/apex/${projectId}/tasks`)
  }

  const fieldOptionMap = await loadEntityFieldOptionMap(supabase, 'task')
  const fields = applyFieldOptionMap(
    buildEntityInfoFields(
      'task',
      task as Record<string, unknown>,
      [
      {
        id: 'step_display',
        label: 'Pipeline Step',
        type: 'readonly',
        value: task.step?.name || null,
      },
      {
        id: 'created_by_display',
        label: 'Created By',
        type: 'readonly',
        value: task.created_by_profile?.display_name || task.created_by_profile?.full_name || null,
      },
      {
        id: 'project_display',
        label: 'Project',
        type: 'readonly',
        value: task.project?.code || task.project?.name || null,
      },
    ],
      {
        excludeColumns: [
          'step',
          'project',
          'project_id',
          'step_id',
          'created_by',
          'created_by_profile',
          'assigned_profile',
        ],
      }
    ),
    fieldOptionMap
  )

  return (
    <EntityInfoPanel
      entityType="task"
      entityId={taskId}
      projectId={projectId}
      title="Task Info"
      fields={fields}
    />
  )
}
