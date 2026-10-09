import type {
  CoordV7,
  FactionIdV7,
  GeneratedMapV7,
  MapTypeV7,
} from "../../src/engine/index";

/** A placed curiosity kind (section 24.1 order). */
export type CheckedCuriosityKindV7 =
  | "MONSTER"
  | "FOUNTAIN"
  | "SHRINE"
  | "WRECK"
  | "DOWNED_SAUCER"
  | "GRAVEYARD"
  | "GATES"
  | "BIGFOOT"
  | "WISHING_WELL";

/**
 * A placed curiosity tile of any kind: the Spider's lair (kind `MONSTER`),
 * Bigfoot's home (`BIGFOOT`), each gate of the pair (`GATES`), or a marker.
 */
export interface CheckedCuriosityV7 {
  readonly kind: CheckedCuriosityKindV7;
  readonly at: CoordV7;
}

const KINDS: readonly CheckedCuriosityKindV7[] = [
  "MONSTER",
  "FOUNTAIN",
  "SHRINE",
  "WRECK",
  "DOWNED_SAUCER",
  "GRAVEYARD",
  "GATES",
  "BIGFOOT",
  "WISHING_WELL",
];
const DANGERS: readonly CheckedCuriosityKindV7[] = [
  "MONSTER",
  "DOWNED_SAUCER",
  "GRAVEYARD",
];
const COMPOSITIONS: readonly string[] = [
  "GRUNT",
  "GRUNT,GRUNT",
  "GRUNT,GRUNT,SHIELD_PROJECTOR",
  "GRUNT,RAY_GUNNER",
];

/**
 * Map curiosities (`pulp_wars-737.2`, `pulp_wars-737.3`, and round 2
 * `pulp_wars-737.14`, docs/product/RULESET_7_MAP_CURIOSITIES.md sections 4
 * and 24): the placement rules checked independently of the engine's
 * placement code, against the same map generated without curiosities (the
 * `RIFTS` rules). Used by the generation tests and
 * `scripts/validate-ruleset7-curiosity-maps.ts`. Throws on the first broken
 * rule; returns the curiosity tiles (the Spider's lair as `MONSTER`,
 * Bigfoot's home as `BIGFOOT`, each gate as `GATES`) in (y, x) order. With
 * `target` (the section 4.2 target count), a board with fewer curiosities
 * must have no legal site left for any kind still eligible.
 */
