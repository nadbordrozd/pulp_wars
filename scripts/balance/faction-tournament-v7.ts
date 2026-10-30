/**
 * Faction strength tournament (`pulp_wars-hblo`). User-authorised only: it
 * plays whole Normal-AI matches, so it is never part of a routine gate
 * (CLAUDE.md, "no whole-game simulations unless the user asks").
 *
 * Phase A is a 1v1 round robin of the factions (every pairing, both seat
 * orders, rotating maps); phase B is free-for-alls whose factions are drawn
 * so that each appears equally often. Every match is a default skirmish:
 * Domination, Normal AI on every seat with no head start, Free-for-all,
 * curiosities on, the quick start's board size for the map and the seat
 * count. Every seat is named in `humanSeats`, so no seat is "the human"
 * whose elimination ends a free-for-all early (the engine then ends the
 * match only when one seat stands; nothing else reads the controller in a
 * Normal match without a head start). A match still going at the round cap
 * is decided by the game's own score and recorded as capped.
 *
 * Usage (one child process per match, `--jobs` at a time):
 *
 *   npm run balance:faction-tournament -- --out <dir outside the repo> \
 *     [--phase both|1v1|ffa] [--games-per-pairing 6] [--ffa-games 36] \
 *     [--ffa-seats 4] [--map-types continents,lakes,pangea] \
 *     [--max-rounds 60] [--ffa-max-rounds 90] [--jobs 8] [--seed-base 7000] \
 *     [--offer-sampling every|turn|none] [--limit N] \
 *     [--timeout-minutes 30] [--report-only]
 *
 * Each match writes `<out>/matches/<id>.json` (a rerun skips matches that
 * already have one, so an interrupted run resumes); the run ends by writing
 * `<out>/aggregate.json`, `<out>/report.html`, and `<out>/summary.md`.
 * `--report-only` rebuilds those three from the match files.
 */
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { regularBoardSizeV7 } from "../../src/engine/v7/game-kind";
import {
  FACTION_IDS_V7,
  type AiCountV7,
  type FactionIdV7,
  type MapTypeV7,
  type MatchSetupV7,
} from "../../src/engine/v7/types";
import { runAiMatchV7, type FactionRoleMetricsV7 } from "../../src/headless/v7";
import {
  ffaScheduleV7,
  roundRobinScheduleV7,
  type TournamentMatchSpecV7,
} from "./faction-tournament-stats-v7";
import {
  collectSeatTelemetryV7,
  type OfferSamplingV7,
} from "./faction-tournament-telemetry-v7";
import { writeTournamentReportV7 } from "./faction-tournament-report-v7";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);

function arg(name: string): string | undefined {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
}
function numberArg(name: string, fallback: number): number {
  const value = arg(name);
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0)
    throw new RangeError(`${name} must be a non-negative integer`);
  return parsed;
}

const MAP_TYPE_FLAGS: Readonly<Record<string, MapTypeV7>> = {
  continents: "CONTINENTS",
  lakes: "LAKES",
  pangea: "PANGEA",
  "dry-land": "DRY_LAND",
  archipelago: "ARCHIPELAGO",
};

export interface TournamentMatchRecordV7 {
  readonly spec: TournamentMatchSpecV7;
  readonly maxRounds: number;
  readonly size: number;
  readonly termination: string;
  /** `ELIMINATION` (one seat stands), `SCORE_AT_CAP`, or `FAILED`. */
  readonly decidedBy: "ELIMINATION" | "SCORE_AT_CAP" | "FAILED";
  /** The winning seat; null on a failure or a score tie at the cap. */
  readonly winnerSeat: number | null;
  readonly rounds: number;
  readonly commands: number;
  readonly wallSeconds: number;
  readonly replaySeconds: number;
  readonly waterShare: number;
  readonly finalScores: readonly number[];
  /** Scores at the end of every completed round, seat-ordered. */
  readonly scoresByRound: readonly (readonly number[])[];
  readonly errors: readonly string[];
  readonly seats: ReturnType<typeof collectSeatTelemetryV7>["seats"];
  /** Per-faction role inventories of the headless metrics. */
  readonly factionRoles: Record<string, FactionRoleMetricsV7 | undefined>;
  /** The headless ability blocks of the factions that have one. */
  readonly abilityBlocks: Record<string, unknown>;
}

if (args.includes("--run")) runChild();
else await runParent();

function setupFor(spec: TournamentMatchSpecV7): MatchSetupV7 {
  const mapType = spec.mapType as MapTypeV7;
  const aiCount = (spec.factions.length - 1) as AiCountV7;
  const size = regularBoardSizeV7(mapType, aiCount);
  return {
    rulesetId: "pulp-wars-poc-7r120",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    seed: spec.seed,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: spec.factions as FactionIdV7[],
    mapType,
    curiosities: true,
    gameMode: "DOMINATION",
    humanSeats: spec.factions.map((_, seat) => seat),
  };
}

