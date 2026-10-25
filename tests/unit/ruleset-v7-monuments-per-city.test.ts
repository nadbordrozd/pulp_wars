import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  previewMonumentV7,
  queryPlayerCommandsV7,
  viewForV7,
  type AchievementIdV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import { checkedV7, exploredAllV7, initialV7 } from "../fixtures/v7-builders";

/**
 * Bead pulp_wars-d8xm (the user, 2026-10-25): "drop the limitation that
 * only one monument can be constructed in a given city. from now on it can
 * be any number of monuments". Small hand-built states: the human seat's
 * capital with three unlocked achievements and three empty Grass tiles.
 */

const ACHIEVEMENTS: readonly AchievementIdV7[] = [
  "EXPLORER",
  "MUSTER",
  "ENGINEER",
];

interface Staged {
  readonly state: GameStateV7;
  readonly cityId: GameStateV7["cities"][number]["id"];
  readonly tiles: readonly CoordV7[];
}

/** The first seed whose human capital has three empty Grass tiles. */
function staged(): Staged {
  for (let seed = 1801; seed < 1900; seed += 1) {
    const base = exploredAllV7(initialV7(seed));
    const city = base.cities.find(
      (candidate) => candidate.ownerId === base.humanPlayerId,
    );
    if (city === undefined) continue;
    const tiles = base.board.tiles
      .filter(
        (tile) =>
          tile.territoryCityId === city.id &&
          tile.site === null &&
          tile.resource === null &&
          tile.improvement === null &&
          tile.biome !== null &&
          tile.terrain === "GRASS" &&
          !base.units.some((unit) => same(unit.at, tile.at)),
      )
      .map((tile) => tile.at);
    if (tiles.length < 3) continue;
    const state = checkedV7({
      ...base,
      treasureChests: [],
      players: base.players.map((player) =>
        player.id === base.humanPlayerId
          ? {
              ...player,
              coins: 0,
              achievementEntitlements: player.achievementEntitlements.map(
                (item) =>
                  ACHIEVEMENTS.includes(item.achievement)
                    ? { ...item, unlocked: true }
                    : item,
              ),
            }
          : player,
      ),
    });
    return { state, cityId: city.id, tiles: tiles.slice(0, 3) };
  }
  throw new Error("no seed with three empty Grass tiles");
}

/** The human seat's command, with every reward it queues taken. */
function play(
  state: GameStateV7,
  command: Parameters<typeof applyCommandV7>[2],
) {
  const result = applyCommandV7(state, state.humanPlayerId, command);
  if (!result.accepted) throw new Error(result.error.code);
  let next = result.state;
  for (let guard = 0; next.pendingChoices.length > 0; guard += 1) {
    if (guard > 6) throw new Error("reward guard exhausted");
    const choice = next.pendingChoices[0];
    if (choice === undefined) break;
    const chosen = applyCommandV7(next, next.humanPlayerId, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: choice.cityId,
      reachedLevel: choice.reachedLevel,
      reward: choice.candidates[0] as never,
    });
    if (!chosen.accepted) throw new Error(chosen.error.code);
    next = chosen.state;
  }
  return next;
}

function cityMonuments(state: GameStateV7, cityId: number) {
  return state.populationContributions.filter(
    (item) => item.cityId === cityId && item.source.kind === "MONUMENT",
  );
}

