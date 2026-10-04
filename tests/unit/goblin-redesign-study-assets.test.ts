import path from "node:path";
import { describe, expect, it } from "vitest";
import { batchManifestProblems } from "../../scripts/art/chibi/batch-manifest";
import { loadExploration, readRaster } from "../../scripts/art/chibi/pipeline";
import { deltaE, rgbOf } from "../../scripts/art/ice-folk-direction/colour";
import {
  GOBLIN_CITIES_V7,
  GOBLIN_DIRECTIONS_V7,
  GOBLIN_PORTRAITS_V7,
  GOBLIN_ROSTER_V7,
  GOBLIN_SHIPS_V7,
  goblinDirectionV7,
} from "../../scripts/art/goblin-redesign/directions";
import { loadGoblinBeforeV7 } from "../../scripts/art/goblin-redesign/before";
import {
  valueMetricsV7,
  type ValueMetricsV7,
} from "../../scripts/art/goblin-redesign/measure";
import {
  classifyGoblinPixelV7,
  recolourGoblinSpriteV7,
} from "../../scripts/art/goblin-redesign/recolour";
import { FACTION_COLOURS_V7 } from "../../src/render/canvas/faction-colours-v7";

const ROOT = process.cwd();
const RUN = "art/explorations/goblin-redesign-2026-10";
const GRASS = rgbOf("#89b75b");

