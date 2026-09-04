import { describe, expect, it } from "vitest";
import {
  UNIT_ROLE_IDS,
  createPlayableGameV6,
  effectiveRoleRuleV6,
  viewForV6,
  type FactionIdV6,
  type GameStateV6,
  type MatchSetupV6,
  type PlayerViewV6,
  type UnitRoleId,
} from "../../src/engine/index";
import {
  SPECIAL_UNIT_ABILITY_IDS_V6,
  UNIT_ABILITY_DETAILS_V6,
  selectedUnitPresentationV6,
} from "../../src/render/dom/unit-presentation-v6";

const EXPECTED_SPECIAL_ABILITIES: Readonly<
  Record<FactionIdV6, Readonly<Record<UnitRoleId, readonly string[]>>>
> = {
  ORIGINAL: {
    FIGHTER: [],
    SCOUT: ["IGNORE_ZOC_WITH_MANEUVER"],
    MARKSMAN: [],
    GUARD: [],
    RAIDER: ["CHARGE", "IGNORE_ZOC_WITH_MANEUVER"],
    MEDIC: ["HEAL_ADJACENT"],
    HEAVY: ["PUSH"],
    BREACHER: ["BREACH"],
    JUGGERNAUT: ["PUSH"],
  },
  CANDY: {
    FIGHTER: ["CANDIFY"],
    SCOUT: ["IGNORE_ZOC_WITH_MANEUVER", "CANDIFY"],
    MARKSMAN: ["CANDIFY"],
    GUARD: ["CANDIFY", "BUILD_CHOCOLATE_WALL"],
    RAIDER: ["CANDIFY", "KAMIKAZE_ROLL", "IGNORE_ZOC_WITH_MANEUVER"],
    MEDIC: ["HEAL_ADJACENT", "CANDIFY"],
    HEAVY: ["PUSH", "CANDIFY"],
    BREACHER: ["BREACH", "CANDIFY"],
    JUGGERNAUT: ["PUSH", "CANDIFY"],
  },
};

describe("ruleset-6 selected-unit presentation", () => {
  it("adapts every Original and Candy role directly from its canonical definition", () => {
    for (const faction of ["ORIGINAL", "CANDY"] as const) {
      const initial = publicView(faction);
      const selected = initial.units.find(
        (candidate) => candidate.ownerId === initial.viewer.id,
      );
      if (selected === undefined) throw new Error("Missing owned unit");
      for (const role of UNIT_ROLE_IDS) {
        const canonical = effectiveRoleRuleV6(faction, role);
        const view = viewWithUnit(initial, selected.id, {
          role,
          hp: canonical.maxHp,
          maxHp: canonical.maxHp,
        });
        const presentation = selectedUnitPresentationV6(view, selected.id);
        expect(presentation).not.toBeNull();
        expect(presentation?.label).toBe(canonical.label);
        expect(
          Object.fromEntries(
            presentation?.stats.map((stat) => [stat.id, stat.baseValue]) ?? [],
          ),
        ).toEqual({
          HP: String(canonical.maxHp),
          ATTACK: half(canonical.attack2),
          DEFENSE: half(canonical.defense2),
          MOVE: String(canonical.move),
          RANGE: String(canonical.range),
          SIGHT: String(canonical.sightRadius),
        });
        expect(presentation?.abilities.map((ability) => ability.id)).toEqual(
          EXPECTED_SPECIAL_ABILITIES[faction][role],
        );
        expect(
          new Set(presentation?.abilities.map((ability) => ability.id)).size,
        ).toBe(presentation?.abilities.length);
        expect(
          presentation?.abilities.map((ability) => ability.id),
        ).not.toContain("ATTACK");
        expect(
          presentation?.abilities.map((ability) => ability.id),
        ).not.toContain("CAPTURE");
      }
    }
  });

  it("keeps the Donut substitution exact, including zero Attack and Range", () => {
    const view = publicView("CANDY");
    const selected = view.units.find(
      (candidate) => candidate.ownerId === view.viewer.id,
    );
    if (selected === undefined) throw new Error("Missing owned unit");
    const presentation = selectedUnitPresentationV6(
      viewWithUnit(view, selected.id, {
        role: "RAIDER",
        hp: 10,
        maxHp: 10,
      }),
      selected.id,
    );
    expect(
      presentation?.stats.map((stat) => [stat.id, stat.label, stat.totalValue]),
    ).toEqual([
      ["HP", "HP", "10"],
      ["ATTACK", "Attack", "0"],
      ["DEFENSE", "Defense", "1.5"],
      ["MOVE", "Move", "1"],
      ["RANGE", "Range", "0"],
      ["SIGHT", "Sight", "1"],
    ]);
    expect(presentation?.abilities.map((ability) => ability.name)).toEqual([
      "Candify",
      "Kamikaze Roll",
      "Maneuver",
    ]);
  });

  it("defines one non-empty authoritative explanation for every special ability", () => {
    expect(Object.keys(UNIT_ABILITY_DETAILS_V6).sort()).toEqual(
      [...SPECIAL_UNIT_ABILITY_IDS_V6].sort(),
    );
    for (const ability of SPECIAL_UNIT_ABILITY_IDS_V6) {
      expect(UNIT_ABILITY_DETAILS_V6[ability]).toMatchObject({ id: ability });
      expect(UNIT_ABILITY_DETAILS_V6[ability].name.length).toBeGreaterThan(0);
      expect(
        UNIT_ABILITY_DETAILS_V6[ability].description.length,
      ).toBeGreaterThan(40);
    }
    expect(Object.isFrozen(UNIT_ABILITY_DETAILS_V6)).toBe(true);
  });

  it("returns no presentation for a hidden, stale, or ownerless unit", () => {
    const view = publicView("ORIGINAL");
    expect(
      selectedUnitPresentationV6(view, Number.MAX_SAFE_INTEGER),
    ).toBeNull();
    const selected = view.units[0];
    if (selected === undefined) throw new Error("Missing unit");
    expect(
      selectedUnitPresentationV6(
        {
          ...view,
          players: view.players.filter(
            (player) => player.id !== selected.ownerId,
          ),
        },
        selected.id,
      ),
    ).toBeNull();
  });
});

