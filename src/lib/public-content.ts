import { createClient } from '@supabase/supabase-js'
import type { PageContent } from './supabase'
import { publicPages, primaryNavigation } from './public-pages'

export type PublishedPage = {
  slug: string
  content: PageContent
}

export type PublicNavigationItem = { label: string, url: string }
export type PublicSiteInfo = { name?: string, email?: string, phone?: string, address?: string }
export type PublicSiteSettings = { navigation: PublicNavigationItem[], siteInfo: PublicSiteInfo }

const defaultSiteSettings: PublicSiteSettings = {
  navigation: primaryNavigation,
  siteInfo: { name: 'MICRA' },
}

function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url && !key) return null
  if (!url || !key) throw new Error('Public Supabase configuration is incomplete.')

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error('The configured Supabase URL is invalid.')
  }
  if ((parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost') || url.includes('your-project')) {
    throw new Error('The configured Supabase URL is not a valid project URL.')
  }
  if (key.includes('your-supabase')) throw new Error('The configured Supabase publishable key is still a placeholder.')

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPageContent(value: unknown): value is PageContent {
  if (!isRecord(value) || typeof value.name !== 'string' || typeof value.headline !== 'string' ||
      typeof value.description !== 'string' || !Array.isArray(value.sections)) {
    return false
  }
  return value.sections.every(section =>
    isRecord(section) &&
    (typeof section.id === 'number' || typeof section.id === 'string') &&
    typeof section.title === 'string' &&
    typeof section.subtitle === 'string' &&
    typeof section.description === 'string' &&
    typeof section.type === 'string' &&
    typeof section.visible === 'boolean' &&
    typeof section.icon === 'string',
  )
}

export async function getPublishedPage(slug: string): Promise<PublishedPage | null> {
  const client = getPublicClient()
  if (!client) return null

  const { data: page, error: pageError } = await client
    .from('pages')
    .select('id, slug, published_version_id')
    .eq('slug', slug)
    .not('published_version_id', 'is', null)
    .maybeSingle()
  if (pageError) throw new Error(`Published page could not be loaded: ${pageError.message}`)
  if (!page?.published_version_id) return null

  const { data: version, error: versionError } = await client
    .from('page_versions')
    .select('content')
    .eq('id', page.published_version_id)
    .eq('page_id', page.id)
    .not('published_at', 'is', null)
    .maybeSingle()
  if (versionError) throw new Error(`Published page content could not be loaded: ${versionError.message}`)
  if (!version || !isPageContent(version.content)) {
    throw new Error(`Published content for "${slug}" is missing or invalid.`)
  }
  return { slug: page.slug, content: version.content }
}

export async function getPublicPage(slug: string): Promise<PublishedPage | null> {
  const published = await getPublishedPage(slug)
  if (published) return published
  const fallback = publicPages[slug]
  return fallback ? { slug: fallback.slug, content: fallback.content } : null
}

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  const client = getPublicClient()
  if (!client) return defaultSiteSettings

  const { data, error } = await client
    .from('site_settings')
    .select('key, value')
    .in('key', ['public_navigation', 'public_site_info'])
  if (error) throw new Error(`Public site settings could not be loaded: ${error.message}`)

  const navigationValue = data?.find(item => item.key === 'public_navigation')?.value
  const infoValue = data?.find(item => item.key === 'public_site_info')?.value
  const navigation = Array.isArray(navigationValue)
    ? navigationValue.filter((item): item is PublicNavigationItem =>
        isRecord(item) && typeof item.label === 'string' && typeof item.url === 'string',
      )
    : defaultSiteSettings.navigation
  const siteInfo = isRecord(infoValue)
    ? Object.fromEntries(
        Object.entries(infoValue).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
      ) as PublicSiteInfo
    : defaultSiteSettings.siteInfo

  return { navigation, siteInfo: { ...defaultSiteSettings.siteInfo, ...siteInfo } }
}
