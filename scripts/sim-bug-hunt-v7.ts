/**
 * Bug hunt by headless simulation (`pulp_wars-2yc.94`). User-authorised
 * only: it plays whole Normal-AI matches, so it is never part of a routine
 * gate (CLAUDE.md, "no whole-game simulations unless the user asks").
 *
 * It plays a batch of matches covering all nine factions and checks, after
 * every command, the invariants the browser relies on:
 *
 * - the active seat is always offered at least one command, and END_TURN
 *   whenever no reward choice is pending;
 * - every command the Normal AI (or the random seat) picks is offered by
 *   `queryPlayerCommandsV7` and accepted by the reducer without throwing
 *   (and, at every turn start, a sample of other offered commands is
 *   accepted too: offered == accepted);
 * - the replay log appends, the canonical events and the seat-0 projected
 *   events parse, and the presentation's feedback plan builds;
 * - the state parses through the state schema with the same canonical hash;
 * - save -> load round-trips to the same canonical hash, under the size cap;
 * - at every turn start, the queries the browser makes for the seat (views
 *   for every seat, offered commands, economic and combat previews, unit
 *   selections and tile-action plans, the dock, the technology tree, scores)
 *   do not throw;
 * - no AI exception, stall, turn-command cap breach, or slow decision.
 *
 * Usage (drives one child process per match, `--jobs` at a time):
 *
 *   node node_modules/.bin/tsx scripts/sim-bug-hunt-v7.ts --batch ai \
 *     --out <dir> [--jobs 6] [--only 3,5] [--timeout-minutes 40]
 *
 * Batches: `ai` (every seat Normal AI), `random` (seat 0 plays random
 * legal commands, every other seat Normal AI), and `mixed` (seat 0 plays a
 * random legal command 40% of the time, the Normal AI's otherwise).
 * `--seed-offset N` plays the batch on other seeds; `--keep-saves` writes
 * each match's final save to `<dir>/<match>.save.json`. `--repro
 * <failure.json>` reloads a failure and prints its unparsed events. A
 * failure writes
 * `<dir>/<match>-failure-<n>.json` with the seed, setup, command index,
 * actor, command, error, and a repro save (`save`, the state before the
 * failing command, loadable by `parseSaveV7`). Every match writes
 * `<dir>/<match>.json` with its summary and `<dir>/<match>.progress` with
 * its last command index (to locate a hang).
 */
import { spawn } from "node:child_process";
import { registerHooks } from "node:module";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
  NormalPolicyWorkV7,
  chooseNormalTurnCommandV7,
} from "../src/ai/index";
import {
  allowedBoardSizesV7,
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  canonicalJson,
  createPlayableGameV7,
  createReplayV7,
  parseEventEnvelopeV7,
  parseGameStateV7,
  parsePlayerEventEnvelopeV7,
  previewEconomicV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryPublicSelectionV7,
  queryScoreV7,
  queryStarGradeV7,
  queryTechnologyTreeV7,
  queryThreatenedTilesV7,
  scoresV7,
  viewForV7,
  type BoardSizeV7,
  type CommandV7,
  type FactionIdV7,
  type GameModeV7,
  type GameStateV7,
  type MapTypeV7,
  type MatchSetupV7,
  type PlayerViewV7,
  type ReplayFileV7,
} from "../src/engine/index";
import type { PlayerId } from "../src/engine/model/ids";
import {
  MAX_SAVE_BYTES_V7,
  createSaveEnvelopeV7,
  parseSaveV7,
} from "../src/persistence/v7";

// The presentation modules read `import.meta.env` (Vite); outside Vite it
// is undefined, so the loader hook below gives them the production values.
registerHooks({
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (!url.includes("/src/") || result.source === undefined) return result;
    const text =
      typeof result.source === "string"
        ? result.source
        : Buffer.from(result.source as Uint8Array).toString("utf8");
    return text.includes("import.meta.env")
      ? {
          ...result,
          source: text.replaceAll(
            "import.meta.env",
            '({ BASE_URL: "/", DEV: false, PROD: true, MODE: "production" })',
          ),
        }
      : result;
  },
});
const { dockCommandsV7 } = await import("../src/render/blocked-actions-v7");
const { tileActionPlanForSelectionV7 } =
  await import("../src/render/canvas/tile-actions-v7");
const { feedbackPlanV7 } = await import("../src/render/feedback-plan-v7");

