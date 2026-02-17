'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FolderOpen, ArrowLeft } from 'lucide-react'
import { SimplePostComposer } from '@/components/pulse/simple-post-composer'
import { PostFeed } from '@/components/pulse/post-feed'

interface ProjectPostsPageProps {
  projectId: string
  project: { id: number; name: string; code: string }
  currentUserId: string
  profile: { id: string; display_name: string; avatar_url: string | null } | null
}

export function ProjectPostsPage({
  projectId,
  project,
  currentUserId,
  profile,
}: ProjectPostsPageProps) {
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
            className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Pulse
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-300">{project.code || project.name}</span>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <FolderOpen className="h-5 w-5 text-blue-400" />
          <h1 className="text-lg font-semibold text-zinc-100">
            {project.name}
          </h1>
        </div>
        <p className="text-sm text-zinc-500">
          Activity feed for {project.name}
        </p>
      </div>

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
  )
}
