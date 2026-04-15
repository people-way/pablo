# Opening Transposition & Transition Map

## What This Document Does
This map tracks common transpositions, move-order tricks, and deceptive similarities between openings. Pablo uses this to warn players about unexpected territory and to flag move-order opportunities.

---

## Major Transposition Networks

### Network 1: 1.e4 e5 Web
```
1.e4 e5
├── 2.Nf3 Nc6 3.Bc4       → Italian Game / Two Knights
│   └── 3...Nf6           → Two Knights Defense
│   └── 3...Bc5           → Giuoco Piano / Evans Gambit (4.b4)
├── 2.Nf3 Nc6 3.Bb5       → Ruy Lopez
│   └── 3...Nf6           → Berlin Defense
│   └── 3...a6            → Closed/Open Ruy Lopez
├── 2.Nc3                  → Vienna Game
│   └── 2...Nf6 3.Bc4     → Vienna (or transposes to 3.f4 Vienna Gambit)
│   └── 3.f4              → Vienna Gambit ≈ King's Gambit + Nc3
├── 2.f4                   → King's Gambit
└── 2.Nf3 Nc6 3.d4        → Scotch Game
    └── 3...exd4 4.Nxd4   → Scotch Four Knights or Scotch Game main lines
```

**Move-order tricks:**
- `1.e4 e5 2.Nc3 Nf6 3.Bc4` vs `3.f4`: White decides between Vienna and Vienna Gambit based on Black's move. If Black plays ...Bc5, f4 is stronger. If Black plays ...Nf6, Bc4 leads to interesting tactical positions.
- The Four Knights (2.Nf3 Nc6 3.Nc3 Nf6) can TRANSPOSE to Ruy Lopez via 4.Bb5, or to Scotch via 4.d4.

---

### Network 2: Sicilian Web (1.e4 c5)
```
1.e4 c5
├── 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3
│   ├── 5...a6            → Najdorf
│   ├── 5...g6            → Dragon
│   ├── 5...e6            → Scheveningen
│   └── 5...Nc6           → Classical Sicilian
├── 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4
│   ├── 4...g6            → Accelerated Dragon (avoids Yugoslav Attack!)
│   └── 4...Nf6 5.Nc3 e6  → Scheveningen
├── 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6  → Kan/Taimanov area
└── 2.Nc3                  → Grand Prix Attack (f4 follow-up)
```

**Key transposition alert — Najdorf vs Scheveningen:**
- After 5.Nc3 a6, Black can play 6...e6 to enter Scheveningen territory
- After 5.Nc3 e6, Black can play 6...a6 to enter Najdorf territory
- WHITE'S RESPONSE CHANGES: 6.Bg5 is the main Najdorf weapon; 6.Be3 is main against Scheveningen
- Getting this wrong means White prepares for the wrong opening

**Accelerated Dragon vs Dragon:**
- Accelerated (2...Nc6 3.d4 cxd4 4.Nxd4 g6) AVOIDS the Yugoslav Attack
- Normal Dragon (5...g6 after 5.Nc3) INVITES the Yugoslav Attack
- Same pawn structure, completely different theory — opponents confuse these frequently

---

### Network 3: 1.d4 Nf6 Indian Web
```
1.d4 Nf6
├── 2.c4 e6 3.Nc3 Bb4     → Nimzo-Indian
│   └── If White plays 3.Nf3 instead of 3.Nc3  → Queen's Indian (3...b6) or Bogo-Indian (3...Bb4+)
├── 2.c4 e6 3.Nf3 b6      → Queen's Indian
├── 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 0-0 6.Be2 e5  → KID Classical
├── 2.c4 g6 3.Nc3 d5      → Grünfeld
│   └── (vs 3.Nf3 d5 → also Grünfeld territory)
├── 2.c4 c5 3.d5 e6       → Benoni
│   └── (English 1.c4 Nf6 2.Nc3 c5 3.g3 → Reversed Sicilian territory)
└── 2.Nf3 g6 3.Bf4        → London vs KID setup
```

**Critical transposition warning — Nimzo vs QID:**
- Players who want the Nimzo-Indian MUST reach 3.Nc3 from White
- If White plays 3.Nf3 (to avoid the Nimzo), Black can:
  - Play 3...b6 → Queen's Indian
  - Play 3...Bb4+ → Bogo-Indian
- Knowing BOTH systems is essential for Nimzo players

**KID vs Grünfeld:**
- After 1.d4 Nf6 2.c4 g6 3.Nc3, Black chooses:
  - 3...Bg7 4.e4 d6 → KID (lets White have the center, attacks from f5)
  - 3...d5 → Grünfeld (immediately challenges the center)
- These require COMPLETELY different plans and knowledge

---

### Network 4: 1.d4 d5 Web (Queen's Pawn)
```
1.d4 d5
├── 2.c4                   → Queen's Gambit
│   ├── 2...e6 3.Nc3      → QGD main lines
│   ├── 2...dxc4          → QGA
│   ├── 2...c6 3.Nc3 Nf6 4.Nf3 e6  → Semi-Slav
│   └── 2...c6 3.Nf3 Nf6 4.Nc3 dxc4  → Slav (accepted)
├── 2.Nf3 Nf6 3.Bf4       → London System
├── 2.Nf3 Nf6 3.c4        → QGD or Catalan territory
│   └── 4.g3              → Catalan Opening
└── 2.e3 Nf6 3.Bd3        → Colle System
```

