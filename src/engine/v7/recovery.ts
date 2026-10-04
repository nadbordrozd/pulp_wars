import { DEEP_WINTER_RECOVER_V7 } from "../rules/ruleset-v7";
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
