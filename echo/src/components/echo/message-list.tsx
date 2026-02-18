'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { format, isSameDay, isToday, isYesterday } from 'date-fns'
import { Check, Copy, Pencil, Trash2, X } from 'lucide-react'
import type { ReactNode } from 'react'

interface Message {
  id: number
  content: string
  created_at: string
  updated_at?: string
  author_id: string
  author?: {
    id: string
    display_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

interface MessageListProps {
  messages: Message[]
  currentUserId?: string
  onEditMessage?: (messageId: number, nextContent: string) => Promise<void> | void
  onDeleteMessage?: (messageId: number) => Promise<void> | void
}

const GROUP_WINDOW_MS = 5 * 60 * 1000
const SCROLL_BOTTOM_THRESHOLD_PX = 140

const avatarColors = [
  'bg-amber-600',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-purple-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-orange-600',
  'bg-indigo-600',
]

function getAvatarColor(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

function formatDayLabel(d: Date) {
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMM d, yyyy')
}

// Convert URLs in text to clickable links
function linkifyText(text: string): ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = urlRegex.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    // Add the URL as a clickable link
    const url = match[0]
    parts.push(
      <a
        key={`${match.index}-${url}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:text-primary/80 underline break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    )

    lastIndex = match.index + match[0].length
  }

  // Add remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

export function MessageList({
  messages,
  currentUserId,
  onEditMessage,
  onDeleteMessage,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const didInitialScrollRef = useRef(false)
  const prevLengthRef = useRef(0)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)

  const [isNearBottom, setIsNearBottom] = useState(true)
  const [unseenCount, setUnseenCount] = useState(0)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' })
  }, [])

  const updateIsNearBottom = () => {
    const el = containerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const nearBottom = distanceFromBottom < SCROLL_BOTTOM_THRESHOLD_PX
    setIsNearBottom(nearBottom)
    if (nearBottom) setUnseenCount(0)
  }

  useEffect(() => {
    const prevLen = prevLengthRef.current
    prevLengthRef.current = messages.length

    // Initial load should jump immediately to latest.
    if (!didInitialScrollRef.current) {
      didInitialScrollRef.current = true
      scrollToBottom('auto')
      return
    }

    // Ignore edits/deletes that don't add new items.
    if (messages.length <= prevLen) return

    // Only auto-scroll if the user is already at the bottom.
    if (isNearBottom) {
      scrollToBottom('smooth')
      setUnseenCount(0)
    } else {
      setUnseenCount((c) => c + (messages.length - prevLen))
    }
  }, [isNearBottom, messages.length, scrollToBottom])

  const startEdit = (msg: Message) => {
    setEditingId(msg.id)
    setDraft(msg.content)
    setIsSavingEdit(false)
    setTimeout(() => editTextareaRef.current?.focus(), 0)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft('')
    setIsSavingEdit(false)
  }

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onScroll={updateIsNearBottom}
      className="relative flex-1 overflow-auto p-4"
    >
      <div className="mx-auto max-w-3xl space-y-3">
        {messages.map((msg, idx) => {
          const prev = idx > 0 ? messages[idx - 1] : null
          const msgDate = new Date(msg.created_at)
          const prevDate = prev ? new Date(prev.created_at) : null

          const showDateSeparator = !prevDate || !isSameDay(msgDate, prevDate)
          const showAuthor =
            !prev ||
            showDateSeparator ||
            prev.author_id !== msg.author_id ||
            (prevDate && msgDate.getTime() - prevDate.getTime() > GROUP_WINDOW_MS)

          const isOwn = !!currentUserId && msg.author_id === currentUserId
          const authorLabel =
            (isOwn ? 'You' : null) ||
            msg.author?.display_name ||
            msg.author?.email ||
            'Unknown'

          const initial = authorLabel.trim().charAt(0).toUpperCase() || '?'
          const avatarSeed = msg.author_id || authorLabel
          const avatarColor = isOwn ? 'bg-primary text-black' : `${getAvatarColor(avatarSeed)} text-white`

          const createdAtLabel = format(msgDate, 'h:mm a')
          const createdAtTitle = format(msgDate, 'PPpp')

          const updatedAt = msg.updated_at ? new Date(msg.updated_at) : null
          const isEdited =
            !!updatedAt && Math.abs(updatedAt.getTime() - msgDate.getTime()) > 2000

          const isEditing = editingId === msg.id

          const canEdit = isOwn && !!onEditMessage
          const canDelete = isOwn && !!onDeleteMessage

          return (
            <div key={msg.id}>
              {showDateSeparator && (
                <div className="flex items-center gap-3 py-2">
                  <div className="h-px flex-1 bg-accent" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {formatDayLabel(msgDate)}
                  </span>
                  <div className="h-px flex-1 bg-accent" />
                </div>
              )}

              <div className="group flex gap-3">
                <div className="w-9 shrink-0">
                  {showAuthor ? (
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${avatarColor}`}
                      title={authorLabel}
                    >
                      {msg.author?.avatar_url ? (
                        <img
                          src={msg.author.avatar_url}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-[11px] font-semibold">{initial}</span>
                      )}
                    </div>
                  ) : (
                    <time
                      className="mt-1 block text-right text-[10px] text-muted-foreground opacity-0 transition group-hover:opacity-100"
                      dateTime={msg.created_at}
                      title={createdAtTitle}
                    >
                      {createdAtLabel}
                    </time>
                  )}
                </div>

                <div className="relative min-w-0 flex-1 pr-16">
                  <div className="absolute right-0 top-0 flex items-center gap-1 rounded-md border border-border bg-background/80 p-1 opacity-0 backdrop-blur transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => copyMessage(msg.content)}
                      className="rounded p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground/80"
                      title="Copy message"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    {canEdit && !isEditing && (
                      <button
                        type="button"
                        onClick={() => startEdit(msg)}
                        className="rounded p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground/80"
                        title="Edit message"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {canDelete && !isEditing && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm('Delete this message?')) return
                          await onDeleteMessage?.(msg.id)
                        }}
                        className="rounded p-1 text-muted-foreground transition hover:bg-red-500/20 hover:text-red-300"
                        title="Delete message"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {showAuthor && (
                    <div className="flex items-baseline gap-2">
                      <span className={isOwn ? 'text-sm font-medium text-primary' : 'text-sm font-medium text-foreground'}>
                        {authorLabel}
                      </span>
                      <time
                        className="text-xs text-muted-foreground"
                        dateTime={msg.created_at}
                        title={createdAtTitle}
                      >
                        {createdAtLabel}
                      </time>
                      {isEdited && (
                        <span className="text-[11px] text-muted-foreground">(edited)</span>
                      )}
                    </div>
                  )}

                  {isEditing ? (
                    <div className={showAuthor ? 'mt-1' : ''}>
                      <textarea
                        ref={editTextareaRef}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === 'Escape') {
                            e.preventDefault()
                            cancelEdit()
                            return
                          }
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault()
                            const trimmed = draft.trim()
                            if (!trimmed || isSavingEdit || !onEditMessage) return
                            setIsSavingEdit(true)
                            try {
                              await onEditMessage(msg.id, trimmed)
                              cancelEdit()
                            } finally {
                              setIsSavingEdit(false)
                            }
                          }
                        }}
                        placeholder="Edit message..."
                        rows={2}
                        className="w-full resize-none rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                        style={{ maxHeight: '180px' }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement
                          target.style.height = 'auto'
                          target.style.height = `${Math.min(target.scrollHeight, 180)}px`
                        }}
                      />
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground/80 transition hover:bg-accent"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={!draft.trim() || isSavingEdit || !onEditMessage}
                          onClick={async () => {
                            const trimmed = draft.trim()
                            if (!trimmed || isSavingEdit || !onEditMessage) return
                            setIsSavingEdit(true)
                            try {
                              await onEditMessage(msg.id, trimmed)
                              cancelEdit()
                            } finally {
                              setIsSavingEdit(false)
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-black transition hover:bg-primary disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {isSavingEdit ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Tip: Ctrl+Enter to save, Esc to cancel.
                      </p>
                    </div>
                  ) : (
                    <p className={`${showAuthor ? 'mt-0.5' : ''} whitespace-pre-wrap text-sm text-foreground/70`}>
                      {linkifyText(msg.content)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      {!isNearBottom && unseenCount > 0 && (
        <div className="sticky bottom-3 flex justify-center">
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            className="rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur hover:bg-accent"
          >
            {unseenCount} new {unseenCount === 1 ? 'message' : 'messages'} · Jump to latest
          </button>
        </div>
      )}
    </div>
  )
}
