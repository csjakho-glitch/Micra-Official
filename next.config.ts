import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { NextConfig } from 'next'

function readEnvExample() {
  const file = readFileSync(resolve(process.cwd(), '.env.example'), 'utf8')
  return Object.fromEntries(file.split(/\r?\n/).flatMap(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return []
    const separator = trimmed.indexOf('=')
    if (separator < 1) return []
    const key = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, '$2')
    return [[key, value]]
  }))
}

const exampleEnv = readEnvExample()
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      exampleEnv.NEXT_PUBLIC_SUPABASE_URL ||
      exampleEnv.VITE_SUPABASE_URL ||
      '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      exampleEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      exampleEnv.VITE_SUPABASE_ANON_KEY ||
      '',
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
}

export default nextConfig
