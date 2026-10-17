import {
  TUNNEL_RANGE_V7,
  isIceAtV7,
  technologyCapabilitiesV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import type { CoordV7, TechnologyIdV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";

/**
 * Themed naval branches, Ironclads and Sea Tunnels (`pulp_wars-5ti.20`,
 * docs/product/RULESET_7_NAVAL_FACTIONS.md section 7.6): the Normal AI's use
 * of Sea Tunnels beyond `src/ai/v7.ts`'s naval plan and `src/ai/v7-dwarf.ts`'s
 * Mole rules.
 *
 * - **Sea tunnels.** An offered `TUNNEL` whose destination lies on the naval
 *   plan's target landmass (one the Mole's own tile is not on) is a landing
 *   (`seaTunnelLandingWalkV7`): the Mole rules score it at the priority of a
 *   planned `DISEMBARK` with a rider (`SEA_TUNNEL_LANDING_PRIORITY_V7`), the
 *   Pressure-tunnel priority without one, never next to
 *   `TUNNEL_MELEE_LIMIT_V7` hostile melee units unless next to the target.
 *   The Mole and the Hammerers that could ride with it are the plan's
 *   crossing capacity: they do not walk to a Port (`seaTunnelCrewV7`).
 * - **Research.** Sea Tunnels (the Dwarf `SEAMANSHIP`) is the naval plan's
 *   next technology once the plan is active, the seat owns a Mole, and the
 *   target landmass lies within `TUNNEL_RANGE_V7` tunnel steps of its home
 *   land over Shallow Water (`seaTunnelStraitV7`, `seaTunnelsResearchDueV7`).
 * - **Armour.** Every exchange is read from the exact previews, which count
 *   Armoured; the threat estimate already takes Armoured off the damage it
 *   expects for any unit, a ship included.
 *
 * Every function reads only the viewer's public view.
 */

/** A sea landing with a rider: the priority of a planned `DISEMBARK`. */
export const SEA_TUNNEL_LANDING_PRIORITY_V7 = 1335;
/** The base value of a sea landing (before the eruption and the walk). */
export const SEA_TUNNEL_LANDING_VALUE_V7 = 30;
/** A landing that carries a Hammerer is worth this much more. */
export const SEA_TUNNEL_RIDER_VALUE_V7 = 20;

/** The research a seat's tree is asked about for its Sea Tunnels. */
const SEA_TUNNELS_TECHS_V7: readonly TechnologyIdV7[] = Object.freeze([
  "SHORECRAFT",
  "SEAMANSHIP",
]);

/** Whether the viewer's tree grants Sea Tunnels (the Dwarf Seamanship). */
export function seaTunnelsTreeV7(view: PlayerViewV7): boolean {
  return technologyCapabilitiesV7(SEA_TUNNELS_TECHS_V7, view.viewer.faction)
    .seaTunnels;
}

/** Whether the viewer has Sea Tunnels now. */
export function seaTunnelsResearchedV7(view: PlayerViewV7): boolean {
  return technologyCapabilitiesV7(
    view.viewer.researchedTechs,
    view.viewer.faction,
  ).seaTunnels;
}

/** Whether `unit` is an own Steam Mole (its role has `TUNNEL`). */
export function ownMoleV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return (
    unit.ownerId === view.viewer.id &&
    unit.form === "LAND" &&
    unit.hp > 0 &&
    (unitRoleRuleV7(view, unit).abilities as readonly string[]).includes(
      "TUNNEL",
    )
  );
}

/**
 * Section 7.6, "Sea tunnels": the land-route steps from `to` to the plan's
 * target when a tunnel from `from` to `to` is a sea landing (`to` is on the
 * target landmass, `walk`, and `from` is not), else null. The plan's map
 * is keyed `"y,x"`, as every key of the policy's plans.
 */
export function seaTunnelLandingWalkV7(
  plan: {
    readonly active: boolean;
    readonly target: CoordV7 | null;
    readonly walkDistanceByKey: ReadonlyMap<string, number>;
  },
  from: CoordV7,
  to: CoordV7,
): number | null {
  if (!plan.active || plan.target === null) return null;
  const key = (at: CoordV7): string => `${String(at.y)},${String(at.x)}`;
  const walk = plan.walkDistanceByKey.get(key(to));
  if (walk === undefined || plan.walkDistanceByKey.has(key(from))) return null;
  return walk;
}

/**
 * Section 7.6, "Research": whether the target landmass (`target`) lies
 * within `TUNNEL_RANGE_V7` tunnel steps of explored home land (`home`)
 * over explored Shallow Water without ice: a step sequence from a home land
 * tile through one or more such water tiles (never land: a route under land
 * alone needs no Sea Tunnels) to a target land tile.
 */
export function seaTunnelStraitV7(
  view: PlayerViewV7,
  home: (at: CoordV7) => boolean,
  target: (at: CoordV7) => boolean,
): boolean {
  const width = view.board.width;
  const height = view.board.height;
  const tileOf = (at: CoordV7) => view.board.tiles[at.y * width + at.x];
  const shallow = (at: CoordV7): boolean => {
    const tile = tileOf(at);
    return (
      tile?.explored === true &&
      tile.biome === null &&
      tile.terrain === "SHALLOW_WATER" &&
      !isIceAtV7(view, at)
    );
  };
  const land = (at: CoordV7): boolean => {
    const tile = tileOf(at);
    return tile?.explored === true && tile.biome !== null;
  };
  const around = (at: CoordV7): CoordV7[] => {
    const cells: CoordV7[] = [];
    for (let dy = -1; dy <= 1; dy += 1)
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const cell = { x: at.x + dx, y: at.y + dy };
        if (cell.x < 0 || cell.y < 0 || cell.x >= width || cell.y >= height)
          continue;
        cells.push(cell);
      }
    return cells;
  };
  // The water tiles one step from home land, then up to the range less the
  // final step onto the far coast.
  const seen = new Set<string>();
  const key = (at: CoordV7): string => `${String(at.x)},${String(at.y)}`;
  let frontier: CoordV7[] = [];
  for (const tile of view.board.tiles) {
    if (!land(tile.at) || !home(tile.at)) continue;
    for (const cell of around(tile.at))
      if (shallow(cell) && !seen.has(key(cell))) {
        seen.add(key(cell));
        frontier.push(cell);
      }
  }
  for (let step = 1; step < TUNNEL_RANGE_V7 && frontier.length > 0; step += 1) {
    const next: CoordV7[] = [];
    for (const at of frontier)
      for (const cell of around(at)) {
        if (land(cell) && target(cell) && !home(cell)) return true;
        if (shallow(cell) && !seen.has(key(cell))) {
          seen.add(key(cell));
          next.push(cell);
        }
      }
    frontier = next;
  }
  return false;
}

