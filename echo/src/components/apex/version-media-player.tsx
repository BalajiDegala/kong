'use client'

import { useEffect, useMemo, useState } from 'react'
import ReactPlayer from 'react-player'
import { createClient } from '@/lib/supabase/client'

interface VersionMediaPlayerProps {
  filePath?: string | null
  movieUrl?: string | null
  uploadedMovie?: string | null
  uploadedMovieMp4?: string | null
  uploadedMovieWebm?: string | null
  previewMode?: boolean
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

export function VersionMediaPlayer({
  filePath,
  movieUrl,
  uploadedMovie,
  uploadedMovieMp4,
  uploadedMovieWebm,
  previewMode = false,
}: VersionMediaPlayerProps) {
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const candidates = useMemo(
    () => [filePath, uploadedMovieMp4, uploadedMovieWebm, uploadedMovie, movieUrl].filter(Boolean) as string[],
    [filePath, movieUrl, uploadedMovie, uploadedMovieMp4, uploadedMovieWebm]
  )

  useEffect(() => {
    let cancelled = false

    async function resolvePlaybackUrl() {
      setError(null)
      setPlaybackUrl(null)

      if (candidates.length === 0) {
        setError('No media file is attached to this version.')
        return
      }

      const supabase = createClient()

      for (const candidate of candidates) {
        if (isHttpUrl(candidate)) {
          if (!cancelled) setPlaybackUrl(candidate)
          return
        }

        const { data, error: signedUrlError } = await supabase.storage
          .from('versions')
          .createSignedUrl(candidate, 3600)

        if (!signedUrlError && data?.signedUrl) {
          if (!cancelled) setPlaybackUrl(data.signedUrl)
          return
        }
      }

      if (!cancelled) {
        setError('Unable to load a playable URL for this version media.')
      }
    }

    void resolvePlaybackUrl()

    return () => {
      cancelled = true
    }
  }, [candidates])

  if (error) {
    return (
      <div className="rounded-md border border-border bg-card/50 p-4 text-sm text-muted-foreground">
        {error}
      </div>
    )
  }

  if (!playbackUrl) {
    return (
      <div className="rounded-md border border-border bg-card/50 p-4 text-sm text-muted-foreground">
        Loading version media...
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-black">
      <div className={`aspect-video w-full ${previewMode ? 'pointer-events-none' : ''}`}>
        <ReactPlayer
          src={playbackUrl}
          width="100%"
          height="100%"
          controls={!previewMode}
          muted={previewMode}
          crossOrigin="anonymous"
        />
      </div>
    </div>
  )
}
