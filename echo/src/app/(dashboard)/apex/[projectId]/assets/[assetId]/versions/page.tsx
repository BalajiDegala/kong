'use client'

import { useEffect, useState } from 'react'
import { EntityVersionsPanel } from '@/components/apex/entity-versions-panel'

export default function AssetVersionsPage({
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

  if (!projectId || !assetId) return null

  return (
    <EntityVersionsPanel
      projectId={projectId}
      entityType="asset"
      entityId={assetId}
      emptyMessage="No versions found for this asset."
    />
  )
}
