/**
 * Headless playtest of the Chapter One campaign missions (`pulp_wars-68k.4`,
 * docs/product/CAMPAIGN.md section 7.1).
 *
 * A fixed mission played Normal AI against Normal AI is one game whatever
 * the seed (the board, the start, and combat are deterministic), so seat 0
 * (the human seat) is the Normal AI with the headless **proxy variation**:
 * each run uses its own variation seed at the given rate. Every chapter
 * mission is played once per variation seed and per faction choice of
 * seat 0, up to the round cap, and each run is replayed to check the AI
 * seat's directive against the section 7.1 bands:
 *
 * - `RUSH`: a hostile land unit stands in the human's territory by round 5.
 * - `NORMAL`: the AI captures or besieges a city of the human's (the
 *   mission must not be a walkover; the band asks for at least 20% of runs).
 * - `HOLD` (with `untilRound` R): before round R, no AI land unit ends an
 *   AI turn more than one tile outside the zone; from round R on, an AI land
 *   unit ends an AI turn outside the zone in at least 50% of the runs where
 *   the AI still has land units then. A unit that came into being during
 *   that AI turn (an Undead Infect or Bite raises a Zombie on its victim's
 *   tile, which may lie anywhere) is counted apart: the leash only governs
 *   relocations, and the risen unit walks back from its next turn.
 * - `GUARD` (garrison n): at every AI End Turn at least `min(n, AI land
 *   units)` stand in the zone. A dead garrison unit is replaced by one that
 *   has to walk in, and an enemy army in the zone keeps it out, so this is
 *   reported as the share of compliant End Turns (CAMPAIGN.md section 8.2).
 *   An End Turn with a unit of yours in the zone is the breach itself, not
 *   a failure of the directive (`pulp_wars-68k.6`: the proxy now breaches);
 *   of the other End Turns at most 2% may fall short (a replacement on its
 *   way in).
 *
 * Every run is independent and deterministic, so the results do not depend
 * on `--jobs`; wall-clock time goes to stderr only.
 *
 * Usage:
 *   npm run playtest:campaign -- [--seeds 20] [--first-seed 1] [--rate 0.15]
 *     [--max-rounds 80] [--missions FRONTIER_1,FRONTIER_2]
 *     [--factions ORIGINAL,GOBLIN] [--jobs N]
 *     [--output-dir docs/validation] [--no-write] [--write] [--strict]
 *     [--runs]
 *
 * Without `--no-write` it writes `CAMPAIGN_TEASER_PLAYTEST.json` and
 * `CAMPAIGN_TEASER_PLAYTEST.md` to the output directory (only for the
 * default full run of every chapter mission; a `--missions`, `--factions`,
 * or other parameter subset prints the summary instead). `--write` also
 * writes them for a run of every chapter mission and faction with another
 * `--seeds` or `--first-seed` (a smaller evidence run; the files state the
 * parameters). `--strict` exits non-zero when a band is missed or a run
 * ends in a policy error, stall, or exception. `--runs` lists every run on
 * stderr.
 */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import { CHAPTER_ONE_V7 } from "../src/campaign/chapter-1";
import { zoneContainsV7 } from "../src/ai/v7-directives";
import {
  RULESET_7_ID,
  applyCommandV7,
  canonicalHash,
  createPlayableGameV7,
  missionByIdV7,
  missionMatchSetupV7,
  missionSeatFactionsV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MissionDefinitionV7,
  type MissionDirectiveV7,
  type PlayerId,
  type RectV7,
} from "../src/engine/index";
import { runAiMatchV7 } from "../src/headless/v7";

const args = process.argv.slice(2);

const isEntryPoint =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

/** Section 7.1 acceptance bands, per chapter mission. */
interface BandV7 {
  readonly winRate: readonly [number, number];
  readonly medianWinningRoundAtLeast: number;
}

const BANDS_V7: Readonly<Record<string, BandV7>> = {
  FRONTIER_1: { winRate: [0.7, 1], medianWinningRoundAtLeast: 8 },
  FRONTIER_2: { winRate: [0.35, 0.9], medianWinningRoundAtLeast: 15 },
  FRONTIER_3: { winRate: [0.3, 0.9], medianWinningRoundAtLeast: 15 },
  FRONTIER_4: { winRate: [0.2, 0.8], medianWinningRoundAtLeast: 20 },
};

