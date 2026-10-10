// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { favourOfV7, type CoordV7 } from "../../src/engine/index";
import {
  BOARD_PICK_PANEL_MAX_BUTTONS_V7,
  targetHighlightStyleV7,
} from "../../src/render/canvas/target-highlight-v7";
import {
  BEHOLD_RAISED_V7,
  CHANNEL_HOLDING_V7,
  CHANNEL_PICK_V7,
  SUMMON_NO_HELPER_V7,
  SUMMON_PICK_HELPER_V7,
  SUMMON_PICK_TILE_V7,
} from "../../src/render/cult-channel-presentation-v7";
import { cultFieldV7, withFavourV7 } from "../fixtures/v7-cult";
import {
  CULT_CHANNEL_UI_V7,
  cultChannelBindUiFixtureV7,
  cultChannelBusyUiFixtureV7,
  cultChannelFuriousUiFixtureV7,
  cultChannelRivalUiFixtureV7,
  cultChannelUnboundUiFixtureV7,
  cultChannelShortUiFixtureV7,
  cultChannelUiFixtureV7,
} from "../fixtures/v7-cult-ui";
import {
  boardPlan,
  required,
  requiredButton,
  requiredElement,
  rig,
  waitUntil,
} from "../fixtures/v7-dom-rig";
import { at } from "../fixtures/v7-revision20";

/**
 * The Cult's channel in the DOM (bead `pulp_wars-mch9.18`,
 * docs/ui/BOARD_TARGETING.md section 3.8): one button per action; the
 * helper and the tile of a Summon, the daemon of a Channel and the cultist
 * of an Anchor are picked on the board; Behold! is cast by its button and
 * Boo! by its one confirmation; the unit's card carries the channel's
 * chips; and End Turn asks once when a daemon is short of its Control.
 */

const A = CULT_CHANNEL_UI_V7;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

function select(scene: ReturnType<typeof rig>, where: CoordV7): void {
  scene.host.callbacks?.onSelection({
    kind: "UNIT",
    unitId: scene.unitAt(where).id,
  });
}

const dock = (): HTMLElement =>
  requiredElement<HTMLElement>(".v7-selection-dock");

const live = (): string =>
  document.querySelector("#v7-live")?.textContent ?? "";

const cultButtons = (): readonly (string | undefined)[] =>
  [...dock().querySelectorAll<HTMLElement>("[data-cult-ability]")].map(
    (button) => button.dataset.cultAbility,
  );

const chips = (): readonly (readonly [string | undefined, string | null])[] =>
  [...dock().querySelectorAll<HTMLElement>(".v7-cult-chip")].map((chip) => [
    chip.dataset.unitStatus,
    chip.textContent,
  ]);

function escape(): void {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
}

