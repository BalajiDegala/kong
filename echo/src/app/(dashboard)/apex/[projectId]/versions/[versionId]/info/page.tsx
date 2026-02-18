import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntityInfoPanel } from '@/components/apex/entity-info-panel'
import { buildEntityInfoFields } from '@/lib/apex/entity-info-fields'
import { applyFieldOptionMap, loadEntityFieldOptionMap } from '@/lib/apex/entity-field-options'

export default async function VersionInfoPage({
  params,
}: {
  params: Promise<{ projectId: string; versionId: string }>
}) {
  const { projectId, versionId } = await params
  const supabase = await createClient()

  const { data: version } = await supabase
    .from('versions')
    .select(
      `
      *,
      artist:profiles!versions_created_by_fkey(id, display_name, full_name),
      task:tasks(id, name),
      project:projects(id, code, name)
    `
    )
    .eq('id', versionId)
    .eq('project_id', projectId)
    .single()

  if (!version) {
    redirect(`/apex/${projectId}/versions`)
  }

  const fieldOptionMap = await loadEntityFieldOptionMap(supabase, 'version')
  const fields = applyFieldOptionMap(
    buildEntityInfoFields(
      'version',
      version as Record<string, unknown>,
      [
      {
        id: 'artist_display',
        label: 'Artist',
        type: 'readonly',
        value: version.artist?.display_name || version.artist?.full_name || null,
      },
      {
        id: 'task_display',
        label: 'Task',
        type: 'readonly',
        value: version.task?.name || null,
      },
      {
        id: 'project_display',
        label: 'Project',
        type: 'readonly',
        value: version.project?.code || version.project?.name || null,
      },
    ],
      {
        excludeColumns: [
          'artist',
          'artist_id',
          'task',
          'task_id',
          'project',
          'project_id',
          'created_by',
        ],
      }
    ),
    fieldOptionMap
  )

  return (
    <EntityInfoPanel
      entityType="version"
      entityId={versionId}
      projectId={projectId}
      title="Version Info"
      fields={fields}
    />
  )
}
