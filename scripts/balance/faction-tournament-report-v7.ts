/**
 * Faction strength tournament (`pulp_wars-hblo`): the aggregation and the
 * report. It reads the per-match records the runner wrote and writes
 * `aggregate.json`, a self-contained `report.html` (inline SVG charts, no
 * scripts or network), and a short `summary.md`. An optional
 * `<out>/verdicts.json` (`{ "headline": string[], "factions": { ID: text } }`)
 * adds a hand-written read per faction; without it the cards show only the
 * data-driven flags.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  effectiveRoleRuleV7,
  factionTreeV7,
} from "../../src/engine/rules/ruleset-v7";
import type { FactionIdV7, UnitRoleIdV7 } from "../../src/engine/v7/types";
import {
  bootstrapRatingsV7,
  bradleyTerryV7,
  headToHeadV7,
  meanIntervalV7,
  placementOrderV7,
  useShareV7,
  wilsonIntervalV7,
  type PairGameV7,
} from "./faction-tournament-stats-v7";
import type { SeatTelemetryV7 } from "./faction-tournament-telemetry-v7";

export const FACTION_LABELS_V7: Readonly<Record<string, string>> = {
  ORIGINAL: "Humans",
  UNDEAD: "Undead",
  GOBLIN: "Goblins",
  DINOSAUR: "Dinosaurs",
  MARTIAN: "Martians",
  ICE_FOLK: "Ice Folk",
  DWARF: "Dwarves",
  CANDY: "Candy",
  CULT: "Cult",
};

/** The slice of a match record the report reads. */
export interface ReportMatchRecordV7 {
  readonly spec: {
    readonly id: string;
    readonly phase: "1v1" | "ffa";
    readonly seed: number;
    readonly mapType: string;
    readonly factions: readonly string[];
  };
  readonly maxRounds: number;
  readonly decidedBy: "ELIMINATION" | "SCORE_AT_CAP" | "FAILED";
  readonly winnerSeat: number | null;
  readonly rounds: number;
  readonly commands: number;
  readonly wallSeconds: number;
  readonly replaySeconds: number;
  readonly waterShare: number;
  readonly finalScores: readonly number[];
  readonly scoresByRound: readonly (readonly number[])[];
  readonly errors: readonly string[];
  readonly seats: readonly SeatTelemetryV7[];
  readonly factionRoles: Record<
    string,
    | {
        readonly trained: Record<string, number>;
        readonly kills: Record<string, number>;
        readonly losses: Record<string, number>;
      }
    | undefined
  >;
  readonly abilityBlocks: Record<string, unknown>;
}

interface Verdicts {
  readonly headline?: readonly string[];
  readonly factions?: Readonly<Record<string, string>>;
  readonly caveats?: readonly string[];
}

const label = (faction: string): string =>
  FACTION_LABELS_V7[faction] ?? faction;
const pct = (value: number): string => `${Math.round(value * 100)}%`;
const fixed = (value: number, digits = 1): string => value.toFixed(digits);
const escapeHtml = (text: string): string =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const humanize = (id: string): string =>
  id
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);
const mean = (values: readonly number[]): number =>
  values.length === 0 ? 0 : sum(values) / values.length;

/** The command keys that are training: their role is after the colon. */
const TRAINING_KINDS = ["TRAIN", "TRAIN_NAVAL", "LAY_EGG", "HIRE"];
const trainingRole = (key: string): string | null => {
  const [kind, role] = key.split(":");
  return role !== undefined && TRAINING_KINDS.includes(kind as string)
    ? role
    : null;
};

/** The roles a faction's tree lets it train, the Fighter slot first. */
export function factionRosterV7(faction: string): UnitRoleIdV7[] {
  const tree = factionTreeV7(faction as FactionIdV7);
  return [
    "FIGHTER",
    ...tree.nodes.flatMap((node) => node.unlockedRoles),
  ] as UnitRoleIdV7[];
}

function roleLabel(role: string, faction: string): string {
  try {
    return effectiveRoleRuleV7(role as UnitRoleIdV7, faction as FactionIdV7)
      .label;
  } catch {
    return humanize(role);
  }
}

function unlockTech(role: string, faction: string): string | null {
  const node = factionTreeV7(faction as FactionIdV7).nodes.find((item) =>
    item.unlockedRoles.includes(role as UnitRoleIdV7),
  );
  return node?.id ?? null;
}

interface SeatGame {
  readonly record: ReportMatchRecordV7;
  readonly seat: SeatTelemetryV7;
  readonly won: boolean;
  readonly placement: number;
}

export function aggregateTournamentV7(
  records: readonly ReportMatchRecordV7[],
): Record<string, unknown> & {
  readonly factions: string[];
  readonly duel: ReturnType<typeof duelAggregate>;
  readonly ffa: ReturnType<typeof ffaAggregate>;
  readonly cards: Record<string, ReturnType<typeof factionCard>>;
  readonly totals: ReturnType<typeof totalsOf>;
} {
  const factions = [
    ...new Set(records.flatMap((record) => record.spec.factions)),
  ].sort(
    (left, right) =>
      Object.keys(FACTION_LABELS_V7).indexOf(left) -
      Object.keys(FACTION_LABELS_V7).indexOf(right),
  );
  const ok = records.filter((record) => record.decidedBy !== "FAILED");
  const duels = ok.filter((record) => record.spec.phase === "1v1");
  const ffas = ok.filter((record) => record.spec.phase === "ffa");
  const duel = duelAggregate(duels, factions);
  const ffa = ffaAggregate(ffas, factions);
  // Faction-specific commands: offered to at most three factions.
  const offeredBy = new Map<string, Set<string>>();
  for (const record of ok)
    for (const seat of record.seats)
      for (const key of Object.keys(seat.turnsOffered)) {
        if (trainingRole(key) !== null) continue;
        const set = offeredBy.get(key) ?? new Set<string>();
        set.add(seat.faction);
        offeredBy.set(key, set);
      }
  const specificKeys = new Set(
    [...offeredBy.entries()]
      .filter(([, set]) => set.size <= 3)
      .map(([key]) => key),
  );
  const cards = Object.fromEntries(
    factions.map((faction) => [
      faction,
      factionCard(faction, duels, ffas, specificKeys),
    ]),
  );
  return {
    factions,
    duel,
    ffa,
    cards,
    totals: totalsOf(records),
  };
}

function totalsOf(records: readonly ReportMatchRecordV7[]) {
  const phase = (name: "1v1" | "ffa") => {
    const list = records.filter((record) => record.spec.phase === name);
    return {
      matches: list.length,
      eliminations: list.filter((record) => record.decidedBy === "ELIMINATION")
        .length,
      capped: list.filter((record) => record.decidedBy === "SCORE_AT_CAP")
        .length,
      failed: list.filter((record) => record.decidedBy === "FAILED").length,
      cappedTies: list.filter(
        (record) =>
          record.decidedBy === "SCORE_AT_CAP" && record.winnerSeat === null,
      ).length,
      meanRounds: mean(list.map((record) => record.rounds)),
      cpuMinutes:
        sum(list.map((record) => record.wallSeconds + record.replaySeconds)) /
        60,
      errors: list.flatMap((record) =>
        record.errors.map((error) => `${record.spec.id}: ${error}`),
      ),
    };
  };
  return { duel: phase("1v1"), ffa: phase("ffa") };
}

