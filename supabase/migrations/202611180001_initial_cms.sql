create extension if not exists pgcrypto;

do $$
begin
  create type public.admin_role as enum ('super_admin', 'content_admin', 'editor', 'pending');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role public.admin_role not null default 'pending',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_admin_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_admin_user();

insert into public.profiles (id, full_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (id) do nothing;

create or replace function public.current_admin_role()
returns public.admin_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.can_edit_content()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_admin_role() in ('super_admin', 'content_admin', 'editor'), false)
$$;

create or replace function public.can_publish_content()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_admin_role() in ('super_admin', 'content_admin'), false)
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_admin_role() = 'super_admin', false)
$$;

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 120),
  draft_version_id uuid,
  published_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  version_number integer not null check (version_number > 0),
  content jsonb not null check (
    jsonb_typeof(content) = 'object'
    and jsonb_typeof(content -> 'name') = 'string'
    and char_length(content ->> 'name') between 1 and 120
    and jsonb_typeof(content -> 'headline') = 'string'
    and char_length(content ->> 'headline') <= 300
    and jsonb_typeof(content -> 'description') = 'string'
    and char_length(content ->> 'description') <= 10000
    and jsonb_typeof(content -> 'sections') = 'array'
  ),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (page_id, version_number)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pages_draft_version_fk') then
    alter table public.pages add constraint pages_draft_version_fk
      foreign key (draft_version_id) references public.page_versions (id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pages_published_version_fk') then
    alter table public.pages add constraint pages_published_version_fk
      foreign key (published_version_id) references public.page_versions (id) on delete set null;
  end if;
end
$$;

create index if not exists page_versions_page_created_idx on public.page_versions (page_id, created_at desc);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')),
  alt_text text not null default '',
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null default '',
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'replied', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_activity (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  created_at timestamptz not null default now()
);

create or replace function public.create_page(p_slug text, p_name text, p_content jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_page_id uuid;
  new_version_id uuid;
begin
  if not public.can_edit_content() then
    raise exception 'Akses ditolak: pengguna tidak dapat membuat halaman.';
  end if;
  if p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(p_slug) > 120 then
    raise exception 'Alamat halaman hanya boleh berisi huruf kecil, angka, dan tanda hubung.';
  end if;
  if char_length(p_name) not between 1 and 120 or jsonb_typeof(p_content) <> 'object' then
    raise exception 'Nama atau isi halaman tidak valid.';
  end if;

  insert into public.pages (slug, name)
  values (p_slug, p_name)
  returning id into new_page_id;

  insert into public.page_versions (page_id, version_number, content, created_by)
  values (new_page_id, 1, p_content, auth.uid())
  returning id into new_version_id;
  update public.pages set draft_version_id = new_version_id where id = new_page_id;
  insert into public.admin_activity (actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'create_page', 'page', new_page_id);

  return new_page_id;
end;
$$;

create or replace function public.save_page_draft(p_page_id uuid, p_content jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  next_version integer;
  new_version_id uuid;
begin
  if not public.can_edit_content() then
    raise exception 'Akses ditolak: pengguna tidak dapat mengedit konten.';
  end if;
  if jsonb_typeof(p_content) <> 'object' then
    raise exception 'Konten halaman harus berupa objek JSON.';
  end if;

  perform 1 from public.pages where id = p_page_id for update;
  if not found then
    raise exception 'Halaman tidak ditemukan.';
  end if;

  select coalesce(max(version_number), 0) + 1
    into next_version
    from public.page_versions
   where page_id = p_page_id;

  insert into public.page_versions (page_id, version_number, content, created_by)
  values (p_page_id, next_version, p_content, auth.uid())
  returning id into new_version_id;

  update public.pages
     set draft_version_id = new_version_id, updated_at = now()
   where id = p_page_id;

  insert into public.admin_activity (actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'save_draft', 'page', p_page_id);

  return new_version_id;
end;
$$;

create or replace function public.publish_page_draft(p_page_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_id uuid;
begin
  if not public.can_publish_content() then
    raise exception 'Akses ditolak: hanya Content Admin dan Super Admin yang dapat menerbitkan.';
  end if;

  select draft_version_id into draft_id
    from public.pages
   where id = p_page_id
   for update;
  if not found then
    raise exception 'Halaman tidak ditemukan.';
  end if;
  if draft_id is null then
    raise exception 'Simpan draft sebelum menerbitkan halaman.';
  end if;

  update public.page_versions set published_at = now() where id = draft_id;
  update public.pages
     set published_version_id = draft_id, updated_at = now()
   where id = p_page_id;

  insert into public.admin_activity (actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'publish', 'page', p_page_id);
end;
$$;

create or replace function public.restore_page_version(p_page_id uuid, p_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  next_version integer;
  restored_version_id uuid;
begin
  if not public.can_edit_content() then
    raise exception 'Akses ditolak: pengguna tidak dapat mengedit konten.';
  end if;

  perform 1 from public.pages where id = p_page_id for update;
  if not found then
    raise exception 'Halaman tidak ditemukan.';
  end if;

  select coalesce(max(version_number), 0) + 1
    into next_version
    from public.page_versions
   where page_id = p_page_id;

  insert into public.page_versions (page_id, version_number, content, created_by)
  select p_page_id, next_version, content, auth.uid()
    from public.page_versions
   where id = p_version_id and page_id = p_page_id
  returning id into restored_version_id;
  if restored_version_id is null then
    raise exception 'Versi yang dipilih tidak ditemukan.';
  end if;

  update public.pages set draft_version_id = restored_version_id, updated_at = now() where id = p_page_id;
  insert into public.admin_activity (actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'restore_version', 'page', p_page_id);
  return restored_version_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.pages enable row level security;
alter table public.page_versions enable row level security;
alter table public.media_assets enable row level security;
alter table public.enquiries enable row level security;
alter table public.site_settings enable row level security;
alter table public.admin_activity enable row level security;

drop policy if exists "Admins can read profiles" on public.profiles;
create policy "Admins can read profiles"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.can_edit_content());
drop policy if exists "Super admins manage profiles" on public.profiles;
create policy "Super admins manage profiles"
  on public.profiles for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "Published pages are public" on public.pages;
create policy "Published pages are public"
  on public.pages for select to anon, authenticated
  using (published_version_id is not null or (auth.uid() is not null and public.can_edit_content()));
drop policy if exists "Super admins create pages" on public.pages;
create policy "Super admins create pages"
  on public.pages for insert to authenticated
  with check (public.is_super_admin());
drop policy if exists "Super admins update page metadata" on public.pages;
create policy "Super admins update page metadata"
  on public.pages for update to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists "Super admins delete pages" on public.pages;
create policy "Super admins delete pages"
  on public.pages for delete to authenticated
  using (public.is_super_admin());

drop policy if exists "Published versions are public" on public.page_versions;
create policy "Published versions are public"
  on public.page_versions for select to anon, authenticated
  using (
    published_at is not null and exists (
      select 1 from public.pages p
       where p.id = page_versions.page_id
         and p.published_version_id = page_versions.id
    )
    or (auth.uid() is not null and public.can_edit_content())
  );
drop policy if exists "Editors create versions" on public.page_versions;
create policy "Editors create versions"
  on public.page_versions for insert to authenticated
  with check (public.can_edit_content() and created_by = auth.uid());
drop policy if exists "Super admins delete versions" on public.page_versions;
create policy "Super admins delete versions"
  on public.page_versions for delete to authenticated
  using (public.is_super_admin());

drop policy if exists "Admins view media" on public.media_assets;
create policy "Admins view media"
  on public.media_assets for select to authenticated
  using (public.can_edit_content());
drop policy if exists "Admins add media" on public.media_assets;
create policy "Admins add media"
  on public.media_assets for insert to authenticated
  with check (public.can_edit_content() and created_by = auth.uid());
drop policy if exists "Admins update media" on public.media_assets;
create policy "Admins update media"
  on public.media_assets for update to authenticated
  using (public.can_edit_content()) with check (public.can_edit_content());
drop policy if exists "Super admins delete media metadata" on public.media_assets;
create policy "Super admins delete media metadata"
  on public.media_assets for delete to authenticated
  using (public.is_super_admin());

drop policy if exists "Admins read enquiries" on public.enquiries;
create policy "Admins read enquiries"
  on public.enquiries for select to authenticated
  using (public.can_edit_content());
drop policy if exists "Public submit enquiries" on public.enquiries;
create policy "Public submit enquiries"
  on public.enquiries for insert to anon, authenticated
  with check (char_length(name) between 1 and 120 and char_length(email) between 3 and 320 and char_length(message) between 1 and 5000);
drop policy if exists "Admins update enquiries" on public.enquiries;
create policy "Admins update enquiries"
  on public.enquiries for update to authenticated
  using (public.can_edit_content()) with check (public.can_edit_content());

drop policy if exists "Public read site settings" on public.site_settings;
create policy "Public read site settings"
  on public.site_settings for select to anon, authenticated
  using (key like 'public_%' or (auth.uid() is not null and public.can_edit_content()));
drop policy if exists "Super admins manage site settings" on public.site_settings;
create policy "Super admins manage site settings"
  on public.site_settings for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "Admins read activity" on public.admin_activity;
create policy "Admins read activity"
  on public.admin_activity for select to authenticated
  using (public.can_edit_content());
drop policy if exists "Authenticated users append activity" on public.admin_activity;
create policy "Authenticated users append activity"
  on public.admin_activity for insert to authenticated
  with check (actor_id = auth.uid() and public.can_edit_content());

revoke execute on function public.save_page_draft(uuid, jsonb) from public, anon;
revoke execute on function public.publish_page_draft(uuid) from public, anon;
revoke execute on function public.restore_page_version(uuid, uuid) from public, anon;
grant execute on function public.save_page_draft(uuid, jsonb) to authenticated;
grant execute on function public.publish_page_draft(uuid) to authenticated;
grant execute on function public.restore_page_version(uuid, uuid) to authenticated;
revoke execute on function public.create_page(text, text, jsonb) from public, anon;
grant execute on function public.create_page(text, text, jsonb) to authenticated;

grant select on public.profiles, public.pages, public.page_versions, public.media_assets,
  public.enquiries, public.site_settings, public.admin_activity to authenticated;
grant insert, update, delete on public.profiles, public.pages, public.page_versions,
  public.media_assets, public.enquiries, public.site_settings, public.admin_activity to authenticated;
grant select on public.pages, public.page_versions, public.site_settings to anon;
grant insert on public.enquiries to anon;
grant usage, select on sequence public.admin_activity_id_seq to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('micra-media', 'micra-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read MICRA media" on storage.objects;
create policy "Public can read MICRA media"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'micra-media');
drop policy if exists "Editors can upload MICRA media" on storage.objects;
create policy "Editors can upload MICRA media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'micra-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.can_edit_content()
  );
drop policy if exists "Editors can replace own MICRA media" on storage.objects;
create policy "Editors can replace own MICRA media"
  on storage.objects for update to authenticated
  using (bucket_id = 'micra-media' and owner_id = auth.uid()::text and public.can_edit_content())
  with check (bucket_id = 'micra-media' and owner_id = auth.uid()::text and public.can_edit_content());
drop policy if exists "Super admins can delete MICRA media" on storage.objects;
create policy "Super admins can delete MICRA media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'micra-media' and public.is_super_admin());
