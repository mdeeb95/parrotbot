# Parrot Worker

Long-running Node service that reads Twitch chat for every active channel in the database, runs the filter → batch → LLM → safety → post pipeline, and writes usage + answer rows back to Postgres.

## Setup

### 1. Bot Twitch account

Create a separate Twitch account for the bot (e.g. `parrotbot`). Generate a chat OAuth token at <https://twitchapps.com/tmi> while logged into that account. The token format is `oauth:xxxxxxxx`.

### 2. R2 bucket (optional)

Create a Cloudflare R2 bucket and an API token with read/write permissions. Without R2, the worker still writes JSONL audit logs to disk (`./data/jsonl/`); only the upload is skipped.

### 3. Local dev

From the repo root:

```bash
npm install                    # workspace install
npm run db:up                  # boots Postgres
npm run db:migrate             # apply migrations
cp .env.example .env           # fill in secrets
npm run dev:worker
```

The worker logs `connected to twitch as <bot>`, `health server listening on 3001`, and starts the 30s reconcile loop.

### 4. Production

```bash
npm --workspace worker run build
npm --workspace worker run start
```

### 5. Mod the bot

For the bot to post in a streamer's channel, the streamer must run `/mod parrotbot` once. The dashboard surfaces this; the worker trusts `channels.is_modded`.

## Twitch Verified Bot

Until the bot is verified, it's globally rate-limited to 20 messages / 30s and ~20 JOINs / 10s across all channels. Apply at <https://dev.twitch.tv/limit-increase> once you have real customers.

## Bot commands

Broadcaster or moderator only. Anything else is silently ignored.

- `!bot on` / `!bot off` — pause/resume posting (in-memory; resets on restart)
- `!bot stats` — replies with today's seen/kept/posted/blocked/tokens
- `!bot ban <user>` — ignore a user (in-memory)
- `!bot ignore <intent> [minutes]` — silence an intent for N min (default 5)
- `!bot set <fixed-path> <value>` — e.g. `!bot set bio "..."`. Allowed paths: `identity.name`, `identity.pronouns`, `bio`, `game`, `schedule`
- `!bot set field "<label>" <value>` — update a custom_fields entry by label
- `!bot set qa "<question>" <value>` — update a custom_qa entry by question
- `!bot set link "<label>" <url>` — update a links entry by label (add new links via the dashboard)

## Railway notes

- Service root directory: repo root (not `worker/`). The `@parrot/db` workspace dep won't resolve otherwise.
- Build: `npm install --workspaces --include-workspace-root && npm --workspace worker run build`
- Start: `npm --workspace worker run start`
- Mount a small persistent volume at `./data` for the JSONL staging files.
- Run migrations once before deploys via a separate "migrate" service: `npm install --workspaces --include-workspace-root && npm run db:migrate`.
