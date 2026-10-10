import {
  applyCommandV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import { coastalV7 } from "./v7-naval-builders";

/**
 * Bead pulp_wars-5ti.12: static boards for the review of Ports joining the
 * Road network, built with real commands on one generated map (seed 9003:
 * the human capital at (2,2), villages at (2,8) and (5,8)). The column
 * x = 2 between the capital and the first village becomes water.
 *
 * - `portLinkAdjacentFixtureV7`: a city with a Port beside its center.
 * - `portLinkPortsFixtureV7`: two cities linked only by their Ports.
 * - `portLinkChainFixtureV7`: a mixed chain. The capital, a Road tile, a
 *   Port two tiles from the center, the sea, the second city's Port and
 *   center, and a Road on to a third city.
 */
export const PORT_LINK_UI_V7 = {
  capital: { x: 2, y: 2 },
  capitalPort: { x: 2, y: 3 },
  /** The chain's Road tile and the dock beyond it. */
  chainRoad: { x: 2, y: 3 },
  chainPort: { x: 2, y: 4 },
  secondPort: { x: 2, y: 7 },
  second: { x: 2, y: 8 },
  thirdRoads: [
    { x: 3, y: 8 },
    { x: 4, y: 8 },
  ],
  third: { x: 5, y: 8 },
} as const;

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

function base(waterFromY: number): GameStateV7 {
  const fixture = coastalV7(9_003);
  const human = fixture.state.humanPlayerId;
  const walker = fixture.state.units.find((unit) => unit.ownerId === human);
  if (walker === undefined) throw new Error("unit missing");
  return checkedV7({
    ...fixture.state,
    units: fixture.state.units.map((unit) =>
      unit.id === walker.id
        ? { ...unit, at: PORT_LINK_UI_V7.second, captureEligible: true }
        : unit,
    ),
    board: {
      ...fixture.state.board,
      tiles: fixture.state.board.tiles.map((tile) =>
        tile.at.x === 2 && tile.at.y >= waterFromY && tile.at.y <= 7
          ? {
              ...tile,
              biome: null,
              terrain: "SHALLOW_WATER" as const,
              resource: null,
              improvement: null,
              road: false,
            }
          : tile.at.x === 2 && tile.at.y === 3
            ? {
                ...tile,
                biome: "PLAINS" as const,
                terrain: "GRASS" as const,
                resource: null,
                improvement: null,
              }
            : tile,
      ),
    },
  });
}

/** Applies human commands, taking the first reward of every level reached. */
function play(start: GameStateV7, commands: readonly CommandV7[]): GameStateV7 {
  let state = start;
  const apply = (command: CommandV7): void => {
    const result = applyCommandV7(state, state.humanPlayerId, command);
    if (!result.accepted)
      throw new Error(`${command.kind}: ${result.error.code}`);
    state = result.state;
  };
  for (const command of commands) {
    apply(command);
    while (state.pendingChoices[0] !== undefined) {
      const choice = state.pendingChoices[0];
      const reward = choice.candidates[0];
      if (reward === undefined) throw new Error("reward missing");
      apply({
        kind: "CHOOSE_CITY_REWARD",
        cityId: choice.cityId,
        reachedLevel: choice.reachedLevel,
        reward,
      });
    }
  }
  return state;
}

function walkerId(state: GameStateV7): GameStateV7["units"][number]["id"] {
  const walker = state.units.find(
    (unit) => unit.ownerId === state.humanPlayerId,
  );
  if (walker === undefined) throw new Error("unit missing");
  return walker.id;
}

/** A capital with one Port beside its center, and nothing else. */
export function portLinkAdjacentFixtureV7(): GameStateV7 {
  return play(base(3), [
    { kind: "BUILD_PORT", at: PORT_LINK_UI_V7.capitalPort },
  ]);
}

/** Two cities, a Port beside each center, four steps of water between. */
export function portLinkPortsFixtureV7(): GameStateV7 {
  const start = base(3);
  return play(start, [
    { kind: "CAPTURE", unitId: walkerId(start) },
    { kind: "BUILD_PORT", at: PORT_LINK_UI_V7.capitalPort },
    { kind: "BUILD_PORT", at: PORT_LINK_UI_V7.secondPort },
  ]);
}

/**
 * The mixed chain: capital, Road, Port (granted to the capital, two tiles
 * from its center), sea, the second city's Port and center, and a Road to a
 * third city.
 */
export function portLinkChainFixtureV7(): GameStateV7 {
  const start = base(4);
  const walker = walkerId(start);
  const capital = start.cities.find((city) =>
    same(city.at, PORT_LINK_UI_V7.capital),
  );
  if (capital === undefined) throw new Error("capital missing");
  const captured = play(start, [{ kind: "CAPTURE", unitId: walker }]);
  // The walker goes on to the third village, and the capital's borders
  // take in the water tile two steps south of its center.
  const moved = checkedV7({
    ...captured,
    units: captured.units.map((unit) =>
      unit.id === walker
        ? {
            ...unit,
            at: PORT_LINK_UI_V7.third,
            captureEligible: true,
            activation:
              start.units.find((item) => item.id === walker)?.activation ??
              unit.activation,
          }
        : unit,
    ),
    board: {
      ...captured.board,
      tiles: captured.board.tiles.map((tile) =>
        same(tile.at, PORT_LINK_UI_V7.chainPort)
          ? { ...tile, territoryCityId: capital.id }
          : tile,
      ),
    },
  });
  return play(moved, [
    { kind: "CAPTURE", unitId: walker },
    { kind: "BUILD_ROAD", at: PORT_LINK_UI_V7.chainRoad },
    { kind: "BUILD_PORT", at: PORT_LINK_UI_V7.chainPort },
    { kind: "BUILD_PORT", at: PORT_LINK_UI_V7.secondPort },
    ...PORT_LINK_UI_V7.thirdRoads.map(
      (at) => ({ kind: "BUILD_ROAD", at }) as const,
    ),
  ]);
}
