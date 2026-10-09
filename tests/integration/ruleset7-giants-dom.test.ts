// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type { CoordV7 } from "../../src/engine/index";
import { BOARD_PICK_PANEL_MAX_BUTTONS_V7 } from "../../src/render/canvas/target-highlight-v7";
import {
  GINGERBREAD_MAN_INFO_V7,
  GINGERBREAD_MAN_LABEL_V7,
} from "../../src/render/giant-presentation-v7";
import {
  boardPlan,
  required,
  requiredButton,
  requiredElement,
  rig,
  waitUntil,
} from "../fixtures/v7-dom-rig";
import {
  GIANTS_UI_V7,
  giantsBreakOffFixtureV7,
  giantsCrushFixtureV7,
  giantsGingerbreadFixtureV7,
  giantsRewardFixtureV7,
  giantsSiegeFixtureV7,
  giantsSiegeRazedFixtureV7,
  giantsStompFixtureV7,
  giantsSwallowFixtureV7,
  giantsSwallowedFixtureV7,
  giantsTossFixtureV7,
} from "../fixtures/v7-giants-ui";

/**
 * The giants' signatures in the DOM (`pulp_wars-w49.32`,
 * docs/product/RULESET_7_GIANTS.md section 10, docs/ui/BOARD_TARGETING.md
 * section 3.2): one button per signature command that aims it on the
 * board (never a button per victim, landing or tile pair), the aiming
 * panel, the board pick that sends the offered command, Escape and Back,
 * the unit card's signature line and held victim, the Gingerbread Man,
 * the city panel's Walls, and the reward dialog's giant line.
 */

const COORDINATE = /\b\d{1,2}, ?\d{1,2}\b/;
const key = (at: CoordV7): string => `${at.x},${at.y}`;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

function select(scene: ReturnType<typeof rig>, at: CoordV7): number {
  const unit = scene.unitAt(at);
  scene.host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
  return unit.id;
}

function pickOnBoard(scene: ReturnType<typeof rig>, at: CoordV7): void {
  const target = boardPlan(scene.host).targets.find(
    (candidate) => key(candidate.at) === key(at),
  );
  scene.host.callbacks?.onCommand(required(target));
}

function panelButtons(): readonly string[] {
  return [
    ...requiredElement<HTMLElement>(".v7-giant-pick").querySelectorAll(
      "button",
    ),
  ].map((button) => button.textContent ?? "");
}

describe("Swallow: one button, the victim picked on the board", () => {
  it("aims, lists no victim in the dock, and swallows the picked one", async () => {
    const scene = rig(giantsSwallowFixtureV7());
    const at = GIANTS_UI_V7.swallow;
    const abomination = select(scene, at.abomination);
    expect(
      document.querySelectorAll('[data-action="giant-swallow"]'),
    ).toHaveLength(1);
    // No generic command button per victim.
    expect(
      document.querySelector('[data-action^="command-swallow"]'),
    ).toBeNull();
    const button = requiredButton("giant-swallow");
    expect(button.getAttribute("aria-label")).toBe(
      "Swallow. Swallow an enemy of 12 HP or less next to it",
    );
    expect(button.getAttribute("aria-pressed")).toBe("false");
    // The unit card states the signature in one line.
    expect(
      requiredElement<HTMLElement>(".v7-giant-signature").textContent,
    ).toMatch(/^Swallow: Swallows an enemy of 12 HP or less next to it/);
    button.click();
    expect(scene.host.lastModel?.interaction.giantPick).toEqual({
      kind: "SWALLOW",
      unitId: abomination,
    });
    const panel = requiredElement<HTMLElement>("[data-v7-giant-pick]");
    expect(panel.dataset.boardTargets).toBe("2");
    expect(panelButtons()).toEqual(["?", "Cancel"]);
    // The signature's line steps aside while it is aimed.
    expect(document.querySelector(".v7-giant-signature")).toBeNull();
    expect(panel.textContent ?? "").not.toMatch(COORDINATE);
    pickOnBoard(scene, at.knight);
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]).toEqual({
      kind: "SWALLOW",
      unitId: abomination,
      targetUnitId: scene.unitAt(at.knight).id,
    });
    expect(scene.host.lastModel?.interaction.giantPick).toBeUndefined();
    scene.app.destroy();
  });

  it("shows the held victim's portrait and HP on the Abomination's card", () => {
    const scene = rig(giantsSwallowedFixtureV7());
    select(scene, GIANTS_UI_V7.swallow.abomination);
    const chip = requiredElement<HTMLElement>('[data-unit-status="swallowed"]');
    expect(chip.textContent).toBe("Knight 9/13");
    expect(chip.getAttribute("aria-label")).toMatch(
      /^Swallowed Knight at 9 HP: it loses 4 each turn/,
    );
    // Done for the turn: no button to aim.
    expect(document.querySelector('[data-action="giant-swallow"]')).toBeNull();
    scene.app.destroy();
  });
});

