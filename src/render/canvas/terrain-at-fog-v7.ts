import {
  createInitialMapStateV7,
  type FactionIdV7,
  type MatchSetupV7,
  type PlayerViewV7,
} from "../../engine/index";
import type { FactionForestIdV7 } from "./faction-forests-v7";

/**
 * Multi-cell terrain at the fog's edge (bead pulp_wars-2yc.28,
 * docs/art/TERRAIN_AT_THE_FOG.md). The user, 2026-10-07: "terrain sprites
 * that are more than 1 tile long appear wrong when not the entire sprite is
 * visible (explored). fix it".
 *
 * A mountain massif and a composed forest are drawn as pieces that span
 * several cells. Three things were wrong where only some of those cells
 * were explored:
 *
 * 1. **The piece changed when its neighbours were explored.** The cover
 *    was packed from the explored cells alone, so a single mountain at the
 *    fog's edge turned into half a ridge, a low piece into a tall one, and
 *    a clump into a quarter of a larger piece, a step after it was first
 *    seen.
 * 2. **Art reached over the fog.** The 24 px of tree tops and the 13 px of
 *    peak above a cell were drawn over the unexplored cell behind it.
 * 3. **The cut was a straight line.** Trees and rock are drawn after the
 *    cloud's edge, so along a wood or a range the fog ended on the cell's
 *    edge instead of in the cloud's scallops.
 *
 * What this module gives the board to put them right:
 *
 * - **The terrain skeleton**: the Forest and Mountain cells of the map as
 *   it was made, from the match's own setup (the map of a setup is a pure
 *   function of it). The cover of the pieces is decided over the explored
 *   cells as they are AND the unexplored cells as the skeleton has them
 *   (the **ghosts**), so it is the cover the whole map will have, and
 *   exploring a cell does not change what its neighbours draw.
 * - **The share**: a piece, a seam clump or a band is drawn only over
 *   cells that are not fog (`fogShareRectsV7`). Nothing is ever painted on
 *   an unexplored cell.
 *
 * The board then draws the cloud's edge once more over the trees and the
 * rock (and still under every unit and building), so the cut lies under
 * the cloud.
 *
 * What a ghost can tell: where a piece runs on into the fog, the cell
 * behind the cloud's edge is Forest or Mountain as the map was made. That
 * is one cell's kind of ground, a step before a unit would see it. It
 * never tells what happened there since (a Mine, a Lumber Camp, a cleared
 * wood), who owns it, or what stands on it: a ghost is the skeleton's,
 * not the game's. To draw without it: set TERRAIN_AT_FOG_ENABLED_V7 to
 * false, or open the game with `?fog-terrain=0`; the pieces are then
 * packed from the explored cells alone, as before, and still never
 * painted over the fog.
 */

/** The master switch of the ghosts. False packs explored cells only. */
export const TERRAIN_AT_FOG_ENABLED_V7 = true;

/** `?fog-terrain=0` (or `off`, `false`) turns the ghosts off, `=1` on. */
export const TERRAIN_AT_FOG_PARAMETER_V7 = "fog-terrain";

export function terrainAtFogEnabledV7(search?: string): boolean {
  const query =
    search ??
    (globalThis as { location?: { search?: string } }).location?.search ??
    "";
  let value: string | null;
  try {
    value = new URLSearchParams(query).get(TERRAIN_AT_FOG_PARAMETER_V7);
  } catch {
    value = null;
  }
  if (value === null) return TERRAIN_AT_FOG_ENABLED_V7;
  const text = value.trim().toLowerCase();
  if (text === "0" || text === "off" || text === "false") return false;
  if (text === "1" || text === "on" || text === "true") return true;
  return TERRAIN_AT_FOG_ENABLED_V7;
}

// ---------------------------------------------------------------- skeleton

/**
 * A cell of the skeleton: the kinds of ground whose art spans several
 * cells. Forest and Mountain are composed into pieces; the Rift (bead
 * pulp_wars-2yc.37) is one crack over three cells.
 */
export type SkeletonTerrainV7 = "FOREST" | "MOUNTAIN" | "RIFT" | "OTHER";

/** The map as it was made: one kind of ground a cell, row by row. */
export interface TerrainSkeletonV7 {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly SkeletonTerrainV7[];
}

