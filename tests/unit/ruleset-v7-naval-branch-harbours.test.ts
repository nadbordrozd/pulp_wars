import { describe, expect, it } from "vitest";
import {
  FACTION_IDS_V7,
  dockPopulationV7,
  parseGameStateV7,
  previewEconomicV7,
  viewForV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import {
  NAVAL_ARENA_PORTS_V7,
  NAVAL_TECHS_V7,
  acceptV7,
  navalArenaV7,
  navalUnitAtV7,
  patchNavalUnitV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// The naval branch, engine step I (`pulp_wars-5ti.2`,
// docs/product/RULESET_7_NAVAL_BRANCH.md section 5.4): Harbours. Every
// active Port gives 2 population and every active Shipyard 3 to an owner
// with the capability; a blockaded dock still gives 0.

const BEFORE: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
];

function dockAmount(state: GameStateV7, seat: 0 | 1): number {
  const port = NAVAL_ARENA_PORTS_V7[seat];
  const entry = state.populationContributions.find(
    (candidate) =>
      candidate.source.kind === "IMPROVEMENT" &&
      candidate.source.at.x === port.x &&
      candidate.source.at.y === port.y,
  );
  if (entry === undefined) throw new Error("dock record missing");
  return entry.amount;
}

function cityOf(state: GameStateV7, seat: 0 | 1) {
  const city = state.cities.find(
    (entry) => entry.ownerId === seatV7(state, seat).id,
  );
  if (city === undefined) throw new Error("no city");
  return city;
}

describe("Harbours", () => {
  it("is the one dock formula: Port 1 and Shipyard 2, plus the owner's Harbours", () => {
    expect(dockPopulationV7("PORT", 0)).toBe(1);
    expect(dockPopulationV7("SHIPYARD", 0)).toBe(2);
    expect(dockPopulationV7("PORT", 1)).toBe(2);
    expect(dockPopulationV7("SHIPYARD", 1)).toBe(3);
  });

  it("gives a Port 2 and a Shipyard 3 with Submersibles, 1 and 2 without, for every faction", () => {
    for (const faction of FACTION_IDS_V7) {
      const other: FactionIdV7 = faction === "ORIGINAL" ? "UNDEAD" : "ORIGINAL";
      const state = navalArenaV7({
        factions: [faction, other],
        technologies: [NAVAL_TECHS_V7, BEFORE],
        units: [],
      });
      // Seat 0 has Harbours; seat 1 does not.
      expect(dockAmount(state, 0), faction).toBe(2);
      expect(dockAmount(state, 1), faction).toBe(1);
      const shipyard = acceptV7(state, 0, {
        kind: "BUILD_SHIPYARD",
        at: NAVAL_ARENA_PORTS_V7[0],
      });
      expect(dockAmount(shipyard.state, 0), faction).toBe(3);
      expect(cityOf(shipyard.state, 0).economicPopulation, faction).toBe(
        cityOf(state, 0).economicPopulation + 1,
      );
      expect(parseGameStateV7(shipyard.state)).not.toBeNull();
    }
    const plain = navalArenaV7({
      technologies: [BEFORE, BEFORE],
      units: [],
    });
    expect(
      dockAmount(
        acceptV7(plain, 0, {
          kind: "BUILD_SHIPYARD",
          at: NAVAL_ARENA_PORTS_V7[0],
        }).state,
        0,
      ),
    ).toBe(2);
  });

  it("raises the live population the moment Submersibles is researched", () => {
    const state = navalArenaV7({
      technologies: [BEFORE, BEFORE],
      units: [],
    });
    const city = cityOf(state, 0);
    expect(dockAmount(state, 0)).toBe(1);
    const researched = acceptV7(state, 0, {
      kind: "RESEARCH",
      tech: "SUBMERSIBLES",
    });
    expect(dockAmount(researched.state, 0)).toBe(2);
    expect(dockAmount(researched.state, 1)).toBe(1);
    expect(cityOf(researched.state, 0).economicPopulation).toBe(
      city.economicPopulation + 1,
    );
    expect(researched.events).toContainEqual(
      expect.objectContaining({
        kind: "CITY_ECONOMY_CHANGED",
        cityId: city.id,
      }),
    );
    expect(parseGameStateV7(researched.state)).not.toBeNull();
  });

  it("gives a blockaded dock 0, and its Harbours population back when the blockade lifts", () => {
    const state = navalArenaV7({
      units: [
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
        { seat: 0, role: "PATROL_BOAT", at: { x: 6, y: 4 } },
      ],
    });
    const blockader = navalUnitAtV7(state, { x: 4, y: 5 });
    const mine = navalUnitAtV7(state, { x: 6, y: 4 });
    const passed = acceptV7(state, 0, { kind: "END_TURN" });
    const sailed = acceptV7(passed.state, 1, {
      kind: "MOVE",
      unitId: blockader.id,
      path: [{ x: 4, y: 4 }, NAVAL_ARENA_PORTS_V7[0]],
    });
    expect(dockAmount(sailed.state, 0)).toBe(0);
    expect(cityOf(sailed.state, 0).economicPopulation).toBe(
      cityOf(state, 0).economicPopulation - 2,
    );
    expect(parseGameStateV7(sailed.state)).not.toBeNull();
    const back = acceptV7(sailed.state, 1, { kind: "END_TURN" });
    // Seat 0 sinks the wounded blockader.
    const wounded = patchNavalUnitV7(back.state, blockader.id, { hp: 1 });
    const moved = acceptV7(wounded, 0, {
      kind: "MOVE",
      unitId: mine.id,
      path: [{ x: 5, y: 3 }],
    });
    const sunk = acceptV7(moved.state, 0, {
      kind: "ATTACK",
      unitId: mine.id,
      targetUnitId: blockader.id,
    });
    expect(dockAmount(sunk.state, 0)).toBe(2);
  });

  it("rejects a state whose dock record does not match its owner's Harbours", () => {
    const state = navalArenaV7({
      technologies: [NAVAL_TECHS_V7, BEFORE],
      units: [],
    });
    const withAmount = (seat: 0 | 1, amount: number): GameStateV7 => {
      const port = NAVAL_ARENA_PORTS_V7[seat];
      return {
        ...state,
        populationContributions: state.populationContributions.map((entry) =>
          entry.source.kind === "IMPROVEMENT" &&
          entry.source.at.x === port.x &&
          entry.source.at.y === port.y
            ? { ...entry, amount }
            : entry,
        ),
      };
    };
    expect(parseGameStateV7(state)).not.toBeNull();
    // Seat 0 (Harbours) must have 2; seat 1 (none) must have 1.
    expect(parseGameStateV7(withAmount(0, 1))).toBeNull();
    expect(parseGameStateV7(withAmount(0, 3))).toBeNull();
    expect(parseGameStateV7(withAmount(1, 2))).toBeNull();
  });

  it("shows the Harbours population in the public preview of a Port and a Shipyard", () => {
    const population = (technologies: readonly TechnologyIdV7[]) => {
      const state = navalArenaV7({
        technologies: [technologies, BEFORE],
        ports: [false, true],
        units: [],
      });
      const view = viewForV7(state, seatV7(state, 0).id);
      const port = previewEconomicV7(view, {
        kind: "BUILD_PORT",
        at: NAVAL_ARENA_PORTS_V7[0],
      });
      if (!port.ok) throw new Error(port.error);
      const built = acceptV7(state, 0, {
        kind: "BUILD_PORT",
        at: NAVAL_ARENA_PORTS_V7[0],
      });
      // The preview is exact: the Port's own population and the city's
      // population change.
      expect(port.preview.resultingContribution).toBe(
        dockAmount(built.state, 0),
      );
      const cityId = cityOf(state, 0).id;
      const delta = (preview: typeof port.preview) =>
        preview.populationDeltaByCity.find((entry) => entry.cityId === cityId)
          ?.delta ?? 0;
      expect(delta(port.preview)).toBe(
        cityOf(built.state, 0).economicPopulation -
          cityOf(state, 0).economicPopulation,
      );
      expect(built.events[0]).toMatchObject({
        kind: "PORT_BUILT",
        populationAdded: port.preview.resultingContribution,
      });
      // The Shipyard upgrade adds 1 either way (2 to 3 with Harbours).
      const shipyard = previewEconomicV7(
        viewForV7(built.state, seatV7(built.state, 0).id),
        { kind: "BUILD_SHIPYARD", at: NAVAL_ARENA_PORTS_V7[0] },
      );
      if (!shipyard.ok) throw new Error(shipyard.error);
      const upgraded = acceptV7(built.state, 0, {
        kind: "BUILD_SHIPYARD",
        at: NAVAL_ARENA_PORTS_V7[0],
      });
      expect(delta(shipyard.preview)).toBe(1);
      const event = upgraded.events[0];
      if (event?.kind !== "SHIPYARD_BUILT") throw new Error("no Shipyard");
      expect(event.livePopulationTotal).toBe(dockAmount(upgraded.state, 0));
      return [port.preview.resultingContribution, event.livePopulationTotal];
    };
    expect(population(BEFORE)).toEqual([1, 2]);
    expect(population(NAVAL_TECHS_V7)).toEqual([2, 3]);
  });
});
