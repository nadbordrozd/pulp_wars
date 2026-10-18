// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type { CoordV7 } from "../../src/engine/index";
import { tileActionsAtV7 } from "../../src/render/canvas/tile-actions-v7";
import { FROZEN_UI_V7 } from "../fixtures/v7-frozen-sea-ui";
import {
  required,
  requiredButton,
  requiredElement,
  rig,
  waitUntil,
} from "../fixtures/v7-dom-rig";
import {
  TILE_ACTIONS_UI_V7 as A,
  tileActionsBrainFixtureV7,
  tileActionsHexerFixtureV7,
  tileActionsJoinChantFixtureV7,
  tileActionsKnightFixtureV7,
  tileActionsStargazerFixtureV7,
  tileActionsYetiFixtureV7,
} from "../fixtures/v7-tile-actions-ui";

/**
 * Tile actions in the DOM (bead pulp_wars-2yc.60; BOARD_TARGETING.md
 * section 1.1): a selected unit's badged tiles reach the board host; a tap
 * on a tile with one action does it as its board pick does, a tile with
 * several opens a chooser anchored to it, and the dock's buttons still arm
 * their abilities.
 */

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

type Scene = ReturnType<typeof rig>;

function select(scene: Scene, where: CoordV7): void {
  const view = required(scene.controller.snapshot().view);
  scene.host.callbacks?.onSelection({
    kind: "UNIT",
    unitId: required(
      view.units.find((unit) => unit.at.x === where.x && unit.at.y === where.y),
    ).id,
  });
}

const ANCHOR = { x: 200, y: 160, size: 96 } as const;

function tap(scene: Scene, where: CoordV7): void {
  const handler = scene.host.callbacks?.onTileActions;
  if (handler === undefined) throw new Error("No tile action callback");
  handler(where, ANCHOR);
}

const chooser = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[data-v7-region="tile-chooser"]');

const rows = (): readonly (string | undefined)[] =>
  [...(chooser()?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])].map(
    (row) => row.dataset.tileAction,
  );

async function settle(): Promise<void> {
  for (let index = 0; index < 4; index += 1) await Promise.resolve();
}

