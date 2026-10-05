import {
  parseGameStateV7,
  tileAtV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type IceTileV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import {
  NAVAL_TECHS_V7,
  navalArenaV7,
  navalUnitAtV7,
  seatV7,
} from "./v7-naval-branch";

/**
 * The naval branch, engine step II (`pulp_wars-5ti.3`,
 * docs/product/RULESET_7_NAVAL_BRANCH.md section 8): the frozen sea on the
 * authored strait of `v7-naval-branch.ts` (rows 0 to 2 and 8 to 10 land,
 * rows 3 and 7 Shallow Water, rows 4 to 6 Deep Water, the islet on (9, 5)
 * with Shallow Water on its four orthogonal neighbours; capitals on (5, 2)
 * and (5, 8), Ports on (4, 3) and (6, 7)). Seat 0 is Ice Folk by default.
 *
 * The mission builder places no ice and no land unit on water, so a unit
 * that stands on ice is built on a parking tile of its seat's back row and
 * moved there with the ice entries; the result passes the full state schema.
 */
export interface FrozenUnitV7 {
  readonly seat: 0 | 1;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
}

export interface FrozenIceV7 {
  readonly at: CoordV7;
  /** The owning seat (0 by default). */
  readonly seat?: 0 | 1 | 2;
  /** 3 by default (`ICE_TURNS_V7`). */
  readonly turnsLeft?: number;
}

export interface FrozenArenaOptionsV7 {
  readonly factions?: readonly [FactionIdV7, FactionIdV7];
  readonly technologies?: readonly [
    readonly TechnologyIdV7[],
    readonly TechnologyIdV7[],
  ];
  readonly units: readonly FrozenUnitV7[];
  readonly ice?: readonly FrozenIceV7[];
  readonly explored?: readonly [boolean, boolean];
  readonly ports?: readonly [boolean, boolean];
  readonly aiMode?: "RIVAL" | "COOPERATIVE";
  readonly third?: {
    readonly faction: FactionIdV7;
    readonly explored?: boolean;
  };
}

const NAVAL_ROLES: readonly UnitRoleIdV7[] = [
  "PATROL_BOAT",
  "BATTLESHIP",
  "SUBMARINE",
];
const LAND_ROWS = new Set([0, 1, 2, 8, 9, 10]);
const isLandTile = (at: CoordV7): boolean =>
  LAND_ROWS.has(at.y) || (at.x === 9 && at.y === 5);

/** Every Ice Folk Naval technology and nothing else. */
export const ICE_NAVAL_TECHS_V7 = NAVAL_TECHS_V7;

export function frozenArenaV7(options: FrozenArenaOptionsV7): GameStateV7 {
  const factions = options.factions ?? ["ICE_FOLK", "ORIGINAL"];
  // A land unit aimed at a water tile is parked on its seat's back row.
  const parked: { readonly from: CoordV7; readonly to: CoordV7 }[] = [];
  const counters = [0, 0];
  const units = options.units.map((unit) => {
    if (NAVAL_ROLES.includes(unit.role) || isLandTile(unit.at)) return unit;
    const index = counters[unit.seat] as number;
    counters[unit.seat] = index + 1;
    const from = { x: index, y: unit.seat === 0 ? 0 : 10 };
    parked.push({ from, to: unit.at });
    return { ...unit, at: from };
  });
  const base = navalArenaV7({
    factions,
    technologies: options.technologies ?? [NAVAL_TECHS_V7, NAVAL_TECHS_V7],
    units,
    ...(options.explored === undefined ? {} : { explored: options.explored }),
    ...(options.ports === undefined ? {} : { ports: options.ports }),
    ...(options.aiMode === undefined ? {} : { aiMode: options.aiMode }),
    ...(options.third === undefined ? {} : { third: options.third }),
  });
  const moved = new Map(
    parked.map(({ from, to }) => [navalUnitAtV7(base, from).id, to] as const),
  );
  return frozenStateV7(
    {
      ...base,
      units: base.units.map((unit) => {
        const to = moved.get(unit.id);
        return to === undefined ? unit : { ...unit, at: to };
      }),
    },
    [
      ...(options.ice ?? []),
      // A parked unit's water tile is ice unless the caller listed it.
      ...parked
        .filter(
          ({ to }) =>
            !(options.ice ?? []).some(
              (entry) => entry.at.x === to.x && entry.at.y === to.y,
            ),
        )
        .map(({ to }) => ({ at: to })),
    ],
  );
}

/** `state` with the given ice entries (replacing any on the same tile). */
export function frozenStateV7(
  state: GameStateV7,
  ice: readonly FrozenIceV7[],
): GameStateV7 {
  const entries = new Map<string, IceTileV7>(
    state.ice.map((entry) => [`${entry.at.y},${entry.at.x}`, entry]),
  );
  for (const entry of ice)
    entries.set(`${entry.at.y},${entry.at.x}`, {
      at: { x: entry.at.x, y: entry.at.y },
      ownerId: seatV7(state, entry.seat ?? 0).id,
      turnsLeft: entry.turnsLeft ?? 3,
    });
  const next: GameStateV7 = {
    ...state,
    ice: [...entries.values()].sort(
      (left, right) => left.at.y - right.at.y || left.at.x - right.at.x,
    ),
  };
  const parsed = parseGameStateV7(next);
  if (parsed === null) throw new Error("the frozen state is invalid");
  return parsed;
}

/** The ice entry on `at`, or undefined. */
export function iceEntryV7(
  state: GameStateV7,
  at: CoordV7,
): IceTileV7 | undefined {
  return state.ice.find((entry) => entry.at.x === at.x && entry.at.y === at.y);
}

/** Whether `at` is in the territory of a city `seat` owns. */
export function inTerritoryOfV7(
  state: GameStateV7,
  seat: 0 | 1 | 2,
  at: CoordV7,
): boolean {
  const tile = tileAtV7(state.board, at);
  const owner = seatV7(state, seat).id;
  return (
    tile !== undefined &&
    tile.territoryCityId !== null &&
    state.cities.some(
      (city) => city.id === tile.territoryCityId && city.ownerId === owner,
    )
  );
}

/** Patches one unit and re-validates the state. */
export function patchFrozenUnitV7(
  state: GameStateV7,
  id: number,
  patch: Partial<UnitStateV7>,
): GameStateV7 {
  const parsed = parseGameStateV7({
    ...state,
    units: state.units.map((unit) =>
      unit.id === id ? { ...unit, ...patch } : unit,
    ),
  });
  if (parsed === null) throw new Error("the patched state is invalid");
  return parsed;
}

/** The straight line of `count` tiles from `from` in direction (dx, dy). */
export function lineV7(
  from: CoordV7,
  dx: number,
  dy: number,
  count: number,
): readonly CoordV7[] {
  return Array.from({ length: count }, (_, index) => ({
    x: from.x + dx * (index + 1),
    y: from.y + dy * (index + 1),
  }));
}
