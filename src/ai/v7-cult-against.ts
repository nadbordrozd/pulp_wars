import type { PlayerId, UnitId } from "../engine/model/ids";
import { unitRoleRuleV7 } from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import type { CombatPreviewV7 } from "../engine/v7/events";
import { previewRitualV7 } from "../engine/v7/query";
import { isNeutralOwnerV7, type CoordV7 } from "../engine/v7/types";
import type {
  PlayerViewV7,
  PublicRitualV7,
  PublicUnitV7,
} from "../engine/v7/view";

/**
 * Every seat against the Cult (`pulp_wars-mch9.12`, bead A4 of
 * docs/product/RULESET_7_CULTISTS.md section 15.5; as built in section
 * 15.9): how a seat of the Normal AI plays against the Cult's marks on the
 * board. A Cult seat that faces another lodge plays the same rules against
 * it.
 *
 * - **Hunt the strands.** A hit that breaks a hostile channeller's strand
 *   is worth the daemon it holds divided by the strands to spare; when the
 *   attacks the seat is offered can bring the daemon below its Control
 *   this turn, every such hit goes before the ordinary kills. Under a
 *   raised idol the Idol Bearer is hit first. A circle's leader and its
 *   chanters are valued the same way.
 * - **Stand on the X.** A unit whose body blocks a Great Summoning walks
 *   onto its mark, and stays there.
 * - **Step out from under a star**, and make no routine Move into one.
 * - **The eye mark.** No routine Move ends as the unit a hostile bound
 *   daemon short of its Control would go for, and the unit it would go for
 *   pulls back once its attack is made.
 * - **Leave a bound Herald alone** unless the attack kills it.
 * - **A frog** steps to a safer tile, and a unit that Tends cures it first.
 * - **Grab.** A unit a Tentacle holds may strike it.
 * - **A Cowed city** keeps its garrison, and an empty one is given one.
 *
 * A visible Unbound daemon and a Tentacle are lone monsters to the policy
 * already (`src/ai/v7-curiosities.ts`): no routine Move ends in their
 * reach, and they are attacked only for a kill this turn.
 *
 * A baseline designed from judgement, **not tuned by simulation**: no match
 * was played to set a number in this file, and its tests are hand-built
 * positions (`tests/unit/ruleset-v7-cult-against-ai.test.ts`). It reads the
 * public view and the public previews only, imports no reducer, draws
 * nothing from the PRNG, and does not depend on elapsed time. Every rule is
 * gated on `cultAgainstFactsV7`, which is null for a view with none of the
 * marks above, so a match without a Cult seat keeps its decisions byte for
 * byte.
 */

/**
 * The switch for a head-to-head test of this module (the pattern of
 * `CuriosityPolicyOptionsV7`): with `play` off the policy decides exactly
 * as it did before this module.
 */
export interface CultAgainstPolicyOptionsV7 {
  readonly play: boolean;
}

export const DEFAULT_CULT_AGAINST_POLICY_OPTIONS_V7: CultAgainstPolicyOptionsV7 =
  Object.freeze({ play: true });

let cultAgainstPolicyOptions: CultAgainstPolicyOptionsV7 =
  DEFAULT_CULT_AGAINST_POLICY_OPTIONS_V7;

/**
 * Tests only: changes the options and returns the previous ones (restore
 * them when done).
 */
export function setCultAgainstPolicyOptionsV7(
  options: Partial<CultAgainstPolicyOptionsV7>,
): CultAgainstPolicyOptionsV7 {
  const previous = cultAgainstPolicyOptions;
  cultAgainstPolicyOptions = Object.freeze({
    ...cultAgainstPolicyOptions,
    ...options,
  });
  return previous;
}

// --- Numbers ----------------------------------------------------------------

/**
 * What a daemon is worth to the seat that breaks its hold: its Favour cost
 * (the policy's own copy of a published number, pinned to the registry by
 * the test).
 */
