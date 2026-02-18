'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  ChevronRight,
  Filter,
  LayoutGrid,
  List,
  Play,
  PlaySquare,
  Upload,
  VideoOff,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { listStatusNames } from '@/lib/status/options'
import { UploadVersionDialog } from '@/components/apex/upload-version-dialog'
import { CreatePlaylistDialog } from '@/components/apex/create-playlist-dialog'
import { VersionReviewWorkspace, type VersionReviewVersion } from '@/components/apex/version-review-workspace'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type MediaProject = {
  id: string
  code: string | null
  name: string | null
}

type MediaPlaylist = {
  id: number
  project_id: string | number
  name: string | null
  code: string | null
  created_at: string | null
  project: {
    id: string | number
    code: string | null
    name: string | null
  } | null
}

type MediaTaskRef = {
  id: string | number
  name: string | null
  entity_type: string | null
  entity_id: string | number | null
}

type MediaVersion = VersionReviewVersion & {
  project_id: string | number
  task_id: number | null
  entity_type: string | null
  entity_id: number | string | null
  status: string | null
  created_at: string | null
  thumbnail_url: string | null
  task: MediaTaskRef | null
  project: {
    id: string | number
    code: string | null
    name: string | null
  } | null
  resolved_thumbnail_url?: string
  resolved_preview_url?: string
  resolved_task_label?: string
  resolved_shot_label?: string
}

type MediaAsset = {
  id: number
  project_id: string | number
  code: string | null
  name: string | null
}

type MediaSequence = {
  id: number
  project_id: string | number
  code: string | null
  name: string | null
}

type MediaShot = {
  id: number
  project_id: string | number
  sequence_id: number | null
  code: string | null
  name: string | null
}

type BrowseSelection =
  | { kind: 'all' }
  | { kind: 'project'; projectId: string }
  | { kind: 'assets-root'; projectId: string }
  | { kind: 'asset'; projectId: string; assetId: number }
  | { kind: 'sequences-root'; projectId: string }
  | { kind: 'sequence'; projectId: string; sequenceId: number }
  | { kind: 'shots-root'; projectId: string }
  | { kind: 'shots-sequence'; projectId: string; sequenceKey: string }
  | { kind: 'shot'; projectId: string; shotId: number }

type LeftTab = 'browse' | 'playlists'
type ViewMode = 'grid' | 'list'
type SortMode = 'newest' | 'oldest' | 'name'

export interface MediaBrowserPageProps {
  fixedProjectId?: string
  showProjectSidebar?: boolean
}

const LEFT_TABS: Array<{ id: LeftTab; label: string }> = [
  { id: 'browse', label: 'Browse' },
  { id: 'playlists', label: 'Playlists' },
]
const PAGE_SIZE_OPTIONS = [24, 48, 96]
const MEDIA_PAGE_SIZE_STORAGE_KEY = 'echo-media-page-size'

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function asStringOrNumber(value: unknown): string | number {
  return typeof value === 'string' || typeof value === 'number' ? value : ''
}

function asNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function asNullableStringOrNumber(value: unknown): string | number | null {
  return typeof value === 'string' || typeof value === 'number' ? value : null
}

function normalizeProjectRef(value: unknown): MediaPlaylist['project'] {
  const projectRecord = Array.isArray(value) ? value[0] : value
  if (!projectRecord || typeof projectRecord !== 'object') return null
  const record = projectRecord as Record<string, unknown>
  const id = asStringOrNumber(record.id)
  if (id === '') return null
  return {
    id,
    code: asNullableString(record.code),
    name: asNullableString(record.name),
  }
}

function normalizeTaskRef(value: unknown): MediaTaskRef | null {
  const taskRecord = Array.isArray(value) ? value[0] : value
  if (!taskRecord || typeof taskRecord !== 'object') return null
  const record = taskRecord as Record<string, unknown>
  const id = asStringOrNumber(record.id)
  if (id === '') return null
  return {
    id,
    name: asNullableString(record.name),
    entity_type: asNullableString(record.entity_type),
    entity_id: asNullableStringOrNumber(record.entity_id),
  }
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

function isDataUrl(value: string) {
  return /^data:/i.test(value)
}

function hasPlayableMedia(version: MediaVersion) {
  return Boolean(
    version.file_path ||
      version.uploaded_movie_mp4 ||
      version.uploaded_movie_webm ||
      version.uploaded_movie ||
      version.movie_url
  )
}

function displayVersionName(version: MediaVersion) {
  return version.code || `v${version.version_number || version.id}`
}

function getVersionShotId(version: MediaVersion): number | null {
  const directType = String(version.entity_type || '').trim().toLowerCase()
  const directId = asNullableNumber(version.entity_id)
  if (directType === 'shot' && directId) return directId

  const taskType = String(version.task?.entity_type || '').trim().toLowerCase()
  const taskId = asNullableNumber(version.task?.entity_id)
  if (taskType === 'shot' && taskId) return taskId

  return null
}

function displayTaskLabel(version: MediaVersion) {
  const taskName = String(version.resolved_task_label || version.task?.name || '').trim()
  if (taskName) return taskName
  if (version.task_id) return `Task ${version.task_id}`
  return '-'
}

function displayShotLabel(version: MediaVersion) {
  const shotName = String(version.resolved_shot_label || '').trim()
  if (shotName) return shotName
  const shotId = getVersionShotId(version)
  if (shotId) return `Shot ${shotId}`
  return '-'
}

function getVersionPlaybackCandidate(version: MediaVersion) {
  return (
    version.uploaded_movie_mp4 ||
    version.uploaded_movie_webm ||
    version.uploaded_movie ||
    version.file_path ||
    version.movie_url ||
    ''
  )
}

function MediaPreview({ version }: { version: MediaVersion }) {
  if (version.resolved_thumbnail_url) {
    return (
      <img
        src={version.resolved_thumbnail_url}
        alt={displayVersionName(version)}
        className="h-full w-full object-cover"
      />
    )
  }

  if (version.resolved_preview_url) {
    return (
      <video
        src={version.resolved_preview_url}
        className="h-full w-full object-cover"
        muted
        loop
        autoPlay
        playsInline
        preload="metadata"
      />
    )
  }

  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <VideoOff className="h-8 w-8 opacity-70" />
    </div>
  )
}

