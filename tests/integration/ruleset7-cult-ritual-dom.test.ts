// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { favourOfV7, viewForV7, type CoordV7 } from "../../src/engine/index";
import {
  BOARD_PICK_PANEL_MAX_BUTTONS_V7,
  targetHighlightStyleV7,
} from "../../src/render/canvas/target-highlight-v7";
import {
  CULT_TRICK_PICKS_V7,
  GREAT_SUMMONING_NO_TILE_V7,
  HEX_SPENT_V7,
  PROCLAIM_COWED_V7,
  RITUAL_CONFIRM_HINT_V7,
  STARFALL_MOVED_V7,
  TENTACLE_EXISTS_V7,
  TRICK_FROGGED_V7,
  greatSummoningChantersTextV7,
  ritualNeedsFavourTextV7,
} from "../../src/render/cult-ritual-presentation-v7";
import {
  cultFieldV7,
  withFavourV7,
  withFrogsV7,
  withTentacleV7,
} from "../fixtures/v7-cult";
import {
  CULT_RITUAL_UI_V7,
  CULT_TRICK_UI_V7,
  cultCowedUiFixtureV7,
  cultHeraldBindUiFixtureV7,
  cultProclaimUiFixtureV7,
  cultRitualRivalUiFixtureV7,
  cultStarfallBegunUiFixtureV7,
  cultStarfallUiFixtureV7,
  cultSummoningBegunUiFixtureV7,
  cultSummoningBlockedUiFixtureV7,
  cultSummoningUiFixtureV7,
  cultTricksDoneUiFixtureV7,
  cultTricksRivalUiFixtureV7,
  cultTricksUiFixtureV7,
} from "../fixtures/v7-cult-ui";
import {
  boardPlan,
  required,
  requiredButton,
  requiredElement,
  rig,
  waitUntil,
} from "../fixtures/v7-dom-rig";
import { at } from "../fixtures/v7-revision20";

/**
 * Rituals, hexes and tricks in the DOM (bead `pulp_wars-mch9.19`,
 * docs/ui/BOARD_TARGETING.md section 3.9): one button per action; the mark
 * of a rite (chosen first, begun when chosen again), the city of a
 * Proclaim, the unit of a Ribbit or a Switcheroo and the tile of a Tentacle
 * are picked on the board; the board carries the rings, the countdown, the
 * frog, the Grab and the Cowed banner for every viewer; and a frog's card
 * shows its real numbers. (Pick Me! retired with the Chosen, and the
 * Tentacle is the Summoner's: the Cult redesign, `pulp_wars-mch9.31`.)
 */

const R = CULT_RITUAL_UI_V7;
const T = CULT_TRICK_UI_V7;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

type Scene = ReturnType<typeof rig>;

function select(scene: Scene, where: CoordV7): void {
  const view = required(scene.controller.snapshot().view);
  scene.host.callbacks?.onSelection({
    kind: "UNIT",
    unitId: required(
      view.units.find((unit) => unit.at.x === where.x && unit.at.y === where.y),
    ).id,
  });
}

const dock = (): HTMLElement =>
  requiredElement<HTMLElement>(".v7-selection-dock");

const live = (): string =>
  document.querySelector("#v7-live")?.textContent ?? "";

const cultButtons = (): readonly (string | undefined)[] =>
  [...dock().querySelectorAll<HTMLElement>("[data-cult-ability]")].map(
    (button) => button.dataset.cultAbility,
  );

/** A frog's card: the frog, a badge of what it was and its name. */
function expectFrogCard(original: string): void {
  const identity = requiredElement<HTMLElement>(
    ".v7-selection-dock .v7-identity",
  );
  expect(identity.querySelector("h2")?.textContent).toBe("Frog");
  expect(
    identity.querySelector<HTMLElement>("[data-frog-was]")?.textContent,
  ).toBe(original);
  const art = requiredElement<HTMLElement>(
    ".v7-selection-dock .v7-identity-art",
  );
  expect(
    art.querySelector<HTMLElement>(":scope > img")?.dataset.chibiSubject,
  ).toBe("UNIT:CULT:FROG");
  expect(
    art.querySelector<HTMLElement>(".v7-frog-was-badge img")?.dataset
      .chibiSubject,
  ).toBe("PORTRAIT:KNIGHT");
}

const chips = (): readonly (readonly [string | undefined, string | null])[] =>
  [...dock().querySelectorAll<HTMLElement>(".v7-cult-chip")].map((chip) => [
    chip.dataset.unitStatus,
    chip.textContent,
  ]);

