import {
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  appendReplayCommandV7,
  applyCommandV7,
  createPlayableGameV7,
  createReplayV7,
  effectiveRoleRuleV7,
  queryPlayerCommandsV7,
  unitId,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerId,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { createSaveEnvelopeV7 } from "../../src/persistence/index";
import { checkedV7, mirrorOptionV7 } from "./v7-builders";
import { createRevision13MapStateV7 } from "./v7-revision13-map";

/**
 * Revision 13 Undead UI fixtures on the seed-2 DRY_LAND 11x11 board (the
 * board of the Undead engine tests). Seat 0 is the human; its capital is
 * (8, 8) and the seat-1 capital is (2, 8). Villages sit at (5, 5), (8, 5)
 * and (5, 8). Piece and Grave tiles are cleared to Grass.
 */
export interface UndeadUiPieceV7 {
  readonly seat: number;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
}

export const UNDEAD_UI_READY_V7: UnitStateV7["activation"] = {
  moved: false,
  movedPathLength: 0,
  attacked: false,
  attacksUsed: 0,
  tendedThisTurn: false,
  inspired: false,
  overrunActive: false,
  escapeAvailable: false,
  recovered: false,
  captured: false,
  handled: false,
  specialActed: false,
};

export function undeadUiSetupV7(
  factions: readonly FactionIdV7[] = ["UNDEAD", "ORIGINAL"],
): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: 2,
    width: 11,
    height: 11,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...factions],
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
    curiosities: false,
    ...mirrorOptionV7(factions),
  };
}

/** A human-turn arena with every technology, the pieces, and the Graves. */
export function undeadUiArenaV7(
  pieces: readonly UndeadUiPieceV7[],
  graves: readonly CoordV7[] = [],
  factions: readonly FactionIdV7[] = ["UNDEAD", "ORIGINAL"],
): GameStateV7 {
  const created = createRevision13MapStateV7(undeadUiSetupV7(factions));
  if (!created.ok) throw new Error(created.error.code);
  const base = created.state;
  const player = (seat: number) => {
    const found = base.players.find((candidate) => candidate.seat === seat);
    if (found === undefined) throw new Error(`Seat ${seat} missing`);
    return found;
  };
  const units = pieces.map((piece, index): UnitStateV7 => {
    const owner = player(piece.seat);
    const rule = effectiveRoleRuleV7(piece.role, owner.faction);
    return {
      id: unitId(base.nextEntityId + index),
      ownerId: owner.id,
      homeCityId:
        base.cities.find((city) => city.ownerId === owner.id)?.id ?? null,
      role: piece.role,
      form: "LAND",
      at: piece.at,
      hp: piece.hp ?? rule.maxHp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: UNDEAD_UI_READY_V7,
    };
  });
  const cleared = [...pieces.map((piece) => piece.at), ...graves];
  const same = (left: CoordV7, right: CoordV7): boolean =>
    left.x === right.x && left.y === right.y;
  const allTiles = base.board.tiles.map((tile) => tile.at);
  return checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + pieces.length,
    activeSeatIndex: base.turnOrder.indexOf(player(0).id),
    players: base.players.map((candidate) => ({
      ...candidate,
      researchedTechs: TECHNOLOGY_IDS_V7,
      coins: 10_000,
      // Unlocked in advance so that command tails emit no achievements.
      achievementEntitlements: candidate.achievementEntitlements.map(
        (entitlement) => ({ ...entitlement, unlocked: true }),
      ),
      explored: [...allTiles].sort((a, b) => a.y - b.y || a.x - b.x),
    })),
    cities: base.cities.map((city) => ({ ...city, cityActionAvailable: true })),
    units,
    treasureChests: base.treasureChests.filter(
      (chest) => !cleared.some((at) => same(at, chest)),
    ),
    graves: [...graves].sort((a, b) => a.y - b.y || a.x - b.x),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        cleared.some((at) => same(at, tile.at)) && tile.site === null
          ? {
              ...tile,
              biome: tile.biome ?? "PLAINS",
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
            }
          : tile,
      ),
    },
  });
}

