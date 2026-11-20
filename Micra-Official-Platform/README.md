# MICRA Platform Official

MICRA's public website and visual content management system, built with Next.js App Router, React, TypeScript, Tailwind CSS, and Supabase.

## Run locally

```powershell
npm install
npm run dev
```

Open `http://localhost:3000` for the public website or `http://localhost:3000/admin` for the Indonesian CMS.

## Supabase setup

1. Enable Email/Password sign-in and disable public sign-ups under **Authentication → Providers**. New users receive the `pending` role until an administrator assigns access.
2. Keep the project's Supabase URL and publishable/anon key in `.env.example` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. `next.config.ts` maps these public values to the `NEXT_PUBLIC_` variables used by Next.js. The server and browser both use only the publishable key; never put a `service_role` key in this file or browser code.
3. Run `supabase/migrations/202611180001_initial_cms.sql` in the Supabase SQL Editor if the project has not already been set up. It creates the content, revision, media, enquiry, and settings tables, RLS policies, CMS functions, and the public media bucket.
4. Create an administrator under **Authentication → Users → Add user**. Promote the initial administrator from the SQL Editor, replacing the email:

   ```sql
   update public.profiles
   set role = 'super_admin'
   where id = (select id from auth.users where email = 'admin@example.com');
   ```

5. Restart the Next.js dev server after changing `.env.example`, then sign in at `/admin`.

## Public website and CMS

- The public site has responsive routes for Home, About, Solutions, Impact, Partnerships, Business Model, Insights, and Contact.
- Public content is loaded exclusively from the `published_version_id` and its published revision. Draft revisions are not queried for public rendering.
- When a page has no published version, the site uses its included starter copy. Treat this as illustrative copy, not substantiation of MICRA's impact or performance; review and replace it with approved MICRA copy before launch.
- Public navigation and contact details read `public_navigation` and `public_site_info` from `site_settings`.
- The Contact form validates input and writes enquiries using the public Supabase key; RLS restricts anonymous access to enquiry insertion.
- `/admin` keeps the existing CMS experience, including authentication, role checks, drafts, publishing, media, and the invitation UI.
- Older Indonesian CMS links `/solusi`, `/dampak`, and `/kemitraan` redirect to their English public routes.

## Deployment

Deploy this repository as a Next.js project on Vercel. Configure the Supabase project URL and publishable key as environment variables (or retain the existing `.env.example` convention for local builds). Configure the Supabase Auth email provider and redirect URLs for administrator invitations before using the invite flow.

The `invite-admin` Edge Function is not deployed or live-tested as part of this migration. It requires server-side Supabase secrets configured in Supabase; the service-role key must never be added to Next.js environment variables.
