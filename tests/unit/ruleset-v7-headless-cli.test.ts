import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canonicalHash,
  createPlayableGameV7,
  createReplayV7,
} from "../../src/engine/index";
import { setupV7 } from "../fixtures/v7-builders";

interface CliSummary {
  readonly acceptedCommands: number;
  readonly termination: string;
  readonly stateHash: string;
  readonly metrics: { readonly rulesetId: string };
}

function runCli(...args: readonly string[]): CliSummary {
  const output = execFileSync(
    process.execPath,
    [
      resolve("node_modules/tsx/dist/cli.mjs"),
      resolve("src/headless/cli.ts"),
      ...args,
    ],
    { encoding: "utf8", timeout: 20_000 },
  );
  return JSON.parse(output) as CliSummary;
}

describe("ruleset-7 revision-2 headless CLI dispatch", () => {
  it("requires the explicit r2 ruleset while preserving the v6 default", () => {
    const defaultResult = runCli(
      "match",
      "--max-commands",
      "1",
      "--max-rounds",
      "5",
    );
    expect(readFileSync("src/headless/cli.ts", "utf8")).toContain(
      'const ruleset = stringArg("--ruleset", "pulp-wars-poc-6")',
    );
    expect(defaultResult.metrics).not.toHaveProperty("rulesetId");

    const result = runCli(
      "match",
      "--ruleset",
      "pulp-wars-poc-7r2",
      "--max-commands",
      "1",
      "--max-rounds",
      "5",
    );
    expect(result).toMatchObject({
      acceptedCommands: 1,
      termination: "COMMAND_CAP",
      metrics: { rulesetId: "pulp-wars-poc-7r2" },
    });
  });

  it("rejects Candy and the incompatible old v7 identity", () => {
    expect(() =>
      runCli(
        "match",
        "--ruleset",
        "pulp-wars-poc-7r2",
        "--factions",
        "original,candy",
        "--max-commands",
        "1",
      ),
    ).toThrow(/ruleset 7 factions must be original/);
    expect(() =>
      runCli("match", "--ruleset", "pulp-wars-poc-7", "--max-commands", "1"),
    ).toThrow(/pulp-wars-poc-7r2/);
  });

  it("dispatches a command-zero v7 replay through canonical playable creation", () => {
    const setup = setupV7(42);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const directory = mkdtempSync(join(tmpdir(), "pulp-wars-v7-cli-"));
    const file = join(directory, "replay.json");
    try {
      writeFileSync(file, JSON.stringify(createReplayV7(setup)), "utf8");
      const result = runCli("replay", file);
      expect(result).toMatchObject({
        acceptedCommands: 0,
        stateHash: canonicalHash(created.state),
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
