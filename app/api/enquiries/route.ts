import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  let input: unknown
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ error: 'The request body must be valid JSON.' }, { status: 400 })
  }
  if (!input || typeof input !== 'object') {
    return NextResponse.json({ error: 'The request body is invalid.' }, { status: 400 })
  }

  const body = input as Record<string, unknown>
  if (typeof body.website === 'string' && body.website.trim()) {
    return NextResponse.json({ error: 'The message could not be accepted.' }, { status: 400 })
  }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (name.length < 1 || name.length > 120) {
    return NextResponse.json({ error: 'Name must be between 1 and 120 characters.' }, { status: 400 })
  }
  if (email.length < 3 || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  if (subject.length > 200) {
    return NextResponse.json({ error: 'Subject must be no more than 200 characters.' }, { status: 400 })
  }
  if (message.length < 1 || message.length > 5000) {
    return NextResponse.json({ error: 'Message must be between 1 and 5,000 characters.' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) {
    return NextResponse.json({ error: 'The contact form is temporarily unavailable because Supabase is not configured.' }, { status: 503 })
  }

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error } = await client.from('enquiries').insert({ name, email, subject, message })
  if (error) {
    return NextResponse.json({ error: `Your message could not be saved: ${error.message}` }, { status: 502 })
  }

  return NextResponse.json({ submitted: true }, { status: 201 })
}
