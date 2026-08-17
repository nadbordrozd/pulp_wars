import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { format } from "prettier";
import {
  applyCommand,
  arePlayersAllied,
  canonicalHash,
  canonicalJson,
  createGame,
  dynamicTerritoryIsValid,
  type Command,
  type FactionId,
  type GameState,
  type MatchSetup,
  type PlayerId,
  type UnitType,
} from "../src/engine/index";
import { runAiMatch, type AiMatchResult } from "../src/headless/index";

const MAX_COMMANDS = 20_000;
const MAX_ROUNDS = 500;

interface CorpusCase {
  readonly id: string;
  readonly aiMode: MatchSetup["aiMode"];
  readonly aiCount: 1 | 2 | 3;
  readonly size: 11 | 14 | 16 | 20 | 25;
  readonly seed: number;
  readonly factions: readonly FactionId[];
}

const CASES: readonly CorpusCase[] = [
  {
    id: "original-reference-rival-auto-1",
    aiMode: "RIVAL",
    aiCount: 1,
    size: 11,
    seed: 0,
    factions: ["ORIGINAL", "ORIGINAL"],
  },
  {
    id: "all-candy-rival-auto-1-regression",
    aiMode: "RIVAL",
    aiCount: 1,
    size: 11,
    seed: 10,
    factions: ["CANDY", "CANDY"],
  },
  {
    id: "candy-opponent-rival-auto-2",
    aiMode: "RIVAL",
    aiCount: 2,
    size: 14,
    seed: 17,
    factions: ["ORIGINAL", "CANDY", "ORIGINAL"],
  },
  {
    id: "alternating-rival-auto-3",
    aiMode: "RIVAL",
    aiCount: 3,
    size: 16,
    seed: 17,
    factions: ["CANDY", "ORIGINAL", "CANDY", "ORIGINAL"],
  },
  {
    id: "candy-opponent-cooperative-auto-1",
    aiMode: "COOPERATIVE",
    aiCount: 1,
    size: 11,
    seed: 0,
    factions: ["ORIGINAL", "CANDY"],
  },
  {
    id: "all-ai-candy-cooperative-auto-2",
    aiMode: "COOPERATIVE",
    aiCount: 2,
    size: 14,
    seed: 17,
    factions: ["ORIGINAL", "CANDY", "CANDY"],
  },
  {
    id: "mixed-cooperative-auto-3",
    aiMode: "COOPERATIVE",
    aiCount: 3,
    size: 16,
    seed: 17,
    factions: ["CANDY", "CANDY", "ORIGINAL", "CANDY"],
  },
  {
    id: "mixed-rival-large",
    aiMode: "RIVAL",
    aiCount: 2,
    size: 20,
    seed: 17,
    factions: ["CANDY", "ORIGINAL", "CANDY"],
  },
  {
    id: "candy-ai-cooperative-large",
    aiMode: "COOPERATIVE",
    aiCount: 2,
    size: 20,
    seed: 17,
    factions: ["ORIGINAL", "CANDY", "CANDY"],
  },
  {
    id: "mixed-rival-huge",
    aiMode: "RIVAL",
    aiCount: 1,
    size: 25,
    seed: 0,
    factions: ["CANDY", "ORIGINAL"],
  },
  {
    id: "mixed-cooperative-huge",
    aiMode: "COOPERATIVE",
    aiCount: 1,
    size: 25,
    seed: 0,
    factions: ["CANDY", "ORIGINAL"],
  },
] as const;

interface Participation {
  candyTraining: Record<UnitType, number>;
  candyActions: Record<UnitType, number>;
  gumballAttacks: number;
  donutRolls: number;
  hostileRollHits: number;
  rollPathCellsRevealed: number;
  wallsBuilt: number;
  wallAttacks: number;
  wallsDestroyed: number;
  candifyDirect: number;
  candifyChoices: number;
  tilesCandified: number;
  candyCatapultActions: number;
  research: number;
  training: number;
  growthActions: number;
  tilesRevealed: number;
  captures: number;
}

