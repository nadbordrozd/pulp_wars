import type { PlayerId, UnitId } from "../model/ids";
import {
  factionTreeV7,
  neutralBreedOfV7,
  unitRoleRuleV7,
  type FactionRosterV7,
} from "../rules/ruleset-v7";
import { MONSTER_BOUNTY_V7, neutralBountyV7 } from "./curiosities";
import { arePlayersHostileV7 } from "./economy";
import type { DomainEventV7 } from "./events";
import type { CreditedDeathV7 } from "./explosions";
import {
  PERFECTION_ROUNDS_V7,
  isNeutralOwnerV7,
  type GameStateV7,
  type PlayerStateV7,
  type ScoreLedgerEntryV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "./types";
import { allOwnedUnitsV7 } from "./units";

/**
 * Score and modes (docs/product/RULESET_7_SCORE_AND_STARS.md section 3):
 * the battle score. Every weight is a whole number of points per counted
 * thing (section 3.1):
 *
 * ```text
 * positive = 2 × T + 10 × L + 8 × R + 40 × A + V + 2 × K
 * penalty  = X + floor(H / 5)
 * score    = positive − min(penalty, floor(positive / 2))
 * ```
 */
export const SCORE_TERRITORY_POINTS_V7 = 2;
export const SCORE_CITY_LEVEL_POINTS_V7 = 10;
export const SCORE_TECH_TIER_POINTS_V7 = 8;
export const SCORE_ACHIEVEMENT_POINTS_V7 = 40;
export const SCORE_ARMY_POINTS_PER_COIN_V7 = 1;
export const SCORE_KILL_POINTS_PER_COIN_V7 = 2;
export const SCORE_LOSS_POINTS_PER_COIN_V7 = 1;
/** Damage taken: one penalty point per this many Hit Points lost. */
export const SCORE_HP_PER_DAMAGE_POINT_V7 = 5;
/** Section 3.2: the value of a role with no printed cost (a reward giant). */
export const SCORE_GIANT_VALUE_V7 = 12;
/** Section 3.2: the neutral Giant Spider is worth its bounty. */
export const SCORE_MONSTER_VALUE_V7 = MONSTER_BOUNTY_V7;

/** The counted quantities of section 3.1 (every one a whole number). */
export interface ScoreCountsV7 {
  /** `T`: territory tiles. */
  readonly territoryTiles: number;
  /** `L`: the sum of the player's city levels. */
  readonly cityLevels: number;
  /** `R`: the sum of the tiers of the researched technologies. */
  readonly techTiers: number;
  /** `A`: achievements unlocked. */
  readonly achievements: number;
  /** `V`: the value of the units the player commands now. */
  readonly armyValue: number;
  /** `K`: the value of the enemy units whose death is credited to it. */
  readonly killValue: number;
  /** `X`: the value of its units that died. */
  readonly lossValue: number;
  /** `H`: the Hit Points its units lost. */
  readonly hpLost: number;
}

/**
 * One factor of the breakdown: the counted quantity and the points it gives.
 * The points of Losses and Damage taken are negative (before the cap).
 */
export interface ScoreFactorV7 {
  readonly count: number;
  readonly points: number;
}

/** The section 3.1 arithmetic of one score, each factor with its points. */
export interface ScoreBreakdownV7 {
  readonly territory: ScoreFactorV7;
  readonly cities: ScoreFactorV7;
  readonly technology: ScoreFactorV7;
  readonly achievements: ScoreFactorV7;
  readonly army: ScoreFactorV7;
  readonly kills: ScoreFactorV7;
  readonly losses: ScoreFactorV7;
  readonly damage: ScoreFactorV7;
  /** The sum of the six positive factors. */
  readonly positive: number;
  /** Losses and Damage taken together, before the cap (a positive number). */
  readonly penalty: number;
  /** What the penalty takes away: `min(penalty, floor(positive / 2))`. */
  readonly penaltyApplied: number;
  /** What the cap gave back: `penalty − penaltyApplied` (0 when it did not act). */
  readonly capReturned: number;
  /** The score: `positive − penaltyApplied`, never negative. */
  readonly total: number;
}

/** A player's score breakdown. */
export interface PlayerScoreV7 extends ScoreBreakdownV7 {
  readonly playerId: PlayerId;
}

/** The pure section 3.1 arithmetic over the counted quantities. */
export function scoreFromCountsV7(counts: ScoreCountsV7): ScoreBreakdownV7 {
  for (const value of Object.values(counts))
    if (!Number.isSafeInteger(value) || value < 0)
      throw new RangeError("score counts must be non-negative integers");
  const factor = (count: number, weight: number): ScoreFactorV7 => ({
    count,
    points: count * weight,
  });
  const territory = factor(counts.territoryTiles, SCORE_TERRITORY_POINTS_V7);
  const cities = factor(counts.cityLevels, SCORE_CITY_LEVEL_POINTS_V7);
  const technology = factor(counts.techTiers, SCORE_TECH_TIER_POINTS_V7);
  const achievements = factor(counts.achievements, SCORE_ACHIEVEMENT_POINTS_V7);
  const army = factor(counts.armyValue, SCORE_ARMY_POINTS_PER_COIN_V7);
  const kills = factor(counts.killValue, SCORE_KILL_POINTS_PER_COIN_V7);
  const lossPoints = counts.lossValue * SCORE_LOSS_POINTS_PER_COIN_V7;
  const damagePoints = Math.floor(counts.hpLost / SCORE_HP_PER_DAMAGE_POINT_V7);
  const positive =
    territory.points +
    cities.points +
    technology.points +
    achievements.points +
    army.points +
    kills.points;
  const penalty = lossPoints + damagePoints;
  const penaltyApplied = Math.min(penalty, Math.floor(positive / 2));
  return {
    territory,
    cities,
    technology,
    achievements,
    army,
    kills,
    // `0 - x` keeps a zero penalty factor at +0 (a canonical JSON value).
    losses: { count: counts.lossValue, points: 0 - lossPoints },
    damage: { count: counts.hpLost, points: 0 - damagePoints },
    positive,
    penalty,
    penaltyApplied,
    capReturned: penalty - penaltyApplied,
    total: positive - penaltyApplied,
  };
}

/**
 * Section 3.2: a unit's value, the printed cost of its role under the
 * registration of its kind (a mind-controlled unit keeps its kind); a role
 * with no printed cost (the reward giant of every faction) is worth
 * `SCORE_GIANT_VALUE_V7` and the neutral Giant Spider its bounty. Map
 * curiosities round 2 (`pulp_wars-737.14`): every neutral unit is worth
 * its breed's bounty (a Grunt 3, a Ray Gunner or Shield Projector 4, a
 * Zombie 5, Bigfoot 12).
 */
export function unitScoreValueV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly maxHp?: number;
  },
): number {
  if (isNeutralOwnerV7(unit.ownerId))
    return neutralBountyV7(neutralBreedOfV7(roster, unit));
  return unitRoleRuleV7(roster, unit).cost ?? SCORE_GIANT_VALUE_V7;
}

