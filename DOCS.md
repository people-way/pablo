# Pablo Working Notes

## 2026-04-15 Outreach Wave 4: New NanoCorp Prospects Only

### What was completed

- Read the existing outreach logs (`2026-04-12`, `2026-04-13`, `2026-04-14`) plus the outbound mailbox before sourcing any new prospects.
- Queried `nanocorp prospects search` with `chess`, `game`, `education`, and `learning`, then filtered against prior recipients from `nanocorp emails list --direction outbound --limit 300`.
- Sent 6 new NanoCorp outreach emails from `pablo@nanocorp.app` to:
  - `gambit@nanocorp.app`
  - `pawniq@nanocorp.app`
  - `courtiq@nanocorp.app`
  - `frag@nanocorp.app`
  - `demowise@nanocorp.app`
  - `vaultt@nanocorp.app`
- Logged the full outreach details, subjects, email IDs, and sourcing notes in `docs/outreach/2026-04-15-wave4.md`.

### What remains

- Part 2 of the original outreach task is still open: source 5-8 external chess coaches / tutors / academies and send the coach-focused cold email.
- Part 3 of the original outreach task is still open: update the NanoLaunch listing description.
- Monitor replies from the 2026-04-15 NanoCorp sends and prepare short follow-ups for non-responders.

## 2026-04-15 Rebuild /analyze Page: 3-Step Multi-Game Report UI

### What was completed

- **`app/analyze/page.tsx`** — Fully replaced the old server-component single-game UI with a `"use client"` 3-step experience:
  - **Step 1**: Full-viewport username input (chess-pattern background, Playfair heading, gold CTA)
  - **Step 2**: Animated loading with 5 sequential messages, pulsing chess piece, gold progress bar (~7s minimum)
  - **Step 3**: Multi-game report with:
    - `StatCard`: N games analyzed, wins/losses/draws, win rate %, date range
    - `WeaknessCard` (up to 3): opening name + color badge, win rate badge, Pablo diagnosis, key problem, what to do, teaser CTA → /upgrade
    - `PabloSummaryCard`: coaching message with Pablo avatar icon, Playfair serif quote styling, signed "— Pablo"
    - `UpgradeCTA`: "Ready to fix your [worst opening] for good?" → /upgrade
  - Wires `/api/import/chess-com?username=X` first, then `/api/analyze/openings`
  - Error handling: username not found, no games, network errors (shown inline in Step 1)

- **`app/api/analyze/openings/route.ts`** (new) — POST endpoint that:
  - Accepts `{ games: ImportedChessComGame[], username: string }`
  - Groups games by `openingFamily` + `color`, calculates win rates per group
  - Identifies up to 3 weaknesses (≥3 games, <50% win rate), sorted worst-first
  - Generates Pablo-voice `diagnosis`, `keyProblem`, `whatToDo` using catalog data
  - Generates a 4–5 sentence `summary` message in Pablo's coaching voice
  - Returns `OpeningsAnalysisResult` type (exported for client typing)

### What remains

- Wire the real `/api/analyze/openings` route with actual Lichess or ECO-level analysis (currently deterministic heuristic)
- Add LLM-backed diagnosis generation using Claude API for personalized Pablo voice
- Add `/upgrade` page Stripe payment link if not already live
- Push to `people-way/pablo` repo (requires a PAT with repo scope for that account)

---

## 2026-04-15 Partial Implementation: Chess.com Multi-Game Import Foundation

### What was completed
- Added `lib/openings/lookup.ts` as a shared opening-lookup utility for:
  - ECO normalization
  - ECO extraction from Chess.com `ECOUrl` PGN headers
  - opening-family mapping (Sicilian, French, Caro-Kann, KID, etc.)
  - fallback matching into `lib/openings/catalog.json`
- Extended `lib/chess-com.ts` toward the new free-tier import shape:
  - import now targets the last 3 archive months by default
  - import limit raised from 10 to 50 by default
  - games are still sorted by most recent first
  - PGN headers are parsed for `Opening`, `ECO`, and `ECOUrl`
  - imported game objects now include `openingName`, `ecoCode`, and `openingFamily`
  - import result now includes `archives` plus an aggregate `archive` window label

### What remains
- Wire the updated import shape into `app/api/import/chess-com/route.ts`
- Build the new multi-game opening analysis engine and `app/api/analyze/openings/route.ts`
- Replace the current `/analyze` single-game UI with the new multi-step loading + report experience
- Run lint/build verification after the unfinished API and UI work is in place

