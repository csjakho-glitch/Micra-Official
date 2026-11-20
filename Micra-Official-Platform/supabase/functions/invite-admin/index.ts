import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return respond(405, { error: 'Metode permintaan tidak didukung.' })

  const authorization = request.headers.get('Authorization')
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!accessToken) return respond(401, { error: 'Sesi administrator tidak ditemukan. Silakan masuk kembali.' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return respond(500, { error: 'Konfigurasi server untuk undangan admin belum tersedia.' })
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: authError } = await authClient.auth.getUser(accessToken)
  if (authError || !userData.user) return respond(401, { error: 'Sesi administrator tidak valid. Silakan masuk kembali.' })

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: actor, error: roleError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (roleError) return respond(500, { error: 'Hak akses administrator tidak dapat diperiksa.' })
  if (actor?.role !== 'super_admin') return respond(403, { error: 'Hanya Super Admin yang dapat mengundang administrator.' })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return respond(400, { error: 'Isi permintaan tidak valid.' })
  }
  if (!body || typeof body !== 'object') return respond(400, { error: 'Isi permintaan tidak valid.' })

  const input = body as { email?: unknown, fullName?: unknown, role?: unknown }
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
  const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : ''
  const role = input.role
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return respond(400, { error: 'Masukkan alamat email yang valid.' })
  }
  if (fullName.length > 120) return respond(400, { error: 'Nama maksimal 120 karakter.' })
  if (role !== 'editor' && role !== 'content_admin') {
    return respond(400, { error: 'Pilih peran Editor atau Content Admin. Undangan Super Admin tidak tersedia.' })
  }

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  })
  if (inviteError) return respond(400, { error: `Undangan gagal dikirim: ${inviteError.message}` })
  if (!inviteData.user) return respond(500, { error: 'Undangan terkirim tanpa data pengguna yang diharapkan. Periksa Authentication → Users.' })

  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ full_name: fullName, role })
    .eq('id', inviteData.user.id)
  if (profileError) {
    return respond(500, {
      error: `Undangan email sudah terkirim, tetapi peran belum dapat disetel. Pengguna tetap berstatus pending; periksa Manajemen Pengguna. Detail: ${profileError.message}`,
      invitationCreated: true,
      userId: inviteData.user.id,
    })
  }

  const { error: activityError } = await adminClient.from('admin_activity').insert({
    actor_id: userData.user.id,
    action: 'invite_admin',
    entity_type: 'profile',
    entity_id: inviteData.user.id,
  })
  if (activityError) {
    return respond(500, {
      error: `Undangan terkirim dan peran tersimpan, tetapi catatan aktivitas gagal ditulis: ${activityError.message}`,
      invitationCreated: true,
      userId: inviteData.user.id,
    })
  }

  return respond(201, { userId: inviteData.user.id, email, role })
})
