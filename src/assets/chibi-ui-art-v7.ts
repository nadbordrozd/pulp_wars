import type {
  CommandV7,
  FactionIdV7,
  ImprovementIdV7,
  NavalRoleIdV7,
  RewardIdV7,
  TechnologyIdV7,
  UnitRoleIdV7,
} from "../engine/index";
import {
  factionHasImprovementLookV7,
  navalArtSubjectV7,
  type ArtSubjectV7,
  type DinosaurArtRoleV7,
  type CandyArtRoleV7,
  type DwarfArtRoleV7,
  type GoblinArtRoleV7,
  type IceFolkArtRoleV7,
  type MartianArtRoleV7,
  navalArtRoleForV7,
  type UndeadArtRoleV7,
} from "./chibi-art-v7";

/**
 * CHIBI art subjects of the Ruleset 7 interface (bead pulp_wars-67q.11).
 * The DOM asks for these through src/render/dom/chibi-dom-art-v7.ts; any
 * subject without a registered raster keeps its legacy art (the IDs in
 * ruleset7-ui-art.ts), exactly as the canvas falls back per subject.
 *
 * Portraits (`PORTRAIT:*`) are head-and-shoulders busts for the 48 px
 * recruitment tiles and the recruitment-flavoured cards (train buttons,
 * recruit help, the Militia and Juggernaut rewards, the Administration,
 * Scouting and Marksmanship technologies). A selected unit on the map keeps
 * its map sprite in the dock, as in LEGACY.
 */

// The naval branch (beads pulp_wars-5ti.2 and 5ti.6): the Submarine is a
// ship with a portrait of its own per faction (navalArtRoleForV7).
const NAVAL_ROLES: readonly UnitRoleIdV7[] = [
  "PATROL_BOAT",
  "BATTLESHIP",
  "SUBMARINE",
];

/**
 * The portrait of a role for a faction: Undead, (revision 17, bead
 * pulp_wars-0ao.8) Goblin, (revision 19, bead pulp_wars-c87.7) Dinosaur,
 * (bead pulp_wars-t6s.4) Martian, (bead pulp_wars-7g3.6) Ice Folk and (bead
 * pulp_wars-78i.6) Dwarf land roles have their own; so does every faction's Patrol Boat and Battleship
 * (`PORTRAIT:<FACTION>:<ROLE>`, the Humans' `PORTRAIT:<ROLE>`, bead
 * pulp_wars-w5j.3). A mind-controlled unit's portrait is its kind's (bead
 * pulp_wars-b5f.3).
 */
export function portraitSubjectV7(
  role: UnitRoleIdV7,
  faction: FactionIdV7,
): ArtSubjectV7 {
  if (NAVAL_ROLES.includes(role))
    return navalArtSubjectV7(
      faction,
      "PORTRAIT",
      navalArtRoleForV7(role as NavalRoleIdV7),
    );
  if (faction === "UNDEAD") return `PORTRAIT:UNDEAD:${role as UndeadArtRoleV7}`;
  if (faction === "GOBLIN") return `PORTRAIT:GOBLIN:${role as GoblinArtRoleV7}`;
  if (faction === "DINOSAUR")
    return `PORTRAIT:DINOSAUR:${role as DinosaurArtRoleV7}`;
  if (faction === "MARTIAN")
    return `PORTRAIT:MARTIAN:${role as MartianArtRoleV7}`;
  if (faction === "ICE_FOLK")
    return `PORTRAIT:ICE_FOLK:${role as IceFolkArtRoleV7}`;
  if (faction === "DWARF") return `PORTRAIT:DWARF:${role as DwarfArtRoleV7}`;
  if (faction === "CANDY") return `PORTRAIT:CANDY:${role as CandyArtRoleV7}`;
  return `PORTRAIT:${role}`;
}

/** Map subject of an improvement; a Mine is drawn as its mined mountain. */
export function improvementSubjectV7(
  improvement: ImprovementIdV7,
): ArtSubjectV7 {
  return improvement === "MINE"
    ? "TERRAIN:MINED_MOUNTAIN"
    : `IMPROVEMENT:${improvement}`;
}

