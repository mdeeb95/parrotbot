# Parrot — Landing + Auth + Dashboard

Public marketing site, Twitch OAuth, and the streamer dashboard. Next.js App Router + Tailwind + Drizzle/Postgres.

## Local dev

1. Create a Twitch developer app at https://dev.twitch.tv/console.
2. Add `http://localhost:3000/api/auth/callback/twitch` as an OAuth Redirect URL.
3. Copy `.env.example` to `.env`. Fill in:
   - `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` from your Twitch app
   - `APP_URL=http://localhost:3000`
   - `SESSION_SECRET` — any random 32+ char string (e.g. `openssl rand -base64 32`)
   - `DATABASE_URL` — leave the default if using Docker
4. `npm install`
5. `npm run db:up` — start local Postgres in Docker
6. `npm run db:migrate` — apply the schema
7. `npm run dev` — open http://localhost:3000

## Deploy to Railway

1. Push this repo to GitHub.
2. Create a new Railway project from the GitHub repo (Railway auto-detects Next.js).
3. Add a Postgres database to the project. Railway provides a `DATABASE_URL` reference variable — wire it into the web service's `DATABASE_URL`.
4. Set the other env vars (`TWITCH_*`, `APP_URL`, `SESSION_SECRET`).
5. Add `https://<APP_URL>/api/auth/callback/twitch` as a second OAuth Redirect URL on your Twitch app.
6. After first deploy, run `npm run db:migrate` against the Railway Postgres (or wire it into a deploy step).

## Scripts

- `npm run dev` — local dev server
- `npm run build && npm start` — production build & serve
- `npm run db:up` / `db:down` / `db:reset` — local Postgres in Docker
- `npm run db:generate` — generate a migration after editing `lib/db/schema.ts`
- `npm run db:migrate` — apply pending migrations
