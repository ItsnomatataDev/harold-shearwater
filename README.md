# Shearwater AI Operations Platform

The multi-company operations platform for Shearwater Victoria Falls. The repository currently contains the Next.js foundation and Team Access Basecamp. Agent and Customer Access are intentionally not implemented yet.

## Stack

- Next.js App Router, React and TypeScript
- TailwindCSS
- Supabase Auth, PostgreSQL, Storage and Realtime
- Zod validation
- Vitest and Playwright

## Local setup

1. Copy `.env.example` to `.env.local` and add the Supabase project values.
2. Run `npm install`.
3. Run `npm run dev`.

## First Team administrator

1. Create and confirm the first account through `/auth`.
2. Add `SUPABASE_SECRET_KEY` to `.env` locally. Never expose it in browser code or commit it.
3. Run `npm run bootstrap:admin -- you@example.com` once.
4. Remove the secret from the local file if it is no longer required.

## Frontend account creation during build

Use `/auth` while in **Create your account** mode.

1. Enter first name, last name, email and password.
2. Choose **Portal access** as `Customer`, `Agent`, or `Team`.
3. Submit and confirm the email.
4. Sign in and continue.

Notes:

- This is a build-stage convenience flow so you can test all portal routes quickly.
- Team signup auto-assigns Team Member role in the seeded Shearwater organization.
- For production, Team and Agent users should be invited/managed by admins.

## Additional Team members (non-admin)

1. Ask the user to create and confirm their account through `/auth`.
2. Ensure `SUPABASE_SECRET_KEY` is present in `.env` locally.
3. Run `npm run bootstrap:team-member -- person@example.com`.
4. The user can then sign in and will be routed into Team Access with Team Member role.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
