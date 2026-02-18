import React from 'react'

export function ApexPageShell({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="border-b border-border bg-background px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-6">
        {children}
      </div>
    </div>
  )
}
