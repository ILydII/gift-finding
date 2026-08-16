# 🎁 Gift Finder

A web app that helps people give better gifts by combining three signals:
**what the receiver wants**, **what their friends know about their interests**,
and **how the giver likes to give**. The product is entered through the
**Giver's** intent — *"I want to find a gift for someone"* — not through a
receiver building a wishlist.

This repo is the **V1 core-loop scaffold**. Full requirements live in
[`docs/gift-app-BRD-v1_1.md`](docs/gift-app-BRD-v1_1.md); how the code maps to
the BRD and how to split the work is in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Auth.js (NextAuth v5) · Prisma 7 (libSQL adapter) · SQLite locally
(Postgres-ready) · Zod.

## Prerequisites

- **Node.js 20+** (developed on Node 24) and **npm 11+**
- **Git**
- That's it — the database is a local SQLite file, no server to install.

## First-time setup

```bash
git clone https://github.com/ILydII/gift-finding.git
cd gift-finding
npm install
cp .env.example .env          # then set AUTH_SECRET (see below)
npx auth secret               # generates AUTH_SECRET and writes it to .env
npm run db:migrate            # creates the SQLite db and applies migrations
npm run db:seed               # loads the interest taxonomy + a demo account
npm run dev                   # http://localhost:3000
```

> On Windows PowerShell, replace `cp .env.example .env` with
> `Copy-Item .env.example .env`.

**Demo login:** `demo@example.com` / `password123` (created by the seed).

### A note on `npm install`

npm 11 blocks dependency install scripts by default. The ones this project needs
(`prisma`, `@prisma/engines`, `esbuild`, `unrs-resolver`) are **pre-approved in
`package.json` under `allowScripts`**, so a normal `npm install` just works. If
npm ever prints an "install scripts not yet covered" warning after adding a new
dependency, approve it with:

```bash
npm approve-scripts <package-name>
```

## Collaborator setup (get an identical environment)

Anyone joining the project runs the same **First-time setup** above. A few things
to know so everyone's machine matches:

- **`.env` is not committed** (it holds secrets). Copy `.env.example` and run
  `npx auth secret` locally. Each person has their own `AUTH_SECRET`; that's
  fine — it doesn't need to match across machines.
- **The database is local.** `dev.db` is gitignored. `npm run db:migrate` +
  `npm run db:seed` rebuilds it from the committed migrations and seed, so
  everyone starts from the same data.
- **After every `git pull`,** if `prisma/` changed run
  `npm install && npm run db:migrate` to pick up new dependencies and schema
  migrations. If only `package.json` changed, `npm install` is enough.
- **Schema changes** are the one shared file. Whoever edits
  `prisma/schema.prisma` runs `npm run db:migrate` and commits the generated
  folder under `prisma/migrations/`.

### Using Claude Code together

Both of us drive this with Claude Code, so the repo carries shared config to keep
setups aligned:

- **`CLAUDE.md`** / **`AGENTS.md`** — project instructions Claude Code loads
  automatically. Committed, so both of us get the same guidance.
- **Prisma skills (optional):** `npx prisma init` can install Prisma's official
  agent skills for working with Prisma 7 / driver adapters / migrations. They're
  not committed here (they install as machine-specific symlinks). Run
  `npx prisma` locally if you want them.

When your collaborator opens this project in Claude Code for the first time, tell
Claude Code to:

1. **Run the First-time setup** — `npm install`, copy `.env`, run `npx auth
   secret`, then `npm run db:migrate` and `npm run db:seed`. Claude Code can do
   all of this; just confirm it when it asks to run commands.
2. **Read `docs/ARCHITECTURE.md` and `docs/gift-app-BRD-v1_1.md`** so it has the
   BRD context and the code map before writing anything.
3. **Pick a track** from the "Suggested split" in `ARCHITECTURE.md` so the two
   of you don't edit the same files.
4. **Verify the app runs** with `npm run dev` and open http://localhost:3000.

If Claude Code hits the npm install-scripts warning, it should run
`npm approve-scripts <pkg>` (the common ones are already pre-approved in
`package.json`).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server (http://localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Create/apply migrations (dev) |
| `npm run db:seed` | Seed taxonomy + demo data |
| `npm run db:reset` | Drop, re-migrate, and re-seed the local db |
| `npm run db:studio` | Open Prisma Studio (visual db browser) |
| `npm run db:generate` | Regenerate the Prisma client |

## Project structure

```
prisma/
  schema.prisma        # data model (BRD Section 10 + auth + invites/taxonomy)
  seed.ts              # interest taxonomy + demo account
  migrations/          # committed migration history
src/
  app/                 # routes (one folder per BRD flow — see ARCHITECTURE.md)
  components/          # shared UI (Nav, SectionStub)
  lib/
    prisma.ts          # Prisma client (libSQL adapter) singleton
    auth.ts            # Auth.js config
    constants.ts       # domain constants (relationships, occasions, …)
    recommendation.ts  # V1 heuristic recommendation engine (pure)
  generated/prisma/    # generated Prisma client (gitignored)
docs/
  gift-app-BRD-v1_1.md # the BRD (source of truth)
  ARCHITECTURE.md      # code ↔ BRD map + how to split work
```

## Status

Foundation is built and runnable end-to-end (the `/friends` list reads real
seeded data). The user-facing flows are labelled stubs ready to implement — open
any route to see its BRD references and TODO checklist.
