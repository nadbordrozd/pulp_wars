// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  favourOfV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  cultFieldV7,
  withFavourV7,
  withHorrorV7,
  withStrandsV7,
} from "../fixtures/v7-cult";
import { requiredElement, rig, waitUntil } from "../fixtures/v7-dom-rig";
import { at } from "../fixtures/v7-revision20";

/**
 * The Cult's channel in the DOM (`pulp_wars-mch9.5`): the engine offers
 * Summon, Channel, Behold!, Anchor, and Boo!, and the dock shows them with
 * its generic action buttons until the interface bead of the channel
 * (`pulp_wars-mch9.18`) gives them their board targeting, the strands, the
 * Control pips, and the candles. This holds the stand-in to three things:
 * nothing throws, a button is named in plain words with what it does
 * (never a raw command, ID, or tile), and pressing it plays the command and
 * its new events through the app.
 */

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

/** The value, which the test requires to be there. */
function need<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing");
  return value;
}

/**
 * A Cult player (seat 0, the human) with every channel command on offer: a
 * Summoner and an Initiate with 6 Favour; a Horror with a Human Fighter
 * beside it; a second Initiate holding a strand next to the Thing; an Idol
 * Bearer and a Hexer in reach of the Horror.
 */
function channelMatch(): GameStateV7 {
  return withStrandsV7(
    withHorrorV7(
      withFavourV7(
        cultFieldV7([
          { seat: 0, role: "CAPTAIN", at: at(5, 2) },
          { seat: 0, role: "FIGHTER", at: at(6, 2) },
          { seat: 0, role: "GUARD", at: at(4, 6) },
          {
            seat: 0,
            role: "FIGHTER",
            at: at(5, 6),
            activation: { specialActed: true },
          },
          { seat: 0, role: "JUGGERNAUT", at: at(6, 6) },
          { seat: 0, role: "MARKSMAN", at: at(6, 5) },
          { seat: 1, role: "FIGHTER", at: at(4, 4) },
          { seat: 1, role: "FIGHTER", at: at(1, 1) },
        ]),
        0,
        6,
      ),
      0,
      at(5, 4),
    ),
    at(5, 4),
    [at(5, 6)],
  );
}

function select(scene: ReturnType<typeof rig>, where: CoordV7): void {
  scene.host.callbacks?.onSelection({
    kind: "UNIT",
    unitId: scene.unitAt(where).id,
  });
}

const dock = (): HTMLElement =>
  requiredElement<HTMLElement>(".v7-selection-dock");

const buttons = (action: string): HTMLButtonElement[] => [
  ...dock().querySelectorAll<HTMLButtonElement>(
    `[data-action="command-${action}"]`,
  ),
];

const words = (button: HTMLElement): readonly (string | null | undefined)[] => [
  button.querySelector(".v7-action-label")?.textContent,
  button.querySelector(".v7-economy-chip")?.textContent,
];

