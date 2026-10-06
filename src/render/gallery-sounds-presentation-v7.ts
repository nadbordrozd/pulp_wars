import type { ArtSubjectV7 } from "../assets/chibi-art-v7";
import { portraitSubjectV7 } from "../assets/chibi-ui-art-v7";
import {
  OTHER_PLAYER_BUILD_GAIN_V7,
  SOUND_IDS_V1,
  SOUND_MANIFEST_V1,
  SOUND_THEMES_V1,
  playableRecipeV1,
  synthRecipeDurationMsV1,
  type SoundIdV1,
  type SoundKeyV1,
  type SoundThemeEntryV1,
} from "../audio/index";
import type { FactionIdV7, UnitRoleIdV7 } from "../engine/index";
import type { UiIconIdV7 } from "./dom/ui-icons-v7";
import {
  GALLERY_FACTIONS_V7,
  galleryUnitCellV7,
} from "./gallery-presentation-v7";
import { factionNameV7 } from "./undead-presentation-v7";

/**
 * The Gallery's Sounds tab (bead pulp_wars-2yc.19, docs/ui/SOUND.md "The
 * Gallery's Sounds tab"): every sound of the manifest, grouped the way the
 * manifest names them, each with a picture of what makes it and a few
 * words on when it plays; and one row per faction for its theme.
 *
 * The list is computed from `SOUND_IDS_V1` and `SOUND_THEMES_V1`, so a
 * sound or a theme added to the manifest appears here with no other
 * change. Pure data: no audio, no DOM.
 */

export type GallerySoundGroupIdV7 =
  | "ATTACKS"
  | "HITS"
  | "UNITS"
  | "ABILITIES"
  | "ECONOMY"
  | "MATCH"
  | "INTERFACE"
  | "OTHER"
  | "THEMES";

/** The groups in the order they are shown. */
export const GALLERY_SOUND_GROUP_IDS_V7: readonly GallerySoundGroupIdV7[] = [
  "ATTACKS",
  "HITS",
  "UNITS",
  "ABILITIES",
  "ECONOMY",
  "MATCH",
  "INTERFACE",
  "OTHER",
  "THEMES",
];

const GROUP_LABELS: Readonly<Record<GallerySoundGroupIdV7, string>> = {
  ATTACKS: "Attacks",
  HITS: "Hits",
  UNITS: "Units",
  ABILITIES: "Abilities",
  ECONOMY: "Cities and economy",
  MATCH: "Turn and match",
  INTERFACE: "Interface",
  OTHER: "Other",
  THEMES: "Themes",
};

/**
 * The group of a sound is the first part of its manifest id ("attack" of
 * "attack.melee"). An id with a part that is not listed here goes to
 * "Other", so a new kind of sound is still shown.
 */
const GROUP_OF_PREFIX: Readonly<Record<string, GallerySoundGroupIdV7>> = {
  attack: "ATTACKS",
  impact: "HITS",
  unit: "UNITS",
  support: "ABILITIES",
  special: "ABILITIES",
  city: "ECONOMY",
  village: "ECONOMY",
  reward: "ECONOMY",
  research: "ECONOMY",
  economy: "ECONOMY",
  turn: "MATCH",
  achievement: "MATCH",
  match: "MATCH",
  ui: "INTERFACE",
};

export function gallerySoundGroupOfV7(id: SoundIdV1): GallerySoundGroupIdV7 {
  return GROUP_OF_PREFIX[id.split(".")[0] ?? ""] ?? "OTHER";
}

/** The picture of an entry: game art, or an interface glyph. */
export type GallerySoundPictureV7 =
  | {
      readonly kind: "ART";
      readonly subject: ArtSubjectV7;
      /** The faction whose colour the art is drawn in, if it has one. */
      readonly faction: FactionIdV7 | null;
    }
  | { readonly kind: "ICON"; readonly icon: UiIconIdV7 };

/** One more way to hear a sound, beside its plain Play. */
export interface GallerySoundVariantV7 {
  readonly id: "LOW" | "HIGH" | "FAR";
  /** The accessible name's verb: "Play lower". */
  readonly label: string;
  /** Detune as a share of the sound's range (the mixer's `detune`). */
  readonly detune?: number;
  readonly gain?: number;
}

export interface GallerySoundEntryV7 {
  /**
   * The manifest id to play. Null for a faction whose theme is not in the
   * manifest yet: the row is shown, and nothing can be played.
   */
  readonly key: SoundKeyV1 | null;
  /** The entry's id in the page: the manifest id, or "theme:<FACTION>". */
  readonly rowId: string;
  readonly name: string;
  /** When it plays, in a few words. */
  readonly when: string;
  readonly picture: GallerySoundPictureV7;
  readonly variants: readonly GallerySoundVariantV7[];
  /** Long enough (or looping) to need a stop control. */
  readonly long: boolean;
  /** The faction of a theme row. */
  readonly faction: FactionIdV7 | null;
}

export interface GallerySoundGroupV7 {
  readonly id: GallerySoundGroupIdV7;
  readonly label: string;
  readonly entries: readonly GallerySoundEntryV7[];
}

