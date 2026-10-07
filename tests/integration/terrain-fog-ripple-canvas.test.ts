// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAP_GENERATION_REVISION_V7,
  RULESET_7_ID,
  createPlayableGameV7,
  viewForV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  CanvasBoardHostV7,
  type BoardHostModelV7,
} from "../../src/render/canvas/board-host-v7";
import * as renderer from "../../src/render/canvas/board-renderer-v7";
import { terrainSkeletonOfRowsV7 } from "../../src/render/canvas/terrain-at-fog-v7";
import { TERRAIN_RIPPLE_V7 } from "../../src/render/canvas/terrain-ripple-v7";

/**
 * pulp_wars-2yc.28: the board host gives a plan its ghosts
 * (docs/art/TERRAIN_AT_THE_FOG.md) and runs the territory ripple
 * (docs/art/TERRITORY_RIPPLE.md) on its own frames.
 */

type DrawInput = Parameters<typeof renderer.drawBoardV7>[0];

let clock = 0;
let frames: FrameRequestCallback[] = [];

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.history.replaceState(null, "", "/");
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
  window.history.replaceState(null, "", "/");
});

function game(): PlayerViewV7 {
  const created = createPlayableGameV7({
    rulesetId: RULESET_7_ID,
    seed: 4242,
    width: 16,
    height: 16,
    aiCount: 2,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: ["GOBLIN", "ORIGINAL", "UNDEAD"],
    mapType: "CONTINENTS",
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    curiosities: false,
  });
  if (!created.ok) throw new Error(created.error.code);
  return viewForV7(created.state, created.state.humanPlayerId);
}

function rig(options: ConstructorParameters<typeof CanvasBoardHostV7>[1] = {}) {
  const draws: DrawInput[] = [];
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    clearRect: vi.fn(),
    setTransform: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(renderer, "drawBoardV7").mockImplementation((input) => {
    draws.push(input);
  });
  const container = document.createElement("div");
  document.body.replaceChildren(container);
  const host = new CanvasBoardHostV7(document, options);
  host.mount(container, { onSelection: vi.fn(), onCommand: vi.fn() });
  const model = (
    view: PlayerViewV7,
    more: Partial<BoardHostModelV7> = {},
  ): BoardHostModelV7 => ({
    matchInstanceId: 1,
    view,
    offeredCommands: [],
    // Not the viewer's turn: nothing else asks for frames.
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
    artSet: "CHIBI",
    ...more,
  });
  /** Runs the frames asked for, 16 ms apart, until none is asked for. */
  const run = (limit = 400): number => {
    let ran = 0;
    while (frames.length > 0 && ran < limit) {
      const next = frames;
      frames = [];
      clock += 16;
      for (const frame of next) frame(clock);
      ran += 1;
    }
    return ran;
  };
  const last = (): DrawInput => {
    const input = draws.at(-1);
    if (input === undefined) throw new Error("no draw");
    return input;
  };
  return { host, model, draws, run, last };
}

/** `view` a command later, with the viewer's land given to another seat. */
function captured(view: PlayerViewV7): {
  readonly after: PlayerViewV7;
  readonly cells: string[];
} {
  const other = view.players.find((player) => player.id !== view.viewer.id);
  if (other === undefined) throw new Error("no other seat");
  const cells: string[] = [];
  const after: PlayerViewV7 = {
    ...view,
    commandIndex: view.commandIndex + 1,
    board: {
      ...view.board,
      tiles: view.board.tiles.map((tile) => {
        if (!tile.explored || tile.territoryOwnerId !== view.viewer.id)
          return tile;
        cells.push(`${tile.at.x},${tile.at.y}`);
        return { ...tile, territoryOwnerId: other.id };
      }),
    },
  };
  return { after, cells };
}

const ownersOf = (input: DrawInput, cells: readonly string[]): unknown[] =>
  input.plan.entries
    .filter(
      (entry) =>
        entry.kind === "TERRAIN" &&
        cells.includes(`${entry.at.x},${entry.at.y}`),
    )
    .map((entry) => entry.ownerId);

