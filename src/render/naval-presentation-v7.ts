import {
  HARBOUR_POPULATION_V7,
  RAM_BONUS2_V7,
  boardTargetBlockV7,
  isAfloatFormV7,
  knockbackDestinationV7,
  seatRoleRuleV7,
  technologyCapabilitiesV7,
  type BoardPreviewV7,
  type BoardTargetBlockV7,
  type CombatPreviewV7,
  type CoordV7,
  type PlayerEventV7,
  type PlayerViewV7,
  type PublicUnitV7,
} from "../engine/index";

/**
 * The naval branch interface (bead pulp_wars-5ti.7, first part;
 * docs/product/RULESET_7_NAVAL_BRANCH.md sections 14.1 and 14.2): the words
 * of Ram, Board, the Submarine and Harbours, shared by the dock, the board
 * plan, Help, the technology cards and the Gallery. Every number is read
 * from the engine's constants, public previews and public unit stats.
 */

/**
 * The display name of the naval `RAM` ability. The Goblin Scrap Buggy's
 * Overrun has been displayed as "Ram" since revision 17, so the boats' ram
 * is named after the bow; the rule ID stays `RAM`.
 */
export const NAVAL_RAM_LABEL_V7 = "Bow Ram";
export const BOARD_LABEL_V7 = "Board";
export const SUBMERGED_LABEL_V7 = "Submerged";
export const TORPEDO_LABEL_V7 = "Torpedo";
export const HARBOURS_LABEL_V7 = "Harbours";

/** Section 14.2, one short sentence each. */
export const NAVAL_RAM_RULE_V7 =
  "A Patrol Boat that moved this turn hits boats and transports with +1 Attack and shoves them one tile back.";
export const BOARD_RULE_V7 =
  "A ship captures an adjacent enemy ship that has a third of its HP or less.";
export const SUBMERGED_RULE_V7 = "Can only be attacked from an adjacent tile.";
export const TORPEDO_RULE_V7 =
  "Attacks only boats and transports, which cannot strike back.";
export const HARBOURS_RULE_V7 = `Every active Port and Shipyard gives ${HARBOUR_POPULATION_V7} more population.`;

/** The Help screen's naval rules, in reading order. */
export const NAVAL_HELP_RULES_V7: readonly (readonly [string, string])[] = [
  [NAVAL_RAM_LABEL_V7, NAVAL_RAM_RULE_V7],
  [BOARD_LABEL_V7, BOARD_RULE_V7],
  [SUBMERGED_LABEL_V7, SUBMERGED_RULE_V7],
  [TORPEDO_LABEL_V7, TORPEDO_RULE_V7],
  [HARBOURS_LABEL_V7, HARBOURS_RULE_V7],
];

/** The technology card's lines (no trailing full stop, as its other lines). */
export const NAVAL_RAM_UNLOCK_V7 = `${NAVAL_RAM_LABEL_V7}: Patrol Boats that moved hit ships with +1 Attack and shove them back`;
export const BOARD_UNLOCK_V7 = `${BOARD_LABEL_V7}: capture an adjacent enemy ship at a third of its HP or less`;
export const SUBMARINE_UNLOCK_NOTE_V7 =
  "Submarine: attacked only from an adjacent tile; its torpedo hits ships with no strike-back";
export const SHORECRAFT_EMBARK_NOTE_V7 = "Units embark at active Ports";

export function harboursUnlockTextV7(population: number): string {
  return `${HARBOURS_LABEL_V7}: +${population} population from every active Port and Shipyard`;
}

/** The dock's Board button and its aiming panel. */
export const BOARD_TOOLTIP_V7 = BOARD_RULE_V7.replace(/\.$/, "");
export const BOARD_PICK_V7 = "Choose a highlighted ship to capture";
export const BOARD_ALREADY_ACTED_V7 = "This ship cannot board now";
export const BOARD_NO_WEAK_SHIP_V7 = "No enemy ship here is weak enough";
export const BOARD_NOT_A_SHIP_V7 = "Only ships can be boarded";

