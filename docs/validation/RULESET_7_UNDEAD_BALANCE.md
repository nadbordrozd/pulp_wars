# Ruleset 7 revision 13: Undead balance report

Bead `pulp_wars-vkq.10`. Analysis and proposals only: no rule, number, or
AI change is applied by this bead. Every measured proposal below ran on a
throwaway copy of the source tree that was deleted afterwards.

The user's direction for this report: the game should be balanced, but it is
more important that it is fun and that the factions play differently, even at
some cost to balance.

All results are Normal AI against Normal AI. They measure the rules as the
current Normal policy plays them, not as a skilled human would; section 9
lists where the two are likely to differ.

## 1. Summary

- **Balance is inside a normal band.** Across 600 Human-vs-Undead 1v1 games
  (494 decided) the Undead win 54% (95% CI 50–59%). Counting round caps as
  draws the Undead score 0.537. The Human mirror's first-mover edge is 55%
  (49–61%), so the faction edge is about the size of the turn-order edge.
  No map or size cell is significantly outside 40–60% once its interval is
  considered (the extremes are Lakes 11 at 63% [49–74] and Dry Land 14 at 43%
  [30–56]).
- **The factions already play differently**: Undead build 1.7 times as many
  Zombies as Humans build Guards (15.6 vs 9.0 per game), one fifth as many siege units (0.7
  Liches vs 3.4 Catapults), 2.3 times as much Field Defense, and win by
  attrition (Infect, Raise Dead). Humans win by Catapult fire (15.4 kills per
  game from Catapults alone).
- **Two degenerate patterns** dominate the problem cases:
  1. **The Skeleton feeding loop.** 88% of raised Skeletons die (7,385 of
     8,398) and together they score only 605 kills. In round-capped games a
     Necromancer raises about 34 Skeletons that an adjacent enemy kills each
     turn, recreating the Grave for the next raise.
  2. **Infect on a city center is a near-instant capture.** It happened in
     137 of 600 mixed games; in 115 a Zombie that rose on a center captured
     that city, and the Undead won 91 of those 115 games (79%). Removing it
     changed no winner in 240 paired games, though: it finishes games the
     Undead were already winning.
- **Raise Dead then Disband is not exploited by the AI**: 214 Coins across
  900 Undead games (0.24 per game), against 8,398 Coins available in
  principle (1 per raised Skeleton). It remains a human-player exploit.
- **Stalemates** (round caps) are 17–20% in every pairing, including the
  Human mirror; about 80% are "last city" stalls (the `pulp_wars-1mc` AI
  weakness). In mixed capped games the Undead are the side stuck ahead 61% of
  the time: they lack siege (few Liches, Zombies cannot attack after moving),
  although making the AI build Catapult-rate Liches does not end those stalls
  either (section 8.3).
- **Money saturates after round ~35.** The AI spends almost everything until
  then (1–3 Coins carried into its turn at rounds 10, 20, and 30) but income
  reaches ~28 Coins per turn by round 40, of which Markets are ~40%, and the
  bank then grows to hundreds of Coins.

**Recommended set** (measured together as PKG2 in section 8: Undead win
55% [48–62], Human mirror unchanged within noise, game income −5 to −7%):

1. **Vampire:** its attacks draw no retaliation (V1).
2. **Lich:** Attack 2.5 → 3 (L2), plus an AI follow-up to train Liches
   against fortified lines.
3. **Villages:** one more neutral village in every setup except 11 × 11
   Archipelago (VL), shipped in a ruleset revision with a corpus refresh.
4. **Economy:** Markets ignore Commerce and city level income caps at 5 (E2);
   E1 (Commerce adds +1 instead of doubling) is the smaller alternative.
5. **Keep** Infect on centers, 5-HP raised Skeletons, uncapped Raise Dead,
   permanent Graves, and Zombie stats; fix the AI's Raise Dead targeting and
   the last-city stall (`pulp_wars-1mc`) instead. Banshee Attack 2 (B1) is an
   optional flavour buff.

