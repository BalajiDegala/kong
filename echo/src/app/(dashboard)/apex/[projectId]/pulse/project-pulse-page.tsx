'use client'

import { useState } from 'react'
import { SimplePostComposer } from '@/components/pulse/simple-post-composer'
import { PostFeed } from '@/components/pulse/post-feed'
import { ApexPageShell } from '@/components/apex/apex-page-shell'

interface ProjectPulsePageProps {
  projectId: string
  project: { id: number; name: string; code: string }
  currentUserId: string
  profile: { id: string; display_name: string; avatar_url: string | null } | null
}

export function ProjectPulsePage({
  projectId,
  project,
  currentUserId,
  profile,
}: ProjectPulsePageProps) {
  const [refreshKey, setRefreshKey] = useState(0)

  const handlePostCreated = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <ApexPageShell title="Pulse">
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Composer - auto-tag with projectId */}
        <div className="mb-6">
          <SimplePostComposer
            authorProfile={profile || undefined}
            onPostCreated={handlePostCreated}
            defaultProjectIds={[parseInt(projectId)]}
          />
        </div>

        {/* Feed - filtered by project */}
        <PostFeed
          key={refreshKey}
          filters={{ projectIds: [parseInt(projectId)] }}
          currentUserId={currentUserId}
        />
      </div>
    </ApexPageShell>
  )
}
