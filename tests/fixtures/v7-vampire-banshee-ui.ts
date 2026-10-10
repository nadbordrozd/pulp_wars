import {
  applyCommandV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import { undeadUiArenaV7 } from "./v7-undead-ui";

/**
 * The Vampire and Banshee rework, interface (`pulp_wars-iqhp`): hand-built
 * states on the Undead UI board (seed 2, 11 x 11, the human seat Undead
 * and seat 1 Human). Each state is reached through the engine's own
 * commands, never by writing the per-turn lists by hand, and no state
 * plays an AI turn.
 */
export const VAMPIRE_BANSHEE_UI_V7 = {
  /** Bat Escape: the Vampire has attacked a Warrior that survived. */
  escape: {
    vampire: { x: 5, y: 2 },
    target: { x: 6, y: 2 },
    ownSkeleton: { x: 4, y: 2 },
    enemyGuard: { x: 5, y: 3 },
  },
  /** Feast: the wounded Vampire killed a Warrior; another stands by. */
  feast: {
    vampire: { x: 5, y: 2 },
    victim: { x: 6, y: 2 },
    next: { x: 6, y: 3 },
  },
  /** Wail and Terror: the Banshee, three enemies, an own Skeleton. */
  wail: {
    banshee: { x: 2, y: 2 },
    survivor: { x: 3, y: 3 },
    guard: { x: 1, y: 1 },
    victim: { x: 4, y: 2 },
    skeleton: { x: 4, y: 4 },
  },
  /** Ethereal: the Banshee on a Road beside an enemy Warrior. */
  ethereal: {
    banshee: { x: 3, y: 6 },
    road: [
      { x: 3, y: 6 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
    ],
    enemy: { x: 3, y: 5 },
    pastZoc: { x: 5, y: 6 },
  },
} as const;

function unitAt(state: GameStateV7, at: CoordV7): UnitStateV7 {
  const unit = state.units.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (unit === undefined) throw new Error(`No unit at ${at.x},${at.y}`);
  return unit;
}

function applied(state: GameStateV7, command: CommandV7): GameStateV7 {
  const result = applyCommandV7(state, state.humanPlayerId, command);
  if (!result.accepted)
    throw new Error(`${command.kind} rejected: ${result.error.code}`);
  return result.state;
}

/** Bat Escape: after the Vampire's attack on a Warrior that survives. */
export function vampireBatEscapeFixtureV7(): GameStateV7 {
  const at = VAMPIRE_BANSHEE_UI_V7.escape;
  const state = undeadUiArenaV7([
    { seat: 0, role: "KNIGHT", at: at.vampire },
    { seat: 1, role: "FIGHTER", at: at.target },
    { seat: 0, role: "FIGHTER", at: at.ownSkeleton },
    { seat: 1, role: "GUARD", at: at.enemyGuard },
  ]);
  return applied(state, {
    kind: "ATTACK",
    unitId: unitAt(state, at.vampire).id,
    targetUnitId: unitAt(state, at.target).id,
  });
}

/** Before the Feast kill: the wounded Vampire and a 1 HP Warrior. */
export function vampireFeastSetupFixtureV7(): GameStateV7 {
  const at = VAMPIRE_BANSHEE_UI_V7.feast;
  return undeadUiArenaV7([
    { seat: 0, role: "KNIGHT", at: at.vampire, hp: 5 },
    { seat: 1, role: "FIGHTER", at: at.victim, hp: 1 },
    { seat: 1, role: "FIGHTER", at: at.next, hp: 3 },
  ]);
}

/** Feast: after the wounded Vampire's kill (it may attack once more). */
export function vampireFeastFixtureV7(): GameStateV7 {
  const at = VAMPIRE_BANSHEE_UI_V7.feast;
  const state = vampireFeastSetupFixtureV7();
  return applied(state, {
    kind: "ATTACK",
    unitId: unitAt(state, at.vampire).id,
    targetUnitId: unitAt(state, at.victim).id,
  });
}

/** Before the Wail: the Banshee with two survivors and a victim in range. */
export function bansheeWailFixtureV7(): GameStateV7 {
  const at = VAMPIRE_BANSHEE_UI_V7.wail;
  return undeadUiArenaV7([
    { seat: 0, role: "MARKSMAN", at: at.banshee },
    { seat: 1, role: "FIGHTER", at: at.survivor },
    { seat: 1, role: "GUARD", at: at.guard },
    { seat: 1, role: "FIGHTER", at: at.victim, hp: 1 },
    { seat: 0, role: "FIGHTER", at: at.skeleton },
  ]);
}

/** Terror: after the Wail (two terrified enemies, one fallen). */
export function bansheeTerrorFixtureV7(): GameStateV7 {
  const at = VAMPIRE_BANSHEE_UI_V7.wail;
  const state = bansheeWailFixtureV7();
  return applied(state, {
    kind: "WAIL",
    unitId: unitAt(state, at.banshee).id,
  });
}

/** Ethereal: the Banshee on a Road, an enemy's zone of control across it. */
export function bansheeEtherealFixtureV7(): GameStateV7 {
  const at = VAMPIRE_BANSHEE_UI_V7.ethereal;
  const state = undeadUiArenaV7(
    [
      { seat: 0, role: "MARKSMAN", at: at.banshee },
      { seat: 1, role: "FIGHTER", at: at.enemy },
    ],
    [],
  );
  const roads = at.road as readonly CoordV7[];
  return checkedV7({
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        roads.some((road) => road.x === tile.at.x && road.y === tile.at.y)
          ? {
              ...tile,
              biome: tile.biome ?? "PLAINS",
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: true,
              fieldDefense: false,
            }
          : tile,
      ),
    },
  });
}
