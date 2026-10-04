// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  applyCommandV7,
  effectiveRoleRuleV7,
  previewBeamDownV7,
  previewMindControlV7,
  previewTractorBeamV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  roleMechanicsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import type {
  Ruleset7AcceptedBoundary,
  Ruleset7BrowserSnapshot,
  Ruleset7DispatchResult,
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
  BEAMED_CAN_ATTACK_V7,
  BEAMED_CHIP_V7,
  BEAMED_HINT_V7,
  BEAMED_NO_MOVE_V7,
  BEAM_BADGE_V7,
  BEAM_DOWN_LABEL_V7,
  BEAM_DOWN_TOOLTIP_V7,
  DISINTEGRATOR_UNLOCK_TEXT_V7,
  FORCE_FIELDS_UNLOCK_TEXT_V7,
  MARTIAN_ACTED_V7,
  MARTIAN_FROZEN_MOVED_V7,
  MARTIAN_HELP_RULES_V7,
  MIND_CONTROLLED_LABEL_V7,
  TRACTOR_FREE_TAG_V7,
  TRACTOR_USED_CHIP_V7,
  TRACTOR_USED_V7,
  brainControlTextV7,
  martianRoleUnlockTextV7,
  mindControlPreviewLinesV7,
  mindControlReadyInV7,
  mindControlledInfoV7,
  shieldTextV7,
  tractorBeamTooltipV7,
} from "../../src/render/martian-presentation-v7";
import {
  MARTIAN_MOBILITY_V7,
  MARTIAN_UI_V7,
  martianMobilityFixtureV7,
  martianUiFieldV7,
  martianUiFixtureV7,
} from "../fixtures/v7-martian-ui";
import {
  MARTIAN_FROZEN_V7,
  martianFrozenFixtureV7,
} from "../fixtures/v7-ice-folk-ui";
import { goblinShowcaseFixtureV7 } from "../fixtures/v7-goblin-ui";

// Every Martian number expected below is read from the registry or from a
// public preview of the same view: the balance bead (`pulp_wars-t6s.5`) may
// retune Shields, Attack, slots and the abilities.
const AT = MARTIAN_UI_V7;
const label = (role: Parameters<typeof effectiveRoleRuleV7>[0]): string =>
  effectiveRoleRuleV7(role, "MARTIAN").label;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Martian setup", () => {
  it("offers Martian for every seat and launches the chosen factions", async () => {
    const chosen = new SetupController();
    const app = mount(chosen, new RecordingBoardHost());
    const count = requiredElement<HTMLSelectElement>("#v7-ai-count");
    count.value = "3";
    count.dispatchEvent(new Event("change", { bubbles: true }));
    for (const seat of [0, 1, 2, 3]) {
      const field = requiredElement<HTMLSelectElement>(`#v7-faction-${seat}`);
      // The Ice Folk UI (pulp_wars-7g3.6) adds the sixth faction, the Dwarf
      // UI (pulp_wars-78i.6) the seventh.
      expect([...field.options].map((option) => option.textContent)).toEqual([
        "Human",
        "Undead",
        "Goblin",
        "Dinosaur",
        "Martian",
        "Ice Folk",
        "Dwarf",
        "Candy",
      ]);
      // pulp_wars-w5j.1: distinct defaults (Human, Undead, Goblin, Dinosaur).
      expect(field.value).toBe(
        ["ORIGINAL", "UNDEAD", "GOBLIN", "DINOSAUR"][seat],
      );
    }
    for (const seat of [0, 2]) {
      const field = requiredElement<HTMLSelectElement>(`#v7-faction-${seat}`);
      field.value = "MARTIAN";
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
    requiredButton("launch").click();
    await waitUntil(() => chosen.launched.length === 1);
    // pulp_wars-w5j.1: a second Martian seat is impossible; seat 2 takes
    // the first untaken faction (Human).
    expect(chosen.launched[0]?.factions).toEqual([
      "MARTIAN",
      "UNDEAD",
      "ORIGINAL",
      "DINOSAUR",
    ]);
    app.destroy();
  });
});

