'use client'

import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import {
  UserPlus,
  AtSign,
  MessageSquare,
  CheckCircle,
  Upload,
  FileText,
  Bell,
  ArrowRight,
} from 'lucide-react'

interface NotificationDetailProps {
  notification: {
    id: number
    type: string
    title: string
    body?: string | null
    entity_type?: string | null
    entity_id?: number | null
    project_id?: number | null
    read_at: string | null
    created_at: string
    metadata?: Record<string, unknown> | null
    actor?: {
      id: string
      display_name: string | null
      avatar_url: string | null
    } | null
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'task_assigned': return <UserPlus className="h-5 w-5 text-blue-400" />
    case 'mention': return <AtSign className="h-5 w-5 text-purple-400" />
    case 'note_reply': return <MessageSquare className="h-5 w-5 text-green-400" />
    case 'status_changed': return <CheckCircle className="h-5 w-5 text-primary" />
    case 'version_uploaded': return <Upload className="h-5 w-5 text-cyan-400" />
    case 'note_created': return <FileText className="h-5 w-5 text-muted-foreground" />
    default: return <Bell className="h-5 w-5 text-muted-foreground" />
  }
}

function toTitleCase(str: string): string {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function getEntityLink(notification: NotificationDetailProps['notification']): string | null {
  const { entity_type, entity_id, project_id } = notification
  if (!entity_type || !entity_id || !project_id) return null

  const pluralMap: Record<string, string> = {
    task: 'tasks',
    asset: 'assets',
    shot: 'shots',
    sequence: 'sequences',
    version: 'versions',
    note: 'notes',
    published_file: 'published-files',
    playlist: 'playlists',
  }

  const plural = pluralMap[entity_type]
  if (!plural) return null

  return `/apex/${project_id}/${plural}/${entity_id}/activity`
}

export function NotificationDetail({ notification }: NotificationDetailProps) {
  const entityLink = getEntityLink(notification)

  return (
    <div className="p-6">
      <div className="flex items-start gap-4">
        {getTypeIcon(notification.type)}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground">{notification.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {notification.body && (
        <div className="mt-4 rounded-md border border-border bg-card/50 p-4">
          <p className="text-sm text-foreground/70">{notification.body}</p>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {notification.actor && (
          <div className="flex items-center gap-3">
            {notification.actor.avatar_url ? (
              <img src={notification.actor.avatar_url} alt="" className="h-8 w-8 rounded-full" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-medium text-muted-foreground">
                {(notification.actor.display_name || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-foreground/80">{notification.actor.display_name}</p>
              <p className="text-xs text-muted-foreground">Actor</p>
            </div>
          </div>
        )}

        {notification.entity_type && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Entity:</span>
            <span className="text-foreground/80">{toTitleCase(notification.entity_type)}</span>
            {notification.entity_id && (
              <span className="text-muted-foreground">#{notification.entity_id}</span>
            )}
          </div>
        )}

        {notification.project_id && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Project:</span>
            <span className="text-foreground/80">#{notification.project_id}</span>
          </div>
        )}

        {notification.metadata && Object.keys(notification.metadata).length > 0 && (
          <div className="space-y-1">
            {Object.entries(notification.metadata).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{toTitleCase(key)}:</span>
                <span className="text-foreground/80">{String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {entityLink && (
        <div className="mt-6">
          <Link
            href={entityLink}
            className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/20"
          >
            Go to {notification.entity_type ? toTitleCase(notification.entity_type) : 'Entity'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
