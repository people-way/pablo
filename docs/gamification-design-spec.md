# Pablo Gamification Design Spec
**Version:** 1.0 — April 2026
**Audience:** Frontend developer (build spec)
**Status:** Ready for implementation

---

## Overview

Pablo's gamification model follows a **Duolingo-for-chess** philosophy:

- **Free users** get the full opening analysis experience — no paywall on insights.
- **The upgrade is account creation.** Signing up unlocks streak tracking, opening mastery progression, XP rank, and badges.
- Every mechanic reinforces one behavior: **run a new analysis.**

---

## 1. Opening Mastery Framework

### 5-Level Mastery System

Each opening (e.g. "Sicilian as Black", "London System as White") has its own mastery level calculated independently.

| Level | Name | Win Rate | Min Games | Icon |
|-------|------|----------|-----------|------|
| 1 | **Pawn** | < 40% | 3+ | ♟ (dim gray pawn) |
| 2 | **Knight** | 40–50% | 5+ | ♞ (slate knight) |
| 3 | **Bishop** | 50–60% | 8+ | ♝ (amber bishop) |
| 4 | **Rook** | 60–70% | 10+ | ♜ (gold rook) |
| 5 | **King** | > 70% | 15+ | ♚ (bright gold king, glowing) |

**Edge case:** If a user has played 3–4 games in an opening and win rate is above 60%, they stay at Level 2 until minimum games are met. Pablo acknowledges this:
> *"Early days. Play more games before I count this as real."*

---

### Pablo Voice Per Level

**Level 1 — Pawn**
> "You're getting destroyed in this opening. Every time you play it, you hand your opponent a free advantage before move 10. We're fixing this — starting now."

**Level 2 — Knight**
> "You're fighting, but you keep falling into the same positions. You know enough to survive. You don't know enough to win. Let's close that gap."

**Level 3 — Bishop**
> "You're competitive here. Above 50% means you understand the basic ideas. But you're leaving points on the board. The next level is about precision, not survival."

**Level 4 — Rook**
> "You're dangerous in this opening. Opponents who don't know your prep are in trouble. Keep the pressure on — don't let this slip."

**Level 5 — King**
> "You've mastered this. When you reach this rating in this opening, most players at your level won't want to play into it. This is a solved problem. Let's find your next one."

---

### Visual Design: Mastery Level Indicators

**Mastery pip row** (used in opening cards):
- 5 chess piece icons displayed in a horizontal row
- Active levels: filled/colored to the appropriate icon
- Inactive levels: dim gray outline
- Current level piece pulses gently on hover
- Example: Level 3 = ♟♞♝(active/amber) ♜♚(dim/outline)

**Opening card layout:**
```
┌────────────────────────────────────────┐
│  SICILIAN — AS BLACK                   │
│  ♟ ♞ ♝ · ·   Level 3 — Bishop         │
│  Win rate: 54% · 12 games              │
│  ↑ +7% since last month  [sparkline]   │
│  "You're competitive here..."          │
└────────────────────────────────────────┘
```

---

### How Mastery Is Recalculated

When a user runs a new analysis:

1. Import recent games (last 90 days, up to 50 games by default).
2. Group by `openingFamily + color`.
3. For each group: count games, calculate win rate.
4. Map to level table above.
5. If level increased: trigger XP award + toast notification.
6. If level decreased (win rate dropped): Pablo says something direct (see streak/messages section).

**Frequency cap:** Mastery only recalculates when at least 1 new game has been added since the last analysis. No inflation from re-running the same data.

---

## 2. XP & Points System

### How You Earn XP

| Action | XP Awarded | Notes |
|--------|-----------|-------|
| Run your first analysis (ever) | +100 XP | One-time new account bonus |
| Run a new analysis | +25 XP | Requires at least 3 new games |
| Opening mastery level up (any opening) | +75 XP | Per level, per opening |
| Maintain weekly streak (7 consecutive weeks) | +50 XP | Awarded at each weekly milestone |
| Earn a badge | +100 XP | Per badge, one-time |
| Reach Level 5 in any opening | +200 XP | Bonus on top of level-up XP |

### XP Rank Thresholds (Pablo Ranks)

| Rank | Name | XP Required | Icon |
|------|------|-------------|------|
| 0 | **Pawn** | 0 | ♟ gray |
| 1 | **Knight** | 250 | ♞ slate |
| 2 | **Bishop** | 750 | ♝ amber |
| 3 | **Rook** | 1,500 | ♜ gold |
| 4 | **Queen** | 3,000 | ♛ bright gold |
| 5 | **King** | 6,000 | ♚ gold w/ crown glow |

A dedicated **Grandmaster** tier (10,000 XP) can be introduced later as aspirational.

### How XP Is Displayed