/** `RUSH`: a hostile land unit in the human's territory by this round. */
const RUSH_ARRIVAL_ROUND_V7 = 5;
/** `NORMAL`: the AI captures or besieges a human city in this share. */
const NORMAL_PRESSURE_SHARE_V7 = 0.2;
/** `HOLD`: a unit leaves the zone after `untilRound` in this share. */
const HOLD_RELEASE_SHARE_V7 = 0.5;
/**
 * `GUARD`: the share of AI End Turns without a unit of yours in the zone
 * that may fall short of the garrison (a replacement walking in).
 */
const GUARD_TRANSIENT_SHARE_V7 = 0.02;

interface PlaytestCell {
  readonly mission: string;
  readonly faction: FactionIdV7;
  readonly seed: number;
  readonly rate: number;
  readonly maxRounds: number;
}

/** The directive checks of one run (only the AI seat's directive kind). */
interface DirectiveRunCheck {
  readonly kind: MissionDirectiveV7["kind"];
  /** RUSH: the first round a hostile land unit stood in human territory. */
  readonly firstIncursionRound?: number | null;
  /** NORMAL: the AI captured or besieged a human city. */
  readonly pressured?: boolean;
  /**
   * HOLD: AI End Turns before `untilRound` with a unit that stood among the
   * AI's units at its previous End Turn more than one tile out (the leash's
   * concern: a unit that moved or advanced there).
   */
  readonly holdViolations?: number;
  /** HOLD: the largest such distance (0 when every unit was inside). */
  readonly holdWorstDistance?: number;
  /**
   * HOLD: AI End Turns before `untilRound` with a unit more than one tile
   * out that came into being that turn (a Zombie risen from an Infect or a
   * Bite on its victim's tile, which the leash cannot move yet).
   */
  readonly holdRisenOutside?: number;
  /** HOLD: the AI had land units at an End Turn from `untilRound` on. */
  readonly unitsAfterRelease?: boolean;
  /** HOLD: an AI land unit ended an AI turn outside the zone then. */
  readonly leftAfterRelease?: boolean;
  /** HOLD: the first round that happened. */
  readonly firstLeaveRound?: number | null;
  /** GUARD: AI End Turns while the directive was active. */
  readonly guardEndTurns?: number;
  /** GUARD: of those, End Turns with fewer than `min(n, land units)` in. */
  readonly guardShortEndTurns?: number;
  /** GUARD: of the short ones, End Turns with a hostile unit in the zone. */
  readonly guardShortWithEnemyInZone?: number;
}

interface PlaytestEntry extends PlaytestCell {
  readonly result: "WIN" | "LOSS" | "UNFINISHED";
  readonly termination: string;
  readonly rounds: number;
  readonly commands: number;
  readonly errors: number;
  readonly stalls: number;
  /** AI cities the proxy (seat 0) captured. */
  readonly proxyCaptures: number;
  /** Human cities the AI captured. */
  readonly aiCaptures: number;
  /** Rounds in which an AI unit stood on a human city center. */
  readonly besiegedRounds: number;
  readonly check: DirectiveRunCheck;
}

// ---------------------------------------------------------------------------
// One run

function mission(id: string): MissionDefinitionV7 {
  const found = missionByIdV7(id);
  if (found === null) throw new Error(`${id} is not registered`);
  return found;
}

function chebyshevToZone(zone: readonly RectV7[], at: CoordV7): number {
  let best = Number.POSITIVE_INFINITY;
  for (const rect of zone) {
    const dx = Math.max(rect.x0 - at.x, 0, at.x - rect.x1);
    const dy = Math.max(rect.y0 - at.y, 0, at.y - rect.y1);
    best = Math.min(best, Math.max(dx, dy));
  }
  return best;
}

