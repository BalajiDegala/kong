'use client'

import { useState } from 'react'
import { MoreHorizontal, Trash2, Edit, Globe, FolderOpen } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { deletePost } from '@/actions/posts'
import { PostMediaGallery } from './post-media-gallery'
import { ReactionPicker } from './reaction-picker'
import { CommentThread } from './comment-thread'
import { VideoReviewModal } from './video-review-modal'

interface PostCardProps {
  post: {
    id: number
    content: string
    content_html: string | null
    visibility: string
    media_count: number
    comment_count: number
    reaction_count: number
    created_at: string
    project_id: number | null
    author: { id: string; display_name: string; avatar_url: string | null } | null
    project?: { id: number; name: string; code: string } | null
    post_media?: Array<{
      id: number
      storage_path: string
      file_name: string
      mime_type: string
      media_type: 'image' | 'video'
      width?: number
      height?: number
    }>
    post_reactions?: Array<{ reaction_type: string; user_id: string }>
  }
  currentUserId?: string
  onDeleted?: () => void
}

export function PostCard({ post, currentUserId, onDeleted }: PostCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [videoMedia, setVideoMedia] = useState<any>(null)
  const isAuthor = currentUserId === post.author?.id

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return
    setIsDeleting(true)
    try {
      const result = await deletePost(post.id)
      if (result.error) {
        console.error('Failed to delete:', result.error)
        return
      }
      onDeleted?.()
    } finally {
      setIsDeleting(false)
      setShowMenu(false)
    }
  }

  return (
    <>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-300">
              {post.author?.display_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-200">
                  {post.author?.display_name || 'Unknown'}
                </span>
                {post.project && (
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <FolderOpen className="h-3 w-3" />
                    {post.project.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                <span className="text-zinc-600">·</span>
                <Globe className="h-3 w-3" />
                <span className="capitalize">{post.visibility}</span>
              </div>
            </div>
          </div>

          {/* Menu */}
          {isAuthor && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-36 rounded-md border border-zinc-700 bg-zinc-800 py-1 shadow-lg z-10">
                  <button className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700">
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-zinc-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          {post.content_html ? (
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: post.content_html }}
            />
          ) : (
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{post.content}</p>
          )}
        </div>

        {/* Media */}
        {post.post_media && post.post_media.length > 0 && (
          <div className="px-4 pb-3">
            <PostMediaGallery
              media={post.post_media}
              onVideoSelect={(media) => setVideoMedia(media)}
            />
          </div>
        )}

        {/* Reactions */}
        <div className="px-4 pb-2">
          <ReactionPicker
            postId={post.id}
            reactions={post.post_reactions || []}
            currentUserId={currentUserId}
          />
        </div>

        {/* Comments */}
        <div className="border-t border-zinc-800 px-4 py-3">
          <CommentThread
            postId={post.id}
            projectId={post.project_id?.toString()}
            currentUserId={currentUserId}
            commentCount={post.comment_count}
          />
        </div>
      </div>

      {/* Video Review Modal */}
      {videoMedia && (
        <VideoReviewModal
          media={videoMedia}
          onClose={() => setVideoMedia(null)}
        />
      )}
    </>
  )
}
