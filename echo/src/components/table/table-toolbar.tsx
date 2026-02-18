'use client'

import { ChevronDown, Grid, List, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { TableColumn, TableSort } from './types'

interface TableToolbarProps {
  entityType: string
  columns: TableColumn[]
  visibleColumns: Set<string>
  pinnedColumnIds?: Set<string>
  onToggleColumn: (columnId: string) => void
  onTogglePinnedColumn?: (columnId: string) => void
  allowGridView?: boolean
  onAdd?: () => void
  view: 'grid' | 'list'
  onViewChange?: (view: 'grid' | 'list') => void
  showGridSizeControl?: boolean
  gridCardSize?: number
  onGridCardSizeChange?: (size: number) => void
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
  toolbarActions?: React.ReactNode
}

export function TableToolbar({
  entityType,
  columns,
  visibleColumns,
  pinnedColumnIds,
  onToggleColumn,
  onTogglePinnedColumn,
  allowGridView = true,
  onAdd,
  view,
  onViewChange,
  showGridSizeControl = false,
  gridCardSize = 240,
  onGridCardSizeChange,
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
  toolbarActions,
}: TableToolbarProps) {
  const MENU_VISIBLE_ITEMS = 10
  const MENU_MAX_HEIGHT = MENU_VISIBLE_ITEMS * 32

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
  const currentView = view
  const normalizedGridCardSize = Math.max(160, Math.min(420, Number(gridCardSize) || 240))

  useEffect(() => {
    if (!toggleAllRef.current) return
    toggleAllRef.current.indeterminate = someColumnsVisible
  }, [someColumnsVisible])

  const handleViewChange = (newView: 'grid' | 'list') => {
    onViewChange?.(newView)
  }

  const openManageColumns = () => {
    setManagedColumns(new Set(visibleColumns))
    setManageSearchQuery('')
    setManageColumnsOpen(true)
  }

  const handleManageColumnsOpenChange = (open: boolean) => {
    if (open) {
      setManagedColumns(new Set(visibleColumns))
      setManageSearchQuery('')
    }
    setManageColumnsOpen(open)
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
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background/80 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        {allowGridView ? (
          <div className="flex items-center rounded-sm border border-border bg-background">
            <button
              onClick={() => handleViewChange('grid')}
              className={`px-2 py-1.5 text-xs transition ${
                currentView === 'grid'
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground/70'
              }`}
              title="Grid View"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleViewChange('list')}
              className={`px-2 py-1.5 text-xs transition ${
                currentView === 'list'
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground/70'
              }`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {allowGridView && showGridSizeControl && currentView === 'grid' ? (
          <div className="flex items-center gap-2 rounded-sm border border-border bg-background px-2 py-1.5">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Size
            </span>
            <input
              type="range"
              min={160}
              max={420}
              step={10}
              value={normalizedGridCardSize}
              onChange={(event) =>
                onGridCardSizeChange?.(Number.parseInt(event.target.value, 10))
              }
              className="h-3 w-24 accent-primary"
              aria-label="Grid card size"
            />
          </div>
        ) : null}

        {onAdd ? (
          <button
            onClick={onAdd}
            className="flex items-center gap-2 rounded-sm border border-primary bg-primary/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-primary"
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
            className="flex items-center gap-1 rounded-sm px-2 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground transition hover:bg-card hover:text-foreground/80"
          >
            Sort
            <ChevronDown className="h-3 w-3" />
          </button>
          {openMenu === 'sort' && (
            <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-sm border border-border bg-background p-2 text-xs text-foreground/80 shadow-lg">
              <div className="flex items-center justify-between px-2 pb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <span>Sort by</span>
                <button
                  onClick={clearSort}
                  className="text-primary hover:text-primary/80"
                >
                  Clear
                </button>
              </div>
              <div className="overflow-y-auto pr-1" style={{ maxHeight: `${MENU_MAX_HEIGHT}px` }}>
                {columns.map((column) => (
                  <button
                    key={column.id}
                    onClick={() => handleSort(column.id)}
                    className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left hover:bg-card"
                  >
                    <span>{column.label}</span>
                    {sort?.id === column.id && (
                      <span className="text-[10px] uppercase text-muted-foreground">
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
            className="flex items-center gap-1 rounded-sm px-2 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground transition hover:bg-card hover:text-foreground/80"
          >
            Group
            <ChevronDown className="h-3 w-3" />
          </button>
          {openMenu === 'group' && (
            <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-sm border border-border bg-background p-2 text-xs text-foreground/80 shadow-lg">
              <div className="overflow-y-auto pr-1" style={{ maxHeight: `${MENU_MAX_HEIGHT}px` }}>
                <button
                  onClick={() => {
                    onGroupByChange(null)
                    setOpenMenu(null)
                  }}
                  className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left hover:bg-card"
                >
                  <span>None</span>
                  {!groupBy && <span className="text-[10px] uppercase text-muted-foreground">On</span>}
                </button>
                {columns.map((column) => (
                  <button
                    key={column.id}
                    onClick={() => {
                      onGroupByChange(column.id)
                      setOpenMenu(null)
                    }}
                    className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left hover:bg-card"
                  >
                    <span>{column.label}</span>
                    {groupBy === column.id && (
                      <span className="text-[10px] uppercase text-muted-foreground">On</span>
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
            className="flex items-center gap-1 rounded-sm px-2 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground transition hover:bg-card hover:text-foreground/80"
          >
            Fields
            <ChevronDown className="h-3 w-3" />
          </button>
          {openMenu === 'fields' && (
            <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-sm border border-border bg-background p-2 text-xs text-foreground/80 shadow-lg">
              <input
                type="text"
                placeholder={`Search ${entityLabel} fields...`}
                value={fieldSearchQuery}
                onChange={(event) => setFieldSearchQuery(event.target.value)}
                className="mb-2 w-full rounded-sm border border-border bg-card px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => {
                  setOpenMenu(null)
                  openManageColumns()
                }}
                className="mb-2 flex w-full items-center rounded-sm px-2 py-1.5 text-left text-foreground/80 hover:bg-card"
              >
                Manage Columns...
              </button>
              <div className="mb-2 border-t border-border" />
              <div className="px-2 pb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Visible columns
              </div>
              <div className="overflow-y-auto pr-1" style={{ maxHeight: `${MENU_MAX_HEIGHT}px` }}>
                {filteredFieldColumns.map((column) => (
                  <div
                    key={column.id}
                    className="flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 hover:bg-card"
                  >
                    <label className="flex min-w-0 flex-1 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(column.id)}
                        onChange={() => onToggleColumn(column.id)}
                        className="h-3 w-3 rounded border border-border bg-card"
                      />
                      <span className="truncate">{column.label}</span>
                    </label>
                    {onTogglePinnedColumn ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onTogglePinnedColumn(column.id)
                        }}
                        className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.18em] transition ${
                          pinnedColumnIds?.has(column.id)
                            ? 'border-primary/70 text-primary/80 hover:border-primary/70 hover:text-primary'
                            : 'border-border text-muted-foreground hover:border-border hover:text-foreground/80'
                        }`}
                      >
                        {pinnedColumnIds?.has(column.id) ? 'Pinned' : 'Pin'}
                      </button>
                    ) : null}
                  </div>
                ))}
                {filteredFieldColumns.length === 0 ? (
                  <div className="px-2 py-2 text-muted-foreground">No matching fields</div>
                ) : null}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {toolbarActions ? <div className="flex items-center gap-2">{toolbarActions}</div> : null}
        <div className="relative" ref={filtersRef}>
          <button
            onClick={onToggleFilters}
            className={`rounded-sm border px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition ${
              filtersOpen
                ? 'border-primary text-primary/80'
                : 'border-border text-foreground/70 hover:border-border hover:text-foreground'
            }`}
          >
            Filter {filterCount > 0 ? `(${filterCount})` : ''}
          </button>
          {filtersOpen ? filtersPanel : null}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={`Search ${entityLabel}s...`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-56 rounded-sm border border-border bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <Dialog open={manageColumnsOpen} onOpenChange={handleManageColumnsOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="w-full max-w-2xl border-border bg-background p-0 text-foreground"
        >
          <div className="border-b border-border px-6 py-4">
            <DialogTitle className="text-2xl font-semibold text-foreground">
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
              className="mb-3 w-full rounded-sm border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />

            <label className="mb-3 flex items-center gap-2 border-b border-border pb-3 text-sm text-foreground/70">
              <input
                ref={toggleAllRef}
                type="checkbox"
                checked={allColumnsVisible}
                onChange={handleToggleAllManaged}
                className="h-4 w-4 rounded border border-border bg-card"
              />
              <span>Toggle All</span>
            </label>

            <div className="max-h-[360px] overflow-y-auto pr-1">
              {filteredManageColumns.map((column) => (
                <label
                  key={column.id}
                  className="flex items-center gap-2 rounded-sm px-1 py-1.5 text-sm text-foreground/80 hover:bg-card"
                >
                  <input
                    type="checkbox"
                    checked={managedColumns.has(column.id)}
                    onChange={() => toggleManagedColumn(column.id)}
                    className="h-4 w-4 rounded border border-border bg-card"
                  />
                  <span>{column.label}</span>
                </label>
              ))}
              {filteredManageColumns.length === 0 ? (
                <div className="px-1 py-2 text-sm text-muted-foreground">No matching fields</div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-3">
            <button
              type="button"
              onClick={() => setManageColumnsOpen(false)}
              className="rounded-sm border border-border px-3 py-1.5 text-sm text-foreground/70 transition hover:border-border hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyManagedColumns}
              className="rounded-sm border border-primary bg-primary/90 px-3 py-1.5 text-sm font-semibold text-black transition hover:bg-primary"
            >
              Apply
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
