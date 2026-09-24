import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { upgradeRetainedPublicViewV7 } from "../../scripts/ruleset-v7-late-public-view-contract";
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

const RETAINED_LAND_VIEW = JSON.parse(
  readFileSync("tests/fixtures/ruleset-v7-late-public-view.json", "utf8"),
) as PlayerViewV7;
const RETAINED_VIEW = upgradeRetainedPublicViewV7(RETAINED_LAND_VIEW);

describe("ruleset-7 late public query performance", () => {
  it("preserves the retained complete ordered command surface within a bounded cold query", () => {
    const view = structuredClone(RETAINED_VIEW);
    const started = performance.now();
    const commands = queryPlayerCommandsV7(view);
    const elapsed = performance.now() - started;

    expect(commands).toHaveLength(76);
    expect(canonicalHash(commands)).toBe(
      "80e8dd25e43a7a6cda5ebded73675123bc2f2842dbcb4b07a7f9a9d2182c3ec0",
    );
    expect(
      commands.flatMap((command) =>
        command.kind === "BUILD_FIELD_DEFENSE" ? [command.unitId] : [],
      ),
    ).toEqual([31, 32, 33]);
    expect(
      commands.flatMap((command) =>
        command.kind === "TRAIN" && command.cityId === cityId(9)
          ? [command.role]
          : [],
      ),
    ).toEqual(["FIGHTER", "GUARD", "HEAVY", "BREACHER"]);
    expect(
      commands.flatMap((command) =>
        command.kind === "TRAIN" && command.role === "BREACHER"
          ? [command.cityId]
          : [],
      ),
    ).toEqual([cityId(3), cityId(9), cityId(16)]);
    expect(commands.filter(isRevision8MergedUnlockCommand)).toHaveLength(9);
    expect(commands.filter(isNavalExpansionCommand)).toEqual([
      { kind: "RESEARCH", tech: "SHORECRAFT" },
    ]);
    expect(canonicalHash(commands.filter(isRetainedLandCommand))).toBe(
      "9c4720a9819d396bb9c66490e49b8070fea5ca6b9702ecbb01c5cc53ea31b0c7",
    );
    expect(canonicalHash(queryAiReadyCommandsV7(view))).toBe(
      "27d9d49d9b60717d7b4f367afe353df480fcbc70cd4a08c0176bca16fd98223d",
    );
    expect(
      canonicalHash(
        commands.map((command) => ({
          command,
          result: previewEconomicV7(view, command),
        })),
      ),
    ).toBe("7683b41e37d40306f4ca8c848a612ac5ab57e69d89d3bfcb1b0bab21c7e536b9");
    expect(
      canonicalHash(
        commands.filter(isRetainedLandCommand).map((command) => ({
          command,
          result: previewEconomicV7(view, command),
        })),
      ),
    ).toBe("a3393e56a3cbb11a026368b7fa9dc19ee9c08ac57f2aa9eb98eff0f2df4fb183");
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
        "47577f5151d8689e4daf9601796a847cf18a92d318fb2559b3d6f73a7e4fad62",
      );
      expect(
        leftResult.potentials.find(
          (potential) => potential.command === "HARVEST_FISH",
        ),
      ).toEqual({
        command: "HARVEST_FISH",
        targets: 0,
        bestSpatialScore: 0,
      });
      expect(
        canonicalHash(
          leftResult.potentials.filter(
            (potential) => potential.command !== "HARVEST_FISH",
          ),
        ),
      ).toBe(
        "c9e77b4d46b2725afeffeec03d70d6699655a8ce6def19953c6644ba57430467",
      );
      expect(canonicalHash(leftResult.scores)).toBe(
        "c95320c980edc7bde7ba91cb71c68127723ddfe491540fe0113f28dc0d1b40a8",
      );
      const revision8Scores = leftResult.scores.filter(({ command }) =>
        isRevision8MergedUnlockCommand(command),
      );
      expect(revision8Scores).toHaveLength(9);
      expect(revision8Scores.every(({ score }) => score === 0)).toBe(true);
      expect(
        canonicalHash(
          leftResult.scores.filter(({ command }) =>
            isRetainedLandCommand(command),
          ),
        ),
      ).toBe(
        "be14cac3f2bf5d280f4766a35989a5e359a515e30575eba80f16ed89c3446bca",
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
      "80e8dd25e43a7a6cda5ebded73675123bc2f2842dbcb4b07a7f9a9d2182c3ec0",
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
      "b1b1d4fbccf2d208b70592489aac3558331ffed138395e7c8fac978388c95b47",
    );
    expect(canonicalHash(changedCommands.filter(isRetainedLandCommand))).toBe(
      "a83c4c714194335ca49fc679c6029a953c5380f27ae7b04bfa24b03e64f3f816",
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
      "MARKET",
    ] as const;
    for (const improvement of kinds) {
      const placed = withImprovement(graph, target, improvement);
      expect(spatialContributionAtV7(graph, target, improvement)).toEqual(
        spatialContributionAtV7(placed, target, improvement),
      );
    }
    expect(spatialContributionAtV7(graph, target, "FORGE")).toMatchObject({
      population: 1,
      contributingTiles: [{ x: 1, y: 3 }],
    });
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
    ).toBe(false);
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

function isNavalExpansionCommand(
  command: ReturnType<typeof queryPlayerCommandsV7>[number],
): boolean {
  return command.kind === "RESEARCH" && command.tech === "SHORECRAFT";
}

function isRetainedLandCommand(
  command: ReturnType<typeof queryPlayerCommandsV7>[number],
): boolean {
  return !isNavalExpansionCommand(command);
}

function isRevision8MergedUnlockCommand(
  command: ReturnType<typeof queryPlayerCommandsV7>[number],
): boolean {
  if (command.kind === "BUILD_FIELD_DEFENSE") return true;
  return (
    command.kind === "TRAIN" &&
    (command.cityId === cityId(9) || command.role === "BREACHER")
  );
}
