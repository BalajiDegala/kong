'use client'

import { formatDateForDisplay, formatDateTimeForDisplay } from '@/lib/date-display'
import type { MyTaskRow } from './my-tasks-types'

type MyTasksContextTab = {
  id: string
  label: string
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function entityTitle(task: MyTaskRow): string {
  const code = asText(task.entity_code).trim()
  const name = asText(task.entity_name).trim()
  if (code && name) return `${code} · ${name}`
  if (code) return code
  if (name) return name
  return asText(task.entity_link_label).trim() || `Task ${task.id}`
}

function infoLabel(task: MyTaskRow): string {
  const entityType = asText(task.entity_type).trim().toLowerCase()
  if (entityType === 'shot') return 'Shot Info'
  if (entityType === 'asset') return 'Asset Info'
  if (entityType === 'sequence') return 'Sequence Info'
  if (entityType === 'project') return 'Project Details'
  if (entityType === 'task') return 'Task Info'
  return 'Info'
}

export function MyTasksRightContext(props: {
  task: MyTaskRow | null
  tabs: MyTasksContextTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}) {
  const task = props.task

  if (!task) {
    return (
      <div className="border-b border-zinc-800 bg-zinc-950 px-4 py-4">
        <p className="text-sm text-zinc-500">Select a task from the left queue.</p>
      </div>
    )
  }

  const dueLabel = formatDateForDisplay(task.due_date) || '-'
  const updatedLabel = formatDateTimeForDisplay(task.updated_at) || '-'
  const startLabel = formatDateForDisplay(task.start_date) || '-'
  const endLabel = formatDateForDisplay(task.end_date) || '-'
  const statusLabel = asText(task.entity_status).trim() || asText(task.status).trim() || '-'
  const description = asText(task.entity_description).trim() || `Task: ${asText(task.name).trim() || '-'}`

  return (
    <div className="border-b border-zinc-800 bg-zinc-950">
      <div className="px-4 py-3">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          {asText(task.project_label).trim()} • {asText(task.entity_type_display).trim()}
        </p>
        <div className="mt-2 flex gap-4">
          <div className="h-24 w-36 flex-shrink-0 rounded-md border border-zinc-800 bg-zinc-900">
            {asText(task.entity_thumbnail_url).trim() ? (
              <img
                src={asText(task.entity_thumbnail_url).trim()}
                alt=""
                className="h-full w-full rounded-md object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                No Thumbnail
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-xl font-semibold text-zinc-100">
                {entityTitle(task)}
              </p>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200">
                {statusLabel}
              </span>
            </div>

            <p className="mt-1 truncate text-sm text-zinc-400">{description}</p>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-300 xl:grid-cols-4">
              <p>
                <span className="text-zinc-500">Task: </span>
                <span className="text-zinc-200">{asText(task.name).trim() || `Task ${task.id}`}</span>
              </p>
              <p>
                <span className="text-zinc-500">Pipeline: </span>
                {asText(task.department_label).trim() || '-'}
              </p>
              <p>
                <span className="text-zinc-500">Assigned: </span>
                {asText(task.assignee_name).trim() || '-'}
              </p>
              <p>
                <span className="text-zinc-500">Due: </span>
                {dueLabel}
              </p>
              <p>
                <span className="text-zinc-500">Start: </span>
                {startLabel}
              </p>
              <p>
                <span className="text-zinc-500">End: </span>
                {endLabel}
              </p>
              <p className="xl:col-span-2">
                <span className="text-zinc-500">Sequence: </span>
                {asText(task.entity_sequence_label).trim() || '-'}
              </p>
              <p className="xl:col-span-2">
                <span className="text-zinc-500">Updated: </span>
                {updatedLabel}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-800 px-4">
        <div className="flex overflow-auto">
          {props.tabs.map((tab) => {
            const isActive = props.activeTab === tab.id
            const label = tab.id === 'info' ? infoLabel(task) : tab.label
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => props.onTabChange(tab.id)}
                className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm transition ${
                  isActive
                    ? 'border-amber-500 text-amber-300'
                    : 'border-transparent text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
