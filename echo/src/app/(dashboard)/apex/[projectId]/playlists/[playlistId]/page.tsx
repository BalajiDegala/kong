import { redirect } from 'next/navigation'

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; playlistId: string }>
}) {
  const { projectId, playlistId } = await params
  redirect(`/apex/${projectId}/playlists/${playlistId}/activity`)
}
