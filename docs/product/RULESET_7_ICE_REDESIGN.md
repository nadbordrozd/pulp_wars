# Ruleset 7: the frozen sea, redesigned

**Status:** design of bead `pulp_wars-5ti.24` (epic `pulp_wars-5ti`),
written on 2026-10-18 over the rules as built at `pulp-wars-poc-7r98`.
**Bead A (the engine and rules, `pulp_wars-5ti.25`) is built at
`pulp-wars-poc-7r100`** ([section 8](#8-bead-a-as-built-pulp_wars-5ti25)):
[current rules section 21.16](RULESET_7_CURRENT.md#2116-the-frozen-sea)
now states the game, section 8 of the
[naval branch overlay](RULESET_7_NAVAL_BRANCH.md#8-ice-folk-the-frozen-sea)
is history, and section 11 of the
[themed naval branches](RULESET_7_NAVAL_FACTIONS.md#11-ice-folk-done)
("Ice Folk: done") is no longer true. Bead B (the AI,
[section 9](#9-bead-b-as-built-pulp_wars-5ti26)) and bead C (interface,
art, and sound, [section 10](#10-bead-c-as-built-pulp_wars-5ti27)) are
built. No game was played or simulated to write or
build it (the user's standing rule); every number is a first guess for
hand-play tuning.

The user's request, 2026-10-18, verbatim:

> the water freezing mechanics by the ice foik are a mess. for one thing,
> it seems you can only build port on water but not on ice so they when
> they freeze water they limit themeselves. they should be able to build
> their port-equivalent building on ice. for another, they should be able
> to build other stuff like workshop on ice - that's their whole thing.
> secondly, having to always freeze ice to move on it because it keeps
> cracking is such a chore. ice should stay by default. other factions
> should have the option to crack ice around them. and perhaps they need a
> specialised unit for ice combat? then again sled is already that. just
> rethink the whole thing and reimplement.

Standing rulings that shaped it: beta first, then balance; keep situational
overpowered combos and gate by technology rather than nerf; player
experience over AI-vs-AI; no upkeep chores; screen real estate matters;
targets are picked on the board with the four highlight styles of
[board targeting](../ui/BOARD_TARGETING.md#2-the-highlight-vocabulary); no
new Coin sinks.

## The decisions to look at first

Each can be overruled without unpicking the rest.

1. **Ice is permanent.** Frozen water stays ice until somebody cracks it.
   There is no countdown, no thaw, and no "a land unit holds the ice". The
   stored `turnsLeft` goes away.
2. **Everyone but the Ice Folk can Crack Ice.** A new primary action of
   every land unit of the other eight factions and of every ship: break
   one adjacent ice tile back into open water. Free, no technology. It
   cannot break ice that a land unit stands on or that carries a
   building. It frees a ship frozen in.
3. **The Ice Folk build on their ice.** Their Port is the **Ice Harbour**
   (Shipyard: **Great Harbour**), built on their own ice or on open
   shallows, which it freezes. Windmill, Sawmill, Forge, Workshop, Market
   and Monument may stand on own ice in own territory under their usual
   rules, and a new basic building, the **Fishing Hole** (Rime, 3 Coins,
   +1 population, counts as a Farm for mills and Markets), gives the ice
   its own contributor, as the Lumber Camp is the Forest's.
4. **Glacier becomes thick ice.** It no longer lengthens the ice's life
   (there is none to lengthen); the seat's ice takes **two** Cracks to
   break, and a Freeze mends a crack. Its Snow cover, +1 Move across ice
   and Harbours stay.
5. **Black Ice freezes on entry, once.** An enemy that ends its own Move,
   landing or Beam Down on Ice Folk ice, coming from off that ice, is
   Frozen at once. With permanent ice the old rule (Frozen again at every
   Ice Folk Start Turn) would lock a unit on the ice forever; the new one
   never does.
6. **The Sled is the ice unit; no new unit.** It gains **Runners**: its
   slide is not stopped by zones of control. The roster stays nine.
7. **Freeze offers only what changes something.** A line passes over the
   actor's own sound ice instead of "refreshing" it, so the button never
   offers a wasted action.
8. **Ice in a captured city's territory passes to the captor** with the
   city; ships frozen in by an eliminated seat float free.
9. **One new improvement, one new command each for building and cracking,
   one new event.** Everything else is a change of an existing rule.

## 1. The current system as coded

From `src/engine/v7/ice.ts`, the `FREEZE` and `BUILD_PORT` paths of
`src/engine/v7/reducer.ts`, `ICE_FOLK_NAVAL_UNLOCKS_V7` in
`src/engine/rules/ruleset-v7.ts`, `src/ai/v7-frozen-sea.ts`,
`src/render/frozen-sea-presentation-v7.ts`, and
[current rules section 21.16](RULESET_7_CURRENT.md#2116-the-frozen-sea).
Code and documentation agree on every point below.

### 1.1 What freezes

| Fact             | As coded                                                                                                                                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| State            | `GameStateV7.ice: { at, ownerId, turnsLeft }[]`, a layer over a water tile; terrain never changes                                                                                                                                                                  |
| Who freezes      | `FREEZE { unitId, at }`, a primary action of all eight Ice Folk land roles (Sabretooth and Frost Giant included), free                                                                                                                                             |
| Shape            | a line of `FREEZE_LINE_V7` 2 tiles from an adjacent tile outward; the Ice Witch a ring of radius 1 (`WITCH_FREEZE_RADIUS_V7`) around her                                                                                                                           |
| Freezable        | explored water, not a Port or Shipyard, Shallow (Rime) or Deep (Pack Ice), and empty, or already ice (any occupant: a "refresh"), or a hostile ship with Icebound; a line stops at the first tile it cannot take and after a ship                                  |
| Result           | each tile gets `turnsLeft` `ICE_TURNS_V7` 3 (Glacier: `GLACIER_ICE_TURNS_V7` 5), replacing any entry and its owner                                                                                                                                                 |
| Thaw             | at the End Turn of the owner, every entry outside the owner's territory loses one turn; at 0 it melts unless a land-form unit stands on it; inside the owner's territory (the 3 x 3 footprint, 5 x 5 after a Land Grant) it never counts down (`iceIsPermanentV7`) |
| Eliminated owner | its ice counts down at every End Turn and melts                                                                                                                                                                                                                    |

### 1.2 Movement and fighting on ice

- **Ground for land units, closed to ships.** Every land-form unit may
  stand on ice; nothing afloat may enter it.
- **Slide.** An Ice Folk unit (not the Sabretooth) that steps onto ice
  continues straight, free, until the ice ends, a unit or mound blocks, or
  it stands in a hostile zone of control; the slide is forced
  (`SLIDE_FORCED`). Leaving ice costs a full point.
- **Slip.** Every other ground unit's Move ends on entering ice
  (`ICE_STOPS_MOVE`); Martian walkers and flyers and the Gyrocopter cross
  it like land.
- **Black Ice** (Seamanship): at every Start Turn of the seat, every
  hostile land unit on its ice is Frozen. No thaw immunity.
- **Icebound** (Naval Engineering): a Freeze over a hostile ship locks it:
  no Move, Attack, Board, retaliation or ZOC; **the crush** deals
  `ICE_CRUSH_DAMAGE_V7` 3 at each Start Turn of the ice's owner (Shields
  first, never reduced by Armoured). It floats free when its ice melts.
- **Glacier** (Submersibles): `iceTurns` 5, Snow cover (× 1.25) for Ice
  Folk units on ice, +1 Move on a Move that touches ice
  (`GLACIER_ICE_MOVE_BONUS_V7`), and Harbours.
- A death on ice is a water death (no Grave, rising or Crumbs); no cover,
  fortification, Road, Egg, mound or Snow on ice.

### 1.3 Building on ice and water

- **Port** (Rime for the Ice Folk, 4 Coins): only on owned **open**
  Shallow Water beside land of the same city; `INVALID_TILE` on ice
  (`reducer.ts`, "no Port on ice"). Shipyard (Icebound for the Ice Folk)
  upgrades it; for them it only adds population, since they train no
  ships.
- **Docks never freeze** (`freezableV7` refuses Port and Shipyard).
- **No building of any kind on ice**: every land building's placement
  starts with `tile.biome === null → INVALID_TILE`, and ice is water.
- Fish on ice may be harvested; Pearls gathered; sea links run under ice.

### 1.4 Other factions against the ice

- They may walk on it, one tile per turn (slip), and are Frozen by Black
  Ice while they stand on it.
- They cannot break, melt or remove it. Their only answers are to wait for
  the thaw (never, in Ice Folk territory) or to kill the land unit that
  holds a melting tile.
- Their ships cannot enter it and may be frozen into it.

### 1.5 What makes it a chore and self-limiting

1. **Freezing the shore kills the Port.** The Ice Folk's first act with
   Rime is to freeze the shallows, and every frozen shallow tile stops
   being a Port site. The AI even carries a guard against it:
   `iceFreezeScoreV7` withholds home ice "over a Port site on offer of a
   city that has no dock yet" (`src/ai/v7-frozen-sea.ts`). A rule the AI
   has to tiptoe around is a rule a player trips over.
2. **A Port is a hole in the ice.** Docks never freeze and an Ice Folk
   unit never stands on a dock, so the seat's own Port is a tile its own
   units cannot cross or slide through, in the middle of its own ice.
3. **Frozen territory is dead territory.** Water in a city's footprint
   gives nothing once frozen (no Port, no building), so the Ice Folk
   lose economy by doing the thing their faction is about.
4. **Ice outside the 3 x 3 home footprint melts after 3 turns** (5 with
   Glacier) unless re-Frozen or stood on. Keeping a crossing open costs a
   unit's primary action every two or three turns, forever: the "always
   freeze ice to move on it" chore. The AI has a whole priority for it
   (`ICE_REFREEZE_PRIORITY_V7`). Every Freeze target says "3 turns", every
   ice tile wears melting cracks and a countdown.
5. **Refresh is offered as a Freeze.** A tile that is already ice is a
   legal Freeze target, so the dock offers actions whose only effect is to
   reset a countdown.
6. **Other factions have no agency.** They can only wait for melting or
   kill the holder; the user wants them to be able to crack it.
7. **Black Ice is a soft lock at home.** Home ice never melts and Black
   Ice re-freezes at every Start Turn, so an enemy that stands on it can
   never leave by itself (only a Tend Wounded or a Repair thaws it). With
   permanent ice everywhere this would become a hard lock.

## 2. The new design

### 2.1 The idea in one paragraph

With **Rime** the Ice Folk freeze the sea, and **the ice stays**. Their
units slide across it; their cities build on it (an Ice Harbour, Fishing
Holes, and their mills and markets), so frozen home water is new land, not
lost water. Everyone else may walk on it slowly, and every other unit, and
every ship, may **Crack** the ice next to it back into open water, which
is how a navy cuts a lane, frees a frozen ship, or breaks a bridge before
the Yetis slide over it. **Pack Ice** freezes the deep sea, **Black Ice**
freezes whoever steps onto the ice, **Icebound** locks ships in to be
crushed, and **Glacier** makes the ice thick enough to take two Cracks.

### 2.2 One sentence per rule

| Rule      | One sentence                                                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Freeze    | A unit turns the water next to it to ice, two tiles out in a line; the Witch freezes every tile around her.                       |
| Ice stays | Ice never melts; it is gone only when someone cracks it.                                                                          |
| Slide     | An Ice Folk unit that steps onto ice slides straight on until the ice ends, a unit blocks it, or an enemy's zone of control.      |
| Runners   | A Sled's slide is not stopped by zones of control.                                                                                |
| Slip      | Any other unit may walk onto ice, but its Move ends there.                                                                        |
| Crack Ice | Any other unit or ship next to ice may break one tile of it back into water, unless a unit stands on it or it is built on.        |
| Build     | The Ice Folk build their Ice Harbour, Fishing Holes, mills, Workshop, Market and Monument on their own ice.                       |
| No ships  | Ships cannot enter ice; the Ice Folk have no ships at all.                                                                        |
| Black Ice | An enemy that steps onto your ice is Frozen.                                                                                      |
| Icebound  | Freeze a ship in place: it cannot sail, shoot, or strike back, and the ice crushes it for 3 each turn until it sinks or is freed. |
| Glacier   | Your ice is thick (two Cracks to break), your units on it have Snow cover, and a Move across ice gets +1 Move.                    |

### 2.3 Ice tiles

**State.** `GameStateV7.ice: { at, ownerId, cracked }[]`, sorted by
`(y, x)`, hashed, saved and replayed. `turnsLeft` is removed. `cracked` is
true only on thick ice that has taken one Crack. State parsing rejects an
entry off the board or on land, a duplicate or unsorted entry, an
`ownerId` that is not a player of the match, any entry in a match without
an Ice Folk seat, and `cracked` true on ice whose owner does not have
thick ice. Ice **may** now lie on a Port or Shipyard tile (an Ice Harbour,
[section 2.6](#26-building-on-ice)); an afloat unit on ice is icebound, as
before.

**View.** `PlayerViewV7.ice` lists the entries on explored tiles as
`{ at, ownerId, cracked, thick }`; `permanent` and `turnsLeft` are
removed. `thick` is the owner's Glacier capability, read through
`technologyCapabilitiesV7`. Publishing it reveals the owner's Glacier,
which the public `iceCover` unit stat already does, so every Crack
preview is exact.

**Permanence.** Ice has no countdown. The End Turn thaw step is deleted;
an entry leaves the list only by a Crack or by the elimination release
below (a Redevelop or a Pillage removes the building and leaves the ice).
Nothing anyone does keeps ice alive, so nothing has to be done.

**Ownership.**

- A Freeze makes or takes the tile for the actor's owner (as today).
- **Capture.** When a city changes owner, every ice entry of the former
  owner on that city's territory passes to the captor, with `cracked`
  reset to false. Ice elsewhere keeps its owner. So "your city's ice is
  yours": a captor is never Frozen by Black Ice inside its own new city.
- **Elimination.** An eliminated seat's ice stays. Every icebound unit on
  it floats free at once (its tile melts; event `ICE_MELTED`, kept for
  this one use), since no one is left to crush it. The rest is crackable
  by every other player with one Crack (an eliminated owner has no thick
  ice).

**What ice is** for every unit, unchanged unless named:

- Ground for every land-form unit of every faction and movement mode
  (`canEnterTerrainV7`); closed to every unit afloat. Ice projects ZOC as
  land; ships project none onto it.
- No terrain cover (Glacier's Snow cover for the Ice Folk aside), no
  fortification, never Snow, no Road, Field Defense, Grave, Egg, mound,
  Crumbs, chest, reward or treasure unit.
- **New:** it carries Ice Folk buildings
  ([section 2.6](#26-building-on-ice)).
- A death on ice is still a water death.
- It counts as water for sea links (they run under or over it) and for
  map generation (untouched).
- It is **not** land for Roads: the slide is the Ice Folk road. It is not
  land for the Port shore rule (a harbour needs real land of its city
  beside it). It is ordinary territory: a city's footprint and a Land
  Grant claim water and ice alike, as they claim water today.

### 2.4 Freeze

`FREEZE { kind, unitId, at }` is unchanged as a command: a primary action
of every Ice Folk land role, free, not an attack, `TECH_REQUIRED
{ tech: "SHORECRAFT" }` without Rime. Legality rows 1 to 6 of today stay.
What changes is the freeze set:

A tile is **freezable** when it is on the board, explored by the actor,
water (Shallow, or Deep with Pack Ice), and one of:

| Tile                                                | Freeze does                                                 |
| --------------------------------------------------- | ----------------------------------------------------------- |
| open water with no unit, not a dock                 | makes ice                                                   |
| open water holding the actor's own Port or Shipyard | makes ice under it (a captured dock becomes an Ice Harbour) |
| open water holding a hostile ship, with Icebound    | makes ice and locks the ship in (icebound)                  |
| ice of another player (any occupant)                | takes it for the actor (`cracked` false)                    |
| the actor's own **cracked** ice (any occupant)      | mends the crack                                             |
| the actor's own sound ice                           | **nothing: passed over** (not taken, not offered)           |

- **A line** (every role but the Witch, `FREEZE_LINE_V7` 2): the two tiles
  `at` and the one beyond it, outward from the unit. Each is taken if
  freezable; the actor's own sound ice is passed over and the line goes
  on; any other tile ends the line, and so does a tile that held a ship.
  So a Yeti on a shore with one tile of its ice in front freezes the
  second tile, and a unit at the tip of a bridge freezes the next two.
- **A ring** (the Ice Witch, radius 1): every freezable tile around her,
  her own included when she stands on cracked or foreign ice.
- **Empty set: not offered** (`FREEZE_NOT_LEGAL { reason: "NO_TARGET" }`).
  The dock never offers a Freeze that changes nothing.
- **Result:** each taken tile gets `{ at, ownerId: actor, cracked: false }`.
  Event `WATER_FROZEN { playerId, unitId, tiles, icebound }` unchanged.
  `previewFreezeV7` returns `{ unitId, tiles, mended, taken, icebound }`
  (`refreshed`, `turns` and `permanent` removed).
- **Hostile docks never freeze**, so no Port of another player can be
  frozen shut.

### 2.5 Technologies

The five Ice Folk naval nodes keep their IDs, tiers, prerequisites and
prices.

| Tier | ID                  | Ice Folk name | Unlocks (new in bold)                                                                                                                   | One sentence                                                             |
| ---: | ------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
|    1 | `SHORECRAFT`        | Rime          | Freeze Shallow Water; Harvest Fish; **Ice Harbour** (on shallows or ice); **Fishing Hole**; sea links                                   | Freeze the shallows and build on them.                                   |
|    2 | `NAVIGATION`        | Pack Ice      | Freeze Deep Water; Gather Pearls; deep sea links                                                                                        | The deep sea freezes too.                                                |
|    3 | `NAVAL_ENGINEERING` | Icebound      | Freeze locks hostile ships in, where the ice crushes them; **Great Harbour** (the Shipyard: +2 population)                              | Freeze a ship in place: it cannot sail or shoot, and the ice crushes it. |
|    2 | `SEAMANSHIP`        | Black Ice     | **an enemy that steps onto your ice is Frozen**                                                                                         | Whoever steps on your ice is frozen.                                     |
|    3 | `SUBMERSIBLES`      | Glacier       | **thick ice: two Cracks to break, a Freeze mends a crack**; Snow cover on ice; +1 Move across ice; Harbours (+1 population per harbour) | Your ice holds, shelters your people, and feeds your harbours.           |

Building on own ice needs no technology of its own: ice exists only after
Rime (or a capture), and each building keeps its usual technology. The
unlock `GLACIER` loses `iceTurns` and gains nothing stored; the capability
`iceTurns` becomes `thickIce: boolean`.

### 2.6 Building on ice

Only an `ICE_FOLK` seat builds on ice (a seat rule read from the seat's
faction, like Snow; a Martian controlling a Yeti does not). Every other
seat's placement is unchanged: no building on ice, and its Port only on
open Shallow Water (it may Crack the ice first).

**The common gate for an Ice Folk building on ice:** the tile is the actor's
own ice (foreign ice is Frozen first), in the territory of one of the actor's cities with no pending
reward, explored, with no improvement, no visible resource (Fish or
Pearls), no hostile unit (`TILE_ENEMY_OCCUPIED`), and not a treasure or
curiosity tile; plus the building's own technology, price, limit and
neighbours, exactly as on land. "Adjacent" is the eight neighbours, land
and ice alike: a Windmill on ice next to a Frost Garden ashore counts it,
and a Windmill ashore counts a Fishing Hole on the ice. Building on ice
leaves the ice as it is (owner, cracks).

| Building                 | Ice Folk name     | Tech                  | Cost | Limit        | Placement                                                                                             | Output                                                                     |
| ------------------------ | ----------------- | --------------------- | ---: | ------------ | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `PORT`                   | **Ice Harbour**   | Rime                  |    4 | none         | own-territory open Shallow Water **or ice (Shallow or Deep)**, a land tile of the same city beside it | +1 live population (+2 with Harbours); Harvest Fish on its tile; sea links |
| `SHIPYARD`               | **Great Harbour** | Icebound              |    5 | one per city | upgrades an active Ice Harbour in place                                                               | +2 live population in total (+3 with Harbours)                             |
| `FISHING_HOLE` (**new**) | Fishing Hole      | Rime                  |    3 | none         | own-territory ice, no resource or improvement                                                         | +1 live population; **counts as a Farm** for Windmill, Workshop, Market    |
| `WINDMILL`               | Windmill          | Milling               |    5 | one per city | land or own-territory ice, at least one adjacent own Farm or Fishing Hole                             | +1 per adjacent own Farm or Fishing Hole, cap 8                            |
| `SAWMILL`, `FORGE`       | as now            | Sawmilling/Metallurgy | 5, 6 | one per city | land or own-territory ice, the usual adjacent Lumber Camp / Mine                                      | unchanged                                                                  |
| `WORKSHOP`               | as now            | Drill                 |    4 | one per city | land or own-territory ice, at least one adjacent Farm, Fishing Hole, Lumber Camp or Mine              | 1 + distinct adjacent basic types (a Fishing Hole is the Farm type), 2–4   |
| `MARKET`                 | as now            | Administration        |    6 | one per city | land or own-territory ice, the usual adjacent economic family (a Fishing Hole is one)                 | unchanged (Coins)                                                          |
| `MONUMENT`               | as now            | achievement           |    0 | one per city | land or own-territory ice                                                                             | +3                                                                         |
| Farm, Lumber Camp, Mine  | —                 | —                     |    — | —            | **never on ice** (they need Fertile Ground, Forest, a Mountain)                                       | —                                                                          |

**The Ice Harbour** is the Ice Folk Port: the same improvement ID, every
economic function of a Port, a new name and look.

- **Always on ice.** Built on open Shallow Water it freezes its own tile
  first (an ice entry of the builder; one `PORT_BUILT` event, whose
  `iceMade` field is true). So an Ice Folk dock is never a hole in the
  ice: their units stand on it and slide across it like any ice.
- **No ship ever uses a dock on ice**, whoever owns it: nothing embarks,
  trains (`TRAIN_NAVAL` needs a dock not on ice), recovers on it, or
  blockades it from the water. Next to it a seafaring captor's ships still
  recover, as beside any dock.
- **Blockade by land.** A dock is inactive while a hostile unit of **any
  form** stands on it (today: a hostile ship). On open water that is still
  only a ship; on an Ice Harbour it is an enemy land unit. A blockaded
  harbour gives 0 population and links nothing, as today.
- A Redevelop removes it and leaves the ice.

**The Fishing Hole** is the Lumber Camp of the ice: 3 Coins, +1 live
population, no per-city limit, a basic building. It counts as a Farm
wherever a mill or a Market counts Farms (`spatialContributionAtV7`), so a
frozen bay can carry a full economy: a Windmill on the ice among three
Fishing Holes and a Frost Garden ashore gives +4, the holes +3.
Harvest Fish first, then cut a Fishing Hole on the same tile.

**Enemies and ice buildings.**

- **Built ice cannot be Cracked** ([section 2.9](#29-crack-ice)): the
  building anchors it. An enemy that wants it gone stands on it and
  **Pillages** it (Raiding, +3 Coins, as on land; possible now because
  land units can stand on ice). The ice under a pillaged building is then
  plain ice and may be cracked.
- A captured city's buildings on ice keep working for the captor, and its
  ice becomes the captor's ([section 2.3](#23-ice-tiles)). The captor
  cannot build new ones on ice.

### 2.7 Ice Folk units on ice

- **Slide** unchanged (forced, free, stops at the end of the ice, a unit
  or a mound, and at a hostile zone of control). With permanent ice the
  slide becomes the Ice Folk road network: a bridge built once is used
  for the rest of the match.
- **Runners (new, the Sled).** A Sled's slide **does not stop in a
  hostile zone of control**; it still stops at a unit, a mound and the end
  of the ice, and a step off the ice obeys zones of control as any step.
  Slid tiles already count for its Charge (+1 Attack after two tiles) and
  for its Bolas reach after the Move, so a Sled on a wide ice sheet slides
  past a screen to Bolas or charge the Marksman behind it. A body rule
  (a mind-controlled Sled keeps it), shown on its card as "Runners".
- **Glacier** keeps the Snow cover (× 1.25) and +1 Move across ice.
- **The Sabretooth** still never slides; on ice it walks at the ordinary
  cost and does not slip.

**No new unit.** The user's own second thought holds: the Sled is the ice
unit. With Runners it is the slide's striker, the Ice Witch is the builder
(her ring freezes up to eight tiles in one action), and Black Ice and
Icebound turn the terrain into the weapon, which is the faction's idea. A
tenth role would need a slot in every tree, art, a glossary entry, an AI
role and a Showcase row for little the Sled does not already do, and the
roster is already nine.

### 2.8 Other factions on the ice: walking and Black Ice

**Walking (the slip), unchanged.** A ground unit of any other kind may
step onto ice and its Move ends there; leaving costs a full point;
Martian walkers and flyers and the Gyrocopter cross it like land. So any
army may use an Ice Folk bridge, one tile per turn. Kept because it is
one readable sentence, it makes ice matter without blocking anybody, and
with permanent ice the Ice Folk bridges become shared roads that the
enemy uses slowly.

**Black Ice (new wording).** With the Ice Folk Black Ice, a land-form unit
hostile to the seat that **ends its own `MOVE`, a `DISEMBARK` landing, or
a Beam Down on that seat's ice, having started off that seat's ice**, is
Frozen at once. It is frozen during its owner's own turn, so the usual
rule gives it `turnsLeft` 2: Frozen for the rest of that turn, Shatter-
eligible on the next Ice Folk turn, Frozen through its owner's next turn,
and thawed after it. One `UNITS_FROZEN` (source `BLACK_ICE`, no source
unit) right after the Move's events. A unit already on the ice that walks
along it, a unit pushed, pulled or knocked onto it, and a unit standing
on ice that the seat newly takes are not frozen. **The Start Turn Black
Ice step is deleted.** So stepping onto the ice costs a unit about two
turns and a Shatter risk, and it is never trapped: once thawed it may
attack from the ice, walk on, or crack the ice in front of it.

### 2.9 Crack Ice

`CRACK_ICE { kind, unitId, at }`, a primary action (ability `CRACK_ICE`
on every land and naval role of the eight other factions). Free, no
technology. Not an attack.

| #   | Requirement                                                                                                               | Rejection                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | `unitId` is the actor's own unit on the board.                                                                            | the ordinary unit errors                         |
| 2   | It is not of the Ice Folk kind and is in `LAND`, `NAVAL` or `EMBARKED` form (never an Egg, never burrowed).               | `UNIT_ROLE_INVALID { role }`                     |
| 2a  | It is not icebound.                                                                                                       | `CRACK_ICE_NOT_LEGAL { reason: "ICEBOUND" }`     |
| 3   | It is not Frozen; it has not used a primary action; if it moved, its role may act after moving (`unitMayActAfterMoveV7`). | `UNIT_FROZEN`; `UNIT_ALREADY_ACTED`              |
| 4   | `at` is one of the eight tiles next to the unit (never its own tile).                                                     | `CRACK_ICE_NOT_LEGAL { reason: "OUT_OF_RANGE" }` |
| 5   | `at` is explored ice that is not an ally's (hostile, own, or an eliminated player's).                                     | `CRACK_ICE_NOT_LEGAL { reason: "NO_ICE" }`       |
| 6   | No land-form unit stands on it (an icebound ship may).                                                                    | `CRACK_ICE_NOT_LEGAL { reason: "OCCUPIED" }`     |
| 7   | No improvement stands on it.                                                                                              | `CRACK_ICE_NOT_LEGAL { reason: "BUILT" }`        |

**Result.**

- **Thick ice** (the owner has Glacier) **that is not cracked** becomes
  `cracked: true`. It is still ice in every way; the next Crack breaks it,
  and a Freeze of its owner mends it.
- Otherwise **the ice breaks**: the entry is removed and the tile is open
  water again (its Fish, Pearls or Wreck as before). An icebound unit on
  it floats free at once; if it belongs to the active player and has not
  acted, it may sail and act this turn.
- The cracking unit has used its primary action and is handled (like a
  Freeze). Event
  `ICE_CRACKED { playerId, unitId, at, broken, freed }` (`freed` the
  icebound unit IDs released, in ID order), right after `WATER_FROZEN` in
  `DOMAIN_EVENT_KIND_ORDER_V7`.
- **Preview:** `previewCrackIceV7(view, unitId, at)` returns null unless
  offered, else `{ unitId, at, broken, freed }`; exact, since `thick`,
  `cracked` and the occupants are public.

**Why these limits.**

- **Not under a land unit:** a crack that drowned a unit would be a free
  kill by any Warrior. Units on the ice are safe; the ice around them is
  not.
- **Not under a building:** the Ice Folk economy on the ice must not be
  one free action from deletion; Pillage is the existing, paid-for way to
  destroy a building, and it works on ice.
- **Ships too:** a navy must be able to cut its own lane, or permanent ice
  would wall off the sea (section 2.12).
- **Not the Ice Folk:** they make ice; everyone else breaks it. They
  never need to break their own, and leaving them out keeps their dock
  free of a button.

### 2.10 Ships and the ice

- **Blocked.** A unit afloat never enters, passes or is pushed, shoved or
  pulled onto ice (unchanged). It breaks a way through with Crack Ice: one
  tile per action, two for thick ice.
- **Icebound and the crush**, unchanged in effect: Icebound's Freeze locks
  a hostile ship in; at each Start Turn of the ice's owner it takes 3
  (Shield first, never reduced by Armoured, a death leaves no Grave and
  never explodes a ship in `NAVAL` form). **Release** is now only by
  Crack Ice: an own or allied unit or ship next to it cracks its tile
  (thick ice: twice), or the freezing seat is eliminated. An icebound ship
  cannot crack its own way out.
- **The themed ships** meet the ice by the rules above, with no special
  case:

| Ship                                  | Against the ice                                                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Every ship (all eight seafaring sets) | may Crack Ice next to it; is icebound by an Icebound Freeze; takes the crush                                          |
| Dinosaur Plesiosaur                   | a sea beast, still frozen at the surface like any Submarine; cracks like a ship                                       |
| Cult Kraken                           | frozen in like a Submarine; an icebound Kraken does not Drag; cracks like a ship                                      |
| Martian ships                         | their Shields absorb the crush first; a Hover Pod never launches onto ice (a foot unit walks on and slips, or cracks) |
| Dwarf ships (Armoured)                | Armoured does not reduce the crush (3); Sea Tunnels never pass under ice                                              |
| Goblin Fire Raft, Candy ships         | icebound: no Kaboom, no Sugar Rush (`ICEBOUND` reasons, unchanged); a crushed Dreadnought does not explode            |
| Undead ships                          | Drowned Crews never raise a ship on ice                                                                               |
| Submarines                            | an icebound Submarine is not submerged; a submerged one may crack (cracking is no attack and does not surface it)     |

### 2.11 The Ice Folk's answers to cracking

1. **Freeze outpaces Crack.** A line Freeze makes two tiles, a Witch up to
   eight; a Crack breaks one. Mending is part of play, not upkeep: nothing
   is lost unless an enemy spends actions on it.
2. **Standing on it.** A tile with a land unit on it cannot be cracked; a
   unit on the bridge holds it.
3. **Building on it.** Built ice cannot be cracked at all.
4. **Glacier (tier 3): thick ice.** Two Cracks to break, and a Freeze of
   its owner mends a crack, so a lone raider or ship cannot cut a thick
   bridge before the Ice Folk turn.
5. **Black Ice.** The cracker usually stands on or next to the ice; a
   unit that stepped on is Frozen and shatters.
6. **Icebound.** A ship that comes to crack can be frozen in.

There is deliberately no fully uncrackable ice: the counter is tempo and
technology, not immunity (no hard locks, ruling U8 of the naval branch).

### 2.12 Why ice still cannot wall off a sea

- Every unit of every other faction next to the ice, and every ship, can
  open it, one tile per action (thick: two).
- Hostile docks never freeze; a ship on a dock surrounded by ice cracks
  its way out.
- Ice is walkable by everyone (one tile per turn), and a transport may
  land on its edge.
- Black Ice freezes once and never traps.
- An icebound ship's owner can free it with any unit beside it.

### 2.13 Worked examples

| Situation                                                                             | Result                                                                                                                                                          |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A Yeti on the shore freezes toward an island 4 Shallow tiles away                     | turn 1: tiles 1 and 2; turn 2: it steps on, slides to 2, freezes 3 and 4; turn 3: it slides to 4. The bridge stays for the rest of the match; nobody refreezes  |
| A Human Swordsman on the island shore cracks tile 4 (no Glacier)                      | tile 4 is water again; next Ice Folk turn a Yeti on tile 3 freezes 4 (and 5 if it is water)                                                                     |
| The same with Glacier                                                                 | tile 4 is cracked; the Ice Folk mend it with any Freeze over it before the second Crack                                                                         |
| A Battleship next to the bridge, Ice Folk without Glacier                             | it may crack one tile a turn, or shoot; a Sled with Icebound slides up and freezes it in                                                                        |
| A Patrol Boat is icebound; an allied Patrol Boat is next to it                        | the ally cracks its tile; the freed boat sails and attacks on the same turn                                                                                     |
| A Knight lands on Ice Folk ice from a transport (Black Ice)                           | Frozen at once; on the Ice Folk turn two hits Shatter it; if it lives, it thaws after its next turn and may then ride off, attack, or crack                     |
| An Ice Folk coastal city with five shallow tiles in its footprint, Rime, Milling      | the Witch freezes them in one action; three Fishing Holes (9 Coins, +3) and a Windmill on the ice beside them and one Frost Garden (5 Coins, +4): +7 population |
| A Sled on a long ice sheet, a Human Guard's zone of control between it and a Marksman | it slides through the zone (Runners) to the tile beside the Marksman and attacks with Charge                                                                    |
| The Ice Folk capture a Human port city                                                | its Port is theirs; any Freeze over it puts ice under it, making it an Ice Harbour their units can walk on                                                      |

### 2.14 Commands, events, errors, queries and registration

- **Commands:** `CRACK_ICE { kind, unitId, at }` right after `FREEZE`;
  `BUILD_FISHING_HOLE { kind, at }` after `BUILD_LUMBER_CAMP` (or appended,
  whichever the frozen order test allows); `FREEZE` and `BUILD_PORT`
  change legality only.
- **Events:** `ICE_CRACKED` right after `WATER_FROZEN`; `ICE_MELTED` kept
  only for the elimination release; `PORT_BUILT` gains `iceMade`;
  `ECONOMIC_BUILDING_BUILT` covers the Fishing Hole; `UNITS_FROZEN` source
  `BLACK_ICE` now fires inside a Move, landing or Beam Down.
- **Errors:** `CRACK_ICE_NOT_LEGAL` (`ICEBOUND`, `OUT_OF_RANGE`, `NO_ICE`,
  `OCCUPIED`, `BUILT`).
- **Improvement:** `FISHING_HOLE` appended to `IMPROVEMENT_IDS_V7`.
- **Registration:** ability `CRACK_ICE` on every role of the eight other
  factions (land and naval) and the Sled mechanic `runners`; unlock
  `GLACIER` without `iceTurns`; capability `thickIce` replaces
  `iceTurns`; constants `ICE_TURNS_V7` and `GLACIER_ICE_TURNS_V7`
  removed, `ICE_CRACKS_THICK_V7` 2, `FISHING_HOLE_COST_V7` 3,
  `FISHING_HOLE_POPULATION_V7` 1 added. `FREEZE_LINE_V7`,
  `WITCH_FREEZE_RADIUS_V7`, `ICE_CRUSH_DAMAGE_V7`,
  `GLACIER_ICE_MOVE_BONUS_V7` and `ICE_SEA_DOG_UNITS_V7` unchanged.
- **Helpers:** `resolveThawV7` and `iceIsPermanentV7` are deleted;
  `resolveBlackIceV7` becomes a step of the Move, landing and Beam Down
  resolution; new `crackIceV7`, `iceIsThickV7`, `iceBuildableV7`. The ice
  list may now hold a few hundred entries, so `iceAtV7` reads through an
  index (`iceIndexSetV7` already exists) instead of a linear `find`.
- **Queries:** `queryPlayerCommandsV7` offers `CRACK_ICE` per legal `at`,
  the Ice Folk builds on ice, `BUILD_FISHING_HOLE`; `queryThreatenedTilesV7`
  follows a Sled's slide through zones of control. Every offered command
  is accepted and every preview equals the resolution.
- **Public unit stats:** `iceFolk.runners` on the Sled.

### 2.15 Interactions that change

| Rule                   | Interaction                                                                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sea Dog                | unchanged: 5 Ice Folk land units on ice at once                                                                                                           |
| Sunken Wreck           | unchanged on ice; on cracked-open water it is a water Wreck again                                                                                         |
| Mind Control           | a controlled Ice Folk unit freezes for its controller (ice of the controller, no building on it, no Black Ice); it never cracks (a body rule of its kind) |
| Kaboom, blasts, bombs  | never crack or make ice (cracking is an action); they hit units on ice as before                                                                          |
| Push, Knockback, pulls | onto ice as before; never triggers Black Ice                                                                                                              |
| Dwarf mounds, tunnels  | unchanged: never on or under ice; a burrowed unit cannot crack                                                                                            |
| Capture                | the former owner's ice in the captured city's territory passes to the captor, uncracked                                                                   |
| Elimination            | the seat's ice stays; its icebound ships float free; the rest breaks with one Crack                                                                       |
| Land Grant             | claims ice tiles as it claims water; their owner does not change                                                                                          |

## 3. AI

The rule changes remove whole branches of the frozen-sea AI and add one
behaviour to every seat. Everything reads the public view and the exact
previews, draws nothing from the PRNG, and stays neutral in a match
without an Ice Folk seat (whose ice list is empty): Dry Land and every
match without the Ice Folk decide exactly as before.

### 3.1 The Ice Folk seat

- **Delete the thaw logic:** `ICE_REFREEZE_PRIORITY_V7`, the "crossing tile
  about to thaw" Freeze, the thaw-aware wave timing, and the
  `iceTargetBonusV7` value of killing a unit that holds thawing ice.
- **The crossing plan stays** (`iceSeaPlanV7`): builder, wave, slide. A
  crossing is built once. A broken tile of a crossing is a gap and is
  rebuilt by the same "extend the crossing" Freeze
  (`ICE_BRIDGE_FREEZE_PRIORITY_V7` 1110); a cracked crossing tile of a
  thick-ice seat is mended at `ICE_MEND_PRIORITY_V7` 1109 (the old
  refreeze slot).
- **Home ice for building** (`ICE_HOME_FREEZE_PRIORITY_V7`, kept, re-aimed):
  freeze open water in an own city's territory when the city has an
  affordable building on offer that the ice would host (Fishing Hole, a
  mill, Workshop or Market with a contributor beside the tile) or a
  hostile ship within `ICE_SEA_HOME_RADIUS_V7` 3 of the center. The Witch
  first (a ring), else an idle unit beside the water; never a unit the
  defence or the wave needs. The `portSite` guard is removed: an Ice
  Harbour may go on the ice.
- **Building:** the economic chooser already ranks every offered build by
  its preview, so once the query offers builds on ice it picks Fishing
  Holes, Ice Harbours and mills there. `BUILD_FISHING_HOLE` joins
  `ARMY_GROWTH_KINDS_V7` beside `BUILD_LUMBER_CAMP`; the stalled-seat
  growth research counts Fishing Hole sites (own-territory ice and
  freezable territory water) as Lumber Camp sites.
- **Research:** Rime as now; Glacier rises to
  `ICE_SEA_DUE_RESEARCH_PRIORITY_V7` 1170 once a hostile has cracked at
  least 2 of the seat's tiles in the last 3 rounds (seen `ICE_CRACKED`
  events), else stays last (1075). Black Ice as now (an enemy near or on
  its ice).
- **Sleds:** the attack search already enumerates offered Moves, so
  Runners' longer slides are found; the Sled's value after a slide
  through a screen is its normal kill and Bolas scoring.

### 3.2 Every other seat

- **Free a frozen ship first:** an own or allied icebound ship with a
  unit or ship of the seat beside it is cracked free at
  `ICE_CRACK_FREE_PRIORITY_V7` 1296, just below the Icebound Freeze slot
  and above every routine action; two Cracks for thick ice are planned
  over the same turn when two units are beside it.
- **Break a threatening bridge:** a hostile ice tile with no unit and no
  building on it, within `ICE_CRACK_HOME_RADIUS_V7` 3 of an own city
  center, when a hostile Ice Folk unit is visible within 6 tiles, is
  cracked at `ICE_CRACK_HOME_PRIORITY_V7` 1108 (below kills and
  necessary defence, above routine Moves). Prefer the tile nearest the
  center on the shortest slide line toward it.
- **Cut a lane:** the naval route search treats hostile ice as passable at
  2 extra steps per tile (4 for thick). A ship whose route's next tile is
  ice cracks it at `ICE_CRACK_LANE_PRIORITY_V7` 1107 instead of waiting.
- **Black Ice as before:** a land unit does not end a Move on Ice Folk
  ice (Black Ice is assumed; research is private) unless that Move ends an
  attack plan or a Crack plan worth it; a transport lands beside the ice.
  The rule now freezes on entry only, so a unit already on the ice is
  free to act and move.
- **Threat:** the threat estimate follows a Sled's slide through zones of
  control; everything else about slides is unchanged.
- **Never crack** ice an own or allied land unit needs for a planned Move
  this turn (the plan's path), and never spend a unit's action on a crack
  when it has an attack the scorer rates as a kill.

## 4. Interface, art and sound

### 4.1 Board and dock

- **Ice looks.** All ice is permanent, so the melting stages go:
  `iceCrackStageV7` returns 0 for sound ice and 2 for cracked thick ice.
  Plain ice keeps today's sheet; **thick ice** (Glacier) wears today's
  `permanent` dusting (wash, drifts, sparkles); **cracked thick ice** adds
  today's stage-2 crack lines over the dusting. No ice tile art changes.
- **Ice tooltip:** "Ice: land units stand here; ships cannot enter. Ice
  Folk slide; others stop here." Then one of "Thick: two Cracks break it."
  / "Cracked: one more Crack breaks it.", and the Black Ice line for the
  owner. The countdown text is deleted.
- **Freeze** labels lose the turns: "Ice 2", "Ice 1 · mends 1", "Ice 1 ·
  Icebound". The Witch's ring preview is unchanged.
- **Crack Ice** (every other faction's unit or ship next to crackable ice):
  one dock button with a new pick-and-crack icon. Armed, each offered tile
  is a target in the **Attack** style (red: it harms the owner's work),
  labelled from `previewCrackIceV7`: "Break" or "Crack · 1 more breaks
  it"; a tile holding an own or allied icebound ship wears the **Help**
  style (lavender, "Free the ship"). Each also carries a tile-action badge
  ([board targeting 1.1](../ui/BOARD_TARGETING.md#11-tile-actions-an-icon-on-every-target-tile-bead-pulp_wars-2yc60)).
  Disabled reasons, first failing row: "Frozen: it cannot act this
  turn", "Already acted this turn", "A unit stands on that ice", "Built
  on: Pillage it instead". A unit with no ice beside it has no button.
- **Building on ice:** the tile dock of an own-territory ice tile offers
  the same build buttons as land, with the Fishing Hole among the basic
  ones. A building on ice is drawn on a **packed-snow pad** (a code-drawn
  ellipse, `#eef4f7` with a `#b9c9d3` rim, under the sprite) so it sits on
  the sheet instead of floating; no new mill sprites.
- **Black Ice warning:** an enemy unit's Move target on Ice Folk ice keeps
  the slip outline and its legend reads "Ice: your Move ends here (Black
  Ice freezes)" when the owner's Black Ice is known (the public
  `UNITS_FROZEN` source `BLACK_ICE` has been seen), else today's text.
- **Sled card:** "Runners: its slide is not stopped by zones of control."
- **Glossary** (`src/render/unit-glossary-v7.ts`, plain words): Crack Ice,
  Runners, Fishing Hole, Ice Harbour, Great Harbour, thick ice, and the
  new Black Ice sentence.
- **Notices:** "The ice broke" / "The ice cracked" (with "the ship floats
  free" when it freed one), from `ICE_CRACKED`; the animation reuses
  `ICE_MELT` for a break and a short crack flash for a crack.
- **Board targeting doc** section 3.5 is rewritten to match; the legend
  table gains "Crack Ice" in the Attack row and "Free a frozen ship" in
  the Help row.

### 4.2 New art (PixelLab, the checked-in pipeline)

| Subject                             | What                                                                                                        | Size    | Review command                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------- |
| `ICON:ACTION:CRACK_ICE`             | a pick striking a pale ice slab, a crack and two chips flying; cream on dark like the other action icons    | icon    | `npm run art:naval-branch-ice-review`         |
| `IMPROVEMENT:ICE_FOLK:FISHING_HOLE` | a round dark hole in an ice slab, a bone-and-hide drying rack with two fish, a small fur stool              | 72 x 72 | `npm run art:chibi-ice-folk-direction-review` |
| `IMPROVEMENT:ICE_FOLK:PORT`         | the **Ice Harbour**, regenerated to stand on ice: a low ice-block boathouse, a sled on the slab, fish racks | 72 x 72 | `npm run art:chibi-ice-folk-direction-review` |
| `IMPROVEMENT:ICE_FOLK:SHIPYARD`     | the **Great Harbour**: a larger ice hall with fur banners and a crystal on the ridge                        | 72 x 72 | `npm run art:chibi-ice-folk-direction-review` |

Light from the south-west, the Ice Folk palette (cream `#feffe6`, hide
`#3a2a2a`, ice blue `#0da8fa`); about three samples reviewed at native and
enlarged size before batching; reviewed on both ice sheets beside the
Snow tiles. The old Ice Folk Port and Shipyard sprites (piers on water)
are replaced: an Ice Folk dock now always stands on ice.

### 4.3 Sound

One new effect, `ice-crack`, through the checked-in ElevenLabs script
(`npm run audio:elevenlabs-sfx`): "a sharp crack of thick lake ice, a
short splintering, a small splash", 0.8 s, prompt influence 0.4, trimmed
and loudness-matched by the existing encode path, provenance recorded in
the sound manifest. Played on `ICE_CRACKED` (break and crack alike).
Freeze, crush and Black Ice keep their sounds.

## 5. Migration

- **Ruleset identity:** the next free identity when the engine bead lands
  (as built: `pulp-wars-poc-7r100`, after the bolder abilities took `7r99`);
  `7r99` joins `PRIOR_RULESET_7_IDS`; browser autosave
  `pulpWars.save.v7r100.current`.
  Earlier saves and replays are rejected by the exact-identity dispatch,
  as for every revision; nothing is migrated.
- **Shapes:** the ice entry (`turnsLeft` out, `cracked` in), the view's ice
  entry (`permanent`, `turnsLeft` out; `cracked`, `thick` in), the
  capability (`iceTurns` out, `thickIce` in), the improvement
  `FISHING_HOLE`, the commands `CRACK_ICE` and `BUILD_FISHING_HOLE`, the
  event `ICE_CRACKED`, the `PORT_BUILT.iceMade` field, the error
  `CRACK_ICE_NOT_LEGAL`, the Freeze preview fields. Every new reader of
  units or factions is classified in `tests/fixtures/v7-kind-reader-classes.ts`
  and `tests/fixtures/v7-unit-reader-classes.ts` and the form-audit counts.
- **Showcase:** an Ice Folk seat's ice where its boats would stand loses
  its countdown (`{ at, ownerId, cracked: false }`); its Coast-territory
  tile is an Ice Folk seat's natural Ice Harbour site, unchanged.
- **Campaign:**
  - **Frontier 7, The Island That Time Forgot** (the only mission where
    the Ice Folk meet water; you play them). Text: the hint "Rime freezes
    the shallows; Pack Ice the deep water." stays; the mission comment
    and briefing line "Glacier makes the road last" becomes "Glacier makes
    your ice thick". New behaviour to check by hand play: the Baron's
    Patrol Boat (from round 3) and his landing party (round 14) will crack
    the column-7 road. No number is retuned in the engine bead; the
    mission is replayed by hand afterwards, with the clock (round 30) and
    the star (`WITHIN_ROUNDS 24`) as the levers if it got easier (no
    refreezing) or harder (the cracking).
  - **Frontier 5, Dead Men's Road** and **Frontier 6, The Deep Gate**
    field Ice Folk enemies on Dry Land: no water, no change.
  - **`LAB_ICE_FOLK_MID`** is all land: no change.
- **Documents updated by the engine bead:** current rules section 21.16
  (rewritten), 14 (Port, docks on ice, blockade by any form), 8.2 and 8.3
  (Fishing Hole, building on ice), 12.2 (Crack Ice among the primary
  actions), 16 (the AI summary, by the AI bead), 1 and 24 (identity and
  revision history), 25 (the frozen sea is still not balance-checked);
  a status line at the top of naval branch section 8 and themed naval
  branches section 11 pointing here.
- **Simulation pins expected to move** (not run or re-pinned, by the
  standing rule; tracked by `pulp_wars-b5pd`):
  `ruleset-v7-frozen-sea-headless`, `ruleset-v7-naval-branch-headless`,
  `ruleset-v7-ice-folk-headless`, `ruleset-v7-ice-folk-showcase-headless`,
  `ruleset-v7-missions` (Frontier 7), `ruleset-v7-many-seats-play`,
  `ruleset-v7-unique-factions`, `ruleset-v7-mind-control`,
  `ruleset-v7-monster-headless` and `-fuzz`, `ruleset-v7-headless-cli`,
  `ruleset-v7-naval-ai`, `ruleset-v7-naval-persistence`, and any other
  `*.sim.test.ts` whose arena seats the Ice Folk on a map with water or
  pins the ruleset identity.

## 6. Implementation plan

Three beads, in order, each with its own worker. The engine bead keeps
the AI compiling (it deletes the thaw readers in `src/ai/v7-frozen-sea.ts`
mechanically) but changes no AI decision beyond that.

### Bead A: the permanent frozen sea, engine and rules

**Scope:** sections 2.3 to 2.10, 2.14, 2.15 and the migration of section 5
(identity, shapes, Showcase, Frontier 7 text, the reader-class fixtures,
the documents).

Acceptance:

1. Ice has no countdown: an entry made on turn N is still there after 20
   End Turns of every player; `resolveThawV7` is gone; state parsing
   rejects `turnsLeft` and accepts `cracked`.
2. Freeze: the set table of section 2.4 holds row by row (open water,
   own dock, hostile ship with and without Icebound, foreign ice, own
   cracked ice, own sound ice passed over); a line passes over own sound
   ice; a Freeze that changes nothing is neither offered nor accepted.
3. Crack Ice: every legality row of section 2.9 accepted and refused with
   its error, offered exactly when accepted; plain ice breaks, thick ice
   cracks then breaks, a Freeze mends a crack; an icebound ship is freed
   and may act the same turn; an Ice Folk unit, an Egg, a burrowed unit
   and an icebound ship are refused; a ship cracks; `ICE_CRACKED` and the
   preview equal the resolution.
4. Building on ice: Ice Harbour on open shallows (freezes the tile) and on
   Shallow and Deep ice; Great Harbour upgrade; Fishing Hole; Windmill,
   Sawmill, Forge, Workshop, Market and Monument on own-territory ice with
   their neighbours counted across land and ice; a Fishing Hole counts as
   a Farm for Windmill, Workshop and Market; a non-Ice-Folk seat is
   refused every build on ice; built ice cannot be cracked; a hostile land
   unit on an Ice Harbour blockades it and may Pillage a building on ice;
   no ship embarks, trains, or blockades from the water at a dock on ice.
5. Black Ice freezes on entry only (Move, landing, Beam Down from off the
   seat's ice), never at Start Turn, never by a push; a unit that thawed
   on the ice may act.
6. Runners: a Sled slides through a hostile zone of control and still
   stops at a unit, a mound and the end of the ice; other Ice Folk units
   still stop.
7. Capture passes the former owner's ice in the city's territory to the
   captor; elimination frees icebound ships and leaves the rest.
8. Identity bumped by the established pattern; save key renamed; current
   rules and the overlays updated; glossary sentences for every new
   player-facing ability.

**Validation profile:** `ai/map/persistence` (schema, save and replay
change; engine rules inside it).

```text
Validation profile: ai/map/persistence
Worker focused checks: npx vitest run tests/unit/ruleset-v7-frozen-sea-*.test.ts tests/unit/ruleset-v7-ice-folk-*.test.ts tests/unit/ruleset-v7-naval-branch-*.test.ts tests/unit/ruleset-v7-ice-redesign-*.test.ts tests/unit/*identity*.test.ts tests/unit/*reader-class*.test.ts tests/unit/*form-audit*.test.ts tests/unit/ruleset-v7-showcase*.test.ts tests/unit/ruleset-v7-missions*.test.ts; npm run typecheck; npm run lint; npm run format:check
Conditional final gates: npm run format:check, npm run lint, npm run typecheck, npm run test:unit, npm run build; npm run test:sim and npm run validate:ruleset7-release only if the user authorises simulations (skip recorded in the bead)
```

(The default test tier never collects the `*.sim.test.ts` files the globs
would match.)

### Bead B: the AI for and against permanent ice

**Scope:** section 3; current rules section 16 and
[Normal AI, the frozen sea](../architecture/NORMAL_AI.md#the-frozen-sea-pulp_wars-5ti5).
Depends on bead A.

Acceptance (each on a small hand-built state, no matches):

1. No thaw logic left in `src/ai/v7-frozen-sea.ts`; a finished crossing
   is never refrozen; a broken crossing tile is rebuilt; a cracked thick
   tile is mended.
2. The Ice Folk seat freezes own-territory water when a building on offer
   would use it, and then builds a Fishing Hole, an Ice Harbour on ice,
   and a mill on ice through the existing chooser.
3. Glacier's research priority rises after two hostile Cracks of the
   seat's ice within three rounds.
4. Another seat cracks an own icebound ship free before its other
   actions; cracks a bridge tile within 3 of its city center when an Ice
   Folk unit is within 6; a ship cracks the ice blocking its route; no
   seat cracks under its own planned path or instead of a kill.
5. The threat estimate follows a Sled's slide through zones of control.
6. A match state without an Ice Folk seat decides exactly as before (one
   fixed state per map type, compared with the decision before the
   change).

```text
Validation profile: ai/map/persistence
Worker focused checks: npx vitest run tests/unit/ruleset-v7-frozen-sea-ai.test.ts tests/unit/ruleset-v7-ice-folk-ai.test.ts tests/unit/ruleset-v7-naval-ai.test.ts tests/unit/ruleset-v7-naval-branch-ai.test.ts tests/unit/ruleset-v7-ice-crack-ai.test.ts; npm run typecheck; npm run lint; npm run format:check
Conditional final gates: npm run format:check, npm run lint, npm run typecheck, npm run test:unit, npm run build; simulations only if the user authorises them
```

### Bead C: interface, art and sound for the new ice

**Scope:** section 4; board targeting section 3.5 and the art document's
sea-ice section. Depends on bead A; independent of bead B.

Acceptance:

1. Ice draws with no melting stages; thick ice is dusted; cracked thick
   ice shows cracks; the tooltip has no countdown.
2. Crack Ice: dock button, Attack-style targets with exact labels, the
   Help style on a frozen own or allied ship, tile badges, disabled
   reasons; Ice Folk units have no button.
3. The tile dock offers every build on own-territory ice; buildings on ice
   stand on the snow pad; the Ice Harbour and Great Harbour and the
   Fishing Hole draw their new sprites on the board, in the dock, in the
   Help and the Gallery.
4. Freeze labels without turns; the Sled card shows Runners; glossary and
   notices as section 4.1.
5. The four new art subjects generated, reviewed and registered through
   the pipeline; the crack sound generated, encoded and registered.
6. Phone width does not overflow; `tests/unit/interface-style-ui-v7.test.ts`
   passes; screenshots of static states (Showcase or fixtures, muted
   headless Chrome, no match played) in the scratch folder.

```text
Validation profile: ui/presentation (with the asset-only gates)
Worker focused checks: npx vitest run tests/unit/frozen-sea-presentation-render-v7.test.ts tests/unit/ice-folk-render-v7.test.ts tests/unit/naval-presentation-render-v7.test.ts tests/unit/chibi-ice-folk-direction-assets.test.ts tests/unit/chibi-naval-branch-assets.test.ts tests/unit/interface-style-ui-v7.test.ts tests/unit/elevenlabs-sounds-assets.test.ts tests/unit/sound-events-presentation-v7.test.ts; npm run typecheck; npm run lint; npm run format:check
Conditional final gates: the ui/presentation unit set and npm run build; npm run art:validate, npm run art:chibi-ice-folk-direction-review, npm run art:naval-branch-ice-review; npm run smoke:browser skipped (it plays a match) unless the user authorises it
```

## 7. Open questions for the user

Only one changes the direction; everything else is decided above.

1. **Should home ice be uncrackable?** This design lets enemies crack any
   unbuilt, unoccupied Ice Folk ice, home waters included, with Glacier's
   thick ice and buildings as the protection. The alternative is "ice in
   Ice Folk territory cannot be cracked": stronger and simpler for the Ice
   Folk, but an Ice Folk coast would then be a permanent wall against
   landings from the sea.

## 8. Bead A as built (`pulp_wars-5ti.25`)

Built at `pulp-wars-poc-7r100` on 2026-10-19, with no game played or
simulated. The root decided the open question of section 7: Ice Folk home
ice stays crackable (the design's default). Decisions the build made where
the design was silent or had to be read:

1. **Crack Ice is a kind rule, not a role-table ability.**
   `unitCracksIceV7`: every unit not of the Ice Folk kind (the slip's
   rule, so a mind-controlled Ice Folk unit never cracks), in land, naval,
   or embarked form, not a neutral Monster. No `CRACK_ICE` entry was added
   to the nine role tables (their pinned ability lists stay); the glossary
   has a `CRACK_ICE` entry for bead C to show.
2. **Row 3 of Crack Ice also refuses a Crashed Candy unit** (`UNIT_CRASHED`,
   as for every primary action), and an Egg and a burrowed unit are refused
   by the common refusals before the Crack rows (`UNIT_IS_EGG`,
   `UNIT_ALREADY_HANDLED`), not with `UNIT_ROLE_INVALID`.
3. **The freeze set:** a dock is freezable only when it is in the actor's
   own territory (any other dock, ice or not, never freezes); an own dock
   is open water for the table (no unit: made ice; a hostile ship with
   Icebound: locked in). A tile that holds a unit afloat ends the line
   whatever happened to it (passed over or taken). A Freeze over a dock
   recomputes the live economy, since an icebound blockader no longer
   blockades it, so `FREEZE` (and `PILLAGE`, which may now remove a dock)
   joined the blockade-event list.
4. **The Ice Harbour on open water needs the tile empty** (no unit of any
   owner: freezing it would lock an allied boat in). It is `INVALID_TILE`
   otherwise, also for a hostile ship (before the enemy-occupied check).
5. **A dock's blockade reads the dock's ground form:** on ice a hostile
   unit in `LAND` form, on open water one afloat; never an Egg. So an
   icebound hostile ship on an own Ice Harbour blockades nothing, as the
   design says.
6. **No ship recovers on a dock on ice** (a ship there is icebound); next
   to one a ship recovers as beside any dock. Nothing auto-embarks at a
   dock on ice (the reducer's embark test checks the ice, as the movement
   validation's does).
7. **A resource the builder cannot see may stay under a building on ice**
   (Pearls before Pack Ice), as masked Fertile Ground stays under a land
   building; the gate is the visible resource. The schema admits Fish and
   Pearls under any non-basic building on water.
8. **`BUILD_FISHING_HOLE` is a basic economic action**
   (`BASIC_ECONOMIC_ACTIONS_V7.BUILD_FISHING_HOLE`, technology Shorecraft,
   nominal terrain Shallow Water), so the economic preview, the public
   placement scoring, and the AI's economic chooser see it with no new
   path; its tile rule is `iceBuildableV7` and the visible resource, and
   only the Ice Folk Rime unlocks the command.
9. **On an elimination the eliminated seat's cracks are cleared** (its ice
   is no longer thick, and state parsing refuses a crack on ice that is
   not thick), and the release runs after the eliminated units leave the
   board, so only other seats' icebound ships float free.
10. **Black Ice on entry** reads the unit's tile before the command (a
    Beam Down's passenger's own tile), runs before a Frost Giant's Cold
    Aura, and freezes only through `canBeFrozenV7` of the ice owner (a
    Martian controller's ice never does).
11. **Runners** let the slide go on through a hostile zone of control only
    while the slide itself continues; where it ends (end of the ice, a
    unit, a mound) a zone stops the Move as for any step. The public
    movement validation applies the same rule, so the query, the threat
    estimate, and the AI's attack search follow it.
12. **The Normal AI** (kept compiling, decisions changed only mechanically):
    the crossing plan's thaw horizon is infinite (so a near Witch now
    builds any crossing, `tests/unit/ruleset-v7-frozen-sea-ai.test.ts`
    adapted), the "refreeze" reason is now a mended or retaken crossing
    tile, the kill-on-thawing-ice bonus is gone, and no seat picks
    `CRACK_ICE` yet. The `portSite` guard and everything else of section 3
    are bead B.
13. **The interface** only lost the countdown: the ice chip says "Ice",
    "Ice · thick", or "Ice · cracked"; Freeze labels read "Ice 2",
    "Ice 1 · mends 1", "Ice 1 · Icebound"; thick ice draws the old
    permanent dusting and a crack the old stage-2 cracks; the technology
    cards say the new Black Ice and Glacier lines and the Ice Folk
    placement lines name their ice. `CRACK_ICE` is classed bar-only until
    bead C adds its button; the Fishing Hole draws the Fish art until its
    sprite lands.

## 9. Bead B as built (`pulp_wars-5ti.26`)

Built on `pulp-wars-poc-7r100` on 2026-10-19 with no ruleset change (no
identity bump), no game played and no simulation run. Every behaviour of
section 3 is proven on a small hand-built state in
`tests/unit/ruleset-v7-ice-redesign-ai.test.ts` (and the adapted
`tests/unit/ruleset-v7-frozen-sea-ai.test.ts`). Decisions the build made
where the design was silent or had to be read:

1. **Glacier's evidence is read from the board.** The Normal AI is
   stateless and the player view carries no event history, so "seen
   `ICE_CRACKED` events in the last 3 rounds" is read from what a Crack
   leaves (`iceCrackedOpenTilesV7`): a crossing tile that is not ice with
   the seat's ice farther along the crossing, an open water tile of the
   seat's territory whose explored water neighbours (two at least) are
   all its ice, and a crack in its thick ice. Two such tiles raise Glacier
   to 1170. A gap that is still open is a recent one (the crossing's own
   Freeze fills it at 1110).
2. **One builder.** With no thaw the second, refreezing builder is gone:
   the Witch when near, else the cheapest line unit. The plan lost
   `thawSafe`.
3. **Mending is unconditional.** A cracked crossing tile is mended, and a
   crossing tile another seat holds is taken back, at 1109 whoever still
   has to pass it (the crossing is the seat's road for the rest of the
   match); the old "a unit still has to pass it" test is gone.
4. **Home ice for building** counts a tile that would host a Fishing Hole
   the seat can afford (Rime, 3 Coins, own territory of an own city with
   no pending reward, no visible resource, improvement, chest, or hostile
   unit): 3 a tile, one more beside an own Farm, Fishing Hole, Lumber Camp,
   or Mine (where a mill, Workshop, or Market can follow). Every mill,
   Workshop, and Market on ice needs such a tile anyway, so the Fishing Hole
   test is the gate. A taken tile of another seat's ice in own territory
   counts the same; a mended crack of the home ice 2; the old wall beside a
   threatened center 5 a tile. Never by the crossing's builder.
5. **Building** needed one engine fix: the public economic preview of
   `BUILD_FISHING_HOLE` reported no population (the command was missing
   from the live-graph kinds of `query.ts`) while the build gives +1; the
   preview now equals the resolution, so the chooser rates a Fishing Hole
   as it rates a Lumber Camp. The public planning counts a Fishing Hole
   site on every water tile of an Ice Folk seat's territory (with no
   resource, improvement, or chest; the gates of Rime and Pack Ice
   ignored as every potential ignores technology), and only an Ice Folk
   seat is told of that potential, so the planning output of every other
   seat is unchanged (its pinned hashes hold).
6. **Crack Ice is a reason or nothing.** Free (1296), Bridge (1108), and
   Lane (1107) as section 3.2. Thick ice that is not cracked yet is a
   reason only when another own unit is offered the second Crack of the
   same tile this turn (the policy picks one command at a time, so the two
   Cracks follow each other), or on a ship's route (two Cracks are
   priced into the route). A tile with another seat's ship on it is never
   cracked (it would free it). "Planned Move" is read as an offered Move of
   an own land unit that the frozen-sea filter does not refuse and whose
   path passes the tile, or an allied land unit on ice beside it; "a kill"
   as an offered attack whose preview kills.
7. **The bridge rule's line preference** is ten a step nearer the city
   center plus five when the ice joins the tile, over ice, to a tile beside
   the hostile Ice Folk unit in range.
8. **The lane** is the next step of the route the ship already follows
   (the fleet's route for a ship, the plan's for a transport): the water
   route search passes crackable ice at 1 + 2 steps (thick, uncracked:
   1 + 4), an ally's and built ice never; a bucket search runs only when
   the view has ice, so every board without ice routes exactly as before.
   A ship cracks only when no open water around it leads on as cheaply.
9. **The threat estimate** now follows a Sled's Runners through zones of
   control, and takes zones of control on ice like land, as the engine
   does (it read ice as water, so a slide ran through the zone of a unit
   beside the ice).
10. **Black Ice and Sleds** needed no new rule: a unit frozen on entry is
    the Ice Folk policy's Frozen target as before (its Shatter and kill
    values), and the attack search enumerates the offered Moves, whose
    ends already follow Runners.
11. **No Ice Folk seat, no change:** the first six decisions of a new
    match on each generated map type and of the naval strait (no Ice Folk
    seat) were recorded before the change
    (`tests/fixtures/v7-ice-ai-no-ice-folk-decisions.json`) and are
    unchanged.

## 10. Bead C as built (`pulp_wars-5ti.27`)

The interface, art and sound of section 4, on 2026-10-19, with no game
played or simulated. No rule or number changed (the identity stays
`pulp-wars-poc-7r100`). Decisions the build made where section 4 was
silent or had to be read:

1. **Crack Ice shares the Freeze pick.** The board interaction's
   `freezePick` names its kind (`FREEZE` or `CRACK_ICE`), so Escape, a new
   selection and the dock's aiming panel treat both alike; the targets are
   the family `CRACK_ICE` (Attack), with a Help override on a tile that
   holds an own or allied frozen ship. The tile badge is the
   `ICON:ACTION:CRACK_ICE` raster (a code glyph `ice-pick` while it loads).
2. **Labels.** "Break", "Crack · 1 more breaks it", "Free the ship" and,
   on thick ice over a frozen ship, the shorter "Crack · 1 more frees it"
   (two neighbouring long labels collided on a phone).
3. **Reasons.** The first failing row of section 2.9 among: Frozen,
   already acted (an Attack, a primary action, a Recover or a Capture; a
   Wait or a Move alone leaves the action unused), "It moved this turn"
   for a role that cannot act after moving, a unit on the ice, a building
   on it. An icebound ship keeps only its "Sail" button.
4. **Every other unit's "?" lists Crack Ice** in a match with an Ice
   Folk seat (the unit glossary); the Ice Folk Freeze line now says the ice
   stays and is built on. Building and terrain words (Ice Harbour, Great
   Harbour, Fishing Hole, thick ice, Black Ice) are on the technology cards,
   the building lines, the ice chip and `ICE_HELP_RULES_V7`, since the unit
   glossary is about units.
5. **The Freeze preview** names the tiles a Freeze takes from another
   player: "Ice 2 · takes 1" (with mended and Icebound as before).
6. **Black Ice on the slip legend**: "Ice: your Move ends here (Black Ice
   freezes)" once the viewer has seen that seat's Black Ice freeze a unit
   in this match (the public `UNITS_FROZEN` of source `BLACK_ICE`; the
   memory is per match seed and per session).
7. **The snow pad** is drawn under every Ice Folk building on ice but the
   Fishing Hole, which is cut in its own slab of ice.
8. **Art.** The Ice Harbour and Great Harbour replace the Ice Folk Port
   and Shipyard masters in place (subject keys `PORT/HARBOUR` and
   `SHIPYARD/HARBOUR`); the Fishing Hole is `IMPROVEMENT:ICE_FOLK:FISHING_HOLE`
   and the shared `IMPROVEMENT:FISHING_HOLE` (a captor's) falls back to it.
   The Crack Ice icon is in batch `naval-branch`.
9. **Sound.** `special.ice-crack` (the doc's `ice-crack`, named like the
   other effects), three ElevenLabs takes of the section 4.3 prompt, all
   passing; the measured default is #103 (0.37 s, a crack with a low
   splash). It plays on both cues of `ICE_CRACKED`: `ICE_CRACK` (a white
   flash, a zigzag crack and two chips) for thick ice that holds, and
   `ICE_BREAK` (the same, then drifting floes) for ice that breaks.