/**
 * The subject of an improvement as a faction owns it (epic pulp_wars-xdh,
 * docs/art/FACTION_BUILDINGS.md): `IMPROVEMENT:<FACTION>:<ID>` for the few
 * buildings a faction draws in a look of its own (the Undead Graveyard for
 * the Farm, the Martian Solar Array for the Windmill, ...), and
 * `improvementSubjectV7` for every other one. The board asks with the
 * faction that owns the improvement's territory, the build buttons and the
 * technology cards with the viewer's faction, and the Gallery (bead
 * pulp_wars-ic8) with each faction, so its Buildings tab shows one column
 * per faction for exactly these rows. A faction subject without a usable
 * raster falls back to the shared building (chibiFallbackSubjectV7).
 */
export function factionImprovementSubjectV7(
  improvement: ImprovementIdV7,
  faction: FactionIdV7 | null | undefined,
): ArtSubjectV7 {
  return factionHasImprovementLookV7(improvement, faction)
    ? `IMPROVEMENT:${faction}:${improvement}`
    : improvementSubjectV7(improvement);
}

/**
 * Technology card art. Where LEGACY reuses a map sprite, CHIBI reuses the
 * chibi map sprite of the same subject; where LEGACY reuses a portrait or an
 * action or reward icon, CHIBI reuses the chibi one. Fieldcraft,
 * Fortification and Navigation have dedicated icons (Navigation's legacy
 * art is a flat deep-water tile, which is no icon). Engineering shows the
 * Workshop it unlocks: the chibi Mountain carries its own grass tile and
 * reads as a map square on a card.
 */
export const CHIBI_TECH_ART_SUBJECTS_V7 = {
  GATHERING: "RESOURCE:FRUIT",
  FARMING: "IMPROVEMENT:FARM",
  MILLING: "IMPROVEMENT:WINDMILL",
  ADMINISTRATION: "PORTRAIT:CAPTAIN",
  PLANNING: "ICON:REWARD:EXPAND",
  HUNTING: "RESOURCE:GAME",
  FORESTRY: "IMPROVEMENT:LUMBER_CAMP",
  SAWMILLING: "IMPROVEMENT:SAWMILL",
  MARKSMANSHIP: "PORTRAIT:MARKSMAN",
  FIELDCRAFT: "ICON:TECH:FIELDCRAFT",
  SCOUTING: "PORTRAIT:RAIDER",
  ROADS: "ICON:ACTION:BUILD_ROAD",
  COMMERCE: "IMPROVEMENT:MARKET",
  RAIDING: "ICON:ACTION:PILLAGE",
  CHIVALRY: "UNIT:KNIGHT",
  DRILL: "UNIT:GUARD",
  ENGINEERING: "IMPROVEMENT:WORKSHOP",
  METALLURGY: "IMPROVEMENT:FORGE",
  FORTIFICATION: "ICON:TECH:FORTIFICATION",
  EXPLOSIVES: "ICON:ACTION:BLAST_MOUNTAIN",
  SHORECRAFT: "IMPROVEMENT:PORT",
  NAVIGATION: "ICON:TECH:NAVIGATION",
  NAVAL_ENGINEERING: "UNIT:BATTLESHIP",
  // The naval branch (bead pulp_wars-5ti.6): dedicated icons shared by
  // every faction, the ship's wheel with a grappling hook (Ram and Board)
  // and the diving helmet (the Submarine and Harbours).
  SEAMANSHIP: "ICON:TECH:SEAMANSHIP",
  SUBMERSIBLES: "ICON:TECH:SUBMERSIBLES",
} as const satisfies Readonly<Record<TechnologyIdV7, ArtSubjectV7>>;

/** The Ice Folk cards of the Naval branch (see `technologySubjectV7`). */
export const ICE_FOLK_NAVAL_TECH_SUBJECTS_V7: Readonly<
  Partial<Record<TechnologyIdV7, ArtSubjectV7>>
> = {
  SHORECRAFT: "ICON:STATUS:CHILLED",
  NAVIGATION: "EFFECT:SHATTER_SHARDS",
  NAVAL_ENGINEERING: "OVERLAY:ICEBOUND",
  SEAMANSHIP: "EFFECT:COLD_SNAP",
  SUBMERSIBLES: "ICON:STATUS:FROZEN",
};

/**
 * Technology art for a viewer's faction: the units and portraits a
 * technology shows follow the faction (an Undead Drill shows the Zombie, a
 * Goblin Drill the Orc Brute, a Dinosaur Drill the Ankylosaurus, a Martian
 * Drill the Shield Projector, an Ice Folk Drill the Mammoth). The Martian
 * Force Fields (`FORTIFICATION`) shows the Force Field icon of the Martian
 * art; the Ice Folk Deep Winter and Brittle (`FORTIFICATION`,
 * `EXPLOSIVES`) their own technology icons (bead pulp_wars-7g3.6), and so
 * do the Dwarf Dig In and Blasting Charges (bead pulp_wars-78i.6); a Dwarf
 * Drill shows the Steam Mole.
 */
