// Whole-game simulations split out of
// ruleset-v7-missions.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { RULESET_7_ID, parseGameStateV7 } from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { NAVAL, groundsSetup } from "./ruleset-v7-missions.shared";

// Mission setups (`pulp_wars-68k.2`, docs/product/CAMPAIGN.md sections 2 and
// 7.2): the registry, the authored-map builder, the MISSION setup and
// UNKNOWN_MISSION, forbidden technologies (Dry Land unchanged), the pinned
// initial-state hash per mission revision, saves, replays, the stale-mission
// diagnostic, and the headless `--mission` flag.

function runCli(...args: readonly string[]): {
  readonly acceptedCommands: number;
  readonly termination: string;
  readonly errors: readonly unknown[];
  readonly metrics: {
    readonly rulesetId: string;
    readonly factionsBySeat: readonly string[];
  };
} {
  const output = execFileSync(
    process.execPath,
    [
      resolve("node_modules/tsx/dist/cli.mjs"),
      resolve("src/headless/cli.ts"),
      ...args,
    ],
    { encoding: "utf8", timeout: 30_000, stdio: ["ignore", "pipe", "pipe"] },
  );
  return JSON.parse(output) as ReturnType<typeof runCli>;
}

describe("headless mission matches", () => {
  it(
    "plays TEST_GROUNDS Normal against Normal with no policy error",
    { timeout: 120_000 },
    () => {
      for (const faction of ["ORIGINAL", "GOBLIN"] as const) {
        const result = runAiMatchV7(groundsSetup(faction), { maxRounds: 8 });
        expect(result.errors).toEqual([]);
        expect(result.stalls).toEqual([]);
        expect(result.acceptedCommands).toBeGreaterThan(8);
        expect(parseGameStateV7(result.state)).not.toBeNull();
        // The AI never researches a forbidden technology.
        for (const player of result.state.players)
          for (const tech of NAVAL)
            expect(player.researchedTechs).not.toContain(tech);
      }
    },
  );

  it(
    "runs `--map-type mission --mission <ID>` on the CLI and refuses misuse",
    { timeout: 120_000 },
    () => {
      const common = [
        "match",
        "--ruleset",
        RULESET_7_ID,
        "--map-type",
        "mission",
        "--mission",
        "TEST_GROUNDS",
        "--max-commands",
        "3",
      ] as const;
      expect(runCli(...common)).toMatchObject({
        acceptedCommands: 3,
        termination: "COMMAND_CAP",
        errors: [],
        metrics: {
          rulesetId: RULESET_7_ID,
          factionsBySeat: ["ORIGINAL", "UNDEAD"],
        },
      });
      expect(
        runCli(...common, "--factions", "goblin,undead").metrics.factionsBySeat,
      ).toEqual(["GOBLIN", "UNDEAD"]);
      for (const [extra, message] of [
        [
          ["--factions", "dwarf,undead"],
          /--factions for mission TEST_GROUNDS must be original\|goblin,undead/,
        ],
        [["--seed", "3"], /--seed does not apply to --map-type mission/],
        [["--size", "11"], /--size does not apply to --map-type mission/],
      ] as const)
        expect(() => runCli(...common, ...extra)).toThrow(message);
      expect(() =>
        runCli(
          "match",
          "--ruleset",
          RULESET_7_ID,
          "--map-type",
          "mission",
          "--mission",
          "NO_SUCH",
        ),
      ).toThrow(/--mission NO_SUCH is not a registered mission/);
      expect(() =>
        runCli("match", "--ruleset", RULESET_7_ID, "--map-type", "mission"),
      ).toThrow(/--map-type mission requires --mission <ID>/);
      expect(() =>
        runCli("match", "--ruleset", RULESET_7_ID, "--mission", "TEST_GROUNDS"),
      ).toThrow(/--mission requires --map-type mission/);
    },
  );
});
