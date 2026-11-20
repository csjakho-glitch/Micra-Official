import { requireSupabase, type AdminRole, type AdminProfile, type CmsActivity, type CmsEnquiry, type CmsPage, type CmsVersion, type PageContent } from './supabase'
import { FunctionsHttpError } from '@supabase/supabase-js'

export async function getAdminRole(userId: string): Promise<AdminRole> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error) throw new Error(`Tidak dapat memeriksa hak akses: ${error.message}`)
  if (!['super_admin', 'content_admin', 'editor'].includes(data.role)) {
    throw new Error('Akun ini tidak memiliki peran administrator.')
  }
  return data.role as AdminRole
}

export async function loadAdminPages() {
  const client = requireSupabase()
  const { data: pages, error: pageError } = await client
    .from('pages')
    .select('id, slug, name, draft_version_id, published_version_id')
    .order('created_at')
  if (pageError) throw new Error(`Tidak dapat memuat halaman: ${pageError.message}`)
  if (!pages?.length) return { pages: [] as CmsPage[], versions: [] as CmsVersion[] }

  const versionIds = [...new Set(pages.flatMap(page =>
    [page.draft_version_id, page.published_version_id].filter((id): id is string => Boolean(id)),
  ))]
  if (!versionIds.length) return { pages: pages as CmsPage[], versions: [] as CmsVersion[] }

  const { data: versions, error: versionsError } = await client
    .from('page_versions')
    .select('id, page_id, version_number, content, created_at, published_at')
    .in('id', versionIds)
  if (versionsError) throw new Error(`Tidak dapat memuat revisi halaman: ${versionsError.message}`)
  return { pages: pages as CmsPage[], versions: (versions ?? []) as CmsVersion[] }
}

