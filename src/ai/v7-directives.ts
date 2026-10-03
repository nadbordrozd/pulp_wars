import type { PlayerId, UnitId } from "../engine/model/ids";
import type { CommandV7 } from "../engine/v7/commands";
import { unitMayEnterMountainV7 } from "../engine/rules/ruleset-v7";
import { missionDefinitionV7 } from "../engine/v7/missions/index";
import type {
  MissionDefinitionV7,
  MissionDirectiveV7,
  RectV7,
} from "../engine/v7/missions/types";
import type { CoordV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";
import { RouteFieldV7, type CampaignDirectiveV7 } from "./v7-campaign";

/**
 * Mission directives for the Normal AI (`pulp_wars-68k.3`,
 * docs/product/CAMPAIGN.md section 2.5).
 *
 * A mission's AI seat may carry one directive (plain data on the seat
 * definition): `NORMAL`, `RUSH`, `HOLD(zone)`, or `GUARD(zone, garrison)`,
 * each optionally `untilRound`. The policy finds its directive from its own
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
 *    every wave set out at once; `HOLD` gives no job whose target lies
 *    outside the zone; a leashed unit outside the zone gets the `RETURN`
 *    job, and a `GUARD` garrison unit inside it stays.
 * 2. **The leash.** `leashReadyCommandsV7` removes from the ready commands
 *    every command that would end a leashed unit's relocation outside the
 *    zone. Attacks, `END_TURN`, research, training, construction, and every
 *    city command are never filtered, so a directive never leaves the policy
 *    without a legal command.
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
   * `HOLD`, the garrison for `GUARD`, none for `RUSH`.
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
  const mission = missionDefinitionV7(setup.mission);
  const directive = mission?.seats[view.viewer.seat]?.directive;
  if (directive === undefined || directive.kind === "NORMAL") return null;
  if (directive.untilRound !== undefined && view.round >= directive.untilRound)
    return null;
  return directive;
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
    (view.setup.aiMode === "COOPERATIVE" &&
      ownerId !== view.humanPlayerId &&
      view.viewer.id !== view.humanPlayerId)
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
  const steps = new Int16Array(size).fill(-1);
  const queue = new Int32Array(size);
  let tail = 0;
  for (let index = 0; index < size; index += 1) {
    const at = { x: index % width, y: Math.floor(index / width) };
    if (enterable[index] === 1 && zoneContainsV7(zone, at)) {
      steps[index] = 0;
      queue[tail] = index;
      tail += 1;
    }
  }
  for (let head = 0; head < tail; head += 1) {
    const current = queue[head] as number;
    const next = (steps[current] as number) + 1;
    const x = current % width;
    const y = (current - x) / width;
    for (let dy = -1; dy <= 1; dy += 1) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;
        const index = ny * width + nx;
        if (steps[index] !== -1 || enterable[index] !== 1) continue;
        steps[index] = next;
        queue[tail] = index;
        tail += 1;
      }
    }
  }
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
 * The `GUARD` garrison (section 2.5): own land units already inside the
 * zone first, then by land-route steps to the zone (units with no route
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
        unit.ownerId === view.viewer.id && unit.hp > 0 && unit.form === "LAND",
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
  return {
    directive,
    campaign: {
      kind: directive.kind,
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
  if (campaign.kind === "RUSH") return ready;
  const zone = plan.directive.kind === "RUSH" ? [] : plan.directive.zone;
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
 * them): only AI seats carry one; zones are non-empty rectangles on the
 * board; a `GUARD` garrison is a positive integer; `untilRound` is an
 * integer of at least 2.
 */
export function validateMissionDirectivesV7(
  mission: MissionDefinitionV7,
): void {
  mission.seats.forEach((seat, index) => {
    const directive = seat.directive;
    if (directive === undefined) return;
    const where = `${mission.id} seat ${String(index)}`;
    if (index === 0)
      throw new RangeError(`${where}: the human seat takes no directive`);
    if (directive.kind === "NORMAL") return;
    if (
      directive.untilRound !== undefined &&
      (!Number.isSafeInteger(directive.untilRound) || directive.untilRound < 2)
    )
      throw new RangeError(`${where}: untilRound must be an integer >= 2`);
    if (directive.kind === "RUSH") return;
    if (directive.zone.length === 0)
      throw new RangeError(`${where}: the zone is empty`);
    for (const rect of directive.zone)
      if (
        ![rect.x0, rect.y0, rect.x1, rect.y1].every(Number.isSafeInteger) ||
        rect.x0 < 0 ||
        rect.y0 < 0 ||
        rect.x1 >= mission.size ||
        rect.y1 >= mission.size ||
        rect.x0 > rect.x1 ||
        rect.y0 > rect.y1
      )
        throw new RangeError(`${where}: a zone rectangle is off the board`);
    if (
      directive.kind === "GUARD" &&
      (!Number.isSafeInteger(directive.garrison) || directive.garrison < 1)
    )
      throw new RangeError(`${where}: the garrison must be a positive integer`);
  });
}
