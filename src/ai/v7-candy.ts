import type { UnitId } from "../engine/model/ids";
import {
  effectiveRoleRuleV7,
  factionTreeV7,
  unitMayActAfterMoveV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import { unitIsCrashedV7, unitIsRushedV7 } from "../engine/v7/candy";
import type { CommandV7 } from "../engine/v7/commands";
import type { CombatPreviewV7 } from "../engine/v7/events";
import {
  previewCrumbsEatV7,
  previewRebakeV7,
  previewSugarRushV7,
  queryCombatPreviewV7,
} from "../engine/v7/query";
import type { CoordV7, TechnologyIdV7, UnitRoleIdV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";

/**
 * The Candy Normal AI (`pulp_wars-jdb.4`,
 * docs/product/RULESET_7_CANDY.md section 14).
 *
 * Every function reads only the viewer's public view (the `sugarRush`,
 * `crumbs`, and `splattedThisTurn` lists, the `candy` block of the public
 * unit stats), the offered public commands, and public previews. Nothing
 * here draws from the PRNG, reads authoritative state, or depends on
 * elapsed time. The policy calls these helpers only in a match with a Candy
 * seat (`candyMatchForPolicyV7`), so decisions in every other match stay
 * byte-identical.
 *
 * Values are in the policy's usual units: a unit is worth its cost x 4 plus
 * its HP; priorities are the policy's tiers (a kill 1180, a kill of a unit
 * that threatens an own city 1280, a chip 900, routine Moves 600 to 850).
 */

// --- The switch -----------------------------------------------------------

/**
 * Which groups of Candy rules the policy plays. The switch exists for the
 * head-to-head and win-tendency tests the spec requires (the Candy policy
 * against the ordinary policy on the Candy registration, and each group
 * with and without it): a test or a headless harness sets it before a
 * seat's decision. With every group off the policy decides exactly as the
 * ordinary policy of `pulp_wars-jdb.3` did.
 */
export interface CandyPolicyOptionsV7 {
  /** Sugar Rush for a kill, a threatened city, or under Home Sweet Home. */
  readonly rush: boolean;
  /** A Crashed unit steps out of reach and never walks into more of it. */
  readonly crashRetreat: boolean;
  /** The Confectioner walks to Crumbs and Re-bakes. */
  readonly rebake: boolean;
  /** The Pie Launcher Splats the target the melee units will attack. */
  readonly pieFirst: boolean;
  /** The Gumball Gunner Tosses when its shot is weak. */
  readonly sugarToss: boolean;
  /** The Candy production values. */
  readonly production: boolean;
  /** The Candy research plan. */
  readonly research: boolean;
  /**
   * Against the Candy: a Crashed unit is no threat on its next turn, and
   * wins a tie of the attack score.
   */
  readonly readCrash: boolean;
  /** Against the Candy: a routine Move ends on hostile Crumbs. */
  readonly eatCrumbs: boolean;
  /** Against the Candy: a melee attack that will be bounced loses a step. */
  readonly respectBounce: boolean;
}

export const DEFAULT_CANDY_POLICY_OPTIONS_V7: CandyPolicyOptionsV7 =
  Object.freeze({
    rush: true,
    crashRetreat: true,
    rebake: true,
    pieFirst: true,
    sugarToss: true,
    production: true,
    research: true,
    readCrash: true,
    eatCrumbs: true,
    respectBounce: true,
  });

/** Every group off: the ordinary policy of `pulp_wars-jdb.3`. */
export const NO_CANDY_POLICY_OPTIONS_V7: CandyPolicyOptionsV7 = Object.freeze({
  rush: false,
  crashRetreat: false,
  rebake: false,
  pieFirst: false,
  sugarToss: false,
  production: false,
  research: false,
  readCrash: false,
  eatCrumbs: false,
  respectBounce: false,
});

let candyPolicyOptions: CandyPolicyOptionsV7 = DEFAULT_CANDY_POLICY_OPTIONS_V7;

/** The options the next decisions use. */
export function candyPolicyOptionsV7(): CandyPolicyOptionsV7 {
  return candyPolicyOptions;
}

/**
 * Tests and headless harnesses only: changes the options and returns the
 * previous ones (restore them when done).
 */
export function setCandyPolicyOptionsV7(
  options: Partial<CandyPolicyOptionsV7>,
): CandyPolicyOptionsV7 {
  const previous = candyPolicyOptions;
  candyPolicyOptions = Object.freeze({ ...candyPolicyOptions, ...options });
  return previous;
}

// --- Priorities and values --------------------------------------------------

/** A Rush for a kill waits for the plain kills of its tier (1180, 1280). */
export const RUSH_KILL_PRIORITY_V7 = 1179;
export const RUSH_THREAT_KILL_PRIORITY_V7 = 1279;
/** The Move of a Rushed unit's kill plan: the kill tier itself. */
export const RUSH_MOVE_PRIORITY_V7 = 1180;
export const RUSH_THREAT_MOVE_PRIORITY_V7 = 1280;
/** A Rush that reaches a threatened own center (the Move there is 1250). */
export const RUSH_CITY_PRIORITY_V7 = 1251;
/** A free Rush (Home Sweet Home) goes just before the attack it boosts. */
export const RUSH_HOME_OFFSET_V7 = 1;
/** A Crashed unit next to a hostile melee unit steps out of its reach. */
export const CRASH_RETREAT_PRIORITY_V7 = 935;
/** Moves below this are routine (the Dwarf policy's line). */
export const CANDY_ROUTINE_MOVE_PRIORITY_V7 = 1100;
/** A Re-bake comes before `TRAIN` (1080, or 1260 in a threatened city). */
export const REBAKE_PRIORITY_V7 = 1265;
/** A Confectioner walks next to Crumbs (the Ghoul's Devour approach). */
export const REBAKE_APPROACH_PRIORITY_V7 = 1176;
/** Crumbs further than this (Chebyshev) are not walked to. */
export const REBAKE_APPROACH_RADIUS_V7 = 3;
/** A Pie Launcher's Splat goes before the melee chips of its tier. */
export const PIE_FIRST_OFFSET_V7 = 3;
/** A Toss instead of a weak shot goes just before the chips. */
export const SUGAR_TOSS_PRIORITY_V7 = 905;
/** A Toss of a Gunner with no offered attack (Tend Wounded's tier). */
export const SUGAR_TOSS_IDLE_PRIORITY_V7 = 650;
/** A Gunner's shot is weak below this damage (unless it kills). */
export const SUGAR_TOSS_WEAK_DAMAGE_V7 = 3;
/** The Gingerbread Giant's cost for the Toss order (it has none). */
export const GOLEM_TOSS_COST_V7 = 12;
/** Kills of these roles are worth a Rush into lethal reach. */
export const RUSH_KEY_KILL_ROLES_V7: readonly UnitRoleIdV7[] = [
  "CATAPULT",
  "CAPTAIN",
  "KNIGHT",
];

/** Production (section 14, "produce every role"). */
export const CANDY_FIRST_OF_ROLE_BIAS_V7 = 10;
export const THREATENED_GUMDROP_BIAS_V7 = 12;
export const THREATENED_CANDY_SUPPORT_COST_V7 = 30;
export const CANDY_SURPLUS_COST_V7 = 20;
export const FRONT_UNITS_PER_CONFECTIONER_V7 = 6;
export const FRONT_UNITS_PER_PIE_V7 = 4;

/** Research (section 14, "research toward its roles"). */
export const CANDY_EARLY_RESEARCH_PRIORITY_V7 = 1062;
export const CANDY_RESEARCH_PRIORITY_V7 = 1150;
/** Home Sweet Home: a visible hostile unit within this of an own center. */
export const HOME_SWEET_HOME_THREAT_RADIUS_V7 = 3;

/** Against the Candy: a Crashed target wins a tie of the attack score. */
export const CRASHED_TARGET_VALUE_V7 = 1;
/** Against the Candy: a melee attack that will be bounced loses a step. */
export const BOUNCE_COST_V7 = 1;
/** Against the Candy: eating Crumbs is worth a sideways step. */
export const CRUMBS_EAT_OBJECTIVE_V7 = 2;
/** Crumbs of a role this dear are eaten even through a Peppermint bite. */
export const CRUMBS_BITE_WORTH_COST_V7 = 4;

// --- Gate and facts ---------------------------------------------------------

/** Whether the match has a Candy seat (the gate of every heuristic). */
export function candyMatchForPolicyV7(view: PlayerViewV7): boolean {
  return view.players.some((player) => player.faction === "CANDY");
}

/** Whether a visible unit is Crashed (it cannot act on its owner's turn). */
export function crashedForPolicyV7(
  view: PlayerViewV7,
  unitId: UnitId,
): boolean {
  return unitIsCrashedV7(view, unitId);
}

/** The public `candy` stat block of a visible unit. */
function candyStatsV7(
  view: PlayerViewV7,
  unitId: UnitId,
): PlayerViewV7["unitStats"][number]["candy"] {
  return view.unitStats.find((stats) => stats.unitId === unitId)?.candy;
}

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const byTile = (left: CoordV7, right: CoordV7): number =>
  left.y - right.y || left.x - right.x;

// --- The policy's tools -----------------------------------------------------

/** What the Candy plans read from the policy (public facts only). */
export interface CandyPolicyToolsV7 {
  readonly view: PlayerViewV7;
  /** The ready commands of this decision. */
  readonly commands: readonly CommandV7[];
  /** The visible hostile units. */
  readonly hostiles: readonly PublicUnitV7[];
  /** The policy's value of a target (cost x 4 plus HP, and its bonuses). */
  readonly targetValue: (unit: PublicUnitV7) => number;
  /** Visible damage `unit` may take on `at` during the enemy turns. */
  readonly danger: (unit: PublicUnitV7, at: CoordV7) => number;
  /**
   * The same on a board without the unit `withoutUnitId` (a target the
   * plan kills first).
   */
  readonly dangerWithout: (
    unit: PublicUnitV7,
    at: CoordV7,
    withoutUnitId: UnitId,
  ) => number;
  /** Whether the visible unit threatens an own city (the policy's list). */
  readonly threatens: (unitId: UnitId) => boolean;
  /** The policy's cheap damage estimate of an own attack. */
  readonly projectedDamage: (
    attacker: PublicUnitV7,
    target: PublicUnitV7,
    bonusAttack2: number,
  ) => number;
  /** The view after a Move of the unit to `at` over `pathLength` tiles. */
  readonly moved: (
    unit: PublicUnitV7,
    at: CoordV7,
    pathLength: number,
  ) => PlayerViewV7;
  /** Free unit slots of the city. */
  readonly freeCapacity: (unit: PublicUnitV7) => number;
  /** Whether `at` is a threatened own center with no own unit on it. */
  readonly threatenedEmptyCenter: (at: CoordV7) => boolean;
  /** Whether the unit stands on a threatened own center. */
  readonly holdsThreatenedCenter: (unit: PublicUnitV7) => boolean;
  /** Whether the policy would consider this offered attack at all. */
  readonly attackCandidate: (
    command: Extract<CommandV7, { kind: "ATTACK" }>,
  ) => boolean;
}

// --- Sugar Rush ---------------------------------------------------------------

export interface RushPlanV7 {
  readonly unitId: UnitId;
  /** `KILL` (rule 1), `CITY` (rule 2), or `HOME` (rule 3). */
  readonly reason: "KILL" | "CITY" | "HOME";
  /** The tile the plan's Move ends on, or null when the unit stays. */
  readonly to: CoordV7 | null;
  /** The plan's target, or null for a `CITY` plan. */
  readonly targetUnitId: UnitId | null;
  readonly priority: number;
  readonly strategic: number;
}

interface AttackOptionV7 {
  readonly from: CoordV7;
  readonly target: PublicUnitV7;
  readonly preview: CombatPreviewV7;
  /** Where the unit stands after the exchange. */
  readonly end: CoordV7;
}

/** The ends of the offered Moves of a unit, in (y, x) order. */
function offeredMoveEndsV7(
  commands: readonly CommandV7[],
  unitId: UnitId,
): readonly CoordV7[] {
  const ends = new Map<string, CoordV7>();
  for (const command of commands) {
    if (command.kind !== "MOVE" || command.unitId !== unitId) continue;
    const end = command.path.at(-1);
    if (end !== undefined) ends.set(`${end.x},${end.y}`, end);
  }
  return [...ends.values()].sort(byTile);
}

/**
 * The exact exchange of `unit` attacking `target` from `from` (its own tile,
 * or the end of a Move), Rushed or plain; null when the attack is not legal
 * from there.
 */
function attackOptionV7(
  tools: CandyPolicyToolsV7,
  unit: PublicUnitV7,
  from: CoordV7,
  target: PublicUnitV7,
  rushed: boolean,
): AttackOptionV7 | null {
  const view = tools.view;
  const stays = same(from, unit.at);
  const preview = queryCombatPreviewV7(
    stays
      ? view
      : tools.moved(unit, from, Math.max(1, chebyshev(unit.at, from))),
    unit.id,
    target.id,
    rushed ? { assumeSugarRush: true } : {},
  );
  if (preview === null) return null;
  const end =
    preview.bounce === "WILL_BOUNCE" && preview.bounceTo !== null
      ? preview.bounceTo
      : preview.advances
        ? target.at
        : from;
  return { from, target, preview, end };
}

/** Whether the unit stands on or next to a city center the viewer owns. */
function byOwnCenterV7(view: PlayerViewV7, at: CoordV7): boolean {
  return view.cities.some(
    (city) => city.ownerId === view.viewer.id && chebyshev(city.at, at) <= 1,
  );
}

/**
 * The targets an own Rushed unit that has neither moved nor attacked is
 * about to kill (its plan), so that a second unit does not Rush for them.
 */
function claimedRushTargetsV7(
  tools: CandyPolicyToolsV7,
  exceptUnitId: UnitId,
): ReadonlySet<UnitId> {
  const view = tools.view;
  const claimed = new Set<UnitId>();
  for (const entry of view.sugarRush) {
    if (entry.phase !== "RUSHED" || entry.unitId === exceptUnitId) continue;
    const unit = view.units.find((candidate) => candidate.id === entry.unitId);
    if (
      unit === undefined ||
      unit.ownerId !== view.viewer.id ||
      unit.activation.attacked ||
      unit.activation.handled
    )
      continue;
    const plan = rushedKillPlanV7(tools, unit, new Set());
    if (plan !== null) claimed.add(plan.target.id);
  }
  return claimed;
}

/**
 * The best kill of a unit that is Rushed (or estimated as Rushed) over the
 * given Move ends and its own tile: the dearest target, then the safest
 * end, then staying, then (y, x) and the target's ID.
 */
function bestRushKillV7(
  tools: CandyPolicyToolsV7,
  unit: PublicUnitV7,
  ends: readonly CoordV7[],
  claimed: ReadonlySet<UnitId>,
  accept: (option: AttackOptionV7) => boolean,
): AttackOptionV7 | null {
  const view = tools.view;
  const rule = unitRoleRuleV7(view, unit);
  if (!rule.abilities.includes("ATTACK")) return null;
  const mayMove = !unit.activation.moved && unitMayActAfterMoveV7(view, unit);
  const reach = rule.range + (mayMove ? rule.move + 1 : 0);
  let best: { option: AttackOptionV7; key: readonly number[] } | null = null;
  for (const target of tools.hostiles) {
    if (claimed.has(target.id) || chebyshev(target.at, unit.at) > reach)
      continue;
    // The cheap estimate first: the Rush bonus (the Charge bonus replaces
    // it, and is 2 as well) must reach the target's HP.
    if (tools.projectedDamage(unit, target, 2) < target.hp) continue;
    const froms = [unit.at, ...(mayMove ? ends : [])].filter((from) => {
      const range = chebyshev(from, target.at);
      return range >= rule.minimumRange && range <= rule.range;
    });
    for (const from of froms) {
      const option = attackOptionV7(tools, unit, from, target, true);
      if (
        option === null ||
        !option.preview.defenderDies ||
        option.preview.attackerDies ||
        !accept(option)
      )
        continue;
      const after = {
        ...unit,
        hp: unit.hp - option.preview.damageToAttacker,
      };
      const key = [
        tools.targetValue(target),
        -tools.dangerWithout(after, option.end, target.id),
        Number(same(from, unit.at)),
        -from.y,
        -from.x,
        -target.id,
      ];
      if (best === null || compareKeys(key, best.key) > 0)
        best = { option, key };
    }
  }
  return best?.option ?? null;
}

function compareKeys(
  left: readonly number[],
  right: readonly number[],
): number {
  for (let index = 0; index < left.length; index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

/** Whether a plain (not Rushed) plan of the unit kills `target`. */
function plainKillsV7(
  tools: CandyPolicyToolsV7,
  unit: PublicUnitV7,
  target: PublicUnitV7,
  plainEnds: readonly CoordV7[],
): boolean {
  const view = tools.view;
  const rule = unitRoleRuleV7(view, unit);
  const charge = rule.abilities.includes("CHARGE") ? 2 : 0;
  if (tools.projectedDamage(unit, target, charge) < target.hp) return false;
  const mayMove = !unit.activation.moved && unitMayActAfterMoveV7(view, unit);
  for (const from of [unit.at, ...(mayMove ? plainEnds : [])]) {
    const range = chebyshev(from, target.at);
    if (range < rule.minimumRange || range > rule.range) continue;
    const option = attackOptionV7(tools, unit, from, target, false);
    if (option?.preview.defenderDies === true && !option.preview.attackerDies)
      return true;
  }
  return false;
}

/**
 * Rule 1's safety and the Chocolate Bunny's condition for one Rushed kill: the
 * unit does not end in visible lethal reach unless the kill is a key role;
 * a Chocolate Bunny Rushes only for a kill with a Sugar Frenzy target next to
 * its new tile, or for a key kill.
 */
function rushKillAcceptableV7(
  tools: CandyPolicyToolsV7,
  unit: PublicUnitV7,
  option: AttackOptionV7,
): boolean {
  const view = tools.view;
  const key = RUSH_KEY_KILL_ROLES_V7.includes(option.target.role);
  if (key) return true;
  if (unitRoleMechanicsV7(view, unit).rushPerk === "SUGAR_FRENZY") {
    const frenzy =
      option.preview.overrunContinues &&
      tools.hostiles.some(
        (hostile) =>
          hostile.id !== option.target.id &&
          chebyshev(hostile.at, option.end) === 1,
      );
    if (!frenzy) return false;
  }
  const hp = unit.hp - option.preview.damageToAttacker;
  return (
    tools.dangerWithout({ ...unit, hp }, option.end, option.target.id) < hp
  );
}

/** The kill plan of an own unit that is already Rushed, or null. */
function rushedKillPlanV7(
  tools: CandyPolicyToolsV7,
  unit: PublicUnitV7,
  claimed: ReadonlySet<UnitId>,
): AttackOptionV7 | null {
  return bestRushKillV7(
    tools,
    unit,
    offeredMoveEndsV7(tools.commands, unit.id),
    claimed,
    () => true,
  );
}

/**
 * Section 14, "Rush for a reason": the Rush plan of the own unit of an
 * offered `SUGAR_RUSH`, or null when it should not Rush.
 *
 * 1. `KILL`: the Rushed plan kills a target no plain plan of the unit
 *    kills, and the unit does not end in visible lethal reach unless the
 *    kill is a Catapult, Captain, or Knight role; a Chocolate Bunny also needs a
 *    Sugar Frenzy target next to its new tile (or a key kill).
 * 2. `CITY`: the Rushed Move reaches a threatened own center with no own
 *    unit on it that the plain Move cannot reach.
 * 3. `HOME`: the seat has Home Sweet Home and the unit has an attack that
 *    leaves it on or next to an own center (the Rush is free there).
 */
export function planSugarRushV7(
  tools: CandyPolicyToolsV7,
  unit: PublicUnitV7,
): RushPlanV7 | null {
  const view = tools.view;
  if (
    unit.ownerId !== view.viewer.id ||
    unit.form !== "LAND" ||
    unit.activation.moved
  )
    return null;
  const rule = unitRoleRuleV7(view, unit);
  const reach = rule.move + 1 + rule.range;
  const hostileNear = tools.hostiles.some(
    (hostile) => chebyshev(hostile.at, unit.at) <= reach,
  );
  // The defender of a threatened own center stays on it.
  const holdsCenter = tools.holdsThreatenedCenter(unit);
  const centers = holdsCenter
    ? []
    : view.cities
        .filter(
          (city) =>
            city.ownerId === view.viewer.id &&
            chebyshev(city.at, unit.at) <= rule.move + 1 &&
            tools.threatenedEmptyCenter(city.at),
        )
        .map((city) => city.at)
        .sort(byTile);
  if (!hostileNear && centers.length === 0) return null;
  const preview = previewSugarRushV7(view, unit.id);
  if (preview === null) return null;
  const plainEnds = offeredMoveEndsV7(tools.commands, unit.id);
  // Rule 2.
  const center = centers.find((at) =>
    preview.newDestinations.some((to) => same(to, at)),
  );
  if (center !== undefined)
    return {
      unitId: unit.id,
      reason: "CITY",
      to: center,
      targetUnitId: null,
      priority: RUSH_CITY_PRIORITY_V7,
      strategic: 0,
    };
  if (!hostileNear) return null;
  const ends = holdsCenter ? [] : preview.destinations;
  // An attack from where the unit stands must be one the policy would make.
  const candidate = (option: AttackOptionV7): boolean =>
    !same(option.from, unit.at) ||
    tools.attackCandidate({
      kind: "ATTACK",
      unitId: unit.id,
      targetUnitId: option.target.id,
    });
  // Rule 1.
  const claimed = claimedRushTargetsV7(tools, unit.id);
  const kill = bestRushKillV7(
    tools,
    unit,
    ends,
    claimed,
    (option) =>
      (!holdsCenter || !option.preview.advances) &&
      rushKillAcceptableV7(tools, unit, option) &&
      candidate(option) &&
      !plainKillsV7(tools, unit, option.target, holdsCenter ? [] : plainEnds),
  );
  if (kill !== null) {
    const threat = tools.threatens(kill.target.id);
    return {
      unitId: unit.id,
      reason: "KILL",
      to: same(kill.from, unit.at) ? null : kill.from,
      targetUnitId: kill.target.id,
      priority: threat ? RUSH_THREAT_KILL_PRIORITY_V7 : RUSH_KILL_PRIORITY_V7,
      strategic: tools.targetValue(kill.target),
    };
  }
  // Rule 3: the unit's offered attacks that leave it by an own center.
  if (
    candyStatsV7(view, unit.id)?.homeSweetHome !== true ||
    unitRoleMechanicsV7(view, unit).rushPerk === "SUGAR_FRENZY" ||
    rule.tacticalRole === "SUPPORT" ||
    !byOwnCenterV7(view, unit.at)
  )
    return null;
  // A unit below half its HP recovers instead of chipping.
  const recovers = unit.hp * 2 < unit.maxHp;
  let home: { option: AttackOptionV7; key: readonly number[] } | null = null;
  for (const command of tools.commands) {
    if (command.kind !== "ATTACK" || command.unitId !== unit.id) continue;
    const target = view.units.find(
      (candidate) => candidate.id === command.targetUnitId,
    );
    if (target === undefined) continue;
    const option = attackOptionV7(tools, unit, unit.at, target, true);
    if (
      option === null ||
      option.preview.attackerDies ||
      !option.preview.sugarRushApplied ||
      !byOwnCenterV7(view, option.end) ||
      (holdsCenter && option.preview.advances) ||
      (recovers && !option.preview.defenderDies) ||
      !tools.attackCandidate(command)
    )
      continue;
    const key = [
      Number(option.preview.defenderDies),
      option.preview.damageToDefender,
      -target.id,
    ];
    if (home === null || compareKeys(key, home.key) > 0) home = { option, key };
  }
  if (home === null) return null;
  const threat = tools.threatens(home.option.target.id);
  const tier = home.option.preview.defenderDies
    ? threat
      ? 1280
      : 1180
    : threat
      ? 1240
      : 900;
  return {
    unitId: unit.id,
    reason: "HOME",
    to: null,
    targetUnitId: home.option.target.id,
    priority: tier + RUSH_HOME_OFFSET_V7,
    strategic: home.option.preview.damageToDefender,
  };
}

/**
 * The Move of a Rushed own unit's kill plan (the unit Rushed for it): the
 * tile to move to and the kill's tier, or null when the plan needs no Move
 * (or there is none).
 */
export function rushedMovePlanV7(
  tools: CandyPolicyToolsV7,
  unit: PublicUnitV7,
): {
  readonly to: CoordV7;
  readonly priority: number;
  readonly strategic: number;
} | null {
  const view = tools.view;
  if (
    unit.ownerId !== view.viewer.id ||
    unit.form !== "LAND" ||
    unit.activation.moved ||
    unit.activation.attacked ||
    !unitIsRushedV7(view, unit.id)
  )
    return null;
  const plan = rushedKillPlanV7(
    tools,
    unit,
    claimedRushTargetsV7(tools, unit.id),
  );
  if (plan === null || same(plan.from, unit.at)) return null;
  return {
    to: plan.from,
    priority: tools.threatens(plan.target.id)
      ? RUSH_THREAT_MOVE_PRIORITY_V7
      : RUSH_MOVE_PRIORITY_V7,
    strategic: tools.targetValue(plan.target),
  };
}

// --- The Crash --------------------------------------------------------------

/**
 * Section 14, "Crashed units step back": the Move of a Crashed own unit to
 * `to`. Next to a visible hostile melee unit it moves to a tile with less
 * visible threat (the lowest wins by the returned value) and makes no
 * other Move; elsewhere it makes no routine Move into more threat than
 * where it stands.
 */
export function crashedMoveValueV7(
  tools: CandyPolicyToolsV7,
  unit: PublicUnitV7,
  to: CoordV7,
  priority: number,
): { readonly priority: number; readonly strategic: number } {
  const view = tools.view;
  const here = tools.danger(unit, unit.at);
  const there = tools.danger(unit, to);
  const meleeAdjacent = tools.hostiles.some((hostile) => {
    if (hostile.form !== "LAND" || chebyshev(hostile.at, unit.at) !== 1)
      return false;
    const rule = unitRoleRuleV7(view, hostile);
    return rule.abilities.includes("ATTACK") && rule.range === 1;
  });
  if (meleeAdjacent) {
    if (there < here)
      return {
        priority: Math.max(priority, CRASH_RETREAT_PRIORITY_V7),
        strategic: here - there,
      };
    return priority < CANDY_ROUTINE_MOVE_PRIORITY_V7
      ? { priority: -1, strategic: 0 }
      : { priority, strategic: 0 };
  }
  if (priority < CANDY_ROUTINE_MOVE_PRIORITY_V7 && there > here)
    return { priority: -1, strategic: 0 };
  return { priority, strategic: 0 };
}

// --- Re-bake ----------------------------------------------------------------

/** The Re-bake order: the dearest role, the lowest turns left, (y, x). */
function crumbsOrderV7(
  view: PlayerViewV7,
  left: { readonly at: CoordV7; readonly role: UnitRoleIdV7 },
  right: { readonly at: CoordV7; readonly role: UnitRoleIdV7 },
): number {
  const cost = (role: UnitRoleIdV7): number =>
    effectiveRoleRuleV7(role, view.viewer.faction).cost ?? 0;
  const turns = (at: CoordV7): number =>
    view.crumbs.find((entry) => same(entry.at, at))?.turnsLeft ?? 0;
  return (
    cost(right.role) - cost(left.role) ||
    turns(left.at) - turns(right.at) ||
    byTile(left.at, right.at)
  );
}

/**
 * Section 14, "avoid fragile Re-bakes": whether the copy of `role` with
 * `hp` HP on `at` would stand in visible lethal reach with no own center
 * next to it and no own fighting unit beside it.
 */
function fragileRebakeV7(
  tools: CandyPolicyToolsV7,
  confectioner: PublicUnitV7,
  at: CoordV7,
  role: UnitRoleIdV7,
  hp: number,
): boolean {
  const view = tools.view;
  const rule = effectiveRoleRuleV7(role, view.viewer.faction);
  const copy: PublicUnitV7 = {
    ...confectioner,
    role,
    hp,
    maxHp: rule.maxHp,
    at,
  };
  if (tools.danger(copy, at) < hp) return false;
  if (byOwnCenterV7(view, at)) return false;
  return !view.units.some(
    (unit) =>
      unit.ownerId === view.viewer.id &&
      unit.id !== confectioner.id &&
      unit.form === "LAND" &&
      chebyshev(unit.at, at) === 1 &&
      !unitIsCrashedV7(view, unit.id) &&
      unitRoleRuleV7(view, unit).tacticalRole !== "SUPPORT",
  );
}

/**
 * Section 14, "Re-bake": the one Re-bake a Confectioner asks for (the best
 * offered Crumbs that are not a fragile Re-bake), with its score.
 */
export function rebakeScoreV7(
  tools: CandyPolicyToolsV7,
  command: Extract<CommandV7, { kind: "REBAKE" }>,
): {
  readonly priority: number;
  readonly strategic: number;
  readonly immediate: number;
} {
  const none = { priority: -1, strategic: 0, immediate: 0 };
  const view = tools.view;
  const confectioner = view.units.find((unit) => unit.id === command.unitId);
  const preview = previewRebakeV7(view, command.unitId);
  if (confectioner === undefined || preview === null) return none;
  const best = [...preview.options]
    .sort((left, right) => crumbsOrderV7(view, left, right))
    .find(
      (option) =>
        !fragileRebakeV7(
          tools,
          confectioner,
          option.at,
          option.role,
          option.hp,
        ),
    );
  if (best === undefined || !same(best.at, command.at)) return none;
  return {
    priority: REBAKE_PRIORITY_V7,
    strategic:
      (effectiveRoleRuleV7(best.role, view.viewer.faction).cost ?? 0) * 4 +
      best.hp,
    immediate: -best.cost,
  };
}

/**
 * Section 14, "Re-bake": the value of a Confectioner's Move to `to`: next
 * to the best own Crumbs within 3 it can pay for (or a step closer to them
 * when it cannot reach them this turn and they last another turn), on a
 * tile outside visible lethal reach, when no Re-bake is offered where it
 * stands.
 */
export function rebakeApproachValueV7(
  tools: CandyPolicyToolsV7,
  unit: PublicUnitV7,
  to: CoordV7,
): { readonly priority: number; readonly strategic: number } | null {
  const view = tools.view;
  if (
    unit.ownerId !== view.viewer.id ||
    unit.form !== "LAND" ||
    unit.homeCityId === null ||
    unit.activation.moved ||
    unit.activation.attacked ||
    unitIsCrashedV7(view, unit.id) ||
    !unitRoleRuleV7(view, unit).abilities.includes("REBAKE") ||
    !unitMayActAfterMoveV7(view, unit) ||
    tools.freeCapacity(unit) <= 0 ||
    tools.commands.some(
      (command) => command.kind === "REBAKE" && command.unitId === unit.id,
    )
  )
    return null;
  const ends = offeredMoveEndsV7(tools.commands, unit.id);
  const price = (role: UnitRoleIdV7): number =>
    Math.ceil((effectiveRoleRuleV7(role, view.viewer.faction).cost ?? 0) / 2);
  const hp = (role: UnitRoleIdV7): number =>
    Math.ceil(effectiveRoleRuleV7(role, view.viewer.faction).maxHp / 2);
  const safeEnds = ends.filter((end) => tools.danger(unit, end) < unit.hp);
  // The nearest the unit gets to the Crumbs this turn: next to them, or a
  // step closer to Crumbs that will still lie there on its next turn.
  const nearest = (entry: (typeof view.crumbs)[number]): number => {
    const reached = Math.min(
      chebyshev(entry.at, unit.at),
      ...safeEnds.map((end) => chebyshev(end, entry.at)),
    );
    return reached === 1 || entry.turnsLeft >= 2
      ? reached
      : Number.POSITIVE_INFINITY;
  };
  const best = view.crumbs
    .filter(
      (entry) =>
        entry.ownerId === view.viewer.id &&
        chebyshev(entry.at, unit.at) <= REBAKE_APPROACH_RADIUS_V7 &&
        chebyshev(entry.at, unit.at) > 1 &&
        price(entry.role) <= view.viewer.coins &&
        !view.units.some((other) => same(other.at, entry.at)) &&
        !view.burrowed.some((mound) => same(mound.unit.at, entry.at)) &&
        !fragileRebakeV7(tools, unit, entry.at, entry.role, hp(entry.role)) &&
        nearest(entry) < chebyshev(entry.at, unit.at),
    )
    .sort((left, right) => crumbsOrderV7(view, left, right))[0];
  if (
    best === undefined ||
    chebyshev(to, best.at) !== nearest(best) ||
    !safeEnds.some((end) => same(end, to))
  )
    return null;
  return {
    priority: REBAKE_APPROACH_PRIORITY_V7,
    strategic:
      (effectiveRoleRuleV7(best.role, view.viewer.faction).cost ?? 0) * 4,
  };
}

// --- Pie first --------------------------------------------------------------

/**
 * Section 14, "Pie first": the HP the own melee units save when the Pie
 * Launcher Splats `target` before they attack it: the previewed
 * retaliation of every other own unit's offered adjacent attack on it.
 */
export function splatSavedHpV7(
  tools: CandyPolicyToolsV7,
  pie: PublicUnitV7,
  target: PublicUnitV7,
): number {
  const view = tools.view;
  let saved = 0;
  for (const command of tools.commands) {
    if (
      command.kind !== "ATTACK" ||
      command.targetUnitId !== target.id ||
      command.unitId === pie.id
    )
      continue;
    const attacker = view.units.find((unit) => unit.id === command.unitId);
    if (attacker === undefined || chebyshev(attacker.at, target.at) !== 1)
      continue;
    const preview = queryCombatPreviewV7(view, attacker.id, target.id);
    if (preview !== null && preview.retaliation && !preview.defenderDies)
      saved += preview.damageToAttacker;
  }
  return saved;
}

// --- Sugar Toss -------------------------------------------------------------

/**
 * Section 14, "Sugar Toss": a Gunner Tosses when it has no offered attack,
 * or its best attack neither kills nor deals 3; the target is the offered
 * one with the highest role cost (a Golem counts 12), then the lowest HP,
 * then the lowest unit ID. A weak shot at a unit that threatens an own city
 * is still taken.
 */
export function sugarTossScoreV7(
  tools: CandyPolicyToolsV7,
  command: Extract<CommandV7, { kind: "SUGAR_TOSS" }>,
): {
  readonly priority: number;
  readonly strategic: number;
  readonly immediate: number;
} {
  const none = { priority: -1, strategic: 0, immediate: 0 };
  const view = tools.view;
  const cost = (unit: PublicUnitV7): number =>
    unit.role === "JUGGERNAUT"
      ? GOLEM_TOSS_COST_V7
      : (unitRoleRuleV7(view, unit).cost ?? 0);
  const targets = tools.commands.flatMap((candidate) => {
    if (candidate.kind !== "SUGAR_TOSS" || candidate.unitId !== command.unitId)
      return [];
    const unit = view.units.find((item) => item.id === candidate.targetUnitId);
    return unit === undefined ? [] : [unit];
  });
  const best = [...targets].sort(
    (left, right) =>
      cost(right) - cost(left) || left.hp - right.hp || left.id - right.id,
  )[0];
  if (best === undefined || best.id !== command.targetUnitId) return none;
  let attacks = 0;
  for (const candidate of tools.commands) {
    if (candidate.kind !== "ATTACK" || candidate.unitId !== command.unitId)
      continue;
    const preview = queryCombatPreviewV7(
      view,
      candidate.unitId,
      candidate.targetUnitId,
    );
    if (preview === null) continue;
    attacks += 1;
    if (
      preview.defenderDies ||
      preview.damageToDefender >= SUGAR_TOSS_WEAK_DAMAGE_V7 ||
      tools.threatens(candidate.targetUnitId)
    )
      return none;
  }
  const amount = Math.min(2, best.maxHp - best.hp);
  return {
    priority:
      attacks > 0 ? SUGAR_TOSS_PRIORITY_V7 : SUGAR_TOSS_IDLE_PRIORITY_V7,
    strategic: 0,
    immediate: amount * 8,
  };
}

// --- Production ---------------------------------------------------------------

export interface CandyArmyCountsV7 {
  readonly byRole: ReadonlyMap<UnitRoleIdV7, number>;
  /** Toffee Troopers, Racers, Gunners, Marshmallows, Bears, and the Golem. */
  readonly front: number;
}

export function candyArmyCountsV7(view: PlayerViewV7): CandyArmyCountsV7 {
  const byRole = new Map<UnitRoleIdV7, number>();
  let front = 0;
  for (const unit of view.units) {
    if (unit.ownerId !== view.viewer.id || unit.form === "NAVAL") continue;
    byRole.set(unit.role, (byRole.get(unit.role) ?? 0) + 1);
    if (
      unit.role === "FIGHTER" ||
      unit.role === "RAIDER" ||
      unit.role === "MARKSMAN" ||
      unit.role === "GUARD" ||
      unit.role === "KNIGHT" ||
      // The ninth unit (`pulp_wars-w49.17`, 7r55): the Jawbreaker.
      unit.role === "SWORDSMAN" ||
      unit.role === "JUGGERNAUT"
    )
      front += 1;
  }
  return { byRole, front };
}

/**
 * The Candy production adjustment of one role, added to the policy's role
 * value (section 14, "produce every role"; "Toffee Troopers first under threat"):
 *
 * - the Marshmallow, the Gunner, the Confectioner, the Pie Launcher, and
 *   the Chocolate Bunny gain 10 as the first of their role;
 * - in a threatened city the Toffee Trooper gains 12, and the Confectioner and the
 *   Pie Launcher are worth -30 (bodies first);
 * - a Confectioner beyond one per six front units, and a Pie Launcher
 *   beyond one per four, costs 20.
 */
export function candyProductionAdjustmentV7(
  view: PlayerViewV7,
  role: UnitRoleIdV7,
  counts: CandyArmyCountsV7,
  threatened: boolean,
): number {
  if (view.viewer.faction !== "CANDY") return 0;
  const owned = counts.byRole.get(role) ?? 0;
  let value =
    owned === 0 &&
    (role === "GUARD" ||
      role === "MARKSMAN" ||
      role === "CAPTAIN" ||
      role === "CATAPULT" ||
      role === "KNIGHT" ||
      // The ninth unit (7r55): the Jawbreaker.
      role === "SWORDSMAN")
      ? CANDY_FIRST_OF_ROLE_BIAS_V7
      : 0;
  switch (role) {
    case "FIGHTER":
      if (threatened) value += THREATENED_GUMDROP_BIAS_V7;
      break;
    case "CAPTAIN":
      if (threatened) return -THREATENED_CANDY_SUPPORT_COST_V7;
      if (owned > 0 && owned * FRONT_UNITS_PER_CONFECTIONER_V7 > counts.front)
        value -= CANDY_SURPLUS_COST_V7;
      break;
    case "CATAPULT":
      if (threatened) return -THREATENED_CANDY_SUPPORT_COST_V7;
      if (owned > 0 && owned * FRONT_UNITS_PER_PIE_V7 > counts.front)
        value -= CANDY_SURPLUS_COST_V7;
      break;
    default:
      break;
  }
  return value;
}

// --- Research -----------------------------------------------------------------

export interface CandyResearchFactsV7 {
  readonly ownedCities: number;
  /** A visible hostile unit. */
  readonly hostileInSight: boolean;
  /** A visible hostile unit within 3 of an own city center. */
  readonly cityThreatened: boolean;
  /** A visible hostile city with Walls. */
  readonly walledCityVisible: boolean;
}

/**
 * Candy research (section 14, "research toward its roles"); the free
 * opening technology keeps the existing scorer. Drill (the Marshmallow)
 * when a hostile unit is in sight, else Marksmanship (the Gunner);
 * Administration (the Confectioner) at two cities; Sawmilling (the Pie
 * Launcher) against a visible Walled city or at three cities; Home Sweet
 * Home once a visible hostile unit stands within 3 of an own center; then
 * Chivalry (the Chocolate Bunny); Peppermint Surprise last. Returns the next
 * technology to research and its tier, or null.
 *
 * The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the Marshmallow is at
 * Home Sweet Home, behind the root. With a hostile unit in sight the plan
 * is the root and then Home Sweet Home; otherwise this plan comes to the
 * root with the Marshmallow at two cities (the ordinary scorer of economic
 * technologies may choose it earlier for a Workshop).
 */
export function candyResearchV7(
  view: PlayerViewV7,
  facts: CandyResearchFactsV7,
): {
  readonly tech: TechnologyIdV7;
  readonly priority: number;
  readonly strategic: number;
} | null {
  if (view.viewer.faction !== "CANDY") return null;
  const owned = new Set(view.viewer.researchedTechs);
  const tree = factionTreeV7(view.viewer.faction);
  const chainTo = (target: TechnologyIdV7): readonly TechnologyIdV7[] => {
    const result: TechnologyIdV7[] = [];
    const visit = (tech: TechnologyIdV7): void => {
      if (owned.has(tech) || result.includes(tech)) return;
      const node = tree.nodes.find((item) => item.id === tech);
      for (const prerequisite of node?.prerequisites ?? []) visit(prerequisite);
      result.push(tech);
    };
    visit(target);
    return result;
  };
  type Plan = {
    readonly tech: TechnologyIdV7;
    readonly priority: number;
    readonly strategic: number;
  };
  const role = (target: UnitRoleIdV7, priority: number): Plan | null => {
    const rule = effectiveRoleRuleV7(target, view.viewer.faction);
    const first =
      rule.technology === null ? undefined : chainTo(rule.technology)[0];
    return first === undefined
      ? null
      : {
          tech: first,
          priority,
          strategic: rule.maxHp + rule.attack2 + rule.defense2,
        };
  };
  const unlock = (kind: string, priority: number): Plan | null => {
    const node = tree.nodes.find((item) =>
      item.unlocks.some((entry) => entry.kind === kind),
    );
    const first = node === undefined ? undefined : chainTo(node.id)[0];
    return first === undefined
      ? null
      : { tech: first, priority, strategic: 10 };
  };
  const early =
    (facts.hostileInSight
      ? role("GUARD", CANDY_EARLY_RESEARCH_PRIORITY_V7)
      : null) ?? role("MARKSMAN", CANDY_EARLY_RESEARCH_PRIORITY_V7);
  if (early !== null) return early;
  if (facts.cityThreatened) {
    const home = unlock("HOME_SWEET_HOME", CANDY_RESEARCH_PRIORITY_V7);
    if (home !== null) return home;
  }
  if (facts.ownedCities >= 2) {
    const administration = role("CAPTAIN", CANDY_RESEARCH_PRIORITY_V7);
    if (administration !== null) return administration;
  }
  if (facts.walledCityVisible || facts.ownedCities >= 3) {
    const sawmilling = role("CATAPULT", CANDY_RESEARCH_PRIORITY_V7);
    if (sawmilling !== null) return sawmilling;
  }
  if (facts.ownedCities < 2) return null;
  // The ninth unit (7r55): the Jawbreaker (Metallurgy, behind the
  // Marshmallow's Drill and Engineering) before the Chocolate Bunny.
  return (
    role("GUARD", CANDY_EARLY_RESEARCH_PRIORITY_V7) ??
    role("SWORDSMAN", CANDY_EARLY_RESEARCH_PRIORITY_V7) ??
    role("KNIGHT", CANDY_EARLY_RESEARCH_PRIORITY_V7) ??
    unlock("PEPPERMINT_SURPRISE", CANDY_EARLY_RESEARCH_PRIORITY_V7)
  );
}

// --- Against the Candy ------------------------------------------------------

/**
 * Section 14, "eat Crumbs": whether a routine Move of the own unit to `to`
 * eats hostile Crumbs worth eating: the bite does not kill, the tile is
 * outside visible lethal reach after it, and a bite is taken only for
 * Crumbs of a role that costs 4 or more and for less than half the eater's
 * HP.
 */
export function eatsCrumbsWorthV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  to: CoordV7,
  danger: (unit: PublicUnitV7, at: CoordV7) => number,
): boolean {
  if (view.crumbs.length === 0) return false;
  const crumbs = view.crumbs.find((entry) => same(entry.at, to));
  if (crumbs === undefined || crumbs.ownerId === view.viewer.id) return false;
  const eat = previewCrumbsEatV7(view, unit.id, to);
  if (eat === null || eat.dies) return false;
  if (
    eat.damage > 0 &&
    ((effectiveRoleRuleV7(crumbs.role, "CANDY").cost ?? 0) <
      CRUMBS_BITE_WORTH_COST_V7 ||
      eat.damage * 2 >= unit.hp)
  )
    return false;
  const hp = unit.hp - eat.damage;
  return danger({ ...unit, hp }, to) < hp;
}
