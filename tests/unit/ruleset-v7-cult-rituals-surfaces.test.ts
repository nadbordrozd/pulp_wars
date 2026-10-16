import { describe, expect, it } from "vitest";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  ARMY_PLAY_FACTIONS_V7,
  setArmyPlayFactionsV7,
} from "../../src/ai/v7-army";
import { cultSummonedArtSubjectV7 } from "../../src/assets/chibi-art-v7";
import {
  FAVOUR_PURPOSES_V7,
  FAVOUR_SOURCES_V7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  summonedUnitRoleRuleV7,
  viewForV7,
  type CommandV7,
  type GameStateV7,
} from "../../src/engine/index";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import { FAVOUR_PURPOSE_LABELS_V7 } from "../../src/render/cult-channel-presentation-v7";
import {
  FAVOUR_SOURCE_LABELS_V7,
  GREAT_SUMMONING_UNLOCK_TEXT_V7,
} from "../../src/render/cult-presentation-v7";
import { roleAbilityNameV7 } from "../../src/render/role-presentation-v7";
import {
  GLOSSARY_TEXT_LIMIT_V7,
  glossaryEntryV7,
  summonedGlossaryV7,
} from "../../src/render/unit-glossary-v7";
import {
  cultFieldV7,
  withFavourV7,
  withHorrorV7,
  withRitualV7,
} from "../fixtures/v7-cult";
import { applyOkV7, seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { offeredV7 } from "../fixtures/v7-martian";
import { at } from "../fixtures/v7-revision20";

/**
 * The Cultists of the Ancient Ones, engine bead E5 (`pulp_wars-mch9.7`):
 * what rituals and the Herald show outside the engine before their
 * interface bead (`pulp_wars-mch9.19`): the words of the glossary, the
 * technology card, and the event log; a bound Herald on the board with its
 * own sprite and name; and the Normal AI, which tolerates the two commands
 * without picking them. Every state is built by hand; no match is played.
 */

const RITUAL_KINDS: readonly CommandV7["kind"][] = ["BEGIN_RITUAL", "PROCLAIM"];

/**
 * Seat `cultSeat` is the Cult, to move, with a Summoner and three Initiates
 * (and 20 Favour), a Stargazer and two more, and a bound Herald two tiles
 * from the other seat's capital, a Fighter of that seat beside it.
 */
function everything(cultSeat: 0 | 1): GameStateV7 {
  const other = cultSeat === 0 ? 1 : 0;
  const capital = cultSeat === 0 ? at(2, 8) : at(8, 8);
  const side = cultSeat === 0 ? 1 : -1;
  const herald = at(capital.x + 2 * side, capital.y - 2);
  return withHorrorV7(
    withFavourV7(
      cultFieldV7(
        [
          { seat: cultSeat, role: "CAPTAIN", at: at(5, 2) },
          { seat: cultSeat, role: "FIGHTER", at: at(4, 1) },
          { seat: cultSeat, role: "FIGHTER", at: at(5, 1) },
          { seat: cultSeat, role: "FIGHTER", at: at(6, 1) },
          { seat: cultSeat, role: "CATAPULT", at: at(8, 2) },
          { seat: cultSeat, role: "FIGHTER", at: at(9, 2) },
          { seat: cultSeat, role: "FIGHTER", at: at(9, 3) },
          { seat: other, role: "FIGHTER", at: at(herald.x, herald.y + 1) },
        ],
        {
          factions:
            cultSeat === 0 ? ["CULT", "ORIGINAL"] : ["ORIGINAL", "CULT"],
          activeSeat: cultSeat,
        },
      ),
      cultSeat,
      20,
    ),
    cultSeat,
    herald,
    { role: "HERALD" },
  );
}

describe("rituals and the Herald: the words", () => {
  it("explains Star-fall, Ravage, Unstoppable, and Proclaim in the glossary", () => {
    for (const id of [
      "STARFALL",
      "RAVAGE",
      "UNSTOPPABLE",
      "PROCLAIM",
    ] as const) {
      const entry = glossaryEntryV7(id);
      expect(entry.name.length, id).toBeGreaterThan(3);
      expect(entry.text.length, id).toBeLessThanOrEqual(GLOSSARY_TEXT_LIMIT_V7);
      // Plain words: no formula, no identifier.
      expect(entry.text, id).not.toMatch(/[_=+*]|\bV7\b/);
    }
    expect(glossaryEntryV7("STARFALL").name).toBe("Star-fall");
    expect(roleAbilityNameV7("STARFALL", "CULT")).toBe("Star-fall");
    // The Herald's card: what a daemon is, then its own abilities.
    const ids = summonedGlossaryV7("HERALD").map((entry) => entry.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "DAEMON",
        "DAEMONS_FEED",
        "RAVAGE",
        "UNSTOPPABLE",
        "PROCLAIM",
        "UNBOUND",
      ]),
    );
    expect(ids).not.toContain("BOO");
    expect(summonedUnitRoleRuleV7("HERALD").label).toBe("Herald");
  });

  it("has words for every Favour source and purpose the events carry", () => {
    for (const source of FAVOUR_SOURCES_V7)
      expect(FAVOUR_SOURCE_LABELS_V7[source].length, source).toBeGreaterThan(3);
    for (const purpose of FAVOUR_PURPOSES_V7)
      expect(FAVOUR_PURPOSE_LABELS_V7[purpose].length, purpose).toBeGreaterThan(
        3,
      );
    expect(GREAT_SUMMONING_UNLOCK_TEXT_V7).toContain("18 Favour");
  });

  it("names the Great Summoning on the Cult's Explosives, and on no other tree", () => {
    const state = everything(0);
    const effects = (seat: number) =>
      queryTechnologyTreeV7(viewForV7(state, seatIdV7(state, seat)))
        .nodes.find((node) => node.id === "EXPLOSIVES")
        ?.effects.map((effect) => effect.kind);
    expect(effects(0)).toContain("GREAT_SUMMONING");
    expect(effects(1)).not.toContain("GREAT_SUMMONING");
  });
});

