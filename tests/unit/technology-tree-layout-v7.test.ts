import { describe, expect, it } from "vitest";
import {
  createPlayableGameV7,
  queryTechnologyTreeV7,
  viewForV7,
  type FactionIdV7,
} from "../../src/engine/index";
import {
  TECHNOLOGY_GRAPH_GEOMETRY_V7,
  TECHNOLOGY_LABEL_SCALE_V7,
  technologyNodeBoxesV7,
  technologyTreeGraphLayoutV7,
  technologyTreeLayoutV7,
  type TechnologyBoxV7,
  type TechnologyTreeGraphLayoutV7,
} from "../../src/render/dom/technology-tree-layout-v7";
import {
  technologyTreeFitScaleV7,
  technologyTreeMaxScaleV7,
} from "../../src/render/dom/technology-tree-viewport-v7";
import { browserSetupV7, initialV7 } from "../fixtures/v7-builders";

const FACTIONS = [
  "ORIGINAL",
  "UNDEAD",
  "GOBLIN",
  "DINOSAUR",
  "MARTIAN",
  "ICE_FOLK",
  "DWARF",
  "CANDY",
  "CULT",
] as const satisfies readonly FactionIdV7[];

/** A new nine-seat match's tree as seen by `faction` (no command played). */
function factionGraph(faction: FactionIdV7): TechnologyTreeGraphLayoutV7 {
  const created = createPlayableGameV7({
    ...browserSetupV7(4127, 3),
    aiCount: 8,
    width: 25,
    height: 25,
    factions: [faction, ...FACTIONS.filter((entry) => entry !== faction)],
  });
  if (!created.ok) throw new Error(JSON.stringify(created));
  const state = created.state;
  const tree = queryTechnologyTreeV7(viewForV7(state, state.humanPlayerId));
  return technologyTreeGraphLayoutV7(technologyTreeLayoutV7(tree.nodes));
}

function overlaps(first: TechnologyBoxV7, second: TechnologyBoxV7): boolean {
  return (
    first.left < second.right &&
    second.left < first.right &&
    first.top < second.bottom &&
    second.top < first.bottom
  );
}

function angleOf(
  graph: TechnologyTreeGraphLayoutV7,
  point: { x: number; y: number },
): number {
  return (
    (Math.atan2(point.y - graph.centre.y, point.x - graph.centre.x) * 180) /
    Math.PI
  );
}

function distanceOf(
  graph: TechnologyTreeGraphLayoutV7,
  point: { x: number; y: number },
): number {
  return Math.hypot(point.x - graph.centre.x, point.y - graph.centre.y);
}

/**
 * Every overlay box a node shows from the label scale up: names, price
 * chips, badges and the centre emblem must never touch.
 */
