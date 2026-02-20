import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntityDetailHeader } from '@/components/apex/entity-detail-header'
import { appendAutoHeaderFields } from '@/lib/apex/entity-header-fields'
import { applyFieldOptionMap, loadEntityFieldOptionMap } from '@/lib/apex/entity-field-options'
import { PlaylistTabs } from '@/components/layout/playlist-tabs'

export default async function PlaylistLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string; playlistId: string }>
}) {
  const { projectId, playlistId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: playlist } = await supabase
    .from('playlists')
    .select(
      `
      *,
      project:projects(id, code, name)
    `
    )
    .eq('id', playlistId)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .single()

  if (!playlist) {
    redirect(`/apex/${projectId}/playlists`)
  }

  const { data: playlistOptions } = await supabase
    .from('playlists')
    .select('id, code, name')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('code', { ascending: true })

  const title = `${playlist.code || playlist.name || `Playlist ${playlist.id}`}${
    playlist.code && playlist.name ? ` · ${playlist.name}` : ''
  }`
  const switchOptions = (playlistOptions || []).map((option) => ({
    id: String(option.id),
    label: `${option.code || `Playlist ${option.id}`}${option.name ? ` · ${option.name}` : ''}`,
  }))
  const fieldOptionMap = await loadEntityFieldOptionMap(supabase, 'playlist')
  const fields = applyFieldOptionMap(
    appendAutoHeaderFields(
      'playlist',
      playlist as Record<string, unknown>,
      [
      {
        id: 'code',
        label: 'Code',
        type: 'text',
        value: playlist.code || null,
        editable: true,
        column: 'code',
      },
      {
        id: 'locked',
        label: 'Locked',
        type: 'boolean',
        value: Boolean(playlist.locked),
        editable: true,
        column: 'locked',
      },
    ],
      {
        excludeColumns: ['project'],
      }
    ),
    fieldOptionMap
  )

  return (
    <div className="flex h-full flex-col">
      <EntityDetailHeader
        entityType="playlist"
        entityPlural="playlists"
        entityId={playlistId}
        projectId={projectId}
        title={title}
        badge={playlist.locked ? 'Locked' : null}
        description={playlist.description}
        descriptionColumn="description"
        thumbnailPlaceholder="Playlist"
        switchOptions={switchOptions}
        tabPaths={['activity', 'info', 'versions', 'history']}
        fields={fields}
        defaultVisibleFieldIds={['code', 'locked']}
      />

      <PlaylistTabs projectId={projectId} playlistId={playlistId} />

      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
