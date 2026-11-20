"use client"

import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  Archive, Bell, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
  Columns3, Eye, FileText, Globe2, Grid2X2, History, Image,
  LayoutDashboard, LayoutTemplate, Leaf, Menu, MessageSquare,
  Monitor, MoreHorizontal, MousePointerClick, PanelsTopLeft, Plus,
  Search, Settings, Smartphone, Tablet, Trash2, Upload, RotateCcw,
  Users, Waves, Wind, Zap, Check, Copy, GripVertical,
  Save, Send, ArrowUpRight, X, PencilLine
} from 'lucide-react'
import {
  createCmsPage, deleteUnusedMedia, getAdminRole, loadAdminMedia, loadAdminPages,
  inviteAdmin, loadAdminProfiles, loadDashboardData, loadEnquiries, loadPageVersions,
  loadSiteSetting, publishPageDraft, restorePageVersion, savePageDraft,
  saveSiteSetting, updateAdminRole, updateEnquiryStatus, updateMediaAltText, uploadMedia,
} from './lib/cms'
import { isSupabaseConfigured, supabase, supabaseConfigurationError, type AdminRole, type CmsActivity, type CmsEnquiry, type CmsVersion, type PageContent } from './lib/supabase'

type Page = {
  id: string
  name: string
  path: string
  headline: string
  status: 'Published' | 'Draft'
  updated: string
  description: string
}

function readLocalDraft(): { pages?: Page[], sections?: Section[] } | null {
  if (typeof window === 'undefined') return null
  const saved = window.localStorage.getItem('micra-admin-draft')
  if (!saved) return null
  try {
    const parsed: unknown = JSON.parse(saved)
    if (!parsed || typeof parsed !== 'object') return null
    const draft = parsed as { pages?: unknown, sections?: unknown }
    return {
      pages: Array.isArray(draft.pages) ? draft.pages as Page[] : undefined,
      sections: Array.isArray(draft.sections) ? draft.sections as Section[] : undefined,
    }
  } catch {
    return null
  }
}

type Section = {
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
}

type MediaAsset = {
  id: number | string
  name: string
  used: boolean
  color: string
  url?: string
  path?: string
  altText?: string
}

const initialPages: Page[] = [
  { id: 'home', name: 'Beranda', path: '/', headline: 'Clean water starts with better aeration.', status: 'Published', updated: '2 jam lalu', description: 'Solusi aerasi bertenaga terbarukan untuk pertanian, perikanan, dan pengelolaan air.' },
  { id: 'solutions', name: 'Solusi Kami', path: '/solusi', headline: 'Practical solutions for productive ecosystems.', status: 'Published', updated: 'Kemarin', description: 'Teknologi aerasi yang efisien untuk mendukung kehidupan produktif dan berkelanjutan.' },
  { id: 'impact', name: 'Dampak', path: '/dampak', headline: 'Impact that reaches further.', status: 'Draft', updated: '3 hari lalu', description: 'Mengukur dampak bagi komunitas, lingkungan, dan pertumbuhan ekonomi.' },
  { id: 'partners', name: 'Kemitraan', path: '/kemitraan', headline: 'Build a healthier future together.', status: 'Published', updated: '18 Mei 2026', description: 'Kemitraan untuk memperluas dampak solusi MICRA.' },
]

const initialSections: Section[] = [
  { id: 1, title: 'Bertenaga Surya untuk Perairan Sehat', subtitle: 'Aerasi terbarukan', description: 'Sistem aerasi MICRA membantu menjaga kadar oksigen, mengurangi limbah, dan mendukung ekosistem produktif.', type: 'Hero Section', visible: true, icon: 'sun' },
  { id: 2, title: 'Mengapa Aerasi Penting?', subtitle: 'Ekosistem yang seimbang', description: 'Aerasi yang tepat menjaga kualitas air, kesehatan biota, dan efisiensi operasional.', type: 'Image and Text', visible: true, icon: 'waves' },
  { id: 3, title: 'Solusi untuk Berbagai Sektor', subtitle: 'Pilihan yang dapat disesuaikan', description: 'Rancang solusi sesuai kebutuhan tambak, kolam, dan instalasi pengolahan air.', type: 'Feature Cards', visible: true, icon: 'grid' },
  { id: 4, title: 'Siap Membangun Masa Depan Lebih Hijau?', subtitle: 'Mulai bersama kami', description: 'Temukan solusi yang paling tepat untuk kebutuhan Anda.', type: 'Call to Action', visible: false, icon: 'arrow' },
]

type NavLink = { label: string, url: string }
type SiteInfo = { name: string, email: string, phone: string, address: string }
type DashboardSummary = {
  totalPages: number
  publishedPages: number
  draftPages: number
  mediaCount: number
  pendingEnquiries: number
  recentActivities: (CmsActivity & { pageName: string, actorName: string })[]
}

const defaultNavigation: NavLink[] = [
  { label: 'Solutions', url: '/solutions' },
  { label: 'Impact', url: '/impact' },
  { label: 'Partnerships', url: '/partnerships' },
]
const defaultSiteInfo: SiteInfo = { name: 'MICRA', email: '', phone: '', address: '' }

const iconChoices = [
  { id: 'sun', name: 'Tenaga Surya', icon: Zap },
  { id: 'waves', name: 'Air Bersih', icon: Waves },
  { id: 'wind', name: 'Udara Segar', icon: Wind },
  { id: 'leaf', name: 'Ramah Lingkungan', icon: Leaf },
  { id: 'grid', name: 'Solusi', icon: Grid2X2 },
  { id: 'arrow', name: 'Tindakan', icon: ArrowUpRight },
]

const navItems = [
  { id: 'dashboard', label: 'Dasbor', icon: LayoutDashboard },
  { id: 'pages', label: 'Halaman', icon: FileText },
  { id: 'sections', label: 'Bagian Halaman', icon: PanelsTopLeft },
  { id: 'media', label: 'Pustaka Media', icon: Image },
  { id: 'icons', label: 'Ikon & Desain', icon: Grid2X2 },
  { id: 'navigation', label: 'Menu Navigasi', icon: Menu },
  { id: 'cta', label: 'Ajakan Bertindak', icon: MousePointerClick },
  { id: 'seo', label: 'Pengaturan SEO', icon: Globe2 },
  { id: 'enquiries', label: 'Pesan Masuk', icon: MessageSquare, badge: 8 },
  { id: 'settings', label: 'Pengaturan Situs', icon: Settings },
  { id: 'users', label: 'Manajemen Pengguna', icon: Users },
]

