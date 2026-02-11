'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetchConversations } from '@/actions/echo'
import { EchoSidebar } from '@/components/echo/echo-sidebar'
import { createClient } from '@/lib/supabase/client'

export default function EchoLayout({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<any[]>([])
  const [dmDisplayNames, setDmDisplayNames] = useState<Record<number, string>>({})
  const [conversationMeta, setConversationMeta] = useState<Record<number, any>>({})
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const result = await fetchConversations()
      if (result.data) {
        setConversations(result.data.conversations)
        setDmDisplayNames(result.data.dmDisplayNames)
        setConversationMeta(result.data.conversationMeta || {})
        setCurrentUserId(result.data.userId)
      }
    } catch (err) {
      console.error('Failed to load conversations:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const handler = () => loadData()
    window.addEventListener('echo:refreshConversations', handler)
    return () => window.removeEventListener('echo:refreshConversations', handler)
  }, [loadData])

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<any>
      const detail = ce.detail || {}
      const conversationId = detail.conversationId
      if (!conversationId) return

      if (detail.meta) {
        setConversationMeta((prev) => ({
          ...prev,
          [conversationId]: { ...(prev[conversationId] || {}), ...detail.meta },
        }))
      }

      if (detail.conversation) {
        setConversations((prev) => {
          const next = prev.map((c) =>
            c?.id === conversationId ? { ...c, ...detail.conversation } : c
          )
          // Keep newest activity at top.
          next.sort((a, b) => {
            const at = a?.updated_at ? new Date(a.updated_at).getTime() : 0
            const bt = b?.updated_at ? new Date(b.updated_at).getTime() : 0
            return bt - at
          })
          return next
        })
      }
    }

    window.addEventListener('echo:conversationMetaPatch', handler as EventListener)
    return () => window.removeEventListener('echo:conversationMetaPatch', handler as EventListener)
  }, [])

  const convIdKey = conversations
    .map((c) => c?.id)
    .filter(Boolean)
    .sort((a, b) => a - b)
    .join(',')

  useEffect(() => {
    if (!currentUserId || !convIdKey) return

    const supabase = createClient()
    const convIds = convIdKey.split(',').map((s) => parseInt(s, 10)).filter(Boolean)

    const channels = convIds.map((convId) =>
      supabase
        .channel(`sidebar:conversation:${convId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${convId}`,
          },
          (payload) => {
            const inserted = payload.new as any
            if (!inserted) return

	            const isActive = (() => {
	              const match = window.location.pathname.match(/^\/echo\/(\d+)/)
	              if (!match) return false
	              return parseInt(match[1], 10) === convId
	            })()

            const unread = inserted.author_id !== currentUserId && !isActive

            setConversationMeta((prev) => {
              const prevMeta = prev[convId] || {}
              const prevLast = prevMeta.lastMessage
              const nextLast =
                prevLast?.id === inserted.id
                  ? { ...prevLast, ...inserted }
                  : { ...inserted, author: null }

              return {
                ...prev,
                [convId]: {
                  ...prevMeta,
                  lastMessage: nextLast,
                  unread,
                },
              }
            })

            setConversations((prev) => {
              const next = prev.map((c) =>
                c?.id === convId ? { ...c, updated_at: inserted.created_at } : c
              )
              next.sort((a, b) => {
                const at = a?.updated_at ? new Date(a.updated_at).getTime() : 0
                const bt = b?.updated_at ? new Date(b.updated_at).getTime() : 0
                return bt - at
              })
              return next
            })
          }
        )
        .subscribe()
    )

    return () => {
      for (const ch of channels) {
        supabase.removeChannel(ch)
      }
    }
  }, [convIdKey, currentUserId])

  return (
    <div className="flex h-full overflow-hidden">
      {isLoading ? (
        <div className="flex w-80 shrink-0 items-center justify-center border-r border-zinc-800 bg-zinc-950">
          <p className="text-xs text-zinc-500">Loading...</p>
        </div>
      ) : (
        <EchoSidebar
          conversations={conversations}
          dmDisplayNames={dmDisplayNames}
          conversationMeta={conversationMeta}
          currentUserId={currentUserId}
          onRefresh={loadData}
        />
      )}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
