import record from "./campaign-pictures.json";
import { chibiArtUrl } from "./chibi-art-manifest";

/**
 * The campaign pictures (bead pulp_wars-hmyk.13,
 * docs/art/CAMPAIGN_PICTURES.md): one small opaque scene per campaign,
 * drawn on its plate on the campaign map and at the head of its mission
 * list. Generated with PixelLab and baked by
 * scripts/art/campaign-pictures.ts, which writes campaign-pictures.json
 * (this manifest's data and the derivation record `art:validate` checks).
 * A campaign names its picture by `id` (`CampaignDefinitionV7.picture`).
 */
export interface CampaignPictureAssetV7 {
  readonly id: string;
  /** The campaign it was drawn for (a `CampaignIdV7`). */
  readonly campaign: string;
  /** What it shows, for the record and the review. */
  readonly subject: string;
  /** The DPR 1 master: 128 x 96. */
  readonly width: number;
  readonly height: number;
  readonly url: string;
}

export const CAMPAIGN_PICTURE_ASSETS_V7: readonly CampaignPictureAssetV7[] =
  Object.freeze(
    record.pictures.map((picture) =>
      Object.freeze({
        id: picture.id,
        campaign: picture.campaign,
        subject: picture.subject,
        width: picture.width,
        height: picture.height,
        url: chibiArtUrl(picture.path.replace(/^public\//, "")),
      }),
    ),
  );

const BY_ID: ReadonlyMap<string, CampaignPictureAssetV7> = new Map(
  CAMPAIGN_PICTURE_ASSETS_V7.map((picture) => [picture.id, picture]),
);

/** A campaign's picture by its asset ID; null for none or an unknown ID. */
export function campaignPictureAssetV7(
  id: string | null,
): CampaignPictureAssetV7 | null {
  return id === null ? null : (BY_ID.get(id) ?? null);
}
