import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntityDetailHeader } from '@/components/apex/entity-detail-header'
import { buildDetailFields } from '@/lib/fields/detail-builder'
import { asText, parseTextArray } from '@/lib/fields'
import { ShotTabs } from '@/components/layout/shot-tabs'

function resolveShotVersionId(shot: Record<string, unknown>): string | null {
  const linked = parseTextArray(shot.version_link)
  if (linked.length > 0) return linked[0]
  const fallback = parseTextArray(shot.versions)
  if (fallback.length > 0) return fallback[0]
  return null
}

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
    .is('deleted_at', null)
    .single()

  if (!shot) {
    redirect(`/apex/${projectId}/shots`)
  }

  const { data: shotOptions } = await supabase
    .from('shots')
    .select('id, code, name')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('code', { ascending: true })

  const sequenceLabel = shot.sequence
    ? `${shot.sequence.code} - ${shot.sequence.name}`
    : '-'
  const title = `${shot.code}${shot.name ? ` · ${shot.name}` : ''}`
  const switchOptions = (shotOptions || []).map((option) => ({
    id: String(option.id),
    label: `${option.code || `Shot ${option.id}`}${option.name ? ` · ${option.name}` : ''}`,
  }))

  const { fields } = await buildDetailFields({
    entity: 'shot',
    row: shot as Record<string, unknown>,
    supabase,
    projectId,
    manualFields: ['status', 'cut_in', 'cut_out', 'cut_duration'],
    prependFields: [],
    excludeFields: ['sequence_id'],
  })

  // Insert the computed sequence label as a readonly field after status
  const sequenceField = {
    id: 'sequence',
    label: 'Sequence',
    type: 'readonly' as const,
    value: sequenceLabel,
  }
  const statusIndex = fields.findIndex((f) => f.id === 'status')
  if (statusIndex >= 0) {
    fields.splice(statusIndex + 1, 0, sequenceField)
  } else {
    fields.unshift(sequenceField)
  }

  const linkedShotVersionId = resolveShotVersionId(shot as Record<string, unknown>)

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
        thumbnailLinkHref={
          linkedShotVersionId ? `/apex/${projectId}/versions/${linkedShotVersionId}/activity` : null
        }
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
        defaultVisibleFieldIds={['sequence', 'cut_in', 'cut_out', 'cut_duration']}
      />

      <ShotTabs projectId={projectId} shotId={shotId} />

      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
