'use client'

import { useEffect, useMemo, useState } from 'react'
import { SCHEMA, type EntityKey, type SchemaField } from '@/lib/schema'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const DEFAULT_EXCLUDE = new Set([
  'id',
  'project_id',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
])

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function toDateTimeLocalInputValue(rawValue: any): string {
  if (rawValue === null || rawValue === undefined || rawValue === '') return ''
  const parsed = new Date(rawValue)
  if (Number.isNaN(parsed.getTime())) return ''
  return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}T${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`
}

function listToString(value: any) {
  return Array.isArray(value) ? value.join(', ') : ''
}

function stringToList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function isLongText(field: SchemaField) {
  const name = field.name.toLowerCase()
  return (
    name.includes('description') ||
    name.includes('notes') ||
    name.includes('comment') ||
    name.includes('brief') ||
    name.includes('body') ||
    name.includes('content')
  )
}

export function SchemaExtraFields(props: {
  entity: EntityKey
  values: Record<string, any>
  onChange: (next: Record<string, any>) => void
  excludeColumns?: Set<string>
  disabled?: boolean
  title?: string
}) {
  const schema = SCHEMA[props.entity]
  const exclude = props.excludeColumns ?? DEFAULT_EXCLUDE

  const fields = useMemo(() => {
    return schema.fields
      .filter((field) => !field.virtual && field.column)
      .filter((field) => field.fieldType !== 'system_owned')
      .filter((field) => !exclude.has(field.column as string))
  }, [schema.fields, exclude])

  const fieldByColumn = useMemo(() => {
    const map = new Map<string, SchemaField>()
    for (const field of fields) {
      if (!field.column) continue
      map.set(field.column, field)
    }
    return map
  }, [fields])

  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    // When values are set externally (or prefilled), ensure those columns become visible.
    setSelectedColumns((prev) => {
      const next = new Set(prev)
      for (const column of Object.keys(props.values ?? {})) {
        if (!fieldByColumn.has(column)) continue
        next.add(column)
      }
      return next
    })
  }, [fieldByColumn, props.values])

  const setValue = (column: string, value: any) => {
    props.onChange({ ...props.values, [column]: value })
  }

  const toggleColumn = (column: string, checked: boolean) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(column)
      } else {
        next.delete(column)
      }
      return next
    })

    if (!checked && Object.prototype.hasOwnProperty.call(props.values, column)) {
      const { [column]: _, ...rest } = props.values
      props.onChange(rest)
    }
  }

  if (fields.length === 0) return null

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={props.disabled}
              className="flex items-center gap-2 text-sm font-medium text-zinc-200 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {props.title ?? 'More fields'}
              <ChevronDown className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80">
            <DropdownMenuLabel>More fields</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-72 overflow-y-auto pr-1">
              {fields.map((field) => {
                const column = field.column as string
                const checked = selectedColumns.has(column)
                return (
                  <DropdownMenuCheckboxItem
                    key={column}
                    checked={checked}
                    onCheckedChange={(next) => toggleColumn(column, Boolean(next))}
                    disabled={props.disabled}
                  >
                    {field.name}
                  </DropdownMenuCheckboxItem>
                )
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {selectedColumns.size > 0 ? (
          <span className="text-xs text-zinc-500">{selectedColumns.size} selected</span>
        ) : (
          <span className="text-xs text-zinc-600">Select optional fields</span>
        )}
      </div>

      {Array.from(selectedColumns)
        .filter((column) => fieldByColumn.has(column))
        .map((column) => {
          const field = fieldByColumn.get(column)!
          const pgType = field.pgType || 'text'
          const value = props.values[column]
          const disabled = props.disabled

          if (pgType.endsWith('[]')) {
            return (
              <div key={column} className="grid gap-2">
                <Label htmlFor={column}>{field.name}</Label>
                <Input
                  id={column}
                  value={listToString(value)}
                  onChange={(e) => setValue(column, stringToList(e.target.value))}
                  placeholder="Comma separated"
                  disabled={disabled}
                />
              </div>
            )
          }

          if (pgType === 'boolean') {
            return (
              <label key={column} className="flex items-center gap-2 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) => setValue(column, e.target.checked)}
                  disabled={disabled}
                  className="h-4 w-4 rounded border border-zinc-700 bg-zinc-900"
                />
                {field.name}
              </label>
            )
          }

          if (pgType === 'date') {
            return (
              <div key={column} className="grid gap-2">
                <Label htmlFor={column}>{field.name}</Label>
                <Input
                  id={column}
                  type="date"
                  value={typeof value === 'string' ? value : ''}
                  onChange={(e) => setValue(column, e.target.value || null)}
                  disabled={disabled}
                />
              </div>
            )
          }

          if (pgType === 'timestamptz') {
            return (
              <div key={column} className="grid gap-2">
                <Label htmlFor={column}>{field.name}</Label>
                <Input
                  id={column}
                  type="datetime-local"
                  value={toDateTimeLocalInputValue(value)}
                  onChange={(e) => {
                    if (!e.target.value) return setValue(column, null)
                    const parsed = new Date(e.target.value)
                    if (Number.isNaN(parsed.getTime())) return setValue(column, null)
                    setValue(column, parsed.toISOString())
                  }}
                  disabled={disabled}
                />
              </div>
            )
          }

          if (pgType === 'integer' || pgType === 'numeric' || pgType === 'double precision') {
            return (
              <div key={column} className="grid gap-2">
                <Label htmlFor={column}>{field.name}</Label>
                <Input
                  id={column}
                  type="number"
                  value={value === null || value === undefined ? '' : String(value)}
                  onChange={(e) => {
                    const raw = e.target.value
                    if (raw.trim() === '') return setValue(column, null)
                    const parsed = Number(raw)
                    setValue(column, Number.isNaN(parsed) ? null : parsed)
                  }}
                  disabled={disabled}
                />
              </div>
            )
          }

          if (isLongText(field)) {
            return (
              <div key={column} className="grid gap-2">
                <Label htmlFor={column}>{field.name}</Label>
                <Textarea
                  id={column}
                  value={typeof value === 'string' ? value : value ?? ''}
                  onChange={(e) => setValue(column, e.target.value)}
                  rows={3}
                  disabled={disabled}
                />
              </div>
            )
          }

          return (
            <div key={column} className="grid gap-2">
              <Label htmlFor={column}>{field.name}</Label>
              <Input
                id={column}
                value={typeof value === 'string' ? value : value ?? ''}
                onChange={(e) => setValue(column, e.target.value)}
                disabled={disabled}
              />
            </div>
          )
        })}
    </div>
  )
}
