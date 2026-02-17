'use client'

import type {
  MyTasksFilterKey,
  MyTasksFilterSection,
  MyTasksFilterState,
  MyTasksSavedFilterRow,
} from './my-tasks-types'
import {
  MyTasksSavedFilters,
  type MyTasksPresetFilter,
} from './my-tasks-saved-filters'

function optionChecked(
  state: MyTasksFilterState,
  key: MyTasksFilterKey,
  value: string
): boolean {
  return state[key].includes(value as never)
}

export function MyTasksFilterDrawer(props: {
  open: boolean
  onClose: () => void
  filterCount: number
  filterState: MyTasksFilterState
  sections: MyTasksFilterSection[]
  onToggleOption: (key: MyTasksFilterKey, value: string) => void
  onClearAll: () => void
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
  if (!props.open) return null

  return (
    <>
      <button
        type="button"
        aria-label="Close filters"
        className="fixed inset-0 z-30 cursor-default bg-black/20"
        onClick={props.onClose}
      />
      <div
        className="absolute left-0 top-full z-40 mt-2 w-[24rem] max-w-[calc(100vw-2rem)] rounded-md border border-zinc-800 bg-zinc-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
          <p className="text-sm font-medium text-zinc-100">
            Filters {props.filterCount > 0 ? `(${props.filterCount})` : ''}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={props.onClearAll}
              className="text-xs text-zinc-400 hover:text-zinc-100"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={props.onClose}
              className="text-xs text-zinc-500 hover:text-zinc-100"
            >
              Close
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-3">
          <MyTasksSavedFilters
            presets={props.presets}
            activePresetId={props.activePresetId}
            onApplyPreset={props.onApplyPreset}
            savedFilters={props.savedFilters}
            activeSavedFilterId={props.activeSavedFilterId}
            onApplySavedFilter={props.onApplySavedFilter}
            onDeleteSavedFilter={props.onDeleteSavedFilter}
            onSaveCurrentFilter={props.onSaveCurrentFilter}
            savedFiltersAvailable={props.savedFiltersAvailable}
          />

          {props.sections.map((section) => (
            <div key={section.key}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                {section.label}
              </p>
              {section.options.length === 0 ? (
                <p className="text-xs text-zinc-600">No options in this view.</p>
              ) : (
                <div className="space-y-1">
                  {section.options.map((option) => {
                    const checked = optionChecked(props.filterState, section.key, option.value)
                    return (
                      <label
                        key={`${section.key}:${option.value}`}
                        className="flex cursor-pointer items-center justify-between rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 text-sm hover:border-zinc-700"
                      >
                        <span className="min-w-0 truncate text-zinc-200">
                          {option.label}
                        </span>
                        <span className="ml-2 flex items-center gap-2">
                          <span className="text-xs text-zinc-500">{option.count}</span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => props.onToggleOption(section.key, option.value)}
                            className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500"
                          />
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
