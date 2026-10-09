// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  queryPlayerCommandsV7,
  type CoordV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import {
  BOARD_PICK_PANEL_MAX_BUTTONS_V7,
  targetHighlightStyleV7,
} from "../../src/render/canvas/target-highlight-v7";
import {
  FREEZE_ALREADY_ACTED_V7,
  FREEZE_NEEDS_RIME_V7,
  ICEBOUND_BLOCKED_V7,
  ICE_FOR_SHIPS_HELP_V7,
  ICE_HELP_RULES_V7,
  ICE_SEA_DOG_GOAL_V7,
  SLIDE_MOVE_LABEL_V7,
  SLIP_MOVE_LABEL_V7,
} from "../../src/render/frozen-sea-presentation-v7";
import {
  boardPlan,
  required,
  requiredButton,
  requiredElement,
  rig,
  waitUntil,
} from "../fixtures/v7-dom-rig";
import { frozenArenaV7, patchFrozenUnitV7 } from "../fixtures/v7-frozen-sea";
import {
  FROZEN_UI_V7,
  frozenFreezeUiFixtureV7,
  frozenIceboundUiFixtureV7,
  frozenSlideUiFixtureV7,
} from "../fixtures/v7-frozen-sea-ui";
import { navalUnitAtV7 } from "../fixtures/v7-naval-branch";

// The frozen sea interface (bead pulp_wars-5ti.7, second part;
// docs/ui/BOARD_TARGETING.md section 3.5): Freeze for a line role and for
// the Ice Witch, the slide and the slip, an icebound ship's reasons and
// crush warning, the ice chip, and the Ice Folk technology cards, Help and
// Gallery.

