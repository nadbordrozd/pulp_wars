import {
  DEEP_WINTER_RECOVER_V7,
  unitIsSummonedV7,
  type SummonedUnitRefV7,
} from "../rules/ruleset-v7";
import type { UnitActivationV7, UnitFormV7 } from "./types";

/**
 * Section 10 Recover: everything the rule reads about one unit. The reducer
 * fills it from the authoritative state and the public query from the
 * owner's `PlayerView` (an own unit's facts are exact there), so the offered
 * `RECOVER`, End Turn idle recovery, and the End Turn hint share one
 * predicate and one amount.
 */
export interface RecoveryFactsV7 {
  readonly form: UnitFormV7;
  readonly hp: number;
  readonly maxHp: number;
  readonly activation: Pick<
    UnitActivationV7,
    "moved" | "attacked" | "recovered" | "captured" | "specialActed"
  >;
  /** A Dwarf construct: clockwork never mends itself. */
  readonly construct: boolean;
  /** The unit's kind is Restless (Undead). */
  readonly restless: boolean;
  /** The unit stands in its owner's (its controller's) territory. */
  readonly inOwnTerritory: boolean;
  /** On or adjacent to an own active Port or Shipyard. */
  readonly byOwnActivePort: boolean;
  /** An Ice Folk land unit whose controller has Deep Winter. */
  readonly deepWinter: boolean;
}

/** Revision 13 Restless: no recovery outside the owner's territory. */
export function restlessOutsideOwnTerritoryV7(
  facts: Pick<RecoveryFactsV7, "form" | "restless" | "inOwnTerritory">,
): boolean {
  return facts.form === "LAND" && facts.restless && !facts.inOwnTerritory;
}

/**
 * The single Recover predicate: a `RECOVER` for this unit is offered and
 * accepted now, and the unit recovers by itself if its owner's turn ends
 * now. A unit that moved or used a primary action is not eligible; Wait
 * changes nothing.
 */
export function recoverEligibleV7(facts: RecoveryFactsV7): boolean {
  return (
    facts.hp > 0 &&
    facts.hp < facts.maxHp &&
    !facts.activation.moved &&
    !facts.activation.attacked &&
    !facts.activation.recovered &&
    !facts.activation.captured &&
    !facts.activation.specialActed &&
    facts.form !== "EMBARKED" &&
    // Revision 19 section 6.2: nothing heals an Egg.
    facts.form !== "EGG" &&
    // The Dwarf revision section 7.2.
    !facts.construct &&
    !restlessOutsideOwnTerritoryV7(facts) &&
    (facts.form !== "NAVAL" || facts.byOwnActivePort)
  );
}

/** The rule's healing amount, before the cap at the missing HP. */
export function recoveryHealV7(facts: RecoveryFactsV7): number {
  if (facts.form === "NAVAL") return facts.byOwnActivePort ? 4 : 0;
  if (facts.form === "EMBARKED") return 0;
  if (facts.inOwnTerritory)
    return facts.deepWinter ? DEEP_WINTER_RECOVER_V7 : 4;
  return restlessOutsideOwnTerritoryV7(facts) ? 0 : 2;
}

/** The HP a Recover or an idle recovery restores now. */
export function recoveryGainV7(facts: RecoveryFactsV7): number {
  return Math.min(recoveryHealV7(facts), facts.maxHp - facts.hp);
}

/** Section 10: the most a Windmill heals one unit at a Start Turn. */
export const WINDMILL_HEAL_V7 = 6;

/**
 * Section 10 Windmill healing: whether a Windmill heals this unit of its
 * owner when the unit is on one of the Windmill's eight neighbours at the
 * owner's Start Turn (any form). Every faction's own Windmill (the Bone
 * Mill, Grinding Stone, Solar Array, Steam Pump, ...) heals every own unit
 * since `pulp_wars-a7eb` (`7r118`), the Dwarf constructs included (they were
 * skipped before). Only an Egg (revision 19 section 6.2: nothing heals an
 * Egg) and a summoned unit (a daemon never heals) are never healed. The
 * engine (`resolveWindmillHealingV7`) and the Normal AI's staging read it.
 */
export function windmillHealsUnitV7(
  unit: SummonedUnitRefV7 & {
    readonly form: UnitFormV7;
    readonly hp: number;
    readonly maxHp: number;
  },
): boolean {
  return (
    unit.hp > 0 &&
    unit.hp < unit.maxHp &&
    unit.form !== "EGG" &&
    !unitIsSummonedV7(unit)
  );
}
