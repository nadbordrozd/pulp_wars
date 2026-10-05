# Ruleset 7: Naval branch expansion and the frozen sea

**Status:** design specification (`pulp_wars-5ti.1`, epic `pulp_wars-5ti`):
drafted, critiqued, and redrafted ([Appendix A](#appendix-a-draft-critique-redraft)).
**Engine step I is implemented** (`pulp_wars-5ti.2`, identity
`pulp-wars-poc-7r43`, which is `7rA` below): the five-technology branch,
the Submarine, Ram, Board, and Harbours for all eight factions, as recorded
in [section 20](#20-engine-step-i-as-built-pulp_wars-5ti2). **Engine step II
is implemented** (`pulp_wars-5ti.3`, identity `pulp-wars-poc-7r44`, which is
`7rB` below): the Ice Folk frozen sea, as recorded in
[section 22](#22-engine-step-ii-as-built-pulp_wars-5ti3). The first part of the
interface and the art are in ([section 21](#21-naval-interface-first-part-as-built-pulp_wars-5ti7)); the Normal AI and
the frozen sea interface are not implemented. It is an overlay over
[Ruleset 7: current rules](RULESET_7_CURRENT.md) at `pulp-wars-poc-7r35`
(seven factions, map curiosities engine I), and it supersedes the deferred
floe of the [Ice Folk overlay section 17.3](RULESET_7_ICE_FOLK.md#173-deferred-the-floe).
When the root accepts it, the beads of
[section 17](#17-implementation-bead-breakdown) implement it and a final bead
folds it into the current rules.

**Ruleset IDs:** two engine steps, each taking the next free identity when it
starts. **`7rA`** stands for the identity of engine step I
([section 17](#17-implementation-bead-breakdown), the shared branch, the
Submarine, Ram, Boarding, and Harbours) and **`7rB`** for engine step II (the
Ice Folk frozen sea). Other beads may take identities first; this document
names no number.

**Map-generation revision:** unchanged. Faction choice never affects
generation, and no generated tile changes: ice is a stored layer on top of
water ([section 8.3](#83-ice-tiles)).

**Scope:** the Naval branch grows from three technologies to five, with the
shape of every other branch (one tier-1 root, two tier-2 children, one tier-3
child under each). The overlay adds two technology IDs, one mechanical role
(`SUBMARINE`), two commands (`BOARD`, `FREEZE`), one state list (`ice`), the
Ram, Boarding, Submarine, and Harbour rules for the six seafaring factions,
and, for the Ice Folk only, a complete replacement of ships: they freeze the
sea and slide across it. Every unmentioned rule stays in force for every
faction. Rulesets 5 and 6 and historical Ruleset 7 fixtures remain frozen.

**What the branch is for.** Today a water map is decided by the same Patrol
Boats and Battleships for every faction (the Battleship is the top killer
on naval maps, and the Normal AI trains 15 to 19 Patrol Boats in a long game:
[Undead balance report section 4](../validation/RULESET_7_UNDEAD_BALANCE.md#4-how-the-factions-play),
[Dinosaur balance report section 5.2](../validation/RULESET_7_DINOSAUR_BALANCE.md)).
The branch gives sea warfare a rock-paper-scissors: the **Battleship**
outguns Patrol Boats at range, the **Submarine** sinks Battleships that
cannot shoot it from afar, and **Patrol Boats that ram** hunt Submarines. It
gives the Ice Folk the identity the user asked for: no ships at all, a sea
that freezes under them, and units that slide across it.

Attack and Defense are shown in whole units; the code stores half-units
(`attack2`, `defense2`), which the tables also list.

## 1. Sources and decided direction

The user's direction of 2026-10-03 (epic `pulp_wars-5ti`): "expand the naval
tech tree branch. it should have 5 techs like all the other branches. start
with human faction. there can be another type of vessel, ramming, boarding,
bonuses to attack/defense on sea etc. ; for the other factions you can copy
the same with tweaks only when necessary. ice folks should have the ability to
freeze water and have units slide on ice instead of having ships." The Ice
Folk theme given earlier (epic `pulp_wars-7g3`): "they freeze water into
walkable ice and slow enemies."

| #   | User requirement or standing lesson                                                                                              | Where                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| U1  | Five Naval technologies, shaped like every other branch.                                                                         | [section 2](#2-the-branch-at-a-glance)                                                           |
| U2  | Humans first: a new vessel, ramming, boarding, sea bonuses.                                                                      | [sections 4](#4-seamanship-ram-and-boarding) and [5](#5-submersibles-the-submarine-and-harbours) |
| U3  | The other factions copy the Human branch, with tweaks only where necessary.                                                      | [section 7](#7-the-other-seafaring-factions)                                                     |
| U4  | The Ice Folk freeze water and slide on ice **instead of having ships**.                                                          | [section 8](#8-ice-folk-the-frozen-sea)                                                          |
| U5  | Every ability is readable on the board in one sentence and creates a real decision.                                              | [section 14.2](#142-help-text)                                                                   |
| U6  | Every new unit and ability is thought through in battle **before** implementation (the T-Rex and Triceratops lessons).           | [section 11](#11-per-unit-battle-analysis)                                                       |
| U7  | No "attack from hiding": every new unit is visible.                                                                              | the Submarine is visible; it is only hard to reach ([section 5.2](#52-submerged))                |
| U8  | No hard locks and no degenerate walls: every penalty can be played through, and ice cannot seal a sea for good.                  | [section 8.12](#812-why-ice-cannot-wall-off-a-sea)                                               |
| U9  | The Normal AI plays it with simple rules; a change to AI strategy comes with a modest head-to-head test.                         | [section 13](#13-normal-ai-requirements)                                                         |
| U10 | Balance is coarse (small samples, gross imbalance only); water maps now matter, so the check runs on Continents and Archipelago. | [section 15](#15-headless-support-measurement-tuning-bounds-and-balance-acceptance)              |

## 2. The branch at a glance

Research costs, the free opening technology, and prerequisites follow
[current rules section 6.1](RULESET_7_CURRENT.md#61-research-cost) unchanged:
tier 1 costs `5 + (C − 1)`, tier 2 `7 + 3(C − 1)`, tier 3 `12 + 5(C − 1)`.

### 2.1 Human (and every seafaring faction)

| Tier | ID                  | Name              | Requires   | Unlocks                                                                          | One sentence                                                                                            |
| ---: | ------------------- | ----------------- | ---------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
|    1 | `SHORECRAFT`        | Shorecraft        | —          | Harvest Fish; Build Port; embarkation and Shallow Water; Patrol Boat (unchanged) | Take to the shallows.                                                                                   |
|    2 | `NAVIGATION`        | Navigation        | Shorecraft | Deep Water; Gather Pearls; sea trade (unchanged)                                 | Cross the deep sea and trade across it.                                                                 |
|    3 | `NAVAL_ENGINEERING` | Naval Engineering | Navigation | Battleship; Shipyard; −2 Coin naval training at a Shipyard (unchanged)           | Build the big guns.                                                                                     |
|    2 | `SEAMANSHIP`        | Seamanship        | Shorecraft | **Ram** (Patrol Boats); **Board** (every ship)                                   | Your Patrol Boats ram, and your ships board crippled enemy ships.                                       |
|    3 | `SUBMERSIBLES`      | Submersibles      | Seamanship | **Submarine**; **Harbours** (+1 population from every active Port and Shipyard)  | A boat that can only be fought up close and sinks ships without reply; and harbours that feed the town. |

The branch now has the Settlement shape: Shorecraft is the root, Navigation
and Seamanship its two tier-2 children, Naval Engineering and Submersibles
their tier-3 children. Each line has a military and an economic reason to be
researched ([tech-tree principles section 5 and 6](PULP_WARS_TECH_TREE_DESIGN_PRINCIPLES.md#5-branches-must-compete-on-both-economy-and-warfare)):
Navigation is reach and trade, Naval Engineering the Battleship and the
Shipyard, Seamanship close combat at sea (a tier-2 military tech, like
Raiding and Marksmanship), and Submersibles the Submarine and the Harbours.

The two lines cross: Navigation's Deep Water is what lets a Submarine or a
rammer follow a Battleship offshore, and a Shipyard trains Submarines 2 Coins
cheaper. The Battleship line and the Submarine line counter each other
([section 11.5](#115-the-triangle-battleship-submarine-patrol-boat)).

### 2.2 Ice Folk

Same IDs, tiers, prerequisites, and costs; different names and unlocks
(the `TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7` precedent of Plunder, Nesting,
Deep Winter, and the others):

| Tier | ID                  | Ice Folk name | Requires  | Ice Folk unlocks                                                                             | One sentence                                                             |
| ---: | ------------------- | ------------- | --------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
|    1 | `SHORECRAFT`        | Rime          | —         | Harvest Fish; Build Port; **Freeze** Shallow Water                                           | Your units turn the shallows to ice and slide across it.                 |
|    2 | `NAVIGATION`        | Pack Ice      | Rime      | **Freeze** Deep Water; Gather Pearls; sea trade                                              | The deep sea freezes too.                                                |
|    3 | `NAVAL_ENGINEERING` | Icebound      | Pack Ice  | **Freeze locks enemy ships in the ice**, where it crushes them; Shipyard (+2 population)     | Freeze a ship in place: it cannot sail or shoot, and the ice crushes it. |
|    2 | `SEAMANSHIP`        | Black Ice     | Rime      | **Black Ice:** hostile land units on your ice are Chilled at the start of your turn          | Whoever stands on your ice is frosted.                                   |
|    3 | `SUBMERSIBLES`      | Glacier       | Black Ice | your ice lasts 5 of your turns instead of 3; your units on ice have Snow cover; **Harbours** | Your ice lasts and shelters your people; your harbours feed the town.    |

Every land unit of an Ice Folk seat slides on ice (all but the Sabretooth,
which never Glides either), and **no Ice Folk seat ever has a ship or an
embarked unit** ([section 8.11](#811-no-ships-no-embarking)).

## 3. Identity, compatibility, and shapes

### 3.1 Two engine steps

| Boundary                     | Step I (`7rA`)                                                                                               | Step II (`7rB`)                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Ruleset                      | `pulp-wars-poc-7rA`                                                                                          | `pulp-wars-poc-7rB`                                                                                                    |
| Schema, numeric versions     | `7` (unchanged)                                                                                              | `7` (unchanged)                                                                                                        |
| Browser autosave             | `pulpWars.save.v7rA.current`                                                                                 | `pulpWars.save.v7rB.current`                                                                                           |
| Map revision                 | unchanged                                                                                                    | unchanged                                                                                                              |
| `TechnologyIdV7`             | appends `SEAMANSHIP`, `SUBMERSIBLES` after `NAVAL_ENGINEERING` (the last two IDs; earlier indices unchanged) | unchanged                                                                                                              |
| Mechanical role order        | appends `SUBMARINE` after `BATTLESHIP`                                                                       | unchanged                                                                                                              |
| `COMMAND_KIND_ORDER_V7`      | `BOARD` right after `ATTACK`                                                                                 | `FREEZE` right after `COLD_SNAP`                                                                                       |
| `DOMAIN_EVENT_KIND_ORDER_V7` | `SHIP_BOARDED` right after `UNIT_MIND_CONTROLLED`                                                            | `WATER_FROZEN` right after `UNITS_CHILLED`; `ICE_MELTED` and `UNITS_CRUSHED` right after `WATER_FROZEN`, in that order |
| State and view               | no new list                                                                                                  | `GameStateV7.ice` and `PlayerViewV7.ice`, after `curiosities`                                                          |

- Each step appends the previous identity to `PRIOR_RULESET_7_IDS` (gap-free),
  rejects it in setups, states, saves, replays, and release artifacts (no
  migration), deletes the obsolete autosave key, and refreshes the release
  corpus with a reviewed diff.
- **Between the steps** the Ice Folk keep today's boats and get the Human
  Seamanship and Submersibles like everyone else. Step II replaces their whole
  Naval branch at once. That interim is a playable `7rA` and is accepted
  ([section 18](#18-decisions-made-in-this-spec), decision 15).
- Coarse balance (bead `5ti.8`) may move numbers inside
  [section 15.3](#153-tuning-bounds) and then takes a third identity, as the
  faction overlays' balance beads did.

### 3.2 Shape changes

Step I (neutral where no seat researches the new technologies):

- the two technology IDs and their nodes in all seven trees (the Ice Folk tree
  takes the Human unlocks until step II);
- the `SUBMARINE` role in every faction registration (labels "Submarine";
  tactical label `NAVAL_HUNTER`, a new literal next to `NAVAL_SCREEN` and
  `NAVAL_CAPITAL`); abilities `RAM` (Patrol Boat), `SUBMERGED` and `TORPEDO`
  (Submarine);
- unlock kinds `RAM`, `HARBOURS`; the command `BOARD` with the error
  `BOARD_NOT_LEGAL`; the error `ATTACK_NOT_LEGAL` (reason `NOT_AFLOAT`); the
  event `SHIP_BOARDED`; capabilities `ram`, `boarding`, and
  `harbourPopulation`;
- combat-preview fields `ram` and `torpedo`; the `push` field also reports a
  ram's shove;
- `previewBoardV7`; the unit stats gain `submerged` (true for a Submarine that
  is not icebound) and `boardableAt` (the HP at or below which a ship can be
  boarded, null for other forms).

Step II (neutral in a match without an Ice Folk seat):

- the `ice` state and view lists ([section 8.3](#83-ice-tiles));
- the Ice Folk overrides of the five Naval unlocks and names; unlock kinds
  `FREEZE`, `ICEBOUND`, `BLACK_ICE`, `GLACIER`; capabilities `freezeWater`
  (`NONE`, `SHALLOW`, `DEEP`), `icebound`, `blackIce`, `iceTurns` (3 or 5),
  and `iceCover`;
- the reasons `ICEBOUND` of `ATTACK_NOT_LEGAL`, `BOARD_NOT_LEGAL`, and
  `noRetaliationReason`;
- the command `FREEZE` and its error `FREEZE_NOT_LEGAL`; the events
  `WATER_FROZEN`, `ICE_MELTED`, and `UNITS_CRUSHED`; the `UNIT_DIED` cause
  `CRUSHED`; the `UNITS_CHILLED` source `BLACK_ICE`; the movement failure
  reasons `ICE_STOPS_MOVE` and `SLIDE_FORCED`;
- combat-preview fields `iceCover` and `icebound`;
- the public unit stats gain `icebound` (any afloat unit) and, in the
  `iceFolk` block, `onIce` and `slides`;
- `previewFreezeV7`.

### 3.3 Dry Land, missions, Showcase

- **Dry Land** forbids the whole Naval branch: `forbiddenTechnologiesV7`
  already reads it from the Human tree's `NAVAL` nodes, so the two new nodes
  are forbidden with no code change, and the Ice Folk get no Rime there. A
  Dry Land match of `7rA` or `7rB` plays exactly the commands of the same
  setup and seed at `7r35` (identity and hashes aside): nothing in the branch
  can happen on Dry Land.
- **Missions.** A mission's forbidden list must be closed under
  prerequisites ([campaign section 2.3](CAMPAIGN.md#23-forbidden-technologies)),
  so every mission that forbids Shorecraft (`TEST_GROUNDS`, the three
  directive fixtures' `DRY_NAVAL_V7`, and the campaign's naval-forbidden
  missions) adds `SEAMANSHIP` and `SUBMERSIBLES` in step I. A mission whose
  pinned initial-state hash changes bumps its revision, as the registry
  requires.
- **Showcase** ([current rules section 2.5](RULESET_7_CURRENT.md#25-showcase-setup)):
  every technology is researched. A seafaring seat gets one Submarine on a
  free water tile of its Coast city (step I picks the tile beside the
  Battleship and pins it in the Showcase table and test). An Ice Folk seat
  (step II) gets no Patrol Boat, Battleship, or Submarine; the water tiles
  where its boats stood are its ice instead (in its territory, so permanent),
  so a slide, a Freeze, and an Icebound are reachable on the first turns.
  Capacity drops by its three ships.

## 4. Seamanship: Ram and Boarding

### 4.1 Ram

**One sentence:** a Patrol Boat that moved this turn rams a boat or a
transport: +1 Attack, and the target is shoved one tile back.

- **Who.** A unit in `NAVAL` form whose role has the `RAM` ability (the Patrol
  Boat of every seafaring faction), whose kind's capabilities under its owner
  have `ram` (Seamanship).
- **When.** An `ATTACK` at Chebyshev distance 1 on a target **afloat**
  (`NAVAL` or `EMBARKED` form) that is not icebound, on a turn on which the
  boat has moved (activation `moved`; an interrupted Move counts).
- **Bonus.** +1 Attack (`RAM_BONUS2_V7` 2), in `attack2` like Charge; never on
  retaliation. The preview and `COMBAT_RESOLVED` carry `ram: true`.
- **Shove.** A target that survives is shoved one tile directly away from the
  boat: its tile plus `(sign(dx), sign(dy))`, where `(dx, dy)` is its offset
  from the boat. The shove happens only when that tile is on the board,
  explored by the attacker, water that is **not ice and not a dock** (Port or
  Shipyard), holds no unit, and is Shallow Water, or Deep Water only if the
  target stands on Deep Water (the Tractor Beam's public rule, so the preview
  is exact: the target owner's Navigation is private). Otherwise nothing
  moves (`push: "BLOCKED"`). It is the Push step of the attack resolution
  (the same place as a Juggernaut's Push, the same `UNIT_PUSHED` event, the
  preview field `push`).
- The shoved unit keeps its HP, statuses, and activation. A blockader shoved
  off a dock lifts the blockade (`ATTACK` is already on the blockade-event
  list). A shove never moves a second unit and never chains: one attack, one
  shove. A ship never Pushes otherwise (the naval "cannot push" rule still
  holds for every other attack).

### 4.2 Board

**One sentence:** a ship next to a badly damaged enemy ship (a third of its
HP or less) captures it; the prize is patched up just above that line.

`BOARD { kind, unitId, targetUnitId }` is a primary action. It is not an
Attack and costs no Coins. Legality, in this order (all rejections atomic):

| #   | Requirement                                                                                                                                             | Rejection                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 1   | `unitId` is the actor's own unit on the board.                                                                                                          | the ordinary unit errors                       |
| 2   | It is in `NAVAL` form (any ship role).                                                                                                                  | `BOARD_NOT_LEGAL { reason: "NOT_A_SHIP" }`     |
| 3   | Its kind's capabilities under its owner have `boarding` (Seamanship).                                                                                   | `TECH_REQUIRED { tech: "SEAMANSHIP" }`         |
| 4   | It has not used a primary action, and `unitMayActAfterMoveV7` allows it if it moved (so a Battleship that moved cannot board).                          | `UNIT_ALREADY_ACTED`                           |
| 4a  | It is not icebound (step II).                                                                                                                           | `BOARD_NOT_LEGAL { reason: "ICEBOUND" }`       |
| 5   | `targetUnitId` is a unit on the board the actor can see.                                                                                                | `TARGET_NOT_FOUND`                             |
| 6   | It is hostile to the actor.                                                                                                                             | `TARGET_ALLIED`                                |
| 7   | It is in `NAVAL` form (a transport, a self-launched machine, or a land unit is never boarded).                                                          | `BOARD_NOT_LEGAL { reason: "TARGET_IMMUNE" }`  |
| 8   | It is within Chebyshev distance 1.                                                                                                                      | `BOARD_NOT_LEGAL { reason: "OUT_OF_RANGE" }`   |
| 9   | Its HP is at most `floor(maxHp / 3)` (`BOARDING_HP_DIVISOR_V7` 3): Patrol Boat 3, Submarine 4, Battleship 8 (promoted: 5, 5, 10).                       | `BOARD_NOT_LEGAL { reason: "TARGET_HEALTHY" }` |
| 10  | The boarder's owner could sail the prize where it stands: a target on Deep Water needs the actor's Navigation (the prize's kind follows its new owner). | `BOARD_NOT_LEGAL { reason: "DEEP_WATER" }`     |

- **Result.** The target's `ownerId` becomes the actor's owner, `homeCityId`
  null (an orphan: it uses no slot anywhere and is never re-homed),
  `captureEligible` false, and it gets the exhausted activation. Its **kind
  follows its new owner** (no side list): it is now that faction's ship of
  the same role, with that faction's label and art, the "refit under a new
  flag". Its HP becomes `floor(maxHp / 3) + 1` (the **prize crew patches it
  up**: Patrol Boat 4, Submarine 5, Battleship 9), so it cannot be boarded
  back without a new hit. It keeps its ID, role, maximum HP, kills,
  `veteran`, tile, and every status entry. The actor has used its primary
  action and is handled.
- **Not a kill:** no kill credit, Slayer, Plunder, Grave, or growth. Sea Dog
  and Muster count the prize for its new owner.
- **Events:** `SHIP_BOARDED { playerId, unitId, targetUnitId, fromPlayerId, at, hp }`,
  `TILES_REVEALED` (the prize's sight for its new owner), the tail, and the
  naval blockade and sea-network events (`BOARD` joins the recompute list: a
  prize standing on its former owner's dock now blockades it).
- **Preview.** `previewBoardV7(view, unitId, targetUnitId)` returns null
  unless the command is offered, otherwise
  `{ unitId, targetUnitId, fromPlayerId, hpAfter }`. It is exact.
- An icebound target may be boarded; the prize stays icebound.

### 4.3 Worked examples

Engine formula, open water, full HP unless stated
([section 11.1](#111-method)):

| Exchange                                                   | Result                                                                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Patrol Boat attacks a Patrol Boat                          | 5 dealt, 5 taken                                                                                                         |
| Patrol Boat **rams** a Patrol Boat                         | 8 dealt (2 left: boardable), 4 taken, target shoved                                                                      |
| a second ship boards that Patrol Boat                      | it is yours at 4 HP; a plain hit would have killed it (6 on 2 HP) for a kill instead                                     |
| Patrol Boat rams a transport (any land unit embarked)      | 10 dealt (6 without the ram), 0 taken (an embarked unit never retaliates); the transport is shoved off the landing coast |
| Patrol Boat rams a Battleship                              | 6 dealt, 10 taken: the boat dies (a ram does not beat a Battleship)                                                      |
| Patrol Boat rams a blockader on its own dock               | the blockader is shoved to open water and the dock is active again                                                       |
| two Submarines torpedo a Battleship, then a boat boards it | 9 and 11 dealt (5 left), then the Battleship is yours at 9 HP                                                            |

## 5. Submersibles: the Submarine and Harbours

### 5.1 The Submarine

| Unit      | Role        | Tech         | Cost | Slots |  HP | Attack | Defense | Move | Range | Sight | Attack after Move | Capture | Abilities                 |
| --------- | ----------- | ------------ | ---: | ----: | --: | -----: | ------: | ---: | ----: | ----: | ----------------- | ------- | ------------------------- |
| Submarine | `SUBMARINE` | Submersibles |    9 |     1 |  12 |  4 (8) |   2 (4) |    2 |     1 |     2 | yes               | no      | naval; Submerged; Torpedo |

- Trained with `TRAIN_NAVAL` at an active, empty dock (Shipyard: 7 Coins;
  Arms Industry does not apply, as for every boat). It moves like a Patrol
  Boat (Shallow Water, Deep Water with Navigation, Move 2, the step that
  leaves a water tile costs a full point), projects naval ZOC, blockades a
  dock, recovers 4 on or next to an own active dock, cannot capture, embark,
  pillage, disband, or advance, and receives no cover or fortification.
  Ordinary Promotion (17 HP).
- **Public abilities:** `ATTACK`, `SUBMERGED`, `TORPEDO`.

### 5.2 Submerged

**One sentence:** a Submarine can only be attacked from an adjacent tile.

- An `ATTACK` whose target is a Submarine that is not icebound is legal only
  from Chebyshev distance 1. From farther it is rejected with the existing
  `TARGET_OUT_OF_RANGE` and never offered; the threatened-tiles
  query and every reach estimate count only the adjacent tiles of a
  Submarine.
- Nothing else is restricted: splash (Battleship, Lich, Bomb Chucker),
  Pierce, Sweep, explosions, a Dwarf bomb (not an `ATTACK`), Wail, Plague,
  ice crush, a Tractor Beam pull, and a ram's shove reach it as any boat.
  It is always visible on an explored tile like any unit (no hiding).
- An **icebound** Submarine is not submerged: it is frozen at the surface
  ([section 8.9](#89-icebound-and-the-crush)).

### 5.3 Torpedo

**One sentence:** a Submarine attacks only boats and transports, and they
never strike back.

- A Submarine's `ATTACK` targets only units afloat (`NAVAL` or `EMBARKED`
  form, an icebound ship included). A land-form target (on land or on ice) is
  rejected with the new `ATTACK_NOT_LEGAL { reason: "NOT_AFLOAT" }` and never
  offered.
- Its attack draws no retaliation: `noRetaliationReason: "UNANSWERED"` (the
  Vampire's), with the preview and `COMBAT_RESOLVED` field `torpedo: true`.
  It retaliates normally when attacked (at distance 1).

### 5.4 Harbours

**One sentence:** every active Port gives 2 population and every active
Shipyard 3.

The capability `harbourPopulation` (`HARBOUR_POPULATION_V7` 1) adds 1 live
population to every active Port and Shipyard of the owner (a blockaded dock
still gives 0). It is read through the capability, never through a raw
`SUBMERSIBLES` test, and the Ice Folk Glacier grants it too.

### 5.5 Worked examples

| Exchange                                                | Result                                                                             |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Submarine torpedoes a Patrol Boat                       | 12: sunk, no reply                                                                 |
| Submarine torpedoes a Battleship                        | 9, no reply (Battleship 16 left)                                                   |
| a second Submarine torpedoes it                         | 11 (5 left); a third would sink it (15)                                            |
| the Battleship (5 HP) then shoots an adjacent Submarine | 10 (2 left) and takes 6 back: the Battleship sinks in its own attack               |
| a fresh Battleship shoots an adjacent Submarine         | 20: sunk. A Submarine that ends next to a Battleship without torpedoing it is lost |
| a Battleship two or three tiles from a Submarine        | cannot target it at all                                                            |
| Patrol Boat rams a Submarine                            | 8 (4 left: boardable), 4 taken                                                     |
| Submarine torpedoes a transport                         | 14: every embarked land unit with 14 HP or less is sunk                            |
| a Fighter on the shore attacks an adjacent Submarine    | 5 and 5; a Knight 8 and 4; a T-Rex 12 and 3                                        |
| a Dwarf Gyrocopter bombs a Submarine                    | 5 (6 with Dive), never answered                                                    |

## 6. The three existing technologies

Shorecraft, Navigation, and Naval Engineering keep every unlock, number, and
rule for the six seafaring factions. What changes around them:

- Every rule that names "Patrol Boats and Battleships" or "naval units" now
  covers the Submarine too: naval movement and Deep Water, naval training and
  the Shipyard discount, naval recovery, blockade, Sea Dog, Muster, the
  "naval units cannot capture, embark, pillage, disband, push, or advance"
  rule (with the ram's shove as the one push), and the faction rulings of
  [current rules section 14](RULESET_7_CURRENT.md#14-naval-rules)
  ("Goblin boats", "Dinosaur boats", and the others: the Submarine is a boat
  like the other two).
- Navigation's Deep Water matters more: a rammer or a Submarine without it
  cannot follow a Battleship offshore.

## 7. The other seafaring factions

The Undead, Goblins, Dinosaurs, Martians, and Dwarves copy the Human branch
exactly: same unlocks, same numbers, same names ("Seamanship",
"Submersibles", "Submarine"), and the faction-styled art of
[NAVAL_FACTIONS.md](../art/NAVAL_FACTIONS.md). **No faction rule applies to a
boat**, as today. The review found no tweak necessary for any of them; the
interactions below are consequences of existing rules, stated so the engine
and the AI get them right.

| Faction  | Submarine art concept (map sprite and portrait)                                                                                                                  | Interactions that matter                                                                                                                                                                                                                                                                                                            |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Human    | a riveted cigar hull, low in the water, a conning tower with a crimson and gold pennant                                                                          | —                                                                                                                                                                                                                                                                                                                                   |
| Undead   | a drowned galley riding half under: barnacled black hull, skull prow, violet lanterns below the line                                                             | Ships leave no Grave and never rise (deaths afloat); Restless never applies to boats; a boarded Undead ship becomes the captor's ship (it is not "raised"). Wail reaches a Submarine within 2 (not an attack).                                                                                                                      |
| Goblin   | a scrap diving barrel: patched planks and gunmetal, an olive goblin in the open hatch                                                                            | Goblin boats have no Kaboom, Gang Up, or death blast; a Goblin Kaboom or death blast hits adjacent ships and Submarines (not an attack). Plunder pays for ships sunk, never for a boarding (not a kill). A Bomb Chucker (range exactly 2) cannot target a Submarine; its splash can reach one.                                      |
| Dinosaur | a carved log submersible shaped like a plesiosaur, blue with orange stripes, spotted hide over the hatch (no swimming animal, as decided for the Dinosaur ships) | Boats never grow and use one slot. A Triceratops's Charge! from the shore may push a ship over free water (never onto ice, never an icebound one); a T-Rex on the shore hits an adjacent Submarine for 12. Eggs never touch water or ice.                                                                                           |
| Martian  | a chrome bathysphere with a glass dome and magenta lights, half submerged                                                                                        | Ships have no Shield; Mind Control never takes a ship (land form only); the Tractor Beam may pull any one-slot ship two tiles away, a Submarine included, but never an icebound one. A self-launched machine is `EMBARKED`: it can be rammed and torpedoed, never boarded. A Ray Gunner or Tripod cannot target a Submarine from 2. |
| Dwarf    | a brass steam submersible: rivets, a short funnel, a porthole glow                                                                                               | A Steam Cannon (range 2–3) cannot target a Submarine; Knockback follows an attack, so it never shoves one. A Gyrocopter's bomb is the Dwarves' answer: not an attack, so it reaches a Submarine within 2 for 5 (6). Eruptions skip naval units; tunnels never pass under water or ice.                                              |

Ice Folk: [section 8](#8-ice-folk-the-frozen-sea).

## 8. Ice Folk: the frozen sea

### 8.1 The idea in one paragraph

An Ice Folk seat never builds a ship. With **Rime** its units freeze the
water next to them, two tiles out in a line (the Ice Witch: every tile
around her), and they **slide**: an Ice Folk unit that steps onto ice keeps
going straight until something stops it. Ice in the seat's own territory
stays; ice elsewhere melts after three of its owner's turns unless refrozen,
but never under a land unit. Other factions may walk on the ice, slowly (a
Move ends on entering it), and their ships cannot sail through it. **Pack
Ice** freezes the deep sea, **Black Ice** frosts every enemy that stands on
the ice, **Icebound** freezes enemy ships in place to be crushed, and
**Glacier** makes the ice last and shelter the Ice Folk on it.

### 8.2 One sentence per rule

| Rule      | One sentence                                                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Freeze    | A unit turns the water next to it to ice, two tiles out in a straight line; the Witch freezes every tile around her.                |
| Slide     | An Ice Folk unit that steps onto ice slides straight on until it reaches the end of the ice, a unit, or an enemy's zone of control. |
| Slip      | Any other unit may walk onto ice, but its Move ends there.                                                                          |
| Thaw      | Ice melts after 3 of its owner's turns, but never in the owner's territory and never under a land unit.                             |
| No ships  | Ships cannot enter ice; the Ice Folk have no ships at all.                                                                          |
| Black Ice | Whoever stands on your ice at the start of your turn is frosted.                                                                    |
| Icebound  | Freeze a ship in place: it cannot sail, shoot, or strike back, and the ice crushes it for 3 each turn.                              |
| Glacier   | Your ice lasts 5 turns and your units on it have Snow cover.                                                                        |

### 8.3 Ice tiles

**State.** `GameStateV7.ice: { at, ownerId, turnsLeft }[]`, sorted by
`(y, x)`, hashed, saved, and replayed. An **ice tile** is a water tile (Shallow
or Deep) with an entry. Its terrain does not change: ice is a layer, so the
generation rule "no command turns water into land" still holds. State parsing
rejects an entry off the board, on a land tile, on a dock (Port or Shipyard),
a duplicate or unsorted entry, a `turnsLeft` outside 0 to 5, an `ownerId`
that is not a player of the match, and any entry in a match without an Ice
Folk seat. It also rejects a unit of Ice Folk kind in `NAVAL` or `EMBARKED`
form and an Ice Folk seat that owns a unit in `NAVAL` form.

**View.** `PlayerViewV7.ice` lists the entries on tiles the viewer has
explored, each with `permanent` (the tile is in its owner's territory). Ice
is public like a unit on an explored tile: the explored set never re-fogs, so
a viewer sees ice appear and melt on its explored tiles.

**What ice is.** For land-form units of every faction and movement mode, an
ice tile is ground: `canEnterTerrainV7` admits it whatever the depth and
without Navigation or Engineering; it may be the end of a `MOVE`, a
`DISEMBARK` target, the destination of a Push, a Charge! push or follow, a
Knockback, a Tractor Beam pull, an advance, a Beam Down, and a bombing-run
landing (a Gyrocopter stands on it and does not self-launch). A land unit
projects ZOC onto adjacent ice tiles as onto land. For everything else it is
water:

- no cover (Glacier gives Ice Folk units Snow cover there), no fortification,
  never Snow, no Road, building, improvement, Field Defense, Grave, Egg,
  mound, chest, reward or treasure unit, or rising on it;
- **a death on ice is a water death:** no Grave, no Infect or Bitten rising
  (the Rift precedent);
- its Fish or Pearls stay and may be harvested under the ordinary gates
  (ice fishing); a Port cannot be built on ice, and ice never forms on a dock;
- sea trade counts it as water (a route may run under the ice);
- a tunnel never passes under it, and an eruption does hit a land-form unit
  standing on it.

**Ships cannot enter ice.** A unit afloat (`NAVAL` or `EMBARKED`) never
enters, passes, or is pushed or pulled onto an ice tile; a naval unit
projects no ZOC onto ice. The only afloat unit ever on ice is one frozen in
([section 8.9](#89-icebound-and-the-crush)).

### 8.4 Freeze

`FREEZE { kind, unitId, at }` is a primary action of every Ice Folk land
role (ability `FREEZE`). It is not an Attack and costs no Coins.

| #   | Requirement                                                                                                     | Rejection                                     |
| --- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1   | `unitId` is the actor's own unit on the board.                                                                  | the ordinary unit errors                      |
| 2   | Its role, under its kind, has `FREEZE` (a land role of the Ice Folk), and it is in land form.                   | `UNIT_ROLE_INVALID { role }`                  |
| 3   | Its kind's capabilities under its owner have `freezeWater` `SHALLOW` or `DEEP` (Rime).                          | `TECH_REQUIRED { tech: "SHORECRAFT" }`        |
| 4   | It has not used a primary action, and a sluggish unit has not moved.                                            | `UNIT_ALREADY_ACTED`                          |
| 5   | For the Ice Witch, `at` is her own tile; for every other role, `at` is one of the eight tiles next to the unit. | `FREEZE_NOT_LEGAL { reason: "OUT_OF_RANGE" }` |
| 6   | The freeze set (below) is not empty.                                                                            | `FREEZE_NOT_LEGAL { reason: "NO_TARGET" }`    |

**The freeze set.**

- **A line, for every role but the Witch** (`FREEZE_LINE_V7` 2): the tile
  `at`, then the next tile beyond it in the same direction (`at` plus the step
  from the unit to `at`). The line takes `at` if it is freezable, then the
  second tile if it is freezable and `at` did not hold a ship. A line never
  skips a tile: if `at` is not freezable the set is empty.
- **A ring, for the Ice Witch** (`WITCH_FREEZE_RADIUS_V7` 1): every freezable
  tile within Chebyshev 1 of her.
- A tile is **freezable** when it is on the board, explored by the actor,
  water, not a dock, Shallow Water or (with `freezeWater` `DEEP`, Pack Ice)
  Deep Water, and one of: it holds no unit; it is already ice (whoever stands
  on it: the ice is refreshed); or, with `icebound` (the Ice Folk Naval
  Engineering), it holds a **hostile afloat unit** that is not already
  icebound, which becomes icebound.

**Result.** Every tile of the set gets the entry
`{ at, ownerId: actor's owner, turnsLeft: iceTurns }` (3, or 5 with
Glacier), replacing any earlier entry. The actor has used its primary action
and is handled. Event
`WATER_FROZEN { playerId, unitId, tiles, icebound }` (tiles in `(y, x)`
order, the newly icebound unit IDs in ID order). A Freeze moves no unit and
touches no dock, so it is not on the blockade-event list.

**Preview.** `previewFreezeV7(view, unitId, at)` returns null unless the
command is offered, otherwise `{ unitId, tiles, refreshed, icebound }`. Every
tile it reads is explored by the actor and every unit on it visible, so it is
exact.

### 8.5 Thaw

At the End Turn of player `P`, after the Chill countdown:

```text
for each ice entry owned by P, or by an eliminated player:
    if its tile is not in P's territory (an eliminated owner has none):
        turnsLeft := max(0, turnsLeft − 1)
then each of those entries with turnsLeft 0 and no land-form unit on its tile melts
```

- **Own territory keeps the ice:** while the tile is in its owner's territory
  the entry never counts down (a captured city's water starts counting at its
  former owner's next End Turn).
- **A land unit holds the ice:** an entry at 0 with a land-form unit of any
  owner on it stays at 0 and melts at the first counted End Turn on which the
  tile is empty. No unit ever drowns.
- **An afloat unit does not hold it:** an icebound ship floats free when its
  ice melts.
- Event `ICE_MELTED { tiles, freed }` (the melted tiles, and the icebound
  units that floated free), projected to every viewer with the tiles it has
  explored and the units it can see; dropped when empty.

### 8.6 Slide

A land-form Ice Folk unit whose role mechanic `glides` is true (every Ice
Folk land role but the Sabretooth) **slides**:

- When a step of its `MOVE` **enters an ice tile** in direction `d` (one of
  the eight), it continues in `d`, tile after tile, **at no cost**, while the
  next tile in `d` is on the board, explored by the mover before the command,
  an ice tile (read from the state before the command, like Snow), and holds
  no unit and no mound (own units included), and while the tile it is on is
  not in a hostile ZOC it knew of. It stops on the last tile so entered.
- Its Move then continues with the half-points it has left: another step
  (onto land, or onto ice in a new direction, which starts a new slide) or
  nothing. Entering ice costs the ordinary step cost (half from a Road
  node; since `7r37`, `pulp_wars-1wy.3`, Glide gives no discount here: it
  is a step from Snow onto Snow, and ice is never Snow); a step that leaves
  an ice tile costs a full point
  (water has no Roads); slid tiles cost nothing.
- **The slide is forced:** a `MOVE` path must follow every slide to its end;
  a path that stops or turns where a slide continues is rejected with
  `MOVEMENT_ILLEGAL { reason: "SLIDE_FORCED" }`, and the movement query
  offers only the tiles a Move can really end on.
- Slid tiles are part of the path: they reveal sight, count toward the
  Charge path length, and toward a Wreck salvage at the end of the Move. A
  slide that meets a ZOC first seen during the Move stops there and the Move
  is interrupted (`ZOC`), as for any Move.
- The **Sabretooth** never slides: on ice it walks at the ordinary cost, and,
  being an Ice Folk unit, it does not slip.

Reach: a Yeti (Move 1) on the shore of a straight four-tile bridge crosses
it in one Move and stops on its far tile; a Sled (Move 2) does the same and
still has a full point to step ashore, and it may Charge at the end.

### 8.7 Slip

For a land-form unit of every other faction in movement mode `GROUND`,
**a Move ends on entering an ice tile** (`terrainStopsMoveV7`; a path that
continues past it is rejected with `MOVEMENT_ILLEGAL { reason: "ICE_STOPS_MOVE" }`).
No Road edge and no Fieldcraft waives it (there are no Roads on ice). Martian
walkers and flyers and the Dwarf Gyrocopter are never stopped by terrain and
cross ice like land. Ice is read once per `MOVE`, from the state before the
command. Leaving an ice tile costs a full point. So any army may use an Ice
Folk bridge, one tile per turn.

### 8.8 Black Ice

At the Start Turn of a player with the capability `blackIce` (the Ice Folk
`SEAMANSHIP`), after the Cold Aura, every land-form unit **hostile to that
player standing on that player's ice** is Chilled
([current rules section 21.2](RULESET_7_CURRENT.md#212-chill): a new freeze
is sluggish once; a re-application refreshes the two turns without a new
sluggish turn). One `UNITS_CHILLED` (source `BLACK_ICE`, `sourceUnitId`
null) with every result, dropped when empty. So an enemy that lands on, or
walks onto, the ice is Shatter-eligible on the Ice Folk turn that follows.

### 8.9 Icebound and the crush

An afloat unit (`NAVAL` or `EMBARKED`) standing on an ice tile is
**icebound**. That is derived, never stored: the only way an afloat unit is
on ice is a Freeze of its tile with the capability `icebound` (the Ice Folk
`NAVAL_ENGINEERING`).

- **Frozen solid.** An icebound unit cannot `MOVE`
  (`MOVEMENT_ILLEGAL { reason: "ICEBOUND" }`), `ATTACK`
  (`ATTACK_NOT_LEGAL { reason: "ICEBOUND" }`), or `BOARD`
  (`BOARD_NOT_LEGAL { reason: "ICEBOUND" }`), none of them offered, and it
  never retaliates (`noRetaliationReason: "ICEBOUND"`, preview field
  `icebound`). An icebound embarked unit may still `DISEMBARK` under the
  ordinary landing rules (the crew climbs out; onto ice too). It may Recover
  (a ship next to its own dock), Wait, and Promote. No ram, Push, Knockback,
  or Tractor Beam moves it. An icebound Submarine is not submerged.
- **The crush.** At the Start Turn of the ice tile's owner, right after
  Black Ice, every icebound unit on that player's ice takes
  `ICE_CRUSH_DAMAGE_V7` **3**, in unit-ID order: fixed damage, not an attack
  (no cover, Defense, or HP ratio); a Shield absorbs first (an icebound
  self-launched Martian machine); capped at its HP. Event
  `UNITS_CRUSHED { playerId, results: [{ unitId, damage, shieldDamage, hpAfter }] }`,
  dropped when empty; a death has cause `CRUSHED`, credits no unit, leaves no
  Grave, and an embarked Goblin exploding unit explodes on its tile.
- **Release.** It floats free when its ice melts
  ([section 8.5](#85-thaw)). Ice in the Ice Folk seat's own territory never
  melts, so a ship frozen in Ice Folk home waters stays until it sinks.
- Docks never freeze, so an icebound unit is never on a dock and never
  blockades one.

### 8.10 Glacier

The capability `iceTurns` becomes 5 (`GLACIER_ICE_TURNS_V7`) for the ice the
seat makes from then on, and `iceCover`: a land-form Ice Folk unit on ice
whose own fortification level is 0 has cover × 1.5 (the Snow cover, not added
to anything else; the preview's `iceCover` is true). Glacier also grants
Harbours ([section 5.4](#54-harbours)).

### 8.11 No ships, no embarking

- The Ice Folk tree unlocks no naval role: `TRAIN_NAVAL` is never offered to
  an Ice Folk seat and is rejected with `UNIT_ROLE_INVALID { role }`. The
  `PATROL_BOAT`, `BATTLESHIP`, and `SUBMARINE` roles stay in the Ice Folk
  registration (the registry requires every role) with no unlock, like the
  reward-only `JUGGERNAUT`, and no rule can give the seat a ship: rewards and
  treasure units are land units, Mind Control never takes a ship, and the
  seat cannot Board (it has no ship to board with).
- **A unit of Ice Folk kind never embarks** (a body rule, so a
  mind-controlled Yeti does not either): a Move never ends on a dock for it,
  and the dock is not ice, so it cannot reach one.
- **Ports** keep their economic functions for the Ice Folk: +1 population
  (2 with Harbours), Harvest Fish on the dock tile, sea trade, the Shipyard
  upgrade (+2, 3 with Harbours). An enemy ship can still blockade an Ice Folk
  dock it can reach.
- Navigation's "Deep Water movement" and Naval Engineering's naval training
  discount are dead parts for the Ice Folk; every Ice Folk Naval technology
  still has a live unlock ([section 2.2](#22-ice-folk)).
- **Sea Dog** for an Ice Folk seat counts its land-form units standing on
  ice instead of its ships: 3 at once (goal "Hold the ice with 3 units at
  once.").
- **The Sunken Wreck:** on an ice tile, the first land-form unit (any
  faction) that ends a `MOVE` there, having moved onto it (a slide's end
  included), salvages it; afloat units can no longer reach it while it is
  ice.

### 8.12 Why ice cannot wall off a sea

- **Outside the Ice Folk territory, ice melts** after 3 (Glacier 5) of its
  owner's turns. Keeping a strait frozen costs a unit's action on every turn
  or two (one Freeze refreshes two tiles; a Witch refreshes her ring), and the
  unit doing it stands on exposed ice within a Battleship's reach.
- **Docks never freeze,** so no dock can be frozen shut, and a ship is never
  frozen onto one.
- **Ice is walkable by everyone:** a frozen strait is a bridge for the enemy's
  land units too (one tile per turn), and a transport may always land on the
  edge of the ice. No landmass becomes unreachable.
- **What stays for good** is ice in the Ice Folk's own territory (at most
  two tiles from their city centers, wider after a Land Grant): their own
  waters, like land they own. A ship frozen there stays until crushed. This
  is the intended home advantage.
- An Ice Folk seat's eliminated ice counts down at every End Turn and melts.

### 8.13 Worked examples

| Situation                                                                      | Result                                                                                                                                                |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| A Yeti on the shore freezes toward an island 4 Shallow tiles away              | turn 1: tiles 1 and 2; turn 2: it steps onto tile 1, slides to tile 2, freezes 3 and 4; turn 3: it steps onto 3, slides to 4, and is ashore next turn |
| The army follows on turn 3                                                     | each unit steps onto tile 1 and slides to the first occupied or last tile; tiles 1 and 2 melt at the end of turn 3 unless someone stands on them      |
| An Ice Witch walks out onto the bridge head and freezes                        | her ring (up to 8 tiles) becomes ice: a three-wide road that the army slides along                                                                    |
| A Human Fighter lands from a transport onto Ice Folk home ice (with Black Ice) | at the Ice Folk Start Turn it is Chilled; a Yeti deals 5 (7 left), a second Yeti's 6 would leave 1: it **shatters**                                   |
| A Battleship three tiles from a Yeti on ice                                    | it shoots for 22: the Yeti dies, and its neighbours on the bridge take 11 splash each                                                                 |
| A Sled slides four tiles, then Freezes the Battleship in (Icebound)            | it cannot sail, shoot, or reply: two Yetis hit it for 3 and 3 at once (19 left); next turn the crush and two hits leave 7; it sinks on the third      |
| A Patrol Boat next to a Yeti on ice                                            | the boat deals 5 and takes 3; the Yeti deals 5 and takes 5                                                                                            |

## 9. Resolution order

**An attack** (additions in bold, on top of
[current rules section 13](RULESET_7_CURRENT.md#13-combat-and-fortification)
and the faction resolution orders):

1. Legality: **Submerged** (a non-icebound Submarine only from distance 1),
   **Torpedo** (a Submarine targets only units afloat), **icebound attackers
   cannot attack**.
2. Attack: the ordinary bonuses, **Ram**. Defense: the ordinary,
   **ice cover** (Glacier).
3. Damage both ways; no retaliation for a **torpedo** or an **icebound**
   defender, or a Shatter.
4. The ordinary steps (Lifesteal, splash, kill credit, growth, Field Defense,
   deaths, releases).
5. Push step: a Juggernaut's Push, a Knockback, a Charge! push, or **a ram's
   shove**.
6. The advance, chains, and tail; the blockade and sea-network events.

**Start Turn** of a player: the existing order through the Cold Aura, then
**Black Ice**, then **the crush**, then Plague and the rest.

**End Turn** of a player: the existing order through the Chill countdown,
then **the thaw**, then the income preview.

## 10. Interactions with existing rules

| Rule                  | Interaction                                                                                                                                                                                                                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graves, risings       | No death afloat or on ice leaves a Grave or rises; Raise Dead never reaches the sea. A shattered unit on ice leaves nothing, as everywhere.                                                                                                                                                                                                                               |
| Plague, Bitten, Wail  | Unchanged on ships and on ice. Black Ice Chill and Bitten coexist.                                                                                                                                                                                                                                                                                                        |
| Kaboom, blasts        | Hit ships, Submarines, icebound ships, and units on ice like any unit. A blast never melts or makes ice.                                                                                                                                                                                                                                                                  |
| Charge!, T-Rex, Eggs  | A Triceratops may Charge! along land and onto ice (the run-up counts its Move; a Dinosaur ground unit slips, so the run-up ends on the first ice tile). Eggs never on ice.                                                                                                                                                                                                |
| Martian               | Flyers and walkers cross ice like land; a machine ending a Move on ice stands (no self-launch). Shields absorb the crush. Mind Control works on a unit on ice (land form). A controlled Ice Folk unit slides and Freezes for its controller, with the controller's research read through the Ice Folk tree (`unitCapabilitiesV7`), and its ice belongs to the controller. |
| Dwarf                 | Tunnels never under ice; a mound is never on ice; a bomb run may land on ice; eruptions hit land-form units on ice. Gyrocopters are the Dwarf answer to Submarines.                                                                                                                                                                                                       |
| Ice Folk (existing)   | Ice is never Snow (no Glide or deep snow there; Glacier gives Snow cover only). The Blizzard's ranged halving protects Ice Folk units on ice in it. Shatter applies on ice (land form). Chill never applies to afloat units, so an icebound ship is crushed, not shattered.                                                                                               |
| Rift                  | A Rift never touches water, so never ice.                                                                                                                                                                                                                                                                                                                                 |
| Push and pulls        | A land-form unit may be pushed, knocked back, or pulled onto ice; an afloat unit never; an icebound unit never moves.                                                                                                                                                                                                                                                     |
| ZOC, pass-through     | Land units project ZOC onto ice; naval units do not. A slide never passes a unit, own or not. A naval unit's pass-through of own boats is unchanged.                                                                                                                                                                                                                      |
| Embarking, landing    | A transport may land on adjacent ice (landing ends the activation as always). An Ice Folk unit never embarks.                                                                                                                                                                                                                                                             |
| Blockade, sea trade   | Docks never freeze; sea-trade routes run under ice. A ram can shove a blockader off a dock; a boarded prize on a dock blockades it.                                                                                                                                                                                                                                       |
| Curiosities           | A Wreck under ice is salvaged by a land unit ending a Move on it. A Fountain or Shrine is on land.                                                                                                                                                                                                                                                                        |
| Achievements          | Sea Dog counts Submarines and prizes; for the Ice Folk, units on ice. Slayer: crushes credit nobody; a boarding is no kill. Muster counts the Submarine as a trainable role.                                                                                                                                                                                              |
| Fog                   | Ice, icebound status, and the Submarine are public on explored tiles. Every new preview is exact.                                                                                                                                                                                                                                                                         |
| Map generation, setup | Unchanged; faction choice still never affects any draw.                                                                                                                                                                                                                                                                                                                   |
| Elimination           | Units are removed as today; an eliminated seat's ice counts down at every End Turn. A prize of an eliminated player stays with its captor.                                                                                                                                                                                                                                |

## 11. Per-unit battle analysis

The T-Rex was dominant and the first Triceratops useless in ways the damage
formula could have shown beforehand. Every new unit and ability is put
through the same exchanges here, with the decided numbers.

### 11.1 Method

- A scratch script ports the damage formula of
  [current rules section 13.2](RULESET_7_CURRENT.md#132-damage) from
  `calculateCombatPreviewV7` (`src/engine/v7/combat.ts`) in half-units with
  the engine's `roundHalfUp`, embarked Defense 1, and cover as a fraction.
  It reproduces the published worked examples of the Ice Folk and Dwarf
  overlays (Yeti on Fighter 5 and 5; Battleship on Patrol Boat 20).
- Units are read from the registry at `7r35`. Exchanges are at full HP on
  open water or open ground unless stated, the attacker first.
- Scripts (temporary):
  `/private/tmp/claude-501/-Users-nadbor-projects-pulp-wars/1d080a8d-9f97-4ca4-af61-87f1be442688/scratchpad/naval/`
  (`lib.mjs`, `t1.mjs`, `t2.mjs`, `t3.mjs`). Engine step I re-runs them on
  its registry before coding and reports every verdict that flips.
- What it cannot see: movement, fog, the AI. It ranks options and shows
  thresholds; it does not predict win rates.

### 11.2 The Patrol Boat with Ram

Cost 5, 10 HP, Attack 2 (3 ramming), Defense 2, Move 2.

| Target                             | Plain attack: dealt; taken | Ram: dealt; taken | Ram's extra                        |
| ---------------------------------- | -------------------------- | ----------------- | ---------------------------------- |
| Patrol Boat                        | 5; 5                       | 8; 4              | target at 2: boardable; shoved     |
| Submarine                          | 5; 5                       | 8; 4              | target at 4: boardable; shoved     |
| Battleship                         | 3; 12 (boat dies)          | 6; 10 (boat dies) | none: rams do not beat Battleships |
| Battleship at 16 HP                | 4; 10                      | 7; 8              |                                    |
| Battleship at 9 HP                 | 5; 8                       | 9; 6              | finishes it                        |
| any transport (embarked land unit) | 6; 0                       | 10; 0             | shoved away from the coast         |

- **Job.** Escort, screen, and Submarine hunter; with Seamanship the fight
  between boats is decided by who rams first, and transports learn to sail
  escorted.
- **Counters.** The Battleship (20 on a boat, at range), shore units (a Knight
  deals it 8 from the beach), Submarines (12, unanswered).
- **Verdict: useful, not dominant.** The ram is +1 Attack on the boat's
  existing duel and a positional tool (blockaders, landings); it does nothing
  against the Battleship, which keeps the triangle.

### 11.3 Boarding

- **When it happens:** a rammed Patrol Boat (2 left) or a rammed Submarine
  (4 left) is boardable at once by a second ship; a Battleship needs to be
  brought to 8 or less (two torpedoes: 5).
- **The decision:** sink it (a kill, the Promotion and Slayer count) or take
  it (a ship worth 5, 9, or 16 Coins at 4, 5, or 9 HP, orphaned, that must
  reach an own dock to heal and can be lost again). The boarder spends its
  primary action (no attack this turn).
- **Loops:** the prize is patched to one above the threshold, so the former
  owner needs a hit that leaves it alive at or below the line before it can
  board it back: the same two actions the capture took. A hit on a 4-HP prize
  Patrol Boat deals 6 (sunk) or 11 with a ram: it is easier to sink than to
  retake, which ends ping-pong.
- **Verdict: useful, swingy, not dominant.** It never works on a healthy
  ship, never on a transport, and costs an action that could have been an
  attack. The watch item is the early boat duel (ram plus board is a two-ship
  swing); its lever is the ram bonus of +0.5, which leaves a fresh Patrol
  Boat at 4, out of reach of a boarding ([section 15.3](#153-tuning-bounds)).

### 11.4 The Submarine

Cost 9 (7 at a Shipyard), 12 HP, Attack 4, Defense 2, Move 2; Submerged;
Torpedo.

| Opponent                                                                                      | It attacks the Submarine: dealt; taken | The Submarine attacks it: dealt; taken |
| --------------------------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------- |
| Patrol Boat                                                                                   | 5; 5 (ram 8; 4)                        | 12 (sunk); 0                           |
| Battleship                                                                                    | adjacent only: 20 (sunk); 2            | 9; 0                                   |
| Submarine                                                                                     | 12 (sunk); 0                           | 12 (sunk); 0                           |
| transport (any embarked unit)                                                                 | cannot attack                          | 14; 0                                  |
| Fighter, Skeleton, Caveman, Yeti                                                              | 5; 5 (from the shore or ice)           | cannot target a land unit              |
| Guard                                                                                         | 3; 5                                   | —                                      |
| Knight                                                                                        | 8; 4                                   | —                                      |
| T-Rex                                                                                         | 12 (sunk); 3                           | —                                      |
| Steam Tank                                                                                    | 8; 4                                   | —                                      |
| Saucer                                                                                        | 3; 5                                   | —                                      |
| Ray Gunner, full power, adjacent                                                              | 8; 4                                   | —                                      |
| Goblin with Gang Up +2                                                                        | 10; 3                                  | —                                      |
| Gyrocopter bomb; Goblin Kaboom                                                                | 5 (6 with Dive); 5, never answered     | —                                      |
| Marksman, Catapult, Battleship from 2+, Steam Cannon, Ray Gunner from 2, Bomb Chucker, Tripod | cannot target it                       | —                                      |

- **Job.** The Battleship killer and the transport hunter. Two Submarines
  (18 Coins, 14 at a Shipyard) sink a fresh Battleship (16) in two turns
  even if it fires back at one of them; three sink it in one turn untouched.
- **Typical turn.** Move up to two tiles and torpedo; never end next to a
  live Battleship without torpedoing it (it shoots an adjacent Submarine for
  20).
- **Counters.** Patrol Boats (cheap, melee, ram: two rams sink it), any
  ship or shore unit adjacent to it, Gyrocopter bombs, Kaboom, splash on its
  neighbours, Icebound. It cannot hit land, capture, or bombard a coast, so
  it never takes a city by itself.
- **Mirror.** Submarine against Submarine is first strike wins (12 on 12 HP,
  unanswered). The Patrol Boat screen decides it. Accepted; the lever "a
  torpedo is answered by a Submarine" is named.
- **The lessons.** Not the T-Rex: it has no Overrun, no capture, 12 HP, and
  its best target, the Battleship, is the most expensive thing on the sea; it
  is killed by the cheapest unit there. Not the first Triceratops: no other
  unit sinks a Battleship without taking its return fire or can sit two tiles
  from it in safety.
- **Verdict: useful, not dominant.** Watch item: Submarine kills over 40% of
  a seat's kills on water maps.

### 11.5 The triangle: Battleship, Submarine, Patrol Boat

| Attacker → defender | Patrol Boat             | Submarine                | Battleship        |
| ------------------- | ----------------------- | ------------------------ | ----------------- |
| Patrol Boat         | 5; 5 (ram 8; 4)         | 5; 5 (ram 8; 4)          | 3; 12 (ram 6; 10) |
| Submarine           | 12 (sunk); 0            | 12 (sunk); 0             | 9; 0              |
| Battleship          | 20 (sunk), from 3 tiles | 20 (sunk), only adjacent | 16; 7             |

Per Coin: the Battleship sinks a Patrol Boat a turn from safety; two Patrol
Boats sink a Submarine; two Submarines sink a Battleship. A fleet wants all
three, which is the decision the branch adds. Today's single answer to
everything, the Battleship, keeps its job (the only unit that bombards a
coast from range and splashes) and gains a counter.

### 11.6 Ice Folk on the ice against ships

| Exchange                                             | Dealt; taken          | Note                                                |
| ---------------------------------------------------- | --------------------- | --------------------------------------------------- |
| Yeti (on ice or shore) attacks Patrol Boat           | 5; 5                  | even trade, for 2 Coins against 5                   |
| Patrol Boat attacks a Yeti on ice                    | 5; 3                  | (Glacier cover: 4; 4)                               |
| Mammoth attacks Patrol Boat                          | 6; 4                  |                                                     |
| Sled with Charge (after a slide) attacks Patrol Boat | 8; 4                  |                                                     |
| Sabretooth attacks Patrol Boat / Submarine           | 8; 4 / 8; 4           | it walks on ice, does not slide                     |
| Planted Boulder Yeti, from 2, Patrol Boat            | 8; 0                  |                                                     |
| Yeti attacks Battleship                              | 3; 12 (dies)          | Ice Folk cannot fight a free Battleship             |
| Battleship on a Yeti / Mammoth / Witch on ice        | 22 / 20 / 23: all die | splash 11 on each neighbour; Glacier cover: 20 / 18 |

- **Reading.** Against boats the ice is a fair fight; against a free
  Battleship it is a massacre. A bridge inside a Battleship's reach (3 tiles,
  with splash) is a death trap. So the Ice Folk must cross where no
  Battleship reaches, or freeze it first (Icebound), or let it come into
  their permanent home ice.

### 11.7 Icebound

Frozen on Ice Folk turn 1 and hit the same turn (no reply); the crush (3)
comes at every later Ice Folk Start Turn while the ice lasts (for good in
Ice Folk territory, otherwise 3 turns unless refrozen):

| Frozen unit             | Crush only                      | One Yeti a turn | Two Yetis a turn             | Two Yetis and a Mammoth |
| ----------------------- | ------------------------------- | --------------- | ---------------------------- | ----------------------- |
| Patrol Boat (10)        | 5th turn (needs permanent ice)  | 2nd turn        | 1st turn                     | 1st turn                |
| Submarine (12)          | 5th turn (needs permanent ice)  | 2nd turn        | by the crush of the 2nd turn | 1st turn                |
| Battleship (25)         | 10th turn (needs permanent ice) | 4th turn        | 3rd turn                     | 2nd turn                |
| transport (Fighter, 12) | 5th turn (needs permanent ice)  | 2nd turn        | 1st turn                     | 1st turn                |

- **Reach.** Freeze needs the ship next to a unit that stands on land or ice.
  A Battleship one tile beyond the ice edge is in reach of any Ice Folk unit
  that can slide to the edge; the Witch's ring catches every ship next to
  her. The Battleship sees the ice and the units, and the previous turn it
  could have shot them: the decision is the Battleship's distance from the
  ice edge.
- **Verdict: useful, strong, tier 3.** It is the Ice Folk's only answer to a
  Battleship and arrives at the tier where Battleships do. Watch item:
  Battleships lost to Icebound per game; lever: crush 2.

### 11.8 Black Ice against landings

A Fighter that lands on Ice Folk home ice is Chilled at the next Ice Folk
Start Turn: a Yeti deals it 5 (7 left), and a second Yeti's hit (6) would
leave 1, so it **shatters** with no reply and no Grave; without Black Ice
the same two hits leave it at 1 and take 8 from the two Yetis. A charging
Sled leaves a Chilled fresh Fighter at 4 (a Shatter only with Brittle); a
Mammoth leaves a Chilled Knight at 2 (a Shatter). Re-applied Chill never
makes a unit sluggish twice in a row
([current rules section 21.2](RULESET_7_CURRENT.md#212-chill)), so a unit
that stays on the ice is frosted, not locked.

- **Counter.** Do not stand on their ice: land beside it (on open coast) or
  out of reach, or cross fast. Martian flyers and walkers land on ice too,
  and are Chilled like anyone.
- **Verdict: useful, situational.** It turns home ice into a trap and
  bridges into a risk for the enemy; it does nothing to an enemy that stays
  off the ice.

### 11.9 Freeze, the bridge, and the slide

- **Speed.** One builder advances a bridge two tiles a turn (step onto the
  newest ice, slide to its end, Freeze two ahead); a Witch makes it three
  wide. A transport crosses two water tiles a turn and needs a Port (4 Coins),
  an embarking turn, and a landing turn. Ice is free, about as fast, and the
  whole army then crosses a straight bridge in one Move per unit.
- **Durability.** With 3-turn ice and two tiles a turn, one builder keeps a
  bridge of about six tiles standing behind it (Glacier: ten); longer
  crossings are a column that walks on the ice it holds, the tail melting
  behind it. Archipelago crossings are mostly two to six tiles.
- **Risk.** Units on ice have no cover (Glacier: Snow cover) and slide into
  forced positions; a Battleship in reach kills a bridge column with splash.
- **Verdict: the faction's sea game.** Not dominant: it is no faster than a
  transport, exposed, and usable by the enemy. Not useless: it is free, it
  carries the whole army at slide speed, and it blocks enemy ships.

### 11.10 The faction as a whole on water

The Ice Folk give up three ship types and gain free crossings, home waters
no ship can enter, a trap for landings, and a tier-3 ship killer that needs
adjacency. Their weak window is the middle game against Battleships before
Icebound: a Battleship shelling their coast from beyond the ice is answered
only by units that slide up to the ice edge. The balance bead measures it
([section 15.4](#154-balance-acceptance)); the named levers are Freeze reach
2 and crush 4.

## 12. Commands, events, errors, state, and queries

- **Commands.** `BOARD { kind, unitId, targetUnitId }` (step I, after
  `ATTACK`); `FREEZE { kind, unitId, at }` (step II, after `COLD_SNAP`).
  `MOVE` validates slides and slips; `ATTACK` applies Submerged, Torpedo,
  icebound attackers, and the ram. A pending city reward blocks both new
  commands like every command.
- **Events.** `SHIP_BOARDED { playerId, unitId, targetUnitId, fromPlayerId, at, hp }`;
  `WATER_FROZEN { playerId, unitId, tiles, icebound }`;
  `ICE_MELTED { tiles, freed }`;
  `UNITS_CRUSHED { playerId, results: [{ unitId, damage, shieldDamage, hpAfter }] }`;
  `UNIT_DIED.cause` gains `CRUSHED`; `UNITS_CHILLED.source` gains
  `BLACK_ICE`; the existing `UNIT_PUSHED` reports a ram's shove.
- **Projection.** `SHIP_BOARDED` to the actor, the former owner, and every
  viewer that sees the tile before or after; `WATER_FROZEN` and `ICE_MELTED`
  to every viewer with the tiles it has explored (dropped when none);
  `UNITS_CRUSHED` like Plague damage (the owner of a victim, and viewers that
  see it).
- **Errors.** `BOARD_NOT_LEGAL` (`NOT_A_SHIP`, `TARGET_IMMUNE`,
  `OUT_OF_RANGE`, `TARGET_HEALTHY`, and in step II `ICEBOUND`);
  `ATTACK_NOT_LEGAL` (`NOT_AFLOAT` for a torpedo at a land unit, and in step
  II `ICEBOUND` for a frozen attacker); a Submarine targeted from 2 or more is
  the existing `TARGET_OUT_OF_RANGE`; `FREEZE_NOT_LEGAL` (`OUT_OF_RANGE`,
  `NO_TARGET`); `MOVEMENT_ILLEGAL` reasons `SLIDE_FORCED`, `ICE_STOPS_MOVE`,
  and (an icebound unit) `ICEBOUND`; `noRetaliationReason` gains `ICEBOUND`.
- **Combat preview** (so also `COMBAT_RESOLVED`): `ram`, `torpedo`
  (step I); `iceCover`, `icebound` (step II); all false where they do not
  apply.
- **Registration.** Step I: role `SUBMARINE` in every faction; ability
  literals `RAM`, `SUBMERGED`, `TORPEDO`; unlock kinds `RAM` and `HARBOURS`
  (plus `COMMAND BOARD`); capabilities `ram`, `boarding`, `harbourPopulation`;
  constants `RAM_BONUS2_V7` 2, `BOARDING_HP_DIVISOR_V7` 3,
  `HARBOUR_POPULATION_V7` 1. Step II: ability `FREEZE` on every Ice Folk land
  role; unlock kinds `FREEZE { depth }`, `ICEBOUND`, `BLACK_ICE`, `GLACIER`;
  capabilities `freezeWater`, `icebound`, `blackIce`, `iceTurns`, `iceCover`;
  constants `ICE_TURNS_V7` 3, `GLACIER_ICE_TURNS_V7` 5, `FREEZE_LINE_V7` 2,
  `WITCH_FREEZE_RADIUS_V7` 1, `ICE_CRUSH_DAMAGE_V7` 3,
  `ICE_SEA_DOG_UNITS_V7` 3; `TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7` gains
  `ICE_FOLK: { SHORECRAFT: "Rime", NAVIGATION: "Pack Ice", NAVAL_ENGINEERING: "Icebound", SEAMANSHIP: "Black Ice", SUBMERSIBLES: "Glacier" }`
  next to its Deep Winter and Brittle.
- **Shared rules** extended, never paralleled: `canEnterTerrainV7` (ice for
  land form, never for afloat), `terrainStopsMoveV7` (slip),
  `canCrossWaterV7` (afloat units never cross ice), the one occupancy
  predicate, `unitMayActAfterMoveV7` (boarding), and new helpers
  `iceAtV7`, `unitIsIceboundV7`, `slideEndV7`.
- **Queries.** `queryPlayerCommandsV7` offers `BOARD` for every legal pair,
  `FREEZE` for every legal `at` (one per Witch), `MOVE` endpoints after
  slides, and never an `ATTACK` on a Submarine from 2 or a torpedo at land.
  `queryThreatenedTilesV7` gives a visible Ice Folk unit its slide reach on
  known ice, gives a Submarine only adjacent targets afloat, and threatens a
  Submarine only from adjacent tiles. `previewBoardV7` and `previewFreezeV7`
  as above; every preview equals the resolution.
- **Public unit stats.** `submerged`, `boardableAt`, `icebound`; in the
  `iceFolk` block `onIce` and `slides`.

## 13. Normal AI requirements

Every existing guarantee holds: deterministic and PRNG-free; only the public
view, public commands, and public previews; at most 128 accepted commands
per owner turn through bounded resumable work. **Dry Land decisions are
unchanged** (nothing in the branch is offered there). On water maps every
seat's decisions change, since every seafaring seat can research the new
technologies; that is intended and measured
([section 15](#15-headless-support-measurement-tuning-bounds-and-balance-acceptance)).

**The user's rule for AI changes.** Each strategy rule below comes with a
modest head-to-head or win-tendency test: the same seeds, mirrored seats, a
few dozen decided games on Continents and Archipelago, against the policy
without that rule. A rule that does not tend to win is dropped.

### 13.1 Seafaring seats (bead `5ti.4`)

- **Research.** Seamanship after Shorecraft once the seat owns two naval
  units or sees a hostile boat; Submersibles once it has Seamanship and sees
  a hostile Battleship, or owns three docks (Harbours); Navigation before
  either when the naval plan needs Deep Water (unchanged).
- **Training.** Beyond two owned naval units the plan still asks for one
  role at a time; it asks for a Submarine while a visible hostile Battleship
  exists and own Submarines are fewer than twice the visible hostile
  Battleships, and for a Patrol Boat while a visible hostile Submarine exists
  and own Patrol Boats are fewer than twice those Submarines.
- **Ram.** Read from the preview (`ram`, `push`): add value for a shove that
  takes a blockader off an own dock, pushes a transport away from an own
  coast, or puts the target next to another own ship; a Patrol Boat makes its
  approach Move before attacking when that earns the ram.
- **Board.** For every offered `BOARD`, the prize value is its role's cost
  times 1 if no visible hostile unit can sink it next turn (the threat
  estimate at its patched HP), else 0.3; board when that beats the best
  offered attack of the same ship (which is valued as today); always board a
  Battleship or Submarine that is not in lethal reach.
- **Submarine play.** Targets: Battleship, then Submarine, then transport,
  then Patrol Boat. A Submarine never ends a routine Move next to a visible
  hostile Battleship it did not torpedo, nor in the ram reach of two visible
  hostile Patrol Boats unless it torpedoes this turn. Battleships keep a
  Patrol Boat between them and a visible hostile Submarine when one is free.
- **Estimates.** Threat evaluation: a visible hostile Submarine threatens
  only afloat units next to the tiles it can reach, unanswered; own and
  visible Submarines are threatened only from adjacent tiles; a visible
  hostile Patrol Boat is assumed to ram (research is private: the
  Wallbreaker precedent). Water routes treat ice as a wall.

### 13.2 The Ice Folk (bead `5ti.5`)

The ordinary naval plan (Ports, transports, escorts, landings) is replaced
for an Ice Folk seat by an **ice plan**, gated on an Ice Folk seat whose Rime
is not forbidden.

- **Crossing.** Where the naval plan would activate (an overseas objective,
  or a sea route more than three steps shorter than the walk), the plan picks
  a **crossing**: the shortest 8-way chain of explored water tiles (Deep only
  with Pack Ice or when researching it is planned) from a tile next to own
  land or own ice to a tile next to the objective's landmass, preferring
  straight runs (fewer direction changes) and avoiding tiles within 3 of a
  visible hostile Battleship.
- **Research.** Rime when a crossing exists or a visible hostile ship is
  within 3 of an own city; Pack Ice when the crossing needs Deep Water;
  Black Ice once a hostile land unit has stood on own ice or a hostile
  transport is visible within 3 of own territory; Icebound once a visible
  hostile Battleship or Submarine is within 4 of an own unit; Glacier last.
  The free opener keeps the ordinary scorer.
- **Builders.** The Witch, if the seat has one within 6 route steps,
  otherwise the cheapest one or two units (Yetis first) take a **Build** job:
  walk to the crossing head, Freeze the next two tiles of the crossing, step
  onto the newest ice the next turn, repeat. A builder refreezes a crossing
  tile whose `turnsLeft` is 1 while units of the wave still have to pass it.
- **The wave** bound for that objective waits at the head until the crossing
  reaches the far shore or is one slide from it, then crosses through offered
  `MOVE` commands (the slides are in the offered endpoints).
- **Icebound.** Freeze a hostile ship when offered, valued by its role cost
  plus the own attacks that can reach it next turn; the Witch's ring freeze
  counts every ship it binds. Frozen ships are attacked like any target (the
  previews show no retaliation).
- **Home ice.** When a visible hostile ship or transport is within 3 of an
  own city center, units with nothing better to do Freeze own-territory water
  next to that center (permanent ice keeps ships off it).
- **Never** a Freeze that only refreshes ice no crossing or wall needs.

### 13.3 Against the frozen sea (bead `5ti.5`)

- Land routes treat ice as passable with a stop on entering (slip); water
  routes treat it as a wall.
- A transport prefers a landing tile that is not Ice Folk ice when one within
  2 of the planned tile exists (Black Ice is assumed, research being
  private).
- A ship does not end a routine Move next to a tile from which a visible Ice
  Folk unit can Freeze it this turn (its slide reach on known ice plus one),
  assuming Icebound once the seat has been seen to Freeze; a Battleship keeps
  shelling units on ice from 2 or 3 tiles and values bridge columns by splash.
- Frozen own ships are written off in the threat map (they cannot move);
  their crews land if they are transports and a landing is offered.

### 13.4 Tests

Headless matches of every faction pair on Continents and Archipelago finish
without stalls or policy errors. Scenario tests: a Patrol Boat that rams a
blockader off its dock; a ship that boards a Battleship at 5 HP rather than
torpedo it; a Submarine that torpedoes a Battleship and does not end next to
an untouched one; a Battleship screened by a Patrol Boat from a Submarine;
Ice Folk builders that bridge a four-tile strait and a wave that slides
across; a Witch that freezes two ships in; a Black Ice landing avoided; a
ship kept out of Freeze reach. Pinned decision hashes of Dry Land matches are
unchanged.

## 14. UI requirements and art needs

### 14.1 Surfaces (bead `5ti.7`)

- **Technology tree:** the Naval branch drawn with the five-node shape of
  every other branch (`technology-tree-layout` gains no special case), each
  card with its one sentence and the viewer's faction names (the Ice Folk
  see Rime, Pack Ice, Icebound, Black Ice, Glacier). Dry Land and missions
  show all five Unavailable.
- **Ram:** the attack preview of a Patrol Boat that moved reads "Ram +1"
  and draws the shove arrow (or "blocked"); the resolution animates a bow
  splash and the shove.
- **Board:** a "Board" action on an eligible adjacent ship, with the prize's
  HP after the patch; a ship at or below its `boardableAt` shows a small
  grappling-hook badge to both sides; the capture swaps the ship's art to the
  captor's faction with a flag-change effect; log "{owner} boarded
  {former owner}'s {ship}".
- **Submarine:** drawn low in the water; its info panel reads "Submerged:
  can only be attacked from an adjacent tile" and "Torpedo: only boats and
  transports; they cannot strike back"; attack targeting greys out a
  Submarine two or more tiles away with that reason.
- **Harbours:** dock tooltips and the city's population breakdown.
- **Ice:** ice tiles over Shallow and Deep Water (two looks), permanent ice
  (snow-dusted, no cracks) distinct from melting ice (crack stage by
  `turnsLeft`: 1 shows wide cracks); an ice tile's tooltip "Ice (Ice Folk):
  melts in N turns" or "permanent in their territory".
- **Freeze:** targeting shows the two-tile line from each adjacent tile (the
  Witch: her ring), the tiles that would be refreshed, and ships that would
  be frozen in; the resolution animates the freeze spreading.
- **Slide:** the movement overlay draws a slide as an arrow from the entry
  tile to its forced end; hovering an endpoint shows the full path; tiles
  that cannot be stopped on are not offered.
- **Slip:** another faction's unit sees "Ice: your Move ends here".
- **Icebound:** a frost crust over the ship's hull and "Icebound: cannot
  sail, shoot, or strike back; crushed for 3 at the start of {owner}'s turn".
- **Black Ice:** hostile units on the seat's ice show the existing Frosted
  marker after the Start Turn; the owner's ice tooltip says "Black Ice" (other
  viewers learn of it from the first `UNITS_CHILLED` with source
  `BLACK_ICE`, as research stays private).
- **Crush:** cracking ice and a hit number at the Start Turn.
- **Sea Dog** goal text for the Ice Folk.

### 14.2 Help text

Each in one sentence, as in [sections 4](#4-seamanship-ram-and-boarding),
[5](#5-submersibles-the-submarine-and-harbours), and
[8.2](#82-one-sentence-per-rule):

- **Ram:** "A Patrol Boat that moved this turn rams boats and transports
  with +1 Attack and shoves them one tile back."
- **Board:** "A ship can capture an adjacent enemy ship that has a third of
  its HP or less."
- **Submerged:** "Can only be attacked from an adjacent tile."
- **Torpedo:** "Attacks only boats and transports, which cannot strike back."
- **Harbours:** "Every active Port and Shipyard gives 1 more population."
- **Freeze, Slide, Slip, Thaw, Black Ice, Icebound, Glacier:** the sentences
  of [section 8.2](#82-one-sentence-per-rule).

### 14.3 What the art bead must draw (bead `5ti.6`)

Under the PixelLab workflow of the project instructions, with the direction
of [NAVAL_FACTIONS.md](../art/NAVAL_FACTIONS.md),
[VISUAL_DIRECTION_2026-10.md](../art/VISUAL_DIRECTION_2026-10.md), and the
[naval](../art/classes/naval.md) and
[terrain-tile](../art/classes/terrain-tiles.md) classes; a small sample per
class reviewed at native and enlarged size before any batch.

| Piece                                       | Count                                                                        | Notes                                                                                                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Submarine map sprite                        | 6 (Human, Undead, Goblin, Dinosaur, Martian, Dwarf) + the shared Classic one | the Patrol Boat's canvas, class, and anchor; low profile but the waterline rule of the naval pieces; concepts in [section 7](#7-the-other-seafaring-factions) |
| Submarine portrait                          | 6 + the shared Classic one                                                   | 48 x 48, edits of the faction's Patrol Boat portrait where possible                                                                                           |
| Ice over Shallow Water, ice over Deep Water | 2 tiles, with edge variants as the terrain class requires                    | pale blue-white over the visible water tint; must read apart from Snow on land and from both waters; seamless and not repetitive at map scale                 |
| Melting cracks                              | code-drawn over the ice tile (3 stages)                                      | no raster needed                                                                                                                                              |
| Icebound frost crust                        | one overlay (or code-drawn)                                                  | over every faction's three ship hulls; reviewed on all 18                                                                                                     |
| Freeze, slide, crush, ram, board effects    | code-drawn                                                                   | reduced-motion variants                                                                                                                                       |

The Ice Folk ship rasters of `pulp_wars-w5j.2` stop being used by the live
look after step II (kept in the manifest for the Classic fallback until the
art bead retires them). [NAVAL_FACTIONS.md](../art/NAVAL_FACTIONS.md) gains
the Submarine rows. Review: extend `npm run art:chibi-naval-faction-review`
with the Submarines and add an ice-tile review to the terrain evidence.

**As built (`pulp_wars-5ti.6`).** The art is described in
[NAVAL_FACTIONS.md](../art/NAVAL_FACTIONS.md#the-naval-branch-art-bead-pulp_wars-5ti6).
Where it differs from the table:

- **Seven Submarines and the Classic one**, not six: the Candy have one
  ([section 20](#20-engine-step-i-as-built-pulp_wars-5ti2), item 1). The
  Ice Folk have none; until step II theirs is the Classic one in the
  owner's colour.
- **Riding low** is a second sprite per faction, derived by script from
  the surfaced one (sunk 7 rows, foam at the waterline); the live look
  draws it for a submerged Submarine, without the code-drawn wave lines.
- **Icons:** Seamanship and Submersibles have dedicated technology icons,
  and Ram, Board and Torpedo have icons (the table named none).
- **Ice:** each of the two tiles has two variants and no edge rasters: the
  edge at open water and the snow dusting of permanent ice are cut in code
  (`seaIceTileV7`).
- **Icebound:** one raster overlay, the lower half of the ship's cell,
  reviewed on the three hulls of the seven seafaring factions (21).
- **Review:** the ice review is its own command,
  `npm run art:naval-branch-ice-review`.

The ice tiles and the overlay are drawn since the frozen-sea interface
([section 23](#23-naval-interface-second-part-as-built-pulp_wars-5ti7);
[NAVAL_FACTIONS.md](../art/NAVAL_FACTIONS.md#wired-by-the-frozen-sea-interface-pulp_wars-5ti7)).

## 15. Headless support, measurement, tuning bounds, and balance acceptance

### 15.1 Headless support

The headless CLI and balance matrix count `BOARD` and `FREEZE` in
`commandsByKind` and the new events like any other; the per-seat metrics gain
the telemetry below. The existing `--map-type continents|archipelago` and
the faction letters are unchanged.

### 15.2 Measurement

The project's balance policy stays coarse (small samples, no win-rate
statistics, no band chasing; remove gross imbalances worse than about 70 to
30, dead or dominant units, and blind spots). Because the branch exists only
on water, this check runs on **Continents and Archipelago**, sizes 11 and
14, both seat orders, 150 rounds, about 20 to 40 decided games per opponent,
**before** (`7r35`) and **after**:

- **Ice Folk pairings:** `IH`, `HI`, `IU`, `UI`, `IG`, `GI`, `ID`, `DI`,
  `IM`, `MI`, `IW`, `WI`.
- **Seafaring regression:** `HU`, `UH`, `HG`, `GH`, `HD`, `DH`, `HM`, `MH`,
  `HW`, `WH`.
- **Dry Land parity:** every pairing of the existing Dry Land matrix replays
  the same commands (hashes aside).
- **Telemetry per seat-game:** the round of each Naval technology; units
  trained by role; naval kills and losses by role and cause; rams (shoves,
  blockades lifted), boardings by role and the prize's fate; Submarine kills
  by victim role; Battleship kills before and after; Patrol Boats trained
  before and after; Harbour population. Ice Folk: Freezes, tiles frozen, ice
  tiles owned at each End Turn, melts, slides and slid tiles, slips of
  enemy units, crossings completed (an Ice Folk unit ending a Move on
  another landmass), villages and cities taken off the home landmass, Black
  Ice applications and the Shatters that followed, ships frozen in by role,
  crush damage and kills, Sea Dog.

### 15.3 Tuning bounds

The balance bead may move these within the bounds without root approval,
changing this document, the code, and the tests together. Anything else
needs the root.

| Parameter                                       | Value          | Bounds                       |
| ----------------------------------------------- | -------------- | ---------------------------- |
| Submarine cost / HP / Attack / Defense          | 9 / 12 / 4 / 2 | 8–10 / 10–14 / 3.5–4 / 1.5–2 |
| Ram bonus                                       | +1             | +0.5 to +1                   |
| Boarding divisor (threshold `floor(maxHp / d)`) | 3              | 3 or 4                       |
| Harbours                                        | +1             | 0 or +1                      |
| Ice turns / with Glacier                        | 3 / 5          | 2–4 / 4–6                    |
| Freeze line length                              | 2              | 1–3                          |
| Crush damage                                    | 3              | 2–4                          |
| Witch freeze radius; Ice Folk Sea Dog count     | 1; 3           | fixed                        |

Named levers (each needs the root):

| Lever               | Today                            | Alternative                                           |
| ------------------- | -------------------------------- | ----------------------------------------------------- |
| Submarine mirror    | a torpedo is never answered      | a Submarine answers a torpedo                         |
| Submerged           | every attack needs adjacency     | only against Battleships                              |
| Freeze reach        | the line starts next to the unit | the line may start two tiles away (faster bridges)    |
| Icebound reply      | frozen ships never strike back   | they strike back (weaker counter)                     |
| Black Ice           | on all of the seat's ice         | only on ice in the seat's own territory               |
| Ice Folk transports | none                             | an "ice floe" transport (if crossings prove too slow) |
| Others on ice       | a Move ends on entering ice      | other units slide too                                 |

### 15.4 Balance acceptance

- **No gross imbalance on water:** the Ice Folk win between about 30% and 70%
  of decided games against each faction (both seat orders pooled), and no
  seafaring pairing that was inside 30–70 before leaves it.
- **No stalls, policy errors, or exceptions,** and the round-cap rate of the
  water pairings is not clearly above the before run.
- **Dry Land unchanged** (the parity replay above).
- **Every unit and ability is used:**

  | Unit or ability     | Threshold                                                                                                            |
  | ------------------- | -------------------------------------------------------------------------------------------------------------------- |
  | Seamanship          | researched in at least a third of the seafaring seat-games that researched Shorecraft                                |
  | Ram                 | in at least half of the seat-games with Seamanship                                                                   |
  | Board               | at least once in a fifth of the seat-games with Seamanship                                                           |
  | Submarine           | trained in at least half of the seat-games with Submersibles; a Battleship sunk by one in some games                 |
  | Freeze, slide       | in at least three quarters of the Ice Folk seat-games that researched Rime                                           |
  | Ice crossing        | an Ice Folk village or city taken off the home landmass in at least half of the Archipelago seat-games past round 20 |
  | Black Ice, Icebound | reported; Icebound used in at least a third of the seat-games that have it and saw a hostile ship                    |

- **No unit is dominant:** the Submarine makes at most 40% of a seat's
  kills; Battleship kills per game do not rise; Patrol Boats trained per game
  do not rise.
- **No blind spot:** every seafaring faction sinks at least one Submarine in
  some games and takes an Ice Folk city in some games; the Ice Folk freeze a
  Battleship in some games and lose units to Battleships on the ice in some.

If the gameplay fails these, the bead iterates inside
[section 15.3](#153-tuning-bounds) and the AI, and asks the root before going
outside.

## 16. Test plan

New tests live in `tests/unit/ruleset-v7-naval-branch-*.test.ts` (step I) and
`tests/unit/ruleset-v7-frozen-sea-*.test.ts` (step II) unless noted.

**Step I (`5ti.2`).**

- Identity, prior IDs, save key, rejection of `7r35`; tech ID order and role
  order; the two nodes in all seven trees with prerequisites and costs; Dry
  Land forbids five; mission closure validation; Showcase Submarine tile.
- Ram: the bonus only for a Patrol Boat that moved, at distance 1, on afloat
  non-icebound targets; never on retaliation; the shove in all eight
  directions; every blocking case (edge, land, ice, dock, unit, Deep from
  Shallow, unexplored); a blockader shoved off a dock with the blockade
  events; `ram` and `push` in the preview equal the resolution.
- Board: every legality row in order; a Battleship that moved refused; the
  result fields (owner, orphan, kind and art follow the owner, patched HP,
  kills kept); not a kill; Sea Dog and Muster; a prize on its former owner's
  dock blockades it; the boarded-back case needs a new hit; projection.
- Submarine: registry values per faction; training and the Shipyard price;
  Submerged against every ranged attacker of every faction (refused, never
  offered, absent from threatened tiles) and not against splash, Pierce,
  Sweep, blasts, bombs, Wail; Torpedo targets afloat only and is unanswered;
  retaliation when attacked adjacent; Promotion.
- Harbours: Port 2, Shipyard 3, blockaded 0.
- Parity: Dry Land matches replay command-for-command; headless water
  matches of all factions finish.

**Step II (`5ti.3`).**

- The Ice Folk tree names and unlocks; no naval role offered; parsing
  rejects an Ice Folk ship or embarked unit; no embarking.
- Ice state: parsing rows; view entries and `permanent`.
- Freeze: every legality row; the line (both tiles, stop at a non-freezable
  first tile, stop after a frozen-in ship), the Witch ring; Shallow only
  without Pack Ice; refresh of existing ice; Icebound only with the
  technology; docks never; exact preview.
- Thaw: countdown at the owner's End Turn outside territory only; never in
  territory; held by a land unit of any owner; icebound ships freed; an
  eliminated owner's ice; Glacier's 5.
- Slide: straight slides in all eight directions; stops at the end of the
  ice, a unit (own too), a mound, an unexplored tile, a known ZOC tile; free
  cost; continuation after a slide and chained slides; `SLIDE_FORCED`; the
  Sabretooth walks; interruption by unseen ZOC; Charge after a slide; offered
  endpoints equal accepted Moves.
- Slip: ground units of every other faction stop on entering ice; walkers and
  flyers do not; `ICE_STOPS_MOVE`.
- Ground on ice: landing, Push, Knockback, Charge!, Tractor Beam, advance,
  Beam Down, a bombing-run landing on ice; afloat units never.
- Black Ice: Start Turn order, hostile land units only, the seat's own ice
  only, Chill rules (new freeze, refresh).
- Icebound: no Move, Attack, Board, or retaliation; landing allowed; no
  shove, Push, or pull; not submerged; crush order, Shields, deaths
  (`CRUSHED`, no Grave, Goblin blast), events.
- Glacier: cover, ice turns, Harbours.
- Interactions of [section 10](#10-interactions-with-existing-rules), one
  test per row; Sea Dog for the Ice Folk; the Wreck on ice.
- Showcase with an Ice Folk seat; persistence round trips with a non-empty
  `ice`; parity of matches without an Ice Folk seat with `7rA` apart from
  identity; headless Continents and Archipelago matches of the Ice Folk
  against every faction finish without a policy error or stall (the naval
  plan gated off for them).

## 17. Implementation bead breakdown

Each bead lists its validation profile in the CLAUDE.md format. The root
runs the final gates after review; workers run the focused checks.

**`5ti.2` Engine step I: the shared branch** (identity `7rA`; Seamanship,
Submersibles, Submarine, Ram, Board, Harbours in all seven trees; Dry Land,
missions, Showcase). Depends on this spec's acceptance.

```text
Validation profile: ai/map/persistence
Worker focused checks: npx vitest run tests/unit/ruleset-v7-naval-branch-*.test.ts tests/unit/ruleset-v7-naval-*.test.ts tests/unit/ruleset-v7-revision16-naval.test.ts tests/unit/ruleset-v7-missions.test.ts tests/unit/ruleset-v7-revision18-showcase.test.ts tests/replay ; npm run typecheck ; npm run lint
Conditional final gates: npm run validate:ruleset7-release (with its reviewed refresh: the identity changes); npm run smoke:browser:legacy-v5 (save/schema handling)
```

**`5ti.3` Engine step II: the frozen sea** (identity `7rB`; the Ice Folk
Naval tree, ice, Freeze, slide, slip, thaw, Black Ice, Icebound, Glacier,
no ships, Sea Dog, Wreck, Showcase). Depends on `5ti.2`. From this bead on
an Ice Folk seat must play complete headless water matches without a policy
error or stall: the ordinary naval plan is gated off for it (it never plans
Ports for embarking, transports, or ships), so until `5ti.5` it plays on its
own landmass and Freezes nothing.

```text
Validation profile: ai/map/persistence
Worker focused checks: npx vitest run tests/unit/ruleset-v7-frozen-sea-*.test.ts tests/unit/ruleset-v7-ice-folk-*.test.ts tests/replay ; npm run typecheck ; npm run lint
Conditional final gates: npm run validate:ruleset7-release (reviewed refresh); npm run smoke:browser:legacy-v5
```

**`5ti.4` Normal AI for the seafaring seats** (research, Submarine
training and play, Ram, Board, threat estimates; head-to-head tests).
Depends on `5ti.2`.

```text
Validation profile: ai/map/persistence
Worker focused checks: npx vitest run tests/unit/ruleset-v7-naval-branch-ai*.test.ts tests/unit/ruleset-v7-naval-ai.test.ts ; npm run typecheck ; npm run lint
Conditional final gates: none
```

**`5ti.5` Normal AI for and against the frozen sea** (the ice plan,
builders, crossings, Icebound, home ice; the against rules; head-to-head
tests). Depends on `5ti.3` and `5ti.4`.

```text
Validation profile: ai/map/persistence
Worker focused checks: npx vitest run tests/unit/ruleset-v7-frozen-sea-ai*.test.ts tests/unit/ruleset-v7-ice-folk-ai.test.ts tests/unit/ruleset-v7-naval-ai.test.ts ; npm run typecheck ; npm run lint
Conditional final gates: none
```

**`5ti.6` Art** (six Submarines and the Classic one, portraits, the two ice
tiles, the icebound overlay; [section 14.3](#143-what-the-art-bead-must-draw-bead-5ti6)).
Depends on this spec's acceptance only (it may run before the engine).

```text
Validation profile: asset-only
Worker focused checks: npm run art:validate ; npm test -- tests/unit/*assets*.test.ts tests/unit/unit-scale-contract.test.ts
Conditional final gates: npm run art:chibi-naval-faction-review (extended with the Submarines); npm run art:ruleset6-terrain-review plus the new ice-tile review evidence
```

**`5ti.7` UI** ([section 14.1](#141-surfaces-bead-5ti7)): the five-node
tree, Ram, Board, Submarine, Harbours, ice, Freeze, slide, slip, Icebound,
Black Ice, Help, wired art. Depends on `5ti.3` and `5ti.6`.

```text
Validation profile: ui/presentation
Worker focused checks: npm test -- tests/unit/*presentation*.test.ts tests/unit/*render*.test.ts tests/unit/*ui*.test.ts tests/unit/technology-tree-layout-v6.test.ts ; npm run typecheck ; npm run lint
Conditional final gates: npm run smoke:browser; npm run smoke:naval-browser (a probe that rams, boards, torpedoes, freezes, slides, and crushes on the Showcase)
```

**`5ti.8` Coarse balance on water maps**
([section 15](#15-headless-support-measurement-tuning-bounds-and-balance-acceptance);
a report `docs/validation/RULESET_7_NAVAL_BALANCE.md` and a tuning record
here). Depends on `5ti.5` and `5ti.7`.

```text
Validation profile: ai/map/persistence
Worker focused checks: the matrix runs of section 15.2 (recorded in the report) ; npx vitest run tests/unit/ruleset-v7-naval-branch-*.test.ts tests/unit/ruleset-v7-frozen-sea-*.test.ts
Conditional final gates: npm run validate:ruleset7-release (reviewed refresh, if a number changes and the identity moves)
```

**`5ti.9` Fold** into [Ruleset 7: current rules](RULESET_7_CURRENT.md)
(section 6.2, 11, 12, 13, 14, 16, 21, the identity, the revision history,
known discrepancies; the Ice Folk overlay's section 17.3 marked superseded;
[NAVAL_FACTIONS.md](../art/NAVAL_FACTIONS.md) and
[NORMAL_AI.md](../architecture/NORMAL_AI.md) updated). Depends on `5ti.8`.

```text
Validation profile: docs/tracker
Worker focused checks: npx prettier --check docs/product/RULESET_7_CURRENT.md docs/product/RULESET_7_NAVAL_BRANCH.md docs/art/NAVAL_FACTIONS.md docs/architecture/NORMAL_AI.md
Conditional final gates: none
```

## 18. Decisions made in this spec

Each fills a gap with the simplest rule consistent with the engine; the root
may change any of them.

1. **The fifth-tech shape** is Settlement's: Shorecraft → Navigation → Naval
   Engineering, and Shorecraft → Seamanship → Submersibles. The three
   existing technologies are unchanged.
2. **The new vessel is a Submarine**, not an Ironclad, fireship, or frigate
   ([Appendix A](#appendix-a-draft-critique-redraft), critique 2): it is the
   only candidate that answers the Battleship without becoming the new
   Battleship.
3. **Ram belongs to the Patrol Boat only** and shoves; it never pushes onto
   ice or a dock, never chains.
4. **Boarding is a separate action** at a third of maximum HP, the prize is
   an orphan, its kind follows its new owner, and the prize crew patches it
   to one above the line.
5. **Harbours instead of a Lighthouse building:** the economic reason for
   the Submarine line is a number, not a new improvement.
6. **Sea bonuses** are the ram (+1 Attack) and Submerged; a flat "+1 Defense
   at sea" was rejected as a decision-free number.
7. **No faction tweak for the seafaring factions:** boats keep "no faction
   rule"; Submarine art is per faction, labels are shared.
8. **The Ice Folk have no ships and no transports at all;** all three naval
   roles stay registered without an unlock.
9. **Ice is a stored layer** with an owner and a countdown, permanent in the
   owner's territory, held by land units, never on docks.
10. **Ice Folk slide (forced momentum); every other ground unit slips** (a
    Move ends on entering ice): the Snow and deep-snow asymmetry again.
11. **Freeze is a two-tile line** (the Witch's: her ring), so a bridge
    advances about two tiles a turn and one builder keeps about six standing.
12. **Freeze costs no Coins:** the unit's action is the price.
13. **Icebound ships are frozen solid** (no Move, attack, or reply) and
    crushed for 3; an icebound transport's unit may land.
14. **Black Ice is a Start Turn Chill** (the Cold Aura's place), only on the
    seat's own ice.
15. **Two engine steps with two identities;** the Ice Folk are ordinary
    seafarers for the interim `7rA`.
16. **Sea Dog for the Ice Folk** counts units on ice; **the Wreck** under ice
    is salvaged by a land unit.
17. **A death on ice is a water death** (no Grave or rising).

### 18.1 Questions for the root

1. **No transports for the Ice Folk.** The user said "instead of having
   ships"; this spec reads that as no boats and no embarking at all. If
   crossings prove too slow on Archipelago, the lever is an "ice floe"
   transport. Confirm the reading.
2. **Permanent ice in the Ice Folk territory.** It keeps enemy ships out of
   their home waters for good (and can close a shared bay). Accept, or make
   all ice melt?
3. **The Submarine's Submerged rule** (visible, but attackable only from an
   adjacent tile) is not "attack from hiding"; confirm it fits the standing
   direction.

## 19. Concerns

1. **The Ice Folk on water maps.** Battleships were the top killers on naval
   maps, and the Ice Folk now have none and no transports. Their middle game
   against Battleships before Icebound is the likeliest gross imbalance; the
   levers are named.
2. **The AI carries the Ice Folk.** Without a crossing plan they are stuck on
   their island on Archipelago. The ice plan is the biggest AI work of the
   epic, and the stuck-transport failure of `pulp_wars-9s0.1` warns how a
   naval plan can deadlock.
3. **Forced slides** are new to movement, previews, the query, and every
   reach estimate (threatened tiles, AI routes). They must be one helper
   (`slideEndV7`) used everywhere, with an offered-equals-accepted test.
4. **A new mechanical role** (`SUBMARINE`) touches every faction registration,
   the Showcase, the art registry, Muster, and every "naval" test (24 source
   files name `BATTLESHIP` today).
5. **A new stored list** (`ice`) read by movement, combat, Start and End
   Turn, the view, and the renderer, and changing in the middle of a turn
   (Freeze); never cached across commands.
6. **Ownership transfer by boarding** reuses the Mind Control fields but is
   permanent and changes the kind: the art, labels, and every per-faction
   reader of a ship must follow the owner.
7. **Fixture churn twice** (two identities, two corpus refreshes), then a
   third for balance.
8. **The coarse matrix is on maps whose generation is slower** and whose
   games are longer; the sample stays small by policy.
9. **Humans first, then copies** means five factions share the branch with
   no identity of their own at sea; that is what the user asked, and the art
   carries the difference.

## 20. Engine step I as built (`pulp_wars-5ti.2`)

Engine step I took the identity **`pulp-wars-poc-7r43`** (autosave
`pulpWars.save.v7r43.current`; `7r42` is the last prior identity). The map
revision did not change. What the code does where this document left a
choice, or reads differently:

1. **Eight factions, not seven.** The Candy faction joined after this
   overlay was written. It is a seafaring faction like the other six: same
   technologies, Submarine, Ram, Board, and Harbours, no Candy rule on a
   boat (no Rush, no Crumbs).
2. **Costs.** Tier 3 has cost `9 + 5(C − 1)` since `7r41`
   ([section 2](#2-the-branch-at-a-glance) quotes the older 12): Seamanship
   costs 7 and Submersibles 9 with one city.
3. **An embarked unit never strikes back (ruled).** The worked examples of
   [sections 4.3](#43-worked-examples) and
   [11.2](#112-the-patrol-boat-with-ram) first gave a rammed transport a
   reply of 1 (2 without the ram). The current rules win: an embarked unit
   never retaliates, so the boat takes 0, and both tables now say so; the
   damage dealt (10, or 6 without the ram, and 14 for a torpedo) is as
   stated. Every other worked example of sections 4.3, 5.5, and 11.4 that
   the tests pin holds as written.
4. **The shove's conditions are exactly the list of
   [section 4.1](#41-ram).** The ordinary Push also refuses territory allied
   to the pushed unit; the shove does not. A tile the attacker has not
   explored blocks the shove with `push: "BLOCKED"` (a Juggernaut's Push
   reports `UNKNOWN_BEHIND_FOG` there); the public preview of a ram is
   therefore always `WILL_PUSH` or `BLOCKED`.
5. **Order of the `ATTACK` checks.** After `TARGET_ALLIED`: a torpedo at a
   target that is not afloat is `ATTACK_NOT_LEGAL { reason: "NOT_AFLOAT" }`;
   then the range check, in which a Submarine farther than 1 is
   `TARGET_OUT_OF_RANGE`.
6. **`BOARD`.** The boarder is marked like a unit that used a special
   action (`specialActed` and `handled`); the prize gets the exhausted
   activation of a mind-controlled unit. `TARGET_ALLIED` covers the actor's
   own ships and its allies'. A prize keeps its Promotion (`veteran`, its
   maximum HP) and its kills (ruled), so one with three kills may be
   promoted by its new owner like any unit (a Promotion heals fully). An overrunning unit is refused with `UNIT_ALREADY_ACTED` (no ship
   overruns today).
7. **Harbours in events and previews.** `PORT_BUILT.populationAdded` is 1 or
   2 and `SHIPYARD_BUILT.livePopulationTotal` 2 or 3 (they were the
   constants 1 and 2); the public preview of `BUILD_PORT` reports 2 with the
   viewer's Harbours. A foreign city's population is public as before, so a
   viewer may infer an opponent's Harbours from it; a ship's public
   abilities list `RAM` whatever its owner researched.
8. **Showcase.** Every seat has a Submarine on the Deep Water tile east of
   its Battleship (`dx` 1, `y` 13), homed to the Coast city. Every technology
   is researched there, so the Coast city's Port gives 2 and its Shipyard 3;
   under the ordinary ledger the Coast city is **level 4** (it was 3), with
   the level-4 reward `TREASURY_8` (the North city's).
9. **Missions.** Every registered mission forbids Shorecraft (the four of
   Chapter One and the five test fixtures), and each now forbids all five
   technologies. No mission's initial state changed, so no
   mission revision was bumped.
10. **Threatened tiles.** A tile that holds a visible Submarine of another
    owner counts as threatened by an attacker only from the attacker's
    reachable tiles next to it (a Wail keeps its reach); a Submarine
    threatens explored water tiles only.
11. **Normal AI.** Unchanged apart from counting Submarines as naval units
    for its two-ship training cap. It may research the two technologies,
    train a Submarine, ram by moving and attacking, or pick an offered
    `BOARD` only as its general scoring happens to; the rules of
    [section 13.1](#131-seafaring-seats-bead-5ti4) are `pulp_wars-5ti.4`.
12. **Stand-ins until the art and interface beads.** Until the art bead
    (`pulp_wars-5ti.6`, [section 14.3](#143-what-the-art-bead-must-draw-bead-5ti6),
    "As built") a Submarine drew its faction's Patrol Boat sprite and
    portrait, and Seamanship showed the Patrol Boat and Submersibles the
    Shipyard on their technology cards; since then each has its own art
    (LEGACY keeps the stand-ins). `BOARD` has
    **no control in the interface** until `pulp_wars-5ti.7` aims it on the
    board (one dock button per boardable ship would break
    [the board-targeting rule](../ui/BOARD_TARGETING.md)): the engine offers
    it, the AI and headless play may use it, and a player cannot yet; Ram,
    Submerged, Torpedo, Board, and Harbours have their one-sentence texts in
    the technology cards, recruitment help, and the Gallery. There is no
    ram or torpedo wording in the attack preview, no grappling-hook badge,
    and no shove arrow yet.

## 21. Naval interface, first part, as built (`pulp_wars-5ti.7`)

The interface of engine step I. It changes no rule and no identity. The
frozen sea (ice tiles, Freeze, slides, Icebound, Black Ice, the crush) is
the second part of the bead. Where this differs from
[section 14.1](#141-surfaces-bead-5ti7):

1. **Board is armed, not a per-ship action.** One Board button per ship
   arms it; the prizes are picked on the board in the Attack style, each
   labelled "Take · N HP" from `previewBoardV7`
   ([board targeting section 3.4](../ui/BOARD_TARGETING.md#34-board-the-bow-ram-and-the-submarine-bead-pulp_wars-5ti7)).
   `BOARD` stays out of the dock's command buttons.
2. **Names.** The Patrol Boat's `RAM` is displayed as **Bow Ram**
   (the Goblin Scrap Buggy's Overrun is displayed as "Ram"); the preview
   reads "Bow Ram +1". Shorecraft's note "Board ships at active Ports"
   became "Units embark at active Ports".
3. **Submarine.** "Drawn low in the water" is two code-drawn wave lines
   over the hull and a periscope badge (the raster sprite is the art
   bead's). The reason on a Submarine two or more tiles from a selected
   unit that could attack it is "Submerged: get adjacent".
4. **Effects.** A ram's hit reuses the Charge! star flash and its shove
   the Knockback slide and puff. Boarding has no effect of its own yet:
   the prize changes to its captor's art and colour when the board
   redraws, with the notice "{owner} boarded {former owner}'s {ship}".
   The flag-change effect is left for the second part.
5. **Torpedo.** The note is "No strike-back"; in a match with an Undead
   seat the existing "No retaliation" of every unanswered attack stands
   in its place, so the preview has one line.
6. **Harbours.** The tile dock of an own Port shows its population, an
   active dock "Harbours +1", an own city a "Harbours" row, and the Build
   Port and Build Shipyard buttons the engine preview's population with
   the tooltip "Harbours: +1 population (included)".
7. **Icons.** The Board button, the chips and the board badges are
   code-drawn stand-ins; the technology cards keep the stand-ins of
   [section 20](#20-engine-step-i-as-built-pulp_wars-5ti2) item 12 until
   the art bead registers its subjects.

## 22. Engine step II as built (`pulp_wars-5ti.3`)

Engine step II took the identity **`pulp-wars-poc-7r44`** (autosave
`pulpWars.save.v7r44.current`; `7r43` is the last prior identity). The map
revision did not change. [Section 8](#8-ice-folk-the-frozen-sea) is
implemented as written: the ice list, Freeze, the thaw, the slide, the slip,
Black Ice, Icebound and the crush, Glacier, and an Ice Folk tree with no
ship. What the code does where this document left a choice, or reads
differently:

1. **Shapes.** The command `FREEZE` follows `COLD_SNAP`; the events
   `WATER_FROZEN`, `ICE_MELTED`, and `UNITS_CRUSHED` follow `UNITS_CHILLED`.
   The state has `ice`, the view `ice` with `permanent`. The combat preview
   has `iceCover` and `icebound`. A unit's public stats have `icebound`
   exactly when the match has an Ice Folk seat, and the `iceFolk` block has
   `onIce`, `slides`, and `iceCover`. A match without an Ice Folk seat plays
   the commands of the same setup and seed at `7r43`.
2. **Glacier's cover is the Snow cover of today, × 1.25.**
   [Section 8.10](#810-glacier) quotes × 1.5, the Snow cover when this
   overlay was written; the Snow cover has been × 1.25 since `7r37`, and the
   rule says "the Snow cover". `iceCover` is public on a visible unit, like
   Dig In, so every preview is exact.
3. **Freeze.** The Ice Witch is the role with the Blizzard; her `at` is her
   own tile. `previewFreezeV7(view, unitId, at)` returns
   `{ unitId, tiles, refreshed, icebound }`. The Freezing unit is marked like
   a unit that used a special action. A Freeze by a mind-controlled Ice Folk
   unit makes its controller's ice.
4. **Slide.** A slide starts only on ice that was there, and explored by the
   mover, before the command; it never passes a unit, the mover's own
   included. The movement query offers a destination only where a Move can
   end. **Slip:** a slipping unit that steps onto ice it could not know of
   (a tile it had not explored) stops there and its Move is interrupted with
   reason `ICE`, as for Snow.
5. **Icebound.** An icebound unit projects no ZOC. A Juggernaut's Push, a
   Knockback, a ram's shove, a Charge! push, and a Tractor Beam leave it
   where it is (the Tractor Beam is refused with `TARGET_IMMUNE`). It is not
   rammed and not submerged.
6. **The crush hits every icebound unit on the player's ice,** whoever owns
   the unit, as [section 8.9](#89-icebound-and-the-crush) says literally
   (the Ice Folk freeze only hostile ships, so an own or allied icebound
   ship does not arise in play).
7. **Projection.** `WATER_FROZEN` and `ICE_MELTED` reach a viewer with the
   tiles it has explored and the units it can see, and are dropped when no
   tile is left; `WATER_FROZEN.unitId` is null for a viewer that cannot see
   the Freezing unit. `UNITS_CRUSHED` is projected like the Plague's damage.
8. **Board on Deep Water (a step I fault, fixed here).** A prize's kind
   follows its new owner, so a boarder without Navigation cannot take a ship
   that stands on Deep Water. Step I offered that `BOARD` and then failed on
   it. [Section 4.2](#42-board) row 10 now refuses it, and it is not offered.
9. **Showcase.** An Ice Folk seat has eight units and no ship; the IDs of
   its three boats stay unused, so every other seat keeps its unit IDs. The
   three boat tiles are its ice with 5 turns. Only the tile next to the
   Coast city (`y` 12) is in its territory and permanent; the two at `y` 13
   count down like any ice. Its Coast city has no unit.
10. **Dead parts.** The Ice Folk tree keeps `NAVAL_TRAINING_DISCOUNT`, which
    does nothing for it. The three ship roles stay registered for the Ice
    Folk with their numbers and no unlock. A mission that gives an Ice Folk
    seat a ship is refused by the mission builder.
11. **Normal AI: legal, not clever.** An Ice Folk seat makes no naval plan
    and never picks `FREEZE`, so it does not cross water on purpose; its
    units may walk onto ice as any Move allows. Other seats' threat estimates
    treat ice as ground and ignore the slide. The rules of
    [sections 13.2 and 13.3](#132-the-ice-folk-bead-5ti5) are
    `pulp_wars-5ti.5`.
12. **Stand-ins until the interface bead.** Ice is drawn with the Snow
    overlay over its water, and the tile panel has an "Ice" chip that says
    when it melts. `FREEZE` has **no control in the interface**: the engine
    offers it, headless play may use it, and a player cannot yet. A player's
    Ice Folk units can walk and slide on ice that exists (a Move ends where
    the slide ends), but a player cannot make ice, so in the browser an Ice
    Folk seat cannot cross water until the interface bead. The five
    technology cards carry their names and one sentence each. The Gallery
    shows no ship and no transport for the Ice Folk.

## 23. Naval interface, second part, as built (`pulp_wars-5ti.7`)

The interface of engine step II. It changes no rule and no identity. Where
this differs from [section 14.1](#141-surfaces-bead-5ti7) or
[section 22](#22-engine-step-ii-as-built-pulp_wars-5ti3) item 12:

1. **Freeze has a control.** A line role's one button arms it and the tile
   is picked on the board in the Place style, labelled from
   `previewFreezeV7`; the Ice Witch's one button casts her ring, which is
   marked while she is selected
   ([board targeting section 3.5](../ui/BOARD_TARGETING.md#35-the-frozen-sea-freeze-the-slide-icebound-bead-pulp_wars-5ti7)).
   The label's "N turns" is the unit owner's `iceTurns` and "stays" a tile
   in that owner's territory: the preview carries the tiles, the refreshed
   ones and the ships, not the countdown, so the interface reads those two
   public facts beside it.
2. **Ice is drawn as ice,** not Snow: the two sheets of the art, cut at
   open water and dusted when permanent (`seaIceTileV7`), then code-drawn
   cracks in three stages (a hairline at 3 turns or more, two at 2, three
   wide at 1 or 0).
3. **The slide** is an arrow from the tile the unit steps from to the tile
   it stops on, drawn for every destination reached by a slide (the spec
   asked for the whole path on hover only; the arrow is the path). Tiles
   that cannot be stopped on are not offered (the engine's).
4. **Slip** reads "Ice: your Move ends here" in the dock's legend, and a
   Move interrupted on unknown ice "Ice: the Move ended there".
5. **Icebound** is the pack-ice raster with the Frosted rime and a crush
   pill; the dock text is "Icebound: cannot sail, shoot, board or strike
   back" and the crush chip "−3 HP" with whose Start Turn in its tooltip.
6. **Black Ice** is told on the owner's own ice chip only; other viewers
   see the Frosted marker on their units after the Start Turn.
7. **Glacier's cover** reads "Ice cover" (a chip, the Defense term and the
   attack preview's note); its amount is the Snow cover's.
8. **Cues** are code-drawn: Freeze, melt, crush, and (left from the first
   part) the flag change of a boarded ship. They ride the Ice Folk effect
   step, so reduced motion holds one frame of each.
9. **Technology cards.** The Ice Folk Naval cards show registered ice art
   as stand-ins (`ICE_FOLK_NAVAL_TECH_SUBJECTS_V7`); dedicated icons are
   art work. Freeze has no registered action icon and shows the snowflake
   glyph.
10. **Normal AI.** Unchanged: an Ice Folk seat still never Freezes
    ([section 22](#22-engine-step-ii-as-built-pulp_wars-5ti3) item 11).

## Appendix A. Draft, critique, redraft

### A.1 The first draft

- **Human:** Seamanship (T2): Ram (+1 Attack and shove for every ship) and
  **boarding on the hit**: an attack from distance 1 that left an enemy ship
  at 3 HP or less captured it instead (the Shatter pattern). Ironclads (T3):
  an **Ironclad** (Attack 4, Defense 3, 20 HP, cost 12) whose armour halved
  hits from distance 2 or more, and a **Lighthouse**, a processor building
  that gave +1 population per adjacent Port.
- **Ice Folk:** ice **derived** like Snow: every water tile in Ice Folk
  territory, and every water tile in the Witch's Blizzard (the deferred
  floe); units on water that stopped being ice **drowned**; ice made by the
  Witch **permanent**; Glide (half cost) on ice; a Coin-cost tile command to
  freeze water far from units; no rule for ships on ice.

### A.2 The critique (a skeptical designer)

1. **Boarding on the hit is a one-action capture.** A ram deals a fresh
   Patrol Boat 8 (2 left): boarded at once, no reply. The first to ram wins
   every boat duel by a two-ship swing, and the captured boat is boarded
   back next turn by the same rule: a ping-pong loop the AI would play
   forever.
2. **The Ironclad is either useless or the new T-Rex.** Its armour works
   only at range, but it fights at range 1, where a Battleship shoots it at
   full power: at 12 HP after its first ram it takes 17 and dies, pushed
   away or not. With a damage cap instead (the Steam Tank's Plated), the
   Battleship deals it 5 a hit and it deals 9 to 13: it beats Battleships,
   Patrol Boats, and coasts for 12 Coins. No number between the two makes it
   a counter rather than a replacement.
3. **Ram on every ship** is moot for the Battleship (it cannot attack after
   moving), and on the Ironclad its shove hands a rammed Battleship the
   distance it wants to shoot from. Only the Patrol Boat needs it.
4. **A Lighthouse** is a new improvement kind (art, placement, Redevelop,
   Pillage, the AI economy planner) for an effect a number gives.
5. **Derived ice under moving units** strands them when the Witch walks on;
   the floe's answer (become embarked) is a ship, which the user ruled out,
   and drowning is a hard lock the AI would walk into.
6. **Permanent ice anywhere** lets one Witch seal a strait or an enemy port
   for the rest of the match: a degenerate wall.
7. **Glide on ice** is not a slide; **every faction sliding** would make
   every amphibious move a puzzle the AI cannot read.
8. **Freezing for Coins** double-charges the faction (Coins and a planner
   budget) and lets it build walls far from its units.
9. **Ships on freezing tiles** were undefined: crushed outright (a free kill)
   or ignored (no anti-ship tool).
10. **No anti-ship tool before tier 3** while enemy Patrol Boats harass and
    transports land.
11. **AI blind spots:** the ordinary naval plan would still train boats and
    wait for transports for the Ice Folk; other seats' water routes would
    sail into ice; nobody would avoid landing on enemy ice.
12. **Sea Dog** became unreachable for the Ice Folk (a Monument the others
    can earn); **the Sunken Wreck** became unreachable under ice.
13. **Missions** listing the three Naval technologies fail closure once the
    branch has five.

### A.3 The redraft

| Critique | Change                                                                                                                                                                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | Boarding is a separate action at a third of maximum HP; the prize is patched to one above the line, so retaking it needs a new hit first (it is easier to sink). Watch item and lever: a ram of +0.5 no longer sets up a boarding on its own.                                         |
| 2        | The Ironclad is replaced by the **Submarine**: Submerged (only adjacent attacks) and Torpedo (only afloat targets, unanswered). It sinks Battleships, dies to Patrol Boats, cannot touch land: a clean triangle ([section 11.5](#115-the-triangle-battleship-submarine-patrol-boat)). |
| 3        | Ram is the Patrol Boat's alone.                                                                                                                                                                                                                                                       |
| 4        | Harbours: +1 population per active dock, a number.                                                                                                                                                                                                                                    |
| 5        | Ice is stored with an owner and a countdown; **ice under a land unit never melts**; nobody drowns; afloat units never stand on ice except frozen in.                                                                                                                                  |
| 6        | Ice melts outside its owner's territory (3 turns, Glacier 5), docks never freeze, ice is walkable by everyone ([section 8.12](#812-why-ice-cannot-wall-off-a-sea)).                                                                                                                   |
| 7        | Ice Folk **slide** (forced, straight, free); every other ground unit **slips** (its Move ends on ice), the Snow asymmetry.                                                                                                                                                            |
| 8        | Freeze is a unit's primary action next to it, free of Coins; a two-tile line so bridges keep pace with transports ([section 11.9](#119-freeze-the-bridge-and-the-slide)).                                                                                                             |
| 9        | Freezing a ship needs Icebound (tier 3): frozen solid and crushed for 3 a turn, freed when its ice melts.                                                                                                                                                                             |
| 10       | Home ice (permanent in territory) keeps ships off their cities from Rime on; units on ice trade evenly with Patrol Boats; Black Ice (tier 2) punishes landings; Icebound arrives with the enemy's Battleships.                                                                        |
| 11       | The ice plan replaces the naval plan for the Ice Folk; water routes treat ice as a wall; landings avoid enemy ice ([section 13](#13-normal-ai-requirements)).                                                                                                                         |
| 12       | Sea Dog counts Ice Folk units on ice; a land unit salvages a Wreck under ice.                                                                                                                                                                                                         |
| 13       | Missions add the two IDs; Dry Land reads the branch and needs no change.                                                                                                                                                                                                              |

### A.4 The second critique, and what stayed

- **Ice walls in the Ice Folk's own waters can close a shared bay.** Kept:
  it is their territory, like land; the enemy lands on the ice or takes the
  city. Asked of the root ([section 18.1](#181-questions-for-the-root)).
- **Witch ring plus slide ambushes a fleet.** She must end next to the
  ships, over ice the enemy has seen, and a Battleship kills her with one
  shot (23 on 12 HP) the turn before if it is in reach. Kept as the faction's
  big play; watch item.
- **A Submarine mirror is first strike wins.** Kept; Patrol Boat screens
  decide it; a lever is named.
- **Forced slides confuse players.** The UI draws every slide's end, and a
  tile where no Move can stop is never offered.
- **Bridges of the dead.** A bridge column under a Battleship loses a unit
  and its neighbours' splash every turn. Kept: that is the counterplay, and
  the AI crossing avoids tiles within 3 of a visible Battleship.
- **Black Ice and the sluggish lock.** Re-application never makes a unit
  sluggish twice in a row (the Chill rules), so a unit that stays on the ice
  is frosted, not frozen in place.
- **Boarding by a captured Patrol Boat** uses its new owner's Seamanship
  (its kind follows its owner): consistent.
- **A ram shoves a transport onto Deep Water its owner cannot sail:** never;
  the shove goes onto Deep Water only from Deep Water.
