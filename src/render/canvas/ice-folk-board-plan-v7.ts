import {
  COLD_SNAP_RANGE_V7,
  FROST_BOLT_RANGE_V7,
  previewBolasV7,
  previewColdSnapV7,
  previewFrostBoltV7,
  unitGlidesV7,
  unitRoleRuleV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type PlayerViewV7,
  type UnitId,
} from "../../engine/index";
import { iceFolkSnowVariantV7 } from "../../assets/chibi-direction-ice-folk-presentation";
import {
  BOLAS_PICK_V7,
  COLD_SNAP_LABEL_V7,
  FROST_BOLT_LABEL_V7,
  FROST_BOLT_PICK_V7,
  SHATTERS_PREVIEW_V7,
  STAMPEDE_CONFIRM_HINT_V7,
  STAMPEDE_PICK_V7,
  STAYS_FROZEN_V7,
  WILL_BE_FROZEN_V7,
  bolasPreviewLinesV7,
  coldAuraMoveLabelV7,
  coldAuraMoveTargetsV7,
  freezeTargetLabelV7,
  frozenTurnsLeftV7,
  iceFolkCombatLinesV7,
  matchHasIceFolkSeatV7,
  shatterWindowV7,
  stampedeLabelV7,
  stampedePlanV7,
  stampedeSemanticV7,
} from "../ice-folk-presentation-v7";
import type {
  BoardRenderPlanEntryV7,
  MapCommandTargetV7,
} from "./board-renderer-v7";

/**
 * The Ice Folk part of the board plan (bead pulp_wars-7g3.6; Ice Folk
 * Freeze, bead pulp_wars-w49.38): the derived Snow overlay and the Blizzard
 * of each terrain cell (from the view's tile flags), the Frozen marker of
 * each unit, the Bolas, Cold Snap, Frost Bolt and Stampede picking modes,
 * the Witch's Blizzard outline, a Frost Giant's Cold Aura on its Move
 * tiles, and the Ice Folk lines of an attack preview. Everything is read from the public view, the offered commands
 * and the public previews; nothing is recomputed.
 */

/** Snow edge bits: the neighbour on that side is not Snow (the wash is cut). */
export const SNOW_EDGE_NORTH_V7 = 1;
export const SNOW_EDGE_EAST_V7 = 2;
export const SNOW_EDGE_SOUTH_V7 = 4;
export const SNOW_EDGE_WEST_V7 = 8;

/** TERRAIN only: the Snow overlay of a Snow cell. */
export interface IceFolkSnowCellV7 {
  /** Exposed edges (SNOW_EDGE_* bits): a neighbour that is not Snow. */
  readonly edges: number;
  /** iceFolkSnowVariantV7 of the cell. */
  readonly variant: number;
}

/** UNIT only: the Ice Folk markers of a visible unit (any owner). */
export interface IceFolkUnitMarkersV7 {
  /**
   * A Frozen unit in land form: the ice casing and the ice-cube glyph, with
   * its `turnsLeft` (its owner's End Turns until it thaws); null otherwise.
   */
  readonly frozen: { readonly turnsLeft: number } | null;
  /** The HP bar's Shatter window: its lowest {n} HP, or null. */
  readonly shatterWindow: number | null;
  /** A land-form Ice Witch (her Blizzard outline when selected or hovered). */
  readonly witch: boolean;
}

/**
 * A Bolas, a Cold Snap, a Frost Bolt or a Stampede being aimed on the
 * board. While one is active its targets are the only map targets of the
 * selected unit. A Stampede's `chosen` is the end tile picked once (its
 * preview stays drawn; picking it again charges).
 */
export type IceFolkPickV7 =
  | {
      readonly kind: "THROW_BOLAS" | "COLD_SNAP" | "FROST_BOLT";
      readonly unitId: UnitId;
    }
  | {
      readonly kind: "STAMPEDE";
      readonly unitId: UnitId;
      readonly chosen: CoordV7 | null;
    };

const key = (at: CoordV7): string => `${at.x},${at.y}`;
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

/**
 * The Snow and Blizzard of every explored cell, from the view's tile flags
 * (section 6.5): `snow` cells with the edges against cells that are not
 * Snow (water, another territory, an unexplored cell; the board's edge is
 * not cut), and `blizzard` cells, water included.
 */
