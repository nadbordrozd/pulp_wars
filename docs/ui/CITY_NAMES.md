# City names

Every city has a name (bead `pulp_wars-2yc.30`). Names are presentation only:
the engine, its commands, events, views and saves do not know them.

## The lists

`src/render/city-name-lists-v7.ts` holds thirty invented names per faction, in
that faction's voice. A name is one capitalised word of 4 to 10 letters. No
name appears twice in the whole set, and no two names of one faction are one
letter apart. `tests/unit/city-names-presentation-v7.test.ts` holds every list
to these rules and requires a list for every faction of the registry, so a new
faction is one new entry in that file.

## Which city gets which name

The rule lives in `src/render/city-names-presentation-v7.ts`.

1. The match setup (seed, map, size, factions) is fixed for the match and part
   of every player's public view. It rebuilds the match's first position with
   the engine's own pure function, which gives every settlement site of the
   board: the cities that exist at the start, with their owners, and the
   neutral villages.
2. A site belongs to the faction that owns its city at the start. A neutral
   village belongs to the faction of the nearest starting capital: its home
   ground, and in practice its first owner.
3. Each faction's list is shuffled with the match seed and dealt to that
   faction's sites in board order. No name repeats in a match. A faction with
   more than thirty sites continues with a numeral: "Aldmere II".
4. The name is keyed by the site's tile, which never changes. A captured city
   keeps its name, so a Goblin town in Human hands still reads as Goblin.

Every viewer, a reload, a save and a replay therefore show the same names.

A neutral village shows no name. It is "Village" until someone takes it; the
name appears with the city.

### What the engine does not record

The engine does not record who first owned a captured village: the city is
created at the capture, and only the passing `CITY_CAPTURED` event (with
`from: null`) says who founded it. Rule 2 stands in for that fact. A village
taken first by a faction other than the nearest capital's still carries the
nearer faction's name. If a founding faction is ever added to the city in the
state and the public view, rule 2 becomes that field and nothing else changes.

## Where a name is shown

- The board: a small dark plate under the city with the name, edged in the
  owner's colour (`src/render/canvas/city-name-label-v7.ts`). It hangs just
  below the city's cell, so it covers neither the city, its population pips,
  the capital crown nor a unit in the city. Its type stays between 10 and 15
  px; it fades out when a cell is smaller than 52 px on screen and is hidden
  under 40 px. Its position is a function of the city's draw position, so it
  moves with the sprite.
- The city panel: the name is the title, with "Capital" or "City" under it.
- Notices: "Aldmere founded" (a village taken), "Aldmere captured", "Aldmere
  lost to Player 2", "Player 2 captured Aldmere" (seen), and "Aldmere grew to
  level 3" (an own city). The reward dialog says "Aldmere grew. Pick a
  reward."
- Screen readers: the map cursor reads "Capital Aldmere, level 2".
- The text harness (`scripts/play-text-v7.ts`): the name beside the command
  id, as in `c7 Aldmere CAPITAL`.

No player-facing text names a city by its id or its tile.