/** What a player reads or hears of the dock: no raw ID, command, or tile. */
function expectPlainWords(element: HTMLElement): void {
  const words = [
    element.textContent ?? "",
    ...[...element.querySelectorAll("[title], [aria-label]"), element].flatMap(
      (node) => [
        node.getAttribute("title") ?? "",
        node.getAttribute("aria-label") ?? "",
      ],
    ),
  ].join(" | ");
  expect(words).not.toMatch(/[A-Z]{2,}_[A-Z]|\bu\d+\b|#\d+|\(\d+,\s*\d+\)/);
  expect(words).not.toMatch(
    /SUMMON|CHANNEL|BEHOLD|ANCHOR|\bBOO\b(?!!)|undefined|null|NaN/,
  );
}

describe("Summon: the helper, then the tile, on the board", () => {
  it("has one button with its price, whatever the number of tiles", () => {
    const scene = rig(cultChannelUiFixtureV7());
    select(scene, A.summoner);
    expect(
      scene.controller
        .snapshot()
        .offeredCommands.filter((command) => command.kind === "SUMMON").length,
    ).toBe(12);
    // Sacrifice (its two Initiates), Summon, and Channel (the Horror is in
    // reach); no generic button of a channel command.
    expect(cultButtons()).toEqual(["sacrifice", "summon", "channel"]);
    expect(
      dock().querySelector(
        '[data-action^="command-summon"], [data-action^="command-channel"], [data-action^="command-behold"], [data-action^="command-anchor"], [data-action^="command-boo"]',
      ),
    ).toBeNull();
    const summon = requiredButton("cult-summon");
    expect(summon.querySelector(".v7-action-label")?.textContent).toBe(
      "Summon",
    );
    expect(summon.querySelector(".v7-favour-chip")?.textContent).toBe("−5");
    expect(summon.getAttribute("aria-label")).toMatch(/^Summon · −5 Favour\. /);
    expect(summon.getAttribute("aria-pressed")).toBe("false");
    expectPlainWords(dock());
    scene.app.destroy();
  });

  it("arms, picks the helper and the tile, steps back, and summons", async () => {
    const scene = rig(cultChannelUiFixtureV7());
    const { controller, host } = scene;
    const summoner = scene.unitAt(A.summoner);
    select(scene, A.summoner);
    // Unarmed, nothing of a summoning is on the board.
    expect(
      boardPlan(host).targets.filter((target) =>
        target.family.startsWith("SUMMON"),
      ),
    ).toEqual([]);
    requiredButton("cult-summon").click();
    expect(host.lastModel?.interaction.cultPick).toEqual({
      kind: "SUMMON",
      unitId: summoner.id,
      helperUnitId: null,
    });
    expect(live()).toContain(SUMMON_PICK_HELPER_V7);
    let panel = requiredElement<HTMLElement>("[data-v7-cult-pick]");
    expect(panel.dataset.v7CultPick).toBe("summon");
    expect(panel.classList.contains("v7-board-pick")).toBe(true);
    expect(panel.dataset.boardTargets).toBe("2");
    expect(
      [...panel.querySelectorAll("button")].map((node) => node.dataset.action),
    ).toEqual(["pick-info", "cult-pick-cancel"]);
    // The dock names no helper.
    expect(panel.textContent ?? "").not.toMatch(/Initiate/);
    const helpers = boardPlan(host).targets;
    expect(helpers.map((target) => [target.family, target.at])).toEqual([
      ["SUMMON_HELPER", A.helper],
      ["SUMMON_HELPER", A.secondHelper],
    ]);
    expect(targetHighlightStyleV7("SUMMON_HELPER")).toBe("SUPPORT");

    // The helper: on to the tiles; nothing is sent.
    host.callbacks?.onCommand(required(helpers[0]));
    expect(controller.accepted).toEqual([]);
    expect(host.lastModel?.interaction.cultPick).toEqual({
      kind: "SUMMON",
      unitId: summoner.id,
      helperUnitId: scene.unitAt(A.helper).id,
    });
    expect(live()).toContain(SUMMON_PICK_TILE_V7);
    panel = requiredElement<HTMLElement>("[data-v7-cult-pick]");
    expect(panel.dataset.boardTargets).toBe("6");
    const controls = [...panel.querySelectorAll("button")].map(
      (node) => node.dataset.action,
    );
    expect(controls).toEqual([
      "pick-info",
      "cult-pick-back",
      "cult-pick-cancel",
    ]);
    expect(controls.length).toBeLessThanOrEqual(
      BOARD_PICK_PANEL_MAX_BUTTONS_V7,
    );
    const tiles = boardPlan(host).targets;
    expect(tiles).toHaveLength(6);
    for (const target of tiles) {
      expect(target.family).toBe("SUMMON");
      expect(targetHighlightStyleV7(target.family)).toBe("PLACE");
      expect(target.semanticLabel).not.toMatch(/\d, ?\d/);
    }

    // Back and Escape return to the helper; a second Escape disarms.
    requiredButton("cult-pick-back").click();
    expect(host.lastModel?.interaction.cultPick).toMatchObject({
      helperUnitId: null,
    });
    host.callbacks?.onCommand(required(boardPlan(host).targets[1]));
    escape();
    expect(host.lastModel?.interaction.cultPick).toMatchObject({
      kind: "SUMMON",
      helperUnitId: null,
    });
    escape();
    expect(host.lastModel?.interaction.cultPick ?? null).toBeNull();
    expect(controller.accepted).toEqual([]);

    // The pick sends the offered command.
    requiredButton("cult-summon").click();
    host.callbacks?.onCommand(required(boardPlan(host).targets[0]));
    const tile = required(
      boardPlan(host).targets.find(
        (target) => target.at.x === 5 && target.at.y === 3,
      ),
    );
    host.callbacks?.onCommand(tile);
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "SUMMON",
      unitId: summoner.id,
      helperUnitId: scene.unitAt(A.helper).id,
      at: at(5, 3),
    });
    const view = required(controller.snapshot().view);
    expect(favourOfV7(view, view.viewer.id)).toBe(1);
    expect(
      view.units.filter((unit) => unit.summoned === "HORROR"),
    ).toHaveLength(2);
    expect(host.lastModel?.interaction.cultPick ?? null).toBeNull();
    expect(document.body.textContent ?? "").not.toMatch(
      /DAEMON_SUMMONED|STRAND_FORMED|FAVOUR_SPENT|Daemon summoned|Strand formed/,
    );
    scene.app.destroy();
  });

  it("goes straight to the tile with one helper, and says why it cannot summon", () => {
    let scene = rig(
      withFavourV7(
        cultFieldV7([
          { seat: 0, role: "CAPTAIN", at: at(5, 2) },
          { seat: 0, role: "FIGHTER", at: at(6, 2) },
        ]),
        0,
        9,
      ),
    );
    select(scene, at(5, 2));
    requiredButton("cult-summon").click();
    expect(scene.host.lastModel?.interaction.cultPick).toEqual({
      kind: "SUMMON",
      unitId: scene.unitAt(at(5, 2)).id,
      helperUnitId: scene.unitAt(at(6, 2)).id,
    });
    const panel = requiredElement<HTMLElement>("[data-v7-cult-pick]");
    expect(panel.dataset.boardTargets).toBe("7");
    // One helper: nothing to step back to.
    expect(document.querySelector('[data-action="cult-pick-back"]')).toBeNull();
    escape();
    expect(scene.host.lastModel?.interaction.cultPick ?? null).toBeNull();
    scene.app.destroy();

    // A Summoner alone keeps its button, with the reason.
    document.body.innerHTML = '<div id="app"></div>';
    scene = rig(
      withFavourV7(
        cultFieldV7([{ seat: 0, role: "CAPTAIN", at: at(5, 2) }]),
        0,
        9,
      ),
    );
    select(scene, at(5, 2));
    const summon = requiredButton("cult-summon");
    expect(summon.getAttribute("aria-disabled")).toBe("true");
    expect(summon.dataset.disabledReason).toBe(SUMMON_NO_HELPER_V7);
    expect(summon.getAttribute("aria-label")).toBe(
      `Summon unavailable. ${SUMMON_NO_HELPER_V7}`,
    );
    summon.click();
    expect(scene.host.lastModel?.interaction.cultPick ?? null).toBeNull();
    expect(live()).toContain(SUMMON_NO_HELPER_V7);
    scene.app.destroy();
  });
});

