import {
  previewFreezeV7,
  unitMovementModeV7,
  type CommandV7,
  type CoordV7,
  type PlayerViewV7,
  type UnitId,
} from "../../engine/index";
import {
  SEA_ICE_EDGE_EAST_V7,
  SEA_ICE_EDGE_NORTH_V7,
  SEA_ICE_EDGE_SOUTH_V7,
  SEA_ICE_EDGE_WEST_V7,
} from "../../assets/sea-ice-v7";
import {
  FREEZE_PICK_V7,
  ICEBOUND_LABEL_V7,
  SLIDE_MOVE_LABEL_V7,
  SLIP_MOVE_LABEL_V7,
  crushWarningV7,
  freezeOutcomeTextV7,
  freezeOutcomeV7,
  freezeTargetLabelV7,
  freezesRingV7,
  iceCrackStageV7,
} from "../frozen-sea-presentation-v7";
import type {
  BoardRenderPlanEntryV7,
  MapCommandTargetV7,
} from "./board-renderer-v7";

/**
 * The frozen sea on the board plan (bead pulp_wars-5ti.7, second part;
 * docs/ui/BOARD_TARGETING.md section 3.5): the ice of each water cell (its
 * depth, its edges against open water, its snow or cracks), the Freeze
 * picking mode of a line role and the ring of the Ice Witch, the slide of a
 * Move across ice, and the markers of an icebound ship. Everything is read
 * from the public view, the offered commands and the public previews.
 */

/** TERRAIN only: the sea ice over a water cell. */
export interface SeaIceCellV7 {
  readonly depth: "SHALLOW" | "DEEP";
  /** SEA_ICE_EDGE_* bits: the sides where the ice meets open water. */
  readonly openWater: number;
  /** The edge's stable variant (0 or 1). */
  readonly variant: number;
  /** Ice in its owner's territory: dusted with snow, it never melts. */
  readonly permanent: boolean;
  /** Melting cracks: 0 (none) to 3 (wide), from the countdown. */
  readonly stage: 0 | 1 | 2 | 3;
  /** The countdown itself, for the cursor description. */
  readonly turnsLeft: number;
}

/** UNIT only: a ship locked in the ice, and the crush it takes next. */
export interface IceboundMarkerV7 {
  /** "−3 HP" or "Sinks". */
  readonly crush: string;
  readonly lethal: boolean;
}

/** A line role's Freeze being aimed: its tiles are the only map targets. */
export interface FreezePickV7 {
  readonly kind: "FREEZE";
  readonly unitId: UnitId;
}

/** What the plan shows of the Witch's ring: quiet at rest, or prominent. */
export type FreezeRingWeightV7 = "QUIET" | "PROMINENT";

const key = (at: CoordV7): string => `${at.x},${at.y}`;

/** The sea ice of every explored water cell that has an entry. */
export function seaIceCellsV7(
  view: PlayerViewV7,
): ReadonlyMap<string, SeaIceCellV7> {
  const cells = new Map<string, SeaIceCellV7>();
  if (view.ice.length === 0) return cells;
  const ice = new Set(view.ice.map((entry) => key(entry.at)));
  const terrain = new Map<string, string>();
  for (const tile of view.board.tiles)
    if (tile.explored) terrain.set(key(tile.at), tile.terrain);
  for (const entry of view.ice) {
    const under = terrain.get(key(entry.at));
    if (under !== "SHALLOW_WATER" && under !== "DEEP_WATER") continue;
    let openWater = 0;
    for (const [bit, dx, dy] of [
      [SEA_ICE_EDGE_NORTH_V7, 0, -1],
      [SEA_ICE_EDGE_EAST_V7, 1, 0],
      [SEA_ICE_EDGE_SOUTH_V7, 0, 1],
      [SEA_ICE_EDGE_WEST_V7, -1, 0],
    ] as const) {
      const neighbour = { x: entry.at.x + dx, y: entry.at.y + dy };
      const beside = terrain.get(key(neighbour));
      // Open water: an explored water cell without ice. The shore, more
      // ice, the board's edge and the unknown leave the sheet whole.
      if (
        (beside === "SHALLOW_WATER" || beside === "DEEP_WATER") &&
        !ice.has(key(neighbour))
      )
        openWater |= bit;
    }
    cells.set(key(entry.at), {
      depth: under === "SHALLOW_WATER" ? "SHALLOW" : "DEEP",
      openWater,
      variant: (entry.at.x * 7 + entry.at.y * 13) & 1,
      permanent: entry.permanent,
      stage: iceCrackStageV7(entry),
      turnsLeft: entry.turnsLeft,
    });
  }
  return cells;
}

