import { describe, expect, it } from "vitest";
import {
  CURIOSITY_DANGER_KINDS_V7,
  CURIOSITY_PLACEMENT_KINDS_V7,
  CURIOSITY_WEIGHTS_V7,
  RULESET_7_ID,
  SAUCER_COMPOSITIONS_V7,
  curiosityGatePairsV7,
  curiosityRandomStateV7,
  curiositySitesV7,
  curiosityTargetCountV7,
  gateSeparationV7,
  generateInitialMapV7,
  type CoordV7,
  type CuriositySiteContextV7,
  type FactionIdV7,
  type MapTypeV7,
  type MatchSetupV7,
  type PlacedCuriosityV7,
} from "../../src/engine/index";
import { nextBounded } from "../../src/engine/random/random";
import { checkCuriosityPlacementV7 } from "../fixtures/v7-curiosity-checker";
import {
  generateInitialMapWithVillageCountV7,
  villageCountV7,
} from "../../src/engine/index";

// Map curiosities round 2 (`pulp_wars-737.14`,
// docs/product/RULESET_7_MAP_CURIOSITIES.md sections 24 and 35.1): the kind
// table's board and seat exclusions, the one-danger rule, the stream order
// (the composition and guard-tile draws, pinned by replaying the draws on
// chosen seeds), and the gate pair's separation and fairness.

