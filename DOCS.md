# Pablo Working Notes

## 2026-04-13 Stockfish Integration Notes

### What was found

- The existing analysis flow is entirely heuristic:
  - [`lib/chess-analysis.ts`](/home/worker/repo/lib/chess-analysis.ts) scans for mate-in-1/2 and immediate material drops using `chess.js`.
  - [`app/api/analyze/route.ts`](/home/worker/repo/app/api/analyze/route.ts) calls that analyzer synchronously and returns `{ total_moves, blunders, summary }`.
  - [`components/game-analysis-card.tsx`](/home/worker/repo/components/game-analysis-card.tsx) expects `report.blunders` to be an array of flagged moves and renders only blunder-oriented copy.
- The repo did not have installed dependencies at the start of this task, so local Next.js docs were unavailable until `npm install` completed.
- This project is on Next.js `16.2.3`.
- The local docs required by `AGENTS.md` do exist after install under `node_modules/next/dist/docs/`.
- Relevant Next.js guidance confirmed locally:
  - Route Handlers live in `app/**/route.ts` and use the Web `Request` / `Response` APIs.
  - The Node.js runtime is the default; Edge has restricted Node API support and is not appropriate for Stockfish.
  - Route Handler dependencies are automatically bundled unless opted out with `serverExternalPackages`.
  - `outputFileTracingIncludes` can be used when runtime assets from a package need to be explicitly traced into production output.

### Stockfish package findings

- Installed npm package: `stockfish@18.0.7`.
- The package exports a Node loader function from `index.js`.
- The package ships multiple engine flavors under `node_modules/stockfish/bin/`, including:
  - `stockfish-18.js` / `.wasm`
  - `stockfish-18-single.js` / `.wasm`
  - `stockfish-18-lite.js` / `.wasm`
  - `stockfish-18-lite-single.js` / `.wasm`
- A direct Node smoke test worked with `lite-single`:
  - the engine initialized successfully
  - `uci` and `isready` completed
  - `go depth 6` from the starting position produced standard `info depth ... score cp ...` lines and a final `bestmove`
- `lite-single` looks like the right default for this API route because it is much smaller than the full engine and does not require browser threading/cross-origin setup.

### Implementation notes

- The current UI and types need a coordinated change because `blunders` is currently an array, while the new engine-backed report needs numeric counts plus a richer list of flagged moves if the card is to keep showing example mistakes.
- The analyze route should likely be pinned to `runtime = "nodejs"` explicitly to avoid accidental incompatibility with Stockfish.
- Production packaging will likely need:
  - `serverExternalPackages: ["stockfish"]`
  - `outputFileTracingIncludes` for the Stockfish `bin` assets used by `/api/analyze`

### What changed

- Installed `stockfish` and added a local `stockfish.d.ts` declaration so TypeScript can type-check the Node loader.
- Replaced the heuristic-only analyzer in [`lib/chess-analysis.ts`](/home/worker/repo/lib/chess-analysis.ts) with an async Stockfish-backed pipeline that:
  - boots the `lite-single` WASM engine lazily on first request
  - runs one evaluation per unique position in the PGN at depth `10`
  - computes mover-relative centipawn loss from the engine score before and after each move
  - classifies flagged moves with:
    - `blunder` for `> 200` cp
    - `mistake` for `> 100` cp
    - `inaccuracy` for `> 50` cp
  - returns `{ total_moves, blunders, mistakes, inaccuracies, avg_centipawn_loss, summary, findings }`
- Updated [`app/api/analyze/route.ts`](/home/worker/repo/app/api/analyze/route.ts) to:
  - use `runtime = "nodejs"`
  - await the async analyzer
- Updated [`next.config.ts`](/home/worker/repo/next.config.ts) to support production packaging for Stockfish:
  - `serverExternalPackages: ["stockfish"]`
  - `outputFileTracingIncludes` for `node_modules/stockfish/bin/**/*` on `/api/analyze`
- Updated [`components/game-analysis-card.tsx`](/home/worker/repo/components/game-analysis-card.tsx) so the UI now shows:
  - moves analyzed
  - average centipawn loss
  - separate blunder / mistake / inaccuracy counts
  - per-move classification badges and centipawn-loss values in the findings list
- Mate-driven loss is capped at `1000` cp for reporting so forced mates still register as blunders without making averages meaningless.

### Verification

- `npm run lint` passes.
- `npm run build` passes.
- Production-mode local verification passed with `next start` + `POST /api/analyze`.
- Known PGN used:
  - `1. f3 e5 2. g4 Qh4#`
