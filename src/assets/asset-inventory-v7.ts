import { playableSoundIdsV1, playableSoundV1 } from "../audio/playable-sound";
import {
  stockSoundChoiceV1,
  type StockSoundPicksV1,
} from "../audio/stock-sound-picks";
import { stockSoundCandidateV1, stockSoundUrlV1 } from "../audio/stock-sounds";
import { FACTION_IDS_V7, type FactionIdV7 } from "../engine/index";
import { CHIBI_ART_ASSETS_V7 } from "./chibi-art-manifest";
import type { ArtSetV7, ChibiArtAssetV7 } from "./chibi-art-v7";
import { chibiDirectionArtAssetsV7 } from "./chibi-direction-art-manifest";
import { CHIBI_FOREST_ART_SET_V7 } from "./chibi-forest-pieces-manifest";
import { CHIBI_MOUNTAIN_ART_SET_V7 } from "./chibi-mountain-ranges-manifest";
import { FACTION_FOREST_ART_SETS_V7 } from "./faction-forest-pieces-manifest";
import { FACTION_GRASS_TILES_V7 } from "./faction-grass-manifest";
import { ACCEPTED_ART_URLS } from "./generated-art-manifest";

/**
 * The raster inventory of the Ruleset 7 client (bead pulp_wars-2yc.6): every
 * image file a look can show, derived from the manifests and registries the
 * board and the interface resolve their art from. The asset preloader
 * (src/app/asset-preloader-v7.ts) fetches and decodes a look's inventory
 * before the first screen is drawn, so no sprite is first drawn as a
 * stand-in and swapped a moment later.
 *
 * Nothing here names a file: a raster added to a manifest is in the
 * inventory, and tests/unit/asset-inventory-v7.test.ts fails when a manifest
 * module under src/assets exports a raster URL the inventory does not cover.
 */

/**
 * The looks of the client. LIVE is the CHIBI art set with the new visual
 * direction, CLASSIC the CHIBI set as it was before the direction (the
 * developer option "Classic look"), LEGACY the PixelLab set of `?art=legacy`.
 */
export type AssetLookV7 = "LIVE" | "CLASSIC" | "LEGACY";

/** Who a raster belongs to: one faction's art, or art every match can show. */
export type AssetGroupV7 = "SHARED" | Exclude<FactionIdV7, "ORIGINAL">;

export interface AssetInventoryEntryV7 {
  readonly url: string;
  readonly group: AssetGroupV7;
}

const FACTION_GROUPS: ReadonlySet<string> = new Set(
  FACTION_IDS_V7.filter((faction) => faction !== "ORIGINAL"),
);

/**
 * The group of an art subject: the faction named by one of its parts
 * (`UNIT:UNDEAD:FIGHTER`, `CITY:GOBLIN:2`, `TERRAIN:UNDEAD:GRASS`), and
 * SHARED for everything else, which includes the Human art (the Humans draw
 * the shared subjects) and anything not plainly one faction's.
 */
export function assetGroupOfSubjectV7(subject: string): AssetGroupV7 {
  for (const part of subject.split(":"))
    if (FACTION_GROUPS.has(part)) return part as AssetGroupV7;
  return "SHARED";
}

/** Every file of one registered raster: master, densities, mask, layers. */
export function chibiAssetUrlsV7(asset: ChibiArtAssetV7): string[] {
  return [
    asset.url,
    ...Object.values(asset.densityUrls ?? {}),
    ...(asset.ownerMaskUrl === undefined ? [] : [asset.ownerMaskUrl]),
    ...(asset.layers === undefined
      ? []
      : [asset.layers.bodyUrl, asset.layers.groundUrl]),
  ];
}

function registered(
  assets: readonly ChibiArtAssetV7[],
): AssetInventoryEntryV7[] {
  return assets.flatMap((asset) => {
    const group = assetGroupOfSubjectV7(asset.subject);
    return chibiAssetUrlsV7(asset).map((url) => ({ url, group }));
  });
}

/** A URL is listed once; a file shared with SHARED art is SHARED. */
function unique(
  entries: readonly AssetInventoryEntryV7[],
): readonly AssetInventoryEntryV7[] {
  const groups = new Map<string, AssetGroupV7>();
  for (const entry of entries) {
    const known = groups.get(entry.url);
    groups.set(
      entry.url,
      known === undefined || known === entry.group ? entry.group : "SHARED",
    );
  }
  return [...groups].map(([url, group]) => ({ url, group }));
}

