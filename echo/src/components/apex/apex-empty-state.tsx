import React from 'react'

type ApexEmptyStateProps =
  | {
      variant?: 'callout'
      icon?: React.ReactNode
      title: string
      description?: string
      action?: React.ReactNode
    }
  | {
      variant: 'simple'
      title: string
    }

export function ApexEmptyState(props: ApexEmptyStateProps) {
  if (props.variant === 'simple') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-zinc-400">{props.title}</p>
      </div>
    )
  }

  const { icon, title, description, action } = props

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        {icon ? <div className="mx-auto mb-4 text-zinc-700">{icon}</div> : null}
        <h3 className="mb-2 text-lg font-semibold text-zinc-100">{title}</h3>
        {description ? (
          <p className="mb-4 max-w-md text-sm text-zinc-400">{description}</p>
        ) : null}
        {action ? <div className="flex justify-center">{action}</div> : null}
      </div>
    </div>
  )
}

