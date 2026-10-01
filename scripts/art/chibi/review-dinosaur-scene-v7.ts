/**
 * Synthetic in-game scene for the Dinosaur art review (bead pulp_wars-c87.7).
 *
 * Loaded in the browser through the Vite dev server by
 * scripts/art/chibi-dinosaur-review.ts: it takes the live Ruleset 7 player
 * view, rewrites a patch of Grass around the viewer's capital and draws it
 * with the real CanvasBoardHostV7 and ?art=chibi, full screen over the
 * running game. Nothing here is part of the game build.
 *
 * Layout: one column per owner and one row per land role (Fighter, Raider,
 * Marksman, Guard, Captain, Catapult, Knight, Juggernaut from the top), then
 * a row of Eggs under the Dinosaur columns. The first four columns are
 * Dinosaur seats in the four player colours (Coral, Teal, Gold, Violet), so
 * the blue hide is checked under every owner; the optional last three are a
 * Human, an Undead and a Goblin seat for scale. Every second row is at half
 * HP, so the HP bar and the seat badge are drawn beside every sprite.
 */
import type {
  CoordV7,
  FactionIdV7,
  PlayerColorV7,
  PlayerViewV7,
  UnitRoleIdV7,
} from "../../../src/engine/index";
import { CanvasBoardHostV7 } from "../../../src/render/canvas/board-host-v7";

type Tile = PlayerViewV7["board"]["tiles"][number];
type Unit = PlayerViewV7["units"][number];

const ROLES: readonly UnitRoleIdV7[] = [
  "FIGHTER",
  "RAIDER",
  "MARKSMAN",
  "GUARD",
  "CAPTAIN",
  "CATAPULT",
  "KNIGHT",
  "JUGGERNAUT",
];

const COLOURS: readonly PlayerColorV7[] = ["CORAL", "TEAL", "GOLD", "VIOLET"];

/** The four Dinosaur columns, then the other three factions for scale. */
const COLUMNS: readonly {
  readonly faction: FactionIdV7;
  readonly color: PlayerColorV7;
}[] = [
  ...COLOURS.map((color) => ({ faction: "DINOSAUR" as const, color })),
  { faction: "ORIGINAL", color: "CORAL" },
  { faction: "UNDEAD", color: "TEAL" },
  { faction: "GOBLIN", color: "GOLD" },
];

/** The live view with the roster patch written around the viewer's capital. */
export function chibiDinosaurReviewViewV7(
  live: PlayerViewV7,
  columnCount: number = COLUMNS.length,
): { readonly view: PlayerViewV7; readonly centre: CoordV7 } {
  const viewerId = live.viewer.id;
  const capital =
    live.cities.find((city) => city.ownerId === viewerId && city.isCapital) ??
    live.cities[0];
  const template = live.units.find((unit) => unit.ownerId === viewerId);
  const viewer = live.players.find((player) => player.id === viewerId);
  if (capital === undefined || template === undefined || viewer === undefined)
    throw new Error("the live view has no capital, unit or viewer");
  const columns = COLUMNS.slice(0, columnCount);
  const rows = ROLES.length + 1;
  const origin = {
    // Column 1 at the least: the HP bar and seat badge sit left of a sprite.
    x: Math.max(
      1,
      Math.min(
        live.board.width - columns.length,
        capital.at.x - Math.floor(columns.length / 2),
      ),
    ),
    y: Math.max(
      0,
      Math.min(live.board.height - rows, capital.at.y - Math.floor(rows / 2)),
    ),
  };
  const firstExtraId = Math.max(...live.players.map((player) => player.id)) + 1;
  const owners = columns.map((column, index) => ({
    ...viewer,
    id: (index === 0 ? viewer.id : firstExtraId + index) as typeof viewer.id,
    seat: index === 0 ? viewer.seat : live.players.length + index,
    color: column.color,
    faction: column.faction,
  }));
  const units: Unit[] = [];
  for (const [column, owner] of owners.entries()) {
    for (const [row, role] of ROLES.entries())
      units.push({
        ...template,
        id: (9000 + units.length) as typeof template.id,
        ownerId: owner.id,
        role,
        form: "LAND",
        hp: row % 2 === 0 ? template.maxHp : Math.ceil(template.maxHp / 2),
        at: { x: origin.x + column, y: origin.y + row },
      });
    if (owner.faction === "DINOSAUR")
      units.push({
        ...template,
        id: (9000 + units.length) as typeof template.id,
        ownerId: owner.id,
        role: "RAIDER",
        form: "EGG",
        hp: column % 2 === 0 ? template.maxHp : Math.ceil(template.maxHp / 2),
        at: { x: origin.x + column, y: origin.y + ROLES.length },
      });
  }
  const tiles: Tile[] = live.board.tiles.map((tile) => ({
    at: tile.at,
    explored: true,
    biome: null,
    terrain: "GRASS",
    resource: null,
    improvement: null,
    road: false,
    fieldDefense: false,
    fortificationLevel: null,
    site: null,
    territoryCityId: null,
    territoryOwnerId: null,
  }));
  return {
    view: {
      ...live,
      viewer: { ...live.viewer, faction: "DINOSAUR" },
      players: [
        ...live.players.filter((player) => player.id !== viewerId),
        ...owners,
      ].sort((left, right) => left.id - right.id),
      board: { ...live.board, tiles, territoryBorders: [] },
      cities: [],
      units,
      treasureChests: [],
      graves: [],
      plagued: [],
      bitten: [],
      improvementValues: [],
    },
    centre: {
      x: origin.x + Math.floor((columns.length - 1) / 2),
      y: origin.y + Math.floor(rows / 2),
    },
  };
}

/** Mounts a full-screen CHIBI board host over the page showing the patch. */
export function showChibiDinosaurReviewV7(
  live: PlayerViewV7,
  columnCount?: number,
): {
  readonly host: CanvasBoardHostV7;
  readonly canvas: HTMLCanvasElement;
  readonly centre: CoordV7;
} {
  document
    .querySelectorAll("[data-chibi-review-scene]")
    .forEach((node) => node.remove());
  const { view, centre } = chibiDinosaurReviewViewV7(live, columnCount);
  const container = document.createElement("div");
  container.dataset.chibiReviewScene = "true";
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
  host.update({
    matchInstanceId: "chibi-dinosaur-review-scene",
    view,
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
    artSet: "CHIBI",
  });
  const canvas = container.querySelector("canvas.board-canvas-v7");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("the review scene has no board canvas");
  return { host, canvas, centre };
}
