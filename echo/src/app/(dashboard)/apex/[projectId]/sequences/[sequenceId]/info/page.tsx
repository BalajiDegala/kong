import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntityInfoPanel } from '@/components/apex/entity-info-panel'
import { buildEntityInfoFields } from '@/lib/apex/entity-info-fields'
import { applyFieldOptionMap, loadEntityFieldOptionMap } from '@/lib/apex/entity-field-options'

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
    .is('deleted_at', null)
    .single()

  if (!sequence) {
    redirect(`/apex/${projectId}/sequences`)
  }

  const fieldOptionMap = await loadEntityFieldOptionMap(supabase, 'sequence')
  const fields = applyFieldOptionMap(
    buildEntityInfoFields(
      'sequence',
      sequence as Record<string, unknown>,
      [
      {
        id: 'project_display',
        label: 'Project',
        type: 'readonly',
        value: sequence.project?.code || sequence.project?.name || null,
      },
      {
        id: 'created_by_display',
        label: 'Created By',
        type: 'readonly',
        value:
          sequence.created_by_profile?.display_name ||
          sequence.created_by_profile?.full_name ||
          null,
      },
    ],
      {
        excludeColumns: [
          'project',
          'project_id',
          'created_by',
          'created_by_profile',
        ],
      }
    ),
    fieldOptionMap
  )

  return (
    <EntityInfoPanel
      entityType="sequence"
      entityId={sequenceId}
      projectId={projectId}
      title="Sequence Info"
      fields={fields}
    />
  )
}