export function checkCuriosityPlacementV7(
  map: GeneratedMapV7,
  base: GeneratedMapV7,
  mapType: MapTypeV7,
  target?: number,
  factions: readonly FactionIdV7[] = [],
): readonly CheckedCuriosityV7[] {
  const fail = (message: string): never => {
    throw new Error(`curiosity placement: ${message}`);
  };
  // Section 3: the curiosities change nothing else that was generated.
  const { curiosities: markers, neutrals, ...rest } = map;
  const {
    curiosities: baseCuriosities,
    neutrals: baseNeutrals,
    ...baseRest
  } = base;
  if (baseCuriosities.length !== 0 || baseNeutrals.length !== 0)
    fail("the base map has curiosities");
  if (JSON.stringify(rest) !== JSON.stringify(baseRest))
    fail("a generated fact other than the curiosities changed");
  const sortedMarkers = [...markers].sort(
    (a, b) => a.at.y - b.at.y || a.at.x - b.at.x,
  );
  if (JSON.stringify(sortedMarkers) !== JSON.stringify(markers))
    fail("not in (y, x) order");
  const same = (a: CoordV7, b: CoordV7) => a.x === b.x && a.y === b.y;
  const spiders = neutrals.filter((entry) => entry.breed === "GIANT_SPIDER");
  const bigfeet = neutrals.filter((entry) => entry.breed === "BIGFOOT");
  if (spiders.length > 1 || bigfeet.length > 1) fail("two Spiders or Bigfeet");
  for (const entry of [...spiders, ...bigfeet])
    if (!same(entry.at, entry.home)) fail(`${entry.breed} away from home`);
  const curiosities: readonly CheckedCuriosityV7[] = [
    ...markers.map((marker) => ({
      kind: (marker.kind === "GATE"
        ? "GATES"
        : marker.kind) as CheckedCuriosityKindV7,
      at: marker.at,
    })),
    ...spiders.map((entry) => ({ kind: "MONSTER" as const, at: entry.home })),
    ...bigfeet.map((entry) => ({ kind: "BIGFOOT" as const, at: entry.home })),
  ].sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x);
  const width = map.board.width;
  // Section 4.2: the counts (the gate pair is one curiosity) and one of
  // each kind.
  const kindsPlaced = [...new Set(curiosities.map((entry) => entry.kind))];
  const gates = markers.filter((marker) => marker.kind === "GATE");
  if (gates.length !== 0 && gates.length !== 2) fail("not one gate pair");
  for (const gate of gates)
    if (
      gate.kind !== "GATE" ||
      !gates.some(
        (other) =>
          other.kind === "GATE" &&
          other !== gate &&
          same(other.at, gate.partner) &&
          same(other.partner, gate.at),
      )
    )
      fail("a gate without its partner");
  if (curiosities.length !== kindsPlaced.length + (gates.length > 0 ? 1 : 0))
    fail("two curiosities of one kind");
  const count = kindsPlaced.length;
  const maximum = width >= 20 ? 2 : 1;
  if (count > maximum) fail(`${count} on ${width}`);
  if (target !== undefined && count > target)
    fail(`${count} above the target ${target}`);
  // Section 24.5: the hard checks.
  if (kindsPlaced.includes("DOWNED_SAUCER") && factions.includes("MARTIAN"))
    fail("a Downed Saucer with a Martian seat");
  if (kindsPlaced.includes("GRAVEYARD") && factions.includes("UNDEAD"))
    fail("a Graveyard with an Undead seat");
  if (
    width < 20 &&
    (kindsPlaced.includes("GATES") || kindsPlaced.includes("BIGFOOT"))
  )
    fail("gates or Bigfoot below width 20");
  if (kindsPlaced.filter((kind) => DANGERS.includes(kind)).length > 1)
    fail("two dangers on one board");
  const site = curiositySiteCheckerV7(map, mapType);
  for (const curiosity of curiosities) {
    const others = curiosities.filter(
      (other) =>
        other !== curiosity &&
        !(other.kind === "GATES" && curiosity.kind === "GATES"),
    );
    const problem = site(curiosity.kind, curiosity.at, others);
    if (problem !== null)
      fail(
        `${curiosity.kind} at ${curiosity.at.x},${curiosity.at.y} ${problem}`,
      );
  }
  if (gates.length === 2) {
    const [a, b] = gates as [(typeof gates)[number], (typeof gates)[number]];
    const problem = gatePairProblem(map, a.at, b.at);
    if (problem !== null) fail(`gates ${problem}`);
  }
  // Section 24.1: the camps' guards.
  const guards = neutrals.filter(
    (entry) => entry.breed !== "GIANT_SPIDER" && entry.breed !== "BIGFOOT",
  );
  const camps = markers.filter(
    (marker) => marker.kind === "DOWNED_SAUCER" || marker.kind === "GRAVEYARD",
  );
  for (const camp of camps) {
    const own = guards.filter((entry) => same(entry.home, camp.at));
    const breeds = own.map((entry) => entry.breed).join(",");
    if (
      camp.kind === "DOWNED_SAUCER"
        ? !COMPOSITIONS.includes(breeds)
        : breeds !== "ZOMBIE,ZOMBIE"
    )
      fail(`${camp.kind} with the guards ${breeds}`);
    const free = guardTiles(map, camp.at);
    for (const guard of own)
      if (!free.some((at) => same(at, guard.at)))
        fail(`a guard on ${guard.at.x},${guard.at.y} it may not stand on`);
    if (
      new Set(own.map((entry) => `${entry.at.x},${entry.at.y}`)).size !==
      own.length
    )
      fail("two guards on one tile");
  }
  if (guards.some((entry) => !camps.some((camp) => same(camp.at, entry.home))))
    fail("a guard without its camp");
  if (target !== undefined && count < target) {
    const danger = kindsPlaced.some((kind) => DANGERS.includes(kind));
    for (const kind of KINDS) {
      if (
        kindsPlaced.includes(kind) ||
        (danger && DANGERS.includes(kind)) ||
        (kind === "DOWNED_SAUCER" && factions.includes("MARTIAN")) ||
        (kind === "GRAVEYARD" && factions.includes("UNDEAD"))
      )
        continue;
      if (kind === "GATES") {
        const tiles = map.board.tiles.filter(
          (tile) => site("GATES", tile.at, curiosities) === null,
        );
        for (const a of tiles)
          for (const b of tiles)
            if (
              (a.at.y < b.at.y || (a.at.y === b.at.y && a.at.x < b.at.x)) &&
              gatePairProblem(map, a.at, b.at) === null
            )
              fail(
                `placement stopped below its target with a legal gate pair at ${a.at.x},${a.at.y}`,
              );
        continue;
      }
      const legal = map.board.tiles.find(
        (tile) => site(kind, tile.at, curiosities) === null,
      );
      if (legal !== undefined)
        fail(
          `placement stopped below its target with a legal ${kind} site at ${legal.at.x},${legal.at.y}`,
        );
    }
  }
  return curiosities;
}

