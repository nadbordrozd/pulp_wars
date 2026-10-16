import {
  generateInitialMapV7,
  generateInitialMapWithVillageCountV7,
  villageCountForRulesV7,
} from "../map";
import {
  FACTION_IDS_V7,
  MAP_GENERATION_REVISION_V7,
  RULESET_7_ID,
  type BiomeIdV7,
  type CoordV7,
  type ResourceIdV7,
  type TerrainIdV7,
} from "../types";
import type {
  MissionDefinitionV7,
  MissionMapEditV7,
  MissionMapSourceV7,
} from "./types";

/**
 * Natural mission maps (docs/product/CAMPAIGN.md section 10.3,
 * `pulp_wars-v642.1`): a mission's board is the real map generator's output
 * for a recorded map type, size, seat count, and seed, plus a short recorded
 * list of edits. The layers are **baked** into the mission definition (its
 * `terrain`, `resources`, `biomes`, `villages`, and `treasureChests`), so a
 * mission never changes when the generator does; `source` records where
 * they came from, and a unit test regenerates every registered mission's
 * layers from its `source` and compares them with the baked ones.
 *
 * This module is the one place that runs the generator for a mission. It is
 * used by the seed browser and baker (`scripts/mission-map-v7.ts`) and by
 * the tests, never by the mission builder or the game.
 */
export interface MissionMapLayersV7 {
  readonly size: number;
  readonly terrain: readonly string[];
  readonly resources: readonly string[];
  readonly biomes: readonly string[];
  readonly villages: readonly CoordV7[];
  readonly treasureChests: readonly CoordV7[];
  /** The generator's capitals, by seat: natural places for a city. */
  readonly capitals: readonly CoordV7[];
}

const TERRAIN_CHAR_V7: Readonly<Record<TerrainIdV7, string>> = {
  GRASS: ".",
  FOREST: "f",
  MOUNTAIN: "^",
  SHALLOW_WATER: "~",
  DEEP_WATER: "~",
  RIFT: "x",
};
const RESOURCE_CHAR_V7: Readonly<Record<ResourceIdV7, string>> = {
  FRUIT: "r",
  FERTILE_GROUND: "e",
  GAME: "g",
  ORE: "o",
  FISH: "s",
  PEARLS: "p",
};
const BIOME_CHAR_V7: Readonly<Record<BiomeIdV7, string>> = {
  PLAINS: "P",
  WOODLAND: "W",
  HIGHLANDS: "H",
};

const byRowThenColumn = (left: CoordV7, right: CoordV7): number =>
  left.y - right.y || left.x - right.x;

/**
 * The generator's board for `source` before any edit, as mission layers:
 * the current generator, or the generation rules the source names (a board
 * baked before the generator changed). Throws when the generator refuses
 * the setup.
 */
export function generatedMissionLayersV7(
  source: Omit<MissionMapSourceV7, "edits">,
): MissionMapLayersV7 {
  const setup = {
    rulesetId: RULESET_7_ID,
    seed: source.seed,
    width: source.size,
    height: source.size,
    aiCount: source.seats - 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    // The factions do not shape the land; the first `seats` of the registry
    // keep the setup legal and the recorded source short.
    factions: FACTION_IDS_V7.slice(0, source.seats),
    mapType: source.mapType,
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    curiosities: false,
  } as const;
  const generated =
    source.rules === undefined
      ? generateInitialMapV7(setup)
      : generateInitialMapWithVillageCountV7(
          setup,
          villageCountForRulesV7(setup, source.rules),
          source.rules,
        );
  if (!generated.ok)
    throw new RangeError(
      `The generator refused ${source.mapType} ${String(source.size)} seed ${String(source.seed)}: ${generated.error.code}`,
    );
  const { board, villages, treasureChests, capitalAssignments } = generated.map;
  const rows = (char: (index: number) => string): string[] =>
    Array.from({ length: board.height }, (_, y) =>
      Array.from({ length: board.width }, (_, x) =>
        char(y * board.width + x),
      ).join(""),
    );
  return {
    size: board.width,
    terrain: rows((index) => {
      const tile = board.tiles[index];
      return tile === undefined ? "." : TERRAIN_CHAR_V7[tile.terrain];
    }),
    resources: rows((index) => {
      const resource = board.tiles[index]?.resource ?? null;
      return resource === null ? "." : RESOURCE_CHAR_V7[resource];
    }),
    // A water tile has no biome; the builder ignores its character.
    biomes: rows((index) => {
      const biome = board.tiles[index]?.biome ?? null;
      return biome === null ? "P" : BIOME_CHAR_V7[biome];
    }),
    villages: [...villages].sort(byRowThenColumn),
    treasureChests: [...treasureChests].sort(byRowThenColumn),
    capitals: capitalAssignments,
  };
}

