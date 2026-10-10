import { resolveCityGrowthV7, type GameStateV7 } from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import { cityOfV7 } from "./v7-dinosaur-arena";
import { sameV7, seatIdV7, type GoblinPieceV7 } from "./v7-goblin-arena";
import { fieldV7, type FieldOptionsV7 } from "./v7-revision20";

/**
 * Cult rule fixtures (docs/product/RULESET_7_CULTISTS.md; first used by the
 * Favour bead, `pulp_wars-mch9.4`) on top of the revision-20 field: the
 * two-seat 11 x 11 board (seat 0 capital (8, 8) with territory x 7 to 9,
 * y 7 to 9; seat 1 capital (2, 8) with territory x 1 to 3, y 7 to 9;
 * villages (5, 5), (8, 5), (5, 8)) whose land outside every territory and
 * site is open Grass, all of it explored by both seats. Seat 0 is the Cult
 * and seat 1 Human unless the options say otherwise.
 */
export function cultFieldV7(
  pieces: readonly GoblinPieceV7[],
  options: FieldOptionsV7 = {},
): GameStateV7 {
  return fieldV7(pieces, { factions: ["CULT", "ORIGINAL"], ...options });
}

/** The state with `amount` Favour for the Cult seat `seat` (and no other). */
export function withFavourV7(
  state: GameStateV7,
  seat: number,
  amount: number,
): GameStateV7 {
  return checkedV7({
    ...state,
    cult: {
      ...state.cult,
      favour: [{ playerId: seatIdV7(state, seat), favour: amount }],
    },
  });
}

/**
 * `count` Farms in the capital of `seat`, with the growth they give and the
 * rewards of the levels reached already taken (Stockpile, Walls), so no
 * choice is pending and the city has its action. Two Farms make a level-2
 * city with 2 population (one Offering); one Farm level 2 with 0; four
 * Farms level 3 with 3.
 */
export function withFarmsV7(
  state: GameStateV7,
  seat: number,
  count: number,
): GameStateV7 {
  const city = cityOfV7(state, seat);
  const tiles = state.board.tiles
    .filter(
      (tile) =>
        tile.territoryCityId === city.id &&
        tile.site === null &&
        tile.improvement === null &&
        !state.units.some((unit) => sameV7(unit.at, tile.at)),
    )
    .slice(0, count);
  if (tiles.length !== count) throw new Error("no room for the Farms");
  const grown = resolveCityGrowthV7(
    city,
    city.permanentPopulation,
    city.economicPopulation + 2 * count,
  ).city;
  const rewards = [
    { reachedLevel: 2, reward: "STOCKPILE" as const },
    { reachedLevel: 3, reward: "WALLS" as const },
  ].filter((record) => record.reachedLevel <= grown.level);
  return checkedV7({
    ...state,
    nextEntityId: state.nextEntityId + count,
    cities: state.cities.map((candidate) =>
      candidate.id === city.id
        ? { ...grown, cityActionAvailable: true, rewards }
        : candidate,
    ),
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        tiles.some((farm) => sameV7(farm.at, tile.at))
          ? {
              ...tile,
              resource: "FERTILE_GROUND" as const,
              improvement: "FARM" as const,
            }
          : tile,
      ),
    },
    populationContributions: [
      ...state.populationContributions,
      ...tiles.map((tile, index) => ({
        id: state.nextEntityId + index,
        cityId: city.id,
        category: "LIVE" as const,
        amount: 2,
        source: {
          kind: "IMPROVEMENT" as const,
          improvement: "FARM" as const,
          at: tile.at,
        },
      })),
    ],
  });
}
