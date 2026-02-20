/**
 * Unified Field System — Main Exports
 *
 * Single import point for the entire field system.
 */

// Types
export type {
  EntityKey,
  ExtendedEntityKey,
  FieldDataType,
  FieldValue,
  FormatOptions,
  FieldConstraints,
  ValidationResult,
  FieldTypeDefinition,
  OptionSourceConfig,
  ComputedFormulaType,
  ComputedFieldFormula,
  FieldBehavior,
  FieldOption,
  EntityLinkConfig,
  EntityResolutionMap,
  ResolveOptions,
  TableColumnType,
  TableEditorType,
  RenderContext,
} from './types'

// Utils
export {
  asText,
  parseTextArray,
  arrayToString,
  parseNumber,
  toIdKey,
  toNumericId,
  titleCase,
  normalizeNullableText,
  workingDaysBetween,
  isMissingTableError,
} from './utils'

// Field Type Registry
export { getFieldType, getAllFieldTypes, isValidDataType } from './field-types'

// Computed Fields
export {
  getComputedFormulas,
  getComputedFormula,
  recalculateComputedFields,
  calculateAllComputedFields,
  getMyTasksBucket,
} from './computed-fields'
export type { MyTasksBucket } from './computed-fields'

// Entity Links
export { ENTITY_LINK_REGISTRY, getEntityLinkConfig } from './entity-links'

// Field-Entity Map
export {
  FIELD_ENTITY_MAP,
  getFieldEntityTarget,
  getEntityLinkedFields,
} from './field-entity-map'

// Options Loader
export { loadAllFieldOptions, loadFieldOptions } from './options-loader'

// Entity Resolver
export {
  resolveEntityLinks,
  resolveLabel,
  getResolvedEntityData,
} from './entity-resolver'

// Entity Field Definitions
export { getFieldDefinitions, getFieldBehavior } from './entity-fields'

// Row Enricher
export { enrichRow, enrichRows, buildUpdatePatch } from './row-enricher'

// Context Adapters
export {
  toTableColumn,
  toTableColumns,
  toHeaderField,
  toInfoField,
  toQueueItem,
  toDetailContext,
} from './context-adapters'
export type {
  EntityHeaderFieldDraft,
  HeaderFieldType,
  QueueItemData,
  DetailContextData,
} from './context-adapters'

// Field Update Handler
export { prepareFieldUpdate } from './field-update-handler'
export type { UpdateResult } from './field-update-handler'

// Detail Builder (server-side, for Server Component layouts)
export { buildDetailFields } from './detail-builder'
export type { DetailBuilderConfig, DetailBuilderResult } from './detail-builder'

// Entity Actions
export {
  getUpdateAction,
  getDeleteAction,
  dispatchUpdate,
  dispatchDelete,
} from './entity-actions'

// Filter Helpers
export {
  buildTextFilterOptions,
  buildDateFilterOptions,
  toDateFilterBucket,
  matchesDateFilter,
  matchesStringFilter,
} from './filter-helpers'
export type {
  FilterOption,
  FilterSection,
  DateFilterBucket,
} from './filter-helpers'
