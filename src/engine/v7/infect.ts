import type { UnitId } from "../model/ids";
import { DROWNED_CREW_HP_V7, seatRoleRuleV7 } from "../rules/ruleset-v7";
import type { DomainEventV7 } from "./events";
import type { GameStateV7, UnitStateV7 } from "./types";

/**
 * An Infect rising has 12 of the Zombie's 18 HP. It had 10 from revision 13
 * (section 6.4) to `pulp-wars-poc-7r56`; step two of the Undead pass
 * (`pulp_wars-w49.24`, 7r57, docs/product/RULESET_7_TUNING_UNDEAD.md section
 * 15) made it 12: at 10 a rising was dead after two ordinary hits, or one
 * Gang Up blow, before its owner's next turn.
 */
export const INFECT_RISING_HP_V7 = 12;

/**
 * Records one death converted by Infect (revision 13 sections 5.4 and 6.4):
 * appends the victim's `UNIT_DIED` and then `UNIT_INFECTED`, and returns the
 * Zombie rising that replaces the victim on its tile. The rising is owned by
 * the killing unit's owner and has no home city (the Undead pass,
 * correction: it fills no unit slot of any city), has no kills, is not veteran, is not
 * capture-eligible, and carries the caller's exhausted activation. Infect
 * never creates a Grave; an existing Grave stays under the rising.
 */
export function recordInfectionV7(
  state: Pick<GameStateV7, "players">,
  source: Pick<UnitStateV7, "id" | "ownerId" | "homeCityId">,
  victim: Pick<UnitStateV7, "id" | "at" | "form">,
  cause: "ATTACK" | "RETALIATION",
  risingId: UnitId,
  activation: UnitStateV7["activation"],
  events: DomainEventV7[],
): UnitStateV7 {
  // Themed naval branches, Drowned Crews
  // (docs/product/RULESET_7_NAVAL_FACTIONS.md section 4.3 U1,
  // `pulp_wars-5ti.17`): a ship an Undead ship sank rises as the killer's
  // owner's Ghost Ship (its `PATROL_BOAT`) at `DROWNED_CREW_HP_V7`.
  if (victim.form === "NAVAL") {
    const ship = seatRoleRuleV7(state, source.ownerId, "PATROL_BOAT");
    return recordedRisingV7(
      {
        id: risingId,
        ownerId: source.ownerId,
        homeCityId: null,
        role: "PATROL_BOAT",
        form: "NAVAL",
        at: { x: victim.at.x, y: victim.at.y },
        hp: Math.min(DROWNED_CREW_HP_V7, ship.maxHp),
        maxHp: ship.maxHp,
        kills: 0,
        veteran: false,
        captureEligible: false,
        activation,
      },
      source,
      victim,
      cause,
      events,
    );
  }
  // The rising is the source seat's own `GUARD` (a role-level read; a
  // mind-controlled Zombie never infects).
  const rule = seatRoleRuleV7(state, source.ownerId, "GUARD");
  const rising: UnitStateV7 = {
    id: risingId,
    ownerId: source.ownerId,
    // The Undead pass, correction (`pulp_wars-w49.13`): a rising has no
    // home city, so it fills no unit slot (it took one of the killer's
    // home city, and converting units stopped the player training).
    homeCityId: null,
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
  return recordedRisingV7(rising, source, victim, cause, events);
}

function recordedRisingV7(
  rising: UnitStateV7,
  source: Pick<UnitStateV7, "id" | "ownerId">,
  victim: Pick<UnitStateV7, "id">,
  cause: "ATTACK" | "RETALIATION",
  events: DomainEventV7[],
): UnitStateV7 {
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
