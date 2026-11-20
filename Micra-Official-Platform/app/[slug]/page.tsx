import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicSitePage } from '../_components/public-site'
import { getPublicPage } from '../../src/lib/public-content'

export const dynamic = 'force-dynamic'

type RouteProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params
  const page = await getPublicPage(slug)
  if (!page) return { title: 'Page not found' }
  return {
    title: page.content.seo?.title || page.content.name,
    description: page.content.seo?.description || page.content.description,
    alternates: page.content.seo?.canonicalPath.startsWith('/') && !page.content.seo.canonicalPath.startsWith('//')
      ? { canonical: page.content.seo.canonicalPath }
      : { canonical: `/${slug}` },
  }
}

export default async function ContentPage({ params }: RouteProps) {
  const { slug } = await params
  if (!await getPublicPage(slug)) notFound()
  return <PublicSitePage slug={slug} />
}
