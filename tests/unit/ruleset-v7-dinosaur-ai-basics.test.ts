import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  chosenLayEggCommandsV7,
  hatchScoreV7,
  layEggAdjustmentV7,
} from "../../src/ai/v7-dinosaur";
import { chooseNormalCommandV7, scoreCommandV7 } from "../../src/ai/v7";
import { ARMY_COMMIT_MELEE_MOVE_PRIORITY_V7 } from "../../src/ai/v7-army";
import {
  applyCommandV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type GameStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { cityOfV7, withEggsV7 } from "../fixtures/v7-dinosaur-arena";
import { goblinArenaV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { fieldV7 } from "../fixtures/v7-revision20";

// Revision 19 (`pulp_wars-c87.3`): the Normal AI support that lets a
// Dinosaur seat play legally with Eggs, and (revision 20) the two Charge!
// benchmark scenarios that replace the Stampede ones. The full Dinosaur policy
// (`pulp_wars-c87.5`) is covered by ruleset-v7-dinosaur-ai.test.ts and
// ruleset-v7-dinosaur-ai-against.test.ts.

/** No treasure chest anywhere. */
function arena(
  pieces: Parameters<typeof goblinArenaV7>[1],
  options: Parameters<typeof goblinArenaV7>[2] = {},
): GameStateV7 {
  return checkedV7({
    ...goblinArenaV7(["DINOSAUR", "ORIGINAL"], pieces, options),
    treasureChests: [],
  });
}

describe("ruleset-7 revision-19 Normal AI: public boundary", () => {
  it("keeps the Dinosaur helpers on public-view, command, and preview imports", () => {
    const source = readFileSync("src/ai/v7-dinosaur.ts", "utf8");
    expect(
      [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]),
    ).toEqual([
      "../engine/rules/ruleset-v7",
      "../engine/v7/commands",
      "../engine/v7/query",
      "../engine/v7/types",
      "../engine/v7/view",
    ]);
    expect(source).not.toMatch(
      /GameStateV7|STAMPEDE|stampede|random|Math\.random|Date\.now/,
    );
  });
});

describe("ruleset-7 revision-19 Normal AI: Eggs", () => {
  it("considers one LAY_EGG per role, on the nest tile farthest from visible enemies", () => {
    const state = arena([{ seat: 1, role: "FIGHTER", at: { x: 6, y: 7 } }]);
    const view = viewForV7(state, state.humanPlayerId);
    const commands = queryPlayerCommandsV7(view);
    const chosen = [...chosenLayEggCommandsV7(view, commands)];
    expect(
      chosen.map((command) =>
        command.kind === "LAY_EGG" ? [command.role, command.at] : null,
      ),
    ).toEqual(
      // (The ninth unit, 7r55: the Stegosaurus and the Triceratops.)
      ["RAIDER", "MARKSMAN", "GUARD", "CATAPULT", "KNIGHT", "SWORDSMAN"].map(
        (role) => [
          role,
          // (9, 7), (9, 8), and (9, 9) are three tiles from the Fighter; the
          // first in (y, x) order wins.
          { x: 9, y: 7 },
        ],
      ),
    );
    // With no visible enemy it is the first nest tile.
    const calm = unexplored(state);
    const calmView = viewForV7(calm, calm.humanPlayerId);
    expect(
      [
        ...chosenLayEggCommandsV7(calmView, queryPlayerCommandsV7(calmView)),
      ].every(
        (command) =>
          command.kind === "LAY_EGG" &&
          command.at.x === 7 &&
          command.at.y === 7,
      ),
    ).toBe(true);
    // No LAY_EGG is offered to a Human seat, so nothing is chosen.
    const human = goblinArenaV7(
      ["ORIGINAL", "DINOSAUR"],
      [{ seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } }],
    );
    const humanView = viewForV7(human, human.humanPlayerId);
    expect(
      chosenLayEggCommandsV7(humanView, queryPlayerCommandsV7(humanView)).size,
    ).toBe(0);
  });

  it("lays an Egg with its city action and counts the hatch delay in a threatened city", () => {
    const state = arena([{ seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } }]);
    const view = viewForV7(state, state.humanPlayerId);
    const decision = chooseNormalCommandV7(view);
    const city = cityOfV7(state, 0);
    const production = decision.candidates
      .map((candidate) => candidate.command)
      .filter(
        (command) => command.kind === "LAY_EGG" || command.kind === "TRAIN",
      );
    // Exactly one land production command per city reaches scoring.
    expect(production).toHaveLength(1);
    expect(production[0]).toMatchObject({ cityId: city.id });
    expect(
      applyCommandV7(state, state.humanPlayerId, production[0] as CommandV7)
        .accepted,
    ).toBe(true);
    const lay: CommandV7 = {
      kind: "LAY_EGG",
      cityId: city.id,
      role: "KNIGHT",
      at: { x: 7, y: 7 },
    };
    expect(layEggAdjustmentV7(view, lay, false)).toBe(0);
    // A T-Rex Egg hatches in four turns, with Nesting too (the Dinosaur
    // pass's correction, 7r53; three with Nesting before).
    expect(layEggAdjustmentV7(view, lay, true)).toBe(-48);
    expect(
      layEggAdjustmentV7(
        view,
        { kind: "TRAIN", cityId: city.id, role: "FIGHTER" },
        true,
      ),
    ).toBe(0);
  });

  it("values a Hatch by the unit that appears and the turns it saves", () => {
    const state = withEggsV7(
      arena([
        { seat: 0, role: "CAPTAIN", at: { x: 6, y: 6 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ]),
      [{ seat: 0, role: "KNIGHT", at: { x: 7, y: 7 } }],
    );
    const view = viewForV7(state, state.humanPlayerId);
    const hatch: CommandV7 = {
      kind: "HATCH",
      unitId: unitAtV7(state, { x: 6, y: 6 }).id,
      eggUnitId: unitAtV7(state, { x: 7, y: 7 }).id,
    };
    // The T-Rex inside (revision 20: 14 * 4 + 28) and 10 per turn saved
    // (hatch time 4).
    expect(hatchScoreV7(view, hatch, false)).toEqual({
      priority: 1085,
      strategic: 84 + 40,
      immediate: 0,
    });
    const candidates = chooseNormalCommandV7(view).candidates.map(
      (candidate) => candidate.command,
    );
    expect(candidates).toContainEqual(hatch);
  });
});

describe("ruleset-7 revision-20 Normal AI: Charge! benchmark", () => {
  it("takes a Charge after a run-up: it moves next to the target, then kills it", () => {
    // A Fighter two tiles away: unmoved the Triceratops cannot reach it, and
    // after a one-tile Move its Charge (Attack 4) kills it.
    const state = arena([
      { seat: 0, role: "SWORDSMAN", at: { x: 3, y: 3 } },
      { seat: 1, role: "FIGHTER", at: { x: 5, y: 3 } },
    ]);
    const view = viewForV7(state, state.humanPlayerId);
    const triceratops = unitAtV7(state, { x: 3, y: 3 });
    const ofUnit = (candidate: GameStateV7) =>
      chooseNormalCommandV7(
        viewForV7(candidate, candidate.humanPlayerId),
      ).candidates.filter(
        (item) =>
          "unitId" in item.command && item.command.unitId === triceratops.id,
      );
    // No attack is offered yet; the best command of the unit is a Move that
    // ends next to the Fighter.
    expect(
      queryPlayerCommandsV7(view).some(
        (command) =>
          command.kind === "ATTACK" && command.unitId === triceratops.id,
      ),
    ).toBe(false);
    // (The Dinosaur pass, `pulp_wars-w49.15`: against Humans a Dinosaur
    // seat plays the army rules, so the Move into contact is a committed
    // unit's, 1173; it was the Charge! approach, 860.)
    const move = ofUnit(state)[0];
    expect(move?.score.priority).toBe(ARMY_COMMIT_MELEE_MOVE_PRIORITY_V7);
    if (move?.command.kind !== "MOVE") throw new Error("no approach Move");
    const end = move.command.path.at(-1);
    expect(
      end !== undefined && Math.max(Math.abs(end.x - 5), Math.abs(end.y - 3)),
    ).toBe(1);
    const moved = applyCommandV7(state, state.humanPlayerId, move.command);
    if (!moved.accepted) throw new Error("Move rejected");
    // Now the Charge is the best command of the unit, and it kills.
    const charge: CommandV7 = {
      kind: "ATTACK",
      unitId: triceratops.id,
      targetUnitId: unitAtV7(state, { x: 5, y: 3 }).id,
    };
    const best = ofUnit(moved.state)[0];
    expect(best?.command).toEqual(charge);
    expect(best?.score.priority).toBe(1180);
    // The public preview holds the run-up: 10 damage and a kill.
    expect(best?.score.immediateValue).toBe(
      scoreCommandV7(viewForV7(moved.state, moved.state.humanPlayerId), charge)
        .immediateValue,
    );
    const result = applyCommandV7(moved.state, state.humanPlayerId, charge);
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    const combat = result.events.find(
      (event) => event.kind === "COMBAT_RESOLVED",
    );
    expect(combat).toMatchObject({
      preview: { runUp: 1, attack2: 8, defenderDies: true, advances: true },
    });
  });

  it("declines a Charge when the Triceratops would die for no gain", () => {
    // The Guard is pushed and the Triceratops follows into the reach of
    // three Marksmen that cannot hit it where it stands: its 52 points for
    // 7 damage to a Guard.
    const state = fieldV7([
      { seat: 0, role: "SWORDSMAN", at: { x: 3, y: 3 } },
      { seat: 1, role: "GUARD", at: { x: 4, y: 3 } },
      { seat: 1, role: "MARKSMAN", at: { x: 7, y: 2 } },
      { seat: 1, role: "MARKSMAN", at: { x: 7, y: 3 } },
      { seat: 1, role: "MARKSMAN", at: { x: 7, y: 4 } },
    ]);
    const view = viewForV7(state, state.humanPlayerId);
    const charge: CommandV7 = {
      kind: "ATTACK",
      unitId: unitAtV7(state, { x: 3, y: 3 }).id,
      targetUnitId: unitAtV7(state, { x: 4, y: 3 }).id,
    };
    expect(queryPlayerCommandsV7(view)).toContainEqual(charge);
    const decision = chooseNormalCommandV7(view);
    expect(
      decision.candidates.map((candidate) => candidate.command),
    ).not.toContainEqual(charge);
    // Without the Marksmen the same Charge is a candidate.
    const safe = fieldV7([
      { seat: 0, role: "SWORDSMAN", at: { x: 3, y: 3 } },
      { seat: 1, role: "GUARD", at: { x: 4, y: 3 } },
    ]);
    expect(
      chooseNormalCommandV7(viewForV7(safe, safe.humanPlayerId)).candidates.map(
        (candidate) => candidate.command,
      ),
    ).toContainEqual({
      kind: "ATTACK",
      unitId: unitAtV7(safe, { x: 3, y: 3 }).id,
      targetUnitId: unitAtV7(safe, { x: 4, y: 3 }).id,
    });
  });
});

/** The Dinosaur seat sees only its own territory (no visible enemy). */
function unexplored(state: GameStateV7): GameStateV7 {
  const city = cityOfV7(state, 0);
  return checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? {
            ...player,
            explored: state.board.tiles
              .filter((tile) => tile.territoryCityId === city.id)
              .map((tile) => tile.at),
          }
        : player,
    ),
  });
}
