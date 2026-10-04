import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  applyCommandV7,
  queryPlayerCommandsV7,
  unitRoleRuleV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type MatchSetupV7,
  type UnitId,
} from "../../src/engine/index";
import { runMartianMobilityProbeMatchV7 } from "../../src/headless/martian-mobility-probe-match-v7";
import {
  chebyshevV7,
  chooseMartianMobilityProbeCommandV7,
  createMobilityProbeMemoryV7,
  indexProbeOfferedV7,
  probeBestPullV7,
  probeDangerV7,
  probeDeliverV7,
  probeExtractV7,
  probeFocusFireV7,
  probeFollowUpDamageV7,
  probeFrontAnchorV7,
  probeGoalV7,
  probeLethalV7,
  probeProductionV7,
  probeShootingMoveV7,
  probeToughnessV7,
  type MobilityProbeChoiceV7,
} from "../../src/headless/martian-mobility-probe-v7";
import {
  publicUnitAtV7,
  unitIdAtV7,
  viewerViewV7,
} from "../fixtures/v7-dinosaur-ai";
import { martianFieldV7, type MartianPieceV7 } from "../fixtures/v7-martian";

// `MARTIAN_MOBILITY_PROBE` (`pulp_wars-1wy.2`,
// docs/product/RULESET_7_BALANCE_MARTIAN_ICE.md section 8.2). Two-seat
// 11 x 11 field: seat 0 Martian (the viewer, capital (8, 8)), seat 1 Human
// (capital (2, 8)); villages (5, 5), (8, 5), (5, 8); every other land tile
// is open Grass. Roles: FIGHTER Grunt, MARKSMAN Ray Gunner, RAIDER Saucer,
// CAPTAIN Brain, KNIGHT Mothership.

const own = (
  role: MartianPieceV7["role"],
  x: number,
  y: number,
  extra: Partial<MartianPieceV7> = {},
): MartianPieceV7 => ({ seat: 0, role, at: { x, y }, ...extra });
const foe = (
  role: MartianPieceV7["role"],
  x: number,
  y: number,
  extra: Partial<MartianPieceV7> = {},
): MartianPieceV7 => ({ seat: 1, role, at: { x, y }, ...extra });
const at = (x: number, y: number): CoordV7 => ({ x, y });
const EXHAUSTED = {
  moved: true,
  attacked: true,
  attacksUsed: 1,
  recovered: true,
  captured: true,
  handled: true,
  specialActed: true,
};

const indexOf = (state: GameStateV7) =>
  indexProbeOfferedV7(queryPlayerCommandsV7(viewerViewV7(state)));

/** The probe's choices, each applied, until it defers to the Normal AI. */
function play(
  start: GameStateV7,
  limit = 8,
): { readonly choices: MobilityProbeChoiceV7[]; readonly state: GameStateV7 } {
  let state = start;
  const memory = createMobilityProbeMemoryV7();
  const choices: MobilityProbeChoiceV7[] = [];
  for (let step = 0; step < limit; step += 1) {
    const view = viewerViewV7(state);
    const choice = chooseMartianMobilityProbeCommandV7(view, memory);
    if (choice === null) break;
    // The probe only ever plays an offered command.
    expect(queryPlayerCommandsV7(view)).toContainEqual(choice.command);
    const applied = applyCommandV7(state, state.humanPlayerId, choice.command);
    expect(applied.accepted).toBe(true);
    if (!applied.accepted) break;
    choices.push(choice);
    state = applied.state;
  }
  return { choices, state };
}

const tools = (start: GameStateV7): readonly string[] =>
  play(start).choices.map((choice) => choice.tool);
/** The probe's choices that are not production. */
const tactics = (start: GameStateV7): readonly MobilityProbeChoiceV7[] =>
  play(start).choices.filter((choice) => !choice.tool.startsWith("TRAIN"));