const started = performance.now();
const entries = [];
const aggregate = emptyParticipation();
for (const corpusCase of CASES) {
  const setup = setupFor(corpusCase);
  const runStarted = performance.now();
  const first = runAiMatch(setup, {
    maxCommands: MAX_COMMANDS,
    maxRounds: MAX_ROUNDS,
    recordCheckpointHashes: false,
  });
  assertComplete(corpusCase, first);
  const firstHashes = hashes(first);
  const firstParticipation = participation(first, setup);
  const cooperativeAudit = auditCooperative(setup, first);
  const repeat = runAiMatch(setup, {
    maxCommands: MAX_COMMANDS,
    maxRounds: MAX_ROUNDS,
    recordCheckpointHashes: false,
  });
  assertComplete(corpusCase, repeat);
  const repeatHashes = hashes(repeat);
  if (canonicalJson(firstHashes) !== canonicalJson(repeatHashes)) {
    throw new Error(`Determinism mismatch in ${corpusCase.id}`);
  }
  addParticipation(aggregate, firstParticipation);
  entries.push({
    ...corpusCase,
    rounds: first.rounds,
    commands: first.acceptedCommands,
    winnerId:
      first.outcome?.kind === "DEFEAT"
        ? first.outcome.defeatedByPlayerId
        : first.outcome?.winnerId,
    outcome: first.outcome?.kind,
    errors: first.errors.length,
    stalls: first.stalls.length,
    repeatMatched: true,
    runtimeMs: Math.round(performance.now() - runStarted),
    ...firstHashes,
    cooperativeAudit,
    participation: firstParticipation,
  });
  process.stderr.write(
    `validated ${corpusCase.id}: round ${first.rounds}, ${first.acceptedCommands} commands\n`,
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

assertCoverage(aggregate);
const factionMapParity = validateFactionMapParity();
const report = {
  schemaVersion: 5,
  rulesetId: "pulp-wars-poc-5",
  generatedAt: new Date().toISOString(),
  matrix: {
    maxCommands: MAX_COMMANDS,
    maxRounds: MAX_ROUNDS,
    deterministicRunsPerEntry: 2,
    cases: CASES,
  },
  summary: {
    matches: entries.length,
    deterministicRuns: entries.length * 2,
    completed: entries.length,
    errors: entries.reduce((sum, entry) => sum + entry.errors, 0),
    stalls: entries.reduce((sum, entry) => sum + entry.stalls, 0),
    capped: 0,
    totalRounds: entries.reduce((sum, entry) => sum + entry.rounds, 0),
    totalCommands: entries.reduce((sum, entry) => sum + entry.commands, 0),
    runtimeMs: Math.round(performance.now() - started),
    cooperativeAiHostility: entries.reduce(
      (sum, entry) => sum + entry.cooperativeAudit.violations,
      0,
    ),
    participation: aggregate,
  },
  factionMapParity,
  entries,
};

const output = outputArg();
const serialized = await format(JSON.stringify(report), {
  parser: "json",
  endOfLine: "lf",
});
if (output === null) process.stdout.write(serialized);
else {
  const resolved = path.resolve(output);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, serialized, "utf8");
  process.stdout.write(`Candy corpus written to ${resolved}\n`);
}

function setupFor(corpusCase: CorpusCase): MatchSetup {
  return {
    rulesetId: "pulp-wars-poc-5",
    seed: corpusCase.seed,
    width: corpusCase.size,
    height: corpusCase.size,
    aiCount: corpusCase.aiCount,
    aiDifficulty: "NORMAL",
    aiMode: corpusCase.aiMode,
    humanColor: "CORAL",
    factions: corpusCase.factions,
  };
}

function assertComplete(corpusCase: CorpusCase, result: AiMatchResult): void {
  if (
    result.termination !== "OUTCOME" ||
    result.outcome === null ||
    result.errors.length !== 0 ||
    result.stalls.length !== 0 ||
    !dynamicTerritoryIsValid(result.state)
  ) {
    throw new Error(
      `Incomplete ${corpusCase.id}: ${JSON.stringify({ termination: result.termination, outcome: result.outcome, errors: result.errors, stalls: result.stalls, territoryValid: dynamicTerritoryIsValid(result.state) })}`,
    );
  }
}

function hashes(result: AiMatchResult): {
  readonly commandHash: string;
  readonly eventHash: string;
  readonly finalHash: string;
} {
  return {
    commandHash: canonicalHash(
      result.commandLog.map((record) => record.command),
    ),
    eventHash: canonicalHash(result.events),
    finalHash: result.stateHash,
  };
}

function participation(
  result: AiMatchResult,
  setup: MatchSetup,
): Participation {
  const created = createGame(setup);
  if (!created.ok) throw new Error(`Could not recreate ${setup.seed}`);
  const unitFacts = new Map(
    created.state.units.map((unit) => [
      unit.id,
      {
        type: unit.type,
        faction: created.state.players.find(
          (player) => player.id === unit.ownerId,
        )?.faction,
      },
    ]),
  );
  const counts = emptyParticipation();
  for (const record of result.commandLog) {
    const actor =
      "unitId" in record.command
        ? unitFacts.get(record.command.unitId)
        : undefined;
    if (actor?.faction === "CANDY") {
      counts.candyActions[actor.type] += 1;
      if (actor.type === "CATAPULT") counts.candyCatapultActions += 1;
      if (actor.type === "ARCHER" && record.command.kind === "ATTACK")
        counts.gumballAttacks += 1;
    }
    if (record.command.kind === "TRAIN") {
      counts.training += 1;
      const player = created.state.players.find(
        (candidate) => candidate.id === record.playerId,
      );
      if (player?.faction === "CANDY")
        counts.candyTraining[record.command.unit] += 1;
    }
    if (record.command.kind === "RESEARCH") counts.research += 1;
    if (record.command.kind === "CAPTURE") counts.captures += 1;
    if (record.command.kind === "KAMIKAZE_ROLL") counts.donutRolls += 1;
    if (record.command.kind === "BUILD_CHOCOLATE_WALL") counts.wallsBuilt += 1;
    if (
      record.command.kind === "ATTACK" &&
      record.command.target.kind === "CHOCOLATE_WALL"
    )
      counts.wallAttacks += 1;
    if (record.command.kind === "CANDIFY") counts.candifyDirect += 1;
    if (record.command.kind === "CHOOSE_CANDIFY_CITY") {
      counts.candifyChoices += 1;
      counts.candifyDirect -= 1;
    }
    for (const event of record.events) {
      if (event.kind === "UNIT_TRAINED") {
        unitFacts.set(event.unitId, {
          type: event.unit,
          faction: created.state.players.find(
            (player) => player.id === event.playerId,
          )?.faction,
        });
      }
      if (event.kind === "ROLL_DAMAGE_RESOLVED") counts.hostileRollHits += 1;
      if (
        record.command.kind === "KAMIKAZE_ROLL" &&
        event.kind === "TILES_REVEALED"
      )
        counts.rollPathCellsRevealed += event.tiles.length;
      if (event.kind === "CHOCOLATE_WALL_DESTROYED") counts.wallsDestroyed += 1;
      if (event.kind === "TILE_CANDIFIED") counts.tilesCandified += 1;
      if (
        event.kind === "FRUIT_HARVESTED" ||
        event.kind === "ANIMAL_HUNTED" ||
        event.kind === "MINE_BUILT" ||
        event.kind === "LUMBER_MILL_BUILT"
      )
        counts.growthActions += 1;
      if (event.kind === "TILES_REVEALED")
        counts.tilesRevealed += event.tiles.length;
    }
  }
  return counts;
}

function auditCooperative(
  setup: MatchSetup,
  result: AiMatchResult,
): { readonly checkedCommands: number; readonly violations: number } {
  if (setup.aiMode !== "COOPERATIVE")
    return { checkedCommands: 0, violations: 0 };
  const created = createGame(setup);
  if (!created.ok) throw new Error("Cooperative recreation failed");
  let state = created.state;
  let checkedCommands = 0;
  const violations: string[] = [];
  for (const record of result.commandLog) {
    const actor = state.players.find((player) => player.id === record.playerId);
    if (actor?.controller === "AI") {
      checkedCommands += 1;
      auditAiCommand(state, record.playerId, record.command, violations);
    }
    const applied = applyCommand(state, record.command);
    if (!applied.ok)
      throw new Error(
        `Cooperative audit replay rejected ${record.command.kind}`,
      );
    if (canonicalJson(applied.events) !== canonicalJson(record.events))
      throw new Error("Cooperative audit event mismatch");
    state = applied.state;
  }
  if (canonicalHash(state) !== result.stateHash)
    throw new Error("Cooperative audit final hash mismatch");
  if (violations.length > 0)
    throw new Error(`Cooperative AI hostility: ${violations.join(", ")}`);
  return { checkedCommands, violations: 0 };
}

function auditAiCommand(
  state: GameState,
  actorId: PlayerId,
  command: Command,
  violations: string[],
): void {
  const allied = (ownerId: PlayerId | undefined): boolean =>
    ownerId !== undefined &&
    arePlayersAllied(state.setup.aiMode, state.humanPlayerId, actorId, ownerId);
  if (command.kind === "ATTACK") {
    const owner =
      command.target.kind === "UNIT"
        ? state.units.find((unit) => unit.id === command.target.unitId)?.ownerId
        : state.chocolateWalls.find((wall) => wall.id === command.target.wallId)
            ?.ownerId;
    if (allied(owner))
      violations.push(`allied attack at ${state.commandIndex}`);
  }
  if (command.kind === "MOVE" || command.kind === "ESCAPE_MOVE") {
    for (const at of command.path) {
      if (allied(territoryOwnerAt(state, at)))
        violations.push(`allied entry at ${state.commandIndex}`);
    }
  }
  if (command.kind === "BUILD_CHOCOLATE_WALL") {
    if (allied(territoryOwnerAt(state, command.at)))
      violations.push(`allied wall build at ${state.commandIndex}`);
  }
  if (command.kind === "CANDIFY") {
    const unit = state.units.find(
      (candidate) => candidate.id === command.unitId,
    );
    if (unit !== undefined && allied(territoryOwnerAt(state, unit.at)))
      violations.push(`allied Candify at ${state.commandIndex}`);
  }
  if (command.kind === "CAPTURE") {
    const unit = state.units.find(
      (candidate) => candidate.id === command.unitId,
    );
    const city = state.cities.find(
      (candidate) => unit !== undefined && sameCoord(candidate.at, unit.at),
    );
    if (allied(city?.ownerId))
      violations.push(`allied capture at ${state.commandIndex}`);
  }
  if (command.kind === "KAMIKAZE_ROLL") {
    const unit = state.units.find(
      (candidate) => candidate.id === command.unitId,
    );
    if (unit === undefined) return;
    const delta =
      command.direction === "NORTH"
        ? { x: 0, y: -1 }
        : command.direction === "EAST"
          ? { x: 1, y: 0 }
          : command.direction === "SOUTH"
            ? { x: 0, y: 1 }
            : { x: -1, y: 0 };
    for (
      let at = { x: unit.at.x + delta.x, y: unit.at.y + delta.y };
      at.x >= 0 &&
      at.y >= 0 &&
      at.x < state.board.width &&
      at.y < state.board.height;
      at = { x: at.x + delta.x, y: at.y + delta.y }
    ) {
      const owner =
        state.units.find((candidate) => sameCoord(candidate.at, at))?.ownerId ??
        state.chocolateWalls.find((candidate) => sameCoord(candidate.at, at))
          ?.ownerId;
      if (allied(owner) || allied(territoryOwnerAt(state, at)))
        violations.push(`allied Roll line at ${state.commandIndex}`);
    }
  }
}

function territoryOwnerAt(
  state: GameState,
  at: { x: number; y: number },
): PlayerId | undefined {
  const cityId = state.board.tiles.find((tile) =>
    sameCoord(tile.at, at),
  )?.territoryCityId;
  return cityId === null || cityId === undefined
    ? undefined
    : state.cities.find((city) => city.id === cityId)?.ownerId;
}

function validateFactionMapParity(): readonly object[] {
  const results = [];
  for (const aiCount of [1, 2, 3] as const) {
    const size = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
    for (const aiMode of ["RIVAL", "COOPERATIVE"] as const) {
      const original = setupFor({
        id: "parity-original",
        aiMode,
        aiCount,
        size,
        seed: 6173,
        factions: Array.from(
          { length: aiCount + 1 },
          () => "ORIGINAL" as const,
        ),
      });
      const changed = {
        ...original,
        factions: Array.from({ length: aiCount + 1 }, (_, index) =>
          index % 2 === 0 ? ("CANDY" as const) : ("ORIGINAL" as const),
        ),
      };
      const first = createGame(original);
      const second = createGame(changed);
      if (!first.ok || !second.ok) throw new Error("Parity setup failed");
      const firstHash = canonicalHash({
        board: first.state.board,
        random: first.state.random,
        cities: first.state.cities,
        units: first.state.units,
        turnOrder: first.state.turnOrder,
      });
      const secondHash = canonicalHash({
        board: second.state.board,
        random: second.state.random,
        cities: second.state.cities,
        units: second.state.units,
        turnOrder: second.state.turnOrder,
      });
      if (firstHash !== secondHash)
        throw new Error(`Faction changed map/PRNG for ${aiMode} ${aiCount} AI`);
      results.push({
        aiMode,
        aiCount,
        size,
        seed: 6173,
        sharedHash: firstHash,
      });
    }
  }
  return results;
}

function assertCoverage(aggregate: Participation): void {
  for (const type of [
    "WARRIOR",
    "ARCHER",
    "DEFENDER",
    "RIDER",
    "CATAPULT",
  ] as const) {
    if (
      aggregate.candyTraining[type] === 0 ||
      aggregate.candyActions[type] === 0
    )
      throw new Error(`Candy ${type} lacked training/action participation`);
  }
  for (const [label, count] of Object.entries({
    gumballAttacks: aggregate.gumballAttacks,
    donutRolls: aggregate.donutRolls,
    hostileRollHits: aggregate.hostileRollHits,
    rollPathCellsRevealed: aggregate.rollPathCellsRevealed,
    wallsBuilt: aggregate.wallsBuilt,
    wallAttacks: aggregate.wallAttacks,
    wallsDestroyed: aggregate.wallsDestroyed,
    candifyDirect: aggregate.candifyDirect,
    candifyChoices: aggregate.candifyChoices,
    tilesCandified: aggregate.tilesCandified,
    candyCatapultActions: aggregate.candyCatapultActions,
    research: aggregate.research,
    training: aggregate.training,
    growthActions: aggregate.growthActions,
    tilesRevealed: aggregate.tilesRevealed,
    captures: aggregate.captures,
  })) {
    if (count <= 0) throw new Error(`Candy corpus lacked ${label}`);
  }
}

function emptyParticipation(): Participation {
  return {
    candyTraining: {
      WARRIOR: 0,
      ARCHER: 0,
      DEFENDER: 0,
      RIDER: 0,
      CATAPULT: 0,
    },
    candyActions: { WARRIOR: 0, ARCHER: 0, DEFENDER: 0, RIDER: 0, CATAPULT: 0 },
    gumballAttacks: 0,
    donutRolls: 0,
    hostileRollHits: 0,
    rollPathCellsRevealed: 0,
    wallsBuilt: 0,
    wallAttacks: 0,
    wallsDestroyed: 0,
    candifyDirect: 0,
    candifyChoices: 0,
    tilesCandified: 0,
    candyCatapultActions: 0,
    research: 0,
    training: 0,
    growthActions: 0,
    tilesRevealed: 0,
    captures: 0,
  };
}

function addParticipation(target: Participation, source: Participation): void {
  for (const type of [
    "WARRIOR",
    "ARCHER",
    "DEFENDER",
    "RIDER",
    "CATAPULT",
  ] as const) {
    target.candyTraining[type] += source.candyTraining[type];
    target.candyActions[type] += source.candyActions[type];
  }
  for (const key of [
    "gumballAttacks",
    "donutRolls",
    "hostileRollHits",
    "rollPathCellsRevealed",
    "wallsBuilt",
    "wallAttacks",
    "wallsDestroyed",
    "candifyDirect",
    "candifyChoices",
    "tilesCandified",
    "candyCatapultActions",
    "research",
    "training",
    "growthActions",
    "tilesRevealed",
    "captures",
  ] as const)
    target[key] += source[key];
}

function sameCoord(
  left: { x: number; y: number },
  right: { x: number; y: number },
): boolean {
  return left.x === right.x && left.y === right.y;
}

function outputArg(): string | null {
  const index = process.argv.indexOf("--output");
  if (index < 0) return null;
  const value = process.argv[index + 1];
  if (value === undefined) throw new Error("--output requires a path");
  return value;
}
