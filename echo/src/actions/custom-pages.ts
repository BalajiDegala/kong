'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { asText } from '@/lib/fields'

export type CustomPageVisibility = 'private' | 'shared_project' | 'shared_global'
export type CustomPageScopeType = 'global' | 'project' | 'multi_project'

type RecordValue = Record<string, unknown>

type CustomPageOwner = {
  id: string
  display_name?: string | null
  full_name?: string | null
}

export interface CustomPageRow {
  id: number
  owner_id: string
  owner: CustomPageOwner | null
  name: string
  slug: string | null
  entity_type: string
  scope_type: CustomPageScopeType
  project_id: number | null
  project_ids: number[]
  visibility: CustomPageVisibility
  definition: RecordValue
  default_state: RecordValue
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface CreateCustomPageInput {
  name: string
  slug?: string | null
  entity_type: string
  scope_type?: CustomPageScopeType
  project_id?: number | string | null
  project_ids?: Array<number | string> | null
  visibility?: CustomPageVisibility
  definition?: RecordValue | null
  default_state?: RecordValue | null
}

export interface UpdateCustomPageInput {
  name?: string
  slug?: string | null
  entity_type?: string
  scope_type?: CustomPageScopeType
  project_id?: number | string | null
  project_ids?: Array<number | string> | null
  visibility?: CustomPageVisibility
  definition?: RecordValue | null
  default_state?: RecordValue | null
  is_archived?: boolean
}

function asInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number.parseInt(trimmed, 10)
    if (Number.isNaN(parsed)) return null
    return parsed
  }
  return null
}

function normalizeProjectIds(values: Array<number | string> | null | undefined): number[] {
  const next = new Set<number>()
  for (const raw of values || []) {
    const parsed = asInt(raw)
    if (parsed === null || parsed <= 0) continue
    next.add(parsed)
  }
  return Array.from(next).sort((a, b) => a - b)
}

function normalizeOrderedIds(values: Array<number | string> | null | undefined): number[] {
  const next: number[] = []
  const seen = new Set<number>()
  for (const raw of values || []) {
    const parsed = asInt(raw)
    if (parsed === null || parsed <= 0) continue
    if (seen.has(parsed)) continue
    seen.add(parsed)
    next.push(parsed)
  }
  return next
}

function normalizeJsonRecord(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as RecordValue
}

function slugifyName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .slice(0, 80)
}

function normalizeOwner(value: unknown): CustomPageOwner | null {
  if (!value) return null
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== 'object') return null
  const record = row as Record<string, unknown>
  const id = asText(record.id).trim()
  if (!id) return null
  return {
    id,
    display_name: asText(record.display_name).trim() || null,
    full_name: asText(record.full_name).trim() || null,
  }
}

function normalizeCustomPageRow(row: unknown): CustomPageRow | null {
  if (!row) return null
  const rowRecord = Array.isArray(row) ? row[0] : row
  if (!rowRecord || typeof rowRecord !== 'object') return null
  const record = rowRecord as Record<string, unknown>

  const id = asInt(record.id)
  const ownerId = asText(record.owner_id).trim()
  const name = asText(record.name).trim()
  const entityType = asText(record.entity_type).trim()
  const scopeType = asText(record.scope_type).trim() as CustomPageScopeType
  const visibility = asText(record.visibility).trim() as CustomPageVisibility

  if (id === null || !ownerId || !name || !entityType) return null
  if (!['global', 'project', 'multi_project'].includes(scopeType)) return null
  if (!['private', 'shared_project', 'shared_global'].includes(visibility)) return null

  const projectIds = normalizeProjectIds(
    Array.isArray(record.project_ids) ? (record.project_ids as Array<number | string>) : []
  )

  return {
    id,
    owner_id: ownerId,
    owner: normalizeOwner(record.owner),
    name,
    slug: asText(record.slug).trim() || null,
    entity_type: entityType,
    scope_type: scopeType,
    project_id: asInt(record.project_id),
    project_ids: projectIds,
    visibility,
    definition: normalizeJsonRecord(record.definition),
    default_state: normalizeJsonRecord(record.default_state),
    is_archived: Boolean(record.is_archived),
    created_at: asText(record.created_at),
    updated_at: asText(record.updated_at),
  }
}

