import { describe, expect, it } from "vitest";
import {
  AI_HEAD_START_COINS_V7,
  RULESET_7,
  aiHeadStartCoinsV7,
  appendReplayCommandV7,
  applyCommandV7,
  canonicalJson,
  createPlayableGameV7,
  createReplayV7,
  missionByIdV7,
  missionMatchSetupV7,
  parseGameStateV7,
  queryPlayerCommandsV7,
  runReplayV7,
  validateMatchSetupV7,
  viewForV7,
  type CommandV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerId,
} from "../../src/engine/index";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/index";
import {
  NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
  chooseNormalTurnCommandV7,
} from "../../src/ai/v7";
import {
  AI_HEAD_START_COINS_STORAGE_KEY_V7,
  loadAiHeadStartCoinsPreferenceV7,
  storeAiHeadStartCoinsPreferenceV7,
} from "../../src/app/ai-head-start-preference-v7";
import {
  AI_HEAD_START_CHOICES_V7,
  AI_HEAD_START_CHOICE_LABELS_V7,
  aiHeadStartOfMatchV7,
} from "../../src/render/ai-head-start-presentation-v7";
import { tribeStarResultV7 } from "../../src/persistence/tribe-stars-v7";
import { browserSetupV7 } from "../fixtures/v7-builders";

/**
 * AI head start (`pulp_wars-w49.39`): the optional setup key
 * `aiHeadStart: { coins }`, the extra starting Coins of every AI seat. No
 * match is played: setups, created states, one save, and one AI turn.
 */
function created(setup: MatchSetupV7): GameStateV7 {
  const game = createPlayableGameV7(setup);
  if (!game.ok) throw new Error(game.error.code);
  return game.state;
}

const withCoins = (setup: MatchSetupV7, coins: 5 | 10 | 20): MatchSetupV7 => ({
  ...setup,
  aiHeadStart: { coins },
});

describe("AI head start: the setup", () => {
  it("accepts 5, 10 and 20 Coins and keeps a setup without the key as it is", () => {
    const plain = browserSetupV7(91);
    const parsed = validateMatchSetupV7(plain);
    expect(parsed.ok && "aiHeadStart" in parsed.setup).toBe(false);
    expect(aiHeadStartCoinsV7(plain)).toBe(0);
    expect(AI_HEAD_START_COINS_V7).toEqual([5, 10, 20]);
    for (const coins of AI_HEAD_START_COINS_V7) {
      const result = validateMatchSetupV7(withCoins(plain, coins));
      expect(result.ok && result.setup.aiHeadStart).toEqual({ coins });
      expect(result.ok && aiHeadStartCoinsV7(result.setup)).toBe(coins);
    }
    // With the play mode too, in either order of keys.
    const both = validateMatchSetupV7({
      aiHeadStart: { coins: 10 },
      ...plain,
      gameMode: "PERFECTION",
    });
    expect(both.ok && both.setup).toMatchObject({
      gameMode: "PERFECTION",
      aiHeadStart: { coins: 10 },
    });
  });

  it("refuses any other head start", () => {
    const plain = browserSetupV7(92);
    for (const aiHeadStart of [
      null,
      undefined,
      0,
      20,
      "20",
      {},
      [],
      { coins: 0 },
      { coins: 7 },
      { coins: "5" },
      { coins: -5 },
      { coins: 5, technology: 1 },
      { technology: 1 },
    ])
      expect(
        validateMatchSetupV7({ ...plain, aiHeadStart }).ok,
        JSON.stringify(aiHeadStart),
      ).toBe(false);
  });

  it("never applies to the Showcase or a mission", () => {
    const showcase: MatchSetupV7 = {
      ...browserSetupV7(93),
      width: 16,
      height: 16,
      mapType: "SHOWCASE",
    };
    expect(validateMatchSetupV7(showcase).ok).toBe(true);
    expect(validateMatchSetupV7(withCoins(showcase, 5)).ok).toBe(false);
    const mission = missionByIdV7("LAB_DWARF_MID");
    if (mission === null) throw new Error("no mission");
    const setup = missionMatchSetupV7(mission);
    if (setup === null) throw new Error("no mission setup");
    expect(validateMatchSetupV7(setup).ok).toBe(true);
    expect(validateMatchSetupV7(withCoins(setup, 5)).ok).toBe(false);
    expect(aiHeadStartOfMatchV7(showcase)).toBeNull();
    expect(aiHeadStartOfMatchV7(setup)).toBeNull();
  });
});