interface MatchSpecV7 {
  readonly name: string;
  readonly seed: number;
  readonly factions: readonly FactionIdV7[];
  readonly mapType: MapTypeV7;
  readonly size: BoardSizeV7;
  readonly maxRounds: number;
  readonly curiosities?: boolean;
  readonly gameMode?: GameModeV7;
  readonly headStart?: 5 | 10 | 20;
  readonly cooperative?: boolean;
  /** Seat whose moves are random legal commands. */
  readonly randomSeat?: number;
  /** The share of the random seat's decisions that are random (default 1). */
  readonly randomRate?: number;
}

const F = {
  H: "ORIGINAL",
  U: "UNDEAD",
  G: "GOBLIN",
  D: "DINOSAUR",
  M: "MARTIAN",
  I: "ICE_FOLK",
  W: "DWARF",
  C: "CANDY",
  X: "CULT",
} as const satisfies Record<string, FactionIdV7>;
type FactionLetterV7 = keyof typeof F;
const factions = (letters: string): readonly FactionIdV7[] =>
  [...letters].map((letter) => F[letter as FactionLetterV7]);

const AI_BATCH_V7: readonly MatchSpecV7[] = [
  {
    name: "a01-HX-continents11",
    seed: 101,
    factions: factions("HX"),
    mapType: "CONTINENTS",
    size: 11,
    maxRounds: 90,
  },
  {
    name: "a02-UC-lakes11",
    seed: 102,
    factions: factions("UC"),
    mapType: "LAKES",
    size: 11,
    maxRounds: 90,
  },
  {
    name: "a03-GW-archipelago14",
    seed: 103,
    factions: factions("GW"),
    mapType: "ARCHIPELAGO",
    size: 14,
    maxRounds: 90,
  },
  {
    name: "a04-DI-pangea11",
    seed: 104,
    factions: factions("DI"),
    mapType: "PANGEA",
    size: 11,
    maxRounds: 90,
  },
  {
    name: "a05-MHU-archipelago16",
    seed: 105,
    factions: factions("MHU"),
    mapType: "ARCHIPELAGO",
    size: 16,
    maxRounds: 80,
  },
  {
    name: "a06-XGDM-continents16",
    seed: 106,
    factions: factions("XGDM"),
    mapType: "CONTINENTS",
    size: 16,
    maxRounds: 70,
  },
  {
    name: "a07-IWCH-lakes16",
    seed: 107,
    factions: factions("IWCH"),
    mapType: "LAKES",
    size: 16,
    maxRounds: 70,
  },
  {
    name: "a08-CXW-archipelago14",
    seed: 108,
    factions: factions("CXW"),
    mapType: "ARCHIPELAGO",
    size: 14,
    maxRounds: 80,
  },
  {
    name: "a09-HUGDMI-continents20",
    seed: 109,
    factions: factions("HUGDMI"),
    mapType: "CONTINENTS",
    size: 20,
    maxRounds: 50,
  },
  {
    name: "a10-UGDMIWCX-archipelago20",
    seed: 110,
    factions: factions("UGDMIWCX"),
    mapType: "ARCHIPELAGO",
    size: 20,
    maxRounds: 45,
  },
  {
    name: "a11-XCWIMD-pangea20",
    seed: 111,
    factions: factions("XCWIMD"),
    mapType: "PANGEA",
    size: 20,
    maxRounds: 50,
  },
  {
    name: "a12-WCXHUGD-lakes20",
    seed: 112,
    factions: factions("WCXHUGD"),
    mapType: "LAKES",
    size: 20,
    maxRounds: 45,
  },
  {
    name: "a13-IG-archipelago16-perfection",
    seed: 113,
    factions: factions("IG"),
    mapType: "ARCHIPELAGO",
    size: 16,
    maxRounds: 60,
    gameMode: "PERFECTION",
  },
  {
    name: "a14-UDIX-archipelago20-headstart",
    seed: 114,
    factions: factions("UDIX"),
    mapType: "ARCHIPELAGO",
    size: 20,
    maxRounds: 60,
    headStart: 10,
  },
  {
    name: "a15-MWC-continents14-coop",
    seed: 115,
    factions: factions("MWC"),
    mapType: "CONTINENTS",
    size: 14,
    maxRounds: 60,
    cooperative: true,
  },
];