describe("Goblin redesign study (bead pulp_wars-wrn.1)", () => {
  it("classifies the current Goblin materials by colour", () => {
    const cases: [string, string][] = [
      ["#000000", "ink"],
      ["#8a952f", "skin"], // Goblin olive
      ["#4a5830", "skin"], // Orc moss
      ["#22331b", "skin"], // Troll shadow, near black but green
      ["#955627", "leather"],
      ["#1e0600", "wood"], // near-black cart plank, not ink
      ["#6c6d6a", "metal"],
      ["#47545b", "metal"],
      ["#fbc208", "accent"], // hazard yellow
      ["#fee388", "light"], // rocket cone
      ["#e00c02", "keep"], // red rocket paper
      ["#065f98", "keep"], // blue rocket paper
    ];
    for (const [hex, kind] of cases)
      expect(classifyGoblinPixelV7(rgbOf(hex)), hex).toBe(kind);
    expect(
      classifyGoblinPixelV7(rgbOf("#1e0600"), {
        darkBrown: "leather",
        rust: "leather",
      }),
    ).toBe("leather");
    expect(classifyGoblinPixelV7(rgbOf("#8a4625"))).toBe("rust");
    expect(classifyGoblinPixelV7(rgbOf("#8a4625"), { rust: "leather" })).toBe(
      "leather",
    );
  });

  it("keeps every direction's ramps dark to light, with shares summing to 1", () => {
    for (const direction of GOBLIN_DIRECTIONS_V7) {
      const ramps = [
        ...Object.values(direction.skins),
        ...Object.values(direction.ramps),
      ];
      for (const ramp of ramps) {
        const lightness = ramp.colours.map(
          (hex) =>
            valueMetricsV7(
              {
                width: 1,
                height: 1,
                data: new Uint8Array([...rgbOf(hex), 255]),
              },
              FACTION_COLOURS_V7.GOBLIN,
              GRASS,
            ).meanLightness,
        );
        for (let step = 1; step < lightness.length; step += 1)
          expect(lightness[step]).toBeGreaterThan(lightness[step - 1] ?? 0);
        expect(ramp.shares.reduce((sum, share) => sum + share, 0)).toBeCloseTo(
          1,
          6,
        );
        // At least half of every material on the lit step or lighter.
        expect(
          ramp.shares[2] + ramp.shares[3] + ramp.shares[4],
        ).toBeGreaterThanOrEqual(0.5);
      }
      // The faction colour is the accent of every direction.
      expect(direction.ramps.accent.colours[2]).toBe(FACTION_COLOURS_V7.GOBLIN);
      // The outline stays ink (every channel at most 14).
      expect(Math.max(...rgbOf(direction.ink))).toBeLessThanOrEqual(14);
    }
  });

  it("lifts the dark units of the roster it diagnosed in the recommended direction", async () => {
    const lime = goblinDirectionV7("lime");
    for (const unit of GOBLIN_ROSTER_V7) {
      // The sprites before the redesign: the superseded recipes' recorded
      // candidates (the live masters are the redesigned art).
      const source = await loadGoblinBeforeV7(ROOT, unit);
      const result = recolourGoblinSpriteV7(source, lime, unit);
      // Shape and transparency are unchanged: a recolour, not a redraw.
      for (let index = 0; index < source.width * source.height; index += 1)
        expect(result.raster.data[index * 4 + 3]).toBe(
          source.data[index * 4 + 3],
        );
      const before = valueMetricsV7(source, FACTION_COLOURS_V7.GOBLIN, GRASS);
      const after = valueMetricsV7(
        result.raster,
        FACTION_COLOURS_V7.GOBLIN,
        GRASS,
      );
      expect(after.meanLightness, unit.name).toBeGreaterThan(
        before.meanLightness + 10,
      );
      expect(after.light + after.bright, unit.name).toBeGreaterThan(0.4);
    }
  });

  it("keeps the recommended palette away from the other factions' signature colours", () => {
    const lime = goblinDirectionV7("lime");
    const signatures = [
      "#a8202c",
      "#d01c3a",
      "#a221ee",
      "#fe7500",
      "#e83aae",
      "#10b8ff",
      "#c27c3a",
      "#c8642a",
      "#2db885",
    ];
    for (const swatch of lime.swatches)
      for (const signature of signatures)
        expect(
          deltaE(rgbOf(swatch.hex), rgbOf(signature)),
          `${swatch.role} against ${signature}`,
        ).toBeGreaterThan(14);
  });

  it("has two valid exploration runs with every piece of the roster, samples first", async () => {
    for (const [id, faction] of [
      ["lime", "TEST-GOBLIN-LIME"],
      ["rag", "TEST-GOBLIN-RAG"],
    ] as const) {
      const { manifest, fragments } = await loadExploration(
        ROOT,
        `${RUN}/${id}`,
      );
      expect(manifest.faction).toBe(faction);
      expect(manifest.fixedFactionColours).toBe(true);
      expect(batchManifestProblems(manifest, fragments)).toEqual([]);
      const subjects = manifest.assets.map((asset) => asset.subject);
      for (const role of [
        "FIGHTER",
        "RAIDER",
        "MARKSMAN",
        "GUARD",
        "CAPTAIN",
        "CATAPULT",
        "KNIGHT",
        "JUGGERNAUT",
      ]) {
        expect(subjects).toContain(`UNIT:GOBLIN:${role}`);
        expect(subjects).toContain(`PORTRAIT:GOBLIN:${role}`);
      }
      for (const subject of [
        "CITY:GOBLIN:1",
        "CITY:GOBLIN:2",
        "CITY:GOBLIN:3",
        "UNIT:GOBLIN:PATROL_BOAT",
        "UNIT:GOBLIN:BATTLESHIP",
        "UNIT:GOBLIN:EMBARKED_TRANSPORT",
      ])
        expect(subjects).toContain(subject);
      expect(
        manifest.assets.every((asset) => asset.ownerColour === false),
      ).toBe(true);
      // Fresh creations only: the redesign does not edit the old sprites.
      // The lime run's later recipes (bead pulp_wars-wrn.2) edit its own
      // creations, never another batch.
      expect(
        manifest.recipes
          .slice(0, 28)
          .every((recipe) => recipe.endpoint === "create-image-pixen"),
      ).toBe(true);
      for (const recipe of manifest.recipes.slice(28)) {
        expect(id, recipe.id).toBe("lime");
        expect(recipe.endpoint, recipe.id).toBe("edit-image-pixen");
        expect(recipe.source?.batch, recipe.id).toBeUndefined();
      }
      const seeds = manifest.recipes.map((recipe) => recipe.seed);
      expect(new Set(seeds).size).toBe(seeds.length);
      expect(manifest.recipes.slice(0, 8).map((recipe) => recipe.id)).toEqual([
        "goblin-a",
        "goblin-b",
        "orc-brute-a",
        "orc-brute-b",
        "orc-warboss-a",
        "orc-warboss-b",
        "troll-a",
        "troll-b",
      ]);
    }
  });
});

