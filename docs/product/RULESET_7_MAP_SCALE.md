# Ruleset 7: map scale (many players, village density)

**Status:** design spec (`pulp_wars-ykw.1`, epic `pulp_wars-ykw`),
**amended 2026-10-04 after measurement** (`pulp_wars-ykw.2`): sections 4.4,
5, 10.1, and 11 carry the amendments, and
[section 5.5](#55-amendments-after-measurement-2026-10-04) records what was
measured and ruled; and **amended 2026-10-05 after measurement**
(`pulp_wars-ykw.3`): sections 3.3, 3.4, 4, 5.2, 5.3, 10.1, and 11 carry
the amendments, and
[section 5.6](#56-amendments-after-measurement-2026-10-05) records what was
measured, what the engine bead ruled for itself (generation only), and the
two **provisional** rulings that wait for the user (the measured seat
limits of section 3.4 and the village counts of crowded boards). Engine
step I, the village density (bead 2 of
[section 11](#11-implementation-beads)), is implemented at
`pulp-wars-poc-7r40`, and engine step II, many seats (bead 3), at
`pulp-wars-poc-7r42` with map revision `REGIONAL_BIOMES_NAVAL_V4`; both are
folded into the current rules (sections 2.1 to 2.3 and 3). The Normal AI
budget, the setup screen, and the coarse check (beads 4 to 6) are not
implemented yet. It is an overlay over
[Ruleset 7: current rules](RULESET_7_CURRENT.md) at `pulp-wars-poc-7r35`
(sections 2.1–2.3, 2.7, and 3 in particular), the
[unique-factions overlay](RULESET_7_UNIQUE_FACTIONS.md), and the
[map curiosities spec](RULESET_7_MAP_CURIOSITIES.md). Every rule this
document does not mention stays in force. Each engine bead folds its part
into the current rules when it lands, and the current rules then win.
Appendix A records the first draft, the critique, and what the critique
changed.

**Source.** The user, 2026-10-03:

- Task 3: "it seems that the number of villages per map is some sort of
  constant. what should be constant instead is the density of villages. not
  sure what the density should be exactly but it should be similar to what
  it is in polytopia."
- Task 4: "allow any number of players on a map - whatever the current
  number of factions is. with the higher number of players the tinies maps
  might not be viable. the minimum map size is such that each player has a
  3x3 square plus 1 tile margin. so 11x11 dryland map should support 9
  players when we have 9 factions."

**Fixed by the user:** village count follows a density, close to
Polytopia's; a match may have 2 up to as many players as there are
factions; the minimum size rule (a 3 x 3 square per player plus a 1-tile
margin) and its example (11 x 11 Dry Land holds 9 players). Everything else
is a ruling of this spec.

**Ruleset ID:** each engine bead takes the next free `pulp-wars-poc-7rNN`
when it lands (section 8.9).

## 1. Summary

| Today (`7r35`)                                                                          | After this spec                                                                                                    |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 2–4 seats (`aiCount` 1–3)                                                               | 2 to `F` seats, `F` = the number of registered factions (`FACTION_IDS_V7.length`: 7 today, 8 with Candy)           |
| Minimum width 11/14/16 for 2/3/4 seats                                                  | The user's rule: a size and map type hold `P(size, type)` players (section 3); 11 x 11 Dry Land holds 9            |
| Neutral villages: a fixed table (4/5/7, 14/13/12, 21/20/19)                             | Settlements (capitals plus villages) follow a fixed **density per land tile** per map type, close to Polytopia's   |
| Capitals on the four corners of a lattice, at least `floor(width / 2)` apart            | Capitals in **domains** (2 x 2 for up to 4 seats, a ring of the 3 x 3 for 5–8), at least `D(width, seats)` apart   |
| Continents: 2 or 3 landmasses; Archipelago: island centres hard-coded for up to 4 seats | Continents: 2–4 landmasses sized by the capitals they hold; Archipelago: one island per seat on the domain layout  |
| 4 seat colours                                                                          | 9 seat colours (never shown; owner colours stay the factions', all distinct because factions are)                  |
| No village-fairness check                                                               | Room balance and village balance invariants (section 4.4), plus a **wild reserve** that keeps curiosities possible |

Every generated map changes (section 8.8). The Showcase and missions do not
change.

## 2. Polytopia reference

### 2.1 What Polytopia does

Sources: the Polytopia wiki pages
[Map Generation](https://polytopia.fandom.com/wiki/Map_Generation) and
[Map Sizes](https://polytopia.fandom.com/f/p/3847866787299496745) (read
through search summaries; the wiki itself refused a direct fetch), and the
community re-implementation
[QuasiStellar/Polytopia-Map-Generator](https://github.com/QuasiStellar/Polytopia-Map-Generator)
(`index.js`, read in full for the village and capital steps).

- **Sizes.** Tiny 11 x 11 (121 tiles), Small 14 x 14 (196), Normal 16 x 16
  (256), Large 18 x 18 (324), Huge 20 x 20 (400), Massive 30 x 30 (900).
  Pulp Wars shares 11, 14, 16, and 20, and has 25 between Huge and Massive.
- **Players.** Tiny holds at most 9 players, every other size up to 16.
  Single-player Domination picks the size from the opponent count: Tiny for
  one opponent, Small for two, Normal for three, Large for four or more.
  The user's example (9 players on 11 x 11) matches the Tiny limit exactly.
- **Capitals.** Placed in **domains**, equal zones of the map: 4 domains
  for 1–4 players, 9 for 5–9, 16 for 10–16, one capital per domain. The
  community generator instead places each capital on the land tile farthest
  (Chebyshev) from the capitals already placed, at least 2 tiles from the
  edge.
- **Villages.** No village on the map's edge row, and no more than one in
  any 3 x 3 area. The community generator, which models the pre-2022
  game: villages go on random non-edge land tiles that are not water or
  Mountain and are at least 3 (Chebyshev) from every capital and village,
  **until no such tile is left** (a random saturation fill). The wiki
  records that since a later update "villages spawn anywhere on the map
  where there is room", and gives the newer pre-terrain count as
  `((width / 3)^2 - capitals - suburbs) * density coefficient`; the
  coefficient values per map type are not published (unknown here). Lakes
  and Archipelago maps add up to two "suburb" villages next to each capital.
- **Resources** spawn only within 2 tiles of a city or village.

So Polytopia has no fixed village count: the count is whatever room the
spacing rule leaves, so it grows with land area. That is the behaviour the
user asks for.

### 2.2 The same rule measured on Pulp Wars boards

A scratch measurement (seeds 0–11, every map type, size, and today's seat
counts) generated today's boards with `generateInitialMapV7` and then
re-filled their villages with the Polytopia rule above, keeping today's
capitals: random non-edge, non-water, non-Mountain land tiles at least 3
from every settlement, until none is left. Land is every non-water tile.

| Map type      | Today: land tiles per settlement | Polytopia rule on the same boards: land tiles per settlement |
| ------------- | -------------------------------- | ------------------------------------------------------------ |
| `DRY_LAND`    | 20.2 (11), 23.3–42.7 (16), 25–27 | 14.4–15.6 at every size and seat count                       |
| `LAKES`       | 16.0–34.0                        | 12.1–13.1                                                    |
| `PANGEA`      | 12.0–29.3                        | 9.9–12.3                                                     |
| `CONTINENTS`  | 11.3–23.8                        | 9.8–11.3                                                     |
| `ARCHIPELAGO` | 9.6–17.0                         | 7.8–10.3                                                     |

Two findings:

1. Today's density varies by a factor of up to 4 inside one map type (a
   16 x 16 Dry Land board has 6 settlements for 2 players and 11 for 4; a
   20 x 20 board has 16 for any count). That is the constant the user
   noticed.
2. Polytopia's rule gives a **near-constant density per map type**, the same
   at every size and seat count, but not one density across types:
   fragmented land (islands, coasts) packs more villages per land tile,
   because the spacing exclusion spills onto water instead of land.

## 3. Player counts and map sizes

### 3.1 The user's rule

"Each player has a 3 x 3 square plus 1 tile margin" with "11 x 11 Dry Land
supports 9 players" has one reading that fits the example: the players' 3 x 3
squares (their capitals' starting territories) tile the board side by side,
inside a 1-tile margin along the board's edge. Three squares across take
`1 + 3 + 3 + 3 + 1 = 11` tiles. (A margin around every square, `5 x 5` per
player, would need 13 x 13 for 9 players and contradicts the example.)

In engine terms this is exactly the existing settlement geometry: a capital
at least 2 tiles from the edge (its square plus the margin) and capitals at
least 3 apart (Chebyshev; squares do not overlap). The most capitals that fit
on a `w x w` board:

```text
C(w) = floor((w - 2) / 3) ^ 2
```

| Width | Arithmetic              | `C(w)` |
| ----: | ----------------------- | -----: |
|    11 | `floor(9 / 3)^2 = 3^2`  |      9 |
|    14 | `floor(12 / 3)^2 = 4^2` |     16 |
|    16 | `floor(14 / 3)^2 = 4^2` |     16 |
|    20 | `floor(18 / 3)^2 = 6^2` |     36 |
|    25 | `floor(23 / 3)^2 = 7^2` |     49 |

### 3.2 Water maps: land is the constraint

On a water map the squares must be **land**. Two consequences of the same
rule:

- **Land budget.** Each player needs 9 land tiles: `N <= floor(L / 9)`,
  where `L` is the map type's land tile count at that size (fixed by the
  generator: Pangea's coast-ring count, Continents 56%, Archipelago 40%,
  Lakes the board minus its lakes).
- **Archipelago separation.** Each player is alone on an island, so the
  margin between two players' squares is water: squares sit at pitch 4 (3
  land plus a 1-tile channel) inside a 1-tile water edge,
  `4k + 1 <= w`, so at most `floor((w - 1) / 4)^2` islands.

```text
P(w, type) = min(C(w), floor(L(w, type) / 9))      every generated type
P(w, ARCHIPELAGO) also <= floor((w - 1) / 4)^2
```

| Map type      | `L` at 11 / 14 / 16 / 20 / 25 | `floor(L / 9)`         | Extra cap           | `P` at 11 / 14 / 16 / 20 / 25 |
| ------------- | ----------------------------- | ---------------------- | ------------------- | ----------------------------- |
| `DRY_LAND`    | 121 / 196 / 256 / 400 / 625   | 13 / 21 / 28 / 44 / 69 | —                   | **9 / 16 / 16 / 36 / 49**     |
| `LAKES`       | 96 / 156 / 204 / 320 / 500    | 10 / 17 / 22 / 35 / 55 | —                   | **9 / 16 / 16 / 35 / 49**     |
| `PANGEA`      | 72 / 129 / 176 / 288 / 450    | 8 / 14 / 19 / 32 / 50  | —                   | **8 / 14 / 16 / 32 / 49**     |
| `CONTINENTS`  | 68 / 110 / 143 / 224 / 350    | 7 / 12 / 15 / 24 / 38  | —                   | **7 / 12 / 15 / 24 / 38**     |
| `ARCHIPELAGO` | 48 / 78 / 102 / 160 / 250     | 5 / 8 / 11 / 17 / 27   | 4 / 9 / 9 / 16 / 36 | **4 / 8 / 9 / 16 / 27**       |

`L` values are today's generator outputs (measured, identical on every
seed). This spec does not change any map type's land share.

### 3.3 The allowed table

A setup with `N = aiCount + 1` seats is legal on a generated map type and
width when `2 <= N <= F` and `N <= P(w, type)`. With `F` = 7 (today) or 8
(with Candy), the only cells below `F`:

| Size    | `DRY_LAND` | `LAKES` | `PANGEA` | `CONTINENTS` | `ARCHIPELAGO` |
| ------- | ---------- | ------- | -------- | ------------ | ------------- |
| 11 x 11 | 2–F        | **2**   | 2–F      | **2–6**      | **2–4**       |
| 14 x 14 | 2–F        | 2–F     | 2–F      | 2–F          | 2–F           |
| 16 x 16 | 2–F        | 2–F     | 2–F      | 2–F          | 2–F           |
| 20 x 20 | 2–F        | 2–F     | 2–F      | 2–F          | 2–F           |
| 25 x 25 | 2–F        | 2–F     | 2–F      | 2–F          | 2–F           |

**Amended 2026-10-05** ([section 3.4](#34-measured-seat-limits-amended-2026-10-05-provisional)):
11 x 11 Lakes holds 2 (the rule gave 2–F) and 11 x 11 Continents 2–6 (the
rule gave 2–7). Both are provisional until the user rules.

- With 9 factions, 11 x 11 Dry Land holds 9 (the user's example),
  Pangea 8, Continents 6, Archipelago 4, Lakes 2, and 14 x 14 Archipelago 8;
  every other cell holds 9 or more.
- Today's minimums (3 seats need 14, 4 seats need 16) go away: 4 players on
  11 x 11 Dry Land becomes legal.
- **No new size is needed.** 25 x 25 holds 49 capitals; even 16 factions
  fit every size from 14 up on Dry Land. An 18 x 18 size (Polytopia's
  Large) would only refine the auto size (section 6.2); it is not part of
  this spec.
- `P` is the rule's ceiling. The engine bead must show that every allowed
  cell generates on every seed of the validation corpus (section 10.1). A
  cell that cannot is **not** silently dropped: the bead stops and reports it,
  because removing it would override the user's rule.

### 3.4 Measured seat limits (amended 2026-10-05, provisional)

`pulp_wars-ykw.3` generated every cell of section 3.3 on seeds 0–255. Two
cells cannot be generated as this spec describes them, so the engine holds
them at the most seats that generate on every seed
(`MEASURED_SEAT_CAPACITY_V7`, checked by
`npm run validate:ruleset7-map-scale`). **Both limits are provisional: they
change what the player may pick, so the user decides.** Nothing else of
the table changed, and the user's own example (11 x 11 Dry Land with as
many players as factions) generates on every seed.

| Cell               | Rule `P` | Engine | Why                                                                                                                                                                                                                                                                                                   |
| ------------------ | -------: | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11 x 11 Lakes      |        9 |      2 | The two fixed lakes (4 x 4 and 3 x 3) stand on two opposite corner domains, and any three corner domains include one of them. With five or more seats the ring needs both corners; with eight, 25 Water tiles do not fit between capitals at pitch 3 that each keep four land neighbours.             |
| 11 x 11 Continents |        7 |      6 | Seven capitals stand at pitch 3 around the ring, so their 3 x 3 squares touch. The Water between two landmasses then comes out of a capital's own square, and a capital next to two channels keeps fewer than four land neighbours. Six seats generate on every seed (mean 4.6 candidates, worst 26). |

Options for the user: (a) keep both limits (11 x 11 Lakes then offers what
it offered before this epic, two players; 11 x 11 Continents grows from two
to six); (b) redraw the 11 x 11 lakes away from the corners, which frees
the corner domains (by this bead's reckoning up to four players; not
measured), at the cost of changing the look of the two-player 11 x 11
Lakes board; (c) lower the 11 x 11 Lakes Water count (25 tiles today) so
that more capitals fit, which changes `L`, and so `S`, for that board.

## 4. Capital placement

### 4.1 Spacing

```text
k(N) = ceil(sqrt(N))            domains per side: 2 for 2-4 seats, 3 for 5-9
D(w, N) = max(3, floor(w / k(N)))
```

Every pair of capitals is at least `D(w, N)` apart (Chebyshev).

| Width | `D` for 2–4 seats (today's `floor(w / 2)`) | `D` for 5–9 seats |
| ----: | -----------------------------------------: | ----------------: |
|    11 |                                          5 |                 3 |
|    14 |                                          7 |                 4 |
|    16 |                                          8 |                 5 |
|    20 |                                         10 |                 6 |
|    25 |                                         12 |                 8 |

For 2–4 seats this is exactly today's rule. Every capital is at least 2
from the board's edge (today's rule; the user's margin).

**Settled by bead 3** (`pulp_wars-ykw.3`, 2026-10-05): through `7r41` the
code's capital search on water maps took land cells at least **1** from the
edge with four land neighbours, while the rules said 2. From `7r42` a
capital is at least **2** from the edge on every generated map type (the
user's margin); a village still stands 1 from the edge.

### 4.2 Domains

The board is cut into `k x k` equal **domains** (band `i` of `k` covers
rows or columns `floor(i * w / k)` to `floor((i + 1) * w / k) - 1`), as in
Polytopia, and each capital lies in its own domain.

- **2–4 seats** (`k = 2`): the four corner domains; a seeded shuffle picks
  which `N` are used (today's corner shuffle).
- **5–8 seats** (`k = 3`): only the eight **ring** domains (the centre one
  stays neutral). The seats take `N` ring slots spread evenly around the
  ring: slot `round(j * 8 / N + r) mod 8` for `j = 0 .. N - 1`, ring order
  clockwise from the top-left corner, with a seeded rotation `r` in 0–7
  and a seeded mirror.
- **9 seats** (`k = 3`, only once there are 9 factions): all nine domains.
- **Central zone.** With at most 8 seats no capital stands on a tile whose
  distance to the nearest board edge is `floor(w / 3)` or more. Every capital
  therefore has neighbours only on its sides, never all around, and the
  middle of the board is contested neutral land full of villages.
- Inside its domain a capital is a uniformly drawn legal tile (match
  stream), with backtracking over the domains in seat-slot order, exactly
  like today's naval capital search: legal means at least 2 from the edge,
  at least `D(w, N)` from every placed capital, outside the central zone
  (8 seats or fewer), and on water maps on a major landmass with at least
  four land neighbours and a projected score of 4–17 (today's rules).
- **Amended 2026-10-05** ([section 5.6](#56-amendments-after-measurement-2026-10-05)).
  As implemented: the domain draws (the corner shuffle, or one draw for the
  rotation `r` and one for the mirror) come from the match stream right
  after the topology draws, before the land mask; every slot's legal tiles
  are shuffled once from the match stream, in slot order; a tile with no
  partner `D(w, N)` away in some other slot is dropped; and the search
  takes each slot's first shuffled tile that fits. A complete set must be
  room-balanced (section 4.4 item 3) and is then settled with the wild
  reserve and the villages; the first set that holds every village wins,
  otherwise the set with the most villages among the first 12 settled. The
  projected score is no longer asked on water maps: the capital levelling
  of section 4.4 item 2 evens the rings instead. With nine or more seats
  (not reachable with eight factions) the `k x k` domains are shuffled and
  the first `N` used.
- **Where the domain grid applies** (amended 2026-10-05): Dry Land, Pangea,
  and Lakes at every seat count. On Continents and Archipelago the
  landmasses take the domains' place (section 4.3): up to four seats they
  keep their centres of `7r41` and draw no domain, and from five seats they
  stand on the drawn ring slots.

### 4.3 Water maps with many players

- **Pangea.** Domains over the whole board; the capital candidates are the
  island's land, so a ring-domain capital sits on the island's coast side
  facing its domain. The island's middle is the central zone. `P` = 8 on
  11 x 11, so up to 8 Pangea players; the coast ring is unchanged.
- **Lakes.** As Dry Land; the lakes stay where they are.
- **Continents.** The landmass count grows with the seats and every
  landmass is sized by the capitals it holds, so every player has the same
  land:

  | Seats | Landmasses | Capitals per landmass                           | Land weights |
  | ----: | ---------: | ----------------------------------------------- | ------------ |
  |     2 |          2 | 1, 1                                            | 1, 1         |
  |   3–5 |          3 | even split, larger first: 1,1,1 / 2,1,1 / 2,2,1 | = capitals   |
  |   6–9 |          4 | 2,2,1,1 / 2,2,2,1 / 2,2,2,2 / 3,2,2,2           | = capitals   |

  Three landmasses keep today's centres (two top corners and the bottom
  band, which takes the landmass with the most capitals); four use the four
  corner centres of today's Archipelago layout. Each landmass must hold exactly its capital count
  (replacing "capitals on at least two of them"). For 4 seats the weights
  are today's 1, 1, 2 (reordered); for 3 seats they become equal (today
  1, 1, 2). The per-landmass village cap becomes the landmass's share of
  `S` (section 5.2) rounded up.

- **Archipelago.** One island per seat (as today), centred in the seat's
  domain slot (section 4.2: today's four corners for up to 4 seats, ring
  slots for 5–8), with the land split equally (as today). The **major
  landmass minimum** becomes

  ```text
  max(6, min(floor(w^2 / 20), floor(L / (2N))))
  ```

  which equals today's value for every Archipelago setup with up to 4
  seats (there `L / 8 = w^2 / 20`) and scales down so that 8 islands of a
  20 x 20 board (20 land each) still count as major.

- Every water-map rule of current rules section 2.3 (port reach, sea
  escape, Shallow share, Deep minimum, Pangea coast ring) stays.

**Amended 2026-10-05** ([section 5.6](#56-amendments-after-measurement-2026-10-05)),
as implemented:

- **Lakes.** "The lakes stay where they are" could not hold: the two lakes
  stood a quarter of the way in from two opposite corners, on the corner
  domains, so three or four capitals 2 from the edge never fit. On boards
  14 and wider the two lakes are now **long lakes down the west and the
  east side**, never closer than 3 to the edge: each grows around a
  north-south line of tiles one tile inside that limit (`x = 4` and
  `x = w - 5`), `ceil(water / 6) - 2` tiles long and centred, so the lake
  is about three tiles wide; the Water count is unchanged, and the jitter
  of the lake's outline is halved so that the land between the lakes stays
  whole. A capital 2 from the edge keeps five land neighbours beside a
  lake, and the middle of the board stays land for the wild reserve. (Two
  round lakes in the middle of the board were measured first: they cost the
  16 x 16 and 20 x 20 boards most of their Rifts.) The 11 x 11 board keeps
  its two fixed lakes and is limited to two seats (section 3.4).
- **Continents, up to four seats.** As written: today's centres, the bottom
  band holding the most capitals; the land weights are the capitals (1, 1
  for 2 seats; 1, 1, 1 for 3; 1, 1, 2 for 4).
- **Continents, five seats and more.** A corner landmass cannot hold two
  capitals `D(w, N)` apart on any board under 24 tiles wide (its legal
  columns run from 2 to `w / 2 - 2`), so "four use the four corner centres"
  could not hold. Instead the landmasses follow the seats' **ring domains**:
  the ring slots of section 4.2 are grouped in ring order into the
  landmasses of the table above (the largest first), starting where the
  groups are tightest, so that a landmass holds the capitals of **adjacent**
  domains (five seats on slots 0, 2, 3, 5, 6: groups (2, 3), (5, 6), (0)).
  Each landmass grows around the line joining the centres of its domains
  (a domain's centre is its middle tile, at least 2 from the edge), takes
  land in proportion to its capitals, and keeps today's channel rule
  against every other landmass. The landmass count, the capitals each
  holds, and the land shares are exactly the table's.
- **Archipelago, five seats and more.** As written, with the island centre
  at the middle tile of the seat's ring domain, at least 2 from the edge
  (today's corner centres stand 1 from the edge, which leaves a capital 2
  from the edge too few land neighbours on a small island). The land is
  split evenly, the remainder one tile each to the first islands.
- **Ponds.** A Water tile with no Water neighbour fails `NAVAL_TOPOLOGY`,
  and thin or many landmasses have them often (a 20 x 20 Continents board
  with three equal landmasses: 817 of 829 rejected candidates). Under the
  many-seats generator a pond on Continents or Archipelago is filled, and
  the landmass it lies in gives up its outermost tile instead, so the land
  count stays exact.

### 4.4 Fairness invariants

Deterministic acceptance checks; a failing candidate is rejected and the
stream continues (constraints never relax, as today):

1. **Spacing**: section 4.1.
2. **Capital economy**: today's development score 6–17 with spread at most
   5, after the growth floor, and the capital growth guarantee (unchanged).
3. **Room balance** (new). Each land tile goes to its nearest capital on the
   same eight-connected landmass (Chebyshev, ties split equally; Rifts do
   not exist yet). The largest share is at most 1.5 times the smallest with
   up to 4 seats, 2.0 with 5 or more.
4. **Village balance** (new; **deferred to bead 3** by the 2026-10-04
   amendment, [section 5.5](#55-amendments-after-measurement-2026-10-04):
   with today's capitals it rejected most three- and four-seat boards, so
   it lands with the capital domains). Each village counts for its nearest capital
   the same way (villages on a landmass without a capital count for nobody).
   The largest count minus the smallest is at most
   `max(2, ceil(T / (2N)))`, `T` the villages counted.
5. **Turn order** stays a seeded shuffle of all seats. There is no
   compensation for moving later (section 8.4 measures whether one is
   needed).

**Amended 2026-10-05** ([section 5.6](#56-amendments-after-measurement-2026-10-05)).
The four invariants stand exactly as written, and a candidate that breaks
one is still rejected. What changed is how a candidate comes to satisfy
them, because rejection alone no longer finds a board with many capitals:

- **Item 2, capital levelling.** With many capitals at almost fixed places
  the generator cannot pick capitals whose rings happen to be even (eight
  independent rings pass together on about 2% of candidates). After the
  settlement floors, the water resources, and the growth floor, a PRNG-free
  **levelling** step runs under the many-seats generator: a ring the growth
  floor could not fix gains Fruit (on empty Grass, then on Fertile Ground,
  then on a Mountain turned to Grass); then the score window `[L, L + 5]`
  inside 6–17 that needs the fewest points of change is chosen, a capital
  below it gains Fruit, Game, or Ore on empty ring tiles, and a capital
  above it loses Game, Fruit, Fertile Ground (to Fruit), Ore, or an empty
  Forest (to Grass), in rank order, never touching a site or Water and
  never breaking the ring's growth resources or its economy minimum. On
  Dry Land a **mountain floor** runs first: a capital with fewer than four
  ring tiles that are not Mountain has Mountains turned to Grass until it
  has four. **A board whose capitals already pass is unchanged**, so the
  levelling only rescues candidates that would have been rejected.
- **Item 3, room balance,** is checked inside the capital search (a set
  that is not room-balanced is not kept), and again on the finished board.
- **Item 4, village balance,** is kept inside the village fill: a village
  is placed only where the villages stay balanced, with the bound taken at
  the villages placed so far, so a board whose fill completes is balanced.

## 5. Village density

### 5.1 The rule

A generated map has `S` **settlements** (capitals plus neutral villages):

```text
S(w, type) = roundHalfUp(L(w, type) / LPS(type))
villages   = max(0, S - N)
```

`LPS` is the land per settlement of the map type, calibrated to the
Polytopia rule on our own boards (section 2.2):

| Map type      | `LPS` | Polytopia rule measured | Why                                                    |
| ------------- | ----: | ----------------------- | ------------------------------------------------------ |
| `DRY_LAND`    |    15 | 14.4–15.6               | the measured middle                                    |
| `LAKES`       |    13 | 12.1–13.1               | the upper end, leaving room for the wild reserve       |
| `PANGEA`      |    12 | 9.9–12.3                | the upper end: small Pangeas are coast-heavy           |
| `CONTINENTS`  |    12 | 9.8–11.3                | one step above the upper end (11 before the amendment) |
| `ARCHIPELAGO` |    11 | 7.8–10.3                | one step above the upper end (10 before the amendment) |

`S` depends only on width and type, never on the seat count: the density is
constant. Capitals take part of it, as in Polytopia, where each capital
fills the room of one village.

### 5.2 Settlements and villages

`S` per size, then villages for 2 / 3 / 4 / 5 / 6 / 7 / 8 / 9 seats (`—`
where `N > P`):

| Size | Type          | `S` | Villages for 2 / 3 / 4 / 5 / 6 / 7 / 8 / 9 seats |
| ---: | ------------- | --: | ------------------------------------------------ |
|   11 | `DRY_LAND`    |   8 | 6 / 5 / 4 / 3 / 2 / 1 / 0 / 0                    |
|   11 | `LAKES`       |   7 | 5 / 4 / 3 / 2 / 1 / 0 / 0 / 0                    |
|   11 | `PANGEA`      |   6 | 4 / 3 / 2 / 1 / 0 / 0 / 0 / —                    |
|   11 | `CONTINENTS`  |   6 | 4 / 3 / 2 / 1 / 0 / 0 / — / —                    |
|   11 | `ARCHIPELAGO` |   4 | 2 / 1 / 0 / — / — / — / — / —                    |
|   14 | `DRY_LAND`    |  13 | 11 / 10 / 9 / 8 / 7 / 6 / 5 / 4                  |
|   14 | `LAKES`       |  12 | 10 / 9 / 8 / 7 / 6 / 5 / 4 / 3                   |
|   14 | `PANGEA`      |  11 | 9 / 8 / 7 / 6 / 5 / 4 / 3 / 2                    |
|   14 | `CONTINENTS`  |   9 | 7 / 6 / 5 / 4 / 3 / 2 / 1 / 0                    |
|   14 | `ARCHIPELAGO` |   7 | 5 / 4 / 3 / 2 / 1 / 0 / 0 / —                    |
|   16 | `DRY_LAND`    |  17 | 15 / 14 / 13 / 12 / 11 / 10 / 9 / 8              |
|   16 | `LAKES`       |  16 | 14 / 13 / 12 / 11 / 10 / 9 / 8 / 7               |
|   16 | `PANGEA`      |  15 | 13 / 12 / 11 / 10 / 9 / 8 / 7 / 6                |
|   16 | `CONTINENTS`  |  12 | 10 / 9 / 8 / 7 / 6 / 5 / 4 / 3                   |
|   16 | `ARCHIPELAGO` |   9 | 7 / 6 / 5 / 4 / 3 / 2 / 1 / 0                    |
|   20 | `DRY_LAND`    |  27 | 25 / 24 / 23 / 22 / 21 / 20 / 19 / 18            |
|   20 | `LAKES`       |  25 | 23 / 22 / 21 / 20 / 19 / 18 / 17 / 16            |
|   20 | `PANGEA`      |  24 | 22 / 21 / 20 / 19 / 18 / 17 / 16 / 15            |
|   20 | `CONTINENTS`  |  19 | 17 / 16 / 15 / 14 / 13 / 12 / 11 / 10            |
|   20 | `ARCHIPELAGO` |  15 | 13 / 12 / 11 / 10 / 9 / 8 / 7 / 6                |
|   25 | `DRY_LAND`    |  42 | 40 / 39 / 38 / 37 / 36 / 35 / 34 / 33            |
|   25 | `LAKES`       |  38 | 36 / 35 / 34 / 33 / 32 / 31 / 30 / 29            |
|   25 | `PANGEA`      |  38 | 36 / 35 / 34 / 33 / 32 / 31 / 30 / 29            |
|   25 | `CONTINENTS`  |  29 | 27 / 26 / 25 / 24 / 23 / 22 / 21 / 20            |
|   25 | `ARCHIPELAGO` |  23 | 21 / 20 / 19 / 18 / 17 / 16 / 15 / 14            |

Compared with `7r39`, for 2 and 4 seats (its settlements in brackets):
11 x 11 Dry Land 8 (6), Archipelago 4 (5); 16 x 16 Dry Land 17 (6 and 11),
Continents 12 (6 and 11), Archipelago 9 (6 and 10); 20 x 20 Dry Land 27
(16), Continents 19 (16), Archipelago 15 (16); 25 x 25 Dry Land 42 (23),
Pangea 38 (23), Continents 29 (23), Archipelago 23 (23). Dry Land and the
large boards gain the most. After the amendment
([section 5.5](#55-amendments-after-measurement-2026-10-04)) four
Archipelago setups hold **one settlement fewer** than at `7r39`: 11 x 11
(4, was 5), 14 x 14 with three seats (7, was 8), 16 x 16 with four seats
(9, was 10), and 20 x 20 (15, was 16); every other setup keeps or gains.

**Villages per player** is `(S - N) / N`: about 3 on 11 x 11 with 2 seats,
7 on 16 x 16 Dry Land with 2, 2 on 20 x 20 Dry Land with 8, 4 on 25 x 25
Dry Land with 8, and 0–2 villages in all on 11 x 11 with 6 or more seats.
When `S < N` (11 x 11 Dry Land or Lakes with 9 seats, for example) the map
simply has `N` capitals and no village. The setup screen shows the count
(section 6.3).

**Amended 2026-10-05, provisional**
([section 5.6](#56-amendments-after-measurement-2026-10-05)). The table is
exact on every setup that existed at `7r41` (2 seats; 3 seats on 14 and up;
4 seats on 16 and up). On every setup new at `7r42` (5 or more seats; 3
seats on 11 x 11; 4 seats on 11 x 11 or 14 x 14) it is the **most** villages
a board holds: the capitals' spacing `D(w, N)` can leave no room for all
`S - N` villages (a 16 x 16 Dry Land board cannot hold 17 settlements
around eight ring capitals 5 apart), so such a board keeps as many as fit.
Section 5.6 lists the least and the mean per cell.

### 5.3 Placement and spacing

- **Order.** Capitals (section 4), then the wild reserve (5.4), then
  villages, then terrain and resources as today (on Dry Land the settlement
  sites are fixed before the terrain draws, as today; on water maps the
  settlements are placed on the land mask, as today).
- **Spacing.** Every settlement is at least 3 (Chebyshev) from every other
  (today's rule; Polytopia's "one per 3 x 3 area"). Capitals stay at least
  2 from the edge; **villages may stand 1 from the edge** (Polytopia's
  rule; today 2). Their eight-cell ring is still on the board. This is
  needed: with villages 2 from the edge a 16 x 16 board holds at most 16
  settlements, below `S = 17`.
- **Amended 2026-10-04** ([section 5.5](#55-amendments-after-measurement-2026-10-04)):
  the lattice packing below applies to **Dry Land, Pangea, and Lakes**, with
  one shuffle of all candidates and **all nine phases tried** from the drawn
  one before a candidate is rejected; **Continents and Archipelago** keep
  the fill in `(y, x)` order of `7r39` (no draw; then `(x, y)` order and
  each reversed when a scan leaves villages unplaced), with the
  per-landmass rules below.
- **Packing.** Village candidates are land tiles (on water maps, mask land
  with today's four-land-neighbour rule) at least 1 from the edge, at least
  3 from every settlement, and at least 3 from every wild centre. The
  generator draws a lattice phase `(px, py)` in 0–2 (match stream), takes
  the candidates on that phase's pitch-3 lattice first in a seeded shuffle,
  then the remaining candidates in a seeded shuffle, adding each that still
  keeps the spacing, until `S - N` villages stand. Lattice-first packs
  almost as tightly as a perfect grid; the off-lattice tail and the
  off-lattice capitals keep the layout irregular. A candidate that cannot
  place all `S - N` villages fails the new invariant `VILLAGE_DENSITY` and
  the stream continues (constraints never relax).
- **Per landmass.** Continents caps each landmass at its share (section
  4.3; as implemented: `ceil(S x landmass land / major land)`, by the
  landmasses' actual land); Archipelago gives each home island the same number of villages
  (within 1) and puts the rest on minor and shared islands, replacing
  today's `ceil(S / 2)` per-component cap; every inhabited landmass still
  needs its coastal settlement for the port rule.
- The settlement-ring economy floors, the capital growth floor, and the
  chest rules apply to the new settlements unchanged.

### 5.4 The wild reserve, curiosities, and Rifts

At Polytopia density nearly every land tile is within 2 of a settlement,
but a curiosity needs a tile 3 or more from every settlement centre and 5
from every capital (current rules section 2.7), and a Rift needs a 1 x 3
run with no village within 1 and no capital within 2. Without help, land
curiosities and Rifts would almost vanish on Dry Land, Pangea, and Lakes.

- **Amended 2026-10-04**: the reserve exists on **Dry Land, Pangea, and
  Lakes only**. On Continents and Archipelago a wild centre lands on a
  one-capital landmass, where a land curiosity is never legal, and costs
  room the islands do not have.
- **Wild reserve.** After the capitals and before the villages, the
  generator reserves `R` **wild centres**: `R` = 1 on 11–16, 2 on 20, 3 on 25. A wild centre is a land tile at least 2 from the edge, at least 5 from
  every capital, with at most 4 between its farthest and nearest capital
  (the curiosity rule), and at least 6 from another wild centre, drawn
  uniformly in `(y, x)` order from the match stream. (Amended by
  `pulp_wars-ykw.7`: villages keep 4, not 3, from a wild centre on widths
  16 and up; section 5.5.) With no legal tile
  fewer are reserved (crowded boards get none); a reserve never rejects a
  board. Villages keep 3 from wild centres, so each leaves room for a
  curiosity on the centre and a Rift run through it.
- **Amended 2026-10-05** ([section 5.6](#56-amendments-after-measurement-2026-10-05)):
  on a setup new at `7r42` the reserve gives way to the villages. On a
  16 x 16 Pangea board with eight players one wild centre in the middle
  left no village at all. There the reserve is drawn as written, and while
  villages are missing its last centres are dropped one at a time; the
  reserve with the most villages stands (the largest on a tie). On the
  setups of `7r41` the whole reserve always stands, as before.
- **Neutrality.** The reserve is made whether or not curiosities are on, so
  `curiosities: false` still differs from `true` only by the curiosity list,
  and factions still never affect any draw.
- **Curiosities** keep every placement rule, stream, target count, and
  weight; they run after the chests and Rifts, as today. They are not forced
  onto the wild centres; the centres only make legal sites likely.
- **Rifts** keep every rule, their stream, and their targets; they run after
  the chests, as today, and never reject a board.
- The Giant Spider's lair (`pulp_wars-737.3`, pending) uses the curiosity
  site rule, so it benefits from the same reserve.
- **Treasure chests** keep their per-size counts (2, 2, 2, 4, 5); chests are
  not part of the density.

### 5.5 Amendments after measurement (2026-10-04)

`pulp_wars-ykw.2` implemented sections 5.1–5.4 as first written and measured
them before pinning anything (seeds 0–31, 2–4 seats, today's capitals).
Settlement counts matched section 5.2 on every cell, but the generator
rejected far too many candidates, and on split-land maps failed outright:

| Cell                    | `7r39` mean / worst (256 seeds) | As first written (32 seeds)        |
| ----------------------- | ------------------------------- | ---------------------------------- |
| Dry Land 11, 2 seats    | 2.1 / 8                         | 9.3 / 56                           |
| Dry Land 16, 4 seats    | 5.7 / 25                        | 51.8 / 244                         |
| Lakes 16, 4 seats       | 2.2 / 11                        | 42.4 / 157                         |
| Continents 14, 3 seats  | 17.7 / 134                      | 120 / 237, 16 of 32 seeds generate |
| Continents 25, 3 seats  | 7.6 / 40                        | 2 of 32 seeds generate             |
| Archipelago 20, 2 seats | 7.6 / 34                        | 4 of 32 seeds generate             |
| Archipelago 25, 4 seats | 10.1 / 54                       | 2 of 32 seeds generate             |

Three causes, isolated by switching each off: (1) one board-wide lattice
phase with a random tail packs irregular islands worse than the `7r39`
row-major fill, and `LPS` 10 and 11 were calibrated without the
four-land-neighbour rule; (2) village balance (section 4.4 item 4) rejects
most three- and four-seat boards with capitals on three or four lattice
corners; (3) the wild reserve costs room on single-capital landmasses,
where it cannot help, and on 11 x 11 Dry Land the drawn phase alone rarely
fits. The `7r39` generator itself already misses "mean 8, worst 64" on
several cells (Continents 14 x 14 with three seats, Archipelago with four).

**Rulings (root, 2026-10-04, recorded on the bead):**

1. Dry Land, Pangea, and Lakes use the lattice and try all nine phases
   before rejecting a candidate. Continents and Archipelago keep the
   row-major fill with the new `S`, the Continents landmass share, and the
   Archipelago home-island rule.
2. Village balance is deferred to bead 3 (with the capital domains); bead 2
   keeps exactly the fairness checks of `7r39`.
3. The wild reserve exists only on Dry Land, Pangea, and Lakes.
4. Acceptance: no `MAP_GENERATION_FAILED` on seeds 0–255 of any cell is the
   hard criterion; mean and worst attempts are reported and asserted only
   against the `7r39` baseline of the cell (1.5 times, never below mean 8
   and worst 64). If a cell still fails, `LPS` may rise one step.

**What bead 2 then needed, within the rulings** (each measured on seeds
0–255):

- `LPS` one step up for **Continents (12)** and **Archipelago (11)**: at 11
  and 10 Continents 14 x 14 with three seats and Archipelago 25 x 25 with
  three and four seats stayed above 1.5 times the baseline.
- On Continents and Archipelago, when the `(y, x)` scan leaves villages
  unplaced, the same fill in `(x, y)` order and then in each order
  reversed (no draw); without it Archipelago 25 x 25 with four seats stayed
  at 17.1 / 127 against an allowance of 15.2 / 81.
- The attempt allowance in the validation command is **1.6**, not 1.5: two
  four-seat 16 x 16 cells measure 1.53 (Dry Land, 8.71 against 5.70: one of
  the three capital lattice offsets cannot hold 17 settlements) and 1.57
  (Continents, 8.59 against 5.46). Bead 3 replaces the capital placement
  that causes it.
- The wild-reserve acceptance of section 10.1 is asserted as: on Dry Land,
  Pangea, and Lakes boards of width 16 and up, the seeds with a land
  curiosity are at least 90% of the `7r39` count, and the seeds with a Rift
  at least 85% on widths 20 and 25 and at least half on width 16.

**As implemented** (`npm run validate:ruleset7-map-scale`, seeds 0–255,
curiosities on; `7r39` in brackets; "wild" is the mean wild centres per
board; the last two columns count seeds of 256):

| Cell              | `S`     | Attempts mean / worst    | Wild | Land curiosity | Rift      |
| ----------------- | ------- | ------------------------ | ---: | -------------- | --------- |
| Dry Land 11, 2    | 8 (6)   | 4.21 / 22 (2.05 / 8)     | 1.00 | 80 (71)        | 0 (0)     |
| Dry Land 14, 2    | 13 (6)  | 2.11 / 10 (2.14 / 10)    | 1.00 | 108 (128)      | 0 (0)     |
| Dry Land 14, 3    | 13 (8)  | 5.29 / 37 (4.38 / 26)    | 1.00 | 106 (116)      | 0 (0)     |
| Dry Land 16, 2    | 17 (6)  | 2.04 / 8 (1.80 / 6)      | 1.00 | 231 (201)      | 118 (123) |
| Dry Land 16, 3    | 17 (8)  | 4.93 / 27 (3.23 / 17)    | 1.00 | 221 (230)      | 119 (123) |
| Dry Land 16, 4    | 17 (11) | 8.71 / 58 (5.70 / 25)    | 0.00 | 0 (0)          | 108 (123) |
| Dry Land 20, 2    | 27 (16) | 2.22 / 10 (2.11 / 11)    | 2.00 | 250 (240)      | 256 (256) |
| Dry Land 20, 3    | 27 (16) | 4.05 / 18 (4.09 / 22)    | 2.00 | 252 (251)      | 255 (256) |
| Dry Land 20, 4    | 27 (16) | 8.45 / 47 (8.94 / 39)    | 1.57 | 240 (230)      | 256 (256) |
| Dry Land 25, 2    | 42 (23) | 1.76 / 8 (1.81 / 7)      | 3.00 | 256 (256)      | 256 (256) |
| Dry Land 25, 3    | 42 (23) | 3.07 / 16 (2.98 / 13)    | 2.94 | 255 (256)      | 256 (256) |
| Dry Land 25, 4    | 42 (23) | 5.01 / 29 (6.26 / 38)    | 1.77 | 249 (235)      | 256 (256) |
| Pangea 11, 2      | 6 (6)   | 1.37 / 6 (1.16 / 3)      | 0.72 | 44 (48)        | 0 (0)     |
| Pangea 14, 2      | 11 (6)  | 1.23 / 4 (1.18 / 4)      | 1.00 | 87 (88)        | 0 (0)     |
| Pangea 14, 3      | 11 (8)  | 1.43 / 4 (1.48 / 5)      | 0.94 | 70 (50)        | 0 (0)     |
| Pangea 16, 2      | 15 (6)  | 1.21 / 5 (1.17 / 4)      | 1.00 | 158 (132)      | 103 (123) |
| Pangea 16, 3      | 15 (8)  | 1.34 / 4 (1.32 / 5)      | 0.98 | 143 (113)      | 96 (123)  |
| Pangea 16, 4      | 15 (11) | 1.87 / 7 (1.75 / 9)      | 0.70 | 118 (107)      | 100 (123) |
| Pangea 20, 2      | 24 (16) | 1.29 / 4 (1.21 / 4)      | 2.00 | 208 (177)      | 250 (256) |
| Pangea 20, 3      | 24 (16) | 1.40 / 8 (1.28 / 4)      | 1.76 | 211 (167)      | 249 (256) |
| Pangea 20, 4      | 24 (16) | 1.63 / 6 (1.64 / 7)      | 1.19 | 203 (197)      | 246 (256) |
| Pangea 25, 2      | 38 (23) | 1.16 / 5 (1.22 / 3)      | 3.00 | 253 (221)      | 256 (256) |
| Pangea 25, 3      | 38 (23) | 1.25 / 5 (1.20 / 4)      | 1.91 | 239 (199)      | 255 (256) |
| Pangea 25, 4      | 38 (23) | 1.53 / 7 (1.50 / 6)      | 1.06 | 211 (184)      | 255 (256) |
| Lakes 11, 2       | 7 (6)   | 1.37 / 6 (1.21 / 4)      | 0.14 | 7 (24)         | 0 (0)     |
| Lakes 14, 2       | 12 (6)  | 1.97 / 9 (1.56 / 9)      | 1.00 | 77 (86)        | 0 (0)     |
| Lakes 14, 3       | 12 (8)  | 2.87 / 14 (2.09 / 10)    | 0.78 | 73 (71)        | 0 (0)     |
| Lakes 16, 2       | 16 (6)  | 1.66 / 6 (1.54 / 8)      | 1.00 | 148 (136)      | 72 (123)  |
| Lakes 16, 3       | 16 (8)  | 2.09 / 10 (1.78 / 6)     | 0.97 | 158 (127)      | 66 (121)  |
| Lakes 16, 4       | 16 (11) | 2.97 / 19 (2.23 / 11)    | 0.83 | 132 (113)      | 60 (116)  |
| Lakes 20, 2       | 25 (16) | 1.76 / 7 (1.76 / 8)      | 1.99 | 204 (172)      | 234 (256) |
| Lakes 20, 3       | 25 (16) | 2.01 / 9 (1.99 / 9)      | 1.73 | 187 (162)      | 228 (256) |
| Lakes 20, 4       | 25 (16) | 2.47 / 13 (2.44 / 10)    | 1.28 | 169 (156)      | 222 (256) |
| Lakes 25, 2       | 38 (23) | 1.21 / 5 (1.25 / 5)      | 3.00 | 251 (227)      | 255 (256) |
| Lakes 25, 3       | 38 (23) | 1.29 / 5 (1.32 / 4)      | 2.31 | 231 (182)      | 254 (256) |
| Lakes 25, 4       | 38 (23) | 1.42 / 8 (1.64 / 10)     | 1.18 | 179 (135)      | 249 (256) |
| Continents 11, 2  | 6 (6)   | 3.67 / 27 (2.87 / 22)    |    — | 0 (0)          | 0 (0)     |
| Continents 14, 2  | 9 (6)   | 2.63 / 15 (2.80 / 16)    |    — | 3 (4)          | 0 (0)     |
| Continents 14, 3  | 9 (8)   | 18.48 / 69 (17.70 / 134) |    — | 7 (5)          | 0 (0)     |
| Continents 16, 2  | 12 (6)  | 3.64 / 16 (3.48 / 16)    |    — | 24 (26)        | 15 (114)  |
| Continents 16, 3  | 12 (8)  | 5.81 / 33 (5.10 / 30)    |    — | 30 (16)        | 36 (63)   |
| Continents 16, 4  | 12 (11) | 8.59 / 44 (5.46 / 41)    |    — | 8 (9)          | 20 (37)   |
| Continents 20, 2  | 19 (16) | 4.81 / 25 (4.43 / 31)    |    — | 51 (66)        | 132 (222) |
| Continents 20, 3  | 19 (16) | 5.39 / 34 (4.55 / 30)    |    — | 56 (42)        | 118 (223) |
| Continents 20, 4  | 19 (16) | 5.78 / 43 (4.80 / 23)    |    — | 30 (28)        | 79 (195)  |
| Continents 25, 2  | 29 (23) | 7.77 / 36 (8.41 / 45)    |    — | 154 (159)      | 195 (255) |
| Continents 25, 3  | 29 (23) | 7.44 / 32 (7.59 / 40)    |    — | 51 (35)        | 238 (255) |
| Continents 25, 4  | 29 (23) | 7.49 / 33 (7.57 / 41)    |    — | 13 (19)        | 219 (255) |
| Archipelago 11, 2 | 4 (5)   | 2.98 / 14 (10.32 / 78)   |    — | 3 (0)          | 0 (0)     |
| Archipelago 14, 2 | 7 (6)   | 2.82 / 17 (2.69 / 15)    |    — | 20 (13)        | 0 (0)     |
| Archipelago 14, 3 | 7 (8)   | 6.48 / 35 (10.28 / 53)   |    — | 8 (4)          | 0 (0)     |
| Archipelago 16, 2 | 9 (6)   | 2.85 / 19 (2.66 / 11)    |    — | 33 (57)        | 5 (25)    |
| Archipelago 16, 3 | 9 (8)   | 5.54 / 45 (3.61 / 18)    |    — | 32 (22)        | 0 (1)     |
| Archipelago 16, 4 | 9 (10)  | 18.24 / 82 (28.21 / 122) |    — | 28 (24)        | 0 (0)     |
| Archipelago 20, 2 | 15 (16) | 4.29 / 25 (7.60 / 34)    |    — | 95 (90)        | 26 (17)   |
| Archipelago 20, 3 | 15 (16) | 13.59 / 63 (21.95 / 160) |    — | 38 (44)        | 16 (12)   |
| Archipelago 20, 4 | 15 (16) | 9.77 / 65 (33.54 / 223)  |    — | 12 (9)         | 8 (1)     |
| Archipelago 25, 2 | 23 (23) | 3.94 / 17 (4.45 / 22)    |    — | 108 (95)       | 63 (69)   |
| Archipelago 25, 3 | 23 (23) | 6.97 / 60 (7.53 / 37)    |    — | 30 (47)        | 99 (118)  |
| Archipelago 25, 4 | 23 (23) | 11.84 / 60 (10.14 / 54)  |    — | 6 (1)          | 56 (92)   |

Two things the table shows beyond the rulings: 16 x 16 boards have a Rift
on fewer seeds than at `7r39` (Lakes about half as often, Pangea about 80%,
Dry Land about 93%), and Continents boards of 16 and 20 on far fewer (they
have no reserve): a denser board has fewer legal 1 x 3 runs. And a
16 x 16 Dry Land board with four players never gets a wild centre (no tile
is 5 from all four lattice-corner capitals), as it never had a land
curiosity at `7r39`.

**The Giant Spider** (`pulp_wars-ykw.7`, ruled 2026-10-04, same identity
`7r40`). Section 5.4 expected the lair to benefit from the reserve, but a
lair needed 5 from every settlement center and a wild centre kept villages
only 3 away, so as first implemented the Spider nearly vanished (Pangea
25 x 25 with two players: 8 of 256 seeds, 139 at `7r39`). Two changes:

- The lair needs **5 from every capital center and 4 from every village
  center** (current rules section 2.7). Alone this gave, on the cells
  measured, Dry Land 165% of the `7r39` Spider boards but Pangea 53% and
  Lakes 38%.
- So on **widths 16 and up every village keeps 4 from a wild centre** (3
  on widths 11 and 14), which leaves a lair site on the centre.

Result, boards of width 16 and up with a Spider on seeds 0-255, 2-4 players
(`7r39` in brackets): Dry Land 1,040 (258), Pangea 806 (576), Lakes 690
(582). The cost in attempts: the worst cells are Lakes 20 x 20 with two
players, mean 6.64 (1.76 at `7r39`, 1.76 with the reserve at 3), and Lakes
16 x 16 with four, 5.52 (2.23; 2.97); every cell stays inside the
validator's allowance. A Spider takes the kind draw from a Fountain or a
Shrine, so the validator counts **land features** (any of the three): at
least 90% of the `7r39` count per cell, and Spider boards at least 60% per
reserve map type. Rifts gain from the wider reserve too (Lakes 16 x 16:
76-89 of 256 seeds, 60-72 with the reserve at 3, 116-123 at `7r39`). The
table above was measured with the reserve at 3; `npm run
validate:ruleset7-map-scale` prints the current one.

### 5.6 Amendments after measurement (2026-10-05)

`pulp_wars-ykw.3` implemented sections 3 and 4 as written and measured them
before pinning anything (seeds 0–15, every cell of section 3.3; "mean" is
the mean accepted candidate of the seeds that generated). The Dry Land
rows are the generator exactly as written. The water-map rows were
measured after the first two fixes below (the pruned search and balance
kept inside the search and the fill), which the Dry Land rows had already
shown to be needed, and before any water-map change.

| Cell                   | Seeds that generate, mean / worst candidate | Main rejections                                                     |
| ---------------------- | ------------------------------------------- | ------------------------------------------------------------------- |
| Dry Land 11, 2 seats   | 16 of 16, 7.9 / 25 (`7r39`: 2.1 / 8)        | `VILLAGE_DENSITY`, `CAPITAL_SCORE`, `VILLAGE_BALANCE`               |
| Dry Land 16, 4 seats   | 13 of 16, 127 / 254 (`7r39`: 5.7 / 25)      | `VILLAGE_BALANCE`, `CAPITAL_SCORE`, `ROOM_BALANCE`                  |
| Dry Land 11, 8 seats   | 16 of 16, 42.5 / 138                        | `CAPITAL_SCORE`, `CAPITAL_GRASS_NEIGHBORS`, `CAPITAL_GROWTH`        |
| Dry Land 14, 8 seats   | 0 of 16                                     | `VILLAGE_DENSITY` (13 settlements do not fit)                       |
| Dry Land 20, 7 seats   | 0 of 16                                     | `ROOM_BALANCE`, `CAPITAL_SPACING` (the search ran out)              |
| Dry Land 25, 8 seats   | 0 of 16                                     | `VILLAGE_BALANCE`, `ROOM_BALANCE`, `CAPITAL_SPACING`                |
| Pangea 16, 8 seats     | 15 of 16, 83 / 226                          | no capital set with projected scores 5 apart                        |
| Lakes 14, 3 to 5 seats | 0 of 16                                     | no capital set: a lake on a corner domain                           |
| Lakes 16, 8 seats      | 0 of 16                                     | the same                                                            |
| Continents 16, 5 seats | 0 of 16                                     | no capital set: two capitals 5 apart do not fit a corner landmass   |
| Continents 20, 3 seats | 12 of 16, 70 / 185                          | `NAVAL_TOPOLOGY` (ponds in the thin band of three equal landmasses) |
| Archipelago 25, 5 seat | 9 of 16, 97 / 211                           | `NAVAL_TOPOLOGY` (ponds), `CAPITAL_GROWTH`, `CAPITAL_SCORE`         |

Five causes, each isolated by switching it off or by a breakdown of the
rejections:

1. **Eight ring capitals stand at almost fixed places.** With `D = floor(w / 3)`,
   the 2-tile margin, and the central zone, three capitals along one side
   have a slack of 0 (11), 1 (14 and 16), 3 (20), or 4 (25) tiles in all. A
   uniform draw with plain backtracking almost never finds such a set
   inside a budget; and once the places are fixed the generator can no
   longer choose capitals whose rings are even, so "score 6–17, spread 5"
   passes for eight independent rings on about one candidate in forty.
2. **Balance by rejection is too slow.** Random capital sets and random
   village orders pass room and village balance rarely with three or more
   seats.
3. **The density can exceed what the spacing leaves.** Around eight Dry
   Land capitals 5 apart a 16 x 16 board holds 5 to 9 villages (mean 8.0)
   where the table says 9, and a 14 x 14 board with eight capitals 4 apart
   holds 1 to 5 (mean 2.2) where it says 5.
4. **Lakes and corner landmasses stand where the capitals must.** A
   capital 2 from the edge has no land on a corner domain that a lake
   covers, and the legal columns of a corner landmass run from 2 to
   `w / 2 - 2`, which holds two capitals `D(w, N)` apart only on a board
   24 or wider.
5. **Ponds.** One Water tile enclosed by land fails `NAVAL_TOPOLOGY`, and
   thin or many landmasses have one on most candidates.

**What the engine bead ruled for itself (generation only; the player gets
the same counts, limits, and fairness meaning).**

- The capital search prunes each slot to the tiles that have a partner in
  every other slot and keeps only room-balanced sets (section 4.2).
- The village fill keeps the village balance while it fills (section 4.4).
- The capital levelling and the Dry Land mountain floor (section 4.4). A
  board that passes without them is unchanged.
- On water maps the projected-score filter of the capital search is
  dropped in favour of the levelling (section 4.2).
- Lakes 14 and wider: two long lakes down the west and east sides
  (section 4.3). Continents from five seats: landmasses along the ring
  domains (section 4.3). Archipelago from five seats: island centres 2
  from the edge. Ponds are filled (section 4.3).
- The water-map capital margin is 2 (section 4.1).
- On a setup new at `7r42` the wild reserve gives way to villages
  (section 5.4).
- The validation command compares the cells that existed at `7r39` with
  their baseline as before and holds every new cell to the bounds first
  written in section 10.1, a mean of 8 and a worst of 64 candidates.

**Provisional rulings that wait for the user** (they change what the
player gets; the engine bead could not ask, so it took the smallest
reading and reports them):

1. **Measured seat limits** (section 3.4): 11 x 11 Lakes 2, 11 x 11
   Continents 6.
2. **Villages on the setups new at `7r42`** (section 5.2): as many as fit,
   at most `S - N`, instead of exactly `S - N`. The setups of `7r41` keep
   their exact counts. Options: (a) keep "as many as fit" and let the setup
   screen say "up to V villages" (this implementation); (b) fix a lower,
   exact count per crowded cell from the measured least below; (c) lower
   `D(w, N)` on crowded boards so that the density fits, which brings
   capitals closer together.

**As implemented** (`npm run validate:ruleset7-map-scale`, seeds 0–255,
curiosities on, all 163 legal cells). Every cell generates on every seed.
The table lists the cells new at `7r42`; "villages" is the density count
`S - N`, then the least and the mean a board holds. The cells that existed
before are in the command's output, each inside its allowance against the
`7r39` baseline and most far below the baseline itself (16 x 16
Archipelago with four seats: mean 7.1, `7r39` 28.2).

| Cell              | Villages `S - N` | Least | Mean | Candidates mean / worst |
| ----------------- | ---------------: | ----: | ---: | ----------------------- |
| Dry Land 11, 3    |                5 |     5 |  5.0 | 1.05 / 2                |
| Dry Land 11, 4    |                4 |     3 |  4.0 | 1.05 / 2                |
| Dry Land 11, 5    |                3 |     3 |  3.0 | 1.04 / 3                |
| Dry Land 11, 6    |                2 |     2 |  2.0 | 1.03 / 2                |
| Dry Land 11, 7    |                1 |     1 |  1.0 | 1.05 / 2                |
| Dry Land 11, 8    |                0 |     0 |  0.0 | 1.05 / 2                |
| Dry Land 14, 4    |                9 |     7 |  9.0 | 1.10 / 4                |
| Dry Land 14, 5    |                8 |     7 |  7.9 | 1.05 / 3                |
| Dry Land 14, 6    |                7 |     4 |  6.6 | 1.09 / 4                |
| Dry Land 14, 7    |                6 |     2 |  4.5 | 1.09 / 2                |
| Dry Land 14, 8    |                5 |     1 |  2.2 | 1.12 / 3                |
| Dry Land 16, 5    |               12 |    12 | 12.0 | 1.04 / 2                |
| Dry Land 16, 6    |               11 |    10 | 11.0 | 1.04 / 3                |
| Dry Land 16, 7    |               10 |     7 |  9.7 | 1.05 / 2                |
| Dry Land 16, 8    |                9 |     5 |  8.0 | 1.08 / 3                |
| Dry Land 20, 5    |               22 |    22 | 22.0 | 1.04 / 2                |
| Dry Land 20, 6    |               21 |    20 | 21.0 | 1.04 / 3                |
| Dry Land 20, 7    |               20 |    20 | 20.0 | 1.08 / 3                |
| Dry Land 20, 8    |               19 |    19 | 19.0 | 1.05 / 3                |
| Dry Land 25, 5    |               37 |    37 | 37.0 | 1.09 / 3                |
| Dry Land 25, 6    |               36 |    36 | 36.0 | 1.11 / 4                |
| Dry Land 25, 7    |               35 |    35 | 35.0 | 1.18 / 4                |
| Dry Land 25, 8    |               34 |    34 | 34.0 | 1.14 / 4                |
| Pangea 11, 3      |                3 |     3 |  3.0 | 1.09 / 3                |
| Pangea 11, 4      |                2 |     2 |  2.0 | 1.13 / 3                |
| Pangea 11, 5      |                1 |     1 |  1.0 | 1.11 / 2                |
| Pangea 11, 6      |                0 |     0 |  0.0 | 1.13 / 3                |
| Pangea 11, 7      |                0 |     0 |  0.0 | 1.24 / 4                |
| Pangea 11, 8      |                0 |     0 |  0.0 | 1.13 / 4                |
| Pangea 14, 4      |                7 |     7 |  7.0 | 1.15 / 3                |
| Pangea 14, 5      |                6 |     6 |  6.0 | 1.18 / 3                |
| Pangea 14, 6      |                5 |     4 |  5.0 | 1.25 / 5                |
| Pangea 14, 7      |                4 |     2 |  3.9 | 1.38 / 6                |
| Pangea 14, 8      |                3 |     1 |  2.6 | 1.30 / 5                |
| Pangea 16, 5      |               10 |    10 | 10.0 | 1.11 / 4                |
| Pangea 16, 6      |                9 |     9 |  9.0 | 1.11 / 4                |
| Pangea 16, 7      |                8 |     6 |  7.8 | 1.35 / 5                |
| Pangea 16, 8      |                7 |     4 |  4.1 | 1.19 / 3                |
| Pangea 20, 5      |               19 |    19 | 19.0 | 1.17 / 4                |
| Pangea 20, 6      |               18 |    18 | 18.0 | 1.20 / 4                |
| Pangea 20, 7      |               17 |    17 | 17.0 | 1.96 / 8                |
| Pangea 20, 8      |               16 |    16 | 16.0 | 4.24 / 23               |
| Pangea 25, 5      |               33 |    33 | 33.0 | 1.18 / 3                |
| Pangea 25, 6      |               32 |    32 | 32.0 | 1.45 / 4                |
| Pangea 25, 7      |               31 |    31 | 31.0 | 3.34 / 20               |
| Pangea 25, 8      |               30 |    30 | 30.0 | 4.72 / 25               |
| Lakes 14, 4       |                8 |     7 |  8.0 | 1.22 / 4                |
| Lakes 14, 5       |                7 |     6 |  7.0 | 1.18 / 3                |
| Lakes 14, 6       |                6 |     4 |  5.8 | 1.25 / 4                |
| Lakes 14, 7       |                5 |     2 |  3.9 | 1.32 / 5                |
| Lakes 14, 8       |                4 |     1 |  1.5 | 1.32 / 4                |
| Lakes 16, 5       |               11 |    10 | 11.0 | 1.13 / 3                |
| Lakes 16, 6       |               10 |     9 | 10.0 | 1.12 / 3                |
| Lakes 16, 7       |                9 |     7 |  8.8 | 1.24 / 4                |
| Lakes 16, 8       |                8 |     5 |  7.0 | 1.16 / 4                |
| Lakes 20, 5       |               20 |    20 | 20.0 | 1.29 / 4                |
| Lakes 20, 6       |               19 |    17 | 19.0 | 1.39 / 6                |
| Lakes 20, 7       |               18 |    18 | 18.0 | 2.19 / 10               |
| Lakes 20, 8       |               17 |    17 | 17.0 | 2.97 / 17               |
| Lakes 25, 5       |               33 |    33 | 33.0 | 1.48 / 6                |
| Lakes 25, 6       |               32 |    32 | 32.0 | 1.60 / 7                |
| Lakes 25, 7       |               31 |    31 | 31.0 | 2.11 / 8                |
| Lakes 25, 8       |               30 |    27 | 30.0 | 2.25 / 7                |
| Continents 11, 3  |                3 |     0 |  2.2 | 1.93 / 10               |
| Continents 11, 4  |                2 |     0 |  0.6 | 1.53 / 6                |
| Continents 11, 5  |                1 |     0 |  0.2 | 1.88 / 8                |
| Continents 11, 6  |                0 |     0 |  0.0 | 4.61 / 26               |
| Continents 14, 4  |                5 |     3 |  4.9 | 1.46 / 4                |
| Continents 14, 5  |                4 |     0 |  3.2 | 1.59 / 6                |
| Continents 14, 6  |                3 |     0 |  1.8 | 1.34 / 5                |
| Continents 14, 7  |                2 |     0 |  0.6 | 1.33 / 4                |
| Continents 14, 8  |                1 |     0 |  0.0 | 1.44 / 4                |
| Continents 16, 5  |                7 |     5 |  6.8 | 1.23 / 7                |
| Continents 16, 6  |                6 |     3 |  5.7 | 1.47 / 5                |
| Continents 16, 7  |                5 |     1 |  4.4 | 1.89 / 6                |
| Continents 16, 8  |                4 |     1 |  3.0 | 1.57 / 9                |
| Continents 20, 5  |               14 |    13 | 14.0 | 1.18 / 4                |
| Continents 20, 6  |               13 |    11 | 13.0 | 1.36 / 5                |
| Continents 20, 7  |               12 |     9 | 11.9 | 1.50 / 7                |
| Continents 20, 8  |               11 |     9 | 10.8 | 1.48 / 5                |
| Continents 25, 5  |               24 |    24 | 24.0 | 1.21 / 5                |
| Continents 25, 6  |               23 |    20 | 22.9 | 1.36 / 5                |
| Continents 25, 7  |               22 |    22 | 22.0 | 1.55 / 11               |
| Continents 25, 8  |               21 |    21 | 21.0 | 1.43 / 5                |
| Archipelago 11, 3 |                1 |     0 |  0.6 | 1.27 / 4                |
| Archipelago 11, 4 |                0 |     0 |  0.0 | 6.07 / 26               |
| Archipelago 14, 4 |                3 |     0 |  1.1 | 1.12 / 3                |
| Archipelago 14, 5 |                2 |     0 |  1.4 | 1.15 / 4                |
| Archipelago 14, 6 |                1 |     0 |  0.5 | 1.20 / 5                |
| Archipelago 14, 7 |                0 |     0 |  0.0 | 1.32 / 7                |
| Archipelago 14, 8 |                0 |     0 |  0.0 | 1.44 / 6                |
| Archipelago 16, 5 |                4 |     2 |  3.7 | 1.37 / 5                |
| Archipelago 16, 6 |                3 |     1 |  2.8 | 1.36 / 7                |
| Archipelago 16, 7 |                2 |     0 |  1.7 | 1.43 / 7                |
| Archipelago 16, 8 |                1 |     0 |  0.8 | 1.34 / 6                |
| Archipelago 20, 5 |               10 |     4 |  9.3 | 1.25 / 4                |
| Archipelago 20, 6 |                9 |     4 |  8.0 | 1.57 / 5                |
| Archipelago 20, 7 |                8 |     3 |  6.3 | 2.10 / 8                |
| Archipelago 20, 8 |                7 |     2 |  5.4 | 1.77 / 8                |
| Archipelago 25, 5 |               18 |    14 | 17.8 | 1.13 / 3                |
| Archipelago 25, 6 |               17 |    11 | 16.9 | 1.20 / 3                |
| Archipelago 25, 7 |               16 |    12 | 15.7 | 1.21 / 5                |
| Archipelago 25, 8 |               15 |     6 | 14.6 | 1.22 / 3                |

The worst new cell is 11 x 11 Archipelago with four players (mean 6.07
candidates, worst 26). On Dry Land, Pangea, and Lakes a board at the auto
size (20 x 20 with 5 to 7 players, 25 x 25 with 8) holds its full count on
almost every seed, and the shortfall is on the boards below it, largest
where eight capitals crowd a 14 x 14 board. Continents and Archipelago fall
short more often even at the auto size (20 x 20 Archipelago with seven
players: 3 to 8 villages, mean 6.3 of 8), because their small landmasses
leave fewer sites. The wild-reserve figures of the cells with 2 to 4
seats (land features, Giant Spiders, and Rifts against `7r39`) are printed
by the command and stay inside the section 10.1 allowance.

## 6. Setup rules

### 6.1 Setup fields

| Setup field  | Rule after this spec                                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `aiCount`    | 1 to `F - 1`, where `F = FACTION_IDS_V7.length`, never a literal; and `aiCount + 1 <= P(width, mapType)` on generated maps |
| Width        | 11, 14, 16, 20, or 25 (unchanged), subject to `P`                                                                          |
| `factions`   | one per seat, all different (unchanged; `F` factions always cover `F` seats)                                               |
| `humanColor` | one of the nine seat colours (section 8.6)                                                                                 |
| `aiMode`     | `RIVAL` or `COOPERATIVE` at every seat count                                                                               |

- A setup over `P` is `INVALID_SETUP` (no new code: the browser never offers
  it, and the headless CLI prints the allowed range).
- `allowDuplicateFactions` (headless and test mirrors) does not lift the
  `F - 1` cap: seat count is bounded by the faction registry either way.
- `distinctFactionsV7(seatCount)` already assigns distinct factions for any
  `seatCount <= F`; the setup screen's default for seats 4 and up is the
  first untaken faction in registration order (Martian, Ice Folk, Dwarf).

### 6.2 Auto size

The headless default and the setup screen's size after an opponent-count
change: the smallest allowed size whose board area is at least 56 tiles per
seat, which keeps today's choices for 2–4 seats.

| Seats | Auto size | Tiles per seat |
| ----: | --------: | -------------: |
|     2 |        11 |             60 |
|     3 |        14 |             65 |
|     4 |        16 |             64 |
|   5–7 |        20 |          80–57 |
|   8–9 |        25 |          78–69 |

If the auto size is not allowed for the map type (never with the table of
section 3.3 and at most 9 seats), the next allowed size is used.

### 6.3 Setup screen

- **Opponents** offers 1 to `F - 1`.
- **Size** offers only the sizes allowed for the opponent count **and** the
  map type (today it depends on the opponent count only). Changing either
  keeps the player's size when it stays allowed, otherwise picks the auto
  size.
- **Map** offers every generated type at every opponent count: some larger
  size always allows it (only 11 x 11 Continents and Archipelago, and
  14 x 14 Archipelago with 9 seats, are ever too small), so choosing such a
  type moves the size up to the smallest allowed one instead of refusing.
- Under the Size select, one line states the settlements, which are exact:
  "N villages (V per player)", with V to one decimal, and when there is
  less than one village per two players (`2 * villages < seats`),
  "Crowded: few or no villages; expect early fighting."
- **Factions** shows one select per seat, as today, in a list that wraps or
  scrolls on a phone.
- **Showcase** stays 1–3 opponents (four strips on its fixed 16 x 16 board;
  section 7). With more opponents selected, the Showcase option is greyed
  out with the reason.

### 6.4 Cooperative with many seats

`COOPERATIVE` keeps its meaning at every count: every AI seat is allied to
every other and hostile to the human. With 7 AI seats the human faces seven
allies at once; the AI allies do not fight each other, so the human is the
only target. This is legal and labelled on the setup screen ("Cooperative:
every opponent is allied against you"). The Rival/Cooperative rules do not
change.

## 7. Showcase and missions

- **Showcase**: unchanged. Its board, strips, cities, and units are fixed
  for 2–4 seats; `aiCount` stays 1–3 for `SHOWCASE`, and setups that differ
  from today's only in the ruleset ID build the same state.
- **Missions**: unchanged. A mission keeps its own size, seats (two to four
  today), villages, and seed; no density, domain, or reserve rule applies to
  a hand-authored board, and every mission's pinned initial-state hash stays
  valid (the ruleset ID is left out of that hash). A future mission may use
  more seats, up to `F`, under the mission rules.

## 8. Impacts

### 8.1 Turn order and turn length

Turn order stays a seeded shuffle; `round` increments after the last seat.
With 8 seats the human waits through seven AI turns per round.

Measured today (`runAiMatchV7`, Node on the development Mac, Dry Land,
4 seats, seed 3, 30 rounds, `curiosities` off; Normal policy wall time
summed per seat turn, engine time excluded):

| Board   | Mean   | Median | p95    | Worst  | Mean, last quarter of the rounds |
| ------- | ------ | ------ | ------ | ------ | -------------------------------- |
| 16 x 16 | 0.59 s | 0.11 s | 3.9 s  | 12.8 s | 1.7 s                            |
| 25 x 25 | 2.6 s  | 0.87 s | 18.3 s | 31.4 s | 7.2 s                            |

Seven AI seats at those late means are about 12 s (16 x 16) and 50 s
(25 x 25) of waiting per round before any animation, and more units per
board push each turn up further. The 25 x 25 cost is already a problem with
4 seats; many seats make it unacceptable. So:

- **Deterministic per-turn work budget.** The Normal AI gets a fixed work
  allowance per seat turn in its own deterministic work units (it already
  counts them, `advanceWork`), scaled down with the seat count; past it, the
  remaining units hold (fortify or skip) and the turn ends. A work budget,
  not a clock, keeps headless and replays deterministic.
- **Shared per-turn context.** Context that every decision in one seat turn
  rebuilds (threat maps, distance fields) is computed once per turn.
- **Targets** (AI bead acceptance, Node, the same machine and method, rounds
  1–40): on 25 x 25 Dry Land with 8 seats, the mean policy time per AI seat
  turn is at most 1.5 s and p95 at most 5 s, so a late round of seven AI
  turns stays near 10–15 s; on 16 x 16 with 4 seats the numbers above do
  not get worse. Play strength may drop only within the bead's measured
  tolerance (its headless win-rate check against the unbudgeted policy at
  4 seats).
- If the targets need more than a work budget and shared context (a policy
  rework), the AI bead reports that and the orchestrator splits it; the
  engine beads do not wait for it, because the browser keeps offering
  at most 3 opponents until the UI bead (5) lands, and bead 5 needs bead 4.
- **Presentation.** The turn status says "Player 5 (Dwarf) is playing… (3 of
  7)"; fast-forward skips AI animations, as today.

### 8.2 Normal AI with many seats

- Targeting: with several hostile seats in reach, Normal today sends at
  least a pair of units at each. With up to seven that spreads armies thin.
  It focuses on the nearest one or two hostile seats (by land path to their
  nearest known city) and defends against the rest.
- Village expansion is unchanged ("the nearest unclaimed village"); there
  are more villages, so expansion lasts longer.
- Cooperative allies ignore each other (unchanged).

### 8.3 Browser performance

The board is at most 25 x 25 as today; the cost grows with units, not
seats. Per-command event projection runs once per viewer, so it grows
linearly with seats. The AI bead measures command latency, autosave size
(`localStorage` holds about 5 MB; a 25 x 25 8-seat save at round 60 must
stay under 1 MB), and the frame time on the late 25 x 25 8-seat fixture.

### 8.4 Balance: more players, more chaos

- Crowded boards (11 x 11 with 6 or more seats) are capital brawls with few
  or no villages, as in Polytopia's 9-player Tiny games. That is the user's
  minimum, so it is legal; the auto size never picks it and the setup
  screen labels it.
- **First-mover advantage** grows with seats on crowded boards: capitals 3
  apart are reachable on the second turn. The coarse check (bead 6)
  measures win rate by turn position for 6 and 8 seats on 11, 16, and 20; a
  first seat winning more than 1.5 times its fair share (`1 / N`) opens a
  balance bead (candidates: a later seat's extra starting Coins, or no
  capture before round 3). Nothing is changed before that evidence.
- Matches on large boards with 2 seats get longer (40 villages to claim on
  25 x 25 Dry Land, up from 21). The coarse check records match length.

### 8.5 HUD, leaderboard, turn banner

- **Leaderboard**: one row per seat (up to `F`), sorted as today; on a
  phone it scrolls inside its panel.
- **Turn-order strip** (new): a compact row of faction-coloured chips in
  turn order, the active seat highlighted, eliminated seats crossed out;
  on a phone it collapses to "Turn 3 of 8" with the active chip.
- **Turn banner and status** name the seat and faction (every match now has
  factions) and the position in the round.
- Every seat-count-dependent text ("Player N") works for N up to `F`.

### 8.6 Colours

- **Owner colours** are the factions' (`FACTION_COLOURS_V7`,
  `pulp_wars-b5f.4`), and factions are unique per match, so owner colours
  are always distinct. A new faction (Candy) must register a colour
  distinct from every other; a test checks pairwise distinctness and a
  minimum contrast against the terrain palette.
- **Seat colours** (`PlayerColorV7`, stored, never shown) grow from 4 to 9:
  `CORAL`, `TEAL`, `GOLD`, `VIOLET`, `SKY`, `LIME`, `ROSE`, `SLATE`,
  `AMBER`. AI seats take the colours other than the human's in this order,
  as today. A test checks that the colour list is at least `F` long, so the
  next faction cannot outgrow it silently.

### 8.7 Achievements

Unchanged thresholds. Land Baron (5 cities) comes sooner on dense large
maps and later on crowded small ones; Explorer (100 tiles) is unaffected;
Sea Dog never completes on Dry Land, as today. The coarse check reports the
unlock rates; no change is planned.

### 8.8 Saves, replays, and byte-identity

- **Byte-identity is intentionally broken for every generated map**, at
  every existing `(size, type, seats)`. The village count changes for every
  setup (section 5.2), and on Dry Land the settlement sites are fixed before
  the terrain draws, so every tile after them moves; on water maps the
  settlement positions feed the ring floors and the stream. Keeping old
  boards would mean keeping the fixed table, which is exactly what the user
  asked to replace. Saves and replays of earlier identities are refused
  (never migrated), as for every identity change.
- **Kept invariants**: equal setups and seeds generate byte-identical maps;
  `factions` never affects any draw; `curiosities` changes only the
  curiosity list; the Rift and curiosity streams stay separate; the
  Showcase and every mission are unchanged.
- `mapGenerationRevision` becomes `REGIONAL_BIOMES_NAVAL_V3`; the release
  check (`npm run validate:ruleset7-release`) has its identity, autosave
  key, and map revision pins updated, with the diff reviewed; every pinned
  map hash in the unit tests is re-pinned deliberately; every balance and
  parity baseline measured on earlier boards is stale and is re-measured by
  the coarse check.

### 8.9 Identity

Two engine beads (section 11, beads 2 and 3) each take the next free
`pulp-wars-poc-7rNN`, add the previous one to `PRIOR_RULESET_7_IDS`, bump
the browser autosave key, and add the old key to the obsolete-key list.
Density changes no shape. Many seats widen `AiCountV7` (to `1..F-1`) and
`PlayerColorV7` (nine values): value sets, not shapes; the numeric schema
versions stay 7.

## 9. Headless tools

- `--ai-count` and `--ai-counts` accept 1 to `F - 1`; the defaults stay 1
  and `1,2,3`.
- `--size` defaults to the auto size (section 6.2); a size over `P` is an
  error naming the allowed range.
- `--factions` takes up to `F` values (distinct unless
  `--allow-duplicate-factions`).
- A new validation command, `npm run validate:ruleset7-map-scale`, generates
  every allowed `(size, type, seats)` on seeds 0–255 and reports generation
  success and attempts, settlements, villages per player, room and village
  balance, wild centres, Rift and curiosity rates, and capital spacing.

## 10. Test plan and acceptance

### 10.1 Generation

- For every allowed `(size, type, seats)` and seeds 0–255: generation
  succeeds (no `MAP_GENERATION_FAILED`); exactly `max(S, N)` settlements
  and `max(0, S - N)` villages; capitals at least `D(w, N)` apart and 2 from the
  edge; villages at least 1 from the edge; settlements at least 3 apart; no
  capital in the central zone with 8 seats or fewer; room and village
  balance hold; the Continents landmass counts and capitals per landmass
  match section 4.3; one capital per Archipelago island.
- **Amended 2026-10-04** ([section 5.5](#55-amendments-after-measurement-2026-10-04)):
  the hard criterion is that generation succeeds on every seed; mean and
  worst attempts are asserted only against the `7r39` baseline of the cell
  (at most 1.6 times it, never below mean 8 and worst 64); room and
  village balance are bead 3's; and the wild-reserve bullet below is
  asserted as land curiosities at least 90% of the `7r39` count and Rifts at
  least 85% (widths 20 and 25) or half (width 16).
- **Amended 2026-10-05** ([section 5.6](#56-amendments-after-measurement-2026-10-05)),
  as checked by `npm run validate:ruleset7-map-scale` on all 163 legal
  cells: "exactly `max(0, S - N)` villages" holds on the setups of `7r41`
  and reads "at most" on the setups new at `7r42` (provisional); the
  capital margin of 2 holds on every map type; "one capital per domain"
  is asserted on Dry Land, Pangea, and Lakes; room balance, village
  balance, the Continents landmass counts with the capitals each holds,
  and one capital per Archipelago island are asserted on every board; a
  cell new at `7r42` must stay inside a mean of 8 and a worst of 64
  candidates; and the wild-reserve comparisons stay those of the cells the
  `7r39` baseline has (2 to 4 seats).
- Mean attempts per board at most 8 and worst at most 64 (the cap stays
  256), so generation stays fast.
- Neutrality: setups that differ only in `factions` give identical boards;
  only in `curiosities`, identical boards apart from the list.
- Wild reserve: on 16 x 16 and larger Dry Land, Pangea, and Lakes boards
  with up to 4 seats, the share of seeds 0–255 with a land curiosity
  (Fountain or Shrine) is at least the `7r35` share for the same size,
  type, and seat count, and the share with at least one Rift is at least 90%
  of the `7r35` share (the boards differ, so the comparison is of rates, not
  of seeds). The bead measures both baselines before changing the generator.
- Pinned golden: one board hash per map type at 2 seats and one 8-seat Dry
  Land 11 x 11 board.
- Setup: 1 to `F - 1` AI accepted where allowed; over `P` or over `F - 1`
  refused; `SHOWCASE` refuses 4 or more AI; missions unchanged (their
  pinned hashes still pass).

### 10.2 AI and headless

- An 8-seat match on 20 x 20 and 25 x 25 Dry Land, and a 6-seat match on
  each water type at 20 x 20, run 150 rounds without policy errors or turn
  cap hits; the time targets of section 8.1 hold.
- Replays of those matches reproduce the final state hash.

### 10.3 UI

- The setup screen offers 1 to `F - 1` opponents and only allowed sizes;
  the village line and Crowded label are correct; the Showcase greys out
  over 3 opponents; an 8-seat match launches, saves, resumes, and shows 8
  leaderboard rows and the turn-order strip at desktop and phone widths
  without horizontal scroll.

### 10.4 Acceptance criteria (epic)

1. A match may have 2 to `F` players on every cell of section 3.3, derived
   from `FACTION_IDS_V7` (adding a faction raises the limit with no other
   change), and 11 x 11 Dry Land generates with `min(F, 9)` players.
2. Settlement counts follow section 5 for every generated setup; the fixed
   village table is gone.
3. Section 10.1 passes on the full corpus; no allowed cell was dropped.
4. AI time targets (8.1) hold; the coarse check (bead 6) reports win rate
   by turn position, match length, and villages claimed per seat, and any
   first-mover finding is filed.
5. The current rules (sections 2.1–2.3 and 3) describe the new rules; this
   document is marked folded.

## 11. Implementation beads

Ordered; each is independently releasable. Profiles follow `CLAUDE.md`.

| #   | Bead                                                                                                                                                                                                                                                                                                                                                                                                                                              | Profile                                                                    | Worker focused checks                                                                                                                                                                                                                                          | Conditional final gates                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | This design (`ykw.1`)                                                                                                                                                                                                                                                                                                                                                                                                                             | `docs/tracker`                                                             | `npx prettier --check docs/product/RULESET_7_MAP_SCALE.md`                                                                                                                                                                                                     | none                                                                                                                      |
| 2   | **Engine: village density** (identity bump; done, `pulp-wars-poc-7r40`, as amended in section 5.5). `S` and `LPS`, lattice packing with nine phases on Dry Land, Pangea, and Lakes and the row-major fill on Continents and Archipelago, villages 1 from the edge, wild reserve on Dry Land, Pangea, and Lakes, per-landmass shares, `VILLAGE_DENSITY` invariant, the validation command, current rules 2.2 folded; 2–4 seats only                | `ai/map/persistence`                                                       | `npm test -- tests/unit/ruleset-v7-map.test.ts tests/unit/ruleset-v7-naval-map.test.ts tests/unit/ruleset-v7-biome-map.test.ts tests/unit/ruleset-v7-curiosities.test.ts tests/unit/ruleset-v7-rift-generation.test.ts`; `npm run validate:ruleset7-map-scale` | `npm run validate:ruleset7-release` (identity pins updated, diff reviewed); `npm run smoke:browser` (autosave key change) |
| 3   | **Engine: many seats** (identity bump; done, `pulp-wars-poc-7r42`, map revision `REGIONAL_BIOMES_NAVAL_V4`, as amended in section 5.6). `aiCount` to `F - 1`, `P` table, domains, `D(w, N)`, central zone, room balance, village balance (moved here from bead 2), the water-map capital edge margin (section 4.1), Continents 2–4 masses, Archipelago domain islands, nine seat colours, headless CLI ranges, current rules 2.1–2.3 and 3 folded | `ai/map/persistence`                                                       | bead 2's tests plus `tests/unit/ruleset-v7-unique-factions.test.ts tests/unit/ruleset-v7-headless-cli.test.ts`; `npm run validate:ruleset7-map-scale`                                                                                                          | `npm run validate:ruleset7-release` (identity pins updated); `npm run smoke:browser` (autosave key change)                |
| 4   | **Normal AI for many seats**: per-turn deterministic work budget, shared per-turn context, nearest-two targeting; the 8.1 time targets with a checked-in timing script                                                                                                                                                                                                                                                                            | `ai/map/persistence`                                                       | `npm test -- tests/unit/ruleset-v7-ai-headless.test.ts`; the timing script on 25 x 25 8 seats                                                                                                                                                                  | `npm run smoke:browser` (AI-turn lifecycle)                                                                               |
| 5   | **UI for many seats**: setup (opponents, sizes per type, village line, Crowded label, Showcase gating, Cooperative label), turn-order strip, leaderboard scroll, turn status "(3 of 7)", faction-colour distinctness test                                                                                                                                                                                                                         | `ui/presentation`                                                          | `npm test -- tests/unit/faction-colours-render-v7.test.ts tests/integration/ruleset7-browser-controller.test.ts tests/integration/ruleset7-faction-colours-dom.test.ts`                                                                                        | `npm run smoke:browser`                                                                                                   |
| 6   | **Coarse check**: headless matrix (2, 4, 6, 8 seats; 11, 16, 20, 25; every type; seeds 0–7): win rate by turn position, match length, villages per seat, achievement rates, save size; evidence document; files balance beads                                                                                                                                                                                                                     | `docs/tracker` (evidence only) or `ai/map/persistence` if it adds a script | the headless batch commands it records                                                                                                                                                                                                                         | none, or `npm run check` with a new script                                                                                |

Beads 2 and 3 can land in either order; 4 needs 3; 5 needs 3 and 4 (the
browser must not offer 8 seats before the AI meets its time targets); 6
needs 2–5.

The profile's own final gates (for `ai/map/persistence`: `npm run check`
and `npm run validate:ruleset6-release`; for `ui/presentation`: its listed
format, lint, typecheck, test globs, and `npm run build`) always apply; the
last column adds only the triggered ones. Every test file named in the
table exists today; a bead adds its new tests to that list when the
orchestrator writes it. `npm run validate:ruleset7-map-scale` does not
exist yet: bead 2 creates it. `npm run validate:ruleset7-release` has no
refresh script: it pins the ruleset ID, the autosave key, and the map
revision, and beads 2 and 3 update those pins (and any map hash it checks)
as an approved, reviewed part of their identity bump.

## 12. Open questions for the user

1. **One density or one per map type?** This spec uses one per type (Dry
   Land 15 land tiles per settlement down to Archipelago 10), which is how
   Polytopia behaves on our boards. A single density (15) would give water
   maps 25–35% fewer villages than Polytopia.
2. **Crowded boards with no villages.** Your rule makes 11 x 11 with 8 or 9
   players legal, and the density leaves those maps with no village at all
   (one at most fits). Keep them legal as a brawl mode (this spec), or
   require at least one village per two players, which would cap 11 x 11
   Dry Land at 5 players?

## Appendix A. Draft, critique, and changes

### A.1 Draft 1

- One density for every map type: 1 settlement per 15 land tiles.
- Capitals by Polytopia's farthest-point rule (each capital on the legal
  tile farthest from those placed), spacing `floor(w / 2)` for all counts.
- Villages filled to saturation with the Polytopia rule (random, until no
  room), no target count.
- Curiosities and Rifts unchanged.
- Turn length not addressed; the AI unchanged.
- Setup: opponents 1 to `F - 1`, sizes by `C(w)` only.

### A.2 Critique (as a skeptical designer)

1. **Water-map village starvation.** At 1 per 15 land tiles, 11 x 11
   Archipelago with 2 seats would have 1 village (today 3), 20 x 20
   Archipelago 11 settlements (today 16). Polytopia itself packs islands
   denser; a single density punishes exactly the maps that are already
   poor. Water maps also hide villages on islets that need ships.
2. **Saturation is not a target.** A pure saturation fill has no count to
   test, varies by seed (a random fill stops wherever the last gap closes;
   the measured means of section 2.2 already move by 1–3 settlements
   between seat counts of one setup), and fills every gap, which kills land curiosities (they need
   a tile 3 from every settlement) and most Rifts. The curiosity spec
   already notes "village-dense boards sometimes get none"; saturation
   makes that almost always.
3. **Spacing `floor(w / 2)` cannot hold 5+ seats.** On 16 x 16 at most four
   capitals are 8 apart. The farthest-point rule also puts the fifth
   capital in the exact middle, surrounded by four neighbours: the worst
   seat in the game.
4. **Crowded tiny maps.** 9 capitals on 11 x 11 are 3 apart, with their
   territories touching, and no villages. First mover reaches a neighbour
   on turn 2. It is the user's rule, but the setup must not walk players
   into it by default, and they must see it coming.
5. **First-mover advantage** grows with seats; with 8 seats the last seat
   sees seven turns before its first move. Untested, so no fix should be
   invented, but it must be measured.
6. **AI turn time.** Measured 0.6 s mean and 3.9 s p95 per seat turn on
   16 x 16 with 4 seats (1.7 s late), and 2.6 s mean, 18 s p95 on 25 x 25
   (7.2 s late). Seven AI seats make the human wait 12 s to 50 s per round.
   Draft 1 ignored it, and would have let the setup offer 8 seats before
   the AI could carry them.
7. **Hard-coded fours.** Archipelago island centres, Continents landmass
   counts, the major-island minimum (`w^2 / 20` makes 8 islands on
   20 x 20 impossible), the 4 seat colours, `AiCountV7 = 1 | 2 | 3`, and
   the Showcase strips all assume at most 4 seats.
8. **Sizes by `C(w)` only** would offer 9-seat Archipelago on 11 x 11, where
   41–48 land tiles cannot make 9 islands.
9. **Cooperative with 7 allies** against one human is brutal and possibly
   surprising.
10. **Villages 2 from the edge** cap 16 x 16 at 16 settlements, below the
    Polytopia-like 17.

### A.3 What the redraft changed

1. Density per map type (section 5.1), calibrated to the Polytopia rule
   measured on our boards; water maps keep or gain villages against today.
   Open question 1 lets the user choose a single density instead.
2. A target count `S` with lattice-first packing and an exact-count
   invariant (testable, low variance), and a **wild reserve** that keeps
   curiosities and Rifts possible without making placement depend on the
   curiosity option (section 5.4).
3. Domains as in Polytopia, `D(w, N)` that equals today's rule for 2–4
   seats, a ring layout with a neutral centre for 5–8 seats, and room and
   village balance invariants (section 4).
4. Auto size never crowds (56 tiles per seat), the setup shows villages per
   player and a Crowded label; crowded boards stay legal (open question 2).
5. First-mover advantage is measured by the coarse check with a stated
   trigger for a balance bead (section 8.4).
6. AI work budget and time targets (section 8.1) in their own bead, which
   gates the UI bead: the browser offers more than 3 opponents only once
   the AI meets them.
7. Every hard-coded four generalised (sections 4.3, 6.1, 8.6); the
   Showcase stays at 2–4 seats on purpose.
8. `P(w, type)` with the land budget and Archipelago separation (section 3.2).
9. Cooperative stays legal and labelled (section 6.4).
10. Villages may stand 1 from the edge (section 5.3), as in Polytopia.

### A.4 Ideas weighed and rejected

- **An 18 x 18 size**: helps auto size only; not needed for any limit.
- **Village density excluding capitals** (villages per land tile constant
  whatever the seats): impossible on crowded boards (no room) and unlike
  Polytopia, where capitals take village room.
- **A wall-clock AI budget**: would make headless matches and replays
  depend on machine speed.
- **Keeping old boards byte-identical for 2–4 seats**: would keep the fixed
  village table the user asked to remove.
- **Turn-position compensation now**: no evidence yet; the coarse check
  decides.
