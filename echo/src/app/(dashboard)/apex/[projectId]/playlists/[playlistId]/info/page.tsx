import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDateLikeForDisplay } from '@/lib/date-display'

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
    .single()

  if (!playlist) {
    redirect(`/apex/${projectId}/playlists`)
  }

  const fields = [
    { label: 'Playlist Code', value: playlist.code },
    { label: 'Playlist Name', value: playlist.name },
    { label: 'Description', value: playlist.description },
    { label: 'Locked', value: playlist.locked ? 'Yes' : 'No' },
    { label: 'Project', value: playlist.project?.code || playlist.project?.name },
    { label: 'Created At', value: playlist.created_at },
    { label: 'Updated At', value: playlist.updated_at },
    { label: 'Id', value: playlist.id },
  ]

  return (
    <div className="p-6">
      <div className="rounded-md border border-zinc-800 bg-zinc-950/70">
        <div className="border-b border-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-100">
          Playlist Info
        </div>
        <div className="divide-y divide-zinc-800">
          {fields.map((field) => {
            const formattedDate = formatDateLikeForDisplay(field.value)
            const value = formattedDate ?? field.value
            const hasValue = value !== null && value !== undefined && value !== ''
            const display = hasValue ? String(value) : '-'

            return (
              <div key={field.label} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-zinc-400">{field.label}</span>
                <span className="max-w-[60%] truncate text-zinc-100" title={display}>
                  {display}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
