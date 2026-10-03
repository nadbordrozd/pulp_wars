import {
  ASSEMBLE_COST_V7,
  BLASTING_ERUPTION_DAMAGE_V7,
  BOMB_DAMAGE_V7,
  BOMB_RANGE_V7,
  DIVE_BOMB_DAMAGE_V7,
  ERUPTION_DAMAGE_V7,
  GUNNER_UNMOVED_SHOTS_V7,
  PLATED_CAP_V7,
  REPAIR_MACHINE_V7,
  TUNNEL_RANGE_V7,
  UNIT_ROLE_IDS_V7,
  effectiveRoleRuleV7,
  knockbackDestinationV7,
  unitFactionV7,
  roleMechanicsV7,
  sluggishUnitMovedV7,
  technologyCapabilitiesV7,
  unitRoleRuleV7,
  type AssemblePreviewV7,
  type BombRunPreviewV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type PlayerEventV7,
  type PlayerViewV7,
  type PublicBurrowedEntryV7,
  type PublicDwarfMechanicsV7,
  type PublicUnitStatsV7,
  type TunnelPreviewV7,
  type UnitRoleIdV7,
} from "../engine/index";

/**
 * Presentation helpers for the Steampunk Dwarf faction (docs/product/
 * RULESET_7_DWARVES.md section 16, bead pulp_wars-78i.6). Every helper reads
 * only the public view (`burrowed`, `surfacedThisTurn`, `bombedThisTurn`),
 * the public unit stats' `dwarf` block and per-turn flags, the public
 * previews (`previewTunnelV7`, `previewBombRunV7`, `previewAssembleV7`,
 * `queryAssembleUnavailableReasonV7`, `queryCombatPreviewV7`) and projected
 * player events. Every number in a sentence comes from the registry or the
 * engine constants, so the balance bead (pulp_wars-78i.7) can retune them
 * without a text going stale. A match without a Dwarf seat never reaches a
 * code path that changes its presentation.
 */

type PublicUnitV7 = PlayerViewV7["units"][number];

/** True exactly when a seat of the match plays the Dwarves. */
export function matchHasDwarfSeatV7(
  view: Pick<PlayerViewV7, "players">,
): boolean {
  return view.players.some((player) => player.faction === "DWARF");
}

/** Whether a visible unit is of the Dwarf kind (`unitFactionV7`). */
export function unitIsDwarfV7(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "id" | "ownerId">,
): boolean {
  return unitFactionV7(view, unit) === "DWARF";
}

/** A Dwarf role's label under the Dwarf registration. */
export const dwarfLabelV7 = (role: UnitRoleIdV7): string =>
  effectiveRoleRuleV7(role, "DWARF").label;