const panelButtons = (): readonly (string | undefined)[] =>
  [
    ...requiredElement<HTMLElement>("[data-v7-cult-pick]").querySelectorAll(
      "button",
    ),
  ].map((node) => node.dataset.action);

const stat = (id: string): string | null =>
  dock().querySelector(`[data-stat="${id}"] .v7-stat-value`)?.textContent ??
  null;

function escape(): void {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
}

const sameAt = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

function targetAt(scene: Scene, where: CoordV7) {
  return required(
    boardPlan(scene.host).targets.find((target) => sameAt(target.at, where)),
  );
}

function entries(scene: Scene, prefix: string) {
  return boardPlan(scene.host).entries.filter((entry) =>
    entry.key.startsWith(prefix),
  );
}

function marks(scene: Scene): readonly (readonly [string, CoordV7])[] {
  return boardPlan(scene.host)
    .entries.filter((entry) => entry.kind === "CULT_MARK")
    .map((entry) => [required(entry.cultMark).kind, entry.at] as const);
}

function unitMarks(scene: Scene, where: CoordV7) {
  return boardPlan(scene.host).entries.find(
    (entry) => entry.kind === "UNIT" && sameAt(entry.at, where),
  )?.cult;
}

/** What a player reads or hears of the dock: no raw ID, command, or tile. */
function expectPlainWords(element: HTMLElement): void {
  const words = [
    element.textContent ?? "",
    ...[...element.querySelectorAll("[title], [aria-label]"), element].flatMap(
      (node) => [
        node.getAttribute("title") ?? "",
        node.getAttribute("aria-label") ?? "",
      ],
    ),
  ].join(" | ");
  expect(words).not.toMatch(/[A-Z]{2,}_[A-Z]|\bu\d+\b|#\d+|\(\d+,\s*\d+\)/);
  expect(words).not.toMatch(
    /STARFALL|BEGIN_RITUAL|PROCLAIM|RIBBIT|SWITCHEROO|TENTACLE|undefined|null|NaN/,
  );
}

describe("Star-fall: the mark is chosen, then begun", () => {
  it("has one button whatever the number of tiles, and arms", () => {
    const scene = rig(cultStarfallUiFixtureV7());
    select(scene, R.stargazer);
    const offered = scene.controller
      .snapshot()
      .offeredCommands.filter((command) => command.kind === "BEGIN_RITUAL");
    expect(offered.length).toBeGreaterThan(30);
    expect(cultButtons()).toEqual(["starfall"]);
    expect(dock().querySelector('[data-action^="command-begin"]')).toBeNull();
    const button = requiredButton("cult-starfall");
    expect(button.querySelector(".v7-action-label")?.textContent).toBe(
      "Star-fall",
    );
    expect(button.getAttribute("aria-pressed")).toBe("false");
    // Unarmed, no tile of a star is on the board.
    expect(
      boardPlan(scene.host).targets.filter(
        (target) => target.family === "STARFALL",
      ),
    ).toEqual([]);
    button.click();
    expect(scene.host.lastModel?.interaction.cultPick).toEqual({
      kind: "STARFALL",
      unitId: scene.unitAt(R.stargazer).id,
      chosen: null,
    });
    expect(live()).toContain(CULT_TRICK_PICKS_V7.STARFALL);
    const panel = requiredElement<HTMLElement>("[data-v7-cult-pick]");
    expect(panel.dataset.v7CultPick).toBe("starfall");
    expect(panel.dataset.boardTargets).toBe(String(offered.length));
    expect(panelButtons()).toEqual(["pick-info", "cult-pick-cancel"]);
    const targets = boardPlan(scene.host).targets;
    expect(targets).toHaveLength(offered.length);
    for (const target of targets) {
      expect(target.family).toBe("STARFALL");
      expect(targetHighlightStyleV7(target.family)).toBe("PLACE");
      // A star begins alone (the Cult redesign, `pulp_wars-mch9.34`).
      expect(target.semanticLabel).toMatch(/^Star-fall here .*6 damage/);
      expect(target.semanticLabel).not.toMatch(/\d, ?\d/);
    }
    // Nobody is marked to chant: the Initiates join after the begin.
    expect(entries(scene, "ability-target:CHANT:")).toEqual([]);
    expectPlainWords(dock());
    scene.app.destroy();
  });

  it("previews the chosen mark, steps back, and begins on the second pick", async () => {
    const scene = rig(cultStarfallUiFixtureV7());
    const { controller, host } = scene;
    select(scene, R.stargazer);
    requiredButton("cult-starfall").click();
    host.callbacks?.onCommand(targetAt(scene, R.star));
    // Chosen, not begun.
    expect(controller.accepted).toEqual([]);
    expect(host.lastModel?.interaction.cultPick).toMatchObject({
      kind: "STARFALL",
      chosen: R.star,
    });
    expect(live()).toContain(RITUAL_CONFIRM_HINT_V7);
    const panel = requiredElement<HTMLElement>("[data-v7-cult-pick]");
    const summary = "6 damage · 3 units · 1 of yours";
    expect(panel.getAttribute("aria-label")).toBe(summary);
    expect(panel.querySelector(".v7-martian-detail")?.textContent).toBe(
      summary,
    );
    expect(panelButtons()).toEqual([
      "pick-info",
      "cult-ritual-begin",
      "cult-pick-cancel",
    ]);
    expect(panelButtons().length).toBeLessThanOrEqual(
      BOARD_PICK_PANEL_MAX_BUTTONS_V7,
    );
    // The board: the mark's chalk, its nine tiles, and each unit's hit.
    expect(marks(scene)).toEqual([["RITUAL_MARK", R.star]]);
    expect(entries(scene, "ability-area:STARFALL:")).toHaveLength(9);
    const hits = entries(scene, "ability-target:STARFALL:").map((entry) => [
      entry.at,
      entry.label,
      entry.abilityStyle,
      entry.lethal,
    ]);
    expect(hits).toHaveLength(3);
    expect(hits).toEqual(
      expect.arrayContaining([
        // The Knight has 6 HP left: the star alone takes them all.
        [R.starKnight, "−6", "BLAST", true],
        // An Initiate has 7 HP since the Cult redesign (`pulp_wars-mch9.31`).
        [R.starInitiate, "−6", "BLAST_FRIENDLY", false],
        [R.starFighter, "−6", "BLAST", false],
      ]),
    );
    expect(targetAt(scene, R.star).semanticLabel).toContain(
      RITUAL_CONFIRM_HINT_V7,
    );

    // Escape returns to choosing; a second Escape disarms.
    escape();
    expect(host.lastModel?.interaction.cultPick).toMatchObject({
      chosen: null,
    });
    escape();
    expect(host.lastModel?.interaction.cultPick ?? null).toBeNull();
    expect(controller.accepted).toEqual([]);

    // Another tile moves the mark; the same tile again begins.
    requiredButton("cult-starfall").click();
    host.callbacks?.onCommand(targetAt(scene, at(5, 5)));
    host.callbacks?.onCommand(targetAt(scene, R.star));
    expect(host.lastModel?.interaction.cultPick).toMatchObject({
      chosen: R.star,
    });
    host.callbacks?.onCommand(targetAt(scene, R.star));
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toMatchObject({
      kind: "BEGIN_RITUAL",
      ritual: "STARFALL",
      at: R.star,
    });
    await waitUntil(
      () => (host.lastModel?.interaction.cultPick ?? null) === null,
    );
    expect(live()).toContain("Star-fall begun");
    scene.app.destroy();
  });

  it("begins from the dock's one confirmation", async () => {
    const scene = rig(cultStarfallUiFixtureV7());
    select(scene, R.stargazer);
    requiredButton("cult-starfall").click();
    scene.host.callbacks?.onCommand(targetAt(scene, R.star));
    const begin = requiredButton("cult-ritual-begin");
    expect(begin.textContent).toBe("Begin");
    expect(begin.getAttribute("aria-label")).toMatch(
      /^Begin Star-fall\. 6 damage/,
    );
    begin.click();
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(
      required(scene.controller.snapshot().view).cult.rituals,
    ).toHaveLength(1);
    scene.app.destroy();
  });

  it("says why it cannot begin", () => {
    // A Stargazer that moved.
    let scene = rig(
      cultFieldV7([
        {
          seat: 0,
          role: "CATAPULT",
          at: R.stargazer,
          activation: { moved: true },
        },
        { seat: 0, role: "FIGHTER", at: R.chanter },
      ]),
    );
    select(scene, R.stargazer);
    let button = requiredButton("cult-starfall");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.dataset.disabledReason).toBe(STARFALL_MOVED_V7);
    button.click();
    expect(live()).toContain(STARFALL_MOVED_V7);
    scene.app.destroy();
    // Nobody to chant is no reason since the Cult redesign
    // (`pulp_wars-mch9.34`): a lone Stargazer begins it.
    document.body.innerHTML = '<div id="app"></div>';
    scene = rig(cultFieldV7([{ seat: 0, role: "CATAPULT", at: R.stargazer }]));
    select(scene, R.stargazer);
    button = requiredButton("cult-starfall");
    expect(button.getAttribute("aria-disabled")).toBeNull();
    expect(button.dataset.disabledReason).toBeUndefined();
    scene.app.destroy();
  });
});

