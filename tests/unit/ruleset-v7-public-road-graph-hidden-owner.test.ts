import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  parseGameStateV7,
  previewEconomicV7,
  viewForV7,
  type CityId,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerId,
} from "../../src/engine/index";
import { recomputeLiveEconomyV7 } from "../../src/engine/v7/economy";
import { checkedV7 } from "../fixtures/v7-builders";

/**
 * pulp_wars-wp0: the public economy road graph must not treat explored rival
 * territory whose city center is unexplored (hidden city ID, public owner) as
 * neutral. Section 9.1: once a tile is owned, only its owner may use its Road.
 *
 * The scenario derives from the pulp_wars-9jp fixture (player 3, revision 14).
 * Player 3 forgets rival city 78's center at (10, 4) so its explored territory
 * becomes hidden-owner territory, loses the (7, 2) Road that joined city 39 to
 * the capital network, and gains Roads at (8, 2) and on rival tile (9, 3). A
 * Road at (8, 4) would then join city 39 to city 83 only through the rival
 * Road at (9, 3), which canonically cannot carry player 3's network.
 */
const ACTOR = 3 as PlayerId;
const CITY_39 = 39 as CityId;
const CAPITAL = 5 as CityId;
const HIDDEN_CENTER = { x: 10, y: 4 } as const;
const RIVAL_ROAD = { x: 9, y: 3 } as const;
const ROAD: CommandV7 = { kind: "BUILD_ROAD", at: { x: 8, y: 4 } };

const fixture = JSON.parse(
  readFileSync(
    "tests/fixtures/ruleset-v7-land-grant-hidden-owner.json",
    "utf8",
  ),
) as { readonly state: unknown };

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}

function scenario(options: { readonly neutralBridge: boolean }): GameStateV7 {
  const state = parseGameStateV7(fixture.state);
  if (state === null) throw new Error("Invalid hidden-owner fixture");
  const board = {
    ...state.board,
    tiles: state.board.tiles.map((tile) => {
      if (same(tile.at, { x: 7, y: 2 })) return { ...tile, road: false };
      if (same(tile.at, { x: 8, y: 2 })) return { ...tile, road: true };
      if (same(tile.at, RIVAL_ROAD))
        return options.neutralBridge
          ? { ...tile, road: true, territoryCityId: null, improvement: null }
          : { ...tile, road: true };
      return tile;
    }),
  };
  const economy = recomputeLiveEconomyV7(
    state,
    { board, cities: state.cities },
    options.neutralBridge
      ? state.populationContributions.filter(
          (contribution) => !same(contribution.source.at, RIVAL_ROAD),
        )
      : state.populationContributions,
  );
  return checkedV7({
    ...state,
    board,
    players: state.players.map((player) =>
      player.id === ACTOR
        ? {
            ...player,
            explored: player.explored.filter((at) => !same(at, HIDDEN_CENTER)),
          }
        : player,
    ),
    cities: economy.cities,
    populationContributions: economy.populationContributions,
  });
}

function populations(state: GameStateV7): ReadonlyMap<CityId, number> {
  return new Map(
    state.cities
      .filter((city) => city.ownerId === ACTOR)
      .map((city) => [
        city.id,
        city.permanentPopulation + city.economicPopulation,
      ]),
  );
}

/** Reducer-observed population change per owned city, zero deltas omitted. */
function canonicalPopulationDeltas(
  state: GameStateV7,
): readonly { readonly cityId: CityId; readonly delta: number }[] {
  const result = applyCommandV7(state, ACTOR, ROAD);
  if (!result.accepted) throw new Error(result.error.code);
  const before = populations(state);
  const after = populations(result.state);
  return [...after]
    .map(([cityId, value]) => ({
      cityId,
      delta: value - (before.get(cityId) ?? 0),
    }))
    .filter((entry) => entry.delta !== 0)
    .sort((left, right) => left.cityId - right.cityId);
}

describe("ruleset-7 public road graph over hidden-owner territory", () => {
  it("shows the bridge tile as explored rival territory with a hidden city", () => {
    const state = scenario({ neutralBridge: false });
    const view = viewForV7(state, ACTOR);
    expect(
      view.board.tiles.find((tile) => same(tile.at, RIVAL_ROAD)),
    ).toMatchObject({
      explored: true,
      road: true,
      territoryCityId: null,
      territoryOwnerId: 4,
    });
    expect(view.cities.some((city) => city.id === 78)).toBe(false);
    expect(
      state.board.tiles.find((tile) => same(tile.at, RIVAL_ROAD))
        ?.territoryCityId,
    ).toBe(78);
  });

  it("does not route the viewer's road network through a hidden-owner rival Road", () => {
    const state = scenario({ neutralBridge: false });
    const expected = canonicalPopulationDeltas(state);
    // Canonically the rival Road carries nothing: city 39 stays disconnected.
    expect(expected.some((entry) => entry.cityId === CITY_39)).toBe(false);
    expect(expected.some((entry) => entry.cityId === CAPITAL)).toBe(false);
    const preview = previewEconomicV7(viewForV7(state, ACTOR), ROAD);
    if (!preview.ok) throw new Error(preview.error);
    expect(preview.preview.populationDeltaByCity).toEqual(expected);
    expect(
      preview.preview.coinIncomeDeltaByCity.some(
        (entry) => entry.cityId === CITY_39,
      ),
    ).toBe(false);
  });

  it("still routes the network through a neutral Road", () => {
    const state = scenario({ neutralBridge: true });
    const view = viewForV7(state, ACTOR);
    expect(
      view.board.tiles.find((tile) => same(tile.at, RIVAL_ROAD)),
    ).toMatchObject({ territoryCityId: null, territoryOwnerId: null });
    const expected = canonicalPopulationDeltas(state);
    expect(expected).toContainEqual({ cityId: CITY_39, delta: 1 });
    expect(expected).toContainEqual({ cityId: CAPITAL, delta: 1 });
    const preview = previewEconomicV7(view, ROAD);
    if (!preview.ok) throw new Error(preview.error);
    expect(preview.preview.populationDeltaByCity).toEqual(expected);
    // With Commerce, city 39 newly earns land trade.
    expect(preview.preview.coinIncomeDeltaByCity).toContainEqual(
      expect.objectContaining({ cityId: CITY_39 }),
    );
  });
});
