import type { PublicTechnologyNodeV6, TechnologyId } from "../../engine/index";

export interface TechnologyTreeLayoutNodeV6 {
  readonly node: PublicTechnologyNodeV6;
  readonly parentId: TechnologyId | null;
  readonly children: readonly TechnologyTreeLayoutNodeV6[];
}

/**
 * Turns one authoritative faction-tree branch into a deterministic nested tree.
 * Input order is retained for roots and siblings; positioning is derived only
 * from prerequisite edges, never from display-name or tier sorting.
 */
export function technologyTreeLayoutV6(
  nodes: readonly PublicTechnologyNodeV6[],
): readonly TechnologyTreeLayoutNodeV6[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  if (nodeById.size !== nodes.length)
    throw new RangeError("Technology layout contains a duplicate node");

  const parentById = new Map<TechnologyId, TechnologyId | null>();
  const childIdsByParent = new Map<TechnologyId, TechnologyId[]>();
  const roots: TechnologyId[] = [];
  for (const node of nodes) {
    const branchParents = node.prerequisites.filter((prerequisite) =>
      nodeById.has(prerequisite),
    );
    if (branchParents.length > 1) {
      throw new RangeError(
        `Technology ${node.id} has multiple parents in one display branch`,
      );
    }
    const parentId = branchParents[0] ?? null;
    parentById.set(node.id, parentId);
    if (parentId === null) {
      roots.push(node.id);
    } else {
      const children = childIdsByParent.get(parentId) ?? [];
      children.push(node.id);
      childIdsByParent.set(parentId, children);
    }
  }

  const visiting = new Set<TechnologyId>();
  const visited = new Set<TechnologyId>();
  const build = (id: TechnologyId): TechnologyTreeLayoutNodeV6 => {
    if (visiting.has(id))
      throw new RangeError(`Technology layout contains a cycle at ${id}`);
    visiting.add(id);
    const node = nodeById.get(id);
    if (node === undefined)
      throw new RangeError(`Technology layout is missing ${id}`);
    const children = (childIdsByParent.get(id) ?? []).map(build);
    visiting.delete(id);
    visited.add(id);
    return { node, parentId: parentById.get(id) ?? null, children };
  };
  const layout = roots.map(build);
  if (visited.size !== nodes.length)
    throw new RangeError("Technology layout contains a rootless cycle");
  return layout;
}