const TIER_BY_FACTION_TREE_V7 = new Map<
  string,
  ReadonlyMap<TechnologyIdV7, number>
>();

function techTiersV7(player: PlayerStateV7): number {
  let tiers = TIER_BY_FACTION_TREE_V7.get(player.faction);
  if (tiers === undefined) {
    tiers = new Map(
      factionTreeV7(player.faction).nodes.map(
        (node) => [node.id, node.tier] as const,
      ),
    );
    TIER_BY_FACTION_TREE_V7.set(player.faction, tiers);
  }
  let sum = 0;
  for (const tech of player.researchedTechs) sum += tiers.get(tech) ?? 0;
  return sum;
}

/** A zero ledger entry (a new player before its starting score is known). */
function zeroLedgerEntryV7(playerId: PlayerId): ScoreLedgerEntryV7 {
  return {
    playerId,
    killValue: 0,
    lossValue: 0,
    hpLost: 0,
    flawless: true,
    eliminatedBy: null,
    eliminatedAt: null,
    peakScore: 0,
    round30: null,
  };
}

type ScoredStateV7 = Pick<
  GameStateV7,
  | "players"
  | "cities"
  | "board"
  | "units"
  | "burrowed"
  | "mindControlled"
  | "scoreLedger"
>;

/**
 * Section 3: every player's score, in `players` order: a pure function of
 * the state (the counters of section 3.3 come from `scoreLedger`).
 * Eliminated players keep Technology, Achievements, Kills, Losses, and
 * Damage; their Territory, Cities, and Army are 0.
 */
