import { describe, expect, it } from "vitest";
import {
  CURIOSITY_DANGER_KINDS_V7,
  CURIOSITY_PLACEMENT_KINDS_V7,
  CURIOSITY_WEIGHTS_V7,
  NEUTRAL_ROLE_RULES_V7,
  RULESET_7_ID,
  SEA_SERPENT_AREA_MINIMUM_V7,
  SEA_SERPENT_CAPITAL_DISTANCE_V7,
  SEA_SERPENT_SPACING_V7,
  SEA_SERPENT_VILLAGE_DISTANCE_V7,
  createInitialMapStateV7,
  curiosityGatePairsV7,
  curiosityRandomStateV7,
  curiositySitesV7,
  curiosityTargetCountV7,
  generateInitialMapV7,
  generateInitialMapWithVillageCountV7,
  parseGameStateV7,
  seaSerpentAreaV7,
  villageCountV7,
  type CoordV7,
  type CuriositySiteContextV7,
  type FactionIdV7,
  type MapTypeV7,
  type MatchSetupV7,
  type PlacedCuriosityV7,
} from "../../src/engine/index";
import { nextBounded } from "../../src/engine/random/random";
import {
  checkCuriosityPlacementV7,
  curiositySiteCheckerV7,
} from "../fixtures/v7-curiosity-checker";

// Map curiosities round 3, bead B (`pulp_wars-737.21`,
// docs/product/RULESET_7_CURIOSITIES_ROUND_3.md sections 3, 10.1, 13, and
// 15.4): the Sea Serpent's home in generation: its kind appended to the
// frozen order, its boards (16 and up, never Dry Land), its site rules
// (Deep Water, the lair's distances as built, the area of 16 water tiles
// with no strait, sailed to from every capital), the spacing of 6 both
// ways, the one-danger rule, and the stream replayed on pinned seeds.
// Generation only: no match is played.

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

function baseOf(setup: MatchSetupV7) {
  const base = generateInitialMapWithVillageCountV7(
    setup,
    villageCountV7(setup),
    "NATURAL_WATER_RIFTS",
  );
  if (!base.ok) throw new Error("base");
  return base.map;
}

const chebyshev = (a: CoordV7, b: CoordV7) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

