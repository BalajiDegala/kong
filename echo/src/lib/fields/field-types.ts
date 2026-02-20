/**
 * Unified Field System — Field Type Registry
 *
 * Defines how each data type behaves regardless of which entity uses it.
 * Every type has: parse, format, serialize, validate, compare.
 */

import type {
  FieldDataType,
  FieldTypeDefinition,
  FieldValue,
  FormatOptions,
  FieldConstraints,
  ValidationResult,
} from './types'
import { asText, parseNumber, parseTextArray, arrayToString, workingDaysBetween } from './utils'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function ok(): ValidationResult {
  return { valid: true }
}

function fail(error: string): ValidationResult {
  return { valid: false, error }
}

function compareNullable(a: FieldValue, b: FieldValue): number {
  if (a === null && b === null) return 0
  if (a === null) return -1
  if (b === null) return 1
  return 0 // caller handles non-null comparison
}

function compareStrings(a: FieldValue, b: FieldValue): number {
  const na = compareNullable(a, b)
  if (a === null || b === null) return na
  return String(a).localeCompare(String(b))
}

function compareNumbers(a: FieldValue, b: FieldValue): number {
  const na = compareNullable(a, b)
  if (a === null || b === null) return na
  return Number(a) - Number(b)
}

function parseBool(raw: unknown): boolean | null {
  if (raw === null || raw === undefined || raw === '') return null
  if (typeof raw === 'boolean') return raw
  const s = String(raw).trim().toLowerCase()
  if (s === 'true' || s === '1' || s === 'yes') return true
  if (s === 'false' || s === '0' || s === 'no') return false
  return null
}

function validateConstraints(
  value: FieldValue,
  constraints?: FieldConstraints
): ValidationResult {
  if (!constraints) return ok()
  if (constraints.required && (value === null || value === '' || value === undefined)) {
    return fail('This field is required')
  }
  if (typeof value === 'number') {
    if (constraints.min !== undefined && value < constraints.min) {
      return fail(`Minimum value is ${constraints.min}`)
    }
    if (constraints.max !== undefined && value > constraints.max) {
      return fail(`Maximum value is ${constraints.max}`)
    }
  }
  if (typeof value === 'string') {
    if (constraints.minLength !== undefined && value.length < constraints.minLength) {
      return fail(`Minimum length is ${constraints.minLength}`)
    }
    if (constraints.maxLength !== undefined && value.length > constraints.maxLength) {
      return fail(`Maximum length is ${constraints.maxLength}`)
    }
    if (constraints.pattern) {
      const regex = new RegExp(constraints.pattern)
      if (!regex.test(value)) {
        return fail('Value does not match required pattern')
      }
    }
  }
  return ok()
}

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

const textType: FieldTypeDefinition = {
  type: 'text',
  label: 'Text',
  pgType: 'text',
  editable: true,
  computable: false,
  needsOptions: false,
  parse: (raw) => (raw == null ? null : String(raw)),
  format: (value) => asText(value),
  serialize: (value) => (value === '' ? null : value),
  validate: (value, c) => validateConstraints(value, c),
  defaultValue: null,
  compare: compareStrings,
}

const textAreaType: FieldTypeDefinition = {
  type: 'text_area',
  label: 'Text Area',
  pgType: 'text',
  editable: true,
  computable: false,
  needsOptions: false,
  parse: (raw) => (raw == null ? null : String(raw)),
  format: (value) => asText(value),
  serialize: (value) => (value === '' ? null : value),
  validate: (value, c) => validateConstraints(value, c),
  defaultValue: null,
  compare: compareStrings,
}

const numberType: FieldTypeDefinition = {
  type: 'number',
  label: 'Number',
  pgType: 'integer',
  editable: true,
  computable: true,
  needsOptions: false,
  parse: (raw) => parseNumber(raw),
  format: (value) => {
    if (value === null) return ''
    return String(Math.round(Number(value)))
  },
  serialize: (value) => value,
  validate: (value, c) => validateConstraints(value, c),
  defaultValue: null,
  compare: compareNumbers,
}