/**
 * Section 7.6, "Research": Sea Tunnels is due for a seat whose tree grants
 * it, that has not researched it and is offered it, while the naval plan is
 * active, the seat owns a Mole, and the target landmass lies within tunnel
 * reach over Shallow Water (`strait`).
 */
export function seaTunnelsResearchDueV7(
  view: PlayerViewV7,
  planActive: boolean,
  strait: boolean,
  offered: (tech: TechnologyIdV7) => boolean,
): boolean {
  return (
    planActive &&
    strait &&
    seaTunnelsTreeV7(view) &&
    !seaTunnelsResearchedV7(view) &&
    view.units.some((unit) => ownMoleV7(view, unit)) &&
    offered("SEAMANSHIP")
  );
}

/**
 * Section 7.6: the units that cross by tunnel this turn instead of boarding
 * at a Port: every own Mole with an offered sea landing (a `TUNNEL` whose
 * destination `seaTunnelLandingWalkV7` reads as a landing), and every
 * Hammerer such an offer names as its rider.
 */
export function seaTunnelCrewIdsV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  plan: Parameters<typeof seaTunnelLandingWalkV7>[0],
): ReadonlySet<number> {
  const crew = new Set<number>();
  if (!plan.active || plan.target === null) return crew;
  for (const command of commands) {
    if (command.kind !== "TUNNEL") continue;
    const mole = view.units.find((unit) => unit.id === command.unitId);
    if (
      mole === undefined ||
      seaTunnelLandingWalkV7(plan, mole.at, command.to) === null
    )
      continue;
    crew.add(command.unitId);
    if (command.rider !== null) crew.add(command.rider.unitId);
  }
  return crew;
}

/**
 * Section 7.6, "Armour", for every seat: a ship's attack on an Armoured
 * hull afloat (an Ironclad's, `armourReduction`) that does not sink it and
 * deals less than the reply takes from the ship is refused: Armour turns
 * the even trade of a Patrol Boat ramming a Battleship (7; 7) into a losing
 * one (6; 7). Read from the exact preview (Shields counted on both sides).
 */
export function armouredLosingAttackV7(
  view: PlayerViewV7,
  attacker: PublicUnitV7,
  target: PublicUnitV7,
  preview: {
    readonly defenderDies: boolean;
    readonly damageToDefender: number;
    readonly defenderShieldDamage: number;
    readonly damageToAttacker: number;
    readonly attackerShieldDamage: number;
  },
): boolean {
  return (
    attacker.form === "NAVAL" &&
    target.form === "NAVAL" &&
    unitRoleMechanicsV7(view, target).armourReduction > 0 &&
    !preview.defenderDies &&
    preview.damageToDefender + preview.defenderShieldDamage <
      preview.damageToAttacker + preview.attackerShieldDamage
  );
}
