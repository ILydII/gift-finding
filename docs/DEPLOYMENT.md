# Deploying to Vercel (with Supabase Postgres)

This project deploys to **Vercel** with a **Supabase Postgres** database, using
the **Vercel CLI**. Steps marked 🧑 need you (login / secrets); the rest can be
run by anyone (or Claude Code) from the terminal.

## 1. Provision the database (Supabase) 🧑

1. Create a project at [supabase.com](https://supabase.com) (pick a strong DB
   password — you'll need it in the connection strings).
2. In the project: **Connect → ORMs → Prisma** (or **Connect → Connection
   string**). Copy two URLs:
   - **Pooled** (Transaction pooler, port **6543**) → this is `DATABASE_URL`.
   - **Direct** (port **5432**) → this is `DIRECT_URL`.
   Replace `[YOUR-PASSWORD]` in each with your DB password.

## 2. Create the schema in the database

Put the two URLs in your local `.env`, then apply the schema and seed:

```bash
npm run db:migrate      # first run creates prisma/migrations/ and applies it
npm run db:seed         # taxonomy + demo account (optional for prod)
```

Commit the generated `prisma/migrations/` folder so teammates and CI share it:

```bash
git add prisma/migrations && git commit -m "Add initial Postgres migration" && git push
```

> Use a **separate** Supabase project for production vs. local dev if you can,
> so development doesn't write to prod data. Each needs its own migrate run.

## 3. Install the Vercel CLI

```bash
npm i -g vercel
```

## 4. Log in and link the project 🧑

```bash
vercel login            # interactive — pick a method, confirm in the browser
vercel link             # link this folder to a Vercel project (create a new one)
```

## 5. Set environment variables 🧑

Add the same variables you have locally, for Production (repeat for `preview`
and `development` if you want deploy previews to work):

```bash
vercel env add DATABASE_URL production     # paste the POOLED (6543) URL
vercel env add DIRECT_URL production        # paste the DIRECT (5432) URL
vercel env add AUTH_SECRET production       # paste a secret (npx auth secret)
# Optional Google SSO:
vercel env add AUTH_GOOGLE_ID production
vercel env add AUTH_GOOGLE_SECRET production
```

(Each prompts for the value on stdin so secrets don't land in your shell
history. You can also set these in the Vercel dashboard → Project → Settings →
Environment Variables.)

## 6. Deploy

```bash
vercel            # build + deploy a preview URL
vercel --prod     # promote to the production domain
```

Vercel runs `npm install` (which triggers `postinstall: prisma generate`) then
`next build` automatically — no extra build config needed.

## 7. Migrations against production

Vercel does **not** run database migrations. When you add a migration, apply it
to the production database yourself:

```bash
# with prod DIRECT_URL available in your environment:
npm run db:deploy       # runs `prisma migrate deploy`
```

Or run it as a one-off with the prod URL:

```bash
DIRECT_URL="<prod-direct-url>" npm run db:deploy
```

## 8. Google OAuth for production (only if using Google SSO) 🧑

In the Google Cloud console, add your production callback to the authorized
redirect URIs:

```
https://<your-vercel-domain>/api/auth/callback/google
```

## Troubleshooting

- **`PrismaClient ... driver adapter is required`** — `DATABASE_URL` isn't set
  in the environment you're running in. Check `vercel env ls`.
- **Migrations hang or error on the pooled URL** — migrations must use
  `DIRECT_URL` (port 5432). `prisma.config.ts` already prefers it.
- **Auth callback / host errors in prod** — `trustHost: true` is set in
  `src/lib/auth.ts`; make sure `AUTH_SECRET` is present in Vercel env.
- **npm install-scripts warning on Vercel** — the packages needing scripts are
  pre-approved in `package.json` (`allowScripts`); a normal install works.
