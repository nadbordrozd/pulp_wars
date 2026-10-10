/**
 * Review scene of the faction colours (bead pulp_wars-b5f.4,
 * docs/art/FACTION_COLOURS.md): the nine factions' territories side by
 * side (seven until the Cult registration, pulp_wars-mch9.3, which added
 * the Cult beside the Dwarves, its nearest colour, and the Candy), each
 * running over the same strip of ground, so every border colour
 * is seen on Mountain, Grass, Snow, Shallow Water and Deep Water. Loaded in
 * the browser through the Vite dev server by
 * scripts/art/faction-colours-review.ts and drawn by the real
 * CanvasBoardHostV7 in the look asked for: the live look the game passes
 * (`liveBoardLookV7`), the Classic look, or the LEGACY art set. Nothing here
 * is part of the game build.
 *
 * The board is 30 x 9. Each faction holds a territory two cells wide and
 * six tall (rows 1 to 6), with one unowned column between territories and
 * an unowned frame, so every edge of a territory is a single-owner border:
 *
 *   row 0  Grass (unowned)
 *   row 1  Mountain
 *   row 2  Grass, the faction's City 2 in the left cell
 *   row 3  Grass, the faction's Fighter in the right cell
 *   row 4  Snow (Grass under the Ice Folk overlay)
 *   row 5  Shallow Water
 *   row 6  Deep Water
 *   rows 7, 8  Deep Water (unowned)
 *
 * The unowned columns repeat each row's terrain, so the vertical borders
 * cross every kind of ground. The viewer is the faction asked for; its city
 * is its capital, which the camera frames.
 */
import type {
  BoardSizeV7,
  CityId,
  CoordV7,
  FactionIdV7,
  PlayerColorV7,
  PlayerId,
  PlayerViewV7,
  TerrainIdV7,
} from "../../../src/engine/index";
import { CanvasBoardHostV7 } from "../../../src/render/canvas/board-host-v7";
import { liveBoardLookV7 } from "../../../src/render/canvas/live-board-look-v7";

type Tile = PlayerViewV7["board"]["tiles"][number];

/**
 * The nine factions in scene order, west to east. The Cult's eldritch
 * green stands beside the Dwarf jade, its nearest neighbour
 * (docs/art/factions/CULT.md, "Faction colour, seat and hue token").
 */
export const FACTION_COLOURS_SCENE_FACTIONS_V7: readonly FactionIdV7[] = [
  "UNDEAD",
  "MARTIAN",
  "ICE_FOLK",
  "ORIGINAL",
  "DINOSAUR",
  "GOBLIN",
  "DWARF",
  "CULT",
  "CANDY",
];

export type FactionColoursLookV7 = "LIVE" | "CLASSIC" | "LEGACY";

const WIDTH = 30;
const HEIGHT = 9;
/** The west column of territory `index`. */
const territoryX = (index: number): number => 2 + index * 3;
const ROWS: readonly { readonly terrain: TerrainIdV7; readonly snow?: true }[] =
  [
    { terrain: "GRASS" },
    { terrain: "MOUNTAIN" },
    { terrain: "GRASS" },
    { terrain: "GRASS" },
    { terrain: "GRASS", snow: true },
    { terrain: "SHALLOW_WATER" },
    { terrain: "DEEP_WATER" },
    { terrain: "DEEP_WATER" },
    { terrain: "DEEP_WATER" },
  ];
const SEAT_COLOURS: readonly PlayerColorV7[] = [
  "CORAL",
  "TEAL",
  "GOLD",
  "VIOLET",
];

