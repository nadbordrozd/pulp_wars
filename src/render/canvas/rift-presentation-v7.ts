import type { RiftPieceV7 } from "../../assets/chibi-art-v7";

/**
 * The Rift (bead pulp_wars-9s0.5, docs/product/RULESET_7_RIFT.md section 8):
 * which of the six pieces a Rift cell shows, read from the viewer's board
 * only. `riftAt` answers true for an explored Rift, false for any other
 * explored cell or a cell off the board, and null for a cell the viewer has
 * not explored, so the piece never reveals terrain under fog: a Rift is
 * three cells in a straight line, and a neighbour hidden in fog is drawn as
 * the crack running on into the fog.
 */
export function riftPieceV7(
  at: { readonly x: number; readonly y: number },
  riftAt: (at: { readonly x: number; readonly y: number }) => boolean | null,
): RiftPieceV7 {
  const look = (dx: number, dy: number): boolean | null =>
    riftAt({ x: at.x + dx, y: at.y + dy });
  const west = look(-1, 0);
  const east = look(1, 0);
  const north = look(0, -1);
  const south = look(0, 1);
  const along = (
    before: boolean | null,
    after: boolean | null,
    beyondBefore: boolean | null,
    beyondAfter: boolean | null,
    first: RiftPieceV7,
    middle: RiftPieceV7,
    last: RiftPieceV7,
  ): RiftPieceV7 => {
    if (before === true && after === true) return middle;
    if (before === true)
      return after === false || beyondBefore === true ? last : middle;
    if (after === true)
      return before === false || beyondAfter === true ? first : middle;
    if (before === false) return first;
    if (after === false) return last;
    return middle;
  };
  const horizontal = along(
    west,
    east,
    look(-2, 0),
    look(2, 0),
    "H_WEST",
    "H_MIDDLE",
    "H_EAST",
  );
  const vertical = along(
    north,
    south,
    look(0, -2),
    look(0, 2),
    "V_NORTH",
    "V_MIDDLE",
    "V_SOUTH",
  );
  if (west === true || east === true) return horizontal;
  if (north === true || south === true) return vertical;
  // No Rift neighbour in sight: an orientation whose both neighbours are
  // known not to be a Rift is ruled out.
  if (west === false && east === false) return vertical;
  if (north === false && south === false) return horizontal;
  return "H_MIDDLE";
}

/**
 * The LEGACY art set's code-drawn Rift (no legacy raster exists, as for the
 * Ice Folk Snow): over the cell's Grass, one piece of a single crack that
 * runs across the three cells, tapering to points a quarter cell inside the
 * two ends, with a brown rim, a near-black chasm and a thin ember line. The
 * shape is fixed, so the three pieces always join.
 */
export function drawLegacyRiftV7(
  context: CanvasRenderingContext2D,
  centre: { readonly x: number; readonly y: number },
  size: number,
  piece: RiftPieceV7,
  sceneAlpha = 1,
): void {
  const horizontal = piece.startsWith("H_");
  const index =
    piece === "H_WEST" || piece === "V_NORTH"
      ? 0
      : piece === "H_MIDDLE" || piece === "V_MIDDLE"
        ? 1
        : 2;
  // Along-axis samples in cell units over the whole 3-cell crack.
  const samples = 48;
  const start = 0.25;
  const end = 2.75;
  const jag = [0, 0.18, -0.12, 0.22, -0.2, 0.08, -0.16, 0.2, -0.1, 0.14, 0];
  const centreLine = (t: number): number =>
    0.04 * Math.sin(t * 4.1) + 0.03 * Math.sin(t * 9.7);
  const halfWidth = (t: number): number => {
    const phase = (t - start) / (end - start);
    if (phase <= 0 || phase >= 1) return 0;
    const wobble = jag[Math.floor(phase * (jag.length - 1))] ?? 0;
    return 0.13 * Math.sin(Math.PI * phase) ** 0.6 * (1 + 0.35 * wobble);
  };
  const point = (t: number, across: number) => {
    const local = t - index;
    const a = (local - 0.5) * size;
    const b = across * size;
    return horizontal
      ? { x: centre.x + a, y: centre.y + b }
      : { x: centre.x + b, y: centre.y + a };
  };
  const outline = (scale: number, offset: number): void => {
    context.beginPath();
    for (let i = 0; i <= samples; i += 1) {
      const t = start + ((end - start) * i) / samples;
      const p = point(t, centreLine(t) - halfWidth(t) * scale + offset);
      if (i === 0) context.moveTo(p.x, p.y);
      else context.lineTo(p.x, p.y);
    }
    for (let i = samples; i >= 0; i -= 1) {
      const t = start + ((end - start) * i) / samples;
      const p = point(t, centreLine(t) + halfWidth(t) * scale + offset);
      context.lineTo(p.x, p.y);
    }
    context.closePath();
  };
  context.save();
  context.globalAlpha = sceneAlpha;
  context.beginPath();
  context.rect(centre.x - size / 2, centre.y - size / 2, size, size);
  context.clip();
  context.fillStyle = "#5b3a26";
  outline(1.25, 0);
  context.fill();
  context.fillStyle = "#17110f";
  outline(1, 0.01);
  context.fill();
  context.fillStyle = "#8a2f14";
  outline(0.22, 0.02);
  context.fill();
  context.restore();
}
