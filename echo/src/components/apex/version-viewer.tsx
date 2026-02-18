'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react'

interface VersionViewerProps {
  version: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate?: (direction: 'prev' | 'next') => void
}

export function VersionViewer({ version, open, onOpenChange, onNavigate }: VersionViewerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (open && version?.file_path) {
      loadSignedUrl()
    }
  }, [open, version])

  async function loadSignedUrl() {
    setIsLoading(true)
    const supabase = createClient()

    // Generate signed URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from('versions')
      .createSignedUrl(version.file_path, 3600)

    if (error) {
      console.error('Error generating signed URL:', error)
      setSignedUrl(null)
    } else {
      setSignedUrl(data.signedUrl)
    }
    setIsLoading(false)
  }

  function getFileType(filePath: string) {
    const ext = filePath?.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image'
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) return 'video'
    if (ext === 'pdf') return 'pdf'
    return 'unknown'
  }

  async function handleDownload() {
    if (!signedUrl) return

    const link = document.createElement('a')
    link.href = signedUrl
    link.download = version.code || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!version) return null

  const fileType = getFileType(version.file_path || '')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">{version.code}</h3>
              <p className="text-sm text-muted-foreground">
                Version {version.version_number} • {version.entity_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigate && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onNavigate('prev')}
                  className="text-white hover:bg-white/10"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onNavigate('next')}
                  className="text-white hover:bg-white/10"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              disabled={!signedUrl}
              className="text-white hover:bg-white/10"
            >
              <Download className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[95vh] items-center justify-center p-16">
          {isLoading ? (
            <div className="text-white">Loading...</div>
          ) : !signedUrl ? (
            <div className="text-white">Failed to load file</div>
          ) : fileType === 'image' ? (
            <img
              src={signedUrl}
              alt={version.code}
              className="max-h-full max-w-full object-contain"
            />
          ) : fileType === 'video' ? (
            <video
              src={signedUrl}
              controls
              autoPlay
              className="max-h-full max-w-full"
            >
              Your browser does not support the video tag.
            </video>
          ) : fileType === 'pdf' ? (
            <iframe
              src={signedUrl}
              className="h-full w-full"
              title={version.code}
            />
          ) : (
            <div className="text-center text-white">
              <p className="mb-4">Preview not available for this file type</p>
              <Button onClick={handleDownload} disabled={!signedUrl}>
                <Download className="mr-2 h-4 w-4" />
                Download File
              </Button>
            </div>
          )}
        </div>

        {/* Footer with description */}
        {version.description && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <p className="text-sm text-foreground/70">{version.description}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
