// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  viewForV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import { explorerTilesRequiredV7 } from "../../src/engine/v7/achievements";
import { Ruleset7DomAppView } from "../../src/render/dom/app-view-v7";
import {
  FixtureController,
  RecordingBoardHost,
  boardPlan,
  requiredElement,
} from "../fixtures/v7-dom-rig";
import { martianUiFieldV7 } from "../fixtures/v7-martian-ui";

/**
 * Bead pulp_wars-2yc.84 (docs/ui/UI_REVIEW_2026_10.md "Possible bugs" 3):
 * an achievement's notice waits for the playback of the command that
 * earned it, so its scrim never hides that playback. A real Explorer
 * unlock in a hand-built arena, played on the human seat only: a Knight
 * kills a 1 HP unit, its forced advance reveals the tiles that complete
 * half the map, and the attack's playback runs while the notice waits.
 */
const KNIGHT: CoordV7 = { x: 3, y: 3 };
const VICTIM: CoordV7 = { x: 3, y: 2 };

const chebyshev = (a: CoordV7, b: CoordV7): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/**
 * The arena with the viewer one reveal short of Explorer: every tile it
 * sees is explored, the row past the victim is not, and the rest of the
 * explored count is made up of the tiles nearest the Knight.
 */
function arena(): GameStateV7 {
  const base = martianUiFieldV7(
    [
      { seat: 0, role: "KNIGHT", at: KNIGHT },
      { seat: 1, role: "FIGHTER", at: VICTIM, hp: 1 },
    ],
    { factions: ["ORIGINAL", "UNDEAD"], techs: { 0: [], 1: [] } },
  );
  const viewer = base.humanPlayerId;
  const required = explorerTilesRequiredV7(base.board);
  // The Knight's advance reveals the tiles two rows past it.
  const unseen = base.board.tiles
    .map((tile) => tile.at)
    .filter((at) => chebyshev(at, VICTIM) <= 1 && chebyshev(at, KNIGHT) > 1);
  const own = base.cities.filter((city) => city.ownerId === viewer);
  const seen = base.board.tiles
    .map((tile) => tile.at)
    .filter(
      (at) =>
        chebyshev(at, KNIGHT) <= 1 ||
        own.some((city) => chebyshev(at, city.at) <= 2),
    );
  const rest = base.board.tiles
    .map((tile) => tile.at)
    .filter(
      (at) =>
        !unseen.some((other) => chebyshev(other, at) === 0) &&
        !seen.some((other) => chebyshev(other, at) === 0),
    )
    .sort((a, b) => chebyshev(a, KNIGHT) - chebyshev(b, KNIGHT));
  // The state keeps its explored tiles in (y, x) order.
  const explored = [...seen, ...rest]
    .slice(0, required - 1)
    .sort((a, b) => a.y - b.y || a.x - b.x);
  return {
    ...base,
    players: base.players.map((player) =>
      player.id !== viewer
        ? player
        : {
            ...player,
            explored,
            achievementEntitlements: player.achievementEntitlements.map(
              (entitlement) =>
                entitlement.achievement === "EXPLORER"
                  ? { ...entitlement, unlocked: false, spent: false }
                  : entitlement,
            ),
          },
    ),
  };
}

/** A board host whose playback the test lets finish. */
class HeldPlaybackHost extends RecordingBoardHost {
  readonly played: unknown[] = [];
  #finish: (() => void) | null = null;
  override presentBoundary(...args: unknown[]): Promise<void> {
    this.played.push(args);
    return new Promise((resolve) => {
      this.#finish = resolve;
    });
  }
  finish(): void {
    this.#finish?.();
    this.#finish = null;
  }
}

const notice = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[data-v7-region="achievement-notice"]');
const settle = async (): Promise<void> => {
  for (let turn = 0; turn < 8; turn += 1)
    await new Promise((resolve) => setTimeout(resolve, 0));
};

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** The app over the arena, with the Knight selected. */
function open() {
  const state = arena();
  const view = viewForV7(state, state.humanPlayerId);
  expect(
    view.viewer.achievementEntitlements.find(
      (entry) => entry.achievement === "EXPLORER",
    )?.unlocked,
  ).toBe(false);
  const controller = new FixtureController(state);
  const host = new HeldPlaybackHost();
  const app = new Ruleset7DomAppView(
    document,
    requiredElement<HTMLElement>("#app"),
    controller,
    { boardHost: host, settingsStorage: null },
  );
  const knight = view.units.find(
    (unit) => unit.at.x === KNIGHT.x && unit.at.y === KNIGHT.y,
  );
  if (knight === undefined) throw new Error("fixture");
  host.callbacks?.onSelection({ kind: "UNIT", unitId: knight.id });
  return { controller, host, app };
}

/** The events of the boundary the board is playing now. */
function playing(host: HeldPlaybackHost): readonly {
  readonly kind: string;
  readonly achievement?: string;
}[] {
  const args = host.played.at(-1) as
    | [unknown, unknown, { readonly events: readonly { kind: string }[] }]
    | undefined;
  return args?.[2].events ?? [];
}

const unlocksExplorer = (events: ReturnType<typeof playing>): boolean =>
  events.some(
    (event) =>
      event.kind === "ACHIEVEMENT_UNLOCKED" && event.achievement === "EXPLORER",
  );

describe("an achievement notice and the playback that earned it", () => {
  it("waits for a Knight's kill and forced advance to play before it opens", async () => {
    const { controller, host, app } = open();
    const attack = boardPlan(host).targets.find(
      (target) =>
        target.command.kind === "ATTACK" &&
        target.at.x === VICTIM.x &&
        target.at.y === VICTIM.y,
    );
    if (attack === undefined) throw new Error("no attack offered");
    host.callbacks?.onCommand(attack);
    await vi.waitFor(() => expect(controller.accepted).toHaveLength(1));
    await settle();
    // The engine unlocked Explorer in this very attack, and its playback
    // (the kill, then the advance onto the victim's tile) is on the board.
    const events = playing(host);
    expect(events.map((event) => event.kind)).toEqual(
      expect.arrayContaining([
        "COMBAT_RESOLVED",
        "UNIT_DIED",
        "UNIT_MOVED",
        "TILES_REVEALED",
      ]),
    );
    expect(unlocksExplorer(events)).toBe(true);
    expect(notice()).toBeNull();
    host.finish();
    await settle();
    expect(notice()?.querySelector("h2")?.textContent).toBe(
      "Explorer achievement complete",
    );
    app.destroy();
  });

  it("waits for a Move that completes Explorer, too", async () => {
    const { controller, host, app } = open();
    const move = boardPlan(host).targets.find(
      (target) =>
        target.command.kind === "MOVE" &&
        target.at.x === VICTIM.x - 1 &&
        target.at.y === VICTIM.y,
    );
    if (move === undefined) throw new Error("no move offered");
    host.callbacks?.onCommand(move);
    await vi.waitFor(() => expect(controller.accepted).toHaveLength(1));
    await settle();
    expect(unlocksExplorer(playing(host))).toBe(true);
    expect(notice()).toBeNull();
    host.finish();
    await settle();
    expect(notice()?.querySelector("h2")?.textContent).toBe(
      "Explorer achievement complete",
    );
    app.destroy();
  });
});
