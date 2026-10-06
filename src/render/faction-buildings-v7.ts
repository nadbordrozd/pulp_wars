import type {
  FactionIdV7,
  ImprovementIdV7,
  PlayerViewV7,
} from "../engine/index";
import { FACTION_IMPROVEMENT_LOOKS_V7 } from "../assets/chibi-art-v7";

/**
 * Faction building looks, the words (epic pulp_wars-xdh, bead
 * pulp_wars-xdh.2; docs/art/FACTION_BUILDINGS.md). A few improvements are
 * drawn, and named, in the look of the faction that owns the territory they
 * stand in: an Undead Farm is a Graveyard. It is presentation only: the
 * rules, the numbers and every rules text keep the generic building, and the
 * one flavour line ends "Counts as a Farm." so the vocabulary stays
 * learnable. The art subjects are in src/assets/chibi-ui-art-v7.ts
 * (factionImprovementSubjectV7); this table must name exactly the buildings
 * FACTION_IMPROVEMENT_LOOKS_V7 lists (a test checks it).
 */
export interface FactionBuildingV7 {
  /** The faction's name of the building ("Graveyard"). */
  readonly name: string;
  /** One line; it ends with "Counts as a <generic building>." */
  readonly flavour: string;
}

const GENERIC_NAMES: Readonly<Record<ImprovementIdV7, string>> = {
  FARM: "Farm",
  LUMBER_CAMP: "Lumber camp",
  MINE: "Mine",
  WINDMILL: "Windmill",
  SAWMILL: "Sawmill",
  FORGE: "Forge",
  WORKSHOP: "Workshop",
  MARKET: "Market",
  MONUMENT: "Monument",
  PORT: "Port",
  SHIPYARD: "Shipyard",
};

const article = (name: string): string =>
  /^[AEIOU]/.test(name) ? `an ${name}` : `a ${name}`;

/** "Counts as a Farm." */
export function countsAsTextV7(improvement: ImprovementIdV7): string {
  return `Counts as ${article(GENERIC_NAMES[improvement])}.`;
}

const building = (
  improvement: ImprovementIdV7,
  name: string,
  flavour: string,
): readonly [ImprovementIdV7, FactionBuildingV7] => [
  improvement,
  { name, flavour: `${flavour} ${countsAsTextV7(improvement)}` },
];

const FACTION_BUILDINGS: Readonly<
  Partial<Record<FactionIdV7, ReadonlyMap<ImprovementIdV7, FactionBuildingV7>>>
> = {
  UNDEAD: new Map([
    building("FARM", "Graveyard", "Quiet plots, tended for later."),
    building(
      "WINDMILL",
      "Bone Mill",
      "Grinds old bones into something useful.",
    ),
  ]),
  DINOSAUR: new Map([
    building("WINDMILL", "Grinding Stone", "Push the pole, crush the grain."),
    building("SAWMILL", "Chopping Block", "A big stone axe and a bigger arm."),
  ]),
  MARTIAN: new Map([
    building("FARM", "Hydroponic Farm", "Earth vegetables, under glass."),
    building("WINDMILL", "Solar Array", "Drinks the light of a lesser star."),
  ]),
  ICE_FOLK: new Map([
    building("FARM", "Frost Garden", "Frost flowers that like the cold."),
  ]),
  DWARF: new Map([
    building("FARM", "Mushroom Farm", "Grown in the dark, eaten with ale."),
    building(
      "WINDMILL",
      "Steam Pump",
      "Hisses, clanks and keeps the pressure up.",
    ),
  ]),
};

/** Every faction building, for tests and the Help. */
export function factionBuildingsV7(): readonly {
  readonly faction: FactionIdV7;
  readonly improvement: ImprovementIdV7;
  readonly building: FactionBuildingV7;
}[] {
  return (Object.keys(FACTION_IMPROVEMENT_LOOKS_V7) as FactionIdV7[]).flatMap(
    (faction) =>
      [...(FACTION_BUILDINGS[faction] ?? [])].map(([improvement, entry]) => ({
        faction,
        improvement,
        building: entry,
      })),
  );
}

/**
 * The faction's own name and flavour of an improvement, or null when the
 * faction (or no faction: unowned land) has the shared building.
 */
export function factionBuildingV7(
  improvement: ImprovementIdV7,
  faction: FactionIdV7 | null | undefined,
): FactionBuildingV7 | null {
  if (faction === null || faction === undefined) return null;
  return FACTION_BUILDINGS[faction]?.get(improvement) ?? null;
}

/** The faction that owns the territory of a tile, or null for unowned land. */
export function territoryFactionV7(
  view: Pick<PlayerViewV7, "players">,
  territoryOwnerId: number | null | undefined,
): FactionIdV7 | null {
  if (territoryOwnerId === null || territoryOwnerId === undefined) return null;
  return (
    view.players.find((player) => player.id === territoryOwnerId)?.faction ??
    null
  );
}

/** True when a seat's faction has a building look of its own. */
export function matchHasFactionBuildingsV7(
  view: Pick<PlayerViewV7, "players">,
): boolean {
  return view.players.some(
    (player) => FACTION_IMPROVEMENT_LOOKS_V7[player.faction] !== undefined,
  );
}

/**
 * The building a build command (`BUILD_FARM`) makes for a viewer's faction
 * when the faction has its own look of it, or null for the shared building.
 * The build button takes its name; its tooltip adds the flavour line.
 */
export function factionBuildCommandV7(
  commandKind: string,
  faction: FactionIdV7,
): FactionBuildingV7 | null {
  if (!commandKind.startsWith("BUILD_")) return null;
  return factionBuildingV7(
    commandKind.slice("BUILD_".length) as ImprovementIdV7,
    faction,
  );
}

/** One short Help line (docs/ui/SCREEN_FLOW.md, "Faction buildings"). */
export const FACTION_BUILDINGS_HELP_V7 =
  "Some buildings look and are named differently in a faction's territory (an Undead Farm is a Graveyard). They work the same.";
