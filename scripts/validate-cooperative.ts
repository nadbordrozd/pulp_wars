import { createHash } from "node:crypto";
import {
  applyCommand,
  arePlayersAllied,
  createGame,
  isCityBesieged,
  type MatchSetup,
} from "../src/engine/index";
import { runAiMatch } from "../src/headless/index";

const aiCount = numberArg(2);
const size = sizeArg(aiCount);
const seed = Number(process.argv[4] ?? 0);
if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff)
  throw new Error("seed must be uint32");
const maxCommands = Number(process.argv[5] ?? 1_000);
if (!Number.isSafeInteger(maxCommands) || maxCommands <= 0)
  throw new Error("maxCommands must be positive");

const setup: MatchSetup = {
  rulesetId: "pulp-wars-poc-5",
  seed,
  width: size,
  height: size,
  aiCount,
  factions: Array.from({ length: aiCount + 1 }, () => "ORIGINAL" as const),
  aiDifficulty: "NORMAL",
  aiMode: "COOPERATIVE",
  humanColor: "CORAL",
};
const startedAt = performance.now();
const result = runAiMatch(setup, {
  maxCommands,
  maxRounds: 500,
  recordCheckpointHashes: false,
});
if (
  result.termination !== "OUTCOME" ||
  result.outcome === null ||
  result.errors.length !== 0 ||
  result.stalls.length !== 0
) {
  throw new Error(
    `Cooperative match did not complete cleanly: ${JSON.stringify({
      termination: result.termination,
      outcome: result.outcome,
      errors: result.errors,
      stalls: result.stalls,
    })}`,
  );
}
const commandHash = createHash("sha256")
  .update(JSON.stringify(result.commandLog.map((record) => record.command)))
  .digest("hex");
const eventHash = createHash("sha256")
  .update(JSON.stringify(result.commandLog.map((record) => record.events)))
  .digest("hex");
const created = createGame(setup);
if (!created.ok) throw new Error(`create failed: ${created.error.code}`);
let state = created.state;
const participation: Record<string, number> = {};
const aiParticipation: Record<string, number> = {};
const violations: string[] = [];
let humanAttacks = 0;
let humanCaptures = 0;
let aiTilesRevealed = 0;
let cityLevelUps = 0;

