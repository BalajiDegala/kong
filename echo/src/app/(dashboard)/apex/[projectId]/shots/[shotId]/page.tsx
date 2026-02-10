import { redirect } from 'next/navigation'

export default async function ShotDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; shotId: string }>
}) {
  const { projectId, shotId } = await params
  redirect(`/apex/${projectId}/shots/${shotId}/activity`)
}
