import {
  BLIZZARD_RADIUS_V7,
  BOLAS_RANGE_V7,
  BRITTLE_SHATTER_HP_V7,
  COLD_BLOOD_BONUS2_V7,
  DEEP_WINTER_RADIUS_V7,
  DEEP_WINTER_RECOVER_V7,
  FROST_BOLT_RANGE_V7,
  PLANTED_BONUS2_V7,
  ROCKFALL_ATTACK2_V7,
  SHATTER_HP_V7,
  STAMPEDE_DAMAGE_V7,
  STAMPEDE_RANGE_V7,
  SWEEP_DAMAGE_V7,
  UNIT_ROLE_IDS_V7,
  canBeFrozenV7,
  canEnterTerrainV7,
  effectiveRoleRuleV7,
  isIceAtV7,
  isNeutralOwnerV7,
  previewStampedeV7,
  unitFactionV7,
  roleMechanicsV7,
  tileOccupiedV7,
  unitCapabilitiesV7,
  unitIsFrozenV7,
  unitIsImmovableV7,
  unitIsMountainBornV7,
  unitMovementModeV7,
  technologyCapabilitiesV7,
  unitRoleRuleV7,
  validatePlayerMovementPathV7,
  type BolasPreviewV7,
  type ColdSnapPreviewV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type PlayerEventV7,
  type PlayerViewV7,
  type PublicIceFolkMechanicsV7,
  type PublicUnitStatsV7,
  type UnitId,
  isNavalRoleV7,
  type UnitRoleIdV7,
} from "../engine/index";
import { ninthUnitHelpRulesV7 } from "./ninth-unit-presentation-v7";

/**
 * Presentation helpers for the Ice Folk faction (docs/product/
 * RULESET_7_ICE_FOLK.md section 13, bead pulp_wars-7g3.6; Ice Folk Freeze,
 * RULESET_7_CURRENT.md section 21, bead pulp_wars-w49.38). Every helper
 * reads only the public view (`frozen`, the tile flags `snow` and
 * `blizzard`, the `ice` list), the public unit stats' `frozen` and
 * `iceFolk` blocks, the public previews (`previewBolasV7`,
 * `previewFrostBoltV7`, `previewColdSnapV7`, `previewStampedeV7`,
 * `queryCombatPreviewV7`) and projected player events. Every number in a sentence comes from the
 * registry or the engine constants, so the balance bead can retune them
 * without a text going stale. A match without an Ice Folk seat never
 * reaches a code path that changes its presentation.
 */

type PublicUnitV7 = PlayerViewV7["units"][number];

/** True exactly when a seat of the match plays the Ice Folk. */
export function matchHasIceFolkSeatV7(
  view: Pick<PlayerViewV7, "players">,
): boolean {
  return view.players.some((player) => player.faction === "ICE_FOLK");
}

/** Whether a visible unit is of the IceFolk kind (`unitFactionV7`). */
export function unitIsIceFolkV7(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "id" | "ownerId">,
): boolean {
  return unitFactionV7(view, unit) === "ICE_FOLK";
}

/** An Ice Folk role's label under the Ice Folk registration. */
export const iceFolkLabelV7 = (role: UnitRoleIdV7): string =>
  effectiveRoleRuleV7(role, "ICE_FOLK").label;

/** The Ice Folk roles whose registration has `ability`, in role order. */
function iceFolkRolesWith(ability: string): readonly UnitRoleIdV7[] {
  return UNIT_ROLE_IDS_V7.filter((role) =>
    (
      effectiveRoleRuleV7(role, "ICE_FOLK").abilities as readonly string[]
    ).includes(ability),
  );
}

