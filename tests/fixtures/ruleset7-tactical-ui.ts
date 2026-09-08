import {
  applyCommandV7,
  createInitialMapStateV7,
  queryPlayerCommandsV7,
  TECHNOLOGY_IDS_V7,
  unitId,
  viewForV7,
  type CommandV7,
  type GameStateV7,
  type PlayerViewV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7, setupV7 } from "./v7-builders";

const READY: UnitStateV7["activation"] = {
  moved: false,
  movedPathLength: 0,
  attacked: false,
  attacksUsed: 0,
  pursuitPhase: "NONE",
  healed: false,
  recovered: false,
  captured: false,
  handled: false,
  specialActed: false,
};

export interface TacticalPublicFixtureV7 {
  readonly label: "ENGINE_APPLIED_SYNTHETIC_FIXTURE";
  readonly state: GameStateV7;
  readonly view: PlayerViewV7;
  readonly offeredCommands: readonly CommandV7[];
}

export function pursuitPublicFixtureV7(): TacticalPublicFixtureV7 {
  const base = tacticalBase(1701);
  const own = required(
    base.units.find((unit) => unit.ownerId === base.humanPlayerId),
  );
  const rival = required(
    base.units.find((unit) => unit.ownerId !== base.humanPlayerId),
  );
  const readyToKill = checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + 1,
    units: [
      {
        ...own,
        role: "LANCER" as const,
        at: { x: 4, y: 4 },
        hp: 12,
        maxHp: 12,
        activation: READY,
      },
      {
        ...rival,
        role: "GUARD" as const,
        at: { x: 5, y: 4 },
        hp: 1,
        maxHp: 15,
        activation: READY,
      },
      {
        ...rival,
        id: unitId(base.nextEntityId),
        role: "FIGHTER" as const,
        at: { x: 6, y: 4 },
        hp: 10,
        maxHp: 10,
        activation: READY,
      },
    ].sort((left, right) => left.id - right.id),
  });
  const killed = applyCommandV7(readyToKill, readyToKill.humanPlayerId, {
    kind: "ATTACK",
    unitId: own.id,
    targetUnitId: rival.id,
  });
  if (!killed.accepted) throw new Error(killed.error.code);
  return project(killed.state);
}

export function pursuitRewardPublicFixtureV7(): TacticalPublicFixtureV7 {
  const pursuit = pursuitPublicFixtureV7();
  const city = required(
    pursuit.state.cities.find(
      (candidate) => candidate.ownerId === pursuit.state.humanPlayerId,
    ),
  );
  const populationCoords = pursuit.state.board.tiles
    .filter((tile) => tile.territoryCityId === city.id)
    .slice(0, 2)
    .map((tile) => tile.at);
  if (populationCoords.length !== 2)
    throw new Error("Pursuit reward population coordinates missing");
  return project(
    checkedV7({
      ...pursuit.state,
      nextEntityId: pursuit.state.nextEntityId + 2,
      cities: pursuit.state.cities.map((candidate) =>
        candidate.id === city.id
          ? {
              ...candidate,
              level: 2,
              permanentPopulation: 2,
              economicPopulation: 0,
              population: 0,
            }
          : candidate,
      ),
      populationContributions: populationCoords.map((at, index) => ({
        id: pursuit.state.nextEntityId + index,
        cityId: city.id,
        category: "PERMANENT" as const,
        amount: 1,
        source: {
          kind: "RESOURCE_ACTION" as const,
          action: "HARVEST_FRUIT" as const,
          at,
        },
      })),
      pendingChoices: [
        {
          kind: "CITY_REWARD",
          cityId: city.id,
          reachedLevel: 2,
          candidates: ["SURVEY", "STOCKPILE"],
        },
      ],
    }),
  );
}

export function defectionPublicFixtureV7(
  multipleHomeCities = true,
): TacticalPublicFixtureV7 {
  const base = tacticalBase(1702, multipleHomeCities ? 2 : 1);
  const own = required(
    base.units.find((unit) => unit.ownerId === base.humanPlayerId),
  );
  const rival = required(
    base.units.find((unit) => unit.ownerId !== base.humanPlayerId),
  );
  const targetOwnerId = rival.ownerId;
  const donor = multipleHomeCities
    ? required(
        base.players.find(
          (player) =>
            player.id !== base.humanPlayerId && player.id !== targetOwnerId,
        ),
      )
    : undefined;
  const state = checkedV7({
    ...base,
    players: base.players.map((player) =>
      player.id === donor?.id ? { ...player, status: "ELIMINATED" } : player,
    ),
    cities: base.cities.map((city) =>
      city.ownerId === donor?.id
        ? { ...city, ownerId: base.humanPlayerId }
        : city,
    ),
    units: [
      {
        ...own,
        role: "ENVOY" as const,
        at: { x: 4, y: 4 },
        hp: 7,
        maxHp: 7,
        activation: READY,
      },
      {
        ...rival,
        role: "GUARD" as const,
        at: { x: 6, y: 4 },
        hp: 15,
        maxHp: 15,
        activation: READY,
      },
    ]
      .filter((unit) => unit.ownerId !== donor?.id)
      .sort((left, right) => left.id - right.id),
  });
  return project(state);
}

export function blackoutPublicFixtureV7(): TacticalPublicFixtureV7 {
  const base = tacticalBase(1703);
  const own = required(
    base.units.find((unit) => unit.ownerId === base.humanPlayerId),
  );
  const city = required(
    base.cities.find((candidate) => candidate.ownerId !== base.humanPlayerId),
  );
  const state = checkedV7({
    ...base,
    units: [
      {
        ...own,
        role: "SABOTEUR" as const,
        at: { x: city.at.x - 1, y: city.at.y },
        hp: 10,
        maxHp: 10,
        activation: READY,
        blackoutEligibleRound: 1,
      },
    ],
  });
  return project(state);
}

function tacticalBase(seed: number, aiCount: 1 | 2 | 3 = 1): GameStateV7 {
  const created = createInitialMapStateV7(setupV7(seed, aiCount));
  if (!created.ok) throw new Error(created.error.code);
  const state = created.state;
  return checkedV7({
    ...state,
    activeSeatIndex: state.turnOrder.indexOf(state.humanPlayerId),
    players: state.players.map((player) => ({
      ...player,
      coins: 10_000,
      researchedTechs: TECHNOLOGY_IDS_V7,
      explored:
        player.id === state.humanPlayerId
          ? state.board.tiles.map((tile) => tile.at)
          : player.explored,
    })),
    treasureChests: state.treasureChests.filter(
      (at) => !(at.x >= 3 && at.x <= 7 && at.y >= 3 && at.y <= 5),
    ),
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        tile.at.x >= 3 && tile.at.x <= 7 && tile.at.y >= 3 && tile.at.y <= 5
          ? {
              ...tile,
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              site: tile.site,
              road: false,
            }
          : tile,
      ),
    },
  });
}

function project(state: GameStateV7): TacticalPublicFixtureV7 {
  const view = viewForV7(state, state.humanPlayerId);
  return {
    label: "ENGINE_APPLIED_SYNTHETIC_FIXTURE",
    state,
    view,
    offeredCommands: queryPlayerCommandsV7(view),
  };
}

function required<T>(value: T | undefined): T {
  if (value === undefined)
    throw new Error("Synthetic tactical fixture missing");
  return value;
}
