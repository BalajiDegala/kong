'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logEntityRestored, logEntityDeleted } from '@/lib/activity/activity-logger'

export type TrashedEntity = {
  id: number
  entity_type: string
  name: string | null
  code: string | null
  project_id: number
  project_name: string | null
  deleted_at: string
  deleted_by: string | null
  deleted_by_name: string | null
}

export async function getTrashedEntities(options?: {
  entityType?: string
  projectId?: string
  search?: string
  limit?: number
  offset?: number
}): Promise<{ data: TrashedEntity[]; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: [], error: 'Not authenticated' }
  }

  const { data, error } = await supabase.rpc('get_trashed_entities', {
    p_entity_type: options?.entityType || null,
    p_project_id: options?.projectId ? Number(options.projectId) : null,
    p_search: options?.search || null,
    p_limit: options?.limit ?? 50,
    p_offset: options?.offset ?? 0,
  })

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: (data as TrashedEntity[]) || [] }
}

export async function restoreEntity(entityType: string, entityId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase.rpc('restore_entity', {
    p_entity_type: entityType,
    p_entity_id: Number(entityId),
  })

  if (error) {
    return { error: error.message }
  }

  // Log the restore
  logEntityRestored(entityType, entityId, null, { id: entityId })

  revalidatePath('/skull-island')
  revalidatePath('/apex')
  return { success: true, data }
}

export async function restoreEntities(
  items: { entityType: string; entityId: string }[]
) {
  const results: { entityType: string; entityId: string; success: boolean; error?: string }[] = []

  for (const item of items) {
    const result = await restoreEntity(item.entityType, item.entityId)
    results.push({
      entityType: item.entityType,
      entityId: item.entityId,
      success: !result.error,
      error: result.error,
    })
  }

  revalidatePath('/skull-island')
  revalidatePath('/apex')
  return { results }
}

export async function permanentlyDeleteEntity(entityType: string, entityId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // For versions, we need to clean up storage after permanent delete
  let filePath: string | null = null
  if (entityType === 'version') {
    const { data: version } = await supabase
      .from('versions')
      .select('file_path, project_id')
      .eq('id', Number(entityId))
      .maybeSingle()
    filePath = version?.file_path || null
  }

  const { data, error } = await supabase.rpc('permanently_delete_entity', {
    p_entity_type: entityType,
    p_entity_id: Number(entityId),
  })

  if (error) {
    return { error: error.message }
  }

  // Clean up storage for versions
  if (entityType === 'version' && filePath) {
    await supabase.storage.from('versions').remove([filePath])
  }

  logEntityDeleted(entityType, entityId, null, { id: entityId, permanently_deleted: true })

  revalidatePath('/skull-island')
  return { success: true, data }
}

export async function permanentlyDeleteEntities(
  items: { entityType: string; entityId: string }[]
) {
  const results: { entityType: string; entityId: string; success: boolean; error?: string }[] = []

  for (const item of items) {
    const result = await permanentlyDeleteEntity(item.entityType, item.entityId)
    results.push({
      entityType: item.entityType,
      entityId: item.entityId,
      success: !result.error,
      error: result.error,
    })
  }

  revalidatePath('/skull-island')
  return { results }
}