describe("Martian mobility probe: gates", () => {
  it("defers for a seat that is not Martian", () => {
    const state = martianFieldV7(
      [own("FIGHTER", 5, 3), foe("FIGHTER", 3, 3, { hp: 1 })],
      { factions: ["ORIGINAL", "MARTIAN"] },
    );
    expect(
      chooseMartianMobilityProbeCommandV7(
        viewerViewV7(state),
        createMobilityProbeMemoryV7(),
      ),
    ).toBeNull();
  });

  it("never returns a command that is not in the offered list", () => {
    const state = martianFieldV7([
      own("KNIGHT", 5, 3),
      own("MARKSMAN", 6, 3),
      foe("FIGHTER", 3, 3, { hp: 6 }),
    ]);
    const view = viewerViewV7(state);
    // With nothing but End Turn offered there is nothing to choose.
    expect(
      chooseMartianMobilityProbeCommandV7(view, createMobilityProbeMemoryV7(), [
        { kind: "END_TURN" },
      ]),
    ).toBeNull();
    // With the pull withheld from the offer, the probe does not pull.
    const withheld = queryPlayerCommandsV7(view).filter(
      (command) => command.kind !== "TRACTOR_BEAM",
    );
    const choice = chooseMartianMobilityProbeCommandV7(
      view,
      createMobilityProbeMemoryV7(),
      withheld,
    );
    expect(choice?.command.kind).not.toBe("TRACTOR_BEAM");
    if (choice !== null) expect(withheld).toContainEqual(choice.command);
  });
});

describe("Martian mobility probe: danger", () => {
  it("sums the visible hostile hits that reach a tile", () => {
    const state = martianFieldV7([
      own("FIGHTER", 7, 3, { hp: 3, shield: 0 }),
      foe("FIGHTER", 5, 3),
    ]);
    const view = viewerViewV7(state);
    const grunt = publicUnitAtV7(state, at(7, 3));
    // A Fighter reaches two tiles (Move 1 and an attack), not four.
    expect(probeDangerV7(view, grunt, at(7, 3))).toBeGreaterThan(0);
    expect(probeDangerV7(view, grunt, at(9, 3))).toBe(0);
    expect(probeLethalV7(view, grunt, at(7, 3))).toBe(true);
    expect(probeLethalV7(view, grunt, at(9, 3))).toBe(false);
  });

  it("counts the Shield in what it takes to kill a unit", () => {
    const state = martianFieldV7([
      own("FIGHTER", 7, 3, { hp: 4 }),
      foe("FIGHTER", 5, 3),
    ]);
    const view = viewerViewV7(state);
    const grunt = publicUnitAtV7(state, at(7, 3));
    expect(probeToughnessV7(view, grunt)).toBe(6);
  });
});

describe("Martian mobility probe: focus fire", () => {
  it("kills a target with every shot that reaches it, and only then", () => {
    // `pulp_wars-1wy.3` (7r37): a Grunt (Attack 2) deals a Fighter at 9 HP
    // 5, so the kill takes both shots (at Attack 1.5 the target had 5 HP).
    const state = martianFieldV7([
      own("FIGHTER", 5, 3),
      own("FIGHTER", 5, 4),
      foe("FIGHTER", 3, 3, { hp: 9 }),
    ]);
    const target = unitIdAtV7(state, at(3, 3));
    const result = play(state);
    const shots = result.choices.filter(
      (choice) => choice.tool === "FOCUS_ATTACK",
    );
    expect(shots.length).toBe(2);
    for (const shot of shots)
      expect(shot.command).toMatchObject({
        kind: "ATTACK",
        targetUnitId: target,
      });
    expect(result.state.units.some((unit) => unit.id === target)).toBe(false);
  });

  it("leaves a target it cannot kill to the Normal attack scoring", () => {
    const state = martianFieldV7([own("FIGHTER", 5, 3), foe("FIGHTER", 3, 3)]);
    expect(tactics(state)).toEqual([]);
    expect(
      probeFocusFireV7(viewerViewV7(state), indexOf(state), {
        focusTargetId: null,
        pulledTargetIds: new Set(),
      }),
    ).toBeNull();
  });

  it("walks a ranged unit to two tiles from the target to finish it", () => {
    const state = martianFieldV7([
      own("FIGHTER", 5, 3),
      own("FIGHTER", 6, 2),
      // 9 HP (7r37): one shot is not enough, so the second Grunt walks up.
      foe("FIGHTER", 3, 3, { hp: 9 }),
    ]);
    const target = unitIdAtV7(state, at(3, 3));
    const result = play(state);
    const move = result.choices.find((choice) => choice.tool === "FOCUS_MOVE");
    expect(move?.command.kind).toBe("MOVE");
    const end =
      move?.command.kind === "MOVE" ? move.command.path.at(-1) : undefined;
    expect(end === undefined ? 0 : chebyshevV7(end, at(3, 3))).toBe(2);
    expect(result.state.units.some((unit) => unit.id === target)).toBe(false);
  });

  it("offers no shooting Move to a ray unit or a unit that has moved", () => {
    const state = martianFieldV7([
      own("MARKSMAN", 6, 3),
      own("FIGHTER", 6, 2, { activation: { moved: true } }),
      own("FIGHTER", 6, 4),
      foe("FIGHTER", 3, 3),
    ]);
    const view = viewerViewV7(state);
    const index = indexOf(state);
    const move = (x: number, y: number) =>
      probeShootingMoveV7(
        view,
        index,
        publicUnitAtV7(state, at(x, y)),
        at(3, 3),
      );
    expect(move(6, 3)).toBeNull();
    expect(move(6, 2)).toBeNull();
    expect(move(6, 4)).not.toBeNull();
  });
});

