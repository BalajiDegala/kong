'use client'

import { asText, getMyTasksBucket } from '@/lib/fields'
import type { MyTaskRow } from './my-tasks-types'
import { buildDateGroups, queueDateLabel } from './my-tasks-utils'

function bucketDotClass(task: MyTaskRow): string {
  const bucket = getMyTasksBucket(task.status)
  if (bucket === 'done') return 'bg-green-500'
  if (bucket === 'upcoming') return 'bg-blue-500'
  return 'bg-primary'
}

function queueTitle(task: MyTaskRow): string {
  const code = asText(task.entity_code).trim()
  const name = asText(task.entity_name).trim()
  if (code) return code
  if (name) return name
  const fallback = asText(task.entity_link_label).trim()
  return fallback || `Task ${task.id}`
}

function queueSubTitle(task: MyTaskRow): string {
  const taskName = asText(task.name).trim()
  if (!taskName) return asText(task.entity_link_label).trim() || '-'
  return taskName
}

export function MyTasksLeftQueue(props: {
  tasks: MyTaskRow[]
  selectedTaskId: number | null
  onSelectTask: (task: MyTaskRow) => void
}) {
  const groups = buildDateGroups(props.tasks)

  if (groups.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-xs text-muted-foreground">
        No tasks in this view.
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-2">
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.id}>
            <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.tasks.map((task) => {
                const isSelected = task.id === props.selectedTaskId
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => props.onSelectTask(task)}
                    className={`w-full rounded border px-2 py-2 text-left transition ${
                      isSelected
                        ? 'border-sky-500/70 bg-sky-500/10'
                        : 'border-border bg-background/70 hover:border-border hover:bg-card/70'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded border border-border bg-card">
                        {asText(task.entity_thumbnail_url).trim() ? (
                          <img
                            src={asText(task.entity_thumbnail_url).trim()}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                            N/A
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-1.5">
                          <span className={`mt-1 h-2.5 w-2.5 rounded-full ${bucketDotClass(task)}`} />
                          <p className="truncate text-xs font-semibold text-foreground">
                            {queueTitle(task)}
                          </p>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-foreground/70">
                          {queueSubTitle(task)}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {asText(task.project_label).trim()} • {asText(task.department_label).trim() || '-'}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {queueDateLabel(task)}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
