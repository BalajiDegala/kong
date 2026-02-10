import { redirect } from 'next/navigation'

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; assetId: string }>
}) {
  const { projectId, assetId } = await params
  redirect(`/apex/${projectId}/assets/${assetId}/activity`)
}