describe("Martian mobility probe: pulls", () => {
  it("pulls a unit into a kill and then shoots the pulled unit", () => {
    // The Ray Gunner reaches (4, 3), not (3, 3): only the pull makes the
    // kill.
    const state = martianFieldV7([
      own("KNIGHT", 5, 3),
      own("MARKSMAN", 6, 3),
      foe("FIGHTER", 3, 3, { hp: 6 }),
    ]);
    const view = viewerViewV7(state);
    const index = indexOf(state);
    const target = publicUnitAtV7(state, at(3, 3));
    const puller = new Set<UnitId>([unitIdAtV7(state, at(5, 3))]);
    expect(
      probeFollowUpDamageV7(view, index, target, at(3, 3), puller),
    ).toBeLessThan(probeToughnessV7(view, target));
    expect(
      probeFollowUpDamageV7(view, index, target, at(4, 3), puller),
    ).toBeGreaterThanOrEqual(probeToughnessV7(view, target));
    const pull = probeBestPullV7(view, index);
    expect(pull?.tool).toBe("PULL_KILL");
    expect(pull?.to).toEqual(at(4, 3));
    const result = play(state);
    expect(
      result.choices
        .filter((choice) => !choice.tool.startsWith("TRAIN"))
        .map((choice) => choice.tool),
    ).toEqual(["PULL_KILL", "FOCUS_ATTACK"]);
    expect(result.state.units.some((unit) => unit.id === target.id)).toBe(
      false,
    );
  });

  it("counts the Mothership's own attack after its free pull, from three tiles away", () => {
    // 7r37: the Heavy Tractor Beam reaches three tiles, pulls two, and is
    // free, so the Mothership pulls the Fighter next to itself and then
    // kills it with its own attack. A Saucer's pull is its primary action:
    // alone it sets up nothing.
    const state = martianFieldV7([
      own("KNIGHT", 5, 3),
      foe("FIGHTER", 2, 3, { hp: 5 }),
    ]);
    const target = unitIdAtV7(state, at(2, 3));
    const pull = probeBestPullV7(viewerViewV7(state), indexOf(state));
    expect(pull?.tool).toBe("PULL_KILL");
    expect(pull?.to).toEqual(at(4, 3));
    const result = play(state);
    expect(
      result.choices
        .filter((choice) => !choice.tool.startsWith("TRAIN"))
        .map((choice) => choice.tool),
    ).toEqual(["PULL_KILL", "FOCUS_ATTACK"]);
    expect(result.state.units.some((unit) => unit.id === target)).toBe(false);
    const saucer = martianFieldV7([
      own("RAIDER", 5, 3),
      foe("FIGHTER", 3, 3, { hp: 5 }),
    ]);
    expect(
      probeBestPullV7(viewerViewV7(saucer), indexOf(saucer))?.tool ?? "NONE",
    ).not.toBe("PULL_KILL");
  });

  it("does not pull a unit that nothing can finish", () => {
    // A Guard (17 HP): the Mothership's attack after its free pull (7r37)
    // and the Ray Gunner's full ray together do not kill it (they do kill
    // a Fighter now).
    const state = martianFieldV7([
      own("KNIGHT", 5, 3),
      own("MARKSMAN", 6, 3),
      foe("GUARD", 3, 3),
    ]);
    expect(probeBestPullV7(viewerViewV7(state), indexOf(state))).toBeNull();
  });

  it("pulls a defender off a hostile center and steps on", () => {
    const state = martianFieldV7([
      own("KNIGHT", 4, 8),
      own("FIGHTER", 3, 7),
      foe("FIGHTER", 2, 8),
    ]);
    const grunt = unitIdAtV7(state, at(3, 7));
    const result = play(state);
    expect(result.choices.map((choice) => choice.tool).slice(0, 2)).toEqual([
      "PULL_CITY",
      "STEP_ON_CENTER",
    ]);
    expect(result.state.units.find((unit) => unit.id === grunt)?.at).toEqual(
      at(2, 8),
    );
  });

  it("does not empty a center that no own unit can step on", () => {
    const state = martianFieldV7([own("KNIGHT", 4, 8), foe("FIGHTER", 2, 8)]);
    expect(probeBestPullV7(viewerViewV7(state), indexOf(state))).toBeNull();
  });
});

