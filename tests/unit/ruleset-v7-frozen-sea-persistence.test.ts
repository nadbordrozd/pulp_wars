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
  previewColdSnapV7,
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
  it("round-trips a Showcase match with Freezes, a walk onto the ice, and permanent ice through replay, save, and hashes", () => {
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
    // The boats' three tiles, and (the starting border freeze,
    // `pulp_wars-s55m.6`, 7r126: every Showcase seat knows Rime) the rest of
    // the Coast city's water, but its Port (cx - 1, 12) and Shipyard
    // (cx + 1, 12): a dock never freezes (the one Freeze effect,
    // `pulp_wars-xv0t`, 7r133).
    expect(state.ice.map((entry) => [entry.at.x, entry.at.y])).toEqual([
      [cx, 12],
      [cx, 13],
      [cx + 1, 13],
    ]);
    // Turn 1: the Sabretooth walks onto the home ice (it never slides).
    const sabretooth = unitAt(cx + 1, 9);
    expect(sabretooth.role).toBe("KNIGHT");
    play(
      find(
        "MOVE",
        (command) =>
          command.unitId === sabretooth.id && endsOn({ x: cx, y: 12 })(command),
      ),
    );
    expect(unitAt(cx, 12)).toMatchObject({ id: sabretooth.id, form: "LAND" });
    // The one Freeze effect (`pulp_wars-xv0t`, 7r133): the Ice Witch's Cold
    // Snap is the freeze that makes ice (the Snow Golem's and the
    // Sabretooth's line `FREEZE` before). She walks toward open water, a
    // Move a round (the other seats only end their turns), and casts where
    // her ring makes new ice; her own sound ice is passed over.
    const witch = state.units.find(
      (unit) => unit.ownerId === ice.id && unit.role === "CAPTAIN",
    );
    if (witch === undefined) throw new Error("no Witch");
    const newIce = (at: GameStateV7): readonly CoordV7[] =>
      previewColdSnapV7(viewForV7(at, ice.id), witch.id)?.tiles ?? [];
    const openWater = (at: GameStateV7, to: CoordV7): number =>
      Math.min(
        ...at.board.tiles
          .filter(
            (tile) =>
              (tile.terrain === "SHALLOW_WATER" ||
                tile.terrain === "DEEP_WATER") &&
              tile.improvement === null &&
              !at.units.some(
                (unit) => unit.at.x === tile.at.x && unit.at.y === tile.at.y,
              ) &&
              !at.ice.some(
                (entry) => entry.at.x === tile.at.x && entry.at.y === tile.at.y,
              ),
          )
          .map((tile) =>
            Math.max(Math.abs(tile.at.x - to.x), Math.abs(tile.at.y - to.y)),
          ),
      );
    const castNewIce = () => {
      for (let round = 0; round < 8 && newIce(state).length === 0; round += 1) {
        if (active() !== ice.id) throw new Error("not the Ice Folk turn");
        const moves = offered().filter(
          (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
            command.kind === "MOVE" && command.unitId === witch.id,
        );
        const best = [...moves].sort(
          (left, right) =>
            openWater(state, left.path.at(-1) ?? witch.at) -
            openWater(state, right.path.at(-1) ?? witch.at),
        )[0];
        if (best !== undefined) play(best);
        if (newIce(state).length > 0) break;
        endRound();
      }
      const tiles = newIce(state);
      expect(tiles.length).toBeGreaterThan(0);
      for (const entry of state.ice) expect(tiles).not.toContainEqual(entry.at);
      play({ kind: "COLD_SNAP", unitId: witch.id });
      expect(
        [...events].reverse().find((event) => event.kind === "TILES_FROZEN"),
      ).toMatchObject({
        kind: "TILES_FROZEN",
        playerId: ice.id,
        unitId: witch.id,
        tiles,
      });
    };
    castNewIce();
    const midSave = createSaveEnvelopeV7(
      { state, replay },
      "2026-10-05T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(midSave))).toEqual({
      kind: "VALID",
      save: midSave,
    });
    const afterFreeze = state.ice;
    endRound();
    // No thaw: the ice is as it was.
    expect(state.ice).toEqual(afterFreeze);
    // A later turn: the Witch freezes more water.
    castNewIce();
    expect(state.ice.length).toBeGreaterThan(afterFreeze.length);
    endRound();
    endRound();
    expect(
      events.filter((event) => event.kind === "TILES_FROZEN"),
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
      state: { ice: { cracked: boolean }[] };
    };
    const first = tampered.state.ice[0];
    if (first === undefined) throw new Error("no ice");
    first.cracked = !first.cracked;
    expect(parseSaveV7(JSON.stringify(tampered)).kind).not.toBe("VALID");
  });
});