function runChild(): void {
  const spec = JSON.parse(arg("--run") ?? "") as TournamentMatchSpecV7;
  const out = arg("--out") ?? "";
  const maxRounds = numberArg("--max-rounds", 60);
  const sampling = (arg("--offer-sampling") ?? "every") as OfferSamplingV7;
  const setup = setupFor(spec);
  const started = performance.now();
  const result = runAiMatchV7(setup, {
    maxRounds,
    maxCommands: 400_000,
    recordCheckpointHashes: false,
  });
  const wallSeconds = (performance.now() - started) / 1000;
  const replayStarted = performance.now();
  const telemetry = collectSeatTelemetryV7(setup, result, sampling);
  const replaySeconds = (performance.now() - replayStarted) / 1000;
  const finalScores = result.state.players.map(
    (player) =>
      result.score.final.find((entry) => entry.playerId === player.id)?.total ??
      0,
  );
  const seatOf = (playerId: number): number =>
    result.state.players.find((player) => player.id === playerId)?.seat ?? -1;
  let decidedBy: TournamentMatchRecordV7["decidedBy"] = "FAILED";
  let winnerSeat: number | null = null;
  if (result.termination === "OUTCOME" && result.outcome?.kind === "VICTORY") {
    decidedBy = "ELIMINATION";
    winnerSeat = seatOf(result.outcome.winnerId);
  } else if (result.termination === "ROUND_CAP") {
    decidedBy = "SCORE_AT_CAP";
    const standing = telemetry.seats.filter(
      (seat) => seat.eliminatedAt === null,
    );
    const best = Math.max(
      ...standing.map((seat) => finalScores[seat.seat] ?? 0),
    );
    const leaders = standing.filter(
      (seat) => (finalScores[seat.seat] ?? 0) === best,
    );
    winnerSeat = leaders.length === 1 ? (leaders[0]?.seat ?? null) : null;
  }
  const factions = new Set(spec.factions);
  const abilityBlocks: Record<string, unknown> = {};
  if (factions.has("UNDEAD")) abilityBlocks.UNDEAD = result.metrics.undead;
  if (factions.has("MARTIAN")) abilityBlocks.MARTIAN = result.metrics.martian;
  if (factions.has("ICE_FOLK")) abilityBlocks.ICE_FOLK = result.metrics.iceFolk;
  if (factions.has("DWARF")) abilityBlocks.DWARF = result.metrics.dwarf;
  if (factions.has("CANDY")) abilityBlocks.CANDY = result.metrics.candy;
  const record: TournamentMatchRecordV7 = {
    spec,
    maxRounds,
    size: setup.width,
    termination: result.termination,
    decidedBy,
    winnerSeat,
    rounds: result.rounds,
    commands: result.acceptedCommands,
    wallSeconds,
    replaySeconds,
    waterShare: telemetry.waterShare,
    finalScores,
    scoresByRound: result.score.perRound.map((round) =>
      result.state.players.map(
        (player) =>
          round.scores.find((entry) => entry.playerId === player.id)?.score ??
          0,
      ),
    ),
    errors: [...result.errors, ...result.stalls].map(
      (item) => `${item.code}: ${item.message}`,
    ),
    seats: telemetry.seats,
    factionRoles: Object.fromEntries(
      spec.factions.map((faction) => [
        faction,
        result.metrics.factionRoles[faction as FactionIdV7],
      ]),
    ),
    abilityBlocks,
  };
  const path = join(out, "matches", `${spec.id}.json`);
  writeFileSync(`${path}.tmp`, JSON.stringify(record));
  renameSync(`${path}.tmp`, path);
}

