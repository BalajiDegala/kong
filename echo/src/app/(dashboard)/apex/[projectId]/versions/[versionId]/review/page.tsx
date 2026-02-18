import { redirect } from 'next/navigation'

export default async function VersionReviewPage({
  params,
}: {
  params: Promise<{ projectId: string; versionId: string }>
}) {
  const { projectId, versionId } = await params
  redirect(`/apex/${projectId}/versions/${versionId}/activity`)
}
