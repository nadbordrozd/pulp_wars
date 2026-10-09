// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import type {
  Ruleset7AcceptedBoundary,
  Ruleset7BrowserSnapshot,
} from "../../src/app/index";
import {
  queryPlayerCommandsV7,
  queryScoreV7,
  viewForV7,
  type GameStateV7,
} from "../../src/engine/index";
import type {
  BoardHostCallbacksV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import {
  scoreDominationVictoryV7,
  scorePerfectionEndV7,
  scoreUiStateV7,
} from "../fixtures/v7-score-ui";

/**
 * Score and modes, leaderboard and end of match (`pulp_wars-kaw6.3`,
 * docs/product/RULESET_7_SCORE_AND_STARS.md section 8), on the hand-built
 * states of tests/fixtures/v7-score-ui.ts: no command is played and no
 * match is run.
 */

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Ruleset 7 score in the leaderboard", () => {
  it("shows every player's score and opens only the viewer's breakdown during the match", () => {
    const state = scoreUiStateV7("DOMINATION", 12);
    const view = viewForV7(state, state.humanPlayerId);
    const app = mount(state);
    openLeaderboard();
    expect(required(".v7-screen-lede").textContent).toBe(
      "Capture every enemy city to win. The score sums up how each side is doing.",
    );
    expect(document.querySelector('[data-v7-region="score-rounds"]')).toBe(
      null,
    );
    const rows = [
      ...document.querySelectorAll<HTMLElement>(".v7-leaderboard-row"),
    ];
    // Domination keeps the turn order; every row carries its public score.
    expect(rows.map((row) => Number(row.dataset.score))).toEqual(
      view.leaderboard.map((entry) => entry.score),
    );
    expect(
      rows.map((row) => row.querySelector(".v7-score-value")?.textContent),
    ).toEqual(view.leaderboard.map((entry) => String(entry.score)));
    // Only the viewer's score opens a breakdown while the match runs.
    const toggles = [
      ...document.querySelectorAll<HTMLButtonElement>(
        '.v7-leaderboard [data-action^="score-breakdown-"]',
      ),
    ];
    expect(toggles).toHaveLength(1);
    const viewerRow = required('.v7-leaderboard-row[data-viewer="true"]');
    const toggle = required<HTMLButtonElement>(
      '.v7-leaderboard-row[data-viewer="true"] [data-action^="score-breakdown-"]',
    );
    expect(viewerRow.contains(toggle)).toBe(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-label")).toBe(
      "Score 312 points. Show the breakdown",
    );
    toggle.click();
    const opened = required<HTMLButtonElement>(
      '.v7-leaderboard-row[data-viewer="true"] [data-action^="score-breakdown-"]',
    );
    expect(opened.getAttribute("aria-expanded")).toBe("true");
    const panel = required('[data-v7-region="score-breakdown"]');
    expect(opened.getAttribute("aria-controls")).toBe(panel.id);
    expect(
      panel.closest<HTMLElement>(".v7-leaderboard-row")?.dataset.viewer,
    ).toBe("true");
    expect(lines(panel)).toEqual([
      "territory|Territory 9 tiles × 2|+18",
      "cities|City levels 4 levels × 10|+40",
      "technology|Technology 19 tiers researched × 8|+152",
      "achievements|Achievements 2 × 40|+80",
      "army|Army units worth 2 Coins|+2",
      "kills|Kills enemy units worth 14 Coins × 2|+28",
      "losses|Losses your units worth 4 Coins died|−4",
      "damage|Damage taken 23 HP lost, −1 per 5|−4",
      "total|Score|312",
    ]);
    // The Coins read as the coin glyph, like every other price.
    expect(
      panel.querySelectorAll('[data-line="army"] .v7-economy-value'),
    ).toHaveLength(1);
    opened.click();
    expect(document.querySelector('[data-v7-region="score-breakdown"]')).toBe(
      null,
    );
    app.destroy();
  });

  it("counts Perfection's rounds in the top bar and the leaderboard and ranks by score", () => {
    const state = scoreUiStateV7("PERFECTION", 12);
    const app = mount(state);
    const hud = required(".v7-hud-round");
    expect(hud.dataset.mode).toBe("perfection");
    expect(hud.querySelector(".v7-hud-round-long")?.textContent).toBe(
      "Round 12 of 30",
    );
    expect(hud.querySelector(".v7-hud-round-short")?.textContent).toBe(
      "Round 12/30",
    );
    expect(
      hud.querySelector(".v7-hud-round-short")?.getAttribute("aria-hidden"),
    ).toBe("true");
    expect(hud.title).toBe("18 rounds left");
    openLeaderboard();
    expect(required(".v7-screen-lede").textContent).toBe(
      "Highest score after round 30 wins.",
    );
    expect(required('[data-v7-region="score-rounds"]').textContent).toBe(
      "Round 12 of 3018 rounds left",
    );
    const scores = [
      ...document.querySelectorAll<HTMLElement>(".v7-leaderboard-row"),
    ].map((row) => Number(row.dataset.score));
    expect(scores).toEqual([312, 217, 178, 34]);
    expect(required(".v7-leaderboard-row:first-child").dataset.viewer).toBe(
      "true",
    );
    app.destroy();
  });

  it("keeps Domination's top bar on turns", () => {
    const app = mount(scoreUiStateV7("DOMINATION", 12));
    const hud = required(".v7-hud-round");
    expect(hud.textContent).toBe("Turn 12");
    expect(hud.dataset.mode).toBeUndefined();
    app.destroy();
  });
});

