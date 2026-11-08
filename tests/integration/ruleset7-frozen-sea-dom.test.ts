// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  queryPlayerCommandsV7,
  type CoordV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import {
  FREEZE_DEEP_UNLOCK_V7,
  FREEZE_SHALLOW_UNLOCK_V7,
  glacierUnlockTextV7,
  ICE_COVER_TOOLTIP_V7,
  ICE_FOR_SHIPS_HELP_V7,
  ICE_MOVE_TEXT_V7,
  ICE_HELP_RULES_V7,
  ICE_SEA_DOG_GOAL_V7,
  SKATE_TRAIL_LABEL_V7,
} from "../../src/render/frozen-sea-presentation-v7";
import {
  boardPlan,
  required,
  requiredButton,
  requiredElement,
  rig,
  waitUntil,
} from "../fixtures/v7-dom-rig";
import { frozenArenaV7 } from "../fixtures/v7-frozen-sea";
import {
  FROZEN_UI_V7,
  frozenFreezeUiFixtureV7,
  frozenShipUiFixtureV7,
  frozenSlideUiFixtureV7,
} from "../fixtures/v7-frozen-sea-ui";

// The frozen sea interface (bead pulp_wars-5ti.7, second part;
// docs/ui/BOARD_TARGETING.md section 3.5): no Freeze for a line role since
// the one Freeze effect (`pulp_wars-xv0t`), the Ice Witch's one-tap Cold
// Snap and its ring (`pulp_wars-s55m.1`),
// the slide and the slip, a Frozen ship, the ice chip, and the Ice Folk
// technology cards, Help and Gallery.

const COORDINATE = /\b\d{1,2}, ?\d{1,2}\b/;
const at = (coord: CoordV7): string => `${coord.x},${coord.y}`;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Freeze is no action of its own (the one Freeze effect, `pulp_wars-xv0t`)", () => {
  it("offers a unit beside the water no Freeze button and no freeze pick", () => {
    const { host, app, unitAt } = rig(frozenFreezeUiFixtureV7());
    const yeti = unitAt(FROZEN_UI_V7.yeti);
    host.callbacks?.onSelection({ kind: "UNIT", unitId: yeti.id });
    expect(document.querySelector('[data-action="freeze"]')).toBeNull();
    expect(host.lastModel?.interaction.freezePick ?? null).toBeNull();
    expect(
      boardPlan(host).targets.some(
        (target) => (target.family as string) === "FREEZE",
      ),
    ).toBe(false);
    app.destroy();
  });
});

describe("the Ice Witch's Cold Snap: one tap, units and water", () => {
  // The Ice Folk freeze rework (`pulp_wars-s55m.1`; the user: "ice witch
  // cold snap should not require confirmation. just snap. furthermore the
  // coldsnap should freeze water around her"): she has no Freeze button;
  // her Cold Snap button casts at once and freezes her ring of water.
  it("marks the ring while she is selected, lifts it on focus, and casts on one press", async () => {
    const { controller, host, app, unitAt } = rig(frozenFreezeUiFixtureV7());
    const witch = unitAt(FROZEN_UI_V7.witch);
    host.callbacks?.onSelection({ kind: "UNIT", unitId: witch.id });
    expect(document.querySelector('[data-action="freeze"]')).toBeNull();
    const snap = requiredButton("ice-folk-cold-snap");
    expect(snap.dataset.boardTiles).toBe("3");
    expect(snap.hasAttribute("aria-pressed")).toBe(false);
    expect(snap.getAttribute("aria-label")).toContain("3 water tiles");
    expect(snap.getAttribute("aria-label")).not.toMatch(COORDINATE);
    const ring = () =>
      boardPlan(host).entries.filter((entry) =>
        entry.key.startsWith("ability-area:FREEZE:"),
      );
    // The one Freeze effect (`pulp_wars-xv0t`): her ring is every tile
    // around her, the three of water to ice and the five of open land
    // (outside every border) to Snow.
    expect(snap.getAttribute("aria-label")).toContain("5 land tiles");
    expect(ring()).toHaveLength(8);
    expect(new Set(ring().map((entry) => entry.abilityStyle))).toEqual(
      new Set(["FREEZE"]),
    );
    // Focus (and hover) lift the ring and label it; blur returns it.
    snap.dispatchEvent(new FocusEvent("focus"));
    expect(host.lastModel?.interaction.freezeRingFocusUnitId).toBe(witch.id);
    expect(new Set(ring().map((entry) => entry.abilityStyle))).toEqual(
      new Set(["FREEZE_FOCUS"]),
    );
    expect(
      boardPlan(host).entries.find((entry) =>
        entry.key.startsWith("ability-target:FREEZE_RING:"),
      )?.label,
    ).toBe("Ice 3 · Snow 5");
    snap.dispatchEvent(new FocusEvent("blur"));
    expect(
      host.lastModel?.interaction.freezeRingFocusUnitId ?? null,
    ).toBeNull();
    // One press casts: nothing is armed first.
    snap.click();
    expect(document.querySelector("[data-v7-ice-folk-pick]")).toBeNull();
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "COLD_SNAP",
      unitId: witch.id,
    });
    expect(required(controller.snapshot().view).ice).toHaveLength(3);
    app.destroy();
  });

  it("casts on one tap of a finger too: no confirmation", async () => {
    const { controller, host, app, unitAt } = rig(frozenFreezeUiFixtureV7());
    const witch = unitAt(FROZEN_UI_V7.witch);
    host.callbacks?.onSelection({ kind: "UNIT", unitId: witch.id });
    const snap = requiredButton("ice-folk-cold-snap");
    const down = new MouseEvent("pointerdown", { bubbles: true });
    Object.defineProperty(down, "pointerType", { value: "touch" });
    snap.dispatchEvent(down);
    snap.click();
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "COLD_SNAP",
      unitId: witch.id,
    });
    expect(document.querySelector("[data-v7-ice-folk-pick]")).toBeNull();
    expect(document.querySelector("[data-v7-freeze-pick]")).toBeNull();
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
    // Rime: the two Shallow tiles beside her (the frozen sea redesign: her
    // own tile is her sound ice, which the ring passes over).
    expect(requiredButton("ice-folk-cold-snap").dataset.boardTiles).toBe("2");
    rime.app.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    const packIce = scene(["SHORECRAFT", "NAVIGATION"]);
    packIce.host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: packIce.unitAt({ x: 2, y: 3 }).id,
    });
    // Pack Ice: the three Deep Water tiles south of her too (and, since the
    // one Freeze effect, `pulp_wars-xv0t`, the open shore north of her goes
    // to Snow either way).
    expect(requiredButton("ice-folk-cold-snap").dataset.boardTiles).toBe("5");
    expect(
      boardPlan(packIce.host)
        .entries.filter((entry) => entry.key.startsWith("ability-area:FREEZE:"))
        .map((entry) => at(entry.at))
        .sort(),
    ).toEqual(["1,2", "1,3", "1,4", "2,2", "2,4", "3,2", "3,3", "3,4"]);
    packIce.app.destroy();
  });
});

