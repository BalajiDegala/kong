'use client'

import { useState } from 'react'
import { Activity } from 'lucide-react'
import { SimplePostComposer } from '@/components/pulse/simple-post-composer'
import { PostFeed } from '@/components/pulse/post-feed'
import { PulseFilterBarCompact } from '@/components/pulse/pulse-filter-bar-compact'

interface FilterState {
  scope: 'global' | 'filtered'
  projectIds: number[]
  sequenceIds: number[]
  shotIds: number[]
  taskIds: number[]
  userIds: string[]
}

interface PulseFeedPageProps {
  currentUserId: string
  profile: { id: string; display_name: string; avatar_url: string | null } | null
}

export function PulseFeedPage({ currentUserId, profile }: PulseFeedPageProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [filters, setFilters] = useState<FilterState>({
    scope: 'global',
    projectIds: [],
    sequenceIds: [],
    shotIds: [],
    taskIds: [],
    userIds: [],
  })

  const handlePostCreated = () => {
    // Trigger feed refresh without full page reload
    setRefreshKey((prev) => prev + 1)
  }

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters)
    setRefreshKey((prev) => prev + 1) // Refresh feed when filters change
  }

  const handleEntityClick = (entityType: string, entityId: string | number) => {
    // When a tag is clicked, add it to filters and switch to filtered mode
    setFilters((prev) => {
      const newFilters = { ...prev, scope: 'filtered' as const }

      switch (entityType) {
        case 'project':
          if (!prev.projectIds.includes(entityId as number)) {
            newFilters.projectIds = [...prev.projectIds, entityId as number]
          }
          break
        case 'sequence':
          if (!prev.sequenceIds.includes(entityId as number)) {
            newFilters.sequenceIds = [...prev.sequenceIds, entityId as number]
          }
          break
        case 'shot':
          if (!prev.shotIds.includes(entityId as number)) {
            newFilters.shotIds = [...prev.shotIds, entityId as number]
          }
          break
        case 'task':
          if (!prev.taskIds.includes(entityId as number)) {
            newFilters.taskIds = [...prev.taskIds, entityId as number]
          }
          break
        case 'user':
          if (!prev.userIds.includes(entityId as string)) {
            newFilters.userIds = [...prev.userIds, entityId as string]
          }
          break
      }

      return newFilters
    })

    setRefreshKey((prev) => prev + 1)
  }

  // Build filter object for PostFeed
  const feedFilters =
    filters.scope === 'global'
      ? undefined
      : {
          projectIds: filters.projectIds,
          sequenceIds: filters.sequenceIds,
          shotIds: filters.shotIds,
          taskIds: filters.taskIds,
          userIds: filters.userIds,
        }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-5 w-5 text-amber-400" />
          <h1 className="text-lg font-semibold text-zinc-100">Pulse</h1>
        </div>
        <p className="text-sm text-zinc-500">
          Share updates, review media, and collaborate across projects.
        </p>
      </div>

      {/* Filter Bar */}
      <PulseFilterBarCompact onFilterChange={handleFilterChange} />

      {/* Composer */}
      <div className="mb-6">
        <SimplePostComposer
          authorProfile={profile || undefined}
          onPostCreated={handlePostCreated}
        />
      </div>

      {/* Feed */}
      <PostFeed
        key={refreshKey}
        filters={feedFilters}
        currentUserId={currentUserId}
        onEntityClick={handleEntityClick}
      />
    </div>
  )
}
