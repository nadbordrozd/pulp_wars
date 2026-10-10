import { describe, expect, it } from "vitest";
import {
  BOARD_SIZES_V7,
  FACTION_IDS_V7,
  GENERATED_MAP_TYPES_V7,
  MAP_GENERATION_REVISION_V7,
  MEASURED_SEAT_CAPACITY_V7,
  PLAYER_COLORS_V7,
  RULESET_7_ID,
  allowedBoardSizesV7,
  applyCapitalLevellingV7,
  applyCapitalMountainFloorV7,
  autoBoardSizeV7,
  canonicalMapRandomHashV7,
  capitalDomainMapV7,
  capitalGrowthReadyV7,
  capitalRoomSharesV7,
  capitalSpacingV7,
  capitalTileLegalV7,
  centralZoneEdgeDistanceV7,
  continentCapitalSplitV7,
  continentDomainGroupsV7,
  createInitialMapStateV7,
  crowdedBoardV7,
  domainBandV7,
  domainsPerSideV7,
  drawCapitalDomainsV7,
  generateInitialMapV7,
  generateInitialMapWithVillageCountV7,
  generatedVillageCountV7,
  inCapitalDomainV7,
  majorLandmassMinimumV7,
  maxSeatCountV7,
  maxSeatsV7,
  nearestCapitalSharesV7,
  parseGameStateV7,
  partialVillagesV7,
  roomBalancedV7,
  seatCapacityV7,
  seatCountAllowedV7,
  validateMatchSetupV7,
  villageBalancedV7,
  villageCountV7,
  type BoardStateV7,
  type CoordV7,
  type GeneratedMapTypeV7,
  type GeneratedMapV7,
  type MatchSetupV7,
  type TileStateV7,
} from "../../src/engine/index";
import { randomState } from "../../src/engine/random/random";

// Map scale, many seats (`pulp_wars-ykw.3`, `pulp-wars-poc-7r42`,
// docs/product/RULESET_7_MAP_SCALE.md sections 3, 4, and 6 as amended in
// section 5.6; current rules sections 2.1 to 2.3 and 3): two to as many
// seats as there are factions, the sizes each seat count may play, capitals
// in domains, room and village balance, Continents and Archipelago for many
// seats, nine seat colours, and map revision V4.

const F = FACTION_IDS_V7.length;

function setup(
  mapType: MatchSetupV7["mapType"],
  width: MatchSetupV7["width"],
  seats: number,
  seed: number,
  overrides: Partial<MatchSetupV7> = {},
): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width,
    height: width,
    aiCount: seats - 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: FACTION_IDS_V7.slice(0, seats),
    mapType,
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    curiosities: false,
    ...overrides,
  };
}

function generated(input: MatchSetupV7): GeneratedMapV7 {
  const result = generateInitialMapV7(input);
  if (!result.ok)
    throw new Error(`generation failed: ${JSON.stringify(result.error)}`);
  return result.map;
}

const chebyshev = (a: CoordV7, b: CoordV7): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const edgeDistance = (width: number, at: CoordV7): number =>
  Math.min(at.x, at.y, width - 1 - at.x, width - 1 - at.y);

/** Eight-connected land components: a component index per tile, -1 water. */
function landComponents(board: BoardStateV7): {
  readonly label: readonly number[];
  readonly sizes: readonly number[];
} {
  const { width, height, tiles } = board;
  const label = new Array<number>(tiles.length).fill(-1);
  const sizes: number[] = [];
  for (let start = 0; start < tiles.length; start += 1) {
    if (label[start] !== -1 || tiles[start]?.biome === null) continue;
    const id = sizes.length;
    const queue = [start];
    label[start] = id;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const index = queue[cursor] as number;
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) {
          const x = (index % width) + dx;
          const y = Math.floor(index / width) + dy;
          if (x < 0 || y < 0 || x >= width || y >= height) continue;
          const near = y * width + x;
          if (label[near] !== -1 || tiles[near]?.biome === null) continue;
          label[near] = id;
          queue.push(near);
        }
    }
    sizes.push(queue.length);
  }
  return { label, sizes };
}

