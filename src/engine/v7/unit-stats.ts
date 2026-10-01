import {
  ALPHA_ATTACK2_V7,
  EMBARKED_MOVE_V7,
  GROWTH_KILLS_V7,
  technologyCapabilitiesV7,
  unitAlphaAttack2V7,
  unitGrowthStageV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
} from "../rules/ruleset-v7";
import { defenseBonusForUnitV7, fortificationLevelForUnitV7 } from "./combat";
import { tileAtV7 } from "./spatial-economy";
import type { GameStateV7, UnitStateV7 } from "./types";

export const UNIT_STAT_IDS_V7 = Object.freeze([
  "HP",
  "ATTACK",
  "DEFENSE",
  "MOVE",
  "RANGE",
  "SIGHT",
] as const);
export type UnitStatIdV7 = (typeof UNIT_STAT_IDS_V7)[number];
export type UnitStatModifierSourceV7 =
  | "PROMOTION"
  // Revision 19: growth HP of a Big or Alpha unit, and Alpha's +1 Attack.
  | "GROWTH"
  | "ALPHA"
  | "CHARGE"
  | "INSPIRED"
  | "CITY_WALLS"
  | "CITY_FORTIFICATION"
  | "FIELD_DEFENSE"
  | "MOUNTAIN"
  | "FOREST"
  | "HIGH_GROUND";
export interface PublicUnitStatValueV7 {
  readonly numerator: number;
  readonly denominator: number;
}
export interface PublicUnitStatTermV7 {
  readonly value: PublicUnitStatValueV7;
  readonly source: "ROLE_BASE" | UnitStatModifierSourceV7;
  readonly sourceLabel: string;
  readonly description: string;
}
export interface PublicUnitStatBreakdownV7 {
  readonly id: UnitStatIdV7;
  readonly label: string;
  readonly current: number | null;
  readonly base: PublicUnitStatTermV7;
  readonly modifiers: readonly PublicUnitStatTermV7[];
  readonly total: PublicUnitStatValueV7;
  /** Omitted means the exact historical contract; BASE_ONLY redacts position. */
  readonly visibility?: "BASE_ONLY";
}
/**
 * Revision 17 Goblin role mechanics from the owner's registration: Kaboom
 * and death-blast damage (null when the role has none), the WAAAGH! radius
 * (0 without Rally), Start Turn regeneration, and whether the role may build
 * Field Defense.
 */
export interface PublicGoblinMechanicsV7 {
  readonly kaboomDamage: number | null;
  readonly deathBlastDamage: number | null;
  readonly rallyRadius: number;
  readonly regeneration: number;
  readonly buildsFieldDefense: boolean;
}
/**
 * Revision 19 Dinosaur role mechanics and growth from the owner's
 * registration: capacity slots, the growth stage (null for a role that does
 * not grow) and the kills still needed for the next stage (null at Alpha or
 * for a role that does not grow), the Armoured reduction, Acid, the Stampede
 * run bonus in whole Attack per lane tile, and the Egg countdown (null for a
 * unit that is not an Egg).
 */
export interface PublicDinosaurMechanicsV7 {
  readonly capacitySlots: number;
  readonly growthStage: 0 | 1 | 2 | null;
  readonly killsToNextStage: number | null;
  readonly armourReduction: number;
  readonly acid: boolean;
  readonly stampedeRunBonus: number;
  readonly egg: {
    readonly turnsRemaining: number;
    readonly hatchesAs: UnitStateV7["role"];
  } | null;
}
export interface PublicUnitStatsV7 {
  readonly unitId: UnitStateV7["id"];
  readonly minimumRange: number;
  readonly maximumRange: number;
  readonly stats: readonly PublicUnitStatBreakdownV7[];
  readonly abilities: readonly string[];
  readonly statuses: readonly string[];
  /** Revision 17: present exactly for units owned by a Goblin seat. */
  readonly goblin?: PublicGoblinMechanicsV7;
  /** Revision 19: present exactly for units owned by a Dinosaur seat. */
  readonly dinosaur?: PublicDinosaurMechanicsV7;
}