describe("A ritual under way, for every viewer", () => {
  it("draws the rings, the mark, the countdown and the star's hits", () => {
    const scene = rig(cultStarfallBegunUiFixtureV7());
    expect(
      [...marks(scene)].sort((left, right) => left[0].localeCompare(right[0])),
    ).toEqual([
      ["COUNTDOWN", R.star],
      ["RITUAL_MARK", R.star],
      ["RITUAL_RING", R.chanter],
      ["RITUAL_RING", R.stargazer],
      ["RITUAL_RING", R.secondChanter],
    ]);
    const countdown = required(
      boardPlan(scene.host).entries.find(
        (entry) => entry.cultMark?.kind === "COUNTDOWN",
      ),
    );
    // Both Initiates chanting: 6 + 3 + 3.
    expect(countdown.cultMark).toEqual({
      kind: "COUNTDOWN",
      ritual: "STARFALL",
      turns: 1,
      damage: 12,
    });
    expect(countdown.label).toMatch(
      /^Star-fall lands here at the start of your next turn: 12 damage/,
    );
    expect(entries(scene, "ability-area:STARFALL:")).toHaveLength(9);
    expect(entries(scene, "ability-target:STARFALL:")).toHaveLength(3);
    // The leader wears the rite's badge; every participant is Candlelit.
    expect(unitMarks(scene, R.stargazer)).toMatchObject({
      candle: true,
      ritual: "STARFALL",
    });
    expect(unitMarks(scene, R.chanter)).toEqual({ candle: true });
    // None of it is a target.
    expect(boardPlan(scene.host).targets).toEqual([]);
    select(scene, R.stargazer);
    expect(chips()).toEqual([["chanting", "Leads the chant"]]);
    select(scene, R.chanter);
    expect(chips()).toEqual([["chanting", "Chanting"]]);
    expectPlainWords(dock());
    scene.app.destroy();
  });

  it("shows a rival the same marks, its Cowed capital, and its unit's hit", () => {
    const scene = rig(cultRitualRivalUiFixtureV7());
    expect(
      marks(scene)
        .map(([kind]) => kind)
        .sort(),
    ).toEqual([
      "COUNTDOWN",
      "COWED",
      "RITUAL_MARK",
      "RITUAL_RING",
      "RITUAL_RING",
    ]);
    const countdown = required(
      boardPlan(scene.host).entries.find(
        (entry) => entry.cultMark?.kind === "COUNTDOWN",
      ),
    );
    expect(countdown.label).toMatch(
      /^Star-fall lands here at the start of the Cultists' next turn: 9 damage/,
    );
    // The viewer's own units under the star wear the warning stripes.
    expect(
      entries(scene, "ability-target:STARFALL:").map((entry) => [
        entry.label,
        entry.abilityStyle,
      ]),
    ).toEqual([
      ["−9", "BLAST_FRIENDLY"],
      ["−9", "BLAST_FRIENDLY"],
    ]);
    // The Cowed capital: the banner on the board, the line in its panel.
    const capital = required(
      scene.view.cities.find((city) => city.ownerId === scene.view.viewer.id),
    );
    scene.host.callbacks?.onSelection({ kind: "CITY", cityId: capital.id });
    const cowed = requiredElement<HTMLElement>('[data-stat="cowed"]');
    expect(cowed.textContent).toContain("Cowed");
    expect(cowed.getAttribute("aria-label")).toMatch(/^Cowed\. A Herald/);
    scene.app.destroy();
  });
});

