import {
  previewColdSnapV7,
  previewCrackIceV7,
  previewFreezeV7,
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
  CRACK_ICE_PICK_V7,
  FREEZE_PICK_V7,
  ICE_LABEL_V7,
  SKATE_TRAIL_LABEL_V7,
  crackIceOutcomeTextV7,
  crackIceOutcomeV7,
  crackIceTargetLabelV7,
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
 * picking mode of a line role and the water ring of the Ice Witch's Cold
 * Snap, and the slide of a Move across ice. Everything is read from the
 * public view, the offered commands and the public previews.
 */

/** TERRAIN only: the sea ice over a water cell. */
export interface SeaIceCellV7 {
  readonly depth: "SHALLOW" | "DEEP";
  /** SEA_ICE_EDGE_* bits: the sides where the ice meets open water. */
  readonly openWater: number;
  /** The edge's stable variant (0 or 1). */
  readonly variant: number;
  /**
   * Thick ice (its owner has Glacier; the frozen sea redesign,
   * RULESET_7_ICE_REDESIGN.md section 4.1): dusted with snow.
   */
  readonly permanent: boolean;
  /** Cracks: 0 (sound) or 2 (cracked thick ice). */
  readonly stage: 0 | 1 | 2 | 3;
}

/**
 * A line role's Freeze being aimed, or (the frozen sea redesign, bead
 * pulp_wars-5ti.27) another faction's Crack Ice: its tiles are the only map
 * targets.
 */
export interface FreezePickV7 {
  readonly kind: "FREEZE" | "CRACK_ICE";
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
      permanent: entry.thick,
      stage: iceCrackStageV7(entry),
    });
  }
  return cells;
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
    const outcome = freezeOutcomeV7(preview);
    return [
      {
        at: command.at,
        command,
        family: "FREEZE",
        previewLabel: freezeTargetLabelV7(outcome),
        ...(outcome.frozenUnits === 0
          ? {}
          : { previewNote: `Frozen ${outcome.frozenUnits}` }),
        semanticLabel: `${freezeOutcomeTextV7(outcome)} ${FREEZE_PICK_V7}.`,
        freeze: { tiles: preview.tiles },
      },
    ];
  });
}

/**
 * The map targets of an armed Crack Ice (the frozen sea redesign,
 * RULESET_7_ICE_REDESIGN.md section 4.1): one per offered `CRACK_ICE` of
 * the unit, on its ice tile, labelled with the exact outcome of
 * `previewCrackIceV7`. It harms the owner's work, so it wears the Attack
 * mark; over an own or allied iced-over dock it wears the Help mark.
 */
export function crackIcePickTargetsV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  pick: FreezePickV7,
): MapCommandTargetV7[] {
  return commands.flatMap((command): MapCommandTargetV7[] => {
    if (command.kind !== "CRACK_ICE" || command.unitId !== pick.unitId)
      return [];
    const preview = previewCrackIceV7(view, command.unitId, command.at);
    if (preview === null) return [];
    const outcome = crackIceOutcomeV7(view, preview);
    return [
      {
        at: command.at,
        command,
        family: "CRACK_ICE",
        ...(outcome.dock ? { highlight: "SUPPORT" as const } : {}),
        previewLabel: crackIceTargetLabelV7(outcome),
        semanticLabel: `${crackIceOutcomeTextV7(outcome)} ${CRACK_ICE_PICK_V7}.`,
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
 * line reaches beyond its target, tinted, and "Frozen" on every ship a
 * Freeze would Freeze.
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
    for (const id of preview.frozenUnits) ships.add(id);
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
  addFrozenPreviewEntries(entries, view, ships);
}

function addFrozenPreviewEntries(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  ships: ReadonlySet<number>,
): void {
  for (const id of ships) {
    const ship = view.units.find((unit) => unit.id === id);
    if (ship === undefined) continue;
    entries.push({
      key: `ability-target:FROZEN:${id}`,
      kind: "ABILITY_TARGET",
      layer: 7.5,
      at: ship.at,
      abilityStyle: "FROZEN",
      label: "Frozen",
    });
  }
}

/**
 * The Ice Witch's Cold Snap (`pulp_wars-s55m.1`: one tap casts it, and with
 * Rime it also turns the water around her to ice): while she is selected
 * and her Cold Snap is on offer, the water it would freeze is marked quiet;
 * while its button is hovered or focused the ring is prominent, with the
 * outcome's label on her tile and "Frozen" on every unit it changes. They
 * are not targets.
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
    !freezesRingV7(view, witch) ||
    !commands.some(
      (candidate) =>
        candidate.kind === "COLD_SNAP" && candidate.unitId === unitId,
    )
  )
    return;
  const preview = previewColdSnapV7(view, witch.id);
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
  if (preview.tiles.length > 0)
    entries.push({
      key: `ability-target:FREEZE_RING:${unitId}`,
      kind: "ABILITY_TARGET",
      layer: 7.5,
      at: witch.at,
      abilityStyle: "FREEZE_FOCUS",
      label: `${ICE_LABEL_V7} ${preview.tiles.length}`,
    });
  addFrozenPreviewEntries(
    entries,
    view,
    new Set(
      preview.targets
        .filter((target) => !target.alreadyFrozen)
        .map((target) => target.unitId),
    ),
  );
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
 * a unit that skates (`stats.iceFolk.skates`): every run of two or more
 * ice tiles in one straight line is drawn as a skate trail (Ice Folk
 * movement, `pulp_wars-s55m.2`; a forced slide before). (The slip of every
 * other ground unit is gone with `pulp_wars-y242`, 7r132: such a unit never
 * enters ice, and a walker or flyer crosses it like land.)
 *
 * Null for a Move with no skate trail.
 */
export function moveOnIceV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { kind: "MOVE" }>,
): {
  readonly slides: readonly MoveSlideV7[];
} | null {
  if (view.ice.length === 0) return null;
  const unit = view.units.find((candidate) => candidate.id === command.unitId);
  const end = command.path.at(-1);
  if (unit === undefined || end === undefined || unit.form !== "LAND")
    return null;
  const ice = new Set(view.ice.map((entry) => key(entry.at)));
  if (!command.path.some((at) => ice.has(key(at)))) return null;
  const stats = view.unitStats.find((entry) => entry.unitId === unit.id);
  if (stats?.iceFolk?.skates !== true) return null;
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
  return slides.length === 0 ? null : { slides };
}

/** The label a Move on ice adds to its cursor description, or null. */
export function moveOnIceLabelV7(
  onIce: ReturnType<typeof moveOnIceV7>,
): string | null {
  return onIce === null ? null : SKATE_TRAIL_LABEL_V7;
}
