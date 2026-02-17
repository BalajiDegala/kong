import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDateLikeForDisplay } from '@/lib/date-display'

export default async function SequenceInfoPage({
  params,
}: {
  params: Promise<{ projectId: string; sequenceId: string }>
}) {
  const { projectId, sequenceId } = await params
  const supabase = await createClient()

  const { data: sequence } = await supabase
    .from('sequences')
    .select(
      `
      *,
      project:projects(id, code, name),
      created_by_profile:profiles!sequences_created_by_fkey(id, display_name, full_name)
    `
    )
    .eq('id', sequenceId)
    .eq('project_id', projectId)
    .single()

  if (!sequence) {
    redirect(`/apex/${projectId}/sequences`)
  }

  const fields = [
    { label: 'Sequence Code', value: sequence.code },
    { label: 'Sequence Name', value: sequence.name },
    { label: 'Status', value: sequence.status },
    { label: 'Description', value: sequence.description },
    { label: 'Type', value: sequence.sequence_type },
    { label: 'Client Name', value: sequence.client_name },
    { label: 'DD Client Name', value: sequence.dd_client_name },
    { label: 'Cc', value: Array.isArray(sequence.cc) ? sequence.cc.join(', ') : sequence.cc },
    { label: 'Cuts', value: Array.isArray(sequence.cuts) ? sequence.cuts.join(', ') : sequence.cuts },
    { label: 'Plates', value: Array.isArray(sequence.plates) ? sequence.plates.join(', ') : sequence.plates },
    { label: 'Shots', value: Array.isArray(sequence.shots) ? sequence.shots.join(', ') : sequence.shots },
    { label: 'Assets', value: Array.isArray(sequence.assets) ? sequence.assets.join(', ') : sequence.assets },
    { label: 'Tags', value: Array.isArray(sequence.tags) ? sequence.tags.join(', ') : sequence.tags },
    { label: 'Task Template', value: sequence.task_template },
    { label: 'Published File <-> Link', value: Array.isArray(sequence.published_file_links) ? sequence.published_file_links.join(', ') : sequence.published_file_links },
    { label: 'Open Notes Count', value: sequence.open_notes_count },
    { label: 'Project', value: sequence.project?.code || sequence.project?.name },
    { label: 'Created By', value: sequence.created_by_profile?.display_name || sequence.created_by_profile?.full_name },
    { label: 'Created At', value: sequence.created_at },
    { label: 'Updated At', value: sequence.updated_at },
    { label: 'Id', value: sequence.id },
  ]

  return (
    <div className="p-6">
      <div className="rounded-md border border-zinc-800 bg-zinc-950/70">
        <div className="border-b border-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-100">
          Sequence Info
        </div>
        <div className="divide-y divide-zinc-800">
          {fields.map((field) => {
            const formattedDate = formatDateLikeForDisplay(field.value)
            const value = formattedDate ?? field.value
            const hasValue = value !== null && value !== undefined && value !== ''
            const display = hasValue ? String(value) : '-'

            return (
              <div key={field.label} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-zinc-400">{field.label}</span>
                <span className="max-w-[60%] truncate text-zinc-100" title={display}>
                  {display}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
