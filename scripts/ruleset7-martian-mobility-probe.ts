/**
 * The human-style Martian mobility probe (`pulp_wars-1wy.2`,
 * docs/product/RULESET_7_BALANCE_MARTIAN_ICE.md section 8.2).
 *
 * Plays every cell (opponent faction x board size x seat order x seed) on a
 * Dry Land map twice: once with `MARTIAN_MOBILITY_PROBE` on the Martian seat
 * (the Normal AI plus the probe's overrides: pull, focus fire, extract,
 * deliver, reposition, carrier production) and once with the plain Normal AI
 * on the Martian seat (the comparison on the same seeds). The opponent is
 * always the Normal AI.
 *
 * It reports the probe's and the Normal Martian AI's win rate per opponent
 * and mixed, the probe's commands by rule, and the Martian seat's tool
 * usage per game (Tractor Beams, Beam Downs by kind, Mind Controls, attacks
 * from two tiles, kills of pulled units).
 *
 * The default run is small (the standing coarse-balance policy): 11 x 11
 * with two seeds and 14 x 14 with one, both seat orders, six opponents: 36
 * cells, 72 matches. Larger runs only through explicit flags.
 *
 * Usage:
 *   npm run probe:martian-mobility -- [--sizes 11,14] [--seeds 2,1]
 *     [--first-seed 0] [--opponents ORIGINAL,UNDEAD,GOBLIN,DINOSAUR,ICE_FOLK,DWARF]
 *     [--max-rounds 150] [--jobs N] [--output file.json] [--markdown]
 *
 * `--seeds` gives the seed count per size in `--sizes` order (one value
 * applies to every size); seeds are `first-seed .. first-seed + N - 1`.
 * Every match is independent and seeded, so results do not depend on
 * `--jobs`. `--markdown` prints the report tables instead of the JSON
 * summary.
 */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import {
  runMartianMobilityProbeMatchV7,
  type MobilityProbeGameV7,
  type MobilityProbeUsageV7,
} from "../src/headless/martian-mobility-probe-match-v7";
import {
  MOBILITY_PROBE_TOOLS_V7,
  type MobilityProbeToolV7,
} from "../src/headless/martian-mobility-probe-v7";
import {
  FACTION_IDS_V7,
  RULESET_7_ID,
  type BoardSizeV7,
  type FactionIdV7,
  type MatchSetupV7,
  type UnitRoleIdV7,
} from "../src/engine/v7/types";

interface Cell {
  readonly opponent: FactionIdV7;
  readonly size: BoardSizeV7;
  readonly seed: number;
  /** The Martian seat: 0 moves first. */
  readonly martianSeat: 0 | 1;
  readonly maxRounds: number;
}

interface CellResult extends Cell {
  readonly probe: MobilityProbeGameV7;
  readonly normal: MobilityProbeGameV7;
}

function setupFor(cell: Cell): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V3",
    curiosities: false,
    seed: cell.seed,
    width: cell.size,
    height: cell.size,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions:
      cell.martianSeat === 0
        ? ["MARTIAN", cell.opponent]
        : [cell.opponent, "MARTIAN"],
    mapType: "DRY_LAND",
  };
}

function runCell(cell: Cell): CellResult {
  const setup = setupFor(cell);
  return {
    ...cell,
    probe: runMartianMobilityProbeMatchV7(setup, {
      probe: true,
      maxRounds: cell.maxRounds,
    }),
    normal: runMartianMobilityProbeMatchV7(setup, {
      probe: false,
      maxRounds: cell.maxRounds,
    }),
  };
}

async function runWorker(): Promise<void> {
  const lines = createInterface({ input: process.stdin });
  for await (const line of lines) {
    if (line.trim() === "") continue;
    const cell = JSON.parse(line) as Cell;
    process.stdout.write(`${JSON.stringify(runCell(cell))}\n`);
  }
}

