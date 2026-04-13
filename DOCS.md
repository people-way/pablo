# Pablo Working Notes

## 2026-04-13 Deployment Verification

### Repo and build state

- Branch: `main`
- HEAD during verification: `a41c011` (`Refocus landing page on free report conversion.`)
- `npm ci` succeeds
- `npm run build` succeeds and emits these app routes:
  - `/`
  - `/analyze`
  - `/api/analyze`
  - `/api/import/chess-com`

### Live deployment findings

- `https://pablo.nanocorp.app` currently returns Vercel `NOT_FOUND`
- Response headers include `x-vercel-error: NOT_FOUND`
- `nanocorp vercel env list` still returns a valid Vercel project env inventory with `DATABASE_URL` configured for `production`, `preview`, and `development`
- `https://pablo.vercel.app` is not the Pablo product deployment; it serves an unrelated personal site, so it is not a usable canonical live URL for this repo

### Local end-to-end verification

Verified against a local `next dev` server after dependency install:

- Landing page (`/`) returns `200` and renders the Pablo marketing page
- Analyze page (`/analyze`) returns `200` and renders the import/sample UI
- Chess.com import works:
  - `GET /api/import/chess-com?username=hikaru` returned `count: 10`
  - `/analyze?username=hikaru` rendered imported games for `hikaru`
- Analysis works:
  - `POST /api/analyze` with a sample PGN returned a valid JSON report
  - The analyze UI uses `components/game-analysis-card.tsx` to call `/api/analyze` from the `Generate Free Report` button

### Diagnosis

The Pablo application code is present and working locally. The blocking issue is deployment/domain linkage outside the repo:

- either the `nanocorp-hq/pablo` repo is not connected to the correct Vercel project
- or the project exists but `pablo.nanocorp.app` is not assigned to the active production deployment

### Next recovery steps

1. Reconnect `nanocorp-hq/pablo` to the intended Vercel project, or identify the correct existing project for this repo.
2. Reassign `pablo.nanocorp.app` to that project’s current production deployment.
3. Capture the actual production deployment URL after the alias is repaired.
4. Run one post-fix browser verification on:
   - `/`
   - `/analyze`
   - import flow for `hikaru`
   - free analysis generation from the imported game UI
