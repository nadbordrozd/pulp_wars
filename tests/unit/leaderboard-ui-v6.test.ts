import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  canonicalHash,
  createPlayableGameV6,
  viewForV6,
  type GameStateV6,
  type MatchSetupV6,
  type PublicLeaderboardEntryV6,
} from "../../src/engine/index";

describe("ruleset-6 public leaderboard projection", () => {
  it("projects authoritative totals without relying on fog-filtered entities", () => {
    const state = game(3);
    const before = canonicalHash(state);
    const humanView = viewForV6(state, state.humanPlayerId);
    const aiId = state.turnOrder[1];
    if (aiId === undefined) throw new Error("Missing AI player");
    const aiView = viewForV6(state, aiId);

    expect(humanView.cities.length).toBeLessThan(state.cities.length);
    expect(humanView.units.length).toBeLessThan(state.units.length);
    expect(humanView.leaderboard.map(({ playerId }) => playerId)).toEqual(
      state.turnOrder,
    );
    for (const entry of humanView.leaderboard) {
      expect(entry.cityCount).toBe(
        state.cities.filter((city) => city.ownerId === entry.playerId).length,
      );
      expect(entry.livingUnitCount).toBe(
        state.units.filter(
          (unit) => unit.ownerId === entry.playerId && unit.hp > 0,
        ).length,
      );
      expect(Object.keys(entry)).toEqual([
        "playerId",
        "seat",
        "controller",
        "color",
        "faction",
        "status",
        "isViewer",
        "cityCount",
        "livingUnitCount",
      ]);
    }
    expect(stripViewer(humanView.leaderboard)).toEqual(
      stripViewer(aiView.leaderboard),
    );
    expect(
      humanView.leaderboard.find((entry) => entry.isViewer)?.playerId,
    ).toBe(state.humanPlayerId);
    expect(aiView.leaderboard.find((entry) => entry.isViewer)?.playerId).toBe(
      aiId,
    );
    expect(Object.isFrozen(humanView.leaderboard)).toBe(true);
    expect(Object.isFrozen(humanView.leaderboard[0])).toBe(true);
    expect(canonicalHash(state)).toBe(before);
  });

  it("uses exact turn order and retains eliminated seats with zero totals", () => {
    const original = game(2);
    const eliminatedId = original.turnOrder.at(-1);
    if (eliminatedId === undefined) throw new Error("Missing eliminated seat");
    const state: GameStateV6 = {
      ...original,
      turnOrder: [...original.turnOrder].reverse(),
      players: original.players.map((player) =>
        player.id === eliminatedId
          ? { ...player, status: "ELIMINATED" as const }
          : player,
      ),
    };

    const view = viewForV6(state, state.humanPlayerId);
    expect(view.leaderboard.map(({ playerId }) => playerId)).toEqual(
      state.turnOrder,
    );
    expect(view.leaderboard).toHaveLength(state.players.length);
    expect(
      view.leaderboard.filter((entry) => entry.playerId === eliminatedId),
    ).toEqual([
      expect.objectContaining({
        status: "ELIMINATED",
        cityCount: 0,
        livingUnitCount: 0,
      }),
    ]);
  });

  it("keeps the semantic table single-axis at desktop and mobile widths", () => {
    const css = readFileSync("src/styles/main.css", "utf8");
    expect(css).toMatch(
      /\.v6-leaderboard-dialog\s*\{[^}]*width:\s*min\(100%,\s*52rem\)[^}]*overflow-x:\s*hidden[^}]*overflow-y:\s*auto/s,
    );
    expect(css).toMatch(
      /\.v6-leaderboard-table\s*\{[^}]*width:\s*100%[^}]*table-layout:\s*fixed/s,
    );
    expect(css).toMatch(
      /@media \(max-width: 560px\)[\s\S]*\.v6-leaderboard-dialog\s*\{[^}]*width:\s*100%[^}]*safe-area-inset-right[^}]*safe-area-inset-left/s,
    );
    expect(css).toMatch(/\.v6-leaderboard-close\s*\{[^}]*min-width:\s*5rem/s);
  });
});

function game(aiCount: 1 | 2 | 3): GameStateV6 {
  const setup: MatchSetupV6 = {
    rulesetId: "pulp-wars-poc-6",
    mapGenerationRevision: "SPATIAL_ECONOMY",
    seed: 7391,
    width: aiCount === 3 ? 16 : 14,
    height: aiCount === 3 ? 16 : 14,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: Array.from({ length: aiCount + 1 }, (_, seat) =>
      seat % 2 === 0 ? "ORIGINAL" : "CANDY",
    ),
  };
  const created = createPlayableGameV6(setup);
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

function stripViewer(entries: readonly PublicLeaderboardEntryV6[]) {
  return entries.map(({ isViewer, ...entry }) => {
    void isViewer;
    return entry;
  });
}
