import { afterEach, describe, expect, it } from "vitest";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  ARMY_PLAY_FACTIONS_V7,
  armyPlayFactionV7,
  setArmyPlayFactionsV7,
} from "../../src/ai/v7-army";
import {
  NEUTRAL_BOUNTY_FOR_POLICY_V7,
  curiosityFactsV7,
  monsterProvokedAtV7,
} from "../../src/ai/v7-curiosities";
import { cultSummonedArtSubjectV7 } from "../../src/assets/chibi-art-v7";
import { chibiDirectionArtRegistryV7 } from "../../src/assets/chibi-direction-art-manifest";
import {
  DAEMON_BREEDS_V7,
  FAVOUR_SOURCES_V7,
  NEUTRAL_BOUNTIES_V7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type GameStateV7,
} from "../../src/engine/index";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  BIND_LABEL_V7,
  cultChannelCommandPresentationV7,
} from "../../src/render/cult-channel-presentation-v7";
import { FAVOUR_SOURCE_LABELS_V7 } from "../../src/render/cult-presentation-v7";
import {
  DAEMON_PROVOKE_WARNING_V7,
  monsterInfoLinesV7,
  monsterRetaliationNoteV7,
  neutralArtSubjectsV7,
  neutralBreedOfUnitV7,
  neutralUnitLabelV7,
  provokeMoveWarningV7,
} from "../../src/render/curiosity-presentation-v7";
import {
  GLOSSARY_TEXT_LIMIT_V7,
  glossaryEntryV7,
  summonedGlossaryV7,
} from "../../src/render/unit-glossary-v7";
import {
  cultFieldV7,
  withHorrorV7,
  withUnboundHeraldV7,
  withUnboundV7,
} from "../fixtures/v7-cult";
import {
  applyOkV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import { at } from "../fixtures/v7-revision20";

/**
 * The Cultists of the Ancient Ones, engine bead E4 (`pulp_wars-mch9.6`):
 * what Unbound shows outside the engine. The red-eyed sprite and the name of
 * an Unbound daemon on the board, its dock lines, the "Bind" stand-in
 * button, the glossary, and the Normal AI, which reads an Unbound daemon as
 * a monster. Every state is built by hand; no match is played.
 */

const HORROR = at(5, 2);

function need<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing");
  return value;
}

/** An Unbound Horror on (5, 2), its summoner the Cult seat 0. */
const looseField = (
  pieces: readonly GoblinPieceV7[],
  options: Parameters<typeof cultFieldV7>[1] = {},
  furious = false,
  horror: Parameters<typeof withHorrorV7>[3] = {},
): GameStateV7 =>
  withUnboundV7(
    withHorrorV7(cultFieldV7(pieces, options), 0, HORROR, horror),
    HORROR,
    0,
    furious,
  );

