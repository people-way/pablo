# Pablo Research Brief: Opening Preparation Resources & Coaching Engine
*Compiled 2026-04-15*

This brief covers the four research areas needed to design Pablo's coaching engine and content strategy.

---

## 1. Opening Databases & APIs

### Lichess Opening Explorer API

**Base URL:** `https://explorer.lichess.ovh`

Three endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /masters` | Master-level OTB games |
| `GET /lichess` | Rated Lichess community games (with Elo range buckets) |
| `GET /player` | On-demand stats for a specific Lichess user |

**Key parameters:**
- `fen` — FEN of the position to query
- `play` — comma-separated moves in UCI format (alternative to FEN)
- `speeds` — `bullet`, `blitz`, `rapid`, `classical`, etc.
- `ratings` — Elo buckets for `/lichess`: `1600`, `1800`, `2000`, `2200`, `2500+`
- `since` / `until` — year-month date filters

**What the response returns:**
- Win/draw/loss counts for the position (totals)
- Per candidate move: `uci`, `san`, win/draw/loss counts, `averageOpponentRating`
- `opening` object: **ECO code** (e.g., `B20`) and **opening name** (e.g., `Sicilian Defence`)
- `recentGames` — up to 15 recent games with players, ratings, speed, outcome, date
- `topGames` — notable games at the position

**Critical note (as of 2026-04):** The public endpoint `explorer.lichess.ovh` has been returning HTTP 429 intermittently under high load (tracked in lila issue #19610). The in-browser explorer on lichess.org works. Pablo should implement retry/fallback logic and cache responses aggressively (positions don't change much; cache for 24h is safe).

**Lichess Player Games API** (`/api/games/user/{username}`) also lets you fetch all games for a player with PGN headers including ECO codes and opening names — useful for building a player's opening history.

### Chess.com Public API

**Key endpoint for player games:**
`GET https://api.chess.com/pub/player/{username}/games/{YYYY}/{MM}`

Returns all games for a player as JSON, where each game's PGN block includes:
- `[ECO "B20"]` — ECO code
- `[ECOUrl "https://www.chess.com/openings/..."]` — Opening name
- Full PGN movelist

**What you do NOT get from the API:**
- No aggregate opening stats (win rate by ECO) — must compute by downloading all monthly archives
- No opening explorer-style move tree endpoint
- No opponent tendency endpoint

**Rate limits:** No published per-minute cap; >2 parallel requests triggers HTTP 429. Work sequentially for bulk pulls.

**For opening performance data:** Pablo must download Chess.com monthly game archives, parse ECO headers, and compute win/draw/loss rates per opening per player. This is fully feasible.

### Free PGN Databases

| Source | Status | Size | Annotated? | Notes |
|---|---|---|---|---|
| **TWIC** (theweekinchess.com/twic) | Active | 4M+ games | No | Weekly update since 1994, issue 1640+ as of 2026-04 |
| **Lumbra's Gigabase** (lumbrasgigabase.com) | Active | 10M+ OTB, 7.6M online | No | Best free bulk database, monthly updates |
| **PGN Mentor** (pgnmentor.com) | Active | 500+ player files + ECO-organized files | No | Organized by ECO — perfect for opening-specific pulls |
| **ChessBase Online** (database.chessbase.com) | Active (free search tier) | 8M searchable | No (free tier) | 113K annotated games in paid Mega Database (~$199/yr) |
| **Chessgames.com** | Active | 638K games | Community notes | Free browsing; bulk download requires paid membership |
| ~~Caissabase~~ | Defunct (2022) | — | — | Replaced by Lumbra's |

**For Pablo specifically:**
- **PGN Mentor's ECO-organized files** are the most immediately useful — they're already sorted by opening, ideal for populating opening-specific example games without parsing a bulk database.
- **TWIC** provides the freshest competitive data for novelty detection.
- **Lumbra's Gigabase** is the best free bulk source for statistical analysis if Pablo builds its own backend opening stats.

### What "Scryfall for Chess" Looks Like

There is no chess equivalent to Scryfall (no single clean API returning fully structured opening theory). The closest combination:
1. Lichess opening explorer → win rates + move trees per position by Elo range
2. PGN Mentor → opening-organized game files for examples
3. Chess.com player API → player-specific game history with ECO codes
4. TWIC/Lumbra → bulk game corpus for statistical analysis

Pablo's coaching engine should treat these as complementary data sources, not alternatives.

---

## 2. What Makes Good Opening Prep at Different Elo Levels

