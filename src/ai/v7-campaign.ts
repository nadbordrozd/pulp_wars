import type { CityId, PlayerId, UnitId } from "../engine/model/ids";
import {
  roleCanEverCaptureV7,
  roleMechanicsV7,
  unitCanEverCaptureV7,
  unitMovementModeV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import {
  cityHasWallsV7,
  type CoordV7,
  type FactionIdV7,
  type UnitRoleIdV7,
} from "../engine/v7/types";
import type {
  PlayerViewV7,
  PublicCityV7,
  PublicUnitV7,
} from "../engine/v7/view";
import {
  explorationGoalV7,
  explorationHomeDangerV7,
  explorationProfileV7,
  explorationScoutsWantedV7,
  explorationStretchesV7,
  explorationSurveyV7,
  type ExplorationTerrainV7,
} from "./v7-exploration";

/**
 * The units the Normal AI plans captures with. Any unit can capture since
 * `pulp_wars-ke95` (user direction 2026-10-09), and the policy plans with
 * every capturing land unit but the flyers (Saucer, Mothership,
 * Gyrocopter): they had no `CAPTURE` before and the policy plays them as
 * carriers, bombers, and pullers, so it keeps doing that until an AI bead
 * teaches it to capture with them. A flyer still takes a `CAPTURE` the
 * policy is offered.
 */
export function policyCapturerV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return (
    unitCanEverCaptureV7(view, unit) &&
    !(unit.form === "LAND" && unitMovementModeV7(view, unit) === "FLY")
  );
}

/** {@link policyCapturerV7} for a role the seat trains. */
export function policyRoleCapturesV7(
  role: UnitRoleIdV7,
  faction: FactionIdV7,
): boolean {
  return (
    roleCanEverCaptureV7(role, faction) &&
    roleMechanicsV7(role, faction).movementMode !== "FLY"
  );
}

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
 *
 * A mission directive (`pulp_wars-68k.3`, `src/ai/v7-directives.ts`)
 * adjusts the jobs through `CampaignFactsV7.directive` and adds the
 * `RETURN` job; without one the plan is exactly as described above.
 *
 * The exploration plan (`pulp_wars-nc6`, `src/ai/v7-exploration.ts`): an
 * army seat's scouts choose their frontier by what it reveals and by a
 * route outside every visible enemy's reach, their number follows the
 * unexplored share of the map, a scout takes a village nobody else can
 * walk to, and exploration stops when nothing can be reached safely or the
 * seat needs its bodies at home. Summarized at `sendScouts` below.
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

/**
 * `RETURN` (`pulp_wars-68k.3`): a mission directive's leashed unit walks
 * back to its zone, or (a `GUARD` garrison unit inside it) stays.
 */
export type CampaignJobV7 =
  "DEFEND" | "VILLAGE" | "CHEST" | "EXPLORE" | "ATTACK" | "RETURN";

export interface CampaignAssignmentV7 {
  readonly job: CampaignJobV7;
  readonly at: CoordV7;
  readonly field: RouteFieldV7;
  /** The target city of an `ATTACK` job. */
  readonly targetCityId: CityId | null;
  /**
   * Tuning 7 (`pulp_wars-w49.10`): a fast capturer sent alone at a hostile
   * city no unit defends.
   */
  readonly raid?: boolean;
  /**
   * `pulp_wars-nc6`: an `EXPLORE` job whose frontier tile and route lie
   * outside the reach of every visible enemy. Absent on a scout that goes
   * to the nearest frontier whatever stands near it.
   */
  readonly safe?: boolean;
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
  /**
   * `pulp_wars-68k.3`: the seat's active mission directive
   * (`src/ai/v7-directives.ts`). Absent for `NORMAL` and in every
   * non-mission match, and then the plan is unchanged.
   */
  readonly directive?: CampaignDirectiveV7;
  /**
   * Tuning 7 (`pulp_wars-w49.10`): army play (`src/ai/v7-army.ts`). The
   * free army marches on one hostile city, chosen by reach and by what
   * holds it (a large army on more than one), instead of on each unit's
   * nearest city; a fast capturer raids a hostile
   * city no unit defends; and the villages go to the fastest capturers,
   * those away from the enemy first. Absent for every seat that does not
   * play the army rules, and then the plan is unchanged.
   */
  readonly army?: CampaignArmyFactsV7;
}