describe("The Great Summoning", () => {
  it("has one button with its price, and marks what each tile does", async () => {
    const scene = rig(cultSummoningUiFixtureV7());
    const { controller, host } = scene;
    select(scene, R.summoner);
    expect(cultButtons()).toContain("great-summoning");
    const button = requiredButton("cult-great-summoning");
    expect(button.querySelector(".v7-action-label")?.textContent).toBe(
      "Great Summoning",
    );
    expect(button.querySelector(".v7-favour-chip")?.textContent).toBe("−20");
    expect(button.getAttribute("aria-label")).toMatch(
      /^Great Summoning · −20 Favour\. /,
    );
    button.click();
    const targets = boardPlan(host).targets;
    expect(targets.length).toBeGreaterThanOrEqual(3);
    for (const target of targets) {
      expect(target.family).toBe("GREAT_SUMMONING");
      expect(targetHighlightStyleV7(target.family)).toBe("PLACE");
    }
    expect(targetAt(scene, R.free).previewLabel).toBeUndefined();
    expect(targetAt(scene, R.broken).previewLabel).toMatch(/^\+\d+ Favour$/);
    expect(targetAt(scene, R.healthy).previewLabel).toBe("Blocks");
    expect(targetAt(scene, R.healthy).semanticLabel).toMatch(
      /blocks the Herald, and the Favour is lost/,
    );
    expect(entries(scene, "ability-target:CHANT:")).toHaveLength(4);
    // Bead pulp_wars-mch9.24: the player's own chanters read "Chants" and
    // nothing else while a mark is sought ("+2 Favour" on each was noise).
    for (const where of R.circle) {
      expect(targetAt(scene, where).previewLabel, JSON.stringify(where)).toBe(
        undefined,
      );
      expect(targetAt(scene, where).semanticLabel).toMatch(
        /the unit on it is consumed for 2 Favour/,
      );
    }
    // Chosen as the mark, a chanter's tile says what the Herald does to it.
    const chanter = R.circle[1];
    host.callbacks?.onCommand(targetAt(scene, chanter));
    expect(controller.accepted).toEqual([]);
    expect(marks(scene)).toEqual([["RITUAL_MARK", chanter]]);
    expect(targetAt(scene, chanter).previewLabel).toBe("+2 Favour");
    expect(targetAt(scene, R.circle[0]).previewLabel).toBeUndefined();

    // Another tile moves the mark, and the chanter is quiet again.
    host.callbacks?.onCommand(targetAt(scene, R.free));
    expect(controller.accepted).toEqual([]);
    expect(targetAt(scene, chanter).previewLabel).toBeUndefined();
    const panel = requiredElement<HTMLElement>("[data-v7-cult-pick]");
    expect(panel.dataset.v7CultPick).toBe("great-summoning");
    expect(panel.getAttribute("aria-label")).toBe("4 chanters · 5 / 3");
    expect(marks(scene)).toEqual([["RITUAL_MARK", R.free]]);
    requiredButton("cult-ritual-begin").click();
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toMatchObject({
      kind: "BEGIN_RITUAL",
      ritual: "GREAT_SUMMONING",
      at: R.free,
    });
    const after = required(controller.snapshot().view);
    expect(favourOfV7(after, after.viewer.id)).toBe(2);
    expect(live()).toContain("The Great Summoning begun");
    scene.app.destroy();
  });

  it("shows the mark, and the unit that decides it", () => {
    let scene = rig(cultSummoningBegunUiFixtureV7());
    expect(marks(scene).filter(([kind]) => kind !== "RITUAL_RING")).toEqual([
      ["RITUAL_MARK", R.free],
      ["COUNTDOWN", R.free],
    ]);
    expect(entries(scene, "ability-target:SUMMONING:")).toEqual([]);
    expect(unitMarks(scene, R.summoner)).toMatchObject({
      ritual: "GREAT_SUMMONING",
    });
    scene.app.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    scene = rig(cultSummoningBlockedUiFixtureV7());
    expect(
      entries(scene, "ability-target:SUMMONING:").map((entry) => [
        entry.at,
        entry.label,
        entry.abilityStyle,
      ]),
    ).toEqual([[R.healthy, "Blocks", "MARTIAN_BLOCKED"]]);
    scene.app.destroy();
  });

  it("says why it cannot begin", () => {
    // Too little Favour.
    let scene = rig(withFavourV7(cultSummoningUiFixtureV7(), 0, 19));
    select(scene, R.summoner);
    expect(requiredButton("cult-great-summoning").dataset.disabledReason).toBe(
      ritualNeedsFavourTextV7(20),
    );
    scene.app.destroy();
    // A circle that has acted: the reason. Without a circle: no button.
    document.body.innerHTML = '<div id="app"></div>';
    const circle = (acted: boolean, count: number) =>
      withFavourV7(
        cultFieldV7([
          { seat: 0, role: "CAPTAIN", at: R.summoner },
          ...R.circle.slice(0, count).map((where) => ({
            seat: 0,
            role: "FIGHTER" as const,
            at: where,
            activation: { specialActed: acted },
          })),
        ]),
        0,
        30,
      );
    scene = rig(circle(true, 3));
    select(scene, R.summoner);
    expect(requiredButton("cult-great-summoning").dataset.disabledReason).toBe(
      greatSummoningChantersTextV7(),
    );
    scene.app.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    scene = rig(circle(false, 2));
    select(scene, R.summoner);
    expect(cultButtons()).not.toContain("great-summoning");
    expect(GREAT_SUMMONING_NO_TILE_V7).not.toMatch(/\d, ?\d/);
    scene.app.destroy();
  });
});