export function technologySubjectV7(
  tech: TechnologyIdV7,
  faction: FactionIdV7,
): ArtSubjectV7 {
  const subject: ArtSubjectV7 = CHIBI_TECH_ART_SUBJECTS_V7[tech];
  if (faction === "ORIGINAL") return subject;
  if (faction === "MARTIAN" && tech === "FORTIFICATION")
    return "ICON:ACTION:FORCE_FIELD";
  if (
    faction === "ICE_FOLK" &&
    (tech === "FORTIFICATION" || tech === "EXPLOSIVES")
  )
    return `ICON:TECH:ICE_FOLK:${tech}`;
  // The frozen sea (bead pulp_wars-5ti.7): the Ice Folk Naval branch has no
  // ship, so its cards show the ice instead of a Port, a compass, a wheel,
  // a Battleship and a diving helmet: Rime the frost of Chill, Pack Ice
  // the drifting floes, Icebound the pack ice, Black Ice the frost ring and
  // Glacier the ice block. Stand-ins of registered art until the faction
  // has icons of its own for them.
  if (faction === "ICE_FOLK") {
    const frozen = ICE_FOLK_NAVAL_TECH_SUBJECTS_V7[tech];
    if (frozen !== undefined) return frozen;
  }
  if (
    faction === "DWARF" &&
    (tech === "FORTIFICATION" || tech === "EXPLOSIVES")
  )
    return `ICON:TECH:DWARF:${tech}`;
  // The Candy Home Sweet Home and Peppermint Surprise (bead pulp_wars-jdb.6).
  if (
    faction === "CANDY" &&
    (tech === "FORTIFICATION" || tech === "EXPLOSIVES")
  )
    return `ICON:TECH:CANDY:${tech}`;
  if (subject.startsWith("PORTRAIT:"))
    return portraitSubjectV7(
      subject.slice("PORTRAIT:".length) as UnitRoleIdV7,
      faction,
    );
  if (subject === "UNIT:KNIGHT" || subject === "UNIT:GUARD") {
    const role = subject.slice("UNIT:".length) as UndeadArtRoleV7;
    if (faction === "UNDEAD") return `UNIT:UNDEAD:${role}`;
    if (faction === "DINOSAUR") return `UNIT:DINOSAUR:${role}`;
    if (faction === "MARTIAN") return `UNIT:MARTIAN:${role}`;
    if (faction === "ICE_FOLK") return `UNIT:ICE_FOLK:${role}`;
    if (faction === "DWARF") return `UNIT:DWARF:${role}`;
    if (faction === "CANDY") return `UNIT:CANDY:${role}`;
    return `UNIT:GOBLIN:${role}`;
  }
  // A technology that shows a building shows the faction's own look of it
  // (epic pulp_wars-xdh): an Undead Farming card shows the Graveyard.
  if (subject.startsWith("IMPROVEMENT:"))
    return factionImprovementSubjectV7(
      subject.slice("IMPROVEMENT:".length) as ImprovementIdV7,
      faction,
    );
  // Naval Engineering shows the faction's own Battleship (bead
  // pulp_wars-w5j.3).
  if (subject === "UNIT:BATTLESHIP")
    return navalArtSubjectV7(faction, "UNIT", "BATTLESHIP");
  return subject;
}

const RESOURCE_COMMANDS: Partial<Record<CommandV7["kind"], ArtSubjectV7>> = {
  HARVEST_FRUIT: "RESOURCE:FRUIT",
  HUNT_GAME: "RESOURCE:GAME",
  HARVEST_FISH: "RESOURCE:FISH",
  GATHER_PEARLS: "RESOURCE:PEARLS",
  CAPTURE: "SITE:VILLAGE",
  LAND_GRANT: "ICON:REWARD:EXPAND",
  BUILD_MONUMENT: "IMPROVEMENT:MONUMENT",
};