/** Every many-seats rule of one generated board (section 10.1). */
function expectManySeatBoard(map: GeneratedMapV7, input: MatchSetupV7): void {
  const mapType = input.mapType as GeneratedMapTypeV7;
  const width = input.width;
  const seats = input.aiCount + 1;
  const tileAt = (at: CoordV7) => map.board.tiles[at.y * width + at.x];
  expect(map.capitals).toHaveLength(seats);
  // Villages: the density count, or as many as fit on a setup new at V4.
  const target = villageCountV7(input);
  if (partialVillagesV7("CAPITAL_DOMAINS_CURIOSITIES", input))
    expect(map.villages.length).toBeLessThanOrEqual(target);
  else expect(map.villages).toHaveLength(target);
  // Spacing, the edge margin, and the central zone.
  const spacing = capitalSpacingV7(width, seats);
  const zone = centralZoneEdgeDistanceV7(width, seats);
  map.capitals.forEach((capital, index) => {
    expect(tileAt(capital)?.site).toBe("CAPITAL");
    expect(edgeDistance(width, capital)).toBeGreaterThanOrEqual(2);
    if (zone !== null) expect(edgeDistance(width, capital)).toBeLessThan(zone);
    expect(capitalTileLegalV7(width, width, seats, capital)).toBe(true);
    for (const other of map.capitals.slice(index + 1))
      expect(chebyshev(capital, other)).toBeGreaterThanOrEqual(spacing);
  });
  const settlements = [...map.capitals, ...map.villages];
  settlements.forEach((a, index) => {
    for (const b of settlements.slice(index + 1))
      expect(chebyshev(a, b)).toBeGreaterThanOrEqual(3);
  });
  for (const village of map.villages)
    expect(edgeDistance(width, village)).toBeGreaterThanOrEqual(1);
  // Room and village balance.
  const room = capitalRoomSharesV7(map.board, map.capitals);
  expect(roomBalancedV7(room)).toBe(true);
  expect(Math.max(...room)).toBeLessThanOrEqual(
    (seats <= 4 ? 1.5 : 2) * Math.min(...room) + 1e-9,
  );
  const villages = nearestCapitalSharesV7(
    map.board,
    map.capitals,
    map.villages,
  );
  expect(villageBalancedV7(villages)).toBe(true);
  const counted = villages.reduce((sum, share) => sum + share, 0);
  expect(Math.max(...villages) - Math.min(...villages)).toBeLessThanOrEqual(
    Math.max(2, Math.ceil(counted / (2 * seats))) + 1e-9,
  );
  // One capital per domain where the domain grid applies.
  if (mapType === "DRY_LAND" || mapType === "PANGEA" || mapType === "LAKES") {
    const k = domainsPerSideV7(seats);
    const domainOf = (at: CoordV7): string =>
      [at.x, at.y]
        .map((value) =>
          Array.from({ length: k }, (_, index) => index).find((index) => {
            const band = domainBandV7(width, k, index);
            return value >= band.from && value <= band.to;
          }),
        )
        .join(",");
    const domains = map.capitals.map(domainOf);
    expect(new Set(domains).size).toBe(seats);
    if (k === 3 && seats <= 8) expect(domains).not.toContain("1,1");
  }
  // Landmasses.
  if (mapType !== "CONTINENTS" && mapType !== "ARCHIPELAGO") return;
  const components = landComponents(map.board);
  const componentOf = (at: CoordV7): number =>
    components.label[at.y * width + at.x] ?? -1;
  const majorMinimum = majorLandmassMinimumV7(width, mapType, seats);
  const major = components.sizes
    .map((size, id) => ({ size, id }))
    .filter((component) => component.size >= majorMinimum);
  if (mapType === "ARCHIPELAGO") {
    expect(new Set(map.capitals.map(componentOf)).size).toBe(seats);
    return;
  }
  const split = continentCapitalSplitV7(seats);
  expect(major).toHaveLength(split.length);
  expect(
    major
      .map(
        (component) =>
          map.capitals.filter((at) => componentOf(at) === component.id).length,
      )
      .sort((a, b) => b - a),
  ).toEqual(split);
}

