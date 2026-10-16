import type { PlayerId, UnitId } from "../engine/model/ids";
import {
  HERALD_HUNGER_FAVOUR_V7,
  IMP_SWARM_MINIMUM_V7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import { rampageChoiceV7 } from "../engine/v7/cult-unbound";
import { standingIdolsV7 } from "../engine/v7/cult-warden";
import type { CombatPreviewV7 } from "../engine/v7/events";
import { previewRitualV7, queryCombatPreviewV7 } from "../engine/v7/query";
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
 *   this turn, every such hit goes before the ordinary kills. A circle's
 *   leader and its chanters are valued the same way.
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
 * The Cult redesign's A-R4 (`pulp_wars-mch9.41`,
 * docs/product/RULESET_7_CULT_REDESIGN.md section 12.4, as built in section
 * 12.8) reads the new Cult:
 *
 * - **Brood and Doorstep in the strand hunt.** A channeller of an Imp is
 *   worth every Imp its Brood holds (and the kill of that Imp frees them);
 *   a strand to a daemon held without strands (a Brood's Imp, a Mass on its
 *   Doorstep) is worth nothing; the kill (or a status) of the one Idol
 *   Bearer whose idol holds a strandless Mass breaks it.
 * - **The warden.** With ranged units, an Idol Bearer whose idol stands is
 *   worth half the strands and chanters it shields; a halved shot that does
 *   not kill is worth the damage it lost less (melee first); **Awestruck**:
 *   a Move into a standing idol's ring has at most a routine Move's
 *   priority unless onto a site or its attack on the bearer kills.
 * - **Drag.** No routine Move ends beside a hostile Gibbering Mass, unless
 *   onto a site or beside a center the Mass guards; no attack that does not
 *   kill a Mass from a unit that can break a strand instead.
 * - **Swarm.** No Move ends beside two of a hostile seat's Imps when it
 *   matters (a routine one, or where the visible enemy kills the unit)
 *   unless its attack from there kills one; a unit beside two steps away
 *   after its attacks.
 * - **Joiners.** A hit on a star's chanter is worth the Hit Points the
 *   three less damage spares the seat, and goes first when it saves a unit.
 * - **Hunger.** A Herald whose seat cannot pay its Hunger is about to
 *   break: its eye mark is minded like a strand-short daemon's.
 * - **The eye mark** follows the four steps of the Unbound target rule
 *   (`rampageChoiceV7`): a robed cultist within 2, anyone in reach, a
 *   summon in reach.
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
  HORROR: 4,
  HERALD: 18,
  // The Cult redesign (`pulp_wars-mch9.36`): the Imp (a Brood's channelled
  // Imp is worth every Imp it holds, `pulp_wars-mch9.41`).
  IMP: 2,
  // `pulp_wars-mch9.37`: the Gibbering Mass.
  MASS: 5,
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
/**
 * The kill (or the status) of the Idol Bearer whose idol alone holds a
 * strandless Gibbering Mass on its Doorstep (the Mass breaks loose at its
 * seat's next check; `pulp_wars-mch9.41`).
 */
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
 * The step back of an eye-marked unit, of a frog, and of a Swarmed unit:
 * below every attack (900 and more), above the routine Moves (735 at most),
 * so a unit strikes first and pulls back afterwards if it still can.
 */
export const CULT_AGAINST_PULL_BACK_PRIORITY_V7 = 890;
/**
 * The share of the strands and chanters an Idol Bearer shields that its
 * kill (or a status on it) is worth to a seat with ranged units, as a
 * fraction (`pulp_wars-mch9.41`; a judgement, not tuned).
 */
export const CULT_AGAINST_SHIELD_SHARE_V7 = 0.5;

// --- Facts ------------------------------------------------------------------