function pairGames(
  duels: readonly ReportMatchRecordV7[],
  eliminationOnly: boolean,
): PairGameV7[] {
  return duels
    .filter((record) => !eliminationOnly || record.decidedBy === "ELIMINATION")
    .map((record) => ({
      a: record.spec.factions[0] as string,
      b: record.spec.factions[1] as string,
      winner:
        record.winnerSeat === null
          ? null
          : (record.spec.factions[record.winnerSeat] as string),
    }));
}

function duelAggregate(
  duels: readonly ReportMatchRecordV7[],
  factions: readonly string[],
) {
  const games = pairGames(duels, false);
  const decisive = pairGames(duels, true);
  const ratings = bradleyTerryV7(games, factions);
  const intervals = bootstrapRatingsV7(games, factions, 400, 17);
  const eliminationRatings = bradleyTerryV7(decisive, factions);
  const matrix = headToHeadV7(games, factions);
  const rows = factions.map((faction) => {
    const mine = duels.filter((record) =>
      record.spec.factions.includes(faction),
    );
    const seatOf = (record: ReportMatchRecordV7): number =>
      record.spec.factions.indexOf(faction);
    const won = mine.filter((record) => record.winnerSeat === seatOf(record));
    const tied = mine.filter((record) => record.winnerSeat === null);
    const winsElimination = won.filter(
      (record) => record.decidedBy === "ELIMINATION",
    ).length;
    const winsCap = won.length - winsElimination;
    const lost = mine.filter(
      (record) =>
        record.winnerSeat !== null && record.winnerSeat !== seatOf(record),
    );
    const lossesElimination = lost.filter(
      (record) => record.decidedBy === "ELIMINATION",
    ).length;
    const score = won.length + tied.length / 2;
    const wilson = wilsonIntervalV7(score, mine.length);
    const eliminationGames = mine.filter(
      (record) => record.decidedBy === "ELIMINATION",
    );
    const byMap: Record<string, { games: number; wins: number }> = {};
    for (const record of mine) {
      const entry = byMap[record.spec.mapType] ?? { games: 0, wins: 0 };
      entry.games += 1;
      if (record.winnerSeat === seatOf(record)) entry.wins += 1;
      byMap[record.spec.mapType] = entry;
    }
    const bySeat = [0, 1].map((seat) => {
      const list = mine.filter((record) => seatOf(record) === seat);
      return {
        games: list.length,
        wins: list.filter((record) => record.winnerSeat === seat).length,
      };
    });
    return {
      faction,
      rating: ratings[faction] as number,
      ratingLow: intervals[faction]?.low ?? 0,
      ratingHigh: intervals[faction]?.high ?? 0,
      eliminationRating: eliminationRatings[faction] as number,
      games: mine.length,
      wins: won.length,
      winsElimination,
      winsCap,
      ties: tied.length,
      losses: lost.length,
      lossesElimination,
      lossesCap: lost.length - lossesElimination,
      winRate: wilson.rate,
      winLow: wilson.low,
      winHigh: wilson.high,
      eliminationWinRate:
        eliminationGames.length === 0
          ? 0
          : eliminationGames.filter(
              (record) => record.winnerSeat === seatOf(record),
            ).length / eliminationGames.length,
      meanRounds: mean(mine.map((record) => record.rounds)),
      meanWinRounds: mean(
        won
          .filter((record) => record.decidedBy === "ELIMINATION")
          .map((record) => record.rounds),
      ),
      meanLossRounds: mean(
        lost
          .filter((record) => record.decidedBy === "ELIMINATION")
          .map((record) => record.rounds),
      ),
      byMap,
      bySeat,
    };
  });
  rows.sort((left, right) => right.rating - left.rating);
  const seatZeroWins = duels.filter((record) => record.winnerSeat === 0).length;
  const decided = duels.filter((record) => record.winnerSeat !== null).length;
  return {
    games: duels.length,
    rows,
    matrix,
    seatZero: wilsonIntervalV7(seatZeroWins, decided),
  };
}

function ffaAggregate(
  ffas: readonly ReportMatchRecordV7[],
  factions: readonly string[],
) {
  const rows = factions.map((faction) => {
    const places: number[] = [];
    const eliminatedRounds: number[] = [];
    let eliminated = 0;
    for (const record of ffas) {
      const seat = record.spec.factions.indexOf(faction);
      if (seat === -1) continue;
      const order = placementOrderV7(
        record.seats.map((item) => ({
          seat: item.seat,
          eliminatedAt: item.eliminatedAt,
          score: record.finalScores[item.seat] ?? 0,
        })),
      );
      places.push(order.indexOf(seat) + 1);
      const telemetry = record.seats[seat];
      if (telemetry?.eliminatedRound !== null && telemetry !== undefined) {
        eliminated += 1;
        eliminatedRounds.push(telemetry.eliminatedRound as number);
      }
    }
    const seats = ffas[0]?.spec.factions.length ?? 4;
    const distribution = Array.from(
      { length: seats },
      (_, place) => places.filter((value) => value === place + 1).length,
    );
    return {
      faction,
      games: places.length,
      meanPlace: meanIntervalV7(places),
      firsts: wilsonIntervalV7(distribution[0] ?? 0, places.length),
      distribution,
      eliminated,
      meanEliminatedRound: mean(eliminatedRounds),
    };
  });
  rows.sort((left, right) => left.meanPlace.mean - right.meanPlace.mean);
  return {
    games: ffas.length,
    capped: ffas.filter((record) => record.decidedBy === "SCORE_AT_CAP").length,
    meanRounds: mean(ffas.map((record) => record.rounds)),
    rows,
  };
}

/** Values of a per-round series, forward-filled to `length` rounds. */
function filled(series: readonly number[], last: number, length: number) {
  return Array.from({ length }, (_, index) =>
    index < series.length ? (series[index] as number) : last,
  );
}