export interface CampaignArmyFactsV7 {
  /**
   * The unit is part of a holding force (it stands near an own center with
   * an enemy at its gates) and keeps its nearest target.
   */
  readonly holds: (unit: PublicUnitV7) => boolean;
  /** The unit cannot attack after it moved and fights hand to hand. */
  readonly slowMelee: (unit: PublicUnitV7) => boolean;
  /** What a visible land unit is worth in an assault (`armyUnitStrengthV7`). */
  readonly strength: (unit: PublicUnitV7) => number;
  /**
   * Tuning 8 (`pulp_wars-w49.11`): what a hostile unit is worth where it
   * stands: its strength with its cover (Walls, a Field Defense, a Forest,
   * a Mountain, a center) counted. Absent: `strength`.
   */
  readonly holdStrength?: (unit: PublicUnitV7) => number;
  /** Tuning 8: a ranged or siege unit (it attacks from two or more tiles). */
  readonly shoots?: (unit: PublicUnitV7) => boolean;
  /**
   * Tuning 8: the seat still expands (it owns fewer cities than
   * `ARMY_EXPANSION_CITIES_V7`): before contact every free capturer scouts
   * its own stretch of frontier instead of following the first scout.
   */
  readonly expanding?: boolean;
  /**
   * The Undead pass, correction (`pulp_wars-w49.13`): villages first. A
   * hostile unit outside the seat's own land is no invader (no unit is
   * sent out against it), so the free units scout and take villages.
   */
  readonly villagesFirst?: boolean;
  /**
   * Correction pass: the seat's naval plan is active, or it owns
   * Shorecraft. Its scouting is not changed by the rule for the opening.
   */
  readonly naval?: boolean;
  /**
   * `pulp_wars-nc6`: a unit that scouts although the policy does not plan
   * captures with it (a cheap flyer: the Gyrocopter). It never leads the
   * group that follows the first scout.
   */
  readonly scouts?: (unit: PublicUnitV7) => boolean;
}

/** A raider is a capturer with at least this much Move. */
export const CAMPAIGN_RAID_MOVE_V7 = 2;
/** A raider is at most this many route steps from the undefended city. */
export const CAMPAIGN_RAID_STEPS_V7 = 10;
/** A village with a hostile unit or hostile land this close is taken last. */
export const CAMPAIGN_VILLAGE_DANGER_RADIUS_V7 = 3;
/** A slow melee unit counts as this many turns farther from a village. */
export const CAMPAIGN_SLOW_CAPTURER_TURNS_V7 = 3;
/** A hostile land unit this close to a hostile city holds it. */
export const CAMPAIGN_FRONT_DEFENSE_RADIUS_V7 = 3;
/** Steps a city costs when its holders are as strong as the free army. */
export const CAMPAIGN_FRONT_DEFENSE_STEPS_V7 = 6;
/** An army unit this close to a holder of a city is in contact there. */
export const CAMPAIGN_FRONT_CONTACT_V7 = 3;
/** Steps a city counts nearer where the army is already in contact. */
export const CAMPAIGN_FRONT_WAR_STEPS_V7 = 4;
/** Steps a further front counts nearer on a seat that has no front yet. */
export const CAMPAIGN_FRONT_SAME_SEAT_STEPS_V7 = 3;
/** The main front keeps at least this many units (and what it needs). */
export const CAMPAIGN_FRONT_MAIN_UNITS_V7 = 10;
/** A further front gets at least this many units. */
export const CAMPAIGN_FRONT_MIN_UNITS_V7 = 6;
/**
 * ... and this share (percent) of its visible holders' strength. Tuning 8
 * (`pulp_wars-w49.11`): half as much again as the holders within
 * `CAMPAIGN_FRONT_SIZE_RADIUS_V7`, their cover counted (round 7: twice the
 * raw strength of those within three tiles, which left out the Catapults
 * behind a city and its Walls).
 */
export const CAMPAIGN_FRONT_NEED_RATIO_V7 = 150;
/** The holders of a city a front is sized against stand this close to it. */
export const CAMPAIGN_FRONT_SIZE_RADIUS_V7 = 4;
/**
 * A front on a city with Walls, or with a ranged or siege unit among its
 * holders, takes one ranged or siege unit for every this many units.
 */
export const CAMPAIGN_FRONT_SHOOTER_SHARE_V7 = 3;
/** Tuning 8: a raid goes to a city with no hostile unit this close. */
export const CAMPAIGN_RAID_CLEAR_RADIUS_V7 = 2;
/** Tuning 8: scouts of a seat that knows an enemy city but still expands. */
export const CAMPAIGN_SCOUTS_EXPANDING_V7 = 2;
/** Correction pass: an army seat's opening, in rounds. */
export const CAMPAIGN_EARLY_ROUNDS_V7 = 10;
/** Unexplored land this close to an own center is the frontier at home. */
export const CAMPAIGN_HOME_FRONTIER_RADIUS_V7 = 4;
/** Scouts an expanding seat sends at the frontier at home, at most. */
export const CAMPAIGN_SCOUTS_HOME_V7 = 3;

/**
 * The plan side of a mission directive (docs/product/CAMPAIGN.md section
 * 2.5). `RUSH`: once a hostile city is known, no village, chest, or
 * exploration job, no defence job for a free unit, and every wave sets out
 * at once. `HOLD`: no job whose target lies outside the zone. `HOLD` and
 * `GUARD`: a leashed unit outside the zone takes the `RETURN` job to it;
 * a leashed `GUARD` (garrison) unit inside it stays.
 */
