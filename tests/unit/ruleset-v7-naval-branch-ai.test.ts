import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  projectPublicUnitForPolicyV7,
  publicDangerForPolicyV7,
  publicThreatenedTilesForPolicyV7,
  scoreCommandV7,
} from "../../src/ai/v7";
import {
  NAVAL_BOARD_PRIORITY_V7,
  NAVAL_COUNTER_TRAINING_PRIORITY_V7,
  NAVAL_DUE_RESEARCH_PRIORITY_V7,
  NAVAL_FLEET_RESEARCH_PRIORITY_V7,
  NAVAL_HARBOURS_RESEARCH_PRIORITY_V7,
  NAVAL_RAM_APPROACH_PRIORITY_V7,
  NAVAL_RAM_UNBLOCK_VALUE_V7,
  NAVAL_SCREEN_PRIORITY_V7,
  NAVAL_SCREEN_VALUE_V7,
  NAVAL_STATION_PRIORITY_V7,
  NAVAL_TORPEDO_PRIORITIES_V7,
  navalAttackAfterMoveV7,
  navalBoardFactsV7,
  navalBranchResearchV7,
  navalCounterRoleV7,
  navalFleetFactsV7,
  navalRamApproachV7,
  navalShipsInViewV7,
  navalSubmarineMoveRejectedV7,
  navalTransportMoveRejectedV7,
  type NavalToolsV7,
} from "../../src/ai/v7-naval";
import {
  estimateCombatV7,
  previewBoardV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryThreatenedTilesV7,
  viewForV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type PlayerViewV7,
  type TechnologyIdV7,
  type UnitId,
} from "../../src/engine/index";
import {
  NAVAL_ARENA_PORTS_V7,
  acceptV7,
  navalArenaV7,
  navalUnitAtV7,
  navalUnitV7,
  patchNavalUnitV7,
  seatV7,
  type NavalArenaOptionsV7,
} from "../fixtures/v7-naval-branch";

// The naval branch for the seafaring seats (`pulp_wars-5ti.4`,
// docs/product/RULESET_7_NAVAL_BRANCH.md section 13.1): every rule on a
// small authored strait. Rows 0 to 2 and 8 to 10 are land, rows 3 and 7
// Shallow Water, rows 4 to 6 Deep Water; seat 0 (the seat that decides) has
// its capital on (5, 2) and a Port on (4, 3), seat 1 its capital on (5, 8)
// and a Port on (6, 7).

const SAILING: readonly TechnologyIdV7[] = ["SHORECRAFT", "NAVIGATION"];
const SHIPBUILDING: readonly TechnologyIdV7[] = [
  ...SAILING,
  "NAVAL_ENGINEERING",
];
const BOARDING: readonly TechnologyIdV7[] = [...SHIPBUILDING, "SEAMANSHIP"];
const ALL: readonly TechnologyIdV7[] = [...BOARDING, "SUBMERSIBLES"];

const EXACT_FIELDS = [
  "attack2",
  "defense2",
  "damageToDefender",
  "damageToAttacker",
  "defenderDies",
  "attackerDies",
  "retaliation",
  "noRetaliationReason",
  "push",
  "ram",
  "torpedo",
] as const satisfies readonly (keyof CombatPreviewV7)[];

function exact(preview: CombatPreviewV7 | null) {
  if (preview === null) return null;
  return Object.fromEntries(EXACT_FIELDS.map((key) => [key, preview[key]]));
}

function resolved(events: readonly DomainEventV7[]): CombatPreviewV7 {
  const event = events.find((entry) => entry.kind === "COMBAT_RESOLVED");
  if (event?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
  return event.preview;
}

function viewOf(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, seatV7(state, 0).id);
}

function arena(options: NavalArenaOptionsV7): {
  readonly state: GameStateV7;
  readonly view: PlayerViewV7;
} {
  const state = navalArenaV7(options);
  return { state, view: viewOf(state) };
}

function idAt(state: GameStateV7, at: CoordV7): UnitId {
  return navalUnitAtV7(state, at).id;
}

function publicUnit(view: PlayerViewV7, id: UnitId) {
  const unit = view.units.find((candidate) => candidate.id === id);
  if (unit === undefined) throw new Error("unit not visible");
  return unit;
}

