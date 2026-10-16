import type {
  PublicTechnologyNodeV7,
  TechnologyIdV7,
} from "../../engine/index";

export interface TechnologyTreeLayoutNodeV7 {
  readonly node: PublicTechnologyNodeV7;
  readonly parentId: TechnologyIdV7 | null;
  readonly children: readonly TechnologyTreeLayoutNodeV7[];
  /** Number of leaf cards below this node, used to keep sibling paths legible. */
  readonly leafCount: number;
}

/** Where a node's name sits, seen from the node: away from the centre. */
export type TechnologyLabelSideV7 = "above" | "below" | "left" | "right";

export interface TechnologyTreeGraphNodeV7 {
  readonly layout: TechnologyTreeLayoutNodeV7;
  /** Centre of the round badge in graph units. */
  readonly x: number;
  readonly y: number;
  /** 1 nearest the centre, 3 for the outer leaves. */
  readonly ring: 1 | 2 | 3;
  /** Direction from the centre in degrees (0 east, 90 south). */
  readonly angle: number;
  readonly labelSide: TechnologyLabelSideV7;
}

export interface TechnologyTreeGraphEdgeV7 {
  readonly parentId: TechnologyIdV7;
  readonly childId: TechnologyIdV7;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  /** A cubic curve that leaves the parent and reaches the child outward. */
  readonly path: string;
}