/** A hostile bound daemon the viewer sees. */
export interface CultAgainstDaemonV7 {
  readonly unit: PublicUnitV7;
  readonly control: number;
  /** Its holding strands (a gripped channeller counts three). */
  readonly strands: number;
  /** The strands that must break to bring it below its Control. */
  readonly spare: number;
  /**
   * What breaking its hold is worth, in Favour: its own cost, and for an
   * Imp whose strand lends its Brood the cost of every Imp the Brood holds
   * (the Cult redesign, `pulp_wars-mch9.41`).
   */
  readonly value: number;
  /**
   * Short of its Control as the board stands, or (`pulp_wars-mch9.41`) a
   * Herald whose seat cannot pay its Hunger: it breaks loose next.
   */
  readonly short: boolean;
  /** A rampage strikes within this many tiles of it (its Move and one). */
  readonly reach: number;
  /**
   * Held at the check without strands of its own (`pulp_wars-mch9.41`): an
   * Imp a neighbour's Brood holds, or a Gibbering Mass on its Doorstep. A
   * strand to it breaks nothing.
   */
  readonly held: boolean;
  /** The Imps its strand holds by its Brood (an Imp's only). */
  readonly brood: readonly UnitId[];
  /** It is a bound Herald its seat cannot feed at the next check. */
  readonly hungry: boolean;
}

/** A hostile channeller of such a daemon. */
export interface CultAgainstChannellerV7 {
  readonly unit: PublicUnitV7;
  readonly daemon: CultAgainstDaemonV7;
  /** What its strand counts: 1, or 3 under a grip. */
  readonly weight: number;
}

/** A participant of a hostile ritual. */
export interface CultAgainstChanterV7 {
  readonly unit: PublicUnitV7;
  readonly ritual: PublicRitualV7;
  /** A hit on it ends the ritual (the leader; a chanter it cannot spare). */
  readonly ends: boolean;
  /** The chanters the ritual can lose and still complete, and one. */
  readonly spare: number;
  /**
   * A chanter of a Star-fall (`pulp_wars-mch9.41`): the own Hit Points the
   * star takes less with one chanter fewer (3 damage on every own unit
   * under it, less what Armoured, Plated, and Shields take off).
   */
  readonly relief: number;
  /** One chanter fewer, and an own unit under the star survives it. */
  readonly saves: boolean;
}

/**
 * A hostile Idol Bearer whose idol stands (the warden, the Cult redesign's
 * section 8.1; `pulp_wars-mch9.41`).
 */
export interface CultAgainstWardenV7 {
  readonly unit: PublicUnitV7;
  /** What the strands and chanters on the eight tiles around it are worth. */
  readonly shields: number;
  /**
   * The strandless Gibbering Masses its idol alone holds on their Doorstep
   * (no own city center beside them, no other standing idol): they break
   * loose at the next check once the idol is down.
   */
  readonly masses: readonly CultAgainstDaemonV7[];
}