/** The Dwarf roles whose registration has `ability`, in role order. */
function dwarfRolesWith(ability: string): readonly UnitRoleIdV7[] {
  return UNIT_ROLE_IDS_V7.filter((role) =>
    (
      effectiveRoleRuleV7(role, "DWARF").abilities as readonly string[]
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

function plural(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Clockwork Gunner" → "Clockwork Gunners", "Brass Titan" → "Brass Titans". */
function pluralLabel(label: string): string {
  return /(?:ch|sh|s|x)$/.test(label) ? `${label}es` : `${label}s`;
}

/** "an" before a vowel sound, else "a". */
function article(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

const MOLE = (): string => dwarfLabelV7("GUARD");
const HAMMERER = (): string => dwarfLabelV7("FIGHTER");
const GYROCOPTER = (): string => dwarfLabelV7("RAIDER");
const GUNNER = (): string => dwarfLabelV7("MARKSMAN");
const ENGINEER = (): string => dwarfLabelV7("CAPTAIN");
const CANNON = (): string => dwarfLabelV7("CATAPULT");
const TANK = (): string => dwarfLabelV7("KNIGHT");

// ------------------------------------------------------------ section 16.2

export const TUNNEL_LABEL_V7 = "Tunnel";
/** "Dig up to 3 tiles under anything. Enemies next to the Mole take {n} …". */
export function tunnelTooltipV7(eruptionDamage: number): string {
  return `Dig up to ${TUNNEL_RANGE_V7} tiles under anything. Enemies next to the Mole take ${eruptionDamage} when it surfaces`;
}
export const TUNNEL_PICK_V7 = "Choose where the Mole surfaces";
/**
 * The Tunnel's caveat (bead pulp_wars-b5f.8: only in the `?` info button,
 * never as body text).
 */
export const TUNNEL_FORECAST_V7 =
  "Damage is a forecast: enemies may move before the Mole surfaces";
/** The `?` info of the Tunnel's first stage: the instruction and caveat. */
export const TUNNEL_PICK_INFO_V7 = `${TUNNEL_PICK_V7}. Tap a Hammerer to seat or unseat it. ${TUNNEL_FORECAST_V7}`;
export const TUNNEL_ALONE_V7 = "Tunnel alone";
/**
 * The passenger-first Tunnel (bead pulp_wars-78i.9, trimmed by bead
 * pulp_wars-b5f.8): the dock's passenger buttons (a portrait each, and
 * "Alone"), the board badges of the Hammerers that can ride, and the
 * confirmation of a chosen destination. No text names a tile.
 */
export const TUNNEL_PASSENGER_V7 = "Passenger";
export const TUNNEL_NO_PASSENGER_V7 = "Alone";
export const RIDE_BADGE_V7 = "Ride";
export const RIDING_BADGE_V7 = "Riding";
/** "Hammerer stays behind": no tile next to the destination is free. */
export const STAYS_BEHIND_V7 = `${HAMMERER()} stays behind`;
export const TUNNEL_CONFIRM_HINT_V7 = `Tap the tile again or press ${TUNNEL_LABEL_V7}`;
export const RIDER_MOVE_HINT_V7 = `Tap a dot to move the ${HAMMERER()}`;
/** The `?` info of a chosen Tunnel destination. */
export const TUNNEL_CONFIRM_INFO_V7 = `${TUNNEL_CONFIRM_HINT_V7}. ${RIDER_MOVE_HINT_V7}. ${TUNNEL_FORECAST_V7}`;
/** "Hammerer, 12 of 14 HP, riding". */
export function passengerAccessibleNameV7(
  label: string,
  hp: number,
  maxHp: number,
  selected: boolean,
): string {
  return `${label}, ${hp} of ${maxHp} HP${selected ? ", riding" : ""}`;
}
/** "Tunnel alone, selected". */
export function noPassengerAccessibleNameV7(selected: boolean): string {
  return `${TUNNEL_ALONE_V7}${selected ? ", selected" : ""}`;
}
export const TUNNEL_SURFACED_V7 = "It surfaced this turn";
export const TUNNEL_MOVED_V7 = "It moved this turn";
export const TUNNEL_NO_TILE_V7 = `No free tile within ${TUNNEL_RANGE_V7}`;
export const RIDER_SURFACED_V7 =
  "Just surfaced: cannot enter a city or village this turn";
export const BOMB_RUN_LABEL_V7 = "Bomb Run";
/** "Fly over an enemy within 2 tiles, bomb it for {n}, and land beyond it. No reply". */
export function bombRunTooltipV7(bombDamage: number): string {
  return `Fly over an enemy within ${BOMB_RANGE_V7} tiles, bomb it for ${bombDamage}, and land beyond it. No reply`;
}
export const BOMB_RUN_PICK_TARGET_V7 = "Choose an enemy to bomb";
export const BOMB_RUN_PICK_LANDING_V7 = "Choose where the Gyrocopter lands";
/** "Bomb: {n} damage, no reply". */
export function bombPreviewTextV7(damage: number): string {
  return `Bomb: ${damage} damage, no reply`;
}
export const BOMB_KILLS_V7 = "Kills";
/** "Lands next to: up to {n} damage next turn". */
export function landingHintTextV7(threat: number): string {
  return `Lands next to: up to ${threat} damage next turn`;
}
export const LANDING_SAFE_V7 = "Lands next to: no visible threat";
export const BOMBED_MARK_V7 = "Bombed this turn";
export const BOMB_NO_TARGET_V7 = `No enemy within ${BOMB_RANGE_V7} tiles`;
export const BOMB_FROZEN_V7 = "Frozen: it cannot bomb this turn";
export const BOMB_MOVED_V7 = "It moved this turn";
export const DUG_IN_LABEL_V7 = "Dug in";
export const DUG_IN_INFO_V7 =
  "Dug in: +1 fortification (it has not moved; next to your city)";
export const NOT_DUG_IN_MOVED_V7 = "Not dug in: it moved this turn";
export const NOT_DUG_IN_ARRIVED_V7 = "Not dug in: arrived this turn";
export const DUG_IN_PREVIEW_V7 = "Dug in";
export const CLOCKWORK_LABEL_V7 = "Clockwork";
export const CLOCKWORK_INFO_V7 =
  "Clockwork: full strength when attacking; only an Engineer can repair it";
export const CLOCKWORK_RECOVER_V7 = "Clockwork never recovers by itself";
export const UNFLINCHING_PREVIEW_V7 = "Clockwork: full strength";
export const GUNNER_TWO_SHOTS_V7 = `${GUNNER_UNMOVED_SHOTS_V7} shots if it stands still`;
export const GUNNER_ONE_SHOT_LEFT_V7 = "1 shot left";
export const GUNNER_FIRED_V7 = "Fired: cannot move";
export const GUNNER_CANNOT_MOVE_V7 = "Cannot move after firing";
export const GUNNER_THEN_ONE_MORE_V7 = "Then 1 more shot";
export const ASSEMBLE_LABEL_V7 = "Assemble";
/** "Build a Clockwork Gunner next to the Engineer: {cost} Coins, uses a slot in {city}". */
export function assembleTooltipV7(cost: number, city: string): string {
  return `Build a ${GUNNER()} next to the ${ENGINEER()}: ${cost} Coins, uses a slot in ${city}`;
}
/** "Assemble a Clockwork Gunner: {cost} Coins, slot {used}/{capacity} in {city}". */
export function assembleSummaryV7(
  preview: Pick<AssemblePreviewV7, "cost" | "usedSlots" | "capacity">,
  city: string,
): string {
  return `Assemble a ${GUNNER()}: ${preview.cost} Coins, slot ${preview.usedSlots + 1}/${preview.capacity} in ${city}`;
}
export const ASSEMBLE_PICK_V7 = "Choose a tile next to the Engineer";
/** The Assemble panel's one line: "4 Coins · slot 2/3". */
export function assembleCostLineV7(
  preview: Pick<AssemblePreviewV7, "cost" | "usedSlots" | "capacity">,
): string {
  return `${preview.cost} Coins · slot ${preview.usedSlots + 1}/${preview.capacity}`;
}
export const ASSEMBLE_NEEDS_TECH_V7 = "Needs Marksmanship";
/** "{city} is full". */
export function assembleCityFullV7(city: string): string {
  return `${city} is full`;
}
export const ASSEMBLE_NO_COINS_V7 = "Not enough Coins";
export const ASSEMBLE_NO_TILE_V7 = "No free tile";
export const ASSEMBLE_NO_HOME_V7 = "No home city";
export const REPAIR_LABEL_V7 = "Repair";
export const REPAIR_CHIP_V7 = `+${REPAIR_MACHINE_V7} machines, +2 others`;
export const REPAIR_TOOLTIP_V7 = `Heal adjacent units: ${REPAIR_CHIP_V7}. Cures Plague, bites, and frost`;
/** The attack preview's Knockback note; the board's arrow shows where. */
export const KNOCKBACK_V7 = "Knocks back";
export const KNOCKBACK_BLOCKED_V7 = "Knockback blocked";
export const PLATED_PREVIEW_V7 = `Plated: at most ${PLATED_CAP_V7}`;
export const BLASTING_PREVIEW_V7 = "Ignores fortification";
export const DWARF_FIELD_DEFENSE_EXPLANATION_V7 =
  "Dwarves dig in instead of building Field Defense";
export const BURROWED_LABEL_V7 = "Burrowed";
/** "Burrowed: surfaces at the start of {owner}'s next turn. It cannot be attacked". */
export function burrowedInfoTextV7(owner: string): string {
  return `Burrowed: surfaces at the start of ${owner} next turn. It cannot be attacked`;
}
/** "Eruption: {n} damage to enemies on the ground here". */
export function eruptionRingTextV7(damage: number): string {
  return `Eruption: ${damage} damage to enemies on the ground here`;
}
export const UNDERMINED_LOG_V7 = "Field Defense undermined";

// --------------------------------------------------------- owner wording

/** "your" for the viewer, otherwise "Player N's". */
export function dwarfPossessiveV7(
  view: PlayerViewV7,
  playerId: number,
): string {
  if (playerId === view.viewer.id) return "your";
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player === undefined ? "an enemy's" : `Player ${player.seat + 1}'s`;
}

/** A visible unit's name under its kind's registration. */
function unitName(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "id" | "ownerId" | "role">,
): string {
  return unitRoleRuleV7(view, unit).label;
}

/** The public Dwarf mechanics of a visible unit (or a mound), or undefined. */
export function dwarfStatsV7(
  view: Pick<PlayerViewV7, "unitStats">,
  unitId: number,
): PublicDwarfMechanicsV7 | undefined {
  return view.unitStats.find((entry) => entry.unitId === unitId)?.dwarf;
}

/** The owner's eruption damage (2, or 3 with Blasting Charges). */
export function eruptionDamageOfV7(
  view: PlayerViewV7,
  entry: Pick<PublicBurrowedEntryV7, "unit">,
): number {
  return (
    dwarfStatsV7(view, entry.unit.id)?.eruptionDamage ??
    (entry.unit.ownerId === view.viewer.id
      ? technologyCapabilitiesV7(view.viewer.researchedTechs, "DWARF")
          .eruptionDamage
      : ERUPTION_DAMAGE_V7)
  );
}

/** The viewer's own bomb damage (4, or 5 with Dive). */
export function viewerBombDamageV7(view: PlayerViewV7): number {
  return technologyCapabilitiesV7(
    view.viewer.researchedTechs,
    view.viewer.faction,
  ).bombDamage;
}

/** The viewer's own eruption damage (2, or 3 with Blasting Charges). */
export function viewerEruptionDamageV7(view: PlayerViewV7): number {
  return technologyCapabilitiesV7(
    view.viewer.researchedTechs,
    view.viewer.faction,
  ).eruptionDamage;
}

/** The mound on `at`, or undefined. */
export function moundAtV7(
  view: Pick<PlayerViewV7, "burrowed">,
  at: CoordV7,
): PublicBurrowedEntryV7 | undefined {
  return view.burrowed.find(
    (entry) => entry.unit.at.x === at.x && entry.unit.at.y === at.y,
  );
}

/** The mound's lines for unit information and the tile dock. */
export function moundInfoLinesV7(
  view: PlayerViewV7,
  entry: PublicBurrowedEntryV7,
): {
  readonly name: string;
  readonly burrowed: string;
  readonly eruption: string | null;
  readonly rider: string | null;
} {
  const name = unitName(view, entry.unit);
  const rider = entry.moleUnitId !== null;
  return {
    name: `${capitalized(dwarfPossessiveV7(view, entry.unit.ownerId))} ${name} (burrowed)`,
    burrowed: burrowedInfoTextV7(dwarfPossessiveV7(view, entry.unit.ownerId)),
    eruption: rider
      ? null
      : eruptionRingTextV7(eruptionDamageOfV7(view, entry)),
    rider: rider
      ? `It rides with the ${MOLE()} next to it and surfaces with it; it never erupts`
      : null,
  };
}

// ------------------------------------------------------------ section 16.3

/**
 * Section 16.3: one sentence per rule, shown in Help for every viewer of a
 * match with a Dwarf seat. Labels and numbers come from the registry and
 * the engine constants; with the contract values these are the spec's
 * sentences.
 */
export function dwarfHelpRulesV7(): readonly (readonly [string, string])[] {
  const constructs = dwarfRolesWith("CLOCKWORK").map((role) =>
    pluralLabel(dwarfLabelV7(role)),
  );
  const diggers = dwarfRolesWith("DIG_IN").map(dwarfLabelV7);
  return [
    [
      TUNNEL_LABEL_V7,
      `a ${MOLE()} digs up to ${TUNNEL_RANGE_V7} tiles under anything, taking an adjacent ${HAMMERER()} with it; both wait as mounds everyone can see and nobody can touch.`,
    ],
    [
      "Eruption",
      `at the start of the Dwarves' next turn the Mole bursts up and every enemy on the ground next to it takes ${ERUPTION_DAMAGE_V7} (${BLASTING_ERUPTION_DAMAGE_V7} with Blasting Charges), and Field Defense around it collapses.`,
    ],
    [
      "Surfacing",
      `a ${HAMMERER()} that rode the tunnel cannot step into a city or village on the turn it surfaces, and the Mole cannot tunnel again that turn.`,
    ],
    [
      BOMB_RUN_LABEL_V7,
      `a ${GYROCOPTER()} flies over an enemy within ${BOMB_RANGE_V7} tiles, bombs it for ${BOMB_DAMAGE_V7} (${DIVE_BOMB_DAMAGE_V7} with Dive), and lands beyond it; nothing hits back, and no unit is bombed twice in a turn.`,
    ],
    [
      CLOCKWORK_LABEL_V7,
      `${joinAnd(constructs)} hit at full strength until they break, never recover by themselves, and are immune to Plague, bites, Wail, and Mind Control.`,
    ],
    [
      "Twin shot",
      `a ${GUNNER()} that has not moved shoots twice; after it fires it cannot move.`,
    ],
    [
      "Dig In",
      `a ${joinOr(diggers)} that has not moved this turn, on or next to its own city center, fights as if on Field Defense.`,
    ],
    [
      REPAIR_LABEL_V7,
      `an ${ENGINEER()} heals adjacent machines by ${REPAIR_MACHINE_V7} and other units by 2.`,
    ],
    [
      ASSEMBLE_LABEL_V7,
      `an ${ENGINEER()} builds a ${GUNNER()} next to itself for ${ASSEMBLE_COST_V7} Coins, using a slot in its home city.`,
    ],
    [
      "Knockback",
      `a ${CANNON()}'s shot knocks a surviving target one tile straight back.`,
    ],
    [
      "Plated",
      `no single hit takes more than ${PLATED_CAP_V7} HP from a ${TANK()}.`,
    ],
    [
      "Blasting Charges",
      `eruptions deal ${BLASTING_ERUPTION_DAMAGE_V7}, and ${CANNON()} shots ignore Walls and Field Defense.`,
    ],
  ];
}

export const DWARF_HELP_RULES_V7: readonly (readonly [string, string])[] =
  dwarfHelpRulesV7();

// ---------------------------------------------------- abilities and labels

/** Dwarf ability names; other factions' names are unchanged. */
export function dwarfAbilityNameV7(
  ability: string,
  faction: FactionIdV7,
): string | null {
  if (faction !== "DWARF") return null;
  switch (ability) {
    case "TEND_WOUNDED":
      return REPAIR_LABEL_V7;
    case "RIDES_TUNNEL":
      return "Rides the tunnel";
    case "DIG_IN":
      return "Dig In";
    case "FLY":
      return "Flies";
    case "BOMB_RUN":
      return BOMB_RUN_LABEL_V7;
    case "CLOCKWORK":
      return CLOCKWORK_LABEL_V7;
    case "TWIN_SHOT":
      return "Twin shot";
    case "TUNNEL":
      return TUNNEL_LABEL_V7;
    case "ERUPTION":
      return "Eruption";
    case "ASSEMBLE":
      return ASSEMBLE_LABEL_V7;
    case "KNOCKBACK":
      return "Knockback";
    case "PLATED":
      return "Plated";
    default:
      return null;
  }
}

/** One-sentence descriptions of the Dwarf abilities (unit information). */
export function dwarfAbilityDescriptionV7(
  ability: string,
  faction: FactionIdV7,
): string | null {
  if (faction !== "DWARF") return null;
  switch (ability) {
    case "TEND_WOUNDED":
      return `${REPAIR_TOOLTIP_V7}.`;
    case "RIDES_TUNNEL":
      return `Rides an adjacent ${MOLE()}'s tunnel and surfaces next to it; it cannot step into a city or village on the turn it surfaces.`;
    case "DIG_IN":
      return "With Dig In, it fights as if on Field Defense while it has not moved this turn and stands on or next to your city center.";
    case "FLY":
      return "Flies over any terrain and any unit and ignores zones of control; never captures or stands on a foreign city.";
    case "BOMB_RUN":
      return `Flies over an enemy within ${BOMB_RANGE_V7} tiles, bombs it for ${BOMB_DAMAGE_V7} (${DIVE_BOMB_DAMAGE_V7} with Dive) and lands beyond it. Nothing hits back, and no unit is bombed twice in a turn. It has no ordinary attack.`;
    case "CLOCKWORK":
      return `${CLOCKWORK_INFO_V7}. Immune to Plague, bites, Wail, and Mind Control; leaves no Grave.`;
    case "TWIN_SHOT":
      return `Shoots ${GUNNER_UNMOVED_SHOTS_V7} times on a turn it has not moved, once after moving; after it fires it cannot move.`;
    case "TUNNEL":
      return `Digs up to ${TUNNEL_RANGE_V7} tiles under anything (and takes an adjacent ${HAMMERER()} along); it waits as a mound everyone can see and nobody can touch.`;
    case "ERUPTION":
      return `When it surfaces, every enemy on the ground next to it takes ${ERUPTION_DAMAGE_V7} (${BLASTING_ERUPTION_DAMAGE_V7} with Blasting Charges), and Field Defense around it collapses.`;
    case "ASSEMBLE":
      return `With Marksmanship, builds a ${GUNNER()} on a free tile next to it for ${ASSEMBLE_COST_V7} Coins, using a slot in its home city.`;
    case "KNOCKBACK":
      return "Its shot knocks a surviving target one tile straight back.";
    case "PLATED":
      return `No single hit takes more than ${PLATED_CAP_V7} HP from it.`;
    default:
      return null;
  }
}

/**
 * Dwarf command labels: Tunnel, Bomb Run and Assemble for every viewer, and
 * Repair for a Dwarf viewer's Tend Wounded.
 */
export function dwarfCommandLabelV7(
  kind: CommandV7["kind"],
  faction: FactionIdV7,
): string | null {
  if (kind === "TUNNEL") return TUNNEL_LABEL_V7;
  if (kind === "BOMB_RUN") return BOMB_RUN_LABEL_V7;
  if (kind === "ASSEMBLE") return ASSEMBLE_LABEL_V7;
  if (kind === "TEND_WOUNDED" && faction === "DWARF") return REPAIR_LABEL_V7;
  return null;
}

/** The Dwarf names of the two unit rewards; null for every other reward. */
export function dwarfRewardLabelV7(
  reward: string,
): readonly [string, string] | null {
  if (reward === "MILITIA") return ["Militia", `A free ${HAMMERER()}`];
  if (reward === "JUGGERNAUT")
    return [dwarfLabelV7("JUGGERNAUT"), "A giant clockwork unit"];
  return null;
}

/**
 * The technology unlock text of a Dwarf role (section 4): "Train Steam
 * Cannon (Knockback)", from the role's registered abilities.
 */
export function dwarfRoleUnlockTextV7(role: UnitRoleIdV7): string {
  const abilities = effectiveRoleRuleV7(role, "DWARF")
    .abilities as readonly string[];
  const notes = [
    ...(abilities.includes("TEND_WOUNDED") ? [REPAIR_LABEL_V7] : []),
    ...(abilities.includes("BOMB_RUN") ? [BOMB_RUN_LABEL_V7] : []),
    ...(abilities.includes("TWIN_SHOT") ? ["two shots standing still"] : []),
    ...(abilities.includes("TUNNEL") ? [TUNNEL_LABEL_V7] : []),
    ...(abilities.includes("KNOCKBACK") ? ["Knockback"] : []),
    ...(abilities.includes("PLATED") ? ["Plated"] : []),
  ];
  const label = dwarfLabelV7(role);
  return notes.length === 0
    ? `Train ${label}`
    : `Train ${label} (${notes.join(", ")})`;
}

/** The Dwarf technology unlock texts of section 4. */
export const ENGINEER_SUPPORT_UNLOCK_TEXT_V7 = `${pluralLabel(ENGINEER())} Repair adjacent units: ${REPAIR_CHIP_V7}`;
export const ASSEMBLE_UNLOCK_TEXT_V7 = `${pluralLabel(ENGINEER())} Assemble ${pluralLabel(GUNNER())}`;
export const DIVE_UNLOCK_TEXT_V7 = `Dive: bombs deal ${DIVE_BOMB_DAMAGE_V7}`;
export const DIG_IN_UNLOCK_TEXT_V7 = `${pluralLabel(HAMMERER())} and ${pluralLabel(MOLE().split(" ").at(-1) ?? MOLE())} that stand still on or next to your city centers are dug in`;
export const BLASTING_CHARGES_UNLOCK_TEXT_V7 = `Eruptions deal ${BLASTING_ERUPTION_DAMAGE_V7}; ${pluralLabel(CANNON())} ignore Walls and Field Defense`;

/** Recruit-help notes of a Dwarf role, from its registration. */
export function dwarfRecruitNotesV7(
  role: UnitRoleIdV7,
  faction: FactionIdV7,
): readonly string[] {
  if (faction !== "DWARF" || role === "PATROL_BOAT" || role === "BATTLESHIP")
    return [];
  const mechanics = roleMechanicsV7(role, faction);
  return [
    ...(mechanics.construct
      ? [`${CLOCKWORK_INFO_V7}; it never recovers by itself.`]
      : []),
    ...(mechanics.movementMode === "FLY"
      ? ["Flies over any terrain and unit; never captures."]
      : []),
    ...(mechanics.repairsAsMachine && !mechanics.construct
      ? [
          `A machine: an ${ENGINEER()}'s Repair heals it by ${REPAIR_MACHINE_V7}.`,
        ]
      : []),
    ...(roleMechanicsV7(role, "ORIGINAL").buildsFieldDefense &&
    !mechanics.buildsFieldDefense
      ? [`${DWARF_FIELD_DEFENSE_EXPLANATION_V7}.`]
      : []),
  ];
}

// -------------------------------------------------------------- unit info

/** One line of Dwarf unit information. */
export interface DwarfUnitInfoLineV7 {
  readonly id:
    | "dug-in"
    | "not-dug-in"
    | "clockwork"
    | "shots"
    | "plated"
    | "surfaced"
    | "bombed"
    | "bomb"
    | "eruption";
  readonly name: string;
  readonly description: string;
}

/** Whether a city center the unit's owner owns is within 1 of it. */
function nextToOwnCenter(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return view.cities.some(
    (city) =>
      city.ownerId === unit.ownerId &&
      Math.max(
        Math.abs(city.at.x - unit.at.x),
        Math.abs(city.at.y - unit.at.y),
      ) <= 1,
  );
}

/**
 * Section 16.1 "Dig In": the dock chip of a Hammerer or Mole: dug in, or
 * (within 1 of an own center, with Dig In) not dug in because it moved or
 * arrived this turn. Null when neither applies.
 */
export function digInChipV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  stats: Pick<PublicUnitStatsV7, "dwarf"> | undefined,
): {
  readonly dugIn: boolean;
  readonly label: string;
  readonly text: string;
} | null {
  const mechanics = stats?.dwarf;
  if (mechanics === undefined || !mechanics.digsIn || unit.form !== "LAND")
    return null;
  if (mechanics.dugIn)
    return { dugIn: true, label: DUG_IN_LABEL_V7, text: DUG_IN_INFO_V7 };
  // Dig In needs the owner's technology: only the viewer's own is known.
  if (
    unit.ownerId !== view.viewer.id ||
    !technologyCapabilitiesV7(view.viewer.researchedTechs, "DWARF").digIn ||
    !nextToOwnCenter(view, unit) ||
    !unit.activation.moved
  )
    return null;
  // A unit that arrived this turn (trained, rewarded, assembled) has the
  // exhausted activation: it moved without a Move of its own.
  const arrived =
    unit.activation.moved &&
    unit.activation.movedPathLength === 0 &&
    unit.activation.handled &&
    unit.activation.specialActed &&
    unit.activation.recovered;
  return {
    dugIn: false,
    label: "Not dug in",
    text: arrived ? NOT_DUG_IN_ARRIVED_V7 : NOT_DUG_IN_MOVED_V7,
  };
}

/** The Gunner's shot chip: "2 shots if it stands still", "1 shot left", "Fired: cannot move". */
export function gunnerShotsTextV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  mechanics: PublicDwarfMechanicsV7 | undefined,
): string | null {
  if (mechanics?.shotsLeft === null || mechanics === undefined) return null;
  if (unit.form !== "LAND") return null;
  const ownTurn =
    view.turnOrder[view.activeSeatIndex] === unit.ownerId &&
    unit.ownerId === view.viewer.id;
  if (!ownTurn) return GUNNER_TWO_SHOTS_V7;
  if (unit.activation.attacked)
    return mechanics.shotsLeft > 0 ? GUNNER_ONE_SHOT_LEFT_V7 : GUNNER_FIRED_V7;
  if (unit.activation.moved) return "1 shot (it moved)";
  return GUNNER_TWO_SHOTS_V7;
}

/**
 * Unit info lines that are not abilities, for a unit of any owner in a
 * match with a Dwarf seat: Dig In, the clockwork status, the Gunner's
 * shots, Plated, the rider's surfacing brake, the "bombed this turn" mark,
 * and the owner's bomb and eruption damage.
 */
export function dwarfUnitInfoLinesV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  stats: Pick<
    PublicUnitStatsV7,
    "dwarf" | "bombedThisTurn" | "surfacedThisTurn"
  >,
): readonly DwarfUnitInfoLineV7[] {
  const lines: DwarfUnitInfoLineV7[] = [];
  if (stats.bombedThisTurn === true)
    lines.push({
      id: "bombed",
      name: BOMBED_MARK_V7,
      description: "No Gyrocopter can bomb it again this turn.",
    });
  const mechanics = stats.dwarf;
  if (mechanics === undefined || unit.form !== "LAND") return lines;
  const dig = digInChipV7(view, unit, stats);
  if (dig !== null)
    lines.push({
      id: dig.dugIn ? "dug-in" : "not-dug-in",
      name: dig.label,
      description: `${dig.text}.`,
    });
  if (mechanics.construct)
    lines.push({
      id: "clockwork",
      name: CLOCKWORK_LABEL_V7,
      description: `${CLOCKWORK_INFO_V7}.`,
    });
  const shots = gunnerShotsTextV7(view, unit, mechanics);
  if (shots !== null)
    lines.push({
      id: "shots",
      name: shots,
      description: `${GUNNER_TWO_SHOTS_V7}, one after moving; ${GUNNER_CANNOT_MOVE_V7.toLowerCase()}.`,
    });
  if (mechanics.plated !== null)
    lines.push({
      id: "plated",
      name: `Plated ${mechanics.plated}`,
      description: `No single hit takes more than ${mechanics.plated} HP from it.`,
    });
  if (
    stats.surfacedThisTurn === true &&
    unitRoleRuleV7(view, unit).abilities.includes("RIDES_TUNNEL")
  )
    lines.push({
      id: "surfaced",
      name: "Just surfaced",
      description: `${RIDER_SURFACED_V7}.`,
    });
  if (unitRoleRuleV7(view, unit).abilities.includes("BOMB_RUN"))
    lines.push({
      id: "bomb",
      name: `Bomb ${mechanics.bombDamage}`,
      description: `${bombRunTooltipV7(mechanics.bombDamage)}.`,
    });
  if (mechanics.tunnelRange > 0)
    lines.push({
      id: "eruption",
      name: `Eruption ${mechanics.eruptionDamage}`,
      description: `${eruptionRingTextV7(mechanics.eruptionDamage)} when it surfaces.`,
    });
  return lines;
}

// --------------------------------------------------------- attack preview

/** The Dwarf lines of one attack preview (section 16.1). */
export interface DwarfCombatLinesV7 {
  /** Notes of this target, in the order of section 16.2. */
  readonly notes: readonly string[];
  /**
   * The shooter's lines, the same for each of its targets ("Clockwork: full
   * strength", the Gunner's second shot and "Cannot move after firing"):
   * the board draws them on the focused target only.
   */
  readonly shooter: readonly string[];
  /** The Knockback destination, and whether it is blocked. */
  readonly knockback: {
    readonly to: CoordV7;
    readonly blocked: boolean;
    readonly text: string;
  } | null;
}

/**
 * Section 16.1 "attack preview", for own and enemy attacks, from the public
 * combat preview only: "Dug in" on the defender, "Clockwork: full
 * strength", "Plated: at most 4", "Ignores fortification" (a Blasting
 * Steam Cannon), the Gunner's second shot and "Cannot move after firing",
 * and "Knocks back to {tile}" or "Knockback blocked". Empty for an exchange
 * without any of them.
 */
export function dwarfCombatLinesV7(
  view: PlayerViewV7,
  preview: CombatPreviewV7,
): DwarfCombatLinesV7 {
  const notes: string[] = [];
  const attacker = view.units.find((unit) => unit.id === preview.attackerId);
  const defender = view.units.find((unit) => unit.id === preview.targetUnitId);
  if (preview.dugIn) notes.push(DUG_IN_PREVIEW_V7);
  const shooter: string[] = [];
  if (preview.unflinchingApplied) shooter.push(UNFLINCHING_PREVIEW_V7);
  if (preview.platedApplied) notes.push(PLATED_PREVIEW_V7);
  const attackerAbilities =
    attacker === undefined
      ? []
      : (unitRoleRuleV7(view, attacker).abilities as readonly string[]);
  const cannon =
    attacker !== undefined &&
    attacker.form === "LAND" &&
    attackerAbilities.includes("KNOCKBACK");
  if (cannon && preview.fortificationIgnored > 0)
    notes.push(BLASTING_PREVIEW_V7);
  if (attacker?.form === "LAND" && attackerAbilities.includes("TWIN_SHOT")) {
    if (preview.attacksRemaining > 0) shooter.push(GUNNER_THEN_ONE_MORE_V7);
    shooter.push(GUNNER_CANNOT_MOVE_V7);
  }
  let knockback: DwarfCombatLinesV7["knockback"] = null;
  if (
    cannon &&
    attacker !== undefined &&
    defender !== undefined &&
    !preview.defenderDies &&
    preview.push !== "UNKNOWN_BEHIND_FOG"
  ) {
    const to = knockbackDestinationV7(attacker.at, defender.at);
    const blocked = preview.push !== "WILL_PUSH";
    knockback = {
      to,
      blocked,
      text: blocked ? KNOCKBACK_BLOCKED_V7 : KNOCKBACK_V7,
    };
    notes.push(knockback.text);
  }
  return { notes, shooter, knockback };
}

// -------------------------------------------------------- ability previews

/** The short board label of a Tunnel destination. */
export function tunnelTargetLabelV7(preview: TunnelPreviewV7): string {
  if (preview.eruptionTargets.length === 0) return "Surface";
  const total = preview.eruptionTargets.reduce(
    (sum, target) => sum + target.damage + target.shieldDamage,
    0,
  );
  return `Erupt −${total}`;
}

/**
 * The accessible name of a Tunnel destination (bead pulp_wars-b5f.8): what
 * the Mole would erupt on, never where: "Surface next to Catapult and
 * Captain, erupts for 6", "Surface in the open", with ", lethal",
 * ", undermines Field Defense" and ". Hammerer stays behind".
 */
export function tunnelDestinationNameV7(
  view: PlayerViewV7,
  preview: TunnelPreviewV7,
  staysBehind = false,
): string {
  const names = preview.eruptionTargets.map((target) => {
    const unit = view.units.find((candidate) => candidate.id === target.unitId);
    return unit === undefined ? "a unit" : unitName(view, unit);
  });
  const total = preview.eruptionTargets.reduce(
    (sum, target) => sum + target.damage + target.shieldDamage,
    0,
  );
  const lethal = preview.eruptionTargets.some((target) => target.dies);
  const parts = [
    names.length === 0
      ? "Surface in the open"
      : `Surface next to ${joinAnd(names)}, erupts for ${total}${lethal ? ", lethal" : ""}`,
    ...(preview.undermines.length > 0 ? ["undermines Field Defense"] : []),
  ];
  return `${parts.join(", ")}${staysBehind ? `. ${STAYS_BEHIND_V7}` : ""}`;
}

/** The bomb's preview lines (section 16.2). */
export function bombPreviewLinesV7(
  preview: BombRunPreviewV7,
): readonly string[] {
  return [
    bombPreviewTextV7(preview.damage + preview.shieldDamage),
    ...(preview.shieldDamage > 0
      ? [`Shield absorbs ${preview.shieldDamage}`]
      : []),
    ...(preview.kills ? [BOMB_KILLS_V7] : []),
    ...(preview.blast.length > 0
      ? ["Its death blast hits the Gyrocopter"]
      : []),
  ];
}

/** The short board label of a bomb target. */
export function bombTargetLabelV7(preview: BombRunPreviewV7): string {
  return preview.kills
    ? `Bomb −${preview.damage} · ${BOMB_KILLS_V7}`
    : `Bomb −${preview.damage + preview.shieldDamage}`;
}

/** The short board label of a landing tile. */
export function landingLabelV7(preview: BombRunPreviewV7): string {
  return preview.landingThreat > 0
    ? `Land · up to ${preview.landingThreat}`
    : "Land · safe";
}

/** The landing hint (section 16.2). */
export function landingHintV7(preview: BombRunPreviewV7): string {
  return preview.landingThreat > 0
    ? landingHintTextV7(preview.landingThreat)
    : LANDING_SAFE_V7;
}

/**
 * Why an own Mole, Gyrocopter or Engineer that could still act has no
 * Tunnel, Bomb Run or Assemble (section 16.2), or null when it has one or
 * cannot act at all. `assembleReason` is queryAssembleUnavailableReasonV7's
 * answer; `city` names the Engineer's home city.
 */
export function dwarfAbilityUnavailableTextV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  kind: "TUNNEL" | "BOMB_RUN" | "ASSEMBLE",
  offered: boolean,
  assemble?: {
    readonly reason:
      | "TECH_REQUIRED"
      | "NO_HOME"
      | "CITY_CAPACITY_FULL"
      | "INSUFFICIENT_COINS"
      | "INVALID_TILE"
      | null;
    readonly city: string;
  },
): string | null {
  if (offered) return null;
  if (
    unit.ownerId !== view.viewer.id ||
    unit.form !== "LAND" ||
    view.turnOrder[view.activeSeatIndex] !== view.viewer.id ||
    unit.activation.attacked ||
    unit.activation.specialActed ||
    unit.activation.recovered ||
    unit.activation.captured ||
    unit.activation.handled
  )
    return null;
  if (kind === "TUNNEL") {
    if (view.surfacedThisTurn.includes(unit.id)) return TUNNEL_SURFACED_V7;
    if (unit.activation.moved) return TUNNEL_MOVED_V7;
    return TUNNEL_NO_TILE_V7;
  }
  if (kind === "BOMB_RUN") {
    // A bombing run is a Move and an action at once: a Frozen (sluggish)
    // Gyrocopter cannot make one, nor one that has moved.
    const chilled = view.chilled.find((entry) => entry.unitId === unit.id);
    if (chilled?.sluggish === true || sluggishUnitMovedV7(view, unit))
      return BOMB_FROZEN_V7;
    if (unit.activation.moved) return BOMB_MOVED_V7;
    return BOMB_NO_TARGET_V7;
  }
  switch (assemble?.reason ?? null) {
    case "TECH_REQUIRED":
      return ASSEMBLE_NEEDS_TECH_V7;
    case "NO_HOME":
      return ASSEMBLE_NO_HOME_V7;
    case "CITY_CAPACITY_FULL":
      return assembleCityFullV7(assemble?.city ?? "Its city");
    case "INSUFFICIENT_COINS":
      return ASSEMBLE_NO_COINS_V7;
    case "INVALID_TILE":
      return ASSEMBLE_NO_TILE_V7;
    default:
      return null;
  }
}

/**
 * Section 16.1 "clockwork status": an own construct that could Recover now
 * but never does (damaged, unmoved, nothing used, its owner's turn).
 */
export function clockworkRecoverBlockedV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  const activation = unit.activation;
  return (
    unit.ownerId === view.viewer.id &&
    unit.form === "LAND" &&
    view.turnOrder[view.activeSeatIndex] === view.viewer.id &&
    dwarfStatsV7(view, unit.id)?.construct === true &&
    unit.hp < unit.maxHp &&
    !activation.handled &&
    !activation.moved &&
    !activation.attacked &&
    !activation.recovered &&
    !activation.captured &&
    !activation.specialActed
  );
}

