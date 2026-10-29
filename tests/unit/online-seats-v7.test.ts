import { describe, expect, it } from "vitest";
import { aiPersonalityForViewV7 } from "../../src/ai/v7-personality";
import { leaderboardRegularGameV7 } from "../../src/app/leaderboard-v7";
import { playerId, type PlayerId } from "../../src/engine/model/ids";
import { canonicalJson } from "../../src/engine/replay/canonical";
import { cooperativeAlliesV7 } from "../../src/engine/v7/economy";
import { gameKindOfV7, isRegularGameV7 } from "../../src/engine/v7/game-kind";
import { eliminationOutcomeV7 } from "../../src/engine/v7/reducer";
import { validateMatchSetupV7 } from "../../src/engine/v7/setup";
import { parseGameStateV7 } from "../../src/engine/v7/state-schema";
import {
  humanSeatsOfV7,
  isHumanPlayerIdV7,
  type GameStateV7,
  type MatchSetupV7,
} from "../../src/engine/v7/types";
import { viewForV7 } from "../../src/engine/v7/view";
import { setupV7 } from "../fixtures/v7-builders";
import { onlineSetupFixtureV7, onlineStateFixtureV7 } from "./online-v7.shared";

/** A distinct-faction solo setup (no mirror flag). */
function soloSetup(): MatchSetupV7 {
  const { allowDuplicateFactions: _mirror, ...rest } = setupV7(7, 2);
  void _mirror;
  return { ...rest, factions: ["ORIGINAL", "UNDEAD", "GOBLIN"] };
}

