'use client'

import { useEffect, useState } from 'react'
import { EntityNotesPanel } from '@/components/apex/entity-notes-panel'

export default function TaskNotesPage({
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

  return <EntityNotesPanel projectId={projectId} entityType="task" entityId={taskId} />
}