/** The tools the policy lends the naval rules, rebuilt from its exports. */
function toolsOf(view: PlayerViewV7): NavalToolsV7 {
  const commands = queryPlayerCommandsV7(view);
  return {
    isHostile: (ownerId) => ownerId !== view.viewer.id,
    danger: (inView, unit, at) => publicDangerForPolicyV7(inView, unit, at),
    reaches: (hostile, at) =>
      publicThreatenedTilesForPolicyV7(view, hostile).some(
        (tile) => tile.x === at.x && tile.y === at.y,
      ),
    project: projectPublicUnitForPolicyV7,
    moveDestinations: (unitId) =>
      commands.flatMap((command) => {
        const end = command.kind === "MOVE" ? command.path.at(-1) : undefined;
        return command.kind === "MOVE" &&
          command.unitId === unitId &&
          end !== undefined
          ? [end]
          : [];
      }),
    commands,
  };
}

function factsOf(view: PlayerViewV7) {
  return navalFleetFactsV7(view, (ownerId) => ownerId !== view.viewer.id);
}

function candidates(view: PlayerViewV7): readonly CommandV7[] {
  return chooseNormalCommandV7(view).candidates.map((item) => item.command);
}

function endsOf(commands: readonly CommandV7[], unitId: UnitId): string[] {
  return commands.flatMap((command) => {
    const end = command.kind === "MOVE" ? command.path.at(-1) : undefined;
    return command.kind === "MOVE" &&
      command.unitId === unitId &&
      end !== undefined
      ? [`${String(end.x)},${String(end.y)}`]
      : [];
  });
}

/** The best candidate of one unit. */
function bestOf(view: PlayerViewV7, unitId: UnitId): CommandV7 {
  const best = chooseNormalCommandV7(view).candidates.find(
    (item) => "unitId" in item.command && item.command.unitId === unitId,
  );
  if (best === undefined) throw new Error("the unit has no candidate");
  return best.command;
}

const research = (tech: TechnologyIdV7): CommandV7 => ({
  kind: "RESEARCH",
  tech,
});

describe("naval research of a seafaring seat", () => {
  it("buys Seamanship at once against a ship in sight with a warship of its own afloat", () => {
    const { view } = arena({
      technologies: [SAILING, ALL],
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 3 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 8, y: 6 } },
      ],
    });
    expect(queryPlayerCommandsV7(view)).toContainEqual(research("SEAMANSHIP"));
    expect(scoreCommandV7(view, research("SEAMANSHIP")).priority).toBe(
      NAVAL_DUE_RESEARCH_PRIORITY_V7,
    );
    expect(candidates(view)).toContainEqual(research("SEAMANSHIP"));
  });

  it("researches Seamanship for a fleet of two with no enemy at sea, and not for one boat", () => {
    const two = arena({
      technologies: [SAILING, ALL],
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 3 } },
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 3 } },
      ],
    });
    expect(scoreCommandV7(two.view, research("SEAMANSHIP")).priority).toBe(
      NAVAL_FLEET_RESEARCH_PRIORITY_V7,
    );
    const one = arena({
      technologies: [SAILING, ALL],
      units: [{ seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 3 } }],
    });
    expect(
      navalBranchResearchV7(one.view, factsOf(one.view), () => true),
    ).toBeNull();
    expect(
      scoreCommandV7(one.view, research("SEAMANSHIP")).priority,
    ).toBeLessThan(NAVAL_FLEET_RESEARCH_PRIORITY_V7);
  });

  it("buys Submersibles against a Battleship in sight once it has Seamanship", () => {
    const { view } = arena({
      technologies: [BOARDING, ALL],
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 3 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 8, y: 6 } },
      ],
    });
    expect(scoreCommandV7(view, research("SUBMERSIBLES")).priority).toBe(
      NAVAL_DUE_RESEARCH_PRIORITY_V7,
    );
    // Against a Patrol Boat alone the Submarine is not asked for.
    const boat = arena({
      technologies: [BOARDING, ALL],
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 3 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 8, y: 6 } },
      ],
    });
    expect(
      navalBranchResearchV7(boat.view, factsOf(boat.view), () => true),
    ).toBeNull();
  });

  it("buys Submersibles for the Harbours of three docks", () => {
    const { view } = arena({ technologies: [BOARDING, ALL], units: [] });
    const port = view.naval.ownedPorts[0];
    if (port === undefined) throw new Error("no Port");
    const docks: PlayerViewV7 = {
      ...view,
      naval: {
        ...view.naval,
        ownedPorts: [
          port,
          { ...port, at: { x: 2, y: 3 } },
          { ...port, at: { x: 7, y: 3 } },
        ],
      },
    };
    expect(scoreCommandV7(docks, research("SUBMERSIBLES")).priority).toBe(
      NAVAL_HARBOURS_RESEARCH_PRIORITY_V7,
    );
    expect(
      scoreCommandV7(view, research("SUBMERSIBLES")).priority,
    ).toBeLessThan(NAVAL_HARBOURS_RESEARCH_PRIORITY_V7);
  });

  it("asks an Ice Folk seat for neither (its tree has other technologies there)", () => {
    const { view } = arena({
      factions: ["ICE_FOLK", "ORIGINAL"],
      technologies: [["SHORECRAFT"], ALL],
      units: [{ seat: 1, role: "BATTLESHIP", at: { x: 8, y: 6 } }],
    });
    expect(navalBranchResearchV7(view, factsOf(view), () => true)).toBeNull();
  });
});