async function runParent(): Promise<void> {
  const outArg = arg("--out");
  if (outArg === undefined) throw new Error("--out <dir> is required");
  const out = resolve(outArg);
  const fromRepo = relative(REPO_ROOT, out);
  if (fromRepo === "" || (!fromRepo.startsWith("..") && !isAbsolute(fromRepo)))
    throw new Error(`--out must be outside the repository (${REPO_ROOT})`);
  mkdirSync(join(out, "matches"), { recursive: true });
  const phase = arg("--phase") ?? "both";
  if (!["both", "1v1", "ffa"].includes(phase))
    throw new RangeError("--phase must be both, 1v1, or ffa");
  const mapTypes = (arg("--map-types") ?? "continents,lakes,pangea")
    .split(",")
    .map((name) => {
      const mapType = MAP_TYPE_FLAGS[name.trim().toLowerCase()];
      if (mapType === undefined) throw new RangeError(`Unknown map ${name}`);
      return mapType;
    });
  const factions = (arg("--factions") ?? FACTION_IDS_V7.join(","))
    .split(",")
    .map((name) => name.trim().toUpperCase());
  for (const faction of factions)
    if (!FACTION_IDS_V7.includes(faction as FactionIdV7))
      throw new RangeError(`Unknown faction ${faction}`);
  const maxRounds = numberArg("--max-rounds", 60);
  const ffaMaxRounds = numberArg("--ffa-max-rounds", 90);
  const jobs = Math.max(1, numberArg("--jobs", 8));
  const seedBase = numberArg("--seed-base", 7000);
  const sampling = arg("--offer-sampling") ?? "every";
  if (!["every", "turn", "none"].includes(sampling))
    throw new RangeError("--offer-sampling must be every, turn, or none");
  const timeoutMs = numberArg("--timeout-minutes", 30) * 60_000;
  const specs: TournamentMatchSpecV7[] = [];
  if (phase !== "ffa")
    specs.push(
      ...roundRobinScheduleV7({
        factions,
        gamesPerPairing: numberArg("--games-per-pairing", 6),
        mapTypes,
        seedBase,
      }),
    );
  if (phase !== "1v1")
    specs.push(
      ...ffaScheduleV7({
        factions,
        games: numberArg("--ffa-games", 36),
        seats: numberArg("--ffa-seats", 4),
        mapTypes,
        seedBase: seedBase + 50_000,
        drawSeed: seedBase,
      }),
    );
  const limit = arg("--limit");
  const selected = limit === undefined ? specs : specs.slice(0, Number(limit));
  const config = {
    phase,
    mapTypes,
    factions,
    maxRounds,
    ffaMaxRounds,
    jobs,
    seedBase,
    sampling,
    matches: selected.length,
  };
  if (!args.includes("--report-only")) {
    writeFileSync(
      join(out, "plan.json"),
      JSON.stringify({ config, specs: selected }, null, 2),
    );
    const pending = selected.filter(
      (spec) => !existsSync(join(out, "matches", `${spec.id}.json`)),
    );
    process.stdout.write(
      `PLAN ${selected.length} matches (${selected.length - pending.length} done), ${jobs} jobs, caps ${maxRounds} (1v1) and ${ffaMaxRounds} (FFA) rounds\n`,
    );
    const started = Date.now();
    let next = 0;
    let finished = 0;
    const worker = async (): Promise<void> => {
      for (;;) {
        const spec = pending[next];
        next += 1;
        if (spec === undefined) return;
        const line = await runOne(
          spec,
          out,
          spec.phase === "ffa" ? ffaMaxRounds : maxRounds,
          sampling,
          timeoutMs,
        );
        finished += 1;
        process.stdout.write(
          `[${finished}/${pending.length} ${Math.round((Date.now() - started) / 1000)}s] ${line}\n`,
        );
      }
    };
    await Promise.all(Array.from({ length: jobs }, () => worker()));
  }
  const records = readdirSync(join(out, "matches"))
    .filter((name) => name.endsWith(".json"))
    .map(
      (name) =>
        JSON.parse(
          readFileSync(join(out, "matches", name), "utf8"),
        ) as TournamentMatchRecordV7,
    )
    .filter((record) => selected.some((spec) => spec.id === record.spec.id));
  writeTournamentReportV7(out, records, config);
  process.stdout.write(
    `REPORT ${join(out, "report.html")} ${join(out, "summary.md")}\n`,
  );
}

function runOne(
  spec: TournamentMatchSpecV7,
  out: string,
  maxRounds: number,
  sampling: string,
  timeoutMs: number,
): Promise<string> {
  return new Promise((done) => {
    const child = spawn(
      process.execPath,
      [
        ...process.execArgv,
        process.argv[1] ?? "scripts/balance/faction-tournament-v7.ts",
        "--run",
        JSON.stringify(spec),
        "--out",
        out,
        "--max-rounds",
        String(maxRounds),
        "--offer-sampling",
        sampling,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.on("exit", (code, signal) => {
      clearTimeout(timer);
      const path = join(out, "matches", `${spec.id}.json`);
      if (!existsSync(path)) {
        done(
          `FAILED ${spec.id} ${spec.factions.join(",")} code=${String(code)} signal=${String(signal)} ${stderr.slice(-1500)}`,
        );
        return;
      }
      const record = JSON.parse(
        readFileSync(path, "utf8"),
      ) as TournamentMatchRecordV7;
      done(
        `${spec.id} ${spec.mapType} ${spec.factions.join(",")} -> ${record.decidedBy} winner=${String(record.winnerSeat === null ? "-" : spec.factions[record.winnerSeat])} rounds=${record.rounds} cmds=${record.commands} play=${record.wallSeconds.toFixed(0)}s replay=${record.replaySeconds.toFixed(0)}s`,
      );
    });
  });
}
