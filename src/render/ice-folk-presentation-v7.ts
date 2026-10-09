import {
  BLIZZARD_RADIUS_V7,
  BOLAS_RANGE_V7,
  BRITTLE_SHATTER_HP_V7,
  COLD_BLOOD_BONUS2_V7,
  COLD_SNAP_RANGE_V7,
  DEEP_WINTER_RADIUS_V7,
  DEEP_WINTER_RECOVER_V7,
  PLANTED_BONUS2_V7,
  ROCKFALL_ATTACK2_V7,
  SHATTER_HP_V7,
  SWEEP_DAMAGE_V7,
  UNIT_ROLE_IDS_V7,
  effectiveRoleRuleV7,
  unitFactionV7,
  roleMechanicsV7,
  sluggishUnitMovedV7,
  technologyCapabilitiesV7,
  unitRoleRuleV7,
  type BolasPreviewV7,
  type ColdSnapPreviewV7,
  type CombatPreviewV7,
  type CommandV7,
  type FactionIdV7,
  type PlayerEventV7,
  type PlayerViewV7,
  type PublicIceFolkMechanicsV7,
  type PublicUnitStatsV7,
  isNavalRoleV7,
  type UnitRoleIdV7,
} from "../engine/index";
import { ninthUnitHelpRulesV7 } from "./ninth-unit-presentation-v7";

/**
 * Presentation helpers for the Ice Folk faction (docs/product/
 * RULESET_7_ICE_FOLK.md section 13, bead pulp_wars-7g3.6). Every helper reads
 * only the public view (`chilled`, the tile flags `snow` and `blizzard`),
 * the public unit stats' `chill` and `iceFolk` blocks, the public previews
 * (`previewBolasV7`, `previewColdSnapV7`, `queryCombatPreviewV7`) and
 * projected player events. Every number in a sentence comes from the
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
export const FROSTED_LABEL_V7 = "Frosted";
export const THAWING_LABEL_V7 = "Thawing";
export const FROZEN_STATUS_V7 = "Frozen: move or act, not both";
/** "Frosted: an Ice Folk blow that leaves it at {n} HP or less shatters it". */
export function frostedStatusTextV7(threshold: number): string {
  return `Frosted: an Ice Folk blow that leaves it at ${threshold} HP or less shatters it`;
}
export const THAWING_STATUS_V7 =
  "Thawing: frost will not slow it again this turn";
export const FROZEN_MOVED_V7 = "Frozen: it moved, so it cannot act this turn";
export const SHATTERS_PREVIEW_V7 = "Shatters";
export const CHILLED_PREVIEW_V7 = "Chilled";
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
export const BOLAS_TOOLTIP_V7 = `Chill a hostile unit within ${BOLAS_RANGE_V7} tiles. No damage.`;
export const BOLAS_PICK_V7 = "Choose a unit to chill";
export const WILL_BE_FROZEN_V7 = "Will be Frozen";
export const WILL_BE_FROSTED_V7 = "Will be Frosted";
/** "{unit} can then shatter it". */
export function canThenShatterTextV7(units: readonly string[]): string {
  return `${joinAnd(units)} can then shatter it`;
}
export const BOLAS_NO_TARGET_V7 = `No enemy within ${BOLAS_RANGE_V7} tiles`;
export const FROZEN_IT_MOVED_V7 = "Frozen: it moved";
export const COLD_SNAP_LABEL_V7 = "Cold Snap";
export const COLD_SNAP_TOOLTIP_V7 = `Chill every hostile unit within ${COLD_SNAP_RANGE_V7} tiles.`;
export const COLD_SNAP_NO_TARGET_V7 = `No enemy within ${COLD_SNAP_RANGE_V7} tiles`;
export const COLD_SNAP_CAST_V7 = "Cast Cold Snap";
export const SABRETOOTH_INFO_V7 = "Prowl: zones of control do not stop it";
export const MOUNTAIN_BORN_INFO_V7 =
  "Mountain-born: crosses Mountains without Engineering";
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

