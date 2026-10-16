// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  TECHNOLOGY_TREE_MAX_FIT_SCALE_V7,
  TechnologyTreeViewportV7,
  technologyTreeFitScaleV7,
  technologyTreeMaxScaleV7,
} from "../../src/render/dom/technology-tree-viewport-v7";

beforeEach(() => {
  document.body.innerHTML = `
    <div id="viewport" tabindex="0">
      <div id="stage"><button class="v7-tech-card" data-graph-x="300" data-graph-y="50">Tech</button></div>
    </div>
    <output id="zoom"></output>
  `;
});

describe("Ruleset 7 technology tree viewport", () => {
  it("fits the whole graph, preserves relative zoom through resize, and resets on request", () => {
    const viewport = required<HTMLElement>("#viewport");
    const stage = required<HTMLElement>("#stage");
    const label = required<HTMLElement>("#zoom");
    let width = 340;
    let height = 500;
    viewport.getBoundingClientRect = () => rect(width, height);
    viewportDimensions(
      viewport,
      () => width,
      () => height,
    );
    const camera = new TechnologyTreeViewportV7();
    const graph = { width: 600, height: 600, labelScale: 1 };
    camera.attach(viewport, stage, graph, label);
    // (340 - 2 x 6) / 600: the side gutters keep the badge rings clear.
    expect(stage.style.transform).toContain("scale(0.5466666666666666)");
    expect(viewport.dataset.zoom).toBe("1");
    expect(label.textContent).toBe("100%");
    expect(stage.dataset.labels).toBe("hidden");
    // Names and prices keep their size on screen.
    expect(Number(stage.style.getPropertyValue("--tech-inverse"))).toBeCloseTo(
      1 / 0.5466666666666666,
    );

    camera.zoomBy(1.22);
    expect(viewport.dataset.zoom).toBe("1.22");
    expect(label.textContent).toBe("122%");
    camera.zoomBy(1.6);
    expect(stage.dataset.labels).toBe("show");
    camera.fit();
    expect(stage.dataset.labels).toBe("hidden");
    camera.zoomBy(1.22);
    const zoomed = stage.style.transform;
    width = 320;
    height = 420;
    camera.attach(viewport, stage, graph, label);
    expect(viewport.dataset.zoom).toBe("1.22");
    expect(stage.style.transform).not.toBe(zoomed);

    camera.fit();
    expect(viewport.dataset.zoom).toBe("1");
    camera.zoomBy(0.1);
    expect(viewport.dataset.zoom).toBe("1");
    camera.detach();
  });

  it("zooms far enough on a small phone for the names to show", () => {
    const viewport = required<HTMLElement>("#viewport");
    const stage = required<HTMLElement>("#stage");
    viewport.getBoundingClientRect = () => rect(288, 590);
    viewportDimensions(
      viewport,
      () => 288,
      () => 590,
    );
    const camera = new TechnologyTreeViewportV7();
    const graph = { width: 706, height: 676, labelScale: 1.35 };
    camera.attach(viewport, stage, graph);
    const fit = technologyTreeFitScaleV7({ width: 288, height: 590 }, graph);
    expect(fit).toBeCloseTo((288 - 12) / 706);
    camera.zoomBy(100);
    expect(camera.zoom * fit).toBeCloseTo(technologyTreeMaxScaleV7(fit));
    expect(technologyTreeMaxScaleV7(fit)).toBeGreaterThanOrEqual(1.35);
    expect(stage.dataset.labels).toBe("show");
    camera.detach();
  });

  it("fits the wide tree on a desktop with every name, and keeps zoom and centre when the tree changes shape", () => {
    // Bead pulp_wars-2yc.66: the graph's box in a 1440 x 900 window.
    const viewport = required<HTMLElement>("#viewport");
    const stage = required<HTMLElement>("#stage");
    let width = 1388;
    let height = 805;
    viewport.getBoundingClientRect = () => rect(width, height);
    viewportDimensions(
      viewport,
      () => width,
      () => height,
    );
    const wide = {
      width: 798.06,
      height: 675.92,
      labelScale: 1.1,
      fitGutterX: 99,
      fitGutterY: 6,
    };
    const camera = new TechnologyTreeViewportV7();
    camera.attach(viewport, stage, wide);
    // The height decides: (805 - 2 x 6) / 675.92.
    const fit = technologyTreeFitScaleV7({ width, height }, wide);
    expect(fit).toBeCloseTo((805 - 12) / 675.92);
    expect(stage.style.transform).toContain(`scale(${fit})`);
    expect(stage.dataset.labels).toBe("show");
    // Without gutters of its own a graph keeps the phone's (6 and 34).
    expect(
      technologyTreeFitScaleV7(
        { width, height },
        { width: 798.06, height: 675.92 },
      ),
    ).toBeCloseTo((805 - 68) / 675.92);
    // A huge screen stops at the largest Fit scale.
    expect(technologyTreeFitScaleV7({ width: 4000, height: 3000 }, wide)).toBe(
      TECHNOLOGY_TREE_MAX_FIT_SCALE_V7,
    );

    // Zoom in on the middle, then turn the screen: the compact tree keeps
    // the zoom and the same part of the tree in the middle.
    camera.zoomBy(1.22);
    width = 354;
    height = 762;
    const compact = { width: 705.97, height: 675.92, labelScale: 1.35 };
    camera.attach(viewport, stage, compact);
    expect(camera.zoom).toBeCloseTo(1.22);
    const middle = camera.project(compact.width / 2, compact.height / 2);
    expect(middle?.x).toBeCloseTo(width / 2);
    expect(middle?.y).toBeCloseTo(height / 2);
    expect(stage.dataset.labels).toBe("hidden");
    camera.detach();
  });

  it("reveals a badge under a docked detail without moving the stored camera", () => {
    const viewport = required<HTMLElement>("#viewport");
    const stage = required<HTMLElement>("#stage");
    viewport.getBoundingClientRect = () => rect(340, 600);
    viewportDimensions(
      viewport,
      () => 340,
      () => 600,
    );
    const camera = new TechnologyTreeViewportV7();
    camera.attach(viewport, stage, { width: 600, height: 600 });
    const before = stage.style.transform;
    const at = camera.project(300, 300);
    expect(at).toEqual({ x: 170, y: 300, width: 340, height: 600 });
    // A detail over the top 60%: the centre moves into the lower 40%.
    camera.reveal(300, 300, { left: 8, top: 0, right: 332, bottom: 360 });
    expect(stage.style.transform).toContain("translate(170px, 480px)");
    // A badge already clear of the detail does not move.
    camera.reveal(300, 300, { left: 8, top: 0, right: 332, bottom: 120 });
    expect(stage.style.transform).toBe(before);
    // Beside a detail on the right: only the horizontal position moves.
    camera.reveal(300, 300, { left: 150, top: 100, right: 332, bottom: 500 });
    expect(stage.style.transform).toContain("translate(75px, 300px)");
    camera.clearReveal();
    expect(stage.style.transform).toBe(before);
    camera.detach();
  });

  it("pans and pinches while suppressing only the click that follows a gesture", async () => {
    const viewport = required<HTMLElement>("#viewport");
    const stage = required<HTMLElement>("#stage");
    const card = required<HTMLButtonElement>(".v7-tech-card");
    viewport.getBoundingClientRect = () => rect(340, 500);
    viewportDimensions(
      viewport,
      () => 340,
      () => 500,
    );
    const camera = new TechnologyTreeViewportV7();
    camera.attach(viewport, stage, { width: 600, height: 600 });
    let clicks = 0;
    card.onclick = () => {
      clicks += 1;
    };

    pointer(card, "pointerdown", 1, 100, 100);
    pointer(card, "pointermove", 1, 130, 125);
    pointer(card, "pointerup", 1, 130, 125);
    pointerClick(card);
    expect(clicks).toBe(0);

    pointer(card, "pointerdown", 2, 100, 100, "touch");
    pointer(card, "pointerdown", 3, 200, 100, "touch");
    pointer(card, "pointermove", 3, 240, 100, "touch");
    expect(camera.zoom).toBeGreaterThan(1);
    pointer(card, "pointerup", 2, 100, 100, "touch");
    pointer(card, "pointerup", 3, 240, 100, "touch");
    pointerClick(card);
    expect(clicks).toBe(0);

    pointer(card, "pointerdown", 4, 100, 100);
    pointer(card, "pointerup", 4, 100, 100);
    pointerClick(card);
    expect(clicks).toBe(1);

    pointer(card, "pointerdown", 5, 100, 100);
    pointer(card, "pointermove", 5, 130, 125);
    pointer(card, "pointercancel", 5, 130, 125);
    pointerClick(card);
    expect(clicks).toBe(2);

    pointer(card, "pointerdown", 6, 100, 100);
    pointer(card, "pointermove", 6, 130, 125);
    pointer(card, "pointerup", 6, 130, 125);
    await new Promise((resolve) => setTimeout(resolve, 0));
    pointerClick(card);
    expect(clicks).toBe(3);

    pointer(card, "pointerdown", 7, 100, 100);
    pointer(card, "pointermove", 7, 130, 125);
    pointer(card, "pointerup", 7, 130, 125);
    card.click();
    expect(clicks).toBe(4);
    camera.detach();
  });

  it("pinches the tree on its shell while a detail makes the graph inert, and leaves the detail alone", () => {
    // Bead pulp_wars-2yc.72: an inert graph is not hit by touches, so they
    // land on the shell round it; the tree still zooms and pans there,
    // while touches and wheels on the detail (its own size on screen) and
    // on the zoom controls never move the tree.
    document.body.innerHTML = `
      <div id="shell">
        <div id="controls"><button>+</button></div>
        <div id="viewport" tabindex="0"><div id="stage"></div></div>
        <aside id="detail" class="v7-tech-detail"><p>Gathering</p></aside>
      </div>
    `;
    const shell = required<HTMLElement>("#shell");
    const viewport = required<HTMLElement>("#viewport");
    const stage = required<HTMLElement>("#stage");
    const detail = required<HTMLElement>("#detail p");
    const controls = required<HTMLElement>("#controls button");
    viewport.getBoundingClientRect = () => rect(340, 500);
    viewportDimensions(
      viewport,
      () => 340,
      () => 500,
    );
    const camera = new TechnologyTreeViewportV7();
    camera.attach(viewport, stage, { width: 600, height: 600 }, null, shell);
    viewport.inert = true;

    pointer(detail, "pointerdown", 1, 100, 400, "touch");
    pointer(detail, "pointerdown", 2, 200, 400, "touch");
    pointer(detail, "pointermove", 2, 260, 400, "touch");
    pointer(detail, "pointerup", 1, 100, 400, "touch");
    pointer(detail, "pointerup", 2, 260, 400, "touch");
    detail.dispatchEvent(
      new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: -300,
      }),
    );
    pointer(controls, "pointerdown", 3, 10, 10);
    pointer(controls, "pointermove", 3, 60, 60);
    pointer(controls, "pointerup", 3, 60, 60);
    expect(camera.zoom).toBe(1);
    const fitted = stage.style.transform;

    pointer(shell, "pointerdown", 4, 100, 100, "touch");
    pointer(shell, "pointerdown", 5, 200, 100, "touch");
    pointer(shell, "pointermove", 5, 260, 100, "touch");
    pointer(shell, "pointerup", 4, 100, 100, "touch");
    pointer(shell, "pointerup", 5, 260, 100, "touch");
    expect(camera.zoom).toBeGreaterThan(1);
    const pinched = camera.zoom;

    pointer(shell, "pointerdown", 6, 100, 100, "touch");
    pointer(shell, "pointermove", 6, 140, 130, "touch");
    pointer(shell, "pointerup", 6, 140, 130, "touch");
    expect(camera.zoom).toBe(pinched);
    expect(stage.style.transform).not.toBe(fitted);
    const wheel = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: -200,
    });
    shell.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(true);
    expect(camera.zoom).toBeGreaterThan(pinched);
    camera.detach();
  });

  it("supports arrow, zoom and Fit keys when the graph itself has focus", () => {
    const viewport = required<HTMLElement>("#viewport");
    const stage = required<HTMLElement>("#stage");
    viewport.getBoundingClientRect = () => rect(340, 500);
    viewportDimensions(
      viewport,
      () => 340,
      () => 500,
    );
    const camera = new TechnologyTreeViewportV7();
    camera.attach(viewport, stage, { width: 600, height: 600 });
    viewport.focus();
    const before = stage.style.transform;
    viewport.dispatchEvent(
      new KeyboardEvent("keydown", { key: "+", bubbles: true }),
    );
    expect(camera.zoom).toBeGreaterThan(1);
    viewport.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    expect(stage.style.transform).not.toBe(before);
    viewport.dispatchEvent(
      new KeyboardEvent("keydown", { key: "f", bubbles: true }),
    );
    expect(camera.zoom).toBe(1);
    camera.detach();
  });

  it("does not move a card between pointer down and pointer up when it receives focus", () => {
    const viewport = required<HTMLElement>("#viewport");
    const stage = required<HTMLElement>("#stage");
    const card = required<HTMLButtonElement>(".v7-tech-card");
    card.dataset.graphX = "48";
    viewport.getBoundingClientRect = () => rect(340, 500);
    viewportDimensions(
      viewport,
      () => 340,
      () => 500,
    );
    const camera = new TechnologyTreeViewportV7();
    camera.attach(viewport, stage, { width: 600, height: 600 });
    const before = stage.style.transform;

    pointer(card, "pointerdown", 1, 28, 250, "touch");
    card.focus();
    expect(stage.style.transform).toBe(before);
    pointer(card, "pointerup", 1, 28, 250, "touch");
    camera.detach();
  });
});

function required<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}

function rect(width: number, height: number): DOMRect {
  return {
    x: 0,
    y: 0,
    top: 0,
    right: width,
    bottom: height,
    left: 0,
    width,
    height,
    toJSON: () => ({}),
  };
}

function viewportDimensions(
  viewport: HTMLElement,
  width: () => number,
  height: () => number,
): void {
  Object.defineProperties(viewport, {
    clientWidth: { configurable: true, get: width },
    clientHeight: { configurable: true, get: height },
  });
}

function pointer(
  target: Element,
  type: string,
  pointerId: number,
  clientX: number,
  clientY: number,
  pointerType = "mouse",
): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    pointerType: { value: pointerType },
    button: { value: 0 },
    clientX: { value: clientX },
    clientY: { value: clientY },
  });
  target.dispatchEvent(event);
}

function pointerClick(target: Element): void {
  target.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }),
  );
}