/** "A", "A and B", "A, B, and C". */
function joinAnd(names: readonly string[]): string {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1) ?? ""}`;
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

/** Half-units as the interface writes them: 3 → "1.5", 6 → "3". */
const half = (value2: number): string => String(value2 / 2);

/** "Ice Witch" → "Ice Witches", "Yeti" → "Yetis". */
function pluralLabel(label: string): string {
  return /(?:ch|sh|s|x)$/.test(label) ? `${label}es` : `${label}s`;
}

// ------------------------------------------------------------ section 13.2

export const FROZEN_LABEL_V7 = "Frozen";
/** The status sentence of a Frozen unit when its thaw is not named. */
export const FROZEN_STATUS_V7 =
  "Frozen: it cannot move or act until it thaws, and does not strike back";
/** Why an own Frozen unit has no orders this turn. */
export const FROZEN_CANNOT_ACT_V7 = "Frozen: it cannot move or act this turn";
/** The attack preview of a Frozen defender that does not retaliate. */
export const FROZEN_NO_STRIKE_BACK_V7 = "Won't strike back (Frozen)";
export const SHATTERS_PREVIEW_V7 = "Shatters";
/** "Sweep: {unit} {n} damage". */
export function sweepPreviewTextV7(unit: string, damage: number): string {
  return `Sweep: ${unit} ${damage} damage`;
}
export const TRAMPLE_PREVIEW_V7 = "Tramples Field Defense";
export const BOULDERS_PREVIEW_V7 = "Ignores fortification";
export const ROCKFALL_PREVIEW_V7 = `Rockfall: Attack ${half(ROCKFALL_ATTACK2_V7)} from the Mountain`;
export const PLANTED_PREVIEW_V7 = `Planted: +${half(PLANTED_BONUS2_V7)} Attack`;
export const COLD_BLOOD_PREVIEW_V7 = `Cold Blood: +${half(COLD_BLOOD_BONUS2_V7)} Attack`;
export const SNOW_COVER_PREVIEW_V7 = "Snow cover";
export const BLIZZARD_PREVIEW_V7 = "Blizzard: half damage";
export const HIDDEN_BLIZZARD_PREVIEW_V7 = "A hidden Blizzard may change this";
export const SNOW_LABEL_V7 = "Snow";
export const BLIZZARD_LABEL_V7 = "Blizzard";
export const SNOW_TOOLTIP_ICE_FOLK_V7 =
  "Snow: your units move at half cost from Snow to Snow and have light cover here unless fortified";
export const SNOW_TOOLTIP_OTHERS_V7 =
  "Snow: your units stop on entering, as in a Forest. Ice Folk units have cover";
export const BLIZZARD_TOOLTIP_V7 =
  "Blizzard: Snow, and Ice Folk units here take half damage from ranged attacks";
export const BOLAS_LABEL_V7 = "Bolas";
export const BOLAS_TOOLTIP_V7 = `Freeze a hostile unit within ${BOLAS_RANGE_V7} tiles. No damage.`;
export const BOLAS_PICK_V7 = "Choose a unit to freeze";
export const WILL_BE_FROZEN_V7 = "Will be Frozen";
/** A target that is Frozen already: the freeze renews it. */
export const STAYS_FROZEN_V7 = "Stays Frozen";
/** "{unit} can then shatter it". */
export function canThenShatterTextV7(units: readonly string[]): string {
  return `${joinAnd(units)} can then shatter it`;
}
export const BOLAS_NO_TARGET_V7 = `No enemy within ${BOLAS_RANGE_V7} tiles`;
export const COLD_SNAP_LABEL_V7 = "Cold Snap";
export const COLD_SNAP_TOOLTIP_V7 =
  "Freeze every hostile unit next to her. No damage. Instead of a Frost Bolt.";
export const COLD_SNAP_NO_TARGET_V7 = "No enemy next to her";
export const COLD_SNAP_CAST_V7 = "Cast Cold Snap";
/** Ice Folk Freeze (`pulp_wars-w49.38`): the Witch's single-target freeze. */
export const FROST_BOLT_LABEL_V7 = "Frost Bolt";
export const FROST_BOLT_TOOLTIP_V7 = `Freeze one hostile unit within ${FROST_BOLT_RANGE_V7} tiles. No damage. Instead of a Cold Snap.`;
export const FROST_BOLT_PICK_V7 = "Choose a unit to freeze";
export const FROST_BOLT_NO_TARGET_V7 = `No enemy within ${FROST_BOLT_RANGE_V7} tiles`;
/** The Witch used her Cold Snap or Frost Bolt (one of the two a turn). */
export const WITCH_SPELL_USED_V7 = "She already cast this turn";
/** Ice Folk Freeze: the Mammoth's charge. */
export const STAMPEDE_LABEL_V7 = "Stampede";
export const STAMPEDE_TOOLTIP_V7 = `Charge up to ${STAMPEDE_RANGE_V7} tiles in a straight line: each enemy in the way takes ${STAMPEDE_DAMAGE_V7} and is shoved aside. Only before it moves; it is its action.`;
export const STAMPEDE_PICK_V7 = "Choose where to charge";
export const STAMPEDE_CONFIRM_HINT_V7 = "Choose the tile again to charge";
export const STAMPEDE_NO_LINE_V7 = "No open line to charge";
export const STAMPEDE_MOVED_V7 = "It moved this turn";
export const STAMPEDE_CHARGE_V7 = "Charge";
/** Ice Folk Freeze: the Frost Giant's Move freezes the enemies around it. */
export const COLD_AURA_LABEL_V7 = "Cold Aura";
export const SABRETOOTH_INFO_V7 = "Prowl: zones of control do not stop it";
export const MOUNTAIN_BORN_INFO_V7 =
  "Mountain-born: crosses Mountains without Engineering";
/**
 * The Shatter window of a Frozen unit, in words: "An Ice Folk blow from the
 * next tile that leaves it at {n} HP or less shatters it".
 */
export function shatterWindowTextV7(threshold: number): string {
  return `An Ice Folk blow from the next tile that leaves it at ${threshold} HP or less shatters it`;
}
/** "Shatters at {n} HP or less". */
export function shatterThresholdTextV7(threshold: number): string {
  return `Shatters at ${threshold} HP or less`;
}
export const ICE_FOLK_FIELD_DEFENSE_EXPLANATION_V7 =
  "Ice Folk cannot build Field Defense";

/**
 * Section 13.2 "Boulder Yeti info": "Planted: Attack 3" or "Moved: Attack
 * 2", from the registry's Attack and the Planted bonus.
 */
export function boulderThrowTextV7(planted: boolean): string {
  const attack2 = effectiveRoleRuleV7("CATAPULT", "ICE_FOLK").attack2;
  return planted
    ? `Planted: Attack ${half(attack2 + PLANTED_BONUS2_V7)}`
    : `Moved: Attack ${half(attack2)}`;
}

// ----------------------------------------------------------- Frozen state

/**
 * Ice Folk Freeze (RULESET_7_CURRENT.md section 21.2): the `turnsLeft` of a
 * visible unit's Frozen entry (1 or 2: its owner's End Turns until it
 * thaws), or null when it is not Frozen. Frozen is public.
 */
export function frozenTurnsLeftV7(
  view: Pick<PlayerViewV7, "frozen">,
  unitId: number,
): number | null {
  if (view.frozen.length === 0) return null;
  return (
    view.frozen.find((candidate) => candidate.unitId === unitId)?.turnsLeft ??
    null
  );
}

/**
 * When a Frozen unit thaws, from its owner's point of view: "at the end of
 * this turn" during its owner's turn with one End Turn left, otherwise at
 * the end of its next turn (or of the one after it).
 */
export function frozenThawTextV7(
  view: Pick<PlayerViewV7, "turnOrder" | "activeSeatIndex">,
  ownerId: number,
  turnsLeft: number,
): string {
  const ownTurn = view.turnOrder[view.activeSeatIndex] === ownerId;
  const remaining = ownTurn ? turnsLeft - 1 : turnsLeft;
  if (remaining <= 0) return "thaws at the end of this turn";
  if (remaining === 1) return "thaws at the end of its next turn";
  return `thaws after ${remaining} more of its turns`;
}

/** "Frozen · 1 turn": the dock chip of a Frozen unit (its owner's turns). */
export function frozenChipLabelV7(turnsLeft: number): string {
  return `${FROZEN_LABEL_V7} · ${plural(turnsLeft, "turn")}`;
}

/**
 * The Frozen chip of a unit's dock: its label, the turns left, and its
 * one-sentence status with the thaw; null for a unit that is not Frozen.
 */
export function frozenChipV7(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "id" | "ownerId">,
): {
  readonly label: string;
  readonly turnsLeft: number;
  readonly status: string;
} | null {
  const turnsLeft = frozenTurnsLeftV7(view, unit.id);
  if (turnsLeft === null) return null;
  return {
    label: frozenChipLabelV7(turnsLeft),
    turnsLeft,
    status: `${FROZEN_LABEL_V7}: it cannot move or act and does not strike back; it ${frozenThawTextV7(view, unit.ownerId, turnsLeft)}`,
  };
}

/** The public Ice Folk mechanics of a visible unit, or undefined. */
export function iceFolkStatsV7(
  view: PlayerViewV7,
  unitId: number,
): PublicIceFolkMechanicsV7 | undefined {
  return view.unitStats.find((entry) => entry.unitId === unitId)?.iceFolk;
}

function allied(view: PlayerViewV7, left: number, right: number): boolean {
  if (left === right) return true;
  if (view.setup.aiMode !== "COOPERATIVE") return false;
  return left !== view.humanPlayerId && right !== view.humanPlayerId;
}

/**
 * The Shatter threshold that applies to a hostile unit of `ownerId`: the
 * highest of the Ice Folk seats hostile to it, as far as the viewer knows
 * it (its own threshold from its technologies; another seat's from the
 * public stats of its visible units, else the base `SHATTER_HP_V7`). Null
 * when no Ice Folk seat is hostile to that owner.
 */
export function shatterThresholdAgainstV7(
  view: PlayerViewV7,
  ownerId: number,
): number | null {
  let best: number | null = null;
  for (const player of view.players) {
    if (player.faction !== "ICE_FOLK" || allied(view, player.id, ownerId))
      continue;
    const threshold =
      player.id === view.viewer.id
        ? technologyCapabilitiesV7(view.viewer.researchedTechs, "ICE_FOLK")
            .shatterThreshold
        : Math.max(
            SHATTER_HP_V7,
            ...view.units
              .filter((unit) => unit.ownerId === player.id)
              .map(
                (unit) =>
                  iceFolkStatsV7(view, unit.id)?.shatterThreshold ??
                  SHATTER_HP_V7,
              ),
          );
    best = best === null ? threshold : Math.max(best, threshold);
  }
  return best;
}

/**
 * Section 13.1 "Shatter window on HP bars": the lowest HP of a Frozen
 * unit's bar that an Ice Folk blow would shatter, or null (not Frozen, not
 * in land form, a `JUGGERNAUT` role, or no hostile Ice Folk seat).
 */
export function shatterWindowV7(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "id" | "ownerId" | "form" | "role">,
): number | null {
  if (frozenTurnsLeftV7(view, unit.id) === null) return null;
  if (unit.form !== "LAND" || unit.role === "JUGGERNAUT") return null;
  return shatterThresholdAgainstV7(view, unit.ownerId);
}

/**
 * Why an own Frozen unit cannot act now ("Frozen: it cannot move or act
 * this turn"), on its owner's turn; null for every other unit.
 */
export function frozenCannotActV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): string | null {
  return unit.ownerId === view.viewer.id &&
    view.turnOrder[view.activeSeatIndex] === view.viewer.id &&
    unitIsFrozenV7(view, unit)
    ? FROZEN_CANNOT_ACT_V7
    : null;
}

// ------------------------------------------------------------ section 13.3

/**
 * Section 13.3: one sentence per rule, shown in Help for every viewer of a
 * match with an Ice Folk seat. Labels and numbers come from the registry
 * and the engine constants; with the contract values these are the spec's
 * sentences.
 */
export function iceFolkHelpRulesV7(): readonly (readonly [string, string])[] {
  const label = iceFolkLabelV7;
  const sledders = iceFolkRolesWith("BOLAS").map(label);
  const witches = iceFolkRolesWith("COLD_SNAP").map(label);
  const hunters = iceFolkRolesWith("COLD_BLOOD").map(label);
  const sweepers = iceFolkRolesWith("SWEEP").map(label);
  const born = iceFolkRolesWith("MOUNTAIN_BORN").map((role) =>
    pluralLabel(label(role)),
  );
  const rockfall = iceFolkRolesWith("ROCKFALL").map(label);
  const boulders = iceFolkRolesWith("BOULDERS").map(label);
  const prowlers = iceFolkRolesWith("PROWL").map(label);
  const giants = iceFolkRolesWith("COLD_AURA").map(label);
  const stampeders = iceFolkRolesWith("STAMPEDE").map(label);
  return [
    [
      FROZEN_LABEL_V7,
      `a ${BOLAS_LABEL_V7}, a ${COLD_SNAP_LABEL_V7}, a ${FROST_BOLT_LABEL_V7}, a ${joinOr(giants)}'s ${COLD_AURA_LABEL_V7}, Frostbite, or Black Ice freezes an enemy: it cannot move or act on its owner's next turn, it does not strike back while Frozen, and it thaws at the end of that turn. It can be frozen again at once.`,
    ],
    [
      "Shatter",
      `an Ice Folk blow from an adjacent tile that leaves a Frozen unit at ${SHATTER_HP_V7} HP or less kills it, with no blow back, no Grave, and no explosion.`,
    ],
    [
      "Brittle",
      `with Brittle, Shatter happens at ${BRITTLE_SHATTER_HP_V7} HP or less.`,
    ],
    [
      "Snow",
      "Ice Folk land is Snow: Ice Folk units move at half cost from Snow to Snow and have light cover on it unless they are fortified, and other units stop on entering it, as in a Forest.",
    ],
    [
      "Blizzard",
      `the tiles around an ${joinOr(witches)} are Snow on any ground, and Ice Folk units there take half damage from ranged attacks.`,
    ],
    [
      COLD_SNAP_LABEL_V7,
      `an ${joinOr(witches)} freezes every hostile unit next to her.`,
    ],
    [
      FROST_BOLT_LABEL_V7,
      `instead, an ${joinOr(witches)} freezes one hostile unit up to ${numberWord(FROST_BOLT_RANGE_V7)} tiles away; she casts one of the two a turn.`,
    ],
    [
      BOLAS_LABEL_V7,
      `a ${joinOr(sledders)} freezes one hostile unit within ${BOLAS_RANGE_V7} tiles, without damage.`,
    ],
    [
      "Cold Blood",
      `a ${joinOr(hunters)} has +${half(COLD_BLOOD_BONUS2_V7)} Attack against a Frozen unit.`,
    ],
    [
      "Sweep and Trample",
      `a ${joinOr(sweepers)}'s attack also deals ${SWEEP_DAMAGE_V7} to the units on both sides of its target and flattens the Field Defense under it.`,
    ],
    [
      "Mountain-born",
      `${joinAnd(born)} cross Mountains without Engineering and without stopping.`,
    ],
    [
      "Rockfall",
      `a ${joinOr(rockfall)} on a Mountain can attack two tiles away at Attack ${half(ROCKFALL_ATTACK2_V7)}.`,
    ],
    [
      "Boulders",
      `a ${joinOr(boulders)}'s throw ignores Walls and Field Defense, and has +${half(PLANTED_BONUS2_V7)} Attack on a turn it has not moved.`,
    ],
    ["Prowl", `zones of control do not stop a ${joinOr(prowlers)}.`],
    [
      COLD_AURA_LABEL_V7,
      `a ${joinOr(giants)} freezes every hostile unit next to it when it ends its own Move.`,
    ],
    [
      STAMPEDE_LABEL_V7,
      `a ${joinOr(stampeders)} that has not moved charges up to ${numberWord(STAMPEDE_RANGE_V7)} tiles in a straight line; each enemy in its way takes ${STAMPEDE_DAMAGE_V7} and is shoved aside, and nobody strikes back.`,
    ],
    [
      "Deep Winter",
      `with Deep Winter, Snow spreads ${numberWord(DEEP_WINTER_RADIUS_V7)} tiles from Ice Folk city centers, and Ice Folk units recover ${DEEP_WINTER_RECOVER_V7} in their own territory.`,
    ],
    // The ninth unit (`pulp_wars-w49.17`, 7r55): the Musk Ox's Frostbite.
    ...ninthUnitHelpRulesV7("ICE_FOLK"),
  ];
}

