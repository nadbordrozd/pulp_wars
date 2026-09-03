import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { ECONOMIC_IMPROVEMENT_IDS, RESOURCE_IDS } from "../../src/engine/index";
import {
  improvementCoverageV6,
  resourceCoverageV6,
  roadCoverageV6,
  terrainCoverageV6,
} from "../../src/render/canvas/asset-coverage-v6";
import { SQUARE_ART_GEOMETRY } from "../../src/render/canvas/board-art-geometry";
import {
  commandArtIdV6,
  technologyArtIdV6,
} from "../../src/assets/ruleset6-ui-art";

const UNIT_HASHES_AT_07229E2 = {
  "archer.png":
    "deb62a8a84dc28ceecd58047a3f65abdb67c0616851337c817452d75a5b73bb2",
  "candy-choco-engineer.png":
    "020d0448b1db6be74b00aa3d468ca4f4aa7d9c2c700d63ae7c03a683ec314fcf",
  "candy-crusher.png":
    "d2fb335814ae4929cb47891bcb8561c8092a1bfc9fc53f98b9b4a32382898fca",
  "candy-donut.png":
    "041fd6defb9b46059e9036418c501cc287e8ac74180384594770e9d1d764a991",
  "candy-gumball-guard.png":
    "5a43d5f737bbf41f007c9bf8ee5f7fe5e0084bb13f9d243917d27c6f701f81b2",
  "candy-jawbreaker.png":
    "5897e7b0d7d8dd4746ff7ecadba4ba0b0d72266df4b33b25743fef33c5ee1455",
  "candy-jelly-scout.png":
    "c835c0a08cc24d5751c0dbc85365f638016029984162a6272387aa3efc2965a9",
  "candy-marshmallow-medic.png":
    "868b00e650c05e22bd085d72f093fd8c80554ba17a3357a2982833c617e98327",
  "candy-sugar-titan.png":
    "7d360ee7191644121f4397be91ac7ab42769883b44d6481d6c056ad7c5df76c9",
  "candy-warrior.png":
    "76456b060ba1701e75387285b4738d4c289c0617eb852f5552beadfe2eb1a2bc",
  "catapult.png":
    "cdf6ed34a67c1daf1bfd947b0b1af007b25d2a13ee88ee2df876bdb9f7ceec83",
  "defender.png":
    "930c31f9aa1bf5dacf0318484b31ac63504365482ae01a84a6a269d94de65e11",
  "original-breacher.png":
    "1e752161cd63bcb7bc0e5a0989557f61d2d7f2d3e3d9597ccc9360ed11fca2ad",
  "original-heavy.png":
    "8fe592d094ede939cf8a92119022c9606b6c12621ed4d6777b4056b8cadb3759",
  "original-juggernaut.png":
    "c905126dc7c38683b1ecba0aa930a4add45426a26fa3560a78e2df21ddaccc9a",
  "original-medic.png":
    "c30475f23be6a8ca9ee1957a327b3b764489e570d50cd69d5775006650af62c2",
  "original-scout.png":
    "8663c5c6f95ed69481123245a7f7c5e6acf2b55ebb9c52ebbc46979252e60343",
  "rider.png":
    "20bb28c79c28e262908e518124e776f30adf946254906e62245f0e9702606bb4",
  "warrior.png":
    "d606459210df2297706816957f4c62f3dea01f2324ba32641dc9fbbf3e9590a1",
} as const;