### Notes
- This is only the import-layer foundation. No UI or new analysis route was implemented in this partial pass.
- Nothing was deployment-verified from this partial state.

## 2026-04-15 Product Spec: Multi-Game Opening Coach

### What was created
- `docs/product-spec-opening-coach.md` — Full product spec for Pablo v2.0 covering:
  1. Feature list with priority (M1–M9 must-have, N1–N5 nice-to-have)
  2. User flows for all 5 major features (import, weakness report, prep plan, tournament mode, progress tracking)
  3. Pablo voice/tone guide with 4 full example coaching messages per opening
  4. Technical architecture (data sources, static vs dynamic vs LLM, DB schema, caching)
  5. Free vs Pro feature split with pricing rationale
  6. Success metrics (acquisition, engagement, retention, conversion)
  7. 7 open questions for product/engineering decisions

### Key decisions in the spec
- Free tier shows top 3 weak openings with full Pablo diagnosis — no watered-down experience, genuine value
- LLM (Claude API) used only for *voice generation* on top of deterministic analysis — not for chess analysis itself
- Chess.com API is primary game source (more users, more reliable); Lichess secondary
- Lichess opening explorer provides per-Elo-bucket win rates per position — key for move-level feedback
- Static opening catalog (`lib/openings/`) is the coaching spine; LLM personalizes it to the user
- Pro at $9/month: cheaper than Aimchess + chess.com Diamond combined; positions against "single lesson = $80"

---

## 2026-04-15 Opening Resources Research Brief

