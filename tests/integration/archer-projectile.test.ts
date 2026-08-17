import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppController } from "../../src/app/controller";
import {
  applyCommand,
  canonicalHash,
  queryPlayerCommands,
  viewFor,
  type Command,
  type GameState,
} from "../../src/engine/index";
import { gameStateBuilder } from "../fixtures/builders";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-16T10:00:00.000Z"));
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("Archer projectile controller integration", () => {
  it("reveals the authoritative result at 280ms, locks input, and preserves command/event/hash", () => {
    const { state, attack } = archerAttackFixture("HUMAN");
    const expected = applyCommand(state, attack);
    if (!expected.ok) throw new Error(expected.error.code);
    const expectedHash = canonicalHash(expected.state);
    const controller = controllerFor(state, false);
    const announcements: string[] = [];
    controller.subscribe((snapshot) =>
      announcements.push(snapshot.announcement),
    );

    expect(controller.dispatch(attack)).toBe(true);
    const accepted = controller.snapshot();
    expect(accepted.combatPresentation).toMatchObject({
      kind: "ARCHER_ARROW",
      phase: "FLIGHT",
      phaseDurationMs: 280,
      phaseElapsedMs: 0,
      paused: false,
      commandIndex: state.commandIndex + 1,
    });
    expect(canonicalHash(accepted.match)).toBe(expectedHash);
    expect(controller.dispatch({ kind: "END_TURN" })).toBe(false);

    vi.advanceTimersByTime(279);
    expect(controller.snapshot().combatPresentation?.phase).toBe("FLIGHT");
    vi.advanceTimersByTime(1);
    expect(controller.snapshot().combatPresentation).toMatchObject({
      kind: "ARCHER_ARROW",
      phase: "IMPACT",
      phaseDurationMs: 100,
    });
    expect(canonicalHash(controller.snapshot().match)).toBe(expectedHash);
    vi.advanceTimersByTime(100);
    expect(controller.snapshot().combatPresentation).toBeNull();
    expect(canonicalHash(controller.snapshot().match)).toBe(expectedHash);
    expect(new Set(announcements).size).toBeLessThanOrEqual(2);
    controller.destroy();
  });

  it("pauses the flight clock in Settings and resumes from the same frame", () => {
    const { state, attack } = archerAttackFixture("HUMAN");
    const controller = controllerFor(state, false);
    expect(controller.dispatch(attack)).toBe(true);
    vi.advanceTimersByTime(90);
    controller.openOverlay({ name: "SETTINGS", from: "MATCH" });
    expect(controller.snapshot().combatPresentation).toMatchObject({
      phase: "FLIGHT",
      phaseElapsedMs: 90,
      paused: true,
    });
    vi.advanceTimersByTime(2_000);
    expect(controller.snapshot().combatPresentation).toMatchObject({
      phase: "FLIGHT",
      phaseElapsedMs: 90,
      paused: true,
    });
    controller.closeOverlay();
    expect(controller.snapshot().combatPresentation?.paused).toBe(false);
    vi.advanceTimersByTime(189);
    expect(controller.snapshot().combatPresentation?.phase).toBe("FLIGHT");
    vi.advanceTimersByTime(1);
    expect(controller.snapshot().combatPresentation?.phase).toBe("IMPACT");
    controller.destroy();
  });

  it("uses only a 100ms impact crossfade in reduced motion", () => {
    const { state, attack } = archerAttackFixture("HUMAN");
    const expected = applyCommand(state, attack);
    if (!expected.ok) throw new Error(expected.error.code);
    const controller = controllerFor(state, true);
    expect(controller.dispatch(attack)).toBe(true);
    expect(controller.snapshot().combatPresentation).toMatchObject({
      kind: "ARCHER_ARROW",
      motion: "REDUCED",
      phase: "IMPACT",
      phaseDurationMs: 100,
    });
    expect(canonicalHash(controller.snapshot().match)).toBe(
      canonicalHash(expected.state),
    );
    vi.advanceTimersByTime(100);
    expect(controller.snapshot().combatPresentation).toBeNull();
    controller.destroy();
  });

  it("cancels route/match presentation state directly to the accepted frame", () => {
    const { state, attack } = archerAttackFixture("HUMAN");
    const expected = applyCommand(state, attack);
    if (!expected.ok) throw new Error(expected.error.code);
    const controller = controllerFor(state, false);
    expect(controller.dispatch(attack)).toBe(true);
    const token = controller.snapshot().combatPresentation?.queueToken;
    controller.navigate("HUB");
    expect(token).toBeTypeOf("number");
    expect(controller.snapshot().combatPresentation).toBeNull();
    expect(canonicalHash(controller.snapshot().match)).toBe(
      canonicalHash(expected.state),
    );
    vi.advanceTimersByTime(1_000);
    expect(controller.snapshot().combatPresentation).toBeNull();
    controller.destroy();
  });

  it("keeps non-Archer combat on the existing lunge/impact presentation", () => {
    const { state, attack } = archerAttackFixture("HUMAN", "CATAPULT");
    const controller = controllerFor(state, false);
    expect(controller.dispatch(attack)).toBe(true);
    expect(controller.snapshot().combatPresentation).toMatchObject({
      kind: "STANDARD",
      phase: "CONTACT",
      phaseDurationMs: 180,
    });
    vi.advanceTimersByTime(180);
    expect(controller.snapshot().combatPresentation).toMatchObject({
      kind: "STANDARD",
      phase: "IMPACT",
      phaseDurationMs: 260,
    });
    controller.destroy();
  });

  it("Fast Forward cancels an in-flight AI arrow and preserves paced/fast state parity", () => {
    const { state, attack } = archerAttackFixture("AI");
    const attacked = applyCommand(state, attack);
    if (!attacked.ok) throw new Error(attacked.error.code);
    const ended = applyCommand(attacked.state, { kind: "END_TURN" });
    if (!ended.ok) throw new Error(ended.error.code);
    const controller = new AppController({
      initialMatch: state,
      initialRoute: "MATCH",
      aiStepDelayMs: 1,
      prefersReducedMotion: false,
      storage: null,
      chooseAiCommand(view) {
        const command = queryPlayerCommands(view)
          .map(({ command: candidate }) => candidate)
          .find((candidate) => candidate.kind === "ATTACK") ?? {
          kind: "END_TURN" as const,
        };
        return {
          difficulty: "NORMAL",
          candidates: [],
          command,
          prngDraws: 0,
        };
      },
    });
    vi.advanceTimersByTime(1);
    expect(controller.snapshot().combatPresentation).toMatchObject({
      kind: "ARCHER_ARROW",
      phase: "FLIGHT",
    });
    controller.fastForwardAi();
    expect(controller.snapshot().combatPresentation).toBeNull();
    expect(controller.snapshot().fastForwarding).toBe(false);
    expect(canonicalHash(controller.snapshot().match)).toBe(
      canonicalHash(ended.state),
    );
    controller.destroy();
  });

  it("omits the primitive when either public event-snapshot endpoint is missing", () => {
    const { state, attack } = archerAttackFixture("AI");
    if (attack.kind !== "ATTACK") throw new Error("Expected Attack");
    const attacker = state.units.find((unit) => unit.id === attack.unitId);
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (attacker === undefined || human === undefined)
      throw new Error("Missing endpoint fixture");
    const hiddenState: GameState = {
      ...state,
      players: state.players.map((player) =>
        player.id === human.id
          ? {
              ...player,
              explored: player.explored.filter(
                (at) => !sameCoord(at, attacker.at),
              ),
            }
          : player,
      ),
    };
    const expected = applyCommand(hiddenState, attack);
    if (!expected.ok) throw new Error(expected.error.code);
    const controller = new AppController({
      initialMatch: hiddenState,
      initialRoute: "MATCH",
      aiStepDelayMs: 1,
      storage: null,
      chooseAiCommand: () => ({
        difficulty: "NORMAL",
        candidates: [],
        command: attack,
        prngDraws: 0,
      }),
    });
    vi.advanceTimersByTime(1);
    expect(controller.snapshot().combatPresentation).toBeNull();
    expect(canonicalHash(controller.snapshot().match)).toBe(
      canonicalHash(expected.state),
    );
    controller.destroy();
  });
});

