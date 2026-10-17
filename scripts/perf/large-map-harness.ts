/**
 * Large-map performance harness (bead `pulp_wars-2yc.79`,
 * docs/architecture/PERFORMANCE.md). Timing and equivalence on FIXED states,
 * never a match:
 *
 * - `generate --dir <d>` records, once, the command list that reaches each
 *   fixed state (a few rounds of Normal AI decisions on a large board) and
 *   writes it with the state hash it must reach. Run it once; afterwards the
 *   states come from replaying the recorded commands through the reducer.
 * - `record --dir <d> --out <file>` replays each fixture, then plays exactly
 *   one round of single AI turns from the fixed state and writes every AI
 *   command, every resulting state hash, the hash of every seat's view, the
 *   human's offered commands and projected events: the equivalence record.
 * - `check --dir <d> --against <file>` recomputes that record and fails on
 *   any difference.
 * - `time --dir <d>` times one AI seat's turn, the public queries and the
 *   browser controller's per-command pipeline on each fixed state.
 */
import { createSaveEnvelopeV7 } from "../../src/persistence/v7";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";
import {
  NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
} from "../../src/ai/v7";
import {
  FACTION_IDS_V7,
  RULESET_7_ID,
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  createPlayableGameV7,
  createReplayV7,
  previewEconomicV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerId,
  type ReplayFileV7,
} from "../../src/engine/index";

interface FixtureSpecV7 {
  readonly name: string;
  readonly setup: MatchSetupV7;
  readonly rounds: number;
}

interface FixtureFileV7 {
  readonly name: string;
  readonly setup: MatchSetupV7;
  readonly commands: readonly CommandV7[];
  readonly stateHash: string;
  readonly round: number;
}

function setupV7(
  seed: number,
  size: 20 | 25,
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
  };
}

const EIGHT = FACTION_IDS_V7.slice(0, 8);
const LATER_EIGHT = FACTION_IDS_V7.slice(1, 9);

const SPECS: readonly FixtureSpecV7[] = [
  {
    name: "quick-20x20-8seats-r5",
    setup: setupV7(11, 20, "CONTINENTS", EIGHT),
    rounds: 5,
  },
  {
    name: "advanced-25x25-8seats-r8",
    setup: setupV7(12, 25, "PANGEA", LATER_EIGHT),
    rounds: 8,
  },
  {
    name: "advanced-25x25-8seats-r16",
    setup: setupV7(13, 25, "DRY_LAND", EIGHT),
    rounds: 16,
  },
];

function argument(name: string, fallback?: string): string {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? fallback : process.argv[index + 1];
  if (value === undefined) throw new Error(`${name} is required`);
  return value;
}

function activeIdV7(state: GameStateV7): PlayerId {
  const id = state.turnOrder[state.activeSeatIndex];
  if (id === undefined) throw new Error("no active player");
  return id;
}

/** One AI command for the active seat, as the browser controller picks it. */
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

function apply(state: GameStateV7, command: CommandV7) {
  const applied = applyCommandV7(state, activeIdV7(state), command);
  if (!applied.accepted)
    throw new Error(`rejected ${command.kind}: ${applied.error.code}`);
  return applied;
}

function generate(dir: string): void {
  mkdirSync(dir, { recursive: true });
  for (const spec of SPECS) {
    const created = createPlayableGameV7(spec.setup);
    if (!created.ok) throw new Error(`setup ${spec.name} rejected`);
    let state = created.state;
    const commands: CommandV7[] = [];
    let commandsThisTurn = 0;
    const started = performance.now();
    while (state.outcome === null && state.round <= spec.rounds) {
      const command = aiCommandV7(state, commandsThisTurn);
      state = apply(state, command).state;
      commands.push(command);
      commandsThisTurn = command.kind === "END_TURN" ? 0 : commandsThisTurn + 1;
    }
    const file: FixtureFileV7 = {
      name: spec.name,
      setup: spec.setup,
      commands,
      stateHash: canonicalHash(state),
      round: state.round,
    };
    writeFileSync(path.join(dir, `${spec.name}.json`), JSON.stringify(file));
    process.stdout.write(
      `${spec.name}: ${commands.length} commands, round ${state.round}, units ${state.units.length}, ${(performance.now() - started).toFixed(0)} ms\n`,
    );
  }
}

function loadFixtures(dir: string): FixtureFileV7[] {
  return SPECS.map(
    (spec) =>
      JSON.parse(
        readFileSync(path.join(dir, `${spec.name}.json`), "utf8"),
      ) as FixtureFileV7,
  );
}

function rebuild(fixture: FixtureFileV7): GameStateV7 {
  const created = createPlayableGameV7(fixture.setup);
  if (!created.ok) throw new Error(`setup ${fixture.name} rejected`);
  let state = created.state;
  for (const command of fixture.commands) state = apply(state, command).state;
  const hash = canonicalHash(state);
  if (hash !== fixture.stateHash)
    throw new Error(
      `${fixture.name}: replayed state hash ${hash} != ${fixture.stateHash}`,
    );
  return state;
}

