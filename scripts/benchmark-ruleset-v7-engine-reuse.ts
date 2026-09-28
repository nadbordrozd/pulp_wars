import { readFileSync, writeFileSync } from "node:fs";
import { cpus, loadavg, platform, release } from "node:os";
import { performance } from "node:perf_hooks";
import {
  applyCommandV7,
  canonicalHash,
  combinedNetworkCityIdsV7,
  combinedNetworkRoadKeysV7,
  landConnectedCityIdsV7,
  reducerValidationDiagnosticsV7,
  resetReducerValidationDiagnosticsV7,
  resetSeaRouteGeometryCacheV7,
  seaRouteGeometryCacheDiagnosticsV7,
  seaTradeCityIdsV7,
  type CommandV7,
  type GameStateV7,
} from "../src/engine/index";

interface Options {
  readonly state: string;
  readonly commands: string;
  readonly output: string | null;
  readonly samples: number;
}

const options = parseOptions(process.argv.slice(2));
const stateInput = JSON.parse(readFileSync(options.state, "utf8")) as unknown;
const commandInput = JSON.parse(
  readFileSync(options.commands, "utf8"),
) as unknown;
const initialState = unwrapState(stateInput);
const commands = unwrapCommands(commandInput);
const samples = Array.from({ length: options.samples }, runSample);
const expected = samples[0];
if (
  expected === undefined ||
  samples.some(
    (sample) =>
      sample.stateHash !== expected.stateHash ||
      sample.eventHash !== expected.eventHash ||
      sample.networkHash !== expected.networkHash,
  )
)
  throw new Error(
    "Repeated command sequence produced different state, event, or network hashes",
  );

const report = {
  kind: "RULESET_7_ENGINE_REUSE_PERFORMANCE",
  runtime: {
    node: process.version,
    platform: platform(),
    release: release(),
    cpu: cpus()[0]?.model ?? "unknown",
    loadAverage: loadavg(),
  },
  input: {
    statePath: options.state,
    commandsPath: options.commands,
    commandCount: commands.length,
  },
  stateHash: expected.stateHash,
  eventHash: expected.eventHash,
  networkHash: expected.networkHash,
  timing: summarize(samples.map((sample) => sample.elapsedMs)),
  samples,
};
const encoded = `${JSON.stringify(report, null, 2)}\n`;
if (options.output !== null) writeFileSync(options.output, encoded);
process.stdout.write(encoded);

function runSample(): {
  readonly elapsedMs: number;
  readonly stateHash: string;
  readonly eventHash: string;
  readonly networkHash: string;
  readonly validation: ReturnType<typeof reducerValidationDiagnosticsV7>;
  readonly geometry: ReturnType<typeof seaRouteGeometryCacheDiagnosticsV7>;
} {
  resetReducerValidationDiagnosticsV7();
  resetSeaRouteGeometryCacheV7();
  let state = structuredClone(initialState);
  const events = [];
  const started = performance.now();
  for (const command of commands) {
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) throw new Error("Active actor missing");
    const result = applyCommandV7(state, actor, command);
    if (!result.accepted)
      throw new Error(`${command.kind} rejected: ${result.error.code}`);
    state = result.state;
    events.push(result.events);
  }
  const elapsedMs = performance.now() - started;
  const network = state.players.map((player) => ({
    playerId: player.id,
    land: [...landConnectedCityIdsV7(state, player.id)],
    sea: [...seaTradeCityIdsV7(state, player.id)],
    combined: [...combinedNetworkCityIdsV7(state, player.id)],
    roads: [...combinedNetworkRoadKeysV7(state, player.id)],
  }));
  return {
    elapsedMs,
    stateHash: canonicalHash(state),
    eventHash: canonicalHash(events),
    networkHash: canonicalHash(network),
    validation: reducerValidationDiagnosticsV7(),
    geometry: seaRouteGeometryCacheDiagnosticsV7(),
  };
}

function unwrapState(input: unknown): GameStateV7 {
  if (isRecord(input) && isRecord(input.state))
    return input.state as unknown as GameStateV7;
  if (isRecord(input)) return input as unknown as GameStateV7;
  throw new Error("State input must be a state or an object containing state");
}

function unwrapCommands(input: unknown): readonly CommandV7[] {
  if (Array.isArray(input)) return input as readonly CommandV7[];
  if (
    isRecord(input) &&
    isRecord(input.before) &&
    Array.isArray(input.before.commands)
  )
    return input.before.commands as readonly CommandV7[];
  if (isRecord(input) && Array.isArray(input.commands))
    return input.commands as readonly CommandV7[];
  throw new Error("Command input must contain a commands array");
}

function summarize(values: readonly number[]): {
  readonly count: number;
  readonly medianMs: number;
  readonly minMs: number;
  readonly maxMs: number;
} {
  const ordered = [...values].sort((left, right) => left - right);
  return {
    count: ordered.length,
    medianMs: required(ordered[Math.floor(ordered.length / 2)]),
    minMs: required(ordered[0]),
    maxMs: required(ordered.at(-1)),
  };
}

function parseOptions(args: readonly string[]): Options {
  let state = "";
  let commands = "";
  let output: string | null = null;
  let samples = 8;
  for (let index = 0; index < args.length; index += 1) {
    const name = args[index];
    const value = args[index + 1];
    if (value === undefined) throw new Error(`Missing value for ${name}`);
    if (name === "--state") state = value;
    else if (name === "--commands") commands = value;
    else if (name === "--output") output = value;
    else if (name === "--samples") samples = Number(value);
    else throw new Error(`Unknown option: ${name}`);
    index += 1;
  }
  if (state === "" || commands === "")
    throw new Error("Usage: --state <json> --commands <json> [--samples N]");
  if (!Number.isSafeInteger(samples) || samples < 1 || samples > 100)
    throw new Error("Samples must be an integer from 1 through 100");
  return { state, commands, output, samples };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Required benchmark value missing");
  return value;
}
