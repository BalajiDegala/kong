'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Camera, ArrowLeft } from 'lucide-react'
import { SimplePostComposer } from '@/components/pulse/simple-post-composer'
import { PostFeed } from '@/components/pulse/post-feed'

interface ShotPostsPageProps {
  projectId: string
  shotId: string
  project: { id: number; name: string; code: string }
  sequence: { id: number; name: string } | null
  shot: { id: number; name: string; sequence_id: number | null }
  currentUserId: string
  profile: { id: string; display_name: string; avatar_url: string | null } | null
}

export function ShotPostsPage({
  projectId,
  shotId,
  project,
  sequence,
  shot,
  currentUserId,
  profile,
}: ShotPostsPageProps) {
  const [refreshKey, setRefreshKey] = useState(0)

  const handlePostCreated = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header with breadcrumbs */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm mb-2">
          <Link
            href="/pulse"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground/80 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Pulse
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link
            href={`/pulse/project/${projectId}/posts`}
            className="text-muted-foreground hover:text-foreground/80 transition"
          >
            {project.code || project.name}
          </Link>
          {sequence && (
            <>
              <span className="text-muted-foreground">/</span>
              <Link
                href={`/pulse/project/${projectId}/sequence/${sequence.id}/posts`}
                className="text-muted-foreground hover:text-foreground/80 transition"
              >
                {sequence.name}
              </Link>
            </>
          )}
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground/70">{shot.name}</span>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <Camera className="h-5 w-5 text-green-400" />
          <h1 className="text-lg font-semibold text-foreground">
            {shot.name}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Activity feed for shot {shot.name}
        </p>
      </div>

      {/* Composer - auto-tag with project + sequence + shot */}
      <div className="mb-6">
        <SimplePostComposer
          authorProfile={profile || undefined}
          onPostCreated={handlePostCreated}
          defaultProjectIds={[parseInt(projectId)]}
          defaultSequenceIds={sequence ? [sequence.id] : undefined}
          defaultShotIds={[parseInt(shotId)]}
        />
      </div>

      {/* Feed - filtered by shot */}
      <PostFeed
        key={refreshKey}
        filters={{ shotIds: [parseInt(shotId)] }}
        currentUserId={currentUserId}
      />
    </div>
  )
}
