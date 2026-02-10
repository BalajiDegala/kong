'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type LoginFormProps = React.ComponentPropsWithoutRef<'div'> & {
  message?: string | null
}

export function LoginForm({ className, message, ...props }: LoginFormProps) {
  const [error, setError] = useState<string | null>(message ?? null)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      router.push('/apex')
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'An error occurred'
      setError(
        message.includes('Failed to fetch')
          ? 'Unable to reach Supabase. Check the API URL or network access.'
          : message
      )
      setIsLoading(false)
    }
  }

  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-xs flex-col gap-4 font-mono',
        className
      )}
      {...props}
    >
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-3">
              <div className="kong-flicker text-3xl font-semibold uppercase tracking-[0.5em] text-white">
                K O N G  
              </div>
              {error && (
                <p className="text-xs uppercase tracking-[0.15em] text-rose-200">
                  {error}
                </p>
              )}
              <input
                className="h-10 rounded-none border-2 border-white bg-black px-3 text-xs  tracking-[0.15em] text-white shadow-[2px_2px_0_0_rgba(255,255,255,0.4)] outline-none placeholder:text-white/40 focus-visible:ring-2 "
                type="email"
                name="email"
                autoComplete="email"
                placeholder="user@d2.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />

              <input
                className="h-10 rounded-none border-2 border-white bg-black px-3 text-xs  tracking-[0.15em] text-white shadow-[2px_2px_0_0_rgba(255,255,255,0.4)] outline-none placeholder:text-white/40 focus-visible:ring-2 "
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <Button
                type="submit"
                className="h-10 w-full rounded-none border-2 border-white bg-black text-xs uppercase tracking-[0.2em] text-white shadow-[2px_2px_0_0_rgba(255,255,255,0.4)] hover:bg-black/90"
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Sign in'}
              </Button>
            </div>
          </form>
    </div>
  )
}