describe("Proclaim and the Cowed city", () => {
  it("arms, picks the city on the board, and cows it", async () => {
    const scene = rig(cultProclaimUiFixtureV7());
    const { controller, host } = scene;
    select(scene, R.herald);
    expect(cultButtons()).toEqual(["proclaim"]);
    // Ravage: both attacks left, as pips.
    expect(chips()).toContainEqual(["attacks", "Attacks"]);
    const pips = (): readonly (string | undefined)[] =>
      [...dock().querySelectorAll<HTMLElement>(".v7-cult-pip")].map(
        (pip) => pip.dataset.lit,
      );
    expect(pips()).toEqual(["true", "true"]);
    requiredButton("cult-proclaim").click();
    expect(live()).toContain(CULT_TRICK_PICKS_V7.PROCLAIM);
    expect(panelButtons()).toEqual(["pick-info", "cult-pick-cancel"]);
    const targets = boardPlan(host).targets;
    expect(targets.map((target) => [target.family, target.at])).toEqual([
      ["PROCLAIM", R.enemyCapital],
    ]);
    expect(targetHighlightStyleV7("PROCLAIM")).toBe("ATTACK");
    expect(targets[0]?.previewLabel).toBe("Kneel!");
    expect(targets[0]?.semanticLabel).toMatch(
      /^Proclaim at this city: .* The Herald keeps 1 attack\./,
    );
    host.callbacks?.onCommand(required(targets[0]));
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toMatchObject({ kind: "PROCLAIM" });
    expect(live()).toContain("KNEEL! The city is Cowed");
    await waitUntil(() => marks(scene).some(([kind]) => kind === "COWED"));
    expect(marks(scene)).toContainEqual(["COWED", R.enemyCapital]);
    select(scene, R.herald);
    expect(pips()).toEqual(["true", "false"]);
    // Cowed already: the one reason on the button.
    const button = requiredButton("cult-proclaim");
    expect(button.dataset.disabledReason).toBe(PROCLAIM_COWED_V7);
    scene.app.destroy();
  });

  it("marks a city that kneels already, in grey", () => {
    const scene = rig(cultCowedUiFixtureV7());
    expect(marks(scene)).toEqual([["COWED", R.enemyCapital]]);
    select(scene, R.herald);
    expect(requiredButton("cult-proclaim").dataset.disabledReason).toBe(
      PROCLAIM_COWED_V7,
    );
    const city = required(
      scene.view.cities.find((candidate) =>
        sameAt(candidate.at, R.enemyCapital),
      ),
    );
    scene.host.callbacks?.onSelection({ kind: "CITY", cityId: city.id });
    expect(requiredElement('[data-stat="cowed"]').textContent).toContain(
      "Cowed",
    );
    scene.app.destroy();
  });
});