describe("Martian mobility probe: Beam Down", () => {
  it("delivers a city unit to a tile from which it has a target in range", () => {
    const state = martianFieldV7([
      own("RAIDER", 6, 4),
      own("FIGHTER", 8, 7),
      foe("FIGHTER", 3, 4),
    ]);
    const choice = probeDeliverV7(viewerViewV7(state), indexOf(state));
    expect(choice?.tool).toBe("DELIVER_ATTACK");
    const to = choice?.command.kind === "BEAM_DOWN" ? choice.command.to : null;
    // Two tiles from the Fighter: in the Grunt's range, out of a melee
    // answer.
    expect(to === null ? 0 : chebyshevV7(to, at(3, 4))).toBe(2);
    expect(tools(state)).toContain("DELIVER_ATTACK");
  });

  it("delivers a unit that has acted toward the enemy by route", () => {
    const state = martianFieldV7([
      own("RAIDER", 6, 4),
      own("FIGHTER", 8, 7, { activation: EXHAUSTED }),
      foe("FIGHTER", 3, 4),
    ]);
    const view = viewerViewV7(state);
    const choice = probeDeliverV7(view, indexOf(state));
    expect(choice?.tool).toBe("DELIVER_ROUTE");
    const to = choice?.command.kind === "BEAM_DOWN" ? choice.command.to : null;
    const goal = probeGoalV7(view, at(8, 7));
    expect(goal).not.toBeNull();
    if (to !== null && goal !== null)
      expect(chebyshevV7(to, goal)).toBeLessThan(chebyshevV7(at(8, 7), goal));
  });

  it("keeps the garrison of a city with a hostile unit nearby", () => {
    const state = martianFieldV7([
      own("RAIDER", 6, 6),
      own("FIGHTER", 8, 8, { activation: EXHAUSTED }),
      foe("FIGHTER", 6, 9),
      foe("FIGHTER", 2, 2),
    ]);
    expect(probeDeliverV7(viewerViewV7(state), indexOf(state))).toBeNull();
  });

  it("extracts a unit that has attacked from lethal reach to a safe tile", () => {
    const state = martianFieldV7([
      own("RAIDER", 9, 5),
      own("FIGHTER", 7, 7, {
        hp: 3,
        shield: 0,
        activation: { attacked: true, attacksUsed: 1 },
      }),
      foe("FIGHTER", 6, 6),
      foe("FIGHTER", 6, 7),
    ]);
    const view = viewerViewV7(state);
    const grunt = publicUnitAtV7(state, at(7, 7));
    const choice = probeExtractV7(view, indexOf(state));
    expect(choice?.tool).toBe("EXTRACT");
    const to = choice?.command.kind === "BEAM_DOWN" ? choice.command.to : null;
    expect(to).not.toBeNull();
    if (to !== null) expect(probeLethalV7(view, grunt, to)).toBe(false);
    expect(tools(state)).toContain("EXTRACT");
  });

  it("uses whatever Beam Down the engine offers: a pick-up away from a city by a carrier that moved", () => {
    // Since `pulp_wars-1wy.3` (7r37) the engine offers it (at 7r36 it did
    // not, and the probe was shown the command by hand). The probe reads
    // the offer, not the rule.
    const state = martianFieldV7([
      own("RAIDER", 5, 2, { activation: { moved: true, movedPathLength: 3 } }),
      own("FIGHTER", 6, 1, {
        hp: 3,
        shield: 0,
        activation: { attacked: true, attacksUsed: 1 },
      }),
      foe("FIGHTER", 7, 2),
      foe("FIGHTER", 7, 0),
    ]);
    const view = viewerViewV7(state);
    const pickUp: CommandV7 = {
      kind: "BEAM_DOWN",
      unitId: unitIdAtV7(state, at(5, 2)),
      passengerUnitId: unitIdAtV7(state, at(6, 1)),
      to: at(4, 3),
    };
    const offered = queryPlayerCommandsV7(view);
    expect(offered).toContainEqual(pickUp);
    // From the engine's own offer: the Grunt is picked up and set down on
    // a tile out of lethal reach.
    const real = chooseMartianMobilityProbeCommandV7(
      view,
      createMobilityProbeMemoryV7(),
    );
    expect(real?.tool).toBe("EXTRACT");
    expect(offered).toContainEqual(real?.command);
    expect(real?.command).toMatchObject({
      kind: "BEAM_DOWN",
      unitId: pickUp.unitId,
      passengerUnitId: pickUp.passengerUnitId,
    });
    const to = real?.command.kind === "BEAM_DOWN" ? real.command.to : null;
    expect(to).not.toBeNull();
    if (to !== null)
      expect(probeLethalV7(view, publicUnitAtV7(state, at(6, 1)), to)).toBe(
        false,
      );
    // And it still reads only what it is offered.
    const choice = chooseMartianMobilityProbeCommandV7(
      view,
      createMobilityProbeMemoryV7(),
      [pickUp, { kind: "END_TURN" }],
    );
    expect(choice).toEqual({ command: pickUp, tool: "EXTRACT" });
  });

  it("does not deliver a unit that cannot attack after moving to shoot on arrival", () => {
    // A beamed unit counts as moved (7r37): a Shield Projector never
    // attacks after moving, so a tile next to an enemy is no attack
    // delivery for it; a Grunt's is.
    const build = (role: "GUARD" | "FIGHTER") =>
      martianFieldV7([
        own("RAIDER", 6, 4),
        own(role, 8, 7),
        foe("FIGHTER", 3, 4),
      ]);
    const projector = build("GUARD");
    expect(
      probeDeliverV7(viewerViewV7(projector), indexOf(projector))?.tool ??
        "NONE",
    ).not.toBe("DELIVER_ATTACK");
    const grunt = build("FIGHTER");
    expect(probeDeliverV7(viewerViewV7(grunt), indexOf(grunt))?.tool).toBe(
      "DELIVER_ATTACK",
    );
    // The delivered Grunt then shoots: the engine offers it the attack.
    const delivered = play(grunt);
    expect(delivered.choices.map((choice) => choice.tool)).toContain(
      "DELIVER_ATTACK",
    );
    const gruntId = unitIdAtV7(grunt, at(8, 7));
    expect(
      queryPlayerCommandsV7(viewerViewV7(delivered.state)).some(
        (command) => command.kind === "ATTACK" && command.unitId === gruntId,
      ),
    ).toBe(true);
  });
});

