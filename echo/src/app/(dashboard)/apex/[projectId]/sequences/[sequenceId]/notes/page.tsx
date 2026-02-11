'use client'

import { useEffect, useState } from 'react'
import { EntityNotesPanel } from '@/components/apex/entity-notes-panel'

export default function SequenceNotesPage({
  params,
}: {
  params: Promise<{ projectId: string; sequenceId: string }>
}) {
  const [projectId, setProjectId] = useState('')
  const [sequenceId, setSequenceId] = useState('')

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId)
      setSequenceId(p.sequenceId)
    })
  }, [params])

  return (
    <EntityNotesPanel
      projectId={projectId}
      entityType="sequence"
      entityId={sequenceId}
    />
  )
}