export const ICE_FOLK_HELP_RULES_V7: readonly (readonly [string, string])[] =
  iceFolkHelpRulesV7();

// ---------------------------------------------------- abilities and labels

/** Ice Folk ability names; other factions' names are unchanged. */
export function iceFolkAbilityNameV7(
  ability: string,
  faction: FactionIdV7,
): string | null {
  if (faction !== "ICE_FOLK") return null;
  switch (ability) {
    case "MOUNTAIN_BORN":
      return "Mountain-born";
    case "ROCKFALL":
      return "Rockfall";
    case "BOLAS":
      return BOLAS_LABEL_V7;
    case "COLD_BLOOD":
      return "Cold Blood";
    case "SWEEP":
      return "Sweep";
    case "TRAMPLE":
      return "Trample";
    case "BLIZZARD":
      return BLIZZARD_LABEL_V7;
    case "COLD_SNAP":
      return COLD_SNAP_LABEL_V7;
    case "FROST_BOLT":
      return FROST_BOLT_LABEL_V7;
    case "STAMPEDE":
      return STAMPEDE_LABEL_V7;
    case "BOULDERS":
      return "Boulders";
    case "PROWL":
      return "Prowl";
    case "COLD_AURA":
      return COLD_AURA_LABEL_V7;
    default:
      return null;
  }
}

