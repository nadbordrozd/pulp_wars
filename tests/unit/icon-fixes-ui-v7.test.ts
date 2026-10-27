import { describe, expect, it } from "vitest";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import {
  buildChibiArtRegistryV7,
  chibiFallbackSubjectV7,
  type ArtSubjectV7,
  type ChibiArtRegistryV7,
} from "../../src/assets/chibi-art-v7";
import { chibiDirectionArtRegistryV7 } from "../../src/assets/chibi-direction-art-manifest";
import {
  commandSubjectV7,
  technologySubjectV7,
} from "../../src/assets/chibi-ui-art-v7";
import {
  FACTION_IDS_V7,
  TECHNOLOGY_IDS_V7,
  type CommandV7,
} from "../../src/engine/index";
import type { ChibiBoardArtV7 } from "../../src/render/canvas/chibi-art-resolver-v7";
import { TILE_ABILITIES_V7 } from "../../src/render/canvas/tile-actions-v7";
import {
  createDirectedChibiArtV7,
  LIVE_DIRECTION_V7,
} from "../../src/render/canvas/visual-direction-v7";

/**
 * Icon fixes (bead pulp_wars-2yc.118): the Cult's Tentacles card showed the
 * Human Knight, and several dock buttons drew code glyphs that read poorly
 * (the Dwarf Barricade first). Each now has a PixelLab icon.
 */
const live = chibiDirectionArtRegistryV7();
const classic = buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7).registry;

/** The subject a registry draws for `subject`, after its fallbacks. */
function drawnSubject(
  registry: ChibiArtRegistryV7,
  subject: ArtSubjectV7,
): ArtSubjectV7 | null {
  let current: ArtSubjectV7 | null = subject;
  for (let steps = 0; current !== null && steps < 4; steps += 1) {
    if (registry.variants(current).length > 0) return current;
    current = chibiFallbackSubjectV7(current);
  }
  return null;
}

/** The new icons and the asset each subject is drawn from. */
const NEW_ICONS: readonly (readonly [ArtSubjectV7, string])[] = [
  ["ICON:ACTION:BUILD_BARRICADE", "chibi-direction-icon-action-barricade"],
  ["ICON:ACTION:WHIRL", "chibi-direction-icon-action-whirl"],
  ["ICON:ACTION:FROST_BOLT", "chibi-direction-icon-action-frost-bolt"],
  [
    "ICON:ACTION:ICE_FOLK:STAMPEDE",
    "chibi-direction-icon-action-ice-folk-stampede",
  ],
  ["ICON:ACTION:SWALLOW", "chibi-direction-icon-action-swallow"],
  ["ICON:ACTION:STOMP", "chibi-direction-icon-action-stomp"],
  ["ICON:ACTION:BREAK_OFF", "chibi-direction-icon-action-break-off"],
];

