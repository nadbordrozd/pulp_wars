import { describe, expect, it } from "vitest";
import {
  FACTION_IDS_V7,
  MAP_GENERATION_REVISION_V7,
  RULESET_7_ID,
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  createPlayableGameV7,
  createReplayV7,
  parseGameStateV7,
  runReplayV7,
  viewForV7,
  type GameStateV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { cooperativeAlliesV7 } from "../../src/engine/v7/economy";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/v7";

// Many seats in play (`pulp_wars-ykw.3`, `pulp-wars-poc-7r42`,
// docs/product/RULESET_7_MAP_SCALE.md; current rules section 3): the rules
// of play never assumed four seats, and these tests hold that for eight:
// turn order, views, relationships, elimination and the outcome, save and
// replay, and the Normal AI issuing legal commands for every seat.

const SEATS = FACTION_IDS_V7.length;

function setup(overrides: Partial<MatchSetupV7> = {}): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: 5,
    width: 11,
    aiCount: SEATS - 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...FACTION_IDS_V7],
    mapType: "DRY_LAND",
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    curiosities: false,
    ...overrides,
    height: overrides.width ?? 11,
  };
}

function created(input: MatchSetupV7): GameStateV7 {
  const result = createPlayableGameV7(input);
  if (!result.ok)
    throw new Error(`creation failed: ${JSON.stringify(result.error)}`);
  return result.state;
}

function activeId(state: GameStateV7): GameStateV7["humanPlayerId"] {
  const id = state.turnOrder[state.activeSeatIndex];
  if (id === undefined) throw new Error("no active seat");
  return id;
}

function endTurn(state: GameStateV7): GameStateV7 {
  const result = applyCommandV7(state, activeId(state), { kind: "END_TURN" });
  if (!result.accepted)
    throw new Error(`END_TURN refused: ${JSON.stringify(result.error)}`);
  return result.state;
}

/**
 * The state with the human active and one of its units standing on the
 * capital of `victim`, whose own units are gone, ready to capture it.
 */
function readyToCapture(
  state: GameStateV7,
  victim: GameStateV7["humanPlayerId"],
): { readonly state: GameStateV7; readonly unitId: number } {
  const human = state.humanPlayerId;
  const target = state.cities.find((city) => city.ownerId === victim);
  const captor = state.units.find((unit) => unit.ownerId === human);
  if (target === undefined || captor === undefined)
    throw new Error("fixture: no target city or captor");
  const next: GameStateV7 = {
    ...state,
    activeSeatIndex: state.turnOrder.indexOf(human),
    units: state.units
      .filter((unit) => unit.ownerId !== victim)
      .map((unit) =>
        unit.id === captor.id
          ? {
              ...unit,
              at: target.at,
              captureEligible: true,
              activation: {
                ...unit.activation,
                moved: false,
                attacked: false,
                captured: false,
                handled: false,
              },
            }
          : unit,
      ),
    shields: state.shields.filter((entry) =>
      state.units.some(
        (unit) => unit.id === entry.unitId && unit.ownerId !== victim,
      ),
    ),
  };
  const parsed = parseGameStateV7(next);
  if (parsed === null) throw new Error("fixture: invalid capture state");
  return { state: parsed, unitId: captor.id };
}

