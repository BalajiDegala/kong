'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Play, Upload } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { VersionMediaPlayer } from '@/components/apex/version-media-player'
import { VersionReviewWorkspace, type VersionReviewVersion } from '@/components/apex/version-review-workspace'

interface VersionActivityPanelProps {
  projectId: string
  version: VersionReviewVersion
  actorName: string
  createdAt?: string | null
}

export function VersionActivityPanel({
  projectId,
  version,
  actorName,
  createdAt,
}: VersionActivityPanelProps) {
  const [openPlayer, setOpenPlayer] = useState(false)
  const versionLabel = version.code || `v${version.version_number || version.id}`
  const createdAgo = (() => {
    if (!createdAt) return null
    const parsed = new Date(createdAt)
    if (Number.isNaN(parsed.getTime())) return null
    return formatDistanceToNow(parsed, { addSuffix: true })
  })()

  return (
    <>
      <div className="rounded-md border border-border bg-background/50 p-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-blue-400">
            <Upload className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground/90">{actorName}</span> has uploaded a
              version <span className="font-medium text-foreground/90">{versionLabel}</span>
            </p>
            <button
              type="button"
              onClick={() => setOpenPlayer(true)}
              className="group relative mt-3 block max-w-xl overflow-hidden rounded-md"
            >
              <VersionMediaPlayer
                filePath={version.file_path}
                movieUrl={version.movie_url}
                uploadedMovie={version.uploaded_movie}
                uploadedMovieMp4={version.uploaded_movie_mp4}
                uploadedMovieWebm={version.uploaded_movie_webm}
                previewMode={true}
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/65 text-white transition group-hover:scale-105">
                  <Play className="ml-0.5 h-5 w-5" />
                </span>
              </span>
              <span className="sr-only">Open version player</span>
            </button>
          </div>
          {createdAgo ? (
            <span className="whitespace-nowrap text-xs text-muted-foreground">{createdAgo}</span>
          ) : null}
        </div>
      </div>

      <Dialog open={openPlayer} onOpenChange={setOpenPlayer}>
        <DialogContent
          className="h-[92vh] !w-[96vw] !max-w-[96vw] sm:!max-w-[96vw] xl:!max-w-[1600px] overflow-hidden border-border bg-background p-0 text-foreground"
          showCloseButton={true}
        >
          <DialogTitle className="sr-only">Version Review Player</DialogTitle>
          <DialogDescription className="sr-only">
            Review version video, add frame annotations, and save notes.
          </DialogDescription>
          <div className="h-full overflow-y-auto">
            <VersionReviewWorkspace projectId={projectId} version={version} showHeader={false} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