function cityOwnerAt(state: GameStateV7, at: CoordV7): PlayerId | null {
  const tile = state.board.tiles[at.y * state.board.width + at.x];
  if (tile?.territoryCityId === null || tile === undefined) return null;
  return (
    state.cities.find((city) => city.id === tile.territoryCityId)?.ownerId ??
    null
  );
}

function landUnits(state: GameStateV7, owner: PlayerId) {
  return state.units.filter(
    (unit) => unit.ownerId === owner && unit.form === "LAND",
  );
}

function runCell(cell: PlaytestCell): PlaytestEntry {
  const definition = mission(cell.mission);
  const setup = missionMatchSetupV7(definition, cell.faction);
  if (setup === null) throw new Error(`no setup for ${cell.mission}`);
  const result = runAiMatchV7(setup, {
    maxRounds: cell.maxRounds,
    proxyVariation: { seed: cell.seed, rate: cell.rate },
  });
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(created.error.code);
  let state = created.state;
  const human = state.players[0]?.id;
  const ai = state.players[1]?.id;
  if (human === undefined || ai === undefined) throw new Error("no seats");
  const directive: MissionDirectiveV7 = definition.seats[1]?.directive ?? {
    kind: "NORMAL",
  };
  const untilRound =
    directive.kind === "NORMAL" ? undefined : directive.untilRound;
  const active = (round: number): boolean =>
    untilRound === undefined || round < untilRound;

  let firstIncursionRound: number | null = null;
  let pressured = false;
  let holdViolations = 0;
  let holdWorstDistance = 0;
  let holdRisenOutside = 0;
  let unitsAfterRelease = false;
  let leftAfterRelease = false;
  let firstLeaveRound: number | null = null;
  let guardEndTurns = 0;
  let guardShortEndTurns = 0;
  let guardShortWithEnemyInZone = 0;
  let proxyCaptures = 0;
  let aiCaptures = 0;
  const besieged = new Set<number>();

  const observe = (current: GameStateV7): void => {
    for (const unit of current.units) {
      if (unit.ownerId !== ai) continue;
      if (
        unit.form === "LAND" &&
        firstIncursionRound === null &&
        cityOwnerAt(current, unit.at) === human
      )
        firstIncursionRound = current.round;
      const city = current.cities.find(
        (item) => item.at.x === unit.at.x && item.at.y === unit.at.y,
      );
      if (city !== undefined && city.ownerId === human) {
        besieged.add(current.round);
        pressured = true;
      }
    }
  };

  // The AI's units at its previous End Turn: a unit not among them came
  // into being since (trained, raised, or risen from an Infect or Bite).
  let previousEndTurnUnits = new Set(
    state.units.filter((unit) => unit.ownerId === ai).map((unit) => unit.id),
  );
  const atAiEndTurn = (current: GameStateV7): void => {
    const own = landUnits(current, ai);
    const round = current.round;
    if (directive.kind === "HOLD") {
      if (active(round)) {
        let worst = 0;
        let worstRisen = 0;
        for (const unit of own) {
          const distance = chebyshevToZone(directive.zone, unit.at);
          // A Zombie risen where its victim died has not moved yet.
          if (previousEndTurnUnits.has(unit.id))
            worst = Math.max(worst, distance);
          else worstRisen = Math.max(worstRisen, distance);
        }
        holdWorstDistance = Math.max(holdWorstDistance, worst);
        if (worst > 1) holdViolations += 1;
        if (worstRisen > 1) holdRisenOutside += 1;
      } else if (own.length > 0) {
        unitsAfterRelease = true;
        if (own.some((unit) => !zoneContainsV7(directive.zone, unit.at))) {
          leftAfterRelease = true;
          firstLeaveRound ??= round;
        }
      }
    } else if (directive.kind === "GUARD" && active(round)) {
      guardEndTurns += 1;
      const inside = own.filter((unit) =>
        zoneContainsV7(directive.zone, unit.at),
      ).length;
      if (inside < Math.min(directive.garrison, own.length)) {
        guardShortEndTurns += 1;
        if (
          current.units.some(
            (unit) =>
              unit.ownerId === human && zoneContainsV7(directive.zone, unit.at),
          )
        )
          guardShortWithEnemyInZone += 1;
      }
    }
    previousEndTurnUnits = new Set(
      current.units
        .filter((unit) => unit.ownerId === ai)
        .map((unit) => unit.id),
    );
  };

  observe(state);
  for (const record of result.commandLog) {
    if (record.playerId === ai && record.command.kind === "END_TURN")
      atAiEndTurn(state);
    const owners = new Map(state.cities.map((city) => [city.id, city.ownerId]));
    const applied = applyCommandV7(state, record.playerId, record.command);
    if (!applied.accepted)
      throw new Error(`replay refused command ${String(record.index)}`);
    state = applied.state;
    for (const city of state.cities) {
      const before = owners.get(city.id);
      if (before === ai && city.ownerId === human) proxyCaptures += 1;
      if (before === human && city.ownerId === ai) {
        aiCaptures += 1;
        pressured = true;
      }
    }
    observe(state);
  }
  if (canonicalHash(state) !== result.stateHash)
    throw new Error("the replayed state differs from the match state");

  const outcome = result.outcome;
  const won =
    outcome !== null &&
    (outcome.kind === "VICTORY" || outcome.kind === "HEADLESS_VICTORY") &&
    outcome.winnerId === human;
  const lost =
    outcome !== null &&
    (outcome.kind === "DEFEAT" ||
      ((outcome.kind === "VICTORY" || outcome.kind === "HEADLESS_VICTORY") &&
        outcome.winnerId !== human));

  const check: DirectiveRunCheck =
    directive.kind === "RUSH"
      ? { kind: "RUSH", firstIncursionRound }
      : directive.kind === "NORMAL"
        ? { kind: "NORMAL", pressured }
        : directive.kind === "HOLD"
          ? {
              kind: "HOLD",
              holdViolations,
              holdWorstDistance,
              holdRisenOutside,
              unitsAfterRelease,
              leftAfterRelease,
              firstLeaveRound,
            }
          : {
              kind: "GUARD",
              guardEndTurns,
              guardShortEndTurns,
              guardShortWithEnemyInZone,
            };
  return {
    ...cell,
    result: won ? "WIN" : lost ? "LOSS" : "UNFINISHED",
    termination: result.termination,
    rounds: result.rounds,
    commands: result.acceptedCommands,
    errors: result.errors.length,
    stalls: result.stalls.length,
    proxyCaptures,
    aiCaptures,
    besiegedRounds: besieged.size,
    check,
  };
}

