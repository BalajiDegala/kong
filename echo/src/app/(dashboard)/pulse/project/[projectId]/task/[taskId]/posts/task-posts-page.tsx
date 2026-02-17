'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckSquare, ArrowLeft } from 'lucide-react'
import { SimplePostComposer } from '@/components/pulse/simple-post-composer'
import { PostFeed } from '@/components/pulse/post-feed'

interface TaskPostsPageProps {
  projectId: string
  taskId: string
  project: { id: number; name: string; code: string }
  task: { id: number; name: string; entity_type: string; entity_id: number | null }
  entityDetails: any
  currentUserId: string
  profile: { id: string; display_name: string; avatar_url: string | null } | null
}

export function TaskPostsPage({
  projectId,
  taskId,
  project,
  task,
  entityDetails,
  currentUserId,
  profile,
}: TaskPostsPageProps) {
  const [refreshKey, setRefreshKey] = useState(0)

  const handlePostCreated = () => {
    setRefreshKey((prev) => prev + 1)
  }

  // Build default tags based on task's entity
  const defaultProjectIds = [parseInt(projectId)]
  const defaultSequenceIds = entityDetails?.sequence ? [entityDetails.sequence.id] : undefined
  const defaultShotIds = entityDetails?.shot ? [entityDetails.shot.id] : undefined
  const defaultTaskIds = [parseInt(taskId)]

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header with breadcrumbs */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm mb-2">
          <Link
            href="/pulse"
            className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Pulse
          </Link>
          <span className="text-zinc-600">/</span>
          <Link
            href={`/pulse/project/${projectId}/posts`}
            className="text-zinc-400 hover:text-zinc-200 transition"
          >
            {project.code || project.name}
          </Link>

          {entityDetails?.sequence && (
            <>
              <span className="text-zinc-600">/</span>
              <Link
                href={`/pulse/project/${projectId}/sequence/${entityDetails.sequence.id}/posts`}
                className="text-zinc-400 hover:text-zinc-200 transition"
              >
                {entityDetails.sequence.name}
              </Link>
            </>
          )}

          {entityDetails?.shot && (
            <>
              <span className="text-zinc-600">/</span>
              <Link
                href={`/pulse/project/${projectId}/shot/${entityDetails.shot.id}/posts`}
                className="text-zinc-400 hover:text-zinc-200 transition"
              >
                {entityDetails.shot.name}
              </Link>
            </>
          )}

          {entityDetails?.asset && (
            <>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-400">{entityDetails.asset.name}</span>
            </>
          )}

          <span className="text-zinc-600">/</span>
          <span className="text-zinc-300">{task.name}</span>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <CheckSquare className="h-5 w-5 text-amber-400" />
          <h1 className="text-lg font-semibold text-zinc-100">
            {task.name}
          </h1>
        </div>
        <p className="text-sm text-zinc-500">
          Activity feed for task {task.name}
        </p>
      </div>

      {/* Composer - auto-tag with full context */}
      <div className="mb-6">
        <SimplePostComposer
          authorProfile={profile || undefined}
          onPostCreated={handlePostCreated}
          defaultProjectIds={defaultProjectIds}
          defaultSequenceIds={defaultSequenceIds}
          defaultShotIds={defaultShotIds}
          defaultTaskIds={defaultTaskIds}
        />
      </div>

      {/* Feed - filtered by task */}
      <PostFeed
        key={refreshKey}
        filters={{ taskIds: [parseInt(taskId)] }}
        currentUserId={currentUserId}
      />
    </div>
  )
}