export interface CultAgainstFactsV7 {
  readonly daemons: ReadonlyMap<UnitId, CultAgainstDaemonV7>;
  readonly channellers: ReadonlyMap<UnitId, CultAgainstChannellerV7>;
  /** The hostile Idol Bearers whose idol stands. */
  readonly wardens: ReadonlyMap<UnitId, CultAgainstWardenV7>;
  readonly chanters: ReadonlyMap<UnitId, CultAgainstChanterV7>;
  /** The hostile Great Summonings whose mark the viewer has explored. */
  readonly summonings: readonly PublicRitualV7[];
  /** The tiles under a star of another seat (the mark and the eight around). */
  readonly starKeys: ReadonlySet<string>;
  /** The own HP the stars of each hostile Star-fall leader would take. */
  readonly starHarm: ReadonlyMap<UnitId, number>;
  /** The hostile bound Heralds. */
  readonly heralds: ReadonlySet<UnitId>;
  /** The hostile bound Imps (Swarm) and Gibbering Masses (Drag). */
  readonly imps: readonly PublicUnitV7[];
  readonly masses: readonly PublicUnitV7[];
  /** The centers of the hostile cities a hostile bound Mass guards. */
  readonly guardedKeys: ReadonlySet<string>;
  /** The seat has a unit that attacks from two tiles or more. */
  readonly ranged: boolean;
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
  /** Per own unit: it has an offered hit that breaks a hold (lazy). */
  readonly breakers: Map<UnitId, boolean>;
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
  // `favour` lists every Cult seat still in the match: without one there is
  // no Idol Bearer either (`pulp_wars-mch9.41`).
  if (
    cult.favour.length === 0 &&
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

  // The Cult redesign (`pulp_wars-mch9.41`): the Imps each Brood holds.
  const broods = new Map<UnitId, UnitId[]>();
  for (const entry of cult.daemons)
    if (entry.broodOf !== undefined && foe(unitsById.get(entry.unitId)))
      broods.set(entry.broodOf, [
        ...(broods.get(entry.broodOf) ?? []),
        entry.unitId,
      ]);

  const daemons = new Map<UnitId, CultAgainstDaemonV7>();
  const heralds = new Set<UnitId>();
  const imps: PublicUnitV7[] = [];
  const masses: PublicUnitV7[] = [];
  for (const entry of cult.daemons) {
    const unit = unitsById.get(entry.unitId);
    if (!foe(unit) || entry.role === "TENTACLE") continue;
    const brood = entry.role === "IMP" ? (broods.get(unit.id) ?? []) : [];
    const held = entry.broodOf !== undefined || entry.doorstep === true;
    daemons.set(unit.id, {
      unit,
      control: entry.control,
      strands: entry.strands,
      spare: Math.max(1, entry.strands - entry.control + 1),
      value:
        CULT_AGAINST_DAEMON_VALUE_V7[entry.role] +
        brood.length * CULT_AGAINST_DAEMON_VALUE_V7.IMP,
      // An Imp a neighbour's Brood holds is not short (`pulp_wars-mch9.36`),
      // nor a Gibbering Mass on its Doorstep (`pulp_wars-mch9.37`).
      short: entry.strands < entry.control && !held,
      reach: unitRoleRuleV7(view, unit).move + 1,
      held,
      brood,
      hungry: false,
    });
    if (entry.role === "HERALD") heralds.add(unit.id);
    if (entry.role === "IMP") imps.push(unit);
    if (entry.role === "MASS") masses.push(unit);
  }

  const channellers = new Map<UnitId, CultAgainstChannellerV7>();
  // Hunger (`pulp_wars-mch9.41`): the Summoners whose strand holds a daemon
  // that stays bound pay the trickle before the Hunger is paid.
  const payers = new Map<PlayerId, Set<UnitId>>();
  for (const strand of cult.strands) {
    const unit = unitsById.get(strand.cultistUnitId);
    const daemon =
      strand.daemonUnitId === null
        ? undefined
        : daemons.get(strand.daemonUnitId);
    if (!foe(unit) || daemon === undefined) continue;
    channellers.set(unit.id, {
      unit,
      daemon,
      weight: cult.grips.some((grip) => grip.cultistUnitId === unit.id)
        ? CULT_AGAINST_GRIP_STRANDS_V7
        : 1,
    });
    if (
      !daemon.short &&
      !daemon.held &&
      (unitRoleRuleV7(view, unit).abilities as readonly string[]).includes(
        "SUMMON",
      )
    )
      payers.set(
        unit.ownerId,
        (payers.get(unit.ownerId) ?? new Set()).add(unit.id),
      );
  }
  // The Herald's Hunger: each still bound Herald of a seat costs it 2 at the
  // check, in unit-ID order; one its public Favour (and the trickle) cannot
  // pay breaks loose there.
  const fed = new Map<PlayerId, number>();
  for (const herald of [...daemons.values()]
    .filter((daemon) => heralds.has(daemon.unit.id) && !daemon.short)
    .sort((left, right) => left.unit.id - right.unit.id)) {
    const seat = herald.unit.ownerId;
    const due = (fed.get(seat) ?? 0) + HERALD_HUNGER_FAVOUR_V7;
    fed.set(seat, due);
    const favour =
      (cult.favour.find((entry) => entry.playerId === seat)?.favour ?? 0) +
      (payers.get(seat)?.size ?? 0);
    if (favour < due)
      daemons.set(herald.unit.id, { ...herald, short: true, hungry: true });
  }
  // A channeller reads its daemon as the Hunger left it.
  for (const [unitId, channeller] of channellers) {
    const daemon = daemons.get(channeller.daemon.unit.id);
    if (daemon !== undefined && daemon !== channeller.daemon)
      channellers.set(unitId, { ...channeller, daemon });
  }

  const chanters = new Map<UnitId, CultAgainstChanterV7>();
  const summonings: PublicRitualV7[] = [];
  const starKeys = new Set<string>();
  const starHarm = new Map<UnitId, number>();
  const ownHarm = (
    forecast: ReturnType<typeof previewRitualV7>["starfall"],
  ): { readonly hp: number; readonly dead: number } => {
    let hp = 0;
    let dead = 0;
    for (const result of forecast?.results ?? [])
      if (result.ownerId === viewer) {
        hp += result.damage;
        if (result.dies) dead += 1;
      }
    return { hp, dead };
  };
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
    const harm = ownHarm(forecast.starfall);
    // Star-fall's joiners (`pulp_wars-mch9.41`): the star with one chanter
    // fewer, which a hit on any of them makes it.
    const weaker =
      forecast.starfall === null || ritual.chanters === 0
        ? harm
        : ownHarm(
            previewRitualV7(view, { ...ritual, chanters: ritual.chanters - 1 })
              .starfall,
          );
    const leader =
      ritual.leaderUnitId === null
        ? undefined
        : unitsById.get(ritual.leaderUnitId);
    if (foe(leader)) {
      chanters.set(leader.id, {
        unit: leader,
        ritual,
        ends: true,
        spare: 1,
        relief: harm.hp,
        saves: harm.dead > 0,
      });
      starHarm.set(leader.id, harm.hp);
    }
    for (const unitId of ritual.chanterUnitIds) {
      const unit = unitsById.get(unitId);
      if (foe(unit))
        chanters.set(unit.id, {
          unit,
          ritual,
          ends: spare <= 1,
          spare,
          relief: harm.hp - weaker.hp,
          saves: weaker.dead < harm.dead,
        });
    }
  }

