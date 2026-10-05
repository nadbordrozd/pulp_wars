import {
  ALPHA_ATTACK2_V7,
  EGG_HP_V7,
  GROWTH_HP_V7,
  GROWTH_KILLS_V7,
  MILITIA_FIGHTERS_V7,
  PROMOTION_HP_V7,
  PROMOTION_KILLS_V7,
  RUN_UP_MAXIMUM_TILES_V7,
  UNIT_ROLE_IDS_V7,
  attackIsChargeV7,
  effectiveRoleRuleV7,
  factionTreeV7,
  isEggLaidRoleV7,
  unitFactionV7,
  roleMechanicsV7,
  seatRoleRuleV7,
  unitRoleRuleV7,
  type CombatPreviewV7,
  type FactionIdV7,
  type LayEggPreviewV7,
  type PlayerEventV7,
  type PlayerViewV7,
  type PublicDinosaurMechanicsV7,
  type UnitRoleIdV7,
} from "../engine/index";
import { technologyNameV7 } from "./goblin-presentation-v7";

/**
 * Presentation helpers for revision 19 Dinosaurs (spec section 12) as
 * amended by revision 20 (docs/product/RULESET_7_REVISION_20.md section
 * 7.2: Charge!, Nesting, Wallbreaker, full-heal growth). Every helper reads
 * only public views, public previews, and projected player events. A match
 * without a Dinosaur seat never reaches a code path that changes its
 * revision-18 presentation, except the Promote text (`PROMOTE_TOOLTIP_V7`).
 */

type PublicUnitV7 = PlayerViewV7["units"][number];

/** True exactly when a seat of the match plays the Dinosaur faction. */
export function matchHasDinosaurV7(
  view: Pick<PlayerViewV7, "players">,
): boolean {
  return view.players.some((player) => player.faction === "DINOSAUR");
}

/** Whether a visible unit is of the Dinosaur kind (`unitFactionV7`). */
export function unitIsDinosaurV7(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "id" | "ownerId">,
): boolean {
  return unitFactionV7(view, unit) === "DINOSAUR";
}

/** Section 12.2 texts. */
export const LAY_EGG_LABEL_V7 = "Lay Egg";
export const LAY_EGG_PROMPT_V7 = "Choose a tile next to the city for the Egg";
export const LAY_EGG_NO_TILE_V7 = "No free tile next to the city";
export const HATCH_LABEL_V7 = "Hatch";
export const HATCH_TOOLTIP_V7 =
  "Hatch an adjacent Egg laid on an earlier turn. The new unit cannot act this turn.";
/** Bead pulp_wars-9im: several Eggs in reach are picked on the board. */
export const HATCH_PICK_V7 = "Choose a highlighted Egg";
export const HATCH_NEW_EGG_V7 =
  "This Egg was laid this turn; it can be hatched from your next turn";
export const ABANDON_EGG_LABEL_V7 = "Abandon Egg";
/** Revision 20: the Triceratops's passive ability (`LINEBREAKER`). */
export const CHARGE_LABEL_V7 = "Charge!";
export const CHARGE_IGNORES_FORTIFICATION_V7 = "Ignores fortification";
export const WALLBREAKER_PREVIEW_V7 = "Wallbreaker: ignores City Walls";
export const CHARGE_DESTROYS_FIELD_DEFENSE_V7 = "Destroys Field Defense";
export const ACID_PREVIEW_V7 = "Acid: ignores cover and fortification";
export const DINOSAUR_FIELD_DEFENSE_EXPLANATION_V7 =
  "Dinosaurs cannot build Field Defense";
export const WAR_DRUMS_LABEL_V7 = "War Drums";
export const RAMPAGE_LABEL_V7 = "Rampage";
export const POUNCE_LABEL_V7 = "Pounce";
export const GROWTH_STAGE_LABELS_V7 = ["Big", "Alpha"] as const;

/** "Big" for stage 1 and "Alpha" for stage 2. */
export function growthStageLabelV7(stage: 1 | 2): string {
  return GROWTH_STAGE_LABELS_V7[stage === 1 ? 0 : 1];
}

