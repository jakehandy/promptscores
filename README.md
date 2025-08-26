Prompt Scores
=============

React + Vite + Supabase app to explore, vote, and submit prompts. Designed for deployment on Cloudflare Pages with Supabase for auth and database.

Quick Start (local)
-------------------

- Requirements: Node 18+, npm or pnpm, a Supabase project.
- Copy `.env.example` to `.env` and fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project settings.
- In Supabase SQL editor, run the contents of `supabase/schema.sql` to create tables, RLS policies, and the `prompts_with_counts` view.
- Install deps and run dev:
  - PowerShell: `npm install` then `npm run dev`
  - Open `http://localhost:5173`

Cloudflare Pages Deploy
-----------------------

- Create a new Pages project and connect this repo, or upload.
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variables (Project > Settings > Environment Variables):
  - `VITE_SUPABASE_URL` = your Supabase URL
  - `VITE_SUPABASE_ANON_KEY` = your anon key
- Add a `_redirects` file (already included in `public/_redirects`) for SPA routing.

Supabase Setup
--------------

- Run `supabase/schema.sql` in the SQL editor.
- Auth settings: enable Email (password) provider.
- RLS policies allow:
  - Anyone to read prompts and votes
  - Authenticated users to insert prompts and their own votes
  - Owners to update/delete their prompts

Features
--------

- Explore page: search (Fuse.js), filter by Type, vote sorting.
- Submit Prompt modal: title, type (pre-listed), body, and tags.
- Auth: email/password sign-in, account view, sign-out.
- Votes: toggle thumbs up; remove to unvote.

Notes
-----

- Search is client-side fuzzy and best for modest datasets. For large datasets, consider Postgres full-text search or pg_trgm.
- Types are stored as text; the UI constrains to a curated set. You can refactor to an enum/table if needed.