const skeletonKind = (terrain: string): SkeletonTerrainV7 =>
  terrain === "FOREST" || terrain === "MOUNTAIN" || terrain === "RIFT"
    ? terrain
    : "OTHER";

/** The skeleton of a board as it stands: one kind of ground a tile. */
export function terrainSkeletonOfBoardV7(board: {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly { readonly terrain: string }[];
}): TerrainSkeletonV7 {
  return {
    width: board.width,
    height: board.height,
    cells: board.tiles.map((tile) => skeletonKind(tile.terrain)),
  };
}

/**
 * The skeleton of a match: its map as the setup makes it. Null when the
 * setup does not make a map (a state built by hand in a test or a review).
 */
export function terrainSkeletonOfSetupV7(
  setup: MatchSetupV7,
): TerrainSkeletonV7 | null {
  try {
    const made = createInitialMapStateV7(setup);
    if (!made.ok) return null;
    return terrainSkeletonOfBoardV7(made.state.board);
  } catch {
    return null;
  }
}

/**
 * A skeleton from rows of characters, north first: `^` Mountain, `f`
 * Forest, `x` Rift (the marks of a mission's map), anything else other
 * ground. For the art reviews and the tests, whose states are built by
 * hand.
 */
export function terrainSkeletonOfRowsV7(
  rows: readonly string[],
): TerrainSkeletonV7 {
  const width = rows[0]?.length ?? 0;
  return {
    width,
    height: rows.length,
    cells: rows.flatMap((row) =>
      Array.from({ length: width }, (_, x): SkeletonTerrainV7 =>
        row[x] === "^"
          ? "MOUNTAIN"
          : row[x] === "f"
            ? "FOREST"
            : row[x] === "x"
              ? "RIFT"
              : "OTHER",
      ),
    ),
  };
}

/**
 * Whether a skeleton is this view's map: the same size, and the explored
 * cells have the skeleton's ground (a few may have changed in play: at
 * least nine in ten agree). A state built by hand over another map fails,
 * and is then drawn without ghosts.
 */
export function terrainSkeletonFitsV7(
  skeleton: TerrainSkeletonV7,
  view: PlayerViewV7,
): boolean {
  if (
    skeleton.width !== view.board.width ||
    skeleton.height !== view.board.height ||
    skeleton.cells.length !== view.board.tiles.length
  )
    return false;
  let explored = 0;
  let same = 0;
  for (const [index, tile] of view.board.tiles.entries()) {
    if (!tile.explored) continue;
    explored += 1;
    if (skeletonKind(tile.terrain) === skeleton.cells[index]) same += 1;
  }
  return same * 10 >= explored * 9;
}

const skeletons = new WeakMap<object, TerrainSkeletonV7 | null>();

/**
 * The skeleton of a view's match, made once per setup and checked against
 * the view; null when the match has none.
 */
export function terrainSkeletonOfViewV7(
  view: PlayerViewV7,
): TerrainSkeletonV7 | null {
  let skeleton = skeletons.get(view.setup);
  if (skeleton === undefined) {
    skeleton = terrainSkeletonOfSetupV7(view.setup);
    skeletons.set(view.setup, skeleton);
  }
  return skeleton !== null && terrainSkeletonFitsV7(skeleton, view)
    ? skeleton
    : null;
}

// ------------------------------------------------------------------ ghosts

/**
 * An unexplored cell that the skeleton has as Forest or Mountain, shaped
 * like the terrain entry of a board plan so that the packing reads it as
 * one. It is never drawn: it only takes its place in the cover.
 */
export interface TerrainGhostV7 {
  readonly key: string;
  readonly kind: "TERRAIN";
  readonly layer: 1;
  readonly at: { readonly x: number; readonly y: number };
  readonly artSubject: "TERRAIN:FOREST" | "TERRAIN:MOUNTAIN";
  /** The forest of the territory it lies in, as far as the view tells. */
  readonly factionForest?: FactionForestIdV7;
  readonly ghost: true;
}

/**
 * The factions with a forest of their own: FACTION_FOREST_IDS_V7, repeated
 * here because faction-forests-v7.ts draws through this module (a test
 * holds the two lists together).
 */