export type CampaignDirectiveV7 =
  | { readonly kind: "RUSH" }
  | {
      readonly kind: "HOLD" | "GUARD";
      readonly inZone: (at: CoordV7) => boolean;
      /** A unit's land-route steps to the nearest zone tile. */
      readonly zoneField: (unit: PublicUnitV7) => RouteFieldV7;
      readonly nearestZoneTile: (at: CoordV7) => CoordV7;
      /** `HOLD`: every own land unit; `GUARD`: the garrison. */
      readonly leashed: (unit: PublicUnitV7) => boolean;
    };

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
  // pulp_wars-68k.3: a leashed unit outside its zone walks back first (the
  // leash keeps only its relocations toward the zone), and a GUARD garrison
  // unit inside the zone stays; neither takes another job.
  const directive = facts.directive;
  const zoned =
    directive !== undefined && directive.kind !== "RUSH" ? directive : null;
  if (zoned !== null)
    for (const unit of [...free, ...reserve]) {
      if (!zoned.leashed(unit)) continue;
      const inside = zoned.inZone(unit.at);
      if (inside && zoned.kind !== "GUARD") continue;
      assignmentByUnitId.set(unit.id, {
        job: "RETURN",
        at: inside ? unit.at : zoned.nearestZoneTile(unit.at),
        field: zoned.zoneField(unit),
        targetCityId: null,
      });
    }
  /** HOLD: every job target lies inside the zone. */
  const confine = zoned !== null && zoned.kind === "HOLD" ? zoned.inZone : null;
  const atHome = (at: CoordV7): boolean =>
    ownCenters.some(
      (center) => chebyshev(center, at) <= CAMPAIGN_HOME_RADIUS_V7,
    );
  const captures = (unit: PublicUnitV7): boolean =>
    policyCapturerV7(view, unit);
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
    if (edge && (confine === null || confine(tile.at))) frontier.push(index);
  }
  // pulp_wars-68k.3: a RUSH seat that knows a hostile city only attacks.
  const rush = directive?.kind === "RUSH" && targets.length > 0;
  // A visible hostile unit is a lead too while no enemy city is known: its
  // city is somewhere behind it.
  if (targets.length === 0) for (const unit of hostileLand) leads.push(unit.at);
  const leadFrontier = frontier.filter((index) => {
    const at = coordOf(index);
    return leads.some((lead) => chebyshev(lead, at) <= CAMPAIGN_LEAD_RADIUS_V7);
  });
  // Correction pass (`pulp_wars-w49.11`): the frontier at home. An army
  // seat that still expands, or plays one of its first
  // `CAMPAIGN_EARLY_ROUNDS_V7` rounds, looks around its own cities before
  // it looks for the enemy: a Goblin seat had three free villages three
  // tiles south of its second city, unexplored for eleven rounds, while
  // its scouts went toward the player.
  const early =
    facts.army !== undefined &&
    facts.army.naval !== true &&
    (facts.army.expanding === true || view.round <= CAMPAIGN_EARLY_ROUNDS_V7);
  const homeFrontier = early
    ? frontier.filter((index) => {
        const at = coordOf(index);
        return ownCenters.some(
          (center) => chebyshev(center, at) <= CAMPAIGN_HOME_FRONTIER_RADIUS_V7,
        );
      })
    : [];
  const frontierSteps = frontier.length > 0 ? search(frontier) : null;
  // `pulp_wars-nc6`: an army seat's scouts plan with the exploration survey
  // (`src/ai/v7-exploration.ts`); every other seat keeps the nearest
  // frontier.
  const survey =
    facts.army === undefined
      ? null
      : explorationSurveyV7(view, {
          isHostile: facts.isHostile,
          isAllied: facts.isAllied,
          confine,
        });
  const extraScout = (unit: PublicUnitV7): boolean =>
    survey !== null && facts.army?.scouts?.(unit) === true;
  // Scouts can capture, so they take the villages they find; siege and
  // support units wait for a target instead. The fastest unit scouts, then
  // the oldest: the choice does not depend on where the units stand, so the
  // scout stays the scout. (`pulp_wars-nc6`: once an enemy city is known, a
  // unit that stands inside a visible enemy's reach is in a fight, and
  // scouts last.)
  const inReach = (unit: PublicUnitV7): number =>
    survey !== null && targets.length > 0
      ? (survey.threat[indexOf(unit.at)] as number)
      : 0;
  // A unit that walks needs a way to the frontier; one that crosses
  // Mountains or flies has its own frontier (`pulp_wars-nc6`).
  const terrainByUnitId = new Map<UnitId, ExplorationTerrainV7>();
  const terrainOf = (unit: PublicUnitV7): ExplorationTerrainV7 => {
    let terrain = terrainByUnitId.get(unit.id);
    if (terrain === undefined) {
      terrain = explorationProfileV7(view, unit).terrain;
      terrainByUnitId.set(unit.id, terrain);
    }
    return terrain;
  };
  const hasFrontier = (unit: PublicUnitV7): boolean => {
    const terrain = survey === null ? "GROUND" : terrainOf(unit);
    return terrain === "GROUND" || survey === null
      ? frontierSteps !== null &&
          (frontierSteps[indexOf(unit.at)] as number) >= 0
      : survey.frontier(terrain).length > 0;
  };
  const scoutCandidates = (): PublicUnitV7[] =>
    unassigned()
      .filter(
        (unit) => (extraScout(unit) || captures(unit)) && hasFrontier(unit),
      )
      .sort(
        (left, right) =>
          inReach(left) - inReach(right) ||
          unitRoleRuleV7(view, right).move - unitRoleRuleV7(view, left).move ||
          left.id - right.id,
      );
  const taken = new Uint8Array(size);
  let main: CampaignAssignmentV7 | null = null;
  // `pulp_wars-nc6`: the first scout that crosses Mountains (a walker or a
  // Mountain-born unit): the units that cross them too follow it, the
  // others follow the first scout on foot (`main`).
  let mountainMain: CampaignAssignmentV7 | null = null;
  let scouted = false;
  const nearCenter = (index: number, radius: number): boolean => {
    const at = coordOf(index);
    return ownCenters.some((center) => chebyshev(center, at) <= radius);
  };
  const nearLead = (index: number): boolean => {
    const at = coordOf(index);
    return leads.some((lead) => chebyshev(lead, at) <= CAMPAIGN_LEAD_RADIUS_V7);
  };
  /**
   * Gives the next `count` scouts their own stretch of frontier.
   *
   * An army seat (`pulp_wars-nc6`): each scout takes the frontier tile the
   * exploration plan values most for it (what it reveals with the scout's
   * Sight, the unexplored land behind it, an own city beside it, less the
   * turns of the way with the scout's own movement), by a route outside
   * every visible enemy's reach; the tiers are as before (the frontier at
   * home, then toward an enemy whose city is unseen, then any). A scout
   * with no safe frontier takes the nearest one while no enemy city is
   * known (the first scout still goes), and gets no exploration job once
   * one is.
   */
  function sendScouts(count: number): void {
    if (survey !== null) {
      let sent = 0;
      for (const unit of scoutCandidates()) {
        if (sent >= count) break;
        const tiers = [
          ...(early
            ? [
                (index: number): boolean =>
                  nearCenter(index, CAMPAIGN_HOME_FRONTIER_RADIUS_V7),
              ]
            : []),
          nearLead,
        ];
        const home = (index: number): boolean =>
          nearCenter(index, CAMPAIGN_HOME_FRONTIER_RADIUS_V7);
        const allowUnsafe = targets.length === 0;
        let goal = explorationGoalV7(view, survey, unit, {
          taken,
          tiers,
          home,
          allowUnsafe,
        });
        if (goal === null) {
          // Every reachable stretch is taken: share the best one.
          goal = explorationGoalV7(view, survey, unit, {
            taken: new Uint8Array(size),
            tiers: [nearLead],
            home,
            allowUnsafe,
          });
        }
        if (goal === null) continue;
        const terrain = terrainOf(unit);
        for (const index of survey.frontier(terrain))
          if (chebyshev(coordOf(index), goal.at) < CAMPAIGN_EXPLORER_SPACING_V7)
            taken[index] = 1;
        const assignment: CampaignAssignmentV7 = {
          job: "EXPLORE",
          at: goal.at,
          field: new RouteFieldV7(width, height, goal.steps),
          targetCityId: null,
          ...(goal.safe ? { safe: true } : {}),
        };
        // The group follows a scout that moves as it does: never a flyer.
        if (terrain === "GROUND") main ??= assignment;
        else if (terrain === "MOUNTAIN") mountainMain ??= assignment;
        scouted = true;
        assignmentByUnitId.set(unit.id, assignment);
        sent += 1;
      }
      return;
    }
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
      let goal =
        nearest(homeFrontier) ?? nearest(leadFrontier) ?? nearest(frontier);
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
      scouted = true;
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
  for (let index = 0; index < size && !rush; index += 1) {
    const tile = tiles[index];
    if (
      tile !== undefined &&
      tile.explored &&
      tile.site === "VILLAGE" &&
      tile.territoryOwnerId === null &&
      !ownAt.has(index) &&
      index !== seaTargetIndex &&
      (confine === null || confine(tile.at))
    )
      errands.push({ job: "VILLAGE", index, field: field([index]) });
  }
  for (const chest of rush ? [] : view.treasureChests) {
    const index = indexOf(chest);
    if (!ownAt.has(index) && (confine === null || confine(chest)))
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
  // Tuning 7: an army seat sends its fastest capturer (a slow melee unit
  // such as a Zombie last), and takes the villages away from the enemy
  // first: two Skeletons walked one after the other onto the village
  // beside the enemy's land, and a Zombie took one under seven Marksmen.
  const armyFacts = facts.army;
  const errandDanger = errands.map((errand) => {
    if (armyFacts === undefined || errand.job !== "VILLAGE") return 0;
    const at = coordOf(errand.index);
    return Number(
      hostileLand.some(
        (unit) => chebyshev(unit.at, at) <= CAMPAIGN_VILLAGE_DANGER_RADIUS_V7,
      ) ||
        view.cities.some(
          (city) =>
            facts.isHostile(city.ownerId) &&
            chebyshev(city.at, at) <= CAMPAIGN_VILLAGE_DANGER_RADIUS_V7,
        ),
    );
  });
  const errandTurns = (pair: (typeof pairs)[number]): number =>
    armyFacts === undefined
      ? pair.steps
      : Math.ceil(
          pair.steps / Math.max(1, unitRoleRuleV7(view, pair.unit).move),
        ) +
        (armyFacts.slowMelee(pair.unit) ? CAMPAIGN_SLOW_CAPTURER_TURNS_V7 : 0);
  pairs.sort(
    (left, right) =>
      (errandDanger[left.errand] ?? 0) - (errandDanger[right.errand] ?? 0) ||
      errandTurns(left) - errandTurns(right) ||
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
  // `pulp_wars-nc6`: a free village no other capturer can walk to goes to
  // the scout that can (the first scout is chosen before the errands, and a
  // seat with one unit explored past the village it had just revealed).
  if (survey !== null)
    errands.forEach((errand, order) => {
      if (errand.job !== "VILLAGE" || takenErrands.has(order)) return;
      let scout: PublicUnitV7 | null = null;
      let scoutSteps = Number.POSITIVE_INFINITY;
      for (const unit of free) {
        if (
          assignmentByUnitId.get(unit.id)?.job !== "EXPLORE" ||
          !captures(unit)
        )
          continue;
        const steps = errand.field.get(unit.at);
        if (steps !== undefined && steps < scoutSteps) {
          scout = unit;
          scoutSteps = steps;
        }
      }
      if (scout === null) return;
      takenErrands.add(order);
      assignmentByUnitId.set(scout.id, {
        job: "VILLAGE",
        at: coordOf(errand.index),
        field: errand.field,
        targetCityId: null,
      });
    });

  // Defence: engage the hostile land units next to an own city: all
  // hands while no enemy city is known, one unit each once there is a city
  // to march on (the rest counterattack).
  const ownLand = (at: CoordV7): boolean => {
    const tile = tiles[indexOf(at)];
    return (
      tile !== undefined &&
      tile.explored &&
      tile.territoryOwnerId === view.viewer.id
    );
  };
  const invaders = hostileLand
    .filter(
      (unit) =>
        ownCenters.some(
          (at) => chebyshev(at, unit.at) <= CAMPAIGN_INVADER_RADIUS_V7,
        ) &&
        // The Undead pass, correction: villages first.
        (facts.army?.villagesFirst !== true || ownLand(unit.at)),
    )
    .sort((left, right) => left.id - right.id);
  if (invaders.length > 0) {
    // A RUSH seat's free units all march: only the reserve defends.
    const attackers = (rush ? reserve : [...free, ...reserve]).filter(
      (unit) => {
        const rule = unitRoleRuleV7(view, unit);
        return rule.abilities.includes("ATTACK") && rule.attack2 > 0;
      },
    );
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
  // `pulp_wars-nc6`: an army seat keeps as many scouts as the exploration
  // plan asks for when that is more (by the unexplored share of the map,
  // the stretches of frontier it can reach, and its free capturers), and
  // sends none past the first while the enemy at an own center outweighs
  // the units there. Not a seat whose naval plan sails or that owns
  // Shorecraft: its free units are for the Port.
  let scoutsWanted = 0;
  let homeDanger = false;
  if (survey !== null && facts.army !== undefined) {
    const armyFacts6 = facts.army;
    if (armyFacts6.naval !== true && facts.seaTarget === null) {
      const reach = search([
        ...ownCenters.map(indexOf),
        ...free.map((unit) => indexOf(unit.at)),
      ]);
      scoutsWanted = explorationScoutsWantedV7(
        survey,
        explorationStretchesV7(
          survey,
          (index) => (reach[index] as number) >= 0,
          CAMPAIGN_EXPLORER_SPACING_V7,
        ),
        free.filter((unit) => captures(unit)).length,
      );
    }
    homeDanger = explorationHomeDangerV7({
      ownCenters,
      // The Undead pass, correction (villages first): a hostile unit
      // outside the seat's own land is no danger at home either.
      hostiles: hostileLand.filter(
        (unit) => armyFacts6.villagesFirst !== true || ownLand(unit.at),
      ),
      own: view.units.filter(
        (unit) =>
          unit.ownerId === view.viewer.id &&
          unit.hp > 0 &&
          unit.form === "LAND",
      ),
      strength: armyFacts6.strength,
    });
  }
  if (!rush && !homeDanger)
    sendScouts(
      targets.length === 0
        ? Math.max(CAMPAIGN_SCOUTS_BEFORE_CONTACT_V7, scoutsWanted) - 1
        : Math.max(
            scoutsWanted,
            facts.army?.expanding === true && facts.seaTarget === null
              ? Math.max(
                  CAMPAIGN_SCOUTS_EXPANDING_V7,
                  // One scout for every stretch of unexplored land at home.
                  Math.min(CAMPAIGN_SCOUTS_HOME_V7, homeFrontier.length),
                )
              : early && facts.seaTarget === null && homeFrontier.length > 0
                ? CAMPAIGN_SCOUTS_EXPANDING_V7
                : 1,
          ),
    );
  // Before contact the rest of the army follows the first scout, so the
  // enemy it finds meets a group and not one unit.
  if (targets.length === 0 && scouted) {
    // Tuning 8 (`pulp_wars-w49.11`): an army seat that still expands
    // spreads out instead: every free capturer takes its own stretch of
    // frontier. (A Goblin seat followed its first scout into a pocket of
    // Mountains for ten rounds and never saw the village three tiles south
    // of its capital.)
    // Not a seat whose naval plan sails: its second unit goes to the Port.
    if (
      facts.army?.expanding === true &&
      facts.seaTarget === null &&
      !homeDanger
    )
      sendScouts(Number.POSITIVE_INFINITY);
    for (const unit of scoutCandidates()) {
      // A unit follows the first scout that moves as it does, or else the
      // other one as far as its route goes (an Ice Folk seat's first
      // scouts are Yetis, and its Witch still follows them).
      const onFoot = main as CampaignAssignmentV7 | null;
      const overMountains = mountainMain as CampaignAssignmentV7 | null;
      const lead =
        survey !== null && terrainOf(unit) !== "GROUND"
          ? (overMountains ?? onFoot)
          : (onFoot ?? overMountains);
      if (
        lead !== null &&
        captures(unit) &&
        lead.field.get(unit.at) !== undefined
      )
        assignmentByUnitId.set(unit.id, lead);
    }
  }

  // Pressure: every other unit marches on its nearest known enemy city.
  const targetByCityId = new Map<CityId, CampaignTargetV7>();
  const workFields: RouteFieldV7[] = errands
    .filter((errand) => errand.job === "VILLAGE")
    .map((errand) => errand.field);
  // A HOLD seat marches on no city outside its zone.
  const marchTargets =
    confine === null ? targets : targets.filter((city) => confine(city.at));
  const raided = new Set<CityId>();
  if (marchTargets.length > 0) {
    const fields = marchTargets.map((city) => field([indexOf(city.at)]));
    workFields.push(...fields);
    // Tuning 7: a hostile city with no unit on or next to its center gets
    // the nearest fast capturer, alone and at once (undefended rear cities
    // were left alone for whole games).
    if (armyFacts !== undefined && !rush)
      marchTargets.forEach((city, order) => {
        if (
          indexOf(city.at) === seaTargetIndex ||
          // Tuning 8: no lone raid on a held city.
          hostileLand.some(
            (unit) =>
              chebyshev(unit.at, city.at) <= CAMPAIGN_RAID_CLEAR_RADIUS_V7,
          )
        )
          return;
        let raider: PublicUnitV7 | null = null;
        let raiderSteps = CAMPAIGN_RAID_STEPS_V7 + 1;
        for (const unit of unassigned()) {
          if (
            !captures(unit) ||
            unitRoleRuleV7(view, unit).move < CAMPAIGN_RAID_MOVE_V7
          )
            continue;
          const steps = fields[order]?.get(unit.at);
          if (steps !== undefined && steps < raiderSteps) {
            raider = unit;
            raiderSteps = steps;
          }
        }
        const route = fields[order];
        if (raider === null || route === undefined) return;
        raided.add(city.id);
        assignmentByUnitId.set(raider.id, {
          job: "ATTACK",
          at: city.at,
          field: route,
          targetCityId: city.id,
          raid: true,
        });
      });
    // The nearest city, a walled one counting as farther. Visible
    // defenders do not move the choice: they come and go with every step,
    // and a unit that changes its target every turn never arrives.
    const penalties = marchTargets.map(
      (city) => Number(cityHasWallsV7(city)) * CAMPAIGN_WALLS_PENALTY_V7,
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
      marchTargets.forEach((city, order) => {
        if (!allowed(order)) return;
        const cost = costTo(unit, order);
        if (
          cost < bestCost ||
          (cost === bestCost &&
            Number.isFinite(cost) &&
            city.id < (marchTargets[best]?.id ?? city.id))
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
      marchTargets[order]?.ownerId;
    const seats = [...new Set(marchTargets.map((city) => city.ownerId))]
      .filter((seat) =>
        army.some(
          (unit) => nearest(unit, (order) => seatOf(order) === seat) >= 0,
        ),
      )
      .sort((left, right) => left - right);
    const onSeat = (seat: PlayerId): PublicUnitV7[] =>
      army.filter((unit) => seatOf(choice.get(unit.id) ?? -1) === seat);
    // Tuning 7: an army seat concentrates, on opportunity and reach and
    // not on weakness. Round 6 sent every unit to its own nearest city: 36
    // units stood on three fronts, none of them with the numbers to
    // assault. The first draft of this round marched on the seat with the
    // fewest city levels, which leaves a strong neighbor (a competent
    // human) for last however near its border city is.
    //
    // Now every known hostile city is a candidate front, at the cost of
    // its reach (the walk from the nearest army unit or own center, a
    // walled city counting as farther), plus up to
    // `CAMPAIGN_FRONT_DEFENSE_STEPS_V7` for the visible units that hold it
    // (their strength against the free army's), less
    // `CAMPAIGN_FRONT_WAR_STEPS_V7` where the army is already in contact.
    // Nothing about the seat as a whole counts: not its city levels, not
    // its army elsewhere, not who plays it. The cheapest city is the main
    // front. An army with more than its fronts need opens another: a front
    // needs twice the strength of the visible units that hold its city, at
    // least `CAMPAIGN_FRONT_MAIN_UNITS_V7` units for the main front and
    // `CAMPAIGN_FRONT_MIN_UNITS_V7` for a further one. The surplus over
    // the main front's need goes to the next cheapest city, a city of a
    // seat that has no front yet counting
    // `CAMPAIGN_FRONT_SAME_SEAT_STEPS_V7` nearer; everything else stays
    // with the main front, which keeps its need once more for every front
    // already open. The units of a holding force keep their nearest target.
    // (An army seat sends no pair to every other seat either way.)
    const concentrated = facts.army !== undefined;
    if (facts.army !== undefined && marchTargets.length >= 2) {
      const armyFacts7 = facts.army;
      const free = army.filter((unit) => !armyFacts7.holds(unit));
      const freeStrength = free.reduce(
        (sum, unit) => sum + armyFacts7.strength(unit),
        0,
      );
      const defenders = marchTargets.map((city) =>
        hostileLand.filter(
          (unit) =>
            chebyshev(unit.at, city.at) <= CAMPAIGN_FRONT_DEFENSE_RADIUS_V7,
        ),
      );
      const defense = defenders.map((units) =>
        units.reduce((sum, unit) => sum + armyFacts7.strength(unit), 0),
      );
      // Tuning 8: what a front on each city must outweigh, and whether it
      // needs its shooters (Walls, or a ranged or siege unit among the
      // holders).
      const holdStrength = armyFacts7.holdStrength ?? armyFacts7.strength;
      const sized = marchTargets.map((city) =>
        hostileLand.filter(
          (unit) =>
            chebyshev(unit.at, city.at) <= CAMPAIGN_FRONT_SIZE_RADIUS_V7,
        ),
      );
      const need = sized.map((units) =>
        units.reduce((sum, unit) => sum + holdStrength(unit), 0),
      );
      const fortified = marchTargets.map(
        (city, order) =>
          cityHasWallsV7(city) ||
          (sized[order] ?? []).some(
            (unit) => armyFacts7.shoots?.(unit) === true,
          ),
      );
      const fronts: number[] = [];
      const frontCost = (
        order: number,
        units: readonly PublicUnitV7[],
      ): { readonly cost: number; readonly reach: number } => {
        let reach = Number.POSITIVE_INFINITY;
        for (const unit of units) reach = Math.min(reach, costTo(unit, order));
        if (!Number.isFinite(reach))
          return { cost: Number.POSITIVE_INFINITY, reach };
        for (const center of ownCenters) {
          const steps = fields[order]?.get(center);
          if (steps !== undefined)
            reach = Math.min(reach, steps + (penalties[order] ?? 0));
        }
        const held =
          freeStrength <= 0
            ? CAMPAIGN_FRONT_DEFENSE_STEPS_V7
            : Math.min(
                CAMPAIGN_FRONT_DEFENSE_STEPS_V7,
                Math.floor(
                  (CAMPAIGN_FRONT_DEFENSE_STEPS_V7 * (defense[order] ?? 0)) /
                    freeStrength,
                ),
              );
        const contact = (defenders[order] ?? []).some((hostile) =>
          free.some(
            (unit) =>
              chebyshev(unit.at, hostile.at) <= CAMPAIGN_FRONT_CONTACT_V7,
          ),
        );
        const seat = seatOf(order);
        const fresh =
          fronts.length > 0 && !fronts.some((front) => seatOf(front) === seat);
        return {
          cost:
            reach +
            held -
            (contact ? CAMPAIGN_FRONT_WAR_STEPS_V7 : 0) -
            (fresh ? CAMPAIGN_FRONT_SAME_SEAT_STEPS_V7 : 0),
          reach,
        };
      };
      const cheapest = (units: readonly PublicUnitV7[]): number => {
        let best = -1;
        let bestCost = Number.POSITIVE_INFINITY;
        let bestReach = Number.POSITIVE_INFINITY;
        marchTargets.forEach((city, order) => {
          if (fronts.includes(order)) return;
          const { cost, reach } = frontCost(order, units);
          if (!Number.isFinite(cost)) return;
          if (
            cost < bestCost ||
            (cost === bestCost &&
              (reach < bestReach ||
                (reach === bestReach &&
                  city.id < (marchTargets[best]?.id ?? city.id))))
          ) {
            best = order;
            bestCost = cost;
            bestReach = reach;
          }
        });
        return best;
      };
      const main = cheapest(free);
      if (main >= 0) {
        fronts.push(main);
        let rest = free.filter((unit) => Number.isFinite(costTo(unit, main)));
        for (const unit of rest) choice.set(unit.id, main);
        /**
         * The units of `units` nearest to a front, until they have twice
         * the strength of what holds it (at least `least` of them), or
         * null when they do not suffice.
         */
        const force = (
          order: number,
          units: readonly PublicUnitV7[],
          least: number,
        ): PublicUnitV7[] | null => {
          const ordered = units
            .filter((unit) => Number.isFinite(costTo(unit, order)))
            .sort(
              (left, right) =>
                costTo(left, order) - costTo(right, order) ||
                left.id - right.id,
            );
          const wanted =
            (CAMPAIGN_FRONT_NEED_RATIO_V7 * (need[order] ?? 0)) / 100;
          const sent: PublicUnitV7[] = [];
          let strength = 0;
          for (const unit of ordered) {
            if (sent.length >= least && strength >= wanted) break;
            sent.push(unit);
            strength += armyFacts7.strength(unit);
          }
          if (sent.length < least || strength < wanted) return null;
          // Tuning 8: against Walls, Catapults, or Marksmen the group
          // brings its own shooters: a third of it, the nearest ones, in
          // place of the units that would have walked the farthest.
          if (fortified[order] === true && armyFacts7.shoots !== undefined) {
            const shoots = armyFacts7.shoots;
            const share = Math.floor(
              sent.length / CAMPAIGN_FRONT_SHOOTER_SHARE_V7,
            );
            const extra = ordered.filter(
              (unit) => !sent.includes(unit) && shoots(unit),
            );
            for (
              let have = sent.filter((unit) => shoots(unit)).length;
              have < share && extra.length > 0;
              have += 1
            ) {
              let last = -1;
              for (let index = sent.length - 1; index >= 0; index -= 1)
                if (!shoots(sent[index] as PublicUnitV7)) {
                  last = index;
                  break;
                }
              if (last < 0) break;
              sent.splice(last, 1, extra.shift() as PublicUnitV7);
            }
          }
          return sent;
        };
        // What the main front keeps: what it needs, and that again for
        // every further front (so a third front takes a much larger army).
        const keep =
          force(main, rest, CAMPAIGN_FRONT_MAIN_UNITS_V7)?.length ??
          rest.length;
        for (;;) {
          const next = cheapest(rest);
          if (next < 0) break;
          const sent = force(next, rest, CAMPAIGN_FRONT_MIN_UNITS_V7);
          if (sent === null || rest.length - sent.length < keep * fronts.length)
            break;
          fronts.push(next);
          for (const unit of sent) choice.set(unit.id, next);
          rest = rest.filter((unit) => !sent.includes(unit));
        }
      }
    }
    const quota =
      seats.length < 2 || concentrated
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
    const marching = marchTargets.map(() => [] as PublicUnitV7[]);
    for (const unit of army) {
      const order = choice.get(unit.id) ?? -1;
      const city = marchTargets[order];
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
        const city = marchTargets[order];
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
    marchTargets.forEach((city, order) => {
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
      // A RUSH wave is one unit: it sets out at once.
      const needed = rush
        ? 1
        : Math.max(
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
        push:
          rush ||
          clash ||
          raided.has(city.id) ||
          home >= needed ||
          out >= CAMPAIGN_WAVE_OUT_V7,
      });
    });
  }
  // Tuning 8 (`pulp_wars-w49.11`): an army seat's capturer with no job (no
  // route to any known city) explores; it used to stand at home. Not a
  // seat whose naval plan sails: its jobless capturers are for the Port.
  if (
    facts.army !== undefined &&
    !rush &&
    targets.length > 0 &&
    facts.seaTarget === null
  )
    sendScouts(Number.POSITIVE_INFINITY);
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