describe("Channel and Anchor: one button, the unit picked on the board", () => {
  it("channels the one daemon in reach from the button, with no third click", async () => {
    const scene = rig(cultChannelUiFixtureV7());
    const { controller, host } = scene;
    select(scene, A.helper);
    expect(cultButtons()).toEqual(["channel"]);
    const channel = requiredButton("cult-channel");
    expect(channel.querySelector(".v7-action-label")?.textContent).toBe(
      "Channel",
    );
    // What the daemon's strands will be, on the button and on the board.
    expect(channel.querySelector(".v7-economy-chip")?.textContent).toBe(
      "2 / 1",
    );
    expect(channel.hasAttribute("aria-pressed")).toBe(false);
    expect(channel.title.length).toBeGreaterThan(20);
    expect(
      boardPlan(host)
        .entries.filter((entry) =>
          entry.key.startsWith("ability-target:CHANNEL_ONLY"),
        )
        .map((entry) => [entry.at, entry.label]),
    ).toEqual([[A.horror, "2 / 1"]]);
    // The own daemon is no target: a click on it selects it.
    expect(
      boardPlan(host).targets.filter((target) => target.family === "CHANNEL"),
    ).toEqual([]);
    channel.click();
    expect(host.lastModel?.interaction.cultPick ?? null).toBeNull();
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "CHANNEL",
      unitId: scene.unitAt(A.helper).id,
      daemonUnitId: scene.unitAt(A.horror).id,
    });
    const view = required(controller.snapshot().view);
    expect(view.cult.daemons).toEqual([
      expect.objectContaining({ role: "HORROR", control: 1, strands: 2 }),
    ]);
    // It channels now: the button says so, and its card is Candlelit.
    select(scene, A.helper);
    const again = requiredButton("cult-channel");
    expect(again.getAttribute("aria-disabled")).toBe("true");
    expect(again.dataset.disabledReason).toBe(CHANNEL_HOLDING_V7);
    again.click();
    expect(live()).toContain(CHANNEL_HOLDING_V7);
    expect(controller.accepted).toHaveLength(1);
    expect(chips()).toEqual([["candlelit", "Candlelit"]]);
    scene.app.destroy();
  });

  it("arms Channel with two daemons in reach, and the daemon is picked on the board", async () => {
    const scene = rig(cultChannelShortUiFixtureV7());
    const { controller, host } = scene;
    select(scene, A.helper);
    const channel = requiredButton("cult-channel");
    expect(channel.textContent).toBe("Channel");
    expect(channel.getAttribute("aria-pressed")).toBe("false");
    channel.click();
    expect(controller.accepted).toEqual([]);
    expect(host.lastModel?.interaction.cultPick).toEqual({
      kind: "CHANNEL",
      unitId: scene.unitAt(A.helper).id,
    });
    expect(live()).toContain(CHANNEL_PICK_V7);
    const panel = requiredElement<HTMLElement>("[data-v7-cult-pick]");
    expect(panel.dataset.boardTargets).toBe("2");
    expect(
      [...panel.querySelectorAll("button")].map((node) => node.dataset.action),
    ).toEqual(["pick-info", "cult-pick-cancel"]);
    expect(panel.textContent ?? "").not.toMatch(/Horror/);
    const targets = boardPlan(host).targets;
    expect(
      targets.map((target) => [target.family, target.at, target.previewLabel]),
    ).toEqual([
      ["CHANNEL", A.horror, "2 / 1"],
      ["CHANNEL", A.loose, "1 / 1"],
    ]);
    // Cancel sends nothing.
    requiredButton("cult-pick-cancel").click();
    expect(host.lastModel?.interaction.cultPick ?? null).toBeNull();
    expect(controller.accepted).toEqual([]);
    requiredButton("cult-channel").click();
    host.callbacks?.onCommand(required(boardPlan(host).targets[1]));
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toMatchObject({
      kind: "CHANNEL",
      daemonUnitId: scene.unitAt(A.loose).id,
    });
    // Both daemons hold now: End Turn asks nothing.
    requiredButton("end-turn").click();
    expect(document.querySelector(".v7-end-turn-confirm")).toBeNull();
    scene.app.destroy();
  });

  it("arms the Thing's grip and grips the channeller picked on the board", async () => {
    const scene = rig(cultChannelUiFixtureV7());
    const { controller, host } = scene;
    select(scene, A.thing);
    expect(cultButtons()).toEqual(["anchor"]);
    const grip = requiredButton("cult-anchor");
    expect(grip.textContent).toBe("Anchor");
    grip.click();
    const targets = boardPlan(host).targets;
    expect(
      targets.map((target) => [target.family, target.at, target.previewLabel]),
    ).toEqual([["ANCHOR", A.channeller, "3 / 1"]]);
    expect(
      requiredElement<HTMLElement>("[data-v7-cult-pick]").textContent ?? "",
    ).not.toMatch(/Initiate/);
    host.callbacks?.onCommand(required(targets[0]));
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toMatchObject({ kind: "ANCHOR" });
    const view = required(controller.snapshot().view);
    expect(view.cult.grips).toHaveLength(1);
    expect(view.cult.daemons[0]).toMatchObject({ strands: 3 });
    select(scene, A.thing);
    expect(chips()).toEqual([["gripping", "Grips"]]);
    expect(requiredButton("cult-anchor").dataset.disabledReason).toBe(
      "It grips a cultist already",
    );
    scene.app.destroy();
  });
});