describe("icon fixes (pulp_wars-2yc.118)", () => {
  it("shows the Tentacle on the Cult's Tentacles card, not the Human Knight", () => {
    expect(technologySubjectV7("CHIVALRY", "CULT")).toBe(
      "PORTRAIT:CULT:TENTACLE",
    );
    expect(drawnSubject(live, "PORTRAIT:CULT:TENTACLE")).toBe(
      "PORTRAIT:CULT:TENTACLE",
    );
    // The research button shows the same card.
    expect(
      commandSubjectV7(
        { kind: "RESEARCH", tech: "CHIVALRY" } as unknown as CommandV7,
        "CULT",
      ),
    ).toBe("PORTRAIT:CULT:TENTACLE");
  });

  it("never shows another faction's unit or portrait on a faction's technology card", () => {
    for (const faction of FACTION_IDS_V7) {
      if (faction === "ORIGINAL") continue;
      for (const tech of TECHNOLOGY_IDS_V7) {
        const subject = technologySubjectV7(tech, faction);
        const drawn = drawnSubject(live, subject) ?? subject;
        // A unit or a portrait on a card is always the faction's own: a
        // faction-less one is a Human stand-in for a vacant art slot.
        if (/^(UNIT|PORTRAIT):/.test(drawn))
          expect(drawn, `${faction} ${tech}`).toContain(`:${faction}:`);
      }
    }
  });

  it("registers the new action icons in the live look, one each", () => {
    for (const [subject, id] of NEW_ICONS)
      expect(
        live.variants(subject).map((asset) => asset.id),
        subject,
      ).toEqual([id]);
    // The Goblin Toss is in the classic manifest, beside Kaboom!.
    expect(
      classic.variants("ICON:ACTION:TOSS").map((asset) => asset.id),
    ).toEqual(["chibi-icon-action-toss"]);
    // The Mammoth's Stampede is not the Triceratops's Charge!.
    expect(live.variants("ICON:ACTION:STAMPEDE")[0]?.id).toBe(
      "chibi-direction-icon-action-stampede",
    );
  });

  it("asks the Barricade and Whirl commands for their icons", () => {
    for (const kind of ["BUILD_BARRICADE", "WHIRL"] as const)
      expect(
        commandSubjectV7({ kind, unitId: 1 } as unknown as CommandV7, "DWARF"),
      ).toBe(`ICON:ACTION:${kind}`);
  });

  it("gives the tile badges whose glyph read poorly their icons, and keeps the clear glyphs", () => {
    const rasters = new Map(
      TILE_ABILITIES_V7.map((ability) => [ability.id, ability.raster]),
    );
    expect(rasters.get("BUILD_BARRICADE")).toBe("ICON:ACTION:BUILD_BARRICADE");
    expect(rasters.get("ASSEMBLE")).toBe("ICON:ACTION:ASSEMBLE");
    expect(rasters.get("TUNNEL")).toBe("ICON:ACTION:TUNNEL");
    expect(rasters.get("FROST_BOLT")).toBe("ICON:ACTION:FROST_BOLT");
    // Dark icons are murky in the dark disc: these keep their glyphs.
    for (const id of [
      "BOMB_RUN",
      "SWALLOW",
      "TOSS",
      "BREAK_OFF",
      "REBAKE",
      "STAMPEDE",
      "THROW_BOLAS",
    ])
      expect(rasters.get(id), id).toBeUndefined();
    // Every badge raster is registered in one of the looks.
    for (const ability of TILE_ABILITIES_V7)
      if (ability.raster !== undefined)
        expect(
          live.variants(ability.raster).length +
            classic.variants(ability.raster).length,
          ability.raster,
        ).toBeGreaterThan(0);
  });

  it("draws a tile badge's action icon from the live look's own art", () => {
    const asked: string[] = [];
    const samples: ChibiBoardArtV7 = {
      resolve(request) {
        asked.push(request.subject);
        const asset = live.variants(request.subject)[0];
        return asset === undefined
          ? { kind: "MISSING" }
          : {
              kind: "READY",
              asset,
              image: { assetId: asset.id } as unknown as CanvasImageSource,
              density: 1,
              smoothing: false,
              cacheKey: asset.id,
            };
      },
    };
    const art = createDirectedChibiArtV7({
      base: { resolve: () => ({ kind: "MISSING" }) },
      samples,
      direction: LIVE_DIRECTION_V7,
      environment: {
        readPixels: (_image, width, height) =>
          new Uint8ClampedArray(width * height * 4),
        createSurface: (pixels, width, height) =>
          ({ pixels, width, height }) as unknown as CanvasImageSource,
      },
    });
    for (const subject of [
      "ICON:ACTION:BUILD_BARRICADE",
      "ICON:ACTION:FROST_BOLT",
      "ICON:ACTION:JOIN_CHANT",
    ] as const) {
      const resolved = art.resolve({
        subject,
        at: { x: 0, y: 0 },
        deviceScale: 1,
      });
      expect(resolved.kind, subject).toBe("READY");
    }
    expect(asked).toContain("ICON:ACTION:BUILD_BARRICADE");
  });
});
