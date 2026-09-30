# Ruleset 7 revision 14: Plague, Bitten, Vampire, villages, and economy

**Status:** contract for revision 14 (`pulp_wars-vkq.17`), implemented in the
engine, map generation, persistence, public queries, and headless telemetry.
The Normal AI update (`pulp_wars-vkq.18`) and the UI update
(`pulp_wars-vkq.19`) followed in separate beads. `pulp_wars-vkq.16` folded
revisions 13–16 into [Ruleset 7: current rules](RULESET_7_CURRENT.md), which
now describes the running game; this overlay remains as history.

**Ruleset ID:** `pulp-wars-poc-7r14`

**Superseded in part:** [revision 15](RULESET_7_REVISION_15_BALANCE.md)
(`pulp-wars-poc-7r15`) limits Plague to three of its owner's turns, lets a unit
spread it only on the first, and lowers the Zombie to 18 HP; every other rule
here stays in force.

**Map-generation revision:** `REGIONAL_BIOMES_NAVAL_V2` (label unchanged;
the neutral village counts change, see [section 8](#8-villages))

**Scope:** this document is an overlay over the revision-13 contract. It adds
two Undead afflictions, Plague (Lich) and Bitten (Zombie); makes Human
Captains cure them; stops retaliation against Vampire attacks; raises the
Lich to Attack 3; adds one neutral village to most setups; and tightens late
income. Every unmentioned revision-13 rule stays in force. Rulesets 5 and 6
and historical Ruleset 7 fixtures remain frozen.

Attack and Defense are shown in whole units; the code stores half-units
(`attack2`, `defense2`).

## 1. Sources and decided direction

The user asked on 2026-09-29 for more villages, a useful Vampire, an Undead
stalemate breaker, and a tighter economy, and then chose Plague plus Bitten as
the stalemate breaker. The numbers come from the measured proposals in the
[Undead balance report](../validation/RULESET_7_UNDEAD_BALANCE.md#81-measured-proposals):

| #   | Item                 | Decided rule                                                                                                                                                    |
| --- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| a   | Vampire (V1)         | A Vampire's attacks receive no retaliation ([section 6](#6-vampire-unanswered-attacks)).                                                                        |
| b   | Lich (L2, rule half) | Lich Attack 2.5 → 3, plus Plague ([sections 3](#3-plague) and [7](#7-lich-attack)). The AI's Lich training bias belongs to `pulp_wars-vkq.18`.                  |
| c   | Villages (VL)        | +1 neutral village in every setup except 11 × 11 one-AI Archipelago and, from this spec's wider sweep, 16 × 16 three-AI Archipelago ([section 8](#8-villages)). |
| d   | Economy (E2)         | Market income ignores Commerce; the level term of city income is capped at 5 ([section 9](#9-economy)).                                                         |
| e   | Bitten               | Zombie damage bites living land units; a bitten unit that dies from any combat or Plague cause rises as the biter's Zombie ([section 4](#4-bitten)).            |
| f   | Identity             | `pulp-wars-poc-7r14`, autosave `pulpWars.save.v7r14.current`, cleanup through `v7r13` ([section 2](#2-identity-and-compatibility)).                             |
| —   | Undead fragility     | Unchanged: Restless stays, Undead HP and Defense stay; revisit only if the `pulp_wars-vkq.18` before/after matrix shows Undead dominance.                       |

"Living" keeps its revision-13 meaning: a unit whose owner's faction is not
`UNDEAD`. Undead units are immune to Plague and Bitten.

## 2. Identity and compatibility

| Boundary                                   | Revision-14 value                                 |
| ------------------------------------------ | ------------------------------------------------- |
| Ruleset                                    | `pulp-wars-poc-7r14`                              |
| Game-state schema                          | `7`                                               |
| Command/event/save/replay numeric versions | `7`                                               |
| Browser autosave                           | `pulpWars.save.v7r14.current`                     |
| Map revision                               | `REGIONAL_BIOMES_NAVAL_V2`                        |
| Factions and trees                         | unchanged from revision 13 (`ORIGINAL`, `UNDEAD`) |

- The exact ruleset ID dispatches every state, setup, save, replay, and
  release artifact. A revision-14 reader rejects `pulp-wars-poc-7r13` and every
  earlier Ruleset 7 identity; there is no migration.
- Current-route startup deletes the known obsolete Ruleset 7 autosave keys,
  now through `pulpWars.save.v7r13.current`, and preserves the Ruleset 6 save,
  settings, the art-set preference, and unrelated storage.
- `GameStateV7` gains `plagued` and `bitten` ([sections 3.2](#32-status-and-state)
  and [4.2](#42-status-and-state)); they are canonical, so saves, replay
  checkpoints, and state hashes cover them. Both are always empty in a match
  without an `UNDEAD` seat.

## 3. Plague

### 3.1 Application

Plague is an innate Lich ability (`PLAGUE`, Undead `CATAPULT`).

- When a Lich **attacks** (never when it retaliates) and **survives the
  exchange**, the primary target and every splash target that survived and is
  living becomes plagued, unless it is already plagued. Units of any form
  (land, embarked, naval) qualify.
- A plagued unit records the attacking Lich as its **source**. Plague does not
  stack: an already plagued unit keeps its first source and takes no extra
  effect.
- A Lich that dies in the exchange (retaliation) applies no Plague.
- Application does not change damage, kill credit, splash, Field Defense
  destruction, or any other revision-13 combat rule.
- Canonical resolution includes hidden splash targets; the public preview
  lists only visible units ([section 3.7](#37-visibility-events-and-projection)).

### 3.2 Status and state

`GameStateV7.plagued` is a list of `{ unitId, sourceUnitId }` sorted by
`unitId`, one entry per plagued unit. State parsing rejects an entry whose unit
is missing, dead, or Undead-owned; whose source is missing, dead, not
Undead-owned, or has no `PLAGUE` ability; duplicate or unsorted entries; and
any entry in a match without an `UNDEAD` seat.

### 3.3 Start Turn damage and spread

Plague resolves at the start of the plagued unit's **owner's** turn, as a new
Start Turn step after activations, capture eligibility, and city actions are
reset and **before Windmill healing** ([section 11](#11-start-turn-order)):

1. **Damage.** Every plagued unit the active player owns takes
   `min(2, hp)` damage. All damage is computed from the pre-Plague state and
   applied together. `PLAGUE_DAMAGED { playerId, results }` lists each unit as
   `{ unitId, at, damage, dies }` sorted by `(y, x, unitId)`.
2. **Deaths.** In the same order, each death emits `UNIT_DIED` with the new
   cause `PLAGUE`, followed by either `BITTEN_UNIT_RISEN` (a bitten land-form
   victim, [section 4.3](#43-rising-on-death)) or `GRAVE_CREATED` when revision
   13 section 5.1 allows a Grave (Plague is a Grave-qualifying cause). Nobody
   gains kill credit or promotion progress.
3. **Spread.** Every surviving plagued unit of the active player, in unit-ID
   order, spreads its own source to every adjacent (Chebyshev 1) unit that is
   alive, living, and not plagued, **of any owner** (own, allied, hostile,
   hidden or visible). A unit next to several spreaders takes the source of
   the first in unit-ID order. Units plagued by this step do not spread until
   their own owner's next Start Turn. Undead units, including new risings, are
   immune. `PLAGUE_SPREAD { playerId, results }` lists each newly plagued unit
   as `{ unitId, at }` sorted by `(y, x, unitId)`; it is omitted when nothing
   spreads.
4. **Aftermath.** Risings reveal their sight for their owners
   (`TILES_REVEALED`), and when any unit died the live economy is recomputed
   (for example a lifted blockade) with the ordinary `CITY_ECONOMY_CHANGED`
   and growth events.

Plague resolves before income, so a bitten victim that rises on its owner's
own city center besieges that city for this turn's income.

### 3.4 Plague and other rules

- Plague damage is not an attack: no retaliation, Lifesteal, Infect, Field
  Defense destruction, advance, or Push, and no kill credit.
- A plagued unit acts, recovers, heals, and is healed normally; Windmill
  healing after the Plague step may restore the damage.
- An embarked or naval plagued unit takes damage and spreads Plague like a land
  unit, but its death never leaves a Grave or rising.

### 3.5 End of Plague

Plague on a unit ends exactly when:

- the unit leaves the board (any death or removal);
- its **source Lich leaves the board** for any reason (death, Disband,
  elimination removal): every unit that Lich plagued is cured at once and one
  `PLAGUE_CLEARED { unitIds }` event (surviving units, sorted by ID) is
  appended at the end of the command's events; or
- a Human Captain's Tend Wounded cures it ([section 5](#5-tend-wounded-cures)).

The engine enforces the first two by pruning stale entries from every
accepted state, so no command path can leave Plague without a living source.

### 3.6 Disband

A plagued unit cannot Disband: the command is not offered and rejects with the
new error `DISBAND_NOT_LEGAL { reason: "PLAGUED" }`.

### 3.7 Visibility, events, and projection

- **Public status.** `PlayerViewV7.plagued` lists `{ unitId, sourceUnitId }`
  for every plagued unit in the view's `units`, sorted by unit ID.
  `sourceUnitId` is the Lich only when the viewer can see that Lich; otherwise
  it is `null`, so a hidden Lich is never named.
- **Combat preview.** `CombatPreviewV7.plagued` lists the units this attack
  newly plagues (the defender first when it qualifies, then splash targets in
  splash order). The public preview computes it from visible units and the
  public statuses, so it equals the resolution for every listed unit.
- **Projection.** In a projected `COMBAT_RESOLVED`, `plagued` keeps only the
  target and the splash entries the viewer keeps. `PLAGUE_DAMAGED` keeps the
  entries of units the viewer owns or saw before the command; `PLAGUE_SPREAD`
  and `PLAGUE_CLEARED` keep the units the viewer owns or sees before or after.
  An event with no remaining entry is not projected. A viewer that cannot see
  a Lich attack but owns a splashed unit still receives only
  `COMBAT_SPLASH_DAMAGE` and learns of the new Plague from its view.

## 4. Bitten

### 4.1 Application

Bite is an innate Zombie ability (`BITE`, Undead `GUARD`).

- When a Zombie deals damage greater than 0 to a **living land-form** unit that
  **survives**, by its attack or by its retaliation, that unit becomes
  Bitten. Embarked and naval units are never bitten; splash and Wail are not
  Zombie damage.
- The bite records the biting Zombie's owner and unit ID. The **last biter
  wins**: a new bite replaces the old record.
- A unit the Zombie kills is converted by the existing Infect rule instead.

### 4.2 Status and state

`GameStateV7.bitten` is a list of `{ unitId, biterPlayerId, biterUnitId }`
sorted by `unitId`. The biting Zombie may have died since; its ID only homes a
later rising. State parsing rejects an entry whose unit is missing, dead, or
Undead-owned; whose biter player is missing, not `ACTIVE`, or not Undead;
whose `biterUnitId` is not a past entity ID; duplicate or unsorted entries;
and any entry in a match without an `UNDEAD` seat.

### 4.3 Rising on death

When a bitten unit dies in **land form** from `ATTACK`, `RETALIATION`,
`SPLASH` (Battleship or Lich), `WAIL`, or `PLAGUE`, whoever killed it:

- it is removed normally (`UNIT_DIED` with its ordinary cause; the killer, if
  any, keeps its kill credit);
- **Infect takes precedence**: a victim killed by a Zombie becomes that
  Zombie's Infect rising and the bite is ignored;
- otherwise a Zombie rising (`GUARD` role, 10 HP out of 20, exhausted, 0 kills,
  not veteran, not capture-eligible) appears on the victim's tile, **owned by
  the biter player** and homed to the biting Zombie's home city when that
  Zombie is still on the board (orphaned otherwise), under the revision-13
  rising rules (may exceed capacity, ignores entry rules, never destroys Field
  Defense, reveals its sight);
- **no Grave** is created; an existing Grave stays under the rising;
- the rising takes the next unit ID in death order (defender, splash in
  `(y, x, id)` order, attacker; or Wail and Plague result order), and emits
  `BITTEN_UNIT_RISEN { playerId, victimUnitId, unitId, at, homeCityId }`
  immediately after the victim's `UNIT_DIED`;
- on a city or village center the rising besieges it, exactly like an Infect
  rising;
- a melee attacker whose defender rises **does not advance** (the tile is
  occupied), so a Knight's Overrun also ends there.

A bitten unit that dies embarked or afloat, or leaves the board by
displacement removal or elimination removal, does not rise and follows the
ordinary rules.

### 4.4 End of Bitten

Bitten on a unit ends when the unit leaves the board, when its biter player is
eliminated, or when a Human Captain's Tend Wounded cures it. It persists
through embarking and disembarking.

### 4.5 Disband

A bitten unit cannot Disband: the command is not offered and rejects with
`DISBAND_NOT_LEGAL { reason: "BITTEN" }` (`PLAGUED` is reported first when
both apply).

### 4.6 Visibility, events, and projection

- **Public status.** `PlayerViewV7.bitten` lists `{ unitId, biterPlayerId }`
  for every bitten unit in the view's `units`, sorted by unit ID.
- **Combat preview.** `CombatPreviewV7` gains `attackerBitten` and
  `defenderBitten` (the survivor becomes Bitten by this exchange) and
  `attackerBittenRises` and `defenderBittenRises` (the death rises from an
  earlier bite; always false when Infect converts it). The public preview is
  exact because Bitten is public. The Wail preview gains `bittenRises` per
  target, and `leavesGrave` is false for such a target.
- **Projection.** `BITTEN_UNIT_RISEN` follows the `UNIT_INFECTED` rule: it is
  projected to a viewer who sees the rising before or after, the rising counts
  as visibly created, and `homeCityId` is `null` for every viewer but its
  owner.

## 5. Tend Wounded cures

Tend Wounded (Human Captain) now also cures:

- Targets are the adjacent own land-form units, other than the Captain and not
  tended this turn, that are **damaged, plagued, or bitten**. A plagued or
  bitten unit is a target even at full HP, so Tend is offered and legal with
  only such a target.
- Each target heals `min(2, maxHp − hp)` (possibly 0) and loses both Plague
  and Bitten.
- `WOUNDED_TENDED` results gain `curedPlague` and `curedBitten`; `amount` may
  be 0 only when the result cures something.
- `previewTendWoundedV7` returns the exact results (heal and cures) of an
  offered Tend.
- The Captain cannot tend itself, so a plagued Captain needs another Captain.
  The Undead Necromancer has no Tend Wounded and cures nothing (Undead are
  immune anyway).

## 6. Vampire: unanswered attacks

- The Undead `KNIGHT` (Vampire) gains `UNANSWERED`: a defender attacked by a
  Vampire never retaliates. The Vampire still retaliates when attacked, and
  Lifesteal still heals the damage it deals.
- The preview reports `retaliation: false`, `damageToAttacker: 0`, and the new
  `noRetaliationReason: "UNANSWERED"` whenever the defender survives
  (`DEFENDER_DIED` still wins when it dies). Lifesteal therefore heals from
  the Vampire's full pre-attack HP.
- Stats are unchanged (10 HP, Attack 3, Defense 1, Move 3, cost 9). The Human
  Knight is unaffected.

## 7. Lich attack

The Lich's Attack becomes **3** (`attack2` 6, was 5). Range 2–3, "cannot
attack after moving", no advance, splash, and `CATAPULT` Field Defense
destruction are unchanged. Its abilities are `ATTACK` and `PLAGUE`.

## 8. Villages

| Board width | AI count | Villages (revision 13) |               Villages (revision 14) | Settlements (revision 14) |
| ----------: | -------: | ---------------------: | -----------------------------------: | ------------------------- |
|          11 |        1 |                      3 |               4 (3 on `ARCHIPELAGO`) | 6 (5)                     |
|          14 |      1–2 |                  3 / 4 |                                4 / 5 | 6 / 8                     |
|          16 |      1–3 |              3 / 4 / 6 | 4 / 5 / 7 (3 AI on `ARCHIPELAGO`: 6) | 6 / 8 / 11 (10)           |
|          20 |      1–3 |           13 / 12 / 11 |                         14 / 13 / 12 | 16                        |
|          25 |      1–3 |           20 / 19 / 18 |                         21 / 20 / 19 | 23                        |

- The 11 × 11 one-AI Archipelago keeps 3 villages because 4 fail map
  acceptance on 20% of its seeds ([balance report §7.1](../validation/RULESET_7_UNDEAD_BALANCE.md#71-village-density)).
- The 16 × 16 three-AI Archipelago keeps 6 villages: the balance report's
  100-seed sweep accepted 7, but the 1,000-seed sweep in
  [section 15.1](#151-map-acceptance) fails 7 of 1,000 seeds (0.7%) with 7
  villages and none with 6.
- Nothing else in generation changes: the settlement lattice (Chebyshev 3),
  capital placement and fairness, ring floors, treasure placement, and the
  256-candidate budget are as in revision 13. Every generated map changes
  anyway, because the extra village joins the ring floors and later PRNG draws.
- The map-generation revision label stays `REGIONAL_BIOMES_NAVAL_V2`; the
  ruleset identity dispatches generation.
- Measured acceptance is in [section 15.1](#151-map-acceptance).

## 9. Economy

```text
income(city) = if besieged: 0
               else max(1, min(level, 5) + capital + seaTrade + landTrade
                           + market + min(0, population))
market income = min(4, 1 + distinct adjacent families)       (per Market)
```

- The **level term** of city income is `min(level, 5)`. Levels 6 and higher
  still grant rewards, capacity, and Juggernauts; only their income stops
  growing.
- **Commerce no longer doubles Markets**: a Market pays 1–4 Coins with or
  without Commerce. Commerce keeps its land-trade Coin. The technology no
  longer lists a `MARKET_INCOME_MULTIPLIER` unlock, and
  `technologyCapabilitiesV7(...).marketIncomeMultiplier` is always 1.
- Every income surface uses the same terms: Start Turn income,
  `INCOME_PREVIEWED`, `ECONOMIC_BUILDING_BUILT.marketIncome`,
  `CITY_ECONOMY_CHANGED` Market values, the public improvement values, and
  the public economic previews.
- Unit, technology, and building costs are unchanged.

## 10. Combat resolution order

Revision 14 extends revision 13 section 6.8. The attack still resolves from
one immutable preview and is atomic.

1. Legality (unchanged).
2. Preview: damage both ways; retaliation (none against an `UNANSWERED`
   attacker); deaths; splash; Lifesteal; Infect; Bitten risings and new bites;
   Plague; advance (never onto a tile where the defender rises); Push.
3. HP: defender, retaliation, splash; then Lifesteal.
4. Kill credit (unchanged: rising victims still count).
5. Remove dead units.
6. Field Defense destruction (unchanged).
7. For each death in order (defender, splash in `(y, x, id)` order,
   attacker): an Infect rising if a Zombie killed a land-form victim;
   otherwise a Bitten rising if the land-form victim was bitten; otherwise a
   Grave when revision 13 section 5.1 allows.
8. Record new bites on surviving attacker or defender, and Plague on the
   surviving targets.
9. Advance, Push, Overrun, reveals (advance, Push, then risings in creation
   order), economy, reward settlement, achievements.

Event order: `COMBAT_RESOLVED`; `FIELD_DEFENSE_DESTROYED`; the defender's
`UNIT_DIED` with `UNIT_INFECTED`, `BITTEN_UNIT_RISEN`, or `GRAVE_CREATED`;
each splash death likewise; the attacker's death likewise; `UNIT_MOVED`;
`UNIT_PUSHED`; `TILES_REVEALED`; the ordinary tail; then, after any naval
transition events, `PLAGUE_CLEARED` when the Lich died.

Wail follows the same death rule: a bitten land-form Wail victim rises
(`BITTEN_UNIT_RISEN` after its `UNIT_DIED`), then risings reveal their sight.

## 11. Start Turn order

1. Set the active seat; reset its units' activations and capture eligibility;
   make its cities' city actions available.
2. **Plague** ([section 3.3](#33-start-turn-damage-and-spread)).
3. Windmill healing.
4. Income (revision 14 formula).
5. Settle pending city rewards.
6. Evaluate achievements.

Events: `TURN_STARTED`, `PLAGUE_DAMAGED`, deaths and risings, `PLAGUE_SPREAD`,
rising reveals, economy changes, `WINDMILL_HEALING_RESOLVED`,
`INCOME_AWARDED`, then the reward and achievement events. The match's first
Start Turn never has Plague.

## 12. Commands, events, errors, previews, and queries

- **Abilities.** `UnitRoleAbilityV7` gains `PLAGUE` (Lich), `BITE` (Zombie),
  and `UNANSWERED` (Vampire). Human roles are unchanged.
- **Commands.** No new command. `DISBAND` is neither offered nor legal for a
  plagued or bitten unit. `TEND_WOUNDED` is offered when an eligible damaged,
  plagued, or bitten target exists.
- **Domain events.** `DOMAIN_EVENT_KIND_ORDER_V7` inserts `PLAGUE_DAMAGED` and
  `PLAGUE_SPREAD` immediately after `TURN_STARTED`, and `BITTEN_UNIT_RISEN`
  and `PLAGUE_CLEARED` immediately after `GRAVE_CREATED` (so revision 13's
  `UNIT_DIED`, `UNIT_INFECTED`, `GRAVE_CREATED` sequence is unchanged). `UNIT_DIED.cause` gains `PLAGUE`. `WOUNDED_TENDED` results
  gain `curedPlague` and `curedBitten`.
- **Combat preview.** `CombatPreviewV7` gains `plagued`, `attackerBitten`,
  `defenderBitten`, `attackerBittenRises`, and `defenderBittenRises`;
  `noRetaliationReason` gains `UNANSWERED`.
- **Errors.** `RuleErrorCodeV7` gains `DISBAND_NOT_LEGAL` with reasons
  `PLAGUED` and `BITTEN`.
- **Views.** `PlayerViewV7` gains `plagued` and `bitten`
  ([sections 3.7](#37-visibility-events-and-projection) and
  [4.6](#46-visibility-events-and-projection)).
- **Previews.** New `previewTendWoundedV7`; `previewWailV7` targets gain
  `bittenRises`; `queryCombatPreviewV7` and `estimateCombatV7` include every
  revision-14 field.

## 13. Headless telemetry

`HeadlessMetricsV7.undead` gains `plagueApplications`, `plagueSpreads`,
`plagueDamageEntries`, `plagueDamage`, `plagueDeaths`, `plagueCleared`,
`plagueCures`, `bittenCures`, `bites`, `bittenRisings`, `plaguedMaximum`,
`bittenMaximum`, `plaguedRemaining`, `bittenRemaining`, and
`unansweredAttacks`. The Market histogram uses the revision-14 Market value.
The balance matrix (`npm run balance:ruleset7-undead`) reports the new
counters per faction pairing.

## 14. Unchanged Human behaviour

An all-Human match differs from revision 13 only by identity, the village
table, and the two income terms. Plague, Bitten, and `UNANSWERED` need Undead
units, so in an all-Human match `plagued` and `bitten` stay empty, the new
preview fields hold their neutral values (`plagued: []`, bites and risings
false), `WOUNDED_TENDED` results carry `curedPlague: false` and
`curedBitten: false`, and no new event is ever emitted. On a revision-13 map
with income terms that never reach the new caps, an all-Human match replays
revision 13 exactly ([section 15.3](#153-human-parity)).

## 15. Validation evidence

### 15.1 Map acceptance

Revision-14 counts, 100 seeds (0–99) per cell with `createInitialMapStateV7`,
every map type and every legal size/AI-count cell (6,000 maps). Each entry is
accepted maps / mean candidate attempt / worst attempt (of the 256 budget):

| Width / AI | Dry Land      | Pangea       | Continents     | Archipelago      | Lakes        |
| ---------- | ------------- | ------------ | -------------- | ---------------- | ------------ |
| 11 / 1     | 100 / 2.4/12  | 100 / 1.1/3  | 100 / 2.5/8    | 100 / 9.5/50 (3) | 100 / 1.1/2  |
| 14 / 1     | 100 / 2.8/15  | 100 / 2.0/9  | 100 / 2.5/8    | 100 / 2.3/8      | 100 / 2.1/6  |
| 14 / 2     | 100 / 4.3/18  | 100 / 2.2/8  | 100 / 13.2/110 | 100 / 8.4/45     | 100 / 2.6/13 |
| 16 / 1     | 100 / 2.0/10  | 100 / 2.7/9  | 100 / 3.3/10   | 100 / 2.6/9      | 100 / 1.5/5  |
| 16 / 2     | 100 / 3.6/12  | 100 / 2.6/9  | 100 / 4.1/30   | 100 / 3.0/18     | 100 / 1.6/5  |
| 16 / 3     | 100 / 7.2/36  | 100 / 3.0/17 | 100 / 4.1/20   | see below (6)    | 100 / 1.9/8  |
| 20 / 1     | 100 / 2.1/9   | 100 / 4.3/19 | 100 / 4.0/17   | 100 / 5.7/34     | 100 / 1.6/7  |
| 20 / 2     | 100 / 5.3/19  | 100 / 4.0/21 | 100 / 4.1/19   | 100 / 19.5/160   | 100 / 1.6/7  |
| 20 / 3     | 100 / 11.1/50 | 100 / 4.1/14 | 100 / 3.6/18   | 100 / 25.8/112   | 100 / 1.8/6  |
| 25 / 1     | 100 / 1.8/5   | 100 / 2.8/14 | 100 / 7.5/25   | 100 / 18.6/76    | 100 / 1.2/5  |
| 25 / 2     | 100 / 3.4/20  | 100 / 3.2/21 | 100 / 6.2/25   | 100 / 30.0/95    | 100 / 1.2/4  |
| 25 / 3     | 100 / 6.4/33  | 100 / 2.8/10 | 100 / 6.7/25   | 100 / 32.7/140   | 100 / 1.3/4  |

Generation stays fast (at most about 0.1 s per map). The tightest cells were
then swept over seeds 0–999, revision-14 count against revision-13 count:

| Cell                       | +1 village (accepted, worst attempt) | Revision-13 count |
| -------------------------- | ------------------------------------ | ----------------- |
| 16 × 16, 3 AI, Archipelago | 993 / 1,000, 252 (7 failures)        | 1,000, 158        |
| 14 × 14, 2 AI, Continents  | 1,000, 110                           | 1,000, 85         |
| 20 × 20, 2 AI, Archipelago | 1,000, 160                           | 1,000, 55         |
| 20 × 20, 3 AI, Archipelago | 1,000, 222                           | 1,000, 56         |
| 25 × 25, 3 AI, Archipelago | 1,000, 148                           | 1,000, 148        |

The seven 16 × 16 three-AI Archipelago failures (seeds 218, 356, 520, 583,
644, 674, 909) are why that cell keeps 6 villages
([section 8](#8-villages)); with 6 it accepts every seed. The 20 × 20
three-AI Archipelago is accepted everywhere but needs up to 222 of the 256
candidates, so its tail is worth watching.

### 15.2 Refreshed artifacts

Every map-dependent artifact was refreshed deliberately:

- **Identity.** `pulp-wars-poc-7r14` and `pulpWars.save.v7r14.current`
  replace the revision-13 literals in the engine, headless CLI and metrics,
  the setup literal of the DOM app, the browser smoke scripts (which also seed
  and check the new obsolete `v7r13` key), the late-public-view contract,
  the balance matrix, the biome validator, and the tests that pin identity.
- **Revision-13 boards kept for rule fixtures.** Rule tests that place units
  on a known board now build it with `tests/fixtures/v7-revision13-map.ts`
  (the shared `initialV7`, the tactical-UI and Undead-UI fixtures, and the
  arena builders of the Undead test files), so their layouts and expectations
  are unchanged.
- **Natural-play seeds re-chosen on revision-14 maps** (the event each test
  needs no longer occurs on the old seed): Raider escape 3 → 13; Infect and
  Lifesteal round-trip 2 → 3; Lich-splash round-trip and headless telemetry
  3 → 11; Grave round-trip 2 → 4; scripted Raise Dead/Devour 2 → 1; browser
  controller 3-AI policy run 0 → 3 (AI order now players 2, 4, 3) and
  first-mover tests 42 → 43; debug export 42 → 43; Canvas reward focus 7 → 1;
  DOM movement notice 1541 → 1543.
- **Re-pinned hashes.** Biome map (seed 0, 16 × 16 three-AI): new map hash,
  board hash, 7 villages, and acceptance on attempt 8 instead of 14; the test
  also asserts that the revision-13 count reproduces the old hash and attempt.
  Normal-policy redevelopment decision and the fresh-naval planning result:
  E2 only (both return their revision-13 values with E2 reverted). Captured
  late-view hash in the query-indexing test: the neutral `graves`, `plagued`,
  and `bitten` fields added to that revision-11 capture (its commands and
  planning result are unchanged).
- **Behaviour expectations.** Vampire Lifesteal tests (no retaliation), Lich
  `attack2` and splash damage, roster abilities, Commerce/Market values in
  the economy tests, the event-kind registry length and order, the Wail
  preview's `bittenRises`, and the neutral Tend and preview fields.
- **Release contract.** `validate:ruleset7-release` checks the revision-14
  identity and runs `tests/unit/ruleset-v7-revision14.test.ts`; its archived
  revision-2 corpus is unchanged. `validate:ruleset6-release` is untouched.
  The revision-13 balance evidence (`RULESET_7_UNDEAD_BALANCE.*`) stays as
  recorded; `pulp_wars-vkq.18` produces the before/after matrix.

### 15.3 Human parity

`createInitialMapStateWithVillageCountV7` (parity and fixture support only; no
rule path calls it) runs the revision-14 generator with an explicit village
count. With the revision-13 counts it reproduces the revision-13 playable
first turn (state and events) byte for byte, apart from identity and the
neutral `plagued`/`bitten` fields; this was checked against first turns
captured from the revision-13 code for five setups (11 × 11 Continents seed 7,
14 × 14 Cooperative Archipelago seed 1234, 14 × 14 Pangea seed 3, 16 × 16
three-AI Lakes seed 11, 11 × 11 Dry Land seed 5).

From those revision-13 boards, all-Human Normal-AI matches under revision 14:

| Setup (rounds)                | Revision-14 result vs revision 13                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| 11 × 11 Continents 7 (16)     | identical commands, final state, and human view                                                   |
| 14 × 14 Archipelago 1234 (19) | identical commands, final state, and human view                                                   |
| 14 × 14 Pangea 3 (71, capped) | diverges once a city passes level 5 or Markets meet Commerce (E2); identical with E2 reverted     |
| 16 × 16 Lakes 11 (36)         | diverges through E2; identical with E2 reverted (both end in the known `LAND_GRANT` policy error) |
| 11 × 11 Dry Land 5 (28)       | diverges through E2; identical with E2 reverted                                                   |

"Identical with E2 reverted" means the same accepted command sequence, final
state hash, human view hash, and event-kind counts as the revision-13 code
when only the two E2 formulas were temporarily restored in a scratch run, so
no other rule change reaches all-Human play. The first two matches are
checked in: `tests/unit/ruleset-v7-undead-faction.test.ts` still reproduces
the revision-12 digests from their revision-13 boards.

### 15.4 Sanity matrix

A small no-crash, no-stall check with the current Normal AI (not yet updated
for revision 14), not the before/after comparison (`pulp_wars-vkq.18`):

```bash
npm run balance:ruleset7-undead -- --seeds 6 --multi-seeds 2 --max-rounds 120 --multi-max-rounds 120 --jobs 8 --markdown
```

260 matches (HU, UH, UU, HH on five maps × 11/14 × seeds 0–5, plus HUHU and
UHUH on 16 × 16 seeds 0–1) ran in 660 s wall with 8 jobs: **no stalls, no
exceptions**, and two errors, both the known `LAND_GRANT` stale-view policy
error (`pulp_wars-9jp`, UHUH Pangea and Lakes seed 1). The four-seat
Archipelago games ran before 16 × 16 three-AI Archipelago was held at 6
villages.

| Measure (1v1, 120-round cap)         | Revision 13, seeds 0–5 (vkq.10 run, cut at round 120) |  Revision 14 |
| ------------------------------------ | ----------------------------------------------------: | -----------: |
| Undead win, mixed decided            |                                           47% (45/96) | 56% (57/102) |
| Round caps: mixed / UU / HH          |                                          22 / 10 / 12 |  18 / 7 / 12 |
| Mean rounds of decided HU / UH games |                                           36.2 / 40.5 |  30.7 / 34.9 |

Maps differ between the columns (VL), so this is not a paired comparison;
with about 100 decided games a change under about ten points is noise.

Plague and Bitten occur in ordinary play (mixed 1v1 games; the Undead mirror
has neither because everyone is Undead):

| Counter (mixed 1v1, 120 games)                 |                Value |
| ---------------------------------------------- | -------------------: |
| Units plagued by Lich attacks / by spread      |            213 / 638 |
| Plague damage entries / damage / deaths        | 5,489 / 10,910 / 174 |
| Plague cleared by a dead Lich / cured by Tend  |              188 / 0 |
| Most plagued units at once (one game)          |                   37 |
| Games with Plague (of 180 with an Undead seat) |                   32 |
| Bites / Bitten risings / Bitten cured          |        564 / 114 / 3 |
| Games with a Bitten rising (of 180)            |                   50 |
| Unanswered Vampire attacks (UU: 68)            |                   95 |

The Plague numbers show a slow, wide drain rather than a killer: 5,489 damage
entries for 851 infections is about six turns of Plague per infected unit,
with few deaths (recovery and Windmills offset 2 HP a turn) and long-lived
Plague because a Lich rarely dies. The AI never tends to cure it yet
(`pulp_wars-vkq.18`).

## 16. Test expectations

| Area             | Required evidence                                                                                                                                                                                                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity         | exact 7r14 identity; 7r13 state/save/replay rejection; obsolete-key cleanup through `v7r13`; release contract script updated                                                                                                                                                                    |
| Plague           | application to primary and surviving living splash targets only; no stacking; none from retaliation or a dead Lich; Start Turn damage, deaths (Grave or Bitten rising, no kill credit), spread to every owner, no chained spread; source-death clearing with `PLAGUE_CLEARED`; state validation |
| Bitten           | bite on attack and retaliation, living land survivors only, last biter wins; rising for every combat cause and Plague; Infect precedence; no Grave; no advance; homing and orphaning; exclusions for water, embarked, displacement, and elimination                                             |
| Tend and Disband | Tend cures at full HP and heals and cures together; preview equals resolution; Disband not offered and rejected for plagued and bitten units                                                                                                                                                    |
| Vampire, Lich    | no retaliation against a Vampire attack, Lifesteal from full HP, `UNANSWERED` reason, Vampire still retaliates; Lich `attack2` 6                                                                                                                                                                |
| Fog              | public preview and views name no hidden unit; projected events filter entries per viewer                                                                                                                                                                                                        |
| Persistence      | statuses round-trip through save, replay, checkpoints, and hashes                                                                                                                                                                                                                               |
| Villages         | the section-8 table per setup; acceptance sweep in section 15.1                                                                                                                                                                                                                                 |
| Economy          | Market pays 1–4 with Commerce; level term capped at 5; public previews agree with Start Turn income                                                                                                                                                                                             |
| Human parity     | revision-13 maps replay revision 13 exactly apart from identity and neutral fields                                                                                                                                                                                                              |
| Headless         | Plague and Bitten counters; no crash or stall in the sanity matrix                                                                                                                                                                                                                              |

## 17. Decisions made in this spec

These implementation-level choices fill gaps in the user's design. Each is the
simplest rule consistent with the existing engine; the user may change any of
them.

1. **Status storage.** Plague and Bitten are top-level sorted lists
   (`plagued`, `bitten`), following the revision-13 `graves` precedent, rather
   than unit fields; entries of departed units, sources, and biters are pruned
   from every accepted state.
2. **Start Turn position.** Plague resolves after the activation and city
   action reset and before Windmill healing and income, so Windmills can
   restore Plague damage and a rising besieger affects that turn's income.
3. **Damage before spread, spread from survivors only.** Damage is
   simultaneous; a unit that dies does not spread; newly plagued units wait
   for their owner's next turn (no chain reaction within one Start Turn).
4. **Spread attribution.** A unit next to several spreaders takes the source
   of the lowest-ID spreader.
5. **Every form.** Plague affects land, embarked, and naval units; Bitten only
   land-form units (as Infect). Deaths afloat or embarked never rise or leave a
   Grave.
6. **A dying Lich applies no Plague.** This avoids applying and clearing in
   the same command.
7. **Bite needs damage.** A Zombie exchange that deals 0 damage bites nothing.
8. **Infect precedence.** A Zombie kill converts by Infect even if another
   player's Zombie bit the victim earlier.
9. **Rising homing.** The Bitten rising is homed to the biting Zombie's home
   city when that Zombie is still on the board, otherwise orphaned (the
   revision-13 rule for an orphaned creator).
10. **Biter elimination.** Bitten ends when its biter player is eliminated, so
    no rising is ever created for an eliminated player.
11. **Tend at full HP.** Tend Wounded targets and cures plagued or bitten
    units even at full HP (heal amount 0), once per unit per turn; the
    Captain cannot tend itself.
12. **Public source.** The view names a plague's source Lich only when the
    viewer can see it; biter players are public.
13. **Event shapes.** New events `PLAGUE_DAMAGED`, `PLAGUE_SPREAD`,
    `PLAGUE_CLEARED`, `BITTEN_UNIT_RISEN`; `PLAGUE_CLEARED` is appended at
    the end of the command's events (after naval transitions), because it is
    derived from the before and after states.
14. **`UNANSWERED` reason.** Reported whenever a Vampire's defender survives,
    even if the defender could not have retaliated anyway.
15. **Map revision label.** `REGIONAL_BIOMES_NAVAL_V2` is kept; the ruleset
    identity already separates revision-13 and revision-14 maps.
16. **Commerce unlock.** The `MARKET_INCOME_MULTIPLIER` unlock is removed from
    Commerce rather than set to 1, so the technology tree no longer advertises
    Market doubling. The unlock kind stays in the type for historical text.
17. **A second village exception.** 16 × 16 three-AI Archipelago keeps 6
    villages because 7 fail acceptance on 0.7% of seeds 0–999 (the balance
    report's 100-seed sweep missed them). This deviates from the bead's
    literal "+1 everywhere except 11 × 11 Archipelago" and is reversible by
    deleting one branch in `villageCount`.
18. **Revision-13 boards in tests.** Rule fixtures keep their revision-13
    boards through `createInitialMapStateWithVillageCountV7` (parity and fixture
    support; no rule path calls it) instead of re-deriving every coordinate on
    new maps; natural-play and map tests use real revision-14 maps.
19. **Land Grant offers read the public owner** (`pulp_wars-9jp`). The view
    shows an explored cell's territory owner but hides its city ID while that
    city's center is unexplored. The public query had treated such a cell as
    neutral and offered Land Grants the reducer rejected (`INVALID_TILE`, zero
    claimable cells). The query now counts an explored cell only when it has
    no public owner, which is exact for explored cells. The reducer keeps the
    canonical rule, so a directly submitted grant whose only neutral cells are
    unexplored is still accepted (and reveals the claimed cells); the query
    never offers it, so the UI and Normal AI never probe hidden cells. The
    first 1,196 commands of the all-Human 16 × 16 Lakes 11 parity
    match (section 15.3) are unchanged; it now continues past the former error
    to the 70-round cap. The other four parity matches are unchanged.

## 18. Concerns and follow-ups

- **UI text** still says Commerce doubles Markets (technology effect text and
  the income tooltip in `src/render/dom/app-view-v7.ts`) and does not yet show
  Plague, Bitten, the new events, or `UNANSWERED`; this is
  `pulp_wars-vkq.19`.
- **Normal AI** values Plague, Bitten, Tend cures, and unanswered Vampire
  attacks and caps its income estimate's level term since
  `pulp_wars-vkq.18` ([Normal AI](../architecture/NORMAL_AI.md#revision-14-plague-bitten-and-vampire-play-pulp_wars-vkq18);
  measured in the [balance report](../validation/RULESET_7_UNDEAD_BALANCE.md#11-revision-14)).
- **Plague on allies.** Spread ignores ownership, so a Lich next to its own
  living allies (Cooperative mode) can plague them; this is literal to the
  design and worth watching.
- **Plague duration.** Plague lasts until its Lich dies or a Captain tends
  it, so in long games dozens of units stay plagued (37 at once in one
  sanity game); `pulp_wars-vkq.18` should watch whether that drain is fun or
  merely tedious.
- **Headless `LAND_GRANT` errors** (`pulp_wars-9jp`) are fixed by decision 19;
  the sections above record the evidence as it was before that fix.
