'use client'

import { useEffect } from 'react'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error('Public website rendering failed', error)
  }, [error])

  return (
    <main className="micra-site not-found">
      <p className="eyebrow">TEMPORARY ISSUE</p>
      <h1>This page could not be loaded.</h1>
      <p>Please try again. Published website content has not been changed.</p>
      <button className="button-primary" onClick={reset}>Try again</button>
    </main>
  )
}
