'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, CheckCircle, Archive, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateAnnotation } from '@/actions/annotations'
import { formatDistanceToNow } from 'date-fns'

interface Annotation {
  id: number
  frame_number: number
  timecode: string | null
  annotation_text: string | null
  status: string
  created_at: string
  author: { id: string; display_name: string } | null
}

interface AnnotationListProps {
  postMediaId?: number
  versionId?: number
  currentFrame?: number
  onFrameClick?: (frame: number) => void
  onAnnotationsChange?: () => void
}

export function AnnotationList({
  postMediaId,
  versionId,
  currentFrame,
  onFrameClick,
  onAnnotationsChange,
}: AnnotationListProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all')

  const loadAnnotations = async () => {
    const supabase = createClient()
    let query = supabase
      .from('annotations')
      .select('id, frame_number, timecode, annotation_text, status, created_at, author_id')
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
    const rows = data || []
    const authorIds = [...new Set(rows.map(a => a.author_id).filter(Boolean))]
    const profileMap: Record<string, any> = {}

    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', authorIds)
      if (profiles) {
        for (const p of profiles) profileMap[p.id] = p
      }
    }

    setAnnotations(rows.map(a => ({ ...a, author: profileMap[a.author_id] || null })) as any)
    setIsLoading(false)
  }

  useEffect(() => {
    loadAnnotations()
  }, [postMediaId, versionId])

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
        return <Archive className="h-3.5 w-3.5 text-zinc-500" />
      default:
        return <Clock className="h-3.5 w-3.5 text-amber-400" />
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-300">
          Annotations ({annotations.length})
        </h3>
        <div className="flex gap-1">
          {(['all', 'active', 'resolved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-2 py-0.5 text-xs rounded transition capitalize
                ${filter === f ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}
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
          <div className="p-3 text-xs text-zinc-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-3 text-xs text-zinc-500 text-center">No annotations</div>
        ) : (
          filtered.map(annotation => (
            <button
              key={annotation.id}
              onClick={() => onFrameClick?.(annotation.frame_number)}
              className={`
                w-full text-left px-3 py-2 border-b border-zinc-800/50 hover:bg-zinc-800/50 transition
                ${currentFrame === annotation.frame_number ? 'bg-amber-500/10 border-l-2 border-l-amber-500' : ''}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {statusIcon(annotation.status)}
                  <span className="text-xs font-mono text-zinc-400">
                    F{annotation.frame_number}
                  </span>
                  {annotation.timecode && (
                    <span className="text-xs text-zinc-600">{annotation.timecode}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {annotation.status === 'active' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStatusChange(annotation.id, 'resolved')
                      }}
                      className="text-xs text-zinc-500 hover:text-green-400 transition"
                      title="Mark resolved"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {annotation.annotation_text && (
                <p className="text-xs text-zinc-400 mt-1 truncate">
                  {annotation.annotation_text}
                </p>
              )}

              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-zinc-600">
                  {annotation.author?.display_name || 'Unknown'}
                </span>
                <span className="text-xs text-zinc-700">
                  {formatDistanceToNow(new Date(annotation.created_at), { addSuffix: true })}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
