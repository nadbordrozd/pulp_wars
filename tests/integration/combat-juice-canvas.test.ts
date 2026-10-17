// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type PlayerId,
} from "../../src/engine/index";
import { CanvasBoardHostV7 } from "../../src/render/canvas/board-host-v7";
import {
  DAMAGE_FLOAT_V7,
  DEATH_POOF_V7,
} from "../../src/render/canvas/combat-juice-v7";
import {
  COMBAT_JUICE_UI_V7,
  combatJuiceEnemyTurnFixtureV7,
  combatJuiceFixtureV7,
} from "../fixtures/v7-combat-juice-ui";

/**
 * Bead pulp_wars-2yc.80: on the real board host, a hit floats its number
 * and a kill poofs on the frame the board shows the result, the playback
 * does not wait for them (they play on after it on the overlay's own
 * frames, then stop asking for frames), the fast speed halves them, reduced
 * motion holds still frames with no animation frame, and an enemy's shot
 * played back to the viewer floats its numbers too.
 */

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

const at = COMBAT_JUICE_UI_V7;

function unitIdAt(state: GameStateV7, cell: CoordV7): number {
  const unit = state.units.find(
    (candidate) => candidate.at.x === cell.x && candidate.at.y === cell.y,
  );
  if (unit === undefined) throw new Error("no unit");
  return unit.id;
}

function attack(
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
  actor: PlayerId = state.humanPlayerId,
) {
  const result = applyCommandV7(state, actor, {
    kind: "ATTACK",
    unitId: unitIdAt(state, from) as never,
    targetUnitId: unitIdAt(state, to) as never,
  });
  if (!result.accepted) throw new Error(result.error.code);
  const viewer = state.humanPlayerId;
  return {
    before: viewForV7(state, viewer),
    after: viewForV7(result.state, viewer),
    envelope: projectEventsV7(state, result.state, viewer, result.events),
  };
}

function setUp(
  played: ReturnType<typeof attack>,
  motion: "FULL" | "REDUCED",
  animationSpeed: "NORMAL" | "FAST" = "NORMAL",
) {
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
      width: 800,
      height: 600,
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
    }),
  });
  document.body.append(container);
  const host = new CanvasBoardHostV7(document);
  host.mount(container, { onSelection: vi.fn(), onCommand: vi.fn() });
  host.update({
    matchInstanceId: 1,
    view: played.after,
    offeredCommands: [],
    interactive: false,
    motion,
    animationSpeed,
    presentationPaused: false,
    highContrast: false,
    interaction: {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    },
  });
  const effects = container.querySelector<HTMLCanvasElement>(
    "canvas.board-effects-canvas-v7",
  );
  if (effects === null) throw new Error("no effects canvas");
  return {
    host,
    effects,
    frames,
    get now() {
      return now;
    },
    /** Runs the waiting frames at now + `ms`, then lets promises settle. */
    async step(ms: number): Promise<void> {
      now += ms;
      const waiting = [...frames.entries()];
      frames.clear();
      for (const [, callback] of waiting) callback(now);
      for (let flush = 0; flush < 8; flush += 1) await Promise.resolve();
    },
    setNow(time: number) {
      now = time;
    },
  };
}

/** Steps 16 ms frames until `done`, recording the cues' counts. */
async function play(
  scene: ReturnType<typeof setUp>,
  done: () => boolean,
  limitMs = 4_000,
) {
  const timeline: {
    readonly ms: number;
    readonly floats: string | undefined;
    readonly units: string | undefined;
  }[] = [];
  const start = scene.now;
  while (!done() && scene.now - start < limitMs) {
    await scene.step(16);
    timeline.push({
      ms: scene.now - start,
      floats: scene.effects.dataset.combatJuiceFloats,
      units: scene.effects.dataset.combatJuiceUnits,
    });
  }
  return timeline;
}

