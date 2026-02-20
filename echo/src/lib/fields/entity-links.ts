/**
 * Unified Field System — Entity Link Registry
 *
 * Defines how to resolve entity references (FK fields) to display labels.
 * Replaces manual resolution code duplicated in every entity page.
 */

import type { EntityLinkConfig } from './types'
import { asText } from './utils'

// ---------------------------------------------------------------------------
// Entity Link Registry
// ---------------------------------------------------------------------------

export const ENTITY_LINK_REGISTRY: Record<string, EntityLinkConfig> = {
  profile: {
    table: 'profiles',
    valueColumn: 'id',
    displayColumns: ['id', 'display_name', 'full_name', 'email', 'avatar_url'],
    formatLabel: (r) =>
      asText(r.display_name).trim() ||
      asText(r.full_name).trim() ||
      asText(r.email).trim() ||
      'Unknown',
    searchable: true,
    searchColumn: 'display_name',
  },

  department: {
    table: 'departments',
    valueColumn: 'id',
    displayColumns: ['id', 'name', 'code'],
    formatLabel: (r) =>
      asText(r.code).trim() || asText(r.name).trim() || 'Unknown',
    searchable: true,
    searchColumn: 'name',
  },

  pipeline_step: {
    table: 'steps',
    valueColumn: 'id',
    displayColumns: ['id', 'name', 'code', 'department_id'],
    formatLabel: (r) =>
      asText(r.code).trim() || asText(r.name).trim() || 'Unknown',
    searchable: true,
    searchColumn: 'name',
  },

  project: {
    table: 'projects',
    valueColumn: 'id',
    displayColumns: ['id', 'name', 'code'],
    formatLabel: (r) => {
      const name = asText(r.name).trim()
      return name || asText(r.code).trim() || 'Unknown'
    },
    searchable: true,
    searchColumn: 'name',
  },

  asset: {
    table: 'assets',
    valueColumn: 'id',
    displayColumns: ['id', 'name', 'code', 'asset_type', 'status', 'description', 'thumbnail_url'],
    formatLabel: (r) => {
      const code = asText(r.code).trim()
      const name = asText(r.name).trim()
      if (code && name) return `${code} - ${name}`
      return code || name || 'Unknown'
    },
    searchable: true,
    searchColumn: 'name',
  },

  sequence: {
    table: 'sequences',
    valueColumn: 'id',
    displayColumns: ['id', 'name', 'code', 'status', 'description', 'thumbnail_url'],
    formatLabel: (r) => {
      const code = asText(r.code).trim()
      const name = asText(r.name).trim()
      if (code && name) return `${code} - ${name}`
      return code || name || 'Unknown'
    },
    searchable: true,
    searchColumn: 'name',
  },

  shot: {
    table: 'shots',
    valueColumn: 'id',
    displayColumns: ['id', 'name', 'code', 'sequence_id', 'status', 'description', 'thumbnail_url'],
    formatLabel: (r) => {
      const code = asText(r.code).trim()
      const name = asText(r.name).trim()
      if (code && name) return `${code} - ${name}`
      return code || name || 'Unknown'
    },
    searchable: true,
    searchColumn: 'name',
  },

  task: {
    table: 'tasks',
    valueColumn: 'id',
    displayColumns: ['id', 'name', 'cached_display_name'],
    formatLabel: (r) =>
      asText(r.cached_display_name).trim() || asText(r.name).trim() || 'Unknown',
    searchable: true,
    searchColumn: 'name',
  },

  version: {
    table: 'versions',
    valueColumn: 'id',
    displayColumns: ['id', 'code', 'version_number'],
    formatLabel: (r) => {
      const code = asText(r.code).trim()
      const vnum = asText(r.version_number).trim()
      if (code) return vnum ? `${code} v${vnum}` : code
      return vnum ? `v${vnum}` : 'Unknown'
    },
    searchable: true,
    searchColumn: 'code',
  },
}

/**
 * Get the entity link config for a target entity key.
 */
export function getEntityLinkConfig(
  targetEntity: string
): EntityLinkConfig | null {
  return ENTITY_LINK_REGISTRY[targetEntity] || null
}
