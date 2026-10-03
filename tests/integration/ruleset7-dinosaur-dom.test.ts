// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  EGG_HP_V7,
  GROWTH_KILLS_V7,
  UNIT_ROLE_IDS_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  previewHatchV7,
  previewAttackExplosionsV7,
  previewLayEggV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  roleMechanicsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerViewV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import {
  bootstrapRuleset7App,
  type Ruleset7AcceptedBoundary,
  type Ruleset7BrowserSnapshot,
  type Ruleset7DispatchResult,
} from "../../src/app/index";
import type {
  BoardHostCallbacksV7,
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  Ruleset7DomAppView,
  recruitmentRolePresentationV7,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import {
  DINOSAUR_HELP_RULES_V7,
  PROMOTION_HELP_TIP_V7,
  WALLBREAKER_UNLOCK_TEXT_V7,
  dinosaurAbilityDescriptionV7,
  dinosaurRecruitNotesV7,
  dinosaurRewardLabelV7,
  eggCountdownTextV7,
  eggInfoTextV7,
  eggLaidRolesV7,
  eggRefundV7,
  growthChipTextV7,
  growthInfoTextV7,
  layEggRowTextV7,
  layEggUnavailableTextV7,
  nestingEggHpBonusV7,
  nestingUnlockTextV7,
  slotCapacityTooltipV7,
  slotsTextV7,
  turnsTextV7,
} from "../../src/render/dinosaur-presentation-v7";
import { goblinAttackPreviewTextV7 } from "../../src/render/goblin-presentation-v7";
import { rewardStateV7 } from "../fixtures/v7-dinosaur-arena";
import {
  DINOSAUR_BLAST_V7,
  DINOSAUR_CITY_V7,
  DINOSAUR_ENEMY_V7,
  DINOSAUR_SHOWCASE_V7,
  dinosaurBlastFixtureV7,
  dinosaurCityFixtureV7,
  dinosaurCityFullFixtureV7,
  dinosaurCityPoorFixtureV7,
  dinosaurEnemyFixtureV7,
  dinosaurShowcaseFixtureV7,
  dinosaurUiFieldV7,
} from "../fixtures/v7-dinosaur-ui";
import { goblinShowcaseFixtureV7 } from "../fixtures/v7-goblin-ui";

// Every Dinosaur number expected below is read from the registry or from a
// public preview of the same view: the balance bead (`pulp_wars-c87.8`) may
// retune hatch times, slots, costs, HP, Attack and the Charge! bonus.
const AT = DINOSAUR_SHOWCASE_V7;
const EGG_ROLES = eggLaidRolesV7(UNIT_ROLE_IDS_V7, "DINOSAUR");
const roleLabel = (role: UnitRoleIdV7): string =>
  effectiveRoleRuleV7(role, "DINOSAUR").label;
const roleSlots = (role: UnitRoleIdV7): number =>
  roleMechanicsV7(role, "DINOSAUR").capacitySlots;

function layEgg(view: PlayerViewV7, cityId: number, role: UnitRoleIdV7) {
  const city = required(view.cities.find((entry) => entry.id === cityId));
  return required(previewLayEggV7(view, city.id, role));
}

/** The reason text of every card that cannot be used, in card order. */
function expectedEggReasons(view: PlayerViewV7, cityId: number): string[] {
  return EGG_ROLES.map((role) =>
    layEggUnavailableTextV7(layEgg(view, cityId, role), "DINOSAUR"),
  ).filter((reason): reason is string => reason !== null);
}

function slotsText(view: PlayerViewV7, cityId: number): string {
  const preview = layEgg(view, cityId, "RAIDER");
  return `${preview.usedSlots}/${preview.capacity} slots`;
}

const STAMPEDE_CONTROLS =
  '[data-action*="stampede"], .v7-stampede-legend, .v7-stampede-chip, [data-v7-stampede]';

/** The board target of `family` on `at`, or undefined. */
function boardTarget(host: RecordingBoardHost, family: string, at: CoordV7) {
  return boardPlan(host).targets.find(
    (candidate) =>
      candidate.family === family &&
      candidate.at.x === at.x &&
      candidate.at.y === at.y,
  );
}

/** The dock's status chips (the full status texts). */
function statusChips(): (string | null)[] {
  return [
    ...document.querySelectorAll(
      ".v7-selection-dock .v7-unit-status-cues .v7-chip",
    ),
  ].map((chip) => chip.textContent);
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Revision 19 Dinosaur setup", () => {
  it("offers Dinosaur for every seat and launches the chosen factions", async () => {
    const chosen = new SetupController();
    const app = mount(chosen, new RecordingBoardHost());
    const count = requiredElement<HTMLSelectElement>("#v7-ai-count");
    count.value = "3";
    count.dispatchEvent(new Event("change", { bubbles: true }));
    for (const seat of [0, 1, 2, 3]) {
      const field = requiredElement<HTMLSelectElement>(`#v7-faction-${seat}`);
      // The Martian UI (pulp_wars-t6s.4) adds the fifth faction.
      expect([...field.options].map((option) => option.textContent)).toEqual([
        "Human",
        "Undead",
        "Goblin",
        "Dinosaur",
        "Martian",
      ]);
      expect(field.value).toBe("ORIGINAL");
    }
    for (const seat of [0, 3]) {
      const field = requiredElement<HTMLSelectElement>(`#v7-faction-${seat}`);
      field.value = "DINOSAUR";
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
    requiredButton("launch").click();
    await waitUntil(() => chosen.launched.length === 1);
    expect(chosen.launched[0]?.factions).toEqual([
      "DINOSAUR",
      "ORIGINAL",
      "ORIGINAL",
      "DINOSAUR",
    ]);
    app.destroy();
  });

  it("plays, saves and resumes a Showcase with a Dinosaur seat", async () => {
    const host = new RecordingBoardHost();
    const app = bootstrapRuleset7App(document, { boardHost: host });
    for (const [id, value] of [
      ["v7-ai-count", "3"],
      ["v7-map-type", "SHOWCASE"],
      ["v7-faction-0", "DINOSAUR"],
    ] as const) {
      const field = requiredElement<HTMLSelectElement>(`#${id}`);
      field.value = value;
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
    requiredButton("launch").click();
    await waitUntil(
      () =>
        app.controller.snapshot().phase === "ACTIVE" &&
        !app.controller.snapshot().transitioning,
    );
    const view = required(app.controller.snapshot().view);
    expect(view.setup.factions).toEqual([
      "DINOSAUR",
      "ORIGINAL",
      "ORIGINAL",
      "ORIGINAL",
    ]);
    const own = view.units.filter((unit) => unit.ownerId === view.viewer.id);
    expect(own).toHaveLength(10);
    expect(own.every((unit) => unit.form !== "EGG")).toBe(true);
    // The capital's cards say why they cannot be used, if they cannot.
    const cities = view.cities.filter(
      (city) => city.ownerId === view.viewer.id,
    );
    const capital = required(cities.find((city) => city.isCapital));
    host.callbacks?.onSelection({ kind: "CITY", cityId: capital.id });
    const capitalSlots = layEgg(view, capital.id, "RAIDER");
    expect(requiredElement('[data-stat="units"]').textContent).toBe(
      `Slots${slotsText(view, capital.id)}`,
    );
    expect(
      requiredElement(".v7-city-units").classList.contains("is-over-capacity"),
    ).toBe(capitalSlots.usedSlots > capitalSlots.capacity);
    expect(eggReasons()).toEqual(expectedEggReasons(view, capital.id));
    // North lays the first Egg it can on the tile north of it.
    const north = required(cities.find((city) => city.at.y === 3));
    host.callbacks?.onSelection({ kind: "CITY", cityId: north.id });
    expect(requiredElement(".v7-city-units").textContent).toBe(
      slotsText(view, north.id),
    );
    expect(eggReasons()).toEqual(expectedEggReasons(view, north.id));
    const laidRole = required(
      EGG_ROLES.find(
        (role) => layEgg(view, north.id, role).unavailableReason === null,
      ),
    );
    const laid = layEgg(view, north.id, laidRole);
    requiredButton(`lay-egg-${laidRole.toLowerCase()}`).click();
    host.callbacks?.onCommand(
      nestTarget(host, { x: north.at.x, y: north.at.y - 1 }),
    );
    await waitUntil(() => app.controller.snapshot().view?.eggs.length === 1);
    await waitUntil(
      () =>
        document.querySelector("#v7-live")?.textContent ===
        `You laid a ${roleLabel(laidRole)} Egg`,
    );
    expect(requiredElement(".v7-city-units").textContent).toBe(
      `${laid.usedSlots + laid.slots}/${laid.capacity} slots`,
    );
    // The city action is spent: the cards explain it.
    expect(new Set(eggReasons())).toEqual(new Set(["City action spent"]));
    // Revision 20: the Triceratops moves two tiles next to the neighbour's
    // Captain and attacks it with Charge! (no Stampede control exists).
    const triceratops = required(own.find((unit) => unit.role === "CATAPULT"));
    host.callbacks?.onSelection({ kind: "UNIT", unitId: triceratops.id });
    expect(document.querySelector(STAMPEDE_CONTROLS)).toBe(null);
    const current = () => required(app.controller.snapshot().view);
    const captain = required(
      current().units.find(
        (unit) =>
          unit.ownerId !== view.viewer.id &&
          unit.role === "CAPTAIN" &&
          Math.max(
            Math.abs(unit.at.x - triceratops.at.x),
            Math.abs(unit.at.y - triceratops.at.y),
          ) <= 3,
      ),
    );
    const step = required(
      boardPlan(host).targets.find(
        (candidate) =>
          candidate.family === "MOVE" &&
          candidate.command.kind === "MOVE" &&
          candidate.command.path.length === 2 &&
          Math.max(
            Math.abs(candidate.at.x - captain.at.x),
            Math.abs(candidate.at.y - captain.at.y),
          ) === 1,
      ),
    );
    host.callbacks?.onCommand(step);
    await waitUntil(
      () => boardTarget(host, "ATTACK", captain.at) !== undefined,
    );
    const charge = required(
      queryCombatPreviewV7(current(), triceratops.id, captain.id),
    );
    expect(charge.runUp).toBe(2);
    await waitUntil(() => statusChips().length > 0);
    expect(statusChips()).toContain("Charge! +2 Attack");
    const attack = required(boardTarget(host, "ATTACK", captain.at));
    expect(attack.previewNote).toContain("Charge +2");
    host.callbacks?.onCommand(attack);
    await waitUntil(() => {
      const target = app.controller
        .snapshot()
        .view?.units.find((unit) => unit.id === captain.id);
      return target === undefined || target.hp < captain.hp;
    });
    await waitUntil(() => !app.controller.snapshot().transitioning);
    const played = required(app.controller.snapshot().view);
    expect(played.eggs).toHaveLength(1);
    expect(
      (played.units.find((unit) => unit.id === captain.id)?.hp ?? 0) <=
        captain.hp - charge.damageToDefender,
    ).toBe(true);
    // Save and quit, then a fresh page load resumes the same Dinosaur match.
    requiredButton("compact-menu").click();
    requiredButton("main-menu").click();
    await waitUntil(() => app.controller.snapshot().phase === "RESUMABLE");
    app.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    const next = bootstrapRuleset7App(document, {
      boardHost: new RecordingBoardHost(),
    });
    await waitUntil(() => next.controller.snapshot().phase === "RESUMABLE");
    requiredButton("resume").click();
    await waitUntil(
      () =>
        next.controller.snapshot().phase === "ACTIVE" &&
        !next.controller.snapshot().transitioning,
    );
    const resumed = required(next.controller.snapshot().view);
    expect(resumed.setup).toEqual(view.setup);
    expect(resumed.eggs).toEqual(played.eggs);
    expect(resumed.units).toEqual(played.units);
    next.destroy();
  });
});

describe("Revision 19 Dinosaur city panel", () => {
  it("shows slots, trains Cavemen and Shamans, and lists Lay Egg cards", () => {
    const controller = new FixtureController(dinosaurCityFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const city = selectCity(controller, host);
    const view = required(controller.snapshot().view);
    const previews = EGG_ROLES.map((role) => layEgg(view, city.id, role));
    const used = required(previews[0]);
    const units = requiredElement<HTMLElement>('[data-stat="units"]');
    expect(units.dataset.capacity).toBe("slots");
    expect(units.textContent).toBe(
      `Slots${used.usedSlots}/${used.capacity} slots`,
    );
    expect(requiredElement(".v7-city-units").getAttribute("aria-label")).toBe(
      `${used.usedSlots} of ${used.capacity} slots`,
    );
    expect(units.title).toBe(slotCapacityTooltipV7());
    // Caveman and Shaman are trained as usual; the Eggs follow them.
    expect(
      [
        ...document.querySelectorAll(
          ".v7-selection-dock .v7-context-actions > *",
        ),
      ].map(
        (node) =>
          node.querySelector(".v7-action-label")?.textContent ??
          node.textContent,
      ),
    ).toEqual([
      "Caveman",
      "Shaman",
      "Raptor Egg",
      "Spitter Egg",
      "Ankylosaurus Egg",
      "Triceratops Egg",
      "T-Rex Egg",
    ]);
    expect(requiredButton("command-train").getAttribute("aria-label")).toBe(
      `Train Caveman for ${effectiveRoleRuleV7("FIGHTER", "DINOSAUR").cost} Coins`,
    );
    // Every production row names its slots; a trained unit uses one.
    expect(
      requiredButton("command-train").querySelector('[data-egg-fact="slots"]')
        ?.textContent,
    ).toBe("1 slot");
    // Each card: the row text, hatch time and slots; two-slot roles marked.
    expect(
      [...document.querySelectorAll(".v7-lay-egg-action")].map((node) =>
        node.getAttribute("aria-label"),
      ),
    ).toEqual(
      previews.map(
        (preview) => `Lay ${layEggRowTextV7(roleLabel(preview.role), preview)}`,
      ),
    );
    const tRex = requiredButton("lay-egg-knight");
    const tRexPreview = layEgg(view, city.id, "KNIGHT");
    expect(
      [...tRex.querySelectorAll<HTMLElement>(".v7-egg-fact")].map((fact) => [
        fact.dataset.eggFact,
        fact.textContent,
        fact.dataset.slots ?? null,
      ]),
    ).toEqual([
      ["hatch", turnsTextV7(tRexPreview.turnsToHatch), null],
      ["slots", slotsTextV7(tRexPreview.slots), String(tRexPreview.slots)],
    ]);
    // Every card carries its slots, so the two-slot roles can be marked.
    for (const preview of previews)
      expect(
        requiredButton(
          `lay-egg-${preview.role.toLowerCase()}`,
        ).querySelector<HTMLElement>('[data-egg-fact="slots"]')?.dataset.slots,
      ).toBe(String(preview.slots));
    // LEGACY art: the role's Human portrait with the Dinosaur badge and an
    // egg cue, never the Lay Egg icon.
    expect(tRex.querySelector(".v7-egg-art .v7-dinosaur-badge")).not.toBe(null);
    expect(tRex.querySelector('.v7-egg-art svg[data-icon="egg"]')).not.toBe(
      null,
    );
    expect(tRex.hasAttribute("aria-disabled")).toBe(false);
    // A LAY_EGG command per role and nest tile is offered; none is a button.
    expect(
      controller
        .snapshot()
        .offeredCommands.filter((command) => command.kind === "LAY_EGG"),
    ).toHaveLength(EGG_ROLES.length * 8);
    expect(document.querySelector('[data-action="command-lay_egg"]')).toBe(
      null,
    );
    host.callbacks?.onSelection({ kind: "TILE", at: { x: 7, y: 7 } });
    expect(document.querySelector('[data-action="command-lay_egg"]')).toBe(
      null,
    );
    app.destroy();
  });

  it("explains a card that cannot be used: slots, Coins, no tile, no technology", () => {
    const cards = () =>
      [...document.querySelectorAll<HTMLElement>(".v7-lay-egg-action")].map(
        (node) => [
          node.dataset.action,
          node.getAttribute("aria-disabled"),
          node.dataset.disabledReason ?? null,
          node.querySelector(".v7-egg-reason")?.textContent ?? null,
        ],
      );
    // No Coins: every card needs its cost. A full city: its slots.
    for (const [fixture, reasonId] of [
      [dinosaurCityPoorFixtureV7, "insufficient_coins"],
      [dinosaurCityFullFixtureV7, "city_capacity_full"],
    ] as const) {
      document.body.innerHTML = '<div id="app"></div>';
      const controller = new FixtureController(fixture());
      const host = new RecordingBoardHost();
      const app = mount(controller, host);
      const city = selectCity(controller, host);
      const view = required(controller.snapshot().view);
      const reason = (role: UnitRoleIdV7): string =>
        reasonId === "insufficient_coins"
          ? `Needs ${layEgg(view, city.id, role).cost} Coins`
          : `Needs ${roleSlots(role)} free ${roleSlots(role) === 1 ? "slot" : "slots"}`;
      expect(requiredElement(".v7-city-units").textContent).toBe(
        slotsText(view, city.id),
      );
      expect(cards()).toEqual(
        EGG_ROLES.map((role) => [
          `lay-egg-${role.toLowerCase()}`,
          "true",
          reasonId,
          reason(role),
        ]),
      );
      expect(requiredButton("lay-egg-guard").getAttribute("aria-label")).toBe(
        `Lay ${layEggRowTextV7("Ankylosaurus", layEgg(view, city.id, "GUARD"))}. Unavailable: ${reason("GUARD")}`,
      );
      // A disabled card never starts the picking.
      requiredButton("lay-egg-knight").click();
      expect(document.querySelector('[data-v7-lay-egg="picking"]')).toBe(null);
      expect(host.lastModel?.interaction.layEgg).toBeUndefined();
      app.destroy();
    }

    // Every nest tile occupied: "No free tile next to the city".
    document.body.innerHTML = '<div id="app"></div>';
    const ring = [
      [7, 7],
      [8, 7],
      [9, 7],
      [7, 8],
      [9, 8],
      [7, 9],
      [8, 9],
      [9, 9],
    ] as const;
    const full = new FixtureController(
      dinosaurUiFieldV7([
        ...ring.map(([x, y]) => ({
          seat: 0,
          role: "FIGHTER" as const,
          at: { x, y },
        })),
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 6 } },
      ]),
    );
    const fullHost = new RecordingBoardHost();
    const fullApp = mount(full, fullHost);
    selectCity(full, fullHost);
    expect(new Set(eggReasons())).toEqual(
      new Set(["No free tile next to the city"]),
    );
    fullApp.destroy();

    // No egg technology yet: one hint instead of five locked cards.
    document.body.innerHTML = '<div id="app"></div>';
    const fresh = new FixtureController(
      dinosaurCityFixtureV7({ techs: { 0: [] } }),
    );
    const freshHost = new RecordingBoardHost();
    const freshApp = mount(fresh, freshHost);
    selectCity(fresh, freshHost);
    expect(document.querySelectorAll(".v7-lay-egg-card")).toHaveLength(0);
    expect(requiredElement('[data-v7-lay-egg="locked"]').textContent).toBe(
      "Research Scouting to lay Raptor Eggs here.",
    );
    freshApp.destroy();
  });

  it("picks a nest tile on the board, cancels with Escape or Cancel, and lays the Egg", async () => {
    const controller = new FixtureController(dinosaurCityFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const city = selectCity(controller, host);
    const tRex = layEgg(
      required(controller.snapshot().view),
      city.id,
      "KNIGHT",
    );
    requiredButton("lay-egg-knight").click();
    const panel = requiredElement<HTMLElement>('[data-v7-lay-egg="picking"]');
    expect(panel.dataset.layEggRole).toBe("KNIGHT");
    expect(panel.dataset.nestTiles).toBe("7,7 8,7 9,7 7,8 9,8 7,9 8,9 9,9");
    expect(panel.querySelector(".v7-kaboom-summary")?.textContent).toBe(
      "Choose a tile next to the city for the Egg",
    );
    expect(panel.querySelector(".v7-lay-egg-detail")?.textContent).toBe(
      `${layEggRowTextV7("T-Rex", tRex)}. 8 tiles are highlighted.`,
    );
    expect(document.querySelector("#v7-live")?.textContent).toBe(
      "Choose a tile next to the city for the Egg.",
    );
    // The cards step aside while picking; the board shows the nest tiles.
    expect(document.querySelectorAll(".v7-lay-egg-card")).toHaveLength(0);
    expect(host.lastModel?.interaction.layEgg).toEqual({
      cityId: city.id,
      role: "KNIGHT",
    });
    expect(controller.accepted).toEqual([]);
    // Escape leaves the picking and keeps the city selected.
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(document.querySelector('[data-v7-lay-egg="picking"]')).toBe(null);
    expect(host.lastModel?.interaction.layEgg).toBeUndefined();
    expect(requiredElement(".v7-selection-dock h2").textContent).toBe(
      "Capital",
    );
    requiredButton("lay-egg-knight").click();
    requiredButton("cancel-lay-egg").click();
    expect(document.querySelector('[data-v7-lay-egg="picking"]')).toBe(null);
    // Selecting something else on the board also leaves it.
    requiredButton("lay-egg-knight").click();
    host.callbacks?.onSelection({ kind: "TILE", at: { x: 5, y: 2 } });
    expect(host.lastModel?.interaction.layEgg).toBeUndefined();
    // Pick again and click a nest tile: one LAY_EGG is dispatched.
    host.callbacks?.onSelection({ kind: "CITY", cityId: city.id });
    requiredButton("lay-egg-knight").click();
    host.callbacks?.onCommand(nestTarget(host, { x: 9, y: 8 }));
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "LAY_EGG",
      cityId: city.id,
      role: "KNIGHT",
      at: { x: 9, y: 8 },
    });
    await waitUntil(
      () =>
        document.querySelector("#v7-live")?.textContent ===
        "You laid a T-Rex Egg",
    );
    expect(document.querySelector(".v7-toast")?.textContent).toBe(
      "You laid a T-Rex Egg",
    );
    expect(document.querySelector('[data-v7-lay-egg="picking"]')).toBe(null);
    expect(requiredElement(".v7-city-units").textContent).toBe(
      `${tRex.usedSlots + tRex.slots}/${tRex.capacity} slots`,
    );
    app.destroy();
  });
});

