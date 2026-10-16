import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
} from "../../src/ai/v7";
import {
  ARMY_PLAY_FACTIONS_V7,
  setArmyPlayFactionsV7,
} from "../../src/ai/v7-army";
import {
  CULT_BOO_PRIORITY_V7,
  CULT_HERALD_PRIORITY_V7,
  CULT_PROCLAIM_LAST_PRIORITY_V7,
  CULT_RIBBIT_PRIORITY_V7,
  CULT_SAVE_FAVOUR_V7,
  CULT_STARFALL_PRIORITY_V7,
  CULT_SUMMONING_PRIORITY_V7,
  CULT_SWITCHEROO_PRIORITY_V7,
  CULT_TENTACLE_PRIORITY_V7,
  cultSavingV7,
} from "../../src/ai/v7-cult-rituals";
import {
  previewTentacleV7,
  queryAiReadyCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type UnitId,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import {
  cultFieldV7,
  withFavourV7,
  withHorrorV7,
  withRitualV7,
  withStrandsV7,
} from "../fixtures/v7-cult";
import { unitCandidatesV7 } from "../fixtures/v7-dinosaur-ai";
import {
  applyOkV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import type { FieldOptionsV7 } from "../fixtures/v7-revision20";

// The Cult seat's rituals and tricks (`pulp_wars-mch9.11`, bead A3 of
// docs/product/RULESET_7_CULTISTS.md sections 15.3 and 15.4, as built in
// section 15.8; `src/ai/v7-cult-rituals.ts`): the Great Summoning and the
// Favour kept for it, Star-fall, the Herald's two attacks and Proclaim,
// Boo!, Ribbit, Switcheroo, the Tentacle, and Pick Me!.
// A baseline designed from judgement: no match was played for this bead.
// Every rule is shown on a small hand-built state, as a decision or as the
// one turn the seat plays from it.
//
// The field (tests/fixtures/v7-cult.ts, 11 x 11): seat 0 (the Cult, the
// viewer, to move) capital (8, 8) with territory x 7-9, y 7-9; seat 1
// (Human) capital (2, 8) with territory x 1-3, y 7-9; villages (5, 5),
// (8, 5), (5, 8); every other land tile open Grass; every tile explored;
// every technology (The Stars Are Right too); no Coins.
// Roles: FIGHTER the Initiate, CAPTAIN the Summoner, MARKSMAN the Hexer,
// GUARD the Idol Bearer, RAIDER the Familiar, CATAPULT the Stargazer (the
// Cult's KNIGHT and SWORDSMAN slots are vacant since the Cult redesign,
// `pulp_wars-mch9.31`: the Tentacle is the Summoner's, Pick Me! is gone).

const at = (x: number, y: number): CoordV7 => ({ x, y });
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

/** A unit that can do nothing more this turn. */
const SPENT: Partial<UnitStateV7["activation"]> = {
  moved: true,
  attacked: true,
  attacksUsed: 1,
  recovered: true,
  captured: true,
  handled: true,
  specialActed: true,
};
/** A cultist that has channelled this turn. */
const CHANNELLED: Partial<UnitStateV7["activation"]> = {
  specialActed: true,
  handled: true,
};
/** A unit that has moved this turn and may still act. */
const MOVED: Partial<UnitStateV7["activation"]> = {
  moved: true,
  movedPathLength: 1,
};

/** The Human garrison: the enemy the board always has. */
const GARRISON = foe("FIGHTER", 2, 8);

const scene = (
  pieces: readonly GoblinPieceV7[],
  options: FieldOptionsV7 = {},
  garrison: GoblinPieceV7 = GARRISON,
): GameStateV7 => {
  const state = cultFieldV7([...pieces, garrison], { coins: 0, ...options });
  return {
    ...state,
    round: 12,
    players: state.players.map((player) => ({
      ...player,
      achievementEntitlements: player.achievementEntitlements.map((entry) =>
        entry.unlocked ? { ...entry, spent: true } : entry,
      ),
    })),
  };
};

function viewOf(state: GameStateV7): PlayerViewV7 {
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined) throw new Error("active player missing");
  return viewForV7(state, actor);
}

/** The first decision of the seat on this state. */
const first = (
  state: GameStateV7,
): { readonly command: CommandV7 | null; readonly priority: number } => {
  const decision = chooseNormalCommandV7(viewOf(state));
  return {
    command: decision.command,
    priority: decision.candidates[0]?.score.priority ?? -1,
  };
};

/** The active seat plays its one turn with the Normal policy. */
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
    const decision = chooseNormalCommandV7(view);
    const command = chooseNormalTurnCommandV7(view, accepted, 128, decision);
    if (command === null) throw new Error("no command");
    if (command.kind === "END_TURN") return { commands, state };
    // Every command the seat plays is one the engine offers it.
    expect(
      queryAiReadyCommandsV7(view).some(
        (item) => JSON.stringify(item.command) === JSON.stringify(command),
      ),
      command.kind,
    ).toBe(true);
    commands.push(command);
    state = applyOkV7(state, actor, command).state;
  }
  throw new Error("the turn did not end");
}