The findings behind each are in sections 3–7; the proposals with measured
effects are in [section 8](#8-proposed-tuning).

## 2. Reproduction

Tooling added by this bead:

- `npm run headless -- match|batch --ruleset pulp-wars-poc-7r13 --factions original,undead`
  (seat-ordered `original`/`human`/`undead`; see
  [headless simulation](../architecture/HEADLESS_SIMULATION.md#ruleset-7-revision-13-factions-and-undead-telemetry)).
- Per-role and per-faction damage/kill telemetry that counts Wail, Lich and
  Battleship splash, and retaliation; Undead ability counters; over-capacity by
  faction.
- `npm run balance:ruleset7-undead` ([script](../../scripts/ruleset7-undead-balance-matrix.ts)).

The checked-in matrix and its output
[RULESET_7_UNDEAD_BALANCE.json](RULESET_7_UNDEAD_BALANCE.json):

```bash
npm run balance:ruleset7-undead -- --output docs/validation/RULESET_7_UNDEAD_BALANCE.json --markdown
```

| Parameter         | Value                                                                               |
| ----------------- | ----------------------------------------------------------------------------------- |
| 1v1 pairings      | `HU` (Human seat 0), `UH` (Undead seat 0), `UU`, `HH`                               |
| Maps              | `DRY_LAND`, `PANGEA`, `CONTINENTS`, `ARCHIPELAGO`, `LAKES`                          |
| 1v1 sizes         | 11 and 14                                                                           |
| 1v1 seeds         | 0–29 for every pairing × map × size cell (1,200 games)                              |
| Four-seat extra   | 16 × 16, three AI, `HUHU` and `UHUH`, seeds 0–3 per map (40 games)                  |
| Caps              | 150 rounds (1v1), 120 rounds (four-seat), 30,000 commands, 128 commands per turn    |
| Mode / difficulty | Rival, Normal                                                                       |
| Runtime           | 3,409 s wall with `--jobs 9` on a 10-core Apple laptop (30,587 s of match CPU time) |

Seeds are identical across pairings, so `HU` and `UH` play the same map with
the factions swapped. Every match is deterministic and independent of
`--jobs`; the JSON records each game's final state hash (63 games shared with
an earlier pilot run at different parallelism reproduced byte-identical
hashes). Wall time is printed to stderr and is not in the JSON. A median 1v1
game takes 10.6 s of CPU; a round-capped one 56 s, which is why the cap is
150 rounds (no decided 1v1 game in the pilot lasted past round 117).

Three games (0.24%) ended in a Normal-policy error, all
`COMMAND_REJECTED:INVALID_TILE` on `LAND_GRANT` (`HU` Pangea 14 seed 0,
`UH` Lakes 11 seed 3, `UHUH` Continents 16 seed 1): the public command query
offers Land Grant from a stale view of neutral tiles that the reducer then
finds claimed. It is a pre-existing query/reducer mismatch, not an Undead
rule; see section 10.

## 3. Win rates

Decided games only; 95% Wilson intervals; "capped" games hit the round cap.

| Pairing | Games | Undead win                | Seat-0 win            | First mover win | Rounds mean / median / p90 | Cap rate |
| ------- | ----: | ------------------------- | --------------------- | --------------- | -------------------------- | -------: |
| HU      |   300 | 51% [45–57] (127/248)     | 49% [43–55]           | 52% [46–59]     | 36.9 / 34 / 55             |    17.3% |
| UH      |   300 | 58% [52–64] (142/246)     | 58% [52–64]           | 55% [48–61]     | 37.3 / 34 / 59             |    18.0% |
| UU      |   300 | —                         | 50% [44–56] (122/245) | 56% [50–62]     | 35.3 / 33 / 51             |    18.3% |
| HH      |   300 | —                         | 56% [50–62] (134/239) | 55% [49–61]     | 38.2 / 35 / 58             |    20.3% |
| Mixed   |   600 | **54% [50–59] (269/494)** | —                     | 53% [49–58]     | —                          |    17.7% |

Seat order: the Undead win 58% [52–64] when they move first and 51% [45–57]
when the Human moves first.

| Map         | Undead win (mixed) | 11 × 11               | 14 × 14               |
| ----------- | ------------------ | --------------------- | --------------------- |
| Dry Land    | 51% [42–60]        | 60% [47–71] (34/57)   | 43% [30–56] (23/54)   |
| Pangea      | 55% [45–65]        | 54% [40–67] (26/48)   | 57% [41–71] (21/37)   |
| Continents  | 50% [41–60]        | 47% [34–61] (24/51)   | 53% [40–66] (27/51)   |
| Archipelago | 59% [49–68]        | 60% [47–71] (34/57)   | 58% [44–71] (29/50)   |
| Lakes       | 57% [47–67]        | 63% [49–74] (35/56)   | 49% [33–65] (16/33)   |
| All         | 54% [50–59]        | 57% [51–63] (153/269) | 52% [45–58] (116/225) |

By game length (mixed, decided): the Undead win 64% [55–72] of games decided
before round 25, 53% of rounds 25–40, 48% of rounds 40–70, and 57% of later
ones. The early edge is most likely Zombie Infect snowballs and treasure
Vampires (both peak early in the replays read); Humans catch up once
Catapults arrive.

**Four-seat extra** (40 games, 16 × 16, alternating factions): 55% hit the
120-round cap; a match ends when seat 0 is eliminated, so it has no clean
winner. At the end Undead seats held 205 cities and 58 of 80 seats were
alive; Human seats held 182 cities with 53 alive. This is consistent with
the 1v1 result (slight Undead edge) and too small to separate from noise.

## 4. How the factions play

Per mixed game (600 games; each faction has one seat per game):

| Measure                    | Human                                                                       | Undead                                                                                     |
| -------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Units trained              | 36.6 (15.0 Patrol Boat, 9.0 Guard, 6.3 Fighter, 3.4 Catapult, 1.5 Marksman) | 40.7 (15.6 Zombie, 15.3 Patrol Boat, 4.5 Skeleton, 1.6 Banshee, 1.6 Necromancer, 0.7 Lich) |
| Kills / losses             | 39.4 / 27.9                                                                 | 27.4 / 39.8                                                                                |
| Damage dealt               | 588                                                                         | 417                                                                                        |
| Top killers (kills / game) | Catapult 15.4, Battleship 9.5, Patrol Boat 6.8                              | Battleship 10.0, Patrol Boat 6.2, Zombie 3.6 + 2.2 Infects                                 |
| Field Defense built        | 1.8                                                                         | 4.1                                                                                        |
| Field Defense destroyed    | 2.7 (2.4 by Catapult)                                                       | 0.8 (0.5 by Lich)                                                                          |
| Income over the game       | 1,077                                                                       | 1,211                                                                                      |
| Cities at round 15 / 30    | 2.19 / 2.39                                                                 | 2.23 / 2.38                                                                                |

Neither Normal seat ever trains a Knight or Vampire; every one comes from a
treasure chest. Both factions spam Patrol Boats in long games (a Normal-AI
trait, not an Undead one).

The Undead lose more units than they kill and still win slightly more often:
their losses are cheap (5-HP raised Skeletons are 7.2 of the 39.8 losses) and
their kills are worth more (Infect turns 2.2 kills per game into 10-HP
Zombies, and a center Infect usually takes the city).

### 4.1 Ability usage

| Ability          | Use (per mixed game unless stated)                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| Raise Dead       | 6.2 uses, 8.2 Skeletons (34 per capped game, 2.8 per decided game); largest single raise 4           |
| Raised Skeletons | 0.59 kills and 7.2 losses per game; 0.05 captures                                                    |
| Infect           | 2.24 risings (2.13 on attack, 0.11 on retaliation); 0.32 on a hostile city center; 0.01 on a village |
| Wail             | 4.6 uses hitting 10.1 targets for 14.9 damage (1.5 per target), 0.55 kills; 4% of targets take 0     |
| Lich             | 0.7 trained; 1.55 kills; 20 splash damage and 0.24 splash kills per game                             |
| Devour           | 0.15 (heals 5.2 HP on average; never used for denial)                                                |
| Lifesteal        | 5.3 HP per game over 1.55 heals; it happened in 146 of 600 games                                     |
| Graves           | 13.7 created, at most 5.9 open at once, 5.4 left at the end                                          |

In the Undead mirror Wail never fires (no living targets, by design), Infect
rises to 10.4 per game, and Lich splash to 110 damage per game (both seats
fight at close range with Zombies).

### 4.2 Over-capacity

Only Undead seats ever exceed capacity (risings may): 229 of 600 mixed games
had at least one Undead over-capacity turn-boundary sample, 4.3 samples per
game on average, and the largest excess was 7 units over capacity. Human seats
never exceeded capacity in these games. Over-capacity blocks training in that
city, so it is self-limiting. It is a symptom of winning rather than a cause:
the Undead won 71% (119/168) of decided games in which they went over
capacity, against 46% (150/326) of the others, and those games were longer
(43 vs 34 rounds).

### 4.3 Raise Dead then Disband

A raised Skeleton is free and Disbands for 1 Coin. Across all 900 games with
an Undead seat the AI raised 8,398 Skeletons (8,398 Coins available if each
were disbanded) and disbanded 214 of them (214 Coins; 468 risings of either
kind, 468 Coins). Per game that is 0.24 Coins against 9.3 available. The
Normal AI does not exploit it. A human player could: in a stalled front a
Necromancer next to one Grave that the enemy refills every turn yields 1 Coin
per turn indefinitely, and in the long game money is not scarce anyway
(section 7.4), so the exploit is more of an aesthetic problem (a "Coin farm")
than a balance one.

### 4.4 Infect on a city center

A victim killed on a hostile city center rises as a Zombie that immediately
besieges the city (zero income, no training) and may capture it next turn.
In the mixed games 193 center Infects occurred in 137 games (23%); 144
captures were made by a Zombie that rose on a center, in 115 games, and the
Undead won 91 of those 115 (79%, against 54% overall). In the replays read,
the sequence was: a Zombie kills the city's only defender, the defender rises
as a 10-HP Zombie on the center, the defending side has nothing left nearby
that can kill it in its one turn, and the city falls. The defender's window
is the same one turn it gets against an ordinary attacker that kills the
garrison and advances onto the center; what Infect adds is that the besieger
is a free extra unit and the Zombie that made the kill stays in place. It is
dramatic and on-theme, and section 8 shows it decides no games on its own.

## 5. What is fun and what is degenerate

From reading event streams of about a dozen games (for example `UH` Lakes 11
seed 0, `HU` Pangea 14 seed 1, `UH` Dry Land 11 seed 4) with a scratch
narrator that prints per-round captures, kills, Infects, raises, Wails, and
Lifesteal:

**Fun and distinct**

- Lich volleys with 3–5-unit splash against clustered Human Guards read well
  ("splash 5/5/5") and create real pressure when the Undead get one.
- Zombie waves that convert the front line are the most Undead-feeling thing
  in the game; the Infect count grows naturally with the fight.
- Treasure Vampires chaining kills and healing ("atk 6/0 kill, steal 3" three
  turns in a row) are memorable when they happen.
- Humans answer with Catapult lines; matches where both sides have their
  siege unit feel like the design intends.

**Degenerate or unfun**

- **Skeleton feeding loop** (the most common pattern in long games): a
  Necromancer raises one 5-HP Skeleton next to an enemy Juggernaut, which
  kills it for free (and promotes), leaving a new Grave; repeat every turn
  for dozens of turns (`HU` Pangea 14 seed 1: 12 raises in 15 turns, all
  killed; `UH` Dry Land 11 seed 23: 316 Skeletons raised and lost).
  It gives the enemy free kills and promotion and burns the Necromancer's
  action, and it is the main reason capped games contain 34 raises each.
- **Center Infect** ends a city in one exchange (section 4.4).
- **Chip Wails**: a Banshee that walks up for "1/1" damage and then dies is
  common; Wail is fine as area damage but at Attack 1 against Defense 2–3
  it deals 1 damage per target most of the time.
- **Last-city stalls**: 80% of capped games have one side down to one city,
  typically defended by a fortified giant and cycled Pillage/rebuild
  (`pulp_wars-1mc`), in every pairing.

## 6. Stalemates and trench warfare

Cap rates are the same for every pairing (Human mirror 20.3%, mixed 17.7%,
Undead mirror 18.3%), and 14 × 14 Pangea and Lakes produce half of all caps.
Of the 104 mixed capped games 82 were last-city stalls; the Undead were the
side ahead in 63 (61%). The Undead mirror keeps capturing later before it
stalls (last capture at round 46 on average versus 31 in the Human mirror).

The Undead do less trench-breaking than Humans:

| Per mixed game                                                          | Human | Undead |
| ----------------------------------------------------------------------- | ----: | -----: |
| Attacks                                                                 |  69.3 |   41.6 |
| Attacks into a fortified defender                                       |  15.9 |    5.9 |
| Kills of fortified defenders                                            |   5.6 |    2.9 |
| Field Defense destroyed                                                 |   2.7 |    0.8 |
| Attacks + Wails in the last 50 rounds of capped games (per capped game) |    85 |     38 |

The Undead's siege is the Lich, and the Normal AI trains 0.7 of them per
game (Humans: 3.4 Catapults). Zombies cannot attack after moving and
Skeletons at 5 HP cannot hurt a fortified unit.

## 7. Scope-extension findings

The four items below were added to this bead by the user; proposals and
measured effects are in section 8.

### 7.1 Village density

Current neutral villages ([current rules §2.2](../product/RULESET_7_CURRENT.md#22-settlements-and-treasures)):
3/4/6 on widths 11/14/16 for 1/2/3 AI (5/7/10 settlements), 13/12/11 on 20,
and 20/19/18 on 25. The generator places settlements on a 3-spaced lattice
(so Chebyshev 3 is automatic): 9 lattice points on 11 × 11 and 16 on 14 × 14
and 16 × 16, minus the capitals.

Map-acceptance test (100 seeds × 5 map types × 10 size/AI-count cells,
`createInitialMapStateV7`): the current counts accept 100% everywhere. With
one more village in every cell, every cell still accepts 100% except
**11 × 11 Archipelago with one AI, which fails 20 of 100 seeds**
(`MAP_GENERATION_FAILED`; only seven lattice points are left for four
villages on 34–46% land). 16 × 16 three-AI Archipelago still accepts every
seed but generation is ~3× slower (68 → 198 ms per map).

### 7.2 Vampire

Every Vampire and Knight in these games came from a treasure chest (the AI
never trains either at 9 Coins). Per unit, mixed games:

| Measure                           | Human Knight | Undead Vampire |
| --------------------------------- | -----------: | -------------: |
| Units                             |          203 |            205 |
| Died before the match ended       |          87% |            62% |
| Rounds alive (units that died)    |         12.2 |           17.2 |
| Attacks per unit                  |         1.65 |           3.88 |
| Kills per unit                    |         0.95 |           2.33 |
| Damage dealt / taken per unit     |  12.1 / 10.0 |    28.8 / 23.2 |
| Died having attacked at most once | 46% of units |   23% of units |
| Lifesteal healed per unit         |            — |           15.5 |

For the AI the Vampire already outperforms the Knight by every measure, and
Lifesteal heals about half the damage the Vampire takes. The user's
experience ("dies before Lifesteal matters") is still plausible: a 10-HP,
Defense-1 unit that attacks a healthy Guard or Fighter takes 3–6 retaliation
per attack and heals only after both damages, so its first attack against a
full-HP defender usually nets negative HP, and a human player who attacks
with it into a line is exposed to every counterattack on the next turn.

### 7.3 Undead stalemates

See section 6 for the measurements. The three options the user named are
measured in section 8.3.

### 7.4 Economy

Income versus spending over time (both factions, 1v1, scratch replay of 90
games with a 60-round cap; start-of-turn values per seat):

| Round | Income per turn | of which level | Market | capital + trade | Coins carried in | Units | Capacity |
| ----: | --------------: | -------------: | -----: | --------------: | ---------------: | ----: | -------: |
|    10 |             4.7 |            3.7 |    0.0 |             1.0 |              1.2 |   4.0 |      5.5 |
|    20 |            10.8 |            6.9 |    2.8 |             1.1 |              1.8 |   6.7 |      9.1 |
|    30 |            17.9 |           10.9 |    5.8 |             1.5 |              2.1 |  10.2 |     13.9 |
|    40 |            28.3 |           14.8 |   11.5 |             2.4 |            36–74 |  13.7 |     19.2 |
|    50 |            32.0 |           16.0 |   13.7 |             2.8 |          190–290 |  15.0 |     20.8 |
|    60 |            31.8 |           15.8 |   13.8 |             2.8 |          390–575 |  14.8 |     20.4 |

Rows average the Human seats of Human mirrors and both seats of mixed games
(the three groups agree within a Coin until round 35). Games end over time,
so rows after round 35 describe the long games only (about a third of games
reach round 40).

Over a whole game a seat earns ~1,100–1,290 Coins of income plus ~50 from
rewards, 20 from other sources, and 2.5 from chests; it spends ~150 on units,
~155 on research, and ~200 on buildings. The rest (660–820 Coins on average,
mostly in long games) is never spent.

So the money problem is a late-game one. Until round ~30 the AI is
cash-limited (1–3 Coins left each turn). From round ~35 income outruns every
outlet: each city trains at most one unit per turn, the tree is done, and the
buildings are built. Markets are the largest single late source (~40% of
income at round 40) because Commerce doubles each Market to 2–8 Coins. Units
are cheap relative to that income: at round 40 one turn of income buys
fourteen Skeletons or three Vampires, but the empire has only ~2.5 city
actions.

## 8. Proposed tuning

Each proposal below was measured on a throwaway copy of the source tree with
only that change applied, on seeds 0–11 of every map × size cell (`HU` and
`UH`, 240 games; stalemate options also `UU`, economy options also `HH`), and
compared game by game with the same seeds of the baseline. On that subset the
baseline Undead win rate is **50% [43–56] (100/202 decided)** with 38 round
caps in 240 games. With ~200 decided games a change smaller than about
±7 points is within noise. The matrix command for a variant is the baseline
command with `--seeds 12 --multi-seeds 0 --pairings HU,UH` (plus `UU` or
`HH`).

**The main finding: under the Normal AI no single unit or rule change moved
the Undead win rate or the cap rate beyond noise.** The AI's training score
(roughly max HP − 2 × cost − 8 × owned count, plus small role bonuses) decides
what gets built, so stat changes to the Lich or Banshee change what those
units do but not how many exist, and round caps are dominated by the AI's
last-city stall (`pulp_wars-1mc`). The measurements therefore mainly show
(a) that each change does what it is meant to do and (b) that none becomes
dominant; whether a change is worth making for human players is a design
judgement, stated per item.

### 8.1 Measured proposals

| ID   | Change                                                                 | Undead win (base 50%)      |   Caps (base 38) | Main measured effect                                                                                                                                                         | Recommendation                     |
| ---- | ---------------------------------------------------------------------- | -------------------------- | ---------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| V1   | A Vampire's attack draws no retaliation                                | 51% [44–58]                |               35 | per Vampire: attacks 4.0 → 5.4, kills 2.4 → 3.0, deaths 49 → 43 of 81, died after ≤1 attack 21 → 11; Lifesteal healed 1,226 → 913 HP                                         | **Adopt**                          |
| L1   | Lich Attack 2.5 → 3.5 (`attack2` 5 → 7)                                | 51% [44–58]                |               41 | Lich splash damage 20 → 33 per game; Liches trained 0.69 → 0.61                                                                                                              | Adopt at 3 (L2)                    |
| L2   | Lich Attack 2.5 → 3 **and** AI Lich training bonus +4 → +16            | 50% [43–57]; `UU` 47 → 49% | 40; `UU` 18 → 17 | Liches 0.7 → 3.8 per game (Zombies 16.3 → 11.1); Undead attacks on fortified defenders 6.7 → 9.9, Field Defense destroyed 1.2 → 2.1, stall-phase actions 4.3 → 10.4 per game | **Adopt L2 (rule) + AI follow-up** |
| AI   | AI Lich training bonus +4 → +16 only (no rule change)                  | 50% [44–57]; `UU` 47 → 51% | 40; `UU` 18 → 16 | Liches 0.7 → 3.2; fortified attacks 6.7 → 11.6; Field Defense destroyed 1.2 → 1.9                                                                                            | AI follow-up                       |
| B1   | Banshee Attack 1 → 2 (`attack2` 2 → 4; Wail only)                      | 49% [42–56]                |               41 | Wail damage 10.5 → 21.9 and kills 0.45 → 0.94 per game; Banshees trained unchanged (1.4)                                                                                     | Optional (fun)                     |
| S1   | Swap unlocks: Lich at Marksmanship, Banshee at Sawmilling              | 49% [42–56]                |               40 | Liches trained 0.69 → 0.68; Lich splash 20 → 28 (earlier Liches)                                                                                                             | Reject                             |
| R1   | Raise Dead Skeleton rises at 10 HP instead of 5                        | 50% [43–57]                |               45 | Skeletons raised 7.0 → 5.0, lost 6.1 → 4.0, kills 0.64 → 0.78 per game                                                                                                       | Not now (AI fix first)             |
| I1   | Infect never converts a victim on a settlement center                  | 48% [41–55]                |               42 | center-rising captures 0.23 → 0; **no game changed winner** (12 changed only to or from a cap)                                                                               | Keep the current rule              |
| VL   | +1 neutral village per setup, except 11 × 11 Archipelago (section 8.4) | 53% [46–60] (maps differ)  |               48 | cities at round 15 2.2 → 2.4–2.5; income over the game +22% (Undead) / +37% (Human); decided games 1.6–3.4 rounds shorter                                                    | **Adopt with E2**                  |
| E1   | Commerce adds +1 to each Market instead of doubling it                 | 50% [43–57]; `HH` 51 → 51% |               37 | game income −11% (Human 1,035 → 921; Undead 1,123 → 983); final bank −19%; income at rounds 20/30 unchanged                                                                  | Smaller alternative to E2          |
| E2   | Markets ignore Commerce **and** city level income capped at 5          | 49% [42–56]; `HH` 51 → 51% |               37 | game income −23% (Human 1,035 → 795) / −26% (Undead 1,123 → 835); final bank −36% / −40%; income at round 20 unchanged, round 30 −4%                                         | **Adopt with VL**                  |
| PKG  | V1 + Lich Attack 3 + VL + E1 together (no AI change)                   | 53% [46–60]; `HH` 51 → 52% |               44 | Vampires dying after ≤1 attack 21 → 11; Lich splash 20 → 48 per game; game income still +8% (Undead) / +14% (Human): VL outweighs E1                                         | —                                  |
| PKG2 | V1 + Lich Attack 3 + VL + E2 together (no AI change)                   | 55% [48–62]; `HH` 51 → 54% |               47 | game income −7% (Human) / −5% (Undead) and final bank −14% / −17% even with 2.4–2.5 cities at round 15; Vampires dying after ≤1 attack 21 → 12; Lich splash 20 → 36 per game | **Recommended set**                |

### 8.2 Vampire (scope item 2): adopt V1

- **Rule:** when a Vampire attacks, the defender does not retaliate. The
  Vampire still retaliates when it is attacked, and Lifesteal still heals the
  damage it deals in either case. Nothing else changes (10 HP, Attack 3,
  Defense 1, Move 3, cost 9).
- **Problem solved:** today a 10-HP, Defense-1 unit that attacks a healthy
  line takes 3–6 retaliation per attack and heals only afterwards, so its
  first attacks usually lose HP; 26% of Vampires die having attacked at most
  once. With V1 that falls to 14%, each Vampire attacks 33% more often and
  kills 25% more, and Lifesteal now tops the Vampire up between the
  counterattacks it receives on the enemy's turn, which is the fantasy
  (strike, feed, withdraw).
- **Not dominant:** the win rate moved one point; the Vampire still dies to
  any focused counterattack (Defense 1), and it remains the most expensive
  Undead land unit. It also gives the Undead a way to chip a fortified
  40-HP giant without dying, which helps the last-city stall.
- **Distinctness:** the Human Knight keeps Overrun (chained kills that
  advance); the Vampire becomes the "hit without reprisal, heal, repeat" unit.
- **Why not stat changes instead:** more HP or Defense makes the Vampire a
  worse-Knight tank and dilutes Lifesteal; a cost cut does not fix dying on
  the first attack. No additional stat change is needed.
- **Implementation:** combat preview and resolution (`retaliation` false when
  the attacker has `LIFESTEAL`), both public and canonical previews, the
  spec's section 6.5 and 6.8, and tests for attack/retaliation symmetry.
- The Normal AI never trains Vampires or Knights (all 408 came from treasure
  chests); it will not use V1 much until its training score values them
  (follow-up).

### 8.3 Undead breakthrough (scope item 3): recommend a stronger Lich (option a), at Attack 3

- **Options measured:** (a) Lich Attack 3.5 (L1) and 3 plus AI bonus (L2);
  (b) Banshee Wail Attack 2 (B1); (c) swapped unlocks (S1).
- **(c) does nothing** for the AI (Liches stay at 0.7 per game) and moves the
  Lich to a tier-2 technology before Sawmilling's economy, which also breaks
  the Wilds-branch theme. Reject.
- **(b) doubles Wail** and removes most "1/1" chip Wails, and it is fun, but
  a Banshee must walk into range at 8 HP / Defense 1 and Wail never destroys
  Field Defense, so it does not break fortified lines. Keep as an optional
  flavour buff.
- **(a) is the siege answer.** The Lich is the only Undead unit that destroys
  Field Defense from range; at Attack 2.5 it does 71% of a Catapult's primary damage. At 3
  (`attack2` 6) its primary shot is 86% of a Catapult's and its splash (half
  damage to every hostile unit around the target) makes it better against
  packed lines and worse against a lone fortified giant, which keeps the two
  siege units different. At 3.5 (L1) it would be at least as strong as a
  Catapult in every situation plus splash, so 3 is the recommended value.
- **Measured:** L1 (3.5) alone changes nothing because the AI still builds
  0.6 Liches per game. With the AI's Lich bonus raised from +4 to +16 (L2)
  the Undead build 3.8 Liches per game (the Human Catapult rate is 3.5), attack
  fortified defenders 48% more often, destroy 73% more Field Defense, and are
  2.4 times as active in stalled games, with no change in win rate (50%) or
  caps (40 vs 38). The Undead mirror is unchanged too (caps 18 → 17).
- **So the rule change is necessary but not sufficient**: the AI training
  bonus belongs in an AI follow-up, and the caps themselves are the
  last-city stall (`pulp_wars-1mc`), which no unit change fixes.

### 8.4 Village density (scope item 1): +1 village per setup, except 11 × 11 Archipelago

| Board width | AI count | Villages now |             Proposed | Settlements now → proposed |
| ----------: | -------: | -----------: | -------------------: | -------------------------- |
|          11 |        1 |            3 | 4 (3 on Archipelago) | 5 → 6 (5)                  |
|          14 |      1–2 |        3 / 4 |                4 / 5 | 5 / 7 → 6 / 8              |
|          16 |      1–3 |    3 / 4 / 6 |            4 / 5 / 7 | 5 / 7 / 10 → 6 / 8 / 11    |
|          20 |      1–3 | 13 / 12 / 11 |         14 / 13 / 12 | 15 → 16                    |
|          25 |      1–3 | 20 / 19 / 18 |         21 / 20 / 19 | 22 → 23                    |

- **Generator:** the lattice spacing already guarantees Chebyshev 3, and
  capital placement and fairness are untouched. With the proposed counts every
  size/AI-count/map cell accepts 100 of 100 seeds except 11 × 11 one-AI
  Archipelago, which fails 20% (seven lattice points left on 34–46% land),
  hence the exception. 16 × 16 three-AI Archipelago map generation becomes
  ~3× slower (68 → 198 ms) but always succeeds.
- **Measured play (VL):** each seat holds 2.4–2.5 cities at round 15 instead
  of 2.2, captures 22–26% more cities, and earns 22–37% more Coins over the
  game; decided games end 1.6–3.4 rounds sooner, but caps rise 38 → 48 of 240
  (more cities to hold in a last-city stall). The Undead win 53%. The extra
  income makes the money problem worse: with E1 the package still earns 8–14%
  more than today (PKG), so VL should ship with E2 (PKG2).
- **Compatibility cost:** every generated map changes (village count is part
  of generation), so the Ruleset 7 release corpus
  (`validate:ruleset7-release`), golden replays, and any test fixture that
  names village coordinates (several Undead tests use seed-2 Dry Land village
  positions) need refreshing, and the settlements table in
  [current rules §2.2](../product/RULESET_7_CURRENT.md#22-settlements-and-treasures)
  changes. It should go with a ruleset revision (`pulp_wars-vkq.17`), not
  silently into revision 13.

### 8.5 Economy (scope item 4): adopt E2 (E1 if only the smallest change is wanted)

- **Problem:** late income (round 35+) outruns every outlet; Markets are the
  largest late source because Commerce doubles them to 2–8 Coins each.
- **E1 (smaller alternative):** `market income = min(4, 1 + distinct adjacent families) + (Commerce ? 1 : 0)`,
  so a Market pays 1–4, or 2–5 with Commerce (was 2–8). It touches nothing
  before Commerce, so the early game is unchanged (income at rounds 20 and 30
  is identical to the baseline), and it cuts game income by 11% and the
  unspent bank at the end by 19%, with no change in win rates (`HH` seat 0
  51% → 51%, mixed 50% → 50%) or game length. At round 40 (scratch replay of
  90 games) Market income falls from 11.5 to 8.1 Coins per turn and total
  income from 28.3 to 24.7 (−13%); the bank carried into round 40 falls from
  36–74 to 28–58 Coins. It is a real but modest cut.
- **E2 (recommended):** Markets pay `min(4, 1 + distinct adjacent families)`
  with or without Commerce (Commerce keeps its land-trade Coin), and a city's
  level adds at most 5 Coins of income (levels 6+ still grant rewards,
  capacity, and Juggernauts). Game income falls 23–26% and the final bank
  36–40%; income at round 20 is unchanged and at round 30 falls 4%, so the
  early game is untouched. Win rates, the Human-mirror seat balance, and game
  length do not change. It is two small formula edits in `cityIncomeV7` and
  `marketIncomeForCityV7` (plus the Market preview text and current-rules
  §4.3/§9.4); the AI needs no change. Together with VL it roughly cancels the
  extra village income (PKG2).
- Unit prices are not the lever: the AI is cash-limited until round ~30 and
  capped by one training action per city after that, so raising unit costs
  would slow the early game (the part that is not too rich) and still leave
  the late surplus.

### 8.6 The bead's own tuning candidates

| Candidate          | Evidence                                                                                                                              | Proposal                                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skeleton raise HP  | Feeding loop: 88% of raised Skeletons die; 34 raises per capped game. R1 (10 HP) cuts raises 29% and losses 35%, no win change.       | Keep 5 HP. Fix the AI first: do not raise onto a Grave inside a visible enemy's lethal reach unless it screens something. A full-HP free Skeleton per Grave would be strong for a human. |
| Raise Dead cap     | 1.33 Skeletons per raise on average, at most 4.                                                                                       | No cap needed.                                                                                                                                                                           |
| Grave lifetime     | 5.9 open Graves at most, 5.4 left at the end.                                                                                         | Keep permanent Graves.                                                                                                                                                                   |
| Raise then Disband | 0.24 Coins per game taken by the AI; 9.3 available.                                                                                   | No change now; if human players farm it, make risings refund 0 (needs a per-unit "risen" flag in state).                                                                                 |
| Infect on centers  | In 23% of games; I1 changes no winner; the rising is exhausted until its owner's next turn, so the defender gets one turn to kill it. | Keep (it is a dramatic, on-theme finisher, not a decider).                                                                                                                               |
| Zombie cost / HP   | Zombies are the Undead core (15.6 per game); the AI picks them largely for their 20 HP.                                               | No change.                                                                                                                                                                               |
| Banshee stats      | Wail averages 1.5 damage per target.                                                                                                  | Optional B1 (Attack 2).                                                                                                                                                                  |
| Lich Attack        | 0.7 Liches per game; 1.55 kills.                                                                                                      | L2: Attack 3 (with the AI follow-up).                                                                                                                                                    |
| Vampire cost       | Never trained by the AI at 9 Coins; treasure Vampires outperform Knights.                                                             | Keep 9; V1 instead.                                                                                                                                                                      |
| Restless           | Not varied in this bead.                                                                                                              | No change.                                                                                                                                                                               |

### 8.7 Interaction with `pulp_wars-1mc`

About 80% of round caps in every pairing are last-city stalls, the
`pulp_wars-1mc` AI weakness (it will not attack a fortified giant holding the
last city). None of the rule proposals reduces the cap rate; VL raises it
(38 → 48) because there are more cities to hold, and L2 and the AI Lich bonus
make the Undead far more active in stalled games without finishing them. V1
is the one rule change that directly helps against a fortified giant (a
Vampire can chip it with no retaliation and heal). Recommended order: fix
`pulp_wars-1mc` (and the AI's Lich and Vampire training scores) in the same
revision as VL, then re-run this matrix; the cap rate is the number to watch.

## 9. Limits of this evidence

- Normal AI against Normal AI only. The AI never trains Knights/Vampires,
  rarely trains Liches, does not exploit Raise-then-Disband, and has the
  last-city stall (`pulp_wars-1mc`); a human plays all of these differently.
- The round cap is 150 (four-seat 120). Capped games are reported, not
  scored; the "score" rows count them as draws.
- The income-source table (section 7.4), the map-acceptance test (section
  7.1), the replay narrator (section 5), and the proposal variants
  (section 8) used throwaway scratch scripts and source copies that are not
  checked in; the variant results are reproducible by applying the stated
  change and running the matrix command in section 8.
- The proposal runs use seeds 0–11 (240–360 games each) and are compared
  game-by-game with the same seeds of the baseline; their intervals are wide
  (about ±7 points on a 200-game win rate).

## 10. Follow-ups found

- Normal policy error: the public command query offers `LAND_GRANT` from a
  stale view of neutral tiles that the reducer rejects (`INVALID_TILE`); 3 of
  1,240 games (0.24%) end in `COMMAND_REJECTED:INVALID_TILE`.
- The Normal AI never trains Knights or Vampires (every one in 1,240 games
  came from a treasure chest) and builds 15 Patrol Boats per long game.
- `pulp_wars-1mc` (last-city stall) causes about 80% of round caps in every
  pairing.

## 11. Revision 14

Bead `pulp_wars-vkq.18`: the Normal AI update for revision 14 (Plague,
Bitten, Tend cures, unanswered Vampire attacks, E2 income; see
[Normal AI](../architecture/NORMAL_AI.md#revision-14-plague-bitten-and-vampire-play-pulp_wars-vkq18))
measured with the full section-2 matrix before and after. Sections 1–10
above describe revision 13 and stay as recorded.

### 11.1 Reproduction

Same parameters as section 2 (seeds 0–29 per 1v1 cell, 1,200 games; four-seat
seeds 0–3, 40 games; caps 150/120 rounds), revision-14 rules on both sides
of the comparison; only the policy differs. The matrix script gained
telemetry that does not change play: Coins carried into and income at round
40, and per-match Plague duration (`plague`: rounds with Start Turn Plague
damage, the longest unbroken run of such rounds, distinct plagued units, the
most Plague turns of one unit, and units plagued on five or more turns).

```bash
# After (this bead's policy):
npm run balance:ruleset7-undead -- --jobs 6 --output docs/validation/RULESET_7_UNDEAD_BALANCE_R14_AFTER.json --markdown
# Before: the same command on a tree whose src/ai is main fa8d3b1's
# (git checkout fa8d3b1 -- src/ai), writing RULESET_7_UNDEAD_BALANCE_R14_BEFORE.json
```

Outputs: [before](RULESET_7_UNDEAD_BALANCE_R14_BEFORE.json) and
[after](RULESET_7_UNDEAD_BALANCE_R14_AFTER.json) (5,878 s and 4,183 s wall
with `--jobs 6` on a shared 10-core laptop). The per-game tables below come
from the script's `--detail-output` file with a scratch summarizer.

### 11.2 Results

Decided games; 95% Wilson intervals.

| Pairing | Undead win before | Undead win after      | Seat-0 win before | Seat-0 win after | Decided rounds mean/median/p90 | Cap rate      |
| ------- | ----------------- | --------------------- | ----------------- | ---------------- | ------------------------------ | ------------- |
| HU      | 58% [52–64]       | 62% [56–68] (162/262) | 42% [36–48]       | 38% [32–44]      | 36.9/34/53 → 38.2/35/63        | 15.0% → 12.7% |
| UH      | 62% [56–68]       | 66% [60–72] (168/254) | 62% [56–68]       | 66% [60–72]      | 36.0/32/55 → 35.7/32/55        | 21.3% → 15.3% |
| UU      | —                 | —                     | 52% [46–58]       | 50% [44–56]      | 37.1/33/58 → 37.4/33/60        | 14.3% → 9.3%  |
| HH      | —                 | —                     | 56% [49–62]       | 55% [49–61]      | 38.1/35/58 → 38.1/34/59        | 21.3% → 21.0% |
| Mixed   | 60% [56–64]       | 64% [60–68] (330/516) |                   |                  |                                | 109 → 84 caps |

No stalls in either run. The policy errors are the known stale-view
`LAND_GRANT` rejection (`pulp_wars-9jp`, fixed in the query separately): 5
before, 6 after (the extra one is `HH` Lakes 11 seed 29, an all-Human game
changed by the E2 and Land Grant scoring, section 11.4). Four-seat: 25 → 23
of 40 capped.

Per mixed 1v1 game (600 games):

| Measure                                                       |                     Before |                        After |
| ------------------------------------------------------------- | -------------------------: | ---------------------------: |
| Human Guards / Fighters / Catapults / Captains / Knights      | 12.6 / 7.2 / 4.7 / 0.1 / 0 |   13.7 / 6.9 / 5.6 / 1.3 / 0 |
| Undead Zombies / Skeletons / Liches / Vampires / Necromancers | 18.5 / 5.2 / 0.9 / 0 / 2.0 | 15.5 / 5.1 / 2.5 / 1.4 / 1.7 |
| Patrol Boats, Human / Undead                                  |                18.5 / 19.7 |                  10.4 / 11.5 |
| Units plagued by Lich attacks / by spread                     |                  3.4 / 8.2 |                    8.3 / 8.8 |
| Plagued unit-turns (Start Turn damage entries)                |                       83.4 |                         55.9 |
| Plague turns per plagued unit                                 |                        8.9 |                          5.2 |
| Most plagued at once, mean / p90 / max                        |             11.1 / 30 / 44 |                6.9 / 17 / 30 |
| Rounds with Plague damage, mean / p90                         |                  26.4 / 91 |                    25.7 / 99 |
| Plague deaths; cleared by a dead Lich; cured by Tend          |              2.7; 2.5; 0.0 |                3.4; 2.2; 3.0 |
| Games with Plague                                             |                 152 of 600 |                   239 of 600 |
| Bites / Bitten risings / Bitten cures                         |            6.0 / 0.9 / 0.0 |              4.4 / 1.2 / 0.2 |
| Infect risings                                                |                        2.9 |                          2.2 |
| Unanswered Vampire attacks                                    |                        0.8 |                          1.2 |
| Raise Dead Skeletons raised / lost                            |                11.9 / 10.6 |                    4.2 / 3.0 |
| Lich splash damage                                            |                       32.1 |                         41.5 |

Economy per seat (Coins carried into the turn before income, and that turn's
income):

| Measure                       | Human (mixed)                           | Undead (mixed)                          | Human mirror              | Undead mirror                           |
| ----------------------------- | --------------------------------------- | --------------------------------------- | ------------------------- | --------------------------------------- |
| Carried into round 20 / 30    | 1.5 / 2.2 → 1.5 / 2.3                   | 1.5 / 2.4 → 1.4 / 2.5                   | 1.4 / 2.3 → same          | 1.3 / 2.2 → 1.4 / 2.4                   |
| Carried into round 40         | 34.4 → 45.1                             | 51.1 → 43.8                             | 36.0 → 36.3               | 41.4 → 39.5                             |
| Income at rounds 20 / 30 / 40 | 12.2 / 19.7 / 24.5 → 12.4 / 19.9 / 25.2 | 13.8 / 22.2 / 25.5 → 13.8 / 23.1 / 24.8 | 13.1 / 21.0 / 24.3 → same | 12.9 / 20.8 / 24.4 → 12.9 / 21.3 / 25.0 |
| Income over the game          | 963 → 899                               | 1,067 → 935                             | 1,140 → 1,123             | 897 → 770                               |
| Coins at the end              | 486 → 446                               | 579 → 463                               | 607 → 595                 | 454 → 354                               |

Round-40 rows cover the seats whose game reached round 40 (mixed Human seats:
265 before, 249 after).

What changed:

- **Composition.** The Undead now train Liches (0.9 → 2.5 per game; 2.1 per
  seat in the Undead mirror) and Vampires (0 → 1.4) and fewer Zombies (18.5 →
  15.5). Humans train a Captain when afflicted (0.1 → 1.3) and cure 3.0
  Plagues per game. Patrol Boats fall by 44% in every Undead match; the Human
  mirror is deliberately untouched (18.3 per seat).
- **Plague extent is down; duration in stalls is not.** Plagued unit-turns
  fall by a third and the most plagued at once by 38% (p90 30 → 17), because
  Humans separate from plagued units, tend, and kill source Liches. But most
  Plague still happens in round-capped games (78% of plagued unit-turns
  after, 86% before): in the 84 capped mixed games Plague damage resolves in
  44% of all rounds (311 plagued unit-turns and 38 Lich applications per
  game), against 17% of rounds and 14 unit-turns in decided games.
- **Skeleton feeding loop fixed.** Raise Dead Skeletons fall from 11.9 to 4.2
  per game and their losses from 10.6 to 3.0.
- **Undead win rate** rises from 60% to 64% [60–68]; both seat orders move by
  about 4 points and the intervals overlap, so this is suggestive rather than
  significant. The Undead edge is now larger than the first-mover edge (Human
  mirror 55%). The revision-14 spec defers Undead fragility tuning to this
  measurement; it is worth a follow-up, not part of this AI bead.
- **Caps** fall in the mixed and Undead-mirror pairings (109 → 84 and 43 → 28) and are unchanged in the Human mirror; the remaining caps are the
  `pulp_wars-1mc` last-city stall.

### 11.3 Residual AI weaknesses

- **Siege replacement loops in stalled games.** A Lich no longer walks into
  visible lethal reach and is not trained on a center inside it, but in 36 of
  900 Undead 1v1 games (all long; 11 above 30 Liches, up to 75 across both
  seats of an Undead mirror) Liches still die one after another, mostly to
  Battleship splash on naval maps: the policy's splash threat covers Lich
  splash only, not Battleship splash.
- **Trained Vampires trade one unanswered hit for their life** in stalled
  games (842 trained; 654 of all 1,033 Vampires died having attacked at most
  once, against 31 of 186 treasure Vampires before): the policy attacks from
  a tile inside enemy Catapult reach. A follow-up could require a kill or a
  survivable tile for a Vampire's attack.
- **Humans do not hunt a source Lich beyond range.** A plague-source Lich is
  a priority target (10 per sourced unit, kill priority 1285), but no unit
  moves toward it, so Plague is cleared by a Lich death only 2.2 times per
  game.

### 11.4 All-Human decisions

Two policy changes reach all-Human play: the income estimate's level term is
capped at 5 (E2, which the rules already apply), and the Land Grant neutral
count excludes explored tiles whose territory owner is known although the
city is hidden (the `pulp_wars-9jp` stale-view case). In the `HH` pairing 48
of 300 final state hashes differ from the before run. Replaying those 48
with one change reverted at a time, 27 return to their before hash without
the E2 cap, 18 without the Land Grant fix, and 3 only with both reverted, so
no other change reaches all-Human play. Aggregate Human-mirror results do
not move (seat 0 56% → 55%, caps 64 → 63). Every pinned decision hash in the
Normal-policy, tactical, revision-12, and revision-13 parity tests is
unchanged; every other policy change is gated on a match with an Undead
seat.

### 11.5 Plague tuning proposal (not applied)

The user does not want a prolonged static grind. With the AI counterplay,
Plague is short where the game moves (decided games: 14 plagued unit-turns
per game, Plague in 17% of rounds) and long where it does not: in stalled,
round-capped games a Lich re-plagues the same static line every turn, so
Plague is present in 44% of rounds and the longest unbroken Plague run
reaches 123 rounds.

Measured proposal **P1: Plague lasts three of its owner's Start Turns (at
most 6 damage), and a unit spreads it only at its first plagued Start Turn.**
Throwaway rule change (a per-entry turn counter in `plagued`) with this
bead's policy, `HU` and `UH` seeds 0–11 (240 games), against the same games
under the current rule:

| Measure (per mixed game)                      |  Current rule |            P1 |
| --------------------------------------------- | ------------: | ------------: |
| Undead win (decided)                          |   62% [56–69] |   61% [54–68] |
| Round caps (of 240); decided game mean rounds |      30; 36.0 |      31; 35.4 |
| Plagued unit-turns                            |          58.2 |          37.4 |
| Plague turns per plagued unit                 |           5.6 |           3.5 |
| Most plagued at once, mean / p90 / max        | 7.5 / 17 / 28 | 6.3 / 13 / 25 |
| Rounds with Plague, mean / p90                |    28.5 / 107 |     25.3 / 85 |
| Lich applications per capped game             |          42.8 |          60.8 |

P1 cuts Plague volume by 36% and bounds every infection to six damage
without changing win rates, caps, or game length; spread still sweeps a
clump once, which keeps the dramatic moment. It cannot stop a Lich from
re-applying Plague every turn to a static line (applications in capped games
rise), so the stall itself remains the `pulp_wars-1mc` problem. Spreading
only to the plagued unit's own owner, the other candidate, changes nothing
in 1v1, where only one living seat exists. A three-turn limit with
unrestricted spread (measured on an earlier build of this policy) behaved
like P1 within noise. Recommendation: adopt P1 in a ruleset revision (it adds
a state field, so it needs an identity and schema change) and fix
`pulp_wars-1mc` for the stall.

## 12. Revision 15

Bead `pulp_wars-vkq.20`: [revision 15](../product/RULESET_7_REVISION_15_BALANCE.md)
adopts P1 from section 11.5 (Plague lasts three of its owner's Start Turns
and spreads only on the first) and lowers the Zombie from 20 to 18 HP, with
the Normal AI valuing Plague by its public remaining turns. Sections 1–11
stay as recorded.

### 12.1 Reproduction

Seeds 0–11 of every 1v1 cell (HU, UH, UU, HH × five maps × 11 and 14; 480
games) plus the four-seat extra (HUHU, UHUH, seeds 0–3; 40 games), the
section-2 round caps (150/120). Before is main `2c41035` (revision 14 with
the `pulp_wars-vkq.18` policy); after is this revision. A third run changed
only the Zombie to 19 HP to test the milder value the bead allowed.

```bash
# After (this revision):
npm run balance:ruleset7-undead -- --seeds 12 --jobs 4 --output docs/validation/RULESET_7_UNDEAD_BALANCE_R15_AFTER.json --detail-output after-detail.json --markdown
# Before: the same command on a checkout of main 2c41035
# (git archive 2c41035 | tar -x -C before), writing RULESET_7_UNDEAD_BALANCE_R15_BEFORE.json
# Zombie 19: the same command on a copy of this revision with the Zombie's
# maxHp set to 19 in src/engine/rules/ruleset-v7.ts (not kept)
```

Outputs: [before](RULESET_7_UNDEAD_BALANCE_R15_BEFORE.json) and
[after](RULESET_7_UNDEAD_BALANCE_R15_AFTER.json) (2,742 s, 3,315 s, and
2,525 s wall for before, after, and Zombie 19 with `--jobs 4` on a shared
10-core laptop). The tables come from the `--detail-output` files with a
scratch summarizer. No run had an error, stall, or exception.

### 12.2 Results

Decided games; 95% Wilson intervals. Mixed = HU + UH (240 games per run).

| Measure                                                    | Before (r14)          | After (r15, Zombie 18)   | Zombie 19 (not adopted)  |
| ---------------------------------------------------------- | --------------------- | ------------------------ | ------------------------ |
| Undead win, mixed                                          | 62% [56–69] (131/210) | 59% [52–66] (122/206)    | 60% [53–66] (124/208)    |
| Undead win, HU / UH                                        | 60% / 65%             | 56% / 62%                | 58% / 61%                |
| Seat-0 win, UU / HH                                        | 51% / 53%             | 55% / 53%                | 52% / 53%                |
| Round caps, mixed / UU / HH (of 240 / 120 / 120)           | 30 / 11 / 19          | 34 / 14 / 19             | 32 / 11 / 19             |
| Decided rounds, mixed mean / median / p90                  | 36.0 / 33 / 56        | 34.7 / 32 / 53           | 36.4 / 33 / 58           |
| Decided rounds, UU mean / median / p90                     | 35.2 / 32 / 55        | 31.1 / 30 / 45           | 32.8 / 32 / 51           |
| Plagued unit-turns per mixed game                          | 58.2                  | 39.9 (−31%)              | 42.9                     |
| … in capped / decided games                                | 338.7 / 18.2          | 219.3 / 10.3             | 213.5 / 16.7             |
| Plague turns per plagued unit                              | 5.6                   | 3.5                      | 3.9                      |
| Most plagued at once, mean / p90 / max (games with Plague) | 7.5 / 17 / 28         | 7.3 / 16 / 24            | 6.8 / 17 / 24            |
| Rounds with Plague, mean / p90                             | 28.5 / 107            | 25.2 / 88                | 25.1 / 97                |
| Longest unbroken Plague run, mean / max                    | 21.3 / 121            | 16.0 / 117               | 16.9 / 112               |
| Mixed games with Plague                                    | 85                    | 83                       | 85                       |
| Units plagued by Lich / by spread, per game                | 8.3 / 9.2             | 13.5 / 11.1              | 14.0 / 12.0              |
| Plague damage / deaths, per game                           | 115.1 / 3.3           | 78.6 / 2.6               | 84.4 / 3.2               |
| Ended by dead Lich / expiry / Tend, per game               | 2.0 / 0 / 3.8         | 1.9 / 8.2 / 3.8          | 1.7 / 9.1 / 4.7          |
| Infections ended after 0 / 1 / 2 / 3 turns (all games)     | —                     | 1264 / 1770 / 707 / 2113 | 1399 / 1693 / 768 / 2348 |
| Bites / Bitten risings, per game                           | 4.5 / 1.0             | 4.0 / 1.1                | 4.1 / 1.0                |
| Undead Zombies trained per mixed game                      | 15.9                  | 10.6                     | 11.9                     |
| Four-seat: Undead wins / decided / capped (of 40)          | 1 / 1 / 23            | 1 / 1 / 27               | 1 / 3 / 23               |

"Plague turns per plagued unit" is Plague damage entries per distinct plagued
unit (a unit plagued again after expiry counts once). "Ended after 0 turns"
counts infections whose unit died, was tended, or lost its Lich before its
owner's next Start Turn.

What changed:

- **Plague extent falls as P1 predicted.** Plagued unit-turns fall by 31%,
  turns per plagued unit from 5.6 to 3.5, the p90 of Plague rounds from 107
  to 88, and the longest unbroken run by a quarter on average. The p90 of the
  most plagued units at once barely moves (17 → 16): the first-turn spread
  still sweeps a clump once, which keeps the dramatic moment. Liches
  re-plague expired units (applications 8.3 → 13.5 per game), so capped
  games still carry most Plague (219 unit-turns per capped game); that stall
  is `pulp_wars-1mc`.
- **Undead win rate moves toward the target but not significantly.** The
  mixed Undead win rate falls from 62% to 59% [52–66]; both seat orders fall
  by 3–4 points and the intervals overlap, so, as with vkq.18, this is
  suggestive rather than significant at 480 games. Zombie 19 gives 60%
  [53–66], indistinguishable from 18. 18 did not overshoot below 50%, so the
  bead's fallback does not apply and revision 15 keeps 18, the value that
  best matches "easily overrun".
- **Zombie count.** The Normal AI's training score still favours maximum HP
  (section 11.2), so an 18-HP Zombie is chosen less often: 10.6 Zombies per
  mixed game instead of 15.9 (Zombie 19: 11.9).
  Undead-mirror games get shorter (decided mean 35.2 → 31.1 rounds).
- **Caps and game length** move within noise (mixed caps 30 → 34, decided
  mixed mean 36.0 → 34.7 rounds).
- **All-Human play is unchanged:** all 120 HH games have the same command
  count, rounds, winner, seat results, and faction statistics in both runs
  (their final state hashes differ because the state carries the ruleset
  identity).

### 12.3 Remaining gap to ~55%

A further Undead nerf would need a larger sample to measure: at 480 games a
4-point change is inside the interval. Candidates for a later revision are
a lower Zombie Defense or cost change, or making the AI's Zombie training
less HP-driven; none is applied here.

## 13. Endgame siege (`pulp_wars-1mc`)

Bead `pulp_wars-1mc`: the Normal AI's last-city stall, which sections 6,
8.7, and 12 left as the cause of most round caps. The policy change is
described in
[Normal AI: endgame siege](../architecture/NORMAL_AI.md#endgame-siege-pulp_wars-1mc);
rules are unchanged (revision 15). Sections 1–12 stay as recorded.

### 13.1 Reproduction

The full section-2 matrix: seeds 0–29 of every 1v1 cell (HU, UH, UU, HH ×
five maps × 11 and 14; 1,200 games) plus the four-seat extra (HUHU, UHUH,
seeds 0–3; 40 games), 150/120-round caps. Before is main `c7b1849`; its
seeds 0–11 reproduce all 520 final state hashes of
[RULESET_7_UNDEAD_BALANCE_R15_AFTER.json](RULESET_7_UNDEAD_BALANCE_R15_AFTER.json).

```bash
# After (this bead's policy):
npm run balance:ruleset7-undead -- --seeds 30 --jobs 5 --output docs/validation/RULESET_7_UNDEAD_BALANCE_ENDGAME_AFTER.json --detail-output after-detail.json
# Before: the same command on a copy of main c7b1849, writing
# RULESET_7_UNDEAD_BALANCE_ENDGAME_BEFORE.json
```

Outputs: [before](RULESET_7_UNDEAD_BALANCE_ENDGAME_BEFORE.json) and
[after](RULESET_7_UNDEAD_BALANCE_ENDGAME_AFTER.json) (6,282 s and 3,454 s
wall, run concurrently with `--jobs 5` each on a shared 10-core laptop).
Neither run had an error, stall, or exception. The stall categories below
come from a scratch replay of every round-capped 1v1 game that records the
last 30 rounds (not checked in): the leader is the seat with more cities, the
target its opponent's remaining cities.

### 13.2 Why games stalled

Of the 194 round-capped 1v1 games before, 171 (88%) were last-city stalls:
the leader held at least twice the loser's one or two cities and could not
finish. Every pairing stalled at a similar rate (Human mirror 20%, mixed
15%, Undead mirror 14%).

Categories are checked in this order; "near" means within Chebyshev 3 of a
target center.

| Stall (state at round 150 and the leader's last 30 rounds)                                                                                                             | Before | After |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -----: | ----: |
| Not a last-city stall: the loser holds two or more cities and more than half as many as the leader                                                                     |     23 |    16 |
| **Squatter:** a leader Captain, Necromancer, or Catapult stands on the besieged center (the loser earns nothing, but nothing can capture)                              |     24 |     1 |
| **Fortified giant:** a Juggernaut or Abomination holds the center and recovers faster than the attacks the policy will make                                            |      4 |     0 |
| **Defender killed, no capturer next to the center:** the leader kills five or more center defenders (up to one a turn as the loser retrains) without capturing         |     62 |    11 |
| **Army never closes:** at most two leader land units near the target (capturers walled in behind their own Catapults, kept home, embarked, or the city never explored) |     64 |     6 |
| **Siege without a kill:** more leader units near the target, but fewer than five center kills (for example Guards chipping a walled, fortified defender that recovers) |     17 |     6 |
| Total round caps                                                                                                                                                       |    194 |    40 |

Contributing policy rules: movement toward an objective used Chebyshev
progress only, so a capturer behind its own siege line never stepped
sideways; a siege unit would not stand 2–3 from the objective without a
durable screen; a non-capturing unit that reached a hostile center had no
reason to leave; the harmful-attack test only excused an attack with a
single lethal follow-up, never several combined attacks; and Pillage (1170)
outranked every move, so units cycled Pillage against the loser's rebuilds.

### 13.3 Results

Decided games; 95% Wilson intervals.

| Pairing   | Round caps before → after | Decided rounds mean / median / p90 | All games mean rounds | Undead win before → after | Seat-0 win before → after |
| --------- | ------------------------- | ---------------------------------- | --------------------- | ------------------------- | ------------------------- |
| HU        | 44 → 8 (14.7% → 2.7%)     | 37.1/34/56 → 33.4/31/49            | 53.8 → 36.6           | 58% [52–64] → 56% [50–62] | 42% → 44%                 |
| UH        | 46 → 6 (15.3% → 2.0%)     | 36.3/32/58 → 31.5/30/46            | 53.9 → 33.9           | 65% [59–71] → 62% [56–67] | 65% → 62%                 |
| Mixed     | 90 → 14 (15.0% → 2.3%)    | 36.7/33/57 → 32.5/31/48            | 53.9 → 35.2           | 61% [57–65] → 59% [55–63] | 54% → 53%                 |
| UU        | 43 → 10 (14.3% → 3.3%)    | 33.1/31/50 → 31.8/29/45            | 50.0 → 35.8           | —                         | 52% [46–58] → 52% [46–57] |
| HH        | 61 → 16 (20.3% → 5.3%)    | 38.6/35/60 → 33.3/31/49            | 61.4 → 39.5           | —                         | 55% [48–61] → 55% [49–60] |
| All 1v1   | 194 → 40 (16.2% → 3.3%)   | 36.2/33/57 → 32.5/30/48            | 54.8 → 36.4           | —                         | 53% → 53%                 |
| Four-seat | 27 → 13 of 40             | —                                  | 92.6 → 67.4           | —                         | —                         |

Round caps by board (1v1, before → after): Dry Land 11: 3 → 2, 14: 17 → 7;
Pangea 11: 21 → 0, 14: 33 → 3; Continents 11: 25 → 4, 14: 15 → 4;
Archipelago 11: 7 → 3, 14: 25 → 8; Lakes 11: 11 → 3, 14: 37 → 6.

Game by game (1v1): 164 of the 194 formerly capped games are decided
(median round 37, p90 64), 30 stay capped, and 10 games decided before now
reach the cap. Of the 996 games decided in both runs, 593 end sooner, 192
end in the same round, and 35 (3.5%) change winner: the endgame starts
before the game is over (often around round 8–20 on 11 × 11, when the
leader has taken every reachable village and holds three cities against
one), and a losing seat sometimes wins the race it opens.

Per mixed game, trained Catapults fall from 5.9 to 2.4, Liches from 2.2 to
1.5, and rounds with Plague damage from 9.6 to 3.1: most of that volume was
produced by round-capped games (sections 11.2 and 12.2).

What changed:

- **Round caps fall by 79%** in the 1v1 matrix and by half in the four-seat
  extra, in every pairing; Pangea 11 has no cap left. Games are shorter
  (all-games mean 54.8 → 36.4 rounds) mostly because the stalled tail is
  gone; decided games also end about four rounds sooner.
- **Win rates do not move beyond noise.** The mixed Undead win rate is 59%
  [55–63] after against 61% [57–65] before; seat and first-mover rates are
  unchanged.
- **Human mirror.** The endgame mode is not faction-gated, so all-Human play
  changes once a seat reaches the endgame: HH caps fall from 61 to 16 and
  decided HH games end 5 rounds sooner, with seat 0 still winning 55%. Only
  22 of 300 HH final state hashes are unchanged (the others enter the
  endgame before they end). Decisions outside the endgame are unchanged:
  every non-endgame decision along 12 sampled matches (2,951 decisions,
  every pairing) and every decision of the pinned Cooperative parity match
  is byte-identical to the `c7b1849` policy's decision for the same view.

### 13.4 Remaining caps

Of the 40 remaining 1v1 caps, 16 are not last-city stalls (the loser still
holds two or three cities against three or four; the endgame mode does not
start). The rest are mostly real sieges the leader loses: the loser's
Catapults or Liches kill the leader's approaching or freshly trained units
every turn (Undead leaders feed Zombies and Necromancers into a walled
defender), or the leader's army is on another landmass and the naval plan
never lands it. A later bead could teach the Normal AI to invade a last city
across water deliberately and to stop training into a center inside visible
lethal reach for all roles, not only siege units.

## 14. Lich safety, Vampire survival, and Lich hunts (`pulp_wars-vkq.21`)

Bead `pulp_wars-vkq.21`: the three residual AI weaknesses of section 11.3.
The policy change is described in
[Normal AI](../architecture/NORMAL_AI.md#lich-safety-vampire-survival-and-lich-hunts-pulp_wars-vkq21);
rules are unchanged (revision 15). Sections 1–13 stay as recorded.

### 14.1 Reproduction

The full section-2 matrix (seeds 0–29 of every 1v1 cell, 1,200 games, plus
the four-seat extra, 40 games), 150/120-round caps. Before is main
`515be65`; its 1,240 final state hashes equal those of
[RULESET_7_UNDEAD_BALANCE_ENDGAME_AFTER.json](RULESET_7_UNDEAD_BALANCE_ENDGAME_AFTER.json).
The matrix script gained Lich telemetry that does not change play (`liches`
per game: Liches created and killed, deaths to Battleship fire and splash,
killers of Liches and Undead Vampires by role, and for every Lich that
applied Plague whether and how many rounds after its first Plague it was
killed), so both runs use this bead's script.

```bash
# After (this bead's policy):
npm run balance:ruleset7-undead -- --seeds 30 --jobs 6 --output docs/validation/RULESET_7_UNDEAD_BALANCE_VKQ21_AFTER.json --detail-output after-detail.json
# Before: the same command (--jobs 5) on a copy of main 515be65 with this
# bead's scripts/ruleset7-undead-balance-matrix.ts, writing
# RULESET_7_UNDEAD_BALANCE_VKQ21_BEFORE.json
```

Outputs: [before](RULESET_7_UNDEAD_BALANCE_VKQ21_BEFORE.json) and
[after](RULESET_7_UNDEAD_BALANCE_VKQ21_AFTER.json) (4,564 s and 2,674 s wall
on a shared 10-core laptop). Neither run had an error, stall, or exception.
The tables come from the `--detail-output` files with a scratch summarizer;
the at-sea counts come from a scratch replay of the 48 mixed games on
Archipelago, Continents, and Lakes, seeds 0–3 (not checked in).

### 14.2 Why Liches and Vampires died

Battleship splash was a real gap (53 Lich deaths in the 600 mixed games
before), but not the main one. In the naval-map sample 23 of 33 Lich deaths
and 37 of 52 Undead Vampire deaths happened afloat: the naval plan boarded
Liches and Vampires with the invasion, and an embarked unit (no attack,
Defense 1, sight 1) met Patrol Boats and Battleships it could not see. The
policy then trained the next one (the Lich bias while fewer than three are
owned, the Vampire bias while none is). On land, Vampires attacked from
tiles inside Catapult or Marksman reach and died the next turn: 291 of 375
Vampire deaths in mixed games came after at most one attack. After this bead
the same sample has 1 of 5 Lich deaths and none of 6 Vampire deaths afloat.

### 14.3 Results

Decided games; 95% Wilson intervals. Mixed = HU + UH (600 games).

| Measure                                                | Before                | After                 |
| ------------------------------------------------------ | --------------------- | --------------------- |
| Undead win, mixed                                      | 59% [55–63] (345/586) | 59% [55–63] (344/587) |
| Undead win, HU / UH                                    | 56% / 62%             | 56% / 62%             |
| Seat-0 win, UU / HH                                    | 52% / 55%             | 55% / 55%             |
| Round caps, mixed / UU / HH (of 600 / 300 / 300)       | 14 / 10 / 16          | 13 / 14 / 16          |
| Decided rounds mean, HU / UH / UU                      | 33.4 / 31.5 / 31.8    | 33.4 / 31.8 / 31.3    |
| Liches created / killed, mixed                         | 875 / 259             | 753 / 142             |
| … killed by Battleship fire / Battleship splash        | 65 / 53               | 34 / 22               |
| … killed by Patrol Boats / Human Catapults             | 32 / 63               | 18 / 23               |
| Liches created / killed, UU                            | 1,158 / 606           | 909 / 351             |
| Undead Vampires (trained + treasure), mixed            | 557 (373 + 184)       | 349 (164 + 185)       |
| Vampires killed; survival to the end                   | 375; 33%              | 135; 61%              |
| Vampires killed having attacked at most once           | 291                   | 61                    |
| Vampire attacks / kills (attacks per Vampire)          | 925 / 522 (1.7)       | 1,177 / 775 (3.4)     |
| Vampire survival, UU                                   | 26%                   | 48%                   |
| Liches that applied Plague / killed later, mixed       | 369 / 138             | 376 / 116             |
| Rounds from first Plague to the kill, mean             | 14.1                  | 12.6                  |
| Plagued unit-turns per mixed game                      | 13.2                  | 8.6 (−35%)            |
| Rounds with Plague damage, mean (games with Plague)    | 11.6                  | 10.0                  |
| Most plagued at once, mean (games with Plague)         | 4.9                   | 4.8                   |
| Four-seat: capped (of 40); plagued unit-turns per game | 13; 53.4              | 12; 76.4              |

What changed:

- **Lich losses nearly halve** (259 → 142 killed in mixed games, 606 → 351
  in the Undead mirror), and fewer are trained to replace them (1.46 → 1.26
  per mixed game). Battleship kills fall from 118 to 56 (splash 53 → 22);
  most of the rest is Juggernauts and Catapults on land.
- **Vampires live and fight.** Survival rises from 33% to 61%, attacks per
  Vampire double (1.7 → 3.4), and deaths after at most one attack fall from
  291 to 61. Fewer are trained (0.62 → 0.27 per mixed game) because the
  living one is not replaced, yet they make 27% more attacks and 48% more
  kills.
- **Plague volume falls by a third** (13.2 → 8.6 plagued unit-turns per mixed
  game). A hunted Lich is killed sooner (14.1 → 12.6 rounds from its first
  Plague), but fewer are killed in total (138 → 116): Liches now avoid
  lethal reach more often, and a hunter closing in makes a plague source
  retreat (its revision-14 rule) instead of re-plaguing. A hunt ablation
  (this policy without the hunt move, mixed seeds 0–3, 80 games) had 25.9
  plagued unit-turns per game against 4.7 with it, the same Undead win count
  (43), and more Lich deaths (25 against 8).
- **Win rates, game length, and caps do not move beyond noise.** The mixed
  Undead win rate stays 59% [55–63] in both seat orders; decided games keep
  their length. Undead-mirror caps rise from 10 to 14 of 300 (Liches that no
  longer sail cannot join an invasion across water); mixed caps fall from 14
  to 13.
- **Four-seat.** Plague volume rises (53 → 76 plagued unit-turns per game):
  Liches that no longer die at sea keep plaguing in the long three-AI games;
  caps are 13 → 12 of 40.
- **All-Human play is unchanged:** all 300 HH games have byte-identical final
  state hashes in both runs, and every pinned decision hash in the
  Normal-policy, tactical, endgame, revision-14, and revision-15 tests is
  unchanged.

### 14.4 Remaining weaknesses

Liches and Vampires no longer join naval invasions, so on Archipelago an
Undead invasion lands without siege support (the section 13.4 last-city
caps across water are unaffected). Hunters approach a plaguing Lich only
from within six tiles of a firing position and never into visible lethal
reach, so a Lich screened by its own line is still out of reach; the main
effect is to push sources back rather than to kill them.
