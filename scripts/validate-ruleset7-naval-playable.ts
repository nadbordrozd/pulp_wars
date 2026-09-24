import { strict as assert } from "node:assert";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { NormalPolicyWorkV7, chooseNormalTurnCommandV7 } from "../src/ai/v7";
import {
  RULESET_7_ID,
  applyCommandV7,
  canonicalHash,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type MapTypeV7,
  type MatchSetupV7,
  type PlayerId,
} from "../src/engine/index";
import { runAiMatchV7 } from "../src/headless/v7";
import { isolatedNavalScenarioV7 } from "../tests/fixtures/v7-naval-ai-scenarios";
import { battleshipBombardmentV7 } from "../tests/fixtures/v7-naval-builders";
import { prepareSmokeOutput } from "./browser-smoke-output";
import {
  findCoastOscillationV7,
  parseNavalPlayableMatrixSelectionV7,
} from "./ruleset-v7-naval-playable-contract";

const MAP_TYPES: readonly MapTypeV7[] = [
  "DRY_LAND",
  "PANGEA",
  "CONTINENTS",
  "ARCHIPELAGO",
  "LAKES",
];
const SHAPES = [
  [11, 1],
  [14, 2],
  [16, 3],
  [25, 3],
] as const;
const TARGETS = [
  ["PANGEA", 9400, false, "ISOLATED"],
  ["PANGEA", 9401, false, "SEA_SHORTCUT"],
  ["CONTINENTS", 9402, true, "ISOLATED"],
  ["CONTINENTS", 9403, false, "SEA_SHORTCUT"],
  ["ARCHIPELAGO", 9404, false, "ISOLATED"],
  ["ARCHIPELAGO", 9405, true, "SEA_SHORTCUT"],
  ["LAKES", 9406, false, "ISOLATED"],
  ["LAKES", 9407, false, "SEA_SHORTCUT"],
] as const;
const WATER_COMMANDS = new Set([
  "HARVEST_FISH",
  "GATHER_PEARLS",
  "BUILD_PORT",
  "TRAIN_NAVAL",
  "DISEMBARK",
]);
const output = await prepareSmokeOutput({
  args: process.argv.slice(2),
  name: "ruleset7-naval-playable",
  archiveDirectory: "art/integration/reviews/ruleset7-naval-playable",
});
const started = performance.now();
const matrix: Record<string, unknown>[] = [];
const { skipMatrix, matrixStart, partialMatrix } =
  parseNavalPlayableMatrixSelectionV7(process.argv.slice(2));
let matrixIndex = 0;

if (partialMatrix)
  console.log(
    `PARTIAL matrix validation: cases ${matrixStart + 1}-40 of 40 (${40 - matrixStart} cases)`,
  );

if (!skipMatrix)
  for (const mapType of MAP_TYPES)
    for (const [width, aiCount] of SHAPES)
      for (const aiMode of ["RIVAL", "COOPERATIVE"] as const) {
        const caseIndex = matrixIndex;
        matrixIndex += 1;
        if (caseIndex < matrixStart) continue;
        const setup = matchSetup(mapType, width, aiCount, aiMode, 0);
        const first = runAiMatchV7(setup, {
          maxRounds: 20,
          maxCommands: 600,
        });
        const second = runAiMatchV7(setup, {
          maxRounds: 20,
          maxCommands: 600,
        });
        const label = `${mapType}/${width}/${aiCount}/${aiMode}`;
        assert.deepEqual(first.errors, [], `${label}: first errors`);
        assert.deepEqual(second.errors, [], `${label}: repeat errors`);
        assert.deepEqual(first.stalls, [], `${label}: first stalls`);
        assert.deepEqual(second.stalls, [], `${label}: repeat stalls`);
        assert.equal(
          first.metrics.relationships.alliedHostileActions,
          0,
          label,
        );
        assert.equal(
          first.metrics.relationships.alliedTerritoryPathSteps,
          0,
          label,
        );
        assert.equal(
          first.metrics.commandHash,
          second.metrics.commandHash,
          label,
        );
        assert.equal(first.metrics.eventHash, second.metrics.eventHash, label);
        assert.equal(first.metrics.finalHash, second.metrics.finalHash, label);
        assert.equal(first.acceptedCommands, second.acceptedCommands, label);
        assert.equal(first.events.length, second.events.length, label);
        assertNoCoastOscillation(first.commandLog, label);
        if (mapType === "DRY_LAND")
          for (const kind of WATER_COMMANDS)
            assert.equal(
              first.metrics.commandsByKind[kind],
              0,
              `${label}:${kind}`,
            );
        matrix.push({
          label,
          commands: first.acceptedCommands,
          events: first.events.length,
          rounds: first.rounds,
          termination: first.termination,
          commandHash: first.metrics.commandHash,
          eventHash: first.metrics.eventHash,
          finalHash: first.metrics.finalHash,
        });
        console.log(
          `matrix ${caseIndex + 1}/40 ${label} ${first.acceptedCommands} commands`,
        );
      }

