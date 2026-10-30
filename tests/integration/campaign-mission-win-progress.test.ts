// @vitest-environment jsdom
// A won mission is marked completed, with its stars, in the campaign
// progress (`pulp_wars-6o5t`: the user won GOBLIN_6 "The Big Getaway", the
// Goblin chapter's last mission, an escort with the Dwarves as allies, and
// found it unmarked on the campaign screen). No match is played: each state
// is a launched mission with a unit moved or an outcome set by hand.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import {
  bootstrapRuleset7App,
  Ruleset7BrowserController,
} from "../../src/app/index";
import { CAMPAIGN_CHAPTERS_V7 } from "../../src/campaign/progress-v7";
import type { CampaignMissionEntryV7 } from "../../src/campaign/chapter";
import {
  canonicalHash,
  missionByIdV7,
  missionMatchSetupV7,
  missionSeatFactionsV7,
  missionStatusV7,
  missionTaggedUnitsV7,
  type CommandV7,
  type GameStateV7,
  type UnitId,
  type MissionDefinitionV7,
} from "../../src/engine/index";
import {
  CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
  SAVE_STORAGE_KEY_V7,
  type SaveEnvelopeV7,
} from "../../src/persistence/index";
import { MemoryStorage } from "./ruleset7-browser-controller.shared";
import {
  requiredButton,
  settle,
  waitUntil,
  won,
} from "./ruleset7-campaign-dom.shared";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

function definition(id: string): MissionDefinitionV7 {
  const mission = missionByIdV7(id);
  if (mission === null) throw new Error(`${id} is not registered`);
  return mission;
}

/** A just-launched mission's autosave in `storage`. */
async function launchedSave(
  storage: MemoryStorage,
  missionId: string,
): Promise<SaveEnvelopeV7> {
  const mission = definition(missionId);
  const faction = missionSeatFactionsV7(mission.seats[0] as never)[0];
  const setup = missionMatchSetupV7(mission, faction);
  if (setup === null) throw new Error(`${missionId}: no setup`);
  const controller = new Ruleset7BrowserController({ storage });
  const launched = await controller.launch(setup);
  if (!launched.ok) throw new Error(launched.diagnostic);
  controller.flushPersistence();
  controller.destroy();
  const source = storage.getItem(SAVE_STORAGE_KEY_V7);
  if (source === null) throw new Error("no save");
  return JSON.parse(source) as SaveEnvelopeV7;
}

function storeState(
  storage: Pick<Storage, "setItem">,
  save: SaveEnvelopeV7,
  state: GameStateV7,
): void {
  storage.setItem(
    SAVE_STORAGE_KEY_V7,
    JSON.stringify({ ...save, state, stateHash: canonicalHash(state) }),
  );
}

/**
 * GOBLIN_6 with the Getaway one plain step (to (7, 6)) from the Ironbraid
 * Gate's two-tile ring: the move that wins the escort in round 1.
 */
function cartAtTheGate(save: SaveEnvelopeV7): {
  readonly state: GameStateV7;
  readonly cart: UnitId;
} {
  const cart = missionTaggedUnitsV7(
    definition("GOBLIN_6"),
    save.state.setup,
  ).get("GETAWAY");
  if (cart === undefined) throw new Error("no Getaway");
  return {
    cart,
    state: {
      ...save.state,
      units: save.state.units.map((unit) =>
        unit.id === cart ? { ...unit, at: { x: 8, y: 7 } } : unit,
      ),
    },
  };
}

function winningMove(cart: UnitId): CommandV7 {
  return {
    kind: "MOVE",
    unitId: cart,
    path: [{ x: 7, y: 6 }],
  } as CommandV7;
}

/** Each chapter's last mission, every escort and every allied mission. */
function missionsAtRisk(): readonly CampaignMissionEntryV7[] {
  return CAMPAIGN_CHAPTERS_V7.flatMap((chapter) =>
    chapter.missions.filter((entry, index) => {
      const mission = missionByIdV7(entry.missionId);
      if (mission === null) return false;
      const team = (seat: number): number => mission.teams?.[seat] ?? seat;
      const allied = mission.seats.some(
        (_, seat) => seat > 0 && team(seat) === team(0),
      );
      return (
        index === chapter.missions.length - 1 ||
        entry.format === "ESCORT" ||
        allied
      );
    }),
  );
}

