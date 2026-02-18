import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntityDetailHeader } from '@/components/apex/entity-detail-header'
import { appendAutoHeaderFields } from '@/lib/apex/entity-header-fields'
import { applyFieldOptionMap, loadEntityFieldOptionMap } from '@/lib/apex/entity-field-options'
import { VersionTabs } from '@/components/layout/version-tabs'

export default async function VersionLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string; versionId: string }>
}) {
  const { projectId, versionId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: version } = await supabase
    .from('versions')
    .select(
      `
      *,
      artist:profiles!versions_created_by_fkey(id, display_name, full_name),
      task:tasks(id, name)
    `
    )
    .eq('id', versionId)
    .eq('project_id', projectId)
    .single()

  if (!version) {
    redirect(`/apex/${projectId}/versions`)
  }

  const { data: versionOptions } = await supabase
    .from('versions')
    .select('id, code, version_number')
    .eq('project_id', projectId)
    .order('id', { ascending: true })

  const artistName =
    version.artist?.display_name ||
    version.artist?.full_name ||
    '-'
  const switchOptions = (versionOptions || []).map((option) => ({
    id: String(option.id),
    label: option.code || `v${option.version_number || option.id}`,
  }))
  const fieldOptionMap = await loadEntityFieldOptionMap(supabase, 'version')
  const fields = applyFieldOptionMap(
    appendAutoHeaderFields(
      'version',
      version as Record<string, unknown>,
      [
      {
        id: 'status',
        label: 'Status',
        type: 'text',
        value: version.status || null,
        editable: true,
        column: 'status',
      },
      {
        id: 'artist',
        label: 'Artist',
        type: 'readonly',
        value: artistName,
      },
      {
        id: 'task',
        label: 'Task',
        type: 'readonly',
        value: version.task?.name || '-',
      },
      {
        id: 'version_number',
        label: 'Version',
        type: 'readonly',
        value: version.version_number ?? null,
      },
      {
        id: 'client_approved',
        label: 'Client Approved',
        type: 'boolean',
        value: Boolean(version.client_approved),
        editable: true,
        column: 'client_approved',
      },
    ],
      {
        excludeColumns: ['artist', 'task'],
      }
    ),
    fieldOptionMap
  )

  return (
    <div className="flex h-full flex-col">
      <EntityDetailHeader
        entityType="version"
        entityPlural="versions"
        entityId={versionId}
        projectId={projectId}
        title={version.code || `v${version.version_number}`}
        badge={version.status || 'pending'}
        description={version.description}
        descriptionColumn="description"
        thumbnailUrl={version.thumbnail_url}
        thumbnailColumn="thumbnail_url"
        thumbnailPlaceholder="No Thumbnail"
        switchOptions={switchOptions}
        tabPaths={['activity', 'info', 'history']}
        fields={fields}
        defaultVisibleFieldIds={['artist', 'task', 'version_number', 'client_approved']}
      />

      <VersionTabs projectId={projectId} versionId={versionId} />

      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
