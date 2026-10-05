import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  previewBoardV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  buildBoardRenderPlanV7,
  type BoardRenderInteractionV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  navalAttackTargetExtrasV7,
  navalUnitMarkersV7,
} from "../../src/render/canvas/naval-board-plan-v7";
import {
  NAVAL_MARKER_FRAME_V7,
  drawNavalUnitMarkersV7,
} from "../../src/render/canvas/naval-canvas-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import {
  TARGET_HIGHLIGHT_FAMILIES_V7,
  targetHighlightStyleV7,
  targetIsSteppedV7,
} from "../../src/render/canvas/target-highlight-v7";
import {
  BOARD_ALREADY_ACTED_V7,
  BOARD_NO_WEAK_SHIP_V7,
  NAVAL_HELP_RULES_V7,
  NAVAL_RAM_LABEL_V7,
  RAM_PREVIEW_V7,
  RAM_SHOVE_BLOCKED_V7,
  RAM_SHOVE_V7,
  SUBMERGED_OUT_OF_REACH_V7,
  TORPEDO_PREVIEW_V7,
  boardBlockTextV7,
  boardUnavailableTextV7,
  navalBoundaryNoticeV7,
  navalCombatLinesV7,
  viewerHarbourPopulationV7,
  viewerMayBoardV7,
} from "../../src/render/naval-presentation-v7";
import {
  recruitmentRolePresentationV7,
  roleAbilityNameV7,
} from "../../src/render/role-presentation-v7";
import { navalUnitAtV7, patchNavalUnitV7 } from "../fixtures/v7-naval-branch";
import {
  NAVAL_UI_V7,
  navalBoardingUiFixtureV7,
  navalHarboursUiFixtureV7,
  navalRamUiFixtureV7,
  navalSubmarineUiFixtureV7,
} from "../fixtures/v7-naval-ui";

// The naval branch interface (bead pulp_wars-5ti.7, first part;
// docs/ui/BOARD_TARGETING.md section 3.4): the board plan, the words and
// the markers of Board, the Bow Ram, the Submarine and Harbours.

const COORDINATE = /\b\d{1,2}, ?\d{1,2}\b/;

function viewOf(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, state.humanPlayerId);
}

function unitAt(view: PlayerViewV7, at: CoordV7) {
  const unit = view.units.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (unit === undefined) throw new Error("unit missing");
  return unit;
}

function plan(
  view: PlayerViewV7,
  unitId: number,
  extra: Partial<BoardRenderInteractionV7> = {},
) {
  return buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
    selection: { kind: "UNIT", unitId },
    selectedUnitId: unitId,
    selectedAchievement: null,
    ...extra,
  });
}

const at = (coord: CoordV7): string => `${coord.x},${coord.y}`;

