'use client'

import { useEffect, useState, useCallback } from 'react'
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

export default function EventLogPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [events, setEvents] = useState<any[]>([])
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

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-100">Event Log</h3>
        <EventLogFilterBar
          entityType={entityType}
          eventType={eventType}
          onEntityTypeChange={(v) => setEntityType(v === '_all' ? '' : v)}
          onEventTypeChange={(v) => setEventType(v === '_all' ? '' : v)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-zinc-400">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-md border border-zinc-800 bg-zinc-950/70 p-6">
          <p className="text-sm text-zinc-400">No events found.</p>
        </div>
      ) : (
        <div className="rounded-md border border-zinc-800">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">Date</TableHead>
                <TableHead className="text-zinc-400">Entity Type</TableHead>
                <TableHead className="text-zinc-400">Event Type</TableHead>
                <TableHead className="text-zinc-400">Description</TableHead>
                <TableHead className="text-zinc-400">Actor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id} className="border-zinc-800 hover:bg-zinc-900/50">
                  <TableCell className="whitespace-nowrap text-sm text-zinc-400">
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-200">
                    {toTitleCase(event.entity_type || '-')}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-200">
                    {toTitleCase(event.event_type || '-')}
                  </TableCell>
                  <TableCell className="max-w-[400px] truncate text-sm text-zinc-400">
                    {event.description || event.event_type?.replace(/_/g, ' ') || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-400">
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
