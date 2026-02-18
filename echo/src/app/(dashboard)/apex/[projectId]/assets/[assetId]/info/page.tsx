import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntityInfoPanel } from '@/components/apex/entity-info-panel'
import { buildEntityInfoFields } from '@/lib/apex/entity-info-fields'
import { applyFieldOptionMap, loadEntityFieldOptionMap } from '@/lib/apex/entity-field-options'

export default async function AssetInfoPage({
  params,
}: {
  params: Promise<{ projectId: string; assetId: string }>
}) {
  const { projectId, assetId } = await params
  const supabase = await createClient()

  const { data: asset } = await supabase
    .from('assets')
    .select(
      `
      *,
      project:projects(id, code, name),
      sequence:sequences(id, code, name),
      shot:shots(id, code, name)
    `
    )
    .eq('id', assetId)
    .eq('project_id', projectId)
    .single()

  if (!asset) {
    redirect(`/apex/${projectId}/assets`)
  }

  const fieldOptionMap = await loadEntityFieldOptionMap(supabase, 'asset')
  const fields = applyFieldOptionMap(
    buildEntityInfoFields(
      'asset',
      asset as Record<string, unknown>,
      [
      {
        id: 'project_display',
        label: 'Project',
        type: 'readonly',
        value: asset.project?.code || asset.project?.name || null,
      },
      {
        id: 'sequence_display',
        label: 'Sequence',
        type: 'readonly',
        value: asset.sequence ? `${asset.sequence.code} - ${asset.sequence.name}` : null,
      },
      {
        id: 'shot_display',
        label: 'Shot',
        type: 'readonly',
        value: asset.shot ? `${asset.shot.code} - ${asset.shot.name}` : null,
      },
    ],
      {
        excludeColumns: [
          'project',
          'project_id',
          'sequence',
          'sequence_id',
          'shot',
          'shot_id',
        ],
      }
    ),
    fieldOptionMap
  )

  return (
    <EntityInfoPanel
      entityType="asset"
      entityId={assetId}
      projectId={projectId}
      title="Asset Info"
      fields={fields}
    />
  )
}