  // The warden (`pulp_wars-mch9.41`): the hostile standing idols, what they
  // shield, and the Masses their idol alone holds.
  const wardens = new Map<UnitId, CultAgainstWardenV7>();
  for (const bearer of standingIdolsV7(view, view.units)) {
    if (!foe(bearer)) continue;
    let shields = 0;
    for (const unit of view.units) {
      if (
        unit.id === bearer.id ||
        unit.ownerId !== bearer.ownerId ||
        gap(unit.at, bearer.at) !== 1
      )
        continue;
      const channeller = channellers.get(unit.id);
      if (channeller !== undefined)
        shields += daemonShare(channeller.daemon, channeller.weight);
      const chanter = chanters.get(unit.id);
      if (chanter !== undefined) shields += chanterWorth(chanter);
    }
    wardens.set(bearer.id, { unit: bearer, shields, masses: [] });
  }
  for (const daemon of daemons.values()) {
    if (
      daemon.unit.summoned !== "MASS" ||
      !daemon.held ||
      daemon.strands >= daemon.control ||
      view.cities.some(
        (city) =>
          city.ownerId === daemon.unit.ownerId &&
          gap(city.at, daemon.unit.at) <= 1,
      )
    )
      continue;
    const holders = [...wardens.values()].filter(
      (warden) =>
        warden.unit.ownerId === daemon.unit.ownerId &&
        gap(warden.unit.at, daemon.unit.at) === 1,
    );
    const only = holders.length === 1 ? holders[0] : undefined;
    if (only !== undefined)
      wardens.set(only.unit.id, {
        ...only,
        masses: [...only.masses, daemon],
      });
  }
  const guardedKeys = new Set<string>();
  for (const city of view.cities)
    if (
      !isNeutralOwnerV7(city.ownerId) &&
      hostile(city.ownerId) &&
      masses.some(
        (mass) => mass.ownerId === city.ownerId && gap(mass.at, city.at) <= 1,
      )
    )
      guardedKeys.add(key(city.at));

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
    wardens.size === 0 &&
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
    imps,
    masses,
    guardedKeys,
    ranged: view.units.some((unit) => {
      // (A ship that shoots from afar counts as well.)
      if (unit.ownerId !== viewer || unit.hp <= 0) return false;
      const rule = unitRoleRuleV7(view, unit);
      return rule.abilities.includes("ATTACK") && rule.range >= 2;
    }),
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
    breakers: new Map(),
  };
}

