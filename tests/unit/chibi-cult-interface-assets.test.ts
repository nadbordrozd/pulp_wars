import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ACCENT_PRESETS, accentRaster } from "../../scripts/art/chibi/accent";
import {
  CHIBI_CLASS_RECIPES,
  batchManifestProblems,
} from "../../scripts/art/chibi/batch-manifest";
import { rgbToHsv, type RgbaRaster } from "../../scripts/art/chibi/owner-mask";
import {
  loadBatchManifest,
  loadFragments,
  loadRecords,
  productionLayout,
  readRaster,
  verifyAssetRecord,
} from "../../scripts/art/chibi/pipeline";
import { paletteColours } from "../../scripts/art/chibi/raster";
import {
  CULT_GREEN_PALETTE,
  CULT_GREEN_PALETTE_PATH,
  cultGreenPalettePng,
} from "../../scripts/art/cult-direction/green-palette";
import {
  chibiFallbackSubjectV7,
  cultSummonedPortraitSubjectV7,
  type ArtSubjectV7,
} from "../../src/assets/chibi-art-v7";
import { chibiDirectionArtRegistryV7 } from "../../src/assets/chibi-direction-art-manifest";
import { CHIBI_DIRECTION_CULT_NAVAL_ART_ASSETS_V7 } from "../../src/assets/chibi-direction-cult-art-manifest";
import { CHIBI_DIRECTION_CULT_INTERFACE_ART_ASSETS_V7 } from "../../src/assets/chibi-direction-cult-interface-art-manifest";
import { CHIBI_NAVAL_SUBMARINE_ART_ASSETS_V7 } from "../../src/assets/chibi-naval-submarine-art-manifest";
import {
  portraitSubjectV7,
  technologySubjectV7,
} from "../../src/assets/chibi-ui-art-v7";
import { SUMMONED_ROLE_IDS_V7 } from "../../src/engine/index";

const ROOT = process.cwd();
const INTERFACE = "interface-cult";
const EFFECTS = "effects-cult";
const NAVAL = "naval-cult";

/** CULT.md, "Portraits": unit, subject role, recipe class, accent preset. */
const PORTRAITS = [
  ["initiate", "FIGHTER", "portrait", "cult-lodge-icon"],
  ["idol-bearer", "GUARD", "portrait", "cult-lodge-icon"],
  ["familiar", "RAIDER", "creature", "cult-lodge-icon"],
  ["hexer", "MARKSMAN", "portrait", "cult-lodge-icon"],
  ["summoner", "CAPTAIN", "portrait", "cult-lodge-icon"],
  ["stargazer", "CATAPULT", "portrait", "cult-lodge-icon"],
  ["caller", "KNIGHT", "portrait", "cult-lodge-icon"],
  ["chosen", "SWORDSMAN", "portrait", "cult-lodge-icon"],
  ["thing", "JUGGERNAUT", "creature", "cult-green"],
  ["horror", "HORROR", "creature", "cult-green"],
  ["herald", "HERALD", "portrait", "cult-lodge-icon"],
  ["tentacle", "TENTACLE", "creature", "cult-green"],
] as const;

/** CULT.md, "Icons": asset name and subject, in the manifest's order. */
const ICONS = [
  ["tech-warding-circles", "ICON:TECH:CULT:FORTIFICATION"],
  ["tech-stars-are-right", "ICON:TECH:CULT:EXPLOSIVES"],
  ["tech-harvest-rites", "ICON:TECH:CULT:FARMING"],
  ["action-sacrifice", "ICON:ACTION:SACRIFICE"],
  ["action-seize", "ICON:ACTION:SEIZE"],
  ["action-offering", "ICON:ACTION:OFFERING"],
  ["action-summon", "ICON:ACTION:SUMMON"],
  ["action-channel", "ICON:ACTION:CHANNEL"],
  ["action-behold", "ICON:ACTION:BEHOLD"],
  ["action-pick-me", "ICON:ACTION:PICK_ME"],
  ["action-anchor", "ICON:ACTION:ANCHOR"],
  ["action-boo", "ICON:ACTION:BOO"],
  ["action-proclaim", "ICON:ACTION:PROCLAIM"],
  ["action-ribbit", "ICON:ACTION:RIBBIT"],
  ["action-switcheroo", "ICON:ACTION:SWITCHEROO"],
  ["action-tentacle", "ICON:ACTION:TENTACLE"],
  ["action-starfall", "ICON:ACTION:STARFALL"],
  ["action-great-summoning", "ICON:ACTION:GREAT_SUMMONING"],
  ["action-pamphlets", "ICON:ACTION:PAMPHLETS"],
  ["action-martyr", "ICON:ACTION:MARTYR"],
  ["action-grab", "ICON:ACTION:GRAB"],
  ["favour", "ICON:HUD:CULT:FAVOUR"],
  ["favour-large", "ICON:HUD:CULT:FAVOUR_LARGE"],
  ["emblem", "ICON:HUD:CULT:EMBLEM"],
  ["status-candlelit", "ICON:STATUS:CANDLELIT"],
  ["status-frog", "ICON:STATUS:FROG"],
  ["status-unbound", "ICON:STATUS:UNBOUND"],
  ["status-furious", "ICON:STATUS:FURIOUS"],
  ["status-grabbed", "ICON:STATUS:GRABBED"],
  ["status-cowed", "ICON:STATUS:COWED"],
  ["status-warded", "ICON:STATUS:WARDED"],
  ["status-pick-me", "ICON:STATUS:PICK_ME"],
] as const;