function controllerFor(state: GameState, reduced: boolean): AppController {
  return new AppController({
    initialMatch: state,
    initialRoute: "MATCH",
    aiStepDelayMs: 100_000,
    prefersReducedMotion: reduced,
    storage: null,
  });
}

function archerAttackFixture(
  controller: "HUMAN" | "AI",
  attackerType: "ARCHER" | "WARRIOR" | "CATAPULT" = "ARCHER",
): { readonly state: GameState; readonly attack: Command } {
  const base = gameStateBuilder();
  const attackerPlayer = base.players.find(
    (player) => player.controller === controller,
  );
  const defenderPlayer = base.players.find(
    (player) => player.controller !== controller,
  );
  const attacker = base.units.find(
    (unit) => unit.ownerId === attackerPlayer?.id,
  );
  const defender = base.units.find(
    (unit) => unit.ownerId === defenderPlayer?.id,
  );
  if (
    attackerPlayer === undefined ||
    defenderPlayer === undefined ||
    attacker === undefined ||
    defender === undefined
  )
    throw new Error("Missing combat fixture units");
  const range = attackerType === "ARCHER" ? 2 : 1;
  const target = base.board.tiles.find(
    (tile) =>
      Math.max(
        Math.abs(tile.at.x - attacker.at.x),
        Math.abs(tile.at.y - attacker.at.y),
      ) === range &&
      attackerPlayer.explored.some((at) => sameCoord(at, tile.at)) &&
      !base.cities.some((city) => sameCoord(city.at, tile.at)) &&
      !base.units.some(
        (unit) => unit.id !== defender.id && sameCoord(unit.at, tile.at),
      ),
  );
  if (target === undefined) throw new Error("Missing visible combat target");
  const state: GameState = {
    ...base,
    activeSeatIndex: base.turnOrder.indexOf(attackerPlayer.id),
    players: base.players.map((player) => ({
      ...player,
      explored: [
        ...player.explored,
        ...[attacker.at, target.at].filter(
          (at) => !player.explored.some((known) => sameCoord(known, at)),
        ),
      ],
    })),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        sameCoord(tile.at, target.at)
          ? { ...tile, terrain: "GRASS", resource: null, improvement: null }
          : tile,
      ),
    },
    units: base.units.map((unit) => {
      if (unit.id === attacker.id)
        return {
          ...unit,
          type: attackerType,
          ready: true,
          activation: {
            moved: false,
            attacked: false,
            recovered: false,
            captured: false,
            handled: false,
            escapeAvailable: false,
            specialActed: false,
          },
        };
      if (unit.id === defender.id) return { ...unit, at: target.at };
      return unit;
    }),
  };
  const view = viewFor(state, attackerPlayer.id);
  const attack = queryPlayerCommands(view)
    .map(({ command }) => command)
    .find(
      (command) =>
        command.kind === "ATTACK" &&
        command.unitId === attacker.id &&
        command.target.kind === "UNIT" &&
        command.target.unitId === defender.id,
    );
  if (attack === undefined) throw new Error("Missing offered Attack");
  return { state, attack };
}

function sameCoord(
  left: { readonly x: number; readonly y: number },
  right: { readonly x: number; readonly y: number },
): boolean {
  return left.x === right.x && left.y === right.y;
}