for (const record of result.commandLog) {
  const actor = state.players.find((player) => player.id === record.playerId);
  if (actor === undefined) throw new Error("record actor disappeared");
  participation[record.command.kind] =
    (participation[record.command.kind] ?? 0) + 1;
  if (actor.id !== state.humanPlayerId)
    aiParticipation[record.command.kind] =
      (aiParticipation[record.command.kind] ?? 0) + 1;
  if (record.command.kind === "ATTACK") {
    const target = state.units.find(
      (unit) => unit.id === record.command.targetId,
    );
    if (target === undefined) throw new Error("attack target disappeared");
    if (
      actor.id !== state.humanPlayerId &&
      target.ownerId !== state.humanPlayerId
    )
      violations.push(`ai-on-ai attack at ${record.index}`);
    if (
      actor.id !== state.humanPlayerId &&
      target.ownerId === state.humanPlayerId
    )
      humanAttacks += 1;
  }
  if (record.command.kind === "MOVE" || record.command.kind === "ESCAPE_MOVE") {
    const mover = state.units.find((unit) => unit.id === record.command.unitId);
    if (mover === undefined) throw new Error("mover disappeared");
    for (const at of record.command.path) {
      const tile = state.board.tiles[at.y * state.board.width + at.x];
      const city = state.cities.find(
        (candidate) => candidate.id === tile?.territoryCityId,
      );
      if (
        city !== undefined &&
        arePlayersAllied(
          state.setup.aiMode,
          state.humanPlayerId,
          mover.ownerId,
          city.ownerId,
        )
      )
        violations.push(`allied territory path at ${record.index}`);
    }
  }
  for (const event of record.events) {
    if (
      event.kind === "TILES_REVEALED" &&
      event.playerId !== state.humanPlayerId
    )
      aiTilesRevealed += event.tiles.length;
    if (event.kind === "CITY_LEVELED_UP" && actor.id !== state.humanPlayerId)
      cityLevelUps += 1;
    if (
      event.kind === "CITY_CAPTURED" &&
      event.from !== null &&
      event.from !== state.humanPlayerId &&
      event.to !== state.humanPlayerId
    )
      violations.push(`ai-on-ai capture at ${record.index}`);
    if (
      event.kind === "CITY_CAPTURED" &&
      event.from === state.humanPlayerId &&
      event.to !== state.humanPlayerId
    )
      humanCaptures += 1;
    if (event.kind === "UNIT_MOVE_INTERRUPTED" && event.reason === "ZOC") {
      const mover = state.units.find((unit) => unit.id === event.unitId);
      if (mover === undefined) throw new Error("interrupted mover disappeared");
      const adjacent = state.units.filter(
        (unit) =>
          unit.id !== mover.id &&
          Math.max(
            Math.abs(unit.at.x - event.at.x),
            Math.abs(unit.at.y - event.at.y),
          ) === 1,
      );
      const allied = adjacent.some((unit) =>
        arePlayersAllied(
          state.setup.aiMode,
          state.humanPlayerId,
          mover.ownerId,
          unit.ownerId,
        ),
      );
      const hostile = adjacent.some(
        (unit) =>
          unit.ownerId !== mover.ownerId &&
          !arePlayersAllied(
            state.setup.aiMode,
            state.humanPlayerId,
            mover.ownerId,
            unit.ownerId,
          ),
      );
      if (allied && !hostile)
        violations.push(`allied-only ZOC at ${record.index}`);
    }
  }
  const beforeExplored = new Map(
    state.players.map((player) => [
      player.id,
      new Set(player.explored.map((at) => `${at.x},${at.y}`)),
    ]),
  );
  const applied = applyCommand(state, record.command);
  if (!applied.ok)
    throw new Error(`replay rejected ${record.index}: ${applied.error.code}`);
  state = applied.state;
  for (const player of state.players) {
    if (player.id === state.humanPlayerId) continue;
    const known = beforeExplored.get(player.id) ?? new Set<string>();
    for (const at of player.explored) {
      if (known.has(`${at.x},${at.y}`)) continue;
      const tile = state.board.tiles[at.y * state.board.width + at.x];
      const city = state.cities.find(
        (candidate) => candidate.id === tile?.territoryCityId,
      );
      if (
        city !== undefined &&
        arePlayersAllied(
          state.setup.aiMode,
          state.humanPlayerId,
          player.id,
          city.ownerId,
        )
      )
        violations.push(`new allied exploration at ${record.index}`);
    }
  }
  for (const city of state.cities) {
    const alliedOccupier = state.units.some(
      (unit) =>
        unit.at.x === city.at.x &&
        unit.at.y === city.at.y &&
        arePlayersAllied(
          state.setup.aiMode,
          state.humanPlayerId,
          city.ownerId,
          unit.ownerId,
        ),
    );
    if (alliedOccupier && isCityBesieged(state, city))
      violations.push(`allied siege at ${record.index}`);
  }
}

if (violations.length > 0) throw new Error(violations.slice(0, 10).join("; "));
const requiredProductiveCommands = [
  "RESEARCH",
  "MOVE",
  "TRAIN",
  "HARVEST_FRUIT",
  "BUILD_MINE",
] as const;
const missingParticipation = requiredProductiveCommands.filter(
  (kind) => (aiParticipation[kind] ?? 0) === 0,
);
if (
  humanAttacks === 0 ||
  humanCaptures === 0 ||
  aiTilesRevealed === 0 ||
  cityLevelUps === 0 ||
  missingParticipation.length > 0
) {
  throw new Error(
    `Cooperative match lacked required positive participation: ${JSON.stringify(
      {
        attacksAgainstHuman: humanAttacks,
        capturesAgainstHuman: humanCaptures,
        aiTilesRevealed,
        cityLevelUps,
        missingParticipation,
      },
    )}`,
  );
}
process.stdout.write(
  `${JSON.stringify({
    aiCount,
    size,
    seed,
    durationMs: Math.round(performance.now() - startedAt),
    termination: result.termination,
    outcome: result.outcome,
    commands: result.acceptedCommands,
    finalHash: result.stateHash,
    commandHash,
    eventHash,
    errors: result.errors.length,
    stalls: result.stalls.length,
    violations: 0,
    humanAttacks,
    humanCaptures,
    aiTilesRevealed,
    cityLevelUps,
    participation,
    aiParticipation,
  })}\n`,
);

function numberArg(fallback: 1 | 2 | 3): 1 | 2 | 3 {
  const value = Number(process.argv[2] ?? fallback);
  if (value !== 1 && value !== 2 && value !== 3)
    throw new Error("aiCount must be 1, 2, or 3");
  return value;
}

function sizeArg(count: 1 | 2 | 3): 11 | 14 | 16 | 20 | 25 {
  const value = Number(
    process.argv[3] ?? (count === 1 ? 11 : count === 2 ? 14 : 16),
  );
  if (
    value !== 11 &&
    value !== 14 &&
    value !== 16 &&
    value !== 20 &&
    value !== 25
  )
    throw new Error("size must be 11, 14, 16, 20, or 25");
  return value;
}
