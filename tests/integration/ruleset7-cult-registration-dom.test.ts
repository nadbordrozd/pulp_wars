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
      { seat: 0, role: "KNIGHT", at: at(5, 4) },
      { seat: 0, role: "SWORDSMAN", at: at(6, 4) },
      { seat: 0, role: "JUGGERNAUT", at: at(7, 4) },
      { seat: 1, role: "FIGHTER", at: at(3, 3) },
    ],
    { factions: ["CULT", "ORIGINAL"] },
  );
}

describe("the setup screen leaves the Cult out", () => {
  it("offers eight factions, seven opponents, and no Cult tribe card", () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    const counts = [
      ...requiredElement<HTMLSelectElement>("#v7-ai-count").options,
    ].map((option) => option.value);
    expect(counts).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    const own = requiredElement<HTMLSelectElement>("#v7-faction-0");
    expect([...own.options].map((option) => option.value)).toEqual([
      ...OFFERED_FACTION_IDS_V7,
    ]);
    expect(
      [...document.querySelectorAll<HTMLElement>(".v7-tribe-card")].map(
        (card) => card.dataset.faction,
      ),
    ).toEqual([...OFFERED_FACTION_IDS_V7]);
    // With every opponent seated, no seat plays the Cult.
    const field = requiredElement<HTMLSelectElement>("#v7-ai-count");
    field.value = "7";
    field.dispatchEvent(new Event("change", { bubbles: true }));
    const seats = [
      ...document.querySelectorAll<HTMLElement>(".v7-setup-seat"),
    ].map((cell) => cell.dataset.faction);
    expect(seats).toHaveLength(8);
    expect(seats).not.toContain("CULT");
    expect(document.body.textContent ?? "").not.toContain("Cultists");
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
        "Caller",
        "Chosen",
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
      [at(5, 4), "Caller"],
      [at(6, 4), "Chosen"],
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