export async function loadAdminMedia() {
  const client = requireSupabase()
  const { data, error } = await client
    .from('media_assets')
    .select('id, storage_path, file_name, alt_text, created_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Tidak dapat memuat pustaka media: ${error.message}`)
  const { data: versions, error: versionsError } = await client.from('page_versions').select('content')
  if (versionsError) throw new Error(`Penggunaan gambar tidak dapat diverifikasi: ${versionsError.message}`)
  const contentText = (versions ?? []).map(version => JSON.stringify(version.content)).join('\n')
  return (data ?? []).map((item, index) => ({
    id: item.id as string,
    name: item.file_name as string,
    altText: item.alt_text as string,
    used: contentText.includes(item.storage_path as string),
    color: ['green', 'blue', 'orange'][index % 3],
    path: item.storage_path as string,
    url: client.storage.from('micra-media').getPublicUrl(item.storage_path as string).data.publicUrl,
  }))
}

export async function loadDashboardData() {
  const client = requireSupabase()
  const [pagesResult, mediaResult, enquiriesResult, activityResult] = await Promise.all([
    client.from('pages').select('id, name, draft_version_id, published_version_id', { count: 'exact' }),
    client.from('media_assets').select('id', { count: 'exact', head: true }),
    client.from('enquiries').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    client.from('admin_activity').select('id, actor_id, action, entity_type, entity_id, created_at').order('created_at', { ascending: false }).limit(5),
  ])
  if (pagesResult.error) throw new Error(`Ringkasan halaman gagal dimuat: ${pagesResult.error.message}`)
  if (mediaResult.error) throw new Error(`Jumlah media gagal dimuat: ${mediaResult.error.message}`)
  if (enquiriesResult.error) throw new Error(`Jumlah pesan masuk gagal dimuat: ${enquiriesResult.error.message}`)
  if (activityResult.error) throw new Error(`Aktivitas admin gagal dimuat: ${activityResult.error.message}`)

  const activities = (activityResult.data ?? []) as CmsActivity[]
  const pageIds = [...new Set(activities.filter(item => item.entity_type === 'page' && item.entity_id).map(item => item.entity_id as string))]
  const actorIds = [...new Set(activities.map(item => item.actor_id).filter((id): id is string => Boolean(id)))]
  const [pageNames, profiles] = await Promise.all([
    pageIds.length ? client.from('pages').select('id, name').in('id', pageIds) : Promise.resolve({ data: [], error: null }),
    actorIds.length ? client.from('profiles').select('id, full_name').in('id', actorIds) : Promise.resolve({ data: [], error: null }),
  ])
  if (pageNames.error) throw new Error(`Nama halaman pada aktivitas gagal dimuat: ${pageNames.error.message}`)
  if (profiles.error) throw new Error(`Nama administrator pada aktivitas gagal dimuat: ${profiles.error.message}`)
  const namesByPage = new Map((pageNames.data ?? []).map(page => [page.id, page.name]))
  const namesByUser = new Map((profiles.data ?? []).map(profile => [profile.id, profile.full_name]))

  return {
    totalPages: pagesResult.count ?? 0,
    publishedPages: (pagesResult.data ?? []).filter(page => page.published_version_id).length,
    draftPages: (pagesResult.data ?? []).filter(page => !page.published_version_id).length,
    mediaCount: mediaResult.count ?? 0,
    pendingEnquiries: enquiriesResult.count ?? 0,
    recentActivities: activities.map(item => ({
      ...item,
      pageName: item.entity_id ? namesByPage.get(item.entity_id) ?? item.entity_type : item.entity_type,
      actorName: item.actor_id ? namesByUser.get(item.actor_id) || 'Administrator' : 'Administrator',
    })),
  }
}

export async function loadEnquiries() {
  const { data, error } = await requireSupabase()
    .from('enquiries')
    .select('id, name, email, subject, message, status, created_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Pesan masuk gagal dimuat: ${error.message}`)
  return (data ?? []) as CmsEnquiry[]
}

export async function updateEnquiryStatus(enquiryId: string, status: CmsEnquiry['status']) {
  const { error } = await requireSupabase().from('enquiries').update({ status }).eq('id', enquiryId)
  if (error) throw new Error(`Status pesan gagal diperbarui: ${error.message}`)
}

export async function loadAdminProfiles() {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id, full_name, role, created_at')
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Daftar pengguna gagal dimuat: ${error.message}`)
  return (data ?? []) as AdminProfile[]
}

export async function updateAdminRole(userId: string, role: AdminRole | 'pending', actorId: string) {
  const client = requireSupabase()
  const { error } = await client.from('profiles').update({ role }).eq('id', userId)
  if (error) throw new Error(`Peran pengguna gagal diperbarui: ${error.message}`)
  const { error: activityError } = await client.from('admin_activity').insert({
    actor_id: actorId,
    action: 'change_admin_role',
    entity_type: 'profile',
    entity_id: userId,
  })
  if (activityError) throw new Error(`Peran tersimpan, tetapi catatan aktivitas gagal dibuat: ${activityError.message}`)
}

export async function inviteAdmin(email: string, fullName: string, role: 'editor' | 'content_admin') {
  const { data, error } = await requireSupabase().functions.invoke('invite-admin', {
    body: { email, fullName, role },
  })
  if (error) {
    if (error instanceof FunctionsHttpError && error.context instanceof Response) {
      let detailMessage = ''
      try {
        const detail: unknown = await error.context.json()
        if (detail && typeof detail === 'object' && 'error' in detail && typeof detail.error === 'string') {
          detailMessage = detail.error
        }
      } catch { /* use the SDK error when the response is not JSON */ }
      if (detailMessage) throw new Error(detailMessage)
    }
    throw new Error(`Undangan administrator gagal: ${error.message}`)
  }
  if (!data || typeof data !== 'object' || !('userId' in data) || typeof data.userId !== 'string') {
    throw new Error('Undangan tidak mengembalikan konfirmasi pengguna. Periksa daftar pengguna Supabase.')
  }
  return data.userId
}

export async function loadSiteSetting<T>(key: string, fallback: T): Promise<T> {
  const { data, error } = await requireSupabase().from('site_settings').select('value').eq('key', key).maybeSingle()
  if (error) throw new Error(`Pengaturan situs gagal dimuat: ${error.message}`)
  return (data?.value as T | undefined) ?? fallback
}

export async function saveSiteSetting(key: string, value: unknown, actorId: string) {
  const { error } = await requireSupabase().from('site_settings').upsert({
    key,
    value,
    updated_by: actorId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' })
  if (error) throw new Error(`Pengaturan situs gagal disimpan: ${error.message}`)
}

export async function deleteUnusedMedia(mediaId: string, storagePath: string) {
  const client = requireSupabase()
  const { data: versions, error: versionsError } = await client.from('page_versions').select('content')
  if (versionsError) throw new Error(`Tidak dapat memastikan apakah gambar masih digunakan: ${versionsError.message}`)
  if ((versions ?? []).some(version => JSON.stringify(version.content).includes(storagePath))) {
    throw new Error('Gambar ini masih digunakan pada konten tersimpan dan tidak dapat dihapus.')
  }
  const { error: storageError } = await client.storage.from('micra-media').remove([storagePath])
  if (storageError) throw new Error(`Berkas gambar gagal dihapus: ${storageError.message}`)
  const { error: metadataError } = await client.from('media_assets').delete().eq('id', mediaId)
  if (metadataError) throw new Error(`Berkas telah dihapus dari Storage, tetapi catatan pustaka gagal dihapus: ${metadataError.message}`)
}

export async function loadPageVersions(pageId: string) {
  const client = requireSupabase()
  const { data: versions, error } = await client
    .from('page_versions')
    .select('id, page_id, version_number, content, created_at, published_at, created_by')
    .eq('page_id', pageId)
    .order('version_number', { ascending: false })
  if (error) throw new Error(`Riwayat halaman gagal dimuat: ${error.message}`)
  const authorIds = [...new Set((versions ?? []).map(version => version.created_by as string))]
  const { data: profiles, error: profilesError } = authorIds.length
    ? await client.from('profiles').select('id, full_name').in('id', authorIds)
    : { data: [], error: null }
  if (profilesError) throw new Error(`Nama editor gagal dimuat: ${profilesError.message}`)
  const nameById = new Map((profiles ?? []).map(profile => [profile.id, profile.full_name]))
  return (versions ?? []).map(version => ({
    id: version.id as string,
    page_id: version.page_id as string,
    version_number: version.version_number as number,
    content: version.content as PageContent,
    created_at: version.created_at as string,
    published_at: version.published_at as string | null,
    author: nameById.get(version.created_by as string) || 'Administrator',
  }))
}

export async function updateMediaAltText(mediaId: string, altText: string) {
  const { error } = await requireSupabase()
    .from('media_assets')
    .update({ alt_text: altText })
    .eq('id', mediaId)
  if (error) throw new Error(`Teks alternatif gagal disimpan: ${error.message}`)
}

export async function savePageDraft(pageId: string, content: PageContent) {
  const { data, error } = await requireSupabase().rpc('save_page_draft', {
    p_page_id: pageId,
    p_content: content,
  })
  if (error) throw new Error(`Draft gagal disimpan: ${error.message}`)
  return data as string
}

export async function createCmsPage(slug: string, name: string, content: PageContent) {
  const { data, error } = await requireSupabase().rpc('create_page', {
    p_slug: slug,
    p_name: name,
    p_content: content,
  })
  if (error) throw new Error(`Halaman gagal dibuat: ${error.message}`)
  return data as string
}

export async function publishPageDraft(pageId: string) {
  const { error } = await requireSupabase().rpc('publish_page_draft', { p_page_id: pageId })
  if (error) throw new Error(`Publikasi gagal: ${error.message}`)
}

export async function restorePageVersion(pageId: string, versionId: string) {
  const { data, error } = await requireSupabase().rpc('restore_page_version', {
    p_page_id: pageId,
    p_version_id: versionId,
  })
  if (error) throw new Error(`Versi gagal dipulihkan: ${error.message}`)
  return data as string
}

export async function uploadMedia(file: File, userId: string) {
  const allowedTypes: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
  }
  const extension = allowedTypes[file.type]
  if (!extension) throw new Error('Format tidak didukung. Pilih gambar JPEG, PNG, WebP, atau AVIF.')
  if (file.size > 10 * 1024 * 1024) throw new Error('Ukuran gambar maksimal 10 MB.')
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('File tidak dapat dibaca sebagai gambar. Coba pilih file gambar lain.')
  }
  const pixelCount = bitmap.width * bitmap.height
  bitmap.close()
  if (pixelCount > 40_000_000 || bitmap.width > 12_000 || bitmap.height > 12_000) {
    throw new Error('Resolusi gambar terlalu besar. Batas maksimum adalah 12.000 px per sisi dan 40 megapiksel.')
  }

  const client = requireSupabase()
  const path = `${userId}/${crypto.randomUUID()}.${extension}`
  const { error } = await client.storage.from('micra-media').upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw new Error(`Gambar gagal diunggah: ${error.message}`)

  const { data: metadata, error: metadataError } = await client.from('media_assets').insert({
    storage_path: path,
    file_name: file.name,
    mime_type: file.type,
    created_by: userId,
  }).select('id').single()
  if (metadataError) {
    const { error: cleanupError } = await client.storage.from('micra-media').remove([path])
    const cleanupNote = cleanupError ? ` Berkas sementara perlu dihapus manual: ${cleanupError.message}` : ''
    throw new Error(`Metadata media gagal disimpan: ${metadataError.message}.${cleanupNote}`)
  }

  const { data } = client.storage.from('micra-media').getPublicUrl(path)
  return { id: metadata.id as string, path, url: data.publicUrl }
}
