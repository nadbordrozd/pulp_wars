import { describe, expect, it } from "vitest";
import {
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  isActivePortV7,
  isDockShutV7,
  isOpenPortV7,
  parseGameStateV7,
  previewColdSnapV7,
  queryPlayerCommandsV7,
  seaLinksV7,
  tileAtV7,
  viewForV7,
  type CityId,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import { holeLinkWorldV7 } from "../fixtures/v7-fishing-hole-links";
import { frozenArenaV7, iceEntryV7 } from "../fixtures/v7-frozen-sea";
import {
  acceptV7,
  navalArenaV7,
  navalUnitAtV7,
  rejectV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// Freezes ice docks (`pulp_wars-jjzz`, ruleset 7r141; the user, 2026-11-16:
// "I want the freezing effect to freeze water tiles even if they have a port
// on them"; docs/product/RULESET_7_CURRENT.md section 21). An enemy's empty
// Port or Shipyard under any freeze becomes the freezer's ice under the Rime
// and Pack Ice rules of any water (the freezer's own dock never); a ship in
// the dock is Frozen and its tile stays open. The dock is not destroyed: while iced it is shut (no ship
// trained there, nobody boards there, no node of its owner's network and
// no sea-link endpoint) and keeps its population; when the ice is cracked
// it works again. Hand-built states on the authored strait of
// `v7-naval-branch.ts` (rows 0 to 2 and 8 to 10 land, rows 3 and 7 Shallow
// Water, rows 4 to 6 Deep Water; seat 0, the Ice Folk, has its capital on
// (5, 2) and seat 1, the Humans, theirs on (5, 8) with a Port on (6, 7)),
// and on the lane of `v7-fishing-hole-links.ts`. No match is played.

const HUMAN_PORT: CoordV7 = { x: 6, y: 7 };
/** Beside the Human Port, on neutral land outside the Human borders. */
const WITCH: CoordV7 = { x: 7, y: 8 };

const viewOf = (state: GameStateV7, seat: 0 | 1) =>
  viewForV7(state, seatV7(state, seat).id);
const commandsOf = (state: GameStateV7, seat: 0 | 1) =>
  queryPlayerCommandsV7(viewOf(state, seat));
const offered = (state: GameStateV7, seat: 0 | 1, command: CommandV7) =>
  commandsOf(state, seat).some(
    (candidate) => JSON.stringify(candidate) === JSON.stringify(command),
  );
const eventOf = <K extends DomainEventV7["kind"]>(
  events: readonly DomainEventV7[],
  kind: K,
): Extract<DomainEventV7, { kind: K }> | undefined =>
  events.find(
    (event): event is Extract<DomainEventV7, { kind: K }> =>
      event.kind === kind,
  );
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

/** The same position on `seat`'s turn, its cities' actions unspent. */
function turnOf(state: GameStateV7, seat: 0 | 1): GameStateV7 {
  const actor = seatV7(state, seat).id;
  const parsed = parseGameStateV7({
    ...state,
    activeSeatIndex: state.turnOrder.indexOf(actor),
    cities: state.cities.map((city) =>
      city.ownerId === actor ? { ...city, cityActionAvailable: true } : city,
    ),
  });
  if (parsed === null) throw new Error("the turn state is invalid");
  return parsed;
}

/** The population the dock on `at` gives its city. */
function dockPopulation(state: GameStateV7, at: CoordV7): number | undefined {
  return state.populationContributions.find(
    (entry) => entry.source.kind === "IMPROVEMENT" && same(entry.source.at, at),
  )?.amount;
}

function cityAt(state: GameStateV7, at: CoordV7): CityId {
  const city = state.cities.find((candidate) => same(candidate.at, at));
  if (city === undefined) throw new Error("no city");
  return city.id;
}

describe("the identity (pulp_wars-jjzz)", () => {
  it("is 7r141 after 7r140, whose save key is obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r141");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r141.current");
    expect(PRIOR_RULESET_7_IDS.at(-1)).toBe("pulp-wars-poc-7r140");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-1)).toBe(
      "pulpWars.save.v7r140.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });
});

describe("a freeze ices an empty dock", () => {
  const build = (units: Parameters<typeof frozenArenaV7>[0]["units"] = []) =>
    frozenArenaV7({
      factions: ["ICE_FOLK", "ORIGINAL"],
      units: [{ seat: 0, role: "CAPTAIN", at: WITCH }, ...units],
    });

  it("a Cold Snap ices an empty enemy Port: the Port stands, is shut and keeps its population", () => {
    const state = build();
    const human = seatV7(state, 1).id;
    const witch = navalUnitAtV7(state, WITCH);
    expect(isOpenPortV7(state, HUMAN_PORT, human)).toBe(true);
    const population = dockPopulation(state, HUMAN_PORT);
    expect(population).toBeGreaterThan(0);
    const preview = previewColdSnapV7(viewOf(state, 0), witch.id);
    const result = acceptV7(state, 0, { kind: "COLD_SNAP", unitId: witch.id });
    const after = result.state;
    // The Port's water is the Witch's ice; the building stands.
    expect(iceEntryV7(after, HUMAN_PORT)?.ownerId).toBe(seatV7(after, 0).id);
    expect(tileAtV7(after.board, HUMAN_PORT)?.improvement).toBe("PORT");
    // Shut, not blockaded: its population is kept.
    expect(isDockShutV7(after, HUMAN_PORT)).toBe(true);
    expect(isActivePortV7(after, HUMAN_PORT, human)).toBe(true);
    expect(isOpenPortV7(after, HUMAN_PORT, human)).toBe(false);
    expect(dockPopulation(after, HUMAN_PORT)).toBe(population);
    const tiles = eventOf(result.events, "TILES_FROZEN")?.tiles ?? [];
    expect(tiles.some((at) => same(at, HUMAN_PORT))).toBe(true);
    // The public preview is the result.
    expect(preview?.tiles).toEqual(tiles);
    // The shut dock is public: the Humans' own view sees the ice on it.
    expect(
      viewOf(after, 1).ice.some((entry) => same(entry.at, HUMAN_PORT)),
    ).toBe(true);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(after)))).toEqual(after);
  });

  it("a Port with a ship in it stays open water and the ship is Frozen", () => {
    const state = build([{ seat: 1, role: "PATROL_BOAT", at: HUMAN_PORT }]);
    const human = seatV7(state, 1).id;
    const witch = navalUnitAtV7(state, WITCH);
    const boat = navalUnitAtV7(state, HUMAN_PORT);
    const result = acceptV7(state, 0, { kind: "COLD_SNAP", unitId: witch.id });
    const after = result.state;
    expect(iceEntryV7(after, HUMAN_PORT)).toBeUndefined();
    expect(isDockShutV7(after, HUMAN_PORT)).toBe(false);
    expect(isOpenPortV7(after, HUMAN_PORT, human)).toBe(true);
    expect(after.frozen).toContainEqual({ unitId: boat.id, turnsLeft: 1 });
    const tiles = eventOf(result.events, "TILES_FROZEN")?.tiles ?? [];
    expect(tiles.some((at) => same(at, HUMAN_PORT))).toBe(false);
  });

  it("a freeze without Rime leaves the dock open, as any water", () => {
    const state = frozenArenaV7({
      factions: ["ICE_FOLK", "ORIGINAL"],
      technologies: [[], ["SHORECRAFT"]],
      units: [
        { seat: 0, role: "CAPTAIN", at: WITCH },
        { seat: 1, role: "FIGHTER", at: { x: 7, y: 9 } },
      ],
    });
    const result = acceptV7(state, 0, {
      kind: "COLD_SNAP",
      unitId: navalUnitAtV7(state, WITCH).id,
    });
    expect(iceEntryV7(result.state, HUMAN_PORT)).toBeUndefined();
  });
});

