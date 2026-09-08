import { describe, expect, it } from "vitest";
import { queryTechnologyTreeV7, viewForV7 } from "../../src/engine/index";
import { technologyTreeLayoutV7 } from "../../src/render/dom/technology-tree-layout-v7";
import { initialV7 } from "../fixtures/v7-builders";

describe("Ruleset 7 technology tree layout", () => {
  it("retains the frozen five branches and two tier-two paths per root", () => {
    const state = initialV7(1515);
    const tree = queryTechnologyTreeV7(viewForV7(state, state.humanPlayerId));
    const layout = technologyTreeLayoutV7(tree.nodes);
    expect(layout.map((root) => root.node.branch)).toEqual([
      "SETTLEMENT",
      "WILDS",
      "INDUSTRY",
      "MOBILITY",
      "WARFARE",
    ]);
    expect(layout).toHaveLength(5);
    expect(layout.every((root) => root.children.length === 2)).toBe(true);
    expect(
      layout.flatMap((root) => [
        root.node.id,
        ...root.children.flatMap((child) => [
          child.node.id,
          ...child.children.map((grandchild) => grandchild.node.id),
        ]),
      ]),
    ).toHaveLength(25);
  });
});