/** The chip of a ship that can be boarded now, and its tooltip. */
export const BOARDABLE_LABEL_V7 = "Boardable";
export function boardableTooltipV7(boardableAt: number): string {
  return `${BOARDABLE_LABEL_V7}: at ${boardableAt} HP or less a ship next to it can capture it`;
}
export const SUBMERGED_TOOLTIP_V7 = `${SUBMERGED_LABEL_V7}: ${SUBMERGED_RULE_V7.toLowerCase().replace(/\.$/, "")}`;
export const TORPEDO_TOOLTIP_V7 = `${TORPEDO_LABEL_V7}: ${TORPEDO_RULE_V7.toLowerCase().replace(/\.$/, "")}`;

/** The attack preview's naval notes. */
export const RAM_PREVIEW_V7 = `${NAVAL_RAM_LABEL_V7} +${RAM_BONUS2_V7 / 2}`;
export const RAM_SHOVE_V7 = "Shoves back";
export const RAM_SHOVE_BLOCKED_V7 = "Shove blocked";
export const TORPEDO_PREVIEW_V7 = "No strike-back";
/** The grey mark of a Submarine the selected unit cannot attack from here. */
export const SUBMERGED_OUT_OF_REACH_V7 = "Submerged: get adjacent";

/** The name of a naval role ability, or null for every other ability. */
export function navalAbilityNameV7(ability: string): string | null {
  return ability === "RAM" ? NAVAL_RAM_LABEL_V7 : null;
}

/** The board label of a Board target: the prize and its HP after the patch. */
export function boardTargetLabelV7(preview: BoardPreviewV7): string {
  return `Take · ${preview.hpAfter} HP`;
}

/** The grey reason on a ship that cannot be boarded while Board is aimed. */
export function boardBlockTextV7(
  reason: BoardTargetBlockV7,
  boardableAt: number | null,
): string {
  if (reason === "TARGET_IMMUNE") return "Not a ship";
  if (reason === "OUT_OF_RANGE") return "Too far";
  // Row 10 (`pulp_wars-5ti.3`): a prize on Deep Water needs Navigation.
  if (reason === "DEEP_WATER") return BOARD_BLOCK_DEEP_WATER_V7;
  return boardableAt === null ? "Too healthy" : `Above ${boardableAt} HP`;
}

/** The grey reason on a weak ship that stands on Deep Water. */
export const BOARD_BLOCK_DEEP_WATER_V7 = "Needs Navigation";
/** Why a ship next to a weak ship on Deep Water has no Board to aim. */
export const BOARD_NEEDS_NAVIGATION_V7 =
  "Taking a ship on Deep Water needs Navigation";
/** Why an icebound ship has no Board to aim (the frozen sea). */
export const BOARD_ICEBOUND_V7 = "Icebound: this ship cannot board";

/**
 * The engine's Board target rule (`boardTargetBlockV7`) read from the view,
 * with the facts of the public command query: the target's explored tile
 * and the viewer's Navigation.
 */
export function viewBoardTargetBlockV7(
  view: PlayerViewV7,
  boarder: Pick<PublicUnitV7, "at">,
  target: PublicUnitV7,
): BoardTargetBlockV7 | null {
  const tile = view.board.tiles.find(
    (candidate) =>
      candidate.at.x === target.at.x && candidate.at.y === target.at.y,
  );
  return boardTargetBlockV7(
    boarder,
    target,
    tile?.explored === true ? tile.terrain : undefined,
    view.viewer.researchedTechs.includes("NAVIGATION"),
  );
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

/** Whether the viewer's ships may Board at all (its Seamanship). */
export function viewerMayBoardV7(view: PlayerViewV7): boolean {
  return technologyCapabilitiesV7(
    view.viewer.researchedTechs,
    view.viewer.faction,
  ).boarding;
}

/** The viewer's Harbours bonus per active dock (0 without the capability). */
export function viewerHarbourPopulationV7(view: PlayerViewV7): number {
  return technologyCapabilitiesV7(
    view.viewer.researchedTechs,
    view.viewer.faction,
  ).harbourPopulation;
}

/**
 * Why an own ship with an enemy afloat next to it has no Board to aim: the
 * engine's own rejection reason of each adjacent candidate
 * (`boardTargetBlockV7`). Null when Board is offered, when the viewer's
 * ships cannot board, or when nothing afloat and hostile is adjacent (no
 * button is shown then).
 */
export function boardUnavailableTextV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  offered: boolean,
): string | null {
  if (
    offered ||
    unit.form !== "NAVAL" ||
    unit.ownerId !== view.viewer.id ||
    !viewerMayBoardV7(view)
  )
    return null;
  const adjacent = view.units.filter(
    (candidate) =>
      isAfloatFormV7(candidate.form) &&
      hostile(view, unit.ownerId, candidate.ownerId) &&
      chebyshev(candidate.at, unit.at) === 1,
  );
  if (adjacent.length === 0) return null;
  // The frozen sea (`pulp_wars-5ti.3`): an icebound ship never boards.
  if (
    view.unitStats.find((entry) => entry.unitId === unit.id)?.icebound === true
  )
    return BOARD_ICEBOUND_V7;
  const blocks = adjacent.map((candidate) =>
    viewBoardTargetBlockV7(view, unit, candidate),
  );
  // A ship that could be taken stands there: the boarder itself cannot act.
  if (blocks.includes(null)) return BOARD_ALREADY_ACTED_V7;
  if (blocks.includes("DEEP_WATER")) return BOARD_NEEDS_NAVIGATION_V7;
  return blocks.includes("TARGET_HEALTHY")
    ? BOARD_NO_WEAK_SHIP_V7
    : BOARD_NOT_A_SHIP_V7;
}

