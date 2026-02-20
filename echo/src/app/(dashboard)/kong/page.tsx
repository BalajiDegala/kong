import { CommitsGrid } from "@/components/ui/commits-grid"

export default function KongLandingPage() {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_oklab,var(--foreground)_7%,transparent),transparent_42%),radial-gradient(circle_at_80%_70%,color-mix(in_oklab,var(--foreground)_5%,transparent),transparent_48%)]" />
      </div>

      <div className="relative flex h-[calc(100vh-3.5rem)] w-full items-center justify-center p-2 sm:p-4">
        <div className="h-[75vh] w-[75vw]">
          <CommitsGrid
            text="KONG"
            className="h-full w-full rounded-lg border-border/60 p-2 sm:p-4"
          />
        </div>
      </div>
    </div>
  )
}