describe("Unbound: the daemon on the board", () => {
  it("draws an Unbound Horror with its red-eyed sprite, no owner colour, and its name", () => {
    const state = withHorrorV7(
      looseField([{ seat: 1, role: "FIGHTER", at: at(5, 1) }]),
      0,
      at(8, 3),
    );
    for (const seat of [0, 1]) {
      const view = viewForV7(state, seatIdV7(state, seat));
      const plan = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      });
      const entry = (where: { x: number; y: number }) => {
        const unit = unitAtV7(state, where);
        const found = plan.entries.find(
          (candidate) => candidate.key === `unit:${unit.id}`,
        );
        if (found?.kind !== "UNIT") throw new Error("no unit entry");
        return found;
      };
      const loose = entry(HORROR);
      expect(loose.artSubject).toBe("UNIT:CULT:HORROR_UNBOUND");
      expect(loose.label).toBe("Unbound Horror");
      // A neutral unit: nobody's colour, and its eye is on the Fighter.
      expect(loose.ownerId).toBe(0);
      expect(loose.monster).toEqual({ provoked: true, breed: "HORROR" });
      // A bound Horror keeps the sprite of `pulp_wars-mch9.5`.
      expect(entry(at(8, 3)).artSubject).toBe("UNIT:CULT:HORROR");
      expect(entry(at(8, 3)).label).toBe("Horror");
    }
  });

  it("asks for the Unbound sprites the art pipeline registered", () => {
    const live = chibiDirectionArtRegistryV7();
    for (const breed of DAEMON_BREEDS_V7) {
      const art = neutralArtSubjectsV7(
        breed,
        breed === "HORROR" ? "KNIGHT" : "JUGGERNAUT",
      );
      expect(art.unit).toBe(cultSummonedArtSubjectV7(breed, true));
      expect(art.portrait).toBe(art.unit);
      expect(live.variants(art.unit), art.unit).toHaveLength(1);
      expect(neutralUnitLabelV7(breed)).toBe(
        breed === "HORROR" ? "Unbound Horror" : "Unbound Herald",
      );
    }
    // The breed is read off the unit, also without its registry entry.
    const herald = withUnboundHeraldV7(cultFieldV7([]), HORROR, 0);
    expect(
      neutralBreedOfUnitV7({ monsters: [] }, unitAtV7(herald, HORROR)),
    ).toBe("HERALD");
  });

  it("explains an Unbound daemon in its dock: what it is, how to bind it, whom it goes for", () => {
    const state = looseField([{ seat: 1, role: "FIGHTER", at: at(5, 1) }]);
    const horror = unitAtV7(state, HORROR);
    const view = viewForV7(state, seatIdV7(state, 1));
    const lines = monsterInfoLinesV7(view, horror.id);
    expect(lines.map((line) => [line.id, line.name])).toEqual([
      ["unbound", "Unbound"],
      ["bind-again", "Bind again"],
      ["provoked", "Hunting"],
    ]);
    expect(need(lines[2]).description).toBe(
      "Will attack your Fighter after this round.",
    );
    // No bounty line: killing it pays no Coins.
    expect(lines.some((line) => line.id === "bounty")).toBe(false);
    // While Furious the line says so, and nobody is told to bind it.
    const furious = looseField([], {}, true);
    expect(
      monsterInfoLinesV7(
        viewForV7(furious, seatIdV7(furious, 0)),
        unitAtV7(furious, HORROR).id,
      ).map((line) => line.id),
    ).toEqual(["unbound", "furious", "calm"]);
    for (const line of lines)
      expect(line.description).not.toMatch(/\d+,\s*\d+|\bu\d|_|undefined|NaN/);
  });

  it("warns of a Move into its reach and of its answer to an attack", () => {
    const state = looseField(
      [
        { seat: 1, role: "FIGHTER", at: at(9, 2) },
        { seat: 1, role: "MARKSMAN", at: at(5, 4) },
      ],
      { activeSeat: 1 },
    );
    const view = viewForV7(state, seatIdV7(state, 1));
    const fighter = unitAtV7(state, at(9, 2));
    const into = need(
      queryPlayerCommandsV7(view).find(
        (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
          command.kind === "MOVE" &&
          command.unitId === fighter.id &&
          command.path.at(-1)?.x === 8,
      ),
    );
    expect(provokeMoveWarningV7(view, into)).toBe(DAEMON_PROVOKE_WARNING_V7);
    // The Hexer shoots it from two tiles: within its reach, it may come.
    const shot = need(
      queryCombatPreviewV7(
        view,
        unitAtV7(state, at(5, 4)).id,
        unitAtV7(state, HORROR).id,
      ),
    );
    expect(shot.monsterRetaliates).toBe(true);
    expect(monsterRetaliationNoteV7(view, shot)).toBe(
      "The daemon may come for it after this round",
    );
  });
});

describe("Unbound: words", () => {
  it("has plain glossary entries for Unbound, Furious, Bind again, and a daemon's kills", () => {
    const expected: readonly (readonly [string, string])[] = [
      ["UNBOUND", "Unbound"],
      ["FURIOUS", "Furious"],
      ["BIND_AGAIN", "Bind again"],
      ["DAEMONS_FEED", "Daemons feed"],
    ];
    for (const [id, name] of expected) {
      const entry = glossaryEntryV7(id as never);
      expect(entry.name).toBe(name);
      expect(entry.text.length, id).toBeLessThanOrEqual(GLOSSARY_TEXT_LIMIT_V7);
      // Plain words: no formulas, and never the Goblins' word.
      expect(entry.text, id).not.toMatch(/\d\s*[+×*/]|=|berserk/i);
    }
    // A bound Horror's card says what its kills pay and what failure means.
    expect(summonedGlossaryV7("HORROR").map((entry) => entry.id)).toEqual([
      "DAEMON",
      "DAEMONS_FEED",
      "CAPTURE",
      "BOO",
      "STRIDE",
      "UNBOUND",
    ]);
    for (const source of FAVOUR_SOURCES_V7)
      expect(FAVOUR_SOURCE_LABELS_V7[source].length, source).toBeGreaterThan(3);
    expect(FAVOUR_SOURCE_LABELS_V7.DAEMON_KILL).toBe("a daemon's kill");
  });

  it("names the Channel on an Unbound daemon Bind, with the strands of the turn", () => {
    const state = looseField([{ seat: 0, role: "FIGHTER", at: at(6, 5) }]);
    const view = viewForV7(state, seatIdV7(state, 0));
    const command = need(
      queryPlayerCommandsV7(view).find(
        (candidate) => candidate.kind === "CHANNEL",
      ),
    );
    const button = need(cultChannelCommandPresentationV7(view, command));
    expect(BIND_LABEL_V7).toBe("Bind");
    expect([button.label, button.chip]).toEqual(["Bind Horror", "1 / 1"]);
    expect(button.tooltip).toContain("yours again");
    expect(`${button.label} ${button.chip} ${button.tooltip}`).not.toMatch(
      /\d+,\s*\d+|#\d|\bu\d|_|undefined|null|NaN/,
    );
  });
});