// ------------------------------------------------------------ Chill state

/** The board and dock state of a unit's Chill entry. */
export type ChillStateV7 = "FROZEN" | "FROSTED" | "THAWING";

/**
 * Section 13.1 "Chill markers": Frozen (`sluggish`), Frosted (Chilled, not
 * sluggish), Thawing (`turnsLeft` 0), or null without an entry.
 */
export function chillStateV7(
  view: Pick<PlayerViewV7, "chilled">,
  unitId: number,
): ChillStateV7 | null {
  if (view.chilled.length === 0) return null;
  const entry = view.chilled.find((candidate) => candidate.unitId === unitId);
  if (entry === undefined) return null;
  if (entry.sluggish) return "FROZEN";
  return entry.turnsLeft >= 1 ? "FROSTED" : "THAWING";
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
 * Section 13.1 "Shatter window on HP bars": the lowest HP of a Chilled
 * unit's bar that an Ice Folk blow would shatter, or null (not Chilled, not
 * in land form, a `JUGGERNAUT` role, or no hostile Ice Folk seat).
 */
export function shatterWindowV7(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "id" | "ownerId" | "form" | "role">,
): number | null {
  const state = chillStateV7(view, unit.id);
  if (state !== "FROZEN" && state !== "FROSTED") return null;
  if (unit.form !== "LAND" || unit.role === "JUGGERNAUT") return null;
  return shatterThresholdAgainstV7(view, unit.ownerId);
}

/**
 * The chill chip of a unit's dock: its label and its one-sentence status
 * (section 13.2), or null without a Chill entry.
 */
export function chillChipV7(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "id" | "ownerId" | "form" | "role">,
): {
  readonly state: ChillStateV7;
  readonly label: string;
  readonly status: string;
} | null {
  const state = chillStateV7(view, unit.id);
  if (state === null) return null;
  if (state === "FROZEN")
    return { state, label: FROZEN_LABEL_V7, status: FROZEN_STATUS_V7 };
  if (state === "THAWING")
    return { state, label: THAWING_LABEL_V7, status: THAWING_STATUS_V7 };
  const threshold =
    shatterThresholdAgainstV7(view, unit.ownerId) ?? SHATTER_HP_V7;
  return {
    state,
    label: FROSTED_LABEL_V7,
    status:
      unit.role === "JUGGERNAUT"
        ? "Frosted: it never shatters, but frost keeps it slow on arrival"
        : frostedStatusTextV7(threshold),
  };
}

/** Section 13.1 "sluggish actions": an own Frozen unit that has moved. */
export function frozenAfterMoveV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return (
    unit.ownerId === view.viewer.id &&
    unit.form === "LAND" &&
    sluggishUnitMovedV7(view, unit) &&
    !unit.activation.attacked &&
    !unit.activation.specialActed
  );
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
  return [
    [
      "Chill",
      `a ${BOLAS_LABEL_V7}, a ${COLD_SNAP_LABEL_V7}, or a ${joinOr(giants)}'s aura frosts a unit; on its first frozen turn it may move or act, not both, and frost that is kept up does not slow it again.`,
    ],
    [
      "Shatter",
      `an Ice Folk blow from an adjacent tile that leaves a frosted unit at ${SHATTER_HP_V7} HP or less kills it, with no blow back, no Grave, and no explosion.`,
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
      `an ${joinOr(witches)} chills every hostile unit within ${COLD_SNAP_RANGE_V7} tiles.`,
    ],
    [
      BOLAS_LABEL_V7,
      `a ${joinOr(sledders)} chills one hostile unit within ${BOLAS_RANGE_V7} tiles, without damage.`,
    ],
    [
      "Cold Blood",
      `a ${joinOr(hunters)} has +${half(COLD_BLOOD_BONUS2_V7)} Attack against a frosted unit.`,
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
      "Cold Aura",
      `a ${joinOr(giants)} frosts every hostile unit next to it at the start of its owner's turn.`,
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
    case "BOULDERS":
      return "Boulders";
    case "PROWL":
      return "Prowl";
    case "COLD_AURA":
      return "Cold Aura";
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
      return `+${half(COLD_BLOOD_BONUS2_V7)} Attack against a frosted unit.`;
    case "SWEEP":
      return `Its attack also deals ${SWEEP_DAMAGE_V7} to the hostile units on both sides of its target.`;
    case "TRAMPLE":
      return "Its attack flattens the Field Defense under its target.";
    case "BLIZZARD":
      return `The tiles within ${BLIZZARD_RADIUS_V7} of her are Snow on any ground; your units there take half damage from ranged attacks.`;
    case "COLD_SNAP":
      return COLD_SNAP_TOOLTIP_V7;
    case "BOULDERS":
      return `Its throw ignores Walls and Field Defense and has +${half(PLANTED_BONUS2_V7)} Attack on a turn it has not moved.`;
    case "PROWL":
      return `${SABRETOOTH_INFO_V7}.`;
    case "COLD_AURA":
      return "Frosts every hostile unit next to it at the start of your turn.";
    case "CHARGE":
      return "With Raiding, +1 Attack on the first Attack after moving 2+ cells.";
    default:
      return null;
  }
}

