import { describe, expect, it } from "vitest";
import {
  canonicalHash,
  createPublicCommandWorkV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  allTechsV7,
  exploredAllV7,
  initialV7,
  richV7,
} from "../fixtures/v7-builders";

const LIMITED_BUILDINGS = [
  ["BUILD_WINDMILL", "FARM"],
  ["BUILD_SAWMILL", "LUMBER_CAMP"],
  ["BUILD_FORGE", "MINE"],
  ["BUILD_WORKSHOP", "FARM"],
  ["BUILD_MARKET", "FARM"],
] as const;
type LimitedKind = (typeof LIMITED_BUILDINGS)[number][0];
type FixtureKind = LimitedKind | "BUILD_SHIPYARD" | "BUILD_MONUMENT";
type Support = (typeof LIMITED_BUILDINGS)[number][1] | null;
type Improvement = NonNullable<
  Extract<
    PlayerViewV7["board"]["tiles"][number],
    { explored: true }
  >["improvement"]
>;
const LIMITED_IMPROVEMENTS = {
  BUILD_WINDMILL: "WINDMILL",
  BUILD_SAWMILL: "SAWMILL",
  BUILD_FORGE: "FORGE",
  BUILD_WORKSHOP: "WORKSHOP",
  BUILD_MARKET: "MARKET",
  BUILD_SHIPYARD: "SHIPYARD",
  BUILD_MONUMENT: "MONUMENT",
} as const satisfies Readonly<Record<FixtureKind, Improvement>>;

describe("ruleset-7 public city-building limits", () => {
  it.each(LIMITED_BUILDINGS)(
    "withholds %s across a fogged Land Grant footprint and restores a legal offer after exploration",
    (kind, support) => {
      const fixture = buildingFixture({
        expanded: false,
        landGrantUsed: true,
        kind,
        support,
      });

      expect(queryPlayerCommandsV7(fixture.hidden)).not.toContainEqual(
        fixture.command,
      );
      expect(canonicalHash(fixture.hiddenBlocked)).toBe(
        canonicalHash(fixture.hidden),
      );
      expect(queryPlayerCommandsV7(fixture.hidden)).toContainEqual(
        fixture.repeatable,
      );
      expect(queryPlayerCommandsV7(fixture.complete)).toContainEqual(
        fixture.command,
      );
      expect(queryPlayerCommandsV7(fixture.completeBlocked)).not.toContainEqual(
        fixture.command,
      );
    },
  );

  it.each([
    ["Land Grant", false, true],
    ["expansion", true, false],
  ] as const)(
    "uses the radius-two %s footprint for Shipyard and Monument limits",
    (_label, expanded, landGrantUsed) => {
      for (const kind of ["BUILD_SHIPYARD", "BUILD_MONUMENT"] as const) {
        const fixture = buildingFixture({
          expanded,
          landGrantUsed,
          kind,
          support: null,
        });

        expect(queryPlayerCommandsV7(fixture.hidden)).not.toContainEqual(
          fixture.command,
        );
        expect(canonicalHash(fixture.hiddenBlocked)).toBe(
          canonicalHash(fixture.hidden),
        );
        expect(queryPlayerCommandsV7(fixture.hidden)).toContainEqual(
          fixture.repeatable,
        );
        expect(queryPlayerCommandsV7(fixture.complete)).toContainEqual(
          fixture.command,
        );
        expect(
          queryPlayerCommandsV7(fixture.completeBlocked),
        ).not.toContainEqual(fixture.command);
      }
    },
  );

  it("keeps exact and sliced public queries byte-identical for an equal hidden view", () => {
    const { hidden, hiddenBlocked: counterpart } = buildingFixture({
      expanded: false,
      landGrantUsed: true,
      kind: "BUILD_SAWMILL",
      support: "LUMBER_CAMP",
    });
    expect(canonicalHash(counterpart)).toBe(canonicalHash(hidden));

    const exact = queryPlayerCommandsV7(hidden);
    const work = createPublicCommandWorkV7(counterpart);
    let sliced: readonly CommandV7[] | null = null;
    while (sliced === null) {
      const progress = work.advance(1);
      if (progress.done) sliced = progress.commands;
    }
    expect(sliced).toEqual(exact);
    expect(canonicalHash(sliced)).toBe(canonicalHash(exact));
  });

  it("does not require an unused radius-two ring for an ordinary city", () => {
    const fixture = buildingFixture({
      expanded: false,
      landGrantUsed: false,
      kind: "BUILD_SAWMILL",
      support: "LUMBER_CAMP",
    });
    expect(queryPlayerCommandsV7(fixture.hidden)).toContainEqual(
      fixture.command,
    );
  });
});

