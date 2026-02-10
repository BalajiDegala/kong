import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ShotTabs } from '@/components/layout/shot-tabs'

export default async function ShotLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string; shotId: string }>
}) {
  const { projectId, shotId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: shot } = await supabase
    .from('shots')
    .select(
      `
      *,
      sequence:sequences(id, code, name),
      project:projects(id, code, name)
    `
    )
    .eq('id', shotId)
    .eq('project_id', projectId)
    .single()

  if (!shot) {
    redirect(`/apex/${projectId}/shots`)
  }

  const sequenceLabel = shot.sequence
    ? `${shot.sequence.code} - ${shot.sequence.name}`
    : '-'

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-4">
        <div className="flex gap-6">
          <div className="h-24 w-36 rounded-md border border-zinc-800 bg-zinc-900">
            {shot.thumbnail_url ? (
              <img
                src={shot.thumbnail_url}
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
              <h3 className="text-xl font-semibold text-zinc-100">
                {shot.code} {shot.name ? `· ${shot.name}` : ''}
              </h3>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200">
                {shot.status || 'pending'}
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              {shot.description || 'No description'}
            </p>

            <div className="mt-4 grid gap-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Sequence</p>
                <p className="mt-1 text-zinc-100">{sequenceLabel}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Cut In</p>
                <p className="mt-1 text-zinc-100">{shot.cut_in ?? '-'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Cut Out</p>
                <p className="mt-1 text-zinc-100">{shot.cut_out ?? '-'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Duration</p>
                <p className="mt-1 text-zinc-100">{shot.cut_duration ?? '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ShotTabs projectId={projectId} shotId={shotId} />

      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