export const CULT_AGAINST_DAEMON_VALUE_V7 = Object.freeze({
  HORROR: 5,
  HERALD: 20,
});
/** The strategic value of one point of a daemon's value. */
export const CULT_AGAINST_VALUE_SCALE_V7 = 4;
/** A gripped channeller's strand counts three (section 8.4). */
export const CULT_AGAINST_GRIP_STRANDS_V7 = 3;
/**
 * The Great Summoning needs this many chanters, Star-fall none (the Cult
 * redesign, `pulp_wars-mch9.34`: a hit on a joiner only weakens a star).
 */
export const CULT_AGAINST_SUMMONING_CHANTERS_V7 = 3;
export const CULT_AGAINST_STARFALL_CHANTERS_V7 = 0;

/**
 * A hit that ends a Great Summoning (its leader, or a chanter it cannot
 * spare), and the Move onto its mark: above the kill of a unit that
 * threatens a city (1280), below every capture (1340).
 */
export const CULT_AGAINST_SUMMONING_PRIORITY_V7 = 1287;
/** The hit that drops the ward of a strand the seat can break this turn. */
export const CULT_AGAINST_WARD_PRIORITY_V7 = 1286;
/** A hit that breaks a strand, when the seat can unbind the daemon now. */
export const CULT_AGAINST_STRAND_PRIORITY_V7 = 1285;
/** A unit that Tends cures a frog beside it before anything else moves. */
export const CULT_AGAINST_CURE_PRIORITY_V7 = 1290;
/** The Move onto an own Cowed center that stands empty (a threatened city's). */
export const CULT_AGAINST_COWED_PRIORITY_V7 = 1250;
/** A hit that ends a star which would land on own units. */
export const CULT_AGAINST_STAR_HIT_PRIORITY_V7 = 1245;
/** The step out from under a star: the step away from a Monster (1176). */
export const CULT_AGAINST_STAR_STEP_PRIORITY_V7 = 1176;
/**
 * The step back of an eye-marked unit and of a frog: below every attack
 * (900 and more), above the routine Moves (735 at most), so a unit strikes
 * first and pulls back afterwards if it still can.
 */
export const CULT_AGAINST_PULL_BACK_PRIORITY_V7 = 890;

// --- Facts ------------------------------------------------------------------

/** A hostile bound daemon the viewer sees. */
export interface CultAgainstDaemonV7 {
  readonly unit: PublicUnitV7;
  readonly control: number;
  /** Its holding strands (a gripped channeller counts three). */
  readonly strands: number;
  /** The strands that must break to bring it below its Control. */
  readonly spare: number;
  readonly value: number;
  /** Short of its Control as the board stands: it breaks loose next. */
  readonly short: boolean;
  /** A rampage strikes within this many tiles of it (its Move and one). */
  readonly reach: number;
}

/** A hostile channeller of such a daemon. */
export interface CultAgainstChannellerV7 {
  readonly unit: PublicUnitV7;
  readonly daemon: CultAgainstDaemonV7;
  /** What its strand counts: 1, or 3 under a grip. */
  readonly weight: number;
  /** The raised idols that ward it: only a kill breaks its strand. */
  readonly wardens: readonly UnitId[];
}

/** A participant of a hostile ritual. */
export interface CultAgainstChanterV7 {
  readonly unit: PublicUnitV7;
  readonly ritual: PublicRitualV7;
  /** A hit on it ends the ritual (the leader; a chanter it cannot spare). */
  readonly ends: boolean;
  /** The chanters the ritual can lose and still complete, and one. */
  readonly spare: number;
}

