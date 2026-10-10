import { playableSoundIdsV1, playableSoundV1 } from "../audio/playable-sound";
import {
  stockSoundChoiceV1,
  type StockSoundPicksV1,
} from "../audio/stock-sound-picks";
import { stockSoundCandidateV1, stockSoundUrlV1 } from "../audio/stock-sounds";
import { FACTION_IDS_V7, type FactionIdV7 } from "../engine/index";
import { CHIBI_ART_ASSETS_V7 } from "./chibi-art-manifest";
import { navalArtRoleOfSubjectV7, type ChibiArtAssetV7 } from "./chibi-art-v7";
import { chibiDirectionArtAssetsV7 } from "./chibi-direction-art-manifest";
import { CHIBI_FOREST_ART_SET_V7 } from "./chibi-forest-pieces-manifest";
import { CHIBI_MOUNTAIN_ART_SET_V7 } from "./chibi-mountain-ranges-manifest";
import { portraitSubjectV7 } from "./chibi-ui-art-v7";
import { FACTION_FOREST_ART_SETS_V7 } from "./faction-forest-pieces-manifest";
import { FACTION_GRASS_TILES_V7 } from "./faction-grass-manifest";

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
 *
 * A look loads in tiers (bead pulp_wars-2yc.42, `assetTiersV7`): the FRONT
 * tier before the title is shown, each faction's tier in the background
 * after it, and before a board that shows the faction is drawn.
 */

/**
 * The looks of the client. LIVE is the CHIBI art set with the new visual
 * direction, CLASSIC the CHIBI set as it was before the direction (the
 * developer option "Classic look"). The legacy PixelLab set of
 * `?art=legacy` is no longer a look (bead pulp_wars-67q.13): no player can
 * select it, so none of its files is preloaded. They stay on disk as the
 * last per-subject fallback of a chibi raster that failed to load, and as
 * the frozen art of Ruleset 6, and load on demand.
 */
export type AssetLookV7 = "LIVE" | "CLASSIC";

/** Who a raster belongs to: one faction's art, or art every match can show. */
export type AssetGroupV7 = "SHARED" | Exclude<FactionIdV7, "ORIGINAL">;

export interface AssetInventoryEntryV7 {
  readonly url: string;
  readonly group: AssetGroupV7;
  /**
   * True for a faction's file that is asked for whoever plays
   * (`frontTierSubjectV7`): it loads with the shared art. Absent otherwise.
   */
  readonly front?: true;
}

/**
 * A faction's emblem on the tribe picker, the seats, the campaign and the
 * leaderboard: its Fighter portrait (`#factionEmblem` in
 * src/render/dom/app-view-v7.ts).
 */
const EMBLEM_SUBJECTS: ReadonlySet<string> = new Set(
  FACTION_IDS_V7.map((faction) => portraitSubjectV7("FIGHTER", faction)),
);

/**
 * True for a faction's art subject that is asked for whoever plays, so it
 * belongs to the FRONT tier: the emblems, which the screens before a match
 * draw. The factions' territory ground is front too (`classicEntries`).
 * The effect sprites a board asks for when it mounts, the Martian, Ice
 * Folk and Dwarf cues in every match (`#requestEffectArt` in
 * src/render/canvas/board-host-v7.ts), need no rule: an effect subject
 * names no faction, so it is shared art.
 */
export function frontTierSubjectV7(subject: string): boolean {
  return EMBLEM_SUBJECTS.has(subject);
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
    const front = group !== "SHARED" && frontTierSubjectV7(asset.subject);
    return chibiAssetUrlsV7(asset).map((url) =>
      front ? { url, group, front } : { url, group },
    );
  });
}

/**
 * A URL is listed once; a file shared with SHARED art is SHARED, and a
 * file one of whose uses is in the FRONT tier loads with it.
 */
function unique(
  entries: readonly AssetInventoryEntryV7[],
): readonly AssetInventoryEntryV7[] {
  const groups = new Map<string, AssetGroupV7>();
  const front = new Set<string>();
  for (const entry of entries) {
    const known = groups.get(entry.url);
    groups.set(
      entry.url,
      known === undefined || known === entry.group ? entry.group : "SHARED",
    );
    if (entry.front === true) front.add(entry.url);
  }
  return [...groups].map(([url, group]) =>
    group !== "SHARED" && front.has(url)
      ? { url, group, front: true as const }
      : { url, group },
  );
}

const DIRECTION_FIRST_CLASSES: ReadonlySet<string> = new Set([
  "UNIT",
  "CITY",
  "IMPROVEMENT",
]);
let directionSubjects: ReadonlySet<string> | null = null;

/**
 * True for a raster of the default CHIBI art that the live look draws only
 * when the direction's raster of the same subject failed to load (bead
 * pulp_wars-2yc.42): the live look does not preload it, and the classic
 * look, which draws it, does.
 *
 * The live resolvers ask the direction's registry first for a unit, a
 * city, the Village and an improvement (`createDirectedChibiArtV7`,
 * `createChibiDomArtV7` with `preferred`), so the default raster of such a
 * subject is a stand-in once the direction registers the subject. Not the
 * shared ships: a faction's ship without a raster of its own is drawn as
 * the classic shared ship in the owner's colour, never the Human direction
 * ship (`navalSharedSubjectV7`). Every other class is left in the live
 * look whole, because the board resolves it from the default registry
 * whatever the direction registers: terrain, resources, icons, effects,
 * statuses, and the portraits (the belly badge of an Abomination that has
 * swallowed a unit draws the victim's default portrait).
 * tests/unit/asset-tiers-ui-v7.test.ts resolves every subject through the
 * live resolvers and fails when one of them asks for a file this names.
 */
