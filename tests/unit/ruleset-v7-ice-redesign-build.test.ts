import { describe, expect, it } from "vitest";
import {
  parseEventV7,
  parseGameStateV7,
  queryPlayerCommandsV7,
  spatialContributionAtV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import {
  frozenArenaV7,
  frozenStateV7,
  iceEntryV7,
  type FrozenArenaOptionsV7,
  type FrozenIceV7,
} from "../fixtures/v7-frozen-sea";
import {
  acceptV7,
  navalArenaV7,
  navalUnitAtV7,
  navalUnitV7,
  rejectV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// The frozen sea redesign (`pulp_wars-5ti.25`,
// docs/product/RULESET_7_ICE_REDESIGN.md section 2.6): the Ice Folk build on
// their ice. On the authored strait (rows 0 to 2 land, row 3 Shallow Water,
// rows 4 to 6 Deep Water): seat 0's capital on (5, 2) has the 3 x 3 footprint
// x 4 to 6, y 1 to 3, so (4, 3), (5, 3), and (6, 3) are its Shallow Water.
// Seat 0 is the Ice Folk unless a test says otherwise.

const RIME: readonly TechnologyIdV7[] = ["SHORECRAFT"];
const ICEBOUND: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
];
const MILLING: readonly TechnologyIdV7[] = [
  ...RIME,
  "GATHERING",
  "FARMING",
  "MILLING",
];
const WEST: CoordV7 = { x: 4, y: 3 };
const MIDDLE: CoordV7 = { x: 5, y: 3 };
const EAST: CoordV7 = { x: 6, y: 3 };

const scene = (
  technologies: readonly TechnologyIdV7[],
  ice: readonly (CoordV7 | FrozenIceV7)[],
  extra: Partial<FrozenArenaOptionsV7> = {},
): GameStateV7 =>
  frozenArenaV7({
    ports: [false, true],
    technologies: [technologies, RIME],
    units: [],
    ice: ice.map((entry): FrozenIceV7 =>
      "at" in entry ? entry : { at: entry },
    ),
    ...extra,
  });
const offered = (state: GameStateV7, seat: 0 | 1 = 0) =>
  queryPlayerCommandsV7(viewForV7(state, seatV7(state, seat).id));
const at = (kind: CommandV7["kind"], tile: CoordV7): CommandV7 =>
  ({ kind, at: tile }) as CommandV7;
const isOffered = (state: GameStateV7, command: CommandV7): boolean =>
  offered(state).some(
    (candidate) => JSON.stringify(candidate) === JSON.stringify(command),
  );
const tileOf = (state: GameStateV7, tile: CoordV7) =>
  state.board.tiles.find(
    (candidate) => candidate.at.x === tile.x && candidate.at.y === tile.y,
  );
const built = (events: readonly DomainEventV7[]) =>
  events.find((event) => event.kind === "ECONOMIC_BUILDING_BUILT");
const cityPopulation = (state: GameStateV7): number =>
  state.cities.find((city) => city.ownerId === seatV7(state, 0).id)
    ?.economicPopulation ?? -1;

describe("the Ice Harbour and the Great Harbour (section 2.6)", () => {
  it("an Ice Harbour on open Shallow Water freezes its tile first", () => {
    const state = scene(RIME, []);
    const port = at("BUILD_PORT", MIDDLE);
    expect(isOffered(state, port)).toBe(true);
    const result = acceptV7(state, 0, port);
    expect(result.events[0]).toEqual({
      kind: "PORT_BUILT",
      playerId: seatV7(state, 0).id,
      cityId: tileOf(state, MIDDLE)?.territoryCityId,
      at: MIDDLE,
      cost: 4,
      populationAdded: 1,
      iceMade: true,
    });
    expect(parseEventV7(result.events[0]).ok).toBe(true);
    expect(iceEntryV7(result.state, MIDDLE)).toEqual({
      at: MIDDLE,
      ownerId: seatV7(state, 0).id,
      cracked: false,
    });
    expect(tileOf(result.state, MIDDLE)?.improvement).toBe("PORT");
    expect(cityPopulation(result.state)).toBe(cityPopulation(state) + 1);
    // The capital's Yeti may stand on its dock: it is ice.
    const yeti = navalUnitAtV7(result.state, { x: 5, y: 2 });
    expect(
      offered(result.state).some(
        (command) =>
          command.kind === "MOVE" &&
          command.unitId === yeti.id &&
          command.path.at(-1)?.x === MIDDLE.x &&
          command.path.at(-1)?.y === MIDDLE.y,
      ),
    ).toBe(true);
    const onDock = acceptV7(result.state, 0, {
      kind: "MOVE",
      unitId: yeti.id,
      path: [MIDDLE],
    });
    expect(navalUnitV7(onDock.state, yeti.id)).toMatchObject({
      at: MIDDLE,
      form: "LAND",
    });
  });

  it("an Ice Harbour on the seat's own ice keeps the ice, Shallow or Deep; never on another seat's ice", () => {
    const own = scene(RIME, [MIDDLE, { at: EAST, seat: 1 }]);
    const result = acceptV7(own, 0, at("BUILD_PORT", MIDDLE));
    expect(result.events[0]).toMatchObject({
      kind: "PORT_BUILT",
      iceMade: false,
    });
    expect(result.state.ice).toEqual(own.ice);
    // Another seat's ice is Frozen first.
    expect(isOffered(own, at("BUILD_PORT", EAST))).toBe(false);
    expect(rejectV7(own, 0, at("BUILD_PORT", EAST))).toEqual({
      code: "INVALID_TILE",
      params: { action: "BUILD_PORT" },
    });
    // Deep Water in the footprint: a strait whose (4, 2) is water, so (4, 3)
    // is Deep and touches the capital's land diagonally.
    const terrain = [
      "...........",
      "...........",
      "....~......",
      "~~~~~~~~~~~",
      "~~~~~~~~~~~",
      "~~~~~~~~~.~",
      "~~~~~~~~~~~",
      "~~~~~~~~~~~",
      "...........",
      "...........",
      "...........",
    ];
    const strait = navalArenaV7({
      factions: ["ICE_FOLK", "ORIGINAL"],
      technologies: [[...RIME, "NAVIGATION"], RIME],
      ports: [false, true],
      terrain,
      units: [],
    });
    expect(tileOf(strait, WEST)?.terrain).toBe("DEEP_WATER");
    // Open Deep Water: no dock.
    expect(isOffered(strait, at("BUILD_PORT", WEST))).toBe(false);
    const deep = frozenStateV7(strait, [{ at: WEST }]);
    expect(isOffered(deep, at("BUILD_PORT", WEST))).toBe(true);
    const harbour = acceptV7(deep, 0, at("BUILD_PORT", WEST));
    expect(tileOf(harbour.state, WEST)?.improvement).toBe("PORT");
    expect(parseGameStateV7(harbour.state)).not.toBeNull();
  });

  it("the Great Harbour upgrades an Ice Harbour on ice", () => {
    const state = acceptV7(
      scene(ICEBOUND, []),
      0,
      at("BUILD_PORT", MIDDLE),
    ).state;
    const upgrade = at("BUILD_SHIPYARD", MIDDLE);
    expect(isOffered(state, upgrade)).toBe(true);
    const result = acceptV7(state, 0, upgrade);
    expect(tileOf(result.state, MIDDLE)?.improvement).toBe("SHIPYARD");
    expect(iceEntryV7(result.state, MIDDLE)).toBeDefined();
  });

  it("no other seat builds a Port on ice, and no ship trains or embarks at a dock on ice", () => {
    // A Human seat whose Port stands on its own ice (a captured harbour).
    const state = frozenArenaV7({
      factions: ["ORIGINAL", "ICE_FOLK"],
      technologies: [["SHORECRAFT"], RIME],
      units: [{ seat: 0, role: "FIGHTER", at: { x: 4, y: 2 } }],
      ice: [
        { at: WEST, seat: 0 },
        { at: MIDDLE, seat: 0 },
      ],
    });
    expect(tileOf(state, WEST)?.improvement).toBe("PORT");
    expect(isOffered(state, at("BUILD_PORT", MIDDLE))).toBe(false);
    expect(rejectV7(state, 0, at("BUILD_PORT", MIDDLE)).code).toBe(
      "INVALID_TILE",
    );
    expect(
      offered(state).some((command) => command.kind === "TRAIN_NAVAL"),
    ).toBe(false);
    // A Fighter that steps onto the dock walks onto ice: it stays ashore.
    const fighter = navalUnitAtV7(state, { x: 4, y: 2 });
    const stepped = acceptV7(state, 0, {
      kind: "MOVE",
      unitId: fighter.id,
      path: [WEST],
    });
    expect(navalUnitV7(stepped.state, fighter.id)).toMatchObject({
      at: WEST,
      form: "LAND",
    });
  });

  it("a hostile land unit on an Ice Harbour blockades it, and may Pillage it", () => {
    const state = frozenArenaV7({
      factions: ["ICE_FOLK", "ORIGINAL"],
      technologies: [RIME, ["SCOUTING", "RAIDING"]],
      units: [{ seat: 1, role: "FIGHTER", at: { x: 3, y: 3 } }],
      ice: [WEST, { x: 3, y: 3 }].map((tile) => ({ at: tile })),
    });
    expect(tileOf(state, WEST)?.improvement).toBe("PORT");
    const before = cityPopulation(state);
    const theirs = acceptV7(state, 0, { kind: "END_TURN" }).state;
    const raider = navalUnitAtV7(theirs, { x: 3, y: 3 });
    const blockade = acceptV7(theirs, 1, {
      kind: "MOVE",
      unitId: raider.id,
      path: [WEST],
    });
    expect(blockade.events).toContainEqual(
      expect.objectContaining({
        kind: "PORT_BLOCKADE_CHANGED",
        at: WEST,
        activeBefore: true,
        activeAfter: false,
      }),
    );
    expect(cityPopulation(blockade.state)).toBe(before - 1);
    expect(
      viewForV7(blockade.state, seatV7(state, 0).id).naval.ownedPorts,
    ).toContainEqual(
      expect.objectContaining({ at: WEST, status: "BLOCKADED" }),
    );
    // The next turn it Pillages the harbour; the ice stays.
    const later = acceptV7(
      acceptV7(blockade.state, 1, { kind: "END_TURN" }).state,
      0,
      { kind: "END_TURN" },
    ).state;
    const pillaged = acceptV7(later, 1, { kind: "PILLAGE", unitId: raider.id });
    expect(tileOf(pillaged.state, WEST)?.improvement).toBeNull();
    expect(iceEntryV7(pillaged.state, WEST)).toBeDefined();
  });

  it("a hostile ship locked on an own dock by a Freeze no longer blockades it", () => {
    const state = frozenArenaV7({
      technologies: [ICEBOUND, RIME],
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 2 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 3 } },
      ],
    });
    const before = cityPopulation(state);
    // The Human boat sails onto the Port and blockades it.
    const boat = navalUnitAtV7(state, { x: 3, y: 3 });
    const sailed = acceptV7(acceptV7(state, 0, { kind: "END_TURN" }).state, 1, {
      kind: "MOVE",
      unitId: boat.id,
      path: [WEST],
    }).state;
    const mine = acceptV7(sailed, 1, { kind: "END_TURN" }).state;
    expect(cityPopulation(mine)).toBe(before - 1);
    const yeti = navalUnitAtV7(mine, { x: 4, y: 2 });
    const result = acceptV7(mine, 0, {
      kind: "FREEZE",
      unitId: yeti.id,
      at: WEST,
    });
    expect(result.events[0]).toMatchObject({
      kind: "WATER_FROZEN",
      tiles: [WEST],
      icebound: [boat.id],
    });
    expect(result.events).toContainEqual(
      expect.objectContaining({
        kind: "PORT_BLOCKADE_CHANGED",
        at: WEST,
        activeAfter: true,
      }),
    );
    expect(cityPopulation(result.state)).toBe(before);
    expect(parseGameStateV7(result.state)).not.toBeNull();
  });
});