/** The combat preview of an offered attack (the public one). */
export type CultAgainstPreviewV7 = (
  attackerId: UnitId,
  targetUnitId: UnitId,
) => CombatPreviewV7 | null;

/**
 * Whether the hit of `preview` breaks the strand of `channeller`: any
 * damage disrupts it (the shield wall halves a shot, rounded up, so a shot
 * still breaks it), and a strand to a daemon held without strands, or
 * already short, breaks nothing worth a hit.
 */
function breaksStrand(
  channeller: CultAgainstChannellerV7,
  preview: CombatPreviewV7,
): boolean {
  return (
    !channeller.daemon.held &&
    (preview.defenderDies || preview.damageToDefender > 0)
  );
}

/**
 * Hunt the strands: whether the attacks the seat is offered now can bring
 * the daemon `daemonId` below its Control this turn. The channellers a hit
 * can free are taken heaviest first; the seat needs one attacker for each.
 * (An estimate: it does not match attackers to targets one by one.)
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
  if (daemon !== undefined && !daemon.short && !daemon.held) {
    const hitters = new Set<UnitId>();
    const open = new Map<UnitId, CultAgainstChannellerV7>();
    for (const command of facts.attacks) {
      const channeller = facts.channellers.get(command.targetUnitId);
      if (channeller?.daemon.unit.id !== daemon.unit.id) continue;
      const hit = preview(command.unitId, command.targetUnitId);
      if (hit === null || hit.attackerDies || !breaksStrand(channeller, hit))
        continue;
      open.set(channeller.unit.id, channeller);
      hitters.add(command.unitId);
    }
    const order = [...open.values()].sort(
      (left, right) =>
        right.weight - left.weight || left.unit.id - right.unit.id,
    );
    let broken = 0;
    let needed = 0;
    for (const item of order) {
      if (broken >= daemon.spare) break;
      broken += item.weight;
      needed += 1;
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

function daemonShare(daemon: CultAgainstDaemonV7, weight: number): number {
  if (daemon.held) return 0;
  return Math.round(
    (CULT_AGAINST_VALUE_SCALE_V7 *
      daemon.value *
      Math.min(weight, daemon.spare)) /
      daemon.spare,
  );
}

/** What a hit on a ritual's participant is worth (its circle's share). */
function chanterWorth(chanter: CultAgainstChanterV7): number {
  if (chanter.ritual.kind === "GREAT_SUMMONING")
    return Math.round(
      (CULT_AGAINST_VALUE_SCALE_V7 * CULT_AGAINST_DAEMON_VALUE_V7.HERALD) /
        chanter.spare,
    );
  // The leader ends the star; a joiner takes 3 damage off it.
  return 2 * chanter.relief + 2;
}

/**
 * Whether the own unit `actorId` has an offered hit that breaks a hold
 * this turn: a strand to a daemon that would stay bound, a ritual's
 * participant, or the Idol Bearer that holds a Mass on its Doorstep
 * (`pulp_wars-mch9.41`: such a unit spends no blow on a Gibbering Mass).
 */