interface EquivalenceRecordV7 {
  readonly name: string;
  readonly fixedStateHash: string;
  readonly viewHashes: readonly string[];
  readonly offeredHash: string;
  /** Every offered command of the active seat with its economic preview. */
  readonly previewHash: string;
  readonly turns: readonly {
    readonly command: CommandV7;
    readonly stateHash: string;
    readonly humanEventsHash: string;
    readonly humanViewHash: string;
    readonly offeredHash: string;
  }[];
}

/** The fixed state, then one round of single AI turns from it. */
function equivalence(fixture: FixtureFileV7): EquivalenceRecordV7 {
  let state = rebuild(fixture);
  const humanId = state.humanPlayerId;
  const record = {
    name: fixture.name,
    fixedStateHash: canonicalHash(state),
    viewHashes: state.players.map((player) =>
      canonicalHash(viewForV7(state, player.id)),
    ),
    offeredHash: canonicalHash(
      queryPlayerCommandsV7(viewForV7(state, activeIdV7(state))),
    ),
    previewHash: canonicalHash(
      queryPlayerCommandsV7(viewForV7(state, activeIdV7(state))).map(
        (command) => ({
          command,
          preview: previewEconomicV7(
            viewForV7(state, activeIdV7(state)),
            command,
          ),
        }),
      ),
    ),
    turns: [] as EquivalenceRecordV7["turns"][number][],
  };
  let commandsThisTurn = 0;
  let endTurns = 0;
  while (state.outcome === null && endTurns < state.players.length) {
    const command = aiCommandV7(state, commandsThisTurn);
    const applied = apply(state, command);
    const after = applied.state;
    record.turns.push({
      command,
      stateHash: canonicalHash(after),
      humanEventsHash: canonicalHash(
        projectEventsV7(state, after, humanId, applied.events),
      ),
      humanViewHash: canonicalHash(viewForV7(after, humanId)),
      offeredHash: canonicalHash(
        queryPlayerCommandsV7(viewForV7(after, activeIdV7(after))),
      ),
    });
    state = after;
    if (command.kind === "END_TURN") {
      endTurns += 1;
      commandsThisTurn = 0;
    } else commandsThisTurn += 1;
  }
  return record;
}

function timeIt(repeat: number, run: () => unknown): number {
  const samples: number[] = [];
  for (let index = 0; index < repeat; index += 1) {
    const started = performance.now();
    run();
    samples.push(performance.now() - started);
  }
  return Math.min(...samples);
}

/**
 * Times, on each fixed state: the queries the browser runs per accepted
 * command, and the active seat's whole AI turn split into its parts.
 */
function time(dir: string, only: string | null, repeat: number): void {
  const rows: Record<string, unknown>[] = [];
  for (const fixture of loadFixtures(dir)) {
    if (only !== null && fixture.name !== only) continue;
    const replayStarted = performance.now();
    const state = rebuild(fixture);
    const replayFixtureMs = Math.round(performance.now() - replayStarted);
    const actor = activeIdV7(state);
    const humanId = state.humanPlayerId;
    const uncertified = structuredClone(state);
    const queries = {
      // An uncertified copy: every view is computed, never remembered.
      viewForV7Ms: timeIt(20, () => viewForV7(uncertified, actor)),
      queryPlayerCommandsColdMs: timeIt(10, () =>
        queryPlayerCommandsV7(viewForV7(uncertified, actor)),
      ),
      canonicalHashMs: timeIt(10, () => canonicalHash(state)),
    };
    // A replay certificate needs every command; time only the append itself
    // through a replay rebuilt from the fixture's commands.
    let fixedReplay: ReplayFileV7 = createReplayV7(state.setup);
    {
      const rebuilt = createPlayableGameV7(fixture.setup);
      if (!rebuilt.ok) throw new Error("setup");
      let replayState = rebuilt.state;
      for (const command of fixture.commands) {
        replayState = apply(replayState, command).state;
        fixedReplay = appendReplayCommandV7(fixedReplay, command, replayState);
      }
    }
    // The active seat's whole turn, timed per part; the fastest of
    // `repeat` runs of each part (the machine is shared).
    const runs = Array.from({ length: repeat }, () =>
      timeTurn(state, fixedReplay, actor, humanId),
    );
    const best = (pick: (run: TurnTimingV7) => number): number =>
      Math.round(Math.min(...runs.map(pick)));
    rows.push({
      name: fixture.name,
      round: state.round,
      units: state.units.length,
      cities: state.cities.length,
      actor,
      replayFixtureMs,
      ...queries,
      turn: {
        commands: runs[0]?.commands,
        totalMs: best((run) => run.totalMs),
        policyMs: best((run) => run.policyMs),
        aiViewMs: best((run) => run.aiViewMs),
        offeredCheckMs: best((run) => run.offeredCheckMs),
        applyMs: best((run) => run.applyMs),
        replayAppendMs: best((run) => run.replayMs),
        humanViewMs: best((run) => run.humanViewMs),
        projectEventsMs: best((run) => run.projectMs),
      },
    });
  }
  process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
}

