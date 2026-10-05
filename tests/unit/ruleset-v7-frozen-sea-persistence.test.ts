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
  projectEventsV7,
  parsePlayerEventEnvelopeV7,
  queryPlayerCommandsV7,
  runReplayV7,
  showcaseStripCenterXV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/index";

// The naval branch, engine step II (`pulp_wars-5ti.3`,
// docs/product/RULESET_7_NAVAL_BRANCH.md sections 3.2 and 12): the state,
// event, replay, and save shapes of the frozen sea, on the Showcase with an
// Ice Folk seat (whose boats' tiles are its ice).

const SHOWCASE: MatchSetupV7 = {
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

describe("frozen sea persistence", () => {
  it("round-trips a Showcase match with Freezes, a walk onto the ice, and a thaw through replay, save, and hashes", () => {
    const created = createPlayableGameV7(SHOWCASE);
    if (!created.ok) throw new Error(created.error.code);
    let state: GameStateV7 = created.state;
    let replay = createReplayV7(SHOWCASE);
    const events: DomainEventV7[] = [];
    const active = () => {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined) throw new Error("no actor");
      return actor;
    };
    const offered = () => queryPlayerCommandsV7(viewForV7(state, active()));
    const play = (command: CommandV7) => {
      // Every command played is one the public query offers.
      expect(offered(), command.kind).toContainEqual(command);
      const before = state;
      const result = applyCommandV7(state, active(), command);
      if (!result.accepted)
        throw new Error(`${command.kind}: ${result.error.code}`);
      for (const event of result.events) {
        expect(parseEventV7(event).ok, event.kind).toBe(true);
        events.push(event);
      }
      // Every seat's projection of the command parses.
      for (const player of before.players)
        expect(
          parsePlayerEventEnvelopeV7(
            projectEventsV7(before, result.state, player.id, result.events),
          ).ok,
          `${command.kind} for ${String(player.id)}`,
        ).toBe(true);
      state = result.state;
      replay = appendReplayCommandV7(replay, command, state);
    };
    const endRound = () => {
      for (let seat = 0; seat < 4; seat += 1) play({ kind: "END_TURN" });
    };
    const find = <K extends CommandV7["kind"]>(
      kind: K,
      test: (command: Extract<CommandV7, { kind: K }>) => boolean,
    ): Extract<CommandV7, { kind: K }> => {
      const command = offered().find(
        (candidate): candidate is Extract<CommandV7, { kind: K }> =>
          candidate.kind === kind &&
          test(candidate as Extract<CommandV7, { kind: K }>),
      );
      if (command === undefined) throw new Error(`no ${kind} on offer`);
      return command;
    };
    const unitAt = (x: number, y: number) => {
      const unit = state.units.find(
        (entry) => entry.at.x === x && entry.at.y === y,
      );
      if (unit === undefined) throw new Error(`no unit at ${x},${y}`);
      return unit;
    };
    const endsOn = (at: CoordV7) => (command: { path: readonly CoordV7[] }) =>
      command.path.at(-1)?.x === at.x && command.path.at(-1)?.y === at.y;
    const cx = showcaseStripCenterXV7(0, 3);
    expect(cx).toBe(2);
    const ice = state.players[0];
    if (ice === undefined) throw new Error("no seat");
    expect(state.ice.map((entry) => [entry.at.x, entry.at.y])).toEqual([
      [cx, 12],
      [cx, 13],
      [cx + 1, 13],
    ]);
    // Turn 1: the Sabretooth walks onto the home ice (it never slides), and
    // the Boulder Yeti walks to the Coast city and refreshes the two tiles
    // south of it.
    const sabretooth = unitAt(cx + 1, 9);
    const boulder = unitAt(cx, 9);
    expect([sabretooth.role, boulder.role]).toEqual(["KNIGHT", "CATAPULT"]);
    play(
      find(
        "MOVE",
        (command) =>
          command.unitId === sabretooth.id && endsOn({ x: cx, y: 12 })(command),
      ),
    );
    expect(unitAt(cx, 12)).toMatchObject({ id: sabretooth.id, form: "LAND" });
    play(
      find(
        "MOVE",
        (command) =>
          command.unitId === boulder.id && endsOn({ x: cx, y: 11 })(command),
      ),
    );
    play({ kind: "FREEZE", unitId: boulder.id, at: { x: cx, y: 12 } });
    expect(events.at(-1)).toEqual({
      kind: "WATER_FROZEN",
      playerId: ice.id,
      unitId: boulder.id,
      tiles: [
        { x: cx, y: 12 },
        { x: cx, y: 13 },
      ],
      icebound: [],
    });
    const midSave = createSaveEnvelopeV7(
      { state, replay },
      "2026-10-05T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(midSave))).toEqual({
      kind: "VALID",
      save: midSave,
    });
    endRound();
    // The thaw: the tile in the Coast territory keeps its count, the two
    // outside lose one turn.
    expect(state.ice.map((entry) => entry.turnsLeft)).toEqual([5, 4, 4]);
    // Turn 2: the Sabretooth, standing on the ice, freezes new Deep Water
    // (Pack Ice) south-west of it.
    play({ kind: "FREEZE", unitId: sabretooth.id, at: { x: cx - 1, y: 13 } });
    expect(state.ice.map((entry) => [entry.at.x, entry.at.y])).toEqual([
      [cx, 12],
      [cx - 1, 13],
      [cx, 13],
      [cx + 1, 13],
      [cx - 2, 14],
    ]);
    endRound();
    endRound();
    expect(
      events.filter((event) => event.kind === "WATER_FROZEN"),
    ).toHaveLength(2);
    // The state, its JSON round trip, the replay, and the save agree.
    expect(state.ice.length).toBeGreaterThan(0);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const stateHash = canonicalHash(state);
    expect(replay.checkpoints.at(-1)?.stateHash).toBe(stateHash);
    const parsedReplay = parseReplayJsonV7(JSON.stringify(replay));
    if (parsedReplay.kind !== "VALID") throw new Error(parsedReplay.kind);
    expect(runReplayV7(parsedReplay.replay).stateHash).toBe(stateHash);
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-10-05T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toEqual({ kind: "VALID", save });
    // A save whose ice was edited no longer verifies.
    const tampered = JSON.parse(JSON.stringify(save)) as {
      state: { ice: { turnsLeft: number }[] };
    };
    const first = tampered.state.ice[0];
    if (first === undefined) throw new Error("no ice");
    first.turnsLeft = first.turnsLeft === 5 ? 4 : 5;
    expect(parseSaveV7(JSON.stringify(tampered)).kind).not.toBe("VALID");
  });
});