function buildingFixture(options: {
  readonly expanded: boolean;
  readonly landGrantUsed: boolean;
  readonly kind: FixtureKind;
  readonly support: Support;
}): {
  readonly complete: PlayerViewV7;
  readonly completeBlocked: PlayerViewV7;
  readonly hidden: PlayerViewV7;
  readonly hiddenBlocked: PlayerViewV7;
  readonly command: CommandV7;
  readonly repeatable: CommandV7;
} {
  const state = richV7(allTechsV7(exploredAllV7(initialV7(7_711))), 1_000);
  const base = viewForV7(state, state.humanPlayerId);
  const city = required(
    base.cities.find((candidate) => candidate.ownerId === base.viewer.id),
    "viewer city missing",
  );
  const target = offset(city.at, 1, 0);
  const supportAt = offset(city.at, 1, 1);
  const repeatableAt = offset(city.at, -1, 0);
  const hiddenAt = offset(city.at, 2, 2);
  const footprint = (at: CoordV7) => chebyshev(at, city.at) <= 2;
  const complete: PlayerViewV7 = {
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
    cities: base.cities.map((candidate) =>
      candidate.id === city.id
        ? {
            ...candidate,
            expanded: options.expanded,
            landGrantUsed: options.landGrantUsed,
          }
        : candidate,
    ),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) => {
        if (!footprint(tile.at) || same(tile.at, city.at)) return tile;
        if (!tile.explored) throw new Error("explored footprint tile missing");
        const common = {
          ...tile,
          explored: true as const,
          biome: "PLAINS" as const,
          terrain: "GRASS" as const,
          resource: null,
          improvement: null,
          road: false,
          site: null,
          territoryCityId: city.id,
          territoryOwnerId: base.viewer.id,
          fieldDefense: false,
        };
        if (same(tile.at, repeatableAt))
          return { ...common, resource: "FERTILE_GROUND" as const };
        if (same(tile.at, supportAt) && options.support !== null)
          return { ...common, improvement: options.support };
        if (same(tile.at, target) && options.kind === "BUILD_SHIPYARD")
          return {
            ...common,
            biome: null,
            terrain: "SHALLOW_WATER" as const,
            improvement: "PORT" as const,
          };
        return common;
      }),
    },
    treasureChests: [],
    populationContributions: [],
    improvementValues: [],
    pendingChoices: [],
  };
  const hidden: PlayerViewV7 = {
    ...complete,
    board: {
      ...complete.board,
      tiles: complete.board.tiles.map((tile) =>
        same(tile.at, hiddenAt) ? { at: tile.at, explored: false } : tile,
      ),
    },
  };
  const limitedImprovement = LIMITED_IMPROVEMENTS[options.kind];
  const completeBlocked: PlayerViewV7 = {
    ...complete,
    board: {
      ...complete.board,
      tiles: complete.board.tiles.map((tile) =>
        same(tile.at, hiddenAt) && tile.explored
          ? {
              ...tile,
              improvement: limitedImprovement,
            }
          : tile,
      ),
    },
  };
  const hiddenBlocked: PlayerViewV7 = {
    ...completeBlocked,
    board: {
      ...completeBlocked.board,
      tiles: completeBlocked.board.tiles.map((tile) =>
        same(tile.at, hiddenAt) ? { at: tile.at, explored: false } : tile,
      ),
    },
  };
  const command: CommandV7 =
    options.kind === "BUILD_MONUMENT"
      ? { kind: options.kind, achievement: "ENGINEER", at: target }
      : { kind: options.kind, at: target };
  return {
    complete,
    completeBlocked,
    hidden,
    hiddenBlocked,
    command,
    repeatable: { kind: "BUILD_FARM", at: repeatableAt },
  };
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function offset(at: CoordV7, x: number, y: number): CoordV7 {
  return { x: at.x + x, y: at.y + y };
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}

function chebyshev(left: CoordV7, right: CoordV7): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}