describe("the Fishing Hole and the buildings on ice (section 2.6)", () => {
  it("a Fishing Hole: 3 Coins, +1 population, on own ice, using up its Fish (7r106)", () => {
    const resources = Array.from({ length: 11 }, (_, y) =>
      y === 3 ? "......s...." : "...........",
    );
    const state = scene(
      RIME,
      [WEST, MIDDLE, EAST, { at: { x: 3, y: 3 }, seat: 1 }],
      {
        resources,
      },
    );
    const hole = at("BUILD_FISHING_HOLE", WEST);
    expect(isOffered(state, hole)).toBe(true);
    const coins = seatV7(state, 0).coins;
    const result = acceptV7(state, 0, hole);
    expect(result.events[0]).toEqual({
      kind: "ECONOMIC_BUILDING_BUILT",
      playerId: seatV7(state, 0).id,
      cityId: tileOf(state, WEST)?.territoryCityId,
      at: WEST,
      improvement: "FISHING_HOLE",
      cost: 3,
      populationContribution: 1,
      marketIncome: 0,
    });
    expect(parseEventV7(result.events[0]).ok).toBe(true);
    expect(seatV7(result.state, 0).coins).toBe(coins - 3);
    expect(cityPopulation(result.state)).toBe(cityPopulation(state) + 1);
    // The ice under it stays and cannot be cracked.
    expect(iceEntryV7(result.state, WEST)).toBeDefined();
    // No limit per city.
    expect(isOffered(result.state, at("BUILD_FISHING_HOLE", MIDDLE))).toBe(
      true,
    );
    // Not on another seat's ice or open water.
    const foreign = { x: 3, y: 3 };
    expect(isOffered(state, at("BUILD_FISHING_HOLE", foreign))).toBe(false);
    expect(rejectV7(state, 0, at("BUILD_FISHING_HOLE", foreign)).code).toBe(
      "INVALID_TILE",
    );
    // Building placement (`pulp_wars-h0xx`, 7r106): the Fish no longer
    // blocks it (before, it had to be harvested first); the Fishing Hole
    // uses it up.
    expect(tileOf(state, EAST)?.resource).toBe("FISH");
    expect(isOffered(state, at("BUILD_FISHING_HOLE", EAST))).toBe(true);
    const onFish = acceptV7(state, 0, at("BUILD_FISHING_HOLE", EAST)).state;
    expect(tileOf(onFish, EAST)).toMatchObject({
      improvement: "FISHING_HOLE",
      resource: null,
    });
    // Without Rime there is no Fishing Hole (and no ice to put it on).
    expect(
      rejectV7(scene([], [WEST], { ports: [false, true] }), 0, hole).code,
    ).toBe("TECH_REQUIRED");
  });

  it("no seat but the Ice Folk builds on ice, even on its own", () => {
    const state = frozenArenaV7({
      factions: ["ORIGINAL", "ICE_FOLK"],
      ports: [false, true],
      technologies: [[...MILLING, "DRILL", "ADMINISTRATION"], RIME],
      units: [],
      ice: [WEST, MIDDLE].map((tile) => ({ at: tile, seat: 0 as const })),
    });
    for (const kind of [
      "BUILD_FISHING_HOLE",
      "BUILD_WINDMILL",
      "BUILD_WORKSHOP",
      "BUILD_MARKET",
    ] as const) {
      expect(isOffered(state, at(kind, WEST)), kind).toBe(false);
      expect(rejectV7(state, 0, at(kind, WEST)).code, kind).toBe(
        "INVALID_TILE",
      );
    }
  });

  it("a Windmill counts Fishing Holes as Farms, across land and ice", () => {
    const holes = (state: GameStateV7): GameStateV7 =>
      acceptV7(
        acceptV7(state, 0, at("BUILD_FISHING_HOLE", WEST)).state,
        0,
        at("BUILD_FISHING_HOLE", MIDDLE),
      ).state;
    // On land, beside two Fishing Holes on the ice.
    const ashore = holes(scene(MILLING, [WEST, MIDDLE]));
    const mill = at("BUILD_WINDMILL", { x: 4, y: 2 });
    expect(isOffered(ashore, mill)).toBe(true);
    expect(built(acceptV7(ashore, 0, mill).events)).toMatchObject({
      improvement: "WINDMILL",
      populationContribution: 2,
    });
    // On the ice, between a Fishing Hole and a Farm ashore.
    const resources = Array.from({ length: 11 }, (_, y) =>
      y === 2 ? "......e...." : "...........",
    );
    const farmed = acceptV7(
      scene(MILLING, [WEST, MIDDLE], {
        resources,
        improvements: [{ at: { x: 6, y: 2 }, improvement: "FARM" }],
      }),
      0,
      at("BUILD_FISHING_HOLE", WEST),
    ).state;
    const onIce = at("BUILD_WINDMILL", MIDDLE);
    expect(isOffered(farmed, onIce)).toBe(true);
    const result = acceptV7(farmed, 0, onIce);
    expect(built(result.events)).toMatchObject({
      improvement: "WINDMILL",
      populationContribution: 2,
    });
    expect(
      spatialContributionAtV7(result.state, MIDDLE, "WINDMILL")
        .contributingTiles,
    ).toEqual([{ x: 6, y: 2 }, WEST]);
    // Without a Farm or Fishing Hole beside it, no Windmill.
    expect(isOffered(scene(MILLING, [EAST]), at("BUILD_WINDMILL", EAST))).toBe(
      false,
    );
  });

  it("a Workshop and a Market on ice count a Fishing Hole as the Farm type and the farm family", () => {
    const base = acceptV7(
      scene(
        [...RIME, "DRILL", "GATHERING", "ADMINISTRATION"],
        [WEST, MIDDLE, EAST],
      ),
      0,
      at("BUILD_FISHING_HOLE", WEST),
    ).state;
    const workshop = acceptV7(base, 0, at("BUILD_WORKSHOP", MIDDLE));
    expect(built(workshop.events)).toMatchObject({
      improvement: "WORKSHOP",
      populationContribution: 2,
    });
    expect(
      spatialContributionAtV7(workshop.state, MIDDLE, "WORKSHOP").distinctTypes,
    ).toEqual(["FARM"]);
    const market = acceptV7(base, 0, at("BUILD_MARKET", MIDDLE));
    expect(built(market.events)).toMatchObject({
      improvement: "MARKET",
      marketIncome: 2,
    });
    expect(
      spatialContributionAtV7(market.state, MIDDLE, "MARKET").distinctFamilies,
    ).toEqual(["AGRICULTURE"]);
  });

  it("a Sawmill and a Forge on ice count the Lumber Camp and the Mine ashore", () => {
    const terrain = [
      "...........",
      "...........",
      "....f.^....",
      "~~~~~~~~~~~",
      "~~~~~~~~~~~",
      "~~~~~~~~~.~",
      "~~~~~~~~~~~",
      "~~~~~~~~~~~",
      "...........",
      "...........",
      "...........",
    ];
    const resources = Array.from({ length: 11 }, (_, y) =>
      y === 2 ? "......o...." : "...........",
    );
    const state = scene(
      [
        ...RIME,
        "HUNTING",
        "FORESTRY",
        "SAWMILLING",
        "DRILL",
        "ENGINEERING",
        "METALLURGY",
      ],
      [WEST, EAST],
      {
        terrain,
        resources,
        improvements: [
          { at: { x: 4, y: 2 }, improvement: "LUMBER_CAMP" },
          { at: { x: 6, y: 2 }, improvement: "MINE" },
        ],
      },
    );
    expect(
      built(acceptV7(state, 0, at("BUILD_SAWMILL", WEST)).events),
    ).toMatchObject({ improvement: "SAWMILL", populationContribution: 1 });
    expect(
      built(acceptV7(state, 0, at("BUILD_FORGE", EAST)).events),
    ).toMatchObject({ improvement: "FORGE", populationContribution: 1 });
  });

  it("a Monument stands on own ice in the territory", () => {
    const state = scene(RIME, [WEST]);
    const monument = offered(state).find(
      (command) =>
        command.kind === "BUILD_MONUMENT" &&
        command.at.x === WEST.x &&
        command.at.y === WEST.y,
    );
    if (monument === undefined) throw new Error("no Monument on the ice");
    const result = acceptV7(state, 0, monument);
    expect(tileOf(result.state, WEST)?.improvement).toBe("MONUMENT");
    // Not on another seat's ice.
    const foreign = scene(RIME, [{ at: WEST, seat: 1 }]);
    expect(
      offered(foreign).some(
        (command) =>
          command.kind === "BUILD_MONUMENT" &&
          command.at.x === WEST.x &&
          command.at.y === WEST.y,
      ),
    ).toBe(false);
  });

  it("every offered build on ice is accepted, and a Redevelop leaves the ice", () => {
    const state = acceptV7(
      scene(
        [...MILLING, "DRILL", "ENGINEERING", "ADMINISTRATION"],
        [WEST, MIDDLE, EAST],
      ),
      0,
      at("BUILD_FISHING_HOLE", WEST),
    ).state;
    const onIce = offered(state).filter(
      (command) =>
        "at" in command &&
        command.kind.startsWith("BUILD_") &&
        iceEntryV7(state, command.at) !== undefined,
    );
    expect(onIce.length).toBeGreaterThan(4);
    for (const command of onIce) acceptV7(state, 0, command);
    const redevelop = at("REDEVELOP", WEST);
    expect(isOffered(state, redevelop)).toBe(true);
    const removed = acceptV7(state, 0, redevelop).state;
    expect(tileOf(removed, WEST)?.improvement).toBeNull();
    expect(iceEntryV7(removed, WEST)).toBeDefined();
  });
});
