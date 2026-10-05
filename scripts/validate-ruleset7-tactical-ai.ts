import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import {
  NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
  NormalPolicyWorkV7,
  chooseNormalTurnCommandV7,
  inspectNormalAttackPurposeV7,
  publicThreatenedTilesForPolicyV7,
} from "../src/ai/v7";
import type { chooseNormalCommandV7 } from "../src/ai/v7";
import {
  RULESET_7_ID,
  applyCommandV7,
  arePlayersAlliedV7,
  createPlayableGameV7,
  unitRoleRuleV7,
  landTradeCityIdsV7,
  marketIncomeForCityV7,
  queryCombatPreviewV7,
  seaTradeCityIdsV7,
  viewForV7,
  type CommandV7,
  type GameStateV7,
  type MapTypeV7,
  type PlayerId,
  type PlayerViewV7,
  type CoordV7,
} from "../src/engine/index";
import {
  TACTICAL_AI_BASELINE_REF,
  TACTICAL_AI_BASELINE_SHA256,
  loadPinnedTacticalAiBaselineV7,
} from "./ruleset-v7-tactical-ai-baseline";

const mode = option("--mode");
if (mode !== "focused" && mode !== "full" && mode !== "natural-diagnostic")
  throw new Error("--mode must be focused, full, or natural-diagnostic");
const output = option("--output");
const naturalDiagnosticCases = {
  "2-rival-6173": [2, "RIVAL", 6173, 14],
  "2-cooperative-6173": [2, "COOPERATIVE", 6173, 14],
  "3-rival-0": [3, "RIVAL", 0, 16],
} as const;
const naturalCaseName = optionalOption("--natural-case") ?? "2-rival-6173";
const naturalDiagnostic =
  naturalDiagnosticCases[
    naturalCaseName as keyof typeof naturalDiagnosticCases
  ];
if (mode === "natural-diagnostic" && naturalDiagnostic === undefined)
  throw new Error(
    `--natural-case must be one of ${Object.keys(naturalDiagnosticCases).join(", ")}`,
  );
const corpus =
  mode === "focused"
    ? ([
        ["DRY_LAND", 7111],
        ["CONTINENTS", 7211],
        ["ARCHIPELAGO", 7311],
      ] as const)
    : ([
        ["DRY_LAND", 7111],
        ["DRY_LAND", 7112],
        ["DRY_LAND", 7113],
        ["DRY_LAND", 7114],
        ["CONTINENTS", 7211],
        ["CONTINENTS", 7212],
        ["CONTINENTS", 7213],
        ["CONTINENTS", 7214],
        ["ARCHIPELAGO", 7311],
        ["ARCHIPELAGO", 7312],
        ["ARCHIPELAGO", 7313],
        ["ARCHIPELAGO", 7314],
      ] as const);

const baseline = await loadPinnedTacticalAiBaselineV7();
try {
  const paired = [];
  let natural = [];
  if (mode === "full") natural = runNaturalCorpus(paired);
  else if (mode === "natural-diagnostic") {
    if (naturalDiagnostic === undefined)
      throw new Error("Natural diagnostic case is missing");
    natural = [runNaturalGame(...naturalDiagnostic)];
  }
  if (mode === "natural-diagnostic")
    writeCheckpoint(output, mode, paired, natural);
  if (mode !== "natural-diagnostic")
    for (const [mapType, seed] of corpus)
      for (const revisedSeat of [0, 1] as const) {
        process.stderr.write(
          `[comparison] ${mapType} ${seed} revised-seat-${revisedSeat}\n`,
        );
        paired.push(runPairedGame(mapType, seed, revisedSeat, baseline.module));
        writeCheckpoint(output, mode, paired, natural);
      }
  const revisedWins = paired.filter((game) => game.winner === "REVISED").length;
  const baselineWins = paired.filter(
    (game) => game.winner === "BASELINE",
  ).length;
  const report = {
    schemaVersion: 1,
    mode,
    baseline: {
      ref: TACTICAL_AI_BASELINE_REF,
      sha256: TACTICAL_AI_BASELINE_SHA256,
      adapter: "pinned policy source against current revision-11 engine",
    },
    caps: {
      rounds: 200,
      acceptedCommands: 30_000,
      commandsPerOwnerTurn: 128,
      wallSeconds: 300,
    },
    pairedSummary: {
      games: paired.length,
      revisedWins,
      baselineWins,
      drawsOrCaps: paired.length - revisedWins - baselineWins,
      fullGateApplies: mode === "full",
      fullGatePassed:
        mode === "full" && revisedWins >= 14 && revisedWins > baselineWins,
    },
    paired,
    natural,
  };
  mkdirSync(dirname(resolve(output)), { recursive: true });
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  const invalidReport =
    !allFiniteOrNull(report) ||
    paired.some(
      (game) =>
        !["OUTCOME", "ROUND_CAP", "WALL_CAP"].includes(game.termination) ||
        game.maximumCommandsInTurn > 128,
    ) ||
    natural.some(
      (game) =>
        !["OUTCOME", "ROUND_CAP"].includes(game.termination) ||
        game.maximumCommandsInTurn > 128 ||
        (game.aiMode === "COOPERATIVE" &&
          (game.metrics.cooperative.aiOnAiHostileCommands !== 0 ||
            game.metrics.cooperative.casualties !== 0 ||
            game.metrics.cooperative.captures !== 0 ||
            game.metrics.cooperative.alliedTerritoryPathSteps !== 0)),
    );
  if (
    invalidReport ||
    (mode === "full" && (revisedWins < 14 || revisedWins <= baselineWins))
  )
    process.exitCode = 1;
} finally {
  baseline.cleanup();
}

