// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapRuleset7App } from "../../src/app/index";
import {
  ART_SET_STORAGE_KEY_V7,
  DEFAULT_ART_SET_V7,
  resolveArtSetV7,
} from "../../src/app/art-set-v7";
import { viewForV7 } from "../../src/engine/index";
import type { StorageAdapter } from "../../src/persistence/index";
import {
  CanvasBoardHostV7,
  type BoardHostModelV7,
} from "../../src/render/canvas/board-host-v7";
import * as renderer from "../../src/render/canvas/board-renderer-v7";
import {
  MIN_VISIBLE_AREA_SHARE,
  cameraLimitArea,
  type CameraState,
} from "../../src/render/canvas/geometry";
import { initialV7 } from "../fixtures/v7-builders";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

function memoryStorage(): StorageAdapter & {
  readonly values: Map<string, string>;
} {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

describe("Ruleset 7 art set (the switch is retired, pulp_wars-67q.13)", () => {
  it("is always CHIBI: ?art=legacy is not recognised and nothing is stored", () => {
    expect(DEFAULT_ART_SET_V7).toBe("CHIBI");
    const storage = memoryStorage();
    for (const search of [
      "",
      "?art=legacy",
      "?art=LEGACY",
      "?art=chibi",
      "?art=neon",
      "?art=chibi&art=legacy",
      "?ruleset=7&art=legacy",
    ]) {
      expect(resolveArtSetV7(search, storage)).toBe("CHIBI");
      expect(storage.values.size).toBe(0);
    }
    expect(resolveArtSetV7("?art=legacy", null)).toBe("CHIBI");
  });

  it("clears a stale stored choice and falls back to the default", () => {
    for (const stale of ["LEGACY", "CHIBI", "corrupt", ""]) {
      const storage = memoryStorage();
      storage.setItem(ART_SET_STORAGE_KEY_V7, stale);
      storage.setItem("pulpWars.settings.v1", "kept");
      expect(resolveArtSetV7("", storage)).toBe("CHIBI");
      // The retired key is gone; no other setting is touched.
      expect(storage.values.has(ART_SET_STORAGE_KEY_V7)).toBe(false);
      expect(storage.values.get("pulpWars.settings.v1")).toBe("kept");
      expect(resolveArtSetV7("?art=legacy", storage)).toBe("CHIBI");
      expect(storage.values.has(ART_SET_STORAGE_KEY_V7)).toBe(false);
    }
    // Storage that cannot be read or cleared never stops the start.
    const denied: StorageAdapter = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    expect(resolveArtSetV7("", denied)).toBe("CHIBI");
    const readOnly: StorageAdapter = {
      getItem: () => "LEGACY",
      setItem: () => undefined,
      removeItem: () => {
        throw new Error("denied");
      },
    };
    expect(resolveArtSetV7("", readOnly)).toBe("CHIBI");
  });

  it("boots the production view on CHIBI whatever the address or an earlier visit asked for", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const settings = memoryStorage();
    const boot = async (search: string): Promise<DOMStringMap | undefined> => {
      document.body.innerHTML = '<div id="app"></div>';
      window.history.replaceState(null, "", `/${search}`);
      const app = bootstrapRuleset7App(document, {
        storage: null,
        settingsStorage: settings,
      });
      chooseSeed();
      document
        .querySelector<HTMLButtonElement>('[data-action="launch"]')
        ?.click();
      await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
      const dataset = document.querySelector<HTMLCanvasElement>(
        "canvas.board-canvas-v7",
      )?.dataset;
      const snapshot = dataset === undefined ? undefined : { ...dataset };
      app.destroy();
      return snapshot;
    };
    const expectChibi = (dataset: DOMStringMap | undefined): void => {
      expect(dataset?.artSet).toBe("CHIBI");
      expect(["0.75", "1"]).toContain(dataset?.zoomStep);
      expect(Number(dataset?.tileCssPx)).toBe(80 * Number(dataset?.zoomStep));
      expect(settings.values.has(ART_SET_STORAGE_KEY_V7)).toBe(false);
    };

    // Fresh storage, no parameter: CHIBI on the 80 px cell, nothing stored.
    expectChibi(await boot(""));
    // The retired opt-out: the default look, and no choice is stored.
    expectChibi(await boot("?art=legacy"));
    expectChibi(await boot("?art=chibi"));
    // A browser that opted out before the retirement: its stored LEGACY
    // preference is cleared and the default look is drawn.
    settings.setItem(ART_SET_STORAGE_KEY_V7, "LEGACY");
    expectChibi(await boot(""));
    // The shared settings envelope is untouched.
    expect(settings.values.has("pulpWars.settings.v1")).toBe(false);
    window.history.replaceState(null, "", "/");
  });
});