/** One-sentence descriptions of the Ice Folk abilities (unit information). */
export function iceFolkAbilityDescriptionV7(
  ability: string,
  faction: FactionIdV7,
): string | null {
  if (faction !== "ICE_FOLK") return null;
  switch (ability) {
    case "MOUNTAIN_BORN":
      return "Crosses Mountains without Engineering and without stopping.";
    case "ROCKFALL":
      return `On a Mountain it can attack two tiles away at Attack ${half(ROCKFALL_ATTACK2_V7)}.`;
    case "BOLAS":
      return BOLAS_TOOLTIP_V7;
    case "COLD_BLOOD":
      return `+${half(COLD_BLOOD_BONUS2_V7)} Attack against a Frozen unit.`;
    case "SWEEP":
      return `Its attack also deals ${SWEEP_DAMAGE_V7} to the hostile units on both sides of its target.`;
    case "TRAMPLE":
      return "Its attack flattens the Field Defense under its target.";
    case "BLIZZARD":
      return `The tiles within ${BLIZZARD_RADIUS_V7} of her are Snow on any ground; your units there take half damage from ranged attacks.`;
    case "COLD_SNAP":
      return COLD_SNAP_TOOLTIP_V7;
    case "FROST_BOLT":
      return FROST_BOLT_TOOLTIP_V7;
    case "STAMPEDE":
      return STAMPEDE_TOOLTIP_V7;
    case "BOULDERS":
      return `Its throw ignores Walls and Field Defense and has +${half(PLANTED_BONUS2_V7)} Attack on a turn it has not moved.`;
    case "PROWL":
      return `${SABRETOOTH_INFO_V7}.`;
    case "COLD_AURA":
      return "Freezes every hostile unit next to it when it ends its own Move.";
    case "CHARGE":
      return "With Raiding, +1 Attack on the first Attack after moving 2+ cells.";
    default:
      return null;
  }
}

/**
 * Ice Folk command labels: Bolas, Cold Snap, Frost Bolt and Stampede, for
 * every viewer.
 */
export function iceFolkCommandLabelV7(kind: CommandV7["kind"]): string | null {
  if (kind === "THROW_BOLAS") return BOLAS_LABEL_V7;
  if (kind === "COLD_SNAP") return COLD_SNAP_LABEL_V7;
  if (kind === "FROST_BOLT") return FROST_BOLT_LABEL_V7;
  if (kind === "STAMPEDE") return STAMPEDE_LABEL_V7;
  return null;
}

/** The Ice Folk names of the two unit rewards; null for every other reward. */
export function iceFolkRewardLabelV7(
  reward: string,
): readonly [string, string] | null {
  if (reward === "MILITIA")
    return ["Militia", `A free ${iceFolkLabelV7("FIGHTER")}`];
  if (reward === "JUGGERNAUT")
    return [iceFolkLabelV7("JUGGERNAUT"), "A giant unit"];
  return null;
}

/**
 * The technology unlock text of an Ice Folk role (section 4): "Train Ice
 * Witch (Blizzard, Cold Snap, Frost Bolt)", from the role's registered
 * abilities.
 */
export function iceFolkRoleUnlockTextV7(role: UnitRoleIdV7): string {
  const abilities = effectiveRoleRuleV7(role, "ICE_FOLK")
    .abilities as readonly string[];
  const notes = [
    ...(abilities.includes("BLIZZARD") ? [BLIZZARD_LABEL_V7] : []),
    ...(abilities.includes("COLD_SNAP") ? [COLD_SNAP_LABEL_V7] : []),
    ...(abilities.includes("FROST_BOLT") ? [FROST_BOLT_LABEL_V7] : []),
    ...(abilities.includes("BOLAS") ? [BOLAS_LABEL_V7] : []),
    ...(abilities.includes("COLD_BLOOD") ? ["Cold Blood"] : []),
    ...(abilities.includes("SWEEP") ? ["Sweep"] : []),
    ...(abilities.includes("TRAMPLE") ? ["Trample"] : []),
    ...(abilities.includes("STAMPEDE") ? [STAMPEDE_LABEL_V7] : []),
    ...(abilities.includes("COLD_AURA") ? [COLD_AURA_LABEL_V7] : []),
    ...(abilities.includes("BOULDERS")
      ? ["ignores Walls and Field Defense"]
      : []),
    ...(abilities.includes("PROWL") ? ["Prowl"] : []),
  ];
  const label = iceFolkLabelV7(role);
  return notes.length === 0
    ? `Train ${label}`
    : `Train ${label} (${notes.join(", ")})`;
}

/** The Ice Folk technology unlock texts of section 4. */
export const WITCH_SUPPORT_UNLOCK_TEXT_V7 = `${pluralLabel(iceFolkLabelV7("CAPTAIN"))} cast ${COLD_SNAP_LABEL_V7} on adjacent enemies, or a ${FROST_BOLT_LABEL_V7} up to ${numberWord(FROST_BOLT_RANGE_V7)} tiles away`;
export const DEEP_WINTER_UNLOCK_TEXT_V7 = `Snow spreads ${numberWord(DEEP_WINTER_RADIUS_V7)} tiles from your city centers; Recover heals ${DEEP_WINTER_RECOVER_V7} in your territory`;
export const BRITTLE_UNLOCK_TEXT_V7 = `Shatter at ${BRITTLE_SHATTER_HP_V7} HP or less`;

