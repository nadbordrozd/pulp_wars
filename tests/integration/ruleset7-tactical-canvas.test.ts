// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  PlayerEventEnvelopeV7,
  PlayerViewV7,
} from "../../src/engine/index";
import {
  CanvasBoardHostV7,
  type BoardHostModelV7,
} from "../../src/render/canvas/board-host-v7";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
} from "../../src/render/canvas/board-renderer-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import { horseArcherPublicFixtureV7 } from "../fixtures/ruleset7-tactical-ui";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("Ruleset 7 tactical Canvas presentation", () => {
  it("composites public links after every terrain tile and back under endpoint foreground", () => {
    const operations: string[] = [];
    const state: Record<PropertyKey, unknown> = {};
    const context = new Proxy(state, {
      get: (target, key) => {
        if (key === "fillRect")
          return () => {
            if (target.fillStyle === "#65965b") operations.push("terrain");
            if (target.fillStyle === "#101718") operations.push("unit");
          };
        if (key === "stroke")
          return () => {
            if (target.strokeStyle === "#71cfef") operations.push("link");
          };
        if (key === "clip") return () => operations.push("clip");
        if (key === "translate") return () => operations.push("status");
        return key in target ? target[key] : vi.fn();
      },
      set: (target, key, value) => {
        target[key] = value;
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    drawBoardV7({
      context,
      viewport: { width: 256, height: 128 },
      devicePixelRatio: 1,
      camera: { offsetX: 64, offsetY: 64, zoom: 1 },
      sceneAlpha: 0.5,
      images: { resolve: () => null },
      plan: {
        version: 7,
        targets: [],
        entries: [
          { key: "terrain:0,0", kind: "TERRAIN", layer: 1, at: { x: 0, y: 0 } },
          {
            key: "link:0,0",
            kind: "LINK",
            layer: 6,
            at: { x: 0, y: 0 },
            linkTo: { x: 1, y: 0 },
            label: "WAITING_FOR_REPLY",
          },
          {
            key: "unit:1",
            kind: "UNIT",
            layer: 5,
            at: { x: 0, y: 0 },
            ownerColor: "#f06762",
            ownerSeat: 0,
            hp: 7,
            maxHp: 7,
          },
          {
            key: "status:0",
            kind: "STATUS",
            layer: 6,
            at: { x: 0, y: 0 },
            statusId: "ui-status-blackout-active",
          },
          {
            key: "city:1",
            kind: "CITY",
            layer: 4,
            at: { x: 0, y: 0 },
            ownerColor: "#f06762",
            ownerSeat: 0,
            value: 1,
            population: 0,
          },
          { key: "terrain:1,0", kind: "TERRAIN", layer: 1, at: { x: 1, y: 0 } },
          {
            key: "unit:2",
            kind: "UNIT",
            layer: 5,
            at: { x: 1, y: 0 },
            ownerColor: "#28b7a4",
            ownerSeat: 1,
            hp: 15,
            maxHp: 15,
          },
        ],
      },
    });
    const linkIndex = operations.indexOf("link");
    expect(linkIndex).toBeGreaterThan(operations.lastIndexOf("terrain"));
    expect(operations.lastIndexOf("clip")).toBeLessThan(linkIndex);
    expect(operations.filter((operation) => operation === "clip")).toHaveLength(
      4,
    );
    expect(operations.filter((operation) => operation === "unit")).toHaveLength(
      2,
    );
    expect(
      operations.filter((operation) => operation === "status"),
    ).toHaveLength(1);
  });

  it("renders deduplicated two-shot targets and non-overlapping registry attachments", () => {
    const fixture = horseArcherPublicFixtureV7();
    const horseArcher = required(
      fixture.view.units.find(
        (unit) =>
          unit.ownerId === fixture.view.viewer.id &&
          unit.role === "HORSE_ARCHER",
      ),
    );
    const target = required(
      fixture.view.units.find((unit) => unit.ownerId !== horseArcher.ownerId),
    );
    const fullView: PlayerViewV7 = {
      ...fixture.view,
      units: fixture.view.units.map((unit) =>
        unit.id === target.id
          ? {
              ...unit,
              visibility: {
                concealment: "OWNER_CAPABILITY",
                detection: {
                  kind: "DETECTED",
                  breakCondition: "OUTSIDE_ALL_LEGAL_DETECTOR_RANGE",
                },
                exposures: [
                  {
                    reason: "BLACKOUT",
                    boundary: {
                      kind: "ANCHOR_NEXT_ACCEPTED_END_TURN",
                      anchorPlayerId: target.ownerId,
                      round: { known: true, value: fixture.view.round + 1 },
                    },
                  },
                ],
              },
            }
          : unit,
      ),
    };
    const targetPlan = buildBoardRenderPlanV7(
      fixture.view,
      fixture.offeredCommands,
      {
        selection: { kind: "UNIT", unitId: horseArcher.id },
        selectedUnitId: horseArcher.id,
        selectedAchievement: null,
      },
    );
    expect(
      targetPlan.targets.filter((entry) => entry.family === "ATTACK"),
    ).toHaveLength(2);
    const plan = buildBoardRenderPlanV7(fullView, [], {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    });
    expect(plan.entries.filter((entry) => entry.kind === "LINK")).toHaveLength(
      0,
    );
    const coLocated = plan.entries.filter(
      (entry) =>
        entry.kind === "STATUS" &&
        entry.at.x === target.at.x &&
        entry.at.y === target.at.y,
    );
    expect(coLocated.map((entry) => entry.statusId)).toEqual(
      expect.arrayContaining([
        "ui-status-concealed",
        "ui-status-detected",
        "ui-status-exposed",
      ]),
    );
    expect(
      coLocated
        .map((entry) => entry.attachmentSlot)
        .sort((left, right) => (left ?? 0) - (right ?? 0)),
    ).toEqual([0, 1, 2]);
    expect(new Set(targetPlan.targets.map(targetKey)).size).toBe(
      targetPlan.targets.length,
    );
    expect(targetPlan.entries.some((entry) => entry.kind === "REACH")).toBe(
      false,
    );
  });

  it("coalesces visibility fades and never reconstructs stale tactical coordinates", () => {
    const fixture = horseArcherPublicFixtureV7();
    const unit = required(fixture.view.units[0]);
    const visibilityEnvelope = envelope(fixture.view, [
      {
        kind: "UNIT_REVEALED",
        unitId: unit.id,
        at: unit.at,
        reason: "DETECTION",
      },
      { kind: "UNIT_CONCEALED", unitId: unit.id, lastSeenAt: unit.at },
    ]);
    expect(
      corePresentationPlanV7(
        fixture.view,
        visibilityEnvelope,
        fixture.view,
      ).filter((step) => step.kind === "VISIBILITY_CROSSFADE"),
    ).toHaveLength(1);

    const disappeared: PlayerViewV7 = {
      ...fixture.view,
      units: fixture.view.units.filter((candidate) => candidate.id !== unit.id),
    };
    const statusPlan = corePresentationPlanV7(
      fixture.view,
      envelope(fixture.view, [
        {
          kind: "SABOTEUR_EXPOSED",
          unitId: unit.id,
          anchorPlayerId: fixture.view.viewer.id,
          reason: "ATTACK",
        },
      ]),
      disappeared,
    );
    expect(statusPlan).toEqual([]);
  });

  it("settles cancelled visibility/status fades without clearing a replacement or resurrecting after destroy", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    let now = 0;
    vi.spyOn(window.performance, "now").mockImplementation(() => now);
    let nextFrame = 1;
    const frames = new Map<number, FrameRequestCallback>();
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: vi.fn((callback: FrameRequestCallback) => {
        const id = nextFrame;
        nextFrame += 1;
        frames.set(id, callback);
        return id;
      }),
    });
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      value: vi.fn((id: number) => frames.delete(id)),
    });
    const fixture = horseArcherPublicFixtureV7();
    const unit = required(fixture.view.units[0]);
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({ width: 800, height: 600 }),
    });
    document.body.append(container);
    const host = new CanvasBoardHostV7(document);
    host.mount(container, { onSelection: vi.fn(), onCommand: vi.fn() });
    const model: BoardHostModelV7 = {
      matchInstanceId: 1,
      view: fixture.view,
      offeredCommands: fixture.offeredCommands,
      interaction: {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      },
      interactive: false,
      motion: "FULL",
      animationSpeed: "NORMAL",
      presentationPaused: false,
      highContrast: false,
    };
    host.update(model);
    const fading = host.presentBoundary(
      fixture.view,
      fixture.view,
      envelope(fixture.view, [
        {
          kind: "UNIT_REVEALED",
          unitId: unit.id,
          at: unit.at,
          reason: "DETECTION",
        },
      ]),
    );
    expect(frames.size).toBe(1);
    const status = host.presentBoundary(
      fixture.view,
      fixture.view,
      envelope(fixture.view, [
        {
          kind: "SABOTEUR_EXPOSED",
          unitId: unit.id,
          anchorPlayerId: fixture.view.viewer.id,
          reason: "ATTACK",
        },
      ]),
    );
    await fading;
    await Promise.resolve();
    expect(frames.size).toBe(1);
    now = 1_000;
    takeFrame(frames)(now);
    await status;
    expect(frames.size).toBe(0);

    const restartFade = host.presentBoundary(
      fixture.view,
      fixture.view,
      envelope(fixture.view, [
        { kind: "UNIT_CONCEALED", unitId: unit.id, lastSeenAt: unit.at },
      ]),
    );
    expect(frames.size).toBe(1);
    host.update({ ...model, matchInstanceId: 2 });
    await restartFade;
    expect(frames.size).toBe(0);

    const destroyFade = host.presentBoundary(
      fixture.view,
      fixture.view,
      envelope(fixture.view, [
        {
          kind: "UNIT_REVEALED",
          unitId: unit.id,
          at: unit.at,
          reason: "DETECTION",
        },
      ]),
    );
    expect(frames.size).toBe(1);
    host.destroy();
    await destroyFade;
    expect(frames.size).toBe(0);
  });

  it("draws a transient accepted symbol for a resolved status that no longer has an attachment", async () => {
    let now = 0;
    vi.spyOn(window.performance, "now").mockImplementation(() => now);
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrame = 1;
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: vi.fn((callback: FrameRequestCallback) => {
        const id = nextFrame++;
        frames.set(id, callback);
        return id;
      }),
    });
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      value: vi.fn((id: number) => frames.delete(id)),
    });
    const roundRects = vi.fn();
    const context = new Proxy<Record<PropertyKey, unknown>>(
      { roundRect: roundRects },
      {
        get: (target, key) => (key in target ? target[key] : vi.fn()),
        set: (target, key, value) => {
          target[key] = value;
          return true;
        },
      },
    ) as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context,
    );
    const fixture = horseArcherPublicFixtureV7();
    const city = required(fixture.view.cities[0]);
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({ width: 800, height: 600 }),
    });
    document.body.append(container);
    const host = new CanvasBoardHostV7(document);
    host.mount(container, { onSelection: vi.fn(), onCommand: vi.fn() });
    host.update({
      matchInstanceId: 1,
      view: fixture.view,
      offeredCommands: [],
      interaction: {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      },
      interactive: false,
      motion: "FULL",
      animationSpeed: "NORMAL",
      presentationPaused: false,
      highContrast: false,
    });
    roundRects.mockClear();
    const presentation = host.presentBoundary(
      fixture.view,
      fixture.view,
      envelope(fixture.view, [
        {
          kind: "BLACKOUT_RECOVERY_COMPLETED",
          cityId: city.id,
          ownerId: city.ownerId,
        },
      ]),
    );
    now = 120;
    takeFrame(frames)(now);
    expect(roundRects).toHaveBeenCalled();
    host.finishPresentations();
    await presentation;
    host.destroy();
  });

  it("keeps a keyboard-moved tactical cursor inside the map band unobscured by the HUD and dock", () => {
    const cursorRects: Array<{
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    }> = [];
    const contextState: Record<PropertyKey, unknown> = {};
    const context = new Proxy(contextState, {
      get: (target, key) => {
        if (key === "strokeRect")
          return (x: number, y: number, width: number, height: number) => {
            if (target.strokeStyle === "#ffffff")
              cursorRects.push({ x, y, width, height });
          };
        return key in target ? target[key] : vi.fn();
      },
      set: (target, key, value) => {
        target[key] = value;
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context,
    );
    const fixture = horseArcherPublicFixtureV7();
    const shell = document.createElement("section");
    shell.className = "v7-app-shell";
    const hud = document.createElement("header");
    hud.className = "v7-match-hud";
    const container = document.createElement("div");
    const dock = document.createElement("aside");
    dock.className = "v7-selection-dock";
    let dockTop = 350;
    shell.append(hud, container, dock);
    document.body.append(shell);
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({ width: 800, height: 600 }),
    });
    Object.defineProperty(hud, "getBoundingClientRect", {
      value: () => ({ top: 0, bottom: 250, left: 0, right: 800 }),
    });
    Object.defineProperty(dock, "getBoundingClientRect", {
      value: () => ({ top: dockTop, bottom: 600, left: 0, right: 800 }),
    });

    const host = new CanvasBoardHostV7(document);
    host.mount(container, { onSelection: vi.fn(), onCommand: vi.fn() });
    const canvas = required(container.querySelector("canvas"));
    Object.defineProperty(canvas, "getBoundingClientRect", {
      value: () => ({
        width: 800,
        height: 600,
        top: 0,
        bottom: 600,
        left: 0,
        right: 800,
      }),
    });
    host.update({
      matchInstanceId: 1,
      view: fixture.view,
      offeredCommands: fixture.offeredCommands,
      interaction: {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      },
      interactive: true,
      motion: "REDUCED",
      animationSpeed: "NORMAL",
      presentationPaused: false,
      highContrast: false,
    });
    cursorRects.length = 0;
    for (let index = 0; index < fixture.view.board.height; index += 1)
      canvas.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );

    const cursor = required(cursorRects.at(-1));
    const cursorCenterY = cursor.y + cursor.height / 2;
    expect(cursorCenterY).toBeGreaterThanOrEqual(275);
    expect(cursorCenterY).toBeLessThanOrEqual(325);

    dockTop = 330;
    host.update({
      matchInstanceId: 1,
      view: fixture.view,
      offeredCommands: fixture.offeredCommands,
      interaction: {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      },
      interactive: true,
      motion: "REDUCED",
      animationSpeed: "NORMAL",
      presentationPaused: false,
      highContrast: false,
    });
    const passivelyRedrawnCursor = required(cursorRects.at(-1));
    expect(passivelyRedrawnCursor.y + passivelyRedrawnCursor.height / 2).toBe(
      cursorCenterY,
    );
    host.destroy();
  });
});

function envelope(
  view: PlayerViewV7,
  events: PlayerEventEnvelopeV7["events"],
): PlayerEventEnvelopeV7 {
  return {
    format: "pulp-wars-player-events",
    version: 7,
    viewerId: view.viewer.id,
    commandIndex: view.commandIndex,
    events,
  };
}

function targetKey(target: {
  readonly at: { readonly x: number; readonly y: number };
}): string {
  return `${target.at.x},${target.at.y}`;
}

function takeFrame(
  frames: Map<number, FrameRequestCallback>,
): FrameRequestCallback {
  const first = frames.entries().next().value as
    readonly [number, FrameRequestCallback] | undefined;
  if (first === undefined) throw new Error("Animation frame missing");
  frames.delete(first[0]);
  return first[1];
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error("Required tactical Canvas fixture value missing");
  return value;
}
