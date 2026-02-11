'use client'

import { useEffect, useState } from 'react'
import { EntityNotesPanel } from '@/components/apex/entity-notes-panel'

export default function ShotNotesPage({
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

  return <EntityNotesPanel projectId={projectId} entityType="shot" entityId={shotId} />
}