function runPairedGame(
  mapType: MapTypeV7,
  seed: number,
  revisedSeat: 0 | 1,
  baselinePolicy: Awaited<
    ReturnType<typeof loadPinnedTacticalAiBaselineV7>
  >["module"],
) {
  const created = createPlayableGameV7({
    rulesetId: RULESET_7_ID,
    seed,
    width: 14,
    height: 14,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: ["ORIGINAL", "ORIGINAL"],
    mapType,
    // Human v Human: the headless and test only mirror option
    // (docs/architecture/HEADLESS_SIMULATION.md).
    allowDuplicateFactions: true,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  });
  if (!created.ok) throw new Error(`${mapType}/${seed}: ${created.error.code}`);
  let state = created.state;
  const playersBySeat = [...state.players].sort(
    (left, right) => left.seat - right.seat,
  );
  const revisedPlayerId = playersBySeat[revisedSeat]?.id;
  const baselinePlayerId = playersBySeat[1 - revisedSeat]?.id;
  if (revisedPlayerId === undefined || baselinePlayerId === undefined)
    throw new Error("Paired seat assignment missing");
  let turnPlayer: PlayerId | null = null;
  let commandsThisTurn = 0;
  let maximumCommandsInTurn = 0;
  const started = performance.now();
  const metrics = {
    REVISED: emptyPolicyMetrics(true),
    BASELINE: emptyPolicyMetrics(false),
  };
  const metricSnapshot = createPublicMetricSnapshotCache();
  let termination = "OUTCOME";
  let failure: string | null = null;
  while (state.outcome === null) {
    if (state.round > 200) {
      termination = "ROUND_CAP";
      break;
    }
    if (state.commandIndex >= 30_000) {
      termination = "ACCEPTED_COMMAND_CAP";
      break;
    }
    if (performance.now() - started >= 300_000) {
      termination = "WALL_CAP";
      break;
    }
    const actor = activePlayer(state);
    if (actor !== turnPlayer) {
      maximumCommandsInTurn = Math.max(maximumCommandsInTurn, commandsThisTurn);
      turnPlayer = actor;
      commandsThisTurn = 0;
    }
    const beforeSnapshot = metricSnapshot(state, actor);
    const view = beforeSnapshot.view;
    const policy = actor === revisedPlayerId ? "REVISED" : "BASELINE";
    const actorMetrics = metrics[policy];
    const threatenedBefore = beforeSnapshot.threatenedCityIds;
    const decisionStarted = performance.now();
    let decisionSlices = 0;
    let command: CommandV7 | null;
    try {
      if (actor === revisedPlayerId) {
        const work = new NormalPolicyWorkV7(view);
        let decision = null;
        let nextProgress = performance.now() + 5_000;
        while (decision === null && performance.now() - started < 300_000) {
          decision = work.advanceWork(64);
          actorMetrics.schedulerSlices += 1;
          decisionSlices += 1;
          if (performance.now() >= nextProgress) {
            const diagnostic = work.diagnostic();
            process.stderr.write(
              `[decision] ${mapType} ${seed} seat-${revisedSeat} command-${state.commandIndex} revised ${diagnostic.phase} work-${diagnostic.workUnits}\n`,
            );
            nextProgress += 5_000;
          }
        }
        const diagnostic = work.diagnostic();
        actorMetrics.schedulerWorkUnits =
          (actorMetrics.schedulerWorkUnits ?? 0) + diagnostic.workUnits;
        actorMetrics.maximumDecisionWorkUnits = Math.max(
          actorMetrics.maximumDecisionWorkUnits ?? 0,
          diagnostic.workUnits,
        );
        for (const [phase, workUnits] of Object.entries(
          diagnostic.workUnitsByPhase,
        ))
          actorMetrics.workUnitsByPhase[phase] =
            (actorMetrics.workUnitsByPhase[phase] ?? 0) + workUnits;
        accumulatePathWork(actorMetrics, diagnostic.pathWork);
        if (decision === null) {
          termination = "WALL_CAP";
          failure = "REVISED_POLICY_DECISION_WALL_CAP";
          writeSlowDecision(output, {
            mapType,
            seed,
            revisedSeat,
            commandIndex: state.commandIndex,
            round: state.round,
            policy: "REVISED",
            elapsedMs: Math.round(performance.now() - started),
            diagnostic,
            stateCounts: stateCounts(state, view),
            view,
          });
          break;
        }
        command = chooseNormalTurnCommandV7(
          view,
          commandsThisTurn,
          NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
          decision,
        );
      } else {
        const work = new baselinePolicy.NormalPolicyWorkV7(
          view,
          performance.now.bind(performance),
        );
        let decision: unknown = null;
        while (decision === null && performance.now() - started < 300_000) {
          decision = work.runSlice(8);
          actorMetrics.schedulerSlices += 1;
          decisionSlices += 1;
        }
        if (decision === null) {
          termination = "WALL_CAP";
          failure = "BASELINE_POLICY_DECISION_WALL_CAP";
          writeSlowDecision(output, {
            mapType,
            seed,
            revisedSeat,
            commandIndex: state.commandIndex,
            round: state.round,
            policy: "BASELINE",
            elapsedMs: Math.round(performance.now() - started),
            stateCounts: stateCounts(state, view),
            view,
          });
          break;
        }
        command = baselinePolicy.chooseNormalTurnCommandV7(
          view,
          commandsThisTurn,
          NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
          decision,
        ) as CommandV7 | null;
      }
    } catch (cause) {
      termination = "STRUCTURED_FAILURE";
      failure = cause instanceof Error ? cause.message : String(cause);
      writeSlowDecision(output, {
        kind: "STRUCTURED_FAILURE",
        mapType,
        seed,
        revisedSeat,
        commandIndex: state.commandIndex,
        round: state.round,
        actor,
        policy,
        failure,
        state,
        view,
      });
      break;
    }
    if (command === null) {
      termination = "STALL";
      failure = "Policy selected no command";
      break;
    }
    const decisionDurationMs = performance.now() - decisionStarted;
    actorMetrics.maximumDecisionSlices = Math.max(
      actorMetrics.maximumDecisionSlices,
      decisionSlices,
    );
    actorMetrics.decisionDurationMs += decisionDurationMs;
    actorMetrics.maximumDecisionDurationMs = Math.max(
      actorMetrics.maximumDecisionDurationMs,
      decisionDurationMs,
    );
    const combatPreview =
      command.kind === "ATTACK"
        ? queryCombatPreviewV7(view, command.unitId, command.targetUnitId)
        : null;
    const attackPurpose =
      command.kind === "ATTACK"
        ? inspectNormalAttackPurposeV7(view, command)
        : null;
    const beforeRoadNetwork = new Set(view.naval.networkCityIds);
    const result = applyCommandV7(state, actor, command);
    if (!result.accepted) {
      termination = "REJECTED_COMMAND";
      failure = `${command.kind}:${result.error.code}`;
      writeSlowDecision(output, {
        kind: "REJECTED_COMMAND",
        mapType,
        seed,
        revisedSeat,
        commandIndex: state.commandIndex,
        round: state.round,
        actor,
        policy,
        command,
        error: result.error,
        state,
        view,
      });
      break;
    }
    if (result.state.commandIndex <= state.commandIndex) {
      termination = "NON_ADVANCING_ACCEPTANCE";
      failure = command.kind;
      break;
    }
    state = result.state;
    commandsThisTurn += 1;
    actorMetrics.commands[command.kind] =
      (actorMetrics.commands[command.kind] ?? 0) + 1;
    for (const event of result.events)
      actorMetrics.events[event.kind] =
        (actorMetrics.events[event.kind] ?? 0) + 1;
    const captureEvents = result.events.filter(
      (event) => event.kind === "CITY_CAPTURED",
    );
    const hostileCaptures = captureEvents.filter(
      (event) => event.from !== null,
    );
    actorMetrics.captureConversions += hostileCaptures.length;
    actorMetrics.citiesCaptured += hostileCaptures.length;
    actorMetrics.neutralExpansions +=
      captureEvents.length - hostileCaptures.length;
    for (const event of hostileCaptures) {
      if (event.from === revisedPlayerId) metrics.REVISED.citiesLost += 1;
      if (event.from === baselinePlayerId) metrics.BASELINE.citiesLost += 1;
    }
    const nonlethalSacrifice =
      combatPreview?.attackerDies === true &&
      combatPreview.defenderDies === false;
    actorMetrics.rawNonlethalSacrifices += Number(nonlethalSacrifice);
    actorMetrics.lowValueSuicidalAttacks += Number(
      nonlethalSacrifice &&
        attackPurpose !== null &&
        !attackPurpose.savesCity &&
        !attackPurpose.opensLethalFollowUp &&
        !attackPurpose.higherResult,
    );
    actorMetrics.supportActions += Number(
      command.kind === "RALLY" || command.kind === "TEND_WOUNDED",
    );
    actorMetrics.recoveries += Number(command.kind === "RECOVER");
    if (command.kind === "BUILD_ROAD") {
      const afterRoadNetwork = metricSnapshot(state, actor).view.naval
        .networkCityIds;
      const newlyConnected = afterRoadNetwork.filter(
        (cityId) =>
          cityId !== view.viewer.originalCapitalCityId &&
          !beforeRoadNetwork.has(cityId),
      );
      actorMetrics.roadConnections += newlyConnected.length;
      actorMetrics.roadConnectionCityIds.push(...newlyConnected);
    }
    if (state.outcome === null && activePlayer(state) === actor) {
      const threatenedAfter = metricSnapshot(state, actor).threatenedCityIds;
      actorMetrics.actualThreatenedCitySaves += [...threatenedBefore].filter(
        (cityId) => !threatenedAfter.has(cityId),
      ).length;
    }
    if (state.commandIndex % 250 === 0)
      process.stderr.write(
        `[comparison] ${mapType} ${seed} seat-${revisedSeat}: ${state.commandIndex} commands round ${state.round}\n`,
      );
  }
  maximumCommandsInTurn = Math.max(maximumCommandsInTurn, commandsThisTurn);
  if (termination !== "OUTCOME") {
    const actor = activePlayer(state);
    const view = viewForV7(state, actor);
    writeSlowDecision(output, {
      kind: "PAIRED_TERMINATION",
      mapType,
      seed,
      revisedSeat,
      termination,
      failure,
      commandIndex: state.commandIndex,
      round: state.round,
      actor,
      elapsedMs: Math.round(performance.now() - started),
      stateCounts: stateCounts(state, view),
      state,
      view,
    });
  }
  const winnerId = winner(state);
  return {
    mapType,
    seed,
    revisedSeat,
    revisedPlayerId,
    baselinePlayerId,
    winner:
      winnerId === revisedPlayerId
        ? "REVISED"
        : winnerId === baselinePlayerId
          ? "BASELINE"
          : null,
    termination,
    failure,
    rounds: state.round,
    acceptedCommands: state.commandIndex,
    maximumCommandsInTurn,
    durationMs: Math.round(performance.now() - started),
    metrics,
  };
}

