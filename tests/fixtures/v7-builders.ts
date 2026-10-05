import {
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  distinctFactionsV7,
  parseGameStateV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerStateV7,
  type TileStateV7,
} from "../../src/engine/index";
import { revision13MapStateV7 } from "./v7-revision13-map";

/**
 * Test only: the mirror option (`allowDuplicateFactions: true`,
 * docs/architecture/HEADLESS_SIMULATION.md) when `factions` repeats a
 * faction, so a fixture keeps its mirror match under the unique-factions
 * rule (docs/product/RULESET_7_UNIQUE_FACTIONS.md); nothing otherwise.
 */
export function mirrorOptionV7(factions: readonly FactionIdV7[]): {
  readonly allowDuplicateFactions?: true;
} {
  return new Set(factions).size === factions.length
    ? {}
    : { allowDuplicateFactions: true };
}

/**
 * A browser-legal setup (the browser refuses the mirror option): the
 * {@link setupV7} board with distinct factions, Human then Undead, Goblin,
 * and Dinosaur (docs/product/RULESET_7_UNIQUE_FACTIONS.md).
 */
export function browserSetupV7(
  seed = 71,
  aiCount: 1 | 2 | 3 = 1,
): MatchSetupV7 {
  const size = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: distinctFactionsV7(aiCount + 1),
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  };
}

/**
 * The all-Human rule fixture setup: a Human mirror match through the test
 * only mirror option.
 */
export function setupV7(seed = 71, aiCount: 1 | 2 | 3 = 1): MatchSetupV7 {
  const size = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: Array.from({ length: aiCount + 1 }, () => "ORIGINAL"),
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
    allowDuplicateFactions: true,
  };
}

/**
 * The board these rule fixtures were written against: the revision-13 map of
 * the setup (revision 14 added a neutral village to generated maps; the
 * map-generation tests cover the revision-14 counts).
 */
export function initialV7(seed = 71, aiCount: 1 | 2 | 3 = 1): GameStateV7 {
  const created = {
    ok: true as const,
    state: revision13MapStateV7(setupV7(seed, aiCount)),
  };
  const humanTurnIndex = created.state.turnOrder.indexOf(
    created.state.humanPlayerId,
  );
  if (humanTurnIndex < 0) throw new Error("Human turn missing");
  return checkedV7({
    ...created.state,
    activeSeatIndex: humanTurnIndex,
    cities: created.state.cities.map((city) =>
      city.ownerId === created.state.humanPlayerId
        ? { ...city, cityActionAvailable: true }
        : city,
    ),
  });
}

export function checkedV7(state: GameStateV7): GameStateV7 {
  const parsed = parseGameStateV7(state);
  if (parsed === null) throw new Error("Invalid v7 fixture");
  return parsed;
}

export function richV7(state: GameStateV7, coins = 10_000): GameStateV7 {
  return checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId ? { ...player, coins } : player,
    ),
  });
}

export function allTechsV7(state: GameStateV7): GameStateV7 {
  return checkedV7({
    ...state,
    players: state.players.map((player) => ({
      ...player,
      researchedTechs: TECHNOLOGY_IDS_V7,
      coins: Math.max(player.coins, 10_000),
    })),
  });
}

export function activePlayerV7(state: GameStateV7): PlayerStateV7 {
  const id = state.turnOrder[state.activeSeatIndex];
  const player = state.players.find((candidate) => candidate.id === id);
  if (player === undefined) throw new Error("Active player missing");
  return player;
}

export function replaceTileV7(
  state: GameStateV7,
  at: CoordV7,
  patch: Partial<Omit<TileStateV7, "at" | "territoryCityId">>,
): GameStateV7 {
  return checkedV7({
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        tile.at.x === at.x && tile.at.y === at.y ? { ...tile, ...patch } : tile,
      ),
    },
  });
}

export function exploredAllV7(state: GameStateV7): GameStateV7 {
  return checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? { ...player, explored: state.board.tiles.map((tile) => tile.at) }
        : player,
    ),
  });
}
