import { describe, expect, it } from "vitest";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import { buildChibiArtRegistryV7 } from "../../src/assets/chibi-art-v7";
import { chibiDirectionArtRegistryV7 } from "../../src/assets/chibi-direction-art-manifest";
import { commandSubjectV7 } from "../../src/assets/chibi-ui-art-v7";
import { FACTION_IDS_V7, type CommandV7 } from "../../src/engine/index";
import { TILE_ABILITIES_V7 } from "../../src/render/canvas/tile-actions-v7";

/**
 * The Fortify icon (bead pulp_wars-je3v): the dock's Fortify button (the
 * `BUILD_FIELD_DEFENSE` command) drew a code glyph of three bricks; it now
 * shows a PixelLab icon, a kite shield planted in sandbags, in every
 * faction's look.
 */
const FORTIFY: CommandV7 = {
  kind: "BUILD_FIELD_DEFENSE",
  unitId: 1 as never,
};

describe("Fortify icon (pulp_wars-je3v)", () => {
  it("asks for the Fortify icon for every faction", () => {
    for (const faction of FACTION_IDS_V7)
      expect(commandSubjectV7(FORTIFY, faction), faction).toBe(
        "ICON:ACTION:BUILD_FIELD_DEFENSE",
      );
  });

  it("registers one Fortify icon, shared by every look", () => {
    const classic = buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7).registry;
    expect(
      classic
        .variants("ICON:ACTION:BUILD_FIELD_DEFENSE")
        .map((asset) => asset.id),
    ).toEqual(["chibi-icon-action-fortify"]);
    // The live direction registers no Fortify of its own: the interface
    // resolves it first and then the default art, as for Wait or Disband.
    const live = chibiDirectionArtRegistryV7();
    expect(live.variants("ICON:ACTION:BUILD_FIELD_DEFENSE")).toEqual([]);
    const [asset] = classic.variants("ICON:ACTION:BUILD_FIELD_DEFENSE");
    expect(asset).toMatchObject({
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: expect.stringMatching(
        /assets\/chibi\/icons\/chibi-icon-action-fortify\.png$/,
      ),
    });
    expect(asset?.ownerMaskUrl).toBeUndefined();
  });

  it("is a dock button only: no board badge stands for Fortify", () => {
    expect(
      TILE_ABILITIES_V7.some(
        (ability) => ability.raster === "ICON:ACTION:BUILD_FIELD_DEFENSE",
      ),
    ).toBe(false);
  });
});