function runNaturalCorpus(paired: readonly unknown[]) {
  const results = [];
  for (const aiCount of [1, 2, 3] as const)
    for (const aiMode of ["RIVAL", "COOPERATIVE"] as const)
      for (const seed of [0, 6173]) {
        process.stderr.write(`[natural] ${aiCount} ${aiMode} seed-${seed}\n`);
        const size = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
        results.push(runNaturalGame(aiCount, aiMode, seed, size));
        writeCheckpoint(output, mode, paired, results);
      }
  return results;
}

function runNaturalGame(
  aiCount: 1 | 2 | 3,
  aiMode: "RIVAL" | "COOPERATIVE",
  seed: number,
  size: 11 | 14 | 16,
) {
  const created = createPlayableGameV7({
    rulesetId: RULESET_7_ID,
    seed,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode,
    humanColor: "CORAL",
    factions: Array.from({ length: aiCount + 1 }, () => "ORIGINAL"),
    mapType: "CONTINENTS",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
    // Human v Human: the headless and test only mirror option
    // (docs/architecture/HEADLESS_SIMULATION.md).
    allowDuplicateFactions: true,
  });
  if (!created.ok)
    throw new Error(`natural/${aiCount}/${seed}: ${created.error.code}`);
  let state = created.state;
  const started = performance.now();
  let turnPlayer: PlayerId | null = null;
  let commandsThisTurn = 0;
  let maximumCommandsInTurn = 0;
  let termination = "OUTCOME";
  let failure: string | null = null;
  const metrics = {
    ...emptyPolicyMetrics(true),
    research: 0,
    cityActions: {} as Record<string, number>,
    windmillHealing: 0,
    roadsBuilt: 0,
    marketIncome: 0,
    tradeIncome: 0,
    supportActions: 0,
    recoveries: 0,
    cooperative: {
      aiOnAiHostileCommands: 0,
      casualties: 0,
      captures: 0,
      alliedTerritoryPathSteps: 0,
      publicViewPolicyChecks: 0,
      privacyEvidence:
        "Policy input is PlayerViewV7; equal-view parity is verified by the tactical unit suite.",
    },
  };
  const metricSnapshot = createPublicMetricSnapshotCache();
  while (state.outcome === null) {
    if (state.round > 200) {
      termination = "ROUND_CAP";
      break;
    }
    if (state.commandIndex >= 30_000) {
      termination = "ACCEPTED_COMMAND_CAP";
      break;
    }
    if (performance.now() - started >= 300_000) {
      termination = "WALL_CAP";
      break;
    }
    const actor = activePlayer(state);
    if (actor !== turnPlayer) {
      maximumCommandsInTurn = Math.max(maximumCommandsInTurn, commandsThisTurn);
      turnPlayer = actor;
      commandsThisTurn = 0;
    }
    const beforeSnapshot = metricSnapshot(state, actor);
    const view = beforeSnapshot.view;
    const threatenedBefore = beforeSnapshot.threatenedCityIds;
    const beforeRoadNetwork = new Set(view.naval.networkCityIds);
    const decisionStarted = performance.now();
    let decisionSlices = 0;
    let command: CommandV7 | null = null;
    try {
      const work = new NormalPolicyWorkV7(view);
      let decision: ReturnType<typeof chooseNormalCommandV7> | null = null;
      while (decision === null && performance.now() - started < 300_000) {
        decision = work.advanceWork(64);
        metrics.schedulerSlices += 1;
        decisionSlices += 1;
      }
      const diagnostic = work.diagnostic();
      metrics.schedulerWorkUnits =
        (metrics.schedulerWorkUnits ?? 0) + diagnostic.workUnits;
      metrics.maximumDecisionWorkUnits = Math.max(
        metrics.maximumDecisionWorkUnits ?? 0,
        diagnostic.workUnits,
      );
      for (const [phase, workUnits] of Object.entries(
        diagnostic.workUnitsByPhase,
      ))
        metrics.workUnitsByPhase[phase] =
          (metrics.workUnitsByPhase[phase] ?? 0) + workUnits;
      accumulatePathWork(metrics, diagnostic.pathWork);
      if (decision === null) {
        termination = "WALL_CAP";
        failure = "REVISED_POLICY_DECISION_WALL_CAP";
        writeSlowDecision(output, {
          kind: "NATURAL_WALL_CAP",
          aiCount,
          aiMode,
          seed,
          commandIndex: state.commandIndex,
          round: state.round,
          actor,
          elapsedMs: Math.round(performance.now() - started),
          diagnostic,
          stateCounts: stateCounts(state, view),
          state,
          view,
        });
        break;
      }
      metrics.cooperative.publicViewPolicyChecks += 1;
      command = chooseNormalTurnCommandV7(
        view,
        commandsThisTurn,
        NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
        decision,
      );
    } catch (cause) {
      termination = "STRUCTURED_FAILURE";
      failure = cause instanceof Error ? cause.message : String(cause);
      writeSlowDecision(output, {
        kind: "NATURAL_STRUCTURED_FAILURE",
        aiCount,
        aiMode,
        seed,
        commandIndex: state.commandIndex,
        round: state.round,
        actor,
        failure,
        state,
        view,
      });
      break;
    }
    const decisionDuration = performance.now() - decisionStarted;
    metrics.decisionDurationMs += decisionDuration;
    metrics.maximumDecisionDurationMs = Math.max(
      metrics.maximumDecisionDurationMs,
      decisionDuration,
    );
    metrics.maximumDecisionSlices = Math.max(
      metrics.maximumDecisionSlices,
      decisionSlices,
    );
    if (command === null) {
      termination = "STALL";
      failure = "Policy selected no command";
      break;
    }
    const preview =
      command.kind === "ATTACK"
        ? queryCombatPreviewV7(view, command.unitId, command.targetUnitId)
        : null;
    const attackPurpose =
      command.kind === "ATTACK"
        ? inspectNormalAttackPurposeV7(view, command)
        : null;
    if (aiMode === "COOPERATIVE") {
      if (command.kind === "ATTACK") {
        const target = view.units.find(
          (unit) => unit.id === command.targetUnitId,
        );
        metrics.cooperative.aiOnAiHostileCommands += Number(
          target !== undefined &&
            arePlayersAlliedV7(state, actor, target.ownerId),
        );
      }
      if (command.kind === "CAPTURE") {
        const unit = view.units.find((item) => item.id === command.unitId);
        const city = view.cities.find(
          (item) => unit !== undefined && sameCoord(item.at, unit.at),
        );
        metrics.cooperative.aiOnAiHostileCommands += Number(
          city?.ownerId !== undefined &&
            arePlayersAlliedV7(state, actor, city.ownerId),
        );
      }
      if (command.kind === "MOVE")
        for (const at of command.path) {
          const owner = view.board.tiles.find(
            (tile) => tile.explored && sameCoord(tile.at, at),
          );
          if (
            owner?.explored === true &&
            owner.territoryOwnerId !== null &&
            owner.territoryOwnerId !== actor &&
            arePlayersAlliedV7(state, actor, owner.territoryOwnerId)
          )
            metrics.cooperative.alliedTerritoryPathSteps += 1;
        }
    }
    const ownersBefore = new Map(
      state.units.map((unit) => [unit.id, unit.ownerId]),
    );
    const result = applyCommandV7(state, actor, command);
    if (!result.accepted) {
      termination = "REJECTED_COMMAND";
      failure = `${command.kind}:${result.error.code}`;
      writeSlowDecision(output, {
        kind: "NATURAL_REJECTED_COMMAND",
        aiCount,
        aiMode,
        seed,
        commandIndex: state.commandIndex,
        round: state.round,
        actor,
        command,
        error: result.error,
        state,
        view,
      });
      break;
    }
    if (result.state.commandIndex <= state.commandIndex) {
      termination = "NON_ADVANCING_ACCEPTANCE";
      failure = command.kind;
      break;
    }
    state = result.state;
    commandsThisTurn += 1;
    metrics.commands[command.kind] = (metrics.commands[command.kind] ?? 0) + 1;
    for (const event of result.events) {
      metrics.events[event.kind] = (metrics.events[event.kind] ?? 0) + 1;
      if (event.kind === "TECH_RESEARCHED") metrics.research += 1;
      if (event.kind === "WINDMILL_HEALING_RESOLVED")
        metrics.windmillHealing += event.results.reduce(
          (total, item) => total + item.amount,
          0,
        );
      if (event.kind === "INCOME_AWARDED") {
        const owned = state.cities.filter(
          (city) => city.ownerId === event.playerId,
        );
        metrics.marketIncome += owned.reduce(
          (total, city) => total + marketIncomeForCityV7(state, city),
          0,
        );
        const land = landTradeCityIdsV7(state, event.playerId);
        const sea = seaTradeCityIdsV7(state, event.playerId);
        metrics.tradeIncome += owned.reduce(
          (total, city) =>
            total + Number(land.has(city.id)) + Number(sea.has(city.id)),
          0,
        );
      }
    }
    const captureEvents = result.events.filter(
      (event) => event.kind === "CITY_CAPTURED",
    );
    const hostileCaptures = captureEvents.filter(
      (event) => event.from !== null,
    );
    metrics.captureConversions += hostileCaptures.length;
    metrics.citiesCaptured += hostileCaptures.length;
    metrics.citiesLost += hostileCaptures.length;
    metrics.neutralExpansions += captureEvents.length - hostileCaptures.length;
    const nonlethalSacrifice =
      preview?.attackerDies === true && preview.defenderDies === false;
    metrics.rawNonlethalSacrifices += Number(nonlethalSacrifice);
    metrics.lowValueSuicidalAttacks += Number(
      nonlethalSacrifice &&
        attackPurpose !== null &&
        !attackPurpose.savesCity &&
        !attackPurpose.opensLethalFollowUp &&
        !attackPurpose.higherResult,
    );
    metrics.supportActions += Number(
      command.kind === "RALLY" || command.kind === "TEND_WOUNDED",
    );
    metrics.recoveries += Number(command.kind === "RECOVER");
    metrics.roadsBuilt += Number(command.kind === "BUILD_ROAD");
    if (["TRAIN", "TRAIN_NAVAL", "LAND_GRANT"].includes(command.kind))
      metrics.cityActions[command.kind] =
        (metrics.cityActions[command.kind] ?? 0) + 1;
    if (command.kind === "BUILD_ROAD") {
      const after = metricSnapshot(state, actor).view.naval.networkCityIds;
      const newlyConnected = after.filter(
        (cityId) =>
          cityId !== view.viewer.originalCapitalCityId &&
          !beforeRoadNetwork.has(cityId),
      );
      metrics.roadConnections += newlyConnected.length;
      metrics.roadConnectionCityIds.push(...newlyConnected);
    }
    if (state.outcome === null && activePlayer(state) === actor) {
      const threatenedAfter = metricSnapshot(state, actor).threatenedCityIds;
      metrics.actualThreatenedCitySaves += [...threatenedBefore].filter(
        (cityId) => !threatenedAfter.has(cityId),
      ).length;
    }
    if (aiMode === "COOPERATIVE") {
      metrics.cooperative.casualties += result.events.filter(
        (event) =>
          event.kind === "UNIT_DIED" &&
          ownersBefore.get(event.unitId) !== undefined &&
          arePlayersAlliedV7(
            state,
            actor,
            ownersBefore.get(event.unitId) as PlayerId,
          ),
      ).length;
      metrics.cooperative.captures += hostileCaptures.filter(
        (event) =>
          event.from !== null && arePlayersAlliedV7(state, actor, event.from),
      ).length;
    }
  }
  maximumCommandsInTurn = Math.max(maximumCommandsInTurn, commandsThisTurn);
  if (termination !== "OUTCOME") {
    const actor = activePlayer(state);
    const view = viewForV7(state, actor);
    writeSlowDecision(output, {
      kind: "NATURAL_TERMINATION",
      aiCount,
      aiMode,
      seed,
      termination,
      failure,
      commandIndex: state.commandIndex,
      round: state.round,
      actor,
      elapsedMs: Math.round(performance.now() - started),
      stateCounts: stateCounts(state, view),
      state,
      view,
    });
  }
  return {
    aiCount,
    aiMode,
    seed,
    boardSize: size,
    termination,
    failure,
    outcome: state.outcome,
    rounds: state.round,
    acceptedCommands: state.commandIndex,
    maximumCommandsInTurn,
    durationMs: Math.round(performance.now() - started),
    metrics,
  };
}