const RANDOM_BATCH_V7: readonly MatchSpecV7[] = [
  {
    name: "r01-HX-lakes11",
    seed: 201,
    factions: factions("HX"),
    mapType: "LAKES",
    size: 11,
    maxRounds: 60,
    randomSeat: 0,
  },
  {
    name: "r02-UC-archipelago14",
    seed: 202,
    factions: factions("UC"),
    mapType: "ARCHIPELAGO",
    size: 14,
    maxRounds: 60,
    randomSeat: 0,
  },
  {
    name: "r03-GW-continents11",
    seed: 203,
    factions: factions("GW"),
    mapType: "CONTINENTS",
    size: 11,
    maxRounds: 60,
    randomSeat: 0,
  },
  {
    name: "r04-DI-pangea11",
    seed: 204,
    factions: factions("DI"),
    mapType: "PANGEA",
    size: 11,
    maxRounds: 60,
    randomSeat: 0,
  },
  {
    name: "r05-MHU-archipelago16",
    seed: 205,
    factions: factions("MHU"),
    mapType: "ARCHIPELAGO",
    size: 16,
    maxRounds: 50,
    randomSeat: 0,
  },
  {
    name: "r06-IXGD-lakes16",
    seed: 206,
    factions: factions("IXGD"),
    mapType: "LAKES",
    size: 16,
    maxRounds: 50,
    randomSeat: 0,
  },
  {
    name: "r07-WCHU-archipelago16",
    seed: 207,
    factions: factions("WCHU"),
    mapType: "ARCHIPELAGO",
    size: 16,
    maxRounds: 50,
    randomSeat: 0,
  },
  {
    name: "r08-CDM-continents14",
    seed: 208,
    factions: factions("CDM"),
    mapType: "CONTINENTS",
    size: 14,
    maxRounds: 50,
    randomSeat: 0,
  },
  {
    name: "r09-XMIW-archipelago20",
    seed: 209,
    factions: factions("XMIW"),
    mapType: "ARCHIPELAGO",
    size: 20,
    maxRounds: 45,
    randomSeat: 0,
  },
];

/**
 * Seat 0 plays a random legal command 40% of the time and the Normal AI's
 * otherwise, so it lives into the late game (naval play, rewards, giants)
 * while still taking paths the AI never takes. Every faction is seat 0 once.
 */
const MIXED_BATCH_V7: readonly MatchSpecV7[] = (
  [
    ["m01", "HUG", "ARCHIPELAGO", 14],
    ["m02", "UDM", "LAKES", 14],
    ["m03", "GIW", "CONTINENTS", 14],
    ["m04", "DCX", "ARCHIPELAGO", 14],
    ["m05", "MXH", "ARCHIPELAGO", 16],
    ["m06", "IHC", "LAKES", 14],
    ["m07", "WGD", "ARCHIPELAGO", 16],
    ["m08", "CMU", "CONTINENTS", 14],
    ["m09", "XIW", "ARCHIPELAGO", 16],
  ] as const
).map(([id, letters, mapType, size], index) => ({
  name: `${id}-${letters}-${mapType.toLowerCase()}${size}`,
  seed: 301 + index,
  factions: factions(letters),
  mapType,
  size,
  maxRounds: 70,
  randomSeat: 0,
  randomRate: 0.4,
}));

const BATCHES_V7: Readonly<Record<string, readonly MatchSpecV7[]>> = {
  ai: AI_BATCH_V7,
  random: RANDOM_BATCH_V7,
  mixed: MIXED_BATCH_V7,
};

/** A decision slower than this is reported (the browser slices it, but the user waits). */
const SLOW_DECISION_MS = 4_000;
/** An AI turn slower than this in total is reported. */
const SLOW_TURN_MS = 45_000;
/** A human-seat query slower than this is reported (the UI runs it on the main thread). */
const SLOW_QUERY_MS = 1_500;
/** Loading a save replays its whole log; a load slower than this is reported. */
const SLOW_LOAD_MS = 20_000;
const SAMPLED_OFFERED_PER_TURN = 12;
const RANDOM_SEAT_MAX_COMMANDS_PER_TURN = 60;

const args = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};

if (arg("--repro") !== undefined) repro(arg("--repro") ?? "");
else if (arg("--run") !== undefined)
  runChild(arg("--run") ?? "", arg("--out") ?? ".");
else await runDriver();

/**
 * `--repro <failure.json>`: loads the failure's repro save, applies its
 * command, and prints the canonical and seat-0 projected events that do not
 * parse.
 */
