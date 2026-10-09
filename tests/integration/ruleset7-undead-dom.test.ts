// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  queryIdleRecoveryV7,
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
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import { knightOverrunPublicFixtureV7 } from "../fixtures/ruleset7-tactical-ui";
import {
  IDLE_RECOVERY_UI_V7,
  idleRecoveryUiFixtureV7,
} from "../fixtures/v7-recovery-ui";
import {
  AFFLICTION_SHOWCASE_V7,
  UNDEAD_SHOWCASE_V7,
  afflictionHumanFixtureV7,
  undeadShowcaseFixtureV7,
  undeadUiArenaV7,
} from "../fixtures/v7-undead-ui";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

/** The shown seats' faction values, seat 0 first. */
function factionValues(): string[] {
  return [
    ...document.querySelectorAll<HTMLSelectElement>(
      "[data-v7-factions] select",
    ),
  ].map((field) => field.value);
}

/** Sets a seat's faction select and dispatches its change event. */
function choose(seat: number, faction: string): void {
  const field = requiredElement<HTMLSelectElement>(`#v7-faction-${seat}`);
  field.value = faction;
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("Revision 13 Undead DOM", () => {
  it("offers per-seat faction choice in the default setup", async () => {
    const chosen = new SetupController();
    const app = mount(chosen, new RecordingBoardHost());
    expect(labelsIn("[data-v7-factions]")).toEqual([
      "Your faction",
      "Player 2 faction",
    ]);
    const count = requiredElement<HTMLSelectElement>("#v7-ai-count");
    count.value = "2";
    count.dispatchEvent(new Event("change", { bubbles: true }));
    expect(labelsIn("[data-v7-factions]")).toHaveLength(3);
    count.value = "3";
    count.dispatchEvent(new Event("change", { bubbles: true }));
    expect(document.activeElement).not.toBe(null);
    expect(requiredElement("#v7-ai-count")).toBe(count);
    expect(labelsIn("[data-v7-factions]")).toEqual([
      "Your faction",
      "Player 2 faction",
      "Player 3 faction",
      "Player 4 faction",
    ]);
    // The unique-factions rule (pulp_wars-w5j.1): distinct defaults.
    expect(factionValues()).toEqual([
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
    ]);
    for (const seat of [0, 2]) {
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
    }
    // Seat 0 picks Martian; seat 2 then picks Human, which seat 0 freed.
    choose(0, "MARTIAN");
    choose(2, "ORIGINAL");
    expect(factionValues()).toEqual([
      "MARTIAN",
      "UNDEAD",
      "ORIGINAL",
      "DINOSAUR",
    ]);
    requiredButton("launch").click();
    await waitUntil(() => chosen.launched.length === 1);
    expect(chosen.launched[0]?.factions).toEqual([
      "MARTIAN",
      "UNDEAD",
      "ORIGINAL",
      "DINOSAUR",
    ]);
    app.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    const plain = new SetupController();
    const defaultApp = mount(plain, new RecordingBoardHost());
    // Untouched faction selects keep the distinct defaults.
    const plainCount = requiredElement<HTMLSelectElement>("#v7-ai-count");
    plainCount.value = "2";
    plainCount.dispatchEvent(new Event("change", { bubbles: true }));
    expect(factionValues()).toEqual(["ORIGINAL", "UNDEAD", "GOBLIN"]);
    requiredButton("launch").click();
    await waitUntil(() => plain.launched.length === 1);
    expect(plain.launched[0]?.factions).toEqual([
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
    ]);
    defaultApp.destroy();
  });

  it("disables taken factions for opponents and keeps every seat distinct", async () => {
    const chosen = new SetupController();
    const app = mount(chosen, new RecordingBoardHost());
    expect(requiredElement(".v7-setup-factions-hint").textContent).toBe(
      "Every player plays a different faction. Take an opponent's and they switch to a free one.",
    );
    const disabled = (seat: number): string[] =>
      [...requiredElement<HTMLSelectElement>(`#v7-faction-${seat}`).options]
        .filter((option) => option.disabled)
        .map((option) => option.value);
    // "Your faction" offers every faction; an opponent's select disables
    // the factions the other shown seats play.
    expect(disabled(0)).toEqual([]);
    expect(disabled(1)).toEqual(["ORIGINAL"]);
    choose(1, "ICE_FOLK");
    expect(disabled(0)).toEqual([]);
    expect(disabled(1)).toEqual(["ORIGINAL"]);
    // A hidden seat's earlier choice never disables a shown option.
    const count = requiredElement<HTMLSelectElement>("#v7-ai-count");
    count.value = "3";
    count.dispatchEvent(new Event("change", { bubbles: true }));
    // Seat 2 keeps Goblin, seat 3 Dinosaur: every AI seat is distinct.
    expect(factionValues()).toEqual([
      "ORIGINAL",
      "ICE_FOLK",
      "GOBLIN",
      "DINOSAUR",
    ]);
    expect(disabled(0)).toEqual([]);
    expect(disabled(2)).toEqual(["ORIGINAL", "DINOSAUR", "ICE_FOLK"]);
    expect(disabled(3)).toEqual(["ORIGINAL", "GOBLIN", "ICE_FOLK"]);
    // The human's choice comes first: the opponent who played it takes the
    // first untaken faction.
    choose(0, "GOBLIN");
    expect(factionValues()).toEqual([
      "GOBLIN",
      "ICE_FOLK",
      "ORIGINAL",
      "DINOSAUR",
    ]);
    // An opponent set to a taken faction by script (its option is
    // disabled) falls back to the first untaken faction.
    choose(3, "GOBLIN");
    expect(factionValues()).toEqual([
      "GOBLIN",
      "ICE_FOLK",
      "ORIGINAL",
      "UNDEAD",
    ]);
    // Showcase: the same rule.
    const map = requiredElement<HTMLSelectElement>("#v7-map-type");
    map.value = "SHOWCASE";
    map.dispatchEvent(new Event("change", { bubbles: true }));
    expect(disabled(1)).toEqual(["ORIGINAL", "UNDEAD", "GOBLIN"]);
    requiredButton("launch").click();
    await waitUntil(() => chosen.launched.length === 1);
    expect(chosen.launched[0]).toMatchObject({
      mapType: "SHOWCASE",
      factions: ["GOBLIN", "ICE_FOLK", "ORIGINAL", "UNDEAD"],
    });
    expect(new Set(chosen.launched[0]?.factions).size).toBe(4);
    expect(chosen.launched[0]).not.toHaveProperty("allowDuplicateFactions");
    app.destroy();
  });

  it("labels Undead units, offers previewed Undead commands, and explains Restless", async () => {
    const controller = new FixtureController(undeadShowcaseFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const at = UNDEAD_SHOWCASE_V7;

    selectUnitAt(controller, host, at.banshee);
    const dock = requiredElement<HTMLElement>(".v7-selection-dock");
    expect(dock.querySelector("h2")?.textContent).toBe("Banshee");
    expect(
      dock.querySelector('.v7-faction-chip[data-faction="undead"]')
        ?.textContent,
    ).toBe("Undead");
    expect(dock.querySelector(".v7-identity-art .v7-undead-badge")).not.toBe(
      null,
    );
    expect(dock.querySelector('[data-stat="range"] dd')?.textContent).toBe("—");
    const wail = requiredButton("command-wail");
    expect(wail.querySelector(".v7-action-label")?.textContent).toBe("Wail");
    expect(wail.getAttribute("aria-label")).toBe(
      // The Vampire and Banshee rework (`pulp_wars-ty6i`): Attack 1.5 (the
      // Guard took 1).
      "Wail · Hits 2 enemies within 2 tiles, 1 dies: Guard −2, Fighter −1 (dies)",
    );
    expect(wail.querySelector(".v7-undead-preview-chip")?.textContent).toBe(
      "2 hit · 1 ✕",
    );
    expect(host.lastModel?.interaction.selectedUnitId).toBeDefined();

    selectUnitAt(controller, host, at.necromancer);
    expect(actionLabels()).toEqual(["Frenzy", "Raise Dead", "Disband", "Wait"]);
    expect(
      requiredButton("command-raise_dead").getAttribute("aria-label"),
    ).toBe("Raise Dead · 3 Skeletons rise from adjacent Graves at 5 HP");
    requiredButton("unit-help").click();
    const help = requiredElement<HTMLElement>(".v7-unit-help-dialog");
    // The unit glossary's lines (bead pulp_wars-2yc.39).
    expect(
      [...help.querySelectorAll<HTMLElement>(".v7-unit-ability")].map(
        (line) => line.textContent,
      ),
    ).toEqual([
      "CaptureTakes a village or an enemy city when it starts your turn standing on its centre.",
      "FrenzyFriendly units next to it hit harder on their next attack this turn.",
      "Raise DeadRaises a Skeleton from every free Grave within 2 tiles.",
      "RestlessHeals only inside your own borders.",
    ]);
    expect(help.textContent).not.toContain("Rally");
    requiredButton("close-unit-help").click();

    selectUnitAt(controller, host, at.ghoul);
    expect(requiredButton("command-devour").getAttribute("aria-label")).toBe(
      "Devour · Eats the Grave: heal +6 to 10 HP",
    );
    expect(
      document.querySelector('[data-unit-status="grave"]')?.textContent,
    ).toBe("On a Grave");

    selectUnitAt(controller, host, at.restlessSkeleton);
    expect(
      document
        .querySelector('[data-unit-status="restless"]')
        ?.getAttribute("aria-label"),
    ).toBe("Restless: Undead recover only inside your territory.");
    requiredButton("unit-help").click();
    expect(
      document.querySelector('[data-tactical-state="restless"]')?.textContent,
    ).toBe("RestlessIt is outside your borders, so it will not heal here.");
    requiredButton("close-unit-help").click();
    const recover = requiredButton("restless-recover");
    expect(recover.getAttribute("aria-disabled")).toBe("true");
    expect(recover.disabled).toBe(false);
    expect(recover.getAttribute("aria-label")).toBe(
      "Recover unavailable. Restless: Undead recover only inside your territory.",
    );
    recover.click();
    expect(controller.accepted).toEqual([]);

    selectUnitAt(controller, host, at.banshee);
    requiredButton("command-wail").click();
    await waitUntil(() => controller.accepted.length === 1);
    await waitUntil(
      () =>
        document.querySelector("#v7-live")?.textContent ===
        "Banshee wailed: 2 hit, 1 fell · 1 Grave left",
    );
    expect(document.querySelector(".v7-toast")?.textContent).toBe(
      "Banshee wailed: 2 hit, 1 fell · 1 Grave left",
    );
    app.destroy();
  });

  it("uses the viewer's Undead registration for training, recruit help, technology and Help", () => {
    const controller = new FixtureController(
      undeadUiArenaV7([{ seat: 0, role: "MARKSMAN", at: { x: 2, y: 2 } }]),
    );
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const view = required(controller.snapshot().view);
    const capital = required(
      view.cities.find(
        (city) => city.ownerId === view.viewer.id && city.isCapital,
      ),
    );
    host.callbacks?.onSelection({ kind: "CITY", cityId: capital.id });
    const trainLabels = [
      ...document.querySelectorAll<HTMLButtonElement>(".v7-train-action"),
    ].map((button) => button.getAttribute("aria-label"));
    expect(trainLabels).toEqual(
      expect.arrayContaining([
        "Train Skeleton for 2 Coins",
        "Train Banshee for 3 Coins",
        "Train Necromancer for 5 Coins",
        "Train Lich for 8 Coins",
      ]),
    );
    expect(
      document.querySelector(".v7-train-action .v7-undead-badge"),
    ).not.toBe(null);
    requiredButton("train-help-marksman").click();
    const recruit = requiredElement<HTMLElement>(".v7-recruit-help");
    expect(recruit.querySelector("h2")?.textContent).toBe("Banshee");
    expect(
      [...recruit.querySelectorAll<HTMLElement>(".v7-unit-ability")].map(
        (line) => line.textContent,
      ),
    ).toEqual([
      "CaptureTakes a village or an enemy city when it starts your turn standing on its centre.",
      "WailHurts every living enemy within 2 tiles at once. It has no ordinary attack.",
      // The Vampire and Banshee rework (`pulp_wars-ty6i`).
      "TerrorEnemies its Wail hurts cannot hit back until the end of your turn.",
      "EtherealEnemies next to its path do not stop it.",
      "RestlessHeals only inside your own borders.",
    ]);
    requiredButton("close-recruit-help").click();

    requiredButton("tech").click();
    requiredButton("tech-administration").click();
    const detail = requiredElement<HTMLElement>(".v7-tech-detail");
    expect(detail.textContent).toContain("Train Necromancer");
    expect(detail.textContent).toContain(
      "Necromancers Frenzy nearby troops or Raise Dead",
    );
    requiredButton("close-overlay").click();

    requiredButton("compact-menu").click();
    requiredButton("help").click();
    // Bead pulp_wars-2yc.39: Help is the same short text for every faction.
    const helpText = requiredElement<HTMLElement>(".v7-help").textContent ?? "";
    expect(helpText).toContain("Capture every enemy city.");
    expect(helpText).not.toMatch(/Grave|Zombie|Lich|Raider|Shallow Water/);
    requiredButton("close-overlay").click();

    requiredButton("compact-menu").click();
    requiredButton("leaderboard").click();
    expect(
      [...document.querySelectorAll(".v7-leaderboard .v7-faction-chip")]
        .map((chip) => chip.textContent)
        .sort(),
    ).toEqual(["Human", "Undead"]);
    app.destroy();
  });

  it("names each player's faction in the turn banner only in Undead matches", () => {
    const opponentTurn = (state: GameStateV7): GameStateV7 => ({
      ...state,
      activeSeatIndex: state.turnOrder.findIndex(
        (id) => id !== state.humanPlayerId,
      ),
    });
    const mixed = mount(
      new FixtureController(opponentTurn(undeadShowcaseFixtureV7())),
      new RecordingBoardHost(),
    );
    expect(document.querySelector(".v7-turn-status")?.textContent).toBe(
      "Player 2 (Human) is playing…",
    );
    mixed.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    const human = mount(
      new FixtureController(opponentTurn(knightOverrunPublicFixtureV7().state)),
      new RecordingBoardHost(),
    );
    expect(document.querySelector(".v7-turn-status")?.textContent).toMatch(
      /^Player \d is playing…$/,
    );
    human.destroy();
  });

  it("shows public Plague and Bitten chips, explains Disband, and previews Tend cures", async () => {
    const controller = new FixtureController(afflictionHumanFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const at = AFFLICTION_SHOWCASE_V7.human;
    const plague =
      "Plague from Player 2's Lich: −2 HP at the start of each of its next 3 turns, then it ends; at the first it spreads to adjacent living units. It ends sooner if that Lich dies or a Captain tends it.";

    selectUnitAt(controller, host, at.plaguedWarrior);
    const chip = requiredElement<HTMLElement>(
      '.v7-selection-dock [data-unit-status="plague"]',
    );
    // Revision 15: the chip counts the remaining Plague turns.
    expect(chip.textContent).toBe("Plague · 3 turns");
    expect(chip.getAttribute("aria-label")).toBe(`Plague · 3 turns. ${plague}`);
    expect(chip.querySelector('svg[data-icon="plague"]')).not.toBeNull();
    expect(
      document.querySelector('.v7-selection-dock [data-unit-status="bitten"]'),
    ).toBeNull();
    const disband = requiredButton("affliction-disband");
    expect(disband.getAttribute("aria-disabled")).toBe("true");
    expect(disband.disabled).toBe(false);
    expect(disband.dataset.disabledReason).toBe("plagued");
    expect(disband.getAttribute("aria-label")).toBe(
      "Disband unavailable. Plagued units can't Disband.",
    );
    expect(document.querySelector('[data-action="command-disband"]')).toBe(
      null,
    );
    disband.click();
    expect(controller.accepted).toEqual([]);
    requiredButton("unit-help").click();
    // In the dialog the chip explains itself in the unit glossary's plain
    // words (bead pulp_wars-2yc.39); the exact rule stays its tooltip.
    expect(
      document.querySelector('[data-tactical-state="plague"]')?.textContent,
    ).toBe(
      "Plague · 3 turnsLoses health every turn and can pass the Plague to its neighbours. A healer's Tend cures it.",
    );
    requiredButton("close-unit-help").click();

    selectUnitAt(controller, host, at.bittenArcher);
    expect(
      document
        .querySelector('.v7-selection-dock [data-unit-status="bitten"]')
        ?.getAttribute("aria-label"),
    ).toBe(
      "Bitten. Bitten by Player 2's Zombie: if it dies it rises as Player 2's Zombie, unless a Captain tends it first.",
    );
    expect(requiredButton("affliction-disband").dataset.disabledReason).toBe(
      "bitten",
    );

    selectUnitAt(controller, host, at.doublyAfflicted);
    expect(
      Array.from(
        document.querySelectorAll(".v7-selection-dock .v7-affliction-chip"),
      ).map((node) => node.textContent),
    ).toEqual(["Plague · 3 turns", "Bitten"]);
    expect(requiredButton("affliction-disband").dataset.disabledReason).toBe(
      "plagued",
    );

    selectUnitAt(controller, host, at.knight);
    expect(document.querySelector(".v7-affliction-chip")).toBeNull();
    expect(document.querySelector('[data-action="affliction-disband"]')).toBe(
      null,
    );

    // The enemy Lich's and the Captain's ? details explain Plague and cures.
    selectUnitAt(controller, host, at.visibleLich);
    requiredButton("unit-help").click();
    expect(
      requiredElement<HTMLElement>(".v7-unit-help-dialog").textContent,
    ).toContain(
      "PlagueUnits it hits catch the Plague: they lose health every turn and can pass it on. Unlocked by a technology.",
    );
    requiredButton("close-unit-help").click();
    selectUnitAt(controller, host, at.captain);
    requiredButton("unit-help").click();
    expect(
      requiredElement<HTMLElement>(".v7-unit-help-dialog").textContent,
    ).toContain(
      "TendHeals the wounded friendly units next to it and cures their ailments.",
    );
    requiredButton("close-unit-help").click();
    const tend = requiredButton("command-tend_wounded");
    expect(tend.getAttribute("aria-label")).toBe(
      "Tend wounded · Tends 2 units: Fighter: cures Plague; Marksman: +2 HP, cures bite",
    );
    expect(tend.querySelector(".v7-undead-preview-chip")?.textContent).toBe(
      "+2 HP · 2 cures",
    );
    tend.click();
    await waitUntil(() => controller.accepted.length === 1);
    await waitUntil(
      () =>
        document.querySelector("#v7-live")?.textContent ===
        "Tend cured Plague on 1 and a bite",
    );
    expect(controller.snapshot().view?.plagued).toHaveLength(1);
    selectUnitAt(controller, host, at.plaguedWarrior);
    expect(document.querySelector(".v7-affliction-chip")).toBeNull();

    host.callbacks?.onSelection(null);
    requiredButton("compact-menu").click();
    requiredButton("help").click();
    // Bead pulp_wars-2yc.39: Help has no Undead lines; the chips and each
    // unit's "?" explain Plague, bites and the Vampire.
    const helpText = requiredElement<HTMLElement>(".v7-help").textContent ?? "";
    expect(helpText).toContain("Capture every enemy city.");
    expect(helpText).not.toMatch(/Lich|Vampire|Plague/);
    app.destroy();
  });

  it("keeps Human-only docks, Help, and leaderboard free of Undead cues", () => {
    const fixture = knightOverrunPublicFixtureV7();
    const controller = new FixtureController(fixture.state);
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const view = required(controller.snapshot().view);
    for (const unit of view.units) {
      host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
      expect(document.querySelector(".v7-faction-chip")).toBeNull();
      expect(document.querySelector(".v7-undead-badge")).toBeNull();
      expect(document.querySelector('[data-action="restless-recover"]')).toBe(
        null,
      );
      expect(document.body.textContent).not.toMatch(
        /Undead|Grave|Frenzy|Restless|Plague|Bitten|bites/,
      );
      expect(document.querySelector(".v7-affliction-chip")).toBeNull();
      expect(document.querySelector('[data-action="affliction-disband"]')).toBe(
        null,
      );
      expect(
        document
          .querySelector('[data-action="command-tend_wounded"]')
          ?.querySelector(".v7-undead-preview-chip") ?? null,
      ).toBeNull();
    }
    host.callbacks?.onSelection(null);
    requiredButton("compact-menu").click();
    requiredButton("help").click();
    const helpText = requiredElement<HTMLElement>(".v7-help").textContent ?? "";
    expect(helpText).toContain("Capture every enemy city.");
    expect(helpText).not.toContain("Grave");
    requiredButton("close-overlay").click();
    requiredButton("compact-menu").click();
    requiredButton("leaderboard").click();
    expect(document.querySelector(".v7-faction-chip")).toBeNull();
    app.destroy();
  });
});

describe("Idle recovery hints (pulp_wars-v3w)", () => {
  const AT = IDLE_RECOVERY_UI_V7;

  it("counts the recovering units on End Turn and says so in the dock", async () => {
    const state = idleRecoveryUiFixtureV7();
    const hint = queryIdleRecoveryV7(state, state.humanPlayerId);
    expect(hint).toHaveLength(2);
    const amount = required(hint[0]).amount;
    const controller = new FixtureController(state);
    const host = new RecordingBoardHost();
    const app = mount(controller, host);

    // End Turn: a heal icon and the count, named for assistive technology.
    const end = requiredButton("end-turn");
    const badge = requiredElement<HTMLElement>("[data-end-turn-recover]");
    expect(end.contains(badge)).toBe(true);
    expect(badge.dataset.endTurnRecover).toBe("2");
    expect(badge.textContent).toBe("2");
    expect(badge.querySelector('[data-icon="hp"]')).not.toBeNull();
    expect(end.getAttribute("aria-label")).toBe(
      "End turn. 2 units will recover.",
    );
    expect(end.title).toBe("2 units will recover");

    // The dock of an idle wounded unit says what End Turn will heal.
    selectUnitAt(controller, host, AT.wounded);
    const chip = requiredElement<HTMLElement>(
      '.v7-selection-dock [data-unit-status="idle-recovery"]',
    );
    expect(chip.textContent).toBe(`+${amount} at End Turn if idle`);
    expect(chip.getAttribute("aria-label")).toBe(
      `Recovers ${amount} HP at End Turn if it does not move or act.`,
    );
    selectUnitAt(controller, host, AT.healthy);
    expect(
      document.querySelector('[data-unit-status="idle-recovery"]'),
    ).toBeNull();

    // An explicit Recover takes the unit out of both.
    selectUnitAt(controller, host, AT.wounded);
    requiredButton("command-recover").click();
    await waitUntil(() => controller.accepted.length === 1);
    await waitUntil(
      () =>
        requiredElement<HTMLElement>("[data-end-turn-recover]").dataset
          .endTurnRecover === "1",
    );
    expect(requiredButton("end-turn").getAttribute("aria-label")).toBe(
      "End turn. 1 unit will recover.",
    );
    selectUnitAt(controller, host, AT.wounded);
    expect(
      document.querySelector('[data-unit-status="idle-recovery"]'),
    ).toBeNull();

    // Nothing left to recover: the plain End Turn button.
    selectUnitAt(controller, host, AT.hurt);
    await waitUntil(() => !requiredButton("command-recover").disabled);
    requiredButton("command-recover").click();
    await waitUntil(() => controller.accepted.length === 2);
    await waitUntil(
      () => document.querySelector("[data-end-turn-recover]") === null,
    );
    expect(requiredButton("end-turn").textContent).toBe("End turn");
    expect(requiredButton("end-turn").hasAttribute("aria-label")).toBe(false);
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
): void {
  const unit = required(
    controller
      .snapshot()
      .view?.units.find((item) => item.at.x === at.x && item.at.y === at.y),
  );
  host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
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
    throw new Error("Required Undead DOM fixture value missing");
  return value;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 200; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}
