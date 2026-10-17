import { describe, expect, it } from "vitest";
import {
  BASIC_ECONOMIC_ACTIONS_V7,
  FACTION_IDS_V7,
  IMPROVEMENT_IDS_V7,
  MARKET_INCOME_CAP_V7,
  MONUMENT_POPULATION_V7,
  SPATIAL_ECONOMIC_ACTIONS_V7,
  applyCommandV7,
  cityId,
  dockPopulationV7,
  factionTreeV7,
  playerId,
  queryPlayerCommandsV7,
  spatialContributionAtV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type EconomyGraphV7,
  type GameStateV7,
  type ImprovementIdV7,
  type SpatialEconomicCommandKindV7,
  type TileStateV7,
} from "../../src/engine/index";
import {
  MILL_POPULATION_CAPS_V7,
  TECHNOLOGY_CARD_LINE_LIMIT_V7,
  buildCommandImprovementV7,
  buildingRuleTextV7,
} from "../../src/render/building-rules-v7";
import { technologyEffectGroupsV7 } from "../../src/render/dom/app-view-v7";
import { factionBuildingV7 } from "../../src/render/faction-buildings-v7";
import {
  allTechsV7,
  exploredAllV7,
  initialV7,
  replaceTileV7,
} from "../fixtures/v7-builders";

/**
 * Bead pulp_wars-2yc.90 (the user, 2026-10-17: "workshop is never
 * explained"): every technology card that unlocks a building says where it
 * may be built, and the line agrees with the engine's placement rules.
 */

const words = (value: string): string =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word.replace(/^./, (letter) => letter.toUpperCase()))
    .join(" ");

const cardLines = (
  node: ReturnType<typeof factionTreeV7>["nodes"][number],
  faction: (typeof FACTION_IDS_V7)[number],
): readonly string[] =>
  technologyEffectGroupsV7(node.unlocks, faction).flatMap(
    (group) => group.items,
  );

