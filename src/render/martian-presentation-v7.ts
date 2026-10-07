import {
  BEAM_DOWN_PICKUP_RANGE_V7,
  FORCE_FIELD_SHIELD_V7,
  HEAVY_TRACTOR_PULL_V7,
  HEAVY_TRACTOR_RANGE_V7,
  beamDownPassengerLegalV7,
  MIND_CONTROL_COOLDOWN_TURNS_V7,
  MIND_CONTROL_HP_V7,
  MIND_CONTROL_RANGE_V7,
  MIND_CONTROL_LIMIT_V7,
  TRACTOR_BEAM_RANGE_V7,
  UNIT_ROLE_IDS_V7,
  activationIsExhaustedV7,
  effectiveRoleRuleV7,
  forceFieldHoldsV7,
  isMindControlledV7,
  primaryActionUsedV7,
  roleMechanicsV7,
  seatRoleRuleV7,
  sluggishUnitMovedV7,
  tractorBeamRuleV7,
  unitFactionV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  type BeamDownPreviewV7,
  type CombatPreviewV7,
  type CommandV7,
  type FactionIdV7,
  type MindControlPreviewV7,
  type PlayerEventV7,
  type PlayerViewV7,
  type PublicMartianMechanicsV7,
  type TractorBeamPreviewV7,
  isNavalRoleV7,
  type UnitRoleIdV7,
} from "../engine/index";
import { ninthUnitHelpRulesV7 } from "./ninth-unit-presentation-v7";

/**
 * Presentation helpers for the Martian faction (docs/product/
 * RULESET_7_MARTIANS.md section 13, bead pulp_wars-t6s.4). Every helper
 * reads only public views, the public unit stats' `martian` block, the
 * public previews (`previewBeamDownV7`, `previewMindControlV7`,
 * `previewTractorBeamV7`, `queryCombatPreviewV7`) and projected player
 * events. Every number in a sentence comes from the registry or the engine
 * constants, so the balance bead can retune them without a text going
 * stale. A match without a Martian seat never reaches a code path that
 * changes its presentation.
 */

type PublicUnitV7 = PlayerViewV7["units"][number];

/** True exactly when a seat of the match plays the Martian faction. */
export function matchHasMartianV7(
  view: Pick<PlayerViewV7, "players">,
): boolean {
  return view.players.some((player) => player.faction === "MARTIAN");
}

/** Whether a visible unit is of the Martian kind (`unitFactionV7`). */
export function unitIsMartianV7(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "id" | "ownerId">,
): boolean {
  return unitFactionV7(view, unit) === "MARTIAN";
}

/**
 * The Mind Control revision: whether a visible unit is mind-controlled (it
 * has a public `mindControlled` entry).
 */
export function unitIsMindControlledV7(
  view: PlayerViewV7,
  unitId: number,
): boolean {
  return isMindControlledV7(view, unitId);
}

/** A Martian role's label under the Martian registration. */
export const martianLabelV7 = (role: UnitRoleIdV7): string =>
  effectiveRoleRuleV7(role, "MARTIAN").label;

/** The Martian roles whose registration has `ability`, in role order. */
function martianRolesWith(ability: string): readonly UnitRoleIdV7[] {
  return UNIT_ROLE_IDS_V7.filter((role) =>
    (
      effectiveRoleRuleV7(role, "MARTIAN").abilities as readonly string[]
    ).includes(ability),
  );
}

/** The Martian roles of a movement mode, in role order. */
function martianRolesMoving(
  mode: "FLY" | "STRIDE" | "GROUND",
): readonly UnitRoleIdV7[] {
  return UNIT_ROLE_IDS_V7.filter(
    (role) => roleMechanicsV7(role, "MARTIAN").movementMode === mode,
  );
}