const ofKind = <K extends CommandV7["kind"]>(
  commands: readonly CommandV7[],
  kind: K,
): readonly Extract<CommandV7, { kind: K }>[] =>
  commands.filter(
    (command): command is Extract<CommandV7, { kind: K }> =>
      command.kind === kind,
  );
const kindsOf = (commands: readonly CommandV7[]): readonly string[] =>
  commands.map((command) => command.kind);

const favourOf = (state: GameStateV7): number =>
  state.cult.favour.find((entry) => entry.playerId === seatIdV7(state, 0))
    ?.favour ?? 0;
const idAt = (state: GameStateV7, where: CoordV7): UnitId =>
  unitAtV7(state, where).id;
const nowAt = (state: GameStateV7, id: UnitId): CoordV7 => {
  const unit = state.units.find((item) => item.id === id);
  if (unit === undefined) throw new Error("unit gone");
  return unit.at;
};
const alive = (state: GameStateV7, id: UnitId): boolean =>
  state.units.some((unit) => unit.id === id && unit.hp > 0);

/** The tiles the Move candidates of the unit on `from` end on. */
const ends = (state: GameStateV7, from: CoordV7): readonly CoordV7[] =>
  unitCandidatesV7(state, from, "MOVE").flatMap((candidate) => {
    const end =
      candidate.command.kind === "MOVE"
        ? candidate.command.path.at(-1)
        : undefined;
    return end === undefined ? [] : [end];
  });

