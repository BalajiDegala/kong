'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CommentInput } from './comment-input'
import { ReactionPicker } from './reaction-picker'
import { formatDistanceToNow } from 'date-fns'

interface Comment {
  id: number
  content: string
  created_at: string
  parent_note_id: number | null
  author: { id: string; display_name: string; avatar_url: string | null } | null
}

interface CommentThreadProps {
  postId: number
  projectId?: string
  currentUserId?: string
  commentCount?: number
}

export function CommentThread({ postId, projectId, currentUserId, commentCount = 0 }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [replyingTo, setReplyingTo] = useState<number | null>(null)

  const loadComments = useCallback(async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('notes')
        .select(`
          id, content, created_at, parent_note_id,
          author:profiles!notes_author_id_fkey(id, display_name, avatar_url)
        `)
        .eq('entity_type', 'post')
        .eq('entity_id', postId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Failed to load comments:', error)
        return
      }

      setComments(data || [])
    } finally {
      setIsLoading(false)
    }
  }, [postId])

  useEffect(() => {
    if (isExpanded) {
      loadComments()
    }
  }, [isExpanded, loadComments])

  // Build thread tree
  const topLevel = comments.filter(c => !c.parent_note_id)
  const replies = comments.filter(c => c.parent_note_id)
  const repliesByParent = new Map<number, Comment[]>()
  for (const reply of replies) {
    const existing = repliesByParent.get(reply.parent_note_id!) || []
    existing.push(reply)
    repliesByParent.set(reply.parent_note_id!, existing)
  }

  const renderComment = (comment: Comment, depth = 0) => {
    const childReplies = repliesByParent.get(comment.id) || []

    return (
      <div key={comment.id} className={depth > 0 ? 'ml-6 border-l border-zinc-800 pl-3' : ''}>
        <div className="flex gap-2 py-2">
          <div className="h-6 w-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-300 shrink-0">
            {comment.author?.display_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-zinc-300">
                {comment.author?.display_name || 'Unknown'}
              </span>
              <span className="text-xs text-zinc-500">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-0.5">{comment.content}</p>
            <div className="flex items-center gap-3 mt-1">
              <ReactionPicker
                commentId={comment.id}
                currentUserId={currentUserId}
              />
              <button
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition"
              >
                Reply
              </button>
            </div>
            {replyingTo === comment.id && (
              <div className="mt-2">
                <CommentInput
                  postId={postId}
                  parentNoteId={comment.id}
                  projectId={projectId}
                  placeholder="Write a reply..."
                  onCommentCreated={() => {
                    setReplyingTo(null)
                    loadComments()
                  }}
                />
              </div>
            )}
          </div>
        </div>
        {childReplies.map(reply => renderComment(reply, depth + 1))}
      </div>
    )
  }

  return (
    <div>
      {/* Toggle */}
      {commentCount > 0 && !isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition py-1"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {commentCount} comment{commentCount !== 1 ? 's' : ''}
        </button>
      )}

      {/* Comments */}
      {isExpanded && (
        <div className="mt-2">
          {isLoading ? (
            <div className="text-xs text-zinc-500 py-2">Loading comments...</div>
          ) : (
            <>
              {topLevel.map(comment => renderComment(comment))}
              <div className="mt-2">
                <CommentInput
                  postId={postId}
                  projectId={projectId}
                  onCommentCreated={loadComments}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Always show input when no comments yet */}
      {!isExpanded && commentCount === 0 && (
        <CommentInput
          postId={postId}
          projectId={projectId}
          onCommentCreated={() => {
            setIsExpanded(true)
            loadComments()
          }}
        />
      )}
    </div>
  )
}