function repro(path: string): void {
  const failure = JSON.parse(readFileSync(path, "utf8")) as {
    readonly save: unknown;
    readonly actor: PlayerId;
    readonly command: CommandV7 | null;
  };
  const loaded = parseSaveV7(JSON.stringify(failure.save));
  if (loaded.kind !== "VALID") throw new Error(`Repro save: ${loaded.kind}`);
  const state = loaded.save.state;
  process.stdout.write(
    `round ${state.round} command ${state.commandIndex} actor ${failure.actor}\n`,
  );
  if (failure.command === null) return;
  const applied = applyCommandV7(state, failure.actor, failure.command);
  if (!applied.accepted) {
    process.stdout.write(`rejected ${JSON.stringify(applied.error)}\n`);
    return;
  }
  for (const event of applied.events) {
    const parsed = parseEventEnvelopeV7({
      format: "pulp-wars-events",
      version: 7,
      commandIndex: applied.state.commandIndex,
      events: [event],
    });
    if (!parsed.ok)
      process.stdout.write(
        `canonical ${parsed.field}: ${JSON.stringify(event)}\n`,
      );
  }
  const envelope = projectEventsV7(
    state,
    applied.state,
    state.humanPlayerId,
    applied.events,
  );
  for (const event of envelope.events) {
    const parsed = parsePlayerEventEnvelopeV7({ ...envelope, events: [event] });
    if (!parsed.ok)
      process.stdout.write(
        `projected ${parsed.field}: ${JSON.stringify(event)}\n`,
      );
  }
}

async function runDriver(): Promise<void> {
  const batchName = arg("--batch") ?? "ai";
  const batch = BATCHES_V7[batchName];
  if (batch === undefined) throw new Error(`Unknown batch ${batchName}`);
  const out = arg("--out");
  if (out === undefined) throw new Error("--out <dir> is required");
  mkdirSync(out, { recursive: true });
  const jobs = Number(arg("--jobs") ?? "6");
  const timeoutMs = Number(arg("--timeout-minutes") ?? "40") * 60_000;
  const only = arg("--only")
    ?.split(",")
    .map((value) => Number(value));
  const selected = batch
    .map((spec, index) => ({ spec, index }))
    .filter(({ index }) => only === undefined || only.includes(index + 1));
  const queue = [...selected];
  const results: string[] = [];
  const started = Date.now();
  const worker = async (): Promise<void> => {
    for (;;) {
      const next = queue.shift();
      if (next === undefined) return;
      const line = await runOne(
        batchName,
        next.index,
        next.spec,
        out,
        timeoutMs,
      );
      results.push(line);
      process.stdout.write(`${line}\n`);
    }
  };
  await Promise.all(Array.from({ length: jobs }, () => worker()));
  process.stdout.write(
    `DONE ${batchName}: ${selected.length} matches in ${Math.round((Date.now() - started) / 1000)} s\n`,
  );
}

function runOne(
  batchName: string,
  index: number,
  spec: MatchSpecV7,
  out: string,
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        ...process.execArgv,
        process.argv[1] ?? "scripts/sim-bug-hunt-v7.ts",
        "--run",
        `${batchName}:${index}`,
        "--out",
        out,
        ...(args.includes("--keep-saves") ? ["--keep-saves"] : []),
        ...["--seed-offset", arg("--seed-offset") ?? "0"],
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
      const summaryPath = join(out, `${spec.name}.json`);
      const progressPath = join(out, `${spec.name}.progress`);
      if (signal !== null || !existsSync(summaryPath)) {
        const progress = existsSync(progressPath)
          ? readFileSync(progressPath, "utf8")
          : "none";
        resolve(
          `HANG-OR-CRASH ${spec.name} signal=${String(signal)} code=${String(code)} progress=${progress.trim()} stderr=${stderr.slice(-2000)}`,
        );
        return;
      }
      const summary = JSON.parse(readFileSync(summaryPath, "utf8")) as {
        readonly termination: string;
        readonly rounds: number;
        readonly commands: number;
        readonly failures: number;
        readonly wallSeconds: number;
        readonly maxSaveBytes: number;
        readonly maxLoadMs: number;
        readonly slowest: string;
      };
      resolve(
        `${summary.failures === 0 ? "CLEAN" : "FAILURES"} ${spec.name} failures=${summary.failures} termination=${summary.termination} rounds=${summary.rounds} commands=${summary.commands} wall=${summary.wallSeconds}s maxSave=${summary.maxSaveBytes} maxLoad=${summary.maxLoadMs}ms slowest=${summary.slowest}`,
      );
    });
  });
}

interface FailureV7 {
  readonly check: string;
  readonly message: string;
  readonly commandIndex: number;
  readonly round: number;
  readonly actor: PlayerId | null;
  readonly command: CommandV7 | null;
}