const targeted = TARGETS.map(([mapType, seed, deepLane, geometry]) => {
  const first = runTargeted(mapType, seed, deepLane, geometry);
  const second = runTargeted(mapType, seed, deepLane, geometry);
  assert.equal(
    first.finalHash,
    second.finalHash,
    `${mapType}/${seed} final repeat`,
  );
  assert.equal(
    first.commandHash,
    second.commandHash,
    `${mapType}/${seed} command repeat`,
  );
  assert.equal(
    first.eventHash,
    second.eventHash,
    `${mapType}/${seed} event repeat`,
  );
  return { ...first, exactRepeat: true };
});
assert(
  targeted.some((entry) => entry.navigation),
  "no deep Navigation case",
);
assert(
  targeted.some((entry) => entry.patrolEscort),
  "no Patrol escort case",
);

const bombardmentFixture = battleshipBombardmentV7();
const bombardmentView = viewForV7(
  bombardmentFixture.state,
  bombardmentFixture.state.humanPlayerId,
);
const bombardmentWork = new NormalPolicyWorkV7(bombardmentView);
let bombardmentDecision = bombardmentWork.runSlice(4);
let bombardmentSlices = 1;
while (bombardmentDecision === null) {
  bombardmentSlices += 1;
  bombardmentDecision = bombardmentWork.runSlice(4);
}
assert.deepEqual(bombardmentDecision.command, {
  kind: "ATTACK",
  unitId: bombardmentFixture.attackerId,
  targetUnitId: bombardmentFixture.defenderId,
});
const bombardmentApplied = applyCommandV7(
  bombardmentFixture.state,
  bombardmentFixture.state.humanPlayerId,
  bombardmentDecision.command,
);
assert(bombardmentApplied.accepted, "Battleship bombardment rejected");
assert(
  bombardmentApplied.events.some((event) => event.kind === "COMBAT_RESOLVED"),
  "Battleship bombardment emitted no combat",
);

const natural = (["CONTINENTS", "ARCHIPELAGO"] as const).map((mapType) => {
  const diagnostics: {
    slices: number;
    wallMilliseconds: number;
    maximumSliceMilliseconds: number;
  }[] = [];
  const naturalStarted = performance.now();
  const result = runAiMatchV7(matchSetup(mapType, 16, 3, "RIVAL", 0), {
    maxRounds: 60,
    maxCommands: 2_000,
    progressEveryCommands: 200,
    onProgress: (progress) =>
      console.log(
        `natural ${mapType} ${progress.acceptedCommands}/2000 commands round ${progress.round}`,
      ),
    policySliceMilliseconds: 4,
    onPolicyWork: (entry) => diagnostics.push(entry),
  });
  assert.deepEqual(result.errors, [], `${mapType} natural errors`);
  assert.deepEqual(result.stalls, [], `${mapType} natural stalls`);
  const lifecycle = nonHumanInvasion(
    result.state.humanPlayerId,
    result.commandLog,
  );
  assert(lifecycle !== null, `${mapType}: no same-AI-unit invasion lifecycle`);
  return {
    mapType,
    seed: 0,
    rounds: result.rounds,
    commands: result.acceptedCommands,
    wallMilliseconds: performance.now() - naturalStarted,
    policyCallbacks: diagnostics.length,
    policySlices: diagnostics.reduce((sum, entry) => sum + entry.slices, 0),
    maximumSlices: Math.max(0, ...diagnostics.map((entry) => entry.slices)),
    maximumPolicyWallMilliseconds: Math.max(
      0,
      ...diagnostics.map((entry) => entry.wallMilliseconds),
    ),
    maximumSliceMilliseconds: Math.max(
      0,
      ...diagnostics.map((entry) => entry.maximumSliceMilliseconds),
    ),
    lifecycle,
  };
});

