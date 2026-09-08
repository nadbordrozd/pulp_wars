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
    "9826c2f0c2a3c93a461b4bbb1f31f9f1a7d3ee02047c9ef96246d0e68e7f0a77" ||
  report.commandHash !==
    "719c2273e9451a28d5f7641f69b6046e7cd6c3acd988f1bcc8915d43f4eafa90" ||
  canonicalHash(coldCommands) !== report.commandHash ||
  report.aiReadyHash !==
    "fb9deaa2f9777abca458246f5236f80c399b0209ac4b7a90e270bbab33ceb83e" ||
  report.previewHash !==
    "e56d86d315454c47d1c02ae239bdc04f4f3350f255f89200751a5d04aaec42d5" ||
  report.incremental.potentialHash !==
    "06e29a094c03ed387458fd33468b7e0fab2a110ce4eedada18100645abb9f16d" ||
  report.incremental.scoreHash !==
    "a38fddc5d6f265715dbfbe940b5049062ae52b237c69cb6d4df2fe3137a6ca67"
)
  throw new Error(`Public query parity changed: ${JSON.stringify(report)}`);

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
