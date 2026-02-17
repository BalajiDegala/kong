'use client'

import { useEffect, useState } from 'react'
import { EntityTasksPanel } from '@/components/apex/entity-tasks-panel'

export default function AssetTasksPage({
  params,
}: {
  params: Promise<{ projectId: string; assetId: string }>
}) {
  const [projectId, setProjectId] = useState('')
  const [assetId, setAssetId] = useState('')

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId)
      setAssetId(p.assetId)
    })
  }, [params])

  if (!projectId || !assetId) {
    return (
      <div className="p-6">
        <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
          Loading tasks...
        </div>
      </div>
    )
  }

  return <EntityTasksPanel projectId={projectId} entityType="asset" entityId={assetId} />
}