describe("the Sea Serpent in generation (section 3)", () => {
  it("is the fourteenth kind, weight 2, and a danger", () => {
    expect(CURIOSITY_PLACEMENT_KINDS_V7.at(-1)).toBe("SEA_SERPENT");
    expect(CURIOSITY_PLACEMENT_KINDS_V7).toHaveLength(14);
    expect(CURIOSITY_WEIGHTS_V7.SEA_SERPENT).toBe(2);
    expect(CURIOSITY_DANGER_KINDS_V7).toContain("SEA_SERPENT");
  });

  it("never has a site on Dry Land or below width 16", () => {
    for (const seed of [0, 1, 2]) {
      expect(
        curiositySitesV7(
          contextOf(setupOf(seed, "DRY_LAND", 20)),
          "SEA_SERPENT",
        ),
      ).toEqual([]);
      expect(
        curiositySitesV7(
          contextOf(setupOf(seed, "ARCHIPELAGO", 14)),
          "SEA_SERPENT",
        ),
      ).toEqual([]);
    }
  });

  it("homes it on Deep Water with the lair's distances, a 16-tile area, and no strait", () => {
    let sites = 0;
    for (const [mapType, width] of [
      ["ARCHIPELAGO", 20],
      ["CONTINENTS", 20],
      ["ARCHIPELAGO", 25],
    ] as const)
      for (const seed of [0, 1, 2]) {
        const setup = setupOf(seed, mapType, width);
        const context = contextOf(setup);
        const checker = curiositySiteCheckerV7(baseOf(setup), mapType);
        for (const at of curiositySitesV7(context, "SEA_SERPENT")) {
          sites += 1;
          const tile = context.board.tiles[at.y * width + at.x];
          expect(tile?.terrain).toBe("DEEP_WATER");
          expect(tile?.resource).toBeNull();
          expect(
            Math.min(at.x, at.y, width - 1 - at.x, width - 1 - at.y),
          ).toBeGreaterThanOrEqual(3);
          for (const capital of context.capitals)
            expect(chebyshev(capital, at)).toBeGreaterThanOrEqual(
              SEA_SERPENT_CAPITAL_DISTANCE_V7,
            );
          for (const village of context.villages)
            expect(chebyshev(village, at)).toBeGreaterThanOrEqual(
              SEA_SERPENT_VILLAGE_DISTANCE_V7,
            );
          expect(
            seaSerpentAreaV7(context.board, at).length,
          ).toBeGreaterThanOrEqual(SEA_SERPENT_AREA_MINIMUM_V7);
          // The independent checker agrees (the strait and the sail rules).
          expect(checker("SEA_SERPENT", at, [])).toBeNull();
        }
      }
    expect(sites).toBeGreaterThan(0);
  });

  it("keeps 6 from every other curiosity tile, placed before or after it", () => {
    const setup = setupOf(0, "ARCHIPELAGO", 25);
    const context = contextOf(setup);
    const serpentSites = curiositySitesV7(context, "SEA_SERPENT");
    const home = serpentSites[0] as CoordV7;
    const placed: PlacedCuriosityV7[] = [{ kind: "SEA_SERPENT", at: home }];
    // After it: no other kind within 5 of its home.
    for (const kind of ["WRECK", "LOST_EXPEDITION", "FOUNTAIN"] as const)
      for (const at of curiositySitesV7(context, kind, placed))
        expect(chebyshev(at, home), kind).toBeGreaterThanOrEqual(
          SEA_SERPENT_SPACING_V7,
        );
    // Before it: no home within 5 of another curiosity tile.
    const wreck = curiositySitesV7(context, "WRECK")[0] as CoordV7;
    for (const at of curiositySitesV7(context, "SEA_SERPENT", [
      { kind: "WRECK", at: wreck },
    ]))
      expect(chebyshev(at, wreck)).toBeGreaterThanOrEqual(
        SEA_SERPENT_SPACING_V7,
      );
    // Two land kinds keep the plain 5.
    const fountain = curiositySitesV7(context, "FOUNTAIN")[0];
    if (fountain !== undefined) {
      const near = curiositySitesV7(context, "SHRINE", [
        { kind: "FOUNTAIN", at: fountain },
      ]);
      expect(near.every((at) => chebyshev(at, fountain) >= 5)).toBe(true);
    }
  });

  /** Replays the stream of section 3.1 on a board with no camp. */
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
      if (chosen.kind === "DOWNED_SAUCER" || chosen.kind === "GRAVEYARD")
        throw new Error("a camp on a Serpent pin");
    }
    return { kinds, placed };
  }

  for (const [seed, mapType, width, expected] of [
    [4, "CONTINENTS", 20, ["SEA_SERPENT", "WRECK"]],
    [0, "ARCHIPELAGO", 20, ["SEA_SERPENT", "WRECK"]],
    [1, "ARCHIPELAGO", 20, ["SEA_SERPENT", "LOST_EXPEDITION"]],
  ] as const)
    it(`draws it in the stream order: ${mapType} ${width} seed ${seed}`, () => {
      const setup = setupOf(seed, mapType, width);
      const generated = generateInitialMapV7(setup);
      if (!generated.ok) throw new Error("map");
      const replayed = replay(setup);
      expect([...replayed.kinds].sort()).toEqual([...expected].sort());
      const home = replayed.placed.find(
        (entry) => entry.kind === "SEA_SERPENT",
      );
      expect(generated.map.neutrals).toEqual([
        { breed: "SEA_SERPENT", home: home?.at, at: home?.at },
      ]);
      expect(
        generated.map.curiosities.map((marker) => ({
          kind: marker.kind,
          at: marker.at,
        })),
      ).toEqual(
        replayed.placed
          .filter((entry) => entry.kind !== "SEA_SERPENT")
          .sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x),
      );
      checkCuriosityPlacementV7(
        generated.map,
        baseOf(setup),
        mapType,
        curiosityTargetCountV7(width, curiosityRandomStateV7(seed)).count,
        setup.factions,
      );
    });

  it("creates the Serpent afloat at full HP after every other entity", () => {
    const created = createInitialMapStateV7(setupOf(4, "CONTINENTS", 20));
    if (!created.ok) throw new Error("state");
    const state = created.state;
    expect(parseGameStateV7(state)).not.toBeNull();
    const entry = state.monsters.find((other) => other.breed === "SEA_SERPENT");
    const unit = state.units.find((other) => other.id === entry?.unitId);
    expect(unit).toMatchObject({
      role: "BATTLESHIP",
      form: "NAVAL",
      hp: NEUTRAL_ROLE_RULES_V7.SEA_SERPENT.maxHp,
      at: entry?.home,
    });
    expect(unit?.id).toBe(state.nextEntityId - 1);
    // No other danger shares its board.
    expect(
      state.monsters.filter((other) => other.breed !== "SEA_SERPENT"),
    ).toEqual([]);
    expect(
      state.curiosities.some(
        (marker) =>
          marker.kind === "DOWNED_SAUCER" || marker.kind === "GRAVEYARD",
      ),
    ).toBe(false);
  });

  it("with the option off, leaves the Serpent's boards as the generator made them", () => {
    for (const [seed, mapType] of [
      [4, "CONTINENTS"],
      [0, "ARCHIPELAGO"],
    ] as const) {
      const setup = setupOf(seed, mapType, 20, ["ORIGINAL", "GOBLIN"], false);
      const off = generateInitialMapV7(setup);
      if (!off.ok) throw new Error("map");
      expect(off.map).toEqual(baseOf(setup));
      expect(off.map.neutrals).toEqual([]);
      // With it on, no tile differs.
      const on = generateInitialMapV7({ ...setup, curiosities: true });
      if (!on.ok) throw new Error("map");
      expect(on.map.board).toEqual(off.map.board);
    }
  });
});