const coldDiagnostics: {
  slices: number;
  wallMilliseconds: number;
  maximumSliceMilliseconds: number;
}[] = [];
runAiMatchV7(matchSetup("ARCHIPELAGO", 25, 3, "RIVAL", 0), {
  maxRounds: 2,
  maxCommands: 80,
  policySliceMilliseconds: 4,
  onPolicyWork: (entry) => coldDiagnostics.push(entry),
});
assert(
  coldDiagnostics.some((entry) => entry.slices > 1),
  "25x25 planning never yielded",
);

const report = {
  status: "PASS",
  fixedSeed: 0,
  matrixSkipped: skipMatrix,
  partialMatrix,
  matrixStart,
  matrixTotalCases: 40,
  matrixCases: matrix.length,
  exactRepeats: matrix.length,
  matrix,
  targeted,
  battleshipBombardment: {
    slices: bombardmentSlices,
    command: bombardmentDecision.command,
    eventKinds: bombardmentApplied.events.map((event) => event.kind),
  },
  natural,
  cold25: {
    callbacks: coldDiagnostics.length,
    maximumSlices: Math.max(...coldDiagnostics.map((entry) => entry.slices)),
    maximumWallMilliseconds: Math.max(
      ...coldDiagnostics.map((entry) => entry.wallMilliseconds),
    ),
    maximumSliceMilliseconds: Math.max(
      ...coldDiagnostics.map((entry) => entry.maximumSliceMilliseconds),
    ),
  },
  wallMilliseconds: performance.now() - started,
};
await writeFile(
  path.join(output.directory, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
await output.publish();
console.log(JSON.stringify(report));

function matchSetup(
  mapType: MapTypeV7,
  width: 11 | 14 | 16 | 25,
  aiCount: 1 | 2 | 3,
  aiMode: "RIVAL" | "COOPERATIVE",
  seed: number,
): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
    seed,
    width,
    height: width,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode,
    humanColor: "CORAL",
    factions: Array.from({ length: aiCount + 1 }, () => "ORIGINAL"),
    mapType,
  };
}

function assertNoCoastOscillation(
  log: readonly {
    readonly command: CommandV7;
    readonly events: readonly { readonly kind: string }[];
  }[],
  label: string,
): void {
  const violation = findCoastOscillationV7(log);
  assert(
    violation === null,
    `${label}: repeated landing/embark oscillation for unit ${violation?.unitId} at ${violation?.landingAt}`,
  );
}

