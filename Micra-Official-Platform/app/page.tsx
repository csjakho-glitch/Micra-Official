import type { Metadata } from 'next'
import { PublicSitePage } from './_components/public-site'
import { getPublicPage } from '../src/lib/public-content'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublicPage('home')
  return {
    title: page?.content.seo?.title || page?.content.name || 'MICRA',
    description: page?.content.seo?.description || page?.content.description,
    alternates: page?.content.seo?.canonicalPath.startsWith('/') && !page.content.seo.canonicalPath.startsWith('//')
      ? { canonical: page.content.seo.canonicalPath }
      : { canonical: '/' },
  }
}

export default function HomePage() {
  return <PublicSitePage slug="home" />
}
