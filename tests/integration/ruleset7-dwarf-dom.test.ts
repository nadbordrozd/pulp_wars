// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  applyCommandV7,
  effectiveRoleRuleV7,
  previewAssembleV7,
  previewTunnelV7,
  projectEventsV7,
  queryPlayerCommandsV7,
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
import { targetHighlightStyleV7 } from "../../src/render/canvas/target-highlight-v7";
import {
  Ruleset7DomAppView,
  recruitmentRolePresentationV7,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import {
  BLASTING_CHARGES_UNLOCK_TEXT_V7,
  CLOCKWORK_INFO_V7,
  CLOCKWORK_RECOVER_V7,
  DIG_IN_UNLOCK_TEXT_V7,
  DUG_IN_INFO_V7,
  DWARF_FIELD_DEFENSE_EXPLANATION_V7,
  DWARF_HELP_RULES_V7,
  NOT_DUG_IN_MOVED_V7,
  REPAIR_CHIP_V7,
  REPAIR_TOOLTIP_V7,
  TUNNEL_CONFIRM_INFO_V7,
  TUNNEL_PASSENGER_V7,
  TUNNEL_PICK_INFO_V7,
  TUNNEL_PICK_V7,
  assembleCostLineV7,
  assembleSummaryV7,
  burrowedInfoTextV7,
  dwarfCityNameV7,
  dwarfRoleUnlockTextV7,
  passengerAccessibleNameV7,
  tunnelDestinationNameV7,
} from "../../src/render/dwarf-presentation-v7";
import { tunnelDestinationsV7 } from "../../src/render/dwarf-tunnel-v7";
import {
  DWARF_DIG_IN_V7,
  DWARF_UI_V7,
  DWARF_VICTIM_V7,
  dwarfDigInFixtureV7,
  dwarfUiFieldV7,
  dwarfUiFixtureV7,
  dwarfVictimFixtureV7,
} from "../fixtures/v7-dwarf-ui";
import { martianUiFixtureV7 } from "../fixtures/v7-martian-ui";

// Every Dwarf text and number expected below is read from the registry,
// the engine constants or a public preview of the same view: the balance
// bead (`pulp_wars-78i.7`) may retune the faction.
const AT = DWARF_UI_V7;
const label = (role: Parameters<typeof effectiveRoleRuleV7>[0]): string =>
  effectiveRoleRuleV7(role, "DWARF").label;
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const live = (): string =>
  document.querySelector("#v7-live")?.textContent ?? "";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Dwarf setup", () => {
  it("offers Dwarf for every seat and launches the chosen factions", async () => {
    const chosen = new SetupController();
    const app = mount(chosen, new RecordingBoardHost());
    const count = requiredElement<HTMLSelectElement>("#v7-ai-count");
    count.value = "3";
    count.dispatchEvent(new Event("change", { bubbles: true }));
    for (const seat of [0, 1, 2, 3]) {
      const field = requiredElement<HTMLSelectElement>(`#v7-faction-${seat}`);
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
    }
    // An opponent's Dwarf option is disabled while the human plays Dwarf.
    const human = requiredElement<HTMLSelectElement>("#v7-faction-0");
    human.value = "DWARF";
    human.dispatchEvent(new Event("change", { bubbles: true }));
    const opponent = requiredElement<HTMLSelectElement>("#v7-faction-2");
    expect(
      [...opponent.options].find((option) => option.value === "DWARF")
        ?.disabled,
    ).toBe(true);
    requiredButton("launch").click();
    await waitUntil(() => chosen.launched.length === 1);
    expect(chosen.launched[0]?.factions).toEqual([
      "DWARF",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
    ]);
    app.destroy();
  });
});

