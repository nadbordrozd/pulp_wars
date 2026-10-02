import { CHIBI_DIRECTION_ART_ASSETS_V7 } from "../../assets/chibi-direction-art-manifest";
import {
  buildChibiArtRegistryV7,
  type ArtSubjectV7,
  type ChibiArtAssetV7,
  type ChibiArtRegistryV7,
  type ChibiAssetClassV7,
} from "../../assets/chibi-art-v7";

/**
 * The exploration sample sprites of the visual-direction study (beads
 * pulp_wars-3tq.1 and pulp_wars-3tq.3). They live under art/explorations
 * and are never part of the production chibi manifest. Since bead
 * pulp_wars-3tq.5 the game itself no longer loads this module: the
 * developer toggle draws the production art of
 * src/assets/chibi-direction-art-manifest.ts. The sets below remain for the
 * study's review benches (scripts/art/visual-direction-review.ts).
 *
 * - PRODUCTION: that production art, so a bench can draw what the game does.
 * - STUDY: the first study's three Human units in cream and steel whose
 *   owner mask covers only a small accent.
 * - DEMO: the Human demo. Fighter, Marksman and Knight in fixed crimson and
 *   gold heraldry, every improvement and City 1-3 re-created in the calmer
 *   building style, and the Farm as rows of crops with gaps. Their colours
 *   are the faction's and never change with the player, so the units and
 *   cities carry an empty owner mask (the registry requires one).
 * - STYLE_A, STYLE_B: the two building styles compared on three buildings
 *   (review sheets only).
 */
const study = (file: string): string =>
  new URL(
    `../../../art/explorations/visual-direction-2026-10/assets/${file}`,
    import.meta.url,
  ).href;

const demo = (file: string): string =>
  new URL(
    `../../../art/explorations/human-demo-2026-10/assets/${file}`,
    import.meta.url,
  ).href;

export const VISUAL_DIRECTION_SAMPLE_ASSETS_V7: readonly ChibiArtAssetV7[] = [
  {
    id: "chibi-sample-accent-fighter",
    subject: "UNIT:FIGHTER",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: study("chibi-sample-accent-fighter.png"),
    ownerMaskUrl: study("chibi-sample-accent-fighter.mask.png"),
  },
  {
    id: "chibi-sample-accent-marksman",
    subject: "UNIT:MARKSMAN",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: study("chibi-sample-accent-marksman.png"),
    ownerMaskUrl: study("chibi-sample-accent-marksman.mask.png"),
  },
  {
    id: "chibi-sample-accent-knight",
    subject: "UNIT:KNIGHT",
    assetClass: "LARGE_UNIT",
    width: 72,
    height: 88,
    url: study("chibi-sample-accent-knight.png"),
    ownerMaskUrl: study("chibi-sample-accent-knight.mask.png"),
  },
];

function piece(
  id: string,
  subject: ArtSubjectV7,
  assetClass: ChibiAssetClassV7,
  width: number,
  height: number,
): ChibiArtAssetV7 {
  const owned = subject.startsWith("UNIT:") || subject.startsWith("CITY:");
  return {
    id,
    subject,
    assetClass,
    width,
    height,
    url: demo(`${id}.png`),
    ...(owned ? { ownerMaskUrl: demo(`${id}.mask.png`) } : {}),
  };
}

const DEMO_FARM = piece(
  "chibi-demo-farm",
  "IMPROVEMENT:FARM",
  "BUILDING",
  80,
  80,
);

