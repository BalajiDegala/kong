const fs = require('fs')
const path = require('path')

let createClient
try {
  ;({ createClient } = require('@supabase/supabase-js'))
} catch {
  ;({ createClient } = require(path.join(
    __dirname,
    'echo',
    'node_modules',
    '@supabase',
    'supabase-js'
  )))
}

function readEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const values = {}

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = line.match(/^([^=]+)=(.*)$/)
    if (!match) continue
    const key = match[1].trim()
    const value = match[2].trim()
    values[key] = value
  }

  return values
}

async function execSql(supabase, sql) {
  const sqlResult = await supabase.rpc('exec_sql', { sql })
  if (!sqlResult.error) return

  // Some environments expose exec_sql(query text) instead of exec_sql(sql text).
  const likelyMissingSqlSignature =
    /Could not find the function public\.exec_sql\(sql\)/i.test(sqlResult.error.message) ||
    /function exec_sql\(sql\)/i.test(sqlResult.error.message)

  if (!likelyMissingSqlSignature) {
    throw new Error(sqlResult.error.message)
  }

  const queryResult = await supabase.rpc('exec_sql', { query: sql })
  if (!queryResult.error) return

  throw new Error(
    `exec_sql RPC unavailable. sql-signature error: ${sqlResult.error.message}; query-signature error: ${queryResult.error.message}`
  )
}

function resolveProjectRef(supabaseUrl) {
  try {
    const host = new URL(supabaseUrl).host
    const dotIndex = host.indexOf('.')
    return dotIndex > 0 ? host.slice(0, dotIndex) : ''
  } catch {
    return ''
  }
}

async function execSqlViaManagementApi(sql, supabaseUrl, managementToken) {
  const projectRef = resolveProjectRef(supabaseUrl)
  if (!projectRef || !managementToken) {
    throw new Error(
      'Management API fallback unavailable: missing project ref or SUPABASE_ACCESS_TOKEN/SUPABASE_MANAGEMENT_API_TOKEN'
    )
  }

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${managementToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(
      `Management API failed (${response.status}): ${text || 'No response body'}`
    )
  }
}

async function main() {
  const envPath = path.join(__dirname, 'echo', '.env.local')
  if (!fs.existsSync(envPath)) {
    throw new Error(`Missing env file: ${envPath}`)
  }

  const env = readEnvFile(envPath)
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY
  const managementTokenCandidates = [
    env.SUPABASE_ACCESS_TOKEN,
    env.SUPABASE_MANAGEMENT_API_TOKEN,
    env.SUPABASE_SERVICE_ROLE_KEY,
  ].filter(Boolean)

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in echo/.env.local'
    )
  }

  const migrationPath = path.join(
    __dirname,
    'echo',
    'migrations&fixes',
    'generated',
    '2026-02-13-fields-datatype-sync.sql'
  )

  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Missing migration file: ${migrationPath}`)
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8')
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log('Applying fields datatype sync migration...')
  try {
    await execSql(supabase, sql)
  } catch (rpcError) {
    if (managementTokenCandidates.length === 0) {
      throw new Error(
        `${rpcError instanceof Error ? rpcError.message : String(rpcError)}. Set SUPABASE_ACCESS_TOKEN (or SUPABASE_MANAGEMENT_API_TOKEN) in echo/.env.local to enable Management API fallback.`
      )
    }

    console.log('exec_sql RPC unavailable. Trying Supabase Management API fallback...')
    let lastManagementError = null
    for (const token of managementTokenCandidates) {
      try {
        await execSqlViaManagementApi(sql, supabaseUrl, token)
        lastManagementError = null
        break
      } catch (error) {
        lastManagementError = error
      }
    }

    if (lastManagementError) {
      throw lastManagementError
    }
  }
  console.log('Migration applied successfully.')
  console.log('You can now change field data types from the Fields page and sync table columns directly.')
}

main().catch((error) => {
  console.error('Failed to apply migration:')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