const COORDINATE = /\b\d{1,2}, ?\d{1,2}\b/;
const at = (coord: CoordV7): string => `${coord.x},${coord.y}`;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Freeze, a line role: armed and picked on the board", () => {
  it("has one button, shows each line with its outcome, and freezes the picked one", async () => {
    const { controller, host, app, unitAt } = rig(frozenFreezeUiFixtureV7());
    const yeti = unitAt(FROZEN_UI_V7.yeti);
    host.callbacks?.onSelection({ kind: "UNIT", unitId: yeti.id });
    const freeze = requiredButton("freeze");
    expect(document.querySelectorAll('[data-action="freeze"]')).toHaveLength(1);
    expect(freeze.dataset.freezeAbility).toBe("line");
    expect(freeze.getAttribute("aria-pressed")).toBe("false");
    expect(freeze.textContent).toBe("Freeze");
    expect(
      document.querySelector('[data-action^="command-freeze"]'),
    ).toBeNull();
    // Unarmed, no tile is a Freeze target.
    expect(
      boardPlan(host).targets.some((target) => target.family === "FREEZE"),
    ).toBe(false);

    freeze.click();
    expect(host.lastModel?.interaction.freezePick).toEqual({
      kind: "FREEZE",
      unitId: yeti.id,
    });
    const panel = requiredElement<HTMLElement>("[data-v7-freeze-pick]");
    expect(panel.classList.contains("v7-board-pick")).toBe(true);
    expect(panel.dataset.boardTargets).toBe("3");
    const controls = [...panel.querySelectorAll("button")].map(
      (control) => control.dataset.action,
    );
    expect(controls).toEqual(["pick-info", "freeze-pick-cancel"]);
    expect(controls.length).toBeLessThanOrEqual(
      BOARD_PICK_PANEL_MAX_BUTTONS_V7,
    );
    const targets = boardPlan(host).targets;
    expect(targets.map((target) => target.family)).toEqual([
      "FREEZE",
      "FREEZE",
      "FREEZE",
    ]);
    for (const target of targets) {
      expect(targetHighlightStyleV7(target.family)).toBe("PLACE");
      expect(target.previewLabel).toMatch(/^Ice [12] · 5 turns$/);
      expect(target.semanticLabel).not.toMatch(COORDINATE);
    }
    for (const text of [panel.textContent ?? "", panel.title])
      expect(text).not.toMatch(COORDINATE);

    // Escape disarms; Cancel does too; nothing was sent.
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(host.lastModel?.interaction.freezePick ?? null).toBeNull();
    expect(document.querySelector("[data-v7-freeze-pick]")).toBeNull();
    requiredButton("freeze").click();
    requiredButton("freeze-pick-cancel").click();
    expect(host.lastModel?.interaction.freezePick ?? null).toBeNull();
    expect(controller.accepted).toEqual([]);

    // Pick the tile south of the Yeti on the board.
    requiredButton("freeze").click();
    const south = required(
      boardPlan(host).targets.find(
        (target) => at(target.at) === at(FROZEN_UI_V7.freezeAt),
      ),
    );
    host.callbacks?.onCommand(south);
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "FREEZE",
      unitId: yeti.id,
      at: FROZEN_UI_V7.freezeAt,
    });
    const after = required(controller.snapshot().view);
    expect(after.ice.map((entry) => at(entry.at))).toEqual([
      at(FROZEN_UI_V7.freezeAt),
      at(FROZEN_UI_V7.freezeBeyond),
    ]);
    expect(host.lastModel?.interaction.freezePick ?? null).toBeNull();
    await waitUntil(
      () =>
        document
          .querySelector("#v7-live")
          ?.textContent?.includes("You froze 2 tiles") === true,
    );
    // The new ice is on the plan as sea ice, the Deep Water tile included
    // (Pack Ice).
    expect(
      boardPlan(host)
        .entries.filter((entry) => entry.seaIce !== undefined)
        .map((entry) => [at(entry.at), entry.seaIce?.depth]),
    ).toEqual([
      [at(FROZEN_UI_V7.freezeAt), "SHALLOW"],
      [at(FROZEN_UI_V7.freezeBeyond), "DEEP"],
    ]);
    app.destroy();
  });

  it("is disabled with the engine's reason, and absent away from water", () => {
    // No Rime: a unit on the shore names the technology.
    const noRime = rig(
      frozenArenaV7({
        technologies: [[], []],
        units: [{ seat: 0, role: "FIGHTER", at: FROZEN_UI_V7.yeti }],
      }),
    );
    noRime.host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: noRime.unitAt(FROZEN_UI_V7.yeti).id,
    });
    const blocked = requiredButton("freeze");
    expect(blocked.getAttribute("aria-disabled")).toBe("true");
    expect(blocked.dataset.disabledReason).toBe(FREEZE_NEEDS_RIME_V7);
    expect(blocked.getAttribute("aria-label")).toBe(
      `Freeze unavailable. ${FREEZE_NEEDS_RIME_V7}`,
    );
    blocked.click();
    expect(noRime.host.lastModel?.interaction.freezePick ?? null).toBeNull();
    noRime.app.destroy();

    // A unit that already acted.
    document.body.innerHTML = '<div id="app"></div>';
    const state = frozenFreezeUiFixtureV7();
    const yeti = navalUnitAtV7(state, FROZEN_UI_V7.yeti);
    const acted = rig(
      patchFrozenUnitV7(state, yeti.id, {
        activation: { ...yeti.activation, attacked: true, attacksUsed: 1 },
      }),
    );
    acted.host.callbacks?.onSelection({ kind: "UNIT", unitId: yeti.id });
    expect(requiredButton("freeze").dataset.disabledReason).toBe(
      FREEZE_ALREADY_ACTED_V7,
    );
    acted.app.destroy();

    // A unit with no water next to it has no Freeze button.
    document.body.innerHTML = '<div id="app"></div>';
    const inland = rig(
      frozenArenaV7({
        units: [{ seat: 0, role: "FIGHTER", at: { x: 2, y: 0 } }],
      }),
    );
    inland.host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: inland.unitAt({ x: 2, y: 0 }).id,
    });
    expect(document.querySelector('[data-action="freeze"]')).toBeNull();
    inland.app.destroy();
  });
});

