import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { cpus, loadavg, release, tmpdir } from "node:os";
import { join } from "node:path";
import {
  RULESET_7_ID,
  applyCommandV7,
  canonicalHash,
  createInitialMapStateV7,
  parseGameStateV7,
  queryPlayerCommandsV7,
  viewForV7,
  type MatchSetupV7,
} from "../src/engine/index";
import { launchSmokeBrowser, navigateSmokePage } from "./browser-smoke-startup";

const chrome = process.env.CHROME_PATH;
if (chrome === undefined)
  throw new Error("Set CHROME_PATH to a headless Chrome executable.");
const distribution = process.argv.includes("--human-heavy")
  ? "human-heavy"
  : "balanced";
const cpuProfile = process.argv.includes("--cpu-profile");
const url = "http://localhost:6173/?ruleset=7";
const samples = 30;
const warmup = 10;
const setup: MatchSetupV7 = {
  rulesetId: RULESET_7_ID,
  seed: 20,
  width: 16,
  height: 16,
  aiCount: 3,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["ORIGINAL", "ORIGINAL", "ORIGINAL", "ORIGINAL"],
  mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V1",
};
const created = createInitialMapStateV7(setup);
if (!created.ok) throw new Error(created.error.code);
const initial = created.state;
const actor = initial.humanPlayerId;
const source = initial.units.find((unit) => unit.ownerId === actor);
if (source === undefined) throw new Error("Initial human unit missing");
const sources = initial.turnOrder.map((ownerId) =>
  initial.units.find((unit) => unit.ownerId === ownerId),
);
if (sources.some((unit) => unit === undefined))
  throw new Error("Initial player unit missing");
const extraCount = 64 - initial.units.length;
const occupied = new Set(
  initial.units.map((unit) => unit.at.y * initial.board.width + unit.at.x),
);
const sites = initial.board.tiles
  .filter(
    (tile) =>
      tile.terrain !== "MOUNTAIN" &&
      !occupied.has(tile.at.y * initial.board.width + tile.at.x),
  )
  .sort(
    (left, right) =>
      Math.abs(right.at.x - source.at.x) +
      Math.abs(right.at.y - source.at.y) -
      Math.abs(left.at.x - source.at.x) -
      Math.abs(left.at.y - source.at.y),
  )
  .slice(0, extraCount);
if (sites.length !== extraCount) throw new Error("Too few legal unit sites");
const state = parseGameStateV7({
  ...initial,
  activeSeatIndex: initial.turnOrder.indexOf(actor),
  nextEntityId: initial.nextEntityId + extraCount,
  units: [
    ...initial.units,
    ...sites.map((tile, index) => ({
      ...source,
      ownerId:
        distribution === "human-heavy"
          ? actor
          : (sources[index % sources.length]?.ownerId ?? actor),
      id: initial.nextEntityId + index,
      at: tile.at,
      homeCityId: null,
    })),
  ].sort((left, right) => left.id - right.id),
  players: initial.players.map((player) =>
    player.id === actor
      ? { ...player, explored: initial.board.tiles.map((tile) => tile.at) }
      : player,
  ),
});
if (state === null || state.units.length !== 64)
  throw new Error("16 x 16 / 64-unit state failed parseGameStateV7");
const view = viewForV7(state, actor);
const commands = queryPlayerCommandsV7(view);
const move = commands.find((command) => command.kind === "MOVE");
if (move === undefined) throw new Error("Reference fixture has no legal Move");
const accepted = applyCommandV7(state, actor, move);
if (!accepted.accepted) throw new Error("Reference Move rejected in Node");
const expected = {
  stateHash: canonicalHash(state),
  commandHash: canonicalHash(commands),
  acceptedHash: canonicalHash({
    state: accepted.state,
    events: accepted.events,
  }),
};

