import { describe, expect, it } from "vitest";
import { scoreCommandV7 } from "../../src/ai/v7";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import {
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  combinedNetworkCityIdsV7,
  isActiveFishingHoleV7,
  landTradeCityIdsV7,
  previewEconomicV7,
  publicLinkPopulationForCityV7,
  roadPopulationForCityV7,
  seaLinksV7,
  viewForV7,
  type CityId,
  type CoordV7,
  type GameStateV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  HOLE_LINK_CAPITAL_HOLE_V7,
  HOLE_LINK_CAPITAL_V7,
  holeLinkReviewBoardV7,
  holeLinkSecondCityV7,
  holeLinkSecondHoleV7,
  holeLinkWorldV7,
  type HoleLinkWorldOptionsV7,
} from "../fixtures/v7-fishing-hole-links";
import { frozenStateV7, withFishingHolesV7 } from "../fixtures/v7-frozen-sea";
import { seatV7 } from "../fixtures/v7-naval-branch";

// Fishing Hole links (`pulp_wars-vg5l`, `pulp-wars-poc-7r129`; the user,
// 2026-11-07: "with no ice harbour how does connecting cities over water
// work now?"). Since 7r124 the Ice Folk build no dock, so Rime's sea link
// joined nothing they could build. A Fishing Hole of an Ice Folk seat is now
// a node of its connection network, joined to its city's center, and two
// holes (or a hole and an own dock) of two different own cities within
// five eight-way steps of water or ice are sea-linked. Small hand-built
// states on the authored lane of `v7-fishing-hole-links.ts`.

const SECOND_HOLE = holeLinkSecondHoleV7();

function holes(
  options: HoleLinkWorldOptionsV7,
  tiles: readonly CoordV7[],
): GameStateV7 {
  return withFishingHolesV7(holeLinkWorldV7(options), tiles);
}

function cityAt(state: GameStateV7, at: CoordV7): CityId {
  const city = state.cities.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (city === undefined) throw new Error("city missing");
  return city.id;
}

/** `[capital, second city]` link population, as the engine counts it. */
function linkPopulation(state: GameStateV7, east = 8): readonly number[] {
  const owner = seatV7(state, 0).id;
  return [HOLE_LINK_CAPITAL_V7, holeLinkSecondCityV7(east)].map((at) =>
    roadPopulationForCityV7(state, { id: cityAt(state, at), ownerId: owner }),
  );
}

function withTechnologies(
  state: GameStateV7,
  technologies: readonly TechnologyIdV7[],
): GameStateV7 {
  const owner = seatV7(state, 0).id;
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === owner
        ? { ...player, researchedTechs: [...technologies] }
        : player,
    ),
  };
}

/** A hostile Fighter of seat 1 moved onto `at` (Frozen when asked). */
function withHostileOn(
  state: GameStateV7,
  at: CoordV7,
  frozen = false,
): GameStateV7 {
  const rival = state.units.find(
    (unit) => unit.ownerId === seatV7(state, 1).id,
  );
  if (rival === undefined) throw new Error("rival missing");
  return {
    ...state,
    units: state.units.map((unit) =>
      unit.id === rival.id ? { ...unit, at } : unit,
    ),
    frozen: frozen
      ? [...state.frozen, { unitId: rival.id, turnsLeft: 1 as const }]
      : state.frozen,
  };
}