/** CULT.md, "Markers and effects": asset name, effect id, canvas side. */
const EFFECT_ROWS = [
  ["sacrifice-puff", "SACRIFICE_PUFF", 48],
  ["seize", "SEIZE", 48],
  ["summon-pop", "SUMMON_POP", 48],
  ["strand-snap", "STRAND_SNAP", 40],
  ["unbound", "UNBOUND", 48],
  ["starfall-star", "STARFALL_STAR", 40],
  ["starfall-burst", "STARFALL_BURST", 48],
  ["boo", "BOO", 48],
  ["ribbit", "RIBBIT", 48],
  ["switcheroo", "SWITCHEROO", 40],
  ["tentacle-slap", "TENTACLE_SLAP", 40],
  ["proclaim", "PROCLAIM", 48],
  ["pamphlets", "PAMPHLETS", 40],
  ["favour", "FAVOUR", 40],
  ["ritual-fizzle", "RITUAL_FIZZLE", 48],
] as const;

const SHIP_PORTRAITS = ["patrol-boat", "battleship", "submarine"] as const;

interface Hsv {
  readonly hue: number;
  readonly saturation: number;
  readonly value: number;
}
function hsvPixels(source: RgbaRaster): Hsv[] {
  const out: Hsv[] = [];
  for (let index = 0; index < source.width * source.height; index += 1)
    if ((source.data[index * 4 + 3] ?? 0) >= 128)
      out.push(
        rgbToHsv(
          source.data[index * 4] ?? 0,
          source.data[index * 4 + 1] ?? 0,
          source.data[index * 4 + 2] ?? 0,
        ),
      );
  return out;
}
const isRed = (p: Hsv): boolean =>
  (p.hue >= 345 || p.hue <= 12) && p.saturation >= 0.5 && p.value >= 0.35;
const isViolet = (p: Hsv): boolean =>
  p.hue >= 270 && p.hue < 345 && p.saturation >= 0.3 && p.value >= 0.25;
const isGreen = (p: Hsv): boolean =>
  p.hue >= 80 && p.hue <= 152 && p.saturation >= 0.5 && p.value >= 0.45;

