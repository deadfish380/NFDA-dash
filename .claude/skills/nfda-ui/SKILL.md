---
name: nfda-ui
description: Build or edit UI in the NFDA dashboard. Use whenever creating or changing any screen, component, layout, color, spacing, or animation — pages, dashboards, forms, tables, modals, badges, cards. Enforces the Linear/Vercel-grade design system (semantic tokens only, restrained lake-blue palette, Geist type, Framer Motion feedback) so output never looks AI-generated.
---

# nfda-ui

Read this before touching any pixel. It exists to make the UI look designed, not generated. The full contract is in the repo-root `CLAUDE.md`; this is the working playbook. (Ported from the Turf Takeoff system and reskinned lake-blue.)

## The look we're building
Linear / Vercel / Attio. Calm and monochrome-first, dense but breathable, brand blue used only for meaning. Confidence through restraint. If it looks colorful, busy, or "templated", stop and simplify.

## Rules that do the heavy lifting

1. **Semantic tokens only.** `bg-card text-foreground border-border text-muted-foreground bg-primary bg-accent bg-muted bg-warning bg-danger bg-brand-*`. Never raw hex, never `bg-sky-500`/`text-violet-600`/etc. If you need a color that isn't a token, add a token in `app/globals.css` — don't inline it.
2. **Neutral by default, brand blue as accent.** Backgrounds/surfaces are neutral. Blue = primary actions + positive/progress state. Never a full blue background wash.
3. **Three accent hues total:** brand blue, one amber (`warning`), one red (`danger`). Nothing else.
4. **Status = `<StatusBadge status=…/>` only.** Neutral pill + one dot. Never per-status pill backgrounds. Statuses live in `lib/post-status.ts`.
5. **Numbers use `tabular-nums`** and Geist Mono where it's a code/SKU/id.
6. **Spacing on the 4px grid.** One radius scale, one `shadow-sm`. Hierarchy via weight + muted text, not borders-on-everything.

## Motion (never ad-hoc)
- Import timing/variants from `lib/motion.ts` — one duration, one ease.
- `components/motion/reveal.tsx` → `<Reveal>`, `<Stagger>`, `<StaggerItem>` for entrances.
- `components/motion/animated-number.tsx` → `<AnimatedNumber>` for any figure that recalculates.
- `app/(app)/template.tsx` already gives route enter transitions — don't re-add per page.
- Motion is feedback only: enter, stagger, value-change, press/hover. No bounce, spin, parallax, or looping.

## Reuse before you build
Primitives live in `components/ui/*` (Button, Card, Badge, StatusBadge, StatCard, Input, Label, Select, Switch, Dialog) and `components/shell/*` (Sidebar, Topbar, OrgSwitcher, Placeholder). The Facebook post preview is `components/posts/post-preview.tsx`. Extend a variant there rather than styling a one-off in a page.

## Data lives in `lib/`
Organizations, websites, and posts are typed data in `lib/mock-data.ts` (Week 1) — the UI already speaks the shape the real DB/scraper/Meta API will fill in Week 2. Active-org state is `components/shell/org-context.tsx`. Keep orgs/sites data-driven: adding one is new data, never new code.

## Before you say it's done
- [ ] No raw colors — grep the diff for `#`, `bg-sky`, `bg-violet`, `bg-rose`, `text-blue`, etc. Zero hits.
- [ ] Only brand/amber/red accents appear; the rest is neutral.
- [ ] Status rendered via `<StatusBadge>`.
- [ ] Entrances use the motion primitives; animated figures use `<AnimatedNumber>`.
- [ ] Verified in the browser at **375px and desktop**, in **light and dark**.
- [ ] `npm run build` green.
