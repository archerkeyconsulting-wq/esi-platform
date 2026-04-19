# NARO v2 — Portfolio Operational Intelligence

A PE operating-partner platform that detects pre-financial operational risk across industrial and manufacturing portfolio companies using deterministic signal scoring (ORS-LITE).

Layer 3 in the PE stack. iLEVEL/Chronograph handle financial monitoring. Maestro handles initiative tracking. NARO detects the operational conditions that form **before** they appear in either.

---

## Stack

- Next.js 14 (App Router) + TypeScript
- TailwindCSS with institutional design tokens
- Supabase — Postgres + Auth + Row Level Security
- `@supabase/ssr` for auth in middleware and server components
- Fonts: Fraunces, DM Sans, JetBrains Mono (via `next/font/google`)
- Deployment: Vercel

---

## Getting started

### 1. Install

```bash
npm install
```

### 2. Environment

Copy `.env.example` to `.env.local` and fill with your Supabase project values.

```bash
cp .env.example .env.local
```

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — used by the upload server action to bypass RLS on write paths after verifying the caller

`ANTHROPIC_API_KEY` is unused in the MVP (Phase 2 feature).

### 3. Apply database schema

Open the Supabase project SQL editor and run, in order:

1. `supabase/migrations/0001_init.sql` — creates tables, RLS policies, and the `documents` storage bucket
2. `supabase/seed.sql` — seeds Archer Ridge Capital + Trident/Vector/Atlas with 21 signals across 3 assessments

### 4. Create the super_admin

In Supabase dashboard → Authentication → Users → Add user. Create a user with your email and a strong password. Copy the UUID.

Then in the SQL editor:

```sql
insert into profiles (id, firm_id, full_name, role) values
  ('PASTE-YOUR-AUTH-UUID', null, 'Your Name', 'super_admin');
```

### 5. Create a pilot operating partner (optional)

In Supabase Auth, create another user. Copy the UUID. Then:

```sql
insert into profiles (id, firm_id, full_name, role) values
  ('PASTE-THEIR-AUTH-UUID',
   '00000000-0000-0000-0000-000000000001',
   'Pilot Operating Partner',
   'operating_partner');
```

### 6. Run

```bash
npm run dev
```

Visit `http://localhost:3000`.

---

## Routes

| Route | Who | Purpose |
|---|---|---|
| `/` | public | Marketing stub with Sign In CTA |
| `/login` | public | Email/password login |
| `/error?reason=...` | public | Auth error page |
| `/dashboard` | op. partner, gp, super_admin | Portfolio overview table |
| `/company/[slug]` | op. partner, super_admin | Command view with ORS, drivers, signal cards |
| `/company/[slug]/upload` | op. partner, super_admin | CSV + document upload |
| `/company/[slug]/export` | op. partner, super_admin | Board-prep print brief |
| `/settings` | any authenticated | User profile |
| `/admin` | super_admin only | Firm + user + company management |

---

## ORS-LITE scoring model

7 signals across 3 categories. Each signal has severity `none | mild | moderate | severe` worth 0, 5, 10, or 15 points. Category maxes: Operational Stability 40, Systems Reliability 30, Organizational Capacity 30 (total 45 raw pts, where Quality Drift caps at 10). Normalized to 0–100.

```
0–30   Healthy
31–60  Moderate
61–80  Elevated
81–100 Critical
```

The scoring engine lives at `lib/scoring/ors-lite.ts`. It is deterministic — no ML, no AI. The AI layer only generates board narrative text (Phase 2).

Verify the engine against seed inputs:

```bash
npm run verify-scoring
```

Engine output (category-weighted normalization): Trident 70 Elevated, Vector 40 Moderate, Atlas 15 Healthy. The seeded `assessments.risk_score` values (72 / 44 / 28) are historical display rows — CSV uploads always write the engine-computed score.

---

## Legacy v1

The previous NARO MVP (Execution Intelligence) lives under `/legacy-v1/` for reference. It is not wired into the build.

---

## What is not in this MVP

Per the v2 PRD: no real AI document extraction, no ERP integrations, no portco self-reporting portal, no email/Slack alerts, no ML, no LP reporting, no mobile layout, no payment integration, no cross-portfolio benchmarking. Document upload accepts files and shows "Processing — results pending". Board narrative renders a "Narrative generation coming soon" placeholder.
