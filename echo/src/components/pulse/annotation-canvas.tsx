'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import type { AnnotationTool } from './annotation-toolbar'

interface AnnotationShape {
  type: string
  x?: number
  y?: number
  width?: number
  height?: number
  points?: number[] | number[][]
  text?: string
  fontSize?: number
  color: string
  strokeWidth: number
}

interface AnnotationCanvasProps {
  width: number
  height: number
  isDrawing: boolean
  activeTool: AnnotationTool
  activeColor: string
  strokeWidth: number
  existingAnnotations?: AnnotationShape[]
  onAnnotationCreated?: (shape: AnnotationShape) => void
}

export function AnnotationCanvas({
  width,
  height,
  isDrawing,
  activeTool,
  activeColor,
  strokeWidth,
  existingAnnotations = [],
  onAnnotationCreated,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null)
  const [freehandPoints, setFreehandPoints] = useState<number[][]>([])
  const [shapes, setShapes] = useState<AnnotationShape[]>([])

  // Sync existing annotations
  useEffect(() => {
    setShapes(existingAnnotations)
  }, [existingAnnotations])

  const getCanvasPoint = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = width / rect.width
    const scaleY = height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [width, height])

  // Render all shapes
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    // Draw saved shapes
    for (const shape of shapes) {
      drawShape(ctx, shape)
    }

    // Draw current shape being drawn
    if (isMouseDown && startPoint && currentPoint) {
      if (activeTool === 'rectangle') {
        drawShape(ctx, {
          type: 'rectangle',
          x: Math.min(startPoint.x, currentPoint.x),
          y: Math.min(startPoint.y, currentPoint.y),
          width: Math.abs(currentPoint.x - startPoint.x),
          height: Math.abs(currentPoint.y - startPoint.y),
          color: activeColor,
          strokeWidth,
        })
      } else if (activeTool === 'arrow') {
        drawShape(ctx, {
          type: 'arrow',
          points: [startPoint.x, startPoint.y, currentPoint.x, currentPoint.y],
          color: activeColor,
          strokeWidth,
        })
      } else if (activeTool === 'freehand' && freehandPoints.length > 0) {
        drawShape(ctx, {
          type: 'freehand',
          points: freehandPoints,
          color: activeColor,
          strokeWidth,
        })
      }
    }
  }, [shapes, isMouseDown, startPoint, currentPoint, activeTool, activeColor, strokeWidth, freehandPoints, width, height])

  useEffect(() => {
    render()
  }, [render])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDrawing) return
    const pt = getCanvasPoint(e)
    setIsMouseDown(true)
    setStartPoint(pt)
    setCurrentPoint(pt)
    if (activeTool === 'freehand') {
      setFreehandPoints([[pt.x, pt.y]])
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || !isDrawing) return
    const pt = getCanvasPoint(e)
    setCurrentPoint(pt)
    if (activeTool === 'freehand') {
      setFreehandPoints(prev => [...prev, [pt.x, pt.y]])
    }
  }

  const handleMouseUp = () => {
    if (!isMouseDown || !startPoint || !currentPoint) {
      setIsMouseDown(false)
      return
    }

    let newShape: AnnotationShape | null = null

    if (activeTool === 'rectangle') {
      const w = Math.abs(currentPoint.x - startPoint.x)
      const h = Math.abs(currentPoint.y - startPoint.y)
      if (w > 5 && h > 5) {
        newShape = {
          type: 'rectangle',
          x: Math.min(startPoint.x, currentPoint.x),
          y: Math.min(startPoint.y, currentPoint.y),
          width: w,
          height: h,
          color: activeColor,
          strokeWidth,
        }
      }
    } else if (activeTool === 'arrow') {
      const dx = currentPoint.x - startPoint.x
      const dy = currentPoint.y - startPoint.y
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        newShape = {
          type: 'arrow',
          points: [startPoint.x, startPoint.y, currentPoint.x, currentPoint.y],
          color: activeColor,
          strokeWidth,
        }
      }
    } else if (activeTool === 'freehand' && freehandPoints.length > 2) {
      newShape = {
        type: 'freehand',
        points: freehandPoints,
        color: activeColor,
        strokeWidth,
      }
    } else if (activeTool === 'text') {
      const text = prompt('Enter annotation text:')
      if (text) {
        newShape = {
          type: 'text',
          x: startPoint.x,
          y: startPoint.y,
          text,
          fontSize: 16,
          color: activeColor,
          strokeWidth,
        }
      }
    }

    if (newShape) {
      setShapes(prev => [...prev, newShape])
      onAnnotationCreated?.(newShape)
    }

    setIsMouseDown(false)
    setStartPoint(null)
    setCurrentPoint(null)
    setFreehandPoints([])
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`absolute inset-0 w-full h-full ${isDrawing ? 'cursor-crosshair' : 'pointer-events-none'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  )
}

function drawShape(ctx: CanvasRenderingContext2D, shape: AnnotationShape) {
  ctx.strokeStyle = shape.color
  ctx.fillStyle = shape.color
  ctx.lineWidth = shape.strokeWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  switch (shape.type) {
    case 'rectangle':
      ctx.strokeRect(shape.x!, shape.y!, shape.width!, shape.height!)
      // Semi-transparent fill
      ctx.fillStyle = shape.color + '15'
      ctx.fillRect(shape.x!, shape.y!, shape.width!, shape.height!)
      break

    case 'arrow': {
      const pts = shape.points as number[]
      const [x1, y1, x2, y2] = pts
      // Line
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      // Arrowhead
      const angle = Math.atan2(y2 - y1, x2 - x1)
      const headLength = 12
      ctx.beginPath()
      ctx.moveTo(x2, y2)
      ctx.lineTo(
        x2 - headLength * Math.cos(angle - Math.PI / 6),
        y2 - headLength * Math.sin(angle - Math.PI / 6)
      )
      ctx.moveTo(x2, y2)
      ctx.lineTo(
        x2 - headLength * Math.cos(angle + Math.PI / 6),
        y2 - headLength * Math.sin(angle + Math.PI / 6)
      )
      ctx.stroke()
      break
    }

    case 'freehand': {
      const pts = shape.points as number[][]
      if (pts.length < 2) break
      ctx.beginPath()
      ctx.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i][0], pts[i][1])
      }
      ctx.stroke()
      break
    }

    case 'text':
      ctx.font = `${shape.fontSize || 16}px sans-serif`
      ctx.fillText(shape.text || '', shape.x!, shape.y!)
      break
  }
}
