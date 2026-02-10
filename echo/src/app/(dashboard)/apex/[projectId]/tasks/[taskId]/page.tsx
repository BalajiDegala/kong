import { redirect } from 'next/navigation'

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; taskId: string }>
}) {
  const { projectId, taskId } = await params
  redirect(`/apex/${projectId}/tasks/${taskId}/activity`)
}