describe("the Cult seat: the Great Summoning (section 15.3)", () => {
  // A Summoner with Initiates beside it in the far corner: the garrison is
  // more than six tiles away, so no Horror is on offer to tempt it.
  const circle = (
    favour: number,
    chanters: number,
    extra: readonly GoblinPieceV7[] = [],
  ): GameStateV7 =>
    withFavourV7(
      scene([
        own("CAPTAIN", 9, 1),
        ...[
          own("FIGHTER", 8, 0),
          own("FIGHTER", 8, 1),
          own("FIGHTER", 8, 2),
          own("FIGHTER", 9, 2),
        ].slice(0, chanters),
        ...extra,
      ]),
      0,
      favour,
    );

  it("begins it with 18 Favour, three chanters, and nobody in a visible enemy's reach", () => {
    const start = circle(18, 3);
    const decision = first(start);
    expect(decision.command?.kind).toBe("BEGIN_RITUAL");
    expect(decision.priority).toBe(CULT_SUMMONING_PRIORITY_V7);
    const begun = decision.command;
    if (begun?.kind !== "BEGIN_RITUAL") throw new Error("no ritual");
    expect(begun.ritual).toBe("GREAT_SUMMONING");
    // The mark is a free tile.
    expect(start.units.some((unit) => gap(unit.at, begun.at) === 0)).toBe(
      false,
    );
    const turn = policyTurn(start);
    expect(ofKind(turn.commands, "BEGIN_RITUAL")).toHaveLength(1);
    expect(favourOf(turn.state)).toBe(0);
    expect(turn.state.cult.rituals).toHaveLength(1);
    expect(turn.state.cult.rituals[0]?.chanterUnitIds).toHaveLength(3);
  });

  it("begins none with 17 Favour, nor with two chanters and nobody to come", () => {
    expect(kindsOf(policyTurn(circle(17, 3)).commands)).not.toContain(
      "BEGIN_RITUAL",
    );
    expect(kindsOf(policyTurn(circle(18, 2)).commands)).not.toContain(
      "BEGIN_RITUAL",
    );
  });

  it("begins none with a visible enemy able to reach a chanter", () => {
    // A Knight three tiles from the Initiate on (8, 2).
    const start = circle(18, 3, [foe("KNIGHT", 5, 3)]);
    expect(
      queryAiReadyCommandsV7(viewOf(start)).some(
        (item) => item.command.kind === "BEGIN_RITUAL",
      ),
    ).toBe(true);
    expect(kindsOf(policyTurn(start).commands)).not.toContain("BEGIN_RITUAL");
  });

  it("begins none without four robed cultists to spare beyond its Horror's Control and one", () => {
    // Four cultists and a Horror: two are the Horror's, two are left.
    const start = withHorrorV7(circle(18, 3), 0, at(6, 1), {
      activation: SPENT,
    });
    const turn = policyTurn(start);
    expect(kindsOf(turn.commands)).not.toContain("BEGIN_RITUAL");
    expect(ofKind(turn.commands, "CHANNEL").length).toBeGreaterThan(0);
  });

  it("gathers: a cultist that can come steps beside the Summoner, and the circle begins in the same turn", () => {
    // Two beside the Summoner; the third stands two tiles from it.
    const start = circle(18, 2, [own("FIGHTER", 7, 3)]);
    const third = idAt(start, at(7, 3));
    const decision = first(start);
    expect(decision.command?.kind).toBe("MOVE");
    expect(decision.priority).toBe(CULT_SUMMONING_PRIORITY_V7);
    if (decision.command?.kind !== "MOVE") throw new Error("no Move");
    expect(decision.command.unitId).toBe(third);
    const turn = policyTurn(start);
    expect(gap(nowAt(turn.state, third), at(9, 1))).toBe(1);
    expect(kindsOf(turn.commands)).toEqual(["MOVE", "BEGIN_RITUAL"]);
    // Sanity (the mutation): with 17 Favour nobody is called.
    expect(first(circle(17, 2, [own("FIGHTER", 7, 3)])).priority).not.toBe(
      CULT_SUMMONING_PRIORITY_V7,
    );
  });

  it("keeps its Favour for it: no Horror from 9 Favour on, with the cultists to hold a Herald", () => {
    // The scene of A2's Summon, with the bodies for a Herald.
    const build = (favour: number, bodies: number): GameStateV7 =>
      withFavourV7(
        scene([
          own("CAPTAIN", 7, 3),
          own("FIGHTER", 7, 2),
          ...[own("FIGHTER", 9, 5), own("FIGHTER", 10, 5)].slice(0, bodies - 2),
          foe("FIGHTER", 2, 3),
        ]),
        0,
        favour,
      );
    const summons = (state: GameStateV7): number =>
      ofKind(policyTurn(state).commands, "SUMMON").length;
    expect(summons(build(CULT_SAVE_FAVOUR_V7, 4))).toBe(0);
    expect(favourOf(policyTurn(build(15, 4)).state)).toBe(15);
    // Sanity (the mutations): below 9 Favour it summons; with three
    // cultists (no Herald could be held) it summons; and with 25 it summons
    // from what is above the Herald's price.
    expect(summons(build(CULT_SAVE_FAVOUR_V7 - 1, 4))).toBe(1);
    expect(summons(build(15, 3))).toBe(1);
    const rich = policyTurn(build(25, 4));
    expect(ofKind(rich.commands, "SUMMON")).toHaveLength(1);
    expect(favourOf(rich.state)).toBe(21);
  });

  it("names the saving rule: The Stars Are Right, a Summoner, four spare cultists, 9 Favour", () => {
    // Half the Great Summoning's 18 (the Cult redesign's A-R1,
    // `pulp_wars-mch9.38`; 10 of 20 before).
    expect(CULT_SAVE_FAVOUR_V7).toBe(9);
    const facts = { stars: true, bodies: 6, wantedAll: 2, favour: 9 };
    expect(cultSavingV7(facts, 1)).toBe(true);
    expect(cultSavingV7({ ...facts, stars: false }, 1)).toBe(false);
    expect(cultSavingV7(facts, 0)).toBe(false);
    expect(cultSavingV7({ ...facts, bodies: 5 }, 1)).toBe(false);
    expect(cultSavingV7({ ...facts, favour: 8 }, 1)).toBe(false);
  });

  it("ends no own Move on the mark of its own Great Summoning", () => {
    // A circle on the Familiar's way to the village (8, 5).
    const leader = at(7, 3);
    const circleWith = (mark: CoordV7): GameStateV7 =>
      withRitualV7(
        scene([
          own("CAPTAIN", 7, 3),
          own("FIGHTER", 6, 2),
          own("FIGHTER", 6, 3),
          own("FIGHTER", 6, 4),
          own("RAIDER", 10, 4),
        ]),
        "GREAT_SUMMONING",
        leader,
        [at(6, 2), at(6, 3), at(6, 4)],
        mark,
      );
    // Sanity (the mutation): with the mark elsewhere the Familiar has Move
    // candidates beside the Summoner; each is refused once it is the mark.
    const open = ends(circleWith(at(8, 2)), at(10, 4)).filter(
      (tile) => gap(tile, leader) === 1,
    );
    expect(open.length).toBeGreaterThan(0);
    for (const tile of open)
      expect(
        ends(circleWith(tile), at(10, 4)).some((end) => gap(end, tile) === 0),
      ).toBe(false);
  });
});