/** "A", "A or B", "A, B, or C". */
function joinOr(names: readonly string[]): string {
  if (names.length <= 2) return names.join(" or ");
  return `${names.slice(0, -1).join(", ")}, or ${names.at(-1) ?? ""}`;
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four"] as const;
const numberWord = (value: number): string =>
  NUMBER_WORDS[value] ?? String(value);

function plural(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ------------------------------------------------------------ section 13.2

export const BEAM_DOWN_LABEL_V7 = "Beam Down";
// `pulp_wars-1wy.3`: Beam Down after a Move, with a pick-up within
// `BEAM_DOWN_PICKUP_RANGE_V7`, by the Saucer and the Mothership; the unit
// counts as moved.
export const BEAM_DOWN_TOOLTIP_V7 = `Bring one of your units, from on or next to any of your city centers or from up to ${BEAM_DOWN_PICKUP_RANGE_V7} tiles away, next to this unit. It can still attack but not move.`;
export const BEAM_DOWN_NO_PASSENGER_V7 = `No unit in one of your cities or within ${BEAM_DOWN_PICKUP_RANGE_V7} tiles can be beamed`;
export const BEAM_DOWN_NO_TILE_V7 = "No free tile next to this unit";
export const BEAM_DOWN_PICK_PASSENGER_V7 = "Choose the unit to beam down";
export const BEAM_DOWN_PICK_TILE_V7 = "Choose a tile next to the carrier";
/**
 * `pulp_wars-1wy.5`: the board badge of a unit a carrier may beam (the
 * passenger is chosen first, like a Tunnel's rider), and of the chosen one.
 */
export const BEAM_BADGE_V7 = "Beam";
export const BEAMING_BADGE_V7 = "Beaming";
/**
 * `pulp_wars-1wy.5`: what a beamed unit may still do, as the two hint chips
 * of the aiming panel (an attack icon, and a move icon struck through) and
 * as the sentence of their accessible name.
 */
export const BEAMED_CAN_ATTACK_V7 = "Can attack";
export const BEAMED_NO_MOVE_V7 = "No move";
export const BEAMED_HINT_V7 = "After landing it can attack but not move";
/** `pulp_wars-1wy.5`: the dock chip of a unit beamed this turn. */
export const BEAMED_CHIP_V7 = "Beamed";
export const BEAMED_CHIP_TOOLTIP_V7 =
  "Beamed this turn: it can attack but not move, and cannot be beamed again";
/** `pulp_wars-1wy.5`: the dock chip of a puller whose free pull is spent. */
export const TRACTOR_USED_CHIP_V7 = "Beam used";
export const TRACTOR_USED_V7 = "Tractor Beam used this turn";
/** `pulp_wars-1wy.5`: a carrier or puller that used its action this turn. */
export const MARTIAN_ACTED_V7 = "Already acted this turn";
/** `pulp_wars-1wy.5`: a Frozen carrier or puller that moved (sluggish). */
export const MARTIAN_FROZEN_MOVED_V7 = "Frozen: it moved";
/** `pulp_wars-1wy.5`: the tag on a Mothership's Tractor Beam button. */
export const TRACTOR_FREE_TAG_V7 = "Free";
export const MIND_CONTROL_LABEL_V7 = "Mind Control";
export const MIND_CONTROL_TOOLTIP_V7 = `Take a wounded hostile unit with ${MIND_CONTROL_HP_V7} HP or less within ${MIND_CONTROL_RANGE_V7} tiles. It fights for you as itself until this Brain is lost.`;
export const MIND_CONTROL_PICK_V7 = "Choose a weakened enemy to take";
export const MIND_CONTROL_IMMUNE_V7 = "Immune";
export const MIND_CONTROL_PROTECTED_V7 =
  "Protected on a city or village center";
export const TRACTOR_BEAM_LABEL_V7 = "Tractor Beam";
// `pulp_wars-1wy.3`: the Saucer's pull and the Mothership's Heavy Tractor
// Beam, in one text, for a reader without a unit (the per-unit texts are
// `tractorBeamTooltipV7`).
export const TRACTOR_BEAM_TOOLTIP_V7 = `A Saucer pulls a unit ${TRACTOR_BEAM_RANGE_V7} tiles away one tile closer. A Mothership pulls a unit ${TRACTOR_BEAM_RANGE_V7} or ${HEAVY_TRACTOR_RANGE_V7} tiles away up to ${HEAVY_TRACTOR_PULL_V7} tiles closer, once a turn, and can still act.`;
export const TRACTOR_BEAM_NO_TARGET_V7 = "No unit in reach can be pulled";

/**
 * `pulp_wars-1wy.5`: the Tractor Beam of one unit: the Saucer's pull, or
 * the Mothership's Heavy Tractor Beam, "free once a turn".
 */
export function tractorBeamTooltipV7(heavy: boolean): string {
  return heavy
    ? `Pull a unit ${TRACTOR_BEAM_RANGE_V7} or ${HEAVY_TRACTOR_RANGE_V7} tiles away up to ${HEAVY_TRACTOR_PULL_V7} tiles closer. Free once a turn: it can still move and act.`
    : `Pull a unit ${TRACTOR_BEAM_RANGE_V7} tiles away one tile closer. Uses this unit's action.`;
}

/** Whether a role's Tractor Beam is the heavy, free one (the Mothership's). */
export function roleHasHeavyTractorBeamV7(
  role: UnitRoleIdV7,
  faction: FactionIdV7,
): boolean {
  return (
    (
      effectiveRoleRuleV7(role, faction).abilities as readonly string[]
    ).includes("TRACTOR_BEAM") &&
    roleMechanicsV7(role, faction).heavyTractorBeam
  );
}
export const TRACTOR_BEAM_PICK_V7 = "Choose a unit to pull";
export const PSYCHIC_COMMAND_LABEL_V7 = "Psychic Command";
export const PSYCHIC_COMMAND_STATUS_V7 =
  "Psychic Command: +1 Attack on the next attack";
export const STRAFE_LABEL_V7 = "Strafe";
export const MARTIAN_FIELD_DEFENSE_EXPLANATION_V7 =
  "Martians cannot build Field Defense";
/**
 * The Mind Control revision (section 9): the dock's badge of a
 * mind-controlled unit (a brain and this one word; the controller and the
 * original owner beside it as names, the sentences in its tooltip).
 */
export const MIND_CONTROLLED_LABEL_V7 = "Controlled";
export const MIND_CONTROLLED_NO_SLOT_V7 = "Mind-controlled units use no slot";
/** The short reason on a Mind Control button without a legal target. */
export const MIND_CONTROL_NO_TARGET_V7 = "No wounded enemy in reach";

/** "You" for the viewer, otherwise "Player N" (a chip's owner name). */
export function playerShortNameV7(
  view: PlayerViewV7,
  playerId: number,
): string {
  if (playerId === view.viewer.id) return "You";
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player === undefined ? "Unknown" : `Player ${player.seat + 1}`;
}

/** What the dock and unit info say about a mind-controlled unit. */
export interface MindControlledInfoV7 {
  /** The controller (the unit's owner now). */
  readonly controllerId: number;
  readonly originalOwnerId: number;
  /** "You" or "Player N". */
  readonly controllerName: string;
  readonly originalOwnerName: string;
  /** The unit goes back to its original owner (not eliminated). */
  readonly returns: boolean;
  /** "Mind-controlled by your Brain", "... by Player 1's Brain". */
  readonly byLine: string;
  /** "Returns to Player 2 if the Brain is lost", or "Lost with the Brain". */
  readonly fateLine: string;
}

/**
 * Section 9 "Dock and info": a mind-controlled unit's controller, original
 * owner and fate, from the public `mindControlled` list; null for a unit
 * that is not controlled.
 */
export function mindControlledInfoV7(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "id" | "ownerId">,
): MindControlledInfoV7 | null {
  const entry = view.mindControlled.find((item) => item.unitId === unit.id);
  if (entry === undefined) return null;
  const brain = martianLabelV7("CAPTAIN");
  const original = view.players.find(
    (player) => player.id === entry.originalOwnerId,
  );
  const returns = original?.status !== "ELIMINATED";
  const originalName = playerShortNameV7(view, entry.originalOwnerId);
  return {
    controllerId: unit.ownerId,
    originalOwnerId: entry.originalOwnerId,
    controllerName: playerShortNameV7(view, unit.ownerId),
    originalOwnerName: originalName,
    returns,
    byLine: `Mind-controlled by ${possessive(view, unit.ownerId)} ${brain}`,
    fateLine: returns
      ? `Returns to ${entry.originalOwnerId === view.viewer.id ? "you" : originalName} if the ${brain} is lost`
      : `Lost with the ${brain}`,
  };
}
export const COOLING_LABEL_V7 = "Cooling";
export const COOLING_TOOLTIP_V7 =
  "Cooling: its ray fires at half power until the end of its owner's next turn";
export const LEAVES_COOLING_V7 = "Leaves it Cooling next turn";
/**
 * The Martian pass, correction (`pulp_wars-w49.14`): the attack preview's
 * note when a whole Force Field keeps a full-HP unit alive, the rule in a
 * sentence, and the Brain's cooldown.
 */
export const FORCE_FIELD_HOLDS_V7 = "Force Field holds: 1 HP left";
export const FORCE_FIELD_HOLDS_RULE_V7 =
  "At full HP with that Shield whole, one attack cannot kill it: it is left at 1 HP.";
export const PSYCHIC_COMMAND_COOLING_V7 =
  "Psychic Command is Cooling: ready next turn.";
export const PSYCHIC_COMMAND_COOLDOWN_V7 = "Every second turn.";
export const RELEASE_LABEL_V7 = "Release";
export const RELEASE_TOOLTIP_V7 =
  "Returns the unit to its owner where it stands.";
export const DISINTEGRATOR_PREVIEW_V7 = "Disintegrator: ignores fortification";
export const LAUNCH_LABEL_V7 = "Launch: crosses water as a transport";

/** Section 13.2 "Shield row": "Shield 2 / 2", "Shield 4 / 4 (Force Field)". */
export function shieldTextV7(
  mechanics: Pick<PublicMartianMechanicsV7, "shield" | "shieldMaximum">,
): string {
  if (mechanics.shield > mechanics.shieldMaximum)
    return `Shield ${mechanics.shield} / ${FORCE_FIELD_SHIELD_V7} (Force Field)`;
  return `Shield ${mechanics.shield} / ${mechanics.shieldMaximum}`;
}

/** The Shield maximum a bar shows: 4 while a Force Field raised it. */
export function shieldBarMaximumV7(
  mechanics: Pick<PublicMartianMechanicsV7, "shield" | "shieldMaximum">,
): number {
  return mechanics.shield > mechanics.shieldMaximum
    ? Math.max(FORCE_FIELD_SHIELD_V7, mechanics.shield)
    : mechanics.shieldMaximum;
}

/**
 * Section 13.2 "Ray power": "Full power", "Half power: moved" or "Half
 * power: Cooling"; null for a unit without a ray (or afloat).
 */
export function rayPowerTextV7(
  mechanics: Pick<PublicMartianMechanicsV7, "rayPower" | "cooling">,
): string | null {
  if (mechanics.rayPower === null) return null;
  if (mechanics.rayPower === "FULL") return "Full power";
  return mechanics.cooling ? "Half power: Cooling" : "Half power: moved";
}

/** The Mind Control revision (section 9) "Brain info": "Controls 0 / 1". */
export function brainControlTextV7(
  mindControl: NonNullable<PublicMartianMechanicsV7["mindControl"]>,
): string {
  return `Controls ${mindControl.controlled} / ${mindControl.controlLimit}`;
}

/**
 * The number of the owner's turns until a Brain with cooldown entry
 * `turnsRemaining` may Mind Control again: the entry is removed at the
 * owner's Start Turn on which it reads 0 (section 8.2).
 */
export function mindControlReadyInV7(turnsRemaining: number): number {
  return turnsRemaining + 1;
}

/**
 * The Mind Control revision section 9 "disabled reasons": "Recovering: {n}
 * turn(s)" (the turns until it is ready) or "Controls a unit already"; null
 * when neither applies.
 */
export function mindControlUnavailableTextV7(
  mindControl: PublicMartianMechanicsV7["mindControl"],
): string | null {
  if (mindControl === null) return null;
  if (mindControl.cooldown !== null)
    return `Recovering: ${plural(mindControlReadyInV7(mindControl.cooldown), "turn")}`;
  if (mindControl.controlled >= mindControl.controlLimit)
    return mindControl.controlLimit === 1
      ? "Controls a unit already"
      : `Controls ${numberWord(mindControl.controlLimit)} units already`;
  return null;
}

/** The public Martian mechanics of a visible unit, or undefined. */
export function martianStatsV7(
  view: PlayerViewV7,
  unitId: number,
): PublicMartianMechanicsV7 | undefined {
  return view.unitStats.find((entry) => entry.unitId === unitId)?.martian;
}

// ------------------------------------------------------------ section 13.3

/**
 * Section 13.3: one sentence per rule, shown in Help for every viewer of a
 * match with a Martian seat. Labels and numbers come from the registry and
 * the engine constants; with the contract values these are the spec's
 * sentences.
 */
export function martianHelpRulesV7(): readonly (readonly [string, string])[] {
  const label = martianLabelV7;
  const rays = martianRolesWith("HEAT_RAY").map(label);
  const pierce = martianRolesWith("PIERCE").map(label);
  const walkers = martianRolesMoving("STRIDE").map(label);
  const flyers = martianRolesMoving("FLY").map(label);
  const projector = martianRolesWith("FORCE_FIELD").map(label);
  // The Martian pass: the roles whose ray does not overheat with Heat Sinks.
  const heatSinks = UNIT_ROLE_IDS_V7.filter(
    (role) => roleMechanicsV7(role, "MARTIAN").heatSink,
  ).map(label);
  const beamers = martianRolesWith("BEAM_DOWN").map(label);
  const brains = martianRolesWith("MIND_CONTROL").map(label);
  const heavy = (role: UnitRoleIdV7): boolean =>
    roleMechanicsV7(role, "MARTIAN").heavyTractorBeam;
  const lightPullers = martianRolesWith("TRACTOR_BEAM")
    .filter((role) => !heavy(role))
    .map(label);
  const heavyPullers = martianRolesWith("TRACTOR_BEAM")
    .filter(heavy)
    .map(label);
  const strafers = martianRolesWith("CHARGE").map(label);
  // `pulp_wars-b5f.2`: the Grunt's ray pistol (a land role with range 2
  // and no heat ray) and the Tripod's range-2-only ray.
  const pistolRoles = martianRolesWith("ATTACK").filter(
    (role) =>
      !isNavalRoleV7(role) &&
      !martianRolesWith("HEAT_RAY").includes(role) &&
      effectiveRoleRuleV7(role, "MARTIAN").range >= 2,
  );
  const pistols = pistolRoles.map(label);
  const pistolRange = Math.max(
    ...pistolRoles.map((role) => effectiveRoleRuleV7(role, "MARTIAN").range),
  );
  const standoffRoles = UNIT_ROLE_IDS_V7.filter(
    (role) => effectiveRoleRuleV7(role, "MARTIAN").minimumRange >= 2,
  );
  const standoff = standoffRoles.map(label);
  const standoffRange = Math.max(
    ...standoffRoles.map(
      (role) => effectiveRoleRuleV7(role, "MARTIAN").minimumRange,
    ),
  );
  return [
    [
      "Shields",
      "every Martian unit has a Shield that takes damage before its HP and recharges fully at the start of its owner's turn, so hit one unit several times in a turn instead of several units once.",
    ],
    [
      "Force Field",
      `with Force Fields, a unit that recharges next to a ${joinOr(projector)} recharges to Shield ${FORCE_FIELD_SHIELD_V7}. ${FORCE_FIELD_HOLDS_RULE_V7}`,
    ],
    [
      "Force Fields",
      "with Force Fields, Shields also recharge at the end of the owner's turn.",
    ],
    [
      "Heat rays",
      `a ${joinOr(rays)} fires at full power only if it has not moved this turn and is not Cooling; a full-power shot leaves it Cooling, at half Attack, until the end of its next turn.`,
    ],
    [
      "Heat Sinks",
      `with Heat Sinks, a ${joinOr(heatSinks)} does not overheat: it fires at full power every turn it does not move.`,
    ],
    [
      "Pierce",
      `a ${joinOr(pierce)}'s ray also hits the unit directly behind its target for half the damage, friend or foe.`,
    ],
    [
      "Ranges",
      `a ${joinOr(pistols)}'s ray pistol shoots up to ${numberWord(pistolRange)} tiles away at full Attack, even after moving; a ${joinOr(standoff)} fires only at units ${numberWord(standoffRange)} tiles away, never at one next to it.`,
    ],
    [
      "Disintegrator",
      "with the Disintegrator, heat rays ignore Walls and Field Defense.",
    ],
    [
      "Walkers",
      `a ${joinOr(walkers)} crosses Forest, Mountain, and Shallow Water without stopping and never gets cover or fortification.`,
    ],
    [
      "Flyers",
      `a ${joinOr(flyers)} flies over any terrain, any unit, and Rifts, ignores zones of control, and never captures or stands on a foreign city.`,
    ],
    [
      "Launch",
      "Martian machines need no Port: they enter water from any shore and cross it as transports that cannot fight.",
    ],
    [
      BEAM_DOWN_LABEL_V7,
      `a ${joinOr(beamers)} brings one of your units, from on or next to any of your city centers or from up to ${BEAM_DOWN_PICKUP_RANGE_V7} tiles away, next to itself; the unit can still attack but not move.`,
    ],
    [
      MIND_CONTROL_LABEL_V7,
      `a ${joinOr(brains)} takes control of ${MIND_CONTROL_LIMIT_V7 === 1 ? "one" : `up to ${numberWord(MIND_CONTROL_LIMIT_V7)}`} wounded hostile unit${MIND_CONTROL_LIMIT_V7 === 1 ? "" : "s"} with ${MIND_CONTROL_HP_V7} HP or less within ${MIND_CONTROL_RANGE_V7} tiles, not on a city or village, and needs ${numberWord(MIND_CONTROL_COOLDOWN_TURNS_V7)} turns before the next. The unit keeps its type and abilities but cannot be disbanded or create units. When the ${joinOr(brains)} is lost, the unit returns to its owner.`,
    ],
    [
      TRACTOR_BEAM_LABEL_V7,
      `a ${joinOr(lightPullers)} pulls a unit ${numberWord(TRACTOR_BEAM_RANGE_V7)} tiles away one tile closer; a ${joinOr(heavyPullers)} pulls a unit ${numberWord(TRACTOR_BEAM_RANGE_V7)} or ${numberWord(HEAVY_TRACTOR_RANGE_V7)} tiles away up to ${numberWord(HEAVY_TRACTOR_PULL_V7)} tiles closer, once a turn, and can still act.`,
    ],
    [
      `${PSYCHIC_COMMAND_LABEL_V7}, ${STRAFE_LABEL_V7}`,
      `a ${joinOr(brains)} gives adjacent units +1 Attack on their next attack, every second turn (it is Cooling in between), and a ${joinOr(strafers)} gets +1 Attack after moving two tiles.`,
    ],
    // The ninth unit (`pulp_wars-w49.17`, 7r55): the Shock Trooper's Shock
    // Field.
    ...ninthUnitHelpRulesV7("MARTIAN"),
  ];
}

export const MARTIAN_HELP_RULES_V7: readonly (readonly [string, string])[] =
  martianHelpRulesV7();

// ---------------------------------------------------- abilities and labels

/** Martian ability names; other factions' names are unchanged. */
export function martianAbilityNameV7(
  ability: string,
  faction: FactionIdV7,
): string | null {
  if (faction !== "MARTIAN") return null;
  switch (ability) {
    case "RALLY":
      return PSYCHIC_COMMAND_LABEL_V7;
    case "CHARGE":
      return STRAFE_LABEL_V7;
    case "HEAT_RAY":
      return "Heat ray";
    case "PIERCE":
      return "Pierce";
    case "FORCE_FIELD":
      return "Force Field";
    case "BEAM_DOWN":
      return BEAM_DOWN_LABEL_V7;
    case "MIND_CONTROL":
      return MIND_CONTROL_LABEL_V7;
    case "TRACTOR_BEAM":
      return TRACTOR_BEAM_LABEL_V7;
    case "FLY":
      return "Flies";
    case "STRIDE":
      return "Strides";
    default:
      return null;
  }
}

/** One-sentence descriptions of the Martian abilities (unit information). */
export function martianAbilityDescriptionV7(
  ability: string,
  faction: FactionIdV7,
  /** `pulp_wars-1wy.5`: the role, for its own Tractor Beam's text. */
  role?: UnitRoleIdV7,
): string | null {
  if (faction !== "MARTIAN") return null;
  switch (ability) {
    case "RALLY":
      return `Adjacent friendly land troops, except ${martianLabelV7("CAPTAIN")}s and ${martianLabelV7("CATAPULT")}s, get +1 Attack on their next attack this turn. ${PSYCHIC_COMMAND_COOLDOWN_V7}`;
    case "CHARGE":
      return "With Raiding, +1 Attack on the first Attack after moving 2+ cells.";
    case "HEAT_RAY":
      return `Fires at full power if it has not moved this turn and is not Cooling; a full-power shot leaves it Cooling, at half Attack, until the end of its next turn.${
        role !== undefined && roleMechanicsV7(role, faction).heatSink
          ? ` ${HEAT_SINK_NOTE_V7}`
          : ""
      }`;
    case "PIERCE":
      return "Its ray also hits the unit directly behind the target for half the damage, friend or foe.";
    case "FORCE_FIELD":
      return `${FORCE_FIELD_NEEDS_TEXT_V7} own units next to it recharge their Shield to ${FORCE_FIELD_SHIELD_V7}. ${FORCE_FIELD_HOLDS_RULE_V7}`;
    case "BEAM_DOWN":
      return BEAM_DOWN_TOOLTIP_V7;
    case "MIND_CONTROL":
      return MIND_CONTROL_TOOLTIP_V7;
    case "TRACTOR_BEAM":
      return role === undefined
        ? TRACTOR_BEAM_TOOLTIP_V7
        : tractorBeamTooltipV7(roleHasHeavyTractorBeamV7(role, faction));
    case "FLY":
      return "Flies over any terrain and any unit and ignores zones of control; never captures or stands on a foreign city.";
    case "STRIDE":
      return "Crosses Forest, Mountain, and Shallow Water without stopping; never gets cover or fortification.";
    default:
      return null;
  }
}

/**
 * Martian command labels: Beam Down, Mind Control and Tractor Beam for every
 * viewer, and Psychic Command for a Martian viewer's Rally.
 */
export function martianCommandLabelV7(
  kind: CommandV7["kind"],
  faction: FactionIdV7,
): string | null {
  if (kind === "BEAM_DOWN") return BEAM_DOWN_LABEL_V7;
  if (kind === "MIND_CONTROL") return MIND_CONTROL_LABEL_V7;
  if (kind === "TRACTOR_BEAM") return TRACTOR_BEAM_LABEL_V7;
  if (kind === "RALLY" && faction === "MARTIAN")
    return PSYCHIC_COMMAND_LABEL_V7;
  return null;
}

/** The Martian names of the two unit rewards; null for every other reward. */
export function martianRewardLabelV7(
  reward: string,
): readonly [string, string] | null {
  if (reward === "MILITIA")
    return ["Militia", `A free ${martianLabelV7("FIGHTER")}`];
  if (reward === "JUGGERNAUT") {
    const slots = roleMechanicsV7("JUGGERNAUT", "MARTIAN").capacitySlots;
    return [
      martianLabelV7("JUGGERNAUT"),
      slots > 1 ? `A giant unit (${plural(slots, "slot")})` : "A giant unit",
    ];
  }
  return null;
}

/**
 * The technology unlock text of a Martian role (section 4): "Train Tripod
 * (heat ray, Pierce)", from the role's registered abilities.
 */
export function martianRoleUnlockTextV7(role: UnitRoleIdV7): string {
  const abilities = effectiveRoleRuleV7(role, "MARTIAN")
    .abilities as readonly string[];
  const notes = [
    ...(abilities.includes("FLY") ? ["flies"] : []),
    ...(abilities.includes("STRIDE") ? ["strides"] : []),
    ...(abilities.includes("HEAT_RAY") ? ["heat ray"] : []),
    ...(abilities.includes("PIERCE") ? ["Pierce"] : []),
    // The Martian pass: the Force Field is the Force Fields technology's.
    // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the Shield
    // Projector is trained with Force Fields itself, so the note is the
    // field alone ("Force Field with Force Fields" at the root before).
    ...(abilities.includes("FORCE_FIELD") ? ["Force Field"] : []),
    ...(abilities.includes("BEAM_DOWN") ? [BEAM_DOWN_LABEL_V7] : []),
    ...(abilities.includes("TRACTOR_BEAM") ? [TRACTOR_BEAM_LABEL_V7] : []),
  ];
  const label = martianLabelV7(role);
  return notes.length === 0
    ? `Train ${label}`
    : `Train ${label} (${notes.join(", ")})`;
}

/** Recruit-help notes of a Martian role, from its registration. */
export function martianRecruitNotesV7(
  role: UnitRoleIdV7,
  faction: FactionIdV7,
): readonly string[] {
  if (faction !== "MARTIAN" || isNavalRoleV7(role)) return [];
  const mechanics = roleMechanicsV7(role, faction);
  return [
    ...(mechanics.shield > 0
      ? [
          `Shield ${mechanics.shield}: takes damage before HP and recharges at the start of your turn.`,
        ]
      : []),
    ...(mechanics.movementMode === "FLY"
      ? ["Flies over any terrain and unit; never captures."]
      : mechanics.movementMode === "STRIDE"
        ? ["Strides over Forest, Mountain, and Shallow Water; no cover."]
        : []),
    ...(mechanics.capacitySlots > 1
      ? [`Takes ${plural(mechanics.capacitySlots, "slot")} in its city.`]
      : []),
    // The Martian pass (`pulp_wars-w49.14`, 7r52).
    ...(effectiveRoleRuleV7(role, faction).abilities.includes("FORCE_FIELD")
      ? [
          `${FORCE_FIELD_NEEDS_TEXT_V7} raises the Shields of units next to it to ${FORCE_FIELD_SHIELD_V7}; at full HP one attack cannot kill them.`,
        ]
      : []),
    ...(mechanics.heatSink ? [HEAT_SINK_NOTE_V7] : []),
    ...(roleMechanicsV7(role, "ORIGINAL").buildsFieldDefense &&
    !mechanics.buildsFieldDefense
      ? [`${MARTIAN_FIELD_DEFENSE_EXPLANATION_V7}.`]
      : []),
  ];
}

/** One line of Martian unit information. */
export interface MartianUnitInfoLineV7 {
  readonly id: "shield" | "ray" | "command" | "brain" | "slots" | "afloat";
  readonly name: string;
  readonly description: string;
}

/**
 * Unit info lines from the public Martian mechanics (`stats.martian`) that
 * are not abilities: the Shield, the ray's power now, a Brain's controlled
 * units and cooldown, a two-slot body, and a machine afloat. (A
 * mind-controlled unit's line, of any kind, is `mindControlledInfoV7`.)
 */
export function martianUnitInfoLinesV7(
  unit: Pick<PublicUnitV7, "role" | "form">,
  mechanics: PublicMartianMechanicsV7,
  /**
   * The Martian pass (`pulp_wars-w49.14`): false for the viewer's own unit
   * whose ray does not overheat (a Ray Gunner with Heat Sinks).
   */
  overheats = true,
): readonly MartianUnitInfoLineV7[] {
  const lines: MartianUnitInfoLineV7[] = [];
  if (mechanics.shieldMaximum > 0)
    lines.push({
      id: "shield",
      name: shieldTextV7(mechanics),
      description:
        mechanics.shield > mechanics.shieldMaximum
          ? "Raised by a Force Field. Takes damage before HP. At full HP one attack cannot kill it."
          : "Takes damage before HP; recharges at the start of its owner's turn.",
    });
  const ray = rayPowerTextV7(mechanics);
  if (ray !== null)
    lines.push({
      id: "ray",
      name: ray,
      description: mechanics.cooling
        ? COOLING_TOOLTIP_V7
        : mechanics.rayPower === "FULL"
          ? overheats
            ? "Its next shot fires at full Attack and leaves it Cooling."
            : "Its next shot fires at full Attack. Heat Sinks: it does not overheat."
          : "It moved this turn: its next shot fires at half Attack.",
    });
  // The Martian pass, correction: a Brain after its Psychic Command.
  if (ray === null && mechanics.cooling)
    lines.push({
      id: "command",
      name: "Cooling",
      description: PSYCHIC_COMMAND_COOLING_V7,
    });
  if (mechanics.mindControl !== null) {
    const blocked = mindControlUnavailableTextV7(mechanics.mindControl);
    lines.push({
      id: "brain",
      name: brainControlTextV7(mechanics.mindControl),
      description: blocked ?? `${MIND_CONTROL_LABEL_V7} is ready.`,
    });
  }
  if (mechanics.capacitySlots > 1)
    lines.push({
      id: "slots",
      name: "Big body",
      description: `Takes ${plural(mechanics.capacitySlots, "slot")} in its city.`,
    });
  if (unit.form === "EMBARKED" && mechanics.movementMode !== "GROUND")
    lines.push({
      id: "afloat",
      name: "Afloat",
      description:
        "Crossing water as a transport: it cannot attack or use abilities until it lands.",
    });
  return lines;
}

// --------------------------------------------------------- attack preview

/** "your" for the viewer, otherwise "Player N's". */
function possessive(view: PlayerViewV7, playerId: number): string {
  if (playerId === view.viewer.id) return "your";
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player === undefined ? "an enemy" : `Player ${player.seat + 1}'s`;
}

function allied(view: PlayerViewV7, left: number, right: number): boolean {
  if (left === right) return true;
  if (view.setup.aiMode !== "COOPERATIVE") return false;
  return left !== view.humanPlayerId && right !== view.humanPlayerId;
}

/**
 * A visible unit's name under its kind's registration (the Mind Control
 * revision: a controlled Knight is a Knight).
 */
export function martianUnitNameV7(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "id" | "ownerId" | "role">,
): string {
  return unitRoleRuleV7(view, unit).label;
}

/** The attack preview lines of section 13.1, split by kind. */
export interface MartianCombatLinesV7 {
  /** Lines of this target: the Shield on either side, the Disintegrator. */
  readonly notes: readonly string[];
  /**
   * Lines of the shooter, the same for each of its targets: the ray power
   * and why, and "Leaves it Cooling next turn".
   */
  readonly shooter: readonly string[];
  /** Pierce lines; `friendly` marks a hit on an own or allied unit. */
  readonly pierce: readonly {
    readonly text: string;
    readonly friendly: boolean;
  }[];
}

/**
 * Section 13.1 "attack preview", for own and enemy attacks, from the public
 * combat preview: the Shield absorbed on either side ("Shield absorbs 2",
 * "Your Shield absorbs 1"), the ray power and why ("Full power", "Half
 * power: moved", "Half power: Cooling"), "Leaves it Cooling next turn", the
 * Pierce victim with its damage (friendly fire marked), and the
 * Disintegrator. Empty for an exchange without any of them.
 */
export function martianCombatLinesV7(
  view: PlayerViewV7,
  preview: CombatPreviewV7,
): MartianCombatLinesV7 {
  const notes: string[] = [];
  const shooter: string[] = [];
  const pierce: { text: string; friendly: boolean }[] = [];
  const attacker = view.units.find((unit) => unit.id === preview.attackerId);
  if (preview.defenderShieldDamage > 0)
    notes.push(`Shield absorbs ${preview.defenderShieldDamage}`);
  // The Martian pass, correction: a whole Force Field holds one attack.
  const defender = view.units.find((unit) => unit.id === preview.targetUnitId);
  if (
    defender !== undefined &&
    !preview.defenderDies &&
    preview.damageToDefender === defender.hp - 1 &&
    forceFieldHoldsV7(
      view,
      defender,
      view.shields.find((entry) => entry.unitId === defender.id)?.shield ?? 0,
    )
  )
    notes.push(FORCE_FIELD_HOLDS_V7);
  if (preview.attackerShieldDamage > 0)
    notes.push(
      `${attacker?.ownerId === view.viewer.id ? "Your " : "Its "}Shield absorbs ${preview.attackerShieldDamage}`,
    );
  if (preview.rayPower !== "NONE" && attacker !== undefined) {
    const mechanics = martianStatsV7(view, attacker.id);
    shooter.push(
      preview.rayPower === "FULL"
        ? "Full power"
        : mechanics?.cooling === true
          ? "Half power: Cooling"
          : "Half power: moved",
    );
    if (preview.coolingApplied) shooter.push(LEAVES_COOLING_V7);
    if (preview.fortificationIgnored > 0) notes.push(DISINTEGRATOR_PREVIEW_V7);
    const pierces =
      attacker.form === "LAND" &&
      (unitRoleRuleV7(view, attacker).abilities as readonly string[]).includes(
        "PIERCE",
      );
    if (pierces)
      for (const entry of preview.splash) {
        const victim = view.units.find((unit) => unit.id === entry.unitId);
        if (victim === undefined) continue;
        const friendly = allied(view, victim.ownerId, attacker.ownerId);
        const name = martianUnitNameV7(view, victim);
        const hit = entry.damage + entry.shieldDamage;
        const shield =
          entry.shieldDamage > 0
            ? ` (Shield absorbs ${entry.shieldDamage})`
            : "";
        const lethal = entry.dies ? ", lethal" : "";
        pierce.push({
          friendly,
          text:
            victim.ownerId === view.viewer.id
              ? `Pierce hits your ${name}: ${hit} damage${shield}${lethal}`
              : friendly
                ? `Pierce hits an ally's ${name}: ${hit} damage${shield}${lethal}`
                : `Pierces ${name}: ${hit} damage${shield}${lethal}`,
        });
      }
  }
  return { notes, shooter, pierce };
}

// -------------------------------------------------------- ability previews

/** Section 13.2 "Mind Control target reasons" for a target not offered. */
export function mindControlTargetReasonV7(
  view: PlayerViewV7,
  target: PublicUnitV7,
): string | null {
  const tile = view.board.tiles.find(
    (candidate) =>
      candidate.at.x === target.at.x && candidate.at.y === target.at.y,
  );
  const onSite =
    view.cities.some(
      (city) => city.at.x === target.at.x && city.at.y === target.at.y,
    ) ||
    (tile?.explored === true && tile.site === "VILLAGE");
  if (onSite) return MIND_CONTROL_PROTECTED_V7;
  const mechanics = unitRoleMechanicsV7(view, target);
  if (
    target.form !== "LAND" ||
    target.role === "JUGGERNAUT" ||
    mechanics.capacitySlots !== 1 ||
    mechanics.construct
  )
    return MIND_CONTROL_IMMUNE_V7;
  if (isMindControlledV7(view, target.id)) return "Already controlled";
  if (target.hp > MIND_CONTROL_HP_V7) return `Too healthy (${target.hp} HP)`;
  if (target.hp >= target.maxHp) return "Unhurt";
  return null;
}

/** The Mind Control preview's lines (section 13.1). */
export function mindControlPreviewLinesV7(
  _view: PlayerViewV7,
  preview: MindControlPreviewV7,
): readonly string[] {
  const name = effectiveRoleRuleV7(preview.role, preview.faction).label;
  return [
    `Becomes yours: ${name} (${preview.hp} / ${preview.maxHp} HP)`,
    `Mind Control recovers for ${plural(preview.cooldownTurns, "turn")}`,
    "Returns if this Brain is lost",
    ...(preview.releasedUnitIds.length > 0
      ? [
          `Releases ${plural(preview.releasedUnitIds.length, "unit")} this ${name} controls`,
        ]
      : []),
  ];
}

/** The short board label of a Mind Control target. */
export function mindControlTargetLabelV7(
  preview: MindControlPreviewV7,
): string {
  return `Take · ${preview.hp} HP`;
}

/** Section 13.2 "Tractor Beam preview" lines. */
export function tractorBeamPreviewLinesV7(
  view: PlayerViewV7,
  preview: TractorBeamPreviewV7,
): readonly string[] {
  const cityName = (cityId: number): string => {
    const city = view.cities.find((candidate) => candidate.id === cityId);
    if (city === undefined) return "the city";
    return `${possessive(view, city.ownerId)} ${city.isCapital ? "Capital" : "City"}`;
  };
  const fromCity = view.cities.some(
    (city) => city.at.x === preview.from.x && city.at.y === preview.from.y,
  );
  return [
    ...(preview.fortificationLost > 0
      ? [fromCity ? "Pulled out of Walls" : "Pulled off Field Defense"]
      : []),
    ...(preview.emptiesCenterOfCityId === null
      ? []
      : [`Empties ${cityName(preview.emptiesCenterOfCityId)}`]),
    ...(preview.liftsSiegeOfCityId === null
      ? []
      : [`Lifts the siege of ${cityName(preview.liftsSiegeOfCityId)}`]),
  ];
}

/** The short board label of a Tractor Beam target. */
export function tractorBeamTargetLabelV7(
  view: PlayerViewV7,
  preview: TractorBeamPreviewV7,
): string {
  const [first] = tractorBeamPreviewLinesV7(view, preview);
  return first === undefined ? "Pull" : `Pull · ${first}`;
}

/** The warning on a Beam Down tile whose Field Defense the landing ends. */
export const BEAM_DESTROYS_FIELD_DEFENSE_V7 = "Destroys Field Defense";

/**
 * The Beam Down destination label. `pulp_wars-1wy.5` (minimal text): a
 * plain tile is its dashed outline alone, with no "Beam here" box on each
 * of the eight tiles; only a tile whose Field Defense the landing destroys
 * carries a label. Null for a plain tile.
 */
export function beamDownTileLabelV7(
  preview: BeamDownPreviewV7,
  at: { readonly x: number; readonly y: number },
): string | null {
  return preview.fieldDefenseDestroyed.some(
    (tile) => tile.x === at.x && tile.y === at.y,
  )
    ? BEAM_DESTROYS_FIELD_DEFENSE_V7
    : null;
}

/** Whether `unit` is an own land-form unit on the viewer's turn. */
function ownActorNow(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return (
    unit.ownerId === view.viewer.id &&
    unit.form === "LAND" &&
    view.turnOrder[view.activeSeatIndex] === view.viewer.id
  );
}

/**
 * Why an own carrier has no Beam Down (section 13.1; `pulp_wars-1wy.5`): a
 * Frozen carrier that moved, a carrier that used its action, no passenger,
 * or no free tile; null when it has one, when it is not the viewer's to
 * command now, or when it arrived this turn (landed or trained: nothing is
 * offered to it at all). `offered` is whether any `BEAM_DOWN` of the
 * carrier is offered.
 */
export function beamDownUnavailableTextV7(
  view: PlayerViewV7,
  unitId: number,
  offered: boolean,
): string | null {
  if (offered) return null;
  const saucer = view.units.find((unit) => unit.id === unitId);
  if (
    saucer === undefined ||
    !ownActorNow(view, saucer) ||
    !(unitRoleRuleV7(view, saucer).abilities as readonly string[]).includes(
      "BEAM_DOWN",
    ) ||
    activationIsExhaustedV7(saucer.activation)
  )
    return null;
  if (sluggishUnitMovedV7(view, saucer)) return MARTIAN_FROZEN_MOVED_V7;
  if (primaryActionUsedV7(saucer.activation)) return MARTIAN_ACTED_V7;
  // `pulp_wars-1wy.3`: a carrier that moved may still Beam Down (a moved
  // carrier is handled, so `handled` no longer hides the reason); the
  // passengers are the engine's own test.
  const centers = view.cities
    .filter((city) => city.ownerId === view.viewer.id)
    .map((city) => city.at);
  const passengers = view.units.filter((unit) =>
    beamDownPassengerLegalV7(view, saucer, unit, centers, view.beamedThisTurn),
  );
  return passengers.length === 0
    ? BEAM_DOWN_NO_PASSENGER_V7
    : BEAM_DOWN_NO_TILE_V7;
}

/**
 * `pulp_wars-1wy.5`: why an own puller has no Tractor Beam: a Frozen puller
 * that moved, a Mothership whose free pull is spent ("Tractor Beam used
 * this turn"), a Saucer that used its action, or nothing in reach; null
 * when it has one, is not the viewer's to command now, or arrived this
 * turn. `offered` is whether any `TRACTOR_BEAM` of the unit is offered.
 */
export function tractorBeamUnavailableTextV7(
  view: PlayerViewV7,
  unitId: number,
  offered: boolean,
): string | null {
  if (offered) return null;
  const puller = view.units.find((unit) => unit.id === unitId);
  if (puller === undefined || !ownActorNow(view, puller)) return null;
  const rule = tractorBeamRuleV7(view, puller);
  if (rule === null || activationIsExhaustedV7(puller.activation)) return null;
  if (sluggishUnitMovedV7(view, puller)) return MARTIAN_FROZEN_MOVED_V7;
  if (rule.free) {
    if (view.tractorUsedThisTurn.includes(puller.id)) return TRACTOR_USED_V7;
  } else if (primaryActionUsedV7(puller.activation)) return MARTIAN_ACTED_V7;
  return TRACTOR_BEAM_NO_TARGET_V7;
}

/** One dock chip of the per-turn Martian mobility facts. */
export interface MartianTurnChipV7 {
  readonly id: "beamed" | "tractor-used";
  readonly label: string;
  readonly tooltip: string;
}

/**
 * `pulp_wars-1wy.5`: the per-turn chips of a visible unit, from the public
 * `beamedThisTurn` and `tractorUsedThisTurn` lists: "Beamed" on a unit a
 * carrier set down this turn (of any kind: a controlled Knight too) and
 * "Beam used" on a Mothership whose free pull is spent.
 */
export function martianTurnChipsV7(
  view: Pick<PlayerViewV7, "beamedThisTurn" | "tractorUsedThisTurn">,
  unitId: number,
): readonly MartianTurnChipV7[] {
  return [
    ...(view.beamedThisTurn.some((id) => id === unitId)
      ? [
          {
            id: "beamed" as const,
            label: BEAMED_CHIP_V7,
            tooltip: BEAMED_CHIP_TOOLTIP_V7,
          },
        ]
      : []),
    ...(view.tractorUsedThisTurn.some((id) => id === unitId)
      ? [
          {
            id: "tractor-used" as const,
            label: TRACTOR_USED_CHIP_V7,
            tooltip: TRACTOR_USED_V7,
          },
        ]
      : []),
  ];
}

/**
 * `pulp_wars-1wy.5`: the explored tiles within the pick-up range of a
 * carrier (the square of `BEAM_DOWN_PICKUP_RANGE_V7` round it, its own tile
 * excluded), for the aiming tint.
 */
export function beamDownPickupTilesV7(
  view: Pick<PlayerViewV7, "board">,
  carrier: { readonly x: number; readonly y: number },
): readonly { readonly x: number; readonly y: number }[] {
  return view.board.tiles
    .filter(
      (tile) =>
        tile.explored &&
        !(tile.at.x === carrier.x && tile.at.y === carrier.y) &&
        Math.max(
          Math.abs(tile.at.x - carrier.x),
          Math.abs(tile.at.y - carrier.y),
        ) <= BEAM_DOWN_PICKUP_RANGE_V7,
    )
    .map((tile) => tile.at);
}

// ------------------------------------------------------------- log lines

/**
 * Section 13.2 log lines of one projected boundary: Shields recharged, a
 * Beam Down, a Mind Control, a controlled unit released or lost with its
 * Brain (the Mind Control revision section 9), and a pull. A match without
 * a Martian seat never emits these events, so its notices are unchanged.
 */
export function martianBoundaryNoticeV7(
  events: readonly PlayerEventV7[],
  before: PlayerViewV7,
  after: PlayerViewV7,
): { readonly text: string; readonly toast: boolean } | null {
  if (!matchHasMartianV7(after)) return null;
  const viewerId = after.viewer.id;
  const parts: string[] = [];
  let toast = false;
  const unitById = (id: number): PublicUnitV7 | undefined =>
    after.units.find((unit) => unit.id === id) ??
    before.units.find((unit) => unit.id === id);
  const owner = (playerId: number): string =>
    capitalized(possessive(after, playerId));
  for (const event of events) {
    if (event.kind === "SHIELDS_RECHARGED") {
      if (event.results.length === 0) continue;
      parts.push(`${owner(event.playerId)} Shields recharged`);
    } else if (event.kind === "UNIT_BEAMED") {
      if (event.playerId === viewerId) toast = true;
      const passenger = unitById(event.passengerUnitId);
      const name =
        passenger === undefined ? "unit" : martianUnitNameV7(after, passenger);
      // `pulp_wars-1wy.3`: the carrier is a Saucer or a Mothership.
      const carrier = unitById(event.unitId);
      const carrierName =
        carrier === undefined
          ? martianLabelV7("RAIDER")
          : martianUnitNameV7(after, carrier);
      parts.push(
        `${owner(event.playerId)} ${carrierName} beamed down a ${name}`,
      );
    } else if (event.kind === "UNIT_MIND_CONTROLLED") {
      toast = true;
      // The target keeps its kind: the original owner's registration.
      const name = seatRoleRuleV7(
        after,
        event.targetOwnerId,
        event.targetRole,
      ).label;
      parts.push(
        `${owner(event.playerId)} ${martianLabelV7("CAPTAIN")} took control of ${possessive(after, event.targetOwnerId)} ${name}`,
      );
    } else if (event.kind === "UNIT_RELEASED") {
      toast = true;
      const unit = unitById(event.unitId);
      const name =
        unit === undefined ? "A unit" : martianUnitNameV7(after, unit);
      parts.push(
        `${name} returned to ${event.toPlayerId === viewerId ? "you" : playerShortNameV7(after, event.toPlayerId)}`,
      );
    } else if (event.kind === "UNIT_DIED" && event.cause === "BRAIN_LOST") {
      toast = true;
      const unit = unitById(event.unitId);
      const name =
        unit === undefined ? "A unit" : martianUnitNameV7(before, unit);
      parts.push(`${name} was lost with its Brain`);
    } else if (event.kind === "UNIT_PULLED") {
      const source = unitById(event.sourceUnitId);
      const target = unitById(event.targetUnitId);
      if (source === undefined) continue;
      if (source.ownerId === viewerId || target?.ownerId === viewerId)
        toast = true;
      const targetName =
        target === undefined
          ? "a unit"
          : `${target.ownerId === source.ownerId ? "its" : possessive(after, target.ownerId)} ${martianUnitNameV7(after, target)}`;
      // `pulp_wars-1wy.3`: the puller is a Saucer or a Mothership.
      parts.push(
        `${owner(source.ownerId)} ${martianUnitNameV7(after, source)} pulled ${targetName}`,
      );
    }
  }
  return parts.length === 0 ? null : { text: parts.join(" · "), toast };
}

const FIELD_DEFENSE_BLOCK_CACHE = new WeakMap<PlayerViewV7, Set<number>>();

/**
 * Section 13.2 "Field Defense unavailable": an own Grunt or Shield
 * Projector where a Human Fighter or Guard would be offered Build Field
 * Defense (Fortification, own territory land tile, not moved, primary
 * action unused, no Field Defense yet, 3 Coins). A Martian viewer's
 * Fortification is Force Fields, so this is rare; it explains the gap.
 */
export function martianFieldDefenseBlockedV7(
  view: PlayerViewV7,
  unitId: number,
): boolean {
  if (view.viewer.faction !== "MARTIAN") return false;
  let cached = FIELD_DEFENSE_BLOCK_CACHE.get(view);
  if (cached === undefined) {
    cached = new Set(
      view.units
        .filter((candidate) => {
          const activation = candidate.activation;
          const tile = view.board.tiles.find(
            (item) =>
              item.at.x === candidate.at.x && item.at.y === candidate.at.y,
          );
          return (
            candidate.ownerId === view.viewer.id &&
            candidate.form === "LAND" &&
            !isMindControlledV7(view, candidate.id) &&
            roleMechanicsV7(candidate.role, "ORIGINAL").buildsFieldDefense &&
            !roleMechanicsV7(candidate.role, "MARTIAN").buildsFieldDefense &&
            !activation.moved &&
            !activation.attacked &&
            !activation.recovered &&
            !activation.captured &&
            !activation.specialActed &&
            view.viewer.researchedTechs.includes("FORTIFICATION") &&
            tile?.explored === true &&
            tile.biome !== null &&
            tile.territoryOwnerId === view.viewer.id &&
            !tile.fieldDefense &&
            view.viewer.coins >= 3
          );
        })
        .map((candidate) => candidate.id),
    );
    FIELD_DEFENSE_BLOCK_CACHE.set(view, cached);
  }
  return cached.has(unitId);
}

/** The Martian technology unlock texts of section 4. */
export const BRAIN_SUPPORT_UNLOCK_TEXT_V7 = `${martianLabelV7("CAPTAIN")}s give ${PSYCHIC_COMMAND_LABEL_V7} or take ${MIND_CONTROL_LABEL_V7} of weakened enemies`;
// The Martian pass (`pulp_wars-w49.14`, 7r52): the Force Field itself is
// this technology's.
export const FORCE_FIELDS_UNLOCK_TEXT_V7 = `${martianLabelV7("GUARD")}s raise the Shields of units next to them to ${FORCE_FIELD_SHIELD_V7}, and at full HP one attack cannot kill such a unit; Shields also recharge at the end of your turn`;
/** The Martian pass: Heat Sinks, the Martian Fieldcraft. */
export const HEAT_SINKS_UNLOCK_TEXT_V7 = `${martianLabelV7("MARKSMAN")}s do not overheat: full power every turn they do not move`;
/** The Martian pass: the two rules on a unit card and a recruit note. */
export const FORCE_FIELD_NEEDS_TEXT_V7 = "With Force Fields:";
export const HEAT_SINK_NOTE_V7 =
  "With Heat Sinks it does not overheat: full power every turn it does not move.";
export const DISINTEGRATOR_UNLOCK_TEXT_V7 =
  "Heat rays ignore Walls and Field Defense";

/**
 * The slot-capacity stat's tooltip for a Martian viewer: the roles that
 * take more than one slot, from the registry, and the mind-controlled rule.
 */
export function martianSlotCapacityTooltipV7(): string {
  const big = UNIT_ROLE_IDS_V7.filter(
    (role) => roleMechanicsV7(role, "MARTIAN").capacitySlots > 1,
  );
  const slots = Math.max(
    1,
    ...big.map((role) => roleMechanicsV7(role, "MARTIAN").capacitySlots),
  );
  return big.length === 0
    ? `Unit slots used in this city; ${MIND_CONTROLLED_NO_SLOT_V7.toLowerCase()}`
    : `Unit slots used in this city; a ${joinOr(big.map(martianLabelV7))} takes ${slots}; ${MIND_CONTROLLED_NO_SLOT_V7.toLowerCase()}`;
}
