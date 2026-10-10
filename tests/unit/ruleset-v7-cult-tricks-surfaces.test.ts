import { describe, expect, it } from "vitest";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  unitId,
  unitIsTentacleV7,
  viewForV7,
  type CommandV7,
  type GameStateV7,
} from "../../src/engine/index";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import { SWITCHEROO_UNLOCK_TEXT_V7 } from "../../src/render/cult-presentation-v7";
import {
  monsterInfoLinesV7,
  neutralArtSubjectsV7,
  neutralRuleV7,
  neutralUnitLabelV7,
} from "../../src/render/curiosity-presentation-v7";
import { roleAbilityNameV7 } from "../../src/render/role-presentation-v7";
import {
  GLOSSARY_TEXT_LIMIT_V7,
  TENTACLE_GLOSSARY_IDS_V7,
  UNIT_STATUS_IDS_V7,
  glossaryEntryV7,
  roleGlossaryV7,
  statusGlossaryV7,
} from "../../src/render/unit-glossary-v7";
import { textPlayCommandIdV7 } from "../../scripts/play-text-v7";
import {
  cultFieldV7,
  withFrogsV7,
  withTauntsV7,
  withTentacleV7,
} from "../fixtures/v7-cult";
import { applyOkV7, seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { offeredV7 } from "../fixtures/v7-martian";
import { at } from "../fixtures/v7-revision20";

/**
 * The Cultists of the Ancient Ones, engine bead E6 (`pulp_wars-mch9.8`):
 * what the hexes and tricks show outside the engine before their interface
 * bead (`pulp_wars-mch9.19`): the words of the glossary and the technology
 * card, a Tentacle on the board and in its dock, the ids of the text
 * harness, and the Normal AI, which tolerates the four commands without
 * picking them and plays a turn among frogs, a taunt, and a Tentacle. Every
 * state is built by hand; no match is played.
 */

const TRICK_KINDS: readonly CommandV7["kind"][] = [
  "RIBBIT",
  "SWITCHEROO",
  "TENTACLE",
  "PICK_ME",
];

/**
 * Seat `cultSeat` is the Cult, to move, with a Hexer, a Familiar, a Caller,
 * and a Chosen, each with a unit of the other seat in reach of its trick.
 */
function everything(cultSeat: 0 | 1): GameStateV7 {
  const other = cultSeat === 0 ? 1 : 0;
  return cultFieldV7(
    [
      { seat: cultSeat, role: "MARKSMAN", at: at(2, 2) },
      { seat: other, role: "KNIGHT", at: at(2, 4) },
      { seat: cultSeat, role: "RAIDER", at: at(5, 2) },
      { seat: other, role: "CATAPULT", at: at(5, 4) },
      { seat: cultSeat, role: "KNIGHT", at: at(8, 2) },
      { seat: other, role: "FIGHTER", at: at(9, 4) },
      { seat: cultSeat, role: "SWORDSMAN", at: at(7, 6) },
      { seat: other, role: "FIGHTER", at: at(6, 6) },
    ],
    {
      factions: cultSeat === 0 ? ["CULT", "ORIGINAL"] : ["ORIGINAL", "CULT"],
      activeSeat: cultSeat,
    },
  );
}

describe("hexes and tricks: the words", () => {
  it("explains every trick, the frog, and the Tentacle in the glossary", () => {
    for (const id of [
      "PAMPHLETS",
      "SWITCHEROO",
      "RIBBIT",
      "TENTACLE",
      "PICK_ME",
      "GRAB",
      "WILD_TENTACLE",
      "STATUS_FROG",
      "STATUS_GRABBED",
      "STATUS_TAUNTED",
      "STATUS_HEX_SPENT",
    ] as const) {
      const entry = glossaryEntryV7(id);
      expect(entry.name.length, id).toBeGreaterThan(3);
      expect(entry.text.length, id).toBeLessThanOrEqual(GLOSSARY_TEXT_LIMIT_V7);
      // Plain words: no formula, no identifier.
      expect(entry.text, id).not.toMatch(/[_=+*]|\bV7\b/);
    }
    expect(roleAbilityNameV7("PICK_ME", "CULT")).toBe("Pick Me!");
    expect(glossaryEntryV7("PICK_ME").name).toBe("Pick Me!");
    // Each unit's card names its trick.
    const cards = {
      FIGHTER: "PAMPHLETS",
      RAIDER: "SWITCHEROO",
      MARKSMAN: "RIBBIT",
      KNIGHT: "TENTACLE",
      SWORDSMAN: "PICK_ME",
    } as const;
    for (const [role, id] of Object.entries(cards))
      expect(
        roleGlossaryV7(role as keyof typeof cards, "CULT").map(
          (entry) => entry.id,
        ),
        role,
      ).toContain(id);
    expect(TENTACLE_GLOSSARY_IDS_V7).toEqual(["WILD_TENTACLE", "GRAB"]);
    // The status chips the interface bead will show have their lines.
    for (const status of ["frog", "grabbed", "taunted", "pick-me", "hex-spent"])
      expect(UNIT_STATUS_IDS_V7, status).toContain(status);
    expect(statusGlossaryV7("frog")?.name).toBe("Frog");
  });

  it("names Switcheroo on the Cult's Scouting, and on no other tree", () => {
    const state = everything(0);
    const effects = (seat: number) =>
      queryTechnologyTreeV7(viewForV7(state, seatIdV7(state, seat)))
        .nodes.find((node) => node.id === "SCOUTING")
        ?.effects.map((effect) => effect.kind);
    expect(effects(0)).toContain("SWITCHEROO");
    expect(effects(1)).not.toContain("SWITCHEROO");
    expect(SWITCHEROO_UNLOCK_TEXT_V7).toContain("within 2 tiles");
  });

  it("gives each command an id of its own in the text harness", () => {
    expect(
      textPlayCommandIdV7({
        kind: "RIBBIT",
        unitId: unitId(5),
        targetUnitId: unitId(9),
      }),
    ).toBe("u5.ribbit.u9");
    expect(
      textPlayCommandIdV7({
        kind: "SWITCHEROO",
        unitId: unitId(5),
        targetUnitId: unitId(9),
      }),
    ).toBe("u5.switch.u9");
    expect(
      textPlayCommandIdV7({
        kind: "TENTACLE",
        unitId: unitId(5),
        at: at(4, 6),
      }),
    ).toBe("u5.tentacle.4,6");
    expect(textPlayCommandIdV7({ kind: "PICK_ME", unitId: unitId(5) })).toBe(
      "u5.pickme",
    );
  });
});

describe("hexes and tricks: the board", () => {
  it("draws a Tentacle with its own sprite and name, and its dock says how long it stays and whom it holds", () => {
    const state = withTentacleV7(
      cultFieldV7([
        { seat: 0, role: "KNIGHT", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(6, 5) },
      ]),
      at(5, 2),
      at(5, 4),
      { grabbed: at(6, 5), turnsLeft: 2 },
    );
    const tentacle = state.units.find((unit) => unitIsTentacleV7(unit));
    if (tentacle === undefined) throw new Error("no Tentacle");
    expect(neutralUnitLabelV7("TENTACLE")).toBe("Tentacle");
    expect(neutralArtSubjectsV7("TENTACLE", tentacle.role)).toEqual({
      unit: "UNIT:CULT:TENTACLE",
      portrait: "UNIT:CULT:TENTACLE",
    });
    expect(neutralRuleV7("TENTACLE")).toContain("slaps the weakest unit");
    for (const seat of [0, 1]) {
      const view = viewForV7(state, seatIdV7(state, seat));
      const plan = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      });
      const entry = plan.entries.find(
        (candidate) => candidate.key === `unit:${tentacle.id}`,
      );
      if (entry?.kind !== "UNIT") throw new Error("no unit entry");
      expect(entry.artSubject).toBe("UNIT:CULT:TENTACLE");
      expect(entry.label).toBe("Tentacle");
      const lines = monsterInfoLinesV7(view, tentacle.id);
      expect(lines.map((line) => line.id)).toEqual([
        "neutral",
        "sinks",
        "grab",
        "provoked",
      ]);
      expect(lines[1]?.description).toBe("It sinks after 2 more rounds.");
      for (const line of lines)
        expect(line.description).not.toMatch(/\d,\s*\d/);
    }
  });

  it("plans the board of a state with a frog, a taunt, and a Tentacle", () => {
    const state = withTentacleV7(
      withTauntsV7(withFrogsV7(everything(0), [at(2, 4)]), [at(7, 6)]),
      at(8, 2),
      at(8, 4),
    );
    for (const seat of [0, 1]) {
      const view = viewForV7(state, seatIdV7(state, seat));
      expect(view.cult.frogs).toHaveLength(1);
      expect(view.cult.taunts).toHaveLength(1);
      expect(view.cult.tentacles).toHaveLength(1);
      const plan = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      });
      expect(plan.entries.length).toBeGreaterThan(0);
    }
  });
});

