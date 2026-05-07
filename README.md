# Beer Mile Bets

A live, mobile-first prediction market for the Beer Mile event.

- See [SPEC.md](SPEC.md) for the product spec.
- See [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md) for the architecture.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 (no config file — CSS-based theme)
- Supabase (Postgres + Realtime) — free tier
- iron-session for cookie-based auth
- bcryptjs for PIN hashing
- React Query for client cache + Supabase Realtime for live odds
- Deployed on Vercel — free tier

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in values from your Supabase project (see Setup below).
3. Run the dev server:
   ```bash
   npm run dev
   ```

## Setup — Supabase

1. Sign up at [supabase.com](https://supabase.com) and create a new project named `beer-mile-bets`. Save the DB password somewhere safe; we won't need it again.
2. From **Project Settings → API**, copy three values into `.env.local`:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY` (treat like a password — never expose to the browser)
3. In the **SQL Editor**, run the migrations in order:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_seed_event_and_categories.sql`
   - `supabase/migrations/0003_betting_functions.sql`
4. Capture the seeded event id and put it in `.env.local`:
   ```sql
   SELECT id FROM events;
   ```
   → set `NEXT_PUBLIC_EVENT_ID`.
5. Enable Realtime on the `markets` table. The schema migration already runs `ALTER PUBLICATION supabase_realtime ADD TABLE markets;`, so this should be on automatically. To verify: **Database → Replication** → confirm `markets` is enabled.
6. Generate a session secret and add it to `.env.local`:
   ```bash
   openssl rand -base64 32
   ```
   → paste into `SESSION_SECRET`.

## Setup — Vercel

1. Push this repo to GitHub.
2. On [vercel.com](https://vercel.com), click **Add New → Project** and import the repo.
3. Before clicking Deploy, expand **Environment Variables** and paste in all five from `.env.example`.
4. Click **Deploy**. Vercel will give you a URL like `beer-mile-bets.vercel.app`. Open it on a phone and check it works.
5. Register your own account (first name, last initial, 4-digit PIN). Then promote yourself to admin in the Supabase SQL editor:
   ```sql
   UPDATE users SET role = 'admin' WHERE first_name = 'Katherine' AND last_initial = 'W';
   ```
6. Optional: configure a custom domain under **Project Settings → Domains** (free).

## Pre-event checklist (run a week before the race)

- Visit the deployed app once a day to keep Supabase from auto-pausing the free project.
- Pre-create the official starter markets while logged in as admin (see `SPEC.md` for default categories).
- Have a teammate test the full flow end-to-end on a non-admin account.
- On race day, hit **Lock all open markets** in the admin dashboard right when the runners start.
- After the last market is resolved, flip event status to `completed` from the admin dashboard. The leaderboard page will switch to "Final Results".

## Post-event shutdown

The Supabase free tier auto-pauses after 7 days of inactivity, which is fine. If you want to wind it down explicitly:

1. Pause the project in Supabase (**Project Settings → General → Pause project**).
2. Delete the Vercel project (**Settings → Delete Project**) — your domain stays bookable.
