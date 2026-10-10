import type { FactionIdV7 } from "../engine/index";
import {
  SOUND_THEMES_V1,
  SOUND_TITLE_THEME_ID_V1,
  soundThemeOfFactionV1,
  type SoundThemeEntryV1,
  type SoundThemeIdV1,
} from "./sound-manifest";

/**
 * Which theme belongs to the screen (bead pulp_wars-2yc.27,
 * docs/ui/SOUND.md "Where the themes play"). A pure function: the
 * interface describes what is shown and hands the answer to the audio.
 */
export type MusicSceneV1 =
  /** The main menu, Campaign, Settings, the Gallery, the recovery screen. */
  | { readonly kind: "MENU" }
  /**
   * New game. `preview` is the faction the player last chose as their own
   * on this visit; null until they choose one.
   */
  | { readonly kind: "SETUP"; readonly preview: FactionIdV7 | null }
  /** The Gallery's Sounds tab: silent, so that its sounds can be heard. */
  | { readonly kind: "SOUNDS" }
  /**
   * A match, its end screen included. `viewer` is the faction of the
   * player the screen is shown to: in a match several people play on one
   * screen it changes at the hand-over, never for an AI's turn.
   */
  | { readonly kind: "MATCH"; readonly viewer: FactionIdV7 };

/**
 * The faction whose theme stands in for a faction that has none of its own
 * yet. The Cultists (offered by `pulp_wars-mch9.20`) have no recording:
 * until theirs is made they march to the Undead's, the nearest in mood (a
 * mock-sinister procession), so a Cult player's match is not silent. A
 * stand-in is only ever played; the Gallery's Sounds tab still shows the
 * faction's own row as "Coming soon". Remove the entry when the faction's
 * theme is registered in `theme-music.json` (its own theme wins anyway).
 */
export const STAND_IN_THEME_FACTIONS_V1: Readonly<
  Partial<Record<FactionIdV7, FactionIdV7>>
> = Object.freeze({ CULT: "UNDEAD" });

/** A faction's own theme, else its stand-in's ({@link STAND_IN_THEME_FACTIONS_V1}). */
export function playedThemeOfFactionV1(
  faction: FactionIdV7,
  themes: readonly SoundThemeEntryV1[] = SOUND_THEMES_V1,
): SoundThemeEntryV1 | null {
  const own = soundThemeOfFactionV1(faction, themes);
  if (own !== null) return own;
  const standIn = STAND_IN_THEME_FACTIONS_V1[faction];
  return standIn === undefined ? null : soundThemeOfFactionV1(standIn, themes);
}

/**
 * The theme a scene plays, or null for none: the title theme on the menus,
 * the chosen faction's theme on New game once one was chosen, the viewer's
 * own faction's theme for the whole of a match. A faction with no theme of
 * its own plays its stand-in's ({@link STAND_IN_THEME_FACTIONS_V1}); one
 * with neither leaves the title theme (in a match: silence).
 */
export function themeForSceneV1(
  scene: MusicSceneV1,
  themes: readonly SoundThemeEntryV1[] = SOUND_THEMES_V1,
): SoundThemeIdV1 | null {
  const title =
    themes.find((theme) => theme.id === SOUND_TITLE_THEME_ID_V1)?.id ?? null;
  switch (scene.kind) {
    case "MENU":
      return title;
    case "SETUP":
      return scene.preview === null
        ? title
        : (playedThemeOfFactionV1(scene.preview, themes)?.id ?? title);
    case "SOUNDS":
      return null;
    case "MATCH":
      return playedThemeOfFactionV1(scene.viewer, themes)?.id ?? null;
  }
}