function factionCard(
  faction: string,
  duels: readonly ReportMatchRecordV7[],
  ffas: readonly ReportMatchRecordV7[],
  specificKeys: ReadonlySet<string>,
) {
  const seatGames = (records: readonly ReportMatchRecordV7[]): SeatGame[] =>
    records.flatMap((record) => {
      const seat = record.seats.find((item) => item.faction === faction);
      if (seat === undefined) return [];
      const order = placementOrderV7(
        record.seats.map((item) => ({
          seat: item.seat,
          eliminatedAt: item.eliminatedAt,
          score: record.finalScores[item.seat] ?? 0,
        })),
      );
      return [
        {
          record,
          seat,
          won: record.winnerSeat === seat.seat,
          placement: order.indexOf(seat.seat) + 1,
        },
      ];
    });
  const duelGames = seatGames(duels);
  const all = [...duelGames, ...seatGames(ffas)];
  const n = Math.max(1, all.length);
  const turns = sum(all.map((game) => game.seat.turns));
  // Time series over the duels, to the 90th percentile of their length.
  const lengths = duels.map((record) => record.rounds).sort((x, y) => x - y);
  const horizon = Math.max(
    10,
    Math.min(60, lengths[Math.floor(lengths.length * 0.9)] ?? 30),
  );
  const series = (pick: (game: SeatGame) => { s: number[]; last: number }) =>
    Array.from({ length: horizon }, (_, index) =>
      mean(
        duelGames.map((game) => {
          const { s, last } = pick(game);
          return filled(s, last, horizon)[index] as number;
        }),
      ),
    );
  const cities = series((game) => ({
    s: game.seat.citiesByRound,
    last: game.seat.finalCities,
  }));
  const scores = series((game) => ({
    s: game.record.scoresByRound.map((round) => round[game.seat.seat] ?? 0),
    last: game.record.finalScores[game.seat.seat] ?? 0,
  }));
  // Units: trained per game (the headless role inventory) against the
  // turns their training was offered.
  const roster = factionRosterV7(faction);
  const trainedRoles = new Set<string>();
  for (const game of all)
    for (const [role, count] of Object.entries(
      game.record.factionRoles[faction]?.trained ?? {},
    ))
      if (count > 0) trainedRoles.add(role);
  const roles = [
    ...roster,
    ...[...trainedRoles].filter((role) => !roster.includes(role as never)),
  ];
  const units = roles.map((role) => {
    const trained = sum(
      all.map((game) => game.record.factionRoles[faction]?.trained[role] ?? 0),
    );
    const offeredTurns = sum(
      all.map((game) =>
        Math.max(
          0,
          ...Object.entries(game.seat.turnsOffered)
            .filter(([key]) => trainingRole(key) === role)
            .map(([, value]) => value),
        ),
      ),
    );
    const kills = sum(
      all.map((game) => game.record.factionRoles[faction]?.kills[role] ?? 0),
    );
    const losses = sum(
      all.map((game) => game.record.factionRoles[faction]?.losses[role] ?? 0),
    );
    return {
      role,
      label: roleLabel(role, faction),
      unlock: unlockTech(role, faction),
      inRoster: roster.includes(role as never),
      perGame: trained / n,
      gamesTrained:
        all.filter(
          (game) => (game.record.factionRoles[faction]?.trained[role] ?? 0) > 0,
        ).length / n,
      offeredTurnShare: turns === 0 ? 0 : offeredTurns / turns,
      kills: kills / n,
      losses: losses / n,
    };
  });
  // Faction-specific commands, offered against used.
  const keys = new Set<string>();
  for (const game of all)
    for (const key of Object.keys(game.seat.turnsOffered))
      if (specificKeys.has(key)) keys.add(key);
  const abilities = [...keys]
    .map((key) => {
      const offered = sum(all.map((game) => game.seat.turnsOffered[key] ?? 0));
      const usedTurns = sum(all.map((game) => game.seat.turnsUsed[key] ?? 0));
      const uses = sum(all.map((game) => game.seat.uses[key] ?? 0));
      return {
        key,
        offeredTurns: offered,
        offeredShare: turns === 0 ? 0 : offered / turns,
        usedTurns,
        uses,
        usesPerGame: uses / n,
        share: useShareV7(usedTurns, offered),
      };
    })
    .sort((left, right) => right.offeredTurns - left.offeredTurns);
  // Technologies: adoption and mean research round, in research order.
  const techRounds = new Map<string, number[]>();
  const firstFive = new Map<string, number>();
  for (const game of all) {
    game.seat.research.forEach((entry, index) => {
      const list = techRounds.get(entry.tech) ?? [];
      list.push(entry.round);
      techRounds.set(entry.tech, list);
      if (index < 5)
        firstFive.set(entry.tech, (firstFive.get(entry.tech) ?? 0) + 1);
    });
  }
  const tree = factionTreeV7(faction as FactionIdV7);
  const techs = tree.nodes
    .map((node) => {
      const rounds = techRounds.get(node.id) ?? [];
      return {
        tech: node.id,
        tier: node.tier,
        adoption: rounds.length / n,
        meanRound: rounds.length === 0 ? null : mean(rounds),
        openingShare: (firstFive.get(node.id) ?? 0) / n,
        unlocks: node.unlockedRoles.map((role) => roleLabel(role, faction)),
      };
    })
    .sort(
      (left, right) =>
        (left.meanRound ?? 999) - (right.meanRound ?? 999) ||
        right.adoption - left.adoption,
    );
  // Coins at End Turn.
  const coins = all.flatMap((game) => game.seat.coinsAtEndTurn);
  const lateCoins = all.flatMap((game) => game.seat.coinsAtEndTurn.slice(-5));
  // Naval play on the maps with water.
  const wet = all.filter((game) => game.record.spec.mapType !== "PANGEA");
  const naval = {
    hasShips: roster.some((role) =>
      ["PATROL_BOAT", "BATTLESHIP", "SUBMARINE"].includes(role),
    ),
    games: wet.length,
    meanWaterShare: mean(wet.map((game) => game.record.waterShare)),
    shipsPerGame: mean(
      wet.map((game) =>
        sum(
          ["PATROL_BOAT", "BATTLESHIP", "SUBMARINE"].map(
            (role) => game.record.factionRoles[faction]?.trained[role] ?? 0,
          ),
        ),
      ),
    ),
    embarksPerGame: mean(wet.map((game) => game.seat.embarks)),
    gamesWithShips:
      wet.length === 0
        ? 0
        : wet.filter((game) =>
            ["PATROL_BOAT", "BATTLESHIP", "SUBMARINE"].some(
              (role) =>
                (game.record.factionRoles[faction]?.trained[role] ?? 0) > 0,
            ),
          ).length / wet.length,
  };
  // The faction's headless ability block, per game (duels only, where the
  // block is the faction's own; free-for-alls mix factions).
  const blocks = duelGames
    .map((game) => game.record.abilityBlocks[faction])
    .filter((block) => block !== undefined);
  const counters: Record<string, number> = {};
  for (const block of blocks)
    for (const [name, value] of flatNumbers(block, ""))
      counters[name] = (counters[name] ?? 0) + value;
  const abilityCounters = Object.entries(counters)
    .map(([name, total]) => ({
      name,
      perGame: blocks.length === 0 ? 0 : total / blocks.length,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const duelWins = duelGames.filter((game) => game.won);
  const duelLosses = duelGames.filter(
    (game) => !game.won && game.record.winnerSeat !== null,
  );
  return {
    faction,
    games: all.length,
    turns,
    horizon,
    cities,
    scores,
    units,
    abilities,
    techs,
    coins: {
      meanAtEndTurn: mean(coins),
      shareAtLeastTen:
        coins.length === 0
          ? 0
          : coins.filter((value) => value >= 10).length / coins.length,
      meanLastFive: mean(lateCoins),
    },
    naval,
    abilityCounters,
    wins: {
      elimination: duelWins.filter(
        (game) => game.record.decidedBy === "ELIMINATION",
      ).length,
      cap: duelWins.filter((game) => game.record.decidedBy === "SCORE_AT_CAP")
        .length,
      capitalTakenRound: mean(
        duelWins.flatMap((game) => {
          const other = game.record.seats.find(
            (item) => item.seat !== game.seat.seat,
          );
          return other?.capitalLostRound === null || other === undefined
            ? []
            : [other.capitalLostRound];
        }),
      ),
    },
    losses: {
      elimination: duelLosses.filter(
        (game) => game.record.decidedBy === "ELIMINATION",
      ).length,
      cap: duelLosses.filter((game) => game.record.decidedBy === "SCORE_AT_CAP")
        .length,
      capitalLostRound: mean(
        duelLosses.flatMap((game) =>
          game.seat.capitalLostRound === null
            ? []
            : [game.seat.capitalLostRound],
        ),
      ),
    },
    citiesCapturedPerGame: mean(all.map((game) => game.seat.citiesCaptured)),
    citiesMaxPerGame: mean(all.map((game) => game.seat.citiesMax)),
    flags: [] as string[],
  };
}

function flatNumbers(value: unknown, prefix: string): [string, number][] {
  if (typeof value === "number") return [[prefix, value]];
  if (Array.isArray(value) || value === null || typeof value !== "object")
    return [];
  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, item]) =>
      flatNumbers(item, prefix === "" ? key : `${prefix}.${key}`),
  );
}

