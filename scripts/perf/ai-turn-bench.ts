/**
 * AI turn latency benchmark (bead `pulp_wars-2yc.99`,
 * docs/architecture/PERFORMANCE.md "AI turns with big armies"). Timing and
 * equivalence on FIXED late states; a match is played only by `generate`,
 * once, to produce them:
 *
 * - `generate --out <dir> [--spec <name>] [--seed n] [--factions A,B]
 *   [--snapshots name:cities:units,...]` plays single Normal AI turns for
 *   every seat from a setup until a seat starts its turn with the named
 *   number of cities and units, and writes that state (`<name>.state.json`)
 *   and a browser save at the human seat's turn before it (`.save.json`,
 *   for `ai-turn-browser.ts`).
 * - `record --dir <d> --out <file> [--seats n]` plays n single AI turns
 *   (default: one round) from each fixed state and writes every command and
 *   resulting state hash.
 * - `check --dir <d> --against <file> [--seats n]` recomputes the record;
 *   any difference fails.
 * - `time --dir <d> [--only <name>] [--repeat n] [--log] [--phases]` times
 *   the active seat's whole AI turn (policy, views, apply; each command with
 *   `--log`, the policy's phases with `--phases`).
 *
 * The checked-in states (`scripts/perf/fixtures/ai-turn/*.state.json.gz`)
 * and their record (`equivalence-2seats.json.gz`, `--seats 2`) came from:
 *
 * - `generate --spec dry-16x16-1v1 --seed 21` (`-10c30u-s21`) and
 *   `--seed 34` (`-10c30u-s34`);
 * - `generate --spec dry-16x16-1v1 --seed 51 --factions DWARF,UNDEAD
 *   --snapshots dry-16x16-1v1-undead-8c50u:8:50,dry-16x16-1v1-undead-10c83u:10:80,dry-16x16-1v1-undead-13c96u:13:96`
 *   (the last is in `extreme/`, not in the record);
 * - `generate --spec pangea-25x25-6seats --seed 41` and `--seed 42` (their
 *   `-peak` states).
 *
 * Check: `tsx scripts/perf/ai-turn-bench.ts check --dir
 * scripts/perf/fixtures/ai-turn --seats 2 --against
 * scripts/perf/fixtures/ai-turn/equivalence-2seats.json.gz`.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";
import {
  NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
  NormalPolicyWorkV7,
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  type NormalAiDecisionV7,
} from "../../src/ai/v7";
import {
  RULESET_7_ID,
  applyCommandV7,
  canonicalHash,
  createPlayableGameV7,
  viewForV7,
  type CommandV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerId,
} from "../../src/engine/index";
import { parseGameStateV7 } from "../../src/engine/v7/state-schema";
import { createSaveEnvelopeV7 } from "../../src/persistence/v7";

interface BenchSpecV7 {
  readonly name: string;
  readonly setup: MatchSetupV7;
  /** Each snapshot: the first turn start of a seat at least this size. */
  readonly snapshots: readonly {
    readonly name: string;
    readonly cities: number;
    readonly units: number;
  }[];
  readonly maxRound: number;
}

function setupV7(
  seed: number,
  size: number,
  mapType: MatchSetupV7["mapType"],
  factions: readonly FactionIdV7[],
): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    seed,
    width: size,
    height: size,
    aiCount: factions.length - 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions,
    mapType,
    curiosities: true,
    gameMode: "DOMINATION",
  } as MatchSetupV7;
}

const SPECS: readonly BenchSpecV7[] = [
  {
    name: "dry-16x16-1v1",
    setup: setupV7(21, 16, "DRY_LAND", ["ORIGINAL", "GOBLIN"]),
    snapshots: [
      { name: "dry-16x16-1v1-6c20u", cities: 6, units: 20 },
      { name: "dry-16x16-1v1-10c30u", cities: 10, units: 30 },
      { name: "dry-16x16-1v1-15c50u", cities: 15, units: 50 },
    ],
    maxRound: 160,
  },
  {
    name: "pangea-25x25-6seats",
    setup: setupV7(22, 25, "PANGEA", [
      "UNDEAD",
      "DWARF",
      "ICE_FOLK",
      "CANDY",
      "MARTIAN",
      "DINOSAUR",
    ]),
    snapshots: [{ name: "pangea-25x25-6seats-12c45u", cities: 12, units: 45 }],
    maxRound: 160,
  },
];