describe("Goblin Toss: the Goblin, then its landing, on the board", () => {
  it("picks the Goblin, then the landing, and Back steps back to the Goblin", async () => {
    const scene = rig(giantsTossFixtureV7());
    const at = GIANTS_UI_V7.toss;
    const troll = select(scene, at.troll);
    requiredButton("giant-toss").click();
    expect(scene.host.lastModel?.interaction.giantPick).toEqual({
      kind: "TOSS",
      unitId: troll,
      passengerUnitId: null,
    });
    expect(
      requiredElement<HTMLElement>("[data-v7-giant-pick]").dataset.boardTargets,
    ).toBe("2");
    expect(panelButtons()).toEqual(["?", "Cancel"]);
    const goblin = scene.unitAt(at.goblin).id;
    pickOnBoard(scene, at.goblin);
    expect(scene.host.lastModel?.interaction.giantPick).toEqual({
      kind: "TOSS",
      unitId: troll,
      passengerUnitId: goblin,
    });
    expect(scene.controller.accepted).toEqual([]);
    expect(panelButtons()).toEqual(["?", "Back", "Cancel"]);
    expect(
      boardPlan(scene.host).targets.every((target) => target.family === "TOSS"),
    ).toBe(true);
    // Escape steps back to the Goblin, a second Escape disarms.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(scene.host.lastModel?.interaction.giantPick).toMatchObject({
      passengerUnitId: null,
    });
    pickOnBoard(scene, at.goblin);
    pickOnBoard(scene, at.landing);
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]).toEqual({
      kind: "TOSS",
      unitId: troll,
      passengerUnitId: goblin,
      at: at.landing,
    });
    scene.app.destroy();
  });
});

describe("Thunder Stomp: one button, its confirmation in the panel", () => {
  it("marks the 3 x 3 and stomps from the panel or a marked enemy", async () => {
    const scene = rig(giantsStompFixtureV7());
    const at = GIANTS_UI_V7.stomp;
    const bronto = select(scene, at.brontosaurus);
    requiredButton("giant-stomp").click();
    const panel = requiredElement<HTMLElement>("[data-v7-giant-pick]");
    expect(panel.dataset.boardTargets).toBe("3");
    expect(panel.getAttribute("aria-label")).toBe(
      "Hits 3 enemies, smashes 1 Field Defense",
    );
    expect(panelButtons()).toEqual(["?", "Stomp", "Cancel"]);
    expect(panelButtons().length).toBeLessThanOrEqual(
      BOARD_PICK_PANEL_MAX_BUTTONS_V7,
    );
    requiredButton("giant-stomp-cast").click();
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]).toEqual({
      kind: "STOMP",
      unitId: bronto,
    });
    scene.app.destroy();
  });

  it("names why it cannot stomp after a Move", () => {
    const at = GIANTS_UI_V7.stomp;
    const fixture = giantsStompFixtureV7();
    // It moved this turn and may still attack.
    const scene = rig({
      ...fixture,
      units: fixture.units.map((unit) =>
        key(unit.at) === key(at.brontosaurus)
          ? { ...unit, activation: { ...unit.activation, moved: true } }
          : unit,
      ),
    });
    select(scene, at.brontosaurus);
    const button = requiredButton("giant-stomp");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.dataset.disabledReason).toBe("It moved this turn");
    expect(button.getAttribute("aria-label")).toBe(
      "Thunder Stomp unavailable. It moved this turn",
    );
    scene.app.destroy();
  });
});