/** Data-driven flags of a card: what the AI leaves on the table. */
export function cardFlagsV7(card: ReturnType<typeof factionCard>): string[] {
  const flags: string[] = [];
  for (const unit of card.units)
    if (
      unit.inRoster &&
      unit.role !== "FIGHTER" &&
      unit.perGame < 0.25 &&
      unit.offeredTurnShare >= 0.1
    )
      flags.push(
        `${unit.label} rarely trained (${fixed(unit.perGame, 2)} per game) though offered in ${pct(unit.offeredTurnShare)} of turns`,
      );
  for (const ability of card.abilities)
    if (
      ability.offeredShare >= 0.05 &&
      ability.share !== null &&
      ability.share < 0.1
    )
      flags.push(
        `${humanize(ability.key)} offered in ${pct(ability.offeredShare)} of turns, used in ${pct(ability.share)} of those`,
      );
  for (const tech of card.techs)
    if (tech.adoption < 0.1 && tech.unlocks.length > 0)
      flags.push(
        `${humanize(tech.tech)} (unlocks ${tech.unlocks.join(", ")}) researched in ${pct(tech.adoption)} of games`,
      );
  if (card.coins.meanAtEndTurn >= 8)
    flags.push(
      `banks ${fixed(card.coins.meanAtEndTurn)} Coins at End Turn on average`,
    );
  const hasShips = card.units.some(
    (unit) =>
      unit.inRoster &&
      ["PATROL_BOAT", "BATTLESHIP", "SUBMARINE"].includes(unit.role),
  );
  if (hasShips && card.naval.games > 0 && card.naval.shipsPerGame < 0.2)
    flags.push(
      `almost no ships on water maps (${fixed(card.naval.shipsPerGame, 2)} per game)`,
    );
  return flags;
}

// ---------------------------------------------------------------- charts

function ratingChart(rows: ReturnType<typeof duelAggregate>["rows"]): string {
  const width = 640;
  const rowHeight = 30;
  const left = 110;
  const right = 30;
  const top = 26;
  const height = top + rows.length * rowHeight + 30;
  const values = rows.flatMap((row) => [row.ratingLow, row.ratingHigh]);
  const extent = Math.max(100, ...values.map(Math.abs)) * 1.1;
  const x = (value: number): number =>
    left + ((value + extent) / (2 * extent)) * (width - left - right);
  const ticks = [-extent, -extent / 2, 0, extent / 2, extent].map(
    (value) => Math.round(value / 25) * 25,
  );
  const parts: string[] = [];
  for (const tick of ticks)
    parts.push(
      `<line x1="${x(tick)}" x2="${x(tick)}" y1="${top - 8}" y2="${height - 24}" class="${tick === 0 ? "axis" : "grid"}"/>`,
      `<text x="${x(tick)}" y="${height - 8}" class="tick" text-anchor="middle">${tick > 0 ? "+" : ""}${tick}</text>`,
    );
  rows.forEach((row, index) => {
    const y = top + index * rowHeight + rowHeight / 2;
    parts.push(
      `<g><title>${escapeHtml(label(row.faction))}: ${fixed(row.rating, 0)} (95% bootstrap ${fixed(row.ratingLow, 0)} to ${fixed(row.ratingHigh, 0)}), win rate ${pct(row.winRate)}</title>`,
      `<rect x="0" y="${y - rowHeight / 2}" width="${width}" height="${rowHeight}" fill="transparent"/>`,
      `<text x="${left - 10}" y="${y + 4}" class="label" text-anchor="end">${escapeHtml(label(row.faction))}</text>`,
      `<line x1="${x(row.ratingLow)}" x2="${x(row.ratingHigh)}" y1="${y}" y2="${y}" class="ci"/>`,
      `<circle cx="${x(row.rating)}" cy="${y}" r="5" class="dot"/>`,
      `<text x="${x(row.ratingHigh) + 6}" y="${y + 4}" class="value">${row.rating > 0 ? "+" : ""}${fixed(row.rating, 0)}</text></g>`,
    );
  });
  parts.push(
    `<text x="${left}" y="14" class="tick">Bradley–Terry rating (Elo scale, mean 0), 95% bootstrap interval</text>`,
  );
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Faction ratings with intervals">${parts.join("")}</svg>`;
}

/** Diverging blue (row wins) to red (row loses) through a neutral gray. */
function divergingColor(rate: number): string {
  const blue = [0x2a, 0x78, 0xd6];
  const red = [0xe3, 0x49, 0x48];
  const mid = [0xf0, 0xef, 0xec];
  const t = Math.min(1, Math.abs(rate - 0.5) * 2);
  const pole = rate >= 0.5 ? blue : red;
  const mix = mid.map((value, index) =>
    Math.round(value + ((pole[index] as number) - value) * t),
  );
  return `rgb(${mix.join(",")})`;
}