function breaksHold(
  facts: CultAgainstFactsV7,
  preview: CultAgainstPreviewV7,
  actorId: UnitId,
): boolean {
  const cached = facts.breakers.get(actorId);
  if (cached !== undefined) return cached;
  let result = false;
  for (const command of facts.attacks) {
    if (command.unitId !== actorId) continue;
    const channeller = facts.channellers.get(command.targetUnitId);
    const chanter = facts.chanters.get(command.targetUnitId);
    const warden = facts.wardens.get(command.targetUnitId);
    const strand =
      channeller !== undefined && !channeller.daemon.short
        ? channeller
        : undefined;
    const bearer =
      warden !== undefined && warden.masses.length > 0 ? warden : undefined;
    if (strand === undefined && chanter === undefined && bearer === undefined)
      continue;
    const hit = preview(command.unitId, command.targetUnitId);
    if (hit === null || hit.attackerDies) continue;
    if (
      (strand !== undefined && breaksStrand(strand, hit)) ||
      (chanter !== undefined &&
        (hit.damageToDefender > 0 || hit.defenderDies)) ||
      (bearer !== undefined && hit.defenderDies)
    ) {
      result = true;
      break;
    }
  }
  facts.breakers.set(actorId, result);
  return result;
}

/**
 * The value of the offered attack of `actor` on `target` against the Cult:
 * the strands, the Brood, the warden, the circles, the Mass, and the bound
 * Herald. `advances` is true when the kill would move the attacker (its
 * preview's advance).
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
  // Drag (`pulp_wars-mch9.41`): no blow that does not kill a Gibbering Mass
  // (30 HP, Defense 3) from a unit that can break a hold instead.
  if (
    target.summoned === "MASS" &&
    facts.daemons.has(target.id) &&
    !hit.defenderDies &&
    breaksHold(facts, preview, actor.id)
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
  // Brood (`pulp_wars-mch9.41`): the kill of the Imp whose strand lends its
  // Brood frees every Imp it holds.
  const daemon = facts.daemons.get(target.id);
  if (daemon !== undefined && hit.defenderDies && daemon.brood.length > 0)
    strategic += Math.round(
      CULT_AGAINST_VALUE_SCALE_V7 *
        CULT_AGAINST_DAEMON_VALUE_V7.IMP *
        daemon.brood.length,
    );
  // The warden: its kill opens what it shields and frees the Masses its
  // idol alone holds.
  const warden = facts.wardens.get(target.id);
  if (warden !== undefined && !hit.attackerDies) {
    const value = wardenValue(facts, warden);
    if (hit.defenderDies) {
      strategic += value.down;
      if (warden.masses.length > 0)
        priority = Math.max(priority, CULT_AGAINST_WARD_PRIORITY_V7);
    } else if (hit.damageToDefender > 0 && target.hp > 0)
      // A blow on the way to the kill (a hit does not drop the idol).
      strategic += Math.round(
        (value.shields * Math.min(hit.damageToDefender, target.hp)) / target.hp,
      );
  }
  // The shield wall: a halved shot that does not kill is worth the damage
  // it lost less, so a melee blow (never halved) goes first.
  if (hit.idolHalved && !hit.defenderDies) strategic -= hit.damageToDefender;
  const chanter = facts.chanters.get(target.id);
  if (chanter !== undefined && (hit.damageToDefender > 0 || hit.defenderDies)) {
    strategic += chanterWorth(chanter);
    if (chanter.ritual.kind === "GREAT_SUMMONING") {
      if (chanter.ends)
        priority = Math.max(priority, CULT_AGAINST_SUMMONING_PRIORITY_V7);
    } else if (chanter.ends ? chanter.relief > 0 : chanter.saves)
      // The hit that ends a star on own units, or (a joiner) that takes
      // enough off it to save an own unit.
      priority = Math.max(priority, CULT_AGAINST_STAR_HIT_PRIORITY_V7);
  }
  return { priority, strategic };
}

/**
 * The warden's worth when its idol goes down (`down`: by its kill or a
 * status): the Masses it alone holds, and, for a seat with ranged units,
 * its share of what it shields (`shields`, also what a blow on the way to
 * the kill is worth in proportion).
 */