/** The marker of an icebound unit (any owner), or undefined. */
export function iceboundMarkerV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
): IceboundMarkerV7 | undefined {
  const warning = crushWarningV7(view, unit);
  return warning === null
    ? undefined
    : { crush: warning.label, lethal: warning.lethal };
}

/**
 * The map targets of an armed Freeze: one per offered `FREEZE` of the unit,
 * on the tile it aims at, with the exact outcome of `previewFreezeV7`.
 */
export function freezePickTargetsV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  pick: FreezePickV7,
): MapCommandTargetV7[] {
  const unit = view.units.find((candidate) => candidate.id === pick.unitId);
  if (unit === undefined) return [];
  return commands.flatMap((command): MapCommandTargetV7[] => {
    if (command.kind !== "FREEZE" || command.unitId !== pick.unitId) return [];
    const preview = previewFreezeV7(view, command.unitId, command.at);
    if (preview === null) return [];
    const outcome = freezeOutcomeV7(view, unit, preview);
    return [
      {
        at: command.at,
        command,
        family: "FREEZE",
        previewLabel: freezeTargetLabelV7(outcome),
        ...(outcome.icebound === 0
          ? {}
          : { previewNote: `${ICEBOUND_LABEL_V7} ${outcome.icebound}` }),
        semanticLabel: `${freezeOutcomeTextV7(outcome)} ${FREEZE_PICK_V7}.`,
        freeze: { tiles: preview.tiles },
      },
    ];
  });
}

/** The outer edges of a set of cells, for an area's dashed outline. */
function areaEdges(
  cells: ReadonlySet<string>,
  at: CoordV7,
): ("NORTH" | "EAST" | "SOUTH" | "WEST")[] {
  return (["NORTH", "EAST", "SOUTH", "WEST"] as const).filter(
    (edge) =>
      !cells.has(
        key({
          x: at.x + (edge === "EAST" ? 1 : edge === "WEST" ? -1 : 0),
          y: at.y + (edge === "SOUTH" ? 1 : edge === "NORTH" ? -1 : 0),
        }),
      ),
  );
}

/**
 * Preview entries of an armed Freeze that are not targets: the tiles each
 * line reaches beyond its target, tinted, and "Icebound" on every ship a
 * Freeze would lock in.
 */
export function addFreezePickEntriesV7(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  targets: readonly MapCommandTargetV7[],
  pick: FreezePickV7,
): void {
  const targetCells = new Set(targets.map((target) => key(target.at)));
  const beyond = new Map<string, CoordV7>();
  const ships = new Set<number>();
  for (const command of commands) {
    if (command.kind !== "FREEZE" || command.unitId !== pick.unitId) continue;
    const preview = previewFreezeV7(view, command.unitId, command.at);
    if (preview === null) continue;
    for (const at of preview.tiles)
      if (!targetCells.has(key(at))) beyond.set(key(at), at);
    for (const id of preview.icebound) ships.add(id);
  }
  const area = new Set(beyond.keys());
  for (const at of beyond.values())
    entries.push({
      key: `ability-area:FREEZE:${key(at)}`,
      kind: "ABILITY_AREA",
      layer: 7,
      at,
      abilityStyle: "FREEZE",
      targetEdges: areaEdges(area, at),
    });
  addIceboundPreviewEntries(entries, view, ships);
}

function addIceboundPreviewEntries(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  ships: ReadonlySet<number>,
): void {
  for (const id of ships) {
    const ship = view.units.find((unit) => unit.id === id);
    if (ship === undefined) continue;
    entries.push({
      key: `ability-target:ICEBOUND:${id}`,
      kind: "ABILITY_TARGET",
      layer: 7.5,
      at: ship.at,
      abilityStyle: "CHILL",
      label: ICEBOUND_LABEL_V7,
    });
  }
}

/**
 * The Ice Witch's ring (section 8.4): her Freeze has nothing to aim, so the
 * tiles it would turn to ice are marked while she is selected and her one
 * button is on offer: quiet at rest, prominent (with the outcome's label on
 * her tile) while the button is hovered or focused. They are not targets.
 */