describe("accepted square runtime integration", () => {
  it("binds every faction terrain variant and resource to square production paths", () => {
    for (const faction of ["ORIGINAL", "CANDY"] as const) {
      const slug = faction.toLowerCase();
      for (const [terrain, count] of [
        ["GRASS", 4],
        ["FOREST", 4],
        ["MOUNTAIN", 3],
      ] as const) {
        for (let variant = 0; variant < count; variant += 1) {
          expect(terrainCoverageV6(terrain, faction, variant)).toMatchObject({
            status: "ACCEPTED",
            assetId: `terrain-square-${slug}-${terrain.toLowerCase()}-${variant + 1}`,
            publicPath: `assets/pixellab/terrain-square/${slug}-${terrain.toLowerCase()}-${variant + 1}.png`,
            geometry:
              terrain === "GRASS"
                ? SQUARE_ART_GEOMETRY.ground
                : SQUARE_ART_GEOMETRY.tallTerrain,
          });
        }
      }
      for (const resource of RESOURCE_IDS) {
        const coverage = resourceCoverageV6(resource, faction);
        expect(coverage.status).toBe("ACCEPTED");
        if (coverage.status !== "ACCEPTED") throw new Error("Missing resource");
        expect(coverage.publicPath).toContain(
          "assets/pixellab/terrain-square/",
        );
        expect(coverage.geometry).toEqual(SQUARE_ART_GEOMETRY.resource);
      }
    }
  });

  it("binds all 16 cardinal Road masks and all 11 economic improvements without legacy fallback", () => {
    for (let mask = 0; mask < 16; mask += 1) {
      const bits = mask.toString(2).padStart(4, "0");
      expect(roadCoverageV6(mask)).toMatchObject({
        status: "ACCEPTED",
        assetId: `terrain-square-road-mask-${bits}`,
        publicPath: `assets/pixellab/terrain-square/road-masks/road-mask-${bits}.png`,
        geometry: SQUARE_ART_GEOMETRY.ground,
      });
    }
    for (const improvement of ECONOMIC_IMPROVEMENT_IDS) {
      const coverage = improvementCoverageV6(improvement);
      expect(coverage.status).toBe("ACCEPTED");
      if (coverage.status !== "ACCEPTED")
        throw new Error("Missing improvement");
      expect(coverage.assetId).toBe(
        `building-square-${improvement.toLowerCase().replaceAll("_", "-")}`,
      );
      expect(coverage.publicPath).toContain(
        "assets/pixellab/buildings-square/",
      );
      expect(coverage.geometry).toEqual(
        improvement === "FARM"
          ? SQUARE_ART_GEOMETRY.ground
          : ["LUMBER_CAMP", "MINE", "QUARRY"].includes(improvement)
            ? SQUARE_ART_GEOMETRY.lowImprovement
            : SQUARE_ART_GEOMETRY.processor,
      );
    }
  });

  it("reuses matching square art in economy action buttons and technology cards", () => {
    expect(
      commandArtIdV6({ kind: "BUILD_FARM", at: { x: 1, y: 2 } }, "ORIGINAL"),
    ).toBe("building-square-farm");
    expect(
      commandArtIdV6({ kind: "BUILD_ROAD", at: { x: 1, y: 2 } }, "CANDY"),
    ).toBe("terrain-square-road-mask-0101");
    expect(
      commandArtIdV6({ kind: "HARVEST_FRUIT", at: { x: 1, y: 2 } }, "CANDY"),
    ).toBe("terrain-square-candy-fruit");
    expect(
      commandArtIdV6({ kind: "HUNT_GAME", at: { x: 1, y: 2 } }, "ORIGINAL"),
    ).toBe("terrain-square-original-animal");

    for (const faction of ["ORIGINAL", "CANDY"] as const) {
      expect(technologyArtIdV6(faction, "FARMING")).toBe(
        "building-square-farm",
      );
      expect(technologyArtIdV6(faction, "MILLING")).toBe(
        "building-square-windmill",
      );
      expect(technologyArtIdV6(faction, "COMMERCE")).toBe(
        "building-square-market",
      );
      expect(technologyArtIdV6(faction, "GATHERING")).toBe(
        `terrain-square-${faction.toLowerCase()}-fruit`,
      );
    }
  });

  it("keeps every accepted unit PNG byte-for-byte equal to rollback baseline 07229e2", async () => {
    for (const [filename, baseline] of Object.entries(UNIT_HASHES_AT_07229E2)) {
      const bytes = await readFile(`public/assets/pixellab/units/${filename}`);
      expect(createHash("sha256").update(bytes).digest("hex"), filename).toBe(
        baseline,
      );
    }
  });
});