describe("the freezer's own dock is never iced", () => {
  // Seat 0 (the Ice Folk) holds the Port on (4, 3) in its own borders, as
  // a dock it captured: no freeze of its own ices it, so it stays an open
  // endpoint of its links (`pulp_wars-dy2b` decision 2).
  const OWN_PORT: CoordV7 = { x: 4, y: 3 };

  it("the border freeze ices the border water but not the own Port", () => {
    const state = navalArenaV7({
      factions: ["ICE_FOLK", "ORIGINAL"],
      technologies: [["SHORECRAFT"], ["SHORECRAFT"]],
      units: [],
      startingFreeze: true,
    });
    const ice = seatV7(state, 0).id;
    expect(
      state.ice.filter((entry) => entry.ownerId === ice).map((e) => e.at),
    ).toEqual([
      { x: 5, y: 3 },
      { x: 6, y: 3 },
    ]);
    expect(iceEntryV7(state, OWN_PORT)).toBeUndefined();
    expect(isOpenPortV7(state, OWN_PORT, ice)).toBe(true);
  });

  it("a Cold Snap beside the own Port ices the water round it and leaves the Port open", () => {
    // The Witch on (3, 2), neutral land: her ring holds (2, 3) and (3, 3)
    // open water and the own Port (4, 3).
    const state = frozenArenaV7({
      factions: ["ICE_FOLK", "ORIGINAL"],
      units: [{ seat: 0, role: "CAPTAIN", at: { x: 3, y: 2 } }],
    });
    const ice = seatV7(state, 0).id;
    const witch = navalUnitAtV7(state, { x: 3, y: 2 });
    const preview = previewColdSnapV7(viewOf(state, 0), witch.id);
    const result = acceptV7(state, 0, { kind: "COLD_SNAP", unitId: witch.id });
    expect(iceEntryV7(result.state, { x: 3, y: 3 })?.ownerId).toBe(ice);
    expect(iceEntryV7(result.state, OWN_PORT)).toBeUndefined();
    expect(isOpenPortV7(result.state, OWN_PORT, ice)).toBe(true);
    const tiles = eventOf(result.events, "TILES_FROZEN")?.tiles ?? [];
    expect(tiles).toEqual([
      { x: 2, y: 3 },
      { x: 3, y: 3 },
    ]);
    expect(preview?.tiles).toEqual(tiles);
  });
});