function argument(name: string, fallback?: string): string {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? fallback : process.argv[index + 1];
  if (value === undefined) throw new Error(`${name} is required`);
  return value;
}

function optional(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index < 0 ? null : (process.argv[index + 1] ?? null);
}

function activeIdV7(state: GameStateV7): PlayerId {
  const id = state.turnOrder[state.activeSeatIndex];
  if (id === undefined) throw new Error("no active player");
  return id;
}

function aiCommandV7(state: GameStateV7, commandsThisTurn: number): CommandV7 {
  const view = viewForV7(state, activeIdV7(state));
  const command = chooseNormalTurnCommandV7(
    view,
    commandsThisTurn,
    NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
    chooseNormalCommandV7(view),
  );
  if (command === null) throw new Error("AI returned no command");
  return command;
}

function apply(state: GameStateV7, command: CommandV7): GameStateV7 {
  const applied = applyCommandV7(state, activeIdV7(state), command);
  if (!applied.accepted)
    throw new Error(`rejected ${command.kind}: ${applied.error.code}`);
  return applied.state;
}

function seatSize(state: GameStateV7, id: PlayerId) {
  return {
    cities: state.cities.filter((city) => city.ownerId === id).length,
    units: state.units.filter((unit) => unit.ownerId === id).length,
  };
}

/**
 * Plays single AI turns from the spec's setup (`--seed` replaces its seed)
 * and writes each snapshot when a seat first starts its turn at least that
 * large. A match ends when the human seat falls, so the largest turn start
 * seen (by `min(cities / 15, units / 50)`) is also written as `-peak`.
 */
function generate(
  out: string,
  only: string | null,
  seed: string | null,
  factions: string | null,
  snapshots: string | null,
): void {
  mkdirSync(out, { recursive: true });
  for (const listed of SPECS) {
    if (only !== null && listed.name !== only) continue;
    // `--snapshots name:cities:units,...` replaces the spec's snapshots.
    const spec: BenchSpecV7 =
      snapshots === null
        ? listed
        : {
            ...listed,
            snapshots: snapshots.split(",").map((item) => {
              const [name = "", cities = "0", units = "0"] = item.split(":");
              return { name, cities: Number(cities), units: Number(units) };
            }),
          };
    const setup = {
      ...spec.setup,
      ...(seed === null ? {} : { seed: Number(seed) }),
      ...(factions === null
        ? {}
        : { factions: factions.split(",") as FactionIdV7[] }),
    } as MatchSetupV7;
    const tag = `${spec.name}${seed === null ? "" : `-s${seed}`}${factions === null ? "" : `-${factions.toLowerCase().replace(/,/g, "-")}`}`;
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(`setup ${spec.name} rejected`);
    let state = created.state;
    let commandsThisTurn = 0;
    let commands = 0;
    const started = performance.now();
    let lastRound = 0;
    let next = 0;
    let peak = { score: 0, json: "", note: "", save: "" };
    const log: CommandV7[] = [];
    // The latest start of the human seat's turn, as a browser save: the
    // browser profile resumes it and times the AI seats after End Turn.
    let humanStart = "";
    const elapsed = (): string =>
      `${((performance.now() - started) / 1000).toFixed(0)} s`;
    while (state.outcome === null && state.round <= spec.maxRound) {
      if (commandsThisTurn === 0) {
        const size = seatSize(state, activeIdV7(state));
        if (activeIdV7(state) === state.humanPlayerId)
          humanStart = JSON.stringify(
            createSaveEnvelopeV7(
              {
                state,
                replay: {
                  format: "pulp-wars-replay",
                  version: 7,
                  setup: state.setup,
                  commands: [...log],
                  checkpoints: [],
                },
              },
              "2026-10-25T00:00:00.000Z",
            ),
          );
        if (state.round !== lastRound) {
          lastRound = state.round;
          process.stdout.write(
            `${tag} round ${state.round}: ${state.players
              .map((player) => {
                const each = seatSize(state, player.id);
                return `${player.id}:${each.cities}c/${each.units}u`;
              })
              .join(" ")} (${elapsed()})\n`,
          );
        }
        const note = `round ${state.round}, seat ${activeIdV7(state)} ${size.cities} cities ${size.units} units`;
        const score = Math.min(size.cities / 15, size.units / 50);
        if (score > peak.score)
          peak = { score, json: JSON.stringify(state), note, save: humanStart };
        const snapshot = spec.snapshots[next];
        if (snapshot === undefined) break;
        if (size.cities >= snapshot.cities && size.units >= snapshot.units) {
          const name = `${snapshot.name}${tag.slice(spec.name.length)}`;
          writeFileSync(
            path.join(out, `${name}.state.json`),
            JSON.stringify(state),
          );
          if (humanStart !== "")
            writeFileSync(path.join(out, `${name}.save.json`), humanStart);
          process.stdout.write(`${name}: ${commands} commands, ${note}\n`);
          next += 1;
          continue;
        }
      }
      const command = aiCommandV7(state, commandsThisTurn);
      state = apply(state, command);
      log.push(command);
      commands += 1;
      commandsThisTurn = command.kind === "END_TURN" ? 0 : commandsThisTurn + 1;
    }
    writeFileSync(path.join(out, `${tag}-peak.state.json`), peak.json);
    if (peak.save !== "")
      writeFileSync(path.join(out, `${tag}-peak.save.json`), peak.save);
    process.stdout.write(`${tag}-peak: ${peak.note} (${elapsed()})\n`);
  }
}

