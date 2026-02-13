'use client'

import { ChevronDown, Grid, List, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { TableColumn, TableSort } from './types'

interface TableToolbarProps {
  entityType: string
  columns: TableColumn[]
  visibleColumns: Set<string>
  onToggleColumn: (columnId: string) => void
  onAdd?: () => void
  onViewChange?: (view: 'grid' | 'list') => void
  sort: TableSort | null
  onSortChange: (sort: TableSort | null) => void
  groupBy: string | null
  onGroupByChange: (groupBy: string | null) => void
  searchQuery: string
  onSearchChange: (value: string) => void
  filterCount: number
  filtersOpen: boolean
  onToggleFilters: () => void
  onCloseFilters: () => void
  filtersPanel?: React.ReactNode
}

export function TableToolbar({
  entityType,
  columns,
  visibleColumns,
  onToggleColumn,
  onAdd,
  onViewChange,
  sort,
  onSortChange,
  groupBy,
  onGroupByChange,
  searchQuery,
  onSearchChange,
  filterCount,
  filtersOpen,
  onToggleFilters,
  onCloseFilters,
  filtersPanel,
}: TableToolbarProps) {
  const MENU_VISIBLE_ITEMS = 10
  const MENU_MAX_HEIGHT = MENU_VISIBLE_ITEMS * 32

  const [view, setView] = useState<'grid' | 'list'>('list')
  const [openMenu, setOpenMenu] = useState<'sort' | 'group' | 'fields' | null>(null)
  const [fieldSearchQuery, setFieldSearchQuery] = useState('')
  const [manageColumnsOpen, setManageColumnsOpen] = useState(false)
  const [manageSearchQuery, setManageSearchQuery] = useState('')
  const [managedColumns, setManagedColumns] = useState<Set<string>>(() => new Set())
  const menuRef = useRef<HTMLDivElement | null>(null)
  const filtersRef = useRef<HTMLDivElement | null>(null)
  const toggleAllRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!filtersOpen) return

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (filtersRef.current && !filtersRef.current.contains(target)) {
        onCloseFilters()
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [filtersOpen, onCloseFilters])

  useEffect(() => {
    if (!openMenu) return

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpenMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openMenu])

  useEffect(() => {
    if (!manageColumnsOpen) return
    setManagedColumns(new Set(visibleColumns))
    setManageSearchQuery('')
  }, [manageColumnsOpen, visibleColumns])

  const filteredFieldColumns = useMemo(() => {
    const query = fieldSearchQuery.trim().toLowerCase()
    if (!query) return columns
    return columns.filter(
      (column) =>
        column.label.toLowerCase().includes(query) ||
        column.id.toLowerCase().includes(query)
    )
  }, [columns, fieldSearchQuery])

  const filteredManageColumns = useMemo(() => {
    const query = manageSearchQuery.trim().toLowerCase()
    if (!query) return columns
    return columns.filter(
      (column) =>
        column.label.toLowerCase().includes(query) ||
        column.id.toLowerCase().includes(query)
    )
  }, [columns, manageSearchQuery])

  const allColumnsVisible = columns.length > 0 && managedColumns.size === columns.length
  const someColumnsVisible = managedColumns.size > 0 && !allColumnsVisible

  useEffect(() => {
    if (!toggleAllRef.current) return
    toggleAllRef.current.indeterminate = someColumnsVisible
  }, [someColumnsVisible])

  const handleViewChange = (newView: 'grid' | 'list') => {
    setView(newView)
    onViewChange?.(newView)
  }

  const entityLabels: Record<string, string> = {
    assets: 'Asset',
    sequences: 'Sequence',
    shots: 'Shot',
    tasks: 'Task',
    notes: 'Note',
    versions: 'Version',
    publishes: 'Published File',
    published_files: 'Published File',
    playlists: 'Playlist',
    projects: 'Project',
    fields: 'Field',
    schema_fields: 'Field',
    profiles: 'User',
    people: 'User',
    departments: 'Department',
  }
  const entityLabel =
    entityLabels[entityType] ??
    entityLabels[entityType.split('_')[0]] ??
    'Item'

  const toggleMenu = (menu: 'sort' | 'group' | 'fields') => {
    setOpenMenu((prev) => (prev === menu ? null : menu))
  }

  const handleSort = (columnId: string) => {
    if (!sort || sort.id !== columnId) {
      onSortChange({ id: columnId, direction: 'asc' })
      setOpenMenu(null)
      return
    }

    onSortChange({
      id: columnId,
      direction: sort.direction === 'asc' ? 'desc' : 'asc',
    })
    setOpenMenu(null)
  }

  const clearSort = () => {
    onSortChange(null)
    setOpenMenu(null)
  }

  const toggleManagedColumn = (columnId: string) => {
    setManagedColumns((prev) => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      return next
    })
  }

  const handleToggleAllManaged = () => {
    setManagedColumns((prev) => {
      if (prev.size === columns.length) {
        return new Set()
      }
      return new Set(columns.map((column) => column.id))
    })
  }

  const applyManagedColumns = () => {
    const toToggle: string[] = []

    for (const column of columns) {
      const shouldBeVisible = managedColumns.has(column.id)
      const isVisible = visibleColumns.has(column.id)
      if (shouldBeVisible !== isVisible) {
        toToggle.push(column.id)
      }
    }

    toToggle.forEach((columnId) => onToggleColumn(columnId))
    setManageColumnsOpen(false)
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-950/80 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-sm border border-zinc-800 bg-zinc-950">
          <button
            onClick={() => handleViewChange('grid')}
            className={`px-2 py-1.5 text-xs transition ${
              view === 'grid'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Grid View"
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleViewChange('list')}
            className={`px-2 py-1.5 text-xs transition ${
              view === 'list'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="List View"
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        {onAdd ? (
          <button
            onClick={onAdd}
            className="flex items-center gap-2 rounded-sm border border-amber-400 bg-amber-400/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-amber-300"
          >
            <Plus className="h-4 w-4" />
            Add {entityLabel}
            <ChevronDown className="h-3 w-3" />
          </button>
        ) : null}

        <div className="flex items-center gap-1" ref={menuRef}>
          <div className="relative">
          <button
            onClick={() => toggleMenu('sort')}
            className="flex items-center gap-1 rounded-sm px-2 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-200"
          >
            Sort
            <ChevronDown className="h-3 w-3" />
          </button>
          {openMenu === 'sort' && (
            <div className="absolute left-0 top-full z-20 mt-2 w-56 rounded-sm border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-200 shadow-lg">
              <div className="flex items-center justify-between px-2 pb-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                <span>Sort by</span>
                <button
                  onClick={clearSort}
                  className="text-amber-400 hover:text-amber-300"
                >
                  Clear
                </button>
              </div>
              <div className="overflow-y-auto pr-1" style={{ maxHeight: `${MENU_MAX_HEIGHT}px` }}>
                {columns.map((column) => (
                  <button
                    key={column.id}
                    onClick={() => handleSort(column.id)}
                    className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left hover:bg-zinc-900"
                  >
                    <span>{column.label}</span>
                    {sort?.id === column.id && (
                      <span className="text-[10px] uppercase text-zinc-400">
                        {sort.direction}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          </div>

          <div className="relative">
          <button
            onClick={() => toggleMenu('group')}
            className="flex items-center gap-1 rounded-sm px-2 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-200"
          >
            Group
            <ChevronDown className="h-3 w-3" />
          </button>
          {openMenu === 'group' && (
            <div className="absolute left-0 top-full z-20 mt-2 w-56 rounded-sm border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-200 shadow-lg">
              <div className="overflow-y-auto pr-1" style={{ maxHeight: `${MENU_MAX_HEIGHT}px` }}>
                <button
                  onClick={() => {
                    onGroupByChange(null)
                    setOpenMenu(null)
                  }}
                  className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left hover:bg-zinc-900"
                >
                  <span>None</span>
                  {!groupBy && <span className="text-[10px] uppercase text-zinc-400">On</span>}
                </button>
                {columns.map((column) => (
                  <button
                    key={column.id}
                    onClick={() => {
                      onGroupByChange(column.id)
                      setOpenMenu(null)
                    }}
                    className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left hover:bg-zinc-900"
                  >
                    <span>{column.label}</span>
                    {groupBy === column.id && (
                      <span className="text-[10px] uppercase text-zinc-400">On</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          </div>

          <div className="relative">
          <button
            onClick={() => toggleMenu('fields')}
            className="flex items-center gap-1 rounded-sm px-2 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-200"
          >
            Fields
            <ChevronDown className="h-3 w-3" />
          </button>
          {openMenu === 'fields' && (
            <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-sm border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-200 shadow-lg">
              <input
                type="text"
                placeholder={`Search ${entityLabel} fields...`}
                value={fieldSearchQuery}
                onChange={(event) => setFieldSearchQuery(event.target.value)}
                className="mb-2 w-full rounded-sm border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                onClick={() => {
                  setOpenMenu(null)
                  setManageColumnsOpen(true)
                }}
                className="mb-2 flex w-full items-center rounded-sm px-2 py-1.5 text-left text-zinc-200 hover:bg-zinc-900"
              >
                Manage Columns...
              </button>
              <div className="mb-2 border-t border-zinc-800" />
              <div className="px-2 pb-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                Visible columns
              </div>
              <div className="overflow-y-auto pr-1" style={{ maxHeight: `${MENU_MAX_HEIGHT}px` }}>
                {filteredFieldColumns.map((column) => (
                  <label
                    key={column.id}
                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-zinc-900"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(column.id)}
                      onChange={() => onToggleColumn(column.id)}
                      className="h-3 w-3 rounded border border-zinc-700 bg-zinc-900"
                    />
                    <span>{column.label}</span>
                  </label>
                ))}
                {filteredFieldColumns.length === 0 ? (
                  <div className="px-2 py-2 text-zinc-500">No matching fields</div>
                ) : null}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={filtersRef}>
          <button
            onClick={onToggleFilters}
            className={`rounded-sm border px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition ${
              filtersOpen
                ? 'border-amber-400 text-amber-300'
                : 'border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white'
            }`}
          >
            Filter {filterCount > 0 ? `(${filterCount})` : ''}
          </button>
          {filtersOpen ? filtersPanel : null}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder={`Search ${entityLabel}s...`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-56 rounded-sm border border-zinc-800 bg-zinc-950 py-1.5 pl-8 pr-3 text-xs text-zinc-100 placeholder-zinc-500 transition focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      <Dialog open={manageColumnsOpen} onOpenChange={setManageColumnsOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-full max-w-2xl border-zinc-800 bg-zinc-950 p-0 text-zinc-100"
        >
          <div className="border-b border-zinc-800 px-6 py-4">
            <DialogTitle className="text-2xl font-semibold text-zinc-100">
              Manage Columns
            </DialogTitle>
            <DialogDescription className="sr-only">
              Choose which columns are visible in the table.
            </DialogDescription>
          </div>

          <div className="px-6 py-4">
            <input
              type="text"
              placeholder={`Search ${entityLabel} fields...`}
              value={manageSearchQuery}
              onChange={(event) => setManageSearchQuery(event.target.value)}
              className="mb-3 w-full rounded-sm border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />

            <label className="mb-3 flex items-center gap-2 border-b border-zinc-800 pb-3 text-sm text-zinc-300">
              <input
                ref={toggleAllRef}
                type="checkbox"
                checked={allColumnsVisible}
                onChange={handleToggleAllManaged}
                className="h-4 w-4 rounded border border-zinc-700 bg-zinc-900"
              />
              <span>Toggle All</span>
            </label>

            <div className="max-h-[360px] overflow-y-auto pr-1">
              {filteredManageColumns.map((column) => (
                <label
                  key={column.id}
                  className="flex items-center gap-2 rounded-sm px-1 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900"
                >
                  <input
                    type="checkbox"
                    checked={managedColumns.has(column.id)}
                    onChange={() => toggleManagedColumn(column.id)}
                    className="h-4 w-4 rounded border border-zinc-700 bg-zinc-900"
                  />
                  <span>{column.label}</span>
                </label>
              ))}
              {filteredManageColumns.length === 0 ? (
                <div className="px-1 py-2 text-sm text-zinc-500">No matching fields</div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-zinc-800 px-6 py-3">
            <button
              type="button"
              onClick={() => setManageColumnsOpen(false)}
              className="rounded-sm border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyManagedColumns}
              className="rounded-sm border border-amber-400 bg-amber-400/90 px-3 py-1.5 text-sm font-semibold text-black transition hover:bg-amber-300"
            >
              Apply
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