// ---------------------------------------------------------------------------
// Summary

interface MissionSummary {
  readonly mission: string;
  readonly faction: FactionIdV7;
  readonly directive: MissionDirectiveV7["kind"];
  readonly runs: number;
  readonly wins: number;
  readonly losses: number;
  readonly unfinished: number;
  readonly winRate: number;
  readonly winningRounds: {
    readonly median: number | null;
    readonly min: number | null;
    readonly max: number | null;
  };
  readonly proxyCapturesMean: number;
  readonly aiCapturesRuns: number;
  readonly errors: number;
  readonly stalls: number;
  readonly directiveCheck: Record<string, number | string | boolean | null>;
  readonly band: {
    readonly winRate: readonly [number, number];
    readonly medianWinningRoundAtLeast: number;
    readonly winRateOk: boolean;
    readonly roundsOk: boolean;
    readonly directiveOk: boolean;
  };
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] as number)
    : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function summarize(entries: readonly PlaytestEntry[]): MissionSummary[] {
  const keys = [
    ...new Set(entries.map((entry) => `${entry.mission}:${entry.faction}`)),
  ];
  return keys.map((key) => {
    const group = entries.filter(
      (entry) => `${entry.mission}:${entry.faction}` === key,
    );
    const first = group[0] as PlaytestEntry;
    const band = BANDS_V7[first.mission] ?? {
      winRate: [0, 1] as const,
      medianWinningRoundAtLeast: 0,
    };
    const wins = group.filter((entry) => entry.result === "WIN");
    const winningRounds = wins.map((entry) => entry.rounds);
    const winRate = group.length === 0 ? 0 : wins.length / group.length;
    const medianRound = median(winningRounds);
    const { check, ok } = directiveSummary(group);
    return {
      mission: first.mission,
      faction: first.faction,
      directive: first.check.kind,
      runs: group.length,
      wins: wins.length,
      losses: group.filter((entry) => entry.result === "LOSS").length,
      unfinished: group.filter((entry) => entry.result === "UNFINISHED").length,
      winRate: round3(winRate),
      winningRounds: {
        median: medianRound,
        min: winningRounds.length === 0 ? null : Math.min(...winningRounds),
        max: winningRounds.length === 0 ? null : Math.max(...winningRounds),
      },
      proxyCapturesMean: round3(
        group.reduce((sum, entry) => sum + entry.proxyCaptures, 0) /
          group.length,
      ),
      aiCapturesRuns: group.filter((entry) => entry.aiCaptures > 0).length,
      errors: group.reduce((sum, entry) => sum + entry.errors, 0),
      stalls: group.reduce((sum, entry) => sum + entry.stalls, 0),
      directiveCheck: check,
      band: {
        winRate: band.winRate,
        medianWinningRoundAtLeast: band.medianWinningRoundAtLeast,
        winRateOk: winRate >= band.winRate[0] && winRate <= band.winRate[1],
        roundsOk:
          medianRound !== null && medianRound >= band.medianWinningRoundAtLeast,
        directiveOk: ok,
      },
    };
  });
}

