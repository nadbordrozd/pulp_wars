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
  queryPlayerCommandsV7,
  runReplayV7,
  viewForV7,
  type CommandV7,
  type DomainEventV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerId,
} from "../../src/engine/index";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  bombV7,
  dwarfFieldV7,
  tunnelV7,
  withBurrowedV7,
} from "../fixtures/v7-dwarf";
import {
  endTurnUntilV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import { playV7 } from "../fixtures/v7-martian";
import { activeIdV7, at, unexploreV7 } from "../fixtures/v7-revision20";

// The Dwarf revision (`pulp_wars-78i.3`): persistence of the three Dwarf
// lists and the projection of the four Dwarf events
// (docs/product/RULESET_7_DWARVES.md sections 5.2, 13.11, 14, and 18).

const showcase: MatchSetupV7 = {
  rulesetId: RULESET_7_ID,
  seed: 1,
  width: 16,
  height: 16,
  aiCount: 3,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["DWARF", "ORIGINAL", "UNDEAD", "GOBLIN"],
  mapType: "SHOWCASE",
  mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V3",
  curiosities: false,
};

function projected(
  before: GameStateV7,
  after: GameStateV7,
  viewer: PlayerId,
  events: readonly DomainEventV7[],
  kind: string,
): readonly unknown[] {
  return projectEventsV7(before, after, viewer, events).events.filter(
    (event) => event.kind === kind,
  );
}

describe("Dwarf persistence (section 14)", () => {
  it("round-trips non-empty burrowed (a Mole alone and a Mole with its rider), surfaced, and bombed lists through parsing and hashing", () => {
    const base = withBurrowedV7(
      dwarfFieldV7([
        { seat: 0, role: "GUARD", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 0, role: "GUARD", at: at(2, 3) },
        { seat: 0, role: "FIGHTER", at: at(8, 2) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ]),
      [{ at: at(5, 3) }, { at: at(5, 2), moleAt: at(5, 3) }, { at: at(2, 3) }],
    );
    const state = checkedV7({
      ...base,
      surfacedThisTurn: [unitAtV7(base, at(8, 2)).id],
      bombedThisTurn: [unitAtV7(base, at(1, 1)).id],
    });
    expect(state.burrowed).toHaveLength(3);
    const parsed = parseGameStateV7(JSON.parse(JSON.stringify(state)));
    expect(parsed).toEqual(state);
    expect(canonicalHash(parsed)).toBe(canonicalHash(state));
    for (const key of [
      "burrowed",
      "surfacedThisTurn",
      "bombedThisTurn",
    ] as const)
      expect(canonicalHash({ ...state, [key]: [] }), key).not.toBe(
        canonicalHash(state),
      );
  });

  it("round-trips a Showcase match through a tunnel with a rider, an Assemble, and the surfacing in replay, save, and hashes", () => {
    const created = createPlayableGameV7(showcase);
    if (!created.ok) throw new Error(created.error.code);
    let state: GameStateV7 = created.state;
    let replay = createReplayV7(showcase);
    const dwarfId = seatIdV7(state, 0);
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
    const offered = () => queryPlayerCommandsV7(viewForV7(state, dwarfId));
    const assemble = offered().find((command) => command.kind === "ASSEMBLE");
    if (assemble === undefined) throw new Error("no Assemble");
    play(assemble);
    // A Hammerer steps next to the Mole when it can; then the Mole tunnels.
    const tunnel =
      offered().find(
        (command) => command.kind === "TUNNEL" && command.rider !== null,
      ) ?? offered().find((command) => command.kind === "TUNNEL");
    if (tunnel === undefined) throw new Error("no Tunnel");
    play(tunnel);
    expect(state.burrowed.length).toBeGreaterThan(0);
    // Save mid-tunnel.
    const midSave = createSaveEnvelopeV7(
      { state, replay },
      "2026-10-03T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(midSave))).toEqual({
      kind: "VALID",
      save: midSave,
    });
    for (let seat = 0; seat < 4; seat += 1) play({ kind: "END_TURN" });
    expect(state.turnOrder[state.activeSeatIndex]).toBe(dwarfId);
    expect(kinds.has("UNIT_SURFACED")).toBe(true);
    expect(kinds.has("UNIT_ASSEMBLED")).toBe(true);
    expect(state.burrowed).toEqual([]);
    expect(state.surfacedThisTurn.length).toBeGreaterThan(0);
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
    const tampered = JSON.parse(JSON.stringify(save)) as {
      state: Record<string, unknown>;
    };
    tampered.state.surfacedThisTurn = [];
    expect(parseSaveV7(JSON.stringify(tampered)).kind).not.toBe("VALID");
  });
});

describe("Dwarf event projection (section 13.11)", () => {
  it("projects a tunnel to viewers that explored both ends, one end, and neither", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "GUARD", at: at(5, 2) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const command = tunnelV7(state, at(5, 2), at(7, 4));
    const enemy = seatIdV7(state, 1);
    const run = (fogged: readonly { x: number; y: number }[]) => {
      const before = unexploreV7(state, 1, fogged);
      const result = applyCommandV7(before, activeIdV7(before), command);
      if (!result.accepted) throw new Error(result.error.code);
      return projected(
        before,
        result.state,
        enemy,
        result.events,
        "UNIT_TUNNELLED",
      );
    };
    const mole = unitAtV7(state, at(5, 2)).id;
    expect(run([])).toEqual([
      expect.objectContaining({ unitId: mole, from: at(5, 2), to: at(7, 4) }),
    ]);
    expect(run([at(5, 2)])).toEqual([
      expect.objectContaining({ unitId: mole, from: null, to: at(7, 4) }),
    ]);
    expect(run([at(5, 2), at(7, 4)])).toEqual([]);
  });

  it("projects a surfacing to its victims' owner even when the mound is hidden", () => {
    const state = withBurrowedV7(
      dwarfFieldV7([
        { seat: 0, role: "GUARD", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 4) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ]),
      [{ at: at(5, 3) }],
    );
    const enemy = seatIdV7(state, 1);
    const enemyTurn = endTurnUntilV7(state, enemy).state;
    const fogged = unexploreV7(enemyTurn, 1, [at(5, 3)]);
    const result = applyCommandV7(fogged, enemy, { kind: "END_TURN" });
    if (!result.accepted) throw new Error(result.error.code);
    const victim = unitAtV7(state, at(5, 4)).id;
    const seen = projected(
      fogged,
      result.state,
      enemy,
      result.events,
      "UNIT_SURFACED",
    );
    // The Mole surfaced into the victim's sight, so the viewer sees it after.
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      results: [expect.objectContaining({ unitId: victim })],
    });
  });

  it("projects a bomb to a viewer that sees both units and a lost target to its owner as damage", () => {
    const open = dwarfFieldV7([
      { seat: 0, role: "RAIDER", at: at(5, 2) },
      { seat: 1, role: "FIGHTER", at: at(5, 4), hp: 2 },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const enemy = seatIdV7(open, 1);
    // A unit on an explored tile is seen: the target's owner sees both.
    const seen = playV7(open, bombV7(open, at(5, 2), at(5, 4), at(4, 5)));
    expect(
      projected(open, seen.state, enemy, seen.events, "UNIT_BOMBED"),
    ).toHaveLength(1);
    // With the Gyrocopter's tiles unexplored, the owner of the killed
    // target receives the damage only.
    const state = unexploreV7(open, 1, [at(5, 2), at(4, 5)]);
    const result = playV7(state, bombV7(state, at(5, 2), at(5, 4), at(4, 5)));
    const events = projectEventsV7(
      state,
      result.state,
      enemy,
      result.events,
    ).events;
    expect(events.some((event) => event.kind === "UNIT_BOMBED")).toBe(false);
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: "COMBAT_SPLASH_DAMAGE",
        splash: [expect.objectContaining({ dies: true })],
      }),
    );
    const own = projectEventsV7(
      state,
      result.state,
      activeIdV7(state),
      result.events,
    ).events;
    expect(own.some((event) => event.kind === "UNIT_BOMBED")).toBe(true);
  });

  it("keeps an Assemble owner-private, like training", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "CAPTAIN", at: at(5, 2) },
      { seat: 1, role: "FIGHTER", at: at(5, 4) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const result = playV7(state, {
      kind: "ASSEMBLE",
      unitId: unitAtV7(state, at(5, 2)).id,
      to: at(5, 3),
    });
    expect(
      projected(
        state,
        result.state,
        seatIdV7(state, 1),
        result.events,
        "UNIT_ASSEMBLED",
      ),
    ).toEqual([]);
    expect(
      projected(
        state,
        result.state,
        activeIdV7(state),
        result.events,
        "UNIT_ASSEMBLED",
      ),
    ).toHaveLength(1);
  });
});