export function factionColoursSceneViewV7(
  live: PlayerViewV7,
  viewerFaction: FactionIdV7,
): PlayerViewV7 {
  const liveCapital =
    live.cities.find(
      (city) => city.ownerId === live.viewer.id && city.isCapital,
    ) ?? live.cities[0];
  const template = live.units.find((unit) => unit.ownerId === live.viewer.id);
  const viewer = live.players.find((player) => player.id === live.viewer.id);
  if (
    liveCapital === undefined ||
    template === undefined ||
    viewer === undefined
  )
    throw new Error("the live view has no capital, unit or viewer");
  const viewerIndex = FACTION_COLOURS_SCENE_FACTIONS_V7.indexOf(viewerFaction);
  if (viewerIndex < 0) throw new Error(`no ${viewerFaction} in the scene`);
  const base = Math.max(...live.players.map((player) => player.id)) + 1;
  const playerId = (index: number): PlayerId =>
    (index === viewerIndex ? live.viewer.id : base + index) as PlayerId;
  const players = FACTION_COLOURS_SCENE_FACTIONS_V7.map((faction, index) => ({
    ...viewer,
    id: playerId(index),
    seat: index,
    // The engine's seat colour is not shown; it cycles here on purpose.
    color: SEAT_COLOURS[index % SEAT_COLOURS.length] ?? "CORAL",
    faction,
    controller: index === viewerIndex ? viewer.controller : ("AI" as const),
  }));
  const cityId = (index: number): CityId =>
    (Number(liveCapital.id) + 700 + index) as CityId;
  const territoryOf = (at: CoordV7): number | null => {
    if (at.y < 1 || at.y > 6) return null;
    const index = Math.floor((at.x - 2) / 3);
    if (index < 0 || index >= FACTION_COLOURS_SCENE_FACTIONS_V7.length)
      return null;
    return at.x - territoryX(index) <= 1 ? index : null;
  };
  const tiles: Tile[] = [];
  for (let y = 0; y < HEIGHT; y += 1)
    for (let x = 0; x < WIDTH; x += 1) {
      const row = ROWS[y] ?? { terrain: "GRASS" };
      const index = territoryOf({ x, y });
      const city = index !== null && y === 2 && x === territoryX(index);
      tiles.push({
        at: { x, y },
        explored: true,
        // Snow is drawn on land with a biome only.
        biome:
          row.terrain === "GRASS"
            ? "PLAINS"
            : row.terrain === "MOUNTAIN"
              ? "HIGHLANDS"
              : null,
        terrain: row.terrain,
        resource: null,
        improvement: null,
        road: false,
        fieldDefense: false,
        fortificationLevel: null,
        site: city ? "CITY" : null,
        territoryCityId: index === null ? null : cityId(index),
        territoryOwnerId: index === null ? null : playerId(index),
        snow: row.snow === true,
        blizzard: false,
      });
    }
  const cities = FACTION_COLOURS_SCENE_FACTIONS_V7.map((_, index) => ({
    ...liveCapital,
    id: cityId(index),
    ownerId: playerId(index),
    at: { x: territoryX(index), y: 2 },
    level: 2,
    population: 2,
    isCapital: index === viewerIndex,
  }));
  const units = FACTION_COLOURS_SCENE_FACTIONS_V7.map((_, index) => ({
    ...template,
    id: (9100 + index) as typeof template.id,
    ownerId: playerId(index),
    role: "FIGHTER" as const,
    form: "LAND" as const,
    at: { x: territoryX(index) + 1, y: 3 },
    hp: template.maxHp,
    activation: { ...template.activation, handled: true },
  }));
  const ownerAt = (at: CoordV7): PlayerId | null => {
    if (at.x < 0 || at.y < 0 || at.x >= WIDTH || at.y >= HEIGHT) return null;
    const index = territoryOf(at);
    return index === null ? null : playerId(index);
  };
  const territoryBorders: PlayerViewV7["board"]["territoryBorders"][number][] =
    [];
  for (const tile of tiles)
    for (const [edge, dx, dy] of [
      ["NORTH", 0, -1],
      ["EAST", 1, 0],
      ["SOUTH", 0, 1],
      ["WEST", -1, 0],
    ] as const) {
      // Each edge once: from its west or north tile, or the board's rim.
      if (
        (edge === "WEST" && tile.at.x > 0) ||
        (edge === "NORTH" && tile.at.y > 0)
      )
        continue;
      const left = ownerAt(tile.at);
      const right = ownerAt({ x: tile.at.x + dx, y: tile.at.y + dy });
      if (left === right) continue;
      territoryBorders.push({
        at: tile.at,
        edge,
        ownerId: left ?? right,
        sharedOwnerIds: left !== null && right !== null ? [left, right] : null,
        cityIds: [],
      });
    }
  return {
    ...live,
    viewer: { ...live.viewer, faction: viewerFaction },
    players,
    board: {
      ...live.board,
      width: WIDTH as BoardSizeV7,
      height: HEIGHT as BoardSizeV7,
      tiles,
      territoryBorders,
    },
    cities,
    units,
    treasureChests: [],
    graves: [],
    improvementValues: [],
    unitStats: [],
    plagued: [],
    bitten: [],
  };
}

/**
 * Mounts a full-screen board host over the page showing the scene in the
 * look asked for.
 */
export function showFactionColoursSceneV7(
  live: PlayerViewV7,
  options: {
    readonly look: FactionColoursLookV7;
    readonly viewerFaction: FactionIdV7;
  },
): { readonly host: CanvasBoardHostV7; readonly canvas: HTMLCanvasElement } {
  document
    .querySelectorAll("[data-faction-colours-scene]")
    .forEach((node) => node.remove());
  const container = document.createElement("div");
  container.dataset.factionColoursScene = "true";
  Object.assign(container.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    background: "#173632",
  });
  document.body.append(container);
  const host = new CanvasBoardHostV7(document);
  host.mount(container, {
    onSelection: () => undefined,
    onCommand: () => undefined,
  });
  const artSet = options.look === "LEGACY" ? "LEGACY" : "CHIBI";
  host.update({
    matchInstanceId: `faction-colours-${options.look}-${options.viewerFaction}`,
    view: factionColoursSceneViewV7(live, options.viewerFaction),
    offeredCommands: [],
    interaction: {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    },
    interactive: false,
    motion: "REDUCED",
    animationSpeed: "NORMAL",
    presentationPaused: true,
    highContrast: false,
    artSet,
    ...liveBoardLookV7(artSet, options.look === "CLASSIC"),
  });
  const canvas = container.querySelector("canvas.board-canvas-v7");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("the review scene has no board canvas");
  return { host, canvas };
}
