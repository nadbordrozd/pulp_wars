import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { upgradeRetainedPublicViewV7 } from "../../scripts/ruleset-v7-late-public-view-contract";
import {
  canonicalHash,
  createPublicPlanningWorkV7,
  previewEconomicV7,
  queryPlayerCommandsV7,
  type CommandV7,
  type PlayerViewV7,
  type PublicPlanningWorkResultV7,
} from "../../src/engine/index";

const retained = upgradeRetainedPublicViewV7(
  JSON.parse(
    readFileSync("tests/fixtures/ruleset-v7-late-public-view.json", "utf8"),
  ) as PlayerViewV7,
);

describe("ruleset-7 exact public planning reuse", () => {
  it("reports physical scan and reconstruction work while preserving exact output", () => {
    const coldView = structuredClone(retained);
    const coldCommands = queryPlayerCommandsV7(coldView);
    const cold = drain(coldView, coldCommands, 1);

    const warmView = structuredClone(retained);
    const warmCommands = queryPlayerCommandsV7(warmView);
    const warm = drain(warmView, warmCommands, 1);

    expect(warm.operations).toBe(
      factScanOperations(warmView) + warmCommands.length,
    );
    expect(warm.operations).toBeLessThan(cold.operations);
    expect(warm.result).toEqual(cold.result);
    expect(canonicalHash(warm.result)).toBe(
      "f18e578cba84a5fe93980ae6c0fdc9e4a531ec4354dcc44987c170476464bca3",
    );
  });

  it("invalidates each public planning dependency with cold-result parity", async () => {
    const base = structuredClone(retained);
    drain(base, queryPlayerCommandsV7(base), 17);
    const ownedCity = required(
      retained.cities.find((city) => city.ownerId === retained.viewer.id),
    );
    const alternativeCapital = required(
      retained.cities.find(
        (city) => city.id !== retained.viewer.originalCapitalCityId,
      ),
    );
    const explored = required(
      retained.board.tiles.find((tile) => tile.explored),
    );
    if (!explored.explored) throw new Error("Explored tile missing");
    const hostile = required(
      retained.units.find((unit) => unit.ownerId !== retained.viewer.id),
    );
    const withTile = (
      replacement: PlayerViewV7["board"]["tiles"][number],
    ): PlayerViewV7 => ({
      ...structuredClone(retained),
      board: {
        ...retained.board,
        tiles: retained.board.tiles.map((tile) =>
          tile === explored ? replacement : tile,
        ),
      },
    });
    const variants: { readonly name: string; readonly view: PlayerViewV7 }[] = [
      {
        name: "road",
        view: withTile({ ...explored, road: !explored.road }),
      },
      {
        name: "fog",
        view: withTile({ at: explored.at, explored: false }),
      },
      {
        name: "resource",
        view: withTile({ ...explored, resource: "FRUIT" }),
      },
      {
        name: "improvement support",
        view: withTile({
          ...explored,
          improvement: "FARM",
          territoryCityId: ownedCity.id,
          territoryOwnerId: retained.viewer.id,
        }),
      },
      {
        name: "technology",
        view: {
          ...structuredClone(retained),
          viewer: {
            ...retained.viewer,
            researchedTechs: retained.viewer.researchedTechs.slice(1),
          },
        },
      },
      {
        name: "owner",
        view: {
          ...structuredClone(retained),
          cities: retained.cities.map((city) =>
            city.id === ownedCity.id
              ? { ...city, ownerId: retained.humanPlayerId }
              : city,
          ),
        },
      },
      {
        name: "capital",
        view: {
          ...structuredClone(retained),
          viewer: {
            ...retained.viewer,
            originalCapitalCityId: alternativeCapital.id,
          },
        },
      },
      {
        name: "entitlement",
        view: {
          ...structuredClone(retained),
          viewer: {
            ...retained.viewer,
            achievementEntitlements:
              retained.viewer.achievementEntitlements.map(
                (entitlement, index) =>
                  index === 0
                    ? { ...entitlement, unlocked: !entitlement.unlocked }
                    : entitlement,
              ),
          },
        },
      },
      {
        name: "pending reward",
        view: {
          ...structuredClone(retained),
          pendingChoices: [
            {
              kind: "CITY_REWARD",
              cityId: ownedCity.id,
              reachedLevel: ownedCity.level,
              candidates: ["TREASURY_8"],
            },
          ],
        },
      },
      {
        name: "Port status",
        view: {
          ...structuredClone(retained),
          naval: {
            ...retained.naval,
            ownedPorts: [
              {
                at: explored.at,
                cityId: ownedCity.id,
                status: "BLOCKADED",
              },
            ],
          },
        },
      },
      {
        name: "siege",
        view: {
          ...structuredClone(retained),
          units: retained.units.map((unit) =>
            unit.id === hostile.id
              ? { ...unit, hp: Math.max(1, unit.hp), at: ownedCity.at }
              : unit,
          ),
        },
      },
      {
        name: "prospective Port blockade",
        view: {
          ...structuredClone(retained),
          units: retained.units.map((unit) =>
            unit.id === hostile.id
              ? { ...unit, form: "NAVAL", at: explored.at }
              : unit,
          ),
        },
      },
    ];

    for (const variant of variants) {
      const commands = queryPlayerCommandsV7(variant.view);
      const result = drain(variant.view, commands, 31);
      vi.resetModules();
      const coldEngine = await import("../../src/engine/index");
      const coldView = structuredClone(variant.view);
      const coldCommands = coldEngine.queryPlayerCommandsV7(coldView);
      const independentlyCold = drainWith(
        coldView,
        coldCommands,
        31,
        coldEngine.createPublicPlanningWorkV7,
      );
      expect(result.result, variant.name).toEqual(independentlyCold.result);
      expect(result.operations, variant.name).toBe(
        independentlyCold.operations,
      );

      const equalView = structuredClone(variant.view);
      const equalCommands = queryPlayerCommandsV7(equalView);
      const reused = drain(equalView, equalCommands, 7);
      expect(reused.result, variant.name).toEqual(result.result);
    }
  });

  it("keeps cached planning and previews private from caller mutation", () => {
    const firstView = structuredClone(retained);
    const firstCommands = queryPlayerCommandsV7(firstView);
    const first = drain(firstView, firstCommands, 19);
    const expectedPlanningHash = canonicalHash(first.result);
    const economic = requiredEconomicCommand(firstView, firstCommands);
    const firstPreview = previewEconomicV7(firstView, economic);
    expect(firstPreview.ok).toBe(true);
    if (!firstPreview.ok) return;
    const expectedPreviewHash = canonicalHash(firstPreview);

    const mutableScore = required(
      (first.result.scores as unknown as { score: number }[])[0],
    );
    mutableScore.score = -999;
    (firstPreview.preview.levelsReached as number[]).push(999);

    const secondView = structuredClone(retained);
    const secondCommands = queryPlayerCommandsV7(secondView);
    const second = drain(secondView, secondCommands, 23);
    const secondPreview = previewEconomicV7(secondView, economic);
    expect(canonicalHash(second.result)).toBe(expectedPlanningHash);
    expect(canonicalHash(secondPreview)).toBe(expectedPreviewHash);
  });

  it("rechecks offering and preview-only facts before cross-view reuse", async () => {
    const firstView = structuredClone(retained);
    const command = requiredEconomicCommand(
      firstView,
      queryPlayerCommandsV7(firstView),
    );
    const first = previewEconomicV7(firstView, command);
    expect(first.ok).toBe(true);

    const noLongerOffered: PlayerViewV7 = {
      ...structuredClone(retained),
      viewer: { ...retained.viewer, coins: 0 },
    };
    const rejected = previewEconomicV7(noLongerOffered, command);
    expect(rejected).toEqual({
      ok: false,
      error: "NOT_OFFERED",
    });
    vi.resetModules();
    let coldEngine = await import("../../src/engine/index");
    expect(rejected).toEqual(
      coldEngine.previewEconomicV7(structuredClone(noLongerOffered), command),
    );

    const ownedIds = retained.cities
      .filter((city) => city.ownerId === retained.viewer.id)
      .map((city) => city.id);
    const previewVariants: {
      readonly name: string;
      readonly view: PlayerViewV7;
    }[] = [
      {
        name: "Coins",
        view: {
          ...structuredClone(retained),
          viewer: { ...retained.viewer, coins: retained.viewer.coins + 1 },
        },
      },
      {
        name: "cityActionAvailable",
        view: {
          ...structuredClone(retained),
          cities: retained.cities.map((city) => ({
            ...city,
            cityActionAvailable: !city.cityActionAvailable,
          })),
        },
      },
      {
        name: "city growth",
        view: {
          ...structuredClone(retained),
          cities: retained.cities.map((city) =>
            city.ownerId === retained.viewer.id
              ? {
                  ...city,
                  permanentPopulation: city.permanentPopulation + 1,
                  population: city.population + 1,
                }
              : city,
          ),
        },
      },
      {
        name: "improvement values",
        view: {
          ...structuredClone(retained),
          improvementValues: [
            ...retained.improvementValues,
            {
              at: ownedTileForCommand(retained, command).at,
              improvement: "MARKET",
              level: 2,
              measure: "COIN_INCOME",
              contributingTiles: [],
            },
          ],
        },
      },
      {
        name: "land trade",
        view: {
          ...structuredClone(retained),
          naval: { ...retained.naval, landTradeCityIds: ownedIds },
        },
      },
      {
        name: "sea trade",
        view: {
          ...structuredClone(retained),
          naval: { ...retained.naval, seaTradeCityIds: ownedIds },
        },
      },
    ];
    for (const variant of previewVariants) {
      const reused = previewEconomicV7(variant.view, command);
      vi.resetModules();
      coldEngine = await import("../../src/engine/index");
      const independentlyCold = coldEngine.previewEconomicV7(
        structuredClone(variant.view),
        command,
      );
      expect(reused, variant.name).toEqual(independentlyCold);
    }
    expect(
      canonicalHash(
        previewEconomicV7(required(previewVariants[2]).view, command),
      ),
    ).not.toBe(canonicalHash(first));
  });

  it("evicts old stable-fact entries at the documented bound", () => {
    const original = structuredClone(retained);
    const commands = queryPlayerCommandsV7(original);
    const originalResult = drain(original, commands, 29).result;

    for (let offset = 1; offset <= 24; offset += 1) {
      const view: PlayerViewV7 = {
        ...structuredClone(retained),
        cities: retained.cities.map((city, index) =>
          index === 0 ? { ...city, level: city.level + offset } : city,
        ),
      };
      drain(view, queryPlayerCommandsV7(view), 29);
    }

    const revisited = structuredClone(retained);
    const revisitedCommands = queryPlayerCommandsV7(revisited);
    const result = drain(revisited, revisitedCommands, 29);
    expect(result.operations).toBeGreaterThan(
      factScanOperations(revisited) + revisitedCommands.length,
    );
    expect(result.result).toEqual(originalResult);
  });

  it("falls back to cold work when an equal-fact superset adds a graph command", async () => {
    const source: PlayerViewV7 = {
      ...structuredClone(retained),
      cities: retained.cities.map((city, index) =>
        index === 0 ? { ...city, level: city.level + 101 } : city,
      ),
    };
    const commands = queryPlayerCommandsV7(source);
    const graphCommand = required(
      commands.find((command) => previewEconomicV7(source, command).ok),
    );
    const subset = commands.filter(
      (command) => JSON.stringify(command) !== JSON.stringify(graphCommand),
    );
    drain(source, subset, 13);

    const equal = structuredClone(source);
    const fullCommands = queryPlayerCommandsV7(equal);
    const result = drain(equal, fullCommands, 1);
    expect(result.operations).toBeGreaterThan(
      factScanOperations(equal) + fullCommands.length,
    );
    vi.resetModules();
    const coldEngine = await import("../../src/engine/index");
    const coldView = structuredClone(source);
    const coldCommands = coldEngine.queryPlayerCommandsV7(coldView);
    const independentlyCold = drainWith(
      coldView,
      coldCommands,
      1,
      coldEngine.createPublicPlanningWorkV7,
    );
    expect(result.result).toEqual(independentlyCold.result);
  });
});