function setupOf(
  seed: number,
  mapType: MapTypeV7,
  width: MatchSetupV7["width"],
  factions: readonly FactionIdV7[],
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

/** The site context of a setup's board (generated with the option off). */
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

describe("round-2 generation (section 24)", () => {
  it("never offers a Downed Saucer with a Martian seat or a Graveyard with an Undead seat", () => {
    const plain = setupOf(0, "PANGEA", 20, ["ORIGINAL", "GOBLIN"]);
    const context = contextOf(plain);
    expect(curiositySitesV7(context, "DOWNED_SAUCER").length).toBeGreaterThan(
      0,
    );
    expect(curiositySitesV7(context, "GRAVEYARD").length).toBeGreaterThan(0);
    expect(
      curiositySitesV7(
        { ...context, factions: ["MARTIAN", "GOBLIN"] },
        "DOWNED_SAUCER",
      ),
    ).toEqual([]);
    expect(
      curiositySitesV7(
        { ...context, factions: ["UNDEAD", "GOBLIN"] },
        "GRAVEYARD",
      ),
    ).toEqual([]);
    // The other camp stays possible.
    expect(
      curiositySitesV7(
        { ...context, factions: ["MARTIAN", "GOBLIN"] },
        "GRAVEYARD",
      ).length,
    ).toBeGreaterThan(0);
  });

  it("offers the camps from 16 and the gates and Bigfoot from 20 only", () => {
    const small = contextOf(setupOf(0, "PANGEA", 14, ["ORIGINAL", "GOBLIN"]));
    for (const kind of [
      "DOWNED_SAUCER",
      "GRAVEYARD",
      "GATES",
      "BIGFOOT",
    ] as const)
      expect(curiositySitesV7(small, kind), kind).toEqual([]);
    const sixteen = contextOf(setupOf(0, "PANGEA", 16, ["ORIGINAL", "GOBLIN"]));
    expect(curiositySitesV7(sixteen, "GATES")).toEqual([]);
    expect(curiositySitesV7(sixteen, "BIGFOOT")).toEqual([]);
    expect(curiosityGatePairsV7(sixteen)).toEqual([]);
  });

  it("places at most one danger and obeys the checker on 25 x 25 boards", () => {
    let dangers = 0;
    for (let seed = 0; seed < 12; seed += 1)
      for (const mapType of ["PANGEA", "LAKES", "DRY_LAND"] as const) {
        const setup = setupOf(seed, mapType, 25, [
          "ORIGINAL",
          "GOBLIN",
          "DINOSAUR",
        ]);
        const on = generateInitialMapV7(setup);
        const base = generateInitialMapWithVillageCountV7(
          setup,
          villageCountV7(setup),
          "CAPITAL_DOMAINS_RIFTS",
        );
        if (!on.ok || !base.ok) throw new Error("map");
        const placed = checkCuriosityPlacementV7(
          on.map,
          base.map,
          mapType,
          curiosityTargetCountV7(25, curiosityRandomStateV7(seed)).count,
          setup.factions,
        );
        const kinds = new Set(placed.map((entry) => entry.kind));
        const here = CURIOSITY_DANGER_KINDS_V7.filter((kind) =>
          kinds.has(kind),
        ).length;
        expect(here).toBeLessThanOrEqual(1);
        dangers += here;
      }
    expect(dangers).toBeGreaterThan(0);
  });

  /**
   * Replays the stream of section 24.1 on a board: the count draw, then per
   * curiosity the kind draw, the site (or pair) draw, and a camp's
   * composition and guard-tile draws.
   */
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
    const guards: { breed: string; at: CoordV7 }[] = [];
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
      if (chosen.kind === "DOWNED_SAUCER" || chosen.kind === "GRAVEYARD") {
        const centre = site[0] as CoordV7;
        const breeds =
          chosen.kind === "DOWNED_SAUCER"
            ? (SAUCER_COMPOSITIONS_V7[draw(4)] as readonly string[])
            : ["ZOMBIE", "ZOMBIE"];
        const centers = [...context.capitals, ...context.villages];
        const free: CoordV7[] = [];
        for (let dy = -1; dy <= 1; dy += 1)
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue;
            const at = { x: centre.x + dx, y: centre.y + dy };
            const tile = context.board.tiles[at.y * context.board.width + at.x];
            if (
              tile === undefined ||
              tile.site !== null ||
              !["GRASS", "FOREST", "MOUNTAIN"].includes(tile.terrain) ||
              centers.some((center) => chebyshev(center, at) < 3) ||
              context.treasureChests.some(
                (chest) => chest.x === at.x && chest.y === at.y,
              )
            )
              continue;
            free.push(at);
          }
        for (const breed of breeds) {
          const index = draw(free.length);
          guards.push({ breed, at: free[index] as CoordV7 });
          free.splice(index, 1);
        }
      }
    }
    return { kinds, placed, guards };
  }

  for (const [seed, mapType, width] of [
    [0, "PANGEA", 20],
    [30, "PANGEA", 20],
    [1, "PANGEA", 20],
    [17, "DRY_LAND", 25],
  ] as const)
    it(`draws in the stream order of section 24.1: ${mapType} ${width} seed ${seed}`, () => {
      const setup = setupOf(seed, mapType, width, ["ORIGINAL", "GOBLIN"]);
      const generated = generateInitialMapV7(setup);
      if (!generated.ok) throw new Error("map");
      const expected = replay(setup);
      const tiles = (kind: string) =>
        expected.placed
          .filter((entry) => entry.kind === kind)
          .map((entry) => entry.at);
      for (const marker of generated.map.curiosities) {
        const kind = marker.kind === "GATE" ? "GATES" : marker.kind;
        expect(tiles(kind), marker.kind).toContainEqual(marker.at);
      }
      expect(
        generated.map.neutrals
          .filter(
            (entry) =>
              entry.breed !== "GIANT_SPIDER" && entry.breed !== "BIGFOOT",
          )
          .map((entry) => ({ breed: entry.breed, at: entry.at })),
      ).toEqual(expected.guards);
      expect(generated.map.neutrals.length).toBeGreaterThan(
        seed === 17 ? 0 : 1,
      );
    });

  it("places a Graveyard with two Zombies on its neighbours: PANGEA 20 seed 1", () => {
    const setup = setupOf(1, "PANGEA", 20, ["ORIGINAL", "GOBLIN"]);
    const generated = generateInitialMapV7(setup);
    if (!generated.ok) throw new Error("map");
    const graveyard = generated.map.curiosities.find(
      (curiosity) => curiosity.kind === "GRAVEYARD",
    );
    expect(graveyard).toBeDefined();
    const zombies = generated.map.neutrals.filter(
      (entry) => entry.breed === "ZOMBIE",
    );
    expect(zombies).toHaveLength(2);
    for (const zombie of zombies) {
      expect(zombie.home).toEqual(graveyard?.at);
      expect(chebyshev(zombie.at, zombie.home)).toBe(1);
    }
  });

  it("sets the gates on opposite sides, fair to every start", () => {
    const setup = setupOf(17, "DRY_LAND", 25, ["ORIGINAL", "GOBLIN"]);
    const generated = generateInitialMapV7(setup);
    if (!generated.ok) throw new Error("map");
    const gates = generated.map.curiosities.filter(
      (curiosity) => curiosity.kind === "GATE",
    );
    expect(gates).toHaveLength(2);
    const [a, b] = gates as [(typeof gates)[number], (typeof gates)[number]];
    expect(gateSeparationV7(25)).toBe(17);
    expect(gateSeparationV7(20)).toBe(14);
    expect(chebyshev(a.at, b.at)).toBeGreaterThanOrEqual(17);
    const nearer = generated.map.capitals.map((capital) =>
      Math.min(chebyshev(capital, a.at), chebyshev(capital, b.at)),
    );
    expect(Math.max(...nearer) - Math.min(...nearer)).toBeLessThanOrEqual(4);
    expect(a.kind === "GATE" && b.kind === "GATE" && a.partner).toEqual(b.at);
  });
});
