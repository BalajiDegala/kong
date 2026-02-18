import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntityDetailHeader } from '@/components/apex/entity-detail-header'
import { appendAutoHeaderFields } from '@/lib/apex/entity-header-fields'
import { applyFieldOptionMap, loadEntityFieldOptionMap } from '@/lib/apex/entity-field-options'
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
    .single()

  if (!asset) {
    redirect(`/apex/${projectId}/assets`)
  }

  const { data: assetOptions } = await supabase
    .from('assets')
    .select('id, code, name')
    .eq('project_id', projectId)
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
  const fieldOptionMap = await loadEntityFieldOptionMap(supabase, 'asset')
  const fields = applyFieldOptionMap(
    appendAutoHeaderFields(
      'asset',
      asset as Record<string, unknown>,
      [
      {
        id: 'status',
        label: 'Status',
        type: 'text',
        value: asset.status || null,
        editable: true,
        column: 'status',
      },
      {
        id: 'asset_type',
        label: 'Type',
        type: 'text',
        value: asset.asset_type || null,
        editable: true,
        column: 'asset_type',
      },
      {
        id: 'task_template',
        label: 'Template',
        type: 'text',
        value: asset.task_template || null,
        editable: true,
        column: 'task_template',
      },
      {
        id: 'sequence',
        label: 'Sequence',
        type: 'readonly',
        value: sequenceLabel,
      },
      {
        id: 'shot',
        label: 'Shot',
        type: 'readonly',
        value: shotLabel,
      },
      {
        id: 'client_name',
        label: 'Client Name',
        type: 'text',
        value: asset.client_name || null,
        editable: true,
        column: 'client_name',
      },
      {
        id: 'dd_client_name',
        label: 'DD Client Name',
        type: 'text',
        value: asset.dd_client_name || null,
        editable: true,
        column: 'dd_client_name',
      },
      {
        id: 'keep',
        label: 'Keep',
        type: 'boolean',
        value: Boolean(asset.keep),
        editable: true,
        column: 'keep',
      },
      {
        id: 'outsource',
        label: 'Outsource',
        type: 'boolean',
        value: Boolean(asset.outsource),
        editable: true,
        column: 'outsource',
      },
    ],
      {
        excludeColumns: ['sequence', 'shot'],
      }
    ),
    fieldOptionMap
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