describe("the Cult seat: Star-fall (section 15.4)", () => {
  it("marks the tile with the most enemy value on its nine tiles, with no own unit there", () => {
    const start = scene([
      own("CATAPULT", 7, 3),
      own("FIGHTER", 8, 3),
      foe("FIGHTER", 4, 3),
      foe("FIGHTER", 4, 4),
      foe("MARKSMAN", 3, 4),
    ]);
    const decision = first(start);
    expect(decision.priority).toBe(CULT_STARFALL_PRIORITY_V7);
    const begun = decision.command;
    if (begun?.kind !== "BEGIN_RITUAL") throw new Error("no star");
    expect(begun.ritual).toBe("STARFALL");
    // All three stand under it, and no own unit does.
    for (const where of [at(4, 3), at(4, 4), at(3, 4)])
      expect(gap(where, begun.at)).toBeLessThanOrEqual(1);
    for (const where of [at(7, 3), at(8, 3)])
      expect(gap(where, begun.at)).toBeGreaterThan(1);
    const turn = policyTurn(start);
    expect(turn.commands[0]).toEqual(begun);
    expect(turn.state.cult.rituals).toHaveLength(1);
  });

  it("drops none on one unit in the open (it walks away), but one on a siege unit", () => {
    const build = (role: UnitRoleIdV7): GameStateV7 =>
      // (Out of reach of the garrison of the Human capital, which stays.)
      scene([own("CATAPULT", 9, 2), own("FIGHTER", 10, 2), foe(role, 6, 2)]);
    expect(kindsOf(policyTurn(build("FIGHTER")).commands)).not.toContain(
      "BEGIN_RITUAL",
    );
    const siege = first(build("CATAPULT"));
    expect(siege.command?.kind).toBe("BEGIN_RITUAL");
  });

  it("drops none where an own unit stands under it", () => {
    // The only tiles that cover both Fighters also cover the own Initiate.
    const start = scene([
      own("CATAPULT", 7, 3),
      own("FIGHTER", 8, 3),
      own("FIGHTER", 4, 3),
      foe("FIGHTER", 3, 2),
      foe("FIGHTER", 3, 4),
    ]);
    for (const command of ofKind(policyTurn(start).commands, "BEGIN_RITUAL"))
      expect(gap(command.at, at(4, 3))).toBeGreaterThan(1);
  });

  // The Cult redesign (`pulp_wars-mch9.34`, a stop-gap until A-R2,
  // `pulp_wars-mch9.39`): a star begins alone; a cultist beside it joins
  // when the join turns a hit into a kill.
  it("begins a star alone with a mark, and joins it when a join turns a hit into a kill", () => {
    const pieces = [
      own("CATAPULT", 7, 3),
      own("FIGHTER", 8, 3),
      foe("FIGHTER", 4, 4),
    ];
    // A wounded Fighter: 6 alone leaves it standing, 9 kills it.
    const start = scene([...pieces, foe("FIGHTER", 4, 3, { hp: 8 })]);
    const gazer = idAt(start, at(7, 3));
    const joiner = idAt(start, at(8, 3));
    const decision = first(start);
    expect(decision.priority).toBe(CULT_STARFALL_PRIORITY_V7);
    expect(decision.command).toMatchObject({
      kind: "BEGIN_RITUAL",
      ritual: "STARFALL",
      unitId: gazer,
    });
    const turn = policyTurn(start);
    expect(kindsOf(turn.commands.slice(0, 2))).toEqual([
      "BEGIN_RITUAL",
      "JOIN_CHANT",
    ]);
    expect(ofKind(turn.commands, "JOIN_CHANT")).toEqual([
      { kind: "JOIN_CHANT", unitId: joiner, leaderUnitId: gazer },
    ]);
    // The Stargazer has not moved (a leader that moved leads no star).
    expect(nowAt(turn.state, gazer)).toEqual(at(7, 3));
    // Two healthy Fighters: the join kills nobody more, so nobody joins.
    const healthy = policyTurn(scene([...pieces, foe("FIGHTER", 4, 3)]));
    expect(kindsOf(healthy.commands)).toContain("BEGIN_RITUAL");
    expect(ofKind(healthy.commands, "JOIN_CHANT")).toEqual([]);
  });

  it("ends no own Move under its own star", () => {
    const pieces = [
      own("CATAPULT", 7, 3),
      own("FIGHTER", 8, 3),
      own("FIGHTER", 6, 1),
      foe("FIGHTER", 4, 3),
      foe("FIGHTER", 4, 4),
    ];
    const free = scene(pieces);
    const starOn = (mark: CoordV7): GameStateV7 =>
      withRitualV7(free, "STARFALL", at(7, 3), [at(8, 3)], mark);
    // Sanity (the mutation): with the star elsewhere the Initiate has Move
    // candidates; none of them once the star is to fall on that tile.
    const open = ends(starOn(at(10, 10)), at(6, 1));
    expect(open.length).toBeGreaterThan(0);
    for (const tile of open)
      expect(
        ends(starOn(tile), at(6, 1)).some((end) => gap(end, tile) <= 1),
      ).toBe(false);
  });
});

