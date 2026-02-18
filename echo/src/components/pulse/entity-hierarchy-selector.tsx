'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronRight, X, Check, Search, Folder, Film, Camera, CheckSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

type EntityType = 'project' | 'sequence' | 'shot' | 'task'

interface Entity {
  id: number
  name: string
  type: EntityType
}

interface BreadcrumbItem {
  id: number
  name: string
  type: EntityType
}

interface EntityHierarchySelectorProps {
  onSelectionChange: (selections: SelectedEntities) => void
  className?: string
}

export interface SelectedEntities {
  projects: Entity[]
  sequences: Entity[]
  shots: Entity[]
  tasks: Entity[]
}

export function EntityHierarchySelector({
  onSelectionChange,
  className = '',
}: EntityHierarchySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentLevel, setCurrentLevel] = useState<EntityType>('project')
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([])
  const [items, setItems] = useState<Entity[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  // Final selections (checkboxed items)
  const [selections, setSelections] = useState<SelectedEntities>({
    projects: [],
    sequences: [],
    shots: [],
    tasks: [],
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Load items when level or breadcrumb changes
  useEffect(() => {
    if (isOpen) {
      loadItems()
    }
  }, [currentLevel, breadcrumb, searchQuery, isOpen])

  // Notify parent when selections change
  useEffect(() => {
    onSelectionChange(selections)
  }, [selections])

  const loadItems = async () => {
    setIsLoading(true)
    try {
      let query
      let data: any[] = []

      switch (currentLevel) {
        case 'project':
          query = supabase
            .from('projects')
            .select('id, name')
            .order('name')
            .limit(5)

          if (searchQuery) {
            query = query.ilike('name', `%${searchQuery}%`)
          }

          const projectResult = await query
          data = projectResult.data?.map((p) => ({
            id: p.id,
            name: p.name,
            type: 'project' as EntityType,
          })) || []
          break

        case 'sequence':
          const parentProject = breadcrumb.find((b) => b.type === 'project')
          if (!parentProject) break

          query = supabase
            .from('sequences')
            .select('id, name')
            .eq('project_id', parentProject.id)
            .order('name')
            .limit(5)

          if (searchQuery) {
            query = query.ilike('name', `%${searchQuery}%`)
          }

          const seqResult = await query
          data = seqResult.data?.map((s) => ({
            id: s.id,
            name: s.name,
            type: 'sequence' as EntityType,
          })) || []
          break

        case 'shot':
          const parentSeq = breadcrumb.find((b) => b.type === 'sequence')
          if (!parentSeq) break

          query = supabase
            .from('shots')
            .select('id, name')
            .eq('sequence_id', parentSeq.id)
            .order('name')
            .limit(5)

          if (searchQuery) {
            query = query.ilike('name', `%${searchQuery}%`)
          }

          const shotResult = await query
          data = shotResult.data?.map((s) => ({
            id: s.id,
            name: s.name,
            type: 'shot' as EntityType,
          })) || []
          break

        case 'task':
          // For tasks, we can show tasks from the shot or sequence level
          const parentShot = breadcrumb.find((b) => b.type === 'shot')
          const parentSequence = breadcrumb.find((b) => b.type === 'sequence')

          query = supabase
            .from('tasks')
            .select('id, name')
            .order('name')
            .limit(5)

          if (parentShot) {
            query = query.eq('entity_id', parentShot.id).eq('entity_type', 'shot')
          } else if (parentSequence) {
            query = query.eq('entity_id', parentSequence.id).eq('entity_type', 'sequence')
          }

          if (searchQuery) {
            query = query.ilike('name', `%${searchQuery}%`)
          }

          const taskResult = await query
          data = taskResult.data?.map((t) => ({
            id: t.id,
            name: t.name,
            type: 'task' as EntityType,
          })) || []
          break
      }

      setItems(data)
    } catch (error) {
      console.error('Failed to load items:', error)
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleItemClick = (item: Entity) => {
    // Drill down to next level
    const newBreadcrumb = [...breadcrumb, { id: item.id, name: item.name, type: item.type }]
    setBreadcrumb(newBreadcrumb)
    setSearchQuery('')

    // Determine next level
    const nextLevel: { [key in EntityType]?: EntityType } = {
      project: 'sequence',
      sequence: 'shot',
      shot: 'task',
    }

    const next = nextLevel[item.type]
    if (next) {
      setCurrentLevel(next)
    }
  }

  const handleCheckboxToggle = (item: Entity) => {
    const key = `${item.type}-${item.id}`
    const newSelected = new Set(selectedItems)

    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }

    setSelectedItems(newSelected)

    // Update selections object
    const newSelections = { ...selections }
    const typeKey = `${item.type}s` as keyof SelectedEntities

    if (newSelected.has(key)) {
      // Add the selected item
      newSelections[typeKey] = [
        ...newSelections[typeKey].filter((i) => i.id !== item.id),
        { ...item, breadcrumb: [...breadcrumb] } as any,
      ]

      // IMPORTANT: Auto-include all parent entities from breadcrumb
      // This ensures the full hierarchy is visible on the post
      breadcrumb.forEach((crumb) => {
        const crumbKey = `${crumb.type}s` as keyof SelectedEntities
        const crumbExists = newSelections[crumbKey].some((e) => e.id === crumb.id)

        if (!crumbExists) {
          // Get breadcrumb up to this point
          const crumbIndex = breadcrumb.indexOf(crumb)
          const crumbBreadcrumb = breadcrumb.slice(0, crumbIndex)

          newSelections[crumbKey] = [
            ...newSelections[crumbKey],
            {
              id: crumb.id,
              name: crumb.name,
              type: crumb.type,
              breadcrumb: crumbBreadcrumb
            } as any,
          ]

          // Also mark as selected in UI
          newSelected.add(`${crumb.type}-${crumb.id}`)
        }
      })
    } else {
      // Remove from selections
      newSelections[typeKey] = newSelections[typeKey].filter((i) => i.id !== item.id)
    }

    setSelectedItems(newSelected)
    setSelections(newSelections)
  }

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      // Click "Start" - go back to projects
      setBreadcrumb([])
      setCurrentLevel('project')
      setSearchQuery('')
      return
    }

    const newBreadcrumb = breadcrumb.slice(0, index + 1)
    setBreadcrumb(newBreadcrumb)
    setSearchQuery('')

    // Set current level to next after clicked item
    const clickedItem = breadcrumb[index]
    const nextLevel: { [key in EntityType]?: EntityType } = {
      project: 'sequence',
      sequence: 'shot',
      shot: 'task',
    }

    setCurrentLevel(nextLevel[clickedItem.type] || clickedItem.type)
  }

  const handleBackButton = () => {
    if (breadcrumb.length === 0) return

    // Go back one level
    const newBreadcrumb = breadcrumb.slice(0, -1)
    setBreadcrumb(newBreadcrumb)
    setSearchQuery('')

    if (newBreadcrumb.length === 0) {
      setCurrentLevel('project')
    } else {
      const lastItem = newBreadcrumb[newBreadcrumb.length - 1]
      const nextLevel: { [key in EntityType]?: EntityType } = {
        project: 'sequence',
        sequence: 'shot',
        shot: 'task',
      }
      setCurrentLevel(nextLevel[lastItem.type] || lastItem.type)
    }
  }

  const handleReset = () => {
    setBreadcrumb([])
    setCurrentLevel('project')
    setSearchQuery('')
    setSelectedItems(new Set())
    setSelections({
      projects: [],
      sequences: [],
      shots: [],
      tasks: [],
    })
  }

  const getTotalSelections = () => {
    return (
      selections.projects.length +
      selections.sequences.length +
      selections.shots.length +
      selections.tasks.length
    )
  }

  const getAllSelectionBadges = () => {
    const badges: React.ReactElement[] = []

    // Projects
    selections.projects.forEach((p) => {
      badges.push(
        <Badge
          key={`project-${p.id}`}
          variant="secondary"
          className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs"
        >
          <Folder className="h-3 w-3 mr-1" />
          {p.name}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCheckboxToggle(p)
            }}
            className="ml-1 hover:text-blue-300"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )
    })

    // Sequences with full project context
    selections.sequences.forEach((s: any) => {
      const breadcrumbPath = (s.breadcrumb || [])
        .map((b: any) => b.name)
        .join(' > ')
      const fullPath = breadcrumbPath ? `${breadcrumbPath} > ${s.name}` : s.name

      badges.push(
        <Badge
          key={`sequence-${s.id}`}
          variant="secondary"
          className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs max-w-xs"
          title={fullPath}
        >
          <Film className="h-3 w-3 mr-1 flex-shrink-0" />
          <span className="truncate">{fullPath}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCheckboxToggle(s)
            }}
            className="ml-1 hover:text-purple-300 flex-shrink-0"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )
    })

    // Shots with full context
    selections.shots.forEach((s: any) => {
      const breadcrumbPath = (s.breadcrumb || [])
        .map((b: any) => b.name)
        .join(' > ')
      const fullPath = breadcrumbPath ? `${breadcrumbPath} > ${s.name}` : s.name

      badges.push(
        <Badge
          key={`shot-${s.id}`}
          variant="secondary"
          className="bg-green-500/10 text-green-400 border-green-500/20 text-xs max-w-xs"
          title={fullPath}
        >
          <Camera className="h-3 w-3 mr-1 flex-shrink-0" />
          <span className="truncate">{fullPath}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCheckboxToggle(s)
            }}
            className="ml-1 hover:text-green-300 flex-shrink-0"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )
    })

    // Tasks with full context
    selections.tasks.forEach((t: any) => {
      const breadcrumbPath = (t.breadcrumb || [])
        .map((b: any) => b.name)
        .join(' > ')
      const fullPath = breadcrumbPath ? `${breadcrumbPath} > ${t.name}` : t.name

      badges.push(
        <Badge
          key={`task-${t.id}`}
          variant="secondary"
          className="bg-primary/10 text-primary border-primary/20 text-xs max-w-xs"
          title={fullPath}
        >
          <CheckSquare className="h-3 w-3 mr-1 flex-shrink-0" />
          <span className="truncate">{fullPath}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCheckboxToggle(t)
            }}
            className="ml-1 hover:text-primary/80 flex-shrink-0"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )
    })

    return badges
  }

  const getLevelIcon = (level: EntityType) => {
    switch (level) {
      case 'project':
        return <Folder className="h-3.5 w-3.5" />
      case 'sequence':
        return <Film className="h-3.5 w-3.5" />
      case 'shot':
        return <Camera className="h-3.5 w-3.5" />
      case 'task':
        return <CheckSquare className="h-3.5 w-3.5" />
    }
  }

  const getLevelLabel = (level: EntityType) => {
    return level.charAt(0).toUpperCase() + level.slice(1)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border transition
          ${
            getTotalSelections() > 0
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-card border-border text-muted-foreground hover:border-border'
          }
        `}
      >
        {getLevelIcon('project')}
        <span>Tag Entities</span>
        {getTotalSelections() > 0 && (
          <span className="text-xs">({getTotalSelections()})</span>
        )}
      </button>

      {/* Selected badges */}
      {getTotalSelections() > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {getAllSelectionBadges()}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-96 bg-card border border-border rounded-md shadow-lg">
          {/* Breadcrumb Navigation */}
          <div className="p-2 border-b border-border flex items-center gap-1 text-xs overflow-x-auto">
            {/* Start/Home button */}
            <button
              onClick={() => handleBreadcrumbClick(-1)}
              className={`flex items-center gap-1 px-2 py-1 rounded ${
                breadcrumb.length === 0
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-primary'
              }`}
              title="Start over"
            >
              <Folder className="h-3 w-3" />
              {breadcrumb.length === 0 ? 'Projects' : 'Start'}
            </button>

            {breadcrumb.length > 0 && (
              <>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                {breadcrumb.map((crumb, index) => (
                  <div key={`${crumb.type}-${crumb.id}`} className="flex items-center gap-1">
                    <button
                      onClick={() => handleBreadcrumbClick(index)}
                      className="text-primary hover:text-primary/80 whitespace-nowrap px-2 py-1 rounded hover:bg-primary/10"
                    >
                      {crumb.name}
                    </button>
                    {index < breadcrumb.length - 1 && (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Header */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {breadcrumb.length > 0 && (
                  <button
                    onClick={handleBackButton}
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                  >
                    ← Back
                  </button>
                )}
                <div className="flex items-center gap-2 text-sm font-medium text-foreground/70">
                  {getLevelIcon(currentLevel)}
                  <span>Select {getLevelLabel(currentLevel)}</span>
                </div>
              </div>
              {getTotalSelections() > 0 && (
                <button
                  onClick={handleReset}
                  className="text-xs text-primary hover:text-primary/80"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={`Search ${currentLevel}s...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 bg-background border-border text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Items List */}
          <div className="max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {searchQuery ? 'No results found' : `No ${currentLevel}s available`}
              </div>
            ) : (
              items.map((item) => {
                const key = `${item.type}-${item.id}`
                const isChecked = selectedItems.has(key)

                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-accent transition"
                  >
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleCheckboxToggle(item)}
                      className={`
                        flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center
                        ${
                          isChecked
                            ? 'bg-primary border-primary'
                            : 'border-border hover:border-border'
                        }
                      `}
                    >
                      {isChecked && <Check className="h-3 w-3 text-primary-foreground" />}
                    </button>

                    {/* Item name - click to drill down */}
                    <button
                      type="button"
                      onClick={() => handleItemClick(item)}
                      className="flex-1 text-left text-sm text-foreground/70 hover:text-foreground"
                    >
                      {item.name}
                    </button>

                    {/* Drill down indicator */}
                    {currentLevel !== 'task' && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