export interface CultAgainstFactsV7 {
  readonly daemons: ReadonlyMap<UnitId, CultAgainstDaemonV7>;
  readonly channellers: ReadonlyMap<UnitId, CultAgainstChannellerV7>;
  /** A hostile Idol Bearer with its idol raised, and whom it wards. */
  readonly wardens: ReadonlyMap<UnitId, readonly CultAgainstChannellerV7[]>;
  readonly chanters: ReadonlyMap<UnitId, CultAgainstChanterV7>;
  /** The hostile Great Summonings whose mark the viewer has explored. */
  readonly summonings: readonly PublicRitualV7[];
  /** The tiles under a star of another seat (the mark and the eight around). */
  readonly starKeys: ReadonlySet<string>;
  /** The own HP the stars of each hostile Star-fall leader would take. */
  readonly starHarm: ReadonlyMap<UnitId, number>;
  /** The hostile bound Heralds. */
  readonly heralds: ReadonlySet<UnitId>;
  /** The own units that are frogs this turn. */
  readonly frogs: ReadonlySet<UnitId>;
  /** The own units a Tentacle holds, each with its Tentacle. */
  readonly grabs: ReadonlyMap<UnitId, UnitId>;
  /** The centers of the own Cowed cities. */
  readonly cowedKeys: ReadonlySet<string>;
  /** The own units with an offered attack on a unit that is no bound Herald. */
  readonly otherTargets: ReadonlySet<UnitId>;
  /** The offered attacks, for `cultAgainstDecisiveV7`. */
  readonly attacks: readonly Extract<CommandV7, { kind: "ATTACK" }>[];
  /** Per daemon: the seat can bring it below its Control this turn. */
  readonly decisive: Map<UnitId, boolean>;
}

const key = (at: CoordV7): string => `${at.y},${at.x}`;
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const gap = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

/**
 * The gate: what the Cult has put on the viewer's board, or null when
 * there is nothing of it (and when the switch is off). `hostile` is the
 * policy's reading of a hostile owner; `commands` are the commands the
 * engine offers the seat now.
 */
