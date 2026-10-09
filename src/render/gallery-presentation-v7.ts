import {
  ACHIEVEMENT_IDS_V7,
  BASIC_ECONOMIC_ACTIONS_V7,
  EGG_DEFENSE2_V7,
  EGG_HP_V7,
  FACTION_IDS_V7,
  IMPROVEMENT_IDS_V7,
  MONSTER_REGENERATION_V7,
  MONUMENT_POPULATION_V7,
  NEUTRAL_BOUNTIES_V7,
  NEUTRAL_MONSTER_ROLE_RULE_V7,
  NEUTRAL_ROLE_RULES_V7,
  ORIGINAL_BASELINE_V5_NODES,
  WELL_COINS_V7,
  WELL_TOSS_COST_V7,
  WELL_VISION_RADIUS_V7,
  SPATIAL_ECONOMIC_ACTIONS_V7,
  UNIT_ROLE_IDS_V7,
  effectiveRoleRuleV7,
  HUMAN_ONLY_ROLES_V7,
  factionUnlocksRoleV7,
  isEggLaidRoleV7,
  isNavalRoleV7,
  roleMechanicsV7,
  type AchievementIdV7,
  type FactionIdV7,
  type ImprovementIdV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../engine/index";
import {
  cityArtSubjectV7,
  factionHasImprovementLookV7,
  monumentArtSubjectV7,
  navalArtSubjectV7,
  territoryGroundV7,
  territoryTerrainSubjectV7,
  unitArtSubjectV7,
  type ArtSubjectV7,
} from "../assets/chibi-art-v7";
import {
  ACHIEVEMENT_GOALS_V7,
  achievementNameV7,
} from "./achievement-presentation-v7";
import { factionBuildingV7 } from "./faction-buildings-v7";
import {
  factionImprovementSubjectV7,
  portraitSubjectV7,
} from "../assets/chibi-ui-art-v7";
import { recruitmentRolePresentationV7 } from "./role-presentation-v7";
import {
  glossaryEntryV7,
  roleGlossaryV7,
  type GlossaryIdV7,
} from "./unit-glossary-v7";
import { economicFormulaV7 } from "./economy-presentation-v7";
import { factionNameV7 } from "./undead-presentation-v7";
import { technologyNameV7 } from "./goblin-presentation-v7";
import { slotsTextV7 } from "./dinosaur-presentation-v7";
import {
  BIGFOOT_LABEL_V7,
  BIGFOOT_RULE_V7,
  CURIOSITY_LABELS_V7,
  CURIOSITY_RULES_V7,
  NEUTRAL_LABEL_V7,
  SPIDER_BOUNTY_RULE_V7,
  SPIDER_LABEL_V7,
  type CuriosityTileIdV7,
} from "./curiosity-presentation-v7";
import {
  GALLERY_TERRAIN_ROWS_V7,
  type GalleryTerrainRowIdV7,
} from "./gallery-terrain-presentation-v7";

/**
 * The Gallery (bead pulp_wars-ic8, docs/ui/SCREEN_FLOW.md "Gallery"): every
 * faction's units and buildings side by side, one row per mechanical role
 * or building and one column per faction, in the frozen faction order.
 * This module is the pure part: the rows, the cells, the detail texts and
 * the remembered filters. The DOM (src/render/dom/gallery-v7.ts) draws it.
 */

/** Every registered faction, in the frozen order. */
export const GALLERY_FACTIONS_V7: readonly FactionIdV7[] = FACTION_IDS_V7;

/**
 * CURIOSITIES (bead pulp_wars-737.6): a small third tab for what belongs to
 * no faction: the Giant Spider, its lair, the Fountain of Youth, the Shrine
 * and the Sunken Wreck.
 */
export type GalleryTabV7 =
  | "UNITS"
  | "BUILDINGS"
  | "TERRAIN"
  | "CURIOSITIES"
  /** Every sound of the game (bead pulp_wars-2yc.19, docs/ui/SOUND.md). */
  | "SOUNDS";

/**
 * A Curiosities cell: a neutral unit with a sprite of its own (the Giant
 * Spider, round 2's Bigfoot) or a tile overlay.
 */
export type GalleryCuriosityRowIdV7 = "SPIDER" | "BIGFOOT" | CuriosityTileIdV7;

/**
 * The Curiosities tab's grid: round 1 (the Spider, its lair, the
 * Fountain, the Shrine, the Wreck) over round 2 (Bigfoot, the Downed
 * Saucer, the Graveyard, the gate, the Well; bead pulp_wars-737.16).
 */
export const GALLERY_CURIOSITY_GRID_V7: readonly (readonly GalleryCuriosityRowIdV7[])[] =
  [
    ["SPIDER", "WEB", "FOUNTAIN", "SHRINE", "WRECK"],
    ["BIGFOOT", "DOWNED_SAUCER", "GRAVEYARD", "GATE", "WISHING_WELL"],
  ];

/** Every Curiosities cell in reading order (the detail's arrows). */
export const GALLERY_CURIOSITY_ROWS_V7: readonly GalleryCuriosityRowIdV7[] =
  GALLERY_CURIOSITY_GRID_V7.flat();

export interface GalleryCuriosityCellV7 {
  readonly row: GalleryCuriosityRowIdV7;
  readonly name: string;
  readonly subject: ArtSubjectV7;
  readonly ground: ArtSubjectV7;
  readonly portrait: ArtSubjectV7 | null;
}

export function galleryCuriosityCellV7(
  row: GalleryCuriosityRowIdV7,
): GalleryCuriosityCellV7 {
  if (row === "SPIDER")
    return {
      row,
      name: SPIDER_LABEL_V7,
      subject: "UNIT:MONSTER_GIANT_SPIDER",
      ground: "TERRAIN:GRASS",
      portrait: "PORTRAIT:MONSTER_GIANT_SPIDER",
    };
  if (row === "BIGFOOT")
    return {
      row,
      name: BIGFOOT_LABEL_V7,
      subject: "UNIT:NEUTRAL_BIGFOOT",
      ground: "TERRAIN:GRASS",
      portrait: "PORTRAIT:NEUTRAL_BIGFOOT",
    };
  return {
    row,
    name: CURIOSITY_LABELS_V7[row],
    subject: `CURIOSITY:${row}`,
    ground: row === "WRECK" ? "TERRAIN:SHALLOW_WATER" : "TERRAIN:GRASS",
    portrait: null,
  };
}

export interface GalleryCuriosityDetailsV7 {
  readonly name: string;
  /** "Neutral": a curiosity belongs to nobody. */
  readonly kicker: string;
  /** The curiosity's one sentence. */
  readonly description: string;
  readonly stats: readonly { readonly label: string; readonly value: string }[];
  readonly notes: readonly string[];
}

/** Round 2: the few facts a curiosity's detail adds to its sentence. */
const CURIOSITY_GALLERY_NOTES_V7: Partial<
  Record<CuriosityTileIdV7, readonly string[]>
> = {
  DOWNED_SAUCER: [
    "Guards: a Grunt, two Grunts, two Grunts and a Shield Projector, or a Grunt and a Ray Gunner.",
    `Each guard pays ${NEUTRAL_BOUNTIES_V7.GRUNT} or ${NEUTRAL_BOUNTIES_V7.RAY_GUNNER} Coins.`,
  ],
  GRAVEYARD: [`Each Zombie pays ${NEUTRAL_BOUNTIES_V7.ZOMBIE} Coins.`],
  GATE: ["A Move ends on a gate. Two gates, on opposite sides of a big map."],
  WISHING_WELL: [
    `A toss costs ${WELL_TOSS_COST_V7} Coin: a splash, ${WELL_COINS_V7} Coins, a full heal, or the land within ${WELL_VISION_RADIUS_V7} revealed.`,
  ],
};

/** The detail texts of a curiosity (the Help sentences reused). */
export function galleryCuriosityDetailsV7(
  row: GalleryCuriosityRowIdV7,
): GalleryCuriosityDetailsV7 {
  const cell = galleryCuriosityCellV7(row);
  if (row === "BIGFOOT") {
    const rule = NEUTRAL_ROLE_RULES_V7.BIGFOOT;
    return {
      name: cell.name,
      kicker: NEUTRAL_LABEL_V7,
      description: BIGFOOT_RULE_V7,
      stats: [
        { label: "HP", value: String(rule.maxHp) },
        { label: "Defense", value: String(rule.defense2 / 2) },
        { label: "Move", value: String(rule.move) },
      ],
      notes: ["It never attacks and never strikes back."],
    };
  }
  if (row !== "SPIDER")
    return {
      name: cell.name,
      kicker: NEUTRAL_LABEL_V7,
      description: CURIOSITY_RULES_V7[row],
      stats: [],
      notes: CURIOSITY_GALLERY_NOTES_V7[row] ?? [],
    };
  const rule = NEUTRAL_MONSTER_ROLE_RULE_V7;
  return {
    name: cell.name,
    kicker: NEUTRAL_LABEL_V7,
    description: CURIOSITY_RULES_V7.WEB,
    stats: [
      { label: "HP", value: String(rule.maxHp) },
      { label: "Attack", value: String(rule.attack2 / 2) },
      { label: "Defense", value: String(rule.defense2 / 2) },
      { label: "Move", value: String(rule.move) },
      { label: "Range", value: String(rule.range) },
    ],
    notes: [
      `Regenerates ${MONSTER_REGENERATION_V7} HP after every round.`,
      SPIDER_BOUNTY_RULE_V7,
    ],
  };
}

/**
 * A Units row: a mechanical role of every faction, the embarked transport
 * (each faction's own boat) and the Dinosaur Egg, the one faction-specific
 * unit form.
 */
export type GalleryUnitRowIdV7 = UnitRoleIdV7 | "TRANSPORT" | "EGG";

export const GALLERY_UNIT_ROWS_V7: readonly GalleryUnitRowIdV7[] = [
  ...UNIT_ROLE_IDS_V7,
  "TRANSPORT",
  "EGG",
];

/**
 * A Monument as one achievement draws it (bead pulp_wars-2yc.15): a row of
 * its own under the shared Monument, which is how a Monument looks when
 * its achievement is not the viewer's to see.
 */
export type GalleryMonumentRowIdV7 = `MONUMENT_${AchievementIdV7}`;

/**
 * A Buildings row: a city by art level, the Village, an improvement, an
 * achievement's Monument.
 */
export type GalleryBuildingRowIdV7 =
  | "CITY_1"
  | "CITY_2"
  | "CITY_3"
  | "VILLAGE"
  | ImprovementIdV7
  | GalleryMonumentRowIdV7;

/** The improvement of a Buildings row that is one, else null. */
function galleryRowImprovement(
  row: GalleryBuildingRowIdV7,
): ImprovementIdV7 | null {
  return (IMPROVEMENT_IDS_V7 as readonly string[]).includes(row)
    ? (row as ImprovementIdV7)
    : null;
}

/** The achievement of a Monument row, or null for every other row. */
export function galleryMonumentAchievementV7(
  row: GalleryBuildingRowIdV7,
): AchievementIdV7 | null {
  return (
    ACHIEVEMENT_IDS_V7.find(
      (achievement) => row === `MONUMENT_${achievement}`,
    ) ?? null
  );
}

export const GALLERY_BUILDING_ROWS_V7: readonly GalleryBuildingRowIdV7[] = [
  "CITY_1",
  "CITY_2",
  "CITY_3",
  "VILLAGE",
  ...IMPROVEMENT_IDS_V7.flatMap((improvement): GalleryBuildingRowIdV7[] =>
    improvement === "MONUMENT"
      ? [
          improvement,
          ...ACHIEVEMENT_IDS_V7.map(
            (achievement): GalleryMonumentRowIdV7 => `MONUMENT_${achievement}`,
          ),
        ]
      : [improvement],
  ),
];

function title(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

const ROW_LABELS: Readonly<Record<string, string>> = {
  PATROL_BOAT: "Patrol Boat",
  // The ninth unit (`pulp_wars-w49.17`, 7r55): the heavy line row, under
  // the Human unit's name like every other role row (the role ID stays
  // `SWORDSMAN`).
  SWORDSMAN: "Champion",
  CITY_1: "City 1",
  CITY_2: "City 2",
  CITY_3: "City 3",
  LUMBER_CAMP: "Lumber Camp",
  SPIDER: SPIDER_LABEL_V7,
  WEB: CURIOSITY_LABELS_V7.WEB,
  FOUNTAIN: CURIOSITY_LABELS_V7.FOUNTAIN,
  SHRINE: CURIOSITY_LABELS_V7.SHRINE,
  WRECK: CURIOSITY_LABELS_V7.WRECK,
  BIGFOOT: BIGFOOT_LABEL_V7,
  DOWNED_SAUCER: CURIOSITY_LABELS_V7.DOWNED_SAUCER,
  GRAVEYARD: CURIOSITY_LABELS_V7.GRAVEYARD,
  GATE: CURIOSITY_LABELS_V7.GATE,
  WISHING_WELL: CURIOSITY_LABELS_V7.WISHING_WELL,
};

/** The row's name: the mechanical role, building, form or curiosity. */
export function galleryRowLabelV7(
  row: GalleryUnitRowIdV7 | GalleryBuildingRowIdV7 | GalleryCuriosityRowIdV7,
): string {
  const achievement = ACHIEVEMENT_IDS_V7.find(
    (candidate) => row === `MONUMENT_${candidate}`,
  );
  if (achievement !== undefined)
    return `${achievementNameV7(achievement)} Monument`;
  return ROW_LABELS[row] ?? title(row);
}

export function galleryNavalRowV7(row: GalleryUnitRowIdV7): boolean {
  return isNavalRoleV7(row) || row === "TRANSPORT";
}

export type GalleryUnitCellV7 =
  | {
      readonly kind: "UNIT";
      readonly row: GalleryUnitRowIdV7;
      readonly faction: FactionIdV7;
      /** The role; null for the transport, which carries any land unit. */
      readonly role: UnitRoleIdV7 | null;
      readonly name: string;
      readonly subject: ArtSubjectV7;
      readonly portrait: ArtSubjectV7 | null;
    }
  | {
      /** The faction has no such unit (the Egg of a faction that lays none). */
      readonly kind: "EMPTY";
      readonly row: GalleryUnitRowIdV7;
      readonly faction: FactionIdV7;
      /**
       * The frozen sea: why the cell is empty on purpose. `NO_SHIPS`: the
       * faction builds no ship and no transport (the Ice Folk freeze the
       * sea instead); the Gallery shows an ice mark with that sentence.
       */
      readonly reason?: "NO_SHIPS";
    };

/** The Gallery's words for a faction with no ship in a naval row. */
export const GALLERY_NO_SHIPS_LABEL_V7 = "Ice";
export const GALLERY_NO_SHIPS_TEXT_V7 =
  "No ships: the Ice Folk freeze the sea and slide across it";

/** A faction lays Eggs when one of its roles is egg-laid (the Dinosaurs). */
export function factionLaysEggsV7(faction: FactionIdV7): boolean {
  return UNIT_ROLE_IDS_V7.some((role) => isEggLaidRoleV7(role, faction));
}

export function galleryUnitCellV7(
  row: GalleryUnitRowIdV7,
  faction: FactionIdV7,
): GalleryUnitCellV7 {
  // The frozen sea (naval branch section 8.11): a faction whose tree unlocks
  // no ship (the Ice Folk) has no ship and no transport.
  if (
    (row === "TRANSPORT" && !factionUnlocksRoleV7(faction, "PATROL_BOAT")) ||
    (row !== "TRANSPORT" &&
      row !== "EGG" &&
      isNavalRoleV7(row) &&
      !factionUnlocksRoleV7(faction, row))
  )
    return { kind: "EMPTY", row, faction, reason: "NO_SHIPS" };
  // Tuning 5 (`pulp_wars-w49.4`): a role only the Human tree unlocks is no
  // unit of any other faction (none since the ninth unit, 7r55: every
  // faction has the heavy line role).
  if (
    row !== "TRANSPORT" &&
    row !== "EGG" &&
    HUMAN_ONLY_ROLES_V7.includes(row) &&
    !factionUnlocksRoleV7(faction, row)
  )
    return { kind: "EMPTY", row, faction };
  if (row === "TRANSPORT")
    return {
      kind: "UNIT",
      row,
      faction,
      role: null,
      name: "Transport",
      subject: navalArtSubjectV7(faction, "UNIT", "EMBARKED_TRANSPORT"),
      portrait: null,
    };
  if (row === "EGG")
    return factionLaysEggsV7(faction)
      ? {
          kind: "UNIT",
          row,
          faction,
          role: null,
          name: "Egg",
          subject: unitArtSubjectV7({
            role: "FIGHTER",
            form: "EGG",
            faction,
          }),
          portrait: null,
        }
      : { kind: "EMPTY", row, faction };
  const naval = isNavalRoleV7(row);
  return {
    kind: "UNIT",
    row,
    faction,
    role: row,
    name: effectiveRoleRuleV7(row, faction).label,
    subject: unitArtSubjectV7({
      role: row,
      form: naval ? "NAVAL" : "LAND",
      faction,
    }),
    portrait: portraitSubjectV7(row, faction),
  };
}

export interface GalleryAbilityV7 {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

export interface GalleryUnitDetailsV7 {
  readonly name: string;
  readonly factionName: string;
  /** The mechanical role (row) name. */
  readonly roleName: string;
  /** The tactical role ("Line", "Siege", ...), or null. */
  readonly tacticalRole: string | null;
  /** Training cost in Coins; null when it is never trained. */
  readonly cost: number | null;
  /** Why there is no cost ("City reward", "Laid by a city"), or null. */
  readonly costNote: string | null;
  readonly stats: readonly { readonly label: string; readonly value: string }[];
  readonly abilities: readonly GalleryAbilityV7[];
  readonly notes: readonly string[];
  readonly technology: {
    readonly id: TechnologyIdV7;
    readonly name: string;
  } | null;
}

function glossaryAbility(id: GlossaryIdV7): GalleryAbilityV7 {
  const entry = glossaryEntryV7(id);
  return { id: entry.id, name: entry.name, description: entry.text };
}

/** The detail texts of a unit cell (the unit glossary's sentences). */
export function galleryUnitDetailsV7(
  cell: Extract<GalleryUnitCellV7, { readonly kind: "UNIT" }>,
): GalleryUnitDetailsV7 {
  const factionName = factionNameV7(cell.faction);
  const roleName = galleryRowLabelV7(cell.row);
  if (cell.role === null)
    return cell.row === "EGG"
      ? {
          name: cell.name,
          factionName,
          roleName,
          tacticalRole: null,
          cost: null,
          costNote: "Laid by a city",
          stats: [
            { label: "HP", value: String(EGG_HP_V7) },
            { label: "Defense", value: String(EGG_DEFENSE2_V7 / 2) },
          ],
          abilities: [glossaryAbility("EGG")],
          notes: [],
          technology: null,
        }
      : {
          name: cell.name,
          factionName,
          roleName,
          tacticalRole: null,
          cost: null,
          costNote: "Any land unit at sea",
          stats: [],
          abilities: [glossaryAbility("AT_SEA")],
          notes: [],
          technology: null,
        };
  const role = cell.role;
  const rule = effectiveRoleRuleV7(role, cell.faction);
  const presentation = recruitmentRolePresentationV7(role, cell.faction);
  const slots = roleMechanicsV7(role, cell.faction).capacitySlots;
  return {
    name: rule.label,
    factionName,
    roleName,
    tacticalRole: title(rule.tacticalRole),
    cost: rule.cost,
    costNote: rule.cost === null ? "City reward" : null,
    stats: [...presentation.stats, { label: "Slots", value: String(slots) }],
    // The unit glossary (bead pulp_wars-2yc.39): every ability and trait of
    // the role in one plain sentence; no second list of notes.
    abilities: roleGlossaryV7(role, cell.faction).map((entry) => ({
      id: entry.id,
      name: entry.name,
      description: entry.text,
    })),
    notes: [],
    technology:
      rule.technology === null
        ? null
        : {
            id: rule.technology,
            name: technologyNameV7(rule.technology, cell.faction),
          },
  };
}

/** The accessible name of a slot count ("2 slots"). */
export function gallerySlotsTextV7(slots: number): string {
  return slotsTextV7(slots);
}

// ---------- Buildings ----------

/** The art subject of a building row as a faction has it. */
export function galleryBuildingSubjectV7(
  row: GalleryBuildingRowIdV7,
  faction: FactionIdV7,
): ArtSubjectV7 {
  if (row === "CITY_1" || row === "CITY_2" || row === "CITY_3")
    return cityArtSubjectV7({
      artLevel: Number(row.slice(-1)) as 1 | 2 | 3,
      faction,
    });
  if (row === "VILLAGE") return "SITE:VILLAGE";
  const improvement = galleryRowImprovement(row);
  return improvement === null
    ? monumentArtSubjectV7(galleryMonumentAchievementV7(row))
    : factionImprovementSubjectV7(improvement, faction);
}

/**
 * True when the factions differ on this building: the row then has one
 * column per faction, else one shared cell. Cities differ, and so do the
 * improvements some faction draws in a look of its own (the Farm, the
 * Windmill and the Sawmill, epic pulp_wars-xdh; the Lumber Camp and every
 * faction's Sawmill, bead pulp_wars-2yc.38).
 */
export function galleryBuildingPerFactionV7(
  row: GalleryBuildingRowIdV7,
): boolean {
  return (
    new Set(
      GALLERY_FACTIONS_V7.map((faction) =>
        galleryBuildingSubjectV7(row, faction),
      ),
    ).size > 1
  );
}

/**
 * The name of a building row as a faction has it: the faction's own name
 * of an improvement it draws in its own look ("Graveyard", epic
 * pulp_wars-xdh), else the row's name. `null` is the shared cell.
 */
export function galleryBuildingNameV7(
  row: GalleryBuildingRowIdV7,
  faction: FactionIdV7 | null,
): string {
  if (row === "CITY_1" || row === "CITY_2" || row === "CITY_3")
    return galleryRowLabelV7(row);
  if (row === "VILLAGE") return galleryRowLabelV7(row);
  const improvement = galleryRowImprovement(row);
  return (
    (improvement === null
      ? null
      : factionBuildingV7(improvement, faction)?.name) ?? galleryRowLabelV7(row)
  );
}

/**
 * The ground a building stands on in its cell (null: the art has its own):
 * in a faction's own cell, the ground of that faction's territory (the
 * Undead gloam Grass). A faction's own Lumber Camp carries the trees of its
 * forest and stands on Grass, as on the board (the Forest under a Lumber
 * Camp is drawn as its ground); the shared one keeps the Forest tile.
 */
export function galleryBuildingGroundV7(
  row: GalleryBuildingRowIdV7,
  faction: FactionIdV7 | null = null,
): ArtSubjectV7 | null {
  if (row === "MINE") return null;
  if (row === "PORT" || row === "SHIPYARD") return "TERRAIN:SHALLOW_WATER";
  return territoryTerrainSubjectV7(
    row === "LUMBER_CAMP" &&
      !factionHasImprovementLookV7("LUMBER_CAMP", faction)
      ? "TERRAIN:FOREST"
      : "TERRAIN:GRASS",
    territoryGroundV7(faction),
  );
}

export interface GalleryBuildingDetailsV7 {
  readonly name: string;
  /** The faction, or null for a building every faction shares. */
  readonly factionName: string | null;
  readonly description: string;
  readonly effects: readonly string[];
  readonly cost: number | null;
  readonly technology: {
    readonly id: TechnologyIdV7;
    readonly name: string;
  } | null;
}

/** The technology whose command builds an improvement, from the tree. */
function buildingTechnology(
  improvement: ImprovementIdV7,
): TechnologyIdV7 | null {
  const command = `BUILD_${improvement}`;
  return (
    ORIGINAL_BASELINE_V5_NODES.find((node) =>
      node.unlocks.some(
        (unlock) => unlock.kind === "COMMAND" && unlock.command === command,
      ),
    )?.id ?? null
  );
}

/** The economic formula an improvement's technology grants, as text. */
function buildingFormula(improvement: ImprovementIdV7): string | null {
  for (const node of ORIGINAL_BASELINE_V5_NODES)
    for (const unlock of node.unlocks)
      if (
        unlock.kind === "ECONOMIC_FORMULA" &&
        unlock.improvement === improvement
      )
        // The text leads with the building's name, which the detail shows.
        return economicFormulaV7(unlock.improvement, unlock.formula).replace(
          /^[^:]+: /,
          "",
        );
  return null;
}

const BUILDING_DESCRIPTIONS: Readonly<
  Record<Exclude<GalleryBuildingRowIdV7, GalleryMonumentRowIdV7>, string>
> = {
  CITY_1: "A city. Earns Coins and trains units.",
  CITY_2: "A level 2 city.",
  CITY_3: "A city of level 3 and up.",
  VILLAGE: "Take it with a unit to found a city.",
  FARM: "Built on Fertile Ground.",
  LUMBER_CAMP: "Built in a Forest.",
  MINE: "Built on Ore in the mountains.",
  WINDMILL: "Built next to farms.",
  SAWMILL: "Built next to lumber camps.",
  FORGE: "Built next to mines.",
  WORKSHOP: "Built among varied buildings.",
  MARKET: "Built among varied buildings.",
  // The skin rule (pulp_wars-eu3r.3): a Monument keeps its builder's look.
  MONUMENT: `Each achievement earns a free Monument: +${MONUMENT_POPULATION_V7} population, one per city. It keeps its builder's look when its city is captured.`,
  PORT: "Built on Shallow Water. Puts land units to sea and trains ships.",
  SHIPYARD: "An upgraded Port. Ships cost less.",
};

/** Port and Shipyard costs (the engine's economic preview, query.ts). */
const NAVAL_BUILDING_COSTS: Partial<Record<ImprovementIdV7, number>> = {
  PORT: 4,
  SHIPYARD: 5,
};

export function galleryBuildingDetailsV7(
  row: GalleryBuildingRowIdV7,
  faction: FactionIdV7 | null,
): GalleryBuildingDetailsV7 {
  const name = galleryBuildingNameV7(row, faction);
  const factionName = faction === null ? null : factionNameV7(faction);
  // An achievement's Monument (bead pulp_wars-2yc.15): the Monument's
  // rules, led by what earns it.
  const achievement = galleryMonumentAchievementV7(row);
  const improvement = galleryRowImprovement(row);
  if (achievement !== null || improvement === null)
    return {
      name,
      factionName,
      description:
        achievement === null
          ? BUILDING_DESCRIPTIONS[row as "CITY_1" | "VILLAGE"]
          : `The Monument of the ${achievementNameV7(achievement)} achievement: ${ACHIEVEMENT_GOALS_V7[achievement]} ${BUILDING_DESCRIPTIONS.MONUMENT}`,
      effects: [],
      cost: null,
      technology: null,
    };
  row = improvement;
  // A faction's own look: its flavour line ("... Counts as a Farm.") leads;
  // the rules, effects and cost below are the generic building's.
  const own = factionBuildingV7(row, faction);
  const description =
    own === null
      ? BUILDING_DESCRIPTIONS[row]
      : `${own.flavour} ${BUILDING_DESCRIPTIONS[row]}`;
  if (row === "MONUMENT")
    return {
      name,
      factionName,
      description,
      effects: [],
      cost: null,
      technology: null,
    };
  const basic = Object.values(BASIC_ECONOMIC_ACTIONS_V7).find(
    (rule) => rule.improvement === row,
  );
  const spatial = Object.values(SPATIAL_ECONOMIC_ACTIONS_V7).find(
    (rule) => rule.improvement === row,
  );
  const tech = buildingTechnology(row);
  const formula = buildingFormula(row);
  const effects = [
    ...(basic === undefined ? [] : [`+${basic.population} population`]),
    ...(formula === null ? [] : [formula]),
  ];
  return {
    name,
    factionName,
    description,
    effects,
    cost: basic?.cost ?? spatial?.cost ?? NAVAL_BUILDING_COSTS[row] ?? null,
    technology:
      tech === null
        ? null
        : {
            id: tech,
            name: technologyNameV7(tech, faction ?? "ORIGINAL"),
          },
  };
}

// ---------- Filters ----------

/** The viewer's Gallery choices, remembered in this browser. */
export interface GalleryFiltersV7 {
  readonly tab: GalleryTabV7;
  readonly factions: readonly FactionIdV7[];
  readonly unitRows: readonly GalleryUnitRowIdV7[];
  readonly buildingRows: readonly GalleryBuildingRowIdV7[];
  /** The Terrain tab's rows (bead pulp_wars-2yc.3). */
  readonly terrainRows: readonly GalleryTerrainRowIdV7[];
}

export const GALLERY_FILTERS_STORAGE_KEY_V7 = "pulpWars.ruleset7.gallery.v1";

export const DEFAULT_GALLERY_FILTERS_V7: GalleryFiltersV7 = {
  tab: "UNITS",
  factions: GALLERY_FACTIONS_V7,
  unitRows: GALLERY_UNIT_ROWS_V7,
  buildingRows: GALLERY_BUILDING_ROWS_V7,
  terrainRows: GALLERY_TERRAIN_ROWS_V7,
};

/** Keeps the known values of a stored list, in the canonical order. */
function knownList<Value extends string>(
  stored: unknown,
  all: readonly Value[],
): readonly Value[] | null {
  if (!Array.isArray(stored)) return null;
  const values = new Set(stored.filter((item) => typeof item === "string"));
  return all.filter((value) => values.has(value));
}

/**
 * Reads stored filters; anything unknown or malformed takes the default
 * (every faction and row shown, the Units tab).
 */
export function parseGalleryFiltersV7(
  stored: string | null | undefined,
): GalleryFiltersV7 {
  if (stored === null || stored === undefined)
    return DEFAULT_GALLERY_FILTERS_V7;
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return DEFAULT_GALLERY_FILTERS_V7;
  }
  if (typeof parsed !== "object" || parsed === null)
    return DEFAULT_GALLERY_FILTERS_V7;
  const record = parsed as Record<string, unknown>;
  return {
    tab:
      record.tab === "BUILDINGS" ||
      record.tab === "TERRAIN" ||
      record.tab === "CURIOSITIES" ||
      record.tab === "SOUNDS"
        ? record.tab
        : "UNITS",
    factions:
      knownList(record.factions, GALLERY_FACTIONS_V7) ??
      DEFAULT_GALLERY_FILTERS_V7.factions,
    unitRows:
      knownList(record.unitRows, GALLERY_UNIT_ROWS_V7) ??
      DEFAULT_GALLERY_FILTERS_V7.unitRows,
    buildingRows:
      knownList(record.buildingRows, GALLERY_BUILDING_ROWS_V7) ??
      DEFAULT_GALLERY_FILTERS_V7.buildingRows,
    // Filters stored before the Terrain tab existed show every terrain.
    terrainRows:
      knownList(record.terrainRows, GALLERY_TERRAIN_ROWS_V7) ??
      DEFAULT_GALLERY_FILTERS_V7.terrainRows,
  };
}

export function serializeGalleryFiltersV7(filters: GalleryFiltersV7): string {
  return JSON.stringify({
    tab: filters.tab,
    factions: filters.factions,
    unitRows: filters.unitRows,
    buildingRows: filters.buildingRows,
    terrainRows: filters.terrainRows,
  });
}

/** Toggles one value of a filter list, keeping the canonical order. */
export function toggleGalleryFilterV7<Value extends string>(
  current: readonly Value[],
  value: Value,
  all: readonly Value[],
): readonly Value[] {
  const next = new Set(current);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return all.filter((candidate) => next.has(candidate));
}