/** Section 24.4: why `a` and `b` are not a legal gate pair, or null. */
function gatePairProblem(
  map: GeneratedMapV7,
  a: CoordV7,
  b: CoordV7,
): string | null {
  const chebyshev = (p: CoordV7, q: CoordV7) =>
    Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y));
  if (chebyshev(a, b) < Math.ceil((2 * map.board.width) / 3))
    return "are too close together";
  const nearer = map.capitals.map((capital) =>
    Math.min(chebyshev(capital, a), chebyshev(capital, b)),
  );
  if (Math.max(...nearer) - Math.min(...nearer) > 4)
    return "are unfair to the starts";
  return null;
}

/**
 * Sections 24.3 and 25.3: the neighbours of a camp centre a guard may
 * stand on at generation.
 */
function guardTiles(map: GeneratedMapV7, centre: CoordV7): readonly CoordV7[] {
  const { board } = map;
  const centers = [...map.capitals, ...map.villages];
  const result: CoordV7[] = [];
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const at = { x: centre.x + dx, y: centre.y + dy };
      const tile = board.tiles[at.y * board.width + at.x];
      if (
        at.x < 0 ||
        at.y < 0 ||
        at.x >= board.width ||
        at.y >= board.height ||
        tile === undefined ||
        tile.site !== null ||
        !["GRASS", "FOREST", "MOUNTAIN"].includes(tile.terrain) ||
        centers.some(
          (center) =>
            Math.max(Math.abs(center.x - at.x), Math.abs(center.y - at.y)) < 3,
        ) ||
        map.treasureChests.some((chest) => chest.x === at.x && chest.y === at.y)
      )
        continue;
      result.push(at);
    }
  return result;
}

/**
 * Sections 4.3, 4.4, and 24.2 to 24.4, written apart from the engine: why a
 * curiosity of `kind` may not stand on `at` with `placed` on the board, or
 * null (for `GATES`, one gate tile before the pair rule).
 */
