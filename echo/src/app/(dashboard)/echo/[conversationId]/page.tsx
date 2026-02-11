'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  deleteMessage,
  fetchConversationData,
  markConversationRead,
  sendMessage,
  updateMessage,
} from '@/actions/echo'
import { MessageList } from '@/components/echo/message-list'
import { Hash, MessageCircle, Users, Send } from 'lucide-react'

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const [conversationId, setConversationId] = useState<number>(0)
  const [conversation, setConversation] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')

  // Message input state
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const profilesByUserIdRef = useRef<Record<string, any>>({})
  const markReadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const requestMarkRead = useCallback(async (convId: number) => {
    if (!convId) return
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return

    const now = new Date().toISOString()
    window.dispatchEvent(
      new CustomEvent('echo:conversationMetaPatch', {
        detail: {
          conversationId: convId,
          meta: { unread: false, lastReadAt: now },
        },
      })
    )

    if (markReadTimeoutRef.current) clearTimeout(markReadTimeoutRef.current)
    markReadTimeoutRef.current = setTimeout(async () => {
      try {
        await markConversationRead(convId)
      } catch (err) {
        console.error('Failed to mark conversation read:', err)
      }
    }, 700)
  }, [])

  useEffect(() => {
    return () => {
      if (markReadTimeoutRef.current) clearTimeout(markReadTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    params.then((p) => {
      const id = parseInt(p.conversationId)
      setConversationId(id)
      loadConversation(id)
    })
  }, [params])

  async function loadConversation(convId: number) {
    try {
      setIsLoading(true)
      setError('')

      const result = await fetchConversationData(convId)

      if (result.error || !result.data) {
        setError(result.error || 'Failed to load conversation')
        return
      }

      setConversation(result.data.conversation)
      setMessages(result.data.messages)
      setMembers(result.data.members)
      setCurrentUserId(result.data.userId)

      // Mark read after we successfully load, and refresh sidebar meta.
      void requestMarkRead(convId)
    } catch (err) {
      console.error('Failed to load conversation:', err)
      setError('Failed to load conversation')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const map: Record<string, any> = {}
    for (const m of members) {
      if (m?.user_id) map[m.user_id] = m.profile || null
    }
    profilesByUserIdRef.current = map
  }, [members])

  // Subscribe to realtime messages
  useEffect(() => {
    if (!conversationId || !currentUserId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = payload.new as any
            const insertedWithAuthor = {
              ...inserted,
              author: profilesByUserIdRef.current[inserted.author_id] || null,
            }
            setMessages((prev) => {
              if (prev.some((m) => m.id === inserted.id)) return prev
              return [
                ...prev,
                insertedWithAuthor,
              ]
            })
            void requestMarkRead(conversationId)
            window.dispatchEvent(
              new CustomEvent('echo:conversationMetaPatch', {
                detail: {
                  conversationId,
                  meta: { lastMessage: insertedWithAuthor, unread: false },
                  conversation: { updated_at: inserted.created_at },
                },
              })
            )
            return
          }

          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any
            setMessages((prev) =>
              prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
            )
            return
          }

          if (payload.eventType === 'DELETE') {
            const deleted = payload.old as any
            setMessages((prev) => prev.filter((m) => m.id !== deleted.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, currentUserId])

  // Send message handler
  const handleSend = useCallback(async () => {
    const trimmed = content.trim()
    if (!trimmed || isSending) return

    setIsSending(true)
    setContent('')
    textareaRef.current && (textareaRef.current.style.height = 'auto')

    const result = await sendMessage({
      conversation_id: conversationId,
      content: trimmed,
    })

    if (result.error) {
      setContent(trimmed)
      console.error('Failed to send message:', result.error)
    } else if (result.data) {
      // Optimistic: add message immediately (realtime will also deliver it; we dedupe by id)
      const now = new Date().toISOString()
      setMessages((prev) => {
        if (prev.some((m) => m.id === result.data.id)) return prev
        return [
          ...prev,
          {
            ...result.data,
            author: profilesByUserIdRef.current[currentUserId] || null,
          },
        ]
      })

      window.dispatchEvent(
        new CustomEvent('echo:conversationMetaPatch', {
          detail: {
            conversationId,
            meta: {
              lastMessage: {
                ...result.data,
                author: profilesByUserIdRef.current[currentUserId] || null,
              },
              unread: false,
              lastReadAt: now,
            },
            conversation: { updated_at: result.data.created_at || now },
          },
        })
      )
    }

    setIsSending(false)
    textareaRef.current?.focus()
  }, [content, conversationId, isSending, currentUserId])

  const handleEditMessage = useCallback(async (messageId: number, nextContent: string) => {
    const result = await updateMessage({ message_id: messageId, content: nextContent })
    if (result.error || !result.data) {
      console.error('Failed to update message:', result.error)
      return
    }

    setMessages((prev) => {
      const next = prev.map((m) => (m.id === messageId ? { ...m, ...result.data } : m))
      const last = next[next.length - 1]
      if (conversationId && last?.id === messageId) {
        window.dispatchEvent(
          new CustomEvent('echo:conversationMetaPatch', {
            detail: { conversationId, meta: { lastMessage: last } },
          })
        )
      }
      return next
    })
  }, [conversationId])

  const handleDeleteMessage = useCallback(async (messageId: number) => {
    const result = await deleteMessage(messageId)
    if (result.error) {
      console.error('Failed to delete message:', result.error)
      return
    }

    setMessages((prev) => {
      const deletedWasLast = prev[prev.length - 1]?.id === messageId
      const next = prev.filter((m) => m.id !== messageId)

      if (conversationId && deletedWasLast) {
        const last = next[next.length - 1] || null
        window.dispatchEvent(
          new CustomEvent('echo:conversationMetaPatch', {
            detail: { conversationId, meta: { lastMessage: last } },
          })
        )
      }

      return next
    })
  }, [conversationId])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getTitle = useCallback(() => {
    if (!conversation) return 'Loading...'
    if (conversation.type === 'channel') {
      return conversation.name || 'Channel'
    }
    const others = members.filter((m) => m.user_id !== currentUserId)
    return (
      others
        .map((m) => m.profile?.display_name || m.profile?.email || 'Unknown')
        .join(', ') || 'Direct Message'
    )
  }, [conversation, members, currentUserId])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-400">Loading conversation...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-400">Conversation not found</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 py-3">
        <div className="flex items-center gap-2">
          {conversation.type === 'channel' ? (
            <Hash className="h-5 w-5 text-zinc-400" />
          ) : (
            <MessageCircle className="h-5 w-5 text-zinc-400" />
          )}
          <h2 className="text-lg font-semibold text-zinc-100">{getTitle()}</h2>
          {conversation.project && (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
              {conversation.project.code}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm text-zinc-500">
          <Users className="h-4 w-4" />
          <span>{members.length}</span>
        </div>
      </div>

      {/* Messages */}
      <MessageList
        key={conversationId}
        messages={messages}
        currentUserId={currentUserId}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
      />

      {/* Inline Message Input */}
      <div className="border-t border-zinc-800 bg-zinc-950 p-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            style={{ maxHeight: '150px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = `${Math.min(target.scrollHeight, 150)}px`
            }}
          />
          <button
            onClick={handleSend}
            disabled={!content.trim() || isSending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-black transition hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