describe("any number of Monuments per city (pulp_wars-d8xm)", () => {
  it("builds two and three Monuments in one city, and their +3s add up", () => {
    const { state: start, cityId, tiles } = staged();
    const city = (state: GameStateV7) => {
      const found = state.cities.find((candidate) => candidate.id === cityId);
      if (found === undefined) throw new Error("city missing");
      return found;
    };
    const before = city(start);
    let state = start;
    ACHIEVEMENTS.forEach((achievement, index) => {
      const at = tiles[index] as CoordV7;
      const command = { kind: "BUILD_MONUMENT", achievement, at } as const;
      const view = viewForV7(state, state.humanPlayerId);
      // Offered in a city that already has `index` Monuments.
      expect(queryPlayerCommandsV7(view), achievement).toContainEqual(command);
      expect(previewMonumentV7(view, command)).toMatchObject({
        ok: true,
        preview: { cityId, cityMonuments: index, populationAdded: 3 },
      });
      state = play(state, command);
      expect(cityMonuments(state, cityId), achievement).toHaveLength(index + 1);
    });
    const monuments = cityMonuments(state, cityId);
    expect(monuments.map((item) => item.source)).toEqual(
      ACHIEVEMENTS.map((achievement, index) => ({
        kind: "MONUMENT",
        achievement,
        at: tiles[index],
        builderFaction: "ORIGINAL",
      })),
    );
    expect(monuments.reduce((sum, item) => sum + item.amount, 0)).toBe(9);
    // Only the Monuments add live population: +3 each.
    expect(city(state).economicPopulation - before.economicPopulation).toBe(9);
    expect(city(state).level).toBeGreaterThan(before.level);
    for (const at of tiles)
      expect(
        state.board.tiles.find((tile) => same(tile.at, at))?.improvement,
      ).toBe("MONUMENT");
    // Every entitlement spent once; none left to spend.
    const human = state.players.find(
      (player) => player.id === state.humanPlayerId,
    );
    expect(
      human?.achievementEntitlements
        .filter((item) => ACHIEVEMENTS.includes(item.achievement))
        .every((item) => item.spent),
    ).toBe(true);
    // Each Monument appears in the view with its own +3.
    const view = viewForV7(state, state.humanPlayerId);
    expect(
      view.populationContributions.filter(
        (item) => item.cityId === cityId && item.source.kind === "MONUMENT",
      ),
    ).toHaveLength(3);
    expect(
      view.improvementValues.filter(
        (item) =>
          item.improvement === "MONUMENT" &&
          tiles.some((at) => same(at, item.at)),
      ),
    ).toHaveLength(3);
  });

  it("still enforces every other placement rule for the second Monument", () => {
    const { state: start, tiles } = staged();
    const first = tiles[0] as CoordV7;
    const state = play(start, {
      kind: "BUILD_MONUMENT",
      achievement: "EXPLORER",
      at: first,
    });
    // The spent entitlement, an occupied tile, and an unearned achievement.
    expect(
      applyCommandV7(state, state.humanPlayerId, {
        kind: "BUILD_MONUMENT",
        achievement: "EXPLORER",
        at: tiles[1] as CoordV7,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "ACHIEVEMENT_ENTITLEMENT_SPENT" },
    });
    expect(
      applyCommandV7(state, state.humanPlayerId, {
        kind: "BUILD_MONUMENT",
        achievement: "MUSTER",
        at: first,
      }),
    ).toMatchObject({ accepted: false, error: { code: "INVALID_TILE" } });
    expect(
      applyCommandV7(state, state.humanPlayerId, {
        kind: "BUILD_MONUMENT",
        achievement: "SLAYER",
        at: tiles[1] as CoordV7,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "ACHIEVEMENT_NOT_UNLOCKED" },
    });
  });

  it("has the Normal AI place a second Monument in a city that has one", () => {
    const { state: start, cityId, tiles } = staged();
    const first = play(start, {
      kind: "BUILD_MONUMENT",
      achievement: "EXPLORER",
      at: tiles[0] as CoordV7,
    });
    // No Coins (the reward paid some): nothing else to spend on.
    const state = checkedV7({
      ...first,
      players: first.players.map((player) =>
        player.id === first.humanPlayerId ? { ...player, coins: 0 } : player,
      ),
    });
    const decision = chooseNormalCommandV7(
      viewForV7(state, state.humanPlayerId),
    );
    // The free tiles of the city that has a Monument are candidates.
    const offered = decision.candidates.filter(
      ({ command }) => command.kind === "BUILD_MONUMENT",
    );
    expect(offered.length).toBeGreaterThan(0);
    // The seat's turn (its own policy, one command at a time) builds them.
    let next = state;
    const built: CoordV7[] = [];
    for (let step = 0; step < 24; step += 1) {
      const command = chooseNormalCommandV7(
        viewForV7(next, next.humanPlayerId),
      ).command;
      if (command === null || command.kind === "END_TURN") break;
      const result = applyCommandV7(next, next.humanPlayerId, command);
      if (!result.accepted) throw new Error(result.error.code);
      if (command.kind === "BUILD_MONUMENT") built.push(command.at);
      next = result.state;
    }
    expect(built.length).toBeGreaterThan(0);
    for (const at of built)
      expect(
        next.board.tiles.find((tile) => same(tile.at, at))?.territoryCityId,
      ).toBe(cityId);
    // Both remaining entitlements went into the one city: three Monuments.
    expect(cityMonuments(next, cityId)).toHaveLength(3);
  });
});

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}
