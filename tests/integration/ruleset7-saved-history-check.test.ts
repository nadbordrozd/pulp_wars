// The resumed save's history check (bead pulp_wars-2yc.95): the browser
// controller resumes a save from its stored state at once and hands the
// command log to a verifier (a Web Worker in the browser) afterwards.
import { describe, expect, it } from "vitest";
import {
  Ruleset7BrowserController,
  SAVED_HISTORY_MISMATCH_WARNING_V7,
  type SavedHistoryVerifierV7,
} from "../../src/app/index";
import {
  RULESET_7_ID,
  canonicalHash,
  distinctFactionsV7,
  queryPlayerCommandsV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import {
  SAVE_STORAGE_KEY_V7,
  verifySaveReplayV7,
  type SaveEnvelopeV7,
  type SaveReplayVerificationV7,
} from "../../src/persistence/index";
import { MemoryStorage } from "./ruleset7-browser-controller.shared";

const setup: MatchSetupV7 = {
  rulesetId: RULESET_7_ID,
  seed: 1,
  width: 11,
  height: 11,
  aiCount: 1,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: distinctFactionsV7(2),
  mapType: "DRY_LAND",
  mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
  curiosities: false,
};

/** A verifier the test settles by hand; it records what it was given. */
function manualVerifier() {
  const runs: {
    save: SaveEnvelopeV7;
    settle: (verdict: SaveReplayVerificationV7 | null) => void;
    cancelled: boolean;
  }[] = [];
  const verifier: SavedHistoryVerifierV7 = (save) => {
    let settle: (verdict: SaveReplayVerificationV7 | null) => void = () =>
      undefined;
    const result = new Promise<SaveReplayVerificationV7 | null>((resolve) => {
      settle = resolve;
    });
    const run = { save, settle, cancelled: false };
    runs.push(run);
    return {
      result,
      cancel: () => {
        run.cancelled = true;
        settle(null);
      },
    };
  };
  return { verifier, runs };
}

/** A stored save of a launched match after one human command. */
async function storedSave(): Promise<MemoryStorage> {
  const storage = new MemoryStorage();
  const controller = new Ruleset7BrowserController({ storage });
  const launched = await controller.launch(setup);
  if (!launched.ok) throw new Error(launched.diagnostic);
  const view = controller.snapshot().view;
  if (view === null) throw new Error("no view");
  const command = queryPlayerCommandsV7(view).find(
    (item) => item.kind !== "END_TURN",
  );
  if (command === undefined) throw new Error("no command");
  expect(await controller.dispatch(command)).toMatchObject({ accepted: true });
  controller.destroy();
  return storage;
}

/** Changes the stored state and updates its hash: the log no longer fits. */
function tamper(storage: MemoryStorage): void {
  const source = storage.getItem(SAVE_STORAGE_KEY_V7);
  if (source === null) throw new Error("no save");
  const save = JSON.parse(source) as SaveEnvelopeV7;
  const state = {
    ...save.state,
    players: save.state.players.map((player) =>
      player.id === save.state.humanPlayerId
        ? { ...player, coins: player.coins + 3 }
        : player,
    ),
  };
  storage.setItem(
    SAVE_STORAGE_KEY_V7,
    JSON.stringify({ ...save, state, stateHash: canonicalHash(state) }),
  );
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("the resumed save's history check (pulp_wars-2yc.95)", () => {
  it("resumes at once and records the verifier's verdict", async () => {
    const storage = await storedSave();
    const { verifier, runs } = manualVerifier();
    const controller = new Ruleset7BrowserController({
      storage,
      savedHistoryVerifier: verifier,
    });
    expect(controller.snapshot()).toMatchObject({
      phase: "RESUMABLE",
      saveWarning: null,
    });
    expect(controller.savedHistoryCheck()).toEqual({
      status: "PENDING",
      diagnostic: null,
    });
    expect(runs).toHaveLength(1);
    const run = runs[0];
    if (run === undefined) throw new Error("no run");
    expect(run.save.state.commandIndex).toBe(
      controller.snapshot().view?.commandIndex,
    );
    run.settle(verifySaveReplayV7(run.save));
    await flush();
    expect(controller.savedHistoryCheck()).toEqual({
      status: "VERIFIED",
      diagnostic: null,
    });
    expect(controller.snapshot().saveWarning).toBeNull();
    expect(await controller.resume()).toBe(true);
    controller.destroy();
  });

  it("goes on from the stored state with a save warning when the log leads elsewhere", async () => {
    const storage = await storedSave();
    const before = JSON.parse(
      storage.getItem(SAVE_STORAGE_KEY_V7) ?? "",
    ) as SaveEnvelopeV7;
    const coinsBefore = before.state.players.find(
      (player) => player.id === before.state.humanPlayerId,
    )?.coins;
    tamper(storage);
    const { verifier, runs } = manualVerifier();
    const controller = new Ruleset7BrowserController({
      storage,
      savedHistoryVerifier: verifier,
    });
    const snapshots: (string | null)[] = [];
    controller.subscribe((snapshot) => snapshots.push(snapshot.saveWarning));
    expect(controller.snapshot().phase).toBe("RESUMABLE");
    const run = runs[0];
    if (run === undefined) throw new Error("no run");
    const verdict = verifySaveReplayV7(run.save);
    expect(verdict.ok).toBe(false);
    run.settle(verdict);
    await flush();
    expect(controller.savedHistoryCheck()).toEqual({
      status: "MISMATCH",
      diagnostic: "Saved command replay validation failed.",
    });
    expect(controller.snapshot().saveWarning).toBe(
      SAVED_HISTORY_MISMATCH_WARNING_V7,
    );
    expect(snapshots).toContain(SAVED_HISTORY_MISMATCH_WARNING_V7);
    // The game goes on from the stored (changed) state.
    expect(await controller.resume()).toBe(true);
    expect(controller.snapshot().view?.viewer.coins).toBe(
      (coinsBefore ?? Number.NaN) + 3,
    );
    controller.destroy();
  });

  it("stays unchecked without a verifier, and when the verifier cannot run", async () => {
    const storage = await storedSave();
    const plain = new Ruleset7BrowserController({ storage });
    expect(plain.snapshot().phase).toBe("RESUMABLE");
    expect(plain.savedHistoryCheck().status).toBe("UNCHECKED");
    plain.destroy();
    const { verifier, runs } = manualVerifier();
    const failing = new Ruleset7BrowserController({
      storage,
      savedHistoryVerifier: verifier,
    });
    runs[0]?.settle(null);
    await flush();
    expect(failing.savedHistoryCheck().status).toBe("UNCHECKED");
    expect(failing.snapshot().saveWarning).toBeNull();
    failing.destroy();
  });

  it("cancels the check for a new match and ignores its late verdict", async () => {
    const storage = await storedSave();
    tamper(storage);
    const { verifier, runs } = manualVerifier();
    const controller = new Ruleset7BrowserController({
      storage,
      savedHistoryVerifier: verifier,
    });
    const run = runs[0];
    if (run === undefined) throw new Error("no run");
    const launched = await controller.launch(
      { ...setup, seed: 2 },
      { replaceStoredMatch: true },
    );
    if (!launched.ok) throw new Error(launched.diagnostic);
    expect(run.cancelled).toBe(true);
    run.settle({ ok: false, diagnostic: "late" });
    await flush();
    expect(controller.savedHistoryCheck()).toEqual({
      status: "NONE",
      diagnostic: null,
    });
    expect(controller.snapshot().saveWarning).toBeNull();
    controller.destroy();
  });

  it("cancels the check on Delete save and on teardown", async () => {
    const storage = await storedSave();
    const { verifier, runs } = manualVerifier();
    const deleting = new Ruleset7BrowserController({
      storage,
      savedHistoryVerifier: verifier,
    });
    expect(await deleting.deleteStoredSave()).toBe(true);
    expect(runs[0]?.cancelled).toBe(true);
    expect(deleting.savedHistoryCheck().status).toBe("NONE");
    deleting.destroy();

    const again = await storedSave();
    const tornDown = new Ruleset7BrowserController({
      storage: again,
      savedHistoryVerifier: verifier,
    });
    tornDown.destroy();
    expect(runs[1]?.cancelled).toBe(true);
  });
});