export function iceFolkTerrainCellsV7(view: PlayerViewV7): {
  readonly snow: ReadonlyMap<string, IceFolkSnowCellV7>;
  readonly blizzard: ReadonlySet<string>;
} {
  const snowKeys = new Set<string>();
  const blizzard = new Set<string>();
  for (const tile of view.board.tiles) {
    if (!tile.explored) continue;
    if (tile.snow === true && tile.biome !== null) snowKeys.add(key(tile.at));
    if (tile.blizzard === true) blizzard.add(key(tile.at));
  }
  const snow = new Map<string, IceFolkSnowCellV7>();
  const { width, height } = view.board;
  for (const cell of snowKeys) {
    const [x, y] = cell.split(",").map(Number) as [number, number];
    let edges = 0;
    for (const [bit, dx, dy] of [
      [SNOW_EDGE_NORTH_V7, 0, -1],
      [SNOW_EDGE_EAST_V7, 1, 0],
      [SNOW_EDGE_SOUTH_V7, 0, 1],
      [SNOW_EDGE_WEST_V7, -1, 0],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (!snowKeys.has(`${nx},${ny}`)) edges |= bit;
    }
    snow.set(cell, { edges, variant: iceFolkSnowVariantV7({ x, y }) });
  }
  return { snow, blizzard };
}

/** The board markers of a visible unit in a match with an Ice Folk seat. */
export function iceFolkUnitMarkersV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
): IceFolkUnitMarkersV7 | undefined {
  const turnsLeft = frozenTurnsLeftV7(view, unit.id);
  const witch =
    unit.form === "LAND" &&
    (unitRoleRuleV7(view, unit).abilities as readonly string[]).includes(
      "BLIZZARD",
    );
  if (turnsLeft === null && !witch) return undefined;
  return {
    frozen: turnsLeft === null || unit.form !== "LAND" ? null : { turnsLeft },
    shatterWindow: shatterWindowV7(view, unit),
    witch,
  };
}

/** The map targets of an active Bolas, Cold Snap, Frost Bolt or Stampede. */
export function iceFolkPickTargetsV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  pick: IceFolkPickV7,
): MapCommandTargetV7[] {
  const unitById = (id: number) => view.units.find((unit) => unit.id === id);
  if (pick.kind === "THROW_BOLAS" || pick.kind === "FROST_BOLT")
    return commands.flatMap((command): MapCommandTargetV7[] => {
      if (
        (command.kind !== "THROW_BOLAS" && command.kind !== "FROST_BOLT") ||
        command.kind !== pick.kind ||
        command.unitId !== pick.unitId
      )
        return [];
      const preview =
        command.kind === "THROW_BOLAS"
          ? previewBolasV7(view, command.unitId, command.targetUnitId)
          : previewFrostBoltV7(view, command.unitId, command.targetUnitId);
      const target = unitById(command.targetUnitId);
      if (preview === null || target === undefined) return [];
      const lines = bolasPreviewLinesV7(view, preview);
      const name = unitRoleRuleV7(view, target).label;
      const bolas = command.kind === "THROW_BOLAS";
      return [
        {
          at: target.at,
          command,
          family: command.kind,
          previewLabel: freezeTargetLabelV7(preview.alreadyFrozen),
          ...(lines.length > 1
            ? { previewNote: lines.slice(1).join(" · ") }
            : {}),
          semanticLabel: `${bolas ? "Bolas" : FROST_BOLT_LABEL_V7}: freezes this ${name}. ${lines.join(". ")}. ${bolas ? BOLAS_PICK_V7 : FROST_BOLT_PICK_V7}.`,
        },
      ];
    });
  if (pick.kind === "STAMPEDE")
    return commands.flatMap((command): MapCommandTargetV7[] => {
      if (command.kind !== "STAMPEDE" || command.unitId !== pick.unitId)
        return [];
      const plan = stampedePlanV7(view, command.unitId, command.at);
      if (plan === null) return [];
      const chosen = pick.chosen !== null && same(pick.chosen, command.at);
      return [
        {
          at: command.at,
          command,
          family: "STAMPEDE",
          // Only the chosen end carries a label; the focused or chosen
          // line draws its hits on their own tiles.
          ...(chosen ? { previewLabel: stampedeLabelV7(plan) } : {}),
          semanticLabel: `${stampedeSemanticV7(plan)} ${chosen ? STAMPEDE_CONFIRM_HINT_V7 : STAMPEDE_PICK_V7}.`,
          stampede: {
            from: plan.from,
            line: plan.line,
            path: plan.path,
            end: plan.end,
            stopped: plan.stopped,
            chosen,
            hits: plan.hits.map((hit) => ({
              at: hit.at,
              label: `−${hit.damage}`,
              lethal: hit.dies,
              shovedTo: hit.shovedTo,
              blocks: hit.blocks,
            })),
          },
        },
      ];
    });
  const command = commands.find(
    (candidate): candidate is Extract<CommandV7, { kind: "COLD_SNAP" }> =>
      candidate.kind === "COLD_SNAP" && candidate.unitId === pick.unitId,
  );
  if (command === undefined) return [];
  const preview = previewColdSnapV7(view, command.unitId);
  if (preview === null) return [];
  return preview.targets.flatMap((entry): MapCommandTargetV7[] => {
    const target = unitById(entry.unitId);
    if (target === undefined) return [];
    const name = unitRoleRuleV7(view, target).label;
    return [
      {
        at: target.at,
        command,
        family: "COLD_SNAP",
        previewLabel: freezeTargetLabelV7(entry.alreadyFrozen),
        semanticLabel: `${COLD_SNAP_LABEL_V7}: freezes this ${name} with every other highlighted unit. ${entry.alreadyFrozen ? STAYS_FROZEN_V7 : WILL_BE_FROZEN_V7}. Choose any highlighted unit to cast.`,
      },
    ];
  });
}

