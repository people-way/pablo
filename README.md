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
| `/` | Landing page with hero, how-it-works, and pricing |
| `/analyze` | Free trial — import Chess.com games or paste PGN |
| `/upgrade` | Pablo Pro upgrade page with feature comparison |

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

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

No environment variables are required for the MVP. The app is fully stateless.

| Variable | Required | Description |
|----------|----------|-------------|
| _(none)_ | — | No env vars needed for basic operation |

If you add a database or authentication later, set variables in the Vercel dashboard under **Settings → Environment Variables**.

## Stripe payment link

The upgrade page links to `https://buy.stripe.com/aFa3cwgu016v36q9gLeOs0Y`.

To update it, edit the `PAYMENT_LINK` constant in:
- `app/page.tsx`
- `app/upgrade/page.tsx`

## Tech stack

- [Next.js 16](https://nextjs.org/) — App Router, TypeScript
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
