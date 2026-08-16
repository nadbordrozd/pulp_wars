import { describe, expect, it } from "vitest";
import { parseCommand, parseCommandEnvelope } from "../../src/engine/index";

describe("command schemas", () => {
  it("parses every versioned envelope boundary without coercion", () => {
    expect(
      parseCommandEnvelope({
        format: "pulp-wars-command",
        version: 5,
        command: { kind: "MOVE", unitId: 7, path: [{ x: 2, y: 3 }] },
      }),
    ).toEqual({
      ok: true,
      value: {
        format: "pulp-wars-command",
        version: 5,
        command: { kind: "MOVE", unitId: 7, path: [{ x: 2, y: 3 }] },
      },
    });
  });

  it("parses all retained v5 economy commands and rejects legacy envelopes", () => {
    expect(parseCommand({ kind: "HARVEST_FRUIT", at: { x: 2, y: 3 } })).toEqual(
      {
        ok: true,
        value: { kind: "HARVEST_FRUIT", at: { x: 2, y: 3 } },
      },
    );
    expect(parseCommand({ kind: "HUNT_ANIMAL", at: { x: 2, y: 3 } })).toEqual({
      ok: true,
      value: { kind: "HUNT_ANIMAL", at: { x: 2, y: 3 } },
    });
    expect(
      parseCommand({ kind: "BUILD_LUMBER_MILL", at: { x: 2, y: 3 } }),
    ).toEqual({
      ok: true,
      value: { kind: "BUILD_LUMBER_MILL", at: { x: 2, y: 3 } },
    });
    expect(
      parseCommand({ kind: "TRAIN", cityId: 1, unit: "CATAPULT" }),
    ).toEqual({
      ok: true,
      value: { kind: "TRAIN", cityId: 1, unit: "CATAPULT" },
    });
    expect(
      parseCommandEnvelope({
        format: "pulp-wars-command",
        version: 1,
        command: { kind: "END_TURN" },
      }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_COMMAND" } });
    expect(
      parseCommandEnvelope({
        format: "pulp-wars-command",
        version: 4,
        command: { kind: "END_TURN" },
      }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_COMMAND" } });
    expect(
      parseCommandEnvelope({
        format: "pulp-wars-command",
        version: 3,
        command: { kind: "END_TURN" },
      }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_COMMAND" } });
    expect(
      parseCommandEnvelope({
        format: "pulp-wars-command",
        version: 2,
        command: { kind: "END_TURN" },
      }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_COMMAND" } });
  });

  it.each([
    null,
    {},
    { kind: "END_TURN", extra: true },
    { kind: "MOVE", unitId: 0, path: [] },
    { kind: "RESEARCH", tech: "SAILING" },
  ])("rejects malformed payload %#", (payload) => {
    expect(parseCommand(payload)).toMatchObject({
      ok: false,
      error: { code: "INVALID_COMMAND" },
    });
  });
});
