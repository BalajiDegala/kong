import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntityDetailHeader } from '@/components/apex/entity-detail-header'
import { buildDetailFields } from '@/lib/fields/detail-builder'
import { asText, parseTextArray } from '@/lib/fields'
import { TaskTabs } from '@/components/layout/task-tabs'

function resolveLatestTaskVersionId(task: Record<string, unknown>): string | null {
  const versions = parseTextArray(task.versions)
  if (versions.length > 0) return versions[versions.length - 1]
  const fallback = parseTextArray(task.version_link)
  if (fallback.length > 0) return fallback[fallback.length - 1]
  return null
}

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
    .is('deleted_at', null)
    .single()

  if (!task) {
    redirect(`/apex/${projectId}/tasks`)
  }

  const { data: taskOptions } = await supabase
    .from('tasks')
    .select('id, name')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  // buildDetailFields resolves entity_id (polymorphic) automatically via
  // the entity resolver, replacing the manual N+1 asset/shot/sequence queries.
  const { fields, enrichedRow } = await buildDetailFields({
    entity: 'task',
    row: task as Record<string, unknown>,
    supabase,
    projectId,
    manualFields: ['status', 'department', 'priority', 'due_date'],
    excludeFields: ['step_id'],
  })

  // Build entity label from the enriched row's resolved entity data
  const entityCode = asText(enrichedRow.entity_code).trim()
  const entityName = asText(enrichedRow.entity_name).trim()
  let entityLabel = '-'
  if (entityCode && entityName) entityLabel = `${entityCode} · ${entityName}`
  else if (entityCode) entityLabel = entityCode
  else if (entityName) entityLabel = entityName
  else if (enrichedRow.entity_link_label) entityLabel = asText(enrichedRow.entity_link_label)

  // Insert the computed entity label after status
  const entityField = {
    id: 'entity',
    label: 'Entity',
    type: 'readonly' as const,
    value: entityLabel,
  }
  const statusIndex = fields.findIndex((f) => f.id === 'status')
  if (statusIndex >= 0) {
    fields.splice(statusIndex + 1, 0, entityField)
  } else {
    fields.unshift(entityField)
  }

  const title = task.name || `Task ${task.id}`
  const switchOptions = (taskOptions || []).map((option) => ({
    id: String(option.id),
    label: option.name || `Task ${option.id}`,
  }))
  const linkedTaskVersionId = resolveLatestTaskVersionId(task as Record<string, unknown>)

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
        thumbnailLinkHref={
          linkedTaskVersionId ? `/apex/${projectId}/versions/${linkedTaskVersionId}/activity` : null
        }
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
