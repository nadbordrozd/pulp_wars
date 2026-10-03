# Ruleset 7 Martians: coarse balance report (Dry Land)

Bead `pulp_wars-t6s.5`, identity `pulp-wars-poc-7r25`. It measures the
[Martian overlay](../product/RULESET_7_MARTIANS.md) against the four other
factions with the Martian Normal AI of `pulp_wars-t6s.3`, and records the
one number it changed in the overlay's
[tuning record](../product/RULESET_7_MARTIANS.md#165-tuning-record).

**Coarse by the user's decision (2026-10-02).** Balance is tested on Dry
Land only, with small samples (60 games per faction pairing, 30 per seat
order), and this pass only removes gross imbalances and blind spots: no
faction pairing more lopsided than about 70/30, no faction helpless against
a specific enemy tool, no unit dominant or dead, no ability unused or used
to absurd effect. Fine tuning (the 40-60% bands, the usefulness thresholds,
and the watch bands of
[section 16.4](../product/RULESET_7_MARTIANS.md#164-balance-acceptance)) is
deferred until the user asks for it; they are reported here, not chased.
**Water maps were not tested.** All results are Normal AI against Normal
AI: they measure the rules as the current policy plays them. The intervals
are wide (about ±12 points); read the numbers as coarse.

## 1. Summary

- **No gross imbalance.** Martians win 55-57% of decided games against each
  faction before tuning and 53-57% after; no seat order is beyond 60/40.
  No game reached the round cap (the four-faction reference at `7r23` is
  0.8%). No errors, stalls, or exceptions in 286 + 286 games.
- **One number changed** (inside the
  [bounds](../product/RULESET_7_MARTIANS.md#163-tuning-bounds)): the
  **Colossus Defense 2.5** (was 3). The Colossus, a level-5 city reward,
  traded 17.8 kills per loss against 2.9-6.5 for the other factions'
  Juggernaut-role units, and almost never died (16 lost of 203 granted). At
  Defense 2.5 it trades 8.6. Win rates barely move (56% to 55% overall).
- **No faction is helpless against a Martian tool, and Martians are helpless
  against nothing** ([section 5](#5-blind-spots)). The predicted hard
  matchup, Goblin packs against Shields, is even (Martians 57%), and Kabooms
  always cost Martian HP.
- **Every Martian unit is produced and every ability is used.** Two
  usefulness thresholds of section 16.4 are near misses, both on the AI
  side: Mind Control in 39% of the seat-games with a Brain (threshold 50%)
  and the Tractor Beam in 37% of those with a Mothership (50%). The Tripod
  and Mothership thresholds pass, so the pre-approved tier-2 fallback was
  not applied.

## 2. Reproduction

```bash
# before: Colossus Defense 3 (7r23); after: this change (7r25)
npm run balance:ruleset7-undead -- --jobs 6 --maps dry-land --seeds 15 --pairings MH,HM,MU,UM,MG,GM,MD,DM,MM,MHUG,DMHU,GDMH,UGDM --output RULESET_7_MARTIAN_BALANCE_AFTER.json --detail-output after-detail.json
```

| Parameter         | Value                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| 1v1 pairings      | `MH`, `HM`, `MU`, `UM`, `MG`, `GM`, `MD`, `DM`, `MM`                                                          |
| Map, sizes, seeds | `DRY_LAND`; 11 and 14; seeds 0-14 (270 games; 60 per faction pairing)                                         |
| Four-seat mixes   | `MHUG`, `DMHU`, `GDMH`, `UGDM`, 16 x 16, seeds 0-3 (16 games, a sanity check)                                 |
| Caps              | 150 rounds (1v1), 120 (four-seat), 30,000 commands                                                            |
| Mode / difficulty | Rival, Normal                                                                                                 |
| Reference         | the four-faction pairings of the [revision-20 report](RULESET_7_REVISION_20_BALANCE.md) at `7r23`, not re-run |

Outputs: [before](RULESET_7_MARTIAN_BALANCE_BEFORE.json) and
[after](RULESET_7_MARTIAN_BALANCE_AFTER.json). The matrix script now has
the Martian pairings and mixes and writes `MatrixEntry.martian` (per Martian
seat: units trained, kills and losses by role with Thralls apart, the
killer of every Martian loss, Shield absorption by source and role and the
Force Field part, full and half rays, Pierce on hostile and on own units,
Beam Down with the captures of beamed units, Mind Control victims, Thralls,
Tractor Beams off centers and the captures that followed, Martian units
killed at full HP or by one, two, or three units in one enemy turn, and
Kabooms without HP damage) and `summary.martian` (win rates, cap rates, the
section 16.4 thresholds and watch bands, and the opposing faction's units,
kills, losses, and commands). The other summaries are unchanged: the
Dinosaur cap reference leaves the Martian pairings out. The before output
was written while the beamed-capture window was one round (it counts
none); the after output uses three rounds, as the script does now.

**Parity.** The tuning changes no other faction: 36 four-faction games
(`HU`, `UH`, `GD`, `DG`, `HG`, `DU`, sizes 11 and 14, seeds 0-2) end in
the same state hash as the [revision-20 record](RULESET_7_REVISION_20_BALANCE_AFTER.json)
at the same identity (`7r23`, before the Ice Folk engine). The after run was
made on `7r23` with the new number and repeated on the final tree (`7r25`,
with the Ice Folk engine of `7r24`): all 286 games have the same winner and
length, and `summary.martian` is identical. A four-seat match of the
harness ends when seat 0 is eliminated, so the mixes show no faction win
rate; all 16 ended that way or by a victory, without errors.

## 3. Win rates (decided games, 95% Wilson intervals)

| Pairing (Martian wins) | Before        | After         | Seat orders after | Rounds (mean) |
| ---------------------- | ------------- | ------------- | ----------------- | ------------: |
| Martian over Human     | 56.7% [44-68] | 53.3% [41-65] | `MH` 57, `HM` 50  |            27 |
| Martian over Undead    | 55.0% [42-67] | 53.3% [41-65] | `MU` 60, `UM` 47  |            26 |
| Martian over Goblin    | 56.7% [44-68] | 56.7% [44-68] | `MG` 60, `GM` 53  |            22 |
| Martian over Dinosaur  | 55.0% [42-67] | 55.0% [42-67] | `MD` 57, `DM` 53  |            26 |
| All mixed              | 55.8% [50-62] | 54.6% [48-61] |                   |               |

Martian mirror, seat 0 wins: 57% before and after. Round caps: none in any
Martian pairing (reference 4 in 480 four-faction games, 0.8%).

Screening (same seeds, Martian pairings only; one round):

| Candidate                     | All mixed | Colossus kills / losses |  K/L |
| ----------------------------- | --------: | ----------------------: | ---: |
| none (before)                 |     55.8% |                285 / 16 | 17.8 |
| Colossus HP 28                |     55.4% |                227 / 23 |  9.9 |
| Colossus Defense 2.5 (chosen) |     54.6% |                224 / 26 |  8.6 |

## 4. Diagnosis

**Why the Colossus.** It is the one Martian unit whose numbers stand apart
from its peers. Every faction gets its Juggernaut-role reward at the same
rate (39 Trolls in 17 Goblin seat-games, 42 Colossi in 16 Martian
seat-games of the same matches), but the Colossus fires its heat ray from
two tiles without retaliation, recharges a Shield of 3 (4 next to a
Projector) every turn, and at Defense 3 made every melee hit on it cost the
attacker more than the Colossus, so the policy rarely attacked it. Defense
2.5 makes it cheaper to hit and to kill without touching what it is for (32
HP, Shield 3, the range-2 ray). It still trades best of its role (8.6;
against Dinosaurs 20.8 on 4 losses, a small sample).

**The win-rate gaps with and without a Tripod (67% against 49%) and a
Mothership (68% against 52%) exceed the 15-point watch band, but they are
not dominance.** Tier-3 units come with long, rich games: the opposing
factions show larger gaps for their own `CATAPULT` role (81% against 38%)
and `KNIGHT` role (70% against 39%), and the Brain, a tier-2 support unit
with no kills, shows the largest gap of all (82% against 30%). The Tripod
makes 11% of Martian kills and the Mothership 2%.

**Why Martians sit at 53-57%.** No single tool carries it: the Grunt makes
60% of Martian kills at 0.92 kills per loss (the Human Fighter 0.72, the
Caveman 0.52 against Martians), the Shield Projector's Force Field absorbs
2,116 damage over 240 seat-games, and Beam Down brings fresh units to the
front. This is inside the coarse goal and was not tuned further.

## 5. Blind spots

After tuning, Dry Land, 240 Martian seat-games against the four factions
and 60 opposing seat-games per faction. K/L is kills per loss of the role
(kills include retaliation and splash). "Dead" means the Normal AI never or
almost never produces the unit.

| Pairing  | Martian units (K/L)                                                                                   | Opponent units against Martians (K/L)                                                                                    | What kills Martians                                                    | Dead or unused                                                     |
| -------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Human    | Grunt 0.74, Projector 1.41, Ray Gunner 1.14, Tripod 1.88, Saucer 0.76, Mothership 0.40, Colossus 7.2  | Fighter 0.72, Guard 1.15, Catapult 7.7, Juggernaut 5.3, Raider 0.50, Marksman 0.60                                       | Fighter, Guard, Juggernaut                                             | **Knight and Captain never trained** (AI); Mind Control 15 uses    |
| Undead   | Grunt 0.87, Projector 1.65, Ray Gunner 2.15, Tripod 2.00, Saucer 1.00, Mothership 0.76, Colossus 6.6  | Skeleton 0.69, Zombie 0.56, Lich 20.3, Abomination 6.7, Vampire 6.2 (reward and treasure only), Ghoul 0.52, Banshee 0.25 | Skeleton, Zombie, Abomination, Vampire, Lich; Plague 246 HP, 11 deaths | Vampire 1 trained; Wail 18 uses                                    |
| Goblin   | Grunt 1.16, Projector 0.87, Ray Gunner 1.60, Tripod 1.94, Saucer 0.46, Mothership 0.60, Colossus 4.6  | Goblin 0.31, Orc Brute 1.21, Wolf Rider 0.93, Troll 4.5, Bomb Chucker 1.38, Warboss 0.90                                 | Goblin, Orc Brute, Wolf Rider, Troll                                   | **Scrap Buggy never trained** (AI); Mind Control 4 uses            |
| Dinosaur | Grunt 0.94, Projector 0.86, Ray Gunner 1.44, Tripod 3.48, Saucer 0.56, Mothership 2.00, Colossus 20.8 | Caveman 0.52, Ankylosaurus 1.64, Raptor 0.88, Triceratops 1.95, Brontosaurus 3.2                                         | Caveman, Ankylosaurus, Raptor                                          | **T-Rex never laid**, Spitter 4 (AI, as in the revision-20 report) |

Every Martian role is produced in every pairing: Grunt in all 240
seat-games, Saucer 171, Shield Projector 169, Brain 114, Ray Gunner 85,
Tripod 70, Mothership 38; 199 Colossi in 87 seat-games. Brains make no
kills (support; K/L 0) and Thralls trade 0.04 (they cost nothing and are
the front row).

The checks the bead asked for:

- **Goblin packs against Shields.** Goblins win 43%; Martian units killed at
  full HP in one enemy turn exist in 77% of Goblin seat-games (focus fire
  works best for Goblins), and all 147 Kabooms that reached Martian units
  cost them HP (none was absorbed whole). Not helpless either way: the Grunt
  trades 1.16 against Goblins.
- **Plague bypassing Shields.** 246 Plague damage and 11 Martian deaths in
  60 Undead games; Undead win 47%. A real cost, not a blind spot. The Lich
  trades 20.3 against Martians (61 kills, 3 losses; 11% of the Undead's
  kills): a watch item.
- **Raptor and Caveman rushes, the T-Rex.** Cavemen and Raptors make 54% of
  the Dinosaur kills of Martians and Dinosaurs win 45%; the opening holds.
  The T-Rex is never laid (an AI fact for every faction).
- **Human Knights and Catapults against Shields.** No Human seat trains a
  Knight (the revision-20 AI finding). Catapults trade 7.7 against Martians
  (23 kills, 3 losses): Humans have a working answer to Shields at range.
- **Mind Control on Goblins.** It is not abused: 4 Mind Controls in 21
  Goblin seat-games with a Brain (19%), against 63% of the Undead ones. The
  "Mind Control denial" rule of the Normal AI keeps units of 6 HP or less
  out of a ready Brain's reach, which is every Goblin; Goblin play does not
  suffer for it (43% overall). Victims across all pairings (63 Mind Controls): 32 Fighter-role, 26
  Guard-role, 2 Raider-role, 2 Marksman-role, 1 Warboss, averaging 4.0 HP.
- **The Tractor Beam emptying cities.** 28 hostile defenders were pulled off
  a center; the city fell within two rounds 4 times (14.3%; watch band at
  most 50%).
- **Beam Down backdoor captures.** 862 Beam Downs in 138 seat-games; units
  beamed in the last three rounds made 20 captures, 16 of them cities taken
  from the opponent (2% of the 707 Martian city captures; 14 seat-games).
  Passengers die before their next turn 7 times. Strong logistics, no
  absurd effect.
- **Pierce friendly fire.** 141 Pierce hits on hostile units (479 HP damage,
  4 kills) against 27 on own units (18 HP damage, no kill): the Shield
  absorbs most of the friendly part.
- **Tripod and Mothership usefulness (section 16.4).** Tripod trained in 79%
  of the seat-games with Sawmilling (threshold 50%), a Pierce hit in 57% of
  those (50%); Mothership trained in 70% of the seat-games of matches of 35
  rounds or more (15%), a Tractor Beam in 37% of those (50%: missed, see
  section 6). Kill shares: Tripod 11%, Mothership 2%; no role other than the
  Grunt exceeds 40%.

Section 16.4 usefulness thresholds, after tuning (mixed 1v1):

| Unit or ability  | Measured                                        | Threshold | Met |
| ---------------- | ----------------------------------------------- | --------- | --- |
| Saucer           | trained in 171 of 240 seat-games (71%)          | 50%       | yes |
| Beam Down        | in 127 of 171 with a Saucer (74%)               | 50%       | yes |
| Shield Projector | trained in 169 of 240 (70%); Force Field in 83% | 50% / 50% | yes |
| Ray Gunner       | 85 of 121 with Marksmanship (70%); 55% at full  | 50% / 25% | yes |
| Brain            | 114 of 195 with Administration (58%)            | 50%       | yes |
| Mind Control     | in 44 of 114 with a Brain (39%)                 | 50%       | no  |
| Tripod           | 70 of 89 with Sawmilling (79%); Pierce in 57%   | 50% / 50% | yes |
| Mothership       | 33 of 47 seat-games of 35+ rounds (70%)         | 15%       | yes |
| Tractor Beam     | in 14 of 38 with a Mothership (37%)             | 50%       | no  |
| Colossus         | 199 granted in 87 seat-games                    | reported  | —   |

Watch bands: focus fire (a Martian unit killed at full HP in one enemy
turn) in 54% of opposing seat-games (at least half: met); pull-then-capture
15% (at most half: met); kill share of non-Grunt roles at most 11% (at most
40%: met); with/without Tripod 18 points and Mothership 16 points (15:
confounded, [section 4](#4-diagnosis)).

## 6. Proposals

None was applied: each needs an AI change or root approval.

1. **Mind Control is used in 39% of Brain seat-games** (threshold 50%). The
   Martian policy converts at 1186 whenever a target is in range; targets
   are scarce because every opposing seat's "Mind Control denial" steps
   units of 6 HP or less out of range, and against Goblins that is every
   unit (19%). Raising the HP threshold inside the bounds (to 7 or 8) would
   add targets but also make Mind Control much stronger against Goblins and
   Humans at the end of every exchange; at coarse scope it is not gross.
   Proposal for a later AI pass: let the Brain approach behind the line
   (its move rule stays outside lethal reach) before changing the number.
2. **The Tractor Beam is used in 37% of Mothership seat-games** (threshold
   50%). The policy scores only five kinds of pull and treats any other as
   no candidate; the first Mothership arrives late (median round 33) and few seats have one (38).
   Proposal: an AI pass on its scoring, measured head to head; no rule
   change.
3. **Dead opposing units (AI, unchanged):** no Human Knight or Captain,
   no Goblin Scrap Buggy, no T-Rex, 4 Spitters, 1 Vampire trained against
   Martians. The revision-20 proposals (a savings plan for Chivalry units, a
   Spitter bias) still apply.
4. **Watch the Lich against Martians** (20.3 kills per loss, Plague
   uncured) and **the Colossus against Dinosaurs** (20.8 on 4 losses) in the
   fine-tuning pass.
5. **Martians at 53-57% in every pairing.** Inside the coarse goal; if the
   fine-tuning pass wants 50%, the Grunt (the overlay's first lever) is the
   number to screen.

## 7. Parity and pins

The Colossus belongs to the Martian registry only, so no match without a
Martian seat changes (the parity check of section 2). The identity moves to
`pulp-wars-poc-7r25` (`7r24` appended to the prior identities, the autosave
key `pulpWars.save.v7r25.current`). Re-pinned with this cause: the identity
pins and prior-identity lists of the revision tests, the obsolete-key
lists, and the Martian roster test's Colossus Defense. No decision or match
hash pin changed.
