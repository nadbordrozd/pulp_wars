// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type { CoordV7 } from "../../src/engine/index";
import { tileActionsAtV7 } from "../../src/render/canvas/tile-actions-v7";
import {
  DWARF_MOLE_ROAD_V7,
  dwarfMoleRoadFixtureV7,
} from "../fixtures/v7-dwarf-ui";
import { CULT_TRICK_UI_V7 } from "../fixtures/v7-cult-ui";
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
    // `pulp_wars-n5fa` (7r130): a Cult Hexer's shot frogs, so its target
    // is a lone Attack (a Ribbit badge beside it before).
    document.body.innerHTML = '<div id="app"></div>';
    const hexer = rig(tileActionsHexerFixtureV7());
    select(hexer, A.hexer);
    expect(
      tileActionsAtV7(required(hexer.host.lastModel).tileActions, A.hexed) ??
        null,
    ).toBeNull();
    // The one Freeze effect (`pulp_wars-xv0t`, 7r133): a Yeti has no
    // Freeze, so its Attack on a boat is a lone Attack too (it was a choice
    // of Attack and Freeze).
    document.body.innerHTML = '<div id="app"></div>';
    const yeti = rig(tileActionsYetiFixtureV7());
    select(yeti, A.yeti);
    expect(
      tileActionsAtV7(
        required(yeti.host.lastModel).tileActions,
        FROZEN_UI_V7.prey,
      ) ?? null,
    ).toBeNull();
  });

  it("opens a chooser on a tile with two actions: a menu by the tile, read and walked by keys", async () => {
    // (A Yeti's Attack and Freeze on a boat were this chooser's pair until
    // the one Freeze effect, `pulp_wars-xv0t`, 7r133, and a Hexer's Attack
    // and Ribbit before `pulp_wars-n5fa`, 7r130: a Stargazer's own Initiate,
    // a star tile and a unit to select, is the pair now.)
    const scene = rig(tileActionsStargazerFixtureV7());
    select(scene, A.stargazer);
    const plan = required(required(scene.host.lastModel).tileActions);
    const own = required(plan.tiles.find((tile) => tile.ownUnit));
    tap(scene, own.at);
    const panel = required(chooser());
    expect(panel.getAttribute("role")).toBe("menu");
    expect(rows()).toEqual(["starfall", "select"]);
    // Every row has an accessible name; nothing names a tile.
    for (const row of panel.querySelectorAll<HTMLElement>("[role=menuitem]"))
      expect(row.getAttribute("aria-label")).toMatch(/^[A-Z][a-z]/);
    expect(panel.textContent).not.toMatch(/\d/);
    // Anchored beside the tile, on the board.
    expect(panel.style.left).toMatch(/px$/);
    expect(panel.style.top).toMatch(/px$/);
    await settle();
    expect(document.activeElement).toBe(requiredButton("tile-choice-starfall"));
    // The arrow keys move between the rows.
    panel.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );
    expect(document.activeElement).toBe(requiredButton("tile-choice-select"));
  });

  it("closes the chooser with Escape and with a press elsewhere, sending nothing", async () => {
    const scene = rig(tileActionsStargazerFixtureV7());
    select(scene, A.stargazer);
    const plan = required(required(scene.host.lastModel).tileActions);
    const own = required(plan.tiles.find((tile) => tile.ownUnit)).at;
    tap(scene, own);
    required(chooser()).dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(chooser()).toBeNull();
    // The selection stays; only the chooser closed.
    expect(document.querySelector(".v7-selection-dock")).not.toBeNull();
    tap(scene, own);
    expect(chooser()).not.toBeNull();
    document
      .querySelector(".v7-selection-dock")
      ?.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(chooser()).toBeNull();
    await settle();
    expect(scene.controller.accepted).toEqual([]);
  });

  it("takes the enemy beside a Brain with one tap: Mind Control is its only action there", async () => {
    // Bolder abilities (`pulp_wars-w49.42`, 7r99): Mind Control reaches the
    // eight tiles around the Brain. `pulp_wars-ev6q` (7r129): the Brain has
    // no attack, so the tile opens no chooser (it offered Attack too).
    const scene = rig(tileActionsBrainFixtureV7());
    select(scene, A.brain);
    tap(scene, A.controlTarget);
    expect(chooser()).toBeNull();
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]?.kind).toBe("MIND_CONTROL");
  });

  it("digs a Mole's Tunnel 2 tiles away with one tap when no Hammerer can ride", async () => {
    // `pulp_wars-ev6q` (7r129): a Tunnel tile is 2 or 3 away and never also
    // a Move (Roads give the Mole nothing), so it opens no chooser; with no
    // Hammerer beside the Mole there is nothing else to choose either.
    const scene = rig(dwarfMoleRoadFixtureV7());
    select(scene, DWARF_MOLE_ROAD_V7.mole);
    tap(scene, { x: 7, y: 2 });
    expect(chooser()).toBeNull();
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]).toMatchObject({
      kind: "TUNNEL",
      to: { x: 7, y: 2 },
      rider: null,
    });
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
    // (The Familiar's Switcheroo; the Hexer's Ribbit button went with its
    // command, `pulp_wars-n5fa`, 7r130.)
    const scene = rig(tileActionsHexerFixtureV7());
    select(scene, CULT_TRICK_UI_V7.familiar);
    expect(required(scene.host.lastModel).tileActions).not.toBeNull();
    expect(document.querySelector('[data-action="cult-ribbit"]')).toBeNull();
    requiredButton("cult-switcheroo").click();
    const model = required(scene.host.lastModel);
    expect(model.interaction.cultPick).toMatchObject({ kind: "SWITCHEROO" });
    expect(model.tileActions ?? null).toBeNull();
    requiredElement<HTMLElement>("[data-v7-cult-pick]");
  });

  it("leaves the Ice Witch's Cold Snap and the bar-only actions off the board", () => {
    const scene = rig(tileActionsYetiFixtureV7());
    select(scene, FROZEN_UI_V7.witch);
    expect(required(scene.host.lastModel).tileActions ?? null).toBeNull();
    // The Ice Folk freeze rework (`pulp_wars-s55m.1`): her Cold Snap button,
    // which also freezes her ring of water, is in the dock; she has no
    // Freeze.
    requiredButton("ice-folk-cold-snap");
    expect(document.querySelector('[data-action="freeze"]')).toBeNull();
  });
});