describe("the board host and the ghosts", () => {
  it("gives a real match's plan the hidden Forest and Mountain of its own map", () => {
    const view = game();
    const { host, model, last } = rig();
    const shown = model(view);
    host.update(shown);
    const ghosts = last().plan.ghosts ?? [];
    expect(ghosts.length).toBeGreaterThan(0);
    const explored = new Set(
      view.board.tiles
        .filter((tile) => tile.explored)
        .map((tile) => `${tile.at.x},${tile.at.y}`),
    );
    for (const ghost of ghosts)
      expect(explored.has(`${ghost.at.x},${ghost.at.y}`)).toBe(false);
    // Ghosts are not entries.
    expect(
      last().plan.entries.some(
        (entry) => (entry as { ghost?: boolean }).ghost === true,
      ),
    ).toBe(false);
    // The same plan, ghosts and all, for the next draw of the same view.
    const plan = last().plan;
    host.update(shown);
    expect(last().plan).toBe(plan);
  });

  it("gives none to the LEGACY art set, with the switch off, or without a skeleton", () => {
    const view = game();
    const legacy = rig();
    legacy.host.update(legacy.model(view, { artSet: "LEGACY" }));
    expect(legacy.last().plan.ghosts).toBeUndefined();
    const none = rig({ terrainSkeleton: () => null });
    none.host.update(none.model(view));
    expect(none.last().plan.ghosts).toBeUndefined();
    window.history.replaceState(null, "", "/?fog-terrain=0");
    const off = rig();
    off.host.update(off.model(view));
    expect(off.last().plan.ghosts).toBeUndefined();
  });

  it("takes a skeleton from the caller for a board built by hand", () => {
    const view = game();
    const rows = Array.from({ length: 16 }, () => "f".repeat(16));
    const { host, model, last } = rig({
      terrainSkeleton: () => terrainSkeletonOfRowsV7(rows),
    });
    host.update(model(view));
    const hidden = view.board.tiles.filter((tile) => !tile.explored).length;
    expect(last().plan.ghosts).toHaveLength(hidden);
  });
});

/** A generated match with one Rift: horizontal (Pangea) or vertical. */
function riftGame(mapType: "PANGEA" | "DRY_LAND") {
  const created = createPlayableGameV7({
    rulesetId: RULESET_7_ID,
    seed: 5,
    width: 16,
    height: 16,
    aiCount: 2,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: ["GOBLIN", "ORIGINAL", "UNDEAD"],
    mapType,
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    curiosities: false,
  });
  if (!created.ok) throw new Error(created.error.code);
  const state = created.state;
  const rift = state.board.tiles
    .filter((tile) => tile.terrain === "RIFT")
    .map((tile) => tile.at);
  const start =
    state.players.find((player) => player.id === state.humanPlayerId)
      ?.explored ?? [];
  /** The view with the start's cells and these cells of the Rift explored. */
  const seeing = (mask: readonly boolean[]): PlayerViewV7 => {
    const cells = new Map(
      [...start, ...rift.filter((_, index) => mask[index] === true)].map(
        (at) => [`${at.x},${at.y}`, at] as const,
      ),
    );
    for (const [index, at] of rift.entries())
      if (mask[index] !== true) cells.delete(`${at.x},${at.y}`);
    return viewForV7(
      {
        ...state,
        players: state.players.map((player) =>
          player.id === state.humanPlayerId
            ? { ...player, explored: [...cells.values()] }
            : player,
        ),
      },
      state.humanPlayerId,
    );
  };
  return { rift, seeing };
}

const riftPieces = (
  input: DrawInput,
  rift: readonly { readonly x: number; readonly y: number }[],
): (string | null)[] =>
  rift.map(
    (at) =>
      input.plan.entries.find(
        (entry) =>
          entry.kind === "TERRAIN" &&
          entry.at.x === at.x &&
          entry.at.y === at.y,
      )?.riftPiece ?? null,
  );

const RIFT_MASKS = [
  [true, false, false],
  [false, true, false],
  [false, false, true],
  [true, true, false],
  [false, true, true],
  [true, false, true],
] as const;

describe("the board host and a Rift half in the fog (pulp_wars-2yc.37)", () => {
  for (const [mapType, whole] of [
    ["PANGEA", ["H_WEST", "H_MIDDLE", "H_EAST"]],
    ["DRY_LAND", ["V_NORTH", "V_MIDDLE", "V_SOUTH"]],
  ] as const)
    for (const artSet of ["CHIBI", "LEGACY"] as const)
      it(`plans each explored cell of a real match's Rift its own third: ${mapType}, ${artSet}`, () => {
        const { rift, seeing } = riftGame(mapType);
        expect(rift).toHaveLength(3);
        const { host, model, last } = rig();
        host.update(model(seeing([true, true, true]), { artSet }));
        expect(riftPieces(last(), rift)).toEqual(whole);
        for (const mask of RIFT_MASKS) {
          host.update(model(seeing(mask), { artSet }));
          expect(riftPieces(last(), rift), mask.join()).toEqual(
            whole.map((piece, index) => (mask[index] ? piece : null)),
          );
        }
      });

  it("guesses from the explored cells without a skeleton or with the switch off", () => {
    const { rift, seeing } = riftGame("DRY_LAND");
    const lone = seeing([false, true, false]);
    const none = rig({ terrainSkeleton: () => null });
    none.host.update(none.model(lone));
    // The middle of a vertical Rift, alone in the fog: drawn lying down.
    expect(riftPieces(none.last(), rift)).toEqual([null, "H_MIDDLE", null]);
    window.history.replaceState(null, "", "/?fog-terrain=0");
    const off = rig();
    off.host.update(off.model(lone));
    expect(riftPieces(off.last(), rift)).toEqual([null, "H_MIDDLE", null]);
  });
});