async function runCells(
  cells: readonly Cell[],
  jobs: number,
): Promise<CellResult[]> {
  const queue = [...cells].sort((left, right) => right.size - left.size);
  const results: CellResult[] = [];
  const script = fileURLToPath(import.meta.url);
  const tsx = resolve("node_modules/tsx/dist/cli.mjs");
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
        createInterface({ input: child.stdout }).on("line", (line) => {
          results.push(JSON.parse(line) as CellResult);
          process.stderr.write(`${results.length}/${cells.length}\n`);
          next();
        });
        child.on("error", fail);
        child.on("exit", (code) =>
          code === 0 ? done() : fail(new Error(`worker exited ${code}`)),
        );
        next();
      }),
  );
  await Promise.all(workers);
  const order = (cell: Cell) =>
    [
      FACTION_IDS_V7.indexOf(cell.opponent),
      cell.size,
      cell.seed,
      cell.martianSeat,
    ] as const;
  return results.sort((left, right) => {
    const a = order(left);
    const b = order(right);
    for (let index = 0; index < a.length; index += 1) {
      const difference = (a[index] ?? 0) - (b[index] ?? 0);
      if (difference !== 0) return difference;
    }
    return 0;
  });
}

// --- Aggregation --------------------------------------------------------------

type Arm = "probe" | "normal";

interface Rate {
  readonly games: number;
  readonly decided: number;
  readonly martianWins: number;
  readonly roundCaps: number;
  readonly errors: number;
  /** Martian wins per decided game, in percent (null without one). */
  readonly winPercent: number | null;
}

function rate(games: readonly MobilityProbeGameV7[]): Rate {
  const decided = games.filter((game) => game.termination === "DECIDED");
  const wins = decided.filter((game) => game.martianWon === true).length;
  return {
    games: games.length,
    decided: decided.length,
    martianWins: wins,
    roundCaps: games.filter((game) => game.termination === "ROUND_CAP").length,
    errors: games.filter((game) => game.termination === "ERROR").length,
    winPercent:
      decided.length === 0
        ? null
        : Math.round((1000 * wins) / decided.length) / 10,
  };
}

const NUMERIC_USAGE = [
  "turns",
  "tractorUnitTurns",
  "beamUnitTurns",
  "tractorBeams",
  "tractorBeamsHostile",
  "tractorBeamsOwn",
  "tractorBeamsOffCenter",
  "citiesFellAfterPull",
  "pulledKills",
  "beamDowns",
  "beamDownsCity",
  "beamDownsPickUp",
  "beamDownsExtraction",
  "beamDownsAfterMove",
  "passengersAttackedOnArrival",
  "mindControls",
  "attacks",
  "attacksFromRange",
  "kills",
  "losses",
  "citiesCaptured",
] as const satisfies readonly (keyof MobilityProbeUsageV7)[];
type NumericUsage = (typeof NUMERIC_USAGE)[number];

const perGame = (total: number, games: number): number =>
  games === 0 ? 0 : Math.round((100 * total) / games) / 100;

function usageSummary(games: readonly MobilityProbeGameV7[]) {
  const total = Object.fromEntries(
    NUMERIC_USAGE.map((field) => [
      field,
      games.reduce((sum, game) => sum + game.usage[field], 0),
    ]),
  ) as Record<NumericUsage, number>;
  const trained: Partial<Record<UnitRoleIdV7, number>> = {};
  for (const game of games)
    for (const [role, count] of Object.entries(game.usage.trained))
      trained[role as UnitRoleIdV7] =
        (trained[role as UnitRoleIdV7] ?? 0) + count;
  const firstCarrier = games
    .flatMap((game) =>
      game.usage.firstCarrierRound === null
        ? []
        : [game.usage.firstCarrierRound],
    )
    .sort((left, right) => left - right);
  return {
    total,
    perGame: Object.fromEntries(
      NUMERIC_USAGE.map((field) => [
        field,
        perGame(total[field], games.length),
      ]),
    ) as Record<NumericUsage, number>,
    trainedPerGame: Object.fromEntries(
      Object.entries(trained)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([role, count]) => [role, perGame(count, games.length)]),
    ),
    gamesWithCarrier: firstCarrier.length,
    firstCarrierRoundMedian:
      firstCarrier[Math.floor(firstCarrier.length / 2)] ?? null,
    gamesWithTractorBeam: games.filter((game) => game.usage.tractorBeams > 0)
      .length,
    gamesWithBeamDown: games.filter((game) => game.usage.beamDowns > 0).length,
    gamesWithMindControl: games.filter((game) => game.usage.mindControls > 0)
      .length,
    tractorBeamsPerTractorUnitTurn:
      total.tractorUnitTurns === 0
        ? null
        : Math.round((1000 * total.tractorBeams) / total.tractorUnitTurns) /
          1000,
    beamDownsPerBeamUnitTurn:
      total.beamUnitTurns === 0
        ? null
        : Math.round((1000 * total.beamDowns) / total.beamUnitTurns) / 1000,
    attacksFromRangePercent:
      total.attacks === 0
        ? null
        : Math.round((1000 * total.attacksFromRange) / total.attacks) / 10,
    meanRounds: perGame(
      games.reduce((sum, game) => sum + game.rounds, 0),
      games.length,
    ),
  };
}

