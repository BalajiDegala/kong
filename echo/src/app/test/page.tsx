import { createClient } from '@/lib/supabase/server'
import { testConnection, getSteps } from '@/lib/supabase/queries'

export default async function TestPage() {
  const supabase = await createClient()

  // Test connection
  const connectionTest = await testConnection(supabase)

  // Get pipeline steps if connection successful
  let steps = null
  if (connectionTest.success) {
    try {
      steps = await getSteps(supabase)
    } catch (error) {
      console.error('Error fetching steps:', error)
    }
  }

  // Check auth session
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-zinc-100">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-amber-400">
            Kong Database Connection Test
          </h1>
          <p className="mt-2 text-zinc-400">
            Testing connection to self-hosted Supabase at{' '}
            <code className="rounded bg-zinc-800 px-2 py-1 text-xs text-cyan-400">
              {process.env.NEXT_PUBLIC_SUPABASE_URL}
            </code>
          </p>
        </div>

        {/* Connection Status */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Connection Status</h2>
          {connectionTest.success ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span className="text-green-400">Connected successfully!</span>
              </div>
              <p className="text-sm text-zinc-400">{connectionTest.message}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500"></div>
                <span className="text-red-400">Connection failed</span>
              </div>
              <p className="text-sm text-red-300">{connectionTest.message}</p>
            </div>
          )}
        </div>

        {/* Auth Status */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Authentication Status</h2>
          {user ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span className="text-green-400">Authenticated</span>
              </div>
              <div className="mt-4 space-y-1 text-sm">
                <p className="text-zinc-400">
                  User ID: <code className="text-cyan-400">{user.id}</code>
                </p>
                <p className="text-zinc-400">
                  Email: <code className="text-cyan-400">{user.email}</code>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                <span className="text-amber-400">Not authenticated</span>
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                Visit <a href="/auth/login" className="text-cyan-400 hover:underline">/auth/login</a> to sign in
              </p>
            </div>
          )}
        </div>

        {/* Pipeline Steps */}
        {steps && steps.length > 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">
              Pipeline Steps ({steps.length})
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: step.color || '#6B7280' }}
                  ></div>
                  <div>
                    <p className="font-medium text-zinc-100">{step.name}</p>
                    <p className="text-xs text-zinc-500">
                      {step.code} • {step.entity_type}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Database Tables Status */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Database Tables</h2>
          <div className="space-y-2 text-sm">
            <p className="text-zinc-400">
              ✅ <code className="text-cyan-400">profiles</code> - User profiles
            </p>
            <p className="text-zinc-400">
              ✅ <code className="text-cyan-400">projects</code> - Project management
            </p>
            <p className="text-zinc-400">
              ✅ <code className="text-cyan-400">assets</code> - Asset tracking
            </p>
            <p className="text-zinc-400">
              ✅ <code className="text-cyan-400">shots</code> - Shot tracking
            </p>
            <p className="text-zinc-400">
              ✅ <code className="text-cyan-400">tasks</code> - Task management
            </p>
            <p className="text-zinc-400">
              ✅ <code className="text-cyan-400">notes</code> - Comments & chat
            </p>
            <p className="text-zinc-400">
              ✅ <code className="text-cyan-400">versions</code> - Version control
            </p>
            <p className="text-zinc-400">
              ✅ <code className="text-cyan-400">steps</code> - Pipeline steps
            </p>
          </div>
        </div>

        {/* Next Steps */}
        <div className="rounded-lg border border-amber-800 bg-amber-950/20 p-6">
          <h2 className="mb-2 text-xl font-semibold text-amber-400">
            Next Steps
          </h2>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li>1. Ensure you've applied the database migrations (kong-schema-migration.sql)</li>
            <li>2. Run seed data script (kong-seed-data.sql) to populate pipeline steps</li>
            <li>3. Create a user via Supabase Auth and add to allowed_users table</li>
            <li>4. Create a profile for the user in the profiles table</li>
            <li>5. Once authenticated, you can start building the dashboard</li>
          </ul>
        </div>

        <div className="flex gap-4">
          <a
            href="/"
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium transition hover:bg-zinc-700"
          >
            Back to Home
          </a>
          {!user && (
            <a
              href="/auth/login"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
            >
              Sign In
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
