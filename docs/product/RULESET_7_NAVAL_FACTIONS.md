# Ruleset 7: themed naval branches for every faction (design)

**Status:** design of bead `pulp_wars-5ti.15` (epic `pulp_wars-5ti`),
written on 2026-10-17 over the rules as built at `pulp-wars-poc-7r91`. No
game was played or simulated to write it, by the user's standing rule:
every number is a first guess for hand-play tuning, and the exchanges
quoted were computed by hand with the damage formula of
[current rules section 13.2](RULESET_7_CURRENT.md#132-damage) (a scratch
port, kept out of the repository, that reproduces the published naval
examples: Battleship on Patrol Boat 16, torpedo on Battleship 10, Ram on
Battleship 7 and 7). Nothing here is built yet; each faction is built by
its own bead ([section 13](#13-implementation-order-and-beads)), one at a
time. Until a faction's bead lands, [section 14 of the current
rules](RULESET_7_CURRENT.md#14-naval-rules) is right for it.

The user's request, 2026-10-17: "tweak the naval branch of the tech tree
for factions other than humans. you can treat the current one as a
baseline and modify it for each faction according to their theme. The main
thing is that the units should fill the same roles - transporting land
based units, helping with combat on the coast, naval combat but the units
can be different but don't have to. do it one faction at a time and make
sure the AI knows how to use them."

Standing rulings that shaped it: beta first, then balance (no balance
simulation now); keep situational overpowered combos and avoid only an
always-winning faction or a roster with one obviously best unit; the
economy is driven by unit attrition (no new Coin sink); gate by technology
rather than nerf; targets are picked on the board.

Attack and Defense are in whole units; the code stores half-units
(`attack2`, `defense2`).

## The decisions to look at first

Each can be overruled without unpicking the rest.

1. **The skeleton stays; the flesh changes.** Every faction keeps the five
   technology IDs, their tiers, prerequisites, prices, and every economic
   unlock (Fish, Port, sea links, Pearls, Shipyard and its discount,
   Harbours), and the three ship roles `PATROL_BOAT`, `BATTLESHIP`, and
   `SUBMARINE` with their tactical labels. What changes is each faction's
   ship names, numbers, and abilities, the display names of its five
   technologies, and the second trick of its Seamanship. The Normal AI,
   which reads ships by role and through exact previews, therefore keeps
   working for every faction before any faction-specific rule is added.
2. **Seamanship is "the Ram plus one trick".** For the Humans the trick is
   Board. The Dinosaurs keep Board too; the other six trade it for their
   own trick (Goblin Powder Kegs, Undead Drowned Crews, Martian Hover Pods,
   Dwarf Sea Tunnels, Candy Sugar Sails, Cult Offerings to the Deep), so the
   tier-2 node stays about as strong as the Human one. Every seafaring
   faction keeps a Ram: it is what lets Patrol Boats hunt Submarines, the
   triangle the branch was built on.
3. **Two faction mechanics at most, and mostly reused ones.** Each faction
   gets one or two rule changes, chosen where an existing engine mechanic
   (Kaboom, death blasts, Infect, Plague, growth, Shields, Armoured, the
   Tunnel, Splat, Sugar Rush, Drag, Favour) can be pointed at water with a
   small gate change. The new code per faction is a gate, a role mechanic,
   or one small rule.
4. **Two sea beasts.** The Dinosaur Submarine becomes a living
   **Plesiosaur** that grows, and the Cult Submarine a **Kraken** that
   Drags. This overrules the art decision of `pulp_wars-5ti.6` that the
   Dinosaur submarine is "a log, not an animal": that decision was about a
   boat that looked like a turtle; a real sea reptile is now the point. A
   sea beast is never boarded.
5. **The Ice Folk are done.** Their frozen sea already covers the three
   roles without ships (a bridge instead of a transport, Black Ice and the
   slide for the coast, Icebound for the sea fight). Nothing is changed for
   them; [section 11](#11-ice-folk-done) says why and notes how the new
   ships meet their ice.
6. **Order: Goblins, Undead, Dinosaurs, Martians, Dwarves, Candy, Cult**,
   one bead each, engine, AI, interface, and art together, each with its
   own ruleset identity. The Goblin bead also carries the shared plumbing
   of [section 2](#2-shared-rules-for-every-faction-branch).

## 1. The baseline: the Human naval branch as coded

From `ORIGINAL_BASELINE_V5_NODES` and `ORIGINAL_ROLE_RULES_V7` in
`src/engine/rules/ruleset-v7.ts`, the naval code in `src/engine/v7`, and
[current rules section 14](RULESET_7_CURRENT.md#14-naval-rules). Research
costs `5 / 6 / 7` Coins for tier 1 / 2 / 3 plus `1 / 2 / 3` for each city
beyond the first ([section 6.1](RULESET_7_CURRENT.md#61-research-cost)).

### 1.1 The five technologies

| Tier | ID                  | Shown as     | Requires   | Unlocks                                                                                                       |
| ---: | ------------------- | ------------ | ---------- | ------------------------------------------------------------------------------------------------------------- |
|    1 | `SHORECRAFT`        | Sailing      | —          | Harvest Fish; Build Port; embarking and Shallow Water; Patrol Boat; sea links                                 |
|    2 | `NAVIGATION`        | Navigation   | Sailing    | Deep Water; Gather Pearls (12 Coins for 2); sea links over Deep Water                                         |
|    3 | `NAVAL_ENGINEERING` | Shipbuilding | Navigation | Battleship; Shipyard; naval training 2 Coins cheaper at a Shipyard                                            |
|    2 | `SEAMANSHIP`        | Boarding     | Sailing    | the Ram (unlock `RAM`, capability `ram`); `BOARD` (capability `boarding`)                                     |
|    3 | `SUBMERSIBLES`      | Submersibles | Boarding   | Submarine; Harbours (+1 population on every active Port and Shipyard; unlock `HARBOURS`, `harbourPopulation`) |

### 1.2 The units

| Unit                 | Role          | Tech         | Cost (Shipyard) |  HP | Attack | Defense | Move | Range | Sight | Attack after Move | Abilities              |
| -------------------- | ------------- | ------------ | --------------: | --: | -----: | ------: | ---: | ----: | ----: | ----------------- | ---------------------- |
| Patrol Boat          | `PATROL_BOAT` | Sailing      |           5 (3) |  10 |  2 (4) |   2 (4) |    2 |     1 |     2 | yes               | Ram (with Boarding)    |
| Battleship           | `BATTLESHIP`  | Shipbuilding |         16 (14) |  25 | 5 (10) |   3 (6) |    2 |   1–3 |     3 | no                | splash (hostile only)  |
| Submarine            | `SUBMARINE`   | Submersibles |           9 (7) |  12 |  4 (8) |   2 (4) |    2 |     1 |     2 | yes               | Submerged; Torpedo     |
| transport (any unit) | form EMBARKED | Sailing      |     (a Port, 4) | own |   none |       1 |    2 |     — |     1 | —                 | lands with `DISEMBARK` |

Ships are trained with `TRAIN_NAVAL` at an active, empty dock, use one
slot, take the ordinary Promotion, recover 4 on or next to an own active
dock, project ZOC onto water, blockade a hostile dock, and cannot capture,
embark, pillage, disband, push (but for the Ram's shove), or advance.

### 1.3 The abilities

- **Ram** (shown as Bow Ram). A Patrol Boat that moved this turn attacking
  an adjacent unit afloat gets +1 Attack (`RAM_BONUS2_V7` 2), and a target
  that survives is shoved one tile straight back onto free open water
  ([section 14.1](RULESET_7_CURRENT.md#141-the-ram-bow-ram)).
- **Board.** `BOARD`, a primary action of any ship next to a hostile ship
  at a third of its HP or less: the prize changes owner at
  `floor(maxHp / 3) + 1` HP, orphaned, and its kind follows its new owner
  ([section 14.2](RULESET_7_CURRENT.md#142-board)).
- **Submerged.** A Submarine can be attacked only from an adjacent tile.
- **Torpedo.** A Submarine attacks only units afloat, and they never strike
  back ([section 14.3](RULESET_7_CURRENT.md#143-the-submarine-submerged-and-torpedo)).
- **Harbours.** +1 live population on every active own dock.
- **Transport.** A land unit that ends a Move on an own active empty dock
  embarks (exhausted); afloat it has Move 2, Defense 1, Sight 1, no attack
  and no retaliation; it lands on an adjacent land tile while it has spent
  at most one point. Martian machines and Dwarf Gyrocopters self-launch
  where a Move ends on water.

### 1.4 The three roles

| Role                    | What does it                                                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Transport of land units | the embarked transport (a Port, Sailing); the Patrol Boat escorts it and the Ram shoves an enemy one away from the coast          |
| Coastal support         | the Battleship: shells the coast from 2 or 3 tiles with splash, sinks transports, and lifts or makes blockades                    |
| Naval combat            | a triangle: the Battleship outguns Patrol Boats at range, the Submarine sinks Battleships unanswered, rams hunt Submarines; Board |

### 1.5 The exchanges every faction section compares against

Full HP, open water, attacker first, "dealt; taken" (a hit that sinks is
capped at the target's HP):

| Exchange                            | Result            |
| ----------------------------------- | ----------------- |
| Patrol Boat rams a Patrol Boat      | 8; 4              |
| Patrol Boat rams a Submarine        | 8; 4              |
| Patrol Boat rams a Battleship       | 7; 7              |
| Patrol Boat rams a transport        | 10; 0             |
| Battleship on a Patrol Boat         | 16 (sunk); 0      |
| Battleship on a Battleship          | 14; 5             |
| Battleship on a Fighter or a Guard  | 12 (sunk) / 14; 5 |
| Submarine torpedoes a Battleship    | 10; 0             |
| a second torpedo on that Battleship | 12 (3 left)       |
| Submarine torpedoes a Patrol Boat   | 12 (sunk); 0      |
| Submarine torpedoes a Submarine     | 12 (sunk); 0      |

## 2. Shared rules for every faction branch

These land with the first faction bead (the Goblins) and hold for every
later one.

1. **Per-faction ship rules.** Each seafaring faction's role table defines
   its own `PATROL_BOAT`, `BATTLESHIP`, and `SUBMARINE` rule (label, cost,
   numbers, abilities) instead of copying `ORIGINAL_ROLE_RULES_V7`; its role
   mechanics table carries their mechanics. A faction whose section changes
   nothing for a role keeps the Human numbers for it. The tactical labels
   (`NAVAL_SCREEN`, `NAVAL_CAPITAL`, `NAVAL_HUNTER`) never change.
2. **Per-faction Seamanship.** A faction's naval nodes are built from the
   shared ones with an override of the `SEAMANSHIP` unlocks (the pattern of
   `ICE_FOLK_NAVAL_UNLOCKS_V7`): `RAM` always, then `COMMAND BOARD` (Humans,
   Dinosaurs) or the faction's trick unlock. Every trick is read through a
   capability of `technologyCapabilitiesV7`, never through a raw technology
   test, and through `unitCapabilitiesV7` for a unit (a mind-controlled unit
   reads its own kind's tree with its controller's research, as everywhere).
3. **Display names.** Each faction gets its own names for the five naval
   technologies in `TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7` (tables below).
   As for the other branches, a technology that unlocks a unit is named
   after it and shows its portrait; Navigation keeps its shared name.
4. **"No faction rule applies to a boat" is replaced** by: a faction rule
   applies to a ship only where that faction's section below says so. The
   faction bullets of [current rules section 14](RULESET_7_CURRENT.md#14-naval-rules)
   ("Goblin boats", "Dinosaur boats", …) are rewritten by each bead.
5. **A prize under its new flag.** Board keeps its rule, with one change
   for rosters that now differ: the prize's maximum HP becomes its new
   kind's role maximum (plus `PROMOTION_HP_V7` if it is a veteran), and its
   HP `floor(newMax / 3) + 1`. Every other kept field stays (ID, role,
   kills, veteran, tile, statuses). A prize whose new kind has no Shield
   loses its Shield entry; one whose new kind has a Shield gets it at the
   next recharge. Where every roster is the Human one this is today's rule.
6. **Sea beasts.** A role whose mechanics have `seaBeast` (the Dinosaur
   Plesiosaur, the Cult Kraken) is never a `BOARD` target
   (`BOARD_NOT_LEGAL { reason: "TARGET_IMMUNE" }`), and a seat whose own
   `SUBMARINE` role is a sea beast never boards a `SUBMARINE`-role ship
   (the same rejection): a beast has no crew to take and a captured hull
   cannot turn into an animal. Ability literal `SEA_BEAST` for the info
   panel ("A living beast: it cannot be boarded").
7. **Unchanged for everyone:** the dock, embarking and landing, blockades,
   naval recovery, Sea Dog and Muster (they count roles), sea links, the
   Shipyard discount (minimum 1), Arms Industry never applying to ships,
   missions and Dry Land (all five naval technologies stay forbidden
   together), and the Ice Folk rules of the frozen sea (Icebound freezes
   any unit afloat: a Plesiosaur and a Kraken too).
8. **Help text.** Every new ability gets one plain sentence in
   `src/render/unit-glossary-v7.ts` and on its technology card (no
   formulas), given in each faction section.

## 3. Goblins: the Scrap Fleet

**Theme.** A reckless horde: cheap, flimsy boats crewed by goblins who
would rather blow a ship up than take it. Goblins build more hulls and
lose more of them, which is what drives their economy.

### 3.1 Technologies

| ID                  | Goblin name    | Goblin unlocks (difference from the Human node in bold)                      |
| ------------------- | -------------- | ---------------------------------------------------------------------------- |
| `SHORECRAFT`        | Fire Rafts     | as Sailing; the Patrol Boat is the **Fire Raft**                             |
| `NAVIGATION`        | Navigation     | as Navigation                                                                |
| `NAVAL_ENGINEERING` | Dreadnoughts   | as Shipbuilding; the Battleship is the **Scrap Dreadnought**                 |
| `SEAMANSHIP`        | Powder Kegs    | Ram; **Fire Rafts may Kaboom afloat** (unlock `FIRE_RAFTS`) instead of Board |
| `SUBMERSIBLES`      | Diving Barrels | as Submersibles; the Submarine is the **Diving Barrel**                      |

### 3.2 Units

| Unit              | Human counterpart | Cost (Shipyard) |     HP | Attack | Defense | Move | Range | Abilities                                            |
| ----------------- | ----------------- | --------------: | -----: | -----: | ------: | ---: | ----: | ---------------------------------------------------- |
| Fire Raft         | Patrol Boat       |       **4** (2) |  **8** |  2 (4) |   2 (4) |    2 |     1 | Ram; **Kaboom 5 afloat** (Powder Kegs)               |
| Scrap Dreadnought | Battleship        |         16 (14) |     25 | 5 (10) |   3 (6) |    2 |   1–3 | splash; **death blast 7**                            |
| Diving Barrel     | Submarine         |       **8** (6) | **10** |  4 (8) |   2 (4) |    2 |     1 | Submerged; Torpedo                                   |
| transport         | transport         |               — |      — |      — |       1 |    2 |     — | unchanged (a goblin raft); Gang Up already counts it |

### 3.3 Mechanics

**G1. Fire Raft Kaboom** ("A Fire Raft can blow itself up, hitting every
unit around it for 5").

- Who: a unit in `NAVAL` form whose role, under its kind, has `KABOOM`
  (the Goblin `PATROL_BOAT`, mechanics `kaboomDamage: 5`,
  `deathBlastDamage: null`), whose kind's capabilities under its owner have
  `fireRafts` (Powder Kegs).
- Legality: the Kaboom table of
  [section 18.4](RULESET_7_CURRENT.md#184-kaboom) with row "in land form"
  read as "in land form, or in `NAVAL` form with `fireRafts`". A Fire Raft
  without Powder Kegs is refused `TECH_REQUIRED { tech: "SEAMANSHIP" }` and
  never offered; an icebound one `KABOOM_NOT_LEGAL { reason: "ICEBOUND" }`;
  an embarked unit keeps `EMBARKED`. It may Kaboom after moving, not after
  an attack (no Crash).
- Result: the ordinary Kaboom on the raft's water tile (3 × 3 area, every
  other unit of any owner and form, own and allied included; fixed 5, a
  Shield absorbing first; Field Defense on land tiles in the area
  destroyed; chains). No Grave (a death afloat). Credit and Plunder as for
  every Kaboom (blast kills of hostile units pay Plunder). `KABOOM` is
  already on the blockade-event list.
- A Fire Raft killed does not explode: only its Kaboom does.

**G2. The Dreadnought's death blast** ("When the Dreadnought sinks it
explodes, hitting every unit around it for 7").

- The Goblin `BATTLESHIP` has `deathBlastDamage: 7` (the Rocket Cart's and
  the Scrap Buggy's). It explodes when it is killed by any cause of
  [section 18.5](RULESET_7_CURRENT.md#185-death-blasts) (attack, torpedo,
  retaliation, splash, blast, Wail, Plague, bomb), on its water tile, with
  the ordinary blast resolution. Exceptions: a **boarded** Dreadnought is
  not killed and never explodes (the prize is its captor's Battleship and
  has no blast), and a Dreadnought **crushed** by Ice Folk ice sinks
  quietly (the crush is a Start Turn step outside the blast chain, as a
  Shatter is).
- The engine already explodes a unit killed afloat; the bead verifies the
  naval-form paths (attacker death, defender death, splash death) and adds
  the tests.

### 3.4 Worked examples

| Exchange                                                                          | Result                                                    |
| --------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Fire Raft rams a Patrol Boat                                                      | 8; 4 (as the Human boat; the raft has 4 left of 8)        |
| Patrol Boat rams a Fire Raft                                                      | 8: sunk                                                   |
| Battleship on a Fire Raft                                                         | sunk                                                      |
| Fire Raft Kabooms beside a Battleship and two transports                          | 5 to each (and to every own unit there); the raft is gone |
| three Fire Rafts (12 Coins), not beside one another, Kaboom around one Battleship | 15 of 25                                                  |
| Diving Barrel torpedoes a Battleship                                              | 10; 0 (as the Human Submarine)                            |
| Submarine torpedoes a Diving Barrel                                               | sunk                                                      |
| Submarine finishes a Dreadnought at 9 HP from the next tile                       | sunk; the Submarine takes 7 (5 of 12 left)                |
| a Human ship boards that Dreadnought at 8 HP instead                              | it is the Human's Battleship at 9 HP; nothing explodes    |

### 3.5 Balance

- **No runaway.** Every Goblin hull is cheaper and weaker: the Fire Raft
  and the Diving Barrel die to one hit of anything bigger, and the Kaboom
  spends the raft. Three Kabooms do not sink a fresh Battleship, and the
  Battleship sinks one raft a turn from three tiles away before they arrive
  (Move 2).
- **The counter exists.** Against rafts: range (the Battleship), screens
  (rafts must reach the next tile), and spreading out (the blast is 3 × 3).
  Against the Dreadnought: kill it from two or three tiles, or board it
  (the Humans and Dinosaurs), or accept 7 on the finishing Submarine.
- **Situational blowout, kept:** a raft that reaches a packed landing fleet
  hits every transport at once. It is the Goblin crowd-control fantasy on
  water.

### 3.6 Normal AI

Beyond `src/ai/v7-naval.ts` and `src/ai/v7-goblin.ts`:

- **Kaboom afloat.** The Kaboom scorer (the existing `previewKaboomV7` and
  `explosionChainValueV7` path, which is exact) also scores an own Fire
  Raft's offered `KABOOM`: taken when its value (Coins of hostile units
  killed plus the damaged share of the hit ones, less friendly fire and the
  raft's own 4) is at least `KABOOM_CHIP_MARGIN_V7`, when it kills, or when
  the raft is doomed (the threat estimate on it is at least its HP) and the
  blast hits any hostile unit.
- **Raft approach.** As the Ram approach (`navalRamApproachV7`): a Fire
  Raft that has not acted compares, over its offered Move destinations, the
  hypothetical blast there (`hypotheticalBlastV7`) with its best Ram, and
  moves first when the blast is worth more. It never moves next to an own
  Dreadnought to blast it.
- **The Dreadnought, from both sides.** Any attack on a hostile exploding
  ship from the next tile is scored with the attacker's blast damage
  (`previewAttackExplosionsV7`), the torpedo priority included; the Board
  scorer already prefers a capital prize, which now also spares the blast.
  An own Dreadnought is not kept beside own ships when a hostile Submarine
  is in reach (the screen rule accepts any free own boat but the raft).
- **Research.** Powder Kegs uses the Seamanship rule as it is (the
  capability `ram` gates the seafaring tree).

Tests on hand-built states (`tests/unit/ruleset-v7-naval-goblin-ai.test.ts`):
a Fire Raft beside a hostile Battleship and a transport Kabooms rather than
rams; without Powder Kegs no Kaboom is offered or chosen; a raft two tiles
from a cluster moves and Kabooms; a raft whose blast would hit an own
Dreadnought and one Patrol Boat rams instead; a Human Patrol Boat boards a
9-HP Dreadnought rather than a Submarine finishing it from the next tile;
a doomed raft with one hostile neighbour Kabooms.

### 3.7 Art and sound

- **Fire Raft:** a new map sprite and portrait, edits of the accepted
  Goblin Patrol Boat (`naval-goblin`): the same scrap junk-boat with two
  hazard-striped powder kegs on deck and a lit fuse. Diving Barrel and
  Scrap Dreadnought keep the accepted Goblin Submarine and Battleship (the
  barrel already is one).
- **Icons:** Powder Kegs (a keg with a fuse); the other four show the unit
  portraits or the shared icons.
- **Effects and sound:** the Kaboom effect and its explosion cue on water
  with the existing splash layer; no new clip.

### 3.8 As built (`pulp_wars-5ti.16`, `pulp-wars-poc-7r92`)

Built as above, with the shared plumbing of section 2, at identity `7r92`
(`7r91` is a prior identity; the autosave key is
`pulpWars.save.v7r92.current`). Every row of 3.2 is a registry value and
every row of 3.4 an exact preview or result in
`tests/unit/ruleset-v7-naval-goblin.test.ts`; the AI scenarios of 3.6 are
`tests/unit/ruleset-v7-naval-goblin-ai.test.ts`. Where the build is more
precise than the text above:

- **Shared plumbing.** `withSeamanshipUnlocksV7(nodes, trick)` builds a
  faction's Seamanship (`RAM` then the trick); the Goblin trick is
  `FIRE_RAFTS` (capability `fireRafts`); every other seafaring tree keeps
  `COMMAND BOARD` until its bead. The prize rule is `boardedPrizeHpV7`
  (reducer and `previewBoardV7`); the sea-beast rule is the role mechanic
  `seaBeast` (false everywhere) read by `boardSeaBeastBlockedV7`, passed
  to the shared `boardTargetBlockV7` as its last argument; the ability
  literal `SEA_BEAST` and its glossary entry exist with no user.
- **The Kaboom gate** is `kaboomFormBlockV7`, shared by the reducer and the
  public command query: land form passes; `EMBARKED` stays; a ship without
  `fireRafts` is `TECH_REQUIRED { tech: "SEAMANSHIP" }`; an icebound ship
  is `KABOOM_NOT_LEGAL { reason: "ICEBOUND" }` (in that order).
- **The crush.** The engine did run the death-blast chain for units the
  ice crushes (an embarked exploding unit explodes with its raft, as
  current rules section 21.16 says), so "the crush is outside the blast
  chain" was not true of the code. The decision stands and is built as an
  explicit exception: a crushed unit in `NAVAL` form never explodes, an
  embarked one still does.
- **Death causes tested:** a torpedo (defender), retaliation (attacker),
  Battleship splash, a blast chain from a Fire Raft's Kaboom, Wail, and
  Plague at the owner's Start Turn; none when boarded or crushed. A Dwarf
  bomb runs through the same shared chain and is not tested separately.
- **The AI test of the Board** uses a Dreadnought at 8 HP (its boarding
  line): at 9 HP it cannot be boarded, so "a 9-HP Dreadnought" above means
  the 3.4 example's Dreadnought after one more hit.
- **Kaboom afloat (AI).** Values are tenths of a Coin; the friendly fire
  counts twice (`FRIENDLY_FIRE_TRADE_FACTOR_V7`, as every Goblin blast); a
  taken Kaboom has priority 1349 (above every ordinary attack, below a kill
  that clears a center and Board), except when the raft's best attack
  kills and is worth more. The approach Move has priority 1277. The
  threat estimate counts a hostile Fire Raft's Kaboom (Powder Kegs is
  private, so it is assumed, as the Ram is).
- **The Dreadnought from both sides (AI).** `navalAttackBlastOnAttackerV7`
  reads the blast an attack's kill sets off on the attacker; the torpedo
  priority is withheld when it would sink the Submarine, and the Ram
  approach and the Board scorer's best attack count it. The crowd rule is
  `navalDreadnoughtCrowdRejectedV7` (a Move refused, not only valued); the
  screen rule skips a boat with `KABOOM` beside a ship with a death blast.
- **Text.** The glossary keeps one `KABOOM` entry for every goblin-crewed
  unit, the Fire Raft included (two entries named "Kaboom!" would break
  the one-name-one-mechanic rule; the Powder Kegs card and the raft's
  Kaboom! button say it needs the technology), and adds `SINKS_EXPLODING`
  for the Dreadnought; the Goblin Help has an "At sea" line; the
  Shipbuilding, Submersibles, and Bow Ram card lines name each faction's
  own ships (the Submersibles note now says "the next tile", so the
  Diving Barrel's line fits the card), and the Powder Kegs card says the
  Kaboom sentence.
- **Art.** The Fire Raft's sprite and portrait are redrawn in place (same
  asset IDs and subjects, new subject keys `…/FIRE_RAFT`); the Fire Rafts
  card shows its portrait, Diving Barrels the Barrel's portrait, and
  Powder Kegs its own icon (`ICON:TECH:GOBLIN:SEAMANSHIP`,
  `chibi-naval-goblin-icon-tech-seamanship`, batch `naval-goblin`), which
  falls back to the shared wheel. No new sound.

## 4. Undead: the Drowned Fleet

**Theme.** Attrition: what the Undead sink comes back up as theirs, and
their capital ships carry the plague to the coast.

### 4.1 Technologies

| ID                  | Undead name     | Undead unlocks (difference in bold)                              |
| ------------------- | --------------- | ---------------------------------------------------------------- |
| `SHORECRAFT`        | Ghost Ships     | as Sailing; the Patrol Boat is the **Ghost Ship**                |
| `NAVIGATION`        | Navigation      | as Navigation                                                    |
| `NAVAL_ENGINEERING` | Plague Galleons | as Shipbuilding; the Battleship is the **Plague Galleon**        |
| `SEAMANSHIP`        | Drowned Crews   | Ram; **Drowned Crews** (unlock `DROWNED_CREWS`) instead of Board |
| `SUBMERSIBLES`      | Sunken Galleys  | as Submersibles; the Submarine is the **Sunken Galley**          |

### 4.2 Units

All three have the Human numbers.

| Unit           | Human counterpart | Cost (Shipyard) |  HP | Attack | Defense | Abilities                                          |
| -------------- | ----------------- | --------------: | --: | -----: | ------: | -------------------------------------------------- |
| Ghost Ship     | Patrol Boat       |           5 (3) |  10 |      2 |       2 | Ram; Drowned Crew (Drowned Crews)                  |
| Plague Galleon | Battleship        |         16 (14) |  25 |      5 |       3 | splash; **Plague** (with Pestilence); Drowned Crew |
| Sunken Galley  | Submarine         |           9 (7) |  12 |      4 |       2 | Submerged; Torpedo; Drowned Crew                   |

### 4.3 Mechanics

**U1. Drowned Crews** ("A ship your ships sink rises as your Ghost Ship").

- When a unit in `NAVAL` form hostile to an Undead seat is killed by the
  `ATTACK` or the retaliation of a unit of that seat in `NAVAL` form whose
  kind's capabilities under its owner have `drownedCrews`, it rises at once
  on its tile as a **Ghost Ship** of the killer's owner: the Undead
  `PATROL_BOAT` at `DROWNED_CREW_HP_V7` **5** HP (of 10), `homeCityId` null
  (an orphan: no slot, never re-homed), `captureEligible` false, the
  exhausted activation, no kills, not a veteran, a new unit ID.
- Never from splash, a blast, Wail, Plague, a bomb, the ice crush, or a
  Tentacle; never from a transport (an embarked victim is a land unit and
  drowns); never on an ice tile; never on Deep Water while the Undead seat
  lacks Navigation (no seat owns a ship it could not sail).
- It is the Infect step of [section 17.6](RULESET_7_CURRENT.md#176-infect)
  pointed at the sea: the killer keeps the kill credit, the rising is
  reported with `UNIT_INFECTED`, and the preview carries
  `defenderInfected` (or `attackerInfected` for a retaliation kill). Like
  Infect it needs no free slot. Ability literal `DROWNED_CREW` on the three
  Undead ships.
- The Undead Seamanship has no `BOARD`; other seats may still board an
  Undead ship.

**U2. The Plague Galleon** ("With Pestilence, the Galleon's shot plagues
whoever it hits").

- The Undead `BATTLESHIP` has the `PLAGUE` ability. With Pestilence (the
  Undead `EXPLOSIVES`, capability `plague`) its attack plagues the primary
  target and every surviving living splash victim exactly as a Lich's does
  ([section 17.8](RULESET_7_CURRENT.md#178-plague)): 2 a Start Turn for
  three turns, one spread. Nothing else changes: range 1–3, no attack after
  moving, hostile-only splash.
- A Galleon boarded by another seat is that seat's Battleship: it plagues
  no more, and the Plagues it gave end at once (`PLAGUE_CLEARED`, as when
  their source leaves the board; `pulp_wars-2yc.97`).
- Data only: `attackPlaguesV7` reads the ability and the capability for
  any role.

### 4.4 Worked examples

| Exchange                                                       | Result                                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Sunken Galley torpedoes a Patrol Boat                          | sunk; a 5-HP Ghost Ship rises on its tile                                                        |
| Ghost Ship finishes a Patrol Boat that a Ram left at 2 HP      | sunk; a second Ghost Ship rises                                                                  |
| Patrol Boat attacks a risen 5-HP Ghost Ship                    | 5: sunk                                                                                          |
| Plague Galleon (Pestilence) shells a Guard beside two Fighters | 14 to the Guard (3 left), splash to both; all three plagued (up to 6 more each over three turns) |
| a Galleon sinks a Battleship                                   | a 5-HP Ghost Ship rises: the crew, not the hull                                                  |

### 4.5 Balance

- **No runaway.** A rising needs a kill of a ship by a ship and gives a
  Patrol Boat at half HP whatever was sunk; any boat's plain attack sinks
  it. It is weaker than Board (which takes the Battleship itself) against
  capital ships and stronger against boats, which suits attrition.
- **Counters.** Kill Undead ships first and from range (the Battleship, a
  Gyrocopter bomb); keep boats out of torpedo reach; a Captain, Shaman, or
  any Tend cures Plague; a Martian Shield that takes a whole hit blocks
  Plague. The Plague Galleon needs two tier-3 technologies (Plague
  Galleons and Pestilence), gated by technology, not nerfed.
- **Lever** if hand-play shows ghost fleets snowballing:
  `DROWNED_CREW_HP_V7` 4, or risings from Patrol Boat and Submarine kills
  only.

### 4.6 Normal AI

- **The rising's value.** An attack of an own ship whose preview says
  `defenderInfected` (or a retaliation kill that does) is worth the
  Ghost Ship as well: half the Patrol Boat's cost, times the Board
  scorer's safe or doomed factor for the risen ship's tile. The ram
  approach, the torpedo targets, and the Battleship station add it, so a
  Sunken Galley takes the Patrol Boat kill (5 + 2.5 Coins) over a
  non-lethal torpedo on a Battleship (6.4) when no other Submarine follows.
- **Ghost Ships at 5 HP** are ordinary own Patrol Boats for the fleet
  facts; the existing naval recovery (to an own dock) and screens use them.
- **Plague Galleon.** The plague value of the attack scorer
  (`plagueApplicationValueV7`, read from `preview.plagued`) is applied to
  every attacker whose preview plagues, not only to `isLichV7` units, and
  the Battleship station counts unplagued living hostile units in the
  splash cluster. Pestilence is asked for once the seat owns a unit whose
  role has `PLAGUE` (a Lich or a Galleon).
- **Research.** Drowned Crews by the Seamanship rule as it is.

Tests (`tests/unit/ruleset-v7-naval-undead-ai.test.ts`): a Sunken Galley
that can sink a Patrol Boat or chip a Battleship sinks the boat; the same
without Drowned Crews torpedoes the Battleship; a Galleon with Pestilence
picks the station whose cluster holds more unplagued units; Pestilence is
researched before Navigation by a seat that owns a Galleon and no Lich;
no `BOARD` is offered to an Undead ship.

### 4.7 Art and sound

- No new unit art: the Ghost Ship, Plague Galleon, and Sunken Galley are
  the accepted Undead Patrol Boat, Battleship, and Submarine (ghost ship,
  ghost galleon, drowned galley) under new labels.
- **Effects:** the rising is the Infect effect drawn on water (violet mist
  over the wreck); the plague mark is the existing one.
- **Icons:** Drowned Crews (a skeletal hand on a ship's wheel).
- **Sound:** the existing rising and Plague cues; no new clip.

### 4.8 As built (`pulp_wars-5ti.17`, `pulp-wars-poc-7r93`)

Built as above at identity `7r93` (`7r92` is a prior identity; the
autosave key is `pulpWars.save.v7r93.current`). Every row of 4.2 is a
registry value and every row of 4.4 an exact preview or result in
`tests/unit/ruleset-v7-naval-undead.test.ts`; the AI scenarios of 4.6 are
`tests/unit/ruleset-v7-naval-undead-ai.test.ts`. Where the build is more
precise than the text above:

- **The rising.** `drownedCrewOfV7` (the killer's role has `DROWNED_CREW`
  and its kind's capabilities under its controller have `drownedCrews`;
  `deepWater` is the controller's Navigation) and `drownedCrewRaisesV7`
  (killer and victim in `NAVAL` form, the victim on Shallow Water or, with
  Navigation, Deep Water, never on ice) feed two new inputs of the shared
  `undeadCombatEffectsV7` (`attackerDrowns`, `defenderDrowns`), so the
  canonical and public previews set `defenderInfected` and
  `attackerInfected` and the reducer's Infect step runs unchanged;
  `recordInfectionV7` makes a naval victim's rising the killer seat's
  `PATROL_BOAT` in `NAVAL` form at `DROWNED_CREW_HP_V7` 5. The public
  chain preview (`previewAttackExplosionsV7`) raises the same Ghost Ship.
  A neutral victim never rises (no neutral unit sails today).
- **Private research.** The text above says the preview carries
  `attackerInfected` for a retaliation kill. An Undead seat's Drowned
  Crews and Navigation are private (a ship's public stats never tell its
  owner's naval research: `ruleset-v7-naval-branch-submarine.test.ts`), so
  the public preview of another seat assumes both for an Undead ship, as
  the threat estimate assumes a hostile Ram: a Human boat that would sink
  to a Ghost Ship's reply is told it may rise ("You may rise as enemy
  Ghost Ship"); the result follows the research. The viewer's own kills
  are exact.
- **A Dreadnought sunk by an Undead ship** rises, and its death blast (7)
  then hits the 5-HP Ghost Ship on its tile, as a Zombie risen from a
  Goblin exploding unit is hit: the crew rises and the powder blows.
- **The rising's value (AI).** `drownedCrewRisingTenthsV7`: half the
  viewer's Patrol Boat's cost (25 tenths), or three tenths of it (7) when a
  visible hostile unit can sink the risen ship next turn. A hostile unit
  whose reach covers the killer too is left out of that test: the risen
  ship splits its fire. Without this rule the doc's own example (a Galley
  beside a Patrol Boat and a Battleship) could not hold: the Battleship
  always reaches the risen ship, and 5 + 0.75 Coins is less than the
  chip's 6.4. The torpedo rule is `drownedCrewTorpedoPriorityV7` (priority
  1280); the attack scorer values a naval rising at the risen ship's
  strategic worth (its cost × 4 + 5 HP at the same factor) instead of the
  Zombie's 24, and an own ship that would rise for the enemy at 25.
- **Pestilence for a Galleon.** "Before Navigation" cannot happen: the
  Galleon needs Shipbuilding, which needs Navigation. Built as: a seat that
  owns a ship whose role has `PLAGUE` and lacks the capability `plague`
  researches the first step of the chain to the node that grants it, at
  priority 1220 (above the army's due research, 1219; below the naval
  plan's 1280 and every training rule). A Lich keeps the army's own rule
  (Pestilence before the last unit of the order once two Liches are
  fielded), unchanged.
- **The plague value** of the attack scorer already applied to every
  attacker whose preview plagues (it reads `preview.plagued` in any match
  with an Undead seat); the claim was verified, nothing changed there. The
  station's plague term is `NAVAL_STATION_PLAGUE_VALUE_V7` 3 for each
  living hostile unit not yet plagued in the best target's splash cluster
  (the target included).
- **Text.** The glossary has one `DROWNED_CREW` entry ("Drowned Crew") on
  the three ships; the Galleon's Plague is the Lich's `PLAGUE` line (one
  name, one mechanic), and its ability sentence names the Galleon. The
  Drowned Crews card says the rule sentence, the Shipbuilding card says the
  Galleon's plague, the Bow Ram and Submersibles cards name the Ghost Ship
  and the Sunken Galley, the attack preview says "Rises as your Ghost
  Ship", and a rising's notice says "A sunk Patrol Boat rose as a Ghost
  Ship".
- **Art.** The Drowned Crews card has its own icon
  (`ICON:TECH:UNDEAD:SEAMANSHIP`, `chibi-naval-undead-icon-tech-seamanship`,
  batch `naval-undead`; it falls back to the shared wheel); the Ghost Ships
  and Sunken Galleys cards show the ships' portraits. The rising on water
  is the existing Infect effect (the wisps), drawn on the ship's tile. No
  new sound.

## 5. Dinosaurs: Horned Prows and the Plesiosaur

**Theme.** Few, big, and growing: boats that charge, and one sea reptile
that grows on what it eats.

### 5.1 Technologies

| ID                  | Dinosaur name | Dinosaur unlocks (difference in bold)                               |
| ------------------- | ------------- | ------------------------------------------------------------------- |
| `SHORECRAFT`        | Dugouts       | as Sailing; the Patrol Boat is the **Dugout**                       |
| `NAVIGATION`        | Navigation    | as Navigation                                                       |
| `NAVAL_ENGINEERING` | War Rafts     | as Shipbuilding; the Battleship is the **War Raft**                 |
| `SEAMANSHIP`        | Horned Prows  | Ram and Board, as Boarding; the Dugout's Ram is the **Horned Prow** |
| `SUBMERSIBLES`      | Plesiosaurs   | as Submersibles; the Submarine is the **Plesiosaur**                |

### 5.2 Units

| Unit       | Human counterpart | Cost (Shipyard) |       HP | Attack | Defense | Abilities                                    |
| ---------- | ----------------- | --------------: | -------: | -----: | ------: | -------------------------------------------- |
| Dugout     | Patrol Boat       |           5 (3) |       10 |      2 |       2 | **Horned Prow** (the Ram with a run-up)      |
| War Raft   | Battleship        |         16 (14) |       25 |      5 |       3 | splash                                       |
| Plesiosaur | Submarine         |      **10** (8) | 12/16/20 |  4/4/5 |       2 | Submerged; Torpedo; **Grows**; **sea beast** |

### 5.3 Mechanics

**D1. Horned Prow** ("A Dugout's ram hits harder after a longer run").

- The Dinosaur `PATROL_BOAT` has the role mechanic `ramRunUpBonus2: 3`.
  Its Ram bonus is `RAM_BONUS2_V7` (2, +1 Attack) when the boat's
  `movedPathLength` is 1 and `ramRunUpBonus2` (3, +1.5 Attack) when it is 2
  or more. Every other Ram rule holds (Seamanship, a target afloat, the
  shove). An interrupted Move counts the tiles it entered. The preview's
  `ram` is true and its `attack2` shows the bonus; `estimateCombatV7`
  counts it for a planned path length.

**D2. The Plesiosaur** ("A sea reptile: it grows from kills like a
dinosaur, and nobody can board it").

- The Dinosaur `SUBMARINE`: 10 Coins (8 at a Shipyard), 12 HP, Attack 4,
  Defense 2, Move 2, Sight 2, Submerged and Torpedo as every Submarine,
  trained with `TRAIN_NAVAL` (not an Egg: `hatchTurns` null), one slot.
- It has `GROW`: Big at 1 kill (+4 maximum HP, full heal) and Alpha at 3
  (+4 more and +1 Attack), from torpedo and retaliation kills, never
  Promotion, as [section 19.8](RULESET_7_CURRENT.md#198-grow). It is
  living (Plague and Bite apply). It is **not** a dinosaur for the land
  rules that read a land-form growing unit (Pack Hunt, Wallbreaker, War
  Drums, the Shaman's 4-HP Tend): they stay land-only, unchanged.
- `seaBeast`: never boarded, and a Dinosaur seat never boards a Submarine
  ([section 2](#2-shared-rules-for-every-faction-branch), rule 6).

### 5.4 Worked examples

| Exchange                                            | Result                                |
| --------------------------------------------------- | ------------------------------------- |
| Dugout rams a Patrol Boat after 1 tile              | 8; 4 (the Human Ram)                  |
| Dugout rams a Patrol Boat after 2 tiles             | 10: sunk; 0                           |
| Dugout rams a Submarine after 2 tiles               | 10 (2 left); 3                        |
| Dugout rams a transport after 2 tiles               | 12: every 12-HP embarked unit sunk    |
| Dugout rams a Battleship after 2 tiles              | 8; 6                                  |
| Plesiosaur torpedoes a Battleship (stage 0 / Alpha) | 10 / 14; 0                            |
| Patrol Boat rams an Alpha Plesiosaur (20 HP)        | 8; 4                                  |
| Battleship shoots an adjacent Alpha Plesiosaur      | 16 (4 left); 3                        |
| Submarine torpedoes a fresh Plesiosaur              | 12: sunk (the mirror is first strike) |

### 5.5 Balance

- **No runaway.** The Horned Prow wins boat duels for whoever runs in
  first, but loses to a Battleship (8 dealt, 6 taken) and to anything that
  hits it first; it is the Charge! fantasy at sea, a situational blowout
  kept on purpose. The Plesiosaur needs three kills to be Alpha, costs one
  Coin more, and dies to a torpedo, a Battleship beside it, or two rams and
  a hit.
- **Counters.** Keep boats beyond a two-tile run, screen transports, kill
  the Plesiosaur young; Icebound freezes it like any ship.
- **Lever:** `ramRunUpBonus2` 2 (no run-up bonus) or the Plesiosaur without
  the Alpha Attack.

### 5.6 Normal AI

- **Run-up.** The ram approach (`navalRamApproachV7`) previews each
  destination with the Move's real path length; for a Dugout it gets the
  path lengths of the offered Moves (the movement query has them) instead
  of the Chebyshev distance, so a two-tile run that sinks beats a one-tile
  Ram, and `navalRamHoldsAttackV7` holds an adjacent Dugout's plain attack
  while a two-tile approach kills.
- **Plesiosaur.** The torpedo targets add the growth value of a kill
  (`growthKillValueV7`) when the kill reaches a stage; otherwise it plays
  as a Submarine (the training counter, the safety rules).
- **Board.** Never offered against a sea beast; nothing to learn.

Tests (`tests/unit/ruleset-v7-naval-dinosaur-ai.test.ts`): a Dugout two
tiles from a hostile Patrol Boat with an open run moves two tiles and
sinks it; a Dugout next to the boat steps back and runs in when the board
allows a two-tile approach that kills; a Plesiosaur one kill from Big
sinks a Patrol Boat rather than chip a Battleship; no `BOARD` is offered
on a Plesiosaur.

### 5.7 Art and sound

- **Plesiosaur:** a new living sea reptile (long neck, four flippers,
  blue with orange stripes and spots, the Dinosaur palette), a map sprite
  on the Submarine's canvas and anchor, its submerged variant derived by
  `scripts/art/naval-branch/submerged.ts`, and a portrait. The growth
  stages use the existing code-drawn Big and Alpha marks.
- **Dugout:** the accepted Dinosaur Patrol Boat with a carved horn on the
  prow (an edit of the accepted sprite and portrait). War Raft unchanged.
- **Icons:** Horned Prows (a horned prow).
- **Sound:** the existing dinosaur growth cue; one new ElevenLabs clip for
  the Plesiosaur's torpedo bite (a wet roar), through the checked-in
  script.

### 5.8 As built (`pulp_wars-5ti.18`, `pulp-wars-poc-7r94`)

Built as above at identity `7r94` (`7r93` is a prior identity; the
autosave key is `pulpWars.save.v7r94.current`). Every row of 5.2 is a
registry value and every row of 5.4 an exact preview or result in
`tests/unit/ruleset-v7-naval-dinosaur.test.ts`; the AI scenarios of 5.6
are `tests/unit/ruleset-v7-naval-dinosaur-ai.test.ts`. Where the build is
more precise than the text above:

- **The Horned Prow.** The role mechanic `ramRunUpBonus2` is
  `RAM_BONUS2_V7` (2) for every role and `HORNED_PROW_RAM_BONUS2_V7` (3)
  for the Dinosaur `PATROL_BOAT`; `ramBonus2V7(roster, attacker,
pathLength)` gives the bonus of a Ram (`attackIsRamV7` decides whether
  it is one) after a Move that entered `pathLength` tiles, 2 below
  `RAM_RUN_UP_TILES_V7` (2). The canonical combat reads the activation's
  `movedPathLength` (an interrupted Move counts the tiles it entered, the
  movement's `traversedPath`) or the estimate's planned path length; the
  public preview reads the viewer's own unit's activation. The Ram never
  applies on retaliation, so a Dugout that ran strikes back at its own
  Attack. The preview's `ram` is true and its `attack2` holds the bonus;
  the interface reads the bonus with the same helper ("Horned Prow +1.5").
- **Zones of control limit the run.** Not in the text above: a hostile
  ship projects a zone of control onto the water beside it, and entering
  it ends a Move, so a two-tile run ends beside a ship only when its first
  tile is outside that zone (two or more tiles from the target, an "open
  run"); and the movement query offers each destination once, by its
  shortest path, so a Dugout beside a boat cannot step back and run in on
  one Move (a one-tile sidestep rams for +1). A transport projects no zone
  of control, so the 5.6 scenario "a Dugout next to the boat steps back and
  runs in" is built against a transport (a 12-HP embarked Fighter: the
  one-tile Ram leaves it on 2 HP, the run sinks it), and the test beside it
  shows that a Dugout beside a boat sidesteps and rams for 8. This keeps
  the rule as designed; the Horned Prow wins boat duels for whoever runs in
  first from two or three tiles away.
- **The Plesiosaur** is the Dinosaur `SUBMARINE` with `GROW` and
  `SEA_BEAST` in its abilities and `seaBeast` in its mechanics; growth,
  state parsing (`maxHp = 12 + 4 × stage`), and the refusal of Promotion
  are the existing `GROW` rules, which never read the form, so a torpedo or
  a retaliation kill afloat grows it. Every land-only reader (Pack Hunt,
  Wallbreaker, War Drums' Rally, the Shaman's Tend, the curiosities) already
  required land form; the tests pin each. `boardSeaBeastBlockedV7` refuses a
  Board of a Plesiosaur and a Dinosaur ship's Board of any Submarine; the
  Dinosaur Seamanship keeps `COMMAND BOARD`, so a Dugout or a War Raft
  boards a weak Patrol Boat or Battleship (the prize a Dugout or a War Raft).
- **Private research.** The threat estimate (`navalThreatFactsV7`) assumes
  a hostile Dugout's Horned Prow with its run-up (+1.5), as it assumes any
  hostile Ram: a 10-HP Patrol Boat three tiles from a hostile Dugout is in
  lethal reach (10), where a Ghost Ship's Ram deals 8.
- **The run-up (AI).** `navalMovePathLengthV7` reads an offered Move's path
  length from the offered commands (the shortest when several end on one
  tile; the Chebyshev distance for a tile with no Move on offer); the held
  plain attack and the Fire Raft's best Ram use it, and the Move scorer
  already passed the Move's own path. The approach priority is the existing 1276.
- **The Plesiosaur's growth (AI).** `growthKillTenthsV7` values the growth
  of the next kill in tenths of a Coin: the HP it restores (the missing HP
  plus 4) as a share of the ship's cost over its maximum HP, plus at Alpha
  the Attack it adds as the same share of its cost (`ALPHA_ATTACK2_V7` over
  the role's `attack2`). One kill from Big at full HP it is 33 tenths, so
  the doc's example holds: a Patrol Boat kill (50 + 33) beats a chip on a
  Battleship (64). `plesiosaurGrowthTorpedoPriorityV7` (priority 1280) fires
  such a torpedo first unless another of its torpedoes is worth as much or
  another own Submarine follows on that target. The land attack scorer's
  growth value (`growthKillValueV7`) already applied to every growing
  attacker.
- **Text.** The glossary has a `HORNED_PROW` entry ("Horned Prow", the
  Dugout's Ram in place of the Bow Ram) and the existing `SEA_BEAST` and
  `GROW` entries on the Plesiosaur; the Bow Ram card line, the Ram's help
  sentence, and the attack preview name the Horned Prow and its +1.5; the
  Submersibles card reads "Plesiosaur: hit only from the next tile; torpedo
  with no strike-back; grows; never boarded"; the Board
  aiming marks a Plesiosaur "Sea beast" and the dock says "A sea beast
  cannot be boarded"; the Dinosaur Help has an "At sea" line.
- **Art.** The Plesiosaur's map sprite and portrait are redrawn in place
  (same asset IDs, subject keys `…/PLESIOSAUR`), edits of the accepted log
  submarine; its front flipper reaches further left than any hull, so it is
  anchored at (30, 48) (`PLESIOSAUR_ANCHOR_V7`), 2 px right of the other
  Submarines, and its submerged variant is derived as every other. The
  Dugout's sprite and portrait are edits adding a bone-white horn on the
  prow (`…/HORNED`). Horned Prows has its own icon
  (`ICON:TECH:DINOSAUR:SEAMANSHIP`, batch `naval-dinosaur`); the Dugouts and
  Plesiosaurs cards show the ships' portraits. See
  [NAVAL_FACTIONS.md](../art/NAVAL_FACTIONS.md#the-dinosaur-plesiosaur-and-horned-prows-bead-pulp_wars-5ti18).
- **Sound.** One new ElevenLabs clip, `attack.plesiosaur` (a wet roar and
  a snap of jaws), played in place of the melee swing when a sea beast
  attacks (`seaBeastAttacksV7`); five takes in two rounds, two kept
  ([ELEVENLABS_SFX.md](../audio/ELEVENLABS_SFX.md)). The growth plays the
  existing dinosaur growth cue.

## 6. Martians: the Hover Fleet

**Theme.** A small high-tech invasion force: frail hulls behind Shields,
and troops that hover off any beach without a harbour.

### 6.1 Technologies

| ID                  | Martian name   | Martian unlocks (difference in bold)                       |
| ------------------- | -------------- | ---------------------------------------------------------- |
| `SHORECRAFT`        | Skimmers       | as Sailing; the Patrol Boat is the **Skimmer**             |
| `NAVIGATION`        | Navigation     | as Navigation                                              |
| `NAVAL_ENGINEERING` | Hover Cruisers | as Shipbuilding; the Battleship is the **Hover Cruiser**   |
| `SEAMANSHIP`        | Hover Pods     | Ram; **Hover Pods** (unlock `HOVER_PODS`) instead of Board |
| `SUBMERSIBLES`      | Bathyspheres   | as Submersibles; the Submarine is the **Bathysphere**      |

### 6.2 Units

| Unit          | Human counterpart | Cost (Shipyard) |     HP | Shield | Attack | Defense | Abilities          |
| ------------- | ----------------- | --------------: | -----: | -----: | -----: | ------: | ------------------ |
| Skimmer       | Patrol Boat       |           5 (3) |  **8** |  **2** |      2 |       2 | Ram                |
| Hover Cruiser | Battleship        |         16 (14) | **20** |  **3** |      5 |       3 | splash             |
| Bathysphere   | Submarine         |           9 (7) | **10** |  **2** |      4 |       2 | Submerged; Torpedo |

### 6.3 Mechanics

**M1. Shielded hulls.** The three Martian ships have the role mechanic
`shield` (2, 3, 2) and lower HP. Shields follow
[section 20.2](RULESET_7_CURRENT.md#202-shields) in every form: created at
the maximum when trained, recharged at the owner's Start Turn (and at its
End Turn with Force Fields), absorbing every hit, splash, blast, bomb, and
the ice crush first, never Plague. A land-form Shield Projector covers an
adjacent ship as it covers any unit (a docked Cruiser beside one recharges
to 4). The recharge already reads any form; the bead verifies that
`TRAIN_NAVAL` creates the Shield entry, and the `martian` stats block
shows it for ships. Help: "Its Shield takes hits first and recharges every
turn."

**M2. Hover Pods** ("Your foot troops can hover off any beach").

- A land-form Martian unit of the `GROUND` movement mode (Grunt, Ray
  Gunner, Shield Projector, Brain, Shock Trooper) whose kind's capabilities
  under its owner have `hoverPods` may make the **last step** of an
  ordinary Move from a land tile onto an adjacent Shallow Water tile that
  is explored, holds no unit, is not ice, and is not a dock. That step
  costs a full point and ends the Move; the unit **self-launches** there
  (it embarks with the exhausted activation), exactly as a walker whose
  Move ends on water.
- It never crosses water inside a Move and never launches onto Deep Water;
  the launching step always starts on land. Afloat it is an
  ordinary embarked unit (Move 2, Defense 1, keeps its Shield) and lands
  with `DISEMBARK`. Embarking at a Port is unchanged. Machines already
  self-launch and are unaffected.
- A mind-controlled unit of another kind never hover-launches (it reads
  its own tree); a mind-controlled Martian foot unit does, for its
  controller, if the controller's research reads Hover Pods in the Martian
  tree (the general `unitCapabilitiesV7` rule).
- Public: the movement query offers the launch tile as a destination
  (exact); the movement failure for a launch that is not legal is the
  ordinary `MOVEMENT_ILLEGAL` with the terrain reason.

### 6.4 Worked examples

| Exchange                                          | Result                                      |
| ------------------------------------------------- | ------------------------------------------- |
| Patrol Boat rams a Skimmer                        | 2 on the Shield, 6 on HP (2 left); 4 taken  |
| Patrol Boat attacks a Skimmer without a ram       | 2 on the Shield, 3 on HP; 5 taken           |
| Skimmer rams a Patrol Boat                        | 8; 2 (its Shield takes 2 of the reply)      |
| Battleship on a Skimmer                           | sunk (the Shield adds 2 to 8)               |
| Submarine torpedoes a Hover Cruiser, then another | 3 + 7, then 12: 1 HP left (a Battleship: 3) |
| Battleship on a Hover Cruiser                     | 3 + 11; 5                                   |
| Patrol Boat rams a hover-launched Grunt           | Shield 2 then 8: sunk                       |

### 6.5 Balance

- **No runaway.** Shields beat chip damage and the long brawl at sea, but
  each hull has less HP, so the one big hit (a Battleship on a Skimmer, a
  torpedo pair on a Cruiser) still sinks it. Hover Pods replace a 4-Coin
  Port and the walk to it; the launched unit still sits exhausted at
  Defense 1 for a turn beside the coast, where any boat sinks it.
- **Counters.** Focus fire, Battleships, and patrols along the coast the
  Martians face; Plague (an Undead Galleon) goes through Shields; the
  Shield does not make a transport any harder to ram.
- **Lever:** Hover Pods only within 2 tiles of an own city, or Shields 1.

### 6.6 Normal AI

- **Hover launches.** The naval plan (`navalPlanWorkV7`) treats every
  explored Shallow Water tile beside own land, free, not ice and not a
  dock, as a launch start for a seat with `hoverPods` (as a Port is for
  every seat): the water routes and the landing coast are computed from
  those starts, and a foot unit bound overseas walks to the nearest launch
  tile instead of a Port. The Move onto the water is offered by the
  movement query, so the plan only scores it. The rule that keeps
  transports out of a hostile Battleship's or Submarine's reach
  unescorted (`navalTransportMoveRejectedV7`) applies to the launch tile.
- **Research.** Hover Pods is asked for, ahead of the generic research,
  once the naval plan is active and the seat has two or more foot units
  bound overseas, whether or not it has a warship.
- **Shields at sea.** Every exchange is read from the exact previews, which
  count the Shield; the threat estimate already counts a Shield for land
  units and is checked for ships (a Skimmer with Shield 2 and 8 HP is not
  "in lethal reach" of a 9 hit).

Tests (`tests/unit/ruleset-v7-naval-martian-ai.test.ts`): a Grunt on a
coast with Hover Pods, an overseas target, and no Port launches from the
beach; the same seat without Hover Pods walks to its Port; no launch into
an unescorted hostile Battleship's reach; Hover Pods is researched with two
foot units bound overseas; a Skimmer rams a Patrol Boat it would not ram
without its Shield.

### 6.7 Art and sound

- No new hull art: the Skimmer, Hover Cruiser, and Bathysphere are the
  accepted Martian Patrol Boat (a chrome hover-boat), Battleship (a
  hover-cruiser), and Submarine (a bathysphere). A hover-launched foot unit
  draws the accepted Martian transport (the chrome saucer-barge).
- **Effects:** the code-drawn Shield bubble on the three hulls (checked at
  the ship anchors and the riding-low Bathysphere).
- **Icons:** Hover Pods (a chrome pod over a wave).
- **Sound:** the existing Shield flare and embark cues; no new clip.

### 6.8 As built (`pulp_wars-5ti.19`, `pulp-wars-poc-7r95`)

Built as above at identity `7r95` (`7r94` is a prior identity; the
autosave key is `pulpWars.save.v7r95.current`). Every row of 6.2 is a
registry value and every row of 6.4 an exact preview equal to its result
in `tests/unit/ruleset-v7-naval-martian.test.ts` (all seven held as
written: the Battleship of the "a Battleship: 3" comparison is the
Dinosaur War Raft, the Human numbers, since an arena never seats one
faction twice); the AI scenarios of 6.6 are
`tests/unit/ruleset-v7-naval-martian-ai.test.ts`. Where the build is more
precise than the text above:

- **The claim checked first.** `TRAIN_NAVAL` did **not** create a Shield
  entry (the land `TRAIN`, Hire, rewards, and the map and mission builders
  did): the reducer now writes it (`withFullShieldsV7`), as section 6.3
  says. The recharge, the Force Field cover (a docked ship beside a
  land-form Projector recharges to 4), combat absorption, the `martian`
  stats block, and the Board prize rule already read any form, so a
  Martian ship needed only its role mechanic `shield` (2, 3, 2). The
  Showcase gives the three ships their full Shields (twelve entries for a
  Martian seat).
- **Hover Pods** is the unlock `HOVER_PODS` (capability `hoverPods`) after
  `RAM` on the Martian Seamanship (`withSeamanshipUnlocksV7`). The launch
  rule is one helper, `hoverLaunchAllowedV7`, read by the canonical and the
  public movement validation and so by the movement query: the last step
  of the path (never a hop), from a land-form unit of the `GROUND` mode
  that embarks at all (not summoned, not of the Ice Folk kind, not a Bat
  Escape), onto Shallow Water with no ice and no Port or Shipyard, on a
  tile the mover had explored **before the command** (a launch onto water
  revealed by the same Move is refused, so offered equals accepted and a
  rejection reveals nothing). The step costs 2 half-points even from a
  Road node and stops the Move; a further step after it is the ordinary
  `MOVEMENT_ILLEGAL { reason: "ENGINEERING_REQUIRED" }`, and so are Deep
  Water and a hostile dock; an occupied tile is `OCCUPIED`; an own active
  dock embarks as ever; ice is ground (the unit walks on and slips). The
  reducer's self-launch reads the same capability (`EMBARKED`, the
  exhausted activation, `UNIT_EMBARKED`, the Shield kept).
- **Thrall rules.** A mind-controlled unit reads its own kind's tree with
  its controller's research (`unitCapabilitiesV7`): a Human Fighter under
  a Brain never launches; a Martian foot unit under another Martian seat's
  Brain launches with its controller's Hover Pods (tested on the roster:
  no arena seats one faction twice).
- **Private research.** Another seat's Hover Pods is private, so the public
  movement validation of a visible unit of another seat assumes them for a
  Martian foot unit (`publicUnitHoverPodsV7`), and the attack-reach query
  treats its launch tiles as no attack origins, as a machine's water tiles
  (`publicUnitLaunchesV7`). The viewer's own units are exact.
- **Shields at sea (AI).** Nothing new was needed: every exchange reads the
  exact previews, which count both Shields, and the threat estimate
  already took the Shield a defender has during the enemy turn off the
  damage it expects (`enemyTurnShieldV7`) for any Martian unit, ships
  included. The doc's "a Skimmer rams a Patrol Boat it would not ram
  without its Shield" is a Skimmer at 4 HP: its Ram deals 6 and the reply
  of 3 falls on its Shield first (3 HP left); without the Shield the reply
  of 4 sinks it, and the seat holds the attack.
- **Hover launches (AI).** `hoverLaunchTilesV7` (in `src/ai/v7-naval-martian.ts`)
  gives the plan's launch starts: explored Shallow Water beside explored
  land of a home landmass (one with an own city), with no visible unit, no
  ice, and no dock. They join the Ports among the plan's starts, the launch
  tiles with a water route to the landing coast are `servingLaunchKeys`,
  and a seat with one reserves no Coins for a Port. A launch Move
  (`hoverLaunchMoveV7`) is an auto-embark for every boarding rule
  (`isAutoembarkMoveV7`: priority 1300, the wave, the hold, the endgame,
  the escort rule `navalTransportMoveRejectedV7`), and
  `navalBoardingPortsV7` lists the launch tiles for a foot unit that
  launches. The wave of a beach gathers round one launch tile: a sailor
  whose own nearest launch tile is within the gathering radius (2) of it
  counts.
- **Research (AI).** `hoverPodsResearchDueV7`: the plan is active, the
  seat's tree grants Hover Pods and it lacks them, Seamanship is offered,
  and two or more own foot capture units have no walk to the plan's target
  (`overseasFootUnits`). It is then the plan's next technology after
  Sailing and a needed Navigation (priority 1280) and is not held for the
  army's research.
- **The other seats.** A hover-launched unit is a transport: a Human boat
  rams it and sinks it through its Shield (the 6.4 row), by the existing
  attack on a transport.
- **Text.** The glossary has a `HOVER_PODS` entry on the five foot roles
  ("It can hover off any beach onto shallow water as a transport, with no
  Port"); the Martian ships list the Martians' `SHIELD` line (one name, one
  mechanic). The Hover Pods card says "Hover Pods: Your foot troops can
  hover off any beach"; the Martian Help has an "At sea" line with the
  Shield sentence. A launch tile is highlighted as a machine's Launch is,
  with the legend "Hover off: crosses water as a transport".
- **Art.** The Hover Pods card has its own icon
  (`ICON:TECH:MARTIAN:SEAMANSHIP`, `chibi-naval-martian-icon-tech-seamanship`,
  batch `naval-martian`, three candidates); the Skimmers and Bathyspheres
  cards show the ships' portraits. The "Shield bubble" on the hulls is the
  existing code-drawn Shield: the segmented Shield bar at the hull's base
  and the Shield flare on a hit, drawn for any Martian unit whatever its
  form, checked at the ship anchors and on the riding-low Bathysphere. A
  hover-launched unit draws the Martian transport. No new sound.

## 7. Dwarves: Ironclads and Sea Tunnels

**Theme.** Heavy, slow, and built to last; they come from below: armoured
hulls, and Moles that dig under the strait.

### 7.1 Technologies

| ID                  | Dwarf name     | Dwarf unlocks (difference in bold)                           |
| ------------------- | -------------- | ------------------------------------------------------------ |
| `SHORECRAFT`        | Steam Launches | as Sailing; the Patrol Boat is the **Steam Launch**          |
| `NAVIGATION`        | Navigation     | as Navigation                                                |
| `NAVAL_ENGINEERING` | Ironclads      | as Shipbuilding; the Battleship is the **Ironclad**          |
| `SEAMANSHIP`        | Sea Tunnels    | Ram; **Sea Tunnels** (unlock `SEA_TUNNELS`) instead of Board |
| `SUBMERSIBLES`      | Diving Bells   | as Submersibles; the Submarine is the **Diving Bell**        |

### 7.2 Units

| Unit         | Human counterpart | Cost (Shipyard) |  HP | Attack | Defense | Abilities                        |
| ------------ | ----------------- | --------------: | --: | -----: | ------: | -------------------------------- |
| Steam Launch | Patrol Boat       |       **6** (4) |  10 |      2 |       2 | Ram; **Armoured**                |
| Ironclad     | Battleship        |     **18** (16) |  25 |      5 |       3 | splash; **Armoured**             |
| Diving Bell  | Submarine         |      **10** (8) |  12 |      4 |       2 | Submerged; Torpedo; **Armoured** |

### 7.3 Mechanics

**W1. Ironclad hulls** ("Armoured: every hit of 2 or more does 1 less").
The three Dwarf ships have `armourReduction: 1`, the Ankylosaurus's
Armoured ([section 19.9](RULESET_7_CURRENT.md#199-acid-and-armoured)),
which `armouredDamageV7` already applies in every form but an Egg: attack,
retaliation, splash, blasts, Wail, bombs, and Plague, minimum 1. The ice
crush stays 3 (it is not routed through Armoured, and stays so). Data
only, plus the `ARMOURED` ability literal on the three ships and the
stats block that shows it.

**W2. Sea Tunnels** ("Your Steam Moles can tunnel under shallow water").

- In row 6 of the `TUNNEL` legality
  ([section 22.2](RULESET_7_CURRENT.md#222-the-tunnel-and-burrowed-units)),
  for a Mole whose kind's capabilities under its owner have `seaTunnels`,
  the tiles of the step sequence after the first and before `to` may also
  be explored **Shallow Water** that is not ice. `to` and the rider's tile
  stay tunnel tiles (land). Range stays `TUNNEL_RANGE_V7` 3, so a strait of
  one or two Shallow Water tiles is crossed; Deep Water and ice are never
  passed. Everything else is the Tunnel: underground, no ZOC, nothing
  revealed on the way, the mound and the eruption on surfacing, the rider.
- A tunnel still touches no water on the board (nobody stands there, no
  dock changes), so `TUNNEL` stays off the blockade-event list.

### 7.4 Worked examples

| Exchange                                    | Result                                  |
| ------------------------------------------- | --------------------------------------- |
| Patrol Boat rams a Steam Launch             | 7 (8 less 1); 4                         |
| Steam Launch rams a Patrol Boat             | 8; 3                                    |
| Patrol Boat rams an Ironclad                | 6; 7: a losing ram                      |
| Submarine torpedoes an Ironclad, then again | 9, then 11: 5 left (a Battleship: 3)    |
| Battleship on an Ironclad                   | 13; 5                                   |
| Mole and Hammerer facing a 2-tile strait    | both surface on the far coast; eruption |

### 7.5 Balance

- **No runaway.** Armoured takes about a tenth off a typical hit, paid by
  1, 2, and 1 more Coins; Submarines still sink an Ironclad in three
  torpedoes. Sea Tunnels move two units per Mole a turn over a short
  shallow strait, no faster than a transport and with no boat to escort,
  but visible as a mound and limited to range 3.
- **Counters.** Torpedoes and Battleships (big hits lose least to
  Armoured); guard the far coast where a mound appears (a Fighter beside
  it meets the rider); Deep Water stops the tunnel.
- **Lever:** the Ironclad at 19, or Sea Tunnels one tile only.

### 7.6 Normal AI

- **Sea tunnels.** The Mole rules of `src/ai/v7-dwarf.ts` score an offered
  `TUNNEL` whose `to` lies on the naval plan's target landmass (another
  land component than the Mole's) as a landing: the priority of a planned
  `DISEMBARK` (1335) for a Mole with a rider, the Pressure-tunnel value
  without one, and the plan counts a Mole and its rider as crossing
  capacity (they skip the Port). The far-coast tile must pass the existing
  tunnel safety (`TUNNEL_MELEE_LIMIT_V7`).
- **Research.** Sea Tunnels is asked for once the naval plan is active, the
  seat owns a Mole, and the target landmass lies within 3 tunnel steps of
  own land over Shallow Water.
- **Armour.** Read from the exact previews (the ram rule already refuses a
  losing exchange, so it does not ram an Ironclad).

Tests (`tests/unit/ruleset-v7-naval-dwarf-ai.test.ts`): a Mole and a
Hammerer on a coast with a two-tile shallow strait and a hostile village
beyond tunnel across; without Sea Tunnels the offer does not exist and they
walk to the Port; a Patrol Boat does not ram an Ironclad; Sea Tunnels is
researched when the strait is in reach.

### 7.7 Art and sound

- No new hull art: the Steam Launch, Ironclad, and Diving Bell are the
  accepted Dwarf Patrol Boat, Battleship, and Submarine (soot iron and
  copper) under new labels.
- **Effects:** the existing Armoured mark on the three hulls; the mound
  on the far coast is the existing one.
- **Icons:** Sea Tunnels (a drill under a wave).
- **Sound:** the existing tunnel and eruption cues.

### 7.8 As built (`pulp_wars-5ti.20`, `pulp-wars-poc-7r96`)

Built as above at identity `7r96` (`7r95` is a prior identity; the
autosave key is `pulpWars.save.v7r96.current`). Every row of 7.2 is a
registry value and every row of 7.4 an exact preview equal to its result
in `tests/unit/ruleset-v7-naval-dwarf.test.ts` (all six held as written;
the Battleship of the "a Battleship: 3" comparison is the Dinosaur War
Raft, the Human numbers, since an arena never seats one faction twice);
the AI scenarios of 7.6 are `tests/unit/ruleset-v7-naval-dwarf-ai.test.ts`.
Where the build is more precise than the text above:

- **Ironclad hulls.** The three Dwarf ships have `armourReduction: 1` and
  the `ARMOURED` ability literal; nothing else was needed in the engine,
  since `armouredDamageV7` already reads any form. Tested on a Ram and its
  reply, a torpedo pair, a Battleship's shot and its splash, a Fire Raft's
  Kaboom and the Dreadnought blast it sets off, a Banshee's Wail (against
  a Human boat at the same tile, one less), Plague (1 instead of 2), and
  the Ice Folk crush (3, unreduced: the crush never goes through
  `armouredDamageV7`). A Dwarf bomb cannot meet a Dwarf ship (no match
  seats two Dwarf seats and a ship is never mind-controlled), so bombs are
  covered by the shared helper only. The Dwarf stats block gains
  `armourReduction` (1 on the ships, 0 on every other role).
- **Sea Tunnels** is the unlock `SEA_TUNNELS` (capability `seaTunnels`)
  after `RAM` on the Dwarf Seamanship. Row 6 is one helper,
  `seaTunnelPassableV7` (land always; with Sea Tunnels explored Shallow
  Water without ice), read by the reducer's tunnel reach and the public
  command query, so a tunnel under water is offered exactly when it is
  accepted (a sweep of every land tile in reach is tested). The capability
  is the Mole's kind's tree under its controller's research
  (`unitCapabilitiesV7`). A refused tunnel under Deep Water or ice, or one
  that ends on water, is the existing `TUNNEL_NOT_LEGAL { reason:
"DESTINATION" }` (`RIDER_DESTINATION` for the rider's tile).
- **Private research.** Sea Tunnels is in no public stat. No public reader
  of another seat's tunnel reach exists (a hostile tunnel is seen as its
  mound, which every seat already reads wherever it lies), so nothing had
  to be assumed for another seat.
- **Sea tunnels (AI).** `planTunnelsV7` (`src/ai/v7-dwarf.ts`) has a sixth
  rule, after the defence rule: an offered `TUNNEL` whose destination
  is on the naval plan's target landmass and whose Mole is not
  (`seaTunnelLandingWalkV7`, read from the plan's land-route distances) is
  a landing, valued 30 (+20 with a rider) plus the eruption score less the
  walk to the target, at priority `SEA_TUNNEL_LANDING_PRIORITY_V7` (1335,
  a planned `DISEMBARK`) with a rider and the Pressure-tunnel 875 without;
  a destination next to three hostile melee units is skipped unless it is
  next to the target. The Mole and the rider an offered landing names are
  the plan's crossing capacity (`seaTunnelCrewIdsV7`): they board at no
  Port and take no land job. A Mole that stands more than three tunnel
  steps from the far coast sails like any capture unit; walking it to the
  strait is not built (a follow-up).
- **Research (AI).** `seaTunnelsResearchDueV7`: the plan is active, the
  seat's tree grants Sea Tunnels and it lacks them, Seamanship is offered,
  the seat owns a Mole on the board, and `seaTunnelStraitV7` finds a step
  sequence of at most 3 from explored home land through explored Shallow
  Water without ice to the target landmass. It is the plan's next
  technology after Sailing and a needed Navigation (priority 1280) and is
  not held for the army's research.
- **Armour (AI), a correction.** The text above says the ram rule already
  refuses a losing exchange. It did not: the ram rule and the attack
  scorer weigh an exchange in Coins, and an Ironclad's 6 HP of 25 at 18
  Coins outweigh a Patrol Boat's 7 of 10 at 5, so a Patrol Boat rammed an
  Ironclad. Built as a rule for every seat, `armouredLosingAttackV7`: a
  ship's attack on an Armoured hull afloat that does not sink it and deals
  less than its reply takes (Shields counted) is refused, in the ram
  approach and among the plain attacks (`navalRejectsV7`). It changes no
  other matchup (no other hull is Armoured), and a Ram on a damaged
  Ironclad whose reply is weaker is still taken.
- **Text.** The glossary has a `SEA_TUNNELS` entry on the Mole ("It can
  tunnel under shallow water too, never under deep water or ice") and the
  existing `ARMOURED` line on the three ships (one name, one mechanic).
  The Sea Tunnels card says "Sea Tunnels: Your Steam Moles can tunnel under
  shallow water"; the Steam Launches card adds "Steam Launch: Armoured,
  every hit of 2 or more does 1 less", the Ironclads card "Ironclad:
  long-range splash damage; Armoured (every hit of 2 or more does 1
  less)", and the Diving Bells card ends in "; Armoured". The Dwarf Help
  has an "At sea" line. In a match without a Dinosaur seat (which shows
  its own line) the attack preview says "Armoured −1" on an Armoured
  defender and "Your armour −1" on an Armoured attacker.
- **The tunnel's route.** While a Tunnel destination is focused or chosen
  and its route needs water (`seaTunnelRouteV7`: the fewest water tiles,
  then the fewest steps, then the straightest), the board draws the route
  as a dashed seam of dug earth with churned bubbles on each wet tile
  (`drawSeaTunnelRouteV7`); a tunnel under land draws nothing new. It is
  static, so the reduced-motion form is the same drawing.
- **Art.** The Sea Tunnels card has its own icon
  (`ICON:TECH:DWARF:SEAMANSHIP`, `chibi-naval-dwarf-icon-tech-seamanship`,
  batch `naval-dwarf`, three candidates); the Steam Launches and Diving
  Bells cards show the ships' portraits. **No Armoured mark is drawn on the
  hulls**: the text above names "the existing Armoured mark", but none
  exists (the Ankylosaurus shows Armoured only in the preview and its
  info panel), and the riveted soot-iron hulls already read as armoured;
  the hulls show it in the attack preview, the info panel's glossary, and
  the cards. No new sound. See
  [NAVAL_FACTIONS.md](../art/NAVAL_FACTIONS.md#the-dwarf-sea-tunnels-bead-pulp_wars-5ti20).

## 8. Candy: Sugar Sails

**Theme.** A sugar rush: boats that charge in hyper and then crash, and a
galleon that throws pies at the beach.

### 8.1 Technologies

| ID                  | Candy name   | Candy unlocks (difference in bold)                           |
| ------------------- | ------------ | ------------------------------------------------------------ |
| `SHORECRAFT`        | Gumdrop Tugs | as Sailing; the Patrol Boat is the **Gumdrop Tug**           |
| `NAVIGATION`        | Navigation   | as Navigation                                                |
| `NAVAL_ENGINEERING` | Pie Galleons | as Shipbuilding; the Battleship is the **Pie Galleon**       |
| `SEAMANSHIP`        | Sugar Sails  | Ram; **Sugar Sails** (unlock `SUGAR_SAILS`) instead of Board |
| `SUBMERSIBLES`      | Choco Subs   | as Submersibles; the Submarine is the **Choco Sub**          |

### 8.2 Units

| Unit        | Human counterpart | Cost (Shipyard) |  HP | Attack | Defense | Abilities                                    |
| ----------- | ----------------- | --------------: | --: | -----: | ------: | -------------------------------------------- |
| Gumdrop Tug | Patrol Boat       |           5 (3) |  10 |      2 |       2 | Ram; Sugar Rush (Sugar Sails)                |
| Pie Galleon | Battleship        |     **17** (15) |  25 |      5 |       3 | splash; **Splat**; Sugar Rush (Sugar Sails)  |
| Choco Sub   | Submarine         |           9 (7) |  12 |      4 |       2 | Submerged; Torpedo; Sugar Rush (Sugar Sails) |

### 8.3 Mechanics

**C1. The Pie Galleon's Splat** ("Whoever the Galleon hits cannot strike
back this turn").

- The Candy `BATTLESHIP` has `SPLAT`. In
  [section 23.5](RULESET_7_CURRENT.md#235-splat) "an `ATTACK` by a land-form
  unit whose role has `SPLAT`" reads "by a unit in land or naval form whose
  role has `SPLAT`": after its attack its primary target, if still on the
  board, joins `splattedThisTurn` and does not retaliate against any
  `ATTACK` for the rest of the turn. Splash victims are not Splatted (as
  for the Pie Launcher). The preview carries `splatApplied`.
- It is the coastal-support twist: shell the beach defender, then the
  landed troops and the Tugs attack it unanswered.

**C2. Sugar Sails** ("Your ships can Sugar Rush: +1 Move and +1 Attack,
then they Crash").

- The three Candy ships have `SUGAR_RUSH`. In the `SUGAR_RUSH` legality
  ([section 23.2](RULESET_7_CURRENT.md#232-sugar-rush-and-the-crash)) row 3
  reads "in land form, or in `NAVAL` form when its kind's capabilities
  under its owner have `sugarSails`" (an embarked unit still never Rushes;
  without Sugar Sails a ship is refused `TECH_REQUIRED { tech: "SEAMANSHIP" }`;
  an icebound ship `SUGAR_RUSH_NOT_LEGAL { reason: "ICEBOUND" }`).
- A Rushed ship has +1 Move on its ordinary Move (3 tiles) and +1 Attack
  on its first `ATTACK` of the turn (it adds to the Ram), and Crashes at the
  End Turn as a land unit does: no primary action on its owner's next turn
  (no attack, no Board, no Kaboom), still moving, retaliating, and
  blockading. Home Sweet Home spares a Rushed ship on or next to an own
  city center. A Pie Galleon still cannot attack after moving, so it Rushes
  to fire harder from where it stands.
- Death afloat leaves no Crumbs, as today.

### 8.4 Worked examples

| Exchange                                              | Result                                   |
| ----------------------------------------------------- | ---------------------------------------- |
| Rushed Gumdrop Tug rams a Patrol Boat                 | 10: sunk                                 |
| Rushed Tug rams a Submarine                           | 12: sunk                                 |
| Rushed Choco Sub torpedoes a Battleship               | 14; 0                                    |
| Rushed Pie Galleon on a Battleship                    | 18; 5                                    |
| Pie Galleon shells a Guard, then a Fighter attacks it | 14, then the Fighter's hit with no reply |

### 8.5 Balance

- **No runaway.** Every Rush buys one big turn with the next turn's
  attack: a Rushed Tug that sinks a boat Crashes next to whatever comes
  for it. The Splat is the Pie Launcher's on a 17-Coin ship that cannot
  move and shoot.
- **Counters.** Strike the Crashed ships on the turn after a Rush (they
  cannot strike first); Submarines sink a Galleon unanswered; stay out of
  three-tile Rush reach.
- **Lever:** Sugar Sails for the Tug and the Sub only, or the Galleon at 18.

### 8.6 Normal AI

- **Rush at sea.** The Candy rush scorer (`src/ai/v7-candy.ts`) also scores
  an offered `SUGAR_RUSH` for an own ship: taken when the Rushed preview
  (`previewSugarRushV7`, then the attack after it) kills a target the plain
  attack does not, or the +1 Move reaches a Ram or a torpedo that kills;
  refused when the threat estimate on the ship's end tile next turn, with
  no attack of its own to answer (Crashed), is lethal, unless Home Sweet
  Home spares it.
- **Splat first.** The Splat value (`splatSavedHpV7`), today keyed to the
  Pie Launcher, is keyed to the `SPLAT` ability: a Pie Galleon fires first
  at the hostile unit that own units will attack this turn, and the attack
  order puts it before them.
- **Research.** Sugar Sails by the Seamanship rule as it is.

Tests (`tests/unit/ruleset-v7-naval-candy-ai.test.ts`): a Tug that kills
only when Rushed Rushes and rams; a Tug whose Crash would leave it beside a
hostile Battleship does not; a Pie Galleon Splats the coastal defender
before the landed Toffee Trooper attacks it; no ship Rush is offered
without Sugar Sails.

### 8.7 Art and sound

- No new hull art: the Gumdrop Tug, Pie Galleon, and Choco Sub are the
  accepted Candy Patrol Boat, Battleship, and Submarine (the chocolate
  capsule) under new labels.
- **Effects:** the code-drawn Rush sparkle and Crash slump on ships
  (checked at the naval anchors); the existing pie splat.
- **Icons:** Sugar Sails (a striped candy sail).
- **Sound:** the existing Rush, Crash, and Splat cues.

### 8.8 As built (`pulp_wars-5ti.21`, `pulp-wars-poc-7r97`)

Built as above at identity `7r97` (`7r96` is a prior identity; the
autosave key is `pulpWars.save.v7r97.current`). Every row of 8.2 is a
registry value and every row of 8.4 an exact preview equal to its result
in `tests/unit/ruleset-v7-naval-candy.test.ts`; the AI scenarios of 8.6
are `tests/unit/ruleset-v7-naval-candy-ai.test.ts`. Where the build is
more precise than the text above:

- **Sugar Sails** is the unlock `SUGAR_SAILS` (capability `sugarSails`)
  after `RAM` on the Candy Seamanship (`withSeamanshipUnlocksV7`). Row 3
  of the Rush legality is one helper, `sugarRushFormBlockV7` (in
  `src/engine/v7/candy.ts`), read by `sugarRushRejectionV7`, which the
  reducer (with the owner's research) and the public command query (with
  the viewer's) share, so a Rush afloat is offered exactly when it is
  accepted: land form passes; any other form that is not a ship is
  `EMBARKED`; a ship without Sugar Sails is `TECH_REQUIRED { tech:
"SEAMANSHIP" }`; an icebound ship is `SUGAR_RUSH_NOT_LEGAL { reason:
"ICEBOUND" }` (in that order, as the Kaboom afloat). The Rush's +1 Move
  (`sugarRushMoveBonusV7`), its +1 Attack (`sugarRushAttack2V7`, added to
  the Ram), and the Splat (`attackSplatsV7`) read land or naval form; the
  state schema lets a `sugarRush` entry name a Candy ship. The Crash, Home
  Sweet Home, and the End Turn step never read the form, so nothing else
  changed.
- **The 8.4 Guard example** is built with the Galleon next to the Guard:
  from two tiles the Guard's lower Defense against a shot lets the Galleon
  deal 17 and sink it, and a sunk target is never Splatted. From the next
  tile it is 14; 5, as the baseline's "Battleship on a Guard". The Guard is
  then on 3 HP, so the Toffee Trooper's hit kills it with no reply; a
  surviving Splatted target's no-reply is tested on a Battleship the
  Galleon shelled and a Tug then rams (`SPLATTED`, 0 taken).
- **Private research.** Sugar Sails is in no public stat. The public Candy
  block's `sugarRush` says a ship's role may Rush whatever its owner has
  researched; the public threat envelope (`queryThreatenedTilesV7`) and
  the `assumeSugarRush` estimate assume another seat's Sugar Sails, as a
  hostile Ram is assumed; the viewer's own ships are exact.
- **The claim checked first.** The text above says the Splat value is
  "today keyed to the Pie Launcher". It was keyed to the preview's
  `splatApplied` (which is the `SPLAT` ability, through the engine's
  land-form gate), so once the engine Splats afloat a Pie Galleon's shot
  gets the Pie-first offset (`PIE_FIRST_OFFSET_V7`, priority + 3) and the
  retaliation it saves the own units' adjacent attacks on the same target
  (`splatSavedHpV7`) with no AI change; the test pins the offset for the
  Galleon.
- **Rush at sea (AI).** `planSugarRushV7` and `rushedMovePlanV7` take a
  ship. The cheap estimate of a Rushed kill adds a ship's Ram bonus against
  a target afloat (`shipRamCheapBonus2V7`), so a Rushed Ram is considered;
  the exact Rushed preview then decides. A ship's Rush for a kill is
  refused when its end tile is in visible lethal reach (the danger without
  the target it kills, after the reply it takes), whatever the target, the
  key-role exception of the land rule not applying, unless Home Sweet Home
  spares it there (`homeSweetHomeSparesAtV7`). The Tug, the Sub (one more
  tile of Move to a sinking torpedo), and the Galleon (a harder shot from
  where it stands) are each tested; the Galleon with Sugar Sails Rushes
  and sinks the coastal Guard outright (17), which is worth more than a
  Splat, so the "Splat first" scenario is built without Sugar Sails.
- **Against Sugar Sails (AI).** `src/ai/v7-naval-candy.ts`: a visible
  hostile Candy ship whose role may Rush and that has no `sugarRush` entry
  is assumed to Rush on its next turn: one more tile of Move in its threat
  reach and one more Attack in the danger estimate (with the assumed Ram, a
  Human Patrol Boat four tiles from a Candy Tug is in lethal reach, 10). A
  Crashed one is no threat, by the Candy policy's existing reading of the
  Crash. Splat changes no estimate: the threat estimate already assumes
  every hostile unit in reach attacks.
- **Research (AI).** Sugar Sails comes with Seamanship by the naval plan's
  rules as they are; nothing new.
- **Text.** The Candy ships list the existing `SUGAR_RUSH` and (the
  Galleon) `SPLAT` glossary lines (one name, one mechanic; the Sugar Sails
  card says the Rush needs the technology). The Sugar Sails card says
  "Sugar Sails: Your ships can Sugar Rush: +1 Move and +1 Attack, then
  they Crash"; the Pie Galleons card "Pie Galleon: long-range splash
  damage; whoever it hits cannot strike back this turn". The Candy Help's
  Splat line names the Pie Galleon and it has an "At sea" line. The dock's
  Sugar Rush button and the armed Rush (the Rushed reach and the attacks
  with the bonus on the board) serve a ship as a land unit; the attack
  preview says "Splat: no strike-back this turn" and "Sugar Rush +1".
- **Art.** The Sugar Sails card has its own icon
  (`ICON:TECH:CANDY:SEAMANSHIP`, `chibi-naval-candy-icon-tech-seamanship`,
  batch `naval-candy`, four jobs); the Gumdrop Tugs and Choco Subs cards
  show the ships' portraits. The Rush and Crash on a ship are the existing
  code-drawn markers. No new sound. See
  [NAVAL_FACTIONS.md](../art/NAVAL_FACTIONS.md#the-candy-sugar-sails-bead-pulp_wars-5ti21).

## 9. Cult: the Deep Ones

**Theme.** What the Cult sinks feeds the Ancient Ones, and something
trained in the deep holds ships beside it.

### 9.1 Technologies

| ID                  | Cult name             | Cult unlocks (difference in bold)                                         |
| ------------------- | --------------------- | ------------------------------------------------------------------------- |
| `SHORECRAFT`        | Black Gondolas        | as Sailing; the Patrol Boat is the **Black Gondola**                      |
| `NAVIGATION`        | Navigation            | as Navigation                                                             |
| `NAVAL_ENGINEERING` | Galleons of the Eye   | as Shipbuilding; the Battleship is the **Galleon of the Eye**             |
| `SEAMANSHIP`        | Offerings to the Deep | Ram; **Offerings to the Deep** (unlock `DEEP_OFFERINGS`) instead of Board |
| `SUBMERSIBLES`      | The Kraken            | as Submersibles; the Submarine is the **Kraken**                          |

### 9.2 Units

| Unit               | Human counterpart | Cost (Shipyard) |  HP | Attack | Defense | Abilities                                             |
| ------------------ | ----------------- | --------------: | --: | -----: | ------: | ----------------------------------------------------- |
| Black Gondola      | Patrol Boat       |           5 (3) |  10 |      2 |       2 | Ram; Offering (Offerings to the Deep)                 |
| Galleon of the Eye | Battleship        |         16 (14) |  25 |      5 |       3 | splash; Offering                                      |
| Kraken             | Submarine         |      **10** (8) |  12 |      4 |       2 | Submerged; Torpedo; **Drag**; **sea beast**; Offering |

None of them is a robed cultist or a daemon: they need no strand, never
channel, and their kills pay no daemon Favour.

### 9.3 Mechanics

**K1. Offerings to the Deep** ("What your ships sink feeds the Ancient
Ones: half its value in Favour").

- When a unit afloat (`NAVAL` or `EMBARKED`) hostile to a Cult seat is
  killed by the `ATTACK` or the retaliation of that seat's unit in `NAVAL`
  form whose kind's capabilities under its owner have `deepOfferings`, the
  seat gains `floor(value / 2)` Favour (`DEEP_OFFERING_DIVISOR_V7` 2), the
  value of [section 26.2](RULESET_7_CURRENT.md#262-favour): a Patrol Boat
  2, a Submarine 4, a Battleship 8, a transported Knight 4, a Goblin Fire
  Raft 2. `FAVOUR_GAINED` with the new source `DEEP_OFFERING`, capped at 30
  as every gain (the excess forfeited). Never from splash, blasts, Plague,
  or a Tentacle. Ability literal `DEEP_OFFERING` on the three ships.
- The Cult Seamanship has no `BOARD`.

**K2. The Kraken** ("Enemies afloat beside the Kraken can move only one
tile").

- The Cult `SUBMARINE`: 10 Coins (8 at a Shipyard), 12 HP, Attack 4,
  Defense 2, Move 2, Sight 2, Submerged and Torpedo as every Submarine,
  trained with `TRAIN_NAVAL`, one slot, living (a trained beast, not a
  daemon), `seaBeast` (never boarded).
- **Drag afloat** (role mechanic `dragsAfloat`, ability `DRAG`): a unit
  afloat of a player hostile to the Kraken's owner that begins a `MOVE`
  next to a Kraken that is not icebound may move only one tile in it
  (`MOVEMENT_ILLEGAL { reason: "DRAGGED" }`, never offered), the Gibbering
  Mass's Drag ([section 26.4](RULESET_7_CURRENT.md#264-daemons-and-summon))
  for units afloat instead of on land. A landing (`DISEMBARK`) is not a
  Move and is not dragged; a Ram's shove and a Tractor Beam pull are not
  Moves either. The view shows the dragged ring as it does for a Mass.

### 9.4 Worked examples

| Exchange                                                 | Result                                                    |
| -------------------------------------------------------- | --------------------------------------------------------- |
| Kraken torpedoes a Battleship                            | 10; 0 (as the Submarine)                                  |
| a Galleon of the Eye sinks a transport carrying a Knight | 4 Favour                                                  |
| two Krakens sink a Battleship over two turns             | 8 Favour; the Battleship could move one tile between them |
| a Battleship next to a Kraken shoots it                  | 16: sunk (Drag does not stop a shot)                      |
| a transport next to a Kraken                             | sails one tile, or lands at once if land is beside it     |

### 9.5 Balance

- **No runaway.** Offerings pay half value and are capped at 30 with every
  other Favour; a Battleship sunk is 8, about two Horrors' worth, once.
  The Kraken is a Submarine for one Coin more whose Drag holds boats and
  transports; it still dies to a Battleship beside it and to two rams.
- **Counters.** Do not lose ships to the Cult at sea; kill Krakens with
  boats; land directly (a landing is not dragged); a Battleship dragged
  next to a Kraken shoots it.
- **Lever:** Offerings at a third, or Drag only on embarked units.

### 9.6 Normal AI

- **Offerings.** A kill afloat by an own ship adds the Favour (as Coins,
  the Cult policy's Favour value) to the exchange in the ram approach, the
  torpedo targets, and the Battleship station.
- **The Kraken.** It plays as a Submarine; in addition its routine Move
  values ending next to a hostile transport or Patrol Boat it can hold
  (Drag) when the existing safety rules allow the tile (never next to an
  untouched Battleship).
- **Against a Kraken.** The threat and route estimates give an own unit
  afloat that starts next to a visible hostile Kraken a Move of one tile;
  a transport does not end a routine Move next to a hostile Kraken unless
  it lands from there next turn.
- **Research.** Offerings by the Seamanship rule as it is.

Tests (`tests/unit/ruleset-v7-naval-cult-ai.test.ts`): a Black Gondola
that can sink a transport or chip a Battleship sinks the transport; a
Kraken ends its Move beside a hostile transport when safe; a Human
transport plans around a Kraken's Drag; Favour is counted in a torpedo
choice.

### 9.7 Art and sound

- **Kraken:** a new map sprite (a great indigo tentacled beast with one
  green eye and brass rings on two tentacles, the Cult palette), its
  submerged variant by `scripts/art/naval-branch/submerged.ts`, and a
  portrait. The accepted brass bathysphere-barrel stays in the manifest for
  the Classic fallback and is retired from the live look.
- Black Gondola and Galleon of the Eye are the accepted Cult Patrol Boat
  and Battleship under new labels.
- **Effects:** the Mass's drag ring drawn on water; the existing Favour
  pop for an Offering.
- **Icons:** Offerings to the Deep (a green candle over a wave).
- **Sound:** the existing Grab cue for a Drag and the Favour cue; one new
  ElevenLabs clip for the Kraken's torpedo (a deep wet lash), through the
  checked-in script.

### 9.8 As built (`pulp_wars-5ti.22`, `pulp-wars-poc-7r98`)

Built as above at identity `7r98` (`7r97` is a prior identity; the
autosave key is `pulpWars.save.v7r98.current`). Every row of 9.2 is a
registry value and every row of 9.4 an exact preview or result in
`tests/unit/ruleset-v7-naval-cult.test.ts`; the AI scenarios of 9.6 are
`tests/unit/ruleset-v7-naval-cult-ai.test.ts`. Where the build is more
precise than the text above:

- **Offerings to the Deep** is the unlock `DEEP_OFFERINGS` (capability
  `deepOfferings`) after `RAM` on the Cult Seamanship
  (`withSeamanshipUnlocksV7`). The rule is `deepOfferingFavourV7` (in
  `src/engine/v7/naval-cult.ts`): the killer is a ship in `NAVAL` form of a
  seat with Favour whose role has `DEEP_OFFERING` and whose kind's
  capabilities under its owner have `deepOfferings` (`deepOfferingOfV7`);
  the victim a unit afloat, no summoned unit, of a player hostile to the
  killer's; it pays `floor(value / DEEP_OFFERING_DIVISOR_V7)` of the
  Score's unit value. The reducer reads it for the attack's kill and the
  retaliation's kill of an `ATTACK` (after the daemon-kill Favour), never
  for a splash or blast victim, Plague, a bomb, the crush, or a Tentacle.
  `FAVOUR_GAINED` has the new source `DEEP_OFFERING` (appended to
  `FAVOUR_SOURCES_V7`), with the part above the cap `forfeited`.
- **No preview field.** The combat preview (and so `COMBAT_RESOLVED`) is
  unchanged: the public helper `previewDeepOfferingsV7` reads an attack's
  Offerings from the preview's deaths, the viewer's own research for its
  ship, and the public Favour for the cap, and the interface and the AI
  read it. Its result equals the reducer's (tested on an attack kill, a
  retaliation kill, and the cap).
- **Private research.** Offerings to the Deep is in no public stat. Another
  seat's Cult ship is assumed to have it (`previewDeepOfferingsV7` reads
  Shorecraft and Seamanship for it), as a hostile Ram is assumed: a Human
  boat that would sink to a Gondola's reply is told "Enemy Offering +2
  Favour".
- **Drag afloat** is `draggingKrakenV7`: a living Kraken (role mechanic
  `dragsAfloat`, `NAVAL` form, not on ice) beside a unit afloat of a player
  hostile to the Kraken's owner. Both movement validations read it beside
  the Mass's Drag (`dragged` is either), so the offered Moves equal the
  accepted ones; the public one reads the public ice. A Kraken is never
  Unbound (it is no daemon), so it drags only hostile units. Zones of
  control often end a Move beside a Kraken anyway; the Drag matters for a
  first step that leaves them (the 9.4 example is built with both Krakens
  on one side of the Battleship for that reason). The shove of a Ram and a
  landing are tested; a Tractor Beam pull is no `MOVE` and is not read.
- **The Kraken's registration.** The Cult `SUBMARINE` has the abilities
  `ATTACK`, `SUBMERGED`, `TORPEDO`, `DRAG`, `SEA_BEAST`, `DEEP_OFFERING`
  and the mechanics `seaBeast` and `dragsAfloat`. It takes the ordinary
  Promotion (it is trained and living; only a growing beast refuses it).
  `boardSeaBeastBlockedV7` already refused a Board of it and the Cult had
  no Board left to refuse.
- **The AI.** `deepOfferingTenthsV7` (in `src/ai/v7-naval.ts`) values an
  own ship's Offering at a Coin a Favour (`NAVAL_FAVOUR_TENTHS_V7` 10: the
  Cult policy turns 2 Coins into 2 Favour with a Sacrificed Initiate), only
  the part below the cap. The attack scorer adds it on its Coins-x-4 scale;
  the ram approach and the Galleon's station add it (the station a fifth,
  as the risen Ghost Ship); `deepOfferingTorpedoPriorityV7` (priority 1280,
  in `src/ai/v7-naval-cult.ts`) fires a Kraken's torpedo kill for Favour
  before a chip on a capital ship (a Patrol Boat's 5 Coins and 2 Favour
  over a Battleship chip's 6.4), unless another of its torpedoes is worth
  as much or another own Submarine follows. At the cap it torpedoes the
  Battleship. The integration with the summon and Herald plan needs no
  rule: that plan reads the seat's Favour at every decision, so what a sea
  kill pays is spent on the same turn, and the cap rule (spend from 26)
  sees it.
- **The Kraken holds (AI).** `navalKrakenHoldValueV7`: a Move of an own
  Kraken to a tile beside more hostile units afloat that it would hold (a
  transport 16, a Patrol Boat 10) than it holds where it stands, priority
  836, never beside a visible hostile Battleship, never on ice, and never
  where the visible enemy's danger reaches its HP; the Submarine safety
  rules still refuse what they refused.
- **Against a Kraken (AI).** The threat reach of a unit afloat beside a
  visible Kraken hostile to it is one step (`navalKrakenDraggedV7`, the
  engine's `publicDraggingKrakenV7`, read where Stuck is). An own
  transport's Move (or an embarking) that ends beside a hostile Kraken it
  is not already beside is refused unless a free explored land tile is
  beside the end (`navalKrakenTransportMoveRejectedV7`); a landing is never
  refused. "The route estimates" are the offered Moves themselves, which
  the engine already limits to one tile.
- **Text.** The glossary has a `DEEP_OFFERING` entry ("Offering to the
  Deep") on the three ships and a `DRAG_AFLOAT` entry ("Drag", the Mass's
  name: one mechanic pointed at the sea) on the Kraken, and the existing
  `SEA_BEAST`. The Offerings to the Deep card says "Offerings to the Deep:
  What your ships sink feeds the Ancient Ones: half its value in Favour",
  the Black Gondolas card names the Gondola's Bow Ram, and the Kraken card
  reads "Kraken: hit only from the next tile; torpedo with no strike-back;
  Drag; never boarded". The attack preview says "Offering +4 Favour" (with
  "(3 lost)" at the cap) and "Enemy Offering +2 Favour". A unit afloat a
  Kraken drags has the Mass's "Dragged" chip ("A Kraken beside it: it can
  move only one tile") and the Dragged ring on its Moves, and every visible
  Kraken that drags has the Mass's ooze ring drawn on its own tile and the
  open water beside it. A viewer's Offering is announced as "an Offering to
  the Deep" in the Favour source labels. The Cult has no faction Help list,
  so no "At sea" line was added.
- **Art.** The Kraken's map sprite and portrait are redrawn in place (same
  asset IDs, subject keys `…/KRAKEN`), edits of the accepted gondola and
  bathysphere through the `cult-lodge` accent; the submerged Kraken is
  derived by `submerged.ts`; the bathysphere stays in the batch records as
  history (the Classic look draws the shared Submarine, so no Classic
  fallback needed it). Offerings to the Deep has its own icon
  (`ICON:TECH:CULT:SEAMANSHIP`, `chibi-naval-cult-icon-tech-seamanship`,
  batch `naval-cult`); the Black Gondolas and The Kraken cards show the
  ships' portraits. The Cult joins the Submarine sheet and scene of
  `art:chibi-naval-faction-review`. See
  [NAVAL_FACTIONS.md](../art/NAVAL_FACTIONS.md#the-cult-kraken-and-offerings-to-the-deep-bead-pulp_wars-5ti22).
- **Sound.** One new ElevenLabs clip, `attack.kraken` (a deep wet lash of a
  tentacle), played in place of the melee swing when a Kraken attacks
  (`seaBeastAttacksV7` now names the beast's own sound); five takes in two
  rounds, three kept ([ELEVENLABS_SFX.md](../audio/ELEVENLABS_SFX.md)).
  The text above names "the existing Grab cue for a Drag and the Favour
  cue": the Drag is no event (as for the Mass), so it has no cue, and a
  Favour gain has its existing pop (it flies from the sunk unit's tile, as
  every Favour paid for a death) and no sound of its own.

## 10. Role coverage at a glance

| Faction  | Transport of land units                         | Coastal support                                  | Naval combat                                                      |
| -------- | ----------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------- |
| Human    | transport; Ram shoves landings off              | Battleship                                       | Patrol Boat (Ram), Submarine, Battleship; Board                   |
| Goblin   | transport; Gang Up counts ships beside a target | Scrap Dreadnought; Fire Raft Kaboom on the beach | Fire Raft (Ram, Kaboom), Diving Barrel, Dreadnought (death blast) |
| Undead   | transport                                       | Plague Galleon (Plague with Pestilence)          | Ghost Ship, Sunken Galley, Galleon; Drowned Crews                 |
| Dinosaur | transport                                       | War Raft                                         | Dugout (Horned Prow), Plesiosaur (grows), War Raft; Board         |
| Martian  | transport; **Hover Pods** off any beach         | Hover Cruiser (shielded)                         | Skimmer, Bathysphere, Cruiser, all shielded                       |
| Dwarf    | transport; **Sea Tunnels** under the strait     | Ironclad (Armoured)                              | Steam Launch, Diving Bell, Ironclad, all Armoured                 |
| Candy    | transport                                       | Pie Galleon (Splat)                              | Gumdrop Tug, Choco Sub, Galleon, all Rushing                      |
| Cult     | transport                                       | Galleon of the Eye                               | Black Gondola, Kraken (Drag), Galleon; Offerings                  |
| Ice Folk | the ice bridge and the slide                    | Black Ice traps, the slide to the edge           | Icebound and the crush                                            |

Every seafaring faction keeps the triangle (a ranged capital ship, an
unanswered hunter, and rammers), so the Normal AI's training counter
(`navalCounterRoleV7`) and the transport and Submarine safety rules hold
for all of them.

## 11. Ice Folk: done

The frozen sea ([current rules section 21.16](RULESET_7_CURRENT.md#2116-the-frozen-sea))
already gives the Ice Folk the three roles in their own way and was built,
AI included (`pulp_wars-5ti.3`, `5ti.5`). Nothing small is clearly worth
adding, so nothing changes for them. How the new ships meet their ice,
all from existing rules:

- Icebound freezes any unit afloat, so a Plesiosaur and a Kraken are
  frozen at the surface like any Submarine, and a frozen Kraken does not
  Drag.
- Martian Shields absorb the crush first; Dwarf Armoured does not reduce
  it.
- An icebound Fire Raft cannot Kaboom and an icebound Candy ship cannot
  Rush (the new `ICEBOUND` reasons); a Dreadnought crushed to death does
  not explode.
- Sea Tunnels never pass under ice; a Hover Pod never launches onto ice
  (a Martian foot unit simply walks onto it and slips).
- Drowned Crews never raise a ship on an ice tile.

## 12. Interface, text, and sound for every bead

- **Technology cards:** the faction's five names (sections 3.1 to 9.1);
  the unit cards show the faction's ship portraits; the Seamanship card
  lists the Ram and the trick in one sentence each.
- **Help sentences** in `src/render/unit-glossary-v7.ts`: the quoted
  sentence of each mechanic above; "Horned Prow" replaces "Bow Ram" on the
  Dugout; `SEA_BEAST` "A living beast: it cannot be boarded".
- **Previews:** the Ram row shows its bonus (+1, or +1.5 for a Horned
  Prow run); the attack preview shows "rises as your Ghost Ship", "+N
  Favour", "Splat", and the blast ring of a Dreadnought kill; Kaboom,
  Rush, and Tunnel keep their existing controls (a dock button for Kaboom
  and Rush, board targeting for the Tunnel); a hover launch is an ordinary
  movement destination on water.
- **Targets on the board:** nothing new is a per-target button list.
- **Motion:** every new effect has its reduced-motion form.
- **Sound:** existing cues except the two new clips (Plesiosaur, Kraken),
  generated through the checked-in ElevenLabs script with their recipe and
  provenance in the sound manifest.

## 13. Implementation order and beads

The user's order is one faction at a time, Humans first (done), then
Goblins, then Undead, then the others: **Goblins, Undead, Dinosaurs,
Martians, Dwarves, Candy, Cult.** After the first two the order follows
the factions' age, so the older AI modules come first.

Every bead below:

- is engine, Normal AI, interface, text, and art for one faction, together;
- takes the **next free ruleset identity** when it starts (the previous
  identity appended to `PRIOR_RULESET_7_IDS`, rejected in setups, states,
  saves, and replays, the autosave key renamed and the obsolete one
  deleted, the identity pins of the unit tests moved, and
  [the current rules](RULESET_7_CURRENT.md) updated: the identity paragraph,
  the faction's roster table, section 14's faction bullet, and the
  technology display-name table), and records its as-built notes in this
  document;
- classifies every new reader of units or factions in
  `tests/fixtures/v7-kind-reader-classes.ts` and
  `tests/fixtures/v7-unit-reader-classes.ts` and the form-audit counts;
- refreshes the Showcase pins for that faction (its Coast city's ships
  have the new numbers; Martian ships have Shield entries);
- leaves the simulation pins (`*.sim.test.ts`) stale without running them
  and lists the ones it expects moved (`pulp_wars-b5pd`): at least
  `ruleset-v7-naval-ai.sim.test.ts`,
  `ruleset-v7-naval-branch-headless.sim.test.ts`,
  `ruleset-v7-revision18-showcase.sim.test.ts`, and the faction's own
  `*.sim.test.ts`;
- uses validation profile **`ai/map/persistence`, without simulations**,
  plus the `asset-only` art gates: the worker runs the focused tests named
  below, `npm run typecheck`, `npm run lint`, `npm run format:check`, and
  `git diff --check`; the root runs `npm run format:check`,
  `npm run lint`, `npm run typecheck`, `npm run test:unit`,
  `npm run build`, `npm run art:validate`, the naval asset tests, and
  `npm run art:chibi-naval-faction-review` (evidence inspected); `npm run
test:sim`, `npm run validate:ruleset7-release`, and the browser smoke
  that plays a match are skipped by the standing rule and the skip is
  recorded in the bead.

Focused tests every bead runs: its new engine and AI test files, and
`ruleset-v7-naval-branch-ram.test.ts`, `ruleset-v7-naval-branch-board.test.ts`,
`ruleset-v7-naval-branch-submarine.test.ts`,
`ruleset-v7-naval-branch-harbours.test.ts`,
`ruleset-v7-naval-branch-identity.test.ts`,
`ruleset-v7-naval-branch-persistence.test.ts`,
`ruleset-v7-naval-branch-ai.test.ts`, `ruleset-v7-naval-ai.test.ts`,
`ruleset-v7-naval-combat.test.ts`, `ruleset-v7-naval-public.test.ts`,
`ruleset-v7-revision18-showcase.test.ts`,
`ruleset-v7-owner-readers.test.ts`,
`ruleset-v7-mind-control-kind-readers.test.ts`,
`ruleset-v7-dinosaur-form-audit.test.ts`,
`ruleset-v7-dwarf-unit-readers.test.ts`,
`naval-presentation-render-v7.test.ts`, `unit-glossary-ui-v7.test.ts`,
`interface-style-ui-v7.test.ts`, `chibi-naval-faction-assets.test.ts`,
`chibi-naval-branch-assets.test.ts`, and the identity pin tests that name
the previous identity (found by searching `tests/unit` for it).

### 13.1 Goblins: the Scrap Fleet (first; carries the shared plumbing)

- **Scope:** [section 2](#2-shared-rules-for-every-faction-branch) (the
  per-faction ship tables, the Seamanship override, the display names, the
  prize rule, the `seaBeast` rule with no user yet, the rewritten faction
  bullets of current rules section 14); then section 3: the Goblin ship
  numbers and labels, `FIRE_RAFTS`/`fireRafts`, the naval Kaboom gate with
  `ICEBOUND`, the Dreadnought death blast with the board and crush
  exceptions; the Goblin AI rules of 3.6; the glossary and card text; the
  Fire Raft sprite and portrait and the Powder Kegs icon.
- **Acceptance:** every row of the tables of 3.2 and 3.4 as a registry
  value or an exact preview; a naval Kaboom accepted and rejected per the
  rules; the death blast from each death cause and none when boarded or
  crushed; a prize's maximum HP under its new kind; offered equals
  accepted for Kaboom afloat; the AI scenarios of 3.6; art reviewed at
  native and x4 size.
- **Focused tests:** the common list plus
  `tests/unit/ruleset-v7-naval-goblin.test.ts`,
  `tests/unit/ruleset-v7-naval-goblin-ai.test.ts`,
  `ruleset-v7-goblin-explosions.test.ts`, `ruleset-v7-goblin-rules.test.ts`,
  `ruleset-v7-goblin-ai.test.ts`, `ruleset-v7-goblin-faction.test.ts`.

### 13.2 Undead: the Drowned Fleet

- **Scope:** section 4: labels; `DROWNED_CREWS`/`drownedCrews` and the
  naval Infect step (`DROWNED_CREW_HP_V7` 5, the exclusions, `DROWNED_CREW`
  literal); `PLAGUE` on the Undead Battleship; the AI of 4.6 (rising
  value, plague value for any plaguing attacker, Pestilence for a Galleon
  seat); text; the Drowned Crews icon and the rising effect on water.
- **Acceptance:** the rising on attack and retaliation kills by each Undead
  ship, and none from splash, blasts, Plague, transports, ice, or Deep
  Water without Navigation; preview `defenderInfected` equals the result;
  Galleon plague with and without Pestilence; the AI scenarios of 4.6.
- **Focused tests:** the common list plus
  `tests/unit/ruleset-v7-naval-undead.test.ts`,
  `tests/unit/ruleset-v7-naval-undead-ai.test.ts`,
  `ruleset-v7-undead-ai.test.ts`, and the Undead Infect and Plague unit
  tests (`tests/unit/ruleset-v7-undead-*.test.ts` that name Infect or
  Plague).

### 13.3 Dinosaurs: Horned Prows and the Plesiosaur

- **Scope:** section 5: labels; `ramRunUpBonus2` and its preview and
  estimate; the Plesiosaur role with `GROW`, `seaBeast`, and the Dinosaur
  stats block for a ship; the Dinosaur seat's Board refusal on Submarines;
  the AI of 5.6 (real path lengths in the ram approach, growth value in
  torpedo targets); text; the Plesiosaur sprite, submerged variant, and
  portrait, the Dugout edit, the Horned Prows icon, the Plesiosaur clip.
- **Acceptance:** the ram bonus at path lengths 1 and 2 and on an
  interrupted Move; Plesiosaur growth from torpedo and retaliation kills,
  state parsing of its maximum HP against kills, no Promotion; no `BOARD`
  on or by a Submarine-role ship as stated; Pack Hunt, Wallbreaker, War
  Drums, and the Shaman's Tend unchanged for it; the AI scenarios of 5.6.
- **Focused tests:** the common list plus
  `tests/unit/ruleset-v7-naval-dinosaur.test.ts`,
  `tests/unit/ruleset-v7-naval-dinosaur-ai.test.ts`, and the Dinosaur
  growth and Charge! unit tests.

### 13.4 Martians: the Hover Fleet

- **Scope:** section 6: ship numbers and Shields (training creates the
  entry; the stats block); `HOVER_PODS`/`hoverPods` and the last-step launch
  in both movement validations (canonical and public) and the movement
  query; the AI of 6.6 (launch starts in the naval plan, research, Shield
  in the ship threat estimate); text; the Hover Pods icon and the Shield
  bubble on hulls.
- **Acceptance:** a launch from land to free Shallow Water accepted and
  offered, refused onto Deep Water, ice, a dock, an occupied tile, or
  mid-Move; a launched unit exhausted and embarked; Thrall rules; Shields
  on ships created, absorbing, recharging, and lost or gained on a prize;
  the AI scenarios of 6.6.
- **Focused tests:** the common list plus
  `tests/unit/ruleset-v7-naval-martian.test.ts`,
  `tests/unit/ruleset-v7-naval-martian-ai.test.ts`,
  `tests/unit/ruleset-v7-naval-transport.test.ts`, and the Martian Shield
  and movement unit tests.

### 13.5 Dwarves: Ironclads and Sea Tunnels

- **Scope:** section 7: ship numbers with `armourReduction` and the
  `ARMOURED` literal; `SEA_TUNNELS`/`seaTunnels` in the Tunnel's row 6 and
  the command query; the AI of 7.6 (sea tunnels as landings, research);
  text; the Sea Tunnels icon.
- **Acceptance:** Armoured on every damage source listed and not on the
  crush; tunnels under one and two Shallow tiles accepted and offered,
  refused under Deep Water, ice, or ending on water; the rider; the AI
  scenarios of 7.6.
- **Focused tests:** the common list plus
  `tests/unit/ruleset-v7-naval-dwarf.test.ts`,
  `tests/unit/ruleset-v7-naval-dwarf-ai.test.ts`, and the Dwarf Tunnel and
  AI unit tests.

### 13.6 Candy: Sugar Sails

- **Scope:** section 8: labels and the Galleon's price; `SPLAT` on the
  Candy Battleship and the form gate; `SUGAR_SAILS`/`sugarSails`, the Rush
  gate, the Move and Attack bonuses afloat, and the Crash of ships; the AI
  of 8.6 (Rush at sea, Splat keyed to the ability); text; the Sugar Sails
  icon and the Rush and Crash effects on ships.
- **Acceptance:** Rush legality afloat with and without Sugar Sails,
  embarked and icebound refusals; +1 Move and +1 Attack, the Crash, and
  Home Sweet Home for ships; Splat from the Galleon on its primary target
  only; previews equal results; the AI scenarios of 8.6.
- **Focused tests:** the common list plus
  `tests/unit/ruleset-v7-naval-candy.test.ts`,
  `tests/unit/ruleset-v7-naval-candy-ai.test.ts`, and the Candy Rush and
  Splat unit tests.

### 13.7 Cult: the Deep Ones

- **Scope:** section 9: labels; `DEEP_OFFERINGS`/`deepOfferings` and the
  `DEEP_OFFERING` Favour source; the Kraken role with `dragsAfloat` and
  `seaBeast`; the AI of 9.6; text; the Kraken sprite, submerged variant,
  and portrait, the Offerings icon, the Kraken clip.
- **Acceptance:** Favour from attack and retaliation kills afloat at half
  value and capped, none from splash or blasts; Drag afloat in both
  movement validations and the query, not on a landing, a shove, or a
  pull, not from an icebound Kraken; no `BOARD` for the Cult and none on a
  Kraken; the AI scenarios of 9.6.
- **Focused tests:** the common list plus
  `tests/unit/ruleset-v7-naval-cult.test.ts`,
  `tests/unit/ruleset-v7-naval-cult-ai.test.ts`,
  `ruleset-v7-cult-favour.test.ts`, `ruleset-v7-cult-mass.test.ts`.

## 14. Decisions made in this design

1. Keep the five technology IDs and three ship roles for everyone; change
   names, numbers, abilities, and the Seamanship trick.
2. Seamanship is the Ram plus one trick; Board stays only for the Humans
   and the Dinosaurs.
3. Goblins blow ships up (Fire Raft Kaboom, Dreadnought death blast) and
   build cheaper, flimsier hulls.
4. Undead raise what they sink (Drowned Crews, a 5-HP Ghost Ship) and
   plague the coast (Galleon with Pestilence).
5. Dinosaurs charge (Horned Prow, +1.5 after a two-tile run) and grow a
   Plesiosaur; the earlier "a log, not an animal" art ruling is overruled
   for this one unit.
6. Martians get Shields on lower-HP hulls and Hover Pods for foot units.
7. Dwarves get Armoured hulls at a higher price and Sea Tunnels for Moles.
8. Candy ships Rush (Sugar Sails) and the Galleon Splats, at 17 Coins.
9. The Cult earns half value in Favour for kills at sea and trains a
   Kraken that Drags units afloat.
10. Sea beasts are never boarded, and a seat whose Submarine is a beast
    never boards one.
11. A prize takes its new kind's maximum HP.
12. The Ice Folk change nothing.
13. The order is Goblins, Undead, Dinosaurs, Martians, Dwarves, Candy,
    Cult; the Goblin bead carries the shared plumbing.
14. No number here was simulated; the levers are named in each balance
    section for hand-play tuning.

## 15. Open questions

None blocking. The root may revisit decision 2 (whether the six factions
that trade Board away should keep it as well) after the first hand-played
games.
