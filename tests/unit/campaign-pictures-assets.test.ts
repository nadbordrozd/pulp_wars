import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assetInventoryV7,
  assetTiersV7,
  frontTierSubjectV7,
} from "../../src/assets/asset-inventory-v7";
import {
  CAMPAIGN_PICTURE_ASSETS_V7,
  campaignPictureAssetV7,
} from "../../src/assets/campaign-pictures-manifest";
import { portraitSubjectV7 } from "../../src/assets/chibi-ui-art-v7";
import { CAMPAIGNS_V7 } from "../../src/campaign/campaigns";
import { readRaster } from "../../scripts/art/chibi/pipeline";
import { campaignPictureProblems } from "../../scripts/art/campaign-pictures";

/**
 * The campaign pictures (bead pulp_wars-hmyk.13,
 * docs/art/CAMPAIGN_PICTURES.md): one opaque 128 x 96 scene per campaign,
 * baked from a reviewed PixelLab candidate and loaded with the shared art.
 */
const ROOT = path.resolve(".");
const publicFile = (url: string): string =>
  path.join(ROOT, "public", url.replace(/^\//, ""));

describe("campaign pictures", () => {
  it("gives every campaign its own picture", () => {
    const ids = CAMPAIGNS_V7.map((campaign) => campaign.picture);
    expect(new Set(ids).size).toBe(CAMPAIGNS_V7.length);
    for (const campaign of CAMPAIGNS_V7) {
      const picture = campaignPictureAssetV7(campaign.picture);
      expect(picture, campaign.id).not.toBeNull();
      expect(picture?.campaign).toBe(campaign.id);
    }
    expect(CAMPAIGN_PICTURE_ASSETS_V7).toHaveLength(CAMPAIGNS_V7.length);
    expect(campaignPictureAssetV7(null)).toBeNull();
    expect(campaignPictureAssetV7("campaign-nowhere")).toBeNull();
  });

  it("are opaque 128 x 96 masters under the chibi assets", async () => {
    for (const picture of CAMPAIGN_PICTURE_ASSETS_V7) {
      expect(picture.url).toContain("assets/chibi/campaign/");
      expect([picture.width, picture.height]).toEqual([128, 96]);
      const raster = await readRaster(await readFile(publicFile(picture.url)));
      expect([raster.width, raster.height], picture.id).toEqual([128, 96]);
      let transparent = 0;
      for (let index = 3; index < raster.data.length; index += 4)
        if (raster.data[index] !== 255) transparent += 1;
      expect(transparent, picture.id).toBe(0);
    }
  });

  it("are what their recorded candidates derive", async () => {
    expect(await campaignPictureProblems(ROOT)).toEqual([]);
  });

  it("load with the shared art, before the title, in both looks", () => {
    for (const look of ["LIVE", "CLASSIC"] as const) {
      const entries = new Map(
        assetInventoryV7(look).map((entry) => [entry.url, entry]),
      );
      const front = new Set(assetTiersV7(look).front);
      for (const picture of CAMPAIGN_PICTURE_ASSETS_V7) {
        expect(entries.get(picture.url)?.group, picture.id).toBe("SHARED");
        expect(front.has(picture.url), picture.id).toBe(true);
      }
    }
  });

  it("leaves the placeholder portraits to their factions' tiers", () => {
    // A campaign with a picture draws its placeholder only when the
    // picture fails: the portrait no longer blocks the title.
    for (const campaign of CAMPAIGNS_V7) {
      if (campaign.placeholderRole === "FIGHTER") continue;
      expect(
        frontTierSubjectV7(
          portraitSubjectV7(campaign.placeholderRole, campaign.faction),
        ),
        campaign.id,
      ).toBe(false);
    }
  });
});
