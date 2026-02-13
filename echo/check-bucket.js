const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read .env.local
const envPath = path.join(__dirname, '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    env[match[1].trim()] = match[2].trim()
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function checkBucket() {
  console.log('Checking storage buckets...\n')

  const { data: buckets, error } = await supabase.storage.listBuckets()

  if (error) {
    console.error('Error listing buckets:', error)
    return
  }

  console.log('Existing buckets:')
  buckets.forEach(bucket => {
    console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`)
  })

  const postMediaBucket = buckets.find(b => b.name === 'post-media')

  if (!postMediaBucket) {
    console.log('\n✗ post-media bucket does not exist')
    console.log('Creating post-media bucket...')

    const { data, error: createError } = await supabase.storage.createBucket('post-media', {
      public: false,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo'
      ]
    })

    if (createError) {
      console.error('Failed to create bucket:', createError)
    } else {
      console.log('✓ post-media bucket created successfully')
    }
  } else {
    console.log('\n✓ post-media bucket exists')
  }
}

checkBucket().catch(console.error)
