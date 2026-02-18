'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { EntityMultiSelect } from './entity-multi-select'
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

interface PulseFilterBarProps {
  onFilterChange: (filters: FilterState) => void
}

export function PulseFilterBar({ onFilterChange }: PulseFilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    scope: 'global',
    projectIds: [],
    sequenceIds: [],
    shotIds: [],
    taskIds: [],
    userIds: [],
  })

  // Options state
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([])
  const [sequences, setSequences] = useState<{ id: number; name: string; project_id: number }[]>([])
  const [shots, setShots] = useState<{ id: number; name: string; sequence_id: number }[]>([])
  const [tasks, setTasks] = useState<{ id: number; name: string }[]>([])
  const [users, setUsers] = useState<{ id: string; display_name: string }[]>([])

  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load initial data
  useEffect(() => {
    loadOptions()
    loadFiltersFromURL()
  }, [])

  // Update URL when filters change
  useEffect(() => {
    updateURL()
    onFilterChange(filters)
  }, [filters])

  const loadOptions = async () => {
    setIsLoading(true)
    try {
      // Load projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name')
        .order('name')

      // Load users (profiles)
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, display_name')
        .order('display_name')

      // Load all sequences (we'll filter client-side)
      const { data: sequencesData } = await supabase
        .from('sequences')
        .select('id, name, project_id')
        .order('name')

      // Load all shots (we'll filter client-side)
      const { data: shotsData } = await supabase
        .from('shots')
        .select('id, name, sequence_id')
        .order('name')

      // Load all tasks (we'll filter client-side based on selected entities)
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, name')
        .order('name')

      setProjects(projectsData || [])
      setUsers(usersData || [])
      setSequences(sequencesData || [])
      setShots(shotsData || [])
      setTasks(tasksData || [])
    } catch (error) {
      console.error('Failed to load filter options:', error)
    } finally {
      setIsLoading(false)
    }
  }

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

    // Auto-expand if any filters are set
    if (projectIds.length || sequenceIds.length || shotIds.length || taskIds.length || userIds.length) {
      setIsExpanded(true)
    }
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
        // When projects change, clear sequences and shots if they don't belong to selected projects
        const validSequenceIds = sequences
          .filter((seq) => (value as number[]).includes(seq.project_id))
          .map((seq) => seq.id)
        newFilters.sequenceIds = prev.sequenceIds.filter((id) =>
          validSequenceIds.includes(id)
        )

        const validShotIds = shots
          .filter((shot) => newFilters.sequenceIds.includes(shot.sequence_id))
          .map((shot) => shot.id)
        newFilters.shotIds = prev.shotIds.filter((id) => validShotIds.includes(id))
      }

      if (key === 'sequenceIds') {
        // When sequences change, clear shots if they don't belong to selected sequences
        const validShotIds = shots
          .filter((shot) => (value as number[]).includes(shot.sequence_id))
          .map((shot) => shot.id)
        newFilters.shotIds = prev.shotIds.filter((id) => validShotIds.includes(id))
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

  // Get filtered options based on cascading selections
  const availableSequences = filters.projectIds.length > 0
    ? sequences.filter((seq) => filters.projectIds.includes(seq.project_id))
    : sequences

  const availableShots = filters.sequenceIds.length > 0
    ? shots.filter((shot) => filters.sequenceIds.includes(shot.sequence_id))
    : filters.projectIds.length > 0
    ? shots.filter((shot) => {
        const sequence = sequences.find((seq) => seq.id === shot.sequence_id)
        return sequence && filters.projectIds.includes(sequence.project_id)
      })
    : shots

  return (
    <div className="bg-background border border-border rounded-lg p-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground/70">Filter Posts</h3>
          {hasActiveFilters && (
            <span className="text-xs text-muted-foreground">
              ({filters.projectIds.length + filters.sequenceIds.length + filters.shotIds.length + filters.taskIds.length + filters.userIds.length} active)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs text-primary hover:text-primary/80"
            >
              <X className="h-3 w-3 mr-1" />
              Clear all
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </div>

      {/* Scope Toggle */}
      <div className="mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => updateFilter('scope', 'global')}
            className={`
              flex-1 px-4 py-2 rounded-md text-sm font-medium transition flex items-center justify-center gap-2
              ${
                filters.scope === 'global'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:text-foreground/70 border border-border'
              }
            `}
          >
            <Globe className="h-4 w-4" />
            Global Feed
          </button>
          <button
            onClick={() => updateFilter('scope', 'filtered')}
            className={`
              flex-1 px-4 py-2 rounded-md text-sm font-medium transition flex items-center justify-center gap-2
              ${
                filters.scope === 'filtered'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:text-foreground/70 border border-border'
              }
            `}
          >
            <Filter className="h-4 w-4" />
            Filtered
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      {isExpanded && filters.scope === 'filtered' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Projects */}
          <EntityMultiSelect
            label="Projects"
            placeholder="All projects"
            options={projects.map((p) => ({ id: p.id, label: p.name }))}
            selectedIds={filters.projectIds}
            onChange={(ids) => updateFilter('projectIds', ids as number[])}
            disabled={isLoading}
          />

          {/* Sequences */}
          <EntityMultiSelect
            label="Sequences"
            placeholder={filters.projectIds.length ? 'All sequences' : 'Select projects first'}
            options={availableSequences.map((s) => ({
              id: s.id,
              label: s.name,
              subLabel: projects.find((p) => p.id === s.project_id)?.name,
            }))}
            selectedIds={filters.sequenceIds}
            onChange={(ids) => updateFilter('sequenceIds', ids as number[])}
            disabled={isLoading}
          />

          {/* Shots */}
          <EntityMultiSelect
            label="Shots"
            placeholder={filters.sequenceIds.length ? 'All shots' : 'Select sequences first'}
            options={availableShots.map((s) => ({
              id: s.id,
              label: s.name,
              subLabel: sequences.find((seq) => seq.id === s.sequence_id)?.name,
            }))}
            selectedIds={filters.shotIds}
            onChange={(ids) => updateFilter('shotIds', ids as number[])}
            disabled={isLoading}
          />

          {/* Tasks */}
          <EntityMultiSelect
            label="Tasks"
            placeholder="All tasks"
            options={tasks.map((t) => ({ id: t.id, label: t.name }))}
            selectedIds={filters.taskIds}
            onChange={(ids) => updateFilter('taskIds', ids as number[])}
            disabled={isLoading}
          />

          {/* Users */}
          <EntityMultiSelect
            label="Users"
            placeholder="All users"
            options={users.map((u) => ({ id: u.id, label: u.display_name }))}
            selectedIds={filters.userIds}
            onChange={(ids) => updateFilter('userIds', ids as string[])}
            disabled={isLoading}
          />
        </div>
      )}
    </div>
  )
}
