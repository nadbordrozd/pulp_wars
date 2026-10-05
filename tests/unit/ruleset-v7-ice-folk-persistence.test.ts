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

// The Ice Folk revision (`pulp_wars-7g3.3`): persistence of the `chilled`
// list (docs/product/RULESET_7_ICE_FOLK.md sections 5.1, 11, and 15).

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
  mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V3",
  curiosities: false,
};

describe("Ice Folk persistence (section 15)", () => {
  it("round-trips every legal Chill entry through state parsing and hashing", () => {
    const state = iceFieldV7([
      { seat: 0, role: "FIGHTER", at: at(4, 3) },
      {
        seat: 1,
        role: "FIGHTER",
        at: at(5, 3),
        chill: { sluggish: true, turnsLeft: 2 },
      },
      {
        seat: 1,
        role: "FIGHTER",
        at: at(6, 3),
        chill: { sluggish: false, turnsLeft: 2 },
      },
      {
        seat: 1,
        role: "FIGHTER",
        at: at(7, 3),
        chill: { sluggish: false, turnsLeft: 1 },
      },
      {
        seat: 1,
        role: "FIGHTER",
        at: at(8, 3),
        chill: { sluggish: false, turnsLeft: 0 },
      },
    ]);
    expect(state.chilled).toHaveLength(4);
    const parsed = parseGameStateV7(JSON.parse(JSON.stringify(state)));
    expect(parsed).toEqual(state);
    expect(canonicalHash(parsed)).toBe(canonicalHash(state));
    // The list is hashed: a different entry is a different state.
    expect(
      canonicalHash({
        ...state,
        chilled: state.chilled.map((entry) => ({
          ...entry,
          turnsLeft: 2 as const,
          sluggish: false,
        })),
      }),
    ).not.toBe(canonicalHash(state));
  });

  it("round-trips a Showcase match with a non-empty Chill list through replay, save, and hashes", () => {
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
    // The Sled and the Witch walk toward the neighbouring strip and throw
    // the Bolas and cast Cold Snap after their Move (the first Move after
    // which the command is offered).
    for (const kind of ["THROW_BOLAS", "COLD_SNAP"] as const) {
      const role = kind === "THROW_BOLAS" ? "RAIDER" : "CAPTAIN";
      const unit = state.units.find(
        (candidate) => candidate.ownerId === iceId && candidate.role === role,
      );
      if (unit === undefined) throw new Error(role);
      const moves = queryPlayerCommandsV7(viewForV7(state, iceId)).filter(
        (command) => command.kind === "MOVE" && command.unitId === unit.id,
      );
      const found = moves.find((candidate) => {
        const moved = applyCommandV7(state, iceId, candidate);
        return (
          moved.accepted &&
          queryPlayerCommandsV7(viewForV7(moved.state, iceId)).some(
            (command) => command.kind === kind && command.unitId === unit.id,
          )
        );
      });
      if (found === undefined) throw new Error(`no Move enables ${kind}`);
      play(found);
      const cast = queryPlayerCommandsV7(viewForV7(state, iceId)).find(
        (command) => command.kind === kind && command.unitId === unit.id,
      );
      play(cast as CommandV7);
    }
    for (let seat = 0; seat < 4; seat += 1) play({ kind: "END_TURN" });
    expect(state.turnOrder[state.activeSeatIndex]).toBe(iceId);
    expect(state.chilled.length).toBeGreaterThan(0);
    expect(kinds.has("UNITS_CHILLED")).toBe(true);
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
    // A save whose Chill list was tampered with is not valid.
    const tampered = JSON.parse(JSON.stringify(save)) as {
      state: Record<string, unknown>;
    };
    tampered.state.chilled = [];
    expect(parseSaveV7(JSON.stringify(tampered)).kind).not.toBe("VALID");
  });
});