/** Ice Folk command labels: Bolas and Cold Snap, for every viewer. */
export function iceFolkCommandLabelV7(kind: CommandV7["kind"]): string | null {
  if (kind === "THROW_BOLAS") return BOLAS_LABEL_V7;
  if (kind === "COLD_SNAP") return COLD_SNAP_LABEL_V7;
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
 * Witch (Blizzard, Cold Snap)", from the role's registered abilities.
 */
export function iceFolkRoleUnlockTextV7(role: UnitRoleIdV7): string {
  const abilities = effectiveRoleRuleV7(role, "ICE_FOLK")
    .abilities as readonly string[];
  const notes = [
    ...(abilities.includes("BLIZZARD") ? [BLIZZARD_LABEL_V7] : []),
    ...(abilities.includes("COLD_SNAP") ? [COLD_SNAP_LABEL_V7] : []),
    ...(abilities.includes("BOLAS") ? [BOLAS_LABEL_V7] : []),
    ...(abilities.includes("COLD_BLOOD") ? ["Cold Blood"] : []),
    ...(abilities.includes("SWEEP") ? ["Sweep"] : []),
    ...(abilities.includes("TRAMPLE") ? ["Trample"] : []),
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
export const WITCH_SUPPORT_UNLOCK_TEXT_V7 = `${pluralLabel(iceFolkLabelV7("CAPTAIN"))} cast ${COLD_SNAP_LABEL_V7} on enemies within ${COLD_SNAP_RANGE_V7} tiles`;
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
    "chill" | "threshold" | "snow" | "blizzard" | "rockfall" | "planted";
  readonly name: string;
  readonly description: string;
}

/**
 * Unit info lines that are not abilities: the unit's Chill (any owner), and
 * for an Ice Folk unit its Shatter threshold, its Snow and Blizzard, a
 * Yeti's Rockfall reach and a Boulder Yeti's throw now.
 */
export function iceFolkUnitInfoLinesV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  stats: Pick<PublicUnitStatsV7, "iceFolk">,
): readonly IceFolkUnitInfoLineV7[] {
  const lines: IceFolkUnitInfoLineV7[] = [];
  const chip = chillChipV7(view, unit);
  if (chip !== null)
    lines.push({
      id: "chill",
      name: chip.label,
      description:
        // A Frozen unit is also Shatter-eligible (a JUGGERNAUT role never).
        chip.state === "FROZEN" && unit.role !== "JUGGERNAUT"
          ? `${FROZEN_STATUS_V7}. ${frostedStatusTextV7(shatterThresholdAgainstV7(view, unit.ownerId) ?? SHATTER_HP_V7)}.`
          : `${chip.status}.`,
    });
  const mechanics = stats.iceFolk;
  if (mechanics === undefined || unit.form !== "LAND") return lines;
  lines.push({
    id: "threshold",
    name: shatterThresholdTextV7(mechanics.shatterThreshold),
    description: `Its blows from an adjacent tile shatter a frosted enemy left at ${mechanics.shatterThreshold} HP or less.`,
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
 * combat preview only: "Shatters", "Chilled" on the defender, the Sweep
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
  const defenderState =
    defender === undefined ? null : chillStateV7(view, defender.id);
  if (defenderState === "FROZEN" || defenderState === "FROSTED")
    notes.push(CHILLED_PREVIEW_V7);
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
 * The Bolas target hint (section 13.2): "Will be Frozen" or "Will be
 * Frosted", and "{unit} can then shatter it" for the viewer's units whose
 * offered attack would then shatter the target.
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
    preview.becomesSluggish ? WILL_BE_FROZEN_V7 : WILL_BE_FROSTED_V7,
    ...(setups.length === 0 ? [] : [canThenShatterTextV7(setups)]),
  ];
}

/** The short board label of a Bolas or Cold Snap target. */
export function chillTargetLabelV7(becomesSluggish: boolean): string {
  return becomesSluggish ? FROZEN_LABEL_V7 : FROSTED_LABEL_V7;
}

/** The Cold Snap summary: "Chills 3 units: 2 Frozen, 1 Frosted". */
export function coldSnapSummaryV7(preview: ColdSnapPreviewV7): string {
  const frozen = preview.targets.filter((target) => target.becomesSluggish);
  const frosted = preview.targets.length - frozen.length;
  const parts = [
    ...(frozen.length > 0 ? [`${frozen.length} Frozen`] : []),
    ...(frosted > 0 ? [`${frosted} Frosted`] : []),
  ];
  return `Chills ${plural(preview.targets.length, "unit")}: ${parts.join(", ")}`;
}

/**
 * Why an own Sled or Witch that could still act has no Bolas or Cold Snap
 * (section 13.2), or null when it has one or cannot act at all.
 */
export function iceFolkAbilityUnavailableTextV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  kind: "THROW_BOLAS" | "COLD_SNAP",
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
  if (sluggishUnitMovedV7(view, unit)) return FROZEN_IT_MOVED_V7;
  if (unit.activation.handled) return null;
  return kind === "THROW_BOLAS" ? BOLAS_NO_TARGET_V7 : COLD_SNAP_NO_TARGET_V7;
}

// ------------------------------------------------------------- log lines

/**
 * Section 13.2 log lines of one projected boundary: a Bolas, a Cold Snap, a
 * Cold Aura, a Shatter, and a Trample. A match without an Ice Folk seat
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
    if (event.kind === "UNITS_CHILLED") {
      if (event.results.length === 0) continue;
      const targetsViewer = event.results.some(
        (result) => unitById(result.unitId)?.ownerId === viewerId,
      );
      if (event.playerId === viewerId || targetsViewer) toast = true;
      if (event.source === "BOLAS") {
        const target = unitById(event.results[0]?.unitId ?? -1);
        parts.push(
          `${owner(event.playerId)} ${iceFolkLabelV7("RAIDER")} chilled a ${target === undefined ? "unit" : unitName(after, target)}`,
        );
      } else
        parts.push(
          `${owner(event.playerId)} ${iceFolkLabelV7(event.source === "COLD_SNAP" ? "CAPTAIN" : "JUGGERNAUT")} chilled ${event.results.length} unit${event.results.length === 1 ? "" : "s"}`,
        );
    } else if (event.kind === "COMBAT_RESOLVED") {
      const attacker = unitById(event.preview.attackerId);
      if (event.preview.sweep) sweeper = attacker;
      if (!event.preview.shatters || attacker === undefined) continue;
      const defender = unitById(event.preview.targetUnitId);
      toast = true;
      parts.push(
        `${owner(attacker.ownerId)} ${unitName(after, attacker)} shattered a ${defender === undefined ? "unit" : unitName(after, defender)}`,
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