describe("AI head start: the created match", () => {
  it("adds the Coins to every AI seat and never to seat 0, and changes nothing else", () => {
    const start = RULESET_7.startingCoins;
    expect(start).toBe(3);
    const cases: readonly MatchSetupV7[] = [
      browserSetupV7(94),
      { ...browserSetupV7(94, 3), gameMode: "PERFECTION" },
      { ...browserSetupV7(95, 2), mapType: "CONTINENTS", curiosities: true },
    ];
    for (const setup of cases) {
      const plain = created(setup);
      // The seat that moves first has already collected its first income.
      const first = plain.turnOrder[plain.activeSeatIndex];
      for (const player of plain.players)
        if (player.id !== first) expect(player.coins).toBe(start);
      for (const coins of AI_HEAD_START_COINS_V7) {
        const ahead = created(withCoins(setup, coins));
        expect(ahead.setup.aiHeadStart).toEqual({ coins });
        expect(
          ahead.players.map((player) => [player.controller, player.coins]),
        ).toEqual(
          plain.players.map((player) =>
            player.seat === 0
              ? ["HUMAN", player.coins]
              : ["AI", player.coins + coins],
          ),
        );
        // The same map, units and turn order: only the setup key and the
        // AI seats' Coins differ.
        expect(
          canonicalJson({
            ...ahead,
            setup: plain.setup,
            players: plain.players,
            scoreLedger: plain.scoreLedger,
          }),
        ).toBe(canonicalJson(plain));
      }
    }
  });

  it("shows the head start in the view and keeps it through a state copy, a save and a replay", () => {
    const setup = withCoins(browserSetupV7(96), 10);
    let state = created(setup);
    let replay = createReplayV7(setup);
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) throw new Error("no active seat");
    const result = applyCommandV7(state, actor, { kind: "END_TURN" });
    if (!result.accepted) throw new Error(result.error.code);
    state = result.state;
    replay = appendReplayCommandV7(replay, { kind: "END_TURN" }, state);
    expect(viewForV7(state, state.humanPlayerId).setup.aiHeadStart).toEqual({
      coins: 10,
    });
    expect(aiHeadStartOfMatchV7(state.setup)).toBe("+10 Coins");
    expect(aiHeadStartOfMatchV7(browserSetupV7(96))).toBe("None");
    const copy = parseGameStateV7(JSON.parse(JSON.stringify(state)));
    expect(canonicalJson(copy)).toBe(canonicalJson(state));
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-10-10T12:00:00.000Z",
    );
    const loaded = parseSaveV7(JSON.stringify(save));
    expect(loaded.kind).toBe("VALID");
    if (loaded.kind !== "VALID") return;
    expect(loaded.save.setup.aiHeadStart).toEqual({ coins: 10 });
    expect(canonicalJson(loaded.save.state)).toBe(canonicalJson(state));
    const replayed = runReplayV7(JSON.parse(JSON.stringify(replay)));
    expect(canonicalJson(replayed.state.players)).toBe(
      canonicalJson(state.players),
    );
    // A stored state whose setup has a malformed head start is refused.
    expect(
      parseGameStateV7({
        ...structuredClone(state),
        setup: { ...state.setup, aiHeadStart: { coins: 11 } },
      }),
    ).toBeNull();
  });

  it("records nothing about the head start in the tribe stars", () => {
    // Stars and records today: a result holds the mode, tribe, stars, glow
    // and rating only, so a win against a head start records as any win.
    const state = created(withCoins(browserSetupV7(97), 20));
    expect(tribeStarResultV7(state)).toBeNull();
  });
});