describe("Martian mobility probe: carriers", () => {
  it("hovers a carrier within two tiles of the front, out of lethal reach", () => {
    const state = martianFieldV7([
      own("RAIDER", 9, 3),
      own("FIGHTER", 5, 3),
      foe("FIGHTER", 2, 3),
    ]);
    const view = viewerViewV7(state);
    expect(probeFrontAnchorV7(view)?.at).toEqual(at(5, 3));
    const move = tactics(state).find((choice) => choice.tool === "REPOSITION");
    const end =
      move?.command.kind === "MOVE" ? move.command.path.at(-1) : undefined;
    expect(end).toBeDefined();
    if (end === undefined) return;
    expect(chebyshevV7(end, at(5, 3))).toBeLessThanOrEqual(2);
    expect(probeLethalV7(view, publicUnitAtV7(state, at(9, 3)), end)).toBe(
      false,
    );
  });

  it("leaves a carrier alone when no enemy is known", () => {
    const state = martianFieldV7([own("RAIDER", 9, 1), own("FIGHTER", 9, 2)]);
    const view = viewerViewV7(state);
    if (probeGoalV7(view, at(9, 2)) === null)
      expect(probeFrontAnchorV7(view)).toBeNull();
    else expect(probeFrontAnchorV7(view)?.at).toEqual(at(9, 2));
  });

  it("trains a carrier while the army has fewer than one per three front units", () => {
    const state = martianFieldV7([
      own("FIGHTER", 5, 3),
      own("FIGHTER", 5, 4),
      foe("FIGHTER", 1, 1),
    ]);
    const view = viewerViewV7(state);
    const choice = probeProductionV7(view, indexOf(state));
    expect(choice?.command.kind).toBe("TRAIN");
    const role = choice?.command.kind === "TRAIN" ? choice.command.role : null;
    expect(role).not.toBeNull();
    if (role === null) return;
    const abilities = unitRoleRuleV7(view, {
      id: 0 as UnitId,
      ownerId: view.viewer.id,
      role,
    }).abilities;
    expect(
      abilities.includes("BEAM_DOWN") || abilities.includes("TRACTOR_BEAM"),
    ).toBe(true);
  });

  it("trains no further light carrier once it has one per three front units", () => {
    const state = martianFieldV7([
      own("FIGHTER", 5, 3),
      own("FIGHTER", 5, 4),
      own("RAIDER", 6, 3),
      foe("FIGHTER", 1, 1),
    ]);
    const choice = probeProductionV7(viewerViewV7(state), indexOf(state));
    expect(choice?.tool ?? "NONE").not.toBe("TRAIN_CARRIER");
  });
});