*(Full detail in `lib/openings/elo-calibration.md`. Summary here for the brief.)*

### 1200–1400: "Learn to Walk"
**Coach focus:** Stop losing material, develop pieces, castle.

What matters:
- Moving the same piece twice = red flag
- Castle within 12 moves
- Learn the one-sentence goal of your opening
- Avoid complex variations (no Najdorf, Grünfeld, Dragon)

Pablo's coaching at this level ignores theory almost entirely. It's behavioral: "You moved the same knight three times. That's why you lost."

**Recommended openings:** London System (White), Caro-Kann (vs 1.e4), QGD (vs 1.d4)

### 1400–1600: "Learn the Map"
**Coach focus:** Pawn structures, strategic goals, why moves work.

What matters:
- Every opening creates a pawn structure; that structure defines the plan for 30 moves
- Recognize tactical patterns specific to YOUR opening (not generic tactics)
- Pick 2-3 openings and stick to them — stop repertoire jumping
- Learn the weak squares your opening creates

Pablo at this level introduces positional concepts tied specifically to what the player already plays: "You're playing the French. Here's what the pawn structure on e5-d5 actually means for your plan."

**Recommended openings:** Italian Giuoco Piano (White), French Advance (vs 1.e4), Nimzo-Indian (vs 1.d4)

### 1600–1800: "The Hard Work"
**Coach focus:** Concrete plans, critical moves, known traps, move-order awareness.

What matters:
- Every opening has 2-3 critical moves that define it — players should know these and WHY
- Trap awareness (not to SET traps but to AVOID known ones)
- Move-order matters: introduce transpositions
- Opening preparation depth: know your opening to move 10-12 in the main lines
- Recognize the endgame your opening leads to

Pablo here gets specific: "You were caught in the Noah's Ark Trap twice this month. Here's why it keeps happening and here's the fix."

**Recommended openings:** Ruy Lopez beginning (White), Sicilian pick ONE variation (vs 1.e4), Nimzo + Queen's Indian package (vs 1.d4)

### 1800–2000: "Serious Preparation"
**Coach focus:** Deep prep on 1-2 lines, transpositions, model games, opponent research.

What matters:
- Know ONE Sicilian variation to move 20, not all of them to move 6
- Study transpositional tricks actively — these are weapons
- Study 5-10 model games per opening for motifs, not memorization
- Know what endgames your opening leads to and how to win them
- Start treating opening prep as opponent research

Pablo here is a GM's training partner: "You've played the KID 80 times. You don't know the Mar del Plata. Here are 5 Kasparov games that show you exactly what to do when White plays c5."

**Recommended openings:** Ruy Lopez (deepen), one deep Sicilian variation, Nimzo-Indian or Grünfeld

### 2000–2200: "Professional Preparation"
**Coach focus:** Novelties, opponent-specific prep, endgame transitions, psychological weapons.

What matters:
- Find and use novelties — know where theory ends in your lines
- Opponent-specific preparation before every tournament game
- Psychological opening choices (Berlin to frustrate attackers, London to bore aggressive players)
- Anti-preparation: know what opponents will prep against you; have a secondary system

Pablo here acts as a seconds/second-opinion analyst: "Your Nimzo works except against Classical 4.Qc2. Here's why you're 2/8 there and here's the fix."

**Recommended openings:** One deep system each for White and Black

### Cross-Elo Principle: Advice Must Be Specific
Pablo never says "just develop your pieces" or "study tactics." Every piece of advice names the specific move, explains the cause and effect, and references one concrete resource (model game, specific line, principle). This applies at every Elo level — only the complexity of the specific advice changes.

---

## 3. Opening Weakness Patterns

*(Full detail in `lib/openings/catalog.json` and `lib/openings/coaching-scripts.md`. Key highlights here.)*

### Common Openings That Club Players Consistently Misplay

**Sicilian Dragon (B70-B79)**
- 1200–1600 mistake: Trading the Dragon bishop voluntarily, not understanding it's the soul of the defense
- 1600–1800 mistake: Not knowing the Yugoslav Attack — getting mated on h6/g7 without understanding why
- Fix: Before playing the Dragon, players must understand "what does gxf6 actually do to my king?"

**King's Indian Defense (E60-E99)**
- 1200–1600 mistake: Playing the setup but not pushing ...f5; copying White's moves instead of counterattacking
- 1600–1800 mistake: Not recognizing the race between White's c5 push and Black's f4 push; switching strategy too late
- Fix: The KID is a tactical opening requiring concrete knowledge of when to attack and when to defend

