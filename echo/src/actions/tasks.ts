'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { pickEntityColumnsForWrite } from '@/actions/schema-columns'
import { logEntityCreated, logEntityUpdated, logEntityDeleted } from '@/lib/activity/activity-logger'
import { notifyTaskAssigned, notifyStatusChanged } from '@/lib/activity/notification-creator'

function asText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function normalizedUserList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asText(item).trim())
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? [trimmed] : []
  }
  return []
}

function fallbackListForTextColumn(value: unknown): string | null {
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => asText(item).trim())
      .filter(Boolean)
      .join(', ')
    return joined || null
  }
  const trimmed = asText(value).trim()
  return trimmed || null
}

function normalizeNullableText(value: unknown): string | null {
  const trimmed = asText(value).trim()
  return trimmed || null
}

function normalizeStepId(value: unknown): number | string | null {
  const trimmed = asText(value).trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isNaN(parsed) ? trimmed : parsed
}

async function resolveStepIdFromDepartment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  departmentValue: unknown
): Promise<number | string | null> {
  const normalizedDepartment = normalizeNullableText(departmentValue)
  if (!normalizedDepartment) return null
  const parsedDepartmentId = Number(normalizedDepartment)
  if (Number.isNaN(parsedDepartmentId)) return null

  const { data } = await supabase
    .from('steps')
    .select('id')
    .eq('department_id', parsedDepartmentId)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!data?.id) return null
  return normalizeStepId(data.id)
}

async function resolveDepartmentFromStepId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  stepValue: unknown
): Promise<string | null> {
  const normalizedStep = normalizeStepId(stepValue)
  if (normalizedStep === null) return null

  const { data } = await supabase
    .from('steps')
    .select('department_id')
    .eq('id', normalizedStep)
    .maybeSingle()

  if (!data?.department_id) return null
  return normalizeNullableText(data.department_id)
}