/** The naval lines of an attack preview. */
export interface NavalCombatLinesV7 {
  readonly notes: readonly string[];
  /** A ram's shove: where the survivor goes, or that nothing moves. */
  readonly shove: {
    readonly to: CoordV7;
    readonly blocked: boolean;
  } | null;
}

/**
 * Section 14.1 "Ram" and "Submarine", from the public combat preview only:
 * "Bow Ram +1" with "Shoves back" or "Shove blocked" (the preview's `ram`
 * and `push`), and "No strike-back" for a torpedo (`torpedo`). The shove
 * tile is the tile directly behind the target (the engine's own geometry
 * helper); whether the target moves is the preview's.
 */
export function navalCombatLinesV7(
  view: PlayerViewV7,
  preview: CombatPreviewV7,
): NavalCombatLinesV7 {
  const notes: string[] = [];
  let shove: NavalCombatLinesV7["shove"] = null;
  if (preview.ram) {
    notes.push(RAM_PREVIEW_V7);
    const attacker = view.units.find((unit) => unit.id === preview.attackerId);
    const defender = view.units.find(
      (unit) => unit.id === preview.targetUnitId,
    );
    if (
      attacker !== undefined &&
      defender !== undefined &&
      !preview.defenderDies
    ) {
      const blocked = preview.push !== "WILL_PUSH";
      shove = {
        to: knockbackDestinationV7(attacker.at, defender.at),
        blocked,
      };
      notes.push(blocked ? RAM_SHOVE_BLOCKED_V7 : RAM_SHOVE_V7);
    }
  }
  if (preview.torpedo && !preview.defenderDies) notes.push(TORPEDO_PREVIEW_V7);
  return { notes, shove };
}

function possessive(view: PlayerViewV7, playerId: number): string {
  if (playerId === view.viewer.id) return "your";
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player === undefined ? "an enemy" : `Player ${player.seat + 1}'s`;
}

function subject(view: PlayerViewV7, playerId: number): string {
  if (playerId === view.viewer.id) return "You";
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player === undefined ? "An enemy" : `Player ${player.seat + 1}`;
}

/**
 * The notice of a boundary's naval events: "{owner} boarded {former
 * owner}'s {ship}" (section 14.1). Null without one.
 */
export function navalBoundaryNoticeV7(
  events: readonly PlayerEventV7[],
  before: PlayerViewV7,
  after: PlayerViewV7,
): { readonly text: string; readonly toast: boolean } | null {
  const parts: string[] = [];
  for (const event of events) {
    if (event.kind !== "SHIP_BOARDED") continue;
    const prize =
      before.units.find((unit) => unit.id === event.targetUnitId) ??
      after.units.find((unit) => unit.id === event.targetUnitId);
    // The ship that was taken: its former owner's name for it.
    const name =
      prize === undefined
        ? "ship"
        : seatRoleRuleV7(before, event.fromPlayerId, prize.role).label;
    parts.push(
      `${subject(after, event.playerId)} boarded ${possessive(after, event.fromPlayerId)} ${name}`,
    );
  }
  return parts.length === 0 ? null : { text: parts.join(" · "), toast: true };
}