describe("naval training against the ships in sight", () => {
  it("trains a Submarine against a visible Battleship, up to two for each", () => {
    const { view, state } = arena({
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 3 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 8, y: 5 } },
      ],
    });
    const city = state.cities.find(
      (entry) => entry.ownerId === seatV7(state, 0).id,
    );
    if (city === undefined) throw new Error("no city");
    const train: CommandV7 = {
      kind: "TRAIN_NAVAL",
      cityId: city.id,
      at: NAVAL_ARENA_PORTS_V7[0],
      role: "SUBMARINE",
    };
    expect(queryPlayerCommandsV7(view)).toContainEqual(train);
    expect(candidates(view)).toContainEqual(train);
    expect(scoreCommandV7(view, train).priority).toBe(
      NAVAL_COUNTER_TRAINING_PRIORITY_V7,
    );
    expect(navalCounterRoleV7(factsOf(view), () => true)).toBe("SUBMARINE");
    // Two Submarines for the one Battleship: no third.
    const enough = arena({
      units: [
        { seat: 0, role: "SUBMARINE", at: { x: 1, y: 3 } },
        { seat: 0, role: "SUBMARINE", at: { x: 2, y: 3 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 8, y: 5 } },
      ],
    });
    expect(navalCounterRoleV7(factsOf(enough.view), () => true)).toBeNull();
  });

  it("trains a Patrol Boat against a visible Submarine", () => {
    const { view } = arena({
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 3 } },
        { seat: 1, role: "SUBMARINE", at: { x: 8, y: 5 } },
      ],
    });
    expect(navalCounterRoleV7(factsOf(view), () => true)).toBe("PATROL_BOAT");
    const trained = candidates(view).find(
      (command) => command.kind === "TRAIN_NAVAL",
    );
    expect(trained).toMatchObject({ role: "PATROL_BOAT" });
    // Without the technology of the counter the fleet asks for nothing new.
    expect(
      navalCounterRoleV7(
        factsOf(
          arena({
            units: [{ seat: 1, role: "BATTLESHIP", at: { x: 8, y: 5 } }],
          }).view,
        ),
        (role) => role !== "SUBMARINE",
      ),
    ).toBeNull();
  });
});

