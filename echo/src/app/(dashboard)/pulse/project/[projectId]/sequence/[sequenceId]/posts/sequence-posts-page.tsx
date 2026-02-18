'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Film, ArrowLeft } from 'lucide-react'
import { SimplePostComposer } from '@/components/pulse/simple-post-composer'
import { PostFeed } from '@/components/pulse/post-feed'

interface SequencePostsPageProps {
  projectId: string
  sequenceId: string
  project: { id: number; name: string; code: string }
  sequence: { id: number; name: string }
  currentUserId: string
  profile: { id: string; display_name: string; avatar_url: string | null } | null
}

export function SequencePostsPage({
  projectId,
  sequenceId,
  project,
  sequence,
  currentUserId,
  profile,
}: SequencePostsPageProps) {
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
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground/70">{sequence.name}</span>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <Film className="h-5 w-5 text-purple-400" />
          <h1 className="text-lg font-semibold text-foreground">
            {sequence.name}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Activity feed for sequence {sequence.name}
        </p>
      </div>

      {/* Composer - auto-tag with project + sequence */}
      <div className="mb-6">
        <SimplePostComposer
          authorProfile={profile || undefined}
          onPostCreated={handlePostCreated}
          defaultProjectIds={[parseInt(projectId)]}
          defaultSequenceIds={[parseInt(sequenceId)]}
        />
      </div>

      {/* Feed - filtered by sequence */}
      <PostFeed
        key={refreshKey}
        filters={{ sequenceIds: [parseInt(sequenceId)] }}
        currentUserId={currentUserId}
      />
    </div>
  )
}
