'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle } from 'lucide-react'

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  itemName: string
  onConfirm: () => Promise<{ error?: string; success?: boolean }>
  redirectTo?: string
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  itemName,
  onConfirm,
  redirectTo,
}: DeleteConfirmDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await onConfirm()

      if (result.error) throw new Error(result.error)

      onOpenChange(false)

      if (redirectTo) {
        router.push(redirectTo)
      } else {
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-500/10 p-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {error && (
            <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <div className="rounded-md bg-card p-4">
            <p className="text-sm text-muted-foreground">You are about to delete:</p>
            <p className="mt-1 font-semibold text-foreground">{itemName}</p>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            This action cannot be undone.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
