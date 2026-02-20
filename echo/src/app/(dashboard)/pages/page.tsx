'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Star, Trash2 } from 'lucide-react'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import {
  createCustomPage,
  deleteCustomPage,
  listCustomPages,
  listMyCustomPageFavorites,
  setCustomPageFavorite,
  type CustomPageRow,
  type CustomPageScopeType,
  type CustomPageVisibility,
} from '@/actions/custom-pages'

const ENTITY_OPTIONS = [
  { value: 'tasks', label: 'Tasks' },
  { value: 'published_files', label: 'Published Files' },
  { value: 'versions', label: 'Versions' },
  { value: 'assets', label: 'Assets' },
  { value: 'shots', label: 'Shots' },
  { value: 'sequences', label: 'Sequences' },
  { value: 'notes', label: 'Notes' },
  { value: 'playlists', label: 'Playlists' },
]

const SCOPE_OPTIONS: Array<{ value: CustomPageScopeType; label: string }> = [
  { value: 'global', label: 'Global' },
  { value: 'project', label: 'Project' },
  { value: 'multi_project', label: 'Multi Project' },
]

const VISIBILITY_OPTIONS: Array<{ value: CustomPageVisibility; label: string }> = [
  { value: 'private', label: 'Private (Me only)' },
  { value: 'shared_project', label: 'Shared (Project)' },
  { value: 'shared_global', label: 'Shared (Global)' },
]

const FILTER_OPERATOR_OPTIONS = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not Equals' },
  { value: 'ilike', label: 'Contains' },
  { value: 'in', label: 'In List (comma separated)' },
]

const FILTER_COLUMN_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  tasks: [
    { value: 'status', label: 'Status' },
    { value: 'assigned_to', label: 'Assigned To' },
    { value: 'department', label: 'Department' },
    { value: 'step_name', label: 'Step' },
    { value: 'entity_type', label: 'Entity Type' },
    { value: 'project_id', label: 'Project ID' },
    { value: 'due_date', label: 'Due Date' },
    { value: 'start_date', label: 'Start Date' },
  ],
  published_files: [
    { value: 'status', label: 'Status' },
    { value: 'file_type', label: 'File Type' },
    { value: 'entity_type', label: 'Entity Type' },
    { value: 'project_id', label: 'Project ID' },
    { value: 'published_by', label: 'Published By' },
    { value: 'created_at', label: 'Created At' },
  ],
  versions: [
    { value: 'status', label: 'Status' },
    { value: 'entity_type', label: 'Entity Type' },
    { value: 'project_id', label: 'Project ID' },
    { value: 'version_number', label: 'Version Number' },
    { value: 'created_by', label: 'Created By' },
    { value: 'created_at', label: 'Created At' },
  ],
  assets: [
    { value: 'status', label: 'Status' },
    { value: 'asset_type', label: 'Asset Type' },
    { value: 'project_id', label: 'Project ID' },
  ],
  shots: [
    { value: 'status', label: 'Status' },
    { value: 'sequence_id', label: 'Sequence ID' },
    { value: 'project_id', label: 'Project ID' },
  ],
  sequences: [
    { value: 'status', label: 'Status' },
    { value: 'project_id', label: 'Project ID' },
  ],
  notes: [
    { value: 'status', label: 'Status' },
    { value: 'entity_type', label: 'Entity Type' },
    { value: 'project_id', label: 'Project ID' },
  ],
  playlists: [
    { value: 'status', label: 'Status' },
    { value: 'project_id', label: 'Project ID' },
  ],
}