interface TurnTimingV7 {
  commands: number;
  totalMs: number;
  policyMs: number;
  aiViewMs: number;
  offeredCheckMs: number;
  applyMs: number;
  replayMs: number;
  humanViewMs: number;
  projectMs: number;
}

function timeTurn(
  state: GameStateV7,
  fixedReplay: ReplayFileV7,
  actor: PlayerId,
  humanId: PlayerId,
): TurnTimingV7 {
  let turnState = state;
  let replay = fixedReplay;
  let commandsThisTurn = 0;
  let policyMs = 0;
  let aiViewMs = 0;
  let applyMs = 0;
  let replayMs = 0;
  let humanViewMs = 0;
  let projectMs = 0;
  let offeredCheckMs = 0;
  let commands = 0;
  {
    const turnStarted = performance.now();
    for (;;) {
      let started = performance.now();
      const view = viewForV7(turnState, actor);
      aiViewMs += performance.now() - started;
      started = performance.now();
      const decision = chooseNormalCommandV7(view);
      const command = chooseNormalTurnCommandV7(
        view,
        commandsThisTurn,
        NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
        decision,
      );
      policyMs += performance.now() - started;
      if (command === null) throw new Error("no command");
      started = performance.now();
      queryPlayerCommandsV7(view);
      offeredCheckMs += performance.now() - started;
      started = performance.now();
      const applied = apply(turnState, command);
      applyMs += performance.now() - started;
      started = performance.now();
      replay = appendReplayCommandV7(replay, command, applied.state);
      replayMs += performance.now() - started;
      started = performance.now();
      viewForV7(applied.state, humanId);
      humanViewMs += performance.now() - started;
      started = performance.now();
      projectEventsV7(turnState, applied.state, humanId, applied.events);
      projectMs += performance.now() - started;
      turnState = applied.state;
      commands += 1;
      if (command.kind === "END_TURN") break;
      commandsThisTurn += 1;
    }
    return {
      commands,
      totalMs: performance.now() - turnStarted,
      policyMs,
      aiViewMs,
      offeredCheckMs,
      applyMs,
      replayMs,
      humanViewMs,
      projectMs,
    };
  }
}

const mode = process.argv[2];
const dir = argument("--dir");
if (mode === "generate") generate(dir);
else if (mode === "record") {
  const records = loadFixtures(dir).map(equivalence);
  writeFileSync(argument("--out"), JSON.stringify(records, null, 1));
  for (const record of records)
    process.stdout.write(
      `${record.name}: ${record.turns.length} AI commands recorded\n`,
    );
} else if (mode === "check") {
  const expected = JSON.parse(
    readFileSync(argument("--against"), "utf8"),
  ) as EquivalenceRecordV7[];
  const actual = loadFixtures(dir).map(equivalence);
  let failed = false;
  for (const [index, record] of actual.entries()) {
    const same =
      JSON.stringify(record) === JSON.stringify(expected[index] ?? null);
    failed ||= !same;
    process.stdout.write(
      `${record.name}: ${same ? "IDENTICAL" : "DIFFERENT"} (${record.turns.length} AI commands)\n`,
    );
  }
  if (failed) process.exit(1);
} else if (mode === "save") {
  // Browser profiling: each fixed state advanced by single AI turns to the
  // human seat's turn, written as a browser save (the envelope the game
  // stores under SAVE_STORAGE_KEY_V7).
  for (const fixture of loadFixtures(dir)) {
    const created = createPlayableGameV7(fixture.setup);
    if (!created.ok) throw new Error("setup");
    let state = created.state;
    let replay: ReplayFileV7 = createReplayV7(state.setup);
    let commandsThisTurn = 0;
    const play = (command: CommandV7): void => {
      state = apply(state, command).state;
      replay = appendReplayCommandV7(replay, command, state);
      commandsThisTurn = command.kind === "END_TURN" ? 0 : commandsThisTurn + 1;
    };
    for (const command of fixture.commands) play(command);
    while (activeIdV7(state) !== state.humanPlayerId)
      play(aiCommandV7(state, commandsThisTurn));
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-10-17T00:00:00.000Z",
    );
    writeFileSync(
      path.join(dir, `${fixture.name}.save.json`),
      JSON.stringify(save),
    );
    process.stdout.write(
      `${fixture.name}.save.json: round ${state.round}, ${state.commandIndex} commands, hash ${canonicalHash(state)}\n`,
    );
  }
} else if (mode === "time") {
  const onlyIndex = process.argv.indexOf("--only");
  time(
    dir,
    onlyIndex < 0 ? null : (process.argv[onlyIndex + 1] ?? null),
    Number(argument("--repeat", "3")),
  );
} else throw new Error("mode: generate | record | check | time");
