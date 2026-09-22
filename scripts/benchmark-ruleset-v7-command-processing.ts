import { mkdtempSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { cpus, loadavg, platform, release, tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { Ruleset7BrowserController } from "../src/app/v7-controller";
import {
  RULESET_7_ID,
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  canonicalJson,
  createInitialMapStateV7,
  createPlayableGameV7,
  createReplayV7,
  parseGameStateV7,
  previewEconomicV7,
  queryAiReadyCommandsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerViewV7,
} from "../src/engine/index";
import {
  SAVE_STORAGE_KEY_V7,
  createSaveEnvelopeV7,
  type StorageAdapter,
} from "../src/persistence/index";

const SAMPLES = 30;
const WARMUP = 5;
const NOW = "2026-09-22T10:00:00.000Z";
const EXPECTED = {
  state: "d97a2b1216dbe2dde124c03962c57e3d902549db532fc0e3abfc384ef9384b70",
  view: "6948961df2cf6ab0b1c309db37988a69a0db739aa22b0a956e200f5046f5c430",
  command: "33f79d82d16988148f2360cd2623b195b485dc3cf88fa16c33950b74dd480d06",
  synthetic: "4f10ebc9e70dc7af7a12278da8f39d2c61cf55c34ca96ad8cb7750451d3d2399",
  busyAccepted:
    "c5015d3cb3d748ca2723d1bbfdcadbfbd069c2cd9669ebf942a987345295966a",
  aiReady: "c7e160deb7dc027b59d52e662e7d2d13b371d4d727f2da6c5e8372776e586238",
  preview: "dd7d661eef85c7d5c589b791c624c27347617265d52e4254b811699016e697bd",
  boundary: "e5adc5a86b6cfe6b557dd19d5ce6bac48dac186b2f46f8a8936db074ae935099",
  replay: "6d27deddd44ea8a345c8b8b3d8d72e8c861c9e1489990858b5b5ec97267f913d",
  save: "592884e2ca83412cdd0722799f87c0071dc11dde0d67076787851d014a2492c3",
} as const;

function setup(seed: number): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: 25,
    height: 25,
    aiCount: 3,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: ["ORIGINAL", "ORIGINAL", "ORIGINAL", "ORIGINAL"],
    mapGenerationRevision: "REGIONAL_BIOMES_V1",
  };
}

function busyState(): GameStateV7 {
  const created = createInitialMapStateV7(setup(20));
  if (!created.ok) throw new Error(created.error.code);
  const state = created.state;
  const source = state.units.find(
    (unit) => unit.ownerId === state.humanPlayerId,
  );
  if (source === undefined) throw new Error("Human unit missing");
  const occupied = new Set(
    state.units.map((unit) => unit.at.y * state.board.width + unit.at.x),
  );
  const sites = state.board.tiles
    .filter(
      (tile) =>
        tile.terrain !== "MOUNTAIN" &&
        !occupied.has(tile.at.y * state.board.width + tile.at.x),
    )
    .sort(
      (left, right) =>
        Number(right.at.x % 3 === 2 && right.at.y % 3 === 2) -
        Number(left.at.x % 3 === 2 && left.at.y % 3 === 2),
    )
    .slice(0, 59);
  if (sites.length !== 59) throw new Error("Busy fixture has too few sites");
  const parsed = parseGameStateV7({
    ...state,
    activeSeatIndex: state.turnOrder.indexOf(state.humanPlayerId),
    nextEntityId: state.nextEntityId + sites.length,
    units: [
      ...state.units,
      ...sites.map((tile, index) => ({
        ...source,
        id: state.nextEntityId + index,
        at: tile.at,
        homeCityId: null,
      })),
    ].sort((left, right) => left.id - right.id),
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? { ...player, explored: state.board.tiles.map((tile) => tile.at) }
        : player,
    ),
  });
  if (parsed === null) throw new Error("Busy state failed parseGameStateV7");
  return parsed;
}

