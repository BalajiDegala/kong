'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Link as LinkIcon, Check } from 'lucide-react'
import { PostCard } from '@/components/pulse/post-card'

interface PostDetailPageProps {
  post: any
  entities: {
    projects: Array<{ id: number; name: string; code: string }>
    sequences: Array<{ id: number; name: string }>
    shots: Array<{ id: number; name: string }>
    tasks: Array<{ id: number; name: string }>
    users: string[]
  }
  currentUserId: string
}

export function PostDetailPage({ post, entities, currentUserId }: PostDetailPageProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/pulse/post/${post.id}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Build breadcrumbs from entities
  const primaryProject = entities.projects[0]
  const primarySequence = entities.sequences[0]
  const primaryShot = entities.shots[0]
  const primaryTask = entities.tasks[0]

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header with breadcrumbs and copy link */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/pulse"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground/80 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Pulse
          </Link>

          {/* Breadcrumbs showing post context */}
          {primaryProject && (
            <>
              <span className="text-muted-foreground">/</span>
              <Link
                href={`/pulse/project/${primaryProject.id}/posts`}
                className="text-muted-foreground hover:text-foreground/80 transition"
              >
                {primaryProject.code || primaryProject.name}
              </Link>
            </>
          )}

          {primarySequence && (
            <>
              <span className="text-muted-foreground">/</span>
              <Link
                href={`/pulse/project/${primaryProject?.id}/sequence/${primarySequence.id}/posts`}
                className="text-muted-foreground hover:text-foreground/80 transition"
              >
                {primarySequence.name}
              </Link>
            </>
          )}

          {primaryShot && (
            <>
              <span className="text-muted-foreground">/</span>
              <Link
                href={`/pulse/project/${primaryProject?.id}/shot/${primaryShot.id}/posts`}
                className="text-muted-foreground hover:text-foreground/80 transition"
              >
                {primaryShot.name}
              </Link>
            </>
          )}

          {primaryTask && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground/70">{primaryTask.name}</span>
            </>
          )}
        </div>

        {/* Copy Link Button */}
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-accent hover:bg-secondary text-foreground/70 hover:text-foreground transition border border-border"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-400" />
              Copied!
            </>
          ) : (
            <>
              <LinkIcon className="h-3.5 w-3.5" />
              Copy Link
            </>
          )}
        </button>
      </div>

      {/* Post Card */}
      <PostCard
        post={post}
        currentUserId={currentUserId}
      />
    </div>
  )
}
