import type {
  CommandV7,
  FactionIdV7,
  ImprovementIdV7,
  RewardIdV7,
  TechnologyIdV7,
  UnitRoleIdV7,
} from "../engine/index";
import type {
  ArtSubjectV7,
  DinosaurArtRoleV7,
  GoblinArtRoleV7,
  UndeadArtRoleV7,
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

const NAVAL_ROLES: readonly UnitRoleIdV7[] = ["PATROL_BOAT", "BATTLESHIP"];

/**
 * The portrait of a role for a faction: Undead, (revision 17, bead
 * pulp_wars-0ao.8) Goblin and (revision 19, bead pulp_wars-c87.7) Dinosaur
 * land roles have their own; naval roles share the Human ship portraits.
 */
export function portraitSubjectV7(
  role: UnitRoleIdV7,
  faction: FactionIdV7,
): ArtSubjectV7 {
  if (NAVAL_ROLES.includes(role)) return `PORTRAIT:${role}`;
  if (faction === "UNDEAD") return `PORTRAIT:UNDEAD:${role as UndeadArtRoleV7}`;
  if (faction === "GOBLIN") return `PORTRAIT:GOBLIN:${role as GoblinArtRoleV7}`;
  if (faction === "DINOSAUR")
    return `PORTRAIT:DINOSAUR:${role as DinosaurArtRoleV7}`;
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
} as const satisfies Readonly<Record<TechnologyIdV7, ArtSubjectV7>>;

/**
 * Technology art for a viewer's faction: the units and portraits a
 * technology shows follow the faction (an Undead Drill shows the Zombie, a
 * Goblin Drill the Orc Brute, a Dinosaur Drill the Ankylosaurus).
 */
export function technologySubjectV7(
  tech: TechnologyIdV7,
  faction: FactionIdV7,
): ArtSubjectV7 {
  const subject: ArtSubjectV7 = CHIBI_TECH_ART_SUBJECTS_V7[tech];
  if (faction === "ORIGINAL") return subject;
  if (subject.startsWith("PORTRAIT:"))
    return portraitSubjectV7(
      subject.slice("PORTRAIT:".length) as UnitRoleIdV7,
      faction,
    );
  if (subject === "UNIT:KNIGHT" || subject === "UNIT:GUARD") {
    const role = subject.slice("UNIT:".length) as UndeadArtRoleV7;
    if (faction === "UNDEAD") return `UNIT:UNDEAD:${role}`;
    if (faction === "DINOSAUR") return `UNIT:DINOSAUR:${role}`;
    return `UNIT:GOBLIN:${role}`;
  }
  return subject;
}

const RESOURCE_COMMANDS: Partial<Record<CommandV7["kind"], ArtSubjectV7>> = {
  HARVEST_FRUIT: "RESOURCE:FRUIT",
  HUNT_GAME: "RESOURCE:GAME",
  HARVEST_FISH: "RESOURCE:FISH",
  GATHER_PEARLS: "RESOURCE:PEARLS",
  CAPTURE: "SITE:VILLAGE",
  DISEMBARK: "UNIT:EMBARKED_TRANSPORT",
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
 * is War Drums (`ICON:ACTION:DINOSAUR:RALLY`), and Lay Egg, Hatch and
 * Stampede are `ICON:ACTION:LAY_EGG`, `ICON:ACTION:HATCH` and
 * `ICON:ACTION:STAMPEDE` (bead pulp_wars-c87.7).
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
    case "CHOOSE_CITY_REWARD":
      return rewardSubjectV7(command.reward, faction);
    case "RALLY":
      if (faction === "UNDEAD") return "ICON:ACTION:UNDEAD:RALLY";
      if (faction === "GOBLIN") return "ICON:ACTION:GOBLIN:RALLY";
      if (faction === "DINOSAUR") return "ICON:ACTION:DINOSAUR:RALLY";
      return "ICON:ACTION:RALLY";
    default:
      break;
  }
  const mapped = RESOURCE_COMMANDS[command.kind];
  if (mapped !== undefined) return mapped;
  if (command.kind.startsWith("BUILD_") && command.kind !== "BUILD_ROAD")
    return improvementSubjectV7(
      command.kind.slice("BUILD_".length) as ImprovementIdV7,
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
    case "TREASURY_8":
      return "ICON:HUD:COIN";
    case "BOOM":
      return "ICON:HUD:POPULATION";
    case "MILITIA":
      return portraitSubjectV7("FIGHTER", faction);
    case "JUGGERNAUT":
      return portraitSubjectV7("JUGGERNAUT", faction);
  }
}