describe("online multiplayer seats (pulp_wars-eqc6.1, 7r120)", () => {
  it("keeps a setup without humanSeats exactly as it was", () => {
    const solo = soloSetup();
    const validated = validateMatchSetupV7(solo);
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    expect(canonicalJson(validated.setup)).toBe(canonicalJson(solo));
    expect("humanSeats" in validated.setup).toBe(false);
    expect(humanSeatsOfV7(validated.setup)).toEqual([0]);
  });

  it("accepts two human seats and refuses malformed or misplaced ones", () => {
    const solo = soloSetup();
    const ok = validateMatchSetupV7({ ...solo, humanSeats: [0, 1] });
    expect(ok.ok && ok.setup.humanSeats).toEqual([0, 1]);
    expect(validateMatchSetupV7({ ...solo, humanSeats: [0, 2] }).ok).toBe(true);
    for (const humanSeats of [
      [0],
      [1, 2],
      [0, 0],
      [0, 2, 1],
      [0, 3],
      [0, 1.5],
      "0,1",
      null,
    ])
      expect(validateMatchSetupV7({ ...solo, humanSeats }).ok).toBe(false);
    // Never a mirror setup, a Regular game, the Showcase or a mission.
    expect(
      validateMatchSetupV7({
        ...solo,
        humanSeats: [0, 1],
        allowDuplicateFactions: true,
      }).ok,
    ).toBe(false);
    expect(
      validateMatchSetupV7({ ...solo, humanSeats: [0, 1], gameKind: "REGULAR" })
        .ok,
    ).toBe(false);
    expect(
      validateMatchSetupV7({ ...solo, humanSeats: [0, 1], gameKind: "CUSTOM" })
        .ok,
    ).toBe(true);
  });

  it("starts both humans as HUMAN without the AI head start", () => {
    const setup = onlineSetupFixtureV7(7, 1, { difficulty: "HARD" });
    expect(setup.aiHeadStart).toEqual({ coins: 5 });
    const state = onlineStateFixtureV7(setup);
    expect(state.players.map((player) => player.controller)).toEqual([
      "HUMAN",
      "HUMAN",
      "AI",
    ]);
    // The same match at Normal: only the AI seat has 5 Coins more at Hard.
    const normal = onlineStateFixtureV7(
      onlineSetupFixtureV7(7, 1, { difficulty: "NORMAL" }),
    );
    expect(
      state.players.map(
        (player, seat) => player.coins - (normal.players[seat]?.coins ?? 0),
      ),
    ).toEqual([0, 0, 5]);
    // The state schema holds the controllers to the setup.
    expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).not.toBeNull();
    const flipped = JSON.parse(JSON.stringify(state)) as {
      players: { controller: string }[];
    };
    (flipped.players[1] as { controller: string }).controller = "AI";
    expect(parseGameStateV7(flipped)).toBeNull();
  });

  it("gives the Easy personality to AI seats only", () => {
    const setup = onlineSetupFixtureV7(7, 1, { difficulty: "EASY" });
    expect(setup.aiDifficulty).toBe("EASY");
    const state = onlineStateFixtureV7(setup);
    const personality = (id: number) =>
      aiPersonalityForViewV7(viewForV7(state, playerId(id))).temper;
    expect(personality(1)).toBeNull();
    expect(personality(2)).toBeNull();
    expect(personality(3)).not.toBeNull();
  });

  it("never allies a human seat in a Cooperative match", () => {
    const setup = {
      ...soloSetup(),
      aiCount: 3,
      width: 14 as const,
      height: 14 as const,
      factions: ["ORIGINAL", "UNDEAD", "GOBLIN", "DINOSAUR"] as const,
      aiMode: "COOPERATIVE" as const,
    };
    const solo = setup;
    const online = { ...setup, humanSeats: [0, 1] };
    // Solo: seats 2, 3, 4 (players 2, 3, 4) are all allied AI.
    expect(cooperativeAlliesV7(solo, 1, 2, 3)).toBe(true);
    expect(cooperativeAlliesV7(online, 1, 2, 3)).toBe(false);
    expect(cooperativeAlliesV7(online, 1, 3, 4)).toBe(true);
    expect(cooperativeAlliesV7(online, 1, 1, 2)).toBe(false);
    expect(isHumanPlayerIdV7(online, 2)).toBe(true);
    expect(isHumanPlayerIdV7(online, 3)).toBe(false);
    expect(isHumanPlayerIdV7(online, 0)).toBe(false);
  });

  it("is never a Regular game, so no tribe stars or leaderboard", () => {
    const setup = onlineSetupFixtureV7(7, 0, {
      mapType: "CONTINENTS",
      width: 11,
    });
    expect(gameKindOfV7(setup)).toBe("CUSTOM");
    expect(isRegularGameV7(setup)).toBe(false);
    expect(leaderboardRegularGameV7(setup)).toBe(false);
    const { humanSeats: _seats, ...solo } = setup;
    void _seats;
    expect(isRegularGameV7(solo)).toBe(true);
  });

  describe("the end of a match (eliminationOutcomeV7)", () => {
    const players = (statuses: readonly ("ACTIVE" | "ELIMINATED")[]) =>
      statuses.map((status, seat) => ({ id: playerId(seat + 1), status }));
    const solo = {
      setup: soloSetup(),
      humanPlayerId: playerId(1),
      outcome: null,
    } as Pick<GameStateV7, "setup" | "humanPlayerId" | "outcome">;
    const online = {
      ...solo,
      setup: { ...solo.setup, humanSeats: [0, 1] },
    } as Pick<GameStateV7, "setup" | "humanPlayerId" | "outcome">;
    const actor = playerId(3) as PlayerId;

    it("keeps the solo rule", () => {
      expect(
        eliminationOutcomeV7(
          solo,
          players(["ELIMINATED", "ACTIVE", "ACTIVE"]),
          actor,
        ),
      ).toEqual({ kind: "DEFEAT", humanId: 1, defeatedByPlayerId: 3 });
      expect(
        eliminationOutcomeV7(
          solo,
          players(["ACTIVE", "ELIMINATED", "ELIMINATED"]),
          playerId(1),
        ),
      ).toEqual({ kind: "VICTORY", winnerId: 1 });
      expect(
        eliminationOutcomeV7(
          solo,
          players(["ACTIVE", "ELIMINATED", "ACTIVE"]),
          actor,
        ),
      ).toBeNull();
    });

    it("plays on while a human is in, and ends with none or one seat left", () => {
      // The host out, the guest still in: the guest plays on.
      expect(
        eliminationOutcomeV7(
          online,
          players(["ELIMINATED", "ACTIVE", "ACTIVE"]),
          actor,
        ),
      ).toBeNull();
      // The guest alone: the guest wins.
      expect(
        eliminationOutcomeV7(
          online,
          players(["ELIMINATED", "ACTIVE", "ELIMINATED"]),
          playerId(2),
        ),
      ).toEqual({ kind: "VICTORY", winnerId: 2 });
      // Both humans out: a Defeat, whatever AI seats remain.
      expect(
        eliminationOutcomeV7(
          online,
          players(["ELIMINATED", "ELIMINATED", "ACTIVE"]),
          actor,
        ),
      ).toEqual({ kind: "DEFEAT", humanId: 1, defeatedByPlayerId: 3 });
      // The two humans left facing each other: play on.
      expect(
        eliminationOutcomeV7(
          online,
          players(["ACTIVE", "ACTIVE", "ELIMINATED"]),
          actor,
        ),
      ).toBeNull();
    });
  });
});
