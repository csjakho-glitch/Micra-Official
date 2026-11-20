import Link from 'next/link'
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Droplets, Globe2, Leaf, Search,
  Settings2, Sun, Users, Waves, Wind,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getPublicPage, getPublicSiteSettings } from '../../src/lib/public-content'
import { publicPages } from '../../src/lib/public-pages'
import ContactForm from './contact-form'

const sectionIcons: Record<string, LucideIcon> = {
  sun: Sun,
  waves: Waves,
  leaf: Leaf,
  grid: Globe2,
  users: Users,
  search: Search,
  settings: Settings2,
  wind: Wind,
}

function safeHref(value: string) {
  const trimmed = value.trim()
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed
  if (/^(mailto:|tel:)/i.test(trimmed)) return trimmed
  try {
    const url = new URL(trimmed)
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.toString()
  } catch {
    return '#'
  }
  return '#'
}

function safeImageUrl(value: string | undefined) {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

export async function PublicSitePage({ slug }: { slug: string }) {
  const [page, settings] = await Promise.all([
    getPublicPage(slug),
    getPublicSiteSettings(),
  ])
  if (!page) return null

  const definition = publicPages[slug]
  const { content } = page
  const sections = content.sections.filter(section => section.visible)
  const cta = content.cta?.visible ? content.cta : undefined
  const imageUrl = safeImageUrl(content.heroImage?.url)
  const siteName = settings.siteInfo.name || 'MICRA'
  const navigation = settings.navigation.filter(item => safeHref(item.url) !== '#')
  const homeHref = slug === 'home' ? '#top' : '/'

  return (
    <div className="micra-site" id="top">
      <header className="site-header">
        <div className="site-container header-inner">
          <Link className="site-brand" href="/" aria-label={`${siteName} home`}>
            <span className="brand-symbol"><Waves size={21} strokeWidth={2.2} /></span>
            <span>{siteName}<small>Water. Energy. Possibility.</small></span>
          </Link>
          <details className="mobile-menu">
            <summary aria-label="Open navigation menu"><span /><span /></summary>
            <nav aria-label="Mobile navigation">
              {navigation.map(item => <Link key={item.url} href={safeHref(item.url)}>{item.label}</Link>)}
              <Link className="mobile-contact" href="/contact">Contact us <ArrowUpRight size={15} /></Link>
            </nav>
          </details>
          <nav className="desktop-nav" aria-label="Main navigation">
            {navigation.map(item => <Link key={item.url} href={safeHref(item.url)}>{item.label}</Link>)}
          </nav>
          <Link className="header-cta" href="/contact">Contact us <ArrowUpRight size={15} /></Link>
        </div>
      </header>

      <main>
        <section className={`site-hero ${slug === 'home' ? 'home-hero' : 'inner-hero'}`}>
          <div className="site-container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow"><span />{definition?.kicker ?? 'MICRA'}</p>
              <h1>{content.headline || content.name}</h1>
              <p className="hero-description">{content.description}</p>
              {cta && (
                <Link
                  className={`button-primary cta-${cta.style}`}
                  href={safeHref(cta.url)}
                  target={cta.openNewTab ? '_blank' : undefined}
                  rel={cta.openNewTab ? 'noopener noreferrer' : undefined}
                >
                  {cta.label}<ArrowRight size={17} />
                </Link>
              )}
              {slug === 'home' && <p className="hero-note"><Leaf size={15} /> Renewable energy-powered aeration</p>}
            </div>
            <div className="hero-art" aria-label={content.heroImage?.altText || 'Abstract water and renewable energy illustration'} role="img">
              {imageUrl ? (
                <img src={imageUrl} alt={content.heroImage?.altText ?? ''} />
              ) : (
                <div className="water-illustration" aria-hidden="true">
                  <div className="illustration-sun"><Sun size={32} /></div>
                  <div className="illustration-orbit orbit-one" />
                  <div className="illustration-orbit orbit-two" />
                  <div className="illustration-water"><Waves size={126} strokeWidth={1.2} /></div>
                  <div className="illustration-leaf"><Leaf size={30} /></div>
                </div>
              )}
              <span className="art-caption"><Droplets size={14} /> Thoughtful technology for water</span>
            </div>
          </div>
          <div className="hero-bottom-line" aria-hidden="true" />
        </section>

        {slug === 'home' && (
          <section className="intro-band">
            <div className="site-container intro-grid">
              <p className="eyebrow">A PRACTICAL APPROACH</p>
              <p>We bring aeration and renewable energy together to support productive water systems—designed with the people and places they serve in mind.</p>
              <Link href="/about" className="text-link">Get to know MICRA <ArrowDownRight size={16} /></Link>
            </div>
          </section>
        )}

        {slug === 'contact' ? (
          <section className="contact-section site-container">
            <div className="contact-copy">
              <p className="eyebrow">GET IN TOUCH</p>
              <h2>Tell us what you’re working on.</h2>
              <p>Share a few details about your water system or partnership idea. We’ll use your message to understand how MICRA may be able to help.</p>
              {settings.siteInfo.email && <a className="contact-detail" href={`mailto:${settings.siteInfo.email}`}>{settings.siteInfo.email}</a>}
              {settings.siteInfo.phone && <a className="contact-detail" href={`tel:${settings.siteInfo.phone}`}>{settings.siteInfo.phone}</a>}
              {settings.siteInfo.address && <p className="contact-detail">{settings.siteInfo.address}</p>}
            </div>
            <ContactForm />
          </section>
        ) : sections.length > 0 && (
          <section className="site-sections site-container">
            <div className="section-heading">
              <div><p className="eyebrow">EXPLORE {content.name.toUpperCase()}</p><h2>Designed for real-world water systems.</h2></div>
              <p>Every application is different. We work from the needs of the site and the people who depend on it.</p>
            </div>
            <div className="feature-grid">
              {sections.map((section, index) => {
                const Icon = sectionIcons[section.icon] ?? Droplets
                const sectionImage = safeImageUrl(section.imageUrl)
                return (
                  <article className={`feature-card feature-card-${index % 3}`} key={section.id}>
                    <div className="feature-topline"><span>0{index + 1}</span><Icon size={20} strokeWidth={1.7} /></div>
                    {sectionImage && <img className="feature-image" src={sectionImage} alt={section.imageAltText ?? ''} />}
                    <p className="feature-subtitle">{section.subtitle}</p>
                    <h3>{section.title}</h3>
                    <p className="feature-description">{section.description}</p>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {slug !== 'contact' && (
          <section className="closing-cta">
            <div className="site-container closing-inner">
              <div><p className="eyebrow">LET’S WORK TOGETHER</p><h2>Have a water system in mind?</h2><p>Tell us about your goals and explore what may be possible with MICRA.</p></div>
              <Link href="/contact" className="button-light">Start a conversation <ArrowUpRight size={17} /></Link>
            </div>
          </section>
        )}
      </main>

      <footer className="site-footer">
        <div className="site-container footer-main">
          <div>
            <Link className="site-brand footer-brand" href={homeHref}>
              <span className="brand-symbol"><Waves size={21} /></span>
              <span>{siteName}<small>Water. Energy. Possibility.</small></span>
            </Link>
            <p className="footer-summary">Renewable energy-powered aeration for productive water environments.</p>
          </div>
          <div className="footer-links">
            <p>Explore</p>
            {navigation.slice(0, 4).map(item => <Link key={item.url} href={safeHref(item.url)}>{item.label}</Link>)}
          </div>
          <div className="footer-links">
            <p>Connect</p>
            <Link href="/contact">Contact MICRA</Link>
            {settings.siteInfo.email && <a href={`mailto:${settings.siteInfo.email}`}>{settings.siteInfo.email}</a>}
          </div>
        </div>
        <div className="site-container footer-bottom"><span>© {new Date().getFullYear()} {siteName}</span><span>Better water starts with thoughtful design.</span></div>
      </footer>
    </div>
  )
}
