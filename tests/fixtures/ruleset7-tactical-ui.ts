import {
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

export function horseArcherPublicFixtureV7(): TacticalPublicFixtureV7 {
  const base = tacticalBase(1701);
  const own = required(
    base.units.find((unit) => unit.ownerId === base.humanPlayerId),
  );
  const rival = required(
    base.units.find((unit) => unit.ownerId !== base.humanPlayerId),
  );
  const state = checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + 1,
    units: [
      {
        ...own,
        role: "HORSE_ARCHER" as const,
        at: { x: 4, y: 4 },
        hp: 10,
        maxHp: 10,
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
      {
        ...rival,
        id: unitId(base.nextEntityId),
        role: "FIGHTER" as const,
        at: { x: 4, y: 6 },
        hp: 10,
        maxHp: 10,
        activation: READY,
      },
    ].sort((left, right) => left.id - right.id),
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
