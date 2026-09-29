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
