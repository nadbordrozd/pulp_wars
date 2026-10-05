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
  showcaseStripCenterXV7,
  viewForV7,
  type CommandV7,
  type DomainEventV7,
  type GameStateV7,
  type MatchSetupV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/index";
import {
  navalArenaV7,
  navalUnitAtV7,
  patchNavalUnitV7,
} from "../fixtures/v7-naval-branch";

// The naval branch, engine step I (`pulp_wars-5ti.2`,
// docs/product/RULESET_7_NAVAL_BRANCH.md sections 3.2 and 12): the state,
// event, replay, and save shapes of the Submarine, the Ram, and a boarded
// prize.

const SHOWCASE: MatchSetupV7 = {
  rulesetId: RULESET_7_ID,
  seed: 1,
  width: 16,
  height: 16,
  aiCount: 3,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["ORIGINAL", "UNDEAD", "GOBLIN", "DINOSAUR"],
  mapType: "SHOWCASE",
  mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
  curiosities: false,
};

describe("naval branch persistence", () => {
  it("round-trips a Showcase match with a torpedo, a Ram, and a boarded prize through replay, save, and hashes", () => {
    const created = createPlayableGameV7(SHOWCASE);
    if (!created.ok) throw new Error(created.error.code);
    let state: GameStateV7 = created.state;
    let replay = createReplayV7(SHOWCASE);
    const events: DomainEventV7[] = [];
    const play = (command: CommandV7) => {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined) throw new Error("no actor");
      // Every command played is one the public query offers.
      expect(
        queryPlayerCommandsV7(viewForV7(state, actor)),
        command.kind,
      ).toContainEqual(command);
      const result = applyCommandV7(state, actor, command);
      if (!result.accepted)
        throw new Error(`${command.kind}: ${result.error.code}`);
      for (const event of result.events) {
        expect(parseEventV7(event).ok, event.kind).toBe(true);
        events.push(event);
      }
      state = result.state;
      replay = appendReplayCommandV7(replay, command, state);
    };
    const endRound = () => {
      for (let seat = 0; seat < 4; seat += 1) play({ kind: "END_TURN" });
    };
    /** Plays the offered Move of `unitId` that ends on `(x, y)`. */
    const moveTo = (unitId: UnitStateV7["id"], x: number, y: number) => {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined) throw new Error("no actor");
      const move = queryPlayerCommandsV7(viewForV7(state, actor)).find(
        (command) =>
          command.kind === "MOVE" &&
          command.unitId === unitId &&
          command.path.at(-1)?.x === x &&
          command.path.at(-1)?.y === y,
      );
      if (move === undefined) throw new Error(`no Move to ${x},${y}`);
      play(move);
    };
    const human = state.players[0];
    const rival = state.players[1];
    if (human === undefined || rival === undefined) throw new Error("seats");
    const cx = showcaseStripCenterXV7(0, 3);
    const rx = showcaseStripCenterXV7(1, 3);
    expect([cx, rx]).toEqual([2, 6]);
    const at = (x: number, y: number): UnitStateV7 => {
      const unit = state.units.find(
        (entry) => entry.at.x === x && entry.at.y === y,
      );
      if (unit === undefined) throw new Error(`no unit at ${x},${y}`);
      return unit;
    };
    const submarine = at(cx + 1, 13);
    const boat = at(cx, 12);
    const rivalBoat = at(rx, 12);
    const rivalBattleship = at(rx, 13);
    expect([submarine.role, boat.role]).toEqual(["SUBMARINE", "PATROL_BOAT"]);
    expect([rivalBoat.role, rivalBattleship.role]).toEqual([
      "PATROL_BOAT",
      "BATTLESHIP",
    ]);
    // Turn 1: the Submarine closes in and torpedoes the Battleship (9); the
    // Patrol Boat sails toward the rival's dock.
    moveTo(submarine.id, cx + 3, 13);
    play({
      kind: "ATTACK",
      unitId: submarine.id,
      targetUnitId: rivalBattleship.id,
    });
    moveTo(boat.id, cx + 2, 12);
    endRound();
    // Turn 2: the Patrol Boat sails onto the rival's Port and rams the
    // rival Patrol Boat (8, leaving 2; the Shipyard behind it blocks the
    // shove); the Submarine beside it boards the crippled boat at once.
    moveTo(boat.id, cx + 3, 12);
    play({ kind: "ATTACK", unitId: boat.id, targetUnitId: rivalBoat.id });
    const midSave = createSaveEnvelopeV7(
      { state, replay },
      "2026-10-05T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(midSave))).toEqual({
      kind: "VALID",
      save: midSave,
    });
    play({
      kind: "BOARD",
      unitId: submarine.id,
      targetUnitId: rivalBoat.id,
    });
    endRound();
    const combats = events.flatMap((event) =>
      event.kind === "COMBAT_RESOLVED" ? [event.preview] : [],
    );
    expect(
      combats.map((preview) => [
        preview.torpedo,
        preview.ram,
        preview.damageToDefender,
        preview.damageToAttacker,
        preview.push,
      ]),
    ).toEqual([
      [true, false, 9, 0, "BLOCKED"],
      [false, true, 8, 4, "BLOCKED"],
    ]);
    expect(
      events.flatMap((event) =>
        event.kind === "SHIP_BOARDED"
          ? [[event.unitId, event.targetUnitId, event.fromPlayerId, event.hp]]
          : [],
      ),
    ).toEqual([[submarine.id, rivalBoat.id, rival.id, 4]]);
    // A round later the prize is still the captor's orphan: it is never
    // re-homed, and nothing gives it back.
    expect(state.units.find((unit) => unit.id === rivalBoat.id)).toMatchObject({
      ownerId: human.id,
      homeCityId: null,
      role: "PATROL_BOAT",
      form: "NAVAL",
      maxHp: rivalBoat.maxHp,
    });
    expect(
      state.units.find((unit) => unit.id === rivalBattleship.id)?.ownerId,
    ).toBe(rival.id);
    // The state, its JSON round trip, the replay, and the save agree.
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
    // A save whose prize went back to its former owner no longer verifies.
    const tampered = JSON.parse(JSON.stringify(save)) as {
      state: { units: { id: number; ownerId: number }[] };
    };
    const stolen = tampered.state.units.find(
      (unit) => unit.id === rivalBoat.id,
    );
    if (stolen === undefined) throw new Error("prize missing");
    stolen.ownerId = rival.id;
    expect(parseSaveV7(JSON.stringify(tampered)).kind).not.toBe("VALID");
  });

  it("rejects a ship role in a land form, a land role in the naval form, and an unknown role or technology", () => {
    const state = navalArenaV7({
      units: [
        { seat: 0, role: "SUBMARINE", at: { x: 2, y: 4 } },
        { seat: 0, role: "RAIDER", at: { x: 2, y: 1 } },
      ],
    });
    expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const submarine = navalUnitAtV7(state, { x: 2, y: 4 });
    const raider = navalUnitAtV7(state, { x: 2, y: 1 });
    const withUnit = (id: number, patch: Record<string, unknown>) => ({
      ...state,
      units: state.units.map((unit) =>
        unit.id === id ? { ...unit, ...patch } : unit,
      ),
    });
    expect(
      parseGameStateV7(withUnit(submarine.id, { form: "LAND" })),
    ).toBeNull();
    expect(
      parseGameStateV7(withUnit(submarine.id, { form: "EMBARKED" })),
    ).toBeNull();
    expect(
      parseGameStateV7(
        withUnit(raider.id, { form: "NAVAL", at: { x: 3, y: 4 } }),
      ),
    ).toBeNull();
    expect(
      parseGameStateV7(withUnit(submarine.id, { role: "IRONCLAD" })),
    ).toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        players: state.players.map((player, index) =>
          index === 0
            ? {
                ...player,
                researchedTechs: [...player.researchedTechs, "IRONCLADS"],
              }
            : player,
        ),
      }),
    ).toBeNull();
    // A wounded, promoted orphan Submarine is an ordinary valid unit.
    const orphan = patchNavalUnitV7(state, submarine.id, {
      homeCityId: null,
      maxHp: 17,
      hp: 6,
      veteran: true,
      kills: 3,
    });
    expect(parseGameStateV7(JSON.parse(JSON.stringify(orphan)))).toEqual(
      orphan,
    );
  });

  it("parses SHIP_BOARDED and the new COMBAT_RESOLVED fields strictly", () => {
    const boarded = {
      kind: "SHIP_BOARDED",
      playerId: 1,
      unitId: 7,
      targetUnitId: 9,
      fromPlayerId: 2,
      at: { x: 5, y: 5 },
      hp: 4,
    };
    expect(parseEventV7(boarded)).toEqual({ ok: true, value: boarded });
    for (const bad of [
      { ...boarded, hp: 0 },
      { ...boarded, fromPlayerId: 1 },
      { ...boarded, targetUnitId: 7 },
      { ...boarded, at: null },
      { ...boarded, role: "PATROL_BOAT" },
      Object.fromEntries(
        Object.entries(boarded).filter(([key]) => key !== "fromPlayerId"),
      ),
    ])
      expect(parseEventV7(bad).ok).toBe(false);
    // A real ramming exchange, then tampered copies.
    const arena = navalArenaV7({
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 4 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 2, y: 6 } },
      ],
    });
    const boat = navalUnitAtV7(arena, { x: 2, y: 4 });
    const target = navalUnitAtV7(arena, { x: 2, y: 6 });
    const moved = applyCommandV7(arena, boat.ownerId, {
      kind: "MOVE",
      unitId: boat.id,
      path: [{ x: 2, y: 5 }],
    });
    if (!moved.accepted) throw new Error(moved.error.code);
    const hit = applyCommandV7(moved.state, boat.ownerId, {
      kind: "ATTACK",
      unitId: boat.id,
      targetUnitId: target.id,
    });
    if (!hit.accepted) throw new Error(hit.error.code);
    const combat = hit.events.find((event) => event.kind === "COMBAT_RESOLVED");
    if (combat?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
    expect(combat.preview).toMatchObject({ ram: true, torpedo: false });
    expect(parseEventV7(combat).ok).toBe(true);
    const preview = combat.preview as unknown as Record<string, unknown>;
    const withPreview = (patch: Record<string, unknown>) => ({
      kind: "COMBAT_RESOLVED",
      preview: { ...preview, ...patch },
    });
    const without = (key: string) => ({
      kind: "COMBAT_RESOLVED",
      preview: Object.fromEntries(
        Object.entries(preview).filter(([name]) => name !== key),
      ),
    });
    expect(parseEventV7(without("ram")).ok).toBe(false);
    expect(parseEventV7(without("torpedo")).ok).toBe(false);
    expect(parseEventV7(withPreview({ ram: 1 })).ok).toBe(false);
    // A ship is never both, and a torpedo is never answered.
    expect(parseEventV7(withPreview({ torpedo: true })).ok).toBe(false);
    expect(parseEventV7(withPreview({ ram: false, torpedo: true })).ok).toBe(
      false,
    );
  });
});
