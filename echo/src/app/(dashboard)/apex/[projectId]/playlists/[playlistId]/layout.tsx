import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
    .single()

  if (!playlist) {
    redirect(`/apex/${projectId}/playlists`)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-4">
        <div className="flex gap-6">
          <div className="h-24 w-36 rounded-md border border-zinc-800 bg-zinc-900">
            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
              Playlist
            </div>
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-semibold text-zinc-100">
                {playlist.code} {playlist.name ? `· ${playlist.name}` : ''}
              </h3>
              {playlist.locked && (
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200">
                  Locked
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              {playlist.description || 'No description'}
            </p>
          </div>
        </div>
      </div>

      <PlaylistTabs projectId={projectId} playlistId={playlistId} />

      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
