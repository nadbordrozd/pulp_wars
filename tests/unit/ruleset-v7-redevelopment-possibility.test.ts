import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  canonicalHash,
  canonicalJson,
  createPublicRedevelopmentPossibilityWorkV7,
  queryPublicRedevelopmentChangesImprovementV7,
  type CoordV7,
  type PlayerViewV7,
  type PublicRedevelopmentChangePossibilityV7,
} from "../../src/engine/index";

type Redevelop = PublicRedevelopmentChangePossibilityV7["candidate"];
type CompactTile =
  | readonly [number, number]
  | readonly [
      number,
      number,
      string,
      string | null,
      string | null,
      boolean,
      string | null,
      number | null,
      number | null,
    ];
interface CapturedFixture {
  readonly source: {
    readonly aiMode: "COOPERATIVE";
    readonly seed: number;
    readonly round: number;
    readonly commandIndex: number;
    readonly publicViewHash: string;
  };
  readonly viewer: {
    readonly id: number;
    readonly originalCapitalCityId: number;
    readonly researchedTechs: readonly string[];
    readonly achievementEntitlements: readonly {
      readonly achievement: string;
      readonly unlocked: boolean;
      readonly spent: boolean;
    }[];
  };
  readonly leaderboard: readonly {
    readonly isViewer: boolean;
    readonly cityCount: number;
  }[];
  readonly cities: readonly {
    readonly id: number;
    readonly ownerId: number;
    readonly at: CoordV7;
    readonly expanded: boolean;
    readonly landGrantUsed: boolean;
  }[];
  readonly units: readonly {
    readonly ownerId: number;
    readonly hp: number;
    readonly at: CoordV7;
  }[];
  readonly pendingChoices: readonly { readonly cityId: number }[];
  readonly treasureChests: readonly CoordV7[];
  readonly activePorts: readonly CoordV7[];
  readonly board: {
    readonly width: number;
    readonly height: number;
    readonly tiles: readonly CompactTile[];
  };
  readonly candidates: readonly Redevelop[];
}

const captured = JSON.parse(
  readFileSync(
    "tests/fixtures/ruleset-v7-redevelopment-possibility-captured.json",
    "utf8",
  ),
) as CapturedFixture;

describe("ruleset-7 bounded redevelopment possibility proof", () => {
  it("proves all 33 captured basic rebuilds false within the exact ceiling", () => {
    expect(captured.source).toEqual({
      aiMode: "COOPERATIVE",
      seed: 6173,
      round: 73,
      commandIndex: 2212,
      publicViewHash:
        "e3289d82e4e8835bf2f408b37b18190a7db1aaab58f8f3814209b32ed952e73a",
    });
    const view = capturedView();
    const cold = drain(view, captured.candidates, 1);
    expect(cold.result).toHaveLength(33);
    expect(
      cold.result.reduce<Record<string, number>>((counts, value) => {
        const tile =
          view.board.tiles[
            value.candidate.at.y * view.board.width + value.candidate.at.x
          ];
        const improvement = tile?.explored ? tile.improvement : null;
        if (improvement !== null && improvement !== undefined)
          counts[improvement] = (counts[improvement] ?? 0) + 1;
        return counts;
      }, {}),
    ).toEqual({ FARM: 11, LUMBER_CAMP: 18, MINE: 4 });
    expect(cold.operations).toBe(287);
    expect(cold.operations).toBe(cold.ceiling);
    expect(cold.maxSliceOperations).toBe(1);
    expect(canonicalHash(cold.result)).toBe(
      "fbd139344ac2e744f26a193e33ebe04da19dcdd5051cd997e21975bcb11870ae",
    );
    expect(
      cold.result.filter((value) => !value.mayChangeImprovement),
    ).toHaveLength(33);
    for (const value of cold.result)
      if (!value.mayChangeImprovement)
        expect(
          queryPublicRedevelopmentChangesImprovementV7(view, value.candidate),
        ).toBe(false);

    const equalView = capturedView();
    const sliced = drain(equalView, captured.candidates, 19);
    expect(sliced.operations).toBe(cold.operations);
    expect(canonicalJson(sliced.result)).toBe(canonicalJson(cold.result));
  });

  it("keeps interleaved cold work deterministic", () => {
    const left = createPublicRedevelopmentPossibilityWorkV7(
      capturedView(),
      captured.candidates,
    );
    const right = createPublicRedevelopmentPossibilityWorkV7(
      capturedView(),
      captured.candidates,
    );
    let leftProgress = left.advance(1);
    let rightProgress = right.advance(7);
    while (!leftProgress.done || !rightProgress.done) {
      if (!rightProgress.done) rightProgress = right.advance(7);
      if (!leftProgress.done) leftProgress = left.advance(1);
    }
    expect(leftProgress.result).not.toBeNull();
    expect(canonicalJson(leftProgress.result)).toBe(
      canonicalJson(rightProgress.result),
    );
  });

  it("retains a Camp-to-Sawmill possibility for the exact planner", () => {
    const base = capturedView();
    const target = { kind: "REDEVELOP", at: { x: 2, y: 0 } } as const;
    const view = replaceTile(base, { x: 1, y: 1 }, { improvement: null });
    const result = drain(view, [target], 1).result[0];
    expect(result?.mayChangeImprovement).toBe(true);
    // Existence is only a necessary condition. The exact target scorer still
    // prefers rebuilding the Camp in this factual variant.
    expect(queryPublicRedevelopmentChangesImprovementV7(view, target)).toBe(
      false,
    );
  });

  it("keeps a useful Camp-to-Sawmill replacement for the exact predicate", () => {
    const target = { kind: "REDEVELOP", at: { x: 2, y: 12 } } as const;
    // Remove this city's existing Sawmill and an adjacent Market. Two adjacent
    // Camps then make Sawmill the positive best replacement at the target.
    const withoutMarket = replaceTile(
      capturedView(),
      { x: 3, y: 11 },
      {
        improvement: null,
      },
    );
    const view = replaceTile(
      withoutMarket,
      { x: 6, y: 11 },
      {
        improvement: null,
      },
    );
    expect(drain(view, [target], 1).result[0]?.mayChangeImprovement).toBe(true);
    expect(queryPublicRedevelopmentChangesImprovementV7(view, target)).toBe(
      true,
    );
  });

  it("treats a Monument entitlement as a necessary different replacement", () => {
    const base = capturedView();
    const target = { kind: "REDEVELOP", at: { x: 10, y: 1 } } as const;
    const view = {
      ...base,
      viewer: {
        ...base.viewer,
        achievementEntitlements: base.viewer.achievementEntitlements.map(
          (entitlement) =>
            entitlement.achievement === "ENGINEER"
              ? { ...entitlement, unlocked: true, spent: false }
              : entitlement,
        ),
      },
    };
    const result = drain(view, [target], 1).result[0];
    expect(result?.mayChangeImprovement).toBe(true);
    expect(queryPublicRedevelopmentChangesImprovementV7(view, target)).toBe(
      false,
    );
  });

  it("falls back true when no positive same rebuild is established", () => {
    const target = { kind: "REDEVELOP", at: { x: 0, y: 0 } } as const;
    const siteBlocked = replaceTile(capturedView(), target.at, {
      site: "CITY",
    });
    const treasureBlocked = {
      ...capturedView(),
      treasureChests: [target.at],
    };
    for (const view of [siteBlocked, treasureBlocked]) {
      expect(drain(view, [target], 1).result[0]?.mayChangeImprovement).toBe(
        true,
      );
      expect(queryPublicRedevelopmentChangesImprovementV7(view, target)).toBe(
        true,
      );
    }
  });

  it("stays conservative for an unknown owned-city footprint", () => {
    const target = { kind: "REDEVELOP", at: { x: 2, y: 0 } } as const;
    const base = capturedView();
    const hidden = {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          tile.at.x === 0 && tile.at.y === 0
            ? { at: tile.at, explored: false as const }
            : tile,
        ),
      },
    } as PlayerViewV7;
    expect(drain(hidden, [target], 1).result[0]?.mayChangeImprovement).toBe(
      true,
    );
    expect(queryPublicRedevelopmentChangesImprovementV7(hidden, target)).toBe(
      false,
    );
  });
});