describe("Behold! and Boo!", () => {
  it("casts Behold! from its button and shows the idol raised", async () => {
    const scene = rig(cultChannelUiFixtureV7());
    const { controller, host } = scene;
    select(scene, A.bearer);
    expect(cultButtons()).toEqual(["channel", "behold"]);
    const behold = requiredButton("cult-behold");
    expect(behold.textContent).toBe("Behold!");
    expect(behold.hasAttribute("aria-pressed")).toBe(false);
    // The ring it would raise is drawn while the Idol Bearer is selected.
    expect(
      boardPlan(host).entries.filter(
        (entry) => entry.abilityStyle === "WARD_PREVIEW",
      ).length,
    ).toBeGreaterThan(0);
    behold.click();
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "BEHOLD",
      unitId: scene.unitAt(A.bearer).id,
    });
    select(scene, A.bearer);
    expect(
      boardPlan(host).entries.filter(
        (entry) => entry.abilityStyle === "IDOL_RING",
      ),
    ).toHaveLength(9);
    expect(chips()).toEqual([["idol", "Idol raised"]]);
    const raised = requiredButton("cult-behold");
    expect(raised.getAttribute("aria-disabled")).toBe("true");
    expect(raised.dataset.disabledReason).toBe(BEHOLD_RAISED_V7);
    scene.app.destroy();
  });

  it("previews a Boo! on the board and casts it with its one confirmation", async () => {
    const scene = rig(cultChannelUiFixtureV7());
    const { controller, host } = scene;
    select(scene, A.horror);
    const text = dock().textContent ?? "";
    expect(text).toContain("Horror");
    expect(text).not.toMatch(/Caller|KNIGHT|HORROR/);
    // The Horror's card: its strands against its Control.
    expect(chips()).toEqual([["control", "1 / 1"]]);
    expect(cultButtons()).toEqual(["boo"]);
    requiredButton("cult-boo").click();
    expect(host.lastModel?.interaction.cultPick).toEqual({
      kind: "BOO",
      unitId: scene.unitAt(A.horror).id,
    });
    const panel = requiredElement<HTMLElement>("[data-v7-cult-pick]");
    expect(panel.dataset.v7CultPick).toBe("boo");
    expect(panel.dataset.boardTargets).toBe("0");
    expect(
      [...panel.querySelectorAll("button")].map((node) => node.dataset.action),
    ).toEqual(["pick-info", "cult-boo-cast", "cult-pick-cancel"]);
    // The Human Fighter and the cultists' own Hexer stand beside it.
    expect(panel.querySelector(".v7-martian-detail")?.textContent).toBe(
      "2 jump",
    );
    expect(panel.textContent ?? "").not.toMatch(/Fighter|Hexer/);
    const plan = boardPlan(host);
    expect(plan.targets).toEqual([]);
    expect(
      plan.entries.filter((entry) => entry.cultLink?.kind === "BOO_JUMP"),
    ).toHaveLength(2);
    // Escape disarms; nothing was sent.
    escape();
    expect(host.lastModel?.interaction.cultPick ?? null).toBeNull();
    expect(controller.accepted).toEqual([]);
    requiredButton("cult-boo").click();
    requiredButton("cult-boo-cast").click();
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toMatchObject({ kind: "BOO" });
    expect(document.body.textContent ?? "").not.toMatch(
      /UNITS_SCARED|Units scared/,
    );
    scene.app.destroy();
  });
});