/**
 * Preview entries of an active pick that are not targets: the reach of a
 * Cold Snap (the eight tiles round the Witch) or a Frost Bolt (every
 * explored cell within its range), outlined at its edge.
 */
export function addIceFolkPickEntriesV7(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  pick: IceFolkPickV7,
): void {
  if (pick.kind !== "COLD_SNAP" && pick.kind !== "FROST_BOLT") return;
  const witch = view.units.find((unit) => unit.id === pick.unitId);
  if (witch === undefined) return;
  const explored = new Set(
    view.board.tiles
      .filter((tile) => tile.explored)
      .map((tile) => key(tile.at)),
  );
  const reach =
    pick.kind === "COLD_SNAP" ? COLD_SNAP_RANGE_V7 : FROST_BOLT_RANGE_V7;
  const inArea = (at: CoordV7): boolean =>
    Math.max(Math.abs(at.x - witch.at.x), Math.abs(at.y - witch.at.y)) <=
      reach && explored.has(key(at));
  for (let dy = -reach; dy <= reach; dy += 1)
    for (let dx = -reach; dx <= reach; dx += 1) {
      const at = { x: witch.at.x + dx, y: witch.at.y + dy };
      if (!inArea(at)) continue;
      entries.push({
        key: `ability-area:${pick.kind}:${at.x},${at.y}`,
        kind: "ABILITY_AREA",
        layer: 7,
        at,
        abilityStyle: "COLD_SNAP",
        targetEdges: (["NORTH", "EAST", "SOUTH", "WEST"] as const).filter(
          (edge) =>
            !inArea({
              x: at.x + (edge === "EAST" ? 1 : edge === "WEST" ? -1 : 0),
              y: at.y + (edge === "SOUTH" ? 1 : edge === "NORTH" ? -1 : 0),
            }),
        ),
      });
    }
}

/**
 * Section 21.12: the Cold Aura of an offered Move of an own Frost Giant: the
 * tiles of the units it would freeze there, a label, and the sentence.
 * Null for a Move that freezes nobody, and for every other unit's Move.
 */
export function coldAuraMoveExtrasV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { kind: "MOVE" }>,
): {
  readonly label: string;
  readonly semantic: string;
  readonly tiles: readonly CoordV7[];
} | null {
  const targets = coldAuraMoveTargetsV7(view, command);
  if (targets.length === 0) return null;
  return {
    // The board's short label; the sentence names the units.
    label: `Freezes ${targets.length}`,
    semantic: `${coldAuraMoveLabelV7(targets.length)}: ${targets.map((unit) => unitRoleRuleV7(view, unit).label).join(", ")}`,
    tiles: targets.map((unit) => unit.at),
  };
}

/** The Ice Folk additions to an ATTACK target (section 13.1). */
export interface IceFolkAttackTargetExtrasV7 {
  /** The defender shatters: the label is "Shatters". */
  readonly shatters: boolean;
  readonly notes: readonly string[];
  /** The Sweep flank victims, drawn while the target is focused. */
  readonly sweep: MapCommandTargetV7["sweep"];
  /** The sentence the cursor description adds. */
  readonly semantic: string | null;
}

