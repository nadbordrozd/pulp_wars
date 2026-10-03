import {
  unitRoleRuleV7,
  type CommandV7,
  type CoordV7,
  type PlayerViewV7,
  type UnitId,
} from "../engine/index";

/**
 * The Tunnel passenger-first flow (bead pulp_wars-78i.9): which Hammerers
 * can ride, which one is seated first, where a seated Hammerer surfaces by
 * default, and the one TUNNEL command a choice stands for. Everything is
 * read from the offered commands and the public view: a rider tile is
 * legal only when an offered TUNNEL names it, and the default landing is a
 * presentation choice among those tiles, never a rule.
 */

export type TunnelCommandV7 = Extract<CommandV7, { kind: "TUNNEL" }>;

/** A Hammerer that can ride the Mole's tunnel. */
export interface TunnelRiderV7 {
  readonly unitId: UnitId;
  readonly at: CoordV7;
  readonly hp: number;
  readonly maxHp: number;
  /** The viewer's label of its role ("Hammerer"). */
  readonly label: string;
}

/**
 * The state of an aimed Tunnel: the Mole, the chosen destination (null
 * until one is chosen), the seated passenger (null: the Mole tunnels
 * alone) and the passenger's landing when the player moved it (null: the
 * default landing).
 */
export interface TunnelChoiceStateV7 {
  readonly unitId: UnitId;
  readonly to: CoordV7 | null;
  readonly riderUnitId: UnitId | null;
  readonly riderTo: CoordV7 | null;
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const key = (at: CoordV7): string => `${at.x},${at.y}`;

/** The offered TUNNEL commands of the Mole `unitId`, in offered order. */
export function tunnelCommandsV7(
  commands: readonly CommandV7[],
  unitId: UnitId,
): TunnelCommandV7[] {
  return commands.filter(
    (command): command is TunnelCommandV7 =>
      command.kind === "TUNNEL" && command.unitId === unitId,
  );
}

/** Every destination of the Mole once, in offered order. */
export function tunnelDestinationsV7(
  commands: readonly CommandV7[],
  unitId: UnitId,
): CoordV7[] {
  const seen = new Set<string>();
  const destinations: CoordV7[] = [];
  for (const command of tunnelCommandsV7(commands, unitId)) {
    if (seen.has(key(command.to))) continue;
    seen.add(key(command.to));
    destinations.push(command.to);
  }
  return destinations;
}

/**
 * The Hammerers that can ride (an offered TUNNEL names them), best first:
 * the most HP, then the lowest ID. The first is seated when the Tunnel is
 * aimed.
 */
export function tunnelRidersV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  unitId: UnitId,
): TunnelRiderV7[] {
  const ids = new Set<UnitId>();
  for (const command of tunnelCommandsV7(commands, unitId))
    if (command.rider !== null) ids.add(command.rider.unitId);
  return [...ids]
    .flatMap((id): TunnelRiderV7[] => {
      const unit = view.units.find((candidate) => candidate.id === id);
      return unit === undefined
        ? []
        : [
            {
              unitId: unit.id,
              at: unit.at,
              hp: unit.hp,
              maxHp: unit.maxHp,
              label: unitRoleRuleV7(view, unit).label,
            },
          ];
    })
    .sort((left, right) => right.hp - left.hp || left.unitId - right.unitId);
}

/** The legal landing tiles of `riderUnitId` next to `to`, in offered order. */
export function tunnelRiderTilesV7(
  commands: readonly CommandV7[],
  unitId: UnitId,
  to: CoordV7,
  riderUnitId: UnitId,
): CoordV7[] {
  return tunnelCommandsV7(commands, unitId).flatMap((command) =>
    command.rider !== null &&
    command.rider.unitId === riderUnitId &&
    same(command.to, to)
      ? [command.rider.to]
      : [],
  );
}

const distance = (left: CoordV7, right: CoordV7): number =>
  (left.x - right.x) ** 2 + (left.y - right.y) ** 2;