### What was created
- `docs/research-brief-opening-resources.md` — Comprehensive research brief covering:
  1. Opening databases & APIs (Lichess, Chess.com, PGN Mentor, TWIC, Lumbra's Gigabase)
  2. Elo-calibrated coaching approach (1200–2200 breakdown)
  3. Opening weakness patterns and "punch above your weight" openings
  4. AI chess coaching competitive landscape (Chessable, Chess.com, Aimchess, Noctie, Chessline)
  5. API integration priority stack for Pablo's coaching engine

### Key findings
- **Lichess opening explorer API** (`explorer.lichess.ovh`) returns ECO codes, win/draw/loss rates, move trees, and per-Elo-bucket stats (1600/1800/2000/2200/2500+). Has 429 reliability issues (lila #19610); cache aggressively.
- **Chess.com player API** is the primary game source: monthly game archives with ECO codes in PGN headers. Free, no auth, more reliable.
- **PGN Mentor** (pgnmentor.com) has ECO-organized game files — best free source for opening-specific example games.
- **TWIC** (theweekinchess.com) and **Lumbra's Gigabase** (lumbrasgigabase.com) are the best free bulk PGN databases.
- **The competitive gap Pablo fills:** Every existing product is either a database, analytics dashboard, or learning drill tool. None have an opinionated coach with a persistent voice and personality.
- **Closest competitor:** Noctie.ai (AI opponent that coaches during play, $9/mo). Different use case (Pablo coaches on game history review, not live play). Not directly competing.

## 2026-04-15 Opening Knowledge Base

### What was created
- `lib/openings/catalog.json` — 25+ openings with full structured data (ECO codes, strategic themes, typical plans, common mistakes by Elo bracket, critical moves, traps, model games, pablo_opinion voice, weakness signals)
- `lib/openings/transpositions.md` — 5 major transposition networks, move-order tricks, deceptively-similar lines comparison table, Lichess API integration points
- `lib/openings/coaching-scripts.md` — 20 Pablo-voice weakness report scripts for top openings + reusable template
- `lib/openings/elo-calibration.md` — 5 Elo brackets (1200-2200) with specific coaching emphasis, red flags, opening recommendations, sample Pablo messages
- `lib/openings/punch-above-weight.md` — 10 upset weapon openings with psychological rationale and effective Elo ranges
- `lib/openings/README.md` — Index explaining the database structure and how Pablo uses it

### Coverage
King's Pawn openings: Italian, Ruy Lopez, King's Gambit, Vienna, Four Knights
Sicilian: Najdorf, Dragon, Scheveningen, Kan/Taimanov
vs 1.e4 Black: French, Caro-Kann, Pirc, Alekhine, Scandinavian
Queen's Pawn: London, QGD, QGA, Colle (referenced)
vs 1.d4 Black: KID, Nimzo-Indian, Queen's Indian, Grünfeld, Benoni, Dutch, Budapest, Tarrasch
Flank: English, Réti, Bird's, Larsen's

### Key design decisions
- Each opening has pablo_opinion (in voice) + weakness_signals array for player matching
- Coaching scripts follow the template: name the problem, diagnose in chess terms, give concrete fix
- Elo calibration is prescriptive: Pablo says different things at 1300 vs 1900
- Transposition map includes Lichess API endpoints for dynamic enrichment



## 2026-04-14 Pablo Character Bible

### What was created
- Full character bible written to `docs/pablo-character-bible.md`
- Covers: visual identity, personality profile, voice & tone (10 example messages), speech patterns, Pablo's opinions on openings, and 6 UI usage scenarios
- Intended audience: frontend developer (avatar/UI) and AI prompt engineer (LLM voice)

### Key design decisions
- Visual: illustrated (not photo-realistic), dark slate + amber gold palette, chess club hoodie, strong silhouette
- Personality: direct, opinionated, warm underneath — the "best friend who's a GM"
- Voice: elo-adaptive jargon, dry humor, sports/battle/architecture metaphors
- Opinions: pro-1.e4, pro-Caro-Kann/Kan for Black vs e4, pro-KID vs d4, skeptical of London System and Dragon for club players

## 2026-04-14 Deployment Status Recheck for `pablo.nanocorp.app`

### Goal
Verify the reported Vercel outage, recover access if possible, and confirm whether `pablo.nanocorp.app` is currently backed by a live Pablo deployment.

### What was found

- The standalone `vercel` binary is not installed in this environment.
- `npx vercel` works, but there is no saved Vercel auth session:
  - `~/.local/share/com.vercel.cli/auth.json` exists and is empty (`{}`).
  - `npx vercel whoami` and `npx vercel projects list` both fall back to an interactive device-login flow.
- `nanocorp vercel` currently exposes only env-var management (`env list`, `env set`), not project/domain linking.
- The generic NanoCorp tool backend does not currently expose obvious Vercel project/domain operations such as project listing, creation, domain inspection, or deploy triggering.
- Despite the original outage report, the custom domain is live again now:
  - `https://pablo.nanocorp.app` returns `HTTP/2 200`
  - `https://pablo.nanocorp.app/analyze` returns `HTTP/2 200`
  - HTML for the live app includes deployment identifier `dpl_68m82ByGVtzxgh2jtSEj7wG726GM`
- Live page content matches the expected Pablo app:
  - `/` title: `Pablo — Chess Coach That Never Sleeps`
  - `/analyze` title: `Free Chess Trial | Pablo`
  - `/analyze` renders the Chess.com username import flow and sample-game CTA
- The public Chess.com import API is working on the live domain:
  - `GET /api/import/chess-com?username=hikaru` returned `count: 10`
  - first game URL returned: `https://www.chess.com/game/live/167256884822`
- Browser verification via `agent-browser` could not run because no Chrome/Chromium binary is installed in the runner:
  - `agent-browser open ...` failed with `Chrome not found`
  - no system `chromium` / `google-chrome` binary was present in `PATH`

### Outcome

- No repo code changes were required to restore availability because the domain was already serving a live Pablo deployment at verification time.
- From this environment, direct Vercel project-relinking could not be performed because there is no usable Vercel auth session and no NanoCorp project/domain management wrapper.
- The tangible outcome of this task was current-state verification:
  - custom domain is live
  - landing page is live
  - `/analyze` is live
  - `/api/import/chess-com?username=hikaru` is live

### Follow-up if direct Vercel admin work is still needed

1. Provide a Vercel access token or an authenticated Vercel CLI session for this workspace.
2. Run `vercel projects list` and `vercel domains inspect pablo.nanocorp.app` under that authenticated account.
3. If the repo connection is still stale, reconnect the active project to `people-way/pablo` and confirm auto-deploy settings from `main`.

## 2026-04-14 Push to `people-way/pablo`

### Goal
Push the existing Pablo codebase from `nanocorp-hq/pablo` to the user's personal GitHub repository at `people-way/pablo` using the provided PAT.

### What was found

- Local repo branch: `main`
- Local source commit before this task: `3d97cc1` (`Document people-way rebuild task in DOCS.md`)
- `push-to-people-way.sh` already existed and was suitable for token-based migration, but a direct one-off authenticated push was cleaner because it avoided storing the token in git config.
- The target repo `people-way/pablo` already existed and accepted authenticated access.

### What was done

1. Confirmed the local repo was already on the requested code snapshot (`3d97cc1`).
2. Pushed `main` directly to `https://github.com/people-way/pablo.git` using the provided token.
3. Verified the target repo now exposes the expected root files via the GitHub API, including:
   - `README.md`
   - `app/`
   - `components/`
   - `lib/`
   - `push-to-people-way.sh`
   - `DOCS.md`

### Verification

- Git push result: new branch `main -> main`
- GitHub repo metadata after push:
  - `full_name`: `people-way/pablo`
  - `default_branch`: `main`
  - `visibility`: `public`
  - `pushed_at`: `2026-04-14T08:23:18Z`

### Next steps

1. Import `people-way/pablo` into Vercel.
2. Configure any required environment variables in Vercel.
3. Run one deployment verification on `/`, `/analyze`, and `/upgrade` after the first production build.

## 2026-04-13 Codebase Rebuild for people-way

### Goal
Push a full copy of the Pablo codebase to `https://github.com/people-way/pablo` for the user (people-way GitHub account).

### What was done

1. **Added `/upgrade` page** (`app/upgrade/page.tsx`):
   - Pablo Pro upgrade page (€9/month)
   - Feature list (9 pro features)
   - Free vs Pro comparison table
   - Stripe payment link: `https://buy.stripe.com/aFa3cwgu016v36q9gLeOs0Y`
   - Clean dark chess-themed design matching the rest of the app

2. **Updated README.md**:
   - Complete setup instructions (`npm install && npm run dev`)
   - Vercel one-click deploy instructions
   - Route/feature table
   - Tech stack, project structure, Chess.com API notes

3. **Created `push-to-people-way.sh`**:
   - Shell script for the user to run locally
   - Creates `people-way/pablo` repo via GitHub API (org or user account)
   - Pushes all code via HTTPS with a personal access token
   - Requires `GITHUB_TOKEN` env var with `repo` scope

### Why direct push failed

- SSH key in this environment is a deploy key for `nanocorp-hq/pablo` only
- `people-way/pablo` does not exist yet (GitHub API returns 404)
- No GitHub token for the `people-way` account is available in the environment
- `nanocorp-hq/pablo` is a private repo, so HTTPS clone without auth is blocked

### What the user needs to do

1. Create a GitHub Personal Access Token at: https://github.com/settings/tokens/new
   - Scopes needed: `repo` (or `public_repo` if making the repo public)
2. Run from the repo root:
   ```bash
   GITHUB_TOKEN=ghp_yourtoken ./push-to-people-way.sh
   ```
3. Import `people-way/pablo` into Vercel at: https://vercel.com/new

### App routes (all building correctly)
- `/` — Landing page
- `/analyze` — Free trial / Chess.com import
- `/upgrade` — Pablo Pro upgrade (NEW)
- `/api/analyze` — POST endpoint (Stockfish analysis)
- `/api/import/chess-com` — GET endpoint (Chess.com import)

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

## 2026-04-14 Outreach Wave 3

### What was found

- The first two outreach waves covered 17 outbound emails total:
  - 10 on 2026-04-12
  - 7 on 2026-04-13
- Only one prior outreach contact had replied by the time wave 3 was prepared:
  - `pawnprint@nanocorp.app`
  - inbound email ID `5cd7ecae-4774-4387-a956-b08a7006ad2e`
- The rest of the inbound mailbox was unrelated operational traffic, so every other April 12-13 prospect was treated as a non-responder.
- The quickest reliable new-prospect sources were:
  - `nanocorp prospects search --source nanocorp --query chess`
  - public academy / club contact pages with explicit inboxes

### What changed

- Added a detailed wave 3 outreach log at [`docs/outreach/2026-04-14-wave3.md`](/home/worker/repo/docs/outreach/2026-04-14-wave3.md).
- Sent 16 short threaded follow-ups to all April 12-13 non-responders.
- Sent 5 new personalized outreach emails to net-new chess prospects.

### Execution details

- Follow-up body used for all non-responders:
  - "Just checking in in case this got buried. Pablo gives players engine-level analysis plus a clear path to their next rating milestone, and it's free to try here: https://pablo.nanocorp.app"
- New prospects contacted:
  - `pawnjr@nanocorp.app`
  - `info@ichessu.com`
  - `contact@uschessacademy.com`
  - `sandiegochessclub@gmail.com`
  - `georgianchessacademy@gmail.com`
- Total sends completed in wave 3: `21`

### Follow-up

1. Monitor replies for the next 48 hours and tag which segment responds best: NanoCorp builders, academies/tutors, or clubs.
2. Prepare a wave 4 offer or artifact tailored to the best-performing segment instead of using one generic pitch.