/** Recruit-help notes of an Ice Folk role, from its registration. */
export function iceFolkRecruitNotesV7(
  role: UnitRoleIdV7,
  faction: FactionIdV7,
): readonly string[] {
  if (faction !== "ICE_FOLK" || isNavalRoleV7(role)) return [];
  const mechanics = roleMechanicsV7(role, faction);
  return [
    ...(mechanics.mountainBorn ? [`${MOUNTAIN_BORN_INFO_V7}.`] : []),
    ...(mechanics.glides
      ? ["Moves at half cost from Snow to Snow."]
      : ["Never glides on Snow."]),
    ...(roleMechanicsV7(role, "ORIGINAL").buildsFieldDefense &&
    !mechanics.buildsFieldDefense
      ? [`${ICE_FOLK_FIELD_DEFENSE_EXPLANATION_V7}.`]
      : []),
  ];
}

/**
 * `pulp_wars-1wy.5`: what Snow does for an Ice Folk unit standing on it with
 * Snow cover: light cover (x 1.25) and, for a role that glides, the half
 * cost of a step from Snow onto Snow (never of a step off the Snow).
 */
export function snowChipTooltipV7(glides: boolean): string {
  return glides
    ? "On Snow: light cover here, and its steps from Snow to Snow cost half"
    : "On Snow: light cover here";
}

/** `pulp_wars-1wy.5`: the cursor description of a Move that glides. */
export const GLIDE_MOVE_LABEL_V7 = "Glide: Snow to Snow at half cost";

/** One line of Ice Folk unit information. */
export interface IceFolkUnitInfoLineV7 {
  readonly id:
    "frozen" | "threshold" | "snow" | "blizzard" | "rockfall" | "planted";
  readonly name: string;
  readonly description: string;
}

/**
 * Unit info lines that are not abilities: the unit's Frozen (any owner), and
 * for an Ice Folk unit its Shatter threshold, its Snow and Blizzard, a
 * Yeti's Rockfall reach and a Boulder Yeti's throw now.
 */