function activePlayer(state: GameStateV7): PlayerId {
  const id = state.turnOrder[state.activeSeatIndex];
  if (id === undefined) throw new Error("Active player missing");
  return id;
}

function winner(state: GameStateV7): PlayerId | null {
  const outcome = state.outcome;
  if (outcome === null) return null;
  if (outcome.kind === "VICTORY" || outcome.kind === "HEADLESS_VICTORY")
    return outcome.winnerId;
  return outcome.defeatedByPlayerId;
}

function option(name: string): string {
  const index = process.argv.indexOf(name);
  const value = process.argv[index + 1];
  if (index < 0 || value === undefined || value.startsWith("--"))
    throw new Error(`Missing ${name}`);
  return value;
}

function optionalOption(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--"))
    throw new Error(`Missing ${name}`);
  return value;
}

function emptyPolicyMetrics(exactWorkAvailable: boolean) {
  return {
    commands: {} as Record<string, number>,
    events: {} as Record<string, number>,
    actualThreatenedCitySaves: 0,
    captureConversions: 0,
    lowValueSuicidalAttacks: 0,
    rawNonlethalSacrifices: 0,
    supportActions: 0,
    recoveries: 0,
    roadConnections: 0,
    roadConnectionCityIds: [] as number[],
    citiesCaptured: 0,
    citiesLost: 0,
    neutralExpansions: 0,
    schedulerWorkUnits: exactWorkAvailable ? 0 : null,
    schedulerSlices: 0,
    maximumDecisionSlices: 0,
    maximumDecisionWorkUnits: exactWorkAvailable ? 0 : null,
    workUnitsByPhase: {} as Record<string, number>,
    pathWork: exactWorkAvailable
      ? {
          navalPathExpansions: 0,
          threatPathExpansions: 0,
          replacementPathValidations: 0,
          roadPathExpansions: 0,
        }
      : null,
    maximumPathWorkPerDecision: exactWorkAvailable
      ? {
          navalPathExpansions: 0,
          threatPathExpansions: 0,
          replacementPathValidations: 0,
          roadPathExpansions: 0,
        }
      : null,
    decisionDurationMs: 0,
    maximumDecisionDurationMs: 0,
    workAccounting: exactWorkAvailable
      ? "exact NormalPolicyWorkV7 units"
      : "unavailable for pinned legacy wall-time API",
  };
}