const floatType: FieldTypeDefinition = {
  type: 'float',
  label: 'Float',
  pgType: 'double precision',
  editable: true,
  computable: true,
  needsOptions: false,
  parse: (raw) => parseNumber(raw),
  format: (value, options) => {
    if (value === null) return ''
    const places = options?.decimalPlaces ?? 2
    return Number(value).toFixed(places)
  },
  serialize: (value) => value,
  validate: (value, c) => validateConstraints(value, c),
  defaultValue: null,
  compare: compareNumbers,
}

const checkboxType: FieldTypeDefinition = {
  type: 'checkbox',
  label: 'Checkbox',
  pgType: 'boolean',
  editable: true,
  computable: false,
  needsOptions: false,
  parse: (raw) => parseBool(raw),
  format: (value) => {
    if (value === null) return ''
    return value ? 'Yes' : 'No'
  },
  serialize: (value) => value,
  validate: () => ok(),
  defaultValue: false,
  compare: (a, b) => {
    if (a === b) return 0
    if (a === null) return -1
    if (b === null) return 1
    return a ? 1 : -1
  },
}

const dateType: FieldTypeDefinition = {
  type: 'date',
  label: 'Date',
  pgType: 'date',
  editable: true,
  computable: true,
  needsOptions: false,
  parse: (raw) => {
    if (raw == null || raw === '') return null
    const s = String(raw).trim()
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return s
    return s.slice(0, 10) // YYYY-MM-DD
  },
  format: (value) => {
    if (value === null || value === '') return ''
    const d = new Date(String(value))
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  },
  serialize: (value) => (value === '' ? null : value),
  validate: (value, c) => validateConstraints(value, c),
  defaultValue: null,
  compare: (a, b) => {
    const na = compareNullable(a, b)
    if (a === null || b === null) return na
    const aTime = new Date(String(a)).getTime()
    const bTime = new Date(String(b)).getTime()
    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0
    if (Number.isNaN(aTime)) return -1
    if (Number.isNaN(bTime)) return 1
    return aTime - bTime
  },
}

const dateTimeType: FieldTypeDefinition = {
  type: 'date_time',
  label: 'Date Time',
  pgType: 'timestamptz',
  editable: false,
  computable: false,
  needsOptions: false,
  parse: (raw) => (raw == null || raw === '' ? null : String(raw)),
  format: (value) => {
    if (value === null || value === '') return ''
    const d = new Date(String(value))
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  },
  serialize: (value) => value,
  validate: () => ok(),
  defaultValue: null,
  compare: dateType.compare,
}

const durationType: FieldTypeDefinition = {
  type: 'duration',
  label: 'Duration',
  pgType: 'numeric',
  editable: true,
  computable: true,
  needsOptions: false,
  parse: (raw) => parseNumber(raw),
  format: (value, options) => {
    if (value === null) return ''
    const num = Number(value)
    const unit = options?.durationUnit ?? 'hours'
    if (unit === 'days') return `${(num / 8).toFixed(1)}d`
    if (unit === 'minutes') return `${Math.round(num * 60)}m`
    const hours = Math.floor(num)
    const minutes = Math.round((num - hours) * 60)
    if (minutes === 0) return `${hours}h`
    return `${hours}h ${minutes}m`
  },
  serialize: (value) => value,
  validate: (value) => {
    if (value !== null && typeof value === 'number' && value < 0) {
      return fail('Duration cannot be negative')
    }
    return ok()
  },
  defaultValue: null,
  compare: compareNumbers,
}

const percentType: FieldTypeDefinition = {
  type: 'percent',
  label: 'Percent',
  pgType: 'numeric',
  editable: true,
  computable: true,
  needsOptions: false,
  parse: (raw) => parseNumber(raw),
  format: (value) => {
    if (value === null) return ''
    return `${Number(value)}%`
  },
  serialize: (value) => value,
  validate: (value, c) => validateConstraints(value, c),
  defaultValue: null,
  compare: compareNumbers,
}

