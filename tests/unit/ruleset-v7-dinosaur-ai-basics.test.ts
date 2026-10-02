import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  chosenLayEggCommandsV7,
  hatchScoreV7,
  layEggAdjustmentV7,
} from "../../src/ai/v7-dinosaur";
import { chooseNormalCommandV7, scoreCommandV7 } from "../../src/ai/v7";
import {
  applyCommandV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type GameStateV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { cityOfV7, withEggsV7 } from "../fixtures/v7-dinosaur-arena";
import {
  goblinArenaV7,
  goblinSetupV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";

// Revision 19 (`pulp_wars-c87.3`): the Normal AI support that lets a
// Dinosaur seat play legally with Eggs and Stampede. The full Dinosaur policy
// (`pulp_wars-c87.5`) is covered by ruleset-v7-dinosaur-ai.test.ts and
// ruleset-v7-dinosaur-ai-against.test.ts.

/** No treasure chest anywhere, so open rows stay open lanes. */
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
      // The public lane geometry, applied to the view (`viewStampedeFactsV7`).
      "../engine/v7/stampede",
      "../engine/v7/types",
      "../engine/v7/view",
    ]);
    expect(source).not.toMatch(
      /GameStateV7|stateStampedeFactsV7|random|Math\.random|Date\.now/,
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
      ["RAIDER", "MARKSMAN", "GUARD", "CATAPULT", "KNIGHT"].map((role) => [
        role,
        // (9, 7), (9, 8), and (9, 9) are three tiles from the Fighter; the
        // first in (y, x) order wins.
        { x: 9, y: 7 },
      ]),
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
    // With Nesting (the arena has every technology) a T-Rex Egg hatches in
    // two turns.
    expect(layEggAdjustmentV7(view, lay, true)).toBe(-24);
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
    // The T-Rex inside (10 * 4 + 28) and 10 per turn saved.
    expect(hatchScoreV7(view, hatch, false)).toEqual({
      priority: 1085,
      strategic: 68 + 30,
      immediate: 0,
    });
    const candidates = chooseNormalCommandV7(view).candidates.map(
      (candidate) => candidate.command,
    );
    expect(candidates).toContainEqual(hatch);
  });
});

describe("ruleset-7 revision-19 Normal AI: Stampede", () => {
  it("takes a killing Stampede and does not move the Triceratops first", () => {
    const state = arena([
      { seat: 0, role: "CATAPULT", at: { x: 3, y: 3 } },
      { seat: 1, role: "FIGHTER", at: { x: 5, y: 3 }, hp: 1 },
    ]);
    const view = viewForV7(state, state.humanPlayerId);
    const triceratops = unitAtV7(state, { x: 3, y: 3 });
    const stampede: CommandV7 = {
      kind: "STAMPEDE",
      unitId: triceratops.id,
      targetUnitId: unitAtV7(state, { x: 5, y: 3 }).id,
    };
    expect(scoreCommandV7(view, stampede)).toMatchObject({
      priority: 1180,
      immediateValue: 10 * 1 + 20,
    });
    const decision = chooseNormalCommandV7(view);
    // Economy comes first; the Stampede is the best command of the unit.
    expect(
      decision.candidates.find(
        (candidate) =>
          "unitId" in candidate.command &&
          candidate.command.unitId === triceratops.id,
      )?.command,
    ).toEqual(stampede);
    expect(
      decision.candidates.some(
        (candidate) =>
          candidate.command.kind === "MOVE" &&
          candidate.command.unitId === triceratops.id,
      ),
    ).toBe(false);
    expect(applyCommandV7(state, state.humanPlayerId, stampede).accepted).toBe(
      true,
    );
  });

  it("declines a Stampede whose death blast would kill an own unit", () => {
    const state = checkedV7({
      ...goblinArenaV7(
        ["DINOSAUR", "GOBLIN"],
        [
          { seat: 0, role: "CATAPULT", at: { x: 3, y: 3 }, hp: 3 },
          { seat: 1, role: "KNIGHT", at: { x: 5, y: 3 }, hp: 1 },
        ],
      ),
      treasureChests: [],
    });
    const view = viewForV7(state, state.humanPlayerId);
    const stampede: CommandV7 = {
      kind: "STAMPEDE",
      unitId: unitAtV7(state, { x: 3, y: 3 }).id,
      targetUnitId: unitAtV7(state, { x: 5, y: 3 }).id,
    };
    expect(queryPlayerCommandsV7(view)).toContainEqual(stampede);
    // Big (+4 HP, to 7) and then the Scrap Buggy's blast of 4: it survives.
    expect(scoreCommandV7(view, stampede).priority).toBe(1180);
    const doomed = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.role === "CATAPULT"
          ? { ...unit, kills: 1, maxHp: 22, hp: 3 }
          : unit,
      ),
    });
    expect(
      scoreCommandV7(viewForV7(doomed, doomed.humanPlayerId), stampede)
        .priority,
    ).toBe(-1);
  });
});

describe("ruleset-7 revision-19 Normal AI: legal play with Eggs", () => {
  it("plays Dinosaur seats to completion with Eggs laid and hatched and no rejected command", () => {
    for (const factions of [
      ["DINOSAUR", "ORIGINAL"],
      ["GOBLIN", "DINOSAUR"],
    ] as const) {
      // Seed 4 (was 3): since pulp_wars-c87.8 the 12-HP Cavemen of seed 3
      // win in ten rounds, before any Egg is laid.
      const setup = {
        ...goblinSetupV7(factions, 4),
        mapType: "PANGEA" as const,
      };
      const match = runAiMatchV7(setup, { maxRounds: 60 });
      expect(match.errors, factions.join()).toEqual([]);
      expect(match.stalls, factions.join()).toEqual([]);
      const kinds = new Set(
        match.commandLog.map((record) => record.command.kind),
      );
      expect(kinds.has("LAY_EGG"), factions.join()).toBe(true);
      // A Dinosaur seat never trains an egg-laid role.
      const dinosaurIds = new Set(
        match.state.players
          .filter((player) => player.faction === "DINOSAUR")
          .map((player) => player.id),
      );
      expect(
        match.commandLog.filter(
          (record) =>
            record.command.kind === "TRAIN" &&
            dinosaurIds.has(record.playerId) &&
            record.command.role !== "FIGHTER" &&
            record.command.role !== "CAPTAIN",
        ),
      ).toEqual([]);
    }
  }, 240_000);
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
