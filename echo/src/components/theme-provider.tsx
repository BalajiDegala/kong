'use client'

import { ThemeProvider } from 'next-themes'
import type { ThemeProviderProps } from 'next-themes/dist/types'

export function AppThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" {...props}>
      {children}
    </ThemeProvider>
  )
}