export function scoresV7(state: ScoredStateV7): readonly PlayerScoreV7[] {
  const cityOwner = new Map<number, PlayerId>();
  const levels = new Map<PlayerId, number>();
  for (const city of state.cities) {
    cityOwner.set(city.id, city.ownerId);
    levels.set(city.ownerId, (levels.get(city.ownerId) ?? 0) + city.level);
  }
  const tiles = new Map<PlayerId, number>();
  for (const tile of state.board.tiles) {
    if (tile.territoryCityId === null) continue;
    const owner = cityOwner.get(tile.territoryCityId);
    if (owner !== undefined) tiles.set(owner, (tiles.get(owner) ?? 0) + 1);
  }
  const army = new Map<PlayerId, number>();
  // Section 3.2: everything a player commands now, burrowed units and Eggs
  // included (a controlled unit counts for its controller).
  for (const unit of allOwnedUnitsV7(state)) {
    if (unit.hp <= 0 || isNeutralOwnerV7(unit.ownerId)) continue;
    army.set(
      unit.ownerId,
      (army.get(unit.ownerId) ?? 0) + unitScoreValueV7(state, unit),
    );
  }
  const ledger = new Map(
    state.scoreLedger.map((entry) => [entry.playerId, entry] as const),
  );
  return state.players.map((player): PlayerScoreV7 => {
    const entry = ledger.get(player.id) ?? zeroLedgerEntryV7(player.id);
    const active = player.status === "ACTIVE";
    return {
      playerId: player.id,
      ...scoreFromCountsV7({
        territoryTiles: active ? (tiles.get(player.id) ?? 0) : 0,
        cityLevels: active ? (levels.get(player.id) ?? 0) : 0,
        techTiers: techTiersV7(player),
        achievements: player.achievementEntitlements.filter(
          (entitlement) => entitlement.unlocked,
        ).length,
        armyValue: active ? (army.get(player.id) ?? 0) : 0,
        killValue: entry.killValue,
        lossValue: entry.lossValue,
        hpLost: entry.hpLost,
      }),
    };
  });
}

/** Section 9.3: the score breakdown of one player (`scoreV7`). */
export function scoreV7(
  state: ScoredStateV7,
  playerId: PlayerId,
): PlayerScoreV7 {
  const score = scoresV7(state).find((entry) => entry.playerId === playerId);
  if (score === undefined) throw new RangeError(`Unknown player: ${playerId}`);
  return score;
}

/**
 * Section 3.3: the ledger of a new match: counters at 0, `flawless`, and the
 * starting score as each player's peak.
 */
export function initialScoreLedgerV7(
  state: Omit<ScoredStateV7, "scoreLedger">,
): readonly ScoreLedgerEntryV7[] {
  const zero = state.players.map((player) => zeroLedgerEntryV7(player.id));
  const scores = scoresV7({ ...state, scoreLedger: zero });
  return zero.map((entry, index) => ({
    ...entry,
    peakScore: scores[index]?.total ?? 0,
  }));
}

/**
 * A stored state made before the score (no `scoreLedger`): counters at 0,
 * `flawless` false (its history is unknown, so it cannot earn the glow),
 * and the current score as the peak.
 */
export function legacyScoreLedgerV7(
  state: Omit<ScoredStateV7, "scoreLedger">,
): readonly ScoreLedgerEntryV7[] {
  return initialScoreLedgerV7(state).map((entry) => ({
    ...entry,
    flawless: false,
  }));
}