function App() {
  const [localDraft] = useState(() => isSupabaseConfigured ? null : readLocalDraft())
  const startingPages = localDraft?.pages?.length ? localDraft.pages : initialPages
  const startingSections = localDraft?.sections ?? initialSections
  const [active, setActive] = useState('dashboard')
  const [pages, setPages] = useState<Page[]>(startingPages)
  const [sections, setSections] = useState<Section[]>(startingSections)
  const [pageContentById, setPageContentById] = useState<Record<string, PageContent>>(
    () => Object.fromEntries(startingPages.map(page => [page.id, {
      name: page.name, headline: page.headline, description: page.description, sections: startingSections,
    }])),
  )
  const [selectedPage, setSelectedPage] = useState(startingPages[0])
  const [selectedSection, setSelectedSection] = useState(startingSections[0] ?? initialSections[0])
  const [preview, setPreview] = useState<'desktop' | 'tablet' | 'mobile' | null>(null)
  const [publishConfirm, setPublishConfirm] = useState(false)
  const [toast, setToast] = useState('')
  const [, setSaved] = useState(true)
  const [search, setSearch] = useState('')
  const [media, setMedia] = useState<MediaAsset[]>([
    { id: 1, name: 'solar-aerator-hero.jpg', used: true, color: 'green' },
    { id: 2, name: 'aquaculture-system.jpg', used: true, color: 'blue' },
    { id: 3, name: 'community-partner.jpg', used: false, color: 'orange' },
  ])
  const [session, setSession] = useState<Session | null>(null)
  const [authRole, setAuthRole] = useState<AdminRole | null>(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [authError, setAuthError] = useState('')
  const [userId, setUserId] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyVersions, setHistoryVersions] = useState<CmsVersion[]>([])
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null)
  const [enquiries, setEnquiries] = useState<CmsEnquiry[]>([])
  const [adminProfiles, setAdminProfiles] = useState<{ id: string, full_name: string, role: AdminRole | 'pending', created_at: string }[]>([])
  const [navigationLinks, setNavigationLinks] = useState<NavLink[]>(defaultNavigation)
  const [siteInfo, setSiteInfo] = useState<SiteInfo>(defaultSiteInfo)
  const [imagePickerTarget, setImagePickerTarget] = useState<'hero' | 'section' | null>(null)

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2400)
  }

  useEffect(() => {
    if (!supabase) return
    let active = true
    const acceptSession = async (nextSession: Session | null) => {
      if (!active) return
      setSession(nextSession)
      setUserId(nextSession?.user.id ?? '')
      setAuthRole(null)
      if (!nextSession) {
        setAuthError('')
        setAuthReady(true)
        return
      }
      try {
        const role = await getAdminRole(nextSession.user.id)
        if (active) {
          setAuthRole(role)
          setAuthError('')
        }
      } catch (error) {
        if (active) setAuthError(error instanceof Error ? error.message : 'Hak akses tidak dapat diverifikasi.')
      } finally {
        if (active) setAuthReady(true)
      }
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setAuthError(`Sesi tidak dapat dimuat: ${error.message}`)
        setAuthReady(true)
        return
      }
      void acceptSession(data.session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void acceptSession(nextSession)
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !session || !authRole) return
    let active = true
    loadAdminPages().then(({ pages: dbPages, versions }) => {
      if (!active) return
      const versionById = new Map(versions.map(version => [version.id, version]))
      const loaded = dbPages.map(page => {
        const draftVersion = page.draft_version_id ? versionById.get(page.draft_version_id) : undefined
        const publishedVersion = page.published_version_id ? versionById.get(page.published_version_id) : undefined
        const version = draftVersion ?? publishedVersion
        const content = version?.content
        return {
          id: page.id,
          name: content?.name || page.name,
          path: `/${page.slug}`,
          headline: content?.headline || '',
          status: page.published_version_id ? 'Published' as const : 'Draft' as const,
          updated: version?.created_at ? new Date(version.created_at).toLocaleDateString('id-ID') : 'Belum pernah diubah',
          description: content?.description || '',
        }
      })
      const loadedContent = Object.fromEntries(dbPages.map(page => {
        const draftVersion = page.draft_version_id ? versionById.get(page.draft_version_id) : undefined
        const publishedVersion = page.published_version_id ? versionById.get(page.published_version_id) : undefined
        const version = draftVersion ?? publishedVersion
        return [page.id, version?.content ?? { name: page.name, headline: '', description: '', sections: [] }]
      }))
      setPageContentById(loadedContent)
      setPages(loaded)
      if (loaded.length) {
        const firstPage = loaded[0]
        setSelectedPage(firstPage)
        const dbPage = dbPages.find(page => page.id === firstPage.id)
        const draftVersion = dbPage?.draft_version_id ? versionById.get(dbPage.draft_version_id) : undefined
        const publishedVersion = dbPage?.published_version_id ? versionById.get(dbPage.published_version_id) : undefined
        const version = draftVersion ?? publishedVersion
        if (version?.content.sections?.length) {
          setSections(version.content.sections)
          setSelectedSection(version.content.sections[0])
        }
      }
    }).catch(error => {
      if (active) notify(error instanceof Error ? error.message : 'Konten website tidak dapat dimuat.')
    })
    return () => { active = false }
  }, [session, authRole])

  useEffect(() => {
    if (!supabase || !session || !authRole) return
    let active = true
    Promise.all([
      loadDashboardData(),
      loadEnquiries(),
      loadAdminProfiles(),
      loadSiteSetting<NavLink[]>('public_navigation', defaultNavigation),
      loadSiteSetting<SiteInfo>('public_site_info', defaultSiteInfo),
    ]).then(([summary, enquiryRows, profiles, navigation, info]) => {
      if (!active) return
      setDashboardSummary(summary)
      setEnquiries(enquiryRows)
      setAdminProfiles(profiles)
      setNavigationLinks(navigation)
      setSiteInfo(info)
    }).catch(error => {
      if (active) notify(error instanceof Error ? error.message : 'Data dasbor tidak dapat dimuat.')
    })
    return () => { active = false }
  }, [session, authRole])

  useEffect(() => {
    if (!supabase || !session || !authRole) return
    let active = true
    loadAdminMedia().then(items => {
      if (active) setMedia(items)
    }).catch(error => {
      if (active) notify(error instanceof Error ? error.message : 'Pustaka media tidak dapat dimuat.')
    })
    return () => { active = false }
  }, [session, authRole])

  const getCurrentContent = (): PageContent => ({
    ...pageContentById[selectedPage.id],
    name: selectedPage.name,
    headline: selectedPage.headline,
    description: selectedPage.description,
    sections,
  })

  const persistContentPatch = async (patch: Partial<PageContent>, successMessage: string) => {
    const nextContent: PageContent = {
      ...getCurrentContent(),
      ...patch,
      name: patch.name ?? selectedPage.name,
      headline: patch.headline ?? selectedPage.headline,
      description: patch.description ?? selectedPage.description,
      sections: patch.sections ?? sections,
    }
    setPageContentById(current => ({ ...current, [selectedPage.id]: nextContent }))
    setSaved(false)
    if (supabase && session) {
      try {
        await savePageDraft(selectedPage.id, nextContent)
        notify(successMessage)
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Draft gagal disimpan.')
      }
    } else {
      notify('Perubahan demo hanya tersimpan di perangkat ini')
    }
  }

  const attachSelectedImage = (asset: MediaAsset) => {
    if (imagePickerTarget === 'hero') {
      void persistContentPatch({
        heroImage: { url: asset.url ?? '', path: asset.path ?? '', altText: asset.altText ?? '' },
      }, 'Gambar utama disimpan sebagai draft')
    } else if (imagePickerTarget === 'section') {
      const nextSections = sections.map(section => section.id === selectedSection.id
        ? { ...section, imageUrl: asset.url ?? '', imagePath: asset.path ?? '', imageAltText: asset.altText ?? '' }
        : section)
      setSelectedSection(nextSections.find(section => section.id === selectedSection.id) ?? selectedSection)
      changeSections(nextSections)
      setSaved(false)
      notify('Gambar bagian dipilih. Simpan draft untuk menyimpan perubahan.')
    }
    setImagePickerTarget(null)
  }

  const saveDraft = async () => {
    if (supabase && session) {
      try {
        await savePageDraft(selectedPage.id, getCurrentContent())
        setSaved(true)
        notify('Draft berhasil disimpan di Supabase')
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Draft gagal disimpan.')
      }
      return
    }
    localStorage.setItem('micra-admin-draft', JSON.stringify({ pages, sections }))
    setSaved(true)
    notify('Draft demo berhasil disimpan di perangkat ini')
  }

  const publish = async () => {
    if (authRole === 'editor') {
      notify('Peran Editor tidak memiliki izin untuk mempublikasikan.')
      setPublishConfirm(false)
      return
    }
    if (supabase && session) {
      try {
        await savePageDraft(selectedPage.id, getCurrentContent())
        await publishPageDraft(selectedPage.id)
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Publikasi gagal.')
        setPublishConfirm(false)
        return
      }
    }
    setPages(items => items.map(p => p.id === selectedPage.id ? { ...p, status: 'Published', updated: 'Baru saja' } : p))
    setPublishConfirm(false)
    notify(supabase && session ? 'Perubahan berhasil dipublikasikan' : 'Publikasi demo berhasil (hanya di perangkat ini)')
  }

  const updateSelectedPage = (field: 'name' | 'headline' | 'description', value: string) => {
    setSaved(false)
    const nextPage = { ...selectedPage, [field]: value }
    setSelectedPage(nextPage)
    setPages(items => items.map(p => p.id === selectedPage.id ? { ...p, [field]: value } : p))
    setPageContentById(current => ({
      ...current,
      [selectedPage.id]: { ...current[selectedPage.id], name: nextPage.name, headline: nextPage.headline, description: nextPage.description, sections },
    }))
  }

  const selectPage = (page: Page) => {
    setSelectedPage(page)
    const nextSections = pageContentById[page.id]?.sections ?? []
    setSections(nextSections)
    if (nextSections.length) setSelectedSection(nextSections[0])
  }

  const updateSection = (field: keyof Section, value: string | boolean) => {
    setSaved(false)
    const nextSections = sections.map(section => section.id === selectedSection.id ? { ...section, [field]: value } as Section : section)
    setSelectedSection(prev => ({ ...prev, [field]: value } as Section))
    setSections(nextSections)
    setPageContentById(current => ({
      ...current,
      [selectedPage.id]: { ...current[selectedPage.id], name: selectedPage.name, headline: selectedPage.headline, description: selectedPage.description, sections: nextSections },
    }))
  }

  const changeSections = (nextSections: Section[]) => {
    setSections(nextSections)
    setPageContentById(current => ({
      ...current,
      [selectedPage.id]: { ...current[selectedPage.id], name: selectedPage.name, headline: selectedPage.headline, description: selectedPage.description, sections: nextSections },
    }))
  }

  const addPage = async () => {
    const name = 'Halaman Baru'
    const slug = `halaman-baru-${Date.now()}`
    const content: PageContent = { name, headline: '', description: '', sections: [] }
    let id = `local-${Date.now()}`
    if (supabase && session) {
      try {
        id = await createCmsPage(slug, name, content)
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Halaman gagal dibuat.')
        return
      }
    }
    const page: Page = { id, name, path: `/${slug}`, headline: '', description: '', status: 'Draft', updated: 'Baru saja' }
    setPages(items => [...items, page])
    setSelectedPage(page)
    setSections([])
    setPageContentById(current => ({ ...current, [id]: content }))
    setSaved(false)
    setActive('pages')
    notify(supabase && session ? 'Halaman baru berhasil dibuat di Supabase' : 'Halaman demo berhasil dibuat')
  }

  const openHistory = async () => {
    if (!supabase || !session) {
      notify('Riwayat revisi tersedia setelah Supabase dikonfigurasi.')
      return
    }
    try {
      setHistoryVersions(await loadPageVersions(selectedPage.id))
      setHistoryOpen(true)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Riwayat revisi gagal dimuat.')
    }
  }

  const restoreVersion = async (version: CmsVersion) => {
    if (!supabase) return
    try {
      await restorePageVersion(selectedPage.id, version.id)
      const restoredPage = {
        ...selectedPage,
        name: version.content.name,
        headline: version.content.headline,
        description: version.content.description,
        updated: 'Draft dipulihkan',
      }
      setSelectedPage(restoredPage)
      setPages(items => items.map(page => page.id === selectedPage.id ? restoredPage : page))
      setSections(version.content.sections)
      setPageContentById(current => ({ ...current, [selectedPage.id]: version.content }))
      setHistoryOpen(false)
      notify(`Versi ${version.version_number} dipulihkan sebagai draft`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Versi gagal dipulihkan.')
    }
  }

  const persistSiteSetting = async (key: string, value: unknown, successMessage: string) => {
    if (!supabase || !session) {
      notify('Pengaturan situs demo tidak dikirim ke database.')
      return
    }
    try {
      await saveSiteSetting(key, value, session.user.id)
      notify(successMessage)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Pengaturan gagal disimpan.')
    }
  }

  const changeEnquiryStatus = async (id: string, status: CmsEnquiry['status']) => {
    if (!supabase) return
    try {
      await updateEnquiryStatus(id, status)
      setEnquiries(items => items.map(item => item.id === id ? { ...item, status } : item))
      const summary = await loadDashboardData()
      setDashboardSummary(summary)
      notify('Status pesan berhasil diperbarui')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Status pesan gagal diperbarui.')
    }
  }

  const changeAdminRole = async (id: string, role: AdminRole | 'pending') => {
    if (!supabase || !session || authRole !== 'super_admin') return
    try {
      await updateAdminRole(id, role, session.user.id)
      setAdminProfiles(items => items.map(profile => profile.id === id ? { ...profile, role } : profile))
      notify('Peran pengguna berhasil diperbarui')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Peran pengguna gagal diperbarui.')
    }
  }

  const inviteAdministrator = async (email: string, fullName: string, role: 'editor' | 'content_admin') => {
    if (!session || authRole !== 'super_admin') throw new Error('Hanya Super Admin yang dapat mengundang pengguna.')
    await inviteAdmin(email, fullName, role)
    try {
      setAdminProfiles(await loadAdminProfiles())
    } catch (error) {
      notify(error instanceof Error ? `Undangan terkirim, tetapi daftar pengguna gagal dimuat: ${error.message}` : 'Undangan terkirim; muat ulang daftar pengguna.')
      return
    }
    notify(`Undangan berhasil dikirim ke ${email}`)
  }

  const removeMedia = async (id: number | string, path?: string) => {
    if (typeof id !== 'string' || !path) {
      setMedia(items => items.filter(item => item.id !== id))
      notify('Gambar demo dihapus')
      return
    }
    try {
      await deleteUnusedMedia(id, path)
      setMedia(items => items.filter(item => item.id !== id))
      notify('Gambar berhasil dihapus')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Gambar gagal dihapus.')
    }
  }

  const duplicateSection = (section: Section) => {
    const copy = { ...section, id: Date.now(), title: `${section.title} (Salinan)`, visible: false }
    changeSections([...sections, copy])
    notify('Bagian berhasil diduplikasi')
  }

  const moveSection = (from: number, to: number) => {
    const next = [...sections]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    changeSections(next)
    setSaved(false)
  }

  const filteredMedia = useMemo(() => media.filter(m => m.name.toLowerCase().includes(search.toLowerCase())), [media, search])

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
      notify('Gunakan file JPEG, PNG, WebP, atau AVIF')
      return
    }
    try {
      const remote = supabase && session ? await uploadMedia(file, userId) : null
      setMedia(items => [...items, { id: remote?.id ?? Date.now(), name: file.name, used: false, color: 'green', ...(remote ? { url: remote.url, path: remote.path, altText: '' } : {}) }])
      notify(remote ? 'Gambar berhasil diunggah ke Supabase Storage' : 'Gambar demo ditambahkan (belum diunggah ke server)')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Gambar gagal diunggah.')
    }
  }

  if (supabaseConfigurationError) return <SetupRequiredView message={supabaseConfigurationError} />
  if (isSupabaseConfigured && !authReady) return <div className="auth-loading">Memeriksa sesi administrator…</div>
  if (isSupabaseConfigured && session && authError && !authRole) {
    return <LoginView error={authError} onSignOut={() => void supabase?.auth.signOut()} />
  }
  if (isSupabaseConfigured && !session) return <LoginView error={authError} onLogin={async (email, password) => {
    const { error } = await supabase!.auth.signInWithPassword({ email, password })
    if (error) throw new Error(`Login gagal: ${error.message}`)
  }} />

  return (
    <div className="cms-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Leaf size={21} strokeWidth={2.3} /></div>
          <div><strong>MICRA</strong><span>Sistem Manajemen</span></div>
        </div>
        <nav className="side-nav">
          {navItems.map(item => (
            <button key={item.id} className={active === item.id ? 'active' : ''} onClick={() => setActive(item.id)}>
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.badge && <b>{item.badge}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button><CircleHelp size={18} /><span>Pusat Bantuan</span></button>
          <div className="profile">
            <div className="avatar">AR</div>
            <div><strong>{session?.user.email ?? 'Ardi Rahman'}</strong><span>{authRole ?? 'Mode demo lokal'}</span></div>
            {session && <button className="signout-btn" title="Keluar" onClick={() => void supabase?.auth.signOut()}><ChevronDown size={16} /></button>}
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumb">
            {active !== 'dashboard' && <button onClick={() => setActive('dashboard')}><ChevronLeft size={17} /></button>}
            <span>{active === 'dashboard' ? 'Dasbor' : navItems.find(n => n.id === active)?.label}</span>
          </div>
          <div className="top-actions">
            {!isSupabaseConfigured && <span className="demo-pill">DEMO LOKAL</span>}
            <button className="icon-btn" title="Lihat situs" onClick={() => setPreview('desktop')}><Globe2 size={18} /></button>
            <button className="icon-btn notification" title="Notifikasi"><Bell size={18} /><i /></button>
            <button className="outline-btn" onClick={saveDraft}><Save size={16} /> Simpan draft</button>
            <button className="primary-btn" disabled={authRole === 'editor'} onClick={() => setPublishConfirm(true)}><Send size={16} /> Publikasikan</button>
          </div>
        </header>

        <div className="content">
          {active === 'dashboard' && <Dashboard onNavigate={setActive} summary={dashboardSummary} enquiries={enquiries.slice(0, 3)} />}
          {active === 'pages' && (
            <PagesView pages={pages} selectedPage={selectedPage} setSelectedPage={selectPage}
              updateSelectedPage={updateSelectedPage} onPreview={setPreview} onAddPage={() => void addPage()}
              onHistory={() => void openHistory()} heroImage={pageContentById[selectedPage.id]?.heroImage}
              onChooseHeroImage={() => setImagePickerTarget('hero')}
              onRemoveHeroImage={() => void persistContentPatch({ heroImage: undefined }, 'Gambar utama dihapus dari draft')}
              onHeroAltChange={altText => {
                const current = pageContentById[selectedPage.id]?.heroImage
                void persistContentPatch({ heroImage: { url: current?.url ?? '', path: current?.path ?? '', altText } }, 'Teks alternatif gambar disimpan sebagai draft')
              }} />
          )}
          {active === 'sections' && (
            <SectionsView sections={sections} selectedSection={selectedSection} setSelectedSection={setSelectedSection}
              updateSection={updateSection} moveSection={moveSection} duplicateSection={duplicateSection}
              onChangeSections={changeSections} onPreview={setPreview} notify={notify}
              onChooseImage={() => setImagePickerTarget('section')} />
          )}
          {active === 'media' && (
            <MediaView media={filteredMedia} search={search} setSearch={setSearch} handleUpload={handleUpload}
              canDelete={authRole === 'super_admin'}
              setMedia={setMedia} notify={notify} persistAltText={async (id, value) => {
                if (typeof id === 'string') await updateMediaAltText(id, value)
              }} onDelete={removeMedia} />
          )}
          {active === 'icons' && <IconsView selected={selectedSection.icon} onSelect={icon => updateSection('icon', icon)} />}
          {active === 'cta' && <CtaView value={pageContentById[selectedPage.id]?.cta} onSave={cta => void persistContentPatch({ cta }, 'Ajakan bertindak tersimpan sebagai draft halaman')} />}
          {active === 'seo' && <SeoView page={selectedPage} value={pageContentById[selectedPage.id]?.seo} onSave={seo => void persistContentPatch({ seo }, 'SEO tersimpan sebagai draft halaman')} />}
          {active === 'enquiries' && <EnquiriesView enquiries={enquiries} onStatusChange={changeEnquiryStatus} />}
          {active === 'navigation' && <NavigationView links={navigationLinks} onChange={setNavigationLinks} onSave={() => void persistSiteSetting('public_navigation', navigationLinks, 'Menu navigasi berhasil disimpan')} canManage={authRole === 'super_admin'} />}
          {active === 'settings' && <SiteSettingsView value={siteInfo} onChange={setSiteInfo} onSave={() => void persistSiteSetting('public_site_info', siteInfo, 'Pengaturan situs berhasil disimpan')} canManage={authRole === 'super_admin'} />}
          {active === 'users' && <UsersView profiles={adminProfiles} currentUserId={session?.user.id ?? ''} canManage={authRole === 'super_admin'} onRoleChange={changeAdminRole} onInvite={inviteAdministrator} />}
        </div>
      </main>

      {preview && (
        <div className="preview-overlay">
          <div className="preview-window">
            <div className="preview-head">
              <div><strong>Pratinjau situs</strong><span>Perubahan draft belum dipublikasikan</span></div>
              <div className="device-picker">
                <button className={preview === 'desktop' ? 'active' : ''} onClick={() => setPreview('desktop')}><Monitor size={17} /></button>
                <button className={preview === 'tablet' ? 'active' : ''} onClick={() => setPreview('tablet')}><Tablet size={17} /></button>
                <button className={preview === 'mobile' ? 'active' : ''} onClick={() => setPreview('mobile')}><Smartphone size={17} /></button>
              </div>
              <button className="icon-btn" onClick={() => setPreview(null)}><X size={18} /></button>
            </div>
            <div className="preview-canvas">
              <div className={`site-frame ${preview}`}>
                <PublicPreview page={selectedPage} sections={sections} heroImage={pageContentById[selectedPage.id]?.heroImage} />
              </div>
            </div>
          </div>
        </div>
      )}

      {publishConfirm && (
        <div className="modal-backdrop">
          <div className="confirm-modal">
            <div className="confirm-icon"><Send size={22} /></div>
            <h2>Publikasikan perubahan?</h2>
            <p>Perubahan pada <strong>{selectedPage.name}</strong> akan tampil di website publik.</p>
            <div className="confirm-actions">
              <button className="outline-btn" onClick={() => setPublishConfirm(false)}>Batalkan</button>
              <button className="primary-btn" onClick={publish}>Ya, publikasikan</button>
            </div>
          </div>
        </div>
      )}
      {historyOpen && (
        <div className="modal-backdrop">
          <div className="history-modal">
            <div className="history-modal-head"><div><h2>Riwayat versi</h2><p>{selectedPage.name} · versi tersimpan</p></div><button className="icon-btn" onClick={() => setHistoryOpen(false)}><X size={18} /></button></div>
            <div className="history-list">
              {historyVersions.length ? historyVersions.map(version => (
                <article key={version.id}>
                  <div className="version-badge">v{version.version_number}</div>
                  <div className="version-details"><strong>{version.content.name || selectedPage.name}</strong><span>{version.author} · {new Date(version.created_at).toLocaleString('id-ID')}</span>{version.published_at && <small>Versi ini pernah dipublikasikan</small>}</div>
                  <button className="outline-btn" onClick={() => { if (window.confirm(`Pulihkan versi ${version.version_number} sebagai draft? Versi publik tidak akan berubah.`)) void restoreVersion(version) }}><RotateCcw size={14} /> Pulihkan</button>
                </article>
              )) : <p className="history-empty">Belum ada versi tersimpan untuk halaman ini.</p>}
            </div>
          </div>
        </div>
      )}
      {imagePickerTarget && <ImagePicker assets={media} onSelect={attachSelectedImage} onClose={() => setImagePickerTarget(null)} />}
      {toast && <div className="toast"><Check size={17} /> {toast}</div>}
    </div>
  )
}

function Dashboard({ onNavigate, summary, enquiries }: {
  onNavigate: (id: string) => void
  summary: DashboardSummary | null
  enquiries: CmsEnquiry[]
}) {
  const [dateLabel] = useState(() => new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()).toLocaleUpperCase('id-ID'))
  const actionLabels: Record<string, string> = {
    save_draft: 'Draft disimpan',
    publish: 'Halaman dipublikasikan',
    restore_version: 'Versi dipulihkan',
    create_page: 'Halaman baru dibuat',
    change_admin_role: 'Peran pengguna diubah',
  }
  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">{dateLabel}</p><h1>Selamat datang</h1></div>
        <button className="primary-btn" onClick={() => onNavigate('pages')}><Plus size={17} /> Tambah halaman</button>
      </div>
      <div className="stat-grid">
        <StatCard label="Total halaman" value={summary ? String(summary.totalPages) : '…'} detail="Dari database website" icon={FileText} tone="mint" />
        <StatCard label="Halaman terbit" value={summary ? String(summary.publishedPages) : '…'} detail="Siap dilihat publik" icon={Globe2} tone="blue" />
        <StatCard label="Masih draft" value={summary ? String(summary.draftPages) : '…'} detail="Belum dipublikasikan" icon={PencilLine} tone="yellow" />
        <StatCard label="Berkas media" value={summary ? String(summary.mediaCount) : '…'} detail="Tersimpan di pustaka" icon={Image} tone="purple" />
      </div>
      <div className="dashboard-grid">
        <section className="panel activity-panel">
          <div className="panel-head"><div><h2>Aktivitas konten terbaru</h2><p>Pembaruan terakhir pada website</p></div><button onClick={() => onNavigate('pages')}>Lihat semua <ChevronRight size={15} /></button></div>
          <div className="activity-list">
            {summary?.recentActivities.length ? summary.recentActivities.map((activity, i) => (
              <div className="activity-row" key={activity.id}>
                <div className={`activity-icon ${['green', 'blue', 'purple'][i % 3]}`}><FileText size={18} /></div>
                <div className="activity-name"><strong>{activity.pageName}</strong><span>{actionLabels[activity.action] ?? activity.action}</span></div>
                <div className="activity-editor"><div className="mini-avatar">{activity.actorName.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()}</div><span>{activity.actorName}</span></div>
                <span className="activity-time">{new Date(activity.created_at).toLocaleDateString('id-ID')}</span>
                <button><MoreHorizontal size={17} /></button>
              </div>
            )) : <p className="dashboard-empty">{summary ? 'Belum ada aktivitas admin.' : 'Memuat aktivitas…'}</p>}
          </div>
        </section>
        <section className="panel enquiry-panel">
          <div className="panel-head"><div><h2>Pesan masuk</h2><p>Menunggu tanggapan</p></div><button onClick={() => onNavigate('enquiries')}>Lihat semua</button></div>
          <div className="enquiry-count"><strong>{summary?.pendingEnquiries ?? '…'}</strong><span>pesan menunggu</span></div>
          {enquiries.map(enquiry => (
            <div className="enquiry-row" key={enquiry.id}><div className="mini-avatar">{enquiry.name[0]?.toUpperCase() ?? '?'}</div><div><strong>{enquiry.name}</strong><span>{enquiry.subject || enquiry.message}</span></div><small>{new Date(enquiry.created_at).toLocaleDateString('id-ID')}</small></div>
          ))}
          {summary && !enquiries.length && <p className="dashboard-empty">Belum ada pesan masuk.</p>}
        </section>
      </div>
      <section className="panel quick-panel">
        <div className="panel-head"><div><h2>Tindakan cepat</h2><p>Mulai pembaruan konten</p></div></div>
        <div className="quick-grid">
          <button onClick={() => onNavigate('pages')}><div className="quick-icon mint"><PencilLine size={20} /></div><span><strong>Edit halaman</strong><small>Perbarui teks dan gambar</small></span><ChevronRight size={17} /></button>
          <button onClick={() => onNavigate('media')}><div className="quick-icon blue"><Upload size={20} /></div><span><strong>Unggah media</strong><small>Tambah gambar baru</small></span><ChevronRight size={17} /></button>
          <button onClick={() => onNavigate('sections')}><div className="quick-icon purple"><Plus size={20} /></div><span><strong>Tambah bagian</strong><small>Pilih desain siap pakai</small></span><ChevronRight size={17} /></button>
        </div>
      </section>
    </>
  )
}

