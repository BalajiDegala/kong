import { redirect } from 'next/navigation'

export default async function SequenceDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; sequenceId: string }>
}) {
  const { projectId, sequenceId } = await params
  redirect(`/apex/${projectId}/sequences/${sequenceId}/activity`)
}