/**
 * The structural rules of a ledger: one entry per player in `players`
 * order, non-negative safe integer counters, `eliminatedBy` another player
 * (or null) set exactly with `eliminatedAt`, and a `round30` snapshot whose
 * peak is at least its score.
 */
export function scoreLedgerShapeValidV7(
  ledger: readonly ScoreLedgerEntryV7[],
  players: readonly Pick<PlayerStateV7, "id" | "status">[],
): boolean {
  if (ledger.length !== players.length) return false;
  const ids = new Set(players.map((player) => player.id));
  const counter = (value: number): boolean =>
    Number.isSafeInteger(value) && value >= 0;
  return ledger.every((entry, index) => {
    const player = players[index];
    return (
      player !== undefined &&
      entry.playerId === player.id &&
      counter(entry.killValue) &&
      counter(entry.lossValue) &&
      counter(entry.hpLost) &&
      counter(entry.peakScore) &&
      typeof entry.flawless === "boolean" &&
      (entry.eliminatedBy === null) === (entry.eliminatedAt === null) &&
      (entry.eliminatedBy === null ||
        (entry.eliminatedBy !== player.id &&
          ids.has(entry.eliminatedBy) &&
          player.status === "ELIMINATED")) &&
      (entry.eliminatedAt === null || counter(entry.eliminatedAt)) &&
      (entry.round30 === null ||
        (counter(entry.round30.score) &&
          counter(entry.round30.peakScore) &&
          entry.round30.peakScore >= entry.round30.score))
    );
  });
}

/**
 * Section 3.2 Kills: one death the engine credited (the credited-death
 * records Plunder reads, current rules section 18.9), with the victim's
 * value where the crediting step still had the victim (null otherwise; the
 * ledger then reads it from the state before the command).
 */
export interface ScoreCreditRecordV7 {
  readonly creditedId: PlayerId;
  readonly victimOwnerId: PlayerId;
  readonly victimUnitId: UnitId;
  readonly value: number | null;
}

const CREDIT_SINKS_V7: ScoreCreditRecordV7[][] = [];

/**
 * The units whose HP, deaths, and value the ledger follows: every unit a
 * player owns on the board or burrowed, and (the giants' signatures,
 * docs/product/RULESET_7_GIANTS.md section 6.2) every victim an Abomination
 * holds, which still belongs to its owner (it is no Army, but its digest
 * damage is its owner's Damage taken and its digestion a death).
 */
function scoredUnitsV7(
  state: Pick<GameStateV7, "units" | "burrowed"> &
    Partial<Pick<GameStateV7, "giants">>,
): readonly UnitFactV7[] {
  const swallowed = state.giants?.swallowed ?? [];
  return swallowed.length === 0
    ? allOwnedUnitsV7(state)
    : [...allOwnedUnitsV7(state), ...swallowed.map((entry) => entry.unit)];
}

/**
 * Called by the reducer's Plunder step with every credited death of a
 * command (or Start Turn): records them for the score ledger of the command
 * being applied. Outside {@link collectScoreCreditsV7} it does nothing.
 */
export function recordScoreCreditsV7(
  state: Pick<
    GameStateV7,
    "players" | "mindControlled" | "units" | "burrowed"
  > &
    Partial<Pick<GameStateV7, "giants">>,
  deaths: readonly CreditedDeathV7[],
): void {
  const sink = CREDIT_SINKS_V7[CREDIT_SINKS_V7.length - 1];
  if (sink === undefined || deaths.length === 0) return;
  for (const death of deaths) {
    const victim = scoredUnitsV7(state).find(
      (unit) => unit.id === death.victimUnitId,
    );
    sink.push({
      creditedId: death.creditedId,
      victimOwnerId: death.victimOwnerId,
      victimUnitId: death.victimUnitId,
      value: victim === undefined ? null : unitScoreValueV7(state, victim),
    });
  }
}