/** A sound at least this long gets a stop control. */
export const GALLERY_SOUND_LONG_MS_V7 = 1000;

/** What a pending theme row says. */
export const GALLERY_THEME_PENDING_TEXT_V7 = "Coming soon";

function icon(id: UiIconIdV7): GallerySoundPictureV7 {
  return { kind: "ICON", icon: id };
}

function art(subject: ArtSubjectV7): GallerySoundPictureV7 {
  return { kind: "ART", subject, faction: null };
}

function unit(role: UnitRoleIdV7, faction: FactionIdV7): GallerySoundPictureV7 {
  return { kind: "ART", subject: portraitSubjectV7(role, faction), faction };
}

/** The unit's own name in its faction ("Lich", "Rocket Cart"). */
function unitName(role: UnitRoleIdV7, faction: FactionIdV7): string {
  const cell = galleryUnitCellV7(role, faction);
  return cell.kind === "UNIT" ? cell.name : factionNameV7(faction);
}

interface SoundNoteV7 {
  readonly when: string;
  readonly picture: GallerySoundPictureV7;
}

/**
 * When each sound plays and what makes it, after the event mapping of
 * `sound-events-v7.ts` (docs/ui/SOUND.md "Event mapping"). A sound without
 * a note here is still listed, with the loudspeaker glyph and no words; a
 * unit test names it.
 */
const NOTES: Readonly<Partial<Record<SoundIdV1, SoundNoteV7>>> = {
  "attack.melee": {
    when: "Melee attack",
    picture: unit("FIGHTER", "ORIGINAL"),
  },
  "attack.ranged": {
    when: "Ranged attack",
    picture: unit("MARKSMAN", "ORIGINAL"),
  },
  "attack.siege": {
    when: "Siege attack",
    picture: unit("CATAPULT", "ORIGINAL"),
  },
  "attack.ray": {
    when: "Martian ray",
    picture: unit("FIGHTER", "MARTIAN"),
  },
  "attack.magic": {
    when: `${unitName("CATAPULT", "UNDEAD")} attacks`,
    picture: unit("CATAPULT", "UNDEAD"),
  },
  "attack.rocket": {
    when: `${unitName("CATAPULT", "GOBLIN")} attacks`,
    picture: unit("CATAPULT", "GOBLIN"),
  },
  "attack.gatling": {
    when: `${unitName("MARKSMAN", "DWARF")} attacks`,
    picture: unit("MARKSMAN", "DWARF"),
  },
  "attack.cannon": {
    when: `${unitName("CATAPULT", "DWARF")} attacks`,
    picture: unit("CATAPULT", "DWARF"),
  },
  "attack.pop": {
    when: `${unitName("MARKSMAN", "CANDY")} attacks`,
    picture: unit("MARKSMAN", "CANDY"),
  },
  "impact.hit": { when: "Attack lands", picture: icon("attack") },
  "impact.heavy": { when: "Siege or charge lands", picture: icon("stampede") },
  "impact.explosion": { when: "Bomb or rocket bursts", picture: icon("bomb") },
  "impact.ice": { when: "Ice breaks", picture: icon("ice-peak") },
  "impact.splat": {
    when: "Pie or acid lands",
    picture: unit("CATAPULT", "CANDY"),
  },
  "impact.shield": { when: "Shield takes a hit", picture: icon("shield") },
  "impact.splash": { when: "Splash, ice melts", picture: icon("periscope") },
  "unit.hurt": { when: "Unit damaged", picture: icon("hp") },
  "unit.death": { when: "Unit dies", picture: icon("skull") },
  "unit.step": { when: "Your unit moves", picture: icon("move") },
  "unit.train": { when: "New unit joins", picture: icon("units") },
  "unit.levelup": { when: "Unit promoted", picture: icon("defense") },
  "support.heal": {
    when: "Unit healed",
    picture: art("ICON:ACTION:TEND_WOUNDED"),
  },
  "support.rally": {
    when: "Rally, Prize flag",
    picture: art("ICON:ACTION:RALLY"),
  },
  "support.dark": { when: "Undead powers", picture: icon("grave") },
  "support.drain": { when: "Lifesteal", picture: icon("bite") },
  "special.beam": {
    when: "Beam Down, Tractor Beam",
    picture: icon("beam-down"),
  },
  "special.mind": { when: "Unit mind-controlled", picture: icon("brain") },
  "special.freeze": { when: "Freeze, Cold Snap", picture: icon("snowflake") },
  "special.burrow": { when: "Tunnel", picture: icon("drill") },
  "special.hatch": { when: "Egg hatches", picture: icon("hatch") },
  "special.pop": { when: "Egg laid, crash ends", picture: icon("egg") },
  "special.puff": { when: "Knockback", picture: icon("cooling") },
  "special.sparkle": {
    when: "Blessing, Sugar Rush",
    picture: art("ICON:CURIOSITY:SHRINE"),
  },
  "special.dizzy": { when: "Sugar crash", picture: unit("RAIDER", "CANDY") },
  "special.boing": {
    when: "Candy unit bounces",
    picture: unit("GUARD", "CANDY"),
  },
  "city.capture": { when: "You take a city", picture: art("CITY:3") },
  "village.capture": {
    when: "You take a village",
    picture: art("SITE:VILLAGE"),
  },
  "city.lost": { when: "You lose a city", picture: art("CITY:1") },
  "city.levelup": { when: "City grows", picture: art("CITY:2") },
  "reward.chosen": {
    when: "City reward chosen",
    picture: art("ICON:REWARD:SURVEY"),
  },
  "research.complete": { when: "Technology researched", picture: icon("tech") },
  "economy.build": {
    when: "Building built",
    picture: art("IMPROVEMENT:WORKSHOP"),
  },
  "economy.harvest": {
    when: "Harvest, hunt, fishing",
    picture: art("RESOURCE:FRUIT"),
  },
  "economy.coin": { when: "Coins gained", picture: art("ICON:HUD:COIN") },
  "economy.treasure": { when: "Treasure found", picture: art("TREASURE") },
  "turn.start": { when: "Your turn starts", picture: icon("flag") },
  "turn.end": { when: "You end your turn", picture: icon("skip") },
  "achievement.unlocked": {
    when: "Achievement earned",
    picture: icon("trophy"),
  },
  "achievement.monument": {
    when: "Monument built",
    picture: art("IMPROVEMENT:MONUMENT"),
  },
  "match.victory": { when: "Match won", picture: icon("trophy") },
  "match.defeat": { when: "Match lost", picture: icon("skull") },
  "ui.select": { when: "Something selected", picture: icon("range") },
  "ui.click": { when: "Button pressed", picture: icon("menu") },
  "ui.toggle": { when: "Sound switched", picture: icon("sound") },
  "ui.error": { when: "Command refused", picture: icon("close") },
};