export function iceFolkUnitInfoLinesV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  stats: Pick<PublicUnitStatsV7, "iceFolk">,
): readonly IceFolkUnitInfoLineV7[] {
  const lines: IceFolkUnitInfoLineV7[] = [];
  const chip = frozenChipV7(view, unit);
  if (chip !== null) {
    // A Frozen unit is also Shatter-eligible (a JUGGERNAUT role never).
    const window = shatterWindowV7(view, unit);
    lines.push({
      id: "frozen",
      name: chip.label,
      description: `${chip.status}.${window === null ? "" : ` ${shatterWindowTextV7(window)}.`}`,
    });
  }
  const mechanics = stats.iceFolk;
  if (mechanics === undefined || unit.form !== "LAND") return lines;
  lines.push({
    id: "threshold",
    name: shatterThresholdTextV7(mechanics.shatterThreshold),
    description: `Its blows from an adjacent tile shatter a Frozen enemy left at ${mechanics.shatterThreshold} HP or less.`,
  });
  if (mechanics.inBlizzard)
    lines.push({
      id: "blizzard",
      name: BLIZZARD_LABEL_V7,
      description: `${BLIZZARD_TOOLTIP_V7}.`,
    });
  else if (mechanics.onSnow)
    lines.push({
      id: "snow",
      name: SNOW_LABEL_V7,
      description: mechanics.snowCover
        ? `${snowChipTooltipV7(mechanics.glides)}.`
        : "On Snow, but no Snow cover here.",
    });
  if (mechanics.rockfall)
    lines.push({
      id: "rockfall",
      name: "Rockfall",
      description: `On this Mountain it can attack two tiles away at Attack ${half(ROCKFALL_ATTACK2_V7)}.`,
    });
  if (mechanics.planted !== null)
    lines.push({
      id: "planted",
      name: boulderThrowTextV7(mechanics.planted),
      description: mechanics.planted
        ? "It has not moved this turn: its throw now has the Planted bonus."
        : "It moved this turn: its throw now has no Planted bonus.",
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

/** A visible unit's name under its kind's registration. */
function unitName(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "id" | "ownerId" | "role">,
): string {
  return unitRoleRuleV7(view, unit).label;
}

/** The Ice Folk lines of one attack preview (section 13.1). */
export interface IceFolkCombatLinesV7 {
  /** The defender shatters: "Shatters" replaces the damage lines. */
  readonly shatters: boolean;
  /** Notes of this target, in the order of section 13.2. */
  readonly notes: readonly string[];
  /** One entry per Sweep flank victim, from the preview's `splash`. */
  readonly sweep: readonly {
    readonly unitId: number;
    readonly at: { readonly x: number; readonly y: number };
    readonly damage: number;
    readonly dies: boolean;
    readonly text: string;
  }[];
}

/**
 * Section 13.1 "attack preview", for own and enemy attacks, from the public
 * combat preview only: "Shatters", "Won't strike back (Frozen)" for a
 * Frozen defender (Ice Folk Freeze; "Frozen" when it would not strike
 * back anyway and survives), the Sweep
 * flank victims with their damage, "Tramples Field Defense", "Ignores
 * fortification", "Rockfall", "Planted", "Cold Blood", "Snow cover",
 * "Blizzard: half damage", and "A hidden Blizzard may change this". Empty
 * for an exchange without any of them.
 */
export function iceFolkCombatLinesV7(
  view: PlayerViewV7,
  preview: CombatPreviewV7,
): IceFolkCombatLinesV7 {
  const notes: string[] = [];
  const attacker = view.units.find((unit) => unit.id === preview.attackerId);
  const defender = view.units.find((unit) => unit.id === preview.targetUnitId);
  if (preview.noRetaliationReason === "FROZEN")
    notes.push(FROZEN_NO_STRIKE_BACK_V7);
  else if (
    defender !== undefined &&
    !preview.shatters &&
    !preview.defenderDies &&
    frozenTurnsLeftV7(view, defender.id) !== null
  )
    notes.push(FROZEN_LABEL_V7);
  if (preview.rockfallApplied) notes.push(ROCKFALL_PREVIEW_V7);
  if (preview.plantedApplied) notes.push(PLANTED_PREVIEW_V7);
  if (preview.coldBloodApplied) notes.push(COLD_BLOOD_PREVIEW_V7);
  const boulders =
    attacker !== undefined &&
    attacker.form === "LAND" &&
    (unitRoleRuleV7(view, attacker).abilities as readonly string[]).includes(
      "BOULDERS",
    );
  if (boulders && preview.fortificationIgnored > 0)
    notes.push(BOULDERS_PREVIEW_V7);
  if (preview.snowCover) notes.push(SNOW_COVER_PREVIEW_V7);
  if (preview.blizzardHalved) notes.push(BLIZZARD_PREVIEW_V7);
  const sweep: IceFolkCombatLinesV7["sweep"][number][] = [];
  if (preview.sweep) {
    const tile =
      defender === undefined
        ? undefined
        : view.board.tiles.find(
            (candidate) =>
              candidate.at.x === defender.at.x &&
              candidate.at.y === defender.at.y,
          );
    if (tile?.explored === true && tile.fieldDefense)
      notes.push(TRAMPLE_PREVIEW_V7);
    for (const entry of preview.splash) {
      const victim = view.units.find((unit) => unit.id === entry.unitId);
      const name = victim === undefined ? "unit" : unitName(view, victim);
      const hit = entry.damage + entry.shieldDamage;
      const shield =
        entry.shieldDamage > 0 ? ` (Shield absorbs ${entry.shieldDamage})` : "";
      sweep.push({
        unitId: entry.unitId,
        at: entry.at,
        damage: hit,
        dies: entry.dies,
        text: `${sweepPreviewTextV7(name, hit)}${shield}${entry.dies ? ", lethal" : ""}`,
      });
    }
  }
  if (preview.hiddenBlizzardPossible) notes.push(HIDDEN_BLIZZARD_PREVIEW_V7);
  return { shatters: preview.shatters, notes, sweep };
}

// -------------------------------------------------------- ability previews

/**
 * The Bolas and Frost Bolt target hint (section 13.2): "Will be Frozen" (or
 * "Stays Frozen" for a target that is Frozen already), and "{unit} can then
 * shatter it" for the viewer's units whose offered attack would then
 * shatter the target.
 */
export function bolasPreviewLinesV7(
  view: PlayerViewV7,
  preview: BolasPreviewV7,
): readonly string[] {
  const setups = preview.shatterSetups.flatMap((unitId) => {
    const unit = view.units.find((candidate) => candidate.id === unitId);
    return unit === undefined ? [] : [unitName(view, unit)];
  });
  return [
    preview.alreadyFrozen ? STAYS_FROZEN_V7 : WILL_BE_FROZEN_V7,
    ...(setups.length === 0 ? [] : [canThenShatterTextV7(setups)]),
  ];
}

/** The short board label of a freeze target: "Freeze", or "Frozen" again. */
export function freezeTargetLabelV7(alreadyFrozen: boolean): string {
  return alreadyFrozen ? STAYS_FROZEN_V7 : "Freeze";
}

/** The Cold Snap summary: "Freezes 3 units" (every target is Frozen). */
export function coldSnapSummaryV7(preview: ColdSnapPreviewV7): string {
  return `Freezes ${plural(preview.targets.length, "unit")}`;
}

/** The Ice Folk ability commands with a button of their own. */
export type IceFolkAbilityKindV7 =
  "THROW_BOLAS" | "COLD_SNAP" | "FROST_BOLT" | "STAMPEDE";

/**
 * Why an own Sled, Witch or Mammoth that could still act has no Bolas, Cold
 * Snap, Frost Bolt or Stampede (section 13.2), or null when it has one or
 * cannot act at all.
 */
export function iceFolkAbilityUnavailableTextV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  kind: IceFolkAbilityKindV7,
  offered: boolean,
): string | null {
  if (offered) return null;
  if (
    unit.ownerId !== view.viewer.id ||
    unit.form !== "LAND" ||
    view.turnOrder[view.activeSeatIndex] !== view.viewer.id ||
    unit.activation.attacked ||
    unit.activation.specialActed ||
    unit.activation.recovered ||
    unit.activation.captured
  )
    return null;
  if (unitIsFrozenV7(view, unit)) return FROZEN_CANNOT_ACT_V7;
  if (unit.activation.handled) return null;
  switch (kind) {
    case "THROW_BOLAS":
      return BOLAS_NO_TARGET_V7;
    case "COLD_SNAP":
      return COLD_SNAP_NO_TARGET_V7;
    case "FROST_BOLT":
      return FROST_BOLT_NO_TARGET_V7;
    case "STAMPEDE":
      return unit.activation.moved ? STAMPEDE_MOVED_V7 : STAMPEDE_NO_LINE_V7;
  }
}

// ---------------------------------------------------------------- Stampede

/** One unit in the way of a previewed Stampede. */
export interface StampedeHitPlanV7 {
  readonly unitId: number;
  /** Its tile when the Mammoth reaches it. */
  readonly at: CoordV7;
  /** The fixed hit (with what a Shield absorbs). */
  readonly damage: number;
  readonly dies: boolean;
  /** The side tile it is shoved to; null when it dies or stays. */
  readonly shovedTo: CoordV7 | null;
  /** It survives and nothing can shove it: the Mammoth stops before it. */
  readonly blocks: boolean;
  readonly name: string;
}

/** A previewed Stampede of an own Mammoth toward one tile. */
export interface StampedePlanV7 {
  readonly unitId: number;
  readonly from: CoordV7;
  /** The chosen end of the line (the command's `at`). */
  readonly at: CoordV7;
  /** Every tile of the line, in order. */
  readonly line: readonly CoordV7[];
  /** The tiles the Mammoth enters, in order (a prefix of `line`). */
  readonly path: readonly CoordV7[];
  /** Where it ends: the last tile entered, or its own tile. */
  readonly end: CoordV7;
  /** It stops before `at` (a unit it cannot shove, or a rising). */
  readonly stopped: boolean;
  readonly hits: readonly StampedeHitPlanV7[];
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

/**
 * Section 21.18: the Stampede of an offered `STAMPEDE` as the viewer knows
 * it. The line and the fixed hits are the engine's public preview
 * (`previewStampedeV7`); the shoves and the stop are walked here with the
 * Push rule on what the viewer sees (the first explored, free, enterable
 * side tile, clockwise of the charge first, that is no settlement center,
 * holds no chest, and is not in territory allied to the victim; a neutral
 * unit, an Egg, an immovable unit is never shoved). Another seat's
 * Engineering is private, so a Mountain counts as closed to a foreign unit
 * that is not Mountain-born. Null unless that Stampede is offered.
 */
export function stampedePlanV7(
  view: PlayerViewV7,
  unitId: UnitId,
  at: CoordV7,
): StampedePlanV7 | null {
  const preview = previewStampedeV7(view, unitId, at);
  const mammoth = view.units.find((unit) => unit.id === unitId);
  if (preview === null || mammoth === undefined) return null;
  const first = preview.path[0];
  if (first === undefined) return null;
  const dx = Math.sign(first.x - mammoth.at.x);
  const dy = Math.sign(first.y - mammoth.at.y);
  let units: PublicUnitV7[] = [...view.units];
  const path: CoordV7[] = [];
  const hits: StampedeHitPlanV7[] = [];
  let stopped = false;
  const tileAt = (where: CoordV7) =>
    where.x < 0 ||
    where.y < 0 ||
    where.x >= view.board.width ||
    where.y >= view.board.height
      ? undefined
      : view.board.tiles[where.y * view.board.width + where.x];
  const shoveTo = (victim: PublicUnitV7, from: CoordV7): CoordV7 | null => {
    if (
      victim.form !== "LAND" ||
      isNeutralOwnerV7(victim.ownerId) ||
      unitIsImmovableV7(view, victim)
    )
      return null;
    const own = victim.ownerId === view.viewer.id;
    const techs = own ? view.viewer.researchedTechs : [];
    for (const side of [
      { x: from.x - dy, y: from.y + dx },
      { x: from.x + dy, y: from.y - dx },
    ]) {
      const tile = tileAt(side);
      if (
        tile === undefined ||
        !tile.explored ||
        tile.site !== null ||
        view.treasureChests.some((chest) => same(chest, side)) ||
        tileOccupiedV7({ ...view, units }, side, victim.id) ||
        (tile.territoryOwnerId !== null &&
          allied(view, victim.ownerId, tile.territoryOwnerId)) ||
        !canEnterTerrainV7({
          terrain: tile.terrain,
          movementMode: unitMovementModeV7(view, victim),
          afloat: false,
          ice: isIceAtV7(view, side),
          engineering: techs.includes("ENGINEERING"),
          navigation: techs.includes("NAVIGATION"),
          mountainBorn: unitIsMountainBornV7(view, victim),
        })
      )
        continue;
      return side;
    }
    return null;
  };
  for (const step of preview.path) {
    const occupant = units.find(
      (unit) => unit.id !== mammoth.id && same(unit.at, step),
    );
    if (occupant !== undefined) {
      const hit = preview.hits.find((entry) => entry.unitId === occupant.id);
      if (hit === undefined) {
        stopped = true;
        break;
      }
      const damage = hit.damage + hit.shieldDamage;
      const name = unitName(view, occupant);
      if (hit.dies) {
        hits.push({
          unitId: occupant.id,
          at: step,
          damage,
          dies: true,
          shovedTo: null,
          blocks: false,
          name,
        });
        // A Bitten victim rises on its tile: the Mammoth stops before it.
        if (view.bitten.some((entry) => entry.unitId === occupant.id)) {
          stopped = true;
          break;
        }
        units = units.filter((unit) => unit.id !== occupant.id);
      } else {
        const side = shoveTo(occupant, step);
        hits.push({
          unitId: occupant.id,
          at: step,
          damage,
          dies: false,
          shovedTo: side,
          blocks: side === null,
          name,
        });
        if (side === null) {
          stopped = true;
          break;
        }
        units = units.map((unit) =>
          unit.id === occupant.id ? { ...unit, at: side } : unit,
        );
      }
    }
    path.push(step);
  }
  return {
    unitId,
    from: mammoth.at,
    at: preview.at,
    line: preview.path,
    path,
    end: path.at(-1) ?? mammoth.at,
    stopped,
    hits,
  };
}

/** The board label of a Stampede's end tile: "Stampede · hits 2". */
export function stampedeLabelV7(plan: StampedePlanV7): string {
  return plan.hits.length === 0
    ? STAMPEDE_LABEL_V7
    : `${STAMPEDE_LABEL_V7} · hits ${plan.hits.length}`;
}

/**
 * The words of a previewed Stampede: where it ends, each hit with its
 * damage and its shove or kill, and the stop.
 */
export function stampedeSemanticV7(plan: StampedePlanV7): string {
  const moved = plan.path.length;
  const parts = [
    moved === 0
      ? `${STAMPEDE_LABEL_V7}: it cannot get past the first tile`
      : `${STAMPEDE_LABEL_V7}: charges ${plural(moved, "tile")}`,
    ...plan.hits.map((hit) =>
      hit.dies
        ? `${hit.name} takes ${hit.damage} and dies`
        : hit.blocks
          ? `${hit.name} takes ${hit.damage}, cannot be shoved and stops the charge`
          : `${hit.name} takes ${hit.damage} and is shoved aside`,
    ),
    ...(plan.stopped && !plan.hits.some((hit) => hit.blocks)
      ? ["It stops early"]
      : []),
    "No strike-back",
  ];
  return `${parts.join(". ")}.`;
}

// --------------------------------------------------------------- Cold Aura

/**
 * Section 21.12: the visible units an offered Move of an own land-form
 * Frost Giant would freeze (every unit its owner can freeze on the eight
 * tiles around the Move's last tile), in unit-ID order. Empty for every
 * other Move.
 */
export function coldAuraMoveTargetsV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { kind: "MOVE" }>,
): readonly PublicUnitV7[] {
  const giant = view.units.find((unit) => unit.id === command.unitId);
  const to = command.path.at(-1);
  if (
    giant === undefined ||
    to === undefined ||
    giant.form !== "LAND" ||
    !(unitRoleRuleV7(view, giant).abilities as readonly string[]).includes(
      "COLD_AURA",
    )
  )
    return [];
  return view.units.filter(
    (unit) =>
      unit.id !== giant.id &&
      Math.max(Math.abs(unit.at.x - to.x), Math.abs(unit.at.y - to.y)) === 1 &&
      canBeFrozenV7(view, giant.ownerId, unit),
  );
}

/** "Cold Aura: freezes 2 units" for a Frost Giant's Move. */
export function coldAuraMoveLabelV7(count: number): string {
  return `${COLD_AURA_LABEL_V7}: freezes ${plural(count, "unit")}`;
}

// ----------------------------------------------------------------- Glacier

/**
 * The frozen sea, Glacier (section 21.16): whether an offered Move of an
 * own land-form Ice Folk unit reaches its tile only by Glacier's +1 Move
 * across ice: the tile is farther than the unit's Move, the Move's path
 * enters an ice tile the viewer knows, and the path costs more than the
 * unit's own Move (the engine's public path validation). The distance test
 * keeps a tile the unit reaches anyway unmarked when the offered path
 * happens to step on the ice on its way.
 */
export function moveUsesGlacierV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { kind: "MOVE" }>,
): boolean {
  if (view.ice.length === 0) return false;
  const unit = view.units.find((candidate) => candidate.id === command.unitId);
  const to = command.path.at(-1);
  if (
    unit === undefined ||
    to === undefined ||
    unit.ownerId !== view.viewer.id ||
    unit.form !== "LAND" ||
    unitFactionV7(view, unit) !== "ICE_FOLK" ||
    !unitCapabilitiesV7(view, unit, view.viewer.researchedTechs).iceCover ||
    !command.path.some((at) => isIceAtV7(view, at))
  )
    return false;
  const move = unitRoleRuleV7(view, unit).move;
  if (Math.max(Math.abs(to.x - unit.at.x), Math.abs(to.y - unit.at.y)) <= move)
    return false;
  const result = validatePlayerMovementPathV7(view, unit, command.path);
  return result.legal && result.spentPoints2 > move * 2;
}

// ------------------------------------------------------------- log lines

/**
 * Section 13.2 log lines of one projected boundary: every freeze (Bolas,
 * Cold Snap, Frost Bolt, Cold Aura, Frostbite, Black Ice, shards), a
 * Stampede, a Shatter, and a Trample. A match without an Ice Folk seat
 * never emits these events, so its notices are unchanged.
 */
export function iceFolkBoundaryNoticeV7(
  events: readonly PlayerEventV7[],
  before: PlayerViewV7,
  after: PlayerViewV7,
): { readonly text: string; readonly toast: boolean } | null {
  if (!matchHasIceFolkSeatV7(after)) return null;
  const viewerId = after.viewer.id;
  const parts: string[] = [];
  let toast = false;
  const unitById = (id: number): PublicUnitV7 | undefined =>
    before.units.find((unit) => unit.id === id) ??
    after.units.find((unit) => unit.id === id);
  const owner = (playerId: number): string =>
    capitalized(possessive(after, playerId));
  let sweeper: PublicUnitV7 | undefined;
  for (const event of events) {
    if (event.kind === "UNITS_FROZEN") {
      if (event.results.length === 0) continue;
      const targetsViewer = event.results.some(
        (result) => unitById(result.unitId)?.ownerId === viewerId,
      );
      if (event.playerId === viewerId || targetsViewer) toast = true;
      const source =
        event.sourceUnitId === null ? undefined : unitById(event.sourceUnitId);
      const sourceName = (fallback: UnitRoleIdV7): string =>
        source === undefined
          ? iceFolkLabelV7(fallback)
          : unitName(after, source);
      const target = unitById(event.results[0]?.unitId ?? -1);
      const what =
        event.results.length === 1
          ? `a ${target === undefined ? "unit" : unitName(after, target)}`
          : plural(event.results.length, "unit");
      const who = owner(event.playerId);
      switch (event.source) {
        case "BOLAS":
          parts.push(`${who} ${sourceName("RAIDER")} froze ${what}`);
          break;
        case "COLD_SNAP":
          parts.push(
            `${who} ${sourceName("CAPTAIN")}'s ${COLD_SNAP_LABEL_V7} froze ${what}`,
          );
          break;
        case "FROST_BOLT":
          parts.push(
            `${who} ${sourceName("CAPTAIN")}'s ${FROST_BOLT_LABEL_V7} froze ${what}`,
          );
          break;
        case "FROSTBITE":
          parts.push(`${who} ${sourceName("GUARD")}'s Frostbite froze ${what}`);
          break;
        case "BLACK_ICE":
          parts.push(`${who} Black Ice froze ${what}`);
          break;
        case "SHARDS":
          parts.push(
            `${who} ${sourceName("JUGGERNAUT")}'s ice shards froze ${what}`,
          );
          break;
        default:
          parts.push(`${who} ${sourceName("JUGGERNAUT")} froze ${what}`);
      }
    } else if (event.kind === "COMBAT_RESOLVED") {
      const attacker = unitById(event.preview.attackerId);
      if (event.preview.sweep) sweeper = attacker;
      if (!event.preview.shatters || attacker === undefined) continue;
      const defender = unitById(event.preview.targetUnitId);
      toast = true;
      parts.push(
        `${owner(attacker.ownerId)} ${unitName(after, attacker)} shattered a ${defender === undefined ? "unit" : unitName(after, defender)}`,
      );
    } else if (event.kind === "MAMMOTH_STAMPEDED") {
      // Ice Folk Freeze: the Mammoth's charge, its hits and its kills.
      const mammoth = unitById(event.unitId);
      const hitsViewer = event.results.some(
        (result) => unitById(result.unitId)?.ownerId === viewerId,
      );
      if (event.playerId === viewerId || hitsViewer) toast = true;
      const killed = event.results.filter((result) => result.dies).length;
      const name =
        mammoth === undefined
          ? iceFolkLabelV7("SWORDSMAN")
          : unitName(after, mammoth);
      parts.push(
        `${owner(event.playerId)} ${name} stampeded${event.results.length === 0 ? "" : `: ${plural(event.results.length, "unit")} hit${killed === 0 ? "" : `, ${killed} killed`}`}`,
      );
    } else if (
      event.kind === "FIELD_DEFENSE_DESTROYED" &&
      event.reason === "TRAMPLE"
    ) {
      parts.push(
        sweeper === undefined
          ? // The ninth unit (7r55): the Mammoth is the heavy line role.
            `${capitalized(iceFolkLabelV7("SWORDSMAN"))} trampled Field Defense`
          : `${owner(sweeper.ownerId)} ${iceFolkLabelV7("SWORDSMAN")} trampled Field Defense`,
      );
    }
  }
  return parts.length === 0 ? null : { text: parts.join(" · "), toast };
}

const FIELD_DEFENSE_BLOCK_CACHE = new WeakMap<PlayerViewV7, Set<number>>();

/**
 * Section 13.2 "Field Defense unavailable": an own Yeti or Mammoth where a
 * Human Fighter or Guard would be offered Build Field Defense
 * (Fortification, own territory land tile, not moved, primary action
 * unused, no Field Defense yet, 3 Coins). An Ice Folk viewer's
 * Fortification is Deep Winter, so this explains the gap.
 */
export function iceFolkFieldDefenseBlockedV7(
  view: PlayerViewV7,
  unitId: number,
): boolean {
  if (view.viewer.faction !== "ICE_FOLK") return false;
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
            roleMechanicsV7(candidate.role, "ORIGINAL").buildsFieldDefense &&
            !roleMechanicsV7(candidate.role, "ICE_FOLK").buildsFieldDefense &&
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

/** Section 13.2 Snow and Blizzard tile tooltips, for the viewer's faction. */
export function snowTooltipV7(view: Pick<PlayerViewV7, "viewer">): string {
  return view.viewer.faction === "ICE_FOLK"
    ? SNOW_TOOLTIP_ICE_FOLK_V7
    : SNOW_TOOLTIP_OTHERS_V7;
}
