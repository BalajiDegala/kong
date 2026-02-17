import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDateLikeForDisplay } from '@/lib/date-display'

export default async function ShotInfoPage({
  params,
}: {
  params: Promise<{ projectId: string; shotId: string }>
}) {
  const { projectId, shotId } = await params
  const supabase = await createClient()

  const { data: shot } = await supabase
    .from('shots')
    .select(
      `
      *,
      sequence:sequences(id, code, name),
      project:projects(id, code, name),
      created_by_profile:profiles!shots_created_by_fkey(id, display_name, full_name)
    `
    )
    .eq('id', shotId)
    .eq('project_id', projectId)
    .single()

  if (!shot) {
    redirect(`/apex/${projectId}/shots`)
  }

  const fields = [
    { label: 'Shot Code', value: shot.code },
    { label: 'Shot Name', value: shot.name },
    { label: 'Sequence', value: shot.sequence ? `${shot.sequence.code} - ${shot.sequence.name}` : null },
    { label: 'Status', value: shot.status },
    { label: 'Description', value: shot.description },
    { label: 'Type', value: shot.shot_type },
    { label: 'Assets', value: Array.isArray(shot.assets) ? shot.assets.join(', ') : shot.assets },
    { label: 'Client Name', value: shot.client_name },
    { label: 'DD Client Name', value: shot.dd_client_name },
    { label: 'Cc', value: Array.isArray(shot.cc) ? shot.cc.join(', ') : shot.cc },
    { label: 'Comp Note', value: shot.comp_note },
    { label: 'Cut Duration', value: shot.cut_duration },
    { label: 'Cut In', value: shot.cut_in },
    { label: 'Cut Order', value: shot.cut_order },
    { label: 'Cut Out', value: shot.cut_out },
    { label: 'Cut Summary', value: shot.cut_summary },
    { label: 'DD Location', value: shot.dd_location },
    { label: 'Delivery Date', value: shot.delivery_date },
    { label: 'Duration Summary', value: shot.duration_summary },
    { label: 'Head Duration', value: shot.head_duration },
    { label: 'Head In', value: shot.head_in },
    { label: 'Head Out', value: shot.head_out },
    { label: 'Tail In', value: shot.tail_in },
    { label: 'Tail Out', value: shot.tail_out },
    { label: 'Next Review', value: shot.next_review },
    { label: 'Open Notes Count', value: shot.open_notes_count },
    { label: 'Parent Shots', value: Array.isArray(shot.parent_shots) ? shot.parent_shots.join(', ') : shot.parent_shots },
    { label: 'Plates', value: Array.isArray(shot.plates) ? shot.plates.join(', ') : shot.plates },
    { label: 'Project', value: shot.project?.code || shot.project?.name },
    { label: 'Seq Shot', value: shot.seq_shot },
    { label: 'Shot Notes', value: Array.isArray(shot.shot_notes) ? shot.shot_notes.join(', ') : shot.shot_notes },
    { label: 'Sub Shots', value: Array.isArray(shot.sub_shots) ? shot.sub_shots.join(', ') : shot.sub_shots },
    { label: 'Tags', value: Array.isArray(shot.tags) ? shot.tags.join(', ') : shot.tags },
    { label: 'Task Template', value: shot.task_template },
    { label: 'Target Date', value: shot.target_date },
    { label: 'Created By', value: shot.created_by_profile?.display_name || shot.created_by_profile?.full_name },
    { label: 'Created At', value: shot.created_at },
    { label: 'Updated At', value: shot.updated_at },
    { label: 'Id', value: shot.id },
  ]

  return (
    <div className="p-6">
      <div className="rounded-md border border-zinc-800 bg-zinc-950/70">
        <div className="border-b border-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-100">
          Shot Info
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