function runTargeted(
  mapType: Exclude<MapTypeV7, "DRY_LAND">,
  seed: number,
  deepLane: boolean,
  geometry: "ISOLATED" | "SEA_SHORTCUT",
) {
  const fixture = isolatedNavalScenarioV7(mapType, seed, deepLane, geometry);
  let state = fixture.state;
  let commandsThisTurn = 0;
  const departedUnitIds = new Set<number>();
  const landedRounds = new Map<number, number>();
  let slices = 0;
  let callbacks = 0;
  let maximumSlices = 0;
  let maximumPolicyWallMilliseconds = 0;
  let maximumSliceMilliseconds = 0;
  const commands: CommandV7[] = [];
  const eventKinds: string[] = [];
  let shorecraft = false;
  let navigation = false;
  let port = false;
  let departure = false;
  let landing = false;
  let captureWait = false;
  let frontierExploration = false;
  let patrolEscort = false;
  const runStarted = performance.now();
  for (let step = 0; step < 400 && state.outcome === null; step += 1) {
    const actor = state.turnOrder[state.activeSeatIndex] as PlayerId;
    const view = viewForV7(state, actor);
    let command: CommandV7 | null | undefined;
    if (actor === fixture.subjectId) {
      const policyStarted = performance.now();
      const work = new NormalPolicyWorkV7(view);
      let sliceStarted = performance.now();
      let decision = work.runSlice(4);
      let commandMaximumSlice = performance.now() - sliceStarted;
      let commandSlices = 1;
      while (decision === null) {
        commandSlices += 1;
        sliceStarted = performance.now();
        decision = work.runSlice(4);
        commandMaximumSlice = Math.max(
          commandMaximumSlice,
          performance.now() - sliceStarted,
        );
      }
      callbacks += 1;
      slices += commandSlices;
      maximumSlices = Math.max(maximumSlices, commandSlices);
      maximumSliceMilliseconds = Math.max(
        maximumSliceMilliseconds,
        commandMaximumSlice,
      );
      maximumPolicyWallMilliseconds = Math.max(
        maximumPolicyWallMilliseconds,
        performance.now() - policyStarted,
      );
      command = chooseNormalTurnCommandV7(
        view,
        commandsThisTurn,
        128,
        decision,
      );
    } else
      command = queryPlayerCommandsV7(view).find(
        (candidate) => candidate.kind === "END_TURN",
      );
    assert(command !== null && command !== undefined, "target policy stalled");
    const priorUnit =
      "unitId" in command
        ? state.units.find((unit) => unit.id === command.unitId)
        : undefined;
    const beforeRound = state.round;
    const applied = applyCommandV7(state, actor, command);
    assert(applied.accepted, `${mapType}/${seed}:${command.kind} rejected`);
    commands.push(command);
    eventKinds.push(...applied.events.map((event) => event.kind));
    if (actor === fixture.subjectId) {
      if (command.kind === "RESEARCH" && command.tech === "SHORECRAFT")
        shorecraft = true;
      if (command.kind === "RESEARCH" && command.tech === "NAVIGATION")
        navigation = true;
      if (command.kind === "BUILD_PORT") port = true;
      if (
        command.kind === "MOVE" &&
        applied.events.some((event) => event.kind === "UNIT_EMBARKED")
      ) {
        departedUnitIds.add(command.unitId);
        departure = true;
      }
      if (
        command.kind === "MOVE" &&
        priorUnit?.form === "EMBARKED" &&
        applied.events.some((event) => event.kind === "TILES_REVEALED")
      )
        frontierExploration = true;
      if (command.kind === "MOVE" && priorUnit?.role === "PATROL_BOAT") {
        const destination = command.path.at(-1);
        if (
          destination !== undefined &&
          applied.state.units.some(
            (unit) =>
              unit.ownerId === fixture.subjectId &&
              unit.form === "EMBARKED" &&
              Math.max(
                Math.abs(unit.at.x - destination.x),
                Math.abs(unit.at.y - destination.y),
              ) <= 1,
          )
        )
          patrolEscort = true;
      }
      if (command.kind === "DISEMBARK" && departedUnitIds.has(command.unitId)) {
        landing = true;
        landedRounds.set(command.unitId, beforeRound);
      }
      if (
        command.kind === "CAPTURE" &&
        applied.events.some((event) => event.kind === "CITY_CAPTURED")
      )
        captureWait ||=
          landedRounds.has(command.unitId) &&
          beforeRound > (landedRounds.get(command.unitId) ?? beforeRound);
    }
    state = applied.state;
    commandsThisTurn = command.kind === "END_TURN" ? 0 : commandsThisTurn + 1;
  }
  assert(
    shorecraft &&
      port &&
      departure &&
      frontierExploration &&
      landing &&
      captureWait,
  );
  if (deepLane) assert(navigation);
  return {
    mapType,
    seed,
    geometry,
    deepLane,
    shorecraft,
    navigation,
    port,
    departure,
    frontierExploration,
    landing,
    captureWait,
    patrolEscort,
    finalHash: canonicalHash(state),
    commandHash: canonicalHash(commands),
    eventHash: canonicalHash(eventKinds),
    commands: state.commandIndex,
    policyCallbacks: callbacks,
    policySlices: slices,
    maximumSlices,
    maximumPolicyWallMilliseconds,
    maximumSliceMilliseconds,
    wallMilliseconds: performance.now() - runStarted,
  };
}

function nonHumanInvasion(
  humanPlayerId: PlayerId,
  log: readonly {
    readonly index: number;
    readonly playerId: PlayerId;
    readonly command: CommandV7;
    readonly events: readonly { readonly kind: string }[];
  }[],
) {
  const lifecycles = new Map<
    number,
    { ownerId: PlayerId; departure: number; landing?: number }
  >();
  for (const entry of log) {
    if (entry.playerId === humanPlayerId) continue;
    const command = entry.command;
    if (
      command.kind === "MOVE" &&
      entry.events.some((event) => event.kind === "UNIT_EMBARKED")
    )
      lifecycles.set(command.unitId, {
        ownerId: entry.playerId,
        departure: entry.index,
      });
    else if (command.kind === "DISEMBARK") {
      const current = lifecycles.get(command.unitId);
      if (current !== undefined) current.landing = entry.index;
    } else if (
      command.kind === "CAPTURE" &&
      entry.events.some((event) => event.kind === "CITY_CAPTURED")
    ) {
      const current = lifecycles.get(command.unitId);
      if (current?.landing !== undefined && entry.index > current.landing)
        return { unitId: command.unitId, ...current, capture: entry.index };
    }
  }
  return null;
}
