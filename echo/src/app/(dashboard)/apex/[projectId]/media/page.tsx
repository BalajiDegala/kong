import { MediaBrowserPage } from '@/components/media/media-browser-page'

export default async function ProjectMediaPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params

  return <MediaBrowserPage fixedProjectId={projectId} showProjectSidebar={false} />
}