function rendererStressView(): PlayerViewV7 {
  const created = createPlayableGameV7({
    ...setup(20),
    width: 11,
    height: 11,
    aiCount: 1,
    factions: ["ORIGINAL", "ORIGINAL"],
  });
  if (!created.ok) throw new Error(created.error.code);
  const view = viewForV7(created.state, created.state.humanPlayerId);
  const unit = view.units.find(
    (candidate) => candidate.ownerId === view.viewer.id,
  );
  const tile = view.board.tiles.find(
    (candidate) => candidate.explored && candidate.terrain === "GRASS",
  );
  const city = view.cities[0];
  if (
    unit === undefined ||
    tile === undefined ||
    city === undefined ||
    !tile.explored
  )
    throw new Error("Renderer stress source missing");
  const occupied = new Set<string>();
  const units = Array.from({ length: 60 }, (_, index) => {
    const x = index === 0 ? city.at.x : 2 + (index % 10) * 2;
    let y = index === 0 ? city.at.y : 2 + Math.floor(index / 10) * 2;
    while (occupied.has(`${x},${y}`)) y += 1;
    occupied.add(`${x},${y}`);
    return { ...unit, id: 500 + index, at: { x, y } };
  });
  return {
    ...view,
    board: {
      width: 25,
      height: 25,
      tiles: Array.from({ length: 625 }, (_, index) => ({
        ...tile,
        at: { x: index % 25, y: Math.floor(index / 25) },
        resource: null,
        improvement: null,
        road: false,
        site: null,
        territoryCityId: null,
        territoryOwnerId: null,
      })),
    },
    units,
  };
}

