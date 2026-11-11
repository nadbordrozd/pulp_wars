import { describe, expect, it } from "vitest";
import { scoreCommandV7 } from "../../src/ai/v7";
import {
  ICE_CRACK_LINK_PRIORITY_V7,
  ICE_LINK_FREEZE_PRIORITY_V7,
  iceCrackUnlinkedPairsV7,
} from "../../src/ai/v7-frozen-sea";
import {
  RULESET_7_ID,
  ownIceChainPairsV7,
  parseGameStateV7,
  previewEconomicV7,
  publicIceLinkPopulationGainV7,
  publicLinkPopulationForCityV7,
  queryPlayerCommandsV7,
  roadPopulationForCityV7,
  seaLinksV7,
  viewForV7,
  type CityId,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import { HOLE_LINKS_RULE_V7 } from "../../src/render/frozen-sea-presentation-v7";
import { ICE_SEA_LINK_UNLOCK_TEXT_V7 } from "../../src/render/technology-unlock-text-v7";
import {
  HOLE_LINK_CAPITAL_HOLE_V7,
  HOLE_LINK_CAPITAL_V7,
  holeLinkSecondCityV7,
  holeLinkSecondHoleV7,
  holeLinkWorldV7,
  type HoleLinkWorldOptionsV7,
} from "../fixtures/v7-fishing-hole-links";
import {
  frozenStateV7,
  iceEntryV7,
  withFishingHolesV7,
} from "../fixtures/v7-frozen-sea";
import { acceptV7, navalUnitAtV7, seatV7 } from "../fixtures/v7-naval-branch";

// Sea routes over ice only (`pulp_wars-dy2b`, `pulp-wars-poc-7r138`;
// docs/product/ICE_FOLK_REDESIGN_2026-11.md section 3.5, Bead 5; the user,
// 2026-11-08: "trade routes over water should only go over ice. if there is
// no ice connection there is no route"). An Ice Folk seat's two sea-link
// endpoints (Fishing Holes, Ice Fortresses, captured docks) of two different
// own cities are linked only by an unbroken eight-way chain of the seat's
// own ice, of any length; open water, another seat's ice or a Crack breaks
// it. Units on the chain never matter (a hostile unit on an endpoint does,
// as before). Every other faction's sea links are unchanged. Hand-built
// states on the lane of `v7-fishing-hole-links.ts` (row 1 is Shallow Water
// between the capital on (1, 1) and the second city on (`east`, 1)).

/** The lane on a 16 x 16 board: the holes on (2, 1) and (12, 1), ten apart. */
const FAR = { size: 16, east: 13 } as const;
const FAR_HOLE = holeLinkSecondHoleV7(FAR.east);
const SECOND_HOLE = holeLinkSecondHoleV7();

function holes(
  options: HoleLinkWorldOptionsV7,
  tiles: readonly CoordV7[],
): GameStateV7 {
  return withFishingHolesV7(
    holeLinkWorldV7({ iceLane: true, ...options }),
    tiles,
  );
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

/** The stored live population of the city on `at`. */
function economic(state: GameStateV7, at: CoordV7): number {
  const id = cityAt(state, at);
  return state.cities.find((city) => city.id === id)?.economicPopulation ?? 0;
}

/** The same position on `seat`'s turn. */
function turnOf(state: GameStateV7, seat: 0 | 1): GameStateV7 {
  const parsed = parseGameStateV7({
    ...state,
    activeSeatIndex: state.turnOrder.indexOf(seatV7(state, seat).id),
  });
  if (parsed === null) throw new Error("the turn state is invalid");
  return parsed;
}

function offered(state: GameStateV7, seat: 0 | 1): readonly CommandV7[] {
  return queryPlayerCommandsV7(viewForV7(state, seatV7(state, seat).id));
}

describe("the identity", () => {
  it("is 7r138", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r139");
  });
});

describe("the chain rule (ownIceChainPairsV7)", () => {
  // A 6 x 3 board, row 1: endpoints on (0, 1) and (5, 1).
  const width = 6;
  const index = (x: number, y: number): number => y * width + x;
  const ends: readonly CoordV7[] = [
    { x: 0, y: 1 },
    { x: 5, y: 1 },
  ];
  it("joins endpoints through own ice, eight-way, the endpoints excepted", () => {
    // Ice on (1..4, 1): linked (the endpoints are not ice: two docks).
    const lane = new Set([1, 2, 3, 4].map((x) => index(x, 1)));
    expect(ownIceChainPairsV7(width, 3, lane, ends)).toEqual([[0, 1]]);
    // A diagonal step counts: (2, 1) moved to (2, 0).
    const bent = new Set([index(1, 1), index(2, 0), index(3, 1), index(4, 1)]);
    expect(ownIceChainPairsV7(width, 3, bent, ends)).toEqual([[0, 1]]);
    // One tile missing: no link.
    const gap = new Set([1, 2, 4].map((x) => index(x, 1)));
    expect(ownIceChainPairsV7(width, 3, gap, ends)).toEqual([]);
    // Two endpoints side by side link with no ice at all.
    expect(
      ownIceChainPairsV7(width, 3, new Set(), [
        { x: 2, y: 1 },
        { x: 3, y: 2 },
      ]),
    ).toEqual([[0, 1]]);
  });
});

describe("Ice Folk sea links run only along their own ice (section 3.5)", () => {
  it("links two holes ten tiles apart joined by own ice, with no length limit", () => {
    const state = holes(FAR, [HOLE_LINK_CAPITAL_HOLE_V7, FAR_HOLE]);
    const owner = seatV7(state, 0).id;
    const capital = cityAt(state, HOLE_LINK_CAPITAL_V7);
    const second = cityAt(state, holeLinkSecondCityV7(FAR.east));
    expect(FAR_HOLE.x - HOLE_LINK_CAPITAL_HOLE_V7.x).toBe(10);
    expect(seaLinksV7(state, owner)).toEqual([
      {
        from: HOLE_LINK_CAPITAL_HOLE_V7,
        to: FAR_HOLE,
        fromCityId: capital,
        toCityId: second,
      },
    ]);
    expect(linkPopulation(state, FAR.east)).toEqual([1, 1]);
    // The view draws the link along the ice; the public preview agrees.
    const view = viewForV7(state, owner);
    const route = view.naval.seaRoutes[0];
    expect(view.naval.seaRoutes).toHaveLength(1);
    expect(route?.path).toEqual(
      Array.from({ length: 11 }, (_, x) => ({ x: x + 2, y: 1 })),
    );
    expect(
      [capital, second].map((id) => publicLinkPopulationForCityV7(view, id)),
    ).toEqual([1, 1]);
  });

  it("does not link the same holes with one open tile in the chain", () => {
    const gap = { x: 7, y: 1 };
    const state = holes({ ...FAR, gaps: [gap] }, [
      HOLE_LINK_CAPITAL_HOLE_V7,
      FAR_HOLE,
    ]);
    const owner = seatV7(state, 0).id;
    expect(iceEntryV7(state, gap)).toBeUndefined();
    expect(seaLinksV7(state, owner)).toEqual([]);
    expect(linkPopulation(state, FAR.east)).toEqual([0, 0]);
    const view = viewForV7(state, owner);
    expect(view.naval.seaRoutes).toEqual([]);
    // The public preview agrees: no link population.
    expect(
      [HOLE_LINK_CAPITAL_V7, holeLinkSecondCityV7(FAR.east)].map((at) =>
        publicLinkPopulationForCityV7(view, cityAt(state, at)),
      ),
    ).toEqual([0, 0]);
  });

  it("a Crack in the chain drops the connected population until the tile is refrozen", () => {
    const chain = { x: 4, y: 1 };
    // A Human Fighter on (4, 2) beside the chain; an Ice Witch on (4, 0).
    const linked = turnOf(
      holes(
        {
          extraUnits: [
            { seat: 1, role: "FIGHTER", at: { x: 4, y: 2 } },
            { seat: 0, role: "CAPTAIN", at: { x: 4, y: 0 } },
          ],
        },
        [HOLE_LINK_CAPITAL_HOLE_V7, SECOND_HOLE],
      ),
      1,
    );
    const capital = HOLE_LINK_CAPITAL_V7;
    const second = holeLinkSecondCityV7();
    expect(linkPopulation(linked)).toEqual([1, 1]);
    const fighter = navalUnitAtV7(linked, { x: 4, y: 2 });
    const cracked = acceptV7(linked, 1, {
      kind: "CRACK_ICE",
      unitId: fighter.id,
      at: chain,
    }).state;
    expect(iceEntryV7(cracked, chain)).toBeUndefined();
    expect(linkPopulation(cracked)).toEqual([0, 0]);
    // The stored population loses the link at once: one for each city.
    expect(economic(linked, capital) - economic(cracked, capital)).toBe(1);
    expect(economic(linked, second) - economic(cracked, second)).toBe(1);
    // The Ice Witch's Cold Snap freezes the tile again: the link is back.
    const ownTurn = turnOf(cracked, 0);
    const witch = navalUnitAtV7(ownTurn, { x: 4, y: 0 });
    const refrozen = acceptV7(ownTurn, 0, {
      kind: "COLD_SNAP",
      unitId: witch.id,
    }).state;
    expect(iceEntryV7(refrozen, chain)?.ownerId).toBe(seatV7(refrozen, 0).id);
    expect(linkPopulation(refrozen)).toEqual([1, 1]);
    expect(economic(refrozen, capital)).toBe(economic(linked, capital));
    expect(economic(refrozen, second)).toBe(economic(linked, second));
  });

  it("foreign ice in the chain breaks it", () => {
    const linked = holes({}, [HOLE_LINK_CAPITAL_HOLE_V7, SECOND_HOLE]);
    expect(linkPopulation(linked)).toEqual([1, 1]);
    // (5, 1) is another seat's ice: the chain is not the seat's own.
    const foreign = frozenStateV7(
      holeLinkWorldV7({ iceLane: true, gaps: [{ x: 5, y: 1 }] }),
      [{ at: { x: 5, y: 1 }, seat: 1 }],
    );
    const state = withFishingHolesV7(foreign, [
      HOLE_LINK_CAPITAL_HOLE_V7,
      SECOND_HOLE,
    ]);
    expect(iceEntryV7(state, { x: 5, y: 1 })?.ownerId).toBe(
      seatV7(state, 1).id,
    );
    expect(seaLinksV7(state, seatV7(state, 0).id)).toEqual([]);
    expect(linkPopulation(state)).toEqual([0, 0]);
  });

  it("links a captured Port through the ice beside it", () => {
    // The Port on (7, 1) is open water; the lane's ice reaches (6, 1).
    const state = holes(
      {
        improvements: [{ at: SECOND_HOLE, improvement: "PORT" }],
        gaps: [SECOND_HOLE],
      },
      [HOLE_LINK_CAPITAL_HOLE_V7],
    );
    const owner = seatV7(state, 0).id;
    expect(iceEntryV7(state, SECOND_HOLE)).toBeUndefined();
    expect(seaLinksV7(state, owner)).toEqual([
      expect.objectContaining({
        from: HOLE_LINK_CAPITAL_HOLE_V7,
        to: SECOND_HOLE,
      }) as unknown,
    ]);
    expect(linkPopulation(state)).toEqual([1, 1]);
    expect(viewForV7(state, owner).naval.seaRoutes[0]?.path).toHaveLength(6);
    // With (6, 1) open the Port is cut off.
    const cut = holes(
      {
        improvements: [{ at: SECOND_HOLE, improvement: "PORT" }],
        gaps: [SECOND_HOLE, { x: 6, y: 1 }],
      },
      [HOLE_LINK_CAPITAL_HOLE_V7],
    );
    expect(linkPopulation(cut)).toEqual([0, 0]);
  });

  it("units on the chain never matter: an own unit on the ice keeps the link", () => {
    const linked = holes({}, [HOLE_LINK_CAPITAL_HOLE_V7, SECOND_HOLE]);
    const owner = seatV7(linked, 0).id;
    const yeti = linked.units.find((unit) => unit.ownerId === owner);
    if (yeti === undefined) throw new Error("own unit missing");
    const manned = parseGameStateV7({
      ...linked,
      units: linked.units.map((unit) =>
        unit.id === yeti.id ? { ...unit, at: { x: 5, y: 1 } } : unit,
      ),
    });
    if (manned === null) throw new Error("the manned state is invalid");
    expect(linkPopulation(manned)).toEqual([1, 1]);
  });

  it("leaves a Human sea link unchanged: five water steps, under Ice Folk ice", () => {
    // A Human seat with Ports on both ends of the lane, the lane between
    // them the Ice Folk's (seat 1's) ice: the Human link runs under it, as
    // before. (The Ports are laid on the board directly: the link is a pure
    // read of the board, and a level-1 city cannot hold a Port and a link.)
    const withPorts = (east: number, ice: readonly CoordV7[]): GameStateV7 => {
      const world = holeLinkWorldV7({
        faction: "ORIGINAL",
        rivalFaction: "ICE_FOLK",
        east,
      });
      const docks = [HOLE_LINK_CAPITAL_HOLE_V7, holeLinkSecondHoleV7(east)];
      const iceFolk = seatV7(world, 1).id;
      return {
        ...world,
        board: {
          ...world.board,
          tiles: world.board.tiles.map((tile) =>
            docks.some((at) => at.x === tile.at.x && at.y === tile.at.y)
              ? { ...tile, improvement: "PORT" as const }
              : tile,
          ),
        },
        ice: ice.map((at) => ({ at, ownerId: iceFolk })),
      };
    };
    const lane = [3, 4, 5, 6].map((x) => ({ x, y: 1 }));
    for (const state of [withPorts(8, []), withPorts(8, lane)]) {
      expect(seaLinksV7(state, seatV7(state, 0).id)).toHaveLength(1);
      expect(linkPopulation(state)).toEqual([1, 1]);
    }
    // Six steps apart is still too far for a Port link, ice or not.
    const far = withPorts(9, [...lane, { x: 7, y: 1 }]);
    expect(seaLinksV7(far, seatV7(far, 0).id)).toEqual([]);
  });

  it("says so on Rime's card and in the Help row, one number at most", () => {
    for (const text of [HOLE_LINKS_RULE_V7, ICE_SEA_LINK_UNLOCK_TEXT_V7]) {
      expect(text).toMatch(/ice/);
      expect(text.match(/\d+/g) ?? []).toHaveLength(1);
    }
    expect(HOLE_LINKS_RULE_V7).toMatch(/Crack/);
  });

  it("draws the dashed link along the ice, and nothing with a gap", () => {
    const plan = (state: GameStateV7) =>
      buildBoardRenderPlanV7(viewForV7(state, seatV7(state, 0).id), [], {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      }).entries.filter(
        (entry) => entry.kind === "LINK" && entry.label === "SEA_ROUTE",
      );
    const linked = holes({}, [HOLE_LINK_CAPITAL_HOLE_V7, SECOND_HOLE]);
    expect(plan(linked)).toHaveLength(5);
    const gapped = holes({ gaps: [{ x: 5, y: 1 }] }, [
      HOLE_LINK_CAPITAL_HOLE_V7,
      SECOND_HOLE,
    ]);
    expect(plan(gapped)).toHaveLength(0);
  });
});

describe("the Normal AI and Ice Folk sea links", () => {
  it("values the Fishing Hole only for the link its ice chain makes", () => {
    for (const gaps of [[], [{ x: 5, y: 1 }]] as const) {
      const state = holes({ capitalPool: true, gaps }, [SECOND_HOLE]);
      const view = viewForV7(state, seatV7(state, 0).id);
      const preview = previewEconomicV7(view, {
        kind: "BUILD_FISHING_HOLE",
        at: HOLE_LINK_CAPITAL_HOLE_V7,
      });
      if (!preview.ok) throw new Error("preview refused");
      const total = preview.preview.populationDeltaByCity.reduce(
        (sum, entry) => sum + entry.delta,
        0,
      );
      // The hole's own +1, and +1 for each linked city only along the ice.
      expect(total).toBe(gaps.length === 0 ? 3 : 1);
    }
  });

  it("scores the Cold Snap that freezes the gap and completes a link", () => {
    const gap = { x: 4, y: 1 };
    const witchAt = { x: 4, y: 2 };
    const build = (gaps: readonly CoordV7[]): GameStateV7 =>
      holes({ gaps, extraUnits: [{ seat: 0, role: "CAPTAIN", at: witchAt }] }, [
        HOLE_LINK_CAPITAL_HOLE_V7,
        SECOND_HOLE,
      ]);
    const gapped = build([gap]);
    const view = viewForV7(gapped, seatV7(gapped, 0).id);
    expect(publicIceLinkPopulationGainV7(view, [gap])).toBe(2);
    expect(publicIceLinkPopulationGainV7(view, [{ x: 3, y: 1 }])).toBe(0);
    const witch = navalUnitAtV7(gapped, witchAt);
    const snap = { kind: "COLD_SNAP" as const, unitId: witch.id };
    expect(offered(gapped, 0)).toContainEqual(snap);
    const linking = scoreCommandV7(view, snap);
    expect(linking.priority).toBe(ICE_LINK_FREEZE_PRIORITY_V7);
    expect(linking.strategicValue).toBeGreaterThan(0);
    // With the chain whole, the same Cold Snap makes no link.
    const whole = build([]);
    const wholeView = viewForV7(whole, seatV7(whole, 0).id);
    const plain = scoreCommandV7(wholeView, {
      kind: "COLD_SNAP",
      unitId: navalUnitAtV7(whole, witchAt).id,
    });
    expect(plain.priority).toBeLessThan(linking.priority);
  });

  it("an enemy scores a Crack that breaks an Ice Folk link above one that does not", () => {
    // A Human Fighter on (6, 0): beside the chain tiles (5, 1) and (6, 1),
    // and the second city's pool ice on (7, 0), which links nothing.
    const state = turnOf(
      holes(
        {
          secondCityPool: true,
          extraUnits: [{ seat: 1, role: "FIGHTER", at: { x: 6, y: 0 } }],
        },
        [HOLE_LINK_CAPITAL_HOLE_V7, SECOND_HOLE],
      ),
      1,
    );
    const iceFolk = seatV7(state, 0).id;
    const view = viewForV7(state, seatV7(state, 1).id);
    const fighter = navalUnitAtV7(state, { x: 6, y: 0 });
    const crack = (at: CoordV7) => ({
      kind: "CRACK_ICE" as const,
      unitId: fighter.id,
      at,
    });
    const cracks = offered(state, 1).filter(
      (command) => command.kind === "CRACK_ICE",
    );
    expect(cracks).toContainEqual(crack({ x: 6, y: 1 }));
    expect(cracks).toContainEqual(crack({ x: 7, y: 0 }));
    expect(iceCrackUnlinkedPairsV7(view, iceFolk, { x: 6, y: 1 })).toBe(1);
    expect(iceCrackUnlinkedPairsV7(view, iceFolk, { x: 7, y: 0 })).toBe(0);
    const breaking = scoreCommandV7(view, crack({ x: 6, y: 1 }));
    const idle = scoreCommandV7(view, crack({ x: 7, y: 0 }));
    expect(breaking.priority).toBe(ICE_CRACK_LINK_PRIORITY_V7);
    expect(breaking.priority).toBeGreaterThan(idle.priority);
  });
});
