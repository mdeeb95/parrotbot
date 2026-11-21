# Parrot — Streamer Q&A Bot

Reads each active streamer's Twitch chat, filters for recurring logistical
questions, asks Claude what to answer using a streamer-supplied knowledge base,
and posts grounded answers back to chat.

## Layout

This repo is an npm workspace with three packages:

- `web/` — Hono server + static HTML dashboard. Streamers sign in via Twitch, edit their KB,
  toggle the bot on/off, and view activity.
- `worker/` — Long-running Node service. Connects to Twitch as a pooled bot
  account (`@parrotbot`), joins every active channel, runs the pipeline, and
  writes results to Postgres + R2.
- `packages/db/` — Shared Drizzle schema, DB client, and zod validators. Both
  `web` and `worker` import from `@parrot/db`.

## Setup

```bash
npm install                    # workspace install
cp .env.example .env           # fill in secrets
npm run db:up                  # local Postgres via docker
npm run db:migrate
npm run dev:web:server         # dashboard at http://localhost:3000
npm run dev:web:css            # Tailwind watcher (separate terminal)
npm run dev:worker             # worker (requires BOT_OAUTH + ANTHROPIC_API_KEY)
```

See `worker/README.md` for bot account setup, R2 configuration, and Railway
deploy notes.

## Scripts (root)

| Script | Effect |
| --- | --- |
| `npm run dev:web:server` | Run the dashboard server in dev mode (tsx watch) |
| `npm run dev:web:css` | Rebuild dashboard CSS on change (Tailwind watch) |
| `npm run dev:worker` | Run the worker in dev mode (tsx watch) |
| `npm run build` | Build both web and worker |
| `npm run db:up` / `db:down` / `db:reset` | Local Postgres via Docker |
| `npm run db:generate` | Generate a new Drizzle migration |
| `npm run db:migrate` | Apply pending migrations |