function labelledBoxes(
  graph: TechnologyTreeGraphLayoutV7,
  scale: number,
): { readonly owner: string; readonly box: TechnologyBoxV7 }[] {
  const radius = TECHNOLOGY_GRAPH_GEOMETRY_V7.centreRadius;
  return [
    {
      owner: "centre",
      box: {
        left: graph.centre.x - radius,
        top: graph.centre.y - radius,
        right: graph.centre.x + radius,
        bottom: graph.centre.y + radius,
      },
    },
    ...graph.nodes.flatMap((node) => {
      const boxes = technologyNodeBoxesV7(node, scale);
      const id = node.layout.node.id;
      return [
        { owner: `${id} badge`, box: boxes.badge },
        { owner: `${id} chip`, box: boxes.chip },
        { owner: `${id} label`, box: boxes.label },
      ];
    }),
  ];
}

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

  it.each(FACTIONS)(
    "radiates the %s tree as five evenly spaced spokes growing outward",
    (faction) => {
      const graph = factionGraph(faction);
      expect(graph.nodes).toHaveLength(25);
      expect(graph.edges).toHaveLength(20);
      expect(graph.spokes).toHaveLength(5);
      expect(graph.wedges).toHaveLength(5);
      expect(
        new Set(graph.nodes.map(({ layout }) => layout.node.id)).size,
      ).toBe(25);
      const byId = new Map(
        graph.nodes.map((node) => [node.layout.node.id, node] as const),
      );
      // One spoke per branch, 72 degrees apart, the first straight up.
      const roots = graph.nodes.filter((node) => node.ring === 1);
      expect(roots.map((root) => root.layout.node.branch)).toEqual([
        "SETTLEMENT",
        "WILDS",
        "MOBILITY",
        "INDUSTRY",
        "NAVAL",
      ]);
      roots.forEach((root, index) => {
        expect(angleOf(graph, root)).toBeCloseTo(
          index * 72 - 90 > 180 ? index * 72 - 450 : index * 72 - 90,
          1,
        );
        expect(graph.spokes[index]?.childId).toBe(root.layout.node.id);
      });
      // Every child is farther from the centre than its parent and stays in
      // its branch's wedge, tier 3 fanned wider than tier 2.
      for (const edge of graph.edges) {
        const parent = byId.get(edge.parentId);
        const child = byId.get(edge.childId);
        if (parent === undefined || child === undefined)
          throw new Error("edge end missing");
        expect(child.layout.parentId).toBe(parent.layout.node.id);
        expect(child.ring).toBe(parent.ring + 1);
        expect(distanceOf(graph, child)).toBeGreaterThan(
          distanceOf(graph, parent) + TECHNOLOGY_GRAPH_GEOMETRY_V7.nodeDiameter,
        );
        expect(child.layout.node.branch).toBe(parent.layout.node.branch);
        expect(edge.path).toMatch(/^M[\d. ]+C[\d. ]+$/);
      }
      for (const node of graph.nodes) {
        const root = roots.find(
          (entry) => entry.layout.node.branch === node.layout.node.branch,
        );
        if (root === undefined) throw new Error("branch root missing");
        const offset = Math.abs(
          ((angleOf(graph, node) - angleOf(graph, root) + 540) % 360) - 180,
        );
        expect(offset).toBeLessThan(36);
        if (node.ring === 2)
          expect(offset).toBeCloseTo(
            TECHNOLOGY_GRAPH_GEOMETRY_V7.tier2Spread,
            1,
          );
        if (node.ring === 3)
          expect(offset).toBeCloseTo(
            TECHNOLOGY_GRAPH_GEOMETRY_V7.tier3Spread,
            1,
          );
        // The whole badge is inside the graph.
        const { badge } = technologyNodeBoxesV7(node, 1);
        expect(badge.left).toBeGreaterThanOrEqual(0);
        expect(badge.top).toBeGreaterThanOrEqual(0);
        expect(badge.right).toBeLessThanOrEqual(graph.width);
        expect(badge.bottom).toBeLessThanOrEqual(graph.height);
      }
    },
  );

  it.each(FACTIONS)(
    "never overlaps %s badges, prices or names at any zoom that shows them",
    (faction) => {
      const graph = factionGraph(faction);
      const diameter = TECHNOLOGY_GRAPH_GEOMETRY_V7.nodeDiameter;
      // Badges alone (the overview): round badges keep a clear gap.
      for (const [index, first] of graph.nodes.entries()) {
        expect(distanceOf(graph, first)).toBeGreaterThan(
          TECHNOLOGY_GRAPH_GEOMETRY_V7.centreRadius + diameter / 2 + 4,
        );
        for (const second of graph.nodes.slice(index + 1))
          expect(
            Math.hypot(first.x - second.x, first.y - second.y),
          ).toBeGreaterThan(diameter + 8);
      }
      // Names and prices show from the label scale up; they keep their
      // size on screen, so each step up only shrinks them in graph units.
      for (
        let scale = TECHNOLOGY_LABEL_SCALE_V7;
        scale <= technologyTreeMaxScaleV7(1.25);
        scale += 0.05
      ) {
        const boxes = labelledBoxes(graph, scale);
        for (const [index, first] of boxes.entries())
          for (const second of boxes.slice(index + 1)) {
            const sameNode =
              first.owner.split(" ")[0] === second.owner.split(" ")[0];
            // A node's chip overlaps its own badge's rim by design, and the
            // round badges and emblem were checked by distance above.
            const round = (owner: string): boolean =>
              owner === "centre" || owner.endsWith(" badge");
            if (sameNode || (round(first.owner) && round(second.owner)))
              continue;
            expect(
              overlaps(first.box, second.box),
              `${first.owner} and ${second.owner} at scale ${scale.toFixed(2)}`,
            ).toBe(false);
          }
        // A node's name clears its own badge and chip.
        for (const node of graph.nodes) {
          const own = technologyNodeBoxesV7(node, scale);
          expect(overlaps(own.label, own.badge)).toBe(false);
          expect(overlaps(own.label, own.chip)).toBe(false);
        }
      }
    },
  );

  it("puts names away from the centre: the outer leaves above or below", () => {
    const graph = factionGraph("ORIGINAL");
    for (const node of graph.nodes) {
      const below = node.y > graph.centre.y;
      if (node.ring === 3)
        expect(node.labelSide).toBe(below ? "below" : "above");
      if (node.labelSide === "left")
        expect(node.x).toBeLessThan(graph.centre.x);
      if (node.labelSide === "right")
        expect(node.x).toBeGreaterThan(graph.centre.x);
      if (node.labelSide === "above") expect(below).toBe(false);
      if (node.labelSide === "below") expect(below).toBe(true);
    }
  });

  it("fits the whole tree on a phone with recognisable badges and zooms to the names", () => {
    const graph = factionGraph("ORIGINAL");
    const diameter = TECHNOLOGY_GRAPH_GEOMETRY_V7.nodeDiameter;
    // The technology graph's box on a 390 x 844 and a 320 x 720 phone, and
    // on a 1440 x 900 desktop (measured in Chrome).
    const phone390 = technologyTreeFitScaleV7(
      { width: 358, height: 706 },
      graph,
    );
    const phone320 = technologyTreeFitScaleV7(
      { width: 288, height: 590 },
      graph,
    );
    const desktop = technologyTreeFitScaleV7(
      { width: 1294, height: 735 },
      graph,
    );
    expect(graph.width * phone390).toBeLessThanOrEqual(358);
    expect(graph.height * phone390).toBeLessThanOrEqual(706);
    expect(graph.width * phone320).toBeLessThanOrEqual(288);
    expect(diameter * phone390).toBeGreaterThanOrEqual(35);
    expect(diameter * phone320).toBeGreaterThanOrEqual(28);
    expect(diameter * desktop).toBeGreaterThanOrEqual(64);
    // Zooming in always reaches the scale that shows every name.
    for (const fit of [phone320, phone390, desktop])
      expect(technologyTreeMaxScaleV7(fit)).toBeGreaterThanOrEqual(
        TECHNOLOGY_LABEL_SCALE_V7,
      );
  });
});
