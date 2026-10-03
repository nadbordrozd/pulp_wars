# Ruleset 7: map scale (many players, village density)

**Status:** design spec (`pulp_wars-ykw.1`, epic `pulp_wars-ykw`). Nothing
here is implemented yet. It is an overlay over
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
| 11 x 11 | 2–F        | 2–F     | 2–F      | 2–7          | **2–4**       |
| 14 x 14 | 2–F        | 2–F     | 2–F      | 2–F          | 2–F           |
| 16 x 16 | 2–F        | 2–F     | 2–F      | 2–F          | 2–F           |
| 20 x 20 | 2–F        | 2–F     | 2–F      | 2–F          | 2–F           |
| 25 x 25 | 2–F        | 2–F     | 2–F      | 2–F          | 2–F           |

- With 9 factions, 11 x 11 Dry Land and Lakes hold 9 (the user's example),
  Pangea 8, Continents 7, Archipelago 4, and 14 x 14 Archipelago 8; every
  other cell holds 9 or more.
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
4. **Village balance** (new). Each village counts for its nearest capital
   the same way (villages on a landmass without a capital count for nobody).
   The largest count minus the smallest is at most
   `max(2, ceil(T / (2N)))`, `T` the villages counted.
5. **Turn order** stays a seeded shuffle of all seats. There is no
   compensation for moving later (section 8.4 measures whether one is
   needed).

## 5. Village density

### 5.1 The rule

A generated map has `S` **settlements** (capitals plus neutral villages):

```text
S(w, type) = roundHalfUp(L(w, type) / LPS(type))
villages   = max(0, S - N)
```

`LPS` is the land per settlement of the map type, calibrated to the
Polytopia rule on our own boards (section 2.2):

| Map type      | `LPS` | Polytopia rule measured | Why                                                       |
| ------------- | ----: | ----------------------- | --------------------------------------------------------- |
| `DRY_LAND`    |    15 | 14.4–15.6               | the measured middle                                       |
| `LAKES`       |    13 | 12.1–13.1               | the upper end, leaving room for the wild reserve          |
| `PANGEA`      |    12 | 9.9–12.3                | the upper end: small Pangeas are coast-heavy              |
| `CONTINENTS`  |    11 | 9.8–11.3                | the upper end                                             |
| `ARCHIPELAGO` |    10 | 7.8–10.3                | the upper end: villages on islets need ships to be useful |

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
|   11 | `ARCHIPELAGO` |   5 | 3 / 2 / 1 / — / — / — / — / —                    |
|   14 | `DRY_LAND`    |  13 | 11 / 10 / 9 / 8 / 7 / 6 / 5 / 4                  |
|   14 | `LAKES`       |  12 | 10 / 9 / 8 / 7 / 6 / 5 / 4 / 3                   |
|   14 | `PANGEA`      |  11 | 9 / 8 / 7 / 6 / 5 / 4 / 3 / 2                    |
|   14 | `CONTINENTS`  |  10 | 8 / 7 / 6 / 5 / 4 / 3 / 2 / 1                    |
|   14 | `ARCHIPELAGO` |   8 | 6 / 5 / 4 / 3 / 2 / 1 / 0 / —                    |
|   16 | `DRY_LAND`    |  17 | 15 / 14 / 13 / 12 / 11 / 10 / 9 / 8              |
|   16 | `LAKES`       |  16 | 14 / 13 / 12 / 11 / 10 / 9 / 8 / 7               |
|   16 | `PANGEA`      |  15 | 13 / 12 / 11 / 10 / 9 / 8 / 7 / 6                |
|   16 | `CONTINENTS`  |  13 | 11 / 10 / 9 / 8 / 7 / 6 / 5 / 4                  |
|   16 | `ARCHIPELAGO` |  10 | 8 / 7 / 6 / 5 / 4 / 3 / 2 / 1                    |
|   20 | `DRY_LAND`    |  27 | 25 / 24 / 23 / 22 / 21 / 20 / 19 / 18            |
|   20 | `LAKES`       |  25 | 23 / 22 / 21 / 20 / 19 / 18 / 17 / 16            |
|   20 | `PANGEA`      |  24 | 22 / 21 / 20 / 19 / 18 / 17 / 16 / 15            |
|   20 | `CONTINENTS`  |  20 | 18 / 17 / 16 / 15 / 14 / 13 / 12 / 11            |
|   20 | `ARCHIPELAGO` |  16 | 14 / 13 / 12 / 11 / 10 / 9 / 8 / 7               |
|   25 | `DRY_LAND`    |  42 | 40 / 39 / 38 / 37 / 36 / 35 / 34 / 33            |
|   25 | `LAKES`       |  38 | 36 / 35 / 34 / 33 / 32 / 31 / 30 / 29            |
|   25 | `PANGEA`      |  38 | 36 / 35 / 34 / 33 / 32 / 31 / 30 / 29            |
|   25 | `CONTINENTS`  |  32 | 30 / 29 / 28 / 27 / 26 / 25 / 24 / 23            |
|   25 | `ARCHIPELAGO` |  25 | 23 / 22 / 21 / 20 / 19 / 18 / 17 / 16            |

Compared with today, for 2 and 4 seats (today's settlements in brackets):
11 x 11 Dry Land 8 (6), Archipelago 5 (5); 16 x 16 Dry Land 17 (6 and 11),
Archipelago 10 (6 and 10); 20 x 20 Dry Land 27 (16), Archipelago 16 (16);
25 x 25 Dry Land 42 (23), Pangea 38 (23), Archipelago 25 (23). Dry Land and
the large boards gain the most; small water maps barely move (11 x 11
Pangea and Continents keep 6). No setup that exists today loses a
settlement: the closest cases (11 x 11 Pangea, Continents, and
Archipelago; 16 x 16 Archipelago with 4 seats; 20 x 20 Archipelago) keep
exactly today's count.

**Villages per player** is `(S - N) / N`: about 3 on 11 x 11 with 2 seats,
7 on 16 x 16 Dry Land with 2, 2 on 20 x 20 Dry Land with 8, 4 on 25 x 25
Dry Land with 8, and 0–2 villages in all on 11 x 11 with 6 or more seats.
When `S < N` (11 x 11 Dry Land or Lakes with 9 seats, for example) the map
simply has `N` capitals and no village. The setup screen shows the count
(section 6.3).

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
  4.3); Archipelago gives each home island the same number of villages
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

- **Wild reserve.** After the capitals and before the villages, the
  generator reserves `R` **wild centres**: `R` = 1 on 11–16, 2 on 20, 3 on 25. A wild centre is a land tile at least 2 from the edge, at least 5 from
  every capital, with at most 4 between its farthest and nearest capital
  (the curiosity rule), and at least 6 from another wild centre, drawn
  uniformly in `(y, x)` order from the match stream. With no legal tile
  fewer are reserved (crowded boards get none); a reserve never rejects a
  board. Villages keep 3 from wild centres, so each leaves room for a
  curiosity on the centre and a Rift run through it.
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

| #   | Bead                                                                                                                                                                                                                                                           | Profile                                                                    | Worker focused checks                                                                                                                                                                                                                                          | Conditional final gates                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | This design (`ykw.1`)                                                                                                                                                                                                                                          | `docs/tracker`                                                             | `npx prettier --check docs/product/RULESET_7_MAP_SCALE.md`                                                                                                                                                                                                     | none                                                                                                                      |
| 2   | **Engine: village density** (identity bump). `S` and `LPS`, lattice-first packing, villages 1 from the edge, wild reserve, per-landmass shares, village balance, `VILLAGE_DENSITY` invariant, the validation command, current rules 2.2 folded; 2–4 seats only | `ai/map/persistence`                                                       | `npm test -- tests/unit/ruleset-v7-map.test.ts tests/unit/ruleset-v7-naval-map.test.ts tests/unit/ruleset-v7-biome-map.test.ts tests/unit/ruleset-v7-curiosities.test.ts tests/unit/ruleset-v7-rift-generation.test.ts`; `npm run validate:ruleset7-map-scale` | `npm run validate:ruleset7-release` (identity pins updated, diff reviewed); `npm run smoke:browser` (autosave key change) |
| 3   | **Engine: many seats** (identity bump). `aiCount` to `F - 1`, `P` table, domains, `D(w, N)`, central zone, room balance, Continents 2–4 masses, Archipelago domain islands, nine seat colours, headless CLI ranges, current rules 2.1–2.3 and 3 folded         | `ai/map/persistence`                                                       | bead 2's tests plus `tests/unit/ruleset-v7-unique-factions.test.ts tests/unit/ruleset-v7-headless-cli.test.ts`; `npm run validate:ruleset7-map-scale`                                                                                                          | `npm run validate:ruleset7-release` (identity pins updated); `npm run smoke:browser` (autosave key change)                |
| 4   | **Normal AI for many seats**: per-turn deterministic work budget, shared per-turn context, nearest-two targeting; the 8.1 time targets with a checked-in timing script                                                                                         | `ai/map/persistence`                                                       | `npm test -- tests/unit/ruleset-v7-ai-headless.test.ts`; the timing script on 25 x 25 8 seats                                                                                                                                                                  | `npm run smoke:browser` (AI-turn lifecycle)                                                                               |
| 5   | **UI for many seats**: setup (opponents, sizes per type, village line, Crowded label, Showcase gating, Cooperative label), turn-order strip, leaderboard scroll, turn status "(3 of 7)", faction-colour distinctness test                                      | `ui/presentation`                                                          | `npm test -- tests/unit/faction-colours-render-v7.test.ts tests/integration/ruleset7-browser-controller.test.ts tests/integration/ruleset7-faction-colours-dom.test.ts`                                                                                        | `npm run smoke:browser`                                                                                                   |
| 6   | **Coarse check**: headless matrix (2, 4, 6, 8 seats; 11, 16, 20, 25; every type; seeds 0–7): win rate by turn position, match length, villages per seat, achievement rates, save size; evidence document; files balance beads                                  | `docs/tracker` (evidence only) or `ai/map/persistence` if it adds a script | the headless batch commands it records                                                                                                                                                                                                                         | none, or `npm run check` with a new script                                                                                |

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
