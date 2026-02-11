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
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  )
}

