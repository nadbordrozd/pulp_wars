import {
  RULESET_7_ID,
  createPlayableGameV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type ImprovementIdV7,
  type ResourceIdV7,
  type TerrainIdV7,
  type TileStateV7,
} from "../src/engine/index";

/**
 * The board of the faded-buildings review (bead pulp_wars-2yc.61,
 * docs/art/BUILDING_FADE.md). A generated 16 x 16 Pangea board (no match is
 * played) for four factions, the viewer's faction first; every tile is
 * explored by the viewer, and each capital's territory is grown to its
 * 5 x 5 square and filled by hand: the inner ring with a Sawmill, Workshop,
 * Forge, Market, Windmill, Farm, Lumber Camp and Monument, the outer ring
 * with the backgroundy things the buildings are compared with (Forest,
 * Fruit, Game, a Mine) and open Grass. A coastal cell gets a Port. The
 * rules never see this state: it is only drawn.
 */
export function buildingFadeReviewStateV7(
  factions: readonly FactionIdV7[] = ["ORIGINAL", "CULT", "DWARF", "CANDY"],
): GameStateV7 {
  const created = createPlayableGameV7({
    rulesetId: RULESET_7_ID,
    seed: 61,
    width: 16,
    height: 16,
    aiCount: (factions.length - 1) as 3,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions,
    mapType: "PANGEA",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  });
  if (!created.ok)
    throw new Error(`Review board rejected: ${created.error.code}`);
  const base = created.state;
  const capitals = base.cities.filter((city) => city.isCapital);
  const inner: readonly Patch[] = [
    { improvement: "SAWMILL" },
    { improvement: "WORKSHOP" },
    { improvement: "FORGE" },
    { improvement: "MARKET" },
    { improvement: "WINDMILL" },
    { improvement: "FARM", resource: "FERTILE_GROUND" },
    { improvement: "LUMBER_CAMP", terrain: "FOREST" },
    { improvement: "MONUMENT" },
  ];
  const outer: readonly Patch[] = [
    { terrain: "FOREST" },
    { resource: "FRUIT" },
    {},
    { terrain: "FOREST", resource: "GAME" },
    { terrain: "MOUNTAIN", improvement: "MINE", resource: "ORE" },
    {},
    { terrain: "FOREST" },
    { resource: "FRUIT" },
    {},
    { improvement: "FARM", resource: "FERTILE_GROUND" },
    { terrain: "FOREST", resource: "GAME" },
    {},
  ];
  const plan = new Map<string, Patch & { territoryCityId: unknown }>();
  const key = (at: CoordV7): string => `${at.x},${at.y}`;
  for (const capital of capitals) {
    let innerIndex = 0;
    let outerIndex = 0;
    for (let dy = -2; dy <= 2; dy += 1)
      for (let dx = -2; dx <= 2; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const at = { x: capital.at.x + dx, y: capital.at.y + dy };
        const tile = base.board.tiles.find(
          (item) => item.at.x === at.x && item.at.y === at.y,
        );
        if (tile === undefined || tile.site !== null || plan.has(key(at)))
          continue;
        const ring = Math.max(Math.abs(dx), Math.abs(dy));
        const water =
          tile.terrain === "SHALLOW_WATER" || tile.terrain === "DEEP_WATER";
        const patch: Patch = water
          ? tile.terrain === "SHALLOW_WATER"
            ? { improvement: "PORT", keepTerrain: true }
            : { keepTerrain: true }
          : ring === 1
            ? (inner[innerIndex++ % inner.length] ?? {})
            : (outer[outerIndex++ % outer.length] ?? {});
        plan.set(key(at), { ...patch, territoryCityId: capital.id });
      }
  }
  const tiles: TileStateV7[] = base.board.tiles.map((tile) => {
    const patch = plan.get(key(tile.at));
    if (patch === undefined) return tile;
    return {
      ...tile,
      terrain:
        patch.keepTerrain === true ? tile.terrain : (patch.terrain ?? "GRASS"),
      resource: patch.resource ?? null,
      improvement: patch.improvement ?? null,
      road: false,
      fieldDefense: false,
      territoryCityId: patch.territoryCityId as TileStateV7["territoryCityId"],
    };
  });
  const explored = tiles.map((tile) => tile.at);
  return {
    ...base,
    board: { ...base.board, tiles },
    players: base.players.map((player) =>
      player.id === base.humanPlayerId ? { ...player, explored } : player,
    ),
  };
}

interface Patch {
  readonly terrain?: TerrainIdV7;
  readonly resource?: ResourceIdV7;
  readonly improvement?: ImprovementIdV7;
  readonly keepTerrain?: boolean;
}

export const buildingFadeHumanBoardV7 = (): GameStateV7 =>
  buildingFadeReviewStateV7(["ORIGINAL", "CULT", "DWARF", "CANDY"]);
export const buildingFadeCultBoardV7 = (): GameStateV7 =>
  buildingFadeReviewStateV7(["CULT", "ORIGINAL", "DWARF", "CANDY"]);
export const buildingFadeDwarfBoardV7 = (): GameStateV7 =>
  buildingFadeReviewStateV7(["DWARF", "CULT", "ORIGINAL", "CANDY"]);
export const buildingFadeCandyBoardV7 = (): GameStateV7 =>
  buildingFadeReviewStateV7(["CANDY", "CULT", "DWARF", "ORIGINAL"]);
