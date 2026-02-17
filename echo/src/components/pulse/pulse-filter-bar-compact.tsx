'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { EntitySearchCombobox } from './entity-search-combobox'
import { Button } from '@/components/ui/button'
import { Filter, X, Globe } from 'lucide-react'

interface FilterState {
  scope: 'global' | 'filtered'
  projectIds: number[]
  sequenceIds: number[]
  shotIds: number[]
  taskIds: number[]
  userIds: string[]
}

interface PulseFilterBarCompactProps {
  onFilterChange: (filters: FilterState) => void
}

export function PulseFilterBarCompact({ onFilterChange }: PulseFilterBarCompactProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    scope: 'global',
    projectIds: [],
    sequenceIds: [],
    shotIds: [],
    taskIds: [],
    userIds: [],
  })

  const [showFilters, setShowFilters] = useState(false)

  // Load filters from URL on mount
  useEffect(() => {
    loadFiltersFromURL()
  }, [])

  // Update URL and notify parent when filters change
  useEffect(() => {
    updateURL()
    onFilterChange(filters)
  }, [filters])

  // Auto-show filters if any are active
  useEffect(() => {
    if (hasActiveFilters) {
      setShowFilters(true)
    }
  }, [])

  const loadFiltersFromURL = () => {
    const scope = searchParams.get('scope') as 'global' | 'filtered' || 'global'
    const projectIds = searchParams.get('projects')?.split(',').map(Number).filter(Boolean) || []
    const sequenceIds = searchParams.get('sequences')?.split(',').map(Number).filter(Boolean) || []
    const shotIds = searchParams.get('shots')?.split(',').map(Number).filter(Boolean) || []
    const taskIds = searchParams.get('tasks')?.split(',').map(Number).filter(Boolean) || []
    const userIds = searchParams.get('users')?.split(',').filter(Boolean) || []

    setFilters({
      scope,
      projectIds,
      sequenceIds,
      shotIds,
      taskIds,
      userIds,
    })
  }

  const updateURL = () => {
    const params = new URLSearchParams()

    if (filters.scope !== 'global') {
      params.set('scope', filters.scope)
    }

    if (filters.projectIds.length) {
      params.set('projects', filters.projectIds.join(','))
    }
    if (filters.sequenceIds.length) {
      params.set('sequences', filters.sequenceIds.join(','))
    }
    if (filters.shotIds.length) {
      params.set('shots', filters.shotIds.join(','))
    }
    if (filters.taskIds.length) {
      params.set('tasks', filters.taskIds.join(','))
    }
    if (filters.userIds.length) {
      params.set('users', filters.userIds.join(','))
    }

    const newUrl = params.toString() ? `?${params.toString()}` : '/pulse'
    router.replace(newUrl, { scroll: false })
  }

  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [key]: value }

      // Cascading logic: clear dependent filters
      if (key === 'projectIds') {
        // When projects change, potentially clear sequences/shots
        // But we'll let the user keep their selections and the search will filter them
      }

      return newFilters
    })
  }

  const clearAllFilters = () => {
    setFilters({
      scope: 'global',
      projectIds: [],
      sequenceIds: [],
      shotIds: [],
      taskIds: [],
      userIds: [],
    })
  }

  const hasActiveFilters =
    filters.projectIds.length > 0 ||
    filters.sequenceIds.length > 0 ||
    filters.shotIds.length > 0 ||
    filters.taskIds.length > 0 ||
    filters.userIds.length > 0

  const totalFilterCount =
    filters.projectIds.length +
    filters.sequenceIds.length +
    filters.shotIds.length +
    filters.taskIds.length +
    filters.userIds.length

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 mb-6">
      {/* Top Row: Scope Toggle + Filter Button */}
      <div className="flex items-center justify-between gap-3 mb-3">
        {/* Scope Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateFilter('scope', 'global')}
            className={`
              px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5
              ${
                filters.scope === 'global'
                  ? 'bg-amber-500 text-zinc-900'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-300 border border-zinc-800'
              }
            `}
          >
            <Globe className="h-3.5 w-3.5" />
            Global
          </button>
          <button
            onClick={() => {
              updateFilter('scope', 'filtered')
              setShowFilters(true)
            }}
            className={`
              px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5
              ${
                filters.scope === 'filtered'
                  ? 'bg-amber-500 text-zinc-900'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-300 border border-zinc-800'
              }
            `}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtered
            {totalFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-zinc-950/50 text-[10px]">
                {totalFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs h-7 text-amber-400 hover:text-amber-300"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
          {filters.scope === 'filtered' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-xs h-7"
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
          )}
        </div>
      </div>

      {/* Filter Row: Horizontal layout with search comboboxes */}
      {showFilters && filters.scope === 'filtered' && (
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-zinc-800">
          <EntitySearchCombobox
            label="Projects"
            placeholder="Search projects..."
            entityType="project"
            selectedIds={filters.projectIds}
            onChange={(ids) => updateFilter('projectIds', ids as number[])}
          />

          {/* Only show sequences after selecting a project */}
          {filters.projectIds.length > 0 && (
            <EntitySearchCombobox
              label="Sequences"
              placeholder="Search sequences..."
              entityType="sequence"
              selectedIds={filters.sequenceIds}
              onChange={(ids) => updateFilter('sequenceIds', ids as number[])}
              filterByProjectIds={filters.projectIds}
            />
          )}

          {/* Only show shots after selecting a project or sequence */}
          {(filters.projectIds.length > 0 || filters.sequenceIds.length > 0) && (
            <EntitySearchCombobox
              label="Shots"
              placeholder="Search shots..."
              entityType="shot"
              selectedIds={filters.shotIds}
              onChange={(ids) => updateFilter('shotIds', ids as number[])}
              filterByProjectIds={filters.projectIds}
              filterBySequenceIds={filters.sequenceIds}
            />
          )}

          {/* Only show tasks after selecting a shot */}
          {filters.shotIds.length > 0 && (
            <EntitySearchCombobox
              label="Tasks"
              placeholder="Search tasks..."
              entityType="task"
              selectedIds={filters.taskIds}
              onChange={(ids) => updateFilter('taskIds', ids as number[])}
              filterByShotIds={filters.shotIds}
            />
          )}

          <EntitySearchCombobox
            label="Users"
            placeholder="Search users..."
            entityType="user"
            selectedIds={filters.userIds}
            onChange={(ids) => updateFilter('userIds', ids as string[])}
          />
        </div>
      )}
    </div>
  )
}
