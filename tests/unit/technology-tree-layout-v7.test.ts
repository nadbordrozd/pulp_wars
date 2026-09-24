import { describe, expect, it } from "vitest";
import { queryTechnologyTreeV7, viewForV7 } from "../../src/engine/index";
import { technologyTreeLayoutV7 } from "../../src/render/dom/technology-tree-layout-v7";
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
    expect(layout.map((root) => root.children.length)).toEqual([2, 2, 2, 2, 1]);
    expect(
      layout.flatMap((root) => [
        root.node.id,
        ...root.children.flatMap((child) => [
          child.node.id,
          ...child.children.map((grandchild) => grandchild.node.id),
        ]),
      ]),
    ).toHaveLength(23);
    expect(layout.map((root) => root.leafCount)).toEqual([2, 2, 2, 2, 1]);
    expect(layout[3]?.node.id).toBe("DRILL");
    expect(layout[3]?.children[0]?.children[0]?.node.id).toBe("METALLURGY");
  });
});