/** A text file, gunzipped when its name ends in `.gz` (the checked-in fixtures). */
function readText(file: string): string {
  const bytes = readFileSync(file);
  return (file.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString("utf8");
}

interface FixedStateV7 {
  readonly name: string;
  readonly state: GameStateV7;
}

function loadStates(dir: string, only: string | null): FixedStateV7[] {
  return readdirSync(dir)
    .filter((file) => /\.state\.json(\.gz)?$/.test(file))
    .sort()
    .map((file) => ({
      name: file.replace(/\.state\.json(\.gz)?$/, ""),
      file,
    }))
    .filter((item) => only === null || item.name === only)
    .map(({ name, file }) => {
      const state = parseGameStateV7(
        JSON.parse(readText(path.join(dir, file))) as unknown,
      );
      if (state === null) throw new Error(`${file}: invalid state`);
      return { name, state };
    });
}

interface RecordV7 {
  readonly name: string;
  readonly fixedStateHash: string;
  readonly turns: readonly {
    readonly command: CommandV7;
    readonly stateHash: string;
  }[];
}

/** One round of single AI turns (every seat) from the fixed state. */
function equivalence(fixed: FixedStateV7, seats: number | null): RecordV7 {
  let state = fixed.state;
  const turns: RecordV7["turns"][number][] = [];
  let commandsThisTurn = 0;
  let endTurns = 0;
  const limit = seats ?? state.players.length;
  while (state.outcome === null && endTurns < limit) {
    const command = aiCommandV7(state, commandsThisTurn);
    state = apply(state, command);
    turns.push({ command, stateHash: canonicalHash(state) });
    if (command.kind === "END_TURN") {
      endTurns += 1;
      commandsThisTurn = 0;
    } else commandsThisTurn += 1;
  }
  return {
    name: fixed.name,
    fixedStateHash: canonicalHash(fixed.state),
    turns,
  };
}

/** The policy's decision, timing each phase of its work (`--phases`). */
function decidePhased(
  view: ReturnType<typeof viewForV7>,
  phases: Record<string, number>,
): NormalAiDecisionV7 {
  const work = new NormalPolicyWorkV7(view, () => 0);
  const phaseOf = (): string => (work as unknown as { phase: string }).phase;
  for (;;) {
    const phase = phaseOf();
    const started = performance.now();
    const result = work.advanceWork(1);
    phases[phase] = (phases[phase] ?? 0) + performance.now() - started;
    if (result !== null) return result;
  }
}

/** The active seat's whole turn; policy time per command. */
function timeTurn(
  state: GameStateV7,
  log: boolean,
  phases: Record<string, number> | null,
) {
  const actor = activeIdV7(state);
  let turnState = state;
  let commandsThisTurn = 0;
  let policyMs = 0;
  let viewMs = 0;
  let applyMs = 0;
  let worst = 0;
  const kinds: Record<string, number> = {};
  for (;;) {
    let started = performance.now();
    const view = viewForV7(turnState, actor);
    viewMs += performance.now() - started;
    started = performance.now();
    const before = { ...(phases ?? {}) };
    const command = chooseNormalTurnCommandV7(
      view,
      commandsThisTurn,
      NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
      phases === null
        ? chooseNormalCommandV7(view)
        : decidePhased(view, phases),
    );
    const spent = performance.now() - started;
    if (log) {
      const split =
        phases === null
          ? ""
          : Object.entries(phases)
              .map(([phase, ms]) => [phase, ms - (before[phase] ?? 0)] as const)
              .filter(([, ms]) => ms >= 1)
              .map(([phase, ms]) => `${phase}=${ms.toFixed(0)}`)
              .join(" ");
      process.stdout.write(
        `  ${spent.toFixed(0).padStart(6)} ms ${JSON.stringify(command)} ${split}\n`,
      );
    }
    policyMs += spent;
    worst = Math.max(worst, spent);
    if (command === null) throw new Error("no command");
    kinds[command.kind] = (kinds[command.kind] ?? 0) + 1;
    started = performance.now();
    turnState = apply(turnState, command);
    applyMs += performance.now() - started;
    if (command.kind === "END_TURN" || turnState.outcome !== null) break;
    commandsThisTurn += 1;
  }
  const commands = Object.values(kinds).reduce((a, b) => a + b, 0);
  return { commands, policyMs, viewMs, applyMs, worst, kinds };
}

const mode = process.argv[2];
if (mode === "generate")
  generate(
    argument("--out"),
    optional("--spec"),
    optional("--seed"),
    optional("--factions"),
    optional("--snapshots"),
  );
else if (mode === "record" || mode === "check") {
  const dir = argument("--dir");
  const seatsArgument = optional("--seats");
  const seats = seatsArgument === null ? null : Number(seatsArgument);
  const actual = loadStates(dir, optional("--only")).map((fixed) =>
    equivalence(fixed, seats),
  );
  if (mode === "record") {
    writeFileSync(argument("--out"), JSON.stringify(actual, null, 1));
    for (const record of actual)
      process.stdout.write(
        `${record.name}: ${record.turns.length} AI commands recorded\n`,
      );
  } else {
    const expected = JSON.parse(readText(argument("--against"))) as RecordV7[];
    let failed = false;
    for (const record of actual) {
      const want = expected.find((item) => item.name === record.name);
      const same = JSON.stringify(record) === JSON.stringify(want ?? null);
      failed ||= !same;
      let firstDifference = "";
      if (!same && want !== undefined) {
        const index = record.turns.findIndex(
          (turn, at) =>
            JSON.stringify(turn) !== JSON.stringify(want.turns[at] ?? null),
        );
        firstDifference = ` first difference at command ${index}: ${JSON.stringify(record.turns[index]?.command)} vs ${JSON.stringify(want.turns[index]?.command)}`;
      }
      process.stdout.write(
        `${record.name}: ${same ? "IDENTICAL" : "DIFFERENT"} (${record.turns.length} AI commands)${firstDifference}\n`,
      );
    }
    if (failed) process.exit(1);
  }
} else if (mode === "time") {
  const repeat = Number(argument("--repeat", "1"));
  for (const fixed of loadStates(argument("--dir"), optional("--only"))) {
    const phases: Record<string, number> | null = process.argv.includes(
      "--phases",
    )
      ? {}
      : null;
    const runs = Array.from({ length: repeat }, () =>
      timeTurn(fixed.state, process.argv.includes("--log"), phases),
    );
    const best = runs.reduce((a, b) => (b.policyMs < a.policyMs ? b : a));
    const actor = activeIdV7(fixed.state);
    const size = seatSize(fixed.state, actor);
    process.stdout.write(
      `${fixed.name} (round ${fixed.state.round}, seat ${actor}: ${size.cities} cities, ${size.units} units): ${best.commands} commands, policy ${best.policyMs.toFixed(0)} ms (${(best.policyMs / best.commands).toFixed(0)} ms/command, worst ${best.worst.toFixed(0)} ms), views ${best.viewMs.toFixed(0)} ms, apply ${best.applyMs.toFixed(0)} ms; ${JSON.stringify(best.kinds)}\n`,
    );
    if (phases !== null)
      process.stdout.write(
        `  phases (all runs): ${Object.entries(phases)
          .sort((a, b) => b[1] - a[1])
          .map(([phase, ms]) => `${phase} ${ms.toFixed(0)}`)
          .join(", ")}\n`,
      );
  }
} else throw new Error("mode: generate | record | check | time");
