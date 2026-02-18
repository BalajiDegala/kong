'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { getProjectEventLog } from '@/lib/supabase/queries'
import { EventLogFilterBar } from '@/components/apex/event-log-filter-bar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function toTitleCase(str: string): string {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

interface EventLogEvent {
  id: number
  entity_type: string | null
  event_type: string | null
  description: string | null
  created_at: string
  actor?: {
    display_name?: string | null
  } | null
}

function getTimestamp(value: string): number {
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

export default function EventLogPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [events, setEvents] = useState<EventLogEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [entityType, setEntityType] = useState('')
  const [eventType, setEventType] = useState('')

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const filters: Record<string, string> = {}

      if (entityType && entityType !== '_all') {
        filters.entityType = entityType
      }

      // Map event type filter to partial match
      if (eventType && eventType !== '_all') {
        filters.eventType = eventType
      }

      const data = await getProjectEventLog(supabase, projectId, filters, { limit: 200 })
      setEvents(data || [])
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [projectId, entityType, eventType])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const timeDiff = getTimestamp(b.created_at) - getTimestamp(a.created_at)
      if (timeDiff !== 0) return timeDiff
      return b.id - a.id
    })
  }, [events])

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Event Log</h3>
        <EventLogFilterBar
          entityType={entityType}
          eventType={eventType}
          onEntityTypeChange={(v) => setEntityType(v === '_all' ? '' : v)}
          onEventTypeChange={(v) => setEventType(v === '_all' ? '' : v)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Loading events...</p>
        </div>
      ) : sortedEvents.length === 0 ? (
        <div className="rounded-md border border-border bg-background/70 p-6">
          <p className="text-sm text-muted-foreground">No events found.</p>
        </div>
      ) : (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground">Entity Type</TableHead>
                <TableHead className="text-muted-foreground">Event Type</TableHead>
                <TableHead className="text-muted-foreground">Description</TableHead>
                <TableHead className="text-muted-foreground">Actor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEvents.map((event) => (
                <TableRow key={event.id} className="border-border hover:bg-card/50">
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-sm text-foreground/80">
                    {toTitleCase(event.entity_type || '-')}
                  </TableCell>
                  <TableCell className="text-sm text-foreground/80">
                    {toTitleCase(event.event_type || '-')}
                  </TableCell>
                  <TableCell className="max-w-[400px] truncate text-sm text-muted-foreground">
                    {event.description || event.event_type?.replace(/_/g, ' ') || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {event.actor?.display_name || 'Unknown'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
