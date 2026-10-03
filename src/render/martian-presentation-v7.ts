import {
  FORCE_FIELD_SHIELD_V7,
  MIND_CONTROL_COOLDOWN_TURNS_V7,
  MIND_CONTROL_HP_V7,
  MIND_CONTROL_RANGE_V7,
  MIND_CONTROL_LIMIT_V7,
  TRACTOR_BEAM_RANGE_V7,
  UNIT_ROLE_IDS_V7,
  effectiveRoleRuleV7,
  isMindControlledV7,
  roleMechanicsV7,
  seatRoleRuleV7,
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
  type UnitRoleIdV7,
} from "../engine/index";

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
export const BEAM_DOWN_TOOLTIP_V7 =
  "Bring a unit from one of your cities to a tile next to this Saucer. It cannot act this turn.";
export const BEAM_DOWN_MOVED_V7 =
  "A Saucer that moved this turn cannot Beam Down";
export const BEAM_DOWN_NO_PASSENGER_V7 =
  "No unit on or next to one of your city centers";
export const BEAM_DOWN_NO_TILE_V7 = "No free tile next to this Saucer";
export const BEAM_DOWN_PICK_PASSENGER_V7 = "Choose the unit to beam down";
export const BEAM_DOWN_PICK_TILE_V7 = "Choose a tile next to the Saucer";
export const MIND_CONTROL_LABEL_V7 = "Mind Control";
export const MIND_CONTROL_TOOLTIP_V7 = `Take a wounded hostile unit with ${MIND_CONTROL_HP_V7} HP or less within ${MIND_CONTROL_RANGE_V7} tiles. It fights for you as itself until this Brain is lost.`;
export const MIND_CONTROL_PICK_V7 = "Choose a weakened enemy to take";
export const MIND_CONTROL_IMMUNE_V7 = "Immune";
export const MIND_CONTROL_PROTECTED_V7 =
  "Protected on a city or village center";
export const TRACTOR_BEAM_LABEL_V7 = "Tractor Beam";
export const TRACTOR_BEAM_TOOLTIP_V7 = `Pull a unit ${TRACTOR_BEAM_RANGE_V7} tiles away one tile toward this Mothership.`;
export const TRACTOR_BEAM_PICK_V7 = "Choose a unit to pull";
export const PSYCHIC_COMMAND_LABEL_V7 = "Psychic Command";
export const PSYCHIC_COMMAND_STATUS_V7 =
  "Psychic Command: +1 Attack on the next attack";
export const STRAFE_LABEL_V7 = "Strafe";
export const MARTIAN_FIELD_DEFENSE_EXPLANATION_V7 =
  "Martians cannot build Field Defense";
/**
 * The Mind Control revision (section 9): the control line of a
 * mind-controlled unit. The UI pass (`pulp_wars-b5f.3`) words the dock with
 * the controller and the original owner.
 */
export const MIND_CONTROLLED_LABEL_V7 = "Mind-controlled";
export const MIND_CONTROLLED_INFO_V7 =
  "Fights for a Brain as itself. Returns to its owner if the Brain is lost.";
export const MIND_CONTROLLED_NO_SLOT_V7 = "Mind-controlled units use no slot";
export const COOLING_LABEL_V7 = "Cooling";
export const COOLING_TOOLTIP_V7 =
  "Cooling: its ray fires at half power until the end of its owner's next turn";
export const LEAVES_COOLING_V7 = "Leaves it Cooling next turn";
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
 * Section 13.2 "Mind Control unavailable": "Recovering: ready in {n}
 * turn(s)" or "Controls a unit already"; null when neither applies.
 */
export function mindControlUnavailableTextV7(
  mindControl: PublicMartianMechanicsV7["mindControl"],
): string | null {
  if (mindControl === null) return null;
  if (mindControl.cooldown !== null)
    return `Recovering: ready in ${plural(mindControlReadyInV7(mindControl.cooldown), "turn")}`;
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
  const beamers = martianRolesWith("BEAM_DOWN").map(label);
  const brains = martianRolesWith("MIND_CONTROL").map(label);
  const pullers = martianRolesWith("TRACTOR_BEAM").map(label);
  const strafers = martianRolesWith("CHARGE").map(label);
  // `pulp_wars-b5f.2`: the Grunt's ray pistol (a land role with range 2
  // and no heat ray) and the Tripod's range-2-only ray.
  const pistolRoles = martianRolesWith("ATTACK").filter(
    (role) =>
      role !== "PATROL_BOAT" &&
      role !== "BATTLESHIP" &&
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
      `a unit that recharges next to a ${joinOr(projector)} recharges to Shield ${FORCE_FIELD_SHIELD_V7}.`,
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
      `a ${joinOr(beamers)} that has not moved brings a unit from one of its owner's cities to a tile next to itself; the unit cannot act that turn.`,
    ],
    [
      MIND_CONTROL_LABEL_V7,
      `a ${joinOr(brains)} takes control of ${MIND_CONTROL_LIMIT_V7 === 1 ? "one" : `up to ${numberWord(MIND_CONTROL_LIMIT_V7)}`} wounded hostile unit${MIND_CONTROL_LIMIT_V7 === 1 ? "" : "s"} with ${MIND_CONTROL_HP_V7} HP or less within ${MIND_CONTROL_RANGE_V7} tiles, not on a city or village, and needs ${numberWord(MIND_CONTROL_COOLDOWN_TURNS_V7)} turns before the next. The unit keeps its type and abilities but cannot be disbanded or create units. When the ${joinOr(brains)} is lost, the unit returns to its owner.`,
    ],
    [
      TRACTOR_BEAM_LABEL_V7,
      `a ${joinOr(pullers)} pulls a unit ${numberWord(TRACTOR_BEAM_RANGE_V7)} tiles away one tile toward itself, out of Walls, Field Defense, or a city center.`,
    ],
    [
      `${PSYCHIC_COMMAND_LABEL_V7}, ${STRAFE_LABEL_V7}`,
      `a ${joinOr(brains)} gives adjacent units +1 Attack on their next attack, and a ${joinOr(strafers)} gets +1 Attack after moving two tiles.`,
    ],
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
): string | null {
  if (faction !== "MARTIAN") return null;
  switch (ability) {
    case "RALLY":
      return `Adjacent friendly land troops, except ${martianLabelV7("CAPTAIN")}s and ${martianLabelV7("CATAPULT")}s, get +1 Attack on their next attack this turn.`;
    case "CHARGE":
      return "With Raiding, +1 Attack on the first Attack after moving 2+ cells.";
    case "HEAT_RAY":
      return "Fires at full power if it has not moved this turn and is not Cooling; a full-power shot leaves it Cooling, at half Attack, until the end of its next turn.";
    case "PIERCE":
      return "Its ray also hits the unit directly behind the target for half the damage, friend or foe.";
    case "FORCE_FIELD":
      return `Own units next to it recharge their Shield to ${FORCE_FIELD_SHIELD_V7}.`;
    case "BEAM_DOWN":
      return BEAM_DOWN_TOOLTIP_V7;
    case "MIND_CONTROL":
      return MIND_CONTROL_TOOLTIP_V7;
    case "TRACTOR_BEAM":
      return TRACTOR_BEAM_TOOLTIP_V7;
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
  if (faction !== "MARTIAN" || role === "PATROL_BOAT" || role === "BATTLESHIP")
    return [];
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
    ...(roleMechanicsV7(role, "ORIGINAL").buildsFieldDefense &&
    !mechanics.buildsFieldDefense
      ? [`${MARTIAN_FIELD_DEFENSE_EXPLANATION_V7}.`]
      : []),
  ];
}