describe("moving on ice", () => {
  it("a skater sees the ice tiles it reaches, with its trail and the legend (Ice Folk movement, `pulp_wars-s55m.2`)", async () => {
    const { controller, host, app, unitAt } = rig(frozenSlideUiFixtureV7());
    const yeti = unitAt(FROZEN_UI_V7.bridgeHead);
    host.callbacks?.onSelection({ kind: "UNIT", unitId: yeti.id });
    // A Yeti (Move 1) skates two bridge tiles, half a Move each.
    const first = required(FROZEN_UI_V7.bridge[0]);
    const last = required(FROZEN_UI_V7.bridge[1]);
    const destination = required(
      boardPlan(host).targets.find(
        (target) => target.family === "MOVE" && at(target.at) === at(last),
      ),
    );
    expect(destination.slide).toEqual([
      { from: FROZEN_UI_V7.bridgeHead, tiles: [first, last] },
    ]);
    // It may stop on the first; the third is out of its reach.
    expect(
      boardPlan(host).targets.some((target) => at(target.at) === at(first)),
    ).toBe(true);
    for (const tile of FROZEN_UI_V7.bridge.slice(2))
      expect(
        boardPlan(host).targets.some((target) => at(target.at) === at(tile)),
      ).toBe(false);
    const legend = requiredElement<HTMLElement>(
      '.v7-selection-dock [data-landing-marker="slide"]',
    );
    expect(legend.textContent).toBe(SKATE_TRAIL_LABEL_V7);
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
    // On the ice its tile's dock says so (bead pulp_wars-2yc.63: the unit
    // card shows the unit only, so no "Ice cover" chip and no Snow term).
    host.callbacks?.onSelection({ kind: "UNIT", unitId: yeti.id });
    expect(
      document.querySelector(
        '.v7-selection-dock [data-unit-status="ice-cover"]',
      ),
    ).toBeNull();
    expect(
      document.querySelector(
        '.v7-selection-dock [data-modifier-source="snow"]',
      ),
    ).toBeNull();
    host.callbacks?.onSelection({ kind: "TILE", at: moved.at });
    const cover = requiredElement<HTMLElement>(
      '.v7-selection-dock [data-ground-bonus="snow"]',
    );
    expect(cover.textContent).toBe("Ice cover +25% Defense");
    expect(cover.title).toBe(`${ICE_COVER_TOOLTIP_V7}.`);
    expect(
      requiredElement<HTMLElement>('.v7-selection-dock [data-winter="ice"]')
        .title,
    ).toContain(ICE_MOVE_TEXT_V7);
    app.destroy();
  });

  it("the Snow Golem skates too: trails on the ice", () => {
    const { host, app, unitAt } = rig(frozenSlideUiFixtureV7());
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAt({ x: 0, y: 2 }).id,
    });
    const onIce = boardPlan(host).targets.filter((target) =>
      FROZEN_UI_V7.bridge.some((tile) => at(tile) === at(target.at)),
    );
    expect(onIce.length).toBeGreaterThan(1);
    expect(onIce.some((target) => target.slide !== undefined)).toBe(true);
    app.destroy();
  });

  it("another faction's ground unit is offered no Move onto the ice (pulp_wars-y242; it slipped onto it before)", () => {
    const { host, app, unitAt } = rig(
      frozenSlideUiFixtureV7({ slipper: true }),
    );
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAt(FROZEN_UI_V7.bridgeHead).id,
    });
    const first = required(FROZEN_UI_V7.bridge[0]);
    expect(
      boardPlan(host).targets.some(
        (target) => target.family === "MOVE" && at(target.at) === at(first),
      ),
    ).toBe(false);
    expect(
      document.querySelector(".v7-selection-dock [data-landing-marker]"),
    ).toBeNull();
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

