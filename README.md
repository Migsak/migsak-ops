# Migsak Ops

Internal workspace for the Migsak team: people management, attendance, daily updates, tasks and GitHub activity, with live dashboards.

- **Members (employees and interns):** check in and out, post a daily update, work through assigned tasks, see their team and their own performance.
- **Admins:** add and edit people (role, team, timings, internship period, targets), assign and review tasks, and watch a live dashboard of hours, attendance, updates, tasks and commits.

Built with Next.js 15 (App Router), Supabase (Postgres, Auth, Realtime) and Recharts, deployed on Vercel.

## Setup

### 1. Supabase

Use a separate Supabase project from the careers site so the data and logins stay apart.

1. Create a project at supabase.com (region: Mumbai).
2. Open **SQL Editor**, paste the contents of `supabase/migrations/20261108000000_ops_core.sql` and run it. It is safe to run again.
3. Under **Authentication → Sign In / Providers → Email**, turn off **Allow new users to sign up**. Only admins create accounts.
4. Copy the project URL, the anon key and the service role key from **Project Settings → API**.

### 2. Vercel

Import the repository as a new Vercel project and add these environment variables:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `APP_TIMEZONE` | `Asia/Kolkata` |
| `GITHUB_TOKEN` | Fine-grained GitHub token, see below |
| `GITHUB_WEBHOOK_SECRET` | Any long random string |
| `CRON_SECRET` | Any long random string |

Then add the domain `ops.migsak.com` under **Settings → Domains** and create the CNAME record it asks for.

### 3. First admin account

In Supabase, go to **Authentication → Users → Add user → Create new user**, enter your email and a password, and tick **Auto Confirm User**. Then run this in the SQL Editor, with your email and name:

```sql
insert into profiles (id, email, full_name, app_role, member_type, job_title, must_change_password)
select id, email, 'Your Name', 'admin', 'employee', 'Founder', false
from auth.users where email = 'you@migsak.com';
```

Sign in at `/login`. From then on, add everyone else from **People → Add person**. The app creates their login and shows a temporary password to share privately; they set their own password on first sign-in.

Alternatively, with a local `.env.local`: `npm run create-admin -- you@migsak.com "Your Name"`.

### 4. GitHub commit tracking

1. Create a fine-grained personal access token (GitHub → Settings → Developer settings → Fine-grained tokens). Resource owner: **Migsak**. Repository access: the repositories to track. Permissions: **Contents: Read-only** and **Metadata: Read-only**. Put it in `GITHUB_TOKEN`.
2. In the app, open **Repositories**, add each repository (for example `Migsak/migsak-ops`) and press **Sync now** to load the last 90 days.
3. For live updates, add one webhook on the organisation: GitHub → Migsak → Settings → Webhooks → Add webhook. Payload URL `https://ops.migsak.com/api/webhooks/github`, content type `application/json`, secret = `GITHUB_WEBHOOK_SECRET`, events: **Just the push event**.
4. Add each person's GitHub username on their profile. Commits are linked to people by username.

A daily Vercel Cron job (`/api/cron/github-sync`) backfills anything a webhook delivery missed.

## How it works

- **Attendance** is a list of check-in sessions. Daily totals split sessions at midnight in `APP_TIMEZONE`, and a session left open for more than 16 hours is capped so a forgotten check-out does not distort the numbers.
- **Targets** are hours per day for weekdays and weekends, set per person. Days outside a person's start and end dates have no target.
- **Tasks** are created by admins. The assignee moves a task to *In progress* and then *In review* with a link to their work; only an admin can mark it *Done*.
- **Dashboards** refresh live through Supabase Realtime, with a periodic refresh as a fallback.
- Admins run the workspace and are not included in team metrics.

## Security

- Row level security is enabled on every table. Members can read their own data and their team's; admins can read everything.
- Members cannot write to `profiles` or `tasks` directly. Check-in, check-out and task updates go through `SECURITY DEFINER` functions that enforce the rules (one open session, only the assignee can update, only admins complete tasks).
- Admin-only notes live in a separate `person_notes` table that members can never read.
- The service role key is only used on the server, after an admin check, or by the webhook and cron routes, which verify their own secrets.
- Webhook payloads are verified with HMAC SHA-256 and constant-time comparison.

## Development

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev
```

Checks:

```bash
npm run typecheck
npm run lint
npm test                # unit tests (time, metrics, GitHub parsing, validation)
tests/sql/run.sh        # schema + RLS tests against a local Postgres (set PGHOST/PGPORT/PGUSER)
```

## Project structure

```
src/
  app/
    (app)/            signed-in pages: home, tasks, team, performance, profile
    (app)/admin/      admin dashboard, people, teams, tasks, repositories
    actions/          server actions (auth, member work, admin)
    api/              GitHub webhook, cron sync, health check
    login/            sign in
  components/         UI primitives, charts, work and admin components
  lib/                env, logging, Supabase clients, queries, metrics, time, GitHub
supabase/migrations/  database schema, policies and functions
tests/                unit tests and SQL tests
```