/**
 * The default landing of a seated Hammerer next to the Mole's destination
 * `to`: the tile closest to the visible enemy unit or village nearest to
 * `to`; with neither in sight, the tile closest to the one that continues
 * the tunnel's direction (from `from`, the Mole's tile). Ties keep the
 * offered order. Null when no tile is offered (it stays behind).
 */
export function tunnelAutoLandingV7(
  view: PlayerViewV7,
  from: CoordV7,
  to: CoordV7,
  tiles: readonly CoordV7[],
): CoordV7 | null {
  if (tiles.length === 0) return null;
  const interests: CoordV7[] = [
    ...view.units
      .filter((unit) => unit.ownerId !== view.viewer.id)
      .map((unit) => unit.at),
    ...view.board.tiles.flatMap((tile) =>
      tile.explored && tile.site === "VILLAGE" ? [tile.at] : [],
    ),
  ];
  let aim: CoordV7 = {
    x: to.x + Math.sign(to.x - from.x),
    y: to.y + Math.sign(to.y - from.y),
  };
  let nearest = Infinity;
  for (const at of interests) {
    const gap = distance(at, to);
    if (gap < nearest) {
      nearest = gap;
      aim = at;
    }
  }
  let best = tiles[0] ?? null;
  let bestGap = best === null ? Infinity : distance(best, aim);
  for (const tile of tiles.slice(1)) {
    const gap = distance(tile, aim);
    if (gap < bestGap) {
      best = tile;
      bestGap = gap;
    }
  }
  return best;
}

/** What committing an aimed Tunnel to `to` would send, and its preview. */
export interface TunnelOutcomeV7 {
  /** The TUNNEL command: with the rider and its landing, or alone. */
  readonly command: TunnelCommandV7;
  /** The seated Hammerer's landing, or null. */
  readonly landing: CoordV7 | null;
  /** The other legal landings of the seated Hammerer next to `to`. */
  readonly otherLandings: readonly CoordV7[];
  /** A Hammerer is seated but no tile next to `to` is free for it. */
  readonly staysBehind: boolean;
}

/**
 * The outcome of committing `state` with the destination `to`: the seated
 * Hammerer lands on `state.riderTo` when that is still legal there (the
 * chosen destination only), else on the default landing; the Mole tunnels
 * alone when nobody is seated or no tile is free. Null when `to` is no
 * offered destination.
 */
export function tunnelOutcomeV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  state: TunnelChoiceStateV7,
  to: CoordV7,
): TunnelOutcomeV7 | null {
  const tunnels = tunnelCommandsV7(commands, state.unitId);
  const alone = tunnels.find(
    (command) => command.rider === null && same(command.to, to),
  );
  const mole = view.units.find((unit) => unit.id === state.unitId);
  if (alone === undefined || mole === undefined) return null;
  if (state.riderUnitId === null)
    return {
      command: alone,
      landing: null,
      otherLandings: [],
      staysBehind: false,
    };
  const tiles = tunnelRiderTilesV7(
    commands,
    state.unitId,
    to,
    state.riderUnitId,
  );
  const chosen =
    state.to !== null &&
    same(state.to, to) &&
    state.riderTo !== null &&
    tiles.some((tile) => same(tile, state.riderTo as CoordV7))
      ? state.riderTo
      : tunnelAutoLandingV7(view, mole.at, to, tiles);
  const command =
    chosen === null
      ? undefined
      : tunnels.find(
          (candidate) =>
            candidate.rider !== null &&
            candidate.rider.unitId === state.riderUnitId &&
            same(candidate.to, to) &&
            same(candidate.rider.to, chosen),
        );
  if (chosen === null || command === undefined)
    return {
      command: alone,
      landing: null,
      otherLandings: [],
      staysBehind: true,
    };
  return {
    command,
    landing: chosen,
    otherLandings: tiles.filter((tile) => !same(tile, chosen)),
    staysBehind: false,
  };
}
