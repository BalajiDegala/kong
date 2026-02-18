'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface EventLogFilterBarProps {
  entityType: string
  eventType: string
  onEntityTypeChange: (value: string) => void
  onEventTypeChange: (value: string) => void
}

const entityTypes = [
  { value: '', label: 'All Entities' },
  { value: 'asset', label: 'Asset' },
  { value: 'shot', label: 'Shot' },
  { value: 'sequence', label: 'Sequence' },
  { value: 'task', label: 'Task' },
  { value: 'version', label: 'Version' },
  { value: 'note', label: 'Note' },
  { value: 'published_file', label: 'Published File' },
  { value: 'playlist', label: 'Playlist' },
]

const eventTypes = [
  { value: '', label: 'All Events' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'status_changed', label: 'Status Changed' },
]

export function EventLogFilterBar({
  entityType,
  eventType,
  onEntityTypeChange,
  onEventTypeChange,
}: EventLogFilterBarProps) {
  return (
    <div className="flex items-center gap-3">
      <Select value={entityType} onValueChange={onEntityTypeChange}>
        <SelectTrigger className="w-[180px] border-border bg-card text-foreground/80">
          <SelectValue placeholder="All Entities" />
        </SelectTrigger>
        <SelectContent className="border-border bg-card text-foreground/80">
          {entityTypes.map((et) => (
            <SelectItem key={et.value} value={et.value || '_all'}>
              {et.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={eventType} onValueChange={onEventTypeChange}>
        <SelectTrigger className="w-[180px] border-border bg-card text-foreground/80">
          <SelectValue placeholder="All Events" />
        </SelectTrigger>
        <SelectContent className="border-border bg-card text-foreground/80">
          {eventTypes.map((et) => (
            <SelectItem key={et.value} value={et.value || '_all'}>
              {et.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