describe("the Cultists' interface art (pulp_wars-mch9.23)", () => {
  it("lists the twelve unit portraits and the thirty-two icons of the direction in batch interface-cult", async () => {
    const manifest = await loadBatchManifest(ROOT, INTERFACE);
    const fragments = await loadFragments(ROOT);
    expect(batchManifestProblems(manifest, fragments, INTERFACE)).toEqual([]);
    expect(manifest.faction).toBe("CULT");
    expect(manifest.fixedFactionColours).toBe(true);
    expect(
      manifest.assets
        .filter((asset) => asset.assetClass === "PORTRAIT")
        .map((asset) => [
          asset.id,
          asset.subject,
          asset.recipeClass,
          asset.accent,
          asset.ownerColour,
          asset.canvas.width,
          asset.canvas.height,
        ]),
    ).toEqual(
      PORTRAITS.map(([name, role, recipeClass, accent]) => [
        `chibi-direction-portrait-cult-${name}`,
        `PORTRAIT:CULT:${role}`,
        recipeClass,
        accent,
        false,
        48,
        48,
      ]),
    );
    expect(
      manifest.assets
        .filter((asset) => asset.assetClass === "ICON")
        .map((asset) => [asset.id, asset.subject, asset.recipeClass]),
    ).toEqual(
      ICONS.map(([name, subject]) => [
        `chibi-direction-icon-cult-${name}`,
        subject,
        "icon",
      ]),
    );
    expect(manifest.assets).toHaveLength(PORTRAITS.length + ICONS.length);
    // Every icon is 48 x 48 but the Favour candle of the HUD, which is
    // 32 x 32 as the coin and the population icons are.
    for (const asset of manifest.assets)
      expect([asset.canvas.width, asset.canvas.height], asset.id).toEqual(
        asset.subject === "ICON:HUD:CULT:FAVOUR" ? [32, 32] : [48, 48],
      );
    // The six other robed busts are sibling edits of the accepted Initiate
    // bust, as the map sprites are siblings of the Initiate.
    const records = await loadRecords(
      productionLayout(ROOT, INTERFACE),
      INTERFACE,
    );
    const bust = records.assets["chibi-direction-portrait-cult-initiate"];
    expect(bust?.status).toBe("ACCEPTED");
    const chain = (recipe: string): string[] => {
      const source = manifest.recipes.find((entry) => entry.id === recipe)
        ?.source?.recipe;
      return source === undefined ? [recipe] : [recipe, ...chain(source)];
    };
    for (const name of [
      "idol-bearer",
      "hexer",
      "summoner",
      "stargazer",
      "caller",
      "chosen",
    ]) {
      const accepted =
        records.assets[`chibi-direction-portrait-cult-${name}`]?.recipe ?? "";
      expect(chain(accepted), name).toContain(bust?.recipe);
    }
  });

  it("lists the fifteen effects in batch effects-cult, each mapped to cult-green.png", async () => {
    const manifest = await loadBatchManifest(ROOT, EFFECTS);
    const fragments = await loadFragments(ROOT);
    expect(batchManifestProblems(manifest, fragments, EFFECTS)).toEqual([]);
    expect(manifest.faction).toBe("CULT");
    expect(
      manifest.assets.map((asset) => [
        asset.id,
        asset.subject,
        asset.assetClass,
        asset.canvas.width,
        asset.canvas.height,
        asset.palette?.path,
      ]),
    ).toEqual(
      EFFECT_ROWS.map(([name, id, side]) => [
        `chibi-direction-effect-cult-${name}`,
        `EFFECT:${id}`,
        "EFFECT",
        side,
        side,
        CULT_GREEN_PALETTE_PATH,
      ]),
    );
    const records = await loadRecords(productionLayout(ROOT, EFFECTS), EFFECTS);
    const palette = paletteColours(
      await readRaster(path.join(ROOT, CULT_GREEN_PALETTE_PATH)),
    ).map(([r, g, b]) => (r << 16) | (g << 8) | b);
    for (const asset of manifest.assets) {
      const record = records.assets[asset.id];
      expect(record?.status, asset.id).toBe("ACCEPTED");
      if (record === undefined) continue;
      expect(record.derivation.kind, asset.id).toBe("palette-map");
      expect(await verifyAssetRecord(ROOT, manifest, record), asset.id).toEqual(
        [],
      );
      const master = await readRaster(path.join(ROOT, record.master.path));
      for (let index = 0; index < master.width * master.height; index += 1) {
        const alpha = master.data[index * 4 + 3] ?? 0;
        expect(alpha === 0 || alpha === 255, asset.id).toBe(true);
        if (alpha === 0) continue;
        const colour =
          ((master.data[index * 4] ?? 0) << 16) |
          ((master.data[index * 4 + 1] ?? 0) << 8) |
          (master.data[index * 4 + 2] ?? 0);
        if (!palette.includes(colour))
          throw new Error(`${asset.id}: off-palette pixel`);
      }
    }
    for (const recipe of manifest.recipes)
      expect(records.recipes[recipe.id]?.review?.verdict, recipe.id).toMatch(
        /^(ACCEPTED|REJECTED)$/,
      );
  });

  it("writes the effect palette from its list: the faction's green, cream, brass, teal, indigo and grey, and no red", async () => {
    const png = await readFile(path.join(ROOT, CULT_GREEN_PALETTE_PATH));
    expect(png.equals(await cultGreenPalettePng())).toBe(true);
    const colours = paletteColours(
      await readRaster(path.join(ROOT, CULT_GREEN_PALETTE_PATH)),
    ).map(
      ([r, g, b]) =>
        `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`,
    );
    expect([...colours].sort()).toEqual(
      CULT_GREEN_PALETTE.map((entry) => entry.to).sort(),
    );
    // The faction colour and the code palette of CULT.md are in it.
    for (const colour of [
      "#00ff78",
      "#80ffbc",
      "#007336",
      "#f3e7c4",
      "#1f8f95",
    ])
      expect(colours).toContain(colour);
    for (const { to } of CULT_GREEN_PALETTE) {
      const hsv = rgbToHsv(
        Number.parseInt(to.slice(1, 3), 16),
        Number.parseInt(to.slice(3, 5), 16),
        Number.parseInt(to.slice(5, 7), 16),
      );
      expect(isRed(hsv), to).toBe(false);
      expect(isViolet(hsv), to).toBe(false);
    }
  });

  it("adds an accent-effect class that may draw green and teal, and lets the creature class make a portrait", async () => {
    const accent = CHIBI_CLASS_RECIPES["accent-effect"];
    const effect = CHIBI_CLASS_RECIPES.effect;
    expect(accent.factionLayer).toBe(false);
    expect(accent.derivation).toBe("palette-map");
    expect(accent.camera).toBe(effect.camera);
    expect(accent.assetClasses).toEqual(["EFFECT"]);
    expect(accent.options["create-image-pixen"]).toEqual(
      effect.options["create-image-pixen"],
    );
    const fragments = await loadFragments(ROOT);
    expect(fragments.classes["accent-effect"].text).toBe(
      fragments.classes.effect.text,
    );
    const negative = (fragments.classes["accent-effect"].negative ?? "")
      .split(",")
      .map((term) => term.trim());
    for (const term of [
      "bright green",
      "lime",
      "teal",
      "yellow",
      "gold",
      "creature",
    ]) {
      expect(fragments.classes.effect.negative, term).toContain(term);
      expect(negative, term).not.toContain(term);
    }
    for (const term of ["red", "violet", "purple", "ground", "plate"])
      expect(negative, term).toContain(term);
    expect(CHIBI_CLASS_RECIPES.creature.assetClasses).toContain("PORTRAIT");
    // The summoned things' portraits were sent without layer 3.
    const records = await loadRecords(
      productionLayout(ROOT, INTERFACE),
      INTERFACE,
    );
    for (const name of ["familiar", "thing", "horror", "tentacle"]) {
      const accepted = records.assets[`chibi-direction-portrait-cult-${name}`];
      const manifest = await loadBatchManifest(ROOT, INTERFACE);
      const first = manifest.recipes.find(
        (recipe) =>
          recipe.asset === accepted?.id &&
          recipe.endpoint === "create-image-pixen",
      );
      const layers = records.recipes[first?.id ?? ""]?.request.layers.map(
        (layer) => layer.layer,
      );
      expect(layers, name).toContain("light");
      expect(layers, name).not.toContain("faction");
    }
  });

  it("accepted every piece with its accent, re-derivable, and left no recipe unreviewed", async () => {
    const manifest = await loadBatchManifest(ROOT, INTERFACE);
    const records = await loadRecords(
      productionLayout(ROOT, INTERFACE),
      INTERFACE,
    );
    for (const asset of manifest.assets) {
      const record = records.assets[asset.id];
      expect(record?.status, asset.id).toBe("ACCEPTED");
      if (record === undefined) continue;
      expect(record.subject, asset.id).toBe(asset.subject);
      expect(record.mask, asset.id).toBeUndefined();
      expect(record.derivation.kind, asset.id).toBe("as-is");
      expect(record.derivation.accent?.preset, asset.id).toBe(asset.accent);
      expect(await verifyAssetRecord(ROOT, manifest, record), asset.id).toEqual(
        [],
      );
    }
    for (const recipe of manifest.recipes)
      expect(records.recipes[recipe.id]?.review?.verdict, recipe.id).toMatch(
        /^(ACCEPTED|REJECTED)$/,
      );
  });

  it("keeps red for the Furious chip, violet off every piece and the green on the faction's hue", async () => {
    const records = await loadRecords(
      productionLayout(ROOT, INTERFACE),
      INTERFACE,
    );
    for (const record of Object.values(records.assets)) {
      const pixels = hsvPixels(
        await readRaster(path.join(ROOT, record.master.path)),
      );
      expect(pixels.filter(isViolet).length, record.id).toBe(0);
      for (const green of pixels.filter(isGreen)) {
        expect(green.hue, record.id).toBeGreaterThanOrEqual(144);
        expect(green.hue, record.id).toBeLessThanOrEqual(152);
      }
      const red = pixels.filter(isRed).length;
      if (record.subject === "ICON:STATUS:FURIOUS")
        // Red eyes are the cue of an Unbound daemon (CULT.md, Palette).
        expect(red, record.id).toBeGreaterThanOrEqual(40);
      else expect(red, record.id).toBe(0);
    }
    // The robed busts wear the lodge's indigo, never a navy or an azure.
    for (const [name, , recipeClass] of PORTRAITS) {
      if (recipeClass !== "portrait" || name === "caller") continue;
      const record = records.assets[`chibi-direction-portrait-cult-${name}`];
      if (record === undefined) throw new Error(name);
      const cloth = hsvPixels(
        await readRaster(path.join(ROOT, record.master.path)),
      ).filter(
        (p) =>
          p.hue >= 212 &&
          p.hue <= 266 &&
          p.saturation >= 0.45 &&
          p.value >= 0.14,
      );
      expect(cloth.length, name).toBeGreaterThan(name === "herald" ? 40 : 150);
      for (const p of cloth) {
        expect(p.hue, name).toBeGreaterThanOrEqual(230);
        expect(p.hue, name).toBeLessThanOrEqual(250);
      }
    }
  });

  it("registers every accepted piece on its record's canvas, resolvable under its subject", async () => {
    const registry = chibiDirectionArtRegistryV7();
    const accepted = [];
    for (const batch of [INTERFACE, EFFECTS]) {
      const records = await loadRecords(productionLayout(ROOT, batch), batch);
      accepted.push(
        ...Object.values(records.assets).filter(
          (record) => record.status === "ACCEPTED",
        ),
      );
    }
    expect(accepted).toHaveLength(
      PORTRAITS.length + ICONS.length + EFFECT_ROWS.length,
    );
    expect(
      CHIBI_DIRECTION_CULT_INTERFACE_ART_ASSETS_V7.map(
        (asset) => asset.id,
      ).sort(),
    ).toEqual(accepted.map((record) => record.id).sort());
    for (const asset of CHIBI_DIRECTION_CULT_INTERFACE_ART_ASSETS_V7) {
      const record = accepted.find((entry) => entry.id === asset.id);
      if (record === undefined) throw new Error(asset.id);
      expect(asset.subject, asset.id).toBe(record.subject);
      expect([asset.width, asset.height], asset.id).toEqual([
        record.master.width,
        record.master.height,
      ]);
      expect(
        asset.url.endsWith(record.master.path.replace(/^public\//, "")),
        asset.id,
      ).toBe(true);
      expect(asset.fixedColours, asset.id).toBe(
        asset.assetClass === "PORTRAIT" ? true : undefined,
      );
      // One raster per subject: the live look draws exactly this one.
      expect(registry.variants(asset.subject).map((entry) => entry.id)).toEqual(
        [asset.id],
      );
    }
  });

  it("makes the three ship portraits as edits of the shared ship portraits in batch naval-cult", async () => {
    const manifest = await loadBatchManifest(ROOT, NAVAL);
    const records = await loadRecords(productionLayout(ROOT, NAVAL), NAVAL);
    const registry = chibiDirectionArtRegistryV7();
    const registered = [
      ...CHIBI_DIRECTION_CULT_NAVAL_ART_ASSETS_V7,
      ...CHIBI_NAVAL_SUBMARINE_ART_ASSETS_V7.filter(
        (entry) => entry.faction === "CULT",
      ),
    ].filter((entry) => entry.kind === "PORTRAIT");
    expect(registered.map((entry) => entry.asset.id)).toEqual(
      SHIP_PORTRAITS.map((name) => `chibi-naval-cult-portrait-${name}`),
    );
    for (const name of SHIP_PORTRAITS) {
      const id = `chibi-naval-cult-portrait-${name}`;
      const asset = manifest.assets.find((entry) => entry.id === id);
      expect(asset?.assetClass, id).toBe("PORTRAIT");
      expect(asset?.ownerColour, id).toBe(false);
      expect(asset?.accent, id).toBe("cult-lodge-icon");
      const record = records.assets[id];
      expect(record?.status, id).toBe("ACCEPTED");
      if (record === undefined) continue;
      expect(await verifyAssetRecord(ROOT, manifest, record), id).toEqual([]);
      const pixels = hsvPixels(
        await readRaster(path.join(ROOT, record.master.path)),
      );
      expect(pixels.filter(isRed).length, id).toBe(0);
      expect(pixels.filter(isViolet).length, id).toBe(0);
      const entry = registered.find((candidate) => candidate.asset.id === id);
      expect(entry?.asset.subject, id).toBe(record.subject);
      expect(
        registry.variants(record.subject as ArtSubjectV7).map((a) => a.id),
        id,
      ).toEqual([id]);
    }
    const source = (recipe: string) =>
      manifest.recipes.find((entry) => entry.id === recipe)?.source;
    expect(source("cult-portrait-patrol-boat-a")).toEqual({
      batch: "5",
      recipe: "portrait-patrol-boat-a",
      candidate: 0,
    });
    expect(source("cult-portrait-battleship-a")?.batch).toBe("5");
    expect(source("cult-portrait-submarine-a")?.sibling).toBe(true);
  });

  it("shows the Cult's portraits and its three technology icons where the game already asks for them", () => {
    const registry = chibiDirectionArtRegistryV7();
    const own = (subject: ArtSubjectV7): string | undefined =>
      registry.variants(subject)[0]?.id;
    // Every trained unit and ship of the Cult has a portrait of its own.
    expect(own(portraitSubjectV7("FIGHTER", "CULT"))).toBe(
      "chibi-direction-portrait-cult-initiate",
    );
    for (const role of [
      "FIGHTER",
      "GUARD",
      "RAIDER",
      "MARKSMAN",
      "CAPTAIN",
      "CATAPULT",
      "KNIGHT",
      "SWORDSMAN",
      "JUGGERNAUT",
    ] as const)
      expect(own(portraitSubjectV7(role, "CULT")), role).toMatch(
        /^chibi-direction-portrait-cult-/,
      );
    for (const role of ["PATROL_BOAT", "BATTLESHIP", "SUBMARINE"] as const)
      expect(own(portraitSubjectV7(role, "CULT")), role).toMatch(
        /^chibi-naval-cult-portrait-/,
      );
    // The summoned units are no unit roles: their portraits have their own
    // subjects and no Human stand-in.
    for (const role of SUMMONED_ROLE_IDS_V7) {
      const subject = cultSummonedPortraitSubjectV7(role);
      expect(subject).toBe(`PORTRAIT:CULT:${role}`);
      expect(own(subject), role).toMatch(/^chibi-direction-portrait-cult-/);
      expect(chibiFallbackSubjectV7(subject), role).toBeNull();
    }
    // Warding Circles, The Stars Are Right and Harvest Rites.
    expect(technologySubjectV7("FORTIFICATION", "CULT")).toBe(
      "ICON:TECH:CULT:FORTIFICATION",
    );
    expect(technologySubjectV7("EXPLOSIVES", "CULT")).toBe(
      "ICON:TECH:CULT:EXPLOSIVES",
    );
    expect(technologySubjectV7("FARMING", "CULT")).toBe(
      "ICON:TECH:CULT:FARMING",
    );
    expect(own("ICON:TECH:CULT:FORTIFICATION")).toBe(
      "chibi-direction-icon-cult-tech-warding-circles",
    );
    expect(own("ICON:TECH:CULT:EXPLOSIVES")).toBe(
      "chibi-direction-icon-cult-tech-stars-are-right",
    );
    expect(own("ICON:TECH:CULT:FARMING")).toBe(
      "chibi-direction-icon-cult-tech-harvest-rites",
    );
    // In a look without the Cult's art each falls back to what the card
    // showed before: the Fortification icon, Blast Mountain and the Farm.
    expect(chibiFallbackSubjectV7("ICON:TECH:CULT:FORTIFICATION")).toBe(
      "ICON:TECH:FORTIFICATION",
    );
    expect(chibiFallbackSubjectV7("ICON:TECH:CULT:EXPLOSIVES")).toBe(
      "ICON:ACTION:BLAST_MOUNTAIN",
    );
    expect(chibiFallbackSubjectV7("ICON:TECH:CULT:FARMING")).toBe(
      "IMPROVEMENT:FARM",
    );
    // The technologies that unlock a unit show its portrait (Leadership the
    // Summoner's), and every other faction's cards are unchanged.
    expect(technologySubjectV7("ADMINISTRATION", "CULT")).toBe(
      "PORTRAIT:CULT:CAPTAIN",
    );
    expect(technologySubjectV7("FARMING", "CANDY")).toBe("IMPROVEMENT:FARM");
    expect(technologySubjectV7("FARMING", "ORIGINAL")).toBe("IMPROVEMENT:FARM");
  });
});

describe("the Cult's interface accent presets (pulp_wars-mch9.23)", () => {
  const strip = (pixels: readonly (readonly [number, number, number])[]) => {
    const data = new Uint8Array(pixels.length * 4);
    pixels.forEach(([r, g, b], index) => data.set([r, g, b, 255], index * 4));
    return { width: pixels.length, height: 1, data };
  };
  const at = (source: RgbaRaster, index: number): [number, number, number] => [
    source.data[index * 4] ?? 0,
    source.data[index * 4 + 1] ?? 0,
    source.data[index * 4 + 2] ?? 0,
  ];
  // An azure, a navy, a purple shade, a red-brown, a yellow-green flame;
  // then what must stay: teal, wax cream, brass, the summoned eye, outline.
  const SOURCE = strip([
    [0x3a, 0x9c, 0xf0],
    [0x0e, 0x11, 0x76],
    [0x5a, 0x3a, 0x7a],
    [0xc0, 0x39, 0x2b],
    [0xc8, 0xf0, 0x40],
    [0x1f, 0x8f, 0x95],
    [0xf3, 0xe7, 0xc4],
    [0xc9, 0xa2, 0x4a],
    [0xff, 0xe2, 0x7a],
    [0x0a, 0x0a, 0x0a],
  ]);

  it("makes azure and purple the lodge's indigo, red a brass brown and a yellow flame the faction green", () => {
    const result = accentRaster(
      SOURCE,
      ACCENT_PRESETS["cult-lodge-icon"],
    ).raster;
    for (const index of [0, 1, 2]) {
      const { hue } = rgbToHsv(...at(result, index));
      expect(hue, String(index)).toBeGreaterThanOrEqual(230);
      expect(hue, String(index)).toBeLessThanOrEqual(252);
    }
    // The azure and the navy are lifted like the cloth of `cult-lodge`.
    expect(rgbToHsv(...at(result, 1)).value).toBeGreaterThanOrEqual(0.49);
    const brown = rgbToHsv(...at(result, 3));
    expect(Math.round(brown.hue)).toBe(28);
    expect(isRed(brown)).toBe(false);
    const flame = rgbToHsv(...at(result, 4));
    expect(flame.hue).toBeGreaterThanOrEqual(144);
    expect(flame.hue).toBeLessThanOrEqual(152);
    for (let index = 5; index < 10; index += 1)
      expect(at(result, index), String(index)).toEqual(at(SOURCE, index));
  });

  it("makes steel blue and purple the summoned teal, and leaves the tones as drawn", () => {
    const result = accentRaster(
      SOURCE,
      ACCENT_PRESETS["cult-summoned-icon"],
    ).raster;
    for (const index of [0, 1, 2]) {
      const before = rgbToHsv(...at(SOURCE, index));
      const after = rgbToHsv(...at(result, index));
      expect(after.hue, String(index)).toBeGreaterThanOrEqual(180);
      expect(after.hue, String(index)).toBeLessThanOrEqual(192);
      expect(after.value).toBeCloseTo(before.value, 1);
    }
    expect(isRed(rgbToHsv(...at(result, 3)))).toBe(false);
    for (let index = 5; index < 10; index += 1)
      expect(at(result, index), String(index)).toEqual(at(SOURCE, index));
  });

  it("leaves the unit presets as they were: red stays red under cult-green, for the Unbound and the Furious chip", () => {
    for (const name of ["cult-green", "cult-lodge"] as const) {
      const result = accentRaster(SOURCE, ACCENT_PRESETS[name]).raster;
      expect(at(result, 3), name).toEqual(at(SOURCE, 3));
      // Their green band starts at hue 80: a yellow-green is not theirs.
      expect(at(result, 4), name).toEqual(at(SOURCE, 4));
    }
  });
});