function wardenValue(
  facts: CultAgainstFactsV7,
  warden: CultAgainstWardenV7,
): { readonly down: number; readonly shields: number } {
  const shields = facts.ranged
    ? Math.round(CULT_AGAINST_SHIELD_SHARE_V7 * warden.shields)
    : 0;
  return {
    down:
      shields +
      warden.masses.reduce(
        (total, mass) => total + CULT_AGAINST_VALUE_SCALE_V7 * mass.value,
        0,
      ),
    shields,
  };
}

/**
 * A status on a hostile Idol Bearer (`pulp_wars-mch9.41`; a Bolas or a
 * Ribbit offered on it): its idol is down while the status lasts, which is
 * worth what its kill is (`wardenValue`), with the priority of that kill
 * when a Mass it alone holds then breaks loose.
 */
export function cultAgainstStatusV7(
  facts: CultAgainstFactsV7,
  targetUnitId: UnitId,
  priority: number,
): CultAgainstValueV7 {
  const warden = facts.wardens.get(targetUnitId);
  if (warden === undefined) return { priority, strategic: 0 };
  const strategic = wardenValue(facts, warden).down;
  // The general rules see no worth in a status on a unit that stands still
  // (a refused Bolas): a Mass breaking loose is worth it all the same.
  if (warden.masses.length > 0)
    return {
      priority: Math.max(priority, CULT_AGAINST_WARD_PRIORITY_V7),
      strategic,
    };
  return priority < 0 ? { priority, strategic: 0 } : { priority, strategic };
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
 * The eye mark (section 6.4, with the Cult redesign's four-step target rule
 * of section 9.2, `pulp_wars-mch9.41`): whether the hostile bound daemon
 * `daemon`, if it broke now, would go for the unit `actor` standing on `at`
 * and strike it this rampage: `actor` is then the unit the engine's rule
 * (`rampageChoiceV7`) picks within the daemon's reach (its Move and one): a
 * robed cultist within 2 first, then anyone in reach who is no summon,
 * then a summon in reach; a tie to the daemon's own seat, then the fewest
 * Hit Points, then the lowest unit ID. (Beyond its reach it only walks.)
 */
export function cultAgainstEyeMarkedV7(
  view: PlayerViewV7,
  daemon: CultAgainstDaemonV7,
  actor: PublicUnitV7,
  at: CoordV7,
): boolean {
  if (gap(at, daemon.unit.at) > daemon.reach) return false;
  const units = steppedView(view, actor, at).units;
  return (
    rampageChoiceV7(
      view,
      units,
      daemon.unit,
      daemon.unit.at,
      daemon.unit.ownerId,
      daemon.reach,
      daemon.reach,
    ).target?.id === actor.id
  );
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
   * star, back from an eye mark, a frog's retreat, out of a Swarm, onto a
   * Cowed center): a candidate whatever the general Move rules say of it.
   */
  readonly forced: boolean;
}

/**
 * Swarm (`pulp_wars-mch9.41`): the bound Imps of one hostile seat beside a
 * unit on `at` when they are two or more (it could not answer their
 * attacks there), else none.
 */
function swarmAt(
  facts: CultAgainstFactsV7,
  at: CoordV7,
): readonly PublicUnitV7[] {
  if (facts.imps.length < IMP_SWARM_MINIMUM_V7) return [];
  const bySeat = new Map<PlayerId, PublicUnitV7[]>();
  for (const imp of facts.imps)
    if (gap(imp.at, at) === 1) {
      const pack = [...(bySeat.get(imp.ownerId) ?? []), imp];
      if (pack.length >= IMP_SWARM_MINIMUM_V7)
        return facts.imps.filter(
          (other) => other.ownerId === imp.ownerId && gap(other.at, at) === 1,
        );
      bySeat.set(imp.ownerId, pack);
    }
  return [];
}

/** Drag (`pulp_wars-mch9.41`): a hostile bound Gibbering Mass is beside `at`. */
function draggedAt(facts: CultAgainstFactsV7, at: CoordV7): boolean {
  return facts.masses.some((mass) => gap(mass.at, at) === 1);
}