describe("Board on the board plan", () => {
  it("is one family in the Attack style, stepped with Tab", () => {
    expect(TARGET_HIGHLIGHT_FAMILIES_V7).toContain("BOARD");
    expect(targetHighlightStyleV7("BOARD")).toBe("ATTACK");
    expect(targetIsSteppedV7("BOARD")).toBe(true);
  });

  it("unarmed, a boarder's prizes are plain attack targets and wear the hook", () => {
    const view = viewOf(navalBoardingUiFixtureV7());
    const boarder = unitAt(view, NAVAL_UI_V7.boarder);
    const built = plan(view, boarder.id);
    // The three enemy boats are attack targets; none is a Board target.
    expect(
      built.targets
        .filter((target) => target.family === "ATTACK")
        .map((target) => at(target.at))
        .sort(),
    ).toEqual([...NAVAL_UI_V7.prizes, NAVAL_UI_V7.healthy].map(at).sort());
    expect(built.targets.some((target) => target.family === "BOARD")).toBe(
      false,
    );
    // The hook marks the ships at or below their boarding line, for both
    // sides, and never a healthy ship.
    const marked = built.entries
      .filter((entry) => entry.kind === "UNIT" && entry.naval?.boardable)
      .map((entry) => at(entry.at))
      .sort();
    expect(marked).toEqual(NAVAL_UI_V7.prizes.map(at).sort());
    const enemyState = navalBoardingUiFixtureV7();
    const enemyView = viewForV7(
      enemyState,
      unitAt(view, NAVAL_UI_V7.healthy).ownerId,
    );
    expect(
      navalUnitMarkersV7(enemyView, unitAt(enemyView, NAVAL_UI_V7.prizes[0])),
    ).toEqual({ submerged: false, boardable: true });
  });

  it("armed, only the offered prizes are targets, each with the engine's exact HP", () => {
    const view = viewOf(navalBoardingUiFixtureV7());
    const boarder = unitAt(view, NAVAL_UI_V7.boarder);
    const built = plan(view, boarder.id, {
      navalPick: { kind: "BOARD", unitId: boarder.id },
    });
    expect(built.targets.map((target) => target.family)).toEqual([
      "BOARD",
      "BOARD",
    ]);
    for (const target of built.targets) {
      if (target.command.kind !== "BOARD") throw new Error("not a Board");
      const preview = previewBoardV7(
        view,
        boarder.id,
        target.command.targetUnitId,
      );
      expect(preview).not.toBeNull();
      expect(target.previewLabel).toBe(`Take · ${preview?.hpAfter ?? 0} HP`);
      expect(target.semanticLabel).toContain("becomes yours with 4 HP");
      expect(target.semanticLabel).not.toMatch(COORDINATE);
    }
    expect(built.targets.map((target) => at(target.at)).sort()).toEqual(
      NAVAL_UI_V7.prizes.map(at).sort(),
    );
    // The healthy boat keeps a grey reason and is no target.
    const blocked = built.entries.filter((entry) =>
      entry.key.startsWith("ability-target:BOARD_BLOCKED:"),
    );
    expect(blocked.map((entry) => [at(entry.at), entry.label])).toEqual([
      [at(NAVAL_UI_V7.healthy), "Above 3 HP"],
    ]);
  });

  it("names the engine's rejection reasons", () => {
    expect(boardBlockTextV7("TARGET_IMMUNE", null)).toBe("Not a ship");
    expect(boardBlockTextV7("OUT_OF_RANGE", 3)).toBe("Too far");
    expect(boardBlockTextV7("TARGET_HEALTHY", 8)).toBe("Above 8 HP");
  });

  it("explains a Board that is not offered only where a ship could be boarded", () => {
    const state = navalBoardingUiFixtureV7();
    const view = viewOf(state);
    const boarder = unitAt(view, NAVAL_UI_V7.boarder);
    expect(viewerMayBoardV7(view)).toBe(true);
    expect(boardUnavailableTextV7(view, boarder, true)).toBeNull();
    // The boarder already acted: the prizes are still there.
    expect(boardUnavailableTextV7(view, boarder, false)).toBe(
      BOARD_ALREADY_ACTED_V7,
    );
    // Only a healthy ship next to it.
    let healthy = state;
    for (const prize of NAVAL_UI_V7.prizes)
      healthy = patchNavalUnitV7(healthy, navalUnitAtV7(healthy, prize).id, {
        hp: 10,
      });
    const healthyView = viewOf(healthy);
    expect(
      queryPlayerCommandsV7(healthyView).some(
        (command) => command.kind === "BOARD",
      ),
    ).toBe(false);
    expect(
      boardUnavailableTextV7(
        healthyView,
        unitAt(healthyView, NAVAL_UI_V7.boarder),
        false,
      ),
    ).toBe(BOARD_NO_WEAK_SHIP_V7);
    // Nothing afloat next to a ship: no button at all.
    const alone = viewOf(navalSubmarineUiFixtureV7());
    expect(
      boardUnavailableTextV7(
        alone,
        unitAt(alone, NAVAL_UI_V7.farBattleship),
        false,
      ),
    ).toBeNull();
  });

  it("announces a boarding without coordinates", () => {
    const state = navalBoardingUiFixtureV7();
    const before = viewOf(state);
    const command: CommandV7 = {
      kind: "BOARD",
      unitId: unitAt(before, NAVAL_UI_V7.boarder).id,
      targetUnitId: unitAt(before, NAVAL_UI_V7.prizes[0]).id,
    };
    const result = applyCommandV7(state, state.humanPlayerId, command);
    if (!result.accepted) throw new Error("Board rejected");
    const after = viewOf(result.state);
    const events = projectEventsV7(
      state,
      result.state,
      state.humanPlayerId,
      result.events,
    ).events;
    expect(navalBoundaryNoticeV7(events, before, after)).toEqual({
      text: "You boarded Player 2's Patrol Boat",
      toast: true,
    });
    expect(navalBoundaryNoticeV7([], before, after)).toBeNull();
  });
});

