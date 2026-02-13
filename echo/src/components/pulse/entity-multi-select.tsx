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
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">
        {label}
      </label>

      {/* Trigger Button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2
          bg-zinc-900 border border-zinc-800 rounded-md
          text-sm text-zinc-300
          hover:border-zinc-700 transition
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen ? 'border-amber-500/50' : ''}
        `}
      >
        <div className="flex-1 flex flex-wrap gap-1 items-center min-h-[20px]">
          {selectedOptions.length === 0 ? (
            <span className="text-zinc-500">{placeholder}</span>
          ) : (
            selectedOptions.map((opt) => (
              <Badge
                key={opt.id}
                variant="secondary"
                className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs flex items-center gap-1"
              >
                {opt.label}
                <button
                  type="button"
                  onClick={(e) => removeOption(opt.id, e)}
                  className="hover:text-amber-300"
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
              className="text-zinc-500 hover:text-zinc-300 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown
            className={`h-4 w-4 text-zinc-500 transition ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-md shadow-lg max-h-[300px] overflow-hidden flex flex-col">
          {/* Search Input */}
          {searchable && options.length > 5 && (
            <div className="p-2 border-b border-zinc-800">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 bg-zinc-950 border-zinc-800 text-sm"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-zinc-500 text-center">
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
                      hover:bg-zinc-800 transition text-left
                      ${isSelected ? 'bg-zinc-800/50' : ''}
                    `}
                  >
                    <div
                      className={`
                        flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center
                        ${
                          isSelected
                            ? 'bg-amber-500 border-amber-500'
                            : 'border-zinc-700'
                        }
                      `}
                    >
                      {isSelected && <Check className="h-3 w-3 text-zinc-900" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-zinc-300 truncate">{option.label}</div>
                      {option.subLabel && (
                        <div className="text-xs text-zinc-500 truncate">
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
            <div className="p-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
              <span>{selectedOptions.length} selected</span>
              <button
                onClick={clearAll}
                className="text-amber-400 hover:text-amber-300 font-medium"
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
