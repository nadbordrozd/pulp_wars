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