describe("the Cult seat: the Herald (sections 15.2 and 15.4)", () => {
  // A Herald with four Initiates behind it that can follow it.
  const CULTISTS = [
    own("FIGHTER", 4, 6),
    own("FIGHTER", 5, 6),
    own("FIGHTER", 6, 6),
    own("FIGHTER", 7, 6),
  ];
  // (The Cult redesign's A-R1, `pulp_wars-mch9.38`: with the 2 Favour its
  // Hunger eats at the next check, so the seat keeps it bound.)
  const herald = (
    pieces: readonly GoblinPieceV7[],
    where: CoordV7,
  ): GameStateV7 =>
    withFavourV7(
      withHorrorV7(scene([...CULTISTS, ...pieces]), 0, where, {
        role: "HERALD",
      }),
      0,
      2,
    );

  it("scores its two attacks together: it moves to the tile from which both kill", () => {
    // Beside it one Fighter; one step away a tile beside two that stand
    // side by side. (The Cult redesign, `pulp_wars-mch9.35`: a kill
    // advances it onto the victim's tile, so the second victim must stand
    // beside the first.)
    const start = herald(
      [foe("FIGHTER", 4, 3), foe("FIGHTER", 7, 2), foe("FIGHTER", 7, 3)],
      at(5, 4),
    );
    const id = idAt(start, at(5, 4));
    const decision = first(start);
    expect(decision.priority).toBe(CULT_HERALD_PRIORITY_V7);
    expect(decision.command).toMatchObject({ kind: "MOVE", unitId: id });
    const turn = policyTurn(start);
    expect(
      ofKind(turn.commands, "ATTACK").filter(
        (command) => command.unitId === id,
      ),
    ).toHaveLength(2);
    expect(alive(turn.state, idAt(start, at(7, 2)))).toBe(false);
    expect(alive(turn.state, idAt(start, at(7, 3)))).toBe(false);
    // It stands on its second victim's tile.
    expect([at(7, 2), at(7, 3)]).toContainEqual(nowAt(turn.state, id));
  });

  it("scores no second kill its first kill's advance takes it away from", () => {
    // Two Fighters two tiles apart: from (6, 3) both are beside it, but
    // after the first kill it stands beside neither of the others.
    const start = herald(
      [foe("FIGHTER", 4, 3), foe("FIGHTER", 7, 2), foe("FIGHTER", 7, 4)],
      at(5, 4),
    );
    const turn = policyTurn(start);
    const id = idAt(start, at(5, 4));
    expect(
      ofKind(turn.commands, "ATTACK").filter((command) => command.unitId === id)
        .length,
    ).toBeLessThanOrEqual(1);
  });

  it("stays for the kill it has when no tile offers more", () => {
    // Sanity (the mutation): one Fighter beside it, one beside that tile.
    const start = herald(
      [foe("FIGHTER", 4, 3), foe("FIGHTER", 7, 2)],
      at(5, 4),
    );
    expect(first(start).priority).not.toBe(CULT_HERALD_PRIORITY_V7);
    const turn = policyTurn(start);
    expect(alive(turn.state, idAt(start, at(4, 3)))).toBe(false);
  });

  it("Proclaims with its second attack when no second kill is on offer", () => {
    // One Fighter beside it, the Human capital (2, 8) three tiles away
    // from the Fighter's tile, where the kill advances it (the Cult
    // redesign, `pulp_wars-mch9.35`).
    const start = herald([foe("FIGHTER", 4, 5)], at(5, 5));
    const id = idAt(start, at(5, 5));
    const turn = policyTurn(start);
    const mine = turn.commands.filter(
      (command) => "unitId" in command && command.unitId === id,
    );
    expect(kindsOf(mine)).toContain("PROCLAIM");
    expect(kindsOf(mine).indexOf("ATTACK")).toBeLessThan(
      kindsOf(mine).indexOf("PROCLAIM"),
    );
    expect(turn.state.cult.cowed).toHaveLength(1);
    expect(alive(turn.state, idAt(start, at(4, 5)))).toBe(false);
  });

  it("makes the second kill instead when one is on offer", () => {
    const start = herald(
      [foe("FIGHTER", 4, 4), foe("FIGHTER", 4, 5)],
      at(5, 5),
    );
    const turn = policyTurn(start);
    expect(kindsOf(turn.commands)).not.toContain("PROCLAIM");
    expect(alive(turn.state, idAt(start, at(4, 4)))).toBe(false);
    expect(alive(turn.state, idAt(start, at(4, 5)))).toBe(false);
  });

  it("Proclaims last of all when it has nobody to attack", () => {
    // The Human garrison out of its reach (on the capital it would be a
    // kill whose advance puts it on the center, which is then being
    // taken, not Proclaimed: the Cult redesign, `pulp_wars-mch9.35`).
    const start = withHorrorV7(
      scene(CULTISTS, {}, foe("FIGHTER", 1, 9)),
      0,
      at(5, 5),
      { role: "HERALD" },
    );
    const decision = chooseNormalCommandV7(viewOf(start));
    const proclaim = decision.candidates.find(
      (candidate) => candidate.command.kind === "PROCLAIM",
    );
    // It may still move this turn: the Proclaim waits for that.
    expect(proclaim?.score.priority).toBe(CULT_PROCLAIM_LAST_PRIORITY_V7);
    const turn = policyTurn(start);
    expect(ofKind(turn.commands, "PROCLAIM")).toHaveLength(1);
    expect(turn.state.cult.cowed).toHaveLength(1);
  });
});