**French Defense (C00-C19)**
- 1200–1600 mistake: Playing ...Nc6 before ...c5, getting the move order backwards
- 1600–1800 mistake: Having the "bad" French bishop and not knowing what to do about it (trade it for the c1 bishop, redeploy via d7-e8-h5, or accept it)
- Fix: Teach the pawn chain concept first; the moves follow from understanding the structure

**Ruy Lopez (C60-C99)**
- 1200–1600 mistake: Not knowing what to do after the opening ends (by move 10, they're lost)
- 1600–1800 mistake: Falling into the Noah's Ark Trap (bishop trapped by ...c4-b4)
- 2000+ mistake: Not knowing the Ruy Lopez rook endgame techniques

**QGD / London System**
- 1200–1600 mistake (London as Black): Not challenging the center; playing too passively and getting squeezed
- 1400–1600 mistake (London as White): Setting up the structure correctly but having no plan after move 10

### "Punch Above Your Weight" Openings

*(Full detail in `lib/openings/punch-above-weight.md`)*

Top recommendations by mechanism:

**Preparation asymmetry (opponent never studied it):**
- Budapest Gambit (Black vs 1.d4): Works 1000–1700; almost no one above 1600 prepares it
- Trompowsky Attack (White): Works 1400–2100; KID/Nimzo specialists can't play their pet lines

**Psychological reversal (opponent's confidence is their weakness):**
- Alekhine's Defense (Black vs 1.e4): White builds a huge center, then discovers it's a liability
- Benoni Defense (Black vs 1.d4): Forces positional grinders into imbalanced territory they hate

**Direct kingside attack before opponent can orient:**
- King's Gambit (White): Works 1000–2000; modern players aren't prepared for chaos from move 2
- Grand Prix Attack vs Sicilian (White): Bypasses all of Black's Sicilian preparation

**Pablo's warning about all of these:** They work because of preparation asymmetry, not objective superiority. Useful as weapons; not suitable as a player's entire identity above 2000.

---

## 4. AI + Chess Coaching Landscape

### What Currently Exists

**Chessable**
- Core tech: MoveTrainer (spaced repetition / SM-2 algorithm) for learning opening lines
- 1,000+ courses by GMs; 2M+ registered users
- PRO tier: ~$99/year for 300+ short courses
- **Limitation:** Linear, curated courses. No integration with your actual game history. No gap analysis ("you misplay the French but have 8 French courses you haven't touched"). No conversational interface.
- AI component is limited to spaced repetition scheduling, not LLM-based explanation.

**Chess.com Learn**
- Structured video lessons (Gold tier+, ~$4/month)
- Game Explorer: 3M master games, win/draw/loss per move, web only, no public API
- Opening Insights (Diamond tier): Personal opening stats with AI-generated "Coach Explanations" — text summaries of opening play. Post-game, not interactive.
- "Play with a Coach" bot: Real-time feedback during games against an AI. Adaptive.
- **Limitation:** Opening Insights requires Diamond (most expensive tier). Not personalized to your specific opening gaps; it tells you your win rates but doesn't prescribe a targeted study plan.

**Stockfish / engine analysis**
- Tells you what the best move was. Does not explain WHY at your level. Does not connect the opening mistake to a long-term plan. Does not know who you are as a player.

**Aimchess** (owned by Chess.com / Play Magnus Group)
- Analyzes game history from Chess.com and Lichess
- Opening breakdown by ECO with win rates and mistake patterns
- Opponent prep reports (40-game analysis of opponent tendencies)
- ~$7.99/month
- **Limitation:** Analytical/reporting tool. Not conversational. Not prescriptive about what to study next.

**Noctie.ai**
- Learn by playing: AI opponent that plays your chosen opening against you, gives hints
- Generates puzzles from your mistakes
- Custom repertoire import supported
- ~$9/month annually
- **Limitation:** Play-based learning only. No voice persona. No "coach explaining what you got wrong."

**Chessline.io**
- Generates a full personalized opening repertoire from real game data + engine analysis
- Claims opponent-specific prep
- Targeted at club players
- **Limitation:** Repertoire generation tool, not a coach. Doesn't have a persona or voice. Doesn't adapt over time as you play.

**Sensei Chess, CircleChess, Chessvia**
- Various "AI chess coach" startups doing post-game analysis + personalized training suggestions
- None appear to have a coherent personality/voice; most are analytics dashboards with AI-generated text

### The Gap Pablo Fills

The entire market has a single blind spot: **there is no opinionated coach with a voice.**

Every existing product is either:
1. A **database** (Chessable, ChessBase) — you look things up, there's no one guiding you
2. An **analytics dashboard** (Aimchess, Chess.com Insights) — charts and stats, no prescriptive voice
3. A **learning mode** (Noctie, Chessable MoveTrainer) — you drill moves, no one explains the strategy
4. A **bot opponent** (Chess.com Coach bot) — no personality, no memory, no coach identity

What they all lack is what makes human coaching work: **a specific person with opinions who knows your games and tells you what to do next in plain language.**

Pablo's differentiators:
- **Persistent identity**: Pablo is a character with opinions (pro-1.e4, skeptical of London for club players, thinks Sicilian Dragon is misunderstood at club level). This creates trust and recall.
- **Opinionated prescriptions**: Not "here are your win rates." Instead: "You're playing the Dragon and you keep trading your bishop. Stop. Here's why."
- **Voice-connected coaching**: The combination of a recognizable voice + chess expertise is untested in the market.
- **Game history + personality**: Unlike Aimchess (pure analytics) or Chessable (pure content), Pablo connects your specific game history to coaching advice in a conversational way.

### Positioning Summary

| Product | Strengths | Weakness vs Pablo |
|---|---|---|
| Chessable | Deep content, GM courses | No game history integration; no personality |
| Chess.com Insights | Native game history; large user base | No voice; Diamond-only; not prescriptive |
| Aimchess | Best game analytics | No voice; not conversational |
| Noctie | Play-based learning | No persona; limited to practice games |
| Stockfish | Engine accuracy | Zero human context; no explanation |
| Pablo | Personality + game history + prescriptive voice | Building |

---

## API Integration Recommendations for Pablo's Engine

Based on the research, here's the priority stack for Pablo's data layer:

1. **Chess.com player API** (primary game source): Pull monthly archives, parse ECO codes, compute opening stats per player. Free, no auth required.

2. **Lichess player games API**: Secondary source for Lichess users. Same data, similar structure.

3. **Lichess opening explorer** (`explorer.lichess.ovh/lichess`): Get win rates by Elo bucket for specific positions. Cache heavily (24h+). Implement retry/fallback for the 429 issues.

4. **PGN Mentor ECO files**: Pre-load representative model games per opening for Pablo to reference when coaching ("Look at this Karpov game from the Ruy Lopez — this is exactly the knight maneuver I'm describing").

5. **Lichess masters explorer**: For 2000+ players, use the masters endpoint to show what theory says at the highest level vs what the player does.

**Do NOT build:**
- A proprietary opening database from scratch — Lichess's is better and free
- Annotated game parsing pipeline from ChessBase Mega — the cost ($199/year) isn't justified when PGN Mentor + TWIC give 80% of what's needed for free

---

## Content Strategy Implications

### Immediate coaching engine priorities based on this research:

1. **ECO-to-coaching-script mapping is already done** (see `lib/openings/catalog.json` and `coaching-scripts.md`). The gap is connecting player game history to these scripts automatically.

2. **The Lichess opening explorer API should be Pablo's first live data integration.** Even with 429 issues, it returns exactly the right data: win rates by position by Elo range. A player's position after move 8 can be fed directly to this API to find: "At your Elo (1600), 68% of games in this position are won by Black. Here's why."

3. **Chess.com game history is the preferred player data source** — more players are on Chess.com, the API is more reliable, and ECO codes are already in the PGN headers.

4. **Noctie is the closest thing to a competitor** in the "AI coaching persona" space. Key distinction: Noctie is a bot you play against; Pablo is a coach who reviews your games. Different use cases, complementary rather than directly competing.

5. **Chessable is more competitor than tool** — there's an argument for Chessable integration (link out to courses as a "study this" recommendation), but Chessable itself will eventually build the personalized coach. Pablo should not depend on Chessable's platform.

---

## Sources

- Lichess API docs: lichess.org/api
- lila-openingexplorer GitHub: github.com/lichess-org/lila-openingexplorer
- Chess.com Published Data API: support.chess.com/articles/9650547
- PGN Mentor: pgnmentor.com/files.html
- Lumbra's Gigabase: lumbrasgigabase.com
- TWIC: theweekinchess.com/twic
- ChessBase Online: database.chessbase.com
- Chessable: chessable.com
- Noctie.ai: noctie.ai
- Chessline.io: chessline.io
- Aimchess: aimchess.com
- Sensei Chess: senseichess.com
- Chess.com Opening Insights: support.chess.com/articles/8705347