export function cultAgainstFactsV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  hostile: (ownerId: PlayerId) => boolean,
): CultAgainstFactsV7 | null {
  if (!cultAgainstPolicyOptions.play) return null;
  // A view captured before the Cultists has no `cult` key.
  const cult = view.cult as PlayerViewV7["cult"] | undefined;
  if (cult === undefined) return null;
  if (
    cult.strands.length === 0 &&
    cult.daemons.length === 0 &&
    cult.rituals.length === 0 &&
    cult.frogs.length === 0 &&
    cult.tentacles.length === 0 &&
    cult.cowed.length === 0
  )
    return null;
  const viewer = view.viewer.id;
  const unitsById = new Map(view.units.map((unit) => [unit.id, unit] as const));
  const foe = (unit: PublicUnitV7 | undefined): unit is PublicUnitV7 =>
    unit !== undefined &&
    unit.hp > 0 &&
    !isNeutralOwnerV7(unit.ownerId) &&
    hostile(unit.ownerId);

  const daemons = new Map<UnitId, CultAgainstDaemonV7>();
  const heralds = new Set<UnitId>();
  for (const entry of cult.daemons) {
    const unit = unitsById.get(entry.unitId);
    if (!foe(unit) || entry.role === "TENTACLE") continue;
    daemons.set(unit.id, {
      unit,
      control: entry.control,
      strands: entry.strands,
      spare: Math.max(1, entry.strands - entry.control + 1),
      value: CULT_AGAINST_DAEMON_VALUE_V7[entry.role],
      short: entry.strands < entry.control,
      reach: unitRoleRuleV7(view, unit).move + 1,
    });
    if (entry.role === "HERALD") heralds.add(unit.id);
  }

  const idols = cult.idols.flatMap((unitId) => {
    const bearer = unitsById.get(unitId);
    return foe(bearer) ? [bearer] : [];
  });
  const channellers = new Map<UnitId, CultAgainstChannellerV7>();
  const wardens = new Map<UnitId, CultAgainstChannellerV7[]>();
  for (const strand of cult.strands) {
    const unit = unitsById.get(strand.cultistUnitId);
    const daemon =
      strand.daemonUnitId === null
        ? undefined
        : daemons.get(strand.daemonUnitId);
    if (!foe(unit) || daemon === undefined) continue;
    const warding = idols.filter(
      (bearer) =>
        bearer.ownerId === unit.ownerId &&
        bearer.id !== unit.id &&
        gap(bearer.at, unit.at) === 1,
    );
    const channeller: CultAgainstChannellerV7 = {
      unit,
      daemon,
      weight: cult.grips.some((grip) => grip.cultistUnitId === unit.id)
        ? CULT_AGAINST_GRIP_STRANDS_V7
        : 1,
      wardens: warding.map((bearer) => bearer.id),
    };
    channellers.set(unit.id, channeller);
    for (const bearer of warding)
      wardens.set(bearer.id, [...(wardens.get(bearer.id) ?? []), channeller]);
  }

  const chanters = new Map<UnitId, CultAgainstChanterV7>();
  const summonings: PublicRitualV7[] = [];
  const starKeys = new Set<string>();
  const starHarm = new Map<UnitId, number>();
  for (const ritual of cult.rituals) {
    if (ritual.playerId === viewer) continue;
    const forecast = previewRitualV7(view, ritual);
    // A star falls on everybody: an ally's ring is left like an enemy's.
    if (forecast.starfall !== null)
      for (const tile of forecast.starfall.area) starKeys.add(key(tile));
    if (!hostile(ritual.playerId)) continue;
    if (ritual.kind === "GREAT_SUMMONING" && ritual.at !== null)
      summonings.push(ritual);
    const needed =
      ritual.kind === "GREAT_SUMMONING"
        ? CULT_AGAINST_SUMMONING_CHANTERS_V7
        : CULT_AGAINST_STARFALL_CHANTERS_V7;
    const spare = Math.max(1, ritual.chanters - needed + 1);
    const leader =
      ritual.leaderUnitId === null
        ? undefined
        : unitsById.get(ritual.leaderUnitId);
    if (foe(leader)) {
      chanters.set(leader.id, { unit: leader, ritual, ends: true, spare: 1 });
      starHarm.set(
        leader.id,
        (forecast.starfall?.results ?? [])
          .filter((result) => result.ownerId === viewer)
          .reduce((total, result) => total + result.damage, 0),
      );
    }
    for (const unitId of ritual.chanterUnitIds) {
      const unit = unitsById.get(unitId);
      if (foe(unit))
        chanters.set(unit.id, { unit, ritual, ends: spare <= 1, spare });
    }
  }

  const frogs = new Set(
    cult.frogs.filter((unitId) => unitsById.get(unitId)?.ownerId === viewer),
  );
  const grabs = new Map<UnitId, UnitId>();
  for (const tentacle of cult.tentacles) {
    const held =
      tentacle.grabbedUnitId === null
        ? undefined
        : unitsById.get(tentacle.grabbedUnitId);
    if (held?.ownerId === viewer) grabs.set(held.id, tentacle.unitId);
  }
  const cowedKeys = new Set<string>();
  for (const entry of cult.cowed) {
    const city = view.cities.find((candidate) => candidate.id === entry.cityId);
    if (city?.ownerId === viewer) cowedKeys.add(key(city.at));
  }

  if (
    daemons.size === 0 &&
    chanters.size === 0 &&
    summonings.length === 0 &&
    starKeys.size === 0 &&
    frogs.size === 0 &&
    grabs.size === 0 &&
    cowedKeys.size === 0
  )
    return null;

  const attacks = commands.filter(
    (command): command is Extract<CommandV7, { kind: "ATTACK" }> =>
      command.kind === "ATTACK",
  );
  return {
    daemons,
    channellers,
    wardens,
    chanters,
    summonings,
    starKeys,
    starHarm,
    heralds,
    frogs,
    grabs,
    cowedKeys,
    otherTargets: new Set(
      attacks
        .filter((command) => !heralds.has(command.targetUnitId))
        .map((command) => command.unitId),
    ),
    attacks,
    decisive: new Map(),
  };
}