/**
 * Runs `run` with a credit sink of its own and returns what it recorded.
 * Sinks nest: a command applied inside another collection keeps its own
 * credits, which are then also passed to the enclosing sink (so a test can
 * observe the credits of the commands it applies).
 */
export function collectScoreCreditsV7<T>(run: () => T): {
  readonly result: T;
  readonly credits: readonly ScoreCreditRecordV7[];
} {
  const sink: ScoreCreditRecordV7[] = [];
  CREDIT_SINKS_V7.push(sink);
  try {
    return { result: run(), credits: sink };
  } finally {
    CREDIT_SINKS_V7.pop();
    CREDIT_SINKS_V7[CREDIT_SINKS_V7.length - 1]?.push(...sink);
  }
}

/** The credits recorded so far by the command being applied. */
export function scoreCreditsSoFarV7(): readonly ScoreCreditRecordV7[] {
  return [...(CREDIT_SINKS_V7[CREDIT_SINKS_V7.length - 1] ?? [])];
}

/**
 * Score and modes (section 5.4): the events that take a unit or a city
 * away from a player, each of which ends its flawless game. The audit test
 * checks every one clears the flag.
 */
export const FLAWLESS_BREAKING_EVENT_KINDS_V7 = Object.freeze([
  "UNIT_DIED",
  "UNIT_DISBANDED",
  "UNIT_MIND_CONTROLLED",
  "SHIP_BOARDED",
  "UNIT_RELEASED",
  "CITY_CAPTURED",
  // The giants' signatures (section 6.2): a unit an Abomination swallows
  // is taken off the board (its owner lost it, at least for now).
  "UNIT_SWALLOWED",
  // The Cultists (RULESET_7_CULTISTS.md section 5.1): a Sacrifice takes a
  // unit away from its own seat (its `UNIT_DIED` follows; a Seizure is the
  // victim's `UNIT_DIED`).
  "UNIT_SACRIFICED",
] as const);

const REMOVAL_CAUSES_V7: ReadonlySet<string> = new Set([
  "ELIMINATION",
  "BRAIN_LOST",
]);

interface UnitFactV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly hp: number;
}

/**
 * Section 3.2 and 3.3: the ledger after one accepted command (or the part
 * of it before a round end) that turned `before` into `after` with
 * `events`, the deaths it credited being `credits`. Kills follow the
 * credits (hostile victims of a player only); Losses every `UNIT_DIED` but
 * the two removals; Damage taken the per-unit HP difference of every unit
 * a player commanded before (a death is 0 HP after; removals and units that
 * left the player's control without dying are skipped); `flawless` the
 * events of {@link FLAWLESS_BREAKING_EVENT_KINDS_V7}; `eliminatedBy` the
 * captor of the city whose capture eliminated the player. Returns `ledger`
 * itself when nothing changed.
 */