function isMissingTableError(error: unknown, tableName: string): boolean {
  if (!error) return false
  const record = typeof error === 'object' ? (error as Record<string, unknown>) : {}
  const code = asText(record.code).trim().toUpperCase()
  const message = asText(record.message).toLowerCase()
  const details = asText(record.details).toLowerCase()
  return (
    code === 'PGRST205' ||
    message.includes(tableName) ||
    details.includes(tableName) ||
    message.includes('does not exist') ||
    details.includes('does not exist')
  )
}

function resolveScopeType(input: {
  scope_type?: CustomPageScopeType
  project_id?: number | null
  project_ids?: number[]
}): CustomPageScopeType {
  if (input.scope_type) return input.scope_type
  if (input.project_id !== null && input.project_id !== undefined) return 'project'
  if ((input.project_ids || []).length > 0) return 'multi_project'
  return 'global'
}

function pageMatchesProject(page: CustomPageRow, projectId: number): boolean {
  if (page.scope_type === 'global') return true
  if (page.project_id === projectId) return true
  return page.project_ids.includes(projectId)
}

function isCustomPageVisibility(value: unknown): value is CustomPageVisibility {
  return value === 'private' || value === 'shared_project' || value === 'shared_global'
}

function isCustomPageScopeType(value: unknown): value is CustomPageScopeType {
  return value === 'global' || value === 'project' || value === 'multi_project'
}