describe("Unbound: the Normal AI reads an Unbound daemon as a monster", () => {
  let previous: readonly (typeof ARMY_PLAY_FACTIONS_V7)[number][] | null = null;
  afterEach(() => {
    if (previous !== null) setArmyPlayFactionsV7(previous);
    previous = null;
  });

  /** Plays the active seat's whole turn with the Normal AI. */
  function turn(start: GameStateV7): readonly CommandV7[] {
    let state = start;
    const actor = need(state.turnOrder[state.activeSeatIndex]);
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

  const humans: readonly GoblinPieceV7[] = [
    { seat: 1, role: "KNIGHT", at: at(5, 1) },
    { seat: 1, role: "FIGHTER", at: at(2, 5) },
    { seat: 1, role: "MARKSMAN", at: at(3, 6) },
  ];

  it("lists it with the monsters: no bounty, and its reach is where a routine Move does not end", () => {
    const state = looseField(humans, { activeSeat: 1, coins: 30 });
    const view = viewForV7(state, seatIdV7(state, 1));
    const facts = need(curiosityFactsV7(view));
    const horror = unitAtV7(state, HORROR);
    const monster = need(facts.monsterById.get(horror.id));
    expect(monster.breed).toBe("HORROR");
    expect(monster.bounty).toBe(0);
    expect(monster.regeneration).toBe(0);
    expect(monsterProvokedAtV7(facts, at(7, 3))).toBe(monster);
    expect(monsterProvokedAtV7(facts, at(9, 2))).toBeUndefined();
    // The policy's copy of the bounties follows the engine's.
    for (const breed of DAEMON_BREEDS_V7)
      expect(NEUTRAL_BOUNTY_FOR_POLICY_V7[breed]).toBe(
        NEUTRAL_BOUNTIES_V7[breed],
      );
  });

  it("plays its turn beside one on the older policy (a match with a Cult seat) without picking a Channel", () => {
    expect(armyPlayFactionV7("CULT")).toBe(false);
    const commands = turn(looseField(humans, { activeSeat: 1, coins: 30 }));
    expect(commands.at(-1)?.kind).toBe("END_TURN");
  });

  it("plays its turn beside one on the army policy, and kills it when it can", () => {
    // The Cult joins the army policy with its own AI bead (A1); until then
    // a match with a Cult seat keeps the older policy. This puts the Human
    // seat of such a match on the army rules for the test.
    previous = setArmyPlayFactionsV7([...ARMY_PLAY_FACTIONS_V7, "CULT"]);
    expect(armyPlayFactionV7("CULT")).toBe(true);
    // A healthy Unbound Horror: the turn ends; nothing crashes.
    const healthy = turn(looseField(humans, { activeSeat: 1, coins: 30 }));
    expect(healthy.at(-1)?.kind).toBe("END_TURN");
    // One at its last Hit Point beside the Knight: the hunt takes the kill.
    const weak = looseField(humans, { activeSeat: 1, coins: 30 }, false, {
      hp: 1,
    });
    const horror = unitAtV7(weak, HORROR);
    const kill = turn(weak);
    expect(
      kill.some(
        (command) =>
          command.kind === "ATTACK" && command.targetUnitId === horror.id,
      ),
    ).toBe(true);
    expect(kill.at(-1)?.kind).toBe("END_TURN");
    // An Unbound Herald on the board does not crash the policy either.
    const herald = withUnboundHeraldV7(
      cultFieldV7(humans, { activeSeat: 1, coins: 30 }),
      at(7, 2),
      0,
    );
    expect(turn(herald).at(-1)?.kind).toBe("END_TURN");
  });
});