describe("Ribbit and the frog", () => {
  it("arms, marks who can be hexed, and turns the Knight into a frog", async () => {
    const scene = rig(cultTricksUiFixtureV7());
    const { controller, host } = scene;
    select(scene, T.hexer);
    expect(cultButtons()).toEqual(["ribbit"]);
    requiredButton("cult-ribbit").click();
    expect(live()).toContain(CULT_TRICK_PICKS_V7.RIBBIT);
    const targets = boardPlan(host).targets;
    expect(targets.map((target) => [target.family, target.at])).toEqual([
      ["RIBBIT", T.knight],
    ]);
    expect(targetHighlightStyleV7("RIBBIT")).toBe("ATTACK");
    expect(targets[0]?.previewLabel).toBe("Frog");
    expect(targets[0]?.semanticLabel).toMatch(
      /^Turn this Knight into a frog until its next turn ends: Defense 0\.5, Move 1, no attack\./,
    );
    // The giant in reach keeps its reason in grey.
    expect(
      entries(scene, "ability-target:RIBBIT_BLOCKED:").map((entry) => [
        entry.at,
        entry.label,
        entry.abilityStyle,
      ]),
    ).toEqual([[T.giant, "Cannot be hexed", "MARTIAN_BLOCKED"]]);
    host.callbacks?.onCommand(required(targets[0]));
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toMatchObject({ kind: "RIBBIT" });
    expect(live()).toContain("Ribbit! The Knight is a frog");
    await waitUntil(() => unitMarks(scene, T.knight)?.frog !== undefined);

    // The frog's card: the frog with a badge and a line for what it was
    // (bead pulp_wars-mch9.26), its real numbers, and the chip.
    select(scene, T.knight);
    expectFrogCard("Knight");
    expect(chips()).toContainEqual(["frog", "Frog"]);
    expect(stat("defense")).toBe("0.5");
    expect(stat("move")).toBe("1");
    expect(stat("attack")).toBe("—");
    expect(dock().querySelectorAll('[data-frog="true"]')).toHaveLength(3);
    expect(dock().querySelector('[data-stat="defense"] button')).toBeNull();
    expectPlainWords(dock());

    // The Hexer: spent, with the reason on its button.
    select(scene, T.hexer);
    expect(chips()).toContainEqual(["hex-spent", "Spent"]);
    scene.app.destroy();
  });

  it("shows the cooldown as the button's reason on the next turn", () => {
    const scene = rig(cultTricksDoneUiFixtureV7());
    select(scene, T.hexer);
    const button = requiredButton("cult-ribbit");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.dataset.disabledReason).toBe(HEX_SPENT_V7);
    expect(chips()).toContainEqual(["hex-spent", "Spent"]);
    scene.app.destroy();
  });
});

