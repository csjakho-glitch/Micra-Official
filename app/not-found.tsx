import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="micra-site not-found">
      <p className="eyebrow">404 — PAGE NOT FOUND</p>
      <h1>We can’t find that page.</h1>
      <p>The address may have changed, or the page may not be available.</p>
      <Link className="button-primary" href="/">Return to MICRA <ArrowLeft size={16} /></Link>
    </main>
  )
}