describe("a Frozen ship", () => {
  // The Ice Folk freeze rework (`pulp_wars-s55m.1`): no ship is locked in
  // the ice; a Frozen ship wears the Frozen chip like any unit.
  it("tells its owner it is Frozen, and offers it no Move or Attack", () => {
    const { host, app, view, unitAt } = rig(
      frozenShipUiFixtureV7({ victim: true }),
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
      '.v7-selection-dock [data-unit-status="frozen"]',
    );
    expect(chip.title).not.toMatch(COORDINATE);
    expect(
      document.querySelector(
        '.v7-selection-dock [data-unit-status="icebound"]',
      ),
    ).toBeNull();
    expect(boardPlan(host).targets).toEqual([]);
    expect(
      boardPlan(host).entries.find((entry) => entry.key === `unit:${ship.id}`)
        ?.iceFolk?.frozen,
    ).toEqual({ turnsLeft: 1 });
    app.destroy();
  });
});

describe("the ice chip of a tile", () => {
  it("shows whether the ice is thick or cracked, never a countdown", () => {
    // The frozen sea redesign (`pulp_wars-5ti.25`): ice is permanent; with
    // Glacier it is thick, and the last tile of the row is cracked.
    const { host, app } = rig(frozenShipUiFixtureV7());
    const chip = (): HTMLElement =>
      requiredElement<HTMLElement>('.v7-selection-dock [data-winter="ice"]');
    for (const [index, kind] of ["thick", "thick", "cracked"].entries()) {
      host.callbacks?.onSelection({
        kind: "TILE",
        at: required(FROZEN_UI_V7.melting[index]),
      });
      expect(chip().dataset.ice).toBe(kind);
      expect(chip().textContent).toBe(`Ice · ${kind}`);
      expect(chip().querySelector('[data-icon="snowflake"]')).not.toBeNull();
      expect(chip().title).not.toMatch(COORDINATE);
      expect(chip().title).not.toMatch(/melt|turns/i);
    }
    host.callbacks?.onSelection({ kind: "TILE", at: FROZEN_UI_V7.permanent });
    expect(chip().dataset.ice).toBe("thick");
    expect(chip().title).toContain("Thick: two Cracks break it.");
    // The plan draws snow on thick ice and cracks on the cracked tile.
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
    ).toEqual([0, 0, 2]);
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
    ).toEqual(["Rime", "Pack Ice", "Hoarfrost", "Black Ice", "Glacier"]);
    const rime = lines("shorecraft");
    // The one Freeze effect (`pulp_wars-xv0t`): the freezes are the Cold
    // Snap and the Cold Wake; the technologies say what water they reach.
    expect(rime).toContain(FREEZE_SHALLOW_UNLOCK_V7);
    expect(FREEZE_SHALLOW_UNLOCK_V7).toBe(
      "Ice: your freezes make ice on shallow water, and the water inside your borders freezes now and whenever they grow",
    );
    expect(rime).toContain("The Ice Folk build no ships");
    expect(rime.join(" ")).not.toMatch(/embark|Patrol Boat/i);
    expect(lines("navigation")).toContain(FREEZE_DEEP_UNLOCK_V7);
    expect(lines("navigation").join(" ")).not.toContain("Ships can sail");
    // Hoarfrost's longer Freeze line went with the line Freeze; the node
    // has nothing until the Ice Folk redesign's later beads.
    const hoarfrost = lines("naval_engineering");
    expect(hoarfrost.join(" ")).not.toMatch(/three tiles|Battleship/);
    expect(lines("seamanship")).toEqual([
      "Black Ice: an enemy that steps onto your ice is Frozen",
    ]);
    // The border freeze (`pulp_wars-5ti.31`): the Ice Folk Land Grant.
    expect(lines("planning")).toContain(
      "Land Grant: with Rime, the water inside the city's borders, old and new, freezes",
    );
    const glacier = lines("submersibles");
    expect(glacier).toContain(glacierUnlockTextV7());
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