describe("a shut dock", () => {
  // The Humans' Port iced over by the Ice Folk; their Fighter on the
  // capital (5, 8) is beside it.
  const iced = () =>
    turnOf(
      frozenArenaV7({
        factions: ["ICE_FOLK", "ORIGINAL"],
        units: [{ seat: 0, role: "FIGHTER", at: { x: 7, y: 7 } }],
        ice: [{ at: HUMAN_PORT }],
      }),
      1,
    );
  const train = (state: GameStateV7): CommandV7 => ({
    kind: "TRAIN_NAVAL",
    cityId: cityAt(state, { x: 5, y: 8 }),
    at: HUMAN_PORT,
    role: "PATROL_BOAT",
  });

  it("trains no ship, takes no boarder, and is no node of its owner's network", () => {
    const state = iced();
    const human = seatV7(state, 1).id;
    expect(isDockShutV7(state, HUMAN_PORT)).toBe(true);
    expect(offered(state, 1, train(state))).toBe(false);
    expect(rejectV7(state, 1, train(state))).toEqual({
      code: "INVALID_TILE",
      params: { action: "TRAIN_NAVAL" },
    });
    // The Fighter on the capital cannot step onto the iced dock to board.
    const fighter = navalUnitAtV7(state, { x: 5, y: 8 });
    const board: CommandV7 = {
      kind: "MOVE",
      unitId: fighter.id,
      path: [HUMAN_PORT],
    };
    expect(offered(state, 1, board)).toBe(false);
    expect(rejectV7(state, 1, board).code).not.toBe("");
    // No node: the view's network leaves the dock out, as the engine does.
    const view = viewOf(state, 1);
    expect(view.naval.networkRoads.some((at) => same(at, HUMAN_PORT))).toBe(
      false,
    );
    expect(isOpenPortV7(state, HUMAN_PORT, human)).toBe(false);
    // Its status is still active (no blockade).
    expect(
      view.naval.ownedPorts.find((port) => same(port.at, HUMAN_PORT))?.status,
    ).toBe("ACTIVE");
    // The board marks it "Iced Port" with the shut (blockaded) symbol.
    const plan = buildBoardRenderPlanV7(view, [], {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    });
    expect(plan.entries).toContainEqual(
      expect.objectContaining({
        kind: "STATUS",
        at: HUMAN_PORT,
        statusId: "ui-status-port-blockaded",
        label: "Iced Port",
      }),
    );
  });

  it("an Ice Folk walker may stand on it like any ice, and it is no blockade", () => {
    const state = turnOf(iced(), 0);
    const yeti = navalUnitAtV7(state, { x: 7, y: 7 });
    const population = dockPopulation(state, HUMAN_PORT);
    const moved = acceptV7(state, 0, {
      kind: "MOVE",
      unitId: yeti.id,
      path: [HUMAN_PORT],
    }).state;
    expect(navalUnitAtV7(moved, HUMAN_PORT)).toMatchObject({
      id: yeti.id,
      form: "LAND",
    });
    expect(isActivePortV7(moved, HUMAN_PORT, seatV7(moved, 1).id)).toBe(true);
    expect(dockPopulation(moved, HUMAN_PORT)).toBe(population);
  });

  it("works again once the ice is cracked: the Crack is offered and a ship trains there", () => {
    const state = iced();
    const fighter = navalUnitAtV7(state, { x: 5, y: 8 });
    const crack: CommandV7 = {
      kind: "CRACK_ICE",
      unitId: fighter.id,
      at: HUMAN_PORT,
    };
    expect(offered(state, 1, crack)).toBe(true);
    const cracked = acceptV7(state, 1, crack);
    expect(eventOf(cracked.events, "ICE_CRACKED")).toMatchObject({
      at: HUMAN_PORT,
    });
    const open = cracked.state;
    expect(iceEntryV7(open, HUMAN_PORT)).toBeUndefined();
    expect(isDockShutV7(open, HUMAN_PORT)).toBe(false);
    expect(isOpenPortV7(open, HUMAN_PORT, seatV7(open, 1).id)).toBe(true);
    expect(tileAtV7(open.board, HUMAN_PORT)?.improvement).toBe("PORT");
    expect(offered(open, 1, train(open))).toBe(true);
    const trained = acceptV7(open, 1, train(open)).state;
    expect(navalUnitAtV7(trained, HUMAN_PORT)).toMatchObject({
      role: "PATROL_BOAT",
      ownerId: seatV7(trained, 1).id,
    });
  });
});