function directiveSummary(group: readonly PlaytestEntry[]): {
  readonly check: Record<string, number | string | boolean | null>;
  readonly ok: boolean;
} {
  const kind = (group[0] as PlaytestEntry).check.kind;
  const checks = group.map((entry) => entry.check);
  if (kind === "RUSH") {
    const rounds = checks.map((item) => item.firstIncursionRound ?? null);
    const onTime = rounds.filter(
      (value) => value !== null && value <= RUSH_ARRIVAL_ROUND_V7,
    ).length;
    const known = rounds.filter((value): value is number => value !== null);
    return {
      check: {
        rule: `a hostile land unit enters your territory by round ${String(RUSH_ARRIVAL_ROUND_V7)} (every run)`,
        runsOnTime: onTime,
        latestFirstIncursionRound:
          known.length === rounds.length ? Math.max(...known) : null,
      },
      ok: onTime === group.length,
    };
  }
  if (kind === "NORMAL") {
    const pressured = checks.filter((item) => item.pressured === true).length;
    return {
      check: {
        rule: `the AI captures or besieges a city of yours in at least ${String(NORMAL_PRESSURE_SHARE_V7 * 100)}% of runs`,
        runsPressured: pressured,
        share: round3(pressured / group.length),
      },
      ok: pressured / group.length >= NORMAL_PRESSURE_SHARE_V7,
    };
  }
  if (kind === "HOLD") {
    const clean = checks.filter((item) => item.holdViolations === 0).length;
    const withUnits = checks.filter((item) => item.unitsAfterRelease === true);
    const left = withUnits.filter(
      (item) => item.leftAfterRelease === true,
    ).length;
    const leaveRounds = checks
      .map((item) => item.firstLeaveRound)
      .filter((value): value is number => typeof value === "number");
    return {
      check: {
        rule: `before untilRound no AI land unit ends an AI turn more than one tile outside the zone (every run; a Zombie risen that turn on its victim's tile is counted apart); afterwards a unit leaves in at least ${String(HOLD_RELEASE_SHARE_V7 * 100)}% of runs where the AI still has land units`,
        runsWithoutViolation: clean,
        worstDistance: Math.max(
          ...checks.map((item) => item.holdWorstDistance ?? 0),
        ),
        endTurnsWithRisenOutside: checks.reduce(
          (sum, item) => sum + (item.holdRisenOutside ?? 0),
          0,
        ),
        runsWithUnitsAfterRelease: withUnits.length,
        runsLeftAfterRelease: left,
        medianFirstLeaveRound: median(leaveRounds),
      },
      ok:
        clean === group.length &&
        (withUnits.length === 0 ||
          left / withUnits.length >= HOLD_RELEASE_SHARE_V7),
    };
  }
  const endTurns = checks.reduce(
    (sum, item) => sum + (item.guardEndTurns ?? 0),
    0,
  );
  const short = checks.reduce(
    (sum, item) => sum + (item.guardShortEndTurns ?? 0),
    0,
  );
  const shortWithEnemy = checks.reduce(
    (sum, item) => sum + (item.guardShortWithEnemyInZone ?? 0),
    0,
  );
  return {
    check: {
      rule: `at every AI End Turn at least min(garrison, AI land units) stand in the zone; an End Turn with a unit of yours in the zone does not count (the breach), and of the others at most ${String(GUARD_TRANSIENT_SHARE_V7 * 100)}% may fall short (a replacement walking in after a garrison death)`,
      endTurns,
      shortEndTurns: short,
      shortWithEnemyInZone: shortWithEnemy,
      compliantShare: endTurns === 0 ? 1 : round3(1 - short / endTurns),
      runsFullyCompliant: checks.filter(
        (item) => (item.guardShortEndTurns ?? 0) === 0,
      ).length,
    },
    ok:
      short - shortWithEnemy <=
      GUARD_TRANSIENT_SHARE_V7 * (endTurns - shortWithEnemy),
  };
}