export async function listCustomPages(options?: {
  project_id?: number | string | null
  include_archived?: boolean
  owner_only?: boolean
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  let query = supabase
    .from('custom_pages')
    .select(`
      id,
      owner_id,
      name,
      slug,
      entity_type,
      scope_type,
      project_id,
      project_ids,
      visibility,
      definition,
      default_state,
      is_archived,
      created_at,
      updated_at,
      owner:profiles!custom_pages_owner_id_fkey(id, display_name, full_name)
    `)
    .order('name', { ascending: true })
    .order('updated_at', { ascending: false })

  if (!options?.include_archived) {
    query = query.eq('is_archived', false)
  }

  if (options?.owner_only) {
    query = query.eq('owner_id', user.id)
  }

  const { data, error } = await query
  if (error) {
    if (isMissingTableError(error, 'custom_pages')) {
      return { data: [] as CustomPageRow[], available: false }
    }
    return { error: error.message }
  }

  let pages = (data || []).map(normalizeCustomPageRow).filter(Boolean) as CustomPageRow[]

  const projectId = asInt(options?.project_id)
  if (projectId !== null) {
    pages = pages.filter((page) => pageMatchesProject(page, projectId))
  }

  return { data: pages, available: true }
}

export async function getCustomPage(customPageId: number | string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const pageId = asInt(customPageId)
  if (pageId === null) return { error: 'Invalid custom page id' }

  const { data, error } = await supabase
    .from('custom_pages')
    .select(`
      id,
      owner_id,
      name,
      slug,
      entity_type,
      scope_type,
      project_id,
      project_ids,
      visibility,
      definition,
      default_state,
      is_archived,
      created_at,
      updated_at,
      owner:profiles!custom_pages_owner_id_fkey(id, display_name, full_name)
    `)
    .eq('id', pageId)
    .single()

  if (error) {
    if (isMissingTableError(error, 'custom_pages')) {
      return { error: 'custom_pages table not found. Run migration first.' }
    }
    return { error: error.message }
  }

  const page = normalizeCustomPageRow(data)
  if (!page) return { error: 'Custom page not found' }
  return { data: page }
}

export async function createCustomPage(input: CreateCustomPageInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const name = asText(input.name).trim()
  if (!name) return { error: 'Page name is required' }

  const entityType = asText(input.entity_type).trim()
  if (!entityType) return { error: 'Entity type is required' }

  const projectId = asInt(input.project_id)
  const projectIds = normalizeProjectIds(input.project_ids)
  if (projectId !== null && !projectIds.includes(projectId)) {
    projectIds.push(projectId)
  }

  const scopeType = resolveScopeType({
    scope_type: input.scope_type,
    project_id: projectId,
    project_ids: projectIds,
  })
  if (scopeType === 'project' && projectId === null) {
    return { error: 'Project scope pages require a valid project_id' }
  }

  const visibility = input.visibility || 'private'
  if (!isCustomPageVisibility(visibility)) {
    return { error: 'Invalid visibility value' }
  }
  const slugInput = asText(input.slug).trim()
  const slug = slugInput || slugifyName(name) || null

  const payload = {
    owner_id: user.id,
    name,
    slug,
    entity_type: entityType,
    scope_type: scopeType,
    project_id: projectId,
    project_ids: projectIds,
    visibility,
    definition: normalizeJsonRecord(input.definition),
    default_state: normalizeJsonRecord(input.default_state),
    is_archived: false,
  }

  const { data, error } = await supabase
    .from('custom_pages')
    .insert(payload)
    .select(`
      id,
      owner_id,
      name,
      slug,
      entity_type,
      scope_type,
      project_id,
      project_ids,
      visibility,
      definition,
      default_state,
      is_archived,
      created_at,
      updated_at,
      owner:profiles!custom_pages_owner_id_fkey(id, display_name, full_name)
    `)
    .single()

  if (error) {
    if (isMissingTableError(error, 'custom_pages')) {
      return { error: 'custom_pages table not found. Run migration first.' }
    }
    const code = asText((error as { code?: unknown }).code).trim()
    if (code === '23505') {
      return { error: 'A custom page with this identifier already exists.' }
    }
    return { error: error.message }
  }

  const page = normalizeCustomPageRow(data)
  if (!page) return { error: 'Failed to create custom page' }

  revalidatePath('/apex')
  if (page.project_id !== null) {
    revalidatePath(`/apex/${page.project_id}`)
  }
  return { data: page }
}

export async function updateCustomPage(
  customPageId: number | string,
  input: UpdateCustomPageInput
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const pageId = asInt(customPageId)
  if (pageId === null) return { error: 'Invalid custom page id' }

  const updateData: RecordValue = {}

  if (input.name !== undefined) {
    const name = asText(input.name).trim()
    if (!name) return { error: 'Page name is required' }
    updateData.name = name
    if (input.slug === undefined) {
      const autoSlug = slugifyName(name)
      updateData.slug = autoSlug || null
    }
  }

  if (input.slug !== undefined) {
    const slug = asText(input.slug).trim()
    updateData.slug = slug || null
  }

  if (input.entity_type !== undefined) {
    const entityType = asText(input.entity_type).trim()
    if (!entityType) return { error: 'Entity type is required' }
    updateData.entity_type = entityType
  }

  if (input.scope_type !== undefined) {
    if (!isCustomPageScopeType(input.scope_type)) {
      return { error: 'Invalid scope_type value' }
    }
    updateData.scope_type = input.scope_type
  }

  if (input.project_id !== undefined) {
    updateData.project_id = asInt(input.project_id)
  }

  if (input.project_ids !== undefined) {
    const projectIds = normalizeProjectIds(input.project_ids)
    const projectId =
      asInt(updateData.project_id) ??
      (input.project_id === undefined ? null : asInt(input.project_id))
    if (projectId !== null && !projectIds.includes(projectId)) {
      projectIds.push(projectId)
    }
    updateData.project_ids = projectIds
  }

  if (input.visibility !== undefined) {
    if (!isCustomPageVisibility(input.visibility)) {
      return { error: 'Invalid visibility value' }
    }
    updateData.visibility = input.visibility
  }

  if (input.definition !== undefined) {
    updateData.definition = normalizeJsonRecord(input.definition)
  }

  if (input.default_state !== undefined) {
    updateData.default_state = normalizeJsonRecord(input.default_state)
  }

  if (input.is_archived !== undefined) {
    updateData.is_archived = Boolean(input.is_archived)
  }

  if (Object.keys(updateData).length === 0) {
    return { error: 'No fields to update' }
  }

  const { data, error } = await supabase
    .from('custom_pages')
    .update(updateData)
    .eq('id', pageId)
    .select(`
      id,
      owner_id,
      name,
      slug,
      entity_type,
      scope_type,
      project_id,
      project_ids,
      visibility,
      definition,
      default_state,
      is_archived,
      created_at,
      updated_at,
      owner:profiles!custom_pages_owner_id_fkey(id, display_name, full_name)
    `)
    .single()

  if (error) {
    if (isMissingTableError(error, 'custom_pages')) {
      return { error: 'custom_pages table not found. Run migration first.' }
    }
    const code = asText((error as { code?: unknown }).code).trim()
    if (code === '23505') {
      return { error: 'A custom page with this identifier already exists.' }
    }
    return { error: error.message }
  }

  const page = normalizeCustomPageRow(data)
  if (!page) return { error: 'Failed to update custom page' }

  revalidatePath('/apex')
  if (page.project_id !== null) {
    revalidatePath(`/apex/${page.project_id}`)
  }
  return { data: page }
}

export async function deleteCustomPage(customPageId: number | string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const pageId = asInt(customPageId)
  if (pageId === null) return { error: 'Invalid custom page id' }

  const { data: existing } = await supabase
    .from('custom_pages')
    .select('project_id')
    .eq('id', pageId)
    .maybeSingle()

  const { error } = await supabase
    .from('custom_pages')
    .delete()
    .eq('id', pageId)

  if (error) {
    if (isMissingTableError(error, 'custom_pages')) {
      return { error: 'custom_pages table not found. Run migration first.' }
    }
    return { error: error.message }
  }

  revalidatePath('/apex')
  const projectId = asInt((existing as Record<string, unknown> | null)?.project_id)
  if (projectId !== null) {
    revalidatePath(`/apex/${projectId}`)
  }

  return { success: true }
}

export async function listMyCustomPageFavorites() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('custom_page_favorites')
    .select(`
      custom_page_id,
      position,
      custom_page:custom_pages(
        id,
        owner_id,
        name,
        slug,
        entity_type,
        scope_type,
        project_id,
        project_ids,
        visibility,
        definition,
        default_state,
        is_archived,
        created_at,
        updated_at,
        owner:profiles!custom_pages_owner_id_fkey(id, display_name, full_name)
      )
    `)
    .eq('user_id', user.id)
    .order('position', { ascending: true })
    .order('custom_page_id', { ascending: true })

  if (error) {
    if (isMissingTableError(error, 'custom_page_favorites')) {
      return { data: [] as Array<{ custom_page_id: number; position: number; custom_page: CustomPageRow | null }>, available: false }
    }
    return { error: error.message }
  }

  const rows = (data || []).map((row) => {
    const record = row as Record<string, unknown>
    const customPageId = asInt(record.custom_page_id) ?? 0
    const position = asInt(record.position) ?? 0
    return {
      custom_page_id: customPageId,
      position,
      custom_page: normalizeCustomPageRow(record.custom_page),
    }
  })

  return { data: rows, available: true }
}

