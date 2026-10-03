import type { CityId, PlayerId, UnitId } from "../engine/model/ids";
import { unitRoleRuleV7 } from "../engine/rules/ruleset-v7";
import type { CoordV7 } from "../engine/v7/types";
import type {
  PlayerViewV7,
  PublicCityV7,
  PublicUnitV7,
} from "../engine/v7/view";

/**
 * Normal AI campaign plan (`pulp_wars-9s0.1`): expansion, exploration, and
 * standing pressure on every known enemy city.
 *
 * Measured before this plan, the policy moved every unit greedily by
 * Chebyshev distance: units stopped behind lakes and mountains, all walked
 * to the same nearest unexplored tile, Raiders orbited their home city as
 * pickets, and land units were drawn to Ports whenever an enemy boat was
 * visible. Seats with a dozen units had not found an enemy eight tiles away
 * by round 30, and once one was found the units arrived one at a time.
 *
 * The plan gives every own land unit one job. Two kinds of unit keep the
 * objective they had: the unit on an own city center while a hostile land
 * unit is visible within three tiles (the garrison), and a defender-role
 * unit whose objective is a threatened own city (it still takes the defence
 * job when an invader is in reach). Every other unit takes the first job
 * that applies:
 *
 * 1. **Scout** (while no enemy city is known). The first scout goes before
 *    anything else, to the nearest explored land next to an unexplored
 *    tile, first toward enemy territory whose city has not been seen or a
 *    visible enemy unit.
 * 2. **Expansion.** Each explored, unclaimed village gets the nearest
 *    capture-capable unit by land route, then each treasure chest one
 *    within six steps.
 * 3. **Defence.** Each visible hostile land unit within two tiles of an own
 *    city center is engaged by attack-capable units within six route steps
 *    (they used to stand around the city and wait): up to three while no
 *    enemy city is known, one once there is a city to march on.
 * 4. **Exploration.** Before contact a second scout takes a stretch of
 *    frontier at least four tiles from the first and the other capturers
 *    follow the first scout as a group. Once an enemy city is known, one
 *    scout keeps exploring.
 * 5. **Pressure.** Every other unit marches by land route to its nearest
 *    known enemy city (City Walls count as two extra steps). With several
 *    hostile seats in reach, each gets at least a pair of units. Where the
 *    naval plan's sea route to its target is the shortcut, the capturers
 *    bound for that target get no job on land and sail.
 *    A known city stays a target for as long as it is hostile: it is part
 *    of the seat's explored map, so losing every unit sent there changes
 *    nothing. Units set out in waves: a unit near an own city waits there
 *    until three units for the same target are home (fewer when the seat's
 *    cities cannot hold that many), or leaves at once while a wave of two
 *    or more is already out or the target is within five steps of an own
 *    city. They never wait near the enemy, where the defenders would pick
 *    them off (a ring three tiles from the target was measured and
 *    dropped for that reason).
 *
 * Every input is public: explored tiles and their territory owner, cities
 * on explored tiles, visible units, and treasure chests. Nothing draws from
 * the PRNG or depends on elapsed time; routes are breadth-first searches
 * over explored, enterable land (units are not walls), at most a few dozen
 * per decision.
 */

/** A visible hostile land unit this close to an own center is an invader. */
export const CAMPAIGN_INVADER_RADIUS_V7 = 2;
/** Own attackers sent against each invader while no enemy city is known. */
export const CAMPAIGN_INVADER_RESPONDERS_V7 = 3;
/** Own attackers sent against each invader once an enemy city is known. */
export const CAMPAIGN_INVADER_RESPONDERS_AT_WAR_V7 = 1;
/** A responder is at most this many route steps from the invader. */
export const CAMPAIGN_INVADER_RESPONSE_STEPS_V7 = 6;
/** A treasure chest is fetched from at most this many route steps. */
export const CAMPAIGN_CHEST_STEPS_V7 = 6;
/** Units sent against every hostile seat the army can reach by land. */
export const CAMPAIGN_FRONT_UNITS_V7 = 2;
/** A unit within this distance of an own city center is home. */
export const CAMPAIGN_HOME_RADIUS_V7 = 2;
/** A wave of this many units at home sets out (fewer when fewer exist). */
export const CAMPAIGN_WAVE_SIZE_V7 = 3;
/** No wave waits for a target within this many steps of an own city. */
export const CAMPAIGN_CLASH_STEPS_V7 = 5;
/** With this many units already out, units at home follow at once. */
export const CAMPAIGN_WAVE_OUT_V7 = 2;
/**
 * The unit on an own city center stays while a hostile unit is visible
 * within this distance of it.
 */
