// Entity lifecycle events
export const EVENT_TYPES = {
  // Assets
  asset_created: 'asset_created',
  asset_updated: 'asset_updated',
  asset_deleted: 'asset_deleted',
  // Shots
  shot_created: 'shot_created',
  shot_updated: 'shot_updated',
  shot_deleted: 'shot_deleted',
  // Sequences
  sequence_created: 'sequence_created',
  sequence_updated: 'sequence_updated',
  sequence_deleted: 'sequence_deleted',
  // Tasks
  task_created: 'task_created',
  task_updated: 'task_updated',
  task_deleted: 'task_deleted',
  // Versions
  version_created: 'version_created',
  version_updated: 'version_updated',
  version_deleted: 'version_deleted',
  // Notes
  note_created: 'note_created',
  note_updated: 'note_updated',
  note_deleted: 'note_deleted',
  // Published Files
  published_file_created: 'published_file_created',
  published_file_updated: 'published_file_updated',
  published_file_deleted: 'published_file_deleted',
  // Playlists
  playlist_created: 'playlist_created',
  playlist_updated: 'playlist_updated',
  playlist_deleted: 'playlist_deleted',
  // Projects
  project_created: 'project_created',
  project_updated: 'project_updated',
  project_deleted: 'project_deleted',
  // Special events
  status_changed: 'status_changed',
  task_assigned: 'task_assigned',
  version_uploaded: 'version_uploaded',
  note_reply: 'note_reply',
  // Membership
  member_added: 'member_added',
  member_removed: 'member_removed',
  // Auth
  user_login: 'user_login',
  user_logout: 'user_logout',
} as const

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES]

// Fields that should never be logged as individual field changes
export const EXCLUDED_FIELDS = new Set([
  'id',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'metadata',
])

// Human-readable entity type labels
export const ENTITY_TYPE_LABELS: Record<string, string> = {
  asset: 'Asset',
  shot: 'Shot',
  sequence: 'Sequence',
  task: 'Task',
  version: 'Version',
  note: 'Note',
  published_file: 'Published File',
  playlist: 'Playlist',
  project: 'Project',
}