function markdown(
  summaries: readonly MissionSummary[],
  parameters: Record<string, unknown>,
): string {
  const pct = (value: number) => `${String(Math.round(value * 100))}%`;
  const lines = [
    "# Campaign teaser playtest (Chapter One)",
    "",
    "Generated by `npm run playtest:campaign` (`scripts/campaign-playtest-v7.ts`,",
    "`pulp_wars-68k.4`); bands from [CAMPAIGN.md section 7.1](../product/CAMPAIGN.md#71-headless-playability-npm-run-playtestcampaign).",
    "Seat 0 is the Normal AI with headless proxy variation; the full",
    "per-run data is in `CAMPAIGN_TEASER_PLAYTEST.json`.",
    "",
    `Parameters: ${String(parameters.seeds)} variation seeds from ${String(parameters.firstSeed)}, rate ${String(parameters.rate)}, up to ${String(parameters.maxRounds)} rounds.`,
    "",
    "| Mission | You lead | AI directive | Win rate (band) | Winning rounds: median, range (floor) | Unfinished | AI took a city of yours | Directive check | In band |",
    "| ------- | -------- | ------------ | --------------- | ------------------------------------- | ---------: | ----------------------: | --------------- | ------- |",
  ];
  for (const item of summaries) {
    const rounds = item.winningRounds;
    const range =
      rounds.min === null
        ? "—"
        : `${String(rounds.median)}, ${String(rounds.min)}–${String(rounds.max)}`;
    const band = item.band;
    const inBand = band.winRateOk && band.roundsOk && band.directiveOk;
    lines.push(
      `| ${item.mission} | ${item.faction} | ${item.directive} | ${pct(item.winRate)} (${pct(band.winRate[0])}–${pct(band.winRate[1])}) | ${range} (≥ ${String(band.medianWinningRoundAtLeast)}) | ${String(item.unfinished)} | ${String(item.aiCapturesRuns)}/${String(item.runs)} | ${directiveText(item)} | ${inBand ? "yes" : `no (${[band.winRateOk ? "" : "win rate", band.roundsOk ? "" : "rounds", band.directiveOk ? "" : "directive"].filter(Boolean).join(", ")})`} |`,
    );
  }
  const errors = summaries.reduce(
    (sum, item) => sum + item.errors + item.stalls,
    0,
  );
  lines.push(
    "",
    `Policy errors and stalls across all runs: ${String(errors)}.`,
    "",
  );
  return lines.join("\n");
}

