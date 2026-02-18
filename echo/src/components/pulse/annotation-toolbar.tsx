'use client'

import { Square, ArrowUpRight, Pencil, Type, Palette } from 'lucide-react'

export type AnnotationTool = 'rectangle' | 'arrow' | 'freehand' | 'text'

const TOOLS: { id: AnnotationTool; icon: typeof Square; label: string }[] = [
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
  { id: 'freehand', icon: Pencil, label: 'Freehand' },
  { id: 'text', icon: Type, label: 'Text' },
]

const COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ffffff', // white
]

const STROKE_WIDTHS = [1, 2, 3, 5, 8]

interface AnnotationToolbarProps {
  activeTool: AnnotationTool
  activeColor: string
  strokeWidth: number
  annotationText: string
  onToolChange: (tool: AnnotationTool) => void
  onColorChange: (color: string) => void
  onStrokeWidthChange: (width: number) => void
  onAnnotationTextChange: (text: string) => void
  onClear?: () => void
  onSave?: () => void
  isSaving?: boolean
}

export function AnnotationToolbar({
  activeTool,
  activeColor,
  strokeWidth,
  annotationText,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onAnnotationTextChange,
  onClear,
  onSave,
  isSaving,
}: AnnotationToolbarProps) {
  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2">
      {/* Tools */}
      <div className="flex items-center gap-1">
        {TOOLS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onToolChange(id)}
            title={label}
            className={`
              p-1.5 rounded transition
              ${activeTool === id
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground/80 hover:bg-accent'
              }
            `}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-secondary" />

      {/* Colors */}
      <div className="flex items-center gap-1">
        {COLORS.map(color => (
          <button
            key={color}
            onClick={() => onColorChange(color)}
            className={`
              h-5 w-5 rounded-full border-2 transition
              ${activeColor === color ? 'border-white scale-110' : 'border-transparent hover:border-border'}
            `}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="w-px h-5 bg-secondary" />

      {/* Stroke width */}
      <div className="flex items-center gap-1">
        {STROKE_WIDTHS.map(w => (
          <button
            key={w}
            onClick={() => onStrokeWidthChange(w)}
            title={`${w}px`}
            className={`
              flex items-center justify-center h-6 w-6 rounded transition
              ${strokeWidth === w
                ? 'bg-secondary text-white'
                : 'text-muted-foreground hover:text-foreground/70 hover:bg-accent'
              }
            `}
          >
            <div
              className="rounded-full bg-current"
              style={{ width: Math.min(w + 2, 10), height: Math.min(w + 2, 10) }}
            />
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-secondary" />

      {/* Comment Text */}
      <input
        type="text"
        value={annotationText}
        onChange={(e) => onAnnotationTextChange(e.target.value)}
        placeholder="Add comment (optional)"
        className="flex-1 min-w-0 px-2 py-1 text-xs bg-accent border border-border rounded text-foreground/80 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />

      <div className="w-px h-5 bg-secondary" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {onClear && (
          <button
            onClick={onClear}
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground/80 hover:bg-accent rounded transition"
          >
            Clear
          </button>
        )}
        {onSave && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary disabled:opacity-50 transition"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>
    </div>
  )
}
