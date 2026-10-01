import {
  buildChibiArtRegistryV7,
  type ChibiArtAssetV7,
  type ChibiArtRegistryV7,
} from "../../assets/chibi-art-v7";

/**
 * The exploration sample sprites of the visual-direction study (bead
 * pulp_wars-3tq.1): Human units in cream and steel whose owner mask covers
 * only a small accent. They live under art/explorations, are never part of
 * the production chibi manifest, and are loaded only when the developer
 * toggle asks for this module (a dynamic import, so the default game never
 * fetches them).
 */
const sample = (file: string): string =>
  new URL(
    `../../../art/explorations/visual-direction-2026-10/assets/${file}`,
    import.meta.url,
  ).href;

export const VISUAL_DIRECTION_SAMPLE_ASSETS_V7: readonly ChibiArtAssetV7[] = [
  {
    id: "chibi-sample-accent-fighter",
    subject: "UNIT:FIGHTER",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: sample("chibi-sample-accent-fighter.png"),
    ownerMaskUrl: sample("chibi-sample-accent-fighter.mask.png"),
  },
  {
    id: "chibi-sample-accent-marksman",
    subject: "UNIT:MARKSMAN",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: sample("chibi-sample-accent-marksman.png"),
    ownerMaskUrl: sample("chibi-sample-accent-marksman.mask.png"),
  },
  {
    id: "chibi-sample-accent-knight",
    subject: "UNIT:KNIGHT",
    assetClass: "LARGE_UNIT",
    width: 72,
    height: 88,
    url: sample("chibi-sample-accent-knight.png"),
    ownerMaskUrl: sample("chibi-sample-accent-knight.mask.png"),
  },
];

export function visualDirectionSampleRegistryV7(): ChibiArtRegistryV7 {
  return buildChibiArtRegistryV7(VISUAL_DIRECTION_SAMPLE_ASSETS_V7).registry;
}
