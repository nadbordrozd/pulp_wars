import { describe, expect, it } from "vitest";
import {
  parseEventV7,
  parseGameStateV7,
  parsePlayerEventEnvelopeV7,
  projectEventsV7,
  unitIsIceboundV7,
  viewForV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import { landGrantIceTilesV7 } from "../../src/ai/v7-frozen-sea";
import {
  frozenArenaV7,
  iceEntryV7,
  type FrozenArenaOptionsV7,
} from "../fixtures/v7-frozen-sea";
import {
  acceptV7,
  navalUnitAtV7,
  navalUnitV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// The border freeze (`pulp_wars-5ti.31`; the user, 2026-10-24: "when doing
// land grant and city boundaries expand any water within city boundaries
// (including water within the original boundaries) should get covered with
// ice IF you have the relevant technology"). On the authored strait (rows 0
// to 2 and 8 to 10 land, rows 3 and 7 Shallow Water, rows 4 to 6 Deep
// Water): seat 0's capital on (5, 2) holds x 4 to 6, y 1 to 3, with its
// Port on (4, 3); a Land Grant adds x 3 to 7, y 0 to 4. Seat 0 is the Ice
// Folk, seat 1 the Humans.

const CAPITAL: CoordV7 = { x: 5, y: 2 };
const PLANNING: readonly TechnologyIdV7[] = [
  "GATHERING",
  "ADMINISTRATION",
  "PLANNING",
];
const RIME: readonly TechnologyIdV7[] = ["SHORECRAFT", ...PLANNING];
const PACK_ICE: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  ...PLANNING,
];
const ICEBOUND: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  ...PLANNING,
];
const HUMAN: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
  "SUBMERSIBLES",
];
const row = (y: number, x0: number, x1: number): CoordV7[] =>
  Array.from({ length: x1 - x0 + 1 }, (_, index) => ({ x: x0 + index, y }));

/** The arena with seat 0's capital at level 3 (a Land Grant needs it). */
const scene = (
  technologies: readonly TechnologyIdV7[],
  extra: Partial<FrozenArenaOptionsV7> = {},
): GameStateV7 =>
  frozenArenaV7({
    technologies: [technologies, HUMAN],
    units: [],
    levelThree: [true, false],
    ...extra,
  });
const capitalOf = (state: GameStateV7) => {
  const city = state.cities.find(
    (candidate) => candidate.at.x === CAPITAL.x && candidate.at.y === CAPITAL.y,
  );
  if (city === undefined) throw new Error("no capital");
  return city;
};
const grant = (state: GameStateV7) =>
  acceptV7(state, 0, { kind: "LAND_GRANT", cityId: capitalOf(state).id });
const frozenEvents = (events: readonly DomainEventV7[]) =>
  events.filter((event) => event.kind === "WATER_FROZEN");
const iceTiles = (state: GameStateV7): CoordV7[] =>
  state.ice.map((entry) => entry.at);

describe("the border freeze on a Land Grant", () => {
  it("with Rime, every Shallow Water tile of the grown territory freezes, the old ones and the Port included; Deep Water waits for Pack Ice", () => {
    const state = scene(RIME);
    const owner = seatV7(state, 0).id;
    expect(state.ice).toEqual([]);
    const result = grant(state);
    const shallow = row(3, 3, 7);
    expect(iceTiles(result.state)).toEqual(shallow);
    for (const entry of result.state.ice)
      expect(entry).toMatchObject({ ownerId: owner, cracked: false });
    // The old footprint's water (4, 3) to (6, 3) froze with the new.
    expect(iceEntryV7(result.state, { x: 5, y: 3 })).toBeDefined();
    // The Port is an Ice Harbour now; its improvement stays.
    expect(
      result.state.board.tiles.find(
        (tile) => tile.at.x === 4 && tile.at.y === 3,
      )?.improvement,
    ).toBe("PORT");
    // Every frozen tile is the city's own territory.
    const city = capitalOf(state).id;
    for (const at of iceTiles(result.state))
      expect(
        result.state.board.tiles.find(
          (tile) => tile.at.x === at.x && tile.at.y === at.y,
        )?.territoryCityId,
      ).toBe(city);
    const events = frozenEvents(result.events);
    expect(events).toEqual([
      {
        kind: "WATER_FROZEN",
        playerId: owner,
        unitId: null,
        tiles: shallow,
        icebound: [],
      },
    ]);
    expect(parseEventV7(events[0]).ok).toBe(true);
    // Right after the grant (and its reveal, none here).
    const kinds = result.events.map((event) => event.kind);
    expect(kinds.indexOf("WATER_FROZEN")).toBe(
      kinds.indexOf("LAND_GRANTED") + 1,
    );
  });

  it("with Pack Ice the Deep Water of the territory freezes too", () => {
    const result = grant(scene(PACK_ICE));
    expect(iceTiles(result.state)).toEqual([...row(3, 3, 7), ...row(4, 3, 7)]);
  });

  it("without Rime nothing freezes and no WATER_FROZEN is emitted", () => {
    const result = grant(scene(PLANNING));
    expect(result.state.ice).toEqual([]);
    expect(frozenEvents(result.events)).toEqual([]);
  });

  it("a seat of another faction never freezes on a grant", () => {
    const result = grant(scene(RIME, { factions: ["ORIGINAL", "ICE_FOLK"] }));
    expect(result.state.ice).toEqual([]);
    expect(frozenEvents(result.events)).toEqual([]);
  });

  it("follows the Freeze rule tile by tile: a hostile ship is locked in with Icebound and left without; another seat's ice is taken; own sound ice is passed over", () => {
    const options: Partial<FrozenArenaOptionsV7> = {
      units: [{ seat: 1, role: "PATROL_BOAT", at: { x: 7, y: 3 } }],
      ice: [{ at: { x: 3, y: 3 }, seat: 1 }, { at: { x: 5, y: 3 } }],
    };
    const owner = (state: GameStateV7) => seatV7(state, 0).id;

    const plain = scene(PACK_ICE, options);
    const boat = navalUnitAtV7(plain, { x: 7, y: 3 });
    const left = grant(plain);
    // The ship's tile stays open water; the rest freezes around it.
    expect(iceEntryV7(left.state, { x: 7, y: 3 })).toBeUndefined();
    expect(iceEntryV7(left.state, { x: 3, y: 3 })).toEqual({
      at: { x: 3, y: 3 },
      ownerId: owner(plain),
      cracked: false,
    });
    const [event] = frozenEvents(left.events);
    expect(event).toMatchObject({ unitId: null, icebound: [] });
    if (event?.kind !== "WATER_FROZEN") throw new Error("no freeze");
    // Own sound ice is not in the set; another seat's taken ice is.
    expect(event.tiles).not.toContainEqual({ x: 5, y: 3 });
    expect(event.tiles).toContainEqual({ x: 3, y: 3 });

    const locked = grant(scene(ICEBOUND, options));
    expect(iceEntryV7(locked.state, { x: 7, y: 3 })).toMatchObject({
      ownerId: owner(plain),
    });
    expect(frozenEvents(locked.events)[0]).toMatchObject({
      icebound: [boat.id],
    });
    expect(
      unitIsIceboundV7(locked.state, navalUnitV7(locked.state, boat.id)),
    ).toBe(true);
  });

  it("the event is projected to the other seat on the tiles it explored, with no unit", () => {
    const state = scene(RIME);
    const result = grant(state);
    const other = seatV7(state, 1).id;
    const envelope = projectEventsV7(state, result.state, other, result.events);
    expect(parsePlayerEventEnvelopeV7(envelope).ok).toBe(true);
    const projected = envelope.events.filter(
      (event) => event.kind === "WATER_FROZEN",
    );
    expect(projected).toEqual([
      {
        kind: "WATER_FROZEN",
        playerId: seatV7(state, 0).id,
        unitId: null,
        tiles: row(3, 3, 7),
        icebound: [],
      },
    ]);
  });
});

