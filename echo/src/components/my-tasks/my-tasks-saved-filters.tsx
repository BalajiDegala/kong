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
    <div className="space-y-3 border-b border-zinc-800 pb-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
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
                  ? 'border-amber-500/70 bg-amber-500/10 text-amber-200'
                  : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
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
              className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button
              type="button"
              onClick={saveFilter}
              disabled={!canSave}
              className={`rounded px-2.5 py-1.5 text-sm font-medium transition ${
                canSave
                  ? 'bg-amber-500 text-black hover:bg-amber-400'
                  : 'cursor-not-allowed bg-zinc-800 text-zinc-500'
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
                        ? 'border-amber-500/70 bg-amber-500/10'
                        : 'border-zinc-800 bg-zinc-900/60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => props.onApplySavedFilter(filter)}
                      className="min-w-0 flex-1 truncate text-left text-sm text-zinc-200 hover:text-amber-300"
                    >
                      {filter.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => props.onDeleteSavedFilter(filter)}
                      className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-red-300"
                      aria-label={`Delete saved filter ${filter.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No saved filters yet.</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          Saved filters table not found yet. Run the new migration first.
        </p>
      )}
    </div>
  )
}
