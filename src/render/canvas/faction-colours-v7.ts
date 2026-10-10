import type { FactionIdV7, PlayerViewV7 } from "../../engine/index";

/**
 * The permanent colour of each faction (bead pulp_wars-b5f.4,
 * docs/art/FACTION_COLOURS.md): the one owner colour of Ruleset 7. Every
 * player plays a different faction (docs/product/RULESET_7_UNIQUE_FACTIONS.md),
 * so the faction's colour names the player: the territory border, the
 * interface (leaderboard swatch, portraits' owner areas) and, in the Classic
 * look and the LEGACY art set, the owner recolour of units and cities. The
 * engine's seat `color` is not shown anywhere.
 *
 * Chosen by measurement (FACTION_COLOURS.md): every pair at least 49 apart
 * in CIE76, 20 under deuteranopia and 26 under protanopia, and every colour
 * readable on Grass, Snow, both waters and Mountain ground.
 */
export const FACTION_COLOURS_V7 = {
  /** Heraldic crimson: the Human cloth `#a8202c`, lifted to read. */
  ORIGINAL: "#d01c3a",
  /** The Undead's own lit violet accent. */
  UNDEAD: "#a221ee",
  /** Hazard yellow: the Goblins' explosive stripes `#fbc208`, lifted. */
  GOBLIN: "#fdd20f",
  /** The Dinosaurs' lit red-orange of crests and war paint. */
  DINOSAUR: "#fe7500",
  /** Hot magenta: the Martian ray emitters and running lights. */
  MARTIAN: "#e83aae",
  /** Ice blue: the Ice Folk ice accent `#37b1fa`, deepened for Snow. */
  ICE_FOLK: "#10b8ff",
  /** Signal green: the Dwarf gauge lamp, moved off the Grass toward jade. */
  DWARF: "#2db885",
  /**
   * Cotton-candy pink (root ruling, docs/product/RULESET_7_CANDY.md section
   * 15.4): the Candy glaze and frosting.
   */
  CANDY: "#ffb8d8",
  /**
   * Eldritch green (docs/product/RULESET_7_CULTISTS.md section 14.2): the
   * Cult's green flame. The candidate of the Cult proposal's colour test;
   * the capture beside the Dwarf jade is the art-direction bead's
   * (`pulp_wars-mch9.13`), which may move it.
   */
  CULT: "#00ff78",
} as const satisfies Readonly<Record<FactionIdV7, string>>;

export function factionColourV7(faction: FactionIdV7): string {
  return FACTION_COLOURS_V7[faction];
}

/** The owner colour of a player in a view; undefined for an unknown id. */
export function playerFactionColourV7(
  view: Pick<PlayerViewV7, "players">,
  playerId: number | null | undefined,
): string | undefined {
  if (playerId === null || playerId === undefined) return undefined;
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player === undefined ? undefined : factionColourV7(player.faction);
}

/** The lighter and darker shades of a faction colour (bead pulp_wars-b5f.3). */
export interface FactionColourShadesV7 {
  /** The faction colour itself. */
  readonly base: string;
  /** Toward white: the glow or highlight of the colour. */
  readonly glow: string;
  /** Toward black: the outline or shade of the colour. */
  readonly dark: string;
}

function mixHexV7(colour: string, toward: number, share: number): string {
  const channel = (offset: number): string => {
    const value = Number.parseInt(colour.slice(offset, offset + 2), 16);
    return Math.round(value + (toward - value) * share)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

/**
 * The shades of a faction colour, derived here so that every code-drawn
 * cue in that colour reads this one source. The Mind Control revision's
 * control visual is the Martian colour with its glow and dark shades
 * (docs/product/RULESET_7_MIND_CONTROL.md section 9).
 */
export function factionColourShadesV7(
  faction: FactionIdV7,
): FactionColourShadesV7 {
  const base = factionColourV7(faction);
  return {
    base,
    glow: mixHexV7(base, 255, 0.5),
    dark: mixHexV7(base, 0, 0.55),
  };
}
