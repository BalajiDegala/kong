export type TableColumn = {
  id: string
  label: string
  type:
    | 'text'
    | 'thumbnail'
    | 'link'
    | 'select'
    | 'status'
    | 'number'
    | 'links'
    | 'pipeline'
    | 'date'
    | 'datetime'
    | 'url'
    | 'color'
    | 'boolean'
    | 'json'
  width?: string
  editable?: boolean
  editor?:
    | 'text'
    | 'textarea'
    | 'select'
    | 'multiselect'
    | 'checkbox'
    | 'date'
    | 'datetime'
    | 'number'
    | 'color'
    | 'url'
  options?: Array<{ value: string; label: string }>
  formatValue?: (value: any, row: any) => string
  parseValue?: (value: any, row?: any) => any
  linkHref?: (row: any) => string
}

export type TableSort = {
  id: string
  direction: 'asc' | 'desc'
}
