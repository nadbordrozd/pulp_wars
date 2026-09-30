import {
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  unitId,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerId,
  type TechnologyIdV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import { createRevision13MapStateV7 } from "./v7-revision13-map";

/**
 * Revision-17 Goblin rule fixtures: a seed-2 Dry Land revision-13 board of
 * the given seat factions (11×11 for two seats, 14×14 for three), with the
 * given pieces as the only units. Every non-settlement piece tile is cleared
 * to Grass (or Shallow Water); pieces may stand on settlement centers.
 *
 * Two-seat board: seat 0 capital (8, 8), seat 1 capital (2, 8), villages
 * (5, 5), (8, 5), (5, 8). Three-seat board: capitals (2, 2), (11, 11),
 * (11, 2); villages (8, 2), (8, 5), (11, 5), (5, 8).
 */
export const READY_V7: UnitStateV7["activation"] = {
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

export interface GoblinPieceV7 {
  readonly seat: number;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
  readonly form?: UnitStateV7["form"];
  readonly activation?: Partial<UnitStateV7["activation"]>;
  readonly captureEligible?: boolean;
}

export interface GoblinArenaOptionsV7 {
  readonly activeSeat?: number;
  readonly water?: readonly CoordV7[];
  readonly aiMode?: MatchSetupV7["aiMode"];
  /** Researched technologies per seat (default: every technology). */
  readonly techs?: Readonly<Record<number, readonly TechnologyIdV7[]>>;
  readonly coins?: number;
}

export function goblinSetupV7(
  factions: readonly FactionIdV7[],
  seed = 2,
  aiMode: MatchSetupV7["aiMode"] = "RIVAL",
): MatchSetupV7 {
  const aiCount = (factions.length - 1) as 1 | 2 | 3;
  const size = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode,
    humanColor: "CORAL",
    factions: [...factions],
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
  };
}

export function goblinArenaV7(
  factions: readonly FactionIdV7[],
  pieces: readonly GoblinPieceV7[],
  options: GoblinArenaOptionsV7 = {},
): GameStateV7 {
  const created = createRevision13MapStateV7(
    goblinSetupV7(factions, 2, options.aiMode),
  );
  if (!created.ok) throw new Error(created.error.code);
  const base = created.state;
  const water = options.water ?? [];
  const player = (seat: number) => {
    const found = base.players.find((candidate) => candidate.seat === seat);
    if (found === undefined) throw new Error("seat missing");
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
      form: piece.form ?? "LAND",
      at: piece.at,
      hp: piece.hp ?? rule.maxHp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: piece.captureEligible ?? false,
      activation: { ...READY_V7, ...piece.activation },
    };
  });
  const cleared = [...pieces.map((piece) => piece.at), ...water];
  const activeId = player(options.activeSeat ?? 0).id;
  const all = base.board.tiles.map((tile) => tile.at);
  return checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + pieces.length,
    activeSeatIndex: base.turnOrder.indexOf(activeId),
    players: base.players.map((candidate) => ({
      ...candidate,
      researchedTechs: options.techs?.[candidate.seat] ?? TECHNOLOGY_IDS_V7,
      coins: options.coins ?? 100,
      explored: all,
    })),
    cities: base.cities.map((city) => ({ ...city, cityActionAvailable: true })),
    units,
    treasureChests: base.treasureChests.filter(
      (chest) => !cleared.some((at) => sameV7(at, chest)),
    ),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        water.some((at) => sameV7(at, tile.at))
          ? {
              ...tile,
              biome: null,
              terrain: "SHALLOW_WATER" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
              site: null,
            }
          : cleared.some((at) => sameV7(at, tile.at)) && tile.site === null
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

export function applyOkV7(
  state: GameStateV7,
  actor: PlayerId,
  command: CommandV7,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const result = applyCommandV7(state, actor, command);
  if (!result.accepted)
    throw new Error(`${command.kind} rejected: ${result.error.code}`);
  return result;
}

/** Ends turns until `playerId`'s turn has started; returns every event. */
export function endTurnUntilV7(
  state: GameStateV7,
  playerId: PlayerId,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  let current = state;
  const events: DomainEventV7[] = [];
  for (let step = 0; step < state.turnOrder.length; step += 1) {
    const actor = current.turnOrder[current.activeSeatIndex];
    if (actor === undefined) throw new Error("active player missing");
    const result = applyOkV7(current, actor, { kind: "END_TURN" });
    current = result.state;
    events.push(...result.events);
    if (current.turnOrder[current.activeSeatIndex] === playerId)
      return { state: current, events };
  }
  throw new Error("turn never reached");
}

export function unitAtV7(state: GameStateV7, at: CoordV7): UnitStateV7 {
  const unit = state.units.find((candidate) => sameV7(candidate.at, at));
  if (unit === undefined) throw new Error(`no unit at ${at.x},${at.y}`);
  return unit;
}

export function seatIdV7(state: GameStateV7, seat: number): PlayerId {
  const player = state.players.find((candidate) => candidate.seat === seat);
  if (player === undefined) throw new Error("seat missing");
  return player.id;
}

export const sameV7 = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