describe("Revision 19 Egg dock and Shaman Hatch", () => {
  it("shows an own Egg's dock with its countdown, slots and Abandon Egg", async () => {
    const controller = new FixtureController(dinosaurShowcaseFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const egg = selectUnitAt(controller, host, AT.tRexEgg);
    const turns = required(
      controller.snapshot().view?.eggs.find((entry) => entry.unitId === egg.id),
    ).turnsRemaining;
    const refund = eggRefundV7("KNIGHT", "DINOSAUR");
    const dock = requiredElement<HTMLElement>(".v7-selection-dock");
    expect(dock.querySelector("h2")?.textContent).toBe("T-Rex Egg");
    expect(
      [...dock.querySelectorAll(".v7-identity .v7-chip")].map(
        (chip) => chip.textContent,
      ),
    ).toEqual([
      "Dinosaur",
      eggCountdownTextV7(turns),
      slotsTextV7(roleSlots("KNIGHT")),
    ]);
    expect(dock.querySelector(".v7-tactical-role")).toBe(null);
    expect(dock.querySelector('[data-v7-egg="info"]')?.textContent).toBe(
      eggInfoTextV7("T-Rex", turns),
    );
    // Only HP and Defense: an Egg cannot move or fight.
    expect(
      [...dock.querySelectorAll<HTMLElement>(".v7-unit-stats .v7-stat")].map(
        (row) => row.dataset.stat,
      ),
    ).toEqual(["hp", "defense"]);
    expect(
      dock.querySelector('[data-stat="hp"] .v7-stat-value')?.textContent,
    ).toBe(`${EGG_HP_V7}/${EGG_HP_V7}`);
    // LEGACY: the code-drawn Egg, no faction badge, and not dimmed as done.
    expect(dock.querySelector(".v7-identity-art .v7-egg-figure")).not.toBe(
      null,
    );
    expect(dock.querySelector(".v7-identity-art .v7-dinosaur-badge")).toBe(
      null,
    );
    expect(dock.dataset.handled).toBeUndefined();
    expect(actionLabels()).toEqual(["Abandon Egg"]);
    const abandon = requiredButton("command-disband");
    expect(abandon.title).toBe(`Remove this Egg for ${refund} Coins`);
    expect(abandon.getAttribute("aria-label")).toBe(
      `Abandon Egg. Remove this Egg for ${refund} Coins`,
    );
    expect(abandon.querySelector(".v7-economy-chip")?.textContent).toBe(
      `+${refund}`,
    );
    abandon.click();
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({ kind: "DISBAND", unitId: egg.id });
    app.destroy();
  });

  it("shows an enemy Egg's dock without actions", () => {
    const controller = new FixtureController(dinosaurEnemyFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const egg = selectUnitAt(controller, host, DINOSAUR_ENEMY_V7.tRexEgg);
    const turns = required(
      controller.snapshot().view?.eggs.find((entry) => entry.unitId === egg.id),
    ).turnsRemaining;
    const dock = requiredElement<HTMLElement>(".v7-selection-dock");
    expect(dock.querySelector("h2")?.textContent).toBe("T-Rex Egg");
    expect(dock.querySelector(".v7-identity-owner")?.textContent).toBe(
      "Player 2",
    );
    expect(
      dock.querySelector('[data-stat="hp"] .v7-stat-value')?.textContent,
    ).toBe(`1/${EGG_HP_V7}`);
    expect(dock.querySelector('[data-v7-egg="info"]')?.textContent).toBe(
      eggInfoTextV7("T-Rex", turns),
    );
    expect(actionLabels()).toEqual([]);
    app.destroy();
  });

  it("offers Hatch for the earlier Egg, explains the new Egg, and hatches", async () => {
    const controller = new FixtureController(dinosaurShowcaseFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const shaman = selectUnitAt(controller, host, AT.shaman);
    const egg = unitAt(controller, AT.tRexEgg);
    const preview = required(
      previewHatchV7(required(controller.snapshot().view), shaman.id, egg.id),
    );
    expect(requiredElement(".v7-selection-dock h2").textContent).toBe("Shaman");
    expect(actionLabels()).toEqual(["Hatch", "Disband", "Wait", "Hatch"]);
    const hatch = requiredButton(`command-hatch-${egg.id}`);
    expect(hatch.title).toBe(
      "Hatch an adjacent Egg laid on an earlier turn. The new unit cannot act this turn.",
    );
    expect(hatch.getAttribute("aria-label")).toBe(
      `Hatch T-Rex Egg: a T-Rex with ${preview.hp} HP appears now, ${turnsTextV7(preview.turnsSaved)} early. The new unit cannot act this turn.`,
    );
    expect(hatch.querySelector(".v7-hatch-chip")?.textContent).toBe(
      "T-Rex · now",
    );
    const blocked = requiredButton("hatch-unavailable");
    expect(blocked.getAttribute("aria-disabled")).toBe("true");
    expect(blocked.dataset.disabledReason).toBe("hatch-new-egg");
    expect(blocked.getAttribute("aria-label")).toBe(
      "Hatch unavailable. This Egg was laid this turn; it can be hatched from your next turn",
    );
    // The board targets the same Egg.
    const plan = boardPlan(host);
    expect(
      plan.targets
        .filter((target) => target.family === "HATCH")
        .map((target) => target.at),
    ).toEqual([AT.tRexEgg]);
    hatch.click();
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "HATCH",
      unitId: shaman.id,
      eggUnitId: egg.id,
    });
    await waitUntil(
      () =>
        document.querySelector("#v7-live")?.textContent ===
        "Your T-Rex hatched",
    );
    // The hatchling is a T-Rex now; the new Egg still waits.
    selectUnitAt(controller, host, AT.tRexEgg);
    expect(requiredElement(".v7-selection-dock h2").textContent).toBe("T-Rex");
    app.destroy();
  });
});

describe("Revision 20 Charge!", () => {
  it("has no Stampede control, shows the run-up after a Move and charges from the board", async () => {
    const controller = new FixtureController(dinosaurShowcaseFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const triceratops = selectUnitAt(controller, host, AT.triceratops);
    const guard = unitAt(controller, AT.pushTarget);
    expect(requiredElement(".v7-selection-dock h2").textContent).toBe(
      "Triceratops",
    );
    // Revision 20: no Stampede button, chip, legend or hint; unmoved, it has
    // no run-up and its enemies are out of reach.
    expect(actionLabels()).toEqual(["Disband", "Wait"]);
    expect(document.querySelector(STAMPEDE_CONTROLS)).toBe(null);
    expect(statusChips()).toEqual([]);
    expect(
      boardPlan(host).targets.some((target) => target.family === "ATTACK"),
    ).toBe(false);
    // Two tiles over the own Caveman, next to the Juggernaut.
    host.callbacks?.onCommand(
      required(boardTarget(host, "MOVE", AT.chargeFrom)),
    );
    await waitUntil(() => controller.accepted.length === 1);
    await waitUntil(
      () => boardTarget(host, "ATTACK", AT.pushTarget) !== undefined,
    );
    const view = required(controller.snapshot().view);
    const preview = required(
      queryCombatPreviewV7(view, triceratops.id, guard.id),
    );
    expect(preview).toMatchObject({ runUp: 2, push: "WILL_PUSH" });
    // The dock returns once the Move has been presented.
    await waitUntil(() => statusChips().length > 0);
    expect(statusChips()).toEqual(["Charge! +2 Attack"]);
    const attack = required(boardTarget(host, "ATTACK", AT.pushTarget));
    expect(attack.previewLabel).toBe(
      `Deal ${preview.damageToDefender} · take ${preview.damageToAttacker}`,
    );
    expect(attack.previewNote).toBe(
      "Charge +2 · Pushes back; Triceratops follows",
    );
    // One activation of the board target performs the ordinary Attack.
    host.callbacks?.onCommand(attack);
    await waitUntil(() => controller.accepted.length === 2);
    expect(controller.accepted[1]).toEqual({
      kind: "ATTACK",
      unitId: triceratops.id,
      targetUnitId: guard.id,
    });
    // The Juggernaut was pushed one tile east and the Triceratops followed.
    const after = required(controller.snapshot().view);
    expect(after.units.find((unit) => unit.id === guard.id)).toMatchObject({
      at: { x: AT.pushTarget.x + 1, y: AT.pushTarget.y },
      hp: guard.hp - preview.damageToDefender,
    });
    expect(after.units.find((unit) => unit.id === triceratops.id)?.at).toEqual(
      AT.pushTarget,
    );
    // It has attacked: the run-up status is gone.
    await waitUntil(() => statusChips().length === 0);
    expect(document.querySelector(STAMPEDE_CONTROLS)).toBe(null);
    app.destroy();
  });

  it("shows a shorter run-up after a one-tile Move", async () => {
    const controller = new FixtureController(dinosaurShowcaseFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const triceratops = selectUnitAt(controller, host, AT.triceratops);
    const fighter = unitAt(controller, AT.killTarget);
    host.callbacks?.onCommand(required(boardTarget(host, "MOVE", AT.killFrom)));
    await waitUntil(
      () => boardTarget(host, "ATTACK", AT.killTarget) !== undefined,
    );
    const view = required(controller.snapshot().view);
    const preview = required(
      queryCombatPreviewV7(view, triceratops.id, fighter.id),
    );
    expect(preview).toMatchObject({ runUp: 1, defenderDies: true });
    await waitUntil(() => statusChips().length > 0);
    expect(statusChips()).toEqual(["Charge! +1 Attack"]);
    // A kill has no Push line.
    expect(boardTarget(host, "ATTACK", AT.killTarget)?.previewNote).toBe(
      "Charge +1",
    );
    app.destroy();
  });

  it("warns of the death blast of a Charge kill on its board target", async () => {
    const controller = new FixtureController(dinosaurBlastFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const triceratops = selectUnitAt(
      controller,
      host,
      DINOSAUR_BLAST_V7.triceratops,
    );
    const target = unitAt(controller, DINOSAUR_BLAST_V7.bombChucker);
    host.callbacks?.onCommand(
      required(boardTarget(host, "MOVE", DINOSAUR_BLAST_V7.chargeFrom)),
    );
    await waitUntil(
      () =>
        boardTarget(host, "ATTACK", DINOSAUR_BLAST_V7.bombChucker) !==
        undefined,
    );
    const view = required(controller.snapshot().view);
    const preview = required(
      queryCombatPreviewV7(view, triceratops.id, target.id),
    );
    const chain = required(
      previewAttackExplosionsV7(view, triceratops.id, target.id),
    );
    const text = goblinAttackPreviewTextV7(view, preview, chain);
    expect(text.warnings).toHaveLength(3);
    const attack = required(
      boardTarget(host, "ATTACK", DINOSAUR_BLAST_V7.bombChucker),
    );
    expect(attack).toMatchObject({
      previewWarnings: text.warnings,
      previewWarningSummary: text.summary,
    });
    // No Stampede arming panel exists: it is an ordinary attack.
    expect(document.querySelector(STAMPEDE_CONTROLS)).toBe(null);
    host.callbacks?.onCommand(attack);
    await waitUntil(() => controller.accepted.length === 2);
    expect(controller.accepted[1]).toEqual({
      kind: "ATTACK",
      unitId: triceratops.id,
      targetUnitId: target.id,
    });
    app.destroy();
  });
});

describe("Revision 19 growth, abilities and labels", () => {
  it("shows the growth stage, kills to the next one and slots in the dock and unit info", () => {
    const controller = new FixtureController(dinosaurShowcaseFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const chips = () =>
      [
        ...document.querySelectorAll<HTMLElement>(
          ".v7-selection-dock .v7-dinosaur-chip",
        ),
      ].map((chip) => [chip.dataset.unitStatus, chip.textContent]);
    const slotChip = (role: UnitRoleIdV7): string[][] =>
      roleSlots(role) > 1 ? [["slots", slotsTextV7(roleSlots(role))]] : [];
    const bigBody = (role: UnitRoleIdV7): string[] =>
      roleSlots(role) > 1 ? ["Big body"] : [];
    const alpha = selectUnitAt(controller, host, AT.alphaTRex);
    expect(chips()).toEqual([...slotChip("KNIGHT"), ["growth", "Alpha"]]);
    // The growth HP is shown as a bonus over the role's registry HP.
    expect(
      requiredElement('.v7-selection-dock [data-stat="hp"] .v7-stat-value')
        .textContent,
    ).toBe(
      `${alpha.hp}/${alpha.maxHp}+${alpha.maxHp - effectiveRoleRuleV7("KNIGHT", "DINOSAUR").maxHp}`,
    );
    requiredButton("unit-help").click();
    expect(
      [
        ...document.querySelectorAll<HTMLElement>(
          ".v7-unit-help-dialog .v7-unit-ability",
        ),
      ].map((entry) => [
        entry.dataset.dinosaurInfo ?? null,
        entry.querySelector("strong")?.textContent,
        entry.querySelector("span")?.textContent,
      ]),
    ).toEqual([
      [
        null,
        "Rampage",
        "After a kill, advances and can attack another adjacent enemy.",
      ],
      [null, "Grows", dinosaurAbilityDescriptionV7("GROW", "DINOSAUR")],
      ["growth", "Alpha", growthInfoTextV7(null)],
      ...(roleSlots("KNIGHT") > 1
        ? [
            [
              "slots",
              "Big body",
              `Takes ${slotsTextV7(roleSlots("KNIGHT"))} in its city.`,
            ],
          ]
        : []),
    ]);
    requiredButton("close-unit-help").click();
    selectUnitAt(controller, host, AT.bigRaptor);
    expect(chips()).toEqual([
      ...slotChip("RAIDER"),
      ["growth", growthChipTextV7(1, GROWTH_KILLS_V7[1] - GROWTH_KILLS_V7[0])],
    ]);
    selectUnitAt(controller, host, AT.ankylosaurus);
    expect(chips()).toEqual([
      ...slotChip("GUARD"),
      ["growth", growthChipTextV7(0, GROWTH_KILLS_V7[0])],
    ]);
    selectUnitAt(controller, host, AT.shaman);
    expect(chips()).toEqual([]);
    // The Spitter, Ankylosaurus and Shaman name their abilities.
    const abilityNames = (at: CoordV7): (string | null)[] => {
      selectUnitAt(controller, host, at);
      requiredButton("unit-help").click();
      const names = [
        ...document.querySelectorAll(
          ".v7-unit-help-dialog .v7-unit-ability strong",
        ),
      ].map((node) => node.textContent);
      requiredButton("close-unit-help").click();
      return names;
    };
    expect(abilityNames(AT.spitter)).toEqual([
      "Capture",
      "Acid",
      "Grows",
      "Growth",
      ...bigBody("MARKSMAN"),
    ]);
    expect(abilityNames(AT.ankylosaurus)).toEqual([
      "Capture",
      "Armoured",
      "Grows",
      "Growth",
      ...bigBody("GUARD"),
      "Wild",
    ]);
    expect(abilityNames(AT.shaman)).toEqual(["War Drums", "Tend", "Hatch"]);
    expect(abilityNames(AT.triceratops)).toEqual([
      "Charge!",
      "Grows",
      "Growth",
      ...bigBody("CATAPULT"),
    ]);
    app.destroy();
  });

  it("labels War Drums, the faction chip and the Field Defense restriction", () => {
    const controller = new FixtureController(
      dinosaurUiFieldV7([
        { seat: 0, role: "CAPTAIN", at: { x: 7, y: 8 } },
        { seat: 0, role: "FIGHTER", at: { x: 8, y: 9 } },
        { seat: 0, role: "RAIDER", at: { x: 7, y: 9 } },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 6 } },
      ]),
    );
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    selectUnitAt(controller, host, { x: 7, y: 8 });
    expect(actionLabels()).toEqual(["War Drums", "Disband", "Wait"]);
    expect(
      requiredElement('.v7-faction-chip[data-faction="dinosaur"]').textContent,
    ).toBe("Dinosaur");
    // LEGACY art: the Human sprite carries the Dinosaur badge.
    expect(
      document.querySelector(".v7-identity-art .v7-dinosaur-badge"),
    ).not.toBe(null);
    selectUnitAt(controller, host, { x: 8, y: 9 });
    expect(requiredElement(".v7-selection-dock h2").textContent).toBe(
      "Caveman",
    );
    const fortify = requiredButton("dinosaur-field-defense");
    expect(fortify.getAttribute("aria-disabled")).toBe("true");
    expect(fortify.getAttribute("aria-label")).toBe(
      "Fortify unavailable. Dinosaurs cannot build Field Defense",
    );
    selectUnitAt(controller, host, { x: 7, y: 9 });
    expect(
      document.querySelector('[data-action="dinosaur-field-defense"]'),
    ).toBe(null);
    // Leaderboard and turn status name the factions.
    requiredButton("compact-menu").click();
    requiredButton("leaderboard").click();
    expect(
      [...document.querySelectorAll(".v7-leaderboard .v7-faction-chip")]
        .map((chip) => chip.textContent)
        .sort(),
    ).toEqual(["Dinosaur", "Human"]);
    app.destroy();
  });

  it("names Nesting, Wallbreaker and the Egg unlocks in the technology tree", () => {
    const controller = new FixtureController(
      dinosaurCityFixtureV7({ techs: { 0: [] } }),
    );
    const app = mount(controller, new RecordingBoardHost());
    requiredButton("tech").click();
    expect(
      requiredButton("tech-fortification").querySelector(".v7-tech-name")
        ?.textContent,
    ).toBe("Nesting");
    const unlocks = (tech: string): (string | null)[] => {
      requiredButton(`tech-${tech}`).click();
      return [...document.querySelectorAll(".v7-tech-unlocks li")].map(
        (item) => item.textContent,
      );
    };
    expect(unlocks("fortification")).toEqual([nestingUnlockTextV7()]);
    // Revision 20: Nesting also gives every city a slot.
    expect(nestingUnlockTextV7()).toBe(
      `Eggs have +${nestingEggHpBonusV7()} HP and hatch one turn sooner; +1 unit slot in every city`,
    );
    expect(requiredElement(".v7-tech-detail").getAttribute("aria-label")).toBe(
      "Nesting details",
    );
    expect(unlocks("scouting")).toContain("Raptor Egg");
    expect(unlocks("sawmilling")).toContain("Triceratops Egg (Charge!)");
    // Revision 20: the Explosives slot is Wallbreaker for a Dinosaur.
    expect(
      requiredButton("tech-explosives").querySelector(".v7-tech-name")
        ?.textContent,
    ).toBe("Wallbreaker");
    // It keeps both Explosives unlocks and adds its own.
    expect(unlocks("explosives")).toEqual(
      expect.arrayContaining(["Blast mountain", WALLBREAKER_UNLOCK_TEXT_V7]),
    );
    expect(requiredElement(".v7-tech-detail").getAttribute("aria-label")).toBe(
      "Wallbreaker details",
    );
    expect(unlocks("chivalry")).toEqual(
      expect.arrayContaining([
        "T-Rex Egg",
        "Rampage: T-Rexes advance after a kill and may attack again",
      ]),
    );
    expect(unlocks("administration")).toEqual(
      expect.arrayContaining([
        "Train Shaman",
        "Shamans beat War Drums or Tend nearby troops, and Hatch Eggs",
      ]),
    );
    expect(unlocks("metallurgy")).toContain(
      "Forge discount: 1 Coin off trained land units and Eggs",
    );
    app.destroy();
    // Recruit help of an egg-laid role: hatch time and slots.
    expect(recruitmentRolePresentationV7("CATAPULT", "DINOSAUR")).toMatchObject(
      {
        label: "Triceratops",
        // Revision 20: it attacks after moving.
        restrictions: [
          "Can't capture.",
          ...dinosaurRecruitNotesV7("CATAPULT", "DINOSAUR"),
        ],
      },
    );
    expect(
      recruitmentRolePresentationV7("CATAPULT", "DINOSAUR").abilities,
    ).toEqual([
      `Charge!: ${dinosaurAbilityDescriptionV7("LINEBREAKER", "DINOSAUR")}`,
      `Grows: ${dinosaurAbilityDescriptionV7("GROW", "DINOSAUR")}`,
    ]);
    expect(dinosaurRecruitNotesV7("CATAPULT", "DINOSAUR")[0]).toMatch(
      /^Laid as an Egg next to the city; hatches after \d+ turns?/,
    );
  });

  it("offers the Dinosaur rewards by name", () => {
    const militia = new FixtureController(
      rewardStateV7("MILITIA", "DINOSAUR").state,
    );
    const app = mount(militia, new RecordingBoardHost());
    expect(requiredButton("reward-militia").getAttribute("aria-label")).toBe(
      required(dinosaurRewardLabelV7("MILITIA")).join(": "),
    );
    app.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    const giant = new FixtureController(
      rewardStateV7("JUGGERNAUT", "DINOSAUR").state,
    );
    const next = mount(giant, new RecordingBoardHost());
    expect(requiredButton("reward-juggernaut").getAttribute("aria-label")).toBe(
      required(dinosaurRewardLabelV7("JUGGERNAUT")).join(": "),
    );
    next.destroy();
  });
});

describe("Revision 19 Help", () => {
  it("lists the Dinosaur rules for every viewer of a match with a Dinosaur seat", () => {
    const rules = () =>
      [...document.querySelectorAll(".v7-help-dinosaur li")].map(
        (item) => item.textContent,
      );
    const expected = DINOSAUR_HELP_RULES_V7.map(
      ([name, sentence]) => `${name}: ${sentence}`,
    );
    for (const [fixture, laysEggs] of [
      [dinosaurShowcaseFixtureV7, true],
      [dinosaurEnemyFixtureV7, false],
    ] as const) {
      document.body.innerHTML = '<div id="app"></div>';
      const app = mount(
        new FixtureController(fixture()),
        new RecordingBoardHost(),
      );
      requiredButton("compact-menu").click();
      requiredButton("help").click();
      expect(rules()).toEqual(expected);
      expect(
        [...document.querySelectorAll(".v7-help h3")].map(
          (heading) => heading.textContent,
        ),
      ).toEqual(["Dinosaurs", "Keyboard"]);
      const tips = [...document.querySelectorAll(".v7-help-tips li")].map(
        (item) => item.textContent,
      );
      expect(
        tips.includes("Select your city to train units and lay Eggs."),
      ).toBe(laysEggs);
      // Revision 20: every viewer is told that a Promotion fully heals.
      expect(tips).toContain(PROMOTION_HELP_TIP_V7);
      // A Raptor has no Escape, so a Dinosaur viewer is not told of it.
      expect(
        tips.includes(
          "A Raider that survives an attack may move again (Escape).",
        ),
      ).toBe(!laysEggs);
      app.destroy();
    }
    document.body.innerHTML = '<div id="app"></div>';
    const goblin = mount(
      new FixtureController(goblinShowcaseFixtureV7()),
      new RecordingBoardHost(),
    );
    requiredButton("compact-menu").click();
    requiredButton("help").click();
    expect(rules()).toEqual([]);
    expect(document.querySelector(".v7-help-dinosaur")).toBe(null);
    goblin.destroy();
  });
});

class SetupController implements Ruleset7ControllerPortV7 {
  readonly launched: MatchSetupV7[] = [];
  snapshot(): Ruleset7BrowserSnapshot {
    return {
      phase: "EMPTY",
      view: null,
      offeredCommands: [],
      savedAt: null,
      hasStoredSave: false,
      recovery: null,
      saveWarning: null,
      diagnostic: null,
      transitioning: false,
      ai: idleAi(),
    };
  }
  subscribe(
    subscriber: (snapshot: Ruleset7BrowserSnapshot) => void,
  ): () => void {
    subscriber(this.snapshot());
    return () => undefined;
  }
  subscribeAcceptedBoundary(
    subscriber: (boundary: Ruleset7AcceptedBoundary) => void,
  ): () => void {
    void subscriber;
    return () => undefined;
  }
  readonly launch: Ruleset7ControllerPortV7["launch"] = async (setup) => {
    this.launched.push(setup);
    return {
      ok: false,
      code: "INVALID_SETUP",
      diagnostic: "Setup recorded",
    };
  };
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

class FixtureController extends SetupController {
  readonly accepted: CommandV7[] = [];
  readonly #snapshotSubscribers = new Set<
    (snapshot: Ruleset7BrowserSnapshot) => void
  >();
  readonly #boundarySubscribers = new Set<
    (boundary: Ruleset7AcceptedBoundary) => void
  >();
  #state: GameStateV7;
  #snapshot: Ruleset7BrowserSnapshot;

  constructor(state: GameStateV7) {
    super();
    this.#state = state;
    this.#snapshot = activeSnapshot(state);
  }
  override snapshot(): Ruleset7BrowserSnapshot {
    return this.#snapshot;
  }
  override subscribe(
    subscriber: (snapshot: Ruleset7BrowserSnapshot) => void,
  ): () => void {
    this.#snapshotSubscribers.add(subscriber);
    subscriber(this.#snapshot);
    return () => this.#snapshotSubscribers.delete(subscriber);
  }
  override subscribeAcceptedBoundary(
    subscriber: (boundary: Ruleset7AcceptedBoundary) => void,
  ): () => void {
    this.#boundarySubscribers.add(subscriber);
    return () => this.#boundarySubscribers.delete(subscriber);
  }
  override readonly dispatch = async (
    command: CommandV7,
  ): Promise<Ruleset7DispatchResult> => {
    const beforeState = this.#state;
    const beforeView = viewForV7(beforeState, beforeState.humanPlayerId);
    const result = applyCommandV7(
      beforeState,
      beforeState.humanPlayerId,
      command,
    );
    if (!result.accepted)
      return {
        accepted: false,
        reason: "ENGINE_REJECTED",
        error: result.error,
      };
    this.accepted.push(command);
    this.#state = result.state;
    const afterView = viewForV7(result.state, result.state.humanPlayerId);
    const playerEvents = projectEventsV7(
      beforeState,
      result.state,
      result.state.humanPlayerId,
      result.events,
    );
    this.#snapshot = activeSnapshot(result.state);
    const boundary = {
      actor: "HUMAN" as const,
      beforeView,
      afterView,
      playerEvents,
    };
    for (const subscriber of this.#boundarySubscribers) subscriber(boundary);
    for (const subscriber of this.#snapshotSubscribers)
      subscriber(this.#snapshot);
    return { accepted: true, beforeView, afterView, playerEvents };
  };
}

class RecordingBoardHost implements BoardHostV7 {
  callbacks: BoardHostCallbacksV7 | null = null;
  lastModel: BoardHostModelV7 | null = null;
  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    this.callbacks = callbacks;
    container.append(document.createElement("canvas"));
  }
  update(model: BoardHostModelV7): void {
    this.lastModel = model;
  }
  activate(): void {}
  zoom(): void {}
  focus(): void {}
  async presentBoundary(): Promise<void> {}
  finishPresentations(): void {}
  destroy(): void {}
}

function activeSnapshot(state: GameStateV7): Ruleset7BrowserSnapshot {
  const view = viewForV7(state, state.humanPlayerId);
  return {
    phase: "ACTIVE",
    view,
    offeredCommands: queryPlayerCommandsV7(view),
    savedAt: null,
    hasStoredSave: false,
    recovery: null,
    saveWarning: null,
    diagnostic: null,
    transitioning: false,
    ai: idleAi(),
  };
}

function idleAi(): Ruleset7BrowserSnapshot["ai"] {
  return {
    active: false,
    fastForward: false,
    policySlices: 0,
    acceptedCommands: 0,
    lastSliceMilliseconds: 0,
    maximumSliceMilliseconds: 0,
  };
}

function mount(
  controller: Ruleset7ControllerPortV7,
  host: BoardHostV7,
): Ruleset7DomAppView {
  return new Ruleset7DomAppView(
    document,
    requiredElement<HTMLElement>("#app"),
    controller,
    { boardHost: host, settingsStorage: null },
  );
}

type PublicUnit = NonNullable<Ruleset7BrowserSnapshot["view"]>["units"][number];

function unitAt(controller: FixtureController, at: CoordV7): PublicUnit {
  return required(
    controller
      .snapshot()
      .view?.units.find((item) => item.at.x === at.x && item.at.y === at.y),
  );
}

function selectUnitAt(
  controller: FixtureController,
  host: RecordingBoardHost,
  at: CoordV7,
): PublicUnit {
  const unit = unitAt(controller, at);
  host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
  return unit;
}

function selectCity(
  controller: FixtureController,
  host: RecordingBoardHost,
): NonNullable<Ruleset7BrowserSnapshot["view"]>["cities"][number] {
  const view = required(controller.snapshot().view);
  const city = required(
    view.cities.find(
      (candidate) =>
        candidate.at.x === DINOSAUR_CITY_V7.capital.x &&
        candidate.at.y === DINOSAUR_CITY_V7.capital.y,
    ),
  );
  host.callbacks?.onSelection({ kind: "CITY", cityId: city.id });
  return city;
}

/** The board plan the real host would build from the last model. */
function boardPlan(
  host: RecordingBoardHost,
): ReturnType<typeof buildBoardRenderPlanV7> {
  const model = required(host.lastModel);
  return buildBoardRenderPlanV7(
    model.view,
    model.offeredCommands,
    model.interaction,
  );
}

function nestTarget(host: RecordingBoardHost, at: CoordV7) {
  return required(
    boardPlan(host).targets.find(
      (target) =>
        target.family === "LAY_EGG" &&
        target.at.x === at.x &&
        target.at.y === at.y,
    ),
  );
}

function eggReasons(): (string | null)[] {
  return [
    ...document.querySelectorAll(".v7-lay-egg-action .v7-egg-reason"),
  ].map((node) => node.textContent);
}

function actionLabels(): (string | null)[] {
  return [
    ...document.querySelectorAll(".v7-selection-dock .v7-action-label"),
  ].map((node) => node.textContent);
}

function requiredButton(action: string): HTMLButtonElement {
  return requiredElement<HTMLButtonElement>(`[data-action="${action}"]`);
}

function requiredElement<T extends Element>(selector: string): T {
  const result = document.querySelector<T>(selector);
  if (result === null) throw new Error(`${selector} missing`);
  return result;
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error("Required Dinosaur DOM fixture value missing");
  return value;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}
