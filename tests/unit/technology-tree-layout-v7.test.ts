import { describe, expect, it } from "vitest";
import { queryTechnologyTreeV7, viewForV7 } from "../../src/engine/index";
import {
  TECHNOLOGY_GRAPH_SIZE_V7,
  technologyTreeGraphLayoutV7,
  technologyTreeLayoutV7,
} from "../../src/render/dom/technology-tree-layout-v7";
import { initialV7 } from "../fixtures/v7-builders";

describe("Ruleset 7 technology tree layout", () => {
  it("lays out five root lanes with the revision-9 Industry branches", () => {
    const state = initialV7(1515);
    const tree = queryTechnologyTreeV7(viewForV7(state, state.humanPlayerId));
    const layout = technologyTreeLayoutV7(tree.nodes);
    expect(layout.map((root) => root.node.branch)).toEqual([
      "SETTLEMENT",
      "WILDS",
      "MOBILITY",
      "INDUSTRY",
      "NAVAL",
    ]);
    expect(layout).toHaveLength(5);
    expect(layout.map((root) => root.children.length)).toEqual([2, 2, 2, 2, 2]);
    expect(
      layout.flatMap((root) => [
        root.node.id,
        ...root.children.flatMap((child) => [
          child.node.id,
          ...child.children.map((grandchild) => grandchild.node.id),
        ]),
      ]),
    ).toHaveLength(25);
    expect(layout.map((root) => root.leafCount)).toEqual([2, 2, 2, 2, 2]);
    expect(layout[3]?.node.id).toBe("DRILL");
    expect(layout[3]?.children[0]?.children[0]?.node.id).toBe("METALLURGY");
  });

  it("places every prerequisite in a compact five-spoke graph without node overlap", () => {
    const state = initialV7(1515);
    const tree = queryTechnologyTreeV7(viewForV7(state, state.humanPlayerId));
    const graph = technologyTreeGraphLayoutV7(
      technologyTreeLayoutV7(tree.nodes),
    );
    expect(graph.width).toBe(TECHNOLOGY_GRAPH_SIZE_V7);
    expect(graph.height).toBe(TECHNOLOGY_GRAPH_SIZE_V7);
    expect(graph.nodes).toHaveLength(25);
    expect(graph.edges).toHaveLength(20);
    expect(new Set(graph.nodes.map(({ layout }) => layout.node.id)).size).toBe(
      25,
    );
    const nodeById = new Map(
      graph.nodes.map((node) => [node.layout.node.id, node] as const),
    );
    for (const edge of graph.edges) {
      expect(nodeById.get(edge.childId)?.layout.parentId).toBe(edge.parentId);
      expect(nodeById.has(edge.parentId)).toBe(true);
    }
    for (const node of graph.nodes) {
      expect(node.x - 43).toBeGreaterThanOrEqual(0);
      expect(node.x + 43).toBeLessThanOrEqual(graph.width);
      expect(node.y - 43).toBeGreaterThanOrEqual(0);
      expect(node.y + 43).toBeLessThanOrEqual(graph.height);
    }
    for (const [index, first] of graph.nodes.entries())
      for (const second of graph.nodes.slice(index + 1))
        expect(
          Math.abs(first.x - second.x) >= 90 ||
            Math.abs(first.y - second.y) >= 90,
        ).toBe(true);
  });
});