export function curiositySiteCheckerV7(
  map: GeneratedMapV7,
  mapType: MapTypeV7,
): (
  kind: CheckedCuriosityKindV7,
  at: CoordV7,
  placed: readonly CheckedCuriosityV7[],
) => string | null {
  const { board } = map;
  const width = board.width;
  const tileAt = (at: CoordV7) =>
    at.x < 0 || at.y < 0 || at.x >= width || at.y >= board.height
      ? undefined
      : board.tiles[at.y * width + at.x];
  const chebyshev = (a: CoordV7, b: CoordV7) =>
    Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const key = (at: CoordV7) => `${at.x},${at.y}`;
  // Flood fills over eight neighbours.
  const flood = (
    starts: readonly CoordV7[],
    member: (at: CoordV7) => boolean,
  ): Set<string> => {
    const seen = new Set<string>();
    const stack = starts.filter(member);
    for (const at of stack) seen.add(key(at));
    while (stack.length > 0) {
      const at = stack.pop() as CoordV7;
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) {
          const near = { x: at.x + dx, y: at.y + dy };
          if (
            near.x < 0 ||
            near.y < 0 ||
            near.x >= width ||
            near.y >= board.height ||
            seen.has(key(near)) ||
            !member(near)
          )
            continue;
          seen.add(key(near));
          stack.push(near);
        }
    }
    return seen;
  };
  const isLand = (at: CoordV7) => {
    const tile = tileAt(at);
    return tile !== undefined && tile.biome !== null && tile.terrain !== "RIFT";
  };
  const isWater = (at: CoordV7) => tileAt(at)?.biome === null;
  const capitalLandmasses = map.capitals.map((capital) =>
    flood([capital], isLand),
  );
  const lowland = flood(
    map.capitals,
    (at) => isLand(at) && tileAt(at)?.terrain !== "MOUNTAIN",
  );
  const centers = [...map.capitals, ...map.villages];
  const waterCache = new Map<string, Set<string>>();
  // Section 4.4: a cut tile splits its component of the land graph (Rifts
  // excluded), with or without Mountains, when removed.
  const isLowland = (at: CoordV7) =>
    isLand(at) && tileAt(at)?.terrain !== "MOUNTAIN";
  const cutCache = new Map<string, boolean>();
  const isCut = (at: CoordV7): boolean => {
    const cached = cutCache.get(key(at));
    if (cached !== undefined) return cached;
    let cut = false;
    for (const member of [isLand, isLowland]) {
      if (!member(at)) continue;
      const component = flood([at], member);
      const rest = (near: CoordV7) => key(near) !== key(at) && member(near);
      const start = [...component]
        .map((cell) => {
          const [x, y] = cell.split(",").map(Number) as [number, number];
          return { x, y };
        })
        .find((cell) => key(cell) !== key(at));
      if (start === undefined) continue;
      if (flood([start], rest).size !== component.size - 1) cut = true;
    }
    cutCache.set(key(at), cut);
    return cut;
  };
  const lairLike = (kind: CheckedCuriosityKindV7) =>
    kind === "MONSTER" || kind === "DOWNED_SAUCER" || kind === "GRAVEYARD";
  return (kind, at, placed) => {
    const tile = tileAt(at);
    if (tile === undefined) return "is off the board";
    // Rule 1; sections 4.4 and 24.3: a lair's or camp's whole area is on
    // the board.
    const margin = lairLike(kind) ? 2 : 1;
    if (
      at.x < margin ||
      at.y < margin ||
      at.x > width - 1 - margin ||
      at.y > width - 1 - margin
    )
      return lairLike(kind)
        ? "has part of its area off the board"
        : "is on the edge ring";
    if (
      (kind === "MONSTER" ||
        kind === "DOWNED_SAUCER" ||
        kind === "GRAVEYARD") &&
      width < 16
    )
      return "is on a board below 16";
    if ((kind === "GATES" || kind === "BIGFOOT") && width < 20)
      return "is on a board below 20";
    // Rule 2.
    if (
      tile.site !== null ||
      tile.resource !== null ||
      tile.improvement !== null ||
      tile.terrain === "RIFT" ||
      map.treasureChests.some((chest) => key(chest) === key(at))
    )
      return "is on a site, chest, resource, improvement, or Rift";
    // Sections 4.4 and 24.1.
    const terrains: Record<CheckedCuriosityKindV7, readonly string[]> = {
      MONSTER: ["GRASS", "FOREST", "MOUNTAIN"],
      FOUNTAIN: ["GRASS"],
      SHRINE: ["GRASS", "FOREST"],
      WRECK: ["SHALLOW_WATER", "DEEP_WATER"],
      DOWNED_SAUCER: ["GRASS", "FOREST"],
      GRAVEYARD: ["GRASS"],
      GATES: ["GRASS", "FOREST"],
      BIGFOOT: ["FOREST"],
      WISHING_WELL: ["GRASS"],
    };
    if (!terrains[kind].includes(tile.terrain)) return `is on ${tile.terrain}`;
    if (kind === "WRECK" && mapType === "DRY_LAND") return "is on Dry Land";
    // Rule 3; section 4.4: a lair (and a camp centre) 5 or more from every
    // capital and 4 or more from every village.
    if (centers.some((center) => chebyshev(center, at) < 3))
      return "is within 2 of a settlement center";
    if (
      lairLike(kind) &&
      (map.capitals.some((center) => chebyshev(center, at) < 5) ||
        map.villages.some((center) => chebyshev(center, at) < 4))
    )
      return "is within 4 of a capital or 3 of a village center";
    // Rule 4 (a gate keeps its first half only).
    const distances = map.capitals.map((capital) => chebyshev(capital, at));
    if (Math.min(...distances) < 5) return "is within 4 of a capital";
    if (kind !== "GATES" && Math.max(...distances) - Math.min(...distances) > 4)
      return "is not between the capitals";
    // Rule 5.
    if (placed.some((other) => chebyshev(other.at, at) < 5))
      return "is within 4 of another curiosity";
    if (kind === "WRECK") {
      // Rule 7: its water touches every capital's landmass orthogonally.
      let water = waterCache.get(key(at));
      if (water === undefined) {
        water = flood([at], isWater);
        for (const cell of water) waterCache.set(cell, water);
      }
      const cells = [...water];
      for (const landmass of capitalLandmasses) {
        const touches = cells.some((cell) => {
          const [x, y] = cell.split(",").map(Number) as [number, number];
          return (
            landmass.has(`${x},${y - 1}`) ||
            landmass.has(`${x + 1},${y}`) ||
            landmass.has(`${x},${y + 1}`) ||
            landmass.has(`${x - 1},${y}`)
          );
        });
        if (!touches) return "cannot be sailed to from every capital";
      }
      return null;
    }
    // Rule 6: a shared landmass reached without Mountains, or no capital.
    const capitalsHere = capitalLandmasses.filter((landmass) =>
      landmass.has(key(at)),
    ).length;
    if (capitalsHere === 1) return "is on one player's home island";
    // A Monster's Mountain lair is reached when a tile next to it is.
    const reached =
      lowland.has(key(at)) ||
      (kind === "MONSTER" &&
        tile.terrain === "MOUNTAIN" &&
        [-1, 0, 1].some((dy) =>
          [-1, 0, 1].some((dx) =>
            lowland.has(key({ x: at.x + dx, y: at.y + dy })),
          ),
        ));
    if (capitalsHere >= 2 && !reached)
      return "is not reached from a capital without Mountains";
    if (kind === "GATES") return isCut(at) ? "is a cut tile" : null;
    if (kind === "BIGFOOT") {
      // Section 24.3: 12 or more habitat tiles (counted without the other
      // curiosities, which the placement order may have excluded only
      // partly) and no cut tile among the Forest within 4 that is 3 or
      // more from every centre.
      let habitat = 0;
      for (let dy = -4; dy <= 4; dy += 1)
        for (let dx = -4; dx <= 4; dx += 1) {
          const near = { x: at.x + dx, y: at.y + dy };
          if (
            tileAt(near)?.terrain !== "FOREST" ||
            centers.some((center) => chebyshev(center, near) < 3)
          )
            continue;
          if (isCut(near)) return `has the cut tile ${key(near)} in its forest`;
          habitat += 1;
        }
      return habitat < 12 ? `has ${habitat} habitat tiles` : null;
    }
    if (!lairLike(kind)) return null;
    // Section 4.4: 12 or more of the 24 tiles around are Grass, Forest, or
    // Mountain, and no tile of its area is a cut tile.
    let land = 0;
    for (let dy = -2; dy <= 2; dy += 1)
      for (let dx = -2; dx <= 2; dx += 1) {
        const near = { x: at.x + dx, y: at.y + dy };
        if (isCut(near))
          return `has the cut tile ${near.x},${near.y} in its area`;
        if (dx === 0 && dy === 0) continue;
        const terrain = tileAt(near)?.terrain;
        if (
          terrain === "GRASS" ||
          terrain === "FOREST" ||
          terrain === "MOUNTAIN"
        )
          land += 1;
      }
    if (land < 12) return `has ${land} land tiles around its lair`;
    // Section 24.3: the guard tiles around a camp centre.
    if (kind === "DOWNED_SAUCER" && guardTiles(map, at).length < 3)
      return "has fewer than 3 guard tiles";
    if (kind === "GRAVEYARD" && guardTiles(map, at).length < 2)
      return "has fewer than 2 guard tiles";
    return null;
  };
}