describe("Switcheroo", () => {
  it("arms, shows each swap's ghosts on focus, and swaps", async () => {
    const scene = rig(cultTricksUiFixtureV7());
    const { controller, host } = scene;
    select(scene, T.familiar);
    expect(cultButtons()).toEqual(["switcheroo"]);
    requiredButton("cult-switcheroo").click();
    const targets = boardPlan(host).targets;
    expect(targets.length).toBeGreaterThanOrEqual(3);
    for (const target of targets) {
      expect(target.family).toBe("SWITCHEROO");
      expect(target.previewLabel).toBe("Swap");
      expect(target.cultFocus?.ghosts).toHaveLength(2);
    }
    const familiar = scene.unitAt(T.familiar);
    const knight = targetAt(scene, T.knight);
    expect(targetHighlightStyleV7(knight.family, knight.highlight)).toBe(
      "ATTACK",
    );
    expect(knight.semanticLabel).toMatch(/^Swap places with this Knight\./);
    expect(knight.cultFocus).toEqual({
      ghosts: [
        { unitId: familiar.id, at: T.knight },
        { unitId: scene.unitAt(T.knight).id, at: T.familiar },
      ],
      swap: { from: T.familiar, to: T.knight },
    });
    const own = targetAt(scene, T.hexer);
    expect(targetHighlightStyleV7(own.family, own.highlight)).toBe("SUPPORT");
    expect(own.semanticLabel).toMatch(/^Swap places with your Hexer\./);
    host.callbacks?.onCommand(knight);
    await waitUntil(() => controller.accepted.length === 1);
    const after = required(controller.snapshot().view);
    expect(after.units.find((unit) => unit.id === familiar.id)?.at).toEqual(
      T.knight,
    );
    scene.app.destroy();
  });
});

describe("Tentacle and Grab", () => {
  it("arms, marks whom each tile slaps, and calls it up", async () => {
    const scene = rig(cultTricksUiFixtureV7());
    const { controller, host } = scene;
    select(scene, T.caller);
    // The Summoner's (the Cult redesign, `pulp_wars-mch9.31`).
    expect(cultButtons()).toEqual(["summon", "tentacle"]);
    requiredButton("cult-tentacle").click();
    expect(live()).toContain(CULT_TRICK_PICKS_V7.TENTACLE);
    const targets = boardPlan(host).targets;
    expect(targets.length).toBeGreaterThan(20);
    for (const target of targets) {
      expect(target.family).toBe("TENTACLE");
      expect(targetHighlightStyleV7(target.family)).toBe("PLACE");
      expect(target.semanticLabel).not.toMatch(/\d, ?\d/);
    }
    // Beside the Human giant: it is slapped at once.
    const beside = targetAt(scene, at(7, 5));
    expect(beside.cultFocus?.marks).toEqual([
      { at: T.giant, label: "Slapped", friendly: false },
    ]);
    expect(beside.semanticLabel).toMatch(
      /It slaps and grabs the Juggernaut at once/,
    );
    // Beside the Summoner alone: its own unit, in the warning stripes.
    expect(targetAt(scene, at(8, 2)).cultFocus?.marks).toEqual([
      { at: T.caller, label: "Slapped", friendly: true },
    ]);
    const alone = targetAt(scene, at(9, 4));
    expect(alone.cultFocus).toBeUndefined();
    expect(alone.semanticLabel).toMatch(/Nobody stands beside it now/);
    host.callbacks?.onCommand(alone);
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toMatchObject({ kind: "TENTACLE" });
    await waitUntil(() => unitMarks(scene, at(9, 4))?.sinks === 3);
    scene.app.destroy();
  });

  it("says a Summoner's Tentacle is still up", () => {
    const scene = rig(
      withTentacleV7(cultTricksUiFixtureV7(), T.caller, at(9, 2)),
    );
    select(scene, T.caller);
    expect(requiredButton("cult-tentacle").dataset.disabledReason).toBe(
      TENTACLE_EXISTS_V7,
    );
    scene.app.destroy();
  });
});

