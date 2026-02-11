'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { pickEntityColumns } from '@/lib/schema'

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

  const extra = pickEntityColumns('task', formData, {
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

  const updateData: any = pickEntityColumns('task', formData, {
    deny: new Set(['id', 'project_id', 'entity_type', 'entity_id', 'created_by', 'created_at', 'updated_at']),
  })

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  const shouldRevalidate = options?.revalidate !== false
  if (shouldRevalidate) {
    const projectId = options?.projectId
    if (projectId) {
      revalidatePath(`/apex/${projectId}/tasks`)
    } else {
      const task = await supabase.from('tasks').select('project_id').eq('id', taskId).single()
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
