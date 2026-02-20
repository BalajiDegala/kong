'use client'

import { useEffect, useState } from 'react'
import { EntityVersionsPanel } from '@/components/apex/entity-versions-panel'

export default function ShotVersionsPage({
  params,
}: {
  params: Promise<{ projectId: string; shotId: string }>
}) {
  const [projectId, setProjectId] = useState('')
  const [shotId, setShotId] = useState('')

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId)
      setShotId(p.shotId)
    })
  }, [params])

  if (!projectId || !shotId) return null

  return (
    <EntityVersionsPanel
      projectId={projectId}
      entityType="shot"
      entityId={shotId}
      emptyMessage="No versions linked to this shot yet."
    />
  )
}
