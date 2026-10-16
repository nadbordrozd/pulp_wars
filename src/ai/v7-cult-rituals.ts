import type { PlayerId, UnitId } from "../engine/model/ids";
import {
  SEIZE_BROKEN_HP_V7,
  starfallDamageV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import {
  pamphletsApplyV7,
  tentacleSlapTargetV7,
} from "../engine/v7/cult-hexes";
import { fixedSignatureHitV7 } from "../engine/v7/giants";
import { shieldOfV7 } from "../engine/v7/martian";
import {
  previewBeginRitualV7,
  previewJoinChantV7,
  previewBooV7,
  previewProclaimV7,
  previewRibbitV7,
  previewSeizeV7,
  previewSwitcherooV7,
  previewTentacleV7,
  queryCombatPreviewV7,
} from "../engine/v7/query";
import { isNeutralOwnerV7, type CoordV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";
import { CULT_SUMMONING_FAVOUR_V7, cultCasterV7, cultRobedV7 } from "./v7-cult";

/**
 * The Cult seat's rituals and tricks (`pulp_wars-mch9.11`, bead A3 of
 * docs/product/RULESET_7_CULTISTS.md sections 15.3 and 15.4; as built in
 * section 15.8): the Great Summoning and the Favour saved for it, Star-fall,
 * the Herald's two attacks and Proclaim, Boo!, Ribbit, Switcheroo, the
 * Tentacle, and Pamphlets. (Pick Me! retired with the Chosen: the Cult
 * redesign, `pulp_wars-mch9.31`; the Tentacle step reads every offered
 * `TENTACLE`, the Summoner's since then.) Revised by the Cult redesign's
 * A-R2 (`pulp_wars-mch9.39`, RULESET_7_CULT_REDESIGN.md sections 12.3 and
 * 12.6): Star-fall begun alone and the joins of its chant, Switcheroo at 4,
 * the Summoner's Tentacle against Seizure set-ups, and the Herald's attacks
 * scored with the advance after a kill.
 *
 * It is one part of the Cult seat's plan (`cultPlanV7` in
 * `src/ai/v7-cult-channel.ts`, which calls it once the channel plan has
 * claimed its cultists): it adds **steps** (an offered command with a
 * priority above the ordinary play) and **holds** (a unit that is given no
 * other command), and says where no own unit may end a Move (under an own
 * ritual's mark). None of these commands is a candidate of the policy but as
 * a step (`isPolicyCandidate` in `src/ai/v7.ts`).
 *
 * A baseline designed from judgement, **not tuned by simulation**: no match
 * was played to set a number in this file, and its tests are hand-built
 * positions (`tests/unit/ruleset-v7-cult-rituals-ai.test.ts`). It reads the
 * public view, the public previews, and the pure predicates of
 * `src/engine/v7/cult-hexes.ts`; it imports no reducer, draws nothing from
 * the PRNG, and does not depend on elapsed time.
 */

/**
 * The robed cultists the seat keeps for a Herald beyond every other
 * daemon's Control + 1: its Control and one to spare (section 15.3).
 */
export const CULT_HERALD_BODIES_V7 = 4;
/**
 * The seat saves its Favour for the Great Summoning from this much on (with
 * The Stars Are Right and the bodies to hold a Herald): half the price, 9
 * of 18 since the Cult redesign's A-R1 (`pulp_wars-mch9.38`, section 12.3;
 * 10 of 20 before). Below it a Horror is summoned as before.
 */
export const CULT_SAVE_FAVOUR_V7 = 9;
/** The chanters the Great Summoning needs beside its leader (section 7.2). */
export const CULT_SUMMONING_CHANTERS_V7 = 3;
/** Star-fall reaches 2 to 4 tiles (section 7.4). */
export const CULT_STARFALL_MINIMUM_V7 = 2;
export const CULT_STARFALL_MAXIMUM_V7 = 4;
/**
 * A star deals this alone, and 3 more for each cultist who joins its chant
 * (the Cult redesign, `pulp_wars-mch9.34`, section 8.2; 5 and 1 before).
 */
export const CULT_STARFALL_DAMAGE_V7 = 6;
/**
 * The Cult redesign's A-R2 (`pulp_wars-mch9.39`, RULESET_7_CULT_REDESIGN.md
 * section 12.3): a free cultist joins a star's chant while the mark holds
 * this many hostile units or more (one of them still standing under the
 * star as it is), even when the join kills nobody more.
 */
export const CULT_STARFALL_CROWD_V7 = 3;
/** The Herald's attacks a turn (Ravage, section 9.1). */
export const CULT_HERALD_ATTACKS_V7 = 2;
/** Proclaim reaches a city within this many tiles (section 8.6). */
export const CULT_PROCLAIM_RANGE_V7 = 3;
/** The value of a unit that has no cost (a giant, a daemon, an Egg). */
export const CULT_PRICELESS_VALUE_V7 = 12;

/** The Herald's planned Move, its Proclaim, and a Horror's Boo!. */
export const CULT_HERALD_PRIORITY_V7 = 3970;
export const CULT_BOO_PRIORITY_V7 = 3950;
/**
 * Just above Summon (1910): the circle before a Horror; below the warden's
 * placement (1920, A-R1, `pulp_wars-mch9.38`: Behold!'s step before the
 * Cult redesign retired it, `pulp_wars-mch9.33`).
 */
export const CULT_SUMMONING_PRIORITY_V7 = 1915;
/** Below the Offering (1890), above every ordinary command. */
export const CULT_RIBBIT_PRIORITY_V7 = 1880;
export const CULT_SWITCHEROO_PRIORITY_V7 = 1875;
export const CULT_TENTACLE_PRIORITY_V7 = 1870;
export const CULT_STARFALL_PRIORITY_V7 = 1860;
/** A join of an own pending star's chant, just below the begin. */
export const CULT_JOIN_CHANT_PRIORITY_V7 = 1859;
/** An Initiate's Move onto a neutral village it captures this turn. */
export const CULT_PAMPHLETS_PRIORITY_V7 = 1855;
/**
 * With a Monster this near, an Initiate is left to the ordinary play (the
 * hunt of a wounded Monster, the step away from a healthy one).
 */
export const CULT_MONSTER_WATCH_V7 = 3;
/**
 * A Proclaim by a Herald that has neither moved nor attacked and has no
 * attack on offer: after every ordinary command of the turn (it cannot move
 * afterwards), above the doomed unit's Sacrifice and End Turn.
 */
export const CULT_PROCLAIM_LAST_PRIORITY_V7 = 10;

type MoveV7 = Extract<CommandV7, { kind: "MOVE" }>;
type AttackV7 = Extract<CommandV7, { kind: "ATTACK" }>;
type BeginV7 = Extract<CommandV7, { kind: "BEGIN_RITUAL" }>;
type JoinV7 = Extract<CommandV7, { kind: "JOIN_CHANT" }>;

export type CultRitualReasonV7 =
  | "GREAT_SUMMONING"
  | "GATHER"
  | "STARFALL"
  | "STARFALL_JOIN"
  | "STARFALL_COME"
  | "HERALD_MOVE"
  | "HERALD_ATTACK"
  | "PROCLAIM"
  | "BOO"
  | "RIBBIT_GUARD"
  | "RIBBIT_SEIZE"
  | "RIBBIT"
  | "SWITCHEROO_SEIZE"
  | "SWITCHEROO"
  | "TENTACLE"
  | "PAMPHLETS";

export interface CultRitualStepV7 {
  /** One of the offered commands (the same object). */
  readonly command: CommandV7;
  readonly priority: number;
  readonly value: number;
  readonly reason: CultRitualReasonV7;
}

/** What this part of the plan reads (given by `cultPlanV7`). */
export interface CultRitualFactsV7 {
  readonly view: PlayerViewV7;
  readonly commands: readonly CommandV7[];
  readonly hostile: (ownerId: PlayerId) => boolean;
  /** What the visible enemies deal `unit` on `at` in their next turn. */
  readonly danger: (unit: PublicUnitV7, at: CoordV7) => number;
  /**
   * The Cult redesign's A-R2 (`pulp_wars-mch9.39`): what the visible
   * enemies but the units of `gone` (a Herald's victims) deal `unit` on
   * `at` in their next turn.
   */
  readonly dangerWithout: (
    unit: PublicUnitV7,
    at: CoordV7,
    gone: readonly UnitId[],
  ) => number;
  /** A visible enemy can attack a unit on `at` in its next turn. */
  readonly threatened: (at: CoordV7) => boolean;
  /** The visible unit `unitId` can attack a unit on `at` in its next turn. */
  readonly reach: (unitId: UnitId, at: CoordV7) => boolean;
  /** The view with each of these units on its tile. */
  readonly moved: (
    moves: readonly { readonly unit: PublicUnitV7; readonly at: CoordV7 }[],
    /** The visible units taken off the board too (A-R2: a Herald's victim). */
    gone?: readonly UnitId[],
  ) => PlayerViewV7;
  /** The own living units in land form. */
  readonly own: readonly PublicUnitV7[];
  /** The visible hostile units of players (no Egg). */
  readonly enemies: readonly PublicUnitV7[];
  /** The units the plan holds; this part adds its own. */
  readonly held: Set<UnitId>;
  /** The broken enemies kept for a Seizure (nobody attacks them). */
  readonly seized: ReadonlySet<UnitId>;
  readonly movesByUnit: ReadonlyMap<UnitId, readonly MoveV7[]>;
  /** The own cultists that hold a strand now. */
  readonly channellers: ReadonlySet<UnitId>;
  /** A channeller is still to be placed, or a bind is under way. */
  readonly pending: boolean;
  /** The seat's robed cultists, and every bound daemon's Control + 1. */
  readonly bodies: number;
  readonly wantedAll: number;
  readonly favour: number;
  /**
   * The Favour the seat's next check eats for its bound Heralds (the Cult
   * redesign's A-R1, `pulp_wars-mch9.38`): never spent on a ritual.
   */
  readonly hunger: number;
  /** The seat has The Stars Are Right. */
  readonly stars: boolean;
  /** The own bound daemons. */
  readonly daemons: readonly {
    readonly unit: PublicUnitV7;
    readonly herald: boolean;
    readonly holdable: boolean;
  }[];
  /** Where an own bound daemon may end a Move (its channellers follow). */
  readonly daemonMayEnd: (unitId: UnitId, at: CoordV7) => boolean;
  /** An explored land tile a unit can stand on. */
  readonly landTile: (at: CoordV7) => boolean;
  readonly onOwnCenter: (unit: PublicUnitV7) => boolean;
  /** The tiles to the nearest visible enemy. */
  readonly enemyGap: (at: CoordV7) => number;
}

export interface CultRitualPlanV7 {
  readonly steps: readonly CultRitualStepV7[];
  /** Favour is kept for the Great Summoning: no Horror below 22. */
  readonly saving: boolean;
  /** No own unit ends a Move here: under an own ritual's mark. */
  readonly mayEnd: (at: CoordV7) => boolean;
  /**
   * The Cult redesign's A-R2 (`pulp_wars-mch9.39`, section 12.3): false for
   * an attack of an own Herald the plan does not make (a kill whose advance
   * takes it into lethal reach, or off its leash while a better attack is
   * on offer; any other attack while the plan names one).
   */
  readonly mayAttack: (unitId: UnitId, targetUnitId: UnitId) => boolean;
}

const gap = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const sameTile = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const tileKey = (at: CoordV7): string => `${at.y},${at.x}`;

/** Lexicographic comparison, higher first. */
function better(left: readonly number[], right: readonly number[]): boolean {
  for (let index = 0; index < left.length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference > 0;
  }
  return false;
}

function primaryReady(unit: PublicUnitV7): boolean {
  return (
    !unit.activation.attacked &&
    !unit.activation.recovered &&
    !unit.activation.captured &&
    !unit.activation.specialActed &&
    !unit.activation.overrunActive
  );
}

/**
 * The seat keeps its Favour for the Great Summoning (section 15.8): it has
 * The Stars Are Right, a Summoner, the robed cultists to hold a Herald
 * beyond every other daemon's Control + 1, and `CULT_SAVE_FAVOUR_V7` Favour.
 */
export function cultSavingV7(
  facts: Pick<CultRitualFactsV7, "stars" | "bodies" | "wantedAll" | "favour">,
  summoners: number,
): boolean {
  return (
    facts.stars &&
    summoners > 0 &&
    facts.bodies >= facts.wantedAll + CULT_HERALD_BODIES_V7 &&
    facts.favour >= CULT_SAVE_FAVOUR_V7
  );
}

/** The rituals and the tricks of the Cult seat's plan (see the file comment). */
export function cultRitualPlanV7(facts: CultRitualFactsV7): CultRitualPlanV7 {
  const { view, commands, own, enemies, held } = facts;
  const cult = view.cult;
  const me = view.viewer.id;
  const unitsById = new Map(view.units.map((unit) => [unit.id, unit]));
  const steps: CultRitualStepV7[] = [];

  const ruleOf = (unit: PublicUnitV7) => unitRoleRuleV7(view, unit);
  const hasAbility = (unit: PublicUnitV7, ability: string): boolean =>
    (ruleOf(unit).abilities as readonly string[]).includes(ability);
  const valueOf = (unit: PublicUnitV7): number =>
    ruleOf(unit).cost ?? CULT_PRICELESS_VALUE_V7;
  const melee = (unit: PublicUnitV7): boolean =>
    hasAbility(unit, "ATTACK") && ruleOf(unit).range <= 1;
  const shooter = (unit: PublicUnitV7): boolean =>
    ruleOf(unit).range >= 2 || ruleOf(unit).tacticalRole === "SIEGE";
  const frogs = new Set(cult.frogs);

  // ------------------------------------------------ the offered commands
  const attacksByUnit = new Map<UnitId, AttackV7[]>();
  const begins: BeginV7[] = [];
  const joins: JoinV7[] = [];
  const proclaims: Extract<CommandV7, { kind: "PROCLAIM" }>[] = [];
  const boos: Extract<CommandV7, { kind: "BOO" }>[] = [];
  const ribbits: Extract<CommandV7, { kind: "RIBBIT" | "SWITCHEROO" }>[] = [];
  const swaps: Extract<CommandV7, { kind: "RIBBIT" | "SWITCHEROO" }>[] = [];
  const tentacles: Extract<CommandV7, { kind: "TENTACLE" }>[] = [];
  for (const command of commands) {
    if (command.kind === "ATTACK") {
      const list = attacksByUnit.get(command.unitId);
      if (list === undefined) attacksByUnit.set(command.unitId, [command]);
      else list.push(command);
    } else if (command.kind === "BEGIN_RITUAL") begins.push(command);
    else if (command.kind === "JOIN_CHANT") joins.push(command);
    else if (command.kind === "PROCLAIM") proclaims.push(command);
    else if (command.kind === "BOO") boos.push(command);
    else if (command.kind === "RIBBIT") ribbits.push(command);
    else if (command.kind === "SWITCHEROO") swaps.push(command);
    else if (command.kind === "TENTACLE") tentacles.push(command);
  }
  /** An attack the engine offers the unit now kills its target. */
  const killOnOffer = (unitId: UnitId): boolean =>
    (attacksByUnit.get(unitId) ?? []).some(
      (command) =>
        queryCombatPreviewV7(view, unitId, command.targetUnitId)
          ?.defenderDies === true,
    );

  const summoners = own.filter((unit) => hasAbility(unit, "SUMMON"));
  const saving = cultSavingV7(facts, summoners.length);

  /** A robed cultist that would chant beside a leader (section 7.1). */
  const chants = (unit: PublicUnitV7): boolean =>
    cultRobedV7(view, unit) &&
    hasAbility(unit, "CHANNEL") &&
    primaryReady(unit) &&
    !frogs.has(unit.id);
  const chantersOf = (leader: PublicUnitV7): readonly PublicUnitV7[] =>
    own.filter(
      (unit) =>
        unit.id !== leader.id && gap(unit.at, leader.at) === 1 && chants(unit),
    );
  /**
   * The Move that brings a cultist beside `leader` to chant: the cheapest
   * free robed cultist first, then the nearest, onto a tile no visible
   * enemy can attack. Never a held unit, nor the unit on an own center.
   */
  const comersTo = (
    leader: PublicUnitV7,
  ): readonly { readonly unit: PublicUnitV7; readonly move: MoveV7 }[] => {
    const taken = new Set<string>();
    const comers: { unit: PublicUnitV7; move: MoveV7 }[] = [];
    const pool = own
      .filter(
        (unit) =>
          unit.id !== leader.id &&
          chants(unit) &&
          !held.has(unit.id) &&
          gap(unit.at, leader.at) > 1 &&
          !facts.onOwnCenter(unit),
      )
      .sort(
        (left, right) =>
          valueOf(left) - valueOf(right) ||
          gap(left.at, leader.at) - gap(right.at, leader.at) ||
          left.id - right.id,
      );
    for (const unit of pool) {
      let best: MoveV7 | undefined;
      let bestKey: readonly number[] = [];
      for (const move of facts.movesByUnit.get(unit.id) ?? []) {
        const end = move.path.at(-1);
        if (
          end === undefined ||
          gap(end, leader.at) !== 1 ||
          !facts.landTile(end) ||
          facts.threatened(end) ||
          taken.has(tileKey(end))
        )
          continue;
        const key = [facts.enemyGap(end), -move.path.length, -end.y, -end.x];
        if (best === undefined || better(key, bestKey)) {
          best = move;
          bestKey = key;
        }
      }
      const end = best?.path.at(-1);
      if (best === undefined || end === undefined) continue;
      taken.add(tileKey(end));
      comers.push({ unit, move: best });
    }
    return comers;
  };

  // ----------------------------------------------- the Great Summoning
  // Section 15.3: only with the price (18 since the Cult redesign; and,
  // A-R1, beyond the Hunger of the Heralds the seat has), The Stars Are
  // Right, a Summoner with three chanters, nobody of the circle and no mark
  // in a visible enemy's reach, and four robed cultists to spare for the
  // Herald.
  if (
    saving &&
    facts.favour >= CULT_SUMMONING_FAVOUR_V7 + facts.hunger &&
    !facts.pending
  ) {
    let best: BeginV7 | undefined;
    let bestKey: readonly number[] = [];
    const leaders = new Set<UnitId>();
    for (const command of begins) {
      if (command.ritual !== "GREAT_SUMMONING" || leaders.has(command.unitId))
        continue;
      leaders.add(command.unitId);
      const leader = unitsById.get(command.unitId);
      if (leader === undefined || held.has(leader.id)) continue;
      const chanters = chantersOf(leader);
      if (
        chanters.length < CULT_SUMMONING_CHANTERS_V7 ||
        chanters.some((unit) => held.has(unit.id)) ||
        [leader, ...chanters].some((unit) => facts.threatened(unit.at))
      )
        continue;
      // The mark: a free tile no enemy can reach, with the most own units
      // around it, then the farthest from the enemy.
      for (const mark of begins) {
        if (
          mark.ritual !== "GREAT_SUMMONING" ||
          mark.unitId !== leader.id ||
          facts.threatened(mark.at) ||
          view.units.some((unit) => unit.hp > 0 && sameTile(unit.at, mark.at))
        )
          continue;
        const key = [
          chanters.length,
          own.filter((unit) => gap(unit.at, mark.at) === 1).length,
          facts.enemyGap(mark.at),
          -leader.id,
          -mark.at.y,
          -mark.at.x,
        ];
        if (best === undefined || better(key, bestKey)) {
          best = mark;
          bestKey = key;
        }
      }
    }
    const preview =
      best === undefined
        ? null
        : previewBeginRitualV7(view, best.unitId, best.ritual, best.at);
    if (
      best !== undefined &&
      preview?.summoning?.outcome === "ARRIVES" &&
      preview.summoning.strands >= preview.summoning.control
    ) {
      steps.push({
        command: best,
        priority: CULT_SUMMONING_PRIORITY_V7,
        value: preview.summoning.strands,
        reason: "GREAT_SUMMONING",
      });
      held.add(best.unitId);
      for (const unitId of preview.chanterUnitIds) held.add(unitId);
    } else {
      // No circle yet: the idle cultists near the Summoner nearest home end
      // their Moves next to it (section 15.3). With enough of them this
      // turn the Summoner and the cultists beside it wait for the rest.
      const centers = view.cities.filter((city) => city.ownerId === me);
      let leader: PublicUnitV7 | undefined;
      let leaderKey: readonly number[] = [];
      for (const unit of summoners) {
        if (
          !primaryReady(unit) ||
          held.has(unit.id) ||
          frogs.has(unit.id) ||
          facts.threatened(unit.at)
        )
          continue;
        const key = [
          chantersOf(unit).length,
          -centers.reduce(
            (nearest, city) => Math.min(nearest, gap(city.at, unit.at)),
            99,
          ),
          -unit.id,
        ];
        if (leader === undefined || better(key, leaderKey)) {
          leader = unit;
          leaderKey = key;
        }
      }
      if (leader !== undefined) {
        const beside = chantersOf(leader).filter((unit) => !held.has(unit.id));
        const need = CULT_SUMMONING_CHANTERS_V7 - beside.length;
        const comers = need > 0 ? comersTo(leader) : [];
        const first = comers[0];
        if (first !== undefined) {
          steps.push({
            command: first.move,
            priority: CULT_SUMMONING_PRIORITY_V7,
            value: 0,
            reason: "GATHER",
          });
          if (comers.length >= need) {
            held.add(leader.id);
            for (const unit of beside) held.add(unit.id);
            for (const comer of comers.slice(0, need)) held.add(comer.unit.id);
          }
        }
      }
    }
  }

  // ----------------------------------------------------------- the Herald
  // Section 15.2 step 2: the Herald's two attacks are scored together. It
  // cannot move after an attack, so its Move is chosen first: the tile from
  // which its two attacks are best, then where a city can be Proclaimed
  // with an attack that is left over, then where a visible enemy is nearer
  // to it than any own unit.
  //
  // The Cult redesign's A-R2 (`pulp_wars-mch9.39`, RULESET_7_CULT_REDESIGN.md
  // section 12.3): the attacks are scored with the advance after a kill. A
  // kill whose advance takes it from a tile its channellers can hold it on
  // (`daemonMayEnd`) to one they cannot is scored below every attack that
  // does not, unless the second attack from the new tile is a kill too (it
  // breaks loose at the next check: two kills are worth that). Decided
  // here: below no attack at all too, so a lone kill off its leash is never
  // made (it would trade the Herald's bind, 18 Favour, for one unit); and a
  // kill whose advance (or the two kills') leaves it where the visible
  // enemy, less its victims, kills it next turn is not made either, unless
  // it stands in such reach already. Its attacks are steps of the plan (in
  // the plan's order of the two), and the attacks the plan does not make
  // are vetoed (`mayAttack`).
  const cowed = new Set(cult.cowed.map((entry) => entry.cityId));
  const proclaimable = view.cities.filter(
    (city) =>
      !isNeutralOwnerV7(city.ownerId) &&
      facts.hostile(city.ownerId) &&
      !cowed.has(city.id) &&
      // A center an own unit stands on is being taken already.
      !own.some((unit) => sameTile(unit.at, city.at)),
  );
  const vetoes = new Set<string>();
  const attackKey = (unitId: UnitId, targetUnitId: UnitId): string =>
    `${unitId}>${targetUnitId}`;
  const mayAttack = (unitId: UnitId, targetUnitId: UnitId): boolean =>
    !vetoes.has(attackKey(unitId, targetUnitId));
  for (const daemon of facts.daemons) {
    const herald = daemon.unit;
    if (!daemon.herald || !daemon.holdable || held.has(herald.id)) continue;
    const offered = attacksByUnit.get(herald.id) ?? [];
    const fresh =
      !herald.activation.moved &&
      herald.activation.attacksUsed === 0 &&
      primaryReady(herald);
    if (!fresh && offered.length === 0) continue;
    const left = Math.max(
      0,
      CULT_HERALD_ATTACKS_V7 - herald.activation.attacksUsed,
    );
    const reachOf = ruleOf(herald).range;
    const leashed = (at: CoordV7): boolean => facts.daemonMayEnd(herald.id, at);
    // Where it stands now is in lethal reach already: an advance makes that
    // no worse.
    const doomed = facts.danger(herald, herald.at) >= herald.hp;
    const lethal = new Map<string, number>();
    const lethalAt = (
      at: CoordV7,
      gone: readonly UnitId[],
      hp: number,
    ): boolean => {
      if (doomed) return false;
      const key = `${tileKey(at)}:${[...gone].sort((a, b) => a - b).join(",")}`;
      let danger = lethal.get(key);
      if (danger === undefined) {
        danger = facts.dangerWithout(herald, at, gone);
        lethal.set(key, danger);
      }
      return danger >= hp;
    };
    type HitV7 = {
      readonly target: PublicUnitV7;
      readonly kills: number;
      readonly value: number;
      readonly damage: number;
      readonly taken: number;
      /** The victim's tile it advances onto, or null. */
      readonly advance: CoordV7 | null;
    };
    /**
     * Its hits from `at` (with the unit of `gone`, its first victim, off
     * the board: the second attack after a kill is made from the victim's
     * tile).
     */
    const hitsFrom = (
      at: CoordV7,
      gone: UnitId | null = null,
    ): readonly HitV7[] => {
      const targets = enemies.filter(
        (unit) =>
          unit.form === "LAND" &&
          unit.id !== gone &&
          gap(unit.at, at) <= reachOf &&
          !facts.seized.has(unit.id) &&
          // From its own tile only what the engine offers it.
          (!sameTile(at, herald.at) ||
            offered.some((command) => command.targetUnitId === unit.id)),
      );
      const projected =
        targets.length === 0 || (sameTile(at, herald.at) && gone === null)
          ? view
          : facts.moved([{ unit: herald, at }], gone === null ? [] : [gone]);
      return targets.flatMap((target) => {
        const preview = queryCombatPreviewV7(projected, herald.id, target.id);
        return preview === null
          ? []
          : [
              {
                target,
                kills: Number(preview.defenderDies),
                value: valueOf(target),
                damage: preview.damageToDefender,
                taken: preview.damageToAttacker,
                advance:
                  preview.defenderDies && preview.advances ? target.at : null,
              },
            ];
      });
    };
    /**
     * Whether the pair from `at` may be made: no advance takes it off its
     * leash but one a second kill follows, and the tile where the Move and
     * the advances leave it is out of lethal reach (or it stands in such
     * reach already, or stays where it stands).
     */
    const allowed = (at: CoordV7, pair: readonly HitV7[]): boolean => {
      let leash = true;
      let from = at;
      let hp = herald.hp;
      const gone: UnitId[] = [];
      pair.forEach((hit, index) => {
        hp -= hit.taken;
        if (hit.advance === null) return;
        gone.push(hit.target.id);
        const next = pair[index + 1];
        if (
          leashed(from) &&
          !leashed(hit.advance) &&
          !(next !== undefined && next.kills > 0)
        )
          leash = false;
        from = hit.advance;
      });
      // (It ends where it moved when nothing advances it: a Move into lethal
      // reach is refused too.)
      return leash && (sameTile(from, herald.at) || !lethalAt(from, gone, hp));
    };
    /** The best attacks it may make from `at`: kills, value, number, damage. */
    const bestFrom = (
      at: CoordV7,
    ): { readonly hits: readonly HitV7[]; readonly key: readonly number[] } => {
      const single = hitsFrom(at);
      let hits: readonly HitV7[] = [];
      let key: readonly number[] = [0, 0, 0, 0];
      const consider = (pair: readonly HitV7[]): void => {
        if (!allowed(at, pair)) return;
        const candidate = [
          pair.reduce((sum, hit) => sum + hit.kills, 0),
          pair.reduce((sum, hit) => sum + hit.kills * hit.value, 0),
          pair.length,
          pair.reduce((sum, hit) => sum + hit.damage, 0),
        ];
        if (better(candidate, key)) {
          hits = pair;
          key = candidate;
        }
      };
      for (const firstHit of single) {
        consider([firstHit]);
        if (left < 2) continue;
        // After a kill it strikes from its victim's tile (the Cult
        // redesign, `pulp_wars-mch9.35`), its victim gone.
        const seconds =
          firstHit.advance === null
            ? single
            : hitsFrom(firstHit.advance, firstHit.target.id);
        for (const secondHit of seconds) {
          if (secondHit.target.id === firstHit.target.id) continue;
          consider([firstHit, secondHit]);
        }
      }
      return { hits, key };
    };
    const ownGap = (at: CoordV7): number =>
      own.reduce(
        (nearest, unit) =>
          unit.id === herald.id ? nearest : Math.min(nearest, gap(unit.at, at)),
        99,
      );
    /** The Move's score of `at`: its attacks, a Proclaim, the enemy near. */
    const scoreOn = (at: CoordV7): readonly number[] => {
      const { hits, key } = bestFrom(at);
      // A Proclaim with the attack left over is made from where the
      // attacks leave it: on its last victim's tile after a kill.
      const standsAt =
        [...hits].reverse().find((hit) => hit.advance !== null)?.advance ?? at;
      const proclaim =
        hits.length < left &&
        proclaimable.some(
          (city) => gap(city.at, standsAt) <= CULT_PROCLAIM_RANGE_V7,
        );
      return [
        key[0] ?? 0,
        key[1] ?? 0,
        hits.length + Number(proclaim),
        key[3] ?? 0,
        Number(facts.enemyGap(at) < ownGap(at)),
      ];
    };
    if (fresh) {
      const here = scoreOn(herald.at);
      let best: MoveV7 | undefined;
      let bestKey: readonly number[] = here;
      for (const move of facts.movesByUnit.get(herald.id) ?? []) {
        const end = move.path.at(-1);
        if (
          end === undefined ||
          !facts.landTile(end) ||
          !facts.daemonMayEnd(herald.id, end)
        )
          continue;
        const key = scoreOn(end);
        // A Move is made for something to do there, and only for more.
        if ((key[2] ?? 0) === 0 || !better(key, bestKey)) continue;
        best = move;
        bestKey = key;
      }
      if (best !== undefined) {
        steps.push({
          command: best,
          priority: CULT_HERALD_PRIORITY_V7,
          value: bestKey[0] ?? 0,
          reason: "HERALD_MOVE",
        });
        continue;
      }
    }
    // Its attacks from where it stands: the plan's first when the best
    // kills; else no kill at all (each is one the plan may not make).
    const { hits } = bestFrom(herald.at);
    const lead = hits[0];
    const command =
      lead === undefined || !hits.some((hit) => hit.kills > 0)
        ? undefined
        : offered.find((item) => item.targetUnitId === lead.target.id);
    for (const item of offered) {
      if (item === command) continue;
      const kills =
        queryCombatPreviewV7(view, herald.id, item.targetUnitId)
          ?.defenderDies === true;
      if (command !== undefined || kills)
        vetoes.add(attackKey(herald.id, item.targetUnitId));
    }
    if (command !== undefined)
      steps.push({
        command,
        priority: CULT_HERALD_PRIORITY_V7,
        value: hits.reduce((sum, hit) => sum + hit.kills, 0),
        reason: "HERALD_ATTACK",
      });
  }

  // ------------------------------------------------------------- Proclaim
  // Section 15.4: the Herald's second attack when no second kill is on
  // offer and a hostile city within 3 could train next turn; and its only
  // deed when it has nobody to attack at all.
  {
    const heralds = new Set<UnitId>();
    for (const command of proclaims) {
      if (heralds.has(command.unitId)) continue;
      heralds.add(command.unitId);
      const herald = unitsById.get(command.unitId);
      if (herald === undefined || herald.ownerId !== me || held.has(herald.id))
        continue;
      const second = herald.activation.attacksUsed > 0;
      // (A-R2, `pulp_wars-mch9.39`: an attack the plan vetoes is none.)
      const attacks = (attacksByUnit.get(herald.id) ?? []).filter((command) =>
        mayAttack(herald.id, command.targetUnitId),
      );
      if (
        second
          ? attacks.some(
              (command) =>
                queryCombatPreviewV7(view, herald.id, command.targetUnitId)
                  ?.defenderDies === true,
            )
          : attacks.length > 0
      )
        continue;
      // The city: the highest level (the most income and the best units),
      // then the nearest.
      let best: (typeof proclaims)[number] | undefined;
      let bestKey: readonly number[] = [];
      for (const option of proclaims) {
        if (option.unitId !== herald.id) continue;
        const city = proclaimable.find((item) => item.id === option.cityId);
        if (city === undefined) continue;
        const key = [city.level, -gap(city.at, herald.at), -city.id];
        if (best === undefined || better(key, bestKey)) {
          best = option;
          bestKey = key;
        }
      }
      if (
        best === undefined ||
        previewProclaimV7(view, best.unitId, best.cityId) === null
      )
        continue;
      steps.push({
        command: best,
        priority:
          second || herald.activation.moved
            ? CULT_HERALD_PRIORITY_V7
            : CULT_PROCLAIM_LAST_PRIORITY_V7,
        value: bestKey[0] ?? 0,
        reason: "PROCLAIM",
      });
    }
  }

  // ----------------------------------------------------------------- Boo!
  // Section 15.4: a Horror with two or more hostile living units around it
  // that jump, or one beside an enemy center whose garrison jumps while an
  // own capturer can step on; never with an own unit beside it (a moved
  // cultist is disrupted), and not in place of a kill.
  for (const command of boos) {
    const horror = unitsById.get(command.unitId);
    if (
      horror === undefined ||
      horror.ownerId !== me ||
      held.has(horror.id) ||
      killOnOffer(horror.id)
    )
      continue;
    const preview = previewBooV7(view, horror.id);
    if (
      preview === null ||
      preview.results.some((entry) => !facts.hostile(entry.ownerId))
    )
      continue;
    const jumps = preview.results.filter((entry) => entry.outcome === "JUMPS");
    const center = jumps.find((entry) =>
      view.cities.some(
        (city) =>
          sameTile(city.at, entry.from) &&
          !isNeutralOwnerV7(city.ownerId) &&
          facts.hostile(city.ownerId) &&
          own.some(
            (unit) =>
              unit.summoned === undefined &&
              !held.has(unit.id) &&
              !unit.activation.moved &&
              primaryReady(unit) &&
              hasAbility(unit, "CAPTURE") &&
              gap(unit.at, city.at) === 1,
          ),
      ),
    );
    if (jumps.length < 2 && center === undefined) continue;
    steps.push({
      command,
      priority: CULT_BOO_PRIORITY_V7,
      value: jumps.length + (center === undefined ? 0 : 10),
      reason: "BOO",
    });
  }

  // ------------------------------------------------- a Seizure's company
  const seizers = summoners.filter(
    (unit) =>
      hasAbility(unit, "SEIZE") && primaryReady(unit) && !held.has(unit.id),
  );
  const holders = own.filter(
    (unit) => cultRobedV7(view, unit) && !held.has(unit.id),
  );
  /** The tiles beside `at` the unit can take this turn (its own first). */
  const besideTiles = (unit: PublicUnitV7, at: CoordV7): readonly CoordV7[] => {
    if (gap(unit.at, at) === 1) return [unit.at];
    if (facts.onOwnCenter(unit)) return [];
    const tiles: CoordV7[] = [];
    for (const move of facts.movesByUnit.get(unit.id) ?? []) {
      const end = move.path.at(-1);
      if (end !== undefined && gap(end, at) === 1 && facts.landTile(end))
        tiles.push(end);
    }
    return tiles;
  };
  /**
   * A Summoner and a holder that can both stand beside `at` this turn (on
   * two tiles), the units of `except` aside: the company of a Seizure.
   */
  const companyAt = (
    at: CoordV7,
    except: readonly UnitId[],
  ):
    | {
        readonly summoner: PublicUnitV7;
        readonly stand: CoordV7;
        readonly holder: PublicUnitV7;
        readonly hold: CoordV7;
      }
    | undefined => {
    for (const summoner of seizers) {
      if (except.includes(summoner.id)) continue;
      const stand = besideTiles(summoner, at)[0];
      if (stand === undefined) continue;
      for (const holder of holders) {
        if (holder.id === summoner.id || except.includes(holder.id)) continue;
        const hold = besideTiles(holder, at).find(
          (tile) => !sameTile(tile, stand),
        );
        if (hold !== undefined) return { summoner, stand, holder, hold };
      }
    }
    return undefined;
  };
  /**
   * The Cult redesign's A-R2 (`pulp_wars-mch9.39`, section 12.3): the
   * beating the own units can give `target` this turn with the attacks
   * offered now, the units of `except`, the held units, and every Summoner
   * (it keeps its action for the Seizure) aside. A caster strikes only on
   * the terms of A-R1's "cultists do not brawl" (`cultCasterBrawlHeldV7` in
   * `src/ai/v7.ts`): every blow on a frog (`frogged`: the target is one, or
   * will be after the Ribbit), else one blow, after the others, that leaves
   * it broken with the Seizure to follow (or kills it).
   */
  const beatingOn = (
    target: PublicUnitV7,
    frogged: boolean,
    except: readonly UnitId[],
  ): number => {
    let plain = 0;
    let caster = 0;
    for (const [unitId, attacks] of attacksByUnit) {
      const unit = unitsById.get(unitId);
      if (
        unit === undefined ||
        except.includes(unitId) ||
        held.has(unitId) ||
        hasAbility(unit, "SEIZE") ||
        !attacks.some((attack) => attack.targetUnitId === target.id)
      )
        continue;
      const damage =
        queryCombatPreviewV7(view, unitId, target.id)?.damageToDefender ?? 0;
      if (!frogged && cultCasterV7(view, unit))
        caster = Math.max(caster, damage);
      else plain += damage;
    }
    return target.hp - plain - caster <= SEIZE_BROKEN_HP_V7
      ? plain + caster
      : plain;
  };
  /**
   * The Summoners a Seizure this turn may need (A-R2, section 12.3: the
   * Summoner's Tentacle is ordered against Seizure set-ups): for each
   * visible hostile land unit that can be Seized now, or that the beating
   * on offer leaves broken (a frog at half its Hit Points), the Summoner of
   * a company that can stand beside it. None of them calls a Tentacle.
   */
  const seizing = new Set<UnitId>();
  for (const target of enemies.filter(
    // (A Seizure takes only a land-form victim.)
    (unit) => unit.form === "LAND" && !isNeutralOwnerV7(unit.ownerId),
  )) {
    const frogged = frogs.has(target.id);
    const seizable = (hp: number): boolean =>
      hp <= SEIZE_BROKEN_HP_V7 || (frogged && hp * 2 <= target.maxHp);
    if (
      !seizable(target.hp) &&
      !seizable(target.hp - beatingOn(target, frogged, []))
    )
      continue;
    const company = companyAt(target.at, []);
    if (company !== undefined) seizing.add(company.summoner.id);
  }

  // --------------------------------------------------------------- Ribbit
  // Section 15.4: first the enemy that can hit an own channeller or chanter
  // next turn (any hit breaks a strand), then the one a Seizure can follow
  // this turn, then the strongest melee unit in reach. Not in place of a
  // shot that kills.
  {
    const circle = own.filter(
      (unit) =>
        facts.channellers.has(unit.id) ||
        cult.rituals.some(
          (ritual) =>
            ritual.playerId === me &&
            (ritual.leaderUnitId === unit.id ||
              ritual.chanterUnitIds.includes(unit.id)),
        ),
    );
    const blocked = new Map<UnitId, boolean>();
    let best: (typeof ribbits)[number] | undefined;
    let bestKey: readonly number[] = [];
    let bestReason: CultRitualReasonV7 = "RIBBIT";
    for (const command of ribbits) {
      const hexer = unitsById.get(command.unitId);
      const target = unitsById.get(command.targetUnitId);
      if (
        hexer === undefined ||
        target === undefined ||
        hexer.ownerId !== me ||
        held.has(hexer.id) ||
        !facts.hostile(target.ownerId)
      )
        continue;
      let kills = blocked.get(hexer.id);
      if (kills === undefined) {
        kills = killOnOffer(hexer.id);
        blocked.set(hexer.id, kills);
      }
      if (kills) continue;
      let rank = 0;
      let detail = 0;
      let reason: CultRitualReasonV7 = "RIBBIT";
      const guarded = circle.filter((unit) =>
        facts.reach(target.id, unit.at),
      ).length;
      if (guarded > 0 && hasAbility(target, "ATTACK")) {
        rank = 3;
        detail = guarded;
        reason = "RIBBIT_GUARD";
      } else {
        const half = target.hp * 2 <= target.maxHp;
        const company =
          target.form === "LAND" && target.hp > 5
            ? companyAt(target.at, [hexer.id])
            : undefined;
        if (company !== undefined) {
          // The beating that brings it to half its Hit Points: the attacks
          // offered on it now (a frog is softer, so this is the least). A-R2
          // (`pulp_wars-mch9.39`): the blows the seat makes, read as A-R1's
          // casters strike (`beatingOn`; it will be a frog, so every
          // caster's blow), and no Summoner's.
          const beating = half
            ? 0
            : beatingOn(target, true, [hexer.id, company.summoner.id]);
          if (half || (target.hp - beating) * 2 <= target.maxHp) {
            const projected = facts.moved([
              { unit: company.summoner, at: company.stand },
              { unit: company.holder, at: company.hold },
            ]);
            const seizure = half
              ? previewSeizeV7(
                  {
                    ...projected,
                    cult: {
                      ...projected.cult,
                      frogs: [...projected.cult.frogs, target.id].sort(
                        (left, right) => left - right,
                      ),
                    },
                  },
                  company.summoner.id,
                  target.id,
                )
              : null;
            if (!half || seizure !== null) {
              rank = 2;
              detail = valueOf(target);
              reason = "RIBBIT_SEIZE";
            }
          }
        }
        if (rank === 0 && melee(target)) {
          rank = 1;
          detail = valueOf(target);
        }
      }
      if (rank === 0) continue;
      const key = [rank, detail, target.hp, -target.id, -hexer.id];
      if (best === undefined || better(key, bestKey)) {
        best = command;
        bestKey = key;
        bestReason = reason;
      }
    }
    if (
      best !== undefined &&
      previewRibbitV7(view, best.unitId, best.targetUnitId) !== null
    )
      steps.push({
        command: best,
        priority: CULT_RIBBIT_PRIORITY_V7,
        value: bestKey[0] ?? 0,
        reason: bestReason,
      });
  }

  // ----------------------------------------------------------- Switcheroo
  // Section 15.4: pull a broken enemy next to a Summoner and a holder; else
  // drop an enemy siege or ranged unit beside two own melee units. Only an
  // enemy is swapped, so never an own channeller; and never where the
  // visible enemy kills the Familiar on its new tile.
  {
    let best: (typeof swaps)[number] | undefined;
    let bestKey: readonly number[] = [];
    let bestReason: CultRitualReasonV7 = "SWITCHEROO";
    for (const command of swaps) {
      const familiar = unitsById.get(command.unitId);
      const target = unitsById.get(command.targetUnitId);
      if (
        familiar === undefined ||
        target === undefined ||
        familiar.ownerId !== me ||
        held.has(familiar.id) ||
        isNeutralOwnerV7(target.ownerId) ||
        !facts.hostile(target.ownerId)
      )
        continue;
      const broken =
        target.hp <= 5 ||
        (frogs.has(target.id) && target.hp * 2 <= target.maxHp);
      let rank = 0;
      let reason: CultRitualReasonV7 = "SWITCHEROO";
      if (broken) {
        // Not one a Seizure reaches where it stands (the plan makes that
        // Seizure without the swap).
        const there = companyAt(target.at, [familiar.id]);
        const here = companyAt(familiar.at, [familiar.id]);
        // A-R2 (`pulp_wars-mch9.39`): the swap reaches 4 tiles since the
        // Cult redesign, so this one too is never made where the visible
        // enemy kills the Familiar on its new tile (as the drop below).
        if (
          there === undefined &&
          here !== undefined &&
          facts.danger(familiar, target.at) < familiar.hp
        ) {
          const projected = facts.moved([
            { unit: familiar, at: target.at },
            { unit: target, at: familiar.at },
            { unit: here.summoner, at: here.stand },
            { unit: here.holder, at: here.hold },
          ]);
          if (previewSeizeV7(projected, here.summoner.id, target.id) !== null) {
            rank = 2;
            reason = "SWITCHEROO_SEIZE";
          }
        }
      }
      if (rank === 0 && shooter(target)) {
        // (The Cult redesign's A-R1, `pulp_wars-mch9.38`: a caster makes no
        // blow that does not kill, so the strikers are the summons, the
        // Familiar, the Idol Bearer, and the Thing.)
        const strikers = (at: CoordV7): number =>
          own.filter(
            (unit) =>
              unit.id !== familiar.id &&
              !held.has(unit.id) &&
              melee(unit) &&
              !cultCasterV7(view, unit) &&
              primaryReady(unit) &&
              gap(unit.at, at) === 1,
          ).length;
        if (
          strikers(familiar.at) >= 2 &&
          strikers(target.at) < 2 &&
          facts.danger(familiar, target.at) < familiar.hp
        )
          rank = 1;
      }
      if (rank === 0) continue;
      const key = [rank, valueOf(target), -target.hp, -target.id, -familiar.id];
      if (best === undefined || better(key, bestKey)) {
        best = command;
        bestKey = key;
        bestReason = reason;
      }
    }
    if (
      best !== undefined &&
      previewSwitcherooV7(view, best.unitId, best.targetUnitId) !== null
    )
      steps.push({
        command: best,
        priority: CULT_SWITCHEROO_PRIORITY_V7,
        value: bestKey[0] ?? 0,
        reason: bestReason,
      });
  }

  // ------------------------------------------------------------- Tentacle
  // Section 15.4: the tile beside the most enemy value whose weakest
  // neighbour is an enemy, with no own unit within 1; enemy siege and
  // ranged units first. Not in place of a kill. (The Summoner's since the
  // Cult redesign: A-R1, `pulp_wars-mch9.38`, section 12.3, the channel
  // plan takes this step back from a Summoner with a Summon, Seizure, or
  // Sacrifice step, and does not take a Summoner with a Tentacle to make
  // as a channeller for the trickle.) A-R2 (`pulp_wars-mch9.39`): nor by
  // a Summoner a Seizure may need this turn (`seizing`: the blows that
  // break its victim come below this step).
  {
    const callers = new Map<UnitId, boolean>();
    let best: (typeof tentacles)[number] | undefined;
    let bestKey: readonly number[] = [];
    for (const command of tentacles) {
      const caller = unitsById.get(command.unitId);
      if (
        caller === undefined ||
        caller.ownerId !== me ||
        held.has(caller.id) ||
        // A-R2 (`pulp_wars-mch9.39`): not a Summoner a Seizure may need.
        seizing.has(caller.id)
      )
        continue;
      let kills = callers.get(caller.id);
      if (kills === undefined) {
        kills = killOnOffer(caller.id);
        callers.set(caller.id, kills);
      }
      if (kills) continue;
      const around = view.units.filter(
        (unit) =>
          unit.hp > 0 &&
          !isNeutralOwnerV7(unit.ownerId) &&
          gap(unit.at, command.at) === 1,
      );
      if (
        around.length === 0 ||
        around.some((unit) => !facts.hostile(unit.ownerId))
      )
        continue;
      const slapped = tentacleSlapTargetV7(view.units, command.at);
      if (slapped === null || !facts.hostile(slapped.ownerId)) continue;
      const key = [
        Number(shooter(slapped)),
        around.reduce((sum, unit) => sum + valueOf(unit), 0),
        -slapped.hp,
        -command.at.y,
        -command.at.x,
        -caller.id,
      ];
      if (best === undefined || better(key, bestKey)) {
        best = command;
        bestKey = key;
      }
    }
    if (
      best !== undefined &&
      previewTentacleV7(view, best.unitId, best.at)?.slapTargetUnitId != null
    )
      steps.push({
        command: best,
        priority: CULT_TENTACLE_PRIORITY_V7,
        value: bestKey[1] ?? 0,
        reason: "TENTACLE",
      });
  }

  // ---------------------------------------------- Star-fall and the chant
  // Section 15.4 and the Cult redesign's A-R2 (`pulp_wars-mch9.39`,
  // RULESET_7_CULT_REDESIGN.md section 12.3). A Stargazer that has not
  // moved begins a star alone on the tile with the most enemy value on its
  // nine tiles (fortified units, siege units, and Eggs first), with no own
  // or friendly unit there, when the mark holds two hostile units or one
  // that stays. The value is counted at the damage the star will have with
  // the chanters it can expect this turn. Then each free cultist beside the
  // Stargazer, or that can step beside it to a tile no visible enemy can
  // attack, joins while the join turns one more hostile unit into a kill or
  // the mark holds three hostile units or more, and never when the join
  // kills a unit of the seat or of a friend.
  const ritualUnits = new Set<UnitId>();
  for (const ritual of cult.rituals)
    if (ritual.playerId === me) {
      if (ritual.leaderUnitId !== null) ritualUnits.add(ritual.leaderUnitId);
      for (const unitId of ritual.chanterUnitIds) ritualUnits.add(unitId);
    }
  const marks = cult.rituals.flatMap((ritual) =>
    ritual.playerId === me && ritual.at !== null
      ? [{ at: ritual.at, reach: ritual.kind === "STARFALL" ? 1 : 0 }]
      : [],
  );
  const underMark = (at: CoordV7): boolean =>
    marks.some((mark) => gap(mark.at, at) <= mark.reach);
  const foeUnit = (unit: PublicUnitV7): boolean =>
    !isNeutralOwnerV7(unit.ownerId) && facts.hostile(unit.ownerId);
  const friendUnit = (unit: PublicUnitV7): boolean =>
    !isNeutralOwnerV7(unit.ownerId) && !facts.hostile(unit.ownerId);
  /**
   * The hits of a star of `damage` on `mark` as the board stands: the
   * public forecast's (`previewBeginRitualV7`, `previewJoinChantV7`) at any
   * number of chanters (fixed damage; Armoured, Plated, and Shields apply).
   */
  const starHits = (
    mark: CoordV7,
    damage: number,
  ): readonly {
    readonly unit: PublicUnitV7;
    readonly dies: boolean;
    readonly damage: number;
  }[] =>
    view.units
      .filter((unit) => unit.hp > 0 && gap(unit.at, mark) <= 1)
      .map((unit) => {
        const hit = fixedSignatureHitV7(
          view,
          unit,
          shieldOfV7(view.shields, unit.id),
          damage,
        );
        return { unit, dies: hit.dies, damage: hit.damage };
      });
  type JoinerV7 = {
    readonly unit: PublicUnitV7;
    readonly at: CoordV7;
    readonly move: MoveV7 | null;
  };
  /**
   * Who may join a star of `gazer` on `mark`, in the order they are asked:
   * every one beside the Stargazer first (it needs no Move), then each that
   * can step beside it this turn to a tile no visible enemy can attack and
   * under no own mark; the cheapest first, then the nearest. Decided here:
   * a free robed cultist with Join the chant that the plan has not held,
   * that has not acted, is no frog, and is in no ritual, but never a
   * Summoner (its action is kept for its Summon, Seizure, Sacrifice, and
   * Tentacle); and nobody leaves an own center to come.
   */
  const joinersOf = (
    gazer: PublicUnitV7,
    mark: CoordV7,
  ): readonly JoinerV7[] => {
    const pool = own
      .filter(
        (unit) =>
          unit.id !== gazer.id &&
          cultRobedV7(view, unit) &&
          hasAbility(unit, "JOIN_CHANT") &&
          !hasAbility(unit, "SUMMON") &&
          primaryReady(unit) &&
          !frogs.has(unit.id) &&
          !held.has(unit.id) &&
          !ritualUnits.has(unit.id),
      )
      .sort(
        (left, right) =>
          valueOf(left) - valueOf(right) ||
          gap(left.at, gazer.at) - gap(right.at, gazer.at) ||
          left.id - right.id,
      );
    const beside: JoinerV7[] = [];
    const comers: JoinerV7[] = [];
    const taken = new Set<string>();
    for (const unit of pool) {
      if (gap(unit.at, gazer.at) === 1) {
        beside.push({ unit, at: unit.at, move: null });
        continue;
      }
      if (facts.onOwnCenter(unit)) continue;
      let best: MoveV7 | undefined;
      let bestEnd: CoordV7 | undefined;
      let bestKey: readonly number[] = [];
      for (const move of facts.movesByUnit.get(unit.id) ?? []) {
        const end = move.path.at(-1);
        if (
          end === undefined ||
          gap(end, gazer.at) !== 1 ||
          gap(end, mark) <= 1 ||
          underMark(end) ||
          !facts.landTile(end) ||
          facts.threatened(end) ||
          taken.has(tileKey(end))
        )
          continue;
        const key = [facts.enemyGap(end), -move.path.length, -end.y, -end.x];
        if (best === undefined || better(key, bestKey)) {
          best = move;
          bestEnd = end;
          bestKey = key;
        }
      }
      if (best === undefined || bestEnd === undefined) continue;
      taken.add(tileKey(bestEnd));
      comers.push({ unit, at: bestEnd, move: best });
    }
    return [...beside, ...comers];
  };
  /**
   * The hostile units the join of `joiner` turns into kills on a star of
   * `chanters` on `mark` (with the `spare` joins that can still follow it
   * this turn: decided here, two joins that kill together are each worth
   * it), or null when the join is not made: it kills a unit of the seat or
   * of a friend; or it turns no hostile unit into a kill and the mark holds
   * fewer than `CULT_STARFALL_CROWD_V7` hostile units (or none of them
   * still stands under the star as it is). Decided here: a joiner a visible
   * enemy can attack where it chants (it cannot move after the join, and
   * any hit takes it out of the chant) joins only for a kill worth at least
   * itself, and never where the visible enemy kills it.
   */
  const joinWorth = (
    mark: CoordV7,
    chanters: number,
    joiner: JoinerV7,
    spare: number,
  ): number | null => {
    const before = starHits(mark, starfallDamageV7(chanters));
    let killed: readonly PublicUnitV7[] = [];
    for (let more = 1; more <= 1 + spare; more += 1) {
      const after = starHits(mark, starfallDamageV7(chanters + more));
      const newly = after
        .filter((entry, index) => entry.dies && before[index]?.dies !== true)
        .map((entry) => entry.unit);
      // A join never kills a unit of the seat or of a friend; nor do the
      // joins after it that it counts on.
      if (newly.some(friendUnit)) {
        if (more === 1) return null;
        break;
      }
      killed = newly.filter(foeUnit);
      if (killed.length > 0) break;
    }
    const crowd =
      before.filter((entry) => foeUnit(entry.unit)).length >=
        CULT_STARFALL_CROWD_V7 &&
      before.some((entry) => foeUnit(entry.unit) && !entry.dies);
    if (killed.length === 0 && !crowd) return null;
    if (
      facts.threatened(joiner.at) &&
      (killed.reduce((sum, unit) => sum + valueOf(unit), 0) <
        valueOf(joiner.unit) ||
        facts.danger(joiner.unit, joiner.at) >= joiner.unit.hp)
    )
      return null;
    return killed.length;
  };
  /**
   * The joins that are made on a star of `gazer` on `mark` from `chanters`,
   * in order: each joiner asked in turn, counting on the unexposed joiners
   * after it.
   */
  const joinsOn = (
    gazer: PublicUnitV7,
    mark: CoordV7,
    chanters: number,
  ): readonly JoinerV7[] => {
    const joiners = joinersOf(gazer, mark);
    const made: JoinerV7[] = [];
    joiners.forEach((joiner, index) => {
      const spare = joiners
        .slice(index + 1)
        .filter((next) => !facts.threatened(next.at)).length;
      if (joinWorth(mark, chanters + made.length, joiner, spare) !== null)
        made.push(joiner);
    });
    return made;
  };
  if (!facts.pending) {
    const tileAt = (at: CoordV7) =>
      view.board.tiles[at.y * view.board.width + at.x];
    const centers = new Set(view.cities.map((city) => tileKey(city.at)));
    for (const gazer of own) {
      if (
        !hasAbility(gazer, "STARFALL") ||
        !primaryReady(gazer) ||
        gazer.activation.moved ||
        held.has(gazer.id) ||
        frogs.has(gazer.id)
      )
        continue;
      let mark: CoordV7 | undefined;
      let markKey: readonly number[] = [];
      for (
        let y = gazer.at.y - CULT_STARFALL_MAXIMUM_V7;
        y <= gazer.at.y + CULT_STARFALL_MAXIMUM_V7;
        y += 1
      )
        for (
          let x = gazer.at.x - CULT_STARFALL_MAXIMUM_V7;
          x <= gazer.at.x + CULT_STARFALL_MAXIMUM_V7;
          x += 1
        ) {
          const at = { x, y };
          if (
            x < 0 ||
            y < 0 ||
            x >= view.board.width ||
            y >= view.board.height ||
            gap(at, gazer.at) < CULT_STARFALL_MINIMUM_V7 ||
            tileAt(at)?.explored !== true
          )
            continue;
          const under = view.units.filter(
            (unit) =>
              unit.hp > 0 &&
              gap(unit.at, at) <= 1 &&
              !isNeutralOwnerV7(unit.ownerId),
          );
          if (under.length === 0 || under.some(friendUnit)) continue;
          /** A unit that is likely to be there still next turn. */
          const stays = (unit: PublicUnitV7): boolean => {
            const tile = tileAt(unit.at);
            return (
              unit.form === "EGG" ||
              ruleOf(unit).tacticalRole === "SIEGE" ||
              (tile?.explored === true &&
                (tile.fieldDefense || (tile.fortificationLevel ?? 0) > 0)) ||
              centers.has(tileKey(unit.at))
            );
          };
          // One unit in the open walks away: two, or one that stays.
          if (under.length < 2 && !under.some(stays)) continue;
          // The worth at the damage of the chanters it can expect (A-R2).
          const chanters = joinsOn(gazer, at, 0).length;
          let score = 0;
          for (const entry of starHits(at, starfallDamageV7(chanters))) {
            if (!foeUnit(entry.unit)) continue;
            const worth = valueOf(entry.unit) * (stays(entry.unit) ? 3 : 2);
            score += entry.dies
              ? worth * 20
              : Math.floor((worth * 10 * entry.damage) / entry.unit.maxHp);
          }
          const key = [score, -gap(at, gazer.at), -y, -x];
          if (mark === undefined || better(key, markKey)) {
            mark = at;
            markKey = key;
          }
        }
      if (mark === undefined) continue;
      const target = mark;
      const command = begins.find(
        (item) =>
          item.ritual === "STARFALL" &&
          item.unitId === gazer.id &&
          sameTile(item.at, target),
      );
      if (command === undefined) continue;
      const preview = previewBeginRitualV7(view, gazer.id, "STARFALL", target);
      if (
        preview?.starfall == null ||
        preview.starfall.results.some(
          (entry) =>
            !isNeutralOwnerV7(entry.ownerId) && !facts.hostile(entry.ownerId),
        )
      )
        continue;
      held.add(gazer.id);
      steps.push({
        command,
        priority: CULT_STARFALL_PRIORITY_V7,
        value: markKey[0] ?? 0,
        reason: "STARFALL",
      });
    }
  }

  // Join the chant of an own pending star: one join (or the step of a
  // cultist that comes to join) a decision, so the next reads the star
  // after it. The join is checked against the engine's public preview.
  joining: for (const ritual of cult.rituals) {
    if (
      ritual.kind !== "STARFALL" ||
      ritual.playerId !== me ||
      ritual.at === null ||
      ritual.leaderUnitId === null
    )
      continue;
    const gazer = unitsById.get(ritual.leaderUnitId);
    if (gazer === undefined) continue;
    const mark = ritual.at;
    for (const joiner of joinsOn(gazer, mark, ritual.chanters)) {
      if (joiner.move !== null) {
        held.add(joiner.unit.id);
        steps.push({
          command: joiner.move,
          priority: CULT_JOIN_CHANT_PRIORITY_V7,
          value: 0,
          reason: "STARFALL_COME",
        });
        break joining;
      }
      const join = joins.find(
        (command) =>
          command.unitId === joiner.unit.id &&
          command.leaderUnitId === gazer.id,
      );
      if (join === undefined) continue;
      const preview = previewJoinChantV7(view, join.unitId, join.leaderUnitId);
      if (
        preview === null ||
        preview.after === null ||
        preview.newlyKills.some((unitId) => {
          const unit = unitsById.get(unitId);
          return unit === undefined || friendUnit(unit);
        })
      )
        continue;
      held.add(joiner.unit.id);
      steps.push({
        command: join,
        priority: CULT_JOIN_CHANT_PRIORITY_V7,
        value: preview.newlyKills.length,
        reason: "STARFALL_JOIN",
      });
      break joining;
    }
  }

  // ------------------------------------------------------------ Pamphlets
  // Section 15.4: the village hunt sends Initiates first. An Initiate that
  // can end a Move on a neutral village does (it captures it this turn, the
  // ordinary Capture), unless the visible enemy kills it there. Not an
  // Initiate with a Monster near: the ordinary play's Monster rules decide.
  {
    const monsters = view.monsters.flatMap((entry) => {
      const monster = unitsById.get(entry.unitId);
      return monster === undefined ? [] : [monster.at];
    });
    let best: MoveV7 | undefined;
    let bestKey: readonly number[] = [];
    for (const unit of own) {
      if (
        held.has(unit.id) ||
        unit.activation.moved ||
        !primaryReady(unit) ||
        frogs.has(unit.id) ||
        monsters.some((where) => gap(where, unit.at) <= CULT_MONSTER_WATCH_V7)
      )
        continue;
      for (const move of facts.movesByUnit.get(unit.id) ?? []) {
        const end = move.path.at(-1);
        if (end === undefined) continue;
        const tile = view.board.tiles[end.y * view.board.width + end.x];
        if (
          tile?.explored !== true ||
          !pamphletsApplyV7(view, unit, tile.site) ||
          view.cities.some((city) => sameTile(city.at, end)) ||
          facts.danger(unit, end) >= unit.hp
        )
          continue;
        const key = [-move.path.length, -unit.id, -end.y, -end.x];
        if (best === undefined || better(key, bestKey)) {
          best = move;
          bestKey = key;
        }
      }
    }
    if (best !== undefined)
      steps.push({
        command: best,
        priority: CULT_PAMPHLETS_PRIORITY_V7,
        value: 0,
        reason: "PAMPHLETS",
      });
  }

  // ------------------------------------------- under an own ritual's mark
  // Section 15.4: own units never end a Move under an own star, nor on the
  // mark of an own Great Summoning (the unit there is consumed, or blocks).
  return {
    steps,
    saving,
    mayEnd: (at) => !underMark(at),
    mayAttack,
  };
}