describe("a shut dock ends no sea link", () => {
  // The lane of `v7-fishing-hole-links.ts` held by a Human seat: its
  // capital (1, 1) with a Port on (2, 1) and its second city (8, 1) with a
  // Port on (7, 1), five water steps apart (a sea link with Shorecraft).
  // Seat 1 is the Ice Folk, with Rime, and its Ice Witch stands on (7, 2)
  // beside the second Port; a Human Fighter on (7, 0) is beside it too,
  // out of her ring.
  const SECOND_PORT: CoordV7 = { x: 7, y: 1 };
  const build = (): GameStateV7 => {
    const world = holeLinkWorldV7({
      faction: "ORIGINAL",
      rivalFaction: "ICE_FOLK",
      levelTwo: true,
      improvements: [
        { at: { x: 2, y: 1 }, improvement: "PORT" },
        { at: SECOND_PORT, improvement: "PORT" },
      ],
      extraUnits: [
        { seat: 1, role: "CAPTAIN", at: { x: 7, y: 2 } },
        { seat: 0, role: "FIGHTER", at: { x: 7, y: 0 } },
      ],
    });
    const ice = seatV7(world, 1).id;
    const parsed = parseGameStateV7({
      ...world,
      players: world.players.map((player) =>
        player.id === ice
          ? { ...player, researchedTechs: ["SHORECRAFT"] }
          : player,
      ),
    });
    if (parsed === null) throw new Error("the lane state is invalid");
    return parsed;
  };
  const population = (state: GameStateV7): readonly number[] =>
    [
      { x: 1, y: 1 },
      { x: 8, y: 1 },
    ].map(
      (at) => state.cities.find((city) => same(city.at, at))?.population ?? -1,
    );

  it("cuts the link at once when the Port is iced over, and restores it when the ice is cracked", () => {
    const state = turnOf(build(), 1);
    const human = seatV7(state, 0).id;
    expect(seaLinksV7(state, human)).toHaveLength(1);
    const before = population(state);
    const witch = navalUnitAtV7(state, { x: 7, y: 2 });
    const snapped = acceptV7(state, 1, {
      kind: "COLD_SNAP",
      unitId: witch.id,
    });
    const shut = snapped.state;
    expect(isDockShutV7(shut, SECOND_PORT)).toBe(true);
    expect(seaLinksV7(shut, human)).toEqual([]);
    // The live economy is read again: each city loses its link.
    expect(population(shut)).toEqual(before.map((value) => value - 1));
    expect(
      snapped.events.some((event) => event.kind === "CITY_ECONOMY_CHANGED"),
    ).toBe(true);
    // The Humans crack it open again from (7, 0).
    const fighter = navalUnitAtV7(shut, { x: 7, y: 0 });
    const cracked = acceptV7(turnOf(shut, 0), 0, {
      kind: "CRACK_ICE",
      unitId: fighter.id,
      at: SECOND_PORT,
    }).state;
    expect(isDockShutV7(cracked, SECOND_PORT)).toBe(false);
    expect(seaLinksV7(cracked, human)).toHaveLength(1);
    expect(population(cracked)).toEqual(before);
  });
});
