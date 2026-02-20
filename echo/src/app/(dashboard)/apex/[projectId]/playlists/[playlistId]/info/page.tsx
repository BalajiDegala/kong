import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntityInfoPanel } from '@/components/apex/entity-info-panel'
import { buildEntityInfoFields } from '@/lib/apex/entity-info-fields'
import { applyFieldOptionMap, loadEntityFieldOptionMap } from '@/lib/apex/entity-field-options'

export default async function PlaylistInfoPage({
  params,
}: {
  params: Promise<{ projectId: string; playlistId: string }>
}) {
  const { projectId, playlistId } = await params
  const supabase = await createClient()

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

  const fieldOptionMap = await loadEntityFieldOptionMap(supabase, 'playlist')
  const fields = applyFieldOptionMap(
    buildEntityInfoFields(
      'playlist',
      playlist as Record<string, unknown>,
      [
      {
        id: 'project_display',
        label: 'Project',
        type: 'readonly',
        value: playlist.project?.code || playlist.project?.name || null,
      },
    ],
      {
        excludeColumns: ['project', 'project_id'],
      }
    ),
    fieldOptionMap
  )

  return (
    <EntityInfoPanel
      entityType="playlist"
      entityId={playlistId}
      projectId={projectId}
      title="Playlist Info"
      fields={fields}
    />
  )
}
