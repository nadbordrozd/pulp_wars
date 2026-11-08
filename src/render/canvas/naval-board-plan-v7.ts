import {
  cooperativeAlliesV7,
  previewBoardV7,
  unitRoleRuleV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type PlayerViewV7,
} from "../../engine/index";
import {
  BOARD_ATTACK_PREVIEW_V7,
  SUBMERGED_OUT_OF_REACH_V7,
  TORPEDO_PREVIEW_V7,
  boardAttackNoteV7,
  navalCombatLinesV7,
} from "../naval-presentation-v7";
import type {
  BoardRenderPlanEntryV7,
  MapCommandTargetV7,
} from "./board-renderer-v7";

/**
 * The naval part of the board plan (bead pulp_wars-5ti.7, first part;
 * docs/ui/BOARD_TARGETING.md section 3.4): the markers of a submerged
 * Submarine and of a ship that can be boarded, the Attack mark of a ship
 * an attack boards, the naval lines of an attack preview (the Bow Ram
 * bonus and its shove, a torpedo's "No strike-back"), and the grey reason
 * on a Submarine the selected unit cannot attack from where it stands.
 * Everything is read from the public view, the offered commands and the
 * public previews. (The Board picking mode retired with the `BOARD`
 * command: `pulp_wars-3u8d`, 7r131.)
 */

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
  return !cooperativeAlliesV7(view.setup, view.humanPlayerId, left, right);
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

/**
 * One tile, one meaning (`pulp_wars-3u8d`, 7r131): the Attack mark of an
 * offered `ATTACK` of the selected ship that boards (`previewBoardV7`): the
 * tile says "Board: captures the ship" in place of the damage, and the
 * prize's HP afterwards. Null for every other attack.
 */
export function navalBoardAttackTargetV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
): MapCommandTargetV7 | null {
  const preview = previewBoardV7(view, command.unitId, command.targetUnitId);
  const target = view.units.find((unit) => unit.id === command.targetUnitId);
  if (preview === null || target === undefined) return null;
  const name = unitRoleRuleV7(view, target).label;
  const note = boardAttackNoteV7(preview);
  return {
    at: target.at,
    command,
    family: "ATTACK",
    previewLabel: BOARD_ATTACK_PREVIEW_V7,
    previewNote: note,
    semanticLabel: `Attack preview. ${BOARD_ATTACK_PREVIEW_V7}: this ${name} is captured, not hit, and nothing strikes back. ${note}.`,
  };
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
  if (preview === null) return null;
  const lines = navalCombatLinesV7(view, preview);
  // Themed naval branches (`pulp_wars-5ti.22`): an Offering's Favour is a
  // naval line of any attack that sinks a unit afloat.
  if (!preview.ram && !preview.torpedo && lines.notes.length === 0) return null;
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
