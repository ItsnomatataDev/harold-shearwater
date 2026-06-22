# Shearwater Victoria Falls — Operations Platform

Internal operations platform for Shearwater Victoria Falls. Provides a unified identity layer with role-based access across three distinct portals: **Team Access**, **Agent Access**, and **Customer Access**. A standalone **Admin Portal** gives administrators full platform control independently of any single portal.

---

## Tech Stack

| Layer        | Technology                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| Framework    | [Next.js 16](https://nextjs.org) — App Router, Server Components, Server Actions                     |
| Language     | [TypeScript 6](https://www.typescriptlang.org) — strict mode, ESM                                    |
| UI           | [React 19](https://react.dev)                                                                        |
| Styling      | [Tailwind CSS v4](https://tailwindcss.com) with PostCSS                                              |
| Icons        | [Lucide React](https://lucide.dev) via custom `Icon` component                                       |
| Images       | `next/image`                                                                                         |
| Database     | [PostgreSQL 17](https://www.postgresql.org) via Supabase                                             |
| Auth         | [Supabase Auth](https://supabase.com/docs/guides/auth) — email/password, magic link                  |
| ORM / Client | [@supabase/ssr](https://supabase.com/docs/guides/auth/server-side/nextjs) — SSR-safe Supabase client |
| Validation   | [Zod v4](https://zod.dev) — server action input validation                                           |
| Unit tests   | [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com)                        |
| E2E tests    | [Playwright](https://playwright.dev)                                                                 |
| Linting      | [ESLint 9](https://eslint.org) with `eslint-config-next`                                             |
| Local DB     | [Supabase CLI](https://supabase.com/docs/guides/cli) — local Postgres + Auth emulation               |

---

## Project Structure

```
src/
├── app/                   # Next.js App Router pages and layouts
│   ├── admin/             # Admin Portal routes (/admin/*)
│   │   ├── dashboard/
│   │   ├── attendance/
│   │   ├── staff/
│   │   └── team-access/   # Compatibility redirect → /admin/staff
│   ├── team/              # Team Access routes (/team/*)
│   │   ├── dashboard/
│   │   ├── attendance/
│   │   ├── schedules/
│   │   └── ...
│   └── auth/              # Auth routes (login, callback, password reset)
├── features/              # Domain modules (co-located service + actions + components)
│   ├── admin/             # Admin Portal services (dashboard, attendance register)
│   ├── auth/              # Auth context, guards, forms
│   ├── basecamp/          # Team dashboard page and actions
│   ├── team/              # Team portal modules
│   │   ├── attendance/
│   │   ├── crew/          # Staff + role management
│   │   ├── harold/        # Harold AI (inactive)
│   │   ├── knowledge/
│   │   ├── operations/
│   │   └── settings/
│   └── ...
├── layouts/               # Shell layouts
│   ├── AppShell.tsx       # Team Access shell with sidebar nav
│   └── AdminShell.tsx     # Admin Portal shell with separate nav
├── lib/
│   └── supabase/          # Supabase client factories (server + browser)
├── components/            # Shared UI components (Icon, SectionHeader, forms, cards)
├── types/                 # Generated Supabase database types + domain types
└── proxy.ts               # Next.js Middleware — route protection + auth validation
supabase/
├── config.toml            # Local Supabase project config
├── seed.sql               # Dev seed (commented out by default)
└── migrations/            # Sequential SQL migrations
scripts/
├── bootstrap-team-admin.mjs      # One-time admin role grant script
└── bootstrap-team-member.mjs     # One-time team member provisioning script
```

---

## Access Portals

| Portal          | Route       | Access type         | Who uses it                              |
| --------------- | ----------- | ------------------- | ---------------------------------------- |
| Team Access     | `/team/*`   | `team`              | Internal Shearwater staff                |
| Agent Access    | `/agent`    | `agent`             | External activity agents (not yet built) |
| Customer Access | `/customer` | `customer`          | Guests and travellers (not yet built)    |
| Admin Portal    | `/admin/*`  | `team` + admin role | Platform administrators                  |

Each user has one identity. Memberships and roles determine which portal(s) they can access.

---

## Database

PostgreSQL 17 managed by Supabase. Row Level Security (RLS) is enabled on every table.

Key tables:

| Table                                        | Purpose                                                    |
| -------------------------------------------- | ---------------------------------------------------------- |
| `profiles`                                   | User display info (name, job title, avatar)                |
| `organizations`                              | Tenants (Shearwater Victoria Falls is the seed org)        |
| `access_memberships`                         | Links users to orgs with a specific access type and status |
| `roles` / `permissions` / `role_permissions` | RBAC definition                                            |
| `membership_roles`                           | Assigns roles to memberships                               |
| `invitations`                                | Pending member invitations with expiry tokens              |
| `attendance_entries`                         | Clock-in/out records                                       |
| `audit_logs`                                 | Immutable admin action log                                 |
| `announcements` / `tasks` / `meetings`       | Operational modules                                        |

Security functions:

- `private.has_permission(org_id, permission_key)` — RLS-safe permission resolver
- `private.is_org_member(org_id)` — org membership guard
- `public.assign_role_to_member(...)` — security-definer RPC for safe role assignment

---

## Environment Variables

| Variable                               | Required     | Description                                     |
| -------------------------------------- | ------------ | ----------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Yes          | Supabase project URL                            |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes          | Supabase anon/publishable key                   |
| `SUPABASE_SERVICE_ROLE_KEY`            | Scripts only | Service role key — never expose in browser code |

Copy `.env.example` to `.env` and fill in the values before running the app.

---

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

# 3. Start the dev server
npm run dev
```

App runs at `http://localhost:3000`.

---

## Bootstrapping Admin Access

The admin role must be granted manually once a user account exists in Supabase Auth.

```bash
# 1. Create an account at /auth first
# 2. Add SUPABASE_SERVICE_ROLE_KEY to .env (server-only, never commit)
npm run bootstrap:admin -- you@example.com
# 3. Sign in normally at /auth — you will land on /team/dashboard
#    Navigate to /admin/dashboard to access the Admin Portal
```

## Bootstrapping a Team Member

```bash
# 1. User creates account at /auth
npm run bootstrap:team-member -- person@example.com
```

---

## Available Scripts

| Script                          | Description                                    |
| ------------------------------- | ---------------------------------------------- |
| `npm run dev`                   | Start Next.js development server               |
| `npm run build`                 | Production build                               |
| `npm run start`                 | Start production server                        |
| `npm run typecheck`             | TypeScript check (no emit)                     |
| `npm run lint`                  | ESLint                                         |
| `npm run test`                  | Vitest unit tests                              |
| `npm run test:watch`            | Vitest in watch mode                           |
| `npm run test:e2e`              | Playwright end-to-end tests                    |
| `npm run bootstrap:admin`       | Grant Team Admin role to an existing user      |
| `npm run bootstrap:team-member` | Provision Team Member role to an existing user |

---

## Migrations

Database migrations live in `supabase/migrations/` and are applied in filename order. To apply against a local Supabase instance:

```bash
supabase db reset       # reset + replay all migrations
supabase migration up   # apply new migrations only
```

---

## Notes

- Agent Access and Customer Access portals are reserved — routes exist but pages are not built yet.
- Harold AI integration is intentionally disabled pending a governed knowledge layer.
- The `private` schema functions are not callable directly from the browser — they are used only inside RLS policies and security-definer RPCs.
- All server actions validate input with Zod before any DB write.