describe("Martian unit dock", () => {
  it("shows the Shield, the ray's power, Cooling, a controlled unit and a Brain's control", () => {
    const controller = new FixtureController(martianUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const view = required(controller.snapshot().view);
    const stats = (at: CoordV7) =>
      required(
        view.unitStats.find(
          (entry) => entry.unitId === unitAt(controller, at).id,
        )?.martian,
      );
    selectUnitAt(controller, host, AT.dentedGrunt);
    expect(chipText("shield")).toBe(shieldTextV7(stats(AT.dentedGrunt)));
    // The Shield stat row: current / maximum.
    expect(
      requiredElement('.v7-selection-dock [data-stat="shield"] .v7-stat-value')
        .textContent,
    ).toBe(
      `${stats(AT.dentedGrunt).shield}/${stats(AT.dentedGrunt).shieldMaximum}`,
    );
    expect(
      requiredElement(".v7-selection-dock .v7-faction-chip").textContent,
    ).toBe("Martian");
    selectUnitAt(controller, host, AT.rayGunner);
    expect(chipText("ray-power")).toBe("Full power");
    selectUnitAt(controller, host, AT.coolingGunner);
    expect(chipText("cooling")).toBe("Cooling");
    expect(chipText("ray-power")).toBeNull();
    // The Mind Control revision (section 9): a controlled Human Fighter
    // keeps its name; its brain badge says "Controlled" and names the
    // controller and the original owner, with the sentences in its tooltip.
    selectUnitAt(controller, host, AT.controlled);
    expect(requiredElement(".v7-selection-dock h2").textContent).toBe(
      "Fighter",
    );
    const badge = requiredElement<HTMLElement>(
      '.v7-selection-dock [data-unit-status="mind-controlled"]',
    );
    expect(badge.querySelector('[data-icon="brain"]')).not.toBe(null);
    expect(
      [...badge.querySelectorAll("[data-control-owner]")].map((node) => [
        (node as HTMLElement).dataset.controlOwner,
        node.textContent,
      ]),
    ).toEqual([
      ["controller", "You"],
      ["original", "Player 2"],
    ]);
    expect(badge.querySelector(".v7-control-label")?.textContent).toBe(
      MIND_CONTROLLED_LABEL_V7,
    );
    const info = required(
      mindControlledInfoV7(view, unitAt(controller, AT.controlled)),
    );
    expect(badge.title).toContain(info.byLine);
    expect(badge.title).toContain(info.fateLine);
    // Its owner line is the badge's: no separate "Player N".
    expect(
      document.querySelector(".v7-selection-dock .v7-identity-owner"),
    ).toBe(null);
    expect(chipText("shield")).toBeNull();
    // A controlled unit cannot be disbanded; its Brain's link is on the
    // board.
    expect(document.querySelector('[data-action="command-disband"]')).toBe(
      null,
    );
    expect(
      boardPlan(host).entries.some(
        (entry) => entry.kind === "LINK" && entry.label === "CONTROL_LINK",
      ),
    ).toBe(true);
    selectUnitAt(controller, host, AT.controller);
    const brain = required(stats(AT.controller).mindControl);
    expect(chipText("controlled")).toBe(brainControlTextV7(brain));
    // The Brain's chip shows the portrait of the unit it controls.
    const held = unitAt(controller, AT.controlled);
    const portrait = requiredElement<HTMLElement>(
      '.v7-selection-dock [data-unit-status="controlled"] .v7-control-portrait',
    );
    expect(portrait.dataset.controlledUnit).toBe(String(held.id));
    expect(portrait.getAttribute("aria-label")).toBe(
      `Fighter, ${held.hp} of ${held.maxHp} HP`,
    );
    selectUnitAt(controller, host, AT.brain);
    // Psychic Command is the Brain's Rally.
    expect(actionLabels()).toContain("Psychic Command");
    // A machine afloat says so, and is no transport.
    selectUnitAt(controller, host, AT.tripodAfloat);
    expect(requiredElement(".v7-selection-dock h2").textContent).toBe(
      `${label("CATAPULT")} (afloat)`,
    );
    app.destroy();
  });

  it("counts a Martian city in slots", () => {
    const controller = new FixtureController(
      martianUiFieldV7(
        [
          { seat: 0, role: "KNIGHT", at: { x: 8, y: 7 } },
          { seat: 0, role: "FIGHTER", at: { x: 7, y: 7 } },
        ],
        {
          homed: [
            { x: 8, y: 7 },
            { x: 7, y: 7 },
          ],
        },
      ),
    );
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const view = required(controller.snapshot().view);
    const capital = required(
      view.cities.find((city) => city.ownerId === view.viewer.id),
    );
    host.callbacks?.onSelection({ kind: "CITY", cityId: capital.id });
    const used =
      roleMechanicsV7("KNIGHT", "MARTIAN").capacitySlots +
      roleMechanicsV7("FIGHTER", "MARTIAN").capacitySlots;
    expect(
      requiredElement<HTMLElement>('[data-stat="units"]').dataset.capacity,
    ).toBe("slots");
    expect(requiredElement(".v7-city-units").textContent).toMatch(
      new RegExp(`^${used}/\\d+ slots$`),
    );
    app.destroy();
    // With room to train, every production row names its slots (a
    // Mothership takes two).
    document.body.innerHTML = '<div id="app"></div>';
    const roomy = new FixtureController(
      martianUiFieldV7([{ seat: 0, role: "FIGHTER", at: { x: 7, y: 7 } }]),
    );
    const roomyHost = new RecordingBoardHost();
    const second = mount(roomy, roomyHost);
    const roomyView = required(roomy.snapshot().view);
    const roomyCapital = required(
      roomyView.cities.find((city) => city.ownerId === roomyView.viewer.id),
    );
    roomyHost.callbacks?.onSelection({ kind: "CITY", cityId: roomyCapital.id });
    const trained = roomy
      .snapshot()
      .offeredCommands.filter((command) => command.kind === "TRAIN");
    expect(trained.length).toBeGreaterThan(0);
    expect(
      [...document.querySelectorAll<HTMLElement>("[data-slots]")].map((fact) =>
        Number(fact.dataset.slots),
      ),
    ).toEqual(
      trained.map((command) =>
        command.kind === "TRAIN"
          ? roleMechanicsV7(command.role, "MARTIAN").capacitySlots
          : 0,
      ),
    );
    second.destroy();
  });
});

describe("Martian abilities", () => {
  it("beams a unit down: the button, the passenger, then the tile", async () => {
    const controller = new FixtureController(martianUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const saucer = selectUnitAt(controller, host, AT.saucer);
    const passenger = unitAt(controller, AT.capitalGrunt);
    const button = requiredButton("martian-beam-down");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    button.click();
    expect(host.lastModel?.interaction.martianPick).toEqual({
      kind: "BEAM_DOWN",
      unitId: saucer.id,
      passengerUnitId: null,
    });
    // The board's only targets are the passengers; the actions step aside.
    // `pulp_wars-1wy.3`: the city Grunt and the own units within two tiles
    // of the Saucer.
    const passengers = boardPlan(host).targets;
    expect(passengers.length).toBeGreaterThanOrEqual(1);
    expect(
      passengers.every((target) => target.family === "BEAM_DOWN_PASSENGER"),
    ).toBe(true);
    expect(document.querySelector('[data-action="command-disband"]')).toBe(
      null,
    );
    host.callbacks?.onCommand(
      required(
        passengers.find(
          (target) =>
            target.at.x === passenger.at.x && target.at.y === passenger.at.y,
        ),
      ),
    );
    await waitUntil(
      () =>
        host.lastModel?.interaction.martianPick?.kind === "BEAM_DOWN" &&
        host.lastModel.interaction.martianPick.passengerUnitId === passenger.id,
    );
    const preview = required(
      previewBeamDownV7(
        required(controller.snapshot().view),
        saucer.id,
        passenger.id,
      ),
    );
    expect(boardPlan(host).targets.map((target) => target.at)).toEqual(
      preview.destinations,
    );
    // Bead pulp_wars-b5f.8: the tiles are chosen on the board only; the
    // dock names no tile.
    expect(document.querySelector('[data-action^="beam-tile-"]')).toBe(null);
    expect(
      requiredElement("[data-v7-martian-pick] .v7-kaboom-summary").textContent,
    ).toBe("Beam Down");
    // Escape steps back to the passenger, then a second one leaves.
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(host.lastModel?.interaction.martianPick).toEqual({
      kind: "BEAM_DOWN",
      unitId: saucer.id,
      passengerUnitId: null,
    });
    requiredButton(`beam-passenger-${passenger.id}`).click();
    const first = required(preview.destinations[0]);
    host.callbacks?.onCommand(
      required(
        boardPlan(host).targets.find(
          (target) => target.at.x === first.x && target.at.y === first.y,
        ),
      ),
    );
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "BEAM_DOWN",
      unitId: saucer.id,
      passengerUnitId: passenger.id,
      to: first,
    });
    await waitUntil(() =>
      (document.querySelector("#v7-live")?.textContent ?? "").includes(
        `Your ${label("RAIDER")} beamed down a ${label("FIGHTER")}`,
      ),
    );
    expect(host.lastModel?.interaction.martianPick ?? null).toBe(null);
    app.destroy();
  });

  it("takes a weakened enemy with Mind Control, and names why the others cannot be taken", async () => {
    const controller = new FixtureController(martianUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const brain = selectUnitAt(controller, host, AT.brain);
    const weak = unitAt(controller, AT.weakTarget);
    requiredButton("martian-mind-control").click();
    const preview = required(
      previewMindControlV7(
        required(controller.snapshot().view),
        brain.id,
        weak.id,
      ),
    );
    const choice = requiredButton(`mind-control-${weak.id}`);
    expect(choice.getAttribute("aria-label")).toContain(
      mindControlPreviewLinesV7(
        required(controller.snapshot().view),
        preview,
      )[0],
    );
    expect(
      boardPlan(host).entries.some(
        (entry) =>
          entry.kind === "ABILITY_TARGET" &&
          entry.abilityStyle === "MARTIAN_BLOCKED" &&
          entry.label ===
            `Too healthy (${unitAt(controller, AT.healthyTarget).hp} HP)`,
      ),
    ).toBe(true);
    choice.click();
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "MIND_CONTROL",
      unitId: brain.id,
      targetUnitId: weak.id,
    });
    // The controlled unit stays itself where it stood.
    selectUnitAt(controller, host, AT.weakTarget);
    expect(requiredElement(".v7-selection-dock h2").textContent).toBe(
      "Marksman",
    );
    // The Brain now recovers: its button is disabled with the reason.
    selectUnitAt(controller, host, AT.brain);
    const view = required(controller.snapshot().view);
    const cooldown = required(
      view.mindControlCooldowns.find((entry) => entry.unitId === brain.id),
    ).turnsRemaining;
    expect(chipText("mind-control-cooldown")).toBe(
      `Recovering: ${mindControlReadyInV7(cooldown)} turns`,
    );
    app.destroy();
  });

  it("pulls a unit with the Tractor Beam from its board target", async () => {
    const controller = new FixtureController(martianUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const mothership = selectUnitAt(controller, host, AT.mothership);
    const raider = unitAt(controller, AT.pullTarget);
    requiredButton("martian-tractor-beam").click();
    const target = required(
      boardPlan(host).targets.find(
        (candidate) =>
          candidate.at.x === AT.pullTarget.x &&
          candidate.at.y === AT.pullTarget.y,
      ),
    );
    const preview = required(
      previewTractorBeamV7(
        required(controller.snapshot().view),
        mothership.id,
        raider.id,
      ),
    );
    expect(target.pullTo).toEqual(preview.to);
    host.callbacks?.onCommand(target);
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "TRACTOR_BEAM",
      unitId: mothership.id,
      targetUnitId: raider.id,
    });
    expect(unitAt(controller, preview.to).id).toBe(raider.id);
    app.destroy();
  });

  // `pulp_wars-1wy.3`: Beam Down no longer needs an unmoved Saucer.
  it("a moved Saucer still offers Beam Down", async () => {
    const controller = new FixtureController(martianUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const saucer = unitAt(controller, AT.saucer);
    const move = required(
      controller
        .snapshot()
        .offeredCommands.find(
          (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
            command.kind === "MOVE" &&
            command.unitId === saucer.id &&
            command.path.length === 1,
        ),
    );
    await controller.dispatch(move);
    host.callbacks?.onSelection({ kind: "UNIT", unitId: saucer.id });
    const beam = requiredButton("martian-beam-down");
    expect(beam.getAttribute("aria-disabled")).toBeNull();
    expect(beam.getAttribute("aria-label")).toBe(
      `${BEAM_DOWN_LABEL_V7}. ${BEAM_DOWN_TOOLTIP_V7}`,
    );
    app.destroy();
  });
});