describe("Freeze, the Ice Witch: her ring, one button", () => {
  it("marks the ring while she is selected, lifts it on focus, and casts on press", async () => {
    const { controller, host, app, unitAt } = rig(frozenFreezeUiFixtureV7());
    const witch = unitAt(FROZEN_UI_V7.witch);
    host.callbacks?.onSelection({ kind: "UNIT", unitId: witch.id });
    const freeze = requiredButton("freeze");
    expect(freeze.dataset.freezeAbility).toBe("ring");
    expect(freeze.dataset.boardTiles).toBe("3");
    expect(freeze.hasAttribute("aria-pressed")).toBe(false);
    expect(freeze.getAttribute("aria-label")).toContain("3 tiles of ice");
    expect(freeze.getAttribute("aria-label")).not.toMatch(COORDINATE);
    const ring = () =>
      boardPlan(host).entries.filter((entry) =>
        entry.key.startsWith("ability-area:FREEZE:"),
      );
    expect(ring()).toHaveLength(3);
    expect(new Set(ring().map((entry) => entry.abilityStyle))).toEqual(
      new Set(["FREEZE"]),
    );
    // Focus (and hover) lift the ring and label it; blur returns it.
    freeze.dispatchEvent(new FocusEvent("focus"));
    expect(host.lastModel?.interaction.freezeRingFocusUnitId).toBe(witch.id);
    expect(new Set(ring().map((entry) => entry.abilityStyle))).toEqual(
      new Set(["FREEZE_FOCUS"]),
    );
    expect(
      boardPlan(host).entries.find((entry) =>
        entry.key.startsWith("ability-target:FREEZE_RING:"),
      )?.label,
    ).toBe("Ice 3 · 5 turns");
    freeze.dispatchEvent(new FocusEvent("blur"));
    expect(
      host.lastModel?.interaction.freezeRingFocusUnitId ?? null,
    ).toBeNull();
    // Nothing is armed and no tile is a target: the button casts.
    expect(document.querySelector("[data-v7-freeze-pick]")).toBeNull();
    expect(
      boardPlan(host).targets.some((target) => target.family === "FREEZE"),
    ).toBe(false);
    freeze.click();
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "FREEZE",
      unitId: witch.id,
      at: FROZEN_UI_V7.witch,
    });
    expect(required(controller.snapshot().view).ice).toHaveLength(3);
    app.destroy();
  });

  it("freezes Deep Water only with Pack Ice", () => {
    // A Witch standing on the ice at the edge of the deep sea.
    const scene = (technologies: readonly TechnologyIdV7[]) =>
      rig(
        frozenArenaV7({
          technologies: [technologies, []],
          units: [{ seat: 0, role: "CAPTAIN", at: { x: 2, y: 3 } }],
        }),
      );
    const rime = scene(["SHORECRAFT"]);
    rime.host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: rime.unitAt({ x: 2, y: 3 }).id,
    });
    // Rime: the two Shallow tiles beside her (her own tile is ice already
    // and is refreshed).
    expect(requiredButton("freeze").dataset.boardTiles).toBe("3");
    rime.app.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    const packIce = scene(["SHORECRAFT", "NAVIGATION"]);
    packIce.host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: packIce.unitAt({ x: 2, y: 3 }).id,
    });
    // Pack Ice: the three Deep Water tiles south of her too.
    expect(requiredButton("freeze").dataset.boardTiles).toBe("6");
    expect(
      boardPlan(packIce.host)
        .entries.filter((entry) => entry.key.startsWith("ability-area:FREEZE:"))
        .map((entry) => at(entry.at))
        .sort(),
    ).toEqual(["1,3", "1,4", "2,3", "2,4", "3,3", "3,4"]);
    packIce.app.destroy();
  });
});