describe("Break Off: two tiles picked on the board, never 28 buttons", () => {
  it("picks the first tile, then the second, and breaks off", async () => {
    const scene = rig(giantsBreakOffFixtureV7());
    const at = GIANTS_UI_V7.breakOff;
    const giant = select(scene, at.giant);
    expect(
      document.querySelectorAll('[data-action^="command-break"]'),
    ).toHaveLength(0);
    requiredButton("giant-break-off").click();
    let panel = requiredElement<HTMLElement>("[data-v7-giant-pick]");
    expect(panel.dataset.boardTargets).toBe("8");
    expect(panel.getAttribute("aria-label")).toBe(
      "Choose a tile for the first Gingerbread Man. The Giant goes to 30 HP; two Gingerbread Men with 10 HP each",
    );
    pickOnBoard(scene, at.first);
    expect(scene.controller.accepted).toEqual([]);
    panel = requiredElement<HTMLElement>("[data-v7-giant-pick]");
    expect(panel.dataset.boardTargets).toBe("7");
    expect(panelButtons()).toEqual(["?", "Back", "Cancel"]);
    requiredButton("giant-pick-back").click();
    expect(scene.host.lastModel?.interaction.giantPick).toEqual({
      kind: "BREAK_OFF",
      unitId: giant,
      first: null,
    });
    pickOnBoard(scene, at.first);
    pickOnBoard(scene, at.second);
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]).toEqual({
      kind: "BREAK_OFF",
      unitId: giant,
      tiles: [at.first, at.second],
    });
    scene.app.destroy();
  });

  it("names a Gingerbread Man and says it is a Toffee Trooper", () => {
    const scene = rig(giantsGingerbreadFixtureV7());
    select(scene, GIANTS_UI_V7.breakOff.first);
    const dock = requiredElement<HTMLElement>(".v7-selection-dock");
    expect(dock.querySelector("h2")?.textContent).toBe(
      GINGERBREAD_MAN_LABEL_V7,
    );
    expect(
      requiredElement<HTMLElement>('[data-unit-status="gingerbread-man"]')
        .title,
    ).toBe(GINGERBREAD_MAN_INFO_V7);
    scene.app.destroy();
  });
});

describe("Crushing Shove: the attack preview and no new button", () => {
  it("keeps the Juggernaut's attack a plain board pick", () => {
    const scene = rig(giantsCrushFixtureV7());
    select(scene, GIANTS_UI_V7.crush.juggernaut);
    expect(document.querySelector('[data-action^="giant-"]')).toBeNull();
    expect(
      requiredElement<HTMLElement>(".v7-giant-signature").dataset
        .giantSignature,
    ).toBe("Crushing Shove");
    scene.app.destroy();
  });
});

describe("the city panel's Walls and the reward dialog's giant", () => {
  it("shows a hostile city's Walls standing, then razed by the Siege Hammer", () => {
    for (const [fixture, value] of [
      [giantsSiegeFixtureV7, "standing"],
      [giantsSiegeRazedFixtureV7, "razed"],
    ] as const) {
      document.body.innerHTML = '<div id="app"></div>';
      const scene = rig(fixture());
      const city = required(
        scene.view.cities.find(
          (candidate) => key(candidate.at) === key(GIANTS_UI_V7.siege.centre),
        ),
      );
      scene.host.callbacks?.onSelection({ kind: "CITY", cityId: city.id });
      const stat = requiredElement<HTMLElement>('[data-stat="walls"]');
      expect(stat.dataset.walls).toBe(value);
      expect(stat.textContent).toBe(
        `Walls${value === "razed" ? "Razed" : "Standing"}`,
      );
      scene.app.destroy();
    }
  });

  it("names the giant's signature on the reward card", () => {
    const scene = rig(giantsRewardFixtureV7());
    expect(document.body.textContent ?? "").toContain(
      "A free Troll, once: throws Goblins",
    );
    scene.app.destroy();
  });
});