describe("the channel on a unit's card, and plain words", () => {
  it("shows the chips of each unit of a lodge at work", () => {
    const scene = rig(cultChannelBusyUiFixtureV7());
    const expected: readonly (readonly [CoordV7, readonly string[]])[] = [
      [A.horror, ["4 / 1"]],
      [A.channeller, ["Candlelit", "Gripped"]],
      [A.hexer, ["Candlelit"]],
      [A.thing, ["Grips"]],
      [A.bearer, ["Idol raised"]],
      [A.summoner, []],
    ];
    for (const [where, labels] of expected) {
      select(scene, where);
      expect(chips().map((chip) => chip[1])).toEqual(labels);
      for (const chip of dock().querySelectorAll<HTMLElement>(".v7-cult-chip"))
        expect(chip.title.length).toBeGreaterThan(20);
      expectPlainWords(dock());
    }
    scene.app.destroy();
  });

  it("shows a rival the daemon's strands and offers it no channel action", () => {
    const scene = rig(cultChannelRivalUiFixtureV7());
    select(scene, at(5, 4));
    expect(chips()).toEqual([["control", "2 / 1"]]);
    expect(cultButtons()).toEqual([]);
    select(scene, at(4, 6));
    expect(chips()).toEqual([["candlelit", "Candlelit"]]);
    expect(cultButtons()).toEqual([]);
    scene.app.destroy();
  });
});

