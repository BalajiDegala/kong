'use client'

import { ThemeProvider } from 'next-themes'
import type { ComponentProps } from 'react'

type ThemeProviderProps = ComponentProps<typeof ThemeProvider>

export function AppThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" {...props}>
      {children}
    </ThemeProvider>
  )
}