describe("The hexes on the board and on the card, for their victim", () => {
  it("draws the frog, the Grab and the Tentacle's turns", () => {
    const scene = rig(cultTricksRivalUiFixtureV7());
    // The eye: the Tentacle beside it slaps it next (pulp_wars-mch9.24).
    expect(unitMarks(scene, T.knight)).toEqual({
      frog: {
        subject: "UNIT:CULT:FROG",
        original: "Knight",
        portraitSubject: "PORTRAIT:KNIGHT",
        artSubject: "UNIT:KNIGHT",
        afloat: false,
      },
      eye: true,
    });
    // The board draws the frog, not the Knight, and names both.
    const knightEntry = required(
      entries(scene, "unit:").find(
        (entry) => entry.at.x === T.knight.x && entry.at.y === T.knight.y,
      ),
    );
    expect(knightEntry.artSubject).toBe("UNIT:CULT:FROG");
    expect(knightEntry.label).toBe("Frog (Knight)");
    expect(unitMarks(scene, T.bearer)).toBeUndefined();
    expect(unitMarks(scene, T.tentacle)).toEqual({ sinks: 2 });
    expect(
      entries(scene, "cult-grab:").map((entry) => [
        entry.at,
        entry.linkTo,
        entry.cultLink,
      ]),
    ).toEqual([[T.tentacle, T.knight, { kind: "GRAB" }]]);
    expect(entries(scene, "cult-taunt:")).toHaveLength(0);
    // The viewer's own frog: the frog's card, its real numbers and every
    // chip. Its Fighter beside it keeps its own card.
    select(scene, T.fighter);
    expect(dock().querySelector(".v7-identity h2")?.textContent).toBe(
      "Fighter",
    );
    expect(dock().querySelector(".v7-frog-was-badge")).toBeNull();
    expect(dock().querySelector("[data-frog-was]")).toBeNull();
    select(scene, T.knight);
    expectFrogCard("Knight");
    expect(chips()).toEqual([
      ["frog", "Frog"],
      ["grabbed", "Grabbed"],
    ]);
    expect(
      [...dock().querySelectorAll<HTMLElement>(".v7-cult-chip")].every(
        (chip) => chip.dataset.harm === "true",
      ),
    ).toBe(true);
    expect(stat("defense")).toBe("0.5");
    expect(stat("move")).toBe("1");
    expect(stat("attack")).toBe("—");
    // A frog hops only next to the Tentacle that holds it, and attacks
    // nobody: the board offers no Attack.
    const targets = boardPlan(scene.host).targets;
    expect(targets.every((target) => target.family === "MOVE")).toBe(true);
    for (const target of targets)
      expect(
        Math.max(
          Math.abs(target.at.x - T.tentacle.x),
          Math.abs(target.at.y - T.tentacle.y),
        ),
      ).toBe(1);
    expectPlainWords(dock());
    scene.app.destroy();
  });

  it("refuses a frogged cultist's tricks with one reason", () => {
    const scene = rig(withFrogsV7(cultTricksUiFixtureV7(), [T.hexer]));
    select(scene, T.hexer);
    expect(requiredButton("cult-ribbit").dataset.disabledReason).toBe(
      TRICK_FROGGED_V7,
    );
    expect(stat("defense")).toBe("0.5");
    scene.app.destroy();
  });
});

describe("An Unbound Herald being bound again", () => {
  it("shows the binding as partly filled pips and the third strand on the button", () => {
    const state = cultHeraldBindUiFixtureV7();
    const scene = rig(state);
    const herald = required(
      viewForV7(state, state.humanPlayerId).units.find(
        (unit) => unit.summoned === "HERALD",
      ),
    );
    expect(unitMarks(scene, herald.at)).toMatchObject({
      unbound: true,
      control: { control: 3, strands: 2, binding: true },
    });
    scene.host.callbacks?.onSelection({ kind: "UNIT", unitId: herald.id });
    expect(chips()).toContainEqual(["control", "2 / 3"]);
    select(scene, at(5, 2));
    const bind = requiredButton("cult-channel");
    expect(bind.querySelector(".v7-action-label")?.textContent).toBe("Bind");
    expect(bind.querySelector(".v7-favour-chip")?.textContent).toBe("3 / 3");
    scene.app.destroy();
  });
});
