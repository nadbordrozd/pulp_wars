import { describe, expect, it } from "vitest";
import {
  CURIOSITY_DANGER_KINDS_V7,
  CURIOSITY_PLACEMENT_KINDS_V7,
  CURIOSITY_WEIGHTS_V7,
  GOLD_CLAIM_TOTAL_V7,
  MOON_GUN_LAND_MINIMUM_V7,
  RULESET_7_ID,
  createInitialMapStateV7,
  curiosityGatePairsV7,
  curiosityRandomStateV7,
  curiositySitesV7,
  curiosityTargetCountV7,
  generateInitialMapV7,
  generateInitialMapWithVillageCountV7,
  moonGunLandAroundV7,
  queryPlayerCommandsV7,
  villageCountV7,
  type CoordV7,
  type CuriositySiteContextV7,
  type FactionIdV7,
  type MapTypeV7,
  type MatchSetupV7,
  type PlacedCuriosityV7,
} from "../../src/engine/index";
import { nextBounded } from "../../src/engine/random/random";
import { checkCuriosityPlacementV7 } from "../fixtures/v7-curiosity-checker";

// Map curiosities round 3, bead A (`pulp_wars-737.20`,
// docs/product/RULESET_7_CURIOSITIES_ROUND_3.md sections 3, 10.1, 13, and
// 15.4): the four land kinds appended to the frozen draw order, their board
// widths and site rules, the new count table, the stream order replayed on
// pinned seeds, and the option off unchanged. Generation only: no match is
// played.

function setupOf(
  seed: number,
  mapType: MapTypeV7,
  width: MatchSetupV7["width"],
  factions: readonly FactionIdV7[] = ["ORIGINAL", "GOBLIN"],
  curiosities = true,
): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width,
    height: width,
    aiCount: factions.length - 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...factions],
    mapType,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities,
  };
}

function contextOf(setup: MatchSetupV7): CuriositySiteContextV7 {
  const generated = generateInitialMapV7({ ...setup, curiosities: false });
  if (!generated.ok) throw new Error("map");
  return {
    board: generated.map.board,
    mapType: setup.mapType,
    capitals: generated.map.capitals,
    villages: generated.map.villages,
    treasureChests: generated.map.treasureChests,
    factions: setup.factions,
  };
}

const chebyshev = (a: CoordV7, b: CoordV7) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