describe("a won GOBLIN_6 in the controller", () => {
  it("the escort's arrival records the mission with its three stars", async () => {
    const storage = new MemoryStorage();
    const save = await launchedSave(storage, "GOBLIN_6");
    const { state, cart } = cartAtTheGate(save);
    storeState(storage, save, state);
    const controller = new Ruleset7BrowserController({ storage });
    expect(controller.snapshot().phase).toBe("RESUMABLE");
    await controller.resume();
    const result = await controller.dispatch(winningMove(cart));
    expect(result.accepted).toBe(true);
    expect(controller.snapshot().phase).toBe("COMPLETE");
    expect(controller.snapshot().view?.outcome).toEqual({
      kind: "VICTORY",
      winnerId: state.humanPlayerId,
      cause: "ESCORT_ARRIVED",
    });
    const progress = controller.campaignProgress();
    // Round 1, every city kept: the win and both bonus stars.
    expect(progress.completed.GOBLIN_6).toMatchObject({
      bestRounds: 1,
      stars: 3,
    });
    expect(progress.lastWin).toMatchObject({
      missionId: "GOBLIN_6",
      firstWin: true,
    });
    expect(progress.unsavedWin).toBeNull();
    const stored = JSON.parse(
      storage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7) ?? "null",
    ) as {
      campaigns: Record<string, { completed: Record<string, unknown> }>;
    };
    expect(stored.campaigns.GOBLINS?.completed.GOBLIN_6).toMatchObject({
      stars: 3,
    });
    controller.destroy();
  });

  it("says the win was not saved when the storage refuses the write", async () => {
    class RefusingStorage extends MemoryStorage {
      override setItem(key: string, value: string): void {
        if (key === CAMPAIGN_PROGRESS_STORAGE_KEY_V7)
          throw new Error("QuotaExceededError");
        super.setItem(key, value);
      }
    }
    const storage = new RefusingStorage();
    const save = await launchedSave(storage, "GOBLIN_6");
    const { state, cart } = cartAtTheGate(save);
    storeState(storage, save, state);
    const controller = new Ruleset7BrowserController({ storage });
    await controller.resume();
    await controller.dispatch(winningMove(cart));
    expect(controller.snapshot().phase).toBe("COMPLETE");
    const progress = controller.campaignProgress();
    expect(progress.completed).toEqual({});
    expect(progress.unsavedWin).toBe("GOBLIN_6");
    expect(progress.diagnostic).toContain("QuotaExceededError");
    controller.destroy();
  });
});

describe("a won GOBLIN_6 in developer mode", () => {
  const AT = "2026-10-03T12:00:00.000Z";
  const seed = (storage: MemoryStorage, openers: boolean): void =>
    storage.setItem(
      CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
      JSON.stringify({
        format: "pulp-wars-campaign-progress",
        version: 2,
        campaigns: {
          GOBLINS: {
            completed: Object.fromEntries(
              [1, 2, 3, 4, 5].map((n) => [
                `GOBLIN_${String(n)}`,
                { firstWonAt: AT, bestRounds: 12 },
              ]),
            ),
          },
          ...(openers
            ? {
                HUMANS: {
                  completed: { HUMAN_6: { firstWonAt: AT, bestRounds: 12 } },
                },
                UNDEAD: {
                  completed: { UNDEAD_6: { firstWonAt: AT, bestRounds: 12 } },
                },
              }
            : {}),
        },
      }),
    );

  async function winInDevMode(openers: boolean) {
    const storage = new MemoryStorage();
    seed(storage, openers);
    const save = await launchedSave(storage, "GOBLIN_6");
    const { state, cart } = cartAtTheGate(save);
    storeState(storage, save, state);
    const controller = new Ruleset7BrowserController({
      storage,
      developerMode: true,
    });
    await controller.resume();
    await controller.dispatch(winningMove(cart));
    expect(controller.snapshot().phase).toBe("COMPLETE");
    const progress = controller.campaignProgress();
    controller.destroy();
    return progress;
  }

  it("is recorded when the normal game had it open", async () => {
    const progress = await winInDevMode(true);
    expect(progress.completed.GOBLIN_6).toMatchObject({ stars: 3 });
    expect(progress.lastWin).toMatchObject({ missionId: "GOBLIN_6" });
  });

  it("is not recorded when only developer mode opened the campaign", async () => {
    const progress = await winInDevMode(false);
    expect(progress.completed.GOBLIN_6).toBeUndefined();
    expect(progress.lastWin).toBeNull();
    expect(progress.unsavedWin).toBeNull();
  });

  it("says so in a warning at the body size, not a quiet grey line", () => {
    const css = readFileSync("src/styles/v7.css", "utf8");
    const rule =
      /\.v7-dev-progress-note,\s*\.v7-campaign-unsaved\s*\{([^}]*)\}/u.exec(
        css,
      )?.[1];
    expect(rule).toBeDefined();
    expect(rule).toContain("color: var(--pw-amber)");
    expect(rule).toContain("background: var(--pw-amber-fill)");
    expect(rule).toContain("font-size: var(--pw-fs-base)");
    expect(rule).not.toContain("--pw-text-2");
  });
});

