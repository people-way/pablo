# Pablo — Your Personal Chess Coach

Pablo is a Next.js chess coaching app that analyzes your games with Stockfish engine-level depth and gives you actionable improvement tips.

## Features

- **Free trial** — analyze your first game with no credit card required
- **Chess.com import** — paste your username and instantly import recent games
- **Stockfish 18 analysis** — blunder detection, centipawn loss, mistake classification
- **Pablo Pro** (€9/month) — unlimited analysis, full history, weekly progress reports

## Pages

| Route | Description |
|-------|-------------|
| `/pablo` | Landing page with hero, how-it-works, and pricing |
| `/pablo/analyze` | Free trial — import Chess.com games or paste PGN |
| `/pablo/revue` | Game review, with Stockfish in the browser |
| `/pablo/ouvertures` | Opening coach |
| `/pablo/upgrade` | Pablo Pro upgrade page with feature comparison |

Pablo is mounted at `/pablo` (`basePath`). A request to `/` or `/revue` on this deployment redirects to the same path under `/pablo`. In production, set `PABLO_CANONICAL_ORIGIN=https://anarchikgames.com` (Production only, then redeploy) so those old URLs go to `https://anarchikgames.com/pablo/...`. Leave it unset on Preview so a preview keeps its own host.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000/pablo](http://localhost:3000/pablo) in your browser. The site root redirects there.

## Build

```bash
npm run build
npm start
```

## Deploy to Vercel

### One-click import

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import this GitHub repository (`people-way/pablo`)
3. Vercel auto-detects Next.js — click **Deploy**
4. Your site will be live at a `*.vercel.app` URL

### Environment variables

Game import, the sample demo (`/analyze?sample=1`), and `/revue` work with no account backend. Without the two Supabase variables below, `/login` and `/dashboard` show “Compte bientôt disponible” instead of an error. Saved analyses, the Chess.com username, and the dashboard need both variables. `NEXT_PUBLIC_*` values are inlined at build time, so change them and redeploy.

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | For accounts | Project URL, for example `https://<project-ref>.supabase.co`. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | For accounts | Publishable key (`sb_publishable_...`). Safe to expose in the browser. Do not set a secret or service-role key. |
| `PABLO_CANONICAL_ORIGIN` | Production | Public studio origin, `https://anarchikgames.com`, with no path. Old URLs on this deployment redirect there under `/pablo`. Set it for Production only. |

Set the two Supabase variables for Production, Preview, and Development under **Settings → Environment Variables**. Set `PABLO_CANONICAL_ORIGIN` for Production only. The app does not use `DATABASE_URL`, `DATABASE_SSL`, `PABLO_AUTH_BYPASS`, or the NanoCorp email CLI.

### Supabase Auth settings

Apply the files in `supabase/migrations/` in timestamp order (or `supabase db push`) before turning accounts on. `20261010151332_pablo_init.sql` creates `pablo_profiles`, `pablo_analyses`, and `pablo_opening_stats` in `public`, with row level security so each user can only touch `auth.uid()`. `20261010151951_pablo_profiles_rls_initplan.sql` recreates the profile policy so `auth.uid()` and `auth.jwt()` are read once per statement.

In **Authentication → URL configuration**:

| Setting | Value |
|---------|--------|
| Site URL | `https://anarchikgames.com/pablo` |
| Redirect URLs | `http://localhost:3000/**` |
| | `https://*-peopleways-projects.vercel.app/**` |
| | `https://pablo.anarchikgames.com/**` |
| | `https://anarchikgames.com/**` |
| | `https://pablo-eight-beta.vercel.app/**` |

Magic links are sent by Supabase. The default template works when the link is opened in the same browser that requested it (PKCE). To also allow another device, edit the templates under **Authentication → Emails** and append `token_hash` to `RedirectTo` (that URL is already `/pablo/auth/callback`):

- **Magic Link:** `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=magiclink`
- **Confirm signup:** `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email`

`RedirectTo` is the `/pablo/auth/callback` URL for the environment that asked for the link, so preview deployments keep working. Auth cookies are scoped to `/pablo` so they are not sent to other games on `anarchikgames.com`. OTP expiry is **Authentication → Providers → Email** (the default is one hour).

## Studio hub

`hub/` is a separate Next.js app, deployed as its own Vercel project with Root Directory `hub/` and the apex domain `anarchikgames.com`. It serves the studio home page and rewrites `/pablo` to this deployment and `/street-tycoons` to Street Tycoons. Upstream origins live in `hub/lib/upstreams.ts` and can be overridden at build time:

| Variable | Default |
|----------|---------|
| `PABLO_UPSTREAM_ORIGIN` | `https://pablo-eight-beta.vercel.app` |
| `STREET_TYCOONS_UPSTREAM_ORIGIN` | `https://street-tycoons.vercel.app` |

```bash
cd hub
npm install
npm run dev
```

### Accounts data

Pablo tables are prefixed `pablo_` because this Supabase project is shared with other Anarchik Games. The browser and server use the publishable key and the user session only. There is no service-role key in the app.

## Stripe payment link

The upgrade page links to `https://buy.stripe.com/aFa3cwgu016v36q9gLeOs0Y`.

To update it, edit the `PAYMENT_LINK` constant in:
- `app/page.tsx`
- `app/upgrade/page.tsx`

## Tech stack

- [Next.js 16](https://nextjs.org/) — App Router, TypeScript
- [Supabase Auth](https://supabase.com/docs/guides/auth/server-side/nextjs) — magic-link login and Postgres with row level security (`@supabase/ssr`)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [chess.js](https://github.com/jhlywa/chess.js) — PGN parsing and move validation
- [Stockfish 18](https://stockfishchess.org/) — engine analysis (Node.js runtime, server-side only)

## Project structure

```
app/
  page.tsx              # Landing page
  analyze/
    page.tsx            # Free trial / import flow
  upgrade/
    page.tsx            # Pablo Pro upgrade page
  api/
    analyze/
      route.ts          # POST — analyze PGN with Stockfish
    import/
      chess-com/
        route.ts        # GET — fetch games from Chess.com API
components/
  game-analysis-card.tsx  # Game card + analysis UI
lib/
  chess-analysis.ts     # Stockfish analysis pipeline
  chess-com.ts          # Chess.com API helpers
```

## Chess.com API

Pablo fetches games from the public Chess.com API — no authentication needed:

```
GET https://api.chess.com/pub/player/{username}/games/{year}/{month}
```

## License

MIT
