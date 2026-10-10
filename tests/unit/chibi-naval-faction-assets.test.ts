import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import {
  buildChibiArtRegistryV7,
  chibiAnchorV7,
  unitArtSubjectV7,
  type ArtSubjectV7,
  type ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import { portraitSubjectV7 } from "../../src/assets/chibi-ui-art-v7";
import {
  CHIBI_DIRECTION_ART_ASSETS_V7,
  chibiDirectionArtRegistryV7,
} from "../../src/assets/chibi-direction-art-manifest";
import {
  CHIBI_NAVAL_FACTION_ART_ASSETS_V7,
  navalFactionArtSubjectV7,
  type NavalArtRoleV7,
  type NavalPortraitRoleV7,
} from "../../src/assets/chibi-naval-faction-art-manifest";
import type { FactionIdV7 } from "../../src/engine/index";
import { CHIBI_OVERLAY_FRAME_V7 } from "../../src/render/canvas/board-renderer-v7";
import { RULESET7_PLAYER_COLORS } from "../../src/render/canvas/owner-recolour-v7";
import {
  extractOwnerMask,
  type RgbaRaster,
} from "../../scripts/art/chibi/owner-mask";
import { batchManifestProblems } from "../../scripts/art/chibi/batch-manifest";
import {
  loadBatchManifest,
  loadFragments,
  loadRecords,
  productionLayout,
  readRaster,
  registryEntry,
  verifyAssetRecord,
} from "../../scripts/art/chibi/pipeline";

const ROOT = process.cwd();

/** Faction, batch slug, and the accent preset its batch pins (or none). */
const FACTIONS: readonly (readonly [FactionIdV7, string, string | null])[] = [
  ["ORIGINAL", "human", null],
  ["UNDEAD", "undead", "undead-violet"],
  // Redrawn by the Goblin redesign (bead pulp_wars-wrn.2): fresh creations
  // with the hazard paint pinned to the faction colour.
  ["GOBLIN", "goblin", "goblin-hazard"],
  ["DINOSAUR", "dinosaur", null],
  ["MARTIAN", "martian", "martian-magenta"],
  ["ICE_FOLK", "ice-folk", "ice-folk-blue"],
];
/** Each naval raster: kind, role, asset-id suffix, today's shared asset. */
const SPRITES: readonly (readonly [
  "UNIT" | "PORTRAIT",
  NavalArtRoleV7,
  string,
  string,
])[] = [
  ["UNIT", "PATROL_BOAT", "patrol-boat", "chibi-patrol-boat"],
  ["UNIT", "BATTLESHIP", "battleship", "chibi-battleship"],
  ["UNIT", "EMBARKED_TRANSPORT", "transport", "chibi-embarked-transport"],
  [
    "PORTRAIT",
    "PATROL_BOAT",
    "portrait-patrol-boat",
    "chibi-portrait-patrol-boat",
  ],
  [
    "PORTRAIT",
    "BATTLESHIP",
    "portrait-battleship",
    "chibi-portrait-battleship",
  ],
  // The Submarine of the naval branch (bead pulp_wars-5ti.6): every
  // seafaring faction's, so not the Ice Folk's (they lose their ships).
  ["UNIT", "SUBMARINE", "submarine", "chibi-submarine"],
  ["PORTRAIT", "SUBMARINE", "portrait-submarine", "chibi-portrait-submarine"],
];
/** The Ice Folk have no Submarine raster (RULESET_7_NAVAL_BRANCH.md, 14.3). */
/**
 * The Cult has its four map sprites (bead pulp_wars-mch9.15); its three
 * ship portraits are bead pulp_wars-mch9.16's.
 */
const hasSprite = (
  faction: FactionIdV7,
  role: NavalArtRoleV7,
  kind: "UNIT" | "PORTRAIT" = "UNIT",
): boolean =>
  !(faction === "ICE_FOLK" && role === "SUBMARINE") &&
  !(faction === "CULT" && kind === "PORTRAIT");

const masterFile = (asset: { readonly url: string }): string =>
  path.join(ROOT, "public", asset.url.replace(/^.*?assets\//, "assets/"));

function opaqueBottom(raster: RgbaRaster): number {
  for (let y = raster.height - 1; y >= 0; y -= 1)
    for (let x = 0; x < raster.width; x += 1)
      if ((raster.data[(y * raster.width + x) * 4 + 3] ?? 0) >= 128) return y;
  return -1;
}

/** The registry form of a naval entry or of a pipeline record's entry. */
const asRegistered = (asset: { readonly subject: string }): ChibiArtAssetV7 =>
  asset as unknown as ChibiArtAssetV7;

describe("faction-styled naval art (pulp_wars-w5j.2)", () => {
  // The Dwarf UI bead (pulp_wars-78i.6) appended the seventh faction's set
  // (batch `naval-dwarf` of bead pulp_wars-78i.5, checked by the Dwarf art
  // test), so the list has 35 rasters.
  it("lists every naval sprite and portrait of the nine fleets, once", () => {
    const expected = [
      ...FACTIONS.map(([faction, slug]) => [faction, slug] as const),
      ["DWARF", "dwarf"] as const,
      // The Candy engine bead (pulp_wars-jdb.3) appended the eighth set
      // (batch `naval-candy` of bead pulp_wars-jdb.5): 40 rasters.
      ["CANDY", "candy"] as const,
      // The Cult's map sprites (batch `naval-cult` of bead
      // pulp_wars-mch9.15, checked by the Cult art test): 4 more.
      ["CULT", "cult"] as const,
    ]
      .flatMap(([faction, slug]) =>
        SPRITES.filter(([kind, role]) => hasSprite(faction, role, kind)).map(
          ([kind, role, suffix]) =>
            `${faction} ${kind} ${role} chibi-naval-${slug}-${suffix} ${navalFactionArtSubjectV7(faction, kind, role)}`,
        ),
      )
      .sort();
    expect(
      CHIBI_NAVAL_FACTION_ART_ASSETS_V7.map(
        (entry) =>
          `${entry.faction} ${entry.kind} ${entry.role} ${entry.asset.id} ${entry.asset.subject}`,
      ).sort(),
    ).toEqual(expected);
    // 40 rasters of the eight fleets, and the Submarine and its portrait of
    // the seven seafaring factions (bead pulp_wars-5ti.6).
    expect(expected).toHaveLength(58);
    // The Humans keep the shared subjects; the others get their own.
    expect(navalFactionArtSubjectV7("ORIGINAL", "UNIT", "PATROL_BOAT")).toBe(
      "UNIT:PATROL_BOAT",
    );
    expect(
      navalFactionArtSubjectV7("ICE_FOLK", "UNIT", "EMBARKED_TRANSPORT"),
    ).toBe("UNIT:ICE_FOLK:EMBARKED_TRANSPORT");
    for (const entry of CHIBI_NAVAL_FACTION_ART_ASSETS_V7) {
      expect(entry.asset.fixedColours, entry.asset.id).toBe(true);
      expect(entry.asset.ownerMaskUrl, entry.asset.id).toBeUndefined();
    }
    const built = buildChibiArtRegistryV7(
      CHIBI_NAVAL_FACTION_ART_ASSETS_V7.map((entry) =>
        asRegistered(entry.asset),
      ),
    );
    expect(built.problems).toEqual([]);
  });

  it("is wired in (pulp_wars-w5j.3): the live registry holds every entry on the subject the game asks for, the classic registry none", async () => {
    const ids = new Set(
      CHIBI_NAVAL_FACTION_ART_ASSETS_V7.map((entry) => entry.asset.id),
    );
    // The classic look and LEGACY never see the naval art, and it is a list
    // of its own, not part of the Human direction list.
    for (const asset of [
      ...CHIBI_ART_ASSETS_V7,
      ...CHIBI_DIRECTION_ART_ASSETS_V7,
    ])
      expect(ids.has(asset.id), asset.id).toBe(false);
    // The live (direction) registry resolves each faction's own raster, on
    // the subject unitArtSubjectV7 and portraitSubjectV7 return for it.
    const live = chibiDirectionArtRegistryV7();
    for (const entry of CHIBI_NAVAL_FACTION_ART_ASSETS_V7) {
      const subject =
        entry.kind === "PORTRAIT"
          ? portraitSubjectV7(entry.role as NavalPortraitRoleV7, entry.faction)
          : entry.role === "EMBARKED_TRANSPORT"
            ? unitArtSubjectV7({
                role: "FIGHTER",
                form: "EMBARKED",
                faction: entry.faction,
              })
            : unitArtSubjectV7({
                role: entry.role as NavalPortraitRoleV7,
                form: "NAVAL",
                faction: entry.faction,
              });
      expect(subject, entry.asset.id).toBe(entry.asset.subject);
      expect(
        live.variants(subject).map((asset) => asset.id),
        subject,
      ).toEqual([entry.asset.id]);
    }
    // A Martian machine afloat is still drawn as itself, never a boat.
    expect(
      unitArtSubjectV7({
        role: "CATAPULT",
        form: "EMBARKED",
        faction: "MARTIAN",
        machine: true,
      }),
    ).toBe("UNIT:MARTIAN:CATAPULT");
    // The registry is the one the game loads (live-board-look-v7.ts).
    const look = await readFile(
      path.join(ROOT, "src/assets/chibi-direction-art-manifest.ts"),
      "utf8",
    );
    expect(look).toContain("CHIBI_NAVAL_FACTION_ART_ASSETS_V7");
  });

  it("matches the accepted records of the six batches: no mask, no owner area", async () => {
    for (const [faction, slug, accent] of FACTIONS) {
      const batch = `naval-${slug}`;
      const manifest = await loadBatchManifest(ROOT, batch);
      const records = await loadRecords(productionLayout(ROOT, batch), batch);
      expect(manifest.faction, batch).toBe(faction);
      expect(manifest.fixedFactionColours, batch).toBe(true);
      expect(manifest.bead, batch).toBe("pulp_wars-w5j.2");
      const entries = CHIBI_NAVAL_FACTION_ART_ASSETS_V7.filter(
        (entry) => entry.faction === faction,
      );
      const accepted = Object.values(records.assets);
      expect(accepted.every((record) => record.status === "ACCEPTED")).toBe(
        true,
      );
      expect(accepted.map((record) => record.id).sort(), batch).toEqual(
        entries.map((entry) => entry.asset.id).sort(),
      );
      expect(manifest.assets.map((asset) => asset.id).sort(), batch).toEqual(
        entries.map((entry) => entry.asset.id).sort(),
      );
      for (const { asset: entry } of entries) {
        const record = records.assets[entry.id];
        const asset = manifest.assets.find((spec) => spec.id === entry.id);
        if (record === undefined || asset === undefined)
          throw new Error(`${entry.id}: not in batch ${batch}`);
        expect(asset.subject, entry.id).toBe(entry.subject);
        expect(asset.ownerColour, entry.id).toBe(false);
        // A ship portrait shows the whole ship: the Goblin ones are fresh
        // creations with the item-sprite class, the others edits of the
        // shared portraits.
        expect(asset.recipeClass, entry.id).toBe(
          entry.assetClass !== "PORTRAIT"
            ? "ship"
            : faction === "GOBLIN"
              ? "icon"
              : "portrait",
        );
        expect(asset.accent ?? null, entry.id).toBe(accent);
        expect(record.derivation.accent?.preset ?? null, entry.id).toBe(accent);
        expect(record.mask, entry.id).toBeUndefined();
        expect(
          entry.url.endsWith(record.master.path.replace(/^public\//, "")),
          entry.id,
        ).toBe(true);
        expect([entry.width, entry.height], entry.id).toEqual([
          record.master.width,
          record.master.height,
        ]);
        expect(chibiAnchorV7(asRegistered(entry)), entry.id).toEqual(
          record.anchor,
        );
        const line = registryEntry(asset, record);
        expect(line, entry.id).toContain("fixedColours: true");
        expect(line, entry.id).not.toContain("ownerMaskUrl");
        await expect(
          readFile(masterFile(entry).replace(/\.png$/, ".mask.png")),
        ).rejects.toThrow();
        expect(
          await verifyAssetRecord(ROOT, manifest, record),
          entry.id,
        ).toEqual([]);
      }
    }
  });

  it("keeps the canvas, class, anchor and waterline of the shared ship it replaces", async () => {
    for (const [kind, role, , today] of SPRITES) {
      const shared = CHIBI_ART_ASSETS_V7.find((asset) => asset.id === today);
      if (shared === undefined) throw new Error(`${today} is gone`);
      expect(shared.subject).toBe(`${kind}:${role}` as ArtSubjectV7);
      const sharedBottom = opaqueBottom(await readRaster(masterFile(shared)));
      for (const entry of CHIBI_NAVAL_FACTION_ART_ASSETS_V7.filter(
        (candidate) => candidate.kind === kind && candidate.role === role,
      )) {
        const asset = entry.asset;
        expect([asset.width, asset.height, asset.assetClass], asset.id).toEqual(
          [shared.width, shared.height, shared.assetClass],
        );
        expect(chibiAnchorV7(asRegistered(asset)), asset.id).toEqual(
          chibiAnchorV7(shared),
        );
        const master = await readRaster(masterFile(asset));
        expect([master.width, master.height], asset.id).toEqual([
          asset.width,
          asset.height,
        ]);
        // The hull sits on the shared ship's waterline: no floating boat.
        expect(
          Math.abs(opaqueBottom(master) - sharedBottom),
          asset.id,
        ).toBeLessThanOrEqual(4);
      }
    }
  });

  it("seats the redrawn Goblin ships on the shared waterline (bottomMargin on an as-is class)", async () => {
    // Bead pulp_wars-wrn.2: fresh creations float where Pixen draws them;
    // the asset's bottomMargin asks an as-is class for the seated
    // derivation, by whole pixels.
    const manifest = await loadBatchManifest(ROOT, "naval-goblin");
    const records = await loadRecords(
      productionLayout(ROOT, "naval-goblin"),
      "naval-goblin",
    );
    for (const [kind, , suffix, today] of SPRITES) {
      if (kind !== "UNIT") continue;
      const id = `chibi-naval-goblin-${suffix}`;
      const asset = manifest.assets.find((spec) => spec.id === id);
      const record = records.assets[id];
      const shared = CHIBI_ART_ASSETS_V7.find((entry) => entry.id === today);
      if (asset === undefined || record === undefined || shared === undefined)
        throw new Error(`${id}: not in the batch`);
      expect(asset.recipeClass, id).toBe("ship");
      expect(record.derivation.kind, id).toBe("seated");
      expect(record.derivation.seat?.bottomMargin, id).toBe(asset.bottomMargin);
      const master = await readRaster(path.join(ROOT, record.master.path));
      expect(opaqueBottom(master), id).toBe(
        opaqueBottom(await readRaster(masterFile(shared))),
      );
      expect(master.height - 1 - opaqueBottom(master), id).toBe(
        asset.bottomMargin,
      );
    }
    // The rule is refused on an owned asset and on a class that derives
    // its master another way.
    const fragments = await loadFragments(ROOT);
    expect(batchManifestProblems(manifest, fragments, "naval-goblin")).toEqual(
      [],
    );
    const owned = {
      ...manifest,
      fixedFactionColours: false,
      assets: manifest.assets.map((spec) =>
        spec.id === "chibi-naval-goblin-patrol-boat"
          ? { ...spec, ownerColour: true }
          : spec,
      ),
    };
    expect(
      batchManifestProblems(owned, fragments, "naval-goblin").join("\n"),
    ).toContain("bottomMargin is only for unowned assets");
  });

  it("carries no player colour and no key-colour area for a mask to find", async () => {
    const players = Object.values(RULESET7_PLAYER_COLORS).map((hex) => [
      Number.parseInt(hex.slice(1, 3), 16),
      Number.parseInt(hex.slice(3, 5), 16),
      Number.parseInt(hex.slice(5, 7), 16),
    ]);
    for (const { faction, asset } of CHIBI_NAVAL_FACTION_ART_ASSETS_V7) {
      const master = await readRaster(masterFile(asset));
      let opaque = 0;
      let nearPlayer = 0;
      for (let index = 0; index < master.width * master.height; index += 1) {
        const o = index * 4;
        if ((master.data[o + 3] ?? 0) < 128) continue;
        opaque += 1;
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
      // The Human crimson is the key's hue, as on the Human land units
      // (fixed colours, never recoloured); every other faction stays out
      // of the band but for a few dark pixels.
      if (faction === "ORIGINAL")
        expect(key / opaque, asset.id).toBeGreaterThan(0.1);
      else expect(key / opaque, asset.id).toBeLessThanOrEqual(0.01);
    }
  });

  it("keeps the map sprites clear of the HP bar and seat badge strips (giants exempt)", async () => {
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
    for (const { kind, asset } of CHIBI_NAVAL_FACTION_ART_ASSETS_V7) {
      if (kind !== "UNIT" || asset.assetClass === "GIANT_UNIT") continue;
      const master = await readRaster(masterFile(asset));
      const anchor = chibiAnchorV7(asRegistered(asset));
      const covered: string[] = [];
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
            covered.push(`${px},${py}`);
        }
      expect({ id: asset.id, covered }).toEqual({ id: asset.id, covered: [] });
    }
  });
});
