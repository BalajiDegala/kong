import { LoginForm } from '@/components/login-form'
import { DotScreenShader } from '@/components/ui/dot-shader-background'

const reasonMessage: Record<string, string> = {
  'not-allowed': 'Your account is not on the allowlist. Contact an admin.',
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ reason?: string }>
}) {
  const params = searchParams ? await searchParams : undefined
  const message = params?.reason ? reasonMessage[params.reason] : null
  return (
    <div className="relative min-h-svh w-full overflow-hidden bg-[#0d0d0f]">
      <div className="absolute inset-0">
        <DotScreenShader />
      </div>
      <div className="relative z-10 flex min-h-svh w-full items-center justify-center px-6 py-12 pointer-events-none">
        <div className="w-full max-w-lg">
          <div className="pointer-events-auto">
            <LoginForm message={message} />
          </div>
        </div>
      </div>
    </div>
  )
}
