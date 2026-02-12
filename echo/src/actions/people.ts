'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function createUser(formData: {
  email: string
  password: string
  display_name: string
  firstname?: string
  lastname?: string
  department_name?: string
  role?: string
  avatar_url?: string | null
  project_memberships?: Array<{
    project_id: string | number
    role?: string
  }>
}) {
  const supabase = await createClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) {
    return { error: 'Not authenticated' }
  }

  const serviceClient = createServiceClient()

  // Resolve department_id from name if provided
  let departmentId: number | null = null
  if (formData.department_name?.trim()) {
    const deptName = formData.department_name.trim()
    const deptCode = deptName.toLowerCase().replace(/\s+/g, '_')

    // Try to find existing department
    const { data: existing } = await serviceClient
      .from('departments')
      .select('id')
      .eq('code', deptCode)
      .single()

    if (existing) {
      departmentId = existing.id
    } else {
      // Create new department
      const { data: newDept, error: deptError } = await serviceClient
        .from('departments')
        .insert({ code: deptCode, name: deptName })
        .select('id')
        .single()

      if (deptError) {
        return { error: `Failed to create department: ${deptError.message}` }
      }
      departmentId = newDept.id
    }
  }

  // Create auth user
  const { data: authData, error: authError } =
    await serviceClient.auth.admin.createUser({
      email: formData.email,
      password: formData.password,
      email_confirm: true,
    })

  if (authError) {
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: 'Failed to create auth user' }
  }

  // Create profile
  const { data, error } = await serviceClient
    .from('profiles')
    .upsert({
      id: authData.user.id,
      email: formData.email,
      display_name: formData.display_name,
      firstname: formData.firstname || null,
      lastname: formData.lastname || null,
      avatar_url: formData.avatar_url ?? null,
      department_id: departmentId,
      role: formData.role || 'member',
      active: true,
      login_enabled: true,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  const membershipRole = new Set(['lead', 'member', 'viewer'])
  const membershipsByProject = new Map<number, 'lead' | 'member' | 'viewer'>()
  for (const membership of formData.project_memberships || []) {
    const parsedProjectId =
      typeof membership.project_id === 'number'
        ? membership.project_id
        : Number.parseInt(String(membership.project_id), 10)
    if (Number.isNaN(parsedProjectId)) continue
    const normalizedRole = membershipRole.has(String(membership.role))
      ? (membership.role as 'lead' | 'member' | 'viewer')
      : 'member'
    membershipsByProject.set(parsedProjectId, normalizedRole)
  }

  if (membershipsByProject.size > 0) {
    const membershipRows = Array.from(membershipsByProject.entries()).map(
      ([project_id, role]) => ({
        project_id,
        user_id: authData.user!.id,
        role,
      })
    )
    const { error: membershipError } = await serviceClient
      .from('project_members')
      .upsert(membershipRows, { onConflict: 'project_id,user_id' })

    if (membershipError) {
      return {
        error: `User created, but assigning project access failed: ${membershipError.message}`,
      }
    }
  }

  revalidatePath('/people')
  return { data }
}

export async function updateProfile(
  userId: string,
  formData: {
    display_name?: string
    firstname?: string | null
    lastname?: string | null
    avatar_url?: string | null
    department_id?: number | null
    role?: string
    active?: boolean
  }
) {
  const supabase = await createClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) {
    return { error: 'Not authenticated' }
  }

  const serviceClient = createServiceClient()

  const { data, error } = await serviceClient
    .from('profiles')
    .update(formData)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/people')
  return { data }
}

export async function setUserProjectAccess(
  userId: string,
  memberships: Array<{
    project_id: string | number
    role?: string
  }>
) {
  const supabase = await createClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) {
    return { error: 'Not authenticated' }
  }

  const serviceClient = createServiceClient()
  const membershipRole = new Set(['lead', 'member', 'viewer'])
  const membershipsByProject = new Map<number, 'lead' | 'member' | 'viewer'>()

  for (const membership of memberships || []) {
    const parsedProjectId =
      typeof membership.project_id === 'number'
        ? membership.project_id
        : Number.parseInt(String(membership.project_id), 10)
    if (Number.isNaN(parsedProjectId)) continue
    const normalizedRole = membershipRole.has(String(membership.role))
      ? (membership.role as 'lead' | 'member' | 'viewer')
      : 'member'
    membershipsByProject.set(parsedProjectId, normalizedRole)
  }

  const { error: deleteError } = await serviceClient
    .from('project_members')
    .delete()
    .eq('user_id', userId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  if (membershipsByProject.size > 0) {
    const rows = Array.from(membershipsByProject.entries()).map(
      ([project_id, role]) => ({
        project_id,
        user_id: userId,
        role,
      })
    )
    const { error: insertError } = await serviceClient
      .from('project_members')
      .insert(rows)

    if (insertError) {
      return { error: insertError.message }
    }
  }

  revalidatePath('/people')
  return { success: true }
}

export async function deleteUser(userId: string) {
  const supabase = await createClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) {
    return { error: 'Not authenticated' }
  }

  const serviceClient = createServiceClient()

  const { error } = await serviceClient
    .from('profiles')
    .update({
      active: false,
      login_enabled: false,
    })
    .eq('id', userId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/people')
  return { success: true }
}
