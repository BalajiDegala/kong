'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { TableRowActions } from './table-row-actions'
import { TableToolbar } from './table-toolbar'
import type { TableColumn, TableSort } from './types'
import { createClient } from '@/lib/supabase/client'

interface EntityTableProps {
  columns: TableColumn[]
  data: any[]
  groupBy?: string
  entityType?: string
  onRowClick?: (row: any) => void
  onEdit?: (row: any) => void
  onDelete?: (row: any) => void
  onAdd?: () => void
  onCellUpdate?: (row: any, column: TableColumn, value: any) => Promise<void> | void
  showToolbar?: boolean
  showFiltersPanel?: boolean
}

export function EntityTable({
  columns,
  data,
  groupBy,
  entityType = 'projects',
  onRowClick,
  onEdit,
  onDelete,
  onAdd,
  onCellUpdate,
  showToolbar = true,
  showFiltersPanel = true,
}: EntityTableProps) {
  const showActions = Boolean(onEdit || onDelete)
  const [view, setView] = useState<'grid' | 'list'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [sort, setSort] = useState<TableSort | null>(null)
  const [groupById, setGroupById] = useState<string | null>(groupBy ?? null)
  const [density, setDensity] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [expandedFilterColumns, setExpandedFilterColumns] = useState<Set<string>>(
    () => new Set()
  )
  const [editingCell, setEditingCell] = useState<{
    rowId: number | string
    columnId: string
  } | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(columns.map((column) => column.id))
  )
  const [columnOrder, setColumnOrder] = useState<string[]>(
    () => columns.map((column) => column.id)
  )
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const resizeRef = useRef<{
    id: string
    startX: number
    startWidth: number
  } | null>(null)
  const [prefsReady, setPrefsReady] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Record<string, Set<string>>>(
    {}
  )

  useEffect(() => {
    setGroupById(groupBy ?? null)
  }, [groupBy])

  useEffect(() => {
    setColumnOrder((prev) => {
      const next = prev.filter((id) => columns.some((column) => column.id === id))
      const missing = columns
        .map((column) => column.id)
        .filter((id) => !next.includes(id))
      return [...next, ...missing]
    })
  }, [columns])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const storageKey = `kong.table.${entityType}`
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as {
        columnOrder?: string[]
        columnWidths?: Record<string, number>
        visibleColumns?: string[]
      }
      if (parsed.columnOrder?.length) {
        setColumnOrder(parsed.columnOrder)
      }
      if (parsed.columnWidths) {
        setColumnWidths(parsed.columnWidths)
      }
      if (parsed.visibleColumns?.length) {
        setVisibleColumns(new Set(parsed.visibleColumns))
      }
    } catch {
      // ignore invalid storage
    }
  }, [entityType])

  useEffect(() => {
    if (!prefsReady) return
    if (typeof window === 'undefined') return
    const storageKey = `kong.table.${entityType}`
    const payload = {
      columnOrder,
      columnWidths,
      visibleColumns: Array.from(visibleColumns),
    }
    window.localStorage.setItem(storageKey, JSON.stringify(payload))
  }, [columnOrder, columnWidths, visibleColumns, entityType])

  useEffect(() => {
    let isActive = true

    async function loadPreferences() {
      setPrefsReady(false)
      const supabase = createClient()
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData.user?.id
      if (!userId) {
        if (isActive) setPrefsReady(true)
        return
      }

      const { data } = await supabase
        .from('user_table_preferences')
        .select('column_order, column_widths, visible_columns')
        .eq('user_id', userId)
        .eq('entity_type', entityType)
        .maybeSingle()

      if (!isActive) return

      if (data) {
        if (Array.isArray(data.column_order)) {
          setColumnOrder(data.column_order)
        }
        if (data.column_widths && typeof data.column_widths === 'object') {
          setColumnWidths(data.column_widths)
        }
        if (Array.isArray(data.visible_columns)) {
          setVisibleColumns(new Set(data.visible_columns))
        }
      }
      if (isActive) setPrefsReady(true)
    }

    loadPreferences()
    return () => {
      isActive = false
    }
  }, [entityType])

  useEffect(() => {
    if (!prefsReady) return
    let timeout: NodeJS.Timeout | null = null

    async function savePreferences() {
      const supabase = createClient()
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData.user?.id
      if (!userId) return

      await supabase.from('user_table_preferences').upsert(
        {
          user_id: userId,
          entity_type: entityType,
          column_order: columnOrder,
          column_widths: columnWidths,
          visible_columns: Array.from(visibleColumns),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,entity_type' }
      )
    }

    timeout = setTimeout(() => {
      savePreferences()
    }, 600)

    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [columnOrder, columnWidths, visibleColumns, entityType])

  useEffect(() => {
    setColumnWidths((prev) => {
      const next = { ...prev }
      columns.forEach((column) => {
        if (next[column.id] !== undefined) return
        if (column.width) {
          const numeric = Number.parseInt(column.width, 10)
          if (!Number.isNaN(numeric)) {
            next[column.id] = numeric
          }
        }
      })
      return next
    })
  }, [columns])

  const orderedColumns = useMemo(() => {
    const map = new Map(columns.map((column) => [column.id, column]))
    const ordered = columnOrder
      .map((id) => map.get(id))
      .filter(Boolean) as TableColumn[]
    const remaining = columns.filter((column) => !columnOrder.includes(column.id))
    return [...ordered, ...remaining]
  }, [columns, columnOrder])

  const displayColumns = useMemo(
    () => orderedColumns.filter((column) => visibleColumns.has(column.id)),
    [orderedColumns, visibleColumns]
  )

  const filterableColumns = useMemo(() => {
    return columns.filter((column) => {
      const values = new Set(
        data
          .map((row) => row[column.id])
          .filter((value) => value !== null && value !== undefined)
          .map((value) => String(value))
      )
      return values.size > 0 && values.size <= 12
    })
  }, [columns, data])

  const filterOptions = useMemo(() => {
    const options: Record<string, string[]> = {}
    filterableColumns.forEach((column) => {
      const values = Array.from(
        new Set(
          data
            .map((row) => row[column.id])
            .filter((value) => value !== null && value !== undefined)
            .map((value) => String(value))
        )
      ).sort()
      options[column.id] = values
    })
    return options
  }, [data, filterableColumns])

  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return data.filter((row) => {
      const matchesQuery = query
        ? displayColumns.some((column) =>
            String(row[column.id] ?? '')
              .toLowerCase()
              .includes(query)
          )
        : true

      if (!matchesQuery) return false

      return Object.entries(activeFilters).every(([columnId, values]) => {
        if (!values.size) return true
        return values.has(String(row[columnId] ?? ''))
      })
    })
  }, [activeFilters, data, displayColumns, searchQuery])

  const sortedData = useMemo(() => {
    if (!sort) return filteredData

    const sorted = [...filteredData]
    sorted.sort((a, b) => {
      const aValue = a[sort.id]
      const bValue = b[sort.id]

      if (aValue === bValue) return 0
      if (aValue === undefined || aValue === null) return 1
      if (bValue === undefined || bValue === null) return -1

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sort.direction === 'asc' ? aValue - bValue : bValue - aValue
      }

      const aDate = Date.parse(aValue)
      const bDate = Date.parse(bValue)
      if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
        return sort.direction === 'asc' ? aDate - bDate : bDate - aDate
      }

      const aText = String(aValue).toLowerCase()
      const bText = String(bValue).toLowerCase()
      if (aText < bText) return sort.direction === 'asc' ? -1 : 1
      if (aText > bText) return sort.direction === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [filteredData, sort])

  const groupedData = useMemo(() => {
    if (!groupById) {
      return { All: sortedData }
    }

    return sortedData.reduce((acc, item) => {
      const groupKey = item[groupById] || 'Ungrouped'
      if (!acc[groupKey]) {
        acc[groupKey] = []
      }
      acc[groupKey].push(item)
      return acc
    }, {} as Record<string, any[]>)
  }, [groupById, sortedData])

  const groupKeys = useMemo(() => Object.keys(groupedData), [groupedData])
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    setExpandedGroups(new Set(groupKeys))
  }, [groupKeys])

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey)
    } else {
      newExpanded.add(groupKey)
    }
    setExpandedGroups(newExpanded)
  }

  const toggleColumn = (columnId: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      return next
    })
  }

  const handleDragStart = (columnId: string) => {
    setDraggedColumnId(columnId)
  }

  const handleDrop = (targetId: string) => {
    if (!draggedColumnId || draggedColumnId === targetId) return
    setColumnOrder((prev) => {
      const next = [...prev]
      const fromIndex = next.indexOf(draggedColumnId)
      const toIndex = next.indexOf(targetId)
      if (fromIndex === -1 || toIndex === -1) return prev
      next.splice(fromIndex, 1)
      next.splice(toIndex, 0, draggedColumnId)
      return next
    })
    setDraggedColumnId(null)
  }

  const handleResizeStart = (columnId: string, event: React.MouseEvent) => {
    event.preventDefault()
    const currentWidth =
      columnWidths[columnId] ??
      (event.currentTarget.parentElement as HTMLElement | null)?.offsetWidth ??
      120
    resizeRef.current = {
      id: columnId,
      startX: event.clientX,
      startWidth: currentWidth,
    }
    const handleMove = (moveEvent: MouseEvent) => {
      if (!resizeRef.current) return
      const delta = moveEvent.clientX - resizeRef.current.startX
      const nextWidth = Math.max(80, resizeRef.current.startWidth + delta)
      setColumnWidths((prev) => ({ ...prev, [resizeRef.current!.id]: nextWidth }))
    }
    const handleUp = () => {
      resizeRef.current = null
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  const clearFilters = () => {
    setActiveFilters({})
  }

  const toggleFilterValue = (columnId: string, value: string) => {
    setActiveFilters((prev) => {
      const next = { ...prev }
      const set = new Set(next[columnId] ?? [])
      if (set.has(value)) {
        set.delete(value)
      } else {
        set.add(value)
      }
      next[columnId] = set
      return next
    })
  }

  const toggleFilterExpand = (columnId: string) => {
    setExpandedFilterColumns((prev) => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      return next
    })
  }

  const startEditing = (row: any, column: TableColumn) => {
    if (!onCellUpdate || !column.editable || column.editor === 'checkbox') return
    const rawValue = row[column.id]
    const formatted = column.formatValue
      ? column.formatValue(rawValue, row)
      : Array.isArray(rawValue)
        ? rawValue.join(', ')
        : rawValue ?? ''
    setDraftValue(String(formatted ?? ''))
    setEditingCell({ rowId: row.id, columnId: column.id })
  }

  const cancelEditing = () => {
    setEditingCell(null)
    setDraftValue('')
  }

  const commitEditing = async () => {
    if (!editingCell || !onCellUpdate) return
    const row = data.find((item) => item.id === editingCell.rowId)
    const column = columns.find((col) => col.id === editingCell.columnId)
    if (!row || !column) {
      cancelEditing()
      return
    }

    let nextValue: any = draftValue
    if (column.parseValue) {
      nextValue = column.parseValue(draftValue, row)
    } else if (column.type === 'number') {
      const parsed = Number(draftValue)
      nextValue = Number.isNaN(parsed) ? null : parsed
    }

    try {
      await onCellUpdate(row, column, nextValue)
      cancelEditing()
    } catch (error) {
      console.error('Failed to update cell:', error)
    }
  }

  const filterCount = Object.values(activeFilters).reduce(
    (total, set) => total + set.size,
    0
  )

  const densityClasses =
    density === 0
      ? { header: 'px-1.5 py-1 text-[10px]', cell: 'px-1.5 py-1 text-xs' }
      : density === 2
        ? { header: 'px-2.5 py-2.5 text-[11px]', cell: 'px-2.5 py-2.5 text-sm' }
        : { header: 'px-2 py-1.5 text-[10px]', cell: 'px-2 py-1.5 text-xs' }

  const renderCell = (column: TableColumn, value: any, row: any) => {
    if (column.editable && column.editor === 'checkbox' && onCellUpdate) {
      return (
        <label
          className="flex items-center gap-2"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={async (event) => {
              event.stopPropagation()
              try {
                await onCellUpdate(row, column, event.target.checked)
              } catch (error) {
                console.error('Failed to update cell:', error)
              }
            }}
            className="h-4 w-4 rounded border border-zinc-700 bg-zinc-900"
          />
          <span className="text-xs text-zinc-100">{value ? 'Yes' : 'No'}</span>
        </label>
      )
    }

    switch (column.type) {
      case 'thumbnail':
        return (
          <div className="flex items-center justify-center">
            {value ? (
              <img
                src={value}
                alt=""
                className="h-10 w-10 rounded object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded bg-zinc-800 text-xs text-zinc-500">
                Upload
              </div>
            )}
          </div>
        )
      case 'link':
        if (column.linkHref) {
          const href = column.linkHref(row)
          return (
            <Link
              href={href}
              className="text-amber-400 transition hover:text-amber-300"
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              {value}
            </Link>
          )
        }
        return (
          <a
            href="#"
            className="text-amber-400 transition hover:text-amber-300"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            {value}
          </a>
        )
      case 'status':
        return (
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                value === 'Active' ? 'bg-green-500' : 'bg-zinc-500'
              }`}
            />
            <span>{value}</span>
          </div>
        )
      case 'pipeline':
        return (
          <div className="flex gap-1">
            {(value || []).map((status: any, i: number) => (
              <div
                key={i}
                className="h-6 w-4 cursor-pointer rounded transition hover:opacity-80"
                style={{ backgroundColor: status.color || '#6b7280' }}
                title={status.step}
              />
            ))}
          </div>
        )
      default: {
        if (value === null || value === undefined || value === '') {
          return <span className="text-zinc-500">-</span>
        }

        const isDateField = /date|_at$/i.test(column.id)
        if (isDateField) {
          const parsed = new Date(value)
          if (!Number.isNaN(parsed.getTime())) {
            return (
              <span className="text-zinc-100" title={parsed.toLocaleString()}>
                {parsed.toLocaleString()}
              </span>
            )
          }
        }

        if (Array.isArray(value)) {
          const display = value.join(', ')
          return (
            <span className="max-w-[240px] truncate text-zinc-100" title={display}>
              {display || '-'}
            </span>
          )
        }

        if (typeof value === 'boolean') {
          return <span className="text-zinc-100">{value ? 'Yes' : 'No'}</span>
        }

        if (typeof value === 'object') {
          const display = JSON.stringify(value)
          return (
            <span className="max-w-[240px] truncate text-zinc-100" title={display}>
              {display}
            </span>
          )
        }

        const display = String(value)
        return (
          <span className="max-w-[240px] truncate text-zinc-100" title={display}>
            {display}
          </span>
        )
      }
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {showToolbar && (
        <TableToolbar
          entityType={entityType}
          columns={columns}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleColumn}
          onAdd={onAdd}
          onViewChange={setView}
          sort={sort}
          onSortChange={setSort}
          groupBy={groupById}
          onGroupByChange={setGroupById}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterCount={filterCount}
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen((prev) => !prev)}
          onCloseFilters={() => setFiltersOpen(false)}
          filtersPanel={
            showFiltersPanel && filterableColumns.length > 0 ? (
              <div className="absolute left-0 top-full z-30 mt-2 hidden w-72 lg:block">
                <div className="rounded-md border border-zinc-800 bg-zinc-950/95 p-3 text-sm text-zinc-200 shadow-lg">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
                    <span>Filters</span>
                    <button
                      onClick={clearFilters}
                      className="text-[10px] uppercase tracking-[0.2em] text-amber-400 hover:text-amber-300"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="mt-3 space-y-4">
                    {filterableColumns.map((column) => (
                      <div key={column.id}>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                          {column.label}
                        </p>
                        <div className="mt-2 space-y-2">
                          {(filterOptions[column.id] ?? [])
                            .slice(
                              0,
                              expandedFilterColumns.has(column.id) ? undefined : 5
                            )
                            .map((value) => (
                              <label
                                key={value}
                                className="flex items-center gap-2 text-xs text-zinc-300"
                              >
                                <input
                                  type="checkbox"
                                  checked={activeFilters[column.id]?.has(value) ?? false}
                                  onChange={() => toggleFilterValue(column.id, value)}
                                  className="h-3 w-3 rounded border border-zinc-700 bg-zinc-900"
                                />
                                <span>{value}</span>
                              </label>
                            ))}
                          {(filterOptions[column.id]?.length ?? 0) > 5 && (
                            <button
                              type="button"
                              onClick={() => toggleFilterExpand(column.id)}
                              className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-200"
                            >
                              {expandedFilterColumns.has(column.id)
                                ? 'Show less'
                                : 'Show more'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null
          }
        />
      )}

      <div className="flex flex-1">
        <div className="relative flex-1">
          <div className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/70 shadow-sm">
            <div className="overflow-x-auto">
              {view === 'grid' ? (
                <div
                  className={`grid gap-4 p-3 ${
                    entityType === 'projects'
                      ? 'bg-zinc-950 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
                      : 'sm:grid-cols-2 xl:grid-cols-3'
                  }`}
                >
                  {sortedData.map((row, index) => {
                    if (entityType === 'projects') {
                      const thumb = row.thumbnail_url
                      const name = row.name || 'Untitled'
                      return (
                        <button
                          key={row.id || index}
                          className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 text-left shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition hover:border-zinc-700"
                          onClick={() => onRowClick?.(row)}
                        >
                          <div className="flex aspect-square w-full items-center justify-center bg-zinc-900 text-xs text-zinc-500">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-zinc-400 underline">Upload Thumbnail</span>
                            )}
                          </div>
                          <div className="border-t border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-300">
                            <span className="underline">{name}</span>
                          </div>
                        </button>
                      )
                    }

                    return (
                      <button
                        key={row.id || index}
                        className="flex flex-col gap-2 rounded-md border border-zinc-800 bg-zinc-950/60 p-3 text-left transition hover:border-zinc-700 hover:bg-zinc-900"
                        onClick={() => onRowClick?.(row)}
                      >
                        {displayColumns.slice(0, 3).map((column) => (
                          <div key={column.id}>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                              {column.label}
                            </p>
                            <div className="mt-1 text-sm text-zinc-100">
                              {renderCell(column, row[column.id], row)}
                            </div>
                          </div>
                        ))}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <table className="w-max table-auto">
                  <thead className="border-b border-zinc-800 bg-zinc-950">
                    <tr>
                      {groupById && <th className="w-8" />}
                      {displayColumns.map((column) => (
                        <th
                          key={column.id}
                          draggable
                          onDragStart={() => handleDragStart(column.id)}
                          onDragEnd={() => setDraggedColumnId(null)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => handleDrop(column.id)}
                          className={`${densityClasses.header} cursor-grab select-none text-left font-semibold uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-200`}
                          style={{
                            width: columnWidths[column.id] ?? column.width,
                            minWidth: 80,
                          }}
                        >
                          <div className="relative flex items-center justify-between gap-2">
                            <span>{column.label}</span>
                            <span
                              role="separator"
                              onMouseDown={(event) => handleResizeStart(column.id, event)}
                              className="absolute -right-2 top-0 h-full w-3 cursor-col-resize"
                            />
                          </div>
                        </th>
                      ))}
                      {showActions && (
                        <th
                          className={`${densityClasses.header} w-12 text-center font-semibold uppercase tracking-[0.2em] text-zinc-400`}
                        >
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {groupKeys.map((groupKey) => {
                      const isExpanded = !groupById || expandedGroups.has(groupKey)

                      return (
                        <React.Fragment key={groupKey}>
                          {groupById && (
                            <tr className="border-b border-zinc-800 bg-zinc-950">
                              <td
                                colSpan={displayColumns.length + 1 + (showActions ? 1 : 0)}
                                className="px-2.5 py-2 text-sm cursor-pointer hover:bg-zinc-900"
                                onClick={() => toggleGroup(groupKey)}
                              >
                                <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                  {groupKey} ({groupedData[groupKey].length})
                                </div>
                              </td>
                            </tr>
                          )}
                          {isExpanded &&
                            groupedData[groupKey].map((row, rowIndex) => (
                              <tr
                                key={row.id || rowIndex}
                                className="cursor-pointer border-b border-zinc-800 transition hover:bg-zinc-900"
                                onClick={() => onRowClick?.(row)}
                              >
                                {groupById && <td className="w-8" />}
                                {displayColumns.map((column) => (
                                  <td
                                    key={column.id}
                                    className={`${densityClasses.cell}`}
                                    style={{
                                      width: columnWidths[column.id] ?? column.width,
                                      minWidth: 80,
                                    }}
                                    onDoubleClick={(event) => {
                                      event.stopPropagation()
                                      startEditing(row, column)
                                    }}
                                  >
                                    {editingCell?.rowId === row.id &&
                                    editingCell.columnId === column.id &&
                                    column.editable &&
                                    onCellUpdate &&
                                    column.editor !== 'checkbox' ? (
                                      column.editor === 'textarea' ? (
                                        <textarea
                                          value={draftValue}
                                          onChange={(event) =>
                                            setDraftValue(event.target.value)
                                          }
                                          onBlur={commitEditing}
                                          onKeyDown={(event) => {
                                            if (event.key === 'Escape') {
                                              event.stopPropagation()
                                              cancelEditing()
                                            }
                                          }}
                                          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
                                          rows={3}
                                          autoFocus
                                        />
                                      ) : column.editor === 'select' ? (
                                        <select
                                          value={draftValue}
                                          onChange={async (event) => {
                                            setDraftValue(event.target.value)
                                            await onCellUpdate(
                                              row,
                                              column,
                                              column.parseValue
                                                ? column.parseValue(event.target.value, row)
                                                : event.target.value
                                            )
                                            cancelEditing()
                                          }}
                                          onBlur={cancelEditing}
                                          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
                                          autoFocus
                                        >
                                          {(column.options ?? []).map((option) => (
                                            <option key={option.value} value={option.value}>
                                              {option.label}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <input
                                          type="text"
                                          value={draftValue}
                                          onChange={(event) =>
                                            setDraftValue(event.target.value)
                                          }
                                          onBlur={commitEditing}
                                          onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                              event.preventDefault()
                                              commitEditing()
                                            }
                                            if (event.key === 'Escape') {
                                              event.stopPropagation()
                                              cancelEditing()
                                            }
                                          }}
                                          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
                                          autoFocus
                                        />
                                      )
                                    ) : (
                                      renderCell(column, row[column.id], row)
                                    )}
                                  </td>
                                ))}
                                {showActions && (
                                  <td className={`${densityClasses.cell} w-12 text-center`}>
                                    <TableRowActions
                                      onEdit={onEdit ? () => onEdit(row) : undefined}
                                      onDelete={onDelete ? () => onDelete(row) : undefined}
                                    />
                                  </td>
                                )}
                              </tr>
                            ))}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="border-t border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400" />
          </div>
        </div>

        {null}
      </div>
    </div>
  )
}
