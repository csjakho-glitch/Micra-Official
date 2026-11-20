import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

const hasAnySupabaseConfig = Boolean(supabaseUrl || supabaseAnonKey)
const validSupabaseUrl = (() => {
  if (!supabaseUrl) return false
  try {
    const url = new URL(supabaseUrl)
    return url.protocol === 'https:' || url.hostname === 'localhost'
  } catch {
    return false
  }
})()

export const supabaseConfigurationError = hasAnySupabaseConfig
  ? !supabaseUrl || !supabaseAnonKey
    ? 'Lengkapi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env.example.'
    : !validSupabaseUrl || supabaseUrl.includes('your-project') || supabaseAnonKey.includes('your-supabase')
      ? 'Konfigurasi Supabase masih berupa placeholder atau URL tidak valid.'
      : ''
  : ''
export const isSupabaseConfigured = hasAnySupabaseConfig && !supabaseConfigurationError
export const supabaseProjectRef = validSupabaseUrl ? new URL(supabaseUrl as string).hostname.split('.')[0] : ''

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null

export type AdminRole = 'super_admin' | 'content_admin' | 'editor'

export type PageContent = {
  name: string
  headline: string
  description: string
  seo?: {
    title: string
    description: string
    canonicalPath: string
  }
  cta?: {
    label: string
    url: string
    style: 'primary' | 'outline' | 'light'
    openNewTab: boolean
    visible: boolean
  }
  heroImage?: {
    url: string
    path: string
    altText: string
  }
  sections: {
    id: number
    title: string
    subtitle: string
    description: string
    type: string
    visible: boolean
    icon: string
    imageUrl?: string
    imagePath?: string
    imageAltText?: string
  }[]
}

export type CmsPage = {
  id: string
  slug: string
  name: string
  draft_version_id: string | null
  published_version_id: string | null
}

export type CmsVersion = {
  id: string
  page_id: string
  version_number: number
  content: PageContent
  created_at: string
  published_at: string | null
  author?: string
}

export type AdminProfile = {
  id: string
  full_name: string
  role: AdminRole | 'pending'
  created_at: string
}

export type CmsEnquiry = {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: 'pending' | 'replied' | 'archived'
  created_at: string
}

export type CmsActivity = {
  id: number
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  created_at: string
}

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env.example.')
  }
  return supabase
}
