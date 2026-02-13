'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PostCard } from '@/components/pulse/post-card'

interface PostDetailPageProps {
  post: any
  currentUserId: string
}

export function PostDetailPage({ post, currentUserId }: PostDetailPageProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link
        href="/pulse"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </Link>

      <PostCard
        post={post}
        currentUserId={currentUserId}
      />
    </div>
  )
}