export function foldScoreLedgerV7(
  before: Pick<
    GameStateV7,
    | "players"
    | "mindControlled"
    | "units"
    | "burrowed"
    | "setup"
    | "humanPlayerId"
    | "commandIndex"
  > &
    Partial<Pick<GameStateV7, "giants">>,
  after: Pick<GameStateV7, "units" | "burrowed"> &
    Partial<Pick<GameStateV7, "giants">>,
  events: readonly DomainEventV7[],
  credits: readonly ScoreCreditRecordV7[],
  ledger: readonly ScoreLedgerEntryV7[],
): readonly ScoreLedgerEntryV7[] {
  const facts = new Map<UnitId, UnitFactV7>();
  for (const unit of scoredUnitsV7(before))
    if (unit.hp > 0) facts.set(unit.id, unit);
  // A unit's value before the command (its kind then), read only for a
  // death.
  const valueBefore = (id: UnitId): number | undefined => {
    const fact = facts.get(id);
    return fact === undefined ? undefined : unitScoreValueV7(before, fact);
  };
  const creditByVictim = new Map<UnitId, ScoreCreditRecordV7>();
  for (const credit of credits)
    if (!creditByVictim.has(credit.victimUnitId))
      creditByVictim.set(credit.victimUnitId, credit);
  const kill = new Map<PlayerId, number>();
  const loss = new Map<PlayerId, number>();
  const hp = new Map<PlayerId, number>();
  const broken = new Set<PlayerId>();
  const eliminated = new Map<PlayerId, PlayerId>();
  const add = (map: Map<PlayerId, number>, id: PlayerId, value: number) => {
    if (value > 0) map.set(id, (map.get(id) ?? 0) + value);
  };
  const owner = new Map<UnitId, PlayerId>(
    [...facts].map(([id, fact]) => [id, fact.ownerId] as const),
  );
  const died = new Set<UnitId>();
  const removed = new Set<UnitId>();
  const captor = new Map<PlayerId, PlayerId>();
  for (const event of events) {
    switch (event.kind) {
      case "UNIT_MIND_CONTROLLED":
        broken.add(event.targetOwnerId);
        owner.set(event.targetUnitId, event.playerId);
        break;
      case "SHIP_BOARDED":
        broken.add(event.fromPlayerId);
        owner.set(event.targetUnitId, event.playerId);
        break;
      case "UNIT_RELEASED":
        broken.add(event.fromPlayerId);
        owner.set(event.unitId, event.toPlayerId);
        break;
      case "UNIT_DISBANDED":
        broken.add(event.playerId);
        break;
      case "UNIT_SWALLOWED":
        broken.add(event.victimOwnerId);
        break;
      // The Cultists (docs/product/RULESET_7_CULTISTS.md section 5.1): a
      // Sacrifice is not a Loss (like Disband) and ends the flawless game.
      // Its `UNIT_DIED` (cause `SACRIFICED`) follows and is a removal. A
      // Seizure has the same cause and is an ordinary credited death: Kills
      // for the Cult seat, a Loss for the victim's owner.
      case "UNIT_SACRIFICED":
        broken.add(event.playerId);
        removed.add(event.victimUnitId);
        break;
      case "CITY_CAPTURED":
        if (event.from !== null) {
          broken.add(event.from);
          captor.set(event.from, event.to);
        }
        break;
      case "PLAYER_ELIMINATED": {
        const by = captor.get(event.playerId);
        if (by !== undefined) eliminated.set(event.playerId, by);
        break;
      }
      case "UNIT_DIED": {
        const credit = creditByVictim.get(event.unitId);
        const at = owner.get(event.unitId) ?? credit?.victimOwnerId;
        if (at === undefined || isNeutralOwnerV7(at)) break;
        broken.add(at);
        if (REMOVAL_CAUSES_V7.has(event.cause) || removed.has(event.unitId)) {
          removed.add(event.unitId);
          break;
        }
        died.add(event.unitId);
        add(loss, at, valueBefore(event.unitId) ?? credit?.value ?? 0);
        break;
      }
      default:
        break;
    }
  }
  // A unit dies once: a victim credited twice in one command (no step does
  // that today) still counts once, for its first credit.
  for (const credit of creditByVictim.values()) {
    if (
      isNeutralOwnerV7(credit.creditedId) ||
      !arePlayersHostileV7(before, credit.creditedId, credit.victimOwnerId)
    )
      continue;
    add(
      kill,
      credit.creditedId,
      credit.value ?? valueBefore(credit.victimUnitId) ?? 0,
    );
  }
  const afterUnits = new Map(
    scoredUnitsV7(after).map((unit) => [unit.id, unit] as const),
  );
  for (const [id, fact] of facts) {
    if (isNeutralOwnerV7(fact.ownerId) || removed.has(id)) continue;
    if (died.has(id)) {
      add(hp, fact.ownerId, fact.hp);
      continue;
    }
    const later = afterUnits.get(id);
    if (later === undefined || later.ownerId !== fact.ownerId) continue;
    add(hp, fact.ownerId, fact.hp - later.hp);
  }
  if (
    kill.size === 0 &&
    loss.size === 0 &&
    hp.size === 0 &&
    eliminated.size === 0 &&
    ![...broken].some(
      (id) => ledger.find((entry) => entry.playerId === id)?.flawless === true,
    )
  )
    return ledger;
  return ledger.map((entry) => {
    const by = eliminated.get(entry.playerId);
    return {
      ...entry,
      killValue: entry.killValue + (kill.get(entry.playerId) ?? 0),
      lossValue: entry.lossValue + (loss.get(entry.playerId) ?? 0),
      hpLost: entry.hpLost + (hp.get(entry.playerId) ?? 0),
      flawless: entry.flawless && !broken.has(entry.playerId),
      eliminatedBy: by ?? entry.eliminatedBy,
      eliminatedAt: by === undefined ? entry.eliminatedAt : before.commandIndex,
    };
  });
}