describe("the Ram", () => {
  it("sidesteps before it attacks, and the planned ram is the engine's", () => {
    const { view, state } = arena({
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 4 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
      ],
    });
    const boat = idAt(state, { x: 2, y: 4 });
    const target = idAt(state, { x: 3, y: 5 });
    const plain = queryCombatPreviewV7(view, boat, target);
    expect(plain).toMatchObject({ ram: false, damageToDefender: 5 });
    // The plain attack is held; the boat's best command is a Move that ends
    // next to the target.
    expect(candidates(view)).not.toContainEqual({
      kind: "ATTACK",
      unitId: boat,
      targetUnitId: target,
    });
    const move = bestOf(view, boat);
    if (move.kind !== "MOVE") throw new Error("no approach Move");
    expect(scoreCommandV7(view, move).priority).toBe(
      NAVAL_RAM_APPROACH_PRIORITY_V7,
    );
    const to = move.path.at(-1);
    if (to === undefined) throw new Error("no destination");
    expect(Math.max(Math.abs(to.x - 3), Math.abs(to.y - 5))).toBe(1);
    const planned = navalAttackAfterMoveV7(
      view,
      toolsOf(view),
      publicUnit(view, boat),
      to,
      move.path.length,
      target,
    );
    expect(planned).toMatchObject({ ram: true, damageToDefender: 8 });
    // The engine: the Move, then the policy attacks with the Ram, and the
    // resolution is the planned preview.
    const moved = acceptV7(state, 0, move);
    const attack = bestOf(viewOf(moved.state), boat);
    expect(attack).toEqual({
      kind: "ATTACK",
      unitId: boat,
      targetUnitId: target,
    });
    const rammed = acceptV7(moved.state, 0, attack);
    expect(exact(planned)).toEqual(exact(resolved(rammed.events)));
  });

  it("does not plan a ram without Seamanship, or one that loses the exchange", () => {
    const without = arena({
      technologies: [SHIPBUILDING, ALL],
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 4 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
      ],
    });
    const boat = idAt(without.state, { x: 2, y: 4 });
    expect(candidates(without.view)).toContainEqual({
      kind: "ATTACK",
      unitId: boat,
      targetUnitId: idAt(without.state, { x: 3, y: 5 }),
    });
    // A Patrol Boat that rams a Battleship deals 6 and takes 10.
    const capital = arena({
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 3 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 3, y: 5 } },
      ],
    });
    expect(
      navalRamApproachV7(
        capital.view,
        toolsOf(capital.view),
        publicUnit(capital.view, idAt(capital.state, { x: 1, y: 3 })),
        { x: 2, y: 4 },
        1,
      ),
    ).toBeNull();
  });

  it("rams a blockader off its own dock from the side the shove is open", () => {
    const base = navalArenaV7({
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 3 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
      ],
    });
    const port = NAVAL_ARENA_PORTS_V7[0];
    const mine = idAt(base, { x: 1, y: 3 });
    const blockader = idAt(base, { x: 4, y: 5 });
    // Seat 1 sails onto seat 0's Port.
    const passed = acceptV7(base, 0, { kind: "END_TURN" });
    const sailed = acceptV7(passed.state, 1, {
      kind: "MOVE",
      unitId: blockader,
      path: [{ x: 4, y: 4 }, port],
    });
    const back = acceptV7(sailed.state, 1, { kind: "END_TURN" });
    const view = viewOf(back.state);
    expect(view.naval.ownedPorts[0]?.status).toBe("BLOCKADED");
    const move = bestOf(view, mine);
    if (move.kind !== "MOVE") throw new Error("no approach Move");
    // From the west (3, 3) the shove goes east along the coast; from the
    // sea side the tile behind the dock is land and nothing moves.
    expect(move.path.at(-1)).toEqual({ x: 3, y: 3 });
    const approach = navalRamApproachV7(
      view,
      toolsOf(view),
      publicUnit(view, mine),
      { x: 3, y: 3 },
      2,
    );
    expect(approach?.preview).toMatchObject({ ram: true, push: "WILL_PUSH" });
    const blocked = navalRamApproachV7(
      view,
      toolsOf(view),
      publicUnit(view, mine),
      { x: 3, y: 4 },
      2,
    );
    expect(blocked?.preview.push).toBe("BLOCKED");
    expect((approach?.value ?? 0) - (blocked?.value ?? 0)).toBe(
      10 * NAVAL_RAM_UNBLOCK_VALUE_V7,
    );
    const moved = acceptV7(back.state, 0, move);
    const attack = bestOf(viewOf(moved.state), mine);
    expect(attack).toMatchObject({ kind: "ATTACK", targetUnitId: blockader });
    const rammed = acceptV7(moved.state, 0, attack);
    expect(exact(approach?.preview ?? null)).toEqual(
      exact(resolved(rammed.events)),
    );
    expect(rammed.events).toContainEqual(
      expect.objectContaining({
        kind: "PORT_BLOCKADE_CHANGED",
        at: port,
        activeAfter: true,
      }),
    );
  });
});