function StatCard({ label, value, detail, icon: Icon, tone }: { label: string, value: string, detail: string, icon: typeof FileText, tone: string }) {
  return <section className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={21} /></div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></section>
}

function LoginView({ error, onLogin, onSignOut }: {
  error?: string
  onLogin?: (email: string, password: string) => Promise<void>
  onSignOut?: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!onLogin) return
    setBusy(true)
    setFormError('')
    try {
      await onLogin(email, password)
    } catch (loginError) {
      setFormError(loginError instanceof Error ? loginError.message : 'Login gagal.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark"><Leaf size={22} /></div>
        <p className="eyebrow">MICRA CONTENT MANAGEMENT</p>
        <h1>Masuk ke dashboard</h1>
        <p className="login-intro">Gunakan akun administrator yang telah didaftarkan.</p>
        {(error || formError) && <div className="login-error">{error || formError}</div>}
        {onLogin ? <>
          <label>Email<input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} /></label>
          <label>Kata sandi<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>
          <button className="primary-btn" disabled={busy}>{busy ? 'Memeriksa…' : 'Masuk'}</button>
        </> : <button type="button" className="outline-btn" onClick={onSignOut}>Keluar dan coba lagi</button>}
      </form>
    </div>
  )
}

function SetupRequiredView({ message }: { message: string }) {
  return <div className="login-page"><section className="login-card"><div className="brand-mark"><Settings size={22} /></div><p className="eyebrow">KONFIGURASI DIPERLUKAN</p><h1>Periksa koneksi Supabase</h1><p className="login-intro">{message}</p><p className="setup-help">Lihat bagian “Connect Supabase” di README, lalu mulai ulang server pengembangan.</p></section></div>
}