describe("ruleset-7 map scale: many seats (7r42)", () => {
  it("holds the players the rule gives each width and map type", () => {
    expect(MAP_GENERATION_REVISION_V7).toBe("REGIONAL_BIOMES_NAVAL_V4");
    expect(maxSeatCountV7()).toBe(F);
    // Section 3.2, `P(w, type)` at 11 / 14 / 16 / 20 / 25, with the two
    // measured cells of section 3.4 (11 x 11 Lakes 2, Continents 6).
    expect(
      Object.fromEntries(
        GENERATED_MAP_TYPES_V7.map((type) => [
          type,
          BOARD_SIZES_V7.map((width) => seatCapacityV7(width, type)),
        ]),
      ),
    ).toEqual({
      DRY_LAND: [9, 16, 16, 36, 49],
      PANGEA: [8, 14, 16, 32, 49],
      CONTINENTS: [6, 12, 15, 24, 38],
      ARCHIPELAGO: [4, 8, 9, 16, 27],
      LAKES: [2, 16, 16, 35, 49],
    });
    expect(MEASURED_SEAT_CAPACITY_V7).toEqual([
      { width: 11, mapType: "LAKES", seats: 2 },
      { width: 11, mapType: "CONTINENTS", seats: 6 },
    ]);
    // A setup may have 2 to min(F, P) seats.
    for (const type of GENERATED_MAP_TYPES_V7)
      for (const width of BOARD_SIZES_V7) {
        const most = Math.min(F, seatCapacityV7(width, type));
        expect(maxSeatsV7(width, type)).toBe(most);
        expect(seatCountAllowedV7(width, type, 1)).toBe(false);
        expect(seatCountAllowedV7(width, type, 2)).toBe(true);
        expect(seatCountAllowedV7(width, type, most)).toBe(true);
        expect(seatCountAllowedV7(width, type, most + 1)).toBe(false);
      }
    expect(maxSeatsV7(11, "DRY_LAND")).toBe(Math.min(F, 9));
    expect(maxSeatsV7(11, "ARCHIPELAGO")).toBe(4);
    // The Showcase: two to four seats on 16 x 16 only.
    expect(maxSeatsV7(16, "SHOWCASE")).toBe(4);
    expect(seatCountAllowedV7(16, "SHOWCASE", 4)).toBe(true);
    expect(seatCountAllowedV7(16, "SHOWCASE", 5)).toBe(false);
    expect(seatCountAllowedV7(20, "SHOWCASE", 2)).toBe(false);
  });

  it("offers the sizes a seat count may play and the auto size", () => {
    expect(allowedBoardSizesV7("DRY_LAND", 2)).toEqual([11, 14, 16, 20, 25]);
    expect(allowedBoardSizesV7("DRY_LAND", F)).toEqual([11, 14, 16, 20, 25]);
    expect(allowedBoardSizesV7("ARCHIPELAGO", 5)).toEqual([14, 16, 20, 25]);
    expect(allowedBoardSizesV7("LAKES", 3)).toEqual([14, 16, 20, 25]);
    expect(allowedBoardSizesV7("CONTINENTS", 7)).toEqual([14, 16, 20, 25]);
    expect(allowedBoardSizesV7("DRY_LAND", F + 1)).toEqual([]);
    expect(allowedBoardSizesV7("SHOWCASE", 3)).toEqual([16]);
    expect(allowedBoardSizesV7("SHOWCASE", 5)).toEqual([]);
    // Section 6.2: the smallest allowed size with 56 tiles per seat.
    expect(
      [2, 3, 4, 5, 6, 7, 8].map((seats) => autoBoardSizeV7(seats, "DRY_LAND")),
    ).toEqual([11, 14, 16, 20, 20, 20, 25]);
    expect(autoBoardSizeV7(2)).toBe(11);
    // A type too small at the auto size takes the next allowed size.
    expect(autoBoardSizeV7(3, "LAKES")).toBe(14);
    expect(autoBoardSizeV7(2, "LAKES")).toBe(11);
    expect(autoBoardSizeV7(4, "SHOWCASE")).toBe(16);
    expect(autoBoardSizeV7(F + 1, "DRY_LAND")).toBeNull();
  });

  it("counts villages and names the crowded boards", () => {
    // Section 5.2 rows: villages are max(0, S - N).
    expect(
      [2, 3, 4, 5, 6, 7, 8].map((seats) =>
        generatedVillageCountV7(11, "DRY_LAND", seats),
      ),
    ).toEqual([6, 5, 4, 3, 2, 1, 0]);
    expect(
      [2, 5, 8].map((seats) => generatedVillageCountV7(25, "DRY_LAND", seats)),
    ).toEqual([40, 37, 34]);
    expect(generatedVillageCountV7(14, "ARCHIPELAGO", 8)).toBe(0);
    expect(villageCountV7(setup("DRY_LAND", 20, 8, 0))).toBe(19);
    // Section 6.3: crowded is less than one village per two players.
    expect(crowdedBoardV7(11, "DRY_LAND", 4)).toBe(false);
    expect(crowdedBoardV7(11, "DRY_LAND", 5)).toBe(false);
    expect(crowdedBoardV7(11, "DRY_LAND", 6)).toBe(true);
    expect(crowdedBoardV7(11, "DRY_LAND", 8)).toBe(true);
    expect(crowdedBoardV7(14, "DRY_LAND", 8)).toBe(false);
    expect(crowdedBoardV7(14, "ARCHIPELAGO", 7)).toBe(true);
    expect(crowdedBoardV7(25, "DRY_LAND", 8)).toBe(false);
    // The auto size is never crowded.
    for (const type of GENERATED_MAP_TYPES_V7)
      for (let seats = 2; seats <= F; seats += 1) {
        const width = autoBoardSizeV7(seats, type);
        if (width === null) throw new Error("no auto size");
        expect(crowdedBoardV7(width, type, seats)).toBe(false);
      }
  });

  it("spaces capitals by D(w, N) and keeps the middle free", () => {
    expect([2, 4, 5, 8, 9, 10].map(domainsPerSideV7)).toEqual([
      2, 2, 3, 3, 3, 4,
    ]);
    // Section 4.1: D for 2-4 seats and for 5-9 seats.
    expect(BOARD_SIZES_V7.map((width) => capitalSpacingV7(width, 4))).toEqual([
      5, 7, 8, 10, 12,
    ]);
    expect(BOARD_SIZES_V7.map((width) => capitalSpacingV7(width, 8))).toEqual([
      3, 4, 5, 6, 8,
    ]);
    expect(
      BOARD_SIZES_V7.map((width) => centralZoneEdgeDistanceV7(width, 8)),
    ).toEqual([3, 4, 5, 6, 8]);
    expect(centralZoneEdgeDistanceV7(11, 9)).toBeNull();
    expect(capitalTileLegalV7(11, 11, 8, { x: 2, y: 5 })).toBe(true);
    expect(capitalTileLegalV7(11, 11, 8, { x: 1, y: 5 })).toBe(false);
    expect(capitalTileLegalV7(11, 11, 8, { x: 3, y: 5 })).toBe(false);
    expect(capitalTileLegalV7(11, 11, 9, { x: 5, y: 5 })).toBe(true);
    expect(domainBandV7(11, 3, 0)).toEqual({ from: 0, to: 2 });
    expect(domainBandV7(11, 3, 1)).toEqual({ from: 3, to: 6 });
    expect(domainBandV7(11, 3, 2)).toEqual({ from: 7, to: 10 });
    // Section 4.3: capitals per Continents landmass, the largest first.
    expect([2, 3, 4, 5, 6, 7, 8, 9].map(continentCapitalSplitV7)).toEqual([
      [1, 1],
      [1, 1, 1],
      [2, 1, 1],
      [2, 2, 1],
      [2, 2, 1, 1],
      [2, 2, 2, 1],
      [2, 2, 2, 2],
      [3, 2, 2, 2],
    ]);
    // From five seats a landmass holds the capitals of adjacent domains.
    expect(continentDomainGroupsV7(5)).toEqual([[1, 2], [3, 4], [0]]);
    expect(continentDomainGroupsV7(6)).toEqual([[0, 1], [2, 3], [4], [5]]);
    expect(continentDomainGroupsV7(8)).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
      [6, 7],
    ]);
    // The major landmass minimum: the earlier value up to four seats, and
    // small enough for eight 20-tile islands on 20 x 20.
    expect(majorLandmassMinimumV7(20, "ARCHIPELAGO", 4)).toBe(20);
    expect(majorLandmassMinimumV7(20, "ARCHIPELAGO", 8)).toBe(10);
    expect(majorLandmassMinimumV7(11, "ARCHIPELAGO", 4)).toBe(6);
    expect(majorLandmassMinimumV7(20, "CONTINENTS", 8)).toBe(20);
  });

  it("draws the domains: corner shuffle up to four seats, ring slots to eight", () => {
    const corners = drawCapitalDomainsV7(16, 3, randomState(7));
    expect(corners.domains).toHaveLength(3);
    for (const domain of corners.domains) {
      expect([0, 8]).toContain(domain.x0);
      expect([7, 15]).toContain(domain.x1);
      expect([0, 8]).toContain(domain.y0);
    }
    expect(new Set(corners.domains.map((d) => `${d.x0},${d.y0}`)).size).toBe(3);
    expect(corners.random).not.toEqual(randomState(7));
    for (const seats of [5, 6, 7, 8]) {
      const ring = drawCapitalDomainsV7(20, seats, randomState(seats));
      expect(ring.domains).toHaveLength(seats);
      const cells = ring.domains.map((d) => `${d.x0},${d.y0}`);
      // Distinct ring domains, never the centre one.
      expect(new Set(cells).size).toBe(seats);
      expect(cells).not.toContain("6,6");
      expect(inCapitalDomainV7(ring.domains[0] as never, { x: 9, y: 9 })).toBe(
        false,
      );
    }
    // Eight seats use the whole ring whatever the rotation and mirror.
    expect(
      new Set(
        drawCapitalDomainsV7(11, 8, randomState(1)).domains.map(
          (d) => `${d.x0},${d.y0}`,
        ),
      ),
    ).toEqual(
      new Set(["0,0", "3,0", "7,0", "7,3", "7,7", "3,7", "0,7", "0,3"]),
    );
    expect(capitalDomainMapV7("DRY_LAND", 2)).toBe(true);
    expect(capitalDomainMapV7("CONTINENTS", 4)).toBe(false);
    expect(capitalDomainMapV7("CONTINENTS", 5)).toBe(true);
    expect(capitalDomainMapV7("ARCHIPELAGO", 4)).toBe(false);
    expect(capitalDomainMapV7("ARCHIPELAGO", 5)).toBe(true);
  });

  it("validates seats, sizes, and the nine seat colours", () => {
    expect(PLAYER_COLORS_V7).toEqual([
      "CORAL",
      "TEAL",
      "GOLD",
      "VIOLET",
      "SKY",
      "LIME",
      "ROSE",
      "SLATE",
      "AMBER",
    ]);
    // The next faction cannot outgrow the colours silently.
    expect(PLAYER_COLORS_V7.length).toBeGreaterThanOrEqual(F);
    for (const humanColor of PLAYER_COLORS_V7)
      expect(
        validateMatchSetupV7(setup("DRY_LAND", 11, 2, 0, { humanColor })).ok,
      ).toBe(true);
    expect(
      validateMatchSetupV7(
        setup("DRY_LAND", 11, 2, 0, { humanColor: "PINK" as never }),
      ).ok,
    ).toBe(false);
    // 1 to F - 1 AI where the width holds them.
    for (let seats = 2; seats <= F; seats += 1) {
      expect(validateMatchSetupV7(setup("DRY_LAND", 11, seats, 0)).ok).toBe(
        true,
      );
      expect(validateMatchSetupV7(setup("ARCHIPELAGO", 11, seats, 0)).ok).toBe(
        seats <= 4,
      );
      expect(validateMatchSetupV7(setup("LAKES", 11, seats, 0)).ok).toBe(
        seats <= 2,
      );
      expect(validateMatchSetupV7(setup("CONTINENTS", 11, seats, 0)).ok).toBe(
        seats <= 6,
      );
      // The Cultists (`pulp_wars-mch9.3`): with nine factions the cells
      // that hold eight stop there (RULESET_7_CULTISTS.md section 17.8).
      expect(validateMatchSetupV7(setup("ARCHIPELAGO", 14, seats, 0)).ok).toBe(
        seats <= 8,
      );
      expect(validateMatchSetupV7(setup("PANGEA", 11, seats, 0)).ok).toBe(
        seats <= 8,
      );
      expect(validateMatchSetupV7(setup("DRY_LAND", 14, seats, 0)).ok).toBe(
        true,
      );
    }
    // Over F - 1 AI is refused, with or without the mirror flag.
    const tooMany = {
      ...setup("DRY_LAND", 25, F, 0),
      aiCount: F,
      factions: [...FACTION_IDS_V7, "ORIGINAL" as const],
    };
    expect(validateMatchSetupV7(tooMany)).toEqual({
      ok: false,
      error: { code: "INVALID_SETUP", params: {} },
    });
    expect(
      validateMatchSetupV7({ ...tooMany, allowDuplicateFactions: true }).ok,
    ).toBe(false);
    // The mirror flag does not lift the width's limit either.
    expect(
      validateMatchSetupV7({
        ...setup("ARCHIPELAGO", 11, 5, 0),
        allowDuplicateFactions: true,
      }).ok,
    ).toBe(false);
    for (const aiCount of [0, 1.5, -1, "2"])
      expect(
        validateMatchSetupV7({
          ...setup("DRY_LAND", 25, 2, 0),
          aiCount,
        }).ok,
      ).toBe(false);
    // Every seat a different faction, at every count.
    expect(
      validateMatchSetupV7({
        ...setup("DRY_LAND", 20, 6, 0),
        factions: ["ORIGINAL", "UNDEAD", "GOBLIN", "DWARF", "CANDY", "UNDEAD"],
      }),
    ).toEqual({
      ok: false,
      error: {
        code: "DUPLICATE_FACTION",
        params: { faction: "UNDEAD", seats: [1, 5] },
      },
    });
    // The Showcase stays at two to four seats.
    expect(validateMatchSetupV7(setup("SHOWCASE", 16, 4, 0)).ok).toBe(true);
    expect(validateMatchSetupV7(setup("SHOWCASE", 16, 5, 0)).ok).toBe(false);
  });

  it.each(GENERATED_MAP_TYPES_V7)(
    "%s: capitals, balance, and landmasses for two to the most seats",
    (mapType) => {
      for (const width of BOARD_SIZES_V7)
        for (let seats = 2; seats <= maxSeatsV7(width, mapType); seats += 1) {
          // A light sweep: the validation command runs seeds 0-255.
          if (width >= 20 && seats % 3 !== 2) continue;
          const input = setup(mapType, width, seats, seats + width);
          expectManySeatBoard(generated(input), input);
        }
    },
    600_000,
  );

  it("fills an 11 x 11 Dry Land board with as many players as factions", () => {
    const seats = Math.min(F, 9);
    const input = setup("DRY_LAND", 11, seats, 3);
    const map = generated(input);
    expectManySeatBoard(map, input);
    expect(map.capitals).toHaveLength(seats);
    if (seats === 8) {
      // Eight capitals stand at pitch 3 around the ring, 2 from the edge.
      expect(map.capitals).toEqual([
        { x: 2, y: 2 },
        { x: 5, y: 2 },
        { x: 8, y: 2 },
        { x: 2, y: 5 },
        { x: 8, y: 5 },
        { x: 2, y: 8 },
        { x: 5, y: 8 },
        { x: 8, y: 8 },
      ]);
      expect(map.villages).toEqual([]);
    }
    // The initial state: one player, capital, and starting unit per seat.
    const created = createInitialMapStateV7(input);
    if (!created.ok) throw new Error("initial state");
    const state = created.state;
    expect(parseGameStateV7(state)).not.toBeNull();
    expect(state.players).toHaveLength(seats);
    expect(state.players.map((player) => player.faction)).toEqual(
      FACTION_IDS_V7.slice(0, seats),
    );
    expect(new Set(state.players.map((player) => player.color)).size).toBe(
      seats,
    );
    expect(state.players.map((player) => player.color)).toEqual(
      PLAYER_COLORS_V7.slice(0, seats),
    );
    expect(state.cities).toHaveLength(seats);
    expect(state.units).toHaveLength(seats);
    // Turn order is a shuffle of every seat.
    expect([...state.turnOrder].sort((a, b) => a - b)).toEqual(
      state.players.map((player) => player.id),
    );
    // Every capital owns its 3 x 3 square and nothing overlaps.
    for (const city of state.cities)
      expect(
        state.board.tiles.filter((tile) => tile.territoryCityId === city.id),
      ).toHaveLength(9);
  });

  it("is deterministic and neutral to factions and curiosities with many seats", () => {
    for (const mapType of GENERATED_MAP_TYPES_V7) {
      const input = setup(mapType, 20, 6, 11);
      const map = generated(input);
      expect(generated(input)).toEqual(map);
      expect(
        generated({
          ...input,
          factions: [...FACTION_IDS_V7].reverse().slice(0, 6),
        }),
      ).toEqual(map);
      const on = generated({ ...input, curiosities: true });
      expect({ ...on, curiosities: [], neutrals: [] }).toEqual(map);
    }
  });

  it("keeps exact village counts on the setups of 7r41 and fills the new ones as far as they go", () => {
    const rules = "CAPITAL_DOMAINS_CURIOSITIES";
    expect(partialVillagesV7(rules, setup("DRY_LAND", 11, 2, 0))).toBe(false);
    expect(partialVillagesV7(rules, setup("DRY_LAND", 14, 3, 0))).toBe(false);
    expect(partialVillagesV7(rules, setup("DRY_LAND", 16, 4, 0))).toBe(false);
    expect(partialVillagesV7(rules, setup("DRY_LAND", 11, 3, 0))).toBe(true);
    expect(partialVillagesV7(rules, setup("DRY_LAND", 14, 4, 0))).toBe(true);
    expect(partialVillagesV7(rules, setup("DRY_LAND", 25, 5, 0))).toBe(true);
    expect(
      partialVillagesV7(
        "VILLAGE_DENSITY_CURIOSITIES",
        setup("DRY_LAND", 11, 2, 0),
      ),
    ).toBe(false);
    for (let seed = 0; seed < 4; seed += 1) {
      expect(generated(setup("DRY_LAND", 16, 4, seed)).villages).toHaveLength(
        13,
      );
      // 16 x 16 cannot hold 17 settlements around eight ring capitals.
      const crowded = generated(setup("DRY_LAND", 16, 8, seed));
      expect(crowded.villages.length).toBeLessThanOrEqual(9);
      expect(crowded.villages.length).toBeGreaterThan(0);
    }
  });

  it("names the invariants and the parity rules", () => {
    // The V3 rules refuse a setup they never accepted.
    expect(
      generateInitialMapWithVillageCountV7(
        setup("DRY_LAND", 20, 6, 0),
        21,
        "VILLAGE_DENSITY_CURIOSITIES",
      ),
    ).toEqual({ ok: false, error: { code: "INVALID_SETUP", params: {} } });
    // The current rules with the density count are the current generator.
    const input = setup("PANGEA", 16, 7, 2, { curiosities: true });
    expect(
      generateInitialMapWithVillageCountV7(input, villageCountV7(input)),
    ).toEqual(generateInitialMapV7(input));
    const rifts = generateInitialMapWithVillageCountV7(
      input,
      villageCountV7(input),
      "CAPITAL_DOMAINS_RIFTS",
    );
    const current = generateInitialMapV7(input);
    if (!rifts.ok || !current.ok) throw new Error("generation");
    expect({ ...current.map, curiosities: [], neutrals: [] }).toEqual(
      rifts.map,
    );
    // Balance helpers.
    expect(roomBalancedV7([10, 15])).toBe(true);
    expect(roomBalancedV7([10, 15.5])).toBe(false);
    expect(roomBalancedV7([10, 20, 12, 11, 13])).toBe(true);
    expect(roomBalancedV7([10, 21, 12, 11, 13])).toBe(false);
    expect(villageBalancedV7([3, 1])).toBe(true);
    expect(villageBalancedV7([4, 1])).toBe(false);
    // T = 20, N = 2: ceil(20 / 4) = 5.
    expect(villageBalancedV7([12.5, 7.5])).toBe(true);
    expect(villageBalancedV7([13, 7])).toBe(false);
  });

  it("evens the capital rings without touching a board that already passes", () => {
    const width = 11;
    const grass = (x: number, y: number): TileStateV7 => ({
      at: { x, y },
      biome: "PLAINS",
      terrain: "GRASS",
      resource: null,
      improvement: null,
      road: false,
      fieldDefense: false,
      site: null,
      territoryCityId: null,
    });
    const tiles = Array.from({ length: width * width }, (_, index) =>
      grass(index % width, Math.floor(index / width)),
    );
    const put = (x: number, y: number, patch: Partial<TileStateV7>): void => {
      tiles[y * width + x] = { ...grass(x, y), ...patch };
    };
    const rich = { x: 1, y: 1 };
    const poor = { x: 5, y: 5 };
    put(1, 1, { site: "CAPITAL" });
    put(5, 5, { site: "CAPITAL" });
    // The rich ring: four Forests with Game and four Fertile Ground (20).
    for (const [x, y] of [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
    ] as const)
      put(x, y, { terrain: "FOREST", resource: "GAME" });
    for (const [x, y] of [
      [2, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ] as const)
      put(x, y, { resource: "FERTILE_GROUND" });
    // The poor ring: seven Mountains without Ore and one empty Grass (0).
    for (const [x, y] of [
      [4, 4],
      [5, 4],
      [6, 4],
      [4, 5],
      [6, 5],
      [4, 6],
      [5, 6],
    ] as const)
      put(x, y, { terrain: "MOUNTAIN" });
    const board: BoardStateV7 = { width, height: width, tiles };
    const rank = (at: CoordV7): number => at.y * width + at.x;
    const score = (target: BoardStateV7, capital: CoordV7): number =>
      target.tiles
        .filter(
          (tile) =>
            chebyshev(tile.at, capital) === 1 &&
            (tile.at.x !== capital.x || tile.at.y !== capital.y),
        )
        .reduce(
          (sum, tile) =>
            sum +
            (tile.resource === "FRUIT"
              ? 1
              : tile.resource === "FERTILE_GROUND"
                ? 2
                : tile.terrain === "FOREST"
                  ? 2 + Number(tile.resource === "GAME")
                  : tile.resource === "ORE"
                    ? 2
                    : 0),
          0,
        );
    expect(score(board, rich)).toBe(20);
    expect(score(board, poor)).toBe(0);
    // The mountain floor opens four ring cells, lowest rank first.
    const opened = applyCapitalMountainFloorV7(board, [rich, poor], rank);
    const openCells = (target: BoardStateV7): number =>
      target.tiles.filter(
        (tile) => chebyshev(tile.at, poor) === 1 && tile.terrain !== "MOUNTAIN",
      ).length;
    expect(openCells(board)).toBe(1);
    expect(openCells(opened)).toBe(4);
    expect(opened.tiles[4 * width + 4]?.terrain).toBe("GRASS");
    // The levelling brings both scores into one window of five inside 6-17
    // and leaves each ring ready to grow.
    const levelled = applyCapitalLevellingV7(opened, [rich, poor], rank, false);
    const scores = [score(levelled, rich), score(levelled, poor)];
    expect(Math.min(...scores)).toBeGreaterThanOrEqual(6);
    expect(Math.max(...scores)).toBeLessThanOrEqual(17);
    expect(Math.max(...scores) - Math.min(...scores)).toBeLessThanOrEqual(5);
    expect(capitalGrowthReadyV7(levelled, rich, false)).toBe(true);
    expect(capitalGrowthReadyV7(levelled, poor, false)).toBe(true);
    // Sites never change, and a second pass changes nothing.
    expect(levelled.tiles[1 * width + 1]).toEqual(board.tiles[1 * width + 1]);
    expect(
      applyCapitalLevellingV7(levelled, [rich, poor], rank, false).tiles,
    ).toEqual(levelled.tiles);
    expect(
      applyCapitalMountainFloorV7(levelled, [rich, poor], rank).tiles,
    ).toEqual(levelled.tiles);
  });

  it("pins golden boards: 8-seat Dry Land 11 x 11 and one many-seat board per type", () => {
    expect(
      Object.fromEntries(
        (
          [
            ["DRY_LAND", 11, Math.min(F, 8)],
            ["DRY_LAND", 16, 2],
            ["PANGEA", 16, 6],
            ["LAKES", 20, 8],
            ["CONTINENTS", 20, 7],
            ["ARCHIPELAGO", 25, 8],
          ] as const
        ).map(([mapType, width, seats]) => {
          const map = generated(setup(mapType, width, seats, 7));
          return [
            `${mapType}/${width}/${seats}`,
            [
              canonicalMapRandomHashV7(map),
              map.attempt,
              map.villages.length,
              map.wildCentres,
            ],
          ];
        }),
      ),
    ).toEqual(GOLDEN);
  });
});