export async function createTask(
  formData: Record<string, unknown> & {
    project_id: string
    name: string
    entity_type: 'asset' | 'shot' | 'sequence' | 'project'
    entity_id: string
    step_id?: string | number | null
    department?: string | number | null
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

  const assignedTo = normalizeNullableText(formData.assigned_to)
  let department = normalizeNullableText(formData.department)
  let stepId = normalizeStepId(formData.step_id)

  if (!department && stepId !== null) {
    department = await resolveDepartmentFromStepId(supabase, stepId)
  }
  if (stepId === null && department) {
    stepId = await resolveStepIdFromDepartment(supabase, department)
  }
  if (!department && stepId === null) {
    return { error: 'Pipeline step (department) is required' }
  }

  if (extra.ayon_assignees === undefined) {
    extra.ayon_assignees = assignedTo ? [assignedTo] : []
  }

  const insertPayload: Record<string, unknown> = {
    ...extra,
    project_id: formData.project_id,
    name: formData.name,
    entity_type: formData.entity_type,
    entity_id: formData.entity_id,
    step_id: stepId,
    department,
    assigned_to: assignedTo,
    status: formData.status || 'pending',
    priority: formData.priority || 'medium',
    due_date: formData.due_date || null,
    description: formData.description || null,
    created_by: user.id,
  }

  let { data, error } = await supabase
    .from('tasks')
    .insert(insertPayload)
    .select()
    .single()

  // Compatibility fallback while some environments still keep legacy text columns.
  if (
    error &&
    (Array.isArray(insertPayload.ayon_assignees) ||
      typeof insertPayload.ayon_sync_status === 'boolean')
  ) {
    const fallbackPayload: Record<string, unknown> = { ...insertPayload }
    if (Array.isArray(fallbackPayload.ayon_assignees)) {
      fallbackPayload.ayon_assignees = fallbackListForTextColumn(
        fallbackPayload.ayon_assignees
      )
    }
    if (typeof fallbackPayload.ayon_sync_status === 'boolean') {
      fallbackPayload.ayon_sync_status = fallbackPayload.ayon_sync_status
        ? 'true'
        : 'false'
    }

    const retry = await supabase
      .from('tasks')
      .insert(fallbackPayload)
      .select()
      .single()

    data = retry.data
    error = retry.error
  }

  if (error) {
    return { error: error.message }
  }

  // Fire-and-forget activity logging
  logEntityCreated('task', data.id, formData.project_id, data)

  // Notify assigned user
  if (data.assigned_to && user.id !== data.assigned_to) {
    notifyTaskAssigned(data.id, data.assigned_to, user.id, formData.project_id, data.name)
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

  // Fetch current row before update to capture old values
  const { data: oldData } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .maybeSingle()

  const updateData: Record<string, unknown> = await pickEntityColumnsForWrite(
    supabase,
    'task',
    formData,
    {
      deny: new Set([
        'id',
        'project_id',
        'entity_type',
        'entity_id',
        'created_by',
        'created_at',
        'updated_at',
      ]),
    }
  )

  const hasAssignedTo = Object.prototype.hasOwnProperty.call(updateData, 'assigned_to')
  const hasAyonAssignees = Object.prototype.hasOwnProperty.call(updateData, 'ayon_assignees')
  const hasDepartment = Object.prototype.hasOwnProperty.call(updateData, 'department')
  const hasStepId = Object.prototype.hasOwnProperty.call(updateData, 'step_id')

  if (hasDepartment) {
    updateData.department = normalizeNullableText(updateData.department)
  }
  if (hasStepId) {
    updateData.step_id = normalizeStepId(updateData.step_id)
  }

  if (hasDepartment && !hasStepId) {
    const resolvedStepId = await resolveStepIdFromDepartment(
      supabase,
      updateData.department
    )
    updateData.step_id = resolvedStepId
  }

  if (!hasDepartment && hasStepId) {
    updateData.department = await resolveDepartmentFromStepId(
      supabase,
      updateData.step_id
    )
  }

  if (hasAssignedTo && !hasAyonAssignees) {
    const assignedTo = asText(updateData.assigned_to).trim()
    updateData.ayon_assignees = assignedTo ? [assignedTo] : []
  } else if (hasAyonAssignees) {
    updateData.ayon_assignees = normalizedUserList(updateData.ayon_assignees)
  }

  // No-op updates can happen when a UI-only/computed column is edited.
  if (Object.keys(updateData).length === 0) {
    return { data: null }
  }

  let { error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)

  if (
    error &&
    (Array.isArray(updateData.ayon_assignees) ||
      typeof updateData.ayon_sync_status === 'boolean')
  ) {
    const fallbackUpdate: Record<string, unknown> = { ...updateData }
    if (Array.isArray(fallbackUpdate.ayon_assignees)) {
      fallbackUpdate.ayon_assignees = fallbackListForTextColumn(
        fallbackUpdate.ayon_assignees
      )
    }
    if (typeof fallbackUpdate.ayon_sync_status === 'boolean') {
      fallbackUpdate.ayon_sync_status = fallbackUpdate.ayon_sync_status
        ? 'true'
        : 'false'
    }

    const retry = await supabase
      .from('tasks')
      .update(fallbackUpdate)
      .eq('id', taskId)
    error = retry.error
  }

  if (error) {
    return { error: error.message }
  }

  let data: Record<string, unknown> | null = null
  // Best-effort fetch only; some policies may allow UPDATE but restrict SELECT.
  const updatedRow = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .maybeSingle()
  if (!updatedRow.error) {
    data = updatedRow.data
  }

  // Fire-and-forget activity logging + notifications
  if (oldData) {
    const projectId = options?.projectId || oldData.project_id
    logEntityUpdated('task', taskId, projectId, oldData, updateData)

    // Notify on status change
    if (updateData.status && oldData.status !== updateData.status) {
      notifyStatusChanged('task', taskId, projectId, user.id, String(oldData.status), String(updateData.status))
    }

    // Notify on assignment change
    if (updateData.assigned_to && oldData.assigned_to !== updateData.assigned_to) {
      notifyTaskAssigned(taskId, String(updateData.assigned_to), user.id, projectId, oldData.name || taskId)
    }
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

  const { data: oldData } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .maybeSingle()

  const { error } = await supabase.from('tasks').delete().eq('id', taskId)

  if (error) {
    return { error: error.message }
  }

  if (oldData) {
    logEntityDeleted('task', taskId, projectId, oldData)
  }

  revalidatePath(`/apex/${projectId}/tasks`)
  return { success: true }
}