export const GHOST_FOREST_FACTIONS_V7: ReadonlySet<string> = new Set([
  "UNDEAD",
  "GOBLIN",
  "DINOSAUR",
  "MARTIAN",
  "DWARF",
  "CANDY",
  // The tundra forest (pulp_wars-2yc.38). A ghost takes its faction from the
  // territory of the explored ground beside it, not from that ground's
  // look, so the Ice Folk Snow needs nothing more.
  "ICE_FOLK",
  // The lantern wood (pulp_wars-mch9.22).
  "CULT",
]);

const STEPS = [
  [0, -1, "NORTH"],
  [-1, 0, "WEST"],
  [1, 0, "EAST"],
  [0, 1, "SOUTH"],
] as const;

/** The edge between two cells, as the view's border segments name it. */
function borderKey(
  x: number,
  y: number,
  edge: "NORTH" | "EAST" | "SOUTH" | "WEST",
): string {
  if (edge === "NORTH") return `h:${x}:${y}`;
  if (edge === "SOUTH") return `h:${x}:${y + 1}`;
  if (edge === "WEST") return `v:${x}:${y}`;
  return `v:${x + 1}:${y}`;
}

/**
 * The ghosts of a view: every unexplored cell the skeleton has as Forest
 * or Mountain. A ghost Forest next to explored ground takes that ground's
 * territory when the view shows no border between them (the view shows
 * every border that touches explored ground), and a ghost one step
 * farther takes it from the ghost before it; so a faction's wood that
 * runs into the fog is packed as one wood.
 *
 * Reads the skeleton, which cells are explored, the explored cells'
 * territory and the view's borders. Nothing of an unexplored cell.
 */
export function terrainGhostsV7(
  view: PlayerViewV7,
  skeleton: TerrainSkeletonV7,
): readonly TerrainGhostV7[] {
  const { width, height, tiles } = view.board;
  const factionOf = new Map<unknown, FactionIdV7>(
    view.players.map((player) => [player.id, player.faction] as const),
  );
  const borders = new Set<string>();
  for (const segment of view.board.territoryBorders)
    if (segment.ownerId !== null)
      borders.add(borderKey(segment.at.x, segment.at.y, segment.edge));
  /** The faction whose territory a cell lies in: null none, undefined unknown. */
  const territory: (FactionIdV7 | null | undefined)[] = tiles.map((tile) =>
    tile.explored
      ? tile.territoryOwnerId === null
        ? null
        : (factionOf.get(tile.territoryOwnerId) ?? null)
      : undefined,
  );
  // Two steps out from the explored ground: a 2 x 2 block of a wood lies
  // within two steps of each of its cells.
  for (let step = 0; step < 2; step += 1) {
    const next = [...territory];
    for (let y = 0; y < height; y += 1)
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        if (territory[index] !== undefined) continue;
        for (const [dx, dy, edge] of STEPS) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const known = territory[ny * width + nx];
          if (known === undefined || borders.has(borderKey(x, y, edge)))
            continue;
          next[index] = known;
          break;
        }
      }
    for (const [index, value] of next.entries()) territory[index] = value;
  }
  const ghosts: TerrainGhostV7[] = [];
  for (const [index, tile] of tiles.entries()) {
    if (tile.explored) continue;
    const kind = skeleton.cells[index];
    if (kind !== "FOREST" && kind !== "MOUNTAIN") continue;
    const faction = territory[index];
    ghosts.push({
      key: `ghost:${tile.at.x},${tile.at.y}`,
      kind: "TERRAIN",
      layer: 1,
      at: tile.at,
      artSubject: `TERRAIN:${kind}`,
      ...(kind === "FOREST" &&
      typeof faction === "string" &&
      GHOST_FOREST_FACTIONS_V7.has(faction)
        ? { factionForest: faction as FactionForestIdV7 }
        : {}),
      ghost: true,
    });
  }
  return ghosts;
}

const ghostsByView = new WeakMap<object, readonly TerrainGhostV7[]>();

/** The ghosts of a view (none without a skeleton), computed once per view. */
export function terrainGhostsOfV7(
  view: PlayerViewV7,
  skeleton: TerrainSkeletonV7 | null,
): readonly TerrainGhostV7[] {
  if (skeleton === null) return [];
  let ghosts = ghostsByView.get(view);
  if (ghosts === undefined) {
    ghosts = terrainGhostsV7(view, skeleton);
    ghostsByView.set(view, ghosts);
  }
  return ghosts;
}

