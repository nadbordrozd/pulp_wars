import {
  NEUTRAL_KIND_V7,
  unitFactionV7,
  type FactionRosterV7,
  type UnitKindRefV7,
} from "../engine/rules/ruleset-v7";
import type { FactionIdV7 } from "../engine/v7/types";

/**
 * Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section 12.1,
 * `pulp_wars-737.3`): the faction whose art, portrait, and labels a unit is
 * presented with. A seat's unit is presented by its kind (`unitFactionV7`).
 * The neutral Giant Spider has no faction; until the curiosities UI bead
 * draws it, the presentation falls back to the base (Human) art of its
 * mechanical role, with no owner colour (its owner is no player).
 */
export function presentedUnitFactionV7(
  roster: FactionRosterV7,
  unit: UnitKindRefV7,
): FactionIdV7 {
  const kind = unitFactionV7(roster, unit);
  return kind === NEUTRAL_KIND_V7 ? "ORIGINAL" : kind;
}
