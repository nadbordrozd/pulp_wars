// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type PlayerEventEnvelopeV7,
  type PlayerViewV7,
  type UnitId,
} from "../../src/engine/index";
import {
  CanvasBoardHostV7,
  type BoardHostModelV7,
} from "../../src/render/canvas/board-host-v7";
import * as renderer from "../../src/render/canvas/board-renderer-v7";
import { checkedV7, exploredAllV7, initialV7 } from "../fixtures/v7-builders";

/**
 * Bead pulp_wars-2yc.62: during an enemy turn the board flickered as if
 * redrawn whole. It drew the game's latest view (ahead of the playback)
 * for a frame between two boundaries and when a boundary was queued, it
 * dimmed the whole map in the middle of every crossfade, and it built the
 * board plans of the same views again and again. The real board host here
 * plays an AI move, attack and capture (built with the engine from a
 * hand-placed state; no match is played) and counts what it rebuilds.
 */

type DrawInput = Parameters<typeof renderer.drawBoardV7>[0];

let clock = 0;
let frames: FrameRequestCallback[] = [];

beforeEach(() => {
  document.body.innerHTML = "";
  clock = 1000;
  frames = [];
  vi.spyOn(window.performance, "now").mockImplementation(() => clock);
  Object.defineProperty(window, "requestAnimationFrame", {
    configurable: true,
    value: vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    }),
  });
  Object.defineProperty(window, "cancelAnimationFrame", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

interface Recorded {
  readonly canvas: HTMLCanvasElement;
  readonly alphas: number[];
  readonly images: { readonly image: unknown; readonly alpha: number }[];
}

function rig() {
  const contexts = new Map<HTMLCanvasElement, Recorded>();
  const contextOf = new Map<CanvasRenderingContext2D, Recorded>();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    function (this: HTMLCanvasElement) {
      const recorded: Recorded = { canvas: this, alphas: [], images: [] };
      const target: Record<PropertyKey, unknown> = {
        canvas: this,
        globalAlpha: 1,
        drawImage: (image: unknown) =>
          recorded.images.push({
            image,
            alpha: target.globalAlpha as number,
          }),
      };
      const context = new Proxy(target, {
        get: (object, key) => (key in object ? object[key] : vi.fn()),
        set: (object, key, value) => {
          object[key] = value;
          if (key === "globalAlpha" && typeof value === "number")
            recorded.alphas.push(value);
          return true;
        },
      }) as unknown as CanvasRenderingContext2D;
      contexts.set(this, recorded);
      contextOf.set(context, recorded);
      return context;
    } as unknown as typeof HTMLCanvasElement.prototype.getContext,
  );
  const draws: { readonly input: DrawInput; readonly at: number }[] = [];
  vi.spyOn(renderer, "drawBoardV7").mockImplementation((input) => {
    draws.push({ input, at: clock });
  });
  // Every plan the host builds, and the view it was built for.
  const builds: { readonly view: PlayerViewV7; readonly plan: unknown }[] = [];
  const build = renderer.buildBoardRenderPlanV7;
  vi.spyOn(renderer, "buildBoardRenderPlanV7").mockImplementation((...args) => {
    const plan = build(...args);
    builds.push({ view: args[0], plan });
    return plan;
  });
  const container = document.createElement("div");
  Object.defineProperty(container, "getBoundingClientRect", {
    value: () => ({
      width: 1024,
      height: 640,
      left: 0,
      top: 0,
      right: 1024,
      bottom: 640,
    }),
  });
  document.body.append(container);
  const host = new CanvasBoardHostV7(document, {
    terrainSkeleton: () => null,
  });
  host.mount(container, { onSelection: vi.fn(), onCommand: vi.fn() });
  const board = container.querySelector("canvas.board-canvas-v7");
  if (!(board instanceof HTMLCanvasElement)) throw new Error("no board");
  // Every size given to the board's canvas from now on (each clears it).
  const resizes: string[] = [];
  for (const side of ["width", "height"] as const) {
    let value = board[side];
    Object.defineProperty(board, side, {
      configurable: true,
      get: () => value,
      set: (next: number) => {
        resizes.push(`${side}=${next}`);
        value = next;
      },
    });
  }
  const model = (
    view: PlayerViewV7,
    more: Partial<BoardHostModelV7> = {},
  ): BoardHostModelV7 => ({
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
    ...more,
  });
  /** Runs one batch of the frames asked for, 16 ms on. */
  const frame = (): boolean => {
    if (frames.length === 0) return false;
    const next = frames;
    frames = [];
    clock += 16;
    for (const callback of next) callback(clock);
    return true;
  };
  /** The view a drawn plan shows (by its entries, which a frame reuses). */
  const viewDrawn = (input: DrawInput): PlayerViewV7 | null => {
    for (const { view, plan } of [...builds].reverse()) {
      const entries = (plan as renderer.BoardRenderPlanV7).entries;
      const known = new Set<unknown>(entries);
      if (input.plan.entries.some((entry) => known.has(entry))) return view;
    }
    return null;
  };
  return {
    host,
    board,
    container,
    model,
    draws,
    builds,
    resizes,
    frame,
    viewDrawn,
    recorded: (canvas: HTMLCanvasElement) => contexts.get(canvas),
    recordedContext: (context: CanvasRenderingContext2D) =>
      contextOf.get(context),
  };
}

