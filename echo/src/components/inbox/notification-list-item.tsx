'use client'

import { formatDistanceToNow } from 'date-fns'
import {
  UserPlus,
  AtSign,
  MessageSquare,
  CheckCircle,
  Upload,
  FileText,
  Bell,
} from 'lucide-react'

interface NotificationListItemProps {
  notification: {
    id: number
    type: string
    title: string
    body?: string | null
    read_at: string | null
    created_at: string
    actor?: {
      id: string
      display_name: string | null
      avatar_url: string | null
    } | null
  }
  isSelected: boolean
  onClick: () => void
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'task_assigned': return <UserPlus className="h-4 w-4" />
    case 'mention': return <AtSign className="h-4 w-4" />
    case 'note_reply': return <MessageSquare className="h-4 w-4" />
    case 'status_changed': return <CheckCircle className="h-4 w-4" />
    case 'version_uploaded': return <Upload className="h-4 w-4" />
    case 'note_created': return <FileText className="h-4 w-4" />
    default: return <Bell className="h-4 w-4" />
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case 'task_assigned': return 'text-blue-400'
    case 'mention': return 'text-purple-400'
    case 'note_reply': return 'text-green-400'
    case 'status_changed': return 'text-primary'
    case 'version_uploaded': return 'text-cyan-400'
    default: return 'text-muted-foreground'
  }
}

export function NotificationListItem({
  notification,
  isSelected,
  onClick,
}: NotificationListItemProps) {
  const isUnread = !notification.read_at

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-3 border-b border-border transition
        ${isSelected ? 'bg-accent/50' : 'hover:bg-card/50'}
        ${isUnread ? 'border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'}
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${getTypeColor(notification.type)}`}>
          {getTypeIcon(notification.type)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isUnread && (
              <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
            )}
            <p className={`truncate text-sm ${isUnread ? 'font-medium text-foreground' : 'text-foreground/70'}`}>
              {notification.title}
            </p>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {notification.actor?.display_name && (
              <span>{notification.actor.display_name}</span>
            )}
            <span>{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</span>
          </div>
        </div>
      </div>
    </button>
  )
}