describe("every chapter's last mission, escort and allied mission", () => {
  const entries = missionsAtRisk();

  it("covers the chapters' last missions, the escorts and the allies", () => {
    const ids = entries.map((entry) => entry.missionId);
    expect(ids).toContain("GOBLIN_6");
    for (const chapter of CAMPAIGN_CHAPTERS_V7) {
      const last = chapter.missions.at(-1);
      if (last !== undefined && missionByIdV7(last.missionId) !== null)
        expect(ids).toContain(last.missionId);
    }
  });

  it.each(entries.map((entry) => [entry.missionId]))(
    "%s: a finished save records the win with its stars",
    async (missionId) => {
      const storage = new MemoryStorage();
      const save = await launchedSave(storage, missionId);
      const mission = definition(missionId);
      const state: GameStateV7 = {
        ...save.state,
        outcome: {
          kind: "VICTORY",
          winnerId: save.state.humanPlayerId,
          cause:
            mission.objective.kind === "ESCORT"
              ? "ESCORT_ARRIVED"
              : "ENEMIES_ELIMINATED",
        },
      };
      const stars = missionStatusV7(state)?.stars ?? null;
      expect(stars).not.toBeNull();
      storeState(storage, save, state);
      const controller = new Ruleset7BrowserController({ storage });
      expect(controller.snapshot().phase).toBe("COMPLETE");
      expect(controller.campaignProgress().completed[missionId]).toMatchObject({
        bestRounds: state.round,
        stars,
      });
      controller.destroy();
    },
  );
});

describe("a won GOBLIN_6 in the app", () => {
  it("Campaign from the Victory dialog shows mission 6 done with its stars", async () => {
    // Humans and Undead done open the Goblins; missions 1 to 5 are won.
    window.localStorage.setItem(
      CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
      JSON.stringify({
        format: "pulp-wars-campaign-progress",
        version: 2,
        campaigns: {
          GOBLINS: {
            completed: {
              GOBLIN_1: won(),
              GOBLIN_2: won(),
              GOBLIN_3: won(),
              GOBLIN_4: won(),
              GOBLIN_5: won(),
            },
          },
          HUMANS: { completed: { HUMAN_6: won() } },
          UNDEAD: { completed: { UNDEAD_6: won() } },
        },
      }),
    );
    const memory = new MemoryStorage();
    const save = await launchedSave(memory, "GOBLIN_6");
    const { state, cart } = cartAtTheGate(save);
    storeState(window.localStorage, save, state);
    const app = bootstrapRuleset7App(document);
    await settle();
    requiredButton('[data-action="resume"]').click();
    await waitUntil(
      () =>
        app.controller.snapshot().phase === "ACTIVE" &&
        !app.controller.snapshot().transitioning,
    );
    await app.controller.dispatch(winningMove(cart));
    await waitUntil(
      () => document.querySelector('[data-action="campaign-menu"]') !== null,
    );
    const dialog = document.querySelector<HTMLElement>(
      "[data-v7-region='results']",
    );
    expect(dialog?.dataset.outcome).toBe("victory");
    expect(dialog?.querySelector("[data-v7-region='campaign-unsaved']")).toBe(
      null,
    );
    requiredButton('[data-action="campaign-menu"]').click();
    await waitUntil(
      () => document.querySelector(".v7-campaign-chapter") !== null,
    );
    const card = document.querySelector<HTMLElement>(
      '[data-action="mission-goblin_6"]',
    );
    expect(card?.dataset.status).toBe("done");
    expect(
      card?.querySelector<HTMLElement>(".v7-mission-stars")?.dataset.stars,
    ).toBe("3");
    app.destroy();
  });
});
