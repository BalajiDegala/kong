'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any
import {
  Play, Pause, SkipBack, SkipForward,
  ChevronLeft, ChevronRight, Maximize2
} from 'lucide-react'

interface VideoPlayerProps {
  url: string
  fps?: number
  onFrameChange?: (frame: number) => void
  onPause?: () => void
  onPlay?: () => void
  width?: string | number
  height?: string | number
}

export function VideoPlayer({
  url,
  fps = 24,
  onFrameChange,
  onPause,
  onPlay,
  width = '100%',
  height = '100%',
}: VideoPlayerProps) {
  const playerRef = useRef<any>(null)
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

  const handleProgress = useCallback(({ playedSeconds }: { playedSeconds: number }) => {
    setCurrentTime(playedSeconds)
    const frame = timeToFrame(playedSeconds)
    if (frame !== currentFrame) {
      setCurrentFrame(frame)
      onFrameChange?.(frame)
    }
  }, [timeToFrame, currentFrame, onFrameChange])

  const handleDuration = useCallback((dur: number) => {
    setDuration(dur)
    setTotalFrames(Math.floor(dur * fps))
  }, [fps])

  const seekToFrame = useCallback((frame: number) => {
    const clamped = Math.max(1, Math.min(frame, totalFrames))
    const time = frameToTime(clamped)
    playerRef.current?.seekTo(time, 'seconds')
    setCurrentFrame(clamped)
    setCurrentTime(time)
    onFrameChange?.(clamped)
  }, [totalFrames, frameToTime, onFrameChange])

  const stepFrame = useCallback((delta: number) => {
    setIsPlaying(false)
    seekToFrame(currentFrame + delta)
  }, [currentFrame, seekToFrame])

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false)
      onPause?.()
    } else {
      setIsPlaying(true)
      onPlay?.()
    }
  }, [isPlaying, onPause, onPlay])

  const handleScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    playerRef.current?.seekTo(time, 'seconds')
    setCurrentTime(time)
    const frame = timeToFrame(time)
    setCurrentFrame(frame)
    onFrameChange?.(frame)
  }, [timeToFrame, onFrameChange])

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
    <div className="flex flex-col bg-black rounded-lg overflow-hidden">
      {/* Video */}
      <div className="relative" style={{ width, height }}>
        <ReactPlayer
          ref={playerRef}
          url={url}
          playing={isPlaying}
          onProgress={handleProgress}
          onDuration={handleDuration}
          onPause={() => { setIsPlaying(false); onPause?.() }}
          onPlay={() => { setIsPlaying(true); onPlay?.() }}
          progressInterval={1000 / fps}
          width="100%"
          height="100%"
          style={{ position: 'absolute', top: 0, left: 0 }}
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

          {/* Right: fps */}
          <div className="text-xs text-zinc-500">
            {fps} fps
          </div>
        </div>
      </div>
    </div>
  )
}