/** The sounds the Gallery has written a note for (a test hook). */
export function gallerySoundHasNoteV7(id: SoundIdV1): boolean {
  return NOTES[id] !== undefined;
}

/**
 * The other ways the game plays a sound. A detuned sound is played a
 * little flat or sharp at random, so its two ends are offered; a building
 * of another player is heard quieter than one's own.
 */
function variantsOf(id: SoundIdV1): readonly GallerySoundVariantV7[] {
  const variants: GallerySoundVariantV7[] = [];
  if (SOUND_MANIFEST_V1[id].jitterCents > 0)
    variants.push(
      { id: "LOW", label: "Play lower", detune: -1 },
      { id: "HIGH", label: "Play higher", detune: 1 },
    );
  if (id === "economy.build")
    variants.push({
      id: "FAR",
      label: "Play as another player's",
      gain: OTHER_PLAYER_BUILD_GAIN_V7,
    });
  return variants;
}

function effectEntry(id: SoundIdV1): GallerySoundEntryV7 {
  const note = NOTES[id];
  const recipe = playableRecipeV1(id);
  return {
    key: id,
    rowId: id,
    name: SOUND_MANIFEST_V1[id].label,
    when: note?.when ?? "",
    picture: note?.picture ?? icon("sound"),
    variants: variantsOf(id),
    long:
      recipe === null ||
      synthRecipeDurationMsV1(recipe) >= GALLERY_SOUND_LONG_MS_V7,
    faction: null,
  };
}

/** A faction's row: its theme when the manifest has one, else pending. */
function themeEntry(
  faction: FactionIdV7,
  themes: readonly SoundThemeEntryV1[],
): GallerySoundEntryV7 {
  const theme = themes.find((entry) => entry.faction === faction);
  return {
    key: theme?.id ?? null,
    rowId: `theme:${faction}`,
    name: factionNameV7(faction),
    when: theme === undefined ? GALLERY_THEME_PENDING_TEXT_V7 : "Theme",
    // The faction's emblem in the Gallery: its Fighter's portrait.
    picture: unit("FIGHTER", faction),
    variants: [],
    long: true,
    faction,
  };
}

/**
 * The Sounds tab: the non-empty effect groups in order, then Themes with
 * one row per faction of the game. `themes` is the manifest's list (a test
 * passes its own).
 */
export function gallerySoundGroupsV7(
  themes: readonly SoundThemeEntryV1[] = SOUND_THEMES_V1,
): readonly GallerySoundGroupV7[] {
  const groups: GallerySoundGroupV7[] = [];
  for (const id of GALLERY_SOUND_GROUP_IDS_V7) {
    const entries =
      id === "THEMES"
        ? GALLERY_FACTIONS_V7.map((faction) => themeEntry(faction, themes))
        : SOUND_IDS_V1.filter(
            (sound) => gallerySoundGroupOfV7(sound) === id,
          ).map(effectEntry);
    if (entries.length > 0)
      groups.push({ id, label: GROUP_LABELS[id], entries });
  }
  return groups;
}

/** "Play: Hit", "Play lower: Hit": the accessible name of a play control. */
export function gallerySoundPlayLabelV7(
  entry: GallerySoundEntryV7,
  variant: GallerySoundVariantV7 | null = null,
): string {
  const name = entry.faction === null ? entry.name : `${entry.name} theme`;
  return `${variant?.label ?? "Play"}: ${name}`;
}
