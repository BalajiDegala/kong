'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Play, Pause, SkipBack, SkipForward,
  ChevronLeft, ChevronRight, Maximize2,
} from 'lucide-react'

interface VideoPlayerProps {
  url: string
  fps?: number
  onFrameChange?: (frame: number) => void
  onPause?: () => void
  onPlay?: () => void
  width?: string | number
  height?: string | number
  onFullscreen?: () => void
}

export function VideoPlayer({
  url,
  fps = 24,
  onFrameChange,
  onPause,
  onPlay,
  width = '100%',
  height = '100%',
  onFullscreen,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const animFrameRef = useRef<number>(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentFrame, setCurrentFrame] = useState(1)
  const [totalFrames, setTotalFrames] = useState(0)

  const frameDuration = 1 / fps

  const timeToFrame = useCallback((time: number) => {
    return Math.floor(time * fps) + 1
  }, [fps])

  const frameToTime = useCallback((frame: number) => {
    return (frame - 1) / fps
  }, [fps])

  const formatTimecode = useCallback((time: number) => {
    const h = Math.floor(time / 3600)
    const m = Math.floor((time % 3600) / 60)
    const s = Math.floor(time % 60)
    const f = Math.floor((time % 1) * fps)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`
  }, [fps])

  // Sync time/frame during playback using requestAnimationFrame
  const updateProgress = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const t = video.currentTime
    setCurrentTime(t)
    const frame = timeToFrame(t)
    setCurrentFrame(prev => {
      if (prev !== frame) {
        // Defer callback to avoid setState during render
        setTimeout(() => onFrameChange?.(frame), 0)
        return frame
      }
      return prev
    })
    if (!video.paused) {
      animFrameRef.current = requestAnimationFrame(updateProgress)
    }
  }, [timeToFrame, onFrameChange])

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    setDuration(video.duration)
    setTotalFrames(Math.floor(video.duration * fps))
  }, [fps])

  const handleVideoPlay = useCallback(() => {
    setIsPlaying(true)
    onPlay?.()
    animFrameRef.current = requestAnimationFrame(updateProgress)
  }, [onPlay, updateProgress])

  const handleVideoPause = useCallback(() => {
    setIsPlaying(false)
    onPause?.()
    cancelAnimationFrame(animFrameRef.current)
    // Sync final position
    const video = videoRef.current
    if (video) {
      setCurrentTime(video.currentTime)
      const frame = timeToFrame(video.currentTime)
      setCurrentFrame(frame)
      onFrameChange?.(frame)
    }
  }, [onPause, timeToFrame, onFrameChange])

  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false)
    cancelAnimationFrame(animFrameRef.current)
  }, [])

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [])

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current
    if (video) {
      video.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  const seekToFrame = useCallback((frame: number) => {
    const clamped = Math.max(1, Math.min(frame, totalFrames))
    const time = frameToTime(clamped)
    seekTo(time)
    setCurrentFrame(clamped)
    onFrameChange?.(clamped)
  }, [totalFrames, frameToTime, onFrameChange, seekTo])

  const stepFrame = useCallback((delta: number) => {
    const video = videoRef.current
    if (video && !video.paused) {
      video.pause()
    }
    seekToFrame(currentFrame + delta)
  }, [currentFrame, seekToFrame])

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }, [])

  const handleScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    seekTo(time)
    const frame = timeToFrame(time)
    setCurrentFrame(frame)
    onFrameChange?.(frame)
  }, [timeToFrame, onFrameChange, seekTo])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          handlePlayPause()
          break
        case 'ArrowLeft':
          e.preventDefault()
          stepFrame(-1)
          break
        case 'ArrowRight':
          e.preventDefault()
          stepFrame(1)
          break
        case 'Home':
          e.preventDefault()
          seekToFrame(1)
          break
        case 'End':
          e.preventDefault()
          seekToFrame(totalFrames)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePlayPause, stepFrame, seekToFrame, totalFrames])

  return (
    <div className="flex flex-col bg-black rounded-lg overflow-hidden h-full">
      {/* Video */}
      <div className="relative flex-1 min-h-0">
        <video
          ref={videoRef}
          src={url}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={handleVideoPlay}
          onPause={handleVideoPause}
          onEnded={handleVideoEnded}
          className="absolute inset-0 w-full h-full object-contain"
          playsInline
          preload="auto"
        />
      </div>

      {/* Controls */}
      <div className="bg-zinc-900 border-t border-zinc-800 px-3 py-2">
        {/* Scrubber */}
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={frameDuration}
          value={currentTime}
          onChange={handleScrub}
          className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-amber-400"
        />

        <div className="flex items-center justify-between mt-1.5">
          {/* Left: transport */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => seekToFrame(1)}
              className="p-1 text-zinc-400 hover:text-white transition"
              title="Go to start"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={() => stepFrame(-1)}
              className="p-1 text-zinc-400 hover:text-white transition"
              title="Previous frame"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handlePlayPause}
              className="p-1.5 text-white bg-zinc-700 hover:bg-zinc-600 rounded transition"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={() => stepFrame(1)}
              className="p-1 text-zinc-400 hover:text-white transition"
              title="Next frame"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => seekToFrame(totalFrames)}
              className="p-1 text-zinc-400 hover:text-white transition"
              title="Go to end"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          {/* Center: timecode + frame */}
          <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
            <span>{formatTimecode(currentTime)}</span>
            <span className="text-zinc-600">|</span>
            <span>Frame {currentFrame} / {totalFrames || '—'}</span>
          </div>

          {/* Right: fps + fullscreen */}
          <div className="flex items-center gap-2">
            <div className="text-xs text-zinc-500">
              {fps} fps
            </div>
            {onFullscreen && (
              <button
                onClick={onFullscreen}
                className="p-1 text-zinc-400 hover:text-white transition"
                title="Fullscreen"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
