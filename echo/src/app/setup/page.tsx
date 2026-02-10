import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SetupPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Check if profile exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Check if migrations have been run
  const { error: stepsError } = await supabase
    .from('steps')
    .select('count')
    .limit(1)

  const migrationsApplied = !stepsError

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-zinc-100">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-amber-400">Setup Checklist</h1>
          <p className="mt-2 text-zinc-400">
            Complete these steps to start using Kong
          </p>
        </div>

        {/* User Info */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Your Account</h2>
          <div className="space-y-2 text-sm">
            <p className="text-zinc-400">
              Email: <code className="text-cyan-400">{user.email}</code>
            </p>
            <p className="text-zinc-400">
              User ID: <code className="text-cyan-400">{user.id}</code>
            </p>
          </div>
        </div>

        {/* Step 1: Migrations */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-4 flex items-center gap-3">
            {migrationsApplied ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                ✓
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                1
              </div>
            )}
            <h2 className="text-xl font-semibold">Apply Database Migrations</h2>
          </div>

          {migrationsApplied ? (
            <p className="text-green-400">Database migrations applied successfully!</p>
          ) : (
            <div className="space-y-4">
              <p className="text-zinc-400">
                Run the database migration files to create all tables:
              </p>
              <div className="rounded-lg bg-zinc-950 p-4">
                <p className="mb-2 text-xs text-zinc-500">Via Supabase Dashboard:</p>
                <ol className="space-y-1 text-sm text-zinc-300">
                  <li>1. Open http://10.100.222.197:8000</li>
                  <li>2. Go to SQL Editor</li>
                  <li>3. Run kong-schema-migration.sql</li>
                  <li>4. Run kong-seed-data.sql</li>
                </ol>
              </div>
              <p className="text-xs text-zinc-500">
                See DATABASE_SETUP.md for detailed instructions
              </p>
            </div>
          )}
        </div>

        {/* Step 2: Profile */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-4 flex items-center gap-3">
            {profile ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                ✓
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                2
              </div>
            )}
            <h2 className="text-xl font-semibold">Create Your Profile</h2>
          </div>

          {profile ? (
            <div className="space-y-2">
              <p className="text-green-400">Profile exists!</p>
              <div className="mt-4 space-y-1 text-sm text-zinc-400">
                <p>Name: {profile.display_name || '(not set)'}</p>
                <p>Role: {profile.role || 'member'}</p>
              </div>
            </div>
          ) : migrationsApplied ? (
            <div className="space-y-4">
              <p className="text-zinc-400">Run this SQL in Supabase Dashboard:</p>
              <div className="rounded-lg bg-zinc-950 p-4">
                <pre className="overflow-x-auto text-xs text-cyan-400">
{`INSERT INTO public.profiles (id, email, display_name, role, active)
VALUES (
  '${user.id}',
  '${user.email}',
  'Your Name',  -- Change this
  'alpha',      -- or 'beta' or 'member'
  true
);`}
                </pre>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
              >
                Refresh after creating profile
              </button>
            </div>
          ) : (
            <p className="text-zinc-500">Complete step 1 first</p>
          )}
        </div>

        {/* Step 3: Ready */}
        {profile && migrationsApplied && (
          <div className="rounded-lg border border-green-800 bg-green-950/20 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                ✓
              </div>
              <h2 className="text-xl font-semibold text-green-400">You're All Set!</h2>
            </div>
            <p className="mb-4 text-zinc-300">
              Your Kong platform is ready to use. Start by creating your first project.
            </p>
            <a
              href="/apex"
              className="inline-block rounded-lg bg-amber-500 px-6 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
            >
              Go to Dashboard
            </a>
          </div>
        )}

        {/* Links */}
        <div className="flex gap-4 text-sm">
          <a href="/test" className="text-cyan-400 hover:underline">
            Test Connection
          </a>
          <a href="/auth/login" className="text-zinc-500 hover:underline">
            Logout
          </a>
        </div>
      </div>
    </div>
  )
}