/** The combat preview of an offered attack (the public one). */
export type CultAgainstPreviewV7 = (
  attackerId: UnitId,
  targetUnitId: UnitId,
) => CombatPreviewV7 | null;

/** Whether the hit of `preview` breaks the strand of `channeller`. */
function breaksStrand(
  channeller: CultAgainstChannellerV7,
  preview: CombatPreviewV7,
): boolean {
  return (
    preview.defenderDies ||
    (preview.damageToDefender > 0 && channeller.wardens.length === 0)
  );
}

/**
 * Hunt the strands: whether the attacks the seat is offered now can bring
 * the daemon `daemonId` below its Control this turn. The channellers a hit
 * can free are taken heaviest first, those a hit frees at once before those
 * under a raised idol whose Idol Bearer can be hit (which costs one more
 * attacker); the seat needs one attacker for each. (An estimate: it does
 * not match attackers to targets one by one.)
 */
export function cultAgainstDecisiveV7(
  facts: CultAgainstFactsV7,
  preview: CultAgainstPreviewV7,
  daemonId: UnitId,
): boolean {
  const cached = facts.decisive.get(daemonId);
  if (cached !== undefined) return cached;
  const daemon = facts.daemons.get(daemonId);
  let result = false;
  if (daemon !== undefined && !daemon.short) {
    const hitters = new Set<UnitId>();
    const open = new Map<UnitId, CultAgainstChannellerV7>();
    const warded = new Map<UnitId, CultAgainstChannellerV7>();
    const wardenHit = new Set<UnitId>();
    for (const command of facts.attacks) {
      const hit = preview(command.unitId, command.targetUnitId);
      if (hit === null || hit.attackerDies) continue;
      const channeller = facts.channellers.get(command.targetUnitId);
      if (channeller?.daemon === daemon) {
        if (breaksStrand(channeller, hit))
          open.set(channeller.unit.id, channeller);
        else if (hit.damageToDefender > 0)
          warded.set(channeller.unit.id, channeller);
        else continue;
        hitters.add(command.unitId);
      } else if (
        hit.damageToDefender > 0 &&
        facts.wardens
          .get(command.targetUnitId)
          ?.some((item) => item.daemon === daemon) === true
      ) {
        wardenHit.add(command.targetUnitId);
        hitters.add(command.unitId);
      }
    }
    const heaviest = (
      left: CultAgainstChannellerV7,
      right: CultAgainstChannellerV7,
    ): number => right.weight - left.weight || left.unit.id - right.unit.id;
    const order = [
      ...[...open.values()].sort(heaviest),
      ...[...warded.values()]
        .filter(
          (item) =>
            !open.has(item.unit.id) &&
            item.wardens.every((bearer) => wardenHit.has(bearer)),
        )
        .sort(heaviest),
    ];
    let broken = 0;
    let needed = 0;
    const dropped = new Set<UnitId>();
    for (const item of order) {
      if (broken >= daemon.spare) break;
      broken += item.weight;
      needed += 1;
      if (!open.has(item.unit.id))
        for (const bearer of item.wardens)
          if (!dropped.has(bearer)) {
            dropped.add(bearer);
            needed += 1;
          }
    }
    result = broken >= daemon.spare && hitters.size >= needed;
  }
  facts.decisive.set(daemonId, result);
  return result;
}

export interface CultAgainstValueV7 {
  readonly priority: number;
  readonly strategic: number;
}

const daemonShare = (daemon: CultAgainstDaemonV7, weight: number): number =>
  Math.round(
    (CULT_AGAINST_VALUE_SCALE_V7 *
      daemon.value *
      Math.min(weight, daemon.spare)) /
      daemon.spare,
  );

/**
 * The value of the offered attack of `actor` on `target` against the Cult:
 * the strands, the ward, the circles, and the bound Herald. `standsOn` is
 * true when the kill would move the attacker (its preview's advance).
 */