describe("CHIBI Canvas host camera", () => {
  function rig(artSet: BoardHostModelV7["artSet"]) {
    const draws: Parameters<typeof renderer.drawBoardV7>[0][] = [];
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      clearRect: vi.fn(),
      setTransform: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(renderer, "drawBoardV7").mockImplementation((input) => {
      draws.push(input);
    });
    const container = document.createElement("div");
    document.body.replaceChildren(container);
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
      width: 1024,
      height: 640,
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 1024,
      bottom: 640,
      toJSON: () => ({}),
    });
    const host = new CanvasBoardHostV7(document);
    const onSelection = vi.fn();
    host.mount(container, { onSelection, onCommand: vi.fn() });
    const state = initialV7(1519);
    const view = viewForV7(state, state.humanPlayerId);
    const model: BoardHostModelV7 = {
      matchInstanceId: 1,
      view,
      offeredCommands: [],
      interactive: true,
      motion: "REDUCED",
      animationSpeed: "FAST",
      presentationPaused: false,
      highContrast: false,
      interaction: {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      },
      ...(artSet === undefined ? {} : { artSet }),
    };
    host.update(model);
    const canvas = container.querySelector("canvas");
    if (canvas === null) throw new Error("canvas missing");
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      width: 1024,
      height: 640,
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 1024,
      bottom: 640,
      toJSON: () => ({}),
    });
    const camera = (): CameraState => {
      const last = draws.at(-1);
      if (last === undefined) throw new Error("no draw");
      return last.camera;
    };
    const key = (value: string) =>
      canvas.dispatchEvent(
        new KeyboardEvent("keydown", { key: value, bubbles: true }),
      );
    const pointer = (type: string, id: number, x: number, y: number) => {
      const event = new MouseEvent(type, {
        bubbles: true,
        clientX: x,
        clientY: y,
      });
      Object.defineProperty(event, "pointerId", { value: id });
      canvas.dispatchEvent(event);
    };
    return {
      host,
      model,
      view,
      canvas,
      draws,
      camera,
      key,
      pointer,
      onSelection,
    };
  }

  it("fits at 0.75, steps through 1, 1.5 and 2 with keys, and never leaves the step list", () => {
    const { host, canvas, draws, camera, key } = rig("CHIBI");
    expect(draws.at(-1)).toMatchObject({ artSet: "CHIBI" });
    expect(draws.at(-1)?.chibiArt).toBeDefined();
    expect(canvas.dataset).toMatchObject({
      artSet: "CHIBI",
      zoomStep: "0.75",
      tileCssPx: "60",
    });
    const seen: string[] = [];
    for (let index = 0; index < 4; index += 1) {
      key("+");
      seen.push(`${canvas.dataset.zoomStep}:${canvas.dataset.tileCssPx}`);
    }
    expect(seen).toEqual(["1:80", "1.5:120", "2:160", "2:160"]);
    for (let index = 0; index < 4; index += 1) key("-");
    expect(canvas.dataset.zoomStep).toBe("0.75");
    host.zoom("IN");
    expect(camera().zoom).toBe(0.625);
    host.destroy();
  });

  it("turns one wheel notch or accumulated trackpad deltas into exactly one step", () => {
    const { host, canvas } = rig("CHIBI");
    const wheel = (deltaY: number) =>
      canvas.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY,
          clientX: 512,
          clientY: 320,
          bubbles: true,
          cancelable: true,
        }),
      );
    wheel(-100);
    expect(canvas.dataset.zoomStep).toBe("1");
    wheel(-20);
    wheel(-20);
    expect(canvas.dataset.zoomStep).toBe("1");
    wheel(-20);
    expect(canvas.dataset.zoomStep).toBe("1.5");
    wheel(100);
    expect(canvas.dataset.zoomStep).toBe("1");
    host.destroy();
  });

  it("snaps pinch zoom to discrete steps and picks tiles at the 80 px geometry", () => {
    const { host, view, canvas, camera, pointer, onSelection, key } =
      rig("CHIBI");
    key("+");
    expect(canvas.dataset.zoomStep).toBe("1");
    pointer("pointerdown", 1, 400, 300);
    pointer("pointerdown", 2, 500, 300);
    pointer("pointermove", 2, 520, 300);
    expect(canvas.dataset.zoomStep).toBe("1");
    pointer("pointermove", 2, 600, 300);
    expect(canvas.dataset.zoomStep).toBe("2");
    pointer("pointerup", 2, 600, 300);
    pointer("pointerup", 1, 400, 300);
    key("-");
    expect(canvas.dataset.zoomStep).toBe("1.5");
    key("-");
    const current = camera();
    expect(current.zoom).toBe(0.625);
    const empty = view.board.tiles.find(
      (tile) =>
        tile.at.x > 0 &&
        tile.at.y > 0 &&
        !view.units.some((unit) => sameAt(unit.at, tile.at)) &&
        !view.cities.some((city) => sameAt(city.at, tile.at)),
    );
    if (empty === undefined) throw new Error("empty tile missing");
    // Tap 39 px right of the cell centre: still inside its 80 px cell.
    const x = current.offsetX + empty.at.x * 80 + 39;
    const y = current.offsetY + empty.at.y * 80;
    pointer("pointerdown", 3, x, y);
    pointer("pointerup", 3, x, y);
    expect(onSelection.mock.calls.at(-1)?.[0]).toEqual({
      kind: "TILE",
      at: empty.at,
    });
    host.destroy();
  });

  it.each(["CHIBI", "LEGACY"] as const)(
    "never drags, pinches or zooms the %s explored map out of view (bead pulp_wars-eu3r.5)",
    (artSet) => {
      const { host, view, camera, pointer, canvas, key } = rig(artSet);
      // The explored cells (plus one cell) must stay in view, not fog.
      const area = cameraLimitArea(
        view.board,
        view.board.tiles.filter((tile) => tile.explored).map((tile) => tile.at),
      );
      // Where the margin box fits it stays wholly visible; otherwise the
      // explored cells cover half the canvas on that axis.
      const kept = () => {
        const { offsetX, offsetY, zoom } = camera();
        for (const [offset, size, outer, inner] of [
          [
            offsetX,
            1024,
            [area.outer.left, area.outer.right],
            [area.inner.left, area.inner.right],
          ],
          [
            offsetY,
            640,
            [area.outer.top, area.outer.bottom],
            [area.inner.top, area.inner.bottom],
          ],
        ] as const) {
          if ((outer[1] - outer[0]) * zoom <= size) {
            expect(offset + outer[0] * zoom).toBeGreaterThanOrEqual(-1e-6);
            expect(offset + outer[1] * zoom).toBeLessThanOrEqual(size + 1e-6);
          } else
            expect(
              Math.min(size, offset + inner[1] * zoom) -
                Math.max(0, offset + inner[0] * zoom),
            ).toBeGreaterThanOrEqual(
              Math.min(
                (inner[1] - inner[0]) * zoom,
                size * MIN_VISIBLE_AREA_SHARE,
              ) - 1e-6,
            );
        }
      };
      let id = 10;
      const drag = (dx: number, dy: number) => {
        id += 1;
        pointer("pointerdown", id, 500, 300);
        pointer("pointermove", id, 500 + dx, 300 + dy);
        pointer("pointerup", id, 500 + dx, 300 + dy);
      };
      // Within the limits a drag pans by exactly the pointer delta.
      const start = camera();
      drag(40, 12);
      expect(camera()).toEqual({
        ...start,
        offsetX: start.offsetX + 40,
        offsetY: start.offsetY + 12,
      });
      for (const step of ["IN", "OUT", "OUT", "OUT", "OUT"] as const) {
        for (const [dx, dy] of [
          [6000, 0],
          [-6000, 0],
          [0, 6000],
          [0, -6000],
          [6000, 6000],
          [-6000, -6000],
        ] as const) {
          drag(dx, dy);
          kept();
          // Stopped at the limit with no stored overshoot: dragging back
          // moves the board at once.
          const held = camera();
          drag(-Math.sign(dx) * 20, -Math.sign(dy) * 20);
          expect(camera().offsetX).toBeCloseTo(
            held.offsetX - Math.sign(dx) * 20,
            6,
          );
          expect(camera().offsetY).toBeCloseTo(
            held.offsetY - Math.sign(dy) * 20,
            6,
          );
        }
        // Zoom about a far corner, by key and by pinch; the board stays.
        drag(-6000, -6000);
        key(step === "IN" ? "+" : "-");
        kept();
        pointer("pointerdown", 1, 20, 20);
        pointer("pointerdown", 2, 120, 20);
        pointer("pointermove", 2, 60, 20);
        pointer("pointermove", 1, 6000, 4000);
        pointer("pointerup", 2, 60, 20);
        pointer("pointerup", 1, 6000, 4000);
        kept();
        canvas.dispatchEvent(
          new WheelEvent("wheel", {
            deltaY: 100,
            clientX: 1000,
            clientY: 620,
            bubbles: true,
            cancelable: true,
          }),
        );
        kept();
      }
      host.destroy();
    },
  );

  it("keeps LEGACY camera behaviour and refits when the art set changes", () => {
    const { host, model, canvas, camera, key } = rig(undefined);
    expect(canvas.dataset.artSet).toBe("LEGACY");
    expect(canvas.dataset.zoomStep).toBeUndefined();
    const legacyZoom = camera().zoom;
    key("+");
    expect(camera().zoom).toBeCloseTo(Math.min(1.75, legacyZoom * 1.2));
    host.update({ ...model, artSet: "CHIBI" });
    expect(canvas.dataset.zoomStep).toBe("0.75");
    host.update({ ...model, artSet: "LEGACY" });
    expect(canvas.dataset.artSet).toBe("LEGACY");
    expect(camera().zoom).toBe(legacyZoom);
    host.destroy();
  });
});

function sameAt(
  left: { readonly x: number; readonly y: number },
  right: { readonly x: number; readonly y: number },
): boolean {
  return left.x === right.x && left.y === right.y;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("condition not reached");
}

/** Setup defaults to "New map"; these launches need the fixed seed field. */
function chooseSeed(): void {
  document
    .querySelector<HTMLButtonElement>('[data-action="seed-mode-seed"]')
    ?.click();
}
