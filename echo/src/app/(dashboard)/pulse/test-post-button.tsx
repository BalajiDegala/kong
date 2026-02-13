'use client'

import { useState } from 'react'
import { createPost } from '@/actions/posts'

export function TestPostButton() {
  const [result, setResult] = useState<any>(null)

  const handleClick = async () => {
    console.log('Test button clicked')
    const res = await createPost({
      content: 'Test post from button - ' + new Date().toISOString(),
      visibility: 'global'
    })
    console.log('Result:', res)
    setResult(res)
  }

  return (
    <div className="p-4 border border-yellow-500 rounded bg-yellow-500/10">
      <button
        onClick={handleClick}
        className="px-4 py-2 bg-yellow-500 text-black rounded font-medium hover:bg-yellow-400"
      >
        Test Create Post (Direct)
      </button>
      {result && (
        <pre className="mt-2 p-2 bg-zinc-900 rounded text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}