/**
 * `canonicalMapRandomHashV7`, the accepted candidate, the villages, and the
 * wild centres of seed 7, generated at `pulp-wars-poc-7r42`.
 */
const GOLDEN = {
  "DRY_LAND/11/8": [
    "17d6d85339facfe70ff82ef837af2700a23e5fc9890f8947c6ff8574f3d28a00",
    1,
    0,
    [],
  ],
  "DRY_LAND/16/2": [
    "aa2603cb65f9210152cd1f927d55515d81081f8237a6804f11c4b1bdb63b5ace",
    1,
    15,
    [{ x: 13, y: 10 }],
  ],
  "PANGEA/16/6": [
    "f7cb8a21cc9e15cb6ba18996bd49dd3c7aeabe49b1c5c2494fd041f69002fc3d",
    1,
    9,
    [],
  ],
  "LAKES/20/8": [
    "9a01ed02be91816efaa0868b4402f479a0be57ca795d5666fb22e3293e0472e6",
    1,
    17,
    [{ x: 8, y: 10 }],
  ],
  "CONTINENTS/20/7": [
    "f4a1da3435f3be65ca0e4ec28248487a76ddef74ecd37847b6b7cbd6d3233c1a",
    1,
    12,
    [],
  ],
  "ARCHIPELAGO/25/8": [
    "3efbc13bd4644e9cb93202c3e1186dd2bd1f429d22f9affe0395717b4e6d2111",
    1,
    15,
    [],
  ],
};
