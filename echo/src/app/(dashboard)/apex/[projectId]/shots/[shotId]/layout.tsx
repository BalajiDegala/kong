import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntityDetailHeader } from '@/components/apex/entity-detail-header'
import { appendAutoHeaderFields } from '@/lib/apex/entity-header-fields'
import { applyFieldOptionMap, loadEntityFieldOptionMap } from '@/lib/apex/entity-field-options'
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

  const { data: shotOptions } = await supabase
    .from('shots')
    .select('id, code, name')
    .eq('project_id', projectId)
    .order('code', { ascending: true })

  const sequenceLabel = shot.sequence
    ? `${shot.sequence.code} - ${shot.sequence.name}`
    : '-'
  const title = `${shot.code}${shot.name ? ` · ${shot.name}` : ''}`
  const switchOptions = (shotOptions || []).map((option) => ({
    id: String(option.id),
    label: `${option.code || `Shot ${option.id}`}${option.name ? ` · ${option.name}` : ''}`,
  }))
  const fieldOptionMap = await loadEntityFieldOptionMap(supabase, 'shot')
  const fields = applyFieldOptionMap(
    appendAutoHeaderFields(
      'shot',
      shot as Record<string, unknown>,
      [
      {
        id: 'status',
        label: 'Status',
        type: 'text',
        value: shot.status || null,
        editable: true,
        column: 'status',
      },
      {
        id: 'sequence',
        label: 'Sequence',
        type: 'readonly',
        value: sequenceLabel,
      },
      {
        id: 'cut_in',
        label: 'Cut In',
        type: 'number',
        value: shot.cut_in ?? null,
        editable: true,
        column: 'cut_in',
      },
      {
        id: 'cut_out',
        label: 'Cut Out',
        type: 'number',
        value: shot.cut_out ?? null,
        editable: true,
        column: 'cut_out',
      },
      {
        id: 'duration',
        label: 'Duration',
        type: 'readonly',
        value: shot.cut_duration ?? null,
      },
    ],
      {
        excludeColumns: ['sequence'],
      }
    ),
    fieldOptionMap
  )

  return (
    <div className="flex h-full flex-col">
      <EntityDetailHeader
        entityType="shot"
        entityPlural="shots"
        entityId={shotId}
        projectId={projectId}
        title={title}
        badge={shot.status || 'pending'}
        description={shot.description}
        descriptionColumn="description"
        thumbnailUrl={shot.thumbnail_url}
        thumbnailColumn="thumbnail_url"
        thumbnailPlaceholder="No Thumbnail"
        switchOptions={switchOptions}
        tabPaths={[
          'activity',
          'info',
          'tasks',
          'notes',
          'versions',
          'publishes',
          'assets',
          'history',
        ]}
        fields={fields}
        defaultVisibleFieldIds={['sequence', 'cut_in', 'cut_out', 'duration']}
      />

      <ShotTabs projectId={projectId} shotId={shotId} />

      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