function directiveText(item: MissionSummary): string {
  const check = item.directiveCheck;
  switch (item.directive) {
    case "RUSH":
      return `incursion by round ${String(RUSH_ARRIVAL_ROUND_V7)} in ${String(check.runsOnTime)}/${String(item.runs)} runs (latest first incursion: round ${String(check.latestFirstIncursionRound)})`;
    case "NORMAL":
      return `captured or besieged a city of yours in ${String(check.runsPressured)}/${String(item.runs)} runs`;
    case "HOLD":
      return `no hold violation in ${String(check.runsWithoutViolation)}/${String(item.runs)} runs (worst distance ${String(check.worstDistance)}; ${String(check.endTurnsWithRisenOutside)} End Turns with a Zombie just risen further out); left the zone after release in ${String(check.runsLeftAfterRelease)}/${String(check.runsWithUnitsAfterRelease)} runs with units (median round ${String(check.medianFirstLeaveRound)})`;
    case "GUARD":
      return `garrison held at ${String(check.endTurns === 0 ? 100 : Math.round(Number(check.compliantShare) * 100))}% of ${String(check.endTurns)} End Turns (${String(check.shortEndTurns)} short, ${String(check.shortWithEnemyInZone)} of them with your units in the zone); fully held in ${String(check.runsFullyCompliant)}/${String(item.runs)} runs`;
  }
}

// ---------------------------------------------------------------------------
// Driver

function valueAfter(name: string): string | undefined {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

function nonNegativeInteger(name: string, fallback: number): number {
  const raw = valueAfter(name);
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < 0)
    throw new RangeError(`${name} must be a non-negative integer`);
  return value;
}

function chapterMissionIds(): readonly string[] {
  return CHAPTER_ONE_V7.missions.map((item) => item.missionId);
}

function buildCells(): {
  readonly cells: readonly PlaytestCell[];
  readonly parameters: Record<string, unknown>;
  readonly full: boolean;
  /** Every chapter mission and faction at the standard rate and cap. */
  readonly chapter: boolean;
} {
  const seeds = nonNegativeInteger("--seeds", 20);
  const firstSeed = nonNegativeInteger("--first-seed", 1);
  const maxRounds = nonNegativeInteger("--max-rounds", 80);
  const rate = Number(valueAfter("--rate") ?? "0.15");
  if (!(rate >= 0 && rate <= 1)) throw new RangeError("--rate must be 0–1");
  const all = chapterMissionIds();
  const selected = valueAfter("--missions")?.split(",") ?? all;
  for (const id of selected)
    if (!all.includes(id)) throw new RangeError(`${id} is not in Chapter One`);
  const factions = valueAfter("--factions")?.split(",");
  const cells: PlaytestCell[] = [];
  for (const id of selected) {
    const human = mission(id).seats[0];
    if (human === undefined) throw new Error(`${id} has no seat 0`);
    for (const faction of missionSeatFactionsV7(human).filter(
      (item) => factions === undefined || factions.includes(item),
    ))
      for (let index = 0; index < seeds; index += 1)
        cells.push({
          mission: id,
          faction,
          seed: firstSeed + index,
          rate,
          maxRounds,
        });
  }
  return {
    cells,
    parameters: {
      seeds,
      firstSeed,
      rate,
      maxRounds,
      missions: selected.map((id) => ({
        id,
        revision: mission(id).revision,
      })),
    },
    full:
      factions === undefined &&
      seeds === 20 &&
      firstSeed === 1 &&
      rate === 0.15 &&
      maxRounds === 80 &&
      selected.length === all.length,
    chapter:
      factions === undefined &&
      seeds > 0 &&
      rate === 0.15 &&
      maxRounds === 80 &&
      selected.length === all.length,
  };
}

function cellKey(cell: PlaytestCell): string {
  return `${cell.mission}:${cell.faction}:${String(cell.seed)}`;
}

async function runWorker(): Promise<void> {
  const lines = createInterface({ input: process.stdin });
  for await (const line of lines) {
    if (line.trim() === "") continue;
    const cell = JSON.parse(line) as PlaytestCell;
    try {
      process.stdout.write(`${JSON.stringify(runCell(cell))}\n`);
    } catch (cause) {
      const exception = cause instanceof Error ? cause.message : String(cause);
      process.stdout.write(`${JSON.stringify({ cell, exception })}\n`);
    }
  }
}

