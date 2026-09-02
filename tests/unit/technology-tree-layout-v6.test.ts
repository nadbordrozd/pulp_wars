import { describe, expect, it } from "vitest";
import {
  BASELINE_TECHNOLOGY_NODES_V6,
  TECHNOLOGY_BRANCH_IDS_V6,
  type PublicTechnologyNodeV6,
} from "../../src/engine/index";
import {
  technologyTreeLayoutV6,
  type TechnologyTreeLayoutNodeV6,
} from "../../src/render/dom/technology-tree-layout-v6";

describe("ruleset-6 technology tree presentation layout", () => {
  it("derives every branch fork deterministically from prerequisite edges", () => {
    for (const branch of TECHNOLOGY_BRANCH_IDS_V6) {
      const nodes = publicNodes.filter((node) => node.branch === branch);
      const first = technologyTreeLayoutV6(nodes);
      const second = technologyTreeLayoutV6(nodes);

      expect(first).toEqual(second);
      expect(first).toHaveLength(1);
      expect(first[0]?.parentId).toBeNull();
      expect(first[0]?.children).toHaveLength(2);
      expect(first[0]?.children.map((child) => child.node.tier)).toEqual([
        2, 2,
      ]);
      expect(
        first[0]?.children.map((child) => child.children[0]?.node.tier),
      ).toEqual([3, 3]);
      expect(flatten(first).map((layoutNode) => layoutNode.node.id)).toEqual(
        nodes.map((node) => node.id),
      );
      for (const layoutNode of flatten(first)) {
        expect(layoutNode.parentId).toBe(
          layoutNode.node.prerequisites[0] ?? null,
        );
      }
    }
  });

  it("rejects duplicate nodes and rootless prerequisite cycles", () => {
    const gathering = publicNodes[0];
    const farming = publicNodes[1];
    if (gathering === undefined || farming === undefined)
      throw new Error("Technology fixture is incomplete");
    expect(() => technologyTreeLayoutV6([gathering, gathering])).toThrow(
      /duplicate node/,
    );

    expect(() =>
      technologyTreeLayoutV6([
        { ...gathering, prerequisites: [farming.id] },
        { ...farming, prerequisites: [gathering.id] },
      ]),
    ).toThrow(/rootless cycle/);
  });
});

const publicNodes: readonly PublicTechnologyNodeV6[] =
  BASELINE_TECHNOLOGY_NODES_V6.map((node) => ({
    ...node,
    missingPrerequisites: node.prerequisites,
    state: node.prerequisites.length === 0 ? "AVAILABLE" : "BLOCKED",
    cost: 5 + (node.tier - 1) * 2,
    affordable: false,
    effects: node.unlocks,
    unlockedRoleRules: [],
  }));

function flatten(
  nodes: readonly TechnologyTreeLayoutNodeV6[],
): readonly TechnologyTreeLayoutNodeV6[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}
