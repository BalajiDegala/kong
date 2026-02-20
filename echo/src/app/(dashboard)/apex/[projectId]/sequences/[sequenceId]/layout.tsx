import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntityDetailHeader } from '@/components/apex/entity-detail-header'
import { appendAutoHeaderFields } from '@/lib/apex/entity-header-fields'
import { applyFieldOptionMap, loadEntityFieldOptionMap } from '@/lib/apex/entity-field-options'
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
    .is('deleted_at', null)
    .single()

  if (!sequence) {
    redirect(`/apex/${projectId}/sequences`)
  }

  const { data: sequenceOptions } = await supabase
    .from('sequences')
    .select('id, code, name')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('code', { ascending: true })

  const title = `${sequence.code}${sequence.name ? ` · ${sequence.name}` : ''}`
  const switchOptions = (sequenceOptions || []).map((option) => ({
    id: String(option.id),
    label: `${option.code || `Sequence ${option.id}`}${
      option.name ? ` · ${option.name}` : ''
    }`,
  }))
  const fieldOptionMap = await loadEntityFieldOptionMap(supabase, 'sequence')
  const fields = applyFieldOptionMap(
    appendAutoHeaderFields(
      'sequence',
      sequence as Record<string, unknown>,
      [
      {
        id: 'status',
        label: 'Status',
        type: 'text',
        value: sequence.status || null,
        editable: true,
        column: 'status',
      },
      {
        id: 'client_name',
        label: 'Client Name',
        type: 'text',
        value: sequence.client_name || null,
        editable: true,
        column: 'client_name',
      },
      {
        id: 'dd_client_name',
        label: 'DD Client Name',
        type: 'text',
        value: sequence.dd_client_name || null,
        editable: true,
        column: 'dd_client_name',
      },
      {
        id: 'code',
        label: 'Sequence Code',
        type: 'readonly',
        value: sequence.code || null,
      },
      ]
    ),
    fieldOptionMap
  )

  return (
    <div className="flex h-full flex-col">
      <EntityDetailHeader
        entityType="sequence"
        entityPlural="sequences"
        entityId={sequenceId}
        projectId={projectId}
        title={title}
        badge={sequence.status || 'active'}
        description={sequence.description}
        descriptionColumn="description"
        thumbnailUrl={sequence.thumbnail_url}
        thumbnailColumn="thumbnail_url"
        thumbnailPlaceholder="No Thumbnail"
        switchOptions={switchOptions}
        tabPaths={[
          'activity',
          'info',
          'tasks',
          'shots',
          'assets',
          'notes',
          'publishes',
          'history',
        ]}
        fields={fields}
        defaultVisibleFieldIds={['status', 'client_name', 'dd_client_name', 'code']}
      />

      <SequenceTabs projectId={projectId} sequenceId={sequenceId} />

      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