interface Boundary {
  readonly before: PlayerViewV7;
  readonly after: PlayerViewV7;
  readonly envelope: PlayerEventEnvelopeV7;
}

/**
 * An AI seat's move, attack and capture in a row, next to the viewer's
 * capital (so the viewer sees each), seen by the viewer.
 */
function aiTurn(): {
  readonly start: PlayerViewV7;
  readonly move: Boundary;
  readonly attack: Boundary;
  readonly capture: Boundary;
} {
  let state = exploredAllV7(initialV7(1_532));
  const human = state.humanPlayerId;
  const ai = state.turnOrder.find((id) => id !== human);
  const capital = state.cities.find(
    (city) => city.ownerId === human && city.isCapital,
  );
  const template = state.units.find((unit) => unit.ownerId === ai);
  const defender = state.units.find((unit) => unit.ownerId === human);
  if (
    ai === undefined ||
    capital === undefined ||
    template === undefined ||
    defender === undefined
  )
    throw new Error("fixture seats missing");
  // The capital's neighbours become open grass.
  const ring = [-1, 0, 1]
    .flatMap((dy) =>
      [-1, 0, 1].map((dx) => ({ x: capital.at.x + dx, y: capital.at.y + dy })),
    )
    .filter(
      (cell) =>
        !same(cell, capital.at) &&
        state.board.tiles.some(
          (tile) => same(tile.at, cell) && tile.territoryCityId === capital.id,
        ),
    );
  state = checkedV7({
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        ring.some((cell) => same(cell, tile.at))
          ? {
              ...tile,
              terrain: "GRASS",
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
              site: null,
            }
          : tile,
      ),
    },
  });
  const adjacent = (left: CoordV7, right: CoordV7): boolean =>
    !same(left, right) &&
    Math.abs(left.x - right.x) <= 1 &&
    Math.abs(left.y - right.y) <= 1;
  // A unit that walks a tile, and an attacker with its target, apart.
  const cells = ring
    .flatMap((walkerAt) =>
      ring
        .filter((toAt) => adjacent(walkerAt, toAt))
        .flatMap((toAt) =>
          ring
            .filter(
              (attackerAt) =>
                !same(attackerAt, walkerAt) && !same(attackerAt, toAt),
            )
            .flatMap((attackerAt) =>
              ring
                .filter(
                  (targetAt) =>
                    adjacent(attackerAt, targetAt) &&
                    !same(targetAt, walkerAt) &&
                    !same(targetAt, toAt),
                )
                .map((targetAt) => ({ walkerAt, toAt, attackerAt, targetAt })),
            ),
        ),
    )
    .at(0);
  if (cells === undefined) throw new Error("no room by the capital");
  const taken = [...ring, capital.at];
  const fresh = (id: number, at: CoordV7) => ({
    ...template,
    id: id as UnitId,
    at,
    hp: template.maxHp,
    captureEligible: true,
  });
  const first = state.nextEntityId;
  state = checkedV7({
    ...state,
    activeSeatIndex: state.turnOrder.indexOf(ai),
    nextEntityId: first + 3,
    units: [
      ...state.units.filter(
        (unit) =>
          unit.id !== defender.id && !taken.some((cell) => same(cell, unit.at)),
      ),
      { ...defender, at: cells.targetAt },
      fresh(first, cells.walkerAt),
      fresh(first + 1, cells.attackerAt),
      fresh(first + 2, capital.at),
    ].sort((left, right) => left.id - right.id),
  });
  const start = viewForV7(state, human);
  let shown = start;
  const play = (pick: (command: CommandV7) => boolean): Boundary => {
    const command = queryPlayerCommandsV7(viewForV7(state, ai)).find(pick);
    if (command === undefined) throw new Error("AI command missing");
    const result = applyCommandV7(state, ai, command);
    if (!result.accepted) throw new Error(result.error.code);
    const before = shown;
    const after = viewForV7(result.state, human);
    const envelope = projectEventsV7(state, result.state, human, result.events);
    state = result.state;
    shown = after;
    return { before, after, envelope };
  };
  const move = play(
    (command) =>
      command.kind === "MOVE" &&
      command.unitId === first &&
      command.path.length === 1 &&
      same(command.path[0] ?? cells.walkerAt, cells.toAt),
  );
  const attack = play(
    (command) =>
      command.kind === "ATTACK" &&
      command.unitId === first + 1 &&
      command.targetUnitId === defender.id,
  );
  const capture = play(
    (command) => command.kind === "CAPTURE" && command.unitId === first + 2,
  );
  return { start, move, attack, capture };
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}

