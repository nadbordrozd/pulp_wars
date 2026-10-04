// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  GOBLIN_ROLE_MECHANICS_V7,
  applyCommandV7,
  createPlayableGameV7,
  missionByIdV7,
  missionMatchSetupV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
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
import {
  Ruleset7DomAppView,
  recruitmentRolePresentationV7,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import {
  GOBLIN_ATTACK_CHAIN_V7,
  GOBLIN_SHOWCASE_V7,
  goblinAttackChainFixtureV7,
  goblinShowcaseFixtureV7,
} from "../fixtures/v7-goblin-ui";
import { goblinArenaV7 } from "../fixtures/v7-goblin-arena";

const AT = GOBLIN_SHOWCASE_V7;
// Blast damages from the Goblin registry (tuned by `pulp_wars-0ao.7`), so
// the expected text follows future tuning.
const KABOOM = GOBLIN_ROLE_MECHANICS_V7.FIGHTER.kaboomDamage ?? 0;
const CHUCKER_KABOOM = GOBLIN_ROLE_MECHANICS_V7.MARKSMAN.kaboomDamage ?? 0;
const CHUCKER_BLAST = GOBLIN_ROLE_MECHANICS_V7.MARKSMAN.deathBlastDamage ?? 0;
const CART_BLAST = GOBLIN_ROLE_MECHANICS_V7.CATAPULT.deathBlastDamage ?? 0;
const kaboomText = (damage: number) =>
  `Blow up: ${damage} damage to every other unit in the 3×3 square, yours too. This unit dies.`;
const CART_CHAIN = `Chain reaction: your Rocket Cart explodes (${CART_BLAST} damage)`;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("Revision 17 Goblin DOM", () => {
  it("offers Goblin for every seat and launches the chosen factions", async () => {
    const chosen = new SetupController();
    const app = mount(chosen, new RecordingBoardHost());
    const count = requiredElement<HTMLSelectElement>("#v7-ai-count");
    count.value = "2";
    count.dispatchEvent(new Event("change", { bubbles: true }));
    expect(labelsIn("[data-v7-factions]")).toEqual([
      "Your faction",
      "Player 2 faction",
      "Player 3 faction",
    ]);
    for (const seat of [0, 1, 2]) {
      const field = requiredElement<HTMLSelectElement>(`#v7-faction-${seat}`);
      // The Martian UI (pulp_wars-t6s.4) adds the fifth faction, the Ice Folk
      // UI (pulp_wars-7g3.6) the sixth, the Dwarf UI (pulp_wars-78i.6) the
      // seventh.
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
    for (const [seat, faction] of [
      [0, "GOBLIN"],
      [2, "UNDEAD"],
    ] as const) {
      const field = requiredElement<HTMLSelectElement>(`#v7-faction-${seat}`);
      field.value = faction;
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
    requiredButton("launch").click();
    await waitUntil(() => chosen.launched.length === 1);
    // Seat 0 takes Goblin from seat 2, which moves to the first untaken
    // faction (Human); seat 2 cannot then take Undead from seat 1.
    expect(chosen.launched[0]?.factions).toEqual([
      "GOBLIN",
      "UNDEAD",
      "ORIGINAL",
    ]);
    app.destroy();
  });

  it("previews, arms, confirms and logs a Kaboom!", async () => {
    const controller = new FixtureController(goblinShowcaseFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const kaboomUnit = selectUnitAt(controller, host, AT.kaboom);
    const dock = requiredElement<HTMLElement>(".v7-selection-dock");
    expect(dock.querySelector("h2")?.textContent).toBe("Goblin");
    expect(
      dock.querySelector('.v7-faction-chip[data-faction="goblin"]')
        ?.textContent,
    ).toBe("Goblin");
    // LEGACY art: the Human sprite carries the Goblin badge.
    expect(dock.querySelector(".v7-identity-art .v7-goblin-badge")).not.toBe(
      null,
    );
    expect(actionLabels()).toEqual(["Kaboom!", "Disband", "Wait"]);
    const kaboom = requiredButton("command-kaboom");
    expect(kaboom.title).toBe(kaboomText(KABOOM));
    expect(kaboom.getAttribute("aria-label")).toBe(
      `Kaboom! · ${kaboomText(KABOOM)} · Hits 5 units: 3 enemy, 2 yours. Kills 2. ${CART_CHAIN}. Friendly fire: 2 of your units hit, 1 killed. Plunder: +1 Coins.`,
    );
    expect(
      [...kaboom.querySelectorAll(".v7-kaboom-chip")].map(
        (chip) => chip.textContent,
      ),
    ).toEqual(["5 hit · 2 ✕", "2 yours hit"]);
    expect(host.lastModel?.interaction.kaboomPreviewUnitId).toBeUndefined();
    // The icon is a cartoon bomb (pulp_wars-0ao.17): a fuse cap and a solid
    // black ball with only a hairline grey edge (never a ring in the button's
    // colour), a glint, a fuse rising straight up from the top (cream over a
    // dark under-stroke) and a pale spark at its tip.
    const bomb = required(kaboom.querySelector('svg[data-icon="bomb"]'));
    expect(
      [...bomb.querySelectorAll("path")].map((path) => [
        path.getAttribute("fill"),
        path.getAttribute("stroke"),
      ]),
    ).toEqual([
      ["#18191d", "#5d616c"],
      ["#18191d", "#5d616c"],
      ["#8d929e", "none"],
      ["none", "#18191d"],
      ["none", "currentColor"],
      ["#fff8d0", "#18191d"],
    ]);
    // The fuse leaves the top of the ball vertically: no diagonal stroke.
    const fuse = [...bomb.querySelectorAll("path")][4];
    expect(fuse?.getAttribute("d")).toMatch(/^M12 6\.8c0-/);

    // Hover and focus preview the blast on the board without arming it.
    kaboom.dispatchEvent(new Event("pointerenter"));
    expect(host.lastModel?.interaction.kaboomPreviewUnitId).toBe(kaboomUnit.id);
    kaboom.dispatchEvent(new Event("pointerleave"));
    expect(host.lastModel?.interaction.kaboomPreviewUnitId).toBeUndefined();
    kaboom.dispatchEvent(new Event("focus"));
    expect(host.lastModel?.interaction.kaboomPreviewUnitId).toBe(kaboomUnit.id);
    kaboom.dispatchEvent(new Event("blur"));

    // Activating arms it: nothing is dispatched until Confirm.
    kaboom.click();
    expect(controller.accepted).toEqual([]);
    expect(host.lastModel?.interaction.kaboomPreviewUnitId).toBe(kaboomUnit.id);
    const panel = requiredElement<HTMLElement>('[data-v7-kaboom="armed"]');
    expect(panel.querySelector(".v7-kaboom-summary")?.textContent).toBe(
      "Hits 5 units: 3 enemy, 2 yours. Kills 2.",
    );
    expect(
      [...panel.querySelectorAll("[data-kaboom-line]")].map((line) => [
        (line as HTMLElement).dataset.kaboomLine,
        line.textContent,
      ]),
    ).toEqual([
      ["friendly-fire", "Friendly fire: 2 of your units hit, 1 killed"],
      ["chain", CART_CHAIN],
      ["plunder", "Plunder: +1 Coins"],
    ]);
    expect(requiredButton("command-kaboom").getAttribute("aria-pressed")).toBe(
      "true",
    );

    // Cancel (and Escape) disarm.
    requiredButton("cancel-kaboom").click();
    expect(document.querySelector('[data-v7-kaboom="armed"]')).toBe(null);
    requiredButton("command-kaboom").click();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(document.querySelector('[data-v7-kaboom="armed"]')).toBe(null);
    expect(requiredElement(".v7-selection-dock h2").textContent).toBe("Goblin");

    requiredButton("command-kaboom").click();
    const confirm = requiredButton("confirm-kaboom");
    expect(confirm.getAttribute("aria-label")).toContain(
      "Confirm Kaboom!: this unit dies. Hits 5 units",
    );
    confirm.click();
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "KABOOM",
      unitId: kaboomUnit.id,
    });
    await waitUntil(
      () =>
        document.querySelector("#v7-live")?.textContent ===
        "Your Goblin blew up: 4 hit, 2 killed · Your Rocket Cart exploded: 1 hit, 0 killed · Plunder: +1 Coins",
    );
    expect(document.querySelector(".v7-toast")?.textContent).toContain(
      "Your Goblin blew up",
    );
    expect(host.lastModel?.interaction.kaboomPreviewUnitId).toBeUndefined();
    app.destroy();
  });

  it("labels Goblin commands, unit info, Ram and the Field Defense restriction", () => {
    const controller = new FixtureController(goblinShowcaseFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);

    selectUnitAt(controller, host, AT.warboss);
    expect(actionLabels()).toEqual(["WAAAGH!", "Disband", "Wait"]);
    requiredButton("unit-help").click();
    expect(requiredElement(".v7-unit-help-dialog").textContent ?? "").toContain(
      "WAAAGH!Every other unit of yours on land within 2 tiles gets +1 Attack on its next attack this turn.",
    );
    requiredButton("close-unit-help").click();

    selectUnitAt(controller, host, AT.bombChucker);
    requiredButton("unit-help").click();
    expect(
      [
        ...document.querySelectorAll<HTMLElement>(
          ".v7-unit-help-dialog [data-goblin-info]",
        ),
      ].map((entry) => entry.textContent),
    ).toEqual([
      `Kaboom ${CHUCKER_KABOOM}${kaboomText(CHUCKER_KABOOM)}`,
      `Explodes on death (${CHUCKER_BLAST})However it dies, it deals ${CHUCKER_BLAST} damage to every other unit in the 3×3 square, yours too.`,
      "BombsIts bomb also hits every unit next to the target, yours included.",
      "Gang Up+1 Attack per ally next to the target (max +2)",
    ]);
    requiredButton("close-unit-help").click();

    selectUnitAt(controller, host, AT.troll);
    requiredButton("unit-help").click();
    expect(requiredElement(".v7-unit-help-dialog").textContent ?? "").toContain(
      "Regenerates 4 HP each turn",
    );
    requiredButton("close-unit-help").click();
    app.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    const fortify = new FixtureController(
      goblinArenaV7(
        ["GOBLIN", "ORIGINAL"],
        [
          { seat: 0, role: "FIGHTER", at: { x: 8, y: 9 } },
          {
            seat: 0,
            role: "KNIGHT",
            at: { x: 4, y: 3 },
            activation: { overrunActive: true, attacked: true, attacksUsed: 1 },
          },
        ],
      ),
    );
    const fortifyHost = new RecordingBoardHost();
    const fortifyApp = mount(fortify, fortifyHost);
    selectUnitAt(fortify, fortifyHost, { x: 8, y: 9 });
    const blocked = requiredButton("goblin-field-defense");
    expect(blocked.getAttribute("aria-disabled")).toBe("true");
    expect(blocked.getAttribute("aria-label")).toBe(
      "Fortify unavailable. Goblins cannot build Field Defense; use an Orc Brute",
    );
    blocked.click();
    expect(fortify.accepted).toEqual([]);
    selectUnitAt(fortify, fortifyHost, { x: 4, y: 3 });
    expect(
      document.querySelector('[data-unit-status="ram"]')?.textContent,
    ).toBe("Ram");
    requiredButton("unit-help").click();
    expect(
      document.querySelector('[data-tactical-state="overrun"]')?.textContent,
    ).toBe("Ram: attack again");
    fortifyApp.destroy();
  });

  it("shows a mission's forbidden technologies as unavailable in this mission", () => {
    // docs/product/CAMPAIGN.md section 2.3: the hidden fixture mission
    // TEST_GROUNDS forbids the Naval branch; a Goblin leads seat 0.
    const setup = required(
      missionMatchSetupV7(required(missionByIdV7("TEST_GROUNDS")), "GOBLIN"),
    );
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const controller = new FixtureController(created.state);
    const app = mount(controller, new RecordingBoardHost());
    requiredButton("tech").click();
    const shorecraft = requiredButton("tech-shorecraft");
    expect(shorecraft.getAttribute("aria-disabled")).toBe("true");
    expect(shorecraft.getAttribute("aria-label")).toBe(
      "Shorecraft, unavailable in this mission",
    );
    expect(requiredButton("tech-navigation").getAttribute("aria-label")).toBe(
      "Navigation, unavailable in this mission",
    );
    shorecraft.click();
    const detail = requiredElement<HTMLElement>(".v7-tech-detail");
    expect(detail.dataset.techState).toBe("disabled");
    expect(detail.textContent).toContain("Unavailable in this mission");
    expect(detail.textContent).not.toContain("Dry Land");
    expect(detail.querySelector('[data-action="research-shorecraft"]')).toBe(
      null,
    );
    app.destroy();
  });

  it("shows Warrens, Plunder, Goblin Help and Goblin training", () => {
    const controller = new FixtureController(goblinShowcaseFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const view = required(controller.snapshot().view);
    const capital = required(
      view.cities.find(
        (city) => city.ownerId === view.viewer.id && city.isCapital,
      ),
    );
    host.callbacks?.onSelection({ kind: "CITY", cityId: capital.id });
    const warrens = requiredElement<HTMLElement>('[data-capacity="warrens"]');
    expect(warrens.textContent).toBe("+1 Warrens");
    expect(requiredElement<HTMLElement>('[data-stat="units"]').title).toBe(
      "Units supported by this city (includes +1 Warrens)",
    );

    requiredButton("tech").click();
    const plunder = requiredButton("tech-commerce");
    expect(plunder.querySelector(".v7-tech-name")?.textContent).toBe("Plunder");
    plunder.click();
    const detail = requiredElement<HTMLElement>(".v7-tech-detail");
    expect(detail.getAttribute("aria-label")).toBe("Plunder details");
    expect(detail.textContent).toContain(
      "for each enemy unit your units or blasts kill",
    );
    expect(detail.textContent).not.toContain("Connected cities earn trade");
    requiredButton("tech-chivalry").click();
    expect(
      requiredElement<HTMLElement>(".v7-tech-detail").textContent,
    ).toContain("Ram: Scrap Buggies advance after a kill and may attack again");
    requiredButton("close-overlay").click();

    requiredButton("compact-menu").click();
    requiredButton("help").click();
    const help = requiredElement<HTMLElement>(".v7-help-goblin");
    expect(help.querySelectorAll("li")).toHaveLength(10);
    expect(help.textContent).toContain(
      "Kaboom: any goblin-crewed unit can blow itself up, dealing its blast damage to every other unit in the 3×3 square around it, yours included.",
    );
    expect(
      requiredElement<HTMLElement>(".v7-help-tips").textContent,
    ).not.toContain("(Escape)");
    requiredButton("close-overlay").click();
    requiredButton("compact-menu").click();
    requiredButton("leaderboard").click();
    expect(
      [...document.querySelectorAll(".v7-faction-chip")].map(
        (chip) => chip.textContent,
      ),
    ).toEqual(expect.arrayContaining(["Goblin", "Human"]));
    app.destroy();

    // Training shows Goblin names, and LEGACY Human art carries the badge.
    document.body.innerHTML = '<div id="app"></div>';
    const trainer = new FixtureController(
      goblinArenaV7(
        ["GOBLIN", "ORIGINAL"],
        [{ seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } }],
      ),
    );
    const trainerHost = new RecordingBoardHost();
    const trainerApp = mount(trainer, trainerHost);
    const trainerView = required(trainer.snapshot().view);
    const home = required(
      trainerView.cities.find(
        (city) => city.ownerId === trainerView.viewer.id && city.isCapital,
      ),
    );
    trainerHost.callbacks?.onSelection({ kind: "CITY", cityId: home.id });
    const goblin = requiredButton("command-train");
    expect(goblin.getAttribute("aria-label")).toBe("Train Goblin for 1 Coins");
    expect(goblin.querySelector(".v7-goblin-badge")).not.toBe(null);
    expect(actionLabels()).toContain("Bomb Chucker");
    trainerApp.destroy();

    const recruit = recruitmentRolePresentationV7("FIGHTER", "GOBLIN");
    expect(recruit.label).toBe("Goblin");
    expect(recruit.restrictions).toContain(
      `Kaboom ${KABOOM}: ${kaboomText(KABOOM)}`,
    );
  });

  it("names Plague and bite cures in Help only for viewers who have them", () => {
    // pulp_wars-0ao.16: only a Human Captain's Tend Wounded cures Plague and
    // bites. Seat 0 is the viewer.
    const helpTips = (factions: readonly FactionIdV7[]): string => {
      document.body.innerHTML = '<div id="app"></div>';
      const controller = new FixtureController(
        goblinArenaV7(factions, [
          { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        ]),
      );
      const app = mount(controller, new RecordingBoardHost());
      requiredButton("compact-menu").click();
      requiredButton("help").click();
      const tips = [
        ...requiredElement<HTMLElement>(".v7-help-tips").querySelectorAll("li"),
      ].map((item) => item.textContent ?? "");
      app.destroy();
      return tips.join("\n");
    };

    const goblin = helpTips(["GOBLIN", "UNDEAD"]);
    expect(goblin).toContain(
      "Lich shots plague your units for 3 turns: −2 HP each turn, spreading to neighbours on the first. Goblins can't cure it; only killing the Lich ends it sooner.",
    );
    expect(goblin).toContain(
      "Zombie bites make your units rise as enemy Zombies when they die; Goblins can't cure bites.",
    );
    expect(goblin).not.toMatch(/Captain|Tend/);

    const human = helpTips(["ORIGINAL", "UNDEAD", "GOBLIN"]);
    expect(human).toContain(
      "Killing the Lich or a Captain's Tend ends it sooner.",
    );
    expect(human).toContain("a Captain's Tend cures bites.");

    const undeadVsGoblin = helpTips(["UNDEAD", "GOBLIN"]);
    expect(undeadVsGoblin).toContain(
      "A Lich's shots plague living units for 3 turns: −2 HP each turn, spreading to neighbours on the first. It ends sooner only if the Lich dies.",
    );
    expect(undeadVsGoblin).toContain(
      "Zombies bite living land units; a bitten unit that dies rises as the biter's Zombie.",
    );
    expect(undeadVsGoblin).not.toMatch(/Captain|tends/);

    const undeadAll = helpTips(["UNDEAD", "ORIGINAL", "GOBLIN"]);
    expect(undeadAll).toContain(
      "It ends sooner if the Lich dies or a Human Captain tends them.",
    );
    expect(undeadAll).toContain(
      "rises as the biter's Zombie unless a Human Captain tends it first.",
    );
  });

  it("warns a Human attacker about the death-blast chain in the board model", () => {
    const controller = new FixtureController(goblinAttackChainFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const attacker = selectUnitAt(
      controller,
      host,
      GOBLIN_ATTACK_CHAIN_V7.attacker,
    );
    expect(host.lastModel?.interaction.selectedUnitId).toBe(attacker.id);
    // Human units have no Kaboom; the Goblin match shows the faction chips.
    expect(document.querySelector('[data-action="command-kaboom"]')).toBe(null);
    expect(requiredElement(".v7-turn-status").textContent).toBe("Your turn");
    app.destroy();
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

function selectUnitAt(
  controller: FixtureController,
  host: RecordingBoardHost,
  at: CoordV7,
): NonNullable<Ruleset7BrowserSnapshot["view"]>["units"][number] {
  const unit = required(
    controller
      .snapshot()
      .view?.units.find((item) => item.at.x === at.x && item.at.y === at.y),
  );
  host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
  return unit;
}

function actionLabels(): (string | null)[] {
  return [
    ...document.querySelectorAll(".v7-selection-dock .v7-action-label"),
  ].map((node) => node.textContent);
}

function labelsIn(selector: string): string[] {
  return [
    ...document.querySelectorAll<HTMLLabelElement>(`${selector} label`),
  ].map((label) => label.firstChild?.textContent ?? "");
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
    throw new Error("Required Goblin DOM fixture value missing");
  return value;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 200; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}