describe("Dwarf unit dock", () => {
  it("shows Dug in, Not dug in, Clockwork and the Gunner's shots", () => {
    const controller = new FixtureController(dwarfUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    selectUnitAt(controller, host, AT.dugInHammerer);
    expect(chipText("dug-in")).toBe("Dug in");
    expect(chipTitle("dug-in")).toBe(DUG_IN_INFO_V7);
    // Fortify is explained: Dwarves dig in instead.
    const fortify = requiredButton("dwarf-field-defense");
    expect(fortify.getAttribute("aria-disabled")).toBe("true");
    expect(fortify.title).toBe(DWARF_FIELD_DEFENSE_EXPLANATION_V7);
    selectUnitAt(controller, host, AT.movedHammerer);
    expect(chipTitle("not-dug-in")).toBe(NOT_DUG_IN_MOVED_V7);
    selectUnitAt(controller, host, AT.gunner);
    expect(chipTitle("clockwork")).toBe(CLOCKWORK_INFO_V7);
    expect(chipText("shots")).toBe("2 shots if it stands still");
    // The wounded Gunner's Recover is absent, with the reason.
    const recover = requiredButton("clockwork-recover");
    expect(recover.getAttribute("aria-disabled")).toBe("true");
    expect(recover.title).toBe(CLOCKWORK_RECOVER_V7);
    selectUnitAt(controller, host, AT.woundedTank);
    expect(chipText("plated")).toMatch(/^Plated \d+$/);
    app.destroy();
  });

  it("describes a mound on its tile, for its owner and for an enemy, and outlines its ring", () => {
    const controller = new FixtureController(dwarfUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    host.callbacks?.onSelection({ kind: "TILE", at: AT.mound });
    const info = requiredElement<HTMLElement>(".v7-dwarf-mound");
    expect(info.dataset.dwarfMound).toBe("mole");
    expect(info.textContent).toContain(`${burrowedInfoTextV7("your")}.`);
    expect(info.textContent).toContain("Eruption:");
    // A mound has no actions and is information only.
    expect(
      document.querySelector('.v7-selection-dock [data-action^="dwarf-"]'),
    ).toBe(null);
    expect(
      boardPlan(host).entries.find(
        (entry) => entry.dwarfMound !== undefined && same(entry.at, AT.mound),
      )?.dwarfMound?.ring,
    ).toBe(true);
    app.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    const victim = new FixtureController(dwarfVictimFixtureV7());
    const victimHost = new RecordingBoardHost();
    const victimApp = mount(victim, victimHost);
    victimHost.callbacks?.onSelection({
      kind: "TILE",
      at: DWARF_VICTIM_V7.mound,
    });
    expect(
      requiredElement<HTMLElement>(".v7-dwarf-mound").textContent,
    ).toContain(`${burrowedInfoTextV7("Player 2's")}.`);
    victimApp.destroy();
  });
});

describe("Dwarf abilities through the dock and the board", () => {
  it("tunnels passenger first: the Hammerer seated, a short destination list, choose, move the landing, confirm", async () => {
    const controller = new FixtureController(dwarfUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const mole = selectUnitAt(controller, host, AT.mole);
    const rider = unitAt(controller, AT.rider);
    requiredButton("dwarf-tunnel").click();
    // The only Hammerer that can ride is seated at once.
    expect(host.lastModel?.interaction.dwarfPick).toEqual({
      kind: "TUNNEL",
      unitId: mole.id,
      to: null,
      riderUnitId: rider.id,
      riderTo: null,
    });
    // Bead pulp_wars-9im: who rides is shown (a portrait, not a button);
    // the Hammerers are seated on the board.
    expect(document.querySelector('[data-action^="tunnel-passenger-"]')).toBe(
      requiredButton("tunnel-passenger-none"),
    );
    const seated = requiredElement<HTMLElement>(
      `[data-tunnel-rider="${rider.id}"]`,
    );
    expect(seated.tagName).toBe("SPAN");
    expect(seated.getAttribute("aria-label")).toBe(
      passengerAccessibleNameV7(label("FIGHTER"), rider.hp, rider.maxHp, true),
    );
    expect(
      requiredButton("tunnel-passenger-none").getAttribute("aria-pressed"),
    ).toBe("false");
    // Bead pulp_wars-b5f.8: the dock is the ability's icon and name, its
    // "?", the passenger buttons and Cancel; no destination chips, no
    // sentences, no tile coordinates. Every destination is on the board,
    // named by what it would erupt on.
    const view = required(controller.snapshot().view);
    const destinations = tunnelDestinationsV7(
      controller.snapshot().offeredCommands,
      mole.id,
    );
    const panel = requiredElement<HTMLElement>("[data-v7-dwarf-pick]");
    expect(
      panel.querySelectorAll(
        ".v7-martian-choice-button, p:not(.v7-pick-title)",
      ),
    ).toHaveLength(0);
    expect(
      requiredElement("[data-v7-dwarf-pick] .v7-kaboom-summary").textContent,
    ).toBe("Tunnel");
    expect(panel.getAttribute("aria-label")).toBe(TUNNEL_PICK_V7);
    expect(requiredButton("pick-info").title).toBe(TUNNEL_PICK_INFO_V7);
    expect(panel.textContent).not.toMatch(/\d+, ?\d+/);
    expect(panel.textContent).not.toContain(TUNNEL_PASSENGER_V7);
    const alone = required(
      queryPlayerCommandsV7(view).find(
        (command): command is Extract<CommandV7, { kind: "TUNNEL" }> =>
          command.kind === "TUNNEL" &&
          same(command.to, AT.tunnelTo) &&
          command.rider === null,
      ),
    );
    const destinationName = tunnelDestinationNameV7(
      view,
      required(previewTunnelV7(view, alone)),
    );
    expect(destinationName).toMatch(/^Surface next to .+, erupts for \d+/);
    expect(
      boardPlan(host).targets.find((target) => same(target.at, AT.tunnelTo))
        ?.semanticLabel,
    ).toBe(destinationName);
    // Every destination is on the board; the Hammerer wears its badge.
    expect(
      boardPlan(host).targets.filter(
        (target) => target.family === "TUNNEL_DESTINATION",
      ),
    ).toHaveLength(destinations.length);
    const badge = required(
      boardPlan(host).targets.find((target) => same(target.at, AT.rider)),
    );
    expect(badge.family).toBe("TUNNEL_PASSENGER");
    expect(targetHighlightStyleV7(badge.family)).toBe("SUPPORT");
    // Unseat on the board, then seat again.
    host.callbacks?.onCommand(badge);
    await waitUntil(
      () =>
        requiredButton("tunnel-passenger-none").getAttribute("aria-pressed") ===
        "true",
    );
    expect(host.lastModel?.interaction.dwarfPick).toMatchObject({
      riderUnitId: null,
    });
    host.callbacks?.onCommand(
      required(
        boardPlan(host).targets.find((target) => same(target.at, AT.rider)),
      ),
    );
    await waitUntil(
      () =>
        document.querySelector(`[data-tunnel-rider="${rider.id}"]`) !== null,
    );
    // Choosing the destination on the board shows the whole tunnel; nothing
    // is sent yet.
    const destination = required(
      boardPlan(host).targets.find((target) => same(target.at, AT.tunnelTo)),
    );
    expect(destination.family).toBe("TUNNEL_DESTINATION");
    const landing = required(destination.tunnel?.landing ?? undefined);
    host.callbacks?.onCommand(destination);
    await waitUntil(
      () => document.querySelector("[data-action='tunnel-confirm']") !== null,
    );
    expect(controller.accepted).toHaveLength(0);
    // The chosen tunnel is on the board (the Hammerer's ghost on its
    // landing); the dock only confirms.
    expect(
      boardPlan(host).targets.find((target) => same(target.at, AT.tunnelTo))
        ?.tunnel?.landing,
    ).toEqual(landing);
    const chosen = requiredElement<HTMLElement>("[data-v7-dwarf-pick]");
    expect(chosen.getAttribute("aria-label")).toBe(
      `Tunnel: ${destinationName}`,
    );
    expect(chosen.textContent).not.toMatch(/\d+, ?\d+/);
    expect(requiredButton("pick-info").title).toBe(TUNNEL_CONFIRM_INFO_V7);
    expect(
      [...chosen.querySelectorAll("button")].map(
        (control) => control.dataset.action,
      ),
    ).toEqual([
      "pick-info",
      "tunnel-passenger-none",
      "tunnel-confirm",
      "dwarf-pick-back",
      "dwarf-pick-cancel",
    ]);
    expect(requiredButton("tunnel-confirm").textContent).toBe("Tunnel");
    expect(requiredButton("tunnel-confirm").getAttribute("aria-label")).toBe(
      `Tunnel. ${destinationName}`,
    );
    // Escape steps back to the destinations with the passenger still seated.
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(host.lastModel?.interaction.dwarfPick).toMatchObject({
      to: null,
      riderUnitId: rider.id,
    });
    host.callbacks?.onCommand(destination);
    await waitUntil(() =>
      boardPlan(host).targets.some(
        (target) => target.family === "TUNNEL_RIDER",
      ),
    );
    // A dot moves the Hammerer's landing.
    const dot = required(
      boardPlan(host).targets.find(
        (target) => target.family === "TUNNEL_RIDER",
      ),
    );
    expect(dot.semanticLabel).toBe(
      `The ${label("FIGHTER")} lands here instead`,
    );
    host.callbacks?.onCommand(dot);
    await waitUntil(() => {
      const pick = host.lastModel?.interaction.dwarfPick;
      return (
        pick?.kind === "TUNNEL" &&
        pick.riderTo !== null &&
        same(pick.riderTo, dot.at)
      );
    });
    expect(host.lastModel?.interaction.dwarfPick).toMatchObject({
      to: AT.tunnelTo,
      riderTo: dot.at,
    });
    // Choosing the destination again digs the whole tunnel.
    host.callbacks?.onCommand(
      required(
        boardPlan(host).targets.find((target) => same(target.at, AT.tunnelTo)),
      ),
    );
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "TUNNEL",
      unitId: mole.id,
      to: AT.tunnelTo,
      rider: { unitId: rider.id, to: dot.at },
    });
    await waitUntil(() =>
      live().includes("Your Steam Mole tunnelled (with a Hammerer)"),
    );
    expect(host.lastModel?.interaction.dwarfPick ?? null).toBe(null);
    expect(
      required(controller.snapshot().view).burrowed.map(
        (entry) => entry.unit.id,
      ),
    ).toEqual(expect.arrayContaining([mole.id, rider.id]));
    app.destroy();
  });

  it("re-seats among two Hammerers on the board and tunnels alone with None, confirmed by the dock's Tunnel", async () => {
    const controller = new FixtureController(dwarfDigInFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const mole = selectUnitAt(controller, host, DWARF_DIG_IN_V7.readyMole);
    const wounded = unitAt(controller, DWARF_DIG_IN_V7.readyHammerer);
    const healthy = unitAt(controller, DWARF_DIG_IN_V7.garrisoned);
    requiredButton("dwarf-tunnel").click();
    // The healthier Hammerer is seated first, though its ID is higher.
    expect(host.lastModel?.interaction.dwarfPick).toMatchObject({
      riderUnitId: healthy.id,
    });
    // Bead pulp_wars-9im: one "Alone" toggle and who rides, whatever the
    // number of Hammerers; both wear their badge on the board.
    expect(
      [...document.querySelectorAll<HTMLElement>(".v7-dwarf-passenger")].map(
        (control) =>
          control.dataset.action ?? `riding-${control.dataset.tunnelRider}`,
      ),
    ).toEqual([`riding-${healthy.id}`, "tunnel-passenger-none"]);
    expect(
      requiredElement<HTMLElement>(".v7-dwarf-passengers").dataset.riders,
    ).toBe("2");
    expect(
      boardPlan(host)
        .targets.filter((target) => target.family === "TUNNEL_PASSENGER")
        .map((target) => target.at),
    ).toEqual(expect.arrayContaining([wounded.at, healthy.at]));
    host.callbacks?.onCommand(
      required(
        boardPlan(host).targets.find(
          (target) =>
            target.family === "TUNNEL_PASSENGER" && same(target.at, wounded.at),
        ),
      ),
    );
    await waitUntil(
      () =>
        document.querySelector(`[data-tunnel-rider="${wounded.id}"]`) !== null,
    );
    expect(host.lastModel?.interaction.dwarfPick).toMatchObject({
      riderUnitId: wounded.id,
    });
    expect(
      boardPlan(host).entries.find(
        (entry) => entry.kind === "LINK" && same(entry.at, wounded.at),
      )?.linkTo,
    ).toEqual(mole.at);
    requiredButton("tunnel-passenger-none").click();
    expect(host.lastModel?.interaction.dwarfPick).toMatchObject({
      riderUnitId: null,
    });
    // "Alone" is the no-passenger button.
    expect(requiredButton("tunnel-passenger-none").textContent).toBe("Alone");
    // Choose a destination on the board, then confirm in the dock.
    const destination = required(
      boardPlan(host).targets.find(
        (target) => target.family === "TUNNEL_DESTINATION",
      ),
    );
    host.callbacks?.onCommand(destination);
    await waitUntil(
      () => document.querySelector('[data-action="tunnel-confirm"]') !== null,
    );
    expect(controller.accepted).toHaveLength(0);
    requiredButton("tunnel-confirm").click();
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "TUNNEL",
      unitId: mole.id,
      to: destination.at,
      rider: null,
    });
    app.destroy();
  });

  it("bombs: the target, then a landing with its threat", async () => {
    const controller = new FixtureController(dwarfUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const gyro = selectUnitAt(controller, host, AT.gyrocopter);
    const target = unitAt(controller, AT.bombTarget);
    requiredButton("dwarf-bomb-run").click();
    // Bead pulp_wars-9im: the target is picked on the board (an Attack
    // mark with its damage); the dock lists no targets.
    expect(document.querySelector('[data-action^="bomb-target-"]')).toBe(null);
    const bombTarget = required(
      boardPlan(host).targets.find(
        (candidate) =>
          candidate.family === "BOMB_TARGET" &&
          same(candidate.at, AT.bombTarget),
      ),
    );
    expect(targetHighlightStyleV7(bombTarget.family)).toBe("ATTACK");
    expect(bombTarget.semanticLabel).toMatch(/^Bomb the /);
    host.callbacks?.onCommand(bombTarget);
    await waitUntil(
      () =>
        host.lastModel?.interaction.dwarfPick?.kind === "BOMB_RUN" &&
        host.lastModel.interaction.dwarfPick.targetUnitId === target.id,
    );
    expect(host.lastModel?.interaction.dwarfPick).toEqual({
      kind: "BOMB_RUN",
      unitId: gyro.id,
      targetUnitId: target.id,
    });
    // Bead pulp_wars-b5f.8: the landings are chosen on the board only,
    // each named by its threat; the dock names no tile.
    expect(
      document.querySelector(
        '[data-v7-dwarf-pick] [data-action^="bomb-landing-"]',
      ),
    ).toBe(null);
    expect(
      requiredElement("[data-v7-dwarf-pick] .v7-kaboom-summary").textContent,
    ).toBe("Bomb Run");
    const landing = required(
      boardPlan(host).targets.find((target) => target.family === "BOMB_RUN"),
    );
    expect(landing.semanticLabel).toMatch(/^Land here\. Lands next to:/);
    host.callbacks?.onCommand(landing);
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toMatchObject({
      kind: "BOMB_RUN",
      unitId: gyro.id,
      targetUnitId: target.id,
    });
    await waitUntil(() =>
      live().includes(`Your ${label("RAIDER")} bombed a Marksman for`),
    );
    // The bombed unit shows the mark for the rest of the turn.
    selectUnitAt(controller, host, AT.bombTarget);
    expect(chipText("bombed")).toBe("Bombed this turn");
    app.destroy();
  });

  it("assembles a Gunner on a picked tile, and labels the Engineer's Repair", async () => {
    const controller = new FixtureController(dwarfUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const engineer = selectUnitAt(controller, host, AT.engineer);
    const repair = requiredButton("command-tend_wounded");
    expect(repair.textContent).toContain("Repair");
    expect(repair.textContent).toContain(REPAIR_CHIP_V7);
    expect(repair.title).toBe(REPAIR_TOOLTIP_V7);
    requiredButton("dwarf-assemble").click();
    const view = required(controller.snapshot().view);
    const preview = required(previewAssembleV7(view, engineer.id));
    // Bead pulp_wars-b5f.8: the ability's name and one cost line; the
    // tiles are chosen on the board only.
    expect(
      requiredElement("[data-v7-dwarf-pick] .v7-kaboom-summary").textContent,
    ).toBe("Assemble");
    expect(
      requiredElement("[data-v7-dwarf-pick] .v7-martian-detail").textContent,
    ).toBe(assembleCostLineV7(preview));
    expect(
      requiredElement("[data-v7-dwarf-pick]").getAttribute("aria-label"),
    ).toContain(
      assembleSummaryV7(preview, dwarfCityNameV7(view, preview.cityId)),
    );
    expect(document.querySelector('[data-action^="assemble-"]')).toBe(null);
    expect(boardPlan(host).targets.map((target) => target.at)).toEqual(
      preview.tiles,
    );
    const tile = required(preview.tiles[0]);
    host.callbacks?.onCommand(
      required(boardPlan(host).targets.find((target) => same(target.at, tile))),
    );
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "ASSEMBLE",
      unitId: engineer.id,
      to: tile,
    });
    await waitUntil(() =>
      live().includes("Your Engineer assembled a Clockwork Gunner"),
    );
    app.destroy();
  });

  it("names why an Engineer cannot Assemble, and a Mole that moved", () => {
    const controller = new FixtureController(
      dwarfUiFieldV7(
        [
          { seat: 0, role: "CAPTAIN", at: { x: 5, y: 3 } },
          {
            seat: 0,
            role: "GUARD",
            at: { x: 7, y: 3 },
            activation: { moved: true, movedPathLength: 1 },
          },
        ],
        { coins: 0 },
      ),
    );
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    selectUnitAt(controller, host, { x: 5, y: 3 });
    const assemble = requiredButton("dwarf-assemble");
    expect(assemble.getAttribute("aria-disabled")).toBe("true");
    // Homeless (the fixture homes no unit unless asked).
    expect(assemble.dataset.disabledReason).toBe("No home city");
    selectUnitAt(controller, host, { x: 7, y: 3 });
    expect(requiredButton("dwarf-tunnel").dataset.disabledReason).toBe(
      "It moved this turn",
    );
    app.destroy();
  });

  it("knocks a Guard back from the board", async () => {
    const controller = new FixtureController(dwarfUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    selectUnitAt(controller, host, AT.cannon);
    const target = unitAt(controller, AT.knockTarget);
    const attack = required(
      boardPlan(host).targets.find(
        (entry) =>
          entry.family === "ATTACK" &&
          entry.command.kind === "ATTACK" &&
          entry.command.targetUnitId === target.id,
      ),
    );
    // The note names no tile; the board's arrow shows where.
    expect(attack.previewNote).toContain("Knocks back");
    expect(attack.previewNote).not.toMatch(/\d+, ?\d+/);
    host.callbacks?.onCommand(attack);
    await waitUntil(() =>
      live().includes(`Your ${label("CATAPULT")} knocked back a Guard`),
    );
    expect(unitAt(controller, AT.knockTo).id).toBe(target.id);
    app.destroy();
  });
});

describe("Dwarf Help and technology", () => {
  it("lists the Dwarf rules for every viewer of a match with a Dwarf seat", () => {
    for (const fixture of [dwarfUiFixtureV7, dwarfVictimFixtureV7]) {
      document.body.innerHTML = '<div id="app"></div>';
      const controller = new FixtureController(fixture());
      const app = mount(controller, new RecordingBoardHost());
      requiredButton("compact-menu").click();
      requiredButton("help").click();
      expect(
        [...document.querySelectorAll(".v7-help-dwarf li")].map(
          (node) => node.textContent,
        ),
      ).toEqual(
        DWARF_HELP_RULES_V7.map(([name, sentence]) => `${name}: ${sentence}`),
      );
      app.destroy();
    }
    document.body.innerHTML = '<div id="app"></div>';
    const martian = new FixtureController(martianUiFixtureV7());
    const app = mount(martian, new RecordingBoardHost());
    requiredButton("compact-menu").click();
    requiredButton("help").click();
    expect(document.querySelector(".v7-help-dwarf")).toBe(null);
    app.destroy();
  });

  it("names Dig In, Blasting Charges and the Dwarf units in the technology tree", () => {
    const app = mount(
      new FixtureController(dwarfUiFixtureV7()),
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
    ).toBe("Dig In");
    expect(unlocks("fortification")).toEqual([DIG_IN_UNLOCK_TEXT_V7]);
    expect(
      requiredButton("tech-explosives").querySelector(".v7-tech-name")
        ?.textContent,
    ).toBe("Blasting Charges");
    expect(unlocks("explosives")).toEqual(
      expect.arrayContaining([BLASTING_CHARGES_UNLOCK_TEXT_V7]),
    );
    expect(unlocks("sawmilling")).toContain(dwarfRoleUnlockTextV7("CATAPULT"));
    expect(unlocks("drill")).toContain(dwarfRoleUnlockTextV7("GUARD"));
    app.destroy();
    const engineer = recruitmentRolePresentationV7("CAPTAIN", "DWARF");
    expect(engineer.label).toBe(label("CAPTAIN"));
    expect(engineer.abilities.some((line) => line.startsWith("Repair:"))).toBe(
      true,
    );
    expect(
      engineer.abilities.some((line) => line.startsWith("Assemble:")),
    ).toBe(true);
  });
});

function chipText(status: string): string | null {
  return (
    document.querySelector(
      `.v7-selection-dock .v7-identity [data-unit-status="${status}"]`,
    )?.textContent ?? null
  );
}

function chipTitle(status: string): string | null {
  return (
    document.querySelector<HTMLElement>(
      `.v7-selection-dock .v7-identity [data-unit-status="${status}"]`,
    )?.title ?? null
  );
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
    throw new Error("Required Dwarf DOM fixture value missing");
  return value;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}
