'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { MyTasksSavedFilterRow } from './my-tasks-types'

export type MyTasksPresetFilter = {
  id: string
  label: string
}

export function MyTasksSavedFilters(props: {
  presets: MyTasksPresetFilter[]
  activePresetId: string | null
  onApplyPreset: (presetId: string) => void
  savedFilters: MyTasksSavedFilterRow[]
  activeSavedFilterId: number | null
  onApplySavedFilter: (filter: MyTasksSavedFilterRow) => void
  onDeleteSavedFilter: (filter: MyTasksSavedFilterRow) => void
  onSaveCurrentFilter: (name: string) => void
  savedFiltersAvailable: boolean
}) {
  const [name, setName] = useState('')

  const canSave = props.savedFiltersAvailable && name.trim().length > 0

  const saveFilter = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    props.onSaveCurrentFilter(trimmed)
    setName('')
  }

  return (
    <div className="space-y-3 border-b border-border pb-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          My Task Filters
        </p>
      </div>

      <div className="space-y-1">
        {props.presets.map((preset) => {
          const active = props.activePresetId === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => props.onApplyPreset(preset.id)}
              className={`w-full rounded border px-2 py-1.5 text-left text-sm transition ${
                active
                  ? 'border-primary/70 bg-primary/10 text-primary'
                  : 'border-border bg-card/60 text-foreground/70 hover:border-border hover:bg-card'
              }`}
            >
              {preset.label}
            </button>
          )
        })}
      </div>

      {props.savedFiltersAvailable ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  saveFilter()
                }
              }}
              placeholder="Save current filter as..."
              className="w-full rounded border border-border bg-card px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={saveFilter}
              disabled={!canSave}
              className={`rounded px-2.5 py-1.5 text-sm font-medium transition ${
                canSave
                  ? 'bg-primary text-black hover:bg-primary'
                  : 'cursor-not-allowed bg-accent text-muted-foreground'
              }`}
            >
              Save
            </button>
          </div>

          {props.savedFilters.length > 0 ? (
            <div className="space-y-1">
              {props.savedFilters.map((filter) => {
                const active = props.activeSavedFilterId === filter.id
                return (
                  <div
                    key={filter.id}
                    className={`flex items-center gap-2 rounded border px-2 py-1.5 ${
                      active
                        ? 'border-primary/70 bg-primary/10'
                        : 'border-border bg-card/60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => props.onApplySavedFilter(filter)}
                      className="min-w-0 flex-1 truncate text-left text-sm text-foreground/80 hover:text-primary/80"
                    >
                      {filter.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => props.onDeleteSavedFilter(filter)}
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-red-300"
                      aria-label={`Delete saved filter ${filter.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No saved filters yet.</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Saved filters table not found yet. Run the new migration first.
        </p>
      )}
    </div>
  )
}