**Progress bar** in header/dashboard:
```
♞ KNIGHT   ███████░░░░░   320 / 750 XP
```

- Dark slate background, amber/gold fill
- Current rank icon on the left
- Next rank icon (dim) on the right
- XP amount shown as `current / threshold`
- On rank-up: full-screen celebration animation, Pablo line

**Rank badge** (shown on profile, opening cards, badges):
- Small chess piece icon + rank name
- Color-coded to match rank tier
- Shown in navbar next to username once logged in

---

## 3. Streak Mechanics

### What Counts as a Streak

**Unit:** Weekly (not daily — more sustainable, less punishing)

**Definition:** Run at least **1 new analysis per 7-day window** to keep the streak alive.
A "new analysis" = at minimum 3 new games since the last run.

**Why weekly?** Chess players don't play every day. Weekly streaks respect the rhythm of club players, tournament players, and casual players without punishing real life.

**Streak counter:** Shows "X-week streak 🔥" in the dashboard header.

---

### Pablo's Streak Messages

**Breaking a streak (sent via dashboard notification):**

> "Your streak broke. I'm not going to pretend that's fine — streaks die from not showing up. But here's the thing: one week off means nothing if you come back. Your progress is still here. Run an analysis today."

**Restarting a streak after a break:**

> "Back at it. That's what matters. Let's not make a habit of disappearing."

---

**Milestone: 4-week streak (1 month)**

> "Four weeks straight. You've looked at your games more this month than most players do in a year. Your opening stats are starting to tell a real story — check your progress."

**Milestone: 7-week streak**

> "Seven weeks. You're not dabbling anymore. This is a habit. The players who improve consistently are the ones who look at their games consistently. Keep going."

**Milestone: 12-week streak (3 months)**

> "Three months. You've turned this into a practice. Whatever you're doing, you've earned your current rating trajectory. The question now is: what's the opening that still scares you? Let's go there."

**Milestone: 26-week streak (6 months)**

> "Six months of consistent work. Most players won't ever put in this kind of time. You're not most players. Your opening preparation is now measurably better than it was — look at how your mastery cards have shifted."

---

## 4. Badge System

### Badge Design Rules

- Badges are hexagonal tiles (chess aesthetic — evokes shield/crest)
- Earned: full color, glowing border
- Locked: dark gray, padlock icon, condition shown on hover
- Badge shelf: horizontal scrollable row on dashboard
- Notification: toast + XP reward on unlock

---

### Badge List (20 Badges)

#### Opening Mastery Badges

| Badge Name | Unlock Condition |
|-----------|-----------------|
| **Sicilian Assassin** | Reach Level 4 in Sicilian as Black |
| **Sicilian Overlord** | Reach Level 5 in Sicilian as Black (15+ games) |
| **London Calling** | Reach Level 4 in London System as White |
| **Caro-Kann Commander** | Reach Level 4 in Caro-Kann as Black |
| **King's Gambit Gambler** | Reach Level 4 in King's Gambit as White |
| **French Connection** | Reach Level 4 in French Defense as Black |
| **Italian Stallion** | Reach Level 4 in Italian Game as White |
| **Dragon Tamer** | Reach Level 5 in Sicilian Dragon as Black |
| **Grünfeld Grandmaster** | Reach Level 4 in Grünfeld as Black |
| **KID Specialist** | Reach Level 4 in King's Indian Defense as Black |

#### Performance Badges

| Badge Name | Unlock Condition |
|-----------|-----------------|
| **Opening Punisher** | Win 5 games against opponents rated 200+ above you in your best opening |
| **Consistency Engine** | Maintain ≥ 60% win rate in any single opening across 20+ games |
| **Comeback King** | Improve an opening from Level 1 to Level 3 within 30 days |
| **Multi-Weapon** | Reach Level 3+ in 3 different openings (any color) |
| **Color Balanced** | Reach Level 3+ in one White opening AND one Black opening |

#### Habit Badges

| Badge Name | Unlock Condition |
|-----------|-----------------|
| **First Look** | Run your first analysis after creating an account |
| **Weekly Warrior** | Maintain a 4-week streak |
| **Iron Analyst** | Maintain a 12-week streak |
| **Prep Master** | Run analyses in 3 different weeks in the same calendar month |
| **Opening Collector** | Have mastery data on 5+ different openings |

---

### Pablo Badge Toast Messages (examples)

**Sicilian Assassin unlocked:**
> "Sicilian Assassin. You've earned it — your win rate as Black in the Sicilian puts you ahead of most club players. Opponents hate playing you in this line."

**Comeback King unlocked:**
> "Comeback King. Three weeks ago you were getting destroyed in that opening. Now you're winning 60%+ of those games. That's what the work looks like."

**Opening Punisher unlocked:**
> "Opening Punisher. You beat five players rated 200 points above you in your best opening. That's not luck — that's preparation meeting opportunity."

