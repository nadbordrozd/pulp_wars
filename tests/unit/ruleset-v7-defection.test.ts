import { describe, expect, it } from "vitest";
import {
  COMMAND_KIND_ORDER_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  UNIT_ROLE_IDS_V7,
  parseCommandV7,
  parseEventV7,
  parseGameStateV7,
} from "../../src/engine/index";
import { initialV7 } from "../fixtures/v7-builders";

describe("ruleset-7 revision-3 removed IDs", () => {
  it("does not register Envoy, Lancer, Pursuit, or Defection", () => {
    expect(UNIT_ROLE_IDS_V7).not.toContain("ENVOY");
    expect(UNIT_ROLE_IDS_V7).not.toContain("LANCER");
    expect(COMMAND_KIND_ORDER_V7).not.toContain("OFFER_DEFECTION");
    expect(COMMAND_KIND_ORDER_V7).not.toContain("PURSUE");
    expect(COMMAND_KIND_ORDER_V7).not.toContain("END_PURSUIT");
    expect(
      DOMAIN_EVENT_KIND_ORDER_V7.some((kind) => kind.includes("DEFECTION")),
    ).toBe(false);
    expect(
      DOMAIN_EVENT_KIND_ORDER_V7.some((kind) => kind.includes("PURSUIT")),
    ).toBe(false);
  });

  it("rejects removed command and event payloads at the schema boundary", () => {
    expect(
      parseCommandV7({
        kind: "OFFER_DEFECTION",
        unitId: 1,
        targetUnitId: 2,
        homeCityId: 3,
      }),
    ).toMatchObject({ ok: false, field: "command.kind" });
    expect(
      parseCommandV7({ kind: "PURSUE", unitId: 1, path: [{ x: 1, y: 1 }] }),
    ).toMatchObject({
      ok: false,
      field: "command.kind",
    });
    expect(parseEventV7({ kind: "DEFECTION_RESOLVED" })).toMatchObject({
      ok: false,
    });
    expect(parseEventV7({ kind: "PURSUIT_ENDED" })).toMatchObject({
      ok: false,
    });
  });

  it("rejects an old revision state identity without migration", () => {
    const state = initialV7();
    expect(
      parseGameStateV7({ ...state, rulesetId: "pulp-wars-poc-7r2" }),
    ).toBeNull();
  });
});
