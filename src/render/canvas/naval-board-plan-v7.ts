import {
  isAfloatFormV7,
  previewBoardV7,
  unitRoleRuleV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type PlayerViewV7,
  type UnitId,
} from "../../engine/index";
import {
  BOARD_LABEL_V7,
  BOARD_PICK_V7,
  SUBMERGED_OUT_OF_REACH_V7,
  TORPEDO_PREVIEW_V7,
  boardBlockTextV7,
  boardTargetLabelV7,
  navalCombatLinesV7,
  viewBoardTargetBlockV7,
} from "../naval-presentation-v7";
import type {
  BoardRenderPlanEntryV7,
  MapCommandTargetV7,
} from "./board-renderer-v7";

/**
 * The naval part of the board plan (bead pulp_wars-5ti.7, first part;
 * docs/ui/BOARD_TARGETING.md section 3.4): the Board picking mode, the
 * markers of a submerged Submarine and of a ship that can be boarded, the
 * naval lines of an attack preview (the Bow Ram bonus and its shove, a
 * torpedo's "No strike-back"), and the grey reason on a Submarine the
 * selected unit cannot attack from where it stands. Everything is read
 * from the public view, the offered commands and the public previews.
 */

/** A Board being aimed on the board: its targets are the only map targets. */
export interface NavalPickV7 {
  readonly kind: "BOARD";
  readonly unitId: UnitId;
}

/** UNIT only: the naval markers of a visible unit (any owner). */
export interface NavalUnitMarkersV7 {
  /** A submerged Submarine (`stats.submerged`): drawn low in the water. */
  readonly submerged: boolean;
  /** A ship at or below its boarding line (`stats.boardableAt`). */
  readonly boardable: boolean;
}

const chebyshev = (a: CoordV7, b: CoordV7): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

function hostile(view: PlayerViewV7, left: number, right: number): boolean {
  if (left === right) return false;
  return (
    view.setup.aiMode === "RIVAL" ||
    left === view.humanPlayerId ||
    right === view.humanPlayerId
  );
}

/** The board markers of a visible unit, from its public stats. */
export function navalUnitMarkersV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
): NavalUnitMarkersV7 | undefined {
  if (unit.form !== "NAVAL") return undefined;
  const stats = view.unitStats.find((entry) => entry.unitId === unit.id);
  if (stats === undefined) return undefined;
  const submerged = stats.submerged;
  const boardable = stats.boardableAt !== null && unit.hp <= stats.boardableAt;
  return submerged || boardable ? { submerged, boardable } : undefined;
}

/** The map targets of an active Board pick: one per offered `BOARD`. */
export function navalPickTargetsV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  pick: NavalPickV7,
): MapCommandTargetV7[] {
  return commands.flatMap((command): MapCommandTargetV7[] => {
    if (command.kind !== "BOARD" || command.unitId !== pick.unitId) return [];
    const preview = previewBoardV7(view, command.unitId, command.targetUnitId);
    const target = view.units.find((unit) => unit.id === command.targetUnitId);
    if (preview === null || target === undefined) return [];
    const name = unitRoleRuleV7(view, target).label;
    return [
      {
        at: target.at,
        command,
        family: "BOARD",
        previewLabel: boardTargetLabelV7(preview),
        semanticLabel: `${BOARD_LABEL_V7}: capture this ${name}. It becomes yours with ${preview.hpAfter} HP. ${BOARD_PICK_V7}.`,
      },
    ];
  });
}

/**
 * Preview entries of an active Board pick that are not targets: each
 * hostile unit afloat within two tiles that cannot be boarded wears the
 * engine's reason in grey ("Above 3 HP", "Not a ship", "Too far").
 */
