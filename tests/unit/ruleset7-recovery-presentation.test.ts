import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  queryIdleRecoveryV7,
  viewForV7,
  type CommandV7,
  type GameStateV7,
} from "../../src/engine/index";
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import { drawSupportFeedbackV7 } from "../../src/render/canvas/support-presentation-v7";
import {
  endTurnRecoveryLabelV7,
  idleRecoveryChipV7,
  idleRecoveryExplanationV7,
} from "../../src/render/recovery-presentation-v7";
import {
  IDLE_RECOVERY_UI_V7,
  idleRecoveryUiFixtureV7,
} from "../fixtures/v7-recovery-ui";
import { undeadUiArenaV7 } from "../fixtures/v7-undead-ui";

/**
 * Bead pulp_wars-v3w: a Recover, explicit or automatic at End Turn, shows
 * the heal ring and a "+N" on the unit; End Turn plays every idle recovery
 * in one step.
 */

const AT = {
  first: IDLE_RECOVERY_UI_V7.wounded,
  second: IDLE_RECOVERY_UI_V7.hurt,
  healthy: IDLE_RECOVERY_UI_V7.healthy,
} as const;
const fixture = idleRecoveryUiFixtureV7;

function plan(state: GameStateV7, command: CommandV7) {
  const human = state.humanPlayerId;
  const result = applyCommandV7(state, human, command);
  if (!result.accepted) throw new Error(result.error.code);
  return corePresentationPlanV7(
    viewForV7(state, human),
    projectEventsV7(state, result.state, human, result.events),
    viewForV7(result.state, human),
  ).filter((step) => step.kind === "SUPPORT" && step.effect === "RECOVER");
}

describe("Ruleset 7 Recover cue (pulp_wars-v3w)", () => {
  it("plays every idle recovery of an End Turn in one step", () => {
    const state = fixture();
    const hint = queryIdleRecoveryV7(state, state.humanPlayerId);
    expect(hint).toHaveLength(2);
    const [first, second] = hint;
    expect(plan(state, { kind: "END_TURN" })).toEqual([
      {
        kind: "SUPPORT",
        effect: "RECOVER",
        actor: { unitId: first?.unitId, at: AT.first, amount: first?.amount },
        recipients: [
          { unitId: second?.unitId, at: AT.second, amount: second?.amount },
        ],
        durationMs: 480,
      },
    ]);
  });

  it("plays an explicit Recover at its command, and not again at End Turn", () => {
    const state = fixture();
    const human = state.humanPlayerId;
    const [first, second] = queryIdleRecoveryV7(state, human);
    if (first === undefined || second === undefined)
      throw new Error("recovering units missing");
    const command: CommandV7 = { kind: "RECOVER", unitId: first.unitId };
    expect(plan(state, command)).toEqual([
      {
        kind: "SUPPORT",
        effect: "RECOVER",
        actor: { unitId: first.unitId, at: AT.first, amount: first.amount },
        recipients: [],
        durationMs: 320,
      },
    ]);
    const recovered = applyCommandV7(state, human, command);
    if (!recovered.accepted) throw new Error(recovered.error.code);
    expect(plan(recovered.state, { kind: "END_TURN" })).toEqual([
      {
        kind: "SUPPORT",
        effect: "RECOVER",
        actor: { unitId: second.unitId, at: AT.second, amount: second.amount },
        recipients: [],
        durationMs: 480,
      },
    ]);
  });

  it("plays no cue when nothing recovers", () => {
    const state = undeadUiArenaV7(
      [{ seat: 0, role: "FIGHTER", at: AT.healthy }],
      [],
      ["ORIGINAL", "UNDEAD"],
    );
    expect(plan(state, { kind: "END_TURN" })).toEqual([]);
  });

  it("draws the heal ring and +N of regeneration, still under reduced motion", () => {
    const camera = { offsetX: 0, offsetY: 0, zoom: chibiCameraZoom(0.75) };
    const units = {
      actor: { unitId: 7, at: { x: 2, y: 2 }, amount: 4 },
      recipients: [{ unitId: 9, at: { x: 4, y: 2 }, amount: 2 }],
    };
    const draw = (
      effect: "RECOVER" | "REGENERATE",
      progress: number,
      reducedMotion: boolean,
    ) => {
      const log: (readonly unknown[])[] = [];
      const context = new Proxy(
        {},
        {
          get: (target, key) =>
            key in target
              ? Reflect.get(target, key)
              : (...args: unknown[]) => {
                  log.push([String(key), ...args]);
                },
        },
      ) as CanvasRenderingContext2D;
      drawSupportFeedbackV7(
        context,
        camera,
        { effect, ...units, progress },
        reducedMotion,
      );
      return log;
    };
    const full = draw("RECOVER", 0.15, false);
    expect(
      full.filter((call) => call[0] === "fillText").map((call) => call[1]),
    ).toEqual(["+4", "+2"]);
    expect(full.filter((call) => call[0] === "arc")).toHaveLength(2);
    expect(full).toEqual(draw("REGENERATE", 0.15, false));
    // Reduced motion holds the midpoint frame.
    expect(draw("RECOVER", 0.15, true)).toEqual(draw("RECOVER", 0.5, false));
  });

  it("words the dock line and the End Turn hint without a coordinate", () => {
    expect(idleRecoveryChipV7(4)).toBe("+4 at End Turn if idle");
    expect(idleRecoveryExplanationV7(2)).toBe(
      "Recovers 2 HP at End Turn if it does not move or act.",
    );
    expect(endTurnRecoveryLabelV7(1)).toBe("1 unit will recover");
    expect(endTurnRecoveryLabelV7(3)).toBe("3 units will recover");
  });
});
