import type { UnitId } from "../model/ids";
import { seatRoleRuleV7 } from "../rules/ruleset-v7";
import type { DomainEventV7 } from "./events";
import type { GameStateV7, UnitStateV7 } from "./types";

/** Revision 13 section 6.4: an Infect rising has 10 HP (revision 15: of the Zombie's 18). */
export const INFECT_RISING_HP_V7 = 10;

/**
 * Records one death converted by Infect (revision 13 sections 5.4 and 6.4):
 * appends the victim's `UNIT_DIED` and then `UNIT_INFECTED`, and returns the
 * Zombie rising that replaces the victim on its tile. The rising is owned by
 * the killing Zombie's owner and homed to its home city (orphaned when the
 * Zombie is), may exceed capacity, has no kills, is not veteran, is not
 * capture-eligible, and carries the caller's exhausted activation. Infect
 * never creates a Grave; an existing Grave stays under the rising.
 */
export function recordInfectionV7(
  state: Pick<GameStateV7, "players">,
  source: Pick<UnitStateV7, "id" | "ownerId" | "homeCityId">,
  victim: Pick<UnitStateV7, "id" | "at">,
  cause: "ATTACK" | "RETALIATION",
  risingId: UnitId,
  activation: UnitStateV7["activation"],
  events: DomainEventV7[],
): UnitStateV7 {
  // The rising is the source seat's own `GUARD` (a role-level read; a
  // mind-controlled Zombie never infects).
  const rule = seatRoleRuleV7(state, source.ownerId, "GUARD");
  const rising: UnitStateV7 = {
    id: risingId,
    ownerId: source.ownerId,
    homeCityId: source.homeCityId,
    role: "GUARD",
    form: "LAND",
    at: { x: victim.at.x, y: victim.at.y },
    hp: Math.min(INFECT_RISING_HP_V7, rule.maxHp),
    maxHp: rule.maxHp,
    kills: 0,
    veteran: false,
    captureEligible: false,
    activation,
  };
  events.push(
    { kind: "UNIT_DIED", unitId: victim.id, cause },
    {
      kind: "UNIT_INFECTED",
      playerId: source.ownerId,
      sourceUnitId: source.id,
      victimUnitId: victim.id,
      unitId: rising.id,
      at: rising.at,
      homeCityId: rising.homeCityId,
    },
  );
  return rising;
}
