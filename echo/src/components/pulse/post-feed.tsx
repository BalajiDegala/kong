'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PostCard } from './post-card'

interface FilterState {
  projectIds?: number[]
  sequenceIds?: number[]
  shotIds?: number[]
  taskIds?: number[]
  userIds?: string[]
}

interface PostFeedProps {
  filters?: FilterState
  currentUserId?: string
  onEntityClick?: (entityType: string, entityId: string | number) => void
}

export function PostFeed({ filters, currentUserId, onEntityClick }: PostFeedProps) {
  const [posts, setPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [nextCursorId, setNextCursorId] = useState<number | null>(null)
  const pageSize = 20

  const loadPosts = useCallback(async (cursorId: number | null, append = false) => {
    const supabase = createClient()

    // If filters are provided, use filtered query
    if (filters && (
      filters.projectIds?.length ||
      filters.sequenceIds?.length ||
      filters.shotIds?.length ||
      filters.taskIds?.length ||
      filters.userIds?.length
    )) {
      // First try DB-side filtered cursor RPC. If unavailable, fallback to client-side scan.
      const targetMatchCount = pageSize + 1
      const scanBatchSize = pageSize * 3
      let matchedPosts: Array<{ id: number; author_id: string | null }> = []
      let reachedEnd = false

      const { data: rpcRows, error: rpcError } = await supabase.rpc('get_filtered_posts_cursor', {
        p_project_ids:
          filters.projectIds && filters.projectIds.length > 0 ? filters.projectIds : null,
        p_sequence_ids:
          filters.sequenceIds && filters.sequenceIds.length > 0 ? filters.sequenceIds : null,
        p_shot_ids: filters.shotIds && filters.shotIds.length > 0 ? filters.shotIds : null,
        p_task_ids: filters.taskIds && filters.taskIds.length > 0 ? filters.taskIds : null,
        p_user_ids: filters.userIds && filters.userIds.length > 0 ? filters.userIds : null,
        p_cursor_id: cursorId,
        p_limit: pageSize,
      })

      if (!rpcError && Array.isArray(rpcRows)) {
        matchedPosts = rpcRows
          .map((row: any) => ({
            id: Number(row?.id),
            author_id: typeof row?.author_id === 'string' ? row.author_id : null,
          }))
          .filter((row) => Number.isFinite(row.id))
        reachedEnd = matchedPosts.length <= pageSize
      } else {
        if (rpcError) {
          console.warn('Filtered cursor RPC unavailable; using client-side fallback:', rpcError)
        }

        let scanCursorId = cursorId

        // Cursor-based filtered scan:
        // scan posts in batches by descending id and keep only matching rows.
        while (matchedPosts.length < targetMatchCount) {
          let scanQuery = supabase
            .from('posts')
            .select('id, author_id')
            .order('id', { ascending: false })
            .limit(scanBatchSize)

          if (scanCursorId) {
            scanQuery = scanQuery.lt('id', scanCursorId)
          }

          const { data: candidates, error: scanError } = await scanQuery

          if (scanError) {
            console.error('Failed to scan filtered posts:', scanError)
            setIsLoading(false)
            return
          }

          const candidateRows = candidates || []
          if (candidateRows.length === 0) {
            reachedEnd = true
            break
          }

          const candidateIds = candidateRows.map((row) => row.id)
          const [
            projectMatchesResult,
            sequenceMatchesResult,
            shotMatchesResult,
            taskMatchesResult,
            userMatchesResult,
          ] = await Promise.all([
            filters.projectIds && filters.projectIds.length > 0
              ? supabase
                  .from('post_projects')
                  .select('post_id')
                  .in('post_id', candidateIds)
                  .in('project_id', filters.projectIds)
              : Promise.resolve({ data: [] }),
            filters.sequenceIds && filters.sequenceIds.length > 0
              ? supabase
                  .from('post_sequences')
                  .select('post_id')
                  .in('post_id', candidateIds)
                  .in('sequence_id', filters.sequenceIds)
              : Promise.resolve({ data: [] }),
            filters.shotIds && filters.shotIds.length > 0
              ? supabase
                  .from('post_shots')
                  .select('post_id')
                  .in('post_id', candidateIds)
                  .in('shot_id', filters.shotIds)
              : Promise.resolve({ data: [] }),
            filters.taskIds && filters.taskIds.length > 0
              ? supabase
                  .from('post_tasks')
                  .select('post_id')
                  .in('post_id', candidateIds)
                  .in('task_id', filters.taskIds)
              : Promise.resolve({ data: [] }),
            filters.userIds && filters.userIds.length > 0
              ? supabase
                  .from('post_users')
                  .select('post_id')
                  .in('post_id', candidateIds)
                  .in('user_id', filters.userIds)
              : Promise.resolve({ data: [] }),
          ])

          const projectMatchIds = new Set<number>(
            (projectMatchesResult.data || []).map((row: any) => row.post_id)
          )
          const sequenceMatchIds = new Set<number>(
            (sequenceMatchesResult.data || []).map((row: any) => row.post_id)
          )
          const shotMatchIds = new Set<number>(
            (shotMatchesResult.data || []).map((row: any) => row.post_id)
          )
          const taskMatchIds = new Set<number>(
            (taskMatchesResult.data || []).map((row: any) => row.post_id)
          )
          const userMentionMatchIds = new Set<number>(
            (userMatchesResult.data || []).map((row: any) => row.post_id)
          )

          for (const candidate of candidateRows) {
            if (filters.projectIds && filters.projectIds.length > 0 && !projectMatchIds.has(candidate.id)) {
              continue
            }
            if (filters.sequenceIds && filters.sequenceIds.length > 0 && !sequenceMatchIds.has(candidate.id)) {
              continue
            }
            if (filters.shotIds && filters.shotIds.length > 0 && !shotMatchIds.has(candidate.id)) {
              continue
            }
            if (filters.taskIds && filters.taskIds.length > 0 && !taskMatchIds.has(candidate.id)) {
              continue
            }
            if (filters.userIds && filters.userIds.length > 0) {
              const isAuthorMatch =
                candidate.author_id !== null && filters.userIds.includes(candidate.author_id)
              if (!isAuthorMatch && !userMentionMatchIds.has(candidate.id)) {
                continue
              }
            }

            matchedPosts.push(candidate)
            if (matchedPosts.length >= targetMatchCount) {
              break
            }
          }

          if (matchedPosts.length >= targetMatchCount) {
            break
          }

          scanCursorId = candidateRows[candidateRows.length - 1]?.id || null
          if (candidateRows.length < scanBatchSize) {
            reachedEnd = true
            break
          }
        }
      }

      const matchedPage = matchedPosts.slice(0, pageSize)

      if (matchedPage.length === 0) {
        setPosts([])
        setHasMore(false)
        setNextCursorId(null)
        setIsLoading(false)
        return
      }

      const matchedIds = matchedPage.map((row) => row.id)
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          post_media(*),
          post_reactions(reaction_type, user_id),
          post_projects(project_id),
          post_sequences(sequence_id),
          post_shots(shot_id),
          post_tasks(task_id),
          post_users(user_id)
        `)
        .in('id', matchedIds)

      if (error) {
        console.error('Failed to load filtered posts:', error)
        setIsLoading(false)
        return
      }

      const postOrder = new Map(matchedIds.map((id, index) => [id, index]))
      const rawPosts = (data || []).sort(
        (a, b) => (postOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (postOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER)
      )

      const hasAdditionalMatches = matchedPosts.length > pageSize
      setHasMore(hasAdditionalMatches)
      setNextCursorId(matchedPage[matchedPage.length - 1]?.id || null)
      if (reachedEnd && !hasAdditionalMatches) {
        setHasMore(false)
      }

      // Load entity details
      await enrichPostsWithEntities(rawPosts, supabase, append)
    } else {
      // Global feed - no filters, try simplest query first
      console.log('[PostFeed] Loading global feed, cursor:', cursorId)

      // Try ultra-simple query without joins first
      let basicQuery = supabase
        .from('posts')
        .select('*')
        .order('id', { ascending: false })
        .limit(pageSize)

      if (cursorId) {
        basicQuery = basicQuery.lt('id', cursorId)
      }

      const { data: basicData, error: basicError } = await basicQuery

      console.log('[PostFeed] Basic query result:', {
        dataCount: basicData?.length,
        error: basicError,
        errorMessage: basicError?.message,
        errorDetails: basicError?.details,
        errorHint: basicError?.hint,
        errorCode: basicError?.code,
      })

      if (basicError) {
        console.error('[PostFeed] Failed to load posts (basic):', basicError)
        setIsLoading(false)
        return
      }

      // If basic query worked, try with joins
      let postQuery = supabase
        .from('posts')
        .select(`
          *,
          post_media(*),
          post_reactions(reaction_type, user_id)
        `)
        .order('id', { ascending: false })
        .limit(pageSize)

      if (cursorId) {
        postQuery = postQuery.lt('id', cursorId)
      }

      const { data, error } = await postQuery

      if (error) {
        console.error('[PostFeed] Failed to load posts (with joins):', {
          error,
          message: error?.message || 'No message',
          details: error?.details || 'No details',
          hint: error?.hint || 'No hint',
          code: error?.code || 'No code',
        })
        // Fallback to basic data
        console.log('[PostFeed] Using basic data without joins')
        const rawPosts = basicData || []
        setHasMore(rawPosts.length === pageSize)
        setNextCursorId(rawPosts.length > 0 ? rawPosts[rawPosts.length - 1].id : null)

        // Initialize empty arrays for entities
        rawPosts.forEach((post) => {
          post.post_media = []
          post.post_reactions = []
          post.post_projects = []
          post.post_sequences = []
          post.post_shots = []
          post.post_tasks = []
          post.post_users = []
        })

        await enrichPostsWithEntities(rawPosts, supabase, append)
        return
      }

      console.log('[PostFeed] Loaded posts:', data?.length || 0)

      const rawPosts = data || []
      setHasMore(rawPosts.length === pageSize)
      setNextCursorId(rawPosts.length > 0 ? rawPosts[rawPosts.length - 1].id : null)

      // Load entity associations separately (if tables exist)
      if (rawPosts.length > 0) {
        const postIds = rawPosts.map((p) => p.id)

        // Helper to safely query junction tables
        const safeQuery = async (table: string, idField: string) => {
          try {
            const { data, error } = await supabase
              .from(table)
              .select(`post_id, ${idField}`)
              .in('post_id', postIds)

            if (error) throw error
            return data || []
          } catch (err) {
            console.warn(`Junction table ${table} may not exist yet:`, err)
            return []
          }
        }

        try {
          // Fetch all junction table data in parallel
          const [projectLinks, sequenceLinks, shotLinks, taskLinks, userLinks] = await Promise.all([
            safeQuery('post_projects', 'project_id'),
            safeQuery('post_sequences', 'sequence_id'),
            safeQuery('post_shots', 'shot_id'),
            safeQuery('post_tasks', 'task_id'),
            safeQuery('post_users', 'user_id'),
          ])

          // Attach junction data to posts
          rawPosts.forEach((post) => {
            post.post_projects = projectLinks.filter((l: any) => l.post_id === post.id)
            post.post_sequences = sequenceLinks.filter((l: any) => l.post_id === post.id)
            post.post_shots = shotLinks.filter((l: any) => l.post_id === post.id)
            post.post_tasks = taskLinks.filter((l: any) => l.post_id === post.id)
            post.post_users = userLinks.filter((l: any) => l.post_id === post.id)
          })
        } catch (err) {
          console.warn('Failed to load entity associations:', err)
          // Initialize empty arrays so enrichment doesn't fail
          rawPosts.forEach((post) => {
            post.post_projects = []
            post.post_sequences = []
            post.post_shots = []
            post.post_tasks = []
            post.post_users = []
          })
        }
      }

      await enrichPostsWithEntities(rawPosts, supabase, append)
    }
  }, [filters])

  const enrichPostsWithEntities = async (rawPosts: any[], supabase: any, append: boolean) => {
    try {
      // Step 1: resolve author profiles
      const authorIds = [...new Set(rawPosts.map((p) => p.author_id).filter(Boolean))]
      const profileMap: Record<string, any> = {}

      if (authorIds.length > 0) {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', authorIds)

        if (error) {
          console.error('Failed to load profiles:', error)
        } else if (profiles) {
          for (const p of profiles) {
            profileMap[p.id] = p
          }
        }
      }

      // Step 2: resolve entity details (projects, sequences, shots, tasks, users)
      const allProjectIds = [...new Set(rawPosts.flatMap((p) => p.post_projects?.map((pp: any) => pp.project_id) || []))]
      const allSequenceIds = [...new Set(rawPosts.flatMap((p) => p.post_sequences?.map((ps: any) => ps.sequence_id) || []))]
      const allShotIds = [...new Set(rawPosts.flatMap((p) => p.post_shots?.map((ps: any) => ps.shot_id) || []))]
      const allTaskIds = [...new Set(rawPosts.flatMap((p) => p.post_tasks?.map((pt: any) => pt.task_id) || []))]
      const allUserIds = [...new Set(rawPosts.flatMap((p) => p.post_users?.map((pu: any) => pu.user_id) || []))]

      const [projectsData, sequencesData, shotsData, tasksData, usersData] = await Promise.all([
        allProjectIds.length > 0
          ? supabase.from('projects').select('id, name').in('id', allProjectIds).is('deleted_at', null)
          : { data: [] },
        allSequenceIds.length > 0
          ? supabase.from('sequences').select('id, name, project_id').in('id', allSequenceIds).is('deleted_at', null)
          : { data: [] },
        allShotIds.length > 0
          ? supabase.from('shots').select('id, name, sequence_id').in('id', allShotIds).is('deleted_at', null)
          : { data: [] },
        allTaskIds.length > 0
          ? supabase.from('tasks').select('id, name, entity_id, entity_type').in('id', allTaskIds).is('deleted_at', null)
          : { data: [] },
        allUserIds.length > 0
          ? supabase.from('profiles').select('id, display_name').in('id', allUserIds)
          : { data: [] },
      ])

      const projectMap = (projectsData.data || []).reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {})
      const sequenceMap = (sequencesData.data || []).reduce((acc: any, s: any) => ({ ...acc, [s.id]: s }), {})
      const shotMap = (shotsData.data || []).reduce((acc: any, s: any) => ({ ...acc, [s.id]: s }), {})
      const taskMap = (tasksData.data || []).reduce((acc: any, t: any) => ({ ...acc, [t.id]: t }), {})
      const userMap = (usersData.data || []).reduce((acc: any, u: any) => ({ ...acc, [u.id]: u }), {})

      // Step 3: merge everything
      const enriched = rawPosts.map((post) => ({
        ...post,
        author: profileMap[post.author_id] || null,
        projects: (post.post_projects || []).map((pp: any) => projectMap[pp.project_id]).filter(Boolean),
        sequences: (post.post_sequences || []).map((ps: any) => sequenceMap[ps.sequence_id]).filter(Boolean),
        shots: (post.post_shots || []).map((ps: any) => shotMap[ps.shot_id]).filter(Boolean),
        tasks: (post.post_tasks || []).map((pt: any) => taskMap[pt.task_id]).filter(Boolean),
        mentioned_users: (post.post_users || []).map((pu: any) => userMap[pu.user_id]).filter(Boolean),
      }))

      if (append) {
        setPosts((prev) => [...prev, ...enriched])
      } else {
        setPosts(enriched)
      }
    } catch (err) {
      console.error('Failed to enrich posts:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPosts(null)
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
        },
        () => {
          setNextCursorId(null)
          loadPosts(null)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadPosts])

  const handleLoadMore = () => {
    if (!nextCursorId) return
    loadPosts(nextCursorId, true)
  }

  const handleRefresh = () => {
    setNextCursorId(null)
    setIsLoading(true)
    loadPosts(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-sm">No posts yet. Be the first to share something!</p>
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
          onEntityClick={onEntityClick}
        />
      ))}

      {hasMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={handleLoadMore}
            className="text-sm text-muted-foreground hover:text-foreground/80 transition"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  )
}
