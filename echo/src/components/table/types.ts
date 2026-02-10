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
  width?: string
  editable?: boolean
  editor?: 'text' | 'textarea' | 'select' | 'checkbox'
  options?: Array<{ value: string; label: string }>
  formatValue?: (value: any, row: any) => string
  parseValue?: (value: string, row: any) => any
  linkHref?: (row: any) => string
}

export type TableSort = {
  id: string
  direction: 'asc' | 'desc'
}
