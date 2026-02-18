'use client'

import { formatDistanceToNow } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface HistoryEvent {
  id: number
  attribute_name: string | null
  old_value: unknown
  new_value: unknown
  description?: string | null
  created_at: string
  actor?: {
    id: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

interface HistoryTableProps {
  events: HistoryEvent[]
}

function toTitleCase(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatJsonValue(val: unknown): string {
  if (val === null || val === undefined) return '-'
  if (typeof val === 'string') {
    // Try to parse JSON strings (values are stored as JSON)
    try {
      const parsed = JSON.parse(val)
      if (typeof parsed === 'string') return parsed
      if (typeof parsed === 'boolean') return parsed ? 'true' : 'false'
      if (typeof parsed === 'number') return String(parsed)
      return JSON.stringify(parsed)
    } catch {
      return val
    }
  }
  if (typeof val === 'boolean') return val ? 'true' : 'false'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function getTimestamp(value: string): number {
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

export function HistoryTable({ events }: HistoryTableProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-md border border-border bg-background/70 p-6">
        <p className="text-sm text-muted-foreground">No field-level history yet.</p>
      </div>
    )
  }

  const sortedEvents = [...events].sort((a, b) => {
    const timeDiff = getTimestamp(b.created_at) - getTimestamp(a.created_at)
    if (timeDiff !== 0) return timeDiff
    return b.id - a.id
  })

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground">Date</TableHead>
            <TableHead className="text-muted-foreground">Field</TableHead>
            <TableHead className="text-muted-foreground">Old Value</TableHead>
            <TableHead className="text-muted-foreground">New Value</TableHead>
            <TableHead className="text-muted-foreground">Changed By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEvents.map((event) => (
            <TableRow key={event.id} className="border-border hover:bg-card/50">
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
              </TableCell>
              <TableCell className="text-sm font-medium text-foreground/80">
                {event.attribute_name ? toTitleCase(event.attribute_name) : '-'}
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                {formatJsonValue(event.old_value)}
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-sm text-foreground/80">
                {formatJsonValue(event.new_value)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {event.actor?.display_name || 'Unknown'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
