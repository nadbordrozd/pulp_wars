import type { PlayerId, UnitId } from "../engine/model/ids";
import { unitRoleRuleV7 } from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import {
  pamphletsApplyV7,
  tentacleSlapTargetV7,
} from "../engine/v7/cult-hexes";
import {
  previewBeginRitualV7,
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
import { cultRobedV7 } from "./v7-cult";

/**
 * The Cult seat's rituals and tricks (`pulp_wars-mch9.11`, bead A3 of
 * docs/product/RULESET_7_CULTISTS.md sections 15.3 and 15.4; as built in
 * section 15.8): the Great Summoning and the Favour saved for it, Star-fall,
 * the Herald's two attacks and Proclaim, Boo!, Ribbit, Switcheroo, the
 * Tentacle, and Pamphlets. (Pick Me! retired with the Chosen: the Cult
 * redesign, `pulp_wars-mch9.31`; the Tentacle step reads every offered
 * `TENTACLE`, the Summoner's since then.)
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

/** Favour the Great Summoning costs (section 7.2). */
export const CULT_SUMMONING_FAVOUR_V7 = 20;
/** Favour a Horror costs (section 6.1). */
export const CULT_HORROR_COST_V7 = 5;
/**
 * The robed cultists the seat keeps for a Herald beyond every other
 * daemon's Control + 1: its Control and one to spare (section 15.3).
 */
export const CULT_HERALD_BODIES_V7 = 4;
/**
 * The seat saves its Favour for the Great Summoning from this much on (with
 * The Stars Are Right and the bodies to hold a Herald): half the price.
 * Below it a Horror is summoned as before.
 */
export const CULT_SAVE_FAVOUR_V7 = 10;
/** The chanters the Great Summoning needs beside its leader (section 7.2). */
export const CULT_SUMMONING_CHANTERS_V7 = 3;
/** Star-fall reaches 2 to 4 tiles (section 7.4). */
export const CULT_STARFALL_MINIMUM_V7 = 2;
export const CULT_STARFALL_MAXIMUM_V7 = 4;
/** A star deals this and 1 for each chanter (section 7.4). */
export const CULT_STARFALL_DAMAGE_V7 = 5;
/** Proclaim reaches a city within this many tiles (section 8.6). */
export const CULT_PROCLAIM_RANGE_V7 = 3;
/** The value of a unit that has no cost (a giant, a daemon, an Egg). */
export const CULT_PRICELESS_VALUE_V7 = 12;

/** The Herald's planned Move, its Proclaim, and a Horror's Boo!. */
export const CULT_HERALD_PRIORITY_V7 = 3970;
export const CULT_BOO_PRIORITY_V7 = 3950;
/** Between Behold! (1920) and Summon (1910): the circle before a Horror. */
export const CULT_SUMMONING_PRIORITY_V7 = 1915;
/** Below the Offering (1890), above every ordinary command. */
export const CULT_RIBBIT_PRIORITY_V7 = 1880;
export const CULT_SWITCHEROO_PRIORITY_V7 = 1875;
export const CULT_TENTACLE_PRIORITY_V7 = 1870;
export const CULT_STARFALL_PRIORITY_V7 = 1860;
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

export type CultRitualReasonV7 =
  | "GREAT_SUMMONING"
  | "GATHER"
  | "STARFALL"
  | "STARFALL_CHANTER"
  | "HERALD_MOVE"
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
  /** A visible enemy can attack a unit on `at` in its next turn. */
  readonly threatened: (at: CoordV7) => boolean;
  /** The visible unit `unitId` can attack a unit on `at` in its next turn. */
  readonly reach: (unitId: UnitId, at: CoordV7) => boolean;
  /** The view with each of these units on its tile. */
  readonly moved: (
    moves: readonly { readonly unit: PublicUnitV7; readonly at: CoordV7 }[],
  ) => PlayerViewV7;
  /** The own living units in land form. */
  readonly own: readonly PublicUnitV7[];
  /** The visible hostile units of players (no Egg). */
  readonly enemies: readonly PublicUnitV7[];
  /** The units the plan holds; this part adds its own. */
  readonly held: Set<UnitId>;
  readonly movesByUnit: ReadonlyMap<UnitId, readonly MoveV7[]>;
  /** The own cultists that hold a strand now. */
  readonly channellers: ReadonlySet<UnitId>;
  /** A channeller is still to be placed, or a bind is under way. */
  readonly pending: boolean;
  /** The seat's robed cultists, and every bound daemon's Control + 1. */
  readonly bodies: number;
  readonly wantedAll: number;
  readonly favour: number;
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
  /** Favour is kept for the Great Summoning: no Horror below 25. */
  readonly saving: boolean;
  /** No own unit ends a Move here: under an own ritual's mark. */
  readonly mayEnd: (at: CoordV7) => boolean;
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
  const proclaims: Extract<CommandV7, { kind: "PROCLAIM" }>[] = [];
  const boos: Extract<CommandV7, { kind: "BEHOLD" | "BOO" }>[] = [];
  const ribbits: Extract<CommandV7, { kind: "RIBBIT" | "SWITCHEROO" }>[] = [];
  const swaps: Extract<CommandV7, { kind: "RIBBIT" | "SWITCHEROO" }>[] = [];
  const tentacles: Extract<CommandV7, { kind: "TENTACLE" }>[] = [];
  for (const command of commands) {
    if (command.kind === "ATTACK") {
      const list = attacksByUnit.get(command.unitId);
      if (list === undefined) attacksByUnit.set(command.unitId, [command]);
      else list.push(command);
    } else if (command.kind === "BEGIN_RITUAL") begins.push(command);
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
  // Section 15.3: only with 20 Favour, The Stars Are Right, a Summoner with
  // three chanters, nobody of the circle and no mark in a visible enemy's
  // reach, and four robed cultists to spare for the Herald.
  if (saving && facts.favour >= CULT_SUMMONING_FAVOUR_V7 && !facts.pending) {
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
  // which its two attacks kill the most, then are worth the most, then
  // where a city can be Proclaimed with an attack that is left over, then
  // where a visible enemy is nearer to it than any own unit.
  const cowed = new Set(cult.cowed.map((entry) => entry.cityId));
  const proclaimable = view.cities.filter(
    (city) =>
      !isNeutralOwnerV7(city.ownerId) &&
      facts.hostile(city.ownerId) &&
      !cowed.has(city.id) &&
      // A center an own unit stands on is being taken already.
      !own.some((unit) => sameTile(unit.at, city.at)),
  );
  for (const daemon of facts.daemons) {
    const herald = daemon.unit;
    if (
      !daemon.herald ||
      !daemon.holdable ||
      herald.activation.moved ||
      herald.activation.attacksUsed > 0 ||
      !primaryReady(herald)
    )
      continue;
    const reachOf = ruleOf(herald).range;
    const ownGap = (at: CoordV7): number =>
      own.reduce(
        (nearest, unit) =>
          unit.id === herald.id ? nearest : Math.min(nearest, gap(unit.at, at)),
        99,
      );
    /** What the Herald's two attacks do from `at`. */
    const scoreOn = (at: CoordV7): readonly number[] => {
      const targets = enemies.filter(
        (unit) => unit.form === "LAND" && gap(unit.at, at) <= reachOf,
      );
      const projected =
        targets.length === 0 || sameTile(at, herald.at)
          ? view
          : facts.moved([{ unit: herald, at }]);
      const hits = targets
        .flatMap((target) => {
          const preview = queryCombatPreviewV7(projected, herald.id, target.id);
          return preview === null
            ? []
            : [
                {
                  kills: Number(preview.defenderDies),
                  value: valueOf(target),
                  damage: preview.damageToDefender,
                },
              ];
        })
        .sort(
          (left, right) =>
            right.kills - left.kills ||
            right.value - left.value ||
            right.damage - left.damage,
        )
        .slice(0, 2);
      const kills = hits.reduce((sum, hit) => sum + hit.kills, 0);
      const proclaim =
        hits.length < 2 &&
        proclaimable.some((city) => gap(city.at, at) <= CULT_PROCLAIM_RANGE_V7);
      return [
        kills,
        hits.reduce((sum, hit) => sum + hit.kills * hit.value, 0),
        hits.length + Number(proclaim),
        hits.reduce((sum, hit) => sum + hit.damage, 0),
        Number(facts.enemyGap(at) < ownGap(at)),
      ];
    };
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
    if (best !== undefined)
      steps.push({
        command: best,
        priority: CULT_HERALD_PRIORITY_V7,
        value: bestKey[0] ?? 0,
        reason: "HERALD_MOVE",
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
      const attacks = attacksByUnit.get(herald.id) ?? [];
      if (second ? killOnOffer(herald.id) : attacks.length > 0) continue;
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
          // offered on it now (a frog is softer, so this is the least).
          let beating = 0;
          if (!half)
            for (const [unitId, attacks] of attacksByUnit) {
              if (
                unitId === hexer.id ||
                unitId === company.summoner.id ||
                held.has(unitId) ||
                !attacks.some((attack) => attack.targetUnitId === target.id)
              )
                continue;
              beating +=
                queryCombatPreviewV7(view, unitId, target.id)
                  ?.damageToDefender ?? 0;
            }
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
        if (there === undefined && here !== undefined) {
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
        const strikers = (at: CoordV7): number =>
          own.filter(
            (unit) =>
              unit.id !== familiar.id &&
              !held.has(unit.id) &&
              melee(unit) &&
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
  // ranged units first. Not in place of a kill.
  {
    const callers = new Map<UnitId, boolean>();
    let best: (typeof tentacles)[number] | undefined;
    let bestKey: readonly number[] = [];
    for (const command of tentacles) {
      const caller = unitsById.get(command.unitId);
      if (caller === undefined || caller.ownerId !== me || held.has(caller.id))
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

  // ------------------------------------------------------------ Star-fall
  // Section 15.4: the tile with the most enemy value on its nine tiles,
  // preferring fortified units, siege units, and Eggs, with no own unit
  // there. A Stargazer that has not moved and has a mark worth a star
  // stays; with no chanter beside it, one cultist comes to it.
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
      const chanters = chantersOf(gazer);
      if (chanters.some((unit) => held.has(unit.id))) continue;
      const damage = CULT_STARFALL_DAMAGE_V7 + Math.max(1, chanters.length);
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
          let score = 0;
          let count = 0;
          let sure = false;
          let spared = true;
          for (const unit of view.units) {
            if (unit.hp <= 0 || gap(unit.at, at) > 1) continue;
            if (isNeutralOwnerV7(unit.ownerId)) continue;
            if (!facts.hostile(unit.ownerId)) {
              spared = false;
              break;
            }
            const tile = tileAt(unit.at);
            // A unit that is likely to be there still next turn.
            const stays =
              unit.form === "EGG" ||
              ruleOf(unit).tacticalRole === "SIEGE" ||
              (tile?.explored === true &&
                (tile.fieldDefense || (tile.fortificationLevel ?? 0) > 0)) ||
              centers.has(tileKey(unit.at));
            const worth = valueOf(unit) * (stays ? 3 : 2);
            score +=
              unit.hp <= damage
                ? worth * 20
                : Math.floor((worth * 10 * damage) / unit.maxHp);
            count += 1;
            sure ||= stays;
          }
          // One unit in the open walks away: two, or one that stays.
          if (!spared || count === 0 || (count < 2 && !sure)) continue;
          const key = [score, -gap(at, gazer.at), -y, -x];
          if (mark === undefined || better(key, markKey)) {
            mark = at;
            markKey = key;
          }
        }
      if (mark === undefined) continue;
      const target = mark;
      if (chanters.length === 0) {
        const comer = comersTo(gazer)[0];
        if (comer === undefined) continue;
        held.add(gazer.id);
        steps.push({
          command: comer.move,
          priority: CULT_STARFALL_PRIORITY_V7,
          value: markKey[0] ?? 0,
          reason: "STARFALL_CHANTER",
        });
        continue;
      }
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
  const marks = cult.rituals.flatMap((ritual) =>
    ritual.playerId === me && ritual.at !== null
      ? [{ at: ritual.at, reach: ritual.kind === "STARFALL" ? 1 : 0 }]
      : [],
  );
  return {
    steps,
    saving,
    mayEnd: (at) => marks.every((mark) => gap(mark.at, at) > mark.reach),
  };
}
