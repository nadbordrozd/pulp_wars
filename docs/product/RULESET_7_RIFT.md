# Ruleset 7: the Rift

**Status:** implemented (`pulp_wars-9s0.5`, identity `pulp-wars-poc-7r28`).
The rules below are folded into
[Ruleset 7: current rules](RULESET_7_CURRENT.md) (sections 2.3, 2.4, 8.1,
12.1, and 13.4); this overlay keeps the full ruling of every interaction,
the generation algorithm, and the implementation notes.

**Source.** The user, 2026-10-02: "add a new terrain - rift. 1x3 crack in
the ground. nothing can be built on it. no unit can stand on it except
flying ones. drop them randomly on a map but very sparingly. such that small
maps should have 0. bigger maps 1 or sometimes 2. they can be horizontal or
vertical. generate new sprites for them." The Martian overlay
([section 7.4](RULESET_7_MARTIANS.md#74-rift)) and the Ice Folk overlay
([section 10.9](RULESET_7_ICE_FOLK.md#109-rift)) ruled the Rift for their
factions in advance; this document keeps every one of those rulings and
rules the rest.

**Fixed by the user:** nothing can be built on a Rift, and only flying units
stand on it. Everything else here is a ruling of this bead, chosen to be
consistent with the Martian and Ice Folk rulings and to change nothing on a
board without a Rift.

## 1. Summary

A **Rift** is a straight crack three tiles long, horizontal or vertical,
that map generation places on inland ground of the larger boards: none on
11 x 11 and 14 x 14, none or one on 16 x 16, one on 20 x 20, one or two on
25 x 25, and none on the Showcase. Its tiles are land with nothing on them.
Only a Martian flyer (Saucer, Mothership) in land form can enter, cross, or
stand on a Rift; every other unit walks around it. Attacks, sight, and
abilities cross it freely. Nothing rises and no Grave lies on a Rift.

## 2. The terrain

- `RIFT` is the sixth terrain ID, appended to the frozen order:
  `GRASS`, `FOREST`, `MOUNTAIN`, `SHALLOW_WATER`, `DEEP_WATER`, `RIFT`.
- A Rift tile is **land**: it keeps the biome of the ground it replaced
  (`biome` is never null), so every "land or water" rule sees land. Every
  rule that must not apply to a Rift says so below.
- A Rift is made only by map generation. No command creates, removes, or
  changes a Rift, and a Rift tile never changes terrain.
- A Rift tile never holds a resource, an improvement, a Road, Field Defense,
  a settlement site, a treasure chest, or a Grave. State parsing rejects a
  state with any of them on a Rift, or with a unit on a Rift that is not a
  land-form flyer.

## 3. Building, economy, and territory

- **Nothing is built on a Rift.** No tile command targets a Rift tile:
  resource actions (it has no resource), buildings, the Monument, Lumber
  Camp, Farm, and Mine (no resource or wrong terrain), Clear, Replant, and
  Cultivate Forest and Blast Mountain (wrong terrain), Build Road, Build
  Port and Shipyard (land), Redevelop (nothing to remove), and Build Field
  Defense (no unit that can build it stands there). The command query never
  offers one. A canonical attempt is rejected with the error the command
  already uses for an unsuitable tile: `INVALID_TILE` for buildings, the
  Monument, Build Road, Blast Mountain, and Field Defense;
  `FOREST_ACTION_INVALID_TILE` for the Forest actions; `RESOURCE_*` and
  `TILE_*` errors of the resource actions as for any tile without that
  resource; `REDEVELOP_INVALID_TARGET`.
- **Territory.** A Rift tile can lie in a city's territory: a capital's or
  village's footprint never reaches one at the start (section 5.3), but a
  Land Grant, a captured village's city, and later footprints can claim it.
  It counts as a claimable cell for Land Grant, transfers with a capture,
  and is drawn inside the border like any tile. It adds no population, no
  income, and no economic opportunity.
- **Adjacency.** A Rift is never an improvement, so it adds nothing to a
  Windmill, Sawmill, Forge, Workshop, or Market next to it, and it is never
  next to water (section 5.3), so it is never a Port's land neighbour.
- **Roads.** A Rift is never a usable Road node, so leaving a Rift costs a
  full movement point. The Road population graph joins Road nodes in eight
  directions and simply goes round a Rift.

## 4. Units

### 4.1 Movement and zone of control

- **Entry** goes through the shared rule `canEnterTerrainV7`: a Rift admits
  a unit in land form whose movement mode is `FLY` (the Martian Saucer and
  Mothership), and nothing else: no foot unit, no walker (Stride is Forest,
  Mountain, and Shallow Water only), no Mountain-born unit (the Ice Folk
  rule covers Mountains only), no Egg, no Thrall, and no naval or embarked
  unit.
- A flyer enters, crosses, and **ends a Move** on a Rift at the ordinary
  cost (one full point, since no Road can be there). A Rift never stops its
  Move. A flyer may land on a Rift with `DISEMBARK` and be placed there as a
  treasure or reward unit, but a Rift never touches water (section 5.3), so
  only the treasure and reward placements can happen.
- A ground or walking unit can neither end a Move on a Rift nor path through
  it. The rejection and the interruption reason are the existing
  impassable-terrain reason `ENGINEERING_REQUIRED` (its historical name; a
  Rift that was unexplored before the Move interrupts it like any other
  impassable terrain). The movement query never offers such a Move.
- **Zone of control.** A Rift exerts none: it is terrain. A hostile land
  unit next to a Rift projects its zone of control onto the Rift tile as onto
  any land tile, which matters only to flyers, and flyers ignore zones of
  control. A flyer on a Rift exerts none (the Martian rule).

### 4.2 Sight and fog

- **Line of sight is unaffected.** Sight is a Chebyshev radius; a Rift
  blocks nothing and gives no high-ground bonus.
- A Rift is terrain: an explored Rift tile shows `terrain: "RIFT"` in every
  player's view, exactly like any terrain; an unexplored one shows nothing.
  A flyer on a Rift is hidden or visible by the ordinary rule.

### 4.3 Combat and abilities

- **Attacks across a Rift** are ordinary: range and adjacency are plain
  distances. A flyer on a Rift is attacked by adjacent and ranged units as
  on any tile, retaliates as usual, and has no cover and no fortification
  (a flyer never has either).
- **No advance onto a Rift.** An attacker that kills a unit on a Rift does
  not advance (only a flyer could stand there, and flyers never advance), so
  Overrun, Ram, and Rampage do not continue from that kill. The
  Triceratops's Charge! does not follow a target it pushed off a Rift.
- **Push, the Charge! push, and the Tractor Beam** may move a unit onto a
  Rift only if that unit flies; for any other unit the destination is
  `BLOCKED` (the Martian ruling). They may move a flyer off a Rift under
  the ordinary conditions.
- **Beam Down** never targets a Rift: every passenger is a non-flyer.
- **Mind Control:** a unit standing on a Rift is immune
  (`MIND_CONTROL_NOT_LEGAL`, `TARGET_IMMUNE`): the Thrall could not stand
  there.
- **Kaboom, death blasts, bombs, splash, Pierce, the heat rays, Wail,
  Plague, Bolas, Cold Snap, and Sweep** hit a unit on a Rift exactly as on
  any tile. Blasts destroy no Field Defense there because there is none.
- **Deaths on a Rift.** A unit that dies on a Rift leaves **no Grave** and
  **does not rise**: no Infect rising (a Zombie's kill or a Zombie's
  retaliation), no Bitten rising (attack, retaliation, splash, Pierce, Wail,
  Plague, explosion, or Kaboom). It dies an ordinary death (`UNIT_DIED` with
  its usual cause, kill credit, and Plunder); a Brain dying there collapses
  its Thralls as anywhere. The combat preview reports
  `defenderInfected`/`attackerInfected` and the `*BittenRises` flags false,
  and the Wail preview `bittenRises` and `leavesGrave` false, for such a
  victim.
- **The Ice Folk:** a Rift is never Snow (territory, Deep Winter, and the
  Blizzard all skip it), and Mountain-born does not cover it; a flyer on a
  Rift can be Chilled and shattered, and the attacker does not advance.
- **Eggs** are never laid on a Rift (an Egg is a ground unit), and a
  Rift is never in a city's ring at the start.

### 4.4 Settlements, capture, and siege

Capitals and villages are never on a Rift and never next to one: a capital
is at least three tiles from every Rift tile and a village at least two
(section 5.3). So a Rift never blocks a capture, a siege, training, a nest,
or a city's first ring, and no unit ever stands on a Rift next to a center
except a flyer.

## 5. Map generation

### 5.1 When and with what randomness

- Rifts are placed on the **accepted** board of every generated map type
  (Dry Land, Pangea, Continents, Archipelago, Lakes), after the treasure
  chests. Placement never rejects a candidate board and never retries the
  generator: it only turns up to six land tiles into Rift tiles.
- Placement draws from its **own Mulberry32 stream**, seeded with
  `seedFromText("pulp-wars-rift:" + seed)` (the FNV-1a hash of that text).
  It never draws from the match stream, so the match PRNG state, the
  treasure chests, the capitals, the turn order, and every other generated
  feature are exactly what they would be without Rifts, and a board with no
  Rift is byte-identical to the board of the generator before the Rift.
- The **Showcase** has no Rift (it is a fixed board).

### 5.2 How many

| Board width | Target count (from the Rift stream's first draw) |
| ----------: | ------------------------------------------------ |
|          11 | 0 (no draw)                                      |
|          14 | 0 (no draw)                                      |
|          16 | 1 with probability 1/2, otherwise 0              |
|          20 | 1 (no draw)                                      |
|          25 | 2 with probability 1/3, otherwise 1              |

The count is a target. When a board has no legal site left, fewer Rifts are
placed; this happens mostly on Archipelago (small islands rarely hold the
five-by-three inland block a Rift needs) and on crowded 16 x 16 Continents
boards. The measured distribution is in section 9.

### 5.3 Where

A Rift is a **segment** of three tiles in a row, horizontal or vertical. A
segment is legal when:

1. each of its tiles is off the board's edge ring;
2. each of its tiles is resource-free Grass, Forest, or Mountain with no
   site, improvement, Road, Field Defense, or treasure chest (Forest and
   Mountain may be overwritten; no resource is ever lost);
3. every tile of its eight-neighbour ring is land and no Rift: a Rift never
   touches water (no coast, no lake, no Pangea coast ring) and two Rifts
   never touch;
4. no capital is within Chebyshev distance 2 of any of its tiles (so a Rift
   never enters a capital's first ring or its Land Grant footprint) and no
   village within distance 1 (never in a village's first ring);
5. no tile of another Rift is within Chebyshev distance 3;
6. Grass, Forest, and Mountain each stay somewhere on the board.

Segments are enumerated in (y, x) order of their first tile, horizontal
before vertical. For each Rift, one legal segment is drawn uniformly with
the Rift stream (`nextBounded` over the legal list).

### 5.4 Connectivity

A drawn segment must not split land. Removing its tiles must leave every
eight-connected land component of the board (before this Rift) connected,
under both ground routes the rules use: all land (a route with Engineering)
and land without Mountains (the route without it, on which treasure chests
and Dry Land capitals are checked). So no capital, village, or chest loses a
land route it had, and in particular no start loses its land route to any
enemy. A segment that fails is dropped from the list and the draw repeats
over the rest; with no segment left, the board gets fewer Rifts. Rule 3
already makes a split impossible for a single Rift (its whole ring is land);
the check proves it on every board.

### 5.5 Older identities and parity support

Earlier identities are rejected, never migrated, as for every identity bump.
The test-only generation rules `PANGEA_COAST_RING` reproduce the generator
before the Rift; the current rules are `RIFTS`.

## 6. Normal AI

The AI reads the rules through the public queries, so every legal Move,
attack, and ability it considers already obeys sections 3 and 4. Its own
estimates were made to agree:

- the campaign and endgame distance maps, the naval plan's land components,
  and the Road corridor treat a Rift as impassable ground (no Road on it);
- the threat estimate lets a hostile flyer move over and stand on a Rift and
  keeps every other unit off it, and no hostile Kaboom is expected from a
  Rift.

The AI does not seek Rifts out: a Martian flyer ends on one only when its
ordinary move choice lands there.

## 7. Identity, state, and persistence

- Identity `pulp-wars-poc-7r28`; earlier identities are rejected. The save
  key is `pulpWars.save.v7r28.current`.
- The state, command, event, and view shapes are unchanged apart from the
  new terrain value: no field was added. A board without a Rift serializes
  exactly as before.

## 8. Presentation

- **Default look and Classic look (CHIBI):** six 80 x 80 terrain pieces,
  `TERRAIN:RIFT_H_WEST`, `_H_MIDDLE`, `_H_EAST`, `_V_NORTH`, `_V_MIDDLE`,
  `_V_SOUTH`, cut from one generated crack per orientation over the accepted
  Grass tile, so the three tiles join into one crack and every outer edge is
  the Grass tile's own edge ([art notes](../art/classes/terrain-tiles.md)).
  The renderer picks the piece from the Rift's neighbours.
- **LEGACY:** the Grass tile with a code-drawn crack of the same shape
  (dark chasm, ember line), the precedent of the Ice Folk Snow in LEGACY.
- The selected-tile panel names the tile "Rift" and says only flyers stand
  on it and nothing can be built on it.

## 9. Implementation notes (`pulp_wars-9s0.5`)

- `src/engine/v7/rift.ts` holds the shared Rift reads and the placement;
  `canEnterTerrainV7` has the `RIFT` case; the rulings of section 4.3 are
  in the canonical combat and ability code and in their public twins.
- The map generator calls the placement on the accepted board under the
  `RIFTS` rules.
- **Measured counts** (`npm run validate:ruleset7-naval-maps`, seeds 0-31
  for every AI count, maps with 0 / 1 / 2 Rifts):

  | Map type    | 11 x 11 | 14 x 14 | 16 x 16 | 20 x 20 | 25 x 25 |
  | ----------- | ------- | ------- | ------- | ------- | ------- |
  | Dry Land    | 32/0/0  | 64/0/0  | 45/51/0 | 0/96/0  | 0/60/36 |
  | Pangea      | 32/0/0  | 64/0/0  | 45/51/0 | 0/96/0  | 0/60/36 |
  | Continents  | 32/0/0  | 64/0/0  | 64/32/0 | 13/83/0 | 1/62/33 |
  | Archipelago | 32/0/0  | 64/0/0  | 92/4/0  | 90/6/0  | 62/33/1 |
  | Lakes       | 32/0/0  | 64/0/0  | 46/50/0 | 0/96/0  | 0/60/36 |

  Archipelago and crowded Continents boards often have no legal site:
  their islands rarely hold a run of three tiles with land all round it.

- **Parity.** A board without a Rift is byte-identical to the board of the
  generator before the Rift (tests and the validator check every such
  board). Headless Normal matches on boards without a Rift (11 x 11 to
  16 x 16 of every map type, and the Showcase) are identical to those of
  the previous identity at every step, apart from the identity. The Dry
  Land parity file was re-pinned for the 60 of its 96 cells whose board
  gained a Rift (16 x 16 seeds 4-7, every 20 x 20 and 25 x 25 cell).