describe("Board", () => {
  function boarding(extra: NavalArenaOptionsV7["units"] = []) {
    const base = navalArenaV7({
      units: [
        { seat: 0, role: "SUBMARINE", at: { x: 2, y: 4 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 3, y: 5 } },
        ...extra,
      ],
    });
    const prize = idAt(base, { x: 3, y: 5 });
    const state = patchNavalUnitV7(base, prize, { hp: 5 });
    return {
      state,
      view: viewOf(state),
      boarder: idAt(state, { x: 2, y: 4 }),
      prize,
    };
  }

  it("boards a Battleship at 5 HP rather than torpedo it", () => {
    const { state, view, boarder, prize } = boarding();
    const board: CommandV7 = {
      kind: "BOARD",
      unitId: boarder,
      targetUnitId: prize,
    };
    // The torpedo would sink it; the Board takes it.
    expect(queryCombatPreviewV7(view, boarder, prize)?.defenderDies).toBe(true);
    expect(bestOf(view, boarder)).toEqual(board);
    expect(scoreCommandV7(view, board).priority).toBe(NAVAL_BOARD_PRIORITY_V7);
    const facts = navalBoardFactsV7(view, toolsOf(view), board);
    expect(facts).toMatchObject({ safe: true, boards: true, hpAfter: 9 });
    // The projection is the engine's: the prize is the seat's at that HP.
    const boarded = acceptV7(state, 0, board);
    expect(navalUnitV7(boarded.state, prize)).toMatchObject({
      ownerId: seatV7(state, 0).id,
      hp: previewBoardV7(view, boarder, prize)?.hpAfter,
    });
  });

  it("sinks a prize it could not keep", () => {
    // A second Battleship three tiles from the prize would sink it at 9 HP.
    const { view, boarder, prize } = boarding([
      { seat: 1, role: "BATTLESHIP", at: { x: 6, y: 5 } },
    ]);
    const board: CommandV7 = {
      kind: "BOARD",
      unitId: boarder,
      targetUnitId: prize,
    };
    expect(queryPlayerCommandsV7(view)).toContainEqual(board);
    expect(navalBoardFactsV7(view, toolsOf(view), board)).toMatchObject({
      safe: false,
      boards: false,
      prizeTenths: 48,
      bestAttackTenths: 160,
    });
    expect(scoreCommandV7(view, board).priority).toBe(-1);
    expect(bestOf(view, boarder)).toEqual({
      kind: "ATTACK",
      unitId: boarder,
      targetUnitId: prize,
    });
  });
});

describe("Submarine play", () => {
  it("torpedoes the Battleship before the Patrol Boat", () => {
    const { view, state } = arena({
      units: [
        { seat: 0, role: "SUBMARINE", at: { x: 2, y: 4 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 3, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 1, y: 5 } },
      ],
    });
    const sub = idAt(state, { x: 2, y: 4 });
    const battleship = idAt(state, { x: 3, y: 5 });
    const boat = idAt(state, { x: 1, y: 5 });
    const onBattleship: CommandV7 = {
      kind: "ATTACK",
      unitId: sub,
      targetUnitId: battleship,
    };
    const onBoat: CommandV7 = {
      kind: "ATTACK",
      unitId: sub,
      targetUnitId: boat,
    };
    // The torpedo on the boat is a kill and the one on the Battleship is
    // not; the Battleship still goes first.
    expect(queryCombatPreviewV7(view, sub, boat)).toMatchObject({
      torpedo: true,
      defenderDies: true,
    });
    expect(scoreCommandV7(view, onBattleship).priority).toBe(
      NAVAL_TORPEDO_PRIORITIES_V7.BATTLESHIP,
    );
    expect(scoreCommandV7(view, onBoat).priority).toBe(
      NAVAL_TORPEDO_PRIORITIES_V7.PATROL_BOAT,
    );
    expect(bestOf(view, sub)).toEqual(onBattleship);
  });

  it("does not end a Move next to a Battleship it will not torpedo", () => {
    const { view, state } = arena({
      units: [
        { seat: 0, role: "SUBMARINE", at: { x: 2, y: 3 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 3, y: 6 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 5, y: 6 } },
      ],
    });
    const sub = idAt(state, { x: 2, y: 3 });
    // (4, 5) is next to both Battleships: offered, never a candidate. (3, 5)
    // is next to one, which the Submarine torpedoes: a candidate.
    expect(endsOf(queryPlayerCommandsV7(view), sub)).toContain("4,5");
    expect(endsOf(candidates(view), sub)).not.toContain("4,5");
    expect(endsOf(candidates(view), sub)).toContain("3,5");
    // With its attack spent, not next to one either.
    const spent = projectPublicUnitForPolicyV7(view, sub, {
      activation: {
        ...publicUnit(view, sub).activation,
        attacked: true,
        attacksUsed: 1,
      },
    });
    expect(
      navalSubmarineMoveRejectedV7(
        spent,
        toolsOf(spent),
        factsOf(spent),
        publicUnit(spent, sub),
        { x: 3, y: 5 },
      ),
    ).toBe(true);
  });

  it("stays out of the ram reach of two Patrol Boats unless it torpedoes", () => {
    const { view, state } = arena({
      units: [
        { seat: 0, role: "SUBMARINE", at: { x: 0, y: 3 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 5, y: 4 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 5, y: 6 } },
      ],
    });
    const sub = publicUnit(view, idAt(state, { x: 0, y: 3 }));
    const rejected = (to: CoordV7) =>
      navalSubmarineMoveRejectedV7(view, toolsOf(view), factsOf(view), sub, to);
    // (2, 5) is within reach of both boats and next to neither.
    expect(rejected({ x: 2, y: 5 })).toBe(true);
    // (0, 4) is out of their reach.
    expect(rejected({ x: 0, y: 4 })).toBe(false);
    // (4, 5) is next to both: the Submarine torpedoes one of them there.
    expect(rejected({ x: 4, y: 5 })).toBe(false);
  });
});

