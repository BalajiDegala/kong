import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AssetTabs } from '@/components/layout/asset-tabs'

export default async function AssetLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string; assetId: string }>
}) {
  const { projectId, assetId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: asset } = await supabase
    .from('assets')
    .select(
      `
      *,
      project:projects(id, code, name),
      sequence:sequences(id, code, name),
      shot:shots(id, code, name)
    `
    )
    .eq('id', assetId)
    .eq('project_id', projectId)
    .single()

  if (!asset) {
    redirect(`/apex/${projectId}/assets`)
  }

  const sequenceLabel = asset.sequence
    ? `${asset.sequence.code} - ${asset.sequence.name}`
    : '-'
  const shotLabel = asset.shot ? `${asset.shot.code} - ${asset.shot.name}` : '-'

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-4">
        <div className="flex gap-6">
          <div className="h-24 w-36 rounded-md border border-zinc-800 bg-zinc-900">
            {asset.thumbnail_url ? (
              <img
                src={asset.thumbnail_url}
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
              <h3 className="text-xl font-semibold text-zinc-100">{asset.name}</h3>
              <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs uppercase tracking-[0.2em] text-zinc-300">
                {asset.asset_type || 'asset'}
              </span>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200">
                {asset.status || 'pending'}
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              {asset.description || 'No description'}
            </p>

            <div className="mt-4 grid gap-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Type</p>
                <p className="mt-1 text-zinc-100">{asset.asset_type || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Template</p>
                <p className="mt-1 text-zinc-100">{asset.task_template || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Sequence</p>
                <p className="mt-1 text-zinc-100">{sequenceLabel}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Shot</p>
                <p className="mt-1 text-zinc-100">{shotLabel}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Client Name</p>
                <p className="mt-1 text-zinc-100">{asset.client_name || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">DD Client Name</p>
                <p className="mt-1 text-zinc-100">{asset.dd_client_name || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Keep</p>
                <p className="mt-1 text-zinc-100">{asset.keep ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Outsource</p>
                <p className="mt-1 text-zinc-100">{asset.outsource ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AssetTabs projectId={projectId} assetId={assetId} />

      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