/**
 * Section 3.3 round end: the moment the last seat in turn order has ended
 * its turn (after `TURN_ENDED`, before the neutral turn and the next round's
 * first Start Turn). `current` is the state at that moment inside the
 * `END_TURN` that began at `before`, after `events` and the credits so far.
 * Returns the ledger of `current` with every player's `peakScore` raised to
 * its score and, at the end of round `PERFECTION_ROUNDS_V7`, the `round30`
 * snapshot; the counters of the command are added later by the reducer, so
 * they stay as they were. `scores` are the round-end scores.
 */
export function roundEndScoreLedgerV7(
  before: GameStateV7,
  current: GameStateV7,
  events: readonly DomainEventV7[],
  credits: readonly ScoreCreditRecordV7[],
): {
  readonly ledger: readonly ScoreLedgerEntryV7[];
  readonly scores: readonly PlayerScoreV7[];
} {
  const counters = foldScoreLedgerV7(
    before,
    current,
    events,
    credits,
    current.scoreLedger,
  );
  const scores = scoresV7({ ...current, scoreLedger: counters });
  const snapshot = current.round === PERFECTION_ROUNDS_V7;
  return {
    scores,
    ledger: current.scoreLedger.map((entry, index) => {
      const score = scores[index]?.total ?? 0;
      const peakScore = Math.max(entry.peakScore, score);
      return {
        ...entry,
        peakScore,
        round30: snapshot ? { score, peakScore } : entry.round30,
      };
    }),
  };
}

/**
 * Section 4.2: the Perfection ranking. Players still in the match first, by
 * score, then more cities, then more territory tiles, then the earlier
 * place in the turn order; then the eliminated players, the later
 * eliminated above the earlier (turn order breaks a tie).
 */
export function scoreRankingV7(
  state: Pick<GameStateV7, "players" | "cities" | "turnOrder" | "scoreLedger">,
  scores: readonly PlayerScoreV7[],
): readonly PlayerId[] {
  const scoreOf = new Map(scores.map((entry) => [entry.playerId, entry]));
  const cityCount = new Map<PlayerId, number>();
  for (const city of state.cities)
    cityCount.set(city.ownerId, (cityCount.get(city.ownerId) ?? 0) + 1);
  const ledger = new Map(
    state.scoreLedger.map((entry) => [entry.playerId, entry] as const),
  );
  const place = (id: PlayerId): number => {
    const index = state.turnOrder.indexOf(id);
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  const active = state.players
    .filter((player) => player.status === "ACTIVE")
    .map((player) => player.id);
  const out = state.players
    .filter((player) => player.status !== "ACTIVE")
    .map((player) => player.id);
  active.sort(
    (left, right) =>
      (scoreOf.get(right)?.total ?? 0) - (scoreOf.get(left)?.total ?? 0) ||
      (cityCount.get(right) ?? 0) - (cityCount.get(left) ?? 0) ||
      (scoreOf.get(right)?.territory.count ?? 0) -
        (scoreOf.get(left)?.territory.count ?? 0) ||
      place(left) - place(right),
  );
  out.sort(
    (left, right) =>
      (ledger.get(right)?.eliminatedAt ?? -1) -
        (ledger.get(left)?.eliminatedAt ?? -1) || place(left) - place(right),
  );
  return [...active, ...out];
}