export function liveFallbackOnlyAssetV7(asset: ChibiArtAssetV7): boolean {
  const { subject } = asset;
  const kind = subject.split(":")[0] ?? "";
  if (!DIRECTION_FIRST_CLASSES.has(kind) && subject !== "SITE:VILLAGE")
    return false;
  if (navalArtRoleOfSubjectV7(subject) !== null) return false;
  directionSubjects ??= new Set(
    chibiDirectionArtAssetsV7().map((entry) => entry.subject),
  );
  return directionSubjects.has(subject);
}

/**
 * The CHIBI set without the visual direction: what the classic look draws.
 * With `live`, only the part of it the live look draws too.
 */
function classicEntries(live = false): AssetInventoryEntryV7[] {
  return [
    ...registered(
      live
        ? CHIBI_ART_ASSETS_V7.filter((asset) => !liveFallbackOnlyAssetV7(asset))
        : CHIBI_ART_ASSETS_V7,
    ),
    // Composed terrain: forest pieces and clumps, massifs, mined mountains.
    ...[
      ...CHIBI_FOREST_ART_SET_V7.pieces,
      ...CHIBI_FOREST_ART_SET_V7.clumps,
      ...CHIBI_MOUNTAIN_ART_SET_V7.pieces,
      ...CHIBI_MOUNTAIN_ART_SET_V7.mined,
    ].map(({ url }) => ({ url, group: "SHARED" as const })),
    // Territory ground of each faction. The board loads the set whole,
    // whoever plays (15 files of 0.6 kB), so it loads with the shared art.
    ...FACTION_GRASS_TILES_V7.map((tile) => ({
      url: tile.url,
      group: tile.id satisfies AssetGroupV7,
      front: true as const,
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
 * icons, effects), so it contains that part of the classic look. The
 * default rasters it would draw only in place of a direction raster that
 * failed to load (`liveFallbackOnlyAssetV7`, about 110 files) are the
 * classic look's alone: they load when the player switches to it, and on
 * demand should a direction raster ever fail.
 */
export function assetInventoryV7(
  look: AssetLookV7,
): readonly AssetInventoryEntryV7[] {
  return unique(
    look === "CLASSIC"
      ? classicEntries()
      : [...classicEntries(true), ...registered(chibiDirectionArtAssetsV7())],
  );
}

/** The look whose inventory the classic-look option draws. */
export function assetLookV7(classicLook = false): AssetLookV7 {
  return classicLook ? "CLASSIC" : "LIVE";
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

/** The faction tiers of a look. */
export type AssetFactionTierV7 = Exclude<AssetGroupV7, "SHARED">;

export interface AssetTiersV7 {
  /**
   * What the title waits for: `first` (the loading screen's scene) in its
   * order, then the shared art and the factions' files asked for whoever
   * plays (`frontTierSubjectV7`).
   */
  readonly front: readonly string[];
  /** Each faction's own files, none of them in `front`. */
  readonly factions: Readonly<
    Partial<Record<AssetFactionTierV7, readonly string[]>>
  >;
}

/**
 * The tiers of a look (bead pulp_wars-2yc.42): every file of its inventory
 * is in exactly one. FRONT is everything the screens before a match draw
 * and every match asks for (the shared art, which is also the Humans', the
 * emblems and the territory grounds); a faction's tier is what only a
 * board with that faction on it shows. The
 * start blocks on FRONT alone; the faction tiers load in the background,
 * and a board waits for those of its factions (`factionAssetUrlsV7`).
 *
 * `first` names files to put at the head of FRONT whatever their group
 * (the title scene draws a few faction units); files of `first` that the
 * inventory does not list (the scene's direction rasters, for the classic
 * look) are added.
 */
export function assetTiersV7(
  look: AssetLookV7,
  first: readonly string[] = [],
): AssetTiersV7 {
  const ahead = new Set(first);
  const front: string[] = [...ahead];
  const factions: Partial<Record<AssetFactionTierV7, string[]>> = {};
  for (const entry of assetInventoryV7(look)) {
    if (ahead.has(entry.url)) continue;
    if (entry.group === "SHARED" || entry.front === true) front.push(entry.url);
    else (factions[entry.group] ??= []).push(entry.url);
  }
  return { front, factions };
}

/**
 * The faction-tier files a board between `factions` waits for. The Humans
 * (`ORIGINAL`) have none: they draw the shared art.
 */
export function factionAssetUrlsV7(
  tiers: AssetTiersV7,
  factions: readonly FactionIdV7[],
): readonly string[] {
  const urls: string[] = [];
  for (const faction of new Set(factions))
    if (faction !== "ORIGINAL") urls.push(...(tiers.factions[faction] ?? []));
  return urls;
}

/**
 * The sound files of the client (bead pulp_wars-2yc.20, docs/ui/SOUND.md
 * "Stock recordings"): the file of every sound effect of the audio
 * manifest that names one. The game's start fetches them beside the art,
 * without waiting for them (src/app/v7-preload-boot.ts); a sound whose
 * file has not arrived plays its synthesised fallback.
 *
 * No theme is listed (bead pulp_wars-2yc.27): a theme is megabytes, so its
 * file is fetched when it is first played, one theme at a time.
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
    const entry = playableSoundV1(id);
    if (entry === null || entry.category === "music") continue;
    const source = entry.source;
    if (source.kind !== "FILE") continue;
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
