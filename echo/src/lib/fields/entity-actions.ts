/**
 * Unified Field System — Entity Action Dispatcher
 *
 * Maps entity types to their server update/delete actions so that
 * hooks and components don't need entity-specific imports.
 */

import { updateAsset, deleteAsset } from '@/actions/assets'
import { updateSequence, deleteSequence } from '@/actions/sequences'
import { updateShot, deleteShot } from '@/actions/shots'
import { updateTask, deleteTask } from '@/actions/tasks'
import { updateVersion, deleteVersion } from '@/actions/versions'
import { updateNote, deleteNote } from '@/actions/notes'
import { updatePublishedFile, deletePublishedFile } from '@/actions/published-files'
import type { ExtendedEntityKey } from './types'

type UpdateFn = (
  id: string,
  formData: Record<string, unknown>,
  options?: { revalidate?: boolean; projectId?: string }
) => Promise<{ data?: unknown; error?: string }>

type DeleteFn = (
  id: string,
  projectId: string
) => Promise<{ data?: unknown; error?: string }>

const UPDATE_ACTIONS: Record<string, UpdateFn> = {
  asset: updateAsset,
  sequence: updateSequence,
  shot: updateShot,
  task: updateTask,
  version: updateVersion,
  note: (id, formData) => updateNote(id, formData),
  published_file: updatePublishedFile,
}

const DELETE_ACTIONS: Record<string, DeleteFn> = {
  asset: deleteAsset,
  sequence: deleteSequence,
  shot: deleteShot,
  task: deleteTask,
  version: deleteVersion,
  note: deleteNote,
  published_file: deletePublishedFile,
}

/**
 * Get the update server action for an entity type.
 */
export function getUpdateAction(entity: ExtendedEntityKey): UpdateFn | null {
  return UPDATE_ACTIONS[entity] || null
}

/**
 * Get the delete server action for an entity type.
 */
export function getDeleteAction(entity: ExtendedEntityKey): DeleteFn | null {
  return DELETE_ACTIONS[entity] || null
}

/**
 * Execute an entity update via the appropriate server action.
 */
export async function dispatchUpdate(
  entity: ExtendedEntityKey,
  id: string,
  formData: Record<string, unknown>,
  options?: { revalidate?: boolean; projectId?: string }
): Promise<{ data?: unknown; error?: string }> {
  const action = UPDATE_ACTIONS[entity]
  if (!action) {
    return { error: `No update action registered for entity: ${entity}` }
  }
  return action(id, formData, options)
}

/**
 * Execute an entity delete via the appropriate server action.
 */
export async function dispatchDelete(
  entity: ExtendedEntityKey,
  id: string,
  projectId: string
): Promise<{ data?: unknown; error?: string }> {
  const action = DELETE_ACTIONS[entity]
  if (!action) {
    return { error: `No delete action registered for entity: ${entity}` }
  }
  return action(id, projectId)
}