function capturedView(): PlayerViewV7 {
  return {
    commandIndex: captured.source.commandIndex,
    round: captured.source.round,
    setup: { aiMode: captured.source.aiMode },
    viewer: captured.viewer,
    leaderboard: captured.leaderboard,
    board: {
      width: captured.board.width,
      height: captured.board.height,
      tiles: captured.board.tiles.map((tile) =>
        tile.length === 2
          ? { at: { x: tile[0], y: tile[1] }, explored: false }
          : {
              at: { x: tile[0], y: tile[1] },
              explored: true,
              terrain: tile[2],
              resource: tile[3],
              improvement: tile[4],
              road: tile[5],
              site: tile[6],
              territoryCityId: tile[7],
              territoryOwnerId: tile[8],
            },
      ),
    },
    cities: captured.cities,
    units: captured.units,
    pendingChoices: captured.pendingChoices,
    treasureChests: captured.treasureChests,
    naval: {
      ownedPorts: captured.activePorts.map((at) => ({
        at,
        cityId: 0,
        status: "ACTIVE" as const,
      })),
    },
  } as unknown as PlayerViewV7;
}

function drain(
  view: PlayerViewV7,
  candidates: readonly Redevelop[],
  budget: number,
): {
  readonly operations: number;
  readonly ceiling: number;
  readonly maxSliceOperations: number;
  readonly result: readonly PublicRedevelopmentChangePossibilityV7[];
} {
  const work = createPublicRedevelopmentPossibilityWorkV7(view, candidates);
  let operations = 0;
  let maxSliceOperations = 0;
  for (;;) {
    const progress = work.advance(budget);
    operations += progress.operations;
    maxSliceOperations = Math.max(maxSliceOperations, progress.operations);
    expect(operations).toBeLessThanOrEqual(work.operationCeiling);
    if (progress.result !== null)
      return {
        operations,
        ceiling: work.operationCeiling,
        maxSliceOperations,
        result: progress.result,
      };
  }
}

function replaceTile(
  view: PlayerViewV7,
  at: CoordV7,
  replacement: Readonly<Record<string, unknown>>,
): PlayerViewV7 {
  return {
    ...view,
    board: {
      ...view.board,
      tiles: view.board.tiles.map((tile) =>
        tile.at.x === at.x && tile.at.y === at.y
          ? { ...tile, ...replacement }
          : tile,
      ),
    },
  } as PlayerViewV7;
}