// The balance round's UI (bead `pulp_wars-1wy.5`, ruleset `7r37`).
describe("Martian mobility UI", () => {
  const MOB = MARTIAN_MOBILITY_V7;
  /** No player-facing text places anything by "x, y". */
  const COORDINATE = /\(?\b\d{1,2}\s*,\s*\d{1,2}\b\)?/;

  it("gives each puller its own Tractor Beam button: the Saucer's, and the Mothership's free one", () => {
    const controller = new FixtureController(martianMobilityFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    selectUnitAt(controller, host, MOB.carrier);
    const light = requiredButton("martian-tractor-beam");
    expect(light.title).toBe(tractorBeamTooltipV7(false));
    expect(light.dataset.free).toBeUndefined();
    expect(light.querySelector(".v7-action-tag")).toBeNull();
    selectUnitAt(controller, host, MOB.mothership);
    const heavy = requiredButton("martian-tractor-beam");
    expect(heavy.title).toBe(tractorBeamTooltipV7(true));
    expect(heavy.getAttribute("aria-label")).toContain("Free once a turn");
    expect(heavy.dataset.free).toBe("true");
    expect(heavy.querySelector(".v7-action-tag")?.textContent).toBe(
      TRACTOR_FREE_TAG_V7,
    );
    // Unit information describes the unit's own beam.
    requiredButton("unit-help").click();
    expect(
      [...document.querySelectorAll(".v7-unit-ability")].some(
        (entry) =>
          entry.querySelector("span")?.textContent ===
          tractorBeamTooltipV7(true),
      ),
    ).toBe(true);
    app.destroy();
  });

  it("picks the Beam Down passenger first, by portrait, with the caveat as two chips", async () => {
    const controller = new FixtureController(martianMobilityFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const carrier = selectUnitAt(controller, host, MOB.carrier);
    const pickUp = unitAt(controller, MOB.pickUp);
    const cityGrunt = unitAt(controller, MOB.cityGrunt);
    requiredButton("martian-beam-down").click();
    const panel = requiredElement<HTMLElement>("[data-v7-martian-pick]");
    // One portrait button per passenger: HP as text, the rest in its name.
    const near = requiredButton(`beam-passenger-${pickUp.id}`);
    const far = requiredButton(`beam-passenger-${cityGrunt.id}`);
    expect(near.classList.contains("v7-beam-passenger")).toBe(true);
    expect(near.dataset.beamSource).toBe("pick-up");
    expect(far.dataset.beamSource).toBe("city");
    expect(near.textContent).toBe(`${pickUp.hp}/${pickUp.maxHp}`);
    expect(near.getAttribute("aria-label")).toBe(
      `Beam ${label("FIGHTER")}, ${pickUp.hp} of ${pickUp.maxHp} HP, picked up nearby`,
    );
    expect(far.getAttribute("aria-label")).toContain("from your city");
    // The caveat is two icon chips, not a sentence.
    const hint = requiredElement<HTMLElement>(".v7-beam-hint");
    expect(hint.getAttribute("aria-label")).toBe(BEAMED_HINT_V7);
    expect(
      [...hint.querySelectorAll<HTMLElement>(".v7-beam-hint-chip")].map(
        (chip) => [chip.dataset.beamHint, chip.textContent],
      ),
    ).toEqual([
      ["attack", BEAMED_CAN_ATTACK_V7],
      ["no-move", BEAMED_NO_MOVE_V7],
    ]);
    expect(panel.querySelector("p.v7-martian-detail")).toBeNull();
    // The board badges the same units and tints the pick-up range.
    const stageOne = boardPlan(host);
    expect(stageOne.targets.map((target) => target.previewLabel)).toEqual(
      stageOne.targets.map(() => BEAM_BADGE_V7),
    );
    expect(
      stageOne.entries.some((entry) => entry.abilityStyle === "BEAM_RANGE"),
    ).toBe(true);
    // Nothing in the panel or on the board names a tile.
    const said = [
      panel.textContent,
      ...[...panel.querySelectorAll("[aria-label], [title]")].flatMap(
        (node) => [
          node.getAttribute("aria-label") ?? "",
          node.getAttribute("title") ?? "",
        ],
      ),
      ...stageOne.targets.map((target) => target.semanticLabel ?? ""),
    ];
    for (const text of said) expect(text).not.toMatch(COORDINATE);
    // Tap the passenger on the board, then a tile.
    host.callbacks?.onCommand(
      required(
        stageOne.targets.find(
          (target) =>
            target.at.x === MOB.cityGrunt.x && target.at.y === MOB.cityGrunt.y,
        ),
      ),
    );
    await waitUntil(
      () =>
        host.lastModel?.interaction.martianPick?.kind === "BEAM_DOWN" &&
        host.lastModel.interaction.martianPick.passengerUnitId === cityGrunt.id,
    );
    expect(requiredElement(".v7-beam-hint").getAttribute("aria-label")).toBe(
      BEAMED_HINT_V7,
    );
    host.callbacks?.onCommand(
      required(
        boardPlan(host).targets.find(
          (target) =>
            target.at.x === MOB.lightPullTo.x &&
            target.at.y === MOB.lightPullTo.y,
        ),
      ),
    );
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "BEAM_DOWN",
      unitId: carrier.id,
      passengerUnitId: cityGrunt.id,
      to: MOB.lightPullTo,
    });
    // The beamed Grunt: a "Beamed" chip, an attack on the Fighter beside
    // it, and no Move.
    selectUnitAt(controller, host, MOB.lightPullTo);
    expect(chipText("beamed")).toBe(BEAMED_CHIP_V7);
    const families = boardPlan(host).targets.map((target) => target.family);
    expect(families).toContain("ATTACK");
    expect(families).not.toContain("MOVE");
    // The carrier used its action: both buttons say so.
    selectUnitAt(controller, host, MOB.carrier);
    for (const action of ["martian-beam-down", "martian-tractor-beam"]) {
      const used = requiredButton(action);
      expect(used.getAttribute("aria-disabled")).toBe("true");
      expect(used.dataset.disabledReason).toBe(MARTIAN_ACTED_V7);
    }
    app.destroy();
  });

  it("keeps a Mothership's free pull apart from its action, and marks it spent", async () => {
    const controller = new FixtureController(martianMobilityFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const mothership = selectUnitAt(controller, host, MOB.mothership);
    const raider = unitAt(controller, MOB.heavyTarget);
    requiredButton("martian-tractor-beam").click();
    const target = required(
      boardPlan(host).targets.find(
        (candidate) =>
          candidate.at.x === MOB.heavyTarget.x &&
          candidate.at.y === MOB.heavyTarget.y,
      ),
    );
    expect(target.pullPath).toEqual(MOB.heavyPath);
    host.callbacks?.onCommand(target);
    await waitUntil(() => controller.accepted.length === 1);
    expect(unitAt(controller, MOB.heavyPath[1]).id).toBe(raider.id);
    host.callbacks?.onSelection({ kind: "UNIT", unitId: mothership.id });
    expect(chipText("tractor-used")).toBe(TRACTOR_USED_CHIP_V7);
    const spent = requiredButton("martian-tractor-beam");
    expect(spent.getAttribute("aria-disabled")).toBe("true");
    expect(spent.dataset.disabledReason).toBe(TRACTOR_USED_V7);
    // Its action is still its own: the Raider beside it can be attacked.
    expect(boardPlan(host).targets.map((item) => item.family)).toContain(
      "ATTACK",
    );
    app.destroy();
  });

  it("names a Frozen carrier that moved on its own buttons, without a second Act button", () => {
    const controller = new FixtureController(martianFrozenFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    for (const at of [MARTIAN_FROZEN_V7.saucer, MARTIAN_FROZEN_V7.mothership]) {
      selectUnitAt(controller, host, at);
      for (const action of ["martian-beam-down", "martian-tractor-beam"]) {
        const frozen = requiredButton(action);
        expect(frozen.getAttribute("aria-disabled")).toBe("true");
        expect(frozen.dataset.disabledReason).toBe(MARTIAN_FROZEN_MOVED_V7);
      }
      expect(document.querySelector('[data-action="ice-folk-frozen"]')).toBe(
        null,
      );
    }
    app.destroy();
  });
});

describe("Martian Help and technology", () => {
  it("lists the Martian rules for every viewer of a match with a Martian seat", () => {
    const rules = () =>
      [...document.querySelectorAll(".v7-help-martian li")].map(
        (item) => item.textContent,
      );
    const app = mount(
      new FixtureController(martianUiFixtureV7()),
      new RecordingBoardHost(),
    );
    requiredButton("compact-menu").click();
    requiredButton("help").click();
    expect(rules()).toEqual(
      MARTIAN_HELP_RULES_V7.map(([name, sentence]) => `${name}: ${sentence}`),
    );
    // A Saucer has no Escape, so a Martian viewer is not told of it.
    expect(
      [...document.querySelectorAll(".v7-help-tips li")].some(
        (item) =>
          item.textContent ===
          "A Raider that survives an attack may move again (Escape).",
      ),
    ).toBe(false);
    app.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    const goblin = mount(
      new FixtureController(goblinShowcaseFixtureV7()),
      new RecordingBoardHost(),
    );
    requiredButton("compact-menu").click();
    requiredButton("help").click();
    expect(document.querySelector(".v7-help-martian")).toBe(null);
    goblin.destroy();
  });

  it("names Force Fields, the Disintegrator and the Martian units in the technology tree", () => {
    const app = mount(
      new FixtureController(martianUiFixtureV7()),
      new RecordingBoardHost(),
    );
    requiredButton("tech").click();
    const unlocks = (tech: string): (string | null)[] => {
      requiredButton(`tech-${tech}`).click();
      return [...document.querySelectorAll(".v7-tech-unlocks li")].map(
        (item) => item.textContent,
      );
    };
    expect(
      requiredButton("tech-fortification").querySelector(".v7-tech-name")
        ?.textContent,
    ).toBe("Force Fields");
    expect(unlocks("fortification")).toEqual([FORCE_FIELDS_UNLOCK_TEXT_V7]);
    expect(
      requiredButton("tech-explosives").querySelector(".v7-tech-name")
        ?.textContent,
    ).toBe("Disintegrator");
    expect(unlocks("explosives")).toEqual(
      expect.arrayContaining([DISINTEGRATOR_UNLOCK_TEXT_V7]),
    );
    expect(unlocks("sawmilling")).toContain(
      martianRoleUnlockTextV7("CATAPULT"),
    );
    expect(unlocks("scouting")).toContain(martianRoleUnlockTextV7("RAIDER"));
    // The recruit help of a Mothership names its Shield and slots.
    const knight = recruitmentRolePresentationV7("KNIGHT", "MARTIAN");
    expect(knight.label).toBe(label("KNIGHT"));
    expect(knight.restrictions).toContain(
      `Shield ${roleMechanicsV7("KNIGHT", "MARTIAN").shield}: takes damage before HP and recharges at the start of your turn.`,
    );
    app.destroy();
  });
});

function chipText(status: string): string | null {
  return (
    document.querySelector(
      `.v7-selection-dock .v7-identity [data-unit-status="${status}"]`,
    )?.textContent ?? null
  );
}

function actionLabels(): (string | null)[] {
  return [
    ...document.querySelectorAll(".v7-selection-dock .v7-action-label"),
  ].map((node) => node.textContent);
}

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
    throw new Error("Required Martian DOM fixture value missing");
  return value;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}
