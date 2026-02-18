'use client'

import { useState } from 'react'
import { toggleReaction } from '@/actions/posts'

const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'celebrate', emoji: '🎉', label: 'Celebrate' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
  { type: 'sad', emoji: '😢', label: 'Sad' },
  { type: 'angry', emoji: '😡', label: 'Angry' },
] as const

interface ReactionPickerProps {
  postId?: number
  commentId?: number
  reactions?: Array<{ reaction_type: string; user_id: string }>
  currentUserId?: string
  onReactionToggled?: () => void
}

export function ReactionPicker({
  postId,
  commentId,
  reactions = [],
  currentUserId,
  onReactionToggled,
}: ReactionPickerProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [isToggling, setIsToggling] = useState(false)

  // Group reactions by type
  const reactionCounts = REACTIONS.map(r => {
    const matching = reactions.filter(rx => rx.reaction_type === r.type)
    const hasReacted = currentUserId
      ? matching.some(rx => rx.user_id === currentUserId)
      : false
    return { ...r, count: matching.length, hasReacted }
  }).filter(r => r.count > 0 || showPicker)

  const handleToggle = async (reactionType: string) => {
    if (isToggling) return
    setIsToggling(true)
    try {
      await toggleReaction(reactionType, {
        post_id: postId,
        comment_id: commentId,
      })
      onReactionToggled?.()
    } finally {
      setIsToggling(false)
      setShowPicker(false)
    }
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Existing reaction badges */}
      {reactionCounts
        .filter(r => r.count > 0)
        .map(r => (
          <button
            key={r.type}
            onClick={() => handleToggle(r.type)}
            className={`
              flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition
              ${
                r.hasReacted
                  ? 'bg-primary/20 border border-primary/40 text-primary'
                  : 'bg-accent border border-border text-muted-foreground hover:border-border'
              }
            `}
          >
            <span>{r.emoji}</span>
            <span>{r.count}</span>
          </button>
        ))}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-accent border border-border text-muted-foreground hover:text-foreground/70 hover:border-border transition"
        >
          +
        </button>

        {/* Picker dropdown */}
        {showPicker && (
          <div className="absolute bottom-full left-0 mb-1 flex gap-1 rounded-lg bg-accent border border-border p-1.5 shadow-lg z-10">
            {REACTIONS.map(r => (
              <button
                key={r.type}
                onClick={() => handleToggle(r.type)}
                title={r.label}
                className="p-1 hover:bg-secondary rounded transition text-base"
              >
                {r.emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
