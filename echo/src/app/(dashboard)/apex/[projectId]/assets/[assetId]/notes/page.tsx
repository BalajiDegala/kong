'use client'

import { useEffect, useState } from 'react'
import { EntityNotesPanel } from '@/components/apex/entity-notes-panel'

export default function AssetNotesPage({
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

  return <EntityNotesPanel projectId={projectId} entityType="asset" entityId={assetId} />
}
