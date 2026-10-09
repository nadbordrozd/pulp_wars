import type { CoordV7, PlayerViewV7 } from "../../engine/index";
import type { CuriosityOverlayIdV7 } from "../../assets/chibi-art-v7";
import {
  CURIOSITY_LABELS_V7,
  isDrawnCuriosityKindV7,
  matchHasCuriositiesV7,
  monsterPreviewsV7,
  visibleLairsV7,
} from "../curiosity-presentation-v7";
import type {
  BoardRenderPlanEntryV7,
  BoardSelectionV7,
} from "./board-renderer-v7";
import type { TileEdge } from "./geometry";
import { BOARD_LABEL_FONT_FAMILY_V7 } from "./board-label-font-v7";

/**
 * Map curiosities on the board (bead pulp_wars-737.6,
 * docs/product/RULESET_7_MAP_CURIOSITIES.md section 12): the plan entries
 * of the tile overlays (the lair web, the Fountain of Youth, the Shrine,
 * the Sunken Wreck) and of a selected Spider's area and reach, and the
 * code-drawn markers of the LEGACY art set and the classic look (and of a
 * raster still loading): a web, a basin, an arch, a mast, and a neutral
 * disc with a spider for the Monster. Every colour is a neutral of
 * docs/art/classes/curiosities.md (umber, taupe, stone, bone white), never
 * a faction colour.
 */

/** LEGACY has no Spider raster: this id resolves to no image. */
export const SPIDER_CODE_ART_ID_V7 = "unit-neutral-giant-spider-code";

/** UNIT entries of the neutral Giant Spider. */
export interface MonsterUnitMarkerV7 {
  /** A visible unit stands next to it or hurt it: the provoked marker. */
  readonly provoked: boolean;
}

/**
 * The Wreck's master is a whole listing hull (curiosities.md section 6):
 * its lowest opaque rows are cut at a waterline and two ripple marks are
 * drawn over the cut, so it sits in the water instead of on it. Master
 * rows from the canvas top (the hull's opaque rows end at 64).
 */
export const WRECK_WATERLINE_ROW_V7 = 58;

const TILE_EDGES: readonly TileEdge[] = ["NORTH", "EAST", "SOUTH", "WEST"];
const key = (at: CoordV7): string => `${at.x},${at.y}`;
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const across = (at: CoordV7, edge: TileEdge): CoordV7 =>
  edge === "NORTH"
    ? { x: at.x, y: at.y - 1 }
    : edge === "SOUTH"
      ? { x: at.x, y: at.y + 1 }
      : edge === "EAST"
        ? { x: at.x + 1, y: at.y }
        : { x: at.x - 1, y: at.y };

/**
 * Adds the curiosity entries of a view. A view with no curiosity and no
 * visible Monster adds nothing, so its plan is exactly the plan of a match
 * without the option.
 *
 * Draw order: the web lies on the ground (layer 3.5, under a chest, a unit
 * and the Spider itself); the Fountain, Shrine and Wreck are pieces of
 * their cell (layer 4, like a Treasure chest) and so are drawn over the
 * Forest body of their own cell and under the unit standing on them.
 */
export function addCuriosityEntriesV7(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  selection: BoardSelectionV7 | null,
): void {
  if (!matchHasCuriositiesV7(view)) return;
  for (const home of visibleLairsV7(view))
    entries.push({
      key: `curiosity:WEB:${key(home)}`,
      kind: "CURIOSITY",
      layer: 3.5,
      at: home,
      artSubject: "CURIOSITY:WEB",
      curiosity: "WEB",
      label: CURIOSITY_LABELS_V7.WEB,
    });
  for (const curiosity of view.curiosities) {
    // The round-2 kinds are drawn by the round-2 UI bead.
    const kind = curiosity.kind;
    if (!isDrawnCuriosityKindV7(kind)) continue;
    entries.push({
      key: `curiosity:${kind}:${key(curiosity.at)}`,
      kind: "CURIOSITY",
      layer: 4,
      at: curiosity.at,
      artSubject: `CURIOSITY:${kind}`,
      curiosity: kind,
      label: CURIOSITY_LABELS_V7[kind],
    });
  }
  // A selected Spider (or its tile, or its lair): its area outlined and
  // the tiles it could attack after one step shaded.
  if (selection === null || selection.kind === "CITY") return;
  for (const preview of monsterPreviewsV7(view)) {
    const unit = view.units.find(
      (candidate) => candidate.id === preview.unitId,
    );
    if (unit === undefined) continue;
    const selected =
      selection.kind === "UNIT"
        ? selection.unitId === preview.unitId
        : same(selection.at, unit.at) || same(selection.at, preview.home);
    if (!selected) continue;
    const explored = (at: CoordV7): boolean =>
      view.board.tiles[at.y * view.board.width + at.x]?.explored === true;
    const area = new Set(preview.area.map(key));
    for (const at of preview.area)
      entries.push({
        key: `ability-area:MONSTER_AREA:${key(at)}`,
        kind: "ABILITY_AREA",
        layer: 7,
        at,
        abilityStyle: "MONSTER_AREA",
        targetEdges: TILE_EDGES.filter(
          (edge) => !area.has(key(across(at, edge))),
        ),
      });
    for (const at of preview.reachTiles)
      if (explored(at))
        entries.push({
          key: `ability-area:MONSTER_REACH:${key(at)}`,
          kind: "ABILITY_AREA",
          layer: 7,
          at,
          abilityStyle: "MONSTER_REACH",
          targetEdges: [],
        });
  }
}