describe("moving on ice", () => {
  it("a slider sees the tile it stops on, with the slide and its legend", async () => {
    const { controller, host, app, unitAt } = rig(frozenSlideUiFixtureV7());
    const yeti = unitAt(FROZEN_UI_V7.bridgeHead);
    host.callbacks?.onSelection({ kind: "UNIT", unitId: yeti.id });
    const last = required(FROZEN_UI_V7.bridge.at(-1));
    const destination = required(
      boardPlan(host).targets.find(
        (target) => target.family === "MOVE" && at(target.at) === at(last),
      ),
    );
    expect(destination.slide).toEqual([
      { from: FROZEN_UI_V7.bridgeHead, tiles: FROZEN_UI_V7.bridge },
    ]);
    // No tile along the slide is offered (Ice Folk Freeze,
    // `pulp_wars-w49.37`: but Glacier's extra point reaches the first bridge
    // tile by a diagonal step, which starts no slide).
    for (const tile of FROZEN_UI_V7.bridge.slice(1, -1))
      expect(
        boardPlan(host).targets.some((target) => at(target.at) === at(tile)),
      ).toBe(false);
    const legend = requiredElement<HTMLElement>(
      '.v7-selection-dock [data-landing-marker="slide"]',
    );
    expect(legend.textContent).toBe(SLIDE_MOVE_LABEL_V7);
    expect(
      document.querySelector('.v7-selection-dock [data-landing-marker="slip"]'),
    ).toBeNull();
    host.callbacks?.onCommand(destination);
    await waitUntil(() => controller.accepted.length === 1);
    const moved = required(
      required(controller.snapshot().view).units.find(
        (unit) => unit.id === yeti.id,
      ),
    );
    expect(at(moved.at)).toBe(at(last));
    // On the ice its dock says so.
    host.callbacks?.onSelection({ kind: "UNIT", unitId: yeti.id });
    expect(
      requiredElement<HTMLElement>(
        '.v7-selection-dock [data-unit-status="ice-cover"]',
      ).textContent,
    ).toBe("Ice cover");
    app.destroy();
  });

  it("the Sabretooth has plain Moves on ice and no legend", () => {
    const { host, app, unitAt } = rig(frozenSlideUiFixtureV7());
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAt({ x: 0, y: 2 }).id,
    });
    const onIce = boardPlan(host).targets.filter((target) =>
      FROZEN_UI_V7.bridge.some((tile) => at(tile) === at(target.at)),
    );
    expect(onIce.length).toBeGreaterThan(1);
    for (const target of onIce) {
      expect(target.slide).toBeUndefined();
      expect(target.slip).toBeUndefined();
    }
    expect(
      document.querySelector(
        '.v7-selection-dock [data-landing-marker="slide"], .v7-selection-dock [data-landing-marker="slip"]',
      ),
    ).toBeNull();
    app.destroy();
  });

  it("another faction's unit is told that its Move ends on the ice", () => {
    const { host, app, unitAt } = rig(
      frozenSlideUiFixtureV7({ slipper: true }),
    );
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAt(FROZEN_UI_V7.bridgeHead).id,
    });
    const first = required(FROZEN_UI_V7.bridge[0]);
    const slip = required(
      boardPlan(host).targets.find((target) => at(target.at) === at(first)),
    );
    expect(slip.slip).toBe(true);
    expect(slip.semanticLabel).toBe(SLIP_MOVE_LABEL_V7);
    expect(
      requiredElement<HTMLElement>(
        '.v7-selection-dock [data-landing-marker="slip"]',
      ).textContent,
    ).toBe(SLIP_MOVE_LABEL_V7);
    // Help stays the short "How to play" (bead pulp_wars-2yc.39): the
    // legend above is where the ice explains itself.
    requiredButton("compact-menu").click();
    requiredButton("help").click();
    expect(document.querySelector(".v7-help-naval")).toBeNull();
    expect(document.querySelector(".v7-help-ice")).toBeNull();
    expect(requiredElement<HTMLElement>(".v7-help").textContent).not.toContain(
      ICE_FOR_SHIPS_HELP_V7[1],
    );
    app.destroy();
  });
});