// ------------------------------------------------------------- log lines

/**
 * Section 16.2 log lines of one projected boundary: a tunnel, a surfacing
 * and its eruption, a bomb, an Assemble, a Repair, a Knockback, and
 * Undermined Field Defense. A match without a Dwarf seat never emits these
 * events, so its notices are unchanged.
 */
export function dwarfBoundaryNoticeV7(
  events: readonly PlayerEventV7[],
  before: PlayerViewV7,
  after: PlayerViewV7,
): { readonly text: string; readonly toast: boolean } | null {
  if (!matchHasDwarfSeatV7(after)) return null;
  const viewerId = after.viewer.id;
  const parts: string[] = [];
  let toast = false;
  const unitById = (id: number): PublicUnitV7 | undefined =>
    before.units.find((unit) => unit.id === id) ??
    after.units.find((unit) => unit.id === id) ??
    before.burrowed.find((entry) => entry.unit.id === id)?.unit ??
    after.burrowed.find((entry) => entry.unit.id === id)?.unit;
  const owner = (playerId: number): string =>
    capitalized(dwarfPossessiveV7(after, playerId));
  let undermined = false;
  for (const event of events) {
    if (event.kind === "UNIT_TUNNELLED") {
      parts.push(
        `${owner(event.playerId)} ${MOLE()} tunnelled${event.riderUnitId === null ? "" : ` (with ${article(HAMMERER())} ${HAMMERER()})`}`,
      );
    } else if (event.kind === "UNIT_SURFACED") {
      const hitsViewer = event.results.some(
        (result) => unitById(result.unitId)?.ownerId === viewerId,
      );
      if (hitsViewer || event.playerId === viewerId) toast = true;
      parts.push(
        `${owner(event.playerId)} ${MOLE()} erupted: ${plural(event.results.length, "unit")} hit`,
      );
    } else if (event.kind === "UNIT_BOMBED") {
      const target = unitById(event.targetUnitId);
      const name = target === undefined ? "unit" : unitName(after, target);
      if (target?.ownerId === viewerId || event.playerId === viewerId)
        toast = true;
      parts.push(
        `${owner(event.playerId)} ${GYROCOPTER()} bombed ${article(name)} ${name} for ${event.damage + event.shieldDamage}${event.killed ? ", killing it" : ""}`,
      );
    } else if (event.kind === "UNIT_ASSEMBLED") {
      parts.push(
        `${owner(event.playerId)} ${ENGINEER()} assembled ${article(GUNNER())} ${GUNNER()}`,
      );
    } else if (event.kind === "WOUNDED_TENDED") {
      const engineer = unitById(event.captainId);
      if (engineer === undefined || unitFactionV7(after, engineer) !== "DWARF")
        continue;
      const healed = event.results.reduce(
        (sum, result) => sum + result.amount,
        0,
      );
      parts.push(
        `${owner(engineer.ownerId)} ${ENGINEER()} repaired ${plural(event.results.length, "unit")} (+${healed} HP)`,
      );
    } else if (event.kind === "UNIT_PUSHED") {
      const source = unitById(event.sourceUnitId);
      if (
        source === undefined ||
        !(
          unitRoleRuleV7(after, source).abilities as readonly string[]
        ).includes("KNOCKBACK")
      )
        continue;
      const target = unitById(event.targetUnitId);
      const name = target === undefined ? "unit" : unitName(after, target);
      parts.push(
        `${owner(source.ownerId)} ${CANNON()} knocked back ${article(name)} ${name}`,
      );
    } else if (
      event.kind === "FIELD_DEFENSE_DESTROYED" &&
      event.reason === "UNDERMINED" &&
      !undermined
    ) {
      undermined = true;
      parts.push(UNDERMINED_LOG_V7);
    }
  }
  return parts.length === 0 ? null : { text: parts.join(" · "), toast };
}