describe("the Bow Ram in the attack preview", () => {
  it("shows the bonus and the shove tile from the public preview", () => {
    const view = viewOf(navalRamUiFixtureV7());
    const rammer = unitAt(view, NAVAL_UI_V7.rammer);
    const target = unitAt(view, NAVAL_UI_V7.rammed);
    const preview = queryCombatPreviewV7(view, rammer.id, target.id);
    expect(preview?.ram).toBe(true);
    expect(preview?.push).toBe("WILL_PUSH");
    if (preview === null) throw new Error("preview missing");
    expect(navalCombatLinesV7(view, preview)).toEqual({
      notes: [RAM_PREVIEW_V7, RAM_SHOVE_V7],
      shove: { to: NAVAL_UI_V7.shoveTo, blocked: false },
    });
    const attack = plan(view, rammer.id).targets.find(
      (candidate) => candidate.family === "ATTACK",
    );
    expect(attack?.previewLabel).toBe(
      `Deal ${preview.damageToDefender} · take ${preview.damageToAttacker}`,
    );
    expect(attack?.previewNote).toBe("Bow Ram +1 · Shoves back");
    expect(attack?.knockback).toEqual({
      to: NAVAL_UI_V7.shoveTo,
      blocked: false,
    });
    expect(attack?.semanticLabel).toContain("Bow Ram +1. Shoves back.");
    expect(attack?.semanticLabel).not.toMatch(COORDINATE);
  });

  it("shows a blocked shove", () => {
    const view = viewOf(navalRamUiFixtureV7(true));
    const rammer = unitAt(view, NAVAL_UI_V7.rammer);
    const target = unitAt(view, NAVAL_UI_V7.rammed);
    const preview = queryCombatPreviewV7(view, rammer.id, target.id);
    expect(preview?.ram).toBe(true);
    expect(preview?.push).toBe("BLOCKED");
    const attack = plan(view, rammer.id).targets.find(
      (candidate) =>
        candidate.family === "ATTACK" &&
        at(candidate.at) === at(NAVAL_UI_V7.rammed),
    );
    expect(attack?.previewNote).toBe(
      `${RAM_PREVIEW_V7} · ${RAM_SHOVE_BLOCKED_V7}`,
    );
    expect(attack?.knockback).toEqual({
      to: NAVAL_UI_V7.shoveTo,
      blocked: true,
    });
  });

  it("leaves every other attack preview unchanged", () => {
    const view = viewOf(navalBoardingUiFixtureV7());
    const boarder = unitAt(view, NAVAL_UI_V7.boarder);
    const target = unitAt(view, NAVAL_UI_V7.healthy);
    const preview = queryCombatPreviewV7(view, boarder.id, target.id);
    expect(preview?.ram).toBe(false);
    expect(navalAttackTargetExtrasV7(view, preview)).toBeNull();
    expect(navalAttackTargetExtrasV7(view, null)).toBeNull();
  });

  it("slides the shoved boat back with a hit flash and a splash", () => {
    const state = navalRamUiFixtureV7();
    const before = viewOf(state);
    const rammer = unitAt(before, NAVAL_UI_V7.rammer);
    const target = unitAt(before, NAVAL_UI_V7.rammed);
    const result = applyCommandV7(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: rammer.id,
      targetUnitId: target.id,
    });
    if (!result.accepted) throw new Error("ram rejected");
    const after = viewOf(result.state);
    const steps = corePresentationPlanV7(
      before,
      projectEventsV7(state, result.state, state.humanPlayerId, result.events),
      after,
    );
    expect(
      steps.some(
        (step) => step.kind === "DINOSAUR" && step.effect === "CHARGE_HIT",
      ),
    ).toBe(true);
    const slide = steps.find(
      (step) => step.kind === "MOVE" && step.unitId === target.id,
    );
    expect(slide).toMatchObject({
      path: [NAVAL_UI_V7.rammed, NAVAL_UI_V7.shoveTo],
      pushSlide: true,
    });
    expect(
      steps.some(
        (step) =>
          step.kind === "DWARF" &&
          step.effect === "KNOCKBACK" &&
          at(step.cells[0] ?? { x: -1, y: -1 }) === at(NAVAL_UI_V7.shoveTo),
      ),
    ).toBe(true);
  });
});

