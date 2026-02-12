'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PostCard } from './post-card'

interface PostFeedProps {
  projectId?: number
  currentUserId?: string
}

export function PostFeed({ projectId, currentUserId }: PostFeedProps) {
  const [posts, setPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const pageSize = 20

  const loadPosts = useCallback(async (pageNum: number, append = false) => {
    const supabase = createClient()
    let query = supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_author_id_fkey(id, display_name, avatar_url),
        project:projects!posts_project_id_fkey(id, name, code),
        post_media(*),
        post_reactions(reaction_type, user_id)
      `)
      .order('created_at', { ascending: false })
      .range(pageNum * pageSize, (pageNum + 1) * pageSize - 1)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to load posts:', error)
      setIsLoading(false)
      return
    }

    const newPosts = data || []
    setHasMore(newPosts.length === pageSize)

    if (append) {
      setPosts(prev => [...prev, ...newPosts])
    } else {
      setPosts(newPosts)
    }
    setIsLoading(false)
  }, [projectId])

  useEffect(() => {
    loadPosts(0)
  }, [loadPosts])

  // Set up real-time subscription
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('pulse-posts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          ...(projectId ? { filter: `project_id=eq.${projectId}` } : {}),
        },
        () => {
          // Reload feed on any change
          loadPosts(0)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, loadPosts])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadPosts(nextPage, true)
  }

  const handleRefresh = () => {
    setPage(0)
    setIsLoading(true)
    loadPosts(0)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500 text-sm">No posts yet. Be the first to share something!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          onDeleted={handleRefresh}
        />
      ))}

      {hasMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={handleLoadMore}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  )
}
