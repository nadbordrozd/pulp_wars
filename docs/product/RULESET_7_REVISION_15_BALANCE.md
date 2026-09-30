# Ruleset 7 revision 15: Plague duration and Undead fragility

**Status:** contract for revision 15 (`pulp_wars-vkq.20`), implemented in the
engine, persistence, public queries, Normal AI, UI text, and headless
telemetry. `pulp_wars-vkq.16` folded revisions 13–16 into
[Ruleset 7: current rules](RULESET_7_CURRENT.md), which now describes the
running game; this overlay remains as history.

**Ruleset ID:** `pulp-wars-poc-7r15`

**Map-generation revision:** `REGIONAL_BIOMES_NAVAL_V2` (unchanged; maps are
identical to revision 14)

**Scope:** an overlay over the revision-14 contract. Plague now lasts at most
three of the plagued unit's owner's turns and spreads only on the first of
them, and the Zombie has 18 HP. Every unmentioned revision-14 rule stays in
force. Rulesets 5 and 6 and historical Ruleset 7 fixtures remain frozen.

## 1. Sources and decided direction

The user wants high variance, no prolonged static grind, and Undead with
powerful tricks that are nevertheless easily overrun. The
`pulp_wars-vkq.18` measurement
([balance report §11](../validation/RULESET_7_UNDEAD_BALANCE.md#11-revision-14))
found revision-14 Plague to be a long, wide drain in stalled games and the
Undead winning 64% [60–68] of decided mixed 1v1 games. The root decision:

| #   | Item             | Decided rule                                                                                                                                                                             |
| --- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Plague duration  | Plague resolves on at most 3 of the plagued unit's owner's Start Turns (at most 6 damage), and a unit spreads it only on its first plagued Start Turn ([section 3](#3-plague-duration)). |
| Z   | Undead fragility | Zombie maximum HP 20 → 18; Infect and Bitten risings keep 10 HP ([section 4](#4-zombie-fragility)).                                                                                      |
| id  | Identity         | `pulp-wars-poc-7r15`, autosave `pulpWars.save.v7r15.current`, cleanup through `v7r14` ([section 2](#2-identity-and-compatibility)).                                                      |

P1 was measured by `pulp_wars-vkq.18` as a throwaway change (plagued
unit-turns −36%, turns per plagued unit 5.6 → 3.5, p90 most plagued at once
17 → 13, win rate and caps unchanged). The bead allowed a milder Zombie value
(19) if 18 pushed the mixed Undead win rate below about 50%. It did not: the
revision-15 matrix ([section 10](#10-validation-evidence)) measured 59%
[52–66] with 18 and 60% [53–66] with 19, so revision 15 keeps 18.

## 2. Identity and compatibility

| Boundary                                   | Revision-15 value                |
| ------------------------------------------ | -------------------------------- |
| Ruleset                                    | `pulp-wars-poc-7r15`             |
| Game-state schema                          | `7`                              |
| Command/event/save/replay numeric versions | `7`                              |
| Browser autosave                           | `pulpWars.save.v7r15.current`    |
| Map revision                               | `REGIONAL_BIOMES_NAVAL_V2`       |
| Factions and trees                         | unchanged (`ORIGINAL`, `UNDEAD`) |

- A revision-15 reader rejects `pulp-wars-poc-7r14` and every earlier Ruleset
  7 identity in setups, states, saves, and replays; there is no migration.
  Old Zombies with 20 HP therefore never reach revision-15 rules.
- Current-route startup deletes the known obsolete Ruleset 7 autosave keys,
  now through `pulpWars.save.v7r14.current`, and preserves the Ruleset 6 save,
  settings, the art-set preference, and unrelated storage.
- Each `GameStateV7.plagued` entry gains `turnsRemaining`
  ([section 3.1](#31-state)); it is canonical, so saves, replay checkpoints,
  and state hashes cover it.
- Map generation, the village table, and the economy are unchanged, so every
  generated board equals its revision-14 board.

## 3. Plague duration

### 3.1 State

A `GameStateV7.plagued` entry is `{ unitId, sourceUnitId, turnsRemaining }`.
`turnsRemaining` is the number of the unit's owner's Start Turn Plague steps
still to resolve: **3** when Plague is applied (by a Lich attack or by
spread), counting down by one after each step's damage; the entry is removed
when it would reach 0. State parsing additionally rejects an entry whose
`turnsRemaining` is not an integer from 1 to 3 (or is missing); every
revision-14 check stays.

### 3.2 Start Turn

Revision 14 section 3.3 becomes, for the player whose turn starts (same
position: after the activation and city-action reset, before Windmill
healing):

1. **Damage.** Every plagued unit the player owns takes `min(2, hp)` damage,
   computed from the pre-Plague state and applied together
   (`PLAGUE_DAMAGED`, unchanged).
2. **Deaths.** Unchanged (`UNIT_DIED` cause `PLAGUE`, then a Bitten rising or
   a Grave; no kill credit).
3. **Spread.** Only surviving plagued units of the player **whose entry had
   `turnsRemaining` 3 before this step** (their first plagued Start Turn)
   spread, in unit-ID order, to every adjacent unit that is alive, living,
   and not plagued, of any owner (`PLAGUE_SPREAD`, unchanged shape). Newly
   plagued units start at 3 and do not spread in this step. A unit whose
   Plague expires in this step still counts as plagued during spread, so it
   is not re-plagued in the same step.
4. **Countdown and expiry.** Every surviving entry damaged in this step loses
   one remaining turn. An entry at 1 before the step expires instead: it is
   removed and listed in the new event
   `PLAGUE_EXPIRED { playerId, unitIds }` (sorted unit IDs of the surviving
   expired units; omitted when none). A unit that dies in this step is
   removed as a death and is never listed.
5. **Aftermath.** Unchanged (rising reveals, then economy events).

So a Plague applied during an opponent's turn damages its victim on the
victim owner's next three Start Turns (6 damage in all unless cured, cleared,
or healed in between), spreads once at the first of them, and is gone after
the third. Healing between steps (Windmills, recovery, Tend without cure) is
unaffected.

Start Turn events: `TURN_STARTED`, `PLAGUE_DAMAGED`, deaths and risings,
`PLAGUE_SPREAD`, `PLAGUE_EXPIRED`, rising reveals, economy changes,
`WINDMILL_HEALING_RESOLVED`, `INCOME_AWARDED`, then the reward and
achievement events.

### 3.3 Re-application and other endings

- **No stacking, no reset.** A Lich attack on a unit that is already plagued
  applies nothing (as in revision 14): the unit keeps its first source **and
  its remaining turns**, and the combat preview does not list it.
- **Plague again after it ends.** A unit whose Plague expired, was cured by
  Tend, or was cleared by its source Lich's death is an ordinary healthy unit
  and can be plagued again (by a Lich attack or by spread), with a fresh 3
  turns.
- **Other endings are unchanged:** the unit's death, the source Lich leaving
  the board (`PLAGUE_CLEARED`), and a Human Captain's Tend Wounded cure,
  whatever the remaining turns.
- **Disband** stays forbidden while plagued, whatever the remaining turns.

### 3.4 Visibility, events, and projection

- **Public status.** `PlayerViewV7.plagued` entries gain `turnsRemaining`,
  public for every listed (visible) unit. The source Lich stays hidden
  (`null`) unless visible.
- **Combat preview.** Unchanged: `plagued` lists only the units the attack
  newly plagues; each starts at 3.
- **`PLAGUE_EXPIRED`** is projected like `PLAGUE_CLEARED`: it keeps the units
  the viewer owns or sees before or after the command, and is dropped when
  none remain.
- `DOMAIN_EVENT_KIND_ORDER_V7` inserts `PLAGUE_EXPIRED` immediately after
  `PLAGUE_SPREAD` (66 domain event kinds).

## 4. Zombie fragility

| Undead role    | Revision 14 | Revision 15 |
| -------------- | ----------: | ----------: |
| Zombie max HP  |          20 |          18 |
| Veteran Zombie |          25 |          23 |
| Infect rising  |       10 HP |       10 HP |
| Bitten rising  |       10 HP |       10 HP |

Attack 2, Defense 2, Move 1, cost 3, and every Zombie ability (`INFECT`,
`BITE`, never advancing) are unchanged. Risings are Zombies, so they now have
10 of 18 HP. The Human Guard (15 HP) is unaffected.

## 5. Commands, events, errors, previews, and queries

- **Commands and errors.** No change.
- **Events.** New `PLAGUE_EXPIRED { playerId, unitIds }` (section 3.2).
- **Views.** `PublicPlagueStatusV7` gains `turnsRemaining`.
- **Previews and queries.** Unchanged shapes; they read the revision-15
  Zombie rule and Plague state.
- **Exports.** `PLAGUE_DURATION_TURNS_V7 = 3` beside `PLAGUE_DAMAGE_V7`.

## 6. Normal AI

The policy reads only the public `turnsRemaining` (and still only in
matches with an Undead seat); details in
[Normal AI](../architecture/NORMAL_AI.md#revision-15-plague-duration-pulp_wars-vkq20):

- a healthy living unit avoids, and a plagued unit isolates itself from,
  only **spreading** Plague (three turns left);
- Tend Wounded values a Plague cure at 10 per remaining turn (30 for fresh
  Plague, as before) and takes cure priority only for two or more remaining
  Plague turns; the Captain's approach and the Captain training bias count
  the same way;
- the hunt for a source Lich (target value, kill priority, and a Lich's own
  retreat) counts only victims with two or more turns left;
- Plague application value is unchanged.

## 7. UI text

- **Chip.** "Plague · N turns" ("Plague · 1 turn"), N the public remaining
  turns.
- **Sentence** (chip name, title, and `?` details): "Plague from
  _source_: −2 HP at the start of each of its next N turns, then it ends;
  at the first it spreads to adjacent living units. It ends sooner if that
  Lich dies or a Captain tends it." The spread clause appears only while N is
  3; N = 1 reads "−2 HP at the start of its next turn, then it ends".
- **Lich ability:** "Living units its attacks hit are plagued for 3 turns:
  −2 HP each turn, spreading to neighbours on the first. It ends sooner if
  this Lich dies or a Captain tends them."
- **Help tips:** Human "Lich shots plague your units for 3 turns: −2 HP each
  turn, spreading to neighbours on the first. Killing the Lich or a Captain's
  Tend ends it sooner."; Undead "A Lich's shots plague living units for 3
  turns: −2 HP each turn, spreading to neighbours on the first. It ends
  sooner if the Lich dies or a Captain tends them."
- **Events.** `PLAGUE_EXPIRED` plays the cure ring on the visible units and
  is announced "Plague wore off N of your units" ("of Player N's units");
  it toasts when the units are the viewer's.

## 8. Headless telemetry

`HeadlessMetricsV7.undead` gains:

- `plagueExpired`: infections that ended by expiry (sum of `PLAGUE_EXPIRED`
  unit IDs);
- `plagueTurnsAtEnd`: a four-entry list; entry `n` counts infections that
  ended (death, expiry, Tend cure, or source loss) after `n` Start Turn damage
  steps. Infections still running at the match end are not counted
  (`plaguedRemaining` counts them).

The balance matrix (`npm run balance:ruleset7-undead`) sums the histogram,
reports expiries, and adds "turns per plagued unit" (Plague damage entries
per distinct plagued unit) to its Plague duration line.

## 9. Unchanged Human behaviour

Plague and Zombies need an Undead seat, so an all-Human revision-15 match
differs from revision 14 only by identity: `plagued` stays empty, no
`PLAGUE_EXPIRED` is emitted, and every AI change is gated on a match with an
Undead seat. The all-Human parity tests (revision-12 digests from revision-13
boards, and every pinned Normal-policy decision) pass unchanged apart from
the identity literals they normalize.

## 10. Validation evidence

The before/after matrix (main `2c41035` against this revision, seeds 0–11 of
every 1v1 cell plus the four-seat extra, and a Zombie-19 variant) is in the
[balance report §12](../validation/RULESET_7_UNDEAD_BALANCE.md#12-revision-15).
In short: mixed Undead win 62% [56–69] → 59% [52–66] (Zombie 19: 60%);
plagued unit-turns per mixed game 58.2 → 39.9; Plague turns per plagued unit
5.6 → 3.5; p90 rounds with Plague 107 → 88; caps and game length within
noise; all 120 Human-mirror games identical apart from identity; no errors or
stalls.

### 10.1 Refreshed artifacts

- **Identity.** `pulp-wars-poc-7r15` and `pulpWars.save.v7r15.current`
  replace the revision-14 literals in the engine, the headless CLI and
  metrics, the DOM setup literal, the browser smoke scripts (which also seed
  and check the new obsolete `v7r14` key), the late-public-view contract, the
  balance matrix, the biome validator, and the tests that pin identity.
- **Land Grant hidden-owner fixture**
  (`tests/fixtures/ruleset-v7-land-grant-hidden-owner.json`, a captured
  four-seat UHUH state): re-identified as revision 15 and its 20 Undead
  Zombies set to the revision-15 maximum (18, veterans 23; 12 of them had
  more HP than the new maximum and are clamped to it). Its `source` keeps the
  revision-14 capture provenance and records the refresh; both of its tests
  pass unchanged.
- **Behaviour expectations.** Zombie maximum HP (roster table, Infect and
  Bitten risings, veteran promotion to 23, per-owner maximum-HP validation);
  `plagued` entries and public statuses with `turnsRemaining`; the
  event-kind registry (66 kinds, `PLAGUE_EXPIRED` after `PLAGUE_SPREAD`);
  the Undead-telemetry zero fill (`plagueTurnsAtEnd` is a list); the Plague
  chip and sentences; the Normal-AI import boundary (the Undead helpers may
  import the Plague duration constant).
- **Release contract.** `validate:ruleset7-release` checks the revision-15
  identity and adds `tests/unit/ruleset-v7-revision15.test.ts`;
  `validate:ruleset6-release` is untouched.

## 11. Test expectations

| Area          | Required evidence                                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identity      | exact 7r15 identity; 7r14 setup/state/save rejection; obsolete-key cleanup through `v7r14`; release contract updated                                   |
| Duration      | damage on exactly three owner Start Turns (6 in all); spread only on the first; `PLAGUE_EXPIRED` after the third; a dying last-turn unit is not listed |
| Re-plague     | a Lich attack on a plagued unit changes neither source nor remaining turns; an expired unit can be plagued again with 3 turns                          |
| State         | `turnsRemaining` round-trips, is hashed, and is validated (1–3, integer, required)                                                                     |
| Fog           | public `turnsRemaining`; `PLAGUE_EXPIRED` projected per viewer and parsed                                                                              |
| Zombie        | 18 HP, veterans 23, risings 10 HP                                                                                                                      |
| Telemetry, AI | `plagueExpired` and `plagueTurnsAtEnd`; spreading-only avoidance; Tend value by remaining turns                                                        |
| Human parity  | all-Human parity and pinned policy tests unchanged                                                                                                     |
| UI            | chip "Plague · N turns", duration sentences, help tips, expiry notice and cure ring                                                                    |

## 12. Decisions made in this spec

1. **Counter semantics.** The entry stores `turnsRemaining` (3 → 1) rather
   than turns elapsed, so the public view can show it directly and validation
   is a simple range.
2. **Countdown after damage, expiry in the same step.** The third damage step
   removes the entry, so Plague never lingers at 0 and a Captain cannot waste
   a Tend on an already finished Plague.
3. **Spread before expiry.** Spread happens only on the first step, so the
   order only matters for a neighbour of an expiring unit: it is not
   re-plagued in the step where the Plague ends.
4. **No reset on re-application.** A second Lich hit on a plagued unit does
   nothing (revision-14 no-stacking extended to the counter), which caps any
   single infection at 6 damage. Once Plague ends, a new application starts a
   new three-turn Plague, so a Lich can still re-plague a static line; that
   costs it an attack every time.
5. **A new event** (`PLAGUE_EXPIRED`) rather than a reason field on
   `PLAGUE_CLEARED`: expiry happens inside Start Turn for one player's units,
   while clearing is derived at the end of any command; separate events keep
   both shapes and their projection simple.
6. **Only the Zombie is weakened.** Risings keep 10 HP, so Infect and Bitten
   still produce a half-strength Zombie.

## 13. Concerns and follow-ups

- The stall itself (a Lich re-plaguing a static line every turn, and the
  last-city siege of `pulp_wars-1mc`) is not addressed by P1; see the balance
  report for caps.