describe("the board host and the territory ripple", () => {
  it("asks for no frame while nothing changes", () => {
    const view = game();
    const { host, model, run, last } = rig();
    host.update(model(view));
    host.update(model({ ...view, commandIndex: view.commandIndex + 1 }));
    expect(run()).toBe(0);
    expect(last().tileHops ?? []).toEqual([]);
  });

  it("changes the cells one after another on its own frames, then stops", () => {
    const view = game();
    const { after, cells } = captured(view);
    expect(cells.length).toBeGreaterThanOrEqual(9);
    const { host, model, draws, run, last } = rig();
    host.update(model(view));
    const before = ownersOf(last(), cells);
    host.update(model(after));
    // The game's state is the new one at once; the picture still shows
    // the old owner on every changing cell.
    expect(ownersOf(last(), cells)).toEqual(before);
    const first = draws.length;
    const ran = run();
    expect(ran).toBeGreaterThan(10);
    // The cells changed one by one: the count of changed cells only grew,
    // by no more than a few a frame, and cells were in the air on the way.
    let changed = 0;
    let hopped = 0;
    for (const input of draws.slice(first)) {
      const now = ownersOf(input, cells).filter(
        (owner, index) => owner !== before[index],
      ).length;
      expect(now).toBeGreaterThanOrEqual(changed);
      expect(now - changed).toBeLessThanOrEqual(3);
      changed = now;
      hopped = Math.max(hopped, input.tileHops?.length ?? 0);
      for (const hop of input.tileHops ?? [])
        expect(cells).toContain(`${hop.at.x},${hop.at.y}`);
    }
    expect(changed).toBe(cells.length);
    expect(hopped).toBeGreaterThan(0);
    expect(hopped).toBeLessThanOrEqual(
      Math.ceil(TERRAIN_RIPPLE_V7.hopMs / TERRAIN_RIPPLE_V7.stepFloorMs),
    );
    // About a second of frames, and then the board is idle again.
    expect(ran * 16).toBeLessThan(1400);
    expect(last().tileHops ?? []).toEqual([]);
    expect(run()).toBe(0);
    // The plan drawn at the end is the game's own, not a patched copy.
    host.update(model(after));
    expect(ownersOf(last(), cells)).not.toEqual(before);
  });

  it("changes every cell at once for reduced motion and with the switch off", () => {
    const view = game();
    const { after, cells } = captured(view);
    const reduced = rig();
    reduced.host.update(reduced.model(view, { motion: "REDUCED" }));
    const before = ownersOf(reduced.last(), cells);
    reduced.host.update(reduced.model(after, { motion: "REDUCED" }));
    expect(
      ownersOf(reduced.last(), cells).every(
        (owner, index) => owner !== before[index],
      ),
    ).toBe(true);
    expect(reduced.last().tileHops ?? []).toEqual([]);
    expect(reduced.run()).toBe(0);
    window.history.replaceState(null, "", "/?tile-hop=0");
    const off = rig();
    off.host.update(off.model(view));
    off.host.update(off.model(after));
    expect(
      ownersOf(off.last(), cells).every(
        (owner, index) => owner !== before[index],
      ),
    ).toBe(true);
    expect(off.run()).toBe(0);
  });

  it("holds the ripple at a time for the reviews", () => {
    const view = game();
    const { after, cells } = captured(view);
    const { host, model, last, run } = rig();
    host.update(model(view));
    const before = ownersOf(last(), cells);
    host.update(model(after));
    host.pinTerrainRipple(0);
    expect(ownersOf(last(), cells)).toEqual(before);
    host.pinTerrainRipple(TERRAIN_RIPPLE_V7.hopMs * TERRAIN_RIPPLE_V7.apex);
    expect(
      ownersOf(last(), cells).filter((owner, index) => owner !== before[index]),
    ).toHaveLength(1);
    expect(last().tileHops?.length ?? 0).toBeGreaterThanOrEqual(1);
    host.pinTerrainRipple(60_000);
    expect(
      ownersOf(last(), cells).every((owner, index) => owner !== before[index]),
    ).toBe(true);
    host.pinTerrainRipple(null);
    run();
    expect(last().tileHops ?? []).toEqual([]);
  });
});