describe("the Cult seat: Boo! (section 15.4)", () => {
  // A Horror held by two Initiates that have channelled.
  const horror = (
    pieces: readonly GoblinPieceV7[],
    where: CoordV7,
  ): GameStateV7 =>
    withStrandsV7(
      withHorrorV7(
        scene([
          own("FIGHTER", 7, 5, { activation: CHANNELLED }),
          own("FIGHTER", 7, 6, { activation: CHANNELLED }),
          ...pieces,
        ]),
        0,
        where,
        { activation: MOVED },
      ),
      where,
      [at(7, 5), at(7, 6)],
    );

  it("scares two hostile living units beside it when no attack kills", () => {
    const start = horror(
      [foe("SWORDSMAN", 4, 3), foe("SWORDSMAN", 4, 5)],
      at(5, 4),
    );
    const decision = first(start);
    expect(decision.command?.kind).toBe("BOO");
    expect(decision.priority).toBe(CULT_BOO_PRIORITY_V7);
    const turn = policyTurn(start);
    expect(nowAt(turn.state, idAt(start, at(4, 3)))).toEqual(at(3, 2));
    expect(nowAt(turn.state, idAt(start, at(4, 5)))).toEqual(at(3, 6));
  });

  it("scares nobody beside one enemy, nor with an own unit beside it, nor in place of a kill", () => {
    const boos = (state: GameStateV7): number =>
      ofKind(policyTurn(state).commands, "BOO").length;
    expect(boos(horror([foe("SWORDSMAN", 4, 3)], at(5, 4)))).toBe(0);
    expect(
      boos(
        horror(
          [
            foe("SWORDSMAN", 4, 3),
            foe("SWORDSMAN", 4, 5),
            own("FIGHTER", 6, 4, { activation: SPENT }),
          ],
          at(5, 4),
        ),
      ),
    ).toBe(0);
    expect(
      boos(
        horror(
          [foe("SWORDSMAN", 4, 3, { hp: 1 }), foe("SWORDSMAN", 4, 5)],
          at(5, 4),
        ),
      ),
    ).toBe(0);
  });

  it("scares the garrison off an enemy center with an own capturer beside the center", () => {
    // The Horror on (3, 7), a Guard (which its attack does not kill) on the
    // center (2, 8), an Initiate on (2, 9).
    const build = (capturer: boolean): GameStateV7 =>
      withStrandsV7(
        withHorrorV7(
          scene(
            [
              own("FIGHTER", 5, 6, { activation: CHANNELLED }),
              own("FIGHTER", 5, 7, { activation: CHANNELLED }),
              ...(capturer ? [own("FIGHTER", 2, 9)] : []),
            ],
            {},
            foe("GUARD", 2, 8),
          ),
          0,
          at(3, 7),
          { activation: MOVED },
        ),
        at(3, 7),
        [at(5, 6), at(5, 7)],
      );
    const start = build(true);
    expect(first(start).command?.kind).toBe("BOO");
    const turn = policyTurn(start);
    expect(nowAt(turn.state, idAt(start, GARRISON.at))).toEqual(at(1, 9));
    // Sanity (the mutation): with nobody to walk on, it does not.
    expect(kindsOf(policyTurn(build(false)).commands)).not.toContain("BOO");
  });
});

describe("the Cult seat: Ribbit (section 15.4)", () => {
  it("frogs first the enemy that can hit an own channeller next turn", () => {
    // Two Initiates hold a Horror. A Fighter can step up to one of them; a
    // Champion (the stronger unit) is in the Hexer's reach too, four tiles
    // from the channellers.
    const build = (channels: boolean): GameStateV7 => {
      const base = scene([
        own("FIGHTER", 6, 4, { activation: CHANNELLED }),
        own("FIGHTER", 7, 4, { activation: CHANNELLED }),
        own("MARKSMAN", 5, 2),
        foe("FIGHTER", 4, 3),
        foe("SWORDSMAN", 4, 0),
      ]);
      return channels
        ? withStrandsV7(
            withHorrorV7(base, 0, at(8, 2), { activation: SPENT }),
            at(8, 2),
            [at(6, 4), at(7, 4)],
          )
        : base;
    };
    const start = build(true);
    const decision = first(start);
    expect(decision.priority).toBe(CULT_RIBBIT_PRIORITY_V7);
    expect(decision.command).toMatchObject({
      kind: "RIBBIT",
      targetUnitId: idAt(start, at(4, 3)),
    });
    const turn = policyTurn(start);
    expect(turn.state.cult.frogs).toEqual([idAt(start, at(4, 3))]);
    // Sanity (the mutation): with no daemon to hold, the Champion is the
    // strongest melee unit in reach, and a frog it is.
    const idle = build(false);
    expect(policyTurn(idle).state.cult.frogs).toEqual([idAt(idle, at(4, 0))]);
  });

  it("frogs the strongest melee unit in reach otherwise, and shoots instead when the shot kills", () => {
    const build = (hp: number): GameStateV7 =>
      scene([
        own("MARKSMAN", 6, 2),
        own("FIGHTER", 7, 2),
        foe("FIGHTER", 4, 2, { hp }),
        foe("SWORDSMAN", 4, 3),
        foe("MARKSMAN", 4, 1),
      ]);
    const start = build(10);
    expect(first(start).command).toMatchObject({
      kind: "RIBBIT",
      targetUnitId: idAt(start, at(4, 3)),
    });
    // Sanity (the mutation): the Fighter at 1 HP is shot.
    const kill = build(1);
    const turn = policyTurn(kill);
    expect(kindsOf(turn.commands)).not.toContain("RIBBIT");
    expect(alive(turn.state, idAt(kill, at(4, 2)))).toBe(false);
  });

  it("frogs an enemy at half its Hit Points beside a Summoner and a holder: the Seizure follows", () => {
    // A Knight at 6 of 12... not broken (above 5), a frog is at half.
    const build = (summoner: boolean): GameStateV7 =>
      scene([
        own("MARKSMAN", 7, 2),
        ...(summoner ? [own("CAPTAIN", 6, 3)] : [own("FIGHTER", 6, 3)]),
        own("FIGHTER", 6, 1),
        foe("SWORDSMAN", 5, 2, { hp: 7 }),
        foe("JUGGERNAUT", 5, 0),
      ]);
    const start = build(true);
    const victim = idAt(start, at(5, 2));
    expect(first(start).command).toMatchObject({
      kind: "RIBBIT",
      targetUnitId: victim,
    });
    const turn = policyTurn(start);
    expect(kindsOf(turn.commands.slice(0, 2))).toEqual(["RIBBIT", "SEIZE"]);
    expect(alive(turn.state, victim)).toBe(false);
    expect(favourOf(turn.state)).toBeGreaterThan(0);
    // Sanity (the mutation): without a Summoner no Seizure follows, and
    // nothing is Seized.
    const none = policyTurn(build(false));
    expect(kindsOf(none.commands)).not.toContain("SEIZE");
  });
});