function factScanOperations(view: PlayerViewV7): number {
  return view.board.tiles.length + view.cities.length + view.units.length + 1;
}

function drain(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  budget: number,
): {
  readonly operations: number;
  readonly result: PublicPlanningWorkResultV7;
} {
  return drainWith(view, commands, budget, createPublicPlanningWorkV7);
}

function drainWith(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  budget: number,
  create: typeof createPublicPlanningWorkV7,
): {
  readonly operations: number;
  readonly result: PublicPlanningWorkResultV7;
} {
  const work = create(view, commands);
  let operations = 0;
  let calls = 0;
  for (;;) {
    const progress = work.advance(budget);
    expect(progress.operations).toBeLessThanOrEqual(budget);
    operations += progress.operations;
    calls += 1;
    if (calls > 2_000_000) throw new Error("Public planning did not terminate");
    if (progress.result !== null)
      return { operations, result: progress.result };
  }
}

function ownedTileForCommand(
  view: PlayerViewV7,
  command: CommandV7,
): PlayerViewV7["board"]["tiles"][number] {
  if (!("at" in command)) throw new Error("Tile command missing");
  return required(
    view.board.tiles.find(
      (tile) => tile.at.x === command.at.x && tile.at.y === command.at.y,
    ),
  );
}

function requiredEconomicCommand(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
): CommandV7 {
  const command = commands.find(
    (candidate) => previewEconomicV7(view, candidate).ok,
  );
  if (command === undefined) throw new Error("Economic command missing");
  return command;
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Required fixture value missing");
  return value;
}