describe("an icebound ship", () => {
  it("tells its owner why it cannot act and what the ice does next", () => {
    const { host, app, view, unitAt } = rig(
      frozenIceboundUiFixtureV7({ victim: true }),
    );
    const ship = unitAt(FROZEN_UI_V7.frozenShip);
    host.callbacks?.onSelection({ kind: "UNIT", unitId: ship.id });
    expect(
      queryPlayerCommandsV7(view).some(
        (command) =>
          (command.kind === "MOVE" || command.kind === "ATTACK") &&
          command.unitId === ship.id,
      ),
    ).toBe(false);
    const chip = requiredElement<HTMLElement>(
      '.v7-selection-dock [data-unit-status="icebound"]',
    );
    expect(chip.textContent).toBe("Icebound");
    const crush = requiredElement<HTMLElement>(
      '.v7-selection-dock [data-unit-status="ice-crush"]',
    );
    expect(crush.textContent).toBe("−3 HP");
    expect(crush.title).toBe(
      "The ice crushes it for 3 at the start of Player 2's turn",
    );
    expect(crush.dataset.lethal).toBe("false");
    const blocked = requiredButton("icebound-blocked");
    expect(blocked.getAttribute("aria-disabled")).toBe("true");
    expect(blocked.title).toBe(ICEBOUND_BLOCKED_V7);
    blocked.click();
    expect(document.querySelector("#v7-live")?.textContent).toContain(
      ICEBOUND_BLOCKED_V7,
    );
    // The board marks it and offers nothing.
    expect(boardPlan(host).targets).toEqual([]);
    expect(
      boardPlan(host).entries.find((entry) => entry.key === `unit:${ship.id}`)
        ?.icebound,
    ).toEqual({ crush: "−3 HP", lethal: false });
    app.destroy();
  });

  it("is shown to the Ice Folk too, with the crush as theirs", () => {
    const { host, app, unitAt } = rig(frozenIceboundUiFixtureV7());
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAt(FROZEN_UI_V7.frozenShip).id,
    });
    expect(
      requiredElement<HTMLElement>(
        '.v7-selection-dock [data-unit-status="ice-crush"]',
      ).title,
    ).toBe("The ice crushes it for 3 at the start of your turn");
    // An enemy ship has no disabled button of the viewer's.
    expect(
      document.querySelector('[data-action="icebound-blocked"]'),
    ).toBeNull();
    app.destroy();
  });
});

describe("the ice chip of a tile", () => {
  it("shows the countdown, and that ice stays in its owner's territory", () => {
    const { host, app } = rig(frozenIceboundUiFixtureV7());
    const chip = (): HTMLElement =>
      requiredElement<HTMLElement>('.v7-selection-dock [data-winter="ice"]');
    for (const [index, turns] of [3, 2, 1].entries()) {
      host.callbacks?.onSelection({
        kind: "TILE",
        at: required(FROZEN_UI_V7.melting[index]),
      });
      expect(chip().dataset.iceTurns).toBe(String(turns));
      expect(chip().textContent).toBe(`Ice · ${turns}`);
      expect(chip().querySelector('[data-icon="snowflake"]')).not.toBeNull();
      expect(chip().title).not.toMatch(COORDINATE);
    }
    host.callbacks?.onSelection({ kind: "TILE", at: FROZEN_UI_V7.permanent });
    expect(chip().dataset.iceTurns).toBe("permanent");
    expect(chip().textContent).toBe("Ice · stays");
    expect(chip().title).toContain("It does not melt in your territory");
    // The plan draws snow on the permanent tile and cracks on the others.
    const cells = new Map(
      boardPlan(host)
        .entries.filter((entry) => entry.seaIce !== undefined)
        .map((entry) => [at(entry.at), entry.seaIce]),
    );
    expect(cells.get(at(FROZEN_UI_V7.permanent))).toMatchObject({
      permanent: true,
      stage: 0,
    });
    expect(
      FROZEN_UI_V7.melting.map((tile) => cells.get(at(tile))?.stage),
    ).toEqual([1, 2, 3]);
    app.destroy();
  });
});

