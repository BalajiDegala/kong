import { createClient } from '@/lib/supabase/client'
import { asText, isMissingTableError } from '@/lib/fields/utils'

const TAG_TABLE_CANDIDATES = ['tags', 'tag'] as const

export async function listTagNames(): Promise<string[]> {
  const supabase = createClient()

  for (const table of TAG_TABLE_CANDIDATES) {
    const { data, error } = await supabase.from(table).select('*')

    if (error) {
      if (isMissingTableError(error)) continue
      throw new Error(asText((error as unknown as Record<string, unknown>).message) || 'Failed to load tags')
    }

    const names = (data || [])
      .map((row) => asText((row as Record<string, unknown>).name || (row as Record<string, unknown>).tag_name).trim())
      .filter(Boolean)

    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
  }

  return []
}

export function parseTagsValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asText(item).trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}