describe("round-3 generation (section 3)", () => {
  it("appends the four land kinds to the frozen order with weight 2", () => {
    expect(CURIOSITY_PLACEMENT_KINDS_V7).toEqual([
      "MONSTER",
      "FOUNTAIN",
      "SHRINE",
      "WRECK",
      "DOWNED_SAUCER",
      "GRAVEYARD",
      "GATES",
      "BIGFOOT",
      "WISHING_WELL",
      "TESLA_TOWER",
      "MOON_GUN",
      "GOLD_CLAIM",
      "LOST_EXPEDITION",
    ]);
    for (const kind of [
      "TESLA_TOWER",
      "MOON_GUN",
      "GOLD_CLAIM",
      "LOST_EXPEDITION",
    ] as const)
      expect(CURIOSITY_WEIGHTS_V7[kind]).toBe(2);
    // None of them is a danger.
    expect(CURIOSITY_DANGER_KINDS_V7).toEqual([
      "MONSTER",
      "DOWNED_SAUCER",
      "GRAVEYARD",
    ]);
  });

  it("aims for 2 on 20 x 20 and 2 or 3 on 25 x 25; the smaller sizes are unchanged", () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const random = curiosityRandomStateV7(seed);
      expect(curiosityTargetCountV7(20, random)).toEqual({ count: 2, random });
      const draw = nextBounded(random, 2);
      expect(curiosityTargetCountV7(25, random)).toEqual({
        count: draw.value === 0 ? 3 : 2,
        random: draw.random,
      });
      const eleven = nextBounded(random, 3);
      expect(curiosityTargetCountV7(11, random).count).toBe(
        eleven.value === 0 ? 1 : 0,
      );
      const fourteen = nextBounded(random, 2);
      expect(curiosityTargetCountV7(14, random).count).toBe(
        fourteen.value === 0 ? 1 : 0,
      );
      expect(curiosityTargetCountV7(16, random)).toEqual({ count: 1, random });
    }
  });

  it("offers the Tower and the Gun from 16, the Claim from 14, and the Expedition anywhere", () => {
    const eleven = contextOf(setupOf(0, "PANGEA", 11));
    for (const kind of ["TESLA_TOWER", "MOON_GUN", "GOLD_CLAIM"] as const)
      expect(curiositySitesV7(eleven, kind), kind).toEqual([]);
    const fourteen = contextOf(setupOf(0, "PANGEA", 14));
    expect(curiositySitesV7(fourteen, "TESLA_TOWER")).toEqual([]);
    expect(curiositySitesV7(fourteen, "MOON_GUN")).toEqual([]);
    expect(curiositySitesV7(fourteen, "GOLD_CLAIM").length).toBeGreaterThan(0);
    let expeditionOnEleven = false;
    for (let seed = 0; seed < 20 && !expeditionOnEleven; seed += 1)
      expeditionOnEleven =
        curiositySitesV7(
          contextOf(setupOf(seed, "PANGEA", 11)),
          "LOST_EXPEDITION",
        ).length > 0;
    expect(expeditionOnEleven).toBe(true);
    const sixteens = [0, 1, 2, 3].map((seed) =>
      contextOf(setupOf(seed, "DRY_LAND", 16)),
    );
    for (const kind of [
      "TESLA_TOWER",
      "MOON_GUN",
      "GOLD_CLAIM",
      "LOST_EXPEDITION",
    ] as const)
      expect(
        sixteens.some((context) => curiositySitesV7(context, kind).length > 0),
        kind,
      ).toBe(true);
  });

  it("keeps the Tower 5 from capitals and 4 from villages and gives the Gun 20 land tiles", () => {
    for (const seed of [0, 1, 2]) {
      const context = contextOf(setupOf(seed, "LAKES", 20));
      const towers = curiositySitesV7(context, "TESLA_TOWER");
      expect(towers.length).toBeGreaterThan(0);
      for (const at of towers) {
        for (const capital of context.capitals)
          expect(chebyshev(capital, at)).toBeGreaterThanOrEqual(5);
        for (const village of context.villages)
          expect(chebyshev(village, at)).toBeGreaterThanOrEqual(4);
      }
      // A Shrine (round 1's plain rule) may stand nearer a village.
      const shrines = curiositySitesV7(context, "SHRINE");
      expect(shrines.length).toBeGreaterThanOrEqual(towers.length);
      const guns = curiositySitesV7(context, "MOON_GUN");
      for (const at of guns)
        expect(moonGunLandAroundV7(context.board, at)).toBeGreaterThanOrEqual(
          MOON_GUN_LAND_MINIMUM_V7,
        );
    }
    // On an Archipelago, most Grass is too far from 20 land tiles.
    const islands = contextOf(setupOf(0, "ARCHIPELAGO", 20));
    for (const at of curiositySitesV7(islands, "MOON_GUN"))
      expect(moonGunLandAroundV7(islands.board, at)).toBeGreaterThanOrEqual(20);
  });

  /** Replays the stream of section 3.1 (spec section 24.1) on a board. */
  function replay(setup: MatchSetupV7) {
    const context = contextOf(setup);
    let random = curiosityRandomStateV7(setup.seed);
    const draw = (bound: number): number => {
      const result = nextBounded(random, bound);
      random = result.random;
      return result.value;
    };
    const target = curiosityTargetCountV7(setup.width, random);
    random = target.random;
    const placed: PlacedCuriosityV7[] = [];
    const kinds: string[] = [];
    for (let index = 0; index < target.count; index += 1) {
      const danger = kinds.some((kind) =>
        (CURIOSITY_DANGER_KINDS_V7 as readonly string[]).includes(kind),
      );
      const eligible = CURIOSITY_PLACEMENT_KINDS_V7.flatMap((kind) => {
        if (
          kinds.includes(kind) ||
          (danger && CURIOSITY_DANGER_KINDS_V7.includes(kind))
        )
          return [];
        const sites =
          kind === "GATES"
            ? curiosityGatePairsV7(context, placed).map((pair) => [...pair])
            : curiositySitesV7(context, kind, placed).map((at) => [at]);
        return sites.length === 0 ? [] : [{ kind, sites }];
      });
      if (eligible.length === 0) break;
      let remaining = draw(
        eligible.reduce(
          (sum, entry) => sum + CURIOSITY_WEIGHTS_V7[entry.kind],
          0,
        ),
      );
      const chosen = eligible.find((entry) => {
        remaining -= CURIOSITY_WEIGHTS_V7[entry.kind];
        return remaining < 0;
      });
      if (chosen === undefined) throw new Error("kind");
      const site = chosen.sites[draw(chosen.sites.length)] as CoordV7[];
      kinds.push(chosen.kind);
      for (const at of site) placed.push({ kind: chosen.kind, at });
      // A camp's composition and guard draws (round 2) are not on these
      // pinned seeds; the round-2 test replays them.
      if (chosen.kind === "DOWNED_SAUCER" || chosen.kind === "GRAVEYARD")
        throw new Error("a camp on a round-3 pin");
    }
    return { kinds, placed };
  }

  for (const [seed, mapType, width, expected] of [
    [12, "PANGEA", 20, ["TESLA_TOWER", "FOUNTAIN"]],
    [22, "PANGEA", 20, ["GOLD_CLAIM", "MOON_GUN"]],
    [20, "DRY_LAND", 25, ["TESLA_TOWER", "FOUNTAIN", "GOLD_CLAIM"]],
    [27, "DRY_LAND", 25, ["TESLA_TOWER", "MOON_GUN", "LOST_EXPEDITION"]],
  ] as const)
    it(`draws in the stream order of section 3.1: ${mapType} ${width} seed ${seed}`, () => {
      const setup = setupOf(seed, mapType, width);
      const generated = generateInitialMapV7(setup);
      if (!generated.ok) throw new Error("map");
      const replayed = replay(setup);
      expect([...replayed.kinds].sort()).toEqual([...expected].sort());
      expect(
        generated.map.curiosities.map((marker) => ({
          kind: marker.kind,
          at: marker.at,
        })),
      ).toEqual(
        [...replayed.placed].sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x),
      );
      // Each new marker starts unused.
      for (const marker of generated.map.curiosities) {
        if (marker.kind === "MOON_GUN") expect(marker.lastFired).toBeNull();
        if (marker.kind === "GOLD_CLAIM")
          expect([marker.ownerId, marker.left]).toEqual([
            null,
            GOLD_CLAIM_TOTAL_V7,
          ]);
        if (marker.kind === "LOST_EXPEDITION")
          expect(marker.foundBy).toBeNull();
      }
      // The independent checker accepts the board, with no tile changed.
      const base = generateInitialMapWithVillageCountV7(
        setup,
        villageCountV7(setup),
        "NATURAL_WATER_RIFTS",
      );
      if (!base.ok) throw new Error("base");
      checkCuriosityPlacementV7(
        generated.map,
        base.map,
        mapType,
        curiosityTargetCountV7(width, curiosityRandomStateV7(seed)).count,
        setup.factions,
      );
    });
});