describe("Combat juice on the board host", () => {
  it("floats the kill's number and poofs the victim when the blow lands, without holding the playback", async () => {
    const played = attack(combatJuiceFixtureV7(), at.knight, at.knightVictim);
    const scene = setUp(played, "FULL");
    let finished = false;
    void scene.host
      .presentBoundary(played.before, played.after, played.envelope)
      .then(() => {
        finished = true;
      });
    const playback = await play(scene, () => finished);
    const firstFloat = playback.find((frame) => frame.floats === "1");
    const firstPoof = playback.find((frame) => frame.units === "1");
    // The lunge is 230 ms; both start on the first frame after it.
    expect(firstFloat?.ms).toBeGreaterThanOrEqual(230);
    expect(firstFloat?.ms).toBeLessThan(230 + 40);
    // The poof on the first frame that draws the result (a frame at most
    // after the number).
    expect(firstPoof?.ms).toBeGreaterThanOrEqual(firstFloat?.ms ?? 0);
    expect(firstPoof?.ms).toBeLessThanOrEqual((firstFloat?.ms ?? 0) + 16);
    const endedAt = playback.at(-1)?.ms ?? 0;
    // The playback ended while the number still floats: nothing waited.
    expect(endedAt).toBeLessThan(230 + DAMAGE_FLOAT_V7.durationMs);
    expect(scene.effects.dataset.combatJuiceFloats).toBe("1");
    // The overlay asks for its own frames until the cues are over.
    expect(scene.frames.size).toBe(1);
    const after = await play(scene, () => scene.frames.size === 0);
    expect(after.at(-1)?.floats).toBeUndefined();
    expect(after.at(-1)?.units).toBeUndefined();
    expect(endedAt + (after.at(-1)?.ms ?? 0)).toBeLessThanOrEqual(
      230 + DAMAGE_FLOAT_V7.durationMs + 32,
    );
    // The poof ended at its own length.
    const poofEnd = [
      ...playback,
      ...after.map((frame) => ({ ...frame, ms: frame.ms + endedAt })),
    ]
      .filter((frame) => frame.units === "1")
      .at(-1)?.ms;
    expect(poofEnd).toBeLessThan(
      (firstPoof?.ms ?? 0) + DEATH_POOF_V7.durationMs + 1,
    );
    expect(poofEnd).toBeGreaterThan(
      (firstPoof?.ms ?? 0) + DEATH_POOF_V7.durationMs - 32,
    );
    scene.host.destroy();
  });

  it("floats a hit and its retaliation, both, a beat apart", async () => {
    const played = attack(combatJuiceFixtureV7(), at.fighter, at.goblinGuard);
    const scene = setUp(played, "FULL");
    let finished = false;
    void scene.host
      .presentBoundary(played.before, played.after, played.envelope)
      .then(() => {
        finished = true;
      });
    const playback = await play(scene, () => finished);
    const rest = await play(scene, () => scene.frames.size === 0);
    const timeline = [...playback, ...rest];
    const one = timeline.findIndex((frame) => frame.floats === "1");
    const two = timeline.findIndex((frame) => frame.floats === "2");
    expect(one).toBeGreaterThanOrEqual(0);
    expect(two).toBeGreaterThan(one);
    expect(timeline.some((frame) => frame.units !== undefined)).toBe(false);
    scene.host.destroy();
  });

  it("halves the number at the fast speed", async () => {
    const played = attack(combatJuiceFixtureV7(), at.knight, at.knightVictim);
    const scene = setUp(played, "FULL", "FAST");
    let finished = false;
    void scene.host
      .presentBoundary(played.before, played.after, played.envelope)
      .then(() => {
        finished = true;
      });
    const playback = await play(scene, () => finished);
    const rest = await play(scene, () => scene.frames.size === 0);
    const shown = [
      ...playback,
      ...rest.map((frame) => ({
        ...frame,
        ms: frame.ms + (playback.at(-1)?.ms ?? 0),
      })),
    ].filter((frame) => frame.floats === "1");
    const length = (shown.at(-1)?.ms ?? 0) - (shown[0]?.ms ?? 0);
    expect(length).toBeLessThanOrEqual(DAMAGE_FLOAT_V7.durationMs / 2);
    expect(length).toBeGreaterThan(DAMAGE_FLOAT_V7.durationMs / 2 - 48);
    scene.host.destroy();
  });

  it("holds still frames with reduced motion and asks no frame for them", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const played = attack(combatJuiceFixtureV7(), at.knight, at.knightVictim);
    const scene = setUp(played, "REDUCED");
    let finished = false;
    void scene.host
      .presentBoundary(played.before, played.after, played.envelope)
      .then(() => {
        finished = true;
      });
    await play(scene, () => finished);
    // The still number and the still dust, together with the result.
    expect(scene.effects.dataset.combatJuiceFloats).toBe("1");
    expect(scene.frames.size).toBe(0);
    scene.setNow(scene.now + DAMAGE_FLOAT_V7.reducedHoldMs);
    vi.advanceTimersByTime(DAMAGE_FLOAT_V7.reducedHoldMs);
    expect(scene.effects.dataset.combatJuiceFloats).toBeUndefined();
    expect(scene.effects.dataset.combatJuiceUnits).toBeUndefined();
    expect(scene.frames.size).toBe(0);
    scene.host.destroy();
  });

  it("floats an enemy shot's hit and its splash in the enemy turn's playback", async () => {
    const state = combatJuiceEnemyTurnFixtureV7();
    const goblin = state.players.find(
      (player) => player.id !== state.humanPlayerId,
    );
    if (goblin === undefined) throw new Error("no goblin seat");
    const played = attack(state, at.bombChucker, at.bombTarget, goblin.id);
    const scene = setUp(played, "FULL");
    let finished = false;
    void scene.host
      .presentBoundary(played.before, played.after, played.envelope)
      .then(() => {
        finished = true;
      });
    const playback = await play(scene, () => finished);
    const rest = await play(scene, () => scene.frames.size === 0);
    const timeline = [...playback, ...rest];
    expect(timeline.some((frame) => frame.floats === "2")).toBe(true);
    expect(timeline.at(-1)?.floats).toBeUndefined();
    scene.host.destroy();
  });

  it("holds pinned cues for review and lets them go", () => {
    const played = attack(combatJuiceFixtureV7(), at.knight, at.knightVictim);
    const scene = setUp(played, "FULL");
    scene.host.pinCombatJuice([
      { kind: "FLOAT", at: at.knight, amount: 4, elapsedMs: 300 },
      { kind: "FLOAT", at: at.knight, amount: 2, elapsedMs: 300, slot: 1 },
    ]);
    expect(scene.effects.dataset.combatJuiceFloats).toBe("2");
    scene.host.pinCombatJuice(null);
    expect(scene.effects.dataset.combatJuiceFloats).toBeUndefined();
    scene.host.destroy();
  });
});