describe("an Unbound daemon", () => {
  it("shows its card as the neutral unit it is, Unbound and Furious, with no action", () => {
    for (const [fixture, labels] of [
      [cultChannelUnboundUiFixtureV7, ["Unbound"]],
      [cultChannelFuriousUiFixtureV7, ["Unbound", "Furious"]],
    ] as const) {
      document.body.innerHTML = '<div id="app"></div>';
      const scene = rig(fixture());
      select(scene, A.loose);
      const text = dock().textContent ?? "";
      expect(text).toContain("Unbound Horror");
      expect(text).not.toMatch(/Knight|KNIGHT|Spider|Caller/);
      expect(chips().map((chip) => chip[1])).toEqual(labels);
      expect(cultButtons()).toEqual([]);
      expect(
        dock().querySelector('[data-action^="command-channel"]'),
      ).toBeNull();
      expectPlainWords(dock());
      // The board marks it and the unit it goes for.
      const marked = boardPlan(scene.host).entries.filter(
        (entry) => entry.cult?.unbound === true || entry.cult?.eye === true,
      );
      expect(marked.map((entry) => entry.label)).toContain("Unbound Horror");
      expect(marked.some((entry) => entry.cult?.eye === true)).toBe(true);
      // Nobody is asked about it at End Turn: it is nobody's to lose.
      requiredButton("end-turn").click();
      expect(document.querySelector(".v7-end-turn-confirm")).toBeNull();
      scene.app.destroy();
    }
  });

  it("is bound again from the one button, with no generic Bind button beside it", async () => {
    const scene = rig(cultChannelBindUiFixtureV7());
    const { controller } = scene;
    select(scene, at(5, 2));
    expect(cultButtons()).toEqual(["channel"]);
    const bind = requiredButton("cult-channel");
    expect(bind.querySelector(".v7-action-label")?.textContent).toBe("Bind");
    expect(bind.querySelector(".v7-economy-chip")?.textContent).toBe("1 / 1");
    expect(bind.title).toMatch(/yours again/);
    expect(
      dock().querySelector('[data-action^="command-"][data-action*="channel"]'),
    ).toBeNull();
    bind.click();
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toMatchObject({ kind: "CHANNEL" });
    const view = required(controller.snapshot().view);
    const horror = required(
      view.units.find((unit) => unit.summoned === "HORROR"),
    );
    expect(horror.ownerId).toBe(view.viewer.id);
    expect(view.monsters).toEqual([]);
    await waitUntil(() => live().includes("Horror bound again"));
    scene.app.destroy();
  });

  it("leaves a Furious daemon out: the button channels the one bound daemon", () => {
    const scene = rig(cultChannelFuriousUiFixtureV7());
    select(scene, A.helper);
    // The bound Horror is the one daemon it may channel.
    const channel = requiredButton("cult-channel");
    expect(channel.querySelector(".v7-action-label")?.textContent).toBe(
      "Channel",
    );
    expect(channel.dataset.cultDirect).toBe("true");
    scene.app.destroy();
  });
});

describe("End Turn asks once when a daemon is short of its Control", () => {
  const question = (): HTMLElement | null =>
    document.querySelector<HTMLElement>(".v7-end-turn-confirm");

  it("asks, in few words, with one clear choice", async () => {
    const scene = rig(cultChannelShortUiFixtureV7());
    const { controller } = scene;
    expect(question()).toBeNull();
    requiredButton("end-turn").click();
    const dialog = required(question());
    expect(controller.accepted).toEqual([]);
    expect(dialog.getAttribute("role")).toBe("alertdialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toBe(
      "The Horror will be Unbound. End turn?",
    );
    expect(
      dialog.querySelector(".v7-end-turn-question > span")?.textContent,
    ).toBe("The Horror will be Unbound.");
    // The count the pips show, and two answers; nothing else.
    expect(dialog.querySelector(".v7-cult-chip")?.textContent).toBe("0 / 1");
    expect(
      [...dialog.querySelectorAll("button")].map((node) => [
        node.dataset.action,
        node.textContent,
      ]),
    ).toEqual([
      ["end-turn-back", "Back"],
      ["end-turn-confirm", "End turn"],
    ]);
    expect((dialog.textContent ?? "").length).toBeLessThan(50);
    expectPlainWords(dialog);
    // A scrim keeps the board behind it out of reach.
    expect(document.querySelector(".v7-scrim")).not.toBeNull();

    // Back: the turn goes on, focus returns to End Turn.
    requiredButton("end-turn-back").click();
    expect(question()).toBeNull();
    expect(controller.accepted).toEqual([]);
    // Escape answers Back too.
    requiredButton("end-turn").click();
    expect(question()).not.toBeNull();
    escape();
    expect(question()).toBeNull();
    expect(controller.accepted).toEqual([]);

    // The choice is the player's: End turn ends it.
    requiredButton("end-turn").click();
    requiredButton("end-turn-confirm").click();
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({ kind: "END_TURN" });
    expect(question()).toBeNull();
    scene.app.destroy();
  });

  it("asks from the keyboard too, and never when every daemon holds", async () => {
    let scene = rig(cultChannelShortUiFixtureV7());
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "e", bubbles: true }),
    );
    expect(question()).not.toBeNull();
    expect(scene.controller.accepted).toEqual([]);
    scene.app.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    scene = rig(cultChannelBusyUiFixtureV7());
    requiredButton("end-turn").click();
    expect(question()).toBeNull();
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]).toEqual({ kind: "END_TURN" });
    scene.app.destroy();
  });
});
