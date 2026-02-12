'use client'

import { useState, useEffect } from 'react'
import { X, Play, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface MediaItem {
  id: number
  storage_path: string
  file_name: string
  mime_type: string
  media_type: 'image' | 'video'
  width?: number
  height?: number
}

interface PostMediaGalleryProps {
  media: MediaItem[]
  onVideoSelect?: (media: MediaItem) => void
}

export function PostMediaGallery({ media, onVideoSelect }: PostMediaGalleryProps) {
  const [signedUrls, setSignedUrls] = useState<Record<number, string>>({})
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    if (media.length === 0) return

    const supabase = createClient()
    const paths = media.map(m => m.storage_path)

    supabase.storage
      .from('post-media')
      .createSignedUrls(paths, 3600)
      .then(({ data }) => {
        if (data) {
          const urls: Record<number, string> = {}
          data.forEach((item, index) => {
            if (item.signedUrl) {
              urls[media[index].id] = item.signedUrl
            }
          })
          setSignedUrls(urls)
        }
      })
  }, [media])

  if (media.length === 0) return null

  const gridClass =
    media.length === 1
      ? 'grid-cols-1'
      : media.length === 2
        ? 'grid-cols-2'
        : media.length === 3
          ? 'grid-cols-2'
          : 'grid-cols-2'

  return (
    <>
      <div className={`grid ${gridClass} gap-1 rounded-lg overflow-hidden`}>
        {media.map((item, index) => {
          const url = signedUrls[item.id]
          if (!url) {
            return (
              <div
                key={item.id}
                className="bg-zinc-800 animate-pulse aspect-video"
              />
            )
          }

          if (item.media_type === 'video') {
            return (
              <button
                key={item.id}
                onClick={() => onVideoSelect?.(item)}
                className="relative aspect-video bg-zinc-900 group"
              >
                <video
                  src={url}
                  className="h-full w-full object-cover"
                  preload="metadata"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition">
                  <div className="rounded-full bg-white/90 p-3">
                    <Play className="h-6 w-6 text-zinc-900 fill-zinc-900" />
                  </div>
                </div>
              </button>
            )
          }

          return (
            <button
              key={item.id}
              onClick={() => setLightboxIndex(index)}
              className="aspect-video bg-zinc-900 overflow-hidden"
            >
              <img
                src={url}
                alt={item.file_name}
                className="h-full w-full object-cover hover:scale-105 transition duration-300"
              />
            </button>
          )
        })}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(null) }}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
          >
            <X className="h-6 w-6" />
          </button>

          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1) }}
              className="absolute left-4 text-white/70 hover:text-white p-2"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {lightboxIndex < media.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1) }}
              className="absolute right-4 text-white/70 hover:text-white p-2"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          <div onClick={e => e.stopPropagation()} className="max-h-[90vh] max-w-[90vw]">
            {media[lightboxIndex].media_type === 'video' ? (
              <video
                src={signedUrls[media[lightboxIndex].id]}
                controls
                autoPlay
                className="max-h-[90vh] max-w-[90vw]"
              />
            ) : (
              <img
                src={signedUrls[media[lightboxIndex].id]}
                alt={media[lightboxIndex].file_name}
                className="max-h-[90vh] max-w-[90vw] object-contain"
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}
