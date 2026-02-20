'use client'

import { useEffect, useState } from 'react'
import { EntityVersionsPanel } from '@/components/apex/entity-versions-panel'

export default function TaskVersionsPage({
  params,
}: {
  params: Promise<{ projectId: string; taskId: string }>
}) {
  const [projectId, setProjectId] = useState('')
  const [taskId, setTaskId] = useState('')

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId)
      setTaskId(p.taskId)
    })
  }, [params])

  if (!projectId || !taskId) return null

  return (
    <EntityVersionsPanel
      projectId={projectId}
      entityType="task"
      entityId={taskId}
      emptyMessage="No versions linked to this task yet."
    />
  )
}