/** What a player reads or hears of a button: no raw ID, command, or tile. */
function expectPlainWords(button: HTMLElement): void {
  const text = [
    button.textContent ?? "",
    button.title,
    button.getAttribute("aria-label") ?? "",
    button.getAttribute("aria-description") ?? "",
  ].join(" | ");
  expect(text).not.toMatch(/[A-Z]{2,}_[A-Z]|\bu\d+\b|#\d+|\(\d+,\s*\d+\)/);
  expect(text).not.toMatch(
    /SUMMON|CHANNEL|BEHOLD|ANCHOR|\bBOO\b(?!!)|undefined|null|NaN/,
  );
  expect(button.title.length).toBeGreaterThan(20);
}

describe("the dock's stand-in for the Cult's channel", () => {
  it("shows one Summon for the Summoner, with its price", () => {
    const scene = rig(channelMatch());
    select(scene, at(5, 2));
    // The engine offers a Summon for every free tile around the Summoner;
    // the stand-in lists one.
    expect(
      scene.controller
        .snapshot()
        .offeredCommands.filter((command) => command.kind === "SUMMON").length,
    ).toBeGreaterThan(1);
    const summon = buttons("summon");
    expect(summon.map(words)).toEqual([["Summon Horror", "−5 Favour"]]);
    expectPlainWords(need(summon[0]));
    // The Summoner is a robed cultist within 3 tiles of the Horror: it may
    // channel it instead.
    expect(buttons("channel").map(words)).toEqual([
      ["Channel Horror", "2 / 1"],
    ]);
    scene.app.destroy();
  });

  it("plays a Summon from its button: a Horror stands on the board", async () => {
    const scene = rig(channelMatch());
    select(scene, at(5, 2));
    need(buttons("summon")[0]).click();
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]).toMatchObject({ kind: "SUMMON" });
    const view = scene.controller.snapshot().view;
    if (view === null) throw new Error("no view");
    expect(favourOfV7(view, view.viewer.id)).toBe(1);
    expect(
      view.units.filter((unit) => unit.summoned === "HORROR"),
    ).toHaveLength(2);
    // Nothing on the page names a raw event, cause, or the mechanical role.
    expect(document.body.textContent ?? "").not.toMatch(
      /DAEMON_SUMMONED|STRAND_FORMED|FAVOUR_SPENT|Daemon summoned|Strand formed/,
    );
    scene.app.destroy();
  });

  it("names Channel by the daemon and its strands, and plays it", async () => {
    const scene = rig(channelMatch());
    select(scene, at(6, 5));
    const channel = buttons("channel");
    expect(channel.map(words)).toEqual([["Channel Horror", "2 / 1"]]);
    expectPlainWords(need(channel[0]));
    need(channel[0]).click();
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]).toMatchObject({ kind: "CHANNEL" });
    const view = scene.controller.snapshot().view;
    if (view === null) throw new Error("no view");
    expect(view.cult.daemons).toEqual([
      expect.objectContaining({ role: "HORROR", control: 1, strands: 2 }),
    ]);
    scene.app.destroy();
  });

  it("shows Behold! for the Idol Bearer and the grip for the Thing", async () => {
    const scene = rig(channelMatch());
    select(scene, at(4, 6));
    const behold = buttons("behold");
    expect(behold.map(words)).toEqual([["Behold!", "1 cultist"]]);
    expectPlainWords(need(behold[0]));
    select(scene, at(6, 6));
    const anchor = buttons("anchor");
    expect(anchor.map(words)).toEqual([["Grip Initiate", "3 / 1"]]);
    expectPlainWords(need(anchor[0]));
    need(anchor[0]).click();
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]).toMatchObject({ kind: "ANCHOR" });
    const view = scene.controller.snapshot().view;
    if (view === null) throw new Error("no view");
    expect(view.cult.grips).toHaveLength(1);
    expect(view.cult.daemons[0]).toMatchObject({ strands: 3 });
    scene.app.destroy();
  });

  it("shows the Horror as a Horror, with Boo! and no trace of the Caller", async () => {
    const scene = rig(channelMatch());
    select(scene, at(5, 4));
    const text = dock().textContent ?? "";
    expect(text).toContain("Horror");
    expect(text).not.toMatch(/Caller|KNIGHT|HORROR|Channel/);
    // Its own glossary lines in the unit's "?" dialog: what a daemon is,
    // and its Boo!; nothing of the Caller's.
    requiredElement<HTMLButtonElement>('[data-action="unit-help"]').click();
    const help =
      requiredElement<HTMLElement>(".v7-unit-help-dialog").textContent ?? "";
    expect(help).toContain("Daemon");
    expect(help).toContain("Boo!");
    expect(help).not.toMatch(/Caller|Channel|KNIGHT|HORROR|BOO\b/);
    requiredElement<HTMLButtonElement>(
      '[data-action="close-unit-help"]',
    ).click();
    // The Human Fighter and the cultists' own Hexer stand beside it.
    const boo = buttons("boo");
    expect(boo.map(words)).toEqual([["Boo!", "2 units"]]);
    expectPlainWords(need(boo[0]));
    // It is never promoted or disbanded.
    expect(buttons("promote")).toEqual([]);
    expect(buttons("disband")).toEqual([]);
    need(boo[0]).click();
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]).toMatchObject({ kind: "BOO" });
    expect(document.body.textContent ?? "").not.toMatch(
      /UNITS_SCARED|Units scared/,
    );
    scene.app.destroy();
  });

  it("shows the new abilities of the cultists in plain words", () => {
    const scene = rig(channelMatch());
    for (const where of [at(5, 2), at(4, 6), at(6, 6), at(6, 5)]) {
      select(scene, where);
      expect(dock().textContent ?? "").not.toMatch(
        /SUMMON|CHANNEL|BEHOLD|ANCHOR|SUMMONER_SUPPORT/,
      );
    }
    scene.app.destroy();
  });
});