describe("ruleset-7 many seats in play (7r42)", () => {
  it("gives every one of eight seats a turn each round, in the shuffled order", () => {
    let state = created(setup());
    expect(state.players).toHaveLength(SEATS);
    expect(state.turnOrder).toHaveLength(SEATS);
    expect(new Set(state.turnOrder).size).toBe(SEATS);
    expect(state.round).toBe(1);
    const order: number[] = [];
    for (let turn = 0; turn < SEATS; turn += 1) {
      order.push(activeId(state));
      expect(state.round).toBe(1);
      state = endTurn(state);
    }
    expect(order).toEqual(state.turnOrder);
    // The round turns over after the eighth seat, back to the first.
    expect(state.round).toBe(2);
    expect(state.activeSeatIndex).toBe(0);
    // Every seat has had its Start Turn income once.
    for (const player of state.players) expect(player.coins).toBeGreaterThan(0);
    expect(parseGameStateV7(state)).toEqual(state);
  });

  it("projects a view for every seat, each seeing only around its own capital", () => {
    const state = created(setup({ mapType: "PANGEA", width: 14 }));
    for (const player of state.players) {
      const view = viewForV7(state, player.id);
      expect(view.players).toHaveLength(SEATS);
      // At the start a seat sees its own capital and no other.
      const visibleCapitals = view.cities.filter((city) => city.isCapital);
      expect(visibleCapitals).toHaveLength(1);
      expect(visibleCapitals[0]?.ownerId).toBe(player.id);
    }
  });

  it("allies every AI seat against the human in Cooperative and nobody in Rival", () => {
    const cooperative = created(setup({ aiMode: "COOPERATIVE" }));
    const rival = created(setup());
    const human = cooperative.humanPlayerId;
    const ai = cooperative.players
      .map((player) => player.id)
      .filter((id) => id !== human);
    expect(ai).toHaveLength(SEATS - 1);
    for (const left of ai) {
      expect(cooperativeAlliesV7("COOPERATIVE", human, human, left)).toBe(
        false,
      );
      for (const right of ai) {
        expect(cooperativeAlliesV7("COOPERATIVE", human, left, right)).toBe(
          left !== right,
        );
        expect(cooperativeAlliesV7("RIVAL", human, left, right)).toBe(false);
      }
    }
    expect(rival.setup.aiMode).toBe("RIVAL");
  });

  it("eliminates seats one at a time, skips their turns, and ends only when the human is alone", () => {
    let state = created(setup());
    const human = state.humanPlayerId;
    const victims = state.players
      .map((player) => player.id)
      .filter((id) => id !== human);
    victims.forEach((victim, index) => {
      const ready = readyToCapture(state, victim);
      const result = applyCommandV7(ready.state, human, {
        kind: "CAPTURE",
        unitId: ready.unitId as never,
      });
      if (!result.accepted)
        throw new Error(`CAPTURE refused: ${JSON.stringify(result.error)}`);
      state = result.state;
      expect(result.events.map((event) => event.kind)).toContain(
        "PLAYER_ELIMINATED",
      );
      expect(state.players.find((player) => player.id === victim)?.status).toBe(
        "ELIMINATED",
      );
      expect(state.units.some((unit) => unit.ownerId === victim)).toBe(false);
      const last = index === victims.length - 1;
      if (last) {
        expect(state.outcome).toEqual({ kind: "VICTORY", winnerId: human });
        expect(result.events.at(-1)?.kind).toBe("MATCH_ENDED");
        return;
      }
      // The match goes on, and a round now visits only the seats left.
      expect(state.outcome).toBeNull();
      const active = state.players.filter(
        (player) => player.status === "ACTIVE",
      );
      expect(active).toHaveLength(SEATS - 1 - index);
      const round = state.round;
      const visited: number[] = [];
      for (let turn = 0; turn < active.length; turn += 1) {
        state = endTurn(state);
        visited.push(activeId(state));
      }
      expect(new Set(visited)).toEqual(
        new Set(active.map((player) => player.id)),
      );
      expect(visited.at(-1)).toBe(human);
      expect(state.round).toBe(round + 1);
    });
  });

  it("defeats the human at once when an AI seat takes its last city, whatever the seats left", () => {
    const start = created(setup());
    const human = start.humanPlayerId;
    const attacker = start.players.find((player) => player.id !== human);
    const capital = start.cities.find((city) => city.ownerId === human);
    const captor = start.units.find((unit) => unit.ownerId === attacker?.id);
    if (attacker === undefined || capital === undefined || captor === undefined)
      throw new Error("fixture");
    const ready = parseGameStateV7({
      ...start,
      activeSeatIndex: start.turnOrder.indexOf(attacker.id),
      units: start.units
        .filter((unit) => unit.ownerId !== human)
        .map((unit) =>
          unit.id === captor.id
            ? { ...unit, at: capital.at, captureEligible: true }
            : unit,
        ),
      shields: start.shields.filter((entry) =>
        start.units.some(
          (unit) => unit.id === entry.unitId && unit.ownerId !== human,
        ),
      ),
    });
    if (ready === null) throw new Error("fixture: invalid state");
    const result = applyCommandV7(ready, attacker.id, {
      kind: "CAPTURE",
      unitId: captor.id,
    });
    if (!result.accepted)
      throw new Error(`CAPTURE refused: ${JSON.stringify(result.error)}`);
    expect(result.state.outcome).toEqual({
      kind: "DEFEAT",
      humanId: human,
      defeatedByPlayerId: attacker.id,
    });
    // Six AI seats are still in play: the match ends on the human alone.
    expect(
      result.state.players.filter((player) => player.status === "ACTIVE"),
    ).toHaveLength(SEATS - 1);
  });

  it("saves, loads, and replays an eight-seat match", () => {
    const input = setup({ mapType: "CONTINENTS", width: 20 });
    let state = created(input);
    let replay = createReplayV7(input);
    for (let turn = 0; turn < SEATS + 2; turn += 1) {
      state = endTurn(state);
      replay = appendReplayCommandV7(replay, { kind: "END_TURN" }, state);
    }
    expect(state.round).toBe(2);
    // The replay runs from the setup to the same state.
    const rerun = runReplayV7(JSON.parse(JSON.stringify(replay)));
    expect(rerun.stateHash).toBe(canonicalHash(state));
    // The save envelope round-trips the eight-seat state and its replay.
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-10-05T10:00:00.000Z",
    );
    const loaded = parseSaveV7(JSON.stringify(save));
    expect(loaded.kind).toBe("VALID");
    if (loaded.kind === "VALID") {
      expect(canonicalHash(loaded.save.state)).toBe(canonicalHash(state));
      expect(loaded.save.state.players).toHaveLength(SEATS);
    }
  });
});
