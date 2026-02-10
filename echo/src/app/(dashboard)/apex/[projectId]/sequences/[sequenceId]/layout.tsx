import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SequenceTabs } from '@/components/layout/sequence-tabs'

export default async function SequenceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string; sequenceId: string }>
}) {
  const { projectId, sequenceId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: sequence } = await supabase
    .from('sequences')
    .select(
      `
      *,
      project:projects(id, code, name)
    `
    )
    .eq('id', sequenceId)
    .eq('project_id', projectId)
    .single()

  if (!sequence) {
    redirect(`/apex/${projectId}/sequences`)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-4">
        <div className="flex gap-6">
          <div className="h-24 w-36 rounded-md border border-zinc-800 bg-zinc-900">
            {sequence.thumbnail_url ? (
              <img
                src={sequence.thumbnail_url}
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
                {sequence.code} {sequence.name ? `· ${sequence.name}` : ''}
              </h3>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200">
                {sequence.status || 'active'}
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              {sequence.description || 'No description'}
            </p>
          </div>
        </div>
      </div>

      <SequenceTabs projectId={projectId} sequenceId={sequenceId} />

      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
