'use client'

import { useEffect, useState } from 'react'
import { EntityTasksPanel } from '@/components/apex/entity-tasks-panel'

export default function SequenceTasksPage({
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

  if (!projectId || !sequenceId) {
    return (
      <div className="p-6">
        <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
          Loading tasks...
        </div>
      </div>
    )
  }

  return (
    <EntityTasksPanel
      projectId={projectId}
      entityType="sequence"
      entityId={sequenceId}
    />
  )
}