describe("the Submarine on the board plan", () => {
  it("marks a submerged Submarine of either side", () => {
    const view = viewOf(navalSubmarineUiFixtureV7());
    for (const coord of [NAVAL_UI_V7.enemySubmarine, NAVAL_UI_V7.ownSubmarine])
      expect(navalUnitMarkersV7(view, unitAt(view, coord))).toEqual({
        submerged: true,
        boardable: false,
      });
    expect(
      navalUnitMarkersV7(view, unitAt(view, NAVAL_UI_V7.farBattleship)),
    ).toBeUndefined();
    const built = plan(view, unitAt(view, NAVAL_UI_V7.adjacentBoat).id);
    expect(
      built.entries
        .filter((entry) => entry.kind === "UNIT" && entry.naval?.submerged)
        .map((entry) => at(entry.at))
        .sort(),
    ).toEqual(
      [NAVAL_UI_V7.enemySubmarine, NAVAL_UI_V7.ownSubmarine].map(at).sort(),
    );
  });

  it("offers it only to an adjacent attacker and says why to a far one", () => {
    const view = viewOf(navalSubmarineUiFixtureV7());
    const near = plan(view, unitAt(view, NAVAL_UI_V7.adjacentBoat).id);
    expect(
      near.targets
        .filter((target) => target.family === "ATTACK")
        .map((target) => at(target.at)),
    ).toEqual([at(NAVAL_UI_V7.enemySubmarine)]);
    expect(
      near.entries.some((entry) =>
        entry.key.startsWith("ability-target:SUBMERGED:"),
      ),
    ).toBe(false);
    const far = plan(view, unitAt(view, NAVAL_UI_V7.farBattleship).id);
    expect(
      far.targets.some(
        (target) =>
          target.family === "ATTACK" &&
          at(target.at) === at(NAVAL_UI_V7.enemySubmarine),
      ),
    ).toBe(false);
    expect(
      far.entries
        .filter((entry) => entry.key.startsWith("ability-target:SUBMERGED:"))
        .map((entry) => [at(entry.at), entry.label, entry.abilityStyle]),
    ).toEqual([
      [
        at(NAVAL_UI_V7.enemySubmarine),
        SUBMERGED_OUT_OF_REACH_V7,
        "MARTIAN_BLOCKED",
      ],
    ]);
  });

  it("a torpedo is offered only at targets afloat and draws no strike-back", () => {
    const view = viewOf(navalSubmarineUiFixtureV7());
    const submarine = unitAt(view, NAVAL_UI_V7.ownSubmarine);
    const built = plan(view, submarine.id);
    const attacks = built.targets.filter(
      (target) => target.family === "ATTACK",
    );
    expect(attacks.map((target) => at(target.at))).toEqual([
      at(NAVAL_UI_V7.torpedoed),
    ]);
    const preview = queryCombatPreviewV7(
      view,
      submarine.id,
      unitAt(view, NAVAL_UI_V7.torpedoed).id,
    );
    expect(preview?.torpedo).toBe(true);
    expect(preview?.damageToAttacker).toBe(0);
    expect(preview?.defenderDies).toBe(true);
    // A kill needs no note; a survivor's preview says it cannot answer.
    expect(attacks[0]?.previewNote).toBeUndefined();
    const battleshipState = patchNavalUnitV7(
      navalSubmarineUiFixtureV7(),
      unitAt(view, NAVAL_UI_V7.torpedoed).id,
      { role: "BATTLESHIP", hp: 25, maxHp: 25 },
    );
    const battleshipView = viewOf(battleshipState);
    const survivor = plan(battleshipView, submarine.id).targets.find(
      (target) => target.family === "ATTACK",
    );
    // The fixture's enemy is Undead, whose matches already write "No
    // retaliation" for every unanswered attack: one line, not two.
    expect(survivor?.previewNote).toBe("No retaliation");
    expect(survivor?.previewLabel).toMatch(/^Deal \d+ · take 0$/);
    const survivorPreview = queryCombatPreviewV7(
      battleshipView,
      submarine.id,
      unitAt(battleshipView, NAVAL_UI_V7.torpedoed).id,
    );
    expect(survivorPreview?.noRetaliationReason).toBe("UNANSWERED");
    // In every other match the torpedo says it itself.
    expect(
      navalAttackTargetExtrasV7(battleshipView, survivorPreview)?.notes,
    ).toEqual([TORPEDO_PREVIEW_V7]);
    expect(
      navalAttackTargetExtrasV7(battleshipView, survivorPreview, {
        unansweredNoted: true,
      })?.notes,
    ).toEqual([]);
  });
});