function accumulatePathWork(
  metrics: ReturnType<typeof emptyPolicyMetrics>,
  pathWork: {
    readonly navalPathExpansions: number;
    readonly threatPathExpansions: number;
    readonly replacementPathValidations: number;
    readonly roadPathExpansions: number;
  },
): void {
  if (metrics.pathWork === null || metrics.maximumPathWorkPerDecision === null)
    return;
  for (const key of Object.keys(pathWork) as (keyof typeof pathWork)[]) {
    metrics.pathWork[key] += pathWork[key];
    metrics.maximumPathWorkPerDecision[key] = Math.max(
      metrics.maximumPathWorkPerDecision[key],
      pathWork[key],
    );
  }
}

function stateCounts(state: GameStateV7, view: PlayerViewV7) {
  return {
    players: state.players.length,
    cities: state.cities.length,
    units: state.units.length,
    publicCities: view.cities.length,
    publicUnits: view.units.length,
    boardCells: state.board.width * state.board.height,
    coins: view.viewer.coins,
  };
}

function writeSlowDecision(outputPath: string, evidence: unknown): void {
  const record =
    evidence !== null && typeof evidence === "object"
      ? (evidence as Record<string, unknown>)
      : {};
  const suffix = [
    record.kind ?? "SLOW_DECISION",
    record.mapType,
    record.aiMode,
    record.seed,
    record.revisedSeat,
    record.aiCount,
    record.commandIndex,
  ]
    .filter((part) => part !== undefined)
    .join("-")
    .replaceAll(/[^A-Za-z0-9_-]/g, "_");
  const path = `${outputPath}.${suffix}.json`;
  mkdirSync(dirname(resolve(path)), { recursive: true });
  writeFileSync(path, `${JSON.stringify(evidence, null, 2)}\n`);
}