describe("building placement lines (pulp_wars-2yc.90)", () => {
  it("puts a placement line under every building any technology of any faction unlocks", () => {
    const unlocked = new Set<ImprovementIdV7>();
    for (const faction of FACTION_IDS_V7)
      for (const node of factionTreeV7(faction).nodes) {
        const lines = cardLines(node, faction);
        for (const effect of node.unlocks) {
          if (effect.kind !== "COMMAND") continue;
          const improvement = buildCommandImprovementV7(effect.command);
          if (improvement === null) continue;
          unlocked.add(improvement);
          const rule = buildingRuleTextV7(improvement, faction);
          const at = lines.indexOf(rule);
          expect(at, `${faction} ${node.id} ${improvement}`).toBeGreaterThan(0);
          // Right under its "Build" line, which names the faction's own
          // building ("Build Graveyard").
          expect(lines[at - 1]).toMatch(/^Build /);
          expect(rule.length).toBeLessThanOrEqual(
            TECHNOLOGY_CARD_LINE_LIMIT_V7,
          );
          // The faction's own name leads the line.
          const own = factionBuildingV7(improvement, faction);
          if (own !== null) expect(rule.startsWith(`${own.name}:`)).toBe(true);
        }
      }
    // Every improvement but the Monument (an achievement's) comes from a
    // technology, so the check above covers them all.
    expect([...unlocked].sort()).toEqual(
      IMPROVEMENT_IDS_V7.filter((id) => id !== "MONUMENT").sort(),
    );
    // Roads and Field Defense build no improvement.
    expect(buildCommandImprovementV7("BUILD_ROAD")).toBeNull();
    expect(buildCommandImprovementV7("BUILD_FIELD_DEFENSE")).toBeNull();
  });

  it("pins the lines of the shared buildings", () => {
    expect(
      IMPROVEMENT_IDS_V7.map((id) => buildingRuleTextV7(id, null)),
    ).toEqual([
      "Farm: on Grass with Fertile Ground in your borders; +2 population",
      "Lumber Camp: on Forest with no resource in your borders; +1 population",
      "Mine: on Mountain with Ore in your borders; +2 population",
      "Windmill: one per city, next to your Farms; +1 population for each, max 8",
      "Sawmill: one per city, next to your Lumber Camps; +1 population for each, max 8",
      "Forge: one per city, next to your Mines; +1 population for each, max 6",
      "Workshop: one per city, next to your Farm, Lumber Camp or Mine",
      "Market: one per city, next to your Farm, Lumber Camp, Mine or mill; 1–3 Coins",
      "Monument: one per city, built with an achievement; +3 population",
      "Port: on Shallow Water in your borders, next to its city's land, not ice; +1 population",
      "Shipyard: one per city, upgrades one of your active Ports; +1 more population",
    ]);
    // A faction names its own buildings, and the Farms a mill counts.
    expect(buildingRuleTextV7("WINDMILL", "UNDEAD")).toBe(
      "Bone Mill: one per city, next to your Graveyards; +1 population for each, max 8",
    );
    expect(buildingRuleTextV7("WORKSHOP", "DWARF")).toBe(
      "Workshop: one per city, next to your Mushroom Farm, Lumber Camp or Mine",
    );
  });

  it("drops a mill's formula line the placement line repeats; a Workshop keeps its own", () => {
    const tree = factionTreeV7("ORIGINAL");
    const lines = (id: string): readonly string[] => {
      const node = tree.nodes.find((item) => item.id === id);
      if (node === undefined) throw new Error(`${id} missing`);
      return cardLines(node, "ORIGINAL");
    };
    expect(lines("MILLING")).toEqual([
      "Build windmill",
      "Windmill: one per city, next to your Farms; +1 population for each, max 8",
      "Windmills heal adjacent units for 6 HP at Start Turn",
    ]);
    expect(lines("DRILL")).toEqual([
      "Build workshop",
      "Workshop: one per city, next to your Farm, Lumber Camp or Mine",
      "Workshop: +1, and +1 for each kind of farm, lumber camp or mine next to it",
      "Reveals Ore",
      "+2 Coins for each city you capture",
    ]);
  });

  it("states the terrain, resource and population of the basic buildings as the engine has them", () => {
    for (const [kind, improvement] of [
      ["BUILD_FARM", "FARM"],
      ["BUILD_LUMBER_CAMP", "LUMBER_CAMP"],
      ["BUILD_MINE", "MINE"],
    ] as const) {
      const rule = BASIC_ECONOMIC_ACTIONS_V7[kind];
      const line = buildingRuleTextV7(improvement, null);
      expect(line).toContain(`on ${words(rule.terrain)} with `);
      expect(line).toContain(
        rule.resource === null ? "no resource" : words(rule.resource),
      );
      expect(line).toContain(`+${rule.population} population`);
      expect(line).toContain("in your borders");
    }
    expect(buildingRuleTextV7("MARKET", null)).toContain(
      `1–${MARKET_INCOME_CAP_V7} Coins`,
    );
    expect(buildingRuleTextV7("MONUMENT", null)).toContain(
      `+${MONUMENT_POPULATION_V7} population`,
    );
    expect(buildingRuleTextV7("PORT", null)).toContain(
      `+${dockPopulationV7("PORT", 0)} population`,
    );
    expect(buildingRuleTextV7("SHIPYARD", null)).toContain(
      `+${dockPopulationV7("SHIPYARD", 0) - dockPopulationV7("PORT", 0)} more population`,
    );
  });

  it("states the mills' and the Workshop's output as the engine counts it", () => {
    // A 3x3 board of one city: the building in the middle, `around` on
    // the eight tiles about it.
    const graph = (
      center: ImprovementIdV7,
      around: readonly (ImprovementIdV7 | null)[],
    ): EconomyGraphV7 => ({
      board: {
        width: 3,
        height: 3,
        tiles: Array.from({ length: 9 }, (_, index) => {
          const ring = index < 4 ? index : index - 1;
          return {
            at: { x: index % 3, y: Math.floor(index / 3) },
            improvement: index === 4 ? center : (around[ring] ?? null),
            road: false,
            territoryCityId: cityId(1),
          };
        }),
      },
      cities: [
        {
          id: cityId(1),
          ownerId: playerId(1),
          at: { x: 0, y: 0 },
          isCapital: true,
        },
      ],
    });
    const middle = { x: 1, y: 1 };
    for (const [mill, feeder] of [
      ["WINDMILL", "FARM"],
      ["SAWMILL", "LUMBER_CAMP"],
      ["FORGE", "MINE"],
    ] as const) {
      const full = spatialContributionAtV7(
        graph(mill, Array(8).fill(feeder)),
        middle,
        mill,
      );
      expect(full.population).toBe(MILL_POPULATION_CAPS_V7[mill]);
      expect(buildingRuleTextV7(mill, null)).toContain(
        `max ${MILL_POPULATION_CAPS_V7[mill]}`,
      );
      const one = spatialContributionAtV7(graph(mill, [feeder]), middle, mill);
      expect([one.population, one.placementCount]).toEqual([1, 1]);
      // "next to your Farms": none next to it is below the minimum.
      expect(
        spatialContributionAtV7(graph(mill, []), middle, mill).placementCount,
      ).toBeLessThan(
        SPATIAL_ECONOMIC_ACTIONS_V7[`BUILD_${mill}`].placementMinimum,
      );
    }
    // "+1, and +1 for each kind": 2 with one kind, 4 with all three.
    expect(
      spatialContributionAtV7(
        graph("WORKSHOP", ["FARM", "FARM"]),
        middle,
        "WORKSHOP",
      ).population,
    ).toBe(2);
    expect(
      spatialContributionAtV7(
        graph("WORKSHOP", ["FARM", "LUMBER_CAMP", "MINE"]),
        middle,
        "WORKSHOP",
      ).population,
    ).toBe(4);
  });

  it("matches the reducer: one per city, and only next to a building it counts", () => {
    // The basic building each one counts, built by the reducer on its
    // terrain and resource.
    const feeders: Readonly<
      Record<
        SpatialEconomicCommandKindV7,
        readonly [
          "BUILD_FARM" | "BUILD_LUMBER_CAMP" | "BUILD_MINE",
          Pick<TileStateV7, "terrain" | "resource">,
        ]
      >
    > = {
      BUILD_WINDMILL: [
        "BUILD_FARM",
        { terrain: "GRASS", resource: "FERTILE_GROUND" },
      ],
      BUILD_SAWMILL: [
        "BUILD_LUMBER_CAMP",
        { terrain: "FOREST", resource: null },
      ],
      BUILD_FORGE: ["BUILD_MINE", { terrain: "MOUNTAIN", resource: "ORE" }],
      BUILD_WORKSHOP: [
        "BUILD_FARM",
        { terrain: "GRASS", resource: "FERTILE_GROUND" },
      ],
      BUILD_MARKET: [
        "BUILD_FARM",
        { terrain: "GRASS", resource: "FERTILE_GROUND" },
      ],
    };
    // A building may grow the city: take every reward it offers.
    const settled = (input: GameStateV7): GameStateV7 => {
      let state = input;
      for (;;) {
        const reward = queryPlayerCommandsV7(
          viewForV7(state, state.humanPlayerId),
        ).find((command) => command.kind === "CHOOSE_CITY_REWARD");
        if (reward === undefined) return state;
        const chosen = applyCommandV7(state, state.humanPlayerId, reward);
        if (!chosen.accepted) throw new Error("reward refused");
        state = chosen.state;
      }
    };
    for (const kind of Object.keys(
      SPATIAL_ECONOMIC_ACTIONS_V7,
    ) as SpatialEconomicCommandKindV7[]) {
      let state: GameStateV7 = exploredAllV7(allTechsV7(initialV7(101)));
      const city = state.cities.find(
        (item) => item.ownerId === state.humanPlayerId,
      );
      if (city === undefined) throw new Error("city missing");
      const at = (dx: number, dy: number): CoordV7 => ({
        x: city.at.x + dx,
        y: city.at.y + dy,
      });
      // The city's ring, bare Grass.
      for (const [dx, dy] of [
        [-1, -1],
        [0, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [0, 1],
        [1, 1],
      ] as const)
        state = replaceTileV7(state, at(dx, dy), {
          terrain: "GRASS",
          resource: null,
          improvement: null,
          road: false,
          site: null,
        });
      for (const [dx, dy] of [
        [-1, -1],
        [-1, 0],
        [-1, 1],
        [1, 0],
      ] as const)
        expect(
          state.board.tiles.find(
            (tile) => tile.at.x === at(dx, dy).x && tile.at.y === at(dx, dy).y,
          )?.territoryCityId,
        ).toBe(city.id);
      const build = (where: CoordV7) =>
        applyCommandV7(state, state.humanPlayerId, {
          kind,
          at: where,
        } as CommandV7);
      // No building it counts next to it.
      const lonely = build(at(1, 0));
      expect(lonely.accepted).toBe(false);
      if (!lonely.accepted)
        expect(lonely.error.code, kind).toBe("PLACEMENT_REQUIREMENT_UNMET");
      const [feederKind, feederTile] = feeders[kind];
      state = replaceTileV7(state, at(-1, 0), feederTile);
      const feeder = applyCommandV7(state, state.humanPlayerId, {
        kind: feederKind,
        at: at(-1, 0),
      });
      if (!feeder.accepted) throw new Error(`${feederKind} refused`);
      state = settled(feeder.state);
      const first = build(at(-1, -1));
      expect(first.accepted ? "ok" : first.error, kind).toBe("ok");
      if (!first.accepted) continue;
      state = settled(first.state);
      // A second one in the same city, next to the same feeder.
      const second = build(at(-1, 1));
      expect(second.accepted).toBe(false);
      if (!second.accepted)
        expect(second.error.code, kind).toBe("CITY_BUILDING_LIMIT");
      expect(
        buildingRuleTextV7(SPATIAL_ECONOMIC_ACTIONS_V7[kind].improvement, null),
      ).toContain("one per city, next to your ");
    }
  });
});