const currencyType: FieldTypeDefinition = {
  type: 'currency',
  label: 'Currency',
  pgType: 'numeric',
  editable: true,
  computable: true,
  needsOptions: false,
  parse: (raw) => parseNumber(raw),
  format: (value, options) => {
    if (value === null) return ''
    const symbol = options?.currencySymbol ?? '$'
    return `${symbol}${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  },
  serialize: (value) => value,
  validate: (value, c) => validateConstraints(value, c),
  defaultValue: null,
  compare: compareNumbers,
}

const timecodeType: FieldTypeDefinition = {
  type: 'timecode',
  label: 'Timecode',
  pgType: 'text',
  editable: true,
  computable: true,
  needsOptions: false,
  parse: (raw) => (raw == null || raw === '' ? null : String(raw)),
  format: (value) => asText(value),
  serialize: (value) => (value === '' ? null : value),
  validate: (value, c) => validateConstraints(value, c),
  defaultValue: null,
  compare: compareStrings,
}

const listType: FieldTypeDefinition = {
  type: 'list',
  label: 'List',
  pgType: 'text',
  editable: true,
  computable: false,
  needsOptions: true,
  parse: (raw) => (raw == null || raw === '' ? null : String(raw)),
  format: (value) => asText(value),
  serialize: (value) => (value === '' ? null : value),
  validate: (value, c) => validateConstraints(value, c),
  defaultValue: null,
  compare: compareStrings,
}

const statusListType: FieldTypeDefinition = {
  type: 'status_list',
  label: 'Status List',
  pgType: 'text',
  editable: true,
  computable: false,
  needsOptions: true,
  parse: (raw) => (raw == null || raw === '' ? null : String(raw)),
  format: (value) => asText(value),
  serialize: (value) => (value === '' ? null : value),
  validate: (value, c) => validateConstraints(value, c),
  defaultValue: null,
  compare: compareStrings,
}

const entityType: FieldTypeDefinition = {
  type: 'entity',
  label: 'Entity',
  pgType: 'integer',
  editable: true,
  computable: false,
  needsOptions: true,
  parse: (raw) => (raw == null || raw === '' ? null : String(raw)),
  format: (value) => asText(value),
  serialize: (value) => {
    if (value === null || value === '') return null
    const num = Number(value)
    return Number.isFinite(num) ? num : value
  },
  validate: (value, c) => validateConstraints(value, c),
  defaultValue: null,
  compare: compareStrings,
}

const multiEntityType: FieldTypeDefinition = {
  type: 'multi_entity',
  label: 'Multi Entity',
  pgType: 'text[]',
  editable: true,
  computable: false,
  needsOptions: true,
  parse: (raw) => parseTextArray(raw),
  format: (value) => {
    if (Array.isArray(value)) return arrayToString(value)
    return asText(value)
  },
  serialize: (value) => {
    if (Array.isArray(value)) return value
    return parseTextArray(value)
  },
  validate: () => ok(),
  defaultValue: null,
  compare: (a, b) => {
    const aStr = Array.isArray(a) ? a.join(',') : asText(a)
    const bStr = Array.isArray(b) ? b.join(',') : asText(b)
    return aStr.localeCompare(bStr)
  },
}

const tagListType: FieldTypeDefinition = {
  type: 'tag_list',
  label: 'Tags',
  pgType: 'text[]',
  editable: true,
  computable: false,
  needsOptions: true,
  parse: (raw) => parseTextArray(raw),
  format: (value) => {
    if (Array.isArray(value)) return arrayToString(value)
    return asText(value)
  },
  serialize: (value) => {
    if (Array.isArray(value)) return value
    return parseTextArray(value)
  },
  validate: () => ok(),
  defaultValue: null,
  compare: multiEntityType.compare,
}

const imageType: FieldTypeDefinition = {
  type: 'image',
  label: 'Image',
  pgType: 'text',
  editable: false,
  computable: false,
  needsOptions: false,
  parse: (raw) => (raw == null || raw === '' ? null : String(raw)),
  format: (value) => asText(value),
  serialize: (value) => (value === '' ? null : value),
  validate: () => ok(),
  defaultValue: null,
  compare: compareStrings,
}

const urlType: FieldTypeDefinition = {
  type: 'url',
  label: 'URL',
  pgType: 'text',
  editable: true,
  computable: false,
  needsOptions: false,
  parse: (raw) => (raw == null || raw === '' ? null : String(raw)),
  format: (value) => asText(value),
  serialize: (value) => (value === '' ? null : value),
  validate: (value, c) => validateConstraints(value, c),
  defaultValue: null,
  compare: compareStrings,
}

const colorType: FieldTypeDefinition = {
  type: 'color',
  label: 'Color',
  pgType: 'text',
  editable: true,
  computable: false,
  needsOptions: false,
  parse: (raw) => (raw == null || raw === '' ? null : String(raw)),
  format: (value) => asText(value),
  serialize: (value) => (value === '' ? null : value),
  validate: () => ok(),
  defaultValue: null,
  compare: compareStrings,
}

const serializableType: FieldTypeDefinition = {
  type: 'serializable',
  label: 'JSON',
  pgType: 'jsonb',
  editable: false,
  computable: false,
  needsOptions: false,
  parse: (raw) => {
    if (raw == null) return null
    if (typeof raw === 'string') return raw
    try {
      return JSON.stringify(raw)
    } catch {
      return String(raw)
    }
  },
  format: (value) => {
    if (value === null) return ''
    if (typeof value === 'string') {
      try {
        return JSON.stringify(JSON.parse(value), null, 2)
      } catch {
        return value
      }
    }
    return String(value)
  },
  serialize: (value) => {
    if (value === null) return null
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    }
    return value
  },
  validate: () => ok(),
  defaultValue: null,
  compare: compareStrings,
}

const calculatedType: FieldTypeDefinition = {
  type: 'calculated',
  label: 'Calculated',
  pgType: null,
  editable: false,
  computable: true,
  needsOptions: false,
  parse: (raw) => (raw == null ? null : typeof raw === 'number' ? raw : String(raw)),
  format: (value) => asText(value),
  serialize: (value) => value,
  validate: () => ok(),
  defaultValue: null,
  compare: compareStrings,
}

const queryType: FieldTypeDefinition = {
  type: 'query',
  label: 'Query',
  pgType: null,
  editable: false,
  computable: true,
  needsOptions: false,
  parse: (raw) => (raw == null ? null : typeof raw === 'number' ? raw : String(raw)),
  format: (value) => asText(value),
  serialize: (value) => value,
  validate: () => ok(),
  defaultValue: null,
  compare: compareStrings,
}

const summaryType: FieldTypeDefinition = {
  type: 'summary',
  label: 'Summary',
  pgType: null,
  editable: false,
  computable: true,
  needsOptions: false,
  parse: (raw) => (raw == null ? null : typeof raw === 'number' ? raw : String(raw)),
  format: (value) => asText(value),
  serialize: (value) => value,
  validate: () => ok(),
  defaultValue: null,
  compare: compareStrings,
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const FIELD_TYPE_REGISTRY: Record<FieldDataType, FieldTypeDefinition> = {
  text: textType,
  text_area: textAreaType,
  number: numberType,
  float: floatType,
  checkbox: checkboxType,
  date: dateType,
  date_time: dateTimeType,
  duration: durationType,
  percent: percentType,
  currency: currencyType,
  timecode: timecodeType,
  list: listType,
  status_list: statusListType,
  entity: entityType,
  multi_entity: multiEntityType,
  tag_list: tagListType,
  image: imageType,
  url: urlType,
  color: colorType,
  serializable: serializableType,
  calculated: calculatedType,
  query: queryType,
  summary: summaryType,
}

/** Get the type definition for a field data type */
export function getFieldType(dataType: FieldDataType): FieldTypeDefinition {
  return FIELD_TYPE_REGISTRY[dataType] || FIELD_TYPE_REGISTRY.text
}

/** Get all registered field types */
export function getAllFieldTypes(): FieldTypeDefinition[] {
  return Object.values(FIELD_TYPE_REGISTRY)
}

/** Check if a data type string is a valid FieldDataType */
export function isValidDataType(dataType: string): dataType is FieldDataType {
  return dataType in FIELD_TYPE_REGISTRY
}

// Re-export the workingDaysBetween utility for computed fields
export { workingDaysBetween }