export function cultAgainstAttackV7(
  facts: CultAgainstFactsV7,
  view: PlayerViewV7,
  preview: CultAgainstPreviewV7,
  actor: PublicUnitV7,
  target: PublicUnitV7,
  hit: CombatPreviewV7 & { readonly advances?: boolean },
  priority: number,
): CultAgainstValueV7 {
  if (priority < 0) return { priority, strategic: 0 };
  // A unit that holds a mark or an own Cowed center does not leave it by
  // the advance after a kill.
  if (
    hit.advances === true &&
    (cultAgainstHoldsMarkV7(facts, view, actor) ||
      facts.cowedKeys.has(key(actor.at)))
  )
    return { priority: -1, strategic: 0 };
  // Do not fight the Herald: only a kill, or a shot it cannot answer from
  // a unit with nothing else to shoot at.
  if (
    facts.heralds.has(target.id) &&
    !hit.defenderDies &&
    (hit.damageToAttacker > 0 ||
      hit.attackerDies ||
      hit.damageToDefender <= 0 ||
      facts.otherTargets.has(actor.id))
  )
    return { priority: -1, strategic: 0 };
  let strategic = 0;
  const channeller = facts.channellers.get(target.id);
  if (channeller !== undefined && breaksStrand(channeller, hit)) {
    strategic += daemonShare(channeller.daemon, channeller.weight);
    if (
      !hit.attackerDies &&
      cultAgainstDecisiveV7(facts, preview, channeller.daemon.unit.id)
    )
      priority = Math.max(priority, CULT_AGAINST_STRAND_PRIORITY_V7);
  }
  const warded = facts.wardens.get(target.id);
  if (warded !== undefined && (hit.damageToDefender > 0 || hit.defenderDies)) {
    // One hit drops the ward: the strands under it are then open.
    let best = 0;
    let decisive = false;
    for (const item of warded) {
      best = Math.max(best, daemonShare(item.daemon, item.weight));
      decisive ||= cultAgainstDecisiveV7(facts, preview, item.daemon.unit.id);
    }
    strategic += best;
    if (decisive && !hit.attackerDies)
      priority = Math.max(priority, CULT_AGAINST_WARD_PRIORITY_V7);
  }
  const chanter = facts.chanters.get(target.id);
  if (chanter !== undefined && (hit.damageToDefender > 0 || hit.defenderDies)) {
    if (chanter.ritual.kind === "GREAT_SUMMONING") {
      strategic += Math.round(
        (CULT_AGAINST_VALUE_SCALE_V7 * CULT_AGAINST_DAEMON_VALUE_V7.HERALD) /
          chanter.spare,
      );
      if (chanter.ends)
        priority = Math.max(priority, CULT_AGAINST_SUMMONING_PRIORITY_V7);
    } else {
      const harm =
        chanter.ritual.leaderUnitId === null
          ? 0
          : (facts.starHarm.get(chanter.ritual.leaderUnitId) ?? 0);
      // A chanter the star can spare still makes it weaker by 1.
      strategic += chanter.ends ? 2 * harm + 2 : 2;
      if (chanter.ends && harm > 0)
        priority = Math.max(priority, CULT_AGAINST_STAR_HIT_PRIORITY_V7);
    }
  }
  return { priority, strategic };
}

/**
 * Grab (section 9.3): the unit a Tentacle holds may strike that Tentacle,
 * when the exchange does not kill it. (It cannot leave, and the Tentacle
 * slaps the weakest unit beside it again at the next neutral turn.)
 */
export function cultAgainstGrabAttackV7(
  facts: CultAgainstFactsV7,
  actorId: UnitId,
  targetUnitId: UnitId,
  hit: CombatPreviewV7,
): boolean {
  return (
    facts.grabs.get(actorId) === targetUnitId &&
    !hit.attackerDies &&
    hit.damageToDefender > 0
  );
}

/**
 * Stand on the X: the hostile Great Summoning whose arrival the unit
 * `actor` blocks where it stands (the engine's forecast names it).
 */