describe("AI head start: the Normal AI spends it", () => {
  // One AI seat's first turn from the created position, with and without
  // +20 Coins: the same map, one policy turn each, no match.
  // A purchase is any command that lowers the seat's Coins.
  const coinsOf = (state: GameStateV7, actor: PlayerId): number =>
    state.players.find((player) => player.id === actor)?.coins ?? 0;
  const purchase = (
    state: GameStateV7,
    actor: PlayerId,
    command: CommandV7,
  ): boolean => {
    const result = applyCommandV7(state, actor, command);
    return (
      result.accepted && coinsOf(result.state, actor) < coinsOf(state, actor)
    );
  };

  function firstTurn(state: GameStateV7) {
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined || actor === state.humanPlayerId)
      throw new Error("an AI seat must move first");
    const before = coinsOf(state, actor);
    // The most purchases offered at any decision of the turn (the opening
    // research is free, so the first decision offers none either way).
    let offered = 0;
    let taken = 0;
    let current = state;
    for (let count = 0; ; count += 1) {
      expect(count).toBeLessThan(NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7);
      const view = viewForV7(current, actor);
      const commands = queryPlayerCommandsV7(view);
      const position = current;
      offered = Math.max(
        offered,
        commands.filter((entry) => purchase(position, actor, entry)).length,
      );
      const command = chooseNormalTurnCommandV7(view, count);
      if (command === null) throw new Error("the AI offered no command");
      // The policy only ever takes an offered command.
      expect(commands).toContainEqual(command);
      const result = applyCommandV7(current, actor, command);
      if (!result.accepted) throw new Error(result.error.code);
      if (command.kind === "END_TURN") break;
      if (coinsOf(result.state, actor) < coinsOf(current, actor)) taken += 1;
      current = result.state;
    }
    const after = coinsOf(current, actor);
    return { offered, taken, spent: before - after };
  }

  it("is offered and takes more purchases on its first turn with +20 Coins than with none", () => {
    const setup = [101, 102, 103, 104, 105, 106, 107, 108]
      .map((seed) => browserSetupV7(seed))
      .find((candidate) => {
        const state = created(candidate);
        return state.turnOrder[state.activeSeatIndex] !== state.humanPlayerId;
      });
    if (setup === undefined) throw new Error("no seed with an AI seat first");
    const plain = firstTurn(created(setup));
    const ahead = firstTurn(created(withCoins(setup, 20)));
    expect(ahead.offered).toBeGreaterThan(plain.offered);
    expect(ahead.taken).toBeGreaterThan(plain.taken);
    expect(ahead.spent).toBeGreaterThan(plain.spent);
  });
});

describe("AI head start: the new-game choice", () => {
  class MemoryStorage {
    readonly values = new Map<string, string>();
    getItem(key: string): string | null {
      return this.values.get(key) ?? null;
    }
    setItem(key: string, value: string): void {
      this.values.set(key, value);
    }
    removeItem(key: string): void {
      this.values.delete(key);
    }
  }

  it("offers None and the three amounts in few words", () => {
    expect(AI_HEAD_START_CHOICES_V7).toEqual([0, 5, 10, 20]);
    expect(AI_HEAD_START_CHOICE_LABELS_V7).toEqual({
      "0": "None",
      "5": "+5 Coins",
      "10": "+10 Coins",
      "20": "+20 Coins",
    });
  });

  it("remembers the choice per browser and reads anything else as None", () => {
    const storage = new MemoryStorage();
    expect(loadAiHeadStartCoinsPreferenceV7(storage)).toBe(0);
    expect(loadAiHeadStartCoinsPreferenceV7(null)).toBe(0);
    for (const coins of AI_HEAD_START_CHOICES_V7) {
      expect(storeAiHeadStartCoinsPreferenceV7(storage, coins)).toBe(true);
      expect(loadAiHeadStartCoinsPreferenceV7(storage)).toBe(coins);
    }
    for (const stored of ["", "7", "five", "05", "20 "]) {
      storage.setItem(AI_HEAD_START_COINS_STORAGE_KEY_V7, stored);
      expect(loadAiHeadStartCoinsPreferenceV7(storage)).toBe(0);
    }
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => undefined,
    };
    expect(loadAiHeadStartCoinsPreferenceV7(broken)).toBe(0);
    expect(storeAiHeadStartCoinsPreferenceV7(broken, 5)).toBe(false);
  });
});