export const CAMPAIGN_GARRISON_RADIUS_V7 = 3;
/** Scouts with their own stretch of frontier while no enemy city is known. */
export const CAMPAIGN_SCOUTS_BEFORE_CONTACT_V7 = 2;
/** Explorers take frontier tiles at least this far apart. */
export const CAMPAIGN_EXPLORER_SPACING_V7 = 4;
/** Frontier within this distance of unseen-city enemy territory comes first. */
export const CAMPAIGN_LEAD_RADIUS_V7 = 3;
/** Route steps added for a target with City Walls. */
export const CAMPAIGN_WALLS_PENALTY_V7 = 2;

/** Land-route steps to one objective, by tile. */
export class RouteFieldV7 {
  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly steps: Int16Array,
  ) {}

  /** Steps from `at`, or undefined when no explored land route exists. */
  get(at: CoordV7): number | undefined {
    if (at.x < 0 || at.y < 0 || at.x >= this.width || at.y >= this.height)
      return undefined;
    const value = this.steps[at.y * this.width + at.x];
    return value === undefined || value < 0 ? undefined : value;
  }
}

export type CampaignJobV7 =
  "DEFEND" | "VILLAGE" | "CHEST" | "EXPLORE" | "ATTACK";

export interface CampaignAssignmentV7 {
  readonly job: CampaignJobV7;
  readonly at: CoordV7;
  readonly field: RouteFieldV7;
  /** The target city of an `ATTACK` job. */
  readonly targetCityId: CityId | null;
}

export interface CampaignTargetV7 {
  readonly city: PublicCityV7;
  /** Own units marching on this city. */
  readonly assigned: number;
  /** Of those, the units near an own city. */
  readonly home: number;
  /** Of those, the units already out. */
  readonly out: number;
  /** Units at home needed before a wave sets out. */
  readonly needed: number;
  /** Units at home set out now. */
  readonly push: boolean;
}

export interface CampaignPlanV7 {
  /** A hostile city is known: the seat keeps pressure on it. */
  readonly atWar: boolean;
  readonly assignmentByUnitId: ReadonlyMap<UnitId, CampaignAssignmentV7>;
  readonly targetByCityId: ReadonlyMap<CityId, CampaignTargetV7>;
  readonly ownCenters: readonly CoordV7[];
  /** The routes to every unclaimed village and every known enemy city. */
  readonly workFields: readonly RouteFieldV7[];
}

export interface CampaignFactsV7 {
  readonly isHostile: (ownerId: PlayerId) => boolean;
  /** Another seat whose territory the viewer does not enter. */
  readonly isAllied: (ownerId: PlayerId) => boolean;
  /** Units that keep their defensive objective (a threatened own city). */
  readonly keepsObjective: (unit: PublicUnitV7) => boolean;
  /**
   * Unit slots the seat can still fill with land units. A wave waits for
   * units that can still be trained, never for more than the cities hold.
   */
  readonly freeLandSlots: number;
  /**
   * The naval plan's target while its sea route is the shortcut (more than
   * three steps shorter than the walk): capture units bound for it get no
   * job on land.
   */
  readonly seaTarget: CoordV7 | null;
  /**
   * The Ice Folk revision (`pulp_wars-7g3.4`): whether a unit is
   * Mountain-born. A wave made only of Mountain-born units routes over
   * Mountains; a Mountain-born unit marching with any other unit keeps the
   * shared route (the Yetis do not go over the ridge while the Witch goes
   * round). Absent for every other seat.
   */
  readonly mountainBorn?: (unit: PublicUnitV7) => boolean;
}

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