export function cultAgainstHoldsMarkV7(
  facts: CultAgainstFactsV7,
  view: PlayerViewV7,
  actor: PublicUnitV7,
): boolean {
  return facts.summonings.some((ritual) => {
    if (ritual.at === null || !same(ritual.at, actor.at)) return false;
    const forecast = previewRitualV7(view, ritual).summoning;
    return forecast?.outcome === "BLOCKED" && forecast.unitId === actor.id;
  });
}

/** The view with `actor` on `at` (for a forecast of the board after a Move). */
function steppedView(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  at: CoordV7,
): PlayerViewV7 {
  return {
    ...view,
    units: view.units.map((unit) =>
      unit.id === actor.id ? { ...unit, at: { x: at.x, y: at.y } } : unit,
    ),
  };
}

/** Whether the Move of `actor` onto `to` blocks a Great Summoning there. */
function blocksMark(
  facts: CultAgainstFactsV7,
  view: PlayerViewV7,
  actor: PublicUnitV7,
  to: CoordV7,
): boolean {
  const ritual = facts.summonings.find(
    (item) => item.at !== null && same(item.at, to),
  );
  if (ritual === undefined) return false;
  const now = previewRitualV7(view, ritual).summoning;
  // Blocked already (a unit that stays, or a mound put on it): no need.
  if (now === null || now.outcome === "BLOCKED") return false;
  const after = previewRitualV7(steppedView(view, actor, to), ritual).summoning;
  return after?.outcome === "BLOCKED" && after.unitId === actor.id;
}

/**
 * The eye mark (section 6.4): whether the hostile bound daemon `daemon`,
 * if it broke now, would go for the unit `actor` standing on `at` and
 * strike it: `actor` is then the nearest unit of a player on land, a tie
 * going to the daemon's own seat, then to the fewest Hit Points, then to
 * the lowest unit ID, and it stands within the daemon's Move and one.
 */
export function cultAgainstEyeMarkedV7(
  view: PlayerViewV7,
  daemon: CultAgainstDaemonV7,
  actor: PublicUnitV7,
  at: CoordV7,
): boolean {
  if (actor.form !== "LAND" && actor.form !== "EGG") return false;
  const mine = gap(at, daemon.unit.at);
  if (mine > daemon.reach) return false;
  const seat = daemon.unit.ownerId;
  for (const unit of view.units) {
    if (
      unit.id === actor.id ||
      unit.id === daemon.unit.id ||
      unit.hp <= 0 ||
      isNeutralOwnerV7(unit.ownerId) ||
      (unit.form !== "LAND" && unit.form !== "EGG")
    )
      continue;
    const other = gap(unit.at, daemon.unit.at);
    if (other < mine) return false;
    if (other > mine) continue;
    const ownLeft = unit.ownerId === seat ? 0 : 1;
    const ownRight = actor.ownerId === seat ? 0 : 1;
    if ((ownLeft - ownRight || unit.hp - actor.hp || unit.id - actor.id) < 0)
      return false;
  }
  return true;
}

/** What the policy asks of `src/ai/v7.ts` for a Move. */
export interface CultAgainstMoveToolsV7 {
  readonly view: PlayerViewV7;
  /** What the visible enemies deal `unit` on `at` in their next turn. */
  readonly danger: (unit: PublicUnitV7, at: CoordV7) => number;
  /** A settlement center, a village, or a treasure chest is on `at`. */
  readonly site: (at: CoordV7) => boolean;
  /** The Moves of this priority and below are the routine ones. */
  readonly routineMaximum: number;
}

export interface CultAgainstMoveValueV7 extends CultAgainstValueV7 {
  /**
   * The Move is one of this module's own (onto the X, out from under a
   * star, back from an eye mark, a frog's retreat, onto a Cowed center):
   * a candidate whatever the general Move rules say of it.
   */
  readonly forced: boolean;
}