function withChar(rows: readonly string[], at: CoordV7, char: string) {
  return rows.map((row, y) =>
    y === at.y ? row.slice(0, at.x) + char + row.slice(at.x + 1) : row,
  );
}

function toggled(
  list: readonly CoordV7[],
  at: CoordV7,
  present: boolean,
): readonly CoordV7[] {
  const without = list.filter((item) => item.x !== at.x || item.y !== at.y);
  return present
    ? [...without, { x: at.x, y: at.y }].sort(byRowThenColumn)
    : without;
}

/** One edit applied to the layers; an edit off the board throws. */
export function applyMissionMapEditV7(
  layers: MissionMapLayersV7,
  edit: MissionMapEditV7,
): MissionMapLayersV7 {
  const { at } = edit;
  if (at.x < 0 || at.y < 0 || at.x >= layers.size || at.y >= layers.size)
    throw new RangeError(`A map edit at (${String(at.x)}, ${String(at.y)})`);
  switch (edit.kind) {
    case "TERRAIN":
      // New terrain takes the named resource, or none.
      return {
        ...layers,
        terrain: withChar(layers.terrain, at, edit.terrain),
        resources: withChar(layers.resources, at, edit.resource ?? "."),
      };
    case "RESOURCE":
      return {
        ...layers,
        resources: withChar(layers.resources, at, edit.resource),
      };
    case "BIOME":
      return { ...layers, biomes: withChar(layers.biomes, at, edit.biome) };
    case "VILLAGE":
      return {
        ...layers,
        villages: toggled(layers.villages, at, edit.present),
      };
    case "CHEST":
      return {
        ...layers,
        treasureChests: toggled(layers.treasureChests, at, edit.present),
      };
  }
}

/** The layers of `source`: the generator's board with its edits applied. */
export function missionMapLayersV7(
  source: MissionMapSourceV7,
): MissionMapLayersV7 {
  return source.edits.reduce(
    applyMissionMapEditV7,
    generatedMissionLayersV7(source),
  );
}

/**
 * Where a mission's baked layers differ from its `source` (empty: they are
 * the generator's output with the recorded edits). A mission without a
 * `source`, or whose source is `frozen`, has nothing to compare.
 */
export function missionMapDriftV7(
  mission: MissionDefinitionV7,
): readonly string[] {
  const source = mission.source;
  if (source === undefined || source.frozen === true) return [];
  const layers = missionMapLayersV7(source);
  const drift: string[] = [];
  if (layers.size !== mission.size) drift.push("size");
  const sameRows = (left: readonly string[], right?: readonly string[]) =>
    right !== undefined &&
    left.length === right.length &&
    left.every((row, index) => row === right[index]);
  if (!sameRows(layers.terrain, mission.terrain)) drift.push("terrain");
  if (!sameRows(layers.resources, mission.resources)) drift.push("resources");
  // Biomes compare on land only (a water tile's character is ignored).
  const land = (rows: readonly string[] | undefined): string[] | undefined =>
    rows?.map((row, y) =>
      [...row]
        .map((char, x) => (mission.terrain[y]?.[x] === "~" ? "~" : char))
        .join(""),
    );
  if (!sameRows(land(layers.biomes) ?? [], land(mission.biomes)))
    drift.push("biomes");
  const sameCoords = (left: readonly CoordV7[], right: readonly CoordV7[]) =>
    left.length === right.length &&
    [...left]
      .sort(byRowThenColumn)
      .every(
        (item, index) =>
          item.x === [...right].sort(byRowThenColumn)[index]?.x &&
          item.y === [...right].sort(byRowThenColumn)[index]?.y,
      );
  // A village the mission turned into a city is a recorded `VILLAGE` edit.
  if (!sameCoords(layers.villages, mission.villages)) drift.push("villages");
  if (!sameCoords(layers.treasureChests, mission.treasureChests ?? []))
    drift.push("treasureChests");
  return drift;
}