/** The short line from the centre emblem to a branch's first technology. */
export interface TechnologyTreeGraphSpokeV7 {
  readonly childId: TechnologyIdV7;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** A branch's tinted sector behind its five technologies. */
export interface TechnologyTreeGraphWedgeV7 {
  readonly branch: PublicTechnologyNodeV7["branch"];
  readonly angle: number;
  readonly path: string;
}

export interface TechnologyTreeGraphLayoutV7 {
  /** The phone ("compact") or the landscape and desktop ("wide") tree. */
  readonly shape: TechnologyTreeShapeV7;
  readonly width: number;
  readonly height: number;
  readonly centre: { readonly x: number; readonly y: number };
  readonly nodes: readonly TechnologyTreeGraphNodeV7[];
  readonly edges: readonly TechnologyTreeGraphEdgeV7[];
  readonly spokes: readonly TechnologyTreeGraphSpokeV7[];
  readonly wedges: readonly TechnologyTreeGraphWedgeV7[];
}

/**
 * The radial tree (bead pulp_wars-2yc.58), in graph units. The numbers were
 * chosen so that 25 badges never touch, the whole tree fits a 320 px wide
 * phone with badges about 28 px across (36 px on a 390 px phone), and every
 * name fits beside its badge from TECHNOLOGY_LABEL_SCALE_V7 up.
 */
export const TECHNOLOGY_GRAPH_GEOMETRY_V7 = {
  /** Diameter of a technology badge. */
  nodeDiameter: 72,
  /** Radius of the faction emblem at the centre. */
  centreRadius: 32,
  /** Distance of tiers 1, 2 and 3 from the centre. */
  ringRadii: [80, 185, 310],
  /** Angle of a tier-2 technology off its branch's spoke, in degrees. */
  tier2Spread: 16,
  /** Angle of a tier-3 leaf off its branch's spoke: fans slightly wider. */
  tier3Spread: 26,
  /** The first spoke points straight up; the rest follow clockwise. */
  firstSpokeAngle: -90,
  /** Clear border round the outermost badges. */
  padding: 10,
} as const;

/**
 * The names and price chips keep one size on screen whatever the zoom (CSS
 * pixels): the stage scales them by 1 / scale. Their boxes are part of the
 * layout so the tests can prove they never overlap.
 */
export const TECHNOLOGY_NODE_OVERLAY_V7 = {
  /** Two lines of 12 px heavy type at most. */
  labelWidth: 90,
  labelHeight: 28,
  /** Space between a badge (or its chip) and its name. */
  labelGap: 3,
  /** The price chip under the badge, overlapping its rim. */
  chipWidth: 40,
  chipHeight: 18,
  chipInset: 9,
} as const;

/**
 * Names and prices show for every node from this stage scale up (1 graph
 * unit = this many CSS pixels); below it they show only for the hovered,
 * focused or selected node. Proven by tests/unit/technology-tree-layout-v7.
 */
export const TECHNOLOGY_LABEL_SCALE_V7 = 1.35;

/**
 * The tree has two shapes (bead pulp_wars-2yc.66). "compact" is the phone
 * tree of TECHNOLOGY_GRAPH_GEOMETRY_V7. "wide" is for a landscape screen
 * (TECHNOLOGY_WIDE_TREE_MEDIA_V7: a desktop, a tablet or a phone on its
 * side), where the height is short and the width is spare: the tree is
 * drawn a little wider than tall, the second ring sits further out, and the
 * outer leaves put their names beside them instead of above or below. The
 * names then fit at a much smaller scale, so a desktop window shows them at
 * Fit. The fit gutters are screen pixels round the graph: room for the
 * names beside the outermost leaves, or above and below them.
 */
export type TechnologyTreeShapeV7 = "compact" | "wide";

export interface TechnologyTreeShapeGeometryV7 {
  /** Distance of tiers 1, 2 and 3 from the centre (before the stretch). */
  readonly ringRadii: readonly [number, number, number];
  /** Horizontal stretch of the circle: 1 is round. */
  readonly stretchX: number;
  /** Where the outer leaves' names go: away from the centre on the radius
   * ("radial": above or below) or to the side ("beside": left or right). */
  readonly outerLabels: "radial" | "beside";
  /** Stage scale from which every name and price shows. */
  readonly labelScale: number;
  /** Screen pixels Fit leaves at each side and above and below the graph. */
  readonly fitGutterX: number;
  readonly fitGutterY: number;
}

export const TECHNOLOGY_TREE_SHAPES_V7: Readonly<
  Record<TechnologyTreeShapeV7, TechnologyTreeShapeGeometryV7>
> = {
  compact: {
    ringRadii: TECHNOLOGY_GRAPH_GEOMETRY_V7.ringRadii,
    stretchX: 1,
    outerLabels: "radial",
    labelScale: TECHNOLOGY_LABEL_SCALE_V7,
    // Keeps badge rings inside the clip at the sides, and leaves room above
    // and below for the name of a hovered or focused leaf.
    fitGutterX: 6,
    fitGutterY: 34,
  },
  wide: {
    ringRadii: [80, 205, 310],
    stretchX: 1.15,
    outerLabels: "beside",
    labelScale: 1.1,
    // A name beside the outermost leaf: its width and gap and a margin.
    fitGutterX:
      TECHNOLOGY_NODE_OVERLAY_V7.labelWidth +
      TECHNOLOGY_NODE_OVERLAY_V7.labelGap +
      6,
    fitGutterY: 6,
  },
};

/**
 * The screens that get the wide tree; v7.css gives the same screens the
 * larger technology panel.
 */
export const TECHNOLOGY_WIDE_TREE_MEDIA_V7 =
  "(min-width: 600px) and (orientation: landscape)";

export interface TechnologyBoxV7 {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/**
 * The boxes a node covers at a stage scale, in graph units: its badge, its
 * price chip and its name. The chip and the name keep their size on screen,
 * so they shrink in graph units as the scale grows.
 */
export function technologyNodeBoxesV7(
  node: Pick<TechnologyTreeGraphNodeV7, "x" | "y" | "labelSide">,
  scale: number,
): {
  readonly badge: TechnologyBoxV7;
  readonly chip: TechnologyBoxV7;
  readonly label: TechnologyBoxV7;
} {
  const radius = TECHNOLOGY_GRAPH_GEOMETRY_V7.nodeDiameter / 2;
  const overlay = TECHNOLOGY_NODE_OVERLAY_V7;
  const badge = {
    left: node.x - radius,
    top: node.y - radius,
    right: node.x + radius,
    bottom: node.y + radius,
  };
  const chipTop = badge.bottom - overlay.chipInset / scale;
  const chip = {
    left: node.x - overlay.chipWidth / 2 / scale,
    top: chipTop,
    right: node.x + overlay.chipWidth / 2 / scale,
    bottom: chipTop + overlay.chipHeight / scale,
  };
  const width = overlay.labelWidth / scale;
  const height = overlay.labelHeight / scale;
  const gap = overlay.labelGap / scale;
  const label =
    node.labelSide === "below"
      ? {
          left: node.x - width / 2,
          top: chip.bottom + gap,
          right: node.x + width / 2,
          bottom: chip.bottom + gap + height,
        }
      : node.labelSide === "above"
        ? {
            left: node.x - width / 2,
            top: badge.top - gap - height,
            right: node.x + width / 2,
            bottom: badge.top - gap,
          }
        : node.labelSide === "left"
          ? {
              left: badge.left - gap - width,
              top: node.y - height / 2,
              right: badge.left - gap,
              bottom: node.y + height / 2,
            }
          : {
              left: badge.right + gap,
              top: node.y - height / 2,
              right: badge.right + gap + width,
              bottom: node.y + height / 2,
            };
  return { badge, chip, label };
}

const RADIANS = Math.PI / 180;

/**
 * A name goes on the side of its badge that faces away from the centre. The
 * outer leaves always take the top or bottom, so their names never widen
 * the tree; an inner node close to the horizontal takes the left or right.
 * In the wide tree the outer leaves take the left or right instead.
 */
function labelSideV7(
  angle: number,
  ring: 1 | 2 | 3,
  outerLabels: TechnologyTreeShapeGeometryV7["outerLabels"],
): TechnologyLabelSideV7 {
  const cos = Math.cos(angle * RADIANS);
  const sin = Math.sin(angle * RADIANS);
  if (ring === 3 && outerLabels === "beside") return cos < 0 ? "left" : "right";
  if (ring === 3 || Math.abs(sin) >= Math.abs(cos) * 0.3)
    return sin < 0 ? "above" : "below";
  return cos < 0 ? "left" : "right";
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Polytopia-style radial tree: the faction emblem in the centre and the five
 * branches as evenly spaced spokes. Along each spoke tier 1 is nearest the
 * centre, then the two tier-2 technologies either side of the spoke, then
 * each one's tier-3 leaf, fanned a little wider. Coordinates are graph units
 * with the origin at the top left; they do not depend on the DOM or camera.
 * The wide shape stretches the circle sideways (an ellipse), so every
 * position, curve and wedge is the round tree's, scaled by its stretch.
 */
export function technologyTreeGraphLayoutV7(
  roots: readonly TechnologyTreeLayoutNodeV7[],
  shape: TechnologyTreeShapeV7 = "compact",
): TechnologyTreeGraphLayoutV7 {
  const geometry = TECHNOLOGY_GRAPH_GEOMETRY_V7;
  const shapeGeometry = TECHNOLOGY_TREE_SHAPES_V7[shape];
  const [ring1, ring2, ring3] = shapeGeometry.ringRadii;
  const stretch = shapeGeometry.stretchX;
  const placed: {
    layout: TechnologyTreeLayoutNodeV7;
    ring: 1 | 2 | 3;
    angle: number;
    radius: number;
  }[] = [];
  const spokeAngles: number[] = [];
  roots.forEach((root, branchIndex) => {
    const spoke =
      geometry.firstSpokeAngle +
      (branchIndex * 360) / Math.max(1, roots.length);
    spokeAngles.push(spoke);
    placed.push({ layout: root, ring: 1, angle: spoke, radius: ring1 });
    root.children.forEach((child, childIndex) => {
      const side = root.children.length === 1 ? 0 : childIndex === 0 ? -1 : 1;
      placed.push({
        layout: child,
        ring: 2,
        angle: spoke + side * geometry.tier2Spread,
        radius: ring2,
      });
      child.children.forEach((leaf, leafIndex) => {
        const spread =
          child.children.length === 1
            ? 0
            : (leafIndex - (child.children.length - 1) / 2) * 12;
        placed.push({
          layout: leaf,
          ring: 3,
          angle: spoke + side * geometry.tier3Spread + spread,
          radius: ring3,
        });
      });
    });
  });

  // The bounds hold every badge and the centre emblem.
  const radius = geometry.nodeDiameter / 2;
  let minX = -geometry.centreRadius;
  let maxX: number = geometry.centreRadius;
  let minY = -geometry.centreRadius;
  let maxY: number = geometry.centreRadius;
  for (const entry of placed) {
    const x = stretch * entry.radius * Math.cos(entry.angle * RADIANS);
    const y = entry.radius * Math.sin(entry.angle * RADIANS);
    minX = Math.min(minX, x - radius);
    maxX = Math.max(maxX, x + radius);
    minY = Math.min(minY, y - radius);
    maxY = Math.max(maxY, y + radius);
  }
  const offsetX = geometry.padding - minX;
  const offsetY = geometry.padding - minY;
  const centre = { x: round(offsetX), y: round(offsetY) };
  const nodes: TechnologyTreeGraphNodeV7[] = placed.map((entry) => ({
    layout: entry.layout,
    x: round(
      offsetX + stretch * entry.radius * Math.cos(entry.angle * RADIANS),
    ),
    y: round(offsetY + entry.radius * Math.sin(entry.angle * RADIANS)),
    ring: entry.ring,
    angle: entry.angle,
    labelSide: labelSideV7(entry.angle, entry.ring, shapeGeometry.outerLabels),
  }));
  // The direction of an angle of the round tree once stretched.
  const stretched = (angle: number): number =>
    Math.atan2(Math.sin(angle * RADIANS), stretch * Math.cos(angle * RADIANS));
  const byId = new Map(nodes.map((node) => [node.layout.node.id, node]));
  const edges: TechnologyTreeGraphEdgeV7[] = [];
  const spokes: TechnologyTreeGraphSpokeV7[] = [];
  for (const node of nodes) {
    const parentId = node.layout.parentId;
    if (parentId === null) {
      const inner = geometry.centreRadius;
      const direction = stretched(node.angle);
      spokes.push({
        childId: node.layout.node.id,
        x1: round(centre.x + inner * Math.cos(direction)),
        y1: round(centre.y + inner * Math.sin(direction)),
        x2: node.x,
        y2: node.y,
      });
      continue;
    }
    const parent = byId.get(parentId);
    if (parent === undefined)
      throw new RangeError(`Technology graph parent missing ${parentId}`);
    // Leave the parent and reach the child heading outward, so a branch
    // reads as growing from the centre.
    const reach =
      0.45 *
      (Math.hypot((node.x - centre.x) / stretch, node.y - centre.y) -
        Math.hypot((parent.x - centre.x) / stretch, parent.y - centre.y));
    const c1x = parent.x + stretch * reach * Math.cos(parent.angle * RADIANS);
    const c1y = parent.y + reach * Math.sin(parent.angle * RADIANS);
    const c2x = node.x - stretch * reach * Math.cos(node.angle * RADIANS);
    const c2y = node.y - reach * Math.sin(node.angle * RADIANS);
    edges.push({
      parentId,
      childId: node.layout.node.id,
      x1: parent.x,
      y1: parent.y,
      x2: node.x,
      y2: node.y,
      path: `M${parent.x} ${parent.y}C${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${node.x} ${node.y}`,
    });
  }
  const wedgeRadius = ring3 + radius + geometry.padding / 2;
  const halfWedge = 180 / Math.max(1, roots.length);
  // The outer rim is the stretched circle (an ellipse); the inner rim stays
  // round round the emblem, on the same rays.
  const outer = (angle: number): string =>
    `${round(centre.x + stretch * wedgeRadius * Math.cos(angle * RADIANS))} ${round(centre.y + wedgeRadius * Math.sin(angle * RADIANS))}`;
  const inner = (angle: number): string => {
    const direction = stretched(angle);
    return `${round(centre.x + geometry.centreRadius * Math.cos(direction))} ${round(centre.y + geometry.centreRadius * Math.sin(direction))}`;
  };
  const wedges = roots.map((root, index) => {
    const angle = spokeAngles[index] ?? 0;
    const from = angle - halfWedge;
    const to = angle + halfWedge;
    return {
      branch: root.node.branch,
      angle,
      path: `M${inner(from)}L${outer(from)}A${round(stretch * wedgeRadius)} ${wedgeRadius} 0 0 1 ${outer(to)}L${inner(to)}A${geometry.centreRadius} ${geometry.centreRadius} 0 0 0 ${inner(from)}Z`,
    };
  });
  return {
    shape,
    width: round(maxX - minX + geometry.padding * 2),
    height: round(maxY - minY + geometry.padding * 2),
    centre,
    nodes,
    edges,
    spokes,
    wedges,
  };
}

export function technologyTreeLayoutV7(
  nodes: readonly PublicTechnologyNodeV7[],
): readonly TechnologyTreeLayoutNodeV7[] {
  const byId = new Map(nodes.map((node) => [node.id, node] as const));
  if (byId.size !== nodes.length)
    throw new RangeError("Technology layout contains a duplicate node");
  const children = new Map<TechnologyIdV7, TechnologyIdV7[]>();
  const roots: TechnologyIdV7[] = [];
  for (const node of nodes) {
    const parents = node.prerequisites.filter((id) => byId.has(id));
    if (parents.length > 1)
      throw new RangeError(`${node.id} has multiple display parents`);
    const parent = parents[0];
    if (parent === undefined) roots.push(node.id);
    else children.set(parent, [...(children.get(parent) ?? []), node.id]);
  }
  const visiting = new Set<TechnologyIdV7>();
  const visited = new Set<TechnologyIdV7>();
  const build = (id: TechnologyIdV7): TechnologyTreeLayoutNodeV7 => {
    if (visiting.has(id)) throw new RangeError(`Technology cycle at ${id}`);
    visiting.add(id);
    const node = byId.get(id);
    if (node === undefined) throw new RangeError(`Technology missing ${id}`);
    const parentId =
      node.prerequisites.find((entry) => byId.has(entry)) ?? null;
    const childNodes = (children.get(id) ?? []).map(build);
    const result = {
      node,
      parentId,
      children: childNodes,
      leafCount:
        childNodes.length === 0
          ? 1
          : childNodes.reduce((total, child) => total + child.leafCount, 0),
    };
    visiting.delete(id);
    visited.add(id);
    return result;
  };
  const result = roots.map(build);
  if (visited.size !== nodes.length)
    throw new RangeError("Technology layout contains a rootless cycle");
  return result;
}