interface PlanEntry {
  readonly kind: string;
  readonly at: { readonly x: number; readonly y: number };
}

const compositions = new WeakMap<
  object,
  { readonly ghosts: object; readonly entries: readonly unknown[] }
>();

/**
 * What the packing of forests and massifs reads: a plan's entries and,
 * after them, its ghosts. The same array for the same plan, so the
 * packers' own caches hold.
 */
export function compositionEntriesV7<Entry extends PlanEntry>(plan: {
  readonly entries: readonly Entry[];
  readonly ghosts?: readonly TerrainGhostV7[];
}): readonly (Entry | TerrainGhostV7)[] {
  const ghosts = plan.ghosts;
  if (ghosts === undefined || ghosts.length === 0) return plan.entries;
  const known = compositions.get(plan.entries);
  if (known?.ghosts === ghosts)
    return known.entries as readonly (Entry | TerrainGhostV7)[];
  const entries = [...plan.entries, ...ghosts];
  compositions.set(plan.entries, { ghosts, entries });
  return entries;
}

// --------------------------------------------------------------- the share

/** Whether a cell is unexplored. Outside the map nothing is. */
export type FogAtV7 = (x: number, y: number) => boolean;

const fogSets = new WeakMap<object, FogAtV7>();
const NO_FOG: FogAtV7 = () => false;

/** Which cells of a plan are fog: its FOG entries, read once per plan. */
export function fogAtOfV7(entries: readonly PlanEntry[]): FogAtV7 {
  let fogAt = fogSets.get(entries);
  if (fogAt === undefined) {
    const fog = new Set<string>();
    for (const entry of entries)
      if (entry.kind === "FOG") fog.add(`${entry.at.x},${entry.at.y}`);
    fogAt = fog.size === 0 ? NO_FOG : (x, y) => fog.has(`${x},${y}`);
    fogSets.set(entries, fogAt);
  }
  return fogAt;
}

export interface ShareRectV7 {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const CELL = 80;

/**
 * The part of a rectangle of art that lies over cells that are not fog.
 * `rect` is in master pixels from the top left of cell `origin`. Null when
 * no cell under it is fog (the art is drawn whole, as it always was);
 * otherwise the rectangles to draw, each inside one row of cells and
 * running over neighbouring cells that are not fog, in master pixels from
 * the same origin. Empty when every cell under it is fog.
 */
export function fogShareRectsV7(
  origin: { readonly x: number; readonly y: number },
  rect: ShareRectV7,
  fogAt: FogAtV7 | null | undefined,
): ShareRectV7[] | null {
  if (fogAt === null || fogAt === undefined || fogAt === NO_FOG) return null;
  if (rect.width <= 0 || rect.height <= 0) return null;
  const column0 = Math.floor(rect.x / CELL);
  const column1 = Math.ceil((rect.x + rect.width) / CELL) - 1;
  const row0 = Math.floor(rect.y / CELL);
  const row1 = Math.ceil((rect.y + rect.height) / CELL) - 1;
  let any = false;
  for (let row = row0; row <= row1 && !any; row += 1)
    for (let column = column0; column <= column1; column += 1)
      if (fogAt(origin.x + column, origin.y + row)) {
        any = true;
        break;
      }
  if (!any) return null;
  const shares: ShareRectV7[] = [];
  for (let row = row0; row <= row1; row += 1) {
    const top = Math.max(rect.y, row * CELL);
    const bottom = Math.min(rect.y + rect.height, (row + 1) * CELL);
    let start: number | null = null;
    for (let column = column0; column <= column1 + 1; column += 1) {
      const open =
        column <= column1 && !fogAt(origin.x + column, origin.y + row);
      if (open && start === null) start = column;
      if (!open && start !== null) {
        const left = Math.max(rect.x, start * CELL);
        const right = Math.min(rect.x + rect.width, column * CELL);
        shares.push({
          x: left,
          y: top,
          width: right - left,
          height: bottom - top,
        });
        start = null;
      }
    }
  }
  return shares;
}
