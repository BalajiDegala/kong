'use client'

import { useState, useEffect, useRef } from 'react'
import { MoreHorizontal, Trash2, Edit, Globe, FolderOpen, X, Check, Link as LinkIcon } from 'lucide-react'
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
    projects?: Array<{ id: number; name: string }>
    sequences?: Array<{ id: number; name: string; project_id?: number }>
    shots?: Array<{ id: number; name: string; sequence_id?: number }>
    tasks?: Array<{ id: number; name: string; entity_id?: number; entity_type?: string }>
    mentioned_users?: Array<{ id: string; display_name: string }>
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
  onEntityClick?: (entityType: string, entityId: string | number) => void
}

export function PostCard({ post, currentUserId, onDeleted, onEntityClick }: PostCardProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content)
  const [displayContent, setDisplayContent] = useState(post.content)
  const [isSaving, setIsSaving] = useState(false)
  const [videoMedia, setVideoMedia] = useState<any>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const isAuthor = currentUserId === post.author?.id
  const resolvedProjectId =
    post.project_id?.toString() ||
    post.projects?.[0]?.id?.toString() ||
    post.sequences?.find((sequence) => typeof sequence.project_id === 'number')?.project_id?.toString()

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

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/pulse/post/${post.id}`
    await navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [showMenu])

  return (
    <>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-foreground/70">
              {post.author?.display_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground/80">
                  {post.author?.display_name || 'Unknown'}
                </span>
                {post.project && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FolderOpen className="h-3 w-3" />
                    {post.project.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                <span className="text-muted-foreground">·</span>
                <Globe className="h-3 w-3" />
                <span className="capitalize">{post.visibility}</span>
                <span className="text-muted-foreground">·</span>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground/70 transition"
                  title="Copy link to post"
                >
                  {linkCopied ? (
                    <>
                      <Check className="h-3 w-3 text-green-400" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="h-3 w-3" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Menu */}
          {isAuthor && (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-muted-foreground hover:text-foreground/70 rounded transition"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-36 rounded-md border border-border bg-accent py-1 shadow-lg z-10">
                  <button
                    onClick={handleEdit}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-foreground/70 hover:bg-secondary"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(true)
                      setShowMenu(false)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-secondary"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Entity Tags */}
        {(post.projects?.length || post.sequences?.length || post.shots?.length || post.tasks?.length || post.mentioned_users?.length) ? (
          <div className="px-4 pt-2 pb-1 border-t border-border/50">
            <div className="flex flex-wrap items-center gap-1.5">
              {post.projects?.map((project) => (
                <button
                  key={`project-${project.id}`}
                  onClick={() => onEntityClick?.('project', project.id)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition max-w-xs"
                  title={project.name}
                >
                  <FolderOpen className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{project.name}</span>
                </button>
              ))}

              {post.sequences?.map((sequence: any) => {
                // Try to get project name from the enriched data
                const projectName = post.projects?.find(p => p.id === sequence.project_id)?.name
                const fullPath = projectName ? `${projectName} > ${sequence.name}` : sequence.name

                return (
                  <button
                    key={`sequence-${sequence.id}`}
                    onClick={() => onEntityClick?.('sequence', sequence.id)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition max-w-xs"
                    title={fullPath}
                  >
                    <span className="font-medium flex-shrink-0">SEQ:</span>
                    <span className="truncate">{fullPath}</span>
                  </button>
                )
              })}

              {post.shots?.map((shot: any) => {
                // Build full context path
                const sequenceName = post.sequences?.find(s => s.id === shot.sequence_id)?.name
                const projectId = post.sequences?.find(s => s.id === shot.sequence_id)?.project_id
                const projectName = post.projects?.find(p => p.id === projectId)?.name

                let fullPath = shot.name
                if (sequenceName) {
                  fullPath = `${sequenceName} > ${shot.name}`
                  if (projectName) {
                    fullPath = `${projectName} > ${fullPath}`
                  }
                }

                return (
                  <button
                    key={`shot-${shot.id}`}
                    onClick={() => onEntityClick?.('shot', shot.id)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition max-w-xs"
                    title={fullPath}
                  >
                    <span className="font-medium flex-shrink-0">SHOT:</span>
                    <span className="truncate">{fullPath}</span>
                  </button>
                )
              })}

              {post.tasks?.map((task: any) => {
                // Build full context: Project > Seq > Shot > Task or Project > Seq > Task
                let fullPath = task.name
                const shotName = post.shots?.find(s => s.id === task.entity_id && task.entity_type === 'shot')?.name
                const sequenceName = post.sequences?.find(s => s.id === task.entity_id && task.entity_type === 'sequence')?.name

                if (shotName) {
                  const shot = post.shots?.find(s => s.id === task.entity_id)
                  const seqName = post.sequences?.find(s => s.id === shot?.sequence_id)?.name
                  const projId = post.sequences?.find(s => s.id === shot?.sequence_id)?.project_id
                  const projName = post.projects?.find(p => p.id === projId)?.name

                  fullPath = shotName
                  if (seqName) fullPath = `${seqName} > ${fullPath}`
                  if (projName) fullPath = `${projName} > ${fullPath}`
                  fullPath = `${fullPath} > ${task.name}`
                } else if (sequenceName) {
                  const seq = post.sequences?.find(s => s.id === task.entity_id)
                  const projName = post.projects?.find(p => p.id === seq?.project_id)?.name

                  fullPath = sequenceName
                  if (projName) fullPath = `${projName} > ${fullPath}`
                  fullPath = `${fullPath} > ${task.name}`
                }

                return (
                  <button
                    key={`task-${task.id}`}
                    onClick={() => onEntityClick?.('task', task.id)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition max-w-xs"
                    title={fullPath}
                  >
                    <Check className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{fullPath}</span>
                  </button>
                )
              })}

              {post.mentioned_users?.map((user) => (
                <button
                  key={`user-${user.id}`}
                  onClick={() => onEntityClick?.('user', user.id)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-secondary text-foreground/70 border border-border hover:bg-muted-foreground/40 transition"
                >
                  @{user.display_name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Content */}
        <div className="px-4 py-3">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                disabled={isSaving}
                rows={4}
                className="w-full px-3 py-2 bg-accent border border-border rounded-md text-sm text-foreground/80 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editContent.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="h-3.5 w-3.5" />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground/80"
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
            <p className="text-sm text-foreground/70 whitespace-pre-wrap">{displayContent}</p>
          )}
        </div>

        {/* Media */}
        {post.post_media && post.post_media.length > 0 && (
          <div className="px-4 pb-3">
            <PostMediaGallery
              media={post.post_media}
              onVideoSelect={(media) => {
                console.log('Video selected:', media)
                setVideoMedia(media)
              }}
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
        <div className="border-t border-border px-4 py-3">
          <CommentThread
            postId={post.id}
            projectId={resolvedProjectId}
            currentUserId={currentUserId}
            commentCount={post.comment_count}
          />
        </div>
      </div>

      {/* Video Review Modal */}
      {videoMedia && (
        <>
          {console.log('Rendering VideoReviewModal with:', videoMedia)}
          <VideoReviewModal
            media={videoMedia}
            postId={post.id}
            projectId={resolvedProjectId}
            onClose={() => setVideoMedia(null)}
          />
        </>
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
          <div className="relative bg-card border border-border rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Delete Post</h3>
            </div>

            <div className="px-6 py-4">
              <p className="text-sm text-foreground/70">
                Are you sure you want to delete this post? This action cannot be undone.
              </p>
            </div>

            <div className="px-6 py-4 bg-accent/50 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground disabled:opacity-50"
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
