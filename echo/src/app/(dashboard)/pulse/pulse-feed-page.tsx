'use client'

import { useState } from 'react'
import { Activity } from 'lucide-react'
import { PostComposer } from '@/components/pulse/post-composer'
import { SimplePostComposer } from '@/components/pulse/simple-post-composer'
import { PostFeed } from '@/components/pulse/post-feed'
import { TestPostButton } from './test-post-button'

interface PulseFeedPageProps {
  currentUserId: string
  profile: { id: string; display_name: string; avatar_url: string | null } | null
  projectId?: number
  projectName?: string
}

export function PulseFeedPage({ currentUserId, profile, projectId, projectName }: PulseFeedPageProps) {
  const [refreshKey, setRefreshKey] = useState(0)

  const handlePostCreated = () => {
    // Trigger feed refresh without full page reload
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-5 w-5 text-amber-400" />
          <h1 className="text-lg font-semibold text-zinc-100">
            {projectName ? `${projectName} — Pulse` : 'Pulse'}
          </h1>
        </div>
        <p className="text-sm text-zinc-500">
          {projectName
            ? 'Share updates, review media, and collaborate with your team.'
            : 'Company-wide feed — share updates, review media, and collaborate.'}
        </p>
      </div>

      {/* Composer (Simple version for now) */}
      <div className="mb-6">
        <SimplePostComposer
          projectId={projectId}
          authorProfile={profile || undefined}
          onPostCreated={handlePostCreated}
        />
      </div>

      {/* Original Tiptap Composer (debugging) */}
      {false && (
        <div className="mb-6">
          <PostComposer
            projectId={projectId}
            authorProfile={profile || undefined}
          />
        </div>
      )}

      {/* Feed */}
      <PostFeed
        key={refreshKey}
        projectId={projectId}
        currentUserId={currentUserId}
      />
    </div>
  )
}
