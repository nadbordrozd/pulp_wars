import {
  createPlayableGameV7,
  parseGameStateV7,
  type GameStateV7,
  type MapTypeV7,
  type PlayerId,
} from "../../src/engine/index";
import { setupV7 } from "./v7-builders";

const READY = {
  moved: false,
  movedPathLength: 0,
  attacked: false,
  attacksUsed: 0 as const,
  healed: false,
  recovered: false,
  captured: false,
  handled: false,
  specialActed: false,
};

/** Legal two-island state with only the departure coast and first lane revealed. */
export function isolatedNavalScenarioV7(
  mapType: Exclude<MapTypeV7, "DRY_LAND">,
  seed: number,
  deepLane: boolean,
  geometry: "ISOLATED" | "SEA_SHORTCUT" = "ISOLATED",
  defendedTarget = false,
): { readonly state: GameStateV7; readonly subjectId: PlayerId } {
  const setup = { ...setupV7(seed, 1), mapType };
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(created.error.code);
  const source = created.state;
  const subjectId = source.turnOrder[0];
  const targetId = source.turnOrder[1];
  if (subjectId === undefined || targetId === undefined)
    throw new Error("scenario players missing");
  const subjectCity = source.cities.find((city) => city.ownerId === subjectId);
  const targetCity = source.cities.find((city) => city.ownerId === targetId);
  const subjectUnit = source.units.find((unit) => unit.ownerId === subjectId);
  const targetUnit = source.units.find((unit) => unit.ownerId === targetId);
  if (
    subjectCity === undefined ||
    targetCity === undefined ||
    subjectUnit === undefined ||
    targetUnit === undefined
  )
    throw new Error("scenario pieces missing");
  const subjectAt = { x: 1, y: geometry === "ISOLATED" ? 5 : 3 };
  const targetAt = { x: 9, y: geometry === "ISOLATED" ? 5 : 3 };
  const visiblePatrolDanger =
    mapType === "CONTINENTS" && geometry === "ISOLATED";
  const subjectExplored = source.board.tiles
    .filter((tile) =>
      geometry === "ISOLATED"
        ? tile.at.x <= 4
        : tile.at.x <= 3 ||
          tile.at.x >= 8 ||
          tile.at.y >= 10 ||
          (tile.at.y >= 2 && tile.at.y <= 4),
    )
    .map((tile) => tile.at);
  const targetExplored = source.board.tiles
    .filter((tile) => tile.at.x >= 7)
    .map((tile) => tile.at);
  const candidate: GameStateV7 = {
    ...source,
    setup,
    round: 1,
    activeSeatIndex: 0,
    commandIndex: 0,
    populationContributions: [],
    treasureChests: [],
    pendingChoices: [],
    outcome: null,
    players: source.players.map((player) => ({
      ...player,
      coins: player.id === subjectId ? 5 : 0,
      researchedTechs: ["GATHERING"],
      explored: player.id === subjectId ? subjectExplored : targetExplored,
      spoilsClaimedCityIds: [],
      status: "ACTIVE",
    })),
    cities: source.cities.map((city) =>
      city.id === subjectCity.id
        ? {
            ...city,
            at: subjectAt,
            level: 1,
            permanentPopulation: 0,
            economicPopulation: 0,
            population: 0,
            expanded: false,
            rewards: [],
          }
        : {
            ...city,
            at: targetAt,
            level: 1,
            permanentPopulation: 0,
            economicPopulation: 0,
            population: 0,
            expanded: false,
            rewards: [],
          },
    ),
    units: source.units.map((unit) =>
      unit.id === subjectUnit.id
        ? {
            ...unit,
            role: "FIGHTER",
            form: "LAND",
            at: subjectAt,
            hp: 10,
            maxHp: 10,
            kills: 0,
            veteran: false,
            captureEligible: false,
            activation: READY,
          }
        : {
            ...unit,
            role: visiblePatrolDanger ? "PATROL_BOAT" : "FIGHTER",
            form: visiblePatrolDanger ? "NAVAL" : "LAND",
            at: visiblePatrolDanger
              ? { x: 4, y: subjectAt.y }
              : defendedTarget
                ? targetAt
                : { x: 10, y: targetAt.y },
            hp: 10,
            maxHp: 10,
            kills: 0,
            veteran: false,
            captureEligible: false,
            activation: READY,
          },
    ),
    board: {
      ...source.board,
      tiles: source.board.tiles.map((tile) => {
        const subjectLand =
          tile.at.x <= 2 || (geometry === "SEA_SHORTCUT" && tile.at.y === 10);
        const subjectTerritory = tile.at.x <= 3;
        const targetLand = tile.at.x >= 8;
        const water = !subjectLand && !targetLand;
        return {
          at: tile.at,
          biome: water ? null : ("PLAINS" as const),
          terrain: water
            ? deepLane && (tile.at.x === 5 || tile.at.x === 6)
              ? ("DEEP_WATER" as const)
              : ("SHALLOW_WATER" as const)
            : ("GRASS" as const),
          resource: null,
          improvement: null,
          road: false,
          fieldDefense: false,
          site:
            tile.at.x === subjectAt.x && tile.at.y === subjectAt.y
              ? ("CAPITAL" as const)
              : tile.at.x === targetAt.x && tile.at.y === targetAt.y
                ? ("CAPITAL" as const)
                : null,
          territoryCityId: subjectTerritory
            ? subjectCity.id
            : targetLand
              ? targetCity.id
              : null,
        };
      }),
    },
  };
  const state = parseGameStateV7(candidate);
  if (state === null) throw new Error("invalid isolated naval scenario");
  return { state, subjectId };
}

/**
 * An isolated invasion where a prior public glimpse of the far island leaves
 * unknown land beside a component that no owned capture unit can reach.
 */
export function disconnectedLandGlimpseNavalScenarioV7(): {
  readonly state: GameStateV7;
  readonly subjectId: PlayerId;
} {
  const fixture = isolatedNavalScenarioV7(
    "CONTINENTS",
    9410,
    false,
    "ISOLATED",
  );
  const glimpse = { x: 8, y: 5 } as const;
  const candidate: GameStateV7 = {
    ...fixture.state,
    players: fixture.state.players.map((player) =>
      player.id === fixture.subjectId
        ? {
            ...player,
            explored: fixture.state.board.tiles
              .filter(
                (tile) =>
                  player.explored.some(
                    (at) => at.x === tile.at.x && at.y === tile.at.y,
                  ) ||
                  (tile.at.x === glimpse.x && tile.at.y === glimpse.y),
              )
              .map((tile) => tile.at),
          }
        : player,
    ),
  };
  const state = parseGameStateV7(candidate);
  if (state === null) throw new Error("invalid disconnected glimpse scenario");
  return { state, subjectId: fixture.subjectId };
}