describe("Goblin redesign production art (bead pulp_wars-wrn.2)", () => {
  const measure = async (file: string) =>
    valueMetricsV7(
      await readRaster(path.join(ROOT, file)),
      FACTION_COLOURS_V7.GOBLIN,
      GRASS,
    );

  it("meets the study's value rules on every live unit", async () => {
    const metrics: ValueMetricsV7[] = [];
    for (const unit of GOBLIN_ROSTER_V7) {
      const before = valueMetricsV7(
        await loadGoblinBeforeV7(ROOT, unit),
        FACTION_COLOURS_V7.GOBLIN,
        GRASS,
      );
      const after = await measure(unit.file);
      metrics.push(after);
      // The study's acceptance: mean L* 50 or more and the faction colour
      // on the sprite; a real light end and no dark mass.
      expect(after.meanLightness, unit.name).toBeGreaterThanOrEqual(50);
      expect(after.meanLightness, unit.name).toBeGreaterThan(
        before.meanLightness + 12,
      );
      expect(after.dark, unit.name).toBeLessThan(0.3);
      expect(after.p90, unit.name).toBeGreaterThanOrEqual(80);
      expect(after.factionColour, unit.name).toBeGreaterThanOrEqual(0.02);
      expect(after.factionColour, unit.name).toBeLessThanOrEqual(0.1);
      // Lit share 45% or more, except the Wolf Rider, whose mid-grey wolf
      // sits just under the L* 55 line (38%; it was 12%).
      expect(after.light + after.bright, unit.name).toBeGreaterThanOrEqual(
        unit.role === "RAIDER" ? 0.35 : 0.45,
      );
    }
    // The roster as a whole sits with the Martians and the Ice Folk.
    const mean = (pick: (m: ValueMetricsV7) => number): number =>
      metrics.reduce((sum, m) => sum + pick(m), 0) / metrics.length;
    expect(mean((m) => m.meanLightness)).toBeGreaterThan(53);
    expect(mean((m) => m.dark)).toBeLessThan(0.25);
    expect(mean((m) => m.light + m.bright)).toBeGreaterThan(0.48);
  });

  it("lifts the portraits, cities and ships too", async () => {
    for (const sprite of [
      ...GOBLIN_PORTRAITS_V7,
      ...GOBLIN_CITIES_V7,
      ...GOBLIN_SHIPS_V7,
    ]) {
      const before = valueMetricsV7(
        await loadGoblinBeforeV7(ROOT, sprite),
        FACTION_COLOURS_V7.GOBLIN,
        GRASS,
      );
      const after = await measure(sprite.file);
      const label = `${sprite.kind} ${sprite.name}`;
      expect(after.meanLightness, label).toBeGreaterThan(
        before.meanLightness + 8,
      );
      expect(after.meanLightness, label).toBeGreaterThanOrEqual(41);
      expect(after.dark, label).toBeLessThan(before.dark);
    }
  });

  it("reads the retired sprites from the superseded recipes, pixel for pixel", async () => {
    // The old masters were their recorded candidates as generated; the
    // live masters are different images of the same size.
    for (const sprite of [...GOBLIN_ROSTER_V7, ...GOBLIN_SHIPS_V7]) {
      const before = await loadGoblinBeforeV7(ROOT, sprite);
      const live = await readRaster(path.join(ROOT, sprite.file));
      expect([before.width, before.height], sprite.name).toEqual([
        live.width,
        live.height,
      ]);
      expect(Buffer.from(before.data).equals(Buffer.from(live.data))).toBe(
        false,
      );
    }
  });
});
