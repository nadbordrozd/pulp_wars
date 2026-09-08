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
import {
  defectionPublicFixtureV7,
  pursuitPublicFixtureV7,
} from "../fixtures/ruleset7-tactical-ui";

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
            statusId: "ui-status-defection-waiting",
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

  it("renders deduplicated tactical targets, reach, links, and non-overlapping registry attachments", () => {
    const defection = defectionPublicFixtureV7(true);
    const envoy = required(
      defection.view.units.find(
        (unit) =>
          unit.ownerId === defection.view.viewer.id && unit.role === "ENVOY",
      ),
    );
    const target = required(
      defection.view.units.find((unit) => unit.ownerId !== envoy.ownerId),
    );
    const fullView: PlayerViewV7 = {
      ...defection.view,
      units: defection.view.units.map((unit) =>
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
                      round: { known: true, value: defection.view.round + 1 },
                    },
                  },
                ],
              },
            }
          : unit,
      ),
      defectionStatuses: [
        {
          visibility: "FULL",
          markId: 19,
          sourceUnitId: envoy.id,
          targetUnitId: target.id,
          initiatingPlayerId: envoy.ownerId,
          targetOwnerId: target.ownerId,
          reservedHomeCityId: required(defection.view.cities[0]).id,
          phase: "WAITING_FOR_REPLY",
        },
      ],
    };
    const targetPlan = buildBoardRenderPlanV7(
      defection.view,
      defection.offeredCommands,
      {
        selection: { kind: "UNIT", unitId: envoy.id },
        selectedUnitId: envoy.id,
        selectedAchievement: null,
        tacticalTargetMode: { kind: "DEFECTION", sourceUnitId: envoy.id },
      },
    );
    expect(
      targetPlan.targets.filter((entry) => entry.family === "DEFECTION"),
    ).toHaveLength(1);
    const plan = buildBoardRenderPlanV7(fullView, [], {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    });
    expect(plan.entries.filter((entry) => entry.kind === "LINK")).toHaveLength(
      1,
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
        "ui-status-defection-waiting",
      ]),
    );
    expect(
      coLocated
        .map((entry) => entry.attachmentSlot)
        .sort((left, right) => (left ?? 0) - (right ?? 0)),
    ).toEqual([0, 1, 2, 3]);

    const pursuit = pursuitPublicFixtureV7();
    const endPursuit = pursuit.offeredCommands.find(
      (command) => command.kind === "END_PURSUIT",
    );
    if (endPursuit?.kind !== "END_PURSUIT")
      throw new Error("Pursuit fixture missing global end command");
    const pursuingUnitId = endPursuit.unitId;
    const twoCellPursue = pursuit.offeredCommands.find(
      (command) => command.kind === "PURSUE" && command.path.length === 2,
    );
    if (twoCellPursue?.kind !== "PURSUE")
      throw new Error("Two-cell Pursue fixture missing");
    const pursuitDestination = required(twoCellPursue.path.at(-1));
    const pursuitPlan = buildBoardRenderPlanV7(
      pursuit.view,
      pursuit.offeredCommands,
      {
        selection: { kind: "UNIT", unitId: pursuingUnitId },
        selectedUnitId: pursuingUnitId,
        selectedAchievement: null,
        cursor: pursuitDestination,
      },
    );
    expect(new Set(pursuitPlan.targets.map(targetKey)).size).toBe(
      pursuitPlan.targets.length,
    );
    expect(pursuitPlan.entries.some((entry) => entry.kind === "REACH")).toBe(
      true,
    );
    const focusedPath = pursuitPlan.entries.filter((entry) =>
      entry.key.startsWith("pursuit-path:"),
    );
    expect(focusedPath).toHaveLength(1);
    const focusedStep = required(focusedPath[0]);
    const targetUnderStep = required(
      pursuitPlan.entries.find(
        (entry) =>
          entry.kind === "TARGET" &&
          entry.at.x === focusedStep.at.x &&
          entry.at.y === focusedStep.at.y,
      ),
    );
    expect(focusedStep.layer).toBeGreaterThan(targetUnderStep.layer);
    expect(
      pursuitPlan.targets.find(
        (target) =>
          target.family === "PURSUIT" &&
          target.at.x === pursuitDestination.x &&
          target.at.y === pursuitDestination.y,
      )?.semanticLabel,
    ).toContain("Pursue 2 cells");
  });

  it("coalesces visibility fades and never reconstructs stale tactical coordinates", () => {
    const fixture = defectionPublicFixtureV7(false);
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
          kind: "DEFECTION_ENDPOINT_STATUS",
          unitId: unit.id,
          phase: "ARMED",
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
    const fixture = defectionPublicFixtureV7(false);
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
          kind: "DEFECTION_ENDPOINT_STATUS",
          unitId: unit.id,
          phase: "ARMED",
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
    const arcs = vi.fn();
    const context = new Proxy<Record<PropertyKey, unknown>>(
      { arc: arcs },
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
    const fixture = defectionPublicFixtureV7(false);
    const source = required(
      fixture.view.units.find(
        (unit) => unit.ownerId === fixture.view.viewer.id,
      ),
    );
    const target = required(
      fixture.view.units.find(
        (unit) => unit.ownerId !== fixture.view.viewer.id,
      ),
    );
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
    arcs.mockClear();
    const presentation = host.presentBoundary(
      fixture.view,
      fixture.view,
      envelope(fixture.view, [
        {
          kind: "DEFECTION_RESOLVED",
          markId: 91,
          sourceUnitId: source.id,
          targetUnitId: target.id,
          fromPlayerId: target.ownerId,
          toPlayerId: source.ownerId,
          homeCityId: required(fixture.view.cities[0]).id,
          at: target.at,
        },
      ]),
    );
    now = 120;
    takeFrame(frames)(now);
    expect(arcs).toHaveBeenCalled();
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
    const fixture = pursuitPublicFixtureV7();
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
