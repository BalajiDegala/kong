/**
 * Unified Field System — Field-to-Entity Link Mapping
 *
 * Maps field codes to their entity link targets per entity type.
 * Replaces the hardcoded if/else chains in entity-field-options.ts.
 *
 * 'auto' means the field's target is resolved dynamically from
 * the row's entity_type column (polymorphic FK).
 */

export const FIELD_ENTITY_MAP: Record<string, Record<string, string>> = {
  task: {
    assigned_to: 'profile',
    reviewer: 'profile',
    ayon_assignees: 'profile',
    cc: 'profile',
    created_by: 'profile',
    updated_by: 'profile',
    client_approved_by: 'profile',
    step_id: 'pipeline_step',
    department: 'department',
    project_id: 'project',
    entity_id: 'auto',
  },

  shot: {
    sequence_id: 'sequence',
    created_by: 'profile',
    updated_by: 'profile',
    project_id: 'project',
    assigned_to: 'profile',
  },

  asset: {
    sequence_id: 'sequence',
    shot_id: 'shot',
    created_by: 'profile',
    updated_by: 'profile',
    project_id: 'project',
    assigned_to: 'profile',
  },

  sequence: {
    created_by: 'profile',
    updated_by: 'profile',
    project_id: 'project',
  },

  version: {
    artist_id: 'profile',
    created_by: 'profile',
    updated_by: 'profile',
    project_id: 'project',
    task_id: 'task',
    entity_id: 'auto',
    department: 'department',
  },

  note: {
    author_id: 'profile',
    created_by: 'profile',
    entity_id: 'auto',
    task_id: 'task',
    project_id: 'project',
  },

  published_file: {
    published_by: 'profile',
    created_by: 'profile',
    project_id: 'project',
    task_id: 'task',
    version_id: 'version',
    entity_id: 'auto',
  },

  playlist: {
    created_by: 'profile',
    project_id: 'project',
  },
}

/**
 * Get the entity link target for a field on a given entity type.
 * Returns null if the field doesn't link to another entity.
 */
export function getFieldEntityTarget(
  entity: string,
  fieldCode: string
): string | null {
  return FIELD_ENTITY_MAP[entity]?.[fieldCode] || null
}

/**
 * Get all entity-linked fields for an entity type.
 */
export function getEntityLinkedFields(
  entity: string
): Record<string, string> {
  return FIELD_ENTITY_MAP[entity] || {}
}