describe("the border freeze on research", () => {
  it("researching Rime freezes the water of every own city's territory at once", () => {
    const state = scene(PLANNING);
    const result = acceptV7(state, 0, { kind: "RESEARCH", tech: "SHORECRAFT" });
    expect(iceTiles(result.state)).toEqual(row(3, 4, 6));
    expect(frozenEvents(result.events)).toEqual([
      {
        kind: "WATER_FROZEN",
        playerId: seatV7(state, 0).id,
        unitId: null,
        tiles: row(3, 4, 6),
        icebound: [],
      },
    ]);
    // Pack Ice then freezes nothing more: the footprint has no Deep Water.
    const deep = acceptV7(result.state, 0, {
      kind: "RESEARCH",
      tech: "NAVIGATION",
    });
    expect(frozenEvents(deep.events)).toEqual([]);
    expect(deep.state.ice).toEqual(result.state.ice);
  });

  it("a technology that does not change the freeze freezes nothing", () => {
    const state = scene(RIME);
    const result = acceptV7(state, 0, { kind: "RESEARCH", tech: "FARMING" });
    expect(result.state.ice).toEqual([]);
    expect(frozenEvents(result.events)).toEqual([]);
  });
});

describe("the border freeze on a capture", () => {
  it("an Ice Folk seat with Rime that takes a city freezes the water of its territory, its Port included", () => {
    const base = frozenArenaV7({
      factions: ["ICE_FOLK", "ORIGINAL"],
      technologies: [RIME, HUMAN],
      third: { faction: "GOBLIN" },
      units: [{ seat: 0, role: "FIGHTER", at: { x: 4, y: 9 } }],
    });
    const capital = { x: 5, y: 8 };
    const guard = navalUnitAtV7(base, capital);
    const captor = navalUnitAtV7(base, { x: 4, y: 9 });
    const parsed = parseGameStateV7({
      ...base,
      units: base.units
        .filter((unit) => unit.id !== guard.id)
        .map((unit) =>
          unit.id === captor.id
            ? { ...unit, at: capital, captureEligible: true }
            : unit,
        ),
    });
    if (parsed === null) throw new Error("the capture scene is invalid");
    const result = acceptV7(parsed, 0, { kind: "CAPTURE", unitId: captor.id });
    const owner = seatV7(base, 0).id;
    expect(iceTiles(result.state)).toEqual(row(7, 4, 6));
    expect(frozenEvents(result.events)).toEqual([
      {
        kind: "WATER_FROZEN",
        playerId: owner,
        unitId: null,
        tiles: row(7, 4, 6),
        icebound: [],
      },
    ]);
    expect(parseGameStateV7(result.state)).not.toBeNull();
  });
});

describe("the Normal AI values a grant's ice", () => {
  it("counts the freezable water a grant would freeze, only for a seat with Rime", () => {
    const rime = scene(RIME);
    const city = capitalOf(rime);
    expect(
      landGrantIceTilesV7(
        viewForV7(rime, seatV7(rime, 0).id),
        city.id,
        city.at,
      ),
    ).toBe(5);
    const deep = scene(PACK_ICE);
    expect(
      landGrantIceTilesV7(
        viewForV7(deep, seatV7(deep, 0).id),
        city.id,
        city.at,
      ),
    ).toBe(10);
    const none = scene(PLANNING);
    expect(
      landGrantIceTilesV7(
        viewForV7(none, seatV7(none, 0).id),
        city.id,
        city.at,
      ),
    ).toBe(0);
  });
});