export function addNavalPickEntriesV7(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  targets: readonly MapCommandTargetV7[],
  pick: NavalPickV7,
): void {
  const boarder = view.units.find((unit) => unit.id === pick.unitId);
  if (boarder === undefined) return;
  for (const unit of view.units) {
    if (
      !isAfloatFormV7(unit.form) ||
      !hostile(view, boarder.ownerId, unit.ownerId) ||
      chebyshev(unit.at, boarder.at) > 2 ||
      targets.some(
        (target) => target.at.x === unit.at.x && target.at.y === unit.at.y,
      )
    )
      continue;
    const reason = viewBoardTargetBlockV7(view, boarder, unit);
    if (reason === null) continue;
    entries.push({
      key: `ability-target:BOARD_BLOCKED:${unit.id}`,
      kind: "ABILITY_TARGET",
      layer: 7.5,
      at: unit.at,
      abilityStyle: "MARTIAN_BLOCKED",
      label: boardBlockTextV7(
        reason,
        view.unitStats.find((entry) => entry.unitId === unit.id)?.boardableAt ??
          null,
      ),
    });
  }
}

/**
 * Section 14.1 "Submarine": while an own unit that could still attack is
 * selected, a visible hostile submerged Submarine inside its range that the
 * engine does not offer as a target (it is two or more tiles away) wears
 * the grey reason. Adjacent Submarines are ordinary attack targets.
 */
export function addSubmergedReasonEntriesV7(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  selectedUnitId: number,
): void {
  const unit = view.units.find((candidate) => candidate.id === selectedUnitId);
  if (
    unit === undefined ||
    unit.ownerId !== view.viewer.id ||
    unit.form === "EMBARKED" ||
    unit.form === "EGG" ||
    unit.activation.handled ||
    unit.activation.attacked ||
    commands.length === 0
  )
    return;
  const range = unitRoleRuleV7(view, unit).range;
  if (range < 2) return;
  for (const stats of view.unitStats) {
    if (!stats.submerged) continue;
    const target = view.units.find(
      (candidate) => candidate.id === stats.unitId,
    );
    if (
      target === undefined ||
      !hostile(view, unit.ownerId, target.ownerId) ||
      chebyshev(target.at, unit.at) < 2 ||
      chebyshev(target.at, unit.at) > range ||
      commands.some(
        (command) =>
          command.kind === "ATTACK" &&
          command.unitId === unit.id &&
          command.targetUnitId === target.id,
      )
    )
      continue;
    entries.push({
      key: `ability-target:SUBMERGED:${target.id}`,
      kind: "ABILITY_TARGET",
      layer: 7.5,
      at: target.at,
      abilityStyle: "MARTIAN_BLOCKED",
      label: SUBMERGED_OUT_OF_REACH_V7,
    });
  }
}

/** The naval additions to an ATTACK target. */
export interface NavalAttackTargetExtrasV7 {
  readonly notes: readonly string[];
  /** A ram's shove, drawn like a Knockback while the target is focused. */
  readonly knockback: MapCommandTargetV7["knockback"];
  /** The sentence the cursor description adds. */
  readonly semantic: string | null;
}

/**
 * The naval lines of an attack preview: "Bow Ram +1", "Shoves back" or
 * "Shove blocked" with the shove tile, and a torpedo's "No strike-back".
 * Null for every other exchange, so its preview is unchanged.
 */
export function navalAttackTargetExtrasV7(
  view: PlayerViewV7,
  preview: CombatPreviewV7 | null,
  /**
   * An Undead match's preview already says "No retaliation" for every
   * unanswered attack (the Vampire's rule), so the torpedo adds no second
   * line there.
   */
  options: { readonly unansweredNoted?: boolean } = {},
): NavalAttackTargetExtrasV7 | null {
  if (preview === null || (!preview.ram && !preview.torpedo)) return null;
  const lines = navalCombatLinesV7(view, preview);
  const notes =
    options.unansweredNoted === true
      ? lines.notes.filter((note) => note !== TORPEDO_PREVIEW_V7)
      : lines.notes;
  return {
    notes,
    knockback: lines.shove === null ? undefined : lines.shove,
    semantic: notes.length === 0 ? null : `${notes.join(". ")}.`,
  };
}
