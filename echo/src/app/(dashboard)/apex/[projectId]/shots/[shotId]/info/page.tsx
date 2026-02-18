import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntityInfoPanel } from '@/components/apex/entity-info-panel'
import { buildEntityInfoFields } from '@/lib/apex/entity-info-fields'
import { applyFieldOptionMap, loadEntityFieldOptionMap } from '@/lib/apex/entity-field-options'

export default async function ShotInfoPage({
  params,
}: {
  params: Promise<{ projectId: string; shotId: string }>
}) {
  const { projectId, shotId } = await params
  const supabase = await createClient()

  const { data: shot } = await supabase
    .from('shots')
    .select(
      `
      *,
      sequence:sequences(id, code, name),
      project:projects(id, code, name),
      created_by_profile:profiles!shots_created_by_fkey(id, display_name, full_name)
    `
    )
    .eq('id', shotId)
    .eq('project_id', projectId)
    .single()

  if (!shot) {
    redirect(`/apex/${projectId}/shots`)
  }

  const fieldOptionMap = await loadEntityFieldOptionMap(supabase, 'shot')
  const fields = applyFieldOptionMap(
    buildEntityInfoFields(
      'shot',
      shot as Record<string, unknown>,
      [
      {
        id: 'sequence_display',
        label: 'Sequence',
        type: 'readonly',
        value: shot.sequence ? `${shot.sequence.code} - ${shot.sequence.name}` : null,
      },
      {
        id: 'project_display',
        label: 'Project',
        type: 'readonly',
        value: shot.project?.code || shot.project?.name || null,
      },
      {
        id: 'created_by_display',
        label: 'Created By',
        type: 'readonly',
        value: shot.created_by_profile?.display_name || shot.created_by_profile?.full_name || null,
      },
    ],
      {
        excludeColumns: [
          'sequence',
          'project',
          'project_id',
          'sequence_id',
          'created_by',
          'created_by_profile',
        ],
      }
    ),
    fieldOptionMap
  )

  return (
    <EntityInfoPanel
      entityType="shot"
      entityId={shotId}
      projectId={projectId}
      title="Shot Info"
      fields={fields}
    />
  )
}
