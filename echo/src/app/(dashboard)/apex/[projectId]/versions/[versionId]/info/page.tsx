import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDateLikeForDisplay } from '@/lib/date-display'

export default async function VersionInfoPage({
  params,
}: {
  params: Promise<{ projectId: string; versionId: string }>
}) {
  const { projectId, versionId } = await params
  const supabase = await createClient()

  const { data: version } = await supabase
    .from('versions')
    .select(
      `
      *,
      artist:profiles!versions_created_by_fkey(id, display_name, full_name),
      task:tasks(id, name),
      project:projects(id, code, name)
    `
    )
    .eq('id', versionId)
    .eq('project_id', projectId)
    .single()

  if (!version) {
    redirect(`/apex/${projectId}/versions`)
  }

  const fields = [
    { label: 'Version Code', value: version.code },
    { label: 'Version Number', value: version.version_number },
    { label: 'Status', value: version.status },
    { label: 'Description', value: version.description },
    { label: 'Artist', value: version.artist?.display_name || version.artist?.full_name },
    { label: 'Task', value: version.task?.name },
    { label: 'Client Approved', value: version.client_approved ? 'Yes' : 'No' },
    { label: 'Client Approved At', value: version.client_approved_at },
    { label: 'Client Approved By', value: version.client_approved_by },
    { label: 'Client Version Name', value: version.client_version_name },
    { label: 'Cuts', value: version.cuts },
    { label: 'Date Viewed', value: version.date_viewed },
    { label: 'Department', value: version.department },
    { label: 'Editorial QC', value: version.editorial_qc },
    { label: 'First Frame', value: version.first_frame },
    { label: 'Last Frame', value: version.last_frame },
    { label: 'Frame Count', value: version.frame_count },
    { label: 'Frame Range', value: version.frame_range },
    { label: 'Flagged', value: version.flagged ? 'Yes' : 'No' },
    { label: 'Movie Aspect Ratio', value: version.movie_aspect_ratio },
    { label: 'Movie Has Slate', value: version.movie_has_slate ? 'Yes' : 'No' },
    { label: 'Nuke Script', value: version.nuke_script },
    { label: 'Path to Frames', value: version.frames_path },
    { label: 'Path to Movie', value: version.movie_url },
    { label: 'Playlists', value: Array.isArray(version.playlists) ? version.playlists.join(', ') : version.playlists },
    { label: 'Published Files', value: Array.isArray(version.published_files) ? version.published_files.join(', ') : version.published_files },
    { label: 'Send EXRs', value: version.send_exrs ? 'Yes' : 'No' },
    { label: 'Source Clip', value: version.source_clip },
    { label: 'Tags', value: Array.isArray(version.tags) ? version.tags.join(', ') : version.tags },
    { label: 'Task Template', value: version.task_template },
    { label: 'Type', value: version.version_type },
    { label: 'Uploaded Movie', value: version.uploaded_movie },
    { label: 'Viewed/Unviewed', value: version.viewed_status },
    { label: 'Project', value: version.project?.code || version.project?.name },
    { label: 'Created At', value: version.created_at },
    { label: 'Updated At', value: version.updated_at },
    { label: 'Id', value: version.id },
  ]

  return (
    <div className="p-6">
      <div className="rounded-md border border-zinc-800 bg-zinc-950/70">
        <div className="border-b border-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-100">
          Version Info
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
