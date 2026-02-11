import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VersionTabs } from '@/components/layout/version-tabs'

export default async function VersionLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string; versionId: string }>
}) {
  const { projectId, versionId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: version } = await supabase
    .from('versions')
    .select(
      `
      *,
      artist:profiles!versions_created_by_fkey(id, display_name, full_name),
      task:tasks(id, name)
    `
    )
    .eq('id', versionId)
    .eq('project_id', projectId)
    .single()

  if (!version) {
    redirect(`/apex/${projectId}/versions`)
  }

  const artistName =
    version.artist?.display_name ||
    version.artist?.full_name ||
    '-'

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-4">
        <div className="flex gap-6">
          <div className="h-24 w-36 rounded-md border border-zinc-800 bg-zinc-900">
            {version.thumbnail_url ? (
              <img
                src={version.thumbnail_url}
                alt=""
                className="h-full w-full rounded-md object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                No Thumbnail
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-semibold text-zinc-100">{version.code}</h3>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200">
                {version.status || 'pending'}
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              {version.description || 'No description'}
            </p>

            <div className="mt-4 grid gap-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Artist</p>
                <p className="mt-1 text-zinc-100">{artistName}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Task</p>
                <p className="mt-1 text-zinc-100">{version.task?.name || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Version</p>
                <p className="mt-1 text-zinc-100">v{version.version_number}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Client Approved</p>
                <p className="mt-1 text-zinc-100">{version.client_approved ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <VersionTabs projectId={projectId} versionId={versionId} />

      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