describe("the Battleship", () => {
  it("is screened from a Submarine by a free Patrol Boat", () => {
    const { view, state } = arena({
      units: [
        { seat: 0, role: "BATTLESHIP", at: { x: 5, y: 4 } },
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 3 } },
        { seat: 1, role: "SUBMARINE", at: { x: 5, y: 7 } },
      ],
    });
    const boat = idAt(state, { x: 2, y: 3 });
    const move = bestOf(view, boat);
    if (move.kind !== "MOVE") throw new Error("no screening Move");
    // Next to the Battleship, on the Submarine's side.
    expect(move.path.at(-1)).toEqual({ x: 4, y: 5 });
    const score = scoreCommandV7(view, move);
    expect(score.priority).toBe(NAVAL_SCREEN_PRIORITY_V7);
    expect(score.strategicValue).toBeGreaterThanOrEqual(NAVAL_SCREEN_VALUE_V7);
  });

  it("fires where its splash catches a second ship", () => {
    const { view, state } = arena({
      units: [
        { seat: 0, role: "BATTLESHIP", at: { x: 5, y: 4 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 6 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 7, y: 6 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 8, y: 7 } },
      ],
    });
    const ship = idAt(state, { x: 5, y: 4 });
    const attack = bestOf(view, ship);
    if (attack.kind !== "ATTACK") throw new Error("no shot");
    const preview = queryCombatPreviewV7(view, ship, attack.targetUnitId);
    expect(preview?.splash).toHaveLength(1);
    expect(attack.targetUnitId).not.toBe(idAt(state, { x: 3, y: 6 }));
  });

  it("sails to a firing station out of a Submarine's reach", () => {
    const { view, state } = arena({
      units: [
        { seat: 0, role: "BATTLESHIP", at: { x: 1, y: 3 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 6, y: 6 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 7, y: 6 } },
      ],
    });
    const ship = idAt(state, { x: 1, y: 3 });
    const move = bestOf(view, ship);
    if (move.kind !== "MOVE") throw new Error("no station Move");
    expect(scoreCommandV7(view, move).priority).toBe(NAVAL_STATION_PRIORITY_V7);
    const to = move.path.at(-1);
    if (to === undefined) throw new Error("no destination");
    // Where it stands nothing is in range; from the station two hostile
    // units are two or three tiles away (a boat, and the Fighter ashore).
    const inRange = (from: CoordV7): number =>
      view.units.filter((unit) => {
        const range = Math.max(
          Math.abs(from.x - unit.at.x),
          Math.abs(from.y - unit.at.y),
        );
        return unit.ownerId !== view.viewer.id && range >= 2 && range <= 3;
      }).length;
    expect(inRange({ x: 1, y: 3 })).toBe(0);
    expect(inRange(to)).toBe(2);
    // A Submarine that reaches the station takes it off the list.
    const hunted = arena({
      units: [
        { seat: 0, role: "BATTLESHIP", at: { x: 1, y: 3 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 6, y: 6 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 7, y: 6 } },
        { seat: 1, role: "SUBMARINE", at: { x: 4, y: 6 } },
      ],
    });
    const best = bestOf(hunted.view, idAt(hunted.state, { x: 1, y: 3 }));
    expect(scoreCommandV7(hunted.view, best).priority).not.toBe(
      NAVAL_STATION_PRIORITY_V7,
    );
  });
});