export function MediaBrowserPage({
  fixedProjectId,
  showProjectSidebar = true,
}: MediaBrowserPageProps) {
  const initialProjectId = fixedProjectId || 'all'

  const [projects, setProjects] = useState<MediaProject[]>([])
  const [playlists, setPlaylists] = useState<MediaPlaylist[]>([])
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [sequences, setSequences] = useState<MediaSequence[]>([])
  const [shots, setShots] = useState<MediaShot[]>([])
  const [versions, setVersions] = useState<MediaVersion[]>([])
  const [statusNames, setStatusNames] = useState<string[]>([])

  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false)
  const [isLoadingPlaylistItems, setIsLoadingPlaylistItems] = useState(false)
  const [isLoadingHierarchy, setIsLoadingHierarchy] = useState(false)
  const [isLoadingVersions, setIsLoadingVersions] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [leftTab, setLeftTab] = useState<LeftTab>('browse')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [searchText, setSearchText] = useState('')
  const [debouncedSearchText, setDebouncedSearchText] = useState('')
  const [leftSearchText, setLeftSearchText] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window === 'undefined') return 48
    const raw = window.localStorage.getItem(MEDIA_PAGE_SIZE_STORAGE_KEY)
    const parsed = Number(raw)
    return PAGE_SIZE_OPTIONS.includes(parsed) ? parsed : 48
  })
  const [totalVersionCount, setTotalVersionCount] = useState(0)
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all')
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId)
  const [browseSelection, setBrowseSelection] = useState<BrowseSelection>(
    fixedProjectId ? { kind: 'project', projectId: fixedProjectId } : { kind: 'all' }
  )
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('all')
  const [playlistVersionIds, setPlaylistVersionIds] = useState<Set<number> | null>(null)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    fixedProjectId ? new Set([fixedProjectId]) : new Set()
  )
  const [expandedGroups, setExpandedGroups] = useState({
    assets: false,
    sequences: false,
    shots: false,
  })
  const [expandedShotSequences, setExpandedShotSequences] = useState<Set<string>>(new Set())

  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showCreatePlaylistDialog, setShowCreatePlaylistDialog] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<MediaVersion | null>(null)
  const versionsRequestTokenRef = useRef(0)

  const shotIdsBySequence = useMemo(() => {
    const grouped = new Map<string, Set<number>>()
    for (const shot of shots) {
      const key =
        shot.sequence_id === null || shot.sequence_id === undefined
          ? 'no-sequence'
          : String(shot.sequence_id)
      if (!grouped.has(key)) grouped.set(key, new Set())
      grouped.get(key)?.add(Number(shot.id))
    }
    return grouped
  }, [shots])

  useEffect(() => {
    if (!fixedProjectId) return
    const timer = window.setTimeout(() => {
      setSelectedProjectId(fixedProjectId)
      setBrowseSelection({ kind: 'project', projectId: fixedProjectId })
      setExpandedProjects(new Set([fixedProjectId]))
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fixedProjectId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchText(searchText)
    }, 250)

    return () => window.clearTimeout(timer)
  }, [searchText])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const loadedStatuses = await listStatusNames('version')
          const uniqueStatuses: string[] = []
          const seen = new Set<string>()
          for (const status of loadedStatuses) {
            const normalized = String(status || '').trim()
            if (!normalized) continue
            const key = normalized.toLowerCase()
            if (seen.has(key)) continue
            seen.add(key)
            uniqueStatuses.push(normalized)
          }
          setStatusNames(uniqueStatuses)
        } catch (error) {
          console.error('Failed to load version statuses for media page:', error)
          setStatusNames([])
        }
      })()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(MEDIA_PAGE_SIZE_STORAGE_KEY, String(pageSize))
    } catch {
      // Ignore storage write failures (private mode / blocked storage).
    }
  }, [pageSize])

  const loadProjects = useCallback(async () => {
    setIsLoadingProjects(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('projects')
      .select('id, code, name')
      .order('name', { ascending: true })

    if (error) {
      console.error('Failed to load projects for media page:', error)
      setProjects([])
    } else {
      setProjects(
        (data || []).map((row) => ({
          id: String(row.id),
          code: row.code ?? null,
          name: row.name ?? null,
        }))
      )
    }

    setIsLoadingProjects(false)
  }, [])

  const loadPlaylists = useCallback(async (projectId: string) => {
    setIsLoadingPlaylists(true)
    const supabase = createClient()

    let query = supabase
      .from('playlists')
      .select('id, project_id, name, code, created_at, project:projects(id, code, name)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (projectId !== 'all') {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query
    if (error) {
      console.error('Failed to load playlists for media page:', error)
      setPlaylists([])
    } else {
      const normalizedPlaylists: MediaPlaylist[] = (data || [])
        .map((row) => {
          const record = row as Record<string, unknown>
          const id = asNullableNumber(record.id)
          if (!id) return null
          return {
            id,
            project_id: asStringOrNumber(record.project_id),
            name: asNullableString(record.name),
            code: asNullableString(record.code),
            created_at: asNullableString(record.created_at),
            project: normalizeProjectRef(record.project),
          }
        })
        .filter((row): row is MediaPlaylist => Boolean(row))

      setPlaylists(normalizedPlaylists)
    }

    setIsLoadingPlaylists(false)
  }, [])

  const loadBrowseHierarchy = useCallback(async (projectId: string) => {
    if (projectId === 'all') {
      setAssets([])
      setSequences([])
      setShots([])
      setExpandedShotSequences(new Set())
      return
    }

    setIsLoadingHierarchy(true)
    const supabase = createClient()

    const [{ data: assetsData, error: assetsError }, { data: sequencesData, error: sequencesError }, { data: shotsData, error: shotsError }] =
      await Promise.all([
        supabase
          .from('assets')
          .select('id, project_id, code, name')
          .eq('project_id', projectId)
          .order('code', { ascending: true }),
        supabase
          .from('sequences')
          .select('id, project_id, code, name')
          .eq('project_id', projectId)
          .order('code', { ascending: true }),
        supabase
          .from('shots')
          .select('id, project_id, sequence_id, code, name')
          .eq('project_id', projectId)
          .order('code', { ascending: true }),
      ])

    if (assetsError || sequencesError || shotsError) {
      console.error('Failed to load media browse hierarchy:', {
        assetsError,
        sequencesError,
        shotsError,
      })
      setAssets([])
      setSequences([])
      setShots([])
      setExpandedShotSequences(new Set())
      setIsLoadingHierarchy(false)
      return
    }

    const loadedAssets = (assetsData || []) as MediaAsset[]
    const loadedSequences = (sequencesData || []) as MediaSequence[]
    const loadedShots = (shotsData || []) as MediaShot[]

    setAssets(loadedAssets)
    setSequences(loadedSequences)
    setShots(loadedShots)
    setExpandedShotSequences(new Set())
    setIsLoadingHierarchy(false)
  }, [])

  const loadPlaylistVersionIds = useCallback(async (playlistId: string) => {
    if (playlistId === 'all') {
      setPlaylistVersionIds(null)
      return
    }

    const numericPlaylistId = Number(playlistId)
    if (Number.isNaN(numericPlaylistId)) {
      setPlaylistVersionIds(new Set<number>())
      return
    }

    setIsLoadingPlaylistItems(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('playlist_items')
      .select('version_id')
      .eq('playlist_id', numericPlaylistId)

    if (error) {
      console.error('Failed to load playlist items:', error)
      setPlaylistVersionIds(new Set<number>())
      setIsLoadingPlaylistItems(false)
      return
    }

    setPlaylistVersionIds(
      new Set(
        (data || [])
          .map((row) => Number(row.version_id))
          .filter((value) => Number.isFinite(value) && value > 0)
      )
    )
    setIsLoadingPlaylistItems(false)
  }, [])

  const loadVersions = useCallback(async () => {
    if (leftTab === 'playlists' && selectedPlaylistId !== 'all' && playlistVersionIds === null) {
      setVersions([])
      setTotalVersionCount(0)
      setIsLoadingVersions(false)
      return
    }

    setIsLoadingVersions(true)
    setLoadError(null)

    const supabase = createClient()
    const requestToken = versionsRequestTokenRef.current + 1
    versionsRequestTokenRef.current = requestToken

    let query = supabase
      .from('versions')
      .select(
        'id, code, version_number, file_path, movie_url, uploaded_movie, uploaded_movie_mp4, uploaded_movie_webm, frame_rate, status, created_at, project_id, task_id, entity_type, entity_id, thumbnail_url, task:tasks(id, name, entity_type, entity_id), project:projects(id, code, name)',
        { count: 'exact' }
      )

    if (selectedProjectId !== 'all') {
      query = query.eq('project_id', selectedProjectId)
    }

    if (leftTab === 'browse') {
      switch (browseSelection.kind) {
        case 'all':
          break
        case 'project':
          query = query.eq('project_id', browseSelection.projectId)
          break
        case 'assets-root':
          query = query
            .eq('project_id', browseSelection.projectId)
            .eq('entity_type', 'asset')
          break
        case 'asset':
          query = query
            .eq('project_id', browseSelection.projectId)
            .eq('entity_type', 'asset')
            .eq('entity_id', browseSelection.assetId)
          break
        case 'sequences-root':
          query = query
            .eq('project_id', browseSelection.projectId)
            .eq('entity_type', 'sequence')
          break
        case 'sequence':
          query = query
            .eq('project_id', browseSelection.projectId)
            .eq('entity_type', 'sequence')
            .eq('entity_id', browseSelection.sequenceId)
          break
        case 'shots-root':
          query = query
            .eq('project_id', browseSelection.projectId)
            .eq('entity_type', 'shot')
          break
        case 'shots-sequence': {
          query = query
            .eq('project_id', browseSelection.projectId)
            .eq('entity_type', 'shot')
          const shotIds = Array.from(
            shotIdsBySequence.get(browseSelection.sequenceKey) || []
          )
          if (shotIds.length === 0) {
            if (requestToken === versionsRequestTokenRef.current) {
              setVersions([])
              setTotalVersionCount(0)
              setIsLoadingVersions(false)
            }
            return
          }
          query = query.in('entity_id', shotIds)
          break
        }
        case 'shot':
          query = query
            .eq('project_id', browseSelection.projectId)
            .eq('entity_type', 'shot')
            .eq('entity_id', browseSelection.shotId)
          break
      }
    }

    if (leftTab === 'playlists' && selectedPlaylistId !== 'all') {
      const selectedIds = Array.from(playlistVersionIds || [])
      if (selectedIds.length === 0) {
        if (requestToken === versionsRequestTokenRef.current) {
          setVersions([])
          setTotalVersionCount(0)
          setIsLoadingVersions(false)
        }
        return
      }
      query = query.in('id', selectedIds)
    }

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const searchNeedle = debouncedSearchText.trim()
    if (searchNeedle) {
      query = query.ilike('code', `%${searchNeedle}%`)
    }

    if (sortMode === 'name') {
      query = query.order('code', { ascending: true }).order('id', { ascending: false })
    } else if (sortMode === 'oldest') {
      query = query.order('created_at', { ascending: true }).order('id', { ascending: true })
    } else {
      query = query
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
    }

    const startIndex = Math.max(0, (currentPage - 1) * pageSize)
    const endIndex = startIndex + pageSize - 1
    query = query.range(startIndex, endIndex)

    const { data, error, count } = await query
    if (requestToken !== versionsRequestTokenRef.current) return

    if (error) {
      console.error('Failed to load versions for media page:', error)
      setLoadError(error.message || 'Failed to load versions')
      setVersions([])
      setTotalVersionCount(0)
      setIsLoadingVersions(false)
      return
    }

    const totalCount = typeof count === 'number' ? count : 0
    setTotalVersionCount(totalCount)

    const maxPage = Math.max(1, Math.ceil(totalCount / pageSize))
    if (currentPage > maxPage) {
      setCurrentPage(maxPage)
      setIsLoadingVersions(false)
      return
    }

    const rows: MediaVersion[] = (data || [])
      .map((row) => {
        const record = row as Record<string, unknown>
        const id = asNullableNumber(record.id)
        if (!id) return null
        return {
          id,
          code: asNullableString(record.code),
          version_number: asNullableNumber(record.version_number),
          file_path: asNullableString(record.file_path),
          movie_url: asNullableString(record.movie_url),
          uploaded_movie: asNullableString(record.uploaded_movie),
          uploaded_movie_mp4: asNullableString(record.uploaded_movie_mp4),
          uploaded_movie_webm: asNullableString(record.uploaded_movie_webm),
          frame_rate: asNullableNumber(record.frame_rate),
          status: asNullableString(record.status),
          created_at: asNullableString(record.created_at),
          project_id: asStringOrNumber(record.project_id),
          task_id: asNullableNumber(record.task_id),
          entity_type: asNullableString(record.entity_type),
          entity_id: asNullableStringOrNumber(record.entity_id),
          thumbnail_url: asNullableString(record.thumbnail_url),
          task: normalizeTaskRef(record.task),
          project: normalizeProjectRef(record.project),
        }
      })
      .filter((row): row is MediaVersion => Boolean(row))

    const shotIds = new Set<number>()
    for (const row of rows) {
      const shotId = getVersionShotId(row)
      if (shotId) shotIds.add(shotId)
    }

    const shotLabelById = new Map<number, string>()
    if (shotIds.size > 0) {
      const { data: shotData, error: shotError } = await supabase
        .from('shots')
        .select('id, code, name')
        .in('id', Array.from(shotIds))

      if (requestToken !== versionsRequestTokenRef.current) return

      if (shotError) {
        console.error('Failed to load shot labels for media versions:', shotError)
      } else {
        for (const shot of (shotData || []) as Array<Record<string, unknown>>) {
          const shotId = asNullableNumber(shot.id)
          if (!shotId) continue
          const shotCode = String(shot.code || '').trim()
          const shotName = String(shot.name || '').trim()
          shotLabelById.set(shotId, shotCode || shotName || `Shot ${shotId}`)
        }
      }
    }

    const thumbnailMap = new Map<number, string>()
    const previewMap = new Map<number, string>()
    const storageThumbRows: Array<{ id: number; path: string }> = []
    const storagePreviewRows: Array<{ id: number; path: string }> = []

    for (const row of rows) {
      const thumbnailRaw = String(row.thumbnail_url || '').trim()
      if (thumbnailRaw) {
        if (isHttpUrl(thumbnailRaw) || isDataUrl(thumbnailRaw)) {
          thumbnailMap.set(row.id, thumbnailRaw)
        } else {
          storageThumbRows.push({ id: row.id, path: thumbnailRaw })
        }
      }

      const playbackCandidate = String(getVersionPlaybackCandidate(row) || '').trim()
      if (!playbackCandidate) continue

      if (isHttpUrl(playbackCandidate)) {
        previewMap.set(row.id, playbackCandidate)
      } else {
        storagePreviewRows.push({ id: row.id, path: playbackCandidate })
      }
    }

    if (storageThumbRows.length > 0) {
      const { data: signedData, error: signedError } = await supabase.storage
        .from('versions')
        .createSignedUrls(storageThumbRows.map((row) => row.path), 3600)

      if (requestToken !== versionsRequestTokenRef.current) return

      if (signedError) {
        console.error('Failed to sign media thumbnails:', signedError)
      } else {
        signedData?.forEach((item, index) => {
          if (item?.signedUrl) {
            thumbnailMap.set(storageThumbRows[index].id, item.signedUrl)
          }
        })
      }
    }

    if (storagePreviewRows.length > 0) {
      const dedupedPaths = Array.from(new Set(storagePreviewRows.map((row) => row.path)))
      const { data: signedData, error: signedError } = await supabase.storage
        .from('versions')
        .createSignedUrls(dedupedPaths, 3600)

      if (requestToken !== versionsRequestTokenRef.current) return

      if (signedError) {
        console.error('Failed to sign media preview URLs:', signedError)
      } else {
        const signedByPath = new Map<string, string>()
        signedData?.forEach((item, index) => {
          if (item?.signedUrl) {
            signedByPath.set(dedupedPaths[index], item.signedUrl)
          }
        })

        for (const row of storagePreviewRows) {
          const signed = signedByPath.get(row.path)
          if (signed) {
            previewMap.set(row.id, signed)
          }
        }
      }
    }

    if (requestToken !== versionsRequestTokenRef.current) return

    setVersions(
      rows.map((row) => ({
        ...row,
        resolved_thumbnail_url: thumbnailMap.get(row.id) || '',
        resolved_preview_url: previewMap.get(row.id) || '',
        resolved_task_label: String(row.task?.name || '').trim(),
        resolved_shot_label: (() => {
          const shotId = getVersionShotId(row)
          if (!shotId) return ''
          return shotLabelById.get(shotId) || `Shot ${shotId}`
        })(),
      }))
    )
    setIsLoadingVersions(false)
  }, [
    browseSelection,
    currentPage,
    leftTab,
    pageSize,
    playlistVersionIds,
    debouncedSearchText,
    selectedPlaylistId,
    selectedProjectId,
    shotIdsBySequence,
    sortMode,
    statusFilter,
  ])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProjects()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadProjects])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPlaylists(selectedProjectId)
      void loadBrowseHierarchy(selectedProjectId)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [selectedProjectId, loadBrowseHierarchy, loadPlaylists])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSelectedPlaylistId('all')
      setPlaylistVersionIds(null)
      setExpandedGroups({
        assets: false,
        sequences: false,
        shots: false,
      })
      setExpandedShotSequences(new Set())
      if (fixedProjectId) {
        setBrowseSelection({ kind: 'project', projectId: fixedProjectId })
        return
      }
      if (selectedProjectId === 'all') {
        setBrowseSelection({ kind: 'all' })
      } else {
        setBrowseSelection({ kind: 'project', projectId: selectedProjectId })
        setExpandedProjects((prev) => {
          const next = new Set(prev)
          next.add(selectedProjectId)
          return next
        })
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fixedProjectId, selectedProjectId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (leftTab !== 'playlists') {
        setPlaylistVersionIds(null)
        return
      }
      void loadPlaylistVersionIds(selectedPlaylistId)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [leftTab, selectedPlaylistId, loadPlaylistVersionIds])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCurrentPage(1)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [
    browseSelection,
    leftTab,
    playlistVersionIds,
    searchText,
    selectedPlaylistId,
    selectedProjectId,
    sortMode,
    statusFilter,
  ])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadVersions()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadVersions])

  const filteredProjects = useMemo(() => {
    const needle = leftSearchText.trim().toLowerCase()
    if (!needle) return projects
    return projects.filter((project) => {
      if (project.id === selectedProjectId) return true
      const label = `${project.code || ''} ${project.name || ''}`.toLowerCase()
      return label.includes(needle)
    })
  }, [leftSearchText, projects, selectedProjectId])

  const filteredPlaylists = useMemo(() => {
    const needle = leftSearchText.trim().toLowerCase()
    if (!needle) return playlists

    return playlists.filter((playlist) => {
      const label = `${playlist.code || ''} ${playlist.name || ''} ${playlist.project?.code || ''} ${playlist.project?.name || ''}`.toLowerCase()
      return label.includes(needle)
    })
  }, [leftSearchText, playlists])

  const filteredAssets = useMemo(() => {
    const needle = leftSearchText.trim().toLowerCase()
    if (!needle) return assets
    return assets.filter((asset) =>
      `${asset.code || ''} ${asset.name || ''}`.toLowerCase().includes(needle)
    )
  }, [assets, leftSearchText])

  const filteredSequences = useMemo(() => {
    const needle = leftSearchText.trim().toLowerCase()
    if (!needle) return sequences
    return sequences.filter((sequence) =>
      `${sequence.code || ''} ${sequence.name || ''}`.toLowerCase().includes(needle)
    )
  }, [leftSearchText, sequences])

  const filteredShots = useMemo(() => {
    const needle = leftSearchText.trim().toLowerCase()
    if (!needle) return shots
    return shots.filter((shot) =>
      `${shot.code || ''} ${shot.name || ''}`.toLowerCase().includes(needle)
    )
  }, [leftSearchText, shots])

  const shotsBySequence = useMemo(() => {
    const grouped = new Map<string, MediaShot[]>()
    for (const shot of filteredShots) {
      const key =
        shot.sequence_id === null || shot.sequence_id === undefined
          ? 'no-sequence'
          : String(shot.sequence_id)
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)?.push(shot)
    }
    return grouped
  }, [filteredShots])

  const filteredBrowseProjects = useMemo(
    () =>
      filteredProjects.filter((project) =>
        fixedProjectId ? project.id === fixedProjectId : true
      ),
    [filteredProjects, fixedProjectId]
  )

  const selectedProjectLabel = useMemo(() => {
    if (selectedProjectId === 'all') return 'ALL PROJECTS'
    const found = projects.find((project) => project.id === selectedProjectId)
    if (!found) return fixedProjectId || 'MEDIA'
    return found.code || found.name || String(found.id)
  }, [fixedProjectId, projects, selectedProjectId])

  const selectedPlaylistLabel = useMemo(() => {
    if (selectedPlaylistId === 'all') return 'All Playlists'
    const found = playlists.find((playlist) => String(playlist.id) === selectedPlaylistId)
    if (!found) return 'Playlist'
    return found.code || found.name || `Playlist ${found.id}`
  }, [playlists, selectedPlaylistId])

  const statusOptions = useMemo(() => {
    const statuses = new Set<string>()
    for (const status of statusNames) {
      const normalized = String(status || '').trim()
      if (normalized) statuses.add(normalized)
    }
    for (const row of versions) {
      const status = String(row.status || '').trim()
      if (status) statuses.add(status)
    }
    return Array.from(statuses)
  }, [statusNames, versions])

  const isBrowseSelectionActive = useCallback(
    (candidate: BrowseSelection) => {
      switch (candidate.kind) {
        case 'all':
          return browseSelection.kind === 'all'
        case 'project':
          return (
            browseSelection.kind === 'project' &&
            browseSelection.projectId === candidate.projectId
          )
        case 'assets-root':
          return (
            browseSelection.kind === 'assets-root' &&
            browseSelection.projectId === candidate.projectId
          )
        case 'asset':
          return (
            browseSelection.kind === 'asset' &&
            browseSelection.projectId === candidate.projectId &&
            browseSelection.assetId === candidate.assetId
          )
        case 'sequences-root':
          return (
            browseSelection.kind === 'sequences-root' &&
            browseSelection.projectId === candidate.projectId
          )
        case 'sequence':
          return (
            browseSelection.kind === 'sequence' &&
            browseSelection.projectId === candidate.projectId &&
            browseSelection.sequenceId === candidate.sequenceId
          )
        case 'shots-root':
          return (
            browseSelection.kind === 'shots-root' &&
            browseSelection.projectId === candidate.projectId
          )
        case 'shots-sequence':
          return (
            browseSelection.kind === 'shots-sequence' &&
            browseSelection.projectId === candidate.projectId &&
            browseSelection.sequenceKey === candidate.sequenceKey
          )
        case 'shot':
          return (
            browseSelection.kind === 'shot' &&
            browseSelection.projectId === candidate.projectId &&
            browseSelection.shotId === candidate.shotId
          )
      }
    },
    [browseSelection]
  )

  const visibleVersions = versions
  const totalPages = Math.max(1, Math.ceil(totalVersionCount / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageRangeStart =
    totalVersionCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1
  const pageRangeEnd =
    totalVersionCount === 0 ? 0 : Math.min(totalVersionCount, safeCurrentPage * pageSize)

  const canUpload = selectedProjectId !== 'all'
  const canCreatePlaylist = selectedProjectId !== 'all'

  const handleUploadDialogChange = (open: boolean) => {
    setShowUploadDialog(open)
    if (!open) {
      void loadVersions()
    }
  }

  const handleCreatePlaylistDialogChange = (open: boolean) => {
    setShowCreatePlaylistDialog(open)
    if (!open) {
      void loadPlaylists(selectedProjectId)
    }
  }

  const leftSearchPlaceholder =
    leftTab === 'browse' ? 'Find a folder...' : 'Find a playlist...'

  return (
    <div className="flex h-full min-h-0 min-w-0 bg-background text-foreground">
      {showProjectSidebar ? (
        <aside className="flex w-72 min-w-72 flex-col border-r border-border bg-card">
          <div className="border-b border-border px-4 py-4">
            <p className="text-lg font-semibold tracking-wide text-foreground">ALL PROJECTS</p>
          </div>

          <div className="border-b border-border px-3 py-2">
            <div className="flex items-center gap-1">
              {LEFT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setLeftTab(tab.id)
                    setCurrentPage(1)
                  }}
                  className={cn(
                    'rounded px-2 py-1 text-sm transition',
                    leftTab === tab.id
                      ? 'bg-background text-foreground'
                      : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-b border-border px-3 py-2">
            <Input
              value={leftSearchText}
              onChange={(event) => setLeftSearchText(event.target.value)}
              placeholder={leftSearchPlaceholder}
              className="h-9 border-border bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {leftTab === 'browse' ? (
              <div className="space-y-1">
                {!fixedProjectId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProjectId('all')
                      setBrowseSelection({ kind: 'all' })
                    }}
                    className={cn(
                      'flex w-full items-center rounded px-3 py-2 text-left text-sm transition',
                      isBrowseSelectionActive({ kind: 'all' })
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-background'
                    )}
                  >
                    All Versions in All Projects
                  </button>
                ) : null}

                {isLoadingProjects ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Loading projects...</p>
                ) : (
                  filteredBrowseProjects.map((project) => {
                    const projectId = project.id
                    const label = project.code || project.name || project.id
                    const isExpanded = expandedProjects.has(projectId)
                    const showHierarchy = isExpanded && selectedProjectId === projectId
                    const projectNode = { kind: 'project', projectId } as const

                    return (
                      <div key={project.id} className="space-y-1">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProjectId(projectId)
                              setBrowseSelection(projectNode)
                              setExpandedProjects((prev) => {
                                const next = new Set(prev)
                                if (next.has(projectId)) {
                                  next.delete(projectId)
                                } else {
                                  next.add(projectId)
                                }
                                return next
                              })
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition hover:bg-background hover:text-foreground"
                            aria-label={`Toggle ${label}`}
                          >
                            <ChevronRight
                              className={cn(
                                'h-4 w-4 transition-transform',
                                isExpanded ? 'rotate-90' : ''
                              )}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProjectId(projectId)
                              setBrowseSelection(projectNode)
                              setExpandedProjects((prev) => {
                                const next = new Set(prev)
                                next.add(projectId)
                                return next
                              })
                            }}
                            className={cn(
                              'flex-1 rounded px-2 py-1.5 text-left text-sm transition',
                              isBrowseSelectionActive(projectNode)
                                ? 'bg-primary text-primary-foreground'
                                : 'text-foreground hover:bg-background'
                            )}
                          >
                            {label}
                          </button>
                        </div>

                        {showHierarchy ? (
                          <div className="ml-8 space-y-1">
                            {isLoadingHierarchy ? (
                              <p className="px-2 py-1 text-xs text-muted-foreground">
                                Loading hierarchy...
                              </p>
                            ) : (
                              <>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedGroups((prev) => ({
                                          ...prev,
                                          assets: !prev.assets,
                                        }))
                                      }
                                      className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition hover:bg-background hover:text-foreground"
                                      aria-label="Toggle assets"
                                    >
                                      <ChevronRight
                                        className={cn(
                                          'h-3.5 w-3.5 transition-transform',
                                          expandedGroups.assets ? 'rotate-90' : ''
                                        )}
                                      />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setBrowseSelection({
                                          kind: 'assets-root',
                                          projectId,
                                        })
                                      }
                                      className={cn(
                                        'flex-1 rounded px-2 py-1 text-left text-sm transition',
                                        isBrowseSelectionActive({
                                          kind: 'assets-root',
                                          projectId,
                                        })
                                          ? 'bg-primary text-primary-foreground'
                                          : 'text-foreground hover:bg-background'
                                      )}
                                    >
                                      Assets
                                    </button>
                                  </div>
                                  {expandedGroups.assets ? (
                                    <div className="ml-6 space-y-1">
                                      {filteredAssets.length === 0 ? (
                                        <p className="px-2 py-1 text-xs text-muted-foreground">
                                          No assets
                                        </p>
                                      ) : (
                                        filteredAssets.map((asset) => {
                                          const assetNode = {
                                            kind: 'asset',
                                            projectId,
                                            assetId: Number(asset.id),
                                          } as const
                                          const assetLabel =
                                            asset.code || asset.name || `Asset ${asset.id}`
                                          return (
                                            <button
                                              key={asset.id}
                                              type="button"
                                              onClick={() => setBrowseSelection(assetNode)}
                                              className={cn(
                                                'block w-full rounded px-2 py-1 text-left text-xs transition',
                                                isBrowseSelectionActive(assetNode)
                                                  ? 'bg-primary text-primary-foreground'
                                                  : 'text-muted-foreground hover:bg-background hover:text-foreground'
                                              )}
                                            >
                                              {assetLabel}
                                            </button>
                                          )
                                        })
                                      )}
                                    </div>
                                  ) : null}
                                </div>

                                <div className="space-y-1">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedGroups((prev) => ({
                                          ...prev,
                                          sequences: !prev.sequences,
                                        }))
                                      }
                                      className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition hover:bg-background hover:text-foreground"
                                      aria-label="Toggle sequences"
                                    >
                                      <ChevronRight
                                        className={cn(
                                          'h-3.5 w-3.5 transition-transform',
                                          expandedGroups.sequences ? 'rotate-90' : ''
                                        )}
                                      />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setBrowseSelection({
                                          kind: 'sequences-root',
                                          projectId,
                                        })
                                      }
                                      className={cn(
                                        'flex-1 rounded px-2 py-1 text-left text-sm transition',
                                        isBrowseSelectionActive({
                                          kind: 'sequences-root',
                                          projectId,
                                        })
                                          ? 'bg-primary text-primary-foreground'
                                          : 'text-foreground hover:bg-background'
                                      )}
                                    >
                                      Sequences
                                    </button>
                                  </div>
                                  {expandedGroups.sequences ? (
                                    <div className="ml-6 space-y-1">
                                      {filteredSequences.length === 0 ? (
                                        <p className="px-2 py-1 text-xs text-muted-foreground">
                                          No sequences
                                        </p>
                                      ) : (
                                        filteredSequences.map((sequence) => {
                                          const sequenceNode = {
                                            kind: 'sequence',
                                            projectId,
                                            sequenceId: Number(sequence.id),
                                          } as const
                                          const sequenceLabel =
                                            sequence.code ||
                                            sequence.name ||
                                            `Sequence ${sequence.id}`
                                          return (
                                            <button
                                              key={sequence.id}
                                              type="button"
                                              onClick={() => setBrowseSelection(sequenceNode)}
                                              className={cn(
                                                'block w-full rounded px-2 py-1 text-left text-xs transition',
                                                isBrowseSelectionActive(sequenceNode)
                                                  ? 'bg-primary text-primary-foreground'
                                                  : 'text-muted-foreground hover:bg-background hover:text-foreground'
                                              )}
                                            >
                                              {sequenceLabel}
                                            </button>
                                          )
                                        })
                                      )}
                                    </div>
                                  ) : null}
                                </div>

                                <div className="space-y-1">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedGroups((prev) => ({
                                          ...prev,
                                          shots: !prev.shots,
                                        }))
                                      }
                                      className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition hover:bg-background hover:text-foreground"
                                      aria-label="Toggle shots"
                                    >
                                      <ChevronRight
                                        className={cn(
                                          'h-3.5 w-3.5 transition-transform',
                                          expandedGroups.shots ? 'rotate-90' : ''
                                        )}
                                      />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setBrowseSelection({
                                          kind: 'shots-root',
                                          projectId,
                                        })
                                      }
                                      className={cn(
                                        'flex-1 rounded px-2 py-1 text-left text-sm transition',
                                        isBrowseSelectionActive({
                                          kind: 'shots-root',
                                          projectId,
                                        })
                                          ? 'bg-primary text-primary-foreground'
                                          : 'text-foreground hover:bg-background'
                                      )}
                                    >
                                      Shots
                                    </button>
                                  </div>
                                  {expandedGroups.shots ? (
                                    <div className="ml-6 space-y-1">
                                      {shotsBySequence.size === 0 ? (
                                        <p className="px-2 py-1 text-xs text-muted-foreground">
                                          No shots
                                        </p>
                                      ) : (
                                        Array.from(shotsBySequence.entries()).map(
                                          ([sequenceKey, sequenceShots]) => {
                                            const sequenceNode = {
                                              kind: 'shots-sequence',
                                              projectId,
                                              sequenceKey,
                                            } as const
                                            const sequenceInfo =
                                              sequenceKey === 'no-sequence'
                                                ? null
                                                : sequences.find(
                                                    (sequence) =>
                                                      String(sequence.id) === sequenceKey
                                                  )
                                            const sequenceLabel = sequenceInfo
                                              ? sequenceInfo.code ||
                                                sequenceInfo.name ||
                                                `Sequence ${sequenceInfo.id}`
                                              : 'No Sequence'
                                            const isSequenceExpanded =
                                              expandedShotSequences.has(sequenceKey)

                                            return (
                                              <div key={sequenceKey} className="space-y-1">
                                                <div className="flex items-center gap-1">
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setExpandedShotSequences((prev) => {
                                                        const next = new Set(prev)
                                                        if (next.has(sequenceKey)) {
                                                          next.delete(sequenceKey)
                                                        } else {
                                                          next.add(sequenceKey)
                                                        }
                                                        return next
                                                      })
                                                    }
                                                    className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition hover:bg-background hover:text-foreground"
                                                    aria-label={`Toggle ${sequenceLabel}`}
                                                  >
                                                    <ChevronRight
                                                      className={cn(
                                                        'h-3.5 w-3.5 transition-transform',
                                                        isSequenceExpanded
                                                          ? 'rotate-90'
                                                          : ''
                                                      )}
                                                    />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setBrowseSelection(sequenceNode)
                                                    }
                                                    className={cn(
                                                      'flex-1 rounded px-2 py-1 text-left text-xs transition',
                                                      isBrowseSelectionActive(sequenceNode)
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'text-muted-foreground hover:bg-background hover:text-foreground'
                                                    )}
                                                  >
                                                    {sequenceLabel}
                                                  </button>
                                                </div>

                                                {isSequenceExpanded ? (
                                                  <div className="ml-5 space-y-1">
                                                    {sequenceShots.map((shot) => {
                                                      const shotNode = {
                                                        kind: 'shot',
                                                        projectId,
                                                        shotId: Number(shot.id),
                                                      } as const
                                                      const shotLabel =
                                                        shot.code ||
                                                        shot.name ||
                                                        `Shot ${shot.id}`
                                                      return (
                                                        <button
                                                          key={shot.id}
                                                          type="button"
                                                          onClick={() =>
                                                            setBrowseSelection(shotNode)
                                                          }
                                                          className={cn(
                                                            'block w-full rounded px-2 py-1 text-left text-xs transition',
                                                            isBrowseSelectionActive(shotNode)
                                                              ? 'bg-primary text-primary-foreground'
                                                              : 'text-muted-foreground hover:bg-background hover:text-foreground'
                                                          )}
                                                        >
                                                          {shotLabel}
                                                        </button>
                                                      )
                                                    })}
                                                  </div>
                                                ) : null}
                                              </div>
                                            )
                                          }
                                        )
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              </>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )
                  })
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlaylistId('all')
                    setCurrentPage(1)
                  }}
                  className={cn(
                    'flex w-full items-center rounded px-3 py-2 text-left text-sm transition',
                    selectedPlaylistId === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-background'
                  )}
                >
                  All Playlists
                </button>

                {isLoadingPlaylists ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Loading playlists...</p>
                ) : filteredPlaylists.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No playlists found.</p>
                ) : (
                  filteredPlaylists.map((playlist) => {
                    const label = playlist.code || playlist.name || `Playlist ${playlist.id}`
                    return (
                      <button
                        key={playlist.id}
                        type="button"
                        onClick={() => {
                          setSelectedPlaylistId(String(playlist.id))
                          setCurrentPage(1)
                        }}
                        className={cn(
                          'flex w-full items-center rounded px-3 py-2 text-left text-sm transition',
                          selectedPlaylistId === String(playlist.id)
                            ? 'bg-primary text-primary-foreground'
                            : 'text-foreground hover:bg-background'
                        )}
                      >
                        {label}
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </aside>
      ) : null}

      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="border-b border-border bg-background px-6 py-4">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            {leftTab === 'playlists' ? selectedPlaylistLabel : selectedProjectLabel}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-2">
          {!showProjectSidebar ? (
            <div className="inline-flex items-center rounded-md border border-border bg-background p-1">
              {LEFT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setLeftTab(tab.id)
                    setCurrentPage(1)
                  }}
                  className={cn(
                    'rounded px-2 py-1 text-sm transition',
                    leftTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="inline-flex items-center rounded-md border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'rounded p-1.5 transition',
                viewMode === 'grid'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded p-1.5 transition',
                viewMode === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {leftTab === 'playlists' ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setShowCreatePlaylistDialog(true)}
              disabled={!canCreatePlaylist}
              className="gap-1.5"
            >
              <PlaySquare className="h-4 w-4" />
              New Playlist
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => setShowUploadDialog(true)}
              disabled={!canUpload}
              className="gap-1.5"
            >
              <Upload className="h-4 w-4" />
              New Version
            </Button>
          )}

          <select
            value={sortMode}
            onChange={(event) => {
              setSortMode(event.target.value as SortMode)
              setCurrentPage(1)
            }}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none"
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="name">Sort: Name</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value)
              setCurrentPage(1)
            }}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none"
          >
            <option value="all">All Status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <div className="ml-auto flex w-full max-w-md items-center gap-2 sm:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search Versions..."
              className="h-9 border-border bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {loadError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {loadError}
            </div>
          ) : isLoadingVersions || (leftTab === 'playlists' && isLoadingPlaylistItems) ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-md border border-border bg-card">
                  <div className="aspect-video animate-pulse bg-background/70" />
                  <div className="h-10 animate-pulse border-t border-border bg-background/70" />
                </div>
              ))}
            </div>
          ) : visibleVersions.length === 0 ? (
            <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
              No versions found for current filters.
            </div>
          ) : viewMode === 'list' ? (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full border-collapse">
                <thead className="bg-card">
                  <tr>
                    <th className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Version
                    </th>
                    <th className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Project
                    </th>
                    <th className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Task
                    </th>
                    <th className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Shot
                    </th>
                    <th className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                    <th className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleVersions.map((version) => {
                    const createdAt = version.created_at ? new Date(version.created_at) : null
                    const createdLabel =
                      createdAt && !Number.isNaN(createdAt.getTime())
                        ? formatDistanceToNow(createdAt, { addSuffix: true })
                        : 'Unknown'

                    return (
                      <tr
                        key={version.id}
                        className="cursor-pointer border-b border-border/60 bg-background transition hover:bg-card/70"
                        onClick={() => setSelectedVersion(version)}
                      >
                        <td className="px-3 py-2 text-sm text-foreground">{displayVersionName(version)}</td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">
                          {version.project?.code || version.project?.name || version.project_id}
                        </td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">
                          {displayTaskLabel(version)}
                        </td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">
                          {displayShotLabel(version)}
                        </td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">{version.status || '-'}</td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">{createdLabel}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleVersions.map((version) => {
                const createdAt = version.created_at ? new Date(version.created_at) : null
                const createdLabel =
                  createdAt && !Number.isNaN(createdAt.getTime())
                    ? formatDistanceToNow(createdAt, { addSuffix: true })
                    : ''

                return (
                  <button
                    key={version.id}
                    type="button"
                    onClick={() => setSelectedVersion(version)}
                    className="group overflow-hidden rounded-md border border-border bg-card text-left transition hover:border-primary/40"
                  >
                    <div className="relative aspect-video bg-black">
                      <MediaPreview version={version} />
                      {hasPlayableMedia(version) ? (
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white transition group-hover:scale-105">
                            <Play className="ml-0.5 h-4 w-4" />
                          </span>
                        </span>
                      ) : null}
                    </div>
                    <div className="space-y-1 border-t border-border px-3 py-2">
                      <p className="truncate text-sm font-medium text-foreground">{displayVersionName(version)}</p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-muted-foreground">
                          {displayShotLabel(version)}
                        </p>
                        {createdLabel ? (
                          <span className="shrink-0 text-xs text-muted-foreground">{createdLabel}</span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-2">
          <p className="text-xs text-muted-foreground">
            Showing {pageRangeStart}-{pageRangeEnd} of {totalVersionCount}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Per page</span>
            <select
              value={pageSize}
              onChange={(event) => {
                const nextSize = Number(event.target.value)
                if (!PAGE_SIZE_OPTIONS.includes(nextSize)) return
                setPageSize(nextSize)
                setCurrentPage(1)
              }}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safeCurrentPage <= 1 || isLoadingVersions}
            >
              Previous
            </Button>
            <span className="min-w-[96px] text-center text-xs text-muted-foreground">
              Page {safeCurrentPage} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={safeCurrentPage >= totalPages || isLoadingVersions}
            >
              Next
            </Button>
          </div>
        </div>
      </section>

      <UploadVersionDialog
        open={showUploadDialog}
        onOpenChange={handleUploadDialogChange}
        projectId={selectedProjectId === 'all' ? (projects[0]?.id || '') : selectedProjectId}
      />

      <CreatePlaylistDialog
        open={showCreatePlaylistDialog}
        onOpenChange={handleCreatePlaylistDialogChange}
        projectId={selectedProjectId === 'all' ? (projects[0]?.id || '') : selectedProjectId}
      />

      <Dialog
        open={Boolean(selectedVersion)}
        onOpenChange={(open) => {
          if (!open) setSelectedVersion(null)
        }}
      >
        <DialogContent
          className="h-[92vh] !w-[96vw] !max-w-[96vw] overflow-hidden border-border bg-background p-0 text-foreground sm:!max-w-[96vw] xl:!max-w-[1600px]"
          showCloseButton={true}
        >
          <DialogTitle className="sr-only">Media Review Player</DialogTitle>
          <DialogDescription className="sr-only">
            Review media, add frame annotations, and save notes.
          </DialogDescription>
          {selectedVersion ? (
            <div className="h-full overflow-y-auto">
              <VersionReviewWorkspace
                projectId={String(selectedVersion.project_id)}
                version={selectedVersion}
                showHeader={false}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