describe("the identity", () => {
  // The Mammoth's 2- or 3-tile Stampede (`pulp_wars-57lq`) took 7r128
  // after it.
  it("was 7r127 after 7r126, both save keys obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r133");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r133.current");
    const at = PRIOR_RULESET_7_IDS.indexOf("pulp-wars-poc-7r127");
    expect(at).toBeGreaterThan(0);
    expect(PRIOR_RULESET_7_IDS[at - 1]).toBe("pulp-wars-poc-7r126");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    const key = OBSOLETE_SAVE_STORAGE_KEYS_V7.indexOf(
      "pulpWars.save.v7r127.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7[key - 1]).toBe(
      "pulpWars.save.v7r126.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });
});

describe("Fishing Holes link Ice Folk cities over water (pulp_wars-vg5l)", () => {
  it("links two cities whose holes are five steps apart: +1 population each, and Commerce's trade", () => {
    const techs: TechnologyIdV7[] = [
      "SCOUTING",
      "ROADS",
      "COMMERCE",
      "SHORECRAFT",
    ];
    const lone = holes({ technologies: techs }, [HOLE_LINK_CAPITAL_HOLE_V7]);
    const linked = holes({ technologies: techs }, [
      HOLE_LINK_CAPITAL_HOLE_V7,
      SECOND_HOLE,
    ]);
    const owner = seatV7(linked, 0).id;
    const capital = cityAt(linked, HOLE_LINK_CAPITAL_V7);
    const second = cityAt(linked, holeLinkSecondCityV7());
    // One hole links nothing.
    expect(seaLinksV7(lone, owner)).toEqual([]);
    expect(linkPopulation(lone)).toEqual([0, 0]);
    expect([...landTradeCityIdsV7(lone, owner)]).toEqual([]);
    // Two holes of two cities five steps apart are a sea link.
    expect(seaLinksV7(linked, owner)).toEqual([
      {
        from: HOLE_LINK_CAPITAL_HOLE_V7,
        to: SECOND_HOLE,
        fromCityId: capital,
        toCityId: second,
      },
    ]);
    expect(
      [...combinedNetworkCityIdsV7(linked, owner)].sort((a, b) => a - b),
    ).toEqual([capital, second].sort((a, b) => a - b));
    expect(linkPopulation(linked)).toEqual([1, 1]);
    expect(
      [...landTradeCityIdsV7(linked, owner)].sort((a, b) => a - b),
    ).toEqual([capital, second].sort((a, b) => a - b));
    // The stored live population carries the link: the second city +1 for
    // its hole and +1 for the link, the capital +1 for the link.
    const population = (state: GameStateV7, id: CityId): number =>
      state.cities.find((city) => city.id === id)?.economicPopulation ?? 0;
    expect(population(linked, second) - population(lone, second)).toBe(2);
    expect(population(linked, capital) - population(lone, capital)).toBe(1);
    // The view lists the link and the public preview agrees with the engine.
    const view = viewForV7(linked, owner);
    expect(view.naval.seaRoutes).toEqual([
      {
        fromCityId: Math.min(capital, second),
        toCityId: Math.max(capital, second),
        path: expect.any(Array) as unknown,
      },
    ]);
    expect(view.naval.seaRoutes[0]?.path).toHaveLength(6);
    expect([...view.naval.networkCityIds].sort((a, b) => a - b)).toEqual(
      [capital, second].sort((a, b) => a - b),
    );
    expect(
      [capital, second].map((id) => publicLinkPopulationForCityV7(view, id)),
    ).toEqual([1, 1]);
  });

  it("does not link holes six steps apart", () => {
    const state = holes({ east: 9 }, [
      HOLE_LINK_CAPITAL_HOLE_V7,
      holeLinkSecondHoleV7(9),
    ]);
    expect(seaLinksV7(state, seatV7(state, 0).id)).toEqual([]);
    expect(linkPopulation(state, 9)).toEqual([0, 0]);
    expect(viewForV7(state, seatV7(state, 0).id).naval.seaRoutes).toEqual([]);
  });

  it("links across ice, and across Deep Water only with Pack Ice", () => {
    const open = holes({}, [HOLE_LINK_CAPITAL_HOLE_V7, SECOND_HOLE]);
    // The whole lane frozen: ice counts as water.
    const iced = frozenStateV7(
      open,
      [3, 4, 5, 6].map((x) => ({ at: { x, y: 1 } })),
    );
    expect(iced.ice).toHaveLength(6);
    expect(linkPopulation(iced)).toEqual([1, 1]);
    // Deep Water in the lane needs Pack Ice (the Ice Folk Navigation), as
    // for a dock.
    const deep: GameStateV7 = {
      ...open,
      board: {
        ...open.board,
        tiles: open.board.tiles.map((tile) =>
          tile.at.y === 1 && tile.at.x >= 3 && tile.at.x <= 6
            ? { ...tile, terrain: "DEEP_WATER" as const }
            : tile,
        ),
      },
    };
    expect(linkPopulation(deep)).toEqual([0, 0]);
    expect(
      linkPopulation(withTechnologies(deep, ["SHORECRAFT", "NAVIGATION"])),
    ).toEqual([1, 1]);
  });

  it("does not link without Rime", () => {
    const state = withTechnologies(
      holes({}, [HOLE_LINK_CAPITAL_HOLE_V7, SECOND_HOLE]),
      [],
    );
    expect(seaLinksV7(state, seatV7(state, 0).id)).toEqual([]);
    expect(linkPopulation(state)).toEqual([0, 0]);
  });

  it("links a hole to an own dock of another city (a captured Port)", () => {
    const state = holes(
      { improvements: [{ at: SECOND_HOLE, improvement: "PORT" }] },
      [HOLE_LINK_CAPITAL_HOLE_V7],
    );
    const owner = seatV7(state, 0).id;
    expect(seaLinksV7(state, owner)).toEqual([
      expect.objectContaining({
        from: HOLE_LINK_CAPITAL_HOLE_V7,
        to: SECOND_HOLE,
      }) as unknown,
    ]);
    expect(linkPopulation(state)).toEqual([1, 1]);
  });

  it("breaks while a hostile unit stands on a hole, a Frozen one too", () => {
    const linked = holes({}, [HOLE_LINK_CAPITAL_HOLE_V7, SECOND_HOLE]);
    const owner = seatV7(linked, 0).id;
    expect(isActiveFishingHoleV7(linked, SECOND_HOLE, owner)).toBe(true);
    for (const frozen of [false, true]) {
      const blocked = withHostileOn(linked, SECOND_HOLE, frozen);
      expect(isActiveFishingHoleV7(blocked, SECOND_HOLE, owner)).toBe(false);
      expect(seaLinksV7(blocked, owner)).toEqual([]);
      expect(linkPopulation(blocked)).toEqual([0, 0]);
    }
    // An own unit on the hole breaks nothing.
    const yeti = linked.units.find((unit) => unit.ownerId === owner);
    if (yeti === undefined) throw new Error("own unit missing");
    const manned: GameStateV7 = {
      ...linked,
      units: linked.units.map((unit) =>
        unit.id === yeti.id ? { ...unit, at: SECOND_HOLE } : unit,
      ),
    };
    expect(linkPopulation(manned)).toEqual([1, 1]);
  });

  it("never links two holes of the same city", () => {
    const pool = { x: SECOND_HOLE.x, y: 0 };
    const state = holes({ secondCityPool: true }, [SECOND_HOLE, pool]);
    expect(seaLinksV7(state, seatV7(state, 0).id)).toEqual([]);
    expect(linkPopulation(state)).toEqual([0, 0]);
  });

  it("leaves other factions alone: a Human seat's Fishing Holes are no nodes", () => {
    const iceFolk = holes({}, [HOLE_LINK_CAPITAL_HOLE_V7, SECOND_HOLE]);
    const owner = seatV7(iceFolk, 0).id;
    const human: GameStateV7 = {
      ...iceFolk,
      players: iceFolk.players.map((player) =>
        player.id === owner ? { ...player, faction: "ORIGINAL" } : player,
      ),
    };
    expect(isActiveFishingHoleV7(human, SECOND_HOLE, owner)).toBe(false);
    expect(seaLinksV7(human, owner)).toEqual([]);
    expect(linkPopulation(human)).toEqual([0, 0]);
  });

  it("draws the dashed sea link between the holes", () => {
    const state = holeLinkReviewBoardV7();
    const view = viewForV7(state, seatV7(state, 0).id);
    const plan = buildBoardRenderPlanV7(view, [], {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    });
    const links = plan.entries.filter(
      (entry) => entry.kind === "LINK" && entry.label === "SEA_ROUTE",
    );
    expect(links).toHaveLength(5);
    expect(links[0]?.at).toEqual(HOLE_LINK_CAPITAL_HOLE_V7);
  });
});

describe("the Normal AI values a Fishing Hole that links a city (pulp_wars-vg5l)", () => {
  it("scores the linking hole above a hole that links nothing", () => {
    const state = holes({ capitalPool: true }, [SECOND_HOLE]);
    const view = viewForV7(state, seatV7(state, 0).id);
    const linking = {
      kind: "BUILD_FISHING_HOLE" as const,
      at: HOLE_LINK_CAPITAL_HOLE_V7,
    };
    const lone = { kind: "BUILD_FISHING_HOLE" as const, at: { x: 0, y: 0 } };
    const linkingPreview = previewEconomicV7(view, linking);
    const lonePreview = previewEconomicV7(view, lone);
    if (!linkingPreview.ok || !lonePreview.ok)
      throw new Error("preview refused");
    const total = (preview: typeof linkingPreview): number =>
      preview.ok
        ? preview.preview.populationDeltaByCity.reduce(
            (sum, entry) => sum + entry.delta,
            0,
          )
        : 0;
    // The hole's own +1, and the link's +1 for each of the two cities.
    expect(total(lonePreview)).toBe(1);
    expect(total(linkingPreview)).toBe(3);
    const linkingScore = scoreCommandV7(view, linking);
    const loneScore = scoreCommandV7(view, lone);
    expect(linkingScore.immediateValue).toBeGreaterThan(
      loneScore.immediateValue,
    );
  });
});
