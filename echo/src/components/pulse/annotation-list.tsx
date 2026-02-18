'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, Archive, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateAnnotation } from '@/actions/annotations'
import { formatDistanceToNow } from 'date-fns'

interface Annotation {
  id: number
  frame_number: number
  timecode: string | null
  annotation_text: string | null
  note_id: number | null
  status: string
  created_at: string
  author: { id: string; display_name: string | null } | null
}

interface AnnotationRow {
  id: number
  frame_number: number
  timecode: string | null
  annotation_text: string | null
  note_id: number | null
  status: string
  created_at: string
  author_id: string | null
}

interface AnnotationListProps {
  postMediaId?: number
  versionId?: number
  projectId?: string
  currentFrame?: number
  onFrameClick?: (frame: number) => void
  onAnnotationsChange?: () => void
}

export function AnnotationList({
  postMediaId,
  versionId,
  projectId,
  currentFrame,
  onFrameClick,
  onAnnotationsChange,
}: AnnotationListProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all')

  const loadAnnotations = useCallback(async () => {
    const supabase = createClient()
    let query = supabase
      .from('annotations')
      .select('id, frame_number, timecode, annotation_text, note_id, status, created_at, author_id')
      .order('frame_number', { ascending: true })

    if (postMediaId) {
      query = query.eq('post_media_id', postMediaId)
    }
    if (versionId) {
      query = query.eq('version_id', versionId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to load annotations:', error)
      return
    }

    // Resolve author profiles in a second query
    const rows = (data || []) as AnnotationRow[]
    const authorIds = [
      ...new Set(rows.map((annotation) => annotation.author_id).filter((value): value is string => Boolean(value))),
    ]
    const profileMap: Record<string, { id: string; display_name: string | null }> = {}

    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', authorIds)
      if (profiles) {
        for (const p of profiles) profileMap[p.id] = p
      }
    }

    const mappedRows: Annotation[] = rows.map((annotation) => ({
      ...annotation,
      author: annotation.author_id ? profileMap[annotation.author_id] || null : null,
    }))

    setAnnotations(mappedRows)
    setIsLoading(false)
  }, [postMediaId, versionId])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadAnnotations()
    }, 0)

    return () => clearTimeout(timer)
  }, [loadAnnotations])

  const handleStatusChange = async (annotationId: number, status: 'active' | 'resolved' | 'archived') => {
    const result = await updateAnnotation(annotationId, { status })
    if (!result.error) {
      loadAnnotations()
      onAnnotationsChange?.()
    }
  }

  const filtered = annotations.filter(a => {
    if (filter === 'all') return true
    return a.status === filter
  })

  const statusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="h-3.5 w-3.5 text-green-400" />
      case 'archived':
        return <Archive className="h-3.5 w-3.5 text-muted-foreground" />
      default:
        return <Clock className="h-3.5 w-3.5 text-primary" />
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="text-sm font-medium text-foreground/70">
          Annotations ({annotations.length})
        </h3>
        <div className="flex gap-1">
          {(['all', 'active', 'resolved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-2 py-0.5 text-xs rounded transition capitalize
                ${filter === f ? 'bg-secondary text-foreground/80' : 'text-muted-foreground hover:text-foreground/70'}
              `}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-3 text-xs text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-3 text-xs text-muted-foreground text-center">No annotations</div>
        ) : (
          filtered.map(annotation => (
            <div
              key={annotation.id}
              onClick={() => onFrameClick?.(annotation.frame_number)}
              className={`
                w-full text-left px-3 py-2 border-b border-border/50 hover:bg-accent/50 transition cursor-pointer
                ${currentFrame === annotation.frame_number ? 'bg-primary/10 border-l-2 border-l-primary' : ''}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {statusIcon(annotation.status)}
                  <span className="text-xs font-mono text-muted-foreground">
                    F{annotation.frame_number}
                  </span>
                  {annotation.timecode && (
                    <span className="text-xs text-muted-foreground">{annotation.timecode}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {annotation.status === 'active' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStatusChange(annotation.id, 'resolved')
                      }}
                      className="text-xs text-muted-foreground hover:text-green-400 transition"
                      title="Mark resolved"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {annotation.annotation_text && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {annotation.annotation_text}
                </p>
              )}

              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {annotation.author?.display_name || 'Unknown'}
                </span>
                <span className="text-xs text-muted-foreground/70">
                  {formatDistanceToNow(new Date(annotation.created_at), { addSuffix: true })}
                </span>
                {projectId && versionId && annotation.note_id ? (
                  <Link
                    href={`/apex/${projectId}/notes/${annotation.note_id}`}
                    onClick={(event) => event.stopPropagation()}
                    className="text-xs text-primary hover:underline"
                  >
                    Note #{annotation.note_id}
                  </Link>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