/** The CHIBI set without the visual direction: what the classic look draws. */
function classicEntries(): AssetInventoryEntryV7[] {
  return [
    ...registered(CHIBI_ART_ASSETS_V7),
    // Composed terrain: forest pieces and clumps, massifs, mined mountains.
    ...[
      ...CHIBI_FOREST_ART_SET_V7.pieces,
      ...CHIBI_FOREST_ART_SET_V7.clumps,
      ...CHIBI_MOUNTAIN_ART_SET_V7.pieces,
      ...CHIBI_MOUNTAIN_ART_SET_V7.mined,
    ].map(({ url }) => ({ url, group: "SHARED" as const })),
    // Territory ground of each faction (the board loads the set whole).
    ...FACTION_GRASS_TILES_V7.map((tile) => ({
      url: tile.url,
      group: tile.id satisfies AssetGroupV7,
    })),
    // The forest of each faction (pulp_wars-2yc.2), loaded with its faction.
    ...Object.entries(FACTION_FOREST_ART_SETS_V7).flatMap(([id, set]) =>
      [...set.pieces, ...set.clumps].map(({ url }) => ({
        url,
        group: id as AssetGroupV7,
      })),
    ),
  ];
}

/**
 * The inventory of a look. The live look resolves the direction's art
 * first and the default CHIBI art for every other subject (shared terrain,
 * icons, effects) and as the stand-in of a direction raster that failed to
 * load, so it contains the whole classic look: switching to the classic
 * look needs no further file.
 */
export function assetInventoryV7(
  look: AssetLookV7,
): readonly AssetInventoryEntryV7[] {
  if (look === "LEGACY")
    return unique(
      Object.values(ACCEPTED_ART_URLS).map((url) => ({
        url,
        group: "SHARED" as const,
      })),
    );
  return unique(
    look === "CLASSIC"
      ? classicEntries()
      : [...classicEntries(), ...registered(chibiDirectionArtAssetsV7())],
  );
}

/** The look whose inventory an art set and the classic-look option draw. */
export function assetLookV7(
  artSet: ArtSetV7,
  classicLook = false,
): AssetLookV7 {
  return artSet !== "CHIBI" ? "LEGACY" : classicLook ? "CLASSIC" : "LIVE";
}

/**
 * The part of a look a match between `factions` can show: the shared art
 * and the art of each faction in play.
 */
export function assetInventoryForFactionsV7(
  look: AssetLookV7,
  factions: readonly FactionIdV7[],
): readonly AssetInventoryEntryV7[] {
  const playing = new Set<string>(factions);
  return assetInventoryV7(look).filter(
    (entry) => entry.group === "SHARED" || playing.has(entry.group),
  );
}

/**
 * The sound files of the client (bead pulp_wars-2yc.20, docs/ui/SOUND.md
 * "Stock recordings"): the file of every sound and theme of the audio
 * manifest that names one. The game's start fetches them beside the art,
 * without waiting for them (src/app/v7-preload-boot.ts); a sound whose
 * file has not arrived plays its synthesised fallback.
 *
 * A sound with several recordings (bead pulp_wars-2yc.24) lists one file:
 * its default recording, or the one this browser picked (`picks`); none
 * when that is the generated sound. The other candidates are fetched only
 * when the Gallery plays them.
 *
 * With `stockSounds` false (`?stock-sounds=0`) a file that has a
 * synthesised fallback is left out: that sound is synthesised.
 */
export function soundAssetUrlsV7(
  stockSounds = true,
  picks: StockSoundPicksV1 = {},
): readonly string[] {
  const urls = new Set<string>();
  for (const id of playableSoundIdsV1()) {
    // A sound with recordings: the one this browser picked, else its
    // default; none when that is the generated sound.
    const choice = stockSoundChoiceV1(id, picks);
    if (choice !== null) {
      const clip = stockSounds ? stockSoundCandidateV1(id, choice) : null;
      if (clip !== null) urls.add(stockSoundUrlV1(clip));
      continue;
    }
    const source = playableSoundV1(id)?.source;
    if (source?.kind !== "FILE") continue;
    if (!stockSounds && source.fallback !== undefined) continue;
    urls.add(source.url);
  }
  return [...urls];
}

/** Preload order of a look: the shared art first, then each faction's. */
export function assetPreloadUrlsV7(look: AssetLookV7): readonly string[] {
  const entries = assetInventoryV7(look);
  return [
    ...entries.filter((entry) => entry.group === "SHARED"),
    ...entries.filter((entry) => entry.group !== "SHARED"),
  ].map((entry) => entry.url);
}