describe("Martian mobility probe: Mind Control", () => {
  it("takes the most valuable offered target first", () => {
    const state = martianFieldV7([
      own("CAPTAIN", 5, 3),
      foe("KNIGHT", 3, 3, { hp: 4 }),
      foe("FIGHTER", 4, 5, { hp: 4 }),
    ]);
    const choice = tactics(state)[0];
    expect(choice?.tool).toBe("MIND_CONTROL");
    expect(choice?.command).toMatchObject({
      kind: "MIND_CONTROL",
      targetUnitId: unitIdAtV7(state, at(3, 3)),
    });
  });
});

describe("Martian mobility probe: headless match", () => {
  const setup = (factions: MatchSetupV7["factions"]): MatchSetupV7 => ({
    rulesetId: RULESET_7_ID,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
    curiosities: false,
    seed: 3,
    width: 11,
    height: 11,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions,
    mapType: "DRY_LAND",
  });

  it("plays both seat orders without an error, a stall, or a rejection, deterministically", () => {
    for (const factions of [
      ["MARTIAN", "ORIGINAL"],
      ["ORIGINAL", "MARTIAN"],
    ] as const) {
      const options = { probe: true, maxRounds: 12 };
      const first = runMartianMobilityProbeMatchV7(setup(factions), options);
      expect(first.error).toBeNull();
      expect(first.termination).not.toBe("ERROR");
      expect(first.usage.turns).toBeGreaterThan(0);
      expect(runMartianMobilityProbeMatchV7(setup(factions), options)).toEqual(
        first,
      );
    }
  }, 120_000);

  it("the comparison run is the plain Normal AI: no probe command", () => {
    const game = runMartianMobilityProbeMatchV7(
      setup(["MARTIAN", "ORIGINAL"]),
      { probe: false, maxRounds: 8 },
    );
    expect(game.error).toBeNull();
    expect(Object.values(game.tools).every((count) => count === 0)).toBe(true);
  }, 120_000);
});
