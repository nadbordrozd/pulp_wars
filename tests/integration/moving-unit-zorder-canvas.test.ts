// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerEventEnvelopeV7,
  type PlayerEventV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import { CanvasBoardHostV7 } from "../../src/render/canvas/board-host-v7";
import type * as BoardRendererModule from "../../src/render/canvas/board-renderer-v7";
import { DWARF_UI_V7, dwarfUiFixtureV7 } from "../fixtures/v7-dwarf-ui";
import {
  DINOSAUR_SHOWCASE_V7,
  dinosaurShowcaseFixtureV7,
} from "../fixtures/v7-dinosaur-ui";

/**
 * Bead pulp_wars-2yc.116: on the real board host, a unit that slides,
 * walks or waits off its plan cell (a Knockback, a Charge! push, a Tractor
 * Beam pull, a reward unit's displacement, a gate's shove, a walk) is drawn
 * after the ground, Mountain and Ore of every cell it overlaps, on every
 * frame. The plan each frame hands the renderer is recorded; the renderer
 * draws a plan's entries in order (moving-unit-order-render-v7.test.ts).
 */

interface RecordedEntry {
  readonly kind: string;
  readonly key: string;
  readonly layer: number;
  readonly at: CoordV7;
}

const recorded = vi.hoisted(() => ({
  frames: [] as (readonly RecordedEntry[])[],
}));

