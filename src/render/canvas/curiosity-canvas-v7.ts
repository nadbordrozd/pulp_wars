import {
  CAMP_RADIUS_V7,
  type CoordV7,
  type MonsterPreviewV7,
  type NeutralBreedV7,
  type PlayerViewV7,
} from "../../engine/index";
import {
  CURIOSITY_LABELS_V7,
  GATE_PARTNER_LABEL_V7,
  campAtV7,
  gatePartnerV7,
  matchHasCuriositiesV7,
  monsterPreviewsV7,
  visibleLairsV7,
  type CuriosityTileIdV7,
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
/** LEGACY has no Bigfoot raster either (round 2, section 34.2). */
export const BIGFOOT_CODE_ART_ID_V7 = "unit-neutral-bigfoot-code";

/** UNIT entries of a neutral unit (the Spider, a camp guard, Bigfoot). */
export interface MonsterUnitMarkerV7 {
  /** A visible unit provokes it (never Bigfoot): the provoked marker. */
  readonly provoked: boolean;
  /** Round 2: its breed (absent on a round-1 plan: the Spider). */
  readonly breed?: NeutralBreedV7;
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
 * visible neutral unit adds nothing, so its plan is exactly the plan of a
 * match without the option.
 *
 * Draw order: the web lies on the ground (layer 3.5, under a chest, a unit
 * and the Spider itself); every other overlay (the Fountain, Shrine and
 * Wreck; round 2, the Downed Saucer, the Graveyard, a gate and the Well)
 * is a piece of its cell (layer 4, like a Treasure chest) and so is drawn
 * over the Forest body of its own cell and under the unit standing on it.
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
    const kind = curiosity.kind;
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
  if (selection === null || selection.kind === "CITY") return;
  const explored = (at: CoordV7): boolean =>
    view.board.tiles[at.y * view.board.width + at.x]?.explored === true;
  const outline = (
    tiles: readonly CoordV7[],
    style: "MONSTER_AREA" | "CAMP_PERIMETER",
    /** Edges toward these tiles are left to another outline. */
    leave: ReadonlySet<string> = new Set(),
  ): void => {
    const set = new Set(tiles.map(key));
    for (const at of tiles)
      entries.push({
        key: `ability-area:${style}:${key(at)}`,
        kind: "ABILITY_AREA",
        layer: 7,
        at,
        abilityStyle: style,
        targetEdges: TILE_EDGES.filter((edge) => {
          const next = key(across(at, edge));
          return !set.has(next) && (leave.size === 0 || leave.has(next));
        }),
      });
  };
  const shade = (tiles: readonly CoordV7[]): void => {
    const seen = new Set<string>();
    for (const at of tiles)
      if (explored(at) && !seen.has(key(at))) {
        seen.add(key(at));
        entries.push({
          key: `ability-area:MONSTER_REACH:${key(at)}`,
          kind: "ABILITY_AREA",
          layer: 7,
          at,
          abilityStyle: "MONSTER_REACH",
          targetEdges: [],
        });
      }
  };
  // A selected gate (its tile) marks its partner (section 34.1).
  if (selection.kind === "TILE") {
    const partner = gatePartnerV7(view, selection.at);
    if (partner !== null)
      entries.push({
        key: `ability-target:GATE_EXIT:${key(partner)}`,
        kind: "ABILITY_TARGET",
        layer: 7.5,
        at: partner,
        abilityStyle: "GATE_EXIT",
        label: GATE_PARTNER_LABEL_V7,
      });
  }
  const selected = selectedNeutralV7(view, selection);
  if (selected === null) return;
  if (selected.kind === "CAMP") {
    // A selected guard (or its camp centre): the camp's area outlined, the
    // tiles its guards could attack after one step shaded, and the
    // saucer's perimeter ("within 2 of the saucer") outlined too.
    const { camp } = selected;
    const perimeter =
      camp.kind === "DOWNED_SAUCER"
        ? withinOf(view, camp.centre, CAMP_RADIUS_V7).filter(explored)
        : [];
    // The saucer's perimeter is the line that matters: its outer edges
    // are drawn in its own colour, and the guards' area keeps only its
    // inner edges (round the centre, which no guard stands on).
    outline(
      unique(camp.guards.flatMap((preview) => preview.area)),
      "MONSTER_AREA",
      new Set(perimeter.map(key)),
    );
    shade(camp.guards.flatMap((preview) => preview.reachTiles));
    if (perimeter.length > 0) outline(perimeter, "CAMP_PERIMETER");
    return;
  }
  // The Spider: its area outlined and its reach shaded; Bigfoot: its
  // habitat outlined as far as explored (it has no reach).
  outline(selected.preview.area, "MONSTER_AREA");
  shade(selected.preview.reachTiles);
}

/**
 * The neutral unit (or camp) a selection shows: a selected neutral unit,
 * or the neutral unit on a selected tile, or the lair or camp centre of a
 * selected tile.
 */
export function selectedNeutralV7(
  view: PlayerViewV7,
  selection: BoardSelectionV7 | null,
):
  | {
      readonly kind: "CAMP";
      readonly camp: NonNullable<ReturnType<typeof campAtV7>>;
    }
  | { readonly kind: "UNIT"; readonly preview: MonsterPreviewV7 }
  | null {
  if (selection === null || selection.kind === "CITY") return null;
  const previews = monsterPreviewsV7(view);
  const preview = previews.find((candidate) => {
    const unit = view.units.find((other) => other.id === candidate.unitId);
    if (unit === undefined) return false;
    return selection.kind === "UNIT"
      ? selection.unitId === candidate.unitId
      : same(selection.at, unit.at) ||
          (candidate.breed === "GIANT_SPIDER" &&
            same(selection.at, candidate.home));
  });
  const centre =
    preview !== undefined
      ? preview.breed === "GIANT_SPIDER" ||
        preview.breed === "BIGFOOT" ||
        // The Cultists: an Unbound daemon has no camp.
        preview.breed === "HORROR" ||
        preview.breed === "HERALD"
        ? null
        : preview.home
      : selection.kind === "TILE"
        ? selection.at
        : null;
  if (centre !== null) {
    const camp = campAtV7(view, centre);
    if (camp !== null && camp.guards.length > 0) return { kind: "CAMP", camp };
  }
  return preview === undefined ? null : { kind: "UNIT", preview };
}

function unique(tiles: readonly CoordV7[]): readonly CoordV7[] {
  const seen = new Map<string, CoordV7>();
  for (const at of tiles) seen.set(key(at), at);
  return [...seen.values()];
}

/** The board tiles within Chebyshev `radius` of `centre`, centre included. */
function withinOf(
  view: Pick<PlayerViewV7, "board">,
  centre: CoordV7,
  radius: number,
): readonly CoordV7[] {
  const tiles: CoordV7[] = [];
  for (let y = centre.y - radius; y <= centre.y + radius; y += 1)
    for (let x = centre.x - radius; x <= centre.x + radius; x += 1)
      if (x >= 0 && y >= 0 && x < view.board.width && y < view.board.height)
        tiles.push({ x, y });
  return tiles;
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
 * The curiosities a unit can stand on that are small enough to vanish under
 * it (bead pulp_wars-eu3r.9): with a unit on top, a small copy of the
 * overlay is drawn in the cell's bottom-right corner, over the unit, like a
 * Grave's corner marker.
 */
export const CURIOSITY_CORNER_BADGE_KINDS_V7: ReadonlySet<CuriosityTileIdV7> =
  new Set(["WISHING_WELL", "FOUNTAIN", "SHRINE"]);

/** The corner badge, in world units from the cell's centre (128 = a cell). */
export const CURIOSITY_CORNER_BADGE_FRAME_V7 = {
  left: 22,
  top: 22,
  size: 40,
} as const;

/**
 * The corner badge of an occupied curiosity: its own raster, scaled into a
 * small pale disc with an ink keyline in the cell's bottom-right corner.
 * `x`, `y` are the cell's centre in canvas pixels.
 */
export function drawCuriosityCornerBadgeV7(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
  zoom: number,
  options: { readonly smoothing: boolean; readonly highContrast: boolean },
): void {
  const frame = CURIOSITY_CORNER_BADGE_FRAME_V7;
  const size = frame.size * zoom;
  const left = x + frame.left * zoom;
  const top = y + frame.top * zoom;
  const radius = size / 2;
  context.save();
  context.beginPath();
  context.arc(left + radius, top + radius, radius, 0, Math.PI * 2);
  context.fillStyle = options.highContrast ? "#ffffff" : "#fff8df";
  context.fill();
  context.save();
  context.clip();
  context.imageSmoothingEnabled = options.smoothing;
  context.drawImage(image, left, top, size, size);
  context.restore();
  context.lineWidth = Math.max(1, 2.5 * zoom);
  context.strokeStyle = options.highContrast ? "#000000" : "#171722";
  context.stroke();
  context.restore();
}

/**
 * A code-drawn tile marker. `x`, `y` is the cell centre and `zoom` the
 * camera zoom (128 world units to a cell).
 */
export function drawCuriosityMarkerV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  id: CuriosityTileIdV7,
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
  } else if (id === "DOWNED_SAUCER") {
    drawSaucerMarker(context, x, y, u, ink, highContrast);
  } else if (id === "GRAVEYARD") {
    drawGraveyardMarker(context, x, y, u, highContrast);
  } else if (id === "GATE") {
    drawGateMarker(context, x, y, u, highContrast);
  } else if (id === "WISHING_WELL") {
    drawWellMarker(context, x, y, u, highContrast);
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

const METAL = "#9ea3a8";
const METAL_SHADE = "#6f757b";
const GLASS = "#d9e6ea";
const GLOW = "#f6f3ff";
const GLOW_SWIRL = "#b9b2dc";
const GOLD = "#ffd75a";

/**
 * Round 2 (section 34.2): the Downed Saucer's code marker, a tilted dull
 * grey saucer with a pale dome and two scorch streaks (no Martian colour).
 */
function drawSaucerMarker(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  u: number,
  ink: string,
  highContrast: boolean,
): void {
  context.save();
  context.translate(x, y + 14 * u);
  context.rotate(-0.38);
  context.fillStyle = highContrast ? "#ffffff" : METAL;
  context.beginPath();
  context.ellipse(0, 0, 46 * u, 13 * u, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  // The pale glass dome on top of the hull.
  context.fillStyle = highContrast ? "#ffffff" : GLASS;
  context.beginPath();
  context.ellipse(0, -4 * u, 19 * u, 20 * u, 0, Math.PI, 0);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = highContrast ? "#000000" : METAL_SHADE;
  context.beginPath();
  context.ellipse(0, 4 * u, 30 * u, 5 * u, 0, 0, Math.PI * 2);
  context.fill();
  // Scorch streaks over the hull.
  context.strokeStyle = ink;
  context.lineWidth = Math.max(1, 2.5 * u);
  for (const [from, to] of [
    [18, 34],
    [24, 40],
  ] as const) {
    context.beginPath();
    context.moveTo(from * u, -6 * u);
    context.lineTo(to * u, 2 * u);
    context.stroke();
  }
  context.restore();
}

/**
 * The Graveyard's code marker: three crooked grey headstones behind a few
 * black iron fence bars.
 */
function drawGraveyardMarker(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  u: number,
  highContrast: boolean,
): void {
  for (const [dx, dy, tilt, height] of [
    [-24, -4, -0.18, 36],
    [2, -12, 0.08, 42],
    [27, 0, 0.22, 32],
  ] as const) {
    context.save();
    context.translate(x + dx * u, y + (dy + 20) * u);
    context.rotate(tilt);
    context.fillStyle = highContrast ? "#ffffff" : STONE;
    context.beginPath();
    context.moveTo(-10 * u, 0);
    context.lineTo(-10 * u, -(height - 10) * u);
    context.arc(0, -(height - 10) * u, 10 * u, Math.PI, 0);
    context.lineTo(10 * u, 0);
    context.closePath();
    context.fill();
    context.stroke();
    context.strokeStyle = highContrast ? "#000000" : STONE_SHADE;
    context.lineWidth = Math.max(1, 2 * u);
    context.beginPath();
    context.moveTo(-4 * u, -(height - 12) * u);
    context.lineTo(4 * u, -(height - 12) * u);
    context.stroke();
    context.restore();
  }
  // Iron fence bars in front, one fallen.
  context.save();
  context.strokeStyle = highContrast ? "#000000" : INK;
  context.lineWidth = Math.max(1, 3 * u);
  for (const dx of [-42, -32, 34, 44]) {
    context.beginPath();
    context.moveTo(x + dx * u, y + 38 * u);
    context.lineTo(x + dx * u, y + 18 * u);
    context.stroke();
  }
  context.beginPath();
  context.moveTo(x - 46 * u, y + 24 * u);
  context.lineTo(x - 28 * u, y + 24 * u);
  context.moveTo(x + 30 * u, y + 24 * u);
  context.lineTo(x + 48 * u, y + 24 * u);
  context.moveTo(x - 14 * u, y + 40 * u);
  context.lineTo(x + 10 * u, y + 34 * u);
  context.stroke();
  context.restore();
}

/**
 * A Dimensional Gate's code marker: a ring of tall grey standing stones
 * round a pale swirl of light (one look for both gates).
 */
function drawGateMarker(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  u: number,
  highContrast: boolean,
): void {
  const cy = y + 14 * u;
  context.fillStyle = highContrast ? "#ffffff" : GLOW;
  context.beginPath();
  context.ellipse(x, cy, 34 * u, 17 * u, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.save();
  context.strokeStyle = highContrast ? "#000000" : GLOW_SWIRL;
  context.lineWidth = Math.max(1, 3 * u);
  context.beginPath();
  for (let step = 0; step <= 24; step += 1) {
    const angle = step * 0.55;
    const reach = 2 + step * 1.15;
    const px = x + Math.cos(angle) * reach * u;
    const py = cy + Math.sin(angle) * reach * 0.5 * u;
    if (step === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.stroke();
  context.restore();
  // The stones: the back ones first, so the front ones overlap them.
  const stones = [0, 1, 2, 3, 4, 5, 6, 7]
    .map((index) => (index * Math.PI) / 4 + Math.PI / 8)
    .sort((left, right) => Math.sin(left) - Math.sin(right));
  for (const angle of stones) {
    const sx = x + Math.cos(angle) * 44 * u;
    const sy = cy + Math.sin(angle) * 22 * u;
    const height = 30 + Math.sin(angle) * 4;
    context.fillStyle = highContrast ? "#ffffff" : STONE;
    context.fillRect(sx - 5 * u, sy - height * u, 10 * u, height * u);
    context.strokeRect(sx - 5 * u, sy - height * u, 10 * u, height * u);
  }
}

/**
 * The Wishing Well's code marker: a round stone well under a little roof
 * on two posts, with a gold coin glint.
 */
function drawWellMarker(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  u: number,
  highContrast: boolean,
): void {
  const base = y + 30 * u;
  // Posts and roof.
  context.fillStyle = highContrast ? "#ffffff" : DRIFTWOOD;
  context.fillRect(x - 30 * u, y - 30 * u, 6 * u, 54 * u);
  context.strokeRect(x - 30 * u, y - 30 * u, 6 * u, 54 * u);
  context.fillRect(x + 24 * u, y - 30 * u, 6 * u, 54 * u);
  context.strokeRect(x + 24 * u, y - 30 * u, 6 * u, 54 * u);
  context.fillStyle = highContrast ? "#ffffff" : UMBER;
  context.beginPath();
  context.moveTo(x - 40 * u, y - 26 * u);
  context.lineTo(x, y - 50 * u);
  context.lineTo(x + 40 * u, y - 26 * u);
  context.closePath();
  context.fill();
  context.stroke();
  // The stone drum.
  context.fillStyle = highContrast ? "#ffffff" : STONE;
  context.beginPath();
  context.moveTo(x - 32 * u, y + 8 * u);
  context.lineTo(x - 32 * u, base);
  context.ellipse(x, base, 32 * u, 10 * u, 0, Math.PI, 0, true);
  context.lineTo(x + 32 * u, y + 8 * u);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = highContrast ? "#000000" : "#3c4a52";
  context.beginPath();
  context.ellipse(x, y + 8 * u, 32 * u, 10 * u, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  // The coin glint.
  context.fillStyle = GOLD;
  context.beginPath();
  context.arc(x + 8 * u, y + 8 * u, 4 * u, 0, Math.PI * 2);
  context.fill();
  context.stroke();
}

/**
 * The code-drawn Bigfoot (LEGACY and the classic look): a neutral earth
 * disc (no owner colour) with one big umber five-toed footprint.
 */
export function drawCodeBigfootV7(
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
  context.strokeStyle = ink;
  context.lineWidth = Math.max(1, 3 * u);
  context.fillStyle = highContrast ? "#ffffff" : "#b9a58a";
  context.beginPath();
  context.arc(x, cy, 30 * u, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = highContrast ? "#000000" : UMBER;
  context.beginPath();
  context.ellipse(x, cy + 6 * u, 10 * u, 15 * u, 0.12, 0, Math.PI * 2);
  context.fill();
  for (const [dx, dy, r] of [
    [-9, -13, 3.6],
    [-3, -16, 3.2],
    [3, -16.5, 3],
    [8.5, -14, 2.7],
    [12, -9, 2.4],
  ] as const) {
    context.beginPath();
    context.arc(x + dx * u, cy + dy * u, r * u, 0, Math.PI * 2);
    context.fill();
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