describe("naval words", () => {
  it("names the boats' ram apart from the Goblin Scrap Buggy's Ram", () => {
    expect(NAVAL_RAM_LABEL_V7).toBe("Bow Ram");
    for (const faction of ["ORIGINAL", "GOBLIN", "CANDY"] as const)
      expect(roleAbilityNameV7("RAM", faction)).toBe("Bow Ram");
    expect(roleAbilityNameV7("OVERRUN", "GOBLIN")).toBe("Ram");
    const boat = recruitmentRolePresentationV7("PATROL_BOAT", "GOBLIN");
    expect(boat.abilities.some((line) => line.startsWith("Bow Ram: "))).toBe(
      true,
    );
    const submarine = recruitmentRolePresentationV7("SUBMARINE", "ORIGINAL");
    expect(submarine.abilities).toEqual(
      expect.arrayContaining([
        "Submerged: Can only be attacked from an adjacent tile.",
        "Torpedo: Attacks only boats and transports, which cannot strike back.",
      ]),
    );
  });

  it("has one Help sentence per rule", () => {
    expect(NAVAL_HELP_RULES_V7.map(([name]) => name)).toEqual([
      "Bow Ram",
      "Board",
      "Submerged",
      "Torpedo",
      "Harbours",
    ]);
    for (const [, sentence] of NAVAL_HELP_RULES_V7) {
      expect(sentence.endsWith(".")).toBe(true);
      expect(sentence).not.toMatch(COORDINATE);
    }
  });

  it("reads Harbours from the viewer's capability", () => {
    expect(viewerHarbourPopulationV7(viewOf(navalHarboursUiFixtureV7()))).toBe(
      1,
    );
    expect(
      viewerHarbourPopulationV7(
        viewOf(navalHarboursUiFixtureV7({ harbours: false })),
      ),
    ).toBe(0);
  });
});

describe("naval markers on the canvas", () => {
  function recorder() {
    const calls: string[] = [];
    const arcs: (readonly [number, number, number])[] = [];
    const context = new Proxy(
      {},
      {
        get: (target, key) =>
          key in target
            ? Reflect.get(target, key)
            : (...args: number[]) => {
                calls.push(String(key));
                if (key === "arc")
                  arcs.push([args[0] ?? 0, args[1] ?? 0, args[2] ?? 0]);
              },
        set: (target, key, value) => Reflect.set(target, key, value),
      },
    ) as CanvasRenderingContext2D;
    return { context, calls, arcs };
  }

  it("draws the wash and the periscope badge of a submerged Submarine", () => {
    const { context, calls, arcs } = recorder();
    drawNavalUnitMarkersV7(
      context,
      { submerged: true, boardable: false },
      100,
      200,
      1,
    );
    const frame = NAVAL_MARKER_FRAME_V7.submerged;
    expect(arcs).toEqual([[100 + frame.x, 200 + frame.y, frame.radius]]);
    // Two wave lines, cased and coloured, and the badge's own wave.
    expect(
      calls.filter((call) => call === "quadraticCurveTo").length,
    ).toBeGreaterThanOrEqual(4 * 6 + 2);
    // Each wave line is stroked twice (its casing, then its colour).
    expect(calls.filter((call) => call === "stroke").length).toBe(7);
    expect(calls.at(0)).toBe("save");
    expect(calls.at(-1)).toBe("restore");
  });

  it("draws the hook badge of a boardable ship at the zoom", () => {
    const { context, arcs } = recorder();
    drawNavalUnitMarkersV7(
      context,
      { submerged: false, boardable: true },
      0,
      0,
      2,
      { highContrast: true },
    );
    const frame = NAVAL_MARKER_FRAME_V7.boardable;
    expect(arcs[0]).toEqual([frame.x * 2, frame.y * 2, frame.radius * 2]);
    // The badge, the claw and the ring.
    expect(arcs).toHaveLength(3);
  });

  it("draws nothing for a ship with neither", () => {
    const { context, calls } = recorder();
    drawNavalUnitMarkersV7(
      context,
      { submerged: false, boardable: false },
      0,
      0,
      1,
    );
    expect(calls).toEqual(["save", "setLineDash", "restore"]);
  });
});
