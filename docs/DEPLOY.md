# Deploying to Vercel

The app is serverless-ready: Supabase transaction pooler, a cached single DB connection per instance, origin-derived Facebook redirect (works on any domain), and a daily cron.

## 1. Push to GitHub
Commit the repo and push it to a GitHub repository.

## 2. Import into Vercel
Vercel → Add New → Project → import the repo. Framework autodetects as **Next.js**. No build settings to change (`next build`).

## 3. Set Environment Variables (Project → Settings → Environment Variables)

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase **Transaction pooler** string (Supabase → Connect → Transaction pooler). IPv4, works on serverless. |
| `OPENAI_API_KEY` | Your OpenAI key |
| `OPENAI_MODEL` | `gpt-4o` (optional) |
| `META_APP_ID` | `2664298337373462` |
| `META_APP_SECRET` | From the Meta app (App settings → Basic) |
| `META_CONFIG_ID` | Only if using a Business Login configuration |
| `FACEBOOK_DRY_RUN` | `true` — keep simulated until go-live |
| `CRON_SECRET` | Any random string (protects the cron endpoint) |

> Do **not** set a Facebook redirect URL — the app derives it from the request origin.

## 4. Point Facebook at the deployed domain
In the Meta app → Facebook Login → **Valid OAuth Redirect URIs**, add:
```
https://<your-vercel-domain>/api/facebook/callback
```

## 5. Database schema
The Supabase schema is already applied. For a fresh database, run once locally with `DATABASE_URL` set to the pooler string:
```bash
npm run db:push
npm run db:seed     # optional: sample orgs + posts
```

## 6. Deploy
Vercel builds and deploys. The daily scrape cron (`vercel.json`) runs at 06:00 UTC and hits `/api/cron/scrape`.

## Go-live (later)
1. Resolve the Meta app's page-posting permission (App Review or a Business Login config).
2. Connect the **real** NFDA page in the dashboard.
3. Set `FACEBOOK_DRY_RUN=false` in Vercel and redeploy.
Until then, everything runs safely in simulated mode.