/** One line of Martian unit information. */
export interface MartianUnitInfoLineV7 {
  readonly id: "shield" | "ray" | "brain" | "slots" | "afloat";
  readonly name: string;
  readonly description: string;
}

/**
 * Unit info lines from the public Martian mechanics (`stats.martian`) that
 * are not abilities: the Shield, the ray's power now, a Brain's controlled
 * units and cooldown, a two-slot body, and a machine afloat. (A
 * mind-controlled unit's line reads the top-level `mindControl` stats; the
 * dock wording is the UI pass.)
 */
export function martianUnitInfoLinesV7(
  unit: Pick<PublicUnitV7, "role" | "form">,
  mechanics: PublicMartianMechanicsV7,
): readonly MartianUnitInfoLineV7[] {
  const lines: MartianUnitInfoLineV7[] = [];
  if (mechanics.shieldMaximum > 0)
    lines.push({
      id: "shield",
      name: shieldTextV7(mechanics),
      description:
        mechanics.shield > mechanics.shieldMaximum
          ? "Raised by a Force Field. Takes damage before HP."
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
          ? "Its next shot fires at full Attack and leaves it Cooling."
          : "It moved this turn: its next shot fires at half Attack.",
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

/** The Beam Down destination label. */
export function beamDownTileLabelV7(
  preview: BeamDownPreviewV7,
  at: { readonly x: number; readonly y: number },
): string {
  return preview.fieldDefenseDestroyed.some(
    (tile) => tile.x === at.x && tile.y === at.y,
  )
    ? "Beam here · destroys Field Defense"
    : "Beam here";
}

/**
 * Why an own Saucer that could still act has no Beam Down (section 13.1:
 * moved, no passenger, no free tile), or null when it has one or cannot
 * act at all. `offered` is whether any `BEAM_DOWN` of the Saucer is offered.
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
    saucer.ownerId !== view.viewer.id ||
    saucer.form !== "LAND" ||
    view.turnOrder[view.activeSeatIndex] !== view.viewer.id ||
    !(unitRoleRuleV7(view, saucer).abilities as readonly string[]).includes(
      "BEAM_DOWN",
    ) ||
    saucer.activation.attacked ||
    saucer.activation.specialActed ||
    saucer.activation.recovered ||
    saucer.activation.captured
  )
    return null;
  // A moved Saucer is often handled already (nothing left to do); the
  // reason still explains the missing Beam Down.
  if (saucer.activation.moved) return BEAM_DOWN_MOVED_V7;
  if (saucer.activation.handled) return null;
  const near = (left: PublicUnitV7["at"], right: PublicUnitV7["at"]): boolean =>
    Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y)) <= 1;
  const passengers = view.units.filter(
    (unit) =>
      unit.id !== saucer.id &&
      unit.ownerId === view.viewer.id &&
      unit.form === "LAND" &&
      unitRoleMechanicsV7(view, unit).capacitySlots === 1 &&
      unitRoleMechanicsV7(view, unit).movementMode !== "FLY" &&
      view.cities.some(
        (city) => city.ownerId === view.viewer.id && near(city.at, unit.at),
      ),
  );
  return passengers.length === 0
    ? BEAM_DOWN_NO_PASSENGER_V7
    : BEAM_DOWN_NO_TILE_V7;
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
      parts.push(
        `${owner(event.playerId)} ${martianLabelV7("RAIDER")} beamed down a ${name}`,
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
      parts.push(`${name} returned to ${possessive(after, event.toPlayerId)}`);
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
      parts.push(
        `${owner(source.ownerId)} ${martianLabelV7("KNIGHT")} pulled ${targetName}`,
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
export const FORCE_FIELDS_UNLOCK_TEXT_V7 =
  "Shields also recharge at the end of your turn";
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
