'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createTask(formData: {
  project_id: string
  name: string
  entity_type: 'asset' | 'shot'
  entity_id: string
  step_id: string
  assigned_to?: string
  status?: string
  priority?: string
  due_date?: string
  description?: string
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
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
  formData: {
    name?: string
    step_id?: string
    assigned_to?: string
    status?: string
    priority?: string
    due_date?: string
    description?: string
    reviewer?: string | null
    link?: string | null
    bid?: number | null
    bid_breakdown?: string | null
    buffer_days?: number | null
    buffer_days2?: number | null
    casting?: string | null
    cc?: string | null
    ddna_bid?: string | null
    ddna_id?: string | null
    ddna_to?: string | null
    dependency_violation?: string | null
    dept_end_date?: string | null
    downstream_dependency?: string | null
    end_date?: string | null
    gantt_bar_color?: string | null
    inventory_date?: string | null
    milestone?: string | null
    notes?: string | null
    prod_comments?: string | null
    proposed_start_date?: string | null
    publish_version_number?: string | null
    tags?: string[]
    task_complexity?: string | null
    task_template?: string | null
    thumbnail_url?: string | null
    versions?: string[]
    workload?: string | null
    pipeline_step_color?: string | null
  },
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

  const updateData: any = {}
  if (formData.name !== undefined) updateData.name = formData.name
  if (formData.step_id !== undefined) updateData.step_id = formData.step_id
  if (formData.assigned_to !== undefined) updateData.assigned_to = formData.assigned_to
  if (formData.status !== undefined) updateData.status = formData.status
  if (formData.priority !== undefined) updateData.priority = formData.priority
  if (formData.due_date !== undefined) updateData.due_date = formData.due_date
  if (formData.description !== undefined) updateData.description = formData.description
  if (formData.reviewer !== undefined) updateData.reviewer = formData.reviewer
  if (formData.link !== undefined) updateData.link = formData.link
  if (formData.bid !== undefined) updateData.bid = formData.bid
  if (formData.bid_breakdown !== undefined) updateData.bid_breakdown = formData.bid_breakdown
  if (formData.buffer_days !== undefined) updateData.buffer_days = formData.buffer_days
  if (formData.buffer_days2 !== undefined) updateData.buffer_days2 = formData.buffer_days2
  if (formData.casting !== undefined) updateData.casting = formData.casting
  if (formData.cc !== undefined) updateData.cc = formData.cc
  if (formData.ddna_bid !== undefined) updateData.ddna_bid = formData.ddna_bid
  if (formData.ddna_id !== undefined) updateData.ddna_id = formData.ddna_id
  if (formData.ddna_to !== undefined) updateData.ddna_to = formData.ddna_to
  if (formData.dependency_violation !== undefined) updateData.dependency_violation = formData.dependency_violation
  if (formData.dept_end_date !== undefined) updateData.dept_end_date = formData.dept_end_date
  if (formData.downstream_dependency !== undefined) updateData.downstream_dependency = formData.downstream_dependency
  if (formData.end_date !== undefined) updateData.end_date = formData.end_date
  if (formData.gantt_bar_color !== undefined) updateData.gantt_bar_color = formData.gantt_bar_color
  if (formData.inventory_date !== undefined) updateData.inventory_date = formData.inventory_date
  if (formData.milestone !== undefined) updateData.milestone = formData.milestone
  if (formData.notes !== undefined) updateData.notes = formData.notes
  if (formData.prod_comments !== undefined) updateData.prod_comments = formData.prod_comments
  if (formData.proposed_start_date !== undefined) updateData.proposed_start_date = formData.proposed_start_date
  if (formData.publish_version_number !== undefined) updateData.publish_version_number = formData.publish_version_number
  if (formData.tags !== undefined) updateData.tags = formData.tags
  if (formData.task_complexity !== undefined) updateData.task_complexity = formData.task_complexity
  if (formData.task_template !== undefined) updateData.task_template = formData.task_template
  if (formData.thumbnail_url !== undefined) updateData.thumbnail_url = formData.thumbnail_url
  if (formData.versions !== undefined) updateData.versions = formData.versions
  if (formData.workload !== undefined) updateData.workload = formData.workload
  if (formData.pipeline_step_color !== undefined) updateData.pipeline_step_color = formData.pipeline_step_color

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