/**
 * Art of a command button, or null for commands drawn without art (Move and
 * Attack are map-targeted; Field Defense keeps its vector tactical symbol).
 * Build commands show the chibi building, harvests the chibi resource,
 * training the faction's portrait, the Undead Rally is Frenzy and the Goblin
 * Rally is WAAAGH! (the Warboss's tin megaphone, bead pulp_wars-0ao.14).
 * Kaboom! is `ICON:ACTION:KABOOM`, the PixelLab bomb; without a raster (and
 * always in LEGACY) it keeps its code-drawn bomb glyph. The Dinosaur Rally
 * is War Drums (`ICON:ACTION:DINOSAUR:RALLY`), and Lay Egg and Hatch are
 * `ICON:ACTION:LAY_EGG` and `ICON:ACTION:HATCH` (bead pulp_wars-c87.7).
 * `ICON:ACTION:STAMPEDE` is not a command icon since revision 20: it marks
 * the Triceratops's Charge! ability in the unit information. The Martian
 * Rally is Psychic Command (`ICON:ACTION:MARTIAN:RALLY`); Beam Down, Mind
 * Control and Tractor Beam are `ICON:ACTION:<KIND>` (bead pulp_wars-t6s.4),
 * as are the Ice Folk Bolas and Cold Snap (`ICON:ACTION:THROW_BOLAS`,
 * `ICON:ACTION:COLD_SNAP`, bead pulp_wars-7g3.6), and the Dwarf Tunnel, Bomb
 * Run and Assemble (`ICON:ACTION:TUNNEL`, `ICON:ACTION:BOMB_RUN`,
 * `ICON:ACTION:ASSEMBLE`, bead pulp_wars-78i.6); the Dwarf Tend Wounded is
 * Repair (`ICON:ACTION:DWARF:TEND_WOUNDED`). Disembark shows the faction's
 * transport (bead pulp_wars-w5j.3).
 */
export function commandSubjectV7(
  command: CommandV7,
  faction: FactionIdV7,
): ArtSubjectV7 | null {
  switch (command.kind) {
    case "MOVE":
    case "ATTACK":
    case "BUILD_FIELD_DEFENSE":
      return null;
    case "RESEARCH":
      return technologySubjectV7(command.tech, faction);
    case "TRAIN":
    case "TRAIN_NAVAL":
      return portraitSubjectV7(command.role, faction);
    // The faction's own transport (bead pulp_wars-w5j.3).
    case "DISEMBARK":
      return navalArtSubjectV7(faction, "UNIT", "EMBARKED_TRANSPORT");
    case "CHOOSE_CITY_REWARD":
      return rewardSubjectV7(command.reward, faction);
    case "RALLY":
      if (faction === "UNDEAD") return "ICON:ACTION:UNDEAD:RALLY";
      if (faction === "GOBLIN") return "ICON:ACTION:GOBLIN:RALLY";
      if (faction === "DINOSAUR") return "ICON:ACTION:DINOSAUR:RALLY";
      if (faction === "MARTIAN") return "ICON:ACTION:MARTIAN:RALLY";
      return "ICON:ACTION:RALLY";
    case "TEND_WOUNDED":
      // The Candy Tend Wounded is Frosting (bead pulp_wars-jdb.6).
      return faction === "DWARF"
        ? "ICON:ACTION:DWARF:TEND_WOUNDED"
        : faction === "CANDY"
          ? "ICON:ACTION:CANDY:TEND_WOUNDED"
          : "ICON:ACTION:TEND_WOUNDED";
    default:
      break;
  }
  const mapped = RESOURCE_COMMANDS[command.kind];
  if (mapped !== undefined) return mapped;
  if (command.kind.startsWith("BUILD_") && command.kind !== "BUILD_ROAD")
    // The viewer builds in its own territory, so the button shows its
    // faction's look of the building (epic pulp_wars-xdh).
    return factionImprovementSubjectV7(
      command.kind.slice("BUILD_".length) as ImprovementIdV7,
      faction,
    );
  return `ICON:ACTION:${command.kind}`;
}

/** City-reward art; the unit rewards show the viewer faction's portrait. */
export function rewardSubjectV7(
  reward: RewardIdV7,
  faction: FactionIdV7,
): ArtSubjectV7 {
  switch (reward) {
    case "SURVEY":
      return "ICON:REWARD:SURVEY";
    case "WALLS":
      return "ICON:REWARD:WALLS";
    case "STOCKPILE":
    case "TREASURY":
    case "TREASURY_6":
      return "ICON:HUD:COIN";
    case "BOOM":
      return "ICON:HUD:POPULATION";
    case "MILITIA":
      return portraitSubjectV7("FIGHTER", faction);
    case "JUGGERNAUT":
      return portraitSubjectV7("JUGGERNAUT", faction);
  }
}