/**
 * The value of the Move of the own unit `actor` that ends on `to` against
 * the Cult. A priority of -1 refuses the Move.
 */
export function cultAgainstMoveV7(
  facts: CultAgainstFactsV7,
  tools: CultAgainstMoveToolsV7,
  actor: PublicUnitV7,
  to: CoordV7,
  priority: number,
): CultAgainstMoveValueV7 {
  const view = tools.view;
  const refused: CultAgainstMoveValueV7 = {
    priority: -1,
    strategic: 0,
    forced: false,
  };
  // The unit on the X stays on it, and the garrison of a Cowed city in its
  // city (it can train no other this turn, and a Herald is within 3).
  if (
    cultAgainstHoldsMarkV7(facts, view, actor) ||
    facts.cowedKeys.has(key(actor.at))
  )
    return refused;
  const routine = priority <= tools.routineMaximum;
  const from = actor.at;
  const fromKey = key(from);
  const toKey = key(to);

  // Stand on the X: with the priority of the hit that ends the circle.
  if (blocksMark(facts, view, actor, to))
    return {
      priority: Math.max(priority, CULT_AGAINST_SUMMONING_PRIORITY_V7),
      strategic: actor.hp,
      forced: true,
    };

  // The eye mark of a daemon short of its Control.
  let markedFrom = false;
  let markedTo = false;
  for (const daemon of facts.daemons.values()) {
    if (!daemon.short) continue;
    markedFrom ||= cultAgainstEyeMarkedV7(view, daemon, actor, from);
    markedTo ||= cultAgainstEyeMarkedV7(view, daemon, actor, to);
  }
  const starFrom = facts.starKeys.has(fromKey);
  const starTo = facts.starKeys.has(toKey);
  if (routine && ((markedTo && !markedFrom) || (starTo && !starFrom)))
    return refused;

  let strategic = 0;
  let forced = false;
  const clean = !markedTo && !starTo;
  // Step out from under a star.
  if (starFrom && clean) {
    priority = Math.max(priority, CULT_AGAINST_STAR_STEP_PRIORITY_V7);
    forced = true;
  }
  // Pull back so that the channellers are nearest.
  if (markedFrom && clean) {
    priority = Math.max(priority, CULT_AGAINST_PULL_BACK_PRIORITY_V7);
    forced = true;
  }
  // A frog cannot strike this turn: it steps to a safer tile, never to a
  // more dangerous one.
  if (facts.frogs.has(actor.id)) {
    const here = tools.danger(actor, from);
    const there = tools.danger(actor, to);
    if (there < here && clean) {
      priority = Math.max(priority, CULT_AGAINST_PULL_BACK_PRIORITY_V7);
      strategic += here - there;
      forced = true;
    } else if (there > here && routine && !forced) return refused;
  }
  // An own Cowed center that stands empty is given a garrison.
  if (facts.cowedKeys.has(toKey)) {
    priority = Math.max(priority, CULT_AGAINST_COWED_PRIORITY_V7);
    forced = true;
  }
  // (Pick Me!'s rule, a Move that would bind the unit to a taunting Chosen,
  // retired with the Chosen: the Cult redesign, `pulp_wars-mch9.31`; the
  // warden's Awestruck takes its place in a later bead.)
  return { priority, strategic, forced };
}

/**
 * A frog is cured by Tend Wounded and Repair (section 9.1): the own frogs
 * in land form beside the unit `actor`, which are themselves at once and
 * may act this turn.
 */
export function cultAgainstCuresV7(
  facts: CultAgainstFactsV7,
  view: PlayerViewV7,
  actor: PublicUnitV7,
): number {
  if (facts.frogs.size === 0) return 0;
  let cured = 0;
  for (const unit of view.units)
    if (
      facts.frogs.has(unit.id) &&
      unit.id !== actor.id &&
      unit.form === "LAND" &&
      !unit.activation.tendedThisTurn &&
      gap(unit.at, actor.at) === 1
    )
      cured += 1;
  return cured;
}
