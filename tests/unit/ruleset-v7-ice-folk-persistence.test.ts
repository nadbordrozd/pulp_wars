import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  createPlayableGameV7,
  createReplayV7,
  parseEventV7,
  parseGameStateV7,
  parseReplayJsonV7,
  previewColdSnapV7,
  queryPlayerCommandsV7,
  runReplayV7,
  viewForV7,
  type CommandV7,
  type GameStateV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/index";
import { seatIdV7 } from "../fixtures/v7-goblin-arena";
import { iceFieldV7 } from "../fixtures/v7-ice-folk";
import { at } from "../fixtures/v7-revision20";

// The Ice Folk revision (`pulp_wars-7g3.3`): persistence of the `frozen`
// list (Ice Folk Freeze, `pulp_wars-w49.37`; it replaced `chilled`).

const showcase: MatchSetupV7 = {
  rulesetId: RULESET_7_ID,
  seed: 1,
  width: 16,
  height: 16,
  aiCount: 3,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["ICE_FOLK", "ORIGINAL", "UNDEAD", "GOBLIN"],
  mapType: "SHOWCASE",
  mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
  curiosities: false,
};

describe("Ice Folk persistence (section 15)", () => {
  it("round-trips every legal Frozen entry through state parsing and hashing", () => {
    const state = iceFieldV7([
      { seat: 0, role: "FIGHTER", at: at(4, 3) },
      {
        seat: 1,
        role: "FIGHTER",
        at: at(5, 3),
        frozen: { turnsLeft: 1 },
      },
      {
        seat: 1,
        role: "FIGHTER",
        at: at(6, 3),
        frozen: { turnsLeft: 2 },
      },
      {
        seat: 1,
        role: "FIGHTER",
        at: at(7, 3),
        frozen: { turnsLeft: 1 },
      },
      {
        seat: 1,
        role: "FIGHTER",
        at: at(8, 3),
        frozen: { turnsLeft: 1 },
      },
    ]);
    expect(state.frozen).toHaveLength(4);
    const parsed = parseGameStateV7(JSON.parse(JSON.stringify(state)));
    expect(parsed).toEqual(state);
    expect(canonicalHash(parsed)).toBe(canonicalHash(state));
    // The list is hashed: a different entry is a different state.
    expect(
      canonicalHash({
        ...state,
        frozen: state.frozen.map((entry) => ({
          ...entry,
          turnsLeft: entry.turnsLeft === 1 ? (2 as const) : (1 as const),
        })),
      }),
    ).not.toBe(canonicalHash(state));
  });

  it("round-trips a Showcase match with a non-empty Frozen list through replay, save, and hashes", () => {
    const created = createPlayableGameV7(showcase);
    if (!created.ok) throw new Error(created.error.code);
    let state: GameStateV7 = created.state;
    let replay = createReplayV7(showcase);
    const iceId = seatIdV7(state, 0);
    const kinds = new Set<string>();
    const play = (command: CommandV7) => {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined) throw new Error("no actor");
      expect(queryPlayerCommandsV7(viewForV7(state, actor))).toContainEqual(
        command,
      );
      const result = applyCommandV7(state, actor, command);
      if (!result.accepted)
        throw new Error(`${command.kind}: ${result.error.code}`);
      for (const event of result.events) {
        expect(parseEventV7(event).ok, event.kind).toBe(true);
        kinds.add(event.kind);
      }
      state = result.state;
      replay = appendReplayCommandV7(replay, command, state);
    };
    // The Witch walks toward the nearest hostile unit, a Move a turn (the
    // other seats only end their turns), until her Cold Snap Freezes one.
    // The one Freeze effect (`pulp_wars-xv0t`, 7r133): the Sled's Bolas and
    // her Frost Bolt, which reached 2 tiles, are gone. No seat is played by
    // the AI.
    const witch = state.units.find(
      (candidate) =>
        candidate.ownerId === iceId && candidate.role === "CAPTAIN",
    );
    if (witch === undefined) throw new Error("no Witch");
    const freezes = (at: GameStateV7): boolean =>
      (previewColdSnapV7(viewForV7(at, iceId), witch.id)?.targets.length ?? 0) >
      0;
    const nearest = (at: GameStateV7, to: { x: number; y: number }): number =>
      Math.min(
        ...at.units
          .filter((unit) => unit.ownerId !== iceId && unit.hp > 0)
          .map((unit) =>
            Math.max(Math.abs(unit.at.x - to.x), Math.abs(unit.at.y - to.y)),
          ),
      );
    for (let round = 0; round < 12 && !freezes(state); round += 1) {
      const moves = queryPlayerCommandsV7(viewForV7(state, iceId)).filter(
        (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
          command.kind === "MOVE" && command.unitId === witch.id,
      );
      const best = [...moves].sort(
        (left, right) =>
          nearest(state, left.path.at(-1) ?? witch.at) -
          nearest(state, right.path.at(-1) ?? witch.at),
      )[0];
      if (best !== undefined) play(best);
      if (freezes(state)) break;
      do play({ kind: "END_TURN" });
      while (state.turnOrder[state.activeSeatIndex] !== iceId);
    }
    expect(freezes(state)).toBe(true);
    play({ kind: "COLD_SNAP", unitId: witch.id });
    // Was four End Turns back to the Ice Folk with the list still non-empty
    // (the Chill timing): a freeze cast on the Ice Folk turn gives
    // `turnsLeft` 1 and thaws at the end of its owner's next turn
    // (`pulp_wars-w49.37`, section 21.2), so after a full round the list is
    // always empty. One End Turn: the next seat is active, its units still
    // Frozen.
    play({ kind: "END_TURN" });
    expect(state.turnOrder[state.activeSeatIndex]).not.toBe(iceId);
    expect(state.frozen.length).toBeGreaterThan(0);
    expect(kinds.has("UNITS_FROZEN")).toBe(true);
    // State, replay, and save round trips.
    expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const stateHash = canonicalHash(state);
    expect(replay.checkpoints.at(-1)?.stateHash).toBe(stateHash);
    const parsedReplay = parseReplayJsonV7(JSON.stringify(replay));
    if (parsedReplay.kind !== "VALID") throw new Error(parsedReplay.kind);
    expect(runReplayV7(parsedReplay.replay).stateHash).toBe(stateHash);
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-10-03T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toEqual({ kind: "VALID", save });
    // A save whose Frozen list was tampered with is not valid.
    const tampered = JSON.parse(JSON.stringify(save)) as {
      state: Record<string, unknown>;
    };
    tampered.state.frozen = [];
    expect(parseSaveV7(JSON.stringify(tampered)).kind).not.toBe("VALID");
  });
});