export async function setCustomPageFavorite(
  customPageId: number | string,
  isFavorite: boolean,
  position = 0
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const pageId = asInt(customPageId)
  if (pageId === null) return { error: 'Invalid custom page id' }

  if (!isFavorite) {
    const { error } = await supabase
      .from('custom_page_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('custom_page_id', pageId)

    if (error) {
      if (isMissingTableError(error, 'custom_page_favorites')) {
        return { error: 'custom_page_favorites table not found. Run migration first.' }
      }
      return { error: error.message }
    }
    return { success: true }
  }

  const safePosition = Math.max(0, asInt(position) ?? 0)
  const { error } = await supabase
    .from('custom_page_favorites')
    .upsert(
      {
        user_id: user.id,
        custom_page_id: pageId,
        position: safePosition,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,custom_page_id' }
    )

  if (error) {
    if (isMissingTableError(error, 'custom_page_favorites')) {
      return { error: 'custom_page_favorites table not found. Run migration first.' }
    }
    return { error: error.message }
  }

  return { success: true }
}

export async function reorderCustomPageFavorites(
  orderedCustomPageIds: Array<number | string>
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const pageIds = normalizeOrderedIds(orderedCustomPageIds)
  if (pageIds.length === 0) return { success: true }

  const payload = pageIds.map((pageId, index) => ({
    user_id: user.id,
    custom_page_id: pageId,
    position: index,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('custom_page_favorites')
    .upsert(payload, { onConflict: 'user_id,custom_page_id' })

  if (error) {
    if (isMissingTableError(error, 'custom_page_favorites')) {
      return { error: 'custom_page_favorites table not found. Run migration first.' }
    }
    return { error: error.message }
  }

  return { success: true }
}
