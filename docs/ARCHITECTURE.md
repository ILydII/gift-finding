# Architecture & how the work is split

This is a **scaffold**. The shared foundation (data model, auth, recommendation
engine, domain constants) is in place; each user-facing flow is a labelled stub
you can claim and build independently.

The source of truth for behaviour is the BRD:
[`docs/gift-app-BRD-v1_1.md`](gift-app-BRD-v1_1.md).

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Auth | Auth.js (NextAuth v5) — Credentials + Google, JWT sessions |
| ORM / DB | Prisma 7 + libSQL driver adapter, SQLite locally (Postgres-ready) |
| Validation | Zod |

## Shared foundation (build on top of this — coordinate before changing)

| Concern | File |
|---|---|
| Data model (all tables) | `prisma/schema.prisma` |
| Prisma client singleton | `src/lib/prisma.ts` |
| Auth config | `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts` |
| Domain constants (relationships, occasions, philosophies…) | `src/lib/constants.ts` |
| Recommendation engine (heuristic, pure) | `src/lib/recommendation.ts` |
| Interest taxonomy + demo seed | `prisma/seed.ts` |

## Screens ↔ BRD flows (claim one and build it)

| Route | BRD flow | Key FRs | File |
|---|---|---|---|
| `/` | Flow 1 — Giver's first action | FR-1 | `src/app/page.tsx` (done) |
| `/friends` | Friend list | FR-15 | `src/app/friends/page.tsx` (reads DB) |
| `/friends/new` | Flow 1–2 — add target + pre-invite contribution | FR-12, 17–19, 22 | `src/app/friends/new/page.tsx` (stub) |
| `/friends/[id]` | Flow 2 — contribute to a profile | FR-4, 17, 18, 20, 23 | `src/app/friends/[id]/page.tsx` (stub) |
| `/recommend/[receiverId]` | Flow 6 — request + results | FR-26–31 | `src/app/recommend/[receiverId]/page.tsx` (stub) |
| `/profile` | Personal info · interests · gifting style | FR-2/3, 7, 9, 24/25 | `src/app/profile/page.tsx` (stub) |
| `/signin` | Account creation | FR-1 | `src/app/signin/page.tsx` (stub) |
| `/invite/[token]` | Flow 3–4 — invite + Receiver onboarding | FR-13, 14, 20, 32 | `src/app/invite/[token]/page.tsx` (stub) |

Each stub renders a `SectionStub` (`src/components/Nav.tsx`, `SectionStub.tsx`)
listing its own TODOs. Delete the stub as you implement the real screen.

## Suggested split for two people

These two tracks barely touch the same files:

- **Track A — Giver contribution loop:** `/friends/new`, `/friends/[id]`,
  taxonomy tagging UI, notes/milestones. (BRD Flows 1–2, Section 8.4/8.5)
- **Track B — Receiver + recommendations:** `/signin`, `/invite/[token]`,
  `/profile`, `/recommend/[receiverId]` wiring to the engine. (BRD Flows 3–6,
  Section 8.6/8.7)

Whoever needs a new column or table edits `prisma/schema.prisma`, runs
`npm run db:migrate`, and commits the generated migration so the other person
gets it on pull. Announce schema changes — they're the one shared file.

## Conventions

- Server Components by default; add `"use client"` only where you need
  interactivity. Mutations go through Server Actions or route handlers.
- Import via the `@/` alias (e.g. `@/lib/prisma`). The generated Prisma client
  is imported from `@/generated/prisma/client`.
- Keep allowed string values (statuses, types) in `src/lib/constants.ts` so the
  UI, validation, and engine stay in sync (SQLite has no enums).
