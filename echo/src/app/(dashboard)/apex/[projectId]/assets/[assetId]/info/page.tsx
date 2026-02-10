import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AssetInfoPage({
  params,
}: {
  params: Promise<{ projectId: string; assetId: string }>
}) {
  const { projectId, assetId } = await params
  const supabase = await createClient()

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

  const fields = [
    { label: 'Asset Name', value: asset.name },
    { label: 'Type', value: asset.asset_type },
    { label: 'Status', value: asset.status },
    { label: 'Description', value: asset.description },
    { label: 'Client Name', value: asset.client_name },
    { label: 'DD Client Name', value: asset.dd_client_name },
    { label: 'Task Template', value: asset.task_template },
    { label: 'Project', value: asset.project?.code || asset.project?.name },
    {
      label: 'Sequence',
      value: asset.sequence ? `${asset.sequence.code} - ${asset.sequence.name}` : null,
    },
    {
      label: 'Shot',
      value: asset.shot ? `${asset.shot.code} - ${asset.shot.name}` : null,
    },
    { label: 'Shots', value: Array.isArray(asset.shots) ? asset.shots.join(', ') : null },
    {
      label: 'Vendor Groups',
      value: Array.isArray(asset.vendor_groups) ? asset.vendor_groups.join(', ') : null,
    },
    { label: 'Sub Assets', value: Array.isArray(asset.sub_assets) ? asset.sub_assets.join(', ') : null },
    { label: 'Tags', value: Array.isArray(asset.tags) ? asset.tags.join(', ') : null },
    {
      label: 'Parent Assets',
      value: Array.isArray(asset.parent_assets) ? asset.parent_assets.join(', ') : null,
    },
    {
      label: 'Sequences',
      value: Array.isArray(asset.sequences) ? asset.sequences.join(', ') : null,
    },
    { label: 'Keep', value: asset.keep ? 'Yes' : 'No' },
    { label: 'Outsource', value: asset.outsource ? 'Yes' : 'No' },
    { label: 'Id', value: asset.id },
    { label: 'Created At', value: asset.created_at },
    { label: 'Updated At', value: asset.updated_at },
  ]

  return (
    <div className="p-6">
      <div className="rounded-md border border-zinc-800 bg-zinc-950/70">
        <div className="border-b border-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-100">
          Asset Info
        </div>
        <div className="divide-y divide-zinc-800">
          {fields.map((field) => (
            <div key={field.label} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-zinc-400">{field.label}</span>
              <span className="max-w-[60%] truncate text-zinc-100" title={String(field.value ?? '')}>
                {field.value || '-'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