function summarise(results: readonly CellResult[], opponents: FactionIdV7[]) {
  const arm = (which: Arm) => {
    const games = results.map((result) => result[which]);
    return {
      mixed: rate(games),
      byOpponent: Object.fromEntries(
        opponents.map((opponent) => [
          opponent,
          rate(
            results
              .filter((result) => result.opponent === opponent)
              .map((result) => result[which]),
          ),
        ]),
      ),
      bySize: Object.fromEntries(
        [...new Set(results.map((result) => result.size))].map((size) => [
          String(size),
          rate(
            results
              .filter((result) => result.size === size)
              .map((result) => result[which]),
          ),
        ]),
      ),
      bySeat: {
        first: rate(
          results
            .filter((result) => result.martianSeat === 0)
            .map((result) => result[which]),
        ),
        second: rate(
          results
            .filter((result) => result.martianSeat === 1)
            .map((result) => result[which]),
        ),
      },
      usage: usageSummary(games),
    };
  };
  const probeGames = results.map((result) => result.probe);
  const toolTotals = Object.fromEntries(
    MOBILITY_PROBE_TOOLS_V7.map((tool) => [
      tool,
      probeGames.reduce((sum, game) => sum + game.tools[tool], 0),
    ]),
  ) as Record<MobilityProbeToolV7, number>;
  return {
    probe: arm("probe"),
    normal: arm("normal"),
    probeTools: {
      total: toolTotals,
      perGame: Object.fromEntries(
        MOBILITY_PROBE_TOOLS_V7.map((tool) => [
          tool,
          perGame(toolTotals[tool], probeGames.length),
        ]),
      ),
    },
    /** Same seed, same seats: who did better. */
    paired: {
      bothWon: results.filter(
        (result) =>
          result.probe.martianWon === true && result.normal.martianWon === true,
      ).length,
      probeOnly: results.filter(
        (result) =>
          result.probe.martianWon === true && result.normal.martianWon !== true,
      ).length,
      normalOnly: results.filter(
        (result) =>
          result.probe.martianWon !== true && result.normal.martianWon === true,
      ).length,
      neither: results.filter(
        (result) =>
          result.probe.martianWon !== true && result.normal.martianWon !== true,
      ).length,
    },
  };
}

// --- Markdown -----------------------------------------------------------------

