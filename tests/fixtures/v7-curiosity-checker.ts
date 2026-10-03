import type {
  CoordV7,
  GeneratedMapV7,
  MapTypeV7,
} from "../../src/engine/index";

/** A placed curiosity of any kind; the Monster's is its home. */
export interface CheckedCuriosityV7 {
  readonly kind: "MONSTER" | "FOUNTAIN" | "SHRINE" | "WRECK";
  readonly at: CoordV7;
}

/**
 * Map curiosities (`pulp_wars-737.2` and `pulp_wars-737.3`,
 * docs/product/RULESET_7_MAP_CURIOSITIES.md section 4): the placement rules
 * checked independently of the engine's placement code, against the same
 * map generated without curiosities (the `RIFTS` rules). Used by
 * `tests/unit/ruleset-v7-curiosities.test.ts` and
 * `scripts/validate-ruleset7-curiosity-maps.ts`. Throws on the first broken
 * rule; returns the curiosities, the Monster's home included (as kind
 * `MONSTER`), in (y, x) order. With `target` (the section 4.2 target
 * count), a board with fewer curiosities must have no legal site left for
 * any kind it lacks.
 */
export function checkCuriosityPlacementV7(
  map: GeneratedMapV7,
  base: GeneratedMapV7,
  mapType: MapTypeV7,
  target?: number,
): readonly CheckedCuriosityV7[] {
  const fail = (message: string): never => {
    throw new Error(`curiosity placement: ${message}`);
  };
  // Section 3: the curiosities change nothing else that was generated.
  const { curiosities: markers, monsterHome, ...rest } = map;
  const {
    curiosities: baseCuriosities,
    monsterHome: baseMonster,
    ...baseRest
  } = base;
  if (baseCuriosities.length !== 0 || baseMonster !== null)
    fail("the base map has curiosities");
  if (JSON.stringify(rest) !== JSON.stringify(baseRest))
    fail("a generated fact other than the curiosities changed");
  const sortedMarkers = [...markers].sort(
    (a, b) => a.at.y - b.at.y || a.at.x - b.at.x,
  );
  if (JSON.stringify(sortedMarkers) !== JSON.stringify(markers))
    fail("not in (y, x) order");
  const curiosities: readonly CheckedCuriosityV7[] = [
    ...markers,
    ...(monsterHome === null
      ? []
      : [{ kind: "MONSTER" as const, at: monsterHome }]),
  ].sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x);
  const width = map.board.width;
  // Section 4.2: the counts and one of each kind.
  const maximum = width >= 20 ? 2 : 1;
  if (curiosities.length > maximum) fail(`${curiosities.length} on ${width}`);
  if (target !== undefined && curiosities.length > target)
    fail(`${curiosities.length} above the target ${target}`);
  if (
    new Set(curiosities.map((entry) => entry.kind)).size !== curiosities.length
  )
    fail("two curiosities of one kind");
  const site = curiositySiteCheckerV7(map, mapType);
  for (const curiosity of curiosities) {
    const others = curiosities.filter((other) => other !== curiosity);
    const problem = site(curiosity.kind, curiosity.at, others);
    if (problem !== null)
      fail(
        `${curiosity.kind} at ${curiosity.at.x},${curiosity.at.y} ${problem}`,
      );
  }
  if (target !== undefined && curiosities.length < target)
    for (const kind of ["MONSTER", "FOUNTAIN", "SHRINE", "WRECK"] as const) {
      if (curiosities.some((curiosity) => curiosity.kind === kind)) continue;
      const legal = map.board.tiles.find(
        (tile) => site(kind, tile.at, curiosities) === null,
      );
      if (legal !== undefined)
        fail(
          `placement stopped below its target with a legal ${kind} site at ${legal.at.x},${legal.at.y}`,
        );
    }
  return curiosities;
}

/**
 * Sections 4.3 and 4.4, written apart from the engine: why a curiosity of
 * `kind` may not stand on `at` with `placed` on the board, or null.
 */
export function curiositySiteCheckerV7(
  map: GeneratedMapV7,
  mapType: MapTypeV7,
): (
  kind: CheckedCuriosityV7["kind"],
  at: CoordV7,
  placed: readonly CheckedCuriosityV7[],
) => string | null {
  const { board } = map;
  const width = board.width;
  const tileAt = (at: CoordV7) => board.tiles[at.y * width + at.x];
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
  // Section 4.4, the Monster: a cut tile splits its component of the land
  // graph (Rifts excluded), with or without Mountains, when removed.
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
  return (kind, at, placed) => {
    const tile = tileAt(at);
    if (tile === undefined) return "is off the board";
    // Rule 1; section 4.4: the Monster's whole area is on the board.
    const margin = kind === "MONSTER" ? 2 : 1;
    if (
      at.x < margin ||
      at.y < margin ||
      at.x > width - 1 - margin ||
      at.y > width - 1 - margin
    )
      return kind === "MONSTER"
        ? "has part of its area off the board"
        : "is on the edge ring";
    if (kind === "MONSTER" && width < 16) return "is on a board below 16";
    // Rule 2.
    if (
      tile.site !== null ||
      tile.resource !== null ||
      tile.improvement !== null ||
      tile.terrain === "RIFT" ||
      map.treasureChests.some((chest) => key(chest) === key(at))
    )
      return "is on a site, chest, resource, improvement, or Rift";
    // Section 4.4.
    const terrains =
      kind === "MONSTER"
        ? ["GRASS", "FOREST", "MOUNTAIN"]
        : kind === "FOUNTAIN"
          ? ["GRASS"]
          : kind === "SHRINE"
            ? ["GRASS", "FOREST"]
            : ["SHALLOW_WATER", "DEEP_WATER"];
    if (!terrains.includes(tile.terrain)) return `is on ${tile.terrain}`;
    if (kind === "WRECK" && mapType === "DRY_LAND") return "is on Dry Land";
    // Rule 3; section 4.4: the Monster 5 or more from every center.
    if (centers.some((center) => chebyshev(center, at) < 3))
      return "is within 2 of a settlement center";
    if (
      kind === "MONSTER" &&
      centers.some((center) => chebyshev(center, at) < 5)
    )
      return "is within 4 of a settlement center";
    // Rule 4.
    const distances = map.capitals.map((capital) => chebyshev(capital, at));
    if (Math.min(...distances) < 5) return "is within 4 of a capital";
    if (Math.max(...distances) - Math.min(...distances) > 4)
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
    if (kind !== "MONSTER") return null;
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
    return null;
  };
}