describe("the option off (section 10.1)", () => {
  it("generates the board of the generator before the curiosities", () => {
    for (const [mapType, width] of [
      ["PANGEA", 20],
      ["DRY_LAND", 25],
      ["CONTINENTS", 16],
      ["LAKES", 14],
    ] as const)
      for (const seed of [0, 7, 12]) {
        const setup = setupOf(
          seed,
          mapType,
          width,
          ["ORIGINAL", "GOBLIN"],
          false,
        );
        const off = generateInitialMapV7(setup);
        const base = generateInitialMapWithVillageCountV7(
          setup,
          villageCountV7(setup),
          "NATURAL_WATER_RIFTS",
        );
        if (!off.ok || !base.ok) throw new Error("map");
        expect(off.map).toEqual(base.map);
        expect(off.map.curiosities).toEqual([]);
        expect(off.map.neutrals).toEqual([]);
      }
  });

  it("offers no zap or shot and keeps every state field as it was", () => {
    const created = createInitialMapStateV7(
      setupOf(12, "PANGEA", 20, ["ORIGINAL", "GOBLIN"], false),
    );
    if (!created.ok) throw new Error("state");
    const state = created.state;
    expect(state.curiosities).toEqual([]);
    expect(
      queryPlayerCommandsV7(state, state.humanPlayerId).filter(
        (command) => command.kind === "ZAP" || command.kind === "FIRE_MOON_GUN",
      ),
    ).toEqual([]);
    // With the option on only the curiosities (and neutral units) differ.
    const on = createInitialMapStateV7(setupOf(12, "PANGEA", 20));
    if (!on.ok) throw new Error("state");
    expect(on.state.board).toEqual(state.board);
    expect(on.state.cities).toEqual(state.cities);
    expect(on.state.random).toEqual(state.random);
    expect(on.state.curiosities.map((entry) => entry.kind).sort()).toEqual([
      "FOUNTAIN",
      "TESLA_TOWER",
    ]);
  });
});
