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
  // Skull Island (trash/restore)
  asset_trashed: 'asset_trashed',
  asset_restored: 'asset_restored',
  shot_trashed: 'shot_trashed',
  shot_restored: 'shot_restored',
  sequence_trashed: 'sequence_trashed',
  sequence_restored: 'sequence_restored',
  task_trashed: 'task_trashed',
  task_restored: 'task_restored',
  version_trashed: 'version_trashed',
  version_restored: 'version_restored',
  note_trashed: 'note_trashed',
  note_restored: 'note_restored',
  playlist_trashed: 'playlist_trashed',
  playlist_restored: 'playlist_restored',
  project_trashed: 'project_trashed',
  project_restored: 'project_restored',
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
  'deleted_at',
  'deleted_by',
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