describe("the Cult seat: Switcheroo (section 15.4)", () => {
  it("pulls a broken enemy next to a Summoner and a holder, and seizes it", () => {
    // The Summoner and the Initiate have moved: they cannot come to it.
    const start = scene([
      own("RAIDER", 7, 3),
      own("CAPTAIN", 8, 3, { activation: MOVED }),
      own("FIGHTER", 8, 4, { activation: MOVED }),
      foe("FIGHTER", 5, 3, { hp: 3 }),
    ]);
    const victim = idAt(start, at(5, 3));
    const decision = first(start);
    expect(decision.priority).toBe(CULT_SWITCHEROO_PRIORITY_V7);
    expect(decision.command).toMatchObject({
      kind: "SWITCHEROO",
      targetUnitId: victim,
    });
    const turn = policyTurn(start);
    expect(kindsOf(turn.commands.slice(0, 2))).toEqual(["SWITCHEROO", "SEIZE"]);
    expect(alive(turn.state, victim)).toBe(false);
  });

  it("drops an enemy ranged unit beside two own melee units, and no melee unit", () => {
    // (The Cult redesign's A-R1, `pulp_wars-mch9.38`: the strikers are no
    // casters, which make no blow that does not kill: two Idol Bearers
    // here, and two Initiates are no strikers.)
    const build = (
      role: UnitRoleIdV7,
      strikers: number,
      striker: UnitRoleIdV7 = "GUARD",
    ): GameStateV7 =>
      scene([
        own("RAIDER", 7, 3),
        ...[own(striker, 8, 3), own(striker, 8, 4)].slice(0, strikers),
        foe(role, 5, 3),
      ]);
    const start = build("MARKSMAN", 2);
    const target = idAt(start, at(5, 3));
    expect(first(start).command).toMatchObject({
      kind: "SWITCHEROO",
      targetUnitId: target,
    });
    // The Idol Bearers then fall on it where it lands.
    const turn = policyTurn(start);
    expect(turn.commands[0]?.kind).toBe("SWITCHEROO");
    expect(
      ofKind(turn.commands, "ATTACK").filter(
        (command) => command.targetUnitId === target,
      ).length,
    ).toBeGreaterThan(0);
    // Sanity (the mutations): a Fighter is not dropped, nothing is dropped
    // beside one Idol Bearer, and nothing beside two Initiates.
    expect(kindsOf(policyTurn(build("FIGHTER", 2)).commands)).not.toContain(
      "SWITCHEROO",
    );
    expect(kindsOf(policyTurn(build("MARKSMAN", 1)).commands)).not.toContain(
      "SWITCHEROO",
    );
    expect(
      kindsOf(policyTurn(build("MARKSMAN", 2, "FIGHTER")).commands),
    ).not.toContain("SWITCHEROO");
  });
});

describe("the Cult seat: the Tentacle (section 15.4)", () => {
  // The Summoner's since the Cult redesign (`pulp_wars-mch9.31`).
  it("calls it up beside the enemy, where it slaps the siege unit, with no own unit within 1", () => {
    const start = scene([
      own("CAPTAIN", 7, 3),
      // An Idol Bearer free to step back, so not doomed (a doomed unit beside
      // the Summoner keeps the Summoner's action for its Sacrifice).
      own("GUARD", 6, 3),
      foe("CATAPULT", 4, 3),
      foe("SWORDSMAN", 4, 4),
    ]);
    const decision = first(start);
    expect(decision.priority).toBe(CULT_TENTACLE_PRIORITY_V7);
    const called = decision.command;
    if (called?.kind !== "TENTACLE") throw new Error("no Tentacle");
    expect(gap(called.at, at(4, 3))).toBe(1);
    expect(gap(called.at, at(6, 3))).toBeGreaterThan(1);
    expect(
      previewTentacleV7(viewOf(start), called.unitId, called.at)
        ?.slapTargetUnitId,
    ).toBe(idAt(start, at(4, 3)));
  });

  it("calls none with no enemy in reach, nor where every tile beside the enemy is beside an own unit", () => {
    const far = scene([own("CAPTAIN", 9, 1)]);
    expect(kindsOf(policyTurn(far).commands)).not.toContain("TENTACLE");
    const close = scene([
      own("CAPTAIN", 7, 3, { activation: MOVED }),
      own("GUARD", 5, 3, { activation: SPENT }),
      foe("SWORDSMAN", 4, 3, { hp: 15 }),
    ]);
    for (const command of ofKind(policyTurn(close).commands, "TENTACLE"))
      expect(gap(command.at, at(5, 3))).toBeGreaterThan(1);
  });
});

