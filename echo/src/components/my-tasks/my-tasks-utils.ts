import { formatDateForDisplay } from '@/lib/date-display'
import type {
  MyTaskRow,
  MyTasksDateGroup,
  MyTasksDateGroupId,
} from './my-tasks-types'

const DAY_MS = 24 * 60 * 60 * 1000

const GROUP_LABELS: Record<MyTasksDateGroupId, string> = {
  overdue: 'Long Ago',
  today: 'Today',
  this_week: 'This Week',
  later: 'Later',
  no_end_date: 'No End Date',
}

const GROUP_ORDER: MyTasksDateGroupId[] = [
  'overdue',
  'no_end_date',
  'today',
  'this_week',
  'later',
]

function asText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function toDateOnly(value: unknown): Date | null {
  const raw = asText(value).trim()
  if (!raw) return null

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

function dayNumber(date: Date): number {
  return Math.floor(date.getTime() / DAY_MS)
}

export function getDateGroupId(
  task: MyTaskRow,
  nowDate: Date = new Date()
): MyTasksDateGroupId {
  const dueDate = toDateOnly(task.due_date)
  if (!dueDate) return 'no_end_date'

  const today = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate())
  const dueDay = dayNumber(dueDate)
  const todayDay = dayNumber(today)

  if (dueDay < todayDay) return 'overdue'
  if (dueDay === todayDay) return 'today'

  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const nextWeekStart = new Date(weekStart)
  nextWeekStart.setDate(weekStart.getDate() + 7)

  if (dueDate >= weekStart && dueDate < nextWeekStart) return 'this_week'

  return 'later'
}

function compareQueueRows(a: MyTaskRow, b: MyTaskRow): number {
  const aDue = Date.parse(asText(a.due_date))
  const bDue = Date.parse(asText(b.due_date))

  if (!Number.isNaN(aDue) && !Number.isNaN(bDue) && aDue !== bDue) {
    return aDue - bDue
  }
  if (!Number.isNaN(aDue) && Number.isNaN(bDue)) return -1
  if (Number.isNaN(aDue) && !Number.isNaN(bDue)) return 1

  const projectCompare = asText(a.project_label).localeCompare(asText(b.project_label))
  if (projectCompare !== 0) return projectCompare

  return asText(a.name).localeCompare(asText(b.name))
}

export function buildDateGroups(tasks: MyTaskRow[]): MyTasksDateGroup[] {
  const grouped = new Map<MyTasksDateGroupId, MyTaskRow[]>()
  for (const groupId of GROUP_ORDER) {
    grouped.set(groupId, [])
  }

  for (const task of tasks) {
    const groupId = getDateGroupId(task)
    grouped.get(groupId)?.push(task)
  }

  const groups: MyTasksDateGroup[] = []
  for (const groupId of GROUP_ORDER) {
    const rows = grouped.get(groupId) || []
    if (rows.length === 0) continue
    rows.sort(compareQueueRows)
    groups.push({
      id: groupId,
      label: GROUP_LABELS[groupId],
      tasks: rows,
    })
  }

  return groups
}

export function queueDateLabel(task: MyTaskRow): string {
  const due = formatDateForDisplay(task.due_date)
  if (due) return `Due ${due}`

  const start = formatDateForDisplay(task.start_date)
  const end = formatDateForDisplay(task.end_date)
  if (start && end) return `${start} -> ${end}`
  if (end) return `Ends ${end}`
  if (start) return `Starts ${start}`
  return 'No End Date'
}