describe("hexes and tricks: the older Normal policy tolerates the commands", () => {
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

  it("never picks a trick, and ends its turn", () => {
    // A Cult AI seat (seat 1) with all four on offer.
    const state = everything(1);
    const offered = new Set(
      offeredV7(state)
        .map((command) => command.kind)
        .filter((kind) => TRICK_KINDS.includes(kind)),
    );
    expect([...offered].sort()).toEqual([...TRICK_KINDS].sort());
    const commands = turn(state);
    expect(commands.at(-1)?.kind).toBe("END_TURN");
    for (const command of commands)
      expect(TRICK_KINDS).not.toContain(command.kind);
    const decision = chooseNormalCommandV7(
      viewForV7(state, seatIdV7(state, 1)),
    );
    for (const candidate of decision.candidates)
      expect(TRICK_KINDS).not.toContain(candidate.command.kind);
  });

  it("plays a turn against a Cult seat with a frog of its own, a taunt beside it, and a Tentacle holding a unit", () => {
    // The Human AI (seat 1) to move: its Knight is a frog, its Fighter on
    // (6, 6) stands beside a taunting Chosen, and a Tentacle holds its
    // Fighter on (9, 4).
    const base = everything(0);
    const staged = withTentacleV7(
      withTauntsV7(withFrogsV7(base, [at(2, 4)]), [at(7, 6)]),
      at(8, 2),
      at(8, 4),
      { grabbed: at(9, 4) },
    );
    const human = applyOkV7(staged, seatIdV7(staged, 0), {
      kind: "END_TURN",
    }).state;
    expect(human.cult.frogs).toEqual([unitAtV7(human, at(2, 4)).id]);
    const commands = turn(human);
    expect(commands.at(-1)?.kind).toBe("END_TURN");
    // The frog made no attack.
    const frog = unitAtV7(human, at(2, 4)).id;
    for (const command of commands)
      if ("unitId" in command && command.unitId === frog)
        expect(["MOVE", "WAIT", "DISBAND"]).toContain(command.kind);
  });
});
