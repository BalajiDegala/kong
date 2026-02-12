'use client'

import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { createPostComment } from '@/actions/posts'

interface CommentInputProps {
  postId: number
  parentNoteId?: number
  projectId?: string
  onCommentCreated?: () => void
  placeholder?: string
}

export function CommentInput({
  postId,
  parentNoteId,
  projectId,
  onCommentCreated,
  placeholder = 'Write a comment...',
}: CommentInputProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const result = await createPostComment({
        post_id: postId,
        content: content.trim(),
        parent_note_id: parentNoteId,
        project_id: projectId,
      })

      if (result.error) {
        console.error('Failed to create comment:', result.error)
        return
      }

      setContent('')
      onCommentCreated?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
      />
      <button
        onClick={handleSubmit}
        disabled={!content.trim() || isSubmitting}
        className="rounded-md p-1.5 text-zinc-400 hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </button>
    </div>
  )
}