- Example response for `perspective: "white"`:
  - `total_moves: 2`
  - `blunders: 1`
  - `mistakes: 0`
  - `inaccuracies: 1`
  - `avg_centipawn_loss: ~516`
  - flagged findings:
    - `f3` as an `inaccuracy` (~`92-93` cp)
    - `g4` as a `blunder` (~`939-941` cp) with `allows a forced mate in 1`

### Notes / follow-up risk

- In local `next dev`, hot-reloading after mid-task analyzer changes caused one Stockfish WASM reinitialization failure. A fresh production-mode server (`next start`) worked correctly on repeated requests.
- For future work, if analysis latency becomes a problem on long games, the next lever should be caching or background jobs before increasing engine depth.

## 2026-04-13 NanoLaunch Listing

### What was found

- `https://nanolaunch.nanocorp.app/en/service/pablo` is already live.
- NanoLaunch appears to sync listing data from NanoDir rather than exposing a normal public "submit service" page.
- A company inbox already exists at `pablo@nanocorp.app`, which was enough to authenticate into NanoDir via magic link.
- The claimed source listing is `https://nanodir.nanocorp.app/en/service/pablo`.
- NanoDir marks Pablo as a verified owner-managed listing.

### Listing state

- Public NanoLaunch URL: `https://nanolaunch.nanocorp.app/en/service/pablo`
- Public NanoDir URL: `https://nanodir.nanocorp.app/en/service/pablo`
- Visible listing name: `Pablo`
- Visible URL: `https://pablo.nanocorp.app/`
- Visible tagline: `Your personal chess coach that never sleeps.`
- Category currently shown on NanoDir and NanoLaunch: `Other`
- NanoLaunch currently shows no favicon for Pablo and prompts users to create one with Favico.

### Flow and quirks

- NanoLaunch login/signup works, but no obvious add-listing flow is exposed on the public UI after login.
- NanoDir is the more likely source-of-truth for listings because NanoLaunch explicitly says it is "Synced from NanoDir".
- NanoDir's user menu includes `My service`, but the generated link is broken: it points to `/en/en/service/pablo` instead of `/en/service/pablo`.
- Manually opening `/en/service/pablo` works and shows the verified Pablo listing.

### Outcome

- Pablo is already listed publicly, so the tangible outcome of this task was verification, account access, source-listing discovery, and confirmation of the live NanoLaunch URL.
- No repo code changes were required for the listing itself.

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

## 2026-04-13 Outreach Wave 2

### What was found

- The first outreach wave is logged in [`docs/outreach/2026-04-12-chess-outreach.md`](/home/worker/repo/docs/outreach/2026-04-12-chess-outreach.md) and includes 10 sends that should not be repeated.
- `nanocorp emails list` is the most reliable way to confirm prior subjects and recipients; the CLI response shape is `{ success, result: { emails: [...] }, error }`.
- New NanoCorp prospects adjacent to Pablo were available under broader `game` / `coach` searches even when not strictly chess-only, especially coaching marketplaces and gameplay-review products.
- Public external academy inboxes were easier to act on quickly than paying to verify individual coach emails.
- Community posting was blocked operationally:
  - `agent-browser` is installed, but Chromium is not installed locally
  - unauthenticated Reddit requests returned `403`
  - no logged-in Reddit / Discord session was available in the environment

### What changed

- Added a second-wave outreach log at [`docs/outreach/2026-04-13-wave2.md`](/home/worker/repo/docs/outreach/2026-04-13-wave2.md).
- Sent 7 new outreach emails for Pablo and recorded all send IDs in that log.
- Documented a concrete follow-up task for Reddit / Discord / forum posting instead of leaving community outreach implicit.

### Execution details

- New NanoCorp recipients contacted:
  - `kartiq@nanocorp.app`
  - `duocoach@nanocorp.app`
  - `peaklab@nanocorp.app`
- External recipients contacted:
  - `sanfrancisco@academicchess.com`
  - `info@sydneyacademyofchess.com.au`
  - `info@kidchess.com`
  - `andrew@edinburghchessacademy.com`
- The wave used a new message angle:
  - "Turn every game you play into a coaching session"
  - engine-level analysis with actionable advice
  - free trial CTA with no credit card

### Follow-up

1. Review inbound replies and create a short follow-up sequence for non-responders.
2. Complete community posting once a browser profile or Chromium-backed `agent-browser` setup is available.
