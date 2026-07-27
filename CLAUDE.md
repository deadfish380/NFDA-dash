# NFDA Social Dashboard

One dashboard that reads an organization's websites, uses AI to write Facebook posts (with a store CTA), lets the client approve them, and posts them automatically — for multiple organizations from a single login.

## Client context
- **NFDA (National Fish Decoy Association)** — sites `nfdadecoys.org`, `perhamshow.com`. Facebook page was hacked/deleted; rebuilding from zero.
- **Longview Conservation** — site `longviewconservation.org`.
- Two organizations, three websites. Built so more orgs/sites are added as **data**, never new code.
- Scope now: post generation + review + Meta posting. **Grants is a future, separate phase** — the tab exists as a reserved slot only.

## Stack
Next.js 15 (App Router) · React 19 · Tailwind v4 (CSS-variable tokens) · Geist · Radix Dialog · Framer Motion (`motion`) · lucide-react. Backend: Drizzle ORM + Postgres · cheerio (scraper) · `@anthropic-ai/sdk` (generation). Standalone app, no monorepo.

Week 1 = UI on typed mock data (`lib/mock-data.ts`). Week 2 = real DB + scraper + Claude generation + Meta Graph API behind the same types. Backend modules exist and are verified end-to-end; the UI still reads mock data until the data-access layer is swapped in.

## Backend (Week 2)
- `lib/db/schema.ts` — Drizzle tables: `organizations`, `websites`, `content_items`, `posts`. Everything keyed by `org_id`; orgs/sites are data.
- `lib/db/index.ts` — client from `DATABASE_URL` (defaults to local Docker on **port 5434** — 5432 is taken by a native Postgres). Same schema runs on Supabase in prod; only the URL changes.
- `lib/scrape/` — `scrape.ts` (pure page extraction), `run.ts` (reads sites, stores content, marks connected). This is the future 6am job.
- `lib/ai/generate.ts` — Claude (`claude-sonnet-5`) grounded in scraped content; safe stub when `ANTHROPIC_API_KEY` is unset so the app runs without a key.
- Secrets: `.env.local` (gitignored). See `.env.example`.

## Design contract (enforced — see `.claude/skills/nfda-ui`)
- **Semantic tokens only.** `bg-card text-foreground border-border text-muted-foreground bg-primary bg-accent bg-muted bg-warning bg-danger bg-brand-*`. Never raw hex or `bg-blue-500`. New colors become tokens in `app/globals.css`.
- **Neutral by default; lake-blue brand for meaning only.** Three accent hues total: brand blue, amber (`warning`), red (`danger`).
- **Status via `<StatusBadge>`** (neutral pill + one dot). Statuses in `lib/post-status.ts`.
- **Motion from `lib/motion.ts`** only — one duration, one ease; feedback, never decoration. Use `<Reveal>/<Stagger>` for entrances.
- **4px spacing grid**, one radius scale, one `shadow-sm`. Hierarchy from weight + muted text, not borders everywhere.
- `tabular-nums` on numbers.
- Theme-aware (light/dark) and responsive (verify at 375px + desktop).

## Layout
- `app/(app)/*` — shell + pages (Dashboard, Post Queue, Generate, Organizations, Settings, Grants).
- `components/ui/*` — primitives. `components/shell/*` — sidebar, topbar, org switcher. `components/posts/*` — post preview + queue. `components/motion/*` — motion primitives.
- `lib/` — `utils.ts`, `motion.ts`, `post-status.ts`, `mock-data.ts`.

## Build & run
```bash
npm run dev        # localhost:3000
npm run build      # must be green before commit (Node 24 WasmHash crash is transient — just retry)
npm run typecheck

# Data pipeline (local)
npm run db:up      # start Docker Postgres (host port 5434)
npm run db:push    # apply schema
npm run db:seed    # load NFDA/Longview orgs + sample posts
npm run scrape     # pull live content from every org's websites
```

## Rules
- Read a file before editing it. Keep files focused. Reuse a primitive before styling a one-off.
- Never hardcode an org/site into components — it's data.
- Never commit secrets or `.env`.