---

## 5. Dashboard UX

### Layout Description

#### Above the Fold

```
┌──────────────────────────────────────────────────────────┐
│  ♚ PABLO           [♞ Knight — 320 XP ████░ 750]  [user▼] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  🔥 7-week streak                                        │
│                                                          │
│  "Good. You're back. Let's see what your games          │
│   are telling us this week."           — Pablo           │
│                                                          │
│  ┌────────────────────┐  ┌─────────────────────────────┐ │
│  │  RUN NEW ANALYSIS  │  │  YOUR OPENING SUMMARY       │ │
│  │  [Gold CTA button] │  │  2 improving · 1 declining  │ │
│  └────────────────────┘  └─────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Key decisions:**
- Streak counter is **above the fold, left side** — immediately visible, reinforces habit
- Rank progress bar is in the **header/nav** — persistent, low-key motivation
- Pablo's greeting is **personalized** (see greeting variants below)
- Primary CTA is **"Run New Analysis"** — the one behavior that drives all metrics

---

#### Opening Mastery Cards (main body)

Cards are displayed in a **2-column grid** on desktop, single column on mobile.

**Sort order:** Weakest openings (lowest level) appear first by default. Option to sort by "Most games" or "Recent improvement."

**Card design:**
```
┌─────────────────────────────────────────┐
│  SICILIAN · BLACK           ♟♞♝ · ·     │
│  Level 3 — Bishop                       │
│  Win rate: 54%  ·  12 games             │
│  ━━━━━━━━━━━━━━━━━━                     │
│  [sparkline: last 6 analyses]           │
│  ↑ +7% since last month                │
│  "You're competitive here. Precision    │
│   is what separates you from Level 4." │
└─────────────────────────────────────────┘
```

If Level 4+, show badge earned (or badge progress if not yet earned):
```
│  🏅 Sicilian Assassin (unlocked)        │
```
or
```
│  ⬡ Sicilian Assassin — need Level 4 (2% away)  │
```

---

#### Streak Counter Position

- **Primary:** Top left of dashboard, above the fold
- **Secondary:** Shown in opening card tooltip ("Analyzed this opening 3 weeks in a row")
- Format: **"🔥 7-week streak"** or **"⬜ No active streak"** if broken

---

#### Badge Shelf Position

- **Below the fold**, full-width horizontal scrollable shelf
- Header: **"Your Badges"** with count (e.g. "3 of 20")
- Earned badges are full color; locked are dim with hover tooltip showing unlock condition
- Clicking a badge shows Pablo's unlock message and XP awarded

---

### Pablo Dashboard Greeting Variants

**No streak (first visit or streak broken):**
> "Let's get started. Run an analysis and I'll show you exactly where you're losing."

**Streak day 1 restart:**
> "Back at it. Your progress is still here. Let's pick up where we left off."

**Active streak, 1–3 weeks:**
> "You're building a habit. That matters more than you think. Let's see your games."

**Active streak, 4–11 weeks:**
> "Solid. You've been showing up consistently. Your opening data is getting meaningful."

**Active streak, 12+ weeks:**
> "Three months of consistent work. Your stats are starting to look like a serious player's prep. What's next?"

**After a mastery level-up (most recent):**
> "Your [OPENING] is improving. Level [X] — that's real progress. Let's keep it moving."

**After earning a badge:**
> "You just earned [BADGE NAME]. That's not a participation trophy — you earned it. Check your badge shelf."

---

### Primary CTA

**Button text:** "Run New Analysis"
**Button style:** Gold fill, dark text, full-width on mobile, prominent on desktop
**Subtext under button:** "Last analyzed: [relative date, e.g. '3 days ago']"

On first visit (no analyses yet):
> "Your opening stats update every time you run an analysis. Start now."

---

## 6. Conversion Hook: Free → Account Creation

### The Moment

The anonymous user has just finished viewing their opening weakness report on `/analyze`. They can see:
- Their overall win rate stats
- Up to 3 opening weaknesses with Pablo diagnosis
- Pablo's summary message

**This is the highest-intent moment in the funnel.**

---

### What Pablo Says (the conversion message)

This appears as a bottom sheet / modal that slides up after the user has scrolled to the bottom of their report, or after 8 seconds of dwell time on the results page.

**Pablo's face (avatar)** is shown — large, personal.

---

**Conversion copy:**

> **"Here's the thing."**
>
> I just showed you where you're losing games. That's real — those numbers are from your actual games.
>
> But right now? The moment you close this tab, that analysis is gone. I can't track your improvement. I can't tell you when your Sicilian goes from 38% to 55%. I can't show you your streak.
>
> **Create a free account and I'll remember all of this.**
>
> Every time you run an analysis, I'll track your progress, update your opening mastery levels, and tell you exactly what changed. No subscription. No credit card. Just your game history and a path to a better rating.
>
> *— Pablo*

---

### The Sign-Up Prompt Design

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   [Pablo avatar — large, direct gaze]               │
│                                                     │
│   "Here's the thing."                               │
│                                                     │
│   [3-paragraph copy above]                          │
│                                                     │
│   ┌─────────────────────────────────────────────┐   │
│   │  Your email                                 │   │
│   │  ─────────────────────────────────────────  │   │
│   │  [email input field]                        │   │
│   └─────────────────────────────────────────────┘   │
│                                                     │
│   [  SAVE MY PROGRESS — IT'S FREE  ]  (gold CTA)    │
│                                                     │
│   We'll send you a magic link. No password needed.  │
│                                                     │
│   ─────────────────────────────────────────────     │
│   [  Keep browsing without saving  ]  (text link)   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Key design decisions:**

1. **"Save my progress"** — not "Sign up." Framing is saving what they already have, not starting something new.
2. **"It's free"** is explicit in the button — removes the hesitation before the click.
3. **No password** — magic link removes friction. Pablo mentions it.
4. **Dismissal option is a text link, not a button** — present, but de-emphasized.
5. **Pablo's face is prominent** — this is an invitation from him, not a system wall.

---

### Post-Signup: First-Use Onboarding (30 seconds)

After confirming email and landing on `/dashboard` for the first time:

**Pablo says:**
> "Welcome. I've saved your analysis. This is your dashboard — I'll track every opening you play here. Run your first real analysis and I'll start building your profile."

**CTA:** "Run My First Analysis" → `/analyze?username=[their_chess_com_username]`

If no username is set yet:
> "What's your Chess.com username? I'll pull your games."

---

## 7. Implementation Notes for Frontend Developer

### State Flags to Track

| Flag | Where Used |
|------|-----------|
| `masteryLevel` (1–5 per opening) | Opening cards, badge eligibility |
| `streakWeeks` (integer) | Dashboard header, milestone messages |
| `xpTotal` (integer) | Rank calculation, progress bar |
| `rank` (0–5) | Navbar badge, rank-up celebration |
| `badges[]` (array of badge IDs) | Badge shelf, toast notifications |
| `lastAnalysisDate` | Streak calculation, "last analyzed" CTA subtext |

### Mastery Calculation Function (pseudocode)

```typescript
function calculateMastery(openingStats: OpeningStats): MasteryLevel {
  const { games_played, win_rate } = openingStats;

  if (games_played < 3) return null; // Not enough data

  if (win_rate < 0.40 && games_played >= 3)  return 1; // Pawn
  if (win_rate < 0.50 && games_played >= 5)  return 2; // Knight
  if (win_rate < 0.60 && games_played >= 8)  return 3; // Bishop
  if (win_rate < 0.70 && games_played >= 10) return 4; // Rook
  if (win_rate >= 0.70 && games_played >= 15) return 5; // King

  // Not enough games for the win rate bucket — use lower bound
  if (win_rate >= 0.70 && games_played < 15) return 4;
  if (win_rate >= 0.60 && games_played < 10) return 3;
  if (win_rate >= 0.50 && games_played < 8)  return 2;
  return 1;
}
```

### XP Award Events (emit on these DB writes)

```typescript
type XPEvent =
  | { type: 'first_analysis'; xp: 100 }
  | { type: 'new_analysis'; xp: 25 }
  | { type: 'mastery_level_up'; opening: string; newLevel: number; xp: 75 }
  | { type: 'mastery_level_5'; opening: string; xp: 200 }
  | { type: 'badge_earned'; badgeId: string; xp: 100 }
  | { type: 'streak_milestone'; weeks: number; xp: 50 }
```

### Database Schema Additions Needed

Add to existing `users` table (or separate `user_progression` table):
```sql
xp_total       INTEGER DEFAULT 0
rank           INTEGER DEFAULT 0  -- 0-5 enum
streak_weeks   INTEGER DEFAULT 0
last_analysis  TIMESTAMP
```

Add `badges` table:
```sql
CREATE TABLE user_badges (
  user_id    INTEGER REFERENCES users(id),
  badge_id   VARCHAR(64),
  earned_at  TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);
```

---

## Summary

This spec defines a complete gamification loop:

1. **Anonymous user** → sees opening analysis → hit with Pablo's personal conversion CTA
2. **New account** → saves progress → sees mastery levels + streak start
3. **Weekly habit** → runs analysis → XP earned + mastery levels update
4. **Milestones** → badges earned + rank ups → Pablo acknowledges with direct, character-consistent copy
5. **Long-term retention** → opening mastery progression + streak milestones → invested users with real data on their game

The entire system reinforces one behavior: **run a new analysis.** Everything else follows from that.