export function addFreezeRingEntriesV7(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  unitId: number,
  weight: FreezeRingWeightV7,
): void {
  const witch = view.units.find((candidate) => candidate.id === unitId);
  if (
    witch === undefined ||
    witch.ownerId !== view.viewer.id ||
    !freezesRingV7(view, witch)
  )
    return;
  const command = commands.find(
    (candidate): candidate is Extract<CommandV7, { kind: "FREEZE" }> =>
      candidate.kind === "FREEZE" && candidate.unitId === unitId,
  );
  if (command === undefined) return;
  const preview = previewFreezeV7(view, command.unitId, command.at);
  if (preview === null) return;
  const area = new Set(preview.tiles.map(key));
  for (const at of preview.tiles)
    entries.push({
      key: `ability-area:FREEZE:${key(at)}`,
      kind: "ABILITY_AREA",
      layer: 7,
      at,
      abilityStyle: weight === "PROMINENT" ? "FREEZE_FOCUS" : "FREEZE",
      targetEdges: areaEdges(area, at),
    });
  if (weight !== "PROMINENT") return;
  entries.push({
    key: `ability-target:FREEZE_RING:${unitId}`,
    kind: "ABILITY_TARGET",
    layer: 7.5,
    at: witch.at,
    abilityStyle: "FREEZE_FOCUS",
    label: freezeTargetLabelV7(freezeOutcomeV7(view, witch, preview)),
  });
  addIceboundPreviewEntries(entries, view, new Set(preview.icebound));
}

/** A slide inside a Move: from the first ice tile entered to the stop. */
export interface MoveSlideV7 {
  /** The tile the unit steps from. */
  readonly from: CoordV7;
  /** The ice tiles it crosses, in order; the last is where it stops. */
  readonly tiles: readonly CoordV7[];
}

/**
 * What a Move does on ice, read from the command's own path (the path the
 * engine offers and will walk) and the view's ice list:
 *
 * - a unit that slides (`stats.iceFolk.slides`): every run of two or more
 *   ice tiles in one straight line is a slide (section 8.6);
 * - every other ground unit: a Move that ends on ice ends there (section
 *   8.7, the slip).
 *
 * Null for a Move that touches no ice.
 */
export function moveOnIceV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { kind: "MOVE" }>,
): {
  readonly slides: readonly MoveSlideV7[];
  readonly slip: boolean;
} | null {
  if (view.ice.length === 0) return null;
  const unit = view.units.find((candidate) => candidate.id === command.unitId);
  const end = command.path.at(-1);
  if (unit === undefined || end === undefined || unit.form !== "LAND")
    return null;
  const ice = new Set(view.ice.map((entry) => key(entry.at)));
  if (!command.path.some((at) => ice.has(key(at)))) return null;
  const stats = view.unitStats.find((entry) => entry.unitId === unit.id);
  if (stats?.iceFolk?.slides !== true) {
    // A walker or a flyer is never stopped by terrain; the Sabretooth is an
    // Ice Folk unit and does not slip.
    const slips =
      stats?.iceFolk === undefined &&
      unitMovementModeV7(view, unit) === "GROUND" &&
      ice.has(key(end));
    return slips ? { slides: [], slip: true } : null;
  }
  const slides: MoveSlideV7[] = [];
  let from = unit.at;
  let run: CoordV7[] = [];
  let runFrom = from;
  let direction: string | null = null;
  const flush = (): void => {
    if (run.length >= 2) slides.push({ from: runFrom, tiles: run });
    run = [];
    direction = null;
  };
  for (const to of command.path) {
    const step = `${Math.sign(to.x - from.x)},${Math.sign(to.y - from.y)}`;
    if (!ice.has(key(to))) flush();
    else if (run.length > 0 && step === direction) run.push(to);
    else {
      flush();
      run = [to];
      runFrom = from;
      direction = step;
    }
    from = to;
  }
  flush();
  return slides.length === 0 ? null : { slides, slip: false };
}

/** The label a Move on ice adds to its cursor description, or null. */
export function moveOnIceLabelV7(
  onIce: ReturnType<typeof moveOnIceV7>,
): string | null {
  if (onIce === null) return null;
  return onIce.slip ? SLIP_MOVE_LABEL_V7 : SLIDE_MOVE_LABEL_V7;
}
