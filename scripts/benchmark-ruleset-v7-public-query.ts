import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import {
  canonicalHash,
  createPublicCommandWorkV7,
  createPublicPlanningWorkV7,
  previewEconomicV7,
  queryAiReadyCommandsV7,
  queryPlayerCommandsV7,
  type PublicCommandWorkProgressV7,
  type PublicPlanningWorkResultV7,
  type PlayerViewV7,
} from "../src/engine/index";

const source = JSON.parse(
  readFileSync("tests/fixtures/ruleset-v7-late-public-view.json", "utf8"),
) as PlayerViewV7;
const coldView = structuredClone(source);
const queryStarted = performance.now();
const coldCommands = queryPlayerCommandsV7(coldView);
const coldQueryMs = performance.now() - queryStarted;
const view = structuredClone(source);
const commandWorkStarted = performance.now();
const commandWork = createPublicCommandWorkV7(view);
let commandOperations = 0;
let commandCalls = 0;
let commandMaximumAdvanceMs = 0;
let commandProgress: PublicCommandWorkProgressV7 | null = null;
while (commandProgress?.done !== true) {
  const started = performance.now();
  commandProgress = commandWork.advance(1);
  commandMaximumAdvanceMs = Math.max(
    commandMaximumAdvanceMs,
    performance.now() - started,
  );
  commandOperations += commandProgress.operations;
  commandCalls += 1;
}
const commandPreparationMs = performance.now() - commandWorkStarted;
const commands = commandProgress.commands ?? [];
const aiReady = queryAiReadyCommandsV7(view);
const work = createPublicPlanningWorkV7(view, commands);
let operations = 0;
let calls = 0;
let totalAdvanceMs = 0;
let maximumAdvanceMs = 0;
let result: PublicPlanningWorkResultV7 | null = null;
while (result === null) {
  const started = performance.now();
  const progress = work.advance(1);
  const elapsed = performance.now() - started;
  operations += progress.operations;
  calls += 1;
  totalAdvanceMs += elapsed;
  maximumAdvanceMs = Math.max(maximumAdvanceMs, elapsed);
  result = progress.result;
}
const report = {
  fixtureViewHash: canonicalHash(source),
  commandCount: commands.length,
  commandHash: canonicalHash(commands),
  aiReadyHash: canonicalHash(aiReady),
  previewHash: canonicalHash(
    commands.map((command) => ({
      command,
      result: previewEconomicV7(view, command),
    })),
  ),
  coldSynchronousQueryMs: coldQueryMs,
  commandPreparation: {
    operationBudget: 1,
    operations: commandOperations,
    calls: commandCalls,
    totalMs: commandPreparationMs,
    maximumAdvanceMs: commandMaximumAdvanceMs,
  },
  incremental: {
    operationBudget: 1,
    operations,
    calls,
    totalAdvanceMs,
    maximumAdvanceMs,
    potentialHash: canonicalHash(result.potentials),
    scoreHash: canonicalHash(result.scores),
  },
};

if (
  report.fixtureViewHash !==
    "d095b657a12242e56e4bf3ada5e3a0a8d1982da358a906c9bd477e0eabe6c75b" ||
  report.commandHash !==
    "14d61b0aa76e888773bc96b8f956a2b8a973f7117278b073b4b404e4828e95a5" ||
  canonicalHash(coldCommands) !== report.commandHash ||
  report.aiReadyHash !==
    "e5fbeec912a504c54c3bc9d7794d42dfe3576088445aa868ee2d731a71bf8da3" ||
  report.previewHash !==
    "7ce8e475397e40bd561f7a8defc3da91005c50b1e54970d3018511049131b55f" ||
  report.incremental.potentialHash !==
    "76079f3a0174ad4e509d0294d7bc5c85724a027c1b556a13cf058b16380c0d47" ||
  report.incremental.scoreHash !==
    "ab0e2035511d929add5f2044c35c9ad91425aacbcd00eed5b3ac45664f964aac"
)
  throw new Error(`Public query parity changed: ${JSON.stringify(report)}`);

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