**London to QGD transpositions:**
- London players (1.d4 d5 2.Nf3 Nf6 3.Bf4) often face players who know QGD theory
- After 3...e6 4.e3 Bd6, Black gets the same structure as the QGD
- London players need to know the difference in the bishop placement (Bf4 vs Bg5)

**Catalan:**
- Arises from QGD when White plays g3 and Bg2 instead of Bg5
- Also reachable via English (1.c4) or Réti (1.Nf3) with d4+g3 plans
- One of the most dangerous transpositions for Black QGD players who don't know Catalan theory

---

### Network 5: Flank Opening Transpositions
```
1.Nf3
├── 1...d5 2.c4           → Réti / QGD transposition
├── 1...Nf6 2.c4 e6 3.Nc3 → Can transpose to Nimzo or QID
├── 1...Nf6 2.g3 g6 3.Bg2 → King's Indian Attack (White)
└── 1...d5 2.g3           → KIA setup

1.c4 (English Opening)
├── 1...e5 2.Nc3 Nf6 3.g3 d5  → Reversed Sicilian (White has extra tempo as Sicilian player!)
├── 1...c5 2.Nf3          → Symmetrical English
├── 1...Nf6 2.Nc3 d5 3.d4 → QGD/QGA transpositions
└── 1...e6 2.Nf3 d5 3.d4 → Queen's Pawn transpositions
```

**The Reversed Sicilian (English) extra-tempo advantage:**
- After 1.c4 e5, White is playing a Sicilian Defense with reversed colors AND an extra move
- White's plan mirrors the Sicilian player's counterplay plan but one tempo ahead
- If you understand the Sicilian, you understand what to do as White in the English!

---

## Move-Order Tricks

### Trick 1: Italian/Ruy Lopez Confusion
- After 1.e4 e5 2.Nf3 Nc6, if White plays 3.Bc4, Black should know BOTH the Italian and Two Knights
- White can try to reach favorable lines of each depending on Black's 3rd move
- **Alert:** 3.Bc4 Nf6 leads to Two Knights territory, not Italian (no ...Bc5)

### Trick 2: Najdorf Move-Order Against Anti-Sicilian
- Many White players avoid the open Sicilian with 2.c3 (Alapin) or 2.Nc3 (Grand Prix)
- Najdorf players should have answers to both: the Alapin requires completely different preparation
- **2.c3 Sicilian (Alapin):** Black should respond with 2...d5 or 2...Nf6, not 2...d6

### Trick 3: 1.d4 Players Avoiding the Nimzo
- White can avoid the Nimzo with 3.Nf3 (instead of 3.Nc3)
- Players who only know Nimzo are suddenly in Queen's Indian territory
- **Solution:** Learn both Nimzo AND Queen's Indian as a package

### Trick 4: French vs Caro-Kann Confusion
- After 1.e4 c6 2.d4 d5 3.Nc3 (Caro) vs 1.e4 e6 2.d4 d5 3.Nc3 (French)
- The pawn on c6 (Caro) vs e6 (French) makes a massive strategic difference
- Caro players get their bishop out before closing the diagonal; French players don't
- Someone who learns only French will be confused if they face 1.e4 c6 positions

### Trick 5: Semi-Slav/Meran Transpositions
- 1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 e6 → Semi-Slav
- This same position can arise via the QGD move order
- White players need to know whether they're in Meran (5.e3), Anti-Meran (5.Bg5), or Moscow Variation territory

---

## Lines That Look Similar But Require Totally Different Plans

| Situation | Opening A | Opening B | Key Difference |
|-----------|-----------|-----------|----------------|
| 1.d4 g6 2.c4 Bg7 | KID (with ...d6+...e5) | Grünfeld (with ...d5) | KID attacks kingside; Grünfeld attacks d4 from the queen side |
| 1.e4 e6 vs 1.e4 c6 | French Defense | Caro-Kann | French bishop is passive; Caro-Kann bishop goes to f5 |
| 1.e4 c5 ...g6 | Dragon | Accelerated Dragon | Dragon faces Yugoslav Attack; Accelerated Dragon avoids it |
| 1.d4 Nf6 2.c4 e6 | Nimzo-Indian (3.Nc3 Bb4) | QID (3.Nf3 b6) | Nimzo creates structural damage; QID controls center from long range |
| 1.d4 d5 2.Nf3 Nf6 | London (3.Bf4) | Réti (2.c4) | London is methodical; Réti is hypermodern with immediate c4 pressure |
| 1.e4 c5 ...e6 | Scheveningen Sicilian | French Sicilian approach | Scheveningen is more dynamic; same pawn structure but different strategic goals |

---

## Lichess API Integration Points

The following positions benefit most from real-time Lichess Opening Explorer data:

1. **Popularity statistics:** Which variation is most commonly played at each Elo range
2. **Win rates:** Which lines have the best results for each side
3. **Move frequency:** Track how often players choose the "correct" critical moves
4. **Divergence points:** Where players deviate from mainline theory (use to identify weakness spots)

**Lichess API endpoint:** `https://explorer.lichess.ovh/lichess?variant=standard&speeds[]=rapid&ratings[]=2000&fen={FEN_POSITION}`

**For Pablo's engine:** Feed the FEN position after each game move into the API to check if the player is in known opening territory, and flag when they deviate.