function runChild(id: string, out: string): void {
  const [batchName = "", indexText = ""] = id.split(":");
  const listed = BATCHES_V7[batchName]?.[Number(indexText)];
  if (listed === undefined) throw new Error(`Unknown match ${id}`);
  // `--seed-offset N` replays the batch on other boards.
  const spec: MatchSpecV7 = {
    ...listed,
    seed: listed.seed + Number(arg("--seed-offset") ?? "0"),
  };
  mkdirSync(out, { recursive: true });
  const progressPath = join(out, `${spec.name}.progress`);
  const wallStarted = performance.now();
  const setup = setupFor(spec);
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(`CREATE_REJECTED ${created.error.code}`);
  let state = created.state;
  let replay: ReplayFileV7 = createReplayV7(setup);
  const failures: FailureV7[] = [];
  let failureFiles = 0;
  let maxSaveBytes = 0;
  let maxLoadMs = 0;
  let randomCommands = 0;
  const commandsByKind: Record<string, number> = {};
  let slowestLabel = "none";
  let slowestMs = 0;
  const randomSeed = { value: (spec.seed * 2_654_435_761) >>> 0 };
  const humanId = state.humanPlayerId;
  let turnActor: PlayerId | null = null;
  let commandsThisTurn = 0;
  let turnStartedAt = performance.now();
  let lastRoundChecked = -1;
  let termination = "OUTCOME";
  let reproBefore: {
    readonly state: GameStateV7;
    readonly replay: ReplayFileV7;
  } | null = null;

  const note = (label: string, ms: number): void => {
    if (ms > slowestMs) {
      slowestMs = ms;
      slowestLabel = `${label}@${state.commandIndex}:${Math.round(ms)}ms`;
    }
  };
  const fail = (
    check: string,
    error: unknown,
    actor: PlayerId | null,
    command: CommandV7 | null,
    reproState: GameStateV7 = reproBefore?.state ?? state,
    reproReplay: ReplayFileV7 = reproBefore?.replay ?? replay,
  ): void => {
    const message =
      error instanceof Error
        ? `${error.name}: ${error.message}\n${error.stack ?? ""}`
        : String(error);
    const failure: FailureV7 = {
      check,
      message,
      commandIndex: reproState.commandIndex,
      round: reproState.round,
      actor,
      command,
    };
    failures.push(failure);
    if (failureFiles >= 8) return;
    failureFiles += 1;
    let save: unknown;
    try {
      save = createSaveEnvelopeV7(
        { state: reproState, replay: reproReplay },
        new Date(0).toISOString(),
      );
    } catch (saveError) {
      save = `save failed: ${String(saveError)}`;
    }
    writeFileSync(
      join(out, `${spec.name}-failure-${failureFiles}.json`),
      JSON.stringify(
        { match: spec.name, seed: spec.seed, setup, ...failure, save },
        null,
        1,
      ),
    );
  };
  const guard = <T>(
    check: string,
    actor: PlayerId | null,
    command: CommandV7 | null,
    run: () => T,
    slowMs = SLOW_QUERY_MS,
  ): T | undefined => {
    const started = performance.now();
    try {
      const value = run();
      const ms = performance.now() - started;
      if (check !== "save-load") note(check, ms);
      if (ms > slowMs)
        fail(
          `slow:${check}`,
          `${check} took ${Math.round(ms)} ms`,
          actor,
          command,
        );
      return value;
    } catch (error) {
      fail(check, error, actor, command);
      return undefined;
    }
  };

  const seatQueries = (view: PlayerViewV7, actor: PlayerId): void => {
    const offered = guard("query-commands", actor, null, () =>
      queryPlayerCommandsV7(view),
    );
    if (offered === undefined) return;
    if (offered.length === 0)
      fail(
        "no-offered-command",
        "The active seat is offered nothing",
        actor,
        null,
      );
    if (
      view.pendingChoices.length === 0 &&
      !offered.some((command) => command.kind === "END_TURN")
    )
      fail(
        "no-end-turn",
        "END_TURN is not offered and no choice is pending",
        actor,
        null,
      );
    guard("dock", actor, null, () => dockCommandsV7(view, offered));
    guard("tech-tree", actor, null, () => queryTechnologyTreeV7(view));
    guard("score-query", actor, null, () => queryScoreV7(view));
    guard("star-grade", actor, null, () => queryStarGradeV7(view));
    guard("economic-previews", actor, null, () => {
      for (const command of offered) previewEconomicV7(view, command);
    });
    guard("combat-previews", actor, null, () => {
      for (const command of offered)
        if (command.kind === "ATTACK")
          queryCombatPreviewV7(view, command.unitId, command.targetUnitId);
    });
    for (const unit of view.units) {
      guard("selection-unit", actor, null, () =>
        queryPublicSelectionV7(view, unit.at),
      );
      if (unit.ownerId === view.viewer.id)
        guard("tile-action-plan", actor, null, () =>
          tileActionPlanForSelectionV7(view, offered, unit.id),
        );
      else
        guard("threatened-tiles", actor, null, () =>
          queryThreatenedTilesV7(view, unit.id),
        );
    }
    for (const city of view.cities)
      guard("selection-city", actor, null, () =>
        queryPublicSelectionV7(view, city.at),
      );
  };

  const offeredAcceptedSample = (view: PlayerViewV7, actor: PlayerId): void => {
    const offered = queryPlayerCommandsV7(view);
    const byKind = new Map<string, CommandV7[]>();
    for (const command of offered) {
      const list = byKind.get(command.kind) ?? [];
      list.push(command);
      byKind.set(command.kind, list);
    }
    const sample: CommandV7[] = [];
    const kinds = [...byKind.values()];
    for (
      let pass = 0;
      sample.length < SAMPLED_OFFERED_PER_TURN && pass < 4;
      pass += 1
    )
      for (const list of kinds) {
        if (sample.length >= SAMPLED_OFFERED_PER_TURN) break;
        const pick = list[nextRandom(randomSeed, list.length)];
        if (pick !== undefined && !sample.includes(pick)) sample.push(pick);
      }
    for (const command of sample) {
      try {
        const applied = applyCommandV7(state, actor, command);
        if (!applied.accepted)
          fail(
            "offered-rejected",
            `Offered ${command.kind} rejected: ${applied.error.code} ${JSON.stringify(applied.error.params)}`,
            actor,
            command,
          );
        else {
          // The selection the UI keeps after a command.
          const after = viewForV7(applied.state, actor);
          if ("unitId" in command && applied.state.outcome === null) {
            const afterOffered = queryPlayerCommandsV7(after);
            tileActionPlanForSelectionV7(after, afterOffered, command.unitId);
          }
        }
      } catch (error) {
        fail("offered-throws", error, actor, command);
      }
    }
  };

  const saveRoundTrip = (): void => {
    // What the browser does after an accepted command (queue and flush).
    const serialized = guard("save-write", null, null, () => {
      const envelope = createSaveEnvelopeV7(
        { state, replay },
        new Date(Date.UTC(2026, 9, 17)).toISOString(),
      );
      const text = JSON.stringify(envelope);
      const bytes = new TextEncoder().encode(text).byteLength;
      maxSaveBytes = Math.max(maxSaveBytes, bytes);
      if (bytes > MAX_SAVE_BYTES_V7)
        throw new Error(`Save is ${bytes} bytes, over ${MAX_SAVE_BYTES_V7}`);
      return text;
    });
    if (serialized === undefined) return;
    // What the browser does on resume: it replays the whole command log.
    guard(
      "save-load",
      null,
      null,
      () => {
        const started = performance.now();
        const loaded = parseSaveV7(serialized);
        maxLoadMs = Math.max(maxLoadMs, performance.now() - started);
        if (loaded.kind !== "VALID")
          throw new Error(
            `Save did not load: ${loaded.kind} ${loaded.diagnostic}`,
          );
        if (canonicalHash(loaded.save.state) !== canonicalHash(state))
          throw new Error("Loaded state hash differs");
      },
      SLOW_LOAD_MS,
    );
  };

  while (state.outcome === null) {
    reproBefore = null;
    if (state.round > spec.maxRounds) {
      termination = "ROUND_CAP";
      break;
    }
    if (failures.length >= 25) {
      termination = "TOO_MANY_FAILURES";
      break;
    }
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) {
      fail("no-active-player", "turnOrder has no active seat", null, null);
      termination = "ERROR";
      break;
    }
    const turnStart = actor !== turnActor;
    if (turnStart) {
      if (turnActor !== null && turnActor !== humanId) {
        const turnMs = performance.now() - turnStartedAt;
        if (turnMs > SLOW_TURN_MS)
          fail(
            "slow-ai-turn",
            `AI turn took ${Math.round(turnMs)} ms`,
            turnActor,
            null,
          );
      }
      turnActor = actor;
      commandsThisTurn = 0;
      turnStartedAt = performance.now();
      writeFileSync(
        progressPath,
        `${state.commandIndex} round=${state.round} actor=${actor}\n`,
      );
    }
    if (state.round !== lastRoundChecked && state.activeSeatIndex === 0) {
      lastRoundChecked = state.round;
      if (state.round % 10 === 0 || state.round === 2) saveRoundTrip();
      for (const player of state.turnOrder)
        guard("view-every-seat", player, null, () => viewForV7(state, player));
      guard("scores", null, null, () => scoresV7(state));
    }
    const view = guard("view", actor, null, () => viewForV7(state, actor));
    if (view === undefined) {
      termination = "ERROR";
      break;
    }
    if (turnStart) {
      seatQueries(view, actor);
      offeredAcceptedSample(view, actor);
    }
    const isRandomSeat =
      spec.randomSeat !== undefined && view.viewer.seat === spec.randomSeat;
    let command: CommandV7 | null = null;
    if (
      isRandomSeat &&
      nextRandom(randomSeed, 1000) < (spec.randomRate ?? 1) * 1000
    ) {
      command = randomCommand(view, commandsThisTurn, randomSeed);
      randomCommands += 1;
    } else {
      const started = performance.now();
      try {
        const work = new NormalPolicyWorkV7(view);
        const decision = work.runSlice(Number.MAX_SAFE_INTEGER);
        if (decision === null) throw new Error("Policy work did not drain");
        command = chooseNormalTurnCommandV7(
          view,
          commandsThisTurn,
          NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
          decision,
        );
      } catch (error) {
        fail("ai-policy", error, actor, null);
        termination = "ERROR";
        break;
      }
      const ms = performance.now() - started;
      note("ai-decision", ms);
      if (ms > SLOW_DECISION_MS)
        fail(
          "slow-ai-decision",
          `decision took ${Math.round(ms)} ms`,
          actor,
          command,
        );
    }
    if (command === null) {
      fail("ai-stall", "No command chosen", actor, null);
      termination = "STALL";
      break;
    }
    const encoded = canonicalJson(command);
    if (
      !queryPlayerCommandsV7(view).some(
        (candidate) => canonicalJson(candidate) === encoded,
      )
    ) {
      fail(
        "not-offered",
        `Chosen ${command.kind} is not offered`,
        actor,
        command,
      );
      termination = "ERROR";
      break;
    }
    const before = state;
    let applied: ReturnType<typeof applyCommandV7>;
    try {
      applied = applyCommandV7(state, actor, command);
    } catch (error) {
      fail("reducer-throws", error, actor, command);
      termination = "ERROR";
      break;
    }
    if (!applied.accepted) {
      fail(
        "reducer-rejects",
        `${command.kind} rejected: ${applied.error.code} ${JSON.stringify(applied.error.params)}`,
        actor,
        command,
      );
      termination = "ERROR";
      break;
    }
    if (applied.state.commandIndex !== before.commandIndex + 1) {
      fail("no-progress", "commandIndex did not advance", actor, command);
      termination = "STALL";
      break;
    }
    const replayBefore = replay;
    try {
      replay = appendReplayCommandV7(replay, command, applied.state);
    } catch (error) {
      fail("replay-append", error, actor, command);
      termination = "ERROR";
      break;
    }
    // Checks after the command save the state before it as the repro.
    reproBefore = { state: before, replay: replayBefore };
    state = applied.state;
    commandsThisTurn += 1;
    commandsByKind[command.kind] = (commandsByKind[command.kind] ?? 0) + 1;
    const events = applied.events;
    guard("event-schema", actor, command, () => {
      const parsed = parseEventEnvelopeV7({
        format: "pulp-wars-events",
        version: 7,
        commandIndex: state.commandIndex,
        events,
      });
      if (!parsed.ok) {
        const bad = events.find(
          (event) =>
            !parseEventEnvelopeV7({
              format: "pulp-wars-events",
              version: 7,
              commandIndex: state.commandIndex,
              events: [event],
            }).ok,
        );
        throw new Error(
          `Event envelope invalid at ${parsed.field}: ${JSON.stringify(bad).slice(0, 400)}`,
        );
      }
    });
    // The browser's accepted boundary for the human seat.
    guard("human-boundary", actor, command, () => {
      const beforeView = viewForV7(before, humanId);
      const afterView = viewForV7(state, humanId);
      const envelope = projectEventsV7(before, state, humanId, events);
      const parsed = parsePlayerEventEnvelopeV7(envelope);
      if (!parsed.ok) {
        const bad = envelope.events.find(
          (event) =>
            !parsePlayerEventEnvelopeV7({ ...envelope, events: [event] }).ok,
        );
        throw new Error(
          `Player event envelope invalid at ${parsed.field}: ${JSON.stringify(bad).slice(0, 400)}`,
        );
      }
      feedbackPlanV7(beforeView, envelope, afterView);
      if (state.outcome === null && "unitId" in command && actor === humanId)
        tileActionPlanForSelectionV7(
          afterView,
          queryPlayerCommandsV7(afterView),
          command.unitId,
        );
    });
    if (command.kind === "END_TURN") {
      guard("project-every-seat", actor, command, () => {
        for (const player of state.turnOrder)
          if (player !== humanId)
            projectEventsV7(before, state, player, events);
      });
      guard("state-schema", actor, command, () => {
        const parsed = parseGameStateV7(JSON.parse(JSON.stringify(state)));
        if (parsed === null) throw new Error("State schema rejected the state");
        if (canonicalHash(parsed) !== canonicalHash(state))
          throw new Error("Parsed state hash differs");
      });
    }
  }
  if (state.outcome !== null) termination = "OUTCOME";
  saveRoundTrip();
  if (args.includes("--keep-saves"))
    writeFileSync(
      join(out, `${spec.name}.save.json`),
      JSON.stringify(
        createSaveEnvelopeV7({ state, replay }, new Date(0).toISOString()),
      ),
    );
  writeFileSync(
    join(out, `${spec.name}.json`),
    JSON.stringify(
      {
        match: spec.name,
        seed: spec.seed,
        setup,
        termination,
        outcome: state.outcome,
        rounds: state.round,
        commands: state.commandIndex,
        failures: failures.length,
        failureList: failures.map((failure) => ({
          ...failure,
          message: failure.message.slice(0, 600),
        })),
        wallSeconds: Math.round((performance.now() - wallStarted) / 1000),
        maxSaveBytes,
        maxLoadMs: Math.round(maxLoadMs),
        slowest: slowestLabel,
        randomCommands,
        commandsByKind,
        alivePlayers: state.players.filter(
          (player) => player.status === "ACTIVE",
        ).length,
      },
      null,
      1,
    ),
  );
}

