# Pablo Codebase Audit

Date: 2026-04-11

## Executive Summary

The repository does not contain a working Pablo application yet. The tracked codebase currently consists of a single `README.md` file and no Next.js app, no React components, no API routes, no database schema, no migrations, and no deployment config files. The PostgreSQL database exists but is empty. The Vercel project has a `DATABASE_URL` environment variable configured, but the live URL is still serving the NanoCorp "Coming Soon" placeholder rather than a deployed Pablo app.

## Repo Structure

Tracked files in Git:

```text
README.md
```

Observed repo state:

- Branch: `main`
- Remote: `git@github.com:nanocorp-hq/pablo.git`
- Commit history: one commit (`Initial commit`)
- No `package.json`
- No `app/`, `pages/`, `components/`, `lib/`, `prisma/`, `drizzle/`, `db/`, or `docs/` directories before this audit
- No `next.config.*`, `tsconfig.json`, `tailwind.config.*`, `postcss.config.*`, `vercel.json`, `.env*`, or lockfiles

## What Is Built Today

### Pages / Routes

None in the repository.

- No Next.js `app` router
- No `pages` router
- No static pages
- No checkout success page

### Components

None in the repository.

### APIs

None in the repository.

- No application API routes
- No NanoCorp webhook handler at `app/api/webhooks/nanocorp/route.ts`

### Content / Documentation

- `README.md` exists, but it is a very short placeholder-style project description rather than setup or architecture documentation.

## Tech Stack In Use

### In the Codebase

No application stack is implemented yet.

- Not currently a Next.js project
- Not currently a React project
- No TypeScript setup
- No Tailwind CSS setup
- No ESLint or test setup in the repo

### Infrastructure Already Available

These exist around the repo, even though the app code is missing:

- GitHub repository connected at `nanocorp-hq/pablo`
- Vercel project URL: `https://pablo.nanocorp.app`
- PostgreSQL database available through `DATABASE_URL`
- Vercel env inventory currently contains only `DATABASE_URL` for `production`, `preview`, and `development`

## Database State

The PostgreSQL database is reachable, but currently empty.

- `\dt+` returned `Did not find any relations.`
- Querying `information_schema.tables` outside system schemas returned zero rows
- No application tables, no auth tables, no migrations, and no seed data were found

## Environment Variables

Observed from the local execution environment:

- `DATABASE_URL`
- `VERCEL_PROJECT_URL=https://pablo.nanocorp.app`

Observed from NanoCorp Vercel env management:

- `DATABASE_URL` only

Missing app-level env conventions:

- No `.env` files in the repo
- No documented env contract
- No `NEXT_PUBLIC_*` variables
- No API keys or third-party integrations configured in code

## Deployment / Vercel State

### Repo-side deployment config

No deployment config exists in the repository.

- No Next.js project files for Vercel to build
- No `vercel.json`
- No build scripts

### Live site behavior

The live URL currently serves a placeholder page, not a Pablo app.

- `curl -I -L https://pablo.nanocorp.app` returned `x-vercel-error: DEPLOYMENT_NOT_FOUND`
- The response body is the NanoCorp "Coming Soon" landing page
- This suggests Pablo does not currently have a successful app deployment behind the public URL

## What A Chess Coach SaaS Still Needs

Core product areas that are not yet built:

- Marketing site and app shell
- Authentication and user accounts
- Onboarding flow for players/coaches
- Game upload or chess platform import flow
- PGN storage and parsing
- Game analysis pipeline
- Coach feedback or lesson generation workflow
- Student dashboard and progress tracking
- Repertoire / openings features
- Puzzles, drills, or training recommendations
- Billing and subscription purchase flow
- Post-checkout success page
- Payment webhook handling
- Admin or support tooling
- Analytics integration in the app layout
- Error handling, logging, and monitoring
- Tests, CI, and developer setup documentation

## Blockers / Broken Things

Current blockers:

- The repository is not an initialized Next.js app despite the expected deployment target being Next.js on Vercel
- `npm run build` fails immediately because `package.json` does not exist
- There is no application code to deploy
- The public site is still a placeholder / missing deployment
- The database has no schema
- There is no documented environment-variable contract

Lower-severity issues:

- The README is too minimal to onboard future work
- There is no `.gitignore` in the tracked repo, which increases the risk of committing local tool artifacts

## Recommended Next Tasks

1. Bootstrap the actual Next.js App Router project at the repo root with TypeScript, Tailwind CSS, ESLint, and a basic layout.
2. Add a proper `.gitignore`, rewrite the README with setup instructions, and document required environment variables.
3. Create the first database schema and migration plan for users, games, analyses, and subscriptions.
4. Build the initial product surface: homepage, auth entry points, dashboard shell, checkout success page, and NanoCorp webhook route.
