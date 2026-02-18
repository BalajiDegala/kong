'use client'

import { useEffect, useState } from 'react'
import { EntityTasksPanel } from '@/components/apex/entity-tasks-panel'

export default function ShotTasksPage({
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

  if (!projectId || !shotId) {
    return (
      <div className="p-6">
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Loading tasks...
        </div>
      </div>
    )
  }

  return <EntityTasksPanel projectId={projectId} entityType="shot" entityId={shotId} />
}
