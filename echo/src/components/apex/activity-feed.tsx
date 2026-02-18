'use client'

import { formatDistanceToNow } from 'date-fns'
import {
  Edit3,
  Trash2,
  CheckCircle,
  MessageSquare,
  Upload,
  Plus,
  UserPlus,
  Activity,
} from 'lucide-react'

export interface ActivityEvent {
  id: number
  event_type: string
  entity_type: string
  entity_id: number
  attribute_name?: string | null
  old_value?: unknown
  new_value?: unknown
  description?: string | null
  session_id?: string | null
  created_at: string
  actor?: {
    id: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

interface ActivityFeedProps {
  events: ActivityEvent[]
}

function getTimestamp(value: string) {
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function getEventIcon(eventType: string) {
  if (eventType.endsWith('_created')) return <Plus className="h-4 w-4" />
  if (eventType.endsWith('_updated')) return <Edit3 className="h-4 w-4" />
  if (eventType.endsWith('_deleted')) return <Trash2 className="h-4 w-4" />
  if (eventType === 'status_changed') return <CheckCircle className="h-4 w-4" />
  if (eventType === 'note_reply' || eventType === 'note_created') return <MessageSquare className="h-4 w-4" />
  if (eventType === 'version_uploaded') return <Upload className="h-4 w-4" />
  if (eventType === 'task_assigned' || eventType === 'member_added') return <UserPlus className="h-4 w-4" />
  return <Activity className="h-4 w-4" />
}

function getEventColor(eventType: string) {
  if (eventType.endsWith('_created')) return 'text-green-400'
  if (eventType.endsWith('_deleted')) return 'text-red-400'
  if (eventType === 'status_changed') return 'text-primary'
  return 'text-blue-400'
}

export function ActivityFeedItem({ event }: { event: ActivityEvent }) {
  return (
    <div
      className="flex items-start gap-3 rounded-md border border-border bg-background/50 p-3"
    >
      <div className={`mt-0.5 ${getEventColor(event.event_type)}`}>
        {getEventIcon(event.event_type)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {event.actor?.avatar_url ? (
            <img
              src={event.actor.avatar_url}
              alt=""
              className="h-5 w-5 rounded-full"
            />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-muted-foreground">
              {(event.actor?.display_name || '?')[0].toUpperCase()}
            </div>
          )}
          <span className="text-sm font-medium text-foreground/80">
            {event.actor?.display_name || 'Unknown'}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {event.description || event.event_type.replace(/_/g, ' ')}
        </p>
      </div>
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
      </span>
    </div>
  )
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-md border border-border bg-background/70 p-6">
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      </div>
    )
  }

  const sortedEvents = [...events].sort((a, b) => {
    const timeDiff = getTimestamp(b.created_at) - getTimestamp(a.created_at)
    if (timeDiff !== 0) return timeDiff
    return b.id - a.id
  })

  return (
    <div className="space-y-1">
      {sortedEvents.map((event) => (
        <ActivityFeedItem
          key={event.id}
          event={event}
        />
      ))}
    </div>
  )
}