function PagesView({ pages, selectedPage, setSelectedPage, updateSelectedPage, onPreview, onAddPage, onHistory, heroImage, onChooseHeroImage, onRemoveHeroImage, onHeroAltChange }: {
  pages: Page[], selectedPage: Page, setSelectedPage: (p: Page) => void,
  updateSelectedPage: (field: 'name' | 'headline' | 'description', value: string) => void,
  onPreview: (v: 'desktop') => void, onAddPage: () => void, onHistory: () => void,
  heroImage?: PageContent['heroImage'], onChooseHeroImage: () => void, onRemoveHeroImage: () => void,
  onHeroAltChange: (alt: string) => void
}) {
  return (
    <div className="editor-layout">
      <aside className="page-list">
        <div className="panel-head"><h2>Halaman</h2><button className="small-primary" onClick={onAddPage}><Plus size={15} /> Tambah</button></div>
        <div className="search-box"><Search size={16} /><input placeholder="Cari halaman" /></div>
        {pages.map(page => (
          <button key={page.id} className={`page-row ${selectedPage.id === page.id ? 'active' : ''}`} onClick={() => setSelectedPage(page)}>
            <div className="page-row-icon"><FileText size={17} /></div>
            <div><strong>{page.name}</strong><span>{page.path}</span></div>
            <i className={page.status === 'Published' ? 'published' : 'draft'} />
          </button>
        ))}
      </aside>
      <section className="editor-main">
        <div className="editor-head">
          <div><span className="status-dot" /> <strong>Halaman:</strong> {selectedPage.name}</div>
          <div><button className="outline-btn" onClick={() => onPreview('desktop')}><Eye size={16} /> Pratinjau</button></div>
        </div>
        <div className="form-section">
          <div className="form-section-title"><h3>Informasi halaman</h3><span>Konten utama yang terlihat oleh pengunjung</span></div>
          <label>Nama halaman<div className="field-help">Nama untuk identifikasi di sistem CMS</div><input value={selectedPage.name} onChange={e => updateSelectedPage('name', e.target.value)} /></label>
          <label>Judul utama (headline)<div className="field-help">Tampil sebagai judul halaman publik</div><input value={selectedPage.headline} onChange={e => updateSelectedPage('headline', e.target.value)} /></label>
          <label>Deskripsi utama<textarea rows={4} value={selectedPage.description} onChange={e => updateSelectedPage('description', e.target.value)} /></label>
        </div>
        <div className="form-section">
          <div className="form-section-title"><h3>Gambar unggulan</h3><span>Gambar utama pada bagian atas halaman</span></div>
          <div className="image-field">
            <div className="image-thumb hero-thumb">{heroImage?.url ? <img src={heroImage.url} alt={heroImage.altText ?? ''} /> : <><Waves size={42} /><span>Belum ada gambar</span></>}</div>
            <div className="image-actions"><strong>{heroImage?.path?.split('/').pop() ?? 'Pilih gambar dari pustaka'}</strong><span>{heroImage?.url ? 'Gambar tersimpan di Pustaka Media' : 'Pilih gambar yang sudah diunggah'}</span><div><button className="outline-btn" onClick={onChooseHeroImage}><Image size={15} /> Pilih gambar</button>{heroImage?.url && <button className="text-btn" onClick={onRemoveHeroImage}>Hapus gambar</button>}</div></div>
          </div>
          <label>Teks alternatif gambar<div className="field-help">Membantu pembaca layar dan pencarian Google</div><input key={`${selectedPage.id}-${heroImage?.path ?? ''}-${heroImage?.altText ?? ''}`} defaultValue={heroImage?.altText ?? ''} placeholder="Deskripsikan gambar" onBlur={event => {
            if (heroImage && event.target.value !== heroImage.altText) onHeroAltChange(event.target.value)
          }} /></label>
        </div>
      </section>
      <aside className="editor-aside">
        <div className="aside-card"><h3>Riwayat perubahan</h3><div className="revision"><div className="mini-avatar">AR</div><div><strong>{selectedPage.name}</strong><span>{selectedPage.updated}</span></div></div><button onClick={onHistory}><History size={16} /> Lihat versi sebelumnya</button></div>
        <div className="aside-card"><h3>Pintasan</h3><button onClick={() => onPreview('desktop')}><Eye size={16} /> Buka pratinjau</button><button><LayoutTemplate size={16} /> Kelola bagian halaman</button></div>
      </aside>
    </div>
  )
}