/** On or beside a hostile city center that a hostile Mass guards. */
function besideGuardedCenter(facts: CultAgainstFactsV7, at: CoordV7): boolean {
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1)
      if (facts.guardedKeys.has(key({ x: at.x + dx, y: at.y + dy })))
        return true;
  return false;
}

/**
 * Awestruck (`pulp_wars-mch9.41`): the hostile standing idols beside a
 * unit on `at` (it may attack only one of them there).
 */
function awestruckAt(
  facts: CultAgainstFactsV7,
  actor: PublicUnitV7,
  at: CoordV7,
): readonly PublicUnitV7[] {
  return [...facts.wardens.values()]
    .filter(
      (warden) => warden.unit.id !== actor.id && gap(warden.unit.at, at) === 1,
    )
    .map((warden) => warden.unit);
}

/**
 * Whether `actor`, having moved onto `at`, kills one of `targets` with its
 * attack (the public combat preview on the board after the Move).
 */
function killsFrom(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  at: CoordV7,
  targets: readonly PublicUnitV7[],
): boolean {
  const moved: PlayerViewV7 = {
    ...view,
    units: view.units.map((unit) =>
      unit.id === actor.id
        ? {
            ...unit,
            at: { x: at.x, y: at.y },
            activation: { ...unit.activation, moved: true },
          }
        : unit,
    ),
  };
  return targets.some((target) => {
    const hit = queryCombatPreviewV7(moved, actor.id, target.id);
    return hit !== null && hit.defenderDies && !hit.attackerDies;
  });
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

  // The eye mark of a daemon short of its Control (or of its Hunger).
  let markedFrom = false;
  let markedTo = false;
  for (const daemon of facts.daemons.values()) {
    if (!daemon.short) continue;
    markedFrom ||= cultAgainstEyeMarkedV7(view, daemon, actor, from);
    markedTo ||= cultAgainstEyeMarkedV7(view, daemon, actor, to);
  }
  const starFrom = facts.starKeys.has(fromKey);
  const starTo = facts.starKeys.has(toKey);
  // Drag (`pulp_wars-mch9.41`): no routine Move ends beside a hostile
  // Gibbering Mass (it would hold the unit to one tile next turn), unless
  // onto a center, a village, or a chest, or beside a center the Mass
  // guards (the siege).
  const dragTo =
    draggedAt(facts, to) &&
    !draggedAt(facts, from) &&
    !besideGuardedCenter(facts, to);
  if (
    routine &&
    ((markedTo && !markedFrom) ||
      (starTo && !starFrom) ||
      (dragTo && !tools.site(to)))
  )
    return refused;
  // Swarm (`pulp_wars-mch9.41`): no Move ends beside two of a hostile
  // seat's Imps from a tile beside fewer when it matters: a routine Move,
  // or one to a tile where the visible enemy kills the unit (the pack's
  // blows go unanswered), unless onto a site or its attack from there kills
  // one of the pack (the Swarm is then broken).
  const swarmFrom = swarmAt(facts, from).length > 0;
  const pack = swarmAt(facts, to);
  const swarmTo = pack.length > 0;
  if (
    swarmTo &&
    !swarmFrom &&
    !tools.site(to) &&
    (routine || tools.danger(actor, to) >= actor.hp) &&
    !killsFrom(view, actor, to, pack)
  )
    return refused;

  // Awestruck (`pulp_wars-mch9.41`; Pick Me!'s rule before it): a Move into
  // a standing idol's ring from outside it has at most a routine Move's
  // priority (the attack it was made for may be refused there), unless it
  // is onto a site or its attack on the Idol Bearer kills.
  if (!routine && !tools.site(to)) {
    const bearers = awestruckAt(facts, actor, to);
    if (
      bearers.length > 0 &&
      awestruckAt(facts, actor, from).length === 0 &&
      !killsFrom(view, actor, to, bearers)
    )
      priority = tools.routineMaximum;
  }

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
  // Swarm: after its attacks, a unit beside two hostile Imps steps to a
  // tile beside fewer (never off a center, a village, or a chest).
  if (swarmFrom && !swarmTo && clean && !tools.site(from)) {
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
