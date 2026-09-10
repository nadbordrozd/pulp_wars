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