const FIELD_DEFENSE_BLOCK_CACHE = new WeakMap<PlayerViewV7, Set<number>>();

/**
 * Section 16.2 "Field Defense unavailable": an own Hammerer or Mole where a
 * Human Fighter or Guard would be offered Build Field Defense
 * (Fortification, own territory land tile, not moved, primary action
 * unused, no Field Defense yet, 3 Coins). A Dwarf viewer's Fortification is
 * Dig In, so this explains the gap.
 */
export function dwarfFieldDefenseBlockedV7(
  view: PlayerViewV7,
  unitId: number,
): boolean {
  if (view.viewer.faction !== "DWARF") return false;
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
            !roleMechanicsV7(candidate.role, "DWARF").buildsFieldDefense &&
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

/**
 * The Engineer's home city as the Assemble texts name it: "your Capital",
 * else "its home city" (cities have no names, and no text names a tile).
 */
export function dwarfCityNameV7(
  view: PlayerViewV7,
  cityId: number | null,
): string {
  const city = view.cities.find((candidate) => candidate.id === cityId);
  return city?.isCapital === true
    ? `${dwarfPossessiveV7(view, city.ownerId)} Capital`
    : "its home city";
}

/** Section 16.1 "city panel": the Dwarf slot tooltip. */
export const DWARF_SLOT_TOOLTIP_V7 =
  "Unit slots used in this city; every Dwarf unit takes 1, and an Engineer's Assemble uses one too";
