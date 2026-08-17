import { writeFile } from "node:fs/promises";
import { format } from "prettier";
import {
  RULESET_ID,
  canonicalHash,
  createGame,
  createReplay,
  type MatchSetup,
} from "../src/engine/index";
import { createSaveEnvelope } from "../src/persistence/index";

const HISTORICAL_INITIAL_HASH =
  "c3569de5a49954b3ae586a137407e3513ceda5c07bc0bc5449486f780013452e";

// This is the canonical setup shape emitted before reduced village density.
// The deliberate absence of mapGenerationRevision is compatibility data.
const historicalSetup: MatchSetup = {
  rulesetId: RULESET_ID,
  seed: 0x1234_5678,
  width: 11,
  height: 11,
  aiCount: 1,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["ORIGINAL", "ORIGINAL"],
};

const created = createGame(historicalSetup);
if (!created.ok) throw new Error(created.error.code);
if (canonicalHash(created.state) !== HISTORICAL_INITIAL_HASH) {
  throw new Error("Historical v5 setup no longer reproduces its captured hash");
}

const envelope = createSaveEnvelope(
  {
    state: created.state,
    replay: createReplay(historicalSetup),
    tallies: { citiesCaptured: 0, unitsDefeated: 0, unitsLost: 0 },
    playerTallies: created.state.players.map((player) => ({
      playerId: player.id,
      kills: 0,
      losses: 0,
      citiesCaptured: 0,
    })),
  },
  "2026-08-16T00:00:00.000Z",
);
const serialized = await format(JSON.stringify(envelope), {
  parser: "json",
  endOfLine: "lf",
});
await writeFile("tests/fixtures/historical-save-v5.json", serialized, "utf8");
