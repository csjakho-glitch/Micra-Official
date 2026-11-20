import type { Metadata } from 'next'
import '../src/index.css'
import '../src/App.css'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'MICRA | Renewable Energy-Powered Aeration',
    template: '%s | MICRA',
  },
  description: 'MICRA develops practical, renewable energy-powered aeration solutions for productive water environments.',
  applicationName: 'MICRA',
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