export function publicUnitStatsV7(
  state: GameStateV7,
  unit: UnitStateV7,
): PublicUnitStatsV7 {
  const role = unitRoleRuleV7(state, unit);
  const embarked = unit.form === "EMBARKED";
  const owner = state.players.find((player) => player.id === unit.ownerId);
  if (owner === undefined) throw new RangeError("INVALID_STATE");
  const capabilities = technologyCapabilitiesV7(
    owner.researchedTechs,
    owner.faction,
  );
  // Revision 13: Undead support labels Rally as Frenzy and Inspired as Frenzied.
  const frenzied = owner.faction === "UNDEAD";
  // Revision 17: Goblins label Rally as WAAAGH! and Overrun as Ram.
  const goblin = owner.faction === "GOBLIN";
  // Revision 19: Dinosaurs label Rally as War Drums, Overrun as Rampage, and
  // Charge as Pounce.
  const dinosaur = owner.faction === "DINOSAUR";
  const mechanics = unitRoleMechanicsV7(state, unit);
  const growthStage = unitGrowthStageV7(state, unit);
  const alpha = embarked ? 0 : unitAlphaAttack2V7(state, unit);
  const promotion = unit.maxHp - role.maxHp;
  const charge =
    !embarked &&
    owner.researchedTechs.includes("RAIDING") &&
    role.abilities.includes("CHARGE") &&
    unit.activation.moved &&
    unit.activation.movedPathLength >= 2 &&
    unit.activation.attacksUsed === 0
      ? 2
      : 0;
  const inspired =
    !embarked && unit.activation.inspired && unit.activation.attacksUsed === 0
      ? 2
      : 0;
  const defense = defenseBonusForUnitV7(state, unit);
  const fortificationModifiers = fortificationTerms(state, unit);
  const fortifiedDefense2 =
    (embarked ? 2 : role.defense2) +
    fortificationModifiers.reduce(
      (sum, term) => sum + term.value.numerator * 2,
      0,
    );
  const terrainSource = defenseSourceAt(state, unit, defense.numerator);
  const defenseDelta = rational(
    fortifiedDefense2 * (defense.numerator - defense.denominator),
    2 * defense.denominator,
  );
  const highGround =
    tileAtV7(state.board, unit.at)?.terrain === "MOUNTAIN" &&
    capabilities.highGroundVisionRadiusBonus === 1;
  const sight = embarked
    ? 1
    : Math.max(role.sightRadius, capabilities.roleSightRadius[unit.role] ?? 0);
  const labelText = embarked ? "Embarked transport" : role.label;
  return {
    unitId: unit.id,
    minimumRange: embarked ? 0 : role.minimumRange,
    maximumRange: embarked ? 0 : role.range,
    stats: [
      stat(
        "HP",
        "HP",
        unit.hp,
        base(labelText, "maximum HP", role.maxHp),
        promotion > 0
          ? [
              growthStage === null
                ? modifier(
                    promotion,
                    "PROMOTION",
                    "Promotion",
                    "Promotion adds 5 maximum and current HP.",
                  )
                : modifier(
                    promotion,
                    "GROWTH",
                    "Growth",
                    "Each growth stage adds 4 maximum and current HP.",
                  ),
            ]
          : [],
      ),
      stat(
        "ATTACK",
        "Attack",
        null,
        base(labelText, "Attack", embarked ? 0 : role.attack2, 2),
        [
          ...(alpha > 0
            ? [
                modifier(
                  ALPHA_ATTACK2_V7,
                  "ALPHA",
                  "Alpha",
                  "An Alpha adds 1 Attack to every attack it makes.",
                  2,
                ),
              ]
            : []),
          ...(charge > 0
            ? [
                modifier(
                  charge,
                  "CHARGE",
                  dinosaur ? "Pounce" : "Charge",
                  dinosaur
                    ? "Pounce adds 1 Attack after an ordinary move of at least two cells."
                    : "Charge adds 1 Attack after an ordinary move of at least two cells.",
                  2,
                ),
              ]
            : []),
          ...(inspired > 0
            ? [
                modifier(
                  inspired,
                  "INSPIRED",
                  frenzied
                    ? "Frenzied"
                    : goblin
                      ? "WAAAGH!"
                      : dinosaur
                        ? "War Drums"
                        : "Inspired",
                  frenzied
                    ? "Necromancer Frenzy adds 1 Attack to the next attack this turn."
                    : goblin
                      ? "Orc Warboss WAAAGH! adds 1 Attack to the next attack this turn."
                      : dinosaur
                        ? "Shaman War Drums add 1 Attack to the next attack this turn."
                        : "Captain Rally adds 1 Attack to the next attack this turn.",
                  2,
                ),
              ]
            : []),
        ],
      ),
      stat(
        "DEFENSE",
        "Defense",
        null,
        base(labelText, "Defense", embarked ? 2 : role.defense2, 2),
        [
          ...fortificationModifiers,
          ...(terrainSource === null
            ? []
            : [
                modifier(
                  defenseDelta.numerator,
                  terrainSource,
                  label(terrainSource),
                  `${label(terrainSource)} multiplies Defense by 1.5.`,
                  defenseDelta.denominator,
                ),
              ]),
        ],
      ),
      stat(
        "MOVE",
        "Move",
        null,
        base(labelText, "Move", embarked ? EMBARKED_MOVE_V7 : role.move),
        [],
      ),
      stat(
        "RANGE",
        "Range",
        null,
        base(labelText, "Range", embarked ? 0 : role.range),
        [],
      ),
      stat(
        "SIGHT",
        "Sight",
        null,
        base(labelText, "Sight", sight),
        highGround
          ? [
              modifier(
                1,
                "HIGH_GROUND",
                "High ground",
                "Engineering adds 1 Sight while standing on a Mountain.",
              ),
            ]
          : [],
      ),
    ],
    abilities: embarked ? [] : role.abilities,
    statuses: [
      ...(unit.activation.inspired && unit.activation.attacksUsed === 0
        ? [
            frenzied
              ? "Frenzied: +1 next Attack"
              : goblin
                ? "WAAAGH!: +1 Attack on the next attack"
                : dinosaur
                  ? "War Drums: +1 Attack on the next attack"
                  : "Inspired: +1 next Attack",
          ]
        : []),
      ...(unit.activation.tendedThisTurn ? ["Tended this turn"] : []),
      ...(unit.activation.overrunActive
        ? [
            goblin
              ? "Ram: attack again"
              : dinosaur
                ? "Rampage: attack again"
                : "Overrun: attack again",
          ]
        : []),
      ...(unit.activation.escapeAvailable ? ["Escape: may move again"] : []),
    ],
    ...(goblin
      ? {
          goblin: {
            kaboomDamage: mechanics.kaboomDamage,
            deathBlastDamage: mechanics.deathBlastDamage,
            rallyRadius: role.abilities.includes("RALLY")
              ? mechanics.rallyRadius
              : 0,
            regeneration: mechanics.regeneration,
            buildsFieldDefense: mechanics.buildsFieldDefense,
          },
        }
      : {}),
    ...(dinosaur
      ? {
          dinosaur: {
            capacitySlots: mechanics.capacitySlots,
            growthStage,
            killsToNextStage:
              growthStage === null || growthStage === 2
                ? null
                : GROWTH_KILLS_V7[growthStage] - unit.kills,
            armourReduction: mechanics.armourReduction,
            acid: role.abilities.includes("ACID"),
            stampedeRunBonus: mechanics.stampedeRunBonus2 / 2,
            egg: eggStatus(state, unit),
          },
        }
      : {}),
  };
}