describe("Ruleset 7 score at the end of the match", () => {
  it("ranks the final scores, opens every player's breakdown, and grades a Domination win", async () => {
    const state = scoreDominationVictoryV7();
    const view = viewForV7(state, state.humanPlayerId);
    const summary = queryScoreV7(view).summary;
    if (summary === null) throw new Error("summary missing");
    const app = mount(state);
    const results = required('[data-v7-region="results"]');
    expect(results.dataset.mode).toBe("domination");
    expect(required(".v7-results h2").textContent).toBe("Victory");
    // Only a Perfection result decided by score names a winner by score.
    expect(document.querySelector('[data-v7-region="score-verdict"]')).toBe(
      null,
    );
    const grade = required('[data-v7-region="grade"]');
    expect(grade.dataset.stars).toBe("3");
    expect(grade.dataset.glow).toBeUndefined();
    expect(required(".v7-grade-stars").getAttribute("aria-label")).toBe(
      "3 of 3 stars",
    );
    expect(grade.querySelectorAll(".v7-grade-star.is-earned")).toHaveLength(3);
    expect(required(".v7-grade-rating").textContent).toBe(
      "×2.04 the best rival's score",
    );
    expect(
      [...grade.querySelectorAll<HTMLElement>(".v7-grade-condition")].map(
        (item) => `${item.dataset.condition}:${item.dataset.met}`,
      ),
    ).toEqual(["win:true", "two:true", "three:true", "conquest:true"]);
    const rows = [
      ...document.querySelectorAll<HTMLElement>(".v7-results .v7-result-seat"),
    ];
    expect(required(".v7-result-seats").dataset.ranked).toBe("true");
    expect(rows.map((row) => Number(row.dataset.score))).toEqual(
      summary.players.map((entry) => entry.score.total),
    );
    expect(rows[0]?.dataset.viewer).toBe("true");
    expect(rows[0]?.dataset.winner).toBe("true");
    // The dialog still opens on Play again, after the list's toggles.
    await Promise.resolve();
    expect(document.activeElement?.getAttribute("data-action")).toBe("restart");
    // Every player's breakdown is open to read once the match is over.
    expect(
      rows.every(
        (row) =>
          row.querySelector('[data-action^="score-breakdown-"]') !== null,
      ),
    ).toBe(true);
    const undead = rows.find((row) => row.textContent?.includes("Undead"));
    undead
      ?.querySelector<HTMLButtonElement>('[data-action^="score-breakdown-"]')
      ?.click();
    const panel = required('[data-v7-region="score-breakdown"]');
    expect(panel.closest(".v7-result-seat")?.textContent).toContain("Undead");
    expect(lines(panel).slice(-2)).toEqual([
      "cap|Penalty cap losses and damage take at most half|+28",
      "total|Score|14",
    ]);
    app.destroy();
  });

  it("shows the glow only for a flawless win", () => {
    const app = mount(scoreDominationVictoryV7(true));
    const grade = required('[data-v7-region="grade"]');
    expect(grade.dataset.glow).toBe("true");
    expect(required(".v7-grade-stars").getAttribute("aria-label")).toBe(
      "3 of 3 stars, flawless",
    );
    expect(
      grade.querySelector('[data-condition="flawless"]')?.textContent,
    ).toContain("Flawless: you lost no unit and no city");
    app.destroy();
  });

  it("names the winner by score in Perfection, with the grade of a win", () => {
    const app = mount(scorePerfectionEndV7(true));
    expect(required(".v7-results h2").textContent).toBe("Victory");
    expect(required('[data-v7-region="results"]').dataset.mode).toBe(
      "perfection",
    );
    expect(required(".v7-results .v7-screen-lede").textContent).toMatch(
      /^Round 30 of 30 · /,
    );
    expect(required('[data-v7-region="score-verdict"]').textContent).toBe(
      "You win with 312 points, the highest score after round 30.",
    );
    const grade = required('[data-v7-region="grade"]');
    expect(grade.dataset.stars).toBe("1");
    // Perfection asks no conquest.
    expect(grade.querySelector('[data-condition="conquest"]')).toBe(null);
    app.destroy();
  });

  it("names the rival who outscored the player, with its trophy, and grades no defeat", () => {
    const state = scorePerfectionEndV7(false);
    const app = mount(state);
    expect(required(".v7-results h2").textContent).toBe("Defeat");
    expect(required('[data-v7-region="score-verdict"]').textContent).toBe(
      "Player 3 · Goblin wins with 337 points, the highest score after round 30.",
    );
    expect(document.querySelector('[data-v7-region="grade"]')).toBe(null);
    const rows = [
      ...document.querySelectorAll<HTMLElement>(".v7-results .v7-result-seat"),
    ];
    expect(rows.map((row) => Number(row.dataset.score))).toEqual([
      337, 312, 178, 34,
    ]);
    expect(rows.filter((row) => row.dataset.winner === "true")).toHaveLength(1);
    expect(rows[0]?.dataset.winner).toBe("true");
    expect(rows[1]?.dataset.viewer).toBe("true");
    app.destroy();
  });

  it("styles the phone leaderboard as one row per player with the breakdown below it", () => {
    const css = readFileSync("src/styles/v7.css", "utf8");
    const phone = css.slice(css.indexOf("A phone sets the counts under"));
    expect(phone).toContain(".v7-leaderboard-row > .v7-score-breakdown");
    expect(phone).toContain("grid-column: 1 / -1;");
    expect(css).toContain(".v7-score-breakdown {");
    expect(css).toMatch(/\.v7-result-seats \{\s+grid-auto-rows: max-content;/);
  });
});

function lines(panel: HTMLElement): string[] {
  return [...panel.querySelectorAll<HTMLElement>(".v7-score-line")].map(
    (line) =>
      `${line.dataset.line}|${[
        line.querySelector(".v7-score-label")?.textContent,
        line.querySelector(".v7-score-detail")?.textContent,
      ]
        .filter((part) => part !== undefined)
        .join(" ")}|${line.querySelector("dd")?.textContent ?? ""}`,
  );
}

function openLeaderboard(): void {
  required<HTMLButtonElement>('[data-action="compact-menu"]').click();
  required<HTMLButtonElement>('[data-action="leaderboard"]').click();
}

function mount(state: GameStateV7): Ruleset7DomAppView {
  const view = viewForV7(state, state.humanPlayerId);
  const snapshot: Ruleset7BrowserSnapshot = {
    phase: state.outcome === null ? "ACTIVE" : "COMPLETE",
    view,
    offeredCommands: state.outcome === null ? queryPlayerCommandsV7(view) : [],
    savedAt: null,
    hasStoredSave: false,
    recovery: null,
    saveWarning: null,
    diagnostic: null,
    transitioning: false,
    ai: {
      active: false,
      fastForward: false,
      policySlices: 0,
      acceptedCommands: 0,
      lastSliceMilliseconds: 0,
      maximumSliceMilliseconds: 0,
    },
  };
  return new Ruleset7DomAppView(
    document,
    required<HTMLElement>("#app"),
    new StaticController(snapshot),
    { boardHost: new QuietBoardHost(), settingsStorage: null },
  );
}

/** A controller that shows one fixed snapshot and accepts nothing. */
class StaticController implements Ruleset7ControllerPortV7 {
  readonly #snapshot: Ruleset7BrowserSnapshot;
  constructor(snapshot: Ruleset7BrowserSnapshot) {
    this.#snapshot = snapshot;
  }
  snapshot(): Ruleset7BrowserSnapshot {
    return this.#snapshot;
  }
  subscribe(
    subscriber: (snapshot: Ruleset7BrowserSnapshot) => void,
  ): () => void {
    subscriber(this.#snapshot);
    return () => undefined;
  }
  subscribeAcceptedBoundary(
    subscriber: (boundary: Ruleset7AcceptedBoundary) => void,
  ): () => void {
    void subscriber;
    return () => undefined;
  }
  readonly launch: Ruleset7ControllerPortV7["launch"] = async () => ({
    ok: false,
    code: "INVALID_SETUP",
    diagnostic: "No launch",
  });
  readonly resume: Ruleset7ControllerPortV7["resume"] = async () => false;
  readonly returnToMenu: Ruleset7ControllerPortV7["returnToMenu"] = async () =>
    false;
  readonly dispatch: Ruleset7ControllerPortV7["dispatch"] = async () => ({
    accepted: false,
    reason: "NOT_OFFERED",
  });
  readonly progressAiTurns: Ruleset7ControllerPortV7["progressAiTurns"] =
    async () => ({
      ok: false,
      cancelled: true,
      acceptedCommands: 0,
      diagnostic: "No AI",
    });
  readonly restart: Ruleset7ControllerPortV7["restart"] = async () => ({
    ok: false,
    code: "CONTROLLER_DESTROYED",
    diagnostic: "No restart",
  });
  readonly deleteStoredSave: Ruleset7ControllerPortV7["deleteStoredSave"] =
    async () => false;
  readonly setFastForward: Ruleset7ControllerPortV7["setFastForward"] =
    () => {};
  readonly exportSafeLog: Ruleset7ControllerPortV7["exportSafeLog"] = () =>
    null;
  readonly exportDebugBundle: Ruleset7ControllerPortV7["exportDebugBundle"] =
    () => ({ ok: false, reason: "NO_ACTIVE_MATCH" });
}

class QuietBoardHost implements BoardHostV7 {
  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    void callbacks;
    container.append(document.createElement("canvas"));
  }
  update(): void {}
  activate(): void {}
  zoom(): void {}
  focus(): void {}
  async presentBoundary(): Promise<void> {}
  finishPresentations(): void {}
  destroy(): void {}
}

function required<T extends Element = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}
