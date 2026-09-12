import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import {
  canonicalHash,
  cityId,
  createPublicCommandWorkV7,
  createPublicPlanningWorkV7,
  playerId,
  previewEconomicV7,
  queryAiReadyCommandsV7,
  queryPlayerCommandsV7,
  queryPublicEconomicPotentialsV7,
  scorePublicSpatialPlanV7,
  spatialContributionAtV7,
  type EconomyGraphV7,
  type ImprovementIdV7,
  type PlayerViewV7,
  type PublicPlanningWorkResultV7,
} from "../../src/engine/index";

const RETAINED_VIEW = JSON.parse(
  readFileSync("tests/fixtures/ruleset-v7-late-public-view.json", "utf8"),
) as PlayerViewV7;

describe("ruleset-7 late public query performance", () => {
  it("preserves the retained complete ordered command surface within a bounded cold query", () => {
    const view = structuredClone(RETAINED_VIEW);
    const started = performance.now();
    const commands = queryPlayerCommandsV7(view);
    const elapsed = performance.now() - started;

    expect(commands).toHaveLength(59);
    expect(canonicalHash(commands)).toBe(
      "ba23a6ff57e659759e96e3bd5f0fd112fdb201ae619ab2dd2c1b369dead051b6",
    );
    expect(canonicalHash(queryAiReadyCommandsV7(view))).toBe(
      "448516d19782425f54298a38e555736812313ed2fd45837e8dad98418a13384d",
    );
    expect(
      canonicalHash(
        commands.map((command) => ({
          command,
          result: previewEconomicV7(view, command),
        })),
      ),
    ).toBe("72541a22582328ecd7023ba06d72fa8587837d1ed42df4806c69b7fcfdc00073");
    expect(elapsed).toBeLessThan(250);

    const incrementalView = structuredClone(RETAINED_VIEW);
    const work = createPublicCommandWorkV7(incrementalView);
    expect(work.advance(3)).toMatchObject({ done: false, operations: 3 });
    expect(canonicalHash(queryPlayerCommandsV7(incrementalView))).toBe(
      canonicalHash(commands),
    );
    let progress = work.advance(1);
    while (!progress.done) {
      expect(progress.operations).toBeLessThanOrEqual(1);
      progress = work.advance(1);
    }
    expect(canonicalHash(progress.commands)).toBe(canonicalHash(commands));

    const chunked = createPublicCommandWorkV7(structuredClone(RETAINED_VIEW));
    let chunkedProgress = chunked.advance(37);
    while (!chunkedProgress.done) chunkedProgress = chunked.advance(37);
    expect(canonicalHash(chunkedProgress.commands)).toBe(
      canonicalHash(commands),
    );
  });

  it(
    "drains exact potentials and scores independently of chunking and interleaving",
    { timeout: 15_000 },
    () => {
      const expectedView = structuredClone(RETAINED_VIEW);
      const expectedCommands = queryPlayerCommandsV7(expectedView);
      const expected = {
        potentials: queryPublicEconomicPotentialsV7(expectedView),
        scores: expectedCommands.map((command) => ({
          command,
          score: scorePublicSpatialPlanV7(expectedView, command),
        })),
      };
      const leftView = structuredClone(RETAINED_VIEW);
      const rightView = structuredClone(RETAINED_VIEW);
      const left = createPublicPlanningWorkV7(
        leftView,
        queryPlayerCommandsV7(leftView),
      );
      const right = createPublicPlanningWorkV7(
        rightView,
        queryPlayerCommandsV7(rightView),
      );
      expect(left.advance(3)).toMatchObject({ done: false, operations: 3 });
      expect(queryPublicEconomicPotentialsV7(leftView)).toEqual(
        expected.potentials,
      );
      const interleavedCommand = required(
        expectedCommands.find((command) => command.kind === "BUILD_FORGE"),
      );
      expect(scorePublicSpatialPlanV7(leftView, interleavedCommand)).toBe(
        required(
          expected.scores.find(({ command }) => command === interleavedCommand),
        ).score,
      );
      let leftResult: PublicPlanningWorkResultV7 | null = null;
      let rightResult: PublicPlanningWorkResultV7 | null = null;
      while (leftResult === null || rightResult === null) {
        if (leftResult === null) {
          const progress = left.advance(1);
          expect(progress.operations).toBeLessThanOrEqual(1);
          leftResult = progress.result;
        }
        if (rightResult === null) {
          const progress = right.advance(97);
          expect(progress.operations).toBeLessThanOrEqual(97);
          rightResult = progress.result;
        }
      }

      expect(canonicalHash(leftResult)).toBe(canonicalHash(expected));
      expect(canonicalHash(rightResult)).toBe(canonicalHash(expected));
      expect(canonicalHash(leftResult.potentials)).toBe(
        "4d278cc40e2e574c233a519472c6355b5f108afbdd45e5e1c744471a55f01064",
      );
      expect(canonicalHash(leftResult.scores)).toBe(
        "cce0d0d94394552a65b417279c68a7a349d4114255083321b528bfa145f1ee61",
      );
      expect(queryPublicEconomicPotentialsV7(leftView)).toBe(
        leftResult.potentials,
      );
    },
  );

  it("handles empty, duplicate, and incomplete-view work explicitly", () => {
    const emptyResult = drain(
      createPublicPlanningWorkV7(structuredClone(RETAINED_VIEW), []),
      31,
    );
    expect(emptyResult.scores).toEqual([]);

    const duplicateView = structuredClone(RETAINED_VIEW);
    const command = required(
      queryPlayerCommandsV7(duplicateView).find(
        (candidate) => candidate.kind === "BUILD_FORGE",
      ),
    );
    const duplicate = drain(
      createPublicPlanningWorkV7(duplicateView, [command, command]),
      13,
    );
    expect(duplicate.scores).toEqual([
      { command, score: duplicate.scores[0]?.score },
      { command, score: duplicate.scores[0]?.score },
    ]);

    const incompleteBase = structuredClone(RETAINED_VIEW);
    const viewerEntry = required(
      incompleteBase.leaderboard.find((entry) => entry.isViewer),
    );
    const incomplete = {
      ...incompleteBase,
      leaderboard: incompleteBase.leaderboard.map((entry) =>
        entry === viewerEntry
          ? { ...entry, cityCount: entry.cityCount + 1 }
          : entry,
      ),
    };
    const incompleteResult = drain(
      createPublicPlanningWorkV7(incomplete, [command, command]),
      1,
    );
    expect(incompleteResult.scores).toEqual([
      { command, score: 0 },
      { command, score: 0 },
    ]);
    expect(
      incompleteResult.potentials.every(
        (potential) =>
          potential.targets === 0 && potential.bestSpatialScore === 0,
      ),
    ).toBe(true);
  });

  it("keys movement preparation to the exact changed public view", () => {
    const original = structuredClone(RETAINED_VIEW);
    expect(canonicalHash(queryPlayerCommandsV7(original))).toBe(
      "ba23a6ff57e659759e96e3bd5f0fd112fdb201ae619ab2dd2c1b369dead051b6",
    );
    const firstMove = required(
      queryPlayerCommandsV7(original).find(
        (command) => command.kind === "MOVE",
      ),
    );
    if (firstMove.kind !== "MOVE") throw new Error("Move fixture malformed");
    const changed = {
      ...original,
      units: original.units.map((unit) =>
        unit.id === firstMove.unitId
          ? {
              ...unit,
              activation: { ...unit.activation, handled: true },
            }
          : unit,
      ),
    };
    const changedCommands = queryPlayerCommandsV7(changed);
    expect(canonicalHash(changedCommands)).toBe(
      canonicalHash(queryPlayerCommandsV7(structuredClone(changed))),
    );
    expect(canonicalHash(changedCommands)).toBe(
      "f9188321e07e38dcb1a456fef83442687d33137ace794ba106633a036025cd1a",
    );
  });

  it("keeps empty-center spatial evaluation exact for every building type", () => {
    const graph = spatialPremiseGraph();
    const target = { x: 2, y: 2 };
    const kinds = [
      "WINDMILL",
      "SAWMILL",
      "FORGE",
      "WORKSHOP",
      "GRAND_WORKS",
      "MARKET",
    ] as const;
    for (const improvement of kinds) {
      const placed = withImprovement(graph, target, improvement);
      expect(spatialContributionAtV7(graph, target, improvement)).toEqual(
        spatialContributionAtV7(placed, target, improvement),
      );
    }
    expect(
      spatialContributionAtV7(graph, target, "GRAND_WORKS").placementCount,
    ).toBe(1);
    expect(spatialContributionAtV7(graph, target, "FORGE").population).toBe(0);
    expect(
      spatialContributionAtV7(graph, target, "WORKSHOP").distinctTypes,
    ).toEqual(["FARM", "MINE"]);
  });

  it("invalidates spatial graph indexes across road and ownership changes", () => {
    const graph = spatialPremiseGraph();
    const marketAt = { x: 2, y: 2 };
    const workshopBefore = spatialContributionAtV7(graph, marketAt, "WORKSHOP");
    const changedOwnership = {
      ...graph,
      cities: graph.cities.map((city) =>
        city.id === cityId(2) ? { ...city, ownerId: playerId(2) } : city,
      ),
    };
    const workshopAfter = spatialContributionAtV7(
      changedOwnership,
      marketAt,
      "WORKSHOP",
    );
    expect(workshopBefore.distinctTypes).toEqual(["FARM", "MINE"]);
    expect(workshopAfter.distinctTypes).toEqual(["FARM"]);
    expect(workshopAfter).toEqual(
      spatialContributionAtV7(
        structuredClone(changedOwnership),
        marketAt,
        "WORKSHOP",
      ),
    );
    expect(
      spatialContributionAtV7(graph, marketAt, "WORKSHOP").distinctTypes,
    ).toEqual(["FARM", "MINE"]);

    const roadConnected = withImprovement(graph, marketAt, "MARKET");
    const disconnected = {
      ...roadConnected,
      board: {
        ...roadConnected.board,
        tiles: roadConnected.board.tiles.map((tile) =>
          tile.at.x === 1 && tile.at.y === 2 ? { ...tile, road: false } : tile,
        ),
      },
    };
    expect(spatialContributionAtV7(roadConnected, marketAt, "MARKET")).toEqual(
      spatialContributionAtV7(
        structuredClone(roadConnected),
        marketAt,
        "MARKET",
      ),
    );
    expect(
      spatialContributionAtV7(roadConnected, marketAt, "MARKET")
        .capitalRoadConnected,
    ).toBe(true);
    expect(
      spatialContributionAtV7(disconnected, marketAt, "MARKET")
        .capitalRoadConnected,
    ).toBe(false);
  });
});