vi.mock("../../src/render/canvas/board-renderer-v7", async (importOriginal) => {
  const actual = await importOriginal<typeof BoardRendererModule>();
  return {
    ...actual,
    drawBoardV7: (input: Parameters<typeof actual.drawBoardV7>[0]) => {
      recorded.frames.push(
        input.plan.entries.map(({ kind, key, layer, at }) => ({
          kind,
          key,
          layer,
          at,
        })),
      );
      actual.drawBoardV7(input);
    },
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
  recorded.frames = [];
});

function unitIdAt(state: GameStateV7, at: CoordV7): number {
  const unit = state.units.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (unit === undefined) throw new Error(`no unit at ${at.x},${at.y}`);
  return unit.id;
}

/** `view` with every cell of `cells` an explored Mountain with Ore. */
function oreMountains(
  view: PlayerViewV7,
  cells: readonly CoordV7[],
): PlayerViewV7 {
  const keys = new Set(cells.map((cell) => `${cell.x},${cell.y}`));
  return {
    ...view,
    board: {
      ...view.board,
      tiles: view.board.tiles.map((tile) =>
        tile.explored && keys.has(`${tile.at.x},${tile.at.y}`)
          ? { ...tile, terrain: "MOUNTAIN", resource: "ORE", improvement: null }
          : tile,
      ),
    },
  };
}

interface Boundary {
  readonly before: PlayerViewV7;
  readonly after: PlayerViewV7;
  readonly envelope: PlayerEventEnvelopeV7;
}

/** A command played by the engine, seen by its player. */
function played(
  state: GameStateV7,
  find: (command: CommandV7) => boolean,
): Boundary {
  const viewer = state.humanPlayerId;
  const command = queryPlayerCommandsV7(viewForV7(state, viewer)).find(find);
  if (command === undefined) throw new Error("command not offered");
  const result = applyCommandV7(state, viewer, command);
  if (!result.accepted) throw new Error(result.error.code);
  return {
    before: viewForV7(state, viewer),
    after: viewForV7(result.state, viewer),
    envelope: projectEventsV7(state, result.state, viewer, result.events),
  };
}

/** A hand-built boundary: `event` moves `unitId` to `to`. */
function handBuilt(
  state: GameStateV7,
  unitId: number,
  to: CoordV7,
  event: PlayerEventV7,
): Boundary {
  const viewer = state.humanPlayerId;
  const before = viewForV7(state, viewer);
  return {
    before,
    after: {
      ...before,
      units: before.units.map((unit) =>
        unit.id === unitId ? { ...unit, at: to } : unit,
      ),
    },
    envelope: {
      format: "pulp-wars-player-events",
      version: 7,
      viewerId: viewer,
      commandIndex: 0,
      events: [event],
    },
  };
}

function mountHost(view: PlayerViewV7) {
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
  const target: Record<PropertyKey, unknown> = {};
  const context = new Proxy(target, {
    get: (object, key) => (key in object ? object[key] : vi.fn()),
    set: (object, key, value) => {
      object[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
  const container = document.createElement("div");
  Object.defineProperty(container, "getBoundingClientRect", {
    value: () => ({
      width: 1200,
      height: 900,
      left: 0,
      top: 0,
      right: 1200,
      bottom: 900,
    }),
  });
  document.body.append(container);
  const host = new CanvasBoardHostV7(document);
  host.mount(container, { onSelection: vi.fn(), onCommand: vi.fn() });
  host.update({
    matchInstanceId: 1,
    view,
    offeredCommands: [],
    interactive: false,
    motion: "FULL",
    animationSpeed: "NORMAL",
    presentationPaused: false,
    highContrast: false,
    interaction: {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    },
  });
  return {
    host,
    async step(ms: number): Promise<void> {
      now += ms;
      const waiting = [...frames.values()];
      frames.clear();
      for (const callback of waiting) callback(now);
      for (let flush = 0; flush < 8; flush += 1) await Promise.resolve();
    },
  };
}

/** Plays `boundary` over Ore Mountains on `cells`, 16 ms a frame. */
async function playOverOre(
  boundary: Boundary,
  cells: readonly CoordV7[],
): Promise<readonly (readonly RecordedEntry[])[]> {
  const before = oreMountains(boundary.before, cells);
  const after = oreMountains(boundary.after, cells);
  const scene = mountHost(after);
  recorded.frames = [];
  let finished = false;
  void scene.host.presentBoundary(before, after, boundary.envelope).then(() => {
    finished = true;
  });
  for (let elapsed = 0; !finished && elapsed < 8_000; elapsed += 16)
    await scene.step(16);
  expect(finished).toBe(true);
  scene.host.destroy();
  return recorded.frames;
}

const isWhole = (value: number): boolean =>
  Math.abs(value - Math.round(value)) < 1e-6;

/** The cells a unit drawn at `at` overlaps. */
function overlapped(at: CoordV7): readonly string[] {
  const cells: string[] = [];
  for (let y = Math.floor(at.y); y <= Math.ceil(at.y); y += 1)
    for (let x = Math.floor(at.x); x <= Math.ceil(at.x); x += 1)
      cells.push(`${x},${y}`);
  return cells;
}

/**
 * Every frame: no ground, Mountain, Ore, Road or building (layer under a
 * unit's) of a cell a unit overlaps is drawn after that unit.
 */
function expectUnitsOverTheirCells(
  frames: readonly (readonly RecordedEntry[])[],
): void {
  for (const [frame, entries] of frames.entries()) {
    const decorationIndex = new Map<string, number>();
    entries.forEach((entry, index) => {
      if (entry.kind !== "UNIT" && entry.layer < 5)
        decorationIndex.set(`${entry.at.x},${entry.at.y}`, index);
    });
    entries.forEach((entry, index) => {
      if (entry.kind !== "UNIT") return;
      for (const cell of overlapped(entry.at)) {
        const last = decorationIndex.get(cell) ?? -1;
        expect(
          last,
          `frame ${frame}: ${entry.key} at ${entry.at.x},${entry.at.y} is drawn before cell ${cell}`,
        ).toBeLessThan(index);
      }
    });
  }
}

/** The positions `unitKey` was drawn at, off its cells, in frame order. */
function midway(
  frames: readonly (readonly RecordedEntry[])[],
  unitKey: string,
): readonly CoordV7[] {
  return frames.flatMap((entries) =>
    entries
      .filter(
        (entry) =>
          entry.key === unitKey &&
          (!isWhole(entry.at.x) || !isWhole(entry.at.y)),
      )
      .map((entry) => entry.at),
  );
}

describe("A unit moved off its cell is drawn over the Ore Mountains it overlaps", () => {
  it("slides a Steam Cannon's Knockback target off and onto Ore (and waits on it while the shot flies)", async () => {
    const at = DWARF_UI_V7;
    const state = dwarfUiFixtureV7();
    const targetId = unitIdAt(state, at.knockTarget);
    const boundary = played(
      state,
      (command) =>
        command.kind === "ATTACK" &&
        command.unitId === unitIdAt(state, at.cannon) &&
        command.targetUnitId === targetId,
    );
    const frames = await playOverOre(boundary, [at.knockTarget, at.knockTo]);
    // The target slid left, between its two cells.
    const slide = midway(frames, `unit:${targetId}`);
    expect(slide.length).toBeGreaterThan(2);
    for (const point of slide) {
      expect(point.y).toBe(at.knockTo.y);
      expect(point.x).toBeGreaterThan(at.knockTo.x);
      expect(point.x).toBeLessThan(at.knockTarget.x);
    }
    // While the shot flies it is held on its first cell (the plan places
    // it on the second).
    expect(
      frames.some((entries) =>
        entries.some(
          (entry) =>
            entry.key === `unit:${targetId}` &&
            entry.at.x === at.knockTarget.x &&
            entry.at.y === at.knockTarget.y,
        ),
      ),
    ).toBe(true);
    expectUnitsOverTheirCells(frames);
  });

  it("slides a Charge!'s pushed unit and the following Triceratops over Ore", async () => {
    const at = DINOSAUR_SHOWCASE_V7;
    const start = dinosaurShowcaseFixtureV7();
    const run = applyCommandV7(start, start.humanPlayerId, {
      kind: "MOVE",
      unitId: unitIdAt(start, at.triceratops) as never,
      path: [at.laneCaveman, at.chargeFrom],
    });
    if (!run.accepted) throw new Error(run.error.code);
    const state = run.state;
    const pushedId = unitIdAt(state, at.pushTarget);
    const boundary = played(
      state,
      (command) =>
        command.kind === "ATTACK" &&
        command.unitId === unitIdAt(state, at.chargeFrom) &&
        command.targetUnitId === pushedId,
    );
    const frames = await playOverOre(boundary, [
      at.chargeFrom,
      at.pushTarget,
      { x: at.pushTarget.x + 1, y: at.pushTarget.y },
    ]);
    expect(midway(frames, `unit:${pushedId}`).length).toBeGreaterThan(2);
    expectUnitsOverTheirCells(frames);
  });

  it("pulls a unit up through two Ore Mountains with a Heavy Tractor Beam", async () => {
    const state = dwarfUiFixtureV7();
    const from = DWARF_UI_V7.bombTarget;
    const path = [
      { x: from.x, y: from.y - 1 },
      { x: from.x, y: from.y - 2 },
    ];
    const targetId = unitIdAt(state, from);
    const boundary = handBuilt(state, targetId, path[1] as CoordV7, {
      kind: "UNIT_PULLED",
      sourceUnitId: unitIdAt(state, DWARF_UI_V7.gyrocopter) as never,
      targetUnitId: targetId as never,
      from,
      to: path[1] as CoordV7,
      path,
    });
    const frames = await playOverOre(boundary, [from, ...path]);
    const pull = midway(frames, `unit:${targetId}`);
    // Through both tiles, the first one crossed midway.
    expect(pull.some((point) => point.y > from.y - 1)).toBe(true);
    expect(pull.some((point) => point.y < from.y - 1)).toBe(true);
    expectUnitsOverTheirCells(frames);
  });

  it("shoves the unit on a city centre aside for a reward unit, diagonally off Ore", async () => {
    const state = dwarfUiFixtureV7();
    const from = DWARF_UI_V7.gunner;
    const to = { x: from.x - 1, y: from.y - 1 };
    const displacedId = unitIdAt(state, from);
    const city = state.cities[0];
    if (city === undefined) throw new Error("no city");
    const boundary = handBuilt(state, displacedId, to, {
      kind: "UNIT_SPAWN_DISPLACED",
      playerId: state.humanPlayerId,
      cityId: city.id,
      spawnedUnitId: unitIdAt(state, DWARF_UI_V7.titan) as never,
      displacedUnitId: displacedId as never,
      from,
      to,
    });
    const frames = await playOverOre(boundary, [
      from,
      to,
      { x: from.x, y: to.y },
      { x: to.x, y: from.y },
    ]);
    expect(midway(frames, `unit:${displacedId}`).length).toBeGreaterThan(2);
    expectUnitsOverTheirCells(frames);
  });

  it("shoves a gate's occupant left off Ore, and walks a unit up off Ore", async () => {
    const state = dwarfUiFixtureV7();
    const gate = DWARF_UI_V7.woundedHammerer;
    const shoved = { x: gate.x - 1, y: gate.y };
    const occupantId = unitIdAt(state, gate);
    const shove = await playOverOre(
      handBuilt(state, occupantId, shoved, {
        kind: "GATE_DISPLACED",
        unitId: occupantId as never,
        from: gate,
        to: shoved,
      }),
      [gate, shoved],
    );
    expect(midway(shove, `unit:${occupantId}`).length).toBeGreaterThan(2);
    expectUnitsOverTheirCells(shove);
    const walker = DWARF_UI_V7.dugInHammerer;
    const step = { x: walker.x, y: walker.y - 1 };
    const walkerId = unitIdAt(state, walker);
    const walk = await playOverOre(
      handBuilt(state, walkerId, step, {
        kind: "UNIT_MOVED",
        unitId: walkerId as never,
        path: [step],
      }),
      [walker, step],
    );
    expect(midway(walk, `unit:${walkerId}`).length).toBeGreaterThan(2);
    expectUnitsOverTheirCells(walk);
  });
});
