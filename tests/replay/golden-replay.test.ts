import { describe, expect, it } from "vitest";
import { runReplay, type ReplayFile } from "../../src/engine/index";
import golden from "../fixtures/golden-replay.json";

describe("golden headless replay", () => {
  it(golden.name, () => {
    expect(golden.replay.setup).not.toHaveProperty("mapGenerationRevision");
    expect(golden.replay.checkpoints).toHaveLength(3);
    const result = runReplay(golden.replay as ReplayFile);
    expect(result.acceptedCommands).toBe(golden.expected.acceptedCommands);
    expect(result.stateHash).toBe(golden.expected.stateHash);
    expect(result.events).toEqual(golden.expected.events);
  });
});
