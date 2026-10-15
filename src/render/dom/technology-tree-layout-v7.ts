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

export interface TechnologyTreeGraphNodeV7 {
  readonly layout: TechnologyTreeLayoutNodeV7;
  readonly x: number;
  readonly y: number;
}

export interface TechnologyTreeGraphEdgeV7 {
  readonly parentId: TechnologyIdV7;
  readonly childId: TechnologyIdV7;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface TechnologyTreeGraphLayoutV7 {
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly TechnologyTreeGraphNodeV7[];
  readonly edges: readonly TechnologyTreeGraphEdgeV7[];
}

export const TECHNOLOGY_GRAPH_SIZE_V7 = 600;

/**
 * A compact five-lane graph for the phone technology view. The five roots sit
 * across the centre; one prerequisite path grows upward and one downward in
 * each lane. The square target boxes therefore never collide, while the graph
 * stays square so fitting it never favours one phone orientation. Coordinates
 * remain independent of DOM size and camera state.
 */
export function technologyTreeGraphLayoutV7(
  roots: readonly TechnologyTreeLayoutNodeV7[],
): TechnologyTreeGraphLayoutV7 {
  const nodes: TechnologyTreeGraphNodeV7[] = [];
  const positions = new Map<TechnologyIdV7, { x: number; y: number }>();
  const place = (
    layout: TechnologyTreeLayoutNodeV7,
    x: number,
    y: number,
  ): void => {
    nodes.push({ layout, x, y });
    positions.set(layout.node.id, { x, y });
  };
  roots.forEach((root, branchIndex) => {
    const x = 48 + (branchIndex * 504) / Math.max(1, roots.length - 1);
    place(root, x, 300);
    root.children.forEach((child, childIndex) => {
      const upper = childIndex % 2 === 0;
      const childY = upper ? 174 : 426;
      place(child, x, childY);
      const descendants = child.children;
      descendants.forEach((grandchild, descendantIndex) => {
        const offset = (descendantIndex - (descendants.length - 1) / 2) * 88;
        place(grandchild, x + offset, upper ? 48 : 552);
      });
    });
  });
  const edges: TechnologyTreeGraphEdgeV7[] = [];
  for (const graphNode of nodes) {
    const parentId = graphNode.layout.parentId;
    if (parentId === null) continue;
    const parent = positions.get(parentId);
    if (parent === undefined)
      throw new RangeError(`Technology graph parent missing ${parentId}`);
    edges.push({
      parentId,
      childId: graphNode.layout.node.id,
      x1: parent.x,
      y1: parent.y,
      x2: graphNode.x,
      y2: graphNode.y,
    });
  }
  return {
    width: TECHNOLOGY_GRAPH_SIZE_V7,
    height: TECHNOLOGY_GRAPH_SIZE_V7,
    nodes,
    edges,
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
