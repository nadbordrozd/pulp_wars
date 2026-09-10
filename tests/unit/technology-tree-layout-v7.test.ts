import { describe, expect, it } from "vitest";
import { queryTechnologyTreeV7, viewForV7 } from "../../src/engine/index";
import { technologyTreeLayoutV7 } from "../../src/render/dom/technology-tree-layout-v7";
import { initialV7 } from "../fixtures/v7-builders";

describe("Ruleset 7 technology tree layout", () => {
  it("lays out four branches and weights Industry for its third leaf", () => {
    const state = initialV7(1515);
    const tree = queryTechnologyTreeV7(viewForV7(state, state.humanPlayerId));
    const layout = technologyTreeLayoutV7(tree.nodes);
    expect(layout.map((root) => root.node.branch)).toEqual([
      "SETTLEMENT",
      "WILDS",
      "MOBILITY_TRADE",
      "INDUSTRY_WARFARE",
    ]);
    expect(layout).toHaveLength(4);
    expect(layout.every((root) => root.children.length === 2)).toBe(true);
    expect(
      layout.flatMap((root) => [
        root.node.id,
        ...root.children.flatMap((child) => [
          child.node.id,
          ...child.children.map((grandchild) => grandchild.node.id),
        ]),
      ]),
    ).toHaveLength(21);
    expect(layout.map((root) => root.leafCount)).toEqual([2, 2, 2, 3]);
    const industry = layout[3];
    expect(industry?.children.map((child) => child.leafCount)).toEqual([1, 2]);
    expect(
      industry?.children[1]?.children.map((child) => child.node.id),
    ).toEqual(["METALLURGY", "GRAND_WORKS"]);
  });
});