export function campaignPlanForPolicyV7(
  view: PlayerViewV7,
  facts: CampaignFactsV7,
): CampaignPlanV7 {
  const { width, height, tiles } = view.board;
  const size = width * height;
  const engineering = view.viewer.researchedTechs.includes("ENGINEERING");
  const enterable = new Uint8Array(size);
  for (let index = 0; index < size; index += 1) {
    const tile = tiles[index];
    if (
      tile !== undefined &&
      tile.explored &&
      (tile.terrain === "GRASS" ||
        tile.terrain === "FOREST" ||
        (tile.terrain === "MOUNTAIN" && engineering)) &&
      !(
        tile.territoryOwnerId !== null &&
        tile.territoryOwnerId !== view.viewer.id &&
        facts.isAllied(tile.territoryOwnerId)
      )
    )
      enterable[index] = 1;
  }
  const indexOf = (at: CoordV7): number => at.y * width + at.x;
  const coordOf = (index: number): CoordV7 => ({
    x: index % width,
    y: Math.floor(index / width),
  });
  const search = (sources: readonly number[]): Int16Array => {
    const steps = new Int16Array(size).fill(-1);
    const queue = new Int32Array(size);
    let tail = 0;
    for (const source of sources)
      if (steps[source] === -1) {
        steps[source] = 0;
        queue[tail] = source;
        tail += 1;
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
    return steps;
  };
  const field = (sources: readonly number[]): RouteFieldV7 =>
    new RouteFieldV7(width, height, search(sources));
  /** The Ice Folk revision: a route with every explored Mountain enterable. */
  const mountainField = (sources: readonly number[]): RouteFieldV7 => {
    const saved = enterable.slice();
    for (let index = 0; index < size; index += 1) {
      const tile = tiles[index];
      if (
        tile !== undefined &&
        tile.explored &&
        tile.terrain === "MOUNTAIN" &&
        !(
          tile.territoryOwnerId !== null &&
          tile.territoryOwnerId !== view.viewer.id &&
          facts.isAllied(tile.territoryOwnerId)
        )
      )
        enterable[index] = 1;
    }
    const result = field(sources);
    enterable.set(saved);
    return result;
  };

  const assignmentByUnitId = new Map<UnitId, CampaignAssignmentV7>();
  const free: PublicUnitV7[] = [];
  const ownAt = new Set<number>();
  const ownCenters = view.cities
    .filter((city) => city.ownerId === view.viewer.id)
    .map((city) => city.at);
  const hostileLand = view.units.filter(
    (unit) =>
      unit.hp > 0 && unit.form === "LAND" && facts.isHostile(unit.ownerId),
  );
  // The garrison: the unit on an own center with a hostile unit in sight
  // nearby stays (a unit sent out against an invader left its city open).
  const garrisons = (unit: PublicUnitV7): boolean =>
    ownCenters.some((at) => at.x === unit.at.x && at.y === unit.at.y) &&
    hostileLand.some(
      (hostile) =>
        chebyshev(hostile.at, unit.at) <= CAMPAIGN_GARRISON_RADIUS_V7,
    );
  // Defenders walking to a threatened own city keep that objective, but
  // they engage an invader next to the city instead of standing by it.
  const reserve: PublicUnitV7[] = [];
  const onOwnCenter = (unit: PublicUnitV7): boolean =>
    ownCenters.some((at) => at.x === unit.at.x && at.y === unit.at.y);
  for (const unit of view.units) {
    if (unit.ownerId !== view.viewer.id || unit.hp <= 0) continue;
    ownAt.add(indexOf(unit.at));
    if (unit.form !== "LAND" || garrisons(unit)) continue;
    if (!facts.keepsObjective(unit)) free.push(unit);
    else if (!onOwnCenter(unit)) reserve.push(unit);
  }
  free.sort((left, right) => left.id - right.id);
  reserve.sort((left, right) => left.id - right.id);
  const atHome = (at: CoordV7): boolean =>
    ownCenters.some(
      (center) => chebyshev(center, at) <= CAMPAIGN_HOME_RADIUS_V7,
    );
  const captures = (unit: PublicUnitV7): boolean =>
    unitRoleRuleV7(view, unit).abilities.includes("CAPTURE");
  const unassigned = (): PublicUnitV7[] =>
    free.filter((unit) => !assignmentByUnitId.has(unit.id));

  // The frontier: explored land next to unexplored tiles.
  const targets = view.cities.filter((city) => facts.isHostile(city.ownerId));
  const leads: CoordV7[] = [];
  const frontier: number[] = [];
  for (let index = 0; index < size; index += 1) {
    const tile = tiles[index];
    if (tile === undefined || !tile.explored) continue;
    if (
      tile.territoryOwnerId !== null &&
      tile.territoryCityId === null &&
      facts.isHostile(tile.territoryOwnerId)
    )
      leads.push(tile.at);
    if (enterable[index] !== 1) continue;
    const x = index % width;
    const y = (index - x) / width;
    let edge = false;
    for (let dy = -1; dy <= 1 && !edge; dy += 1)
      for (let dx = -1; dx <= 1 && !edge; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const neighbour = tiles[ny * width + nx];
        if (
          neighbour !== undefined &&
          !neighbour.explored &&
          !("diplomaticBlock" in neighbour)
        )
          edge = true;
      }
    if (edge) frontier.push(index);
  }
  // A visible hostile unit is a lead too while no enemy city is known: its
  // city is somewhere behind it.
  if (targets.length === 0) for (const unit of hostileLand) leads.push(unit.at);
  const leadFrontier = frontier.filter((index) => {
    const at = coordOf(index);
    return leads.some((lead) => chebyshev(lead, at) <= CAMPAIGN_LEAD_RADIUS_V7);
  });
  const frontierSteps = frontier.length > 0 ? search(frontier) : null;
  // Scouts can capture, so they take the villages they find; siege and
  // support units wait for a target instead. The fastest unit scouts, then
  // the oldest: the choice does not depend on where the units stand, so the
  // scout stays the scout.
  const scoutCandidates = (): PublicUnitV7[] =>
    frontierSteps === null
      ? []
      : unassigned()
          .filter(
            (unit) =>
              captures(unit) &&
              (frontierSteps[indexOf(unit.at)] as number) >= 0,
          )
          .sort(
            (left, right) =>
              unitRoleRuleV7(view, right).move -
                unitRoleRuleV7(view, left).move || left.id - right.id,
          );
  const taken = new Uint8Array(size);
  let main: CampaignAssignmentV7 | null = null;
  /** Gives the next `count` scouts their own stretch of frontier. */
  function sendScouts(count: number): void {
    for (const unit of scoutCandidates().slice(0, count)) {
      const fromUnit = search([indexOf(unit.at)]);
      const nearest = (candidates: readonly number[]): number | null => {
        let best: number | null = null;
        let bestSteps = Number.POSITIVE_INFINITY;
        for (const index of candidates) {
          const steps = fromUnit[index] as number;
          if (steps < 0 || taken[index] === 1 || steps >= bestSteps) continue;
          best = index;
          bestSteps = steps;
        }
        return best;
      };
      let goal = nearest(leadFrontier) ?? nearest(frontier);
      if (goal === null) {
        // Every reachable stretch is taken: share the nearest one.
        taken.fill(0);
        goal = nearest(leadFrontier) ?? nearest(frontier);
      }
      if (goal === null) continue;
      const at = coordOf(goal);
      for (const index of frontier)
        if (chebyshev(coordOf(index), at) < CAMPAIGN_EXPLORER_SPACING_V7)
          taken[index] = 1;
      const assignment: CampaignAssignmentV7 = {
        job: "EXPLORE",
        at,
        field: field([goal]),
        targetCityId: null,
      };
      main ??= assignment;
      assignmentByUnitId.set(unit.id, assignment);
    }
  }
  // While no enemy city is known the first scout goes before anything
  // else: with every unit fighting next to home the enemy city four tiles
  // away stayed unseen for ten rounds.
  if (targets.length === 0) sendScouts(1);

  const seaTargetIndex =
    facts.seaTarget === null ? -1 : indexOf(facts.seaTarget);
  // Expansion: the nearest capturer for every unclaimed village, then
  // for every treasure chest within reach. A village is a permanent gain, so
  // its capturer is not called back to a fight at home.
  const errands: {
    readonly job: "VILLAGE" | "CHEST";
    readonly index: number;
    readonly field: RouteFieldV7;
  }[] = [];
  for (let index = 0; index < size; index += 1) {
    const tile = tiles[index];
    if (
      tile !== undefined &&
      tile.explored &&
      tile.site === "VILLAGE" &&
      tile.territoryOwnerId === null &&
      !ownAt.has(index) &&
      index !== seaTargetIndex
    )
      errands.push({ job: "VILLAGE", index, field: field([index]) });
  }
  for (const chest of view.treasureChests) {
    const index = indexOf(chest);
    if (!ownAt.has(index))
      errands.push({ job: "CHEST", index, field: field([index]) });
  }
  const pairs: {
    readonly errand: number;
    readonly unit: PublicUnitV7;
    readonly steps: number;
  }[] = [];
  errands.forEach((errand, order) => {
    for (const unit of unassigned()) {
      // Capturers run the errands; a chest is worth a short detour only.
      if (!captures(unit)) continue;
      const steps = errand.field.get(unit.at);
      if (
        steps !== undefined &&
        (errand.job === "VILLAGE" || steps <= CAMPAIGN_CHEST_STEPS_V7)
      )
        pairs.push({ errand: order, unit, steps });
    }
  });
  pairs.sort(
    (left, right) =>
      left.steps - right.steps ||
      left.errand - right.errand ||
      left.unit.id - right.unit.id,
  );
  const takenErrands = new Set<number>();
  for (const pair of pairs) {
    if (takenErrands.has(pair.errand) || assignmentByUnitId.has(pair.unit.id))
      continue;
    const errand = errands[pair.errand];
    if (errand === undefined) continue;
    takenErrands.add(pair.errand);
    assignmentByUnitId.set(pair.unit.id, {
      job: errand.job,
      at: coordOf(errand.index),
      field: errand.field,
      targetCityId: null,
    });
  }

  // Defence: engage the hostile land units next to an own city: all
  // hands while no enemy city is known, one unit each once there is a city
  // to march on (the rest counterattack).
  const invaders = hostileLand
    .filter((unit) =>
      ownCenters.some(
        (at) => chebyshev(at, unit.at) <= CAMPAIGN_INVADER_RADIUS_V7,
      ),
    )
    .sort((left, right) => left.id - right.id);
  if (invaders.length > 0) {
    const attackers = [...free, ...reserve].filter((unit) => {
      const rule = unitRoleRuleV7(view, unit);
      return rule.abilities.includes("ATTACK") && rule.attack2 > 0;
    });
    const responses: {
      readonly invader: number;
      readonly unit: PublicUnitV7;
      readonly steps: number;
    }[] = [];
    const invaderFields = invaders.map((unit) => field([indexOf(unit.at)]));
    invaders.forEach((_invader, order) => {
      for (const unit of attackers) {
        const steps = invaderFields[order]?.get(unit.at);
        if (steps !== undefined && steps <= CAMPAIGN_INVADER_RESPONSE_STEPS_V7)
          responses.push({ invader: order, unit, steps });
      }
    });
    responses.sort(
      (left, right) =>
        left.steps - right.steps ||
        left.invader - right.invader ||
        left.unit.id - right.unit.id,
    );
    const responders = invaders.map(() => 0);
    const respondersWanted =
      targets.length === 0
        ? CAMPAIGN_INVADER_RESPONDERS_V7
        : CAMPAIGN_INVADER_RESPONDERS_AT_WAR_V7;
    for (const response of responses) {
      const invader = invaders[response.invader];
      const route = invaderFields[response.invader];
      if (
        invader === undefined ||
        route === undefined ||
        (responders[response.invader] ?? 0) >= respondersWanted ||
        assignmentByUnitId.has(response.unit.id)
      )
        continue;
      responders[response.invader] = (responders[response.invader] ?? 0) + 1;
      assignmentByUnitId.set(response.unit.id, {
        job: "DEFEND",
        at: invader.at,
        field: route,
        targetCityId: null,
      });
    }
  }

  // Exploration: the second scout before contact, the only one after.
  sendScouts(targets.length === 0 ? CAMPAIGN_SCOUTS_BEFORE_CONTACT_V7 - 1 : 1);
  // Before contact the rest of the army follows the first scout, so the
  // enemy it finds meets a group and not one unit.
  if (targets.length === 0 && main !== null) {
    const lead: CampaignAssignmentV7 = main;
    for (const unit of scoutCandidates())
      if (lead.field.get(unit.at) !== undefined)
        assignmentByUnitId.set(unit.id, lead);
  }

  // Pressure: every other unit marches on its nearest known enemy city.
  const targetByCityId = new Map<CityId, CampaignTargetV7>();
  const workFields: RouteFieldV7[] = errands
    .filter((errand) => errand.job === "VILLAGE")
    .map((errand) => errand.field);
  if (targets.length > 0) {
    const fields = targets.map((city) => field([indexOf(city.at)]));
    workFields.push(...fields);
    // The nearest city, a walled one counting as farther. Visible
    // defenders do not move the choice: they come and go with every step,
    // and a unit that changes its target every turn never arrives.
    const penalties = targets.map(
      (city) =>
        Number(
          city.rewards.some(
            (record) => record.reachedLevel === 3 && record.reward === "WALLS",
          ),
        ) * CAMPAIGN_WALLS_PENALTY_V7,
    );
    const costTo = (unit: PublicUnitV7, order: number): number => {
      const steps = fields[order]?.get(unit.at);
      return steps === undefined
        ? Number.POSITIVE_INFINITY
        : steps + (penalties[order] ?? 0);
    };
    /** The unit's nearest target among those `allowed`, or -1. */
    const nearest = (
      unit: PublicUnitV7,
      allowed: (order: number) => boolean,
    ): number => {
      let best = -1;
      let bestCost = Number.POSITIVE_INFINITY;
      targets.forEach((city, order) => {
        if (!allowed(order)) return;
        const cost = costTo(unit, order);
        if (
          cost < bestCost ||
          (cost === bestCost &&
            Number.isFinite(cost) &&
            city.id < (targets[best]?.id ?? city.id))
        ) {
          best = order;
          bestCost = cost;
        }
      });
      return best;
    };
    const choice = new Map<UnitId, number>();
    const army: PublicUnitV7[] = [];
    for (const unit of unassigned()) {
      const order = nearest(unit, () => true);
      if (order < 0) continue;
      army.push(unit);
      choice.set(unit.id, order);
    }
    // A second front: every hostile seat with a city the army can walk to
    // gets a pair of units (as far as the army goes round), taken from the
    // seat with the most, so a neighbour is not left alone because another
    // seat's city is a step nearer.
    const seatOf = (order: number): PlayerId | undefined =>
      targets[order]?.ownerId;
    const seats = [...new Set(targets.map((city) => city.ownerId))]
      .filter((seat) =>
        army.some(
          (unit) => nearest(unit, (order) => seatOf(order) === seat) >= 0,
        ),
      )
      .sort((left, right) => left - right);
    const onSeat = (seat: PlayerId): PublicUnitV7[] =>
      army.filter((unit) => seatOf(choice.get(unit.id) ?? -1) === seat);
    const quota =
      seats.length < 2
        ? 0
        : Math.min(
            CAMPAIGN_FRONT_UNITS_V7,
            Math.floor(army.length / seats.length),
          );
    for (const seat of seats) {
      while (onSeat(seat).length < quota) {
        let donor: PlayerId | null = null;
        for (const other of seats)
          if (
            other !== seat &&
            onSeat(other).length > quota &&
            (donor === null || onSeat(other).length > onSeat(donor).length)
          )
            donor = other;
        if (donor === null) break;
        let moved: PublicUnitV7 | null = null;
        let movedOrder = -1;
        let movedCost = Number.POSITIVE_INFINITY;
        for (const unit of onSeat(donor)) {
          const order = nearest(unit, (item) => seatOf(item) === seat);
          if (order < 0) continue;
          const cost = costTo(unit, order);
          if (cost < movedCost) {
            moved = unit;
            movedOrder = order;
            movedCost = cost;
          }
        }
        if (moved === null) break;
        choice.set(moved.id, movedOrder);
      }
    }
    const marching = targets.map(() => [] as PublicUnitV7[]);
    for (const unit of army) {
      const order = choice.get(unit.id) ?? -1;
      const city = targets[order];
      const route = fields[order];
      if (city === undefined || route === undefined) continue;
      // The sea is the shortcut to this city: its capturers sail.
      if (indexOf(city.at) === seaTargetIndex && captures(unit)) continue;
      marching[order]?.push(unit);
      assignmentByUnitId.set(unit.id, {
        job: "ATTACK",
        at: city.at,
        field: route,
        targetCityId: city.id,
      });
    }
    // The Ice Folk revision: a wave of Mountain-born units only takes the
    // route over the Mountains.
    const mountainBorn = facts.mountainBorn;
    if (mountainBorn !== undefined)
      marching.forEach((units, order) => {
        const city = targets[order];
        if (
          city === undefined ||
          units.length === 0 ||
          !units.every((unit) => mountainBorn(unit))
        )
          return;
        const route = mountainField([indexOf(city.at)]);
        for (const unit of units)
          assignmentByUnitId.set(unit.id, {
            job: "ATTACK",
            at: city.at,
            field: route,
            targetCityId: city.id,
          });
      });
    // New units join the main effort, so only its wave waits for them.
    let main = -1;
    marching.forEach((units, order) => {
      if (units.length > (marching[main]?.length ?? 0)) main = order;
    });
    targets.forEach((city, order) => {
      const units = marching[order] ?? [];
      const home = units.filter((unit) => atHome(unit.at)).length;
      const out = units.length - home;
      // Next door there is nothing to wait for: the cities already fight.
      const clash = ownCenters.some(
        (center) =>
          (fields[order]?.get(center) ?? Number.POSITIVE_INFINITY) <=
          CAMPAIGN_CLASH_STEPS_V7,
      );
      // The wave waits only for units that can still be trained: with
      // every slot filled, the units at home are the wave.
      const needed = Math.max(
        1,
        Math.min(
          home + (order === main ? facts.freeLandSlots : 0),
          CAMPAIGN_WAVE_SIZE_V7,
        ),
      );
      targetByCityId.set(city.id, {
        city,
        assigned: units.length,
        home,
        out,
        needed,
        push: clash || home >= needed || out >= CAMPAIGN_WAVE_OUT_V7,
      });
    });
  }
  return {
    atWar: targets.length > 0,
    assignmentByUnitId,
    targetByCityId,
    ownCenters,
    workFields,
  };
}

/** A village or a known enemy city can be walked to from `at`. */
export function campaignHasWorkAtV7(
  plan: CampaignPlanV7 | null,
  at: CoordV7,
): boolean {
  return (
    plan !== null &&
    plan.workFields.some((route) => route.get(at) !== undefined)
  );
}

/**
 * A wave has not formed: a Move that takes a unit at home out of the home
 * zone of every own city waits. Moves inside the zone are free, so the wave
 * forms on the side of the target.
 */
export function campaignHoldsMoveV7(
  plan: CampaignPlanV7 | null,
  unit: PublicUnitV7,
  to: CoordV7,
): boolean {
  const assignment = plan?.assignmentByUnitId.get(unit.id);
  if (
    plan === null ||
    assignment === undefined ||
    assignment.job !== "ATTACK" ||
    assignment.targetCityId === null
  )
    return false;
  const target = plan.targetByCityId.get(assignment.targetCityId);
  if (target === undefined || target.push) return false;
  const home = (at: CoordV7): boolean =>
    plan.ownCenters.some(
      (center) => chebyshev(center, at) <= CAMPAIGN_HOME_RADIUS_V7,
    );
  return home(unit.at) && !home(to);
}

/** Land-route progress of a Move toward the unit's job, or null without one. */
export function campaignRouteProgressV7(
  plan: CampaignPlanV7 | null,
  unit: PublicUnitV7,
  to: CoordV7,
): number | null {
  const assignment = plan?.assignmentByUnitId.get(unit.id);
  if (assignment === undefined) return null;
  const from = assignment.field.get(unit.at);
  const next = assignment.field.get(to);
  return from === undefined || next === undefined ? 0 : from - next;
}
