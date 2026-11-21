# Deploying Parrot to Railway

One Postgres, two services (web + worker), one repo. ~15 minutes start to finish.

## Prereqs

- GitHub repo pushed (this directory)
- Twitch dev app registered → CLIENT_ID + CLIENT_SECRET
- Bot Twitch account: `parrotparrotbot` with OAuth chat token
- Anthropic API key

## 1. Postgres

1. Railway → **New Project** → **Provision Postgres**
2. Once provisioned, click the Postgres service → **Variables** tab → copy `DATABASE_URL`. You'll paste it as `DATABASE_URL` into the web + worker services.

## 2. Web service (the dashboard)

1. **+ New** → **GitHub Repo** → pick this repo.
2. Service settings:
   - **Root Directory**: `/` (repo root, not `web/`)
   - **Build Command**: `npm install --workspaces --include-workspace-root && npm --workspace web run build`
   - **Start Command**: `npm --workspace web run start`
   - **Watch Paths**: leave empty (default = redeploy on any change)
3. Variables (use Railway's "Reference" feature for `DATABASE_URL` to link to the Postgres service):
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   TWITCH_CLIENT_ID=<from dev.twitch.tv>
   TWITCH_CLIENT_SECRET=<from dev.twitch.tv>
   APP_URL=https://<service-public-domain>
   SESSION_SECRET=<run: openssl rand -base64 48>
   NODE_ENV=production
   ```
4. **Networking → Generate Domain** to get a `*.up.railway.app` URL. Copy it.
5. Update `APP_URL` env to that URL (re-deploy will trigger).
6. Go back to <https://dev.twitch.tv/console/apps>, edit your Parrot app, **add `https://<that-url>/api/auth/callback/twitch` as an additional OAuth Redirect URL**.

## 3. Worker service

1. Same project → **+ New** → **GitHub Repo** → same repo.
2. Service settings:
   - **Root Directory**: `/`
   - **Build Command**: `npm install --workspaces --include-workspace-root && npm --workspace worker run build`
   - **Start Command**: `npm --workspace worker run start`
3. Variables:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ANTHROPIC_API_KEY=<rotate first!>
   MODEL=claude-haiku-4-5-20251001
   BOT_USERNAME=parrotparrotbot
   BOT_OAUTH=oauth:<token>
   BATCH_WINDOW_MS=30000
   BATCH_MAX_SIZE=10
   CONFIDENCE_THRESHOLD=0.8
   DAILY_TOKEN_CAP_PER_CHANNEL=200000
   INTENT_COOLDOWN_MIN=15
   AUTHOR_RATE_LIMIT_SEC=60
   INJECTION_STRIKE_LIMIT=3
   PORT=3001
   LOG_LEVEL=info
   DATA_DIR=/app/data
   NODE_ENV=production
   ```
   Notes:
   - **Do NOT set `ALLOWED_POST_CHANNELS`** in production — that was a dev-only safety net.
   - `INTENT_COOLDOWN_MIN=15` is conservative for the pre-Verified-Bot global rate limit. Lower later.
   - Skipping R2 envs is fine for v1 — JSONL writes to disk only. Add when you want durable audit logs.
4. **Settings → Volumes** → **+ Add Volume**:
   - **Mount Path**: `/app/data`
   - **Size**: 1 GB (plenty for v1)
   - This persists JSONL logs across worker restarts.
5. **Networking** → enable **Health Check Path: `/health`** and **Port: 3001**. Railway will mark the service unhealthy if the worker can't reach Twitch or Postgres.

## 4. Migrations

Railway doesn't run migrations automatically. Easiest way to apply once:

Run from your laptop, pointed at the production DB:
```bash
DATABASE_URL='<paste-the-railway-postgres-url>' npm run db:migrate
```

If you want this automated for future schema changes, add a third service:
- **Build Command**: `npm install --workspaces --include-workspace-root`
- **Start Command**: `npm run db:migrate && exit 0`
- This will run on every deploy and exit (Railway will mark it crashed; ignore that).

Or just remember to run `db:migrate` manually after pushing schema changes.

## 5. Smoke test

1. Visit `https://<web-domain>/`. Land on the marketing page.
2. Click sign in → Twitch OAuth → redirect back → should land on `/dashboard`.
3. Toggle channel **on**.
4. In your Twitch chat: `/mod parrotparrotbot`. Click **I've done this** in the dashboard.
5. From a different Twitch account, post `linkedin?` (or any KB-covered question) in your chat.
6. Within 30s, the bot should reply.

If step 5 fails:
- Worker logs: Railway → worker service → **Deployments** → latest → **View Logs**. Search for `irc message received`. If absent, IRC didn't subscribe.
- DB: in Railway's Postgres "Data" tab, `SELECT id, twitch_channel, is_active, is_modded FROM channels`.
- Health: `curl https://<worker-domain>/health` (you'd need to expose it; or check from Railway's metrics).

## 6. Twitch verified bot (apply now)

Until your bot is verified, you're capped at ~20 msgs / 30s globally across all channels.
Apply: <https://dev.twitch.tv/limit-increase>. 1-3 weeks to approve. Apply BEFORE you have many users so you're ready when you do.

## Rolling back

Railway keeps the last few deploys. If the latest is broken: service → **Deployments** → find the last green one → **Redeploy**.

## Costs (v1)

- Postgres: free tier (covered by Railway's monthly $5 credit)
- Web + worker: ~$5-10/month combined for low traffic
- Anthropic: pay-as-you-go. Haiku is cheap. With one large (10k+ viewer) channel: <$2/day.

Total: ~$15-25/month for the soft launch.
