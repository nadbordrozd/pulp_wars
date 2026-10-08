import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import {
  buildChibiArtRegistryV7,
  chibiAnchorV7,
  chibiFallbackSubjectV7,
  cityArtSubjectV7,
  moundArtSubjectV7,
  unitArtRoleV7,
  unitArtSubjectV7,
  navalArtRoleOfSubjectV7,
  navalArtSubjectV7,
  navalSharedSubjectV7,
  type ArtSubjectV7,
  type ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import {
  CHIBI_DIRECTION_ART_ASSETS_V7,
  chibiDirectionArtRegistryV7,
} from "../../src/assets/chibi-direction-art-manifest";
import {
  CHIBI_DIRECTION_DWARF_ART_ASSETS_V7,
  CHIBI_DIRECTION_DWARF_NAVAL_ART_ASSETS_V7,
  DWARF_FLAG_ANCHORS_V7,
} from "../../src/assets/chibi-direction-dwarf-art-manifest";
import { CHIBI_NAVAL_SUBMARINE_ART_ASSETS_V7 } from "../../src/assets/chibi-naval-submarine-art-manifest";
import { CHIBI_NAVAL_FACTION_ART_ASSETS_V7 } from "../../src/assets/chibi-naval-faction-art-manifest";
import {
  commandSubjectV7,
  portraitSubjectV7,
  technologySubjectV7,
} from "../../src/assets/chibi-ui-art-v7";
import { DIRECTION_FLAG_ANCHORS_V7 } from "../../src/render/canvas/visual-direction-v7";
import {
  DWARF_BOMB_TIMELINE_V7,
  DWARF_ERUPTION_TIMELINE_V7,
  DWARF_FLYER_PRESENTATION_V7,
  DWARF_PALETTE_V7,
  dwarfDigInMarkerV7,
} from "../../src/assets/chibi-direction-dwarf-presentation";
import { CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7 } from "../../src/assets/chibi-direction-ice-folk-art-manifest";
import type { CommandV7, FactionIdV7 } from "../../src/engine/index";
import { CHIBI_OVERLAY_FRAME_V7 } from "../../src/render/canvas/board-renderer-v7";
import { RULESET7_PLAYER_COLORS } from "../../src/render/canvas/owner-recolour-v7";
import {
  ACCENT_PRESETS,
  accentRaster,
  isAccentColour,
} from "../../scripts/art/chibi/accent";
import { batchManifestProblems } from "../../scripts/art/chibi/batch-manifest";
import {
  extractOwnerMask,
  rgbToHsv,
  type RgbaRaster,
} from "../../scripts/art/chibi/owner-mask";
import {
  loadBatchManifest,
  loadFragments,
  loadRecords,
  productionLayout,
  readRaster,
  registryEntry,
  verifyAssetRecord,
  type AssetRecord,
  type BatchRecords,
} from "../../scripts/art/chibi/pipeline";
import {
  candidateCell,
  cropRaster,
  paletteColours,
  paletteMapRaster,
  seatedRaster,
} from "../../scripts/art/chibi/raster";
import {
  DWARF_FORGE_PALETTE,
  DWARF_FORGE_PALETTE_PATH,
  dwarfForgePalettePng,
} from "../../scripts/art/dwarf-direction/forge-palette";

const ROOT = process.cwd();
/** A Tend Wounded command (Repair for a Dwarf viewer). */
const TEND = { kind: "TEND_WOUNDED", unitId: 1 } as unknown as CommandV7;
const BATCH = "direction-dwarf";
const NAVAL_BATCH = "naval-dwarf";

/** Role and unit name. */
const UNITS = [
  ["FIGHTER", "hammerer"],
  ["RAIDER", "gyrocopter"],
  ["MARKSMAN", "clockwork-gunner"],
  ["GUARD", "steam-mole"],
  ["CAPTAIN", "engineer"],
  ["CATAPULT", "steam-cannon"],
  ["KNIGHT", "steam-tank"],
  ["JUGGERNAUT", "brass-titan"],
  // The ninth art slot (ruleset 7r55, bead pulp_wars-2yc.34): the
  // Whirligig. The Steam Tank keeps the slot KNIGHT.
  ["SWORDSMAN", "whirligig"],
] as const;
/**
 * The Human role whose canvas a unit takes where it is not its art slot's:
 * the Whirligig is fielded in the breakthrough role (KNIGHT), a LARGE_UNIT
 * like the Steam Tank whose slot it could not take, so it is not the size
 * of the Human Champion (the Human `UNIT:SWORDSMAN`, a STANDARD_UNIT).
 */
const CANVAS_ROLES: Readonly<Partial<Record<string, "KNIGHT">>> = {
  whirligig: "KNIGHT",
};
/** The machines carry the reserve signal-green lamp; the dwarves do not. */
const MACHINES = new Set([
  "whirligig",
  "gyrocopter",
  "clockwork-gunner",
  "steam-mole",
  "steam-cannon",
  "steam-tank",
  "brass-titan",
]);
const ICONS = [
  ["ICON:ACTION:TUNNEL", "action-tunnel"],
  ["ICON:ACTION:BOMB_RUN", "action-bomb-run"],
  ["ICON:ACTION:ASSEMBLE", "action-assemble"],
  ["ICON:ACTION:DWARF:TEND_WOUNDED", "action-repair"],
  ["ICON:ACTION:KNOCKBACK", "action-knockback"],
  ["ICON:ACTION:PLATED", "action-plated"],
  ["ICON:STATUS:CLOCKWORK", "status-clockwork"],
  ["ICON:STATUS:DUG_IN", "status-dug-in"],
  ["ICON:TECH:DWARF:FORTIFICATION", "tech-dig-in"],
  ["ICON:TECH:DWARF:EXPLOSIVES", "tech-blasting-charges"],
] as const;
const EFFECTS = [
  ["EFFECT:ERUPTION", "eruption"],
  ["EFFECT:BOMB_BLAST", "bomb-blast"],
  ["EFFECT:STEAM_PUFF", "steam-puff"],
  ["EFFECT:REPAIR_SPARKS", "repair-sparks"],
] as const;
const SPEC = ACCENT_PRESETS["dwarf-copper"];

const masterFile = (asset: { readonly url: string }): string =>
  path.join(ROOT, "public", asset.url.replace(/^.*?assets\//, "assets/"));

async function candidateOf(
  records: BatchRecords,
  record: AssetRecord,
): Promise<RgbaRaster> {
  const recipe = records.recipes[record.recipe];
  if (recipe?.rawSheet === undefined || recipe.candidateSize === undefined)
    throw new Error(`${record.id}: no raw sheet`);
  return cropRaster(await readRaster(path.join(ROOT, recipe.rawSheet)), {
    ...candidateCell(
      record.candidate,
      recipe.candidateCount ?? 1,
      recipe.candidateSize,
    ),
    ...recipe.candidateSize,
  });
}

function sameBytes(
  left: { width: number; height: number; data: ArrayLike<number> },
  right: { width: number; height: number; data: ArrayLike<number> },
): boolean {
  return (
    left.width === right.width &&
    left.height === right.height &&
    Buffer.from(Uint8Array.from(left.data)).equals(
      Buffer.from(Uint8Array.from(right.data)),
    )
  );
}

function opaqueRows(raster: RgbaRaster): { top: number; bottom: number } {
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < raster.height; y += 1)
    for (let x = 0; x < raster.width; x += 1)
      if ((raster.data[(y * raster.width + x) * 4 + 3] ?? 0) >= 128) {
        if (top < 0) top = y;
        bottom = y;
      }
  return { top, bottom };
}

/** Opaque pixels in the reserve lamp's green band. */
function lampPixels(raster: RgbaRaster): number {
  let count = 0;
  for (let index = 0; index < raster.width * raster.height; index += 1) {
    const o = index * 4;
    if ((raster.data[o + 3] ?? 0) < 128) continue;
    const { hue, saturation, value } = rgbToHsv(
      raster.data[o] ?? 0,
      raster.data[o + 1] ?? 0,
      raster.data[o + 2] ?? 0,
    );
    if (hue >= 95 && hue <= 165 && saturation >= 0.45 && value >= 0.45)
      count += 1;
  }
  return count;
}

const asRegistered = (asset: { readonly subject: string }): ChibiArtAssetV7 =>
  asset as unknown as ChibiArtAssetV7;

const ALL_MASTERS = [
  ...CHIBI_DIRECTION_DWARF_ART_ASSETS_V7,
  ...CHIBI_DIRECTION_DWARF_NAVAL_ART_ASSETS_V7.map((entry) =>
    asRegistered(entry.asset),
  ),
];

describe("Steampunk Dwarf production art (pulp_wars-78i.5)", () => {
  const byId = new Map(
    CHIBI_DIRECTION_DWARF_ART_ASSETS_V7.map((asset) => [asset.id, asset]),
  );

  it("lists the nine units, the two mounds, the portraits, City 1-3, ten icons and four effects", () => {
    const expected: [string, string][] = [
      ...UNITS.map(
        ([role, name]) =>
          [`UNIT:DWARF:${role}`, `chibi-direction-dwarf-${name}`] as [
            string,
            string,
          ],
      ),
      ["UNIT:DWARF:MOUND", "chibi-direction-dwarf-mound"],
      ["UNIT:DWARF:MOUND_RIDER", "chibi-direction-dwarf-mound-rider"],
      ...UNITS.map(
        ([role, name]) =>
          [
            `PORTRAIT:DWARF:${role}`,
            `chibi-direction-portrait-dwarf-${name}`,
          ] as [string, string],
      ),
      ...[1, 2, 3].map(
        (level) =>
          [`CITY:DWARF:${level}`, `chibi-direction-dwarf-city-${level}`] as [
            string,
            string,
          ],
      ),
      ...ICONS.map(
        ([subject, name]) =>
          [subject, `chibi-direction-icon-${name}`] as [string, string],
      ),
      ...EFFECTS.map(
        ([subject, name]) =>
          [subject, `chibi-direction-effect-dwarf-${name}`] as [string, string],
      ),
    ];
    const pairs = (list: readonly (readonly [string, string])[]): string[] =>
      list.map(([subject, id]) => `${subject} ${id}`).sort();
    expect(
      pairs(
        CHIBI_DIRECTION_DWARF_ART_ASSETS_V7.map(
          (asset) => [asset.subject, asset.id] as const,
        ),
      ),
    ).toEqual(pairs(expected));
    const built = buildChibiArtRegistryV7(CHIBI_DIRECTION_DWARF_ART_ASSETS_V7);
    expect(built.problems).toEqual([]);
    for (const [subject, id] of expected)
      expect(
        built.registry
          .variants(subject as ArtSubjectV7)
          .map((asset) => asset.id),
        subject,
      ).toEqual([id]);
    // The naval set: the shared ships' roles and portraits, Dwarf subjects.
    expect(
      CHIBI_DIRECTION_DWARF_NAVAL_ART_ASSETS_V7.map(
        (entry) => `${entry.kind}:${entry.role} ${entry.asset.subject}`,
      ),
    ).toEqual([
      "UNIT:PATROL_BOAT UNIT:DWARF:PATROL_BOAT",
      "UNIT:BATTLESHIP UNIT:DWARF:BATTLESHIP",
      "UNIT:EMBARKED_TRANSPORT UNIT:DWARF:EMBARKED_TRANSPORT",
      "PORTRAIT:PATROL_BOAT PORTRAIT:DWARF:PATROL_BOAT",
      "PORTRAIT:BATTLESHIP PORTRAIT:DWARF:BATTLESHIP",
    ]);
    // They are what the live generic naval wiring (pulp_wars-w5j.3) asks
    // for once DWARF is a faction, and fall back to the shared ships.
    for (const entry of CHIBI_DIRECTION_DWARF_NAVAL_ART_ASSETS_V7) {
      expect(entry.asset.subject).toBe(
        navalArtSubjectV7(
          "DWARF" as unknown as FactionIdV7,
          entry.kind,
          entry.role,
        ),
      );
      expect(navalArtRoleOfSubjectV7(asRegistered(entry.asset).subject)).toBe(
        entry.role,
      );
      expect(navalSharedSubjectV7(asRegistered(entry.asset).subject)).toBe(
        `${entry.kind}:${entry.role}`,
      );
    }
  });

  // Turned round by the Dwarf UI bead (pulp_wars-78i.6, DWARF.md wiring
  // steps 1 to 7), as the Martian and Ice Folk UI beads did: the art is live
  // in the direction registry, and only there. The default (classic)
  // registry holds no Dwarf asset, so the classic look and LEGACY draw the
  // Human stand-in with the cog badge and the code-drawn mound.
  it("is wired into the live direction registry, and only there", () => {
    const ids = new Set(ALL_MASTERS.map((asset) => asset.id));
    for (const asset of [
      ...CHIBI_ART_ASSETS_V7,
      ...CHIBI_DIRECTION_ART_ASSETS_V7,
    ]) {
      expect(ids.has(asset.id), asset.id).toBe(false);
      expect(asset.subject.includes("DWARF"), asset.id).toBe(false);
    }
    const live = chibiDirectionArtRegistryV7();
    for (const asset of CHIBI_DIRECTION_DWARF_ART_ASSETS_V7)
      expect(
        live.variants(asset.subject).map((entry) => entry.id),
        asset.subject,
      ).toEqual([asset.id]);
    // Step 6: the naval set is part of the generic naval list, on the
    // subjects the live naval wiring asks for.
    for (const entry of CHIBI_DIRECTION_DWARF_NAVAL_ART_ASSETS_V7) {
      expect(
        CHIBI_NAVAL_FACTION_ART_ASSETS_V7.some(
          (naval) => naval.asset.id === entry.asset.id,
        ),
        entry.asset.id,
      ).toBe(true);
      expect(
        live.variants(entry.asset.subject).map((asset) => asset.id),
        entry.asset.subject,
      ).toEqual([entry.asset.id]);
    }
    // Step 2: the game resolves the Dwarf subjects.
    // (The ninth unit, `pulp_wars-w49.17`: `role` here is the art slot;
    // the Steam Tank is the heavy role and keeps the slot its art was made
    // for, `UNIT:DWARF:KNIGHT`.)
    for (const [role] of UNITS) {
      const fielded = unitArtRoleV7(role, "DWARF");
      expect(
        unitArtSubjectV7({ role: fielded, form: "LAND", faction: "DWARF" }),
      ).toBe(`UNIT:DWARF:${role}`);
      expect(portraitSubjectV7(fielded, "DWARF")).toBe(
        `PORTRAIT:DWARF:${role}`,
      );
    }
    expect(
      unitArtSubjectV7({ role: "FIGHTER", form: "EMBARKED", faction: "DWARF" }),
    ).toBe("UNIT:DWARF:EMBARKED_TRANSPORT");
    expect(
      unitArtSubjectV7({ role: "BATTLESHIP", form: "NAVAL", faction: "DWARF" }),
    ).toBe("UNIT:DWARF:BATTLESHIP");
    expect(moundArtSubjectV7(false)).toBe("UNIT:DWARF:MOUND");
    expect(moundArtSubjectV7(true)).toBe("UNIT:DWARF:MOUND_RIDER");
    for (const level of [1, 2, 3] as const)
      expect(cityArtSubjectV7({ artLevel: level, faction: "DWARF" })).toBe(
        `CITY:DWARF:${level}`,
      );
    expect(technologySubjectV7("FORTIFICATION", "DWARF")).toBe(
      "ICON:TECH:DWARF:FORTIFICATION",
    );
    expect(technologySubjectV7("EXPLOSIVES", "DWARF")).toBe(
      "ICON:TECH:DWARF:EXPLOSIVES",
    );
    // (The root's card is the Workshop since the Industry reshuffle, 7r56.)
    expect(technologySubjectV7("DRILL", "DWARF")).toBe(
      "IMPROVEMENT:DWARF:WORKSHOP",
    );
    expect(commandSubjectV7(TEND, "DWARF")).toBe(
      "ICON:ACTION:DWARF:TEND_WOUNDED",
    );
    expect(commandSubjectV7(TEND, "ORIGINAL")).toBe("ICON:ACTION:TEND_WOUNDED");
    for (const kind of ["TUNNEL", "BOMB_RUN", "ASSEMBLE"] as const)
      expect(live.variants(`ICON:ACTION:${kind}`)).toHaveLength(1);
    // Fallbacks: the Human art (with the cog badge), the Human
    // Fortification and Explosives art; the mounds have none (code-drawn).
    expect(chibiFallbackSubjectV7("UNIT:DWARF:GUARD")).toBe("UNIT:GUARD");
    expect(chibiFallbackSubjectV7("PORTRAIT:DWARF:CAPTAIN")).toBe(
      "PORTRAIT:CAPTAIN",
    );
    expect(chibiFallbackSubjectV7("CITY:DWARF:2")).toBe("CITY:2");
    expect(chibiFallbackSubjectV7("ICON:ACTION:DWARF:TEND_WOUNDED")).toBe(
      "ICON:ACTION:TEND_WOUNDED",
    );
    expect(chibiFallbackSubjectV7("ICON:TECH:DWARF:FORTIFICATION")).toBe(
      "ICON:TECH:FORTIFICATION",
    );
    expect(chibiFallbackSubjectV7("ICON:TECH:DWARF:EXPLOSIVES")).toBe(
      "ICON:ACTION:BLAST_MOUNTAIN",
    );
    expect(chibiFallbackSubjectV7("UNIT:DWARF:MOUND")).toBeNull();
    expect(chibiFallbackSubjectV7("UNIT:DWARF:MOUND_RIDER")).toBeNull();
    expect(chibiFallbackSubjectV7("UNIT:DWARF:PATROL_BOAT")).toBe(
      "UNIT:PATROL_BOAT",
    );
    // Step 3: the anchors are part of the live pennant table.
    for (const [id, anchor] of Object.entries(DWARF_FLAG_ANCHORS_V7))
      expect(DIRECTION_FLAG_ANCHORS_V7[id], id).toEqual(anchor);
    // It does not import the other factions' naval manifest (that one
    // imports it).
  });

  it("keeps the Dwarf manifest free of the naval manifest import", async () => {
    const own = await readFile(
      path.join(ROOT, "src/assets/chibi-direction-dwarf-art-manifest.ts"),
      "utf8",
    );
    expect(own.includes('from "./chibi-naval-faction-art-manifest"')).toBe(
      false,
    );
  });

  it("matches the accepted records of both batches: no mask, no owner area", async () => {
    for (const [batch, entries] of [
      [BATCH, CHIBI_DIRECTION_DWARF_ART_ASSETS_V7],
      // The naval batch also holds the Dwarf Submarine and its portrait
      // (bead pulp_wars-5ti.6), listed with every faction's Submarine in
      // chibi-naval-submarine-art-manifest.ts.
      [
        NAVAL_BATCH,
        [
          ...CHIBI_DIRECTION_DWARF_NAVAL_ART_ASSETS_V7,
          ...CHIBI_NAVAL_SUBMARINE_ART_ASSETS_V7.filter(
            (entry) => entry.faction === "DWARF",
          ),
        ].map((entry) => asRegistered(entry.asset)),
      ],
    ] as const) {
      const manifest = await loadBatchManifest(ROOT, batch);
      const records = await loadRecords(productionLayout(ROOT, batch), batch);
      const accepted = Object.values(records.assets);
      expect(accepted.every((record) => record.status === "ACCEPTED")).toBe(
        true,
      );
      expect(accepted.map((record) => record.id).sort(), batch).toEqual(
        entries.map((asset) => asset.id).sort(),
      );
      expect(manifest.assets.map((asset) => asset.id).sort(), batch).toEqual(
        entries.map((asset) => asset.id).sort(),
      );
      expect(manifest.fixedFactionColours, batch).toBe(true);
      expect(manifest.faction, batch).toBe("DWARF");
      expect(manifest.bead, batch).toBe("pulp_wars-78i.5");
      for (const entry of entries) {
        const record = records.assets[entry.id];
        const asset = manifest.assets.find((spec) => spec.id === entry.id);
        if (asset === undefined || record === undefined)
          throw new Error(`${entry.id}: not in the batch`);
        expect(asset.subject, entry.id).toBe(entry.subject);
        expect(record.mask, entry.id).toBeUndefined();
        expect(entry.ownerMaskUrl, entry.id).toBeUndefined();
        expect(
          entry.url.endsWith(record.master.path.replace(/^public\//, "")),
          entry.id,
        ).toBe(true);
        expect([entry.width, entry.height], entry.id).toEqual([
          asset.canvas.width,
          asset.canvas.height,
        ]);
        expect(chibiAnchorV7(entry), entry.id).toEqual(record.anchor);
        const owned = /^(UNIT|CITY|PORTRAIT):/.test(entry.subject);
        expect(entry.fixedColours, entry.id).toBe(owned ? true : undefined);
        if (owned) expect(asset.ownerColour, entry.id).toBe(false);
        const line = registryEntry(asset, record);
        expect(line.includes("fixedColours: true"), entry.id).toBe(owned);
        expect(line).not.toContain("ownerMaskUrl");
        await expect(
          readFile(masterFile(entry).replace(/\.png$/, ".mask.png")),
        ).rejects.toThrow();
        const master = await readRaster(masterFile(entry));
        expect([master.width, master.height], entry.id).toEqual([
          entry.width,
          entry.height,
        ]);
        expect(
          await verifyAssetRecord(ROOT, manifest, record),
          entry.id,
        ).toEqual([]);
      }
    }
  });

  it("carries no player colour and no key-colour pixel for a mask to find", async () => {
    const players = Object.values(RULESET7_PLAYER_COLORS).map((hex) => [
      Number.parseInt(hex.slice(1, 3), 16),
      Number.parseInt(hex.slice(3, 5), 16),
      Number.parseInt(hex.slice(5, 7), 16),
    ]);
    for (const asset of ALL_MASTERS) {
      const master = await readRaster(masterFile(asset));
      let nearPlayer = 0;
      for (let index = 0; index < master.width * master.height; index += 1) {
        const o = index * 4;
        if ((master.data[o + 3] ?? 0) < 128) continue;
        const rgb = [master.data[o], master.data[o + 1], master.data[o + 2]];
        if (
          players.some(
            (colour) =>
              Math.hypot(
                (rgb[0] ?? 0) - (colour[0] ?? 0),
                (rgb[1] ?? 0) - (colour[1] ?? 0),
                (rgb[2] ?? 0) - (colour[2] ?? 0),
              ) < 12,
          )
        )
          nearPlayer += 1;
      }
      expect(nearPlayer, `${asset.id}: player-colour pixels`).toBe(0);
      const key = extractOwnerMask(master).mask.bits.reduce(
        (sum, bit) => sum + bit,
        0,
      );
      expect(key, `${asset.id}: key-colour pixels`).toBe(0);
    }
  });

  it("follows the scale contract of the mechanical roles", () => {
    const human = buildChibiArtRegistryV7(
      CHIBI_DIRECTION_ART_ASSETS_V7,
    ).registry;
    for (const [role, name] of UNITS) {
      const mine = byId.get(`chibi-direction-dwarf-${name}`);
      const theirs = human.variants(`UNIT:${CANVAS_ROLES[name] ?? role}`)[0];
      if (mine === undefined || theirs === undefined)
        throw new Error(`${role}: missing`);
      expect([mine.width, mine.height, mine.assetClass], role).toEqual([
        theirs.width,
        theirs.height,
        theirs.assetClass,
      ]);
      expect(chibiAnchorV7(mine), role).toEqual(chibiAnchorV7(theirs));
      const portrait = byId.get(`chibi-direction-portrait-dwarf-${name}`);
      expect([portrait?.width, portrait?.height], role).toEqual([48, 48]);
    }
    for (const name of ["mound", "mound-rider"]) {
      const mound = byId.get(`chibi-direction-dwarf-${name}`);
      expect([mound?.width, mound?.height, mound?.assetClass], name).toEqual([
        56,
        48,
        "STANDARD_UNIT",
      ]);
    }
    for (const [, name] of ICONS) {
      const icon = byId.get(`chibi-direction-icon-${name}`);
      expect([icon?.width, icon?.height, icon?.assetClass], name).toEqual([
        48,
        48,
        "ICON",
      ]);
    }
    for (const level of [1, 2, 3]) {
      const mine = byId.get(`chibi-direction-dwarf-city-${level}`);
      const ice = CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7.find(
        (asset) => asset.subject === `CITY:ICE_FOLK:${level}`,
      );
      if (mine === undefined || ice === undefined)
        throw new Error(`city ${level}: missing`);
      expect([mine.width, mine.height], `city ${level}`).toEqual([
        ice.width,
        ice.height,
      ]);
    }
  });

  it("records a pennant anchor on each city's own iron pole", async () => {
    expect(Object.keys(DWARF_FLAG_ANCHORS_V7)).toHaveLength(3);
    for (const level of [1, 2, 3]) {
      const id = `chibi-direction-dwarf-city-${level}`;
      const asset = byId.get(id);
      const anchor = DWARF_FLAG_ANCHORS_V7[id];
      if (asset === undefined || anchor === undefined)
        throw new Error(`${id}: missing`);
      expect(anchor.pole, id).toBe(0);
      const master = await readRaster(masterFile(asset));
      const x = Math.floor(anchor.x);
      const alpha = (y: number): number =>
        master.data[(y * master.width + x) * 4 + 3] ?? 0;
      expect(alpha(anchor.y), id).toBeGreaterThanOrEqual(128);
      expect(alpha(anchor.y - 1), id).toBeLessThan(128);
      // A thin pole: at least 12 opaque rows under the anchor.
      for (let y = anchor.y; y < anchor.y + 12; y += 1)
        expect(alpha(y), `${id} row ${y}`).toBeGreaterThanOrEqual(128);
      expect(anchor.x, id).toBeLessThan(asset.width);
    }
  });

  it("puts the signal-green lamp on every machine and on no dwarf", async () => {
    for (const [, name] of UNITS) {
      const master = await readRaster(
        masterFile(byId.get(`chibi-direction-dwarf-${name}`) ?? { url: "" }),
      );
      const lamp = lampPixels(master);
      if (MACHINES.has(name)) expect(lamp, name).toBeGreaterThanOrEqual(4);
      else expect(lamp, name).toBe(0);
    }
  });

  it("lifts the Gyrocopter off the ground as the presentation says", async () => {
    const master = await readRaster(
      masterFile(byId.get("chibi-direction-dwarf-gyrocopter") ?? { url: "" }),
    );
    const flyer =
      DWARF_FLYER_PRESENTATION_V7["chibi-direction-dwarf-gyrocopter"];
    expect(opaqueRows(master).bottom).toBe(flyer.hullBottom);
    expect(flyer.groundLine - flyer.hullBottom).toBeGreaterThanOrEqual(10);
  });
});

describe("the Dwarf copper step (pulp_wars-78i.5)", () => {
  it("re-derives every unit, portrait, icon, city and ship from its recorded candidate, byte for byte", async () => {
    for (const batch of [BATCH, NAVAL_BATCH]) {
      const manifest = await loadBatchManifest(ROOT, batch);
      const records = await loadRecords(productionLayout(ROOT, batch), batch);
      for (const record of Object.values(records.assets)) {
        if (record.subject.startsWith("EFFECT:")) continue;
        const asset = manifest.assets.find((spec) => spec.id === record.id);
        if (asset === undefined) throw new Error(`${record.id}: no asset`);
        expect(asset.accent, record.id).toBe("dwarf-copper");
        expect(record.derivation.accent?.spec, record.id).toEqual(SPEC);
        const candidate = await candidateOf(records, record);
        const base =
          record.derivation.kind === "seated"
            ? seatedRaster(
                candidate,
                asset.canvas,
                record.derivation.seat?.bottomMargin ?? 3,
              )
            : candidate;
        const derived = accentRaster(base, SPEC);
        const master = await readRaster(path.join(ROOT, record.master.path));
        expect(sameBytes(derived.raster, master), record.id).toBe(true);
        // Only the deep red-copper shades change, and they land on copper.
        for (let index = 0; index < base.width * base.height; index += 1) {
          const o = index * 4;
          const before = [base.data[o], base.data[o + 1], base.data[o + 2]].map(
            (value) => value ?? 0,
          ) as [number, number, number];
          if ((base.data[o + 3] ?? 0) < 128 || !isAccentColour(SPEC, ...before))
            continue;
          const hue = rgbToHsv(
            master.data[o] ?? 0,
            master.data[o + 1] ?? 0,
            master.data[o + 2] ?? 0,
          ).hue;
          expect(hue, record.id).toBeGreaterThanOrEqual(6.5);
          expect(hue, record.id).toBeLessThanOrEqual(15);
        }
      }
    }
  });

  it("wraps its band round 0 and leaves lit copper, beards, iron, steam and the lamp alone", () => {
    const pixels = [
      [0x8e, 0x20, 0x11], // deep copper shade, hue 7
      [0x70, 0x14, 0x14], // a red-copper shade in the key band, hue 0
      [0x73, 0x12, 0x1e], // hue 352, across 0
      [0xdc, 0x6d, 0x2e], // lit copper, hue 22
      [0xbe, 0x58, 0x26], // ginger beard, hue 20
      [0x37, 0x38, 0x3b], // soot iron
      [0xf0, 0xf1, 0xee], // steam
      [0x4a, 0xc1, 0x4a], // the lamp
    ];
    const width = pixels.length;
    const data = new Uint8Array(width * 4);
    pixels.forEach((rgb, x) => data.set([...rgb, 255], x * 4));
    const { raster, accentPixels } = accentRaster(
      { width, height: 1, data },
      SPEC,
    );
    expect(accentPixels).toBe(3);
    for (const x of [0, 1, 2]) {
      const hsv = rgbToHsv(
        raster.data[x * 4] ?? 0,
        raster.data[x * 4 + 1] ?? 0,
        raster.data[x * 4 + 2] ?? 0,
      );
      expect(hsv.hue, `pixel ${x}`).toBeGreaterThanOrEqual(6.5);
      expect(hsv.hue, `pixel ${x}`).toBeLessThanOrEqual(15);
      expect(
        extractOwnerMask({
          width: 1,
          height: 1,
          data: raster.data.slice(x * 4, x * 4 + 4),
        }).mask.bits[0],
        `pixel ${x} leaves the key band`,
      ).toBe(0);
    }
    for (let x = 3; x < width; x += 1)
      expect([...raster.data.slice(x * 4, x * 4 + 3)]).toEqual(pixels[x]);
  });
});

describe("the Dwarf effects, presentation and pipeline pieces (pulp_wars-78i.5)", () => {
  it("has a checked-in forge palette, and every effect pixel is one of its colours", async () => {
    const png = await readFile(path.join(ROOT, DWARF_FORGE_PALETTE_PATH));
    expect(png.equals(await dwarfForgePalettePng())).toBe(true);
    const palette = paletteColours(await readRaster(png));
    const hex = (rgb: readonly number[]): string =>
      `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
    expect(palette.map(hex)).toEqual(
      DWARF_FORGE_PALETTE.map((entry) => entry.to),
    );
    const allowed = new Set(palette.map(hex));
    const manifest = await loadBatchManifest(ROOT, BATCH);
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    for (const [, name] of EFFECTS) {
      const id = `chibi-direction-effect-dwarf-${name}`;
      const record = records.assets[id];
      const asset = manifest.assets.find((spec) => spec.id === id);
      if (record === undefined || asset === undefined)
        throw new Error(`${id}: missing`);
      expect(asset.palette?.path, id).toBe(DWARF_FORGE_PALETTE_PATH);
      const master = await readRaster(path.join(ROOT, record.master.path));
      expect(
        sameBytes(
          master,
          paletteMapRaster(await candidateOf(records, record), palette),
        ),
        id,
      ).toBe(true);
      for (let index = 0; index < master.width * master.height; index += 1) {
        const o = index * 4;
        if ((master.data[o + 3] ?? 0) === 0) continue;
        expect(master.data[o + 3], id).toBe(255);
        expect(allowed.has(hex([...master.data.slice(o, o + 3)])), id).toBe(
          true,
        );
      }
    }
  });

  it("keeps both manifests valid, with the faction's fragment and subjects", async () => {
    const fragments = await loadFragments(ROOT);
    for (const batch of [BATCH, NAVAL_BATCH]) {
      const manifest = await loadBatchManifest(ROOT, batch);
      expect(batchManifestProblems(manifest, fragments, batch)).toEqual([]);
    }
    const fragment = fragments.factions.DWARF?.text ?? "";
    expect(fragment).toContain("#c27c3a");
    // The fragment names no figure: "dwarves" in layer 3 put a dwarf in
    // every icon (DWARF.md, "How it was made").
    expect(fragment.toLowerCase()).not.toContain("dwar");
    expect(fragment.toLowerCase()).not.toContain("goggles");
  });

  it("keeps the naval sprites on the shared ships' canvases, anchors and waterline", async () => {
    const shared: Record<string, string> = {
      "UNIT:PATROL_BOAT": "chibi-patrol-boat",
      "UNIT:BATTLESHIP": "chibi-battleship",
      "UNIT:EMBARKED_TRANSPORT": "chibi-embarked-transport",
      "PORTRAIT:PATROL_BOAT": "chibi-portrait-patrol-boat",
      "PORTRAIT:BATTLESHIP": "chibi-portrait-battleship",
    };
    for (const entry of CHIBI_DIRECTION_DWARF_NAVAL_ART_ASSETS_V7) {
      const id = shared[`${entry.kind}:${entry.role}`];
      const ship = CHIBI_ART_ASSETS_V7.find((asset) => asset.id === id);
      if (ship === undefined) throw new Error(`${id} is gone`);
      const asset = asRegistered(entry.asset);
      expect([asset.width, asset.height, asset.assetClass], asset.id).toEqual([
        ship.width,
        ship.height,
        ship.assetClass,
      ]);
      expect(chibiAnchorV7(asset), asset.id).toEqual(chibiAnchorV7(ship));
      if (entry.kind !== "UNIT") continue;
      const bottom = opaqueRows(await readRaster(masterFile(asset))).bottom;
      const sharedBottom = opaqueRows(
        await readRaster(masterFile(ship)),
      ).bottom;
      expect(Math.abs(bottom - sharedBottom), asset.id).toBeLessThanOrEqual(4);
    }
  });

  // As the naval test holds the six fleets. The Gyrocopter's rotor and the
  // Steam Cannon's steam reach into the strip, as tall land units may
  // (DWARF.md, "Weak spots"); the ships and the mounds must stay clear.
  it("keeps the ships and the mounds clear of the HP bar and seat badge strips (giants exempt)", async () => {
    const css = 80 / 128;
    const { hpBar, seatBadge } = CHIBI_OVERLAY_FRAME_V7;
    const frames = [
      [hpBar.left, hpBar.top, hpBar.width, hpBar.height],
      [seatBadge.left, seatBadge.top, seatBadge.size, seatBadge.size],
    ].map(([left = 0, top = 0, width = 0, height = 0]) => ({
      left: left * css - 1,
      top: top * css - 1,
      right: (left + width) * css + 1,
      bottom: (top + height) * css + 1,
    }));
    const covered: string[] = [];
    for (const asset of ALL_MASTERS) {
      if (
        !(
          asset.id.startsWith("chibi-naval-") || asset.subject.includes("MOUND")
        ) ||
        asset.assetClass === "GIANT_UNIT"
      )
        continue;
      const master = await readRaster(masterFile(asset));
      const anchor = chibiAnchorV7(asset);
      let count = 0;
      for (let py = 0; py < master.height; py += 1)
        for (let px = 0; px < master.width; px += 1) {
          if ((master.data[(py * master.width + px) * 4 + 3] ?? 0) < 128)
            continue;
          const x = px - anchor.x;
          const y = py - anchor.y;
          if (
            frames.some(
              (frame) =>
                x + 1 > frame.left &&
                x < frame.right &&
                y + 1 > frame.top &&
                y < frame.bottom,
            )
          )
            count += 1;
        }
      if (count > 0) covered.push(`${asset.id}: ${count}`);
    }
    expect(covered).toEqual([]);
  });

  it("draws the Dig In earthwork deterministically: a sandbag wall in front, earth heaps behind, never a ring", () => {
    for (const width of [36, 44, 56]) {
      const first = dwarfDigInMarkerV7(width);
      const second = dwarfDigInMarkerV7(width);
      expect(sameBytes(first.front, second.front)).toBe(true);
      expect(sameBytes(first.back, second.back)).toBe(true);
      expect([first.front.width, first.front.height]).toEqual([
        width,
        first.height,
      ]);
      const opaqueAt = (
        raster: { width: number; data: Uint8ClampedArray },
        x: number,
        y: number,
      ): boolean => (raster.data[(y * raster.width + x) * 4 + 3] ?? 0) > 0;
      const opaque = (raster: { data: Uint8ClampedArray }): number =>
        raster.data.filter(
          (_, index) => index % 4 === 3 && raster.data[index] === 255,
        ).length;
      expect(opaque(first.front)).toBeGreaterThan(width * 4);
      expect(opaque(first.back)).toBeGreaterThan(20);
      // The wall is in front: its lowest row is the raster's.
      const rows = opaqueRows(first.front as unknown as RgbaRaster);
      expect(rows.bottom).toBe(first.height - 1);
      // Bead pulp_wars-78i.9: not a ring beside the ready ring. Nothing is
      // drawn behind the middle of the unit, and down the middle the wall
      // is one solid run of rows (no far arc above it).
      for (let x = Math.ceil(width * 0.3); x < Math.floor(width * 0.7); x += 1)
        for (let y = 0; y < first.height; y += 1)
          expect(opaqueAt(first.back, x, y)).toBe(false);
      const middle = Math.floor(width / 2);
      const column = Array.from({ length: first.height }, (_, y) =>
        opaqueAt(first.front, middle, y),
      );
      const firstRow = column.indexOf(true);
      expect(firstRow).toBeGreaterThanOrEqual(0);
      // (The seams between the bags may notch its bottom two rows.)
      expect(column.slice(firstRow, first.height - 2).every(Boolean)).toBe(
        true,
      );
      // No pixel overlaps between the two layers.
      for (let index = 3; index < first.front.data.length; index += 4)
        expect(
          (first.front.data[index] ?? 0) > 0 &&
            (first.back.data[index] ?? 0) > 0,
        ).toBe(false);
    }
  });

  it("orders the eruption and bomb timelines", () => {
    const t = DWARF_ERUPTION_TIMELINE_V7;
    expect(t.shake.to).toBeLessThanOrEqual(t.surface);
    expect(t.burst.from).toBe(t.surface);
    expect(t.ring.from).toBeGreaterThan(t.burst.from);
    expect(t.hit).toBeGreaterThan(t.surface);
    expect(t.peak).toBeGreaterThan(t.ring.from);
    expect(t.peak).toBeLessThan(t.burst.to);
    expect(t.end).toBeGreaterThanOrEqual(
      Math.max(
        t.burst.to,
        t.ring.from + 7 * t.ring.stagger + t.ring.duration,
        t.dust.to,
      ),
    );
    const b = DWARF_BOMB_TIMELINE_V7;
    expect(b.flight.to).toBeLessThanOrEqual(b.fall.from);
    expect(b.fall.to).toBeLessThanOrEqual(b.blast.from);
    expect(b.end).toBeGreaterThanOrEqual(b.blast.to);
    for (const value of Object.values(DWARF_PALETTE_V7))
      expect(value).toMatch(/^#[0-9a-f]{6}$/);
  });
});