function createPublicMetricSnapshotCache(): (
  state: GameStateV7,
  actor: PlayerId,
) => {
  readonly view: PlayerViewV7;
  readonly threatenedCityIds: ReadonlySet<number>;
} {
  let cachedState: GameStateV7 | null = null;
  let cachedActor: PlayerId | null = null;
  let cached:
    | {
        readonly view: PlayerViewV7;
        readonly threatenedCityIds: ReadonlySet<number>;
      }
    | undefined;
  return (state, actor) => {
    if (cachedState === state && cachedActor === actor && cached !== undefined)
      return cached;
    const view = viewForV7(state, actor);
    cachedState = state;
    cachedActor = actor;
    cached = {
      view,
      threatenedCityIds: publicThreatenedCityIds(view),
    };
    return cached;
  };
}

function publicThreatenedCityIds(view: PlayerViewV7): ReadonlySet<number> {
  const cities = view.cities.filter((city) => city.ownerId === view.viewer.id);
  const result = new Set<number>();
  for (const unit of view.units.filter(
    (candidate) =>
      candidate.ownerId !== view.viewer.id &&
      !arePlayersAlliedV7(view, view.viewer.id, candidate.ownerId),
  )) {
    const threatened = new Set(
      publicThreatenedTilesForPolicyV7(view, unit).map(
        (at) => `${at.y},${at.x}`,
      ),
    );
    for (const city of cities) {
      const imminentCapture =
        unit.form === "LAND" &&
        unit.captureEligible &&
        unitRoleRuleV7(view, unit).abilities.includes("CAPTURE") &&
        sameCoord(unit.at, city.at);
      if (imminentCapture || threatened.has(`${city.at.y},${city.at.x}`))
        result.add(city.id);
    }
  }
  return result;
}

function writeCheckpoint(
  outputPath: string,
  validationMode: string,
  paired: readonly unknown[],
  natural: readonly unknown[] = [],
): void {
  mkdirSync(dirname(resolve(outputPath)), { recursive: true });
  writeFileSync(
    outputPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        status: "RUNNING",
        mode: validationMode,
        baseline: {
          ref: TACTICAL_AI_BASELINE_REF,
          sha256: TACTICAL_AI_BASELINE_SHA256,
        },
        completedPairedGames: paired.length,
        completedNaturalGames: natural.length,
        paired,
        natural,
      },
      null,
      2,
    )}\n`,
  );
}

function sameCoord(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}

function allFiniteOrNull(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (value === null || typeof value !== "object") return true;
  if (Array.isArray(value)) return value.every(allFiniteOrNull);
  return Object.values(value).every(allFiniteOrNull);
}
