import {
  appendAutoHeaderFields,
  type EntityHeaderFieldDraft,
  type HeaderEntityKey,
} from '@/lib/apex/entity-header-fields'

export type EntityInfoField = EntityHeaderFieldDraft

function isThumbnailField(field: EntityInfoField): boolean {
  const key = String(field.column || field.id).toLowerCase()
  return key === 'thumbnail_url' || key.includes('thumbnail')
}

function isPrimaryThumbnailField(field: EntityInfoField): boolean {
  const key = String(field.column || field.id).toLowerCase()
  return key === 'thumbnail_url' || key === 'thumbnail'
}

function isNonFilmstripThumbnail(field: EntityInfoField): boolean {
  const key = String(field.column || field.id).toLowerCase()
  return isThumbnailField(field) && !key.includes('filmstrip')
}

function isLikelyLongTextField(field: EntityInfoField): boolean {
  const id = field.id.toLowerCase()
  const label = field.label.toLowerCase()
  return (
    id.includes('description') ||
    id.includes('notes') ||
    id.includes('summary') ||
    id.includes('comment') ||
    label.includes('description') ||
    label.includes('notes') ||
    label.includes('summary') ||
    label.includes('comment')
  )
}

export function buildEntityInfoFields(
  entity: HeaderEntityKey,
  row: Record<string, unknown>,
  manualFields: EntityInfoField[] = [],
  options?: {
    excludeColumns?: string[]
  }
): EntityInfoField[] {
  const rawFields = appendAutoHeaderFields(entity, row, manualFields, {
    includeDefaultExcluded: true,
    excludeColumns: options?.excludeColumns,
  })

  const seen = new Set<string>()
  const fields: EntityInfoField[] = []

  for (const field of rawFields) {
    const id = String(field.id || '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)

    if (field.type === 'text' && isLikelyLongTextField(field)) {
      fields.push({
        ...field,
        type: 'textarea',
      })
      continue
    }

    fields.push(field)
  }

  let thumbnailIndex = fields.findIndex((field) => isPrimaryThumbnailField(field))
  if (thumbnailIndex < 0) {
    thumbnailIndex = fields.findIndex((field) => isNonFilmstripThumbnail(field))
  }
  if (thumbnailIndex < 0) {
    thumbnailIndex = fields.findIndex((field) => isThumbnailField(field))
  }
  if (thumbnailIndex > 0) {
    const [thumbnailField] = fields.splice(thumbnailIndex, 1)
    fields.unshift(thumbnailField)
  }

  return fields
}
