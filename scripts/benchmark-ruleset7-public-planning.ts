import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { execFileSync } from "node:child_process";
import {
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  canonicalHash,
  cityId,
  createPlayableGameV7,
  createPublicPlanningWorkV7,
  effectiveRoleRuleV7,
  parseGameStateV7,
  queryPlayerCommandsV7,
  unitId,
  viewForV7,
  type GameStateV7,
  type PlayerViewV7,
  type PublicPlanningWorkResultV7,
} from "../src/engine/index";
import { upgradeRetainedPublicViewV7 } from "./ruleset-v7-late-public-view-contract";

const retained = upgradeRetainedPublicViewV7(
  JSON.parse(
    readFileSync("tests/fixtures/ruleset-v7-late-public-view.json", "utf8"),
  ) as PlayerViewV7,
);
const captured300 = JSON.parse(
  readFileSync(
    "tests/fixtures/ruleset-v7-public-planning-command-300.json",
    "utf8",
  ),
) as { readonly view: PlayerViewV7 };
const captured425 = JSON.parse(
  readFileSync(
    "tests/fixtures/ruleset-v7-public-planning-command-425.json",
    "utf8",
  ),
) as { readonly view: PlayerViewV7 };
const fixtures = [
  {
    id: "retained-command-1100",
    view: retained,
    preOptimization: {
      totalMs: 132.292,
      advanceMs: { p50: 0.018, p95: 0.052, p99: 0.364, maximum: 3.882 },
    },
  },
  {
    id: "legal-25x25",
    view: legalWorstCaseView(),
    preOptimization: {
      totalMs: 18_821.613,
      advanceMs: { p50: 0.001, p95: 0.11, p99: 0.181, maximum: 10.01 },
    },
  },
  {
    id: "captured-command-300",
    view: captured300.view,
    preOptimization: {
      totalMs: 2_982.629,
      advanceMs: { p50: 0.002, p95: 0.097, p99: 0.159, maximum: 5.828 },
    },
  },
  {
    id: "captured-command-425",
    view: captured425.view,
    preOptimization: {
      totalMs: 4_711.614,
      advanceMs: { p50: 0.067, p95: 0.101, p99: 0.167, maximum: 13.234 },
    },
  },
] as const;

