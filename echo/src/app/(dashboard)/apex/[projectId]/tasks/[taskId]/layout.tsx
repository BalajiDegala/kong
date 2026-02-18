import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntityDetailHeader } from '@/components/apex/entity-detail-header'
import { appendAutoHeaderFields } from '@/lib/apex/entity-header-fields'
import { applyFieldOptionMap, loadEntityFieldOptionMap } from '@/lib/apex/entity-field-options'
import { TaskTabs } from '@/components/layout/task-tabs'

export default async function TaskLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string; taskId: string }>
}) {
  const { projectId, taskId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: task } = await supabase
    .from('tasks')
    .select(
      `
      *,
      step:steps(id, name, code, department_id),
      project:projects(id, code, name)
    `
    )
    .eq('id', taskId)
    .eq('project_id', projectId)
    .single()

  if (!task) {
    redirect(`/apex/${projectId}/tasks`)
  }

  const { data: taskOptions } = await supabase
    .from('tasks')
    .select('id, name')
    .eq('project_id', projectId)
    .order('name', { ascending: true })

  let entityLabel = '-'
  if (task.entity_type === 'asset' && task.entity_id) {
    const { data: asset } = await supabase
      .from('assets')
      .select('id, code, name')
      .eq('id', task.entity_id)
      .single()
    if (asset) {
      entityLabel = `${asset.code} ${asset.name ? `· ${asset.name}` : ''}`
    }
  }
  if (task.entity_type === 'shot' && task.entity_id) {
    const { data: shot } = await supabase
      .from('shots')
      .select('id, code, name')
      .eq('id', task.entity_id)
      .single()
    if (shot) {
      entityLabel = `${shot.code} ${shot.name ? `· ${shot.name}` : ''}`
    }
  }
  if (task.entity_type === 'sequence' && task.entity_id) {
    const { data: sequence } = await supabase
      .from('sequences')
      .select('id, code, name')
      .eq('id', task.entity_id)
      .single()
    if (sequence) {
      entityLabel = `${sequence.code} ${sequence.name ? `· ${sequence.name}` : ''}`
    }
  }

  const title = task.name || `Task ${task.id}`
  const switchOptions = (taskOptions || []).map((option) => ({
    id: String(option.id),
    label: option.name || `Task ${option.id}`,
  }))
  const fieldOptionMap = await loadEntityFieldOptionMap(supabase, 'task')
  const fields = applyFieldOptionMap(
    appendAutoHeaderFields(
      'task',
      task as Record<string, unknown>,
      [
      {
        id: 'status',
        label: 'Status',
        type: 'text',
        value: task.status || null,
        editable: true,
        column: 'status',
      },
      {
        id: 'entity',
        label: 'Entity',
        type: 'readonly',
        value: entityLabel,
      },
      {
        id: 'department',
        label: 'Pipeline Step',
        type: 'select',
        value:
          (task.department ? String(task.department) : '') ||
          (task.step?.department_id ? String(task.step.department_id) : '') ||
          null,
        editable: true,
        column: 'department',
      },
      {
        id: 'priority',
        label: 'Priority',
        type: 'text',
        value: task.priority || null,
        editable: true,
        column: 'priority',
      },
      {
        id: 'due_date',
        label: 'Due Date',
        type: 'date',
        value: task.due_date || null,
        editable: true,
        column: 'due_date',
      },
    ],
      {
        excludeColumns: ['step', 'project'],
      }
    ),
    fieldOptionMap
  )

  return (
    <div className="flex h-full flex-col">
      <EntityDetailHeader
        entityType="task"
        entityPlural="tasks"
        entityId={taskId}
        projectId={projectId}
        title={title}
        badge={task.status || 'pending'}
        description={task.description}
        descriptionColumn="description"
        thumbnailUrl={task.thumbnail_url}
        thumbnailColumn="thumbnail_url"
        thumbnailPlaceholder="Task"
        switchOptions={switchOptions}
        tabPaths={['activity', 'info', 'versions', 'notes', 'publishes', 'history']}
        fields={fields}
        defaultVisibleFieldIds={['entity', 'department', 'priority', 'due_date']}
      />

      <TaskTabs projectId={projectId} taskId={taskId} />

      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