function SectionsView({ sections, selectedSection, setSelectedSection, updateSection, moveSection, duplicateSection, onChangeSections, onPreview, notify, onChooseImage }: {
  sections: Section[], selectedSection: Section, setSelectedSection: (s: Section) => void,
  updateSection: (field: keyof Section, value: string | boolean) => void,
  moveSection: (from: number, to: number) => void, duplicateSection: (s: Section) => void,
  onChangeSections: (items: Section[]) => void, onPreview: (v: 'desktop') => void, notify: (v: string) => void,
  onChooseImage: () => void
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  return (
    <div className="sections-layout">
      <aside className="section-list">
        <div className="panel-head"><div><h2>Bagian halaman</h2><p>Beranda</p></div><button className="small-primary"><Plus size={15} /> Baru</button></div>
        {sections.map((section, index) => (
          <div key={section.id} draggable onDragStart={() => setDragIndex(index)} onDragOver={e => e.preventDefault()} onDrop={() => { if (dragIndex !== null && dragIndex !== index) moveSection(dragIndex, index); setDragIndex(null) }}
            className={`section-row ${selectedSection.id === section.id ? 'active' : ''}`} onClick={() => setSelectedSection(section)}>
            <GripVertical size={16} className="grip" />
            <div className="section-row-icon">{section.icon === 'sun' ? <Zap size={16} /> : section.icon === 'waves' ? <Waves size={16} /> : <Grid2X2 size={16} />}</div>
            <div><strong>{section.title}</strong><span>{section.type}</span></div>
            <button title={section.visible ? 'Sembunyikan' : 'Tampilkan'} onClick={e => { e.stopPropagation(); updateSection('visible', !section.visible); notify(section.visible ? 'Bagian disembunyikan' : 'Bagian ditampilkan kembali') }}>
              {section.visible ? <Eye size={15} /> : <Archive size={15} />}
            </button>
          </div>
        ))}
      </aside>
      <section className="section-editor">
        <div className="editor-head"><div><strong>Bagian:</strong> {selectedSection.title}</div><div><button className="icon-btn" onClick={() => duplicateSection(selectedSection)} title="Duplikat"><Copy size={16} /></button><button className="outline-btn" onClick={() => onPreview('desktop')}><Eye size={16} /> Pratinjau</button></div></div>
        <div className="form-section">
          <div className="form-section-title"><h3>Konten bagian</h3><span>Perbarui teks yang ditampilkan</span></div>
          <label>Judul bagian<input value={selectedSection.title} onChange={e => updateSection('title', e.target.value)} /></label>
          <label>Subjudul<input value={selectedSection.subtitle} onChange={e => updateSection('subtitle', e.target.value)} /></label>
          <label>Deskripsi<textarea rows={5} value={selectedSection.description} onChange={e => updateSection('description', e.target.value)} /></label>
          <div className="section-image-control">
            {selectedSection.imageUrl ? <img src={selectedSection.imageUrl} alt={selectedSection.imageAltText ?? ''} /> : <div className="section-image-empty"><Image size={20} /><span>Belum ada gambar</span></div>}
            <div><strong>Gambar bagian</strong><span>{selectedSection.imagePath?.split('/').pop() ?? 'Pilih gambar dari pustaka media'}</span><button className="outline-btn" onClick={onChooseImage}><Image size={15} /> Pilih gambar</button></div>
          </div>
          {selectedSection.imageUrl && <label>Teks alternatif gambar<input value={selectedSection.imageAltText ?? ''} onChange={event => updateSection('imageAltText', event.target.value)} /></label>}
        </div>
        <div className="form-section">
          <div className="form-section-title"><h3>Tampilan</h3><span>Pilih ikon dan pengaturan visual</span></div>
          <div className="design-grid">
            <label>Ikon
              <select value={selectedSection.icon} onChange={e => updateSection('icon', e.target.value)}>
                {iconChoices.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </label>
            <label>Latar belakang<select defaultValue="mint"><option value="mint">Hijau muda</option><option value="white">Putih</option><option value="dark">Hijau gelap</option></select></label>
            <label>Ukuran judul<select defaultValue="large"><option value="large">Besar</option><option value="medium">Sedang</option><option value="small">Kecil</option></select></label>
          </div>
          <label className="toggle-row"><span><strong>Tampilkan bagian ini</strong><small>Bagian tersembunyi tidak tampil di website</small></span><button className={`toggle ${selectedSection.visible ? 'on' : ''}`} onClick={() => updateSection('visible', !selectedSection.visible)}><i /></button></label>
        </div>
      </section>
      <aside className="editor-aside">
        <div className="template-card"><h3>Tambah bagian baru</h3><p>Pilih desain siap pakai</p><div className="template-grid">
          {['Hero', 'Gambar & Teks', 'Kartu Fitur', 'Solusi', 'Manfaat', 'Statistik', 'Ajakan', 'Kontak'].map((t, i) => <button key={t} onClick={() => { onChangeSections([...sections, { id: Date.now(), title: t, subtitle: 'Subjudul baru', description: 'Tambahkan deskripsi untuk bagian ini.', type: t, visible: true, icon: 'leaf' }]); notify(`Bagian ${t} ditambahkan`) }}><div className={`template-thumb t${i % 4}`}><Columns3 size={18} /></div><span>{t}</span></button>)}
        </div></div>
      </aside>
    </div>
  )
}

function MediaView({ media, search, setSearch, handleUpload, setMedia, notify, persistAltText, onDelete, canDelete }: {
  media: { id: number | string, name: string, used: boolean, color: string, url?: string, path?: string, altText?: string }[], search: string, setSearch: (v: string) => void,
  handleUpload: (e: ChangeEvent<HTMLInputElement>) => void,
  setMedia: Dispatch<SetStateAction<{ id: number | string, name: string, used: boolean, color: string, url?: string, path?: string, altText?: string }[]>>,
  notify: (v: string) => void
  persistAltText: (id: number | string, value: string) => Promise<void>
  onDelete: (id: number | string, path?: string) => void
  canDelete: boolean
}) {
  return (
    <div className="library-page">
      <div className="page-heading"><div><p className="eyebrow">ASET WEBSITE</p><h1>Pustaka Media</h1></div><label className="primary-btn upload-label"><Upload size={16} /> Unggah gambar<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={handleUpload} /></label></div>
      <div className="media-toolbar"><div className="search-box wide"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari gambar..." /></div><button className="filter-btn">Semua kategori <ChevronDown size={15} /></button><button className="filter-btn">Terbaru <ChevronDown size={15} /></button></div>
      <div className="media-grid">
        {media.map(item => (
          <article className="media-card" key={item.id}>
            <div className={`media-preview ${item.color}`}>{item.url ? <img src={item.url} alt={item.altText || item.name} /> : <><Leaf size={42} /><span>{item.name.includes('aerator') ? 'Aerator' : item.name.includes('system') ? 'Sistem' : 'Komunitas'}</span></>}</div>
            <div className="media-info"><strong>{item.name}</strong><div><span>{item.used ? 'Digunakan' : 'Tidak digunakan'}</span><button disabled={!canDelete || item.used} onClick={() => { if (item.used) notify('Gambar masih dipakai oleh konten tersimpan'); else if (window.confirm(`Hapus gambar ${item.name}?`)) onDelete(item.id, item.path) }} title={item.used ? 'Masih digunakan' : 'Hapus'}><Trash2 size={15} /></button></div></div>
            <label className="alt-text-input">Teks alternatif<input value={item.altText ?? ''} placeholder="Deskripsikan gambar" onChange={event => setMedia(items => items.map(asset => asset.id === item.id ? { ...asset, altText: event.target.value } : asset))} onBlur={event => { if (typeof item.id !== 'string') { notify('Teks alternatif demo hanya tersimpan di tampilan ini'); return } void persistAltText(item.id, event.target.value).then(() => notify('Teks alternatif disimpan')).catch(error => notify(error instanceof Error ? error.message : 'Teks alternatif gagal disimpan.')) }} /></label>
          </article>
        ))}
      </div>
    </div>
  )
}

function ImagePicker({ assets, onSelect, onClose }: {
  assets: MediaAsset[]
  onSelect: (asset: MediaAsset) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const visibleAssets = assets.filter(asset => asset.url && asset.name.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className="image-picker-modal" role="dialog" aria-modal="true" aria-labelledby="image-picker-title">
        <div className="history-modal-head">
          <div><h2 id="image-picker-title">Pilih gambar</h2><p>Pilih gambar yang sudah ada di Pustaka Media.</p></div>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup"><X size={18} /></button>
        </div>
        <div className="search-box wide image-picker-search"><Search size={16} /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari nama gambar" /></div>
        {visibleAssets.length ? <div className="image-picker-grid">
          {visibleAssets.map(asset => <button key={asset.id} onClick={() => onSelect(asset)}>
            <img src={asset.url} alt={asset.altText || asset.name} /><span>{asset.name}</span>
          </button>)}
        </div> : <div className="image-picker-empty"><Image size={26} /><p>{query ? 'Tidak ada gambar yang cocok.' : 'Belum ada gambar di server. Unggah gambar lewat menu Pustaka Media terlebih dahulu.'}</p></div>}
      </section>
    </div>
  )
}

function IconsView({ selected, onSelect }: { selected: string, onSelect: (v: string) => void }) {
  const [query, setQuery] = useState('')
  return (
    <div className="library-page">
      <div className="page-heading"><div><p className="eyebrow">DESAIN VISUAL</p><h1>Ikon & Desain</h1></div></div>
      <div className="icon-layout">
        <section className="panel"><div className="panel-head"><div><h2>Pustaka ikon</h2><p>Pilih ikon yang telah disetujui</p></div></div><div className="search-box wide"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari ikon" /></div><div className="icon-grid">{iconChoices.filter(i => i.name.toLowerCase().includes(query.toLowerCase())).map(choice => <button key={choice.id} className={selected === choice.id ? 'active' : ''} onClick={() => onSelect(choice.id)}><choice.icon size={25} /><span>{choice.name}</span></button>)}</div></section>
        <aside className="icon-settings panel"><h2>Pengaturan ikon</h2><label>Ukuran<select defaultValue="medium"><option value="small">Kecil</option><option value="medium">Sedang</option><option value="large">Besar</option></select></label><label>Warna<select defaultValue="green"><option value="green">Hijau MICRA</option><option value="blue">Biru</option><option value="white">Putih</option></select></label><div className="icon-preview"><Leaf size={52} /><span>Pratinjau</span></div></aside>
      </div>
    </div>
  )
}

function CtaView({ value, onSave }: {
  value?: PageContent['cta']
  onSave: (value: NonNullable<PageContent['cta']>) => void
}) {
  const [label, setLabel] = useState(value?.label ?? 'Lihat Solusi Kami')
  const [url, setUrl] = useState(value?.url ?? '/solusi')
  const [style, setStyle] = useState<NonNullable<PageContent['cta']>['style']>(value?.style ?? 'primary')
  const [openNewTab, setOpenNewTab] = useState(value?.openNewTab ?? false)
  const [visible, setVisible] = useState(value?.visible ?? true)
  const valid = isValidDestination(url)
  return (
    <div className="library-page">
      <div className="page-heading"><div><p className="eyebrow">KONVERSI</p><h1>Ajakan Bertindak</h1><p className="field-help">Pengaturan ini disimpan sebagai draft halaman yang dipilih.</p></div></div>
      <div className="cta-layout">
        <section className="panel cta-form">
          <h2>Kelola tautan</h2>
          <label>Nama tombol<input maxLength={80} value={label} onChange={event => setLabel(event.target.value)} /></label>
          <label>Alamat tujuan<div className="field-help">Tautan harus berupa alamat relatif situs atau HTTPS</div><input value={url} onChange={event => setUrl(event.target.value)} />{!valid && <small className="error-text">Masukkan alamat relatif seperti /solusi atau tautan HTTPS.</small>}</label>
          <label>Gaya tombol<select value={style} onChange={event => setStyle(event.target.value as typeof style)}><option value="primary">Hijau utama</option><option value="outline">Garis hijau</option><option value="light">Terang</option></select></label>
          <label className="toggle-row"><span><strong>Buka di tab baru</strong></span><button className={`toggle ${openNewTab ? 'on' : ''}`} onClick={() => setOpenNewTab(value => !value)}><i /></button></label>
          <label className="toggle-row"><span><strong>Tampilkan tombol</strong></span><button className={`toggle ${visible ? 'on' : ''}`} onClick={() => setVisible(value => !value)}><i /></button></label>
          <button className="primary-btn" disabled={!valid || !label.trim()} onClick={() => onSave({ label: label.trim(), url: url.trim(), style, openNewTab, visible })}><Save size={16} /> Simpan sebagai draft</button>
        </section>
        <aside className="panel cta-preview"><h2>Pratinjau</h2><div className="cta-preview-box"><span>Siap memperbaiki kualitas air Anda?</span>{visible && <button className={`cta-${style}`}>{label || 'Nama tombol'} <ArrowUpRight size={15} /></button>}</div></aside>
      </div>
    </div>
  )
}

function isValidDestination(value: string) {
  if (/^\/(?!\/)/.test(value)) return true
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function SeoView({ page, value, onSave }: {
  page: Page
  value?: PageContent['seo']
  onSave: (value: NonNullable<PageContent['seo']>) => void
}) {
  const [title, setTitle] = useState(value?.title ?? `${page.name} | MICRA`)
  const [description, setDescription] = useState(value?.description ?? page.description)
  const [canonicalPath, setCanonicalPath] = useState(value?.canonicalPath ?? page.path)
  const pathValid = /^\/(?!\/)[a-zA-Z0-9/_-]*$/.test(canonicalPath)
  return (
    <div className="library-page">
      <div className="page-heading"><div><p className="eyebrow">PENCARIAN GOOGLE</p><h1>Pengaturan SEO</h1><p className="field-help">SEO untuk: {page.name}. Disimpan sebagai draft halaman.</p></div></div>
      <section className="panel seo-form">
        <label>Judul SEO<input maxLength={160} value={title} onChange={event => setTitle(event.target.value)} /></label>
        <label>Deskripsi ringkas<textarea rows={3} maxLength={320} value={description} onChange={event => setDescription(event.target.value)} /></label>
        <label>Alamat halaman<input value={canonicalPath} onChange={event => setCanonicalPath(event.target.value)} />{!pathValid && <small className="error-text">Gunakan jalur situs, contohnya /solusi.</small>}</label>
        <div className="search-preview"><span>micra.co.id{canonicalPath}</span><strong>{title || 'Judul halaman'}</strong><p>{description || 'Deskripsi halaman website.'}</p></div>
        <button className="primary-btn" disabled={!pathValid || !title.trim()} onClick={() => onSave({ title: title.trim(), description: description.trim(), canonicalPath })}><Save size={16} /> Simpan sebagai draft</button>
      </section>
    </div>
  )
}

function EnquiriesView({ enquiries, onStatusChange }: {
  enquiries: CmsEnquiry[]
  onStatusChange: (id: string, status: CmsEnquiry['status']) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(enquiries[0]?.id ?? null)
  const selected = enquiries.find(item => item.id === selectedId) ?? enquiries[0]
  return (
    <div className="library-page">
      <div className="page-heading"><div><p className="eyebrow">KOMUNIKASI</p><h1>Pesan Masuk <span className="heading-badge">{enquiries.filter(item => item.status === 'pending').length} menunggu</span></h1></div></div>
      <div className="inbox-layout">
        <aside className="inbox-list">
          <div className="search-box wide"><Search size={16} /><input placeholder="Cari pesan" /></div>
          {enquiries.map(item => <button key={item.id} className={selected?.id === item.id ? 'active' : ''} onClick={() => setSelectedId(item.id)}>
            <div className="mini-avatar">{item.name[0]?.toUpperCase() ?? '?'}</div><div><strong>{item.name}</strong><span>{item.subject || item.message}</span></div><small>{new Date(item.created_at).toLocaleDateString('id-ID')}</small>
          </button>)}
          {!enquiries.length && <p className="dashboard-empty">Belum ada pesan masuk di database.</p>}
        </aside>
        {selected ? <section className="panel inbox-detail">
          <div className="inbox-detail-head"><div className="mini-avatar">{selected.name[0]?.toUpperCase() ?? '?'}</div><div><strong>{selected.name}</strong><span>{selected.email}</span></div>
            <button className="outline-btn" onClick={() => onStatusChange(selected.id, selected.status === 'archived' ? 'pending' : 'archived')}>{selected.status === 'archived' ? 'Pulihkan' : 'Arsipkan'}</button>
          </div>
          <h2>{selected.subject || 'Pesan dari website'}</h2><p>{selected.message}</p>
          <div className="enquiry-actions"><a className="outline-btn" href={`mailto:${encodeURIComponent(selected.email)}?subject=${encodeURIComponent(`Re: ${selected.subject || 'Pesan untuk MICRA'}`)}`}><Send size={15} /> Balas melalui email</a>
            {selected.status !== 'replied' && <button className="primary-btn" onClick={() => onStatusChange(selected.id, 'replied')}><Check size={15} /> Tandai sudah dibalas</button>}
          </div>
        </section> : <section className="panel inbox-detail"><p>Pilih pesan untuk melihat detail.</p></section>}
      </div>
    </div>
  )
}

function NavigationView({ links, onChange, onSave, canManage }: {
  links: NavLink[]
  onChange: (items: NavLink[]) => void
  onSave: () => void
  canManage: boolean
}) {
  return (
    <div className="library-page">
      <div className="page-heading"><div><p className="eyebrow">MENU WEBSITE</p><h1>Menu Navigasi</h1></div><button className="primary-btn" disabled={!canManage} onClick={onSave}><Save size={16} /> Simpan</button></div>
      {!canManage && <p className="permission-note">Hanya Super Admin yang dapat mengubah menu navigasi.</p>}
      <section className="panel nav-editor">
        <div className="panel-head"><div><h2>Tautan menu utama</h2><p>Gunakan alamat halaman relatif, contohnya /solusi.</p></div><button className="small-primary" disabled={!canManage} onClick={() => onChange([...links, { label: 'Tautan baru', url: '/' }])}><Plus size={15} /> Tambah tautan</button></div>
        {links.map((link, index) => <div className="nav-edit-row" key={`${index}-${link.label}`}><span className="nav-index">{index + 1}</span><label>Nama<input value={link.label} disabled={!canManage} onChange={event => onChange(links.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} /></label><label>Alamat<input value={link.url} disabled={!canManage} onChange={event => onChange(links.map((item, i) => i === index ? { ...item, url: event.target.value } : item))} /></label><button className="icon-btn" disabled={!canManage} title="Hapus tautan" onClick={() => onChange(links.filter((_, i) => i !== index))}><Trash2 size={15} /></button></div>)}
        {!links.length && <p className="dashboard-empty">Belum ada tautan. Tambahkan tautan menu pertama.</p>}
      </section>
    </div>
  )
}

function SiteSettingsView({ value, onChange, onSave, canManage }: {
  value: SiteInfo
  onChange: (value: SiteInfo) => void
  onSave: () => void
  canManage: boolean
}) {
  const update = (field: keyof SiteInfo, nextValue: string) => onChange({ ...value, [field]: nextValue })
  return (
    <div className="library-page">
      <div className="page-heading"><div><p className="eyebrow">IDENTITAS WEBSITE</p><h1>Pengaturan Situs</h1></div><button className="primary-btn" disabled={!canManage} onClick={onSave}><Save size={16} /> Simpan</button></div>
      {!canManage && <p className="permission-note">Hanya Super Admin yang dapat mengubah pengaturan situs.</p>}
      <section className="panel site-settings-form">
        <label>Nama situs<input value={value.name} disabled={!canManage} onChange={event => update('name', event.target.value)} /></label>
        <label>Email kontak<input type="email" value={value.email} disabled={!canManage} onChange={event => update('email', event.target.value)} /></label>
        <label>Nomor telepon<input value={value.phone} disabled={!canManage} onChange={event => update('phone', event.target.value)} /></label>
        <label>Alamat<textarea rows={3} value={value.address} disabled={!canManage} onChange={event => update('address', event.target.value)} /></label>
      </section>
    </div>
  )
}

function UsersView({ profiles, currentUserId, canManage, onRoleChange, onInvite }: {
  profiles: { id: string, full_name: string, role: AdminRole | 'pending', created_at: string }[]
  currentUserId: string
  canManage: boolean
  onRoleChange: (id: string, role: AdminRole | 'pending') => void
  onInvite: (email: string, fullName: string, role: 'editor' | 'content_admin') => Promise<void>
}) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'content_admin'>('editor')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteError, setInviteError] = useState('')

  const submitInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setInviteBusy(true)
    setInviteError('')
    try {
      await onInvite(inviteEmail.trim(), inviteName.trim(), inviteRole)
      setInviteOpen(false)
      setInviteEmail('')
      setInviteName('')
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Undangan gagal dikirim.')
    } finally {
      setInviteBusy(false)
    }
  }

  return (
    <div className="library-page">
      <div className="page-heading"><div><p className="eyebrow">AKSES SISTEM</p><h1>Manajemen Pengguna</h1></div>
        <button className="primary-btn" disabled={!canManage} onClick={() => setInviteOpen(true)}><Plus size={16} /> Undang pengguna</button>
      </div>
      <p className="permission-note">Undangan dikirim melalui email. Pengguna baru hanya dapat masuk setelah menerima undangan. Hanya Super Admin yang dapat mengundang.</p>
      <section className="panel users-table">
        <div className="users-row users-head"><span>Pengguna</span><span>Peran</span><span>Bergabung</span><span /></div>
        {profiles.map(profile => <div className="users-row" key={profile.id}>
          <div className="user-cell"><div className="mini-avatar">{(profile.full_name || 'U').split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()}</div><div><strong>{profile.full_name || 'Pengguna'}</strong><span>{profile.id === currentUserId ? 'Akun Anda' : `ID ${profile.id.slice(0, 8)}…`}</span></div></div>
          <select className="role-select" value={profile.role} disabled={!canManage || profile.id === currentUserId} onChange={event => onRoleChange(profile.id, event.target.value as AdminRole | 'pending')}>
            <option value="pending">Menunggu persetujuan</option><option value="editor">Editor</option><option value="content_admin">Content Admin</option><option value="super_admin">Super Admin</option>
          </select>
          <span>{new Date(profile.created_at).toLocaleDateString('id-ID')}</span>
          <span>{profile.id === currentUserId ? 'Anda' : ''}</span>
        </div>)}
        {!profiles.length && <p className="dashboard-empty">Belum ada pengguna administrator.</p>}
      </section>
      {inviteOpen && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !inviteBusy) setInviteOpen(false) }}>
        <form className="invite-modal" onSubmit={submitInvite} aria-labelledby="invite-admin-title">
          <div className="history-modal-head"><div><h2 id="invite-admin-title">Undang administrator</h2><p>Kami akan mengirim tautan undangan ke email ini.</p></div><button type="button" className="icon-btn" disabled={inviteBusy} onClick={() => setInviteOpen(false)} aria-label="Tutup"><X size={18} /></button></div>
          <div className="invite-form-body">
            {inviteError && <p className="login-error" role="alert">{inviteError}</p>}
            <label>Nama<input maxLength={120} value={inviteName} onChange={event => setInviteName(event.target.value)} placeholder="Nama administrator" /></label>
            <label>Email<input type="email" required autoComplete="email" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="nama@contoh.com" /></label>
            <label>Peran<select value={inviteRole} onChange={event => setInviteRole(event.target.value as 'editor' | 'content_admin')}><option value="editor">Editor — mengubah konten dan menyimpan draft</option><option value="content_admin">Content Admin — dapat memublikasikan konten</option></select></label>
            <p className="field-help">Super Admin tidak dapat diberikan melalui undangan ini. Pastikan pengguna menerima email undangan sebelum mencoba masuk.</p>
          </div>
          <div className="confirm-actions"><button type="button" className="outline-btn" disabled={inviteBusy} onClick={() => setInviteOpen(false)}>Batal</button><button className="primary-btn" disabled={inviteBusy || !inviteEmail.trim()}>{inviteBusy ? 'Mengirim…' : 'Kirim undangan'}</button></div>
        </form>
      </div>}
    </div>
  )
}

function PublicPreview({ page, sections, heroImage }: { page: Page, sections: Section[], heroImage?: PageContent['heroImage'] }) {
  return <div className="public-site"><nav><strong><Leaf size={16} /> MICRA</strong><div><span>Solusi</span><span>Dampak</span><span>Kemitraan</span><button>Hubungi Kami</button></div></nav><header><div><p>Solusi berkelanjutan untuk air yang lebih baik</p><h1>{page.headline}</h1><span>{page.description}</span><button>Jelajahi Solusi <ArrowUpRight size={13} /></button></div><div className="public-hero-art">{heroImage?.url ? <img src={heroImage.url} alt={heroImage.altText ?? ''} /> : <Waves size={74} />}</div></header>{sections.filter(s=>s.visible).slice(1).map(s=><section className="public-section" key={s.id}><div className="public-section-icon">{s.icon === 'waves' ? <Waves /> : s.icon === 'sun' ? <Zap /> : <Grid2X2 />}</div><div><h2>{s.title}</h2><p>{s.description}</p></div>{s.imageUrl && <img className="public-section-image" src={s.imageUrl} alt={s.imageAltText ?? ''} />}</section>)}</div>
}

export default App