/** The Human demo: what the developer toggle draws. */
export const HUMAN_DEMO_SAMPLE_ASSETS_V7: readonly ChibiArtAssetV7[] = [
  piece("chibi-demo-fighter", "UNIT:FIGHTER", "STANDARD_UNIT", 56, 80),
  piece("chibi-demo-marksman", "UNIT:MARKSMAN", "STANDARD_UNIT", 56, 80),
  piece("chibi-demo-knight", "UNIT:KNIGHT", "LARGE_UNIT", 72, 88),
  DEMO_FARM,
  piece(
    "chibi-demo-lumber-camp",
    "IMPROVEMENT:LUMBER_CAMP",
    "BUILDING",
    72,
    72,
  ),
  piece("chibi-demo-windmill", "IMPROVEMENT:WINDMILL", "BUILDING", 64, 72),
  piece("chibi-demo-sawmill", "IMPROVEMENT:SAWMILL", "BUILDING", 72, 72),
  piece("chibi-demo-forge", "IMPROVEMENT:FORGE", "BUILDING", 72, 72),
  piece("chibi-demo-workshop", "IMPROVEMENT:WORKSHOP", "BUILDING", 72, 72),
  piece("chibi-demo-market", "IMPROVEMENT:MARKET", "BUILDING", 72, 72),
  piece("chibi-demo-monument", "IMPROVEMENT:MONUMENT", "BUILDING", 48, 72),
  piece("chibi-demo-port", "IMPROVEMENT:PORT", "BUILDING", 72, 72),
  piece("chibi-demo-shipyard", "IMPROVEMENT:SHIPYARD", "BUILDING", 72, 72),
  piece("chibi-demo-city-1", "CITY:1", "SETTLEMENT", 80, 80),
  piece("chibi-demo-city-2", "CITY:2", "SETTLEMENT", 88, 80),
  piece("chibi-demo-city-3", "CITY:3", "SETTLEMENT", 96, 88),
];

const DEMO_UNITS = HUMAN_DEMO_SAMPLE_ASSETS_V7.filter((asset) =>
  asset.subject.startsWith("UNIT:"),
);

const STYLE_A_SAMPLE_ASSETS_V7: readonly ChibiArtAssetV7[] = [
  ...DEMO_UNITS,
  DEMO_FARM,
  piece("chibi-style-a-windmill", "IMPROVEMENT:WINDMILL", "BUILDING", 80, 88),
  piece("chibi-style-a-forge", "IMPROVEMENT:FORGE", "BUILDING", 80, 88),
  piece("chibi-style-a-market", "IMPROVEMENT:MARKET", "BUILDING", 80, 88),
];

const STYLE_B_SAMPLE_ASSETS_V7: readonly ChibiArtAssetV7[] = [
  ...DEMO_UNITS,
  DEMO_FARM,
  piece("chibi-demo-windmill", "IMPROVEMENT:WINDMILL", "BUILDING", 64, 72),
  piece("chibi-style-b-forge", "IMPROVEMENT:FORGE", "BUILDING", 64, 64),
  piece("chibi-style-b-market", "IMPROVEMENT:MARKET", "BUILDING", 64, 64),
];

export type VisualDirectionSampleSetV7 =
  "STUDY" | "DEMO" | "STYLE_A" | "STYLE_B" | "PRODUCTION";

export const VISUAL_DIRECTION_SAMPLE_SETS_V7: Readonly<
  Record<VisualDirectionSampleSetV7, readonly ChibiArtAssetV7[]>
> = {
  STUDY: VISUAL_DIRECTION_SAMPLE_ASSETS_V7,
  DEMO: HUMAN_DEMO_SAMPLE_ASSETS_V7,
  STYLE_A: STYLE_A_SAMPLE_ASSETS_V7,
  STYLE_B: STYLE_B_SAMPLE_ASSETS_V7,
  PRODUCTION: CHIBI_DIRECTION_ART_ASSETS_V7,
};

/** The registry of one sample set; the benches default to DEMO. */
export function visualDirectionSampleRegistryV7(
  set: VisualDirectionSampleSetV7 = "DEMO",
): ChibiArtRegistryV7 {
  const built = buildChibiArtRegistryV7(VISUAL_DIRECTION_SAMPLE_SETS_V7[set]);
  if (built.problems.length > 0) throw new Error(built.problems.join("; "));
  return built.registry;
}