function spatialPremiseGraph(): EconomyGraphV7 {
  const width = 5;
  const height = 5;
  const firstCityId = cityId(1);
  const secondCityId = cityId(2);
  const enemyCityId = cityId(3);
  const ownerId = playerId(1);
  const enemyId = playerId(2);
  return {
    board: {
      width,
      height,
      tiles: Array.from({ length: width * height }, (_, index) => {
        const at = { x: index % width, y: Math.floor(index / width) };
        const cityId =
          (at.x === 1 && at.y === 3) || (at.x === 3 && at.y === 2)
            ? secondCityId
            : at.x === 3 && at.y === 3
              ? enemyCityId
              : firstCityId;
        const improvement =
          at.x === 1 && at.y === 1
            ? ("FARM" as const)
            : at.x === 1 && at.y === 3
              ? ("MINE" as const)
              : at.x === 2 && at.y === 1
                ? ("WINDMILL" as const)
                : at.x === 3 && at.y === 2
                  ? ("FORGE" as const)
                  : at.x === 3 && at.y === 3
                    ? ("MINE" as const)
                    : null;
        return {
          at,
          improvement,
          road: at.x === 1 && at.y === 2,
          territoryCityId: cityId,
        };
      }),
    },
    cities: [
      {
        id: firstCityId,
        ownerId,
        at: { x: 0, y: 2 },
        isCapital: true,
      },
      {
        id: secondCityId,
        ownerId,
        at: { x: 4, y: 1 },
        isCapital: false,
      },
      {
        id: enemyCityId,
        ownerId: enemyId,
        at: { x: 4, y: 4 },
        isCapital: true,
      },
    ],
  };
}

function withImprovement(
  graph: EconomyGraphV7,
  at: { readonly x: number; readonly y: number },
  improvement: ImprovementIdV7,
): EconomyGraphV7 {
  return {
    ...graph,
    board: {
      ...graph.board,
      tiles: graph.board.tiles.map((tile) =>
        tile.at.x === at.x && tile.at.y === at.y
          ? { ...tile, improvement }
          : tile,
      ),
    },
  };
}

function drain(
  work: ReturnType<typeof createPublicPlanningWorkV7>,
  budget: number,
): PublicPlanningWorkResultV7 {
  for (;;) {
    const progress = work.advance(budget);
    if (progress.result !== null) return progress.result;
  }
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("required fixture value missing");
  return value;
}
