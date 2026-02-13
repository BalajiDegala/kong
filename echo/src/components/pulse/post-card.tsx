'use client'

import { useState } from 'react'
import { MoreHorizontal, Trash2, Edit, Globe, FolderOpen, X, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { deletePost, updatePost } from '@/actions/posts'
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content)
  const [displayContent, setDisplayContent] = useState(post.content)
  const [isSaving, setIsSaving] = useState(false)
  const [videoMedia, setVideoMedia] = useState<any>(null)
  const isAuthor = currentUserId === post.author?.id

  const handleDelete = async () => {
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
      setShowDeleteConfirm(false)
      setShowMenu(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditContent(displayContent)
    setShowMenu(false)
  }

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return
    setIsSaving(true)
    try {
      const result = await updatePost(post.id, { content: editContent.trim() })
      if (result.error) {
        console.error('Failed to update:', result.error)
        return
      }
      // Update local state - no page refresh needed!
      setDisplayContent(editContent.trim())
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditContent(displayContent)
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
                  <button
                    onClick={handleEdit}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(true)
                      setShowMenu(false)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-zinc-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                disabled={isSaving}
                rows={4}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editContent.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-zinc-900 rounded-md text-sm font-medium hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="h-3.5 w-3.5" />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : post.content_html ? (
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: post.content_html }}
            />
          ) : (
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{displayContent}</p>
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          />

          {/* Modal */}
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100">Delete Post</h3>
            </div>

            <div className="px-6 py-4">
              <p className="text-sm text-zinc-300">
                Are you sure you want to delete this post? This action cannot be undone.
              </p>
            </div>

            <div className="px-6 py-4 bg-zinc-800/50 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
