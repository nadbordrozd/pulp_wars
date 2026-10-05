import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SOUND_CATEGORIES_V1,
  SOUND_IDS_V1,
  SOUND_MANIFEST_V1,
  SYNTH_SAMPLE_RATE_V1,
  measureSynthSamplesV1,
  renderSynthRecipeV1,
  soundRecipeV1,
  soundTableMarkdownV1,
  synthRecipeDurationMsV1,
  type SoundIdV1,
} from "../../src/audio/index";

/**
 * The sound manifest and its synthesised recipes (bead pulp_wars-2yc.10,
 * docs/ui/SOUND.md). Nobody listened to these while they were written, so
 * every recipe is rendered here and held to conservative bounds: short,
 * quiet, without an offset, never clipping and never shrill.
 */

/** The tunes that may run longer than a short effect. */
const JINGLES: ReadonlySet<SoundIdV1> = new Set([
  "city.capture",
  "village.capture",
  "city.lost",
  "city.levelup",
  "research.complete",
  "economy.treasure",
  "turn.start",
  "support.heal",
  "achievement.unlocked",
  "achievement.monument",
  "match.victory",
  "match.defeat",
]);

describe("sound manifest", () => {
  it("has one entry per sound id, each with a recipe or a file", () => {
    expect(Object.keys(SOUND_MANIFEST_V1).sort()).toEqual(
      [...SOUND_IDS_V1].sort(),
    );
    expect(new Set(SOUND_IDS_V1).size).toBe(SOUND_IDS_V1.length);
    for (const id of SOUND_IDS_V1) {
      const entry = SOUND_MANIFEST_V1[id];
      expect(entry.label.length, id).toBeGreaterThan(0);
      // Icon and short label: never a sentence.
      expect(entry.label.split(" ").length, id).toBeLessThanOrEqual(3);
      expect(SOUND_CATEGORIES_V1, id).toContain(entry.category);
      expect(entry.jitterCents, id).toBeGreaterThanOrEqual(0);
      expect(entry.jitterCents, id).toBeLessThanOrEqual(100);
      if (entry.source.kind === "SYNTH")
        expect(entry.source.recipe.layers.length, id).toBeGreaterThan(0);
      else expect(entry.source.url.length, id).toBeGreaterThan(0);
    }
  });

  it("covers the events the bead asks for", () => {
    for (const id of [
      "attack.melee",
      "attack.ranged",
      "attack.ray",
      "attack.siege",
      "impact.hit",
      "impact.explosion",
      "impact.ice",
      "impact.splat",
      "support.heal",
      "unit.hurt",
      "unit.death",
      "unit.step",
      "city.capture",
      "village.capture",
      "city.levelup",
      "unit.levelup",
      "reward.chosen",
      "research.complete",
      "economy.build",
      "economy.harvest",
      "economy.coin",
      "unit.train",
      "turn.start",
      "turn.end",
      "achievement.unlocked",
      "achievement.monument",
      "ui.select",
      "ui.click",
      "ui.error",
      "match.victory",
      "match.defeat",
    ] as const)
      expect(SOUND_IDS_V1).toContain(id);
  });

  it("has no ambience yet", () => {
    expect(
      SOUND_IDS_V1.filter(
        (id) => SOUND_MANIFEST_V1[id].category === "ambience",
      ),
    ).toEqual([]);
  });
});

describe("synthesised recipes", () => {
  it("render within conservative bounds", () => {
    for (const id of SOUND_IDS_V1) {
      const recipe = soundRecipeV1(id);
      expect(recipe, id).not.toBeNull();
      if (recipe === null) continue;
      const samples = renderSynthRecipeV1(recipe);
      const measured = measureSynthSamplesV1(samples);
      expect(measured.finite, id).toBe(true);
      // Duration: short effects under 400 ms of sound; tunes under 2 s.
      expect(measured.durationMs, id).toBeCloseTo(
        synthRecipeDurationMsV1(recipe),
        0,
      );
      expect(measured.durationMs, id).toBeLessThanOrEqual(
        JINGLES.has(id) ? 2000 : 480,
      );
      expect(measured.durationMs, id).toBeGreaterThan(30);
      // Level: the declared peak, well below clipping, and audible.
      expect(recipe.peak, id).toBeLessThanOrEqual(0.5);
      expect(recipe.peak, id).toBeGreaterThanOrEqual(0.1);
      expect(measured.peak, id).toBeLessThanOrEqual(recipe.peak + 1e-6);
      expect(measured.peak, id).toBeGreaterThan(recipe.peak * 0.9);
      expect(measured.rms, id).toBeGreaterThan(0.02);
      expect(measured.rms, id).toBeLessThan(0.15);
      // No offset, and silence at both ends (no click).
      expect(Math.abs(measured.offset), id).toBeLessThan(0.001);
      expect(Math.abs(measured.firstSample), id).toBeLessThan(0.001);
      expect(Math.abs(measured.lastSample), id).toBeLessThan(0.001);
      // Nothing shrill: a pure tone this bright would sit under 4.5 kHz.
      expect(measured.brightnessHz, id).toBeLessThan(4500);
    }
  });

  it("keeps tonal layers out of the piercing range and filters noise", () => {
    for (const id of SOUND_IDS_V1) {
      const recipe = soundRecipeV1(id);
      if (recipe === null) continue;
      for (const layer of recipe.layers) {
        expect(layer.ms, id).toBeGreaterThan(0);
        if (layer.wave === "noise") {
          expect(layer.lowpassHz, id).toBeDefined();
          expect(layer.lowpassHz ?? 0, id).toBeLessThanOrEqual(5200);
        } else {
          expect(layer.hz, id).toBeDefined();
          expect(
            Math.max(layer.hz ?? 0, layer.hzEnd ?? 0),
            id,
          ).toBeLessThanOrEqual(layer.wave === "sine" ? 1700 : 2200);
          expect(
            Math.min(layer.hz ?? 0, layer.hzEnd ?? layer.hz ?? 0),
            id,
          ).toBeGreaterThanOrEqual(30);
        }
      }
    }
  });

  it("renders the same samples every time", () => {
    const recipe = soundRecipeV1("impact.explosion");
    if (recipe === null) throw new Error("recipe missing");
    expect(Array.from(renderSynthRecipeV1(recipe))).toEqual(
      Array.from(renderSynthRecipeV1(recipe)),
    );
    // A different sample rate keeps the length in time.
    expect(renderSynthRecipeV1(recipe, 22050).length).toBe(
      Math.ceil(renderSynthRecipeV1(recipe, SYNTH_SAMPLE_RATE_V1).length / 2),
    );
  });

  it("matches the recipe table of docs/ui/SOUND.md", () => {
    const cells = (line: string): string[] =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim());
    const documented = new Set(
      readFileSync("docs/ui/SOUND.md", "utf8")
        .split("\n")
        .filter((line) => line.startsWith("| `"))
        .map((line) => cells(line).join(" | ")),
    );
    const rows = soundTableMarkdownV1();
    expect(rows.length).toBe(SOUND_IDS_V1.length);
    for (const line of rows) {
      const row = cells(line).join(" | ");
      expect(documented.has(row), row).toBe(true);
    }
  });
});