class MemoryStorage implements StorageAdapter {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function summary(samples: readonly number[]) {
  const ordered = [...samples].sort((left, right) => left - right);
  return {
    count: ordered.length,
    medianMs: ordered[Math.floor(ordered.length / 2)],
    p95Ms: ordered[Math.ceil(ordered.length * 0.95) - 1],
    minMs: ordered[0],
    maxMs: ordered.at(-1),
    samplesMs: samples,
  };
}

async function main(): Promise<void> {
  const state = busyState();
  const view = viewForV7(state, state.humanPlayerId);
  const cold: number[] = [];
  const warm: number[] = [];
  let commands = queryPlayerCommandsV7(structuredClone(view));
  for (let sample = 0; sample < SAMPLES + WARMUP; sample += 1) {
    const sampleView = structuredClone(view);
    let started = performance.now();
    commands = queryPlayerCommandsV7(sampleView);
    const coldMs = performance.now() - started;
    started = performance.now();
    queryPlayerCommandsV7(sampleView);
    const warmMs = performance.now() - started;
    if (sample >= WARMUP) {
      cold.push(coldMs);
      warm.push(warmMs);
    }
  }
  const query = {
    stateHash: canonicalHash(state),
    viewHash: canonicalHash(view),
    unitCount: state.units.length,
    readyHumanUnits: view.units.filter(
      (unit) =>
        unit.ownerId === view.viewer.id &&
        !unit.activation.moved &&
        !unit.activation.handled,
    ).length,
    commandCount: commands.length,
    commandHash: canonicalHash(commands),
    aiReadyHash: canonicalHash(queryAiReadyCommandsV7(view)),
    previewHash: canonicalHash(
      commands.map((command) => ({
        command,
        result: previewEconomicV7(view, command),
      })),
    ),
    cold: summary(cold),
    warm: summary(warm),
  };
  const busyMove = commands.find((command) => command.kind === "MOVE");
  if (busyMove === undefined) throw new Error("Busy Move missing");
  const busyAcceptanceTimes: number[] = [];
  let busyAcceptedHash = "";
  for (let sample = 0; sample < SAMPLES + WARMUP; sample += 1) {
    const started = performance.now();
    const accepted = applyCommandV7(state, state.humanPlayerId, busyMove);
    const elapsed = performance.now() - started;
    if (!accepted.accepted)
      throw new Error(`Busy Move rejected: ${accepted.error.code}`);
    if (sample >= WARMUP) busyAcceptanceTimes.push(elapsed);
    const currentHash = canonicalHash({
      state: accepted.state,
      events: accepted.events,
    });
    if (busyAcceptedHash !== "" && currentHash !== busyAcceptedHash)
      throw new Error("Busy authoritative Move changed between samples");
    busyAcceptedHash = currentHash;
  }
  const busyAcceptance = {
    command: busyMove,
    resultHash: busyAcceptedHash,
    apply: summary(busyAcceptanceTimes),
  };
  const syntheticView = rendererStressView();
  const syntheticCold: number[] = [];
  let syntheticCommands = queryPlayerCommandsV7(structuredClone(syntheticView));
  for (let sample = 0; sample < SAMPLES + WARMUP; sample += 1) {
    const sampleView = structuredClone(syntheticView);
    const started = performance.now();
    syntheticCommands = queryPlayerCommandsV7(sampleView);
    if (sample >= WARMUP) syntheticCold.push(performance.now() - started);
  }
  const synthetic = {
    kind: "public-view-only renderer stress; no authoritative dispatch",
    readyHumanUnits: syntheticView.units.length,
    commandCount: syntheticCommands.length,
    commandHash: canonicalHash(syntheticCommands),
    cold: summary(syntheticCold),
  };

  // These controllers have independent in-memory saves. Their legal Move is
  // accepted by the full authoritative boundary, replay and save path.
  const controllers: {
    controller: Ruleset7BrowserController;
    storage: MemoryStorage;
  }[] = [];
  for (let sample = 0; sample < SAMPLES + WARMUP; sample += 1) {
    const storage = new MemoryStorage();
    const controller = new Ruleset7BrowserController({
      storage,
      persistenceNow: () => NOW,
      persistenceScheduler: () => () => {},
    });
    const launched = await controller.launch(setup(11));
    if (!launched.ok) throw new Error(launched.diagnostic);
    controllers.push({ controller, storage });
  }
  const dispatch: number[] = [];
  let boundaryHash = "";
  let saveHash = "";
  for (const [index, { controller, storage }] of controllers.entries()) {
    const before = controller.snapshot();
    const move = before.offeredCommands.find(
      (command) => command.kind === "MOVE",
    );
    if (move === undefined) throw new Error("Natural Move missing");
    const unsubscribe = controller.subscribe(() => {});
    const started = performance.now();
    const result = await controller.dispatch(move);
    const elapsed = performance.now() - started;
    unsubscribe();
    if (!result.accepted) throw new Error(`Move rejected: ${result.reason}`);
    if (index >= WARMUP) dispatch.push(elapsed);
    if (!controller.flushPersistence()) throw new Error("Save flush failed");
    const save = storage.getItem(SAVE_STORAGE_KEY_V7);
    if (save === null) throw new Error("Save missing");
    const currentBoundaryHash = canonicalHash({
      beforeView: result.beforeView,
      afterView: result.afterView,
      playerEvents: result.playerEvents,
      offeredCommands: controller.snapshot().offeredCommands,
    });
    const currentSaveHash = createHash("sha256").update(save).digest("hex");
    if (boundaryHash !== "" && currentBoundaryHash !== boundaryHash)
      throw new Error("Boundary changed between identical samples");
    if (saveHash !== "" && currentSaveHash !== saveHash)
      throw new Error("Save changed between identical samples");
    boundaryHash = currentBoundaryHash;
    saveHash = currentSaveHash;
    controller.destroy();
  }
  const natural = createPlayableGameV7(setup(11));
  if (!natural.ok) throw new Error(natural.error.code);
  const actor = natural.state.humanPlayerId;
  const initialView = viewForV7(natural.state, actor);
  const move = queryPlayerCommandsV7(initialView).find(
    (command) => command.kind === "MOVE",
  );
  if (move === undefined) throw new Error("Natural Move missing");
  const applied = applyCommandV7(natural.state, actor, move);
  if (!applied.accepted) throw new Error("Natural Move rejected");
  const jsonTimes: number[] = [];
  const hashTimes: number[] = [];
  const freshHashTimes: number[] = [];
  const appendTimes: number[] = [];
  const freshAppendTimes: number[] = [];
  const saveTimes: number[] = [];
  let replayHash = "";
  for (let sample = 0; sample < SAMPLES + WARMUP; sample += 1) {
    let started = performance.now();
    canonicalJson(applied.state);
    const jsonMs = performance.now() - started;
    started = performance.now();
    const stateHash = canonicalHash(applied.state);
    const hashMs = performance.now() - started;
    const freshHashState = structuredClone(applied.state);
    started = performance.now();
    const freshStateHash = canonicalHash(freshHashState);
    const freshHashMs = performance.now() - started;
    if (freshStateHash !== stateHash)
      throw new Error("Fresh-clone state hash changed");
    started = performance.now();
    const replay = appendReplayCommandV7(
      createReplayV7(natural.state.setup),
      move,
      applied.state,
    );
    const appendMs = performance.now() - started;
    const freshReplayState = structuredClone(applied.state);
    started = performance.now();
    const freshReplay = appendReplayCommandV7(
      createReplayV7(natural.state.setup),
      move,
      freshReplayState,
    );
    const freshAppendMs = performance.now() - started;
    if (
      freshReplay.checkpoints.at(-1)?.stateHash !==
      replay.checkpoints.at(-1)?.stateHash
    )
      throw new Error("Fresh-clone replay certificate changed");
    started = performance.now();
    createSaveEnvelopeV7({ state: applied.state, replay }, NOW);
    const saveMs = performance.now() - started;
    if (sample >= WARMUP) {
      jsonTimes.push(jsonMs);
      hashTimes.push(hashMs);
      freshHashTimes.push(freshHashMs);
      appendTimes.push(appendMs);
      freshAppendTimes.push(freshAppendMs);
      saveTimes.push(saveMs);
    }
    const currentReplayHash = canonicalHash(replay);
    if (replayHash !== "" && currentReplayHash !== replayHash)
      throw new Error("Replay changed between identical samples");
    replayHash = currentReplayHash;
  }
  const output = {
    environment: {
      node: process.version,
      platform: platform(),
      release: release(),
      cpu: cpus()[0]?.model ?? "unknown",
      cpuCount: cpus().length,
      loadAverage: loadavg(),
      browser: "none; this probe measures the engine/controller boundary only",
    },
    fixture:
      "parseGameStateV7-checked 25x25 state with 63 spread units; natural seed-11 Move with isolated in-memory save",
    query,
    busyAcceptance,
    synthetic,
    movement: {
      boundaryHash,
      saveHash,
      replayHash,
      dispatch: summary(dispatch),
      canonicalJson: summary(jsonTimes),
      canonicalHash: summary(hashTimes),
      freshStateHash: summary(freshHashTimes),
      replayAppend: summary(appendTimes),
      freshStateReplayAppend: summary(freshAppendTimes),
      saveEnvelope: summary(saveTimes),
    },
  };
  const actual = {
    state: query.stateHash,
    view: query.viewHash,
    command: query.commandHash,
    synthetic: synthetic.commandHash,
    busyAccepted: busyAcceptedHash,
    aiReady: query.aiReadyHash,
    preview: query.previewHash,
    boundary: boundaryHash,
    replay: replayHash,
    save: saveHash,
  };
  if (
    query.readyHumanUnits !== 60 ||
    query.commandCount !== 459 ||
    synthetic.readyHumanUnits !== 60 ||
    synthetic.commandCount !== 542 ||
    Object.keys(EXPECTED).some(
      (key) =>
        actual[key as keyof typeof EXPECTED] !==
        EXPECTED[key as keyof typeof EXPECTED],
    )
  )
    throw new Error(
      `Command boundary parity changed: ${JSON.stringify(actual)}`,
    );
  const directory = mkdtempSync(join(tmpdir(), "pulp-wars-v7-command-"));
  writeFileSync(
    join(directory, "evidence.json"),
    JSON.stringify(output, null, 2),
  );
  process.stdout.write(
    `${JSON.stringify(
      {
        readyHumanUnits: query.readyHumanUnits,
        commandCount: query.commandCount,
        coldQuery: {
          medianMs: query.cold.medianMs,
          p95Ms: query.cold.p95Ms,
        },
        warmQuery: {
          medianMs: query.warm.medianMs,
          p95Ms: query.warm.p95Ms,
        },
        syntheticColdQuery: {
          commandCount: synthetic.commandCount,
          medianMs: synthetic.cold.medianMs,
          p95Ms: synthetic.cold.p95Ms,
        },
        busyAuthoritativeMove: {
          medianMs: busyAcceptance.apply.medianMs,
          p95Ms: busyAcceptance.apply.p95Ms,
        },
        dispatch: {
          medianMs: output.movement.dispatch.medianMs,
          p95Ms: output.movement.dispatch.p95Ms,
        },
        canonicalHash: {
          medianMs: output.movement.canonicalHash.medianMs,
          p95Ms: output.movement.canonicalHash.p95Ms,
        },
        freshStateHash: {
          medianMs: output.movement.freshStateHash.medianMs,
          p95Ms: output.movement.freshStateHash.p95Ms,
        },
        replayAppend: {
          medianMs: output.movement.replayAppend.medianMs,
          p95Ms: output.movement.replayAppend.p95Ms,
        },
        freshStateReplayAppend: {
          medianMs: output.movement.freshStateReplayAppend.medianMs,
          p95Ms: output.movement.freshStateReplayAppend.p95Ms,
        },
        hashes: actual,
      },
      null,
      2,
    )}\nEvidence: ${directory}\n`,
  );
}

await main();
