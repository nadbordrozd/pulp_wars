// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { bootstrapRuleset7App } from "../../src/app/index";
import {
  FACTION_IDS_V7,
  MAP_GENERATION_REVISION_V7,
  OFFERED_FACTION_IDS_V7,
  RULESET_7_ID,
  createPlayableGameV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import { FACTION_COLOURS_V7 } from "../../src/render/canvas/faction-colours-v7";
import { rewardStateV7 } from "../fixtures/v7-dinosaur-arena";
import { boardPlan, requiredElement, rig } from "../fixtures/v7-dom-rig";
import { at, fieldV7 } from "../fixtures/v7-revision20";
import { DEV_MODE_STORAGE_KEY_V7 } from "../../src/campaign/dev-mode-v7";

/**
 * The Cult registration in the DOM (`pulp_wars-mch9.3`): the faction is
 * registered and hidden. The setup screen offers neither the Cult nor a
 * ninth seat; a match that holds a Cult seat (a fixture, a headless save)
 * is shown with the Cult's names and colour and the shared stand-in art,
 * and nothing throws for want of Cult art, text, or sound.
 */

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
  // Every faction is offered in developer mode (pulp_wars-5xki locks
  // Ice Folk, Candy and the Cultists outside it).
  window.localStorage.setItem(DEV_MODE_STORAGE_KEY_V7, "1");
});

function select(scene: ReturnType<typeof rig>, where: CoordV7): void {
  scene.host.callbacks?.onSelection({
    kind: "UNIT",
    unitId: scene.unitAt(where).id,
  });
}

/** Seat 0 (the human) plays the Cult with every land unit on the board. */
function cultMatch(): GameStateV7 {
  return fieldV7(
    [
      { seat: 0, role: "FIGHTER", at: at(5, 2) },
      { seat: 0, role: "GUARD", at: at(6, 2) },
      { seat: 0, role: "RAIDER", at: at(7, 2) },
      { seat: 0, role: "MARKSMAN", at: at(5, 3) },
      { seat: 0, role: "CAPTAIN", at: at(6, 3) },
      { seat: 0, role: "CATAPULT", at: at(7, 3) },
      // (The Cult's KNIGHT and SWORDSMAN slots are vacant since the Cult
      // redesign, `pulp_wars-mch9.31`: no Caller, no Chosen.)
      { seat: 0, role: "JUGGERNAUT", at: at(7, 4) },
      { seat: 1, role: "FIGHTER", at: at(3, 3) },
    ],
    { factions: ["CULT", "ORIGINAL"] },
  );
}

describe("the setup screen offers the Cult (pulp_wars-mch9.20)", () => {
  it("offers nine factions, eight opponents, and a Cult tribe card", () => {
    // Opponents in registration order (quick start draws them at random).
    const app = bootstrapRuleset7App(document, {
      storage: null,
      randomDraw: () => 0,
    });
    const counts = [
      ...requiredElement<HTMLSelectElement>("#v7-ai-count").options,
    ].map((option) => option.value);
    expect(counts).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    const own = requiredElement<HTMLSelectElement>("#v7-faction-0");
    expect([...own.options].map((option) => option.value)).toEqual([
      ...OFFERED_FACTION_IDS_V7,
    ]);
    expect(
      [...document.querySelectorAll<HTMLElement>(".v7-tribe-card")].map(
        (card) => card.dataset.faction,
      ),
    ).toEqual([...OFFERED_FACTION_IDS_V7]);
    expect(OFFERED_FACTION_IDS_V7.at(-1)).toBe("CULT");
    expect(
      [...own.options].find((option) => option.value === "CULT")?.textContent,
    ).toBe("Cultists");
    const card = requiredElement<HTMLElement>(
      '.v7-tribe-card[data-faction="CULT"]',
    );
    expect(card.dataset.action).toBe("tribe-cult");
    expect(card.style.getPropertyValue("--player")).toBe(
      FACTION_COLOURS_V7.CULT,
    );
    expect(card.textContent).toContain("Cultists");
    // With every opponent seated, the ninth seat plays the Cult.
    const field = requiredElement<HTMLSelectElement>("#v7-ai-count");
    field.value = "8";
    field.dispatchEvent(new Event("change", { bubbles: true }));
    const seats = [
      ...document.querySelectorAll<HTMLElement>(".v7-setup-seat"),
    ].map((cell) => cell.dataset.faction);
    expect(seats).toHaveLength(9);
    expect(seats.at(-1)).toBe("CULT");
    expect(new Set(seats).size).toBe(9);
    // The player takes the Cult from the tribe grid: the seat that held it
    // switches to the faction the player left.
    card.click();
    expect(requiredElement<HTMLSelectElement>("#v7-faction-0").value).toBe(
      "CULT",
    );
    expect(card.getAttribute("aria-checked")).toBe("true");
    const after = [
      ...document.querySelectorAll<HTMLElement>(".v7-setup-seat"),
    ].map((cell) => cell.dataset.faction);
    expect(after[0]).toBe("CULT");
    expect(new Set(after).size).toBe(9);
    app.destroy();
  });
});