function markdown(
  summary: ReturnType<typeof summarise>,
  results: readonly CellResult[],
  opponents: readonly FactionIdV7[],
): string {
  const cell = (value: Rate) =>
    `${value.martianWins}/${value.decided} (${value.winPercent ?? "n/a"}%)`;
  const lines: string[] = [];
  lines.push(
    "| Opponent | Games | Probe wins | Normal Martian wins | Probe round caps | Normal round caps |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
  );
  for (const opponent of opponents) {
    const probe = summary.probe.byOpponent[opponent];
    const normal = summary.normal.byOpponent[opponent];
    if (probe === undefined || normal === undefined) continue;
    lines.push(
      `| ${opponent} | ${probe.games} | ${cell(probe)} | ${cell(normal)} | ${probe.roundCaps} | ${normal.roundCaps} |`,
    );
  }
  lines.push(
    `| **Mixed** | ${summary.probe.mixed.games} | ${cell(summary.probe.mixed)} | ${cell(summary.normal.mixed)} | ${summary.probe.mixed.roundCaps} | ${summary.normal.mixed.roundCaps} |`,
    "",
    "| Usage per Martian seat-game | Probe | Normal Martian |",
    "| --- | ---: | ---: |",
  );
  for (const field of NUMERIC_USAGE)
    lines.push(
      `| ${field} | ${summary.probe.usage.perGame[field]} | ${summary.normal.usage.perGame[field]} |`,
    );
  lines.push(
    "",
    "| Probe rule | Commands | Per game |",
    "| --- | ---: | ---: |",
  );
  for (const tool of MOBILITY_PROBE_TOOLS_V7)
    lines.push(
      `| ${tool} | ${summary.probeTools.total[tool]} | ${summary.probeTools.perGame[tool]} |`,
    );
  lines.push(
    "",
    "| Opponent | Size | Seed | Martian seat | Probe | Rounds | Normal | Rounds | Probe pulls | Probe beams | Probe Mind Controls |",
    "| --- | ---: | ---: | ---: | --- | ---: | --- | ---: | ---: | ---: | ---: |",
  );
  const outcome = (game: MobilityProbeGameV7) =>
    game.termination !== "DECIDED"
      ? game.termination
      : game.martianWon === true
        ? "win"
        : "loss";
  for (const result of results)
    lines.push(
      `| ${result.opponent} | ${result.size} | ${result.seed} | ${result.martianSeat === 0 ? "first" : "second"} | ${outcome(result.probe)} | ${result.probe.rounds} | ${outcome(result.normal)} | ${result.normal.rounds} | ${result.probe.usage.tractorBeams} | ${result.probe.usage.beamDowns} | ${result.probe.usage.mindControls} |`,
    );
  return lines.join("\n");
}

// --- Main ---------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const valueAfter = (flag: string) => {
    const index = args.indexOf(flag);
    return index === -1 ? undefined : args[index + 1];
  };
  const sizes = (valueAfter("--sizes") ?? "11,14")
    .split(",")
    .map((value) => Number(value) as BoardSizeV7);
  const seedCounts = (valueAfter("--seeds") ?? "2,1")
    .split(",")
    .map((value) => Number(value));
  const firstSeed = Number(valueAfter("--first-seed") ?? 0);
  const maxRounds = Number(valueAfter("--max-rounds") ?? 150);
  const jobs = Number(
    valueAfter("--jobs") ?? Math.max(1, availableParallelism() - 2),
  );
  const opponents = (
    valueAfter("--opponents")?.split(",") ??
    FACTION_IDS_V7.filter((faction) => faction !== "MARTIAN")
  ).map((value) => {
    if (!(FACTION_IDS_V7 as readonly string[]).includes(value))
      throw new RangeError(`Unknown faction ${value}`);
    return value as FactionIdV7;
  });
  const cells: Cell[] = [];
  for (const opponent of opponents)
    sizes.forEach((size, position) => {
      const seeds = seedCounts[position] ?? seedCounts[0] ?? 1;
      for (let seed = firstSeed; seed < firstSeed + seeds; seed += 1)
        for (const martianSeat of [0, 1] as const)
          cells.push({ opponent, size, seed, martianSeat, maxRounds });
    });
  const results = await runCells(cells, jobs);
  const summary = summarise(results, opponents);
  process.stdout.write(
    args.includes("--markdown")
      ? `${markdown(summary, results, opponents)}\n`
      : `${JSON.stringify(summary, null, 2)}\n`,
  );
  const output = valueAfter("--output");
  if (output !== undefined)
    writeFileSync(
      output,
      await format(
        JSON.stringify({
          bead: "pulp_wars-1wy.2",
          rulesetId: RULESET_7_ID,
          parameters: {
            mapType: "DRY_LAND",
            sizes,
            seedCounts,
            firstSeed,
            maxRounds,
            opponents,
          },
          summary,
          games: results,
        }),
        { parser: "json" },
      ),
    );
  const failed = results.filter(
    (result) =>
      result.probe.termination === "ERROR" ||
      result.normal.termination === "ERROR",
  );
  if (failed.length > 0) {
    for (const result of failed)
      process.stderr.write(
        `ERROR ${result.opponent} ${result.size} seed ${result.seed} seat ${result.martianSeat}: ${result.probe.error ?? ""} ${result.normal.error ?? ""}\n`,
      );
    process.exitCode = 1;
  }
}

if (process.argv.includes("--worker")) await runWorker();
else await main();