describe("transports", () => {
  function transport(extra: NavalArenaOptionsV7["units"] = []) {
    const base = navalArenaV7({
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 1, y: 2 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 5, y: 6 } },
        ...extra,
      ],
    });
    const cargo = idAt(base, { x: 1, y: 2 });
    const state = patchNavalUnitV7(base, cargo, {
      at: { x: 1, y: 3 },
      form: "EMBARKED",
    });
    return { state, view: viewOf(state), cargo };
  }

  it("do not sail into a Battleship's reach unescorted", () => {
    const { view, cargo } = transport();
    // The Battleship on (5, 6) reaches three tiles: every tile from x = 2.
    expect(endsOf(queryPlayerCommandsV7(view), cargo)).toContain("2,4");
    const ends = endsOf(candidates(view), cargo);
    expect(ends.length).toBeGreaterThan(0);
    for (const end of ends) expect(Number(end.split(",")[0])).toBeLessThan(2);
  });

  it("sail there beside a warship of their own", () => {
    const { view, state, cargo } = transport([
      { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 4 } },
    ]);
    expect(
      navalTransportMoveRejectedV7(
        view,
        toolsOf(view),
        factsOf(view),
        publicUnit(view, cargo),
        { x: 2, y: 4 },
      ),
    ).toBe(false);
    expect(
      navalTransportMoveRejectedV7(
        view,
        toolsOf(view),
        factsOf(view),
        publicUnit(view, cargo),
        { x: 2, y: 3 },
      ),
    ).toBe(false);
    expect(idAt(state, { x: 3, y: 4 })).toBeGreaterThan(0);
  });

  it("stay out of a Submarine's reach too, and may always leave it", () => {
    const base = navalArenaV7({
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 1, y: 2 } },
        { seat: 1, role: "SUBMARINE", at: { x: 5, y: 5 } },
      ],
    });
    const cargo = idAt(base, { x: 1, y: 2 });
    const state = patchNavalUnitV7(base, cargo, {
      at: { x: 1, y: 3 },
      form: "EMBARKED",
    });
    const view = viewOf(state);
    const rejected = (inView: PlayerViewV7, to: CoordV7) =>
      navalTransportMoveRejectedV7(
        inView,
        toolsOf(inView),
        factsOf(inView),
        publicUnit(inView, cargo),
        to,
      );
    // The Submarine moves two tiles and torpedoes the next one.
    expect(rejected(view, { x: 2, y: 4 })).toBe(true);
    expect(rejected(view, { x: 0, y: 3 })).toBe(false);
    const inside = projectPublicUnitForPolicyV7(view, cargo, {
      at: { x: 3, y: 4 },
    });
    expect(rejected(inside, { x: 2, y: 4 })).toBe(false);
  });
});

