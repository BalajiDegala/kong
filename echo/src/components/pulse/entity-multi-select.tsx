'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, X, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Option {
  id: string | number
  label: string
  subLabel?: string
}

interface EntityMultiSelectProps {
  label: string
  placeholder?: string
  options: Option[]
  selectedIds: (string | number)[]
  onChange: (selectedIds: (string | number)[]) => void
  disabled?: boolean
  className?: string
  searchable?: boolean
}

export function EntityMultiSelect({
  label,
  placeholder = 'Select...',
  options,
  selectedIds,
  onChange,
  disabled = false,
  className = '',
  searchable = true,
}: EntityMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const filteredOptions = searchable
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options

  const selectedOptions = options.filter((opt) => selectedIds.includes(opt.id))

  const toggleOption = (id: string | number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  const removeOption = (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selectedIds.filter((selectedId) => selectedId !== id))
  }

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Label */}
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
        {label}
      </label>

      {/* Trigger Button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2
          bg-card border border-border rounded-md
          text-sm text-foreground/70
          hover:border-border transition
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen ? 'border-primary/50' : ''}
        `}
      >
        <div className="flex-1 flex flex-wrap gap-1 items-center min-h-[20px]">
          {selectedOptions.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedOptions.map((opt) => (
              <Badge
                key={opt.id}
                variant="secondary"
                className="bg-primary/10 text-primary border-primary/20 text-xs flex items-center gap-1"
              >
                {opt.label}
                <button
                  type="button"
                  onClick={(e) => removeOption(opt.id, e)}
                  className="hover:text-primary/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          )}
        </div>
        <div className="flex items-center gap-1">
          {selectedOptions.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-muted-foreground hover:text-foreground/70 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-[300px] overflow-hidden flex flex-col">
          {/* Search Input */}
          {searchable && options.length > 5 && (
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 bg-background border-border text-sm"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                No results found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedIds.includes(option.id)
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleOption(option.id)}
                    className={`
                      w-full flex items-center gap-2 px-3 py-2 text-sm
                      hover:bg-accent transition text-left
                      ${isSelected ? 'bg-accent/50' : ''}
                    `}
                  >
                    <div
                      className={`
                        flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center
                        ${
                          isSelected
                            ? 'bg-primary border-primary'
                            : 'border-border'
                        }
                      `}
                    >
                      {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-foreground/70 truncate">{option.label}</div>
                      {option.subLabel && (
                        <div className="text-xs text-muted-foreground truncate">
                          {option.subLabel}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          {selectedOptions.length > 0 && (
            <div className="p-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>{selectedOptions.length} selected</span>
              <button
                onClick={clearAll}
                className="text-primary hover:text-primary/80 font-medium"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