function setupFor(spec: MatchSpecV7): MatchSetupV7 {
  const seats = spec.factions.length;
  const allowed = allowedBoardSizesV7(spec.mapType, seats);
  const size =
    allowed.find((width) => width >= spec.size) ?? allowed.at(-1) ?? spec.size;
  return {
    rulesetId: "pulp-wars-poc-7r98",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    seed: spec.seed,
    width: size,
    height: size,
    aiCount: (seats - 1) as MatchSetupV7["aiCount"],
    aiDifficulty: "NORMAL",
    aiMode: spec.cooperative === true ? "COOPERATIVE" : "RIVAL",
    humanColor: "CORAL",
    factions: spec.factions,
    mapType: spec.mapType,
    curiosities: spec.curiosities ?? true,
    gameMode: spec.gameMode ?? "DOMINATION",
    ...(spec.headStart === undefined
      ? {}
      : { aiHeadStart: { coins: spec.headStart } }),
  };
}

/** Mulberry32 step on a mutable seed; returns an integer in [0, bound). */
function nextRandom(seed: { value: number }, bound: number): number {
  seed.value = (seed.value + 0x6d2b79f5) >>> 0;
  let t = seed.value;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const unit = ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  return Math.floor(unit * Math.max(1, bound));
}

/**
 * A random legal command: a kind first (uniform over the offered kinds, so
 * rare abilities are tried), then a command of that kind. END_TURN is drawn
 * rarely until the turn has had its share of commands.
 */
function randomCommand(
  view: PlayerViewV7,
  commandsThisTurn: number,
  seed: { value: number },
): CommandV7 | null {
  const offered = queryPlayerCommandsV7(view);
  if (offered.length === 0) return null;
  const endTurn = offered.find((command) => command.kind === "END_TURN");
  if (
    endTurn !== undefined &&
    (commandsThisTurn >= RANDOM_SEAT_MAX_COMMANDS_PER_TURN ||
      nextRandom(seed, 100) < 4)
  )
    return endTurn;
  const byKind = new Map<string, CommandV7[]>();
  for (const command of offered) {
    if (command.kind === "END_TURN" && offered.length > 1) continue;
    const list = byKind.get(command.kind) ?? [];
    list.push(command);
    byKind.set(command.kind, list);
  }
  const kinds = [...byKind.values()];
  const list = kinds[nextRandom(seed, kinds.length)] ?? [];
  return list[nextRandom(seed, list.length)] ?? endTurn ?? offered[0] ?? null;
}