const PAGE_PRESET_OPTIONS = [
  {
    value: 'custom',
    label: 'Custom (Blank)',
    description: 'Start from scratch.',
  },
  {
    value: 'show_level_tasks',
    label: 'Show Level Tasks',
    description: 'Task tracker scoped to one show/project.',
  },
  {
    value: 'department_tasks',
    label: 'Department Tracker',
    description: 'Tasks filtered by department (e.g. anim, comp, lighting).',
  },
  {
    value: 'global_artist_tracker',
    label: 'Global Artist Tracker',
    description: 'Tasks grouped by assigned artist across shows.',
  },
  {
    value: 'delivery_tracker',
    label: 'Delivery Tracker',
    description: 'Versions-focused delivery view by show.',
  },
  {
    value: 'published_across_shows',
    label: 'Published Across Shows',
    description: 'Published files across multiple shows/projects.',
  },
]

function parseProjectIds(value: string): number[] {
  const ids = value
    .split(',')
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isFinite(item) && item > 0)
  return Array.from(new Set(ids))
}

function isLikelyUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function ownerLabel(page: CustomPageRow, currentUserId: string | null): string {
  if (page.owner?.display_name) return page.owner.display_name
  if (page.owner?.full_name) return page.owner.full_name
  if (currentUserId && page.owner_id === currentUserId) return 'You'
  return isLikelyUuid(page.owner_id) ? 'Unknown user' : page.owner_id
}

