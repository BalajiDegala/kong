'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  getTrashedEntities,
  restoreEntities,
  permanentlyDeleteEntities,
  type TrashedEntity,
} from '@/actions/skull-island'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Skull,
  RotateCcw,
  Trash2,
  Search,
  Filter,
  AlertTriangle,
  Box,
  Film,
  Clapperboard,
  ListTodo,
  FileVideo,
  MessageSquare,
  ListMusic,
  FolderKanban,
  Loader2,
  ChevronDown,
} from 'lucide-react'

const ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'project', label: 'Projects', icon: FolderKanban },
  { value: 'asset', label: 'Assets', icon: Box },
  { value: 'sequence', label: 'Sequences', icon: Film },
  { value: 'shot', label: 'Shots', icon: Clapperboard },
  { value: 'task', label: 'Tasks', icon: ListTodo },
  { value: 'version', label: 'Versions', icon: FileVideo },
  { value: 'note', label: 'Notes', icon: MessageSquare },
  { value: 'playlist', label: 'Playlists', icon: ListMusic },
] as const

function getEntityIcon(entityType: string) {
  const option = ENTITY_TYPE_OPTIONS.find((o) => o.value === entityType)
  return option && 'icon' in option ? option.icon : Box
}

function getEntityLabel(entityType: string) {
  const option = ENTITY_TYPE_OPTIONS.find((o) => o.value === entityType)
  return option ? option.label.replace(/s$/, '') : entityType
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`
  return date.toLocaleDateString()
}

export default function SkullIslandPage() {
  const [entities, setEntities] = useState<TrashedEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterType, setFilterType] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isActioning, setIsActioning] = useState(false)
  const [actionError, setActionError] = useState('')

  const loadEntities = useCallback(async () => {
    setIsLoading(true)
    setError('')
    const result = await getTrashedEntities({
      entityType: filterType || undefined,
      search: searchQuery || undefined,
      limit: 100,
    })
    if (result.error) {
      setError(result.error)
    }
    setEntities(result.data)
    setIsLoading(false)
  }, [filterType, searchQuery])

  useEffect(() => {
    loadEntities()
  }, [loadEntities])

  const selectedEntities = entities.filter((e) =>
    selectedIds.has(`${e.entity_type}:${e.id}`)
  )

  function toggleSelect(entity: TrashedEntity) {
    const key = `${entity.entity_type}:${entity.id}`
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === entities.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(entities.map((e) => `${e.entity_type}:${e.id}`)))
    }
  }

  async function handleRestore() {
    setIsActioning(true)
    setActionError('')
    const items = selectedEntities.map((e) => ({
      entityType: e.entity_type,
      entityId: String(e.id),
    }))
    const result = await restoreEntities(items)
    const failed = result.results.filter((r) => !r.success)
    if (failed.length > 0) {
      setActionError(`Failed to restore ${failed.length} item(s): ${failed[0].error}`)
    }
    setIsActioning(false)
    setShowRestoreDialog(false)
    setSelectedIds(new Set())
    loadEntities()
  }

  async function handlePermanentDelete() {
    setIsActioning(true)
    setActionError('')
    const items = selectedEntities.map((e) => ({
      entityType: e.entity_type,
      entityId: String(e.id),
    }))
    const result = await permanentlyDeleteEntities(items)
    const failed = result.results.filter((r) => !r.success)
    if (failed.length > 0) {
      setActionError(`Failed to delete ${failed.length} item(s): ${failed[0].error}`)
    }
    setIsActioning(false)
    setShowDeleteDialog(false)
    setDeleteConfirmText('')
    setSelectedIds(new Set())
    loadEntities()
  }

  return (
    <>
      {/* Restore Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-500/10 p-2">
                <RotateCcw className="h-5 w-5 text-green-500" />
              </div>
              <DialogTitle>Restore {selectedEntities.length} item(s)?</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              These items will be restored to their original locations.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[200px] overflow-y-auto py-2">
            {selectedEntities.map((e) => (
              <div
                key={`${e.entity_type}:${e.id}`}
                className="flex items-center gap-2 rounded px-3 py-1.5 text-sm"
              >
                <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-medium capitalize text-muted-foreground">
                  {e.entity_type}
                </span>
                <span className="text-foreground">{e.name || e.code || e.id}</span>
                {e.project_name && (
                  <span className="text-muted-foreground">in {e.project_name}</span>
                )}
              </div>
            ))}
          </div>
          {actionError && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
              {actionError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)} disabled={isActioning}>
              Cancel
            </Button>
            <Button onClick={handleRestore} disabled={isActioning} className="bg-green-600 hover:bg-green-700">
              {isActioning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                'Restore'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open)
        if (!open) setDeleteConfirmText('')
      }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-500/10 p-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <DialogTitle>Permanently delete {selectedEntities.length} item(s)?</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              This action <strong>CANNOT</strong> be undone. All data will be destroyed forever.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[200px] overflow-y-auto py-2">
            {selectedEntities.map((e) => (
              <div
                key={`${e.entity_type}:${e.id}`}
                className="flex items-center gap-2 rounded px-3 py-1.5 text-sm"
              >
                <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-xs font-medium capitalize text-red-400">
                  {e.entity_type}
                </span>
                <span className="text-foreground">{e.name || e.code || e.id}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm:
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full rounded-md border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-red-500/50 focus:outline-none"
            />
          </div>
          {actionError && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
              {actionError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isActioning}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={isActioning || deleteConfirmText !== 'DELETE'}
            >
              {isActioning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Forever'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Page */}
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-border bg-background px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skull className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Skull Island</h2>
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
                {entities.length} trashed
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 border-green-600/30 text-green-500 hover:bg-green-600/10 hover:text-green-400"
                    onClick={() => setShowRestoreDialog(true)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore ({selectedIds.size})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 border-red-600/30 text-red-500 hover:bg-red-600/10 hover:text-red-400"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Forever ({selectedIds.size})
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 border-b border-border bg-background px-6 py-2">
          <div className="relative">
            <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value)
                setSelectedIds(new Set())
              }}
              className="appearance-none rounded-md border border-border bg-accent py-1.5 pl-8 pr-8 text-sm text-foreground focus:border-primary/50 focus:outline-none"
            >
              {ENTITY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search trashed items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-border bg-accent py-1.5 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="rounded-md border border-red-900/60 bg-red-950/20 p-4">
                <p className="text-sm font-medium text-red-300">Failed to load trashed items</p>
                <p className="mt-1 text-xs text-red-200/80">{error}</p>
              </div>
            </div>
          ) : entities.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Skull className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
                <h3 className="mb-2 text-lg font-semibold text-foreground">Nothing on Skull Island</h3>
                <p className="text-sm text-muted-foreground">
                  Deleted items will appear here for recovery.
                </p>
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="w-10 px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === entities.length && entities.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-border"
                    />
                  </th>
                  <th className="w-28 px-3 py-2">Type</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="w-44 px-3 py-2">Project</th>
                  <th className="w-36 px-3 py-2">Deleted</th>
                  <th className="w-36 px-3 py-2">Deleted By</th>
                  <th className="w-24 px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entities.map((entity) => {
                  const key = `${entity.entity_type}:${entity.id}`
                  const isSelected = selectedIds.has(key)
                  const Icon = getEntityIcon(entity.entity_type)

                  return (
                    <tr
                      key={key}
                      className={`border-b border-border transition hover:bg-accent/50 ${
                        isSelected ? 'bg-accent/30' : ''
                      }`}
                    >
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(entity)}
                          className="rounded border-border"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium capitalize text-muted-foreground">
                            {getEntityLabel(entity.entity_type)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-sm font-medium text-foreground">
                          {entity.name || entity.code || `#${entity.id}`}
                        </span>
                        {entity.code && entity.name && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({entity.code})
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-sm text-muted-foreground">
                          {entity.entity_type === 'project' ? '---' : entity.project_name || '---'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-muted-foreground" title={entity.deleted_at}>
                          {timeAgo(entity.deleted_at)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-muted-foreground">
                          {entity.deleted_by_name || '---'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={async () => {
                              setSelectedIds(new Set([key]))
                              setShowRestoreDialog(true)
                            }}
                            className="rounded p-1 text-muted-foreground transition hover:bg-green-600/10 hover:text-green-500"
                            title="Restore"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedIds(new Set([key]))
                              setShowDeleteDialog(true)
                            }}
                            className="rounded p-1 text-muted-foreground transition hover:bg-red-600/10 hover:text-red-500"
                            title="Delete forever"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