function heatmap(
  factions: readonly string[],
  matrix: ReturnType<typeof headToHeadV7>,
  order: readonly string[],
): string {
  const cell = 44;
  const left = 90;
  const top = 70;
  const size = left + order.length * cell + 40;
  const parts: string[] = [];
  order.forEach((column, index) =>
    parts.push(
      `<text transform="translate(${left + index * cell + cell / 2},${top - 8}) rotate(-40)" class="label">${escapeHtml(label(column))}</text>`,
    ),
  );
  order.forEach((row, rowIndex) => {
    const y = top + rowIndex * cell;
    parts.push(
      `<text x="${left - 8}" y="${y + cell / 2 + 4}" class="label" text-anchor="end">${escapeHtml(label(row))}</text>`,
    );
    order.forEach((column, columnIndex) => {
      const x = left + columnIndex * cell;
      if (row === column) {
        parts.push(
          `<rect x="${x + 1}" y="${y + 1}" width="${cell - 2}" height="${cell - 2}" rx="3" class="diag"/>`,
        );
        return;
      }
      const games = matrix.games[row]?.[column] ?? 0;
      const wins = matrix.wins[row]?.[column] ?? 0;
      const rate = games === 0 ? 0.5 : wins / games;
      const ink = Math.abs(rate - 0.5) > 0.3 ? "#ffffff" : "#0b0b0b";
      parts.push(
        `<g><title>${escapeHtml(label(row))} vs ${escapeHtml(label(column))}: won ${wins} of ${games}</title>`,
        `<rect x="${x + 1}" y="${y + 1}" width="${cell - 2}" height="${cell - 2}" rx="3" fill="${divergingColor(rate)}"/>`,
        `<text x="${x + cell / 2}" y="${y + cell / 2 + 4}" text-anchor="middle" class="cell" style="fill:${ink}">${games === 0 ? "–" : pct(rate)}</text></g>`,
      );
    });
  });
  void factions;
  return `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Head-to-head win rates">${parts.join("")}</svg>`;
}

const PLACE_COLORS = ["#184f95", "#3987e5", "#86b6ef", "#cde2fb"];

function placementChart(rows: ReturnType<typeof ffaAggregate>["rows"]): string {
  const width = 640;
  const left = 110;
  const right = 70;
  const rowHeight = 28;
  const top = 34;
  const height = top + rows.length * rowHeight + 10;
  const parts: string[] = [];
  const seats = rows[0]?.distribution.length ?? 4;
  for (let place = 0; place < seats; place += 1)
    parts.push(
      `<rect x="${left + place * 90}" y="6" width="12" height="12" rx="2" fill="${PLACE_COLORS[place] ?? "#cde2fb"}"/>`,
      `<text x="${left + place * 90 + 18}" y="16" class="tick">${["1st", "2nd", "3rd", "4th", "5th", "6th"][place] ?? ""} place</text>`,
    );
  rows.forEach((row, index) => {
    const y = top + index * rowHeight;
    let x = left;
    const total = Math.max(1, row.games);
    parts.push(
      `<text x="${left - 10}" y="${y + rowHeight / 2 + 3}" class="label" text-anchor="end">${escapeHtml(label(row.faction))}</text>`,
    );
    row.distribution.forEach((count, place) => {
      const w = (count / total) * (width - left - right);
      if (w > 0)
        parts.push(
          `<g><title>${escapeHtml(label(row.faction))}: ${["1st", "2nd", "3rd", "4th", "5th", "6th"][place] ?? ""} in ${count} of ${row.games}</title><rect x="${x}" y="${y + 4}" width="${Math.max(0, w - 2)}" height="${rowHeight - 8}" rx="3" fill="${PLACE_COLORS[place] ?? "#cde2fb"}"/></g>`,
        );
      x += w;
    });
    parts.push(
      `<text x="${width - right + 8}" y="${y + rowHeight / 2 + 3}" class="value">avg ${fixed(row.meanPlace.mean, 2)}</text>`,
    );
  });
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Free-for-all placements">${parts.join("")}</svg>`;
}

function sparkline(
  values: readonly number[],
  reference: readonly number[],
  title: string,
): string {
  const width = 260;
  const height = 90;
  const pad = 32;
  const max = Math.max(1, ...values, ...reference);
  const x = (index: number): number =>
    pad + (index / Math.max(1, values.length - 1)) * (width - pad - 8);
  const y = (value: number): number =>
    height - 16 - (value / max) * (height - 30);
  const path = (series: readonly number[]): string =>
    series
      .map(
        (value, index) =>
          `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(value).toFixed(1)}`,
      )
      .join("");
  return `<svg viewBox="0 0 ${width} ${height}" class="spark" role="img" aria-label="${escapeHtml(title)}"><title>${escapeHtml(title)}: round ${values.length} mean ${fixed(values[values.length - 1] ?? 0)} (all factions ${fixed(reference[reference.length - 1] ?? 0)})</title>
<text x="${pad}" y="11" class="tick">${escapeHtml(title)}</text>
<line x1="${pad}" x2="${width - 8}" y1="${height - 16}" y2="${height - 16}" class="axis"/>
<text x="${pad - 4}" y="${y(max) + 4}" class="tick" text-anchor="end">${max >= 100 ? Math.round(max) : fixed(max)}</text>
<text x="${pad}" y="${height - 3}" class="tick">r1</text><text x="${width - 8}" y="${height - 3}" class="tick" text-anchor="end">r${values.length}</text>
<path d="${path(reference)}" class="ref"/><path d="${path(values)}" class="line"/></svg>`;
}

// ---------------------------------------------------------------- page

export function writeTournamentReportV7(
  out: string,
  records: readonly ReportMatchRecordV7[],
  config: Record<string, unknown>,
): void {
  const aggregate = aggregateTournamentV7(records);
  for (const card of Object.values(aggregate.cards))
    card.flags.push(...cardFlagsV7(card));
  const verdictPath = join(out, "verdicts.json");
  const verdicts: Verdicts = existsSync(verdictPath)
    ? (JSON.parse(readFileSync(verdictPath, "utf8")) as Verdicts)
    : {};
  writeFileSync(
    join(out, "aggregate.json"),
    JSON.stringify({ config, ...aggregate }, null, 1),
  );
  writeFileSync(
    join(out, "report.html"),
    reportHtml(aggregate, config, verdicts),
  );
  writeFileSync(
    join(out, "summary.md"),
    summaryMarkdown(aggregate, config, verdicts),
  );
}

type Aggregate = ReturnType<typeof aggregateTournamentV7>;

