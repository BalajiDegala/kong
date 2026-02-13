'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { pickEntityColumnsForWrite } from '@/actions/schema-columns'

export async function createTask(
  formData: Record<string, unknown> & {
    project_id: string
    name: string
    entity_type: 'asset' | 'shot' | 'sequence' | 'project'
    entity_id: string
    step_id: string
    assigned_to?: string
    status?: string
    priority?: string
    due_date?: string
    description?: string
  }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const extra = await pickEntityColumnsForWrite(supabase, 'task', formData, {
    deny: new Set(['project_id', 'created_by', 'updated_by']),
  })

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...extra,
      project_id: formData.project_id,
      name: formData.name,
      entity_type: formData.entity_type,
      entity_id: formData.entity_id,
      step_id: formData.step_id,
      assigned_to: formData.assigned_to || null,
      status: formData.status || 'pending',
      priority: formData.priority || 'medium',
      due_date: formData.due_date || null,
      description: formData.description || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/apex/${formData.project_id}/tasks`)
  return { data }
}

export async function updateTask(
  taskId: string,
  formData: Record<string, unknown>,
  options?: {
    revalidate?: boolean
    projectId?: string
  }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const updateData: any = await pickEntityColumnsForWrite(supabase, 'task', formData, {
    deny: new Set(['id', 'project_id', 'entity_type', 'entity_id', 'created_by', 'created_at', 'updated_at']),
  })

  // No-op updates can happen when a UI-only/computed column is edited.
  if (Object.keys(updateData).length === 0) {
    return { data: null }
  }

  const { error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)

  if (error) {
    return { error: error.message }
  }

  let data: any = null
  // Best-effort fetch only; some policies may allow UPDATE but restrict SELECT.
  const updatedRow = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .maybeSingle()
  if (!updatedRow.error) {
    data = updatedRow.data
  }

  const shouldRevalidate = options?.revalidate !== false
  if (shouldRevalidate) {
    const projectId = options?.projectId
    if (projectId) {
      revalidatePath(`/apex/${projectId}/tasks`)
    } else {
      const task = await supabase.from('tasks').select('project_id').eq('id', taskId).maybeSingle()
      if (task.data) {
        revalidatePath(`/apex/${task.data.project_id}/tasks`)
      }
    }
  }

  return { data }
}

export async function deleteTask(taskId: string, projectId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase.from('tasks').delete().eq('id', taskId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/apex/${projectId}/tasks`)
  return { success: true }
}
