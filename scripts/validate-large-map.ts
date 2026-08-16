import { createHash } from "node:crypto";
import {
  createGame,
  validateMapInvariants,
  type MatchSetup,
} from "../src/engine/index";

const selected = Number(process.argv[2] ?? 0);
const aiCounts: readonly (1 | 2 | 3)[] =
  selected === 1 || selected === 2 || selected === 3 ? [selected] : [1, 2, 3];
const startedAt = performance.now();
const results: Array<{
  aiCount: 1 | 2 | 3;
  seeds: number;
  combinedHash: string;
}> = [];

for (const aiCount of aiCounts) {
  const aggregate = createHash("sha256");
  for (let seed = 0; seed < 1_000; seed += 1) {
    const setup: MatchSetup = {
      rulesetId: "pulp-wars-poc-5",
      seed,
      width: 20,
      height: 20,
      aiCount,
      factions: Array.from({ length: aiCount + 1 }, () => "ORIGINAL" as const),
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
    };
    const first = createGame(setup);
    const second = createGame(setup);
    const cooperative = createGame({ ...setup, aiMode: "COOPERATIVE" });
    if (!first.ok || !second.ok || !cooperative.ok)
      throw new Error(`Large creation failed for ${aiCount} AI seed ${seed}`);
    const firstJson = JSON.stringify(first.state);
    if (firstJson !== JSON.stringify(second.state))
      throw new Error(`Large repeat mismatch for ${aiCount} AI seed ${seed}`);
    if (
      JSON.stringify(first.state.board) !==
      JSON.stringify(cooperative.state.board)
    )
      throw new Error(`Large mode-map mismatch for ${aiCount} AI seed ${seed}`);
    const expectedVillages = 20 - (aiCount + 1);
    const issues = validateMapInvariants(
      first.state.board,
      aiCount + 1,
      expectedVillages,
    );
    if (issues.length > 0)
      throw new Error(
        `Large invariant failure for ${aiCount} AI seed ${seed}: ${issues.join(",")}`,
      );
    const settlements = first.state.board.tiles.filter(
      (tile) => tile.site === "CAPITAL" || tile.site === "VILLAGE",
    );
    const mountains = first.state.board.tiles.filter(
      (tile) => tile.terrain === "MOUNTAIN",
    );
    const forests = first.state.board.tiles.filter(
      (tile) => tile.terrain === "FOREST",
    );
    const animals = first.state.board.tiles.filter(
      (tile) => tile.resource === "ANIMAL",
    );
    if (
      settlements.length !== 20 ||
      mountains.length !== 72 ||
      forests.length !== 96 ||
      animals.length === 0
    )
      throw new Error(
        `Large exact-count failure for ${aiCount} AI seed ${seed}`,
      );
    aggregate.update(firstJson, "utf8");
  }
  results.push({
    aiCount,
    seeds: 1_000,
    combinedHash: aggregate.digest("hex"),
  });
}

process.stdout.write(
  `${JSON.stringify({
    durationMs: Math.round(performance.now() - startedAt),
    results,
  })}\n`,
);