const directory = mkdtempSync(
  join(tmpdir(), "pulp-wars-v7-reference-browser-"),
);
const port = 12_000 + (process.pid % 1_000);
const browser = await launchSmokeBrowser({
  chrome,
  port,
  args: [
    "--headless=new",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${join(directory, "chrome-profile")}`,
    "--window-size=1440,1000",
  ],
});
try {
  const connection = browser.connection;
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 2,
    mobile: false,
  });
  await navigateSmokePage(connection, url);
  if (cpuProfile) {
    await connection.send("Profiler.enable");
    await connection.send("Profiler.setSamplingInterval", { interval: 1_000 });
    await connection.send("Profiler.start");
  }
  const result = (await connection.send("Runtime.evaluate", {
    expression: `(async()=>{
      const engine=await import('/src/engine/index.ts');
      const state=engine.parseGameStateV7(${JSON.stringify(state)});
      if(state===null || state.board.width!==16 || state.board.height!==16 || state.units.length!==64)
        throw Error('Browser reference state invalid');
      const actor=state.humanPlayerId;
      const view=engine.viewForV7(state,actor);
      const first=engine.queryPlayerCommandsV7(view);
      const move=first.find(command=>command.kind==='MOVE');
      if(!move)throw Error('Browser reference Move missing');
      const query=[],reduction=[];
      const queryInputs=Array.from({length:${samples + warmup}},()=>structuredClone(view));
      const reductionInputs=Array.from({length:${samples + warmup}},()=>structuredClone(state));
      let lastQuery=first;
      for(let sample=0;sample<${samples + warmup};sample++){
        const start=performance.now();
        const current=engine.queryPlayerCommandsV7(queryInputs[sample]);
        const queryMs=performance.now()-start;
        lastQuery=current;
        if(sample>=${warmup})query.push(queryMs);
      }
      let lastApplied;
      for(let sample=0;sample<${samples + warmup};sample++){
        const start=performance.now();
        const applied=engine.applyCommandV7(reductionInputs[sample],actor,move);
        const reductionMs=performance.now()-start;
        if(!applied.accepted)throw Error('Reference Move rejected');
        lastApplied=applied;
        if(sample>=${warmup})reduction.push(reductionMs);
      }
      if(engine.canonicalHash(lastQuery)!==engine.canonicalHash(first))
        throw Error('Cold legal query changed');
      return {
        browser:{userAgent:navigator.userAgent,dpr:devicePixelRatio,width:innerWidth,height:innerHeight},
        fixture:{width:state.board.width,height:state.board.height,players:state.players.length,units:state.units.length,unitsPerPlayer:state.turnOrder.map(id=>state.units.filter(unit=>unit.ownerId===id).length),commands:first.length,move},
        hashes:{stateHash:engine.canonicalHash(state),commandHash:engine.canonicalHash(first),acceptedHash:engine.canonicalHash({state:lastApplied.state,events:lastApplied.events})},
        queryMs:query,reductionMs:reduction
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  })) as {
    readonly result?: {
      readonly value?: {
        readonly browser: {
          readonly userAgent: string;
          readonly dpr: number;
          readonly width: number;
          readonly height: number;
        };
        readonly fixture: {
          readonly width: number;
          readonly height: number;
          readonly players: number;
          readonly units: number;
          readonly unitsPerPlayer: number[];
          readonly commands: number;
        };
        readonly hashes: typeof expected;
        readonly queryMs: number[];
        readonly reductionMs: number[];
      };
    };
    readonly exceptionDetails?: {
      readonly text: string;
      readonly exception?: { readonly description?: string };
    };
  };
  if (cpuProfile) {
    const stopped = (await connection.send("Profiler.stop")) as {
      readonly profile: unknown;
    };
    writeFileSync(
      join(directory, "query-reduction.cpuprofile"),
      JSON.stringify(stopped.profile),
    );
  }
  if (result.exceptionDetails !== undefined)
    throw new Error(
      result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text,
    );
  const measured = result.result?.value;
  if (measured === undefined)
    throw new Error("Browser reference result missing");
  if (
    measured.browser.dpr !== 2 ||
    measured.fixture.players !== 4 ||
    measured.fixture.units !== 64 ||
    (distribution === "balanced" &&
      measured.fixture.unitsPerPlayer.some((count) => count !== 16)) ||
    measured.queryMs.length !== samples ||
    measured.reductionMs.length !== samples ||
    JSON.stringify(measured.hashes) !== JSON.stringify(expected)
  )
    throw new Error("Browser reference fixture or Node hash parity failed");
  const summarize = (values: readonly number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    return {
      count: values.length,
      medianMs: sorted[Math.floor(values.length / 2)],
      p95Ms: sorted[Math.ceil(values.length * 0.95) - 1],
      samplesMs: values,
    };
  };
  const evidence = {
    environment: {
      node: process.version,
      platform: process.platform,
      release: release(),
      cpu: cpus()[0]?.model,
      loadAverage: loadavg(),
      chrome,
      url,
    },
    browser: measured.browser,
    fixture: measured.fixture,
    distribution,
    hashes: measured.hashes,
    query: summarize(measured.queryMs),
    commandValidationReduction: summarize(measured.reductionMs),
    budgetsMs: { queryP95: 2, commandValidationReductionP95: 4 },
  };
  writeFileSync(
    join(directory, "evidence.json"),
    JSON.stringify(evidence, null, 2),
  );
  process.stdout.write(
    `${JSON.stringify({ browser: evidence.browser, fixture: evidence.fixture, queryP95Ms: evidence.query.p95Ms, reductionP95Ms: evidence.commandValidationReduction.p95Ms, budgetsMs: evidence.budgetsMs, hashes: evidence.hashes }, null, 2)}\nEvidence: ${directory}\n`,
  );
} finally {
  browser.close();
  rmSync(join(directory, "chrome-profile"), { recursive: true, force: true });
}