function half(value2: number): string {
  return value2 % 2 === 0 ? String(value2 / 2) : `${Math.floor(value2 / 2)}.5`;
}

function publicView(faction: FactionIdV6): PlayerViewV6 {
  const setup: MatchSetupV6 = {
    rulesetId: "pulp-wars-poc-6",
    mapGenerationRevision: "SPATIAL_ECONOMY",
    seed: 42,
    width: 11,
    height: 11,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [faction, faction === "ORIGINAL" ? "CANDY" : "ORIGINAL"],
  };
  const created = createPlayableGameV6(setup);
  if (!created.ok) throw new Error(created.error.code);
  return viewForV6(created.state, created.state.humanPlayerId);
}

function viewWithUnit(
  initial: PlayerViewV6,
  unitId: number,
  changes: Partial<GameStateV6["units"][number]>,
): PlayerViewV6 {
  const unit = initial.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined) throw new Error("Missing unit");
  const state = stateFromPublicView(initial);
  return viewForV6(
    {
      ...state,
      units: state.units.map((candidate) =>
        candidate.id === unitId ? { ...candidate, ...changes } : candidate,
      ),
    },
    initial.viewer.id,
  );
}

function stateFromPublicView(view: PlayerViewV6): GameStateV6 {
  return {
    schemaVersion: view.schemaVersion,
    rulesetId: view.rulesetId,
    setup: view.setup,
    random: { algorithm: "MULBERRY32", version: 1, state: 0 },
    humanPlayerId: view.humanPlayerId,
    nextEntityId: 1_000_000,
    commandIndex: view.commandIndex,
    round: view.round,
    activeSeatIndex: view.activeSeatIndex,
    turnOrder: view.turnOrder,
    board: view.board as GameStateV6["board"],
    players: view.players.map((player) =>
      player.id === view.viewer.id ? view.viewer : { ...player, explored: [] },
    ),
    cities: view.cities,
    populationContributions: view.populationContributions,
    units: view.units,
    chocolateWalls: view.chocolateWalls,
    treasureChests: view.treasureChests,
    pendingChoices: view.pendingChoices,
    outcome: view.outcome,
  };
}
