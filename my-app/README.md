# COMS 6998 Admin Panel

Next.js admin interface for the Supabase project used by `COMS6998-Hello_World`.

## Features

- Google sign-in through Supabase Auth. The Google provider must be enabled in the existing Supabase project.
- Protected dashboard, profiles, AI comments, and ratings/votes pages.
- AI comments are managed as the existing `posts.caption` field: create adds a caption to an uncaptained post, edit updates it, and delete clears it.
- Ratings show the `posts.likes` / `posts.dislikes` counters separately from counts calculated from individual `post_votes` rows.

## Setup

1. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key from the Supabase project used by Hello World.
2. Enable Google as a Supabase Auth provider. Add this app's local and deployed callback URLs (`https://<app-host>/auth/callback`) to the provider's redirect allow list.
3. Apply both SQL files in `../../COMS6998-Hello_World/supabase/migrations` to the Hello World Supabase project in timestamp order. The second migration copies the required email from Auth, creates profiles automatically for new users, backfills missing rows, and grants authenticated users RLS-limited access to read/create/update only their own profile.
4. Create/sign in the intended Google account in Hello World, then add its Supabase Auth user ID as a superadmin using the Supabase SQL Editor:

   ```sql
   select id, email from auth.users order by created_at desc;

   insert into public.superadmins (user_id)
   values ('<the-superadmin-auth-user-id>')
   on conflict (user_id) do nothing;
   ```

   Remove access by deleting that user's row from `public.superadmins`.
5. Use Node.js 22 or later, then run `npm install` and `npm run dev`.

The Hello World button, Google OAuth callback, protected admin routes, and comment mutations all check `public.superadmins` through the signed-in user's Supabase client. Row Level Security restricts users to checking only their own admin row; the migration also adds superadmin-only read policies for profiles, posts, and votes and a superadmin-only caption update policy. The app uses only the publishable key and does not bypass RLS with a service-role key.

For local development, run the admin app on port 3001 (for example, `npm run dev -- --port 3001`); Hello World links to `http://localhost:3001` by default. On Vercel, its Admin Panel link defaults to `https://coms-6998-admin-panel.vercel.app`. Set `ADMIN_PANEL_URL` to override the destination (for example, when using a custom domain).

The admin header includes a “Back to Hello World” button. It defaults to `http://localhost:3000` locally and `https://coms-6998-hello-world.vercel.app` on Vercel. Set `HELLO_WORLD_URL` to override the destination (for example, when using a custom domain).