describe("rituals and the Herald: the board", () => {
  it("draws a bound Herald with its own sprite and name, for both seats", () => {
    const state = everything(0);
    const herald = state.units.find((unit) => unit.summoned === "HERALD");
    if (herald === undefined) throw new Error("no Herald");
    expect(cultSummonedArtSubjectV7("HERALD", false)).toBe("UNIT:CULT:HERALD");
    for (const seat of [0, 1]) {
      const view = viewForV7(state, seatIdV7(state, seat));
      const plan = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      });
      const entry = plan.entries.find(
        (candidate) => candidate.key === `unit:${herald.id}`,
      );
      if (entry?.kind !== "UNIT") throw new Error("no unit entry");
      expect(entry.artSubject).toBe("UNIT:CULT:HERALD");
      expect(entry.label).toBe("Herald");
      expect(entry.ownerId).toBe(seatIdV7(state, 0));
    }
  });

  it("plans the board of a state with a circle under way and a Cowed city", () => {
    const base = everything(0);
    const circle = withRitualV7(
      base,
      "GREAT_SUMMONING",
      at(5, 2),
      [at(4, 1), at(5, 1), at(6, 1)],
      at(5, 3),
    );
    const herald = circle.units.find((unit) => unit.summoned === "HERALD");
    const capital = circle.cities.find(
      (city) => city.at.x === 2 && city.at.y === 8,
    );
    if (herald === undefined || capital === undefined)
      throw new Error("missing");
    const cowed = applyOkV7(circle, seatIdV7(circle, 0), {
      kind: "PROCLAIM",
      unitId: herald.id,
      cityId: capital.id,
    }).state;
    for (const seat of [0, 1]) {
      const view = viewForV7(cowed, seatIdV7(cowed, seat));
      expect(view.cult.rituals).toHaveLength(1);
      expect(view.cult.cowed).toEqual([{ cityId: capital.id, endsLeft: 1 }]);
      const plan = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      });
      expect(plan.entries.length).toBeGreaterThan(0);
    }
  });
});

describe("rituals and the Herald: the older Normal policy tolerates the commands", () => {
  /** Plays the active seat's whole turn with the Normal AI. */
  function turn(start: GameStateV7): readonly CommandV7[] {
    let state = start;
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) throw new Error("no active seat");
    const commands: CommandV7[] = [];
    for (let step = 0; step < 200; step += 1) {
      const view = viewForV7(state, actor);
      const command = chooseNormalCommandV7(view).command;
      if (command === null) throw new Error("the policy chose nothing");
      expect(queryPlayerCommandsV7(view)).toContainEqual(command);
      commands.push(command);
      if (command.kind === "END_TURN") return commands;
      state = applyOkV7(state, actor, command).state;
    }
    throw new Error("the turn did not end");
  }

  it("never picks a ritual or a Proclaim, and ends its turn", () => {
    // A Cult AI seat (seat 1) with both on offer.
    const state = everything(1);
    const offered = new Set(
      offeredV7(state)
        .map((command) => command.kind)
        .filter((kind) => RITUAL_KINDS.includes(kind)),
    );
    expect([...offered].sort()).toEqual([...RITUAL_KINDS].sort());
    // The older policy (the tests' switch): a Cult seat of the army play
    // begins its rituals and Proclaims by its plan from bead A3
    // (`pulp_wars-mch9.11`; tests/unit/ruleset-v7-cult-rituals-ai.test.ts).
    const previous = setArmyPlayFactionsV7(
      ARMY_PLAY_FACTIONS_V7.filter((faction) => faction !== "CULT"),
    );
    try {
      const commands = turn(state);
      expect(commands.at(-1)?.kind).toBe("END_TURN");
      for (const command of commands)
        expect(RITUAL_KINDS).not.toContain(command.kind);
      const decision = chooseNormalCommandV7(
        viewForV7(state, seatIdV7(state, 1)),
      );
      for (const candidate of decision.candidates)
        expect(RITUAL_KINDS).not.toContain(candidate.command.kind);
    } finally {
      setArmyPlayFactionsV7(previous);
    }
  });

  it("plays a turn against a Cult seat with a circle under way and a Herald in sight", () => {
    const base = everything(0);
    const circle = withRitualV7(
      base,
      "STARFALL",
      at(8, 2),
      [at(9, 2), at(9, 3)],
      at(8, 6),
    );
    const human = applyOkV7(circle, seatIdV7(circle, 0), {
      kind: "END_TURN",
    }).state;
    expect(unitAtV7(human, at(4, 6)).summoned).toBe("HERALD");
    expect(turn(human).at(-1)?.kind).toBe("END_TURN");
  });
});