export const UNDEAD_SHOWCASE_V7 = {
  banshee: { x: 2, y: 2 },
  wailVictim: { x: 3, y: 3 },
  wailSurvivor: { x: 1, y: 1 },
  necromancer: { x: 8, y: 2 },
  raiseGraves: [
    { x: 7, y: 1 },
    { x: 9, y: 1 },
    { x: 9, y: 3 },
  ],
  restlessSkeleton: { x: 7, y: 3 },
  ghoul: { x: 5, y: 1 },
  lich: { x: 6, y: 6 },
  lichTarget: { x: 4, y: 6 },
  lichSplash: [
    { x: 3, y: 6 },
    { x: 4, y: 7 },
  ],
  vampire: { x: 9, y: 4 },
  vampireTarget: { x: 10, y: 4 },
  zombie: { x: 7, y: 6 },
  zombieTarget: { x: 7, y: 7 },
  looseGrave: { x: 0, y: 4 },
} as const;

/**
 * Every revision-13 UI surface at once: Wail, Raise Dead, Frenzy, Devour,
 * Lich splash, Lifesteal, Infect, Restless, and loose Graves. The human
 * seat is Undead; seat 1 is Human.
 */
export function undeadShowcaseFixtureV7(): GameStateV7 {
  const at = UNDEAD_SHOWCASE_V7;
  return undeadUiArenaV7(
    [
      { seat: 0, role: "MARKSMAN", at: at.banshee },
      { seat: 1, role: "FIGHTER", at: at.wailVictim, hp: 1 },
      { seat: 1, role: "GUARD", at: at.wailSurvivor },
      { seat: 0, role: "CAPTAIN", at: at.necromancer },
      { seat: 0, role: "FIGHTER", at: at.restlessSkeleton, hp: 5 },
      { seat: 0, role: "RAIDER", at: at.ghoul, hp: 4 },
      { seat: 0, role: "CATAPULT", at: at.lich },
      { seat: 1, role: "FIGHTER", at: at.lichTarget },
      { seat: 1, role: "FIGHTER", at: at.lichSplash[0] },
      { seat: 1, role: "MARKSMAN", at: at.lichSplash[1] },
      { seat: 0, role: "KNIGHT", at: at.vampire, hp: 7 },
      { seat: 1, role: "FIGHTER", at: at.vampireTarget },
      { seat: 0, role: "GUARD", at: at.zombie },
      { seat: 1, role: "FIGHTER", at: at.zombieTarget, hp: 2 },
    ],
    [...at.raiseGraves, at.ghoul, at.looseGrave],
  );
}

/**
 * A real, replay-valid seed-2 Undead-vs-Human save (Undead-vs-Undead until
 * pulp_wars-w5j.1: the browser resumes only distinct factions) that stops on
 * the human turn where Raise Dead first becomes legal. Both seats follow a
 * fixed script (research and train a Necromancer, fight, walk the
 * Necromancer to a Grave), so it never depends on the Normal AI. The browser
 * smoke loads it through the production resume path.
 */
export function scriptedUndeadRaiseDeadSaveV7(savedAt: string): {
  readonly source: string;
  readonly necromancerAt: CoordV7;
  readonly cursorStart: CoordV7;
  readonly graves: readonly CoordV7[];
} {
  const setup = undeadUiSetupV7(["UNDEAD", "ORIGINAL"]);
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(created.error.code);
  let state = created.state;
  let replay = createReplayV7(setup);
  for (let step = 0; step < 400; step += 1) {
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) throw new Error("No active seat");
    const command = scriptedRaiseDeadCommand(state, actor);
    if (command.kind === "RAISE_DEAD") {
      const necromancer = state.units.find(
        (unit) => unit.id === command.unitId,
      );
      const capital = state.cities.find(
        (city) => city.ownerId === state.humanPlayerId && city.isCapital,
      );
      if (necromancer === undefined || capital === undefined)
        throw new Error("Scripted Raise Dead actors missing");
      return {
        source: JSON.stringify(
          createSaveEnvelopeV7({ state, replay }, savedAt),
        ),
        necromancerAt: necromancer.at,
        cursorStart: capital.at,
        graves: state.graves,
      };
    }
    const result = applyCommandV7(state, actor, command);
    if (!result.accepted)
      throw new Error(`${command.kind} rejected: ${result.error.code}`);
    replay = appendReplayCommandV7(replay, command, result.state);
    state = result.state;
  }
  throw new Error("Raise Dead never became legal");
}