function plural(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

/**
 * Every number in the Dinosaur texts comes from the registry (the balance
 * beads may tune hatch times, slots, costs, HP, Attack, the Egg, growth,
 * Nesting and the Charge! run-up), so no sentence goes stale.
 */
const dinosaurLabel = (role: UnitRoleIdV7): string =>
  effectiveRoleRuleV7(role, "DINOSAUR").label;

/** "A", "A or B", "A, B, or C". */
function joinOr(names: readonly string[]): string {
  if (names.length <= 2) return names.join(" or ");
  return `${names.slice(0, -1).join(", ")}, or ${names.at(-1) ?? ""}`;
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four"] as const;
const numberWord = (value: number): string =>
  NUMBER_WORDS[value] ?? String(value);

/** The Dinosaur roles that use more than one capacity slot, in role order. */
export function bigBodyRolesV7(): readonly UnitRoleIdV7[] {
  return UNIT_ROLE_IDS_V7.filter(
    (role) => roleMechanicsV7(role, "DINOSAUR").capacitySlots > 1,
  );
}

/** The largest slot count of a Dinosaur role (2 in the contract). */
function bigBodySlots(): number {
  return Math.max(
    1,
    ...UNIT_ROLE_IDS_V7.map(
      (role) => roleMechanicsV7(role, "DINOSAUR").capacitySlots,
    ),
  );
}

/** Whole Attack a Charge! gains per tile moved (the Triceratops's). */
export function chargeRunUpBonusV7(): number {
  return (
    Math.max(
      ...UNIT_ROLE_IDS_V7.map(
        (role) => roleMechanicsV7(role, "DINOSAUR").runUpBonus2,
      ),
    ) / 2
  );
}

/** The most whole Attack a Charge! run-up can add ("up to +2"). */
export function chargeRunUpMaximumV7(): number {
  return chargeRunUpBonusV7() * RUN_UP_MAXIMUM_TILES_V7;
}

/** The Dinosaur tree's Nesting unlock (Egg HP, hatch turns, city slots). */
function nestingUnlock(): {
  readonly eggHp: number;
  readonly hatchTurns: number;
  readonly citySlots: number;
} {
  for (const node of factionTreeV7("DINOSAUR").nodes)
    for (const unlock of node.unlocks)
      if (unlock.kind === "NESTING") return unlock;
  return { eggHp: 0, hatchTurns: 0, citySlots: 0 };
}

/** HP an Egg gains from Nesting, from the Dinosaur tree's unlock. */
export function nestingEggHpBonusV7(): number {
  return nestingUnlock().eggHp;
}

/** Unit slots every city gains from Nesting (revision 20). */
export function nestingCitySlotsV7(): number {
  return nestingUnlock().citySlots;
}

/** Section 4.3 unlock text of Nesting, from the registry. */
export function nestingUnlockTextV7(): string {
  const unlock = nestingUnlock();
  return `Eggs have +${unlock.eggHp} HP and hatch ${numberWord(unlock.hatchTurns)} turn sooner; +${unlock.citySlots} unit slot in every city`;
}

/** Section 4.3 unlock text of Wallbreaker. */
export const WALLBREAKER_UNLOCK_TEXT_V7 = "Dinosaurs ignore City Walls";

/**
 * Section 7.2 "Promote command": the Promotion's maximum HP and full heal
 * (every faction).
 */
export const PROMOTE_TOOLTIP_V7 = `Promote: +${PROMOTION_HP_V7} maximum HP and a full heal`;

/**
 * Section 7.2 Help line "Promotion", shown in "How to play" in every match
 * (Promotion is a rule of every faction).
 */
export const PROMOTION_HELP_TIP_V7 = `Promotion: a unit with ${PROMOTION_KILLS_V7} kills can be promoted once: +${PROMOTION_HP_V7} maximum HP and a full heal.`;

/** HP of each growth stage, and an Alpha's extra whole Attack. */
const GROWTH_HP = GROWTH_HP_V7;
const ALPHA_ATTACK = ALPHA_ATTACK2_V7 / 2;

/** "Big after 1 kill (+4 HP)" and the Alpha clause, from the registry. */
function growthRuleText(): string {
  return `Big after ${plural(GROWTH_KILLS_V7[0], "kill")} (+${GROWTH_HP} HP)`;
}
function alphaRuleText(): string {
  return `Alpha after ${plural(GROWTH_KILLS_V7[1], "kill")} (+${GROWTH_HP} more HP and +${ALPHA_ATTACK} Attack)`;
}

/**
 * Section 7.2 "Unit info (Triceratops)": the Charge! rule in one line, with
 * the run-up numbers from the registry.
 */
export const CHARGE_DESCRIPTION_V7 = `+${chargeRunUpBonusV7()} Attack per tile moved this turn (up to +${chargeRunUpMaximumV7()}). Ignores Walls and Field Defense, destroys Field Defense, and pushes back.`;

/** The Armoured reduction of the Dinosaur registration (1). */
const ARMOUR_REDUCTION = Math.max(
  ...UNIT_ROLE_IDS_V7.map(
    (role) => roleMechanicsV7(role, "DINOSAUR").armourReduction,
  ),
);

/** Section 12.2 "Attack preview (Armoured)": "Armoured −1". */
export const ARMOURED_PREVIEW_V7 = `Armoured −${ARMOUR_REDUCTION}`;

/** The growth chip's tooltip: when a Dinosaur unit grows and what it gains. */
export function growthTooltipV7(): string {
  return `Grows when it kills: ${growthRuleText()}, ${alphaRuleText()}`;
}

/** The slot-capacity stat's tooltip, naming the roles that take more. */
export function slotCapacityTooltipV7(): string {
  const bigBodies = bigBodyRolesV7().map(dinosaurLabel);
  return bigBodies.length === 0
    ? "Unit slots used in this city"
    : `Unit slots used in this city; a ${joinOr(bigBodies)} takes ${bigBodySlots()}`;
}

/**
 * The Dinosaur names of the two unit rewards (section 9.8): Militia grants
 * the registry's number of Cavemen, and the giant is the Brontosaurus, with
 * its slots when it takes more than one. Null for every other reward.
 */
export function dinosaurRewardLabelV7(
  reward: string,
): readonly [string, string] | null {
  if (reward === "MILITIA") {
    const label = dinosaurLabel("FIGHTER");
    const count: number = MILITIA_FIGHTERS_V7.DINOSAUR;
    const many = label.endsWith("man")
      ? `${label.slice(0, -3)}men`
      : `${label}s`;
    const word = numberWord(count);
    return [
      "Militia",
      count === 1
        ? `A free ${label}`
        : `${word.charAt(0).toUpperCase()}${word.slice(1)} free ${many}`,
    ];
  }
  if (reward === "JUGGERNAUT") {
    const slots = roleMechanicsV7("JUGGERNAUT", "DINOSAUR").capacitySlots;
    return [
      dinosaurLabel("JUGGERNAUT"),
      slots > 1 ? `A giant unit (${slotsTextV7(slots)})` : "A giant unit",
    ];
  }
  return null;
}

/**
 * Section 12.3: one sentence per rule, shown in Help in Dinosaur matches.
 * With the contract values these are the spec's sentences word for word.
 */
export function dinosaurHelpRulesV7(): readonly (readonly [string, string])[] {
  const bigBodies = bigBodyRolesV7().map(dinosaurLabel);
  const armoured = UNIT_ROLE_IDS_V7.filter(
    (role) => roleMechanicsV7(role, "DINOSAUR").armourReduction > 0,
  );
  const armour = Math.max(
    0,
    ...armoured.map(
      (role) => roleMechanicsV7(role, "DINOSAUR").armourReduction,
    ),
  );
  return [
    [
      "Eggs",
      "Dinosaurs are not trained: the city lays an Egg on a tile next to it, and the Egg hatches into a full-strength unit after its hatch time.",
    ],
    [
      "Egg weakness",
      `an Egg cannot move or fight and has only ${EGG_HP_V7} HP, so enemies can smash it before it hatches, and all Eggs of a captured city are lost.`,
    ],
    ...(bigBodies.length === 0
      ? []
      : ([
          [
            "Big bodies",
            `a ${joinOr(bigBodies)} takes ${numberWord(bigBodySlots())} unit slots in its city.`,
          ],
        ] as const)),
    [
      "Grow",
      `a Dinosaur grows when it kills: ${growthRuleText()} and ${alphaRuleText()}, for good; each growth fully heals it.`,
    ],
    [
      CHARGE_LABEL_V7,
      `a ${dinosaurLabel("CATAPULT")} hits harder the farther it moved this turn (+${chargeRunUpBonusV7()} Attack per tile, up to +${chargeRunUpMaximumV7()}); its attack ignores Walls and Field Defense, destroys Field Defense, and pushes a surviving defender back, taking its place.`,
    ],
    [
      "Acid",
      `a ${dinosaurLabel("MARKSMAN")}'s attack ignores Forest and Mountain cover, Walls, and Field Defense.`,
    ],
    ...(armoured.length === 0
      ? []
      : ([
          [
            "Armoured",
            `an ${joinOr(armoured.map(dinosaurLabel))} takes ${armour} less damage from every hit, to a minimum of 1.`,
          ],
        ] as const)),
    [
      "Hatch",
      `a ${dinosaurLabel("CAPTAIN")} can hatch an adjacent Egg at once, but not on the turn the Egg was laid; the new unit cannot act that turn.`,
    ],
    [
      "Nesting",
      `with Nesting, Eggs have +${nestingEggHpBonusV7()} HP and hatch one turn sooner, and every city has ${numberWord(nestingCitySlotsV7())} more unit slot.`,
    ],
    [
      "Wallbreaker",
      "with Wallbreaker, dinosaurs ignore City Walls when they attack.",
    ],
    ["Wild", "Dinosaurs cannot build Field Defense."],
    [
      "Rampage, Pounce, War Drums",
      `a ${dinosaurLabel("KNIGHT")} attacks again after a kill, a ${dinosaurLabel("RAIDER")} gets +1 Attack after moving two tiles, and a ${dinosaurLabel("CAPTAIN")} gives adjacent units +1 Attack on their next attack.`,
    ],
  ];
}

export const DINOSAUR_HELP_RULES_V7: readonly (readonly [string, string])[] =
  dinosaurHelpRulesV7();

/** "1 turn", "2 turns". */
export function turnsTextV7(turns: number): string {
  return plural(turns, "turn");
}

/** "1 slot", "2 slots". */
export function slotsTextV7(slots: number): string {
  return plural(slots, "slot");
}

/** Section 12.2 "City capacity": "{used} of {capacity} slots". */
export function cityCapacityTextV7(used: number, capacity: number): string {
  return `${used} of ${capacity} slots`;
}

/** A unit's name under its kind's registration; an Egg is "{Unit} Egg". */
export function unitDisplayNameV7(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "id" | "ownerId" | "role" | "form">,
): string {
  const label = unitRoleRuleV7(view, unit).label;
  return unit.form === "EGG" ? `${label} Egg` : label;
}

/** The public countdown of a visible Egg, or null for any other unit. */
export function eggTurnsRemainingV7(
  view: PlayerViewV7,
  unitId: number,
): number | null {
  return (
    view.eggs.find((entry) => entry.unitId === unitId)?.turnsRemaining ?? null
  );
}

/** Section 12.2 "Egg info". */
export function eggInfoTextV7(unitLabel: string, turns: number): string {
  return `Hatches into a ${unitLabel} in ${turnsTextV7(turns)}. Cannot move or fight.`;
}

/** Section 12.2 "Egg countdown tooltip". */
export function eggCountdownTextV7(turns: number): string {
  return `Hatches in ${turnsTextV7(turns)}`;
}

/** Section 12.2 "Abandon Egg tooltip". */
export function abandonEggTooltipV7(coins: number): string {
  return `Remove this Egg for ${coins} Coins`;
}

/** The refund of an abandoned Egg: half the printed cost of the role inside. */
export function eggRefundV7(role: UnitRoleIdV7, faction: FactionIdV7): number {
  return Math.floor((effectiveRoleRuleV7(role, faction).cost ?? 0) / 2);
}

/** The egg-laid roles of `faction` in role order (empty unless Dinosaur). */
export function eggLaidRolesV7(
  roles: readonly UnitRoleIdV7[],
  faction: FactionIdV7,
): readonly UnitRoleIdV7[] {
  return roles.filter((role) => isEggLaidRoleV7(role, faction));
}

/** Section 12.2 "Lay Egg row". */
export function layEggRowTextV7(
  unitLabel: string,
  preview: Pick<LayEggPreviewV7, "cost" | "slots" | "turnsToHatch">,
): string {
  return `${unitLabel} Egg: ${preview.cost} Coins, ${slotsTextV7(preview.slots)}, hatches in ${turnsTextV7(preview.turnsToHatch)}`;
}

/**
 * Why a Lay Egg card is disabled (section 12.2), or null when the preview
 * reports no rejection.
 */
export function layEggUnavailableTextV7(
  preview: LayEggPreviewV7,
  faction: FactionIdV7,
): string | null {
  switch (preview.unavailableReason) {
    case null:
      return null;
    case "CITY_ACTION_SPENT":
      return "City action spent";
    case "CITY_BESIEGED":
      return "The city is besieged";
    case "CITY_REWARD_PENDING":
      return "Choose the city reward first";
    case "TECH_REQUIRED": {
      const tech = effectiveRoleRuleV7(preview.role, faction).technology;
      return tech === null
        ? "Not available"
        : `Needs ${technologyNameV7(tech, faction)}`;
    }
    case "INVALID_TILE":
      return LAY_EGG_NO_TILE_V7;
    case "CITY_CAPACITY_FULL":
      return `Needs ${preview.slots} free ${preview.slots === 1 ? "slot" : "slots"}`;
    case "INSUFFICIENT_COINS":
      return `Needs ${preview.cost} Coins`;
  }
}

/** Dinosaur ability names; other factions' names are unchanged. */
export function dinosaurAbilityNameV7(
  ability: string,
  faction: FactionIdV7,
): string | null {
  if (faction !== "DINOSAUR") return null;
  switch (ability) {
    case "RALLY":
      return WAR_DRUMS_LABEL_V7;
    case "OVERRUN":
      return RAMPAGE_LABEL_V7;
    case "CHARGE":
      return POUNCE_LABEL_V7;
    case "LINEBREAKER":
      return CHARGE_LABEL_V7;
    case "HATCH":
      return HATCH_LABEL_V7;
    case "ACID":
      return "Acid";
    case "ARMOURED":
      return "Armoured";
    case "GROW":
      return "Grows";
    default:
      return null;
  }
}

export function dinosaurAbilityDescriptionV7(
  ability: string,
  faction: FactionIdV7,
): string | null {
  if (faction !== "DINOSAUR") return null;
  switch (ability) {
    case "RALLY":
      return "Adjacent friendly land troops, except Shamans and Triceratopses, get +1 Attack on their next attack this turn.";
    case "OVERRUN":
      return "After a kill, advances and can attack another adjacent enemy.";
    case "CHARGE":
      return "With Raiding, +1 Attack on the first Attack after moving 2+ cells.";
    case "LINEBREAKER":
      return CHARGE_DESCRIPTION_V7;
    case "HATCH":
      return HATCH_TOOLTIP_V7;
    case "ACID":
      return "Its attacks ignore Forest and Mountain cover, Walls, and Field Defense.";
    case "ARMOURED":
      return `Takes ${ARMOUR_REDUCTION} less damage from every hit, to a minimum of 1.`;
    case "GROW":
      return `${growthRuleText()}; ${alphaRuleText()}, for good. Growing fully heals.`;
    default:
      return null;
  }
}

/**
 * Dinosaur command labels: Lay Egg and Hatch for every viewer, and War Drums
 * for a Dinosaur viewer's Rally.
 */
export function dinosaurCommandLabelV7(
  kind: string,
  faction: FactionIdV7,
): string | null {
  if (kind === "LAY_EGG") return LAY_EGG_LABEL_V7;
  if (kind === "HATCH") return HATCH_LABEL_V7;
  if (kind === "RALLY" && faction === "DINOSAUR") return WAR_DRUMS_LABEL_V7;
  return null;
}

/** Section 12.2 "Growth unit info" for a growing unit's stage. */
export function growthInfoTextV7(killsToNextStage: number | null): string {
  return `Big: +${GROWTH_HP} HP. Alpha: +${GROWTH_HP * 2} HP, +${ALPHA_ATTACK} Attack. Growing fully heals. ${
    killsToNextStage === null
      ? "Fully grown."
      : `Next stage in ${plural(killsToNextStage, "kill")}.`
  }`;
}

/** The dock chip of a growing unit: its stage and the kills to the next. */
export function growthChipTextV7(
  stage: 0 | 1 | 2,
  killsToNextStage: number | null,
): string {
  if (stage === 2 || killsToNextStage === null) return "Alpha";
  const kills = plural(killsToNextStage, "kill");
  return stage === 1 ? `Big · ${kills} to Alpha` : `Grows · ${kills} to Big`;
}

/** One line of Dinosaur unit information (section 12.2 "Unit info"). */
export interface DinosaurUnitInfoLineV7 {
  readonly id: "growth" | "slots" | "no-field-defense";
  readonly name: string;
  readonly description: string;
}

/**
 * Unit info lines from the public Dinosaur mechanics (`stats.dinosaur`) that
 * are not abilities: the growth stage with the kills to the next one, a
 * two-slot body, and the Field Defense restriction of the Caveman and the
 * Ankylosaurus. Boats and Eggs get none.
 */
export function dinosaurUnitInfoLinesV7(
  role: UnitRoleIdV7,
  mechanics: PublicDinosaurMechanicsV7,
): readonly DinosaurUnitInfoLineV7[] {
  if (role === "PATROL_BOAT" || role === "BATTLESHIP" || mechanics.egg !== null)
    return [];
  const lines: DinosaurUnitInfoLineV7[] = [];
  if (mechanics.growthStage !== null)
    lines.push({
      id: "growth",
      name:
        mechanics.growthStage === 0
          ? "Growth"
          : growthStageLabelV7(mechanics.growthStage),
      description: growthInfoTextV7(mechanics.killsToNextStage),
    });
  if (mechanics.capacitySlots > 1)
    lines.push({
      id: "slots",
      name: "Big body",
      description: `Takes ${slotsTextV7(mechanics.capacitySlots)} in its city.`,
    });
  if (roleMechanicsV7(role, "ORIGINAL").buildsFieldDefense)
    lines.push({
      id: "no-field-defense",
      name: "Wild",
      description: DINOSAUR_FIELD_DEFENSE_EXPLANATION_V7,
    });
  return lines;
}

/** Recruit-help notes of a Dinosaur role, from its registration. */
export function dinosaurRecruitNotesV7(
  role: UnitRoleIdV7,
  faction: FactionIdV7,
): readonly string[] {
  if (faction !== "DINOSAUR" || role === "PATROL_BOAT" || role === "BATTLESHIP")
    return [];
  const mechanics = roleMechanicsV7(role, faction);
  return [
    ...(mechanics.hatchTurns === null
      ? []
      : [
          `Laid as an Egg next to the city; hatches after ${turnsTextV7(mechanics.hatchTurns)} (one sooner with Nesting, at least 1).`,
        ]),
    ...(mechanics.capacitySlots > 1
      ? [`Takes ${slotsTextV7(mechanics.capacitySlots)} in its city.`]
      : []),
    ...(roleMechanicsV7(role, "ORIGINAL").buildsFieldDefense
      ? [`${DINOSAUR_FIELD_DEFENSE_EXPLANATION_V7}.`]
      : []),
  ];
}

const FIELD_DEFENSE_BLOCK_CACHE = new WeakMap<PlayerViewV7, Set<number>>();

/**
 * Section 12.1: an own Caveman or Ankylosaurus where a Human Fighter or
 * Guard would be offered Build Field Defense (Fortification, own territory
 * land tile, not moved, primary action unused, no Field Defense yet, 3
 * Coins).
 */
export function dinosaurFieldDefenseBlockedV7(
  view: PlayerViewV7,
  unitId: number,
): boolean {
  if (view.viewer.faction !== "DINOSAUR") return false;
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
 * The own Eggs next to the viewer's own Shaman `unitId` that were laid this
 * turn, so Hatch is not offered for them (section 6.5). Empty for any other
 * unit, or once the Shaman has used its primary action.
 */
export function hatchBlockedEggsV7(
  view: PlayerViewV7,
  unitId: number,
): readonly PublicUnitV7[] {
  const unit = view.units.find((candidate) => candidate.id === unitId);
  if (
    unit === undefined ||
    unit.ownerId !== view.viewer.id ||
    unit.form !== "LAND" ||
    view.turnOrder[view.activeSeatIndex] !== view.viewer.id ||
    !unitRoleRuleV7(view, unit).abilities.includes("HATCH") ||
    unit.activation.attacked ||
    unit.activation.specialActed ||
    unit.activation.recovered ||
    unit.activation.handled
  )
    return [];
  const laidNow = new Set(
    view.eggs
      .filter((entry) => entry.laidThisTurn)
      .map((entry) => entry.unitId),
  );
  return view.units.filter(
    (egg) =>
      egg.form === "EGG" &&
      egg.ownerId === unit.ownerId &&
      laidNow.has(egg.id) &&
      Math.max(
        Math.abs(egg.at.x - unit.at.x),
        Math.abs(egg.at.y - unit.at.y),
      ) === 1,
  );
}

/** "your" for the viewer, otherwise "Player N's". */
function possessive(view: PlayerViewV7, playerId: number): string {
  if (playerId === view.viewer.id) return "your";
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player === undefined ? "an enemy" : `Player ${player.seat + 1}'s`;
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Revision 20 section 7.2: the Charge! and Wallbreaker lines of an attack
 * preview, in order: "Charge +{n}", "Ignores fortification" or
 * "Wallbreaker: ignores City Walls", the Push ("Pushes back; {unit}
 * follows", "Pushes back", "{unit} cannot be pushed", or "{unit} may be
 * pushed back"), and "Destroys Field Defense". Empty for an attack without
 * any of them.
 */
export function chargePreviewLinesV7(
  view: PlayerViewV7,
  preview: CombatPreviewV7,
): readonly string[] {
  const attacker = view.units.find((unit) => unit.id === preview.attackerId);
  const target = view.units.find((unit) => unit.id === preview.targetUnitId);
  if (attacker === undefined) return [];
  const charge = attackIsChargeV7(view, attacker);
  const lines: string[] = [];
  if (preview.runUp > 0) lines.push(`Charge +${preview.runUp}`);
  // A heat ray's ignored fortification is the Martian Disintegrator, which
  // the Martian preview lines name (bead pulp_wars-t6s.4).
  if (preview.fortificationIgnored > 0 && preview.rayPower === "NONE")
    lines.push(
      charge ? CHARGE_IGNORES_FORTIFICATION_V7 : WALLBREAKER_PREVIEW_V7,
    );
  if (!charge) return lines;
  const actorName = unitDisplayNameV7(view, attacker);
  const targetName =
    target === undefined ? "The unit" : unitDisplayNameV7(view, target);
  if (!preview.defenderDies && target?.form !== "EGG")
    lines.push(
      preview.push === "WILL_PUSH"
        ? preview.advances
          ? `Pushes back; ${actorName} follows`
          : "Pushes back"
        : preview.push === "UNKNOWN_BEHIND_FOG"
          ? `${targetName} may be pushed back`
          : `${targetName} cannot be pushed`,
    );
  const tile =
    target === undefined
      ? undefined
      : view.board.tiles.find(
          (candidate) =>
            candidate.at.x === target.at.x && candidate.at.y === target.at.y,
        );
  if (tile?.explored === true && tile.fieldDefense)
    lines.push(CHARGE_DESTROYS_FIELD_DEFENSE_V7);
  return lines;
}

/**
 * Short canvas note for the Charge!, Wallbreaker, Acid and Armoured outcomes
 * of an attack preview (revision 19 section 12.2, revision 20 section 7.2).
 * It is null for every exchange without them, so matches without a Dinosaur
 * seat are unchanged.
 */
export function dinosaurCombatNoteV7(
  preview: CombatPreviewV7,
  view: PlayerViewV7,
): string | null {
  const parts = [
    ...chargePreviewLinesV7(view, preview),
    ...(preview.acid ? [ACID_PREVIEW_V7] : []),
    ...(preview.defenderArmoured ? [ARMOURED_PREVIEW_V7] : []),
    ...(preview.attackerArmoured ? ["Your armour −1"] : []),
  ];
  return parts.length === 0 ? null : parts.join(" · ");
}

/** Screen-reader sentences for the same outcomes. */
export function dinosaurCombatSemanticNoteV7(
  preview: CombatPreviewV7,
  view: PlayerViewV7,
): string | null {
  const parts = [
    ...chargePreviewLinesV7(view, preview).map((line) => `${line}.`),
    ...(preview.acid
      ? ["Acid ignores the defender's cover and fortification."]
      : []),
    ...(preview.defenderArmoured
      ? ["Armoured lowers the damage dealt by 1."]
      : []),
    ...(preview.attackerArmoured
      ? ["Armoured lowers the damage taken by 1."]
      : []),
  ];
  return parts.length === 0 ? null : parts.join(" ");
}

/**
 * Log and toast text for revision-19 events of one projected boundary
 * (section 12.2): Eggs laid, hatched, destroyed and lost with a city, and
 * growth. A match without a Dinosaur seat never emits these events, so its
 * notices are unchanged.
 */
export function dinosaurBoundaryNoticeV7(
  events: readonly PlayerEventV7[],
  before: PlayerViewV7,
  after: PlayerViewV7,
): { readonly text: string; readonly toast: boolean } | null {
  if (!matchHasDinosaurV7(after)) return null;
  const viewerId = after.viewer.id;
  const parts: string[] = [];
  let toast = false;
  const unitById = (id: number): PublicUnitV7 | undefined =>
    after.units.find((unit) => unit.id === id) ??
    before.units.find((unit) => unit.id === id);
  const roleLabel = (
    ownerId: PublicUnitV7["ownerId"],
    role: UnitRoleIdV7,
  ): string => seatRoleRuleV7(after, ownerId, role).label;
  const owned = (ownerId: number, label: string): string =>
    `${capitalized(possessive(after, ownerId))} ${label}`;
  const eggsLostByCity = new Map<number | null, PublicUnitV7[]>();
  for (const event of events) {
    if (event.kind === "EGG_LAID") {
      if (event.playerId === viewerId) toast = true;
      const who =
        event.playerId === viewerId
          ? "You"
          : capitalized(possessive(after, event.playerId)).replace(/'s$/, "");
      parts.push(`${who} laid a ${roleLabel(event.playerId, event.role)} Egg`);
    } else if (event.kind === "EGG_HATCHED") {
      if (event.playerId === viewerId) toast = true;
      parts.push(
        `${owned(event.playerId, roleLabel(event.playerId, event.role))} hatched`,
      );
    } else if (event.kind === "UNIT_DIED") {
      const egg = before.units.find((unit) => unit.id === event.unitId);
      if (egg === undefined || egg.form !== "EGG") continue;
      toast = true;
      if (event.cause === "CITY_CAPTURED") {
        // An Egg always stands in its home city's territory (section 6.1).
        const tile = before.board.tiles.find(
          (candidate) =>
            candidate.at.x === egg.at.x && candidate.at.y === egg.at.y,
        );
        const homeCityId =
          egg.homeCityId ??
          (tile?.explored === true ? tile.territoryCityId : null);
        eggsLostByCity.set(homeCityId, [
          ...(eggsLostByCity.get(homeCityId) ?? []),
          egg,
        ]);
      } else
        parts.push(
          `${owned(egg.ownerId, unitDisplayNameV7(before, egg))} was destroyed`,
        );
    } else if (event.kind === "UNIT_GREW") {
      const unit = unitById(event.unitId);
      if (unit === undefined) continue;
      if (unit.ownerId === viewerId) toast = true;
      parts.push(
        `${owned(unit.ownerId, unitRoleRuleV7(after, unit).label)} grew: ${growthStageLabelV7(event.stage)}`,
      );
    }
  }
  for (const [cityId, eggs] of eggsLostByCity) {
    const city = before.cities.find((candidate) => candidate.id === cityId);
    const owner = eggs[0]?.ownerId;
    const cityName =
      city === undefined || owner === undefined
        ? "a captured city"
        : `${possessive(after, owner)} ${city.isCapital ? "Capital" : "City"}`;
    parts.push(
      `${eggs.length} ${eggs.length === 1 ? "Egg was" : "Eggs were"} lost with ${cityName}`,
    );
  }
  return parts.length === 0 ? null : { text: parts.join(" · "), toast };
}