/** Revision 19: the public countdown of an Egg, or null for any other unit. */
function eggStatus(
  state: GameStateV7,
  unit: UnitStateV7,
): PublicDinosaurMechanicsV7["egg"] {
  if (unit.form !== "EGG") return null;
  const entry = state.eggs.find((candidate) => candidate.unitId === unit.id);
  return entry === undefined
    ? null
    : { turnsRemaining: entry.turnsRemaining, hatchesAs: unit.role };
}

function defenseSourceAt(
  state: GameStateV7,
  unit: UnitStateV7,
  numerator: number,
): UnitStatModifierSourceV7 | null {
  if (numerator === 1) return null;
  const terrain = tileAtV7(state.board, unit.at)?.terrain;
  return terrain === "MOUNTAIN"
    ? "MOUNTAIN"
    : terrain === "FOREST"
      ? "FOREST"
      : null;
}
function fortificationTerms(
  state: GameStateV7,
  unit: UnitStateV7,
): readonly PublicUnitStatTermV7[] {
  if (fortificationLevelForUnitV7(state, unit) === 0) return [];
  const tile = tileAtV7(state.board, unit.at);
  const city = state.cities.find(
    (candidate) =>
      candidate.ownerId === unit.ownerId && same(candidate.at, unit.at),
  );
  const terms: PublicUnitStatTermV7[] = [];
  if (
    city?.rewards.some(
      (reward) => reward.reachedLevel === 3 && reward.reward === "WALLS",
    )
  )
    terms.push(
      modifier(2, "CITY_WALLS", "City Walls", "City Walls add 2 Defense."),
    );
  if (tile?.fieldDefense)
    terms.push(
      modifier(
        1,
        "FIELD_DEFENSE",
        "Field defense",
        "Field defense adds 1 Defense.",
      ),
    );
  return terms;
}
function stat(
  id: UnitStatIdV7,
  labelText: string,
  current: number | null,
  baseTerm: PublicUnitStatTermV7,
  modifiers: readonly PublicUnitStatTermV7[],
): PublicUnitStatBreakdownV7 {
  return {
    id,
    label: labelText,
    current,
    base: baseTerm,
    modifiers,
    total: modifiers.reduce(
      (sum, term) => add(sum, term.value),
      baseTerm.value,
    ),
  };
}
function base(
  role: string,
  name: string,
  numerator: number,
  denominator = 1,
): PublicUnitStatTermV7 {
  return {
    value: rational(numerator, denominator),
    source: "ROLE_BASE",
    sourceLabel: `${role} base`,
    description: `${role} has this base ${name}.`,
  };
}
function modifier(
  numerator: number,
  source: UnitStatModifierSourceV7,
  sourceLabel: string,
  description: string,
  denominator = 1,
): PublicUnitStatTermV7 {
  return {
    value: rational(numerator, denominator),
    source,
    sourceLabel,
    description,
  };
}
function rational(
  numerator: number,
  denominator: number,
): PublicUnitStatValueV7 {
  const divisor = gcd(Math.abs(numerator), denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}
function add(a: PublicUnitStatValueV7, b: PublicUnitStatValueV7) {
  return rational(
    a.numerator * b.denominator + b.numerator * a.denominator,
    a.denominator * b.denominator,
  );
}
function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a || 1;
}
function label(source: UnitStatModifierSourceV7): string {
  return source
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (value) => value.toUpperCase());
}
const same = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  a.x === b.x && a.y === b.y;
