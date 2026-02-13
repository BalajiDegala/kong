'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, Check, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

interface EntitySearchComboboxProps {
  label: string
  placeholder?: string
  entityType: 'project' | 'sequence' | 'shot' | 'task' | 'user'
  selectedIds: (string | number)[]
  onChange: (selectedIds: (string | number)[]) => void
  filterByProjectIds?: number[]
  filterBySequenceIds?: number[]
  className?: string
}

interface SearchResult {
  id: string | number
  label: string
  subLabel?: string
}

export function EntitySearchCombobox({
  label,
  placeholder = 'Search...',
  entityType,
  selectedIds,
  onChange,
  filterByProjectIds,
  filterBySequenceIds,
  className = '',
}: EntitySearchComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedItems, setSelectedItems] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
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

  // Load selected items details on mount
  useEffect(() => {
    if (selectedIds.length > 0) {
      loadSelectedItems()
    } else {
      setSelectedItems([])
    }
  }, [selectedIds])

  // Search when query changes
  useEffect(() => {
    if (isOpen && searchQuery.length >= 1) {
      performSearch()
    } else if (searchQuery.length === 0 && isOpen) {
      // Show recent/popular items when no query
      performSearch()
    }
  }, [searchQuery, isOpen, filterByProjectIds, filterBySequenceIds])

  const loadSelectedItems = async () => {
    if (selectedIds.length === 0) return

    try {
      let query
      let data

      switch (entityType) {
        case 'project':
          query = await supabase
            .from('projects')
            .select('id, name')
            .in('id', selectedIds)
          data = query.data?.map((p) => ({ id: p.id, label: p.name })) || []
          break

        case 'sequence':
          query = await supabase
            .from('sequences')
            .select('id, name, project:projects(name)')
            .in('id', selectedIds)
          data =
            query.data?.map((s) => ({
              id: s.id,
              label: s.name,
              subLabel: (s.project as any)?.name,
            })) || []
          break

        case 'shot':
          query = await supabase
            .from('shots')
            .select('id, name, sequence:sequences(name)')
            .in('id', selectedIds)
          data =
            query.data?.map((s) => ({
              id: s.id,
              label: s.name,
              subLabel: (s.sequence as any)?.name,
            })) || []
          break

        case 'task':
          query = await supabase
            .from('tasks')
            .select('id, name')
            .in('id', selectedIds)
          data = query.data?.map((t) => ({ id: t.id, label: t.name })) || []
          break

        case 'user':
          query = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', selectedIds)
          data =
            query.data?.map((u) => ({ id: u.id, label: u.display_name })) || []
          break
      }

      setSelectedItems(data || [])
    } catch (err) {
      console.error('Failed to load selected items:', err)
    }
  }

  const performSearch = async () => {
    setIsSearching(true)

    try {
      let query
      let data

      switch (entityType) {
        case 'project':
          query = supabase
            .from('projects')
            .select('id, name')
            .order('name')
            .limit(20)

          if (searchQuery) {
            query = query.ilike('name', `%${searchQuery}%`)
          }

          const projectResult = await query
          data =
            projectResult.data?.map((p) => ({ id: p.id, label: p.name })) || []
          break

        case 'sequence':
          query = supabase
            .from('sequences')
            .select('id, name, project_id, project:projects(name)')
            .order('name')
            .limit(20)

          if (searchQuery) {
            query = query.ilike('name', `%${searchQuery}%`)
          }

          if (filterByProjectIds && filterByProjectIds.length > 0) {
            query = query.in('project_id', filterByProjectIds)
          }

          const seqResult = await query
          data =
            seqResult.data?.map((s) => ({
              id: s.id,
              label: s.name,
              subLabel: (s.project as any)?.name,
            })) || []
          break

        case 'shot':
          query = supabase
            .from('shots')
            .select('id, name, sequence_id, sequence:sequences(name, project_id)')
            .order('name')
            .limit(20)

          if (searchQuery) {
            query = query.ilike('name', `%${searchQuery}%`)
          }

          if (filterBySequenceIds && filterBySequenceIds.length > 0) {
            query = query.in('sequence_id', filterBySequenceIds)
          } else if (filterByProjectIds && filterByProjectIds.length > 0) {
            // Filter by project through sequence
            const seqsInProject = await supabase
              .from('sequences')
              .select('id')
              .in('project_id', filterByProjectIds)

            const seqIds = seqsInProject.data?.map((s) => s.id) || []
            if (seqIds.length > 0) {
              query = query.in('sequence_id', seqIds)
            }
          }

          const shotResult = await query
          data =
            shotResult.data?.map((s) => ({
              id: s.id,
              label: s.name,
              subLabel: (s.sequence as any)?.name,
            })) || []
          break

        case 'task':
          query = supabase
            .from('tasks')
            .select('id, name')
            .order('name')
            .limit(20)

          if (searchQuery) {
            query = query.ilike('name', `%${searchQuery}%`)
          }

          const taskResult = await query
          data = taskResult.data?.map((t) => ({ id: t.id, label: t.name })) || []
          break

        case 'user':
          query = supabase
            .from('profiles')
            .select('id, display_name')
            .order('display_name')
            .limit(20)

          if (searchQuery) {
            query = query.ilike('display_name', `%${searchQuery}%`)
          }

          const userResult = await query
          data =
            userResult.data?.map((u) => ({
              id: u.id,
              label: u.display_name,
            })) || []
          break
      }

      setSearchResults(data || [])
    } catch (err) {
      console.error('Search failed:', err)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const toggleItem = (item: SearchResult) => {
    const isSelected = selectedIds.includes(item.id)

    if (isSelected) {
      onChange(selectedIds.filter((id) => id !== item.id))
    } else {
      onChange([...selectedIds, item.id])
    }
  }

  const removeItem = (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selectedIds.filter((selectedId) => selectedId !== id))
  }

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Compact trigger - just shows count or first item */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-md text-sm
            border transition
            ${
              selectedItems.length > 0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }
          `}
        >
          {selectedItems.length === 0 ? (
            <>
              <Search className="h-3.5 w-3.5" />
              <span>{label}</span>
            </>
          ) : (
            <>
              <span className="font-medium">{label}:</span>
              <span>{selectedItems.length}</span>
              {selectedItems.length > 0 && (
                <button
                  onClick={clearAll}
                  className="hover:text-amber-300 ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </>
          )}
        </button>

        {/* Selected items as pills */}
        {selectedItems.slice(0, 2).map((item) => (
          <Badge
            key={item.id}
            variant="secondary"
            className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs hidden md:flex"
          >
            {item.label}
            <button
              onClick={(e) => removeItem(item.id, e)}
              className="ml-1 hover:text-amber-300"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        {selectedItems.length > 2 && (
          <span className="text-xs text-zinc-500 hidden md:inline">
            +{selectedItems.length - 2} more
          </span>
        )}
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-md shadow-lg">
          {/* Search Input */}
          <div className="p-3 border-b border-zinc-800">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <Input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-zinc-950 border-zinc-800 text-sm"
                autoFocus
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-zinc-500 animate-spin" />
              )}
            </div>
          </div>

          {/* Results List */}
          <div className="max-h-[300px] overflow-y-auto">
            {searchResults.length === 0 ? (
              <div className="px-3 py-8 text-sm text-zinc-500 text-center">
                {searchQuery ? 'No results found' : 'Type to search...'}
              </div>
            ) : (
              searchResults.map((item) => {
                const isSelected = selectedIds.includes(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItem(item)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 text-sm
                      hover:bg-zinc-800 transition text-left
                      ${isSelected ? 'bg-zinc-800/50' : ''}
                    `}
                  >
                    <div
                      className={`
                        flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center
                        ${
                          isSelected
                            ? 'bg-amber-500 border-amber-500'
                            : 'border-zinc-700'
                        }
                      `}
                    >
                      {isSelected && <Check className="h-3 w-3 text-zinc-900" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-zinc-300 truncate font-medium">
                        {item.label}
                      </div>
                      {item.subLabel && (
                        <div className="text-xs text-zinc-500 truncate">
                          {item.subLabel}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          {selectedIds.length > 0 && (
            <div className="p-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
              <span>{selectedIds.length} selected</span>
              <button
                onClick={clearAll}
                className="text-amber-400 hover:text-amber-300 font-medium"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