function reportHtml(
  aggregate: Aggregate,
  config: Record<string, unknown>,
  verdicts: Verdicts,
): string {
  const { duel, ffa, totals } = aggregate;
  const order = duel.rows.map((row) => row.faction);
  const ffaRow = (faction: string) =>
    ffa.rows.find((row) => row.faction === faction);
  const allCities = Object.values(aggregate.cards).map((card) => card.cities);
  const allScores = Object.values(aggregate.cards).map((card) => card.scores);
  const meanSeries = (list: number[][]): number[] =>
    (list[0] ?? []).map((_, index) => mean(list.map((s) => s[index] ?? 0)));
  const referenceCities = meanSeries(allCities);
  const referenceScores = meanSeries(allScores);
  const mapTypes = [
    ...new Set(
      Object.values(duel.rows).flatMap((row) => Object.keys(row.byMap)),
    ),
  ];
  const rankingRows = duel.rows
    .map((row, index) => {
      const f = ffaRow(row.faction);
      return `<tr><td>${index + 1}</td><th scope="row">${escapeHtml(label(row.faction))}</th>
<td class="num">${row.rating > 0 ? "+" : ""}${fixed(row.rating, 0)} <span class="muted">[${fixed(row.ratingLow, 0)}, ${fixed(row.ratingHigh, 0)}]</span></td>
<td class="num">${pct(row.winRate)} <span class="muted">[${pct(row.winLow)}, ${pct(row.winHigh)}]</span></td>
<td class="num">${row.winsElimination}+${row.winsCap} / ${row.lossesElimination}+${row.lossesCap}${row.ties > 0 ? ` / ${row.ties}t` : ""}</td>
<td class="num">${row.eliminationRating > 0 ? "+" : ""}${fixed(row.eliminationRating, 0)}</td>
<td class="num">${f === undefined || f.games === 0 ? "–" : `${fixed(f.meanPlace.mean, 2)} <span class="muted">[${fixed(f.meanPlace.low, 2)}, ${fixed(f.meanPlace.high, 2)}]</span>`}</td>
<td class="num">${f === undefined || f.games === 0 ? "–" : pct(f.firsts.rate)}</td>
<td class="num">${fixed(row.meanRounds, 0)}</td></tr>`;
    })
    .join("");
  const mapRows = duel.rows
    .map(
      (row) =>
        `<tr><th scope="row">${escapeHtml(label(row.faction))}</th>${mapTypes
          .map((map) => {
            const entry = row.byMap[map];
            return `<td class="num">${entry === undefined ? "–" : `${pct(entry.wins / Math.max(1, entry.games))} <span class="muted">(${entry.games})</span>`}</td>`;
          })
          .join(
            "",
          )}${row.bySeat.map((seat) => `<td class="num">${pct(seat.wins / Math.max(1, seat.games))}</td>`).join("")}</tr>`,
    )
    .join("");
  const cards = order
    .map((faction) => {
      const card = aggregate.cards[faction];
      if (card === undefined) return "";
      const row = duel.rows.find((item) => item.faction === faction);
      const f = ffaRow(faction);
      const verdict = verdicts.factions?.[faction];
      const unitRows = card.units
        .map(
          (unit) =>
            `<tr class="${unit.inRoster && unit.role !== "FIGHTER" && unit.perGame < 0.25 ? "warn" : ""}"><th scope="row">${escapeHtml(unit.label)}${unit.inRoster ? "" : ' <span class="muted">(reward)</span>'}</th><td class="num">${fixed(unit.perGame, 2)}</td><td class="num">${pct(unit.gamesTrained)}</td><td class="num">${pct(unit.offeredTurnShare)}</td><td class="num">${fixed(unit.kills, 2)}</td><td class="num">${fixed(unit.losses, 2)}</td><td class="muted">${unit.unlock === null ? "start" : escapeHtml(humanize(unit.unlock))}</td></tr>`,
        )
        .join("");
      const abilityRows = card.abilities
        .map(
          (ability) =>
            `<tr class="${ability.share !== null && ability.share < 0.1 && ability.offeredShare >= 0.05 ? "warn" : ""}"><th scope="row">${escapeHtml(humanize(ability.key.replace(":", " ")))}</th><td class="num">${pct(ability.offeredShare)}</td><td class="num">${ability.share === null ? "–" : pct(ability.share)}</td><td class="num">${fixed(ability.usesPerGame, 2)}</td></tr>`,
        )
        .join("");
      const techList = card.techs
        .map(
          (tech) =>
            `<li class="${tech.adoption < 0.1 ? "warn" : ""}" title="adopted in ${pct(tech.adoption)} of games${tech.meanRound === null ? "" : `, mean round ${fixed(tech.meanRound)}`}">${escapeHtml(humanize(tech.tech))} <span class="muted">${pct(tech.adoption)}${tech.meanRound === null ? "" : ` · r${fixed(tech.meanRound, 0)}`}</span></li>`,
        )
        .join("");
      const counters = card.abilityCounters
        .filter((counter) => !counter.name.startsWith("plagueTurnsAtEnd"))
        .map(
          (counter) =>
            `<span class="chip ${counter.perGame === 0 ? "zero" : ""}">${escapeHtml(counter.name)} <b>${fixed(counter.perGame, counter.perGame >= 10 ? 0 : 2)}</b></span>`,
        )
        .join("");
      return `<section class="card" id="f-${faction}">
<header><h3>${escapeHtml(label(faction))}</h3><p class="muted">rank ${order.indexOf(faction) + 1} of ${order.length} in 1v1 · rating ${row === undefined ? "–" : `${row.rating > 0 ? "+" : ""}${fixed(row.rating, 0)}`} · win ${row === undefined ? "–" : pct(row.winRate)} · FFA avg place ${f === undefined || f.games === 0 ? "–" : fixed(f.meanPlace.mean, 2)} · ${card.games} games</p></header>
${verdict === undefined ? "" : `<p class="verdict">${escapeHtml(verdict)}</p>`}
${card.flags.length === 0 ? "" : `<ul class="flags">${card.flags.map((flag) => `<li>${escapeHtml(flag)}</li>`).join("")}</ul>`}
<div class="sparks">${sparkline(card.cities, referenceCities, "Cities per round (1v1)")}${sparkline(card.scores, referenceScores, "Score per round (1v1)")}</div>
<p class="legend-line"><span class="key line"></span> ${escapeHtml(label(faction))} <span class="key ref"></span> all factions (games over carry their final value)</p>
<p><b>1v1 results.</b> Wins ${card.wins.elimination} by elimination, ${card.wins.cap} on score at the cap; losses ${card.losses.elimination} by elimination, ${card.losses.cap} at the cap. ${card.wins.capitalTakenRound > 0 ? `Takes the rival capital around round ${fixed(card.wins.capitalTakenRound, 0)} when it wins` : ""}${card.losses.capitalLostRound > 0 ? `; loses its own around round ${fixed(card.losses.capitalLostRound, 0)} when it loses` : ""}. Captures ${fixed(card.citiesCapturedPerGame)} cities per game; peak ${fixed(card.citiesMaxPerGame)} cities.</p>
<p><b>Economy.</b> ${fixed(card.coins.meanAtEndTurn)} Coins held at End Turn on average (${pct(card.coins.shareAtLeastTen)} of End Turns with 10 or more; ${fixed(card.coins.meanLastFive)} over the last five turns). <b>Naval</b> (Continents and Lakes, ${card.naval.games} games, ${pct(card.naval.meanWaterShare)} water): ${card.naval.hasShips ? `${fixed(card.naval.shipsPerGame, 2)} ships per game, ships in ${pct(card.naval.gamesWithShips)} of games, ` : "no ships in the roster, "}${fixed(card.naval.embarksPerGame, 1)} embarkations per game.</p>
<details open><summary>Units trained</summary><p class="muted">Trained, laid or hired; units from treasure, city rewards and summons are not counted here, but their kills and losses are.</p><table><thead><tr><th>Unit</th><th>Per game</th><th>Games with</th><th>Offered (turns)</th><th>Kills/game</th><th>Losses/game</th><th>Unlocked by</th></tr></thead><tbody>${unitRows}</tbody></table></details>
<details open><summary>Faction-specific commands: offered against used</summary>${abilityRows === "" ? '<p class="muted">No faction-specific command was offered.</p>' : `<table><thead><tr><th>Command</th><th>Offered (share of turns)</th><th>Used when offered</th><th>Uses/game</th></tr></thead><tbody>${abilityRows}</tbody></table>`}</details>
<details><summary>Technologies, in mean research order (share of games · mean round)</summary><ol class="techs">${techList}</ol></details>
${counters === "" ? "" : `<details><summary>Headless ability counters (per 1v1 game; grey = never happened)</summary><div class="chips">${counters}</div></details>`}
</section>`;
    })
    .join("");
  const headline = verdicts.headline ?? [];
  const caveats = verdicts.caveats ?? [];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Faction Strength Tournament</title>
<style>
:root{color-scheme:light;--page:#f9f9f7;--surface:#fcfcfb;--ink:#0b0b0b;--ink2:#52514e;--muted:#898781;--grid:#e1e0d9;--axis:#c3c2b7;--accent:#2a78d6;--warn-bg:#fdf3e1;--border:rgba(11,11,11,0.10)}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){color-scheme:dark;--page:#0d0d0d;--surface:#1a1a19;--ink:#f0efec;--ink2:#c3c2b7;--muted:#898781;--grid:#2c2c2a;--axis:#383835;--accent:#3987e5;--warn-bg:#3a2c12;--border:rgba(255,255,255,0.10)}}
:root[data-theme="dark"]{color-scheme:dark;--page:#0d0d0d;--surface:#1a1a19;--ink:#f0efec;--ink2:#c3c2b7;--muted:#898781;--grid:#2c2c2a;--axis:#383835;--accent:#3987e5;--warn-bg:#3a2c12;--border:rgba(255,255,255,0.10)}
*{box-sizing:border-box}body{margin:0;background:var(--page);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1100px;margin:0 auto;padding:24px 16px 64px}h1{font-size:26px;margin:0 0 4px}h2{font-size:19px;margin:36px 0 8px}h3{margin:0;font-size:17px}
.muted{color:var(--muted)}.lede{color:var(--ink2);max-width:75ch}
.panel,.card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;margin:12px 0;overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:13.5px}th,td{padding:5px 8px;border-bottom:1px solid var(--grid);text-align:left;vertical-align:top}thead th{color:var(--ink2);font-weight:600}
td.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}tr.warn th,tr.warn td{background:var(--warn-bg)}
svg{width:100%;height:auto;display:block;max-width:760px}svg text{fill:var(--ink2);font:12px system-ui,sans-serif}svg .label{fill:var(--ink);font-size:12.5px}svg .tick{fill:var(--muted);font-size:11px}svg .value{fill:var(--ink2);font-size:11.5px}svg .cell{font-size:11.5px;font-variant-numeric:tabular-nums}
svg .grid{stroke:var(--grid);stroke-width:1}svg .axis{stroke:var(--axis);stroke-width:1}svg .ci{stroke:var(--accent);stroke-width:2;stroke-linecap:round;opacity:.55}svg .dot{fill:var(--accent);stroke:var(--surface);stroke-width:2}svg .diag{fill:var(--grid)}
.sparks{display:flex;flex-wrap:wrap;gap:8px}.spark{max-width:300px;flex:1 1 240px}.spark .line{fill:none;stroke:var(--accent);stroke-width:2}.spark .ref{fill:none;stroke:var(--muted);stroke-width:1.5;stroke-dasharray:4 3}
.legend-line{font-size:12.5px;color:var(--ink2);margin:2px 0 10px}.key{display:inline-block;width:18px;height:0;border-top:2px solid var(--accent);vertical-align:middle}.key.ref{border-top:2px dashed var(--muted);margin-left:10px}
.verdict{font-size:15px;border-left:3px solid var(--accent);padding:4px 0 4px 10px;margin:10px 0}
.flags{font-size:13.5px;color:var(--ink2);margin:6px 0 10px;padding-left:20px}
details{margin:8px 0}summary{cursor:pointer;font-weight:600;color:var(--ink2)}
.techs{columns:3 220px;font-size:13px;margin:6px 0}.techs li.warn{color:var(--muted)}
.chips{display:flex;flex-wrap:wrap;gap:6px;font-size:12px}.chip{border:1px solid var(--border);border-radius:999px;padding:2px 8px}.chip.zero{color:var(--muted)}
nav.toc{font-size:13.5px}nav.toc a{color:var(--accent);margin-right:10px}
</style></head><body><main>
<h1>Faction Strength Tournament</h1>
<p class="lede">Normal AI against Normal AI on default skirmishes (Domination, no head start, Free-for-all, curiosities on, quick-start board sizes, maps ${escapeHtml(String((config.mapTypes as string[] | undefined)?.join(", ") ?? ""))}). Phase A: ${totals.duel.matches} 1v1 games, every pairing with both seat orders. Phase B: ${totals.ffa.matches} four-seat free-for-alls with each faction drawn equally often. A game still running at the round cap (${String(config.maxRounds)} rounds in 1v1, ${String(config.ffaMaxRounds)} in FFA) is decided by the game's own score and counted separately. Generated ${new Date().toISOString().slice(0, 10)}.</p>
<p class="muted">Capped: ${totals.duel.capped} of ${totals.duel.matches} 1v1 (${pct(totals.duel.capped / Math.max(1, totals.duel.matches))}${totals.duel.cappedTies > 0 ? `, ${totals.duel.cappedTies} score ties` : ""}), ${totals.ffa.capped} of ${totals.ffa.matches} FFA (${pct(totals.ffa.capped / Math.max(1, totals.ffa.matches))}). Failed matches: ${totals.duel.failed + totals.ffa.failed}. Mean length ${fixed(totals.duel.meanRounds, 0)} rounds (1v1), ${fixed(totals.ffa.meanRounds, 0)} (FFA). First-mover seat won ${pct(duel.seatZero.rate)} [${pct(duel.seatZero.low)}, ${pct(duel.seatZero.high)}] of decided 1v1 games.</p>
<nav class="toc">${order.map((faction) => `<a href="#f-${faction}">${escapeHtml(label(faction))}</a>`).join("")}</nav>
${headline.length === 0 ? "" : `<h2>Headline</h2><div class="panel"><ul>${headline.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul></div>`}
<h2>Ranking</h2>
<div class="panel">${ratingChart(duel.rows)}</div>
<div class="panel"><table><thead><tr><th>#</th><th>Faction</th><th>1v1 rating [95%]</th><th>1v1 win rate [95%]</th><th>W elim+cap / L elim+cap</th><th>Rating, elimination games only</th><th>FFA avg place [95%]</th><th>FFA 1st</th><th>Avg rounds</th></tr></thead><tbody>${rankingRows}</tbody></table>
<p class="muted">Rating: Bradley–Terry on all decided 1v1 games (score-at-cap wins included), 400·log10 strength, with a weak prior of one virtual win and one virtual loss; interval from 400 bootstrap resamples of the games. Win-rate interval: Wilson. The elimination-only rating drops capped games as a check that the cap rule does not drive the ranking.</p></div>
<h2>Head to head (1v1)</h2>
<div class="panel">${heatmap(aggregate.factions, duel.matrix, order)}<p class="muted">Row faction's win rate against the column faction, ${Math.round(duel.games / Math.max(1, (order.length * (order.length - 1)) / 2))} games per pairing. Blue: the row wins; red: the row loses; grey: even. Rows and columns in rating order.</p></div>
<h2>Free-for-all placements</h2>
<div class="panel">${ffa.games === 0 ? "<p>No free-for-alls were played.</p>" : placementChart(ffa.rows)}<p class="muted">Placement: the standing seats by final score (one stands after an elimination win), then the eliminated seats, the last eliminated first.</p></div>
<h2>By map and seat (1v1 win rate)</h2>
<div class="panel"><table><thead><tr><th>Faction</th>${mapTypes.map((map) => `<th>${escapeHtml(humanize(map))}</th>`).join("")}<th>Moving first</th><th>Moving second</th></tr></thead><tbody>${mapRows}</tbody></table></div>
<h2>Faction diagnostics</h2>
<p class="lede">Each card separates "the faction is weak" from "the AI does not use it": highlighted rows are units the faction can train but rarely does, and faction-specific commands the AI was offered (the Normal AI scores exactly the offered list) but seldom chose. Counts cover both phases unless noted.</p>
${cards}
<h2>Method and caveats</h2>
<div class="panel"><ul>
<li>Every seat is played by the same Normal AI; a faction's result is the faction <i>as this AI plays it</i>. Low use of an ability can be a policy gap or a correct choice; the cards show where to look, not a verdict on the mechanic.</li>
<li>Every seat is listed in the setup's human seats, so the engine ends a free-for-all only when one seat stands (rather than when seat 0 falls) and no seat is special. Nothing else in a Normal, no-head-start match reads the controller.</li>
<li>"Offered" is sampled before every command the seat took (${escapeHtml(String(config.sampling))} sampling): a command counts as offered in a turn when it was in the seat's legal list at least once that turn.</li>
<li>Quick-start boards are small (11×11 for 1v1, 14–16 for four seats), so the results describe fast, crowded games; long-game factions may look weaker here than on large maps.</li>
${caveats.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
${totals.duel.errors.length + totals.ffa.errors.length === 0 ? "<li>No AI errors or stalls.</li>" : `<li>AI errors or stalls: ${escapeHtml([...totals.duel.errors, ...totals.ffa.errors].slice(0, 10).join("; "))}</li>`}
<li>CPU time: ${fixed(totals.duel.cpuMinutes, 0)} min (1v1) and ${fixed(totals.ffa.cpuMinutes, 0)} min (FFA), play plus telemetry replay.</li>
</ul></div>
</main></body></html>
`;
}

function summaryMarkdown(
  aggregate: Aggregate,
  config: Record<string, unknown>,
  verdicts: Verdicts,
): string {
  const { duel, ffa, totals } = aggregate;
  const lines: string[] = [];
  lines.push(
    "# Faction strength tournament",
    "",
    `Normal AI vs Normal AI, default skirmishes (Domination, no head start, curiosities on, quick-start board sizes; maps ${String((config.mapTypes as string[] | undefined)?.join(", ") ?? "")}). ${totals.duel.matches} 1v1 games (every pairing, both seat orders) and ${totals.ffa.matches} four-seat free-for-alls. Round caps ${String(config.maxRounds)} (1v1) and ${String(config.ffaMaxRounds)} (FFA); a capped game is decided by score and counted separately: ${totals.duel.capped} capped 1v1 (${pct(totals.duel.capped / Math.max(1, totals.duel.matches))}), ${totals.ffa.capped} capped FFA (${pct(totals.ffa.capped / Math.max(1, totals.ffa.matches))}). Failed matches: ${totals.duel.failed + totals.ffa.failed}. First-mover seat won ${pct(duel.seatZero.rate)} of decided 1v1 games.`,
    "",
  );
  if ((verdicts.headline ?? []).length > 0) {
    lines.push("## Headline", "");
    for (const line of verdicts.headline ?? []) lines.push(`- ${line}`);
    lines.push("");
  }
  lines.push(
    "## Ranking",
    "",
    "| # | Faction | 1v1 rating [95%] | 1v1 win rate [95%] | FFA avg place [95%] | FFA 1st |",
    "| - | ------- | ---------------- | ------------------ | ------------------- | ------- |",
  );
  duel.rows.forEach((row, index) => {
    const f = ffa.rows.find((item) => item.faction === row.faction);
    lines.push(
      `| ${index + 1} | ${label(row.faction)} | ${row.rating > 0 ? "+" : ""}${fixed(row.rating, 0)} [${fixed(row.ratingLow, 0)}, ${fixed(row.ratingHigh, 0)}] | ${pct(row.winRate)} [${pct(row.winLow)}, ${pct(row.winHigh)}] | ${f === undefined || f.games === 0 ? "–" : `${fixed(f.meanPlace.mean, 2)} [${fixed(f.meanPlace.low, 2)}, ${fixed(f.meanPlace.high, 2)}]`} | ${f === undefined || f.games === 0 ? "–" : pct(f.firsts.rate)} |`,
    );
  });
  lines.push("");
  if (verdicts.factions !== undefined) {
    lines.push("## Per-faction read", "");
    for (const row of duel.rows) {
      const text = verdicts.factions[row.faction];
      if (text !== undefined)
        lines.push(`- **${label(row.faction)}**: ${text}`);
    }
    lines.push("");
  }
  if ((verdicts.caveats ?? []).length > 0) {
    lines.push("## Caveats", "");
    for (const line of verdicts.caveats ?? []) lines.push(`- ${line}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}