describe("tile actions in the DOM", () => {
  it("hands the selected unit's badged tiles to the board, none for a lone Move or Attack", () => {
    const knight = rig(tileActionsKnightFixtureV7());
    select(knight, A.knight);
    expect(required(knight.host.lastModel).tileActions ?? null).toBeNull();
    document.body.innerHTML = '<div id="app"></div>';
    const hexer = rig(tileActionsHexerFixtureV7());
    select(hexer, A.hexer);
    const plan = required(hexer.host.lastModel).tileActions;
    expect(
      tileActionsAtV7(plan, A.hexed)?.actions.map((action) => action.id),
    ).toEqual(["ATTACK", "RIBBIT"]);
  });

  it("opens a chooser on a tile with an Attack and a Ribbit; Ribbit hexes", async () => {
    const scene = rig(tileActionsHexerFixtureV7());
    select(scene, A.hexer);
    tap(scene, A.hexed);
    const panel = required(chooser());
    expect(panel.getAttribute("role")).toBe("menu");
    expect(rows()).toEqual(["attack", "ribbit"]);
    // Every row has an accessible name; nothing names a tile.
    for (const row of panel.querySelectorAll<HTMLElement>("[role=menuitem]"))
      expect(row.getAttribute("aria-label")).toMatch(/^[A-Z][a-z]/);
    expect(panel.textContent).not.toMatch(/\d/);
    // Anchored beside the tile, on the board.
    expect(panel.style.left).toMatch(/px$/);
    expect(panel.style.top).toMatch(/px$/);
    await settle();
    expect(document.activeElement).toBe(requiredButton("tile-choice-attack"));
    // The arrow keys move between the rows.
    panel.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );
    expect(document.activeElement).toBe(requiredButton("tile-choice-ribbit"));
    requiredButton("tile-choice-ribbit").click();
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]?.kind).toBe("RIBBIT");
    expect(chooser()).toBeNull();
  });

  it("attacks from the chooser as a tap on the Attack mark does", async () => {
    const scene = rig(tileActionsHexerFixtureV7());
    select(scene, A.hexer);
    tap(scene, A.hexed);
    requiredButton("tile-choice-attack").click();
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]?.kind).toBe("ATTACK");
  });

  it("closes the chooser with Escape and with a press elsewhere, sending nothing", async () => {
    const scene = rig(tileActionsHexerFixtureV7());
    select(scene, A.hexer);
    tap(scene, A.hexed);
    required(chooser()).dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(chooser()).toBeNull();
    // The selection stays; only the chooser closed.
    expect(document.querySelector(".v7-selection-dock")).not.toBeNull();
    tap(scene, A.hexed);
    expect(chooser()).not.toBeNull();
    document
      .querySelector(".v7-selection-dock")
      ?.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(chooser()).toBeNull();
    await settle();
    expect(scene.controller.accepted).toEqual([]);
  });

  it("does a tile's one action at once: a Yeti's Freeze", async () => {
    const scene = rig(tileActionsYetiFixtureV7());
    select(scene, A.yeti);
    tap(scene, A.freezeAt);
    expect(chooser()).toBeNull();
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]).toMatchObject({
      kind: "FREEZE",
      at: A.freezeAt,
    });
  });

  it("chooses a Brain's Mind Control from the chooser of the enemy beside it", async () => {
    // Bolder abilities (`pulp_wars-w49.42`, 7r99): Mind Control reaches the
    // eight tiles around the Brain, so its target can be hit too: the tile
    // opens a chooser with both.
    const scene = rig(tileActionsBrainFixtureV7());
    select(scene, A.brain);
    tap(scene, A.controlTarget);
    expect(rows()).toEqual(["attack", "mind_control"]);
    requiredButton("tile-choice-mind-control").click();
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]?.kind).toBe("MIND_CONTROL");
  });

  it("keeps a rite's confirmation: a star tile is chosen, then begun", async () => {
    const scene = rig(tileActionsStargazerFixtureV7());
    select(scene, A.stargazer);
    const plan = required(required(scene.host.lastModel).tileActions);
    const star = required(plan.tiles.find((tile) => !tile.chooser)).at;
    tap(scene, star);
    await settle();
    // Armed and chosen, not sent: the aiming panel waits for Begin.
    expect(scene.controller.accepted).toEqual([]);
    const model = required(scene.host.lastModel);
    expect(model.interaction.cultPick).toMatchObject({
      kind: "STARFALL",
      chosen: star,
    });
    expect(model.tileActions ?? null).toBeNull();
    requiredButton("cult-ritual-begin").click();
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]).toMatchObject({
      kind: "BEGIN_RITUAL",
      ritual: "STARFALL",
      at: star,
    });
  });

  it("joins a star's chant with one tap on the casting Stargazer", async () => {
    // The Cult redesign (`pulp_wars-mch9.34`): `oneTap`, no chooser.
    const scene = rig(tileActionsJoinChantFixtureV7());
    select(scene, A.joiner);
    tap(scene, A.stargazer);
    expect(chooser()).toBeNull();
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]).toMatchObject({
      kind: "JOIN_CHANT",
      leaderUnitId: required(
        required(scene.controller.snapshot().view).units.find(
          (unit) => unit.at.x === A.stargazer.x && unit.at.y === A.stargazer.y,
        ),
      ).id,
    });
    expect(
      required(scene.controller.snapshot().view).cult.rituals[0]?.chanters,
    ).toBe(1);
  });

  it("offers Select for an own unit under an ability's icon", async () => {
    const scene = rig(tileActionsStargazerFixtureV7());
    select(scene, A.stargazer);
    const plan = required(required(scene.host.lastModel).tileActions);
    const own = required(plan.tiles.find((tile) => tile.ownUnit));
    tap(scene, own.at);
    expect(rows()).toEqual(["starfall", "select"]);
    requiredButton("tile-choice-select").click();
    await settle();
    const model = required(scene.host.lastModel);
    const selected = required(scene.controller.snapshot().view).units.find(
      (unit) => unit.id === model.interaction.selectedUnitId,
    );
    expect(selected?.at).toEqual(own.at);
    expect(scene.controller.accepted).toEqual([]);
  });

  it("keeps the dock's button: arming it narrows the board to that ability", () => {
    const scene = rig(tileActionsHexerFixtureV7());
    select(scene, A.hexer);
    expect(required(scene.host.lastModel).tileActions).not.toBeNull();
    requiredButton("cult-ribbit").click();
    const model = required(scene.host.lastModel);
    expect(model.interaction.cultPick).toMatchObject({ kind: "RIBBIT" });
    expect(model.tileActions ?? null).toBeNull();
    requiredElement<HTMLElement>("[data-v7-cult-pick]");
  });

  it("leaves the Ice Witch's ring and the bar-only actions off the board", () => {
    const scene = rig(tileActionsYetiFixtureV7());
    select(scene, FROZEN_UI_V7.witch);
    expect(required(scene.host.lastModel).tileActions ?? null).toBeNull();
    // Her one Freeze button is still in the dock.
    requiredButton("freeze");
  });
});