describe("Ice Folk technology cards, Help, achievements and Gallery", () => {
  it("names the five technologies and lists what each does, with no ship", () => {
    const { app } = rig(
      frozenArenaV7({
        technologies: [[], []],
        units: [],
      }),
    );
    requiredButton("tech").click();
    const lines = (tech: string): string[] => {
      requiredButton(`tech-${tech}`).click();
      return [
        ...requiredElement<HTMLElement>(".v7-tech-detail").querySelectorAll(
          ".v7-tech-unlocks li",
        ),
      ].map((item) => item.textContent ?? "");
    };
    const name = (tech: string): string =>
      requiredButton(`tech-${tech}`).querySelector(".v7-tech-name")
        ?.textContent ?? "";
    expect(
      [
        "shorecraft",
        "navigation",
        "naval_engineering",
        "seamanship",
        "submersibles",
      ].map(name),
    ).toEqual(["Rime", "Pack Ice", "Icebound", "Black Ice", "Glacier"]);
    const rime = lines("shorecraft");
    expect(rime).toContain(
      "Freeze: units turn Shallow Water next to them to ice, two tiles in a line (the Ice Witch: all around her), and slide across it",
    );
    expect(rime).toContain("The Ice Folk build no ships");
    expect(rime.join(" ")).not.toMatch(/embark|Patrol Boat/i);
    expect(lines("navigation")).toContain("Freeze: Deep Water freezes too");
    expect(lines("navigation").join(" ")).not.toContain("Ships can sail");
    const icebound = lines("naval_engineering");
    expect(icebound).toContain(
      "Icebound: Freeze locks an enemy ship in; it cannot sail, shoot or strike back, and takes 3 each turn",
    );
    expect(icebound.join(" ")).not.toContain("Battleship");
    expect(lines("seamanship")).toEqual([
      "Black Ice: enemies standing on your ice are Frozen at the start of your turn",
    ]);
    const glacier = lines("submersibles");
    expect(glacier).toContain(
      "Glacier: your ice lasts 5 turns, gives your units on it cover, and gives a Move across it +1 Move",
    );
    expect(glacier.join(" ")).not.toContain("Submarine");
    expect(
      requiredElement<HTMLElement>(".v7-tech-detail").getAttribute(
        "aria-label",
      ),
    ).toBe("Glacier details");
    app.destroy();
  });

  it("Help has no 'On the ice' list for the Ice Folk, and their Sea Dog holds the ice", () => {
    // Bead pulp_wars-2yc.39: Help is the same short text for every faction;
    // Freeze is explained on the unit's "?" (the unit glossary).
    const { app } = rig(frozenFreezeUiFixtureV7());
    requiredButton("compact-menu").click();
    requiredButton("help").click();
    expect(document.querySelector(".v7-help-ice")).toBeNull();
    expect(document.querySelector(".v7-help-naval")).toBeNull();
    const help = requiredElement<HTMLElement>(".v7-help").textContent ?? "";
    for (const [name] of ICE_HELP_RULES_V7)
      expect(help).not.toContain(`${name}:`);
    expect(
      [...document.querySelectorAll("h3")].map(
        (heading) => heading.textContent,
      ),
    ).not.toContain("On the ice");
    requiredButton("close-overlay").click();
    requiredButton("compact-menu").click();
    requiredButton("achievements").click();
    expect(
      [...document.querySelectorAll(".v7-achievement-goal")].map(
        (goal) => goal.textContent,
      ),
    ).toContain(ICE_SEA_DOG_GOAL_V7);
    app.destroy();
  });
});