describe("Board redraws (pulp_wars-2yc.62)", () => {
  it("builds no plan, and never resizes or remounts the canvas, for a view update with the same board", () => {
    const { start } = aiTurn();
    const { host, board, container, model, builds, resizes, draws } = rig();
    host.update(model(start));
    const built = builds.length;
    const drawn = draws.length;
    // Another snapshot of the same board: new empty command lists and an
    // equal interaction, as each game snapshot brings.
    host.update(model(start, { offeredCommands: [] }));
    host.update(
      model(start, {
        offeredCommands: [],
        interaction: {
          selection: null,
          selectedUnitId: null,
          selectedAchievement: null,
        },
      }),
    );
    expect(draws.length).toBe(drawn + 2);
    expect(builds.length).toBe(built);
    expect(resizes).toEqual([]);
    expect(container.querySelector("canvas.board-canvas-v7")).toBe(board);
    host.destroy();
  });

  it("builds one plan for each AI move, attack and capture, never resizes the canvas, and never shows the game's view ahead of the playback", async () => {
    const turn = aiTurn();
    const boundaries = [turn.move, turn.attack, turn.capture];
    const { host, model, builds, resizes, draws, frame, viewDrawn } = rig();
    host.update(model(turn.start));
    const queue: Boundary[] = [];
    const builtPer: number[] = [];
    const ahead: string[] = [];
    let playing: Boundary | null = null;
    /** The last draw before each frame: what the player sees. */
    const checkShown = (): void => {
      const last = draws.at(-1);
      if (last === undefined || playing === null) return;
      const view = viewDrawn(last.input);
      if (view !== null && view.commandIndex > playing.after.commandIndex)
        ahead.push(`${view.commandIndex} over ${playing.after.commandIndex}`);
    };
    for (const [index, boundary] of boundaries.entries()) {
      const built = builds.length;
      // The first command is accepted while the board is idle, the others
      // while it plays the first, as the app's pacing lets the AI run up
      // to three commands ahead: the game's view is updated at once.
      if (index === 0) {
        queue.push(boundary);
        host.update(model(boundary.after));
      }
      queue.shift();
      playing = boundary;
      const presentation = host.presentBoundary(
        boundary.before,
        boundary.after,
        boundary.envelope,
        { holdResult: () => queue.length > 0 },
      );
      checkShown();
      if (index === 0)
        for (const later of boundaries.slice(1)) {
          frame();
          checkShown();
          queue.push(later);
          host.update(model(later.after));
          checkShown();
        }
      let done = false;
      void presentation.then(() => {
        done = true;
      });
      // Frames until the boundary has played (each step asks for its first
      // frame once the step before has resolved).
      for (let count = 0; count < 2000 && !done; count += 1) {
        if (frame()) checkShown();
        await Promise.resolve();
      }
      await presentation;
      checkShown();
      builtPer.push(builds.length - built);
    }
    // One new plan per command: its result's. The view before is the one
    // the board shows already.
    expect(builtPer).toEqual([1, 1, 1]);
    expect(resizes).toEqual([]);
    expect(ahead).toEqual([]);
    // The last boundary hands the board back to the game's view.
    expect(viewDrawn(draws.at(-1)?.input as DrawInput)).toBe(
      turn.capture.after,
    );
    host.destroy();
  });

  it("does not show a boundary's result before it plays when the board was idle", () => {
    const turn = aiTurn();
    const { host, model, draws, viewDrawn } = rig();
    host.update(model(turn.start));
    // The command is accepted while nothing plays: the game's view is drawn
    // at once, and the boundary starts in the same task.
    host.update(model(turn.move.after));
    void host.presentBoundary(
      turn.move.before,
      turn.move.after,
      turn.move.envelope,
    );
    // Before any frame: the board shows the view before the move.
    expect(viewDrawn(draws.at(-1)?.input as DrawInput)).toBe(turn.move.before);
    host.destroy();
  });

  it("crossfades only what changes: the view before whole, the view after laid over it", async () => {
    const turn = aiTurn();
    const { host, board, model, draws, frame, recorded, recordedContext } =
      rig();
    host.update(model(turn.move.after, { motion: "REDUCED" }));
    const from = draws.length;
    const presentation = host.presentBoundary(
      turn.move.before,
      turn.move.after,
      turn.move.envelope,
    );
    const faded: number[] = [];
    for (let count = 0; count < 60 && frame(); count += 1) {
      const main = recorded(board);
      const laid = main?.images.at(-1);
      if (laid !== undefined && laid.alpha > 0 && laid.alpha < 1)
        faded.push(laid.alpha);
    }
    await presentation;
    const fadeDraws = draws.slice(from);
    // No board was ever drawn half faded over the background.
    expect(fadeDraws.every(({ input }) => input.sceneAlpha === 1)).toBe(true);
    // The view after was drawn whole on a canvas of its own and laid over
    // the board at the crossfade's progress.
    const layers = fadeDraws
      .map(({ input }) => recordedContext(input.context))
      .filter((context) => context !== undefined && context.canvas !== board);
    expect(layers.length).toBeGreaterThan(0);
    expect(faded.length).toBeGreaterThan(0);
    expect(
      recorded(board)?.images.some((laid) => laid.image === layers[0]?.canvas),
    ).toBe(true);
    host.destroy();
  });
});
