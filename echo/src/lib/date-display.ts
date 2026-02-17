const DATE_ONLY_VALUE = /^\d{4}-\d{2}-\d{2}$/
const DATE_LIKE_VALUE = /^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/

function toValidDate(rawValue: unknown): Date | null {
  if (rawValue === null || rawValue === undefined || rawValue === '') return null

  if (rawValue instanceof Date) {
    return Number.isNaN(rawValue.getTime()) ? null : rawValue
  }

  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim()
    if (!trimmed) return null

    if (DATE_ONLY_VALUE.test(trimmed)) {
      const [yearRaw, monthRaw, dayRaw] = trimmed.split('-')
      const year = Number(yearRaw)
      const month = Number(monthRaw)
      const day = Number(dayRaw)
      if (!year || !month || !day) return null
      const parsed = new Date(year, month - 1, day)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }

    if (!DATE_LIKE_VALUE.test(trimmed)) return null
    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  if (typeof rawValue === 'number') {
    const parsed = new Date(rawValue)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  return null
}

export function formatDateForDisplay(rawValue: unknown): string | null {
  const parsed = toValidDate(rawValue)
  if (!parsed) return null
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTimeForDisplay(rawValue: unknown): string | null {
  const parsed = toValidDate(rawValue)
  if (!parsed) return null
  const datePart = parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timePart = parsed.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${datePart} ${timePart}`
}

export function formatDateLikeForDisplay(rawValue: unknown): string | null {
  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim()
    if (!trimmed) return null
    if (DATE_ONLY_VALUE.test(trimmed)) {
      return formatDateForDisplay(trimmed)
    }
    if (DATE_LIKE_VALUE.test(trimmed)) {
      return formatDateTimeForDisplay(trimmed)
    }
    return null
  }

  if (rawValue instanceof Date || typeof rawValue === 'number') {
    return formatDateTimeForDisplay(rawValue)
  }

  return null
}