describe("the Cult seat: Pamphlets (section 15.4)", () => {
  // No rule of its own: the engine offers an Initiate the Capture of a
  // neutral village in the turn it walks onto it, and the ordinary policy
  // takes it.
  it("walks an Initiate onto a village and captures it in the same turn", () => {
    const start = scene([own("FIGHTER", 6, 4)]);
    const initiate = idAt(start, at(6, 4));
    const turn = policyTurn(start);
    expect(nowAt(turn.state, initiate)).toEqual(at(5, 5));
    expect(
      turn.commands.flatMap((command) =>
        command.kind === "CAPTURE" ? [command.unitId] : [],
      ),
    ).toEqual([initiate]);
    expect(
      turn.state.cities.some(
        (city) =>
          gap(city.at, at(5, 5)) === 0 && city.ownerId === seatIdV7(start, 0),
      ),
    ).toBe(true);
  });

  it("sends the Initiate, not the Idol Bearer beside it, onto the village", () => {
    const start = scene([own("FIGHTER", 6, 4), own("GUARD", 4, 4)]);
    const turn = policyTurn(start);
    expect(nowAt(turn.state, idAt(start, at(6, 4)))).toEqual(at(5, 5));
    expect(ofKind(turn.commands, "CAPTURE")).toHaveLength(1);
  });
});

describe("the Cult seat: legal, deterministic turns on what A3 covers", () => {
  const A3: readonly CommandV7["kind"][] = [
    "BOO",
    "BEGIN_RITUAL",
    "PROCLAIM",
    "RIBBIT",
    "SWITCHEROO",
    "TENTACLE",
  ];

  const midGame = (): GameStateV7 =>
    withFavourV7(
      withHorrorV7(
        scene(
          [
            own("FIGHTER", 6, 6),
            own("FIGHTER", 6, 7),
            own("FIGHTER", 6, 8),
            own("GUARD", 8, 8),
            own("MARKSMAN", 7, 6),
            own("CAPTAIN", 7, 7),
            own("CATAPULT", 7, 8),
            own("MARKSMAN", 7, 9),
            own("RAIDER", 9, 6),
            own("JUGGERNAUT", 8, 7),
            foe("FIGHTER", 4, 6),
            foe("MARKSMAN", 3, 6),
            foe("KNIGHT", 3, 7),
          ],
          { coins: 30 },
        ),
        0,
        at(5, 6),
      ),
      0,
      30,
    );

  it("plays a whole mid-game turn with offered commands only", () => {
    const turn = policyTurn(midGame());
    expect(turn.commands.length).toBeGreaterThan(0);
  });

  it("offers each of its commands as a candidate only as a step of the plan", () => {
    const priorities = new Set([
      CULT_HERALD_PRIORITY_V7,
      CULT_BOO_PRIORITY_V7,
      CULT_SUMMONING_PRIORITY_V7,
      CULT_RIBBIT_PRIORITY_V7,
      CULT_SWITCHEROO_PRIORITY_V7,
      CULT_TENTACLE_PRIORITY_V7,
      CULT_STARFALL_PRIORITY_V7,
      CULT_PROCLAIM_LAST_PRIORITY_V7,
    ]);
    const view = viewOf(midGame());
    const offered = queryAiReadyCommandsV7(view).filter((item) =>
      A3.includes(item.command.kind),
    );
    const candidates = chooseNormalCommandV7(view).candidates.filter(
      (candidate) => A3.includes(candidate.command.kind),
    );
    // The engine offers many (a star for every tile in reach); the seat
    // considers one of each trick at most.
    expect(offered.length).toBeGreaterThan(candidates.length);
    for (const candidate of candidates)
      expect(
        priorities.has(candidate.score.priority),
        candidate.command.kind,
      ).toBe(true);
  });

  it("decides the same command for the same public view, and draws nothing", () => {
    const view = viewOf(midGame());
    const one = chooseNormalCommandV7(view);
    const two = chooseNormalCommandV7(
      JSON.parse(JSON.stringify(view)) as PlayerViewV7,
    );
    expect(two.command).toEqual(one.command);
    expect(two.candidates.map((item) => item.command)).toEqual(
      one.candidates.map((item) => item.command),
    );
    expect(one.prngDraws).toBe(0);
  });

  it("plays none of them on the older policy (the tests' switch)", () => {
    const previous = setArmyPlayFactionsV7(
      ARMY_PLAY_FACTIONS_V7.filter((faction) => faction !== "CULT"),
    );
    try {
      for (const command of policyTurn(midGame()).commands)
        expect(A3, command.kind).not.toContain(command.kind);
    } finally {
      setArmyPlayFactionsV7(previous);
    }
  });
});
