import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntityDetailHeader } from '@/components/apex/entity-detail-header'
import { buildDetailFields } from '@/lib/fields/detail-builder'
import { AssetTabs } from '@/components/layout/asset-tabs'

export default async function AssetLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string; assetId: string }>
}) {
  const { projectId, assetId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

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
    .is('deleted_at', null)
    .single()

  if (!asset) {
    redirect(`/apex/${projectId}/assets`)
  }

  const { data: assetOptions } = await supabase
    .from('assets')
    .select('id, code, name')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('code', { ascending: true })

  const sequenceLabel = asset.sequence
    ? `${asset.sequence.code} - ${asset.sequence.name}`
    : '-'
  const shotLabel = asset.shot ? `${asset.shot.code} - ${asset.shot.name}` : '-'
  const title = `${asset.code || asset.name}${asset.code && asset.name ? ` · ${asset.name}` : ''}`
  const switchOptions = (assetOptions || []).map((option) => ({
    id: String(option.id),
    label: `${option.code || `Asset ${option.id}`}${option.name ? ` · ${option.name}` : ''}`,
  }))

  const { fields } = await buildDetailFields({
    entity: 'asset',
    row: asset as Record<string, unknown>,
    supabase,
    projectId,
    manualFields: ['status', 'asset_type', 'task_template', 'client_name', 'dd_client_name', 'keep', 'outsource'],
    excludeFields: ['sequence_id', 'shot_id'],
  })

  // Insert computed sequence and shot labels after task_template
  const templateIndex = fields.findIndex((f) => f.id === 'task_template')
  const insertAt = templateIndex >= 0 ? templateIndex + 1 : fields.length
  fields.splice(insertAt, 0,
    { id: 'sequence', label: 'Sequence', type: 'readonly' as const, value: sequenceLabel },
    { id: 'shot', label: 'Shot', type: 'readonly' as const, value: shotLabel },
  )

  return (
    <div className="flex h-full flex-col">
      <EntityDetailHeader
        entityType="asset"
        entityPlural="assets"
        entityId={assetId}
        projectId={projectId}
        title={title}
        badge={asset.status || 'pending'}
        description={asset.description}
        descriptionColumn="description"
        thumbnailUrl={asset.thumbnail_url}
        thumbnailColumn="thumbnail_url"
        thumbnailPlaceholder="No Thumbnail"
        switchOptions={switchOptions}
        tabPaths={[
          'activity',
          'info',
          'tasks',
          'versions',
          'notes',
          'publishes',
          'shots',
          'history',
        ]}
        fields={fields}
        defaultVisibleFieldIds={['asset_type', 'task_template', 'sequence', 'shot']}
      />

      <AssetTabs projectId={projectId} assetId={assetId} />

      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
