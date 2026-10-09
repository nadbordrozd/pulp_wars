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
import { withRevision12AiReadyOrdinalsV7 } from "../fixtures/v7-revision12-command-ordinals";

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

    // Tuning 4 (`pulp_wars-w49.3`): 63, without the one RESEARCH the view
    // could afford (12 Coins, five technologies: a tier 1 now costs 13).
    // Tuning 5 (`pulp_wars-w49.4`): 65, with the Swordsman on offer in the
    // view's two cities that can train (it owns Engineering).
    // Tuning 6 (`pulp_wars-w49.6`): 71, with the six technologies its 12
    // Coins buy again (research costs 1 Coin for each technology owned).
    // The economy rejig (`pulp_wars-w49.16`, 7r54): 66. Research is priced
    // by the cities owned, and the view has four: a tier 1 costs 8 and a
    // tier 2 costs 13, so its 12 Coins buy Scouting alone (one RESEARCH
    // command instead of six).
    // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): 64. The view owns
    // the root and not Fortification, where the Guard is now, so its two
    // cities that can train no longer offer the Guard.
    expect(commands).toHaveLength(64);
    expect(canonicalHash(commands)).toBe(
      // Tuning 6 (`pulp_wars-w49.6`): research costs 1 Coin for each
      // technology owned, so the retained view's 12 Coins buy a technology
      // again and six RESEARCH commands are offered (was 83c9a2…466e).
      // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
      // 9fd994…1b96).
      // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
      // 4b8b7c…d029).
      "4eb8ff841a02d2e31170dfa3038b8cbc826f53afc6e23ef8ccb920722670e1fc",
    );
    expect(
      commands.flatMap((command) =>
        command.kind === "BUILD_FIELD_DEFENSE" ? [command.unitId] : [],
      ),
    ).toEqual([]);
    expect(
      commands.flatMap((command) =>
        command.kind === "TRAIN" && command.cityId === cityId(9)
          ? [command.role]
          : [],
      ),
    ).toEqual([]);
    expect(
      commands.flatMap((command) =>
        command.kind === "TRAIN" && command.role === "GUARD"
          ? [command.cityId]
          : [],
      ),
      // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): none. The view
      // owns the root and not Fortification, where the Guard is now (cities
      // 3 and 16 offered it before).
    ).toEqual([]);
    expect(
      commands.flatMap((command) =>
        command.kind === "TRAIN" && command.cityId === cityId(35)
          ? [command.role]
          : [],
      ),
    ).toEqual([]);
    expect(commands.filter(isRevision8MergedUnlockCommand)).toHaveLength(0);
    expect(commands.filter(isNavalExpansionCommand)).toEqual([]);
    expect(canonicalHash(commands.filter(isRetainedLandCommand))).toBe(
      // Tuning 6 (`pulp_wars-w49.6`): research costs 1 Coin for each
      // technology owned, so the retained view's 12 Coins buy a technology
      // again and six RESEARCH commands are offered (was 83c9a2…466e).
      // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
      // 9fd994…1b96).
      // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
      // 4b8b7c…d029).
      "4eb8ff841a02d2e31170dfa3038b8cbc826f53afc6e23ef8ccb920722670e1fc",
    );
    const ready = queryAiReadyCommandsV7(view);
    // Revision 17 inserts KABOOM after WAIL, shifting the later command-kind
    // ordinals once more, and revision 19 inserts STAMPEDE and HATCH after
    // KABOOM and LAY_EGG after TRAIN_NAVAL, shifting them again. Revision 20
    // removes STAMPEDE, moving every kind after KABOOM back by one (was
    // 879cad…92fc). The Martian revision (`pulp_wars-t6s.2`) inserts
    // BEAM_DOWN, MIND_CONTROL, and TRACTOR_BEAM after HATCH, moving every
    // later kind forward by three (was 5097a1…935b). The Ice Folk revision
    // (`pulp_wars-7g3.3`) inserts THROW_BOLAS and COLD_SNAP after
    // TRACTOR_BEAM, moving every later kind forward by two (was
    // 187249…93ea). The Dwarf revision (`pulp_wars-78i.3`) inserts TUNNEL,
    // BOMB_RUN, and ASSEMBLE after COLD_SNAP, moving every later kind
    // forward by three (was cf39a3…918b); the revision-12-ordinal value
    // below is unchanged.
    expect(canonicalHash(ready)).toBe(
      // The Candy revision (`pulp_wars-jdb.3`) inserts SUGAR_RUSH, REBAKE,
      // and SUGAR_TOSS after ASSEMBLE, moving every later kind forward by
      // three (was 845cbd…b1a9); the revision-12-ordinal value is unchanged.
      // The naval branch (`pulp_wars-5ti.2`) inserts BOARD after ATTACK,
      // moving every later kind forward by one (was 6f1e43…b43d).
      // The frozen sea (`pulp_wars-5ti.3`) inserts FREEZE after COLD_SNAP,
      // moving every later kind forward by one (was 056a9c…21e1).
      // Tuning 3 (`pulp_wars-w49.3`) inserts HIRE after TRAIN_NAVAL, moving every later command kind forward by one
      // (was b3c666…2787).
      // Tuning 6 (`pulp_wars-w49.6`): research costs 1 Coin for each
      // technology owned, so the retained view's 12 Coins buy a technology
      // again and six RESEARCH commands are offered (was 8926e8…9159).
      // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
      // 9ed334…056e).
      // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
      // 849b04…a5b9).
      // Dwarf crowd control (`pulp_wars-w49.33`) inserts WHIRL,
      // BUILD_BARRICADE, and ATTACK_BARRICADE after ASSEMBLE, moving every
      // later kind forward by three (was 9b18cf…883b); the
      // revision-12-ordinal value is unchanged.
      "56f315525a716afd3ef41115bf4a58c00d473105570daecaa0baa45c4878eaed",
    );
    // Revision 13 shifts the command-kind ordinals in AI tie-break tuples
    // (spec section 8); with revision-12 ordinals the value is unchanged.
    expect(canonicalHash(withRevision12AiReadyOrdinalsV7(ready))).toBe(
      // Tuning 6 (`pulp_wars-w49.6`): the six RESEARCH commands, as above
      // (was b9b0a8…40cb).
      // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
      // 999e50…a79f).
      // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
      // 15be87…b4f2).
      "724d39a5997ab848ec309b8c580f7ce0f29d890ea89e6d4a5d6c6bf456b25de0",
    );
    expect(
      canonicalHash(
        commands.map((command) => ({
          command,
          result: previewEconomicV7(view, command),
        })),
      ),
      // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
      // fe39b7…68d3).
    ).toBe("25ba7bc15c09e8d20505c900f4f635a35dc1c336905c56be939267e8d3fe4a55");
    expect(
      canonicalHash(
        commands.filter(isRetainedLandCommand).map((command) => ({
          command,
          result: previewEconomicV7(view, command),
        })),
      ),
      // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
      // fe39b7…68d3).
    ).toBe("25ba7bc15c09e8d20505c900f4f635a35dc1c336905c56be939267e8d3fe4a55");
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
        "6285861dd661a0602060b37c81953173582695945c57f668d5106e5fe2898cc5",
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
        "46e69d22f7561de4a04018da1efd36af083d79750c5846a3eb973d1b5c0ee6ee",
      );
      expect(canonicalHash(leftResult.scores)).toBe(
        // Tuning 6 (`pulp_wars-w49.6`): research costs 1 Coin for each
        // technology owned, so the retained view's 12 Coins buy a technology
        // again and six RESEARCH commands are offered (was ed2aad…46f9).
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // 447868…9983).
        // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
        // be2fb4…6066).
        "70afe9e8f47129c996d843d5a251a8b29a8350e4ecab74f257766f0f6fa82b43",
      );
      const revision8Scores = leftResult.scores.filter(({ command }) =>
        isRevision8MergedUnlockCommand(command),
      );
      // (None since the Industry reshuffle: the Guard is not on offer.)
      expect(revision8Scores).toHaveLength(0);
      expect(revision8Scores.every(({ score }) => score === 0)).toBe(true);
      expect(
        canonicalHash(
          leftResult.scores.filter(({ command }) =>
            isRetainedLandCommand(command),
          ),
        ),
      ).toBe(
        // Tuning 6 (`pulp_wars-w49.6`): research costs 1 Coin for each
        // technology owned, so the retained view's 12 Coins buy a technology
        // again and six RESEARCH commands are offered (was ed2aad…46f9).
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // 447868…9983).
        // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
        // be2fb4…6066).
        "70afe9e8f47129c996d843d5a251a8b29a8350e4ecab74f257766f0f6fa82b43",
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
      // Tuning 6 (`pulp_wars-w49.6`): research costs 1 Coin for each
      // technology owned, so the retained view's 12 Coins buy a technology
      // again and six RESEARCH commands are offered (was 83c9a2…466e).
      // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
      // 9fd994…1b96).
      // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
      // 4b8b7c…d029).
      "4eb8ff841a02d2e31170dfa3038b8cbc826f53afc6e23ef8ccb920722670e1fc",
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
      // Tuning 6 (`pulp_wars-w49.6`): research costs 1 Coin for each
      // technology owned, so the retained view's 12 Coins buy a technology
      // again and six RESEARCH commands are offered (was 0bfa82…8f93).
      // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
      // 8e4aa3…e4bd).
      // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
      // 39a0b0…a63b).
      "099b6189664e3cbe9663c70590f79a6e970ca44ef3a60bffacd819aeefd56db1",
    );
    expect(canonicalHash(changedCommands.filter(isRetainedLandCommand))).toBe(
      // Tuning 6 (`pulp_wars-w49.6`): research costs 1 Coin for each
      // technology owned, so the retained view's 12 Coins buy a technology
      // again and six RESEARCH commands are offered (was 0bfa82…8f93).
      // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
      // 8e4aa3…e4bd).
      // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
      // 39a0b0…a63b).
      "099b6189664e3cbe9663c70590f79a6e970ca44ef3a60bffacd819aeefd56db1",
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
    // The economy rejig (`pulp_wars-w49.16`, 7r54): a Workshop also counts
    // the Mine on the neighbouring city's land (its own city's Farm only
    // before).
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
    // The economy rejig (7r54): the neighbouring city's Mine counts while
    // the same player owns that city, and no longer once it does not.
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
    (command.cityId === cityId(9) || command.role === "GUARD")
  );
}