/**
 * `pulp_wars-1wy.5` (Glide from Snow onto Snow, `7r37`): the number of
 * half-cost steps of an offered Move of a gliding Ice Folk unit: the steps
 * from a Snow tile onto a Snow tile, read from the view's Snow flags along
 * the command's own path (the path the engine offers and will walk). A step
 * off the Snow, or onto it from open ground, is a full step and is not
 * counted. Zero for every other unit and in a match without an Ice Folk
 * seat.
 */
export function glideStepsV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { kind: "MOVE" }>,
): number {
  const unit = view.units.find((candidate) => candidate.id === command.unitId);
  if (unit === undefined || !unitGlidesV7(view, unit)) return 0;
  const snowAt = (at: CoordV7): boolean => {
    const tile = view.board.tiles.find(
      (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
    );
    return tile?.explored === true && tile.snow === true;
  };
  let steps = 0;
  let from = unit.at;
  for (const to of command.path) {
    if (snowAt(from) && snowAt(to)) steps += 1;
    from = to;
  }
  return steps;
}

/**
 * `pulp_wars-1wy.5`: whether an offered Move is a Glide the range overlay
 * marks: it ends farther than the unit's Move away, which only its
 * Snow-to-Snow half-cost steps allow (a Yeti's second tile inside its
 * Snow, never the tile just off it). Such a tile is outlined in pale ice.
 */
export function moveIsGlideV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { kind: "MOVE" }>,
): boolean {
  const unit = view.units.find((candidate) => candidate.id === command.unitId);
  const to = command.path.at(-1);
  if (unit === undefined || to === undefined) return false;
  return (
    glideStepsV7(view, command) > 0 &&
    Math.max(Math.abs(to.x - unit.at.x), Math.abs(to.y - unit.at.y)) >
      unitRoleRuleV7(view, unit).move
  );
}

/**
 * The Ice Folk lines of an attack preview: "Shatters" for the label, the
 * notes (Won't strike back (Frozen), Rockfall, Planted, Cold Blood, Ignores fortification,
 * Snow cover, Blizzard, Trample, the hidden-Blizzard caveat) and the Sweep
 * flank victims. Null in a match without an Ice Folk seat, so its attack
 * previews are unchanged.
 */
export function iceFolkAttackTargetExtrasV7(
  view: PlayerViewV7,
  preview: CombatPreviewV7 | null,
): IceFolkAttackTargetExtrasV7 | null {
  if (preview === null || !matchHasIceFolkSeatV7(view)) return null;
  const lines = iceFolkCombatLinesV7(view, preview);
  const sentences = [
    ...(lines.shatters
      ? [`${SHATTERS_PREVIEW_V7}: the defender dies with no blow back`]
      : []),
    ...lines.notes,
    ...lines.sweep.map((entry) => entry.text),
  ];
  return {
    shatters: lines.shatters,
    notes: lines.notes,
    sweep:
      lines.sweep.length === 0
        ? undefined
        : lines.sweep.map((entry) => ({
            at: entry.at,
            label: `−${entry.damage}`,
            lethal: entry.dies,
          })),
    semantic: sentences.length === 0 ? null : `${sentences.join(". ")}.`,
  };
}

/** Whether `kind` is one of the four aimed Ice Folk ability commands. */
export function isIceFolkPickCommandV7(kind: CommandV7["kind"]): boolean {
  return (
    kind === "THROW_BOLAS" ||
    kind === "COLD_SNAP" ||
    kind === "FROST_BOLT" ||
    kind === "STAMPEDE"
  );
}

/**
 * The Witch whose Blizzard outline is drawn: a selected land-form Witch
 * (any owner). The renderer also outlines a Witch under the pointer.
 */
export function selectedWitchV7(
  view: PlayerViewV7,
  selectedUnitId: number | null,
): PlayerViewV7["units"][number] | undefined {
  if (selectedUnitId === null) return undefined;
  const unit = view.units.find((candidate) => candidate.id === selectedUnitId);
  if (unit === undefined || unit.form !== "LAND") return undefined;
  return (unitRoleRuleV7(view, unit).abilities as readonly string[]).includes(
    "BLIZZARD",
  )
    ? unit
    : undefined;
}