export default function CustomPagesPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isReloading, setIsReloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [pages, setPages] = useState<CustomPageRow[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(() => new Set())
  const [createOpen, setCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [projectLabelsById, setProjectLabelsById] = useState<Record<number, string>>({})
  const [name, setName] = useState('')
  const [entityType, setEntityType] = useState('tasks')
  const [scopeType, setScopeType] = useState<CustomPageScopeType>('global')
  const [visibility, setVisibility] = useState<CustomPageVisibility>('private')
  const [projectId, setProjectId] = useState('')
  const [projectIdsCsv, setProjectIdsCsv] = useState('')
  const [filterColumn, setFilterColumn] = useState('')
  const [filterOperator, setFilterOperator] = useState('eq')
  const [filterValue, setFilterValue] = useState('')
  const [rowLimit, setRowLimit] = useState('500')
  const [presetId, setPresetId] = useState('custom')

  const myPages = useMemo(
    () => pages.filter((page) => page.owner_id === currentUserId),
    [currentUserId, pages]
  )
  const sharedPages = useMemo(
    () => pages.filter((page) => page.owner_id !== currentUserId),
    [currentUserId, pages]
  )
  const selectedPreset = useMemo(
    () => PAGE_PRESET_OPTIONS.find((preset) => preset.value === presetId) || PAGE_PRESET_OPTIONS[0],
    [presetId]
  )
  const filterColumnOptions = useMemo(
    () => FILTER_COLUMN_OPTIONS[entityType] || [],
    [entityType]
  )

  function handleEntityTypeChange(nextEntityType: string) {
    setEntityType(nextEntityType)
    const nextFilterOptions = FILTER_COLUMN_OPTIONS[nextEntityType] || []
    if (!filterColumn) return
    if (nextFilterOptions.some((option) => option.value === filterColumn)) return
    setFilterColumn('')
  }

  const loadPages = useCallback(async () => {
    setError(null)
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      setCurrentUserId(null)
      setPages([])
      setFavoriteIds(new Set())
      setError('Not authenticated')
      return
    }

    setCurrentUserId(user.id)

    const [pagesResult, favoritesResult, projectsResult] = await Promise.all([
      listCustomPages(),
      listMyCustomPageFavorites(),
      supabase.from('projects').select('id, code, name').is('deleted_at', null),
    ])

    if (pagesResult.error) {
      setError(pagesResult.error)
      setPages([])
    } else {
      setPages(pagesResult.data || [])
      if (pagesResult.available === false) {
        setError('custom_pages table not found. Run migration first.')
      }
    }

    if (favoritesResult.error) {
      setError((previous) => previous || favoritesResult.error || null)
      setFavoriteIds(new Set())
    } else {
      const ids = new Set<number>()
      for (const row of favoritesResult.data || []) {
        if (row.custom_page_id > 0) ids.add(row.custom_page_id)
      }
      setFavoriteIds(ids)
      if (favoritesResult.available === false) {
        setError((previous) => previous || 'custom_page_favorites table not found. Run migration first.')
      }
    }

    if (projectsResult.error) {
      console.error('Failed to load projects for custom page labels:', projectsResult.error)
      setProjectLabelsById({})
    } else {
      const nextMap: Record<number, string> = {}
      for (const project of projectsResult.data || []) {
        const projectId = Number(project.id)
        if (!Number.isFinite(projectId) || projectId <= 0) continue
        const code = String(project.code || '').trim()
        const name = String(project.name || '').trim()
        nextMap[projectId] = code || name || `Project ${projectId}`
      }
      setProjectLabelsById(nextMap)
    }
  }, [])

  useEffect(() => {
    let active = true

    async function run() {
      setIsLoading(true)
      await loadPages()
      if (active) setIsLoading(false)
    }

    void run()
    return () => {
      active = false
    }
  }, [loadPages])

  async function reload() {
    setIsReloading(true)
    await loadPages()
    setIsReloading(false)
  }

  function resetCreateForm() {
    setPresetId('custom')
    setName('')
    setEntityType('tasks')
    setScopeType('global')
    setVisibility('private')
    setProjectId('')
    setProjectIdsCsv('')
    setFilterColumn('')
    setFilterOperator('eq')
    setFilterValue('')
    setRowLimit('500')
  }

  function applyPreset(nextPresetId: string) {
    setPresetId(nextPresetId)

    if (nextPresetId === 'show_level_tasks') {
      setName('Show Level Tasks')
      setEntityType('tasks')
      setScopeType('project')
      setVisibility('private')
      setProjectIdsCsv('')
      setFilterColumn('')
      setFilterOperator('eq')
      setFilterValue('')
      setRowLimit('1000')
      return
    }

    if (nextPresetId === 'department_tasks') {
      setName('Department Tracker')
      setEntityType('tasks')
      setScopeType('project')
      setVisibility('private')
      setProjectIdsCsv('')
      setFilterColumn('department')
      setFilterOperator('eq')
      setFilterValue('anim')
      setRowLimit('1000')
      return
    }

    if (nextPresetId === 'global_artist_tracker') {
      setName('Global Artist Tracker')
      setEntityType('tasks')
      setScopeType('global')
      setVisibility('private')
      setProjectId('')
      setProjectIdsCsv('')
      setFilterColumn('')
      setFilterOperator('eq')
      setFilterValue('')
      setRowLimit('1500')
      return
    }

    if (nextPresetId === 'delivery_tracker') {
      setName('Delivery Tracker')
      setEntityType('versions')
      setScopeType('project')
      setVisibility('private')
      setProjectIdsCsv('')
      setFilterColumn('')
      setFilterOperator('eq')
      setFilterValue('')
      setRowLimit('1000')
      return
    }

    if (nextPresetId === 'published_across_shows') {
      setName('Published Across Shows')
      setEntityType('published_files')
      setScopeType('multi_project')
      setVisibility('private')
      setProjectId('')
      setFilterColumn('')
      setFilterOperator('eq')
      setFilterValue('')
      setRowLimit('1500')
      return
    }
  }

  function buildPresetDefaultState(selectedPresetId: string): Record<string, unknown> {
    if (selectedPresetId === 'show_level_tasks') {
      return {
        sort: { id: 'due_date', direction: 'asc' },
        group_by: 'status',
        visible_columns: ['name', 'status', 'assigned_to', 'department', 'due_date', 'start_date'],
        active_filter_columns: ['status', 'assigned_to', 'department'],
      }
    }

    if (selectedPresetId === 'department_tasks') {
      return {
        sort: { id: 'due_date', direction: 'asc' },
        group_by: 'status',
        visible_columns: ['name', 'status', 'assigned_to', 'department', 'due_date', 'project_id'],
        active_filter_columns: ['department', 'status', 'assigned_to'],
      }
    }

    if (selectedPresetId === 'global_artist_tracker') {
      return {
        sort: { id: 'due_date', direction: 'asc' },
        group_by: 'assigned_to',
        visible_columns: ['name', 'assigned_to', 'status', 'department', 'project_id', 'due_date'],
        active_filter_columns: ['status', 'assigned_to', 'department', 'project_id'],
      }
    }

    if (selectedPresetId === 'delivery_tracker') {
      return {
        sort: { id: 'created_at', direction: 'desc' },
        group_by: 'project_id',
        visible_columns: ['code', 'name', 'status', 'project_id', 'entity_type', 'version_number', 'created_at'],
        active_filter_columns: ['status', 'project_id', 'entity_type'],
      }
    }

    if (selectedPresetId === 'published_across_shows') {
      return {
        sort: { id: 'created_at', direction: 'desc' },
        group_by: 'project_id',
        visible_columns: ['code', 'name', 'status', 'project_id', 'entity_type', 'file_type', 'published_by', 'created_at'],
        active_filter_columns: ['status', 'project_id', 'entity_type', 'file_type'],
      }
    }

    return {}
  }

  function parseFilterValue(rawValue: string, operator: string): unknown {
    const trimmed = rawValue.trim()
    if (!trimmed) return null
    if (operator === 'in') {
      return trimmed
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    }
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const numeric = Number(trimmed)
      if (Number.isFinite(numeric)) return numeric
    }
    if (trimmed.toLowerCase() === 'true') return true
    if (trimmed.toLowerCase() === 'false') return false
    return trimmed
  }

  async function handleCreatePage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Page name is required')
      return
    }

    setIsCreating(true)
    setError(null)

    const numericProjectId = Number.parseInt(projectId.trim(), 10)
    const parsedProjectIds = parseProjectIds(projectIdsCsv)
    const normalizedLimit = Math.max(25, Math.min(2000, Number.parseInt(rowLimit.trim(), 10) || 500))
    const normalizedFilterColumn = filterColumn.trim()
    const normalizedFilterValue = parseFilterValue(filterValue, filterOperator)

    const definition: Record<string, unknown> = {
      limit: normalizedLimit,
    }

    if (scopeType === 'project' && Number.isFinite(numericProjectId)) {
      definition.project_id = numericProjectId
    }
    if (scopeType === 'multi_project' && parsedProjectIds.length > 0) {
      definition.project_ids = parsedProjectIds
    }
    if (normalizedFilterColumn && normalizedFilterValue !== null) {
      definition.filters = [
        {
          column: normalizedFilterColumn,
          op: filterOperator,
          value: normalizedFilterValue,
        },
      ]
    }

    if (presetId === 'show_level_tasks' || presetId === 'department_tasks' || presetId === 'global_artist_tracker') {
      definition.order_by = { column: 'due_date', direction: 'asc' }
    }
    if (presetId === 'delivery_tracker' || presetId === 'published_across_shows') {
      definition.order_by = { column: 'created_at', direction: 'desc' }
    }

    const defaultState = buildPresetDefaultState(presetId)
    if (normalizedFilterColumn && Array.isArray(defaultState.active_filter_columns)) {
      const active = new Set(
        (defaultState.active_filter_columns as unknown[]).map((entry) => String(entry))
      )
      active.add(normalizedFilterColumn)
      defaultState.active_filter_columns = Array.from(active)
    }

    const result = await createCustomPage({
      name: name.trim(),
      entity_type: entityType,
      scope_type: scopeType,
      visibility,
      project_id: Number.isFinite(numericProjectId) ? numericProjectId : null,
      project_ids: parsedProjectIds,
      definition,
      default_state: defaultState,
    })

    setIsCreating(false)
    if (result.error) {
      setError(result.error)
      return
    }

    if (result.data) {
      setPages((previous) =>
        [...previous, result.data!].sort((a, b) => a.name.localeCompare(b.name))
      )
    }

    resetCreateForm()
    setCreateOpen(false)
  }

  async function handleDeletePage(page: CustomPageRow) {
    const confirmed = window.confirm(`Delete custom page "${page.name}"?`)
    if (!confirmed) return

    setError(null)
    const result = await deleteCustomPage(page.id)
    if (result.error) {
      setError(result.error)
      return
    }

    setPages((previous) => previous.filter((item) => item.id !== page.id))
    setFavoriteIds((previous) => {
      const next = new Set(previous)
      next.delete(page.id)
      return next
    })
  }

  async function handleToggleFavorite(page: CustomPageRow) {
    const nextFavorite = !favoriteIds.has(page.id)

    setFavoriteIds((previous) => {
      const next = new Set(previous)
      if (nextFavorite) {
        next.add(page.id)
      } else {
        next.delete(page.id)
      }
      return next
    })

    const result = await setCustomPageFavorite(page.id, nextFavorite, 0)
    if (result.error) {
      setError(result.error)
      setFavoriteIds((previous) => {
        const next = new Set(previous)
        if (nextFavorite) {
          next.delete(page.id)
        } else {
          next.add(page.id)
        }
        return next
      })
      return
    }
  }

  function renderPageCard(page: CustomPageRow, isOwner: boolean) {
    const isFavorite = favoriteIds.has(page.id)
    const projectLabelFor = (id: number | null) => {
      if (!id || id <= 0) return '-'
      return projectLabelsById[id] || `Project ${id}`
    }
    const multiProjectPreview =
      page.project_ids.length > 0
        ? page.project_ids.slice(0, 2).map((id) => projectLabelFor(id)).join(', ')
        : '-'
    const scopeLabel =
      page.scope_type === 'multi_project'
        ? `Multi Project (${multiProjectPreview}${page.project_ids.length > 2 ? ` +${page.project_ids.length - 2}` : ''})`
        : page.scope_type === 'project'
          ? projectLabelFor(page.project_id)
          : 'Global'

    return (
      <div
        key={page.id}
        className="rounded-md border border-border bg-card/40 p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{page.name}</p>
            <p className="text-xs text-muted-foreground">
              {page.entity_type} • {scopeLabel} • {page.visibility}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Owner: {ownerLabel(page, currentUserId)}
            </p>
            <Link
              href={`/pages/${page.id}`}
              className="mt-2 inline-flex text-xs text-primary/90 transition hover:text-primary"
            >
              Open Page
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void handleToggleFavorite(page)}
              className={`rounded-sm border px-2 py-1 text-xs transition ${
                isFavorite
                  ? 'border-primary/70 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
              title={isFavorite ? 'Remove favorite' : 'Favorite page'}
            >
              <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            {isOwner ? (
              <button
                type="button"
                onClick={() => void handleDeletePage(page)}
                className="rounded-sm border border-border px-2 py-1 text-xs text-muted-foreground transition hover:text-red-300"
                title="Delete page"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <ApexPageShell
        title="All Pages"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void reload()}
              className="rounded-md border border-border px-3 py-2 text-sm text-foreground/80 transition hover:text-foreground"
              disabled={isReloading}
            >
              {isReloading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-black transition hover:bg-primary"
            >
              <Plus className="h-4 w-4" />
              Create Page
            </button>
          </div>
        }
      >
        {error ? (
          <div className="mb-4 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-300">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading custom pages...
          </div>
        ) : (
          <div className="grid gap-6">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  My Pages
                </h3>
                <span className="text-xs text-muted-foreground">{myPages.length}</span>
              </div>
              {myPages.length === 0 ? (
                <div className="rounded-md border border-border bg-card/20 p-4 text-sm text-muted-foreground">
                  No custom pages yet. Create your first page to save your own tracker layout.
                </div>
              ) : (
                <div className="grid gap-3">{myPages.map((page) => renderPageCard(page, true))}</div>
              )}
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Shared Pages
                </h3>
                <span className="text-xs text-muted-foreground">{sharedPages.length}</span>
              </div>
              {sharedPages.length === 0 ? (
                <div className="rounded-md border border-border bg-card/20 p-4 text-sm text-muted-foreground">
                  No shared pages are visible to you yet.
                </div>
              ) : (
                <div className="grid gap-3">{sharedPages.map((page) => renderPageCard(page, false))}</div>
              )}
            </section>
          </div>
        )}
      </ApexPageShell>

      <Dialog
        open={createOpen}
        onOpenChange={(nextOpen) => {
          setCreateOpen(nextOpen)
          if (!nextOpen) resetCreateForm()
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="w-full max-w-xl border-border bg-background p-0 text-foreground"
        >
          <div className="border-b border-border px-6 py-4">
            <DialogTitle className="text-2xl font-semibold text-foreground">
              Create Custom Page
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Save a reusable view with your own filters, sorting, grouping, and fields.
            </DialogDescription>
          </div>

          <form onSubmit={handleCreatePage} className="space-y-4 px-6 py-4">
            <label className="block text-sm">
              <span className="mb-1.5 block text-foreground/80">Preset</span>
              <select
                value={presetId}
                onChange={(event) => applyPreset(event.target.value)}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {PAGE_PRESET_OPTIONS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">{selectedPreset.description}</p>
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block text-foreground/80">Page Name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Global Artist Tracker"
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block text-foreground/80">Entity</span>
                <select
                  value={entityType}
                  onChange={(event) => handleEntityTypeChange(event.target.value)}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {ENTITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1.5 block text-foreground/80">Scope</span>
                <select
                  value={scopeType}
                  onChange={(event) => setScopeType(event.target.value as CustomPageScopeType)}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {SCOPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1.5 block text-foreground/80">Visibility</span>
              <select
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as CustomPageVisibility)}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {VISIBILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {scopeType === 'project' ? (
              <label className="block text-sm">
                <span className="mb-1.5 block text-foreground/80">Project ID</span>
                <input
                  type="text"
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  placeholder="7"
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </label>
            ) : null}

            {scopeType === 'multi_project' ? (
              <label className="block text-sm">
                <span className="mb-1.5 block text-foreground/80">
                  Project IDs (comma separated)
                </span>
                <input
                  type="text"
                  value={projectIdsCsv}
                  onChange={(event) => setProjectIdsCsv(event.target.value)}
                  placeholder="7, 9, 12"
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </label>
            ) : null}

            <div className="rounded-md border border-border bg-card/20 p-3">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Dataset Filter (Optional)
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block text-sm">
                  <span className="mb-1.5 block text-foreground/80">Column</span>
                  <select
                    value={filterColumn}
                    onChange={(event) => setFilterColumn(event.target.value)}
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">None</option>
                    {filterColumnOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block text-foreground/80">Operator</span>
                  <select
                    value={filterOperator}
                    onChange={(event) => setFilterOperator(event.target.value)}
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {FILTER_OPERATOR_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block text-foreground/80">Value</span>
                  <input
                    type="text"
                    value={filterValue}
                    onChange={(event) => setFilterValue(event.target.value)}
                    placeholder={filterOperator === 'in' ? 'anim, comp' : 'anim'}
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Preloaded with common production fields for the selected entity.
              </p>
            </div>

            <label className="block text-sm">
              <span className="mb-1.5 block text-foreground/80">Row Limit</span>
              <input
                type="number"
                min={25}
                max={2000}
                step={25}
                value={rowLimit}
                onChange={(event) => setRowLimit(event.target.value)}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-md border border-border px-3 py-2 text-sm text-foreground/80 transition hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-black transition hover:bg-primary disabled:opacity-70"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Page'
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
