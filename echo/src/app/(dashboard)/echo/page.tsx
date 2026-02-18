import { MessageSquare } from 'lucide-react'

export default function EchoPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground/70" />
        <h3 className="mb-2 text-lg font-semibold text-foreground">Echo</h3>
        <p className="text-sm text-muted-foreground">
          Select a conversation or start a new one from the sidebar.
        </p>
      </div>
    </div>
  )
}
