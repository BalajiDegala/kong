'use client'

import { ThemeProvider } from 'next-themes'
import type { ComponentProps } from 'react'

export const THEMES = [
  { id: 'oled-black', label: 'OLED Black', color: '#4d8eff' },
  { id: 'catppuccin', label: 'Mocha', color: '#b4a0ff' },
  { id: 'sunset', label: 'Sunset', color: '#f0a830' },
  { id: 'dawn', label: 'Dawn', color: '#e05050' },
] as const

type ThemeProviderProps = ComponentProps<typeof ThemeProvider>

export function AppThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="oled-black"
      themes={THEMES.map((t) => t.id)}
      {...props}
    >
      {children}
    </ThemeProvider>
  )
}
