import { describe, expect, it } from "vitest";
import { ACCEPTED_ART_URLS } from "../../src/assets/generated-art-manifest";
import {
  RULESET7_FARM_ART_IDS,
  RULESET7_IMPROVEMENT_ART_IDS,
  RULESET7_PORTRAIT_ART_IDS,
  RULESET7_RESOURCE_ART_IDS,
  RULESET7_TECH_ART_IDS,
  RULESET7_TERRAIN_ART_IDS,
  RULESET7_UNIT_ART_IDS,
  commandArtIdV7,
} from "../../src/assets/ruleset7-ui-art";
import {
  type CityId,
  IMPROVEMENT_IDS_V7,
  TECHNOLOGY_IDS_V7,
  type UnitId,
  UNIT_ROLE_IDS_V7,
} from "../../src/engine/index";

describe("Ruleset 7 UI accepted-art registry", () => {
  it("has explicit resolvable entries for every role, technology and improvement", () => {
    expect(Object.keys(RULESET7_UNIT_ART_IDS)).toEqual(UNIT_ROLE_IDS_V7);
    expect(Object.keys(RULESET7_TECH_ART_IDS)).toEqual(TECHNOLOGY_IDS_V7);
    expect(Object.keys(RULESET7_IMPROVEMENT_ART_IDS)).toEqual(
      IMPROVEMENT_IDS_V7,
    );
    for (const id of [
      ...Object.values(RULESET7_UNIT_ART_IDS),
      ...Object.values(RULESET7_PORTRAIT_ART_IDS),
      ...Object.values(RULESET7_TECH_ART_IDS),
      ...Object.values(RULESET7_IMPROVEMENT_ART_IDS),
      ...Object.values(RULESET7_RESOURCE_ART_IDS),
      ...Object.values(RULESET7_TERRAIN_ART_IDS),
    ])
      expect(ACCEPTED_ART_URLS[id], id).toBeTypeOf("string");
  });

  it("uses the world unit raster for training and leaves spatial actions map-only", () => {
    expect(
      commandArtIdV7({
        kind: "TRAIN",
        cityId: 1 as CityId,
        role: "CATAPULT",
      }),
    ).toBe(RULESET7_UNIT_ART_IDS.CATAPULT);
    expect(
      commandArtIdV7({
        kind: "MOVE",
        unitId: 1 as UnitId,
        path: [{ x: 1, y: 1 }],
      }),
    ).toBeNull();
    expect(
      commandArtIdV7({
        kind: "ATTACK",
        unitId: 1 as UnitId,
        targetUnitId: 2 as UnitId,
      }),
    ).toBeNull();
    expect(
      commandArtIdV7({ kind: "END_PURSUIT", unitId: 1 as UnitId }),
    ).toBeNull();
  });

  it("uses the v7 single Farm for technology, action, and identity", () => {
    expect(RULESET7_TECH_ART_IDS.FARMING).toBe(RULESET7_FARM_ART_IDS.SINGLE);
    expect(RULESET7_IMPROVEMENT_ART_IDS.FARM).toBe(
      RULESET7_FARM_ART_IDS.SINGLE,
    );
    expect(commandArtIdV7({ kind: "BUILD_FARM", at: { x: 1, y: 1 } })).toBe(
      RULESET7_FARM_ART_IDS.SINGLE,
    );
  });
});
