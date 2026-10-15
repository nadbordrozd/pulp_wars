// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { TechnologyTreeViewportV7 } from "../../src/render/dom/technology-tree-viewport-v7";

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
    camera.attach(viewport, stage, { width: 600, height: 600 }, label);
    expect(stage.style.transform).toContain("scale(0.5533333333333333)");
    expect(viewport.dataset.zoom).toBe("1");
    expect(label.textContent).toBe("100%");
    expect(stage.dataset.labels).toBe("hidden");

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
    camera.attach(viewport, stage, { width: 600, height: 600 }, label);
    expect(viewport.dataset.zoom).toBe("1.22");
    expect(stage.style.transform).not.toBe(zoomed);

    camera.fit();
    expect(viewport.dataset.zoom).toBe("1");
    camera.zoomBy(0.1);
    expect(viewport.dataset.zoom).toBe("1");
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
