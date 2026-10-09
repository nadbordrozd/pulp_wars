import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  inspectNormalArmyV7,
  publicProjectedDamageForPolicyV7,
} from "../../src/ai/v7";
import {
  ARMY_RESEARCH_ROLES_V7,
  ARMY_UNDEAD_SPARE_UNITS_V7,
} from "../../src/ai/v7-army";
import {
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  parseGameStateV7,
  queryCombatPreviewV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import {
  dinosaurFieldV7,
  dinosaurTechsWithoutV7,
  patchTileV7,
  type DinosaurFieldOptionsV7,
} from "../fixtures/v7-dinosaur-ai";
import {
  applyOkV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";

// Step two of the Dinosaur pass (`pulp_wars-w49.26`,
// docs/product/RULESET_7_TUNING_DINOSAUR.md section 14): hand-played games
// as the Humans against the Dinosaur AI and as the Dinosaurs. No rule and
// no number changed; the identity stayed `pulp-wars-poc-7r58` (7r59 since
// step two of the Ice Folk pass, `pulp_wars-w49.27`). The Normal AI
// of a Dinosaur seat researches the Spitter and the Raptor before the
// Triceratops, trains before it researches while it is short of units, buys
// one growth technology before Nesting's two while no enemy is in sight,
// keeps the price of a due technology it can pay, sends no Caveman or
// Raptor into contact alone, counts the run-up of a Triceratops that has
// yet to move and the Crack of a Stegosaurus's shot, and strikes with the
// Stegosaurus first, then its dinosaurs, then its Cavemen. Two-seat field
// (tests/fixtures/v7-dinosaur-ai.ts, seed-2 Dry Land, 11 x 11): seat 0
// capital (8, 8), seat 1 capital (2, 8), villages (5, 5), (8, 5), (5, 8);
// every other land tile open Grass.

const at = (x: number, y: number): CoordV7 => ({ x, y });
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const gap = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

const own = (
  role: UnitRoleIdV7,
  x: number,
  y: number,
  extra: Partial<GoblinPieceV7> = {},
): GoblinPieceV7 => ({ seat: 0, role, at: at(x, y), ...extra });
const foe = (
  role: UnitRoleIdV7,
  x: number,
  y: number,
  extra: Partial<GoblinPieceV7> = {},
): GoblinPieceV7 => ({ seat: 1, role, at: at(x, y), ...extra });

/** The technologies in the canonical order a state lists them in. */
const techsOf = (
  ...techs: readonly TechnologyIdV7[]
): readonly TechnologyIdV7[] =>
  TECHNOLOGY_IDS_V7.filter((tech) => techs.includes(tech));
/** Every Dinosaur technology but Wallbreaker (the Dinosaur Explosives). */
const NO_WALLBREAKER = dinosaurTechsWithoutV7("EXPLOSIVES");

/**
 * Seat 0 Dinosaur against seat 1 Human; the Dinosaurs move. The units on
 * `orphans` have no home city (the capital keeps its unit slots).
 */
function field(
  pieces: readonly GoblinPieceV7[],
  options: DinosaurFieldOptionsV7 & {
    readonly orphans?: readonly CoordV7[];
    readonly fertile?: readonly CoordV7[];
  } = {},
): GameStateV7 {
  let state = dinosaurFieldV7(["DINOSAUR", "ORIGINAL"], pieces, options);
  for (const where of options.fertile ?? [])
    state = patchTileV7(state, where, { resource: "FERTILE_GROUND" });
  return {
    ...state,
    units: state.units.map((unit) =>
      (options.orphans ?? []).some((where) => same(where, unit.at))
        ? { ...unit, homeCityId: null }
        : unit,
    ),
  };
}

function viewOf(state: GameStateV7): PlayerViewV7 {
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined) throw new Error("active player missing");
  return viewForV7(state, actor);
}

/** The active seat plays its turn with the Normal policy. */
function policyTurn(start: GameStateV7): {
  readonly commands: readonly CommandV7[];
  readonly state: GameStateV7;
} {
  const actor = start.turnOrder[start.activeSeatIndex];
  if (actor === undefined) throw new Error("no active seat");
  const commands: CommandV7[] = [];
  let state = start;
  for (let accepted = 0; accepted < 128; accepted += 1) {
    const view = viewForV7(state, actor);
    const command = chooseNormalTurnCommandV7(
      view,
      accepted,
      128,
      chooseNormalCommandV7(view),
    );
    if (command === null) throw new Error("no command");
    if (command.kind === "END_TURN") return { commands, state };
    commands.push(command);
    state = applyOkV7(state, actor, command).state;
  }
  throw new Error("the turn did not end");
}

const kindsOf = (commands: readonly CommandV7[]): readonly string[] =>
  commands.map((command) => command.kind);
const attacksOf = (
  commands: readonly CommandV7[],
): readonly Extract<CommandV7, { kind: "ATTACK" }>[] =>
  commands.flatMap((command) => (command.kind === "ATTACK" ? [command] : []));

function recorded(name: string): GameStateV7 {
  const state = parseGameStateV7(
    JSON.parse(readFileSync(`tests/fixtures/${name}.json`, "utf8")),
  );
  if (state === null) throw new Error(`${name}: not a current state`);
  return state;
}

const research = (state: GameStateV7) =>
  inspectNormalArmyV7(viewOf(state)).research;

describe("step two of the Dinosaur pass: no rule changed", () => {
  it("kept the identity of step two of the Martian pass", () => {
    // (7r58 then; step two of the Ice Folk pass took 7r59.)
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r61");
  });
});

describe("step two of the Dinosaur pass: the Dinosaur Normal AI's research order", () => {
  const seat = (techs: readonly TechnologyIdV7[]): GameStateV7 =>
    field(
      [
        own("FIGHTER", 9, 9),
        own("FIGHTER", 9, 8),
        own("FIGHTER", 9, 7),
        foe("FIGHTER", 0, 0),
      ],
      {
        techs: { 0: techsOf(...techs), 1: [] },
        coins: 0,
        orphans: [at(9, 9), at(9, 8), at(9, 7)],
      },
    );

  it("has the Spitter and the Raptor before the Triceratops", () => {
    expect(ARMY_RESEARCH_ROLES_V7.DINOSAUR).toEqual([
      "GUARD",
      "MARKSMAN",
      "RAIDER",
      "SWORDSMAN",
      "CATAPULT",
      "CAPTAIN",
      "KNIGHT",
    ]);
    const nested: readonly TechnologyIdV7[] = [
      "GATHERING",
      "DRILL",
      "FORTIFICATION",
    ];
    // Hunting and Spitters, then Scouting, and only then the Triceratops's
    // two dear technologies (it was Engineering right after Nesting).
    expect(research(seat(nested))).toMatchObject({ tech: "HUNTING" });
    expect(research(seat([...nested, "HUNTING"]))).toMatchObject({
      tech: "MARKSMANSHIP",
      unlocks: "MARKSMAN",
    });
    const spitting: readonly TechnologyIdV7[] = [
      ...nested,
      "HUNTING",
      "MARKSMANSHIP",
    ];
    expect(research(seat(spitting))).toMatchObject({
      tech: "SCOUTING",
      unlocks: "RAIDER",
    });
    expect(research(seat([...spitting, "SCOUTING"]))).toMatchObject({
      tech: "ENGINEERING",
    });
    expect(
      research(seat([...spitting, "SCOUTING", "ENGINEERING"])),
    ).toMatchObject({ tech: "METALLURGY", unlocks: "SWORDSMAN" });
    // Then the Stegosaurus: Forestry and Timber.
    expect(
      research(seat([...spitting, "SCOUTING", "ENGINEERING", "METALLURGY"])),
    ).toMatchObject({ tech: "FORESTRY" });
  });
});

describe("step two of the Dinosaur pass: the Dinosaur Normal AI's opening", () => {
  const CAVEMEN = [at(9, 9), at(9, 8), at(9, 7), at(8, 9)];
  /**
   * A Dinosaur seat with one level-1 capital, `cavemen` Cavemen beside it
   * (with no home city, so the capital has its two unit slots), Fertile
   * Ground in the capital's land, and the Human seat's one unit far away.
   */
  const opening = (
    cavemen: number,
    options: {
      readonly techs?: readonly TechnologyIdV7[];
      readonly enemyAt?: CoordV7;
      readonly coins?: number;
      readonly extra?: readonly GoblinPieceV7[];
      readonly eggs?: DinosaurFieldOptionsV7["eggs"];
    } = {},
  ): GameStateV7 =>
    field(
      [
        ...CAVEMEN.slice(0, cavemen).map((where) =>
          own("FIGHTER", where.x, where.y),
        ),
        ...(options.extra ?? []),
        foe("FIGHTER", options.enemyAt?.x ?? 0, options.enemyAt?.y ?? 0),
      ],
      {
        techs: {
          0: techsOf(...(options.techs ?? ["GATHERING", "DRILL"])),
          1: [],
        },
        coins: options.coins ?? 20,
        orphans: [
          ...CAVEMEN,
          ...(options.extra ?? []).map((piece) => piece.at),
        ],
        fertile: [at(7, 7), at(9, 7)],
        ...(options.eggs === undefined ? {} : { eggs: options.eggs }),
      },
    );

  it("trains before it researches while it fields fewer capturers than its cities and two more", () => {
    expect(ARMY_UNDEAD_SPARE_UNITS_V7).toBe(2);
    expect(inspectNormalArmyV7(viewOf(opening(2))).bodiesFirst).toBe(true);
    const short = policyTurn(opening(2));
    expect(short.commands[0]).toMatchObject({ kind: "TRAIN", role: "FIGHTER" });
    // With three Cavemen the technology comes first, as before.
    expect(inspectNormalArmyV7(viewOf(opening(3))).bodiesFirst).toBe(false);
    expect(kindsOf(policyTurn(opening(3)).commands)[0]).toBe("RESEARCH");
    // In a war too (a Human Fighter three tiles from a Caveman).
    expect(
      inspectNormalArmyV7(viewOf(opening(2, { enemyAt: at(6, 6) }))),
    ).toMatchObject({ war: true, bodiesFirst: true });
  });

  it("counts an Egg as the unit inside, and no Triceratops", () => {
    // Two Cavemen and a Raptor Egg beside the capital: three capturers.
    expect(
      inspectNormalArmyV7(
        viewOf(
          opening(2, { eggs: [{ seat: 0, role: "RAIDER", at: at(7, 8) }] }),
        ),
      ).bodiesFirst,
    ).toBe(false);
    // Two Cavemen and a Triceratops: the Triceratops takes no village and
    // holds no center, so the seat is still short of units.
    expect(
      inspectNormalArmyV7(
        viewOf(opening(2, { extra: [own("SWORDSMAN", 7, 9)] })),
      ).bodiesFirst,
    ).toBe(true);
  });

  it("researches one growth technology before Nesting's two while no enemy is in sight of its cities", () => {
    expect(research(opening(3, { techs: ["GATHERING"] }))).toMatchObject({
      tech: "FARMING",
      growth: true,
    });
    expect(
      research(opening(3, { techs: ["GATHERING", "FARMING"] })),
    ).toMatchObject({ tech: "DRILL", growth: false });
    expect(
      research(opening(3, { techs: ["GATHERING", "FARMING", "DRILL"] })),
    ).toMatchObject({ tech: "FORTIFICATION", unlocks: "GUARD" });
    // A hostile unit within six tiles of the capital: the Ankylosaurus
    // first.
    expect(
      research(opening(3, { techs: ["GATHERING"], enemyAt: at(2, 8) })),
    ).toMatchObject({ tech: "DRILL", growth: false });
  });
});

describe("step two of the Dinosaur pass: the price of a due technology is kept", () => {
  it("on the recorded position (seed 9, round 13) buys Spitters where it laid an Egg and kept 5 Coins", () => {
    // Five cities at war, 16 Coins, Spitters due at 15. The seat laid an
    // Ankylosaurus Egg in a threatened city first (5 Coins), could no
    // longer pay, and bought Spitters four rounds later.
    const start = recorded("ruleset-v7-dinosaur-spitters-due");
    const seat = start.players.find((player) => player.faction === "DINOSAUR");
    expect(start.turnOrder[start.activeSeatIndex]).toBe(seat?.id);
    expect(seat?.coins).toBe(16);
    expect(inspectNormalArmyV7(viewOf(start))).toMatchObject({
      war: true,
      research: { tech: "MARKSMANSHIP", cost: 15, unlocks: "MARKSMAN" },
    });
    const turn = policyTurn(start);
    const kinds = kindsOf(turn.commands);
    expect(turn.commands).toContainEqual({
      kind: "RESEARCH",
      tech: "MARKSMANSHIP",
    });
    const production = kinds.findIndex(
      (kind) => kind === "LAY_EGG" || kind === "TRAIN",
    );
    expect(production === -1 || production > kinds.indexOf("RESEARCH")).toBe(
      true,
    );
  });
});

describe("step two of the Dinosaur pass: into contact with company", () => {
  it("on the recorded position (a hand-played game, round 12) sends neither Caveman up alone", () => {
    // A Caveman at (2, 5) walked up beside three Human Raiders and struck
    // one for 7; a Caveman at (4, 8) walked up beside a Fighter with a
    // second Fighter behind it and struck for 5. Both were dead a turn
    // later.
    const start = recorded("ruleset-v7-dinosaur-lone-cavemen");
    const lone = [at(2, 5), at(4, 8)].map((where) => unitAtV7(start, where));
    for (const unit of lone) expect(unit.role).toBe("FIGHTER");
    const turn = policyTurn(start);
    expect(attacksOf(turn.commands)).toEqual([]);
    const seat = start.players.find((player) => player.faction === "DINOSAUR");
    const hostiles = turn.state.units.filter(
      (unit) => unit.ownerId !== seat?.id,
    );
    for (const unit of lone) {
      const now = turn.state.units.find((item) => item.id === unit.id);
      expect(now).toBeDefined();
      expect(
        hostiles.some((hostile) => gap(hostile.at, now?.at ?? unit.at) === 1),
        `unit ${unit.id}`,
      ).toBe(false);
    }
  });

  it("still makes the kills of the turn in which its units strike together (the same game, round 17)", () => {
    // Five rounds later the seat killed three of the player's units in one
    // turn, each blow beside another unit of its own: that turn is played
    // as it was.
    const start = recorded("ruleset-v7-dinosaur-company");
    const seat = start.players.find((player) => player.faction === "DINOSAUR");
    const hostile = (state: GameStateV7): number =>
      state.units.filter((unit) => unit.ownerId !== seat?.id).length;
    const turn = policyTurn(start);
    expect(attacksOf(turn.commands)).toHaveLength(5);
    expect(hostile(start) - hostile(turn.state)).toBe(3);
  });
});

describe("step two of the Dinosaur pass: what the policy counts for its own blows", () => {
  it("counts the run-up of a Triceratops that has yet to move", () => {
    // A Triceratops two tiles from a Fighter: after its Move it charges at
    // Attack 4 and kills (12). The projection from the tile beside the
    // Fighter read the Attack 3 of a Triceratops that has not moved (8).
    const state = field(
      [own("SWORDSMAN", 5, 5), own("FIGHTER", 8, 8), foe("FIGHTER", 7, 5)],
      { techs: { 0: NO_WALLBREAKER, 1: [] } },
    );
    const view = viewOf(state);
    const triceratops = view.units.find((unit) => same(unit.at, at(5, 5)));
    const fighter = view.units.find((unit) => same(unit.at, at(7, 5)));
    if (triceratops === undefined || fighter === undefined)
      throw new Error("units");
    expect(
      publicProjectedDamageForPolicyV7(
        view,
        { ...triceratops, at: at(6, 5) },
        fighter,
        fighter.at,
      ),
    ).toBe(12);
    // The engine agrees once the Move is made.
    const moved = applyOkV7(state, seatIdV7(state, 0), {
      kind: "MOVE",
      unitId: triceratops.id,
      path: [at(6, 5)],
    }).state;
    expect(
      queryCombatPreviewV7(viewOf(moved), triceratops.id, fighter.id),
    ).toMatchObject({ damageToDefender: 12, defenderDies: true, runUp: 1 });
    // And the policy makes that Move and the kill.
    const turn = policyTurn(state);
    expect(attacksOf(turn.commands)).toHaveLength(1);
    expect(
      turn.state.units.some((unit) => unit.ownerId !== seatIdV7(state, 0)),
    ).toBe(false);
  });

  it("counts two tiles of run-up only with Wallbreaker", () => {
    const projected = (techs: readonly TechnologyIdV7[]): number => {
      const state = field(
        [own("SWORDSMAN", 4, 5), own("FIGHTER", 8, 8), foe("SWORDSMAN", 7, 5)],
        { techs: { 0: techs, 1: [] } },
      );
      const view = viewOf(state);
      const triceratops = view.units.find((unit) => same(unit.at, at(4, 5)));
      const champion = view.units.find((unit) => same(unit.at, at(7, 5)));
      if (triceratops === undefined || champion === undefined)
        throw new Error("units");
      return publicProjectedDamageForPolicyV7(
        view,
        { ...triceratops, at: at(6, 5) },
        champion,
        champion.at,
      );
    };
    // One tile counts: 11 of a Champion's 15 HP. With Wallbreaker two do,
    // and the charge kills it.
    expect(projected(NO_WALLBREAKER)).toBe(11);
    expect(projected(TECHNOLOGY_IDS_V7)).toBe(15);
  });

  it("counts the Crack of a Stegosaurus's shot", () => {
    // A Stegosaurus three tiles from a Champion with a Caveman beside it.
    const state = field(
      [
        own("CATAPULT", 5, 2),
        own("FIGHTER", 4, 5),
        own("FIGHTER", 8, 8),
        foe("SWORDSMAN", 5, 5),
      ],
      { techs: { 0: NO_WALLBREAKER, 1: [] } },
    );
    const before = viewOf(state);
    const caveman = unitAtV7(state, at(4, 5));
    const champion = unitAtV7(state, at(5, 5));
    const alone = queryCombatPreviewV7(before, caveman.id, champion.id);
    const shot = applyOkV7(state, seatIdV7(state, 0), {
      kind: "ATTACK",
      unitId: unitAtV7(state, at(5, 2)).id,
      targetUnitId: champion.id,
    }).state;
    const view = viewOf(shot);
    expect(view.ninthUnit.crackedThisTurn).toEqual([champion.id]);
    const exact = queryCombatPreviewV7(view, caveman.id, champion.id);
    if (alone === null || exact === null) throw new Error("no preview");
    // The Champion is Cracked and hunted: the Caveman's blow is far more
    // than the 4 it deals alone, and the policy reads the same number.
    expect(alone.damageToDefender).toBe(4);
    expect(exact.damageToDefender).toBeGreaterThan(alone.damageToDefender + 3);
    const publicCaveman = view.units.find((unit) => unit.id === caveman.id);
    const publicChampion = view.units.find((unit) => unit.id === champion.id);
    if (publicCaveman === undefined || publicChampion === undefined)
      throw new Error("units");
    expect(
      publicProjectedDamageForPolicyV7(
        view,
        publicCaveman,
        publicChampion,
        publicChampion.at,
      ),
    ).toBe(exact.damageToDefender);
  });
});

describe("step two of the Dinosaur pass: the order of blows", () => {
  it("shoots with the Stegosaurus first, and the Caveman then kills the Champion", () => {
    // A Champion (15 HP) with a Caveman beside it and a Stegosaurus three
    // tiles away. Alone the Caveman deals 4 and takes 5 and the shot deals
    // 6: no kill by the plain sum. The shot leaves the Champion Cracked and
    // hunted, and the Caveman's blow then kills.
    const state = field(
      [
        own("CATAPULT", 5, 2),
        own("FIGHTER", 4, 5),
        own("FIGHTER", 8, 8),
        foe("SWORDSMAN", 5, 5),
      ],
      { techs: { 0: NO_WALLBREAKER, 1: [] }, coins: 0 },
    );
    const stegosaurus = unitAtV7(state, at(5, 2));
    const caveman = unitAtV7(state, at(4, 5));
    const turn = policyTurn(state);
    expect(attacksOf(turn.commands).map((command) => command.unitId)).toEqual([
      stegosaurus.id,
      caveman.id,
    ]);
    expect(
      turn.state.units.some((unit) => unit.ownerId !== seatIdV7(state, 0)),
    ).toBe(false);
    // The Caveman's blow is no candidate while the shot is still to come.
    const first = chooseNormalCommandV7(viewOf(state)).candidates.filter(
      (candidate) =>
        candidate.score.priority >= 0 && candidate.command.kind === "ATTACK",
    );
    expect(first.map((candidate) => candidate.command)).toEqual([
      {
        kind: "ATTACK",
        unitId: stegosaurus.id,
        targetUnitId: unitAtV7(state, at(5, 5)).id,
      },
    ]);
  });

  it("does not hold a Caveman whose target stands beside a dinosaur already", () => {
    // The recorded position of round 13 again: a Caveman at (5, 4) and a
    // Raptor at (5, 2) beside a Human Fighter at (6, 3). The Caveman has
    // Pack Hunt now (9 of the Fighter's 10 HP) and strikes first; the
    // Raptor finishes. No own unit dies in the turn.
    const start = recorded("ruleset-v7-dinosaur-spitters-due");
    const caveman = unitAtV7(start, at(5, 4));
    const fighter = unitAtV7(start, at(6, 3));
    expect([caveman.role, fighter.role]).toEqual(["FIGHTER", "FIGHTER"]);
    const turn = policyTurn(start);
    expect(turn.commands[0]).toEqual({
      kind: "ATTACK",
      unitId: caveman.id,
      targetUnitId: fighter.id,
    });
    expect(turn.state.units.some((unit) => unit.id === fighter.id)).toBe(false);
    const seat = start.players.find((player) => player.faction === "DINOSAUR");
    const count = (state: GameStateV7): number =>
      state.units.filter(
        (unit) => unit.ownerId === seat?.id && unit.form === "LAND",
      ).length;
    expect(count(turn.state)).toBeGreaterThanOrEqual(count(start));
  });
});