const selectedCase = optionalArgument("--case");
if (selectedCase !== null) {
  const fixture = fixtures.find(({ id }) => id === selectedCase);
  if (fixture === undefined) throw new Error(`Unknown case: ${selectedCase}`);
  globalThis.gc?.();
  process.stdout.write(JSON.stringify(measurePlanning(fixture.view, 1)));
} else {
  const output = argument("--output");
  const views = fixtures.map(({ id, view, preOptimization }) => {
    process.stderr.write(`[benchmark] ${id}\n`);
    const measured = JSON.parse(
      execFileSync(
        process.execPath,
        [
          "--expose-gc",
          "--preserve-symlinks-main",
          "--import",
          "tsx",
          resolve(process.argv[1] ?? ""),
          "--case",
          id,
        ],
        { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
      ),
    ) as ReturnType<typeof measurePlanning>;
    return {
      id,
      facts: {
        viewHash: canonicalHash(view),
        board: `${view.board.width}x${view.board.height}`,
        cities: view.cities.length,
        units: view.units.length,
        commands: measured.commandCount,
      },
      frozen: {
        commandHash: measured.commandHash,
        potentialHash: measured.potentialHash,
        scoreHash: measured.scoreHash,
        operations: measured.operations,
      },
      preOptimization: {
        runtime: "v24.21.0",
        ...preOptimization,
      },
      optimized: measured,
      durationRatio: round(measured.totalMs / preOptimization.totalMs),
    };
  });

  const report = {
    schemaVersion: 1,
    frozenBaseline: {
      ref: "2a3c029f92a63ea33c7164b05ad0a91d134c1e7b",
      querySha256:
        "5ec37076bf45e1f4e1546d6a52b0ae8aa62d97cd65fa81d70de94d0f09069163",
      method:
        "Same script and fixtures run from a detached pre-optimization worktree.",
    },
    runtime: process.version,
    timing: "Diagnostic only; elapsed time never affects planning decisions.",
    views,
  };
  assertFrozen(report.views);
  mkdirSync(dirname(resolve(output)), { recursive: true });
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

function measurePlanning(source: PlayerViewV7, budget: number) {
  const view = structuredClone(source);
  const commands = queryPlayerCommandsV7(view);
  const work = createPublicPlanningWorkV7(view, commands);
  let result: PublicPlanningWorkResultV7 | null = null;
  let operations = 0;
  let calls = 0;
  const advanceSamples: number[] = [];
  const started = performance.now();
  while (result === null) {
    const advanceStarted = performance.now();
    const progress = work.advance(budget);
    advanceSamples.push(performance.now() - advanceStarted);
    operations += progress.operations;
    calls += 1;
    result = progress.result;
  }
  return {
    budget,
    commandCount: commands.length,
    commandHash: canonicalHash(commands),
    potentialHash: canonicalHash(result.potentials),
    scoreHash: canonicalHash(result.scores),
    operations,
    calls,
    totalMs: round(performance.now() - started),
    advanceMs: distribution(advanceSamples),
  };
}

function assertFrozen(
  reports: readonly {
    readonly id: string;
    readonly facts: { readonly viewHash: string };
    readonly frozen: {
      readonly commandHash: string;
      readonly potentialHash: string;
      readonly scoreHash: string;
      readonly operations: number;
    };
  }[],
): void {
  const expected = {
    "retained-command-1100": {
      viewHash:
        "157f932b21ba21b07e02064825c5068b0e9664a7965357e46c773ee94db6f0a5",
      commandHash:
        "335e1d932643d374f14fd14ca833beff38963367a5f740a61f4713bd4db78a5e",
      potentialHash:
        "6285861dd661a0602060b37c81953173582695945c57f668d5106e5fe2898cc5",
      scoreHash:
        "2b66f6213316ace82e1e1499ae87487735d4b40903d66f13a7d373dcf3b001ea",
      operations: 4_100,
    },
    "legal-25x25": {
      viewHash:
        "213a55e5a88f09e0b91186e654ff72c15c73214d94e7faa59856cf15f479cd40",
      commandHash:
        "ad7abe7a2139d245ad51fbaa65091d1c1fa0a78c99fb5368344f832f5b930ba5",
      potentialHash:
        "53d15c2ae100af836f81ae17e500c7856321001ecbc12b7d3b4fb645bd710d7a",
      scoreHash:
        "c9b06b2126570e0165d6fb4f9fa3641e76534ae2b54b4f0a460b6c85499e2838",
      operations: 400_754,
    },
    "captured-command-300": {
      viewHash:
        "d09eaac69ae3e3cf586dd29f9dfa64105273b515af3fa2f8524a66af4b78f68f",
      commandHash:
        "53c225c8e425f892ab32e45dabb67577f62ff5b61bd6349d67f581bdb72fb20f",
      potentialHash:
        "07346205b9d1015c1ca855d8b226c74a4f6e2f7f4836d4294bcffe1ca97c0d74",
      scoreHash:
        "27df76e4efcf05cb60e053ad10bad5e5db618e9666054c700e2b31a7ea22ef18",
      operations: 66_220,
    },
    "captured-command-425": {
      viewHash:
        "4d7a6656707be8ff02b1b2033a677e7a9913569219fa69ca920ce3315232e016",
      commandHash:
        "93d731039193eee98b0438066993c0cd2aa4dd16094b65849815441aaf2793e2",
      potentialHash:
        "f043c5127eaf99d581993a41f9417120dccfe650221e1ccce56c5c265322d190",
      scoreHash:
        "596efa85f310c02cbfcf60373061ceafa423a7ab90f405430767d15eb4b3aeb7",
      operations: 94_418,
    },
  } as const;
  for (const report of reports) {
    const frozen = expected[report.id as keyof typeof expected];
    if (
      frozen === undefined ||
      report.facts.viewHash !== frozen.viewHash ||
      report.frozen.commandHash !== frozen.commandHash ||
      report.frozen.potentialHash !== frozen.potentialHash ||
      report.frozen.scoreHash !== frozen.scoreHash ||
      report.frozen.operations !== frozen.operations
    )
      throw new Error(`Public-planning parity changed for ${report.id}`);
  }
}

function legalWorstCaseView(): PlayerViewV7 {
  const created = createPlayableGameV7({
    rulesetId: RULESET_7_ID,
    seed: 751_125,
    width: 25,
    height: 25,
    aiCount: 3,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: ["ORIGINAL", "ORIGINAL", "ORIGINAL", "ORIGINAL"],
    mapType: "CONTINENTS",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
  });
  if (!created.ok)
    throw new Error(`25x25 fixture failed: ${created.error.code}`);
  const playerId = created.state.turnOrder[created.state.activeSeatIndex];
  if (playerId === undefined) throw new Error("25x25 active player missing");
  const newCityId = cityId(9);
  const newCityAt = { x: 10, y: 17 };
  const owner = created.state.players.find((player) => player.id === playerId);
  const capital = created.state.cities.find(
    (city) => city.id === owner?.originalCapitalCityId,
  );
  if (owner === undefined || capital === undefined)
    throw new Error("25x25 owner/capital missing");
  const reserved = new Set(created.state.units.map((unit) => key(unit.at)));
  const pick = (near: { x: number; y: number }) => {
    const tile = created.state.board.tiles
      .filter(
        (candidate) =>
          candidate.biome !== null &&
          candidate.terrain !== "MOUNTAIN" &&
          !reserved.has(key(candidate.at)) &&
          !created.state.cities.some(
            (city) => key(city.at) === key(candidate.at),
          ),
      )
      .sort(
        (left, right) =>
          distance(left.at, near) - distance(right.at, near) ||
          left.at.y - right.at.y ||
          left.at.x - right.at.x,
      )[0];
    if (tile === undefined) throw new Error("25x25 unit placement missing");
    reserved.add(key(tile.at));
    return tile.at;
  };
  const activeTemplate = created.state.units.find(
    (unit) => unit.ownerId === playerId,
  );
  if (activeTemplate === undefined) throw new Error("25x25 unit missing");
  const makeUnit = (
    id: number,
    role: "GUARD" | "CAPTAIN" | "CATAPULT" | "RAIDER",
    at: { x: number; y: number },
    homeCityId: typeof newCityId,
    unitOwnerId = playerId,
  ) => ({
    ...activeTemplate,
    id: unitId(id),
    ownerId: unitOwnerId,
    homeCityId,
    role,
    at,
    hp: effectiveRoleRuleV7(role).maxHp,
    maxHp: effectiveRoleRuleV7(role).maxHp,
  });
  const hostilePlayers = created.state.players.filter(
    (player) => player.id !== playerId,
  );
  const hostileOne = hostilePlayers[0];
  const hostileTwo = hostilePlayers[1];
  if (hostileOne === undefined || hostileTwo === undefined)
    throw new Error("25x25 hostile players missing");
  const roadPathKeys = new Set(
    created.state.board.tiles
      .filter(
        (tile) =>
          tile.biome !== null &&
          distance(tile.at, capital.at) <= 3 &&
          distance(tile.at, newCityAt) < distance(capital.at, newCityAt),
      )
      .sort(
        (left, right) =>
          distance(left.at, newCityAt) - distance(right.at, newCityAt),
      )
      .slice(0, 3)
      .map((tile) => key(tile.at)),
  );
  const unparsed: GameStateV7 = {
    ...created.state,
    nextEntityId: 16,
    players: created.state.players.map((player) =>
      player.id === playerId
        ? {
            ...player,
            coins: 100,
            researchedTechs: TECHNOLOGY_IDS_V7,
            explored: created.state.board.tiles.map((tile) => tile.at),
          }
        : player,
    ),
    board: {
      ...created.state.board,
      tiles: created.state.board.tiles.map((tile) => {
        const inNewTerritory = distance(tile.at, newCityAt) <= 1;
        return {
          ...tile,
          site: key(tile.at) === key(newCityAt) ? ("CITY" as const) : tile.site,
          territoryCityId:
            inNewTerritory && tile.territoryCityId === null
              ? newCityId
              : tile.territoryCityId,
          road: tile.road || roadPathKeys.has(key(tile.at)),
        };
      }),
    },
    cities: [
      ...created.state.cities,
      {
        id: newCityId,
        ownerId: playerId,
        at: newCityAt,
        level: 1,
        permanentPopulation: 0,
        economicPopulation: 0,
        population: 0,
        isCapital: false,
        expanded: false,
        landGrantUsed: false,
        cityActionAvailable: true,
        rewards: [],
      },
    ],
    units: [
      ...created.state.units.map((unit) =>
        unit.ownerId === playerId
          ? {
              ...unit,
              role: "GUARD" as const,
              hp: effectiveRoleRuleV7("GUARD").maxHp,
              maxHp: effectiveRoleRuleV7("GUARD").maxHp,
            }
          : unit,
      ),
      makeUnit(10, "CAPTAIN", pick(capital.at), capital.id),
      makeUnit(11, "CATAPULT", pick(capital.at), capital.id),
      makeUnit(12, "RAIDER", pick(newCityAt), newCityId),
      makeUnit(13, "GUARD", pick(newCityAt), newCityId),
      makeUnit(
        14,
        "RAIDER",
        pick(capital.at),
        hostileOne.originalCapitalCityId,
        hostileOne.id,
      ),
      makeUnit(
        15,
        "CATAPULT",
        pick(newCityAt),
        hostileTwo.originalCapitalCityId,
        hostileTwo.id,
      ),
    ],
  };
  const state = parseGameStateV7(unparsed);
  if (state === null)
    throw new Error("Constructed dense 25x25 state is invalid");
  return viewForV7(state, playerId);
}

function argument(name: string): string {
  const value = optionalArgument(name);
  if (value === null) throw new Error(`Usage: ${name} <path>`);
  return value;
}

function optionalArgument(name: string): string | null {
  const index = process.argv.indexOf(name);
  const value = process.argv[index + 1];
  if (index < 0 || value === undefined || value.startsWith("--")) return null;
  return value;
}

function round(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function distribution(values: readonly number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const percentile = (fraction: number) =>
    sorted[
      Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)
    ] ?? 0;
  return {
    p50: round(percentile(0.5)),
    p95: round(percentile(0.95)),
    p99: round(percentile(0.99)),
    maximum: round(sorted.at(-1) ?? 0),
  };
}

function key(at: { readonly x: number; readonly y: number }): string {
  return `${at.y},${at.x}`;
}

function distance(
  left: { readonly x: number; readonly y: number },
  right: { readonly x: number; readonly y: number },
): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}