const INK = "#1d1a17";
const BONE = "#efe6d0";
const STONE = "#a9a59a";
const STONE_SHADE = "#77746c";
const UMBER = "#8a5a33";
const UMBER_SHADE = "#5f3d22";
const WATER = "#dff6f4";
const DRIFTWOOD = "#8c7a66";

/**
 * A code-drawn tile marker. `x`, `y` is the cell centre and `zoom` the
 * camera zoom (128 world units to a cell).
 */
export function drawCuriosityMarkerV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  id: CuriosityOverlayIdV7,
  highContrast = false,
): void {
  const u = zoom;
  const ink = highContrast ? "#000000" : INK;
  context.save();
  context.lineJoin = "round";
  context.lineCap = "round";
  context.strokeStyle = ink;
  context.lineWidth = Math.max(1, 3 * u);
  if (id === "WEB") {
    // A wheel of silk strands to the cell's edges.
    const radius = 52 * u;
    context.strokeStyle = highContrast ? "#ffffff" : BONE;
    context.lineWidth = Math.max(1, 2.5 * u);
    for (let spoke = 0; spoke < 4; spoke += 1) {
      const angle = (spoke * Math.PI) / 4 + Math.PI / 8;
      context.beginPath();
      context.moveTo(
        x - Math.cos(angle) * radius,
        y - Math.sin(angle) * radius * 0.8,
      );
      context.lineTo(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius * 0.8,
      );
      context.stroke();
    }
    for (const ring of [0.38, 0.7, 1]) {
      context.beginPath();
      for (let corner = 0; corner <= 8; corner += 1) {
        const angle = (corner * Math.PI) / 4 + Math.PI / 8;
        const px = x + Math.cos(angle) * radius * ring;
        const py = y + Math.sin(angle) * radius * ring * 0.8;
        if (corner === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.stroke();
    }
  } else if (id === "FOUNTAIN") {
    // A wide stone basin with bright water and a white plume.
    context.fillStyle = highContrast ? "#ffffff" : STONE;
    context.beginPath();
    context.ellipse(x, y + 20 * u, 50 * u, 22 * u, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = highContrast ? "#000000" : WATER;
    context.beginPath();
    context.ellipse(x, y + 16 * u, 38 * u, 14 * u, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = highContrast ? "#ffffff" : STONE_SHADE;
    context.fillRect(x - 5 * u, y - 14 * u, 10 * u, 30 * u);
    context.strokeRect(x - 5 * u, y - 14 * u, 10 * u, 30 * u);
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.moveTo(x - 9 * u, y - 14 * u);
    context.quadraticCurveTo(x, y - 46 * u, x + 9 * u, y - 14 * u);
    context.closePath();
    context.fill();
    context.stroke();
  } else if (id === "SHRINE") {
    // A stone arch with a pale idol inside.
    context.fillStyle = highContrast ? "#ffffff" : STONE;
    context.beginPath();
    context.moveTo(x - 30 * u, y + 34 * u);
    context.lineTo(x - 30 * u, y - 6 * u);
    context.arc(x, y - 6 * u, 30 * u, Math.PI, 0);
    context.lineTo(x + 30 * u, y + 34 * u);
    context.lineTo(x + 14 * u, y + 34 * u);
    context.lineTo(x + 14 * u, y - 4 * u);
    context.arc(x, y - 4 * u, 14 * u, 0, Math.PI, true);
    context.lineTo(x - 14 * u, y + 34 * u);
    context.closePath();
    context.fill();
    context.stroke();
    context.fillStyle = highContrast ? "#000000" : "#fff6dc";
    context.beginPath();
    context.arc(x, y + 20 * u, 8 * u, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  } else {
    // A leaning broken mast with a torn sail over hull ribs: the whole
    // wreck lists, its stern under the water.
    context.save();
    context.translate(x, y + 30 * u);
    context.rotate(0.3);
    context.translate(-x, -(y + 30 * u));
    context.strokeStyle = ink;
    context.lineWidth = Math.max(2, 9 * u);
    context.beginPath();
    context.moveTo(x - 10 * u, y + 30 * u);
    context.lineTo(x + 10 * u, y - 40 * u);
    context.stroke();
    context.strokeStyle = highContrast ? "#ffffff" : DRIFTWOOD;
    context.lineWidth = Math.max(1, 5 * u);
    context.stroke();
    context.strokeStyle = ink;
    context.lineWidth = Math.max(1, 3 * u);
    context.fillStyle = highContrast ? "#ffffff" : BONE;
    context.beginPath();
    context.moveTo(x + 8 * u, y - 34 * u);
    context.lineTo(x + 30 * u, y - 24 * u);
    context.lineTo(x + 20 * u, y - 16 * u);
    context.lineTo(x + 30 * u, y - 8 * u);
    context.lineTo(x + 16 * u, y - 6 * u);
    context.lineTo(x + 20 * u, y + 6 * u);
    context.lineTo(x, y - 6 * u);
    context.closePath();
    context.fill();
    context.stroke();
    context.fillStyle = highContrast ? "#ffffff" : DRIFTWOOD;
    context.beginPath();
    context.moveTo(x - 44 * u, y + 22 * u);
    context.quadraticCurveTo(x, y + 44 * u, x + 44 * u, y + 14 * u);
    context.lineTo(x + 30 * u, y + 34 * u);
    context.lineTo(x - 30 * u, y + 36 * u);
    context.closePath();
    context.fill();
    context.stroke();
    // Hull ribs.
    context.lineWidth = Math.max(1, 2 * u);
    for (const rib of [-18, -4, 10]) {
      context.beginPath();
      context.moveTo(x + rib * u, y + 26 * u);
      context.lineTo(x + (rib + 4) * u, y + 35 * u);
      context.stroke();
    }
    context.restore();
    drawWreckRipplesV7(context, x, y + 40 * u, 40 * u, u);
  }
  context.restore();
}

/** Two pale ripple marks where the Wreck meets the water. */
export function drawWreckRipplesV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  halfWidth: number,
  unit: number,
): void {
  context.save();
  context.strokeStyle = "rgba(255, 255, 255, 0.7)";
  context.lineCap = "butt";
  context.lineWidth = Math.max(1, 1.5 * unit);
  context.setLineDash([]);
  for (const [from, to, drop] of [
    [-1, -0.2, 0],
    [0.1, 0.95, 0],
    [-0.5, 0.45, 5],
  ] as const) {
    context.beginPath();
    context.moveTo(x + from * halfWidth, y + drop * unit);
    context.lineTo(x + to * halfWidth, y + drop * unit);
    context.stroke();
  }
  context.restore();
}

/**
 * The code-drawn Giant Spider: a neutral earth disc (no owner colour) with
 * a spider: eight legs, a round abdomen and two pale eyes.
 */
export function drawCodeSpiderV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  highContrast = false,
): void {
  const u = zoom;
  const ink = highContrast ? "#000000" : INK;
  const cy = y - 2 * u;
  context.save();
  context.lineJoin = "round";
  context.lineCap = "round";
  context.fillStyle = highContrast ? "#ffffff" : "#b9a58a";
  context.strokeStyle = ink;
  context.lineWidth = Math.max(1, 3 * u);
  context.beginPath();
  context.arc(x, cy, 30 * u, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.lineWidth = Math.max(1, 3.2 * u);
  for (const side of [-1, 1])
    for (const [reach, lift] of [
      [24, -16],
      [27, -6],
      [27, 6],
      [23, 16],
    ] as const) {
      context.beginPath();
      context.moveTo(x + side * 8 * u, cy + lift * 0.3 * u);
      context.lineTo(x + side * 17 * u, cy + (lift - 6) * u);
      context.lineTo(x + side * reach * u, cy + (lift + 4) * u);
      context.stroke();
    }
  context.fillStyle = highContrast ? "#000000" : UMBER;
  context.beginPath();
  context.ellipse(x, cy - 3 * u, 11 * u, 12 * u, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = highContrast ? "#000000" : UMBER_SHADE;
  context.beginPath();
  context.arc(x, cy + 10 * u, 7 * u, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = "#ffffff";
  for (const side of [-1, 1]) {
    context.beginPath();
    context.arc(x + side * 3 * u, cy + 10 * u, 1.8 * u, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

/**
 * The provoked marker: the 32 px `STATUS:PROVOKED` raster at 16 master px
 * centred on `x`, `y`, or (LEGACY, the classic look, still loading) a dark
 * disc with a bone-white "!".
 */
export function drawProvokedMarkerV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  /** CSS px of the marker's side. */
  size: number,
  image: CanvasImageSource | null,
  devicePixelRatio = 1,
): void {
  const ratio = devicePixelRatio > 0 ? devicePixelRatio : 1;
  context.save();
  if (image !== null) {
    context.imageSmoothingEnabled = !Number.isInteger((size * ratio) / 32);
    context.drawImage(
      image,
      Math.round((x - size / 2) * ratio) / ratio,
      Math.round((y - size / 2) * ratio) / ratio,
      size,
      size,
    );
    context.restore();
    return;
  }
  context.fillStyle = "#3a3431";
  context.strokeStyle = BONE;
  context.lineWidth = Math.max(1, size * 0.1);
  context.beginPath();
  context.arc(x, y, size / 2 - context.lineWidth / 2, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = BONE;
  context.font = `900 ${size * 0.72}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("!", x, y + size * 0.04);
  context.restore();
}