describe("a match with a Cult seat is shown with stand-in art", () => {
  it("mounts a Cult player's match and names every Cult unit in the dock", () => {
    const scene = rig(cultMatch());
    const plan = boardPlan(scene.host);
    const cult = plan.entries.filter(
      (entry) => entry.kind === "UNIT" && entry.faction === "CULT",
    );
    expect(cult.map((entry) => entry.label).sort()).toEqual(
      [
        "Familiar",
        "Hexer",
        "Idol Bearer",
        "Initiate",
        "Stargazer",
        "Summoner",
        "Thing in the Cellar",
      ].sort(),
    );
    for (const entry of cult) {
      expect(entry.artSubject).toMatch(/^UNIT:CULT:/);
      expect(entry.ownerColor).toBe(FACTION_COLOURS_V7.CULT);
    }
    const names: readonly (readonly [CoordV7, string])[] = [
      [at(5, 2), "Initiate"],
      [at(6, 2), "Idol Bearer"],
      [at(7, 2), "Familiar"],
      [at(5, 3), "Hexer"],
      [at(6, 3), "Summoner"],
      [at(7, 3), "Stargazer"],
      [at(7, 4), "Thing in the Cellar"],
    ];
    for (const [where, name] of names) {
      select(scene, where);
      expect(
        requiredElement<HTMLElement>(".v7-selection-dock").querySelector("h2")
          ?.textContent,
        name,
      ).toBe(name);
    }
    scene.app.destroy();
  });

  it("offers the Cult's own units in its capital, by name", () => {
    const scene = rig(cultMatch());
    const capital = scene.view.cities.find(
      (city) => city.ownerId === scene.view.viewer.id,
    );
    if (capital === undefined) throw new Error("no Cult capital");
    scene.host.callbacks?.onSelection({ kind: "CITY", cityId: capital.id });
    const text = document.body.textContent ?? "";
    for (const name of ["Initiate", "Idol Bearer", "Hexer", "Summoner"])
      expect(text, name).toContain(name);
    scene.app.destroy();
  });

  it("names two Initiates on the Militia card and the Thing on the giant card", () => {
    const militia = rig(rewardStateV7("MILITIA", "CULT").state);
    expect(document.body.textContent ?? "").toContain("Two free Initiates");
    militia.app.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    const giant = rig(rewardStateV7("JUGGERNAUT", "CULT").state);
    expect(document.body.textContent ?? "").toContain(
      "A free Thing in the Cellar, once",
    );
    giant.app.destroy();
  });

  it("mounts a nine-seat match with the Cult among the opponents", () => {
    const created = createPlayableGameV7({
      rulesetId: RULESET_7_ID,
      seed: 3,
      width: 25,
      height: 25,
      aiCount: 8,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: [...FACTION_IDS_V7],
      mapType: "DRY_LAND",
      mapGenerationRevision: MAP_GENERATION_REVISION_V7,
      curiosities: false,
    });
    if (!created.ok) throw new Error(created.error.code);
    const scene = rig(created.state);
    expect(scene.view.players).toHaveLength(9);
    expect(scene.view.leaderboard.map((entry) => entry.faction)).toContain(
      "CULT",
    );
    expect(boardPlan(scene.host).entries.length).toBeGreaterThan(0);
    scene.app.destroy();
  });
});