async function runParallel(
  cells: readonly PlaytestCell[],
  jobs: number,
): Promise<{
  readonly results: Map<string, PlaytestEntry>;
  readonly exceptions: { cell: PlaytestCell; exception: string }[];
}> {
  const results = new Map<string, PlaytestEntry>();
  const exceptions: { cell: PlaytestCell; exception: string }[] = [];
  // The largest boards first, for load balance.
  const queue = [...cells].sort(
    (left, right) => mission(right.mission).size - mission(left.mission).size,
  );
  const script = fileURLToPath(import.meta.url);
  const tsx = resolve("node_modules/tsx/dist/cli.mjs");
  let completed = 0;
  const workers = Array.from(
    { length: Math.min(jobs, queue.length) },
    () =>
      new Promise<void>((done, fail) => {
        const child = spawn(process.execPath, [tsx, script, "--worker"], {
          stdio: ["pipe", "pipe", "inherit"],
        });
        const next = () => {
          const cell = queue.shift();
          if (cell === undefined) child.stdin.end();
          else child.stdin.write(`${JSON.stringify(cell)}\n`);
        };
        const lines = createInterface({ input: child.stdout });
        lines.on("line", (line) => {
          const parsed = JSON.parse(line) as
            | PlaytestEntry
            | { readonly cell: PlaytestCell; readonly exception: string };
          if ("exception" in parsed) exceptions.push(parsed);
          else results.set(cellKey(parsed), parsed);
          completed += 1;
          if (completed % 10 === 0)
            process.stderr.write(
              `${String(completed)}/${String(cells.length)}\n`,
            );
          next();
        });
        child.on("error", fail);
        child.on("exit", (code) =>
          code === 0
            ? done()
            : fail(new Error(`worker exited ${String(code)}`)),
        );
        next();
      }),
  );
  await Promise.all(workers);
  return { results, exceptions };
}

async function runMain(): Promise<void> {
  const { cells, parameters, full, chapter } = buildCells();
  const jobs = Math.max(
    1,
    nonNegativeInteger("--jobs", Math.max(1, availableParallelism() - 2)),
  );
  const started = performance.now();
  const { results, exceptions } = await runParallel(cells, jobs);
  const entries = cells.flatMap((cell) => {
    const entry = results.get(cellKey(cell));
    return entry === undefined ? [] : [entry];
  });
  for (const item of exceptions)
    process.stderr.write(
      `EXCEPTION ${cellKey(item.cell)}: ${item.exception}\n`,
    );
  const summaries = summarize(entries);
  process.stderr.write(
    `${String(entries.length)} runs in ${String(Math.round((performance.now() - started) / 1000))}s with ${String(jobs)} jobs; ${String(exceptions.length)} exceptions\n`,
  );
  if (args.includes("--runs"))
    for (const entry of entries)
      process.stderr.write(
        `${cellKey(entry)} ${entry.result} round ${String(entry.rounds)} proxy+${String(entry.proxyCaptures)} ai+${String(entry.aiCaptures)} ${JSON.stringify(entry.check)}\n`,
      );
  const text = markdown(summaries, parameters);
  const write =
    (full || (chapter && args.includes("--write"))) &&
    !args.includes("--no-write");
  if (write) {
    const directory = resolve(valueAfter("--output-dir") ?? "docs/validation");
    writeFileSync(
      resolve(directory, "CAMPAIGN_TEASER_PLAYTEST.json"),
      await format(
        JSON.stringify({
          format: "pulp-wars-campaign-teaser-playtest",
          version: 1,
          rulesetId: RULESET_7_ID,
          parameters,
          summary: summaries,
          runs: entries,
        }),
        { parser: "json" },
      ),
    );
    writeFileSync(
      resolve(directory, "CAMPAIGN_TEASER_PLAYTEST.md"),
      await format(text, { parser: "markdown" }),
    );
  }
  process.stdout.write(text);
  const failed =
    exceptions.length > 0 ||
    summaries.some(
      (item) =>
        item.errors > 0 ||
        item.stalls > 0 ||
        !item.band.winRateOk ||
        !item.band.roundsOk ||
        !item.band.directiveOk,
    );
  if (failed && args.includes("--strict")) process.exitCode = 1;
}

// Dispatch last so every module-level constant above is initialized.
if (isEntryPoint && args.includes("--worker")) await runWorker();
else if (isEntryPoint) await runMain();
