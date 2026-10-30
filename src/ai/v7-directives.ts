import type { PlayerId, UnitId } from "../engine/model/ids";
import type { CommandV7 } from "../engine/v7/commands";
import { unitMayEnterMountainV7 } from "../engine/rules/ruleset-v7";
import { cooperativeAlliesV7 } from "../engine/v7/economy";
import { missionDirectiveProblemV7 } from "../engine/v7/missions/directives";
import {
  missionDefinitionV7,
  missionSeatDirectivesV7,
} from "../engine/v7/missions/index";
import type {
  MissionDefinitionV7,
  MissionDirectiveV7,
  RectV7,
} from "../engine/v7/missions/types";
import type { CoordV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";
import { barricadeRouteMarksV7, landRouteStepsV7 } from "./v7-barricades";
import { RouteFieldV7, type CampaignDirectiveV7 } from "./v7-campaign";
import { aiPersonalityForViewV7 } from "./v7-personality";

/**
 * Mission directives for the Normal AI (`pulp_wars-68k.3`,
 * docs/product/CAMPAIGN.md section 2.5).
 *
 * A mission's AI seat may carry one directive (plain data on the seat
 * definition): `NORMAL`, `RUSH`, `HOLD(zone)`, `GUARD(zone, garrison)`
 * (whose units outside the garrison may play `RUSH` or `ASSAULT`,
 * `others`, `pulp_wars-v642.10`), or `ASSAULT(target)`
 * (`pulp_wars-v642.5`), each optionally
 * `untilRound`. The policy finds its directive from its own
 * public view (`view.setup.mission` names the mission, `view.viewer.seat`
 * the seat) and plays it while `view.round < untilRound` (always without
 * `untilRound`); after that, and in every non-mission match, it plays
 * `NORMAL`. Nothing here reads hidden state, the clock, or the PRNG.
 *
 * A directive enters the policy at exactly two points, so the policy is not
 * forked:
 *
 * 1. **The plan.** `CampaignFactsV7.directive` (`src/ai/v7-campaign.ts`)
 *    changes the unit jobs: `RUSH` drops the village, chest, exploration, and
 *    (for free units) defence jobs once a hostile city is known and lets
 *    every wave set out at once; `ASSAULT` does the same on its target city
 *    alone; `HOLD` gives no job whose target lies
 *    outside the zone; a leashed unit outside the zone gets the `RETURN`
 *    job, and a `GUARD` garrison unit inside it stays.
 * 2. **The leash.** `leashReadyCommandsV7` removes from the ready commands
 *    every command that would end a leashed unit's relocation outside the
 *    zone. Attacks, `END_TURN`, research, training, construction, and every
 *    city command are never filtered, so a directive never leaves the policy
 *    without a legal command.
 * 3. **The assault** (`ASSAULT` only, `pulp_wars-v642.5`). The army rules
 *    weigh each position of visible hostile units (`armyAssaultV7` in
 *    `src/ai/v7.ts`) and go in only where the army outweighs it; a
 *    position that holds the target (`assaultHoldsTargetV7`) is weighed as
 *    outweighed, so the army masses and then commits against it.
 *
 * With `NORMAL` (and in every non-mission match) `directivePlanForViewV7`
 * is null: the ready commands are passed through unchanged and the plan
 * facts carry no directive, so every decision is byte-identical to the
 * policy without directives.
 */

/** The resolved directive of one seat at one decision. */
export interface DirectivePlanV7 {
  readonly directive: Exclude<MissionDirectiveV7, { readonly kind: "NORMAL" }>;
  /** The plan hook (`CampaignFactsV7.directive`). */
  readonly campaign: CampaignDirectiveV7;
  /**
   * The units the leash confines to the zone: every own land unit for
   * `HOLD`, the garrison for `GUARD`, none for `RUSH` and `ASSAULT`; with
   * `ships` (E7, `pulp_wars-hmyk.11`) every own ship as well.
   */
  readonly leashed: ReadonlySet<UnitId>;
  /** `GUARD`: the garrison in choice order; empty otherwise. */
  readonly garrison: readonly UnitId[];
}

/**
 * The directive the viewer's seat plays at this decision, or null for
 * `NORMAL`: a non-mission match, a seat without a directive (the human
 * seat included), a `NORMAL` directive, or a directive whose `untilRound`
 * has been reached.
 */
export function activeMissionDirectiveV7(
  view: PlayerViewV7,
): Exclude<MissionDirectiveV7, { readonly kind: "NORMAL" }> | null {
  const setup = view.setup;
  if (setup.mapType !== "MISSION" || setup.mission === undefined) return null;
  const seat = missionDefinitionV7(setup.mission)?.seats[view.viewer.seat];
  if (seat === undefined) return null;
  // Easy mode (`pulp_wars-q6cc`): a RUSH or an ASSAULT, and a GUARD's
  // others, start this many rounds late (0 for Normal).
  const delay = aiPersonalityForViewV7(view).directiveDelayRounds;
  // A schedule (`pulp_wars-v642.1`): the first entry whose rounds hold the
  // current round; a single directive is a schedule of one.
  const directive = missionSeatDirectivesV7(seat).find(
    (entry) =>
      (entry.fromRound === undefined && delay === 0
        ? true
        : view.round >=
          (entry.fromRound ?? 1) +
            (entry.kind === "RUSH" || entry.kind === "ASSAULT" ? delay : 0)) &&
      (entry.untilRound === undefined || view.round < entry.untilRound),
  );
  if (directive === undefined || directive.kind === "NORMAL") return null;
  if (
    directive.kind === "GUARD" &&
    directive.others !== undefined &&
    view.round < (directive.fromRound ?? 1) + delay
  ) {
    // The garrison holds; the others wait at home for the delay.
    const guard: Exclude<MissionDirectiveV7, { readonly kind: "NORMAL" }> = {
      kind: "GUARD",
      zone: directive.zone,
      garrison: directive.garrison,
      ...(directive.ships === undefined ? {} : { ships: directive.ships }),
      ...(directive.fromRound === undefined
        ? {}
        : { fromRound: directive.fromRound }),
      ...(directive.untilRound === undefined
        ? {}
        : { untilRound: directive.untilRound }),
    };
    return guard;
  }
  return directive;
}

/**
 * `ASSAULT` (`pulp_wars-v642.5`): a hostile unit this close to the target
 * holds it, and the position it belongs to is assaulted.
 */
export const ASSAULT_HOLD_RADIUS_V7 = 3;

/**
 * Whether a hostile unit at `at` holds the target of the seat's `ASSAULT`
 * directive (false for every other directive and without one).
 */
export function assaultHoldsTargetV7(
  plan: DirectivePlanV7 | null,
  at: CoordV7,
): boolean {
  if (plan === null) return false;
  const campaign = plan.campaign;
  // `pulp_wars-v642.10`: a GUARD seat whose others ASSAULT a target.
  const assault =
    campaign.kind === "ASSAULT"
      ? campaign
      : campaign.kind === "GUARD" && campaign.others?.kind === "ASSAULT"
        ? campaign.others
        : null;
  return (
    assault !== null && chebyshev(assault.target, at) <= ASSAULT_HOLD_RADIUS_V7
  );
}

/** A tile lies in a zone: a union of inclusive rectangles. */
export function zoneContainsV7(zone: readonly RectV7[], at: CoordV7): boolean {
  return zone.some(
    (rect) =>
      at.x >= rect.x0 && at.x <= rect.x1 && at.y >= rect.y0 && at.y <= rect.y1,
  );
}

/** A unit the directives treat as a land unit (it walks or is carried). */
function landUnitV7(unit: PublicUnitV7): boolean {
  return unit.hp > 0 && (unit.form === "LAND" || unit.form === "EMBARKED");
}

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

function allied(view: PlayerViewV7, ownerId: PlayerId): boolean {
  return (
    ownerId === view.viewer.id ||
    cooperativeAlliesV7(view.setup, view.humanPlayerId, ownerId, view.viewer.id)
  );
}

/**
 * Land-route steps from every tile to the nearest zone tile, over explored
 * Grass and Forest (and Mountains when `mountains`), never an ally's
 * territory: the campaign routes' land for one class of unit.
 */
function zoneRouteFieldV7(
  view: PlayerViewV7,
  zone: readonly RectV7[],
  mountains: boolean,
): RouteFieldV7 {
  const { width, height, tiles } = view.board;
  const size = width * height;
  const enterable = new Uint8Array(size);
  for (let index = 0; index < size; index += 1) {
    const tile = tiles[index];
    if (
      tile !== undefined &&
      tile.explored &&
      (tile.terrain === "GRASS" ||
        tile.terrain === "FOREST" ||
        (tile.terrain === "MOUNTAIN" && mountains)) &&
      !(
        tile.territoryOwnerId !== null &&
        tile.territoryOwnerId !== view.viewer.id &&
        allied(view, tile.territoryOwnerId)
      )
    )
      enterable[index] = 1;
  }
  const sources: number[] = [];
  for (let index = 0; index < size; index += 1) {
    const at = { x: index % width, y: Math.floor(index / width) };
    if (enterable[index] === 1 && zoneContainsV7(zone, at)) sources.push(index);
  }
  // Barricades in the way (`pulp_wars-54fb`): as the campaign routes.
  const steps = landRouteStepsV7(
    width,
    height,
    enterable,
    sources,
    barricadeRouteMarksV7(view, (ownerId) => !allied(view, ownerId)),
  );
  return new RouteFieldV7(width, height, steps);
}

/**
 * The zone tile nearest to `at`: by distance, then by the straighter line
 * (fewer orthogonal steps), then by row and column.
 */
function nearestZoneTileV7(
  view: PlayerViewV7,
  zone: readonly RectV7[],
  at: CoordV7,
): CoordV7 {
  let best: CoordV7 | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestLine = Number.POSITIVE_INFINITY;
  for (let y = 0; y < view.board.height; y += 1)
    for (let x = 0; x < view.board.width; x += 1) {
      const tile = { x, y };
      if (!zoneContainsV7(zone, tile)) continue;
      const span = chebyshev(tile, at);
      const line = Math.abs(tile.x - at.x) + Math.abs(tile.y - at.y);
      if (span < bestDistance || (span === bestDistance && line < bestLine)) {
        best = tile;
        bestDistance = span;
        bestLine = line;
      }
    }
  return best ?? at;
}

/** Chebyshev distance from `at` to the nearest zone tile on the board. */
function zoneDistanceV7(
  view: PlayerViewV7,
  zone: readonly RectV7[],
  at: CoordV7,
): number {
  return chebyshev(nearestZoneTileV7(view, zone, at), at);
}

/** A unit's land-route field to the zone (one of at most two per decision). */
export type ZoneFieldForUnitV7 = (unit: PublicUnitV7) => RouteFieldV7;

/**
 * The zone fields of the viewer's units. Whether a unit's route may cross
 * Mountains is the shared per-unit terrain rule (`unitMayEnterMountainV7`:
 * Engineering, a walker or flyer, or a Mountain-born unit), so an Ice Folk
 * Yeti routes over the ridge while a Fighter goes round.
 */
function zoneFieldsV7(
  view: PlayerViewV7,
  zone: readonly RectV7[],
): ZoneFieldForUnitV7 {
  const engineering = view.viewer.researchedTechs.includes("ENGINEERING");
  const fields = new Map<boolean, RouteFieldV7>();
  return (unit) => {
    const mountains = unitMayEnterMountainV7(view, unit, engineering);
    let field = fields.get(mountains);
    if (field === undefined) {
      field = zoneRouteFieldV7(view, zone, mountains);
      fields.set(mountains, field);
    }
    return field;
  };
}

/**
 * The `GUARD` garrison (section 2.5): own land units (never a summon,
 * `pulp_wars-mch9.56`) already inside the zone first, then by land-route steps to the zone (units with no route
 * last), then by unit ID; at most `garrison`, fewer when the seat has fewer
 * land units. Recomputed at every decision; deterministic.
 */
export function guardGarrisonV7(
  view: PlayerViewV7,
  zone: readonly RectV7[],
  garrison: number,
  fieldFor: ZoneFieldForUnitV7 = zoneFieldsV7(view, zone),
): readonly UnitId[] {
  const candidates = view.units
    .filter(
      (unit) =>
        unit.ownerId === view.viewer.id &&
        unit.hp > 0 &&
        unit.form === "LAND" &&
        // `pulp_wars-mch9.56`: a summon (a Cult daemon or a Tentacle) is
        // never the garrison; it plays the others' directive. A Herald
        // called inside a GUARD zone (DINOSAUR_6) took a garrison place and
        // stood still until it broke loose.
        unit.summoned === undefined,
    )
    .map((unit) => ({
      unit,
      inside: zoneContainsV7(zone, unit.at) ? 0 : 1,
      steps: fieldFor(unit).get(unit.at) ?? Number.POSITIVE_INFINITY,
    }));
  candidates.sort(
    (left, right) =>
      left.inside - right.inside ||
      (left.steps === right.steps ? 0 : left.steps < right.steps ? -1 : 1) ||
      left.unit.id - right.unit.id,
  );
  return candidates
    .slice(0, Math.max(0, garrison))
    .map((candidate) => candidate.unit.id);
}

/**
 * The viewer seat's directive plan at this decision, or null for `NORMAL`
 * (then the policy is exactly the policy without directives).
 */
export function directivePlanForViewV7(
  view: PlayerViewV7,
): DirectivePlanV7 | null {
  const directive = activeMissionDirectiveV7(view);
  if (directive === null) return null;
  if (directive.kind === "RUSH")
    return {
      directive,
      campaign: { kind: "RUSH" },
      leashed: new Set(),
      garrison: [],
    };
  // `pulp_wars-v642.5`: the assault on one place (no leash, no zone).
  if (directive.kind === "ASSAULT")
    return {
      directive,
      campaign: { kind: "ASSAULT", target: directive.target },
      leashed: new Set(),
      garrison: [],
    };
  const zone = directive.zone;
  const zoneField = zoneFieldsV7(view, zone);
  const garrison =
    directive.kind === "GUARD"
      ? guardGarrisonV7(view, zone, directive.garrison, zoneField)
      : [];
  const leashed = new Set<UnitId>(
    directive.kind === "GUARD"
      ? garrison
      : view.units
          .filter((unit) => unit.ownerId === view.viewer.id && landUnitV7(unit))
          .map((unit) => unit.id),
  );
  // E7 (`pulp_wars-hmyk.11`): with `ships` every own ship is leashed too,
  // so its Moves end in the zone (or bring it closer to it); its attacks
  // from where it stands are never filtered.
  if (directive.ships === true)
    for (const unit of view.units)
      if (
        unit.ownerId === view.viewer.id &&
        unit.hp > 0 &&
        unit.form === "NAVAL"
      )
        leashed.add(unit.id);
  return {
    directive,
    campaign: {
      kind: directive.kind,
      // `pulp_wars-v642.10`: the units outside a GUARD garrison attack.
      ...(directive.kind === "GUARD" && directive.others !== undefined
        ? { others: directive.others }
        : {}),
      inZone: (at) => zoneContainsV7(zone, at),
      zoneField,
      nearestZoneTile: (at) => nearestZoneTileV7(view, zone, at),
      leashed: (unit) => leashed.has(unit.id),
    },
    leashed,
    garrison,
  };
}

/** The own units a command relocates, with the tile each one ends on. */
export function commandRelocationsV7(
  command: CommandV7,
): readonly { readonly unitId: UnitId; readonly to: CoordV7 }[] {
  switch (command.kind) {
    case "MOVE": {
      const to = command.path.at(-1);
      return to === undefined ? [] : [{ unitId: command.unitId, to }];
    }
    case "DISEMBARK":
      return [{ unitId: command.unitId, to: command.at }];
    case "BOMB_RUN":
      return [{ unitId: command.unitId, to: command.to }];
    case "BEAM_DOWN":
      return [{ unitId: command.passengerUnitId, to: command.to }];
    // The Mothership redesign (`pulp_wars-ewpj`): every passenger lands on
    // the chosen tile or one beside it; the tile stands for the landing.
    case "MASS_BEAM_DOWN":
      return command.passengerUnitIds.map((unitId) => ({
        unitId,
        to: command.to,
      }));
    case "TUNNEL":
      return command.rider === null
        ? [{ unitId: command.unitId, to: command.to }]
        : [
            { unitId: command.unitId, to: command.to },
            { unitId: command.rider.unitId, to: command.rider.to },
          ];
    default:
      // An Attack (its advance after a kill included), every ability that
      // leaves its actor in place, and every city, research, construction,
      // and End Turn command relocate no own unit.
      return [];
  }
}

/**
 * The leash (section 2.5): the ready commands without those that would end
 * a leashed unit's relocation outside the zone. A leashed unit already
 * outside the zone (an advance after a kill carried it out, or it was
 * trained or started there) keeps the relocations that bring it closer to
 * the zone (by land-route steps where both tiles have a route, otherwise by
 * distance), so its `RETURN` job can be walked. Every other command passes;
 * with a null plan the input array itself is returned.
 */
export function leashReadyCommandsV7<T extends { readonly command: CommandV7 }>(
  view: PlayerViewV7,
  plan: DirectivePlanV7 | null,
  ready: readonly T[],
) {
  if (plan === null || plan.leashed.size === 0) return ready;
  const campaign = plan.campaign;
  if (campaign.kind === "RUSH" || campaign.kind === "ASSAULT") return ready;
  const zone = "zone" in plan.directive ? plan.directive.zone : [];
  const unitsById = new Map(view.units.map((unit) => [unit.id, unit]));
  const closer = (unit: PublicUnitV7, to: CoordV7): boolean => {
    const from = unit.at;
    const field = campaign.zoneField(unit);
    const before = field.get(from);
    const after = field.get(to);
    return before !== undefined && after !== undefined
      ? after < before
      : zoneDistanceV7(view, zone, to) < zoneDistanceV7(view, zone, from);
  };
  return ready.filter((item) =>
    commandRelocationsV7(item.command).every((relocation) => {
      if (!plan.leashed.has(relocation.unitId)) return true;
      if (campaign.inZone(relocation.to)) return true;
      const unit = unitsById.get(relocation.unitId);
      return (
        unit !== undefined &&
        !campaign.inZone(unit.at) &&
        closer(unit, relocation.to)
      );
    }),
  );
}

/**
 * Build-free checks of a mission's directives (the engine never reads
 * them): the strict shape check the builder also runs
 * (`missionDirectiveProblemV7`, `pulp_wars-hmyk.14`): only AI seats carry
 * one; known kinds without stray keys; zones are non-empty rectangles on
 * the board; a `GUARD` garrison is a positive integer and its `others` a
 * `RUSH` or an `ASSAULT` on a tile of the board; `untilRound` is an integer
 * of at least 2. Throws a `RangeError` naming the mission and the seat.
 */
export function validateMissionDirectivesV7(
  mission: MissionDefinitionV7,
): void {
  const problem = missionDirectiveProblemV7(mission);
  if (problem !== null) throw new RangeError(`${mission.id} ${problem}`);
}
