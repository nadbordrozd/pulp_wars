import {
  GROWTH_HP_V7,
  growthStageForKillsV7,
  unitGrowsV7,
  type DinosaurUnitFactsV7,
  type FactionRosterV7,
} from "../rules/ruleset-v7";
import type { DomainEventV7 } from "./events";
import type { UnitStateV7 } from "./types";

/**
 * Revision 19 Grow (docs/product/RULESET_7_REVISION_19_DINOSAURS.md section
 * 5.2). A Dinosaur unit's growth stage is derived from its `kills`; each
 * stage reached adds `GROWTH_HP_V7` maximum HP at the moment the kill is
 * credited, to a unit that survived the exchange. Revision 20 (docs/product/
 * RULESET_7_REVISION_20.md section 5): each stage also fully heals the unit
 * (`hp` is the new maximum).
 */

/**
 * The HP of a surviving unit after the growth its kills earned: its new
 * maximum when its kills going from `killsBefore` to `killsAfter` reach a
 * new stage, otherwise `hp` (its HP after the exchange) unchanged. Public
 * simulations use it so that they equal `grownUnitV7`.
 */
export function grownHpV7(
  roster: FactionRosterV7,
  unit: Pick<DinosaurUnitFactsV7, "ownerId" | "role" | "form"> & {
    readonly maxHp: number;
  },
  killsBefore: number,
  killsAfter: number,
  hp: number,
): number {
  if (hp <= 0 || !unitGrowsV7(roster, unit)) return hp;
  const stages =
    growthStageForKillsV7(killsAfter) - growthStageForKillsV7(killsBefore);
  return stages > 0 ? unit.maxHp + GROWTH_HP_V7 * stages : hp;
}

/**
 * Applies the growth a surviving unit earned in one exchange: `after` carries
 * its new `kills` and its HP after the exchange's damage and Lifesteal;
 * `killsBefore` is its credit before. One `UNIT_GREW` per stage reached is
 * appended to `events`, in stage order. A unit that does not grow, did not
 * survive, or reached no new stage is returned unchanged.
 */
export function grownUnitV7(
  roster: FactionRosterV7,
  killsBefore: number,
  after: UnitStateV7,
  events: DomainEventV7[],
): UnitStateV7 {
  if (after.hp <= 0 || !unitGrowsV7(roster, after)) return after;
  const from = growthStageForKillsV7(killsBefore);
  const to = growthStageForKillsV7(after.kills);
  let unit = after;
  for (let stage = from + 1; stage <= to; stage += 1) {
    const maxHp = unit.maxHp + GROWTH_HP_V7;
    // Revision 20 section 5: growing fully heals.
    const hp = maxHp;
    if (!Number.isSafeInteger(maxHp)) throw new RangeError("INTEGER_OVERFLOW");
    unit = { ...unit, maxHp, hp };
    events.push({
      kind: "UNIT_GREW",
      unitId: unit.id,
      stage: stage as 1 | 2,
      maxHp,
      hp,
    });
  }
  return unit;
}