function scriptedRaiseDeadCommand(
  state: GameStateV7,
  actor: PlayerId,
): CommandV7 {
  const commands = queryPlayerCommandsV7(state, actor);
  const scripted =
    (actor === state.humanPlayerId
      ? commands.find((command) => command.kind === "RAISE_DEAD")
      : undefined) ?? commands.find((command) => command.kind === "ATTACK");
  if (scripted !== undefined) return scripted;
  const same = (left: CoordV7, right: CoordV7): boolean =>
    left.x === right.x && left.y === right.y;
  const chebyshev = (left: CoordV7, right: CoordV7): number =>
    Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
  const nearest = (from: CoordV7, candidates: readonly CoordV7[]) =>
    [...candidates].sort(
      (left, right) => chebyshev(from, left) - chebyshev(from, right),
    )[0];
  if (actor === state.humanPlayerId) {
    const player = state.players.find((item) => item.id === actor);
    const tech = ["GATHERING", "ADMINISTRATION"].find(
      (item) => player?.researchedTechs.includes(item as never) !== true,
    );
    const research = commands.find(
      (command) => command.kind === "RESEARCH" && command.tech === tech,
    );
    if (research !== undefined) return research;
    const train = commands.find(
      (command) => command.kind === "TRAIN" && command.role === "CAPTAIN",
    );
    if (
      tech === undefined &&
      train !== undefined &&
      !state.units.some(
        (unit) => unit.ownerId === actor && unit.role === "CAPTAIN",
      )
    )
      return train;
  }
  for (const unit of state.units.filter((item) => item.ownerId === actor)) {
    const freeGraves = state.graves.filter(
      (grave) => !state.units.some((other) => same(other.at, grave)),
    );
    const target =
      unit.role === "CAPTAIN"
        ? nearest(unit.at, freeGraves)
        : nearest(
            unit.at,
            state.units
              .filter((other) => other.ownerId !== actor)
              .map((other) => other.at),
          );
    if (target === undefined) {
      // With no enemy left to chase, a unit that stands on a Grave steps off
      // it so the Necromancer can raise it (a kill that advances onto the
      // victim's tile would otherwise block the only Grave for good).
      const standsOnGrave = state.graves.some((grave) => same(grave, unit.at));
      const stepOff = commands.find(
        (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
          command.kind === "MOVE" &&
          command.unitId === unit.id &&
          !state.graves.some((grave) =>
            same(grave, command.path.at(-1) ?? unit.at),
          ),
      );
      if (unit.role !== "CAPTAIN" && standsOnGrave && stepOff !== undefined)
        return stepOff;
      continue;
    }
    if (unit.role === "CAPTAIN" && chebyshev(unit.at, target) === 1) continue;
    const best = commands
      .filter(
        (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
          command.kind === "MOVE" && command.unitId === unit.id,
      )
      .sort(
        (left, right) =>
          chebyshev(left.path.at(-1) ?? unit.at, target) -
          chebyshev(right.path.at(-1) ?? unit.at, target),
      )[0];
    if (
      best !== undefined &&
      chebyshev(best.path.at(-1) ?? unit.at, target) <
        chebyshev(unit.at, target)
    )
      return best;
  }
  return { kind: "END_TURN" };
}

/**
 * Revision 14 Plague and Bitten fixtures on the same board. In the Human
 * fixture the human seat is Human (seat 1 Undead): a Captain stands next to
 * a plagued Warrior (its Lich is visible) and a wounded bitten Archer, a
 * Knight faces a Zombie, and a Defender is both plagued (by a distant Lich)
 * and bitten. In the Undead fixture the human seat is Undead: a Lich shot
 * newly plagues its target and one splashed unit (the other is already
 * plagued), a Zombie bites, a Vampire attacks unanswered, and a Banshee and
 * a Skeleton can kill a bitten Warrior that rises for the Undead.
 */
export const AFFLICTION_SHOWCASE_V7 = {
  human: {
    captain: { x: 5, y: 2 },
    plaguedWarrior: { x: 4, y: 2 },
    bittenArcher: { x: 6, y: 2 },
    visibleLich: { x: 3, y: 1 },
    zombie: { x: 7, y: 4 },
    knight: { x: 8, y: 4 },
    doublyAfflicted: { x: 9, y: 7 },
    farLich: { x: 1, y: 9 },
  },
  undead: {
    lich: { x: 6, y: 6 },
    lichTarget: { x: 4, y: 6 },
    plaguedSplash: { x: 3, y: 6 },
    freshSplash: { x: 4, y: 7 },
    zombie: { x: 7, y: 6 },
    zombieTarget: { x: 7, y: 7 },
    vampire: { x: 9, y: 4 },
    vampireTarget: { x: 10, y: 4 },
    banshee: { x: 1, y: 1 },
    bittenVictim: { x: 2, y: 2 },
    skeleton: { x: 3, y: 2 },
  },
} as const;

/** Adds Plague `[unit, source]` and Bitten `[unit, biterSeat, biter]` by piece index. */
function withAfflictionsV7(
  state: GameStateV7,
  plagued: readonly (readonly [number, number])[],
  bitten: readonly (readonly [number, number, number])[],
): GameStateV7 {
  const first = state.nextEntityId - state.units.length;
  const id = (index: number) => unitId(first + index);
  const seatId = (seat: number): PlayerId => {
    const player = state.players.find((candidate) => candidate.seat === seat);
    if (player === undefined) throw new Error(`Seat ${seat} missing`);
    return player.id;
  };
  return checkedV7({
    ...state,
    plagued: plagued
      .map(([unit, source]) => ({
        unitId: id(unit),
        sourceUnitId: id(source),
        turnsRemaining: 3,
      }))
      .sort((left, right) => left.unitId - right.unitId),
    bitten: bitten
      .map(([unit, seat, biter]) => ({
        unitId: id(unit),
        biterPlayerId: seatId(seat),
        biterUnitId: id(biter),
      }))
      .sort((left, right) => left.unitId - right.unitId),
  });
}

export function afflictionHumanFixtureV7(): GameStateV7 {
  const at = AFFLICTION_SHOWCASE_V7.human;
  return withAfflictionsV7(
    undeadUiArenaV7(
      [
        { seat: 0, role: "CAPTAIN", at: at.captain },
        { seat: 0, role: "FIGHTER", at: at.plaguedWarrior },
        { seat: 0, role: "MARKSMAN", at: at.bittenArcher, hp: 6 },
        { seat: 1, role: "CATAPULT", at: at.visibleLich },
        { seat: 1, role: "GUARD", at: at.zombie },
        { seat: 0, role: "KNIGHT", at: at.knight },
        { seat: 0, role: "GUARD", at: at.doublyAfflicted, hp: 8 },
        { seat: 1, role: "CATAPULT", at: at.farLich },
      ],
      [],
      ["ORIGINAL", "UNDEAD"],
    ),
    [
      [1, 3],
      [6, 7],
    ],
    [
      [2, 1, 4],
      [6, 1, 4],
    ],
  );
}

export function afflictionUndeadFixtureV7(): GameStateV7 {
  const at = AFFLICTION_SHOWCASE_V7.undead;
  return withAfflictionsV7(
    undeadUiArenaV7([
      { seat: 0, role: "CATAPULT", at: at.lich },
      { seat: 1, role: "FIGHTER", at: at.lichTarget },
      { seat: 1, role: "FIGHTER", at: at.plaguedSplash },
      { seat: 1, role: "MARKSMAN", at: at.freshSplash },
      { seat: 0, role: "GUARD", at: at.zombie },
      { seat: 1, role: "FIGHTER", at: at.zombieTarget },
      { seat: 0, role: "KNIGHT", at: at.vampire, hp: 7 },
      { seat: 1, role: "FIGHTER", at: at.vampireTarget },
      { seat: 0, role: "MARKSMAN", at: at.banshee },
      { seat: 1, role: "FIGHTER", at: at.bittenVictim, hp: 1 },
      { seat: 0, role: "FIGHTER", at: at.skeleton },
    ]),
    [[2, 0]],
    [[9, 0, 4]],
  );
}
