import { describe, expect, it } from "vitest";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  buildBoardRenderPlanV7,
  type BoardRenderPlanEntryV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  DIRECTED_GROUND_SHADOW_COLOUR_V7,
  DIRECTED_READY_RING_COLOUR_V7,
  HUMAN_DEMO_DIRECTION_V7,
  LIVE_DIRECTION_V7,
  drawDirectedUnitBaseV7,
  type BoardVisualDirectionV7,
} from "../../src/render/canvas/visual-direction-v7";
import {
  FACTION_LOOKS_MIXES_V7,
  factionLooksMixAFixtureV7,
  factionLooksMixBFixtureV7,
} from "../fixtures/v7-faction-looks";

type LogEntry = readonly unknown[];

function recordingContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly log: LogEntry[];
} {
  const log: LogEntry[] = [];
  const context = new Proxy(
    {},
    {
      get: (target, key) =>
        key in target
          ? Reflect.get(target, key)
          : (...args: unknown[]) => {
              log.push([String(key), ...args]);
            },
      set: (target, key, value) => {
        log.push(["set", String(key), value]);
        return Reflect.set(target, key, value);
      },
    },
  );
  return { context: context as CanvasRenderingContext2D, log };
}

function units(state: GameStateV7): BoardRenderPlanEntryV7[] {
  const view = viewForV7(state, state.humanPlayerId);
  return buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
    selection: null,
    selectedUnitId: null,
    selectedAchievement: null,
  }).entries.filter((entry) => entry.kind === "UNIT");
}

/** The ground drawn under one unit by a direction: fills and strokes. */
function ground(
  direction: BoardVisualDirectionV7,
  entry: BoardRenderPlanEntryV7,
): { readonly fills: unknown[]; readonly strokes: unknown[] } {
  const { context, log } = recordingContext();
  drawDirectedUnitBaseV7(
    context,
    direction,
    entry,
    { x: 0, y: 0, width: 56, height: 80 },
    1,
  );
  const set = (name: string) =>
    log
      .filter((call) => call[0] === "set" && call[1] === name)
      .map((call) => call[2]);
  return { fills: set("fillStyle"), strokes: set("strokeStyle") };
}

describe("faction looks without plates on real states (pulp_wars-w5j.3)", () => {
  const mixes = [
    ["A", factionLooksMixAFixtureV7(), FACTION_LOOKS_MIXES_V7.A],
    ["B", factionLooksMixBFixtureV7(), FACTION_LOOKS_MIXES_V7.B],
  ] as const;

  it("fields four different factions per mix, all six across the two, with every marker the review shows", () => {
    expect(
      new Set([...FACTION_LOOKS_MIXES_V7.A, ...FACTION_LOOKS_MIXES_V7.B]).size,
    ).toBe(6);
    for (const [name, state, factions] of mixes) {
      expect(new Set(factions).size, name).toBe(4);
      expect(
        state.players
          .slice()
          .sort((left, right) => left.seat - right.seat)
          .map((player) => player.faction),
        name,
      ).toEqual([...factions]);
      const entries = units(state);
      // Every seat fields units, and every seat has a damaged one.
      for (const player of state.players) {
        const own = entries.filter((entry) => entry.ownerId === player.id);
        expect(own.length, `${name} seat ${player.seat}`).toBeGreaterThan(2);
        expect(
          own.some((entry) => (entry.hp ?? 0) < (entry.maxHp ?? 0)),
          `${name} seat ${player.seat} damaged`,
        ).toBe(true);
      }
      // The viewer's units are ready but one; nobody else's is. Ice Folk
      // Freeze (`pulp_wars-w49.37`): in mix A the viewer's Raider is
      // Frozen, and a Frozen unit is not ready.
      const ready = entries.filter((entry) => entry.ready === true);
      expect(ready.length, name).toBe(name === "A" ? 4 : 5);
      expect(
        ready.every((entry) => entry.ownerId === state.humanPlayerId),
        name,
      ).toBe(true);
      // Shields and Eggs.
      expect(entries.some((entry) => entry.martian !== undefined)).toBe(true);
      expect(entries.filter((entry) => entry.egg !== undefined)).toHaveLength(
        2,
      );
    }
    // Mix A: a Big and an Alpha dinosaur, a dented Shield, and Frozen
    // units.
    const a = units(mixes[0][1]);
    expect(a.map((entry) => entry.growthStage ?? null)).toEqual(
      expect.arrayContaining([1, 2]),
    );
    expect(
      a.some(
        (entry) =>
          entry.martian !== undefined &&
          entry.martian.shield < entry.martian.shieldSegments,
      ),
    ).toBe(true);
    // Ice Folk Freeze (`pulp_wars-w49.38`): three units are Frozen.
    expect(
      a.filter((entry) => (entry.iceFolk?.frozen ?? null) !== null),
    ).toHaveLength(3);
  });

  it("draws every unit with no player colour under it in the live look: a neutral shadow, and the ready ring on the viewer's ready units", () => {
    for (const [name, state] of mixes)
      for (const entry of units(state)) {
        const live = ground(LIVE_DIRECTION_V7, entry);
        const label = `${name} ${entry.label ?? ""}`;
        expect(live.fills, label).not.toContain(entry.ownerColor);
        expect(
          live.fills.every((fill) => fill === DIRECTED_GROUND_SHADOW_COLOUR_V7),
          label,
        ).toBe(true);
        // A flyer casts its own shadow: none under it.
        if (entry.martian?.flyer === true)
          expect(live.fills, label).toEqual([]);
        expect(
          live.strokes.includes(DIRECTED_READY_RING_COLOUR_V7),
          label,
        ).toBe(entry.ready === true);
        expect(live.strokes, label).not.toContain(entry.ownerColor);
        // The study benches' direction still puts a plate in the player
        // colour under the same unit.
        expect(ground(HUMAN_DEMO_DIRECTION_V7, entry).fills, label).toContain(
          entry.ownerColor,
        );
      }
  });
});