describe("the threat estimate at sea", () => {
  it("gives a hostile Submarine water tiles only, as the engine does", () => {
    const { view, state } = arena({
      units: [{ seat: 1, role: "SUBMARINE", at: { x: 4, y: 4 } }],
    });
    const sub = publicUnit(view, idAt(state, { x: 4, y: 4 }));
    const key = (at: CoordV7) => `${String(at.x)},${String(at.y)}`;
    const policy = publicThreatenedTilesForPolicyV7(view, sub).map(key).sort();
    expect(policy.length).toBeGreaterThan(0);
    for (const at of publicThreatenedTilesForPolicyV7(view, sub))
      expect(at.y >= 3 && at.y <= 7).toBe(true);
    expect(policy).toEqual(
      queryThreatenedTilesV7(view, sub.id).map(key).sort(),
    );
  });

  it("counts a torpedo on a transport at the engine's damage and none on a unit ashore", () => {
    const base = navalArenaV7({
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 1, y: 2 } },
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 2 } },
        { seat: 1, role: "SUBMARINE", at: { x: 2, y: 4 } },
      ],
    });
    const cargo = idAt(base, { x: 1, y: 2 });
    const state = patchNavalUnitV7(base, cargo, {
      at: { x: 1, y: 3 },
      form: "EMBARKED",
    });
    const view = viewOf(state);
    const torpedo = estimateCombatV7(state, idAt(state, { x: 2, y: 4 }), cargo);
    // 14 against a transport: the Fighter's 12 HP.
    expect(torpedo).toMatchObject({
      torpedo: true,
      damageToDefender: 12,
      defenderDies: true,
    });
    const afloat = publicUnit(view, cargo);
    expect(publicDangerForPolicyV7(view, afloat, afloat.at)).toBe(
      torpedo?.damageToDefender,
    );
    // The Fighter on the shore next to the Submarine's reach is not a target.
    const ashore = publicUnit(view, idAt(state, { x: 3, y: 2 }));
    expect(publicDangerForPolicyV7(view, ashore, ashore.at)).toBe(0);
  });

  it("threatens an own Submarine only from the next tile", () => {
    const far = arena({
      units: [
        { seat: 0, role: "SUBMARINE", at: { x: 2, y: 4 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 4 } },
      ],
    });
    const sub = publicUnit(far.view, idAt(far.state, { x: 2, y: 4 }));
    // Two tiles away: a Battleship fires three tiles, but not at it.
    expect(
      estimateCombatV7(far.state, idAt(far.state, { x: 4, y: 4 }), sub.id),
    ).toBeNull();
    expect(publicDangerForPolicyV7(far.view, sub, sub.at)).toBe(0);
    // A Patrol Boat on the same tiles would be shot.
    const boat = arena({
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 4 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 4 } },
      ],
    });
    const shot = publicUnit(boat.view, idAt(boat.state, { x: 2, y: 4 }));
    expect(publicDangerForPolicyV7(boat.view, shot, shot.at)).toBe(shot.hp);
    // Next to it, the engine's damage.
    const near = arena({
      units: [
        { seat: 0, role: "SUBMARINE", at: { x: 2, y: 4 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 3, y: 4 } },
      ],
    });
    const close = publicUnit(near.view, idAt(near.state, { x: 2, y: 4 }));
    const hit = estimateCombatV7(
      near.state,
      idAt(near.state, { x: 3, y: 4 }),
      close.id,
    );
    expect(hit).not.toBeNull();
    expect(publicDangerForPolicyV7(near.view, close, close.at)).toBe(
      Math.min(close.hp, hit?.damageToDefender ?? 0),
    );
  });

  it("assumes a hostile Patrol Boat rams", () => {
    const apart = arena({
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 4 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 5, y: 4 } },
      ],
    });
    const mine = publicUnit(apart.view, idAt(apart.state, { x: 2, y: 4 }));
    // The engine's ram of that boat after a Move, from the next tile.
    const beside = navalArenaV7({
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 4 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 4 } },
      ],
    });
    const ram = estimateCombatV7(
      beside,
      idAt(beside, { x: 3, y: 4 }),
      idAt(beside, { x: 2, y: 4 }),
      1,
    );
    expect(ram).toMatchObject({ ram: true, damageToDefender: 8 });
    expect(publicDangerForPolicyV7(apart.view, mine, mine.at)).toBe(
      ram?.damageToDefender,
    );
  });
});

describe("docks", () => {
  it("are built for their population: a second Port and the Shipyard", () => {
    const { view } = arena({ units: [] });
    const decision = chooseNormalCommandV7(view);
    const built = (kind: "BUILD_PORT" | "BUILD_SHIPYARD") =>
      decision.candidates.find((item) => item.command.kind === kind);
    expect(built("BUILD_PORT")?.score.priority).toBeGreaterThanOrEqual(1140);
    expect(built("BUILD_SHIPYARD")?.score.priority).toBeGreaterThanOrEqual(
      1140,
    );
  });
});

describe("a view without a ship", () => {
  it("is left alone by every naval rule", () => {
    const { view } = arena({ units: [] });
    expect(navalShipsInViewV7(factsOf(view))).toBe(false);
    expect(navalCounterRoleV7(factsOf(view), () => true)).toBeNull();
  });
});
