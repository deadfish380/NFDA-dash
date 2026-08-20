# NFDA Social Dashboard

AI-assisted Facebook posting for non-profits. Reads an organization's websites, drafts posts with a store call-to-action, waits for approval, then publishes to Facebook automatically — one dashboard, multiple organizations.


Built on typed mock data so the client can see and click the real experience. Week 2 wires the database, website scraper, AI generation, and Meta Graph API behind the same types.

Screens:
- **Dashboard** — what needs review, what's scheduled, next post preview.
- **Post Queue** — review → edit → approve / reject, with a live Facebook preview.
- **Generate** — type an idea, get a ready-to-approve draft.
- **Organizations** — orgs & websites as data (add more anytime), Facebook connection status.
- **Settings** — posts-per-day, posting times, brand voice, review controls.
- **Grants** — reserved tab for a future phase.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
```

See `CLAUDE.md` for the design contract and architecture, and `.claude/skills/nfda-ui` for the UI playbook.
