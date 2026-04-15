# Pablo Opening Database

## Overview
This directory contains Pablo's comprehensive chess opening knowledge base — the engine's brain for opening recognition, coaching, and personalized prep advice.

## Files

### `catalog.json`
Core opening catalog with 25+ major openings covering:
- All 1.e4 openings (Italian, Ruy Lopez, King's Gambit, Vienna, Four Knights)
- All major Sicilian variations (Najdorf, Dragon, Scheveningen, Kan)
- All 1.e4 Black defenses (French, Caro-Kann, Pirc, Alekhine, Scandinavian)
- All 1.d4 openings (London, QGD, QGA, Colle)
- All 1.d4 Black defenses (KID, Nimzo-Indian, Queen's Indian, Grünfeld, Benoni, Dutch, Budapest, Tarrasch)
- Flank openings (English, Réti, Bird's, Larsen's)

Each entry contains:
- ECO codes, names, move orders
- Variations with brief descriptions
- Strategic themes, typical plans, key pieces
- Common mistakes by Elo bracket (club vs intermediate)
- Critical moves with explanations
- Traps and tricks
- Model games with study rationale
- Elo suitability range
- **Pablo's opinion** (in voice)
- Recommended study order
- Weakness signals for player matching

### `transpositions.md`
Complete transposition and move-order map covering:
- Five major transposition networks (e4-e5 web, Sicilian web, Indian defenses, Queen's pawn, Flank openings)
- Critical move-order tricks players use to reach favorable lines
- Lines that look similar but require different plans (with comparison table)
- Lichess API integration points for dynamic data enrichment

### `coaching-scripts.md`
20 Pablo-voice coaching scripts for the most common openings. Each script:
- Names a specific problem pattern
- Diagnoses the cause in chess terms
- Gives a concrete fix
- Sounds like Pablo: direct, opinionated, vivid

Plus a reusable template for generating scripts for unlisted openings.

### `elo-calibration.md`
Elo-specific coaching calibration for 5 brackets:
- 1200–1400: Basic development and piece safety
- 1400–1600: Pawn structure and strategic goals
- 1600–1800: Critical moves, traps, concrete plans
- 1800–2000: Deep prep, transpositions, model games
- 2000–2200: Novelties, opponent prep, endgame transitions

Includes red flags Pablo watches for, opening recommendations per bracket, and sample messages.

### `punch-above-weight.md`
10 "upset weapon" openings with:
- Why they work against higher-rated opponents
- Psychological and tactical advantages
- Most effective Elo range
- What the opponent typically doesn't know

## How Pablo Uses This Database

1. **Opening recognition:** Match FEN positions to catalog entries to identify the opening in play
2. **Weakness detection:** Compare player's game patterns to `weakness_signals` arrays
3. **Coaching generation:** Use `pablo_opinion`, `common_mistakes_*`, and coaching scripts
4. **Elo calibration:** Filter advice through the elo-calibration guidelines
5. **Prep generation:** Use `recommended_study_order` and `model_games` for study plans
6. **Transposition awareness:** Flag when players enter unexpected opening territory

## Lichess API Enhancement
Real-time data from `https://explorer.lichess.ovh/lichess` can dynamically enrich:
- Win rates per variation per Elo range
- Most common player moves vs mainline theory
- Divergence point detection (where players leave known theory)

Feed current game FEN positions into the API during analysis to detect opening territory and flag deviations.
