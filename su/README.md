# Drnote

React + Vite app using Clerk for auth, Supabase for per-user study-item persistence, and a Cloudflare Pages Function for the AI study assistant.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add Clerk, Supabase, and Anthropic values.
3. Run `npm install`.
4. Run `npm run dev`.

## Supabase setup

Run `supabase/schema.sql` in the target Supabase project. The schema uses Clerk's third-party auth JWT subject (`auth.jwt()->>'sub'`) as the user id, so enable Clerk as a Supabase third-party auth provider before relying on RLS.

## Cloudflare Pages

Build command: `npm run build`

Build output directory: `dist`

Required environment variables:

- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `ANTHROPIC_API_KEY`
